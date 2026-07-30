/**
 * Overview (`/`) — the dashboard that feeds the CEO report (spec Q1–Q6).
 *
 * Flat keys, `overview.*`. Domain dictionaries (status / health / priority /
 * itemType) already live in `keys.common.ts` — never restate them here.
 * A10 merges `overviewKeys` into `KEYS` in `src/lib/i18n/index.ts`.
 */
import type { TranslationEntry } from "./keys.common";

export const overviewKeys: Record<string, TranslationEntry> = {
  "overview.title": { sk: "Prehľad", en: "Overview" },
  "overview.subtitle": {
    sk: "Zdroj čísel pre reporting: stav projektov, blížiace sa checkpointy a aktívne šprinty.",
    en: "The reporting source of truth: project status, upcoming checkpoints and active sprints.",
  },
  "overview.eyebrow": { sk: "Aura Roadmap", en: "Aura Roadmap" },

  // ── KPI strip (exactly six tiles, spec Q1) ────────────────────────────────
  "overview.kpi.activeProjects": { sk: "Aktívne projekty", en: "Active projects" },
  "overview.kpi.activeProjectsSub": {
    sk: "Na pláne, v riziku alebo blokované",
    en: "On track, at risk or blocked",
  },
  "overview.kpi.projectsAtRisk": { sk: "Projekty v riziku", en: "Projects at risk" },
  "overview.kpi.projectsAtRiskSub": {
    sk: "Zdravie kritické alebo pozor",
    en: "Health critical or caution",
  },
  "overview.kpi.openCheckpoints": { sk: "Otvorené checkpointy", en: "Open checkpoints" },
  "overview.kpi.openCheckpointsSub": {
    sk: "Ešte nerozhodnuté",
    en: "Not decided yet",
  },
  "overview.kpi.myDecisions": {
    sk: "Rozhodnutia čakajúce na mňa",
    en: "Decisions waiting on me",
  },
  "overview.kpi.myDecisionsSub": {
    sk: "Som uvedený ako schvaľovateľ",
    en: "You are the listed approver",
  },
  "overview.kpi.sprintCapacity": { sk: "Aktívny šprint", en: "Active sprint" },
  "overview.kpi.noActiveSprint": { sk: "Žiadny aktívny šprint", en: "No active sprint" },
  "overview.kpi.overdueItems": {
    sk: "Položky po termíne",
    en: "Overdue work items",
  },
  "overview.kpi.overdueItemsSub": {
    sk: "Nedokončené s termínom v minulosti",
    en: "Unfinished with a past due date",
  },

  // ── project health block (spec Q2, Q3) ────────────────────────────────────
  "overview.projects.title": { sk: "Zdravie projektov", en: "Project health" },
  "overview.projects.subtitle": {
    sk: "Zoradené podľa zdravia, potom podľa najbližšieho checkpointu.",
    en: "Sorted by health, then by the nearest checkpoint.",
  },
  "overview.projects.empty": { sk: "Zatiaľ žiadne projekty", en: "No projects yet" },
  "overview.projects.emptyDesc": {
    sk: "Prvý projekt vytvoríte v pohľade Projekty.",
    en: "Create the first project in the Projects view.",
  },
  "overview.projects.openAll": { sk: "Všetky projekty", en: "All projects" },
  "overview.projects.col.project": { sk: "Projekt", en: "Project" },
  "overview.projects.col.area": { sk: "Oblasť", en: "Area" },
  "overview.projects.col.health": { sk: "Zdravie", en: "Health" },
  "overview.projects.col.progress": { sk: "Postup", en: "Progress" },
  "overview.projects.col.nextCheckpoint": {
    sk: "Najbližší checkpoint",
    en: "Next checkpoint",
  },
  "overview.projects.col.owner": { sk: "Vlastník", en: "Owner" },

  // ── chart (spec Q4) ───────────────────────────────────────────────────────
  "overview.chart.title": {
    sk: "Dokončené story pointy",
    en: "Completed story points",
  },
  "overview.chart.subtitle": {
    sk: "Posledných 12 týždňov, podľa týždňa dokončenia.",
    en: "The last 12 weeks, by week of completion.",
  },
  "overview.chart.series": { sk: "Dokončené pointy", en: "Completed points" },
  "overview.chart.week": { sk: "Týždeň", en: "Week" },
  "overview.chart.srSummary": {
    sk: "Dokončené story pointy po týždňoch za posledných 12 týždňov.",
    en: "Completed story points per week over the last 12 weeks.",
  },

  // ── recent activity (spec Q5) ─────────────────────────────────────────────
  "overview.activity.title": { sk: "Posledná aktivita", en: "Recent activity" },
  "overview.activity.subtitle": {
    sk: "Posledných 10 zápisov z auditu.",
    en: "The last 10 audit entries.",
  },
  "overview.activity.empty": { sk: "Žiadna aktivita", en: "No activity" },
  "overview.activity.emptyDesc": {
    sk: "Audit sa začne plniť pri prvej zmene.",
    en: "The audit trail fills up with the first change.",
  },
  "overview.activity.forbidden": {
    sk: "Audit vidí len administrátor.",
    en: "Only an administrator can see the audit trail.",
  },

  // ── upcoming checkpoints ──────────────────────────────────────────────────
  "overview.checkpoints.title": {
    sk: "Blížiace sa checkpointy",
    en: "Upcoming checkpoints",
  },
  "overview.checkpoints.subtitle": {
    sk: "Nerozhodnuté, podľa termínu.",
    en: "Undecided, by due date.",
  },
  "overview.checkpoints.empty": {
    sk: "Žiadne otvorené checkpointy",
    en: "No open checkpoints",
  },
  "overview.checkpoints.emptyDesc": {
    sk: "Všetko je rozhodnuté.",
    en: "Everything has been decided.",
  },
  "overview.checkpoints.openQueue": { sk: "Otvoriť frontu", en: "Open the queue" },

  // ── copy summary (spec Q6) ────────────────────────────────────────────────
  "overview.copy.action": { sk: "Kopírovať súhrn", en: "Copy summary" },
  "overview.copy.done": {
    sk: "Súhrn je v schránke.",
    en: "The summary is on the clipboard.",
  },
  "overview.copy.failed": {
    sk: "Súhrn sa nepodarilo skopírovať. Označte text a skopírujte ho ručne.",
    en: "Could not copy the summary. Select the text and copy it manually.",
  },
  "overview.copy.heading": { sk: "Aura Roadmap — súhrn", en: "Aura Roadmap — summary" },
  "overview.copy.sectionKpi": { sk: "Kľúčové čísla", en: "Key numbers" },
  "overview.copy.sectionRisk": { sk: "Projekty v riziku", en: "Projects at risk" },
  "overview.copy.sectionCheckpoints": {
    sk: "Blížiace sa checkpointy",
    en: "Upcoming checkpoints",
  },
  "overview.copy.none": { sk: "žiadne", en: "none" },
};
