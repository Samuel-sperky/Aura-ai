// POST /api/auth/change-password  { currentPassword, newPassword }
//
// Self-service (contract #78). Requires the CURRENT password even though the
// caller is already authenticated — otherwise a hijacked session could lock the
// real owner out of their own account.
//
// On success every OTHER session of this user is revoked (the tab performing the
// change stays signed in). A password change is a security event: any session
// opened with the old secret must die with it.

import { defineRoute, badRequest } from "@/lib/api/defineRoute";
import { jsonOk, jsonError } from "@/lib/api/respond";
import { query, execute } from "@/lib/db";
import {
  verifyPassword,
  hashPassword,
  PasswordPolicyError,
} from "@/lib/auth/pin";
import {
  getSession,
  destroyAllSessionsForUser,
} from "@/lib/auth/session";
import { audit } from "@/lib/auth/audit";
import { changePasswordSchema } from "@/lib/domain/contracts/auth";
import { RATE_LIMITS } from "@/lib/security/rateLimit";

export const POST = defineRoute(
  {
    auth: "user",
    rateLimit: RATE_LIMITS.write,
    bodySchema: changePasswordSchema,
  },
  async ({ user, body }) => {
    const { currentPassword, newPassword } = body;

    // `pin_hash` is the family column name; it holds the argon2id password hash.
    const rows = await query<{ pin_hash: string | null }>(
      "SELECT pin_hash FROM app_users WHERE id = ?",
      [user.id],
    );
    const currentHash = rows[0]?.pin_hash ?? null;

    if (!(await verifyPassword(currentHash, currentPassword))) {
      await audit({
        userId: user.id,
        userEmail: user.email,
        action: "password.change.fail",
        entity: "app_users",
        entityId: user.id,
        severity: "warning",
        detail: "Nesprávne súčasné heslo.",
      });
      return jsonError("Súčasné heslo je nesprávne.", 403);
    }

    let newHash: string;
    try {
      newHash = await hashPassword(newPassword);
    } catch (err) {
      if (err instanceof PasswordPolicyError) return badRequest(err.message);
      throw err;
    }

    await execute(
      `UPDATE app_users
          SET pin_hash = ?, updated_at = NOW(), updated_by = ?
        WHERE id = ?`,
      [newHash, user.id, user.id],
    );

    // Keep the caller's own session; kill every other one.
    const session = await getSession();
    const revoked = await destroyAllSessionsForUser(
      user.id,
      session?.sessionId,
    );

    await audit({
      userId: user.id,
      userEmail: user.email,
      action: "password.change",
      entity: "app_users",
      entityId: user.id,
      severity: "success",
      // Never log the password itself — only that it changed and what it cost.
      meta: { revokedSessions: revoked },
    });

    return jsonOk({ ok: true, revokedSessions: revoked });
  },
);
