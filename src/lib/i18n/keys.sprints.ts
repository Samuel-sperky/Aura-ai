// i18n keys owned by the sprint module (sprint planner, lifecycle actions,
// metrics and the per-person capacity panel).
//
// A10 merges every `keys.<module>.ts` into src/lib/i18n/index.ts.

import type { TranslationDict } from "./keys.common";

export const sprintsKeys: TranslationDict = {
  // ── page + list ───────────────────────────────────────────────────────────
  "sprints.title": { sk: "Šprinty", en: "Sprints" },
  "sprints.subtitle": {
    sk: "Plánovanie kapacity a záväzku šprintu",
    en: "Sprint capacity and commitment planning",
  },
  "sprints.planner": { sk: "Sprint planner", en: "Sprint planner" },
  "sprints.empty": {
    sk: "Žiadne šprinty. Vytvorte prvý.",
    en: "No sprints yet. Create the first one.",
  },
  "sprints.active": { sk: "Aktívny šprint", en: "Active sprint" },
  "sprints.upcoming": { sk: "Nasledujúci šprint", en: "Next sprint" },

  // ── status dictionary (EN keys in the DB, SK in the UI) ───────────────────
  "sprintStatus.draft": { sk: "Návrh", en: "Draft" },
  "sprintStatus.planned": { sk: "Plánovaný", en: "Planned" },
  "sprintStatus.active": { sk: "Prebieha", en: "Active" },
  "sprintStatus.review": { sk: "Revízia", en: "Review" },
  "sprintStatus.completed": { sk: "Uzavretý", en: "Completed" },
  "sprintStatus.cancelled": { sk: "Zrušený", en: "Cancelled" },

  // ── fields ────────────────────────────────────────────────────────────────
  "sprints.field.name": { sk: "Názov šprintu", en: "Sprint name" },
  "sprints.field.goal": { sk: "Cieľ šprintu", en: "Sprint goal" },
  "sprints.field.project": { sk: "Projekt", en: "Project" },
  "sprints.field.startDate": { sk: "Začiatok", en: "Start" },
  "sprints.field.endDate": { sk: "Koniec", en: "End" },
  "sprints.field.capacityPoints": { sk: "Kapacita (pointy)", en: "Capacity (points)" },
  "sprints.field.cadenceWeeks": { sk: "Kadencia (týždne)", en: "Cadence (weeks)" },
  "sprints.field.status": { sk: "Stav", en: "Status" },
  "sprints.goalPlaceholder": {
    sk: "Čo má šprint dosiahnuť?",
    en: "What should this sprint achieve?",
  },
  "sprints.goalRequiredHint": {
    sk: "Cieľ je povinný pred commitom šprintu.",
    en: "The goal is required before the sprint can be committed.",
  },

  // ── metrics ───────────────────────────────────────────────────────────────
  "sprints.metric.committed": { sk: "Záväzok", en: "Committed" },
  "sprints.metric.current": { sk: "Aktuálny rozsah", en: "Current scope" },
  "sprints.metric.completed": { sk: "Dokončené", en: "Completed" },
  "sprints.metric.scopeChange": { sk: "Zmena rozsahu", en: "Scope change" },
  "sprints.metric.velocity": { sk: "Rýchlosť", en: "Velocity" },
  "sprints.metric.capacityUsed": { sk: "Využitie kapacity", en: "Capacity used" },
  "sprints.metric.openItems": { sk: "Otvorené položky", en: "Open items" },
  "sprints.metric.points": { sk: "pointov", en: "points" },
  "sprints.velocityHint": {
    sk: "Priemer dokončených pointov za posledné 3 uzavreté šprinty.",
    en: "Average completed points across the last 3 closed sprints.",
  },

  // ── capacity panel (per PERSON — there are no teams) ──────────────────────
  "sprints.capacity.title": { sk: "Kapacita osôb", en: "Capacity by person" },
  "sprints.capacity.person": { sk: "Osoba", en: "Person" },
  "sprints.capacity.load": { sk: "Vyťaženie", en: "Load" },
  "sprints.capacity.perPerson": { sk: "Kapacita na osobu", en: "Capacity per person" },
  "sprints.capacity.overloaded": { sk: "Preťažené", en: "Overloaded" },
  "sprints.capacity.unassigned": { sk: "Nepriradené", en: "Unassigned" },
  "sprints.capacity.empty": {
    sk: "V šprinte nie sú žiadne položky.",
    en: "The sprint has no items.",
  },

  // ── lifecycle actions ─────────────────────────────────────────────────────
  "sprints.action.create": { sk: "Nový šprint", en: "New sprint" },
  "sprints.action.edit": { sk: "Upraviť šprint", en: "Edit sprint" },
  "sprints.action.commit": { sk: "Commitnúť šprint", en: "Commit sprint" },
  "sprints.action.start": { sk: "Spustiť šprint", en: "Start sprint" },
  "sprints.action.review": { sk: "Poslať do revízie", en: "Send to review" },
  "sprints.action.close": { sk: "Uzavrieť šprint", en: "Close sprint" },
  "sprints.action.cancel": { sk: "Zrušiť šprint", en: "Cancel sprint" },
  "sprints.action.carryOver": { sk: "Preniesť položky", en: "Carry over items" },

  "sprints.commit.confirm": {
    sk: "Commit uzamkne rozsah šprintu. Neskoršie pridané položky sa zobrazia ako zmena rozsahu.",
    en: "Committing locks the sprint scope. Items added later show up as scope change.",
  },
  "sprints.close.confirm": {
    sk: "Uzavrieť šprint a zapísať dokončené pointy?",
    en: "Close the sprint and store the completed points?",
  },
  "sprints.carryOver.title": { sk: "Preniesť položky", en: "Carry over items" },
  "sprints.carryOver.help": {
    sk: "Nedokončené položky sa presunú do vybraného šprintu, alebo späť do backlogu.",
    en: "Unfinished items move to the selected sprint, or back to the backlog.",
  },
  "sprints.carryOver.toBacklog": { sk: "Späť do backlogu", en: "Back to the backlog" },
  "sprints.carryOver.done": { sk: "Prenesené položky", en: "Items carried over" },

  // ── errors (server messages mirrored for optimistic UI) ───────────────────
  "sprints.error.goalRequired": {
    sk: "Pred commitom je povinný cieľ šprintu.",
    en: "The sprint goal is required before committing.",
  },
  "sprints.error.openItems": {
    sk: "Najprv vyhodnoťte alebo preneste všetky otvorené položky.",
    en: "Resolve or carry over every open item first.",
  },
  "sprints.error.commitFirst": {
    sk: "Šprint treba najprv commitnúť.",
    en: "The sprint has to be committed first.",
  },
  "sprints.error.targetSprint": {
    sk: "Cieľový šprint neexistuje.",
    en: "The target sprint does not exist.",
  },
  "sprints.error.unknownAction": {
    sk: "Neznáma akcia šprintu.",
    en: "Unknown sprint action.",
  },
};
