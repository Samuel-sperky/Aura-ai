// Work-item business rules. The DB is mocked; what is under test are the rules
// that the API must never let through:
//
//   * the TWO-LEVEL hierarchy — the third level is refused (spec Q25)
//   * story-point roll-up — a parent's points are its subtasks' sum (spec Q26)
//   * `blocks` dependencies stay acyclic
//   * the backlog order is manual `rank_value`, then `priority` (spec Q27)
//   * the CAS writer's column allow-list is the SQL-injection barrier

import { describe, it, expect, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({
  query: vi.fn(),
  execute: vi.fn(),
  withTransaction: vi.fn(),
}));
vi.mock("@/lib/db", () => db);

import {
  BACKLOG_ORDER_BY,
  casUpdateWorkItem,
  effectiveStoryPoints,
  neighbourInBucket,
  parentPlacementError,
  percentOf,
  priorityRank,
  relationError,
  rollupStoryPoints,
  shiftRank,
  sortBacklog,
  statusPair,
  toWorkItemDto,
  validateParentPlacement,
  wouldCreateCycle,
  workItemOrderBy,
  workItemSearchClause,
  type WorkItemBase,
  type WorkItemRow,
} from "./workItems";

beforeEach(() => {
  db.query.mockReset();
  db.execute.mockReset();
  db.withTransaction.mockReset();
});

// ---------------------------------------------------------------------------
// Two levels, hard (spec Q25)
// ---------------------------------------------------------------------------

describe("parentPlacementError — the two-level limit", () => {
  const parent = { id: "p1", parentId: null, projectId: "proj1" };

  it("allows a subtask under a top-level item", () => {
    expect(
      parentPlacementError({
        childId: "c1",
        childProjectId: "proj1",
        childHasChildren: false,
        parent,
      }),
    ).toBeNull();
  });

  it("REFUSES a third level: the parent is itself a subtask", () => {
    const msg = parentPlacementError({
      childId: "c1",
      childProjectId: "proj1",
      childHasChildren: false,
      parent: { id: "s1", parentId: "p1", projectId: "proj1" },
    });
    expect(msg).toBe(
      "Podúloha nemôže mať vlastnú podúlohu — hierarchia má najviac 2 úrovne.",
    );
  });

  it("REFUSES pushing an item that already has subtasks under a parent", () => {
    const msg = parentPlacementError({
      childId: "c1",
      childProjectId: "proj1",
      childHasChildren: true,
      parent,
    });
    expect(msg).toContain("najviac 2 úrovne");
  });

  it("refuses a missing parent, self-parenting and a cross-project parent", () => {
    expect(
      parentPlacementError({
        childId: "c1",
        childProjectId: "proj1",
        childHasChildren: false,
        parent: null,
      }),
    ).toBe("Nadradená položka neexistuje.");

    expect(
      parentPlacementError({
        childId: "p1",
        childProjectId: "proj1",
        childHasChildren: false,
        parent,
      }),
    ).toBe("Položka nemôže byť nadradená sama sebe.");

    expect(
      parentPlacementError({
        childId: "c1",
        childProjectId: "other",
        childHasChildren: false,
        parent,
      }),
    ).toBe("Nadradená položka musí byť v tom istom projekte.");
  });

  it("treats a create (no child id yet) as a valid placement", () => {
    expect(
      parentPlacementError({
        childId: "",
        childProjectId: "proj1",
        childHasChildren: false,
        parent,
      }),
    ).toBeNull();
  });
});

