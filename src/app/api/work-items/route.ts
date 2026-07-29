// GET  /api/work-items — list items (right `work_items.read`)
// POST /api/work-items — create an item (right `work_items.write`)
//
// The default order is the BACKLOG order: manual `rank_value` ascending, then
// `priority` (spec Q27). There are no weighted priority scores in this app.
//
// Creating a subtask is the same call with `parentId` set. The two-level limit is
// enforced here (via `validateParentPlacement`) and NOT by the schema, because it
// needs the stored parent to decide.

import { randomUUID } from "node:crypto";
import { defineRoute, badRequest } from "@/lib/api/defineRoute";
import { jsonList, jsonOk } from "@/lib/api/respond";
import { query, execute } from "@/lib/db";
import { auditAs } from "@/lib/auth/audit";
import { recomputeProjectProgress } from "@/lib/domain/projects";
import { RATE_LIMITS } from "@/lib/security/rateLimit";
import { pageMeta, toPagination } from "@/lib/domain/data";
import {
  workItemCreateSchema,
  workItemListQuerySchema,
} from "@/lib/domain/contracts/workItems";
import {
  WORK_ITEM_SELECT,
  loadWorkItemDto,
  nextRankValue,
  relationError,
  statusPair,
  toWorkItemDto,
  validateParentPlacement,
  workItemOrderBy,
  workItemSearchClause,
  type WorkItemRow,
} from "@/lib/domain/workItems";

export const GET = defineRoute(
  {
    auth: { right: "work_items.read" },
    rateLimit: RATE_LIMITS.read,
    querySchema: workItemListQuerySchema,
  },
  async ({ query: q }) => {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (q.projectId) {
      conditions.push("w.project_id = ?");
      params.push(q.projectId);
    }
    if (q.sprintId) {
      conditions.push("w.sprint_id = ?");
      params.push(q.sprintId);
    }
    if (q.checkpointId) {
      conditions.push("w.checkpoint_id = ?");
      params.push(q.checkpointId);
    }
    if (q.parentId === "none") {
      conditions.push("w.parent_id IS NULL");
    } else if (q.parentId) {
      conditions.push("w.parent_id = ?");
      params.push(q.parentId);
    }
    if (q.status) {
      conditions.push("w.status = ?");
      params.push(q.status);
    }
    if (q.statusCategory) {
      conditions.push("w.status_category = ?");
      params.push(q.statusCategory);
    }
    if (q.itemType) {
      conditions.push("w.item_type = ?");
      params.push(q.itemType);
    }
    if (q.priority) {
      conditions.push("w.priority = ?");
      params.push(q.priority);
    }
    if (q.assigneeId === "none") {
      conditions.push("w.assignee_id IS NULL");
    } else if (q.assigneeId) {
      conditions.push("w.assignee_id = ?");
      params.push(q.assigneeId);
    }
    if (q.backlog === "1") conditions.push("w.sprint_id IS NULL");
    if (q.openOnly === "1") conditions.push("w.status_category <> 'done'");
    if (q.dueBefore) {
      conditions.push("w.due_date IS NOT NULL AND w.due_date <= ?");
      params.push(q.dueBefore);
    }
    if (q.q) {
      const search = workItemSearchClause(q.q);
      conditions.push(search.clause);
      params.push(...search.params);
    }

    const where = conditions.length ? ` WHERE ${conditions.join(" AND ")}` : "";

    const totals = await query<{ n: number }>(
      `SELECT COUNT(*) AS n FROM work_items w${where}`,
      params,
    );
    const total = Number(totals[0]?.n ?? 0);

    const pg = toPagination(q.page, q.pageSize);
    const rows = await query<WorkItemRow>(
      `${WORK_ITEM_SELECT}${where}
        ORDER BY ${workItemOrderBy(q.sort, q.dir)}
        LIMIT ? OFFSET ?`,
      [...params, pg.limit, pg.offset],
    );

    return jsonList(rows.map(toWorkItemDto), pageMeta(pg, total));
  },
);

export const POST = defineRoute(
  {
    auth: { right: "work_items.write" },
    rateLimit: RATE_LIMITS.write,
    bodySchema: workItemCreateSchema,
  },
  async ({ user, body }) => {
    const sprintId = body.sprintId ?? null;
    const checkpointId = body.checkpointId ?? null;
    const parentId = body.parentId ?? null;
    const assigneeId = body.assigneeId ?? null;
    // The creator is the default reporter — it is who to ask about the item.
    const reporterId = body.reporterId ?? user.id;

    const relations = await relationError({
      projectId: body.projectId,
      sprintId,
      checkpointId,
      assigneeId,
      reporterId,
    });
    if (relations) return badRequest(relations);

    if (parentId) {
      const placement = await validateParentPlacement({
        parentId,
        childProjectId: body.projectId,
      });
      if (placement) return badRequest(placement);
    }

    const id = randomUUID();
    const rankValue = body.rankValue ?? (await nextRankValue(body.projectId));
    const { status, status_category } = statusPair(body.status);

    await execute(
      `INSERT INTO work_items
         (id, project_id, sprint_id, checkpoint_id, parent_id, item_type, title,
          description, status, status_category, priority, story_points,
          rank_value, assignee_id, reporter_id, due_date, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        body.projectId,
        sprintId,
        checkpointId,
        parentId,
        body.itemType,
        body.title,
        body.description ?? null,
        status,
        status_category,
        body.priority,
        body.storyPoints,
        rankValue,
        assigneeId,
        reporterId,
        body.dueDate ?? null,
        user.id,
      ],
    );

    // Story points changed → the project's computed progress is stale.
    await recomputeProjectProgress(body.projectId);

    const workItem = await loadWorkItemDto(id);

    await auditAs(user, {
      action: "work_item.create",
      entity: "work_items",
      entityId: id,
      severity: "success",
      newValues: {
        projectId: body.projectId,
        sprintId,
        parentId,
        itemType: body.itemType,
        title: body.title,
        status,
        priority: body.priority,
        storyPoints: body.storyPoints,
        assigneeId,
      },
    });

    return jsonOk({ workItem }, { status: 201 });
  },
);
