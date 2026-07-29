// Sprint domain layer: lifecycle guards, the four metrics and the per-person
// capacity panel.
//
// SERVER-ONLY below the pure section (imports lib/db).
//
// LIFECYCLE: draft → planned → active → review → completed, plus cancelled from
// anywhere still in play. Every transition goes through
// `POST /api/sprints/[id]/[action]` so the guards below always run:
//
//   commit     — the sprint GOAL is mandatory; freezes `committed_points`
//   start      — planned → active
//   review     — active → review
//   close      — every open item must first be resolved (done or carried over);
//                writes `completed_points`
//   cancel     — anything not finished yet
//   carry-over — moves the unfinished items to another sprint or to the backlog
//
// POINTS ARE COUNTED ON LEAF ITEMS ONLY. A parent's story points are the sum of
// its subtasks (spec Q26), so counting a parent and its children in the same
// sprint would double-count the same work.

import { query, execute } from "@/lib/db";
import { dateOrNull, isoOrNull, num, round, strOrNull, pickSort, sortDir } from "@/lib/domain/data";
import { percentOf } from "@/lib/domain/workItems";
import type {
  CapacityBreakdownDto,
  CapacityRowDto,
  SprintAction,
  SprintDto,
  SprintMetricsDto,
  SprintStatus,
} from "@/lib/domain/contracts/sprints";

// ---------------------------------------------------------------------------
// Pure: metrics
// ---------------------------------------------------------------------------

/** The minimum an item must expose for the sprint metrics. */
export interface SprintItemLike {
  id: string;
  storyPoints: number;
  statusCategory: string;
  assigneeId?: string | null;
}

/** Sum of the story points currently in the sprint — what `commit` freezes. */
export function commitPoints(items: ReadonlyArray<SprintItemLike>): number {
  return items.reduce((sum, i) => sum + points(i.storyPoints), 0);
}

/** Sum of the story points of the DONE items — what `close` stores. */
export function completedPoints(items: ReadonlyArray<SprintItemLike>): number {
  return items
    .filter((i) => i.statusCategory === "done")
    .reduce((sum, i) => sum + points(i.storyPoints), 0);
}

function points(v: unknown): number {
  const n = num(v);
  return n > 0 ? Math.trunc(n) : 0;
}

export interface ScopeChange {
  /** The commitment frozen at `commit` (0 before that). */
  committedPoints: number;
  /** Points in the sprint right now. */
  currentPoints: number;
  /** currentPoints − committedPoints. Positive means scope crept in. */
  delta: number;
  /** The delta as a share of the commitment, in % (0 when nothing was committed). */
  percent: number;
}

/**
 * Scope change against the frozen commitment. This is why `committed_points` is
 * stored rather than recomputed: without the frozen baseline an added item is
 * invisible.
 *
 * @example
 *   scopeChange(20, 26) // { delta: 6, percent: 30 }
 */
export function scopeChange(
  committedPointsValue: number,
  currentPointsValue: number,
): ScopeChange {
  const committed = points(committedPointsValue);
  const current = points(currentPointsValue);
  const delta = current - committed;
  return {
    committedPoints: committed,
    currentPoints: current,
    delta,
    percent: committed > 0 ? round((delta / committed) * 100, 1) : 0,
  };
}

/**
 * Average completed points over the last `window` finished sprints.
 * `history` must be ordered oldest → newest; unfinished sprints are ignored
 * because their `completed_points` is only written on close.
 */
export function velocity(
  history: ReadonlyArray<{ completedPoints: number; status?: string }>,
  window = 3,
): number {
  const finished = history.filter(
    (s) => s.status === undefined || s.status === "completed",
  );
  if (finished.length === 0 || window < 1) return 0;
  const slice = finished.slice(-window);
  const sum = slice.reduce((acc, s) => acc + points(s.completedPoints), 0);
  return round(sum / slice.length, 1);
}

/**
 * The items a `close` would leave behind: everything not done. They must be
 * carried over (to another sprint or to the backlog) before the sprint closes.
 */
export function carryOver<T extends { statusCategory: string }>(
  items: ReadonlyArray<T>,
): T[] {
  return items.filter((i) => i.statusCategory !== "done");
}

// ---------------------------------------------------------------------------
// Pure: lifecycle guards
// ---------------------------------------------------------------------------

