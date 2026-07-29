export const meta = {
  name: 'aura-new-app',
  description: 'Scaffold a new aura-app family application from the verified aura-roadmap baseline, with every known pitfall pre-fixed',
  whenToUse:
    'When starting a brand-new internal Aura application. Pass args: { name, port, dbName, title }. Saves rediscovering the eleven defects the Roadmap build sprint had to find the hard way.',
  phases: [
    { title: 'Skeleton' },
    { title: 'Doména a UI' },
    { title: 'Brána', model: 'high effort' },
  ],
}

// ---------------------------------------------------------------------------
// aura-new-app
//
// WHY: the family builds new apps by copy-pasting an older one. That is a
// deliberate, documented choice (aura-kpi's BUILD-SPEC says so outright), and it
// works — but it also copies the bugs. aura-kpi and aura-logistika share ~440
// duplicated lines with a two-line delta, and their app.js has already drifted by
// 286 lines, so a fix has to be applied two or three times.
//
// aura-roadmap is the first family app that went through a real verification gate.
// It is therefore the better thing to copy: the eleven defects that gate found are
// already fixed in it. This workflow copies from it and, crucially, carries the
// KNOWN PITFALL LIST into the new app so they are not reintroduced.
//
// Usage:
//   Workflow({ name: 'aura-new-app', args: {
//     name: 'aura-sklad', port: 3050, dbName: 'aura_sklad', title: 'Aura Sklad',
//     purpose: 'Evidencia skladových zásob a pohybov'
//   }})
// ---------------------------------------------------------------------------

const BASE = 'C:\\Aura\\aura-roadmap'
const cfg = args && typeof args === 'object' ? args : {}

const NAME = typeof cfg.name === 'string' ? cfg.name : null
const PORT = Number.isInteger(cfg.port) ? cfg.port : null
const DB = typeof cfg.dbName === 'string' ? cfg.dbName : null
const TITLE = typeof cfg.title === 'string' ? cfg.title : NAME
const PURPOSE = typeof cfg.purpose === 'string' ? cfg.purpose : '(neuvedené)'

if (!NAME || !PORT || !DB) {
  log('CHYBA: chýbajú argumenty. Očakávam { name, port, dbName, title?, purpose? }.')
  log('Príklad: { name: "aura-sklad", port: 3050, dbName: "aura_sklad", title: "Aura Sklad" }')
  return {
    error: 'missing_args',
    required: ['name', 'port', 'dbName'],
    optional: ['title', 'purpose'],
    note: 'Obsadené porty rodiny: 3000 sperky-ai, 3010 northstar(archív), 3011 ads-hierarchy dev, 3020 aura-logistika, 3030 aura-kpi, 3040 aura-roadmap, 8090 aura-hr-mapa, 8091 aura-banner-studio, 8092 retouch, 8099 zapis-porady. Voľné: 3050+, 8093-8098.',
  }
}

const TARGET = `C:\\Aura\\${NAME}`

const REPORT = {
  type: 'object',
  additionalProperties: false,
  required: ['agent', 'status', 'filesTouched', 'summary', 'verification', 'issues', 'nextAgentNotes'],
  properties: {
    agent: { type: 'string' },
    status: { type: 'string', enum: ['done', 'partial', 'blocked'] },
    filesTouched: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
    verification: { type: 'string' },
    issues: { type: 'array', items: { type: 'string' } },
    nextAgentNotes: { type: 'string' },
  },
}

