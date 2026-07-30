// Unit tests for the Prehľad aggregate (`GET /api/overview`).
//
// `@/lib/db` and `@/lib/auth/audit` are mocked, so nothing here needs a live
// database (and importing this module never reaches `next/headers`). Two layers
// are covered:
//
//   1. the PURE rules behind the six KPI tiles, on their boundaries: no projects
//      at all, an active sprint with no planned capacity (division by zero), and
//      an item due exactly TODAY, which is not late yet;
//   2. the assembled response — that a caller without a right gets an EMPTY block
//      instead of a 403, and that the block's query is not even sent.
//
// Runs under TZ=Europe/Bratislava (vitest.config.ts), so the DST weekend is a real
// guard rather than a UTC no-op.

import { describe, it, expect, vi, beforeEach } from "vitest";

const dbMock = vi.hoisted(() => ({ query: vi.fn(), execute: vi.fn() }));

vi.mock("@/lib/db", () => ({
  query: dbMock.query,
  execute: dbMock.execute,
  getPool: vi.fn(),
  getConnection: vi.fn(),
  withTransaction: vi.fn(),
  pingDb: vi.fn(),
  closePool: vi.fn(),
}));

// `@/lib/auth/audit` reaches `next/headers`; only the envelope key is used here.
vi.mock("@/lib/auth/audit", () => ({
  AUDIT_META_KEY: "__audit",
  audit: vi.fn(),
  auditAs: vi.fn(),
  buildNewValues: vi.fn(),
  clientIpFromHeaders: vi.fn(),
}));

import {
  OVERVIEW_ACTIVITY_ROWS,
  OVERVIEW_CHECKPOINT_LIMIT,
  OVERVIEW_DONE_SCAN_LIMIT,
  OVERVIEW_DONE_WINDOW_DAYS,
  computeKpis,
  getOverview,
  isActiveProjectStatus,
  isAtRiskHealth,
  overdueCutoff,
  type OverviewKpiInput,
} from "./overview";
import { overviewResponseSchema } from "./contracts/overview";

beforeEach(() => {
  dbMock.query.mockReset();
});

// ---------------------------------------------------------------------------
// Project predicates
// ---------------------------------------------------------------------------

