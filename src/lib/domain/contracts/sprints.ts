// Zod contracts for sprints and the sprint lifecycle actions.
//
// CLIENT-SAFE: only `zod`, the pagination fragment and the primitive field
// schemas shared with the work-item contract.
//
// HARD DOMAIN RULES ENCODED HERE:
//   * a sprint belongs to a PROJECT — there is no `team_id` and no `workstream`
//     (teams are out of scope)
//   * lifecycle: draft → planned → active → review → completed, plus cancelled
//   * the sprint GOAL is mandatory before `commit` — enforced server-side in
//     lib/domain/sprints.sprintActionError, because the goal lives on the stored
//     row and not in the action body
//   * capacity is per PERSON, derived from `capacity_points` + `assignee_id`

import { z } from "zod";
import { paginationSchema } from "@/lib/domain/data";
import { idSchema, isoDateSchema, versionSchema } from "./workItems";

// ---------------------------------------------------------------------------
// Vocabularies
// ---------------------------------------------------------------------------

export const SPRINT_STATUSES = [
  "draft",
  "planned",
  "active",
  "review",
  "completed",
  "cancelled",
] as const;
export type SprintStatus = (typeof SPRINT_STATUSES)[number];

/** Actions accepted by `POST /api/sprints/[id]/[action]`. */
export const SPRINT_ACTIONS = [
  "commit",
  "start",
  "review",
  "close",
  "cancel",
  "carry-over",
] as const;
export type SprintAction = (typeof SPRINT_ACTIONS)[number];

export const sprintStatusSchema = z.enum(SPRINT_STATUSES, {
  message: "Neplatný stav šprintu.",
});
export const sprintActionSchema = z.enum(SPRINT_ACTIONS, {
  message: "Neznáma akcia šprintu.",
});

// ---------------------------------------------------------------------------
// Field schemas
// ---------------------------------------------------------------------------

const sprintNameSchema = z
  .string()
  .trim()
  .min(2, "Zadajte názov šprintu (aspoň 2 znaky).")
  .max(160, "Názov šprintu je príliš dlhý.");

/** The sprint goal. Empty is allowed on a draft — `commit` then refuses. */
const goalSchema = z.string().trim().max(1000, "Cieľ šprintu je príliš dlhý.");

const pointsSchema = z.coerce
  .number()
  .int("Kapacita musí byť celé číslo.")
  .min(0, "Kapacita nemôže byť negatívna.")
  .max(9999, "Kapacita je príliš vysoká.");

const cadenceSchema = z.coerce
  .number()
  .int()
  .min(1, "Kadencia je 1 až 4 týždne.")
  .max(4, "Kadencia je 1 až 4 týždne.");

// ---------------------------------------------------------------------------
// GET /api/sprints
// ---------------------------------------------------------------------------

export const SPRINT_SORT_KEYS = [
  "startDate",
  "endDate",
  "name",
  "status",
  "createdAt",
] as const;

export const sprintListQuerySchema = z.object({
  ...paginationSchema,
  projectId: idSchema.optional(),
  status: sprintStatusSchema.optional(),
  /** `"1"` keeps only draft/planned/active/review (everything still in play). */
  openOnly: z.enum(["1", "0"]).optional(),
  /** Overlap window for the timeline: sprints running inside [from, to]. */
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
  q: z.string().trim().max(128, "Hľadaný výraz je príliš dlhý.").optional(),
  sort: z.enum(SPRINT_SORT_KEYS).optional(),
  dir: z.enum(["asc", "desc"]).optional(),
});
export type SprintListQuery = z.infer<typeof sprintListQuerySchema>;

// ---------------------------------------------------------------------------
// POST /api/sprints
// ---------------------------------------------------------------------------

export const sprintCreateSchema = z
  .object({
    projectId: idSchema,
    name: sprintNameSchema,
    goal: goalSchema.nullish(),
    startDate: isoDateSchema,
    endDate: isoDateSchema,
    capacityPoints: pointsSchema.default(0),
    cadenceWeeks: cadenceSchema.default(2),
  })
  .refine((v) => v.endDate >= v.startDate, {
    path: ["endDate"],
    message: "Koniec šprintu nemôže byť pred jeho začiatkom.",
  });
