// Projects data layer — every read and write of the `projects` table.
//
// Ported from the source app's `app/api/projects/*` + `lib/server/workspace.ts`,
// with the source's edge SQLite runtime replaced by parameterized MariaDB through
// `lib/db.ts`. Business rules that survived the port: the project shape, the
// per-project checkpoint pointer, the audit trail on every write. Rules the port
// ADDED: computed `progress`, computed `next_checkpoint*`, optimistic
// concurrency, hard delete (the source soft-deleted).
//
// ---------------------------------------------------------------------------
// THREE RULES WORTH KNOWING BEFORE EDITING
// ---------------------------------------------------------------------------
//
// 1. DATE COLUMNS CROSS THE WIRE AS STRINGS, FORMATTED IN SQL.
//    The driver hands a DATE back as a JS `Date` at LOCAL midnight. In
//    Europe/Bratislava `new Date(2026,6,28).toISOString().slice(0,10)` is
//    "2026-07-27" — a silent one-day shift on every calendar value. Every DATE
//    column is therefore selected as `DATE_FORMAT(col, '%Y-%m-%d')` and mapped
//    with `strOrNull`, so no timezone ever touches a calendar date. DATETIME
//    columns (created_at/updated_at) are real instants and use `isoOrNull`.
//
// 2. `projects` HAS NO `version` COLUMN (contract §5.3 — `version` lives only on
//    checkpoints/sprints/work_items). The concurrency token is derived from the
//    row's last-write timestamp: `YYYYMMDDHHMMSS` as an integer. To make that a
//    SAFE token every user write bumps `updated_at` to
//    `GREATEST(CURRENT_TIMESTAMP, previous + INTERVAL 1 SECOND)`, which makes the
//    token STRICTLY increase even for two writes inside the same second — the
//    failure mode a plain `updated_at` comparison would have. The wire contract
//    is identical to the versioned tables: an integer `version` the client echoes
//    back, `409 VERSION_CONFLICT` + `currentVersion` on mismatch.
//
// 3. THE COMPUTED CACHES DELIBERATELY DO NOT TOUCH `updated_at`.
//    `recomputeProjectProgress` (and `refreshProjectNextCheckpoint` over in
//    checkpoints.ts) are triggered by changes to OTHER entities (a work item
//    moved to done, a checkpoint decided).
//    If they bumped the timestamp they would invalidate the concurrency token and
//    every open project edit form would get a spurious 409. The token tracks
//    USER edits of the project row only.

import { randomUUID } from "node:crypto";
import { execute, query } from "@/lib/db";
import { auditAs } from "@/lib/auth/audit";
import {
  escapeLike,
  isoOrNull,
  LIKE_ESCAPE_CLAUSE,
  num,
  pickSort,
  sortDir,
  strOrNull,
  type Pagination,
} from "@/lib/domain/data";
import type {
  AreaDto,
  Priority,
  ProjectActivityDto,
  ProjectCreateInput,
  ProjectDetailDto,
  ProjectDto,
  ProjectHealth,
  ProjectListQuery,
  ProjectStatsDto,
  ProjectStatus,
  ProjectUpdateFields,
} from "@/lib/domain/contracts/projects";
import { PROJECT_HEALTHS } from "@/lib/domain/contracts/projects";

// ---------------------------------------------------------------------------
// Actor
// ---------------------------------------------------------------------------

/** The minimum a caller must supply so writes can be attributed and audited. */
export interface Actor {
  id: string;
  email: string;
}

// ---------------------------------------------------------------------------
// Pure helpers — health, progress, ordering
// ---------------------------------------------------------------------------

/**
 * Risk-first health ranking used by the default list order (spec Q2): red is the
 * loudest, then amber, then grey (unknown is more concerning than fine), green
 * last. Kept in lock-step with `HEALTH_ORDER_SQL`.
 */
export const HEALTH_RANK: Readonly<Record<ProjectHealth, number>> = {
  red: 0,
  amber: 1,
  grey: 2,
  green: 3,
};

/** Rank of a possibly-unknown health value (unknown sorts with `grey`). */
export function healthRank(health: string): number {
  return HEALTH_RANK[health as ProjectHealth] ?? HEALTH_RANK.grey;
}

/** The SQL form of `HEALTH_RANK` — a literal CASE, never client input. */
const HEALTH_ORDER_SQL =
  "CASE p.health WHEN 'red' THEN 0 WHEN 'amber' THEN 1 WHEN 'grey' THEN 2 ELSE 3 END";

/**
 * Sort a project list risk-first: health rank, then the nearest checkpoint (rows
 * without one last), then priority, then code. This mirrors the SQL ORDER BY of
 * `sort=risk` and is what the Overview page uses when it sorts client-side.
 */
export function sortProjectsByRisk<
  T extends Pick<ProjectDto, "health" | "nextCheckpointDate" | "priority" | "code">,
