import { TriangleAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";

export interface ErrorStateProps {
  title?: string;
  /**
   * Always a plain Slovak sentence. NEVER a raw stack or an English framework
   * message — log the detail to the console instead.
   */
  message?: string;
  /** Wire to the caller's refetch. Omit for non-retryable failures. */
  onRetry?: () => void;
  retryLabel?: string;
  icon?: LucideIcon;
  bare?: boolean;
  className?: string;
}

/**
 * "We could not load this." `role="alert"` because a failed load is not
 * something the user should have to notice on their own.
 */
export function ErrorState({
  title = "Údaje sa nepodarilo načítať",
  message = "Skúste to prosím znova. Ak problém trvá, ozvite sa správcovi.",
  onRetry,
  retryLabel = "Skúsiť znova",
  icon: Icon = TriangleAlert,
  bare = false,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cx("state", "state-error", bare && "state-bare", className)}
    >
      <span className="state-icon">
        <Icon size={24} aria-hidden="true" />
      </span>
      <p className="state-title">{title}</p>
      <p className="state-desc">{message}</p>
      {onRetry ? (
        <div className="state-actions">
          <Button variant="outline" onClick={onRetry}>
            {retryLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
