// GET    /api/admin/users/[id] — read one user   (right `users.manage`)
// PATCH  /api/admin/users/[id] — update a user   (right `users.manage`)
// DELETE /api/admin/users/[id] — hard-delete     (right `users.manage`)
//
// LOCKOUT SAFETY: the app has no back door (no dev secret, no localhost
// exemption), so it must refuse the three ways an administrator could strand the
// installation with nobody able to manage it — demoting, deactivating or deleting
// the LAST active admin. Deleting yourself is refused too.
//
// SESSION HYGIENE: an admin-set password or a deactivation revokes every session
// of the target user. A role change does not need to: the session JWT carries no
// rights, so the new role applies on the target's very next request.
//
// There is no soft delete in this app (contract #21) — DELETE is a hard delete
// and `audit_log` is the only record the account ever existed.

import { defineRoute, notFound, badRequest } from "@/lib/api/defineRoute";
import { jsonOk, jsonError, jsonNoContent } from "@/lib/api/respond";
import { query, execute } from "@/lib/db";
import {
  USER_SELECT,
  initialsOf,
  mapUserRow,
  toPublicUser,
  type AppUser,
  type UserJoinRow,
} from "@/lib/auth/rbac";
import { hashPassword, PasswordPolicyError } from "@/lib/auth/pin";
import { destroyAllSessionsForUser } from "@/lib/auth/session";
import { roleIdByKey } from "@/lib/auth/bootstrap";
import { audit } from "@/lib/auth/audit";
import { userUpdateSchema } from "@/lib/domain/contracts/auth";
import { RATE_LIMITS } from "@/lib/security/rateLimit";

const USERS_RIGHT = { right: "users.manage" } as const;

async function loadTarget(id: string): Promise<AppUser | null> {
  const rows = await query<UserJoinRow>(`${USER_SELECT} WHERE u.id = ?`, [id]);
  return rows[0] ? mapUserRow(rows[0]) : null;
}

/** How many ACTIVE administrators the installation currently has. */
async function activeAdminCount(): Promise<number> {
  // `app_roles.name` holds the stable role key (admin | editor | viewer).
  const rows = await query<{ n: number }>(
    `SELECT COUNT(*) AS n
       FROM app_users u
       JOIN app_roles r ON r.id = u.role_id
      WHERE r.name = 'admin' AND u.active = 1`,
  );
  return Number(rows[0]?.n ?? 0);
}

/** The audit-friendly projection of a user (no hash, no session data). */
function auditShape(u: AppUser) {
  return {
    email: u.email,
    displayName: u.displayName,
    role: u.role,
    active: u.active,
    extraRights: [...u.extraRights],
    deniedPages: [...u.deniedPages],
  };
}

export const GET = defineRoute(
  { auth: USERS_RIGHT, rateLimit: RATE_LIMITS.read },
  async ({ params }) => {
    const { id } = params as { id: string };
    const target = await loadTarget(id);
    if (!target) return notFound("Používateľ sa nenašiel.");
    return jsonOk({ user: toPublicUser(target) });
  },
);

export const PATCH = defineRoute(
  {
    auth: USERS_RIGHT,
    rateLimit: RATE_LIMITS.write,
    bodySchema: userUpdateSchema,
  },
  async ({ user, body, params }) => {
    const { id } = params as { id: string };
    const target = await loadTarget(id);
    if (!target) return notFound("Používateľ sa nenašiel.");

    const before = auditShape(target);

    // --- last-admin guards ---------------------------------------------------
    const losesAdmin =
      target.role === "admin" &&
      ((body.role !== undefined && body.role !== "admin") ||
        body.active === false);
    if (losesAdmin && (await activeAdminCount()) <= 1) {
      return jsonError(
        "Toto je posledný aktívny administrátor — najprv vytvorte iného.",
        409,
      );
    }

    const sets: string[] = [];
    const values: unknown[] = [];

    if (body.displayName !== undefined) {
      sets.push("name = ?", "initials = ?");
      values.push(body.displayName, initialsOf(body.displayName));
    }
    if (body.role !== undefined) {
      const roleId = await roleIdByKey(body.role);
      if (!roleId) return badRequest("Rola nie je nastavená v databáze.");
      sets.push("role_id = ?");
      values.push(roleId);
    }
    if (body.active !== undefined) {
      sets.push("active = ?");
      values.push(body.active ? 1 : 0);
    }
    if (body.extraRights !== undefined) {
      sets.push("extra_rights = ?");
      values.push(body.extraRights.length ? JSON.stringify(body.extraRights) : null);
    }
    if (body.deniedPages !== undefined) {
      sets.push("denied_pages = ?");
      values.push(body.deniedPages.length ? JSON.stringify(body.deniedPages) : null);
    }
    if (body.password !== undefined) {
      try {
        // `pin_hash` is the family column name for the argon2id password hash.
        sets.push("pin_hash = ?");
        values.push(await hashPassword(body.password));
      } catch (err) {
        if (err instanceof PasswordPolicyError) return badRequest(err.message);
        throw err;
      }
    }

    if (sets.length === 0) return badRequest("Nie je čo zmeniť.");

    sets.push("updated_at = NOW()", "updated_by = ?");
    values.push(user.id, id);

    await execute(
      `UPDATE app_users SET ${sets.join(", ")} WHERE id = ?`,
      values,
    );

    // An admin-set password or a deactivation must not leave live sessions behind.
    let revokedSessions = 0;
    if (body.password !== undefined || body.active === false) {
      revokedSessions = await destroyAllSessionsForUser(id);
    }

    const after = await loadTarget(id);

    await audit({
      userId: user.id,
      userEmail: user.email,
      action: "user.update",
      entity: "app_users",
      entityId: id,
      severity: "info",
      oldValues: before,
      newValues: after ? auditShape(after) : null,
      // Record THAT the password was reset (never the value).
      meta: {
        passwordReset: body.password !== undefined,
        revokedSessions,
      },
    });

    return jsonOk({
      user: after ? toPublicUser(after) : null,
      revokedSessions,
    });
  },
);

export const DELETE = defineRoute(
  { auth: USERS_RIGHT, rateLimit: RATE_LIMITS.write },
  async ({ user, params }) => {
    const { id } = params as { id: string };

    if (id === user.id) {
      return jsonError("Vlastný účet nemôžete zmazať.", 409);
    }

    const target = await loadTarget(id);
    if (!target) return notFound("Používateľ sa nenašiel.");

    if (
      target.role === "admin" &&
      target.active &&
      (await activeAdminCount()) <= 1
    ) {
      return jsonError(
        "Toto je posledný aktívny administrátor — najprv vytvorte iného.",
        409,
      );
    }

    const before = auditShape(target);

    // Sessions first: if the delete then fails, the account is at least locked out.
    await destroyAllSessionsForUser(id);
    await execute("DELETE FROM app_users WHERE id = ?", [id]);

    await audit({
      userId: user.id,
      userEmail: user.email,
      action: "user.delete",
      entity: "app_users",
      entityId: id,
      severity: "critical",
      oldValues: before,
    });

    return jsonNoContent();
  },
);
