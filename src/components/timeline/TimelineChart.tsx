"use client";

// The chart frame shared by the Roadmap and Sprints modes: a two-row sticky time
// header, a frozen row-identity column, the column grid and the "Dnes" line.
//
// Everything positional comes from `@/lib/timeline` — this file only turns
// percentages into style objects. That split is what makes the geometry testable
// without a DOM.

import type { CSSProperties, ReactNode } from "react";
import {
  columnLabel,
  columnTitle,
  headerGroups,
  type BarGeometry,
  type TimeScale,
} from "@/lib/timeline";
import { cx } from "@/components/ui";
import { t } from "./text";
import styles from "./timeline.module.css";

/** Minimum pixel width per column, per zoom — below this the labels collide. */
const MIN_COL_PX: Record<TimeScale["zoom"], number> = {
  quarter: 148,
  month: 100,
  week: 54,
};

/** Pixel width the track needs so the current zoom stays readable. */
export function trackMinPx(scale: TimeScale): number {
  return Math.max(560, scale.columns.length * MIN_COL_PX[scale.zoom]);
}

function pctStyle(value: number): string {
  // 4 decimals keep a 365-day horizon sub-pixel accurate without churning the
  // style string on every render.
  return `${value.toFixed(4)}%`;
}

export interface TimelineChartProps {
  scale: TimeScale;
  /** Caption of the frozen identity column, e.g. "Projekt / oblasť". */
  identityLabel: ReactNode;
  /** Small line under the caption, e.g. the horizon. */
  identityHint?: ReactNode;
  /** Accessible name of the whole chart region. */
  ariaLabel: string;
  /** Legend row under the scroller. */
  legend?: ReactNode;
  children: ReactNode;
}

/** The scrolling canvas plus the sticky time header. Rows go in `children`. */
export function TimelineChart({
  scale,
  identityLabel,
  identityHint,
  ariaLabel,
  legend,
  children,
}: TimelineChartProps) {
  return (
    <div className={styles.wrap}>
      <div
        className={styles.scroller}
        style={{ "--tl-track-min": `${trackMinPx(scale)}px` } as CSSProperties}
      >
        <div className={styles.canvas} role="group" aria-label={ariaLabel}>
          <div className={styles.head}>
            <div className={styles.headIdentity}>
              <span className="eyebrow">{identityLabel}</span>
              {identityHint ? <span className="meta">{identityHint}</span> : null}
            </div>
            <div className={styles.headAxis}>
              <div className={styles.headRow}>
                {headerGroups(scale).map((group) => (
                  <span
                    key={group.key}
                    className={styles.headYear}
                    style={{ width: pctStyle(group.widthPercent) }}
                  >
                    {group.label}
                  </span>
                ))}
              </div>
              <div className={styles.headRow} role="presentation">
                {scale.columns.map((col) => (
                  <span
                    key={col.key}
                    className={cx(styles.headCol, col.isCurrent && styles.headColCurrent)}
                    style={{ width: pctStyle(col.widthPercent) }}
                    title={columnTitle(col)}
                  >
                    {columnLabel(col)}
                  </span>
                ))}
              </div>
              {scale.todayPercent !== null ? (
                <span
                  className={styles.todayFlag}
                  style={{ left: pctStyle(scale.todayPercent) }}
                >
                  {t("timeline.today")}
                </span>
              ) : null}
            </div>
          </div>
          <div className={styles.body}>{children}</div>
        </div>
      </div>
      {legend ? <div className={styles.legend}>{legend}</div> : null}
    </div>
  );
}

/** Sticky area caption spanning the identity column (Roadmap groups by area). */
export function TimelineGroupHead({ children }: { children: ReactNode }) {
  return (
    <div className={styles.groupStripe}>
      <div className={styles.groupHead}>{children}</div>
    </div>
  );
}

export interface TimelineRowProps {
  scale: TimeScale;
  /** Contents of the frozen left column. */
  identity: ReactNode;
  /** Bars and markers, absolutely positioned inside the track. */
  children?: ReactNode;
  /** Renders the row at the shorter sub-row height (sprint items). */
  sub?: boolean;
  className?: string;
}

/**
 * One chart row: frozen identity + track. The column grid and the today line are
 * drawn per row rather than once behind everything, so they scroll and stack with
 * the row and never bleed over the sticky identity column.
 */
