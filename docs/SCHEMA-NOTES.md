# SCHEMA-NOTES — Aura Roadmap

**Dátum:** 2026-07-28
**Autor:** A2 (databázová schéma a migrácie)
**Rieši:** riziko č. 1 z kontraktu §9 — *„`ensureWorkspaceSchema()` (1807 LOC) sa rozchádza s `db/schema.ts`“*

Tento dokument je záznam o tom, **z čoho** sa schéma extrahovala, **čo sa zahodilo** a **prečo**.
Zdroj pravdy pre implementáciu je `db/migrations/*.sql`, nie tento súbor.

---

## 1. Ktorý zdroj je autorita (a ako sa overil)

Zdrojová appka (`C:\Users\Ucet\Desktop\IT roadmap planner`) nesie **dva** popisy schémy:

| Zdroj | Čo to je | Stav |
|---|---|---|
| `lib/server/workspace.ts` → `ensureWorkspaceSchema()` | 36× `CREATE TABLE IF NOT EXISTS` + 1× `ensureColumns()` (runtime `ALTER TABLE ADD COLUMN` cez `PRAGMA table_info`) | **AUTORITA** — toto sa reálne spúšťa |
| `db/schema.ts` | Drizzle deklarácie, 36 `sqliteTable()` | **MŔTVY KÓD** — `getDb()` má nula call sites |

Oba zdroje som porovnal **strojovo** (parser na `CREATE TABLE` bloky vs parser na `sqliteTable()`
chunky, diff na úrovni stĺpcov aj FK), nie okom. Výsledok:

- **Množina tabuliek je v oboch zdrojoch identická: 36 = 36.** Žiadna tabuľka nechýba ani neprebýva.
- **Množina stĺpcov je identická vo všetkých 36 tabuľkách** (po dopočítaní 11 stĺpcov,
  ktoré `checkpoints` získava až runtime cez `ensureColumns`).
- Rozdiely sú **len v deklarácii FK a v deklarácii enumov** — viď §2 a §3.

**Dôsledok pre port:** obava z kontraktu §9 („chýbajúca tabuľka/stĺpec v migrácii“) sa
**nepotvrdila**. Stačilo vychádzať z `workspace.ts`, ako kontrakt prikazuje — nič sa nestratilo.

### 1.1 Korekcia zadania

Zadanie hovorilo o **2× `ensureColumns()`**. V skutočnosti je v `workspace.ts` **jedna definícia**
funkcie (r. 103) a **jedno call site** (r. 612, na tabuľke `checkpoints`, +11 stĺpcov). Iné
`ALTER TABLE` / `CREATE TABLE` sa v celom zdrojovom repe (mimo `db/schema.ts`) nenachádzajú.

---

## 2. Rozdiely medzi `db/schema.ts` a `workspace.ts`

Odchýlku má **8 z 36 tabuliek**, a vždy ide o **FK deklarovaný v runtime DDL, ktorý Drizzle
nepozná**. Stĺpce nikde nechýbajú.

| Tabuľka | v `db/schema.ts` | v `workspace.ts` | Rozdiel |
|---|---|---|---|
| `work_items` | `parent_id` bez `.references()` | `FOREIGN KEY (parent_id) REFERENCES work_items(id)` | FK na self chýba v Drizzle |
| `worklogs` | `user_id` bez `.references()` | `FOREIGN KEY (user_id) REFERENCES users(id)` | FK chýba v Drizzle |
| `work_item_comments` | `author_id` bez `.references()` | `FOREIGN KEY (author_id) REFERENCES users(id)` | FK chýba v Drizzle |
| `work_item_watchers` | `user_id` bez `.references()` | `FOREIGN KEY (user_id) REFERENCES users(id)` | FK chýba v Drizzle |
| `notifications` | `user_id` bez `.references()` | `FOREIGN KEY (user_id) REFERENCES users(id)` | FK chýba v Drizzle |
| `sprints` | `team_id` bez `.references()` | `FOREIGN KEY (team_id) REFERENCES teams(id)` | FK chýba v Drizzle |
| `sprint_allocations` | `user_id` bez `.references()` | `FOREIGN KEY (user_id) REFERENCES users(id)` | FK chýba v Drizzle |
| `timesheets` | `user_id` bez `.references()` | `FOREIGN KEY (user_id) REFERENCES users(id)` | FK chýba v Drizzle |
| ostatných 28 | — | — | **identické** (stĺpce aj FK) |

