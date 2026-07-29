"use client";

import { useId } from "react";
import type { MouseEvent, ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./Button";
import { cx } from "./cx";
import { useFocusTrap } from "./useFocusTrap";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Actions rendered next to the close button in the header. */
  headerActions?: ReactNode;
  footer?: ReactNode;
  dismissible?: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * Right-hand side panel for secondary detail (work-item detail, activity feed).
 * Same a11y contract as Modal; full-width under 700 px.
 * Rule of thumb: Modal for a focused task, Drawer for browsing context.
 */
export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  headerActions,
  footer,
  dismissible = true,
  children,
  className,
}: DrawerProps) {
  const titleId = useId();
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
    <div className="drawer-backdrop" onMouseDown={onBackdrop}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cx("drawer", className)}
      >
        <div className="drawer-head">
          <div style={{ minWidth: 0 }}>
            <h2 id={titleId} style={{ fontSize: 18, fontWeight: 700 }}>
              {title}
            </h2>
            {subtitle ? <p className="modal-head-sub">{subtitle}</p> : null}
          </div>
          <div className="panel-head-actions">
            {headerActions}
            {dismissible ? (
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                icon={X}
                aria-label="Zavrieť"
                onClick={onClose}
              />
            ) : null}
          </div>
        </div>
        <div className="drawer-body">{children}</div>
        {footer ? <div className="panel-foot">{footer}</div> : null}
      </div>
    </div>
  );
}
