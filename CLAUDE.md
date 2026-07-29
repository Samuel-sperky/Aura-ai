# Aura Roadmap — Claude Code Conventions

Projekt: `C:\Aura\aura-roadmap`, branch `feat/aura-family-port`. Port Northstar V3 na Next.js 16 + MariaDB.

## Vlastníctvo modulov

| Modul | Agent | Poznámka |
|---|---|---|
| `src/lib/i18n/` | A10 | Kompletný, všetky `keys.*.ts` zlúčené v `index.ts` |
| `src/lib/auth/` | A3 | Kompletný |
| `src/lib/api/` | A3 | `defineRoute()` pipeline — povinný na 100 % handlerov |
| `src/lib/domain/` | A3–A9 | Zod kontrakty modulu + podpora |
| `src/lib/security/` | A3 | CSRF, rate-limit, CSP |
| `src/lib/db.ts` | A3 | Raw SQL pool + transakcije |
| `src/app/` | A7, A8, A9 | Layout, stranky, komponenty; A10 napravil `globals.css` |
| `db/migrations/` | A2 | Schéma migrácie |
| `scripts/` | A10 | `seed.ts` — demo dáta; ostatné A2–A3 |

**Nevlastní:** Git commity (orchestrátor), `package.json` / `.lock` (A1), deployment (externý).

## Štrikty pravidlá

### API Handlers

**Všetky handlory MUSIA používať `defineRoute()`.** Žiadny `export async function POST(req)` bez nej.

```typescript
export const POST = defineRoute(
  {
    auth: "user" | "admin" | { right: "project.create" },
    rateLimit: { name: "write", limit: 100, windowMs: 60000 },
    bodySchema: CreateProjectSchema,
  },
  async (ctx) => {
    const { user, body } = ctx;
    // ... OK: user je guaranteed AppUser, body je validovaná
  }
);
```

Poradie je nemenné: auth → rateLimit → querySchema → bodySchema → handler → error map.

### i18n

Nové texty idú do `src/lib/i18n/keys.<modul>.ts` ako:
```typescript
export const <modulName>Keys = {
  "module.key": { sk: "Slovenčina", en: "English" },
  ...
};
```

A10 neskôr zlúči všetky do `src/lib/i18n/index.ts`. V komponentoch:
```typescript
import { t } from "@/lib/i18n";
t("module.key")  // vracia SK ako default
```

Nikdy nedardcoduj texty do kódu.

### Databáza

**Raw parametrizované SQL, nikdy dynamické stringy.**
```typescript
// ✓ OK
const rows = await query("SELECT * FROM projects WHERE status = ?", [status]);

// ✗ BAD — SQL injection
const rows = await query(`SELECT * FROM projects WHERE status = '${status}'`);
```

**`withTransaction()` na group operácií**, vrátane seed dát:
```typescript
await withTransaction(async (conn) => {
  await conn.execute("INSERT ...", [...]);
  await conn.execute("UPDATE ...", [...]);
});
```

Na všetkých tabuľkách: `created_at DEFAULT CURRENT_TIMESTAMP`, `updated_at NULL`, `created_by`, `updated_by CHAR(36)`.

### Domény

**Domény kľúče (EN) sa NIKDY NEMENILI POTOM, KO SÚ NASADENÉ.** Ak `work_items.status` je `"in_progress"` v DB, označenie v UI je i18n — zmena v i18n nie je schéma migrácia.

Validácia v `src/lib/domain/contracts/<modul>.ts` — zod:
```typescript
export const CreateProjectSchema = z.object({
  code: z.string().min(1).max(32),
  name: z.string().min(1).max(160),
  area: z.string(),
  status: z.enum(["on_track", "at_risk", "blocked", "planned"]),
  health: z.enum(["green", "amber", "red", "grey"]),
  priority: z.enum(["P1", "P2", "P3"]),
});
```

