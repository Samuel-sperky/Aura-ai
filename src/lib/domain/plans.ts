// Baseline plan snapshots (`plan_versions`).
//
// WHAT A BASELINE IS HERE: the frozen state of ONE project — the project row, its
// checkpoints, its sprints and its work items — captured at the moment a
// checkpoint decision is recorded (spec Q37a). Later you can put "what we decided
// on" next to "what happened" without keeping a second history table for every
// entity.
//
// WHAT IT IS NOT: the source app's draft/publish workflow with its own `version`
// and `status` columns. Those are gone (contract §5.2). A snapshot is written
// once, never edited, and is only ever read back whole.
//
// The snapshot is written INSIDE the decision transaction, so a decision without
// its baseline cannot exist.

import { randomUUID } from "node:crypto";
import { num, isoOrNull } from "@/lib/domain/data";
import type { PlanVersionDto } from "@/lib/domain/contracts/checkpoints";
import { mutate, rows, type SqlRunner } from "@/lib/domain/checkpoints";

/**
 * Row caps. The target scale is 50 projects / 5 000 work items, so one project's
 * snapshot is small — but a snapshot is stored as a single JSON value, so it gets
 * a hard ceiling rather than an assumption. `truncated` records when a cap bit.
 */
const MAX_SNAPSHOT_WORK_ITEMS = 2000;
const MAX_SNAPSHOT_CHECKPOINTS = 500;
const MAX_SNAPSHOT_SPRINTS = 200;

/** Bump when the snapshot shape changes so old rows stay readable. */
export const SNAPSHOT_SCHEMA_VERSION = 1 as const;

export interface SnapshotProject {
  id: string;
  code: string;
  name: string;
  area: string;
  status: string;
  health: string;
  progress: number;
  owner: string;
  priority: string;
  startDate: string | null;
  endDate: string | null;
}

export interface SnapshotCheckpoint {
  id: string;
  name: string;
  checkpointType: string;
  lifecycle: string;
  dueDate: string | null;
  startDate: string | null;
  endDate: string | null;
  readiness: number;
}

export interface SnapshotSprint {
  id: string;
  name: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  capacityPoints: number;
  committedPoints: number;
  completedPoints: number;
}

export interface SnapshotWorkItem {
  id: string;
  parentId: string | null;
  sprintId: string | null;
  checkpointId: string | null;
  itemType: string;
  title: string;
  status: string;
  statusCategory: string;
  priority: string;
  storyPoints: number;
  assigneeId: string | null;
  dueDate: string | null;
}

/** Why the snapshot was taken. Today always a decision; kept open for A8. */
export type SnapshotReason =
  | { kind: "checkpoint_decision"; checkpointId: string; outcome: string }
  | { kind: "manual" };

export interface BaselineSnapshot {
  schema: typeof SNAPSHOT_SCHEMA_VERSION;
  capturedAt: string;
  reason: SnapshotReason;
  project: SnapshotProject;
  checkpoints: SnapshotCheckpoint[];
  sprints: SnapshotSprint[];
  workItems: SnapshotWorkItem[];
  totals: {
    checkpoints: number;
    sprints: number;
    workItems: number;
    storyPoints: number;
    completedStoryPoints: number;
  };
  truncated: {
    checkpoints: boolean;
    sprints: boolean;
    workItems: boolean;
  };
}

/**
 * Read one project's full plan state. DATE columns are formatted in SQL — the
 * driver would otherwise hand back a `Date` at local midnight and shift the day
 * (see the header note in lib/domain/checkpoints.ts).
 */