Z týchto 8 sa do portu dostávajú len `work_items.parent_id`, `worklogs.user_id`,
`work_item_comments.author_id` a `notifications.user_id` — a všetky štyri majú v novej schéme
**explicitný FK** (`sprints.team_id`, `sprint_allocations`, `timesheets`, `work_item_watchers`
sú mimo rozsahu).

### 2.1 `checkpoints` — najrizikovejšia tabuľka zdroja

Základný `CREATE TABLE` má **8 stĺpcov**, runtime `ensureColumns()` dopĺňa ďalších **11**:
`description`, `impact`, `checkpoint_type`, `start_date`, `end_date`, `date_label`, `owner`,
`lifecycle`, `decision`, `readiness`, `version`. Až po tomto kroku je zhoda s `db/schema.ts` (19 = 19).

Kto by portoval len z `CREATE TABLE`, stratil by **11 stĺpcov vrátane `version` a `readiness`** —
teda celé jadro rozhodovacej fronty aj optimistickú konkurenciu. Toto bolo skutočné riziko §9.

### 2.2 Enumy sú len v Drizzle, DB ich nevynucuje

`db/schema.ts` deklaruje `enum:` pri `projects.status`, `projects.health`, `tasks.status`,
`checkpoints.checkpoint_type`, `checkpoints.status`, `users.role`, `dashboard_layouts.status`.
V SQLite to nie je constraint (Drizzle enum je len typová fikcia) a `workspace.ts` má na tých
miestach obyčajný `TEXT`. **Defaulty sa medzi zdrojmi nerozchádzajú** (overené).

Podstatnejšie: zdroj ukladal do stavových stĺpcov **zobrazovacie reťazce**, nie kľúče —
`projects.status = 'Planned' | 'On track' | 'At risk' | 'Blocked'`, `projects.health` vrátane
`'blue'`, `work_items.status = 'Backlog'`, `tasks.status = 'Nové' | 'Prebieha' | 'Čaká' | 'Hotovo'`
(slovenčina v databáze). Port to normalizuje na **stabilné EN snake_case kľúče** a SK labely
posúva do i18n vrstvy (kontrakt §3.2/70). `blue` neexistuje, nahradzuje ho `grey`.

---

## 3. Z 36 tabuliek na 19

### 3.1 Prevzaté (13 doménových)

`projects` · `checkpoints` · `checkpoint_requirements` · `checkpoint_decisions` · `sprints` ·
`work_items` · `work_item_comments` · `work_item_dependencies` · `worklogs` · `plan_versions` ·
`notifications` · `user_preferences` · `user_view_preferences`

### 3.2 Nahradené rodinnou infra (6)

| Zdroj | Nová tabuľka |
|---|---|
| `users` (PBKDF2 `password_hash` + `password_salt`) | `app_users` (argon2id v `pin_hash`) |
| `sessions` (`token_hash`) | `app_sessions` (`expires_at` + `revoked_at`, revalidácia per request) |
| `audit_events` (`entity_type`, `actor`, `detail`) | `audit_log` (`action`, `old_values`/`new_values` JSON, server-side IP) |
| — | `app_roles` (RBAC, `rights` JSON) |
| — | `auth_attempts` (rate-limit + lockout) |
| — | `app_config` (JSON nastavenia) |

`_migrations` (ledger) vytvára `scripts/migrate.ts`, nie migrácia.

### 3.3 Zahodené (20 tabuliek)