Slovníky (nepovinné, len keď má čitateľ možnosť výberu):
- Stav položky: `backlog`, `in_progress`, `waiting`, `done`
- Typ: `task`, `bug`, `idea`
- Checkpoint typ: `review`, `decision`, `delivery`, `gate`
- Checkpoint lifecycle: `planned`, `ready`, `decided`, `blocked`
- Rozhodnutie: `go`, `conditional_go`, `no_go`, `deferred`
- Projekt stav: `on_track`, `at_risk`, `blocked`, `planned`
- Zdravie: `green`, `amber`, `red`, `grey` (NO `blue`)
- Priority: `P1`, `P2`, `P3`

### Verzia a optimistic concurrency

`version INT NOT NULL DEFAULT 1` — **LEN** na `checkpoints`, `sprints`, `work_items`.

Aktualizácia:
```typescript
// Keď sa verzia neposúva, je to 409 VERSION_CONFLICT
// Server vráti: { error: "...", code: "VERSION_CONFLICT", currentVersion: 42 }

const result = await apiPatch(`/api/checkpoints/${id}`, {
  name: "New name",
  version: 41,  // klient poslal 41, ale aktuálne je 42
});
// 409 → AppError.isVersionConflict() → reload a try again
```

### Dizajn (Aura rodina)

**Dark je default.** Pre-paint skript v `<head>` bez bliku.

Tokeny len v `globals.css`:
```css
:root {
  --bg: #f8f4f7;
  --panel: #ffffff;
  --accent: #03797e;
  --border: #e6dee3;
  /* ... */
}

:root[data-theme="dark"] {
  --bg: #0e1413;
  --panel: #161f1d;
  --accent: #05bcc4;
  --border: #27332f;
}

:root[data-density="compact"] {
  --space-1: 2px;
  /* ... */
}
```

V CSS: **nikdy raw hex alebo rgba**. Len `color-mix`:
```css
.button {
  background: color-mix(in srgb, var(--accent) N%, transparent);
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

Fonty: `next/font/google` na `Geist` (UI) + `Playfair Display` (`.serif-italic`).

Ikony: `lucide-react`, `aria-hidden="true"`. Bez emoji v UI.

Breakpointy: `@media (max-width: 1100px)`, `900px`, `700px`, `390px`.

Mobility: drag&drop len na desktope; čítanie + rýchle akcie na mobile.

### Bezpečnosť

**Povinné na každej zmene auth / prístupu / uploadu / exponovaného endpointu:**

1. CSRF: fail-closed, `checkCsrf()` v API handleri
2. Rate-limit: `defineRoute({ rateLimit })`
3. Lockout: `auth/pin.ts` 5/15min per (email, ip), 15/email → 423
4. CSP: `src/lib/security/headers.ts`
5. Non-root Docker
6. Žiadny dev-fallback secret

Audit: každý write (create/update/delete) + login/logout. `audit_log` tabuľka — IP a User-Agent server-side.

### Soft delete? NIE.

Hard delete + záznam do `audit_log`. Žiadne `deleted_at` stĺpce.

```typescript
// ✓ OK
await execute("DELETE FROM projects WHERE id = ?", [id]);
// audit_log je vyplnený manuálne v handleri

// ✗ BAD
await execute("UPDATE projects SET deleted_at = NOW() WHERE id = ?", [id]);
```

### Turbopack padá na junction `node_modules`

Dev server vždy: `npx next dev --webpack`

### DB nie je host-mapovaná

Lokálny dev `next dev` sa na `aura-roadmap-db:3306` nedostane. Testuj cez running Docker na `http://localhost:3040`.

Dátové testy: vitest + fixtures, alebo testujem cez `http://localhost:3040/api/...`.

### Git workflow (automatizovaný)

- Branch: `feat/aura-family-port`
- Commits: Orchestrátor (A10 neurobí git)
- Push: Len feature branch (nikdy main)
- Worktree: Keď riziko konfliktu s inou session (vtedy áno)

