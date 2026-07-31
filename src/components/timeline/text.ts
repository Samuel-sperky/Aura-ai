// Translation entry point for the Timeline pillar.
//
// It calls `t()` from `@/lib/i18n` — the one stable contract — and falls back to
// this module's own `timelineKeys` when the registry does not know the key yet.
// A10 merges `timelineKeys` into `KEYS`; from that moment the fallback never
// fires and language switching starts working for these keys too. Without the
// fallback every Timeline label would render as a raw key until that merge lands,
// which would also break the Playwright specs.

import { t as translate } from "@/lib/i18n";
import { timelineKeys } from "@/lib/i18n/keys.timeline";

/** Substitute `{name}` placeholders, matching what `@/lib/i18n` does. */
function interpolate(text: string, vars?: TextVars): string {
  if (!vars) return text;
  let out = text;
  for (const [name, value] of Object.entries(vars)) {
    out = out.replace(`{${name}}`, String(value));
  }
  return out;
}

/** Values substituted into `{name}` placeholders of a translation. */
export type TextVars = Record<string, string | number>;

/**
 * Translate a Timeline key. Unknown keys render as themselves, never empty.
 *
 * `vars` fills `{name}` placeholders, on the registry path and on the local
 * fallback alike — otherwise a label would show a raw `{n}` until A10's merge.
 */
export function t(key: string, vars?: TextVars): string {
  const value = translate(key, vars);
  if (value !== key) return value;
  const local = timelineKeys[key];
  return local ? interpolate(local.sk, vars) : key;
}

/**
 * Slovak plural bucket for `n`: `one` (1), `few` (2–4), `many` (0 and 5+).
 *
 * Slovak inflects the noun in three ways where English has two, so a count-plus-
 * noun label needs three keys per noun; English collapses `few` and `many` into
 * the same string. Exported for the unit test — the buckets are the logic.
 */
export function pluralForm(n: number): "one" | "few" | "many" {
  if (n === 1) return "one";
  if (n >= 2 && n <= 4) return "few";
  return "many";
}

/** `t()` for a dynamic dictionary entry, e.g. `tk("status", "in_progress")`. */
export function tk(prefix: string, value: string | null | undefined): string {
  if (!value) return t("common.noValue");
  return t(`${prefix}.${value}`);
}

/** Slovak/English number with a non-breaking thousands separator. */
export function num(value: number): string {
  return new Intl.NumberFormat("sk-SK").format(value);
}

/** Percentage with a non-breaking space before the sign, as the spec requires. */
export function pct(value: number, digits = 0): string {
  return `${new Intl.NumberFormat("sk-SK", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)} %`;
}
