import { describe, expect, it } from "vitest";
import {
  groupDecisionsByMonth,
  monthLabel,
  type DecisionTimeline,
} from "./decisionTimeline";

/** The suite's TODAY, same anchor the rest of the timeline tests use. */
const TODAY = "2026-07-28";

/** Shorthand checkpoint literal — the grouping reads `dueDate` and nothing else. */
const cp = (id: string, dueDate: string | null) => ({ id, dueDate });

/** Ids of every card in the result, sections in order, then the undated tail. */
function ids<C extends { id: string }>(result: DecisionTimeline<C>): string[] {
  return [
    ...result.months.flatMap((m) => m.cards.map((c) => c.item.id)),
    ...result.undated.map((c) => c.item.id),
  ];
}

describe("groupDecisionsByMonth — empty input", () => {
  it("returns no sections and no rule to draw", () => {
    const result = groupDecisionsByMonth([], TODAY);
    expect(result.months).toEqual([]);
    expect(result.undated).toEqual([]);
    expect(result.overdueCount).toBe(0);
    expect(result.upcomingCount).toBe(0);
  });
});

describe("groupDecisionsByMonth — months", () => {
  it("puts every checkpoint in the month of its due date, in day order", () => {
    const result = groupDecisionsByMonth(
      [
        cp("sep", "2026-09-15"),
        cp("jul-late", "2026-07-30"),
        cp("aug", "2026-08-03"),
        cp("jul-early", "2026-07-02"),
      ],
      TODAY,
    );
    expect(result.months.map((m) => m.key)).toEqual(["2026-07", "2026-08", "2026-09"]);
    expect(ids(result)).toEqual(["jul-early", "jul-late", "aug", "sep"]);
  });

  it("keeps several checkpoints of one month in ONE section, ordered by day", () => {
    const result = groupDecisionsByMonth(
      [cp("c", "2026-08-28"), cp("a", "2026-08-04"), cp("b", "2026-08-12")],
      TODAY,
    );
    expect(result.months).toHaveLength(1);
    expect(result.months[0].cards.map((c) => c.day)).toEqual([4, 12, 28]);
    expect(ids(result)).toEqual(["a", "b", "c"]);
  });

  it("breaks a same-day tie by the incoming order, never by id", () => {
    // The caller already sorted by readiness then name (sortDecisionQueue); a
    // re-sort here would silently throw that away.
    const result = groupDecisionsByMonth(
      [cp("second", "2026-08-10"), cp("first", "2026-08-10")],
      TODAY,
    );
    expect(ids(result)).toEqual(["second", "first"]);
  });

  it("marks only the month containing today as current", () => {
    const result = groupDecisionsByMonth(
      [cp("a", "2026-06-01"), cp("b", "2026-07-31"), cp("c", "2026-08-01")],
      TODAY,
    );
    expect(result.months.map((m) => m.isCurrent)).toEqual([false, true, false]);
  });

  it("labels a section with the month name and year", () => {
    const result = groupDecisionsByMonth([cp("a", "2026-07-09")], TODAY);
    expect(result.months[0].label).toBe("júl 2026");
    expect(result.months[0]).toMatchObject({ year: 2026, month: 7 });
  });

  it("numbers the ranks across sections, not inside them", () => {
    const result = groupDecisionsByMonth(
      [cp("a", "2026-07-05"), cp("b", "2026-09-05"), cp("c", "2026-08-05")],
      TODAY,
    );
    expect(result.months.flatMap((m) => m.cards.map((c) => c.rank))).toEqual([1, 2, 3]);
  });
});

