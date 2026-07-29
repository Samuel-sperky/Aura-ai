import { describe, expect, it } from "vitest";
import { ZERO_KPIS, summaryKpis } from "./kpis";
import type { WeekBucket } from "./weeks";
import type { OverviewKpisDto } from "@/lib/domain/contracts/overview";

// `summaryKpis` is the seam between the aggregate endpoint and the CEO summary.
// The strip is rendered by a component that has no test environment, so this is
// the only place the field set can be pinned down: the summary must receive
// exactly nine numbers, and none of them may quietly come from somewhere else.

const SERVER: OverviewKpisDto = {
  activeProjects: 12,
  projectsAtRisk: 3,
  openCheckpoints: 7,
  myDecisions: 2,
  sprintName: "Šprint 14",
  sprintCapacityUsedPercent: 87,
  overdueItems: 5,
};

function bucket(weekStart: string, points: number): WeekBucket {
  return { weekStart, label: weekStart, points };
}

/** Four weeks: the delta reads the two COMPLETED weeks, not the running one. */
const BUCKETS: WeekBucket[] = [
  bucket("2026-07-06", 10),
  bucket("2026-07-13", 20),
  bucket("2026-07-20", 35),
  bucket("2026-07-27", 4),
];

describe("summaryKpis", () => {
  it("passes the server's seven tiles through unchanged", () => {
    const kpis = summaryKpis(SERVER, BUCKETS);
    expect(kpis.activeProjects).toBe(12);
    expect(kpis.projectsAtRisk).toBe(3);
    expect(kpis.openCheckpoints).toBe(7);
    expect(kpis.myDecisions).toBe(2);
    expect(kpis.sprintName).toBe("Šprint 14");
    expect(kpis.sprintCapacityUsedPercent).toBe(87);
    expect(kpis.overdueItems).toBe(5);
  });

  it("derives the two chart numbers from the buckets, not from the server", () => {
    const kpis = summaryKpis(SERVER, BUCKETS);
    expect(kpis.donePointsWindow).toBe(69); // 10 + 20 + 35 + 4
    expect(kpis.donePointsDelta).toBe(15); // 35 (last full week) - 20
  });

  it("carries exactly the nine summary fields — no server field leaks in", () => {
    const extra = { ...SERVER, someNewServerField: 99 } as OverviewKpisDto;
    expect(Object.keys(summaryKpis(extra, BUCKETS)).sort()).toEqual([
      "activeProjects",
      "donePointsDelta",
      "donePointsWindow",
      "myDecisions",
      "openCheckpoints",
      "overdueItems",
      "projectsAtRisk",
      "sprintCapacityUsedPercent",
      "sprintName",
    ]);
  });

  it("keeps a missing sprint as null rather than collapsing it to 0 %", () => {
    const kpis = summaryKpis(
      { ...SERVER, sprintName: null, sprintCapacityUsedPercent: null },
      BUCKETS,
    );
    expect(kpis.sprintName).toBeNull();
    expect(kpis.sprintCapacityUsedPercent).toBeNull();
  });

  it("distinguishes a 0 % capacity from no sprint at all", () => {
    const kpis = summaryKpis(
      { ...SERVER, sprintName: "Šprint 15", sprintCapacityUsedPercent: 0 },
      BUCKETS,
    );
    expect(kpis.sprintCapacityUsedPercent).toBe(0);
    expect(kpis.sprintName).toBe("Šprint 15");
  });

  it("yields an all-zero strip with no data and no buckets", () => {
    const kpis = summaryKpis(ZERO_KPIS, []);
    expect(kpis.donePointsWindow).toBe(0);
    expect(kpis.donePointsDelta).toBe(0);
    expect(kpis.activeProjects).toBe(0);
    expect(kpis.sprintName).toBeNull();
  });
});
