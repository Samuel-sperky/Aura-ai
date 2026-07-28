# PLAN — AuraAI prezentácia v3 + Asana baseline

Dátum: 28. 7. 2026 · Zdroj: `presentation/build/_source-v2_1.html` (21 slajdov, 1 598 riadkov, 140 KB)
Stav: **čaká na schválenie**, potom exekúcia 4 agentmi.

---

## 0 · Register rozhodnutí (30 otázok, zodpovedané 28. 7. 2026)

| # | Rozhodnutie | Voľba |
|---|---|---|
| R01 | Účel Asana projektu | **Obsah prezentácie** — 1 task = 1 slajd, subtasky = tvrdenia a čísla |
| R02 | Väzba na pôvodný AuraAI projekt | **Žiadna** — úplne samostatný projekt, čísla staticky v taskoch |
| R03 | Počet slajdov | **21 → 13** |
| R04 | Padá / zlieva sa | Päť ciest · Offline režim · Deväť rozmerov (= Pred a po v číslach) |
| R05 | Dizajn „úplný" | stavy komponentov + zjednotenie Aura tokenov + koruna ♛ v hero + responzív 390 px |
| R06 | Formát | **Deck + report režim v jednom súbore**, prepínač vpravo hore |
| R07 | Fonty | Google Fonts CDN + systémový fallback |
| R08 | Tlač | `@media print`, 1 slajd = 1 strana A4 landscape |
| R09 | Screenshoty | 13 slajdov × dark + light = **26 PNG** + **5 stavových** = 31 PNG |
| R10 | Rozlíšenie | 1920×1080 @2× DPR (PNG 3840×2160) |
| R11 | Stavy | nákres Dnes / Cieľ + konfigurátor scenár A / B / C |
| R12 | ZIP obsahuje | PNG + finálne HTML + `INDEX.md` + PDF + `PLAN.md` |
| R13 | Asana projekt | `AuraAI · Prezentácia baseline (07/2026)`, Board, dark-teal, public_to_workspace, owner = ja |
| R14 | Hĺbka | 6 sekcií → 13 slajdových taskov (+1 navigačný) → 3–6 subtaskov (~55) |
| R15 | Popis tasku | 4 pevné riadky: ČO SLAJD TVRDÍ / ZDROJ ČÍSEL / ČO CHÝBA DO BRÁNY / SCREENSHOT |
| R16 | Termíny | G1 = 7. 8. · G2 = 28. 8. · G3 = 11. 9., ostatné bez dátumu |
| R17 | Assignee | ja na všetko |
| R18 | Navigačný task | `ZAČNI TU` ako prvý task |
| R19 | Hashtag filtre | `#rozhodnutie #cislo #brana #riziko #hotove` v názvoch |
| R20 | Publikum | **manažment / p. Ruščák — schvaľuje investíciu** |
| R21 | Text | max 3 boxy + 1 vizuál na slajd, tooltipy na ~12 pojmov (modál zostane celý) |
| R22 | Agenti | **4** — CSS rozdelené na deck a report/print |
| R23 | Odovzdanie | commit do repa + súbory do chatu + Hades `mind_learn` |
| R24 | PR | nezakladá sa, kým nepovieš |
| R25 | Rozpor 1 879 € medzi konfigurátorom a scenárom B | **prizná sa na slajde, žiadne číslo sa nemení** — rozhodol hlavný agent, otázka zostala nezodpovedaná |
| R26 | Inline tooltipy | **14 v próze a KPI/bars, SVG a HW tabuľka si nechávajú svojich 16** — rozhodol hlavný agent, otázka zostala nezodpovedaná |

### R25 · Rozpor 1 879 € — čo sa reálne stalo

Konfigurátor na s10 má v HTML predvyplnené `32 900 € / 65 300 € / 1 814 €` (scenár B zo slajdov 08 a 09),
ale jeho `calc()` pri načítaní prepočíta default zostavu (Main Standard 96 GB 14 849 € + platforma Solidná
4 500 € + 3× Mini Standard 3 530 € + infra UPS/10GbE/NAS/off-site) na **34 779 € / 67 577 € / 1 877 €**.
Rozdiel v CapEx je **1 879 €**.

