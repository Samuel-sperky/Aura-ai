// Domain vocabulary → presentation mapping, in ONE place.
//
// The iron rules this file exists to enforce:
//   * semantic colours (ok / warn / danger) mark DATA STATE only — health bands,
//     overdue, blocked. A neutral category (an area, an item type) never gets red.
//   * item TYPE is distinguished by an ICON, never by colour (spec: task/bug/idea
//     differ by `lucide-react` glyph).
//   * every label goes through `t()`; this module only maps a key to a tone/icon.
//
// CLIENT-SAFE: types + `lucide-react` component references, no DOM, no DB.

import {
  Bug,
  CircleCheck,
  CircleDashed,
  CirclePause,
  CirclePlay,
  Flag,
  Gavel,
  Lightbulb,
  OctagonAlert,
  PackageCheck,
  ShieldCheck,
  SquareCheck,
  Timer,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Tone } from "@/components/ui";
import type { ProjectHealth, ProjectStatus, Priority } from "@/lib/domain/contracts/projects";
import type { WorkItemStatus, WorkItemType } from "@/lib/domain/contracts/workItems";
import type {
  CheckpointLifecycle,
  CheckpointType,
  DecisionOutcome,
} from "@/lib/domain/contracts/checkpoints";

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

/**
 * Health bands (contract §3.2/71): green ≥100 % of expectation, amber 60–99 %,
 * red <60 %, grey no data. `grey` is NEUTRAL — it must not read as a problem.
 */
export const HEALTH_TONE: Readonly<Record<ProjectHealth, Tone>> = {
  green: "ok",
  amber: "warn",
  red: "danger",
  grey: "neutral",
};

/** Health ordering for "risk first" lists: red → amber → grey → green. */
export const HEALTH_RANK: Readonly<Record<ProjectHealth, number>> = {
  red: 0,
  amber: 1,
  grey: 2,
  green: 3,
};

/** Projects whose health needs attention (the "v riziku" KPI tile). */
export function isAtRisk(health: ProjectHealth): boolean {
  return health === "red" || health === "amber";
}

/**
 * Project STATUS is a lifecycle position, not a health verdict, so only the two
 * genuinely bad states carry a semantic tone. `planned` stays neutral.
 */
export const PROJECT_STATUS_TONE: Readonly<Record<ProjectStatus, Tone>> = {
  on_track: "accent",
  at_risk: "warn",
  blocked: "danger",
  planned: "neutral",
};

/** A project counts as active unless it is still merely planned. */
export function isActiveProject(status: ProjectStatus): boolean {
  return status !== "planned";
}

/**
 * Priority is a RANKING, not a health signal: P1 gets emphasis (gold, the brand
 * "look here" tone), P2/P3 stay neutral. Red on a P1 would be a false alarm.
 */
export const PRIORITY_TONE: Readonly<Record<Priority, Tone>> = {
  P1: "gold",
  P2: "neutral",
  P3: "neutral",
};

// ---------------------------------------------------------------------------
// Work items
// ---------------------------------------------------------------------------

/** Item type differs by ICON only — never by colour. */
export const ITEM_TYPE_ICON: Readonly<Record<WorkItemType, LucideIcon>> = {
  task: SquareCheck,
  bug: Bug,
  idea: Lightbulb,
};

/** Work-item status: `done` is the only genuinely positive terminal state. */
export const WORK_ITEM_STATUS_TONE: Readonly<Record<WorkItemStatus, Tone>> = {
  backlog: "neutral",
  in_progress: "accent",
  waiting: "warn",
  done: "ok",
};

export const WORK_ITEM_STATUS_ICON: Readonly<Record<WorkItemStatus, LucideIcon>> = {
  backlog: CircleDashed,
  in_progress: CirclePlay,
  waiting: CirclePause,
  done: CircleCheck,
};

/** Board column order — the same left-to-right flow as the status dictionary. */
export const WORK_ITEM_STATUS_ORDER = [
  "backlog",
  "in_progress",
  "waiting",
  "done",
] as const;

// ---------------------------------------------------------------------------
// Checkpoints and decisions
// ---------------------------------------------------------------------------

/** Checkpoint TYPE is a category → neutral/brand tones only. */
export const CHECKPOINT_TYPE_ICON: Readonly<Record<CheckpointType, LucideIcon>> = {
  review: Timer,
  decision: Gavel,
  delivery: PackageCheck,
  gate: ShieldCheck,
};

/** Lifecycle: only `blocked` is a problem; `decided` is done, `ready` is good. */
export const CHECKPOINT_LIFECYCLE_TONE: Readonly<
  Record<CheckpointLifecycle, Tone>
> = {
  planned: "neutral",
  ready: "accent",
  decided: "ok",
  blocked: "danger",
};

export const CHECKPOINT_LIFECYCLE_ICON: Readonly<
  Record<CheckpointLifecycle, LucideIcon>
> = {
  planned: CircleDashed,
  ready: Flag,
  decided: CircleCheck,
  blocked: OctagonAlert,
};

/** Decision outcome — `no_go` is the only negative verdict. */
export const OUTCOME_TONE: Readonly<Record<DecisionOutcome, Tone>> = {
  go: "ok",
  conditional_go: "warn",
  no_go: "danger",
  deferred: "neutral",
};

// ---------------------------------------------------------------------------
// i18n key builders (so a screen never hand-concatenates a dictionary key)
// ---------------------------------------------------------------------------

export const statusKey = (v: WorkItemStatus) => `status.${v}`;
export const itemTypeKey = (v: WorkItemType) => `itemType.${v}`;
export const priorityKey = (v: Priority) => `priority.${v}`;
export const projectStatusKey = (v: ProjectStatus) => `projectStatus.${v}`;
export const healthKey = (v: ProjectHealth) => `health.${v}`;
export const checkpointTypeKey = (v: CheckpointType) => `checkpointType.${v}`;
export const checkpointStateKey = (v: CheckpointLifecycle) => `checkpointState.${v}`;
export const outcomeKey = (v: DecisionOutcome) => `outcome.${v}`;
