// Zod contracts for work items, comments, dependencies and worklogs.
//
// CLIENT-SAFE: only `zod` + the pagination fragment from lib/domain/data. The
// forms on /work-items validate against these exact schemas, so the client can
// never send a shape the server rejects for a reason the client could have
// caught first.
//
// Messages are Slovak because `defineRoute` surfaces the FIRST zod issue to the
// user verbatim as `{ error: "<slovenská správa>" }`.
//
// HARD DOMAIN RULES ENCODED HERE:
//   * item types are exactly task | bug | idea — no epic/feature/story/subtask
//   * statuses are exactly backlog | in_progress | waiting | done
//   * there are NO prioritisation score fields (value/risk/urgency/effort);
//     order is the manual `rankValue`, priority is the secondary key
//   * `assigneeId` / `reporterId` are app_users ids, never free text;
//     `null` means "Nepriradené"
//   * the two-level `parent_id` limit is enforced by the SERVER (it needs the
//     stored parent to decide) — see lib/domain/workItems.parentPlacementError

import { z } from "zod";
import { paginationSchema } from "@/lib/domain/data";

// ---------------------------------------------------------------------------
// Vocabularies (EN keys in the DB, SK labels in the i18n layer)
// ---------------------------------------------------------------------------

export const WORK_ITEM_STATUSES = [
  "backlog",
  "in_progress",
  "waiting",
  "done",
] as const;
export type WorkItemStatus = (typeof WORK_ITEM_STATUSES)[number];

export const WORK_ITEM_TYPES = ["task", "bug", "idea"] as const;
export type WorkItemType = (typeof WORK_ITEM_TYPES)[number];

export const PRIORITIES = ["P1", "P2", "P3"] as const;
export type Priority = (typeof PRIORITIES)[number];

/** Actions accepted by `POST /api/work-items/[id]/[action]`. */
export const WORK_ITEM_ACTIONS = ["move", "rank", "transition"] as const;
export type WorkItemAction = (typeof WORK_ITEM_ACTIONS)[number];

export const workItemStatusSchema = z.enum(WORK_ITEM_STATUSES, {
  message: "Neplatný stav položky.",
});
export const workItemTypeSchema = z.enum(WORK_ITEM_TYPES, {
  message: "Neplatný typ položky.",
});
export const prioritySchema = z.enum(PRIORITIES, {
  message: "Neplatná priorita.",
});

// ---------------------------------------------------------------------------
// Primitive field schemas
// ---------------------------------------------------------------------------

/** A CHAR(36) primary key reference. */
export const idSchema = z
  .string()
  .trim()
  .min(1, "Chýba identifikátor.")
  .max(36, "Neplatný identifikátor.");

/** A calendar day, `YYYY-MM-DD` (DATE columns). */
export const isoDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Dátum musí byť vo formáte RRRR-MM-DD.");

/** Optimistic-concurrency token; `defineRoute({ version: true })` lifts it out. */
export const versionSchema = z.coerce
  .number()
  .int()
  .min(1, "Chýba verzia záznamu — obnovte údaje a skúste to znova.");

const titleSchema = z
  .string()
  .trim()
  .min(2, "Zadajte názov (aspoň 2 znaky).")
  .max(255, "Názov je príliš dlhý.");

const descriptionSchema = z
  .string()
  .trim()
  .max(8000, "Popis je príliš dlhý.");

const storyPointsSchema = z.coerce
  .number()
  .int("Story pointy musia byť celé číslo.")
  .min(0, "Story pointy nemôžu byť negatívne.")
  .max(999, "Story pointy sú príliš vysoké.");

const rankValueSchema = z.coerce
  .number()
  .int("Poradie musí byť celé číslo.")
  .min(0, "Poradie nemôže byť negatívne.")
  .max(2_000_000_000, "Poradie je príliš vysoké.");

// ---------------------------------------------------------------------------
// GET /api/work-items
// ---------------------------------------------------------------------------

/** Sort keys accepted by the list endpoint (mapped to columns server-side). */
export const WORK_ITEM_SORT_KEYS = [
  "rank",
  "priority",
  "title",
  "status",
  "dueDate",
  "storyPoints",
  "updatedAt",
  "createdAt",
] as const;

export const workItemListQuerySchema = z.object({
  ...paginationSchema,
  projectId: idSchema.optional(),
  sprintId: idSchema.optional(),
  checkpointId: idSchema.optional(),
  /** `"none"` selects top-level items only; an id selects one parent's children. */
  parentId: z.union([idSchema, z.literal("none")]).optional(),
  status: workItemStatusSchema.optional(),
  statusCategory: workItemStatusSchema.optional(),
  itemType: workItemTypeSchema.optional(),
  priority: prioritySchema.optional(),
  /** `"none"` selects unassigned items ("Nepriradené"). */
  assigneeId: z.union([idSchema, z.literal("none")]).optional(),
  /** `"1"` restricts the list to the items in no sprint (the backlog). */
  backlog: z.enum(["1", "0"]).optional(),
  /** `"1"` hides everything already done. */
  openOnly: z.enum(["1", "0"]).optional(),
  /** Due on or before this day (overdue/upcoming filters). */
  dueBefore: isoDateSchema.optional(),
  /** Free-text search over title + description. */
  q: z.string().trim().max(128, "Hľadaný výraz je príliš dlhý.").optional(),
  sort: z.enum(WORK_ITEM_SORT_KEYS).optional(),
  dir: z.enum(["asc", "desc"]).optional(),
});
export type WorkItemListQuery = z.infer<typeof workItemListQuerySchema>;

