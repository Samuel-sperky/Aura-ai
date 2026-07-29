import { cx } from "./cx";

export type ProgressTone = "accent" | "ok" | "warn" | "danger";

export interface ProgressBarProps {
  /** Current value. Clamped into [0, max]. */
  value: number;
  max?: number;
  /**
   * Tone. Use `healthTone()` for readiness / progress bars so the bands match
   * the domain dictionary (green ≥100 %, amber 60–99 %, red <60 %).
   */
  tone?: ProgressTone;
  size?: "md" | "lg";
  /** Accessible name, e.g. "Pripravenosť checkpointu". */
  label?: string;
  className?: string;
}

const TONE: Record<ProgressTone, string> = {
  accent: "",
  ok: "progress-ok",
  warn: "progress-warn",
  danger: "progress-danger",
};

/**
 * Map a completion percentage to the family health band.
 * green ≥ 100 % · amber 60–99 % · red < 60 %. (grey = no data → caller passes
 * no bar at all, not a grey one.)
 */
export function healthTone(percent: number): ProgressTone {
  if (!Number.isFinite(percent)) return "accent";
  if (percent >= 100) return "ok";
  if (percent >= 60) return "warn";
  return "danger";
}

export function ProgressBar({
  value,
  max = 100,
  tone = "accent",
  size = "md",
  label,
  className,
}: ProgressBarProps) {
  const safeMax = max > 0 ? max : 100;
  const clamped = Math.min(Math.max(Number.isFinite(value) ? value : 0, 0), safeMax);
  const pct = (clamped / safeMax) * 100;
  return (
    <div
      className={cx("progress", size === "lg" && "progress-lg", TONE[tone], className)}
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={safeMax}
    >
      <div className="progress-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}
