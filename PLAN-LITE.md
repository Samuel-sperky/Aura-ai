# PLAN — Aura AI Lite (druhý deck)

Samostatná prezentácia o tom, čo sa dá postaviť **dnes** dokúpením troch komponentov do existujúceho PC.
Nezávislá od `PLAN.md` (13-slajdový investičný deck) — ten zostáva nedotknutý.

Dátum: 28. 7. 2026 · Stav: **čaká na schválenie**

---

## 0 · Register rozhodnutí (10 otázok, zodpovedané 28. 7. 2026)

| # | Rozhodnutie | Voľba |
|---|---|---|
| N01 | Kam to ide | **Samostatný súbor** `presentation/aura-ai-lite.html`, druhý deck |
| N02 | Vzťah k scenárom 17/33/54 k€ | **Náhrada celej HW časti** — scenáre A–C sa v tomto decku nepoužívajú |
| N03 | Súčasná zostava | AMD 9900 s **integrovanou** grafikou · 48 GB RAM · MSI doska · 1 TB Samsung |
| N04 | Grafická karta | **Viacero variant na výber**: RTX PRO 4000 / 4500 / 5000 Blackwell |
| N05 | Apollo model | **Orchestračná vrstva** — diverzifikuje prácu medzi cortexy a MCP, ich výstupy spracuje do jedného a podá jeden výstup. **Samostatný vývojový projekt.** |
| N06 | 5 cortexov | Podľa existujúcich Aura appiek: Marketing a SEO · Import a sklad · Financie a účtovníctvo · Fotenie, video a retuš · IT a vývoj |
| N07 | Ceny | Overiť naostro na webe, neoveriteľné označiť ako Budgetary |
| N08 | VPN | **WireGuard, vlastný server** v Dockeri |
| N09 | Token scope | **Rozpočet na stroj + tvrdý strop.** Po vyčerpaní úloha ide do fronty alebo spadne na lokálny model. |
| N10 | Deck obsahuje navyše | zálohovanie s RPO/RTO · mini PC so zdieľaním výkonu · e-shop API Šperky · riadené obmedzenia a samostatné rozhrania |
| N11 | Smer volania | **Aura AI je aj MCP klient** — vloží prompt do Claude, odpoveď vráti späť do lokálneho chatu |

### N03 — čo dokúpenie reálne znamená

Zadanie „dokúpiť 48 GB RAM + RTX VRAM 32 GB + 1 TB" proti súčasnému stavu:

| Komponent | Dnes | Po dokúpení | Poznámka |
|---|---|---|---|
| RAM | 48 GB | **96 GB** | zdvojnásobenie, nie výmena — treba overiť voľné sloty a rovnaký kit |
| GPU | integrovaná v AMD 9900 | **prvá dedikovaná, 32 GB VRAM** | dnes na lokálny model prakticky nie je čím počítať |
| Disk | 1 TB Samsung | **2 TB** (1 + 1) | druhý NVMe na modely a zálohy, prvý zostáva systémový |

**Musí sa overiť pred nákupom** (nemám to od teba a nevymýšľam si to):
počet a obsadenosť DIMM slotov, presný model MSI dosky, výkon zdroja vo W,
voľný PCIe x16 slot a jeho dĺžka, voľný M.2 slot, rozmery skrine a chladenie.
Každý z týchto bodov dostane v decku vlastný riadok **OVERIŤ PRED NÁKUPOM**.

### N11 — dva smery volania, ktoré sa nesmú zamieňať

- **Smer A · Aura AI ako MCP server.** Claude (Code, desktop) sa pripojí a volá nástroje Aury —
  recall, dotaz do cortexu, zápis. Klientom je Claude. Toto už dnes robí Hades. **Nemíňa API kredit.**
- **Smer B · Aura AI ako MCP klient.** Lokálny chat vezme prompt, Apollo k nemu vypoolne kontext
  z cortexov, pošle volanie do Claude API a odpoveď vráti späť do chatu. Klientom je Aura.
  **Míňa API kredit** → odtiaľ pochádza N09. **A posiela lokálny kontext von** → odtiaľ N10.

**Otvorený rozpor, ktorý deck musí pomenovať:** prvá prezentácia stojí na vete „naše dáta zostanú
doma". Smer B ju poruší, ak medzi poolovaním kontextu a volaním von nestojí klasifikačný filter.
Preto je v architektúre povinný krok **Apollo poolne → filter klasifikácie preseje → až potom volanie von**,
a restricted trieda cez filter neprejde nikdy. Bez toho je celý projekt vnútorne protirečivý.

---

## 1 · Overené parametre a ceny (28. 7. 2026)

| Karta | VRAM | Priepustnosť | TBP | CUDA | Cena | Zdroj |
|---|---|---|---|---|---|---|
| RTX PRO 4000 Blackwell | 24 GB GDDR7 ECC | neoverená | 140 W | 8 960 | 1 350 € bez DPH / 1 694 € s DPH | slabý zdroj — **doplniť** |
| **RTX PRO 4500 Blackwell** | **32 GB GDDR7 ECC** | **896 GB/s** | 200 W | 10 496 | 83 990 Kč (Alza.cz) · EU Server Ed. od 3 670 € | Alza.cz, VideoCardz |
| RTX PRO 5000 Blackwell | 48 GB GDDR7 ECC | 1 344 GB/s | 300 W | 14 080 | 159 999 Kč BULK (Alza.cz) · DE ~4 315 €, Geizhals od 5 652 € | Alza.cz, Geizhals |

Alza.sk aj Alza.cz vracajú robotom HTTP 403, takže ceny sú z výsledkov vyhľadávania nad ich listingami,
nie z priameho načítania stránky. **Pred rozhodnutím ich treba potvrdiť klikom** — v decku to bude
napísané rovnako otvorene ako v prvej prezentácii.

