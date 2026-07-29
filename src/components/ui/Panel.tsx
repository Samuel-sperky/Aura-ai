import type { HTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cx } from "./cx";

export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  /** Inset surface (panel2, no shadow) — for panels nested inside a panel. */
  soft?: boolean;
}

/** The one surface primitive. Everything boxed on a page is a Panel. */
export function Panel({ soft = false, className, ...rest }: PanelProps) {
  return <div {...rest} className={cx(soft ? "panel-soft" : "panel", className)} />;
}

export interface PanelHeadProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  icon?: LucideIcon;
  /** Right-aligned action cluster. */
  actions?: ReactNode;
  /** Heading level — pick so the page outline stays correct. */
  as?: "h2" | "h3";
  /** Replaces the title/subtitle block entirely when you need custom content. */
  children?: ReactNode;
  className?: string;
}

export function PanelHead({
  title,
  subtitle,
  icon: Icon,
  actions,
  as = "h2",
  children,
  className,
}: PanelHeadProps) {
  const Heading = as;
  return (
    <div className={cx("panel-head", className)}>
      {Icon ? <Icon size={16} aria-hidden="true" /> : null}
      {children ?? (
        <div>
          {title ? <Heading>{title}</Heading> : null}
          {subtitle ? <p className="panel-head-sub">{subtitle}</p> : null}
        </div>
      )}
      {actions ? <div className="panel-head-actions">{actions}</div> : null}
    </div>
  );
}

export interface PanelBodyProps extends HTMLAttributes<HTMLDivElement> {
  /** Removes padding — use when the body is a full-bleed table or chart. */
  flush?: boolean;
}

export function PanelBody({ flush = false, className, ...rest }: PanelBodyProps) {
  return <div {...rest} className={cx("panel-body", flush && "flush", className)} />;
}

export function PanelFoot({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div {...rest} className={cx("panel-foot", className)} />;
}
