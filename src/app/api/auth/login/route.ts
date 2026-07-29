// POST /api/auth/login  { email, password }
//
// The only public, CSRF-exempt endpoint in the app. Defence order matters:
//   1. rateLimit (defineRoute)  — cheap in-memory throttle, 10/min.
//   2. lockout check            — DB-backed, BEFORE any argon2 work, so a locked
//                                 account costs a COUNT instead of 19 MiB of
//                                 hashing per attempt. → 423 Locked.
//   3. verify                   — argon2id; runs even for an unknown e-mail so the
//                                 response time does not enumerate accounts.
//   4. record the attempt       — every attempt, success or failure.
//
// The failure message is intentionally identical for "no such e-mail", "wrong
// password" and "deactivated account".

import { defineRoute } from "@/lib/api/defineRoute";
import { jsonOk, jsonError } from "@/lib/api/respond";
import { query, execute } from "@/lib/db";
import { loadUserByEmail, toPublicUser } from "@/lib/auth/rbac";
import { createSession } from "@/lib/auth/session";
import {
  verifyPassword,
  recordAttempt,
  isLockedOut,
  clearFailedAttempts,
  LOCKOUT_WINDOW_MINUTES,
} from "@/lib/auth/pin";
import { audit, clientIpFromHeaders } from "@/lib/auth/audit";
import { ensureBootstrapAdminIfEmpty } from "@/lib/auth/bootstrap";
import { loginSchema } from "@/lib/domain/contracts/auth";
import { RATE_LIMITS } from "@/lib/security/rateLimit";

/** Same answer for every failure mode — no account enumeration. */
const GENERIC_FAILURE = "Nesprávny e-mail alebo heslo.";

export const POST = defineRoute(
  { rateLimit: RATE_LIMITS.login, bodySchema: loginSchema },
  async ({ body }) => {
    const { email, password } = body;
    const ip = await clientIpFromHeaders();

    // Fresh deployment that was never seeded: create the built-in roles and the
    // env-configured admin. No-op (and memoised) once any user exists.
    await ensureBootstrapAdminIfEmpty();

    if (await isLockedOut(email, ip)) {
      await audit({
        userEmail: email,
        action: "login.locked",
        entity: "app_users",
        severity: "warning",
      });
      return jsonError(
        `Priveľa neúspešných pokusov. Skúste znova o ${LOCKOUT_WINDOW_MINUTES} minút.`,
        423,
      );
    }

    const user = await loadUserByEmail(email);

    // The password hash is deliberately absent from the AppUser shape; read it
    // with a targeted query so it never travels through the RBAC layer.
    // (`pin_hash` is the family column name — it holds the argon2id PASSWORD hash.)
    let passwordHash: string | null = null;
    if (user) {
      const rows = await query<{ pin_hash: string | null }>(
        "SELECT pin_hash FROM app_users WHERE id = ?",
        [user.id],
      );
      passwordHash = rows[0]?.pin_hash ?? null;
    }

    // Runs against null → false for an unknown/inactive user, keeping the timing
    // profile roughly constant.
    const passwordOk = await verifyPassword(passwordHash, password);
    const ok = !!user && user.active && passwordOk;

    await recordAttempt(email, ip, ok);

    if (!ok || !user) {
      await audit({
        userId: user?.id ?? null,
        userEmail: email,
        action: "login.fail",
        entity: "app_users",
        severity: "warning",
      });
      return jsonError(GENERIC_FAILURE, 401);
    }

    await clearFailedAttempts(email, ip);
    await execute("UPDATE app_users SET last_login = NOW() WHERE id = ?", [
      user.id,
    ]);
    await createSession(user.id);
    await audit({
      userId: user.id,
      userEmail: user.email,
      action: "login.success",
      entity: "app_users",
      entityId: user.id,
      severity: "success",
    });

    // Re-load so the response carries the fresh last_login.
    const fresh = (await loadUserByEmail(email)) ?? user;
    return jsonOk({ user: toPublicUser(fresh) });
  },
);
