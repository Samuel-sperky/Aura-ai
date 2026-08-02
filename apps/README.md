# Aura Suite — náhľad rodiny aplikácií

Zjednotený náhľad **reálnych aplikácií rodiny Aura** (C:\Aura na produkčnom PC):
Aura Marketing, Aura KPI, Aura Logistika, Aura HR/Interná evidencia, Aura Roadmap
a Report tržieb. Štruktúra obrazoviek, KPI karty, grafy a stavové slovníky vychádzajú
z reálnych appiek (rekonštruované z Hades pamäte 3 agentmi, 2. 8. 2026).

## Čo to je

Jeden **self-contained HTML hub** (`aura-apps-hub.html`) — rozcestník na 6 modulov,
každý s 5 obrazovkami. Náhľad používateľského rozhrania, nie funkčný backend.
**Overené čísla z reálnych appiek sú prenesené 1:1** (napr. plnenia KPI jún 2026,
tržby júl 2026); neoverené hodnoty sú ukážkové a v celej appke platí demo odznak.

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

| # | Modul | Reálna appka (port) | Kľúčové reálne prvky |
|---|---|---|---|
| 01 | Aura Marketing | sperky-ai (3000) + Banner Studio (8091) | ads strom s ROAS pásmami, 3 modelky, campaign lock, 8 jazykov × 5 rozmerov, QA gates, budget strop 300 € |
| 02 | Aura KPI | aura-kpi (3030) | plnenie (skutočnosť−Min)/(Max−Min) cap 100 %, farby ≥100/60–99/<60/sivá, monthPill + fillPill, Team score 61,9 %, reálne plnenia jún 2026 |
| 03 | Aura Logistika | aura-logistika (3020) | ISO-týždeň × krajina (8) × prepravca (5), stavy odoslané/doručené/na ceste/vrátené/stratené/výdajňa, reklamácie zahájené→vyriešené, GLS alert |
| 04 | Aura HR | interná evidencia | 32 pozícií s náplňou, ~90 rolových mailov (heslá admin-only), org-strom, aplikácie s nákladmi |
| 05 | Aura Roadmap | aura-roadmap (3040) | checkpointy go/conditional_go/no_go/deferred (nemenné), šprinty draft→commit→close, stavy backlog→in_progress→waiting→done |
| 06 | Aura Tržby | report tržieb (HTML) | reálne čísla júl 2026: tržba 217 016 €, zisk 126 541 €, marža 66,1 %, AOV 38,21 €, dobierka 65,8 %, expedícia 69,6 % do 24 h |

Fonty podľa štandardu rodiny appiek: **Geist + Playfair Display** (Inter je štandard
reportov, JetBrains Mono decku). Farby plnenia KPI prebraté 1:1.

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