// ---------------------------------------------------------------------------
// POST /api/work-items
// ---------------------------------------------------------------------------

export const workItemCreateSchema = z.object({
  projectId: idSchema,
  sprintId: idSchema.nullish(),
  checkpointId: idSchema.nullish(),
  /** Set to make this a subtask. The server rejects a parent that has a parent. */
  parentId: idSchema.nullish(),
  itemType: workItemTypeSchema.default("task"),
  title: titleSchema,
  description: descriptionSchema.nullish(),
  status: workItemStatusSchema.default("backlog"),
  priority: prioritySchema.default("P2"),
  storyPoints: storyPointsSchema.default(0),
  /** Omit to append to the end of the backlog. */
  rankValue: rankValueSchema.optional(),
  assigneeId: idSchema.nullish(),
  reporterId: idSchema.nullish(),
  dueDate: isoDateSchema.nullish(),
});
export type WorkItemCreateInput = z.infer<typeof workItemCreateSchema>;

// ---------------------------------------------------------------------------
// PATCH /api/work-items/[id]
// ---------------------------------------------------------------------------

const workItemPatchFields = {
  sprintId: idSchema.nullish(),
  checkpointId: idSchema.nullish(),
  parentId: idSchema.nullish(),
  itemType: workItemTypeSchema.optional(),
  title: titleSchema.optional(),
  description: descriptionSchema.nullish(),
  status: workItemStatusSchema.optional(),
  priority: prioritySchema.optional(),
  storyPoints: storyPointsSchema.optional(),
  rankValue: rankValueSchema.optional(),
  assigneeId: idSchema.nullish(),
  reporterId: idSchema.nullish(),
  dueDate: isoDateSchema.nullish(),
} as const;

export const workItemUpdateSchema = z
  .object({ version: versionSchema, ...workItemPatchFields })
  .refine(
    (v) =>
      Object.keys(v).some((k) => k !== "version" && v[k as keyof typeof v] !== undefined),
    { message: "Nie je čo zmeniť." },
  );
export type WorkItemUpdateInput = z.infer<typeof workItemUpdateSchema>;

// ---------------------------------------------------------------------------
// POST /api/work-items/[id]/[action]
// ---------------------------------------------------------------------------

/** `move` — put the item into a sprint (`null` = back to the backlog). */
export const workItemMoveSchema = z.object({
  version: versionSchema,
  sprintId: idSchema.nullable(),
  /** Optional landing position inside the target bucket. */
  rankValue: rankValueSchema.optional(),
});
export type WorkItemMoveInput = z.infer<typeof workItemMoveSchema>;

/**
 * `rank` — manual ordering. Either an absolute `rankValue` (drag & drop) or a
 * one-step `direction` swap with the neighbour (the keyboard alternative).
 */
export const workItemRankSchema = z
  .object({
    version: versionSchema,
    rankValue: rankValueSchema.optional(),
    direction: z.enum(["up", "down"], { message: "Neplatný smer posunu." }).optional(),
  })
  .refine((v) => (v.rankValue === undefined) !== (v.direction === undefined), {
    message: "Zadajte poradie alebo smer posunu, nie oboje.",
  });
export type WorkItemRankInput = z.infer<typeof workItemRankSchema>;

/** `transition` — status change (board column drop / status select). */
export const workItemTransitionSchema = z.object({
  version: versionSchema,
  status: workItemStatusSchema,
});
export type WorkItemTransitionInput = z.infer<typeof workItemTransitionSchema>;

/**
 * The permissive envelope `POST /api/work-items/[id]/[action]` declares to
 * `defineRoute` (one route, three action bodies). The handler then re-validates
 * against the action's own schema above, so each action still gets its exact
 * shape and its own Slovak message.
 */
export const workItemActionBodySchema = z.object({
  version: versionSchema,
  sprintId: idSchema.nullish(),
  rankValue: rankValueSchema.optional(),
  direction: z.enum(["up", "down"], { message: "Neplatný smer posunu." }).optional(),
  status: workItemStatusSchema.optional(),
});
export type WorkItemActionInput = z.infer<typeof workItemActionBodySchema>;

// ---------------------------------------------------------------------------
// DELETE /api/work-items/[id]
// ---------------------------------------------------------------------------

/** Delete is a hard delete (no soft delete anywhere) and still CAS-checked. */
export const workItemDeleteSchema = z.object({ version: versionSchema });

// ---------------------------------------------------------------------------
// Comments — /api/work-items/[id]/comment
// ---------------------------------------------------------------------------

const commentBodySchema = z
  .string()
  .trim()
  .min(1, "Komentár je prázdny.")
  .max(5000, "Komentár je príliš dlhý.");