>(projects: ReadonlyArray<T>): T[] {
  return [...projects].sort((a, b) => {
    const byHealth = healthRank(a.health) - healthRank(b.health);
    if (byHealth !== 0) return byHealth;

    // Missing next checkpoint sorts after any real date.
    const aDate = a.nextCheckpointDate;
    const bDate = b.nextCheckpointDate;
    if (aDate !== bDate) {
      if (!aDate) return 1;
      if (!bDate) return -1;
      return aDate < bDate ? -1 : 1;
    }
    if (a.priority !== b.priority) return a.priority < b.priority ? -1 : 1;
    return a.code < b.code ? -1 : a.code > b.code ? 1 : 0;
  });
}

/**
 * Percent of story points completed, 0–100. Returns 0 when there is nothing to
 * measure — a project with no items (or with items that all carry 0 points) is
 * 0 % done, never NaN.
 */
export function computeProgress(totalPoints: number, donePoints: number): number {
  if (!Number.isFinite(totalPoints) || totalPoints <= 0) return 0;
  const done = Number.isFinite(donePoints) ? Math.max(donePoints, 0) : 0;
  const pct = Math.round((done / totalPoints) * 100);
  return Math.min(Math.max(pct, 0), 100);
}

/** The date part of a `Date` in LOCAL time, as `YYYY-MM-DD`. */
function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * How much progress the calendar implies by `now`, as 0–100, or null when the
 * project has no date range to measure against.
 *
 * Compared as `YYYY-MM-DD` strings so the result depends on the calendar day,
 * not on the hour or the timezone offset.
 */
export function expectedProgress(
  startDate: string | null,
  endDate: string | null,
  now: Date = new Date(),
): number | null {
  if (!startDate || !endDate) return null;
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) return null;

  // An inverted range is invalid data (the zod contract rejects it on write, so
  // it can only come from a manual DB edit). There is no window to measure
  // against, so it reads as "no data" rather than as a verdict.
  if (end < start) return null;

  const today = Date.parse(`${localDateKey(now)}T00:00:00Z`);
  if (today <= start) return 0;
  if (today >= end) return 100;
  return ((today - start) / (end - start)) * 100;
}

/**
 * The health value the data SUGGESTS (spec Q18). `health` itself stays MANUAL —
 * the project owner knows things the numbers do not — so this is only ever
 * offered in the UI, never written by the server.
 *
 * Bands from contract §3.2/71, applied to progress vs the calendar expectation:
 *   green  ratio ≥ 100 %   ·   amber  60–99 %   ·   red  < 60 %   ·   grey  no dates
 * A project that has not started yet is `green`: nothing is due, nothing is late.
 */
export function suggestHealth(
  project: Pick<ProjectDto, "progress" | "startDate" | "endDate">,
  now: Date = new Date(),
): ProjectHealth {
  const expected = expectedProgress(project.startDate, project.endDate, now);
  if (expected === null) return "grey";
  if (expected <= 0) return "green";

  const ratio = num(project.progress) / expected;
  if (ratio >= 1) return "green";
  if (ratio >= 0.6) return "amber";
  return "red";
}

/** Initials for a free-text owner name ("Jana Kováčová" → "JK"), max 2 chars. */
export function ownerInitialsOf(owner: string): string {
  const parts = owner.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  const letters = parts.slice(0, 2).map((p) => [...p][0] ?? "");
  return letters.join("").toUpperCase().slice(0, 8);
}

// ---------------------------------------------------------------------------
// Row mapping
// ---------------------------------------------------------------------------

/** The `projects` row shape as ALIASED by `PROJECT_SELECT`. */
interface ProjectRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  area: string;
  status: string;
  health: string;
  progress: number;
  owner: string;
  owner_initials: string;
  /** Already `YYYY-MM-DD` — formatted in SQL, see rule 1. */
  start_date: string | null;
  end_date: string | null;
  priority: string;
  next_checkpoint: string | null;
  next_checkpoint_date: string | null;
  version_token: number;
  created_at: unknown;
  updated_at: unknown;
  created_by: string | null;
  updated_by: string | null;
}

/**
 * The concurrency token expression: the last-write DATETIME as the integer
 * `YYYYMMDDHHMMSS`. Timezone-free (pure digits of the stored wall clock) and
 * strictly monotonic with the timestamp. Must match `VERSION_TOKEN_SQL_BARE`.
 */
const VERSION_TOKEN_SQL =
  "CAST(DATE_FORMAT(COALESCE(p.updated_at, p.created_at), '%Y%m%d%H%i%s') AS UNSIGNED)";

/** Same expression without the table alias, for use inside an UPDATE ... WHERE. */
const VERSION_TOKEN_SQL_BARE =
  "CAST(DATE_FORMAT(COALESCE(updated_at, created_at), '%Y%m%d%H%i%s') AS UNSIGNED)";

/**
 * Every user write advances `updated_at` past its previous value, so the
 * concurrency token strictly increases even for two writes in the same second.
 * Costs at most a few seconds of clock drift on a burst of writes; buys real
 * conflict detection on a table without a `version` column.
 */
const BUMP_UPDATED_AT_SQL =
  "`updated_at` = GREATEST(CURRENT_TIMESTAMP, COALESCE(`updated_at`, `created_at`) + INTERVAL 1 SECOND)";

