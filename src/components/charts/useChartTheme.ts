"use client";

import { useEffect, useState } from "react";
import { chartTheme } from "@/lib/chartTheme";
import type { ChartTheme } from "@/lib/chartTheme";

/**
 * The live chart palette, re-read whenever `data-theme` or `data-density`
 * changes on <html>.
 *
 * The first render returns the SSR-safe light fallbacks; the effect immediately
 * swaps in the computed values. That keeps recharts (which needs literal colour
 * strings) honest across the theme toggle without a manual refresh.
 */
export function useChartTheme(): ChartTheme {
  const [theme, setTheme] = useState<ChartTheme>(() => chartTheme());

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setTheme(chartTheme());
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["data-theme", "data-density"],
    });
    return () => observer.disconnect();
  }, []);

  return theme;
}