export async function buildBaselineSnapshot(
  runner: SqlRunner,
  projectId: string,
  reason: SnapshotReason,
): Promise<BaselineSnapshot | null> {
  const projectRows = await rows<{
    id: string;
    code: string;
    name: string;
    area: string;
    status: string;
    health: string;
    progress: number | string;
    owner: string;
    priority: string;
    start_date: string | null;
    end_date: string | null;
  }>(
    runner,
    `SELECT id, code, name, area, status, health, progress, owner, priority,
            DATE_FORMAT(start_date, '%Y-%m-%d') AS start_date,
            DATE_FORMAT(end_date, '%Y-%m-%d')   AS end_date
       FROM projects WHERE id = ?`,
    [projectId],
  );
  const p = projectRows[0];
  if (!p) return null;

  const checkpointRows = await rows<{
    id: string;
    name: string;
    checkpoint_type: string;
    lifecycle: string;
    due_date: string | null;
    start_date: string | null;
    end_date: string | null;
    readiness: number | string;
  }>(
    runner,
    `SELECT id, name, checkpoint_type, lifecycle, readiness,
            DATE_FORMAT(due_date, '%Y-%m-%d')   AS due_date,
            DATE_FORMAT(start_date, '%Y-%m-%d') AS start_date,
            DATE_FORMAT(end_date, '%Y-%m-%d')   AS end_date
       FROM checkpoints WHERE project_id = ?
      ORDER BY due_date ASC, name ASC
      LIMIT ?`,
    [projectId, MAX_SNAPSHOT_CHECKPOINTS + 1],
  );

  const sprintRows = await rows<{
    id: string;
    name: string;
    status: string;
    start_date: string | null;
    end_date: string | null;
    capacity_points: number | string;
    committed_points: number | string;
    completed_points: number | string;
  }>(
    runner,
    `SELECT id, name, status, capacity_points, committed_points, completed_points,
            DATE_FORMAT(start_date, '%Y-%m-%d') AS start_date,
            DATE_FORMAT(end_date, '%Y-%m-%d')   AS end_date
       FROM sprints WHERE project_id = ?
      ORDER BY start_date ASC, name ASC
      LIMIT ?`,
    [projectId, MAX_SNAPSHOT_SPRINTS + 1],
  );

  const itemRows = await rows<{
    id: string;
    parent_id: string | null;
    sprint_id: string | null;
    checkpoint_id: string | null;
    item_type: string;
    title: string;
    status: string;
    status_category: string;
    priority: string;
    story_points: number | string;
    assignee_id: string | null;
    due_date: string | null;
  }>(
    runner,
    `SELECT id, parent_id, sprint_id, checkpoint_id, item_type, title, status,
            status_category, priority, story_points, assignee_id,
            DATE_FORMAT(due_date, '%Y-%m-%d') AS due_date
       FROM work_items WHERE project_id = ?
      ORDER BY rank_value ASC, created_at ASC
      LIMIT ?`,
    [projectId, MAX_SNAPSHOT_WORK_ITEMS + 1],
  );

  const truncated = {
    checkpoints: checkpointRows.length > MAX_SNAPSHOT_CHECKPOINTS,
    sprints: sprintRows.length > MAX_SNAPSHOT_SPRINTS,
    workItems: itemRows.length > MAX_SNAPSHOT_WORK_ITEMS,
  };

  const checkpoints = checkpointRows
    .slice(0, MAX_SNAPSHOT_CHECKPOINTS)
    .map<SnapshotCheckpoint>((r) => ({
      id: r.id,
      name: r.name,
      checkpointType: r.checkpoint_type,
      lifecycle: r.lifecycle,
      dueDate: r.due_date,
      startDate: r.start_date,
      endDate: r.end_date,
      readiness: num(r.readiness),
    }));

  const sprints = sprintRows
    .slice(0, MAX_SNAPSHOT_SPRINTS)
    .map<SnapshotSprint>((r) => ({
      id: r.id,
      name: r.name,
      status: r.status,
      startDate: r.start_date,
      endDate: r.end_date,
      capacityPoints: num(r.capacity_points),
      committedPoints: num(r.committed_points),
      completedPoints: num(r.completed_points),
    }));

  const workItems = itemRows
    .slice(0, MAX_SNAPSHOT_WORK_ITEMS)
    .map<SnapshotWorkItem>((r) => ({
      id: r.id,
      parentId: r.parent_id,
      sprintId: r.sprint_id,
      checkpointId: r.checkpoint_id,
      itemType: r.item_type,
      title: r.title,
      status: r.status,
      statusCategory: r.status_category,
      priority: r.priority,
      storyPoints: num(r.story_points),
      assigneeId: r.assignee_id,
      dueDate: r.due_date,
    }));

  let storyPoints = 0;
  let completedStoryPoints = 0;
  for (const item of workItems) {
    storyPoints += item.storyPoints;
    if (item.status === "done") completedStoryPoints += item.storyPoints;
  }

  return {
    schema: SNAPSHOT_SCHEMA_VERSION,
    capturedAt: new Date().toISOString(),
    reason,
    project: {
      id: p.id,
      code: p.code,
      name: p.name,
      area: p.area,
      status: p.status,
      health: p.health,
      progress: num(p.progress),
      owner: p.owner,
      priority: p.priority,
      startDate: p.start_date,
      endDate: p.end_date,
    },
    checkpoints,
    sprints,
    workItems,
    totals: {
      checkpoints: checkpoints.length,
      sprints: sprints.length,
      workItems: workItems.length,
      storyPoints,
      completedStoryPoints,
    },
    truncated,
  };
}

/** Trim to the `plan_versions.name` column width without cutting mid-nothing. */
function planName(checkpointName: string): string {
  const base = `Baseline: ${checkpointName}`;
  return base.length > 160 ? `${base.slice(0, 157)}…` : base;
}

/**
 * Write one baseline row. Returns the new `plan_versions.id`, or null when the
 * project vanished (the caller holds a FK to it, so in practice never).
 *
 * `baseline_date` is the local calendar day, not a UTC-derived one: a decision
 * taken at 01:00 in Bratislava belongs to that day, not to the previous one.
 */