## Ak nájdeš bug

Zapíš do `issues` v reporte. Neblokuje work v progress — len ho zaznamenaš.

Príklad:
```
[issues]
- File: src/app/settings/page.tsx:42
  Issue: User preferences not persisted on logout; session cleared but localStorage remains
  Impact: Minor — next login reads stale preferences from localStorage
```

## Ak je úloha väčšia ako očakávané

Navrhneš `/sprint` miesto `/quick`. Orchestrátor prehodnotí odhad a scope.

## Sekvenčné session — handoff

Keď skončíš, vypíšeš do `docs/HANDOFF.md` (A10 vlastní):

```markdown
# Handoff — Aura Roadmap (A10)

## Hotové
- i18n: Všetky `keys.*.ts` zlúčené v `index.ts`, test na kompletnosť
- seed.ts: Demo dáta (2 konta, 3 projekty, 4 checkpointy, ~20 položiek)
- README.md: Spustenie, stack, FAQ
- CLAUDE.md: Konvencie budúcim agentom
- Test: `npx tsc --noEmit` ✓, `npm test` ✓, `npm run lint` ✓

## Otvorené body / Issues
- `src/app/layout.tsx`: A7 má tu header + nav; A10 len súbor vlastní
- Seed heslá demo: vypísané v stdout počas behu — OK
- Turbopack: `--webpack` fallback je OK, nie je to bug

## Ďalší step
- A11 (ak existuje): User testing na 3 obrazovkách (Overview, Timeline Sprints, Decisions)
- Security review pred prod: CSRF, CSP, rate-limit
```

## Cheat sheet — Čo si nesmieš dovoliť

| Čo | Prečo | Ako |
|---|---|---|
| Git commit bez ask | Orchestrátor commit | Zapíš do reporte a čakaj |
| Meniť `package.json` / `.lock` | A1 vlastní deps | Zapíš "balík X potrebný"; A1 ho pridá |
| Editovať `keys.*.ts` iného agenta | Modul own | Importuj a zlož, nemeň |
| Soft delete (`deleted_at`) | Rodina to nemá nikde | Hard delete + `audit_log` |
| Pracovať mimo `C:\Aura\aura-roadmap` | Vlasni iní agenti | Čítaj z ref appky (`C:\Aura\sperky-ai`), needituj |
| Hard-codované teksty | i18n je povinný | `src/lib/i18n/keys.*.ts` + `t()` |
| Raw hex v CSS | Token system | `color-mix(in srgb, var(--token) N%, transparent)` |
| Bezpečný secret v kóde | Breach risk | Len `.env`, nikdy `.js` |
| Hard reset / force push | Lossless | Ak naozaj musíš: ask user |

## Overené pasce (verifikačná brána, 2026-07-29)

Každá z týchto vecí reálne zlyhala pri overovaní a je opravená. Nevracaj ich.

### Jednorazové CLI skripty musia zatvoriť pool

`seed.ts` bez `closePool()` **nikdy neskončí** — idle mariadb spojenia držia Node event
loop, kontajner bežal 6 hodín a v `information_schema.processlist` stálo 5 spojení v
stave `Sleep`. Platí aj pre úspešnú cestu, nielen chybovú.

```typescript
seed()
  .then(() => closePool())
  .catch(async (err) => { console.error(err); await closePool().catch(() => {}); process.exit(1); });
```

`migrate.ts` a `reset-pin.ts` to robia správne — pozri ich, keď pridávaš nový skript.

### Seed musí byť idempotentný na prirodzenom kľúči

Bootstrap admina beží **mimo** transakcie demo dát. Keď beh padne v polovici, admin
zostane committnutý — a `if (users exist) return` z každého ďalšieho behu urobí tichý
no-op. Zároveň `INSERT` bez kontroly existencie duplikuje: po dvoch behoch bolo
32 položiek namiesto 16. Idempotenciu **dokáž** — druhý beh musí vypísať 0 nových riadkov.

