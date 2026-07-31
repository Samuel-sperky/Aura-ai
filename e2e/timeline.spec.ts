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
//
// A5 added the second half of the file: the VERTICAL roadmap (axis length per zoom,
// a collapsed area surviving a reload, the bar as the project's click target, the
// markers keeping their own click) and the decision axis (months as sections, one
// "Dnes" rule between what is late and what is ahead), plus the 390 px rule that the
// page may never be pannable sideways in either mode.
//
// SELECTORS. CSS-module class names are hashed at build time, so nothing here may
// name a `vt*` / `dt*` class. Everything is located by role, by accessible name
// (`exact: true` — names match as a SUBSTRING by default) or by an attribute that is
// NOT the one under test: area headers come from `aria-controls`, never from
// `aria-expanded`, which stops matching the moment the click lands.

import { expect, test, type Locator, type Page } from "@playwright/test";

const EMAIL = process.env.E2E_EMAIL ?? "marketing@sperky-eshop.sk";
const PASSWORD = process.env.E2E_PASSWORD ?? "";

const MODES = ["roadmap", "sprints", "decisions"] as const;
const ZOOMS = ["quarter", "month", "week"] as const;

type Zoom = (typeof ZOOMS)[number];

const ZOOM_LABEL: Record<Zoom, string> = {
  quarter: "Kvartál",
  month: "Mesiac",
  week: "Týždeň",
};

/**
 * How many WHOLE units the roadmap horizon has per zoom.
 *
 * Deliberately written out here instead of imported from `@/lib/timeline`: this is
 * the contract the axis is supposed to honour, and a test that reads the number
 * from the code under test cannot notice the number changing. Keep in sync with
 * `ROADMAP_HORIZON` — 8 quarters / 12 months / 12 weeks — and change it here only
 * together with a deliberate change of the horizon.
 */
const ROADMAP_COLUMNS: Record<Zoom, number> = { quarter: 8, month: 12, week: 12 };

/**
 * `columnTitle()` of the first axis cell, per zoom. Asserted alongside the count so
 * "twelve cells" cannot be satisfied by twelve cells of the wrong GRAIN — twelve
 * months and twelve weeks are both twelve.
 */
const UNIT_TITLE: Record<Zoom, RegExp> = {
  quarter: /^Q[1-4] \d{4}$/,
  month: /^\p{L}+ \d{4}$/u,
  week: /^\d{1,2}\. týždeň \d{4}$/,
};

/** Sign in through the real login form; the session cookie is http-only. */
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

/** Wait until the workspace replaced its first-load skeleton. */
async function timelineReady(page: Page): Promise<void> {
  await expect(page.getByRole("heading", { level: 1, name: "Timeline" })).toBeVisible();
  await expect(page.getByRole("tablist", { name: "Režim timeline" })).toBeVisible();
  await expect(page.getByRole("status", { name: "Načítavam…" })).toHaveCount(0, {
    timeout: 20_000,
  });
}

/**
 * The lane area of the vertical roadmap.
 *
 * `role="group"` and not `img`: the lanes hold real links and buttons, so the
 * container may not be a leaf node. `exact` because accessible names match as a
 * SUBSTRING by default.
 */
function roadmapBody(page: Page): Locator {
  return page.getByRole("group", { name: "Projekty podľa oblasti", exact: true });
}

/**
 * The month / quarter / week cells of the vertical axis.
 *
 * The axis is `aria-hidden` — its content is repeated in the screen-reader table —
 * so it has no role to be found by, and CSS-module class names are hashed at build
 * time. What is stable is the structure the component documents: the lane area is
 * the `role="group"`, its FIRST `aria-hidden` descendant is the axis, and every axis
 * cell is a `div` carrying the full unit name in `title` (`columnTitle`). The grid
 * rows behind the lanes are `span`s without a title, so they cannot be miscounted.
 */
function axisCells(page: Page): Locator {
  return roadmapBody(page)
    .locator('div[aria-hidden="true"]')
    .first()
    .locator("div[title]");
}

/**
 * How far the PAGE can be panned sideways, in pixels.
 *
 * Asserted by behaviour rather than geometry on purpose: `scrollWidth` reports the
 * unclipped width of the content even when none of it can be reached, so it answers
 * a different question than "can the reader push the page off screen".
 */
