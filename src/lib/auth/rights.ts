// Rights catalog + role mapping — the single source of truth for "who may do what".
//
// DELIBERATELY FRAMEWORK-FREE: no `mariadb`, no `next/*`, no `@node-rs/argon2`.
// That keeps it importable from the server RBAC layer, from the bootstrap/seed
// scripts, from client components that render an admin UI, AND from unit tests
// (no env validation, no DB pool). All the pure RBAC math lives here; the DB
// loaders and the route guards live in `rbac.ts`.
//
// MODEL (contract §7 + spec Q39/Q40/Q41):
//   effective rights = app_roles.rights ∪ app_users.extra_rights
//                      − (rights whose page is in the union of denied_pages)
//   `admin` is a META right: holding it expands to the whole catalog and makes
//   the denied-pages blacklist inapplicable (an admin can always reach settings,
//   otherwise a mis-set blacklist could lock the last admin out of user admin).
//
// Right keys are stable EN identifiers persisted in the DB; the SK/EN labels are
// only for the admin UI.

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

/** The three built-in roles. EN keys in the DB, SK labels in the UI. */
export const ROLE_KEYS = ["admin", "editor", "viewer"] as const;

/** Role key as persisted in `app_roles.role_key`. */
export type RoleKey = (typeof ROLE_KEYS)[number];

/** Human labels for the built-in roles (SK is what the UI shows). */
export const ROLE_LABELS: Readonly<
  Record<RoleKey, { sk: string; en: string }>
> = {
  admin: { sk: "Admin", en: "Admin" },
  editor: { sk: "Editor", en: "Editor" },
  viewer: { sk: "Prehliadač", en: "Viewer" },
};

/**
 * Narrow an arbitrary DB/user value to a RoleKey. Unknown values fall back to
 * the LEAST privileged role — a corrupted/renamed role row must never grant
 * more than "read".
 */
export function roleFromKey(value: unknown): RoleKey {
  return (ROLE_KEYS as ReadonlyArray<string>).includes(String(value))
    ? (String(value) as RoleKey)
    : "viewer";
}

// ---------------------------------------------------------------------------
// Pages (the 6 nav entries) — used by the denied_pages blacklist
// ---------------------------------------------------------------------------

/**
 * Page keys matching the six navigation entries (`/` is `overview`). A right is
 * attached to at most one page; blacklisting a page removes every right bound to
 * it. Global rights (notifications, own preferences) have no page.
 */
export const PAGE_KEYS = [
  "overview",
  "timeline",
  "projects",
  "work-items",
  "decisions",
  "settings",
] as const;

export type PageKey = (typeof PAGE_KEYS)[number];

// ---------------------------------------------------------------------------
// Rights catalog
// ---------------------------------------------------------------------------

/** The meta right: expands to the entire catalog. */
export const ADMIN_RIGHT = "admin";

export interface RightDefinition {
  /** Stable EN key persisted in `app_roles.rights` / `app_users.extra_rights`. */
  key: string;
  /** SK label (admin UI). */
  labelSk: string;
  /** EN label (admin UI). */
  labelEn: string;
  /** Page this right belongs to, or null for app-global rights. */
  page: PageKey | null;
  /**
   * Reserved for administrators. Marked explicitly instead of inferred from the
   * key: `audit.read` and `backup.read` end in `.read` yet must NOT reach the
   * "every role can read" bundle.
   */
  adminOnly?: true;
}

/**
 * The complete rights catalog. Granular enough that the three roles differ in
 * meaningful ways, small enough to stay reviewable:
 *   - one `*.read` per read surface,
 *   - one `*.write` per editable entity (covers create + update + delete),
 *   - explicit `projects.delete` because deleting a project cascades (spec Q21),
 *   - explicit `decisions.decide` and `readiness.override` because those are the
 *     irreversible steps of the decision queue (spec Q34/Q41),
 *   - `preferences.own` is intentionally NOT named `*.write`: a viewer may change
 *     their OWN theme/density/language/filters but holds no write right at all.
 */
