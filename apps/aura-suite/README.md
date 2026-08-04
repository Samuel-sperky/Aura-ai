# Aura Suite — kompletný náhľad 12 aplikácií

Každá appka má vlastný priečinok, vlastný self-contained `index.html`, PNG všetkých
obrazoviek v štyroch variantoch (tmavá, svetlá, EN, mobil 390 px) a vlastný README.
Rozcestník je [`index.html`](index.html).

| # | Aplikácia | Port | Obrazovky | Čo to je |
|---|---|---|---|---|
| 01 | [Aura Marketing](marketing/index.html) | :3000 · 8091 | 12 | Marketingový kokpit: ads hierarchia s ROAS pásmami a AI banner štúdio s campaign lockom. |
| 02 | [Aura KPI](kpi/index.html) | :3030 | 12 | Mesačné a ročné KPI 12 oddelení s pásmami, uzávierkou a Team score. |
| 03 | [Aura Logistika](logistika/index.html) | :3020 | 12 | Týždenná evidencia zásielok a reklamácií naprieč 8 krajinami a 5 prepravcami. |
| 04 | [Aura HR](hr/index.html) | — | 12 | Interná evidencia: ľudia, pozície, zdieľané schránky a firemné aplikácie s nákladmi. |
| 05 | [Aura Roadmap](roadmap/index.html) | :3040 | 12 | Plánovanie, evidencia pre reporting a rozhodovacia fronta — checkpointy, šprinty a nemenné rozhodnutia. |
| 06 | [Aura Tržby](trzby/index.html) | :3050 | 12 | E-shop report tržieb — mesačné a týždenné čísla, trhy, produkty, koše a expedícia z e-shop exportov. |
| 07 | [Aura AI](mind/index.html) | :8082 | 12 | AI-mind — živá neurónová sieť skills, spomienok a projektov, ktorá sa učí z každého sedenia v Claude Code. |
| 08 | [AuraAI Chat](chat/index.html) | :8082 | 29 | Chatové okno rodiny Aura — lokálny model qwen3:4b cez Ollamu, cloud fallback so stropom a povinná citácia zdroja pri každom čísle. |
| 09 | [Aura Banner Studio](banner/index.html) | :8091 | 12 | Samostatná appka pre kampane, render frontu, QA gates, exporty a AI providerov Banner Studia. |
| 10 | [Aura Retouch Studio](retus/index.html) | :8092 | 12 | Samostatná appka pre tím retušérov: pracovná plocha pred/po, protokoly s dedičnosťou, QA kontrola a export podľa štandardov. |
| 11 | [sperky-ai](shop/index.html) | :3000 | 12 | Hlavná e-shop a marketingová appka rodiny Aura — Next.js na vetve B rodiny. |
| 12 | [Aura Hub](auhub/index.html) | :3050 | 10 | Rozcestník rodiny Aura — bez vlastnej databázy, dopytuje appky cez /api/summary a kešuje 30 s. |

## Ako to prestavať

```bash
node apps/build/aura-suite/assemble.mjs        # dáta + kit → aura-suite/**/index.html
node apps/build/shoot-suite.mjs               # → aura-suite/<app>/screens/*.png
node apps/build/aura-suite/zip.mjs            # → aura-suite/_zip/<app>.zip + aura-suite.zip
```

Súbory `index.html` sú **generované** — needituj ich. Zdroj je
`apps/build/aura-suite/` (kit.js, kit2.js, kit.css, hubpage.js, data/suite-*.js).
CSS základ sa preberá 1:1 z `apps/aura-apps-hub.html`, aby sa vizuál rodiny
nemohol rozísť ručnou kópiou.

## Dáta

Overené čísla z pamäte Aura AI sú prenesené 1:1 a označené; ostatné sú ukážkové
v reálnom objeme (tabuľky 20–40 riadkov, grafy 12 mesiacov / 12 ISO týždňov).
Konkrétne hodnoty hesiel a tajomstiev sú zámerne mimo náhľadu.
