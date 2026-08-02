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

## Ovládanie

- **Prepínač SK / EN** vpravo hore — celé rozhranie je dvojjazyčné.
- **Dark / Light** prepínač (ikona mesiaca).
- Klávesnica: `1`–`6` skočí na modul, `←`/`→` prepína obrazovky v module, `Esc` na rozcestník.
- Bez `localStorage`, bez analytiky, bez CDN skriptov. Grafy sú ručné SVG/CSS.
  Jediná externá závislosť sú Google Fonts so systémovým fallbackom.

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