export const RIGHTS: ReadonlyArray<RightDefinition> = [
  // --- meta ----------------------------------------------------------------
  {
    key: ADMIN_RIGHT,
    labelSk: "Správa aplikácie (admin)",
    labelEn: "Application administration (admin)",
    page: null,
    adminOnly: true,
  },

  // --- reads ---------------------------------------------------------------
  { key: "overview.read", labelSk: "Prehľad", labelEn: "Overview", page: "overview" },
  { key: "timeline.read", labelSk: "Timeline", labelEn: "Timeline", page: "timeline" },
  { key: "projects.read", labelSk: "Projekty — čítanie", labelEn: "Projects — read", page: "projects" },
  { key: "work_items.read", labelSk: "Úlohy — čítanie", labelEn: "Work items — read", page: "work-items" },
  { key: "worklogs.read", labelSk: "Worklog — čítanie", labelEn: "Worklogs — read", page: "work-items" },
  { key: "sprints.read", labelSk: "Šprinty — čítanie", labelEn: "Sprints — read", page: "timeline" },
  { key: "checkpoints.read", labelSk: "Checkpointy — čítanie", labelEn: "Checkpoints — read", page: "decisions" },
  { key: "decisions.read", labelSk: "Rozhodnutia — čítanie", labelEn: "Decisions — read", page: "decisions" },
  { key: "notifications.read", labelSk: "Notifikácie", labelEn: "Notifications", page: null },

  // --- self service (available to every role, viewer included) --------------
  {
    key: "preferences.own",
    labelSk: "Vlastné preferencie a filtre",
    labelEn: "Own preferences and filters",
    page: null,
  },

  // --- writes (editor + admin) ---------------------------------------------
  { key: "projects.write", labelSk: "Projekty — zápis", labelEn: "Projects — write", page: "projects" },
  { key: "work_items.write", labelSk: "Úlohy — zápis", labelEn: "Work items — write", page: "work-items" },
  { key: "worklogs.write", labelSk: "Worklog — zápis", labelEn: "Worklogs — write", page: "work-items" },
  { key: "comments.write", labelSk: "Komentáre — zápis", labelEn: "Comments — write", page: "work-items" },
  { key: "sprints.write", labelSk: "Šprinty — zápis", labelEn: "Sprints — write", page: "timeline" },
  { key: "checkpoints.write", labelSk: "Checkpointy — zápis", labelEn: "Checkpoints — write", page: "decisions" },
  { key: "decisions.decide", labelSk: "Rozhodnúť o checkpointe", labelEn: "Decide a checkpoint", page: "decisions" },

  // --- admin only ----------------------------------------------------------
  {
    key: "projects.delete",
    labelSk: "Zmazať projekt",
    labelEn: "Delete a project",
    page: "projects",
    adminOnly: true,
  },
  {
    key: "readiness.override",
    labelSk: "Override pripravenosti",
    labelEn: "Override readiness",
    page: "decisions",
    adminOnly: true,
  },
  {
    key: "users.manage",
    labelSk: "Správa používateľov",
    labelEn: "Manage users",
    page: "settings",
    adminOnly: true,
  },
  {
    key: "settings.manage",
    labelSk: "Nastavenia aplikácie",
    labelEn: "Application settings",
    page: "settings",
    adminOnly: true,
  },
  {
    key: "audit.read",
    labelSk: "Audit log",
    labelEn: "Audit log",
    page: "settings",
    adminOnly: true,
  },
  {
    key: "backup.read",
    labelSk: "Stav záloh",
    labelEn: "Backup status",
    page: "settings",
    adminOnly: true,
  },
] as const;

/** Every right key in the catalog, in catalog order. */
export const RIGHT_KEYS: ReadonlyArray<string> = RIGHTS.map((r) => r.key);

/** A right key (kept as `string` so DB values never need a cast at call sites). */
export type Right = string;

const RIGHT_BY_KEY: ReadonlyMap<string, RightDefinition> = new Map(
  RIGHTS.map((r) => [r.key, r]),
);

/** Look up a right definition by key (null when unknown). */
export function rightDefinition(right: string): RightDefinition | null {
  return RIGHT_BY_KEY.get(right) ?? null;
}

