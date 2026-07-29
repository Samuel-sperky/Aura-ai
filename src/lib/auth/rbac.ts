// Server-side RBAC — THE authorization boundary.
//
// Every API handler goes through `defineRoute({ auth: … })`, which calls one of
// the guards below. `src/proxy.ts` only redirects unauthenticated PAGE
// navigations; it is a UX optimisation and never an authorization decision.
// Anything the client does with `user.rights` is a hint for hiding buttons.
//
// Rights and role are re-read from the DB on every request (the session JWT
// carries only `{ sid, uid }`), so revoking a right or deactivating an account
// takes effect on the very next request instead of when a token expires.
//
// The pure RBAC math lives in `./rights` (framework-free, unit-tested); this file
// adds the DB loaders, the guards and the safe public projection.

import { query } from "@/lib/db";
import { getSession } from "./session";
import {
  ADMIN_RIGHT,
  RIGHT_KEYS,
  ROLE_LABELS,
  ROLE_RIGHTS,
  deniedPagesOf,
  includesRight,
  rightsOf,
  roleFromKey,
  type RoleKey,
} from "./rights";

// Re-exported so consumers have ONE import for the whole authorization surface.
export type { RoleKey };
export {
  ADMIN_RIGHT,
  RIGHT_KEYS,
  ROLE_RIGHTS,
  rightsOf,
  includesRight,
  deniedPagesOf,
  roleFromKey,
};

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

/**
 * The user's role as stored in `app_roles`. The DB column `app_roles.name` holds
 * the STABLE EN KEY (admin | editor | viewer) — roles are a fixed set of keys, not
 * a user-editable code list, so the SK/EN labels come from `ROLE_LABELS` in the
 * i18n/rights layer rather than from `name_sk` / `name_en` columns.
 */
export interface AppRole {
  id: string;
  key: RoleKey;
  /** SK label (derived from the key, never stored). */
  nameSk: string;
  /** EN label (derived from the key, never stored). */
  nameEn: string;
  rights: string[];
  deniedPages: string[];
  builtin: boolean;
}

/**
 * The authenticated user as route handlers see it.
 *
 * `rights` is the EFFECTIVE set (role ∪ extra − denied pages, expanded for
 * admins) — check it directly or via `hasRight`. The password hash
 * (`app_users.pin_hash`) is never part of this shape; the login and
 * change-password routes read it with their own targeted query.
 */
export interface AppUser {
  id: string;
  email: string;
  /** `app_users.name`. */
  displayName: string;
  /** Avatar initials (`app_users.initials`). */
  initials: string;
  /** Avatar colour token (`app_users.color`), or null. */
  color: string | null;
  /** Role key; falls back to the least-privileged "viewer" when unresolvable. */
  role: RoleKey;
  /** Effective rights. */
  rights: ReadonlyArray<string>;
  roleId: string | null;
  roleRef: AppRole | null;
  extraRights: ReadonlyArray<string>;
  /** Union of role + user page blacklist (always empty for admins). */
  deniedPages: ReadonlyArray<string>;
  active: boolean;
  createdAt: Date | null;
  lastLogin: Date | null;
}

/** Safe, serialisable user projection. NEVER contains a password hash. */
export interface PublicUser {
  id: string;
  email: string;
  displayName: string;
  initials: string;
  color: string | null;
  role: RoleKey;
  rights: string[];
  deniedPages: string[];
  active: boolean;
  lastLogin: string | null;
  createdAt: string | null;
}

// ---------------------------------------------------------------------------
// JSON column helpers (mariadb may hand back JSON as a string or parsed value)
// ---------------------------------------------------------------------------

function asStringArray(v: unknown): string[] {
  if (v == null) return [];
  let val: unknown = v;
  if (typeof v === "string") {
    try {
      val = JSON.parse(v);
    } catch {
      return [];
    }
  }
  if (Array.isArray(val)) {
    return val.filter((x): x is string => typeof x === "string");
  }
  return [];
}

function isoOrNull(v: unknown): string | null {
  if (v == null) return null;
  const d = v instanceof Date ? v : new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// ---------------------------------------------------------------------------
// Row mapping
// ---------------------------------------------------------------------------

/**
 * The joined `app_users` + `app_roles` row shape, as ALIASED by `USER_SELECT`
 * (`u.name AS display_name`, `r.name AS r_key`). Keep the two in lock-step.
 */
export interface UserJoinRow {
  id: string;
  email: string;
  display_name: string;
  initials: string | null;
  color: string | null;
  role_id: string | null;
  extra_rights: unknown;
  denied_pages: unknown;
  /** TINYINT — the driver may hand it back as 1/0 or true/false. */
  active: number | boolean;
  created_at: Date | null;
  last_login: Date | null;
  r_id: string | null;
  /** `app_roles.name` — the stable role key. */
  r_key: string | null;
  r_rights: unknown;
  r_denied: unknown;
  r_builtin: number | boolean | null;
}

/** TINYINT → boolean, tolerant of the driver returning a number or a boolean. */
function toBool(v: unknown): boolean {
  return v === 1 || v === true || v === "1";
}

/**
 * Avatar initials from a display name: at most two letters, upper-cased.
 * `app_users.initials` is NOT NULL, so every create path needs a value.
 */
export function initialsOf(displayName: string): string {
  const parts = displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  const letters = parts.map((p) => [...p][0] ?? "").join("");
  return (letters || displayName.trim().slice(0, 2)).toUpperCase().slice(0, 8);
}

/**
 * Map a joined row to an `AppUser`, computing the effective rights.
 * Exported for unit tests (pure — no I/O).
 */
export function mapUserRow(row: UserJoinRow): AppUser {
  const roleKey = roleFromKey(row.r_key);
  const role: AppRole | null = row.r_id
    ? {
        id: row.r_id,
        key: roleKey,
        nameSk: ROLE_LABELS[roleKey].sk,
        nameEn: ROLE_LABELS[roleKey].en,
        rights: asStringArray(row.r_rights),
        deniedPages: asStringArray(row.r_denied),
        builtin: toBool(row.r_builtin),
      }
    : null;

  const subject = {
    roleRights: role?.rights ?? [],
    extraRights: asStringArray(row.extra_rights),
    deniedPages: [
      ...(role?.deniedPages ?? []),
      ...asStringArray(row.denied_pages),
    ],
  };

  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    initials: row.initials ?? "",
    color: row.color,
    role: roleKey,
    rights: rightsOf(subject),
    roleId: row.role_id,
    roleRef: role,
    extraRights: subject.extraRights,
    deniedPages: deniedPagesOf(subject),
    active: toBool(row.active),
    createdAt: row.created_at,
    lastLogin: row.last_login,
  };
}

