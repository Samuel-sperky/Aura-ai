// i18n keys owned by the checkpoints / decisions module (the Decisions view, the
// checkpoint detail with its four tabs, baselines and the notification bell).
// A10 merges every `keys.<module>.ts` into `src/lib/i18n/index.ts`.
//
// The DB stores EN vocabulary keys; these are the SK + EN labels for them.
// Note: the TEXT of a stored notification is rendered at write time and therefore
// frozen in SK (see OUTCOME_LABELS_SK in src/lib/domain/decisions.ts). Everything
// here is UI chrome and translates normally.

export const checkpointsKeys = {
  // --- page / section titles ------------------------------------------------
  "checkpoints.title": { sk: "Rozhodnutia", en: "Decisions" },
  "checkpoints.subtitle": {
    sk: "Fronta checkpointov podľa pripravenosti a termínu.",
    en: "Checkpoint queue by readiness and due date.",
  },
  "checkpoints.queue.title": { sk: "Rozhodovacia fronta", en: "Decision queue" },
  "checkpoints.queue.mine": { sk: "Čaká na mňa", en: "Waiting on me" },
  "checkpoints.queue.all": { sk: "Všetky", en: "All" },
  "checkpoints.queue.empty": {
    sk: "Žiadny checkpoint nečaká na rozhodnutie.",
    en: "No checkpoint is awaiting a decision.",
  },
  "checkpoints.entity": { sk: "Checkpoint", en: "Checkpoint" },
  "checkpoints.entityPlural": { sk: "Checkpointy", en: "Checkpoints" },
  "checkpoints.new": { sk: "Nový checkpoint", en: "New checkpoint" },

  // --- detail tabs (spec Q38: 4 tabs) --------------------------------------
  "checkpoints.tab.overview": { sk: "Prehľad", en: "Overview" },
  "checkpoints.tab.requirements": { sk: "Podmienky", en: "Conditions" },
  "checkpoints.tab.decision": { sk: "Rozhodnutie", en: "Decision" },
  "checkpoints.tab.activity": { sk: "Aktivita", en: "Activity" },

  // --- fields ---------------------------------------------------------------
  "checkpoints.field.name": { sk: "Názov", en: "Name" },
  "checkpoints.field.project": { sk: "Projekt", en: "Project" },
  "checkpoints.field.description": { sk: "Popis", en: "Description" },
  "checkpoints.field.impact": { sk: "Dopad", en: "Impact" },
  "checkpoints.field.type": { sk: "Typ", en: "Type" },
  "checkpoints.field.lifecycle": { sk: "Stav", en: "Status" },
  "checkpoints.field.dueDate": { sk: "Termín", en: "Due date" },
  "checkpoints.field.startDate": { sk: "Začiatok", en: "Start" },
  "checkpoints.field.endDate": { sk: "Koniec", en: "End" },
  "checkpoints.field.owner": { sk: "Vlastník", en: "Owner" },
  "checkpoints.field.approver": { sk: "Schvaľovateľ", en: "Approver" },
  "checkpoints.field.readiness": { sk: "Pripravenosť", en: "Readiness" },
  "checkpoints.field.decidedAt": { sk: "Rozhodnuté", en: "Decided" },
  "checkpoints.field.interval": { sk: "Interval", en: "Interval" },
  "checkpoints.field.unassigned": { sk: "Neurčené", en: "Unassigned" },

  // --- type vocabulary (spec Q31) ------------------------------------------
  "checkpoints.type.review": { sk: "Revízia", en: "Review" },
  "checkpoints.type.decision": { sk: "Rozhodnutie", en: "Decision" },
  "checkpoints.type.delivery": { sk: "Dodávka", en: "Delivery" },
  "checkpoints.type.gate": { sk: "Gate", en: "Gate" },
  "checkpoints.type.gate.hint": {
    sk: "Pri type Gate musí byť schvaľovateľ iný človek než vlastník.",
    en: "For a Gate the approver must be someone other than the owner.",
  },

  // --- lifecycle vocabulary (spec Q32) ------------------------------------
  "checkpoints.lifecycle.planned": { sk: "Plánovaný", en: "Planned" },
  "checkpoints.lifecycle.ready": { sk: "Pripravený", en: "Ready" },
  "checkpoints.lifecycle.decided": { sk: "Rozhodnutý", en: "Decided" },
  "checkpoints.lifecycle.blocked": { sk: "Blokovaný", en: "Blocked" },

  // --- requirement checklist ----------------------------------------------
  "checkpoints.requirements.title": { sk: "Podmienky", en: "Conditions" },
  "checkpoints.requirements.hint": {
    sk: "Pripravenosť počíta len povinné podmienky. Nepovinné sa zobrazujú, ale do percenta nevstupujú.",
    en: "Readiness counts required conditions only. Optional ones are shown but do not affect the percentage.",
  },
  "checkpoints.requirements.add": { sk: "Pridať podmienku", en: "Add condition" },
  "checkpoints.requirements.label": { sk: "Podmienka", en: "Condition" },
  "checkpoints.requirements.required": { sk: "Povinná", en: "Required" },
  "checkpoints.requirements.optional": { sk: "Nepovinná", en: "Optional" },
  "checkpoints.requirements.complete": { sk: "Splnená", en: "Complete" },
  "checkpoints.requirements.empty": {
    sk: "Bez podmienok. Pripravenosť je 0 % — najprv definujte, čo znamená „pripravené“.",
    en: "No conditions yet. Readiness is 0 % — define what “ready” means first.",
  },
  "checkpoints.requirements.save": { sk: "Uložiť podmienky", en: "Save conditions" },
  "checkpoints.requirements.saved": { sk: "Podmienky uložené.", en: "Conditions saved." },
  "checkpoints.requirements.frozen": {
    sk: "Podmienky rozhodnutého checkpointu sa nedajú meniť.",
    en: "Conditions of a decided checkpoint cannot be changed.",
  },
  "checkpoints.requirements.progress": {
    sk: "Splnené povinné podmienky",
    en: "Required conditions complete",
  },

  // --- decision -------------------------------------------------------------
  "decisions.decide": { sk: "Rozhodnúť", en: "Decide" },
  "decisions.title": { sk: "Rozhodnutie", en: "Decision" },
  "decisions.outcome": { sk: "Výsledok", en: "Outcome" },
  "decisions.note": { sk: "Poznámka", en: "Note" },
  "decisions.decidedBy": { sk: "Rozhodol", en: "Decided by" },
  "decisions.history": { sk: "História rozhodnutí", en: "Decision history" },
  "decisions.none": { sk: "Zatiaľ bez rozhodnutia.", en: "No decision yet." },
  "decisions.immutable": {
    sk: "Rozhodnutie je nemenné. Zmena je možná len formálnym znovuotvorením, ktoré vytvorí nový záznam.",
    en: "A decision is immutable. It can only be changed by formally reopening it, which creates a new record.",
  },
  "decisions.superseded": { sk: "Nahradené", en: "Superseded" },
  "decisions.current": { sk: "Aktuálne", en: "Current" },

  // --- outcome vocabulary (spec Q33) --------------------------------------
  "decisions.outcome.go": { sk: "Súhlas", en: "Go" },
  "decisions.outcome.conditional_go": {
    sk: "Podmienený súhlas",
    en: "Conditional go",
  },
  "decisions.outcome.no_go": { sk: "Nesúhlas", en: "No go" },
  "decisions.outcome.deferred": { sk: "Odložené", en: "Deferred" },

  // --- follow-up ------------------------------------------------------------
  "decisions.followUp.title": { sk: "Follow-up položka", en: "Follow-up item" },
  "decisions.followUp.required": {
    sk: "Pri podmienenom súhlase je follow-up položka povinná.",
    en: "A conditional go requires a follow-up item.",
  },
  "decisions.followUp.name": { sk: "Názov follow-up položky", en: "Follow-up title" },
  "decisions.followUp.assignee": { sk: "Priradiť", en: "Assign to" },
  "decisions.followUp.dueDate": { sk: "Termín follow-upu", en: "Follow-up due date" },
  "decisions.followUp.created": {
    sk: "Follow-up položka bola vytvorená.",
    en: "The follow-up item was created.",
  },

  // --- gating and override -------------------------------------------------
  "decisions.gate.notReady": {
    sk: "Rozhodnutie je povolené až pri 100 % pripravenosti.",
    en: "A decision is only allowed at 100 % readiness.",
  },
  "decisions.gate.notApprover": {
    sk: "Rozhodnúť môže len určený schvaľovateľ checkpointu.",
    en: "Only the checkpoint's named approver may decide.",
  },
  "decisions.gate.noApprover": {
    sk: "Checkpoint nemá určeného schvaľovateľa.",
    en: "The checkpoint has no approver assigned.",
  },
  "decisions.gate.samePerson": {
    sk: "Pri type Gate musí byť schvaľovateľ iný človek než vlastník.",
    en: "For a Gate the approver must differ from the owner.",
  },
  "decisions.override.title": {
    sk: "Prelomiť pravidlo 100 %",
    en: "Override the 100 % rule",
  },
  "decisions.override.reason": { sk: "Dôvod", en: "Reason" },
  "decisions.override.hint": {
    sk: "Dôvod je povinný a zapíše sa do auditu.",
    en: "The reason is mandatory and is written to the audit log.",
  },
  "decisions.override.badge": {
    sk: "Rozhodnuté s prelomením pravidla",
    en: "Decided with an override",
  },

  // --- reopen ---------------------------------------------------------------
  "decisions.reopen": { sk: "Znovu otvoriť", en: "Reopen" },
  "decisions.reopen.title": {
    sk: "Znovuotvorenie rozhodnutia",
    en: "Reopen the decision",
  },
  "decisions.reopen.hint": {
    sk: "Pôvodné rozhodnutie zostane v histórii a označí sa ako nahradené. Dôvod je povinný.",
    en: "The original decision stays in the history and is marked superseded. The reason is mandatory.",
  },
  "decisions.reopen.reason": { sk: "Dôvod znovuotvorenia", en: "Reason for reopening" },
  "decisions.reopen.adminOnly": {
    sk: "Znovu otvoriť rozhodnutie môže len administrátor.",
    en: "Only an administrator may reopen a decision.",
  },
  "decisions.reopen.done": {
    sk: "Rozhodnutie bolo znovuotvorené.",
    en: "The decision was reopened.",
  },

  // --- baselines / plan versions -------------------------------------------
  "plans.title": { sk: "Baseline plány", en: "Baseline plans" },
  "plans.hint": {
    sk: "Snapshot plánu sa uloží pri každom rozhodnutí — slúži na porovnanie plánu s realitou.",
    en: "A plan snapshot is stored with every decision — use it to compare plan against reality.",
  },
  "plans.baselineDate": { sk: "Dátum baseline", en: "Baseline date" },
  "plans.createdBy": { sk: "Vytvoril", en: "Created by" },
  "plans.totals.workItems": { sk: "Položky", en: "Work items" },
  "plans.totals.storyPoints": { sk: "Story pointy", en: "Story points" },
  "plans.empty": { sk: "Zatiaľ žiadny baseline.", en: "No baseline yet." },

  // --- notifications --------------------------------------------------------
  "notifications.title": { sk: "Notifikácie", en: "Notifications" },
  "notifications.bell": { sk: "Notifikácie", en: "Notifications" },
  "notifications.empty": { sk: "Žiadne notifikácie.", en: "No notifications." },
  "notifications.unread": { sk: "Neprečítané", en: "Unread" },
  "notifications.markRead": { sk: "Označiť ako prečítané", en: "Mark as read" },
  "notifications.markAllRead": { sk: "Označiť všetky", en: "Mark all read" },
  "notifications.inAppOnly": {
    sk: "Notifikácie sú len v aplikácii — e-maily neposielame.",
    en: "Notifications are in-app only — no e-mail is sent.",
  },

  // --- misc -----------------------------------------------------------------
  "checkpoints.overdue": { sk: "Po termíne", en: "Overdue" },
  "checkpoints.dueToday": { sk: "Dnes", en: "Today" },
  "checkpoints.dueInDays": { sk: "Za {n} dní", en: "In {n} days" },
  "checkpoints.overdueByDays": { sk: "{n} dní po termíne", en: "{n} days overdue" },
} as const;
