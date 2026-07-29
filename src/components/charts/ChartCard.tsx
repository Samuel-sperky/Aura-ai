"use client";

import type { ReactNode } from "react";
import { Panel, PanelBody, PanelHead } from "@/components/ui/Panel";
import { Skeleton } from "@/components/ui/Skeleton";
import { cx } from "@/components/ui/cx";
import { EmptyState } from "@/components/states/EmptyState";
import { ErrorState } from "@/components/states/ErrorState";

export interface ChartLegendEntry {
  label: string;
  /**
   * CSS colour. Prefer `useChartTheme().series[i]` (runtime token) or a literal
   * `var(--chart-N)` — never a hard-coded hex.
   */
  color: string;
}

export interface ChartCardProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Toolbar cluster in the panel head (zoom, mode, export). */
  actions?: ReactNode;
  /** md = --chart-h (primary), sm = --chart-h-sm (secondary). */
  size?: "md" | "sm";
  /** Rendered under the plot. Recharts' own legend is usually noisier. */
  legend?: ReadonlyArray<ChartLegendEntry>;
  loading?: boolean;
  /** Slovak sentence; renders ErrorState with a retry when `onRetry` is given. */
  error?: string | null;
  onRetry?: () => void;
  /** True when the query succeeded but returned no points. */
  empty?: boolean;
  emptyLabel?: string;
  emptyDescription?: string;
  /**
   * A screen-reader table (or summary) of the same numbers. Charts are invisible
   * to assistive tech — pass this whenever the chart carries real information.
   */
  srSummary?: ReactNode;
  footer?: ReactNode;
  /** The recharts tree, normally a <ResponsiveContainer>. */
  children: ReactNode;
  className?: string;
}

/**
 * The single wrapper for every chart in the app: panel + fixed token height +
 * one state family + legend. Colours come from `useChartTheme()` at runtime, so
 * a chart NEVER hard-codes a palette (which would keep light colours in dark).
 */
export function ChartCard({
  title,
  subtitle,
  actions,
  size = "md",
  legend,
  loading = false,
  error = null,
  onRetry,
  empty = false,
  emptyLabel = "Žiadne dáta za zvolené obdobie",
  emptyDescription,
  srSummary,
  footer,
  children,
  className,
}: ChartCardProps) {
  return (
    <Panel className={cx("chart-card", className)}>
      <PanelHead title={title} subtitle={subtitle} actions={actions} />
      <PanelBody>
        {loading ? (
          <div
            className={cx("chart-body", size === "sm" && "chart-body-sm")}
            role="status"
            aria-busy="true"
            aria-label="Načítavam graf…"
          >
            <Skeleton height="100%" />
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={onRetry} bare />
        ) : empty ? (
          <EmptyState
            tone="muted"
            title={emptyLabel}
            description={emptyDescription}
            bare
          />
        ) : (
          <>
            <div className={cx("chart-body", size === "sm" && "chart-body-sm")}>
              {children}
            </div>
            {srSummary ? <div className="sr-only">{srSummary}</div> : null}
          </>
        )}
        {legend && legend.length > 0 && !loading && !error && !empty ? (
          <div className="chart-legend">
            {legend.map((entry) => (
              <span className="chart-legend-item" key={entry.label}>
                <span
                  className="chart-legend-swatch"
                  style={{ background: entry.color }}
                  aria-hidden="true"
                />
                {entry.label}
              </span>
            ))}
          </div>
        ) : null}
        {footer}
      </PanelBody>
    </Panel>
  );
}
