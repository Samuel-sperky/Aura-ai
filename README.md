# Aura Roadmap

Interný nástroj na plánovanie IT/dev práce — **timeline** (roadmap, šprinty, rozhodnutia), **evidencia projektov** pre reporting a **rozhodovacia fronta** s readiness %. Súčasť aura-app family, vybudovaný portom Northstar V3.

## Tri piliere

| Pilier | Obsah |
|---|---|
| **Plánovanie** | Timeline: 3 režimy (Roadmap / Sprinty / Rozhodnutia), 3 zoomy, sprint planner s drag&drop, kapacity osôb, backlog |
| **Evidencia** | Projekty (tabuľka/karty + filtre), detail v modáli, Prehľad → KPI zdroj pre CEO report |
| **Rozhodovacia fronta** | Checkpointy → checklist → readiness % → rozhodnutie (nemenné) → audit, follow-up |

**Port:** http://localhost:3040 · **DB:** MariaDB 11.4, `aura_roadmap` · **Kontajnery:** `aura-roadmap-app`, `aura-roadmap-db`

## Stack

- **Runtime:** Node 22 (alpine), Next.js 16 (App Router, `output: "standalone"`)
- **Frontend:** React 19, TypeScript, `lucide-react` ikony, `recharts` grafy, `@dnd-kit` drag&drop
- **DB:** MariaDB 11.4, **raw parametrizované SQL** (`src/lib/db.ts`), **bez ORM**
- **Auth:** argon2id (19 MiB) + jose HS256 JWT + `app_sessions` revalidovaná **pri každom requeste**
- **API:** `defineRoute()` pipeline — **100 % adopcia**, auth → rateLimit → zod → handler
- **Bezpečnosť:** CSRF fail-closed, rate-limit 5/15min + 15/user, lockout, CSP, non-root
- **Testy:** vitest (ko-lokované `*.test.ts`, TZ Europe/Bratislava) + Playwright (3 e2e)
- **Docker:** 4-stage Dockerfile, healthcheck `/api/health`, graceful stop 30s
- **Zálohy:** `mysqldump` do `backups/`, posledné 3

## Spustenie

### 1. Príprava .env

```powershell
Copy-Item .env.example .env

# Generuj SESSION_SECRET a SECRETS_ENC_KEY
npm run keys:gen

# Doplň do .env: DB_PASSWORD, DB_ROOT_PASSWORD, ADMIN_EMAIL, ADMIN_PASSWORD (min 10 znakov)
```

### 2. Docker stack

```powershell
# DÔLEŽITÉ: `--env-file .env` je POVINNÉ. Bez neho sa ${DB_*} vyhodnotia na prázdno
docker compose --env-file .env up -d --build

# Alebo skrátka na shell:
$env:COMPOSE_ENV_FILES = ".env"
docker compose up -d --build
```

### 3. Migrácie a seed

```powershell
# Migrácie: db/migrations/NNNN_*.sql
docker compose --env-file .env --profile tools run --rm migrator npm run db:migrate

# Seed: 2 demo konta, 3 projekty, 4 checkpointy, ~20 položiek, random heslá na stdout
docker compose --env-file .env --profile tools run --rm migrator npm run db:seed
```

### 4. Over

```powershell
Invoke-RestMethod http://localhost:3040/api/health
# Output: @{ok=True; db=True}

# Login: admin z ADMIN_EMAIL, demo konta vypísané pri seede
# Adresa: http://localhost:3040
```

## ⚠ Tri kritické pasce

1. **`--env-file .env` je POVINNÉ.** Docker Compose bez neho nevyhodnotí `${DB_DATABASE}`, `${DB_USER}` apod. a MariaDB nabootuje **bez databázy**. Žiadne mystery auth chyby — je to konfiguracia.

2. **DB kontajner nemá host port mapovaný.** Lokálny `npx next dev` sa k DB **nedostane**. Testuj logiku cez:
   ```bash
   npx tsc --noEmit      # Typovka
   npm run lint          # Linting
   npm test              # Vitest
   # Dátové overenie cez running kontajner na :3040
   ```

3. **Turbopack padá na junction `node_modules`.** Dev server:
   ```bash
   npx next dev --webpack
   ```

## Env + secrety

`src/lib/env.ts` je **fail-closed** — chýbajúci `SESSION_SECRET` (<32 znakov) **ZHODÍ boot**. Žiadne dev fallbacky, žiadny hard-coded secret.

Jediná výnimka je `next build`: nastavuje `SKIP_ENV_VALIDATION=1` v build stage. Boot (`node server.js`) bez validácie nebeží.

**Do gitu:** `.gitignore` má `.env`, `.env.local`. Nikdy sa nechytaný secret necommitne.

## Navigácia (6 rút presne)

