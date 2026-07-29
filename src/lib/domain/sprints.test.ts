// Sprint lifecycle guards and metrics. The DB is mocked; what is under test are
// the rules the API must enforce:
//
//   * commit REFUSES without a sprint goal
//   * close REFUSES while any item is still open
//   * scope change is measured against the FROZEN commitment
//   * velocity averages finished sprints only
//   * carry-over is exactly "everything not done"
//   * capacity is per PERSON, split from the sprint's single capacity number

import { describe, it, expect, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({
  query: vi.fn(),
  execute: vi.fn(),
  withTransaction: vi.fn(),
}));
vi.mock("@/lib/db", () => db);

import {
  capacityBreakdown,
  capacityByAssignee,
  carryOverItems,
  carryOver,
  casUpdateSprint,
  commitPoints,
  completedPoints,
  nextSprintStatus,
  scopeChange,
  sprintActionError,
  sprintMetrics,
  sprintOrderBy,
  sprintTotalsFor,
  velocity,
  type CapacityAggregate,
} from "./sprints";

beforeEach(() => {
  db.query.mockReset();
  db.execute.mockReset();
  db.withTransaction.mockReset();
});

// ---------------------------------------------------------------------------
// Lifecycle guards
// ---------------------------------------------------------------------------

describe("sprintActionError — commit", () => {
  it("REFUSES a commit without a sprint goal", () => {
    expect(sprintActionError("commit", { status: "draft", goal: null })).toBe(
      "Pred commitom je povinný cieľ šprintu.",
    );
  });

  it("treats a whitespace-only goal as no goal", () => {
    expect(sprintActionError("commit", { status: "draft", goal: "   " })).toBe(
      "Pred commitom je povinný cieľ šprintu.",
    );
  });

  it("allows a commit from draft and from planned once a goal is set", () => {
    expect(
      sprintActionError("commit", { status: "draft", goal: "Dokončiť onboarding" }),
    ).toBeNull();
    expect(
      sprintActionError("commit", { status: "planned", goal: "Dokončiť onboarding" }),
    ).toBeNull();
  });

  it("refuses a commit on a sprint that is already running", () => {
    expect(
      sprintActionError("commit", { status: "active", goal: "Cieľ" }),
    ).toContain("Návrh alebo Plánovaný");
  });
});

describe("sprintActionError — start / review / cancel", () => {
  it("tells the user to commit first when starting a draft", () => {
    expect(sprintActionError("start", { status: "draft", goal: "Cieľ" })).toBe(
      "Šprint treba najprv commitnúť.",
    );
  });

  it("starts a planned sprint", () => {
    expect(sprintActionError("start", { status: "planned", goal: "Cieľ" })).toBeNull();
  });

  it("sends only a running sprint to review", () => {
    expect(sprintActionError("review", { status: "active", goal: "C" })).toBeNull();
    expect(sprintActionError("review", { status: "planned", goal: "C" })).not.toBeNull();
  });

  it("cancels anything still in play, but not a finished sprint", () => {
    expect(sprintActionError("cancel", { status: "active", goal: "C" })).toBeNull();
    expect(sprintActionError("cancel", { status: "completed", goal: "C" })).toContain(
      "ešte nie je uzavretý",
    );
  });
});

describe("sprintActionError — close", () => {
  it("REFUSES while items are still open", () => {
    expect(
      sprintActionError("close", { status: "active", goal: "C" }, { openItemCount: 3 }),
    ).toBe("Najprv vyhodnoťte alebo preneste všetky otvorené položky.");
  });

  it("closes from active and from review once nothing is open", () => {
    expect(
      sprintActionError("close", { status: "active", goal: "C" }, { openItemCount: 0 }),
    ).toBeNull();
    expect(
      sprintActionError("close", { status: "review", goal: "C" }, { openItemCount: 0 }),
    ).toBeNull();
  });

  it("refuses to close a draft", () => {
    expect(
      sprintActionError("close", { status: "draft", goal: "C" }, { openItemCount: 0 }),
    ).not.toBeNull();
  });
});

describe("sprintActionError — carry-over", () => {
  it("refuses from a sprint that never started", () => {
    expect(sprintActionError("carry-over", { status: "draft", goal: "C" })).toContain(
      "rozbehnutého šprintu",
    );
  });

  it("allows it from active, review and completed", () => {
    for (const status of ["active", "review", "completed"]) {
      expect(sprintActionError("carry-over", { status, goal: "C" })).toBeNull();
    }
  });
});

