// Shared helpers for the REST data layer: value coercion, LIKE escaping and
// pagination.
//
// Security notes:
//   * Every query MUST be parameterized — user input is never interpolated into
//     SQL. Column names used in ORDER BY come from a fixed allow-list per route,
//     never raw from the client (see `pickSort`).
//   * RBAC is enforced by `defineRoute({ auth: … })` plus the per-handler guards.

import { z } from "zod";

// ---------------------------------------------------------------------------
// Value coercion — the pool is configured with decimalAsNumber/bigIntAsNumber,
// so DECIMAL/BIGINT come back as JS numbers. These helpers normalise the edge
// cases (NULL, string-y values) into stable wire types.
// ---------------------------------------------------------------------------

/** Coerce a possibly-null numeric column to a number (0 when absent). */
export function num(v: unknown): number {
  if (v == null) return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Coerce a numeric column to `number | null` (keeps "no value" distinct from 0). */
export function numOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Round to `digits` decimal places (default 2). */
export function round(n: number, digits = 2): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

/** Coerce a TINYINT(1)/0/1/bool-ish DB value to a boolean. */
export function bool(v: unknown): boolean {
  return v === 1 || v === true || v === "1";
}

/** Trim a string column to `string | null`. */
export function strOrNull(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v);
  return s.length ? s : null;
}

/** Format a DATETIME/Date column as an ISO string, or null. */
export function isoOrNull(v: unknown): string | null {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString();
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Zero-pad a 1–2 digit number for date formatting. */
function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/**
 * Format a DATE column as `YYYY-MM-DD`, or null.
 *
 * DO NOT reroute this through `isoOrNull()`. The `mariadb` pool is NOT configured
 * with `dateStrings`, so a DATE column arrives as a JS Date at LOCAL midnight.
 * `toISOString()` converts to UTC first, which in any positive-offset zone
 * (Europe/Bratislava is +1/+2) shifts the calendar day one day BACKWARDS:
 * `new Date(2026, 7, 10).toISOString().slice(0, 10)` → "2026-08-09".
 * So we read the LOCAL civil parts, and pass an already-formatted string through
 * verbatim instead of round-tripping it through the Date constructor.
 */
export function dateOrNull(v: unknown): string | null {
  if (v == null) return null;

  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return null;
    return `${v.getFullYear()}-${pad2(v.getMonth() + 1)}-${pad2(v.getDate())}`;
  }

  const s = String(v).trim();
  if (!s.length) return null;

  // `YYYY-MM-DD` / `YYYY-MM-DD HH:MM:SS` / ISO — the calendar day is already
  // written down, so take it literally rather than re-interpreting the zone.
  const civil = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (civil) return `${civil[1]}-${civil[2]}-${civil[3]}`;

  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// ---------------------------------------------------------------------------
// LIKE escaping
// ---------------------------------------------------------------------------

/**
 * The ESCAPE-clause text to append after a `LIKE ?` whose bound value was run
 * through `escapeLike()`. MariaDB string literals treat backslash as an escape
 * char, so the JS string `'\\\\'` emits `ESCAPE '\\'`, which MariaDB reads as a
 * single backslash. Keep this and `escapeLike` in lock-step.
 */
export const LIKE_ESCAPE_CLAUSE = "ESCAPE '\\\\'";

/**
 * Escape LIKE wildcard meta-characters (`%`, `_`) and the escape character
 * (`\`) in a user-supplied search term so they match literally. The caller binds
 * the wrapped result as a `?` parameter and appends `LIKE_ESCAPE_CLAUSE`:
 *   `col LIKE ? ${LIKE_ESCAPE_CLAUSE}` with param `%${escapeLike(term)}%`.
 */
export function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, "\\$&");
}

// ---------------------------------------------------------------------------
// Sorting allow-list
// ---------------------------------------------------------------------------

/**
 * Resolve a client-supplied sort key to a real SQL column through an explicit
 * allow-list. NEVER interpolate a client string into ORDER BY without this.
 *
 * @example
 *   const col = pickSort(query.sort, { name: "p.name", code: "p.code" }, "p.name");
 *   const dir = query.dir === "desc" ? "DESC" : "ASC";
 *   const sql = `SELECT … ORDER BY ${col} ${dir}`;
 */
export function pickSort(
  requested: string | undefined,
  allowed: Readonly<Record<string, string>>,
  fallback: string,
): string {
  if (!requested) return fallback;
  return allowed[requested] ?? fallback;
}

/** Normalise a sort direction to a literal SQL keyword. */
export function sortDir(requested: string | undefined): "ASC" | "DESC" {
  return String(requested).toLowerCase() === "desc" ? "DESC" : "ASC";
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export const DEFAULT_PAGE_SIZE = 50;
/**
 * Upper bound for any single `pageSize`. The target scale is 50 projects / 15
 * users / 5 000 work items, and a few views (timeline, board) load their whole
 * working set as ONE page, so this must cover the largest such fetch.
 */
export const MAX_PAGE_SIZE = 2000;

/** Zod schema fragment for page/pageSize query params (string → clamped int). */
export const paginationSchema = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_PAGE_SIZE)
    .default(DEFAULT_PAGE_SIZE),
};

export interface Pagination {
  page: number;
  pageSize: number;
  limit: number;
  offset: number;
}

/** Build LIMIT/OFFSET from validated page/pageSize. */
export function toPagination(page: number, pageSize: number): Pagination {
  const limit = Math.min(Math.max(pageSize, 1), MAX_PAGE_SIZE);
  const safePage = Math.max(page, 1);
  return {
    page: safePage,
    pageSize: limit,
    limit,
    offset: (safePage - 1) * limit,
  };
}

/** Standard pagination envelope returned in list responses. */
export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * Build the pagination envelope for a page of results.
 * Feeds straight into `jsonList(items, pageMeta(pg, total))`.
 */
export function pageMeta(pagination: Pagination, total: number): PageMeta {
  const totalPages =
    pagination.limit > 0 ? Math.ceil(total / pagination.limit) : 0;
  return {
    page: pagination.page,
    pageSize: pagination.pageSize,
    total,
    totalPages,
    hasMore: pagination.page < totalPages,
  };
}

// ---------------------------------------------------------------------------
// Query string parsing
// ---------------------------------------------------------------------------

/** Read the searchParams of a Request URL as a plain object (last value wins). */
export function searchParamsOf(request: Request): Record<string, string> {
  const url = new URL(request.url);
  const out: Record<string, string> = {};
  for (const [k, v] of url.searchParams.entries()) out[k] = v;
  return out;
}
