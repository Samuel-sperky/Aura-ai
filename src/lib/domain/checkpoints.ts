// Checkpoints — the data layer of the decision pillar.
//
// WHAT LIVES HERE
//   * `computeReadiness` and the lifecycle derivation — the two pure rules the
//     whole pillar rests on.
//   * `validateDecisionGate` — "may THIS user decide THIS checkpoint right now?".
//     Pure, so it is both unit-tested and reused to compute the UX hint
//     (`canDecide` / `decisionBlockedReason`) on every listed row.
//   * The SQL: list / load / create / update, the requirement checklist, the
//     readiness resync and the `projects.next_checkpoint` cache refresh.
//
// TWO CONVENTIONS WORTH KNOWING BEFORE EDITING
//
// 1. DATE columns are ALWAYS read with `DATE_FORMAT(col, '%Y-%m-%d')`.
//    The mariadb driver maps a DATE to a JS `Date` at LOCAL midnight. In a
//    positive-offset zone (Europe/Bratislava is +01:00/+02:00) `toISOString()`
//    then rolls back to the previous day, so formatting a DATE through
//    `dateOrNull()` silently shifts every calendar day by one. Formatting in SQL
//    removes the conversion entirely. DATETIME columns are instants and are fine
//    as driver `Date`s → `isoOrNull()`.
//
// 2. Every mutating function takes a `SqlRunner` instead of importing `query()`
//    directly. A `PoolConnection` satisfies it structurally, so the same code
//    runs inside `withTransaction()` (the decide path needs atomicity) and
//    against the pool. Tests inject a fake runner and assert on the SQL.

import { randomUUID } from "node:crypto";
import { jsonError } from "@/lib/api/respond";
import { query as poolQuery } from "@/lib/db";
import {
  escapeLike,
  LIKE_ESCAPE_CLAUSE,
  pickSort,
  sortDir,
  toPagination,
  type Pagination,
} from "@/lib/domain/data";
import { isoOrNull, num, bool, strOrNull } from "@/lib/domain/data";
import {
  CHECKPOINT_LIFECYCLES,
  FULL_READINESS,
  type CheckpointDto,
  type CheckpointLifecycle,
  type CheckpointListQuery,
  type CheckpointType,
  type DecisionDto,
  type DecisionOutcome,
  type RequirementDto,
  type RequirementInput,
  type SettableLifecycle,
} from "@/lib/domain/contracts/checkpoints";

// ---------------------------------------------------------------------------
// SQL runner abstraction
// ---------------------------------------------------------------------------

/**
 * The minimum a caller must provide to run SQL. `mariadb`'s `PoolConnection`
 * satisfies this structurally, which is how a transaction is threaded through
 * the domain functions without them knowing about pools or transactions.
 */
export interface SqlRunner {
  query(sql: string, params?: unknown[]): Promise<unknown>;
}

/** The pool as a `SqlRunner`, for the read paths that need no transaction. */
export const poolRunner: SqlRunner = {
  query: (sql, params) => poolQuery(sql, params ?? []),
};

/** Run a SELECT through a runner and get typed rows. */
export async function rows<T = Record<string, unknown>>(
  runner: SqlRunner,
  sql: string,
  params: ReadonlyArray<unknown> = [],
): Promise<T[]> {
  const res = await runner.query(sql, params as unknown[]);
  return (Array.isArray(res) ? res : []) as T[];
}

/** Run a mutation through a runner and get `affectedRows`. */
export async function mutate(
  runner: SqlRunner,
  sql: string,
  params: ReadonlyArray<unknown> = [],
): Promise<number> {
  const res = (await runner.query(sql, params as unknown[])) as
    | { affectedRows?: number }
    | undefined;
  return Number(res?.affectedRows ?? 0);
}

// ---------------------------------------------------------------------------
// Rejections — a domain-level "no" that a route turns into a Response
// ---------------------------------------------------------------------------

/**
 * A refusal produced by the domain layer. The route maps it with
 * `jsonError(r.message, r.status, r.code ? { code: r.code } : undefined)`.
 */
export interface DomainRejection {
  status: number;
  /** Slovak, user-facing (the canonical `{ error }` envelope). */
  message: string;
  /** Machine-readable discriminator for the client, when one is useful. */
  code?: string;
  /** Set on a 409 caused by optimistic concurrency. */
  currentVersion?: number;
}

/** Type guard: did a domain call return a refusal rather than a result? */
export function isRejection(v: unknown): v is DomainRejection {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as DomainRejection).status === "number" &&
    typeof (v as DomainRejection).message === "string"
  );
}

/**
 * Turn a domain refusal into the canonical `{ error }` response. A 409 carrying a
 * `currentVersion` comes out byte-identical to `versionConflict()`, so the client
 * handles both through `ApiError.isVersionConflict`.
 */
