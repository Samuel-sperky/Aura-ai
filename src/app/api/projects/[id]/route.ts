// GET    /api/projects/[id] — project + the aggregates behind the 4 detail tabs
// PATCH  /api/projects/[id] — edit under optimistic concurrency
// DELETE /api/projects/[id] — HARD delete, admin only, code confirmation required
//
// GET response shape (`ProjectDetailDto`):
//   { project, stats: { workItems, checkpoints, sprints, decisions },
//     suggestedHealth, activity[] }
// The tabs "Položky" and "Checkpointy" fetch their ROWS from /api/work-items and
// /api/checkpoints; this route only supplies the counts that head each tab.

import { defineRoute, badRequest, notFound, versionConflict } from "@/lib/api/defineRoute";
import { jsonOk, jsonError } from "@/lib/api/respond";
import {
  deleteProject,
  getProject,
  getProjectDetail,
  updateProject,
} from "@/lib/domain/projects";
import {
  projectDeleteSchema,
  projectUpdateSchema,
} from "@/lib/domain/contracts/projects";
import { RATE_LIMITS } from "@/lib/security/rateLimit";

export const GET = defineRoute(
  {
    auth: { right: "projects.read" },
    rateLimit: RATE_LIMITS.read,
  },
  async ({ params }) => {
    const { id } = params as { id: string };
    const detail = await getProjectDetail(id);
    if (!detail) return notFound("Projekt sa nenašiel.");
    return jsonOk(detail);
  },
);

export const PATCH = defineRoute(
  {
    auth: { right: "projects.write" },
    rateLimit: RATE_LIMITS.write,
    bodySchema: projectUpdateSchema,
    // Lifts the numeric `version` out of the body into ctx.version (400 if absent).
    version: true,
  },
  async ({ user, body, version, params }) => {
    const { id } = params as { id: string };

    const result = await updateProject(id, body, version, user);
    if (result.ok) return jsonOk({ project: result.project });

    switch (result.reason) {
      case "not_found":
        return notFound("Projekt sa nenašiel.");
      case "conflict":
        return versionConflict(result.currentVersion);
      case "duplicate_code":
        return jsonError(`Projekt s kódom ${body.code} už existuje.`, 409);
    }
  },
);

export const DELETE = defineRoute(
  {
    // Admin-only right (spec Q21): the delete cascades to every child row.
    auth: { right: "projects.delete" },
    rateLimit: RATE_LIMITS.write,
    bodySchema: projectDeleteSchema,
  },
  async ({ user, body, params }) => {
    const { id } = params as { id: string };

    // The confirmation dialog makes the user TYPE the code; verify it server-side
    // so the guard is not merely a UI formality.
    const project = await getProject(id);
    if (!project) return notFound("Projekt sa nenašiel.");
    if (project.code !== body.code) {
      return badRequest("Kód projektu nesúhlasí — projekt nebol zmazaný.");
    }

    const result = await deleteProject(id, user);
    if (!result.ok) return notFound("Projekt sa nenašiel.");
    return jsonOk({ ok: true, project: result.project });
  },
);
