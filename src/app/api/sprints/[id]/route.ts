// GET   /api/sprints/[id] — sprint + metrics + per-person capacity (`sprints.read`)
// PATCH /api/sprints/[id] — edit under optimistic concurrency (`sprints.write`)
//
// `status` is deliberately NOT patchable: every lifecycle move goes through
// POST /api/sprints/[id]/[action] so the guards run and an audit row is written.
//
// There is no DELETE. A sprint that was planned is part of the record; the way to
// take one out of play is `cancel`, which keeps its items and its history.

import { defineRoute, notFound, versionConflict } from "@/lib/api/defineRoute";
import { jsonOk } from "@/lib/api/respond";
import { auditAs } from "@/lib/auth/audit";
import { RATE_LIMITS } from "@/lib/security/rateLimit";
import { sprintUpdateSchema } from "@/lib/domain/contracts/sprints";
import {
  capacityByAssignee,
  casUpdateSprint,
  loadSprintBase,
  loadSprintDto,
  sprintMetrics,
  sprintTotals,
} from "@/lib/domain/sprints";

export const GET = defineRoute(
  { auth: { right: "sprints.read" }, rateLimit: RATE_LIMITS.read },
  async ({ params }) => {
    const { id } = params as { id: string };

    const sprint = await loadSprintDto(id);
    if (!sprint) return notFound("Šprint neexistuje.");

    const totals = await sprintTotals(id);
    const capacity = await capacityByAssignee(id);

    return jsonOk({ sprint, metrics: sprintMetrics(sprint, totals), capacity });
  },
);

export const PATCH = defineRoute(
  {
    auth: { right: "sprints.write" },
    rateLimit: RATE_LIMITS.write,
    bodySchema: sprintUpdateSchema,
    version: true,
  },
  async ({ user, body, version, params }) => {
    const { id } = params as { id: string };

    const current = await loadSprintBase(id);
    if (!current) return notFound("Šprint neexistuje.");
    if (current.version !== version) return versionConflict(current.version);

    const sets: Record<string, unknown> = {};
    if (body.name !== undefined) sets.name = body.name;
    if (body.goal !== undefined) sets.goal = body.goal;
    if (body.startDate !== undefined) sets.start_date = body.startDate;
    if (body.endDate !== undefined) sets.end_date = body.endDate;
    if (body.capacityPoints !== undefined) sets.capacity_points = body.capacityPoints;
    if (body.cadenceWeeks !== undefined) sets.cadence_weeks = body.cadenceWeeks;

    const cas = await casUpdateSprint(id, version, sets, user.id);
    if (!cas.ok) return versionConflict(cas.currentVersion);

    const sprint = await loadSprintDto(id);

    await auditAs(user, {
      action: "sprint.update",
      entity: "sprints",
      entityId: id,
      severity: "info",
      oldValues: {
        name: current.name,
        goal: current.goal,
        capacityPoints: current.capacity_points,
      },
      newValues: sets,
    });

    return jsonOk({ sprint });
  },
);
