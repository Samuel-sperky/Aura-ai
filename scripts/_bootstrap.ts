// Loads environment for standalone scripts (migrate / seed / gen-keys).
// Next.js auto-loads .env.local for the app, but plain `tsx` does not, so we do
// it here. Import this FIRST in every script (before importing src/lib/env).
import { config as loadDotenv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

// Priority: .env.local overrides .env (both relative to the project root / cwd).
for (const file of [".env.local", ".env"]) {
  const p = resolve(process.cwd(), file);
  if (existsSync(p)) loadDotenv({ path: p, override: false });
}