// The list that cost a full verification gate to discover. Every new app inherits it.
const PITFALLS = `
## Overené pasce — MUSIA byť ošetrené v novej appke

Toto nie je teória. Každá z nich reálne zlyhala v \`aura-roadmap\` a je tam opravená.
Kopíruj opravené verzie, nie naivné.

1. **Jednorazové CLI skripty musia zatvoriť DB pool.** Bez \`closePool()\` proces
   nikdy neskončí — idle spojenia držia Node event loop. Platí aj pre úspešnú cestu.
   Vzor: \`${BASE}\\scripts\\seed.ts\` (\`.then(() => closePool())\`).
2. **Seed musí byť idempotentný na prirodzenom kľúči** a bootstrap admina beží mimo
   transakcie demo dát, takže \`if (users exist) return\` z každého ďalšieho behu urobí
   tichý no-op. Idempotenciu treba **dokázať**: druhý beh = 0 nových riadkov.
3. **Migrácie sú zdroj pravdy, nie seed.** Keď sa nezhodujú, opravuje sa seed.
4. **Rate-limit sa nesmie kalibrovať ako „jedna obrazovka = jeden request".**
   Buckety sú per client IP, celý tím je za jednou NAT adresou, a jedna obrazovka
   môže ťahať 7 requestov. Hodnoty z Roadmapu: read 600, write 120, heavy 120,
   **login 10 (nikdy nezvyšovať)**.
5. **\`max-width: 100vw\` nezabráni vodorovnému pretekaniu** a \`overflow-x: clip\` na
   root elemente Chrome pri \`overflow-y: visible\` ignoruje. Neposielaj na mobil layout,
   ktorý sa tam nezmestí — pod 700 px prepni na karty.
6. **Semantické farby ako TEXT** potrebujú \`--success-text\` / \`--danger-text\` /
   \`--warn-text\`; fill hodnoty majú na vlastnom tinte 3,6–4,4:1, pod AA hranicou.
7. **Accessible names musia byť jedinečné v jednom kontexte.** Topbar aj Nastavenia
   renderujú ovládač témy a hustoty — potrebujú odlišné \`aria-label\`.
8. **\`.ps1\` s diakritikou potrebuje UTF-8 BOM**, inak PowerShell 5.1 zhodí parsovanie.
9. **E2E sa prihlasuje RAZ** cez \`auth.setup.ts\` + \`storageState\`. Prihlásenie
   v \`beforeEach\` strhne login rate-limit a pády vyzerajú ako chyby appky.
10. **Playwright matchuje \`name\` ako podstring** → \`exact: true\`. A nikdy
    nelokalizuj prvok atribútom, ktorý testuješ.
11. **\`defineRoute\` musí logovať každý výstup.** Bez toho je 429 neviditeľný a
    rate-limit problém sa javí ako chyba načítania dát.
12. **\`docker compose\` vždy s \`--env-file .env\`**, inak sa \`\${...}\` vyhodnotia na
    prázdno a MariaDB nabootuje s prázdnou DB. Tichá strata konfigurácie.
13. **Turbopack padá na junction \`node_modules\`** → \`next dev --webpack\`.
14. **DB kontajner nemapuj na host port.** Dátové overenie ide cez Docker.
`

const CONTEXT = `
# Nová appka rodiny: ${TITLE} (\`${NAME}\`)

**Účel:** ${PURPOSE}
**Cieľ:** \`${TARGET}\` · port **${PORT}** · DB **\`${DB}\`** · cookie \`${NAME.replace(/-/g, '_')}_session\`
**Kontajnery:** \`${NAME}-app\` + \`${NAME}-db\`

**Baseline na kopírovanie:** \`${BASE}\` — prvá appka rodiny, ktorá prešla reálnou
overovacou bránou. Kopíruj z nej, nie zo starších apiek: tie nesú neopravené chyby.

## Tvrdé zákazy
1. **Žiadne git príkazy.** Commituje orchestrátor.
2. **Needituj \`${BASE}\`** ani žiadnu inú existujúcu appku. Je to read-only vzor.
3. Slovo \`roadmap\` ani \`aura-roadmap\` sa v novej appke nesmie objaviť nikde
   (okrem prípadnej zmienky v README o tom, odkiaľ baseline pochádza).
4. Needituj súbory iného agenta — vlastníctvo je v úlohe.
5. Žiadne secrety do kódu ani reportu.

## Prostredie
Windows, PowerShell, \`npm.cmd\` / \`npx.cmd\`. Node v24.

${PITFALLS}
`

