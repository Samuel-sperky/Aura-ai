import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Static contract test for the ONE stylesheet. These are the design rules the
// family keeps breaking by hand, so they are enforced mechanically.

const PATH = fileURLToPath(new URL("./globals.css", import.meta.url));
const CSS = readFileSync(PATH, "utf8");
const LINES = CSS.split("\n").length;

/**
 * Every innermost rule in the file as { selector, body }.
 *
 * The regex matches only blocks whose body has no braces, i.e. the leaf rules.
 * An at-rule wrapper (`@media …`) therefore never matches itself, but the rules
 * inside it do — including the token overrides in `@media print`, whose selector
 * still mentions `:root` and is correctly treated as a token block.
 */
function leafRules(): Array<{ selector: string; body: string }> {
  const rules: Array<{ selector: string; body: string }> = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(CSS)) !== null) {
    rules.push({ selector: match[1].trim(), body: match[2] });
  }
  return rules;
}

/** A rule allowed to hold raw colour literals: it only defines tokens. */
function isTokenBlock(selector: string): boolean {
  return selector.includes(":root");
}

describe("iron rule: raw colour literals live only in the token blocks", () => {
  it("has no hex colour outside a :root block", () => {
    const offenders = leafRules()
      .filter((r) => !isTokenBlock(r.selector))
      .filter((r) => /#[0-9a-fA-F]{3,8}\b/.test(r.body))
      .map((r) => r.selector);
    expect(offenders).toEqual([]);
  });

  it("has no rgb()/rgba() outside a :root block", () => {
    const offenders = leafRules()
      .filter((r) => !isTokenBlock(r.selector))
      .filter((r) => /\brgba?\s*\(/.test(r.body))
      .map((r) => r.selector);
    expect(offenders).toEqual([]);
  });

  it("has no hsl()/hsla() anywhere (the palette is hex + color-mix)", () => {
    expect(CSS).not.toMatch(/\bhsla?\s*\(/);
  });

  it("tints exclusively through color-mix", () => {
    // If we tint at all, it is via color-mix — proves the rule is live, not
    // satisfied by simply avoiding tints.
    expect(CSS).toMatch(/color-mix\(in srgb, var\(--/);
  });
});

describe("no leftovers from the source app", () => {
  it("contains no --ns-* alias layer", () => {
    expect(CSS).not.toContain("--ns-");
  });

  it("never mentions the old product name", () => {
    expect(CSS.toLowerCase()).not.toContain("northstar");
  });

  it("has no --aurora gradient (Aura retired it)", () => {
    expect(CSS).not.toContain("--aurora");
  });
});

describe("token contract", () => {
  const rootBlock = /:root\s*\{([\s\S]*?)\}/.exec(CSS)?.[1] ?? "";
  const darkBlock =
    /:root\[data-theme="dark"\]\s*\{([\s\S]*?)\}/.exec(CSS)?.[1] ?? "";
  const compactBlock =
    /:root\[data-density="compact"\]\s*\{([\s\S]*?)\}/.exec(CSS)?.[1] ?? "";

  it("keeps --muted at exactly #566964 in light (WCAG AA floor)", () => {
    expect(rootBlock).toMatch(/--muted:\s*#566964\s*;/);
  });

  it("declares the dark palette on :root[data-theme=\"dark\"]", () => {
    expect(darkBlock).toMatch(/--bg:\s*#0e1413\s*;/);
    expect(darkBlock).toMatch(/--muted:\s*#8a9b98\s*;/);
    expect(darkBlock).toContain("color-scheme: dark");
  });

  it("keeps --brand-gold theme-invariant (light only, never overridden)", () => {
    expect(rootBlock).toMatch(/--brand-gold:\s*#d8b878\s*;/);
    expect(darkBlock).not.toMatch(/--brand-gold\s*:/);
  });

  it("declares the full radius, spacing and transition scales", () => {
    for (const name of ["--radius-sm", "--radius-md", "--radius-lg", "--radius-pill"]) {
      expect(rootBlock).toContain(`${name}:`);
    }
    for (let i = 1; i <= 8; i += 1) {
      expect(rootBlock).toContain(`--space-${i}:`);
    }
    expect(rootBlock).toMatch(/--transition:\s*0?\.18s cubic-bezier/);
  });

  it("declares the shell geometry tokens", () => {
    expect(rootBlock).toMatch(/--sidebar-width:\s*248px\s*;/);
    expect(rootBlock).toMatch(/--content-max:\s*1440px\s*;/);
    expect(rootBlock).toContain("--control-h:");
  });

  it("declares eight chart tokens in both themes", () => {
    for (let i = 1; i <= 8; i += 1) {
      expect(rootBlock).toContain(`--chart-${i}:`);
      expect(darkBlock).toContain(`--chart-${i}:`);
    }
  });

  it("shrinks --control-h and --kpi-value in the compact density", () => {
    expect(rootBlock).toMatch(/--control-h:\s*34px\s*;/);
    expect(compactBlock).toMatch(/--control-h:\s*30px\s*;/);
    const cozyKpi = /--kpi-value:\s*(\d+)px/.exec(rootBlock)?.[1];
    const compactKpi = /--kpi-value:\s*(\d+)px/.exec(compactBlock)?.[1];
    expect(Number(compactKpi)).toBeLessThan(Number(cozyKpi));
  });
});

describe("accessibility and responsiveness blocks", () => {
  it("has a prefers-reduced-motion block that also kills scroll-behavior", () => {
    const block = /@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/.exec(
      CSS,
    );
    expect(block, "prefers-reduced-motion block missing").not.toBeNull();
    expect(block![1]).toContain("animation-duration");
    expect(block![1]).toContain("transition-duration");
    expect(block![1]).toContain("scroll-behavior");
  });

  it("defines a global :focus-visible ring", () => {
    expect(CSS).toMatch(/:focus-visible\s*\{\s*outline:\s*2px solid var\(--accent\)/);
  });

  it("puts tabular-nums on body", () => {
    const body = /\nbody\s*\{([\s\S]*?)\}/.exec(CSS);
    expect(body).not.toBeNull();
    expect(body![1]).toContain("font-variant-numeric: tabular-nums");
  });

  it("has the three family breakpoints", () => {
    for (const px of [1100, 900, 700]) {
      expect(CSS).toContain(`@media (max-width: ${px}px)`);
    }
  });

  it("makes modals fullscreen under 700px", () => {
    const mobile = /@media \(max-width: 700px\)\s*\{([\s\S]*?)\n\}/.exec(CSS);
    expect(mobile).not.toBeNull();
    expect(mobile![1]).toContain(".modal");
    expect(mobile![1]).toContain("border-radius: 0");
  });

  it("has a print block", () => {
    expect(CSS).toContain("@media print");
  });
});

describe("file size", () => {
  it("stays under 700 lines", () => {
    expect(LINES).toBeLessThan(700);
  });
});
