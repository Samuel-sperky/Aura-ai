# Handoff — Aura Roadmap

**Dátum:** 2026-07-29
**Branch:** `feat/aura-family-port` (9 commitov, bez remote)
**Kontrakt:** `KONTRAKT-AURA-ROADMAP-2026-07-28.md` — sekcia 11 „Výsledok" má finálny stav
**Stav:** hotové a overené; appka beží v Dockeri na `http://localhost:3040`

Tento dokument nahradil pôvodnú verziu od A10, ktorá mala overenie ešte len „čakám na
spustenie" a tvrdila, že seed je idempotentný — nebol, a ani nedobehol.

## Ako to rozbehať

```bash
docker compose --env-file .env up -d --build
```

`--env-file .env` je **povinný**. Bez neho sa `${...}` v compose vyhodnotia na prázdno
a MariaDB nabootuje s prázdnou databázou aj bez užívateľa — tichá strata konfigurácie,
nie chyba.

```bash
docker compose --env-file .env --profile tools run --rm migrator npm run db:migrate
```

```bash
docker compose --env-file .env --profile tools run --rm migrator npm run db:seed
```

Seed je idempotentný — opakované spustenie nepridá nič. Heslá dvoch demo účtov vypíše
na stdout; heslo admina je v `.env` (`ADMIN_PASSWORD`).

## Overovacia brána

Všetko zelené k 2026-07-29:

| Kontrola | Príkaz | Výsledok |
|---|---|---|
| Typy | `npx.cmd tsc --noEmit` | čistý |
| Lint | `npm.cmd run lint` | 0 chýb, 23 upozornení |
| Unit | `npx.cmd vitest run` | 535 / 535 |
| Build | `npx.cmd next build` | prejde |
| E2E + axe | `npm.cmd run test:e2e` | 47 / 47 |
| Health | `curl localhost:3040/api/health` | `{"ok":true,"db":true}` |

E2E potrebuje `E2E_EMAIL` a `E2E_PASSWORD` (rovnaké hodnoty ako `ADMIN_*` v `.env`) a
jednorazovo `npx.cmd playwright install chromium`. Bez hesla sa specy preskočia, nespadnú.

Screenshoty: `test-results/screenshots/` — 21 kusov, dark + light na 1440 px a dark na
390 px.

## Čo bolo počas overovania opravené

Reporty agentov tvrdili „done"; reálne overenie našlo 11 defektov. Detail a odôvodnenie
každého je v `CLAUDE.md` → „Overené pasce", tu len zoznam:

| # | Defekt | Kde |
|---|---|---|
| 1 | Seed písaný proti vymysleným stĺpcom — nikdy nedobehol | `scripts/seed.ts` |
| 2 | Seed nezatváral pool → proces visel 6 hodín, aj pri úspechu | `scripts/seed.ts`, `src/lib/db.ts` |
| 3 | Seed nebol idempotentný — tichý no-op + duplikované riadky | `scripts/seed.ts` |
| 4 | Chýbalo 15 podmienok checkpointov a rozhodnutie | `scripts/seed.ts` |
| 5 | axe `color-contrast` serious na `.pill-danger` / `.badge-danger` | `src/app/globals.css` |
| 6 | Rate-limit dovolil ~4 zobrazenia Prehľadu za minútu na celý tím | `src/lib/security/rateLimit.ts` |
| 7 | `/timeline` nezapisoval default do URL, hoci to komentár tvrdil | `TimelineWorkspace.tsx` |
| 8 | Duplicitné accessible names (téma, hustota, „Zavrieť") | `ThemeControls.tsx`, `Modal.tsx`, `Drawer.tsx` |
| 9 | Projekty na 390 px panovali stránku o 424 px | `ProjectsView.tsx`, `globals.css` |
| 10 | Zálohovací skript sa neparsoval — chýbal UTF-8 BOM | `scripts/backup/*.ps1` |
| 11 | E2E si samo trhalo login rate-limit (6 falošných pádov) | `e2e/auth.setup.ts` |

## Čo ostáva

**Blokované prostredím:**
- GitHub remote a push. `gh` nie je nainštalované. Príkazy: `gh repo create DeliPistacna/aura-roadmap --private --source=. --push` alebo ručne `git remote add origin <url>` + `git push -u origin feat/aura-family-port`.

**Kandidáti na ďalší sprint (v poradí hodnoty):**
1. **Zlúčiť 7 requestov Prehľadu do jedného agregačného endpointu.** Toto bol dôvod,
   prečo bolo treba zvýšiť rate-limit; opravou zmizne aj tá príčina.
2. **Observabilita.** Appka nelogguje chyby route handlerov — `docker logs` mal počas
   celej diagnostiky 4 riadky, takže padajúci endpoint sa musel hľadať meraním
   z prehliadača. `defineRoute` by mal chyby logovať.
3. **23 lint upozornení** `react-hooks/set-state-in-effect` — kaskádové rendery,
   riešiteľné `useSyncExternalStore` (vzor už je v `ThemeControls.tsx` a `ProjectsView.tsx`).
4. Integrácie s rodinou — read-only user `roadmap_ro`, pripravené a nezapojené.
5. Rozpor teal vs zlatá v rodine — samostatná úloha, nie tohto projektu.

**Vedomé odchýlky od kontraktu** sú vypísané v kontrakte §11 „Odchýlky".

## Čo sa nerobilo (vedome mimo rozsahu)

Verejný hosting a ngrok (profil pripravený, vypnutý) · SSO · migrácia reálnych dát
(žiadne neexistujú) · performance profiling · prílohy a upload · e-mail · Jira/Azure
adaptéry.

## Kde je čo

| | |
|---|---|
| Kontrakt (zdroj pravdy) | `KONTRAKT-AURA-ROADMAP-2026-07-28.md` |
| Detailná špecifikácia | `docs/04-DOKONCENIE-50-OTAZOK.md` |
| Konvencie a pasce | `CLAUDE.md` |
| Schéma | `db/migrations/` — Drizzle v zdrojovej appke bol mŕtvy kód |
| Referenčná appka rodiny | `C:\Aura\sperky-ai` (len čítať) |
| Pôvodná appka | `C:\Users\Ucet\Desktop\IT roadmap planner` — **archív, nedotknutý**, môže ďalej bežať na 3010 |