const PROJECT_SELECT = `
  SELECT p.id, p.code, p.name, p.description, p.area, p.status, p.health,
         p.progress, p.owner, p.owner_initials,
         DATE_FORMAT(p.start_date, '%Y-%m-%d') AS start_date,
         DATE_FORMAT(p.end_date, '%Y-%m-%d') AS end_date,
         p.priority, p.next_checkpoint,
         DATE_FORMAT(p.next_checkpoint_date, '%Y-%m-%d') AS next_checkpoint_date,
         ${VERSION_TOKEN_SQL} AS version_token,
         p.created_at, p.updated_at, p.created_by, p.updated_by
    FROM projects p`;

/** Narrow a stored status to the dictionary; unknown values read as `planned`. */
function asStatus(v: unknown): ProjectStatus {
  const s = String(v ?? "");
  return s === "on_track" || s === "at_risk" || s === "blocked" || s === "planned"
    ? s
    : "planned";
}

/** Narrow a stored health to the dictionary; unknown values read as `grey`. */
function asHealth(v: unknown): ProjectHealth {
  const s = String(v ?? "");
  return (PROJECT_HEALTHS as ReadonlyArray<string>).includes(s)
    ? (s as ProjectHealth)
    : "grey";
}

/** Narrow a stored priority; unknown values read as `P2`. */
function asPriority(v: unknown): Priority {
  const s = String(v ?? "");
  return s === "P1" || s === "P2" || s === "P3" ? s : "P2";
}

/** Map a DB row to the wire DTO. Pure — exported for the tests. */
export function mapProjectRow(row: ProjectRow): ProjectDto {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: strOrNull(row.description),
    area: String(row.area ?? ""),
    status: asStatus(row.status),
    health: asHealth(row.health),
    progress: num(row.progress),
    owner: String(row.owner ?? ""),
    ownerInitials: String(row.owner_initials ?? ""),
    startDate: strOrNull(row.start_date),
    endDate: strOrNull(row.end_date),
    priority: asPriority(row.priority),
    nextCheckpoint: strOrNull(row.next_checkpoint),
    nextCheckpointDate: strOrNull(row.next_checkpoint_date),
    version: Math.max(num(row.version_token), 1),
    createdAt: isoOrNull(row.created_at),
    updatedAt: isoOrNull(row.updated_at),
    createdBy: strOrNull(row.created_by),
    updatedBy: strOrNull(row.updated_by),
  };
}

// ---------------------------------------------------------------------------
// Read: list
// ---------------------------------------------------------------------------

/** ORDER BY allow-list. Client sort keys NEVER reach SQL unmapped. */
const SORT_COLUMNS: Readonly<Record<string, string>> = {
  code: "p.code",
  name: "p.name",
  area: "p.area",
  status: "p.status",
  health: HEALTH_ORDER_SQL,
  progress: "p.progress",
  priority: "p.priority",
  startDate: "p.start_date",
  endDate: "p.end_date",
  nextCheckpointDate: "p.next_checkpoint_date",
  updatedAt: "COALESCE(p.updated_at, p.created_at)",
};

/**
 * The default order (spec Q2): risk must be visible without sorting. Health
 * rank first, then the nearest checkpoint (NULL last), then priority, then code
 * as the stable tie-breaker.
 */
const RISK_ORDER_SQL = `${HEALTH_ORDER_SQL} ASC,
   p.next_checkpoint_date IS NULL ASC, p.next_checkpoint_date ASC,
   p.priority ASC, p.code ASC`;

/** Build the ORDER BY clause for a validated sort key. */
function orderByFor(sort: string | undefined, dir: string | undefined): string {
  if (!sort || sort === "risk") return RISK_ORDER_SQL;
  const column = pickSort(sort, SORT_COLUMNS, "");
  if (!column) return RISK_ORDER_SQL;
  // Stable secondary key so equal values keep a deterministic page order.
  return `${column} ${sortDir(dir)}, p.code ASC`;
}

/** WHERE fragment + params shared by the list query and its COUNT. */
function buildFilters(
  filters: Pick<ProjectListQuery, "area" | "status" | "priority" | "health" | "q">,
): { where: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.area) {
    conditions.push("p.area = ?");
    params.push(filters.area);
  }
  if (filters.status) {
    conditions.push("p.status = ?");
    params.push(filters.status);
  }
  if (filters.priority) {
    conditions.push("p.priority = ?");
    params.push(filters.priority);
  }
  if (filters.health) {
    conditions.push("p.health = ?");
    params.push(filters.health);
  }
  if (filters.q) {
    conditions.push(
      `(p.code LIKE ? ${LIKE_ESCAPE_CLAUSE}
        OR p.name LIKE ? ${LIKE_ESCAPE_CLAUSE}
        OR p.owner LIKE ? ${LIKE_ESCAPE_CLAUSE}
        OR p.area LIKE ? ${LIKE_ESCAPE_CLAUSE}
        OR p.description LIKE ? ${LIKE_ESCAPE_CLAUSE})`,
    );
    const like = `%${escapeLike(filters.q)}%`;
    params.push(like, like, like, like, like);
  }

  return {
    where: conditions.length ? ` WHERE ${conditions.join(" AND ")}` : "",
    params,
  };
}

