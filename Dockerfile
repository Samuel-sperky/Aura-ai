# syntax=docker/dockerfile:1

# =============================================================================
# Aura Roadmap — production Dockerfile (multi-stage)
# =============================================================================
# Builds a small, non-root image that runs the Next.js 16 **standalone** server.
# `next.config.ts` sets `output: 'standalone'`, so `next build` emits a minimal
# self-contained server at `.next/standalone` (its own pruned node_modules + a
# `server.js`). We copy only that, plus the static assets, into the runner.
#
# Stages:
#   deps     — install full deps (incl. devDeps) once, cached on package*.json
#   build    — `next build` → produces .next/standalone + .next/static
#   migrator — keeps full source + devDeps (tsx) to run db:migrate / db:seed
#   runner   — tiny final image: standalone server only, non-root, no toolchain
#
# Node 22 (alpine). @node-rs/argon2 ships prebuilt musl binaries for x64+arm64,
# so no C/Rust build toolchain is needed in any stage.
#
# DELIBERATELY OMITTED: chromium / Playwright. E2E tests run against the app from
# the host, never from inside the runtime image — installing the ~250 MB apk
# chromium in production buys nothing (contract §4).
# =============================================================================

ARG NODE_VERSION=22

# --- deps --------------------------------------------------------------------
# Install dependencies in a cacheable layer. devDependencies are needed here
# because `next build` (and the migrator stage) require them (typescript, tsx).
# The runner takes nothing from here — it consumes only the pruned node_modules
# baked into .next/standalone.
FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app

# libc6-compat: cheap insurance for the occasional native module that expects a
# glibc-style loader on musl.
RUN apk add --no-cache libc6-compat

# Copy only manifests first so this layer is reused unless deps change.
COPY package.json package-lock.json ./
# Deterministic, lockfile-respecting install (includes devDependencies).
RUN npm ci

# --- build -------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NODE_ENV=production so dev-only code is dropped from the bundle.
ENV NODE_ENV=production
# Runtime secrets (DB creds, SESSION_SECRET, SECRETS_ENC_KEY) are injected at
# RUNTIME via the container's env_file — they are intentionally ABSENT during the
# build. Tell src/lib/env.ts to skip its fail-closed validation while building
# (it still validates for real on boot). Without this, `next build`'s page-data
# collection evaluates route modules → imports env.ts → throws.
# This ENV lives ONLY in the build stage; the runner NEVER sets it.
ENV SKIP_ENV_VALIDATION=1
RUN npm run build

# --- migrator ----------------------------------------------------------------
# A full-source image (devDeps incl. `tsx`) used ONLY for one-off DB tasks:
#   npm run db:migrate / db:seed / keys:gen
# Guarded behind the `tools` compose profile, so `up` never starts it. Kept
# separate so the runtime image stays minimal and free of migration SQL.
FROM node:${NODE_VERSION}-alpine AS migrator
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache libc6-compat
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Scripts read env from the process environment (compose `env_file`) — see
# scripts/_bootstrap.ts. Default to a no-op so an accidental `up` exits cleanly.
CMD ["node", "-e", "console.log('migrator image: run `npm run db:migrate` via docker compose --profile tools run --rm migrator')"]

# --- runner ------------------------------------------------------------------
# Final, minimal runtime image. Contains only the standalone server + assets.
FROM node:${NODE_VERSION}-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# server.js honours PORT/HOSTNAME. Bind to all interfaces inside the container;
# the port is published to the host only by docker-compose (3040:3000).
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Run as a non-root user. node:alpine ships a `node` user (uid 1000); create a
# dedicated `nextjs` user/group (uid/gid 1001) for clarity and least privilege.
RUN addgroup --system --gid 1001 nodejs \
  && adduser  --system --uid 1001 nextjs

# The standalone output already includes the pruned node_modules and server.js.
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
# Static assets are NOT bundled into standalone — copy them to the paths
# server.js expects so it can serve them directly (no CDN in this setup).
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

# Graceful shutdown without tini: Node receives SIGTERM directly as PID 1 and
# Next's standalone server drains in-flight requests. Compose sends SIGTERM on
# `stop`; stop_grace_period: 30s in the compose file gives it time.
CMD ["node", "server.js"]
