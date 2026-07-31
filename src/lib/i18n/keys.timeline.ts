/**
 * Translation keys for the Timeline pillar: the three modes, the three zooms,
 * the sprint planner, the per-person capacity panel and the checkpoint modal
 * rendered inside Timeline.
 *
 * A10 merges `timelineKeys` into `KEYS` in `src/lib/i18n/index.ts`.
 *
 * Vocabularies already living in `keys.common.ts` are NOT repeated here:
 *   status.* · itemType.* · priority.* · checkpointType.* · checkpointState.* ·
 *   outcome.* · role.* · common.unassigned · common.today
 * Sprint lifecycle labels belong to A5's `keys.sprints.ts` (`sprintStatus.*`).
 */
import type { TranslationDict } from "./keys.common";

export const timelineKeys: TranslationDict = {
  // ── page ──────────────────────────────────────────────────────────────────
  "timeline.title": { sk: "Timeline", en: "Timeline" },
  "timeline.eyebrow": { sk: "Plánovanie", en: "Planning" },
  "timeline.description": {
    sk: "Jeden plán projektov, šprintov a rozhodnutí. Filtre zostávajú v adrese.",
    en: "One plan of projects, sprints and decisions. Filters stay in the URL.",
  },

  // ── modes (spec Q7–Q9) ────────────────────────────────────────────────────
  "timeline.mode.label": { sk: "Režim timeline", en: "Timeline mode" },
  "timeline.mode.roadmap": { sk: "Roadmap", en: "Roadmap" },
  "timeline.mode.sprints": { sk: "Šprinty", en: "Sprints" },
  "timeline.mode.decisions": { sk: "Rozhodnutia", en: "Decisions" },

  // ── zooms ─────────────────────────────────────────────────────────────────
  "timeline.zoom.label": { sk: "Priblíženie", en: "Zoom" },
  "timeline.zoom.quarter": { sk: "Kvartál", en: "Quarter" },
  "timeline.zoom.month": { sk: "Mesiac", en: "Month" },
  "timeline.zoom.week": { sk: "Týždeň", en: "Week" },

  // ── axis ──────────────────────────────────────────────────────────────────
  "timeline.axis.label": { sk: "Časová os", en: "Time axis" },
  "timeline.today": { sk: "Dnes", en: "Today" },
  "timeline.horizon": { sk: "Horizont", en: "Horizon" },
  // The roadmap horizon depends on the zoom (8 quarters / 12 months / 12 weeks),
  // so the axis hint is composed from the drawn column count — never stated as a
  // constant. `{n}` is the count; the suffix is the Slovak plural bucket
  // (1 / 2–4 / 5+), which English collapses into singular + plural.
  "timeline.horizonUnits.quarter.one": { sk: "{n} kvartál", en: "{n} quarter" },
  "timeline.horizonUnits.quarter.few": { sk: "{n} kvartály", en: "{n} quarters" },
  "timeline.horizonUnits.quarter.many": { sk: "{n} kvartálov", en: "{n} quarters" },
  "timeline.horizonUnits.month.one": { sk: "{n} mesiac", en: "{n} month" },
  "timeline.horizonUnits.month.few": { sk: "{n} mesiace", en: "{n} months" },
  "timeline.horizonUnits.month.many": { sk: "{n} mesiacov", en: "{n} months" },
  "timeline.horizonUnits.week.one": { sk: "{n} týždeň", en: "{n} week" },
  "timeline.horizonUnits.week.few": { sk: "{n} týždne", en: "{n} weeks" },
  "timeline.horizonUnits.week.many": { sk: "{n} týždňov", en: "{n} weeks" },
  "timeline.horizonSprints": { sk: "12 týždňov", en: "12 weeks" },
  "timeline.timezone": { sk: "Europe/Bratislava", en: "Europe/Bratislava" },
  "timeline.clippedStart": {
    sk: "Začína pred horizontom",
    en: "Starts before the horizon",
  },
  "timeline.clippedEnd": {
    sk: "Pokračuje za horizontom",
    en: "Continues past the horizon",
  },
  "timeline.phase.past": { sk: "Po termíne", en: "Past due" },
  "timeline.phase.today": { sk: "Dnes", en: "Today" },
  "timeline.phase.future": { sk: "Pred nami", en: "Upcoming" },

  // ── roadmap mode ──────────────────────────────────────────────────────────
  "timeline.roadmap.rowsLabel": { sk: "Projekty podľa oblasti", en: "Projects by area" },
  "timeline.roadmap.noDates": {
    sk: "Projekt nemá zadané dátumy",
    en: "The project has no dates",
  },
  "timeline.roadmap.emptyTitle": { sk: "Žiadne projekty", en: "No projects" },
  "timeline.roadmap.emptyDesc": {
    sk: "Vytvorte projekt so začiatkom a koncom a zobrazí sa na časovej osi.",
    en: "Create a project with a start and an end and it will appear on the axis.",
  },
  "timeline.roadmap.legendProject": { sk: "Trvanie projektu", en: "Project duration" },
  "timeline.roadmap.legendSprint": { sk: "Šprint", en: "Sprint" },
  "timeline.roadmap.legendCheckpoint": { sk: "Checkpoint", en: "Checkpoint" },
  "timeline.roadmap.legendDecided": { sk: "Rozhodnutý", en: "Decided" },
  "timeline.roadmap.progress": { sk: "Hotovo", en: "Done" },
  "timeline.roadmap.checkpointCount": { sk: "Checkpointy", en: "Checkpoints" },
  "timeline.roadmap.sprintCount": { sk: "Šprinty", en: "Sprints" },

  // Vertical roadmap: collapsing an area, the undated tail, the warning marker and
  // the jump back to the "Dnes" rule.
  "timeline.roadmap.collapseArea": { sk: "Zbaliť oblasť", en: "Collapse area" },
  "timeline.roadmap.expandArea": { sk: "Rozbaliť oblasť", en: "Expand area" },
  "timeline.roadmap.areaSummary": { sk: "Súhrn oblasti", en: "Area summary" },
  "timeline.roadmap.projectsCount": { sk: "projektov", en: "projects" },
  "timeline.roadmap.undated": { sk: "Bez termínu", en: "No dates" },
  "timeline.roadmap.checkpointOutside": {
    sk: "mimo trvania projektu",
    en: "outside the project duration",
  },
  "timeline.roadmap.jumpToday": { sk: "Skočiť na dnes", en: "Jump to today" },

  // ── sprints mode ──────────────────────────────────────────────────────────
  "timeline.sprints.lanesLabel": { sk: "Šprinty na osi", en: "Sprints on the axis" },
  "timeline.sprints.emptyTitle": { sk: "Žiadne šprinty", en: "No sprints" },
  "timeline.sprints.emptyDesc": {
    sk: "V najbližších 12 týždňoch nie je naplánovaný žiadny šprint.",
    en: "No sprint is planned in the next 12 weeks.",
  },
  "timeline.sprints.selectHint": {
    sk: "Vyberte šprint na osi a naplánujte jeho obsah nižšie.",
    en: "Pick a sprint on the axis and plan its contents below.",
  },
  "timeline.sprints.itemsInSprint": { sk: "Položky v šprinte", en: "Items in the sprint" },

  // ── planner ───────────────────────────────────────────────────────────────
  "planner.title": { sk: "Plánovanie šprintu", en: "Sprint planning" },
  "planner.backlog": { sk: "Backlog", en: "Backlog" },
  "planner.backlogHint": {
    sk: "Položky bez šprintu, v ručnom poradí.",
    en: "Items with no sprint, in manual order.",
  },
  "planner.dropHere": { sk: "Presuňte položku sem", en: "Drop an item here" },
  "planner.points": { sk: "b", en: "pts" },
  "planner.pointsLong": { sk: "story pointy", en: "story points" },
  "planner.commitedOfCapacity": { sk: "z kapacity", en: "of capacity" },
  "planner.scopeChange": { sk: "Zmena rozsahu", en: "Scope change" },
  "planner.goalRequired": {
    sk: "Pred uzamknutím rozsahu zadajte cieľ šprintu.",
    en: "Set the sprint goal before locking the scope.",
  },
  "planner.goalMissing": { sk: "Bez cieľa", en: "No goal" },
  "planner.dragDisabled": {
    sk: "Presúvanie myšou je na mobile vypnuté — použite tlačidlo Presunúť.",
    en: "Dragging is off on mobile — use the Move button.",
  },
  "planner.keyboardHint": {
    sk: "Klávesnica: M presunie položku, šípky ↑ a ↓ menia poradie.",
    en: "Keyboard: M moves an item, ↑ and ↓ change the order.",
  },
  "planner.dragHandle": { sk: "Uchopiť a presunúť", en: "Grab and move" },
  "planner.moved": { sk: "Položka bola presunutá.", en: "The item was moved." },
  "planner.movedToBacklog": {
    sk: "Položka sa vrátila do backlogu.",
    en: "The item went back to the backlog.",
  },
  "planner.reordered": { sk: "Poradie bolo upravené.", en: "The order was updated." },
  "planner.emptyItemsTitle": { sk: "Žiadne položky", en: "No items" },
  "planner.emptyItemsDesc": {
    sk: "Do tohto šprintu ešte nebola priradená žiadna položka.",
    en: "No item has been assigned to this sprint yet.",
  },

  // ── move dialog (spec Q13 — the keyboard alternative to drag & drop) ──────
  "planner.move.title": { sk: "Presunúť položku", en: "Move item" },
  "planner.move.target": { sk: "Cieľový šprint", en: "Target sprint" },
  "planner.move.toBacklog": { sk: "Backlog (bez šprintu)", en: "Backlog (no sprint)" },
  "planner.move.confirm": { sk: "Presunúť", en: "Move" },
  "planner.move.shortcut": { sk: "Skratka M", en: "Shortcut M" },

  // ── sprint lifecycle actions ──────────────────────────────────────────────
  "planner.action.commit": { sk: "Uzamknúť rozsah", en: "Commit" },
  "planner.action.start": { sk: "Spustiť", en: "Start" },
  "planner.action.review": { sk: "Do revízie", en: "Review" },
  "planner.action.close": { sk: "Uzavrieť", en: "Close" },
  "planner.action.cancel": { sk: "Zrušiť šprint", en: "Cancel sprint" },
  "planner.action.carryOver": { sk: "Preniesť zvyšok", en: "Carry over" },
  "planner.action.done": { sk: "Akcia bola vykonaná.", en: "The action was applied." },
  "planner.confirm.commit": {
    sk: "Uzamknutím rozsahu sa zafixuje záväzok šprintu. Pokračovať?",
    en: "Committing freezes the sprint's scope. Continue?",
  },
  "planner.confirm.close": {
    sk: "Uzavretím šprintu sa zapíše dosiahnutý výsledok. Pokračovať?",
    en: "Closing the sprint records its result. Continue?",
  },
  "planner.confirm.cancel": {
    sk: "Zrušený šprint sa už nedá znovu otvoriť. Pokračovať?",
    en: "A cancelled sprint cannot be reopened. Continue?",
  },
  "planner.confirm.carryOver": {
    sk: "Nedokončené položky sa vrátia do backlogu a bude ich možné naplánovať znova. Pokračovať?",
    en: "Unfinished items go back to the backlog and can be planned again. Continue?",
  },

  // ── capacity panel (per PERSON — there are no teams) ──────────────────────
  "capacity.title": { sk: "Kapacita osôb", en: "Capacity per person" },
  "capacity.subtitle": {
    sk: "Kapacita šprintu rozdelená medzi ľudí, ktorí v ňom majú položky.",
    en: "The sprint capacity split across the people who have items in it.",
  },
  "capacity.person": { sk: "Osoba", en: "Person" },
  "capacity.items": { sk: "Položky", en: "Items" },
  "capacity.committed": { sk: "Záväzok", en: "Committed" },
  "capacity.completed": { sk: "Hotovo", en: "Done" },
  "capacity.capacity": { sk: "Kapacita", en: "Capacity" },
  "capacity.load": { sk: "Vyťaženie", en: "Load" },
  "capacity.overloaded": { sk: "Nad kapacitou", en: "Over capacity" },
  "capacity.emptyTitle": { sk: "Žiadne vyťaženie", en: "No load" },
  "capacity.emptyDesc": {
    sk: "V šprinte nie sú položky, z ktorých by sa vyťaženie počítalo.",
    en: "The sprint has no items to compute a load from.",
  },

  // ── decision queue inside Timeline ────────────────────────────────────────
  "timeline.queue.title": { sk: "Rozhodovacia fronta", en: "Decision queue" },
  "timeline.queue.subtitle": {
    sk: "Checkpointy čakajúce na rozhodnutie na časovej osi. Nad linkou „Dnes“ je to, čo je po termíne.",
    en: "Checkpoints awaiting a decision on the time axis. Everything above the “Today” rule is past due.",
  },
  /** Accessible name of the month axis itself (the list of month sections). */
  "timeline.queue.axisLabel": {
    sk: "Rozhodnutia na časovej osi",
    en: "Decisions on the time axis",
  },
  "timeline.queue.full": {
    sk: "Otvoriť plný pohľad Rozhodnutia",
    en: "Open the full Decisions view",
  },
  "timeline.queue.ready": { sk: "Pripravené", en: "Ready" },
  "timeline.queue.blocked": { sk: "Blokované", en: "Blocked" },
  "timeline.queue.overdue": { sk: "Po termíne", en: "Overdue" },
  "timeline.queue.emptyTitle": { sk: "Fronta je prázdna", en: "The queue is empty" },
  "timeline.queue.emptyDesc": {
    sk: "Žiadny checkpoint nečaká na rozhodnutie.",
    en: "No checkpoint is waiting for a decision.",
  },
  "timeline.queue.mineOnly": { sk: "Čaká na mňa", en: "Waiting on me" },

  // ── checkpoint modal (spec Q38 — four tabs) ───────────────────────────────
  "checkpointModal.tabsLabel": { sk: "Detail checkpointu", en: "Checkpoint detail" },
  "checkpointModal.tab.overview": { sk: "Prehľad", en: "Overview" },
  "checkpointModal.tab.requirements": { sk: "Podmienky", en: "Requirements" },
  "checkpointModal.tab.decision": { sk: "Rozhodnutie", en: "Decision" },
  "checkpointModal.tab.activity": { sk: "Aktivita", en: "Activity" },
  "checkpointModal.readiness": { sk: "Pripravenosť", en: "Readiness" },
  "checkpointModal.readinessOf": { sk: "z", en: "of" },
  "checkpointModal.owner": { sk: "Vlastník", en: "Owner" },
  "checkpointModal.approver": { sk: "Schvaľuje", en: "Approver" },
  "checkpointModal.due": { sk: "Termín", en: "Due" },
  "checkpointModal.impact": { sk: "Dopad", en: "Impact" },
  "checkpointModal.noImpact": { sk: "Dopad nie je opísaný.", en: "No impact described." },
  "checkpointModal.noDescription": { sk: "Bez popisu.", en: "No description." },
  "checkpointModal.requirementsRequired": { sk: "Povinná", en: "Required" },
  "checkpointModal.requirementsOptional": { sk: "Odporúčaná", en: "Optional" },
  "checkpointModal.requirementsDone": { sk: "Splnené", en: "Complete" },
  "checkpointModal.requirementsMissing": { sk: "Chýba", en: "Missing" },
  "checkpointModal.requirementsSaved": {
    sk: "Podmienky boli uložené.",
    en: "The requirements were saved.",
  },
  "checkpointModal.requirementsEmpty": {
    sk: "Checkpoint nemá žiadne podmienky.",
    en: "The checkpoint has no requirements.",
  },
  "checkpointModal.decide": { sk: "Rozhodnúť", en: "Decide" },
  "checkpointModal.decideLocked": {
    sk: "Rozhodnutie je uzamknuté, kým pripravenosť nedosiahne 100 %.",
    en: "The decision is locked until readiness reaches 100 %.",
  },
  "checkpointModal.decideReady": {
    sk: "Checkpoint je pripravený na rozhodnutie.",
    en: "The checkpoint is ready for a decision.",
  },
  "checkpointModal.outcome": { sk: "Výsledok", en: "Outcome" },
  "checkpointModal.note": { sk: "Poznámka", en: "Note" },
  "checkpointModal.followUpTitle": { sk: "Názov follow-up úlohy", en: "Follow-up title" },
  "checkpointModal.followUpHint": {
    sk: "Pri podmienenom súhlase je follow-up úloha povinná.",
    en: "A conditional go requires a follow-up item.",
  },
  "checkpointModal.followUpDue": { sk: "Termín follow-upu", en: "Follow-up due date" },
  "checkpointModal.followUpPriority": { sk: "Priorita follow-upu", en: "Follow-up priority" },
  "checkpointModal.override": { sk: "Prelomiť pravidlo pripravenosti", en: "Override readiness" },
  "checkpointModal.overrideReason": { sk: "Dôvod prelomenia", en: "Override reason" },
  "checkpointModal.overrideHint": {
    sk: "Dôvod sa zapíše do auditu. Minimálne 10 znakov.",
    en: "The reason goes into the audit log. At least 10 characters.",
  },
  "checkpointModal.decided": { sk: "Rozhodnutie bolo zaznamenané.", en: "The decision was recorded." },
  "checkpointModal.decidedAt": { sk: "Rozhodnuté", en: "Decided" },
  "checkpointModal.decidedBy": { sk: "Rozhodol", en: "Decided by" },
  "checkpointModal.superseded": { sk: "Nahradené", en: "Superseded" },
  "checkpointModal.noDecision": {
    sk: "Checkpoint zatiaľ nemá rozhodnutie.",
    en: "The checkpoint has no decision yet.",
  },
  "checkpointModal.activityEmpty": {
    sk: "Žiadne staršie rozhodnutia.",
    en: "No earlier decisions.",
  },
  "checkpointModal.activityHint": {
    sk: "Rozhodnutie je nemenné. Znovuotvorenie vytvorí nový záznam a starý označí ako nahradený.",
    en: "A decision is immutable. Reopening creates a new record and marks the old one superseded.",
  },
  "checkpointModal.openProject": { sk: "Otvoriť projekt", en: "Open project" },

  // ── errors surfaced by the Timeline itself ────────────────────────────────
  "timeline.error.load": {
    sk: "Timeline sa nepodarilo načítať.",
    en: "The timeline could not be loaded.",
  },
  "timeline.error.conflict": {
    sk: "Záznam sa medzičasom zmenil. Údaje som obnovil, skúste to znova.",
    en: "The record changed meanwhile. The data was refreshed, please try again.",
  },
};
