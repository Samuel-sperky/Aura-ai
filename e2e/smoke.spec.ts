// Playwright e2e — the cross-screen smoke path (A9).
//
// PREREQUISITE: the app must be RUNNING IN DOCKER on http://localhost:3040 with a
// seeded database. A local `next dev` cannot reach the DB container (no host port
// mapping), so this spec is written against the container:
//
//   docker compose --env-file .env up -d --build
//   npm run db:migrate && npm run db:seed
//   npx playwright install chromium
//   npm run test:e2e -- smoke
//
// Credentials come from E2E_EMAIL / E2E_PASSWORD (the same values as ADMIN_EMAIL /
// ADMIN_PASSWORD in .env). Without a password every test SKIPS rather than fails —
// a missing local secret is not a regression.
//
// SELECTOR POLICY: this spec asserts STRUCTURE and BEHAVIOUR, not copy. Labels come
// from `t()`, and the module key files are merged into the i18n registry by A10, so
// pinning Slovak strings here would make the suite fail on ordering between agents
// rather than on a real defect. Where a label is stable (A7's components hard-code
// their Slovak, and `commonKeys` is already merged) it is used.

import { expect, test, type Page } from "@playwright/test";

const EMAIL = process.env.E2E_EMAIL ?? "marketing@sperky-eshop.sk";
const PASSWORD = process.env.E2E_PASSWORD ?? "";

/** Sign in through the real form — the session cookie is http-only. */
async function login(page: Page): Promise<void> {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(EMAIL);
  await page.locator('input[name="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: /prihlásiť/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 20_000,
  });
}

/** Wait until a data screen has replaced its first-load skeleton. */
async function ready(page: Page): Promise<void> {
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByRole("status", { name: "Načítavam…" })).toHaveCount(0, {
    timeout: 20_000,
  });
}

/** No screen in the happy path may end up on an error state. */
async function noErrorState(page: Page): Promise<void> {
  await expect(
    page.getByText("Údaje sa nepodarilo načítať", { exact: false }),
  ).toHaveCount(0);
}

test.beforeEach(async ({ page }) => {
  test.skip(!PASSWORD, "E2E_PASSWORD nie je nastavené — preskakujem prihlásenie.");
  await login(page);
});

