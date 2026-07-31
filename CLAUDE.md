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
cieľ backlog.

**Oba vstupy tú istú podmienku vynucujú** a musia to robiť ďalej:

| Vstup | Ako |
|---|---|
| Dialóg „Presunúť" | `MoveDialog` nabízí len `moveTargets(sprints, item)` |
| Drag & drop | `droppableBuckets(sprints, item, BACKLOG_ID)` → cudzí stĺpec dostane `disabled` v `useDroppable`, takže sa naň **nedá pustiť**, a je stlmený triedou `.itemsBlocked`. Plus poistka v `onDragEnd`, aby ani klávesnicová cesta neposlala request, ktorý server odmietne |

Test `moveTargets.test.ts` obsahuje kontrolu, že sa oba vstupy zhodnú — divergencia medzi
nimi je presne tá diera, ktorá dovolila drag & dropu nabízať cieľ, ktorý dialóg už
vylúčil. Backlog je vždy platný: zrušenie `sprint_id` nemá relačnú podmienku.

### Horizont Timeline sa riadi zoomom, nie fixnými 12 mesiacmi

Zoom je voľba **detailu**, nie dĺžky stránky. Kým bol horizont fixne 12 mesiacov,
`week` kreslil ~53 stĺpcov (nekonečný scroll) a `quarter` štyri (prázdna stránka).
Zdroj pravdy je mapa v `src/lib/timeline.ts`:

```typescript
export const ROADMAP_HORIZON: Readonly<Record<TimelineZoom, number>> = {
  quarter: 8, month: 12, week: 12,   // jednotiek TOHO zoomu
};
```

**Nikde nehardcoduj 12** — čítaj mapu. `ROADMAP_HORIZON_MONTHS` zostal len pre
kompatibilitu a je z mapy derivovaný, takže sa nemôžu rozísť.

Horizont je ukotvený na **začiatku jednotky, ktorá obsahuje dnes** (pondelok /
1. deň mesiaca / 1. deň kvartálu). Preto je `scale.columns.length ===
ROADMAP_HORIZON[zoom]` presne, bez odseknutého prvého či posledného stĺpca, a dnes
je vždy vnútri horizontu — `scale.todayPercent` v režime roadmap nikdy nie je `null`.
Dôsledok, s ktorým treba počítať: **`scale.startIso` sa hýbe pri zmene zoomu**
(predtým to bol 1. deň aktuálneho mesiaca pri každom zoome).

Režim `sprints` to **zámerne nesleduje** — 12 týždňov od pondelka pri každom zoome,
a jeho prvý aj posledný stĺpec **sú** odseknuté. Neopravuj to, e2e to drží.

`barGeometry()` a `markerPercent()` vracajú **podiel horizontu v percentách, bez
smeru**. To je jediný dôvod, prečo sa roadmap dal postaviť na výšku bez zásahu do
`lib/timeline`: tie isté čísla, ktoré šli do `left`/`width`, idú do `top`/`height`.
Nemeň im semantiku — drží obe orientácie v zhode.

### `unitPx` reaguje na hustotu, nie na obsah

Výška vertikálnej osi je `columns.length × UNIT_PX[density]` s podlahou
`MIN_AXIS_PX = 360` (`RoadmapMode.tsx`), kde `UNIT_PX = { cozy: 58, compact: 40 }`.
Kompaktná hustota existuje presne preto, aby sa **12 mesiacov zmestilo bez svislého
scrollu** (480 px os proti 700 px). Pruhy sú polohované v **percentách** tejto výšky,
takže číslo rozhoduje len o vzdušnosti — nikdy o tom, či pruh padne do správneho
mesiaca.

Hustota prichádza cez `useSyncExternalStore` (`getDensity` / `subscribePreferences`
z `@/lib/theme`), nie cez `useState` + effect. Kto to prepíše na effect, vráti
`set-state-in-effect` upozornenia, ktoré sú na nule.

### `@media` nepridáva špecificitu — na poradí v súbore záleží

`timeline.module.css` má hore spoločné media bloky (`@media (max-width: 1100px)`
a `700px` okolo r. 1500) a **až za nimi** blok `DECISION TIMELINE` s prefixom `dt`.
Media query špecificitu **nezvyšuje**, takže pravidlo pre `.dtCard` napísané nižšie
v súbore prebije to isté pravidlo z horného media bloku — aj keď je viewport úzky.

Preto sú media bloky pre `dt` zámerne **vnútri** `DECISION TIMELINE`, na konci
súboru (r. ~1759 a ~1768). Kto pridá `dt` pravidlo do horných media blokov, tichým
spôsobom si ho vypne: build prejde, testy prejdú, len sa to na mobile neaplikuje.
To isté platí pre každý nový prefixovaný blok, ktorý sa pridá na konec súboru.

