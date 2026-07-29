// Playwright e2e — Aura Roadmap.
//
// SPÚŠŤANIE: appka musí bežať v Dockeri na http://localhost:3040 (lokálny
// `next dev` DB nedosiahne — DB kontajner nemá mapovaný host port).
//   1. docker compose --env-file .env up -d --build
//   2. npx playwright install chromium   (jednorazovo)
//   3. npm run test:e2e
//
// Iný port/účet → E2E_BASE_URL / E2E_EMAIL / E2E_PASSWORD.
//
// Specy zdieľajú jednu DB a zapisujú do nej → striktne sériovo, workers: 1.

import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3040",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    viewport: { width: 1440, height: 900 },
    locale: "sk-SK",
    timezoneId: "Europe/Bratislava",
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
