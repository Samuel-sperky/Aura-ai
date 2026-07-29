import type { KeyboardEvent, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cx } from "./cx";

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  icon?: LucideIcon;
  /** Native tooltip / accessible name when the label is an icon only. */
  title?: string;
  disabled?: boolean;
}

export interface SegmentedProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<SegmentedOption<T>>;
  /** Required — a tablist without a name is unusable with a screen reader. */
  ariaLabel: string;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Segmented control for switching the REPRESENTATION of the same data
 * (timeline mode, zoom, table/cards). If it switches CONTENT, use Tabs instead.
 * Arrow keys / Home / End move the selection, matching the tablist pattern.
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  size = "md",
  className,
}: SegmentedProps<T>) {
  const enabled = options.filter((o) => !o.disabled);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
    if (!keys.includes(event.key)) return;
    if (enabled.length === 0) return;
    event.preventDefault();
    const current = enabled.findIndex((o) => o.value === value);
    const at = current === -1 ? 0 : current;
    let next = at;
    if (event.key === "ArrowLeft") next = (at - 1 + enabled.length) % enabled.length;
    if (event.key === "ArrowRight") next = (at + 1) % enabled.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = enabled.length - 1;
    onChange(enabled[next].value);
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={cx("segmented", className)}
    >
      {options.map((o) => {
        const selected = o.value === value;
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            disabled={o.disabled}
            title={o.title}
            aria-label={o.title}
            onClick={() => onChange(o.value)}
            className={cx("seg-btn", size === "sm" && "btn-xs")}
          >
            {Icon ? <Icon size={14} aria-hidden="true" /> : null}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
