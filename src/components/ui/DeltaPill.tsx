import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cx } from "./cx";

export type DeltaDirection = "up" | "down" | "flat";

export interface DeltaPillProps {
  /** Signed change. 0 (or |value| < epsilon) renders as flat. */
  value: number;
  /** Appended after a non-breaking space, e.g. "%" or "b." */
  suffix?: string;
  /** Decimal places, sk-SK formatted (decimal comma). */
  digits?: number;
  /**
   * Set when a RISE is bad (overdue items, blocked checkpoints): the arrow still
   * points up but the colour flips to danger. Semantic colour tracks meaning,
   * not direction.
   */
  invert?: boolean;
  /** Screen-reader prefix, e.g. "oproti minulému týždňu". */
  srLabel?: string;
  className?: string;
}

const EPSILON = 1e-9;

/** up / down / flat for a signed number. Exported so callers can reuse it. */
export function deltaDirection(value: number): DeltaDirection {
  if (!Number.isFinite(value) || Math.abs(value) < EPSILON) return "flat";
  return value > 0 ? "up" : "down";
}

function format(value: number, digits: number): string {
  const abs = new Intl.NumberFormat("sk-SK", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Math.abs(value));
  if (Math.abs(value) < EPSILON) return abs;
  return `${value > 0 ? "+" : "−"}${abs}`;
}

/** Signed change pill. Always carries the sign, never colour alone. */
export function DeltaPill({
  value,
  suffix,
  digits = 0,
  invert = false,
  srLabel,
  className,
}: DeltaPillProps) {
  const dir = deltaDirection(value);
  const good = invert ? dir === "down" : dir === "up";
  const tone = dir === "flat" ? "flat" : good ? "up" : "down";
  const Icon = dir === "up" ? ArrowUp : dir === "down" ? ArrowDown : Minus;
  return (
    <span className={cx("delta", `delta-${tone}`, className)}>
      <Icon size={12} aria-hidden="true" />
      {srLabel ? <span className="sr-only">{srLabel} </span> : null}
      {format(value, digits)}
      {suffix ? ` ${suffix}` : null}
    </span>
  );
}
