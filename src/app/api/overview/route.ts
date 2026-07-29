// GET /api/overview — the whole Prehľad dashboard in ONE request.
//
// Replaces the seven parallel list reads the screen used to fire (`/api/projects`,
// `/api/checkpoints` ×2, `/api/sprints`, `/api/work-items` ×2, `/api/audit`).
// Rate-limit buckets are keyed by client IP, so those seven multiplied the cost of
// every dashboard load for a whole team behind one NAT address; see
// lib/domain/overview.ts for the full story. None of those endpoints changed —
// the dashboard simply stops calling them.
//
// `auth: "user"` is the gate, and the per-block right checks live in
// `getOverview()`: a caller without `audit.read` (admin-only) gets an EMPTY
// activity list rather than a 403, because the dashboard must render for an Editor
// and a Prehliadač too. Same rule for the other blocks, so the aggregate can never
// serve data around a denied page.
//
// `heavy` rate limit: this is one aggregating read, not a list.

import { defineRoute } from "@/lib/api/defineRoute";
import { jsonOk } from "@/lib/api/respond";
import { getOverview } from "@/lib/domain/overview";
import { RATE_LIMITS } from "@/lib/security/rateLimit";

export const GET = defineRoute(
  {
    auth: "user",
    rateLimit: RATE_LIMITS.heavy,
  },
  async ({ user }) => jsonOk(await getOverview(user)),
);
