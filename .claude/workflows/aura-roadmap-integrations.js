export const meta = {
  name: 'aura-roadmap-integrations',
  description: 'Wire Aura Roadmap into the family: read-only roadmap_ro user, and IT project progress as an aura-kpi metric',
  whenToUse:
    'Only when the owner decides to connect Roadmap to the rest of the family. This was DEFERRED by an explicit decision (question #83: "nie v prvej verzii") — do not run it as routine follow-up work.',
  phases: [
    { title: 'Prieskum' },
    { title: 'DB prístup a adaptér' },
    { title: 'KPI strana' },
    { title: 'Brána', model: 'high effort' },
  ],
}

// ---------------------------------------------------------------------------
// aura-roadmap-integrations
//
// STATUS: DEFERRED BY DECISION. Question #83 was answered "nie v prvej verzii —
// pripraviť read-only usera roadmap_ro, nezapájať". This workflow is the prepared
// version of that work, ready to run when the owner asks. It is NOT part of the
// verified baseline.
//
// The family has exactly ONE integration pattern, and it is worth respecting:
// aura-kpi reads its neighbours read-only over SQL (src/integrations/pool.js,
// env-prefixed pools, connectionLimit 3, connectTimeout 4000 fail-fast, each
// adapter individually try/caught so an unavailable neighbour never takes the
// caller down). There is NO HTTP API-to-API precedent anywhere in C:\Aura.
//
// Usage: Workflow({ name: 'aura-roadmap-integrations' })
// ---------------------------------------------------------------------------

const ROADMAP = 'C:\\Aura\\aura-roadmap'
const KPI = 'C:\\Aura\\aura-kpi'

const REPORT = {
  type: 'object',
  additionalProperties: false,
  required: ['agent', 'status', 'filesTouched', 'summary', 'issues', 'nextAgentNotes'],
  properties: {
    agent: { type: 'string' },
    status: { type: 'string', enum: ['done', 'partial', 'blocked'] },
    filesTouched: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
    issues: { type: 'array', items: { type: 'string' } },
    nextAgentNotes: { type: 'string' },
  },
}

const CONTEXT = `
# Integrácia Aura Roadmap do rodiny

Roadmap: **${ROADMAP}** (Next 16 + MariaDB, overená appka, port 3040, DB \`aura_roadmap\`).
KPI appka: **${KPI}** (Node + Express + vanilla SPA, port 3030, DB \`aura_kpi\`).

**Nespúšťaj git príkazy.** Neinštaluj balíky. Žiadne secrety do kódu ani reportu.
Windows, \`npm.cmd\` / \`npx.cmd\`.

## Rodinný vzor integrácie — jediný, ktorý existuje
\`${KPI}\\server\\src\\integrations\\\` (4 súbory, ~330 LOC):
- \`pool.js\` — read-only \`mysql2\` pooly riadené env prefixom
  (\`\${PREFIX}_DB_{HOST,PORT,USER,PASSWORD,NAME}\`), \`connectionLimit: 3\`,
  \`connectTimeout: 4000\` fail-fast
- \`logistika.js\`, \`seo.js\` — adaptéry, každý číta konkrétne stĺpce susedovej DB
- \`index.js\` — \`pullMonth(year, month, sources)\`, **každý adaptér individuálne
  try/catch**, takže nedostupný sused nikdy nezhodí volajúceho
- \`routes/integrations.js\` — admin-only HTTP povrch

**Žiadne HTTP API-to-API volania medzi appkami v rodine neexistujú.** Jediný kanál je
priame SQL do susednej MariaDB cez read-only usera. Drž sa toho.

## Pasca, ktorú treba obísť
\`aura-kpi\` si **hardcoduje názvy stĺpcov** susedných DB (\`shipments.sent\`,
\`claims.opened_on\`), a \`aura-logistika\` nemá git repo vôbec — takže rename tam rozbije
KPI bez histórie na diff. **Nezopakuj to:** Roadmap musí pre KPI exponovať stabilný
kontrakt (view alebo pomenovaná sada stĺpcov zdokumentovaná v README), nie surové tabuľky.
`

phase('Prieskum')