Je to rozpor **v zdrojovom súbore**, nie chyba prenosu — A1 overil všetky čísla proti zdroju s nulovou
nezhodou. Riešenie: na s10 pribudol vecný riadok, ktorý rozpor pomenúva a odkazuje ho na G3.
Žiadne číslo sa neprepísalo, pretože obe strany rozporu sú overené dáta (katalógové ceny k 28. 7. 2026
verzus model FIN-002) a projekt má vlastné pravidlo „neznáme výsledky sa nevymýšľajú".
V Asane z toho vzniká task s `#riziko` v sekcii `04 · Financie a TCO`.

**Dôsledok pre screenshoty:** `10-konfigurator-B-33k.png` bude ukazovať 34 779 €, nie 32 900 €.

### R26 · Tooltipy — prečo 14 a nie 12

R21 hovorí ~12 inline pojmov. V próze, KPI stripoch a `.bars` ich je **14** (12 vybraných A1
+ `msrp` na slajde cien GPU + `edge` v Hades bloku — oba padajú mimo SVG a tabuľky).
SVG nákresy na s03 a s05 a HW tabuľka na s07 si podľa pravidla „prenesené vizuály 1:1"
nechali svojich **16** pôvodných pojmov (RBAC, ECC, CONDITIONAL, NON-COMPLIANT, RPO/RTO, segmentácia…).

Zámer R21 bol odstrániť rušivé podčiarknutie v súvislom texte — to je splnené.
V tabuľke a v nákrese podčiarknutie čítanie neruší a `CONDITIONAL` / `NON-COMPLIANT`
sú presne tie pojmy, ktoré manažér potrebuje vysvetlené na mieste. Modál má všetkých 44.

### Zistená nepresnosť v odpovediach

Voľby „Deväť rozmerov zrelosti" a „Pred a po v číslach" ukazujú na **ten istý slajd**
(sekcia na riadku 1155: eyebrow `18 · Pred a po v číslach`, h2 `Deväť rozmerov, na ktorých sa to dá zmerať`).
Reálne teda padajú **3 slajdy → 18**. Do 13 sú potrebné ešte **5 zlúčení** — sú nižšie ako **[Z1]–[Z5]**
a sú to jediné položky plánu, ktoré ešte nemáš odklikané.

---

## 1 · Mapa 21 → 13 slajdov