export function TimelineRow({
  scale,
  identity,
  children,
  sub = false,
  className,
}: TimelineRowProps) {
  return (
    <div
      className={cx(styles.row, className)}
      style={sub ? { minHeight: "var(--tl-lane-h)" } : undefined}
    >
      <div className={styles.identity}>{identity}</div>
      <div className={styles.track}>
        <div className={styles.grid} aria-hidden="true">
          {scale.columns.map((col) => (
            <span
              key={col.key}
              className={cx(styles.gridCell, col.isCurrent && styles.gridCellCurrent)}
              style={{ width: pctStyle(col.widthPercent) }}
            />
          ))}
        </div>
        {scale.todayPercent !== null ? (
          <span
            className={styles.todayLine}
            style={{ left: pctStyle(scale.todayPercent) }}
            aria-hidden="true"
          />
        ) : null}
        {children}
      </div>
    </div>
  );
}

/** Health band of a bar. `grey` is "no data", never a fourth colour. */
export type BarTone = "accent" | "green" | "amber" | "red" | "grey";

const BAR_TONE: Record<BarTone, string> = {
  accent: "",
  green: styles.barGreen,
  amber: styles.barAmber,
  red: styles.barRed,
  grey: styles.barGrey,
};

export interface TimelineBarProps {
  geometry: BarGeometry;
  tone?: BarTone;
  /** Visible label; always paired with `title` carrying the full text (spec Q15). */
  label?: string;
  title: string;
  /** 0–100 progress fill drawn inside the bar. */
  fillPercent?: number;
  className?: string;
}

/**
 * A duration bar. Renders nothing when the interval misses the horizon — the
 * caller does not have to branch on `geometry.visible`.
 */
export function TimelineBar({
  geometry,
  tone = "accent",
  label,
  title,
  fillPercent,
  className,
}: TimelineBarProps) {
  if (!geometry.visible) return null;
  return (
    <span
      className={cx(
        styles.bar,
        BAR_TONE[tone],
        geometry.clippedStart && styles.clipStart,
        geometry.clippedEnd && styles.clipEnd,
        className,
      )}
      style={{
        left: pctStyle(geometry.leftPercent),
        width: pctStyle(geometry.widthPercent),
      }}
      title={title}
    >
      {typeof fillPercent === "number" && fillPercent > 0 ? (
        <span
          className={styles.barFill}
          style={{ width: pctStyle(Math.min(100, Math.max(0, fillPercent))) }}
          aria-hidden="true"
        />
      ) : null}
      {label ? <span className={styles.barText}>{label}</span> : null}
    </span>
  );
}

/** Note shown in the track when a row has no dates at all. */
export function TimelineNoDates() {
  return <span className={styles.noDates}>{t("timeline.roadmap.noDates")}</span>;
}

export interface TimelineMarkerProps {
  /** Position in percent; the marker is skipped when null. */
  percent: number | null;
  /** Filled when the day already passed (spec Q11). */
  phase: "past" | "today" | "future" | "unknown";
  /** Lifecycle band: colours the outline. */
  variant?: "planned" | "ready" | "decided" | "blocked";
  title: string;
  onClick: () => void;
  children: ReactNode;
}

const MARKER_VARIANT = {
  planned: "",
  ready: styles.markerReady,
  decided: styles.markerDecided,
  blocked: styles.markerBlocked,
} as const;

/** A checkpoint marker on the axis. A real button — keyboard reachable. */
export function TimelineMarker({
  percent,
  phase,
  variant = "planned",
  title,
  onClick,
  children,
}: TimelineMarkerProps) {
  if (percent === null) return null;
  return (
    <button
      type="button"
      className={cx(
        styles.marker,
        MARKER_VARIANT[variant],
        phase === "past" && styles.markerPast,
        phase === "today" && styles.markerToday,
      )}
      style={{ left: pctStyle(percent) }}
      title={title}
      aria-label={title}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

/** One legend entry. `kind` picks the swatch shape. */
export function LegendItem({
  kind,
  children,
}: {
  kind: "bar" | "line" | "icon";
  children: ReactNode;
}) {
  return (
    <span className={styles.legendItem}>
      {kind === "bar" ? <span className={styles.legendSwatch} aria-hidden="true" /> : null}
      {kind === "line" ? <span className={styles.legendLine} aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
