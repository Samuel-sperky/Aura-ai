// The Prehľad (`/`) aggregate read — everything the dashboard shows, in ONE
// server round trip.
//
// WHY IT EXISTS: the screen used to fan out to seven list endpoints. Rate-limit
// buckets are keyed by CLIENT IP, so a whole team behind one NAT address shares a
// single bucket; seven requests per screen drained it seven times as fast and the
// dashboard then rendered "Údaje sa nepodarilo načítať" everywhere — a throttle
// that looks exactly like a data bug. Raising the limits treated the symptom;
// this module removes the cause.
//
// ONE HTTP REQUEST, NOT ONE SQL QUERY (deliberate):
//   * the project list and the checkpoint queue go through the EXISTING readers
//     (`listProjects`, `listCheckpoints`), so the dashboard can never drift from
//     `/api/projects` and `/api/checkpoints` — same filters, same ordering, same
//     DTOs. Re-implementing their SQL here would be the real risk.
//   * the two KPI counters that need no rows share ONE `SELECT` of two scalar
//     subqueries; the sprint tile is one query for the two numbers it shows.
//   * the reads run SEQUENTIALLY. The pool holds 10 connections, so a five-way
//     `Promise.all` per request would let two concurrent dashboards exhaust it
//     and start timing out on `acquireTimeout`. Every query here is an indexed
//     read at the 50-project / 5 000-item target scale.
//
// RIGHTS: the route is `auth: "user"`, so this module — not the pipeline — is
// what keeps a caller from reading around a denied page. Each block is fetched
// only when the caller holds the right its own endpoint requires, and a missing
// right yields an EMPTY block, never a 403: the dashboard has to work for an
// Editor and a Prehliadač, not only for an admin (`audit.read` is admin-only).
//
// The six KPI tiles are computed by PURE functions over the fetched rows plus the
// aggregate counts (`computeKpis`) — that is where the boundaries worth testing
// live: no projects at all, an active sprint with no planned capacity, an item
// due exactly today.

import { query } from "@/lib/db";
import { AUDIT_META_KEY } from "@/lib/auth/audit";
import { includesRight } from "@/lib/auth/rights";
import { isoOrNull, num, strOrNull, toPagination } from "./data";
import { listProjects } from "./projects";
import { listCheckpoints, poolRunner, todayLocalDate, viewerOf } from "./checkpoints";
import { percentOf } from "./workItems";
import type { CheckpointListQuery } from "./contracts/checkpoints";
import type { ProjectDto } from "./contracts/projects";
import type {
  OverviewActivityDto,
  OverviewDoneItemDto,
  OverviewDto,
  OverviewKpisDto,
} from "./contracts/overview";

// ---------------------------------------------------------------------------
// Limits — the sizes the dashboard has always asked for
// ---------------------------------------------------------------------------

/** Every project: 50 is the target scale, so the block is not paginated. */
export const OVERVIEW_PROJECT_LIMIT = 200;
/** The decision queue. The panel renders the first few; the KPI needs the total. */
export const OVERVIEW_CHECKPOINT_LIMIT = 200;
/** How many done items to scan for the 12-week chart (newest change first). */
export const OVERVIEW_DONE_SCAN_LIMIT = 2000;
/** Rows in the activity panel. */
export const OVERVIEW_ACTIVITY_ROWS = 10;

/** Rights gating the individual blocks (each mirrors its own list endpoint). */
const RIGHT_PROJECTS = "projects.read";
const RIGHT_CHECKPOINTS = "checkpoints.read";
const RIGHT_WORK_ITEMS = "work_items.read";
const RIGHT_AUDIT = "audit.read";

/**
 * Who is asking. An `AppUser` satisfies it; the shape is spelled out structurally
 * (same reason as `checkpoints.viewerOf`) so this module keeps no runtime
 * dependency on the RBAC loader — and therefore none on `next/headers`.
 */
export interface OverviewActor {
  id: string;
  /** EFFECTIVE rights, already expanded (`admin` satisfies everything). */
  rights: ReadonlyArray<string>;
}