Prevod Kč → € zámerne nerobím: nemám overený kurz k 28. 7. 2026 a vymyslený kurz by znehodnotil
celú tabuľku. V decku budú obe meny vedľa seba s poznámkou o kurze.

### Čo sa na 32 GB VRAM reálne zmestí

Toto je najdôležitejšia vec celého decku a musí byť povedaná rovno:
**70B model v Q8 sa na 32 GB nezmestí** — hovorí to už prvá prezentácia a nová karta na tom nič nemení.
Na 32 GB bežia dobre modely triedy ~30B v Q4/Q8 a menšie, plus obrazové modely.
70B sa dá spustiť v Q4 s časťou v RAM, ale za cenu rýchlosti — a to sa musí odmerať, nie predpokladať.

---

## 2 · Navrhovaná štruktúra decku — 15 slajdov

| # | Slajd | Obsah |
|---|---|---|
| 01 | Začni tým, čo už máš | hero, koruna ♛, rámec: nie 17–54 tisíc, ale dokúpenie do existujúceho PC |
| 02 | Čo máme dnes a čo dokúpime | tabuľka z §N03 + riadky OVERIŤ PRED NÁKUPOM |
| 03 | Výber karty — tri varianty | tabuľka z §1: VRAM, priepustnosť, TBP, cena, čo na nej beží |
| 04 | Čo sa na 32 GB reálne zmestí | modely podľa tried, otvorene aj to, čo sa nezmestí |
| 05 | Architektúra — jeden cortex nad piatimi | Aura AI ako hlavný cortex, nedrží dáta, poolí ich |
| 06 | Apollo — orchestračná vrstva | fan-out do cortexov a MCP → zlúčenie → jeden výstup |
| 07 | Päť cortexov podľa oddelení | Marketing a SEO · Import a sklad · Financie · Foto, video, retuš · IT a vývoj |
| 08 | Dva smery volania | smer A (Claude volá Auru) vs smer B (Aura volá Claude) + klasifikačný filter |
| 09 | Docker — čo beží kde | jeden compose stack, kontajnery, porty, siete, volumes |
| 10 | VPN WireGuard | ako sa pripája lokál, kto vidí čo, čo pri výpadku |
| 11 | Riadené obmedzenia a rozhrania | čo cortex smie a nesmie, vlastné rozhranie, ako sa to vynúti technicky |
| 12 | Token scope | rozpočet na stroj, tvrdý strop, fronta alebo pád na lokálny model |
| 13 | E-shop API Šperky | čo sa ťahá, ako často, cez ktorý cortex, čo nesmie von |
| 14 | Zálohovanie | RPO/RTO, čo/kam/ako často/koľko sa drží, **test obnovy** |
| 15 | Plán a čo rozhodnúť dnes | fázy implementácie, míľniky, otvorené body |

Mini PC so zdieľaním výkonu (N10) nedostane vlastný slajd — pri voľbe „náhrada celej HW časti"
je to vedľajšia vetva. Pôjde ako blok na slajde 03 („kedy má zmysel druhý stroj a čo to stojí").
Ak to chceš ako plný slajd, deck má 16.

---

## 3 · Dizajn a technika

Presne rovnaký štandard ako prvý deck — rovnaké tokeny, rovnaký `CONTRACT.md`, rovnaký zlepovač.
Deck + Dokument režim, dark/light, print CSS, 390 px, slovníček. Nové pojmy do glosára:
`cortex`, `apollo`, `wireguard`, `rpo` (už je), `quant` (už je), `scope` (už je), `strop`, `pool`.

Znovupoužije sa `deck.css`, `report.css`, `deck.js`, `mode.js` bez zmeny — mení sa len `body.html`
a doplní sa glosár. To je celý zmysel toho, že prvý deck má časti oddelené.

---

## 4 · Exekúcia

Rovnaký model ako pri prvom decku: kontrakt → agenti → zlepenie → verifikácia → screenshoty.
Navrhované rozdelenie:

| Agent | Píše | Zadanie |
|---|---|---|
| **B1 · Hardware a modely** | `lite/body-01-04.html` | slajdy 01–04, doplnenie chýbajúcich cien a priepustnosti RTX PRO 4000, tabuľka čo beží na akej VRAM |
| **B2 · Architektúra** | `lite/body-05-08.html` | slajdy 05–08, SVG nákresy cortexov, Apollo fan-out/fan-in, dva smery volania s klasifikačným filtrom |
| **B3 · Prevádzka** | `lite/body-09-13.html` | slajdy 09–13, Docker compose ako reálny súbor, WireGuard, obmedzenia, token scope, e-shop API |
| **B4 · Plán a zálohy** | `lite/body-14-15.html` + `lite/glossary-add.js` | slajdy 14–15, RPO/RTO s testom obnovy, fázy implementácie, nové pojmy do glosára |

### Akceptačné kritériá

1. 15 sekcií `.s`, `#ct` ukazuje `/ 15`
2. Žiadne vymyslené číslo — každá cena má zdroj a dátum, alebo štítok Budgetary
3. Každý predpoklad o súčasnom PC má viditeľný riadok OVERIŤ PRED NÁKUPOM
4. Klasifikačný filter je v architektúre viditeľný ako povinný krok, nie ako poznámka
5. Docker compose na slajde 09 je syntakticky platný YAML, nie ilustrácia
6. Zálohovanie má konkrétne RPO a RTO čísla a test obnovy, nie len zoznam adresárov
7. Deck aj Dokument režim funkčný v dark aj light, print 15 strán