function pageScrollX(page: Page): Promise<number> {
  return page.evaluate(() => {
    window.scrollTo(9999, 0);
    const x = window.scrollX;
    window.scrollTo(0, 0);
    return x;
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

    // WHICH card can be moved is data-dependent, and NOT simply "the first one in
    // the backlog": the dialog offers only sprints from the item's OWN project,
    // because the API refuses a cross-project target with 400 "Šprint patrí inému
    // projektu." (see src/components/timeline/moveTargets.ts). On the seeded plan
    // the backlog holds items of projects that have no sprint in the horizon at
    // all, so their only destination is the backlog they are already in. Walk the
    // board and take the first card that has a REAL sprint to move to.
    const dialog = page.getByRole("dialog", { name: /Presunúť položku/ });
    const lists = await page.getByRole("list", { name: /— Položky v šprinte$/ }).all();

    let sourceName: string | null = null;
    let title: string | null = null;
    let targetValue: string | null = null;

    for (const list of lists) {
      const card = list.getByRole("listitem").first();
      if ((await card.count()) === 0) continue;
      // The card's accessible name IS the item title (see PlannerItem).
      const cardTitle = (await card.getAttribute("aria-label")) ?? "";
      const listName = (await list.getAttribute("aria-label")) ?? "";
      if (!cardTitle || !listName) continue;

      // Focus WITHOUT a mouse drag: this is the whole point of the alternative.
      await card.focus();
      await expect(card).toBeFocused();
      await expect(card).toHaveAttribute("aria-keyshortcuts", /M/);

      await page.keyboard.press("m");
      await expect(dialog).toBeVisible();

      const select = dialog.getByLabel("Cieľový šprint");
      // Option 0 is always "Backlog (bez šprintu)"; the rest are real sprints. The
      // one the item already sits in is useless — "Presunúť" stays disabled for it.
      const current = await select.inputValue();
      const values = await select
        .locator("option")
        .evaluateAll((nodes) => nodes.map((node) => (node as HTMLOptionElement).value));
      const sprintTarget = values.slice(1).find((value) => value !== current);

      if (sprintTarget === undefined) {
        await dialog.getByRole("button", { name: "Zrušiť", exact: true }).click();
        await expect(page.getByRole("dialog")).toHaveCount(0);
        continue;
      }

      await select.selectOption(sprintTarget);
      sourceName = listName;
      title = cardTitle;
      targetValue = sprintTarget;
      break;
    }

    if (sourceName === null || title === null || targetValue === null) {
      test.skip(
        true,
        "Žiadna karta nemá v horizonte druhý šprint vo vlastnom projekte — presun sa nedá overiť.",
      );
      return;
    }

    await dialog.getByRole("button", { name: "Presunúť", exact: true }).click();

    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("status").filter({ hasText: /presunut/i })).toBeVisible({
      timeout: 15_000,
    });
    // The card left the column it started in. `exact` matters: accessible names
    // match as a SUBSTRING otherwise, and one title can prefix another.
    const source = page.getByRole("list", { name: sourceName, exact: true });
    await expect(source.getByRole("listitem", { name: title, exact: true })).toHaveCount(
      0,
      { timeout: 15_000 },
    );
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

  // ───────────────────────────────────────────────────────────────────────────
  // The vertical roadmap and the decision axis (A5)
  // ───────────────────────────────────────────────────────────────────────────

  test("zoom mení DĹŽKU osi Roadmapy a filtre pritom zostanú v URL", async ({
    page,
  }) => {
    // `mine=true` is an unrelated filter carried along for one reason: a zoom change
    // must not drop query state that belongs to another control.
    await page.goto("/timeline?mode=roadmap&zoom=month&mine=true");
    await timelineReady(page);
    await expect(roadmapBody(page)).toBeVisible();

    // New roadmap chrome: the axis got the vertical room the legend used to eat, and
    // "Dnes" scrolled out of view needs a way back. `exact` keeps it from colliding
    // with the axis flag and the legend, which are both plain "Dnes".
    await expect(
      page.getByRole("button", { name: "Skočiť na dnes", exact: true }),
    ).toBeVisible();

    for (const zoom of ZOOMS) {
      await page.getByRole("tab", { name: ZOOM_LABEL[zoom], exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`[?&]zoom=${zoom}\\b`));

      // The horizon is a whole number of units OF THAT ZOOM, so switching zoom
      // changes the grain and the number of rows, never the page length: 8 quarters,
      // 12 months, 12 weeks — with no clipped stub at either end.
      const cells = axisCells(page);
      await expect(cells).toHaveCount(ROADMAP_COLUMNS[zoom]);
      await expect(cells.first()).toHaveAttribute("title", UNIT_TITLE[zoom]);
      await expect(cells.last()).toHaveAttribute("title", UNIT_TITLE[zoom]);

      await expect(page).toHaveURL(/[?&]mode=roadmap\b/);
      await expect(page).toHaveURL(/[?&]mine=true\b/);
    }
  });

  test("zbalenie oblasti je v URL a reload ho reprodukuje", async ({ page }) => {
    await page.goto("/timeline?mode=roadmap&zoom=month");
    await timelineReady(page);

    // Located by `aria-controls`, NEVER by `aria-expanded`: the attribute under test
    // stops matching the moment the click lands, and `.first()` would then silently
    // re-resolve to the next area that is still expanded.
    const toggles = page.locator('button[aria-controls^="vt-area-"]');
    await expect(toggles.first()).toBeVisible();

    const header = toggles.first();
    // `title` is `<oblast> — Zbaliť oblasť`, which is where the area name comes from
    // without reading it out of the label that carries the project count too.
    const title = (await header.getAttribute("title")) ?? "";
    const area = title.split(" — ")[0];
    expect(area.length).toBeGreaterThan(0);
    await expect(header).toHaveAttribute("aria-expanded", "true");

    await header.click();

    await expect(page).toHaveURL(/[?&]collapsed=/, { timeout: 10_000 });
    // Read through URLSearchParams rather than matching the raw query: nuqs
    // percent-encodes the separator, so an area name containing a comma survives —
    // and comparing the encoded form would pin the encoding instead of the value.
    expect(new URL(page.url()).searchParams.get("collapsed")).toBe(area);
    await expect(header).toHaveAttribute("aria-expanded", "false");
    // The area is now ONE summary lane. It is deliberately not a link: it stands for
    // several projects, so there is no single thing to open.
    await expect(page.getByText("Súhrn oblasti", { exact: true }).first()).toBeVisible();

    await page.reload();
    await timelineReady(page);

    // Area order does not depend on the collapsed set (it is alphabetical with "Bez
    // oblasti" pinned last), so the same header is first again after the reload.
    const reloaded = page.locator('button[aria-controls^="vt-area-"]').first();
    await expect(reloaded).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByText("Súhrn oblasti", { exact: true }).first()).toBeVisible();

    // Expanding the last collapsed area clears the parameter — a fully expanded
    // roadmap has a clean URL.
    await reloaded.click();
    await expect(reloaded).toHaveAttribute("aria-expanded", "true");
    await expect(page).not.toHaveURL(/[?&]collapsed=/);
    await expect(page.getByText("Súhrn oblasti", { exact: true })).toHaveCount(0);
  });

  test("klik na pruh projektu otvorí detail projektu", async ({ page }) => {
    await page.goto("/timeline?mode=roadmap&zoom=month");
    await timelineReady(page);

    // Inside the lane area the only links ARE the bars: the lane names sit in the
    // sticky header above it and the "Bez termínu" row below it.
    const bars = roadmapBody(page).getByRole("link");
    const count = await bars.count();
    test.skip(
      count === 0,
      "Žiadny projekt nemá pruh v horizonte — klik na pruh sa nedá overiť.",
    );

    const bar = bars.first();
    const href = (await bar.getAttribute("href")) ?? "";
    expect(href).toMatch(/^\/projects\?project=/);
    // The whole bar is the target, so it has to say what it opens.
    expect((await bar.getAttribute("aria-label")) ?? "").not.toBe("");
    const expected = new URL(href, "http://localhost").searchParams.get("project");

    // 2 px from the bar's left edge, ON PURPOSE. Checkpoint markers are 18 px wide
    // siblings centred over the 26 px bar with a higher z-index, so a click in the
    // MIDDLE of a bar can legitimately land on a marker — which must open the
    // checkpoint, not the project. The 4 px the marker leaves free on each side is
    // the only part of the bar that is guaranteed to be the bar.
    await bar.click({ position: { x: 2, y: 3 } });

    await page.waitForURL(/\/projects\?/, { timeout: 15_000 });
    expect(new URL(page.url()).searchParams.get("project")).toBe(expected);
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 20_000 });
  });

  test("checkpoint na dráhe otvorí checkpoint, nie projekt", async ({ page }) => {
    await page.goto("/timeline?mode=roadmap&zoom=month");
    await timelineReady(page);

    // Inside the lane area the only buttons are the markers — the area headers are
    // in the sticky header, outside the group.
    const markers = roadmapBody(page).getByRole("button");
    const count = await markers.count();
    test.skip(count === 0, "Žiadny checkpoint v horizonte — marker sa nedá overiť.");

    const marker = markers.first();
    // Activated from the KEYBOARD rather than by a mouse click: two checkpoints a few
    // days apart overlap at month zoom (18 px markers, ~11 px between them), so a
    // mouse click on the first one can be intercepted by its neighbour — and this
    // also proves the marker is reachable by Tab at all, which the bar being a link
    // does not.
    await marker.focus();
    await expect(marker).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(/[?&]checkpoint=/, { timeout: 10_000 });
    // The project must NOT have opened underneath: the markers sit above the bar and
    // keep the click.
    expect(new URL(page.url()).pathname).toBe("/timeline");
    expect(new URL(page.url()).searchParams.get("project")).toBeNull();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 20_000 });
  });

  test("Rozhodnutia: checkpointy sú po mesiacoch a linka „Dnes“ delí po termíne od zvyšku", async ({
    page,
  }) => {
    await page.goto("/timeline?mode=decisions");
    await timelineReady(page);

    const axis = page.getByRole("list", {
      name: "Rozhodnutia na časovej osi",
      exact: true,
    });
    test.skip(
      (await axis.count()) === 0,
      "Rozhodovacia fronta je prázdna — časová os sa nekreslí.",
    );
    await expect(axis).toBeVisible();

    // ── one section per month, and every card belongs to its own section ──
    const sections = await axis.evaluate((root) =>
      Array.from(root.children).map((section) => ({
        head: (section.querySelector("p")?.textContent ?? "").replace(/\s+/g, " ").trim(),
        cards: Array.from(section.querySelectorAll("button")).map((card) =>
          (card.textContent ?? "").replace(/\s+/g, " ").trim(),
        ),
      })),
    );

    expect(sections.length).toBeGreaterThan(0);
    const heads = sections.map((section) => section.head);
    // A month is never drawn twice — that IS the grouping.
    expect(new Set(heads).size).toBe(heads.length);

    for (const section of sections) {
      const parsed = /^(\p{L}+) (\d{4})/u.exec(section.head);
      if (!parsed) {
        throw new Error(`Hlavička sekcie „${section.head}“ nie je „mesiac rok“.`);
      }
      const month = `${parsed[1]} ${parsed[2]}`;
      expect(section.cards.length).toBeGreaterThan(0);
      // Each card prints its full due date, so it has to name the month it sits in.
      for (const card of section.cards) expect(card).toContain(month);
    }

    // ── the rule: everything above it is late, everything below it is ahead ──
    // Exactly one, even though it can land INSIDE a month — the month that holds
    // today usually has late and upcoming checkpoints both.
    await expect(axis.getByText("Dnes", { exact: true })).toHaveCount(1);

    // Cards and the rule in document order. A card is an `<li>` whose FIRST child is
    // the button; a month `<li>` starts with its `<p>` header, so it cannot be
    // mistaken for one, and the rule is the only `<li>` whose text starts with "Dnes".
    const sequence = await axis.evaluate((root) => {
      const out: string[] = [];
      for (const node of Array.from(root.querySelectorAll("li"))) {
        const first = node.firstElementChild;
        if (first && first.tagName === "BUTTON") {
          out.push(`card:${(first.textContent ?? "").replace(/\s+/g, " ")}`);
        } else if ((node.textContent ?? "").replace(/\s+/g, " ").trim().startsWith("Dnes")) {
          out.push("rule");
        }
      }
      return out;
    });

    expect(sequence.filter((entry) => entry === "rule")).toHaveLength(1);
    const ruleIndex = sequence.indexOf("rule");
    sequence.forEach((entry, index) => {
      if (entry === "rule") return;
      // "8 dní po termíne" against "o 6 dní" / "dnes" — and today is NOT overdue,
      // the same rule the "Po termíne" tile counts with.
      if (index < ruleIndex) expect(entry).toContain("po termíne");
      else expect(entry).not.toContain("po termíne");
    });
  });

  test("mobil 390 px: Roadmap je zoznam v čase a stránka sa nedá posunúť do strán", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/timeline?mode=roadmap&zoom=month");
    await timelineReady(page);

    // Under 700 px the lanes are not rendered AT ALL. Clipping them was not enough:
    // any wide content pans the whole page at this width, even inside its own
    // overflow container (measured: html scrollWidth 517 against clientWidth 390).
    await expect(roadmapBody(page)).toHaveCount(0);
    // The information is still here, ordered in time, and every project reachable.
    await expect(
      page.locator('a[href^="/projects?project="]').first(),
    ).toBeVisible();

    expect(await pageScrollX(page)).toBe(0);
  });

  test("mobil 390 px: Rozhodnutia sa nedajú posunúť do strán", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/timeline?mode=decisions");
    await timelineReady(page);
    await expect(
      page.getByRole("heading", { name: "Rozhodovacia fronta" }),
    ).toBeVisible();

    expect(await pageScrollX(page)).toBe(0);
  });
});
