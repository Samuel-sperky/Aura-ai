export const meta = {
  name: 'aura-verify',
  description: 'Full verification gate for Aura Roadmap: static checks, live Docker smoke, e2e + axe, contract compliance',
  whenToUse:
    'Before any commit that touches src/, db/ or scripts/, and always before a push. Replaces running tsc/lint/vitest/build/e2e by hand and adds the contract-compliance greps that hand-running always skips.',
  phases: [
    { title: 'Statická brána' },
    { title: 'Živá brána' },
    { title: 'Súlad s kontraktom' },
    { title: 'Verdikt', model: 'high effort' },
  ],
}

// ---------------------------------------------------------------------------
// aura-verify — the gate that actually caught things
//
// History: the eleven-agent build sprint reported "done" on every agent. This
// gate found eleven defects, four of them blocking (a seed that never completed
// and hung its process for six hours, a backup script that would not parse, a
// rate limit that allowed ~4 dashboard loads per minute for the whole team, and
// a page that panned sideways on mobile). None of that showed up in an agent
// report. Hence: measure, do not trust.
//
// Usage:
//   Workflow({ name: 'aura-verify' })
//   Workflow({ name: 'aura-verify', args: { skipE2e: true } })   // static only
//
// Prerequisites for the live phase: Docker running, .env present with
// ADMIN_EMAIL / ADMIN_PASSWORD, and `npx playwright install chromium` done once.
// ---------------------------------------------------------------------------

const ROOT = 'C:\\Aura\\aura-roadmap'
const opts = args && typeof args === 'object' ? args : {}
const skipE2e = opts.skipE2e === true

const RESULT = {
  type: 'object',
  additionalProperties: false,
  required: ['phase', 'passed', 'details', 'failures', 'fixed'],
  properties: {
    phase: { type: 'string' },
    passed: { type: 'boolean' },
    details: { type: 'string', description: 'Exact commands and their numeric results' },
    failures: { type: 'array', items: { type: 'string' } },
    fixed: { type: 'array', items: { type: 'string' }, description: 'What was repaired, if anything' },
  },
}

const ENV = `
Projekt: **${ROOT}**. Windows, PowerShell, \`npm.cmd\` / \`npx.cmd\` (nie \`npm\`/\`npx\`).
Appka beží v Dockeri na http://localhost:3040. **Nespúšťaj žiadne git príkazy.**

Heslo z \`.env\` načítaj do premenných prostredia a **nikdy ho nevypisuj**:
\`\`\`powershell
$e=@{}; Get-Content .env | ForEach-Object { if ($_ -match '^\\s*([A-Z_]+)=(.*)$') { $e[$Matches[1]]=$Matches[2] } }
$env:E2E_EMAIL=$e['ADMIN_EMAIL']; $env:E2E_PASSWORD=$e['ADMIN_PASSWORD']
\`\`\`

Referenčné hodnoty poslednej zelenej brány — odchýlku nahlás:
tsc čistý · lint **0 chýb** · **535+** unit testov v 22+ súboroch · next build prejde ·
**47/47** Playwright e2e · \`globals.css\` pod 700 riadkov.
`

phase('Statická brána')

const staticGate = await agent(`${ENV}

# Statická brána

Spusti v tomto poradí a **oprav, kým nie je zelené**. Max 3 pokusy o tú istú chybu,
potom ju nahlás a nepokračuj v cykle.

\`\`\`
npx.cmd tsc --noEmit
npm.cmd run lint
npx.cmd vitest run
npx.cmd next build
\`\`\`

\`next build\` môže potrebovať \`$env:SKIP_ENV_VALIDATION="1"\`.

V \`details\` uveď presné čísla: počet testov a testovacích súborov, počet lint chýb
a upozornení, či build prešiel. V \`fixed\` čo si opravil.

Pozor na pascu: \`vitest --reporter=basic\` v vitest 4 neexistuje, použi default reporter.
`, { label: 'static', phase: 'Statická brána', schema: RESULT })

phase('Živá brána')

const liveGate = skipE2e
  ? (log('Živá brána preskočená (skipE2e)'), null)
  : await agent(`${ENV}

# Živá brána

1. Rebuild a štart:
\`\`\`
docker compose --env-file .env up -d --build app
\`\`\`
\`--env-file .env\` je **povinný** — bez neho sa \`\${...}\` vyhodnotia na prázdno
a MariaDB nabootuje s prázdnou databázou. Nie je to chyba, je to tichá strata konfigurácie.

2. Počkaj ~15 s, potom \`/api/health\` musí dať \`{"ok":true,"db":true}\`.

3. Migrácie a seed (seed je idempotentný, druhý beh nesmie pridať nič):
\`\`\`
docker compose --env-file .env --profile tools run --rm migrator npm run db:migrate
docker compose --env-file .env --profile tools run --rm migrator npm run db:seed
\`\`\`
Ak seed pridá riadky pri druhom behu, **idempotencia je rozbitá** — to je nález.

4. E2E vrátane axe (session sa berie z \`e2e/auth.setup.ts\` cez \`storageState\`):
\`\`\`
npx.cmd playwright test
\`\`\`
Cieľ **47/47**. Pri páde rozhodni, či je chybný test alebo appka, a oprav správnu stranu.
Dve zdokumentované pasce: Playwright matchuje \`name\` ako **podstring** (treba
\`exact: true\`), a nikdy nelokalizuj prvok atribútom, ktorý testuješ
(\`button[aria-expanded="false"]\` po rozbalení prestane matchovať).

5. Observabilita: \`docker logs aura-roadmap-app --tail 50\`. Majú tam byť \`[api]\`
riadky pre neúspešné požiadavky. Prázdny log po e2e behu je nález — znamená to,
že sa vrátil stav, kde bol rate-limit neviditeľný.

V \`details\` uveď stav health, počty riadkov seedu, výsledok e2e a či log obsahuje \`[api]\`.
`, { label: 'live', phase: 'Živá brána', schema: RESULT })

