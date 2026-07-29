import { describe, expect, it } from "vitest";
import { buildSummary, SK_SUMMARY_LABELS } from "./summary";
import type { SummaryInput } from "./summary";
import { NBSP } from "@/lib/client/format";

// The clipboard summary is the CEO-report path, so its formatting is a contract:
// sk-SK grouping with a NON-BREAKING space, `%` separated by a non-breaking
// space, and deltas that always carry a sign. These tests exist because a plain
// `${n}` interpolation looks identical in review and breaks all three.

const BASE: SummaryInput = {
  generatedAt: "2026-07-28T12:05:00.000Z",
  kpis: {
    activeProjects: 12,
    projectsAtRisk: 3,
    openCheckpoints: 7,
    myDecisions: 2,
    sprintName: "Šprint 14",
    sprintCapacityUsedPercent: 87,
    overdueItems: 5,
    donePointsWindow: 1234,
    donePointsDelta: 18,
  },
  atRisk: [
    {
      code: "IT-401",
      name: "Platforma",
      health: "red",
      progress: 42,
      nextCheckpoint: "Bezpečnostná revízia",
      nextCheckpointDate: "2026-08-12",
      owner: "Jana Kováčová",
    },
  ],
  checkpoints: [
    {
      projectCode: "IT-401",
      name: "Bezpečnostná revízia",
      dueDate: "2026-08-12",
      readiness: 60,
      lifecycle: "ready",
      approverName: "Peter Novák",
    },
  ],
};

function withKpis(patch: Partial<SummaryInput["kpis"]>): SummaryInput {
  return { ...BASE, kpis: { ...BASE.kpis, ...patch } };
}

describe("buildSummary — sk-SK number formatting", () => {
  it("groups thousands with a non-breaking space, never a plain space", () => {
    const text = buildSummary(BASE);
    expect(text).toContain(`1${NBSP}234`);
    expect(text).not.toContain("1 234"); // plain U+0020 would break the line
    expect(NBSP).toBe(" ");
  });

  it("separates % from its number with a non-breaking space", () => {
    const text = buildSummary(BASE);
    expect(text).toContain(`87${NBSP}%`);
    expect(text).toContain(`42${NBSP}%`);
    expect(text).toContain(`60${NBSP}%`);
    expect(text).not.toMatch(/\d %/); // no plain-space percent anywhere
  });

  it("renders dates as sk-SK calendar days, never as ISO strings", () => {
    const text = buildSummary(BASE);
    expect(text).toContain("12. 8. 2026");
    expect(text).not.toContain("2026-08-12");
  });

  it("keeps a calendar day on its day (no timezone shift to the 11th)", () => {
    const text = buildSummary({
      ...BASE,
      checkpoints: [{ ...BASE.checkpoints[0], dueDate: "2026-01-01" }],
    });
    expect(text).toContain("1. 1. 2026");
    expect(text).not.toContain("31. 12. 2025");
  });
});

describe("buildSummary — deltas always carry a sign", () => {
  it("prefixes a positive delta with +", () => {
    expect(buildSummary(withKpis({ donePointsDelta: 18 }))).toContain("+18");
  });

  it("prefixes a negative delta with - and no double sign", () => {
    const text = buildSummary(withKpis({ donePointsDelta: -7 }));
    expect(text).toContain("-7");
    expect(text).not.toContain("--7");
  });

  it("renders a zero delta as a bare 0, never as +0", () => {
    const text = buildSummary(withKpis({ donePointsDelta: 0 }));
    expect(text).toMatch(/\(0 oproti/);
    expect(text).not.toContain("+0");
  });

  it("groups a large delta the same way as any other number", () => {
    expect(buildSummary(withKpis({ donePointsDelta: -1234 }))).toContain(
      `-1${NBSP}234`,
    );
  });
});

describe("buildSummary — structure", () => {
  it("carries all three sections and the generated-at heading", () => {
    const text = buildSummary(BASE);
    expect(text).toContain(SK_SUMMARY_LABELS.heading);
    expect(text).toContain(SK_SUMMARY_LABELS.sectionKpi);
    expect(text).toContain(SK_SUMMARY_LABELS.sectionRisk);
    expect(text).toContain(SK_SUMMARY_LABELS.sectionCheckpoints);
  });

  it("lists exactly the six KPI tiles plus the points line", () => {
    const kpiBlock = buildSummary(BASE)
      .split(SK_SUMMARY_LABELS.sectionKpi)[1]
      .split(SK_SUMMARY_LABELS.sectionRisk)[0];
    const bullets = kpiBlock.split("\n").filter((l) => l.startsWith("- "));
    expect(bullets).toHaveLength(7);
  });

  it("says „žiadny aktívny šprint“ instead of 0 % when no sprint runs", () => {
    const text = buildSummary(
      withKpis({ sprintName: null, sprintCapacityUsedPercent: null }),
    );
    expect(text).toContain(SK_SUMMARY_LABELS.noActiveSprint);
    expect(text).not.toContain(`0${NBSP}% `);
  });

  it("prints „žiadne“ for an empty risk list rather than an empty section", () => {
    const text = buildSummary({ ...BASE, atRisk: [], checkpoints: [] });
    const risk = text
      .split(SK_SUMMARY_LABELS.sectionRisk)[1]
      .split(SK_SUMMARY_LABELS.sectionCheckpoints)[0];
    expect(risk).toContain(SK_SUMMARY_LABELS.none);
  });

  it("preserves the caller's order (the builder never re-sorts)", () => {
    const text = buildSummary({
      ...BASE,
      atRisk: [
        { ...BASE.atRisk[0], code: "B-2", health: "amber" },
        { ...BASE.atRisk[0], code: "A-1", health: "red" },
      ],
    });
    expect(text.indexOf("B-2")).toBeLessThan(text.indexOf("A-1"));
  });

  it("uses the Slovak health and lifecycle labels, not the DB keys", () => {
    const text = buildSummary(BASE);
    expect(text).toContain("Kritický");
    expect(text).toContain("Pripravený");
    expect(text).not.toContain("red,");
    expect(text).not.toContain("ready,");
  });

  it("is plain text: no markdown, no tabs, no CRLF", () => {
    const text = buildSummary(BASE);
    expect(text).not.toMatch(/[*_#|]/);
    expect(text).not.toContain("\t");
    expect(text).not.toContain("\r");
  });

  it("omits the checkpoint clause for a project that has none", () => {
    const text = buildSummary({
      ...BASE,
      atRisk: [
        {
          ...BASE.atRisk[0],
          nextCheckpoint: null,
          nextCheckpointDate: null,
        },
      ],
    });
    expect(text).not.toContain(SK_SUMMARY_LABELS.nextCheckpoint);
  });
});
