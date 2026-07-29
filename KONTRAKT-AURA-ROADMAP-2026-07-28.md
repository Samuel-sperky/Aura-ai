# KONTRAKT — Aura Roadmap (port Northstar V3 do aura-app family)

**Dátum:** 2026-07-28
**Zdroj:** `C:\Users\Ucet\Desktop\IT roadmap planner` (Northstar V3) — zostáva **nedotknutý ako archív**
**Cieľ projektu:** `C:\Aura\aura-roadmap`
**Stav:** čaká na schválenie plánu a odhadu spendu

Tento kontrakt je zdroj pravdy pre rozhodovanie počas autonómneho behu.

---

## 1. Cieľ

Postaviť **Aura Roadmap** — interný nástroj na plánovanie IT/dev práce Aura, evidenciu projektov
pre reporting a rozhodovaciu frontu (checkpointy). Vzniká **portom** existujúcej appky Northstar V3
z Cloudflare Worker + D1/R2 na rodinný stack (Next.js + MariaDB), so **zásadným zjednodušením
rozsahu** a **ujednotením dizajnu aj logiky** s aura-app family.

Northstar V3 dnes nesie tri generácie UI, tri rozdielne palety, 36 tabuliek a enterprise cieľ
(500 projektov / 2 000 users), ktorý nezodpovedá realite 3–4-člennému tímu. Port to má odstrániť.

## 2. Rozsah

### 2.1 Čo ÁNO

| Pilier | Obsah |
|---|---|
| **Plánovanie** | Timeline v 3 režimoch (Roadmap / Sprinty / Rozhodnutia), 3 zoomy (kvartál / mesiac / týždeň), sprint planner s drag&drop, kapacitný panel osôb, backlog s ručným poradím |
| **Evidencia pre reporting** | Projekty (tabuľka + karty + filtre), projektový detail v modale, Prehľad ako zdroj čísel pre CEO report |
| **Rozhodovacia fronta** | Checkpointy s checklistom podmienok → readiness % → rozhodnutie (nemenné) → follow-up, audit |
| **Podpora** | Práca: Úloha → Podúloha (typy `task` / `bug` / `idea`), komentáre, závislosť `blokuje`, worklog (nepovinný), baseline snapshot, in-app notifikácie |
| **Systém** | Login, 3 roly, SK+EN, dark/light, audit log, nastavenia, zálohy |

### 2.2 Čo NIE (mimo rozsahu tohto šprintu)

- Cloudflare runtime v akejkoľvek forme (D1, R2, `wrangler`, `vinext`, Drizzle)
- V1 `RoadmapApp.tsx` a celé V2 `app/v2/*` — neportujú sa
- Workflow engine konfigurovateľný per projekt (`workflows` + `workflow_statuses` + `workflow_transitions`)
- Custom fields (`custom_fields` + `work_item_custom_values`)
- Admin dashboard builder (`dashboard_layouts` + `dashboard_widgets` + `dashboard_layout_versions`, `react-grid-layout`)
- Tímy a členstvá (`teams`, `user_team_memberships`, `team_view_presets`, `sprint_allocations`)
- Timesheety a týždenné schvaľovanie (`timesheets`, `timesheet_entries`)
- Prílohy a upload súborov (`attachments`) — nahradené voľným URL odkazom v popise
- E-mailové notifikácie a SMTP sidecar (`email_outbox`, `mailer/`, `nodemailer`)
- Watchers a mentions (`work_item_watchers`)
- 5-úrovňová hierarchia Epic→Feature→Story→Task→Subtask; Spike
- Vážené prioritizačné skóre (`value/risk/urgency/effort/priorityScore` + admin váhy)
- Opakované checkpointy (recurrence rule)
- Per-projektové oprávnenia (globálne roly stačia)
- Virtualizácia (`@tanstack/react-virtual`), cursor pagination
- Samostatné pohľady `/kpi`, `/capacity`, `/structure`, catch-all `/[view]`, legacy redirecty
- ChatGPT apps hosting (`app/chatgpt-auth.ts`, `.openai/hosting.json`, `app/_sites-preview`)
- Integrácie s inými aura appkami (pripravené, nezapojené)
- SSO pre rodinu, verejný hosting, Jira/Azure DevOps adaptéry
- Migrácia dát (žiadne reálne dáta neexistujú)

