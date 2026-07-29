// Playwright e2e — /timeline (A8).
//
// PREREQUISITE: the app must be RUNNING IN DOCKER on http://localhost:3040 with a
// seeded database. A local `next dev` cannot reach the DB container (no host port
// mapping), so these specs are written against the container:
//
//   docker compose --env-file .env up -d --build
//   npm run db:migrate && npm run db:seed
//   npx playwright install chromium
//   npm run test:e2e -- timeline
//
// Credentials come from E2E_EMAIL / E2E_PASSWORD (same values as ADMIN_EMAIL /
// ADMIN_PASSWORD in .env). The spec needs an ADMIN or EDITOR: the keyboard-move
// test mutates a work item.
//
// The specs are written to be resilient about DATA: the seed has 2 sprints and ~20
// items, but which item sits in which bucket is not something a UI spec should
// pin. Anything data-dependent is skipped with an explicit reason rather than
// failed, so a thin database never produces a false red.

import { expect, test, type Page } from "@playwright/test";

const EMAIL = process.env.E2E_EMAIL ?? "marketing@sperky-eshop.sk";
const PASSWORD = process.env.E2E_PASSWORD ?? "";

const MODES = ["roadmap", "sprints", "decisions"] as const;
const ZOOMS = ["quarter", "month", "week"] as const;

/** Sign in through the real login form; the session cookie is http-only. */
async function login(page: Page): Promise<void> {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(EMAIL);
  await page.locator('input[name="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: /prihlásiť/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 20_000,
  });
}

/** Wait until the workspace replaced its first-load skeleton. */
async function timelineReady(page: Page): Promise<void> {
  await expect(page.getByRole("heading", { level: 1, name: "Timeline" })).toBeVisible();
  await expect(page.getByRole("tablist", { name: "Režim timeline" })).toBeVisible();
  await expect(page.getByRole("status", { name: "Načítavam…" })).toHaveCount(0, {
    timeout: 20_000,
  });
}

test.beforeEach(async ({ page }) => {
  test.skip(!PASSWORD, "E2E_PASSWORD nie je nastavené — preskakujem prihlásenie.");
  await login(page);
});

