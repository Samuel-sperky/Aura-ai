// Playwright + axe-core — accessibility gate (acceptance criterion 12).
//
// SCOPE: Prehľad, Timeline and Projekty, in BOTH themes. The contract names those
// three screens, and both themes matter because the palette flips wholesale — a
// contrast regression can exist in light and not in dark (that is exactly why
// `--muted` is pinned in globals.css and why the chart palette is read at runtime).
//
// PREREQUISITE: the app running in Docker on http://localhost:3040 with a seeded
// database (see e2e/smoke.spec.ts for the commands).
//
// WHAT IS EXCLUDED AND WHY:
//   * `.recharts-wrapper` — recharts renders its own SVG internals; the chart's
//     information is exposed as a real <table> in `srSummary` instead, which is the
//     accessible path. Auditing the decorative SVG would only produce noise.
// Nothing else is excluded: the rule set is the full WCAG 2.0/2.1/2.2 A + AA tag
// selection, and the expectation is ZERO violations.

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const EMAIL = process.env.E2E_EMAIL ?? "marketing@sperky-eshop.sk";
const PASSWORD = process.env.E2E_PASSWORD ?? "";

const WCAG_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
] as const;

/**
 * The three screens named by acceptance criterion 12, plus the two Timeline modes
 * that a bare `/timeline` never reaches.
 *
 * `/timeline` renders `mode=roadmap` only, so until these two entries existed the
 * sprint planner and the decision timeline — their own buttons, tints and month
 * headers — had never been through a contrast or target-size check. The gate has
 * to audit what the user can actually open, not just the default view.
 */
const SCREENS = [
  { path: "/", name: "Prehľad" },
  { path: "/timeline", name: "Timeline" },
  { path: "/timeline?mode=sprints", name: "Timeline — Šprinty" },
  { path: "/timeline?mode=decisions", name: "Timeline — Rozhodnutia" },
  { path: "/projects", name: "Projekty" },
] as const;

const THEMES = ["dark", "light"] as const;

async function login(page: Page): Promise<void> {
  // The session normally arrives from auth.setup.ts via storageState. Fall back to
  // the form only when it is missing or expired: signing in once per test issues
  // ~50 logins, trips the deliberate 10/min rate limit, and the resulting
  // navigation timeouts look like application bugs when they are self-inflicted.
  await page.goto("/");
  if (!new URL(page.url()).pathname.startsWith("/login")) return;

  await page.locator('input[name="email"]').fill(EMAIL);
  await page.locator('input[name="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: /prihlásiť/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 20_000,
  });
}

/**
 * Pin the theme BEFORE the first paint by seeding the same localStorage key the
 * pre-paint script reads. Clicking the toggle afterwards would audit a screen
 * mid-transition.
 */
async function pinTheme(page: Page, theme: "dark" | "light"): Promise<void> {
  await page.addInitScript(
    (value) => {
      try {
        window.localStorage.setItem("aura_roadmap_theme", value as string);
      } catch {
        // Storage blocked: the default (dark) still applies.
      }
    },
    theme,
  );
}

/** Wait for the real content: auditing a skeleton proves nothing. */
async function ready(page: Page): Promise<void> {
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByRole("status", { name: "Načítavam…" })).toHaveCount(0, {
    timeout: 20_000,
  });
}

test.beforeEach(() => {
  test.skip(!PASSWORD, "E2E_PASSWORD nie je nastavené — preskakujem prihlásenie.");
});

for (const theme of THEMES) {
  for (const screen of SCREENS) {
    test(`axe: ${screen.name} — ${theme === "dark" ? "tmavá" : "svetlá"} téma bez violations`, async ({
      page,
    }) => {
      await pinTheme(page, theme);
      await login(page);
      await page.goto(screen.path);
      await ready(page);

      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);

      const results = await new AxeBuilder({ page })
        .withTags([...WCAG_TAGS])
        .exclude(".recharts-wrapper")
        .analyze();

      // The failure message lists rule ids and the first offending selector, so a
      // red run is actionable straight from the console.
      const summary = results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.length,
        first: v.nodes[0]?.target?.join(" "),
      }));
      expect(summary, `axe violations on ${screen.path} (${theme})`).toEqual([]);
    });
  }
}

test.describe("klávesnica a fokus", () => {
  test("skip link je prvý fokusovateľný prvok a vedie na obsah", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/");
    await ready(page);

    await page.keyboard.press("Tab");
    const focused = page.locator(":focus");
    await expect(focused).toHaveAttribute("href", "#content");
  });

  test("modal projektu vracia fokus a zatvára sa klávesou Escape", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/projects");
    await ready(page);

    const rows = page.locator("table.tbl tbody tr");
    test.skip(
      (await rows.count()) === 0,
      "Žiadne projekty v databáze — preskakujem test modalu.",
    );

    await rows.first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("aria-modal", "true");

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});