export function rejectionResponse(r: DomainRejection): Response {
  const extra: Record<string, unknown> = {};
  if (r.code) extra.code = r.code;
  if (r.currentVersion !== undefined) extra.currentVersion = r.currentVersion;
  return jsonError(
    r.message,
    r.status,
    Object.keys(extra).length > 0 ? extra : undefined,
  );
}

// ---------------------------------------------------------------------------
// Readiness — the pure rule
// ---------------------------------------------------------------------------

/** The two flags of a checklist row that readiness depends on. */
export interface ReadinessRequirement {
  required: boolean;
  complete: boolean;
}

/**
 * Readiness from raw counts of the REQUIRED rows.
 *
 * Rules, all deliberate:
 *   * Only `required` rows count. Optional rows are shown but never move the bar
 *     (spec: "Nepovinné podmienky sa do readiness nepočítajú, ale zobrazujú sa").
 *   * NO required rows → 0 %, not 100 %. A checkpoint whose "ready" has never
 *     been defined is not ready; 0/0 = 100 % would let anyone decide instantly
 *     and would hollow out the whole pillar. An admin with `readiness.override`
 *     can still push through, with a reason on the record.
 *   * The result is capped at 99 until EVERY required row is complete. Plain
 *     rounding would report 199/200 as 100 %, and 100 % is the value the decision
 *     gate compares against — a rounding artefact must never open the gate.
 */
export function computeReadinessFromCounts(
  requiredCount: number,
  requiredComplete: number,
): number {
  if (requiredCount <= 0) return 0;
  const done = Math.max(0, Math.min(requiredComplete, requiredCount));
  if (done >= requiredCount) return FULL_READINESS;
  const pct = Math.round((done / requiredCount) * 100);
  return Math.min(pct, FULL_READINESS - 1);
}

/**
 * Readiness of a checkpoint from its checklist: the share of the REQUIRED
 * conditions that are complete, as a whole percentage 0–100.
 *
 * @example
 *   computeReadiness([])                                             // 0
 *   computeReadiness([{ required: false, complete: true }])          // 0
 *   computeReadiness([{ required: true, complete: true },
 *                     { required: true, complete: false }])          // 50
 */
export function computeReadiness(
  requirements: ReadonlyArray<ReadinessRequirement>,
): number {
  let requiredCount = 0;
  let requiredComplete = 0;
  for (const r of requirements) {
    if (!r.required) continue;
    requiredCount += 1;
    if (r.complete) requiredComplete += 1;
  }
  return computeReadinessFromCounts(requiredCount, requiredComplete);
}

/**
 * Derive the lifecycle after a readiness change.
 *
 * `decided` and `blocked` are STICKY: a decision is not undone by editing the
 * checklist (only `reopen` leaves `decided`), and `blocked` is a deliberate
 * human statement that outranks the percentage. Everything else follows the bar:
 * 100 % → `ready`, below → `planned`.
 */
export function lifecycleForReadiness(
  current: CheckpointLifecycle,
  readiness: number,
): CheckpointLifecycle {
  if (current === "decided" || current === "blocked") return current;
  return readiness >= FULL_READINESS ? "ready" : "planned";
}

// ---------------------------------------------------------------------------
// The decision gate — pure
// ---------------------------------------------------------------------------

export interface DecisionGateInput {
  checkpointType: CheckpointType;
  lifecycle: CheckpointLifecycle;
  /** Authoritative readiness (recomputed from the checklist, not the cache). */
  readiness: number;
  ownerId: string | null;
  approverId: string | null;
  /** The user attempting the decision. */
  actorId: string;
  /** Does the actor hold `readiness.override`? (admin-only right) */
  canOverrideReadiness: boolean;
  /** The justification sent with the request, if any. */
  overrideReason?: string | null;
}

/**
 * May this user decide this checkpoint right now? Returns `null` when yes, or the
 * refusal to send back.
 *
 * The rules, in the order they are checked (the order matters — the first
 * applicable refusal is the one the user sees):
 *
 *  1. A decided checkpoint is IMMUTABLE (spec Q36). Reopen it instead. → 409
 *  2. No approver assigned → nobody can decide. → 422
 *  3. Only the named approver may decide (spec Q41) — including admins: holding
 *     `decisions.decide` is necessary, not sufficient. → 403
 *  4. Type `gate` ONLY: the approver must differ from the owner (spec Q35). The
 *     other three types skip this check on purpose — with a 3–4 person team a
 *     blanket four-eyes rule would deadlock the app. → 422
 *  5. Readiness must be 100 % (spec Q34). A holder of `readiness.override` may
 *     go below, but ONLY with a reason, which is written to `audit_log` under
 *     the action `readiness.override`. → 422 / 400
 */