export async function createBaselineSnapshot(
  runner: SqlRunner,
  args: {
    projectId: string;
    checkpointName: string;
    reason: SnapshotReason;
    createdBy: string;
    baselineDate: string;
  },
): Promise<string | null> {
  const snapshot = await buildBaselineSnapshot(
    runner,
    args.projectId,
    args.reason,
  );
  if (!snapshot) return null;
  const id = randomUUID();
  await mutate(
    runner,
    `INSERT INTO plan_versions (id, name, baseline_date, snapshot_json, created_by)
     VALUES (?, ?, ?, ?, ?)`,
    [
      id,
      planName(args.checkpointName),
      args.baselineDate,
      JSON.stringify(snapshot),
      args.createdBy,
    ],
  );
  return id;
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/** The mariadb driver returns a JSON column either parsed or as a string. */
export function parseSnapshot(v: unknown): unknown {
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

interface PlanRow {
  id: string;
  name: string;
  baseline_date: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: Date | string | null;
  project_id: string | null;
  project_code: string | null;
  project_name: string | null;
  checkpoint_id: string | null;
  outcome: string | null;
  totals: unknown;
  snapshot_json?: unknown;
}

function mapTotals(v: unknown): PlanVersionDto["totals"] {
  const parsed = parseSnapshot(v);
  if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }
  const t = parsed as Record<string, unknown>;
  return {
    checkpoints: num(t.checkpoints),
    sprints: num(t.sprints),
    workItems: num(t.workItems),
    storyPoints: num(t.storyPoints),
    completedStoryPoints: num(t.completedStoryPoints),
  };
}

function mapPlan(row: PlanRow, includeSnapshot: boolean): PlanVersionDto {
  const dto: PlanVersionDto = {
    id: row.id,
    name: row.name,
    baselineDate: row.baseline_date ?? "",
    createdBy: row.created_by,
    createdByName: row.created_by_name,
    createdAt: isoOrNull(row.created_at),
    projectId: row.project_id,
    projectCode: row.project_code,
    projectName: row.project_name,
    checkpointId: row.checkpoint_id,
    outcome: row.outcome,
    totals: mapTotals(row.totals),
  };
  if (includeSnapshot) dto.snapshot = parseSnapshot(row.snapshot_json);
  return dto;
}

export interface PlanListArgs {
  projectId?: string;
  checkpointId?: string;
  includeSnapshot: boolean;
  limit: number;
  offset: number;
}

/**
 * List baseline snapshots, newest first.
 *
 * The summary columns (project, checkpoint, outcome, totals) are pulled out of
 * `snapshot_json` with `JSON_EXTRACT` rather than denormalised into columns:
 * baselines are written once and read rarely, and at this scale the extraction
 * costs nothing next to a schema the snapshot would have to stay in sync with.
 * The bulky `snapshot_json` itself is only selected when explicitly asked for.
 */
export async function listPlans(
  runner: SqlRunner,
  args: PlanListArgs,
): Promise<{ items: PlanVersionDto[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (args.projectId) {
    conditions.push(
      "JSON_UNQUOTE(JSON_EXTRACT(pv.snapshot_json, '$.project.id')) = ?",
    );
    params.push(args.projectId);
  }
  if (args.checkpointId) {
    conditions.push(
      "JSON_UNQUOTE(JSON_EXTRACT(pv.snapshot_json, '$.reason.checkpointId')) = ?",
    );
    params.push(args.checkpointId);
  }
  const where = conditions.length ? ` WHERE ${conditions.join(" AND ")}` : "";

  const totalRows = await rows<{ n: number | string }>(
    runner,
    `SELECT COUNT(*) AS n FROM plan_versions pv${where}`,
    params,
  );
  const total = num(totalRows[0]?.n);

  const list = await rows<PlanRow>(
    runner,
    `SELECT pv.id, pv.name, pv.created_by, pv.created_at,
            DATE_FORMAT(pv.baseline_date, '%Y-%m-%d') AS baseline_date,
            u.name AS created_by_name,
            JSON_UNQUOTE(JSON_EXTRACT(pv.snapshot_json, '$.project.id'))   AS project_id,
            JSON_UNQUOTE(JSON_EXTRACT(pv.snapshot_json, '$.project.code')) AS project_code,
            JSON_UNQUOTE(JSON_EXTRACT(pv.snapshot_json, '$.project.name')) AS project_name,
            JSON_UNQUOTE(JSON_EXTRACT(pv.snapshot_json, '$.reason.checkpointId')) AS checkpoint_id,
            JSON_UNQUOTE(JSON_EXTRACT(pv.snapshot_json, '$.reason.outcome'))      AS outcome,
            JSON_EXTRACT(pv.snapshot_json, '$.totals') AS totals
            ${args.includeSnapshot ? ", pv.snapshot_json" : ""}
       FROM plan_versions pv
       LEFT JOIN app_users u ON u.id = pv.created_by${where}
      ORDER BY pv.created_at DESC, pv.id DESC
      LIMIT ? OFFSET ?`,
    [...params, args.limit, args.offset],
  );

  return {
    items: list.map((row) => mapPlan(row, args.includeSnapshot)),
    total,
  };
}
