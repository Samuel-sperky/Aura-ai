// Playwright e2e — visual evidence for the sprint report.
//
// This spec asserts almost nothing; its job is to produce the screenshots the
// contract requires as acceptance evidence (dark, light, 390 px). Failures here
// mean a screen did not render at all, which the smoke spec would also catch.
//
//   docker compose --env-file .env up -d --build
//   npm run test:e2e -- screenshots
//
// Credentials come from E2E_EMAIL / E2E_PASSWORD, same as the other specs.
// Output: test-results/screenshots/ (gitignored).

import { expect, test, type Page } from "@playwright/test";

const EMAIL = process.env.E2E_EMAIL ?? "";
const PASSWORD = process.env.E2E_PASSWORD ?? "";
const OUT = "test-results/screenshots";

/** Sign in through the real form — the session cookie is http-only. */
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

/** Pin the theme before first paint, the same way the app's own script does. */
async function pinTheme(page: Page, theme: "dark" | "light"): Promise<void> {
  await page.addInitScript((value) => {
    window.localStorage.setItem("aura_roadmap_theme", value);
  }, theme);
}

/** Wait until the screen has replaced its first-load skeleton. */
async function ready(page: Page): Promise<void> {
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByRole("status", { name: "Načítavam…" })).toHaveCount(0, {
    timeout: 20_000,
  });
  // Let reveal animations and chart transitions settle so shots are not mid-fade.
  await page.waitForTimeout(600);
}

const SCREENS = [
  { slug: "prehlad", path: "/" },
  { slug: "timeline-roadmap", path: "/timeline?mode=roadmap&zoom=month" },
  { slug: "timeline-sprinty", path: "/timeline?mode=sprints&zoom=week" },
  { slug: "projekty", path: "/projects" },
  { slug: "ulohy", path: "/work-items" },
  { slug: "rozhodnutia", path: "/decisions" },
  { slug: "nastavenia", path: "/settings" },
];

test.beforeEach(() => {
  test.skip(!PASSWORD, "E2E_PASSWORD nie je nastavené — preskakujem screenshoty.");
});

for (const theme of ["dark", "light"] as const) {
  test.describe(`screenshoty — ${theme === "dark" ? "tmavá" : "svetlá"} téma, 1440 px`, () => {
    for (const screen of SCREENS) {
      test(`${screen.slug} (${theme})`, async ({ page }) => {
        await pinTheme(page, theme);
        await login(page);
        await page.goto(screen.path);
        await ready(page);
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        await page.screenshot({
          path: `${OUT}/${theme}-1440-${screen.slug}.png`,
          fullPage: true,
        });
      });
    }
  });
}

test.describe("screenshoty — mobil 390 px", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const screen of SCREENS.slice(0, 5)) {
    test(`${screen.slug} (390 px)`, async ({ page }) => {
      await pinTheme(page, "dark");
      await login(page);
      await page.goto(screen.path);
      await ready(page);

      // The page must not scroll sideways. Asserted as BEHAVIOUR, not geometry:
      // scrollWidth still reports the un-clipped content width even when
      // `overflow-x: clip` has made that content unreachable, and wide tables
      // legitimately scroll inside their own .tbl-wrap. What matters is that the
      // page itself cannot be panned away from the left edge.
      const scrolled = await page.evaluate(() => {
        window.scrollTo(9999, 0);
        const x = window.scrollX;
        window.scrollTo(0, 0);
        return x;
      });
      expect(scrolled, "stránka sa nesmie dať posunúť do strán na 390 px").toBe(0);

      await page.screenshot({
        path: `${OUT}/dark-390-${screen.slug}.png`,
        fullPage: true,
      });
    });
  }
});

test.describe("screenshoty — prihlasovacia obrazovka", () => {
  // Must be anonymous: with the saved session the app takes you off /login.
  test.use({ storageState: { cookies: [], origins: [] } });

  for (const theme of ["dark", "light"] as const) {
    test(`login (${theme})`, async ({ page }) => {
      await pinTheme(page, theme);
      await page.goto("/login");
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${OUT}/${theme}-1440-login.png`, fullPage: true });
    });
  }
});
