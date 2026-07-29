// Zod contracts for the decision pillar: checkpoints, their requirement
// checklist, the immutable decision records, baseline plan snapshots and in-app
// notifications.
//
// CLIENT-SAFE: `zod` + `@/lib/domain/data` only (no DB, no next/headers), so the
// decision queue screen validates against the exact same schemas the route
// handlers do.
//
// Error messages are Slovak: `defineRoute` surfaces the FIRST zod issue straight
// to the user as `{ error: "<slovenská správa>" }`.
//
// VOCABULARIES (EN keys in the DB, SK labels in src/lib/i18n/keys.checkpoints.ts):
//   checkpoint_type  review | decision | delivery | gate
//   lifecycle        planned | ready | decided | blocked
//   outcome          go | conditional_go | no_go | deferred
// `decided` is NOT client-settable — it is produced only by POST …/decide.

import { z } from "zod";
import { paginationSchema } from "@/lib/domain/data";

// ---------------------------------------------------------------------------
// Vocabularies
// ---------------------------------------------------------------------------

/** The four checkpoint types (spec Q31 — the source app's nine were noise). */
export const CHECKPOINT_TYPES = [
  "review",
  "decision",
  "delivery",
  "gate",
] as const;
export type CheckpointType = (typeof CHECKPOINT_TYPES)[number];

/** The four lifecycle states (spec Q32). */
export const CHECKPOINT_LIFECYCLES = [
  "planned",
  "ready",
  "decided",
  "blocked",
] as const;
export type CheckpointLifecycle = (typeof CHECKPOINT_LIFECYCLES)[number];

/**
 * Lifecycles a client may set directly. `decided` is reached ONLY through
 * POST /api/checkpoints/[id]/decide, and left ONLY through …/reopen — otherwise
 * a plain PATCH could fake or erase a decision.
 */
export const SETTABLE_LIFECYCLES = ["planned", "ready", "blocked"] as const;
export type SettableLifecycle = (typeof SETTABLE_LIFECYCLES)[number];

/** The four decision outcomes (spec Q33). */
export const DECISION_OUTCOMES = [
  "go",
  "conditional_go",
  "no_go",
  "deferred",
] as const;
export type DecisionOutcome = (typeof DECISION_OUTCOMES)[number];

/** Priorities usable for the mandatory `conditional_go` follow-up item. */
export const PRIORITIES = ["P1", "P2", "P3"] as const;

/** Readiness is a whole percentage. A decision needs exactly this value. */
export const FULL_READINESS = 100;

/** Hard cap on one checkpoint's checklist — bounds the bulk PUT payload. */
export const MAX_REQUIREMENTS = 100;

/** Page-size ceiling when a plan listing asks for the full snapshot payload. */
export const MAX_SNAPSHOT_PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/** A CHAR(36) primary key (crypto.randomUUID output). */
export const idSchema = z
  .string()
  .trim()
  .length(36, "Neplatný identifikátor záznamu.");

/**
 * A calendar day as `YYYY-MM-DD`. Deliberately a string end to end: DATE columns
 * are read back with `DATE_FORMAT(col, '%Y-%m-%d')` so no timezone conversion
 * can shift the day (see docs note in lib/domain/checkpoints.ts).
 */
export const dateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Dátum musí byť v tvare RRRR-MM-DD.")
  .refine((v) => {
    const [y, m, d] = v.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return (
      dt.getUTCFullYear() === y &&
      dt.getUTCMonth() === m - 1 &&
      dt.getUTCDate() === d
    );
  }, "Neplatný dátum.");

/** Row version for optimistic concurrency (`defineRoute({ version: true })`). */
export const versionSchema = z
  .number()
  .int("Verzia záznamu musí byť celé číslo.")
  .min(1, "Verzia záznamu musí byť aspoň 1.");

const nameSchema = z
  .string()
  .trim()
  .min(3, "Názov checkpointu musí mať aspoň 3 znaky.")
  .max(160, "Názov checkpointu je príliš dlhý.");

const proseSchema = (max: number, label: string) =>
  z.string().trim().max(max, `${label} je príliš dlhý.`);

export const checkpointTypeSchema = z.enum(CHECKPOINT_TYPES, {
  message: "Neplatný typ checkpointu.",
});

export const settableLifecycleSchema = z.enum(SETTABLE_LIFECYCLES, {
  message:
    'Neplatný stav checkpointu. Stav „rozhodnuté“ vzniká len rozhodnutím.',
});

export const outcomeSchema = z.enum(DECISION_OUTCOMES, {
  message: "Neplatný výsledok rozhodnutia.",
});

