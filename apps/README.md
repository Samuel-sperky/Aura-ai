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
  aura-apps-hub.html      ← jeden súbor: rozcestník + 6 modulov (50+ obrazoviek)
  aura-apps-hub.pdf       tlačová verzia, 62 strán A4 landscape (tmavá téma)
  screens/                81 PNG (obrazovky dark + interakčné stavy + light + mobil + EN)
  build/
    shoot.mjs             Playwright: verifikácia + PNG + PDF
```

## Moduly a obrazovky

Každý modul: **intro** → **Prehľad** → **zoznam** → **detail** → **Nastavenia** + extra stránky reálnych appiek (Analýza, Rok, Reklamácie, Timeline, Trhy, Koše, Modelky, Copy manifesty, Znalostná báza, Denníky…). Spolu 50+ obrazoviek.

| # | Modul | Reálna appka (port) | Kľúčové reálne prvky |
|---|---|---|---|
| 01 | Aura Marketing | sperky-ai (3000) + Banner Studio (8091) | ads strom s ROAS pásmami, 3 modelky s identity lockom, campaign lock, copy manifesty 8 jazykov × 5 rozmerov, QA gates + znalostná báza, ceny pre banner overlay, budget strop 300 € |
| 02 | Aura KPI | aura-kpi (3030) | plnenie (skutočnosť−Min)/(Max−Min) cap 100 %, farby ≥100/60–99/<60/sivá, monthPill + fillPill, Team score 61,9 %, reálne plnenia jún 2026, denníky Sklad/Externistky/Projekty |
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
- **Chybové stavy**: bannery s reálnymi scenármi (KPI po termíne, GLS zmluvné minimum, AI budget, pokles t30).
- **Globálne prvky**: ⌘K vyhľadávanie naprieč modulmi, panel notifikácií (zvonček), profilové menu (avatar).
- **Matica manifestov**: klik na bunku prepne editor, headline sa dá prepísať (počítadlo znakov, limit per rozmer) a uloženie prepne stav bunky.
- **Taby v denníkoch KPI** (Sklad / Externistky / Projekty) prepnú KPI karty, graf aj tabuľku.
- **Skeleton loading** pri prepínaní obrazoviek, **toasty** po akciách, **onboarding** prázdny štart.
- **Vstupné obrazovky**: `#login` → `#workspace` (výber pracovného priestoru) → hub; `#profile`.


## Live vrstva: Shop API · Import · Reporty · AuraAI chat

Iterácia „Live + AI" (3 implementačné balíky, 50 smerovacích rozhodnutí):