export interface ProjectListResult {
  items: ProjectDto[];
  total: number;
}

/**
 * One page of projects plus the total row count for the pagination envelope.
 *
 * @example
 *   const pg = toPagination(q.page, q.pageSize);
 *   const { items, total } = await listProjects(q, pg);
 *   return jsonList(items, pageMeta(pg, total));
 */
export async function listProjects(
  filters: Pick<
    ProjectListQuery,
    "area" | "status" | "priority" | "health" | "q" | "sort" | "dir"
  >,
  pagination: Pagination,
): Promise<ProjectListResult> {
  const { where, params } = buildFilters(filters);

  const countRows = await query<{ n: number }>(
    `SELECT COUNT(*) AS n FROM projects p${where}`,
    params,
  );
  const total = num(countRows[0]?.n);

  const rows = await query<ProjectRow>(
    `${PROJECT_SELECT}${where}
      ORDER BY ${orderByFor(filters.sort, filters.dir)}
      LIMIT ? OFFSET ?`,
    [...params, pagination.limit, pagination.offset],
  );

  return { items: rows.map(mapProjectRow), total };
}

// ---------------------------------------------------------------------------
// Read: single
// ---------------------------------------------------------------------------

/** One project by id, or null when it does not exist. */
export async function getProject(id: string): Promise<ProjectDto | null> {
  const rows = await query<ProjectRow>(`${PROJECT_SELECT} WHERE p.id = ?`, [id]);
  return rows[0] ? mapProjectRow(rows[0]) : null;
}

/** One project by its unique code, or null. */
export async function getProjectByCode(code: string): Promise<ProjectDto | null> {
  const rows = await query<ProjectRow>(`${PROJECT_SELECT} WHERE p.code = ?`, [code]);
  return rows[0] ? mapProjectRow(rows[0]) : null;
}

// ---------------------------------------------------------------------------
// Areas
// ---------------------------------------------------------------------------

/**
 * The distinct areas in use, with a project count each. There is no `areas`
 * table on purpose (contract Q52): an area exists exactly as long as a project
 * carries it, so the filter list can never drift from reality.
 */
export async function listAreas(): Promise<AreaDto[]> {
  const rows = await query<{ area: string; n: number }>(
    `SELECT p.area AS area, COUNT(*) AS n
       FROM projects p
      WHERE p.area <> ''
      GROUP BY p.area
      ORDER BY p.area ASC`,
  );
  return rows.map((r) => ({ name: String(r.area), projectCount: num(r.n) }));
}

// ---------------------------------------------------------------------------
// Computed caches
// ---------------------------------------------------------------------------

/**
 * Recompute and store `projects.progress` — the share of the project's story
 * points that sit on `done` items (spec Q17).
 *
 * ONLY LEAF ITEMS COUNT. A parent's points are the sum of its children
 * (spec Q26), so counting parents as well would double-count the same work. The
 * hierarchy is at most two levels deep, so "leaf" = "has no children".
 *
 * Call this after ANY change to a work item's `status`, `story_points`,
 * `parent_id` or `project_id`, and after creating/deleting an item.
 *
 * Deliberately does NOT touch `updated_at` (see rule 3 in the module header).
 *
 * @returns the freshly stored progress (0–100).
 */
export async function recomputeProjectProgress(projectId: string): Promise<number> {
  const rows = await query<{ total_points: number; done_points: number }>(
    `SELECT COALESCE(SUM(w.story_points), 0) AS total_points,
            COALESCE(SUM(CASE WHEN w.status = 'done' THEN w.story_points ELSE 0 END), 0)
              AS done_points
       FROM work_items w
      WHERE w.project_id = ?
        AND NOT EXISTS (
              SELECT 1 FROM work_items c WHERE c.parent_id = w.id
            )`,
    [projectId],
  );

  const progress = computeProgress(
    num(rows[0]?.total_points),
    num(rows[0]?.done_points),
  );
  await execute("UPDATE projects SET `progress` = ? WHERE `id` = ?", [
    progress,
    projectId,
  ]);
  return progress;
}

// The `next_checkpoint` / `next_checkpoint_date` cache is refreshed by
// `refreshProjectNextCheckpoint(runner, projectId)` in @/lib/domain/checkpoints.
// It is NOT duplicated here: every write that can change the nearest undecided
// checkpoint (create, update, delete, decide, reopen) is transactional, and a
// pool-based twin would run on a different connection, miss the uncommitted
// change and cache pre-transaction state. One implementation, taking the
// transaction's runner, is the only correct shape — `poolRunner` covers the
// non-transactional callers.

// ---------------------------------------------------------------------------
// Write: create
// ---------------------------------------------------------------------------

export type CreateProjectResult =
  | { ok: true; project: ProjectDto }
  | { ok: false; reason: "duplicate_code" };