// ---------------------------------------------------------------------------
// Requirements (the checklist that drives readiness %)
// ---------------------------------------------------------------------------

/**
 * One checklist row in a bulk PUT. `id` present = update that row, absent =
 * insert. Rows missing from the payload are deleted. `sort_order` is NOT sent:
 * the array order IS the order, which makes a reorder impossible to desync.
 */
export const requirementInputSchema = z.object({
  id: idSchema.optional(),
  label: z
    .string()
    .trim()
    .min(2, "Popis podmienky musí mať aspoň 2 znaky.")
    .max(255, "Popis podmienky je príliš dlhý."),
  /** Only `required` rows count towards readiness; optional ones only display. */
  required: z.boolean().default(true),
  complete: z.boolean().default(false),
});
export type RequirementInput = z.infer<typeof requirementInputSchema>;

/** PUT /api/checkpoints/[id]/requirements */
export const requirementsPutSchema = z.object({
  version: versionSchema,
  requirements: z
    .array(requirementInputSchema)
    .max(MAX_REQUIREMENTS, `Checkpoint môže mať najviac ${MAX_REQUIREMENTS} podmienok.`)
    .default([]),
});
export type RequirementsPutInput = z.infer<typeof requirementsPutSchema>;

// ---------------------------------------------------------------------------
// Checkpoint create / update
// ---------------------------------------------------------------------------

const checkpointCoreShape = {
  name: nameSchema,
  description: proseSchema(2000, "Popis").optional(),
  impact: proseSchema(2000, "Dopad").optional(),
  checkpointType: checkpointTypeSchema.default("review"),
  /** The single anchor day of the checkpoint. */
  dueDate: dateSchema,
  /** Optional interval. There is NO recurrence — the source app's rule is dropped. */
  startDate: dateSchema.nullish(),
  endDate: dateSchema.nullish(),
  ownerId: idSchema.nullish(),
  approverId: idSchema.nullish(),
};

/**
 * Interval sanity, shared by create and update: start <= end, and the anchor day
 * must sit inside the interval when both ends are known.
 */
function checkInterval(
  v: {
    dueDate?: string;
    startDate?: string | null;
    endDate?: string | null;
  },
  ctx: z.RefinementCtx,
): void {
  const { dueDate, startDate, endDate } = v;
  if (startDate && endDate && startDate > endDate) {
    ctx.addIssue({
      code: "custom",
      path: ["endDate"],
      message: "Koniec intervalu nemôže byť skôr než začiatok.",
    });
  }
  if (dueDate && startDate && dueDate < startDate) {
    ctx.addIssue({
      code: "custom",
      path: ["dueDate"],
      message: "Termín nemôže byť skôr než začiatok intervalu.",
    });
  }
  if (dueDate && endDate && dueDate > endDate) {
    ctx.addIssue({
      code: "custom",
      path: ["dueDate"],
      message: "Termín nemôže byť neskôr než koniec intervalu.",
    });
  }
}

/** POST /api/checkpoints */
export const checkpointCreateSchema = z
  .object({
    projectId: idSchema,
    ...checkpointCoreShape,
    lifecycle: settableLifecycleSchema.default("planned"),
    /** Optional initial checklist, created in the same transaction. */
    requirements: z
      .array(requirementInputSchema)
      .max(MAX_REQUIREMENTS, `Checkpoint môže mať najviac ${MAX_REQUIREMENTS} podmienok.`)
      .optional(),
  })
  .superRefine(checkInterval);
export type CheckpointCreateInput = z.infer<typeof checkpointCreateSchema>;

/**
 * PATCH /api/checkpoints/[id] — every field optional, `version` mandatory.
 * A DECIDED checkpoint is rejected by the handler: editing the context of an
 * immutable decision would rewrite history. Reopen it first.
 */
export const checkpointUpdateSchema = z
  .object({
    version: versionSchema,
    name: nameSchema.optional(),
    description: proseSchema(2000, "Popis").nullish(),
    impact: proseSchema(2000, "Dopad").nullish(),
    checkpointType: checkpointTypeSchema.optional(),
    lifecycle: settableLifecycleSchema.optional(),
    dueDate: dateSchema.optional(),
    startDate: dateSchema.nullish(),
    endDate: dateSchema.nullish(),
    ownerId: idSchema.nullish(),
    approverId: idSchema.nullish(),
  })
  .superRefine((v, ctx) => {
    checkInterval(v, ctx);
    // `version` is mandatory bookkeeping, not a change — a body carrying only a
    // version would otherwise bump the row without editing anything.
    const hasChange = Object.entries(v).some(
      ([field, value]) => field !== "version" && value !== undefined,
    );
    if (!hasChange) {
      ctx.addIssue({ code: "custom", message: "Nie je čo zmeniť." });
    }
  });