export function validateDecisionGate(
  input: DecisionGateInput,
): DomainRejection | null {
  if (input.lifecycle === "decided") {
    return {
      status: 409,
      code: "ALREADY_DECIDED",
      message:
        "Checkpoint je už rozhodnutý a rozhodnutie je nemenné. Najprv ho znovu otvorte.",
    };
  }
  if (!input.approverId) {
    return {
      status: 422,
      code: "NO_APPROVER",
      message:
        "Checkpoint nemá určeného schvaľovateľa. Doplňte ho pred rozhodnutím.",
    };
  }
  if (input.approverId !== input.actorId) {
    return {
      status: 403,
      code: "NOT_APPROVER",
      message: "Rozhodnúť môže len určený schvaľovateľ checkpointu.",
    };
  }
  if (
    input.checkpointType === "gate" &&
    input.ownerId &&
    input.ownerId === input.approverId
  ) {
    return {
      status: 422,
      code: "GATE_SAME_PERSON",
      message:
        'Pri type „gate“ musí byť schvaľovateľ iný človek než vlastník checkpointu.',
    };
  }
  if (input.readiness < FULL_READINESS) {
    if (!input.canOverrideReadiness) {
      return {
        status: 422,
        code: "NOT_READY",
        message: `Rozhodnutie je povolené až pri 100 % pripravenosti (teraz ${input.readiness} %).`,
      };
    }
    if (!input.overrideReason || input.overrideReason.trim().length === 0) {
      return {
        status: 400,
        code: "OVERRIDE_REASON_REQUIRED",
        message:
          "Pri prelomení pravidla 100 % pripravenosti je dôvod povinný.",
      };
    }
  }
  return null;
}

/** Did this decision go through below 100 %? (drives the extra audit entry) */
export function isReadinessOverride(readiness: number): boolean {
  return readiness < FULL_READINESS;
}

// ---------------------------------------------------------------------------
// Calendar helpers (local time, no UTC round-trip)
// ---------------------------------------------------------------------------

/** Today as `YYYY-MM-DD` in the SERVER's local zone (Europe/Bratislava). */
export function todayLocalDate(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Whole days from `from` to `to` (both `YYYY-MM-DD`); negative = `to` is past. */
export function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / 86_400_000);
}

// ---------------------------------------------------------------------------
// Row shapes + mapping
// ---------------------------------------------------------------------------

/**
 * The joined checkpoint row. DATE columns arrive pre-formatted as strings (see
 * the header note), DATETIME columns as driver `Date`s.
 */
export interface CheckpointRow {
  id: string;
  project_id: string;
  project_code: string | null;
  project_name: string | null;
  name: string;
  description: string | null;
  impact: string | null;
  checkpoint_type: string;
  lifecycle: string;
  due_date: string | null;
  start_date: string | null;
  end_date: string | null;
  owner_id: string | null;
  owner_name: string | null;
  owner_initials: string | null;
  approver_id: string | null;
  approver_name: string | null;
  approver_initials: string | null;
  readiness: number | string;
  required_count: number | string | null;
  required_complete: number | string | null;
  optional_count: number | string | null;
  optional_complete: number | string | null;
  decided_at: Date | string | null;
  version: number | string;
  created_at: Date | string | null;
  updated_at: Date | string | null;
}

export interface DecisionRow {
  id: string;
  checkpoint_id: string;
  outcome: string;
  note: string | null;
  decided_by: string | null;
  decided_by_name: string | null;
  decided_at: Date | string | null;
  superseded_by: string | null;
}

export interface RequirementRow {
  id: string;
  checkpoint_id: string;
  label: string;
  required: number | boolean;
  complete: number | boolean;
  sort_order: number | string;
}

const LIFECYCLE_SET = new Set<string>(CHECKPOINT_LIFECYCLES);

function asLifecycle(v: unknown): CheckpointLifecycle {
  const s = String(v ?? "planned");
  return (LIFECYCLE_SET.has(s) ? s : "planned") as CheckpointLifecycle;
}

export function mapRequirement(row: RequirementRow): RequirementDto {
  return {
    id: row.id,
    checkpointId: row.checkpoint_id,
    label: row.label,
    required: bool(row.required),
    complete: bool(row.complete),
    sortOrder: num(row.sort_order),
  };
}

export function mapDecision(row: DecisionRow): DecisionDto {
  return {
    id: row.id,
    checkpointId: row.checkpoint_id,
    outcome: row.outcome as DecisionOutcome,
    note: strOrNull(row.note),
    decidedBy: row.decided_by,
    decidedByName: strOrNull(row.decided_by_name),
    decidedAt: isoOrNull(row.decided_at),
    supersededBy: row.superseded_by,
  };
}

