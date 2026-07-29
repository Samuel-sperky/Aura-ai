// GET /api/audit — the server-side audit trail (right `audit.read`, admin only).
//
// Filters: action, entity, userId, from, to (inclusive), q (free text).
// Response is the canonical list envelope: `{ items, pagination }`.
//
// `severity`, `detail`, `meta` and `userAgent` live inside the `new_values` JSON
// under the reserved `__audit` key (see lib/auth/audit.ts — no extra columns).
// This route unwraps that envelope so the UI sees flat fields.
//
// `old_values` / `new_values` are NOT returned by the list endpoint: they can be
// large and may contain field-level data the list view has no use for. The list
// answers "who did what, when"; add a detail endpoint if a diff view is needed.

import { defineRoute } from "@/lib/api/defineRoute";
import { jsonList } from "@/lib/api/respond";
import { query } from "@/lib/db";
import { AUDIT_META_KEY, type AuditSeverity } from "@/lib/auth/audit";
import { auditListQuerySchema } from "@/lib/domain/contracts/auth";
import {
  escapeLike,
  LIKE_ESCAPE_CLAUSE,
  pageMeta,
  toPagination,
} from "@/lib/domain/data";
import { RATE_LIMITS } from "@/lib/security/rateLimit";

/**
 * Columns the free-text search runs over (fixed list; only the term is bound).
 * `username` holds the actor's e-mail — see lib/auth/audit.ts for why the column
 * keeps the family name.
 */
const SEARCH_COLS = ["username", "action", "entity", "entity_id"] as const;

const SEVERITIES = new Set<string>([
  "info",
  "success",
  "warning",
  "critical",
]);

interface AuditLogRow {
  id: number | string;
  user_id: string | null;
  /** `audit_log.username` — holds the actor's e-mail. */
  username: string | null;
  action: string;
  entity: string | null;
  entity_id: string | null;
  ip: string | null;
  ts: Date | string | null;
  new_values: unknown;
}

export interface AuditEntryDto {
  /** BIGINT id, stringified so the wire shape stays stable. */
  id: string;
  userId: string | null;
  userEmail: string | null;
  action: string;
  entity: string | null;
  entityId: string | null;
  ip: string | null;
  ts: string | null;
  severity: AuditSeverity | null;
  detail: string | null;
  meta: unknown;
  userAgent: string | null;
}

/** mariadb hands a JSON column back either parsed or as a string. */
function parseJson(v: unknown): unknown {
  if (v == null) return null;
  if (typeof v === "string") {
    try {
      return JSON.parse(v);
    } catch {
      return null;
    }
  }
  return v;
}

function unwrapEnvelope(newValues: unknown): {
  severity: AuditSeverity | null;
  detail: string | null;
  meta: unknown;
  userAgent: string | null;
} {
  const parsed = parseJson(newValues);
  const raw =
    parsed != null && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)[AUDIT_META_KEY]
      : null;
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return { severity: null, detail: null, meta: null, userAgent: null };
  }
  const e = raw as Record<string, unknown>;
  return {
    severity:
      typeof e.severity === "string" && SEVERITIES.has(e.severity)
        ? (e.severity as AuditSeverity)
        : null,
    detail: typeof e.detail === "string" ? e.detail : null,
    meta: e.meta ?? null,
    userAgent: typeof e.userAgent === "string" ? e.userAgent : null,
  };
}

function toIso(v: Date | string | null): string | null {
  if (v == null) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function mapRow(row: AuditLogRow): AuditEntryDto {
  const envelope = unwrapEnvelope(row.new_values);
  return {
    id: String(row.id),
    userId: row.user_id,
    userEmail: row.username,
    action: row.action,
    entity: row.entity,
    entityId: row.entity_id,
    ip: row.ip,
    ts: toIso(row.ts),
    ...envelope,
  };
}

export const GET = defineRoute(
  {
    auth: { right: "audit.read" },
    rateLimit: RATE_LIMITS.read,
    querySchema: auditListQuerySchema,
  },
  async ({ query: q }) => {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (q.action) {
      conditions.push("action = ?");
      params.push(q.action);
    }
    if (q.entity) {
      conditions.push("entity = ?");
      params.push(q.entity);
    }
    if (q.userId) {
      conditions.push("user_id = ?");
      params.push(q.userId);
    }
    if (q.from) {
      conditions.push("ts >= ?");
      params.push(q.from);
    }
    if (q.to) {
      // Inclusive upper bound: a date-only `to` would otherwise compare against
      // 00:00:00 and drop the whole last day.
      conditions.push("ts < DATE_ADD(?, INTERVAL 1 DAY)");
      params.push(q.to);
    }
    if (q.q) {
      conditions.push(
        `(${SEARCH_COLS.map((c) => `${c} LIKE ? ${LIKE_ESCAPE_CLAUSE}`).join(" OR ")})`,
      );
      const like = `%${escapeLike(q.q)}%`;
      for (let i = 0; i < SEARCH_COLS.length; i += 1) params.push(like);
    }

    const where = conditions.length ? ` WHERE ${conditions.join(" AND ")}` : "";

    const totalRows = await query<{ n: number }>(
      `SELECT COUNT(*) AS n FROM audit_log${where}`,
      params,
    );
    const total = Number(totalRows[0]?.n ?? 0);

    const pg = toPagination(q.page, q.pageSize);
    const rows = await query<AuditLogRow>(
      `SELECT id, user_id, username, action, entity, entity_id, ip, ts, new_values
         FROM audit_log${where}
        ORDER BY ts DESC, id DESC
        LIMIT ? OFFSET ?`,
      [...params, pg.limit, pg.offset],
    );

    return jsonList(rows.map(mapRow), pageMeta(pg, total));
  },
);
