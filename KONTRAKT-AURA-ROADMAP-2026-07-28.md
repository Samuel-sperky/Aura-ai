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

**Vecné:**
- `Pagination issues` v seede má stále `updated_at NULL` (existujúci riadok sa pri
  idempotentnom behu preskočí) — prejaví sa až po čistom reseede. Kozmetické:
  štyri ďalšie dokončené položky `updated_at` majú, takže graf kreslí dáta.

### Záverečný šprint (2026-07-30) — DOKONČENÉ

Zvyšné štyri vecné body uzavreté. Agentov sa použiť nedalo — session limit vyčerpaný
s resetom o 11 hodín — takže ich odrobil orchestrátor v main loope.

| Bod | Riešenie |
|---|---|
| **Drag & drop mal tú istú relačnú pascu ako dialóg** | `droppableBuckets()` — cudzí stĺpec dostane `disabled` v `useDroppable`, takže sa naň nedá pustiť, a je stlmený `.itemsBlocked`. Poistka v `onDragEnd` chráni klávesnicovú cestu. Test overuje, že dialóg aj drag & drop vynucujú **tú istú** podmienku |
| `GET /api/overview` ťahal 200 checkpointov | **12** (panel renderuje 6, `total` hlási `listCheckpoints` nezávisle od stránky). Sken dokončených položiek navyše ohraničený v SQL na 15 týždňov namiesto 2000 riadkov, a vylučuje `updated_at IS NULL`, ktoré graf aj tak preskočí |
| Modal ukázal staré dáta na jeden frame | Nový `openToken` — cache je kľúčovaná **otvorením**, nie projektom. Zámerne oddelený od `refreshToken`: refetch po uložení má obsah nechať, nové otvorenie má začať skeletonom |
| Nepoužitý i18n kľúč | Zmazaný |

### Presun do `C:\Users\Ucet\Documents\GitHub\Aura-app` (2026-07-30)

Projekt má nový domov. Presunutý **pushom branchu**, nie kópiou súborov, takže všetkých
16 commitov aj ich správy zostali zachované. Overené na novom mieste: `tsc` čistý,
lint 0, **601 testov / 27 súborov**, 256 trackovaných súborov, `.env` skopírovaný
a správne netrackovaný, všetky 4 workflows na mieste.

Dve veci, ktoré z presunu vyplývajú:
- `docker-compose.yml` má **explicitné** `container_name`, takže `docker compose up`
  z nového miesta koliduje so stackom bežiacim z `C:\Aura\aura-roadmap`. Treba starý
  zastaviť, alebo nové miesto používať len ako git domov.
- DB volume je viazaný na názov projektu (adresár), takže nové miesto by začalo
  **s prázdnou DB** a potrebovalo migráciu a seed. Starý stack ich má naseedované.

`C:\Aura\aura-roadmap` nie je zmazaný ani vypnutý — je to teraz zastaraná kópia
a jej likvidácia je rozhodnutie vlastníka.

### `npm audit` — vedome prijaté riziko

Akceptačné kritérium 13 znelo „bez **kritických** zraniteľností". Kritické tam nie sú,
ale schovávať sa za to slovo by bolo nečestné: `npm audit --omit=dev` hlási
**3 high** (celkovo 12).

