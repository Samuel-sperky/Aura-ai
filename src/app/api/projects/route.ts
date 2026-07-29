// GET  /api/projects — the project list (right `projects.read`)
// POST /api/projects — create a project (right `projects.write`)
//
// The default order is RISK-FIRST (spec Q2): health rank, then the nearest
// checkpoint. A list that opens on "what is on fire" is the whole point of the
// page, so the client does not have to ask for it.

import { defineRoute } from "@/lib/api/defineRoute";
import { jsonList, jsonOk, jsonError } from "@/lib/api/respond";
import { pageMeta, toPagination } from "@/lib/domain/data";
import { createProject, listProjects } from "@/lib/domain/projects";
import {
  projectCreateSchema,
  projectListQuerySchema,
} from "@/lib/domain/contracts/projects";
import { RATE_LIMITS } from "@/lib/security/rateLimit";

export const GET = defineRoute(
  {
    auth: { right: "projects.read" },
    rateLimit: RATE_LIMITS.read,
    querySchema: projectListQuerySchema,
  },
  async ({ query: q }) => {
    const pg = toPagination(q.page, q.pageSize);
    const { items, total } = await listProjects(q, pg);
    return jsonList(items, pageMeta(pg, total));
  },
);

export const POST = defineRoute(
  {
    auth: { right: "projects.write" },
    rateLimit: RATE_LIMITS.write,
    bodySchema: projectCreateSchema,
  },
  async ({ user, body }) => {
    const result = await createProject(body, user);
    if (!result.ok) {
      return jsonError(`Projekt s kódom ${body.code} už existuje.`, 409);
    }
    return jsonOk({ project: result.project }, { status: 201 });
  },
);