export const commentListQuerySchema = z.object({ ...paginationSchema });
export type CommentListQuery = z.infer<typeof commentListQuerySchema>;

export const commentCreateSchema = z.object({ body: commentBodySchema });
export type CommentCreateInput = z.infer<typeof commentCreateSchema>;

/** Editing stamps `edited_at`; only the author (or an admin) may do it. */
export const commentUpdateSchema = z.object({
  commentId: idSchema,
  body: commentBodySchema,
});
export type CommentUpdateInput = z.infer<typeof commentUpdateSchema>;

// ---------------------------------------------------------------------------
// Dependencies — /api/work-items/[id]/dependencies
// ---------------------------------------------------------------------------

/**
 * Only the `blocks` relation exists (no lag days, no other types).
 * `direction: "blocks"` — this item blocks `targetId`.
 * `direction: "blocked_by"` — `targetId` blocks this item.
 */
export const dependencyCreateSchema = z.object({
  targetId: idSchema,
  direction: z
    .enum(["blocks", "blocked_by"], { message: "Neplatný typ závislosti." })
    .default("blocks"),
});
export type DependencyCreateInput = z.infer<typeof dependencyCreateSchema>;

export const dependencyDeleteQuerySchema = z
  .object({
    /** The item this one blocks. */
    targetId: idSchema.optional(),
    /** The item that blocks this one. */
    sourceId: idSchema.optional(),
  })
  .refine((v) => (v.targetId === undefined) !== (v.sourceId === undefined), {
    message: "Zadajte presne jednu stranu závislosti (targetId alebo sourceId).",
  });
export type DependencyDeleteQuery = z.infer<typeof dependencyDeleteQuerySchema>;

// ---------------------------------------------------------------------------
// Worklogs — /api/worklogs (OPTIONAL time tracking; nothing requires it)
// ---------------------------------------------------------------------------

const minutesSchema = z.coerce
  .number()
  .int("Zadajte platný čas od 1 do 1440 minút.")
  .min(1, "Zadajte platný čas od 1 do 1440 minút.")
  .max(1440, "Zadajte platný čas od 1 do 1440 minút.");

export const worklogCreateSchema = z.object({
  workItemId: idSchema,
  minutes: minutesSchema,
  /** Defaults to today (server-side, Europe/Bratislava). */
  workDate: isoDateSchema.optional(),
  description: z.string().trim().max(500, "Popis je príliš dlhý.").optional(),
  /** Log on behalf of somebody else — admins only, ignored otherwise. */
  userId: idSchema.optional(),
});
export type WorklogCreateInput = z.infer<typeof worklogCreateSchema>;

export const worklogListQuerySchema = z.object({
  ...paginationSchema,
  workItemId: idSchema.optional(),
  projectId: idSchema.optional(),
  userId: idSchema.optional(),
  /** `"1"` restricts the list to the signed-in user's own worklogs. */
  mine: z.enum(["1", "0"]).optional(),
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
});
export type WorklogListQuery = z.infer<typeof worklogListQuerySchema>;

export const worklogDeleteQuerySchema = z.object({ id: idSchema });
export type WorklogDeleteQuery = z.infer<typeof worklogDeleteQuerySchema>;

// ---------------------------------------------------------------------------
// Wire shapes (shared with the client)
// ---------------------------------------------------------------------------

export interface WorkItemDto {
  id: string;
  projectId: string;
  projectCode: string | null;
  projectName: string | null;
  sprintId: string | null;
  sprintName: string | null;
  checkpointId: string | null;
  parentId: string | null;
  itemType: WorkItemType;
  title: string;
  description: string | null;
  status: WorkItemStatus;
  statusCategory: WorkItemStatus;
  priority: Priority;
  /** Effective points: the sum of the subtasks when there are any (spec Q26). */
  storyPoints: number;
  /** The value stored on this row — what an edit form binds to. */
  ownStoryPoints: number;
  /** Sum of the subtasks' points (0 when it has none). */
  childStoryPoints: number;
  childCount: number;
  rankValue: number;
  assigneeId: string | null;
  assigneeName: string | null;
  assigneeInitials: string | null;
  reporterId: string | null;
  reporterName: string | null;
  dueDate: string | null;
  loggedMinutes: number;
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface WorkItemCommentDto {
  id: string;
  workItemId: string;
  authorId: string;
  authorName: string | null;
  authorInitials: string | null;
  body: string;
  editedAt: string | null;
  createdAt: string | null;
}

/** One end of a `blocks` relation, resolved for display. */
export interface DependencyRefDto {
  id: string;
  title: string;
  status: WorkItemStatus;
  projectId: string;
  createdAt: string | null;
}

export interface DependencyListDto {
  /** Items this item blocks. */
  blocks: DependencyRefDto[];
  /** Items that block this item. */
  blockedBy: DependencyRefDto[];
}

export interface WorklogDto {
  id: string;
  workItemId: string;
  workItemTitle: string | null;
  userId: string;
  userName: string | null;
  projectId: string;
  workDate: string | null;
  minutes: number;
  description: string;
  createdAt: string | null;
}
