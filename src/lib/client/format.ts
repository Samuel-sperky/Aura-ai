// SK-first display formatting for every client view (spec Q46).
//
// One module so a number never gets formatted two different ways on two screens:
//   * `Intl.NumberFormat("sk-SK")` — decimal comma, NON-BREAKING SPACE in
//     thousands (U+00A0, verified: 12 345 comes back as "12 345")
//   * percentages carry the same NBSP before the `%`
//   * deltas always show a sign
//   * dates are calendar values: `YYYY-MM-DD` strings are split by hand and
//     NEVER routed through `new Date(...)`, which would drag the timezone into a
//     calendar day and shift it (the family's oldest date bug)
//
// CLIENT-SAFE: pure `Intl`, no DOM, no server imports. Unit-testable as-is.

/** Non-breaking space — the sk-SK group separator and the `%` spacer. */
export const NBSP = " ";

/** The one "no value" glyph used across every table and card. */
export const EM_DASH = "—";

const INT_FMT = new Intl.NumberFormat("sk-SK", { maximumFractionDigits: 0 });

const DECIMAL_FMT = new Map<number, Intl.NumberFormat>();

function decimalFormatter(digits: number): Intl.NumberFormat {
  const key = Math.max(0, Math.min(4, Math.trunc(digits)));
  let fmt = DECIMAL_FMT.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat("sk-SK", {
      minimumFractionDigits: key,
      maximumFractionDigits: key,
    });
    DECIMAL_FMT.set(key, fmt);
  }
  return fmt;
}

/**
 * Coerce a display value to a finite number, or null when there is NO value.
 *
 * The null/empty-string guards are load-bearing, not defensive noise: `Number(null)`
 * and `Number("")` are both `0`, and `Number.isFinite(0)` is true. Without them a
 * genuinely absent field — an unestimated item's `storyPoints`, a task with no
 * `loggedMinutes` — rendered as a confident "0" instead of the em dash, i.e. "no
 * estimate" was displayed as "estimated at zero". Booleans are rejected for the
 * same reason (`Number(true)` is 1).
 */
function finite(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    if (value.trim() === "") return null;
  } else if (typeof value !== "number") {
    return null;
  }
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Whole number, sk-SK grouped. Non-numeric input renders the em dash. */
export function fmtInt(value: unknown): string {
  const n = finite(value);
  return n === null ? EM_DASH : INT_FMT.format(Math.round(n));
}

/** Fixed-decimal number, sk-SK (decimal comma). */
export function fmtNumber(value: unknown, digits = 1): string {
  const n = finite(value);
  return n === null ? EM_DASH : decimalFormatter(digits).format(n);
}

/**
 * A percentage that is ALREADY 0–100 (our API returns whole percents, not
 * fractions). The `%` is separated by a non-breaking space.
 */
export function fmtPercent(value: unknown, digits = 0): string {
  const n = finite(value);
  if (n === null) return EM_DASH;
  const body = digits > 0 ? decimalFormatter(digits).format(n) : INT_FMT.format(Math.round(n));
  return `${body}${NBSP}%`;
}

/** A delta: always signed, so "no change" reads as `0` and never as a gain. */
export function fmtSigned(value: unknown, digits = 0): string {
  const n = finite(value);
  if (n === null) return EM_DASH;
  const body = digits > 0 ? decimalFormatter(digits).format(Math.abs(n)) : INT_FMT.format(Math.abs(Math.round(n)));
  if (n > 0) return `+${body}`;
  if (n < 0) return `-${body}`;
  return body;
}

/** `"5 (3+2)"` — parent points with the subtask breakdown (spec Q26). */
export function fmtRollupPoints(effective: number, childPoints: number, childCount: number): string {
  const total = fmtInt(effective);
  if (childCount <= 0) return total;
  const own = Math.max(0, effective - childPoints);
  return `${total} (${fmtInt(own)}+${fmtInt(childPoints)})`;
}

/**
 * A `YYYY-MM-DD` calendar day rendered as `28. 7. 2026`.
 * Deliberately string surgery: `new Date("2026-07-28")` is UTC midnight and
 * would print the previous day in any negative-offset zone.
 */
export function fmtDate(value: string | null | undefined): string {
  if (!value) return EM_DASH;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return EM_DASH;
  const [, y, mo, d] = m;
  return `${Number(d)}. ${Number(mo)}. ${y}`;
}

/** A short calendar day without the year — for dense timelines and chips. */
export function fmtDayMonth(value: string | null | undefined): string {
  if (!value) return EM_DASH;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return EM_DASH;
  return `${Number(m[3])}. ${Number(m[2])}.`;
}

/** An ISO INSTANT (created_at / decided_at) as `28. 7. 2026, 14:05`. */
export function fmtDateTime(value: string | null | undefined): string {
  if (!value) return EM_DASH;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return EM_DASH;
  const day = `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`;
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${day}, ${hh}:${mm}`;
}

/** Logged time as `3 h 20 min`; `0` renders as `0 min`, never as an em dash. */
export function fmtMinutes(value: unknown): string {
  const n = finite(value);
  if (n === null) return EM_DASH;
  const total = Math.max(0, Math.round(n));
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours === 0) return `${fmtInt(minutes)}${NBSP}min`;
  if (minutes === 0) return `${fmtInt(hours)}${NBSP}h`;
  return `${fmtInt(hours)}${NBSP}h ${fmtInt(minutes)}${NBSP}min`;
}

/** Today as `YYYY-MM-DD` in the BROWSER's zone (worklog default date). */
export function todayIso(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Whole days from `YYYY-MM-DD` to today; negative means the day has passed. */
export function daysUntil(day: string | null | undefined, today: string = todayIso()): number | null {
  if (!day) return null;
  const a = Date.parse(`${day.slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${today}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((a - b) / 86_400_000);
}

/** "za 3 dni" / "dnes" / "po termíne 2 dni" — one wording, used everywhere. */
export function dueLabel(day: string | null | undefined, today: string = todayIso()): string {
  const days = daysUntil(day, today);
  if (days === null) return EM_DASH;
  if (days === 0) return "dnes";
  if (days > 0) return `za ${fmtInt(days)}${NBSP}${dayWord(days)}`;
  const late = Math.abs(days);
  return `po termíne ${fmtInt(late)}${NBSP}${dayWord(late)}`;
}

/** Slovak plural for "day": 1 deň · 2–4 dni · 5+ dní. */
export function dayWord(count: number): string {
  const n = Math.abs(Math.trunc(count));
  if (n === 1) return "deň";
  if (n >= 2 && n <= 4) return "dni";
  return "dní";
}

/** Slovak plural helper for arbitrary count labels (1 / 2–4 / 5+). */
export function plural(count: number, one: string, few: string, many: string): string {
  const n = Math.abs(Math.trunc(count));
  if (n === 1) return one;
  if (n >= 2 && n <= 4) return few;
  return many;
}
