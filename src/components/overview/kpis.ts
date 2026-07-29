// The KPI strip's numbers, assembled from the two places they come from.
//
// Seven of the nine are computed SERVER-side and arrive in `GET /api/overview`
// as `kpis`; the remaining two (`donePointsWindow`, `donePointsDelta`) are sums
// over the 12-week chart buckets, which only the client has — it is the client
// that decides which 12 weeks the chart shows, from the browser's calendar day.
//
// WHY THIS IS A FUNCTION AND NOT A SPREAD IN THE COMPONENT: the result is the
// input of the copied CEO summary (`buildSummary`), so the field set is a
// contract, and the component cannot be unit-tested (no DOM environment in the
// vitest setup). Listing every field explicitly instead of `{ ...server }` buys
// two guarantees a spread does not: a field RENAMED on the server is a compile
// error here, and a field ADDED on the server cannot silently leak into the
// summary.

import type { OverviewKpisDto } from "@/lib/domain/contracts/overview";
import type { SummaryKpis } from "./summary";
import { weekOverWeekDelta, windowTotal } from "./weeks";
import type { WeekBucket } from "./weeks";

/**
 * The neutral strip, for the render passes that have no response yet. Not an
 * "empty state" the user is meant to read — the view shows `<LoadingState/>`
 * while this is in play; it exists so the memo has a total function.
 */
export const ZERO_KPIS: OverviewKpisDto = {
  activeProjects: 0,
  projectsAtRisk: 0,
  openCheckpoints: 0,
  myDecisions: 0,
  sprintName: null,
  sprintCapacityUsedPercent: null,
  overdueItems: 0,
};

/**
 * Merge the server's KPI block with the two chart-derived numbers into the exact
 * shape the strip renders and `buildSummary` consumes.
 */
export function summaryKpis(
  server: OverviewKpisDto,
  buckets: ReadonlyArray<WeekBucket>,
): SummaryKpis {
  return {
    activeProjects: server.activeProjects,
    projectsAtRisk: server.projectsAtRisk,
    openCheckpoints: server.openCheckpoints,
    myDecisions: server.myDecisions,
    sprintName: server.sprintName,
    sprintCapacityUsedPercent: server.sprintCapacityUsedPercent,
    overdueItems: server.overdueItems,
    donePointsWindow: windowTotal(buckets),
    donePointsDelta: weekOverWeekDelta(buckets),
  };
}