export type CheckpointUpdateInput = z.infer<typeof checkpointUpdateSchema>;

// ---------------------------------------------------------------------------
// Decide / reopen
// ---------------------------------------------------------------------------

/**
 * POST /api/checkpoints/[id]/decide.
 *
 * `followUpTitle` is MANDATORY for `conditional_go` (spec Q37d): a conditional
 * go with no recorded condition is just a go. Enforced twice on purpose — here
 * (400 from the pipeline) and in `validateDecisionPayload` (unit-tested), so the
 * rule cannot be lost by a future caller that skips the schema.
 *
 * `overrideReason` is MANDATORY when deciding below 100 % readiness, which only
 * a holder of `readiness.override` may do at all.
 */
export const decideSchema = z
  .object({
    version: versionSchema,
    outcome: outcomeSchema,
    note: proseSchema(1500, "Poznámka").optional(),
    followUpTitle: z
      .string()
      .trim()
      .min(3, "Názov follow-up položky musí mať aspoň 3 znaky.")
      .max(255, "Názov follow-up položky je príliš dlhý.")
      .optional(),
    followUpAssigneeId: idSchema.nullish(),
    followUpDueDate: dateSchema.nullish(),
    followUpPriority: z
      .enum(PRIORITIES, { message: "Neplatná priorita." })
      .default("P1"),
    /** Mandatory justification when overriding the 100 % readiness rule. */
    overrideReason: z
      .string()
      .trim()
      .min(10, "Dôvod prelomenia pravidla musí mať aspoň 10 znakov.")
      .max(500, "Dôvod prelomenia pravidla je príliš dlhý.")
      .optional(),
  })
  .superRefine((v, ctx) => {
    if (v.outcome === "conditional_go" && !v.followUpTitle) {
      ctx.addIssue({
        code: "custom",
        path: ["followUpTitle"],
        message:
          "Pri podmienenom súhlase je follow-up položka povinná — zadajte jej názov.",
      });
    }
  });
export type DecideInput = z.infer<typeof decideSchema>;

/**
 * POST /api/checkpoints/[id]/reopen — formal reopening of an immutable decision.
 * The reason is mandatory: an unexplained reopen destroys the value of the trail
 * the immutability rule exists to protect.
 */
export const reopenSchema = z.object({
  version: versionSchema,
  reason: z
    .string()
    .trim()
    .min(10, "Dôvod znovuotvorenia musí mať aspoň 10 znakov.")
    .max(500, "Dôvod znovuotvorenia je príliš dlhý."),
});
export type ReopenInput = z.infer<typeof reopenSchema>;

// ---------------------------------------------------------------------------
// List queries
// ---------------------------------------------------------------------------

/** ORDER BY allow-list keys (resolved to real columns by `pickSort`). */
export const CHECKPOINT_SORT_KEYS = [
  "dueDate",
  "name",
  "lifecycle",
  "type",
  "readiness",
  "project",
  "createdAt",
] as const;

const flagSchema = z.enum(["1", "0"]).optional();

/**
 * GET /api/checkpoints.
 *
 * `queue=1` is the Decisions view (spec Q9): only checkpoints that still need a
 * decision, ordered by due date — a work queue, not a timeline.
 * `mine=1` narrows it to the ones waiting on the caller as approver.
 */
export const checkpointListQuerySchema = z.object({
  ...paginationSchema,
  projectId: idSchema.optional(),
  checkpointType: checkpointTypeSchema.optional(),
  lifecycle: z
    .enum(CHECKPOINT_LIFECYCLES, { message: "Neplatný stav checkpointu." })
    .optional(),
  ownerId: idSchema.optional(),
  approverId: idSchema.optional(),
  /** Free text over checkpoint name + project code/name. */
  q: z.string().trim().max(128, "Hľadaný výraz je príliš dlhý.").optional(),
  /** Inclusive due-date window. */
  from: dateSchema.optional(),
  to: dateSchema.optional(),
  /** Decision-queue mode: drop everything already decided. */
  queue: flagSchema,
  /** Only checkpoints where the caller is the approver. */
  mine: flagSchema,
  /** Only checkpoints already at 100 % readiness. */
  readyOnly: flagSchema,
  sort: z.enum(CHECKPOINT_SORT_KEYS, { message: "Neplatné zoradenie." }).optional(),
  dir: z.enum(["asc", "desc"]).optional(),
});
export type CheckpointListQuery = z.infer<typeof checkpointListQuerySchema>;

