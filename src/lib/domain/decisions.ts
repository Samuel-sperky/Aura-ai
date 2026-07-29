// Decisions — the act of deciding a checkpoint, and the formal reopening of a
// decision. This is the core of the product's third pillar.
//
// THE ONE RULE EVERYTHING ELSE SERVES: a decision record is IMMUTABLE (spec Q36).
// There is no PATCH on `checkpoint_decisions` and no route that offers one. A
// decision is superseded, never edited:
//
//   decide  → INSERT a decision row, stamp the previous current row's
//             `superseded_by` with the new id.
//   reopen  → INSERT a `deferred` marker row (carrying the mandatory reason),
//             stamp the superseded decision, and put the checkpoint back in the
//             queue. The chain of rows IS the history.
//
// "The current decision of a checkpoint" is therefore always the row with
// `superseded_by IS NULL`, and the full chain is the audit-grade record of every
// position ever taken.
//
// ATOMICITY (spec Q37): deciding writes SIX things — the checkpoint state, the
// decision row, the baseline snapshot, the audit entry, the notification and (for
// `conditional_go`) the follow-up work item. They all go through the SAME
// `SqlRunner`, so the route can wrap them in `withTransaction()` and none of them
// can exist without the others. That includes the audit row: unlike the
// best-effort `audit()` helper, this path writes `audit_log` on the transaction
// connection, because "decided but no trace of who decided" is not a state this
// app is allowed to reach.

import { randomUUID } from "node:crypto";
import {
  buildNewValues,
  type AuditMetaEnvelope,
  type AuditSeverity,
} from "@/lib/auth/audit";
import { num } from "@/lib/domain/data";
import {
  FULL_READINESS,
  type CheckpointLifecycle,
  type CheckpointType,
  type DecisionOutcome,
} from "@/lib/domain/contracts/checkpoints";
import {
  isReadinessOverride,
  loadCheckpointGuard,
  lifecycleForReadiness,
  mutate,
  readinessOf,
  refreshProjectNextCheckpoint,
  rows,
  usersExist,
  validateDecisionGate,
  type DomainRejection,
  type SqlRunner,
} from "@/lib/domain/checkpoints";
import { createBaselineSnapshot } from "@/lib/domain/plans";
import { notifyUsers, userIdByDisplayName } from "@/lib/domain/notifications";

// ---------------------------------------------------------------------------
// Labels used inside stored notification text
// ---------------------------------------------------------------------------

/**
 * Slovak labels for the notification body.
 *
 * A notification stores RENDERED text, so it cannot be re-translated later. It is
 * written in the product's default language (SK, spec Q45). The UI labels for the
 * same vocabulary live in `src/lib/i18n/keys.checkpoints.ts` and are translated
 * normally — this constant exists only for text that is frozen at write time.
 */
export const OUTCOME_LABELS_SK: Readonly<Record<DecisionOutcome, string>> = {
  go: "Súhlas",
  conditional_go: "Podmienený súhlas",
  no_go: "Nesúhlas",
  deferred: "Odložené",
};

// ---------------------------------------------------------------------------
// Actor
// ---------------------------------------------------------------------------

/**
 * Everything the domain layer needs to know about who is acting. `ip` and
 * `userAgent` are DERIVED ON THE SERVER by the route (session + request headers)
 * and passed in — never taken from a request body, or the audit trail could be
 * forged by the party it is meant to hold accountable.
 */
export interface DecisionActor {
  id: string;
  email: string;
  displayName: string;
  /** Holds the `readiness.override` right (admin-only). */
  canOverrideReadiness: boolean;
  ip: string | null;
  userAgent: string | null;
}

// ---------------------------------------------------------------------------
// Audit inside the transaction
// ---------------------------------------------------------------------------

