// RBAC row mapping + guards. The DB and the session are mocked; what is under
// test is the effective-rights computation (role.rights ∪ extra_rights − denied
// pages) and that the guards fail CLOSED.

import { describe, it, expect, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("@/lib/db", () => db);

const session = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock("./session", () => session);

import {
  AuthError,
  USER_SELECT,
  authErrorResponse,
  deniedPagesFor,
  getCurrentUser,
  hasRight,
  initialsOf,
  isAdmin,
  loadUserByEmail,
  mapUserRow,
  requireAdmin,
  requireRight,
  requireUser,
  toPublicUser,
  type UserJoinRow,
} from "./rbac";
import { RIGHT_KEYS, ROLE_RIGHTS } from "./rights";

/**
 * A joined app_users + app_roles row with sensible defaults, in the shape
 * `USER_SELECT` aliases it to (`u.name AS display_name`, `r.name AS r_key`).
 */
function row(overrides: Partial<UserJoinRow> = {}): UserJoinRow {
  return {
    id: "u1",
    email: "editor@aura.sk",
    display_name: "Editor Evka",
    initials: "EE",
    color: null,
    role_id: "r-editor",
    extra_rights: null,
    denied_pages: null,
    active: 1,
    created_at: new Date("2026-01-02T08:00:00Z"),
    last_login: null,
    r_id: "r-editor",
    r_key: "editor",
    r_rights: JSON.stringify(ROLE_RIGHTS.editor),
    r_denied: null,
    r_builtin: 1,
    ...overrides,
  };
}

beforeEach(() => {
  db.query.mockReset();
  session.getSession.mockReset();
});

describe("mapUserRow", () => {
  it("resolves the role key and the role's rights", () => {
    const user = mapUserRow(row());
    expect(user.role).toBe("editor");
    expect(user.roleRef?.builtin).toBe(true);
    expect(user.rights).toContain("projects.write");
    expect(user.rights).not.toContain("projects.delete");
    expect(user.active).toBe(true);
  });

  it("unions role rights with per-user extra_rights", () => {
    const user = mapUserRow(
      row({ extra_rights: JSON.stringify(["audit.read", "backup.read"]) }),
    );
    // Kept from the role …
    expect(user.rights).toContain("projects.write");
    // … plus the per-user grants.
    expect(user.rights).toContain("audit.read");
    expect(user.rights).toContain("backup.read");
    expect(hasRight(user, "audit.read")).toBe(true);
    // Still not an admin — extra rights do not imply the meta right.
    expect(isAdmin(user)).toBe(false);
    expect(hasRight(user, "users.manage")).toBe(false);
  });

  it("does not duplicate a right granted by both the role and extra_rights", () => {
    const user = mapUserRow(
      row({ extra_rights: JSON.stringify(["projects.write", "projects.write"]) }),
    );
    expect(user.rights.filter((r) => r === "projects.write")).toHaveLength(1);
  });

  it("accepts a JSON column that arrives already parsed (mariadb does both)", () => {
    const parsed = mapUserRow(
      row({ r_rights: ROLE_RIGHTS.viewer, extra_rights: ["comments.write"] }),
    );
    expect(parsed.rights).toContain("projects.read");
    expect(parsed.rights).toContain("comments.write");
  });

  it("survives a malformed JSON column instead of throwing", () => {
    const user = mapUserRow(row({ extra_rights: "{not json", r_rights: "oops" }));
    expect(user.rights).toEqual([]);
  });

  it("expands the admin meta right to the whole catalog", () => {
    const user = mapUserRow(
      row({
        email: "admin@aura.sk",
        r_key: "admin",
        r_rights: JSON.stringify(ROLE_RIGHTS.admin),
      }),
    );
    expect(user.role).toBe("admin");
    expect([...user.rights].sort()).toEqual([...RIGHT_KEYS].sort());
    expect(isAdmin(user)).toBe(true);
    expect(hasRight(user, "projects.delete")).toBe(true);
  });

  it("subtracts rights whose page is in the union of role + user denied_pages", () => {
    const user = mapUserRow(
      row({
        r_denied: JSON.stringify(["settings"]),
        denied_pages: JSON.stringify(["projects"]),
        extra_rights: JSON.stringify(["audit.read"]),
      }),
    );
    expect(user.rights).not.toContain("projects.write");
    expect(user.rights).not.toContain("audit.read"); // audit.read lives on `settings`
    expect(user.rights).toContain("work_items.write");
    expect([...deniedPagesFor(user)].sort()).toEqual(["projects", "settings"]);
  });

  it("falls back to the least-privileged role for an unknown role_key", () => {
    const user = mapUserRow(row({ r_key: "root", r_rights: JSON.stringify([]) }));
    expect(user.role).toBe("viewer");
    expect(user.rights).toEqual([]);
  });

  it("treats a user with no role row as having no rights", () => {
    const user = mapUserRow(
      row({ role_id: null, r_id: null, r_key: null, r_rights: null }),
    );
    expect(user.roleRef).toBeNull();
    expect(user.rights).toEqual([]);
    expect(user.role).toBe("viewer");
  });
});

describe("toPublicUser", () => {
  it("exposes only safe fields (never a password hash)", () => {
    const user = mapUserRow(row({ last_login: new Date("2026-07-01T10:00:00Z") }));
    const dto = toPublicUser(user);
    expect(Object.keys(dto).sort()).toEqual(
      [
        "active",
        "color",
        "createdAt",
        "deniedPages",
        "displayName",
        "email",
        "id",
        "initials",
        "lastLogin",
        "rights",
        "role",
      ].sort(),
    );
    expect(JSON.stringify(dto)).not.toMatch(/argon2|password|pin_hash/i);
    expect(dto.lastLogin).toBe("2026-07-01T10:00:00.000Z");
  });
});

describe("initialsOf", () => {
  it("takes the first letter of the first two words", () => {
    expect(initialsOf("Editor Evka")).toBe("EE");
    expect(initialsOf("Anna Mária Bezáková")).toBe("AM");
  });

  it("handles a single word and stray whitespace", () => {
    expect(initialsOf("  admin  ")).toBe("A");
    expect(initialsOf("ľubomír")).toBe("Ľ");
  });
});

describe("USER_SELECT", () => {
  it("never selects the password hash", () => {
    expect(USER_SELECT).not.toContain("pin_hash");
    // Aliases the family column names onto the DTO field names.
    expect(USER_SELECT).toContain("u.name AS display_name");
    expect(USER_SELECT).toContain("r.name AS r_key");
  });
});

describe("loaders", () => {
  it("loads a user by e-mail through a parameterized query", async () => {
    db.query.mockResolvedValue([row()]);
    const user = await loadUserByEmail("editor@aura.sk");
    expect(user?.id).toBe("u1");
    const [sql, params] = db.query.mock.calls[0]!;
    expect(sql).toContain("WHERE u.email = ?");
    expect(params).toEqual(["editor@aura.sk"]);
  });

  it("returns null for an unknown e-mail", async () => {
    db.query.mockResolvedValue([]);
    expect(await loadUserByEmail("nikto@aura.sk")).toBeNull();
  });

  it("treats a deactivated account as unauthenticated", async () => {
    session.getSession.mockResolvedValue({ sessionId: "s1", userId: "u1" });
    db.query.mockResolvedValue([row({ active: 0 })]);
    expect(await getCurrentUser()).toBeNull();
  });

  it("accepts a TINYINT returned as a boolean by the driver", () => {
    expect(mapUserRow(row({ active: true, r_builtin: true })).active).toBe(true);
    expect(mapUserRow(row({ active: false })).active).toBe(false);
  });
});

describe("guards fail closed", () => {
  it("requireUser throws 401 without a session", async () => {
    session.getSession.mockResolvedValue(null);
    await expect(requireUser()).rejects.toBeInstanceOf(AuthError);
    await expect(requireUser()).rejects.toMatchObject({ status: 401 });
    // No DB round-trip when there is no session at all.
    expect(db.query).not.toHaveBeenCalled();
  });

  it("requireRight throws 403 for a missing right", async () => {
    session.getSession.mockResolvedValue({ sessionId: "s1", userId: "u1" });
    db.query.mockResolvedValue([row()]);
    await expect(requireRight("projects.delete")).rejects.toMatchObject({
      status: 403,
    });
  });

  it("requireRight passes for a held right", async () => {
    session.getSession.mockResolvedValue({ sessionId: "s1", userId: "u1" });
    db.query.mockResolvedValue([row()]);
    const user = await requireRight("projects.write");
    expect(user.email).toBe("editor@aura.sk");
  });

  it("requireAdmin rejects an editor and accepts an admin", async () => {
    session.getSession.mockResolvedValue({ sessionId: "s1", userId: "u1" });
    db.query.mockResolvedValue([row()]);
    await expect(requireAdmin()).rejects.toMatchObject({ status: 403 });

    db.query.mockResolvedValue([
      row({ r_key: "admin", r_rights: JSON.stringify(ROLE_RIGHTS.admin) }),
    ]);
    await expect(requireAdmin()).resolves.toMatchObject({ role: "admin" });
  });
});

describe("authErrorResponse", () => {
  it("maps an AuthError to its status with a Slovak envelope", async () => {
    const res = authErrorResponse(new AuthError("Neprihlásený.", 401));
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "Neprihlásený." });
  });

  it("maps an unknown error to 401 without leaking its message", async () => {
    const res = authErrorResponse(new Error("ECONNREFUSED 127.0.0.1:3306"));
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "Neprihlásený." });
  });
});
