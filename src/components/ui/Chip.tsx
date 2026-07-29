import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cx } from "./cx";

export interface ChipProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  label: ReactNode;
  /** Toggled-on filter. Renders the teal fill + aria-pressed. */
  active?: boolean;
  /** Optional count suffix, e.g. "Prebieha 12". */
  count?: number;
  icon?: LucideIcon;
}

/**
 * A filter toggle. One <button>, so it stays keyboard- and AT-friendly.
 * Removable / editable tray chips are a different component — see FilterChip
 * in Toolbar.tsx (a chip cannot contain a nested button).
 */
export function Chip({
  label,
  active = false,
  count,
  icon: Icon,
  className,
  type = "button",
  ...rest
}: ChipProps) {
  return (
    <button
      {...rest}
      type={type}
      aria-pressed={active}
      className={cx("chip", active && "on", className)}
    >
      {Icon ? <Icon size={13} aria-hidden="true" /> : null}
      {label}
      {typeof count === "number" ? (
        <span className="tnum">{count}</span>
      ) : null}
    </button>
  );
}