const recon = await agent(`${CONTEXT}

# ÚLOHA — Prieskum pred zmenou

Nič nemeň, len čítaj a reportuj.

1. Prečítaj \`${KPI}\\server\\src\\integrations\\*\` a \`${KPI}\\server\\src\\routes\\integrations.js\`.
   Presne opíš: ako sa registruje nový integration source, aký tvar má
   \`integration_values\`, ako sa volá \`compute.recomputePeriod\`, a čo robí admin route.
2. Prečítaj \`${KPI}\\README.md\` sekciu o read-only useroch (\`kpi_ro\`) a vypíš presné
   \`CREATE USER\` / \`GRANT\` príkazy, ktoré tam sú.
3. V \`${ROADMAP}\` zisti, ktoré tabuľky a stĺpce by KPI potreboval na metriku
   „plnenie IT projektov": pozri \`db/migrations/0002_domain.sql\` (\`projects\`,
   \`work_items\`, \`sprints\`) a \`src/lib/domain/projects.ts\`
   (funkcia \`recomputeProjectProgress\` — \`progress\` je počítaný z story pointov).
4. Zisti, či \`aura-kpi\` a \`aura-roadmap\` môžu na seba vidieť v Dockeri: prečítaj
   \`${ROADMAP}\\docker-compose.yml\` (má **zakomentovanú** sekciu \`external\` sietí)
   a \`${KPI}\\docker-compose.yml\` (má \`external: true\` siete). Vypíš presné názvy sietí.
5. Navrhni **stabilný kontrakt**, ktorý Roadmap exponuje pre KPI — konkrétne názvy
   a stĺpce. Odôvodni, prečo je to odolné voči zmenám schémy Roadmapu.

V \`nextAgentNotes\` vypíš všetko, čo ďalší dva agenti potrebujú doslovne: názvy sietí,
env prefix, ktorý použiješ, tvar \`integration_values\`, a navrhnutý kontrakt.
`, { label: 'recon', phase: 'Prieskum', schema: REPORT })

const HANDOFF = `\n## Prieskum\n${recon && recon.nextAgentNotes ? recon.nextAgentNotes : '(nedostupné — preskúmaj sám)'}\n`

phase('DB prístup a adaptér')

const w2 = await parallel([
  () => agent(`${CONTEXT}${HANDOFF}

# ÚLOHA — Roadmap strana: read-only prístup a stabilný kontrakt

## Vlastníctvo
\`${ROADMAP}\\db\\migrations\\0003_integration_contract.sql\`,
\`${ROADMAP}\\docs\\INTEGRACIE.md\`, \`${ROADMAP}\\docker-compose.yml\`,
\`${ROADMAP}\\scripts\\create-ro-user.sql\`

## Čo urobiť
1. **Migrácia \`0003_integration_contract.sql\`** — vytvor SQL **view**, ktorý je tým
   stabilným kontraktom pre susedov (napr. \`v_project_progress\`): id, code, name, area,
   status, health, progress, start_date, end_date, priority, updated_at, plus agregáty
   story pointov (celkom / dokončené). View izoluje susedov od zmien tabuliek — to je
   celý zmysel. \`CREATE OR REPLACE VIEW\`, idempotentné.
   **Nemeň existujúce tabuľky.** Len pridaj view.
2. **\`scripts/create-ro-user.sql\`** — \`CREATE USER IF NOT EXISTS 'roadmap_ro'@'%'\`
   + \`GRANT SELECT\` **len na to view**, nie na tabuľky. Heslo ako placeholder
   \`'<nastav-heslo>'\` — nikdy skutočné. Do súboru komentár, že sa spúšťa ručne
   adminom a heslo patrí do \`.env\` suseda.
3. **\`docker-compose.yml\`** — odkomentuj sekciu \`external\` sietí tak, aby
   \`aura-roadmap-db\` bol dosiahnuteľný z \`aura-kpi\` siete. Presné názvy sietí máš
   z prieskumu. **Nepublikuj DB port na host** — to je zdokumentované pravidlo rodiny.
4. **\`docs/INTEGRACIE.md\`** — dokumentuj: čo view obsahuje, aké granty treba,
   ako sa siete prepájajú, a **výslovne**: kto zmení view, zmení kontrakt pre susedov,
   takže stĺpce sa len pridávajú, nikdy nepremenúvajú ani nemažú.

## Overenie
\`npx.cmd tsc --noEmit\` čistý. Migráciu over spustením v Dockeri:
\`docker compose --env-file .env --profile tools run --rm migrator npm run db:migrate\`
a potom \`SELECT * FROM v_project_progress LIMIT 3\` cez
\`docker exec aura-roadmap-db mariadb ...\` (heslo z \`.env\`, nevypisuj ho).
Migračný test \`db/migrations/migrations.test.ts\` musí naďalej prechádzať —
ak kontroluje počet \`CREATE TABLE\`, view ho nesmie rozbiť; ak áno, uprav test.
`, { label: 'roadmap-side', phase: 'DB prístup a adaptér', schema: REPORT }),

  () => agent(`${CONTEXT}${HANDOFF}

# ÚLOHA — KPI strana: adaptér na Roadmap

## Vlastníctvo
\`${KPI}\\server\\src\\integrations\\roadmap.js\`, a **iba pridanie** do
\`${KPI}\\server\\src\\integrations\\index.js\` a \`${KPI}\\.env.example\`

⚠ **Toto je iná appka a je v prevádzke.** Nepíš do ničoho iného. Nemeň existujúce
adaptéry, nemeň \`pool.js\`, nemeň schému KPI. Ak by tvoja zmena vyžadovala migráciu
v KPI, **nerob ju** — napíš to do \`issues\` a skonči na \`partial\`.

## Čo urobiť
1. **\`integrations/roadmap.js\`** presne podľa vzoru \`logistika.js\` a \`seo.js\`:
   \`PREFIX = "ROADMAP"\`, číta view \`v_project_progress\` z \`aura_roadmap\`.
   Vráť metriku „plnenie IT projektov" za daný mesiac — presnú definíciu navrhni
   a **zdôvodni v \`summary\`** (napr. vážený priemer \`progress\` aktívnych projektov,
   alebo podiel projektov v pásme zelená). Drž sa metodiky KPI appky:
   plnenie = pomer capnutý na 100 %.
2. **\`integrations/index.js\`** — pridaj \`roadmap\` do \`pullMonth\` sources.
   **Zachovaj individuálny try/catch** — nedostupný Roadmap nesmie zhodiť pull.
3. **\`.env.example\`** — pridaj \`ROADMAP_DB_HOST/PORT/USER/PASSWORD/NAME\`
   s placeholdermi. Nikdy skutočné hodnoty.

## Overenie
\`node --check\` na každom zmenenom súbore (KPI je CommonJS bez TS).
Ak má KPI testy, spusti ich. Ak nie, napíš do \`issues\`, že adaptér nie je pokrytý
testom a prečo (rodinná vetva A má 0 testov — to je známy fakt, nie tvoja chyba).
`, { label: 'kpi-side', phase: 'KPI strana', schema: REPORT }),
])

