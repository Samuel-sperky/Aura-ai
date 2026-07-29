// GET /api/plans — baseline plan snapshots, newest first.
//
// A baseline is written automatically whenever a checkpoint decision is recorded
// (spec Q37a): the frozen state of that project — its row, checkpoints, sprints and
// work items — at the moment of the decision. Putting one next to the live data is
// how "plan vs reality" is answered without a second history table per entity.
//
// THERE IS NO POST. Baselines are a by-product of deciding, not something you
// create by hand, and the source app's draft/publish workflow is out of scope
// (contract §5.2). That also means nothing ever edits a snapshot.
//
// Gated on `projects.read`: a snapshot is project plan data, and the fixed
// 24-right catalog has no separate `plans.*` right.
//
// `include=snapshot` attaches the full payload and the contract caps the page size
// at 20 — one snapshot can hold thousands of work items.

import { defineRoute } from "@/lib/api/defineRoute";
import { jsonList } from "@/lib/api/respond";
import { pageMeta, toPagination } from "@/lib/domain/data";
import { poolRunner } from "@/lib/domain/checkpoints";
import { listPlans } from "@/lib/domain/plans";
import { planListQuerySchema } from "@/lib/domain/contracts/checkpoints";
import { RATE_LIMITS } from "@/lib/security/rateLimit";

export const GET = defineRoute(
  {
    auth: { right: "projects.read" },
    // The JSON_EXTRACT projection makes this heavier than an ordinary list read.
    rateLimit: RATE_LIMITS.heavy,
    querySchema: planListQuerySchema,
  },
  async ({ query: q }) => {
    const pg = toPagination(q.page, q.pageSize);
    const { items, total } = await listPlans(poolRunner, {
      projectId: q.projectId,
      checkpointId: q.checkpointId,
      includeSnapshot: q.include === "snapshot",
      limit: pg.limit,
      offset: pg.offset,
    });
    return jsonList(items, pageMeta(pg, total));
  },
);