/**
 * Column list shared by every user load. Keep in lock-step with UserJoinRow.
 * `pin_hash` is deliberately absent: the hash must never travel through the RBAC
 * layer (the login and change-password routes read it with their own query).
 */
export const USER_SELECT = `
  SELECT u.id, u.email, u.name AS display_name, u.initials, u.color, u.role_id,
         u.extra_rights, u.denied_pages, u.active, u.created_at, u.last_login,
         r.id AS r_id, r.name AS r_key, r.rights AS r_rights,
         r.denied_pages AS r_denied, r.builtin AS r_builtin
    FROM app_users u
    LEFT JOIN app_roles r ON r.id = u.role_id
`;

// ---------------------------------------------------------------------------
// Loaders
// ---------------------------------------------------------------------------

export async function loadUserById(id: string): Promise<AppUser | null> {
  const rows = await query<UserJoinRow>(`${USER_SELECT} WHERE u.id = ?`, [id]);
  return rows[0] ? mapUserRow(rows[0]) : null;
}

export async function loadUserByEmail(email: string): Promise<AppUser | null> {
  const rows = await query<UserJoinRow>(`${USER_SELECT} WHERE u.email = ?`, [
    email,
  ]);
  return rows[0] ? mapUserRow(rows[0]) : null;
}

/**
 * The current authenticated AND active user, or null. Deactivating an account
 * therefore locks it out immediately without touching its sessions.
 */
export async function getCurrentUser(): Promise<AppUser | null> {
  const session = await getSession();
  if (!session) return null;
  const user = await loadUserById(session.userId);
  if (!user || !user.active) return null;
  return user;
}

// ---------------------------------------------------------------------------
// Predicates
// ---------------------------------------------------------------------------

/** Does the user hold `right`? (`admin` satisfies everything.) */
export function hasRight(
  user: Pick<AppUser, "rights">,
  right: string,
): boolean {
  return includesRight(user.rights, right);
}

/** Is the user an administrator? */
export function isAdmin(user: Pick<AppUser, "rights">): boolean {
  return user.rights.includes(ADMIN_RIGHT);
}

/** Pages the user must not see (empty for admins). */
export function deniedPagesFor(
  user: Pick<AppUser, "deniedPages">,
): Set<string> {
  return new Set(user.deniedPages);
}

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

/** Thrown by the guards; mapped to the canonical envelope by authErrorResponse. */
export class AuthError extends Error {
  readonly status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

/** Any authenticated, active user. Throws AuthError(401) otherwise. */
export async function requireUser(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("Neprihlásený.", 401);
  return user;
}

/** Authenticated user holding `right`. Throws AuthError(401) or (403). */
export async function requireRight(right: string): Promise<AppUser> {
  const user = await requireUser();
  if (!hasRight(user, right)) {
    throw new AuthError("Na túto akciu nemáte oprávnenie.", 403);
  }
  return user;
}

/** Authenticated administrator. Throws AuthError(401) or (403). */
export async function requireAdmin(): Promise<AppUser> {
  const user = await requireUser();
  if (!isAdmin(user)) {
    throw new AuthError("Túto akciu môže vykonať iba administrátor.", 403);
  }
  return user;
}

/**
 * Map any error from the guards to `{ error: "<slovenská správa>" }`. An unknown
 * error becomes 401 — fail closed, and never leak an internal message.
 */
export function authErrorResponse(err: unknown): Response {
  if (err instanceof AuthError) {
    return Response.json({ error: err.message }, { status: err.status });
  }
  return Response.json({ error: "Neprihlásený." }, { status: 401 });
}

// ---------------------------------------------------------------------------
// Projection
// ---------------------------------------------------------------------------

/** Project an AppUser to the wire shape returned by the API. */
export function toPublicUser(user: AppUser): PublicUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    initials: user.initials,
    color: user.color,
    role: user.role,
    rights: [...user.rights],
    deniedPages: [...user.deniedPages],
    active: user.active,
    lastLogin: isoOrNull(user.lastLogin),
    createdAt: isoOrNull(user.createdAt),
  };
}
