// POST /api/checkpoints/[id]/reopen — formally reopen a decided checkpoint.
//
// A decision is immutable (spec Q36): nothing edits or deletes a
// `checkpoint_decisions` row. Reopening INSERTS a new `deferred` marker row that
// carries the mandatory reason, stamps the previous decision's `superseded_by` with
// the marker's id, and puts the checkpoint back in the queue. The chain of rows is
// the record of every position ever taken.
//
// ADMIN ONLY. Reopening undoes something the app otherwise guarantees is final, so
// it sits above the ordinary `decisions.decide` right — an Editor who is the
// approver can decide, but cannot un-decide. (There is no `decisions.reopen` in the
// fixed 24-right catalog, so this is expressed as `auth: "admin"`.)
//
// The reason is required by the contract schema. An unexplained reopen would
// destroy exactly the value that immutability exists to protect.

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
  viewerOf,
} from "@/lib/domain/checkpoints";
import { reopenCheckpoint, type DecisionActor } from "@/lib/domain/decisions";
import { reopenSchema } from "@/lib/domain/contracts/checkpoints";
import { RATE_LIMITS } from "@/lib/security/rateLimit";

export const POST = defineRoute(
  {
    auth: "admin",
    rateLimit: RATE_LIMITS.write,
    bodySchema: reopenSchema,
    version: true,
  },
  async ({ user, body, version, params, req }) => {
    const { id } = params as { id: string };
    const viewer = viewerOf(user);

    const actor: DecisionActor = {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      canOverrideReadiness: viewer.canOverrideReadiness,
      ip: await clientIpFromHeaders(),
      userAgent: req.headers.get("user-agent"),
    };

    const result = await withTransaction((conn) =>
      reopenCheckpoint(conn, {
        checkpointId: id,
        expectedVersion: version,
        reason: body.reason,
        actor,
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
      supersededDecisionIds: result.supersededDecisionIds,
      notified: result.notifiedUserIds.length,
    });
  },
);
