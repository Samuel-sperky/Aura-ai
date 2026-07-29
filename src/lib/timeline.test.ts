// Unit tests for the timeline geometry. These run under TZ=Europe/Bratislava
// (vitest.config.ts), which is the point: a positive-offset zone makes any
// accidental local-time conversion shift a calendar day and fail loudly.

import { describe, expect, it } from "vitest";
import {
  DEFAULT_MODE,
  DEFAULT_ZOOM,
  NO_AREA_LABEL,
  ROADMAP_HORIZON_MONTHS,
  SPRINTS_HORIZON_WEEKS,
  addDays,
  barGeometry,
  buildTimeScale,
  capacityTone,
  civilOf,
  columnLabel,
  columnTitle,
  dayOf,
  dayPhase,
  daysBetween,
  formatDay,
  formatDayShort,
  formatRange,
  groupProjectsByArea,
  headerGroups,
  isPastDay,
  isTypingTarget,
  isoWeek,
  isoWeekday,
  markerPercent,
  packLanes,
  queueStats,
  RANK_STEP,
  rankBetween,
  rankForInsert,
  sortDecisionQueue,
  sprintsInHorizon,
  startOfMonthDay,
  startOfQuarterDay,
  startOfWeekDay,
  toDay,
  toIso,
  todayIso,
} from "./timeline";

/** The day the whole suite pretends it is (a Tuesday). */
const TODAY = "2026-07-28";

