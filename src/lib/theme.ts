// Theme + density preferences for Aura Roadmap.
//
// Two independent axes, both persisted in localStorage and both expressed as
// attributes on <html> so plain CSS (globals.css) can react without React:
//
//   data-theme="light" | "dark"        ← resolved value, never "system"
//   data-density="cozy" | "compact"
//
// DARK IS THE DEFAULT. When nothing is stored we render dark, not the OS
// preference — a deliberate product decision (the app is a planning tool used
// in long sessions). "system" is an opt-in third state for the theme axis.
//
// THEME_SCRIPT is injected into <head> BEFORE globals.css via
// dangerouslySetInnerHTML so the attributes exist before first paint (no flash).
// It is intentionally tiny, dependency-free, ES5 and fully try/catch guarded:
// a blocked localStorage (Safari private mode, embedded webview) must never
// break the page — it falls back to the defaults.
//
// CLIENT-SAFE: touches only localStorage / document / matchMedia, all behind
// existence checks, so importing this from a Server Component is harmless.

/** localStorage key holding the theme PREFERENCE (may be "system"). */
export const THEME_STORAGE_KEY = "aura_roadmap_theme";
/** localStorage key holding the density preference. */
export const DENSITY_STORAGE_KEY = "aura_roadmap_density";
/** The media query consulted for the "system" theme preference. */
export const PREFERS_DARK_QUERY = "(prefers-color-scheme: dark)";

/** What the user picked. "system" follows the OS. */
export type ThemePref = "system" | "light" | "dark";
/** What is actually painted — "system" is always resolved away. */
export type ResolvedTheme = "light" | "dark";
/** The two supported spacing scales. */
export type Density = "cozy" | "compact";

/** Dark-first: no stored preference means dark, NOT the OS setting. */
export const DEFAULT_THEME: ThemePref = "dark";
/** Cozy is the base scale defined on :root. */
export const DEFAULT_DENSITY: Density = "cozy";

export const THEME_PREFS: readonly ThemePref[] = ["system", "light", "dark"];
export const DENSITIES: readonly Density[] = ["cozy", "compact"];

/**
 * Pre-paint script. Insert as the FIRST child of <head>, before the stylesheet:
 *
 *   <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
 *
 * Reads the stored preference on every evaluation (so a later `setTheme` call is
 * always honoured by the matchMedia listener) and stamps both attributes.
 */
export const THEME_SCRIPT = `(function(){var d=document.documentElement;var T="${THEME_STORAGE_KEY}";var N="${DENSITY_STORAGE_KEY}";var pref=function(){try{var v=localStorage.getItem(T);return v==="system"||v==="light"||v==="dark"?v:"${DEFAULT_THEME}"}catch(e){return "${DEFAULT_THEME}"}};try{var q=window.matchMedia("${PREFERS_DARK_QUERY}");var apply=function(){var p=pref();d.setAttribute("data-theme",p==="system"?(q.matches?"dark":"light"):p)};apply();if(q.addEventListener){q.addEventListener("change",apply)}else if(q.addListener){q.addListener(apply)}}catch(e){d.setAttribute("data-theme",pref()==="system"?"${DEFAULT_THEME}":pref())}try{var n=localStorage.getItem(N);d.setAttribute("data-density",n==="compact"?"compact":"${DEFAULT_DENSITY}")}catch(e){d.setAttribute("data-density","${DEFAULT_DENSITY}")}})();`;

// ── environment probes (all defensive so this module is import-safe anywhere) ──

interface ThemeGlobals {
  localStorage?: Storage;
  document?: Document;
  matchMedia?: (query: string) => MediaQueryList;
}

function globals(): ThemeGlobals {
  return globalThis as unknown as ThemeGlobals;
}

function storage(): Storage | null {
  try {
    return globals().localStorage ?? null;
  } catch {
    // Access itself can throw when cookies/storage are blocked.
    return null;
  }
}

function rootElement(): HTMLElement | null {
  try {
    return globals().document?.documentElement ?? null;
  } catch {
    return null;
  }
}

function eventTarget(): EventTarget | null {
  const g = globalThis as unknown as { addEventListener?: unknown };
  return typeof g.addEventListener === "function"
    ? (globalThis as unknown as EventTarget)
    : null;
}

function mediaQuery(): MediaQueryList | null {
  const mm = globals().matchMedia;
  if (typeof mm !== "function") return null;
  try {
    return mm(PREFERS_DARK_QUERY);
  } catch {
    return null;
  }
}

/** True when the OS asks for dark. With no matchMedia we stay dark-first. */
export function systemPrefersDark(): boolean {
  const q = mediaQuery();
  return q ? q.matches : true;
}