| Tabuľka | Prečo |
|---|---|
| `tasks` | duplikát `work_items` (kontrakt §10/25) |
| `checkpoint_templates` | §10/37 |
| `checkpoint_sprints` | §10/38 |
| `sprint_allocations` | §10/38 — kapacita je panel, nie tabuľka |
| `workflows`, `workflow_statuses`, `workflow_transitions` | workflow engine mimo rozsahu (§2.2) |
| `custom_fields`, `work_item_custom_values` | custom fields mimo rozsahu (§2.2) |
| `dashboard_layouts`, `dashboard_widgets`, `dashboard_layout_versions` | dashboard builder mimo rozsahu (§2.2) |
| `teams`, `user_team_memberships`, `team_view_presets` | tímy mimo rozsahu (3–4 ľudia) |
| `timesheets`, `timesheet_entries` | týždenné schvaľovanie mimo rozsahu |
| `attachments` | upload nahradený URL v popise (§2.2/34) |
| `work_item_watchers` | watchers/mentions mimo rozsahu (§10/39) |
| `email_outbox` | e-mail zrušený, len in-app notifikácie (§3.2/17) |

### 3.4 Zahodené stĺpce v prevzatých tabuľkách

| Tabuľka | Zahodené |
|---|---|
| `projects` | `program`, `budget`, `spent`, `timeline_start`, `timeline_span`, `task_count`, `completed_task_count`, `risks` · `portfolio` → **`area`** |
| `checkpoints` | `date_label` (derivované pre zobrazenie), `decision` (aktuálny výsledok je riadok v `checkpoint_decisions` s `superseded_by IS NULL`), `status` (zlúčený do `lifecycle`) |
| `sprints` | `team_id`, `workstream`, `deleted_at` |
| `work_items` | `value_score`, `risk_score`, `urgency_score`, `effort_score`, `priority_score`, `deleted_at` |
| `work_item_dependencies` | `dependency_type`, `lag_days` (existuje len typ `blocks`) |
| `plan_versions` | `status`, `published_at`, `published_by`, `version` (bez draft/publish workflow) |
| `notifications` | `severity` |
| `attachments` | celá tabuľka, vrátane jej `deleted_at` |

Všetky tri výskyty `deleted_at` v zdroji (`sprints`, `work_items`, `attachments`) sú zrušené —
**soft delete nemá rodina nikde**. Hard delete + `ON DELETE CASCADE` na deti + riadok v `audit_log`.

---

## 4. Rozhodnutia, ktoré som spravil sám (reverzibilné)

### 4.1 `projects` NEMÁ `version`

Zadanie si tu protirečí: bod „Krok 3 / 1. `projects`“ aj odpoveď 16 z 50-otázok uvádzajú
`version`, ale globálne pravidlo stacku aj kontrakt §5.2/§5.3 hovoria **„`version` len na
`checkpoints`, `sprints`, `work_items`“** a test má overiť **presne 3** tabulky.

Rozhodol som podľa pravidla stacku (2 nezávislé miesta + testovacia požiadavka vs 1 zoznam polí):
**`projects.version` neexistuje.** Dôsledok pre API projektov: **žiadny `409 VERSION_CONFLICT`**,
súbežná editácia projektu je last-write-wins, konflikt sa deteguje voči `updated_at`.
Ak to má byť inak, je to jednoriadková migrácia `0003` — dáta neexistujú.

### 4.2 `checkpoints.owner` / `approver` → `owner_id` / `approver_id` (FK na `app_users`)

Zdroj ich mal ako voľný text. Pravidlá z 50-otázok sa však o identitu opierajú:
otázka 41 („rozhodnúť môže Admin a Editor, **ale len ak je uvedený ako `approver`**“) a
otázka 35 („pri type `gate` musí byť schvaľovateľ **iný než vlastník**“). Voľný text robí obe
pravidlá krehkými — presne z toho dôvodu, pre ktorý otázka 29 odmietla voľný text pri `assignee`.
Preto sú to `CHAR(36) NULL` FK na `app_users` s `ON DELETE SET NULL`.

`projects.owner` / `owner_initials` **zostávajú voľným textom** — tam otázka 16 rozhodla inak
a vlastník projektu nemusí mať účet.

### 4.3 Stavy sú `VARCHAR`, nie `ENUM`

Rodinná konvencia (`sperky-ai/db/migrations/0010_collab.sql`: *„`status` / `priority` /
`approval` are ENUM-like VARCHARs validated by zod“*). Pridanie hodnoty tak nikdy nepotrebuje
`ALTER TABLE` a jediná definícia množiny hodnôt žije v `src/lib/domain/contracts/*`.
Povolené hodnoty sú vypísané v hlavičke `0002_domain.sql` a strážené testom (`ENUM(` je zakázaný).