**Shop API konektor** — LIVE pilulka v hlavičke pre moduly s API (Tržby, Logistika,
Marketing, KPI), 5 endpointov (`orders`, `products`, `stats`, `shipping`, `returns`)
s latenciou a časom syncu, 4 stavy (live / stale / error / demo), tikajúce „pred X min"
+ tlačidlo Synchronizovať teraz (deterministický jitter ±2 % — opakovateľné demo),
mikro-glyf `● live 09:41` na KPI kartách a grafoch, prepínač **Simulovať výpadok**
(banner + odpovede chatu „z cache"), sekcia Shop API v Nastaveniach + audit log.
Štruktúra `CONNECTOR` je pripravená na rozšírenie o ďalšie endpointy.

**Import wizard** (všetkých 6 modulov) — 4 kroky: súbor (reálny CSV cez FileReader
s autodetekciou `;`/`,` a BOM, alebo vzorový súbor) → mapovanie stĺpcov (auto-match
podľa hlavičky) → validácia (typová kontrola + tabuľka chýb) → súhrn s reálnym
upsertom do tabuľky (kľúč per modul, napr. Logistika týždeň × krajina × prepravca),
undo posledného importu, história v Nastaveniach + riadok pod toolbarom.
KPI má režim **Vyplň mesiac** s predvyplnením vstupov z API.

**Report builder** — šablóny per modul, obdobie, výber sekcií (KPI / graf / tabuľka /
Zistenia), živý HTML náhľad, formáty: CSV (BOM + `;` pre Excel SK), Tlač/PDF cez
print CSS, zdieľateľný hash-odkaz; šablónované AI komentáre z reálnych čísel;
plánovanie reportov (formulár + záznam v spoločnom audite).

**AuraAI chat asistent** — dokovaný pravý panel (360 px, na mobile fullscreen),
FAB s korunkou + `⌘J` + položka v ⌘K palete; kontextová hlavička „vidí: modul /
stránka · filter"; **3 navrhované otázky pre každú stránku** s odpoveďami
z reálnych dát, povinná citácia zdroja (`API · sync` / `import` / `ukážka`),
voľný vstup s keyword matchom a fallbackom, akcie (otvoriť / filtrovať / export /
založiť) so zápisom do Aktivity detailu.

Ďalšie UX: triedenie tabuliek klikom na hlavičku (`aria-sort`), pager nad 10 riadkov,
Filter ako popover, prepínač obdobia s poznámkou o limite API.

## Banner Studio a KPI denníky (vlna W1–W4)

Štyri obrazovky, ktoré dopĺňajú pipeline Banner Studia a mesačný cyklus KPI:

**Modelky** (`#marketing/modelky`) — 3 identity (Adela, Viktória, Nikola) ako karty
s vekovým rozsahom, typom, svetmi, identity seedom a počtom bannerov; pod nimi tabuľka
priradenia modelka × kampaň so stavom zámku. 5 kampaní zo 6 je zamknutých, Black Friday
je koncept. Klik na kartu aj riadok otvorí kampaň.

**Produkty** (`#marketing/produkty`) — ceny, ktoré vstupujú do cenového overlaya
bannerov: bežná a akčná cena, počet bannerov s daným produktom, stav ceny. Prepočet mien
rieši e-shop (RO v RON, HU v HUF, BG v BGN), render preberá hotovú cenu.

**Copy manifesty** (`#marketing/manifesty`) — matica **8 jazykov × 5 rozmerov = 40 buniek**
(25 hotových / 10 konceptov / 5 chýba). Klik na bunku otvorí manifest vpravo: headline
(editovateľný, s limitom znakov per rozmer a živým počítadlom — nad limit sčervená),
subline, CTA a cenový overlay len na čítanie. Uloženie prepne bunku na „hotový“
a prepočíta legendu; ide o ukážku mechaniky, nie plný editor.

**Znalostná báza** (`#marketing/kb`) — 6 pravidiel renderu rozdelených na **hard gates**
(blokujú export: logo ≥ 8 % šírky, headline ≤ 28 znakov pre 970×250, prekryv 35 % pod
textom) a **soft rules** (identity lock, cena v mene trhu, safe area CTA), každé so zdrojom
a počtom aplikovaní. Tabuľka **learning loop** ukazuje cestu QA deviation → nové pravidlo.

**KPI denníky** (`#kpi/denniky`) — 3 taby: **Sklad** (denné zápisy W31, prijaté /
vyskladnené / inventúrny rozdiel, 21 z 22 zápisov v júli), **Externistky** (6 osôb,
hodiny, výkon, sadzba — 214 h v júli) a **Projekty** (5 projektov naviazaných na oddelenia,
jeden po termíne). Každý tab má vlastné KPI karty, graf a tabuľku; plnenia za jún
(Sklad 76,8 %, Externistky 79,4 %) sú reálne, denné hodnoty ukážkové.

Nové obrazovky sú v ⌘K palete (paleta indexuje všetky podstránky modulov) a majú vlastné
navrhované otázky v AuraAI chate.

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
Marketing `--b-mkt` (teal), KPI `--b-kpi` (jantárová zlatá), Logistika `--b-log` (oranžová),
HR `--b-hr` (violet), Roadmap `--b-road` `#2a8f96`, Tržby `--b-fin` (zelená).
Stavové `good/amber/red/violet` sú len pre badge; plnenie KPI: zelená ≥100 / žltá 60–99 / červená <60 / sivá.
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

---

# Aura AI · chat a zvyšné aplikácie (`aura-ai.html`)

Druhý náhľad v tomto priečinku — **appky rodiny, ktoré v hube nie sú**, vrátane
chatového okna. Postavené 5 agentmi (4. 8. 2026) z pamäte Aura AI.

```
apps/
  aura-ai.html            ← generovaný súbor: 6 appiek, 51 rout (247 kB)
  screens-aura-ai/        71 PNG + _prehlad.png (kontaktný list všetkých obrazoviek)
  build/
    shoot-aura-ai.mjs     Playwright: verifikácia + PNG + kontaktný list
    aura-ai/              ZDROJ — časti, z ktorých sa aura-ai.html zlepí
      assemble.mjs        build (CSS základ berie 1:1 z aura-apps-hub.html)
      extra.css           chat + bloky, ktoré hub nemá
      body.html  core.js  chat.js
      data-mind.js  data-chat.js  data-studios.js  data-shophub.js
```

**`aura-ai.html` sa needituje priamo** — je generovaný. Uprav časť v `build/aura-ai/`
a spusti `node apps/build/aura-ai/assemble.mjs`. CSS základ sa preberá zo hubu, takže
vizuálna identita rodiny sa nemôže rozísť ručnou kópiou.

| # | Appka | Port | Obrazovky |
|---|---|---|---|
| 01 | **Aura AI** (mind, refaktor Hadesa) | 8082 | Dnes · Denník · Knižnica · Mapa siete · Spomienky · Projekty · Rozhodnutia · Recall · Model a runtime · Nastavenia |
| 02 | **AuraAI Chat** | 8082 | prázdny štart · 12 konverzácií (3 plné vlákna) · Projekty · História · Šablóny · Súbory · Spotreba · Stavy · Nastavenia · zdieľané zobrazenie |
| 03 | **Aura Banner Studio** | 8091 | Prehľad · Render fronta · QA gates · Exporty · AI provider · Nastavenia |
| 04 | **Aura Retouch Studio** | 8092 | Prehľad · Retuš · Protokoly · Kontrola · Knižnica · Export |
| 05 | **sperky-ai** | 3000 | Prehľad · Produkty · Objednávky · Obsah · Nastavenia |
| 06 | **Aura Hub** | 3050 | Prehľad · Pripojenia · Prevádzka |

## Chatové UX (jadro zadania)

Rozhranie na úrovni Claude/ChatGPT, ale s pravidlami rodiny:

- **Povinná citácia zdroja** pod každou odpoveďou (`pamäť` / `appka + endpoint` /
  `súbor` / `web` / `ukážka`) — číslo bez zdroja sa nezobrazuje.
- **Volania nástrojov** (`mind_recall`, `kpi_summary`, `logistika_shipments`,
  `banner_render`, `web_search`) ako zbaliteľný blok so vstupom, výstupom a trvaním.
- **Artefakty** v pravom paneli (SQL, JSON, tabuľka, dokument) s kopírovaním a exportom.
- **Projekty** s vlastnou — viditeľnou, nie skrytou — instrukciou a súbormi.
- **Stavy**: prázdny, streamovanie (kurzor + Zastaviť), beží nástroj, chyba,
  vyčerpaný strop, lokálny model nebeží (cloud fallback), dlhý kontext (zhrnutie
  staršej časti), zdieľané read-only zobrazenie bez kompozéra.
- **Spotreba** proti stropu 300 €/mes.; lokálny beh (qwen3:4b, bge-m3) je bez ceny.
- Kompozér s prílohami, šablónami a prepínačom modelu; `Enter` odoslať,
  `Shift+Enter` nový riadok, `⌘K` hľadanie, `1`–`6` skok na appku, `←`/`→` obrazovky.

## Akcenty nových appiek

`--b-mind` `#6a7de8` · `--b-chat` `#c9457a` · `--b-ban` `#4fa8e0` ·
`--b-ret` `#c97fd8` · `--b-shop` `#9bb84a` · `--b-hub` `#8a6a3a`.
Nekolidujú s akcentmi hubu a držia pravidlo *akcent = v ktorej appke som,
stavová farba = či je číslo dobré*.

## Prestavba

```bash
node apps/build/aura-ai/assemble.mjs      # časti → apps/aura-ai.html
cd apps/build && node shoot-aura-ai.mjs   # → ../screens-aura-ai/*.png
```

## Dáta

Overené čísla z pamäte Aura AI sú prenesené 1:1 a v poznámke označené ako overené
(router qwen3 95,3 %, recall hit@5 86,7 %, MRR 0,800, `/api/search` p50 4,2 s,
505 PHP testov, kontrakt `/api/summary`, porty, workflow stavy, blokujúce štandardy
retuše). Všetko ostatné je ukážkové a označené. Konkrétne hodnoty fallback hesiel
sú zámerne mimo náhľadu — otvorené bezpečnostné body sú pomenované bez tajomstiev.

---

# Aura Suite — kompletný balík 12 aplikácií (`aura-suite/`)

Tretia a najväčšia vlna (4. 8. 2026): **všetkých 12 appiek rodiny, každá stránka
z reálnej navigácie**, popriečinkované, s PNG v štyroch variantoch a ZIPom na appku.
Podklady dodalo 14 agentov z pamäte Aura AI.

```
apps/aura-suite/
  index.html            rozcestník 12 appiek (dve skupiny)
  README.md
  _screens/             4 zábery rozcestníka
  <appka>/
    index.html          self-contained appka (funguje aj offline)
    README.md           čo appka je a čo v nej je
    screens/            všetky obrazovky: dark · light · EN · mobil 390 px + interakčné stavy
  _zip/                 aura-suite.zip (268 MB) + <appka>.zip (18–32 MB)   [negitované]
```

| # | Aplikácia | Port | Obrazovky |
|---|---|---|---|
| 01 | Aura Marketing | 3000 + 8091 | Prehľad · Kampane · Kampaň · Ads · Bannery · Modelky · Produkty · Manifesty · Znalostná báza · Čerpanie · Audit · Nastavenia |
| 02 | Aura KPI | 3030 | Prehľad · Oddelenia · Oddelenie · Vyplniť mesiac · Analýza · Rok · Na doplnenie · Denníky · SEO porada · Integrácie · Audit · Nastavenia |
| 03 | Aura Logistika | 3020 | Prehľad · Zásielky · Zásielka · Reklamácie · Reklamácia · Vývoj · Stavy · Prepravcovia · Krajiny · Import · Audit · Nastavenia |
| 04 | Aura HR | interná evidencia | Prehľad · Ľudia · Človek · Pozície · Pozícia · Org-strom · Maily · Aplikácie · Náklady · Dokumenty · Audit · Nastavenia |
| 05 | Aura Roadmap | 3040 | Prehľad · Timeline · Projekty · Projekt · Úlohy · Úloha · Šprinty · Checkpointy · Rozhodnutia · Riziká · Audit · Nastavenia |
| 06 | Aura Tržby | report | Prehľad · Mesiac · Týždne · Objednávky · Trhy · Produkty · Koše · Hodiny · Expedícia · Doprava · Definície · Nastavenia |
| 07 | Aura AI (mind) | 8082 | Dnes · Denník · Knižnica · Skill · Mapa siete · Spomienky · Projekty · Rozhodnutia · Recall · Model · MCP · Nastavenia |
| 08 | AuraAI Chat | 8082 | 20 konverzácií (6 plných vlákien) · Projekty · História · Šablóny · Súbory · Spotreba · Stavy · Nástroje · Nastavenia |
| 09 | Aura Banner Studio | 8091 | Prehľad · Kampane · Kampaň · Modelky · Produkty · Manifesty · Fronta · QA · KB · Exporty · Provider · Nastavenia |
| 10 | Aura Retouch Studio | 8092 | Prehľad · Import · Fronta · Retuš · Fotka · Protokoly · Protokol · Kontrola · Chyby · Knižnica · Export · Nastavenia |
| 11 | sperky-ai | 3000 | Prehľad · Produkty · Produkt · Objednávky · Objednávka · Zákazníci · Obsah · SEO · Feedy · Integrácie · Prevádzka · Nastavenia |
| 12 | Aura Hub | 3050 | Prehľad · Pripojenia · Kontrakt · Alerty · Health · Prevádzka · Bezpečnosť · Tokeny · Audit · Nastavenia |

## Interaktívna vrstva (v každej appke, kde ju reálna appka má)

- **Shop API konektor** — LIVE pilulka v hlavičke, mikroglyf `● live` na KPI kartách,
  synchronizácia s deterministickou odchýlkou, prepínač Simulovať výpadok, audit.
- **Import wizard** — 4 kroky: reálne CSV cez FileReader (autodetekcia `;`/`,`, BOM),
  auto-mapovanie podľa hlavičky, typová validácia s tabuľkou chýb, upsert do tabuľky
  + pás s možnosťou Vrátiť a história.
- **Report builder** — šablóny appky, obdobie, výber sekcií, živý náhľad, CSV, tlač,
  zdieľateľný odkaz, plánovanie.
- **AuraAI panel** (`⌘J`) — 3 navrhované otázky na **každú** obrazovku (spolu 430+)
  s povinnou citáciou zdroja (`appka` / `import` / `pamäť` / `ukážka`) a akciami.
- Triedenie tabuliek klikom na hlavičku, stránkovanie nad 12 riadkov, `⌘K` hľadanie,
  SK/EN, dark/light, mobil 390 px, klávesnica `←`/`→`.

## Ako to prestavať

```bash
node apps/build/aura-suite/assemble.mjs     # dáta + kit → aura-suite/**/index.html
node apps/build/shoot-suite.mjs             # → 647 PNG (dark/light/EN/mobil + stavy)
node apps/build/aura-suite/zip.mjs          # → _zip/<appka>.zip + aura-suite.zip
```

`index.html` súbory sú **generované** — zdroj je `apps/build/aura-suite/`
(kit.js, kit2.js, kit.css, hubpage.js, data/suite-*.js). CSS základ sa preberá 1:1
z `aura-apps-hub.html`, aby sa vizuál rodiny nemohol rozísť ručnou kópiou.

## Dáta

Overené čísla z pamäte Aura AI sú prenesené 1:1 a v poznámkach označené ako overené
(plnenia KPI jún 2026, Team score 61,9 %, tržby júl 2026 217 016 €, marža 66,1 %,
GLS minimum ~280/deň, doručenosť 94,1 %, router qwen3 95,3 %, recall hit@5 86,7 %,
kontrakt `/api/summary`, workflow retuše, 43 migrácií sperky-ai, porty rodiny).
Ostatné hodnoty sú ukážkové v reálnom objeme (tabuľky 20–40 riadkov, grafy 12 mesiacov
alebo 12 ISO týždňov) a označené. Konkrétne hodnoty hesiel a tajomstiev sú zámerne
mimo náhľadu — otvorené bezpečnostné body sú pomenované bez tajomstiev.
