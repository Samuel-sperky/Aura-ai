// GET /api/overview — the ONE aggregate read behind `/` (Prehľad).
//
// The dashboard used to fire SEVEN parallel list requests (`/api/projects`,
// `/api/checkpoints` ×2, `/api/sprints`, `/api/work-items` ×2, `/api/audit`).
// Rate-limit buckets are keyed by CLIENT IP, so a team behind one NAT address
// shares a single bucket and seven requests per screen burned it seven times as
// fast — the visible symptom was every panel rendering "Údaje sa nepodarilo
// načítať", which reads as a data bug rather than a throttle. This contract is
// the fix: one request, one response, everything the screen renders.
//
// WHAT IS IN HERE AND WHY IT IS SHAPED LIKE THIS:
//   * `kpis` — the six tiles, computed SERVER-side (see lib/domain/overview.ts).
//     The field names deliberately match `components/overview/summary.SummaryKpis`
//     minus its two chart-derived numbers, so the copied CEO summary can spread
//     this block straight in.
//   * `projects` / `openCheckpoints` — the existing module DTOs, unchanged. They
//     are referenced by TYPE (`dtoRef`) rather than restated as zod objects: a
//     second, hand-maintained copy of a 40-field DTO would drift, and a zod
//     `object()` STRIPS unknown keys, so parsing a response through a stale copy
//     would silently delete fields. Runtime validation of those two arrays is
//     therefore structural only.
//   * `doneItems` — the 12-week chart's inputs and nothing else. `bucketDonePoints`
//     reads exactly `updatedAt` + `ownStoryPoints`; sending 2 000 complete work
//     items to feed two fields is what an aggregate endpoint exists to avoid.
//   * `activity` — the audit rows. EMPTY (never 403) for a caller without
//     `audit.read`, so the dashboard works for an Editor and a Prehliadač too.
//
// No `t()` keys live here — the endpoint returns data, and every label on the
// screen is already owned by `keys.overview.ts`.

import { z } from "zod";
import type { CheckpointDto } from "./checkpoints";
import type { ProjectDto } from "./projects";

/**
 * Reference an existing module DTO from a response schema without restating its
 * fields. `z.infer` yields the exact TS type; the runtime check is structural
 * ("a non-null object"), and nothing is stripped on parse.
 */
function dtoRef<T>(label: string): z.ZodType<T> {
  return z.custom<T>((v) => typeof v === "object" && v !== null, {
    message: `Neplatný ${label}.`,
  });
}

// ---------------------------------------------------------------------------
// The six KPI tiles
// ---------------------------------------------------------------------------

/**
 * The tiles as the strip shows them, left to right. The two remaining numbers of
 * the CEO summary (`donePointsWindow`, `donePointsDelta`) stay client-side: they
 * are sums over the chart buckets the client already computes from `doneItems`.
 */
export const overviewKpisSchema = z.object({
  /** Projects whose status is anything but `planned`. */
  activeProjects: z.number().int().nonnegative(),
  /** Projects with `red` or `amber` health. */
  projectsAtRisk: z.number().int().nonnegative(),
  /** Checkpoints not yet decided (the whole decision queue, not one page of it). */
  openCheckpoints: z.number().int().nonnegative(),
  /** Undecided checkpoints where the CALLER is the approver. */
  myDecisions: z.number().int().nonnegative(),
  /** Name of the active sprint, or null when none is running. */
  sprintName: z.string().nullable(),
  /** Done points / planned capacity in %, or null without an active sprint. */
  sprintCapacityUsedPercent: z.number().nullable(),
  /** Open items whose due date has passed (an item due TODAY is not late). */
  overdueItems: z.number().int().nonnegative(),
});
export type OverviewKpisDto = z.infer<typeof overviewKpisSchema>;

// ---------------------------------------------------------------------------
// Chart input
// ---------------------------------------------------------------------------

/**
 * One completed work item, reduced to what the "done points per week" chart
 * buckets by. Structurally satisfies `components/overview/weeks.CompletedItemLike`.
 *
 * `ownStoryPoints` is the value stored ON THE ROW, never the parent roll-up:
 * summing the effective points of a parent AND its subtasks counts the same work
 * twice (see weeks.ts).
 */
export const overviewDoneItemSchema = z.object({
  id: z.string(),
  /** ISO instant of the last change — the completion week for a done item. */
  updatedAt: z.string().nullable(),
  ownStoryPoints: z.number(),
});
export type OverviewDoneItemDto = z.infer<typeof overviewDoneItemSchema>;

// ---------------------------------------------------------------------------
// Activity panel
// ---------------------------------------------------------------------------

/**
 * One "Posledná aktivita" row: the `audit_log` fields the panel renders, and no
 * more. `old_values` / `new_values` are never exposed here (same rule as
 * `GET /api/audit`); `detail` is unwrapped from the `__audit` envelope.
 */
export const overviewActivitySchema = z.object({
  /** BIGINT id, stringified so the wire shape stays stable. */
  id: z.string(),
  /** Actor e-mail (`audit_log.username`), null for a pre-auth event. */
  userEmail: z.string().nullable(),
  action: z.string(),
  entity: z.string().nullable(),
  entityId: z.string().nullable(),
  ts: z.string().nullable(),
  detail: z.string().nullable(),
});
export type OverviewActivityDto = z.infer<typeof overviewActivitySchema>;

// ---------------------------------------------------------------------------
// The response
// ---------------------------------------------------------------------------

/**
 * `GET /api/overview` — the whole dashboard in one payload.
 *
 * NOT parsed on the way out: the handler returns an already-typed `OverviewDto`,
 * and running the response through a schema that references DTOs structurally
 * would validate nothing while risking a silent strip. It is the wire contract
 * the unit tests assert against, and the source of the TS type the client uses.
 */
export const overviewResponseSchema = z.object({
  kpis: overviewKpisSchema,
  /** Risk-first (health, then nearest checkpoint) — same order as `sort=risk`. */
  projects: z.array(dtoRef<ProjectDto>("projekt")),
  /** Undecided checkpoints, nearest due date first. */
  openCheckpoints: z.array(dtoRef<CheckpointDto>("checkpoint")),
  /** Done items, newest change first. */
  doneItems: z.array(overviewDoneItemSchema),
  /** Newest first; empty without `audit.read`. */
  activity: z.array(overviewActivitySchema),
});
export type OverviewDto = z.infer<typeof overviewResponseSchema>;
