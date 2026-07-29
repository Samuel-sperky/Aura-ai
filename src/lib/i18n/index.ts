/**
 * i18n composition and utilities — A10 merges all `keys.<module>.ts` files.
 *
 * Convention: flat keys with module prefix (`projects.title`), English DB enum
 * keys, Slovak + English values. The UI shows the current language (`sk` or `en`),
 * and the database stores English keys.
 */

import { authKeys } from "./keys.auth";
import { commonKeys } from "./keys.common";
import { projectsKeys } from "./keys.projects";
import { workItemsKeys } from "./keys.workItems";
import { sprintsKeys } from "./keys.sprints";
import { checkpointsKeys } from "./keys.checkpoints";
import { overviewKeys } from "./keys.overview";
import { settingsKeys } from "./keys.settings";
import { timelineKeys } from "./keys.timeline";

// ── types ─────────────────────────────────────────────────────────────────────

export interface TranslationEntry {
  sk: string;
  en: string;
}

export type TranslationDict = Record<string, TranslationEntry>;
export type LanguageCode = "sk" | "en";

// ── legacy aliases for backwards compatibility ──────────────────────────────

export type Lang = LanguageCode;
export const DEFAULT_LANG: LanguageCode = "sk";
export const LANG_STORAGE_KEY = "aura_roadmap_lang";
export type TranslationMap = TranslationDict;

// ── composition ───────────────────────────────────────────────────────────────

const KEYS: TranslationDict = {
  ...authKeys,
  ...commonKeys,
  ...projectsKeys,
  ...workItemsKeys,
  ...sprintsKeys,
  ...checkpointsKeys,
  ...overviewKeys,
  ...settingsKeys,
  ...timelineKeys,
};

// ── state ─────────────────────────────────────────────────────────────────────

let currentLang: LanguageCode = "sk";

if (typeof window !== "undefined") {
  try {
    const stored = localStorage.getItem("aura_roadmap_lang");
    if (stored === "sk" || stored === "en") {
      currentLang = stored;
    }
  } catch {
    // SSR or no localStorage
  }
}

// ── API ───────────────────────────────────────────────────────────────────────

/**
 * Translate a key to the current language.
 * Falls back to the key itself if not found (dev warning).
 * Supports simple variable substitution: `t("key", { n: 5 })` →
 * looks for `{n}` in the translation.
 */
export function t(key: string, vars?: Record<string, string | number>): string;
export function t(key: string, lang: LanguageCode): string; // legacy overload
export function t(
  key: string,
  langOrVars?: LanguageCode | Record<string, string | number>
): string {
  // Handle legacy `t(key, lang)` signature
  let lang: LanguageCode = currentLang;
  let vars: Record<string, string | number> | undefined;

  if (typeof langOrVars === "string") {
    lang = langOrVars;
  } else if (langOrVars && typeof langOrVars === "object") {
    vars = langOrVars;
    lang = currentLang;
  }

  let text: string;

  if (key in KEYS) {
    text = KEYS[key][lang];
  } else {
    if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
      console.warn(`[i18n] Missing key: ${key}`);
    }
    text = key;
  }

  if (vars) {
    Object.entries(vars).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, String(v));
    });
  }

  return text;
}

/**
 * Set the current language.
 * Updates localStorage and `document.documentElement.lang`.
 */
export function setLang(lang: LanguageCode): void {
  currentLang = lang;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("aura_roadmap_lang", lang);
      document.documentElement.lang = lang;
    } catch {
      // SSR or no localStorage
    }
  }
}

/**
 * Get the current language.
 */
export function getLang(): LanguageCode {
  return currentLang;
}

/**
 * Extract `name_sk` or `name_en` from a domain object.
 */
export function nm(
  obj: Record<string, unknown> | null | undefined,
  base: string,
): string {
  const key = currentLang === "sk" ? `${base}_sk` : `${base}_en`;
  const value = obj?.[key] ?? obj?.[base];
  return value == null ? "" : String(value);
}

// ---------------------------------------------------------------------------
// NUMBER / DATE FORMATTING LIVES IN `@/lib/client/format`, NOT HERE
// ---------------------------------------------------------------------------
// This module used to carry a SECOND set of formatters (fmtNum / fmtPct /
// fmtDelta / fmtMinutes / fmtDate / numLocale / dateLocale). Nothing imported
// them — all 17 view files use `@/lib/client/format` — and the two sets disagreed
// (this one switched locale, that one is sk-SK only; `fmtMinutes` rendered "1h 30m"
// here and a different string there). Two formatters for one number is exactly the
// inconsistency the single-dictionary rule exists to prevent, so the unused copy
// is gone and `@/lib/client/format` is the one place a number or a date is turned
// into text.
//
// OPEN ITEM: `client/format` hard-codes sk-SK, so EN would still show Slovak
// number/date formatting. That is part of the same gap as EN text switching — it
// needs the runtime language provider that does not exist yet, and when it lands
// the locale belongs in `client/format`, not in a parallel module here.

// ── exports ───────────────────────────────────────────────────────────────────

export { KEYS };