/** Who is looking, so `canDecide` can be answered for them. */
export interface Viewer {
  id: string;
  canDecide: boolean;
  canOverrideReadiness: boolean;
}

/**
 * Build a `Viewer` from the authenticated user.
 *
 * Reads the already-expanded `rights` array rather than calling
 * `rbac.hasRight()`, which keeps this module free of a runtime dependency on
 * `next/headers` (it is imported by the unit tests). `admin` satisfies every
 * right, same as `hasRight` does.
 */
export function viewerOf(user: {
  id: string;
  rights: ReadonlyArray<string>;
}): Viewer {
  const rights = new Set(user.rights);
  const admin = rights.has("admin");
  return {
    id: user.id,
    canDecide: admin || rights.has("decisions.decide"),
    canOverrideReadiness: admin || rights.has("readiness.override"),
  };
}

/**
 * Map a joined row to the wire DTO. Readiness is recomputed from the checklist
 * counts rather than read from the cached `readiness` column, so a stale cache
 * can never be what the decision gate or the UI is shown.
 */
export function mapCheckpoint(
  row: CheckpointRow,
  opts: {
    decision?: DecisionDto | null;
    viewer?: Viewer | null;
    today?: string;
  } = {},
): CheckpointDto {
  const requiredCount = num(row.required_count);
  const requiredCompleteCount = num(row.required_complete);
  const readiness = computeReadinessFromCounts(
    requiredCount,
    requiredCompleteCount,
  );
  const lifecycle = asLifecycle(row.lifecycle);
  const dueDate = String(row.due_date ?? "");
  const today = opts.today ?? todayLocalDate();
  const daysUntilDue = dueDate ? daysBetween(today, dueDate) : 0;

  const viewer = opts.viewer ?? null;
  let canDecide = false;
  let decisionBlockedReason: string | null = null;
  if (viewer) {
    if (!viewer.canDecide) {
      decisionBlockedReason = "Na rozhodovanie nemáte oprávnenie.";
    } else {
      const gate = validateDecisionGate({
        checkpointType: row.checkpoint_type as CheckpointType,
        lifecycle,
        readiness,
        ownerId: row.owner_id,
        approverId: row.approver_id,
        actorId: viewer.id,
        canOverrideReadiness: viewer.canOverrideReadiness,
        // The hint answers "could you decide as things stand", so no reason is
        // supplied — an override-capable user is told the reason is required.
        overrideReason: null,
      });
      canDecide = gate === null;
      decisionBlockedReason = gate?.message ?? null;
    }
  }

  return {
    id: row.id,
    projectId: row.project_id,
    projectCode: row.project_code ?? "",
    projectName: row.project_name ?? "",
    name: row.name,
    description: strOrNull(row.description),
    impact: strOrNull(row.impact),
    checkpointType: row.checkpoint_type as CheckpointType,
    lifecycle,
    dueDate,
    startDate: row.start_date ?? null,
    endDate: row.end_date ?? null,
    ownerId: row.owner_id,
    ownerName: strOrNull(row.owner_name),
    ownerInitials: strOrNull(row.owner_initials),
    approverId: row.approver_id,
    approverName: strOrNull(row.approver_name),
    approverInitials: strOrNull(row.approver_initials),
    readiness,
    requiredCount,
    requiredCompleteCount,
    optionalCount: num(row.optional_count),
    optionalCompleteCount: num(row.optional_complete),
    decidedAt: isoOrNull(row.decided_at),
    version: num(row.version),
    createdAt: isoOrNull(row.created_at),
    updatedAt: isoOrNull(row.updated_at),
    decision: opts.decision ?? null,
    daysUntilDue,
    overdue: lifecycle !== "decided" && dueDate !== "" && daysUntilDue < 0,
    canDecide,
    decisionBlockedReason,
  };
}

// ---------------------------------------------------------------------------
// SELECT building blocks
// ---------------------------------------------------------------------------

/**
 * The one joined projection every checkpoint read uses. The requirement counts
 * come from a GROUP BY derived table (one extra scan, always consistent), NOT
 * from the cached `checkpoints.readiness` column.
 *
 * The current decision is deliberately NOT joined here: `checkpoint_decisions`
 * holds one un-superseded row per checkpoint by invariant, and a join on an
 * invariant multiplies rows the moment the invariant is violated. It is fetched
 * separately by id (see `attachDecisions`).
 */