describe("groupDecisionsByMonth — overdue split", () => {
  it("counts a checkpoint due before today as overdue", () => {
    const result = groupDecisionsByMonth([cp("a", "2026-07-27")], TODAY);
    expect(result.months[0].cards[0].overdue).toBe(true);
    expect(result).toMatchObject({ overdueCount: 1, upcomingCount: 0 });
  });

  it("does NOT count a checkpoint due exactly today as overdue", () => {
    // Today is still actionable — same rule as isPastDay and queueStats, so the
    // "Po termíne" tile above the axis and the axis itself cannot disagree.
    const result = groupDecisionsByMonth([cp("today", TODAY)], TODAY);
    expect(result.months[0].cards[0].overdue).toBe(false);
    expect(result).toMatchObject({ overdueCount: 0, upcomingCount: 1 });
  });

  it("draws the rule right after the last late checkpoint, inside its month", () => {
    // July straddles today: the 20th is late, the 30th is not.
    const result = groupDecisionsByMonth(
      [cp("late", "2026-07-20"), cp("soon", "2026-07-30"), cp("aug", "2026-08-10")],
      TODAY,
    );
    expect(result.months.map((m) => m.todayIndex)).toEqual([1, null]);
  });

  it("draws the rule between two sections when the boundary falls between them", () => {
    const result = groupDecisionsByMonth(
      [cp("june", "2026-06-10"), cp("sep", "2026-09-10")],
      TODAY,
    );
    // `cards.length` on the June section = after its last card, before September.
    expect(result.months[0].todayIndex).toBe(1);
    expect(result.months[1].todayIndex).toBeNull();
  });

  it("puts the rule at the very top when nothing is late", () => {
    const result = groupDecisionsByMonth(
      [cp("a", "2026-08-01"), cp("b", "2026-09-01")],
      TODAY,
    );
    expect(result.months.map((m) => m.todayIndex)).toEqual([0, null]);
  });

  it("puts the rule at the very bottom when everything is late", () => {
    const result = groupDecisionsByMonth(
      [cp("a", "2026-05-01"), cp("b", "2026-07-01")],
      TODAY,
    );
    expect(result.months.map((m) => m.todayIndex)).toEqual([null, 1]);
    expect(result).toMatchObject({ overdueCount: 2, upcomingCount: 0 });
  });

  it("draws no rule at all for an unparsable today", () => {
    const result = groupDecisionsByMonth([cp("a", "2026-08-01")], "not-a-day");
    expect(result.months[0].todayIndex).toBeNull();
    expect(result.months[0].isCurrent).toBe(false);
    expect(result.overdueCount).toBe(0);
  });

  it("draws no rule when there is nothing dated to separate", () => {
    const result = groupDecisionsByMonth([cp("a", null)], TODAY);
    expect(result.months).toEqual([]);
  });
});

describe("groupDecisionsByMonth — outside any horizon", () => {
  it("keeps a checkpoint years past the roadmap horizon in its own month", () => {
    // The roadmap clips at 12 months; this axis does not. Dropping the row would
    // make the list disagree with the counters right above it, and "it is very far
    // away" is exactly the fact the reader needs.
    const result = groupDecisionsByMonth(
      [cp("far", "2029-03-04"), cp("soon", "2026-08-04")],
      TODAY,
    );
    expect(result.months.map((m) => m.key)).toEqual(["2026-08", "2029-03"]);
    expect(result.months[1].label).toBe("marec 2029");
    expect(result.upcomingCount).toBe(2);
  });

  it("keeps a checkpoint a year overdue, and flags it", () => {
    const result = groupDecisionsByMonth([cp("ancient", "2025-02-11")], TODAY);
    expect(result.months[0].key).toBe("2025-02");
    expect(result.months[0].cards[0].overdue).toBe(true);
    // Only section there is, so the rule sits after its last card.
    expect(result.months[0].todayIndex).toBe(1);
  });

  it("does not invent the months in between", () => {
    const result = groupDecisionsByMonth(
      [cp("a", "2026-07-01"), cp("b", "2027-07-01")],
      TODAY,
    );
    expect(result.months).toHaveLength(2);
  });
});

describe("groupDecisionsByMonth — no usable due date", () => {
  it("moves an unparsable day to the undated tail instead of a month", () => {
    // 2026-02-31 is not a calendar day; it must not roll over into March.
    const result = groupDecisionsByMonth(
      [cp("bad", "2026-02-31"), cp("missing", null), cp("ok", "2026-08-02")],
      TODAY,
    );
    expect(result.months.map((m) => m.key)).toEqual(["2026-08"]);
    expect(result.undated.map((c) => c.item.id)).toEqual(["bad", "missing"]);
  });

  it("keeps the undated tail in the incoming order and counts it out of the split", () => {
    const result = groupDecisionsByMonth(
      [cp("z", null), cp("a", null), cp("dated", "2026-08-02")],
      TODAY,
    );
    expect(result.undated.map((c) => c.item.id)).toEqual(["z", "a"]);
    expect(result).toMatchObject({ overdueCount: 0, upcomingCount: 1 });
    expect(result.undated.every((c) => c.day === null && !c.overdue)).toBe(true);
  });

  it("continues the queue ranks into the undated tail", () => {
    const result = groupDecisionsByMonth(
      [cp("a", "2026-08-02"), cp("b", "2026-09-02"), cp("none", null)],
      TODAY,
    );
    expect(result.undated[0].rank).toBe(3);
  });
});

describe("monthLabel", () => {
  it("reuses the canonical month names instead of a second table", () => {
    expect(monthLabel(2026, 1)).toBe("január 2026");
    expect(monthLabel(2026, 5)).toBe("máj 2026");
    expect(monthLabel(2027, 12)).toBe("december 2027");
  });
});
