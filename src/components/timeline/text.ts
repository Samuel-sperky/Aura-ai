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

/** Translate a Timeline key. Unknown keys render as themselves, never empty. */
export function t(key: string): string {
  const value = translate(key);
  if (value !== key) return value;
  const local = timelineKeys[key];
  return local ? local.sk : key;
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
