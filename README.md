# Aura AI

Interná dokumentácia a výstupy k projektu **vlastného AI jadra Aura** (lokálne 70B jadro,
tri izolovaní workeri, kontrolovaná hranica spracovania dát).

## Obsah repa

```
PLAN.md                                  plán prerobenia prezentácie + register rozhodnutí
presentation/
  aura-ai-prezentacia.html               ← finálna prezentácia (13 slajdov, deck + dokument režim)
  aura-ai-prezentacia.pdf                tlačová verzia, 13 strán A4 landscape
  aura-ai-prezentacia-2026-07-28.zip     balík na odoslanie: PNG + HTML + PDF + INDEX
  screens/                               31 PNG (13 slajdov × dark/light + 5 stavových)
  build/
    CONTRACT.md                          rozhranie medzi agentmi, dizajnové tokeny, slovník tried
    _source-v2_1.html                    ARCHÍV — pôvodná verzia s 21 slajdmi, needituje sa
    body.html deck.css report.css        zdrojové časti pred zlepením
    tooltips.js deck.js mode.js
    assemble.mjs                         zlepí časti do jedného self-contained HTML
    shoot.mjs                            Playwright: verifikácia + screenshoty + PDF
    asana.json INDEX.md do-asany.md      dáta pre Asana projekt a mapa PNG → task
```

## Prezentácia

Jeden self-contained HTML súbor. Jediná externá závislosť sú Google Fonts
(Playfair Display, Inter, JetBrains Mono) so systémovým fallbackom.

**Dva režimy zobrazenia**, prepínač vpravo hore:

- **Deck** — slajd = obrazovka. Navigácia klávesmi ← → Space PageUp/PageDown Home/End,
  swipe na dotyku, bodky dole v strede, progress rail hore.
- **Dokument** — scrollovaný report, všetkých 13 sekcií pod sebou. Na čítanie a posielanie.

**Dark / Light** prepínač funguje v oboch režimoch. `Ctrl+P` dá tlačovú verziu (13 strán A4 na šírku).

**Interaktívne prvky:** slovníček 40+ pojmov (bodkované linky v texte + modál), nákres „Dnes vs
Cieľ po G10" s klikateľnými prvkami, konfigurátor zostavy s prepočtom CapEx a 3-ročného TCO.

Žiadny `localStorage`, žiadna analytika, žiadne CDN skripty. Grafy sú ručné SVG.

## Dizajnový systém

Oficiálne Aura tokeny — teal `#05bcc4` / deep `#03797e`, zlatá koruna `#d8b878`,
paper dark `#0e1413` / light `#f8f4f7`. Plný zoznam v `presentation/build/CONTRACT.md`.

## Ako prezentáciu prestavať

```bash
cd presentation/build
node assemble.mjs                                   # časti → jeden HTML
node shoot.mjs ../aura-ai-prezentacia.html ../screens   # verifikácia + 31 PNG + PDF
```

`shoot.mjs` vyžaduje Playwright a Chromium v `/opt/pw-browsers/chromium`.
`playwright install` sa nespúšťa — prehliadač je predinštalovaný.

## Čísla

Všetky čísla v prezentácii sú overené k **28. 7. 2026**. Ceny hardwaru: Alza.sk, HP Store PL,
buyzero.de (s DPH, ak nie je uvedené inak). Trhový kontext: VideoCardz, Thunder Compute,
TechTimes, TrendForce, Liliputing (6–7/2026). TCO je model s viditeľnými vstupmi, nie ponuka.

Pravidlo projektu: **neznáme výsledky sa nevymýšľajú.** Kde tvrdenie nemá dôkaz, je to
na slajde napísané.
