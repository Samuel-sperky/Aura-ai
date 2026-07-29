// POST /api/work-items/[id]/[action] — the three item actions (`work_items.write`)
//
//   move       — put the item into a sprint (`sprintId: null` = back to the
//                backlog), optionally at a given position. This is the endpoint
//                behind BOTH drag & drop and the keyboard "Presunúť" dialog
//                (spec Q13): the dialog must work without any pointer.
//   rank       — manual ordering. `rankValue` for a drag & drop drop position,
//                or `direction: "up" | "down"` for the ↑/↓ keyboard swap.
//   transition — status change (board column drop / status select).
//
// All three are optimistic-concurrency checked and audited. Actions exist as a
// separate endpoint from PATCH because each carries its own guard set and its own
// audit action key, which the timeline/board UI reports back to the user.

import { defineRoute, badRequest, notFound, versionConflict } from "@/lib/api/defineRoute";
import { jsonOk } from "@/lib/api/respond";
import { auditAs } from "@/lib/auth/audit";
import { recomputeProjectProgress } from "@/lib/domain/projects";
import { RATE_LIMITS } from "@/lib/security/rateLimit";
import {
  WORK_ITEM_ACTIONS,
  workItemActionBodySchema,
  workItemMoveSchema,
  workItemRankSchema,
  workItemTransitionSchema,
  type WorkItemAction,
} from "@/lib/domain/contracts/workItems";
import {
  casUpdateWorkItem,
  loadWorkItemBase,
  loadWorkItemDto,
  relationError,
  shiftRank,
  statusPair,
} from "@/lib/domain/workItems";

function isKnownAction(value: string): value is WorkItemAction {
  return (WORK_ITEM_ACTIONS as ReadonlyArray<string>).includes(value);
}

/** First zod issue as a Slovak message (same convention as defineRoute). */
function firstIssue(issues: ReadonlyArray<{ message: string }>): string {
  return issues[0]?.message ?? "Neplatný vstup.";
}

export const POST = defineRoute(
  {
    auth: { right: "work_items.write" },
    rateLimit: RATE_LIMITS.write,
    bodySchema: workItemActionBodySchema,
    version: true,
  },
  async ({ user, body, version, params }) => {
    const { id, action } = params as { id: string; action: string };
    if (!isKnownAction(action)) return notFound("Neznáma akcia položky.");

    const current = await loadWorkItemBase(id);
    if (!current) return notFound("Položka neexistuje.");
    if (current.version !== version) return versionConflict(current.version);

    if (action === "move") {
      const parsed = workItemMoveSchema.safeParse(body);
      if (!parsed.success) return badRequest(firstIssue(parsed.error.issues));
      const { sprintId, rankValue } = parsed.data;

      const relations = await relationError({
        projectId: current.project_id,
        sprintId,
      });
      if (relations) return badRequest(relations);

      const sets: Record<string, unknown> = { sprint_id: sprintId };
      if (rankValue !== undefined) sets.rank_value = rankValue;

      const cas = await casUpdateWorkItem(id, version, sets, user.id);
      if (!cas.ok) return versionConflict(cas.currentVersion);

      await auditAs(user, {
        action: "work_item.move",
        entity: "work_items",
        entityId: id,
        severity: "info",
        oldValues: { sprintId: current.sprint_id, rankValue: current.rank_value },
        newValues: { sprintId, rankValue: rankValue ?? current.rank_value },
      });

      return jsonOk({ workItem: await loadWorkItemDto(id) });
    }

    if (action === "rank") {
      const parsed = workItemRankSchema.safeParse(body);
      if (!parsed.success) return badRequest(firstIssue(parsed.error.issues));
      const { rankValue, direction } = parsed.data;

      if (direction) {
        const moved = await shiftRank(current, version, direction, user.id);
        if (moved.conflict) return versionConflict(moved.currentVersion);
        if (!moved.moved) {
          return badRequest(
            direction === "up"
              ? "Položka je už na začiatku zoznamu."
              : "Položka je už na konci zoznamu.",
          );
        }
      } else {
        const cas = await casUpdateWorkItem(
          id,
          version,
          { rank_value: rankValue },
          user.id,
        );
        if (!cas.ok) return versionConflict(cas.currentVersion);
      }

      await auditAs(user, {
        action: "work_item.rank",
        entity: "work_items",
        entityId: id,
        severity: "info",
        oldValues: { rankValue: current.rank_value },
        newValues: { rankValue, direction },
      });

      return jsonOk({ workItem: await loadWorkItemDto(id) });
    }

    // action === "transition"
    const parsed = workItemTransitionSchema.safeParse(body);
    if (!parsed.success) return badRequest(firstIssue(parsed.error.issues));
    const pair = statusPair(parsed.data.status);

    const cas = await casUpdateWorkItem(
      id,
      version,
      { status: pair.status, status_category: pair.status_category },
      user.id,
    );
    if (!cas.ok) return versionConflict(cas.currentVersion);

    // A status change moves points between "done" and "open" → progress is stale.
    await recomputeProjectProgress(current.project_id);

    await auditAs(user, {
      action: "work_item.transition",
      entity: "work_items",
      entityId: id,
      severity: "info",
      oldValues: { status: current.status },
      newValues: { status: pair.status },
    });

    return jsonOk({ workItem: await loadWorkItemDto(id) });
  },
);