export interface TxAuditEntry {
  actor: Pick<DecisionActor, "id" | "email" | "ip" | "userAgent">;
  action: string;
  entity: string;
  entityId: string;
  oldValues?: unknown;
  newValues?: unknown;
  severity?: AuditSeverity;
  detail?: string | null;
  meta?: unknown;
}

/**
 * Write one `audit_log` row on the CALLER'S connection, so it commits or rolls
 * back with the operation it records.
 *
 * The row is byte-identical to what `audit()` / `auditAs()` produce: the extra
 * context (severity, detail, meta, user agent) goes into `new_values` under the
 * reserved `__audit` key via the same `buildNewValues()` helper, because
 * `audit_log` has no columns for it. `GET /api/audit` unwraps it either way.
 *
 * Unlike `audit()`, this one is NOT best-effort: if it throws, the caller's
 * transaction rolls back. That is the intended trade for the decision path.
 */
export async function writeAuditRow(
  runner: SqlRunner,
  entry: TxAuditEntry,
): Promise<void> {
  const envelope: AuditMetaEnvelope = {};
  if (entry.severity !== undefined) envelope.severity = entry.severity;
  if (entry.detail != null) envelope.detail = entry.detail;
  if (entry.meta !== undefined) envelope.meta = entry.meta;
  if (entry.actor.userAgent != null) envelope.userAgent = entry.actor.userAgent;

  const newValues = buildNewValues(entry.newValues, envelope);

  await mutate(
    runner,
    `INSERT INTO audit_log
       (user_id, username, action, entity, entity_id, old_values, new_values, ip)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.actor.id,
      entry.actor.email,
      entry.action,
      entry.entity,
      entry.entityId,
      entry.oldValues != null ? JSON.stringify(entry.oldValues) : null,
      newValues != null ? JSON.stringify(newValues) : null,
      entry.actor.ip,
    ],
  );
}

// ---------------------------------------------------------------------------
// Payload validation — pure
// ---------------------------------------------------------------------------

export interface DecisionPayload {
  outcome: DecisionOutcome;
  followUpTitle?: string | null;
  note?: string | null;
}

/**
 * Is the decision payload complete for its outcome? Returns `null` when yes.
 *
 * Today there is exactly one such rule, and it is a product rule rather than a
 * schema one (spec Q37d): `conditional_go` REQUIRES a follow-up work item, since
 * a conditional go whose condition is written down nowhere is just a go with
 * extra steps.
 *
 * `decideSchema` enforces the same thing, so the normal path fails in the zod
 * stage. This function is the defence for any caller that reaches the domain
 * layer another way, and it is what the unit test pins.
 */
export function validateDecisionPayload(
  payload: DecisionPayload,
): DomainRejection | null {
  if (payload.outcome === "conditional_go") {
    const title = (payload.followUpTitle ?? "").trim();
    if (title.length === 0) {
      return {
        status: 400,
        code: "FOLLOW_UP_REQUIRED",
        message:
          "Pri podmienenom súhlase je follow-up položka povinná — zadajte jej názov.",
      };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Decide
// ---------------------------------------------------------------------------

export interface DecideArgs {
  checkpointId: string;
  /** Client's view of `checkpoints.version` (optimistic concurrency). */
  expectedVersion: number;
  outcome: DecisionOutcome;
  note?: string | null;
  followUpTitle?: string | null;
  followUpAssigneeId?: string | null;
  followUpDueDate?: string | null;
  followUpPriority: "P1" | "P2" | "P3";
  /** Mandatory when readiness < 100 % and the actor may override. */
  overrideReason?: string | null;
  actor: DecisionActor;
  /** Local calendar day (`YYYY-MM-DD`) used for `plan_versions.baseline_date`. */
  today: string;
}

export interface DecideResult {
  checkpointId: string;
  decisionId: string;
  supersededDecisionIds: string[];
  planVersionId: string | null;
  followUpItemId: string | null;
  readiness: number;
  /** True when the 100 % rule was overridden (a second audit row is written). */
  override: boolean;
  notifiedUserIds: string[];
  version: number;
  lifecycle: CheckpointLifecycle;
}

/**
 * Record a decision on a checkpoint. Run it inside `withTransaction()`.
 *
 * Sequence (order is load-bearing):
 *   1. lock the checkpoint row (`FOR UPDATE`) so two approvers cannot both pass
 *      the version check,
 *   2. recompute readiness from the checklist — never trust the cached column
 *      when it is what opens the gate,
 *   3. validate the payload, then the gate (approver, `gate` four-eyes, 100 %
 *      readiness or a justified override),
 *   4. compare-and-swap the checkpoint to `decided`,
 *   5. INSERT the decision row and supersede the previous current one,
 *   6. baseline snapshot, follow-up item, notifications, audit.
 */
export async function decideCheckpoint(
  runner: SqlRunner,
  args: DecideArgs,
): Promise<DecideResult | DomainRejection> {
  const guard = await loadCheckpointGuard(runner, args.checkpointId, true);
  if (!guard) {
    return { status: 404, message: "Checkpoint sa nenašiel." };
  }
  const currentVersion = num(guard.version);
  if (currentVersion !== args.expectedVersion) {
    return {
      status: 409,
      code: "VERSION_CONFLICT",
      message: "Záznam sa medzičasom zmenil. Obnovte údaje a skúste to znova.",
      currentVersion,
    };
  }

  const { readiness } = await readinessOf(runner, args.checkpointId);

  const payloadError = validateDecisionPayload({
    outcome: args.outcome,
    followUpTitle: args.followUpTitle,
    note: args.note,
  });
  if (payloadError) return payloadError;

  const gateError = validateDecisionGate({
    checkpointType: guard.checkpoint_type as CheckpointType,
    lifecycle: guard.lifecycle as CheckpointLifecycle,
    readiness,
    ownerId: guard.owner_id,
    approverId: guard.approver_id,
    actorId: args.actor.id,
    canOverrideReadiness: args.actor.canOverrideReadiness,
    overrideReason: args.overrideReason,
  });
  if (gateError) return gateError;

  // The follow-up assignee is a client-supplied FK: check it before the writes so
  // a bad id is a 400, not a mid-transaction foreign key error.
  if (
    args.followUpAssigneeId &&
    !(await usersExist(runner, [args.followUpAssigneeId]))
  ) {
    return {
      status: 400,
      code: "UNKNOWN_ASSIGNEE",
      message: "Priradený používateľ follow-up položky neexistuje.",
    };
  }

  const affected = await mutate(
    runner,
    `UPDATE checkpoints
        SET lifecycle = 'decided', readiness = ?, decided_at = CURRENT_TIMESTAMP,
            version = version + 1, updated_at = CURRENT_TIMESTAMP, updated_by = ?
      WHERE id = ? AND version = ?`,
    [readiness, args.actor.id, args.checkpointId, args.expectedVersion],
  );
  if (affected === 0) {
    return {
      status: 409,
      code: "VERSION_CONFLICT",
      message: "Záznam sa medzičasom zmenil. Obnovte údaje a skúste to znova.",
      currentVersion,
    };
  }

  const decisionId = randomUUID();
  const note = (args.note ?? "").trim() || null;
  await mutate(
    runner,
    `INSERT INTO checkpoint_decisions
       (id, checkpoint_id, outcome, note, decided_by, decided_at)
     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [decisionId, args.checkpointId, args.outcome, note, args.actor.id],
  );
  const supersededDecisionIds = await supersedeCurrentDecisions(
    runner,
    args.checkpointId,
    decisionId,
  );

  const planVersionId = await createBaselineSnapshot(runner, {
    projectId: guard.project_id,
    checkpointName: guard.name,
    reason: {
      kind: "checkpoint_decision",
      checkpointId: args.checkpointId,
      outcome: args.outcome,
    },
    createdBy: args.actor.id,
    baselineDate: args.today,
  });

  let followUpItemId: string | null = null;
  if (args.outcome === "conditional_go") {
    followUpItemId = await createFollowUpItem(runner, {
      projectId: guard.project_id,
      checkpointId: args.checkpointId,
      title: (args.followUpTitle ?? "").trim(),
      assigneeId: args.followUpAssigneeId ?? guard.owner_id ?? null,
      dueDate: args.followUpDueDate ?? null,
      priority: args.followUpPriority,
      actorId: args.actor.id,
    });
  }

  // The checkpoint just left the "open" set, so the project's next-checkpoint
  // cache is now stale.
  await refreshProjectNextCheckpoint(runner, guard.project_id);

  const override = isReadinessOverride(readiness);
  const notifiedUserIds = await notifyDecision(runner, {
    projectId: guard.project_id,
    checkpointId: args.checkpointId,
    checkpointName: guard.name,
    ownerId: guard.owner_id,
    outcome: args.outcome,
    followUpTitle: followUpItemId ? (args.followUpTitle ?? "").trim() : null,
    override,
    actor: args.actor,
  });

  await writeAuditRow(runner, {
    actor: args.actor,
    action: "checkpoint.decide",
    entity: "checkpoints",
    entityId: args.checkpointId,
    severity: args.outcome === "no_go" ? "warning" : "success",
    detail: note,
    newValues: {
      outcome: args.outcome,
      decisionId,
      readiness,
      override,
      planVersionId,
      followUpItemId,
      supersededDecisionIds,
    },
  });

  // A second, separately searchable row for the override — the action key is what
  // an auditor filters on, and the reason is mandatory (spec Q34).
  if (override) {
    await writeAuditRow(runner, {
      actor: args.actor,
      action: "readiness.override",
      entity: "checkpoints",
      entityId: args.checkpointId,
      severity: "warning",
      detail: (args.overrideReason ?? "").trim(),
      newValues: {
        readiness,
        requiredReadiness: FULL_READINESS,
        outcome: args.outcome,
        decisionId,
      },
    });
  }

  return {
    checkpointId: args.checkpointId,
    decisionId,
    supersededDecisionIds,
    planVersionId,
    followUpItemId,
    readiness,
    override,
    notifiedUserIds,
    version: args.expectedVersion + 1,
    lifecycle: "decided",
  };
}

