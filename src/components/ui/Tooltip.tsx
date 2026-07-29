import type { ReactNode } from "react";
import { cx } from "./cx";

export interface TooltipProps {
  /** Plain text only — rendered through CSS `content: attr(data-tip)`. */
  tip: string;
  children: ReactNode;
  /** Renders as an inline-flex span by default. */
  className?: string;
}

/**
 * CSS-only tooltip: no portal, no JS, no layout thrash. Because it is decorative
 * the tip text is ALSO exposed as `title`, so assistive tech and touch users get
 * it. Never put essential information here — only abbreviated labels and hints.
 */
export function Tooltip({ tip, children, className }: TooltipProps) {
  return (
    <span
      data-tip={tip}
      title={tip}
      className={cx(className)}
      style={{ display: "inline-flex", alignItems: "center" }}
    >
      {children}
    </span>
  );
}

/**
 * Spread onto any element to give it the same tooltip without a wrapper node:
 *   <button {...tooltipProps("Kopírovať súhrn")} />
 */
export function tooltipProps(tip: string): { "data-tip": string; title: string } {
  return { "data-tip": tip, title: tip };
}