Poznámka k `:has()`: v tomto CSS module funguje a prefixuje sa lokálne — pozri
`.dtCards > li:has(+ .dtNow) > .dtCard` a `:global(.page-stack):has(.vt)` v print
bloku. Nie je to dôvod na obavy, prežilo to build.

### Graf nesmie tvrdiť horizont, ktorý škála nemá

Rovnaká trieda chyby ako pasca o `moveTargets` vyššie, len na výstupnej strane:
**popis nesmie hlásiť stav, ktorý dáta nekryjú.** Keď sa horizont stal
zoomo-závislým, statický popisok osi zostal.

Prípad, ktorý to spôsobil (**opravený 2026-07-30**, nevracaj ho): `RoadmapMode.tsx`
renderoval v hlavičke osi `t("timeline.horizonRoadmap")`, čo bolo natvrdo
„12 mesiacov". Pri `zoom=quarter` je os 8 kvartálov (2 roky) a pri `zoom=week`
12 týždňov — popisok tam **klamal**. Pri predvolenom `zoom=month` bol pravdivý,
preto to prešlo cez tsc, lint, testy aj e2e.

Dnes to rieši `horizonHint(scale)` v `RoadmapMode.tsx`:

```typescript
function horizonHint(scale: TimeScale): string {
  const units = scale.columns.length;               // NIE ROADMAP_HORIZON, nie konštanta
  return t(`timeline.horizonUnits.${scale.zoom}.${pluralForm(units)}`, { n: units });
}
```

Číslo je `scale.columns.length` — teda **tie isté stĺpce, ktoré os kreslí**, nie
druhý zdroj tej istej pravdy. Kľúč `timeline.horizonRoadmap` je zrušený, aby sa
nedal omylom použiť znova. Slovenčina potrebuje tri tvary (1 / 2–4 / 5+), takže
`keys.timeline.ts` má 9 kľúčov `timeline.horizonUnits.<zoom>.<one|few|many>`
a `pluralForm()` v `./text` vyberá tvar; angličtina `few` a `many` zlučuje.
Testy: `src/components/timeline/text.test.ts`.

Pravidlo: keď pridáš popisok, ktorý hovorí o rozsahu, dĺžke alebo počte, ber ho
z tej istej hodnoty, z akej sa kreslí obsah — nie z konštanty v texte. A keď
pridávaš počítaný text po slovensky, počítaj s tromi tvarmi, nie dvomi.

### Klikací terč má 24 px, aj keď mu tak dobre nesedí dizajn

`.vtMarker` (značka checkpointu na dráhe) bola 18×18 px a axe ju zhodila pravidlom
`target-size` (WCAG 2.2 SC 2.5.8, impact **serious**) na **všetkých** značkách
v oboch témach — hláška je adresná: „Target has insufficient size (18px by 18px,
should be at least 24px by 24px)". Pravidlo prejde, keď je terč aspoň 24×24 **alebo**
má aspoň 24 px voľného odstupu; značky ležia nad pruhom projektu, takže odstupová
cesta bola zavretá a jediná oprava je veľkosť.

Dráha má 116 px a pruh 26 px, takže 24 px značka sa stále zmestí do šírky pruhu —
z veľkosti neplynie žiadna zmena layoutu. Ikona vnútri má 13 px (11 px sa v 24 px
boxe strácalo). Kto bude značku zmenšovať „aby bola jemnejšia", zhodí axe gate.

### Axe gate musí auditovať režimy, nie len defaultnú routu

`/timeline` vykreslí **iba** `mode=roadmap`. Kým `e2e/a11y.spec.ts` auditoval len
`/`, `/timeline` a `/projects`, sprintový planner a rozhodovacia os — vlastné
tlačidlá kariet, tint po termíne, `--accent-ink` na `--accent-tint` v mesačnej
hlavičke — **nikdy neprešli** kontrolou kontrastu ani terčov. `SCREENS` preto dnes
obsahuje aj `/timeline?mode=sprints` a `/timeline?mode=decisions` (2 režimy × 2 témy
= 4 testy navyše). Keď pridáš režim alebo obrazovku, ktorá má vlastné ovládacie
prvky, pridaj ju do `SCREENS` — inak je nová a neauditovaná.

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

**Session:** dokončenie dizajnu Timeline (2026-07-30) — vertikálny Roadmap, Rozhodnutia
na tej istej osi, horizont podľa zoomu. Predtým: A10 (2026-07-28) — i18n, seed, dokumentácia.
