# INDEX — 31 screenshotov a ich Asana tasky

Prezentácia **Aura AI · Vlastné AI jadro**, stav k 28. 7. 2026.
Tento súbor je návod pre človeka, ktorý bude PNG ručne pripájať k taskom v Asane.

---

## Čo je v ZIPe

`aura-ai-prezentacia-2026-07-28.zip`

```
screens/                      31 PNG, 3840 × 2160 (1920×1080 @2× DPR)
aura-ai-prezentacia.html      finálna prezentácia, jeden self-contained súbor
aura-ai-prezentacia.pdf       print CSS → 13 strán A4 landscape
INDEX.md                      tento súbor
PLAN.md                       plán prerobenia a register rozhodnutí
```

**31 PNG = 26 + 5**

- 26 = 13 slajdov × `dark` a `light`
- 5 = stavové zábery: nákres Pred/Po v dvoch stavoch (`04-predapo-dnes`, `04-predapo-ciel`)
  a konfigurátor v troch scenároch (`10-konfigurator-A-17k`, `-B-33k`, `-C-54k`)

Všetky zábery sú z **deck** režimu. Dokumentový režim sa neschraňuje (PLAN.md R09).

---

## Ako pripojiť prílohu v Asane

1. Otvorte task (napr. `S07 · Hardware — čo sme posúdili a čo prešlo #cislo #brana`).
2. Posledný riadok popisu začína `SCREENSHOT:` — hovorí, ktorý súbor tam patrí.
3. V detaile tasku kliknite na ikonu spony (**Attach → Upload from computer**) a vyberte súbor
   z adresára `screens/`. Alebo súbor jednoducho pretiahnite myšou do poľa komentára a odošlite.
4. Ak má task v riadku `SCREENSHOT:` viac súborov (S04 a S10), priložte všetky — sú to stavy
   toho istého slajdu.

**Svetlé varianty (`-light`) sú na tlač a do podkladov — prílohou v Asane byť nemusia.**
Na obrazovke sa prezentácia ukazuje v dark režime, preto majú tasky v popise uvedený `-dark` súbor.

---

## Tabuľka PNG → Asana task

| PNG | Slajd | Asana sekcia | Asana task |
|---|---|---|---|
| `01-hero-dark.png` | 01 Vlastné AI jadro. Naše dáta zostanú doma. | 01 · Prehľad a architektúra | S01 · Vlastné AI jadro — naše dáta zostanú doma #rozhodnutie #cislo |
| `01-hero-light.png` | 01 — svetlá verzia (tlač) | 01 · Prehľad a architektúra | S01 · Vlastné AI jadro — naše dáta zostanú doma #rozhodnutie #cislo |
| `02-ai-dnes-dark.png` | 02 Ako AI používame už dnes — MCP a Hades | 01 · Prehľad a architektúra | S02 · Ako AI používame už dnes — MCP a Hades #hotove |
| `02-ai-dnes-light.png` | 02 — svetlá verzia (tlač) | 01 · Prehľad a architektúra | S02 · Ako AI používame už dnes — MCP a Hades #hotove |
| `03-architektura-dark.png` | 03 Jedno jadro, tri izolované ruky | 01 · Prehľad a architektúra | S03 · Jedno jadro, tri izolované ruky #brana |
| `03-architektura-light.png` | 03 — svetlá verzia (tlač) | 01 · Prehľad a architektúra | S03 · Jedno jadro, tri izolované ruky #brana |
| `04-predapo-dark.png` | 04 Pred a po — prepnite stav | 01 · Prehľad a architektúra | S04 · Pred a po — prepnite stav #rozhodnutie #brana |
| `04-predapo-light.png` | 04 — svetlá verzia (tlač) | 01 · Prehľad a architektúra | S04 · Pred a po — prepnite stav #rozhodnutie #brana |
| `04-predapo-dnes.png` | 04 **stav Dnes** — všetko prechádza hranicu | 01 · Prehľad a architektúra | S04 · Pred a po — prepnite stav #rozhodnutie #brana |
| `04-predapo-ciel.png` | 04 **stav Cieľ po G10** — jadro vľavo od hranice | 01 · Prehľad a architektúra | S04 · Pred a po — prepnite stav #rozhodnutie #brana |
| `05-bezpecnost-dark.png` | 05 Bezpečnosť a hranica dát — štyri zóny | 02 · Bezpečnosť a hranica dát | S05 · Bezpečnosť a hranica dát — štyri zóny #riziko #brana |
| `05-bezpecnost-light.png` | 05 — svetlá verzia (tlač) | 02 · Bezpečnosť a hranica dát | S05 · Bezpečnosť a hranica dát — štyri zóny #riziko #brana |
| `06-trh-ceny-dark.png` | 06 Pamäť je nedostatkový tovar | 03 · Hardware | S06 · Pamäť je nedostatkový tovar — ceny +55 % #cislo #riziko |
| `06-trh-ceny-light.png` | 06 — svetlá verzia (tlač) | 03 · Hardware | S06 · Pamäť je nedostatkový tovar — ceny +55 % #cislo #riziko |
| `07-hardware-dark.png` | 07 Hardware — čo sme posúdili a čo prešlo | 03 · Hardware | S07 · Hardware — čo sme posúdili a čo prešlo #cislo #brana |
| `07-hardware-light.png` | 07 — svetlá verzia (tlač) | 03 · Hardware | S07 · Hardware — čo sme posúdili a čo prešlo #cislo #brana |
| `08-capex-dark.png` | 08 Tri scenáre CapEx: 17 · 33 · 54 tisíc € | 04 · Financie a TCO | S08 · Tri scenáre CapEx: 17 · 33 · 54 tisíc € #cislo #rozhodnutie |
| `08-capex-light.png` | 08 — svetlá verzia (tlač) | 04 · Financie a TCO | S08 · Tri scenáre CapEx: 17 · 33 · 54 tisíc € #cislo #rozhodnutie |
| `09-tco-dark.png` | 09 TCO na 3 roky — a prečo prenájom nie je alternatíva | 04 · Financie a TCO | S09 · TCO na 3 roky — a prečo prenájom nie je alternatíva #cislo |
| `09-tco-light.png` | 09 — svetlá verzia (tlač) | 04 · Financie a TCO | S09 · TCO na 3 roky — a prečo prenájom nie je alternatíva #cislo |
| `10-konfigurator-dark.png` | 10 Poskladajte si zostavu | 04 · Financie a TCO | S10 · Poskladajte si zostavu — konfigurátor #cislo |
| `10-konfigurator-light.png` | 10 — svetlá verzia (tlač) | 04 · Financie a TCO | S10 · Poskladajte si zostavu — konfigurátor #cislo |
| `10-konfigurator-A-17k.png` | 10 **scenár A** — 48 GB jadro + 3× Mini Basic | 04 · Financie a TCO | S10 · Poskladajte si zostavu — konfigurátor #cislo |
| `10-konfigurator-B-33k.png` | 10 **scenár B** — 96 GB jadro + 3× Mini Standard | 04 · Financie a TCO | S10 · Poskladajte si zostavu — konfigurátor #cislo |
| `10-konfigurator-C-54k.png` | 10 **scenár C** — 192 GB jadro + 3× DGX Spark | 04 · Financie a TCO | S10 · Poskladajte si zostavu — konfigurátor #cislo |
| `11-harmonogram-dark.png` | 11 26 týždňov, 11 brán, žiadne skratky | 05 · Brány a testy | S11 · 26 týždňov, 11 brán, žiadne skratky #brana |
| `11-harmonogram-light.png` | 11 — svetlá verzia (tlač) | 05 · Brány a testy | S11 · 26 týždňov, 11 brán, žiadne skratky #brana |
| `12-testy-rollout-dark.png` | 12 Od testov k rolloutu | 05 · Brány a testy | S12 · Od testov k rolloutu #brana #riziko |
| `12-testy-rollout-light.png` | 12 — svetlá verzia (tlač) | 05 · Brány a testy | S12 · Od testov k rolloutu #brana #riziko |
| `13-rozhodnutia-dark.png` | 13 Najbližších 45 dní rozhodne o celej investícii | 06 · Rozhodnutia | S13 · Najbližších 45 dní rozhodne o celej investícii #rozhodnutie #brana |
| `13-rozhodnutia-light.png` | 13 — svetlá verzia (tlač) | 06 · Rozhodnutia | S13 · Najbližších 45 dní rozhodne o celej investícii #rozhodnutie #brana |