/** The page a right belongs to, or null for app-global / unknown rights. */
export function pageOfRight(right: string): PageKey | null {
  return RIGHT_BY_KEY.get(right)?.page ?? null;
}

// ---------------------------------------------------------------------------
// Role → rights mapping (seeded into `app_roles.rights`)
// ---------------------------------------------------------------------------

/** Rights reserved for administrators — never part of the editor/viewer bundles. */
export const ADMIN_ONLY_RIGHTS: ReadonlyArray<string> = RIGHTS.filter(
  (r) => r.adminOnly === true,
).map((r) => r.key);

const READ_RIGHTS: ReadonlyArray<string> = RIGHTS.filter(
  (r) => r.key.endsWith(".read") && r.adminOnly !== true,
).map((r) => r.key);

/** Rights every role holds: the domain reads + own preferences. */
const BASE_RIGHTS: ReadonlyArray<string> = [...READ_RIGHTS, "preferences.own"];

/** Editor adds every write plus the decide action — but no delete/admin right. */
const EDITOR_RIGHTS: ReadonlyArray<string> = [
  ...BASE_RIGHTS,
  "projects.write",
  "work_items.write",
  "worklogs.write",
  "comments.write",
  "sprints.write",
  "checkpoints.write",
  "decisions.decide",
];

/**
 * Canonical rights per built-in role. `admin` is stored as the single meta right
 * so a future catalog addition is granted to admins automatically (see
 * `rightsOf`), while editor/viewer stay an explicit, auditable allow-list.
 */
export const ROLE_RIGHTS: Readonly<Record<RoleKey, ReadonlyArray<string>>> = {
  admin: [ADMIN_RIGHT],
  editor: EDITOR_RIGHTS,
  viewer: BASE_RIGHTS,
};

// ---------------------------------------------------------------------------
// Pure RBAC evaluation
// ---------------------------------------------------------------------------

/** The minimum a subject must provide to have its rights computed. */
export interface RbacSubject {
  /** `app_roles.rights` of the user's role. */
  roleRights?: ReadonlyArray<string> | null;
  /** `app_users.extra_rights` — per-user grants on top of the role. */
  extraRights?: ReadonlyArray<string> | null;
  /** Union of `app_roles.denied_pages` and `app_users.denied_pages`. */
  deniedPages?: ReadonlyArray<string> | null;
}

/** True when the raw (unexpanded) grant set contains the meta admin right. */
export function isAdminRights(rights: ReadonlyArray<string>): boolean {
  return rights.includes(ADMIN_RIGHT);
}

/**
 * Effective rights for a subject:
 *   1. role.rights ∪ extra_rights
 *   2. `admin` present → the entire catalog (and denied_pages is ignored)
 *   3. otherwise drop every right whose page is blacklisted in denied_pages
 *
 * Pure and DB-free — this is the function the unit tests pin down.
 */
export function rightsOf(subject: RbacSubject): string[] {
  const merged = new Set<string>([
    ...(subject.roleRights ?? []),
    ...(subject.extraRights ?? []),
  ]);

  // Admin expands to everything and is never page-blacklisted (see module docs).
  if (merged.has(ADMIN_RIGHT)) return [...RIGHT_KEYS];

  const denied = new Set<string>(subject.deniedPages ?? []);
  if (denied.size === 0) return [...merged];

  return [...merged].filter((right) => {
    const page = pageOfRight(right);
    return page === null || !denied.has(page);
  });
}

/** Does this effective-rights list satisfy `right`? (`admin` satisfies all.) */
export function includesRight(
  rights: ReadonlyArray<string>,
  right: string,
): boolean {
  return rights.includes(ADMIN_RIGHT) || rights.includes(right);
}

/**
 * Pages the subject must not see. Empty for admins (a blacklist must never be
 * able to strand the last administrator outside /settings).
 */
export function deniedPagesOf(subject: RbacSubject): string[] {
  const merged = new Set<string>([
    ...(subject.roleRights ?? []),
    ...(subject.extraRights ?? []),
  ]);
  if (merged.has(ADMIN_RIGHT)) return [];
  return [...new Set(subject.deniedPages ?? [])];
}
