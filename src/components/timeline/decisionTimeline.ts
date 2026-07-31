// The RULE behind the decision timeline, extracted from DecisionQueue.tsx because
// it is a claim the reader is shown as a fact rather than a styling detail:
//
//   a queue ordered by due date says WHICH checkpoint is next, but not how far
//   away it is. The same rows grouped into calendar months, with ONE rule drawn at
//   today, answer both questions at a glance: everything above the rule is late,
//   everything below it is still ahead.
//
// Pure on purpose: vitest runs with `environment: "node"` in this repo (jsdom is
// not installed), so a rendered component cannot be asserted on — a function like
// this can. Day parsing is delegated to `@/lib/timeline`, so the timezone contract
// (a calendar day is an integer day number, never a host-local `Date`) holds here
// too.
//
// NO HORIZON. Unlike the roadmap this axis is not clipped to 12 months: a
// checkpoint that is a year overdue or three years out still gets its own month
// section. Dropping it would make this list disagree with the counters directly
// above it, and "it is very far away" is exactly what the reader needs to see.
// Months with no checkpoint are not drawn either — an empty run of 30 sections
// between two real ones is noise, not information.

import {
  civilOf,
  columnTitle,
  isPastDay,
  startOfMonthDay,
  toDay,
  type TimelineColumn,
} from "@/lib/timeline";

/** Everything the grouping reads from a checkpoint. */
export interface DueDated {
  dueDate?: string | null;
}

export interface DecisionCard<C> {
  item: C;
  /** 1-based position in the whole due-ordered queue, across every section. */
  rank: number;
  /** Day of the month, 1–31 — where the card sits inside its section. */
  day: number | null;
  /**
   * Due strictly BEFORE today. Today itself is NOT overdue — it is still
   * actionable. That is `isPastDay`'s rule and the same one `queueStats` counts
   * its `overdue` tile with, so the tile above the axis and the axis agree.
   */
  overdue: boolean;
}

export interface DecisionMonth<C> {
  /** `2026-07` — the grouping key and the section's React key. */
  key: string;
  /** `júl 2026`. */
  label: string;
  year: number;
  /** 1–12. */
  month: number;
  /** True for the month that contains `today`. */
  isCurrent: boolean;
  /** Cards in due order; ties keep the incoming order. */
  cards: DecisionCard<C>[];
  /**
   * Index in `cards` the "Dnes" rule is drawn BEFORE, `cards.length` for "after
   * the last card of this month", or null when the rule belongs elsewhere. At
   * most one month in a result carries it.
   */
  todayIndex: number | null;
}

export interface DecisionTimeline<C> {
  months: DecisionMonth<C>[];
  /**
   * No parsable due day, so nothing to place on an axis. Listed in its own
   * section after the months — still clickable, still counted.
   */
  undated: DecisionCard<C>[];
  overdueCount: number;
  /** Dated and due today or later. `overdueCount + upcomingCount` = dated total. */
  upcomingCount: number;
}

/** `2026-07`. */
function monthKey(year: number, month: number): string {
  return `${year}-${month < 10 ? `0${month}` : month}`;
}

/**
 * `júl 2026`.
 *
 * Routed through `columnTitle` on a one-month column instead of a second
 * month-name table: `lib/timeline` hard-codes those names deliberately (an `Intl`
 * lookup is not byte-identical between a browser, Node and a Docker image with a
 * trimmed ICU) and a copy here would be the thing that drifts. Only `unit`,
 * `ordinal` and `year` are read — the rest of the column is filler.
 */
export function monthLabel(year: number, month: number): string {
  const column: TimelineColumn = {
    key: monthKey(year, month),
    unit: "month",
    year,
    ordinal: month,
    startDay: 0,
    endDay: 0,
    days: 1,
    widthPercent: 0,
    isCurrent: false,
  };
  return columnTitle(column);
}

/**
 * Group the decision queue into month sections and place the "Dnes" rule.
 *
 * Ordering: due date decides, and the INCOMING order breaks ties — the caller has
 * already sorted by readiness and name (`sortDecisionQueue`, mirroring the
 * server's `queue=1`), and re-sorting here would throw that away.
 *
 * Where the rule goes, one consistent sentence: right after the last late
 * checkpoint. Nothing late → it lands at the very top, because all of it is ahead
 * of us; everything late → at the very bottom, which is the honest reading of that
 * situation. An unparsable `today` gets NO rule rather than a wrong one.
 */
export function groupDecisionsByMonth<C extends DueDated>(
  items: readonly C[],
  today: string,
): DecisionTimeline<C> {
  const todayDay = toDay(today);
  const todayMonth = todayDay === null ? null : startOfMonthDay(todayDay);

  const dated: { item: C; day: number; index: number }[] = [];
  const undatedItems: C[] = [];
  items.forEach((item, index) => {
    const day = toDay(item.dueDate);
    if (day === null) undatedItems.push(item);
    else dated.push({ item, day, index });
  });

  dated.sort((a, b) => a.day - b.day || a.index - b.index);

  const months: DecisionMonth<C>[] = [];
  let overdueCount = 0;
  // Where the last late card landed. A plain `for` loop rather than `forEach`:
  // TypeScript's control-flow analysis does not carry an assignment made inside a
  // callback out of it, so the narrowing below would break.
  let lastOverdueMonth = -1;
  let lastOverdueIndex = -1;

  for (let rank = 0; rank < dated.length; rank += 1) {
    const entry = dated[rank];
    const firstOfMonth = startOfMonthDay(entry.day);
    const civil = civilOf(firstOfMonth);
    const key = monthKey(civil.year, civil.month);

    // Sorted by day, so all cards of one month are adjacent: comparing against the
    // last section is enough, no map needed.
    let month = months[months.length - 1];
    if (!month || month.key !== key) {
      month = {
        key,
        label: monthLabel(civil.year, civil.month),
        year: civil.year,
        month: civil.month,
        isCurrent: todayMonth !== null && todayMonth === firstOfMonth,
        cards: [],
        todayIndex: null,
      };
      months.push(month);
    }

    const overdue = isPastDay(entry.item.dueDate, today);
    if (overdue) {
      overdueCount += 1;
      lastOverdueMonth = months.length - 1;
      lastOverdueIndex = month.cards.length;
    }

    month.cards.push({
      item: entry.item,
      rank: rank + 1,
      day: civilOf(entry.day).day,
      overdue,
    });
  }

  if (todayDay !== null && months.length > 0) {
    if (lastOverdueMonth >= 0) {
      months[lastOverdueMonth].todayIndex = lastOverdueIndex + 1;
    } else {
      months[0].todayIndex = 0;
    }
  }

  return {
    months,
    // Ranks continue past the dated ones: the queue sinks a missing due date to the
    // bottom, so that IS their position in it.
    undated: undatedItems.map((item, offset) => ({
      item,
      rank: dated.length + offset + 1,
      day: null,
      overdue: false,
    })),
    overdueCount,
    upcomingCount: dated.length - overdueCount,
  };
}
