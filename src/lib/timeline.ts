// Pure timeline geometry and grouping. NO React, NO DB, NO fetch — everything
// here is a total function of its arguments, which is why it is the only part of
// the Timeline pillar that is unit-tested directly.
//
// CLIENT-SAFE. Imported by the client components under src/components/timeline.
//
// ─────────────────────────────────────────────────────────────────────────────
// TIMEZONE CONTRACT (the trap this module exists to avoid)
//
// Every calendar day in this app travels as a `YYYY-MM-DD` string (DATE columns
// are read back with DATE_FORMAT, never as a driver Date). Inside this module a
// day is converted to an INTEGER day number via `Date.UTC`, so no arithmetic
// ever touches the host timezone. The one place local time is legitimate is
// `todayIso()`, which asks "which calendar day is it for the person looking at
// the screen" — that IS a local question.
//
// Consequence: the unit tests run under TZ=Europe/Bratislava (a positive offset)
// and must produce identical numbers to a UTC run. A `new Date(iso).toISOString()`
// anywhere in here would silently shift days backwards and break that.
// ─────────────────────────────────────────────────────────────────────────────

/** Milliseconds in one day. */
const MS_PER_DAY = 86_400_000;

/** The three timeline modes (spec Q7–Q9). `decisions` is a queue, not an axis. */
export const TIMELINE_MODES = ["roadmap", "sprints", "decisions"] as const;
export type TimelineMode = (typeof TIMELINE_MODES)[number];

/** The three zoom levels (contract §3.2/44–46). `month` is the default. */
export const TIMELINE_ZOOMS = ["quarter", "month", "week"] as const;
export type TimelineZoom = (typeof TIMELINE_ZOOMS)[number];

export const DEFAULT_MODE: TimelineMode = "roadmap";
export const DEFAULT_ZOOM: TimelineZoom = "month";

/** Roadmap horizon: 12 calendar months from the first of the current month. */
export const ROADMAP_HORIZON_MONTHS = 12;
/** Sprints horizon: 12 weeks from the Monday of the current week. */
export const SPRINTS_HORIZON_WEEKS = 12;

/** Language of the generated labels. Kept local so this module never imports i18n. */
export type TimelineLang = "sk" | "en";

// ---------------------------------------------------------------------------
// Calendar primitives (integer day numbers, UTC-anchored)
// ---------------------------------------------------------------------------

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Zero-padded two-digit number. */
function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Civil date → day number (days since 1970-01-01), month is 1-based. */
export function dayOf(year: number, month: number, day: number): number {
  return Date.UTC(year, month - 1, day) / MS_PER_DAY;
}

/** Day number → civil date parts (month 1-based). */
export function civilOf(day: number): { year: number; month: number; day: number } {
  const d = new Date(day * MS_PER_DAY);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  };
}

/**
 * `YYYY-MM-DD` → day number, or null when the string is missing or not a real
 * calendar day (`2026-02-31` is rejected, not silently rolled over).
 */