| Advisory | Cesta | Reálna expozícia |
|---|---|---|
| PostCSS path traversal v auto-loadingu source map ([GHSA-r28c-9q8g-f849](https://github.com/advisories/GHSA-r28c-9q8g-f849)) | `next@16.2.12 → postcss@8.4.31` | Build-time, nad naším vlastným CSS. Žiadny vstup od útočníka |
| `sharp` < 0.35.0, dedené libvips CVE ([GHSA-f88m-g3jw-g9cj](https://github.com/advisories/GHSA-f88m-g3jw-g9cj)) | `next@16.2.12 → sharp@0.34.5` | **Nikdy sa nespustí.** Appka nepoužíva `next/image` ani nemá `images` config, takže Nextov image optimizer — jediné, čo `sharp` vyvoláva — sa nevykoná |

Ani jeden balík **nie je priamou závislosťou** — obe idú výhradne z `next`.

**Prečo sa to neopravuje:** jediná nabízaná oprava je `npm audit fix --force`, ktorá
nainštaluje **`next@9.3.3`** — downgrade zo 16 na 9. Advisory pritom pokrýva `next`
až po `16.3.0-preview.7`, takže dopredná oprava zatiaľ **neexistuje**. Kontrakt §4
`npm audit fix --force` výslovne zakazuje a zdrojová appka mala ten istý stav
zdokumentovaný v handoffe.

**Kedy to znovu preveriť:** keď `next` vydá verziu mimo rozsahu advisory — vtedy bump
a nový `npm audit`. Dovtedy je to zdedená upstream situácia, nie dlh tohto portu.

**Odložené tvojím rozhodnutím** (pripravené ako workflows, nespúšťať bez pokynu):
- Integrácie s rodinou cez read-only usera `roadmap_ro` (otázka #83)
- Rozpor teal vs zlatá v rodine (otázka #63)

### Dokončenie dizajnu Timeline (2026-07-30)

Timeline bola funkčne hotová, ale čítala sa zle: Roadmap tlačil 12 mesiacov do
**šírky** stránky, takže popisy prekrývali pruhy a pod grafom zostala prázdna polovica
obrazovky. Šprint to prestavil na **vertikálnu** os — čas plynie zhora dole — a to isté
rozhodnutie dotiahol aj na režim Rozhodnutia.

**Desať rozhodnutí, ktoré šprint implementoval,** a dôvod ku každému. Dôvody sú
zapísané aj priamo v hlavičkách `RoadmapMode.tsx`, `DecisionQueue.tsx`,
`decisionTimeline.ts` a `lib/timeline.ts`, aby sa nedali stratiť s týmto dokumentom:

| # | Rozhodnutie | Prečo |
|---|---|---|
| 1 | **Roadmap je vertikálny** — mesiace v ľavom sticky stĺpci, jeden projekt = jedna svislá dráha, „Dnes" je vodorovná linka | 12 mesiacov na šírku nechalo popisy prekryté pruhmi a spodnú polovicu stránky prázdnu. Šírka je vzácna, výška nie |
| 2 | **Horizont sa riadi zoomom**: 8 kvartálov / 12 mesiacov / 12 týždňov (`ROADMAP_HORIZON`) | Zoom je voľba detailu, nie dĺžky stránky. Pri fixných 12 mesiacoch kreslil `week` ~53 stĺpcov (nekonečný scroll) a `quarter` štyri (prázdna stránka). Horizont je ukotvený na začiatku jednotky obsahujúcej dnes, takže žiadny stĺpec nie je odseknutý a dnes je vždy vnútri |
| 3 | **Výška osi z hustoty** — `UNIT_PX = { cozy: 58, compact: 40 }`, podlaha 360 px | Kompaktná hustota má jednu úlohu: 12 mesiacov bez svislého scrollu (480 px proti 700 px). Pruhy sú v percentách tejto výšky, takže číslo rieši vzdušnosť, nie správnosť |
| 4 | **Žiadny názov vnútri pruhu** — nesie ho hlavička dráhy nad ním | Text na boku bol na krátkych pruhoch odseknutý a hlavička ho aj tak duplikovala |
| 5 | **Oblasť sa zbalí do JEDNEJ súhrnnej dráhy**, zbalený stav v `?collapsed=` | 50 projektov rozbalených znamená ~5 800 px vodorovného scrollu. Stav je v URL, takže skopírovaný odkaz reprodukuje obrazovku; prázdny set zapisuje `null`, čiže rozbalený Roadmap má čistú adresu |
| 6 | **Checkpoint mimo trvania projektu si značku PONECHÁ** a dostane výstražný štýl | Je to reálna informácia — takmer isto chyba v dátach. Skryť ju znamená skryť tú chybu. Pravidlo je zdieľané s `barGeometry` (`isOutsideProject`), aby marker a pruh nehovorili každý niečo iné |
| 7 | **Projekty bez dátumov idú POD os**, nie do prázdnej dráhy | Prázdna dráha vyzerá ako chyba vykreslenia. Riadok „Bez termínu" pod osou ich prizná a nechá klikateľné |
| 8 | **Celý pruh otvára projekt**; značky checkpointov ležia nad ním a klik si držia | Pruh bol najväčší terč na obrazovke a nerobil nič. Klik na značku musí otvoriť checkpoint, nie projekt pod ňou |
| 9 | **`@media print`** — bez toolbaru a legendy, os na plnú šírku, dráhy nerozseknuté cez stránku | Pilier „evidencia pre reporting" znamená, že roadmap sa tlačí. Doteraz sa tlačila s ovládacími prvkami |
| 10 | **Rozhodnutia sú tá istá vertikálna os** — mesiace ako sekcie, jedna linka „Dnes" medzi „po termíne" a „pred nami" | Fronta zoradená podľa termínu hovorila, ktorý checkpoint je ďalší, ale nie **ako ďaleko** je. „O 6 dní" a „o 5 mesiacov" boli dva riadky od seba a vyzerali rovnako. Mesačné sekcie vrátili vzdialenosť a linka „Dnes" zmenila „čo je po termíne" z čítania na videnie. Nič sa nezahodilo: readiness bar, typ, stav, schvaľovateľ, pozícia vo fronte aj filtre zostali |

Tri veci, ktoré z toho vyplynuli a sú **zámerné**, nie nedokončené:

- **Rozhodnutia nemajú horizont.** Checkpoint rok po termíne alebo tri roky dopredu
  dostane vlastnú mesačnú sekciu. Klipovanie na 12 mesiacov by spôsobilo, že os
  nesúhlasí s dlaždicami priamo nad ňou. Mesiace bez checkpointu sa nekreslia —
  30 prázdnych sekcií medzi dvoma reálnymi je šum.
- **Rozhodnutia nepoužívajú absolútne polohovanie.** Checkpoint je jeden deň, nie
  rozsah; sekcia na mesiac s kartami pod sebou je čitateľnejšia a imúnna voči
  pretečeniu, ktoré by percentuálna geometria na 390 px potrebovala riešiť.
- **Režim `sprints` horizont zoomu nesleduje** — 12 týždňov od pondelka pri každom
  zoome, s odseknutým prvým a posledným stĺpcom. Plánovacie okno je vlastnosť režimu,
  nie zoomu, a e2e to drží.

**Čo to nestálo:** `barGeometry()` a `markerPercent()` vracajú podiel horizontu
v percentách **bez smeru**, takže obrat osi na výšku nepotreboval v `lib/timeline`
ani jednu zmenu — tie isté čísla, ktoré šli do `left`/`width`, idú do `top`/`height`.

#### Odchýlky od `docs/04-DOKONCENIE-50-OTAZOK.md`

Dve odpovede z pôvodnej päťdesiatky sú týmto **prekonané**:

- **Q9** („Rozhodnutia = fronta, **nie** časová os") — fronta bez osi nevedela ukázať
  vzdialenosť k termínu, viď rozhodnutie 10. Fronta ako *pracovné usporiadanie*
  zostáva: server ju dodáva cez `queue=1` a `groupDecisionsByMonth` jeho poradie
  neprepisuje, len ho rozdelí do mesiacov.
- **Q10** („dnes = **vertikálna** teal linka") — pri vertikálnej osi je „Dnes"
  vodorovná linka. Vzor sám (jedna akcentová linka + vlajka „Dnes") sa nemenil.

#### Otvorené body

Nič z tohto nie je regresia — appka je zelená aj s nimi. Sú to nedotiahnuté konce.

1. ~~**`sprints` prop nie je zapojený.**~~ **UZAVRETÉ (2026-07-30).**
   `TimelineWorkspace.tsx` posiela `sprints={axisSprints}` v bloku
   `mode === "roadmap"`; sprintové pruhy sa kreslia a legenda „Šprint" má k čomu
   patriť.

   Pôvodná oprava zapísaná vyššie („poslať `core.sprints`, **nie** `axisSprints`")
   bola **vecne nesprávna** a neriaď sa ňou. Vychádzala zo zastaraného komentára nad
   `axisSprints` („those overlapping the 12-week horizon"), nie z kódu: `axisSprints`
   je `sprintsInHorizon(core.sprints, scale)` a `scale` je jediné
   `buildTimeScale({ mode, zoom, today })` kľúčované **režimom**. V režime `roadmap`
   je teda `axisSprints` filtrované presne tým horizontom, ktorý `RoadmapMode`
   aj kreslí — nie sprintovým. Komentár je opravený, aby pascu neobnovil.

   `axisSprints` je navyše **správnejšia** voľba než `core.sprints`: `RoadmapMode`
   posiela ten istý zoznam do `ScreenReaderSummary`, ktorý pod stĺpcom
   `timeline.roadmap.sprintCount` počíta `sprints.filter(s => s.projectId === …)`.
   S `core.sprints` by sr-only tabuľka hlásila aj šprinty mimo horizontu, teda viac
   šprintov, než koľko je na obrazovke pruhov. Filtrovanie cez `barGeometry`
   vnútri `RoadmapMode` rieši len pruhy, nie tento počet.
2. ~~**Popisok horizontu v hlavičke osi klame pri dvoch zoomoch z troch.**~~
   **UZAVRETÉ (2026-07-30).** `RoadmapMode.tsx` už nerenderuje statické
   `t("timeline.horizonRoadmap")`, ale `horizonHint(scale)`, ktorý skladá popisok
   z `scale.columns.length` a `scale.zoom` cez `timeline.horizonUnits.<zoom>.<tvar>`
   (9 kľúčov, SK + EN, so slovenským plurálom cez `pluralForm`). Popisok sa odvodzuje
   od stĺpcov, ktoré os **naozaj** kreslí, takže sa s ňou nemôže rozísť ani po zmene
   `ROADMAP_HORIZON`. Pasca ostáva v `CLAUDE.md` („Graf nesmie tvrdiť horizont, ktorý
   škála nemá").
3. **Zjednotenie aktívnej navigácie naprieč rodinou — vedome odložené ako samostatná
   úloha**, rovnako ako sa riešil akcent (`docs/AKCENT-ROZHODNUTIE.md`, otázka #63).
   Aura Roadmap značí aktívnu položku zlatým tintom plus vnútornou lištou
   (`.nav-item.active`: `color-mix(… --brand-gold 12% …)` + `inset 3px 0 0
   var(--brand-gold)`), zvyšok rodiny čiernou pill. To je **rozhodnutie o rodinnom
   dizajne, nie bug v tejto appke** — meniť to v jednej appke by rozpor len presunul.
   Stav ostatných appiek v tomto šprinte overený nebol.

#### Čo bolo overené

`npx.cmd tsc --noEmit` čistý, `npm.cmd run lint` 0/0, `npx.cmd vitest run` zelený.
i18n: každý `t()` / `tk()` kľúč použitý v `src/components/timeline/` existuje
v registri a má SK aj EN (overené grepom proti `keys.*.ts`, 142 kľúčov rodiny
`timeline.*` / `planner.*` / `capacity.*` / `checkpointModal.*`, žiadny osirelý);
prefixy dynamických kľúčov `health.*`, `sprintStatus.*`, `checkpointState.*`,
`checkpointType.*`, `outcome.*`, `status.*`, `itemType.*`, `priority.*` sú kryté
v `keys.common.ts` a `keys.sprints.ts`.

#### Brána (2026-07-30, po rebuilde)

Statická brána: `tsc --noEmit` čistý · `npm run lint` **0 chýb / 0 upozornení** ·
`vitest run` **666 testov / 30 súborov** (pred šprintom 601 / 27) ·
`next build` prejde. Živá brána: `docker compose up -d --build app`,
`/api/health` → `{"ok":true,"db":true}`, `npx playwright test`
**58/58 prejde, 0 preskočených** (pred šprintom 47/47).

Prvý beh e2e po rebuilde **spadol**: axe `target-size` (WCAG 2.2 SC 2.5.8, impact
serious), 4 uzly, obe témy — `.vtMarker` bola 18×18 px namiesto 24×24. Opravené
v `timeline.module.css` (značka 24×24, ikona 13 px); pasca zapísaná v `CLAUDE.md`.

Zároveň brána rozšírila `e2e/a11y.spec.ts` o `/timeline?mode=sprints`
a `/timeline?mode=decisions`. `/timeline` vykreslí len `mode=roadmap`, takže
sprintový planner a rozhodovacia os do tej chvíle **nikdy** neprešli kontrolou
kontrastu ani terčov (nález A3). Po rozšírení je axe na nule na 5 obrazovkách
× 2 témy.

Overené v prehliadači na bežiacom builde (1440×900 a 390×780, obe témy):

| Rozhodnutie | Ako to bolo odmerané |
|---|---|
| 2 — horizont podľa zoomu | popisok osi `8 kvartálov` / `12 mesiacov` / `12 týždňov`, `columns.length` 8 / 12 / 12 |
| 3 — `compact` znižuje mesiac na 40 px | výška osi 696 px pri `cozy`, **480 px** pri `compact`; buňky 41/39 px podľa dĺžky mesiaca |
| 4 — žiadny svislý text v pruhu | `writing-mode` na `.vtBar` je `horizontal-tb` na všetkých pruhoch |
| 5 — zbalenie oblasti je v URL | e2e „zbalenie oblasti je v URL a reload ho reprodukuje" |
| 7 — projekty bez dátumov pod osou | **nedalo sa odmerať** — seed nemá projekt bez dátumov (logika krytá `partitionByDates` v `roadmapAggregate.test.ts`) |
| 6 — checkpoint mimo trvania | **nedalo sa odmerať** — seed nemá taký checkpoint (logika krytá `isOutsideProject`) |
| 8 — pruh otvára projekt, značka checkpoint | e2e „klik na pruh projektu otvorí detail" + „checkpoint na dráhe otvorí checkpoint, nie projekt" |
| 9 — `@media print` | pod `media: print` je toolbar, sidebar aj `.no-print` `display: none`, `.vtScroll` `overflow: visible`, `break-inside: avoid` platí na `.vtLane`; roadmap sa vytlačí na jednu stránku |
| 10 — os Rozhodnutí s linkou „Dnes" | linka je práve raz, karta je `<button>`, Tab na ňu dosiahne (12 tabov), focus ring `2px` s `offset -2px`, Enter otvorí modal a zapíše `?checkpoint=<id>` |
| „Skočiť na dnes" | po kliknutí je linka „Dnes" vo viewporte |
| legenda na jednom riadku | 26 px vysoká, všetky položky majú rovnaký vertikálny stred |
| sprintové pruhy | 2 pruhy `.vtSprint` (5 px, vpravo od pruhu projektu), **0** prekryvov so značkami; sr-only stĺpec „Šprinty" hlási 2 = počet nakreslených pruhov |
| 390 px | `documentElement.scrollWidth === clientWidth === 390` v režimoch roadmap, sprints aj decisions; Roadmap je zoznam v čase (4 položky), nie dráhy |
| observabilita | neautentifikovaný `GET /api/projects` → `401` a v logu `[api] GET /api/projects 401 1ms reason=auth_denied` |

Regresné grepy čisté: žiadny raw hex ani `rgba(` mimo `:root`, `--muted` je
`#566964` (dark `#8a9b98`) a nikde naň nie je `opacity`, žiadny `role="img"` na
kontejneri s tlačidlami, `globals.css` 605 riadkov, žiadny `deleted_at` (len testy
overujúce absenciu), žiadny `northstar`/`cloudflare`/`wrangler`/`drizzle`, každý
`route.ts` má `defineRoute` s `auth` — bez `auth` sú presne `/api/health`
a `/api/auth/login`.