const [roadmapSide, kpiSide] = w2

phase('Brána')

const issues = [recon, roadmapSide, kpiSide]
  .filter(Boolean)
  .flatMap((r) => (r.issues || []).map((i) => `[${r.agent}] ${i}`))

const gate = await agent(`
# Brána — integrácia Roadmap ↔ KPI

Prever obe strany. **Roadmap (${ROADMAP}) musí zostať plne zelený** — bol overený
pred touto zmenou (tsc čistý, lint 0 chýb, 535+ testov, 47/47 e2e).

## Nálezy agentov
${issues.length ? issues.map((i) => '- ' + i).join('\n') : '(žiadne)'}

## Čo overiť
1. Roadmap: \`npx.cmd tsc --noEmit\`, \`npm.cmd run lint\`, \`npx.cmd vitest run\`.
   Migrácie prejdú a \`v_project_progress\` vracia riadky.
2. **Bezpečnosť prístupu:** \`roadmap_ro\` má \`GRANT SELECT\` **len na view**, nie na
   tabuľky. Žiadne \`INSERT/UPDATE/DELETE\`. DB port nie je publikovaný na host.
   V žiadnom súbore nie je skutočné heslo — grep \`.env.example\` a SQL skripty.
3. KPI: \`node --check\` na zmenených súboroch; adaptér má individuálny try/catch;
   \`pullMonth\` bez dostupného Roadmapu nespadne (over čítaním kódu, nie spustením
   proti vypnutej DB, ak to nie je bezpečné).
4. **Kontrakt je stabilný:** KPI čita view, nie tabuľky. Ak niekde číta tabuľku
   priamo, je to nález — presne túto pascu mala integrácia obísť.
5. \`docs/INTEGRACIE.md\` existuje a je pravdivý.

## Report
\`summary\`: je integrácia bezpečná a zapojiteľná? \`issues\`: každý neopravený nález
s cestou a závažnosťou. \`nextAgentNotes\`: čo musí admin urobiť **ručne**
(vytvorenie usera s heslom, prepojenie sietí, nastavenie \`.env\` v KPI).
`, { label: 'gate', phase: 'Brána', schema: REPORT, effort: 'high' })

return { recon, roadmapSide, kpiSide, gate, openIssues: gate ? gate.issues : [] }
