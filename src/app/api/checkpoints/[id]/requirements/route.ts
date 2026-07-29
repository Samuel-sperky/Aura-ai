// GET /api/checkpoints/[id]/requirements — the readiness checklist
// PUT /api/checkpoints/[id]/requirements — replace it wholesale (bulk update)
//
// PUT is deliberately a full replace rather than a per-row PATCH: the checklist is
// edited as a list (rows added, ticked, renamed and REORDERED in one gesture), and
// a sequence of row patches cannot express a reorder atomically. Rows sent with an
// `id` are updated, rows without one are inserted, rows the payload omits are
// deleted, and `sort_order` is rewritten from the array order — so what the client
// sends is exactly what comes back.
//
// Every PUT recomputes readiness from the resulting rows and re-derives the
// lifecycle (100 % → `ready`, below → `planned`; `blocked` is sticky). All of it
// in one transaction with one compare-and-swap on `checkpoints.version`, so two
// people editing the same checklist produce a 409 instead of a silent overwrite.
//
// A DECIDED checkpoint's checklist is frozen: changing the conditions a recorded
// decision was made under would rewrite history behind an immutable record.

import { defineRoute, notFound } from "@/lib/api/defineRoute";
import { jsonOk } from "@/lib/api/respond";
import { withTransaction } from "@/lib/db";
import { auditAs } from "@/lib/auth/audit";
import {
  isRejection,
  loadCheckpoint,
  loadCheckpointGuard,
  poolRunner,
  refreshProjectNextCheckpoint,
  rejectionResponse,
  replaceRequirements,
  requirementsFor,
  syncCheckpointReadiness,
  viewerOf,
} from "@/lib/domain/checkpoints";
import {
  requirementsPutSchema,
  type CheckpointLifecycle,
} from "@/lib/domain/contracts/checkpoints";
import { num } from "@/lib/domain/data";
import { RATE_LIMITS } from "@/lib/security/rateLimit";

export const GET = defineRoute(
  {
    auth: { right: "checkpoints.read" },
    rateLimit: RATE_LIMITS.read,
  },
  async ({ params }) => {
    const { id } = params as { id: string };
    const guard = await loadCheckpointGuard(poolRunner, id);
    if (!guard) return notFound("Checkpoint sa nenašiel.");
    const requirements = await requirementsFor(poolRunner, id);
    return jsonOk({ checkpointId: id, requirements });
  },
);

export const PUT = defineRoute(
  {
    auth: { right: "checkpoints.write" },
    rateLimit: RATE_LIMITS.write,
    bodySchema: requirementsPutSchema,
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
          "Podmienky rozhodnutého checkpointu sa nedajú meniť. Najprv ho znovu otvorte.",
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

    const before = await requirementsFor(poolRunner, id);

    const result = await withTransaction(async (conn) => {
      const rejected = await replaceRequirements(
        conn,
        id,
        body.requirements,
        user.id,
      );
      if (rejected) return rejected;

      const synced = await syncCheckpointReadiness(conn, {
        checkpointId: id,
        currentLifecycle: guard.lifecycle as CheckpointLifecycle,
        expectedVersion: version,
        updatedBy: user.id,
      });
      if (isRejection(synced)) return synced;

      // Reaching (or losing) 100 % does not change which checkpoint is next, but
      // the cache is cheap to keep honest and the lifecycle just moved.
      await refreshProjectNextCheckpoint(conn, guard.project_id);
      return synced;
    });
    if (isRejection(result)) return rejectionResponse(result);

    await auditAs(user, {
      action: "checkpoint.requirements",
      entity: "checkpoint_requirements",
      entityId: id,
      severity: "info",
      oldValues: before.map((r) => ({
        label: r.label,
        required: r.required,
        complete: r.complete,
      })),
      newValues: {
        requirements: body.requirements.map((r) => ({
          label: r.label,
          required: r.required,
          complete: r.complete,
        })),
        readiness: result.readiness,
        lifecycle: result.lifecycle,
      },
      userAgent: req.headers.get("user-agent"),
    });

    const [checkpoint, requirements] = await Promise.all([
      loadCheckpoint(poolRunner, id, viewerOf(user)),
      requirementsFor(poolRunner, id),
    ]);
    return jsonOk({ checkpoint, requirements });
  },
);
