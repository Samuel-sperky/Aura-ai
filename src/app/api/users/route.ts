// GET /api/users — the assignable-people directory.
//
// WHY THIS EXISTS SEPARATELY FROM /api/admin/users: spec Q29 makes `assignee` a
// FOREIGN KEY into `app_users` rather than free text, so every editor needs to be
// able to populate an assignee picker. `/api/admin/users` is gated on
// `users.manage` (administrators only) and returns the full account shape —
// rights, denied pages, last login. Reusing it would mean granting account
// administration to anyone who can assign a task.
//
// So this endpoint returns the MINIMUM a picker needs — id, display name,
// initials — and nothing else. No e-mail, no role, no rights, no timestamps:
// a directory, not an account listing. Inactive accounts are excluded by default
// so a picker cannot hand work to somebody who can no longer sign in.
//
// Gated on `work_items.read`, which every role holds: a viewer must be able to
// READ "assigned to Jana" and filter by it, they simply cannot write.

import { defineRoute } from "@/lib/api/defineRoute";
import { jsonList } from "@/lib/api/respond";
import { query } from "@/lib/db";
import {
  LIKE_ESCAPE_CLAUSE,
  escapeLike,
  pageMeta,
  toPagination,
} from "@/lib/domain/data";
import { RATE_LIMITS } from "@/lib/security/rateLimit";
import { z } from "zod";

/** One row of the picker. Deliberately the smallest useful projection. */
export interface DirectoryUserDto {
  id: string;
  displayName: string;
  initials: string;
}

interface DirectoryRow {
  id: string;
  name: string | null;
  initials: string | null;
}

const directoryQuerySchema = z.object({
  /** `"1"` also returns deactivated accounts (for showing historic assignees). */
  includeInactive: z.enum(["1", "0"]).optional(),
  q: z.string().trim().max(128, "Hľadaný výraz je príliš dlhý.").optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(200),
});

/** Fallback initials so a picker row is never blank. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const GET = defineRoute(
  {
    auth: { right: "work_items.read" },
    rateLimit: RATE_LIMITS.read,
    querySchema: directoryQuerySchema,
  },
  async ({ query: q }) => {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (q.includeInactive !== "1") {
      conditions.push("active = 1");
    }
    if (q.q) {
      // Only the display name is searchable — the e-mail is not exposed here, so
      // it must not be searchable either (that would leak it by probing).
      conditions.push(`name LIKE ? ${LIKE_ESCAPE_CLAUSE}`);
      params.push(`%${escapeLike(q.q)}%`);
    }
    const where = conditions.length ? ` WHERE ${conditions.join(" AND ")}` : "";

    const totalRows = await query<{ n: number }>(
      `SELECT COUNT(*) AS n FROM app_users${where}`,
      params,
    );
    const total = Number(totalRows[0]?.n ?? 0);

    const pg = toPagination(q.page, q.pageSize);
    const rows = await query<DirectoryRow>(
      `SELECT id, name, initials
         FROM app_users${where}
        ORDER BY name ASC, id ASC
        LIMIT ? OFFSET ?`,
      [...params, pg.limit, pg.offset],
    );

    const items: DirectoryUserDto[] = rows.map((row) => {
      const displayName = row.name?.trim() || "—";
      return {
        id: row.id,
        displayName,
        initials: row.initials?.trim() || initialsOf(displayName),
      };
    });

    return jsonList(items, pageMeta(pg, total));
  },
);