export type SprintCreateInput = z.infer<typeof sprintCreateSchema>;

// ---------------------------------------------------------------------------
// PATCH /api/sprints/[id]
// ---------------------------------------------------------------------------

/**
 * `status` is deliberately NOT patchable: the lifecycle moves through
 * `POST /api/sprints/[id]/[action]` so every transition runs its guards and
 * writes its audit row.
 */
export const sprintUpdateSchema = z
  .object({
    version: versionSchema,
    name: sprintNameSchema.optional(),
    goal: goalSchema.nullish(),
    startDate: isoDateSchema.optional(),
    endDate: isoDateSchema.optional(),
    capacityPoints: pointsSchema.optional(),
    cadenceWeeks: cadenceSchema.optional(),
  })
  .refine(
    (v) =>
      Object.keys(v).some(
        (k) => k !== "version" && v[k as keyof typeof v] !== undefined,
      ),
    { message: "Nie je čo zmeniť." },
  )
  .refine(
    (v) =>
      v.startDate === undefined ||
      v.endDate === undefined ||
      v.endDate >= v.startDate,
    { path: ["endDate"], message: "Koniec šprintu nemôže byť pred jeho začiatkom." },
  );
export type SprintUpdateInput = z.infer<typeof sprintUpdateSchema>;

// ---------------------------------------------------------------------------
// POST /api/sprints/[id]/[action]
// ---------------------------------------------------------------------------

/**
 * One body shape for every action. `targetSprintId` is only read by
 * `carry-over`, where `null` means "move the leftovers back to the backlog";
 * omitting it there is rejected so the destination is always deliberate.
 */
export const sprintActionBodySchema = z.object({
  version: versionSchema,
  targetSprintId: idSchema.nullish(),
  /** Free-text note stored in the audit row (e.g. why a sprint was cancelled). */
  note: z.string().trim().max(1000, "Poznámka je príliš dlhá.").optional(),
});
export type SprintActionInput = z.infer<typeof sprintActionBodySchema>;

// ---------------------------------------------------------------------------
// Wire shapes (shared with the client)
// ---------------------------------------------------------------------------

export interface SprintDto {
  id: string;
  projectId: string;
  projectCode: string | null;
  projectName: string | null;
  name: string;
  goal: string | null;
  startDate: string | null;
  endDate: string | null;
  status: SprintStatus;
  capacityPoints: number;
  /** Frozen at `commit` — the baseline every scope change is measured against. */
  committedPoints: number;
  /** Written at `close`. */
  completedPoints: number;
  cadenceWeeks: number;
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
}

/** Live metrics computed on read (never stored except committed/completed). */
export interface SprintMetricsDto {
  itemCount: number;
  openItemCount: number;
  doneItemCount: number;
  /** Sum of the leaf items' story points currently in the sprint. */
  currentPoints: number;
  /** Sum of the DONE leaf items' story points. */
  donePoints: number;
  /** currentPoints − committedPoints (0 before commit). */
  scopeChangePoints: number;
  /** Same as a share of the commitment, in %. */
  scopeChangePercent: number;
  /** donePoints / capacityPoints in % (0 when no capacity is planned). */
  capacityUsedPercent: number;
}

export interface SprintWithMetricsDto extends SprintDto {
  metrics: SprintMetricsDto;
}

/** One row of the per-person capacity panel (`capacity` is per PERSON). */
export interface CapacityRowDto {
  assigneeId: string | null;
  assigneeName: string | null;
  assigneeInitials: string | null;
  itemCount: number;
  openItemCount: number;
  committedPoints: number;
  completedPoints: number;
  /** The sprint capacity split across the people who actually have items. */
  capacityPoints: number;
  /** committedPoints / capacityPoints in % (0 when no capacity is planned). */
  loadPercent: number;
}

export interface CapacityBreakdownDto {
  /** The sprint's total planned capacity. */
  capacityPoints: number;
  /** Capacity share per person (total / number of people with items). */
  capacityPerPerson: number;
  rows: CapacityRowDto[];
}
