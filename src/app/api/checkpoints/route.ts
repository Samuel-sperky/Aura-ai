// GET  /api/checkpoints — list / decision queue (right `checkpoints.read`)
// POST /api/checkpoints — create a checkpoint  (right `checkpoints.write`)
//
// GET serves both the timeline's Decisions mode and the /decisions page: pass
// `queue=1` for "everything still awaiting a decision, nearest deadline first"
// (spec Q9), and `mine=1` to narrow it to what is waiting on the caller. Every
// row carries `readiness`, the checklist counts, the current decision and a
// `canDecide` / `decisionBlockedReason` pair computed FOR THE CALLER.
//
// `canDecide` is a UX hint only. POST …/decide re-checks every rule server-side.

import { defineRoute, badRequest, notFound } from "@/lib/api/defineRoute";
import { jsonList, jsonOk } from "@/lib/api/respond";
import { withTransaction } from "@/lib/db";
import { auditAs } from "@/lib/auth/audit";
import { pageMeta } from "@/lib/domain/data";
import {
  createCheckpoint,
  listCheckpoints,
  loadCheckpoint,
  poolRunner,
  rows,
  usersExist,
  viewerOf,
} from "@/lib/domain/checkpoints";
import {
  checkpointCreateSchema,
  checkpointListQuerySchema,
} from "@/lib/domain/contracts/checkpoints";
import { RATE_LIMITS } from "@/lib/security/rateLimit";

export const GET = defineRoute(
  {
    auth: { right: "checkpoints.read" },
    rateLimit: RATE_LIMITS.read,
    querySchema: checkpointListQuerySchema,
  },
  async ({ user, query: q }) => {
    const result = await listCheckpoints(poolRunner, q, viewerOf(user));
    return jsonList(result.items, pageMeta(result.pagination, result.total));
  },
);

export const POST = defineRoute(
  {
    auth: { right: "checkpoints.write" },
    rateLimit: RATE_LIMITS.write,
    bodySchema: checkpointCreateSchema,
  },
  async ({ user, body }) => {
    const projectRows = await rows<{ id: string; code: string }>(
      poolRunner,
      "SELECT id, code FROM projects WHERE id = ?",
      [body.projectId],
    );
    const project = projectRows[0];
    if (!project) return notFound("Projekt sa nenašiel.");

    // Pre-check the two optional user FKs so a bad id is a clean 400 instead of a
    // foreign key error surfacing as a 500.
    const userIds = [body.ownerId, body.approverId].filter(
      (v): v is string => typeof v === "string",
    );
    if (!(await usersExist(poolRunner, userIds))) {
      return badRequest("Vlastník alebo schvaľovateľ neexistuje.");
    }

    // The checkpoint, its initial checklist and the project's next-checkpoint
    // cache move together.
    const created = await withTransaction((conn) =>
      createCheckpoint(conn, {
        projectId: body.projectId,
        name: body.name,
        description: body.description ?? null,
        impact: body.impact ?? null,
        checkpointType: body.checkpointType,
        lifecycle: body.lifecycle,
        dueDate: body.dueDate,
        startDate: body.startDate ?? null,
        endDate: body.endDate ?? null,
        ownerId: body.ownerId ?? null,
        approverId: body.approverId ?? null,
        requirements: body.requirements,
        actorId: user.id,
      }),
    );

    await auditAs(user, {
      action: "checkpoint.create",
      entity: "checkpoints",
      entityId: created.id,
      severity: "success",
      newValues: {
        projectId: body.projectId,
        projectCode: project.code,
        name: body.name,
        checkpointType: body.checkpointType,
        lifecycle: created.lifecycle,
        dueDate: body.dueDate,
        ownerId: body.ownerId ?? null,
        approverId: body.approverId ?? null,
        readiness: created.readiness,
        requirements: body.requirements?.length ?? 0,
      },
    });

    const checkpoint = await loadCheckpoint(
      poolRunner,
      created.id,
      viewerOf(user),
    );
    return jsonOk({ checkpoint }, { status: 201 });
  },
);