describe("calendar primitives are timezone-proof", () => {
  it("round-trips every ISO day through the day number", () => {
    for (const iso of [
      "2026-01-01",
      "2026-02-28",
      "2026-03-01",
      "2026-07-28",
      "2026-10-25", // day the CET→CEST DST change lands on in this zone
      "2026-12-31",
      "2028-02-29", // leap day
    ]) {
      expect(toIso(toDay(iso)!)).toBe(iso);
    }
  });

  it("does not shift a day when converting to civil parts", () => {
    expect(civilOf(toDay("2026-07-28")!)).toEqual({ year: 2026, month: 7, day: 28 });
    // Midnight in Europe/Bratislava is the previous day in UTC — the classic bug.
    expect(civilOf(toDay("2026-01-01")!)).toEqual({ year: 2026, month: 1, day: 1 });
  });

  it("rejects impossible dates instead of rolling them over", () => {
    expect(toDay("2026-02-31")).toBeNull();
    expect(toDay("2026-13-01")).toBeNull();
    expect(toDay("2027-02-29")).toBeNull();
    expect(toDay("28.7.2026")).toBeNull();
    expect(toDay(null)).toBeNull();
    expect(toDay("")).toBeNull();
  });

  it("adds days across a month and a DST boundary", () => {
    expect(addDays("2026-07-31", 1)).toBe("2026-08-01");
    expect(addDays("2026-03-29", 1)).toBe("2026-03-30"); // clocks jump forward
    expect(addDays("2026-10-25", 1)).toBe("2026-10-26"); // clocks jump back
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("computes signed day distances", () => {
    expect(daysBetween(TODAY, "2026-08-04")).toBe(7);
    expect(daysBetween(TODAY, "2026-07-21")).toBe(-7);
    expect(daysBetween(TODAY, TODAY)).toBe(0);
    expect(daysBetween(TODAY, "nonsense")).toBeNull();
  });

  it("reads today from LOCAL time, not from UTC", () => {
    // 00:30 local on 2026-07-28 is 22:30 UTC on the 27th. "Today" must be the 28th.
    const localMidnightish = new Date(2026, 6, 28, 0, 30, 0);
    expect(todayIso(localMidnightish)).toBe("2026-07-28");
  });

  it("knows ISO weekdays and week starts", () => {
    expect(isoWeekday(toDay("2026-07-27")!)).toBe(1); // Monday
    expect(isoWeekday(toDay(TODAY)!)).toBe(2); // Tuesday
    expect(isoWeekday(toDay("2026-08-02")!)).toBe(7); // Sunday
    expect(toIso(startOfWeekDay(toDay(TODAY)!))).toBe("2026-07-27");
    expect(toIso(startOfWeekDay(toDay("2026-08-02")!))).toBe("2026-07-27");
    expect(toIso(startOfMonthDay(toDay(TODAY)!))).toBe("2026-07-01");
    expect(toIso(startOfQuarterDay(toDay(TODAY)!))).toBe("2026-07-01");
    expect(toIso(startOfQuarterDay(toDay("2026-11-15")!))).toBe("2026-10-01");
  });

  it("computes ISO week numbers including the year-boundary cases", () => {
    expect(isoWeek(toDay(TODAY)!)).toEqual({ isoYear: 2026, week: 31 });
    // 2026-01-01 is a Thursday → ISO week 1 of 2026.
    expect(isoWeek(toDay("2026-01-01")!)).toEqual({ isoYear: 2026, week: 1 });
    // 2025-12-29 is a Monday belonging to ISO week 1 of 2026.
    expect(isoWeek(toDay("2025-12-29")!)).toEqual({ isoYear: 2026, week: 1 });
    // 2027-01-01 is a Friday → still ISO week 53 of 2026.
    expect(isoWeek(toDay("2027-01-01")!)).toEqual({ isoYear: 2026, week: 53 });
  });

  it("has sane defaults", () => {
    expect(DEFAULT_MODE).toBe("roadmap");
    expect(DEFAULT_ZOOM).toBe("month");
  });
});

describe("buildTimeScale — roadmap horizon is 12 months from the 1st", () => {
  it("spans exactly one year of calendar days", () => {
    const scale = buildTimeScale({ mode: "roadmap", zoom: "month", today: TODAY });
    expect(scale.startIso).toBe("2026-07-01");
    expect(scale.endIso).toBe("2027-06-30");
    expect(scale.totalDays).toBe(365);
    expect(dayOf(2027, 6, 30) - dayOf(2026, 7, 1) + 1).toBe(scale.totalDays);
    expect(ROADMAP_HORIZON_MONTHS).toBe(12);
  });

  it("produces 12 month columns whose widths sum to 100 %", () => {
    const scale = buildTimeScale({ mode: "roadmap", zoom: "month", today: TODAY });
    expect(scale.columns).toHaveLength(12);
    expect(scale.columns.map((c) => c.key)[0]).toBe("2026-07");
    expect(scale.columns.at(-1)!.key).toBe("2027-06");
    expect(scale.columns[0].days).toBe(31);
    expect(scale.columns[7].days).toBe(28); // February 2027
    expect(scale.columns.reduce((sum, c) => sum + c.days, 0)).toBe(scale.totalDays);
    expect(scale.columns.reduce((sum, c) => sum + c.widthPercent, 0)).toBeCloseTo(100, 8);
  });

  it("clips the quarter columns to the horizon instead of stretching it", () => {
    const scale = buildTimeScale({ mode: "roadmap", zoom: "quarter", today: TODAY });
    // Jul 2026 – Jun 2027 touches Q3/26, Q4/26, Q1/27, Q2/27 — all whole here.
    expect(scale.columns.map((c) => c.key)).toEqual([
      "2026-Q3",
      "2026-Q4",
      "2027-Q1",
      "2027-Q2",
    ]);
    expect(scale.totalDays).toBe(365);
    expect(scale.columns.reduce((sum, c) => sum + c.days, 0)).toBe(scale.totalDays);
  });

  it("clips a partial leading quarter when the month is mid-quarter", () => {
    const scale = buildTimeScale({ mode: "roadmap", zoom: "quarter", today: "2026-08-14" });
    expect(scale.startIso).toBe("2026-08-01");
    expect(scale.endIso).toBe("2027-07-31");
    // Q3/2026 is Jul–Sep but the horizon starts in August → 61 days, not 92.
    expect(scale.columns[0].key).toBe("2026-Q3");
    expect(scale.columns[0].days).toBe(61);
    expect(scale.columns.at(-1)!.key).toBe("2027-Q3");
    expect(scale.columns.at(-1)!.days).toBe(31); // only July 2027 is inside
    expect(scale.columns.reduce((sum, c) => sum + c.days, 0)).toBe(scale.totalDays);
  });

  it("clips the week columns at both ends of a month-aligned horizon", () => {
    const scale = buildTimeScale({ mode: "roadmap", zoom: "week", today: TODAY });
    // 2026-07-01 is a Wednesday → the first week column carries 5 days.
    expect(scale.columns[0].days).toBe(5);
    expect(scale.columns[0].key).toBe("2026-W27");
    expect(scale.columns.reduce((sum, c) => sum + c.days, 0)).toBe(scale.totalDays);
    expect(scale.columns.every((c) => c.days >= 1 && c.days <= 7)).toBe(true);
  });
});

describe("buildTimeScale — sprints horizon is 12 weeks from Monday", () => {
  it("spans exactly 84 days starting on the current Monday", () => {
    const scale = buildTimeScale({ mode: "sprints", zoom: "week", today: TODAY });
    expect(scale.startIso).toBe("2026-07-27");
    expect(scale.totalDays).toBe(SPRINTS_HORIZON_WEEKS * 7);
    expect(scale.totalDays).toBe(84);
    expect(scale.endIso).toBe("2026-10-18");
    expect(scale.columns).toHaveLength(12);
    expect(scale.columns.every((c) => c.days === 7)).toBe(true);
  });

  it("keeps the 84-day horizon on the coarser zooms", () => {
    for (const zoom of ["quarter", "month", "week"] as const) {
      const scale = buildTimeScale({ mode: "sprints", zoom, today: TODAY });
      expect(scale.totalDays).toBe(84);
      expect(scale.startIso).toBe("2026-07-27");
      expect(scale.columns.reduce((sum, c) => sum + c.days, 0)).toBe(84);
      expect(scale.columns.reduce((sum, c) => sum + c.widthPercent, 0)).toBeCloseTo(100, 8);
    }
  });
});

describe("today marker", () => {
  it("sits in the middle of today's cell", () => {
    const scale = buildTimeScale({ mode: "roadmap", zoom: "month", today: TODAY });
    // 2026-07-28 is offset 27 from 2026-07-01 over a 365-day horizon.
    expect(scale.todayPercent).toBeCloseTo(((27 + 0.5) / 365) * 100, 10);
    expect(scale.todayIso).toBe(TODAY);
  });

  it("is at the very start of a sprints horizon on a Monday", () => {
    const scale = buildTimeScale({ mode: "sprints", zoom: "week", today: "2026-07-27" });
    expect(scale.todayPercent).toBeCloseTo((0.5 / 84) * 100, 10);
  });

  it("marks exactly one column as current", () => {
    for (const zoom of ["quarter", "month", "week"] as const) {
      const scale = buildTimeScale({ mode: "roadmap", zoom, today: TODAY });
      expect(scale.columns.filter((c) => c.isCurrent)).toHaveLength(1);
    }
  });

  it("is null when today falls outside the horizon", () => {
    const scale = buildTimeScale({ mode: "roadmap", zoom: "month", today: TODAY });
    const past = { ...scale, startDay: scale.startDay + 400, endDay: scale.endDay + 400 };
    expect(markerPercent(past, TODAY)).toBeNull();
  });
});

describe("barGeometry", () => {
  const scale = buildTimeScale({ mode: "roadmap", zoom: "month", today: TODAY });

  it("places a whole-horizon bar at 0 % / 100 %", () => {
    const bar = barGeometry(scale, scale.startIso, scale.endIso);
    expect(bar.visible).toBe(true);
    expect(bar.leftPercent).toBe(0);
    expect(bar.widthPercent).toBeCloseTo(100, 10);
    expect(bar.clippedStart).toBe(false);
    expect(bar.clippedEnd).toBe(false);
  });

  it("treats both bounds as inclusive (a one-day bar is one day wide)", () => {
    const bar = barGeometry(scale, TODAY, TODAY);
    expect(bar.days).toBe(1);
    expect(bar.widthPercent).toBeCloseTo((1 / 365) * 100, 10);
    expect(bar.leftPercent).toBeCloseTo((27 / 365) * 100, 10);
  });

  it("clips a project that overruns the horizon on both sides", () => {
    const bar = barGeometry(scale, "2025-01-01", "2030-01-01");
    expect(bar.visible).toBe(true);
    expect(bar.leftPercent).toBe(0);
    expect(bar.widthPercent).toBeCloseTo(100, 10);
    expect(bar.days).toBe(365);
    expect(bar.clippedStart).toBe(true);
    expect(bar.clippedEnd).toBe(true);
  });

  it("clips only the leading edge when the project started earlier", () => {
    const bar = barGeometry(scale, "2026-01-15", "2026-08-31");
    expect(bar.leftPercent).toBe(0);
    expect(bar.clippedStart).toBe(true);
    expect(bar.clippedEnd).toBe(false);
    expect(bar.days).toBe(62); // July + August 2026
  });

  it("hides an interval that ends before or starts after the horizon", () => {
    expect(barGeometry(scale, "2025-01-01", "2026-06-30").visible).toBe(false);
    expect(barGeometry(scale, "2027-07-01", "2027-12-31").visible).toBe(false);
  });

  it("substitutes the horizon edge for an open-ended interval", () => {
    const openEnd = barGeometry(scale, "2026-09-01", null);
    expect(openEnd.visible).toBe(true);
    expect(openEnd.clippedEnd).toBe(true);
    expect(openEnd.clippedStart).toBe(false);

    const openStart = barGeometry(scale, null, "2026-09-01");
    expect(openStart.visible).toBe(true);
    expect(openStart.clippedStart).toBe(true);
    expect(openStart.leftPercent).toBe(0);
  });

  it("draws nothing when both dates are missing", () => {
    expect(barGeometry(scale, null, null).visible).toBe(false);
    expect(barGeometry(scale, undefined, undefined).widthPercent).toBe(0);
  });

  it("collapses an inverted interval to a single day", () => {
    const bar = barGeometry(scale, "2026-09-10", "2026-09-01");
    expect(bar.visible).toBe(true);
    expect(bar.days).toBe(1);
  });

  it("does not shift a bar by a day in a positive-offset timezone", () => {
    // The 1st of the horizon must land on exactly 0 %, not on -1 day.
    expect(barGeometry(scale, "2026-07-01", "2026-07-01").leftPercent).toBe(0);
    // The last day must end flush with 100 %.
    const last = barGeometry(scale, "2027-06-30", "2027-06-30");
    expect(last.leftPercent + last.widthPercent).toBeCloseTo(100, 10);
  });
});

describe("past vs future markers", () => {
  it("splits past / today / future with today counted as actionable", () => {
    expect(dayPhase("2026-07-27", TODAY)).toBe("past");
    expect(dayPhase(TODAY, TODAY)).toBe("today");
    expect(dayPhase("2026-07-29", TODAY)).toBe("future");
    expect(dayPhase(null, TODAY)).toBe("unknown");
    expect(isPastDay(TODAY, TODAY)).toBe(false);
    expect(isPastDay("2026-07-27", TODAY)).toBe(true);
  });
});

describe("header labels", () => {
  it("labels each zoom in Slovak and English", () => {
    const q = buildTimeScale({ mode: "roadmap", zoom: "quarter", today: TODAY }).columns[0];
    const m = buildTimeScale({ mode: "roadmap", zoom: "month", today: TODAY }).columns[0];
    const w = buildTimeScale({ mode: "sprints", zoom: "week", today: TODAY }).columns[0];
    expect(columnLabel(q)).toBe("Q3");
    expect(columnLabel(m)).toBe("júl");
    expect(columnLabel(m, "en")).toBe("Jul");
    expect(columnLabel(w)).toBe("31. t.");
    expect(columnLabel(w, "en")).toBe("W31");
    expect(columnTitle(m)).toBe("júl 2026");
    expect(columnTitle(m, "en")).toBe("July 2026");
    expect(columnTitle(w)).toBe("31. týždeň 2026");
  });

  it("groups the month columns into two year cells", () => {
    const scale = buildTimeScale({ mode: "roadmap", zoom: "month", today: TODAY });
    const groups = headerGroups(scale);
    expect(groups.map((g) => g.label)).toEqual(["2026", "2027"]);
    expect(groups[0].columnCount).toBe(6); // Jul–Dec 2026
    expect(groups[1].columnCount).toBe(6); // Jan–Jun 2027
    expect(groups.reduce((s, g) => s + g.days, 0)).toBe(scale.totalDays);
    expect(groups.reduce((s, g) => s + g.widthPercent, 0)).toBeCloseTo(100, 8);
  });

  it("formats days and ranges without shifting them", () => {
    expect(formatDay(TODAY)).toBe("28. júl 2026");
    expect(formatDay(TODAY, "en")).toBe("28 Jul 2026");
    expect(formatDayShort("2026-01-01")).toBe("1. január");
    expect(formatRange("2026-07-20", "2026-08-02")).toBe("20. júl – 2. august");
    expect(formatRange(null, null)).toBe("—");
    expect(formatDay(null)).toBe("—");
  });
});

describe("groupProjectsByArea", () => {
  it("buckets by area, sorts areas alphabetically and keeps row order", () => {
    const groups = groupProjectsByArea([
      { id: "1", area: "Platforma" },
      { id: "2", area: "Bezpečnosť" },
      { id: "3", area: "Platforma" },
      { id: "4", area: "" },
      { id: "5", area: null },
    ]);
    expect(groups.map((g) => g.area)).toEqual([
      "Bezpečnosť",
      "Platforma",
      NO_AREA_LABEL,
    ]);
    // Incoming order inside a bucket survives (the API already sorted by risk).
    expect(groups[1].projects.map((p) => p.id)).toEqual(["1", "3"]);
    expect(groups[2].projects).toHaveLength(2);
  });

  it("returns nothing for an empty portfolio", () => {
    expect(groupProjectsByArea([])).toEqual([]);
  });
});

describe("packLanes", () => {
  const scale = buildTimeScale({ mode: "sprints", zoom: "week", today: TODAY });

  it("puts non-overlapping sprints on one lane", () => {
    const laned = packLanes(
      [
        { id: "a", startDate: "2026-07-27", endDate: "2026-08-09" },
        { id: "b", startDate: "2026-08-10", endDate: "2026-08-23" },
      ],
      scale,
    );
    expect(laned.map((l) => l.lane)).toEqual([0, 0]);
  });

  it("puts overlapping sprints side by side", () => {
    const laned = packLanes(
      [
        { id: "a", startDate: "2026-07-27", endDate: "2026-08-09" },
        { id: "b", startDate: "2026-08-03", endDate: "2026-08-16" },
        { id: "c", startDate: "2026-08-05", endDate: "2026-08-18" },
        { id: "d", startDate: "2026-08-20", endDate: "2026-08-30" },
      ],
      scale,
    );
    const byId = new Map(laned.map((l) => [l.item.id, l.lane]));
    expect(byId.get("a")).toBe(0);
    expect(byId.get("b")).toBe(1);
    expect(byId.get("c")).toBe(2);
    // `d` starts after `a` ended, so it reuses the first free lane.
    expect(byId.get("d")).toBe(0);
  });

  it("is stable for equal intervals", () => {
    const laned = packLanes(
      [
        { id: "x", startDate: "2026-08-01", endDate: "2026-08-14" },
        { id: "y", startDate: "2026-08-01", endDate: "2026-08-14" },
      ],
      scale,
    );
    expect(laned.map((l) => l.item.id)).toEqual(["x", "y"]);
    expect(laned.map((l) => l.lane)).toEqual([0, 1]);
  });

  it("filters sprints outside the horizon", () => {
    const kept = sprintsInHorizon(
      [
        { id: "in", startDate: "2026-08-01", endDate: "2026-08-14" },
        { id: "before", startDate: "2026-01-01", endDate: "2026-01-14" },
        { id: "after", startDate: "2027-01-01", endDate: "2027-01-14" },
      ],
      scale,
    );
    expect(kept.map((s) => s.id)).toEqual(["in"]);
  });
});

describe("manual ordering", () => {
  it("spaces a first item and appends with a full step", () => {
    expect(rankBetween(null, null)).toBe(RANK_STEP);
    expect(rankBetween(5000, null)).toBe(6000);
  });

  it("halves the gap when dropping at the top", () => {
    expect(rankBetween(null, 1000)).toBe(500);
    expect(rankBetween(null, 1)).toBe(0);
    expect(rankBetween(null, 0)).toBe(0);
  });

  it("takes the midpoint between two neighbours", () => {
    expect(rankBetween(1000, 2000)).toBe(1500);
    expect(rankBetween(1000, 1003)).toBe(1001);
  });

  it("ties with the lower neighbour once the gap is exhausted", () => {
    expect(rankBetween(1000, 1001)).toBe(1001);
    expect(rankBetween(1000, 1000)).toBe(1001);
  });

  it("resolves an insert index against the remaining ranks", () => {
    const ranks = [1000, 2000, 3000];
    expect(rankForInsert(ranks, 0)).toBe(500);
    expect(rankForInsert(ranks, 1)).toBe(1500);
    expect(rankForInsert(ranks, 3)).toBe(4000);
    expect(rankForInsert(ranks, 99)).toBe(4000); // clamped to the end
    expect(rankForInsert(ranks, -4)).toBe(500); // clamped to the start
    expect(rankForInsert([], 0)).toBe(RANK_STEP);
  });
});

describe("decision queue", () => {
  const queue = [
    { id: "c", dueDate: "2026-08-10", readiness: 100, name: "Cé", lifecycle: "ready" },
    { id: "a", dueDate: "2026-07-20", readiness: 40, name: "Á", lifecycle: "blocked" },
    { id: "d", dueDate: null, readiness: 0, name: "Dé", lifecycle: "planned" },
    { id: "b", dueDate: "2026-08-10", readiness: 100, name: "Bé", lifecycle: "ready" },
    { id: "e", dueDate: "2026-08-10", readiness: 20, name: "É", lifecycle: "planned" },
  ];

  it("orders by due date, then readiness desc, then name", () => {
    expect(sortDecisionQueue(queue).map((c) => c.id)).toEqual(["a", "b", "c", "e", "d"]);
  });

  it("does not mutate the input", () => {
    const copy = [...queue];
    sortDecisionQueue(queue);
    expect(queue).toEqual(copy);
  });

  it("counts ready, blocked and overdue", () => {
    expect(queueStats(queue, TODAY)).toEqual({
      total: 5,
      ready: 2,
      blocked: 1,
      overdue: 1, // only `a` is undecided and past 2026-07-28
    });
  });

  it("does not count a decided checkpoint as overdue", () => {
    expect(
      queueStats([{ dueDate: "2026-01-01", lifecycle: "decided" }], TODAY).overdue,
    ).toBe(0);
  });
});

describe("capacity banding", () => {
  it("turns red above 100 % and amber from 85 %", () => {
    expect(capacityTone(0)).toBe("accent");
    expect(capacityTone(84)).toBe("accent");
    expect(capacityTone(85)).toBe("warn");
    expect(capacityTone(100)).toBe("warn");
    expect(capacityTone(101)).toBe("danger");
    expect(capacityTone(Number.NaN)).toBe("accent");
  });
});

describe("keyboard shortcut guard", () => {
  it("suppresses shortcuts while the user is typing", () => {
    expect(isTypingTarget({ tagName: "INPUT" })).toBe(true);
    expect(isTypingTarget({ tagName: "textarea" })).toBe(true);
    expect(isTypingTarget({ tagName: "SELECT" })).toBe(true);
    expect(isTypingTarget({ tagName: "DIV", isContentEditable: true })).toBe(true);
    expect(isTypingTarget({ tagName: "DIV" })).toBe(false);
    expect(isTypingTarget({ tagName: "BUTTON" })).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });
});