/** The stored facts a lifecycle guard needs. */
export interface SprintGuardState {
  status: string;
  goal: string | null;
}

export interface SprintGuardContext {
  /** Items in the sprint that are not done — required by `close`. */
  openItemCount?: number;
}

/** Status a successful action leaves the sprint in (`carry-over` changes none). */
export function nextSprintStatus(action: SprintAction): SprintStatus | null {
  switch (action) {
    case "commit":
      return "planned";
    case "start":
      return "active";
    case "review":
      return "review";
    case "close":
      return "completed";
    case "cancel":
      return "cancelled";
    case "carry-over":
      return null;
  }
}

const IN_PLAY: ReadonlyArray<string> = ["draft", "planned", "active", "review"];

/**
 * Validate a lifecycle action against the stored sprint. Returns a Slovak error
 * message, or null when the action may proceed.
 *
 * The commit rule is the important one: **the sprint goal is mandatory before
 * commit**. A committed sprint without a goal is a scope baseline nobody can
 * argue against later.
 */
export function sprintActionError(
  action: SprintAction,
  sprint: SprintGuardState,
  ctx: SprintGuardContext = {},
): string | null {
  const status = sprint.status;

  switch (action) {
    case "commit": {
      if (status !== "draft" && status !== "planned") {
        return "Commitnúť sa dá len šprint v stave Návrh alebo Plánovaný.";
      }
      if (!strOrNull(sprint.goal?.trim() ?? null)) {
        return "Pred commitom je povinný cieľ šprintu.";
      }
      return null;
    }
    case "start":
      if (status === "draft") return "Šprint treba najprv commitnúť.";
      if (status !== "planned") return "Spustiť sa dá len plánovaný šprint.";
      return null;
    case "review":
      if (status !== "active") return "Do revízie sa dá poslať len bežiaci šprint.";
      return null;
    case "close": {
      if (status !== "active" && status !== "review") {
        return "Uzavrieť sa dá len bežiaci šprint alebo šprint v revízii.";
      }
      if (num(ctx.openItemCount) > 0) {
        return "Najprv vyhodnoťte alebo preneste všetky otvorené položky.";
      }
      return null;
    }
    case "cancel":
      if (!IN_PLAY.includes(status)) {
        return "Zrušiť sa dá len šprint, ktorý ešte nie je uzavretý.";
      }
      return null;
    case "carry-over":
      if (status === "draft" || status === "planned") {
        return "Prenášať položky sa dá až z rozbehnutého šprintu.";
      }
      if (status === "cancelled") {
        return "Zo zrušeného šprintu sa položky neprenášajú.";
      }
      return null;
  }
}

// ---------------------------------------------------------------------------
// Pure: per-person capacity (capacity is per PERSON, not per team)
// ---------------------------------------------------------------------------

/** One aggregated assignee bucket, as it comes out of the GROUP BY. */
export interface CapacityAggregate {
  assigneeId: string | null;
  assigneeName: string | null;
  assigneeInitials: string | null;
  itemCount: number;
  openItemCount: number;
  committedPoints: number;
  completedPoints: number;
}

/**
 * Turn the per-assignee aggregates into the capacity panel. The sprint's
 * `capacity_points` is a single planned number, so it is split evenly across the
 * people who actually carry items — there are no teams and no per-person
 * capacity rows to read it from.
 *
 * The "Nepriradené" bucket (assigneeId === null) gets no capacity: it is work
 * nobody has taken, not somebody's overload.
 */
export function capacityBreakdown(
  capacityPoints: number,
  aggregates: ReadonlyArray<CapacityAggregate>,
): CapacityBreakdownDto {
  const capacity = points(capacityPoints);
  const people = aggregates.filter((a) => a.assigneeId !== null).length;
  const perPerson = people > 0 ? round(capacity / people, 1) : capacity;

  const rows: CapacityRowDto[] = aggregates.map((a) => {
    const own = a.assigneeId !== null ? perPerson : 0;
    return {
      assigneeId: a.assigneeId,
      assigneeName: a.assigneeName,
      assigneeInitials: a.assigneeInitials,
      itemCount: num(a.itemCount),
      openItemCount: num(a.openItemCount),
      committedPoints: points(a.committedPoints),
      completedPoints: points(a.completedPoints),
      capacityPoints: own,
      loadPercent: percentOf(points(a.committedPoints), own),
    };
  });

  return { capacityPoints: capacity, capacityPerPerson: perPerson, rows };
}

