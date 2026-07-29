// Centralized, zod-validated environment loader.
//
// All server-side config flows through here so a missing/invalid value fails
// fast at boot instead of surfacing as a confusing runtime error deep inside a
// request.
//
// *** FAIL-CLOSED, NO DEV FALLBACKS ***
// The reference family app (sperky-ai) carries hard-coded DEV_DEFAULTS —
// including a literal SESSION_SECRET — which makes it possible to mint a valid
// dev JWT that passes the auth gate. That debt is deliberately NOT ported. Here
// EVERY secret must come from the real environment in EVERY environment; a
// missing or too-short SESSION_SECRET throws at boot, dev included. Copy
// `.env.example` to `.env.local` and run `npm run keys:gen` to fill it.
//
// The only escape hatch is the BUILD PHASE: `next build` evaluates route modules
// while collecting page data, and runtime secrets are legitimately absent then
// (they are injected at runtime via the container's env_file). `next build` sets
// NEXT_PHASE; the Dockerfile build stage additionally sets SKIP_ENV_VALIDATION=1
// as an explicit opt-out. Neither signal is set when the server actually boots
// (`node server.js`), so a misconfigured deploy still refuses to start.
//
// NOTE: server-only by nature (reads process.env). Also imported by the
// standalone node scripts, so it must NOT import the `server-only` package.
// Never import it from a Client Component.

import { z } from "zod";

const isProd = process.env.NODE_ENV === "production";

const isBuildPhase =
  process.env.NEXT_PHASE === "phase-production-build" ||
  process.env.SKIP_ENV_VALIDATION === "1";

/** base64 string that decodes to exactly 32 bytes (AES-256 key). */
const base64Key32 = z
  .string()
  .min(1, "SECRETS_ENC_KEY is required")
  .refine((val) => {
    try {
      return Buffer.from(val, "base64").length === 32;
    } catch {
      return false;
    }
  }, "SECRETS_ENC_KEY must be a base64-encoded 32-byte key (AES-256-GCM)");

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // --- MariaDB ------------------------------------------------------------
  DB_HOST: z.string().min(1, "DB_HOST is required"),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_USER: z.string().min(1, "DB_USER is required"),
  // Empty string allowed (passwordless local instance) but the key must exist.
  DB_PASSWORD: z.string(),
  DB_DATABASE: z.string().min(1, "DB_DATABASE is required").default("aura_roadmap"),

  // --- Session ------------------------------------------------------------
  // Signs the session JWT (jose HS256). FAIL-CLOSED: no fallback anywhere.
  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET must be at least 32 characters"),
  /** Session lifetime in seconds (default 8 h). */
  SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(28_800),

  // --- Secrets at rest ----------------------------------------------------
  SECRETS_ENC_KEY: base64Key32,

  // --- First-admin bootstrap (consumed by scripts/seed.ts) ----------------
  // Optional in the app runtime: the admin already exists in `app_users` after
  // the seed, so the running server does not need these. The seed script calls
  // `requireAdminBootstrap()` which enforces them at that point.
  ADMIN_EMAIL: z.string().email("ADMIN_EMAIL must be a valid e-mail").optional(),
  ADMIN_PASSWORD: z
    .string()
    .min(12, "ADMIN_PASSWORD must be at least 12 characters")
    .optional(),

  // --- Networking ---------------------------------------------------------
  // Number of trusted reverse proxies between the public edge and this app.
  // 0 (default) = the app IS the edge and forwarding headers are NOT trusted
  // (see src/lib/security/clientIp.ts).
  TRUSTED_PROXY_HOPS: z.coerce.number().int().min(0).max(8).default(0),
});

export type Env = z.infer<typeof EnvSchema>;

/** Placeholders used ONLY during `next build`. Never reachable at runtime. */
function buildPhaseEnv(): Env {
  return EnvSchema.parse({
    NODE_ENV: process.env.NODE_ENV ?? "production",
    DB_HOST: "build-placeholder",
    DB_PORT: "3306",
    DB_USER: "build",
    DB_PASSWORD: "",
    DB_DATABASE: "build",
    SESSION_SECRET: "build_time_placeholder_secret_min_32_characters",
    SECRETS_ENC_KEY: "SD/C7gTAvxoyxjTZ7HI+3nLAMxBH5HIsEuwGjsXXfRQ=",
  });
}

function loadEnv(): Env {
  const raw = {
    NODE_ENV: process.env.NODE_ENV,
    DB_HOST: process.env.DB_HOST,
    DB_PORT: process.env.DB_PORT,
    DB_USER: process.env.DB_USER,
    DB_PASSWORD: process.env.DB_PASSWORD,
    DB_DATABASE: process.env.DB_DATABASE,
    SESSION_SECRET: process.env.SESSION_SECRET,
    SESSION_TTL_SECONDS: process.env.SESSION_TTL_SECONDS,
    SECRETS_ENC_KEY: process.env.SECRETS_ENC_KEY,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL || undefined,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || undefined,
    TRUSTED_PROXY_HOPS: process.env.TRUSTED_PROXY_HOPS,
  };

  const parsed = EnvSchema.safeParse(raw);
  if (!parsed.success) {
    // Build-time: don't fail `next build` for absent runtime secrets. No DB
    // connection or crypto happens while collecting page data for our (fully
    // dynamic) routes, so placeholders are harmless here.
    if (isBuildPhase) return buildPhaseEnv();

    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Invalid environment configuration:\n${issues}\n\n` +
        (isProd
          ? "Set the missing variables in the production environment (compose env_file)."
          : "Copy .env.example to .env.local and run `npm run keys:gen` to generate secrets."),
    );
  }
  return parsed.data;
}

// Validate once at module load. Fail-closed in every environment.
export const env: Env = loadEnv();

export const isProduction = env.NODE_ENV === "production";

/**
 * Assert the first-admin bootstrap credentials are present and return them.
 * Called by `scripts/seed.ts`; the app runtime does not need them.
 */
export function requireAdminBootstrap(): {
  email: string;
  password: string;
} {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
    throw new Error(
      "ADMIN_EMAIL and ADMIN_PASSWORD must be set to bootstrap the first admin " +
        "(ADMIN_PASSWORD ≥ 12 characters). See .env.example.",
    );
  }
  return { email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD };
}
