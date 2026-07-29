import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Mirror tsconfig's "@/*" → "./src/*" so tests can import (and vi.mock)
    // "@/lib/…" modules exactly like the app code does.
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    // Unit tests are co-located next to the source they cover. `db/` is included
    // as well: db/migrations/migrations.test.ts is the schema-convention guard
    // (PK types, charset, no soft delete, `version` on exactly three tables) and
    // it must run as part of the standard gate, not only ad hoc.
    include: [
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "db/**/*.test.ts",
    ],
    env: {
      // Run under a positive-offset zone so date/day-boundary tests are real
      // guards: under UTC a local-time day-shift bug would be invisible.
      TZ: "Europe/Bratislava",

      // --- Dummy env so the fail-closed loader is satisfied -----------------
      // src/lib/env.ts validates and THROWS at module load, by design, in every
      // environment (see its header). Vitest does not read `.env.local` the way
      // Next does, so any test whose import graph reaches @/lib/env — even
      // transitively, e.g. defineRoute → auth/rbac → auth/session → env —
      // failed to import at all on a machine without `.env.local`.
      //
      // These are NOT a weakening of the loader: the zod schema still runs in
      // full (SESSION_SECRET ≥ 32 chars, SECRETS_ENC_KEY = base64 32 bytes),
      // unlike SKIP_ENV_VALIDATION which would bypass it. They are deliberately
      // fake, and unit tests must keep mocking @/lib/db — nothing here points at
      // a reachable database. Set centrally so a missing `.env.local` can never
      // decide which tests run.
      DB_HOST: "test-db-not-connected",
      DB_PORT: "3306",
      DB_USER: "test",
      DB_PASSWORD: "test",
      DB_DATABASE: "aura_roadmap_test",
      SESSION_SECRET: "test_only_session_secret_min_32_characters_long",
      SECRETS_ENC_KEY: "dGVzdC1vbmx5LWtleS1ub3QtYS1zZWNyZXQtMzJieXQ=",
    },
  },
});
