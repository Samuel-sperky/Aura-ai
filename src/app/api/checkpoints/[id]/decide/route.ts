// POST /api/checkpoints/[id]/decide — record a decision on a checkpoint.
//
// This is the single most consequential endpoint in the app, so the whole rule set
// is re-checked here regardless of what the client believed (spec Q34/35/36/37/41):
//
//   * right `decisions.decide` (Admin + Editor; a Viewer never), AND the caller
//     must be the checkpoint's named `approver` — holding the right is necessary,
//     not sufficient. Even an admin who is not the approver gets a 403.
//   * readiness must be 100 %, recomputed from the checklist rather than read from
//     the cached column. A holder of `readiness.override` may go below, but only
//     with a reason, which lands in `audit_log` under `readiness.override`.
//   * type `gate` only: the approver must differ from the owner.
//   * an already-decided checkpoint is refused — a decision is immutable, use
//     …/reopen.
//   * `conditional_go` requires `followUpTitle`; the follow-up work item is created
//     as part of the same transaction.
//
// EVERYTHING COMMITS TOGETHER (`withTransaction`): checkpoint state, decision row,
// baseline snapshot, audit row(s), notifications and the follow-up item. A decided
// checkpoint with no trace of who decided it is not a reachable state.

import { defineRoute } from "@/lib/api/defineRoute";
import { jsonOk } from "@/lib/api/respond";
import { withTransaction } from "@/lib/db";
import { clientIpFromHeaders } from "@/lib/auth/audit";
import {
  decisionHistory,
  isRejection,
  loadCheckpoint,
  poolRunner,
  rejectionResponse,
  todayLocalDate,
  viewerOf,
} from "@/lib/domain/checkpoints";
import { decideCheckpoint, type DecisionActor } from "@/lib/domain/decisions";
import { decideSchema } from "@/lib/domain/contracts/checkpoints";
import { RATE_LIMITS } from "@/lib/security/rateLimit";

export const POST = defineRoute(
  {
    auth: { right: "decisions.decide" },
    rateLimit: RATE_LIMITS.write,
    bodySchema: decideSchema,
    version: true,
  },
  async ({ user, body, version, params, req }) => {
    const { id } = params as { id: string };
    const viewer = viewerOf(user);

    // IP and User-Agent are derived here, on the server, and passed down. They are
    // never read from the body: a client that can stamp its own audit row can
    // forge the trail meant to hold it accountable.
    const actor: DecisionActor = {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      canOverrideReadiness: viewer.canOverrideReadiness,
      ip: await clientIpFromHeaders(),
      userAgent: req.headers.get("user-agent"),
    };

    const result = await withTransaction((conn) =>
      decideCheckpoint(conn, {
        checkpointId: id,
        expectedVersion: version,
        outcome: body.outcome,
        note: body.note ?? null,
        followUpTitle: body.followUpTitle ?? null,
        followUpAssigneeId: body.followUpAssigneeId ?? null,
        followUpDueDate: body.followUpDueDate ?? null,
        followUpPriority: body.followUpPriority,
        overrideReason: body.overrideReason ?? null,
        actor,
        today: todayLocalDate(),
      }),
    );
    if (isRejection(result)) return rejectionResponse(result);

    const [checkpoint, decisions] = await Promise.all([
      loadCheckpoint(poolRunner, id, viewer),
      decisionHistory(poolRunner, id),
    ]);

    return jsonOk({
      checkpoint,
      decisions,
      decisionId: result.decisionId,
      planVersionId: result.planVersionId,
      followUpItemId: result.followUpItemId,
      readiness: result.readiness,
      override: result.override,
      notified: result.notifiedUserIds.length,
    });
  },
);
