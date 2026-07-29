// Weekly buckets for the one Overview chart (spec Q4): completed story points
// per week over the last 12 weeks.
//
// WHY THIS IS DERIVED ON THE CLIENT: there is no velocity endpoint. The chart
// buckets DONE work items by the week of their last change (`updatedAt`), which
// is the completion week for anything that reached `done` and stayed there.
//
// Double counting is the trap here: `WorkItemDto.storyPoints` is the EFFECTIVE
// value, i.e. the sum of a parent's subtasks. Summing that over a parent AND its
// children counts the same work twice, so the bucket sums `ownStoryPoints` —
// exactly the value stored on each row.
//
// Weeks start on MONDAY (Slovak convention) and are keyed by the Monday's
// `YYYY-MM-DD`. All arithmetic runs on UTC midnights derived from local calendar
// parts, so a DST boundary cannot move an item into the neighbouring week.

import { fmtDayMonth } from "@/lib/client/format";

/** How many weeks the Overview chart shows. */
export const CHART_WEEKS = 12;

export interface WeekBucket {
  /** Monday of the week, `YYYY-MM-DD`. */
  weekStart: string;
  /** Axis label, e.g. `13. 7.`. */
  label: string;
  /** Sum of `ownStoryPoints` of the items completed that week. */
  points: number;
}

/** The minimum shape the bucketing needs — any `WorkItemDto` satisfies it. */
export interface CompletedItemLike {
  updatedAt: string | null;
  ownStoryPoints: number;
}

function utcMidnight(iso: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function isoOf(msUtc: number): string {
  return new Date(msUtc).toISOString().slice(0, 10);
}

/**
 * The Monday of the week containing `day` (`YYYY-MM-DD`), as `YYYY-MM-DD`.
 * Returns null for an unparseable input rather than guessing a week.
 */
export function mondayOf(day: string | null | undefined): string | null {
  if (!day) return null;
  const ms = utcMidnight(day);
  if (ms === null) return null;
  // getUTCDay: 0 = Sunday. Shift so Monday is 0.
  const offset = (new Date(ms).getUTCDay() + 6) % 7;
  return isoOf(ms - offset * 86_400_000);
}

/**
 * The local calendar day of an ISO INSTANT. `updatedAt` is a timestamp, so the
 * week it belongs to is the week of the day the user saw it happen.
 */
export function localDayOf(instant: string | null | undefined): string | null {
  if (!instant) return null;
  const d = new Date(instant);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * `count` consecutive week starts ending with the week that contains `today`,
 * oldest first. Always exactly `count` entries, so an empty week is a visible
 * zero on the chart instead of a gap.
 */
export function weekStarts(count: number, today: string): string[] {
  const current = mondayOf(today);
  if (!current) return [];
  const base = utcMidnight(current);
  if (base === null) return [];
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    out.push(isoOf(base - i * 7 * 86_400_000));
  }
  return out;
}

/**
 * Bucket completed items into the given weeks. Items outside the window are
 * ignored (the caller over-fetches on purpose, sorted newest first).
 */
export function bucketDonePoints(
  items: ReadonlyArray<CompletedItemLike>,
  weeks: ReadonlyArray<string>,
): WeekBucket[] {
  const totals = new Map<string, number>();
  for (const week of weeks) totals.set(week, 0);

  for (const item of items) {
    const week = mondayOf(localDayOf(item.updatedAt));
    if (week === null) continue;
    const current = totals.get(week);
    if (current === undefined) continue;
    const points = Number.isFinite(item.ownStoryPoints) ? item.ownStoryPoints : 0;
    totals.set(week, current + Math.max(0, points));
  }

  return weeks.map((weekStart) => ({
    weekStart,
    label: fmtDayMonth(weekStart),
    points: totals.get(weekStart) ?? 0,
  }));
}

/** Sum of the whole window — the "12 týždňov" figure in the copied summary. */
export function windowTotal(buckets: ReadonlyArray<WeekBucket>): number {
  return buckets.reduce((sum, b) => sum + b.points, 0);
}

/**
 * Last week minus the week before it. Uses the two COMPLETED weeks, not the
 * running one: comparing a partial week against a full one always reads as a
 * collapse and would put a false alarm in the CEO report.
 */
export function weekOverWeekDelta(buckets: ReadonlyArray<WeekBucket>): number {
  if (buckets.length < 3) return 0;
  const lastFull = buckets[buckets.length - 2].points;
  const previous = buckets[buckets.length - 3].points;
  return lastFull - previous;
}
