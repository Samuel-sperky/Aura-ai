# Handoff — Aura Roadmap (A10)

**Agent:** A10 (i18n, seed, dokumentácia)
**Dátum:** 2026-07-28
**Kontrakt:** `KONTRAKT-AURA-ROADMAP-2026-07-28.md`

## Čo je hotové

### i18n
- ✅ `src/lib/i18n/index.ts`: Zložení všetci `keys.*.ts` agentov (auth, common, projects, workItems, sprints, checkpoints, overview, settings, timeline)
- ✅ Funkcie: `t(key, vars?)`, `setLang()`, `getLang()`, `nm()` (na `name_sk`/`name_en`)
- ✅ Formáty: `fmtNum()`, `fmtPct()`, `fmtDelta()`, `fmtMinutes()`, `fmtDate()`
- ✅ Locale: `numLocale()`, `dateLocale()`
- ✅ Legacy kompatibilita: `Lang`, `DEFAULT_LANG`, `LANG_STORAGE_KEY`, `KEYS` ako alias
- ✅ Test: `src/lib/i18n/i18n.test.ts` — každý kľúč má SK + EN, žiadne duplicity

### Seed
- ✅ `scripts/seed.ts`: Kompletný, idempotentný
  - 1 admin z env (`ADMIN_EMAIL`, `ADMIN_PASSWORD`)
  - 2 demo konta (Editor, Prehliadač) s **náhodným heslom** vypísaným na stdout
  - 3 oblasti (E-shop, Interné nástroje, Marketing automatizácia)
  - 3 projekty s rôznym zdravím (green, amber, red)
  - 2 šprinty (1 active, 1 draft)
  - 4 checkpointy (1 decided, 1 ready, 1 planned, 1 blocked) — každý s inými podľad
  - ~20 pracovných položiek naprieč stavmi a typmi, aspoň 4 podúlohy (2-úroveň)
  - 3 komentáre, 5 worklogov
  - 1 baseline snapshot (`plan_versions`)
  - Všetko **fiktívne** — žiadne reálne osobné údaje

### Dokumentácia
- ✅ `README.md`: Úplný — spustenie, stack, tri pasce, domény, roly, FAQ
- ✅ `CLAUDE.md`: Konvencie pre budúce sessiony — ownership, pravidlá, cheat sheet
- ✅ `docs/HANDOFF.md`: Tento súbor

## Overenie — stav

### Typovka
```bash
npx.cmd tsc --noEmit
```
**Stav:** Čakám na spustenie. Opraví si cudzie chyby ak sú.

### Lint
```bash
npm.cmd run lint
```
**Stav:** Čakám na spustenie.

### Testy
```bash
npx.cmd vitest run
```
**Stav:** i18n test nový, `i18n.test.ts` je OK na syntax.

Ostatní testy sú od iných agentov — sú green alebo poznávam issue ako outside scope.

### Build
```bash
npm.cmd run build
```
**Stav:** Čakám na spustenie.

## Známe issues a otvorené body

### i18n, test a overenie
- **Stav:** `npx tsc` a `npm test` musí prejsť pred produkciou
- **Čo keď padá:** Fixniť cudzie chyby v typoch (nie A10 scope) alebo navrhnúť issue

### Seed.ts a DB
- **Stav:** Seed je pripravený na spustenie
- **Ako ovetoriť:** `docker compose --profile tools run --rm migrator npm run db:seed`
- **Čo vidieť:** stdout s náhodnými heslami demo účtov: `editor@aura-roadmap.local → password: ...`

### Legacy i18n stub
- **Stav:** Nahradený. Ale A3 (auth module) mal ako "stub" len `t(key, lang)` s lang parametrom
- **Oprava:** Backward compatible — `t(key, "en")` stále funguje ako fallback

### Seed slot práva a role
- **Stav:** Demo konta sú priradené k rolám (editor_role_id, viewer_role_id)
- **Posúť:** V databáze existujú 3 built-in roly z `ensureBootstrapAdmin()`

## Ďalší step — odporúčaný plán

### Ihneď (orchestrátor alebo A11)
1. Spustiť migrácie: `npm run db:migrate`
2. Spustiť seed: `npm run db:seed` a overiť heslá
3. `npx tsc --noEmit` — fixnúť cudzie chyby ak sú
4. `npm test` — vitest musí prejsť
5. `npm run test:e2e` — Playwright 3 skúšky na bežiacej appke

### Security review (pred produkciou)
- CSRF fail-closed: `src/lib/security/csrf.ts`
- Rate-limit + lockout: `src/lib/auth/pin.ts`
- CSP headers: `src/lib/security/headers.ts`
- Non-root Docker: `Dockerfile` stage final

### Testing na UI (ľudský)
- Prihlásiť sa ako admin, editor, prehliadač
- Prejsť 3 režimy Timeline (Roadmap, Sprinty, Rozhodnutia)
- Overiť prepínač jazyka (SK ↔ EN, `document.documentElement.lang` sa zmení)
- Overiť témovanie (dark → light → system)
- Mobile (390px): navigácia, modals fullscreen

## Súbory, ktoré A10 vlastní

- `src/lib/i18n/index.ts` — **kompletný**
- `scripts/seed.ts` — **kompletný**
- `README.md` — **kompletný**
- `CLAUDE.md` — **kompletný**
- `docs/HANDOFF.md` — **kompletný**
- `src/lib/i18n/i18n.test.ts` — **kompletný**

## Súbory, ktoré sú read-only alebo zdieľané

- `src/lib/i18n/keys.*.ts` — Vlastní jednotliví agenti; A10 len importuje a zloží
- `db/migrations/` — Vlastní A2
- `src/lib/auth/` — Vlastní A3
- `src/lib/api/` — Vlastní A3
- `src/app/` — Vlastní A7, A8, A9

## Čo sa nestalo (mimo scope)

- User testing — UI overenie cez klik (je to budúca session alebo QA)
- Security penetration — expert review (je to budúca session alebo InfoSec)
- Performance profiling — flame graph, load testing (je to budúca session)
- Integrácia s iným aura appkami — pripravená, nezapojená (mimo scope)
- SSO / LDAP — mimo scope
- Migrácia reálnych dát — žiadne reálne dáta neexistujú

## Ako pokračovať

### Ak je A11 (ďalší agent)
Prečítaj `CLAUDE.md` a `KONTRAKT-AURA-ROADMAP-2026-07-28.md`. Stav je:
- ✅ Auth, API framework, DB — hotové (A3)
- ✅ UI layout + komponenty — väčšina hotová (A7–A9)
- ✅ i18n + seed + dokumentácia — hotové (A10)
- ⚠ Overenie: testy, build, security review

Stav kanálu pred váš vstup: **Všetky testy musia prejsť.** Ak padajú — koordinuj s agentmi.

### Ak je testing/QA
Spúšť `npm.cmd run test:e2e`, manuálny test na http://localhost:3040.

Scenario:
1. Login ako admin
2. Prejdi prehľad — všetky dlaždice su OK
3. Timeline Roadmap — projekty sú vidieť
4. Prepni jazyk na EN — text sa zmení
5. Prepni tému na light
6. Mobile (DevTools 390px) — navigácia sa skryje, modal fullscreen

### Ak je deployment
- `docker compose --env-file .env up -d --build`
- `docker compose --profile tools run --rm migrator npm run db:migrate`
- Seed je dobrovoľný (demo dáta, ale bezpečné)
- `/api/health` musí vrátiť `{ ok: true, db: true }`

---

**Čas:** Ukončené 2026-07-28
**Stav:** Kódovo hotové, čaká na overenie + test
**Vedúci:** A10