phase('Skeleton')

const skeleton = await agent(`${CONTEXT}

# ÚLOHA — Skeleton a infraštruktúra

Si prvý agent. Ostatní stavajú na tebe.

## Vlastníctvo
Celý \`${TARGET}\` okrem \`src/app/(app)/**\`, \`src/components/**\` domény
a \`db/migrations/0002_*\` — tie patria ďalšiemu agentovi.

## Čo skopírovať 1:1 (len prepíš názvy, port a DB)
Z \`${BASE}\`:
- \`package.json\` (name → \`${NAME}\`), \`package-lock.json\`, \`tsconfig.json\`,
  \`next.config.ts\`, \`eslint.config.mjs\`, \`vitest.config.ts\`, \`playwright.config.ts\`
- \`Dockerfile\`, \`.dockerignore\`, \`docker-compose.yml\` (port \`${PORT}:3000\`,
  kontajnery \`${NAME}-app\`/\`${NAME}-db\`, sieť \`${NAME}\`), \`docker-compose.ngrok.yml\`
- \`.env.example\` (DB_DATABASE default \`${DB}\`), \`.gitignore\`
- \`src/lib/db.ts\` (vrátane \`closePool\`), \`src/lib/env.ts\` (**fail-closed, žiadny
  dev fallback pre \`SESSION_SECRET\`**), \`src/lib/crypto.ts\`, \`src/lib/api.ts\`
- \`src/lib/api/defineRoute.ts\`, \`respond.ts\`, **\`logging.ts\`** (pasca 11)
- \`src/lib/security/*\` (csrf, headers, rateLimit s hodnotami z pasce 4, clientIp)
- \`src/lib/auth/*\` (argon2id, jose, session revalidovaná per request, rights, rbac,
  audit, bootstrap) — cookie prepíš na \`${NAME.replace(/-/g, '_')}_session\`
- \`src/lib/domain/data.ts\` (\`pageMeta\`, \`dateOrNull\` — pozor, \`dateOrNull\` číta
  lokálne kalendárne časti, nie \`toISOString()\`, kvôli posunu v +1/+2 zóne)
- \`src/lib/theme.ts\`, \`src/app/globals.css\` (tokeny vrátane \`*-text\` variantov,
  \`overflow-x: clip\` na \`.app-shell\`), \`src/app/layout.tsx\`
- \`src/components/ui/**\`, \`src/components/states/**\`, \`src/components/charts/**\`
- \`scripts/_bootstrap.ts\`, \`migrate.ts\`, \`gen-keys.ts\`, \`reset-pin.ts\`
- \`scripts/backup/*\` — **s UTF-8 BOM** (pasca 8), cesty a kontajner na \`${NAME}\`
- \`db/migrations/0001_init.sql\` (app_roles, app_users, app_sessions, auth_attempts,
  audit_log, app_config)
- \`e2e/auth.setup.ts\` (pasca 9)
- \`src/app/api/health/route.ts\`, \`src/app/api/auth/**\`, \`src/proxy.ts\`
- \`src/lib/i18n/**\` — nechaj len \`index.ts\` a \`keys.common.ts\`, doménové kľúče zmaž

## Čo NEkopírovať
Doménové moduly Roadmapu: \`projects\`, \`workItems\`, \`sprints\`, \`checkpoints\`,
\`worklogs\`, \`plans\`, \`overview\`, \`timeline\`, a ich API routy, pohľady, migrácie
\`0002_domain.sql\`, testy a i18n kľúče. Nová appka má vlastnú doménu.

## Čo prispôsobiť
- Branding v \`layout.tsx\` a \`Sidebar\` na „${TITLE}"
- \`README.md\` a \`CLAUDE.md\` napíš **nanovo** pre túto appku, ale **prenes celú
  sekciu „Overené pasce"** z \`${BASE}\\CLAUDE.md\` — to je hlavná hodnota tohto scaffoldu
- \`npm.cmd install\`

## Overenie
\`npx.cmd tsc --noEmit\` čistý · \`npm.cmd run lint\` 0 chýb · \`npx.cmd vitest run\`
zelený (infra testy z baseline musia prejsť) · \`npx.cmd next build\` prejde ·
\`docker compose --env-file .env config\` validný.
Grep, že slovo \`roadmap\` sa nikde nevyskytuje.

V \`nextAgentNotes\` vypíš exporty \`db.ts\`, \`defineRoute.ts\`, \`respond.ts\`, zoznam
dostupných UI komponentov a stav overovacích príkazov.
`, { label: 'skeleton', phase: 'Skeleton', schema: REPORT })

