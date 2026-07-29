// The "Kopírovať súhrn" text (spec Q6).
//
// Deliberately a PURE function over already-fetched data: no fetch, no clipboard,
// no React. That is what makes the exact wording and every number's formatting
// testable (see summary.test.ts) — a CEO report that quietly renders "1234" or an
// unsigned delta is a correctness bug, not a cosmetic one.
//
// FORMATTING CONTRACT (spec Q46):
//   * numbers through `Intl.NumberFormat("sk-SK")` → non-breaking space in
//     thousands, decimal comma
//   * `%` separated from its number by a non-breaking space
//   * deltas ALWAYS signed
//   * dates as `28. 7. 2026`, never an ISO string
//
// Output is plain text with blank-line separated sections: it has to survive a
// paste into an e-mail, a Slack message and a Word document unchanged. No
// Markdown, no tabs, no box drawing.

import {
  EM_DASH,
  NBSP,
  fmtDate,
  fmtDateTime,
  fmtInt,
  fmtPercent,
  fmtSigned,
} from "@/lib/client/format";
import type { ProjectHealth } from "@/lib/domain/contracts/projects";
import type { CheckpointLifecycle } from "@/lib/domain/contracts/checkpoints";

/** The six KPI tiles, exactly as the strip shows them. */
export interface SummaryKpis {
  activeProjects: number;
  projectsAtRisk: number;
  openCheckpoints: number;
  /** Checkpoints where the caller is the approver and nothing is decided yet. */
  myDecisions: number;
  /** null when no sprint is active. */
  sprintName: string | null;
  /** 0–100, or null without an active sprint. */
  sprintCapacityUsedPercent: number | null;
  overdueItems: number;
  /** Sum of the 12-week chart. */
  donePointsWindow: number;
  /** Last week minus the week before — the only delta in the summary. */
  donePointsDelta: number;
}

export interface SummaryProject {
  code: string;
  name: string;
  health: ProjectHealth;
  /** 0–100. */
  progress: number;
  nextCheckpoint: string | null;
  /** `YYYY-MM-DD`. */
  nextCheckpointDate: string | null;
  owner: string;
}

export interface SummaryCheckpoint {
  projectCode: string;
  name: string;
  /** `YYYY-MM-DD`. */
  dueDate: string;
  /** 0–100. */
  readiness: number;
  lifecycle: CheckpointLifecycle;
  approverName: string | null;
}

export interface SummaryInput {
  /** ISO instant the summary was produced at. */
  generatedAt: string;
  kpis: SummaryKpis;
  /** Already sorted risk-first by the caller; the builder does not re-sort. */
  atRisk: ReadonlyArray<SummaryProject>;
  /** Already sorted by due date. */
  checkpoints: ReadonlyArray<SummaryCheckpoint>;
}

/**
 * Every word the summary needs. Defaulted to Slovak because the CEO report is
 * Slovak; an EN caller passes the translated set instead of forking the builder.
 */
export interface SummaryLabels {
  heading: string;
  sectionKpi: string;
  sectionRisk: string;
  sectionCheckpoints: string;
  none: string;
  activeProjects: string;
  projectsAtRisk: string;
  openCheckpoints: string;
  myDecisions: string;
  activeSprint: string;
  noActiveSprint: string;
  capacityUsed: string;
  overdueItems: string;
  donePoints: string;
  weekOverWeek: string;
  progress: string;
  nextCheckpoint: string;
  owner: string;
  readiness: string;
  approver: string;
  health: Readonly<Record<ProjectHealth, string>>;
  lifecycle: Readonly<Record<CheckpointLifecycle, string>>;
}

export const SK_SUMMARY_LABELS: SummaryLabels = {
  heading: "Aura Roadmap — súhrn",
  sectionKpi: "KĽÚČOVÉ ČÍSLA",
  sectionRisk: "PROJEKTY V RIZIKU",
  sectionCheckpoints: "BLÍŽIACE SA CHECKPOINTY",
  none: "žiadne",
  activeProjects: "Aktívne projekty",
  projectsAtRisk: "Projekty v riziku",
  openCheckpoints: "Otvorené checkpointy",
  myDecisions: "Rozhodnutia čakajúce na mňa",
  activeSprint: "Aktívny šprint",
  noActiveSprint: "žiadny aktívny šprint",
  capacityUsed: "kapacita",
  overdueItems: "Položky po termíne",
  donePoints: "Dokončené story pointy (12 týždňov)",
  weekOverWeek: "oproti predchádzajúcemu týždňu",
  progress: "postup",
  nextCheckpoint: "najbližší checkpoint",
  owner: "vlastník",
  readiness: "pripravenosť",
  approver: "schvaľovateľ",
  health: {
    green: "Zdravý",
    amber: "Pozor",
    red: "Kritický",
    grey: "Bez dát",
  },
  lifecycle: {
    planned: "Plánovaný",
    ready: "Pripravený",
    decided: "Rozhodnutý",
    blocked: "Blokovaný",
  },
};