// ---------------------------------------------------------------------------
// Rows, SELECT and DTO mapping
// ---------------------------------------------------------------------------

export interface SprintRow {
  id: string;
  project_id: string;
  name: string;
  goal: string | null;
  start_date: unknown;
  end_date: unknown;
  status: string;
  capacity_points: number;
  committed_points: number;
  completed_points: number;
  cadence_weeks: number;
  version: number;
  created_at: unknown;
  updated_at: unknown;
  project_code: string | null;
  project_name: string | null;
}

export const SPRINT_SELECT = `
  SELECT s.id, s.project_id, s.name, s.goal, s.start_date, s.end_date, s.status,
         s.capacity_points, s.committed_points, s.completed_points,
         s.cadence_weeks, s.version, s.created_at, s.updated_at,
         p.code AS project_code, p.name AS project_name
    FROM sprints s
    JOIN projects p ON p.id = s.project_id`;

export function toSprintDto(row: SprintRow): SprintDto {
  return {
    id: row.id,
    projectId: row.project_id,
    projectCode: strOrNull(row.project_code),
    projectName: strOrNull(row.project_name),
    name: row.name,
    goal: strOrNull(row.goal),
    startDate: dateOrNull(row.start_date),
    endDate: dateOrNull(row.end_date),
    status: row.status as SprintStatus,
    capacityPoints: num(row.capacity_points),
    committedPoints: num(row.committed_points),
    completedPoints: num(row.completed_points),
    cadenceWeeks: num(row.cadence_weeks),
    version: num(row.version),
    createdAt: isoOrNull(row.created_at),
    updatedAt: isoOrNull(row.updated_at),
  };
}

export interface SprintBase {
  id: string;
  project_id: string;
  name: string;
  goal: string | null;
  status: string;
  capacity_points: number;
  committed_points: number;
  completed_points: number;
  version: number;
}

export async function loadSprintBase(id: string): Promise<SprintBase | null> {
  const rows = await query<SprintBase>(
    `SELECT id, project_id, name, goal, status, capacity_points,
            committed_points, completed_points, version
       FROM sprints WHERE id = ?`,
    [id],
  );
  return rows[0] ?? null;
}

export async function loadSprintDto(id: string): Promise<SprintDto | null> {
  const rows = await query<SprintRow>(`${SPRINT_SELECT} WHERE s.id = ?`, [id]);
  return rows[0] ? toSprintDto(rows[0]) : null;
}

export const SPRINT_SORT_COLUMNS: Readonly<Record<string, string>> = {
  startDate: "s.start_date",
  endDate: "s.end_date",
  name: "s.name",
  status: "s.status",
  createdAt: "s.created_at",
};

export function sprintOrderBy(sort: string | undefined, dir: string | undefined): string {
  const col = pickSort(sort, SPRINT_SORT_COLUMNS, "s.start_date");
  return `${col} ${sortDir(dir)}, s.id ASC`;
}

/** Statuses that are still in play — the `openOnly=1` list filter. */
export const OPEN_SPRINT_STATUSES: ReadonlyArray<string> = IN_PLAY;

// ---------------------------------------------------------------------------
// DB: point totals and metrics
// ---------------------------------------------------------------------------

/**
 * Leaf-item point/count totals for one sprint. `NOT EXISTS` drops the parents so
 * a parent and its subtasks in the same sprint are counted once.
 */
export async function sprintTotals(sprintId: string): Promise<{
  itemCount: number;
  doneItemCount: number;
  openItemCount: number;
  currentPoints: number;
  donePoints: number;
}> {
  const rows = await query<{
    item_count: number;
    done_count: number;
    total_points: number;
    done_points: number;
  }>(
    `SELECT COUNT(*) AS item_count,
            COALESCE(SUM(CASE WHEN w.status_category = 'done' THEN 1 ELSE 0 END), 0) AS done_count,
            COALESCE(SUM(w.story_points), 0) AS total_points,
            COALESCE(SUM(CASE WHEN w.status_category = 'done' THEN w.story_points ELSE 0 END), 0) AS done_points
       FROM work_items w
      WHERE w.sprint_id = ?
        AND NOT EXISTS (SELECT 1 FROM work_items c WHERE c.parent_id = w.id)`,
    [sprintId],
  );
  const r = rows[0];
  const itemCount = num(r?.item_count);
  const doneItemCount = num(r?.done_count);
  return {
    itemCount,
    doneItemCount,
    openItemCount: Math.max(0, itemCount - doneItemCount),
    currentPoints: num(r?.total_points),
    donePoints: num(r?.done_points),
  };
}