/**
 * True for a MariaDB duplicate-key violation (`uq_projects_code`). The explicit
 * "is this code taken?" SELECT is a nicer message, but two requests can pass it
 * at the same time — the constraint is the real guard, so its error is mapped to
 * the same 409 instead of leaking as a 500.
 */
function isDuplicateKeyError(err: unknown): boolean {
  if (err == null || typeof err !== "object") return false;
  const e = err as { errno?: number; code?: string };
  return e.errno === 1062 || e.code === "ER_DUP_ENTRY";
}

/**
 * Insert a project and audit it. `progress` and the checkpoint cache keep their
 * column defaults — a brand new project has neither items nor checkpoints.
 */
export async function createProject(
  input: ProjectCreateInput,
  actor: Actor,
): Promise<CreateProjectResult> {
  const existing = await query<{ id: string }>(
    "SELECT id FROM projects WHERE code = ?",
    [input.code],
  );
  if (existing.length > 0) return { ok: false, reason: "duplicate_code" };

  const id = randomUUID();
  const owner = input.owner ?? "";
  const ownerInitials = input.ownerInitials?.trim()
    ? input.ownerInitials.trim()
    : ownerInitialsOf(owner);

  try {
    await execute(
      `INSERT INTO projects
         (\`id\`, \`code\`, \`name\`, \`description\`, \`area\`, \`status\`, \`health\`,
          \`owner\`, \`owner_initials\`, \`start_date\`, \`end_date\`, \`priority\`,
          \`created_by\`)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.code,
        input.name,
        input.description ?? null,
        input.area ?? "",
        input.status,
        input.health,
        owner,
        ownerInitials,
        input.startDate ?? null,
        input.endDate ?? null,
        input.priority,
        actor.id,
      ],
    );
  } catch (err) {
    if (isDuplicateKeyError(err)) return { ok: false, reason: "duplicate_code" };
    throw err;
  }

  const created = await getProject(id);
  if (!created) {
    // Unreachable unless the row vanished between INSERT and SELECT. Surfacing it
    // as a 500 is honest; reporting it as a duplicate code would be a lie.
    throw new Error(`Project ${id} disappeared right after it was inserted.`);
  }

  await auditAs(actor, {
    action: "project.create",
    entity: "projects",
    entityId: id,
    severity: "success",
    newValues: created,
  });

  return { ok: true, project: created };
}

// ---------------------------------------------------------------------------
// Write: update (optimistic concurrency)
// ---------------------------------------------------------------------------

/** Editable field → column. The ONLY source of column names for the SET list. */
const PATCH_COLUMNS: Readonly<Record<keyof ProjectUpdateFields, string>> = {
  code: "code",
  name: "name",
  description: "description",
  area: "area",
  status: "status",
  health: "health",
  owner: "owner",
  ownerInitials: "owner_initials",
  startDate: "start_date",
  endDate: "end_date",
  priority: "priority",
};

/** Columns declared NOT NULL DEFAULT '' — a null from the client becomes ''. */
const NOT_NULL_TEXT_COLUMNS = new Set(["area", "owner", "owner_initials"]);

export type UpdateProjectResult =
  | { ok: true; project: ProjectDto }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "conflict"; currentVersion: number }
  | { ok: false; reason: "duplicate_code" };

/**
 * Update a project under optimistic concurrency, with DOUBLE protection:
 *   1. the caller's `version` is compared against the freshly read row, and
 *   2. the UPDATE itself is a compare-and-swap (`WHERE id = ? AND <token> = ?`),
 *      so a writer that slipped in between the read and the write also loses.
 * Either failure returns `{ reason: "conflict", currentVersion }` and the route
 * turns that into `versionConflict(currentVersion)`.
 *
 * When `owner` changes without an explicit `ownerInitials`, the initials are
 * re-derived — stale initials next to a new owner name is the worse default.
 */
export async function updateProject(
  id: string,
  fields: ProjectUpdateFields,
  version: number,
  actor: Actor,
): Promise<UpdateProjectResult> {
  const current = await getProject(id);
  if (!current) return { ok: false, reason: "not_found" };
  if (current.version !== version) {
    return { ok: false, reason: "conflict", currentVersion: current.version };
  }

  if (fields.code && fields.code !== current.code) {
    const clash = await query<{ id: string }>(
      "SELECT id FROM projects WHERE code = ? AND id <> ?",
      [fields.code, id],
    );
    if (clash.length > 0) return { ok: false, reason: "duplicate_code" };
  }

  // Re-derive initials when the owner changed and none were supplied.
  const patch: ProjectUpdateFields = { ...fields };
  if (
    patch.owner !== undefined &&
    patch.owner !== current.owner &&
    patch.ownerInitials === undefined
  ) {
    patch.ownerInitials = ownerInitialsOf(patch.owner);
  }

  const sets: string[] = [];
  const params: unknown[] = [];
  for (const key of Object.keys(PATCH_COLUMNS) as Array<
    keyof ProjectUpdateFields
  >) {
    const value = patch[key];
    if (value === undefined) continue;
    const column = PATCH_COLUMNS[key];
    sets.push(`\`${column}\` = ?`);
    params.push(
      value === null && NOT_NULL_TEXT_COLUMNS.has(column) ? "" : value,
    );
  }
  if (sets.length === 0) return { ok: true, project: current };

  sets.push("`updated_by` = ?");
  params.push(actor.id);
  sets.push(BUMP_UPDATED_AT_SQL);

  let result;
  try {
    result = await execute(
      `UPDATE projects SET ${sets.join(", ")}
        WHERE \`id\` = ? AND ${VERSION_TOKEN_SQL_BARE} = ?`,
      [...params, id, version],
    );
  } catch (err) {
    if (isDuplicateKeyError(err)) return { ok: false, reason: "duplicate_code" };
    throw err;
  }

  if (result.affectedRows === 0) {
    // Lost the race after the read: report the version that actually won.
    const fresh = await getProject(id);
    if (!fresh) return { ok: false, reason: "not_found" };
    return { ok: false, reason: "conflict", currentVersion: fresh.version };
  }

  const updated = await getProject(id);
  if (!updated) return { ok: false, reason: "not_found" };

  await auditAs(actor, {
    action: "project.update",
    entity: "projects",
    entityId: id,
    severity: "info",
    oldValues: current,
    newValues: updated,
  });

  return { ok: true, project: updated };
}

