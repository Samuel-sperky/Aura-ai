// GET /api/areas — the areas in use, for the project filter (right `projects.read`)
//
// There is no `areas` table (contract Q52: one grouping level, `area`, replacing
// portfolio + program). An area exists exactly as long as a project carries it,
// so this endpoint derives the list from `projects` and can never drift.

import { defineRoute } from "@/lib/api/defineRoute";
import { jsonList } from "@/lib/api/respond";
import { MAX_PAGE_SIZE, pageMeta, toPagination } from "@/lib/domain/data";
import { listAreas } from "@/lib/domain/projects";
import { RATE_LIMITS } from "@/lib/security/rateLimit";

export const GET = defineRoute(
  {
    auth: { right: "projects.read" },
    rateLimit: RATE_LIMITS.read,
  },
  async () => {
    const items = await listAreas();
    // Unpaginated by nature (a handful of areas), but the envelope stays the
    // canonical `{ items, pagination }` so the client needs no special case.
    return jsonList(items, pageMeta(toPagination(1, MAX_PAGE_SIZE), items.length));
  },
);