const CHECKPOINT_SELECT = `
  SELECT c.id, c.project_id, c.name, c.description, c.impact, c.checkpoint_type,
         c.lifecycle, c.readiness, c.version, c.decided_at, c.created_at, c.updated_at,
         c.owner_id, c.approver_id,
         DATE_FORMAT(c.due_date, '%Y-%m-%d')   AS due_date,
         DATE_FORMAT(c.start_date, '%Y-%m-%d') AS start_date,
         DATE_FORMAT(c.end_date, '%Y-%m-%d')   AS end_date,
         p.code AS project_code, p.name AS project_name,
         ow.name AS owner_name, ow.initials AS owner_initials,
         ap.name AS approver_name, ap.initials AS approver_initials,
         COALESCE(rq.required_count, 0)    AS required_count,
         COALESCE(rq.required_complete, 0) AS required_complete,
         COALESCE(rq.optional_count, 0)    AS optional_count,
         COALESCE(rq.optional_complete, 0) AS optional_complete
    FROM checkpoints c
    JOIN projects p ON p.id = c.project_id
    LEFT JOIN app_users ow ON ow.id = c.owner_id
    LEFT JOIN app_users ap ON ap.id = c.approver_id
    LEFT JOIN (
      SELECT checkpoint_id,
             SUM(CASE WHEN required = 1 THEN 1 ELSE 0 END)                  AS required_count,
             SUM(CASE WHEN required = 1 AND complete = 1 THEN 1 ELSE 0 END)  AS required_complete,
             SUM(CASE WHEN required = 0 THEN 1 ELSE 0 END)                  AS optional_count,
             SUM(CASE WHEN required = 0 AND complete = 1 THEN 1 ELSE 0 END)  AS optional_complete
        FROM checkpoint_requirements
       GROUP BY checkpoint_id
    ) rq ON rq.checkpoint_id = c.id`;

/** ORDER BY allow-list. Client sort keys never reach SQL unmapped. */
const SORT_COLUMNS: Readonly<Record<string, string>> = {
  dueDate: "c.due_date",
  name: "c.name",
  lifecycle: "c.lifecycle",
  type: "c.checkpoint_type",
  // The cached column — good enough to sort by, never to gate a decision on.
  readiness: "c.readiness",
  project: "p.code",
  createdAt: "c.created_at",
};

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/** Fetch the CURRENT decision (`superseded_by IS NULL`) for a set of ids. */
export async function currentDecisionsFor(
  runner: SqlRunner,
  checkpointIds: ReadonlyArray<string>,
): Promise<Map<string, DecisionDto>> {
  const out = new Map<string, DecisionDto>();
  if (checkpointIds.length === 0) return out;
  const placeholders = checkpointIds.map(() => "?").join(", ");
  const list = await rows<DecisionRow>(
    runner,
    `SELECT d.id, d.checkpoint_id, d.outcome, d.note, d.decided_by,
            d.decided_at, d.superseded_by, u.name AS decided_by_name
       FROM checkpoint_decisions d
       LEFT JOIN app_users u ON u.id = d.decided_by
      WHERE d.checkpoint_id IN (${placeholders})
        AND d.superseded_by IS NULL
      ORDER BY d.decided_at DESC, d.id DESC`,
    checkpointIds,
  );
  for (const row of list) {
    // First row per checkpoint wins: newest by decided_at, so a violated
    // one-current-row invariant degrades to "latest" instead of duplicating.
    if (!out.has(row.checkpoint_id)) out.set(row.checkpoint_id, mapDecision(row));
  }
  return out;
}

/** The full immutable decision history of one checkpoint, newest first. */
export async function decisionHistory(
  runner: SqlRunner,
  checkpointId: string,
): Promise<DecisionDto[]> {
  const list = await rows<DecisionRow>(
    runner,
    `SELECT d.id, d.checkpoint_id, d.outcome, d.note, d.decided_by,
            d.decided_at, d.superseded_by, u.name AS decided_by_name
       FROM checkpoint_decisions d
       LEFT JOIN app_users u ON u.id = d.decided_by
      WHERE d.checkpoint_id = ?
      ORDER BY d.decided_at DESC, d.id DESC`,
    [checkpointId],
  );
  return list.map(mapDecision);
}

/** The checklist of one checkpoint, in display order. */
export async function requirementsFor(
  runner: SqlRunner,
  checkpointId: string,
): Promise<RequirementDto[]> {
  const list = await rows<RequirementRow>(
    runner,
    `SELECT id, checkpoint_id, label, required, complete, sort_order
       FROM checkpoint_requirements
      WHERE checkpoint_id = ?
      ORDER BY sort_order ASC, created_at ASC, id ASC`,
    [checkpointId],
  );
  return list.map(mapRequirement);
}

/** One checkpoint as a DTO (with its current decision), or null. */
export async function loadCheckpoint(
  runner: SqlRunner,
  id: string,
  viewer?: Viewer | null,
): Promise<CheckpointDto | null> {
  const list = await rows<CheckpointRow>(
    runner,
    `${CHECKPOINT_SELECT} WHERE c.id = ?`,
    [id],
  );
  const row = list[0];
  if (!row) return null;
  const decisions = await currentDecisionsFor(runner, [id]);
  return mapCheckpoint(row, {
    decision: decisions.get(id) ?? null,
    viewer: viewer ?? null,
  });
}

