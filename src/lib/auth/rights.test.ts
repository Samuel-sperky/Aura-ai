// The rights catalog is the security policy in data form. These tests pin down
// the three role boundaries the contract states in prose (§7 + spec Q39/Q40/Q41)
// so a later "just add one right" cannot silently widen Editor or Viewer.

import { describe, it, expect } from "vitest";
import {
  ADMIN_ONLY_RIGHTS,
  ADMIN_RIGHT,
  PAGE_KEYS,
  RIGHTS,
  RIGHT_KEYS,
  ROLE_KEYS,
  ROLE_RIGHTS,
  deniedPagesOf,
  includesRight,
  pageOfRight,
  rightsOf,
  roleFromKey,
} from "./rights";

describe("rights catalog", () => {
  it("has unique keys and a valid page (or none) for each right", () => {
    expect(new Set(RIGHT_KEYS).size).toBe(RIGHT_KEYS.length);
    for (const right of RIGHTS) {
      expect(right.labelSk.length).toBeGreaterThan(0);
      expect(right.labelEn.length).toBeGreaterThan(0);
      if (right.page !== null) {
        expect(PAGE_KEYS).toContain(right.page);
      }
    }
  });

  it("contains the rights the contract names explicitly", () => {
    for (const key of [
      "projects.delete",
      "users.manage",
      "settings.manage",
      "audit.read",
      "backup.read",
      "readiness.override",
      "projects.write",
      "work_items.write",
      "checkpoints.write",
      "sprints.write",
      "worklogs.write",
      "decisions.decide",
    ]) {
      expect(RIGHT_KEYS).toContain(key);
    }
  });

  it("exposes exactly three roles", () => {
    expect([...ROLE_KEYS]).toEqual(["admin", "editor", "viewer"]);
  });
});

describe("admin", () => {
  it("expands the single meta right to the entire catalog", () => {
    const rights = rightsOf({ roleRights: ROLE_RIGHTS.admin });
    expect(rights.sort()).toEqual([...RIGHT_KEYS].sort());
  });

  it("holds every right including the destructive ones", () => {
    const rights = rightsOf({ roleRights: ROLE_RIGHTS.admin });
    for (const key of RIGHT_KEYS) {
      expect(includesRight(rights, key)).toBe(true);
    }
  });

  it("ignores a denied_pages blacklist (cannot be locked out of settings)", () => {
    const rights = rightsOf({
      roleRights: ROLE_RIGHTS.admin,
      deniedPages: ["settings", "projects"],
    });
    expect(rights).toContain("users.manage");
    expect(rights).toContain("projects.read");
    expect(deniedPagesOf({ roleRights: ROLE_RIGHTS.admin, deniedPages: ["settings"] })).toEqual([]);
  });
});

describe("editor", () => {
  const rights = rightsOf({ roleRights: ROLE_RIGHTS.editor });

  it("may create and edit the planning entities", () => {
    for (const key of [
      "projects.write",
      "work_items.write",
      "checkpoints.write",
      "sprints.write",
      "worklogs.write",
      "comments.write",
      "decisions.decide",
    ]) {
      expect(includesRight(rights, key)).toBe(true);
    }
  });

  it("may NOT delete projects, manage users or change app settings", () => {
    for (const key of [
      ADMIN_RIGHT,
      "projects.delete",
      "users.manage",
      "settings.manage",
      "audit.read",
      "backup.read",
      "readiness.override",
    ]) {
      expect(includesRight(rights, key)).toBe(false);
    }
  });

  it("can read every DOMAIN surface but not the admin-only reads", () => {
    const domainReads = RIGHT_KEYS.filter(
      (k) => k.endsWith(".read") && !ADMIN_ONLY_RIGHTS.includes(k),
    );
    expect(domainReads.length).toBeGreaterThan(5);
    for (const key of domainReads) {
      expect(includesRight(rights, key)).toBe(true);
    }
    // `audit.read` / `backup.read` end in `.read` yet are admin-only.
    for (const key of ADMIN_ONLY_RIGHTS) {
      expect(includesRight(rights, key)).toBe(false);
    }
  });
});

describe("viewer", () => {
  const rights = rightsOf({ roleRights: ROLE_RIGHTS.viewer });

  it("holds no write right at all — not even a worklog", () => {
    expect(rights.filter((r) => r.endsWith(".write"))).toEqual([]);
    expect(includesRight(rights, "worklogs.write")).toBe(false);
    expect(includesRight(rights, "comments.write")).toBe(false);
    expect(includesRight(rights, "decisions.decide")).toBe(false);
    expect(includesRight(rights, ADMIN_RIGHT)).toBe(false);
  });

  it("can read and manage its own preferences", () => {
    expect(includesRight(rights, "projects.read")).toBe(true);
    expect(includesRight(rights, "preferences.own")).toBe(true);
  });
});

describe("denied_pages", () => {
  it("removes every right bound to the blacklisted page", () => {
    const rights = rightsOf({
      roleRights: ROLE_RIGHTS.editor,
      deniedPages: ["projects"],
    });
    expect(rights).not.toContain("projects.read");
    expect(rights).not.toContain("projects.write");
    // Rights on other pages are untouched.
    expect(rights).toContain("work_items.write");
    expect(rights).toContain("timeline.read");
  });

  it("never removes app-global rights (no page attached)", () => {
    expect(pageOfRight("preferences.own")).toBeNull();
    const rights = rightsOf({
      roleRights: ROLE_RIGHTS.viewer,
      deniedPages: [...PAGE_KEYS],
    });
    expect(rights).toContain("preferences.own");
    expect(rights).toContain("notifications.read");
    expect(rights).not.toContain("projects.read");
  });

  it("reports the blacklist for non-admins", () => {
    expect(
      deniedPagesOf({ roleRights: ROLE_RIGHTS.viewer, deniedPages: ["settings", "settings"] }),
    ).toEqual(["settings"]);
  });
});

describe("roleFromKey", () => {
  it("accepts the three known keys", () => {
    expect(roleFromKey("admin")).toBe("admin");
    expect(roleFromKey("editor")).toBe("editor");
    expect(roleFromKey("viewer")).toBe("viewer");
  });

  it("falls back to the LEAST privileged role for anything unknown", () => {
    expect(roleFromKey(null)).toBe("viewer");
    expect(roleFromKey(undefined)).toBe("viewer");
    expect(roleFromKey("superuser")).toBe("viewer");
    expect(roleFromKey(42)).toBe("viewer");
  });
});