describe("project predicates", () => {
  it("counts every status except `planned` as active", () => {
    expect(isActiveProjectStatus("on_track")).toBe(true);
    expect(isActiveProjectStatus("at_risk")).toBe(true);
    expect(isActiveProjectStatus("blocked")).toBe(true);
    expect(isActiveProjectStatus("planned")).toBe(false);
  });

  it("treats only red and amber health as at risk (grey is neutral)", () => {
    expect(isAtRiskHealth("red")).toBe(true);
    expect(isAtRiskHealth("amber")).toBe(true);
    expect(isAtRiskHealth("green")).toBe(false);
    expect(isAtRiskHealth("grey")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// The overdue boundary
// ---------------------------------------------------------------------------

describe("overdueCutoff", () => {
  it("is YESTERDAY, so an item due exactly today is NOT overdue", () => {
    const today = "2026-07-29";
    const cutoff = overdueCutoff(today);
    expect(cutoff).toBe("2026-07-28");
    // The count runs `due_date <= cutoff` — this is that comparison.
    expect(today <= cutoff).toBe(false);
    expect("2026-07-28" <= cutoff).toBe(true);
    expect("2026-07-30" <= cutoff).toBe(false);
  });

  it("crosses month, year and DST boundaries by exactly one day", () => {
    expect(overdueCutoff("2026-08-01")).toBe("2026-07-31");
    expect(overdueCutoff("2026-01-01")).toBe("2025-12-31");
    expect(overdueCutoff("2026-03-01")).toBe("2026-02-28");
    // The night the clocks go forward in Europe/Bratislava.
    expect(overdueCutoff("2026-03-30")).toBe("2026-03-29");
    // …and back again in October.
    expect(overdueCutoff("2026-10-26")).toBe("2026-10-25");
  });

  it("fails closed on an unparseable day (nothing is reported as overdue)", () => {
    for (const bad of ["", "nope", "2026-7-9", "29.7.2026"]) {
      const cutoff = overdueCutoff(bad);
      expect("2026-07-29" <= cutoff).toBe(false);
      expect("1990-01-01" <= cutoff).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// The six KPI tiles
// ---------------------------------------------------------------------------

const EMPTY_KPI_INPUT: OverviewKpiInput = {
  projects: [],
  openCheckpointCount: 0,
  myDecisionCount: 0,
  overdueItemCount: 0,
  activeSprint: null,
};

describe("computeKpis", () => {
  it("returns zeros and no sprint for an empty app (0 projects)", () => {
    expect(computeKpis(EMPTY_KPI_INPUT)).toEqual({
      activeProjects: 0,
      projectsAtRisk: 0,
      openCheckpoints: 0,
      myDecisions: 0,
      sprintName: null,
      sprintCapacityUsedPercent: null,
      overdueItems: 0,
    });
  });

  it("counts active and at-risk projects independently of each other", () => {
    const kpis = computeKpis({
      ...EMPTY_KPI_INPUT,
      projects: [
        { status: "on_track", health: "green" },
        { status: "at_risk", health: "amber" },
        { status: "blocked", health: "red" },
        // Planned but already red: at risk, not yet active.
        { status: "planned", health: "red" },
        { status: "planned", health: "grey" },
      ],
    });
    expect(kpis.activeProjects).toBe(3);
    expect(kpis.projectsAtRisk).toBe(3);
  });

  it("passes the queue and overdue totals straight through", () => {
    const kpis = computeKpis({
      ...EMPTY_KPI_INPUT,
      openCheckpointCount: 17,
      myDecisionCount: 4,
      overdueItemCount: 9,
    });
    expect(kpis).toMatchObject({
      openCheckpoints: 17,
      myDecisions: 4,
      overdueItems: 9,
    });
  });

  it("clamps a nonsensical count to a non-negative integer", () => {
    const kpis = computeKpis({
      ...EMPTY_KPI_INPUT,
      openCheckpointCount: -3,
      myDecisionCount: 2.7,
      overdueItemCount: Number.NaN,
    });
    expect(kpis).toMatchObject({
      openCheckpoints: 0,
      myDecisions: 2,
      overdueItems: 0,
    });
  });

  it("reports capacity use as a percentage of the planned capacity", () => {
    const kpis = computeKpis({
      ...EMPTY_KPI_INPUT,
      activeSprint: { name: "Sprint 7", donePoints: 21, capacityPoints: 40 },
    });
    expect(kpis.sprintName).toBe("Sprint 7");
    expect(kpis.sprintCapacityUsedPercent).toBe(52.5);
  });

  it("reads 0 % — never NaN or Infinity — when no capacity is planned", () => {
    const kpis = computeKpis({
      ...EMPTY_KPI_INPUT,
      activeSprint: { name: "Sprint 8", donePoints: 13, capacityPoints: 0 },
    });
    expect(kpis.sprintCapacityUsedPercent).toBe(0);
    expect(Number.isFinite(kpis.sprintCapacityUsedPercent ?? Number.NaN)).toBe(true);
  });

  it("keeps the tile empty (null, not 0 %) when no sprint is active", () => {
    // The strip renders an em dash for null; 0 % would claim an idle sprint.
    expect(computeKpis(EMPTY_KPI_INPUT).sprintCapacityUsedPercent).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// The assembled response
// ---------------------------------------------------------------------------

const PROJECT_ROW = {
  id: "p1",
  code: "AURA",
  name: "Aura Roadmap",
  description: null,
  area: "Interné",
  status: "at_risk",
  health: "amber",
  progress: 42,
  owner: "Jana Nováková",
  owner_initials: "JN",
  start_date: "2026-07-01",
  end_date: "2026-12-31",
  priority: "P1",
  next_checkpoint: "Gate 1",
  next_checkpoint_date: "2026-08-10",
  version_token: 20260728120000,
  created_at: null,
  updated_at: null,
  created_by: null,
  updated_by: null,
};

const CHECKPOINT_ROW = {
  id: "c1",
  project_id: "p1",
  project_code: "AURA",
  project_name: "Aura Roadmap",
  name: "Gate 1",
  description: null,
  impact: null,
  checkpoint_type: "gate",
  lifecycle: "ready",
  due_date: "2026-08-10",
  start_date: null,
  end_date: null,
  owner_id: null,
  owner_name: null,
  owner_initials: null,
  approver_id: "u1",
  approver_name: "Jana Nováková",
  approver_initials: "JN",
  readiness: 100,
  required_count: 2,
  required_complete: 2,
  optional_count: 0,
  optional_complete: 0,
  decided_at: null,
  version: 3,
  created_at: null,
  updated_at: null,
};

const AUDIT_ROW = {
  // BIGINT arrives as a number (the pool sets `bigIntAsNumber`).
  id: 42,
  username: "admin@example.test",
  action: "checkpoint.decide",
  entity: "checkpoints",
  entity_id: "c1",
  ts: new Date("2026-07-29T08:15:00.000Z"),
  new_values: JSON.stringify({
    outcome: "go",
    __audit: { severity: "success", detail: "Rozhodnuté na porade" },
  }),
};

const DONE_ROW = {
  id: "w1",
  updated_at: new Date("2026-07-27T10:00:00.000Z"),
  story_points: 5,
};

/** SQL text → rows. Anything unmatched fails loudly instead of returning []. */
function routeQueries(): void {
  dbMock.query.mockImplementation(async (sql: string) => {
    // Order matters: the counters SELECT and the sprint SELECT both mention the
    // tables the later branches match on, so the specific keys come first.
    if (sql.includes("AS my_decisions")) {
      return [{ my_decisions: 2, overdue_items: 4 }];
    }
    if (sql.includes("COUNT(*) AS n FROM projects")) return [{ n: 1 }];
    if (sql.includes("FROM projects p")) return [PROJECT_ROW];
    if (sql.includes("COUNT(*) AS n FROM checkpoints")) return [{ n: 6 }];
    if (sql.includes("FROM checkpoint_decisions")) return [];
    if (sql.includes("FROM checkpoints c")) return [CHECKPOINT_ROW];
    if (sql.includes("FROM sprints s")) {
      return [{ name: "Sprint 7", capacity_points: 40, done_points: 10 }];
    }
    if (sql.includes("FROM work_items w")) return [DONE_ROW];
    if (sql.includes("FROM audit_log")) return [AUDIT_ROW];
    throw new Error(`unexpected SQL in test: ${sql.slice(0, 80)}`);
  });
}

/** Every SQL string the call ran, for "was this query even sent?" assertions. */
function sqlSeen(): string {
  return dbMock.query.mock.calls.map((c) => String(c[0])).join("\n---\n");
}

const ADMIN = { id: "u1", rights: ["admin"] as ReadonlyArray<string> };
const VIEWER = {
  id: "u2",
  rights: [
    "overview.read",
    "projects.read",
    "checkpoints.read",
    "work_items.read",
  ] as ReadonlyArray<string>,
};

describe("getOverview", () => {
  it("returns every block in the contracted shape for an admin", async () => {
    routeQueries();
    const data = await getOverview(ADMIN, { today: "2026-07-29" });

    expect(() => overviewResponseSchema.parse(data)).not.toThrow();
    expect(data.projects).toHaveLength(1);
    expect(data.projects[0]).toMatchObject({ code: "AURA", health: "amber" });
    expect(data.openCheckpoints).toHaveLength(1);
    expect(data.openCheckpoints[0]).toMatchObject({ id: "c1", readiness: 100 });
    expect(data.doneItems).toEqual([
      {
        id: "w1",
        updatedAt: "2026-07-27T10:00:00.000Z",
        ownStoryPoints: 5,
      },
    ]);
    expect(data.kpis).toEqual({
      activeProjects: 1,
      projectsAtRisk: 1,
      // The QUEUE total, not the length of the fetched page.
      openCheckpoints: 6,
      myDecisions: 2,
      sprintName: "Sprint 7",
      sprintCapacityUsedPercent: 25,
      overdueItems: 4,
    });
  });

  it("unwraps the activity rows the panel renders (detail from the envelope)", async () => {
    routeQueries();
    const data = await getOverview(ADMIN, { today: "2026-07-29" });

    expect(data.activity).toEqual([
      {
        id: "42",
        userEmail: "admin@example.test",
        action: "checkpoint.decide",
        entity: "checkpoints",
        entityId: "c1",
        ts: "2026-07-29T08:15:00.000Z",
        detail: "Rozhodnuté na porade",
      },
    ]);
  });

  it("binds YESTERDAY as the overdue cutoff, so today's items are not counted", async () => {
    routeQueries();
    await getOverview(ADMIN, { today: "2026-07-29" });

    const counters = dbMock.query.mock.calls.find((c) =>
      String(c[0]).includes("AS my_decisions"),
    );
    expect(counters).toBeDefined();
    expect(counters?.[1]).toEqual(["u1", "2026-07-28"]);
  });

  it("gives a caller without `audit.read` an EMPTY activity list, not a 403", async () => {
    routeQueries();
    const data = await getOverview(VIEWER, { today: "2026-07-29" });

    expect(data.activity).toEqual([]);
    // Not filtered afterwards — the query is never sent at all.
    expect(sqlSeen()).not.toContain("audit_log");
    // …and the rest of the dashboard is fully populated.
    expect(data.projects).toHaveLength(1);
    expect(data.openCheckpoints).toHaveLength(1);
    expect(data.kpis.openCheckpoints).toBe(6);
    expect(data.kpis.sprintName).toBe("Sprint 7");
  });

  it("empties a block whose right the caller lacks (denied page) without failing", async () => {
    routeQueries();
    const data = await getOverview(
      { id: "u3", rights: ["overview.read", "checkpoints.read"] },
      { today: "2026-07-29" },
    );

    expect(data.projects).toEqual([]);
    expect(data.doneItems).toEqual([]);
    expect(data.activity).toEqual([]);
    expect(data.kpis).toMatchObject({
      activeProjects: 0,
      projectsAtRisk: 0,
      // Still readable: the caller holds `checkpoints.read`.
      openCheckpoints: 6,
      myDecisions: 2,
      // work_items.read is missing → no sprint tile, no overdue count.
      sprintName: null,
      sprintCapacityUsedPercent: null,
      overdueItems: 0,
    });
    expect(sqlSeen()).not.toContain("FROM projects p");
  });

  it("binds the row limits it declares", async () => {
    routeQueries();
    await getOverview(ADMIN, { today: "2026-07-29" });

    // The done-item scan is bounded on BOTH axes: a time window and a hard cap.
    const done = dbMock.query.mock.calls.find((c) =>
      String(c[0]).includes("w.status = 'done'"),
    );
    expect(done?.[1]).toEqual([
      OVERVIEW_DONE_WINDOW_DAYS,
      OVERVIEW_DONE_SCAN_LIMIT,
    ]);

    const activity = dbMock.query.mock.calls.find((c) =>
      String(c[0]).includes("FROM audit_log"),
    );
    expect(activity?.[1]).toEqual([OVERVIEW_ACTIVITY_ROWS]);
  });

  it("survives an empty database (no rows anywhere)", async () => {
    dbMock.query.mockImplementation(async (sql: string) => {
      if (sql.includes("COUNT(*) AS n")) return [{ n: 0 }];
      if (sql.includes("AS my_decisions")) {
        return [{ my_decisions: 0, overdue_items: 0 }];
      }
      return [];
    });

    const data = await getOverview(ADMIN, { today: "2026-07-29" });
    expect(() => overviewResponseSchema.parse(data)).not.toThrow();
    expect(data).toEqual({
      kpis: {
        activeProjects: 0,
        projectsAtRisk: 0,
        openCheckpoints: 0,
        myDecisions: 0,
        sprintName: null,
        sprintCapacityUsedPercent: null,
        overdueItems: 0,
      },
      projects: [],
      openCheckpoints: [],
      doneItems: [],
      activity: [],
    });
  });
});

// ---------------------------------------------------------------------------
// Query cost. The endpoint replaced seven parallel requests, so it is the single
// thing every dashboard load pays for — it must not quietly fetch rows nobody
// renders.
// ---------------------------------------------------------------------------

describe("query cost", () => {
  it("asks for barely more checkpoints than the panel shows", () => {
    // The panel renders 6 (UPCOMING_ROWS) and the KPI needs only the TOTAL, which
    // listCheckpoints reports independently of the page size. 200 was pure overhead.
    expect(OVERVIEW_CHECKPOINT_LIMIT).toBeLessThanOrEqual(20);
    expect(OVERVIEW_CHECKPOINT_LIMIT).toBeGreaterThanOrEqual(6);
  });

  it("windows the done-item scan instead of walking all history", async () => {
    dbMock.query.mockImplementation(async (sql: string) => {
      if (sql.includes("COUNT(*) AS n")) return [{ n: 0 }];
      if (sql.includes("AS my_decisions")) {
        return [{ my_decisions: 0, overdue_items: 0 }];
      }
      return [];
    });

    await getOverview(ADMIN, { today: "2026-07-29" });

    const done = dbMock.query.mock.calls.find(
      (call) => String(call[0]).includes("w.status = 'done'"),
    );
    expect(done, "done-item query was not issued").toBeDefined();

    const sql = String(done?.[0]);
    // Bounded in SQL, not by pulling everything and filtering in JS.
    expect(sql).toContain("DATE_SUB");
    // A completed item with no timestamp cannot land in a week bucket, so the
    // client skips it — no reason to transfer it either.
    expect(sql).toContain("w.updated_at IS NOT NULL");
    expect(done?.[1]).toEqual([
      OVERVIEW_DONE_WINDOW_DAYS,
      OVERVIEW_DONE_SCAN_LIMIT,
    ]);
  });

  it("leaves the client's 12-week window real slack", () => {
    // The client picks the exact weeks from the browser's calendar day; the server
    // bound only has to be comfortably wider, including timezone skew at the edges.
    expect(OVERVIEW_DONE_WINDOW_DAYS).toBeGreaterThan(12 * 7);
  });
});