test.describe("/timeline", () => {
  test("otvorí sa v režime Roadmap so zoomom Mesiac a stav je v URL", async ({
    page,
  }) => {
    await page.goto("/timeline");
    await timelineReady(page);

    // The default view writes itself into the URL (clearOnDefault: false), so a
    // shared link always reproduces the exact screen.
    await expect(page).toHaveURL(/[?&]mode=roadmap\b/);
    await expect(page).toHaveURL(/[?&]zoom=month\b/);
    await expect(
      page.getByRole("tab", { name: "Roadmap", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    // "Dnes" appears twice on purpose: the header flag and the legend.
    await expect(page.getByText("Dnes", { exact: true }).first()).toBeVisible();
  });

  test("prepne všetky tri režimy a filtre zostanú v URL", async ({ page }) => {
    await page.goto("/timeline");
    await timelineReady(page);

    for (const mode of MODES) {
      const label =
        mode === "roadmap" ? "Roadmap" : mode === "sprints" ? "Šprinty" : "Rozhodnutia";
      await page.getByRole("tab", { name: label, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`[?&]mode=${mode}\\b`));
      await expect(page.getByRole("tab", { name: label, exact: true })).toHaveAttribute(
        "aria-selected",
        "true",
      );
    }

    // The decisions mode is a QUEUE, not an axis — it must not draw a time header.
    await expect(page.getByRole("tablist", { name: "Priblíženie" })).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Rozhodovacia fronta" }),
    ).toBeVisible();
  });

  test("prepne všetky tri zoomy a drží ich v URL", async ({ page }) => {
    await page.goto("/timeline?mode=roadmap&zoom=month");
    await timelineReady(page);

    for (const zoom of ZOOMS) {
      const label =
        zoom === "quarter" ? "Kvartál" : zoom === "month" ? "Mesiac" : "Týždeň";
      await page.getByRole("tab", { name: label, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`[?&]zoom=${zoom}\\b`));
      // The mode must survive a zoom change — both live in the same query string.
      await expect(page).toHaveURL(/[?&]mode=roadmap\b/);
      await expect(
        page.getByRole("group", { name: "Projekty podľa oblasti" }),
      ).toBeVisible();
    }
  });

  test("URL je zdroj pravdy — deep link otvorí sprintový režim", async ({ page }) => {
    await page.goto("/timeline?mode=sprints&zoom=week");
    await timelineReady(page);
    await expect(page.getByRole("tab", { name: "Šprinty", exact: true })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.getByRole("tab", { name: "Týždeň", exact: true })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.getByRole("heading", { name: "Plánovanie šprintu" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Kapacita osôb" })).toBeVisible();
  });

  test("checkpoint modal má 4 taby a Rozhodnúť je pod 100 % pripravenosti vypnuté", async ({
    page,
  }) => {
    await page.goto("/timeline?mode=decisions");
    await timelineReady(page);

    const rows = page.locator("ol li > button");
    const count = await rows.count();
    test.skip(count === 0, "Rozhodovacia fronta je prázdna — nie je čo otvoriť.");

    // Pick the first queue row that is NOT fully ready, so the lock is testable.
    let opened = false;
    for (let i = 0; i < count; i += 1) {
      const row = rows.nth(i);
      const text = (await row.innerText()).replace(/\s+/g, " ");
      if (/\b100 %/.test(text)) continue;
      await row.click();
      opened = true;
      break;
    }
    test.skip(!opened, "Každý checkpoint je na 100 % — uzamknutie sa nedá overiť.");

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    // Deep link: the modal is addressable.
    await expect(page).toHaveURL(/[?&]checkpoint=/);

    // Exactly the four tabs from spec Q38, in order.
    const tabs = dialog.getByRole("tablist", { name: "Detail checkpointu" });
    await expect(tabs.getByRole("tab")).toHaveCount(4);
    for (const name of ["Prehľad", "Podmienky", "Rozhodnutie", "Aktivita"]) {
      await expect(tabs.getByRole("tab", { name: new RegExp(name) })).toBeVisible();
    }

    await tabs.getByRole("tab", { name: /Rozhodnutie/ }).click();
    await expect(
      dialog.getByText("Rozhodnutie je uzamknuté, kým pripravenosť nedosiahne 100 %."),
    ).toBeVisible();
    const decide = dialog.getByRole("button", { name: "Rozhodnúť" });
    await expect(decide).toBeDisabled();

    // Closing clears the deep link so the back button behaves.
    await dialog.getByRole("button", { name: "Zavrieť" }).last().click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page).not.toHaveURL(/[?&]checkpoint=/);
  });

  test("klávesnicový presun: M otvorí dialóg, výber a potvrdenie položku presunú", async ({
    page,
  }) => {
    await page.goto("/timeline?mode=sprints&zoom=week");
    await timelineReady(page);

    // Backlog column, first card. The card itself is the shortcut host.
    const backlog = page.getByRole("list", {
      name: /^Backlog — Položky v šprinte$/,
    });
    const card = backlog.getByRole("listitem").first();
    const cards = await backlog.getByRole("listitem").count();
    test.skip(cards === 0, "Backlog je prázdny — presun sa nedá overiť.");
    // The card's accessible name IS the item title (see PlannerItem).
    const title = (await card.getAttribute("aria-label")) ?? "";
    test.skip(!title, "Karta v backlogu nemá názov — nečakaný stav DOM.");

    // Focus WITHOUT a mouse drag: this is the whole point of the alternative.
    await card.focus();
    await expect(card).toBeFocused();
    await expect(card).toHaveAttribute("aria-keyshortcuts", /M/);

    await page.keyboard.press("m");

    const dialog = page.getByRole("dialog", { name: /Presunúť položku/ });
    await expect(dialog).toBeVisible();

    const select = dialog.getByLabel("Cieľový šprint");
    const options = await select.locator("option").count();
    test.skip(
      options < 2,
      "V horizonte nie je žiadny šprint — nie je kam položku presunúť.",
    );

    // Pick the first real sprint (index 0 is "Backlog (bez šprintu)").
    const targetValue = await select.locator("option").nth(1).getAttribute("value");
    await select.selectOption(targetValue!);
    await dialog.getByRole("button", { name: "Presunúť", exact: true }).click();

    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("status").filter({ hasText: /presunut/i })).toBeVisible({
      timeout: 15_000,
    });
    // The card left the backlog.
    await expect(backlog.getByRole("listitem", { name: title })).toHaveCount(0, {
      timeout: 15_000,
    });
  });

  test("mobil 390 px: timeline sa dá čítať a drag&drop je vypnutý", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/timeline?mode=sprints&zoom=week");
    await timelineReady(page);

    await expect(
      page.getByText("Presúvanie myšou je na mobile vypnuté — použite tlačidlo Presunúť."),
    ).toBeVisible();
    // No grab handles are offered at this width.
    await expect(page.getByRole("button", { name: /^Uchopiť a presunúť/ })).toHaveCount(0);
    // The page itself never scrolls sideways — only the chart does.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
