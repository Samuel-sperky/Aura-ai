// Playwright auth setup — logs in ONCE and saves the session for every spec.
//
// Why this exists: the login route is rate limited (10/min) and the account is
// locked out after repeated failures, both deliberately. A suite that signs in
// per test issues ~50 logins in a few minutes, trips its own rate limit and then
// fails with navigation timeouts that look like app bugs but are not.
//
// storageState captures http-only cookies, so the session survives into every
// spec without any of them touching the login form.

import { expect, test as setup } from "@playwright/test";

export const AUTH_FILE = "test-results/.auth/admin.json";

const EMAIL = process.env.E2E_EMAIL ?? "";
const PASSWORD = process.env.E2E_PASSWORD ?? "";

setup("prihlásenie a uloženie session", async ({ page }) => {
  setup.skip(!PASSWORD, "E2E_PASSWORD nie je nastavené — preskakujem prihlásenie.");

  await page.goto("/login");
  await page.locator('input[name="email"]').fill(EMAIL);
  await page.locator('input[name="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: /prihlásiť/i }).click();

  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 30_000,
  });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
    timeout: 20_000,
  });

  await page.context().storageState({ path: AUTH_FILE });
});
