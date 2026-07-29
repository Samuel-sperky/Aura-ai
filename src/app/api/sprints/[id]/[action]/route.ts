// POST /api/sprints/[id]/[action] — the sprint lifecycle (right `sprints.write`)
//
//   commit     — freezes `committed_points` to the sprint's current leaf-item
//                total. THE SPRINT GOAL IS MANDATORY: a commitment without a
//                stated goal is a scope baseline nobody can argue against later.
//   start      — planned → active
//   review     — active → review
//   close      — refuses while any item is still open; every leftover must first
//                be finished or carried over. Writes `completed_points`.
//   cancel     — takes a sprint that is still in play out of the plan
//   carry-over — moves the unfinished items to `targetSprintId`, or to the
//                backlog when it is explicitly `null`
//
// Lifecycle violations answer 422 (the request was well-formed, the state was
// wrong); malformed input stays 400 and a stale `version` stays 409.

import { defineRoute, badRequest, notFound, versionConflict } from "@/lib/api/defineRoute";
import { jsonOk, jsonError } from "@/lib/api/respond";
import { query } from "@/lib/db";
import { auditAs } from "@/lib/auth/audit";
import { RATE_LIMITS } from "@/lib/security/rateLimit";
import {
  SPRINT_ACTIONS,
  sprintActionBodySchema,
  type SprintAction,
} from "@/lib/domain/contracts/sprints";
import {
  capacityByAssignee,
  carryOverItems,
  casUpdateSprint,
  loadSprintBase,
  loadSprintDto,
  nextSprintStatus,
  openItemCount,
  openItemIds,
  sprintActionError,
  sprintMetrics,
  sprintTotals,
} from "@/lib/domain/sprints";

function isKnownAction(value: string): value is SprintAction {
  return (SPRINT_ACTIONS as ReadonlyArray<string>).includes(value);
}

export const POST = defineRoute(
  {
    auth: { right: "sprints.write" },
    rateLimit: RATE_LIMITS.write,
    bodySchema: sprintActionBodySchema,
    version: true,
  },
  async ({ user, body, version, params }) => {
    const { id, action } = params as { id: string; action: string };
    if (!isKnownAction(action)) return notFound("Neznáma akcia šprintu.");

    const current = await loadSprintBase(id);
    if (!current) return notFound("Šprint neexistuje.");
    if (current.version !== version) return versionConflict(current.version);

    // `close` is the only guard that needs to look outside the sprint row.
    const open = action === "close" ? await openItemCount(id) : undefined;
    const guardError = sprintActionError(
      action,
      { status: current.status, goal: current.goal },
      { openItemCount: open },
    );
    if (guardError) return jsonError(guardError, 422);

    const sets: Record<string, unknown> = {};
    const nextStatus = nextSprintStatus(action);
    if (nextStatus) sets.status = nextStatus;

    let movedItems = 0;
    let carriedIds: string[] = [];

    if (action === "commit") {
      // The commitment is the leaf-item total at this moment — the baseline every
      // later scope change is measured against.
      const totals = await sprintTotals(id);
      sets.committed_points = totals.currentPoints;
    }

    if (action === "close") {
      const totals = await sprintTotals(id);
      sets.completed_points = totals.donePoints;
    }

    if (action === "carry-over") {
      if (body.targetSprintId === undefined) {
        return badRequest(
          "Vyberte cieľový šprint, alebo zvoľte prenos do backlogu (targetSprintId: null).",
        );
      }
      const targetSprintId = body.targetSprintId ?? null;

      if (targetSprintId !== null) {
        if (targetSprintId === id) {
          return badRequest("Cieľový šprint musí byť iný než zdrojový.");
        }
        const target = await query<{ project_id: string; status: string }>(
          "SELECT project_id, status FROM sprints WHERE id = ?",
          [targetSprintId],
        );
        if (!target[0]) return notFound("Cieľový šprint neexistuje.");
        if (target[0].project_id !== current.project_id) {
          return badRequest("Cieľový šprint patrí inému projektu.");
        }
        if (target[0].status === "completed" || target[0].status === "cancelled") {
          return badRequest("Do uzavretého ani zrušeného šprintu sa prenášať nedá.");
        }
      }

      carriedIds = await openItemIds(id);
      movedItems = await carryOverItems(id, targetSprintId, user.id);
    }

    // Every action touches the sprint row (carry-over too: its scope changed), so
    // the CAS bump always runs and stale clients always learn about it.
    const cas = await casUpdateSprint(id, version, sets, user.id);
    if (!cas.ok) return versionConflict(cas.currentVersion);

    const sprint = await loadSprintDto(id);
    const totals = await sprintTotals(id);

    await auditAs(user, {
      action: `sprint.${action === "carry-over" ? "carry_over" : action}`,
      entity: "sprints",
      entityId: id,
      severity: action === "cancel" ? "warning" : "success",
      detail: body.note ?? null,
      oldValues: {
        status: current.status,
        committedPoints: current.committed_points,
        completedPoints: current.completed_points,
      },
      newValues: {
        ...sets,
        ...(action === "carry-over"
          ? {
              targetSprintId: body.targetSprintId ?? null,
              movedItems,
              itemIds: carriedIds,
            }
          : {}),
      },
    });

    return jsonOk({
      sprint,
      metrics: sprint ? sprintMetrics(sprint, totals) : null,
      capacity: await capacityByAssignee(id),
      ...(action === "carry-over" ? { movedItems } : {}),
    });
  },
);
