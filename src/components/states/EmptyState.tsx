import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** Primary CTA. Rendered ONLY when `canAct` is true. */
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  secondaryActionHref?: string;
  /**
   * Right gate. A Prehliadač must not see "Nový projekt" — pass the caller's
   * permission check here. Defaults to true so read-only pages stay simple.
   */
  canAct?: boolean;
  /** accent = "there is no data yet", muted = a softer/neutral emptiness. */
  tone?: "accent" | "muted" | "gold";
  /** Drop the outer padding when nested in a table cell or card body. */
  bare?: boolean;
  className?: string;
}

/**
 * "There is no data yet" — the invitation state. It always offers the next step
 * when the user is allowed to take it.
 *
 * NOT the same thing as `NoResultsState` (filters matched nothing): that one
 * offers "Zrušiť filtre" instead, and mixing the two is the classic mistake.
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
  secondaryActionLabel,
  onSecondaryAction,
  secondaryActionHref,
  canAct = true,
  tone = "accent",
  bare = false,
  className,
}: EmptyStateProps) {
  const showPrimary = canAct && actionLabel && (onAction || actionHref);
  const showSecondary =
    secondaryActionLabel && (onSecondaryAction || secondaryActionHref);

  return (
    <div
      className={cx(
        "state",
        tone === "muted" && "state-muted",
        tone === "gold" && "state-gold",
        bare && "state-bare",
        className,
      )}
    >
      <span className="state-icon">
        <Icon size={24} aria-hidden="true" />
      </span>
      <p className="state-title">{title}</p>
      {description ? <p className="state-desc">{description}</p> : null}
      {showPrimary || showSecondary ? (
        <div className="state-actions">
          {showPrimary ? (
            actionHref ? (
              <Link className="btn btn-accent" href={actionHref}>
                {actionLabel}
              </Link>
            ) : (
              <Button variant="accent" onClick={onAction}>
                {actionLabel}
              </Button>
            )
          ) : null}
          {showSecondary ? (
            secondaryActionHref ? (
              <Link className="btn btn-outline" href={secondaryActionHref}>
                {secondaryActionLabel}
              </Link>
            ) : (
              <Button variant="outline" onClick={onSecondaryAction}>
                {secondaryActionLabel}
              </Button>
            )
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
