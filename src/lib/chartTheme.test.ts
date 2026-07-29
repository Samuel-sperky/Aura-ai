import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

import {
  CHART_SERIES_VARS,
  LIGHT_FALLBACK,
  areaFill,
  chartTheme,
  cssVar,
  seriesColor,
  token,
} from "./chartTheme";

const CSS = readFileSync(
  fileURLToPath(new URL("../app/globals.css", import.meta.url)),
  "utf8",
);

/** The first `:root { … }` block — the light palette. */
function lightRootBlock(): string {
  const match = /:root\s*\{([\s\S]*?)\}/.exec(CSS);
  if (!match) throw new Error("globals.css: :root block not found");
  return match[1];
}

/** Read one custom property out of a declaration block. */
function declaredValue(block: string, name: string): string | null {
  const re = new RegExp(`${name}\\s*:\\s*([^;]+);`);
  const match = re.exec(block);
  return match ? match[1].trim() : null;
}

afterEach(() => {
  delete (globalThis as Record<string, unknown>).document;
  delete (globalThis as Record<string, unknown>).getComputedStyle;
});

describe("drift test: LIGHT_FALLBACK vs :root in globals.css", () => {
  const block = lightRootBlock();

  it.each(Object.keys(LIGHT_FALLBACK))(
    "%s matches the value declared in :root",
    (name) => {
      const declared = declaredValue(block, name);
      expect(declared, `${name} is not declared in :root`).not.toBeNull();
      expect(declared?.toLowerCase()).toBe(
        LIGHT_FALLBACK[name as keyof typeof LIGHT_FALLBACK].toLowerCase(),
      );
    },
  );

  it("covers all eight chart series tokens", () => {
    for (const name of CHART_SERIES_VARS) {
      expect(Object.keys(LIGHT_FALLBACK)).toContain(name);
    }
  });

  it("declares a dark override for every chart series token", () => {
    const dark = /:root\[data-theme="dark"\]\s*\{([\s\S]*?)\}/.exec(CSS);
    expect(dark, "dark palette block not found").not.toBeNull();
    for (const name of CHART_SERIES_VARS) {
      expect(declaredValue(dark![1], name), `${name} has no dark value`).not.toBeNull();
    }
  });

  it("keeps every fallback a literal hex (no var() indirection)", () => {
    for (const value of Object.values(LIGHT_FALLBACK)) {
      expect(value).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe("cssVar", () => {
  it("returns the fallback when there is no DOM", () => {
    expect(cssVar("--chart-1", "#000000")).toBe("#000000");
  });

  it("prefers the computed value and trims it", () => {
    Object.assign(globalThis, {
      document: { documentElement: {} },
      getComputedStyle: () => ({
        getPropertyValue: (name: string) =>
          name === "--chart-1" ? "  #123456 " : "",
      }),
    });
    expect(cssVar("--chart-1", "#000000")).toBe("#123456");
    // Empty computed value → fallback, not "".
    expect(cssVar("--chart-2", "#abcdef")).toBe("#abcdef");
  });

  it("falls back when getComputedStyle throws", () => {
    Object.assign(globalThis, {
      document: { documentElement: {} },
      getComputedStyle: () => {
        throw new Error("detached");
      },
    });
    expect(token("--muted")).toBe(LIGHT_FALLBACK["--muted"]);
  });
});

describe("palette helpers", () => {
  it("wraps seriesColor around the eight tokens", () => {
    expect(seriesColor(0)).toBe(LIGHT_FALLBACK["--chart-1"]);
    expect(seriesColor(8)).toBe(LIGHT_FALLBACK["--chart-1"]);
    expect(seriesColor(9)).toBe(LIGHT_FALLBACK["--chart-2"]);
    expect(seriesColor(-1)).toBe(LIGHT_FALLBACK["--chart-8"]);
  });

  it("builds a transparent color-mix area fill, never a solid colour", () => {
    expect(areaFill("var(--chart-1)")).toBe(
      "color-mix(in srgb, var(--chart-1) 14%, transparent)",
    );
    expect(areaFill("var(--chart-2)", 8)).toContain("8%");
  });

  it("chartTheme exposes eight series plus grid/axis colours", () => {
    const theme = chartTheme();
    expect(theme.series).toHaveLength(8);
    expect(theme.grid).toBe(LIGHT_FALLBACK["--border"]);
    expect(theme.axis).toBe(LIGHT_FALLBACK["--muted"]);
    expect(theme.gold).toBe(LIGHT_FALLBACK["--brand-gold"]);
  });
});