export interface SprintTotals {
  itemCount: number;
  doneItemCount: number;
  openItemCount: number;
  currentPoints: number;
  donePoints: number;
}

export const EMPTY_SPRINT_TOTALS: SprintTotals = {
  itemCount: 0,
  doneItemCount: 0,
  openItemCount: 0,
  currentPoints: 0,
  donePoints: 0,
};

/**
 * Leaf-item totals for a whole page of sprints in ONE query, so a sprint list
 * never fires N aggregate queries. The `?` placeholders are generated from the
 * id count — the ids themselves are always bound.
 */
export async function sprintTotalsFor(
  sprintIds: ReadonlyArray<string>,
): Promise<Map<string, SprintTotals>> {
  const out = new Map<string, SprintTotals>();
  if (sprintIds.length === 0) return out;

  const placeholders = sprintIds.map(() => "?").join(", ");
  const rows = await query<{
    sprint_id: string;
    item_count: number;
    done_count: number;
    total_points: number;
    done_points: number;
  }>(
    `SELECT w.sprint_id,
            COUNT(*) AS item_count,
            COALESCE(SUM(CASE WHEN w.status_category = 'done' THEN 1 ELSE 0 END), 0) AS done_count,
            COALESCE(SUM(w.story_points), 0) AS total_points,
            COALESCE(SUM(CASE WHEN w.status_category = 'done' THEN w.story_points ELSE 0 END), 0) AS done_points
       FROM work_items w
      WHERE w.sprint_id IN (${placeholders})
        AND NOT EXISTS (SELECT 1 FROM work_items c WHERE c.parent_id = w.id)
      GROUP BY w.sprint_id`,
    [...sprintIds],
  );

  for (const r of rows) {
    const itemCount = num(r.item_count);
    const doneItemCount = num(r.done_count);
    out.set(r.sprint_id, {
      itemCount,
      doneItemCount,
      openItemCount: Math.max(0, itemCount - doneItemCount),
      currentPoints: num(r.total_points),
      donePoints: num(r.done_points),
    });
  }
  return out;
}

/** Build the live metrics block returned next to a sprint. */
export function sprintMetrics(
  sprint: Pick<SprintDto, "committedPoints" | "capacityPoints">,
  totals: {
    itemCount: number;
    doneItemCount: number;
    openItemCount: number;
    currentPoints: number;
    donePoints: number;
  },
): SprintMetricsDto {
  const change = scopeChange(sprint.committedPoints, totals.currentPoints);
  return {
    itemCount: totals.itemCount,
    openItemCount: totals.openItemCount,
    doneItemCount: totals.doneItemCount,
    currentPoints: totals.currentPoints,
    donePoints: totals.donePoints,
    scopeChangePoints: change.delta,
    scopeChangePercent: change.percent,
    capacityUsedPercent: percentOf(totals.donePoints, sprint.capacityPoints),
  };
}

/**
 * Number of items in the sprint that are not done — the `close` gate. Counts
 * every row (not just leaves): an open parent still needs a decision.
 */
export async function openItemCount(sprintId: string): Promise<number> {
  const rows = await query<{ n: number }>(
    "SELECT COUNT(*) AS n FROM work_items WHERE sprint_id = ? AND status_category <> 'done'",
    [sprintId],
  );
  return num(rows[0]?.n);
}

/**
 * The per-person capacity panel for one sprint (spec: capacity is per PERSON).
 * Leaf items only, so subtask points are not counted twice.
 */