### 4.4 Číselníky `name_sk` / `name_en` sa neuplatňujú

Konvencia ich žiada „na číselníkoch“. V tejto schéme **žiadny číselník nie je**: `area` je
`VARCHAR` na projekte (zoznam sa čerpá cez `SELECT DISTINCT area`), všetky ostatné slovníky sú
enum-like hodnotové stĺpce a `app_roles.name` je stabilný EN kľúč (`admin|editor|viewer`).
SK/EN labely žijú v i18n vrstve. Ak niekedy vznikne editovateľný číselník, konvencia platí preň.

### 4.5 `pin_hash` = argon2id hash **hesla**

Názov je dedičstvo rodinnej predlohy (`sperky-ai`), ktorá sa prihlasuje PIN-om. Aura Roadmap sa
prihlasuje **e-mailom a heslom**, ale stĺpec sa menuje `pin_hash` podľa zadania, aby sa nerozišla
rodinná infra. Nikdy neobsahuje plaintext ani numerický PIN.

### 4.6 `email` / `username` sú 255 znakov

Rodinná predloha má `username VARCHAR(64)`. Prihlasujeme sa e-mailom, takže `app_users.email`,
`auth_attempts.username` (e-mail zadaný vo formulári) aj `audit_log.username` sú `VARCHAR(255)`.
Index `ix_auth_attempts_user_ip_ts (username, ip, ts)` má 1281 bajtov, limit MariaDB 11.4
(row_format DYNAMIC) je 3072 — v poriadku.

### 4.7 `work_items.status_category` zrkadlí `status` 1:1

Zdroj ich mal oddelené, pretože `status` bol per-projekt konfigurovateľný workflow engine (mimo
rozsahu) a `status_category` bol kanonický kôš. Slovník je teraz jeden (`backlog | in_progress |
waiting | done`), takže `status_category` je grupovací kľúč boardu a API ho drží v synchrone so
`status`. Stĺpec sa zachováva podľa otázky 23.

### 4.8 Mazanie používateľa kaskáduje

`app_users` DELETE kaskáduje na `app_sessions`, `work_item_comments`, `worklogs`,
`notifications`, `user_preferences`, `user_view_preferences`, a nuluje
`work_items.assignee_id` / `reporter_id` a `checkpoints.owner_id` / `approver_id`.
**Preferovaný postup je `active = 0`, nie DELETE.** `audit_log.user_id`,
`checkpoint_decisions.decided_by` a `created_by` / `updated_by` FK **nemajú** — história musí
prežiť zmazanie účtu.

### 4.9 `plan_versions` nemá vazbu na checkpoint

Otázka 37(a) hovorí, že po rozhodnutí vzniká baseline snapshot. Zadaný zoznam stĺpcov väzbu
neobsahuje, takže zdroj snapshotu (`checkpoint_id`, rozhodnutie) nesie `snapshot_json`.
Ak bude treba filtrovať baseline podľa checkpointu, je to `0003` + index.

---

## 5. Konvencie, ktoré test stráži

`db/migrations/migrations.test.ts` (24 testov, staticky, bez DB) overuje:

