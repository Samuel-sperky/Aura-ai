# AuraAI — prototyp rozhrania (v6)

Offline, self-contained náhľad rozhrania AuraAI. `auraai-app.html` sa dá otvoriť priamo
v prehliadači — bez servera, bez siete, bez localStorage.

## Zostavenie

```
node build/assemble.mjs          # build/* → auraai-app.html
node build/verify.mjs <cesta-k-auraai-app.html> <výstupný-priečinok>
```

`verify.mjs` je Playwright sada (59 kontrol): JS chyby, offline, routing, grafy s osami,
kontrast AA v oboch témach, typografia, mobil 360/390/414/768 (pretok, dotykové ciele ≥ 44 px,
drawer, tap tooltip) a funkčné kontroly Appiek a Pamäte.

## Štruktúra

| Súbor | Obsah |
|---|---|
| `base.html` | kostra, navigácia, topbar, peek panel, modály |
| `shell.css` · `shell.js` | dizajnové tokeny a shell API (`Aura.go/detail/confirm/toast/sortable/…`) |
| `engine.js` | `AuraChart` — ručný SVG engine (line/area/bar/stacked/heatmap/gauge/donut/sparkline/uptime/timeline) |
| `data.js` | kanonické modely: `Aura.mem` (pamäť), `Aura.autos` (automatizácie), `Aura.apps` (appky) |
| `s-pamat.*` | Pamäť — graf, triage, hľadanie, sprievodca čistenia |
| `s-appky.*` | Appky — zoznam nasadení + per-app dashboard (KPI → behy → náklady → pamäť) |
| `s-praca.*` | Chat · Smernica · Automatizácie |
| `s-system.*` | Jadro · Náklady · Observabilita · Nastavenia |
| `boot.js` | dopojenie kostry, sekcie, odznaky v navigácii, zvonček |

## v6 — Appky

Appka = nasadenie, ktoré beží nad tým istým lokálnym jadrom. Väzba na automatizácie ide cez
oddelenia, väzba na pamäť cez oddelenie/tag. E-shop Šperky je prvá appka (starý odkaz `#/eshop`
presmeruje na `#/appky/eshop`). Appku sa dá pridať z UI aj spravovať v Nastaveniach.
