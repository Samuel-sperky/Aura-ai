// GET    /api/work-items/[id] — one item + its subtasks (right `work_items.read`)
// PATCH  /api/work-items/[id] — edit under optimistic concurrency (`work_items.write`)
// DELETE /api/work-items/[id] — HARD delete + audit (`work_items.write`)
//
// There is no soft delete anywhere in this app: the DELETE removes the row and
// lets `ON DELETE CASCADE` take the subtasks, comments, worklogs and dependency
// edges with it. `audit_log` is the record that the item existed.

import { defineRoute, badRequest, notFound, versionConflict } from "@/lib/api/defineRoute";
import { jsonOk } from "@/lib/api/respond";
import { query, execute } from "@/lib/db";
import { auditAs } from "@/lib/auth/audit";
import { recomputeProjectProgress } from "@/lib/domain/projects";
import { RATE_LIMITS } from "@/lib/security/rateLimit";
import {
  workItemDeleteSchema,
  workItemUpdateSchema,
} from "@/lib/domain/contracts/workItems";
import {
  BACKLOG_ORDER_BY,
  WORK_ITEM_SELECT,
  casUpdateWorkItem,
  loadWorkItemBase,
  loadWorkItemDto,
  relationError,
  statusPair,
  toWorkItemDto,
  validateParentPlacement,
  type WorkItemRow,
} from "@/lib/domain/workItems";

export const GET = defineRoute(
  { auth: { right: "work_items.read" }, rateLimit: RATE_LIMITS.read },
  async ({ params }) => {
    const { id } = params as { id: string };

    const workItem = await loadWorkItemDto(id);
    if (!workItem) return notFound("Položka neexistuje.");

    // At most two levels, so one query is always enough for the whole subtree.
    const childRows = await query<WorkItemRow>(
      `${WORK_ITEM_SELECT} WHERE w.parent_id = ? ORDER BY ${BACKLOG_ORDER_BY}`,
      [id],
    );

    return jsonOk({ workItem, children: childRows.map(toWorkItemDto) });
  },
);

export const PATCH = defineRoute(
  {
    auth: { right: "work_items.write" },
    rateLimit: RATE_LIMITS.write,
    bodySchema: workItemUpdateSchema,
    version: true,
  },
  async ({ user, body, version, params }) => {
    const { id } = params as { id: string };

    const current = await loadWorkItemBase(id);
    if (!current) return notFound("Položka neexistuje.");
    if (current.version !== version) return versionConflict(current.version);

    const relations = await relationError({
      projectId: current.project_id,
      sprintId: body.sprintId,
      checkpointId: body.checkpointId,
      assigneeId: body.assigneeId,
      reporterId: body.reporterId,
    });
    if (relations) return badRequest(relations);

    // Re-parenting: the two-level rule is checked against the STORED rows, in
    // both directions (a subtask can take no children, and an item that has
    // children cannot be pushed under a parent).
    if (body.parentId) {
      const placement = await validateParentPlacement({
        parentId: body.parentId,
        childId: id,
        childProjectId: current.project_id,
      });
      if (placement) return badRequest(placement);
    }

    const sets: Record<string, unknown> = {};
    if (body.sprintId !== undefined) sets.sprint_id = body.sprintId;
    if (body.checkpointId !== undefined) sets.checkpoint_id = body.checkpointId;
    if (body.parentId !== undefined) sets.parent_id = body.parentId;
    if (body.itemType !== undefined) sets.item_type = body.itemType;
    if (body.title !== undefined) sets.title = body.title;
    if (body.description !== undefined) sets.description = body.description;
    if (body.priority !== undefined) sets.priority = body.priority;
    if (body.storyPoints !== undefined) sets.story_points = body.storyPoints;
    if (body.rankValue !== undefined) sets.rank_value = body.rankValue;
    if (body.assigneeId !== undefined) sets.assignee_id = body.assigneeId;
    if (body.reporterId !== undefined) sets.reporter_id = body.reporterId;
    if (body.dueDate !== undefined) sets.due_date = body.dueDate;
    if (body.status !== undefined) {
      const pair = statusPair(body.status);
      sets.status = pair.status;
      sets.status_category = pair.status_category;
    }

    const cas = await casUpdateWorkItem(id, version, sets, user.id);
    if (!cas.ok) return versionConflict(cas.currentVersion);

    // Points or status changed → the project's computed progress is stale.
    if (body.storyPoints !== undefined || body.status !== undefined) {
      await recomputeProjectProgress(current.project_id);
    }

    const workItem = await loadWorkItemDto(id);

    await auditAs(user, {
      action: "work_item.update",
      entity: "work_items",
      entityId: id,
      severity: "info",
      oldValues: {
        sprintId: current.sprint_id,
        parentId: current.parent_id,
        status: current.status,
        priority: current.priority,
        storyPoints: current.story_points,
        rankValue: current.rank_value,
        assigneeId: current.assignee_id,
      },
      newValues: sets,
    });

    return jsonOk({ workItem });
  },
);

export const DELETE = defineRoute(
  {
    auth: { right: "work_items.write" },
    rateLimit: RATE_LIMITS.write,
    bodySchema: workItemDeleteSchema,
    version: true,
  },
  async ({ user, version, params }) => {
    const { id } = params as { id: string };

    const current = await loadWorkItemBase(id);
    if (!current) return notFound("Položka neexistuje.");
    if (current.version !== version) return versionConflict(current.version);

    const before = await loadWorkItemDto(id);

    const res = await execute(
      "DELETE FROM work_items WHERE id = ? AND version = ?",
      [id, version],
    );
    if (res.affectedRows === 0) {
      const rows = await query<{ version: number }>(
        "SELECT version FROM work_items WHERE id = ?",
        [id],
      );
      const stored = Number(rows[0]?.version ?? 0);
      return stored ? versionConflict(stored) : notFound("Položka neexistuje.");
    }

    await recomputeProjectProgress(current.project_id);

    await auditAs(user, {
      action: "work_item.delete",
      entity: "work_items",
      entityId: id,
      severity: "critical",
      oldValues: before,
    });

    return jsonOk({ ok: true, id });
  },
);