// ---------------------------------------------------------------------------
// Write: delete
// ---------------------------------------------------------------------------

export type DeleteProjectResult =
  | { ok: true; project: ProjectDto }
  | { ok: false; reason: "not_found" };

/**
 * HARD delete (soft delete was removed from the contract, §3.2/21). The FKs
 * cascade to checkpoints, checkpoint requirements/decisions, sprints, work
 * items, comments, dependencies and worklogs — so the `audit_log` row written
 * here, with the full pre-delete state in `oldValues`, is the ONLY record that
 * the project ever existed. It is written before the DELETE for that reason.
 *
 * Guarded by the admin-only right `projects.delete` at the route.
 */
export async function deleteProject(
  id: string,
  actor: Actor,
): Promise<DeleteProjectResult> {
  const current = await getProject(id);
  if (!current) return { ok: false, reason: "not_found" };

  // Count what the cascade is about to take with it, for the audit trail.
  const counts = await query<{
    work_items: number;
    checkpoints: number;
    sprints: number;
  }>(
    `SELECT
       (SELECT COUNT(*) FROM work_items WHERE project_id = ?) AS work_items,
       (SELECT COUNT(*) FROM checkpoints WHERE project_id = ?) AS checkpoints,
       (SELECT COUNT(*) FROM sprints    WHERE project_id = ?) AS sprints`,
    [id, id, id],
  );

  await auditAs(actor, {
    action: "project.delete",
    entity: "projects",
    entityId: id,
    severity: "critical",
    oldValues: current,
    detail: `Zmazaný projekt ${current.code} — ${current.name}`,
    meta: {
      cascade: {
        workItems: num(counts[0]?.work_items),
        checkpoints: num(counts[0]?.checkpoints),
        sprints: num(counts[0]?.sprints),
      },
    },
  });

  const result = await execute("DELETE FROM projects WHERE `id` = ?", [id]);
  if (result.affectedRows === 0) return { ok: false, reason: "not_found" };
  return { ok: true, project: current };
}

// ---------------------------------------------------------------------------
// Detail aggregates (the four tabs of the project modal, spec Q22)
// ---------------------------------------------------------------------------

/** Zero-filled counter map for a fixed dictionary. */
function zeroCounts<K extends string>(keys: ReadonlyArray<K>): Record<K, number> {
  return Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;
}

const WORK_ITEM_STATUSES = ["backlog", "in_progress", "waiting", "done"] as const;
const WORK_ITEM_TYPES = ["task", "bug", "idea"] as const;
const CHECKPOINT_LIFECYCLES = ["planned", "ready", "decided", "blocked"] as const;
const DECISION_OUTCOMES = ["go", "conditional_go", "no_go", "deferred"] as const;

/**
 * The aggregates the detail modal needs. The tabs "Položky" and "Checkpointy"
 * fetch their own ROWS from `/api/work-items` and `/api/checkpoints` (A5/A6 own
 * those); this endpoint only supplies the counts that head each tab, so the
 * modal can render its chrome in one round-trip.
 */
