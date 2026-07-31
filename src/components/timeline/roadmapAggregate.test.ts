import { describe, expect, it } from "vitest";
import {
  aggregateArea,
  hasNoDates,
  isOutsideProject,
  partitionByDates,
} from "./roadmapAggregate";

/** Shorthand project literal — only the four fields the rules read. */
const p = (
  startDate: string | null,
  endDate: string | null,
  health: string | null = "green",
  progress = 0,
) => ({ startDate, endDate, health, progress });

describe("aggregateArea — range", () => {
  it("spans from the earliest start to the latest end", () => {
    const agg = aggregateArea([
      p("2026-09-01", "2026-11-30"),
      p("2026-07-15", "2026-08-31"),
      p("2026-10-01", "2027-02-28"),
    ]);
    expect(agg.startDate).toBe("2026-07-15");
    expect(agg.endDate).toBe("2027-02-28");
    expect(agg.projectCount).toBe(3);
  });

  it("takes the ends independently — the widest start need not own the widest end", () => {
    // The project that starts first ends first; the range must still be the union.
    const agg = aggregateArea([p("2026-01-01", "2026-02-01"), p("2026-06-01", "2026-12-31")]);
    expect(agg).toMatchObject({ startDate: "2026-01-01", endDate: "2026-12-31" });
  });

  it("keeps an open end open instead of substituting the other side", () => {
    const agg = aggregateArea([p("2026-07-01", null), p(null, null)]);
    expect(agg).toMatchObject({ startDate: "2026-07-01", endDate: null });
  });

  it("ignores unparsable days rather than rolling them over", () => {
    // 2026-02-31 is not a calendar day; toDay rejects it, so it must not become
    // the area's start (and must not silently become 2026-03-03 either).
    const agg = aggregateArea([p("2026-02-31", "2026-13-01"), p("2026-05-04", "2026-06-04")]);
    expect(agg).toMatchObject({ startDate: "2026-05-04", endDate: "2026-06-04" });
  });

  it("normalises the returned days", () => {
    const agg = aggregateArea([p("2026-07-05", "2026-08-09")]);
    expect(agg.startDate).toBe("2026-07-05");
    expect(agg.endDate).toBe("2026-08-09");
  });
});

describe("aggregateArea — worst health", () => {
  it("reports red over everything else", () => {
    expect(
      aggregateArea([
        p("2026-07-01", "2026-08-01", "green"),
        p("2026-07-01", "2026-08-01", "red"),
        p("2026-07-01", "2026-08-01", "amber"),
      ]).health,
    ).toBe("red");
  });

  it("reports amber when there is no red", () => {
    expect(
      aggregateArea([
        p("2026-07-01", "2026-08-01", "green"),
        p("2026-07-01", "2026-08-01", "amber"),
        p("2026-07-01", "2026-08-01", "grey"),
      ]).health,
    ).toBe("amber");
  });

  it("stays green when every project is green", () => {
    expect(
      aggregateArea([
        p("2026-07-01", "2026-08-01", "green"),
        p("2026-07-01", "2026-08-01", "green"),
      ]).health,
    ).toBe("green");
  });

  it("does not summarise an unknown as healthy — grey outranks green", () => {
    expect(
      aggregateArea([
        p("2026-07-01", "2026-08-01", "green"),
        p("2026-07-01", "2026-08-01", "grey"),
      ]).health,
    ).toBe("grey");
  });

  it("never lets grey mask a real warning", () => {
    expect(
      aggregateArea([
        p("2026-07-01", "2026-08-01", "grey"),
        p("2026-07-01", "2026-08-01", "amber"),
      ]).health,
    ).toBe("amber");
  });

  it("treats an unknown health value as no data", () => {
    expect(aggregateArea([p("2026-07-01", "2026-08-01", "blue")]).health).toBe("grey");
    expect(aggregateArea([p("2026-07-01", "2026-08-01", null)]).health).toBe("grey");
  });
});

describe("aggregateArea — empty area", () => {
  it("reports nothing known instead of a false green", () => {
    expect(aggregateArea([])).toEqual({
      startDate: null,
      endDate: null,
      projectCount: 0,
      health: "grey",
      progress: 0,
    });
  });
});

