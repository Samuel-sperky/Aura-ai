import { describe, it, expect, vi } from "vitest";

// `./defineRoute` imports the RBAC guards, which pull in @/lib/db. Mocking it
// keeps this pure-helper suite from ever constructing a real MariaDB pool.
// Same pattern as rbac.test.ts.
//
// Note: this mock alone does NOT make the file importable. @/lib/auth/session
// imports @/lib/env directly, and env.ts throws AT MODULE LOAD when secrets are
// absent (fail-closed by design, in every environment). The dummy values that
// satisfy it live centrally in vitest.config.ts `test.env`, so a missing
// `.env.local` cannot silently drop this file from the run.
vi.mock("@/lib/db", () => ({
  query: vi.fn(),
  execute: vi.fn(),
  withTransaction: vi.fn(),
  getPool: vi.fn(),
}));

import { versionConflict, notFound, badRequest } from "./defineRoute";

describe("versionConflict", () => {
  it("returns 409 with the VERSION_CONFLICT code and the current version", async () => {
    const res = versionConflict(7);
    expect(res.status).toBe(409);
    expect(res.headers.get("content-type")).toContain("application/json");
    await expect(res.json()).resolves.toEqual({
      error: "Záznam sa medzičasom zmenil. Obnovte údaje a skúste to znova.",
      code: "VERSION_CONFLICT",
      currentVersion: 7,
    });
  });

  it("keeps the canonical error envelope (Slovak message under `error`)", async () => {
    const body = (await versionConflict(1).json()) as { error: string };
    expect(typeof body.error).toBe("string");
    expect(body.error.length).toBeGreaterThan(0);
  });
});

describe("notFound / badRequest", () => {
  it("notFound is 404 with a Slovak default message", async () => {
    const res = notFound();
    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ error: "Záznam sa nenašiel." });
  });

  it("badRequest is 400 and passes a custom message through", async () => {
    const res = badRequest("Neplatné ID projektu.");
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: "Neplatné ID projektu.",
    });
  });
});