export async function getProjectStats(
  projectId: string,
): Promise<ProjectStatsDto> {
  const [itemRows, pointRows, minuteRows, checkpointRows, sprintRows, decisionRows] =
    await Promise.all([
      query<Record<string, number>>(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN w.status = 'backlog'     THEN 1 ELSE 0 END) AS st_backlog,
                SUM(CASE WHEN w.status = 'in_progress' THEN 1 ELSE 0 END) AS st_in_progress,
                SUM(CASE WHEN w.status = 'waiting'     THEN 1 ELSE 0 END) AS st_waiting,
                SUM(CASE WHEN w.status = 'done'        THEN 1 ELSE 0 END) AS st_done,
                SUM(CASE WHEN w.item_type = 'task' THEN 1 ELSE 0 END) AS ty_task,
                SUM(CASE WHEN w.item_type = 'bug'  THEN 1 ELSE 0 END) AS ty_bug,
                SUM(CASE WHEN w.item_type = 'idea' THEN 1 ELSE 0 END) AS ty_idea,
                SUM(CASE WHEN w.status <> 'done' AND w.due_date IS NOT NULL
                          AND w.due_date < CURDATE() THEN 1 ELSE 0 END) AS overdue
           FROM work_items w
          WHERE w.project_id = ?`,
        [projectId],
      ),
      // Leaf-only, so the numbers agree with `recomputeProjectProgress`.
      query<{ total_points: number; done_points: number }>(
        `SELECT COALESCE(SUM(w.story_points), 0) AS total_points,
                COALESCE(SUM(CASE WHEN w.status = 'done' THEN w.story_points ELSE 0 END), 0)
                  AS done_points
           FROM work_items w
          WHERE w.project_id = ?
            AND NOT EXISTS (SELECT 1 FROM work_items c WHERE c.parent_id = w.id)`,
        [projectId],
      ),
      query<{ minutes: number }>(
        "SELECT COALESCE(SUM(minutes), 0) AS minutes FROM worklogs WHERE project_id = ?",
        [projectId],
      ),
      query<Record<string, number | string | null>>(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN c.lifecycle = 'planned' THEN 1 ELSE 0 END) AS lc_planned,
                SUM(CASE WHEN c.lifecycle = 'ready'   THEN 1 ELSE 0 END) AS lc_ready,
                SUM(CASE WHEN c.lifecycle = 'decided' THEN 1 ELSE 0 END) AS lc_decided,
                SUM(CASE WHEN c.lifecycle = 'blocked' THEN 1 ELSE 0 END) AS lc_blocked,
                COALESCE(ROUND(AVG(c.readiness)), 0) AS avg_readiness,
                DATE_FORMAT(
                  MIN(CASE WHEN c.lifecycle <> 'decided' THEN c.due_date END),
                  '%Y-%m-%d'
                ) AS next_due
           FROM checkpoints c
          WHERE c.project_id = ?`,
        [projectId],
      ),
      query<Record<string, number>>(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN s.status = 'active' THEN 1 ELSE 0 END) AS active,
                COALESCE(SUM(s.capacity_points), 0)  AS capacity_points,
                COALESCE(SUM(s.committed_points), 0) AS committed_points,
                COALESCE(SUM(s.completed_points), 0) AS completed_points
           FROM sprints s
          WHERE s.project_id = ?`,
        [projectId],
      ),
      // Current decisions only (`superseded_by IS NULL`): a reopened checkpoint
      // must not be counted twice.
      query<Record<string, number>>(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN d.outcome = 'go'             THEN 1 ELSE 0 END) AS oc_go,
                SUM(CASE WHEN d.outcome = 'conditional_go' THEN 1 ELSE 0 END) AS oc_conditional_go,
                SUM(CASE WHEN d.outcome = 'no_go'          THEN 1 ELSE 0 END) AS oc_no_go,
                SUM(CASE WHEN d.outcome = 'deferred'       THEN 1 ELSE 0 END) AS oc_deferred
           FROM checkpoint_decisions d
           JOIN checkpoints c ON c.id = d.checkpoint_id
          WHERE c.project_id = ? AND d.superseded_by IS NULL`,
        [projectId],
      ),
    ]);

  const item = itemRows[0] ?? {};
  const checkpoint = checkpointRows[0] ?? {};
  const sprint = sprintRows[0] ?? {};
  const decision = decisionRows[0] ?? {};

  const byStatus = zeroCounts(WORK_ITEM_STATUSES);
  for (const s of WORK_ITEM_STATUSES) byStatus[s] = num(item[`st_${s}`]);

  const byType = zeroCounts(WORK_ITEM_TYPES);
  for (const t of WORK_ITEM_TYPES) byType[t] = num(item[`ty_${t}`]);

  const byLifecycle = zeroCounts(CHECKPOINT_LIFECYCLES);
  for (const l of CHECKPOINT_LIFECYCLES) byLifecycle[l] = num(checkpoint[`lc_${l}`]);

  const byOutcome = zeroCounts(DECISION_OUTCOMES);
  for (const o of DECISION_OUTCOMES) byOutcome[o] = num(decision[`oc_${o}`]);

  return {
    workItems: {
      total: num(item.total),
      byStatus,
      byType,
      storyPoints: {
        total: num(pointRows[0]?.total_points),
        done: num(pointRows[0]?.done_points),
      },
      overdue: num(item.overdue),
      loggedMinutes: num(minuteRows[0]?.minutes),
    },
    checkpoints: {
      total: num(checkpoint.total),
      byLifecycle,
      open: num(checkpoint.total) - byLifecycle.decided,
      avgReadiness: num(checkpoint.avg_readiness),
      nextDueDate: strOrNull(checkpoint.next_due),
    },
    sprints: {
      total: num(sprint.total),
      active: num(sprint.active),
      capacityPoints: num(sprint.capacity_points),
      committedPoints: num(sprint.committed_points),
      completedPoints: num(sprint.completed_points),
    },
    decisions: { total: num(decision.total), byOutcome },
  };
}

