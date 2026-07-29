import { describe, expect, it } from "vitest";
import {
  CHART_WEEKS,
  bucketDonePoints,
  localDayOf,
  mondayOf,
  weekOverWeekDelta,
  weekStarts,
  windowTotal,
} from "./weeks";

// TZ is pinned to Europe/Bratislava by vitest.config.ts, so a UTC-vs-local
// mistake is visible here instead of only in production.

describe("mondayOf", () => {
  it("maps every day of a week to the same Monday", () => {
    // 2026-07-27 is a Monday.
    for (const day of [
      "2026-07-27",
      "2026-07-28",
      "2026-07-29",
      "2026-07-30",
      "2026-07-31",
      "2026-08-01",
      "2026-08-02", // Sunday still belongs to the Monday-started week
    ]) {
      expect(mondayOf(day)).toBe("2026-07-27");
    }
  });

  it("starts the next week on the following Monday", () => {
    expect(mondayOf("2026-08-03")).toBe("2026-08-03");
  });

  it("crosses a year boundary without inventing a week", () => {
    expect(mondayOf("2027-01-01")).toBe("2026-12-28");
  });

  it("returns null for junk instead of guessing", () => {
    expect(mondayOf(null)).toBeNull();
    expect(mondayOf("")).toBeNull();
    expect(mondayOf("not-a-date")).toBeNull();
  });
});

describe("localDayOf", () => {
  it("uses the LOCAL day of an instant, not the UTC day", () => {
    // 22:30 UTC on the 27th is 00:30 on the 28th in Europe/Bratislava (CEST).
    expect(localDayOf("2026-07-27T22:30:00.000Z")).toBe("2026-07-28");
  });

  it("rejects an unparseable instant", () => {
    expect(localDayOf("nope")).toBeNull();
    expect(localDayOf(null)).toBeNull();
  });
});

describe("weekStarts", () => {
  it("returns exactly `count` Mondays, oldest first, ending with today's week", () => {
    const weeks = weekStarts(CHART_WEEKS, "2026-07-28");
    expect(weeks).toHaveLength(12);
    expect(weeks[11]).toBe("2026-07-27");
    expect(weeks[0]).toBe("2026-05-11");
    for (const w of weeks) expect(mondayOf(w)).toBe(w);
  });

  it("is strictly increasing in 7-day steps", () => {
    const weeks = weekStarts(6, "2026-03-04");
    for (let i = 1; i < weeks.length; i += 1) {
      const gap = Date.parse(`${weeks[i]}T00:00:00Z`) - Date.parse(`${weeks[i - 1]}T00:00:00Z`);
      expect(gap).toBe(7 * 86_400_000);
    }
  });
});

describe("bucketDonePoints", () => {
  const weeks = weekStarts(4, "2026-07-28"); // 2026-07-06 … 2026-07-27

  it("keeps every requested week, so an empty week is a zero and not a gap", () => {
    const buckets = bucketDonePoints([], weeks);
    expect(buckets.map((b) => b.weekStart)).toEqual(weeks);
    expect(buckets.every((b) => b.points === 0)).toBe(true);
  });

  it("sums ownStoryPoints into the week of updatedAt", () => {
    const buckets = bucketDonePoints(
      [
        { updatedAt: "2026-07-28T09:00:00.000Z", ownStoryPoints: 3 },
        { updatedAt: "2026-07-29T09:00:00.000Z", ownStoryPoints: 5 },
        { updatedAt: "2026-07-14T09:00:00.000Z", ownStoryPoints: 2 },
      ],
      weeks,
    );
    expect(buckets[3].points).toBe(8);
    expect(buckets[1].points).toBe(2);
  });

  it("ignores items outside the window (the caller over-fetches)", () => {
    const buckets = bucketDonePoints(
      [{ updatedAt: "2024-01-10T09:00:00.000Z", ownStoryPoints: 99 }],
      weeks,
    );
    expect(windowTotal(buckets)).toBe(0);
  });

  it("skips rows with no timestamp and clamps negative points", () => {
    const buckets = bucketDonePoints(
      [
        { updatedAt: null, ownStoryPoints: 8 },
        { updatedAt: "2026-07-28T09:00:00.000Z", ownStoryPoints: -4 },
      ],
      weeks,
    );
    expect(windowTotal(buckets)).toBe(0);
  });

  it("does NOT double count a parent and its subtasks", () => {
    // A parent whose effective storyPoints is 5 stores ownStoryPoints 0 when the
    // subtasks carry 3 + 2 — bucketing own points therefore yields 5, not 10.
    const buckets = bucketDonePoints(
      [
        { updatedAt: "2026-07-28T09:00:00.000Z", ownStoryPoints: 0 }, // parent
        { updatedAt: "2026-07-28T09:00:00.000Z", ownStoryPoints: 3 },
        { updatedAt: "2026-07-28T09:00:00.000Z", ownStoryPoints: 2 },
      ],
      weeks,
    );
    expect(windowTotal(buckets)).toBe(5);
  });
});

describe("weekOverWeekDelta", () => {
  const weeks = weekStarts(4, "2026-07-28");

  it("compares the two COMPLETED weeks, ignoring the partial current one", () => {
    const buckets = [
      { weekStart: weeks[0], label: "", points: 1 },
      { weekStart: weeks[1], label: "", points: 10 },
      { weekStart: weeks[2], label: "", points: 14 },
      { weekStart: weeks[3], label: "", points: 2 }, // running week, partial
    ];
    expect(weekOverWeekDelta(buckets)).toBe(4);
  });

  it("is negative when the last full week dropped", () => {
    const buckets = [
      { weekStart: "a", label: "", points: 0 },
      { weekStart: "b", label: "", points: 20 },
      { weekStart: "c", label: "", points: 13 },
      { weekStart: "d", label: "", points: 0 },
    ];
    expect(weekOverWeekDelta(buckets)).toBe(-7);
  });

  it("returns 0 when there is not enough history to compare", () => {
    expect(weekOverWeekDelta([])).toBe(0);
    expect(weekOverWeekDelta([{ weekStart: "a", label: "", points: 5 }])).toBe(0);
  });
});
