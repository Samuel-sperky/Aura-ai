"use client";

import { useId } from "react";
import type { MouseEvent, ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./Button";
import { cx } from "./cx";
import { useFocusTrap } from "./useFocusTrap";

export interface ModalProps {
  open: boolean;
  /** Called by Escape, the backdrop and the close button. */
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  size?: "sm" | "md" | "lg";
  /** Sticky footer, normally the action buttons. */
  footer?: ReactNode;
  /**
   * false locks the dialog: no Escape, no backdrop click, no close button.
   * Use for irreversible flows mid-submit.
   */
  dismissible?: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * Centred modal dialog. Focus-trapped, `role="dialog" aria-modal`, sticky header
 * and footer, and FULLSCREEN under 700 px (handled by globals.css).
 * Renders nothing when closed — no hidden DOM, no stray tab stops.
 */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  size = "md",
  footer,
  dismissible = true,
  children,
  className,
}: ModalProps) {
  const titleId = useId();
  const descId = useId();
  const ref = useFocusTrap({
    active: open,
    onEscape: dismissible ? onClose : undefined,
  });

  if (!open) return null;

  function onBackdrop(event: MouseEvent<HTMLDivElement>) {
    if (!dismissible) return;
    if (event.target === event.currentTarget) onClose();
  }

  return (
    <div className="modal-backdrop" onMouseDown={onBackdrop}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? descId : undefined}
        tabIndex={-1}
        className={cx(
          "modal",
          size === "sm" && "modal-sm",
          size === "lg" && "modal-lg",
          className,
        )}
      >
        <div className="modal-head">
          <div style={{ minWidth: 0 }}>
            <h2 id={titleId}>{title}</h2>
            {subtitle ? (
              <p id={descId} className="modal-head-sub">
                {subtitle}
              </p>
            ) : null}
          </div>
          {dismissible ? (
            <Button
              className="modal-close"
              variant="ghost"
              size="sm"
              iconOnly
              icon={X}
              // Not plain "Zavrieť": modal footers carry their own Zavrieť button,
              // so two controls in the same dialog would share one accessible name.
              aria-label="Zavrieť dialóg"
              onClick={onClose}
            />
          ) : null}
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-foot">{footer}</div> : null}
      </div>
    </div>
  );
}