/**
 * The minimal row the decide / reopen / update paths lock and inspect. Kept
 * separate from the DTO read so those paths do one narrow `SELECT … FOR UPDATE`.
 */
export interface CheckpointGuardRow {
  id: string;
  project_id: string;
  name: string;
  checkpoint_type: string;
  lifecycle: string;
  owner_id: string | null;
  approver_id: string | null;
  version: number | string;
  due_date: string | null;
}

/**
 * Load the guard row, optionally taking a row lock. `forUpdate` is used by the
 * decide / reopen transactions so two concurrent decisions serialise instead of
 * racing between the version read and the version compare-and-swap.
 */
export async function loadCheckpointGuard(
  runner: SqlRunner,
  id: string,
  forUpdate = false,
): Promise<CheckpointGuardRow | null> {
  const list = await rows<CheckpointGuardRow>(
    runner,
    `SELECT id, project_id, name, checkpoint_type, lifecycle, owner_id,
            approver_id, version, DATE_FORMAT(due_date, '%Y-%m-%d') AS due_date
       FROM checkpoints
      WHERE id = ?${forUpdate ? " FOR UPDATE" : ""}`,
    [id],
  );
  return list[0] ?? null;
}

/** Recompute readiness for a checkpoint straight from its checklist rows. */
export async function readinessOf(
  runner: SqlRunner,
  checkpointId: string,
): Promise<{ readiness: number; requiredCount: number; requiredComplete: number }> {
  const list = await rows<{
    required_count: number | string | null;
    required_complete: number | string | null;
  }>(
    runner,
    `SELECT SUM(CASE WHEN required = 1 THEN 1 ELSE 0 END)                 AS required_count,
            SUM(CASE WHEN required = 1 AND complete = 1 THEN 1 ELSE 0 END) AS required_complete
       FROM checkpoint_requirements
      WHERE checkpoint_id = ?`,
    [checkpointId],
  );
  const requiredCount = num(list[0]?.required_count);
  const requiredComplete = num(list[0]?.required_complete);
  return {
    readiness: computeReadinessFromCounts(requiredCount, requiredComplete),
    requiredCount,
    requiredComplete,
  };
}

export interface CheckpointListResult {
  items: CheckpointDto[];
  total: number;
  pagination: Pagination;
}

/**
 * The list read behind `GET /api/checkpoints`, including the Decisions view
 * (`queue=1`, spec Q9): everything still awaiting a decision, ordered by due
 * date then by readiness — a work queue, not a timeline.
 */