export function toDay(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const m = ISO_DAY.exec(iso.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const n = dayOf(year, month, day);
  const back = civilOf(n);
  if (back.year !== year || back.month !== month || back.day !== day) return null;
  return n;
}

/** Day number → `YYYY-MM-DD`. */
export function toIso(day: number): string {
  const c = civilOf(Math.round(day));
  return `${c.year}-${pad2(c.month)}-${pad2(c.day)}`;
}

/** Shift an ISO day by `delta` days. Returns null for an unparsable input. */
export function addDays(iso: string, delta: number): string | null {
  const d = toDay(iso);
  return d === null ? null : toIso(d + delta);
}

/** Signed whole days from `fromIso` to `toIso` (negative = in the past). */
export function daysBetween(fromIso: string, toIso: string): number | null {
  const a = toDay(fromIso);
  const b = toDay(toIso);
  return a === null || b === null ? null : b - a;
}

/**
 * The viewer's current calendar day as `YYYY-MM-DD`.
 * Uses LOCAL getters on purpose — "today" is a local question.
 */
export function todayIso(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

/** ISO weekday of a day number: 1 = Monday … 7 = Sunday. */
export function isoWeekday(day: number): number {
  return (((day + 3) % 7) + 7) % 7 + 1;
}

/** Monday of the week containing `day`. */
export function startOfWeekDay(day: number): number {
  return day - (isoWeekday(day) - 1);
}

/** First day of the month containing `day`. */
export function startOfMonthDay(day: number): number {
  const c = civilOf(day);
  return dayOf(c.year, c.month, 1);
}

/** First day of the calendar quarter containing `day`. */
export function startOfQuarterDay(day: number): number {
  const c = civilOf(day);
  const firstMonth = Math.floor((c.month - 1) / 3) * 3 + 1;
  return dayOf(c.year, firstMonth, 1);
}

/** Add whole months to the first-of-month day number. */
export function addMonthsToStart(day: number, months: number): number {
  const c = civilOf(day);
  const zero = c.year * 12 + (c.month - 1) + months;
  return dayOf(Math.floor(zero / 12), (zero % 12) + 1, 1);
}

/** 1-based ordinal day of the year. */
function dayOfYear(day: number): number {
  const c = civilOf(day);
  return day - dayOf(c.year, 1, 1) + 1;
}

/**
 * ISO-8601 week number and its ISO year.
 * Identity used: the week number equals `ceil(ordinal(Thursday of that week)/7)`,
 * because ISO weeks are defined by the Thursday they contain.
 */
export function isoWeek(day: number): { isoYear: number; week: number } {
  const thursday = startOfWeekDay(day) + 3;
  return {
    isoYear: civilOf(thursday).year,
    week: Math.ceil(dayOfYear(thursday) / 7),
  };
}

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

/**
 * Month names are hard-coded rather than taken from `Intl`: the label must be
 * byte-identical in the browser, in Node and in a Docker image with a trimmed
 * ICU, otherwise a snapshot of the header becomes unstable.
 */
const MONTHS_SHORT: Record<TimelineLang, readonly string[]> = {
  sk: ["jan", "feb", "mar", "apr", "máj", "jún", "júl", "aug", "sep", "okt", "nov", "dec"],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
};

const MONTHS_LONG: Record<TimelineLang, readonly string[]> = {
  sk: [
    "január", "február", "marec", "apríl", "máj", "jún",
    "júl", "august", "september", "október", "november", "december",
  ],
  en: [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ],
};

/** `28. júl 2026` / `28 Jul 2026`. */
export function formatDay(iso: string | null, lang: TimelineLang = "sk"): string {
  const d = toDay(iso);
  if (d === null) return "—";
  const c = civilOf(d);
  const month = MONTHS_LONG[lang][c.month - 1];
  return lang === "sk"
    ? `${c.day}. ${month} ${c.year}`
    : `${c.day} ${MONTHS_SHORT[lang][c.month - 1]} ${c.year}`;
}

/** `28. júl` / `28 Jul` — the year is dropped for in-horizon labels. */
export function formatDayShort(iso: string | null, lang: TimelineLang = "sk"): string {
  const d = toDay(iso);
  if (d === null) return "—";
  const c = civilOf(d);
  return lang === "sk"
    ? `${c.day}. ${MONTHS_LONG[lang][c.month - 1]}`
    : `${c.day} ${MONTHS_SHORT[lang][c.month - 1]}`;
}

/** `20. júl – 2. august` (en dash, both ends short). */
export function formatRange(
  startIso: string | null,
  endIso: string | null,
  lang: TimelineLang = "sk",
): string {
  if (!startIso && !endIso) return "—";
  if (!startIso) return `… – ${formatDayShort(endIso, lang)}`;
  if (!endIso) return `${formatDayShort(startIso, lang)} – …`;
  return `${formatDayShort(startIso, lang)} – ${formatDayShort(endIso, lang)}`;
}

// ---------------------------------------------------------------------------
// The time scale
// ---------------------------------------------------------------------------

/**
 * One column of the time header.
 *
 * The first and last columns of a scale are CLIPPED to the horizon, so their
 * `days` can be shorter than the calendar unit. That is deliberate: the horizon
 * length is fixed by the MODE (12 months / 12 weeks) and must not stretch just
 * because the user picked a coarser zoom.
 */
export interface TimelineColumn {
  /** Stable key: `2026-Q3` / `2026-07` / `2026-W31`. */
  key: string;
  unit: TimelineZoom;
  /** Calendar year of the unit (ISO year for weeks). */
  year: number;
  /** Quarter 1–4, month 1–12 or ISO week 1–53. */
  ordinal: number;
  /** Inclusive day-number bounds, already clipped to the horizon. */
  startDay: number;
  endDay: number;
  /** Clipped length in days (never 0). */
  days: number;
  /** Share of the horizon this column occupies, in percent. */
  widthPercent: number;
  /** The column that contains today. */
  isCurrent: boolean;
}

export interface TimeScale {
  mode: TimelineMode;
  zoom: TimelineZoom;
  /** Inclusive horizon bounds as day numbers. */
  startDay: number;
  endDay: number;
  /** Inclusive horizon bounds as `YYYY-MM-DD`. */
  startIso: string;
  endIso: string;
  totalDays: number;
  columns: TimelineColumn[];
  /** Today as a day number (may be outside the horizon). */
  todayDay: number;
  todayIso: string;
  /** Today's position 0–100, or null when today is off-horizon. */
  todayPercent: number | null;
}

/** First day of the unit containing `day`. */
function unitStart(day: number, zoom: TimelineZoom): number {
  if (zoom === "quarter") return startOfQuarterDay(day);
  if (zoom === "month") return startOfMonthDay(day);
  return startOfWeekDay(day);
}

/** First day of the unit AFTER the one containing `day`. */
function nextUnitStart(day: number, zoom: TimelineZoom): number {
  if (zoom === "quarter") return addMonthsToStart(startOfQuarterDay(day), 3);
  if (zoom === "month") return addMonthsToStart(startOfMonthDay(day), 1);
  return startOfWeekDay(day) + 7;
}

/** Key + ordinal + year describing the unit that `day` belongs to. */
function unitIdentity(
  day: number,
  zoom: TimelineZoom,
): { key: string; year: number; ordinal: number } {
  if (zoom === "week") {
    const { isoYear, week } = isoWeek(day);
    return { key: `${isoYear}-W${pad2(week)}`, year: isoYear, ordinal: week };
  }
  const c = civilOf(day);
  if (zoom === "quarter") {
    const q = Math.floor((c.month - 1) / 3) + 1;
    return { key: `${c.year}-Q${q}`, year: c.year, ordinal: q };
  }
  return { key: `${c.year}-${pad2(c.month)}`, year: c.year, ordinal: c.month };
}

export interface BuildScaleOptions {
  mode: TimelineMode;
  zoom: TimelineZoom;
  /** `YYYY-MM-DD`; defaults to the viewer's today. */
  today?: string;
}

/**
 * Build the time grid for a mode + zoom.
 *
 * The horizon is anchored on today and its LENGTH depends only on the mode:
 *   roadmap  → 12 calendar months, starting on the 1st of the current month
 *   sprints  → 12 weeks, starting on the Monday of the current week
 *   decisions→ same as roadmap (the queue does not draw an axis, but callers may
 *              still ask for a scale, e.g. to label "po termíne")
 *
 * The ZOOM only changes the column granularity drawn over that horizon.
 */
export function buildTimeScale({
  mode,
  zoom,
  today = todayIso(),
}: BuildScaleOptions): TimeScale {
  const todayDay = toDay(today) ?? toDay(todayIso())!;

  let startDay: number;
  let endDay: number;
  if (mode === "sprints") {
    startDay = startOfWeekDay(todayDay);
    endDay = startDay + SPRINTS_HORIZON_WEEKS * 7 - 1;
  } else {
    startDay = startOfMonthDay(todayDay);
    endDay = addMonthsToStart(startDay, ROADMAP_HORIZON_MONTHS) - 1;
  }
  const totalDays = endDay - startDay + 1;

  const columns: TimelineColumn[] = [];
  let cursor = startDay;
  // Bounded by construction (each step advances at least 7 days), but the guard
  // keeps a future zoom bug from turning into an infinite loop in the browser.
  let guard = 0;
  while (cursor <= endDay && guard < 512) {
    guard += 1;
    const rawStart = unitStart(cursor, zoom);
    const rawEnd = nextUnitStart(cursor, zoom) - 1;
    const clippedStart = Math.max(rawStart, startDay);
    const clippedEnd = Math.min(rawEnd, endDay);
    const days = clippedEnd - clippedStart + 1;
    const id = unitIdentity(cursor, zoom);
    columns.push({
      key: id.key,
      unit: zoom,
      year: id.year,
      ordinal: id.ordinal,
      startDay: clippedStart,
      endDay: clippedEnd,
      days,
      widthPercent: (days / totalDays) * 100,
      isCurrent: todayDay >= clippedStart && todayDay <= clippedEnd,
    });
    cursor = rawEnd + 1;
  }

  const inHorizon = todayDay >= startDay && todayDay <= endDay;

  return {
    mode,
    zoom,
    startDay,
    endDay,
    startIso: toIso(startDay),
    endIso: toIso(endDay),
    totalDays,
    columns,
    todayDay,
    todayIso: toIso(todayDay),
    // +0.5 puts the line through the MIDDLE of today's cell rather than on its
    // leading edge, which is where a reader expects "now" to sit.
    todayPercent: inHorizon ? ((todayDay - startDay + 0.5) / totalDays) * 100 : null,
  };
}

/** Primary header label for a column. */
export function columnLabel(col: TimelineColumn, lang: TimelineLang = "sk"): string {
  if (col.unit === "quarter") return `Q${col.ordinal}`;
  if (col.unit === "month") return MONTHS_SHORT[lang][col.ordinal - 1];
  return lang === "sk" ? `${col.ordinal}. t.` : `W${col.ordinal}`;
}

/** Full label used as the column's `title` tooltip (no truncation there). */
export function columnTitle(col: TimelineColumn, lang: TimelineLang = "sk"): string {
  if (col.unit === "quarter") return `Q${col.ordinal} ${col.year}`;
  if (col.unit === "month") return `${MONTHS_LONG[lang][col.ordinal - 1]} ${col.year}`;
  return lang === "sk"
    ? `${col.ordinal}. týždeň ${col.year}`
    : `Week ${col.ordinal} ${col.year}`;
}

/** One cell of the upper header row: consecutive columns sharing a year. */
export interface TimelineHeaderGroup {
  key: string;
  label: string;
  days: number;
  widthPercent: number;
  columnCount: number;
}

/** Group the columns by year for the two-row sticky header. */
export function headerGroups(scale: TimeScale): TimelineHeaderGroup[] {
  const groups: TimelineHeaderGroup[] = [];
  for (const col of scale.columns) {
    const last = groups[groups.length - 1];
    if (last && last.label === String(col.year)) {
      last.days += col.days;
      last.widthPercent += col.widthPercent;
      last.columnCount += 1;
      continue;
    }
    groups.push({
      key: `y-${col.year}-${col.key}`,
      label: String(col.year),
      days: col.days,
      widthPercent: col.widthPercent,
      columnCount: 1,
    });
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Bars and markers
// ---------------------------------------------------------------------------

export interface BarGeometry {
  /** False when the interval does not intersect the horizon at all. */
  visible: boolean;
  leftPercent: number;
  widthPercent: number;
  /** The real interval started before the horizon (draw a cut-off edge). */
  clippedStart: boolean;
  /** The real interval ends after the horizon. */
  clippedEnd: boolean;
  /** Inclusive day count actually drawn. */
  days: number;
}

const HIDDEN_BAR: BarGeometry = {
  visible: false,
  leftPercent: 0,
  widthPercent: 0,
  clippedStart: false,
  clippedEnd: false,
  days: 0,
};

/**
 * Position and width of a date interval on the scale, in percent of the horizon.
 *
 * Rules, all of them load-bearing:
 *   * both ends missing            → not visible (nothing to draw)
 *   * one end missing              → substituted by the horizon edge and reported
 *                                    as clipped (an open-ended plan, not an error)
 *   * end before start            → treated as a single day at `start`
 *   * interval outside the horizon → not visible
 *   * both bounds are INCLUSIVE, so a one-day interval is one day wide, not zero
 */
export function barGeometry(
  scale: TimeScale,
  startIso: string | null | undefined,
  endIso: string | null | undefined,
): BarGeometry {
  const rawStart = toDay(startIso);
  const rawEnd = toDay(endIso);
  if (rawStart === null && rawEnd === null) return HIDDEN_BAR;

  const openStart = rawStart === null;
  const openEnd = rawEnd === null;
  const from = rawStart ?? scale.startDay;
  const to = Math.max(rawEnd ?? scale.endDay, from);

  if (to < scale.startDay || from > scale.endDay) return HIDDEN_BAR;

  const clippedFrom = Math.max(from, scale.startDay);
  const clippedTo = Math.min(to, scale.endDay);
  const days = clippedTo - clippedFrom + 1;

  return {
    visible: true,
    leftPercent: ((clippedFrom - scale.startDay) / scale.totalDays) * 100,
    widthPercent: (days / scale.totalDays) * 100,
    clippedStart: openStart || from < scale.startDay,
    clippedEnd: openEnd || to > scale.endDay,
    days,
  };
}

/**
 * Position of a single-day marker (a checkpoint) in percent, or null when the day
 * falls outside the horizon. Centred inside its day, like the today line.
 */
export function markerPercent(
  scale: TimeScale,
  iso: string | null | undefined,
): number | null {
  const day = toDay(iso);
  if (day === null) return null;
  if (day < scale.startDay || day > scale.endDay) return null;
  return ((day - scale.startDay + 0.5) / scale.totalDays) * 100;
}

/**
 * Past vs future (spec Q11): the visual difference between a filled and an
 * outlined marker. Today itself counts as NOT past — it is still actionable.
 */
export function isPastDay(iso: string | null | undefined, today: string): boolean {
  const d = toDay(iso);
  const t = toDay(today);
  if (d === null || t === null) return false;
  return d < t;
}

/** Human phase word for a marker; pairs with the filled/outlined shape. */
export function dayPhase(
  iso: string | null | undefined,
  today: string,
): "past" | "today" | "future" | "unknown" {
  const d = toDay(iso);
  const t = toDay(today);
  if (d === null || t === null) return "unknown";
  if (d < t) return "past";
  if (d === t) return "today";
  return "future";
}

// ---------------------------------------------------------------------------
// Grouping: roadmap rows by area (spec Q7)
// ---------------------------------------------------------------------------

/** Label used when a project has no area set. */
export const NO_AREA_LABEL = "Bez oblasti";

export interface AreaGroup<P> {
  area: string;
  projects: P[];
}

/**
 * Group projects into area buckets.
 *
 * Areas are sorted alphabetically (Slovak collation) with the "no area" bucket
 * pinned LAST; the order of projects inside a bucket is preserved, because the
 * list endpoint already sorted them by risk and re-sorting here would throw that
 * away.
 */
export function groupProjectsByArea<P extends { area?: string | null }>(
  projects: readonly P[],
): AreaGroup<P>[] {
  const buckets = new Map<string, P[]>();
  for (const project of projects) {
    const area = (project.area ?? "").trim() || NO_AREA_LABEL;
    const bucket = buckets.get(area);
    if (bucket) bucket.push(project);
    else buckets.set(area, [project]);
  }
  return [...buckets.entries()]
    .map(([area, list]) => ({ area, projects: list }))
    .sort((a, b) => {
      if (a.area === NO_AREA_LABEL) return b.area === NO_AREA_LABEL ? 0 : 1;
      if (b.area === NO_AREA_LABEL) return -1;
      return a.area.localeCompare(b.area, "sk");
    });
}

// ---------------------------------------------------------------------------
// Sprint lanes (spec Q8: parallel sprints side by side)
// ---------------------------------------------------------------------------

export interface LanedItem<S> {
  lane: number;
  item: S;
}

interface DatedSprint {
  startDate?: string | null;
  endDate?: string | null;
}

/**
 * Greedy interval packing: each sprint lands in the first lane whose previous
 * occupant has already ended. Sprints that overlap therefore end up on separate
 * lanes and are drawn side by side instead of on top of each other.
 *
 * Sorted by start day, then by end day, then by the incoming order, so the
 * result is stable for a stable input.
 */
export function packLanes<S extends DatedSprint>(
  sprints: readonly S[],
  scale: TimeScale,
): LanedItem<S>[] {
  const decorated = sprints
    .map((item, index) => {
      const from = toDay(item.startDate) ?? scale.startDay;
      const to = Math.max(toDay(item.endDate) ?? scale.endDay, from);
      return { item, index, from, to };
    })
    .sort((a, b) => a.from - b.from || a.to - b.to || a.index - b.index);

  const laneEnds: number[] = [];
  const out: LanedItem<S>[] = [];
  for (const entry of decorated) {
    let lane = laneEnds.findIndex((end) => end < entry.from);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(entry.to);
    } else {
      laneEnds[lane] = entry.to;
    }
    out.push({ lane, item: entry.item });
  }
  return out;
}

/** Keep only the sprints whose interval intersects the horizon. */
export function sprintsInHorizon<S extends DatedSprint>(
  sprints: readonly S[],
  scale: TimeScale,
): S[] {
  return sprints.filter((s) => barGeometry(scale, s.startDate, s.endDate).visible);
}

// ---------------------------------------------------------------------------
// Manual ordering (`work_items.rank_value`)
// ---------------------------------------------------------------------------

/** Gap left between two consecutive ranks so future inserts fit between them. */
export const RANK_STEP = 1000;

/**
 * A rank strictly between two neighbours, for a drag & drop landing position.
 *
 * `null` means "no neighbour on that side". When the integer gap is exhausted the
 * result ties with the lower neighbour; the server breaks ties by `created_at`,
 * so the list stays deterministic. With a 1000 step and a 2e9 ceiling this needs
 * about eleven consecutive inserts into the same slot to happen at all, which is
 * why there is no renumbering pass.
 */
export function rankBetween(
  prevRank: number | null,
  nextRank: number | null,
): number {
  if (prevRank === null && nextRank === null) return RANK_STEP;
  if (prevRank === null) {
    const next = Math.max(0, Math.trunc(nextRank!));
    return next <= 0 ? 0 : Math.floor(next / 2);
  }
  const prev = Math.max(0, Math.trunc(prevRank));
  if (nextRank === null) return prev + RANK_STEP;
  const next = Math.trunc(nextRank);
  if (next - prev >= 2) return Math.floor((prev + next) / 2);
  return prev + 1;
}

/**
 * Rank for dropping an item at `index` of a bucket whose remaining ranks are
 * `ranks` (the dragged item already removed). `index` is clamped into range.
 */
export function rankForInsert(ranks: readonly number[], index: number): number {
  const at = Math.min(Math.max(index, 0), ranks.length);
  const prev = at > 0 ? ranks[at - 1] : null;
  const next = at < ranks.length ? ranks[at] : null;
  return rankBetween(prev ?? null, next ?? null);
}

// ---------------------------------------------------------------------------
// Decision queue (spec Q9) — a work queue, not an axis
// ---------------------------------------------------------------------------

interface QueueCheckpoint {
  dueDate?: string | null;
  readiness?: number;
  name?: string;
  lifecycle?: string;
}

/**
 * Order of the compact decision queue: due date first (a missing date sinks to
 * the bottom), then the most ready first, then the name so the list never
 * reshuffles between renders. Mirrors the server's `queue=1` ordering, so the
 * client can re-sort a locally filtered list without disagreeing with the API.
 */
export function sortDecisionQueue<C extends QueueCheckpoint>(items: readonly C[]): C[] {
  return [...items].sort((a, b) => {
    const da = toDay(a.dueDate);
    const db = toDay(b.dueDate);
    if (da !== db) {
      if (da === null) return 1;
      if (db === null) return -1;
      return da - db;
    }
    const ra = a.readiness ?? 0;
    const rb = b.readiness ?? 0;
    if (ra !== rb) return rb - ra;
    return (a.name ?? "").localeCompare(b.name ?? "", "sk");
  });
}

export interface QueueStats {
  total: number;
  ready: number;
  blocked: number;
  overdue: number;
}

/** Headline counters above the queue. `overdue` = undecided and past its due day. */
export function queueStats<C extends QueueCheckpoint>(
  items: readonly C[],
  today: string,
): QueueStats {
  let ready = 0;
  let blocked = 0;
  let overdue = 0;
  for (const item of items) {
    if (item.lifecycle === "ready") ready += 1;
    if (item.lifecycle === "blocked") blocked += 1;
    if (item.lifecycle !== "decided" && isPastDay(item.dueDate, today)) overdue += 1;
  }
  return { total: items.length, ready, blocked, overdue };
}

// ---------------------------------------------------------------------------
// Capacity banding (per PERSON — there are no teams)
// ---------------------------------------------------------------------------

/**
 * Band for a person's load in the capacity panel. Note this is the INVERSE of
 * `healthTone` in the UI kit: for progress more is better, for load more is
 * worse, so the two must not be shared.
 */
export function capacityTone(loadPercent: number): "accent" | "warn" | "danger" {
  if (!Number.isFinite(loadPercent)) return "accent";
  if (loadPercent > 100) return "danger";
  if (loadPercent >= 85) return "warn";
  return "accent";
}

// ---------------------------------------------------------------------------
// Keyboard shortcut guard (spec Q13)
// ---------------------------------------------------------------------------

/** What `isTypingTarget` needs to know about an element. Keeps this DOM-free. */
export interface TypingTargetLike {
  tagName?: string;
  isContentEditable?: boolean;
}

const TYPING_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

/**
 * True when a keystroke belongs to the user's typing, not to our shortcuts.
 * Every timeline shortcut (`M`, `↑`, `↓`) checks this first — without it,
 * typing a sprint goal that contains the letter "m" would open the move dialog.
 */
export function isTypingTarget(target: TypingTargetLike | null | undefined): boolean {
  if (!target) return false;
  if (target.isContentEditable) return true;
  return TYPING_TAGS.has((target.tagName ?? "").toUpperCase());
}

// ---------------------------------------------------------------------------
// Label collisions (spec Q15)
// ---------------------------------------------------------------------------
//
// Handled entirely in CSS: every bar and every identity cell is
// `overflow: hidden; text-overflow: ellipsis` and carries the FULL text in
// `title`. No JS character-fitting (it needs a measured pixel width, so it lags
// one frame behind every resize and zoom change) and explicitly NO semantic zoom
// or clustering — the source app had both and the contract drops them: at fifty
// projects there is nothing to cluster.
