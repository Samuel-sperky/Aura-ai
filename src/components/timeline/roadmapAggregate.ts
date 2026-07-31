// The three RULES behind the vertical roadmap's owner decisions — extracted from
// RoadmapMode.tsx because each of them is a claim the reader is shown as a fact,
// not a styling detail:
//
//   1. collapsing an area into ONE summary lane (range, count, worst health)
//   2. deciding whether a checkpoint sits OUTSIDE its project's duration
//   3. deciding which projects have no place on a time axis at all
//
// Pure on purpose: vitest runs with `environment: "node"` in this repo (jsdom is
// not installed), so a rendered component cannot be asserted on — a function like
// this can. Nothing here touches the DOM, React or the scale; day parsing is
// delegated to `@/lib/timeline` so the timezone contract holds here too.

import { toDay, toIso } from "@/lib/timeline";

/** The project health vocabulary. `grey` is "no data", never a fourth state. */
export type AreaHealth = "green" | "amber" | "red" | "grey";

/**
 * How alarming each health value is, for "worst of the group".
 *
 * `grey` deliberately outranks `green`: it means the project reports nothing, and
 * a collapsed area must not summarise an unknown as healthy. It stays BELOW
 * `amber`, so a single project without data can never mask a real warning.
 */
const HEALTH_SEVERITY: Record<AreaHealth, number> = {
  green: 0,
  grey: 1,
  amber: 2,
  red: 3,
};

/** Everything the aggregate needs from a project. */
export interface AggregatableProject {
  startDate?: string | null;
  endDate?: string | null;
  health?: string | null;
  progress?: number | null;
}

export interface AreaAggregate {
  /** Earliest parsable start in the area, normalised, or null when none has one. */
  startDate: string | null;
  /** Latest parsable end, normalised, or null. */
  endDate: string | null;
  projectCount: number;
  /** Worst health in the group. `grey` for an empty area — nothing is known. */
  health: AreaHealth;
  /** Mean progress across the group, rounded. 0 for an empty area. */
  progress: number;
}

/** Anything outside the vocabulary reads as "no data", the same as a null. */
function asHealth(value: unknown): AreaHealth {
  return value === "green" || value === "amber" || value === "red" ? value : "grey";
}

/**
 * One summary lane for a whole area: the span from the earliest start to the
 * latest end, how many projects it stands for, the worst health in the group and
 * the mean progress.
 *
 * The two ends are independent — an area whose only dated project has a start and
 * no end yields `{ startDate, endDate: null }`, which `barGeometry` already draws
 * as an open-ended span. Dates are returned normalised through `toIso`, so an
 * unpadded input can never leak into a `title` or a `formatDay`.
 */
export function aggregateArea(
  projects: readonly AggregatableProject[],
): AreaAggregate {
  let startDay: number | null = null;
  let endDay: number | null = null;
  let worst: AreaHealth | null = null;
  let progressSum = 0;

  for (const project of projects) {
    const from = toDay(project.startDate);
    if (from !== null && (startDay === null || from < startDay)) startDay = from;

    const to = toDay(project.endDate);
    if (to !== null && (endDay === null || to > endDay)) endDay = to;

    const health = asHealth(project.health);
    if (worst === null || HEALTH_SEVERITY[health] > HEALTH_SEVERITY[worst]) {
      worst = health;
    }

    const progress = project.progress;
    progressSum += typeof progress === "number" && Number.isFinite(progress)
      ? Math.min(100, Math.max(0, progress))
      : 0;
  }

  return {
    startDate: startDay === null ? null : toIso(startDay),
    endDate: endDay === null ? null : toIso(endDay),
    projectCount: projects.length,
    health: worst ?? "grey",
    progress: projects.length === 0 ? 0 : Math.round(progressSum / projects.length),
  };
}

/**
 * True when a checkpoint's due day falls outside the duration of the project it
 * belongs to.
 *
 * This is REAL information, most likely a data error, so the marker stays on the
 * lane and only gains a warning style — hiding it would hide the mistake. The
 * rule is deliberately conservative, so the warning means something:
 *   * no parsable due day        → not flagged (there is nothing to judge)
 *   * project with no bounds     → not flagged (nothing to be outside of)
 *   * one open end               → only the KNOWN end can be violated
 *   * end before start (bad data)→ the upper bound is lifted to the start, exactly
 *                                  as `barGeometry` does, so the marker and the
 *                                  bar it is compared against agree
 */
export function isOutsideProject(
  dueIso: string | null | undefined,
  startIso: string | null | undefined,
  endIso: string | null | undefined,
): boolean {
  const due = toDay(dueIso);
  if (due === null) return false;

  const start = toDay(startIso);
  const rawEnd = toDay(endIso);
  if (start === null && rawEnd === null) return false;

  const end =
    rawEnd === null ? null : start === null ? rawEnd : Math.max(rawEnd, start);

  if (start !== null && due < start) return true;
  if (end !== null && due > end) return true;
  return false;
}

/**
 * True when a project has no usable date at all and therefore no place on a time
 * axis. Such projects are listed UNDER the chart instead of getting an empty lane:
 * the axis stays clean and the project count still adds up.
 */
export function hasNoDates(project: AggregatableProject): boolean {
  return toDay(project.startDate) === null && toDay(project.endDate) === null;
}

/**
 * Split the projects into the ones that belong on the axis and the ones that do
 * not. Incoming order is preserved in both halves — the list endpoint already
 * sorted by risk and re-sorting here would throw that away.
 */
export function partitionByDates<P extends AggregatableProject>(
  projects: readonly P[],
): { dated: P[]; undated: P[] } {
  const dated: P[] = [];
  const undated: P[] = [];
  for (const project of projects) {
    if (hasNoDates(project)) undated.push(project);
    else dated.push(project);
  }
  return { dated, undated };
}
