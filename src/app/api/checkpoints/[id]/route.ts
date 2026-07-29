// GET    /api/checkpoints/[id] — detail + checklist + full decision history
// PATCH  /api/checkpoints/[id] — edit (right `checkpoints.write`, optimistic)
// DELETE /api/checkpoints/[id] — remove (see the rule below)
//
// IMMUTABILITY BOUNDARY: a DECIDED checkpoint cannot be PATCHed. Moving the due
// date or swapping the approver under a decision that has already been recorded
// would rewrite the context of an immutable record. Reopen it first (…/reopen),
// which leaves a `deferred` marker in the decision chain saying why.
//
// DELETE has a two-tier rule. `checkpoints.write` (Editor) may delete a checkpoint
// that was never decided. Deleting a DECIDED one cascades away its
// `checkpoint_decisions` rows — that is history destruction, so it needs `admin`.
// Linked work items survive either way: `work_items.checkpoint_id` is ON DELETE
// SET NULL, so a follow-up outlives the checkpoint that produced it.

import { defineRoute, badRequest, notFound } from "@/lib/api/defineRoute";
import { jsonOk } from "@/lib/api/respond";
import { withTransaction } from "@/lib/db";
import { auditAs } from "@/lib/auth/audit";
import { isAdmin } from "@/lib/auth/rbac";
import {
  decisionHistory,
  loadCheckpoint,
  loadCheckpointGuard,
  mutate,
  poolRunner,
  readinessOf,
  refreshProjectNextCheckpoint,
  rejectionResponse,
  requirementsFor,
  rows,
  usersExist,
  viewerOf,
} from "@/lib/domain/checkpoints";
import {
  checkpointUpdateSchema,
  FULL_READINESS,
} from "@/lib/domain/contracts/checkpoints";
import { num } from "@/lib/domain/data";
import { RATE_LIMITS } from "@/lib/security/rateLimit";

export const GET = defineRoute(
  {
    auth: { right: "checkpoints.read" },
    rateLimit: RATE_LIMITS.read,
  },
  async ({ user, params }) => {
    const { id } = params as { id: string };
    const checkpoint = await loadCheckpoint(poolRunner, id, viewerOf(user));
    if (!checkpoint) return notFound("Checkpoint sa nenašiel.");
    const [requirements, decisions] = await Promise.all([
      requirementsFor(poolRunner, id),
      decisionHistory(poolRunner, id),
    ]);
    // `decisions` is the whole chain, newest first: the current one plus every
    // superseded position. There is no endpoint that edits any of them.
    return jsonOk({ checkpoint, requirements, decisions });
  },
);

/** Columns a PATCH may touch, mapped from the contract's camelCase field names. */
const UPDATABLE: ReadonlyArray<{
  field:
    | "name"
    | "description"
    | "impact"
    | "checkpointType"
    | "lifecycle"
    | "dueDate"
    | "startDate"
    | "endDate"
    | "ownerId"
    | "approverId";
  column: string;
}> = [
  { field: "name", column: "name" },
  { field: "description", column: "description" },
  { field: "impact", column: "impact" },
  { field: "checkpointType", column: "checkpoint_type" },
  { field: "lifecycle", column: "lifecycle" },
  { field: "dueDate", column: "due_date" },
  { field: "startDate", column: "start_date" },
  { field: "endDate", column: "end_date" },
  { field: "ownerId", column: "owner_id" },
  { field: "approverId", column: "approver_id" },
];

