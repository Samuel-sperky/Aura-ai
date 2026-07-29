// Unit tests for the projects data layer.
//
// `@/lib/db` and `@/lib/auth/audit` are mocked so nothing here needs a live
// database (and so importing this module never triggers env validation). The
// tests cover the computed rules the rest of the app depends on: progress,
// suggested health, risk-first ordering, the optimistic-concurrency handshake and
// the pagination envelope.

import { describe, it, expect, vi, beforeEach } from "vitest";

const dbMock = vi.hoisted(() => ({
  query: vi.fn(),
  execute: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  query: dbMock.query,
  execute: dbMock.execute,
  getPool: vi.fn(),
  getConnection: vi.fn(),
  withTransaction: vi.fn(),
  pingDb: vi.fn(),
}));

const auditMock = vi.hoisted(() => ({ auditAs: vi.fn(), audit: vi.fn() }));

vi.mock("@/lib/auth/audit", () => ({
  auditAs: auditMock.auditAs,
  audit: auditMock.audit,
  buildNewValues: vi.fn(),
  clientIpFromHeaders: vi.fn(),
  AUDIT_META_KEY: "__audit",
}));

import {
  computeProgress,
  expectedProgress,
  healthRank,
  listProjects,
  mapProjectRow,
  ownerInitialsOf,
  recomputeProjectProgress,
  sortProjectsByRisk,
  suggestHealth,
  updateProject,
} from "./projects";
import { pageMeta, toPagination } from "./data";
import {
  projectDeleteSchema,
  projectUpdateSchema,
  resolvePreferences,
  viewConfigSchema,
  type ProjectDto,
} from "./contracts/projects";

const ACTOR = { id: "u-1", email: "admin@aura.test" };

/** A `projects` row as ALIASED by PROJECT_SELECT. */
function row(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "p-1",
    code: "IT-401",
    name: "Portál pre partnerov",
    description: null,
    area: "Business aplikácie",
    status: "on_track",
    health: "amber",
    progress: 40,
    owner: "Jana Kováčová",
    owner_initials: "JK",
    start_date: "2026-01-01",
    end_date: "2026-06-30",
    priority: "P2",
    next_checkpoint: "Schválenie zámeru",
    next_checkpoint_date: "2026-02-10",
    version_token: 20260101120000,
    created_at: "2026-01-01T10:00:00.000Z",
    updated_at: "2026-01-01T12:00:00.000Z",
    created_by: "u-1",
    updated_by: null,
    ...over,
  };
}

/** A `ProjectDto` for the pure helpers. */
function dto(over: Partial<ProjectDto> = {}): ProjectDto {
  return { ...mapProjectRow(row() as never), ...over };
}

