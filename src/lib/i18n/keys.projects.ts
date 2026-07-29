/**
 * Translation keys for the Projects module (`/projects`, the detail modal, the
 * area filter and the shared project dictionaries).
 *
 * Convention: flat keys, `projects.<thing>`, stable English key names — Slovak +
 * English values. The DB stores the English enum key, the UI shows the Slovak
 * label. A10 merges this file into `lib/i18n/index.ts`.
 */
export interface TranslationEntry {
  sk: string;
  en: string;
}

export type TranslationDict = Record<string, TranslationEntry>;

export const projectsKeys: TranslationDict = {
  // ── page chrome ───────────────────────────────────────────────────────────
  "projects.title": { sk: "Projekty", en: "Projects" },
  "projects.subtitle": {
    sk: "Evidencia projektov pre plánovanie a reporting",
    en: "Project register for planning and reporting",
  },
  "projects.count": { sk: "Počet projektov", en: "Project count" },
  "projects.new": { sk: "Nový projekt", en: "New project" },
  "projects.viewTable": { sk: "Tabuľka", en: "Table" },
  "projects.viewCards": { sk: "Karty", en: "Cards" },
  "projects.empty": {
    sk: "Zatiaľ nemáte žiadny projekt",
    en: "You have no projects yet",
  },
  "projects.emptyDesc": {
    sk: "Vytvorte prvý projekt a začnite plánovať.",
    en: "Create the first project and start planning.",
  },

  // ── fields ────────────────────────────────────────────────────────────────
  "projects.field.code": { sk: "Kód", en: "Code" },
  "projects.field.name": { sk: "Názov", en: "Name" },
  "projects.field.description": { sk: "Popis", en: "Description" },
  "projects.field.area": { sk: "Oblasť", en: "Area" },
  "projects.field.status": { sk: "Stav", en: "Status" },
  "projects.field.health": { sk: "Zdravie", en: "Health" },
  "projects.field.progress": { sk: "Postup", en: "Progress" },
  "projects.field.owner": { sk: "Vlastník", en: "Owner" },
  "projects.field.startDate": { sk: "Začiatok", en: "Start" },
  "projects.field.endDate": { sk: "Koniec", en: "End" },
  "projects.field.priority": { sk: "Priorita", en: "Priority" },
  "projects.field.nextCheckpoint": {
    sk: "Najbližší checkpoint",
    en: "Next checkpoint",
  },
  "projects.field.updatedAt": { sk: "Upravené", en: "Updated" },

  // ── field hints ───────────────────────────────────────────────────────────
  "projects.hint.code": {
    sk: "Unikátny kód projektu, napríklad IT-401.",
    en: "Unique project code, for example IT-401.",
  },
  "projects.hint.area": {
    sk: "Oblasť zoskupuje príbuzné projekty. Stačí ju napísať.",
    en: "The area groups related projects. Just type it.",
  },
  "projects.hint.progressComputed": {
    sk: "Postup sa počíta z dokončených story pointov položiek projektu.",
    en: "Progress is computed from the completed story points of the project's items.",
  },
  "projects.hint.healthManual": {
    sk: "Zdravie nastavuje vlastník projektu. Dáta ho len navrhujú.",
    en: "Health is set by the project owner. The data only suggests a value.",
  },
  "projects.hint.nextCheckpointComputed": {
    sk: "Dopĺňa sa automaticky z najbližšieho nerozhodnutého checkpointu.",
    en: "Filled automatically from the nearest undecided checkpoint.",
  },

  // ── project status dictionary (DB keys → SK/EN labels) ─────────────────────
  "projects.status.on_track": { sk: "Na pláne", en: "On track" },
  "projects.status.at_risk": { sk: "V riziku", en: "At risk" },
  "projects.status.blocked": { sk: "Blokovaný", en: "Blocked" },
  "projects.status.planned": { sk: "Plánovaný", en: "Planned" },

  // ── health dictionary ─────────────────────────────────────────────────────
  "projects.health.green": { sk: "Zelené", en: "Green" },
  "projects.health.amber": { sk: "Žlté", en: "Amber" },
  "projects.health.red": { sk: "Červené", en: "Red" },
  "projects.health.grey": { sk: "Bez dát", en: "No data" },
  "projects.health.suggested": { sk: "Návrh z dát", en: "Suggested by data" },
  "projects.health.useSuggested": { sk: "Použiť návrh", en: "Use the suggestion" },

  // ── priority dictionary ───────────────────────────────────────────────────
  "projects.priority.P1": { sk: "P1 — vysoká", en: "P1 — high" },
  "projects.priority.P2": { sk: "P2 — stredná", en: "P2 — medium" },
  "projects.priority.P3": { sk: "P3 — nízka", en: "P3 — low" },

  // ── filters ───────────────────────────────────────────────────────────────
  "projects.filter.area": { sk: "Oblasť", en: "Area" },
  "projects.filter.status": { sk: "Stav", en: "Status" },
  "projects.filter.priority": { sk: "Priorita", en: "Priority" },
  "projects.filter.health": { sk: "Zdravie", en: "Health" },
  "projects.filter.search": {
    sk: "Hľadať projekt…",
    en: "Search projects…",
  },
  "projects.filter.allAreas": { sk: "Všetky oblasti", en: "All areas" },
  "projects.filter.allStatuses": { sk: "Všetky stavy", en: "All statuses" },
  "projects.filter.allPriorities": { sk: "Všetky priority", en: "All priorities" },
  "projects.filter.allHealth": { sk: "Všetky zdravia", en: "All health values" },

  // ── sorting ───────────────────────────────────────────────────────────────
  "projects.sort.label": { sk: "Zoradenie", en: "Sort" },
  "projects.sort.risk": { sk: "Podľa rizika", en: "By risk" },
  "projects.sort.code": { sk: "Podľa kódu", en: "By code" },
  "projects.sort.name": { sk: "Podľa názvu", en: "By name" },
  "projects.sort.progress": { sk: "Podľa postupu", en: "By progress" },
  "projects.sort.endDate": { sk: "Podľa termínu", en: "By end date" },
  "projects.sort.nextCheckpointDate": {
    sk: "Podľa najbližšieho checkpointu",
    en: "By next checkpoint",
  },
  "projects.sort.updatedAt": { sk: "Podľa poslednej zmeny", en: "By last change" },

  // ── detail modal (4 tabs, spec Q22) ───────────────────────────────────────
  "projects.detail.title": { sk: "Detail projektu", en: "Project detail" },
  "projects.detail.tab.overview": { sk: "Prehľad", en: "Overview" },
  "projects.detail.tab.items": { sk: "Položky", en: "Items" },
  "projects.detail.tab.checkpoints": { sk: "Checkpointy", en: "Checkpoints" },
  "projects.detail.tab.activity": { sk: "Aktivita", en: "Activity" },
  "projects.detail.storyPoints": { sk: "Story pointy", en: "Story points" },
  "projects.detail.storyPointsDone": {
    sk: "Dokončené story pointy",
    en: "Completed story points",
  },
  "projects.detail.itemsTotal": { sk: "Položky celkom", en: "Items total" },
  "projects.detail.itemsOverdue": { sk: "Po termíne", en: "Overdue" },
  "projects.detail.loggedTime": { sk: "Zapísaný čas", en: "Logged time" },
  "projects.detail.checkpointsOpen": {
    sk: "Otvorené checkpointy",
    en: "Open checkpoints",
  },
  "projects.detail.avgReadiness": {
    sk: "Priemerná pripravenosť",
    en: "Average readiness",
  },
  "projects.detail.sprintsActive": { sk: "Aktívne šprinty", en: "Active sprints" },
  "projects.detail.decisions": { sk: "Rozhodnutia", en: "Decisions" },
  "projects.detail.noActivity": {
    sk: "Zatiaľ žiadna aktivita",
    en: "No activity yet",
  },

  // ── create / edit form ────────────────────────────────────────────────────
  "projects.form.createTitle": { sk: "Nový projekt", en: "New project" },
  "projects.form.editTitle": { sk: "Upraviť projekt", en: "Edit project" },
  "projects.form.created": { sk: "Projekt bol vytvorený.", en: "Project created." },
  "projects.form.updated": { sk: "Projekt bol upravený.", en: "Project updated." },

  // ── delete confirmation (spec Q21) ────────────────────────────────────────
  "projects.delete.title": { sk: "Zmazať projekt", en: "Delete project" },
  "projects.delete.warning": {
    sk: "Zmazaním projektu sa nevratne odstránia aj jeho checkpointy, šprinty, položky a worklogy.",
    en: "Deleting the project irreversibly removes its checkpoints, sprints, items and worklogs too.",
  },
  "projects.delete.confirmLabel": {
    sk: "Na potvrdenie napíšte kód projektu",
    en: "Type the project code to confirm",
  },
  "projects.delete.confirmMismatch": {
    sk: "Kód projektu nesúhlasí.",
    en: "The project code does not match.",
  },
  "projects.delete.done": { sk: "Projekt bol zmazaný.", en: "Project deleted." },

  // ── areas ─────────────────────────────────────────────────────────────────
  "areas.title": { sk: "Oblasti", en: "Areas" },
  "areas.empty": {
    sk: "Žiadna oblasť nie je použitá",
    en: "No area is in use",
  },
  "areas.projectCount": { sk: "Počet projektov", en: "Project count" },
  "areas.unassigned": { sk: "Bez oblasti", en: "No area" },
};
