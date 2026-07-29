// GET    /api/work-items/[id]/dependencies — both directions (`work_items.read`)
// POST   /api/work-items/[id]/dependencies — add a `blocks` edge (`work_items.write`)
// DELETE /api/work-items/[id]/dependencies — remove one edge (`work_items.write`)
//
// There is exactly ONE relation type — "source BLOCKS target" — so the table has
// a composite primary key and no `dependency_type` / `lag_days` columns. Deleting
// therefore needs both ends: pass `?targetId=` (this item blocks it) or
// `?sourceId=` (it blocks this item).
//
// A new edge is refused when it would close a cycle: "A blocks B" plus "B blocks
// A" is a plan nobody can execute, and the timeline would loop forever drawing it.

import { defineRoute, badRequest, notFound } from "@/lib/api/defineRoute";
import { jsonOk, jsonError } from "@/lib/api/respond";
import { query, execute } from "@/lib/db";
import { auditAs } from "@/lib/auth/audit";
import { RATE_LIMITS } from "@/lib/security/rateLimit";
import {
  dependencyCreateSchema,
  dependencyDeleteQuerySchema,
} from "@/lib/domain/contracts/workItems";
import {
  dependencyEdgesForProject,
  loadDependencies,
  wouldCreateCycle,
} from "@/lib/domain/workItems";

async function projectIdOf(itemId: string): Promise<string | null> {
  const rows = await query<{ project_id: string }>(
    "SELECT project_id FROM work_items WHERE id = ?",
    [itemId],
  );
  return rows[0]?.project_id ?? null;
}

export const GET = defineRoute(
  { auth: { right: "work_items.read" }, rateLimit: RATE_LIMITS.read },
  async ({ params }) => {
    const { id } = params as { id: string };
    if (!(await projectIdOf(id))) return notFound("Položka neexistuje.");
    return jsonOk(await loadDependencies(id));
  },
);

export const POST = defineRoute(
  {
    auth: { right: "work_items.write" },
    rateLimit: RATE_LIMITS.write,
    bodySchema: dependencyCreateSchema,
  },
  async ({ user, body, params }) => {
    const { id } = params as { id: string };

    const projectId = await projectIdOf(id);
    if (!projectId) return notFound("Položka neexistuje.");

    const otherProjectId = await projectIdOf(body.targetId);
    if (!otherProjectId) return notFound("Prepojená položka neexistuje.");
    if (otherProjectId !== projectId) {
      return badRequest("Závislosť sa dá vytvoriť len v rámci jedného projektu.");
    }

    // Normalise to the stored direction: source blocks target.
    const sourceId = body.direction === "blocked_by" ? body.targetId : id;
    const targetId = body.direction === "blocked_by" ? id : body.targetId;

    if (sourceId === targetId) {
      return badRequest("Položka nemôže blokovať sama seba.");
    }

    const existing = await query<{ source_id: string }>(
      "SELECT source_id FROM work_item_dependencies WHERE source_id = ? AND target_id = ?",
      [sourceId, targetId],
    );
    if (existing.length > 0) {
      return jsonError("Táto závislosť už existuje.", 409);
    }

    const edges = await dependencyEdgesForProject(projectId);
    if (wouldCreateCycle(edges, { sourceId, targetId })) {
      return badRequest("Závislosť by vytvorila cyklus — položky by sa blokovali dokola.");
    }

    await execute(
      "INSERT INTO work_item_dependencies (source_id, target_id, created_by) VALUES (?, ?, ?)",
      [sourceId, targetId, user.id],
    );

    await auditAs(user, {
      action: "work_item_dependency.create",
      entity: "work_item_dependencies",
      entityId: `${sourceId}:${targetId}`,
      severity: "success",
      newValues: { sourceId, targetId, relation: "blocks" },
    });

    return jsonOk(await loadDependencies(id), { status: 201 });
  },
);

export const DELETE = defineRoute(
  {
    auth: { right: "work_items.write" },
    rateLimit: RATE_LIMITS.write,
    querySchema: dependencyDeleteQuerySchema,
  },
  async ({ user, query: q, params }) => {
    const { id } = params as { id: string };
    if (!(await projectIdOf(id))) return notFound("Položka neexistuje.");

    const sourceId = q.sourceId ?? id;
    const targetId = q.targetId ?? id;

    const res = await execute(
      "DELETE FROM work_item_dependencies WHERE source_id = ? AND target_id = ?",
      [sourceId, targetId],
    );
    if (res.affectedRows === 0) return notFound("Závislosť neexistuje.");

    await auditAs(user, {
      action: "work_item_dependency.delete",
      entity: "work_item_dependencies",
      entityId: `${sourceId}:${targetId}`,
      severity: "warning",
      oldValues: { sourceId, targetId, relation: "blocks" },
    });

    return jsonOk(await loadDependencies(id));
  },
);