describe("validateParentPlacement — same rule against stored rows", () => {
  it("rejects the third level after loading the parent", async () => {
    db.query
      // the candidate parent — already a subtask
      .mockResolvedValueOnce([{ id: "s1", parent_id: "p1", project_id: "proj1" }])
      // child's own children
      .mockResolvedValueOnce([{ n: 0 }]);

    await expect(
      validateParentPlacement({
        parentId: "s1",
        childId: "c1",
        childProjectId: "proj1",
      }),
    ).resolves.toContain("najviac 2 úrovne");
  });

  it("passes for a top-level parent in the same project", async () => {
    db.query
      .mockResolvedValueOnce([{ id: "p1", parent_id: null, project_id: "proj1" }])
      .mockResolvedValueOnce([{ n: 0 }]);

    await expect(
      validateParentPlacement({
        parentId: "p1",
        childId: "c1",
        childProjectId: "proj1",
      }),
    ).resolves.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Story points (spec Q26)
// ---------------------------------------------------------------------------

describe("effectiveStoryPoints", () => {
  it("uses the item's own value when it has no subtasks", () => {
    expect(effectiveStoryPoints({ storyPoints: 8 })).toBe(8);
    expect(effectiveStoryPoints({ storyPoints: 8 }, [])).toBe(8);
  });

  it("uses the SUM of the subtasks when it has any — even if that is lower", () => {
    expect(
      effectiveStoryPoints({ storyPoints: 8 }, [{ storyPoints: 3 }, { storyPoints: 2 }]),
    ).toBe(5);
  });

  it("counts a zero-point subtask as a subtask (sum wins, not the own value)", () => {
    expect(effectiveStoryPoints({ storyPoints: 13 }, [{ storyPoints: 0 }])).toBe(0);
  });

  it("clamps negative and non-numeric input to 0", () => {
    expect(effectiveStoryPoints({ storyPoints: -5 })).toBe(0);
    expect(
      effectiveStoryPoints({ storyPoints: 0 }, [
        { storyPoints: -2 },
        { storyPoints: 4 },
      ]),
    ).toBe(4);
  });
});

describe("rollupStoryPoints", () => {
  it("reports own / child / effective points for a parent", async () => {
    db.query.mockResolvedValueOnce([
      { own_points: 8, child_points: 5, child_count: 2 },
    ]);
    await expect(rollupStoryPoints("p1")).resolves.toEqual({
      ownStoryPoints: 8,
      childStoryPoints: 5,
      childCount: 2,
      storyPoints: 5,
    });
  });

  it("falls back to the own value for a leaf item", async () => {
    db.query.mockResolvedValueOnce([
      { own_points: 8, child_points: 0, child_count: 0 },
    ]);
    await expect(rollupStoryPoints("leaf")).resolves.toMatchObject({
      storyPoints: 8,
    });
  });

  it("returns zeros for a missing item instead of throwing", async () => {
    db.query.mockResolvedValueOnce([]);
    await expect(rollupStoryPoints("nope")).resolves.toEqual({
      ownStoryPoints: 0,
      childStoryPoints: 0,
      childCount: 0,
      storyPoints: 0,
    });
  });
});

describe("toWorkItemDto", () => {
  function row(overrides: Partial<WorkItemRow> = {}): WorkItemRow {
    return {
      id: "w1",
      project_id: "proj1",
      sprint_id: null,
      checkpoint_id: null,
      parent_id: null,
      item_type: "task",
      title: "Napojiť API",
      description: null,
      status: "backlog",
      status_category: "backlog",
      priority: "P2",
      story_points: 8,
      rank_value: 20,
      assignee_id: null,
      reporter_id: null,
      due_date: null,
      logged_minutes: 0,
      version: 1,
      created_at: "2026-07-01T08:00:00.000Z",
      updated_at: null,
      created_by: null,
      updated_by: null,
      project_code: "AUR",
      project_name: "Aura",
      sprint_name: null,
      assignee_name: null,
      assignee_initials: null,
      reporter_name: null,
      child_count: 0,
      child_points: 0,
      ...overrides,
    };
  }

  it("exposes the effective points AND the stored own value", () => {
    const dto = toWorkItemDto(row({ child_count: 2, child_points: 5 }));
    expect(dto.storyPoints).toBe(5);
    expect(dto.ownStoryPoints).toBe(8);
    expect(dto.childStoryPoints).toBe(5);
    expect(dto.childCount).toBe(2);
  });

  it("keeps an unassigned item as null (Nepriradené), never an empty string", () => {
    const dto = toWorkItemDto(row());
    expect(dto.assigneeId).toBeNull();
    expect(dto.assigneeName).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Dependency cycles
// ---------------------------------------------------------------------------

describe("wouldCreateCycle", () => {
  it("refuses a self-dependency", () => {
    expect(wouldCreateCycle([], { sourceId: "a", targetId: "a" })).toBe(true);
  });

  it("detects the direct A↔B cycle", () => {
    const edges = [{ sourceId: "b", targetId: "a" }];
    expect(wouldCreateCycle(edges, { sourceId: "a", targetId: "b" })).toBe(true);
  });

  it("detects a transitive cycle A→B→C→A", () => {
    const edges = [
      { sourceId: "b", targetId: "c" },
      { sourceId: "c", targetId: "a" },
    ];
    expect(wouldCreateCycle(edges, { sourceId: "a", targetId: "b" })).toBe(true);
  });

  it("allows a diamond (two paths, no cycle)", () => {
    const edges = [
      { sourceId: "a", targetId: "b" },
      { sourceId: "a", targetId: "c" },
      { sourceId: "b", targetId: "d" },
    ];
    expect(wouldCreateCycle(edges, { sourceId: "c", targetId: "d" })).toBe(false);
  });

  it("terminates on an already-cyclic graph that does not involve the candidate", () => {
    const edges = [
      { sourceId: "x", targetId: "y" },
      { sourceId: "y", targetId: "x" },
    ];
    expect(wouldCreateCycle(edges, { sourceId: "a", targetId: "x" })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Backlog order (spec Q27)
// ---------------------------------------------------------------------------

describe("sortBacklog", () => {
  it("orders by manual rank first", () => {
    const items = [
      { id: "c", rankValue: 30, priority: "P1" },
      { id: "a", rankValue: 10, priority: "P3" },
      { id: "b", rankValue: 20, priority: "P2" },
    ];
    expect(sortBacklog(items).map((i) => i.id)).toEqual(["a", "b", "c"]);
  });

  it("falls back to priority when the rank ties (P1 before P3)", () => {
    const items = [
      { id: "low", rankValue: 10, priority: "P3" },
      { id: "high", rankValue: 10, priority: "P1" },
      { id: "mid", rankValue: 10, priority: "P2" },
    ];
    expect(sortBacklog(items).map((i) => i.id)).toEqual(["high", "mid", "low"]);
  });

  it("falls back to createdAt so the order is total (stable across pages)", () => {
    const items = [
      { id: "second", rankValue: 10, priority: "P2", createdAt: "2026-07-02T00:00:00Z" },
      { id: "first", rankValue: 10, priority: "P2", createdAt: "2026-07-01T00:00:00Z" },
    ];
    expect(sortBacklog(items).map((i) => i.id)).toEqual(["first", "second"]);
  });

  it("does not mutate its input", () => {
    const items = [
      { id: "b", rankValue: 20, priority: "P2" },
      { id: "a", rankValue: 10, priority: "P2" },
    ];
    sortBacklog(items);
    expect(items.map((i) => i.id)).toEqual(["b", "a"]);
  });

  it("ranks an unknown priority last instead of crashing", () => {
    expect(priorityRank("P1")).toBeLessThan(priorityRank("P3"));
    expect(priorityRank("nonsense")).toBeGreaterThan(priorityRank("P3"));
  });
});

describe("workItemOrderBy", () => {
  it("defaults to the backlog order", () => {
    expect(workItemOrderBy(undefined, undefined)).toBe(BACKLOG_ORDER_BY);
  });

  it("maps an allow-listed sort key to its column", () => {
    expect(workItemOrderBy("dueDate", "desc")).toBe("w.due_date DESC, w.id ASC");
  });

  it("never lets an unknown sort key reach the SQL", () => {
    const clause = workItemOrderBy("title; DROP TABLE work_items", "asc");
    expect(clause).toBe("w.rank_value ASC, w.id ASC");
    expect(clause).not.toContain("DROP");
  });
});

describe("workItemSearchClause", () => {
  it("escapes LIKE wildcards so they match literally", () => {
    const { clause, params } = workItemSearchClause("100%_done");
    expect(params).toEqual(["%100\\%\\_done%", "%100\\%\\_done%"]);
    expect(clause).toContain("ESCAPE");
  });
});

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

describe("statusPair / percentOf", () => {
  it("keeps status and status_category in lock-step", () => {
    expect(statusPair("in_progress")).toEqual({
      status: "in_progress",
      status_category: "in_progress",
    });
  });

  it("never divides by zero", () => {
    expect(percentOf(5, 0)).toBe(0);
    expect(percentOf(5, 20)).toBe(25);
  });
});

// ---------------------------------------------------------------------------
// Optimistic concurrency + the column allow-list
// ---------------------------------------------------------------------------

describe("casUpdateWorkItem", () => {
  it("guards the UPDATE with the expected version and bumps it", async () => {
    db.execute.mockResolvedValueOnce({ affectedRows: 1 });

    const res = await casUpdateWorkItem("w1", 3, { title: "Nový názov" }, "u1");
    expect(res).toEqual({ ok: true, currentVersion: 4 });

    const [sql, params] = db.execute.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("WHERE id = ? AND version = ?");
    expect(sql).toContain("`version` = `version` + 1");
    expect(params).toEqual(["Nový názov", "u1", "w1", 3]);
  });

  it("reports the stored version when the CAS misses", async () => {
    db.execute.mockResolvedValueOnce({ affectedRows: 0 });
    db.query.mockResolvedValueOnce([{ version: 9 }]);

    await expect(
      casUpdateWorkItem("w1", 3, { title: "x" }, "u1"),
    ).resolves.toEqual({ ok: false, currentVersion: 9 });
  });

  it("drops any column outside the allow-list before building the SQL", async () => {
    db.execute.mockResolvedValueOnce({ affectedRows: 1 });

    await casUpdateWorkItem(
      "w1",
      1,
      { title: "ok", version: 99, deleted_at: "now()", "id = id; DROP": 1 },
      "u1",
    );

    const [sql, params] = db.execute.mock.calls[0] as [string, unknown[]];
    expect(sql).not.toContain("deleted_at");
    expect(sql).not.toContain("DROP");
    // `version` is never client-settable: it is only ever `version + 1`.
    expect(sql.match(/`version`/g)).toHaveLength(2);
    expect(params).toEqual(["ok", "u1", "w1", 1]);
  });
});

// ---------------------------------------------------------------------------
// Keyboard reordering (spec Q13)
// ---------------------------------------------------------------------------

describe("neighbourInBucket", () => {
  const ordered = [{ id: "a" }, { id: "b" }, { id: "c" }];

  it("finds the item above and below", () => {
    expect(neighbourInBucket(ordered, "b", "up")).toBe("a");
    expect(neighbourInBucket(ordered, "b", "down")).toBe("c");
  });

  it("returns null at the edges and for an unknown item", () => {
    expect(neighbourInBucket(ordered, "a", "up")).toBeNull();
    expect(neighbourInBucket(ordered, "c", "down")).toBeNull();
    expect(neighbourInBucket(ordered, "zz", "up")).toBeNull();
  });
});

describe("shiftRank", () => {
  const item: WorkItemBase = {
    id: "b",
    project_id: "proj1",
    sprint_id: null,
    parent_id: null,
    status: "backlog",
    status_category: "backlog",
    priority: "P2",
    story_points: 3,
    rank_value: 20,
    assignee_id: null,
    version: 2,
  };

  it("swaps rank values with the neighbour above", async () => {
    db.query.mockResolvedValueOnce([
      { id: "a", rank_value: 10, version: 1 },
      { id: "b", rank_value: 20, version: 2 },
      { id: "c", rank_value: 30, version: 1 },
    ]);
    const conn = { query: vi.fn().mockResolvedValue({ affectedRows: 1 }) };
    db.withTransaction.mockImplementation(
      (fn: (c: typeof conn) => unknown) => fn(conn),
    );

    await expect(shiftRank(item, 2, "up", "u1")).resolves.toEqual({
      moved: true,
      conflict: false,
      currentVersion: 3,
    });

    // The mover takes the neighbour's rank and vice versa.
    expect(conn.query.mock.calls[0]?.[1]).toEqual([10, "u1", "b", 2]);
    expect(conn.query.mock.calls[1]?.[1]).toEqual([20, "u1", "a"]);
  });

  it("does nothing at the top of the bucket", async () => {
    db.query.mockResolvedValueOnce([
      { id: "b", rank_value: 20, version: 2 },
      { id: "c", rank_value: 30, version: 1 },
    ]);

    await expect(shiftRank(item, 2, "up", "u1")).resolves.toEqual({
      moved: false,
      conflict: false,
      currentVersion: 2,
    });
    expect(db.withTransaction).not.toHaveBeenCalled();
  });

  it("reports a version conflict without touching the neighbour", async () => {
    db.query.mockResolvedValueOnce([
      { id: "a", rank_value: 10, version: 1 },
      { id: "b", rank_value: 20, version: 2 },
    ]);
    const conn = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ affectedRows: 0 })
        .mockResolvedValueOnce([{ version: 7 }]),
    };
    db.withTransaction.mockImplementation(
      (fn: (c: typeof conn) => unknown) => fn(conn),
    );

    await expect(shiftRank(item, 2, "up", "u1")).resolves.toEqual({
      moved: false,
      conflict: true,
      currentVersion: 7,
    });
    expect(conn.query).toHaveBeenCalledTimes(2);
  });

  it("breaks a rank tie so the swap is not a no-op", async () => {
    db.query.mockResolvedValueOnce([
      { id: "a", rank_value: 20, version: 1 },
      { id: "b", rank_value: 20, version: 2 },
    ]);
    const conn = { query: vi.fn().mockResolvedValue({ affectedRows: 1 }) };
    db.withTransaction.mockImplementation(
      (fn: (c: typeof conn) => unknown) => fn(conn),
    );

    await shiftRank(item, 2, "up", "u1");
    expect(conn.query.mock.calls[0]?.[1]).toEqual([19, "u1", "b", 2]);
  });
});

// ---------------------------------------------------------------------------
// Foreign-key validation → Slovak 400 instead of a raw FK 500
// ---------------------------------------------------------------------------

describe("relationError", () => {
  it("refuses a sprint from another project", async () => {
    db.query
      .mockResolvedValueOnce([{ id: "proj1" }]) // project exists
      .mockResolvedValueOnce([{ project_id: "other" }]); // sprint elsewhere

    await expect(
      relationError({ projectId: "proj1", sprintId: "s1" }),
    ).resolves.toBe("Šprint patrí inému projektu.");
  });

  it("refuses a missing assignee", async () => {
    db.query
      .mockResolvedValueOnce([{ id: "proj1" }])
      .mockResolvedValueOnce([]); // user lookup

    await expect(
      relationError({ projectId: "proj1", assigneeId: "ghost" }),
    ).resolves.toBe("Priradený používateľ neexistuje.");
  });

  it("passes when only the project is given", async () => {
    db.query.mockResolvedValueOnce([{ id: "proj1" }]);
    await expect(relationError({ projectId: "proj1" })).resolves.toBeNull();
  });
});