| Ruta | Popis |
|---|---|
| `/` | **Prehľad** — 6 KPI dlaždíc, zdravie projektov, aktivita, blížiace checkpointy |
| `/timeline` | **Timeline** — Roadmap / Sprinty / Rozhodnutia, 3 zoomy, drag&drop sprints |
| `/projects` | **Projekty** — tabuľka / karty, filtre (area, status, priority), detail modal |
| `/work-items` | **Úlohy** — backlog + board view, 2 úrovne (položka + podúloha), ručné poradie |
| `/decisions` | **Rozhodnutia** — fronta checkpointov, readiness bar, stav, rozhodovací dialóg |
| `/settings` | **Nastavenia** — vzhľad (téma, hustota, jazyk), účet, tím (admin), audit, zálohy |

## Databázové konvencie

| Aspekt | Pravidlo |
|---|---|
| **PK** | `CHAR(36)` UUID; log tabuľky `BIGINT AUTO_INCREMENT` |
| **Schéma** | `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4` na všetkých |
| **Časy** | `created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`, `updated_at DATETIME` |
| **Indexy** | `ix_<table>_<col>`, `uq_<table>_<col>`, `fk_<table>_<ref>` |
| **Číselníky** | `name_sk`, `name_en` na enumerácií |
| **Soft delete** | **NIE** — hard delete + záznam do `audit_log` |
| **Optimistic concurrency** | `version INT NOT NULL DEFAULT 1` LEN na `checkpoints`, `sprints`, `work_items` |

**Tabuľky:** 7 infra + 13 doménu. Migrácie v `db/migrations/` abecedne.

## Domény (EN kľúče v DB, SK labels v UI)

| Oblasť | Kľúče |
|---|---|
| Stav položky | `backlog`, `in_progress`, `waiting`, `done` |
| Typ položky | `task`, `bug`, `idea` |
| Typ checkpointu | `review`, `decision`, `delivery`, `gate` |
| Lifecycle checkpointu | `planned`, `ready`, `decided`, `blocked` |
| Výsledok rozhodnutia | `go`, `conditional_go`, `no_go`, `deferred` |
| Stav projektu | `on_track`, `at_risk`, `blocked`, `planned` |
| Zdravie | `green` ≥100% · `amber` 60–99% · `red` <60% · `grey` bez dát |
| Priorita | `P1`, `P2`, `P3` |
| Roly | `admin`, `editor`, `viewer` |

## Roly + práva

| Rola | Práva |
|---|---|
| **Admin** | Projekty, položky, checkpointy, šprinty — vytvorenie/úprava/**DELETE**; používatelia; audit; nastavenia; zálohy |
| **Editor** | Projekty, položky, checkpointy, šprinty — vytvorenie/úprava; **NIE DELETE** |
| **Prehliadač** | Čítanie + vlastné filtre; žiadny zápis |

Autorizácia v **každom handleri** cez `defineRoute({ auth: "admin"|"editor"|{right} })`.

## Skripty

| Príkaz | Čo robí |
|---|---|
| `npm run dev` | Next.js dev server (`--webpack` keď junction node_modules) |
| `npm run build` | Standalone build |
| `npm start` | Produkčný boot |
| `npm run lint` | eslint (Next.js config) |
| `npm test` | vitest run |
| `npm run test:e2e` | Playwright (vyžaduje bežiaci server na :3040) |
| `npm run db:migrate` | Aplikuje migrácie (`db/migrations/*.sql`) |
| `npm run db:seed` | Demo seed + bootstrap admin |
| `npm run keys:gen` | SESSION_SECRET + SECRETS_ENC_KEY |

## Zálohy

```powershell
.\scripts\backup\backup.ps1

# Výstup: backups/aura-roadmap-<timestamp>.sql
# Retencia: posledné 3
# Status: backups/backup-status.json
```

Restore: `scripts/backup/RESTORE.md`

## Overenie

```bash
# Typovka (no emit)
npx tsc --noEmit

# Lint
npm run lint

# Testy (vitest + playwright — vyžaduje :3040 bežiaci)
npm test
npm run test:e2e

# Audit
npm audit
```

Akceptačné kritériá v `KONTRAKT-AURA-ROADMAP-2026-07-28.md`, sekcia 8.

## Zdroje pravdy

- **Kontrakt:** `KONTRAKT-AURA-ROADMAP-2026-07-28.md` — cieľ, rozsah, rizika
- **Detailná spec:** `docs/04-DOKONCENIE-50-OTAZOK.md` — 50 otázok na implementáciu
- **Schéma:** `db/migrations/` (jediný zdroj — Drizzle kód je mŕtvy)
- **Domény:** `src/lib/domain/` — zod kontrakty, slovníky
- **i18n:** `src/lib/i18n/` — SK + EN, `t()` fallback na kľúč
- **CLAUDE.md:** konvencie pre budúce sessiony

## FAQ

**Server nenabeží:** `docker compose logs app` — je .env OK?

**DB je prázdna:** Spusti migráciu + seed:
```bash
docker compose --profile tools run --rm migrator npm run db:migrate
docker compose --profile tools run --rm migrator npm run db:seed
```

**Login neprajú:** Maximálne 5 pokusov za 15 min. Reset:
```bash
npx tsx scripts/reset-pin.ts <email>
```

**Build padá:** `SKIP_ENV_VALIDATION=1 npm run build` (CI fallback).

---

Vybudované s Aura rodinou (sperky-ai, aura-kpi). Port Northstar V3.