### Migrácie sú zdroj pravdy, nie seed

Seed bol napísaný proti vymysleným stĺpcom (`text` namiesto `body`, `created_by`
namiesto `author_id`, chýbajúce `NOT NULL project_id`). Keď sa nezhodujú, opravuje sa
**seed**.

### Rate-limit: fan-out × jeden bucket na celý tím

Buckety sú kľúčované podľa **client IP**, nie podľa používateľa, takže celý tím za NAT
zdieľa jeden limit. Prehľad ťahá **7** list requestov na jedno zobrazenie. Pri
`read: 120` / `heavy: 30` to znamenalo ~17 / ~4 zobrazenia za minútu — namerané: prvý
`429` pri 85. requeste. Prejav je zradný: appka nespadne, len každá obrazovka vykreslí
„Údaje sa nepodarilo načítať", takže to vyzerá ako chyba dát. `login` nikdy nezvyšuj.

### `max-width` nezabráni vodorovnému pretekaniu

`html, body { max-width: 100vw }` obmedzuje box, nie obsah vytekajúci z neho.
`overflow-x: clip` na **root elemente** Chrome pri `overflow-y: visible` ignoruje (root
overflow sa propaguje na viewport) — `/projects` panoval 424 px, hoci pravidlo
computovalo na `clip`. Klipuj na `.app-shell`, a hlavne: **neposielaj na mobil layout,
ktorý sa tam nezmestí.** 9-stĺpcová tabuľka potrebuje 940 px → pod 700 px sa Projekty
vykresľujú ako karty (`useIsNarrow`), nezávisle od uloženej preferencie.

Pri hľadaní vinníka pretečenia vylúč prvky vnútri overflow kontejnerov —
`getBoundingClientRect` klipovanie predkom ignoruje, takže tabuľka v `.tbl-wrap` sa
javí ako vinník, hoci ním nie je.

### Semantické farby ako text potrebujú vlastný token

Fill hodnoty sú ladené na pozadia; ako text na vlastnom 14 % tinte dávajú 3,6–4,4:1,
pod AA hranicou 4,5:1 pre 11px labely (axe: `color-contrast`, impact **serious**).
Používaj `--success-text` / `--danger-text` / `--warn-text` — rovnaký vzor ako
`--gold-text`. Na `border-color` naopak patrí fill.

### Accessible names musia byť jedinečné v jednom kontexte

Topbar aj Nastavenia renderujú ovládač témy a hustoty. Kým mali rovnaký `ariaLabel`,
čítač obrazovky ich nerozlíšil. Topbar má sufix „— rýchle prepnutie". Modal má
„Zavrieť dialóg", drawer „Zavrieť panel", aby sa nebili s tlačidlom „Zavrieť" v pätičke.

### `.ps1` s diakritikou potrebuje UTF-8 BOM

Windows PowerShell 5.1 dekóduje `.ps1` bez BOM systémovou ANSI stránkou. Rozbitý
em-dash v double-quoted stringu zhodí parsovanie s „Missing closing '}'" — zálohovací
skript bol takto **mŕtvy**. Overenie:

```powershell
[System.Management.Automation.Language.Parser]::ParseFile($path, [ref]$null, [ref]$err)
```

### E2E: prihlás sa RAZ

Suite, ktorá sa prihlasuje v `beforeEach`, vystrelí ~50 loginov a strhne si vlastný
login limit; pády sa javia ako chyby appky (`waitForURL` timeout). Z pôvodných 17 pádov
bolo takto falošných 6. Session dodáva `e2e/auth.setup.ts` cez `storageState`
(zachytáva aj httpOnly cookie).