Číslo v názve súboru = číslo slajdu = číslo v názve Asana tasku. Nič sa nedá zameniť.

---

## Poznámka k názvom scenárov konfigurátora

Prípona `-17k`, `-33k`, `-54k` je **označenie scenára z slajdu 08** („Tri scenáre CapEx: 17 · 33 · 54 tisíc €"),
nie odčítaná hodnota z konfigurátora. Konfigurátor má vlastný infra blok 4 840 € (UPS 900 + 10GbE 700 +
NAS 2 700 + off-site 540), kým stack na slajde 08 počíta s ~3 500 €, takže `#oCap` vydá:

| Scenár | Zostava v konfigurátore | `#oCap` | Hlavička slajdu 08 |
|---|---|---|---|
| A | Basic 48 GB · platforma úsporná · 3× Mini Basic · celá infra | 18 059 € | ~16 900 € |
| B | Standard 96 GB · platforma solidná · 3× Mini Standard · celá infra | 34 779 € | ~32 900 € |
| C | Premium 2× 96 GB · platforma pre 2 karty · 3× DGX Spark · celá infra | 54 638 € | ~54 300 € |

Slajd 10 to sám priznáva: „konfigurátor je nástroj na rozhovor, nie zdroj pravdy; tým zostáva vzorcový
XLSX v úlohe FIN-002". `shoot.mjs` tieto hodnoty pri každom behu odčíta, vypíše a **zlyhá**, ak sa
zmenia — to by znamenalo, že sa v cenovom modeli pohnulo číslo (CONTRACT.md §6.1).
Kto chce názvy súborov podľa skutočnej hodnoty, spustí `shoot.mjs` s `--rename-actual`; potom treba
prepísať aj túto tabuľku a riadky `SCREENSHOT:` v `asana.json`.

---

## Ako sa PNG a PDF vyrábajú

```bash
cd presentation
node build/shoot.mjs aura-ai-prezentacia.html ./dist
#   → dist/screens/*.png            31 PNG
#   → dist/aura-ai-prezentacia.pdf  13 strán A4 landscape
```

Skript najprv beží verifikáciou (13 sekcií `.s`, `#ct` = `/ 13`, klik na každý interaktívny prvok,
4 kombinácie režim × téma, žiadne `NaN`, všetky SVG vykreslené, Tab audit na outline, 390 px bez
horizontálneho scrollu) a **pri akomkoľvek zlyhaní skončí nenulovým exit kódom** — screeny sa
napriek tomu urobia, aby bolo vidieť, ako to vyzeralo.

Chromium je predinštalované v `/opt/pw-browsers/chromium`. `playwright install` sa **nespúšťa nikdy**.