describe("aggregateArea — progress", () => {
  it("is the rounded mean of the group", () => {
    expect(
      aggregateArea([
        p("2026-07-01", "2026-08-01", "green", 10),
        p("2026-07-01", "2026-08-01", "green", 20),
        p("2026-07-01", "2026-08-01", "green", 31),
      ]).progress,
    ).toBe(20); // 61 / 3 = 20.33
  });

  it("clamps a nonsense progress into 0–100", () => {
    expect(
      aggregateArea([
        p("2026-07-01", "2026-08-01", "green", 140),
        p("2026-07-01", "2026-08-01", "green", -40),
      ]).progress,
    ).toBe(50);
  });

  it("counts a missing progress as zero, not as absent", () => {
    expect(
      aggregateArea([
        { startDate: "2026-07-01", endDate: "2026-08-01", health: "green" },
        p("2026-07-01", "2026-08-01", "green", 100),
      ]).progress,
    ).toBe(50);
  });
});

describe("isOutsideProject", () => {
  it("flags a checkpoint before the project starts", () => {
    expect(isOutsideProject("2026-06-30", "2026-07-01", "2026-12-31")).toBe(true);
  });

  it("flags a checkpoint after the project ends", () => {
    expect(isOutsideProject("2027-01-01", "2026-07-01", "2026-12-31")).toBe(true);
  });

  it("accepts both boundary days — the bounds are inclusive", () => {
    expect(isOutsideProject("2026-07-01", "2026-07-01", "2026-12-31")).toBe(false);
    expect(isOutsideProject("2026-12-31", "2026-07-01", "2026-12-31")).toBe(false);
  });

  it("accepts a day inside the duration", () => {
    expect(isOutsideProject("2026-09-15", "2026-07-01", "2026-12-31")).toBe(false);
  });

  it("does not flag a checkpoint with no due date", () => {
    expect(isOutsideProject(null, "2026-07-01", "2026-12-31")).toBe(false);
    expect(isOutsideProject("2026-02-31", "2026-07-01", "2026-12-31")).toBe(false);
  });

  it("does not flag anything when the project has no bounds at all", () => {
    expect(isOutsideProject("2026-09-15", null, null)).toBe(false);
  });

  it("checks only the known end of an open-ended project", () => {
    // Open end: anything from the start onwards is inside.
    expect(isOutsideProject("2030-01-01", "2026-07-01", null)).toBe(false);
    expect(isOutsideProject("2026-06-30", "2026-07-01", null)).toBe(true);
    // Open start: anything up to the end is inside.
    expect(isOutsideProject("2020-01-01", null, "2026-12-31")).toBe(false);
    expect(isOutsideProject("2027-01-01", null, "2026-12-31")).toBe(true);
  });

  it("agrees with barGeometry on a project whose end precedes its start", () => {
    // barGeometry lifts `to` to `from` for reversed dates and draws a single day at
    // the start; the marker check must call that same day INSIDE, or the lane would
    // show a warning marker sitting on top of a bar it supposedly misses.
    expect(isOutsideProject("2026-07-01", "2026-07-01", "2026-06-01")).toBe(false);
    expect(isOutsideProject("2026-07-02", "2026-07-01", "2026-06-01")).toBe(true);
    expect(isOutsideProject("2026-06-30", "2026-07-01", "2026-06-01")).toBe(true);
  });
});

describe("hasNoDates / partitionByDates", () => {
  it("is true only when neither end is usable", () => {
    expect(hasNoDates(p(null, null))).toBe(true);
    expect(hasNoDates(p("2026-07-01", null))).toBe(false);
    expect(hasNoDates(p(null, "2026-07-01"))).toBe(false);
    expect(hasNoDates(p("2026-02-31", null))).toBe(true); // unparsable = unusable
  });

  it("splits without losing or reordering a project", () => {
    const projects = [
      { id: "a", startDate: "2026-07-01", endDate: null },
      { id: "b", startDate: null, endDate: null },
      { id: "c", startDate: null, endDate: "2026-09-01" },
      { id: "d", startDate: null, endDate: null },
    ];
    const { dated, undated } = partitionByDates(projects);
    expect(dated.map((x) => x.id)).toEqual(["a", "c"]);
    expect(undated.map((x) => x.id)).toEqual(["b", "d"]);
    expect(dated.length + undated.length).toBe(projects.length);
  });

  it("does not mutate the input", () => {
    const projects = [p(null, null), p("2026-07-01", "2026-08-01")];
    partitionByDates(projects);
    expect(projects).toHaveLength(2);
  });
});