// ── pure helpers (the testable core) ─────────────────────────────────────────

/** Coerce anything to a valid ThemePref; unknown/missing values become dark. */
export function normalizeTheme(value: unknown): ThemePref {
  return value === "system" || value === "light" || value === "dark"
    ? value
    : DEFAULT_THEME;
}

/** Coerce anything to a valid Density; unknown/missing values become cozy. */
export function normalizeDensity(value: unknown): Density {
  return value === "compact" ? "compact" : DEFAULT_DENSITY;
}

/** Collapse a preference to what actually gets painted. */
export function resolveTheme(
  pref: ThemePref,
  prefersDark: boolean,
): ResolvedTheme {
  if (pref === "system") return prefersDark ? "dark" : "light";
  return pref;
}

// ── read / write ─────────────────────────────────────────────────────────────

/** The stored theme preference (defaults to dark). */
export function getTheme(): ThemePref {
  return normalizeTheme(storage()?.getItem(THEME_STORAGE_KEY));
}

/** The theme currently painted, resolving "system" against matchMedia. */
export function getResolvedTheme(): ResolvedTheme {
  return resolveTheme(getTheme(), systemPrefersDark());
}

/** The stored density preference (defaults to cozy). */
export function getDensity(): Density {
  return normalizeDensity(storage()?.getItem(DENSITY_STORAGE_KEY));
}

/** Stamp the resolved theme onto <html> without touching storage. */
export function applyTheme(pref: ThemePref): void {
  rootElement()?.setAttribute(
    "data-theme",
    resolveTheme(pref, systemPrefersDark()),
  );
}

/** Stamp the density onto <html> without touching storage. */
export function applyDensity(density: Density): void {
  rootElement()?.setAttribute("data-density", density);
}

/** Persist + apply a theme preference. */
export function setTheme(pref: ThemePref): void {
  const next = normalizeTheme(pref);
  try {
    storage()?.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // Storage blocked: still apply for this page view.
  }
  applyTheme(next);
  notifyPreferenceChange();
}

/** Persist + apply a density preference. */
export function setDensity(density: Density): void {
  const next = normalizeDensity(density);
  try {
    storage()?.setItem(DENSITY_STORAGE_KEY, next);
  } catch {
    // Storage blocked: still apply for this page view.
  }
  applyDensity(next);
  notifyPreferenceChange();
}

/** Re-apply both stored preferences (used on mount as a belt-and-braces pass). */
export function applyStoredPreferences(): void {
  applyTheme(getTheme());
  applyDensity(getDensity());
}

/**
 * Keep `data-theme` in sync with the OS while the preference is "system".
 * Returns an unsubscribe function (safe to call even if nothing was attached).
 */
export function watchSystemTheme(): () => void {
  const q = mediaQuery();
  if (!q) return () => {};
  const onChange = () => {
    if (getTheme() === "system") applyTheme("system");
  };
  if (typeof q.addEventListener === "function") {
    q.addEventListener("change", onChange);
    return () => q.removeEventListener("change", onChange);
  }
  // Legacy Safari.
  const legacy = q as unknown as {
    addListener?: (cb: () => void) => void;
    removeListener?: (cb: () => void) => void;
  };
  legacy.addListener?.(onChange);
  return () => legacy.removeListener?.(onChange);
}

// ── external store (for React's useSyncExternalStore) ────────────────────────

const preferenceListeners = new Set<() => void>();

function notifyPreferenceChange(): void {
  for (const listener of preferenceListeners) listener();
}

/**
 * Subscribe to preference changes from ALL three sources: this tab's setters,
 * another tab (the `storage` event) and the OS flipping while on "system".
 *
 * Designed for `useSyncExternalStore(subscribePreferences, getTheme, () => DEFAULT_THEME)`
 * so components read the stored value without a setState-in-effect round trip
 * (and therefore without a hydration mismatch).
 */
export function subscribePreferences(listener: () => void): () => void {
  preferenceListeners.add(listener);
  const stopSystem = watchSystemTheme();

  const q = mediaQuery();
  const onMedia = () => listener();
  if (q && typeof q.addEventListener === "function") {
    q.addEventListener("change", onMedia);
  }

  const target = eventTarget();
  const onStorage = (event: Event) => {
    const key = (event as StorageEvent).key;
    if (key === THEME_STORAGE_KEY || key === DENSITY_STORAGE_KEY) {
      applyStoredPreferences();
      listener();
    }
  };
  target?.addEventListener("storage", onStorage);

  return () => {
    preferenceListeners.delete(listener);
    stopSystem();
    if (q && typeof q.removeEventListener === "function") {
      q.removeEventListener("change", onMedia);
    }
    target?.removeEventListener("storage", onStorage);
  };
}