// ---------------------------------------------------------------------------
// Pure rules behind the KPI tiles
// ---------------------------------------------------------------------------

/**
 * A project counts as ACTIVE unless it is still merely planned. Mirrors
 * `lib/client/domain.isActiveProject`, which cannot be imported here: it lives in
 * a client module that pulls in `lucide-react` and the UI kit.
 */
export function isActiveProjectStatus(status: string): boolean {
  return status !== "planned";
}

/** Health that needs attention — the "projekty v riziku" tile. */
export function isAtRiskHealth(health: string): boolean {
  return health === "red" || health === "amber";
}

/**
 * A cutoff no real due date can reach, used when `today` is unparseable. Fails
 * CLOSED on purpose: a made-up "po termíne" number in a CEO report is worse than
 * a zero.
 */
const NO_OVERDUE_CUTOFF = "0001-01-01";

/**
 * The inclusive upper bound for "po termíne": YESTERDAY.
 *
 * The count compares `due_date <= cutoff`, so an item due exactly TODAY is not
 * late yet — it still has the day to be finished. Arithmetic runs on the UTC
 * midnight of a civil date, so a DST boundary cannot shift the day.
 */
export function overdueCutoff(today: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) return NO_OVERDUE_CUTOFF;
  const ms = Date.parse(`${today}T00:00:00Z`);
  if (Number.isNaN(ms)) return NO_OVERDUE_CUTOFF;
  return new Date(ms - 86_400_000).toISOString().slice(0, 10);
}

/** Clamp a driver-supplied count to the non-negative integer the DTO promises. */
function count(v: unknown): number {
  const n = Math.trunc(num(v));
  return n > 0 ? n : 0;
}

/** Everything the six tiles are computed from. */
export interface OverviewKpiInput {
  /** The fetched project rows (empty when the caller may not read projects). */
  projects: ReadonlyArray<Pick<ProjectDto, "status" | "health">>;
  /** Total size of the decision queue, not of the fetched page. */
  openCheckpointCount: number;
  /** Undecided checkpoints where the caller is the approver. */
  myDecisionCount: number;
  /** Open items whose due date has passed. */
  overdueItemCount: number;
  /** The running sprint's raw numbers, or null when none is active. */
  activeSprint: {
    name: string;
    /** Story points of the DONE leaf items in the sprint. */
    donePoints: number;
    /** Planned capacity; 0 means "nobody planned any". */
    capacityPoints: number;
  } | null;
}

/**
 * The six tiles. Pure: same input, same numbers, no clock and no DB.
 *
 * The capacity share goes through the same `percentOf` the sprint page uses, so
 * the tile can never disagree with the sprint detail — and an unplanned capacity
 * of 0 reads as 0 %, not as `NaN` or `Infinity`.
 */
export function computeKpis(input: OverviewKpiInput): OverviewKpisDto {
  let activeProjects = 0;
  let projectsAtRisk = 0;
  for (const project of input.projects) {
    if (isActiveProjectStatus(project.status)) activeProjects += 1;
    if (isAtRiskHealth(project.health)) projectsAtRisk += 1;
  }

  const sprint = input.activeSprint;
  return {
    activeProjects,
    projectsAtRisk,
    openCheckpoints: count(input.openCheckpointCount),
    myDecisions: count(input.myDecisionCount),
    sprintName: sprint ? sprint.name : null,
    sprintCapacityUsedPercent: sprint
      ? percentOf(sprint.donePoints, sprint.capacityPoints)
      : null,
    overdueItems: count(input.overdueItemCount),
  };
}

// ---------------------------------------------------------------------------
// Row mapping
// ---------------------------------------------------------------------------

/** The slim done-item row feeding the chart. */
interface DoneItemRow {
  id: string;
  updated_at: unknown;
  story_points: unknown;
}

/**
 * Story points as stored on the row. Same coercion as `workItems.toWorkItemDto`
 * applies to `ownStoryPoints`: a negative or non-numeric value reads as 0.
 */