beforeEach(() => {
  dbMock.query.mockReset();
  dbMock.execute.mockReset();
  auditMock.auditAs.mockReset();
  auditMock.auditAs.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// computeProgress — the story-point ratio, including division by zero
// ---------------------------------------------------------------------------

describe("computeProgress", () => {
  it("is the rounded percentage of completed story points", () => {
    expect(computeProgress(10, 4)).toBe(40);
    expect(computeProgress(8, 8)).toBe(100);
    expect(computeProgress(3, 1)).toBe(33);
    expect(computeProgress(3, 2)).toBe(67);
  });

  it("returns 0 instead of NaN when there is nothing to measure", () => {
    // A project with no items, or with items that all carry 0 story points.
    expect(computeProgress(0, 0)).toBe(0);
    expect(computeProgress(0, 5)).toBe(0);
    expect(computeProgress(-1, 5)).toBe(0);
    expect(computeProgress(Number.NaN, 5)).toBe(0);
  });

  it("clamps into 0–100 even if the done sum exceeds the total", () => {
    expect(computeProgress(5, 9)).toBe(100);
    expect(computeProgress(5, -3)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// recomputeProjectProgress — SQL contract + persistence
// ---------------------------------------------------------------------------

describe("recomputeProjectProgress", () => {
  it("stores the computed percentage and returns it", async () => {
    dbMock.query.mockResolvedValueOnce([{ total_points: 20, done_points: 5 }]);
    dbMock.execute.mockResolvedValueOnce({ affectedRows: 1 });

    await expect(recomputeProjectProgress("p-1")).resolves.toBe(25);
    expect(dbMock.execute).toHaveBeenCalledWith(expect.stringContaining("UPDATE projects"), [
      25,
      "p-1",
    ]);
  });

  it("writes 0 for a project with no measurable points (division by zero)", async () => {
    dbMock.query.mockResolvedValueOnce([{ total_points: 0, done_points: 0 }]);
    dbMock.execute.mockResolvedValueOnce({ affectedRows: 1 });

    await expect(recomputeProjectProgress("p-1")).resolves.toBe(0);
    expect(dbMock.execute.mock.calls[0]?.[1]).toEqual([0, "p-1"]);
  });

  it("writes 0 when the aggregate query returns no row at all", async () => {
    dbMock.query.mockResolvedValueOnce([]);
    dbMock.execute.mockResolvedValueOnce({ affectedRows: 1 });

    await expect(recomputeProjectProgress("p-1")).resolves.toBe(0);
  });

  it("counts LEAF items only, so a parent never double-counts its children", async () => {
    dbMock.query.mockResolvedValueOnce([{ total_points: 1, done_points: 0 }]);
    dbMock.execute.mockResolvedValueOnce({ affectedRows: 1 });
    await recomputeProjectProgress("p-1");

    const sql = String(dbMock.query.mock.calls[0]?.[0]);
    expect(sql).toContain("NOT EXISTS");
    expect(sql).toContain("c.parent_id = w.id");
  });

  it("does NOT touch updated_at — it must not invalidate the concurrency token", async () => {
    dbMock.query.mockResolvedValueOnce([{ total_points: 4, done_points: 2 }]);
    dbMock.execute.mockResolvedValueOnce({ affectedRows: 1 });
    await recomputeProjectProgress("p-1");

    expect(String(dbMock.execute.mock.calls[0]?.[0])).not.toContain("updated_at");
  });
});

// NOTE: the `next_checkpoint` cache refresh is covered in checkpoints.test.ts
// (`refreshProjectNextCheckpoint`) — the pool-based duplicate that used to live
// in projects.ts is gone, because it could not see a transaction's uncommitted
// checkpoint change.

// ---------------------------------------------------------------------------
// expectedProgress / suggestHealth — the 60 % and 100 % bands
// ---------------------------------------------------------------------------

describe("expectedProgress", () => {
  // A ten-day window so the arithmetic is exact.
  const start = "2026-01-01";
  const end = "2026-01-11";

  it("is the elapsed share of the project window", () => {
    expect(expectedProgress(start, end, new Date(2026, 0, 6, 12))).toBe(50);
    expect(expectedProgress(start, end, new Date(2026, 0, 3, 23))).toBe(20);
  });

  it("is 0 before the start and 100 from the end onwards", () => {
    expect(expectedProgress(start, end, new Date(2026, 0, 1, 8))).toBe(0);
    expect(expectedProgress(start, end, new Date(2025, 11, 20))).toBe(0);
    expect(expectedProgress(start, end, new Date(2026, 0, 11))).toBe(100);
    expect(expectedProgress(start, end, new Date(2026, 5, 1))).toBe(100);
  });

  it("is null without both dates", () => {
    expect(expectedProgress(null, end)).toBeNull();
    expect(expectedProgress(start, null)).toBeNull();
    expect(expectedProgress(null, null)).toBeNull();
  });

  it("reports an inverted range as unmeasurable rather than guessing", () => {
    expect(expectedProgress("2026-01-11", "2026-01-01", new Date(2026, 0, 6))).toBeNull();
    expect(
      suggestHealth(
        { progress: 0, startDate: "2026-01-11", endDate: "2026-01-01" },
        new Date(2026, 0, 6),
      ),
    ).toBe("grey");
  });

  it("handles a single-day project", () => {
    expect(expectedProgress("2026-01-05", "2026-01-05", new Date(2026, 0, 4))).toBe(0);
    expect(expectedProgress("2026-01-05", "2026-01-05", new Date(2026, 0, 6))).toBe(100);
  });
});

describe("suggestHealth", () => {
  const start = "2026-01-01";
  const end = "2026-01-11";
  // Half the window elapsed → the calendar expects 50 % progress.
  const midpoint = new Date(2026, 0, 6, 12);

  it("is green exactly AT the 100 % band boundary", () => {
    expect(suggestHealth({ progress: 50, startDate: start, endDate: end }, midpoint)).toBe(
      "green",
    );
    expect(suggestHealth({ progress: 80, startDate: start, endDate: end }, midpoint)).toBe(
      "green",
    );
  });

  it("is amber just below 100 % and exactly AT the 60 % boundary", () => {
    expect(suggestHealth({ progress: 49, startDate: start, endDate: end }, midpoint)).toBe(
      "amber",
    );
    // 30 / 50 = exactly 60 %.
    expect(suggestHealth({ progress: 30, startDate: start, endDate: end }, midpoint)).toBe(
      "amber",
    );
  });

  it("is red just below the 60 % boundary", () => {
    expect(suggestHealth({ progress: 29, startDate: start, endDate: end }, midpoint)).toBe(
      "red",
    );
    expect(suggestHealth({ progress: 0, startDate: start, endDate: end }, midpoint)).toBe(
      "red",
    );
  });

  it("is grey without dates — no data, not a verdict", () => {
    expect(suggestHealth({ progress: 0, startDate: null, endDate: null })).toBe("grey");
    expect(suggestHealth({ progress: 90, startDate: start, endDate: null })).toBe("grey");
  });

  it("is green before the start: nothing is due yet", () => {
    expect(
      suggestHealth({ progress: 0, startDate: start, endDate: end }, new Date(2025, 11, 1)),
    ).toBe("green");
  });

  it("judges a finished window against 100 %", () => {
    const after = new Date(2026, 1, 1);
    expect(suggestHealth({ progress: 100, startDate: start, endDate: end }, after)).toBe(
      "green",
    );
    expect(suggestHealth({ progress: 60, startDate: start, endDate: end }, after)).toBe(
      "amber",
    );
    expect(suggestHealth({ progress: 59, startDate: start, endDate: end }, after)).toBe(
      "red",
    );
  });
});

// ---------------------------------------------------------------------------
// Risk-first ordering (spec Q2)
// ---------------------------------------------------------------------------

describe("healthRank / sortProjectsByRisk", () => {
  it("ranks red loudest, then amber, then grey, then green", () => {
    expect(healthRank("red")).toBeLessThan(healthRank("amber"));
    expect(healthRank("amber")).toBeLessThan(healthRank("grey"));
    expect(healthRank("grey")).toBeLessThan(healthRank("green"));
  });

  it("treats an unknown health value as grey rather than as best-case", () => {
    expect(healthRank("blue")).toBe(healthRank("grey"));
    expect(healthRank("")).toBe(healthRank("grey"));
  });

  it("puts red first, then sorts by the nearest checkpoint", () => {
    const projects = [
      dto({ code: "A", health: "green", nextCheckpointDate: "2026-01-05" }),
      dto({ code: "B", health: "red", nextCheckpointDate: "2026-09-01" }),
      dto({ code: "C", health: "amber", nextCheckpointDate: "2026-02-01" }),
      dto({ code: "D", health: "red", nextCheckpointDate: "2026-03-01" }),
      dto({ code: "E", health: "grey", nextCheckpointDate: "2026-01-02" }),
    ];

    expect(sortProjectsByRisk(projects).map((p) => p.code)).toEqual([
      "D", // red, nearer checkpoint
      "B", // red, later checkpoint
      "C", // amber
      "E", // grey
      "A", // green
    ]);
  });

  it("puts projects without a next checkpoint after those that have one", () => {
    const projects = [
      dto({ code: "NONE", health: "amber", nextCheckpointDate: null }),
      dto({ code: "SOON", health: "amber", nextCheckpointDate: "2026-12-31" }),
    ];
    expect(sortProjectsByRisk(projects).map((p) => p.code)).toEqual(["SOON", "NONE"]);
  });

  it("breaks ties by priority and then by code, and does not mutate the input", () => {
    const projects = [
      dto({ code: "Z", health: "green", nextCheckpointDate: null, priority: "P2" }),
      dto({ code: "A", health: "green", nextCheckpointDate: null, priority: "P2" }),
      dto({ code: "M", health: "green", nextCheckpointDate: null, priority: "P1" }),
    ];
    const original = projects.map((p) => p.code);

    expect(sortProjectsByRisk(projects).map((p) => p.code)).toEqual(["M", "A", "Z"]);
    expect(projects.map((p) => p.code)).toEqual(original);
  });
});

// ---------------------------------------------------------------------------
// listProjects — the default ORDER BY and the filter plumbing
// ---------------------------------------------------------------------------

describe("listProjects", () => {
  it("defaults to the risk-first ORDER BY and reports the total", async () => {
    dbMock.query.mockResolvedValueOnce([{ n: 3 }]).mockResolvedValueOnce([row()]);

    const pg = toPagination(1, 50);
    const result = await listProjects({}, pg);

    expect(result.total).toBe(3);
    expect(result.items).toHaveLength(1);

    const listSql = String(dbMock.query.mock.calls[1]?.[0]);
    expect(listSql).toContain("CASE p.health WHEN 'red' THEN 0");
    expect(listSql).toContain("p.next_checkpoint_date IS NULL ASC");
    expect(dbMock.query.mock.calls[1]?.[1]).toEqual([50, 0]);
  });

  it("parameterizes every filter and escapes the LIKE term", async () => {
    dbMock.query.mockResolvedValueOnce([{ n: 0 }]).mockResolvedValueOnce([]);

    await listProjects(
      { area: "Business aplikácie", status: "at_risk", priority: "P1", q: "50%_x" },
      toPagination(2, 20),
    );

    const params = dbMock.query.mock.calls[0]?.[1] as unknown[];
    expect(params.slice(0, 3)).toEqual(["Business aplikácie", "at_risk", "P1"]);
    // The wildcards the user typed are escaped so they match literally.
    expect(params[3]).toBe("%50\\%\\_x%");
    expect(String(dbMock.query.mock.calls[0]?.[0])).not.toContain("at_risk");
  });

  it("falls back to the risk order for an unmapped sort key", async () => {
    dbMock.query.mockResolvedValueOnce([{ n: 0 }]).mockResolvedValueOnce([]);
    await listProjects({ sort: "risk" }, toPagination(1, 10));
    expect(String(dbMock.query.mock.calls[1]?.[0])).toContain("p.priority ASC, p.code ASC");
  });

  it("maps an allow-listed sort key to its column with a stable tie-breaker", async () => {
    dbMock.query.mockResolvedValueOnce([{ n: 0 }]).mockResolvedValueOnce([]);
    await listProjects({ sort: "progress", dir: "desc" }, toPagination(1, 10));
    expect(String(dbMock.query.mock.calls[1]?.[0])).toContain(
      "ORDER BY p.progress DESC, p.code ASC",
    );
  });
});

// ---------------------------------------------------------------------------
// mapProjectRow
// ---------------------------------------------------------------------------

describe("mapProjectRow", () => {
  it("exposes the derived concurrency token as `version`", () => {
    expect(mapProjectRow(row() as never).version).toBe(20260101120000);
  });

  it("never lets the version fall below 1", () => {
    expect(mapProjectRow(row({ version_token: 0 }) as never).version).toBe(1);
    expect(mapProjectRow(row({ version_token: null }) as never).version).toBe(1);
  });

  it("keeps DATE columns as calendar strings — no timezone shift", () => {
    const p = mapProjectRow(row({ start_date: "2026-07-28" }) as never);
    expect(p.startDate).toBe("2026-07-28");
  });

  it("normalises an empty next_checkpoint to null and unknown enums to defaults", () => {
    const p = mapProjectRow(
      row({ next_checkpoint: "", health: "blue", status: "Prebieha", priority: "P9" }) as never,
    );
    expect(p.nextCheckpoint).toBeNull();
    expect(p.health).toBe("grey");
    expect(p.status).toBe("planned");
    expect(p.priority).toBe("P2");
  });
});

// ---------------------------------------------------------------------------
// updateProject — optimistic concurrency, both layers
// ---------------------------------------------------------------------------

describe("updateProject", () => {
  it("returns not_found for a missing project", async () => {
    dbMock.query.mockResolvedValueOnce([]);
    await expect(updateProject("nope", { name: "X" }, 1, ACTOR)).resolves.toEqual({
      ok: false,
      reason: "not_found",
    });
    expect(dbMock.execute).not.toHaveBeenCalled();
  });

  it("rejects a stale version BEFORE writing anything (layer 1)", async () => {
    dbMock.query.mockResolvedValueOnce([row({ version_token: 20260101120000 })]);

    await expect(
      updateProject("p-1", { name: "Nový názov" }, 20260101110000, ACTOR),
    ).resolves.toEqual({
      ok: false,
      reason: "conflict",
      currentVersion: 20260101120000,
    });
    expect(dbMock.execute).not.toHaveBeenCalled();
  });

  it("reports a conflict when the compare-and-swap loses the race (layer 2)", async () => {
    dbMock.query
      .mockResolvedValueOnce([row({ version_token: 20260101120000 })]) // read
      .mockResolvedValueOnce([row({ version_token: 20260101120500 })]); // re-read
    dbMock.execute.mockResolvedValueOnce({ affectedRows: 0 });

    await expect(
      updateProject("p-1", { name: "Nový názov" }, 20260101120000, ACTOR),
    ).resolves.toEqual({
      ok: false,
      reason: "conflict",
      currentVersion: 20260101120500,
    });
    expect(auditMock.auditAs).not.toHaveBeenCalled();
  });

  it("writes a compare-and-swap UPDATE that also advances the token", async () => {
    dbMock.query
      .mockResolvedValueOnce([row({ version_token: 20260101120000 })])
      .mockResolvedValueOnce([row({ name: "Nový názov", version_token: 20260101120001 })]);
    dbMock.execute.mockResolvedValueOnce({ affectedRows: 1 });

    const result = await updateProject(
      "p-1",
      { name: "Nový názov" },
      20260101120000,
      ACTOR,
    );

    expect(result).toMatchObject({ ok: true });
    const [sql, params] = dbMock.execute.mock.calls[0] as [string, unknown[]];
    // Compare-and-swap on the derived token…
    expect(sql).toContain("WHERE `id` = ? AND CAST(DATE_FORMAT(COALESCE(updated_at");
    // …and a strictly increasing new token, so two writes in the same second
    // cannot both succeed.
    expect(sql).toContain("GREATEST(CURRENT_TIMESTAMP");
    expect(params.at(-1)).toBe(20260101120000);
    expect(params.at(-2)).toBe("p-1");
  });

  it("audits the update with both the old and the new state", async () => {
    dbMock.query
      .mockResolvedValueOnce([row()])
      .mockResolvedValueOnce([row({ name: "Nový názov" })]);
    dbMock.execute.mockResolvedValueOnce({ affectedRows: 1 });

    await updateProject("p-1", { name: "Nový názov" }, 20260101120000, ACTOR);

    expect(auditMock.auditAs).toHaveBeenCalledWith(
      ACTOR,
      expect.objectContaining({
        action: "project.update",
        entity: "projects",
        entityId: "p-1",
        oldValues: expect.objectContaining({ name: "Portál pre partnerov" }),
        newValues: expect.objectContaining({ name: "Nový názov" }),
      }),
    );
  });

  it("re-derives the owner initials when the owner changes without new ones", async () => {
    dbMock.query
      .mockResolvedValueOnce([row()])
      .mockResolvedValueOnce([row({ owner: "Peter Novák", owner_initials: "PN" })]);
    dbMock.execute.mockResolvedValueOnce({ affectedRows: 1 });

    await updateProject("p-1", { owner: "Peter Novák" }, 20260101120000, ACTOR);

    const params = dbMock.execute.mock.calls[0]?.[1] as unknown[];
    expect(params).toContain("Peter Novák");
    expect(params).toContain("PN");
  });

  it("refuses a code that another project already uses", async () => {
    dbMock.query
      .mockResolvedValueOnce([row({ code: "IT-401" })])
      .mockResolvedValueOnce([{ id: "p-2" }]);

    await expect(
      updateProject("p-1", { code: "IT-999" }, 20260101120000, ACTOR),
    ).resolves.toEqual({ ok: false, reason: "duplicate_code" });
    expect(dbMock.execute).not.toHaveBeenCalled();
  });

  it("coerces a null into '' for the NOT NULL text columns", async () => {
    dbMock.query.mockResolvedValueOnce([row()]).mockResolvedValueOnce([row({ area: "" })]);
    dbMock.execute.mockResolvedValueOnce({ affectedRows: 1 });

    await updateProject("p-1", { area: null as never }, 20260101120000, ACTOR);

    const params = dbMock.execute.mock.calls[0]?.[1] as unknown[];
    expect(params[0]).toBe("");
  });
});

// ---------------------------------------------------------------------------
// ownerInitialsOf
// ---------------------------------------------------------------------------

describe("ownerInitialsOf", () => {
  it("takes the first letter of the first two words, uppercased", () => {
    expect(ownerInitialsOf("Jana Kováčová")).toBe("JK");
    expect(ownerInitialsOf("jana mária kováčová")).toBe("JM");
    expect(ownerInitialsOf("Ľubomír")).toBe("Ľ");
  });

  it("survives empty and whitespace-only input", () => {
    expect(ownerInitialsOf("")).toBe("");
    expect(ownerInitialsOf("   ")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// pageMeta for a projects page
// ---------------------------------------------------------------------------

describe("pageMeta for the project list", () => {
  it("describes a middle page correctly", () => {
    expect(pageMeta(toPagination(2, 20), 45)).toEqual({
      page: 2,
      pageSize: 20,
      total: 45,
      totalPages: 3,
      hasMore: true,
    });
  });

  it("marks the last page as having no more rows", () => {
    expect(pageMeta(toPagination(3, 20), 45)).toMatchObject({
      page: 3,
      totalPages: 3,
      hasMore: false,
    });
  });

  it("handles an empty project table", () => {
    expect(pageMeta(toPagination(1, 50), 0)).toEqual({
      page: 1,
      pageSize: 50,
      total: 0,
      totalPages: 0,
      hasMore: false,
    });
  });

  it("fits the whole target scale (50 projects) on one page", () => {
    expect(pageMeta(toPagination(1, 50), 50)).toMatchObject({
      totalPages: 1,
      hasMore: false,
    });
  });
});

// ---------------------------------------------------------------------------
// Contracts
// ---------------------------------------------------------------------------

describe("projectUpdateSchema", () => {
  it("requires the version token", () => {
    expect(projectUpdateSchema.safeParse({ name: "Nový názov" }).success).toBe(false);
  });

  it("requires at least one editable field", () => {
    const parsed = projectUpdateSchema.safeParse({ version: 1 });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toBe("Nie je čo zmeniť.");
    }
  });

  it("rejects an end date before the start date", () => {
    const parsed = projectUpdateSchema.safeParse({
      version: 1,
      startDate: "2026-06-30",
      endDate: "2026-01-01",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toBe("Koniec nemôže byť pred začiatkom.");
    }
  });

  it("accepts an explicit null to clear a date", () => {
    expect(
      projectUpdateSchema.safeParse({ version: 2, endDate: null }).success,
    ).toBe(true);
  });
});

describe("projectDeleteSchema", () => {
  it("normalises the typed confirmation to upper case", () => {
    const parsed = projectDeleteSchema.parse({ code: " it-401 " });
    expect(parsed.code).toBe("IT-401");
  });
});

describe("resolvePreferences", () => {
  it("fills the family defaults: dark theme, cozy density, Slovak", () => {
    expect(resolvePreferences({})).toEqual({
      theme: "dark",
      density: "cozy",
      lang: "sk",
    });
    expect(resolvePreferences(null)).toEqual({
      theme: "dark",
      density: "cozy",
      lang: "sk",
    });
  });

  it("keeps valid values and repairs invalid ones instead of throwing", () => {
    expect(resolvePreferences({ theme: "light", density: "nonsense", lang: "en" })).toEqual(
      { theme: "light", density: "cozy", lang: "en" },
    );
  });

  it("drops keys that are not part of the contract", () => {
    expect(resolvePreferences({ theme: "system", rogueKey: 1 })).toEqual({
      theme: "system",
      density: "cozy",
      lang: "sk",
    });
  });
});

describe("viewConfigSchema", () => {
  it("accepts a typical page state, including unanticipated keys", () => {
    const parsed = viewConfigSchema.safeParse({
      view: "table",
      sort: "risk",
      dir: "desc",
      pageSize: 50,
      filters: { area: "Business aplikácie", priority: ["P1", "P2"] },
      somethingNew: "kept",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a config whose serialized size would bloat the JSON column", () => {
    const parsed = viewConfigSchema.safeParse({ q: "x", blob: "y".repeat(5000) });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toBe(
        "Konfigurácia pohľadu je príliš veľká.",
      );
    }
  });

  it("rejects an out-of-range pageSize", () => {
    expect(viewConfigSchema.safeParse({ pageSize: 999_999 }).success).toBe(false);
  });
});
