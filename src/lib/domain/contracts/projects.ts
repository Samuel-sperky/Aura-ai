// Zod contracts for projects, areas and the two preference stores.
//
// CLIENT-SAFE: only `zod` + the framework-free page catalog. The project table,
// the detail modal and the route handlers all validate against these exact
// schemas, so the client can never send a shape the server rejects for a reason
// the client could have caught first.
//
// Error messages are Slovak because `defineRoute` surfaces the FIRST zod issue
// straight to the user as `{ error: "<slovenská správa>" }`.
//
// The domain dictionaries here are the EN keys persisted in the DB; the SK
// labels live in `lib/i18n/keys.projects.ts`.

import { z } from "zod";
import { PAGE_KEYS } from "@/lib/auth/rights";
import { MAX_PAGE_SIZE, paginationSchema } from "@/lib/domain/data";

// ---------------------------------------------------------------------------
// Domain dictionaries (EN keys in the DB, SK labels in the UI)
// ---------------------------------------------------------------------------

/** `projects.status` — Na pláne / V riziku / Blokovaný / Plánovaný. */
export const PROJECT_STATUSES = [
  "on_track",
  "at_risk",
  "blocked",
  "planned",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

/**
 * `projects.health` — green ≥100 % of the time-based expectation, amber 60–99 %,
 * red <60 %, grey no data. There is deliberately no `blue` (the source app had
 * one; the contract removed it).
 */
export const PROJECT_HEALTHS = ["green", "amber", "red", "grey"] as const;
export type ProjectHealth = (typeof PROJECT_HEALTHS)[number];

/** Shared priority scale (projects and work items). */
export const PRIORITIES = ["P1", "P2", "P3"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const projectStatusSchema = z.enum(PROJECT_STATUSES, {
  message: "Neplatný stav projektu.",
});
export const projectHealthSchema = z.enum(PROJECT_HEALTHS, {
  message: "Neplatné zdravie projektu.",
});
export const prioritySchema = z.enum(PRIORITIES, {
  message: "Neplatná priorita.",
});

// ---------------------------------------------------------------------------
// Field schemas
// ---------------------------------------------------------------------------

/** `YYYY-MM-DD`. DATE columns cross the wire as date-only strings, never as ISO
 *  timestamps — a timestamp would drag the timezone into a calendar value. */
export const dateOnlySchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Dátum musí byť vo formáte RRRR-MM-DD.");

/** A nullable DATE input: the string, or an explicit null to clear it. */
const nullableDate = dateOnlySchema.nullable();

/**
 * Project code — the human handle (`IT-401`). Uppercased and unique. Restricted
 * to A–Z, 0–9, `-`, `_`, `.` so it stays URL- and filename-safe.
 */
export const projectCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(2, "Kód projektu musí mať aspoň 2 znaky.")
  .max(32, "Kód projektu je príliš dlhý.")
  .regex(
    /^[A-Z0-9][A-Z0-9._-]*$/,
    "Kód projektu môže obsahovať len veľké písmená, číslice, bodku, pomlčku a podčiarkovník.",
  );

const projectNameSchema = z
  .string()
  .trim()
  .min(2, "Názov projektu musí mať aspoň 2 znaky.")
  .max(160, "Názov projektu je príliš dlhý.");

const descriptionSchema = z
  .string()
  .trim()
  .max(4000, "Popis je príliš dlhý.")
  .nullable();

/**
 * Area ("oblasť") — the single grouping level that replaced portfolio/program.
 * Free text on purpose: there is no `areas` table, the list of areas is
 * `SELECT DISTINCT area FROM projects` (see `GET /api/areas`).
 */
export const areaSchema = z
  .string()
  .trim()
  .max(80, "Oblasť je príliš dlhá.");

const ownerSchema = z.string().trim().max(128, "Vlastník je príliš dlhý.");
const ownerInitialsSchema = z
  .string()
  .trim()
  .toUpperCase()
  .max(8, "Iniciály sú príliš dlhé.");

/**
 * Optimistic-concurrency token. `projects` carries no `version` column (contract
 * §5.3 puts `version` only on checkpoints/sprints/work_items), so the token is
 * derived from the row's last-write timestamp — see `projectVersion()` in
 * `lib/domain/projects.ts`. The wire contract is identical to the versioned
 * tables: an integer that the client echoes back on PATCH.
 */
export const versionSchema = z
  .number()
  .int("Verzia záznamu musí byť celé číslo.")
  .min(1, "Neplatná verzia záznamu.");

// ---------------------------------------------------------------------------
// GET /api/projects
// ---------------------------------------------------------------------------

/**
 * Sort keys accepted by the list endpoint. `risk` is the default and means
 * "health first (red at the top), then the nearest checkpoint" (spec Q2).
 * The mapping to real SQL columns is an allow-list in `lib/domain/projects.ts`.
 */
export const PROJECT_SORT_KEYS = [
  "risk",
  "code",
  "name",
  "area",
  "status",
  "health",
  "progress",
  "priority",
  "startDate",
  "endDate",
  "nextCheckpointDate",
  "updatedAt",
] as const;
export type ProjectSortKey = (typeof PROJECT_SORT_KEYS)[number];

export const projectListQuerySchema = z.object({
  ...paginationSchema,
  area: areaSchema.optional(),
  status: projectStatusSchema.optional(),
  priority: prioritySchema.optional(),
  health: projectHealthSchema.optional(),
  /** Free text over code + name + description + owner + area. */
  q: z.string().trim().max(128, "Hľadaný výraz je príliš dlhý.").optional(),
  sort: z.enum(PROJECT_SORT_KEYS, { message: "Neplatné zoradenie." }).optional(),
  dir: z.enum(["asc", "desc"], { message: "Neplatný smer zoradenia." }).optional(),
});
export type ProjectListQuery = z.infer<typeof projectListQuerySchema>;

// ---------------------------------------------------------------------------
// POST /api/projects
// ---------------------------------------------------------------------------

/**
 * `progress`, `nextCheckpoint` and `nextCheckpointDate` are absent on purpose:
 * all three are COMPUTED server-side (spec Q17) and are never client input.
 */
export const projectCreateSchema = z
  .object({
    code: projectCodeSchema,
    name: projectNameSchema,
    description: descriptionSchema.optional(),
    area: areaSchema.default(""),
    status: projectStatusSchema.default("planned"),
    /** Manual (spec Q18); `suggestHealth()` only proposes a value in the UI. */
    health: projectHealthSchema.default("grey"),
    owner: ownerSchema.default(""),
    /** Derived from `owner` when omitted. */
    ownerInitials: ownerInitialsSchema.optional(),
    startDate: nullableDate.optional(),
    endDate: nullableDate.optional(),
    priority: prioritySchema.default("P2"),
  })
  .refine(
    (v) => !v.startDate || !v.endDate || v.startDate <= v.endDate,
    { path: ["endDate"], message: "Koniec nemôže byť pred začiatkom." },
  );
export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;

// ---------------------------------------------------------------------------
// PATCH /api/projects/[id]
// ---------------------------------------------------------------------------

/** The editable fields, all optional — `version` is mandatory (see below). */
export const projectPatchFields = {
  code: projectCodeSchema.optional(),
  name: projectNameSchema.optional(),
  description: descriptionSchema.optional(),
  area: areaSchema.optional(),
  status: projectStatusSchema.optional(),
  health: projectHealthSchema.optional(),
  owner: ownerSchema.optional(),
  ownerInitials: ownerInitialsSchema.optional(),
  startDate: nullableDate.optional(),
  endDate: nullableDate.optional(),
  priority: prioritySchema.optional(),
} as const;

/**
 * PATCH body: at least one editable field plus the concurrency token.
 * `defineRoute({ version: true })` lifts `version` out of the parsed body into
 * `ctx.version`, so the handler never re-reads it from `body`.
 */
export const projectUpdateSchema = z
  .object({ ...projectPatchFields, version: versionSchema })
  .refine(
    (v) =>
      Object.entries(v).some(([k, val]) => k !== "version" && val !== undefined),
    { message: "Nie je čo zmeniť." },
  )
  .refine(
    (v) => !v.startDate || !v.endDate || v.startDate <= v.endDate,
    { path: ["endDate"], message: "Koniec nemôže byť pred začiatkom." },
  );
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;

/** The editable subset without `version`, as handed to `updateProject()`. */
export type ProjectUpdateFields = Omit<ProjectUpdateInput, "version">;

// ---------------------------------------------------------------------------
// DELETE /api/projects/[id]
// ---------------------------------------------------------------------------

/**
 * Deleting a project hard-deletes it and cascades to its checkpoints, sprints,
 * work items and worklogs. Spec Q21 therefore requires the user to TYPE the
 * project code; the server verifies it so the guard is not merely cosmetic.
 */
export const projectDeleteSchema = z.object({
  code: projectCodeSchema,
});
export type ProjectDeleteInput = z.infer<typeof projectDeleteSchema>;

// ---------------------------------------------------------------------------
// GET /api/preferences  ·  PUT /api/preferences
// ---------------------------------------------------------------------------

export const THEME_MODES = ["system", "light", "dark"] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

export const DENSITIES = ["cozy", "compact"] as const;
export type Density = (typeof DENSITIES)[number];

export const LANGS = ["sk", "en"] as const;
export type PrefLang = (typeof LANGS)[number];

/** Server-side defaults: dark theme, cozy density, Slovak (contract §3.2/64). */
export const DEFAULT_PREFERENCES = {
  theme: "dark",
  density: "cozy",
  lang: "sk",
} as const satisfies UserPreferences;

export interface UserPreferences {
  theme: ThemeMode;
  density: Density;
  lang: PrefLang;
}

/**
 * A STORED preferences document, read defensively: an unknown value falls back to
 * its default (`.catch`) instead of throwing, so one bad row cannot break the
 * settings screen. Unknown keys are stripped.
 */
const storedPreferencesSchema = z.object({
  theme: z.enum(THEME_MODES).catch(DEFAULT_PREFERENCES.theme),
  density: z.enum(DENSITIES).catch(DEFAULT_PREFERENCES.density),
  lang: z.enum(LANGS).catch(DEFAULT_PREFERENCES.lang),
});

/**
 * Normalise a stored (or client-held) preferences document to a complete
 * `UserPreferences`. Pure and client-safe, so the theme provider and the API
 * always agree on the effective values.
 */
export function resolvePreferences(raw: unknown): UserPreferences {
  const source = raw != null && typeof raw === "object" ? raw : {};
  return storedPreferencesSchema.parse({ ...DEFAULT_PREFERENCES, ...source });
}

/** PUT /api/preferences — a partial patch merged over the stored row. */
export const preferencesUpdateSchema = z
  .object({
    theme: z.enum(THEME_MODES, { message: "Neplatná téma." }).optional(),
    density: z.enum(DENSITIES, { message: "Neplatná hustota." }).optional(),
    lang: z.enum(LANGS, { message: "Neplatný jazyk." }).optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: "Nie je čo zmeniť.",
  });
export type PreferencesUpdateInput = z.infer<typeof preferencesUpdateSchema>;

// ---------------------------------------------------------------------------
// GET /api/view-preferences/[page]  ·  PUT /api/view-preferences/[page]
// ---------------------------------------------------------------------------

/** The route key of a page whose filter set is remembered (spec Q20). */
export const pageKeySchema = z.enum(PAGE_KEYS, { message: "Neznámy pohľad." });

/** Serialized size cap for one stored view config (bounds the JSON column). */
export const MAX_VIEW_CONFIG_CHARS = 4000;

const filterValueSchema = z.union([
  z.string().max(200),
  z.number(),
  z.boolean(),
  z.array(z.string().max(200)).max(50),
]);

/**
 * One page's remembered view state. The known keys are typed; unknown keys pass
 * through (`looseObject`) so a page can remember something this contract has not
 * anticipated without a cross-module change. The total serialized size is capped
 * instead — that is the property that actually needs enforcing.
 */
export const viewConfigSchema = z
  .looseObject({
    view: z.string().trim().max(24).optional(),
    mode: z.string().trim().max(24).optional(),
    zoom: z.string().trim().max(16).optional(),
    sort: z.string().trim().max(40).optional(),
    dir: z.enum(["asc", "desc"]).optional(),
    pageSize: z.number().int().min(1).max(MAX_PAGE_SIZE).optional(),
    q: z.string().trim().max(128).optional(),
    groupBy: z.string().trim().max(40).optional(),
    columns: z.array(z.string().max(40)).max(50).optional(),
    filters: z.record(z.string().max(40), filterValueSchema).optional(),
  })
  .refine((v) => JSON.stringify(v).length <= MAX_VIEW_CONFIG_CHARS, {
    message: "Konfigurácia pohľadu je príliš veľká.",
  });
export type ViewConfig = z.infer<typeof viewConfigSchema>;

/** PUT /api/view-preferences/[page] */
export const viewPreferencesUpdateSchema = z.object({
  config: viewConfigSchema,
});
export type ViewPreferencesUpdateInput = z.infer<
  typeof viewPreferencesUpdateSchema
>;

// ---------------------------------------------------------------------------
// Wire shapes (shared with the client)
// ---------------------------------------------------------------------------

/** One project as returned by every project endpoint. */
export interface ProjectDto {
  id: string;
  code: string;
  name: string;
  description: string | null;
  area: string;
  status: ProjectStatus;
  health: ProjectHealth;
  /** 0–100, COMPUTED from the story points of the project's leaf work items. */
  progress: number;
  owner: string;
  ownerInitials: string;
  /** `YYYY-MM-DD` or null. */
  startDate: string | null;
  endDate: string | null;
  priority: Priority;
  /** COMPUTED cache of the nearest undecided checkpoint. */
  nextCheckpoint: string | null;
  nextCheckpointDate: string | null;
  /** Concurrency token — echo it back on PATCH (see `versionSchema`). */
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
}

/** One row of `GET /api/areas`. */
export interface AreaDto {
  name: string;
  projectCount: number;
}

/** Counts keyed by a domain dictionary value (missing keys are 0-filled). */
export type CountsByKey<K extends string> = Record<K, number>;

/** Aggregates behind the four tabs of the project detail modal (spec Q22). */
export interface ProjectStatsDto {
  workItems: {
    total: number;
    byStatus: CountsByKey<"backlog" | "in_progress" | "waiting" | "done">;
    byType: CountsByKey<"task" | "bug" | "idea">;
    storyPoints: { total: number; done: number };
    /** Not `done` and `due_date` before today. */
    overdue: number;
    loggedMinutes: number;
  };
  checkpoints: {
    total: number;
    byLifecycle: CountsByKey<"planned" | "ready" | "decided" | "blocked">;
    /** lifecycle <> 'decided'. */
    open: number;
    avgReadiness: number;
    nextDueDate: string | null;
  };
  sprints: {
    total: number;
    active: number;
    capacityPoints: number;
    committedPoints: number;
    completedPoints: number;
  };
  decisions: {
    total: number;
    byOutcome: CountsByKey<"go" | "conditional_go" | "no_go" | "deferred">;
  };
}

/** One row of the project detail "Aktivita" tab. */
export interface ProjectActivityDto {
  id: number;
  action: string;
  entity: string | null;
  entityId: string | null;
  actorEmail: string | null;
  detail: string | null;
  at: string | null;
}

/** `GET /api/projects/[id]` response body. */
export interface ProjectDetailDto {
  project: ProjectDto;
  stats: ProjectStatsDto;
  /** What `suggestHealth()` would pick — the UI offers it, never applies it. */
  suggestedHealth: ProjectHealth;
  activity: ProjectActivityDto[];
}
