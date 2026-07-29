// GET /api/auth/me — the current user plus their effective rights.
//
// The client uses `rights` to decide which controls to render. That is a UX hint
// only: every mutation is independently gated server-side by `defineRoute`.
// Because the session JWT carries no role/rights claims, this always reflects the
// CURRENT DB state — a right revoked a second ago is gone from the next response.

import { defineRoute } from "@/lib/api/defineRoute";
import { jsonOk } from "@/lib/api/respond";
import { toPublicUser } from "@/lib/auth/rbac";

export const GET = defineRoute({ auth: "user" }, async ({ user }) =>
  jsonOk({ user: toPublicUser(user) }),
);
