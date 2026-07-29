import type { ReactNode } from "react";
import { cx } from "./cx";

export interface BarListItem {
  key: string;
  label: ReactNode;
  value: number;
  /** Pre-formatted value shown on the right; defaults to sk-SK of `value`. */
  display?: string;
  /**
   * CSS colour. Prefer a token reference like "var(--chart-3)" so the bar stays
   * theme-aware; leave empty to get the categorical palette by position.
   */
  color?: string;
}

export interface BarListProps {
  items: ReadonlyArray<BarListItem>;
  /** Scale reference. Defaults to the largest item value. */
  max?: number;
  className?: string;
}

const FMT = new Intl.NumberFormat("sk-SK");

/** Horizontal ranked bars — the compact alternative to a bar chart. */
export function BarList({ items, max, className }: BarListProps) {
  const ceiling =
    max ?? items.reduce((m, i) => (i.value > m ? i.value : m), 0) ?? 0;
  return (
    <div className={cx("bar-list", className)}>
      {items.map((item, index) => {
        const pct = ceiling > 0 ? (item.value / ceiling) * 100 : 0;
        return (
          <div className="bar-row" key={item.key}>
            <div className="bar-top">
              <span className="bar-label">{item.label}</span>
              <span className="bar-value tnum">
                {item.display ?? FMT.format(item.value)}
              </span>
            </div>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{
                  width: `${pct}%`,
                  background: item.color ?? `var(--chart-${(index % 8) + 1})`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
