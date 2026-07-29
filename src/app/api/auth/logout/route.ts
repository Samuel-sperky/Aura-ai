// POST /api/auth/logout
//
// A REAL logout: the `app_sessions` row is revoked, so the cookie is worthless
// from the next request on even if a copy of it was captured. (Branch A of the
// family only deletes the cookie, which leaves a valid bearer token in the wild.)
// Not CSRF-exempt — a forged cross-origin logout is still an attack on the user.

import { defineRoute } from "@/lib/api/defineRoute";
import { jsonOk } from "@/lib/api/respond";
import { destroySession } from "@/lib/auth/session";
import { audit } from "@/lib/auth/audit";

export const POST = defineRoute({ auth: "user" }, async ({ user }) => {
  await destroySession();
  await audit({
    userId: user.id,
    userEmail: user.email,
    action: "logout",
    entity: "app_users",
    entityId: user.id,
  });
  return jsonOk({ ok: true });
});
