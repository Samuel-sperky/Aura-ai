export const meta = {
  name: 'aura-family-accent-unify',
  description: 'Resolve the teal-vs-gold accent split across the aura-app family: establish what is actually deployed, then converge on one accent',
  whenToUse:
    'When the owner decides to settle the family accent. DEFERRED by decision (question #63: "teal teraz + samostatná úloha na zjednotenie rodiny"). Touches sperky-ai, which is in production — this workflow investigates and proposes before it changes anything.',
  phases: [
    { title: 'Zistiť skutočnosť' },
    { title: 'Rozhodnutie' },
    { title: 'Aplikácia' },
    { title: 'Brána', model: 'high effort' },
  ],
}

// ---------------------------------------------------------------------------
// aura-family-accent-unify
//
// THE PROBLEM (found by recon 2026-07-28, never resolved):
//   * vanilla branch (aura-hr-mapa → aura-logistika → aura-kpi →
//     aura-banner-studio) and sperky-ai@main:  --accent = TEAL #03797e
//   * branch `redesign` (aura-redesign worktree): --accent = GOLD #b88a3a,
//     with teal demoted to --chart-accent
//   * Hades claims the redesign was deployed to live on 2026-07-21
//   * git says `redesign` is NOT an ancestor of `main`
//
// Those two claims cannot both be true, and every token decision downstream
// depends on which one is. So phase 1 does not touch a single file: it establishes
// what is actually running. Guessing here would repaint five applications wrong.
//
// aura-roadmap was deliberately built on teal to match the majority, so whatever
// this workflow concludes, Roadmap either stays as-is or is repainted with the rest.
//
// Usage: Workflow({ name: 'aura-family-accent-unify' })
// ---------------------------------------------------------------------------

const AURA = 'C:\\Aura'

const FINDING = {
  type: 'object',
  additionalProperties: false,
  required: ['agent', 'status', 'summary', 'evidence', 'issues', 'nextAgentNotes'],
  properties: {
    agent: { type: 'string' },
    status: { type: 'string', enum: ['done', 'partial', 'blocked'] },
    summary: { type: 'string' },
    evidence: {
      type: 'array',
      items: { type: 'string' },
      description: 'Concrete proof: command output, file path + line, commit hash. Not inference.',
    },
    issues: { type: 'array', items: { type: 'string' } },
    nextAgentNotes: { type: 'string' },
  },
}

const CONTEXT = `
# Zjednotenie akcentu v aura-app family

**Nespúšťaj git príkazy, ktoré menia stav** (\`commit\`, \`merge\`, \`checkout\`, \`reset\`,
\`push\`). Čítanie (\`log\`, \`diff\`, \`branch\`, \`merge-base\`, \`show\`) je v poriadku.
Neinštaluj balíky. Žiadne secrety do reportu.

## Rodina — čo naozaj je
\`${AURA}\` **nie je 9 apiek, ale 5**. \`ads-hierarchy\`, \`aura-redesign\`,
\`aura-prototype\` a \`mindmap-orient\` sú **git worktree jedného repa** \`aura-web\`
(= \`sperky-ai\`). Kto ich počíta ako samostatné appky, dostane 5× ten istý dizajn
a nesprávny odhad.

Vetva A (vanilla, bez buildu): \`aura-hr-mapa\` (mimo \`${AURA}\`, v
\`C:\\Users\\Ucet\\Desktop\\Šperky Aura app\\aura-hr-mapa\`), \`aura-logistika\`,
\`aura-kpi\`, \`aura-banner-studio\` — každá má vlastnú kópiu \`server/public/styles.css\`.
Vetva B (Next.js): \`sperky-ai\` + worktree branche, \`src/app/globals.css\`.
Plus \`aura-roadmap\` (Next.js, postavená na teal, plne overená).

## Tokeny — mapovanie medzi vetvami
Hodnoty sú rovnaké, líšia sa len názvy:
\`--paper\`→\`--bg\`, \`--surface\`→\`--panel\`, \`--surface-2\`→\`--panel2\`,
\`--ink-soft\`→\`--ink2\`, \`--line\`→\`--border\`, \`--ok\`→\`--success\`.

## Nemenné pravidlá, nech vyhrá ktorýkoľvek akcent
- Zlatá ako **TEXT** je vždy \`--gold-text\` (#8a6417 light / #d8b878 dark).
  \`--brand-gold\` #d8b878 je **len** koruna/logo/fill — na svetlom podklade má
  kontrast 1,9:1 a je nečitateľná.
- \`--muted\` #566964 je najsvetlejší povolený text (a11y minimum, bol zámerne
  stmavený z #5e7270). **Nezosvetľovať.**
- Mimo \`:root\` a \`[data-theme]\` blokov **žiadny raw hex ani rgba** — len
  \`color-mix(in srgb, var(--token) N%, transparent)\`.
- Semantické farby ako text: \`--success-text\` / \`--danger-text\` / \`--warn-text\`
  (fill hodnoty majú na vlastnom tinte 3,6–4,4:1, pod AA hranicou).
- Kanonická dokumentácia: \`C:\\Users\\Ucet\\Desktop\\AI-mind\\handoff\\AURA-DESIGN-HANDOFF.md\`
`

