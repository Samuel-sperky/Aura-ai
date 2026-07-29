import type { KeyboardEvent, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cx } from "./cx";

export interface TabItem<T extends string> {
  value: T;
  label: ReactNode;
  icon?: LucideIcon;
  /** Trailing count, e.g. Podmienky 4. */
  count?: number;
  disabled?: boolean;
}

export interface TabsProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  items: ReadonlyArray<TabItem<T>>;
  ariaLabel: string;
  className?: string;
}

/**
 * Tabs switch CONTENT (project detail: Prehľad / Položky / Checkpointy /
 * Aktivita). Use Segmented when you are switching how the SAME data is drawn.
 *
 * Panels are rendered by the caller; give each one
 * `role="tabpanel" id={`panel-${value}`} aria-labelledby={`tab-${value}`}`.
 */
export function Tabs<T extends string>({
  value,
  onChange,
  items,
  ariaLabel,
  className,
}: TabsProps<T>) {
  const enabled = items.filter((i) => !i.disabled);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
    if (!keys.includes(event.key) || enabled.length === 0) return;
    event.preventDefault();
    const current = enabled.findIndex((i) => i.value === value);
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
      className={cx("tabs", className)}
    >
      {items.map((i) => {
        const selected = i.value === value;
        const Icon = i.icon;
        return (
          <button
            key={i.value}
            id={`tab-${i.value}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`panel-${i.value}`}
            tabIndex={selected ? 0 : -1}
            disabled={i.disabled}
            onClick={() => onChange(i.value)}
            className="tab"
          >
            {Icon ? <Icon size={14} aria-hidden="true" /> : null}
            {i.label}
            {typeof i.count === "number" ? (
              <span className="nav-count tnum">{i.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