phase('Súlad s kontraktom')

const compliance = await agent(`${ENV}

# Súlad s kontraktom

Kontrakt: \`${ROOT}\\KONTRAKT-AURA-ROADMAP-2026-07-28.md\`. Over grepom, **neopravuj
schému** — porušenie schémy nahlás, nemeň.

1. Slová \`northstar\`, \`cloudflare\`, \`wrangler\`, \`D1Database\`, \`R2Bucket\`, \`drizzle\`
   sa nesmú vyskytovať v \`src\`, \`db\`, \`scripts\`, \`package.json\`, compose ani Dockerfile.
   **Legitímne výnimky:** testy, ktoré ich absenciu overujú, a komentáre vysvetľujúce,
   čo bolo nahradené. Rozlíš to — falošný poplach je horší než žiadny.
2. Žiadny \`deleted_at\` (soft delete kontrakt ruší).
3. \`version\` presne na 3 tabuľkách: \`checkpoints\`, \`sprints\`, \`work_items\`.
4. Žiadny \`program\`, \`portfolio\`, \`budget\`, \`spent\`, \`priority_score\`, \`value_score\`.
5. Zakázané tabuľky neexistujú: \`tasks\`, \`teams\`, \`user_team_memberships\`, \`timesheets\`,
   \`timesheet_entries\`, \`attachments\`, \`email_outbox\`, \`workflows\`, \`workflow_statuses\`,
   \`workflow_transitions\`, \`custom_fields\`, \`work_item_custom_values\`,
   \`dashboard_layouts\`, \`dashboard_widgets\`, \`dashboard_layout_versions\`,
   \`team_view_presets\`, \`checkpoint_templates\`, \`checkpoint_sprints\`,
   \`sprint_allocations\`, \`work_item_watchers\`.
6. **Každý** \`src/app/api/**/route.ts\` používa \`defineRoute\` s \`auth\`. Public smie byť
   len \`/api/health\` a \`/api/auth/login\`. Handler bez auth = kritický nález.
7. Žiadny dev-fallback secret: grep \`change_me\`, \`admin123\`, \`dev_session_secret\`,
   \`"aura"\` ako fallback hesla.
8. CSS: žiadny raw hex ani \`rgba(\` mimo \`:root\` a \`:root[data-theme]\` blokov
   v \`globals.css\`; súbor pod 700 riadkov; \`--muted\` je presne \`#566964\` v light téme
   (a11y minimum, nesmie sa zosvetliť); zlatá ako TEXT vždy \`--gold-text\`, nikdy
   \`--brand-gold\` (kontrast 1,9:1).
9. Navigácia má presne 6 položiek. Žiadne \`/kpi\`, \`/capacity\`, \`/structure\`,
   žiadny catch-all \`/[view]\`.
10. \`.env\` je v \`.gitignore\`; \`.env.example\` obsahuje len placeholdery.

V \`details\` vypíš pre každý bod výsledok. V \`failures\` len skutočné porušenia.
`, { label: 'compliance', phase: 'Súlad s kontraktom', schema: RESULT })

phase('Verdikt')

const phases = [staticGate, liveGate, compliance].filter(Boolean)
const allFailures = phases.flatMap((p) => (p.failures || []).map((f) => `[${p.phase}] ${f}`))
const allPassed = phases.every((p) => p.passed)

const verdict = await agent(`
# Verdikt brány

Tri fázy skončili takto:

${phases.map((p) => `## ${p.phase} — ${p.passed ? 'PREŠLA' : 'PADLA'}\n${p.details}\n${(p.fixed || []).length ? 'Opravené: ' + p.fixed.join('; ') : ''}`).join('\n\n')}

${allFailures.length ? '## Nálezy\n' + allFailures.map((f) => '- ' + f).join('\n') : '## Nálezy\n(žiadne)'}

Napíš krátky verdikt pre používateľa (slovensky, max 12 riadkov): je appka pripravená
na commit a push? Ak nie, čo presne to blokuje a v akom poradí to riešiť. Nevymýšľaj si
čísla — používaj len tie z fáz vyššie. \`passed\` nastav na ${allPassed} a nemeň to.
`, { label: 'verdict', phase: 'Verdikt', schema: RESULT, effort: 'high' })

return {
  passed: allPassed,
  failures: allFailures,
  verdict: verdict ? verdict.details : null,
  phases: { static: staticGate, live: liveGate, compliance },
}
