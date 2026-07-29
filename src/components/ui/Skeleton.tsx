import type { CSSProperties } from "react";
import { cx } from "./cx";

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  /** CSS radius override; defaults to --radius-sm. */
  radius?: string;
  className?: string;
  style?: CSSProperties;
}

function size(value: string | number | undefined): string | undefined {
  if (value === undefined) return undefined;
  return typeof value === "number" ? `${value}px` : value;
}

/** One shimmer block. Shimmer stops under prefers-reduced-motion. */
export function Skeleton({
  width = "100%",
  height = 16,
  radius,
  className,
  style,
}: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={cx("skeleton", className)}
      style={{
        display: "block",
        width: size(width),
        height: size(height),
        borderRadius: radius,
        ...style,
      }}
    />
  );
}

export interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

/** Stacked text lines; the last one is short so it reads as a paragraph. */
export function SkeletonText({ lines = 3, className }: SkeletonTextProps) {
  return (
    <span className={cx("skeleton-stack", className)} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} height={12} width={i === lines - 1 ? "62%" : "100%"} />
      ))}
    </span>
  );
}