phase('Doména a UI')
log(`Doménová vrstva pre ${TITLE} — obsah závisí od účelu: ${PURPOSE}`)

const domain = await agent(`${CONTEXT}

## Skeleton od predchádzajúceho agenta
${skeleton && skeleton.nextAgentNotes ? skeleton.nextAgentNotes : '(nedostupné — preskúmaj src/lib sám)'}

# ÚLOHA — Doménová vrstva a prvý pohľad

## Vlastníctvo
\`${TARGET}\\db\\migrations\\0002_domain.sql\`, \`${TARGET}\\src\\lib\\domain\\**\`,
\`${TARGET}\\src\\app\\api\\**\` (okrem \`auth\` a \`health\`),
\`${TARGET}\\src\\app\\(app)\\**\`, \`${TARGET}\\src\\components\\**\` doménové,
\`${TARGET}\\src\\lib\\i18n\\keys.*.ts\` doménové

## Čo postaviť
Appka má účel: **${PURPOSE}**

Toto je scaffold, nie hotový produkt. Postav **minimálnu, ale skutočne funkčnú**
vertikálu, na ktorej sa dá stavať:

1. **\`0002_domain.sql\`** — jedna hlavná doménová tabuľka pre tento účel, v rodinných
   konvenciách: PK \`CHAR(36)\`, \`ENGINE=InnoDB DEFAULT CHARSET=utf8mb4\`,
   \`created_at DATETIME DEFAULT CURRENT_TIMESTAMP\`, \`updated_at DATETIME\`,
   \`created_by\`/\`updated_by CHAR(36)\`, indexy \`ix_<table>_<col>\`,
   **žiadny \`deleted_at\`** (hard delete + audit).
   Ak doména potrebuje optimistic concurrency, pridaj \`version INT NOT NULL DEFAULT 1\`.
2. **\`src/lib/domain/<modul>.ts\`** — dátová vrstva na raw parametrizovanom SQL,
   plus \`contracts/<modul>.ts\` so zod schémami.
3. **API** — \`GET\`/\`POST\` list+create a \`GET\`/\`PATCH\`/\`DELETE\` detail, všetko cez
   \`defineRoute\` s \`auth\` a \`rateLimit\`. \`jsonList(items, pageMeta(...))\` na zoznamy.
4. **Jeden pohľad** \`src/app/(app)/<modul>/page.tsx\` + view komponent: tabuľka
   s filtrami (stav v URL cez \`nuqs\`), detail v centrovanom modale, systémové stavy
   (\`LoadingState\`/\`EmptyState\`/\`NoResultsState\`/\`ErrorState\`).
   **Pod 700 px karty, nie tabuľka** (pasca 5) — vzor \`useIsNarrow\`
   v \`${BASE}\\src\\components\\projects\\ProjectsView.tsx\`.
5. **Navigácia** — uprav \`NAV_ITEMS\` na položky tejto appky (Prehľad · <modul> · Nastavenia).
6. **\`scripts/seed.ts\`** — fiktívne demo dáta, **idempotentné na prirodzenom kľúči**,
   s \`closePool()\` (pasce 1, 2). Žiadne reálne osobné údaje.
7. **i18n** SK + EN pre nové kľúče.

## Testy
Unit testy na čisté doménové funkcie (vitest, ko-lokované). E2E: uprav
\`e2e/smoke.spec.ts\` na túto appku — login, zoznam, filter v URL, detail modal.
Session zo \`auth.setup.ts\`, **nikdy login v \`beforeEach\`**.

## Overenie
\`tsc\` čistý, \`vitest\` zelený, \`next build\` prejde.
`, { label: 'domain', phase: 'Doména a UI', schema: REPORT })

