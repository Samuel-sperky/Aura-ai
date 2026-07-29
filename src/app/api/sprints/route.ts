// GET  /api/sprints — list sprints with live metrics (right `sprints.read`)
// POST /api/sprints — create a sprint in `draft` (right `sprints.write`)
//
// A sprint belongs to a PROJECT. There is no team and no workstream: teams are
// out of scope, and capacity is per person (see the capacity panel on the detail).
//
// Every listed sprint carries its `metrics` block so the sprint planner and the
// timeline can render commitment, scope change and capacity use without a second
// round trip. The whole page's aggregates come from ONE grouped query.

import { randomUUID } from "node:crypto";
import { defineRoute, badRequest } from "@/lib/api/defineRoute";
import { jsonList, jsonOk } from "@/lib/api/respond";
import { query, execute } from "@/lib/db";
import { auditAs } from "@/lib/auth/audit";
import { RATE_LIMITS } from "@/lib/security/rateLimit";
import {
  escapeLike,
  LIKE_ESCAPE_CLAUSE,
  pageMeta,
  toPagination,
} from "@/lib/domain/data";
import {
  sprintCreateSchema,
  sprintListQuerySchema,
  type SprintWithMetricsDto,
} from "@/lib/domain/contracts/sprints";
import {
  EMPTY_SPRINT_TOTALS,
  OPEN_SPRINT_STATUSES,
  SPRINT_SELECT,
  loadSprintDto,
  sprintMetrics,
  sprintOrderBy,
  sprintTotalsFor,
  toSprintDto,
  type SprintRow,
} from "@/lib/domain/sprints";

export const GET = defineRoute(
  {
    auth: { right: "sprints.read" },
    rateLimit: RATE_LIMITS.read,
    querySchema: sprintListQuerySchema,
  },
  async ({ query: q }) => {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (q.projectId) {
      conditions.push("s.project_id = ?");
      params.push(q.projectId);
    }
    if (q.status) {
      conditions.push("s.status = ?");
      params.push(q.status);
    }
    if (q.openOnly === "1") {
      conditions.push(
        `s.status IN (${OPEN_SPRINT_STATUSES.map(() => "?").join(", ")})`,
      );
      params.push(...OPEN_SPRINT_STATUSES);
    }
    // Overlap, not containment: the timeline window must show a sprint that
    // merely reaches into it.
    if (q.from) {
      conditions.push("s.end_date >= ?");
      params.push(q.from);
    }
    if (q.to) {
      conditions.push("s.start_date <= ?");
      params.push(q.to);
    }
    if (q.q) {
      const like = `%${escapeLike(q.q)}%`;
      conditions.push(
        `(s.name LIKE ? ${LIKE_ESCAPE_CLAUSE} OR s.goal LIKE ? ${LIKE_ESCAPE_CLAUSE})`,
      );
      params.push(like, like);
    }

    const where = conditions.length ? ` WHERE ${conditions.join(" AND ")}` : "";

    const totals = await query<{ n: number }>(
      `SELECT COUNT(*) AS n FROM sprints s${where}`,
      params,
    );
    const total = Number(totals[0]?.n ?? 0);

    const pg = toPagination(q.page, q.pageSize);
    const rows = await query<SprintRow>(
      `${SPRINT_SELECT}${where}
        ORDER BY ${sprintOrderBy(q.sort, q.dir)}
        LIMIT ? OFFSET ?`,
      [...params, pg.limit, pg.offset],
    );

    const sprints = rows.map(toSprintDto);
    const aggregates = await sprintTotalsFor(sprints.map((s) => s.id));

    const items: SprintWithMetricsDto[] = sprints.map((sprint) => ({
      ...sprint,
      metrics: sprintMetrics(
        sprint,
        aggregates.get(sprint.id) ?? EMPTY_SPRINT_TOTALS,
      ),
    }));

    return jsonList(items, pageMeta(pg, total));
  },
);

export const POST = defineRoute(
  {
    auth: { right: "sprints.write" },
    rateLimit: RATE_LIMITS.write,
    bodySchema: sprintCreateSchema,
  },
  async ({ user, body }) => {
    const projects = await query<{ id: string }>(
      "SELECT id FROM projects WHERE id = ?",
      [body.projectId],
    );
    if (!projects[0]) return badRequest("Projekt neexistuje.");

    const id = randomUUID();
    await execute(
      `INSERT INTO sprints
         (id, project_id, name, goal, start_date, end_date, status,
          capacity_points, committed_points, completed_points, cadence_weeks,
          created_by)
       VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, 0, 0, ?, ?)`,
      [
        id,
        body.projectId,
        body.name,
        body.goal ?? null,
        body.startDate,
        body.endDate,
        body.capacityPoints,
        body.cadenceWeeks,
        user.id,
      ],
    );

    const sprint = await loadSprintDto(id);

    await auditAs(user, {
      action: "sprint.create",
      entity: "sprints",
      entityId: id,
      severity: "success",
      newValues: {
        projectId: body.projectId,
        name: body.name,
        goal: body.goal ?? null,
        startDate: body.startDate,
        endDate: body.endDate,
        capacityPoints: body.capacityPoints,
        cadenceWeeks: body.cadenceWeeks,
      },
    });

    return jsonOk({ sprint }, { status: 201 });
  },
);