Poradie je prestavané pre publikum **manažment schvaľujúci investíciu**: dôveryhodnosť („toto už beží")
ide dopredu, financie do stredu ako ťažisko, rozhodnutia na konec.

| Nový | Názov | Vznikol z | Zmena |
|---|---|---|---|
| **01** | Vlastné AI jadro. Naše dáta zostanú doma. | 01 hero | + koruna ♛, + eyebrow `Šperky Aura · Investičné rozhodnutie` |
| **02** | Ako AI používame už dnes — MCP a Hades | **17 + 04** | **[Z1]** pipeline zápisu z porady sa stane konkrétnym príkladom vnútri slajdu, nie vlastným slajdom |
| **03** | Jedno jadro, tri izolované ruky | 02 architektúra | text z 5 boxov na 3 |
| **04** | Pred a po — prepnite stav (interaktívne) | 18 | zostáva v plnej sile, len kratší popis |
| **05** | Bezpečnosť a hranica dát — štyri zóny | **13 + 03** | **[Z2]** offline režim ako 4. box („offline nie je havária, je to testovaný stav") |
| **06** | Pamäť je nedostatkový tovar — ceny +55 % | 06 | bez zmeny obsahu, kratšie texty |
| **07** | Hardware — čo sme posúdili a čo prešlo | **07 + 09 + 08** | **[Z3]** tabuľka zostáva ako vizuál; priepustnosť pamäti a 5 alternatív sa zmestia do 3 boxov + tiny riadok |
| **08** | Tri scenáre CapEx: 17 · 33 · 54 tisíc € | 10 | nedotknuté (R03 „nedotknuteľné") |
| **09** | TCO na 3 roky — a prečo prenájom nie je alternatíva | **11 + 12** | **[Z4]** cloud prenájom ako 3 boxy pod TCO tabuľkou |
| **10** | Poskladajte si zostavu (konfigurátor) | 20 | zostáva v plnej sile |
| **11** | 26 týždňov, 11 brán, žiadne skratky | 05 | bez zmeny obsahu |
| **12** | Od testov k rolloutu | **14 + 15** | **[Z5]** 6 testov ako timeline vľavo, 4 vlny rolloutu vpravo |
| **13** | Najbližších 45 dní rozhodne o celej investícii | **21 + 16** | 3 veci držiace projekt v žltej sa stanú kontextom pre 2 rozhodnutia na dnes |

**Padá úplne:** slajd 19 (Deväť rozmerov zrelosti / Pred a po v číslach) — vlastným textom priznáva,
že sú to odhady a nie merania; pred manažmentom je to slabé miesto.

### Tvrdé pravidlo pre obsah

Žiadne číslo sa nesmie zmeniť, dopočítať ani zaokrúhliť. Všetkých 21 slajdov obsahuje čísla s dátumom
overenia 28. 7. 2026 — prenášajú sa **verbatim**. Čo sa nezmestí, ide do Asany ako subtask, nie do koša.

---

## 2 · Dizajn a technika

### 2.1 Zjednotenie tokenov (R05)

Deck má dnes vlastnú paletu, ktorá sa rozchádza s Aura štandardom. Zjednocuje sa na oficiálne hodnoty:

| Token | Dnes v decku | Aura štandard | Akcia |
|---|---|---|---|
| `--paper` dark | `#0b100f` | `#0e1413` | zmeniť |
| `--card` dark | `#121a19` | `#131b1a` | zmeniť |
| `--card-2` dark | `#0f1615` | `#1b2523` (track) | zmeniť |
| `--line` dark | `#22302e` | `#22302e` | OK |
| `--ink` dark | `#eaf3f2` | `#e8f0ef` | zmeniť |
| `--ink-2` / `--ink-3` | `#96aaa8` / `#637674` | `#b9c9c7` / `#829896` | zmeniť |
| `--paper` light | `#f8f4f7` | `#f8f4f7` | OK |
| `--teal` / `--teal-2` / `--gold` | `#05bcc4` / `#03797e` / `#d8b878` | rovnaké | OK |
| semantické | `--amber #e8a33d` `--red #e0574f` | `warn = gold`, `risk #e0554e` | `--red` → `#e0554e`, amber zostáva ako warn-tón decku |

Pridáva sa `--good #3fbf7f` (dnes chýba) a `--violet` zostáva len na badge `q`.

### 2.2 Chýbajúce stavy

- `:focus-visible` má dnes len `.pill`, `.seg button`, `.opts button`, `.ix .hot` — dopĺňa sa na
  `#dots span`, `.tt`, `#gx`, hlavičky tabuliek, riadky tabuliek s klikom
- hover na `tbody tr` existuje, chýba `aria-current` stav
- prázdny stav detail panelu `.dp` existuje, chýba stav „nič nevybrané" po prepnutí režimu
- `prefers-reduced-motion` je pokryté v JS, chýba v CSS pre `.wm`, `.bar .tr i`, `.stack i`

### 2.3 Deck + report režim (R06) — najväčšia položka

Jeden súbor, dva režimy, prepínač `Deck / Dokument` v `#top` vedľa `Dark/Light`:

- **Deck** = dnešný stav: `body{overflow:hidden}`, `.s{position:absolute;inset:0}`, len `.s.on` viditeľná
- **Dokument** = `html[data-mode="doc"]`: `body{overflow:auto}`, všetky `.s{position:static;display:block}`,
  medzi sekciami `border-top`, číslovanie `.snum 01..13`, scroll-progress rail sa prepne z „slajd N/13"
  na skutočný scroll, `#dots` a `#nav` sa skryjú, IntersectionObserver reveal namiesto `.s.on .an`
- prepínač si **nepamätá** stav (žiadny localStorage — Aura tvrdé pravidlo), default = Deck
- `#ct` v doc režime zobrazuje aktuálnu sekciu podľa scroll pozície

### 2.4 Print (R08)

`@media print`: `data-theme` forced light, biele pozadie, `#top #dots #nav #rail` skryté,
`.s{position:static;display:block;page-break-after:always}`, `break-inside:avoid` na `.c .box .kpi`,
tabuľky bez `overflow-x`, tooltipy rozvinuté ako poznámky pod slajdom.

### 2.5 Responzív 390 px

Dnes končí na 600 px a body má `overflow:hidden` → na mobile sú tabuľky a konfigurátor rozbité.
Pridáva sa `@media(max-width:430px)`: `.s{padding:44px 14px}`, `#top` dvojriadkový, `#dots` scrollovateľný,
`.tw` s `min-width:520px` a viditeľným scroll hintom, konfigurátor `.opts` do jedného stĺpca,
`.split` bez `align-items:center`.

---

## 3 · Asana projekt

**Názov:** `AuraAI · Prezentácia baseline (07/2026)`
**Team:** `My Workspace` (`1201420576888217`) · **View:** Board · **Farba:** dark-teal
**Privacy:** public_to_workspace · **Owner + assignee:** ja

Známa pasca (Hades): sekcie sa dajú vytvoriť **len** pri `create_project` → celá kostra vzniká jedným
volaním. `html_notes` s diakritikou padá → všade **plain-text `notes`**.

### Štruktúra: 6 sekcií · 14 taskov · ~55 subtaskov

| Sekcia | Tasky | Termín |
|---|---|---|
| `01 · Prehľad a architektúra` | ZAČNI TU · S01 Hero · S02 Ako AI používame dnes · S03 Architektúra · S04 Pred a po | — |
| `02 · Bezpečnosť a hranica dát` | S05 Štyri zóny + offline | — |
| `03 · Hardware` | S06 Trh a ceny · S07 Hardware porovnanie | G3 · 11. 9. |
| `04 · Financie a TCO` | S08 Tri scenáre CapEx · S09 TCO 3 roky · S10 Konfigurátor | G3 · 11. 9. |
| `05 · Brány a testy` | S11 26 týždňov 11 brán · S12 Od testov k rolloutu | G2 · 28. 8. |
| `06 · Rozhodnutia` | S13 Najbližších 45 dní | G1 · 7. 8. |

### Formát tasku

```
Názov:  S07 · Hardware — čo sme posúdili a čo prešlo #cislo #brana
Popis:  ČO SLAJD TVRDÍ: O rýchlosti 70B nerozhodujú TOPS, ale priepustnosť pamäti.
        96 GB VRAM je bezpečná zóna, 128 GB unified je pasca na papieri.
        ZDROJ ČÍSEL: Alza.sk, HP Store PL, buyzero.de — overené 28. 7. 2026, s DPH.
        ČO CHÝBA DO BRÁNY: druhá cenová kontrola ku každému kandidátovi, platnosť
        ponuky, dodacia lehota, záruka → register FIN-001.
        SCREENSHOT: 07-hardware-dark.png
```

Subtasky = jednotlivé tvrdenia a čísla, napr. `96 GB FP8 — 70B sa zmestí vrátane rezervy na kontext`,
`128 GB unified — priepustnosť 6× nižšia`, `32 GB — 70B v Q8 sa nezmestí ani na RTX 5090`,
`Main Basic zostáva CONDITIONAL — 48 GB bez benchmarku`, `Sekundárny trh = úspora 6 228 € na kartu`.

### Hashtagy

`#rozhodnutie` (vyžaduje tvoje rozhodnutie) · `#cislo` (obsahuje číslo na obhajobu) ·
`#brana` (viazané na G1–G10) · `#riziko` (RAID register) · `#hotove` (dôkaz existuje)

---

## 4 · Screenshoty a ZIP

Playwright + predinštalované Chromium (`/opt/pw-browsers/chromium`, **žiadny `playwright install`**).

- viewport `1920×1080`, `deviceScaleFactor: 2` → PNG `3840×2160`
- `13 × dark` + `13 × light` = 26
- stavové: `04-predapo-dnes`, `04-predapo-ciel`, `10-konfigurator-A-17k`,
  `10-konfigurator-B-33k`, `10-konfigurator-C-54k` = 5
- **celkom 31 PNG**, názvy `NN-nazov-{dark|light}.png` → číslo = číslo Asana tasku

**Verifikácia pred snímaním** (Aura štandard): `pageerror` listener, klik na všetky `.pill`, `.seg button`,
`.opts button`, `.ix .hot`, `.tt`, `#gl`, `#gx`, prepínač Deck/Dokument, kontrola že v `document.body.innerText`
nie je `NaN`, kontrola že sa vykreslili všetky SVG grafy, kontrola oboch režimov v dark aj light.

**ZIP `aura-ai-prezentacia-2026-07-28.zip`:**
```
screens/               31 PNG
aura-ai-prezentacia.html
aura-ai-prezentacia.pdf     (print CSS → PDF, 13 strán A4 landscape)
INDEX.md                    tabuľka PNG → Asana task
PLAN.md                     tento súbor
```

---

## 5 · Exekúcia — 4 agenti

Pred spustením napíšem `presentation/build/CONTRACT.md` — zoznam tokenov, názvy tried, ID slajdov
a rozhranie medzi súbormi. Bez neho by sa agentom rozišli názvy tried a zlepenie by padlo.

| Agent | Píše výhradne | Zadanie |
|---|---|---|
| **A1 · Obsah** | `build/body.html` + `build/tooltips.json` | 13 slajdov podľa mapy v §1, tón pre manažment, max 3 boxy + 1 vizuál, čísla verbatim, výber 12 tooltip pojmov, zvyšné texty vypísať do `build/do-asany.md` |
| **A2 · Deck CSS** | `build/deck.css` | zjednotenie tokenov (§2.1), chýbajúce stavy (§2.2), 390 px (§2.5), deck layout a animácie |
| **A3 · Report + print** | `build/report.css` + `build/mode.js` | doc režim (§2.3), prepínač Deck/Dokument, print CSS (§2.4), IntersectionObserver reveal |
| **A4 · Screeny + Asana** | `build/shoot.mjs` + `build/asana.json` | Playwright skript, verifikačná checklist, Asana kostra (6 sekcií, 14 taskov, ~55 subtaskov) ako dáta |

**Beh:** A1 · A2 · A3 · A4 paralelne (disjunktné súbory) → ja zlepím do jedného self-contained HTML
→ verifikácia → A4 dobehne screeny, ZIP a `create_project` → Hades `mind_learn` → commit + push.

### Akceptačné kritériá

1. Presne 13 sekcií `.s`, `#ct` ukazuje `/ 13`
2. Jeden súbor, jediná externá závislosť = Google Fonts; žiadny `localStorage`
3. Deck aj Dokument režim funkčný v dark aj light — 4 kombinácie bez `pageerror`
4. Nikde v texte `NaN`; všetky čísla zhodné so zdrojovým súborom (diff kontrola)
5. Focus-visible na každom klikateľnom prvku, prejdené Tabom od začiatku po konec
6. 390 px bez horizontálneho scrollu na `body`
7. `Ctrl+P` → 13 strán, žiadny slajd rozrezaný na dvoje
8. 31 PNG v ZIPe, každý názov má zodpovedajúci task v Asane
9. Asana: 6 sekcií, 14 taskov, každý slajdový task má 4-riadkový popis a ≥3 subtasky
10. Pôvodný `_source-v2_1.html` zostáva v repe nedotknutý ako archív

### Čo v pláne zámerne nie je

- PR (R24 — až na vyžiadanie)
- väzba na pôvodný Asana projekt AuraAI (R02)
- base64 fonty (R07)
- report režim v screenshotoch (R09)
