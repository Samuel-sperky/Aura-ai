# Aura Suite — náhľad aplikácií

Obrazovky pre ostatné aplikácie ekosystému Aura (Marketing, HR, Sales, Finance,
Support, Ops), postavené na rovnakom dizajnovom systéme ako prezentácia v `../presentation/`.

## Čo to je

Jeden **self-contained HTML hub** (`aura-apps-hub.html`) — rozcestník na 6 modulov,
každý s 5 obrazovkami. Náhľad používateľského rozhrania, nie funkčný backend.
Všetky dáta sú **ukážkové (demo)** a slúžia len na predvedenie obrazoviek.

```
apps/
  aura-apps-hub.html      ← jeden súbor: rozcestník + 6 modulov × 5 obrazoviek
  aura-apps-hub.pdf       tlačová verzia, 31 strán A4 landscape (tmavá téma)
  screens/                36 PNG (31 obrazoviek dark + 4 light + EN rozcestník)
  build/
    shoot.mjs             Playwright: verifikácia + PNG + PDF
```

## Moduly a obrazovky

Každý modul: **intro** (cover) → **Prehľad** (dashboard) → **zoznam** → **detail** → **Nastavenia**.

| # | Modul | Akcent | Zameranie (demo) |
|---|---|---|---|
| 01 | Aura Marketing | teal | kampane, obsah/copy, dosah, konverzie |
| 02 | Aura HR | violet | zamestnanci, nábor, dochádzka, hodnotenia |
| 03 | Aura Sales | gold | pipeline, obchody, ponuky, win rate |
| 04 | Aura Finance | green | faktúry, cashflow, náklady, splatnosti |
| 05 | Aura Support | amber | tickety, SLA, priorita, CSAT |
| 06 | Aura Ops | deep teal | jadro 70B, workeri, GPU/VRAM, hranica dát |

Modulové akcenty používajú **existujúce sémantické tokeny** z prezentácie
(`--teal`, `--violet`, `--gold`, `--good`, `--amber`, `--teal-2`). Nové farby sa nevymýšľajú.

## Interakcie (klientske, bez backendu)

Náhľad je simulovateľný — nie je to len statická galéria:

- **Klikateľné riadky** zoznamu → otvoria konkrétny detail (cez `#modul/detail/<id>`).
- **Reálne filtre** (chips) a **vyhľadávanie** v zozname zúžia tabuľku; prázdny výsledok → empty stav.
- **Vytváranie/úprava** cez modálny formulár (`Nový` / `Upraviť`) → nový záznam sa pridá do tabuľky + toast.
- **Prepínače** v Nastaveniach reálne prepnú stav (+ toast). **Pridávanie krokov** do timeline v detaile.
- **Chybové stavy**: banner v Aura Ops (Worker C zaťažený) a Aura Finance (faktúry po splatnosti).
- **Globálne prvky**: ⌘K vyhľadávanie naprieč modulmi, panel notifikácií (zvonček), profilové menu (avatar).
- **Skeleton loading** pri prepínaní obrazoviek, **toasty** po akciách, **onboarding** prázdny štart.
- **Vstupné obrazovky**: `#login` → `#workspace` (výber pracovného priestoru) → hub; `#profile`.

## Ovládanie

- **Prepínač SK / EN** vpravo hore — celé rozhranie vrátane formátu čísel a dátumov je dvojjazyčné.
- **Dark / Light** prepínač (ikona mesiaca); light téma spĺňa AA kontrast.
- Klávesnica: `⌘K` / `Ctrl+K` vyhľadávanie, `1`–`6` skok na modul, `←`/`→` obrazovky v module, `Esc` zavrie overlay / rozcestník.
- Prístupnosť: `:focus-visible`, `role=switch`, ARIA popisy, landmarky `<header>/<main>/<aside>`, `scope` na tabuľkách.
- Plne responzívne — na mobile hamburger + off-canvas drawer.
- Bez `localStorage`, bez analytiky, bez CDN skriptov. Grafy sú ručné SVG/CSS.
  Jediná externá závislosť sú Google Fonts so systémovým fallbackom.

## Farebný systém

Brand akcenty modulov sú **oddelené od stavových farieb** (aby sa napr. „pozor" nemýlilo s brandom):
Marketing `--b-mkt` (teal), HR `--b-hr` (violet), Sales `--b-sales` (jantár), Finance `--b-fin` (zelená),
Support `--b-support` (oranžová), Ops `--b-ops` `#2a8f96`. Stavové `good/amber/red/violet` sú len pre badge.
Chrome (topbar, SK/EN) drží fixný teal nezávisle od modulu.

## Ako prestavať screenshoty a PDF

```bash
cd apps/build
node shoot.mjs                       # ../aura-apps-hub.html → ../screens + ../aura-apps-hub.pdf
```

`shoot.mjs` vyžaduje Playwright a Chromium v `/opt/pw-browsers/chromium`.
`playwright install` sa nespúšťa — prehliadač je predinštalovaný.

## Poznámka k dátam

V súlade s pravidlom projektu **„neznáme výsledky sa nevymýšľajú"** sú všetky čísla
na obrazovkách označené ako demo (odznak *Demo · ukážkové dáta* v hlavičke) a slúžia
výhradne na predvedenie rozloženia a tokov. Nie sú to reálne prevádzkové údaje.
