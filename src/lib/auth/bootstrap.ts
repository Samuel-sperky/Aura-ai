// First-run bootstrap: the three built-in roles + the first administrator.
//
// WHEN THIS RUNS
//   * `scripts/seed.ts` — the normal path.
//   * `POST /api/auth/login` — ONLY while `app_users` is still empty, so a fresh
//     container that was never seeded still lets the env-configured admin in.
//
// It is deliberately NOT run on every request. The source app re-ran its whole
// schema+bootstrap routine per request, which is a permanent tax and a write on a
// read path. Here the login route calls `ensureBootstrapAdminIfEmpty()`, which
// does one COUNT and then memoises "users exist" for the life of the process.
//
// IDEMPOTENT: roles are upserted by their unique `app_roles.name` key, and the admin is
// created only when the users table is empty. Re-running never duplicates rows and
// never resets an existing password.

import { randomUUID } from "node:crypto";
import { query, execute } from "@/lib/db";
import { env } from "@/lib/env";
import { hashPassword } from "./pin";
import { initialsOf } from "./rbac";
import { ROLE_KEYS, ROLE_RIGHTS, type RoleKey } from "./rights";

export interface BootstrapResult {
  /** How many built-in role rows were upserted (always ROLE_KEYS.length). */
  rolesEnsured: number;
  /** True when this call created the first administrator. */
  adminCreated: boolean;
  /** E-mail of the admin that exists/was created, when known. */
  adminEmail: string | null;
  /** Why no admin was created (null when one was). */
  skipped: "users-exist" | "missing-credentials" | null;
}

/**
 * Upsert the three built-in roles with their canonical rights.
 *
 * `app_roles.name` IS the stable EN role key (admin | editor | viewer) — SK labels
 * live in the i18n layer, so there is nothing localised to write here. Rights are
 * refreshed on every call so that adding a right to the catalog automatically
 * reaches editor/viewer on the next seed; `denied_pages` and the row id are left
 * untouched so an admin's page blacklist survives.
 */
export async function ensureBuiltinRoles(): Promise<number> {
  for (const key of ROLE_KEYS) {
    await execute(
      `INSERT INTO app_roles (id, name, rights, denied_pages, builtin)
       VALUES (?, ?, ?, NULL, 1)
       ON DUPLICATE KEY UPDATE
         rights  = VALUES(rights),
         builtin = 1,
         updated_at = NOW()`,
      [randomUUID(), key, JSON.stringify(ROLE_RIGHTS[key])],
    );
  }
  return ROLE_KEYS.length;
}

/** Resolve a role id by its stable key (null when the role row is missing). */
export async function roleIdByKey(key: RoleKey): Promise<string | null> {
  const rows = await query<{ id: string }>(
    "SELECT id FROM app_roles WHERE name = ?",
    [key],
  );
  return rows[0]?.id ?? null;
}

/** Number of rows in `app_users`. */
async function countUsers(): Promise<number> {
  const rows = await query<{ c: number }>("SELECT COUNT(*) AS c FROM app_users");
  return Number(rows[0]?.c ?? 0);
}

/**
 * Ensure the built-in roles exist and — only when `app_users` is empty — create
 * the first administrator from ADMIN_EMAIL / ADMIN_PASSWORD.
 *
 * Never throws for a missing credential pair: it reports
 * `skipped: "missing-credentials"` so the caller decides (the seed script fails,
 * the login route just returns "wrong credentials").
 */
export async function ensureBootstrapAdmin(): Promise<BootstrapResult> {
  const rolesEnsured = await ensureBuiltinRoles();

  if ((await countUsers()) > 0) {
    return {
      rolesEnsured,
      adminCreated: false,
      adminEmail: null,
      skipped: "users-exist",
    };
  }

  const email = env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = env.ADMIN_PASSWORD;
  if (!email || !password) {
    return {
      rolesEnsured,
      adminCreated: false,
      adminEmail: null,
      skipped: "missing-credentials",
    };
  }

  const roleId = await roleIdByKey("admin");
  const id = randomUUID();
  const displayName = "Administrátor";
  // `pin_hash` carries the argon2id PASSWORD hash (family column name).
  const passwordHash = await hashPassword(password);

  await execute(
    `INSERT INTO app_users
       (id, email, name, initials, role_id, pin_hash, extra_rights, denied_pages,
        active, created_by)
     VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, 1, ?)`,
    [id, email, displayName, initialsOf(displayName), roleId, passwordHash, id],
  );

  return { rolesEnsured, adminCreated: true, adminEmail: email, skipped: null };
}

// Memoised "no bootstrap needed in this process". Set once we have seen a
// non-empty app_users (a deployment does not un-seed itself) or once we know the
// env carries no admin credentials — in both cases retrying on every login
// attempt would only add writes to a request path that cannot benefit from them.
let bootstrapSettled = false;

/**
 * Cheap guard for the login route: run the bootstrap ONLY while the app has no
 * users at all, and at most once per process. Returns null when nothing was
 * attempted.
 */
export async function ensureBootstrapAdminIfEmpty(): Promise<BootstrapResult | null> {
  if (bootstrapSettled) return null;
  try {
    if ((await countUsers()) > 0) {
      bootstrapSettled = true;
      return null;
    }
    const result = await ensureBootstrapAdmin();
    // Created, or impossible to create — either way, stop trying.
    if (result.adminCreated || result.skipped === "missing-credentials") {
      bootstrapSettled = true;
    }
    return result;
  } catch {
    // A bootstrap failure must not turn a login attempt into a 500 — the login
    // then simply fails to find the user and answers with the generic message.
    return null;
  }
}

/** Test/seed helper: forget the memoised bootstrap state. */
export function resetBootstrapMemo(): void {
  bootstrapSettled = false;
}