/** One bullet. A single glyph everywhere so the paste target cannot reflow it. */
const BULLET = "- ";

function line(label: string, value: string): string {
  return `${BULLET}${label}: ${value}`;
}

function sprintLine(kpis: SummaryKpis, labels: SummaryLabels): string {
  if (!kpis.sprintName || kpis.sprintCapacityUsedPercent === null) {
    return line(labels.activeSprint, labels.noActiveSprint);
  }
  return line(
    labels.activeSprint,
    `${kpis.sprintName} ${EM_DASH} ${labels.capacityUsed} ${fmtPercent(kpis.sprintCapacityUsedPercent)}`,
  );
}

function pointsLine(kpis: SummaryKpis, labels: SummaryLabels): string {
  const delta = `${fmtSigned(kpis.donePointsDelta)}${NBSP}${labels.weekOverWeek}`;
  return line(labels.donePoints, `${fmtInt(kpis.donePointsWindow)} (${delta})`);
}

function projectLine(p: SummaryProject, labels: SummaryLabels): string {
  const parts = [
    labels.health[p.health],
    `${labels.progress} ${fmtPercent(p.progress)}`,
  ];
  if (p.nextCheckpoint) {
    const when = p.nextCheckpointDate ? ` (${fmtDate(p.nextCheckpointDate)})` : "";
    parts.push(`${labels.nextCheckpoint} ${p.nextCheckpoint}${when}`);
  }
  if (p.owner) parts.push(`${labels.owner} ${p.owner}`);
  return `${BULLET}${p.code} ${p.name} ${EM_DASH} ${parts.join(", ")}`;
}

function checkpointLine(c: SummaryCheckpoint, labels: SummaryLabels): string {
  const parts = [
    `${labels.readiness} ${fmtPercent(c.readiness)}`,
    labels.lifecycle[c.lifecycle],
  ];
  if (c.approverName) parts.push(`${labels.approver} ${c.approverName}`);
  return `${BULLET}${fmtDate(c.dueDate)} ${EM_DASH} ${c.projectCode} ${c.name}, ${parts.join(", ")}`;
}

function section(
  title: string,
  rows: ReadonlyArray<string>,
  emptyLabel: string,
): string {
  const body = rows.length > 0 ? rows.join("\n") : `${BULLET}${emptyLabel}`;
  return `${title}\n${body}`;
}

/**
 * Compose the clipboard summary. Newline-joined sections, `\n` only (a `\r\n`
 * would double-space in some editors and the clipboard normalises it anyway).
 */
export function buildSummary(
  input: SummaryInput,
  labels: SummaryLabels = SK_SUMMARY_LABELS,
): string {
  const { kpis } = input;

  const head = `${labels.heading} ${EM_DASH} ${fmtDateTime(input.generatedAt)}`;

  const kpiRows = [
    line(labels.activeProjects, fmtInt(kpis.activeProjects)),
    line(labels.projectsAtRisk, fmtInt(kpis.projectsAtRisk)),
    line(labels.openCheckpoints, fmtInt(kpis.openCheckpoints)),
    line(labels.myDecisions, fmtInt(kpis.myDecisions)),
    sprintLine(kpis, labels),
    line(labels.overdueItems, fmtInt(kpis.overdueItems)),
    pointsLine(kpis, labels),
  ];

  return [
    head,
    "",
    section(labels.sectionKpi, kpiRows, labels.none),
    "",
    section(
      labels.sectionRisk,
      input.atRisk.map((p) => projectLine(p, labels)),
      labels.none,
    ),
    "",
    section(
      labels.sectionCheckpoints,
      input.checkpoints.map((c) => checkpointLine(c, labels)),
      labels.none,
    ),
    "",
  ].join("\n");
}

/**
 * Put `text` on the clipboard. Returns false when the browser refuses (no
 * permission, insecure context) so the caller can show the manual-copy toast
 * instead of pretending it worked.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    const nav = globalThis.navigator as Navigator | undefined;
    if (!nav?.clipboard?.writeText) return false;
    await nav.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