phase('Zistiť skutočnosť')
log('Fáza 1 nemení ani jeden súbor — zisťuje, čo reálne beží na live')

const facts = await parallel([
  () => agent(`${CONTEXT}

# ÚLOHA — Čo je v gite

Nič nemeň. Odpovedz **dôkazmi**, nie odvodením.

V repe \`${AURA}\\sperky-ai\`:
1. \`git branch -a\` a \`git worktree list\` — ktoré branche a worktree existujú, ktorá
   je checknutá kde.
2. Je \`redesign\` v \`main\`? \`git merge-base --is-ancestor redesign main\` (vypíš exit kód)
   a \`git log main --oneline | Select-String -Pattern redesign\`.
3. Posledný commit na \`main\` a na \`redesign\`: hash, dátum, správa.
4. \`git diff main redesign -- src/app/globals.css | Select-Object -First 80\` — aké
   token zmeny redesign reálne prináša.
5. \`git log --oneline -20 main\` — je tam niečo, čo vyzerá ako nasadenie redizajnu?

V \`evidence\` uveď doslovný výstup príkazov, nie parafrázu.
`, { label: 'git-facts', phase: 'Zistiť skutočnosť', schema: FINDING }),

  () => agent(`${CONTEXT}

# ÚLOHA — Čo reálne beží

Nič nemeň. Zisti, ktorý akcent je nasadený na live.

1. \`docker ps -a\` — ktoré aura kontajnery bežia, aké majú image a odkedy.
2. \`${AURA}\\sperky-ai\\docker-compose.prod.yml\` a \`Caddyfile\` — z ktorého buildu sa
   servuje produkcia, aká domána.
3. **Rozhodujúci dôkaz:** vytiahni nasadené CSS z bežiaceho kontajnera a zisti
   hodnotu \`--accent\`. Napríklad:
   \`docker exec sperky-ai-app-1 sh -c "grep -rho '--accent:[^;]*' .next/static/css/ | head -5"\`
   (ak cesta nesedí, nájdi ju — \`.next/standalone\` alebo \`.next/static\`).
   Ak sa to nedá, skús \`curl\` na bežiacu appku a nájdi CSS bundle.
4. \`docker image ls\` + \`docker inspect\` na image \`aura-web\` — kedy bol postavený.
   Porovnaj s dátumami commitov (dostaneš ich od paralelného agenta).
5. Zisti, či beží ngrok tunel a na aký port (\`${AURA}\\ngrok\\ngrok.yml\`,
   \`curl http://127.0.0.1:4040/api/tunnels\`).

V \`evidence\` uveď doslovný výstup. Ak sa nasadenú hodnotu \`--accent\` **nepodarí**
zistiť, povedz to jasne a napíš, čo by na to bolo treba — nehádaj.
`, { label: 'deploy-facts', phase: 'Zistiť skutočnosť', schema: FINDING }),

  () => agent(`${CONTEXT}

# ÚLOHA — Inventár akcentu vo všetkých appkách

Nič nemeň. Urob tabuľku skutočného stavu.

Pre každú z týchto ciest nájdi hlavný CSS súbor a vypíš **presné hodnoty**
\`--accent\`, \`--accent2\`, \`--gold\`, \`--brand-gold\`, \`--gold-text\` pre light aj dark:
- \`${AURA}\\sperky-ai\\src\\app\\globals.css\`
- \`${AURA}\\aura-redesign\\src\\app\\globals.css\`
- \`${AURA}\\ads-hierarchy\\src\\app\\globals.css\`
- \`${AURA}\\aura-prototype\` (nájdi CSS)
- \`${AURA}\\aura-kpi\\server\\public\\styles.css\`
- \`${AURA}\\aura-logistika\\server\\public\\styles.css\`
- \`${AURA}\\aura-banner-studio\\server\\public\\styles.css\`
- \`C:\\Users\\Ucet\\Desktop\\Šperky Aura app\\aura-hr-mapa\\server\\public\\styles.css\`
- \`${AURA}\\aura-roadmap\\src\\app\\globals.css\`

Plus: kde sa akcent používa na **interaktivitu** (CTA, linky, focus, aktívny stav)
a kde je zlatá na **brand** (koruna, aktívna nav položka). Rozpor medzi appkami vypíš.

Zisti aj, koľko riadkov má každý CSS súbor a ako veľmi sa 4 vanilla kópie
rozišli (\`Compare-Object\` alebo \`diff\`).

V \`nextAgentNotes\` dodaj tabuľku appka | akcent light | akcent dark | riadkov | vetva.
`, { label: 'inventory', phase: 'Zistiť skutočnosť', schema: FINDING }),
])