function ownPoints(v: unknown): number {
  const n = Math.trunc(num(v));
  return n > 0 ? n : 0;
}

function toDoneItem(row: DoneItemRow): OverviewDoneItemDto {
  return {
    id: row.id,
    updatedAt: isoOrNull(row.updated_at),
    ownStoryPoints: ownPoints(row.story_points),
  };
}

/** The `audit_log` columns the activity panel needs. */
interface ActivityRow {
  id: number | string;
  username: string | null;
  action: string;
  entity: string | null;
  entity_id: string | null;
  ts: Date | string | null;
  new_values: unknown;
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

/**
 * The human note stashed at `new_values.__audit.detail` (see lib/auth/audit.ts —
 * `audit_log` has no column for it). Anything else in the envelope stays out of
 * the dashboard payload.
 */
function detailOf(newValues: unknown): string | null {
  const parsed = parseJson(newValues);
  if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }
  const envelope = (parsed as Record<string, unknown>)[AUDIT_META_KEY];
  if (envelope == null || typeof envelope !== "object" || Array.isArray(envelope)) {
    return null;
  }
  const detail = (envelope as Record<string, unknown>).detail;
  return typeof detail === "string" ? detail : null;
}

function toActivity(row: ActivityRow): OverviewActivityDto {
  return {
    id: String(row.id),
    userEmail: strOrNull(row.username),
    action: row.action,
    entity: strOrNull(row.entity),
    entityId: strOrNull(row.entity_id),
    ts: isoOrNull(row.ts),
    detail: detailOf(row.new_values),
  };
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/**
 * The two counters that need no rows, in one round trip.
 *
 * Both mirror the COUNT their own list endpoint runs: the decision queue is
 * `lifecycle <> 'decided'` joined to `projects` exactly as `/api/checkpoints`
 * counts it, and the overdue count is `/api/work-items?openOnly=1&dueBefore=…`.
 */
async function loadCounters(
  actorId: string,
  cutoff: string,
  can: { checkpoints: boolean; workItems: boolean },
): Promise<{ myDecisionCount: number; overdueItemCount: number }> {
  if (!can.checkpoints && !can.workItems) {
    return { myDecisionCount: 0, overdueItemCount: 0 };
  }

  const rows = await query<{ my_decisions: unknown; overdue_items: unknown }>(
    `SELECT
       (SELECT COUNT(*)
          FROM checkpoints c
          JOIN projects p ON p.id = c.project_id
         WHERE c.lifecycle <> 'decided'
           AND c.approver_id = ?)          AS my_decisions,
       (SELECT COUNT(*)
          FROM work_items w
         WHERE w.status_category <> 'done'
           AND w.due_date IS NOT NULL
           AND w.due_date <= ?)            AS overdue_items`,
    [actorId, cutoff],
  );

  const row = rows[0];
  return {
    myDecisionCount: can.checkpoints ? count(row?.my_decisions) : 0,
    overdueItemCount: can.workItems ? count(row?.overdue_items) : 0,
  };
}

/**
 * The active sprint's two tile numbers in one query: its name and the leaf-item
 * done points against its planned capacity.
 *
 * `NOT EXISTS (child)` drops the parents so a parent and its subtasks in the same
 * sprint are counted once — the same leaf-only rule as `sprints.sprintTotalsFor`.
 * The ORDER BY reproduces `/api/sprints?status=active`, whose first row is the one
 * the dashboard has always shown.
 */
async function loadActiveSprint(): Promise<OverviewKpiInput["activeSprint"]> {
  const rows = await query<{
    name: string;
    capacity_points: unknown;
    done_points: unknown;
  }>(
    `SELECT s.name, s.capacity_points,
            (SELECT COALESCE(SUM(CASE WHEN w.status_category = 'done'
                                      THEN w.story_points ELSE 0 END), 0)
               FROM work_items w
              WHERE w.sprint_id = s.id
                AND NOT EXISTS (SELECT 1 FROM work_items c WHERE c.parent_id = w.id)
            ) AS done_points
       FROM sprints s
      WHERE s.status = 'active'
      ORDER BY s.start_date ASC, s.id ASC
      LIMIT 1`,
  );

  const row = rows[0];
  if (!row) return null;
  return {
    name: String(row.name ?? ""),
    donePoints: num(row.done_points),
    capacityPoints: num(row.capacity_points),
  };
}

/**
 * Done items for the chart, newest change first. Deliberately NOT windowed to the
 * last 12 weeks in SQL: the window belongs to the client (`weeks.weekStarts`), and
 * a second, server-side definition of "which weeks" would be free to drift from it.
 */
async function loadDoneItems(): Promise<OverviewDoneItemDto[]> {
  const rows = await query<DoneItemRow>(
    `SELECT w.id, w.updated_at, w.story_points
       FROM work_items w
      WHERE w.status = 'done'
      ORDER BY w.updated_at DESC, w.id ASC
      LIMIT ?`,
    [OVERVIEW_DONE_SCAN_LIMIT],
  );
  return rows.map(toDoneItem);
}

/** The newest audit rows. Only ever called for a holder of `audit.read`. */
async function loadActivity(): Promise<OverviewActivityDto[]> {
  const rows = await query<ActivityRow>(
    `SELECT id, username, action, entity, entity_id, ts, new_values
       FROM audit_log
      ORDER BY ts DESC, id DESC
      LIMIT ?`,
    [OVERVIEW_ACTIVITY_ROWS],
  );
  return rows.map(toActivity);
}

/** The decision queue, exactly as `/api/checkpoints?queue=1&sort=dueDate&dir=asc`. */
const CHECKPOINT_QUEUE_QUERY: CheckpointListQuery = {
  page: 1,
  pageSize: OVERVIEW_CHECKPOINT_LIMIT,
  queue: "1",
  sort: "dueDate",
  dir: "asc",
};

// ---------------------------------------------------------------------------
// The aggregate
// ---------------------------------------------------------------------------

/**
 * Everything `/` renders, in one call.
 *
 * @param actor the authenticated caller (an `AppUser` fits)
 * @param opts  `today` is injectable so the overdue boundary is testable; it
 *              defaults to the server's local day, the same day the checkpoint
 *              rows are aged against.
 */
export async function getOverview(
  actor: OverviewActor,
  opts: { today?: string } = {},
): Promise<OverviewDto> {
  const today = opts.today ?? todayLocalDate();
  const can = {
    projects: includesRight(actor.rights, RIGHT_PROJECTS),
    checkpoints: includesRight(actor.rights, RIGHT_CHECKPOINTS),
    workItems: includesRight(actor.rights, RIGHT_WORK_ITEMS),
    audit: includesRight(actor.rights, RIGHT_AUDIT),
  };

  const projects = can.projects
    ? await listProjects(
        { sort: "risk", dir: "asc" },
        toPagination(1, OVERVIEW_PROJECT_LIMIT),
      )
    : { items: [], total: 0 };

  const queue = can.checkpoints
    ? await listCheckpoints(poolRunner, CHECKPOINT_QUEUE_QUERY, viewerOf(actor))
    : { items: [], total: 0 };

  const counters = await loadCounters(actor.id, overdueCutoff(today), can);
  const activeSprint = can.workItems ? await loadActiveSprint() : null;
  const doneItems = can.workItems ? await loadDoneItems() : [];
  // Not merely filtered out afterwards: without the right the query is never
  // sent, so a Prehliadač's network log stays free of a 403-shaped read.
  const activity = can.audit ? await loadActivity() : [];

  return {
    kpis: computeKpis({
      projects: projects.items,
      openCheckpointCount: queue.total,
      myDecisionCount: counters.myDecisionCount,
      overdueItemCount: counters.overdueItemCount,
      activeSprint,
    }),
    projects: projects.items,
    openCheckpoints: queue.items,
    doneItems,
    activity,
  };
}
