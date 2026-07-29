import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cx } from "./cx";

export interface PageHeaderProps {
  /** 11px uppercase kicker above the title (usually the section name). */
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Right-aligned actions; wrap under the title on narrow screens. */
  actions?: ReactNode;
  icon?: LucideIcon;
  className?: string;
}

/**
 * The top of every page: eyebrow → h1 → description → actions.
 * Keeps the vertical rhythm identical across all six routes.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  icon: Icon,
  className,
}: PageHeaderProps) {
  return (
    <header className={cx("page-header", className)}>
      {Icon ? (
        <span className="brand-mark" aria-hidden="true">
          <Icon size={18} />
        </span>
      ) : null}
      <div style={{ minWidth: 0 }}>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {description ? <p className="page-header-desc">{description}</p> : null}
      </div>
      {actions ? <div className="page-header-actions">{actions}</div> : null}
    </header>
  );
}
