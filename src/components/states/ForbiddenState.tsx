import Link from "next/link";
import { ShieldOff } from "lucide-react";
import { cx } from "@/components/ui/cx";

export interface ForbiddenStateProps {
  title?: string;
  message?: string;
  /** Where "Späť na prehľad" points. */
  homeHref?: string;
  bare?: boolean;
  className?: string;
}

/**
 * "You do not have access to this." Muted, never a retry (retrying will not
 * grant rights) and it always offers a way out.
 *
 * This is the VISUAL only — the real gate is `requireRight()` on the server.
 */
export function ForbiddenState({
  title = "Nemáte prístup",
  message = "Na túto časť aplikácie nemáte oprávnenie. Ak ho potrebujete, požiadajte správcu.",
  homeHref = "/",
  bare = false,
  className,
}: ForbiddenStateProps) {
  return (
    <div
      className={cx("state", "state-muted", bare && "state-bare", className)}
    >
      <span className="state-icon">
        <ShieldOff size={24} aria-hidden="true" />
      </span>
      <p className="state-title">{title}</p>
      <p className="state-desc">{message}</p>
      <div className="state-actions">
        <Link className="btn btn-outline" href={homeHref}>
          Späť na prehľad
        </Link>
      </div>
    </div>
  );
}