// ---------------------------------------------------------------------------
// Reopen
// ---------------------------------------------------------------------------

export interface ReopenArgs {
  checkpointId: string;
  expectedVersion: number;
  /** Mandatory: an unexplained reopen destroys the trail immutability protects. */
  reason: string;
  actor: DecisionActor;
}

export interface ReopenResult {
  checkpointId: string;
  /** The `deferred` marker row that now heads the chain. */
  decisionId: string;
  supersededDecisionIds: string[];
  readiness: number;
  version: number;
  lifecycle: CheckpointLifecycle;
  notifiedUserIds: string[];
}

/**
 * Formally reopen a decided checkpoint (spec Q36). Run it inside
 * `withTransaction()`.
 *
 * The previous decision is NOT deleted or edited. A new `deferred` row is
 * inserted carrying the reason, and the old row's `superseded_by` is stamped with
 * the new id — so the chain reads "we said go, then on this date, for this
 * reason, we put it back on the table".
 *
 * The checkpoint returns to the queue. Its lifecycle is DERIVED from readiness:
 * normally that is exactly `ready` (a decided checkpoint was at 100 %), but a
 * decision taken through a readiness override would otherwise come back labelled
 * "ready" while its checklist says otherwise.
 */
export async function reopenCheckpoint(
  runner: SqlRunner,
  args: ReopenArgs,
): Promise<ReopenResult | DomainRejection> {
  const guard = await loadCheckpointGuard(runner, args.checkpointId, true);
  if (!guard) {
    return { status: 404, message: "Checkpoint sa nenašiel." };
  }
  const currentVersion = num(guard.version);
  if (currentVersion !== args.expectedVersion) {
    return {
      status: 409,
      code: "VERSION_CONFLICT",
      message: "Záznam sa medzičasom zmenil. Obnovte údaje a skúste to znova.",
      currentVersion,
    };
  }
  if (guard.lifecycle !== "decided") {
    return {
      status: 409,
      code: "NOT_DECIDED",
      message: "Checkpoint nie je rozhodnutý — nie je čo znovu otvárať.",
    };
  }

  const reason = args.reason.trim();
  if (reason.length === 0) {
    return {
      status: 400,
      code: "REOPEN_REASON_REQUIRED",
      message: "Dôvod znovuotvorenia je povinný.",
    };
  }

  const { readiness } = await readinessOf(runner, args.checkpointId);
  const lifecycle = lifecycleForReadiness("ready", readiness);

  const affected = await mutate(
    runner,
    `UPDATE checkpoints
        SET lifecycle = ?, decided_at = NULL, version = version + 1,
            updated_at = CURRENT_TIMESTAMP, updated_by = ?
      WHERE id = ? AND version = ?`,
    [lifecycle, args.actor.id, args.checkpointId, args.expectedVersion],
  );
  if (affected === 0) {
    return {
      status: 409,
      code: "VERSION_CONFLICT",
      message: "Záznam sa medzičasom zmenil. Obnovte údaje a skúste to znova.",
      currentVersion,
    };
  }

  // The marker row: `deferred` is the vocabulary value for "back on the table".
  const decisionId = randomUUID();
  await mutate(
    runner,
    `INSERT INTO checkpoint_decisions
       (id, checkpoint_id, outcome, note, decided_by, decided_at)
     VALUES (?, ?, 'deferred', ?, ?, CURRENT_TIMESTAMP)`,
    [decisionId, args.checkpointId, reason, args.actor.id],
  );
  const supersededDecisionIds = await supersedeCurrentDecisions(
    runner,
    args.checkpointId,
    decisionId,
  );

  await refreshProjectNextCheckpoint(runner, guard.project_id);

  const projectOwnerId = await userIdByDisplayName(
    runner,
    await projectOwnerName(runner, guard.project_id),
  );
  const notifiedUserIds = await notifyUsers(runner, {
    candidateUserIds: [projectOwnerId, guard.owner_id, guard.approver_id],
    actorId: args.actor.id,
    title: `Znovuotvorené rozhodnutie: ${guard.name}`,
    body: `Rozhodnutie checkpointu „${guard.name}“ bolo formálne znovuotvorené. Dôvod: ${reason}`,
    entityType: "checkpoint",
    entityId: args.checkpointId,
  });

  await writeAuditRow(runner, {
    actor: args.actor,
    action: "checkpoint.reopen",
    entity: "checkpoints",
    entityId: args.checkpointId,
    severity: "warning",
    detail: reason,
    oldValues: { lifecycle: "decided" },
    newValues: { lifecycle, readiness, decisionId, supersededDecisionIds },
  });

  return {
    checkpointId: args.checkpointId,
    decisionId,
    supersededDecisionIds,
    readiness,
    version: args.expectedVersion + 1,
    lifecycle,
    notifiedUserIds,
  };
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

/**
 * Stamp every currently-un-superseded decision of a checkpoint (other than the
 * one just inserted) with `superseded_by = newDecisionId`. Returns the ids that
 * were superseded — normally zero or one row; the loop also repairs a checkpoint
 * that somehow ended up with several.
 *
 * This UPDATE is the ONLY mutation `checkpoint_decisions` ever takes.
 */
async function supersedeCurrentDecisions(
  runner: SqlRunner,
  checkpointId: string,
  newDecisionId: string,
): Promise<string[]> {
  const previous = await rows<{ id: string }>(
    runner,
    `SELECT id FROM checkpoint_decisions
      WHERE checkpoint_id = ? AND superseded_by IS NULL AND id <> ?`,
    [checkpointId, newDecisionId],
  );
  if (previous.length === 0) return [];
  await mutate(
    runner,
    `UPDATE checkpoint_decisions SET superseded_by = ?
      WHERE checkpoint_id = ? AND superseded_by IS NULL AND id <> ?`,
    [newDecisionId, checkpointId, newDecisionId],
  );
  return previous.map((r) => r.id);
}

/**
 * Create the mandatory `conditional_go` follow-up: a `task` work item linked to
 * the checkpoint, at the end of the project's backlog order.
 *
 * Priority defaults to P1 in the contract — a follow-up IS the condition the go
 * was granted on, so it outranks ordinary backlog.
 */
async function createFollowUpItem(
  runner: SqlRunner,
  args: {
    projectId: string;
    checkpointId: string;
    title: string;
    assigneeId: string | null;
    dueDate: string | null;
    priority: "P1" | "P2" | "P3";
    actorId: string;
  },
): Promise<string> {
  const rankRows = await rows<{ next_rank: number | string | null }>(
    runner,
    "SELECT COALESCE(MAX(rank_value), 0) + 10 AS next_rank FROM work_items WHERE project_id = ?",
    [args.projectId],
  );
  const id = randomUUID();
  await mutate(
    runner,
    `INSERT INTO work_items
       (id, project_id, sprint_id, checkpoint_id, parent_id, item_type, title,
        description, status, status_category, priority, story_points, rank_value,
        assignee_id, reporter_id, due_date, logged_minutes, version, created_by)
     VALUES (?, ?, NULL, ?, NULL, 'task', ?, ?, 'backlog', 'backlog', ?, 0, ?,
             ?, ?, ?, 0, 1, ?)`,
    [
      id,
      args.projectId,
      args.checkpointId,
      args.title,
      "Follow-up položka z podmieneného súhlasu checkpointu.",
      args.priority,
      num(rankRows[0]?.next_rank) || 10,
      args.assigneeId,
      args.actorId,
      args.dueDate,
      args.actorId,
    ],
  );
  return id;
}

/** `projects.owner` is a display name, not an id — see notifications.ts. */
async function projectOwnerName(
  runner: SqlRunner,
  projectId: string,
): Promise<string | null> {
  const found = await rows<{ owner: string | null }>(
    runner,
    "SELECT owner FROM projects WHERE id = ?",
    [projectId],
  );
  return found[0]?.owner ?? null;
}

/**
 * Notify the people who need to know a decision happened: the PROJECT OWNER
 * (spec Q37c) plus the checkpoint's own owner, minus whoever just decided.
 */
async function notifyDecision(
  runner: SqlRunner,
  args: {
    projectId: string;
    checkpointId: string;
    checkpointName: string;
    ownerId: string | null;
    outcome: DecisionOutcome;
    followUpTitle: string | null;
    override: boolean;
    actor: DecisionActor;
  },
): Promise<string[]> {
  const projectOwnerId = await userIdByDisplayName(
    runner,
    await projectOwnerName(runner, args.projectId),
  );
  const parts = [
    `Checkpoint „${args.checkpointName}“ má výsledok: ${OUTCOME_LABELS_SK[args.outcome]}.`,
  ];
  if (args.followUpTitle) parts.push(`Follow-up: ${args.followUpTitle}.`);
  if (args.override) {
    parts.push("Rozhodnuté s prelomením pravidla 100 % pripravenosti.");
  }
  parts.push(`Rozhodol: ${args.actor.displayName}.`);

  return notifyUsers(runner, {
    candidateUserIds: [projectOwnerId, args.ownerId],
    actorId: args.actor.id,
    title: `Rozhodnutie: ${args.checkpointName}`,
    body: parts.join(" "),
    entityType: "checkpoint",
    entityId: args.checkpointId,
  });
}
