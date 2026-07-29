import { Skeleton } from "@/components/ui/Skeleton";
import { cx } from "@/components/ui/cx";

export interface LoadingStateProps {
  /** Announced to screen readers. */
  label?: string;
  /** Number of KPI tiles to mimic (0 = none). */
  kpis?: number;
  /** Number of content blocks to mimic. */
  blocks?: number;
  className?: string;
}

/**
 * Layout-matching first-load placeholder. Mirrors the page skeleton
 * (KPI row + blocks) so the content does not jump when it arrives.
 *
 * Only for the FIRST load. A refetch over existing data must keep the data on
 * screen and use `aria-busy`, never swap back to skeletons — that flickers.
 */
export function LoadingState({
  label = "Načítavam…",
  kpis = 0,
  blocks = 2,
  className,
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      className={cx("page-stack", className)}
    >
      {kpis > 0 ? (
        <div className="kpi-grid" style={{ ["--kpi-cols" as string]: kpis }}>
          {Array.from({ length: kpis }, (_, i) => (
            <div className="stat" key={`kpi-${i}`}>
              <Skeleton height={11} width="52%" />
              <div style={{ height: "var(--space-3)" }} />
              <Skeleton height={24} width="64%" />
            </div>
          ))}
        </div>
      ) : null}
      {Array.from({ length: blocks }, (_, i) => (
        <div className="panel" key={`block-${i}`}>
          <div className="panel-head">
            <Skeleton height={14} width="220px" />
          </div>
          <div className="panel-body skeleton-stack">
            <Skeleton height={13} />
            <Skeleton height={13} width="88%" />
            <Skeleton height={13} width="72%" />
          </div>
        </div>
      ))}
    </div>
  );
}
