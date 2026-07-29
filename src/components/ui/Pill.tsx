import type { HTMLAttributes } from "react";
import { cx } from "./cx";
import type { Tone } from "./Badge";

const TONE_PILL: Record<Tone, string> = {
  neutral: "pill-neutral",
  accent: "pill-accent",
  gold: "pill-gold",
  ok: "pill-ok",
  warn: "pill-warn",
  danger: "pill-danger",
};

export interface PillProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  /** Leading status dot (default true). Turn off for plain labels. */
  dot?: boolean;
}

/**
 * Uppercase status pill — the canonical renderer for the domain dictionaries
 * (item status, checkpoint lifecycle, project status, health band). The SK label
 * is the payload; the tone only reinforces it.
 */
export function Pill({
  tone = "neutral",
  dot = true,
  className,
  children,
  ...rest
}: PillProps) {
  return (
    <span
      {...rest}
      className={cx("pill", TONE_PILL[tone], !dot && "pill-flat", className)}
    >
      {children}
    </span>
  );
}
