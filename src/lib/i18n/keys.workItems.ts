// i18n keys owned by the work-items module (backlog, board, item detail,
// comments, dependencies, worklogs).
//
// The shared dictionaries — `status.*`, `itemType.*`, `priority.*` — live in
// keys.common.ts and are NOT repeated here.
//
// A10 merges every `keys.<module>.ts` into src/lib/i18n/index.ts.

import type { TranslationDict } from "./keys.common";

export const workItemsKeys: TranslationDict = {
  // ── page + views ──────────────────────────────────────────────────────────
  "workItems.title": { sk: "Úlohy", en: "Work items" },
  "workItems.subtitle": {
    sk: "Backlog, podúlohy a stav práce",
    en: "Backlog, subtasks and work status",
  },
  "workItems.view.list": { sk: "Zoznam", en: "List" },
  "workItems.view.board": { sk: "Board", en: "Board" },
  "workItems.empty": {
    sk: "Žiadne položky. Pridajte prvú úlohu.",
    en: "No items yet. Add the first task.",
  },
  "workItems.noResults": {
    sk: "Filtrom nezodpovedá žiadna položka.",
    en: "No item matches the filters.",
  },
  "workItems.count": { sk: "položiek", en: "items" },

  // ── filters ───────────────────────────────────────────────────────────────
  "workItems.filter.project": { sk: "Projekt", en: "Project" },
  "workItems.filter.sprint": { sk: "Šprint", en: "Sprint" },
  "workItems.filter.assignee": { sk: "Priradené", en: "Assignee" },
  "workItems.filter.type": { sk: "Typ", en: "Type" },
  "workItems.filter.status": { sk: "Stav", en: "Status" },
  "workItems.filter.priority": { sk: "Priorita", en: "Priority" },
  "workItems.filter.search": { sk: "Hľadať v položkách", en: "Search items" },
  "workItems.filter.backlogOnly": { sk: "Len backlog", en: "Backlog only" },
  "workItems.filter.openOnly": { sk: "Len otvorené", en: "Open only" },

  // ── fields ────────────────────────────────────────────────────────────────
  "workItems.field.title": { sk: "Názov", en: "Title" },
  "workItems.field.description": { sk: "Popis", en: "Description" },
  "workItems.field.type": { sk: "Typ položky", en: "Item type" },
  "workItems.field.status": { sk: "Stav", en: "Status" },
  "workItems.field.priority": { sk: "Priorita", en: "Priority" },
  "workItems.field.storyPoints": { sk: "Story pointy", en: "Story points" },
  "workItems.field.rank": { sk: "Poradie", en: "Order" },
  "workItems.field.assignee": { sk: "Priradené", en: "Assignee" },
  "workItems.field.reporter": { sk: "Nahlásil", en: "Reporter" },
  "workItems.field.dueDate": { sk: "Termín", en: "Due date" },
  "workItems.field.parent": { sk: "Nadradená položka", en: "Parent item" },
  "workItems.field.sprint": { sk: "Šprint", en: "Sprint" },
  "workItems.field.checkpoint": { sk: "Checkpoint", en: "Checkpoint" },
  "workItems.field.loggedTime": { sk: "Zapísaný čas", en: "Logged time" },
  "workItems.unassigned": { sk: "Nepriradené", en: "Unassigned" },
  "workItems.noSprint": { sk: "Backlog", en: "Backlog" },

  // ── story-point roll-up (spec Q26: "5 (3+2)") ─────────────────────────────
  "workItems.points.rollupHint": {
    sk: "Súčet podúloh",
    en: "Sum of subtasks",
  },
  "workItems.points.ownHint": {
    sk: "Vlastná hodnota položky",
    en: "The item's own value",
  },

  // ── hierarchy ─────────────────────────────────────────────────────────────
  "workItems.subtasks": { sk: "Podúlohy", en: "Subtasks" },
  "workItems.addSubtask": { sk: "Pridať podúlohu", en: "Add subtask" },
  "workItems.subtasksNone": { sk: "Bez podúloh", en: "No subtasks" },
  "workItems.error.depth": {
    sk: "Podúloha nemôže mať vlastnú podúlohu — hierarchia má najviac 2 úrovne.",
    en: "A subtask cannot have subtasks — the hierarchy is two levels deep.",
  },

  // ── actions ───────────────────────────────────────────────────────────────
  "workItems.action.create": { sk: "Nová položka", en: "New item" },
  "workItems.action.edit": { sk: "Upraviť položku", en: "Edit item" },
  "workItems.action.delete": { sk: "Zmazať položku", en: "Delete item" },
  "workItems.action.move": { sk: "Presunúť", en: "Move" },
  "workItems.action.moveUp": { sk: "Posunúť vyššie", en: "Move up" },
  "workItems.action.moveDown": { sk: "Posunúť nižšie", en: "Move down" },
  "workItems.action.moveToBacklog": {
    sk: "Presunúť do backlogu",
    en: "Move to backlog",
  },
  "workItems.move.title": { sk: "Presunúť položku", en: "Move item" },
  "workItems.move.help": {
    sk: "Vyberte cieľový šprint. Poradie zmeníte klávesmi ↑ a ↓.",
    en: "Pick the target sprint. Use ↑ and ↓ to change the order.",
  },
  "workItems.move.atTop": {
    sk: "Položka je už na začiatku zoznamu.",
    en: "The item is already at the top.",
  },
  "workItems.move.atBottom": {
    sk: "Položka je už na konci zoznamu.",
    en: "The item is already at the bottom.",
  },
  "workItems.delete.confirm": {
    sk: "Zmazať položku aj s jej podúlohami, komentármi a zápismi času?",
    en: "Delete the item with its subtasks, comments and worklogs?",
  },

  // ── item detail tabs ──────────────────────────────────────────────────────
  "workItems.tab.overview": { sk: "Prehľad", en: "Overview" },
  "workItems.tab.subtasks": { sk: "Podúlohy", en: "Subtasks" },
  "workItems.tab.comments": { sk: "Komentáre", en: "Comments" },
  "workItems.tab.time": { sk: "Čas", en: "Time" },
  "workItems.tab.dependencies": { sk: "Závislosti", en: "Dependencies" },

  // ── comments ──────────────────────────────────────────────────────────────
  "comments.title": { sk: "Komentáre", en: "Comments" },
  "comments.placeholder": { sk: "Napíšte komentár…", en: "Write a comment…" },
  "comments.submit": { sk: "Pridať komentár", en: "Add comment" },
  "comments.edit": { sk: "Upraviť", en: "Edit" },
  "comments.edited": { sk: "upravené", en: "edited" },
  "comments.empty": { sk: "Zatiaľ bez komentárov.", en: "No comments yet." },
  "comments.error.empty": { sk: "Komentár je prázdny.", en: "The comment is empty." },
  "comments.error.notAuthor": {
    sk: "Upraviť komentár môže len jeho autor.",
    en: "Only the author can edit a comment.",
  },

  // ── dependencies (only "blocks" exists) ───────────────────────────────────
  "dependencies.title": { sk: "Závislosti", en: "Dependencies" },
  "dependencies.blocks": { sk: "Blokuje", en: "Blocks" },
  "dependencies.blockedBy": { sk: "Blokované položkou", en: "Blocked by" },
  "dependencies.add": { sk: "Pridať závislosť", en: "Add dependency" },
  "dependencies.remove": { sk: "Odobrať závislosť", en: "Remove dependency" },
  "dependencies.empty": { sk: "Bez závislostí.", en: "No dependencies." },
  "dependencies.error.cycle": {
    sk: "Závislosť by vytvorila cyklus — položky by sa blokovali dokola.",
    en: "That dependency would create a cycle — the items would block each other.",
  },
  "dependencies.error.duplicate": {
    sk: "Táto závislosť už existuje.",
    en: "This dependency already exists.",
  },
  "dependencies.error.crossProject": {
    sk: "Závislosť sa dá vytvoriť len v rámci jedného projektu.",
    en: "A dependency can only link items inside one project.",
  },

  // ── worklogs (OPTIONAL — nothing requires them) ────────────────────────────
  "worklogs.title": { sk: "Zapísaný čas", en: "Logged time" },
  "worklogs.optionalHint": {
    sk: "Zápis času je nepovinný.",
    en: "Logging time is optional.",
  },
  "worklogs.add": { sk: "Zapísať čas", en: "Log time" },
  "worklogs.field.date": { sk: "Dátum", en: "Date" },
  "worklogs.field.minutes": { sk: "Minúty", en: "Minutes" },
  "worklogs.field.description": { sk: "Popis práce", en: "What was done" },
  "worklogs.quick15": { sk: "+15 min", en: "+15 min" },
  "worklogs.quick30": { sk: "+30 min", en: "+30 min" },
  "worklogs.quick60": { sk: "+60 min", en: "+60 min" },
  "worklogs.total": { sk: "Spolu", en: "Total" },
  "worklogs.empty": { sk: "Bez zápisov času.", en: "No time logged." },
  "worklogs.delete": { sk: "Zmazať zápis", en: "Delete entry" },
  "worklogs.error.minutes": {
    sk: "Zadajte platný čas od 1 do 1440 minút.",
    en: "Enter a valid duration between 1 and 1440 minutes.",
  },
  "worklogs.error.notAuthor": {
    sk: "Zmazať záznam času môže len jeho autor.",
    en: "Only the author can delete a time entry.",
  },
};