Dve ďalšie pasce v testoch: Playwright matchuje `name` ako **podstring**, takže
„Zavrieť" trafí aj „Zavrieť dialóg" — používaj `exact: true`. A nikdy nelokalizuj prvok
atribútom, ktorý testuješ (`button[aria-expanded="false"]` po rozbalení prestane
matchovať a `.first()` sa preresolvuje na ďalší zbalený riadok).

### `set-state-in-effect`: „loader začína awaitom" nie je riešenie

`eslint-plugin-react-hooks` 7.1.1 flagne aj volanie **vyňatej async funkcie**, ktorá
`setState` robí až za `await` — pravidlo nevidí za hranicu funkcie a označí miesto
volania. Čisté sú tri vzory, použi jeden z nich:

1. **Promise chain** namiesto async tela — všetky zápisy stavu sú v callbackoch
   (vzor: `loadCore` v `src/components/timeline/TimelineWorkspace.tsx`)
2. **Derivovaný stav** namiesto `useState` + zrkadliaceho effectu
   (vzor: `search` a `loading` v `src/components/projects/ProjectsView.tsx`
   a `DecisionsView.tsx` — `requestKey`/`loadedKey`)
3. **`useSyncExternalStore`** pre externý stav (localStorage, `matchMedia`)
   (vzor: `useIsNarrow` v `ProjectsView.tsx`, `usePreferences` v `ThemeControls.tsx`)

Stav po follow-up šprinte: **0 upozornení**. Kto pridá filter alebo loader, nech
nepridáva `setState` do effectu, inak sa vrátia.

### Dialóg nesmie nabízať cieľ, ktorý API odmietne

`POST /api/work-items/[id]/move` odmieta cross-project šprint so 400 „Šprint patrí
inému projektu." (`relationError` v `src/lib/domain/workItems.ts`). Dialóg „Presunúť"
pritom nabízel **všetky** šprinty v horizonte, takže na seed dátach bol každý cieľ
zaručený error toast. Ponuku vždy filtruj tou istou relačnou podmienkou, akú vynucuje
server — na to je `moveTargets()` v `src/components/timeline/moveTargets.ts`:

```typescript
export function moveTargets<S extends Pick<SprintWithMetricsDto, "projectId">>(
  sprints: readonly S[], item: { projectId: string },
): S[]
```

Môže legitímne vrátiť prázdne pole — projekt bez šprintu v horizonte má ako jediný
cieľ backlog. **Tú istú pascu má drag & drop**: `onDragEnd` v `SprintPlanner.tsx`
droppable cieľ zatiaľ nefiltruje, takže pretiahnutie karty do šprintu iného projektu
skončí 400. Kto sa toho dotkne, nech použije `moveTargets`.

### Log neobsahuje riadky pri zelenom behu — je to zámer

`logRoute` úmyselne nezapisuje rýchle 2xx (`status < 400 && ms < SLOW_REQUEST_MS`),
aby sa signál neutopil v šume. Prázdny `docker logs` po zelenom e2e behu teda **nie je**
dôkaz, že observabilita nefunguje. Over ju neautentifikovaným requestom — má sa objaviť
`[api] GET /api/... 401 reason=auth_denied`.

## Kontext a zdroje

- **Kontrakt:** `KONTRAKT-AURA-ROADMAP-2026-07-28.md` (zdroj pravdy — mení sa len s user input)
- **Detailná spec:** `docs/04-DOKONCENIE-50-OTAZOK.md`
- **Schéma:** `db/migrations/` (Drizzle je mŕtvy kód)
- **Ref appka:** `C:\Aura\sperky-ai` (rodina baseline)
- **Pôvodný:** `C:\Users\Ucet\Desktop\IT roadmap planner` (archív, nedotknutý)

## Node / NPM verzie

- **Node:** v24.18.0
- **npm:** 11.16.0
- **npx.cmd** na Windows (nie `npx`)
- **npm.cmd** na Windows (nie `npm`)

---

**Session:** A10 (2026-07-28) — i18n, seed, dokumentácia