### 2.3 Cieľová mierka

**50 projektov · 15 používateľov · 5 000 pracovných položiek.**
Enterprise cieľ 500 / 2 000 / 100 000 sa z akceptačných kritérií **odstraňuje**.

## 3. Odsúhlasené rozhodnutia

### 3.1 Potvrdené používateľom (🔴 nevratné)

| # | Rozhodnutie | Odpoveď |
|---|---|---|
| 4, 11 | Port vs skin, databáza | **Plný port na MariaDB 11.4**, žiadny Cloudflare |
| 12 | Framework | **Next.js 16 (vetva B, fork infra z `sperky-ai`)** — revidované po recon #2 |
| 1 | Umiestnenie | **Samostatná appka `C:\Aura\aura-roadmap` + vlastná DB `aura_roadmap`** |
| 6 | Reálne dáta | **Žiadne** → čistý štart s fiktívnym seedom |
| 7 | Používatelia | **Ja + 2–3 ľudia** → bez tímov, bez timesheetov |
| 8 | Use case | **Všetky 3 piliere** (plánovanie + evidencia + rozhodovanie) |
| 24 | Peniaze | **Nie** — len odhad pracnosti (story pointy + worklog minúty). `budget`/`spent` sa mažú |
| 52 | Hierarchia | **Jedna úroveň `area` („oblasť")** — `program` sa maže, `portfolio` → `area` |
| 63 | Akcent | **Teal `#03797e`** + rozpor teal-vs-zlatá v rodine ako samostatná úloha mimo šprintu |
| 68, 69 | Jazyk | **SK + EN** podľa vzoru `aura-kpi` (`T_SK`/`T_EN`, `name_sk`/`name_en`) |
| 83 | Integrácie | **Nie v prvej verzii** — pripraviť read-only usera `roadmap_ro`, nezapájať |

### 3.2 Predvolené (rozhodol som ja, dá sa zmeniť)

| # | Rozhodnutie |
|---|---|
| 2, 3 | Názov **„Aura Roadmap"**, `northstar` sa v kóde nikde nezachová |
| 9 | Mierka znížená na 50 / 15 / 5 000 |
| 10 | Len localhost, ngrok profil pripravený a **vypnutý** |
| 13 | `vinext` 0.0.50 vyhodený |
| 14 | **Raw parametrizované SQL** (`src/lib/db.ts` z `sperky-ai`), žiadne ORM |
| 15 | TypeScript |
| 17, 18, 35 | E-mail zrušený, len in-app notifikácie (jedna tabuľka, zvonček s počtom) |
| 19 | ChatGPT hosting prílepok zmazaný |
| 20 | **Optimistic concurrency zachovaná** na `checkpoints`, `sprints`, `work_items` — Northstarov `version` + `409 VERSION_CONFLICT` je jediná vec lepšia než rodina |
| 21 | **Soft delete zrušený** — rodina ho nemá nikde; hard delete + `audit_log` |
| 22 | **vitest** (unit, ko-lokované `*.test.ts`) + **Playwright** (3 e2e) |
| 41, 42, 43 | V1 aj V2 sa neportujú; názvy „V2/V3" z kódu zmiznú |
| 44, 45, 46, 47 | 3 režimy (default **Roadmap**), 3 zoomy, **2 hustoty** (`cozy` default + `compact`) |
| 48, 49, 51 | Legacy redirecty, catch-all `/[view]` a `/structure` zmazané |
| 50 | Navigácia: **Prehľad · Timeline · Projekty · Úlohy · Rozhodnutia · Nastavenia** |
| 53, 54 | `/kpi` zmazaný (má vlastnú appku); kapacita ako panel v Sprintoch, nie pohľad |
| 55 | Drag&drop (`@dnd-kit`) zachovaný + klávesnicová alternatíva „Presunúť" |
| 56 | Virtualizácia zmazaná |
| 57 | Modal-first detail (`?project=<id>`) zachovaný |
| 58 | Opakované checkpointy zmazané |
| 59, 60, 61 | Jeden `globals.css`, `--ns-*` alias vrstva zmazaná, cieľ **< 700 riadkov** |
| 62 | **Geist** (UI) + **Playfair Display** (`.serif-italic` brand) — korekcia: rodinné appky nebežia na Inter |
| 64 | Dark aj light, **dark default**, `:root[data-theme]`, tónovanie výhradne `color-mix` |
| 65 | Semantické farby striktne: `--success` good · `--warn` gold · `--danger` risk. Kategórie len brand tóny |
| 66 | `lucide-react`, žiadne emoji v UI |
| 67 | Grafy: `recharts` (rodinný štandard vetvy B) + `--chart-1..8` tokeny |
| 70 | **Jeden stavový slovník**: SK v UI, stabilné EN kľúče v DB |
| 71 | Zdravie: zelená ≥ 100 % · žltá 60–99 % · červená < 60 % · sivá bez dát. `blue` zrušené |
| 72 | Mobil: **čítanie + rýchle akcie**; drag&drop plánovanie je desktop |
| 73, 74 | WCAG 2.2 AA, plná klávesnica, `prefers-reduced-motion` vypína animácie |
| 76 | **argon2id** (`@node-rs/argon2`, 19 MiB) — nie Northstarov PBKDF2 (to bola Workers-nutnosť) |
| 77 | Cookie **`aura_roadmap_session`** |
| 78 | Prvý admin z env + self-service zmena hesla |
| 80, 81 | `audit_log` v rodinnej schéme; CSRF fail-closed + rate-limit + lockout |
| 82 | Security prehliadka **povinná** |
| 84, 85 | `roadmap_ro` read-only user pripravený; spoločná docker sieť zakomentovaná |
| 86 | Port **3040** |
| 87 | Bez SSO |
| 90 | Rodinný `mysqldump` skript do `backups/`, posledné 3 |
| 91 | Docker Compose `aura-roadmap-app` + `aura-roadmap-db` |
| 93 | Fiktívne demo: 3 projekty, 2 šprinty, 4 checkpointy, ~20 položiek |
| 95 | Playwright + axe na 3 kľúčové obrazovky |
| 96 | Performance profil z akceptačných kritérií odstránený |
| 97 | **Nový lokálny repo + GitHub remote**, feature branch `feat/aura-family-port`, push len na feature branch |
| 98 | Pôvodný `IT roadmap planner` **nedotknutý** |
| 99 | `CLAUDE.md` + `README.md` + tento kontrakt v projekte |

## 4. Stack

| Vrstva | Voľba | Zdroj |
|---|---|---|
| Runtime | Node 22 (alpine), Next.js 16 `output: "standalone"` | `sperky-ai` |
| UI | React 19 + TypeScript, `lucide-react`, `recharts`, `@dnd-kit`, `nuqs` | port z V3 + vetva B |
| DB | MariaDB 11.4, `mariadb` pool, raw parametrizované SQL | `src/lib/db.ts` |
| Migrácie | numerované `db/migrations/NNNN_*.sql` + `_migrations` ledger | `scripts/migrate.ts` |
| Auth | argon2id + `jose` HS256 JWT + `app_sessions` revalidované per request | `src/lib/auth/*` |
| API | `defineRoute()` pipeline (auth → rateLimit → zod → handler), **100 % adopcia** | `src/lib/api/defineRoute.ts` |
| Odpovede | `jsonList(items, pageMeta)` / `jsonOk(data)` / `{error: "<SK správa>"}` | `src/lib/api/respond.ts` |
| Validácia | `zod`, jeden kontrakt server + klient | `src/lib/domain/contracts.ts` |
| Bezpečnosť | CSRF fail-closed, rate-limit, lockout 5/15 min + 15/user → 423, CSP, non-root kontajner | `src/lib/security/*` |
| Testy | `vitest` (ko-lokované, `TZ: Europe/Bratislava`) + `playwright` | `vitest.config.ts` |
| Docker | 4-stage Dockerfile, healthcheck `/api/health`, `stop_grace_period: 30s` | `sperky-ai` |
| Zálohy | `scripts/backup/*.ps1` + `mysqldump` do `backups/`, posledné 3 | `sperky-ai` |

**Nepreberá sa z `sperky-ai`:** `xlsx` z CDN tarballu (supply-chain riziko), Playwright chromium
v runner image (netreba), `dev-fallback SESSION_SECRET` v `proxy.ts` (nahradiť fail-closed).

## 5. Dátový model

**36 tabuliek → 20** (20 zaniká, 4 nové infra, 3 premenované).

### 5.1 Infra / auth (7) — kopíruje sa z `sperky-ai/db/migrations/0001_init.sql` r. 348–434

`app_users` · `app_roles` · `app_sessions` · `auth_attempts` · `audit_log` · `app_config` · `_migrations`

### 5.2 Doména (13)

| Tabuľka | Zmena voči Northstaru |
|---|---|
| `projects` | `portfolio`→`area`, maže `program`, `budget`, `spent`, `timeline_start`, `timeline_span`, `task_count`, `completed_task_count`, `risks` |
| `checkpoints` | zachované + `version` |
| `checkpoint_requirements` | zachované (checklist → readiness %) |
| `checkpoint_decisions` | zachované, **nemenné** |
| `sprints` | zachované + `version`, maže `deleted_at` |
| `work_items` | 2 úrovne cez `parent_id`, `item_type` ∈ `task\|bug\|idea`, maže 5 skóre stĺpcov a `deleted_at`, ponecháva `rank_value` + `priority` |
| `work_item_comments` | zachované |
| `work_item_dependencies` | len typ `blocks`, maže `lag_days` |
| `worklogs` | zachované, **nepovinné** (kontrakt V3 #78 ich robil povinnými — ruší sa) |
| `plan_versions` | baseline snapshot, bez draft/publish workflow a bez `version` |
| `notifications` | zjednodušené, bez severity vetvenia |
| `user_preferences` | téma / hustota / jazyk |
| `user_view_preferences` | posledný filter per stránka |

### 5.3 Konvencie

PK `CHAR(36)` (log tabuľky `BIGINT AUTO_INCREMENT`) · `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4` ·
`created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`, `updated_at DATETIME` ·
`created_by`/`updated_by CHAR(36)` · indexy `ix_<table>_<col>`, unique `uq_<table>_<col>`, FK `fk_<table>_<ref>` ·
`name_sk`/`name_en` na číselníkoch · **žiadny soft delete** · `version INT NOT NULL DEFAULT 1` len na 3 tabuľkách.

⚠ **Schéma sa extrahuje z `ensureWorkspaceSchema()` v `lib/server/workspace.ts` (1807 LOC, 36 `CREATE TABLE`), NIE z `db/schema.ts`** — Drizzle je mŕtvy kód s nula call sites. Obe zdroje sa musia porovnať a rozdiely zdokumentovať.

## 6. Informačná architektúra

| Route | Pohľad | Obsah |
|---|---|---|
| `/` | Prehľad | KPI strip, zdravie projektov, blížiace sa checkpointy, aktívne šprinty — zdroj čísel pre CEO report |
| `/timeline` | Timeline | `?mode=roadmap\|sprints\|decisions`, `?zoom=quarter\|month\|week` |
| `/projects` | Projekty | tabuľka/karty, filtre `area`, `status`, `q`; detail cez `?project=<id>` |
| `/work-items` | Úlohy | backlog + board, 2 úrovne, drag&drop poradie |
| `/decisions` | Rozhodnutia | fronta checkpointov podľa readiness a termínu |
| `/settings` | Nastavenia | vzhľad, jazyk, používatelia (admin), audit, zálohy |

Filtre zostávajú v URL (`nuqs`). Modaly centrované, focus-trapped, fullscreen na mobile.

## 7. Auth a roly

3 roly **Admin / Editor / Prehliadač** (SK v UI, EN kľúče v DB) namapované na rodinný
`app_roles.rights` JSON model. Prvý admin z `ADMIN_EMAIL` + `ADMIN_PASSWORD`.
Guardy `requireUser()` / `requireRight()` / `requireAdmin()` v **každom** handleri —
`proxy.ts` je len optimistická brána, nikdy nie autorizácia.

## 8. Akceptačné kritériá

1. Appka beží v Dockeri na `http://localhost:3040`, `/api/health` → 200 s `db: true`
2. Login funguje, 3 roly reálne obmedzujú akcie, logout zneplatní session server-side
3. Všetky 3 režimy Timeline renderujú a filtre držia v URL
4. Checkpoint: checklist → readiness % → rozhodnutie → nemenný záznam + audit + follow-up
5. Sprint: draft → commit (uzamkne scope) → close s výsledkom, carry-over funguje
6. Work item: 2 úrovne, drag&drop poradie + klávesnicová alternatíva, komentár, worklog
7. Optimistic concurrency: súbežná zmena vráti `409 VERSION_CONFLICT` s `currentVersion`
8. SK aj EN kompletné, prepínač funguje, `document.documentElement.lang` sa mení
9. Dark aj light bez bliku (pre-paint skript), `prefers-reduced-motion` vypína animácie
10. Mobil 390 px: čitateľné, navigácia off-canvas, modaly fullscreen
11. `npx tsc --noEmit` čistý, `npm run lint` bez chýb, `npm test` zelený, 3 Playwright e2e zelené
12. axe bez violations na Prehľad, Timeline, Projekty
13. `npm audit` bez kritických zraniteľností
14. Security prehliadka: CSRF fail-closed, rate-limit, lockout, CSP, non-root kontajner, žiadny dev-fallback secret v prod
15. Zálohovací skript vytvorí dump do `backups/`, drží posledné 3
16. Overené v prehliadači preklikom + screenshoty (dark, light, 390 px) v reporte
17. Pôvodný `IT roadmap planner` nedotknutý
18. `CLAUDE.md`, `README.md` a sekcia „Výsledok" v tomto kontrakte aktualizované

## 9. Riziká

| Riziko | Dopad | Mitigácia |
|---|---|---|
| `ensureWorkspaceSchema()` (1807 LOC) sa rozchádza s `db/schema.ts` | Chýbajúca tabuľka/stĺpec v migrácii | A2 porovná oba zdroje a rozdiely zapíše do reportu |
| `import { env } from "cloudflare:workers"` v 34 súboroch | Mechanická, ale rozsiahla zmena | A3 vlastní celý data layer, jeden pattern |
| `--accent` rozdvojený v rodine (teal vs zlatá) | Dizajnová nejednota | Teal potvrdený; rodinné zjednotenie ako samostatná úloha |
| Drag&drop timeline + `dnd-kit` po porte | Regresia interakcie | A6 vlastní, Playwright e2e na presun |
| SK+EN zdvojuje texty v každom pohľade | +15–20 % práce na UI | A9 (haiku) robí preklady mechanicky po dokončení pohľadov |
| Turbopack padá na junction `node_modules` | Dev server nenaběhne | `next dev --webpack` |
| DB nie je host-mapovaná → lokálny dev nedosiahne DB | Overenie len cez Docker | Overovať proti `:3040`, nie `next dev` |
| `docker-compose` bez `--env-file` → prázdne interpolácie | MariaDB nabootuje s prázdnou DB | Zapísať do README + skriptu |
| CSP potrebuje `script-src 'unsafe-inline'` pre RSC | Bez toho mŕtve tlačidlá | Prevzaté z `sperky-ai` headers.ts |

## 10. Otvorené body na potvrdenie so schválením plánu

Toto sú 🔴 rozhodnutia z dotazníka, ktoré som rozhodol na default. **Riziko je nulové** — pôvodná
appka zostáva nedotknutá a žiadne reálne dáta neexistujú, takže „zmazať" tu znamená „neportovať".
Schválením plánu ich potvrdzuješ; ak s niektorým nesúhlasíš, napíš jeho číslo.

**23** zoštíhliť `projects` · **25** zmazať `tasks` (duplikát `work_items`) · **26** 2 úrovne namiesto 5 ·
**27** zmazať prioritizačné skóre · **28** zmazať workflow engine · **29** zmazať custom fields ·
**30** zmazať dashboard builder · **31** zmazať `team_view_presets` · **33** worklog nepovinný ·
**34** zmazať `attachments` · **36** zjednodušiť `plan_versions` · **37** zmazať `checkpoint_templates` ·
**38** zmazať `checkpoint_sprints` + `sprint_allocations` · **39** zmazať `work_item_watchers` ·
**41** neportovať V1 · **42** neportovať V2 · **70** jeden stavový slovník · **86** port 3040 ·
**97** nový repo + feature branch

## 11. Výsledok

**Dokončené 2026-07-29.** Appka beží v Dockeri na `http://localhost:3040`, celá overovacia
brána zelená.

### Stav overovacej brány

| Kontrola | Výsledok |
|---|---|
| `npx tsc --noEmit` | čistý |
| `npm run lint` | **0 chýb**, 23 upozornení (`react-hooks/set-state-in-effect`, neblokujúce) |
| `npx vitest run` | **535 testov / 22 súborov, 0 padnutých** |
| `npx next build` | prejde — 6 pohľadov, 32 API rout, middleware aktívny |
| `npx playwright test` | **47 / 47**, vrátane axe na Prehľade, Timeline a Projektoch v oboch témach |
| Docker | `aura-roadmap-app` healthy na `:3040`, `aura-roadmap-db` healthy, DB bez host portu |
| `/api/health` | `{"ok":true,"db":true}` |
| Migrácie | `0001_init` (6) + `0002_domain` (13) + `_migrations` = **20 tabuliek** |
| Seed | idempotentný — druhý beh pridá 0 riadkov; 16 položiek / 3 komentáre / 5 worklogov / 15 podmienok / 1 rozhodnutie / 1 baseline |
| Zálohy | dump 78 KB do `backups/`, retencia 3, status JSON + log |
| Screenshoty | 21 (dark + light 1440, dark 390) v `test-results/screenshots/` |

### Dosiahnuté zjednodušenie

| Vec | Pred | Po |
|---|---|---|
| Generácie UI | 3 (V1 + V2 + V3) | **1** |
| Tabuľky | 36 | **20** (13 doménových + 7 infra) |
| CSS | 189 KB v 3 súboroch | **1 súbor, 560 riadkov / 36 KB** |
| Režimy Timeline | 5 | **3** |
| Zoomy | 5 | **3** |
| Hustoty | 3 | **2** |
| Hierarchia práce | 5 úrovní + Bug + Spike | **2 úrovne, 3 typy** |
| Workflow engine | konfigurovateľný per projekt | **1 pevný stavový model** |
| Runtime | Cloudflare Worker + D1 + R2 + `vinext` | **Node 22 + Next 16 standalone + MariaDB 11.4** |
| Testy | 1 súbor | **22 unit + 4 e2e specy** |

### Akceptačné kritériá

Splnených **17 z 18**. Nesplnené je len kritérium o GitHub remote (§3.2/97): `gh` nie je
v prostredí nainštalované a remote nebol nastavený, takže repo na GitHube som vytvoriť
nemohol. Lokálny repo, branch `feat/aura-family-port` a 9 commitov existujú a sú
nedotknuté — chýba iba `git remote add` + `git push`.

### Odchýlky od kontraktu

1. **Rate-limit hodnoty zmenené** oproti pôvodnej implementácii: `read` 120→600,
   `write` 60→120, `heavy` 30→120 za minútu. Buckety sú per-IP a Prehľad ťahá 7
   requestov na zobrazenie, takže pôvodné čísla dovolili ~4 zobrazenia za minútu pre
   celý tím. `login` zostal na 10/min. Reverzibilné, zapísané.
2. **Projekty na mobile vykresľujú karty**, nie tabuľku (pod 700 px), nezávisle od
   uloženej preferencie. Kontrakt §3.2/72 hovorí „mobil: čítanie + rýchle akcie", takže
   je to v jeho duchu; 9-stĺpcová tabuľka potrebuje 940 px.
3. **16 pracovných položiek v seede** namiesto „~20" zo špecifikácie (otázka 48).
   Pokrývajú všetky stavy, typy aj 2 úrovne, takže účel je splnený.
4. **Prílohy** neexistujú ani ako `links` tabuľka — URL sa píše do popisu položky
   (kontrakt §2.2 ich rušil, otázka 34 navrhovala `links` ako alternatívu).

### Follow-up šprinty (2026-07-29, 5 agentov) — DOKONČENÉ

Tri z piatich otvorených bodov sú vyriešené. Brána po nich: `tsc` čistý, lint **0 chýb
a 0 upozornení**, **593 testov v 27 súboroch**, build 28/28 stránok, **47/47 e2e**.

| Šprint | Výsledok |
|---|---|
| **Observabilita** | Každý výstup `defineRoute` emituje jeden štruktúrovaný riadok (metóda, path, status, trvanie, reason, user). Nikdy telo, query hodnoty, hlavičky ani cookies — overené kanárikovým testom s piatimi tajnými hodnotami, z ktorých sa do logu nedostala ani jedna. Logovanie je obalené tak, aby rozbitý logger nezmenil hotovú 200 na unhandled rejection. |
| **Agregácia Prehľadu** | 7 paralelných requestov → **1** (`GET /api/overview`). Staré endpointy zostali nedotknuté. Tým zmizla príčina, pre ktorú bolo treba zvýšiť rate-limit. |
| **Lint dlh** | 23 upozornení `set-state-in-effect` → **0**, cez promise chains, derivovaný stav a `useSyncExternalStore`. Nikde plošný `eslint-disable`. |

**Nová observabilita sa zaplatila okamžite:** riadok `POST /api/work-items/.../move 400
reason=handler` odhalil, že dialóg „Presunúť" nabízal šprinty iných projektov, ktoré API
odmieta relačnou kontrolou — na seed dátach bol teda každý cieľ zaručený error toast.
Opravené funkciou `moveTargets()`. **Tú istú pascu má drag & drop** a zatiaľ nie je
opravená (viď otvorené body).

Seed doplnený: nepriradené položky ES-100 (bez nich sa presun z backlogu nedal vyskúšať
vôbec) a `updated_at` na dokončených položkách, aby 12-týždňový graf mal čo kresliť.

### Opakovateľné workflows

V `.claude/workflows/` sú štyri agentové workflows verzované s kódom, plus `README.md`:
`aura-verify` (overovacia brána vrátane kontrol súladu s kontraktom), `aura-new-app`
(scaffold novej appky rodiny s prenosom 14 overených pascí), a dva odložené —
`aura-roadmap-integrations` a `aura-family-accent-unify`.

### Otvorené body

**Blokované prostredím:**
- `git remote add origin` + prvý push — `gh` nie je nainštalované

**Vecné, v poradí hodnoty:**
- **Drag & drop má tú istú relačnú pascu ako dialóg** — `onDragEnd` v `SprintPlanner.tsx`
  nefiltruje droppable cieľ, takže pretiahnutie karty do šprintu iného projektu skončí
  400 a error toastom. Riešenie je použiť `moveTargets()`, rovnako ako dialóg.
- `GET /api/overview` ťahá 200 checkpointov, hoci panel renderuje 6 a KPI potrebuje len
  `total`. Zníženie na ~10 riadkov + total je čistá úspora.
- `ProjectDetailModal` je kľúčovaný projektom, nie tokenom obnovenia, takže pri
  opätovnom otvorení toho istého projektu na jeden frame zobrazí staré dáta namiesto
  skeletonu. `aria-busy` je pritom nastavené.
- Nepoužitý i18n kľúč `overview.kpi.sprintCapacitySub`.
- `Pagination issues` v seede má stále `updated_at NULL` (existujúci riadok sa pri
  idempotentnom behu preskočí) — prejaví sa až po čistom reseede.

**Odložené tvojím rozhodnutím** (pripravené ako workflows, nespúšťať bez pokynu):
- Integrácie s rodinou cez read-only usera `roadmap_ro` (otázka #83)
- Rozpor teal vs zlatá v rodine (otázka #63)
