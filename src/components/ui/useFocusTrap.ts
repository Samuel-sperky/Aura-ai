"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type=hidden])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export interface FocusTrapOptions {
  /** Trap is only armed while true. */
  active: boolean;
  /** Called on Escape. Omit to make Escape inert (non-dismissible dialogs). */
  onEscape?: () => void;
  /** Lock document scroll while active (modals and drawers). */
  lockScroll?: boolean;
}

/**
 * Focus trap for `role="dialog" aria-modal` surfaces.
 *
 * - moves focus into the container on open (first focusable, else the container)
 * - cycles Tab / Shift+Tab inside it
 * - Escape calls `onEscape`
 * - restores focus to the previously active element on close
 * - optionally freezes body scroll
 *
 * Returns the ref to attach to the dialog container.
 */
export function useFocusTrap({
  active,
  onEscape,
  lockScroll = true,
}: FocusTrapOptions) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Latest-handler ref, written in an effect (never during render) so the trap
  // effect below does not have to re-run when the caller re-creates onEscape.
  const escapeRef = useRef<(() => void) | undefined>(undefined);
  useEffect(() => {
    escapeRef.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    if (!active) return;
    if (!containerRef.current) return;
    // Narrowed alias: TS drops the null-narrowing inside the nested handler.
    const container: HTMLDivElement = containerRef.current;

    const previous = document.activeElement as HTMLElement | null;
    const focusables = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );

    const first = focusables()[0];
    (first ?? container).focus({ preventScroll: true });

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (escapeRef.current) {
          event.preventDefault();
          escapeRef.current();
        }
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) {
        event.preventDefault();
        container.focus({ preventScroll: true });
        return;
      }
      const activeEl = document.activeElement as HTMLElement | null;
      const index = activeEl ? items.indexOf(activeEl) : -1;
      const lastIndex = items.length - 1;
      if (event.shiftKey && index <= 0) {
        event.preventDefault();
        items[lastIndex].focus();
      } else if (!event.shiftKey && index === lastIndex) {
        event.preventDefault();
        items[0].focus();
      }
    }

    document.addEventListener("keydown", onKeyDown, true);

    const body = document.body;
    const previousOverflow = body.style.overflow;
    if (lockScroll) body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      if (lockScroll) body.style.overflow = previousOverflow;
      previous?.focus?.({ preventScroll: true });
    };
  }, [active, lockScroll]);

  return containerRef;
}
