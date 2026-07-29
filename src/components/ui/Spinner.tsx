import { cx } from "./cx";

export interface SpinnerProps {
  /** Diameter in px (default 16). */
  size?: number;
  /**
   * Accessible label. Pass it when the spinner is the only thing announcing
   * progress; leave it off when a surrounding `role="status"` already speaks.
   */
  label?: string;
  className?: string;
}

export function Spinner({ size = 16, label, className }: SpinnerProps) {
  return (
    <span
      className={cx("spinner", className)}
      style={{ width: size, height: size }}
      role={label ? "status" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : "true"}
    />
  );
}