/** GET /api/plans — baseline snapshots, newest first. */
export const planListQuerySchema = z
  .object({
    ...paginationSchema,
    /** Filter by the project the snapshot was taken of (read out of the JSON). */
    projectId: idSchema.optional(),
    /** Filter by the checkpoint whose decision produced the snapshot. */
    checkpointId: idSchema.optional(),
    /** `snapshot` adds the full payload — capped page size, it is bulky. */
    include: z.enum(["summary", "snapshot"]).default("summary"),
  })
  // One snapshot can hold thousands of work items, so asking for the payload
  // CLAMPS the page size rather than rejecting the request — the caller does not
  // have to know the cap, and it cannot be talked out of it either.
  .transform((v) =>
    v.include === "snapshot" && v.pageSize > MAX_SNAPSHOT_PAGE_SIZE
      ? { ...v, pageSize: MAX_SNAPSHOT_PAGE_SIZE }
      : v,
  );
export type PlanListQuery = z.infer<typeof planListQuerySchema>;

/** GET /api/notifications — always scoped to the caller, server-side. */
export const notificationListQuerySchema = z.object({
  ...paginationSchema,
  /** `1` = only unread. Query it with pageSize=1 to read the bell count from `pagination.total`. */
  unread: flagSchema,
});
export type NotificationListQuery = z.infer<typeof notificationListQuerySchema>;

/** POST /api/notifications/read — mark the caller's own notifications read. */
export const notificationsReadSchema = z
  .object({
    ids: z
      .array(idSchema)
      .max(200, "Naraz sa dá označiť najviac 200 notifikácií.")
      .optional(),
    /** Mark everything unread as read. */
    all: z.boolean().optional(),
  })
  .refine((v) => v.all === true || (v.ids?.length ?? 0) > 0, {
    message: "Zadajte notifikácie na označenie alebo použite všetky.",
  });
export type NotificationsReadInput = z.infer<typeof notificationsReadSchema>;

// ---------------------------------------------------------------------------
// Wire shapes (shared with the client)
// ---------------------------------------------------------------------------

/** One checklist row as returned by the API. */
export interface RequirementDto {
  id: string;
  checkpointId: string;
  label: string;
  required: boolean;
  complete: boolean;
  sortOrder: number;
}

/** One immutable decision record. `supersededBy` set = it was reopened. */
export interface DecisionDto {
  id: string;
  checkpointId: string;
  outcome: DecisionOutcome;
  note: string | null;
  decidedBy: string | null;
  decidedByName: string | null;
  decidedAt: string | null;
  supersededBy: string | null;
}

/**
 * A checkpoint row for the queue and the detail view.
 *
 * `canDecide` / `decisionBlockedReason` are computed for the CALLING user and are
 * UX only — the server re-checks every rule on POST …/decide.
 */
export interface CheckpointDto {
  id: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  name: string;
  description: string | null;
  impact: string | null;
  checkpointType: CheckpointType;
  lifecycle: CheckpointLifecycle;
  dueDate: string;
  startDate: string | null;
  endDate: string | null;
  ownerId: string | null;
  ownerName: string | null;
  ownerInitials: string | null;
  approverId: string | null;
  approverName: string | null;
  approverInitials: string | null;
  /** 0–100, share of the REQUIRED checklist rows that are complete. */
  readiness: number;
  requiredCount: number;
  requiredCompleteCount: number;
  optionalCount: number;
  optionalCompleteCount: number;
  decidedAt: string | null;
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
  /** The current decision (`superseded_by IS NULL`), or null if never decided. */
  decision: DecisionDto | null;
  /** Days from today to `dueDate` (negative = past). */
  daysUntilDue: number;
  /** Not decided and the due date has passed. */
  overdue: boolean;
  canDecide: boolean;
  decisionBlockedReason: string | null;
}

/** Summary of one baseline snapshot. */
export interface PlanVersionDto {
  id: string;
  name: string;
  baselineDate: string;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string | null;
  projectId: string | null;
  projectCode: string | null;
  projectName: string | null;
  checkpointId: string | null;
  outcome: string | null;
  totals: {
    checkpoints: number;
    sprints: number;
    workItems: number;
    storyPoints: number;
    completedStoryPoints: number;
  } | null;
  /** Present only with `include=snapshot`. */
  snapshot?: unknown;
}

/** One in-app notification. There is no e-mail channel in this app. */
export interface NotificationDto {
  id: string;
  title: string;
  body: string;
  entityType: string | null;
  entityId: string | null;
  readAt: string | null;
  createdAt: string | null;
}
