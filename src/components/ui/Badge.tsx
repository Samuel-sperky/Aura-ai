import type { HTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";
import { cx } from "./cx";

/**
 * The only tone vocabulary in the app.
 *   neutral / accent / gold — categories and brand
 *   ok / warn / danger      — data STATE only (health bands, deltas, blocked)
 * Never colour a neutral category red.
 */
export type Tone = "neutral" | "accent" | "gold" | "ok" | "warn" | "danger";

const TONE_BADGE: Record<Tone, string> = {
  neutral: "badge-neutral",
  accent: "badge-accent",
  gold: "badge-gold",
  ok: "badge-ok",
  warn: "badge-warn",
  danger: "badge-danger",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  icon?: LucideIcon;
}

/** Compact rounded label. Always contains TEXT — colour is never the only cue. */
export function Badge({
  tone = "neutral",
  icon: Icon,
  className,
  children,
  ...rest
}: BadgeProps) {
  return (
    <span {...rest} className={cx("badge", TONE_BADGE[tone], className)}>
      {Icon ? <Icon size={12} aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