phase('Brána')

const issues = [skeleton, domain]
  .filter(Boolean)
  .flatMap((r) => (r.issues || []).map((i) => `[${r.agent}] ${i}`))

const gate = await agent(`${CONTEXT}

# ÚLOHA — Brána novej appky

## Nálezy agentov
${issues.length ? issues.map((i) => '- ' + i).join('\n') : '(žiadne)'}

## Statická brána
Spusti v \`${TARGET}\` a oprav, kým nie je zelené (max 3 pokusy o tú istú chybu):
\`npx.cmd tsc --noEmit\` · \`npm.cmd run lint\` · \`npx.cmd vitest run\` · \`npx.cmd next build\`

## Živá brána
\`\`\`
docker compose --env-file .env up -d --build
docker compose --env-file .env --profile tools run --rm migrator npm run db:migrate
docker compose --env-file .env --profile tools run --rm migrator npm run db:seed
\`\`\`
\`http://localhost:${PORT}/api/health\` → \`{"ok":true,"db":true}\`.
**Seed spusti dvakrát** — druhý beh nesmie pridať ani jeden riadok (pasca 2).
Potom e2e (heslo z \`.env\` do env premenných, nikdy nevypisuj):
\`npx.cmd playwright install chromium\` (raz) a \`npx.cmd playwright test\`.

## Kontrola, že pasce sú ošetrené
Prejdi zoznam 14 pascí z kontextu a pre **každú** over v novej appke, či je ošetrená.
Toto je hlavná pridaná hodnota scaffoldu — ak sa niektorá vrátila, oprav ju.
Konkrétne grepy:
- \`closePool\` je v každom skripte v \`scripts/*.ts\`, ktorý otvára DB
- \`RATE_LIMITS\` má login 10, read 600, write 120, heavy 120
- \`logging.ts\` existuje a \`defineRoute\` ňou vedie každý výstup
- \`--success-text\`, \`--danger-text\`, \`--warn-text\` sú v \`globals.css\`
- \`overflow-x: clip\` je na \`.app-shell\`, nie na \`html\`
- \`.ps1\` súbory majú BOM (\`[System.Management.Automation.Language.Parser]::ParseFile\`)
- \`e2e/auth.setup.ts\` existuje, žiadny spec sa neprihlasuje v \`beforeEach\`
- žiadny \`deleted_at\`, žiadny \`change_me\`/\`admin123\`/\`dev_session_secret\`
- žiadny raw hex mimo \`:root\` blokov, \`--muted\` je \`#566964\`
- \`docker-compose.yml\` nepublikuje DB port
- slovo \`roadmap\` sa nevyskytuje

## Report
\`summary\`: je appka pripravená na ďalšiu prácu? \`verification\`: presné čísla
všetkých príkazov. \`issues\`: neopravené nálezy. \`nextAgentNotes\`: čo musí vlastník
urobiť ručne (git init, remote, \`.env\` s reálnymi secretmi cez \`npm run keys:gen\`).
`, { label: 'gate', phase: 'Brána', schema: REPORT, effort: 'high' })

return {
  app: { name: NAME, port: PORT, db: DB, path: TARGET },
  skeleton,
  domain,
  gate,
  openIssues: gate ? gate.issues : [],
}