test.describe("smoke — celá cesta aplikáciou", () => {
  test("Prehľad ukáže KPI strip, graf a zoznam projektov", async ({ page }) => {
    await page.goto("/");
    await ready(page);
    await noErrorState(page);

    // Six KPI tiles (spec Q1) on the one KPI grid of the screen.
    const tiles = page.locator(".kpi-grid").first().locator(".stat");
    await expect(tiles).toHaveCount(6);

    // The ONE chart (spec Q4) plus its screen-reader table.
    await expect(page.locator(".chart-card")).toHaveCount(1);

    // The project block is a table with at least a header row.
    await expect(page.locator("table.tbl").first()).toBeVisible();
  });

  test("Prehľad má tlačidlo na skopírovanie súhrnu", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/");
    await ready(page);

    // "Kopírovať súhrn" is in commonKeys, so this label is stable.
    const copy = page.getByRole("button", { name: /kopírovať súhrn/i });
    await expect(copy).toBeVisible();
    await copy.click();

    // A toast confirms either way; the point is that the click does not throw.
    await expect(page.getByRole("status").first()).toBeVisible();
  });

  test("Projekty: filter drží v URL a riadok otvorí detail modal", async ({
    page,
  }) => {
    await page.goto("/projects");
    await ready(page);
    await noErrorState(page);

    // --- filter into the URL (nuqs) ---
    const search = page.getByRole("searchbox").first();
    await search.fill("a");
    await expect(page).toHaveURL(/[?&]q=a\b/, { timeout: 10_000 });

    // The chip tray reflects the active filter.
    await expect(page.locator(".chip-tray")).toBeVisible();

    await search.fill("");
    await expect(page).not.toHaveURL(/[?&]q=/, { timeout: 10_000 });

    // --- the detail modal lives in ?project=<id> ---
    const rows = page.locator("table.tbl tbody tr");
    const count = await rows.count();
    test.skip(count === 0, "Žiadne projekty v databáze — preskakujem detail.");

    await rows.first().click();
    await expect(page).toHaveURL(/[?&]project=/, { timeout: 10_000 });

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    // Four tabs: Prehľad · Položky · Checkpointy · Aktivita (spec Q22).
    await expect(dialog.getByRole("tab")).toHaveCount(4);

    await dialog.getByRole("button", { name: "Zavrieť" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page).not.toHaveURL(/[?&]project=/);
  });

  test("Projekty: prepínač tabuľka / karty mení reprezentáciu", async ({
    page,
  }) => {
    await page.goto("/projects");
    await ready(page);

    const rows = page.locator("table.tbl tbody tr");
    test.skip(
      (await rows.count()) === 0,
      "Žiadne projekty v databáze — preskakujem prepínač zobrazenia.",
    );

    // The Segmented control is a tablist; the second tab is the card view.
    const switcher = page.locator(".segmented").last();
    await switcher.getByRole("tab").nth(1).click();
    await expect(page).toHaveURL(/[?&]view=cards\b/, { timeout: 10_000 });
    await expect(page.locator(".cards-grid")).toBeVisible();

    await switcher.getByRole("tab").nth(0).click();
    await expect(page.locator("table.tbl").first()).toBeVisible();
  });

  test("Úlohy: rozbalenie podúlohy načíta druhú úroveň", async ({ page }) => {
    await page.goto("/work-items");
    await ready(page);
    await noErrorState(page);

    // Only a parent renders a twisty, so this locator IS the "has subtasks" test.
    const twisty = page.locator('button[aria-expanded="false"]').first();
    const hasParent = (await twisty.count()) > 0;
    test.skip(
      !hasParent,
      "Žiadna položka s podúlohami — preskakujem rozbalenie hierarchie.",
    );

    await twisty.click();
    await expect(twisty).toHaveAttribute("aria-expanded", "true");
    // Either the loaded children or the explicit "no subtasks" row appears.
    await expect(page.locator(".wl-children")).toBeVisible({ timeout: 10_000 });
  });

  test("Úlohy: prepínač na board zobrazí štyri stavové stĺpce", async ({
    page,
  }) => {
    await page.goto("/work-items");
    await ready(page);

    const anyRow = page.locator(".wl-item");
    test.skip(
      (await anyRow.count()) === 0,
      "Žiadne úlohy v databáze — preskakujem board.",
    );

    await page.locator(".segmented").last().getByRole("tab").nth(1).click();
    await expect(page).toHaveURL(/[?&]view=board\b/, { timeout: 10_000 });
    await expect(page.locator(".wb-col")).toHaveCount(4);
  });

  test("Rozhodnutia: fronta sa načíta bez chyby", async ({ page }) => {
    await page.goto("/decisions");
    await ready(page);
    await noErrorState(page);

    // Four summary tiles above the queue.
    await expect(page.locator(".kpi-grid").first().locator(".stat")).toHaveCount(4);
  });

  test("Nastavenia: prepnutie témy na svetlú a späť na tmavú", async ({
    page,
  }) => {
    await page.goto("/settings?section=appearance");
    await ready(page);

    // `appearance.*` lives in commonKeys, which is already merged — stable labels.
    const themes = page.getByRole("tablist", { name: "Téma" });
    await expect(themes).toBeVisible();

    await themes.getByRole("tab", { name: "Svetlá téma" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

    await themes.getByRole("tab", { name: "Tmavá téma" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("Nastavenia: hustota sa dá prepnúť na kompaktnú", async ({ page }) => {
    await page.goto("/settings?section=appearance");
    await ready(page);

    const density = page.getByRole("tablist", { name: "Hustota zobrazenia" });
    await density.getByRole("tab", { name: "Kompaktná" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-density", "compact");

    await density.getByRole("tab", { name: "Pohodlná" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-density", "cozy");
  });

  test("Nastavenia: sekcia je v URL a dá sa na ňu odkázať", async ({ page }) => {
    await page.goto("/settings?section=account");
    await ready(page);
    // The account section carries the password form.
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });
});
