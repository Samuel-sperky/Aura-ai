// Chart colours, read at RUNTIME from the CSS custom properties in globals.css.
//
// Why not a hard-coded palette: recharts wants concrete colour strings, but our
// palette flips with `data-theme`. A hard-coded hex list silently keeps the LIGHT
// colours in dark mode — the classic family trap. So we read the live computed
// value off <html> and only fall back to a literal when there is no DOM (SSR,
// unit tests).
//
// The fallbacks below MUST mirror the `:root` (light) block of globals.css.
// `src/lib/chartTheme.test.ts` is a drift test that parses globals.css and fails
// if they diverge — that is the guard, not code review.
//
// CLIENT-SAFE and React-free on purpose. The reactive wrapper lives in
// src/components/charts/useChartTheme.ts.

/** The eight categorical series tokens, in draw order. */
export const CHART_SERIES_VARS = [
  "--chart-1",
  "--chart-2",
  "--chart-3",
  "--chart-4",
  "--chart-5",
  "--chart-6",
  "--chart-7",
  "--chart-8",
] as const;

export type ChartSeriesVar = (typeof CHART_SERIES_VARS)[number];

/**
 * Literal light-theme values, mirroring `:root` in src/app/globals.css.
 * Used only when there is no DOM to read from. Kept honest by the drift test.
 */
export const LIGHT_FALLBACK = {
  "--chart-1": "#bf8f34",
  "--chart-2": "#0b969a",
  "--chart-3": "#6f86d6",
  "--chart-4": "#e0857b",
  "--chart-5": "#6ec6a4",
  "--chart-6": "#c08adb",
  "--chart-7": "#e0a850",
  "--chart-8": "#5b9bd5",
  "--accent": "#03797e",
  "--accent2": "#05bcc4",
  "--brand-gold": "#d8b878",
  "--success": "#0f8c5a",
  "--warn": "#d97706",
  "--danger": "#d64545",
  "--ink": "#101d1b",
  "--ink2": "#2d3a38",
  "--muted": "#566964",
  "--border": "#e6dee3",
  "--panel": "#ffffff",
  "--bg": "#f8f4f7",
} as const;

export type ChartVar = keyof typeof LIGHT_FALLBACK;

/**
 * Read a CSS custom property off <html>, falling back to `fallback` when there
 * is no DOM or the property is empty.
 */
export function cssVar(name: string, fallback: string): string {
  const doc = (globalThis as unknown as { document?: Document }).document;
  const root = doc?.documentElement;
  if (!root || typeof getComputedStyle !== "function") return fallback;
  try {
    const raw = getComputedStyle(root).getPropertyValue(name);
    const value = typeof raw === "string" ? raw.trim() : "";
    return value || fallback;
  } catch {
    return fallback;
  }
}

/** Read one of the known design tokens, using its light literal as fallback. */
export function token(name: ChartVar): string {
  return cssVar(name, LIGHT_FALLBACK[name]);
}

/** Resolved palette + axis/grid colours for a recharts chart. */
export interface ChartTheme {
  /** Eight categorical series colours, in draw order. */
  series: string[];
  /** Cartesian grid lines. */
  grid: string;
  /** Axis lines + tick labels. */
  axis: string;
  /** Tooltip surface + its ink. */
  tooltipBg: string;
  tooltipInk: string;
  tooltipBorder: string;
  /** Semantic colours for bands and deltas (never for neutral categories). */
  success: string;
  warn: string;
  danger: string;
  accent: string;
  gold: string;
}

/** Snapshot the live palette. Call inside an effect, not during render/SSR. */
export function chartTheme(): ChartTheme {
  return {
    series: CHART_SERIES_VARS.map((v) => token(v)),
    grid: token("--border"),
    axis: token("--muted"),
    tooltipBg: token("--panel"),
    tooltipInk: token("--ink"),
    tooltipBorder: token("--border"),
    success: token("--success"),
    warn: token("--warn"),
    danger: token("--danger"),
    accent: token("--accent"),
    gold: token("--brand-gold"),
  };
}

/** Colour of series `index`, wrapping around the eight-token palette. */
export function seriesColor(index: number): string {
  const vars = CHART_SERIES_VARS;
  const i = ((Math.trunc(index) % vars.length) + vars.length) % vars.length;
  return token(vars[i]);
}

/**
 * Area fill under a line: a tint of the series colour, never the solid colour.
 * 14 % is the family default (see the design handoff, §5.2).
 */
export function areaFill(color: string, percent = 14): string {
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`;
}

/** Tick/label font settings shared by every axis so charts read as one family. */
export const AXIS_TICK = { fontSize: 11 } as const;
