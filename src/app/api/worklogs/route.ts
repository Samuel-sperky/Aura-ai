// GET    /api/worklogs — list worklogs (right `worklogs.read`)
// POST   /api/worklogs — log time on an item (right `worklogs.write`)
// DELETE /api/worklogs?id=… — remove one (author or admin, `worklogs.write`)
//
// Time tracking is OPTIONAL here: nothing in the work-item or sprint flow needs a
// worklog, and finishing an item never asks for one (the source app's mandatory
// worklog rule is dropped). It is entered inline in the item detail with quick
// +15/+30/+60 buttons.
//
// `user_id` is the SIGNED-IN user. Only an admin may log on somebody else's
// behalf, and only by passing `userId` explicitly — otherwise anyone could
// attribute their hours to a colleague.

import { defineRoute, badRequest, notFound } from "@/lib/api/defineRoute";
import { jsonList, jsonOk, jsonError } from "@/lib/api/respond";
import { query, execute } from "@/lib/db";
import { auditAs } from "@/lib/auth/audit";
import { isAdmin } from "@/lib/auth/rbac";
import { RATE_LIMITS } from "@/lib/security/rateLimit";
import { pageMeta, toPagination } from "@/lib/domain/data";
import {
  worklogCreateSchema,
  worklogDeleteQuerySchema,
  worklogListQuerySchema,
} from "@/lib/domain/contracts/workItems";
import {
  WORKLOG_SELECT,
  insertWorklog,
  loadWorklogBase,
  loadWorklogDto,
  recomputeLoggedMinutes,
  todayIso,
  toWorklogDto,
  type WorklogRow,
} from "@/lib/domain/worklogs";

export const GET = defineRoute(
  {
    auth: { right: "worklogs.read" },
    rateLimit: RATE_LIMITS.read,
    querySchema: worklogListQuerySchema,
  },
  async ({ user, query: q }) => {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (q.workItemId) {
      conditions.push("wl.work_item_id = ?");
      params.push(q.workItemId);
    }
    if (q.projectId) {
      conditions.push("wl.project_id = ?");
      params.push(q.projectId);
    }
    if (q.mine === "1") {
      conditions.push("wl.user_id = ?");
      params.push(user.id);
    } else if (q.userId) {
      conditions.push("wl.user_id = ?");
      params.push(q.userId);
    }
    if (q.from) {
      conditions.push("wl.work_date >= ?");
      params.push(q.from);
    }
    if (q.to) {
      conditions.push("wl.work_date <= ?");
      params.push(q.to);
    }

    const where = conditions.length ? ` WHERE ${conditions.join(" AND ")}` : "";

    const totals = await query<{ n: number; minutes: number }>(
      `SELECT COUNT(*) AS n, COALESCE(SUM(wl.minutes), 0) AS minutes
         FROM worklogs wl${where}`,
      params,
    );
    const total = Number(totals[0]?.n ?? 0);
    const totalMinutes = Number(totals[0]?.minutes ?? 0);

    const pg = toPagination(q.page, q.pageSize);
    const rows = await query<WorklogRow>(
      `${WORKLOG_SELECT}${where}
        ORDER BY wl.work_date DESC, wl.created_at DESC
        LIMIT ? OFFSET ?`,
      [...params, pg.limit, pg.offset],
    );

    // The filtered minute total rides along in a header so the canonical list
    // envelope { items, pagination } stays exactly one shape for every endpoint.
    return jsonList(rows.map(toWorklogDto), pageMeta(pg, total), {
      headers: { "X-Total-Minutes": String(totalMinutes) },
    });
  },
);

export const POST = defineRoute(
  {
    auth: { right: "worklogs.write" },
    rateLimit: RATE_LIMITS.write,
    bodySchema: worklogCreateSchema,
  },
  async ({ user, body }) => {
    const items = await query<{ id: string; project_id: string }>(
      "SELECT id, project_id FROM work_items WHERE id = ?",
      [body.workItemId],
    );
    const item = items[0];
    if (!item) return notFound("Položka neexistuje.");

    // Logging for somebody else is an admin-only act.
    let userId = user.id;
    if (body.userId && body.userId !== user.id) {
      if (!isAdmin(user)) {
        return jsonError("Zapisovať čas za iného používateľa môže len admin.", 403);
      }
      const target = await query<{ id: string }>(
        "SELECT id FROM app_users WHERE id = ?",
        [body.userId],
      );
      if (!target[0]) return badRequest("Používateľ neexistuje.");
      userId = body.userId;
    }

    const workDate = body.workDate ?? todayIso();

    const id = await insertWorklog({
      workItemId: body.workItemId,
      userId,
      projectId: item.project_id,
      workDate,
      minutes: body.minutes,
      description: body.description ?? "",
    });

    const loggedMinutes = await recomputeLoggedMinutes(body.workItemId);

    await auditAs(user, {
      action: "worklog.create",
      entity: "worklogs",
      entityId: id,
      severity: "success",
      newValues: {
        workItemId: body.workItemId,
        userId,
        workDate,
        minutes: body.minutes,
      },
    });

    return jsonOk(
      { worklog: await loadWorklogDto(id), loggedMinutes },
      { status: 201 },
    );
  },
);

export const DELETE = defineRoute(
  {
    auth: { right: "worklogs.write" },
    rateLimit: RATE_LIMITS.write,
    querySchema: worklogDeleteQuerySchema,
  },
  async ({ user, query: q }) => {
    const worklog = await loadWorklogBase(q.id);
    if (!worklog) return notFound("Záznam času neexistuje.");

    if (worklog.user_id !== user.id && !isAdmin(user)) {
      return jsonError("Zmazať záznam času môže len jeho autor.", 403);
    }

    await execute("DELETE FROM worklogs WHERE id = ?", [q.id]);
    const loggedMinutes = await recomputeLoggedMinutes(worklog.work_item_id);

    await auditAs(user, {
      action: "worklog.delete",
      entity: "worklogs",
      entityId: q.id,
      severity: "warning",
      oldValues: {
        workItemId: worklog.work_item_id,
        userId: worklog.user_id,
        minutes: worklog.minutes,
      },
    });

    return jsonOk({ ok: true, id: q.id, loggedMinutes });
  },
);
