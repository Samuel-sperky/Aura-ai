import { describe, expect, it } from "vitest";
import { droppableBuckets, moveTargets } from "./moveTargets";

const sprint = (id: string, projectId: string) => ({ id, projectId });

describe("moveTargets", () => {
  it("offers only sprints from the item's own project", () => {
    const sprints = [
      sprint("s1", "es-100"),
      sprint("s2", "tools-50"),
      sprint("s3", "es-100"),
    ];
    expect(moveTargets(sprints, { projectId: "es-100" }).map((s) => s.id)).toEqual([
      "s1",
      "s3",
    ]);
  });

  it("drops every sprint when the project has none in the horizon", () => {
    // The seeded state that made the keyboard move fail with 400: the backlog item
    // belongs to TOOLS-50 while both horizon sprints belong to ES-100.
    const sprints = [sprint("s1", "es-100"), sprint("s2", "es-100")];
    expect(moveTargets(sprints, { projectId: "tools-50" })).toEqual([]);
  });

  it("keeps axis order", () => {
    const sprints = [
      sprint("late", "p1"),
      sprint("early", "p1"),
      sprint("mid", "p1"),
    ];
    expect(moveTargets(sprints, { projectId: "p1" }).map((s) => s.id)).toEqual([
      "late",
      "early",
      "mid",
    ]);
  });

  it("returns an empty list for an empty horizon", () => {
    expect(moveTargets([], { projectId: "p1" })).toEqual([]);
  });

  it("does not mutate the input", () => {
    const sprints = [sprint("s1", "p1"), sprint("s2", "p2")];
    moveTargets(sprints, { projectId: "p1" });
    expect(sprints).toHaveLength(2);
  });
});

describe("droppableBuckets", () => {
  const BACKLOG = "__backlog__";

  it("accepts the backlog plus the item's own sprints", () => {
    const sprints = [
      sprint("s1", "es-100"),
      sprint("s2", "tools-50"),
      sprint("s3", "es-100"),
    ];
    const ids = droppableBuckets(sprints, { projectId: "es-100" }, BACKLOG);
    expect([...ids].sort()).toEqual([BACKLOG, "s1", "s3"].sort());
  });

  it("rejects a sprint column of another project", () => {
    const sprints = [sprint("s1", "es-100")];
    const ids = droppableBuckets(sprints, { projectId: "tools-50" }, BACKLOG);
    expect(ids.has("s1")).toBe(false);
  });

  it("always keeps the backlog — clearing sprint_id has no relational constraint", () => {
    // The case that produced the bug: an item whose project owns no horizon sprint.
    // Dropping it back into the backlog must still be legal.
    const sprints = [sprint("s1", "es-100"), sprint("s2", "es-100")];
    const ids = droppableBuckets(sprints, { projectId: "mark-30" }, BACKLOG);
    expect([...ids]).toEqual([BACKLOG]);
  });

  it("keeps the backlog even with no sprints at all", () => {
    expect([...droppableBuckets([], { projectId: "p1" }, BACKLOG)]).toEqual([BACKLOG]);
  });

  it("agrees with moveTargets on which sprints are legal", () => {
    const sprints = [sprint("a", "p1"), sprint("b", "p2"), sprint("c", "p1")];
    const item = { projectId: "p1" };
    const viaDialog = moveTargets(sprints, item).map((s) => s.id);
    const viaDrop = [...droppableBuckets(sprints, item, BACKLOG)].filter(
      (id) => id !== BACKLOG,
    );
    // Both entry points must enforce the same rule; a divergence here is exactly
    // the gap that let drag & drop offer a target the dialog had already excluded.
    expect(viaDrop.sort()).toEqual(viaDialog.sort());
  });
});