const [gitFacts, deployFacts, inventory] = facts

phase('Rozhodnutie')

const decision = await agent(`${CONTEXT}

# ÚLOHA — Rozhodovací podklad, NIE zmena kódu

Nemeň ani jeden súbor. Tvoj výstup je podklad, ktorý si prečíta vlastník.

## Zistené fakty

### Git
${gitFacts ? gitFacts.summary + '\n' + (gitFacts.evidence || []).join('\n') : '(nedostupné)'}

### Nasadenie
${deployFacts ? deployFacts.summary + '\n' + (deployFacts.evidence || []).join('\n') : '(nedostupné)'}

### Inventár
${inventory ? inventory.summary + '\n' + (inventory.nextAgentNotes || '') : '(nedostupné)'}

## Čo napísať
Vytvor \`${AURA}\\aura-roadmap\\docs\\AKCENT-ROZHODNUTIE.md\` — jediný súbor, ktorý smieš
vytvoriť. Obsah:

1. **Čo je skutočnosť** — je redizajn nasadený, alebo nie? Odpovedz jednoznačne
   a doloz dôkazom. Ak sa to nepodarilo zistiť, napíš to a povedz, čo na to treba.
2. **Tabuľka stavu** — appka | akcent | vetva | nasadené?
3. **Dve možnosti** s reálnou cenou práce každej:
   - **Teal všade**: zladí sa 4 vanilla appky + \`sperky-ai@main\` + \`aura-roadmap\`
     (6 z 7), treba prepísať len \`redesign\` branch. Riziko: ak je redizajn nasadený,
     ide o vizuálny regres na live.
   - **Zlatá všade**: zladí sa s \`redesign\`, ale treba prepísať 6 appiek vrátane
     produkčnej \`main\` a overenej \`aura-roadmap\`. Riziko: 4 vanilla appky nemajú
     žiadne testy ani git remote (\`aura-logistika\` nemá \`.git\` vôbec), takže
     regres v nich nie je detekovateľný ani vrátiteľný.
4. **Tvoje odporúčanie** s odôvodnením. Zohľadni: \`AURA-DESIGN-HANDOFF.md\` predpisuje
   teal a pravidlo „teal = interaktivita, zlatá = brand/si tu"; zlatá ako akcent
   znamená, že brand a interaktivita majú tú istú farbu, čo je informačne slabšie;
   ale ak vlastník redizajn schválil a používa, jeho preferencia váži viac než dokument.
5. **Presný plán aplikácie** pre odporúčanú možnosť: ktoré súbory, ktoré tokeny,
   v akom poradí, a ako sa každá appka overí (pozor: vanilla appky nemajú testy —
   overenie je manuálny preklik + screenshot).
6. **Čo NEMENIŤ za žiadnych okolností**: \`--gold-text\` na text, \`--muted\`,
   \`--brand-gold\` na fill, semantické \`*-text\` varianty.

Nakoniec **zastav a odovzdaj** — aplikačná fáza sa spustí len na pokyn vlastníka.
`, { label: 'decision-brief', phase: 'Rozhodnutie', schema: FINDING, effort: 'high' })

phase('Aplikácia')
log('Aplikácia sa NESPÚŠŤA automaticky — čaká na rozhodnutie vlastníka nad AKCENT-ROZHODNUTIE.md')

phase('Brána')

return {
  gitFacts,
  deployFacts,
  inventory,
  decisionBrief: decision,
  // Deliberately no application phase: repainting five apps, one of them in
  // production and four of them without tests or git history, is not a decision
  // a workflow gets to make on its own.
  applied: false,
  nextStep:
    'Prečítaj docs/AKCENT-ROZHODNUTIE.md, rozhodni teal vs zlatá, a až potom spusti aplikačný šprint.',
}