export async function listCheckpoints(
  runner: SqlRunner,
  q: CheckpointListQuery,
  viewer: Viewer,
): Promise<CheckpointListResult> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (q.projectId) {
    conditions.push("c.project_id = ?");
    params.push(q.projectId);
  }
  if (q.checkpointType) {
    conditions.push("c.checkpoint_type = ?");
    params.push(q.checkpointType);
  }
  if (q.lifecycle) {
    conditions.push("c.lifecycle = ?");
    params.push(q.lifecycle);
  }
  if (q.ownerId) {
    conditions.push("c.owner_id = ?");
    params.push(q.ownerId);
  }
  if (q.approverId) {
    conditions.push("c.approver_id = ?");
    params.push(q.approverId);
  }
  if (q.queue === "1") {
    conditions.push("c.lifecycle <> 'decided'");
  }
  if (q.mine === "1") {
    conditions.push("c.approver_id = ?");
    params.push(viewer.id);
  }
  if (q.readyOnly === "1") {
    conditions.push("c.lifecycle = 'ready'");
  }
  if (q.from) {
    conditions.push("c.due_date >= ?");
    params.push(q.from);
  }
  if (q.to) {
    conditions.push("c.due_date <= ?");
    params.push(q.to);
  }
  if (q.q) {
    conditions.push(
      `(c.name LIKE ? ${LIKE_ESCAPE_CLAUSE} OR p.code LIKE ? ${LIKE_ESCAPE_CLAUSE} OR p.name LIKE ? ${LIKE_ESCAPE_CLAUSE})`,
    );
    const like = `%${escapeLike(q.q)}%`;
    params.push(like, like, like);
  }

  const where = conditions.length ? ` WHERE ${conditions.join(" AND ")}` : "";

  const totalRows = await rows<{ n: number | string }>(
    runner,
    `SELECT COUNT(*) AS n FROM checkpoints c JOIN projects p ON p.id = c.project_id${where}`,
    params,
  );
  const total = num(totalRows[0]?.n);

  // Queue mode has its own default order: nearest deadline first, and within one
  // day the most prepared first — that is the order you work the queue in.
  const orderBy = q.sort
    ? `${pickSort(q.sort, SORT_COLUMNS, "c.due_date")} ${sortDir(q.dir)}, c.name ASC`
    : q.queue === "1"
      ? "c.due_date ASC, c.readiness DESC, c.name ASC"
      : "c.due_date ASC, c.name ASC";

  const pg = toPagination(q.page, q.pageSize);
  const list = await rows<CheckpointRow>(
    runner,
    `${CHECKPOINT_SELECT}${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    [...params, pg.limit, pg.offset],
  );

  const decisions = await currentDecisionsFor(
    runner,
    list.map((r) => r.id),
  );
  const today = todayLocalDate();
  return {
    items: list.map((row) =>
      mapCheckpoint(row, {
        decision: decisions.get(row.id) ?? null,
        viewer,
        today,
      }),
    ),
    total,
    pagination: pg,
  };
}

// ---------------------------------------------------------------------------
// projects.next_checkpoint cache
// ---------------------------------------------------------------------------

/**
 * Refresh the `projects.next_checkpoint` / `next_checkpoint_date` cache from the
 * nearest checkpoint that has NOT been decided yet. Call it after any write that
 * can change that set: create, update (due date / lifecycle), delete, decide,
 * reopen.
 *
 * RELATION TO `projects.recomputeNextCheckpoint()`: same query, same result — but
 * that one runs on the POOL. Called from inside a transaction it would use a
 * different connection, would not see the uncommitted checkpoint change, and would
 * therefore write a cache built from pre-transaction state (e.g. still naming the
 * checkpoint that was just decided). Every checkpoint write is transactional, so
 * this runner-based variant is the one those paths must use. The two should be
 * unified by giving the projects version an optional runner parameter.
 */
export async function refreshProjectNextCheckpoint(
  runner: SqlRunner,
  projectId: string,
): Promise<void> {
  if (!projectId) return;
  const list = await rows<{ name: string; due_date: string | null }>(
    runner,
    `SELECT name, DATE_FORMAT(due_date, '%Y-%m-%d') AS due_date
       FROM checkpoints
      WHERE project_id = ? AND lifecycle <> 'decided'
      ORDER BY due_date ASC, name ASC
      LIMIT 1`,
    [projectId],
  );
  const next = list[0];
  await mutate(
    runner,
    `UPDATE projects SET next_checkpoint = ?, next_checkpoint_date = ? WHERE id = ?`,
    [next?.name ?? "", next?.due_date ?? null, projectId],
  );
}

/**
 * Resync the cached `checkpoints.readiness` column and the derived lifecycle
 * from the checklist. Returns the values written plus the new row version.
 *
 * Compare-and-swap on `version`: a concurrent edit loses and gets a 409 rather
 * than silently overwriting.
 */
export async function syncCheckpointReadiness(
  runner: SqlRunner,
  args: {
    checkpointId: string;
    currentLifecycle: CheckpointLifecycle;
    expectedVersion: number;
    updatedBy: string;
  },
): Promise<
  | { readiness: number; lifecycle: CheckpointLifecycle; version: number }
  | DomainRejection
> {
  const { readiness } = await readinessOf(runner, args.checkpointId);
  const lifecycle = lifecycleForReadiness(args.currentLifecycle, readiness);
  const affected = await mutate(
    runner,
    `UPDATE checkpoints
        SET readiness = ?, lifecycle = ?, version = version + 1,
            updated_at = CURRENT_TIMESTAMP, updated_by = ?
      WHERE id = ? AND version = ?`,
    [
      readiness,
      lifecycle,
      args.updatedBy,
      args.checkpointId,
      args.expectedVersion,
    ],
  );
  if (affected === 0) {
    return {
      status: 409,
      code: "VERSION_CONFLICT",
      message:
        "Záznam sa medzičasom zmenil. Obnovte údaje a skúste to znova.",
      currentVersion: args.expectedVersion,
    };
  }
  return { readiness, lifecycle, version: args.expectedVersion + 1 };
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/** Insert a checklist, numbering `sort_order` from the array order. */
export async function insertRequirements(
  runner: SqlRunner,
  checkpointId: string,
  requirements: ReadonlyArray<RequirementInput>,
  createdBy: string,
): Promise<void> {
  for (let i = 0; i < requirements.length; i += 1) {
    const r = requirements[i];
    await mutate(
      runner,
      `INSERT INTO checkpoint_requirements
         (id, checkpoint_id, label, required, complete, sort_order, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        randomUUID(),
        checkpointId,
        r.label,
        r.required ? 1 : 0,
        r.complete ? 1 : 0,
        i,
        createdBy,
      ],
    );
  }
}