describe("nextSprintStatus", () => {
  it("maps each action to its target status", () => {
    expect(nextSprintStatus("commit")).toBe("planned");
    expect(nextSprintStatus("start")).toBe("active");
    expect(nextSprintStatus("review")).toBe("review");
    expect(nextSprintStatus("close")).toBe("completed");
    expect(nextSprintStatus("cancel")).toBe("cancelled");
  });

  it("leaves the status alone for carry-over", () => {
    expect(nextSprintStatus("carry-over")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

const items = [
  { id: "a", storyPoints: 5, statusCategory: "done", assigneeId: "u1" },
  { id: "b", storyPoints: 3, statusCategory: "in_progress", assigneeId: "u1" },
  { id: "c", storyPoints: 2, statusCategory: "backlog", assigneeId: null },
];

describe("commitPoints / completedPoints", () => {
  it("sums everything in the sprint, and only the done part", () => {
    expect(commitPoints(items)).toBe(10);
    expect(completedPoints(items)).toBe(5);
  });

  it("is 0 for an empty sprint", () => {
    expect(commitPoints([])).toBe(0);
    expect(completedPoints([])).toBe(0);
  });
});

describe("scopeChange", () => {
  it("reports the creep after an item is added mid-sprint", () => {
    // committed 20, then a 6-point item lands in the sprint
    expect(scopeChange(20, 26)).toEqual({
      committedPoints: 20,
      currentPoints: 26,
      delta: 6,
      percent: 30,
    });
  });

  it("reports a negative delta when scope is pulled out", () => {
    expect(scopeChange(20, 14)).toMatchObject({ delta: -6, percent: -30 });
  });

  it("is 0 % before the sprint is committed (no baseline to compare against)", () => {
    expect(scopeChange(0, 8)).toMatchObject({ delta: 8, percent: 0 });
  });
});

describe("velocity", () => {
  it("averages the last three finished sprints", () => {
    const history = [
      { completedPoints: 10, status: "completed" },
      { completedPoints: 20, status: "completed" },
      { completedPoints: 30, status: "completed" },
      { completedPoints: 40, status: "completed" },
    ];
    expect(velocity(history)).toBe(30); // (20 + 30 + 40) / 3
  });

  it("ignores sprints that are not finished yet", () => {
    const history = [
      { completedPoints: 20, status: "completed" },
      { completedPoints: 0, status: "active" },
    ];
    expect(velocity(history)).toBe(20);
  });

  it("honours a custom window and rounds to one decimal", () => {
    const history = [
      { completedPoints: 10, status: "completed" },
      { completedPoints: 13, status: "completed" },
    ];
    expect(velocity(history, 2)).toBe(11.5);
  });

  it("is 0 without any finished sprint", () => {
    expect(velocity([])).toBe(0);
    expect(velocity([{ completedPoints: 5, status: "active" }])).toBe(0);
  });
});

describe("carryOver", () => {
  it("is exactly the items that are not done", () => {
    expect(carryOver(items).map((i) => i.id)).toEqual(["b", "c"]);
  });

  it("is empty when the sprint finished everything", () => {
    expect(carryOver([{ statusCategory: "done" }])).toEqual([]);
  });
});

describe("sprintMetrics", () => {
  it("combines the totals with the frozen commitment and the capacity", () => {
    const metrics = sprintMetrics(
      { committedPoints: 20, capacityPoints: 25 },
      {
        itemCount: 6,
        doneItemCount: 2,
        openItemCount: 4,
        currentPoints: 26,
        donePoints: 5,
      },
    );
    expect(metrics).toEqual({
      itemCount: 6,
      openItemCount: 4,
      doneItemCount: 2,
      currentPoints: 26,
      donePoints: 5,
      scopeChangePoints: 6,
      scopeChangePercent: 30,
      capacityUsedPercent: 20,
    });
  });
});

// ---------------------------------------------------------------------------
// Capacity is per PERSON (there are no teams)
// ---------------------------------------------------------------------------

function aggregate(overrides: Partial<CapacityAggregate> = {}): CapacityAggregate {
  return {
    assigneeId: "u1",
    assigneeName: "Editor Evka",
    assigneeInitials: "EE",
    itemCount: 2,
    openItemCount: 1,
    committedPoints: 8,
    completedPoints: 5,
    ...overrides,
  };
}

describe("capacityBreakdown", () => {
  it("splits the sprint capacity across the people who carry items", () => {
    const out = capacityBreakdown(20, [
      aggregate(),
      aggregate({ assigneeId: "u2", assigneeName: "Admin Adam", committedPoints: 12 }),
    ]);
    expect(out.capacityPoints).toBe(20);
    expect(out.capacityPerPerson).toBe(10);
    expect(out.rows[0]).toMatchObject({ committedPoints: 8, loadPercent: 80 });
    expect(out.rows[1]).toMatchObject({ committedPoints: 12, loadPercent: 120 });
  });

  it("gives the Nepriradené bucket no capacity and no load", () => {
    const out = capacityBreakdown(10, [
      aggregate(),
      aggregate({ assigneeId: null, assigneeName: null, committedPoints: 4 }),
    ]);
    // Only one real person → the whole capacity is theirs.
    expect(out.capacityPerPerson).toBe(10);
    const unassigned = out.rows.find((r) => r.assigneeId === null);
    expect(unassigned).toMatchObject({ capacityPoints: 0, loadPercent: 0 });
  });

  it("does not divide by zero when nobody has items", () => {
    expect(capacityBreakdown(10, [])).toEqual({
      capacityPoints: 10,
      capacityPerPerson: 10,
      rows: [],
    });
  });

  it("keeps load at 0 % when no capacity was planned", () => {
    const out = capacityBreakdown(0, [aggregate()]);
    expect(out.rows[0]?.loadPercent).toBe(0);
  });
});

describe("capacityByAssignee", () => {
  it("reads the sprint capacity, groups by assignee and builds the panel", async () => {
    db.query
      .mockResolvedValueOnce([{ capacity_points: 20 }])
      .mockResolvedValueOnce([
        {
          assignee_id: "u1",
          assignee_name: "Editor Evka",
          assignee_initials: "EE",
          item_count: 3,
          open_count: 1,
          committed_points: 8,
          completed_points: 5,
        },
        {
          assignee_id: null,
          assignee_name: null,
          assignee_initials: null,
          item_count: 1,
          open_count: 1,
          committed_points: 2,
          completed_points: 0,
        },
      ]);

    const out = await capacityByAssignee("s1");

    expect(out.capacityPoints).toBe(20);
    expect(out.capacityPerPerson).toBe(20); // one real person
    expect(out.rows).toHaveLength(2);
    expect(out.rows[0]).toMatchObject({
      assigneeId: "u1",
      committedPoints: 8,
      completedPoints: 5,
      loadPercent: 40,
    });
    expect(out.rows[1]).toMatchObject({ assigneeId: null, capacityPoints: 0 });

    // Leaf items only — a parent and its subtasks must not be counted twice.
    const [sql] = db.query.mock.calls[1] as [string, unknown[]];
    expect(sql).toContain("NOT EXISTS");
    expect(sql).toContain("GROUP BY w.assignee_id");
  });
});

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

describe("sprintTotalsFor", () => {
  it("returns an empty map without hitting the DB for an empty id list", async () => {
    await expect(sprintTotalsFor([])).resolves.toEqual(new Map());
    expect(db.query).not.toHaveBeenCalled();
  });

  it("binds one placeholder per sprint id and derives the open count", async () => {
    db.query.mockResolvedValueOnce([
      {
        sprint_id: "s1",
        item_count: 5,
        done_count: 2,
        total_points: 21,
        done_points: 8,
      },
    ]);

    const out = await sprintTotalsFor(["s1", "s2"]);

    const [sql, params] = db.query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("IN (?, ?)");
    expect(params).toEqual(["s1", "s2"]);
    expect(out.get("s1")).toEqual({
      itemCount: 5,
      doneItemCount: 2,
      openItemCount: 3,
      currentPoints: 21,
      donePoints: 8,
    });
    expect(out.has("s2")).toBe(false);
  });
});

describe("carryOverItems", () => {
  it("moves only the unfinished items and bumps their version", async () => {
    db.execute.mockResolvedValueOnce({ affectedRows: 4 });

    await expect(carryOverItems("s1", "s2", "u1")).resolves.toBe(4);

    const [sql, params] = db.execute.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("status_category <> 'done'");
    expect(sql).toContain("version = version + 1");
    expect(params).toEqual(["s2", "u1", "s1"]);
  });

  it("sends the leftovers to the backlog when the target is null", async () => {
    db.execute.mockResolvedValueOnce({ affectedRows: 2 });
    await carryOverItems("s1", null, "u1");
    const [, params] = db.execute.mock.calls[0] as [string, unknown[]];
    expect(params[0]).toBeNull();
  });
});

describe("casUpdateSprint", () => {
  it("guards on the version and drops non-allow-listed columns", async () => {
    db.execute.mockResolvedValueOnce({ affectedRows: 1 });

    await casUpdateSprint(
      "s1",
      2,
      { status: "planned", committed_points: 21, deleted_at: "x", team_id: "t1" },
      "u1",
    );

    const [sql, params] = db.execute.mock.calls[0] as [string, unknown[]];
    expect(sql).not.toContain("deleted_at");
    expect(sql).not.toContain("team_id");
    expect(sql).toContain("WHERE id = ? AND version = ?");
    expect(params).toEqual(["planned", 21, "u1", "s1", 2]);
  });

  it("returns the stored version on a conflict", async () => {
    db.execute.mockResolvedValueOnce({ affectedRows: 0 });
    db.query.mockResolvedValueOnce([{ version: 5 }]);
    await expect(casUpdateSprint("s1", 2, {}, "u1")).resolves.toEqual({
      ok: false,
      currentVersion: 5,
    });
  });
});

describe("sprintOrderBy", () => {
  it("defaults to the start date and refuses an unknown key", () => {
    expect(sprintOrderBy(undefined, undefined)).toBe("s.start_date ASC, s.id ASC");
    expect(sprintOrderBy("name", "desc")).toBe("s.name DESC, s.id ASC");
    expect(sprintOrderBy("; DROP TABLE sprints", "asc")).toBe(
      "s.start_date ASC, s.id ASC",
    );
  });
});
