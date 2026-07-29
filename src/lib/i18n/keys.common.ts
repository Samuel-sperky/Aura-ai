/**
 * Shared translation keys: navigation, actions, system states, domain
 * dictionaries and role labels. Module-specific keys live in their own
 * `keys.<module>.ts` file; the i18n agent composes them all in `index.ts`.
 *
 * Convention: flat keys, `<module>.<thing>`, English keys — Slovak + English
 * values. DB stores the English enum key, the UI shows the Slovak label.
 */
export interface TranslationEntry {
  sk: string;
  en: string;
}

export type TranslationDict = Record<string, TranslationEntry>;

export const commonKeys: TranslationDict = {
  // ── app + navigation (exactly six routes) ─────────────────────────────────
  "app.name": { sk: "Aura Roadmap", en: "Aura Roadmap" },
  "app.skipToContent": { sk: "Preskočiť na obsah", en: "Skip to content" },
  "nav.label": { sk: "Hlavná navigácia", en: "Main navigation" },
  "nav.open": { sk: "Otvoriť navigáciu", en: "Open navigation" },
  "nav.close": { sk: "Zavrieť navigáciu", en: "Close navigation" },
  "nav.overview": { sk: "Prehľad", en: "Overview" },
  "nav.timeline": { sk: "Timeline", en: "Timeline" },
  "nav.projects": { sk: "Projekty", en: "Projects" },
  "nav.workItems": { sk: "Úlohy", en: "Work items" },
  "nav.decisions": { sk: "Rozhodnutia", en: "Decisions" },
  "nav.settings": { sk: "Nastavenia", en: "Settings" },

  // ── actions ───────────────────────────────────────────────────────────────
  "action.save": { sk: "Uložiť", en: "Save" },
  "action.cancel": { sk: "Zrušiť", en: "Cancel" },
  "action.close": { sk: "Zavrieť", en: "Close" },
  "action.confirm": { sk: "Potvrdiť", en: "Confirm" },
  "action.delete": { sk: "Zmazať", en: "Delete" },
  "action.edit": { sk: "Upraviť", en: "Edit" },
  "action.create": { sk: "Vytvoriť", en: "Create" },
  "action.retry": { sk: "Skúsiť znova", en: "Try again" },
  "action.search": { sk: "Hľadať…", en: "Search…" },
  "action.filters": { sk: "Filtre", en: "Filters" },
  "action.resetFilters": { sk: "Zrušiť filtre", en: "Clear filters" },
  "action.copyLink": { sk: "Skopírovať odkaz", en: "Copy link" },
  "action.copySummary": { sk: "Kopírovať súhrn", en: "Copy summary" },
  "action.move": { sk: "Presunúť", en: "Move" },
  "action.more": { sk: "Viac", en: "More" },

  // ── system states ─────────────────────────────────────────────────────────
  "state.loading": { sk: "Načítavam…", en: "Loading…" },
  "state.emptyTitle": { sk: "Zatiaľ tu nič nie je", en: "Nothing here yet" },
  "state.noResultsTitle": {
    sk: "Nenašli sa žiadne výsledky",
    en: "No results found",
  },
  "state.noResultsDesc": {
    sk: "Upravte filtre alebo hľadaný výraz.",
    en: "Adjust the filters or the search term.",
  },
  "state.errorTitle": {
    sk: "Údaje sa nepodarilo načítať",
    en: "Could not load the data",
  },
  "state.errorDesc": {
    sk: "Skúste to prosím znova. Ak problém trvá, ozvite sa správcovi.",
    en: "Please try again. If it persists, contact your administrator.",
  },
  "state.forbiddenTitle": { sk: "Nemáte prístup", en: "No access" },
  "state.forbiddenDesc": {
    sk: "Na túto časť aplikácie nemáte oprávnenie. Ak ho potrebujete, požiadajte správcu.",
    en: "You do not have permission for this section. Ask an administrator if you need it.",
  },
  "state.backHome": { sk: "Späť na prehľad", en: "Back to overview" },
  "state.noChartData": {
    sk: "Žiadne dáta za zvolené obdobie",
    en: "No data for the selected period",
  },

  // ── appearance (Nastavenia → Vzhľad) ──────────────────────────────────────
  "appearance.theme": { sk: "Téma", en: "Theme" },
  "appearance.themeLight": { sk: "Svetlá téma", en: "Light theme" },
  "appearance.themeDark": { sk: "Tmavá téma", en: "Dark theme" },
  "appearance.themeSystem": { sk: "Podľa systému", en: "Follow system" },
  "appearance.density": { sk: "Hustota zobrazenia", en: "Display density" },
  "appearance.densityCozy": { sk: "Pohodlná", en: "Cozy" },
  "appearance.densityCompact": { sk: "Kompaktná", en: "Compact" },
  "appearance.language": { sk: "Jazyk", en: "Language" },

  // ── roles ─────────────────────────────────────────────────────────────────
  "role.admin": { sk: "Admin", en: "Admin" },
  "role.editor": { sk: "Editor", en: "Editor" },
  "role.viewer": { sk: "Prehliadač", en: "Viewer" },

  // ── domain: work-item status (DB keys stay English) ───────────────────────
  "status.backlog": { sk: "Backlog", en: "Backlog" },
  "status.in_progress": { sk: "Prebieha", en: "In progress" },
  "status.waiting": { sk: "Čaká", en: "Waiting" },
  "status.done": { sk: "Hotovo", en: "Done" },

  // ── domain: work-item type ────────────────────────────────────────────────
  "itemType.task": { sk: "Úloha", en: "Task" },
  "itemType.bug": { sk: "Chyba", en: "Bug" },
  "itemType.idea": { sk: "Nápad", en: "Idea" },

  // ── domain: checkpoint type + lifecycle ───────────────────────────────────
  "checkpointType.review": { sk: "Revízia", en: "Review" },
  "checkpointType.decision": { sk: "Rozhodnutie", en: "Decision" },
  "checkpointType.delivery": { sk: "Dodanie", en: "Delivery" },
  "checkpointType.gate": { sk: "Gate", en: "Gate" },
  "checkpointState.planned": { sk: "Plánovaný", en: "Planned" },
  "checkpointState.ready": { sk: "Pripravený", en: "Ready" },
  "checkpointState.decided": { sk: "Rozhodnutý", en: "Decided" },
  "checkpointState.blocked": { sk: "Blokovaný", en: "Blocked" },

  // ── domain: decision outcome ──────────────────────────────────────────────
  "outcome.go": { sk: "Ide sa", en: "Go" },
  "outcome.conditional_go": { sk: "Podmienene ide", en: "Conditional go" },
  "outcome.no_go": { sk: "Neide sa", en: "No go" },
  "outcome.deferred": { sk: "Odložené", en: "Deferred" },

  // ── domain: project status + health + priority ────────────────────────────
  "projectStatus.on_track": { sk: "Na pláne", en: "On track" },
  "projectStatus.at_risk": { sk: "V riziku", en: "At risk" },
  "projectStatus.blocked": { sk: "Blokovaný", en: "Blocked" },
  "projectStatus.planned": { sk: "Plánovaný", en: "Planned" },
  "health.green": { sk: "Zdravý", en: "Healthy" },
  "health.amber": { sk: "Pozor", en: "Caution" },
  "health.red": { sk: "Kritický", en: "Critical" },
  "health.grey": { sk: "Bez dát", en: "No data" },
  "priority.P1": { sk: "P1", en: "P1" },
  "priority.P2": { sk: "P2", en: "P2" },
  "priority.P3": { sk: "P3", en: "P3" },

  // ── pagination + misc ─────────────────────────────────────────────────────
  "pagination.label": { sk: "Stránkovanie", en: "Pagination" },
  "pagination.perPage": { sk: "Na stránku", en: "Per page" },
  "pagination.none": { sk: "Žiadne záznamy", en: "No records" },
  "pagination.prev": { sk: "Predchádzajúca stránka", en: "Previous page" },
  "pagination.next": { sk: "Ďalšia stránka", en: "Next page" },
  "common.unassigned": { sk: "Nepriradené", en: "Unassigned" },
  "common.noValue": { sk: "—", en: "—" },
  "common.all": { sk: "Všetko", en: "All" },
  "common.today": { sk: "Dnes", en: "Today" },
};
