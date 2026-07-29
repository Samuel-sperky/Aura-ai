import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cx } from "./cx";

export interface StatCardProps {
  /** Uppercase key line. */
  label: ReactNode;
  /** The numeral. Pre-format it (sk-SK) — the card only styles it. */
  value: ReactNode;
  /** Secondary line under the value. */
  sub?: ReactNode;
  /** Usually a <DeltaPill/>; sits on the value baseline. */
  delta?: ReactNode;
  /** Top hairline: teal for a normal emphasis, gold for the one hero tile. */
  accent?: "none" | "accent" | "gold";
  icon?: LucideIcon;
  className?: string;
}

/** KPI tile. `.stat-v` is tabular-nums so a row of tiles aligns. */
export function StatCard({
  label,
  value,
  sub,
  delta,
  accent = "none",
  icon: Icon,
  className,
}: StatCardProps) {
  return (
    <div
      className={cx(
        "stat",
        accent === "accent" && "stat-accent",
        accent === "gold" && "stat-gold",
        className,
      )}
    >
      <div className="row">
        <span className="stat-k">{label}</span>
        {Icon ? (
          <>
            <span className="spacer" />
            <Icon size={15} aria-hidden="true" className="muted" />
          </>
        ) : null}
      </div>
      <div className="stat-row">
        <span className="stat-v">{value}</span>
        {delta}
      </div>
      {sub ? <p className="stat-sub">{sub}</p> : null}
    </div>
  );
}