export async function capacityByAssignee(
  sprintId: string,
): Promise<CapacityBreakdownDto> {
  const sprintRows = await query<{ capacity_points: number }>(
    "SELECT capacity_points FROM sprints WHERE id = ?",
    [sprintId],
  );
  const capacity = num(sprintRows[0]?.capacity_points);

  const rows = await query<{
    assignee_id: string | null;
    assignee_name: string | null;
    assignee_initials: string | null;
    item_count: number;
    open_count: number;
    committed_points: number;
    completed_points: number;
  }>(
    `SELECT w.assignee_id,
            u.name AS assignee_name,
            u.initials AS assignee_initials,
            COUNT(*) AS item_count,
            COALESCE(SUM(CASE WHEN w.status_category <> 'done' THEN 1 ELSE 0 END), 0) AS open_count,
            COALESCE(SUM(w.story_points), 0) AS committed_points,
            COALESCE(SUM(CASE WHEN w.status_category = 'done' THEN w.story_points ELSE 0 END), 0) AS completed_points
       FROM work_items w
       LEFT JOIN app_users u ON u.id = w.assignee_id
      WHERE w.sprint_id = ?
        AND NOT EXISTS (SELECT 1 FROM work_items c WHERE c.parent_id = w.id)
      GROUP BY w.assignee_id, u.name, u.initials
      ORDER BY (w.assignee_id IS NULL) ASC, u.name ASC`,
    [sprintId],
  );

  return capacityBreakdown(
    capacity,
    rows.map((r) => ({
      assigneeId: r.assignee_id,
      assigneeName: strOrNull(r.assignee_name),
      assigneeInitials: strOrNull(r.assignee_initials),
      itemCount: num(r.item_count),
      openItemCount: num(r.open_count),
      committedPoints: num(r.committed_points),
      completedPoints: num(r.completed_points),
    })),
  );
}

// ---------------------------------------------------------------------------
// DB: writes
// ---------------------------------------------------------------------------

/** Columns a sprint CAS update may set (the injection barrier — see workItems). */
const UPDATABLE_COLUMNS: ReadonlySet<string> = new Set([
  "name",
  "goal",
  "start_date",
  "end_date",
  "status",
  "capacity_points",
  "committed_points",
  "completed_points",
  "cadence_weeks",
]);

export interface CasResult {
  ok: boolean;
  currentVersion: number;
}

/** Compare-and-swap update on `sprints.version` (409 VERSION_CONFLICT on miss). */
export async function casUpdateSprint(
  id: string,
  expectedVersion: number,
  sets: Readonly<Record<string, unknown>>,
  updatedBy: string,
): Promise<CasResult> {
  const cols = Object.keys(sets).filter((c) => UPDATABLE_COLUMNS.has(c));
  const assignments = cols.map((c) => `\`${c}\` = ?`);
  const params: unknown[] = cols.map((c) => sets[c]);

  assignments.push(
    "`updated_by` = ?",
    "`updated_at` = CURRENT_TIMESTAMP",
    "`version` = `version` + 1",
  );
  params.push(updatedBy, id, expectedVersion);

  const res = await execute(
    `UPDATE sprints SET ${assignments.join(", ")} WHERE id = ? AND version = ?`,
    params,
  );
  if (res.affectedRows > 0) return { ok: true, currentVersion: expectedVersion + 1 };

  const rows = await query<{ version: number }>(
    "SELECT version FROM sprints WHERE id = ?",
    [id],
  );
  return { ok: false, currentVersion: num(rows[0]?.version) };
}

/**
 * Move every unfinished item out of `sprintId` into `targetSprintId`
 * (`null` = back to the backlog). Returns how many items moved.
 *
 * The items' own `version` is bumped so any client holding one of them refetches
 * instead of writing over the move.
 */
export async function carryOverItems(
  sprintId: string,
  targetSprintId: string | null,
  updatedBy: string,
): Promise<number> {
  const res = await execute(
    `UPDATE work_items
        SET sprint_id = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP,
            version = version + 1
      WHERE sprint_id = ? AND status_category <> 'done'`,
    [targetSprintId, updatedBy, sprintId],
  );
  return num(res.affectedRows);
}

/** Ids of the unfinished items in a sprint — audited alongside a carry-over. */
export async function openItemIds(sprintId: string): Promise<string[]> {
  const rows = await query<{ id: string }>(
    "SELECT id FROM work_items WHERE sprint_id = ? AND status_category <> 'done' ORDER BY rank_value ASC",
    [sprintId],
  );
  return rows.map((r) => r.id);
}
