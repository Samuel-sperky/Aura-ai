// The UI language PREFERENCE, as an external store.
//
// Same shape as the theme/density store in `src/lib/theme.ts`, and for the same
// reason: components read it through `useSyncExternalStore`, so the server
// renders the default, the client renders the stored value, and neither needs a
// setState-in-effect round trip — which cascades renders and, for a value that
// only exists in localStorage, would also risk a hydration mismatch.
//
// Only the preference lives here. Swapping the runtime dictionary is the i18n
// module's concern (there is no language provider yet), so `setLang` stamps
// <html lang> as well — the document language must not lie about itself.
//
// CLIENT-SAFE: touches only localStorage and document, both behind existence
// checks, so importing this from a Server Component is harmless.

import { DEFAULT_LANG, LANG_STORAGE_KEY } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";

interface LangGlobals {
  localStorage?: Storage;
  document?: Document;
}

function globals(): LangGlobals {
  return globalThis as unknown as LangGlobals;
}

function storage(): Storage | null {
  try {
    return globals().localStorage ?? null;
  } catch {
    // Access itself can throw when cookies/storage are blocked.
    return null;
  }
}

function eventTarget(): EventTarget | null {
  const g = globalThis as unknown as { addEventListener?: unknown };
  return typeof g.addEventListener === "function"
    ? (globalThis as unknown as EventTarget)
    : null;
}

// ── pure helper (the testable core) ──────────────────────────────────────────

/** Coerce anything to a supported language; unknown/missing values become sk. */
export function normalizeLang(value: unknown): Lang {
  return value === "en" ? "en" : DEFAULT_LANG;
}

// ── read / write ─────────────────────────────────────────────────────────────

/** The stored language preference (defaults to sk). */
export function getLang(): Lang {
  return normalizeLang(storage()?.getItem(LANG_STORAGE_KEY));
}

/** What the server renders — always the default, so hydration matches. */
export function getLangOnServer(): Lang {
  return DEFAULT_LANG;
}

/** Persist the preference, stamp <html lang> and notify subscribers. */
export function setLang(lang: Lang): void {
  const next = normalizeLang(lang);
  try {
    storage()?.setItem(LANG_STORAGE_KEY, next);
  } catch {
    // Storage blocked: the server copy still records the choice.
  }
  try {
    globals().document?.documentElement.setAttribute("lang", next);
  } catch {
    // No DOM (should not happen in a client component).
  }
  for (const listener of langListeners) listener();
}

// ── external store (for React's useSyncExternalStore) ────────────────────────

const langListeners = new Set<() => void>();

/**
 * Subscribe to language changes from this tab (`setLang`) and from another one
 * (the `storage` event). Designed for
 * `useSyncExternalStore(subscribeLang, getLang, getLangOnServer)`.
 */
export function subscribeLang(listener: () => void): () => void {
  langListeners.add(listener);

  const target = eventTarget();
  const onStorage = (event: Event) => {
    if ((event as StorageEvent).key === LANG_STORAGE_KEY) listener();
  };
  target?.addEventListener("storage", onStorage);

  return () => {
    langListeners.delete(listener);
    target?.removeEventListener("storage", onStorage);
  };
}