/**
 * Replace the whole checklist of one checkpoint in one pass:
 *   * rows present with an `id` are updated in place (history of the row kept),
 *   * rows without an `id` are inserted,
 *   * rows in the DB that the payload omits are deleted,
 *   * `sort_order` is rewritten from the array order.
 *
 * An `id` that does not belong to this checkpoint is rejected — otherwise a
 * crafted payload could move another checkpoint's requirement.
 */
export async function replaceRequirements(
  runner: SqlRunner,
  checkpointId: string,
  requirements: ReadonlyArray<RequirementInput>,
  actorId: string,
): Promise<DomainRejection | null> {
  const existing = await rows<{ id: string }>(
    runner,
    "SELECT id FROM checkpoint_requirements WHERE checkpoint_id = ?",
    [checkpointId],
  );
  const existingIds = new Set(existing.map((r) => r.id));
  const keptIds = new Set<string>();

  for (const r of requirements) {
    if (r.id && !existingIds.has(r.id)) {
      return {
        status: 400,
        code: "UNKNOWN_REQUIREMENT",
        message: "Podmienka nepatrí k tomuto checkpointu.",
      };
    }
    if (r.id) keptIds.add(r.id);
  }

  for (const id of existingIds) {
    if (keptIds.has(id)) continue;
    await mutate(runner, "DELETE FROM checkpoint_requirements WHERE id = ?", [id]);
  }

  for (let i = 0; i < requirements.length; i += 1) {
    const r = requirements[i];
    if (r.id) {
      await mutate(
        runner,
        `UPDATE checkpoint_requirements
            SET label = ?, required = ?, complete = ?, sort_order = ?,
                updated_at = CURRENT_TIMESTAMP, updated_by = ?
          WHERE id = ? AND checkpoint_id = ?`,
        [
          r.label,
          r.required ? 1 : 0,
          r.complete ? 1 : 0,
          i,
          actorId,
          r.id,
          checkpointId,
        ],
      );
    } else {
      await mutate(
        runner,
        `INSERT INTO checkpoint_requirements
           (id, checkpoint_id, label, required, complete, sort_order, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          randomUUID(),
          checkpointId,
          r.label,
          r.required ? 1 : 0,
          r.complete ? 1 : 0,
          i,
          actorId,
        ],
      );
    }
  }
  return null;
}

export interface CreateCheckpointArgs {
  projectId: string;
  name: string;
  description?: string | null;
  impact?: string | null;
  checkpointType: CheckpointType;
  lifecycle: SettableLifecycle;
  dueDate: string;
  startDate?: string | null;
  endDate?: string | null;
  ownerId?: string | null;
  approverId?: string | null;
  requirements?: ReadonlyArray<RequirementInput>;
  actorId: string;
}

/**
 * Create a checkpoint with its initial checklist, derive readiness + lifecycle
 * from that checklist, and refresh the project's next-checkpoint cache. Meant to
 * run inside a transaction (the route wraps it).
 */
export async function createCheckpoint(
  runner: SqlRunner,
  args: CreateCheckpointArgs,
): Promise<{ id: string; readiness: number; lifecycle: CheckpointLifecycle }> {
  const id = randomUUID();
  const initial = args.requirements ?? [];
  const readiness = computeReadiness(
    initial.map((r) => ({ required: r.required, complete: r.complete })),
  );
  // `blocked` is a human statement and survives; otherwise the checklist decides.
  const lifecycle =
    args.lifecycle === "blocked" ? "blocked" : lifecycleForReadiness("planned", readiness);

  await mutate(
    runner,
    `INSERT INTO checkpoints
       (id, project_id, name, description, impact, checkpoint_type, lifecycle,
        due_date, start_date, end_date, owner_id, approver_id, readiness,
        version, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    [
      id,
      args.projectId,
      args.name,
      args.description ?? null,
      args.impact ?? null,
      args.checkpointType,
      lifecycle,
      args.dueDate,
      args.startDate ?? null,
      args.endDate ?? null,
      args.ownerId ?? null,
      args.approverId ?? null,
      readiness,
      args.actorId,
    ],
  );

  if (initial.length > 0) {
    await insertRequirements(runner, id, initial, args.actorId);
  }
  await refreshProjectNextCheckpoint(runner, args.projectId);
  return { id, readiness, lifecycle };
}

/** Do these user ids all exist in `app_users`? (FK pre-check with a real message) */
export async function usersExist(
  runner: SqlRunner,
  ids: ReadonlyArray<string>,
): Promise<boolean> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return true;
  const placeholders = unique.map(() => "?").join(", ");
  const found = await rows<{ id: string }>(
    runner,
    `SELECT id FROM app_users WHERE id IN (${placeholders})`,
    unique,
  );
  return found.length === unique.length;
}
