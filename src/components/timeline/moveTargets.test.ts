import { describe, expect, it } from "vitest";
import { moveTargets } from "./moveTargets";

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