/** Read `new_values.__audit.detail` out of an audit row, defensively. */
function auditDetailOf(newValues: unknown): string | null {
  let parsed: unknown = newValues;
  if (typeof newValues === "string") {
    try {
      parsed = JSON.parse(newValues);
    } catch {
      return null;
    }
  }
  if (parsed == null || typeof parsed !== "object") return null;
  const envelope = (parsed as Record<string, unknown>).__audit;
  if (envelope == null || typeof envelope !== "object") return null;
  const detail = (envelope as Record<string, unknown>).detail;
  return typeof detail === "string" && detail.length > 0 ? detail : null;
}

/**
 * The "Aktivita" tab: the project's own audit rows, newest first.
 *
 * Scoped to `entity = 'projects'` — audit rows for the project's work items and
 * checkpoints carry their OWN entity id, and resolving those back to a project
 * would mean joining `audit_log` against rows the cascade may already have
 * deleted. Only the action, the actor and the timestamp are surfaced; the raw
 * old/new value snapshots stay in `/api/audit` (admin only).
 */
export async function getProjectActivity(
  projectId: string,
  limit = 10,
): Promise<ProjectActivityDto[]> {
  const rows = await query<{
    id: number;
    action: string;
    entity: string | null;
    entity_id: string | null;
    username: string | null;
    new_values: unknown;
    ts: unknown;
  }>(
    `SELECT a.id, a.action, a.entity, a.entity_id, a.username, a.new_values, a.ts
       FROM audit_log a
      WHERE a.entity = 'projects' AND a.entity_id = ?
      ORDER BY a.ts DESC, a.id DESC
      LIMIT ?`,
    [projectId, Math.min(Math.max(limit, 1), 100)],
  );

  return rows.map((r) => ({
    id: num(r.id),
    action: String(r.action),
    entity: strOrNull(r.entity),
    entityId: strOrNull(r.entity_id),
    actorEmail: strOrNull(r.username),
    detail: auditDetailOf(r.new_values),
    at: isoOrNull(r.ts),
  }));
}

/** Everything `GET /api/projects/[id]` returns, or null when there is no project. */
export async function getProjectDetail(
  id: string,
): Promise<ProjectDetailDto | null> {
  const project = await getProject(id);
  if (!project) return null;

  const [stats, activity] = await Promise.all([
    getProjectStats(id),
    getProjectActivity(id),
  ]);

  return {
    project,
    stats,
    suggestedHealth: suggestHealth(project),
    activity,
  };
}

// ---------------------------------------------------------------------------
// Preferences (user_preferences · user_view_preferences)
// ---------------------------------------------------------------------------

/** Parse a JSON column that the driver may hand back as text or as an object. */
export function parseJsonObject(v: unknown): Record<string, unknown> {
  let parsed: unknown = v;
  if (typeof v === "string") {
    try {
      parsed = JSON.parse(v);
    } catch {
      return {};
    }
  }
  if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {};
  }
  return parsed as Record<string, unknown>;
}

/** The raw stored preferences of a user (`{}` when the row does not exist). */
export async function loadRawPreferences(
  userId: string,
): Promise<Record<string, unknown>> {
  const rows = await query<{ preferences_json: unknown }>(
    "SELECT preferences_json FROM user_preferences WHERE user_id = ?",
    [userId],
  );
  return rows[0] ? parseJsonObject(rows[0].preferences_json) : {};
}

/**
 * Upsert the whole preferences document for a user. Takes `object` rather than
 * `Record<string, unknown>` so a precisely-typed DTO (e.g. `UserPreferences`)
 * can be passed without a cast.
 */
export async function saveRawPreferences(
  userId: string,
  preferences: object,
): Promise<void> {
  const json = JSON.stringify(preferences);
  await execute(
    `INSERT INTO user_preferences (\`user_id\`, \`preferences_json\`)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE \`preferences_json\` = ?`,
    [userId, json, json],
  );
}

/** The stored view config of one page (`{}` when nothing was saved yet). */
export async function loadViewPreferences(
  userId: string,
  pageKey: string,
): Promise<Record<string, unknown>> {
  const rows = await query<{ config_json: unknown }>(
    "SELECT config_json FROM user_view_preferences WHERE user_id = ? AND page_key = ?",
    [userId, pageKey],
  );
  return rows[0] ? parseJsonObject(rows[0].config_json) : {};
}

/** Upsert the view config of one page. */
export async function saveViewPreferences(
  userId: string,
  pageKey: string,
  config: object,
): Promise<void> {
  const json = JSON.stringify(config);
  await execute(
    `INSERT INTO user_view_preferences (\`user_id\`, \`page_key\`, \`config_json\`)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE \`config_json\` = ?`,
    [userId, pageKey, json, json],
  );
}