export const PATCH = defineRoute(
  {
    auth: { right: "checkpoints.write" },
    rateLimit: RATE_LIMITS.write,
    bodySchema: checkpointUpdateSchema,
    version: true,
  },
  async ({ user, body, version, params, req }) => {
    const { id } = params as { id: string };

    const guard = await loadCheckpointGuard(poolRunner, id);
    if (!guard) return notFound("Checkpoint sa nenašiel.");

    if (guard.lifecycle === "decided") {
      return rejectionResponse({
        status: 409,
        code: "ALREADY_DECIDED",
        message:
          "Rozhodnutý checkpoint sa nedá upraviť. Najprv ho znovu otvorte.",
      });
    }
    const currentVersion = num(guard.version);
    if (currentVersion !== version) {
      return rejectionResponse({
        status: 409,
        code: "VERSION_CONFLICT",
        message: "Záznam sa medzičasom zmenil. Obnovte údaje a skúste to znova.",
        currentVersion,
      });
    }

    const userIds = [body.ownerId, body.approverId].filter(
      (v): v is string => typeof v === "string",
    );
    if (!(await usersExist(poolRunner, userIds))) {
      return badRequest("Vlastník alebo schvaľovateľ neexistuje.");
    }

    // `ready` is a claim about the checklist, not a free-form label: it may only
    // be set when the required conditions really are all complete.
    if (body.lifecycle === "ready") {
      const { readiness } = await readinessOf(poolRunner, id);
      if (readiness < FULL_READINESS) {
        return rejectionResponse({
          status: 422,
          code: "NOT_READY",
          message:
            'Stav „pripravené“ sa dá nastaviť až keď sú všetky povinné podmienky splnené.',
        });
      }
    }

    const sets: string[] = [];
    const values: unknown[] = [];
    const changed: Record<string, unknown> = {};
    for (const { field, column } of UPDATABLE) {
      const value = body[field];
      if (value === undefined) continue;
      // Empty prose fields are stored as NULL, not as an empty string.
      const normalized = value === "" ? null : (value ?? null);
      sets.push(`\`${column}\` = ?`);
      values.push(normalized);
      changed[field] = normalized;
    }
    if (sets.length === 0) return badRequest("Nie je čo zmeniť.");

    const before = {
      name: guard.name,
      checkpointType: guard.checkpoint_type,
      lifecycle: guard.lifecycle,
      dueDate: guard.due_date,
      ownerId: guard.owner_id,
      approverId: guard.approver_id,
    };

    const affected = await withTransaction(async (conn) => {
      const n = await mutate(
        conn,
        `UPDATE checkpoints
            SET ${sets.join(", ")}, version = version + 1,
                updated_at = CURRENT_TIMESTAMP, updated_by = ?
          WHERE id = ? AND version = ?`,
        [...values, user.id, id, version],
      );
      if (n === 0) return 0;
      // Due date or lifecycle may have moved the project's nearest open checkpoint.
      await refreshProjectNextCheckpoint(conn, guard.project_id);
      return n;
    });
    if (affected === 0) {
      return rejectionResponse({
        status: 409,
        code: "VERSION_CONFLICT",
        message: "Záznam sa medzičasom zmenil. Obnovte údaje a skúste to znova.",
        currentVersion,
      });
    }

    await auditAs(user, {
      action: "checkpoint.update",
      entity: "checkpoints",
      entityId: id,
      severity: "info",
      oldValues: before,
      newValues: changed,
      userAgent: req.headers.get("user-agent"),
    });

    const checkpoint = await loadCheckpoint(poolRunner, id, viewerOf(user));
    return jsonOk({ checkpoint });
  },
);

export const DELETE = defineRoute(
  {
    auth: { right: "checkpoints.write" },
    rateLimit: RATE_LIMITS.write,
  },
  async ({ user, params, req }) => {
    const { id } = params as { id: string };
    const guard = await loadCheckpointGuard(poolRunner, id);
    if (!guard) return notFound("Checkpoint sa nenašiel.");

    const decisions = await rows<{ n: number | string }>(
      poolRunner,
      "SELECT COUNT(*) AS n FROM checkpoint_decisions WHERE checkpoint_id = ?",
      [id],
    );
    const decisionCount = num(decisions[0]?.n);
    if (decisionCount > 0 && !isAdmin(user)) {
      return rejectionResponse({
        status: 403,
        code: "DECIDED_ADMIN_ONLY",
        message:
          "Checkpoint s rozhodnutím môže zmazať len administrátor — rozhodnutia sú súčasťou histórie.",
      });
    }

    await withTransaction(async (conn) => {
      // Requirements and decisions go with it (ON DELETE CASCADE); work items keep
      // existing with checkpoint_id = NULL (ON DELETE SET NULL).
      await mutate(conn, "DELETE FROM checkpoints WHERE id = ?", [id]);
      await refreshProjectNextCheckpoint(conn, guard.project_id);
    });

    // Hard delete + audit is the only record that this existed: there is no
    // soft delete anywhere in this app (contract §3.2/21).
    await auditAs(user, {
      action: "checkpoint.delete",
      entity: "checkpoints",
      entityId: id,
      severity: "critical",
      oldValues: {
        projectId: guard.project_id,
        name: guard.name,
        checkpointType: guard.checkpoint_type,
        lifecycle: guard.lifecycle,
        dueDate: guard.due_date,
        decisionCount,
      },
      userAgent: req.headers.get("user-agent"),
    });

    return jsonOk({ ok: true });
  },
);