- v `db/migrations` sú presne `0001_init.sql` + `0002_domain.sql`, čitateľné a neprázdne
- len príkazy `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX` / `INSERT`
- **6 tabuliek v `0001`, 13 v `0002`, 19 celkom**, každá deklarovaná raz, `_migrations` nikde
- každá `CREATE TABLE` končí `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
- každá tabuľka má `PRIMARY KEY`; stĺpec `id` je `CHAR(36)` alebo `BIGINT AUTO_INCREMENT`
- každá nelogová tabuľka má `created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`
- názvy: `ix_*` indexy, `uq_*` unikáty, `fk_*` FK constrainty
- žiadny DB `ENUM(`
- slovo s názvom zdrojovej appky sa nevyskytuje **ani v komentári** (test si ho skladá za behu,
  aby ho sám nezaniesol do repa)
- žiadny `deleted_at` a žiadny z 22 zahodených stĺpcov
- `version` **presne** na `checkpoints`, `sprints`, `work_items`
- žiadna tabuľka `areas`; `projects.area` je `VARCHAR(80)`
- `work_item_dependencies` má PK `(source_id, target_id)` — bez `dependency_type`
- `work_items.parent_id` je self-FK, `checkpoint_decisions.superseded_by` existuje
- FK odkazuje len na tabuľku vytvorenú **skôr** (alebo na seba) — poradie v súbore je platné
- vedúci stĺpec každého FK má index; každý FK má explicitné `ON DELETE`

Parser v teste kopíruje `scripts/migrate.ts` (strip komentárov → split na `;`), takže test vidí
presne to, čo runner vykoná.

**Pozor:** `vitest.config.ts` (vlastní A1) globuje len `src/**/*.test.ts`, takže `npm test` tento
test **nespustí**. Treba doplniť `"db/**/*.test.ts"` do `test.include`.

---

## 6. Overenie na reálnej MariaDB 11.4

Statický test nedokáže zachytiť syntaktickú chybu ani nekompatibilný FK. Preto som schému
navyše aplikoval na **jednorazový kontajner `mariadb:11.4`** (vytvorený a po overení zmazaný,
žiadny existujúci kontajner sa nedotkol). Vstupom nebol surový `.sql`, ale **výstup splittera
z `scripts/migrate.ts`** — takže sa overila aj tá vrstva.

| Kontrola | Výsledok |
|---|---|
| 19 príkazov, 19 vytvorených tabuliek | OK |
| všetky `InnoDB`, všetky `utf8mb4` collation | 0 výnimiek |
| FK skutočne vzniknuté v `information_schema` | **25** |
| stĺpec `version` | presne **3** tabuľky |
| stĺpec `deleted_at` | **0** |
| druhý beh migrácie (idempotencia) | stále 19 tabuliek, bez chyby |
| INSERT do všetkých 19 tabuliek (roly, používatelia, projekt, checkpoint, podmienka, 2 rozhodnutia, šprint, úloha + podúloha, závislosť, komentár, worklog, notifikácia, preferencie, baseline) | OK |
| `UPDATE checkpoint_decisions SET superseded_by` (self-FK) | OK, chain `cd-1 → cd-2` |
| `DELETE FROM projects` → kaskáda | vyčistilo checkpoints, requirements, decisions, sprints, work_items (obe úrovne), comments, dependencies, worklogs — **bez FK chyby** |
| `DELETE FROM app_users` → kaskáda | vyčistilo notifications a obe preferenčné tabuľky, `plan_versions.created_by` prežil (bez FK, podľa dizajnu) |
| FK sa naozaj vynucuje | `ERROR 1452` na neexistujúci `project_id` |
| `uq_projects_code` | `ERROR 1062` na duplicitný `code` |
| rezervované slovo `` `key` `` v `app_config` | INSERT aj SELECT OK |

**Poznámka k obave o viacnásobné kaskádové cesty:** `work_items` má FK na `projects` (CASCADE),
`sprints` (SET NULL), `checkpoints` (SET NULL) aj na seba (CASCADE), a `worklogs` sú dosiahnuteľné
z `projects` dvomi cestami. InnoDB to zvládol bez chyby — overené, nie predpokladané.

---

## 7. Poradie a spúšťanie

```
db/migrations/0001_init.sql     app_roles → app_users → app_sessions → auth_attempts → audit_log → app_config
db/migrations/0002_domain.sql   projects → checkpoints → checkpoint_requirements → checkpoint_decisions →
                                sprints → work_items → work_item_comments → work_item_dependencies →
                                worklogs → plan_versions → notifications → user_preferences →
                                user_view_preferences
```

`npm run db:migrate` (v Dockeri `docker compose --env-file .env --profile tools run --rm migrator
npm run db:migrate`). Bez `--env-file` nabootuje MariaDB s prázdnou DB.

Referenčné dáta (3 builtin roly + prvý admin z `ADMIN_EMAIL` / `ADMIN_PASSWORD`) **nie sú**
v migráciách — rodina ich upsertuje v `scripts/seed.ts` podľa prirodzeného kľúča
(`app_roles.name`, `app_users.email`). Migrácie neobsahujú ani jeden `INSERT`.
