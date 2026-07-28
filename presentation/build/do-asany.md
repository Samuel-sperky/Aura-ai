# do-asany.md — vstup pre A4 (Asana subtasky)

Vlastník: **A1 · Obsah**. Zdroj: `presentation/build/_source-v2_1.html` (21 slajdov).
Výstup A1: `body.html` (13 sekcií `s01`–`s13`) + `tooltips.js`.

Odrážky pod `VYPUSTENÉ ZO SLAJDU` sú napísané ako **hotové názvy subtaskov** — A4 ich môže brať 1:1.
Hashtagy podľa PLAN §3: `#rozhodnutie` `#cislo` `#brana` `#riziko` `#hotove`.

---

## s01 · Vlastné AI jadro. Naše dáta zostanú doma.

TVRDENIE: Projekt postaví 1× Main PC ako Aura Core a 3× Mini PC ako izolovaných workerov s lokálnym 70B modelom a max. 10 súbežnými workflowmi; cloud zostáva, ale za kontrolovanou hranicou.
ZDROJ ČÍSEL: Projektová baseline — 26 týždňov do 31. 1. 2027, 11 brán G1–G11, 67 úloh, 168 subtaskov, 3 scenáre, 3 otvorené blokátory. Stav k 28. 7. 2026.
CHÝBA DO BRÁNY: —

VYPUSTENÉ ZO SLAJDU:
- Eyebrow „Interné predstavenie tímu · 28. 7. 2026" nahradený „Šperky Aura · Investičné rozhodnutie" #rozhodnutie
- Počet slajdov v tiny zmenený z 21 na 13 — jediné číslo v celom decku, ktoré nie je verbatim zo zdroja #cislo
- Tooltip `help` odstránený z hero tiny — pojem zostáva len v modáli slovníčka
- Koruna ♛ doplnená inline štýlom `color:var(--gold)` — CONTRACT §4 nemá triedu pre hero ornament, doplniť do deck.css
- Overiť pred G1, že „3 otvorené blokátory" v hero sedí s tromi vecami v žltej na s13 #brana

---

## s02 · Ako AI používame už dnes — MCP a Hades

TVRDENIE: Nezačíname od nuly — vrstva MCP nástrojov a Hades už bežia; zápis z porady je konkrétny workflow, v ktorom je človek pred každým zápisom a hranica pred cloudom. Investícia presúva overenú praxu za bezpečnú hranicu, nezavádza nový nápad.
ZDROJ ČÍSEL: Hades pamäť — 675 uzlov, 2 049 spojení, 5 oblastí znalostí, 12 MCP serverov. Projektová baseline — 11 sekcií, 67 úloh, 168 subtaskov, 126 automatizácií. Stav k 28. 7. 2026.
CHÝBA DO BRÁNY: Dnešný mesačný výdaj na AI služby nie je nikde vyčíslený — bez neho nemá porovnanie nákladov na s09 základnú líniu.

VYPUSTENÉ ZO SLAJDU:
- Hades sieťový SVG graf vypustený — čísla 675 / 2 049 / 5 / 12 zostali v `.kpi` stripe #cislo
- Text v SVG „2 049 SPOJENÍ · 0 UZLOV NA REVÍZIU" vypustený spolu s grafom #cislo
- Karta „Reporting · Porady → report → úlohy" vypustená — nahradil ju pipeline SVG ako vizuál slajdu
- Karta „Dizajn · Canva a Figma MCP" (bannerové kampane, dávkový export, vizuálna QA) vypustená
- Karta „Marketing · Ahrefs, M365, Zapier" (SEO dáta, dokumenty, lepiace automatizácie) vypustená
- „Táto baseline — 11 sekcií, 67 úloh, 168 subtaskov" prepísané na „Projektová baseline … vznikla priamo cez MCP, nie ručným klikaním" podľa R02 #rozhodnutie
- Box „Prečo to súvisí s investíciou" skrátený z 3 viet na 2 — vypadla veta o bezpečnej práci s osobnými a účtovnými dátami

---

## s03 · Jedno jadro, tri izolované ruky

TVRDENIE: Aura Core drží modely, frontu a RAG index; workeri robia ťažkú prácu oddelene a bez prístupu k tajomstvám; restricted dáta neprekročia prerušovanú čiaru bez schválenia a jadro funguje aj s vypnutým cloudom.
ZDROJ ČÍSEL: Charter — 1× Main PC, 3× Mini PC, 10 workflowov max. Bez cenových údajov.
CHÝBA DO BRÁNY: Segmentácia, RBAC, secrets store a audit sú zatiaľ nákres — dôkaz uzatvára G4 dňa 18. 9. 2026 (ARC-001, SEC-001, NET-001).

VYPUSTENÉ ZO SLAJDU:
- Nič vecné nevypustené — SVG aj 3 boxy prenesené zo zdroja 1:1 #hotove
- PLAN §1 predpokladal redukciu „text z 5 boxov na 3"; zdroj má už len 3 — položka plánu je bezpredmetná
- SVG má 4 podčiarknuté pojmy mimo 12-tky (`b70`, `rag`, `rbac`, `nas`) — ponechané kvôli pravidlu 1:1, viď poznámky nižšie
- `.ln` delay 1,03 s v SVG prekračuje limit .8 s z CONTRACT §4 — riešiť v `deck.css`, nie v `body.html`

---

## s04 · Pred a po — prepnite stav

TVRDENIE: Medzi dnešným a cieľovým stavom sa presúva jediný prvok — výpočtové jadro. MCP vrstva, Hades, Asana, Drive a Calendar zostávajú; mení sa, kde beží model a kde končia dáta. Cieľový obrázok platí len ak prejdú testy.
ZDROJ ČÍSEL: 675 uzlov Hades, 96 GB VRAM, 70B lokálne, 3 izolovaní workeri, 10 workflowov. Register úloh: REQ-001, DATA-001, REQ-003, HADES-001 až 007, ARC-001, TEST-LLM-001, SEC-001, NET-001, INT-GOV-001, REQ-004, TEST-OFFLINE-001.
CHÝBA DO BRÁNY: Celý pravý stĺpec nákresu je akceptačné kritérium, nie stav — dôkaz je až po G7 (27. 11.).

VYPUSTENÉ ZO SLAJDU:
- ld skrátený: „Kliknutím na box sa dole vpravo zobrazí" → „Kliknutím na prvok sa vpravo zobrazí" (v doc režime panel nie je dole vpravo)
- Detailné texty 7 hotspotov (`tim`, `dat`, `mem`, `eng`, `bnd`, `saas`, `cld`) nie sú v `body.html` — A2 ich musí prebrať do `deck.js` zo zdroja, riadky 1461–1490, verbatim #rozhodnutie
- Eyebrow prečíslovaný 17 → 04, odkaz „scenár zo slajdu 02" v inom slajde prečíslovaný na 05
- Hodnota `data-st="now"` na `#ixd` je default stav — screenshot `04-predapo-ciel` vyžaduje klik na druhý `seg` button

---

## s05 · Bezpečnosť a hranica dát — štyri zóny

TVRDENIE: Štyri zóny (používatelia / jadro / workeri a dáta / vonkajší svet) so jedným pravidlom — nič neprejde bez stopy. Offline režim nie je havária, je to testovaný stav: jadro pracuje ďalej, zápisy čakajú vo fronte a po obnove sa prehrajú bez duplikátov.
ZDROJ ČÍSEL: 3 roly · least privilege, 3× segment · 3× identita. Úlohy ARC-001, SEC-001, DATA-001, RES-001, NET-001 sa uzatvárajú v G4 dňa 18. 9. 2026; offline dôkaz pred G7.
CHÝBA DO BRÁNY: Dôkaz neexistuje ani pre jednu zónu — TEST-OFFLINE-001 aj TEST-SEC-DR-001 sú pred G7. RPO a RTO sú „definované" v nákrese, konkrétne hodnoty v zdroji nie sú.

VYPUSTENÉ ZO SLAJDU:
- Offline porovnávací SVG (620×300, „Plný režim" vs „Cloud vypadol alebo je pozastavený") vypustený — obsah zhustený do jedného boxu
- Boxy „Beží ďalej" / „Čaká vo fronte" / „Dôkaz pred G7" zlúčené do jedného boxu podľa [Z2]
- Tooltip `idem` (idempotencia) odstránený z textu — pojem zostáva v modáli slovníčka
- ld doplnený („zóny sú navrhnuté, dôkaz zatiaľ nie") — zdroj 820 žiadne ld nemal, overiť formuláciu #rozhodnutie
- Boxy „Každý zápis s vedľajším účinkom čaká na človeka" a „Obmedzené dáta von len s výslovnou výnimkou" sú destilát textov zo zón 2 a 4 v SVG — skontrolovať, že netvrdia viac než zdroj
- Doplniť konkrétne hodnoty RPO a RTO do RES-001 — v zdroji sú len ako pojem #brana

---

## s06 · Pamäť je nedostatkový tovar

TVRDENIE: Ceny GPU sa za 16 mesiacov zdvojnásobili a rastú ďalej; načasovanie je preto súčasť investičného rozhodnutia. Odpoveď projektu je FIN-001 — dve nezávislé cenové kontroly s dátumom, platnosť ponuky a benchmark pred nákupom.
ZDROJ ČÍSEL: RTX 5090 32 GB 1 999 $ (MSRP 1/2025) → 4 329 $ (Amazon, 11. 7. 2026). RTX PRO 6000 96 GB 8 565 $ (MSRP 3/2025) → 13 250 $ (NVIDIA marketplace 7/2026), +55 %. TrendForce +15–20 % / +10–15 %. GEEKOM A9 Mega 128 GB 2 099 $ → 3 199 $. Zdroje: VideoCardz (12. 6. 2026), Thunder Compute (7/2026), TechTimes (11. 7. 2026), TrendForce via tech-insider, Liliputing (3/2026).
CHÝBA DO BRÁNY: Kurz USD/EUR sa zámerne neuvádza — porovnáva sa v mene zdroja, takže čísla v $ nie sú priamo porovnateľné s € cenami na s07. Pred G3 treba prepočet s dátumom.

VYPUSTENÉ ZO SLAJDU:
- Boxy „+15 až 20 %" a „Aj mini PC" zlúčené do jedného (limit 3 boxy) — čísla 15–20 %, 10–15 %, 2 099 $, 3 199 $ zachované #cislo
- Tooltip `gddr` (GDDR7) odstránený z textu — pojem zostáva v modáli slovníčka
- ld skrátený z 2 viet na 1 — vypadlo „Toto nie je pozadie, toto je hlavný finančný fakt projektu" ako samostatná veta
- Doplniť do FIN-001 prepočet USD ceny na € s kurzom a dátumom #cislo #brana

---

## s07 · Hardware — čo sme posúdili a čo prešlo

TVRDENIE: O rýchlosti 70B nerozhodujú TOPS, ale priepustnosť pamäti. 96 GB je bezpečná zóna, 128 GB unified je pasca na papieri a Main Basic so 48 GB zostáva CONDITIONAL, kým nie je benchmark.
ZDROJ ČÍSEL: Alza.sk, HP Store PL, buyzero.de — overené 28. 7. 2026, s DPH. Main Basic 6 269 € / 48 GB / 1 344 GB/s; Main Standard 14 849 € / 96 GB / ~1 790 GB/s; Main Premium ~29 700 € / 192 GB / 1 597 GB/s; Mini Basic ~1 000–1 300 € / 32 GB / ~120 GB/s; Mini Standard ~3 530 € (14 999 zł) / 128 GB / ~256 GB/s; Mini Premium 4 700 € / 128 GB / 273 GB/s. Alternatívy: 3 999 €, 14 649 €, 8 421 € (−42 %), 5 100 € / 819 GB/s, 3 794 €.
CHÝBA DO BRÁNY: Druhá cenová kontrola ku každému kandidátovi, platnosť ponuky, dodacia lehota a záruka → register FIN-001. Nič z tabuľky nie je záväzná ponuka — to je PROC-001 pred G5.

VYPUSTENÉ ZO SLAJDU:
- Bars priepustnosti pamäti (7 riadkov: ~120, ~256, 273, 819, 1 344, 1 597, ~1 790 GB/s) vypustené — priepustnosť zostáva ako stĺpec tabuľky #cislo
- h2 „O rýchlosti 70B nerozhodujú TOPS. Rozhoduje priepustnosť pamäti." zhustené do ld
- Tabuľka piatich alternatív (5 riadkov) zhustená do jedného tiny — zachované 3 999 €, 14 649 €, 8 421 €, −42 %, 6 228 €, 12 456 €, 5 100 €, 819 GB/s, 3 794 € #cislo
- Box „Prečo Mini Basic padá" (32 GB, nízka priepustnosť, do 70B testov nevstupuje) vypustený — nesie ho badge „Nevhodný na 70B" v tabuľke
- Box „32 GB na 70B nesadne" (ani RTX 5090 s najvyššou priepustnosťou) vypustený — nesie ho tiny o alternatívach
- Box „Čo chýba do G3" presunutý do tiny pod tabuľkou (FIN-001) #brana
- Tooltipy `tops`, `ctx`, `fp8` odstránené z textu — pojmy zostávajú v modáli slovníčka
- Detail „Mac Studio 256 GB ~7 500 € je odhad, Apple 512 GB verziu stiahol" a zdroj Alza.cz 124 990 Kč vypadli z tiny — zostávajú vo flagoch konfigurátora na s10 #cislo

---

## s08 · Tri scenáre CapEx: 17 · 33 · 54 tisíc €

TVRDENIE: Rozdiel medzi tromi scenármi je takmer celý v jednej položke — v grafickej karte jadra. Ceny GPU a mini PC sú overené, platforma a infraštruktúra sú budgetary blok.
ZDROJ ČÍSEL: A · Basic ~16 900 €, B · Standard ~32 900 € (odporúčaný), C · Premium ~54 300 €. Overené: 6 269 € / 14 849 € / 4 700 € / ~3 530 € z listingov s dátumom 28. 7. 2026. Budgetary: platforma 3 500–6 000 € (CPU, doska, 128 GB RAM, 2× NVMe, 1000 W zdroj, skriňa, chladenie), infra blok 3 500–4 500 €.
CHÝBA DO BRÁNY: Do G3 treba reálne ponuky na platformu aj infra blok. Main Standard je na Alze nedostupný — dodacia lehota patrí do rozhodnutia.

VYPUSTENÉ ZO SLAJDU:
- Nedotknuté podľa R03 — stack graf, legenda a 3 karty prenesené 1:1 #hotove
- `.stack i` delays 0,82–1,06 s prekračujú limit .8 s z CONTRACT §4 — riešiť v `deck.css`
- Overiť pred G5, že „17 · 33 · 54 tisíc €" v h2 stále zodpovedá ~16 900 / ~32 900 / ~54 300 € v grafe #cislo
- Doplniť do FIN-002 zdroj pre platformový blok 3 500–6 000 € a infra blok 3 500–4 500 € — dnes budgetary #brana
- Doplniť rozpad štyroch segmentov stack grafu (GPU jadra / platforma Main / 3× Mini worker / UPS, sieť, NAS, kabeláž) v € — na slajde sú len percentá šírky #cislo

---

## s09 · TCO na 3 roky — a prečo prenájom nie je alternatíva

TVRDENIE: Trojročné TCO je 45 958 € / 65 296 € / 90 838 € podľa scenára. Prenájom GPU v cloude je na papieri lacnejší, ale rieši výpočet, nie hranicu spracovania — a cloud API platíme aj tak.
ZDROJ ČÍSEL: Model s viditeľnými vstupmi — energia 0,20 €/kWh, príkon 350 / 500 / 780 W, 12 h denne, 250 dní ročne, cloud 150 €/mesiac, licencie 80 €/mesiac, implementácia 12 000 € (26 týždňov), školenie 1 500 €, podpora 2 400 / 3 600 / 4 800 €, rezerva 10 % = 4 178 / 5 936 / 8 258 €. Priemer na mesiac 1 277 / 1 814 / 2 523 €. Prenájom: 2,35 $/h on-demand (Spheron 7/2026), spot od 0,84 $/h, 3 000 h ročne → ~21 150 $.
CHÝBA DO BRÁNY: TCO je model, nie ponuka — zdrojom pravdy má byť vzorcový XLSX v úlohe FIN-002, ktorý zatiaľ neexistuje. Chýba základná línia dnešného mesačného výdaja na AI služby.

VYPUSTENÉ ZO SLAJDU:
- Bars TCO (~46 000 € / ~65 300 € / ~90 800 €) vypustené — presné súčty 45 958 / 65 296 / 90 838 € zostávajú v tabuľke #cislo
- Bars porovnania prenájmu (~21 150 $ vs ~65 300 €) vypustené — obe čísla prenesené do tiny #cislo
- Box „Vstupy modelu" prevedený na tiny — 0,20 €/kWh, 350/500/780 W, 12 h, 250 dní, 150 €, 80 €, 26 týždňov zachované #cislo
- Box „Čo v modeli zámerne nie je" prevedený na tiny — zostatková hodnota HW po 3 rokoch, náklad na neúspešný benchmark, štvrtý worker #riziko
- Titulky cloudových boxov upravené z „Ale: dáta tam nesmú ísť" a „A: platíme aj tak" na vecné znenie
- h2 a ld slajdu 799 („Prenájom GPU v cloude je na papieri lacnejší", „Bolo by nečestné to zamlčať") vypadli pri zlúčení do jedného h2

---

## s10 · Poskladajte si zostavu

TVRDENIE: Konfigurátor je nástroj na rozhovor, nie zdroj pravdy — každá voľba okamžite prepočíta CapEx, TCO a mesačný priemer a vypíše upozornenia o zhode s charterom.
ZDROJ ČÍSEL: Ceny v tlačidlách: GPU 6 269 / 14 849 / 29 698 / 3 999 / 8 421 / ~7 500 €; platforma 3 500 / 4 500 / 6 000 €; Mini 1 150 / 3 530 / 4 700 / 3 794 €; infra UPS 900 €, 10GbE 700 €, NAS 2 700 €, off-site 540 € / 3 r. Default výstup 32 900 € CapEx, 65 300 € TCO, 1 814 €/mesiac. Overené 28. 7. 2026, s DPH.
CHÝBA DO BRÁNY: Platforma, NAS, UPS a sieť sú budgetary bloky — do G3 ich musia nahradiť reálne ponuky. Spotreba je odhad priemerného príkonu, po G6 ju prepíše TEST-HW-001.

VYPUSTENÉ ZO SLAJDU:
- Nedotknuté — konfigurátor, všetkých 17 `id`, `.flg` a tiny prenesené 1:1 #hotove
- 14 textov upozornení (CONDITIONAL, Dostupnosť, Chýba ponuka, NON-COMPLIANT na 70B, Sekundárny trh, Mimo charteru, Drahší než HP, Nekompatibilné, NON-COMPLIANT Mini, Mimo charteru počet, Nad charter, Bez záloh, Bez off-site, Bez UPS, Bez 10GbE, Bez otvorených nálezov) nie sú v `body.html` — A2 ich prebral do `deck.js` zo zdroja, riadky 1562–1577 #rozhodnutie
- Cenník `P` a váhy `W` / `SUP` v `deck.js` musia zostať zhodné s cenami v `<small>` tlačidiel — pri zmene ceny meniť na dvoch miestach #riziko
- Overiť, že default zostava (std / solid / std / 3 / celá infra) dáva presne 32 900 € a 65 300 € ako je predvyplnené v `#oCap` a `#oTco` #cislo

---

## s11 · 26 týždňov, 11 brán, žiadne skratky

TVRDENIE: Bez pripojeného dôkazu a bez uzavretých P0/P1 sa brána neotvorí a nasledujúca fáza nezačne. Najbližšie štyri brány sú G1 7. 8., G2 28. 8., G3 11. 9. a G5 25. 9.
ZDROJ ČÍSEL: Harmonogram 28. 7. 2026 → 31. 1. 2027, 10 fáz (00 Audit a charter až 09 RAID priebežne), 11 brán G1–G11. Termíny na slajde: 7. 8., 28. 8., 11. 9., 25. 9.
CHÝBA DO BRÁNY: Dátumy G4, G6–G11 na slajde nie sú — v decku sa objavujú rozptýlene (G4 18. 9. 2026 na s05, G7 27. 11. na s12, G10 22. 1. 2027 na s12).

VYPUSTENÉ ZO SLAJDU:
- Bez zmeny obsahu — gantt SVG (10 riadkov fáz, 11 diamantov brán, čiara „dnes 28. 7.") a 4 kpi prenesené 1:1 #hotove
- Doplniť do Asany úplný zoznam dátumov G1–G11 — slajd ukazuje len 4 zo 11 #brana #cislo
- Trieda `.tpulse` (pulzujúca dnešná čiara) nie je v povolenom slovníku CONTRACT §4 — doplniť do `deck.css`
- `.nd` delay .8 s na skupine brán je presne na limite CONTRACT §4 — pri pridaní ďalšej vrstvy sa limit prekročí

---

## s12 · Od testov k rolloutu

TVRDENIE: Šesť testov medzi nami a pilotom (16.–27. 11.), potom pilot a rollout po vlnách s možnosťou zastaviť. Dnes má dôkaz 0 testov a brána G7 je 27. 11.
ZDROJ ČÍSEL: Testy 16.–18. 11., 16.–20. 11., 18.–23. 11., 20.–24. 11., 23.–25. 11., 23.–27. 11. Pilot 30. 11. — 18. 12. Rollout: pilotná skupina 16.–20. 11., školenie 23.–27. 11., akceptácia 7.–18. 12., rollout a launch 4.–22. 1. Vlny 10 % → 30 % → 60 % → 100 %, celá firma 22. 1. 2027, G10.
CHÝBA DO BRÁNY: Všetkých šesť testov — 0 z nich má dnes dôkaz. Neznáme výsledky sa nevymýšľajú, test bez dôkazu sa neuzatvára ani keď je termín.

VYPUSTENÉ ZO SLAJDU:
- Rollout SVG (Pilot 30. 11. — 18. 12., vlny 10 % / 30 % / 60 % / 100 %, 22. 1. 2027, G10, stop conditions) vypustený — všetky čísla prenesené do tiny #cislo
- kpi strip „0 testov s dôkazom dnes" + „27. 11. brána G7" prevedený do textu boxu #cislo
- Box „Pravidlo, ktoré si držíme" premenovaný na „Neznáme výsledky sa nevymýšľajú"
- Tooltipy `soak` (soak test) a `rb` (rollback, 2×) odstránené z kariet — pojmy zostávajú v modáli slovníčka
- Odkaz „Presne scenár zo slajdu 02" prečíslovaný na „slajdu 05"
- Slajd má 10 kariet `.c` — nad odporúčaným limitom 6, vyžaduje to zadanie zlúčenia [Z5] #rozhodnutie
- Doplniť plánovaný počet ľudí v pilote — chýbajúce číslo, v zdroji nie je nikde #cislo #brana

---

## s13 · Najbližších 45 dní rozhodne o celej investícii

TVRDENIE: Baseline stojí, v žltej ju držia tri veci. Na dnes sú dve rozhodnutia — povolenie Drive uploadu a zadanie formálnej B2B ponuky na Main Premium — a jedna otázka pre tím.
ZDROJ ČÍSEL: G1 do 7. 8. (audit, register 30 rozhodnutí, charter), G2 do 28. 8., G3 do 11. 9. Ceny: Alza.sk, HP Store PL, buyzero.de, overené 28. 7. 2026, s DPH. Trhový kontext: VideoCardz, Thunder Compute, TechTimes, TrendForce, Liliputing (6–7/2026).
CHÝBA DO BRÁNY: Bez povolenia Drive uploadu nemajú dôkazy k bránam spoločné miesto a G1 sa posunie. Bez formálnej EU B2B ponuky na Main Premium nie je scenár C porovnateľný a G3 rozhoduje z dvoch možností namiesto troch.

VYPUSTENÉ ZO SLAJDU:
- Bars piatich rizík (cena HW rastie / dostupnosť 96 GB karty — vysoké; 70B na 48 GB / interná kapacita na 26 týždňov — stredné; únik obmedzených dát — nízke) vypustené #riziko
- Box „Päť priebežných registrov" (riziká so skóre 5×5, problémy P0–P3, predpoklady, zmeny, rozhodnutia, od 27. 7. 2026) vypustený — tooltipy `raid` a `mat` zostávajú v modáli slovníčka #riziko
- Box „Nezmenený auditný zdroj" (pôvodný AuraAI/OTTO projekt zostáva nedotknutý) vypustený podľa R02 #rozhodnutie
- Tri boxy „v žltej" (Drive upload / Main Premium pred G5 / technické brány pred G7) zhustené do jedného ld ako kontext #brana
- h2 „Baseline stojí. Tri veci držia projekt v žltej." vypustené — nahradené h1 „Najbližších 45 dní rozhodne o celej investícii."
- tiny prepísaný: „Zdroj projektových dát: Asana — AuraAI · Interný projekt AI infraštruktúry" → „samostatná projektová baseline AI infraštruktúry … bez väzby na iný register" podľa R02 #rozhodnutie

---

## Vypadnutý slajd (zdroj 1155) — Deväť rozmerov / Pred a po v číslach

Padá úplne podľa R04 a PLAN §1: vlastným textom priznáva, že percentá sú odhady zrelosti, nie merania.
Pred manažmentom je to slabé miesto. Obsah však patrí do Asany celý — je to zoznam akceptačných kritérií.

VYPUSTENÉ ZO SLAJDU:
- Tabuľka 9 rozmerov s dôkazmi: TEST-LLM-001, DATA-001, TEST-CAP-001, TEST-OFFLINE-001, SEC-001, INT-GOV-001, TEST-SEC-DR-001, FIN-002, RAID-CHANGE-001 #brana
- Cieľ „~1 814 € priemer, scenár B, 3-ročný TCO" ako mesačný náklad po nasadení #cislo
- Bars zrelosti: kontrola nad dátami 30 → 95 %, funkčnosť bez internetu 15 → 80 %, auditovateľnosť zápisov 45 → 100 %, predvídateľnosť nákladu 50 → 90 % #cislo
- Box „Pozor na tieto percentá" — vlastné odhady, nie merania; do G2 nahradiť metrikami z REQ-005 s prahom, spôsobom merania a frekvenciou #brana
- Box „Dve chýbajúce čísla" — dnešný mesačný výdaj na AI služby a plánovaný počet ľudí v pilote; ani jedno nie je v Asane #cislo #riziko
- Tooltipy `slo` a `cc` zostávajú v modáli slovníčka, na žiadnom slajde už nie sú podčiarknuté

---

## Poznámky pre A2 / A3 / hlavného agenta

Nie sú to subtasky — sú to konflikty a rozhodnutia, ktoré A1 nemohol vyriešiť vo svojich troch súboroch.

1. **Tooltipy v prenesených vizuáloch.** `AURA_TT_INLINE` má presne 12 kľúčov a **každý `<span class="tt">`
   v texte, ktorý A1 napísal, je z tejto 12-tky.** Vizuály prenesené zo zdroja 1:1 si však nechávajú
   svoje pôvodné `class="tt" data-t="…"`, pretože CONTRACT zakazuje meniť `data-*` atribúty:
   - SVG: `b70`, `rag`, `rbac`, `nas` (s03) · `rbac`, `lp`, `sec`, `audit`, `segm`, `atrest`, `rpo`, `prov`, `scope` (s05) · `extid` (s02)
   - `.kpi` strip: `edge` (s02) · `.bars`: `msrp` (s06) · tabuľka: `ecc`, `cond`, `noncomp` (s07)
   Ak hlavný agent chce striktne 12 podčiarknutých pojmov v celom decku, stačí z týchto elementov
   odstrániť `class="tt"` a `tabindex="0"` a `data-t` ponechať — je to jedna náhrada na súbor.
2. **Animačné delays nad .8 s.** CONTRACT §4 hovorí max `.8s`. Všetky `.an` elementy v `body.html`
   držia limit (maximum je `.72s`). Prekračujú ho iba delays **vnútri** prenesených vizuálov:
   `.ln` až 1,03 s (s03), `.nd` až 1,01 s (s03), `.stack i` až 1,06 s (s08), `.nd` 1 s (s02 audit riadok).
   A1 ich nemenil kvôli pravidlu 1:1 — ak sa majú skrátiť, patrí to do `deck.css` (napr. cap cez
   `animation-delay` override alebo `prefers-reduced-motion`).
3. **Triedy použité v `body.html`, ktoré CONTRACT §4 neuvádza.** Všetky pochádzajú zo zdroja
   a `deck.css` ich musí pokryť: `rd` / `am` / `gd` ako modifikátory `<i>` v `.bar .tr` a `<b>` v `.kpi`,
   `am` na `.big`, `s-now` / `s-tg` (stavy nákresu na s04), `mono` v SVG texte, `tpulse` (s11),
   `svl tt` kombinácia (s03), `tgv` a `nowv` (generuje `deck.js`), `gi` / `gw` / `gg` (modál slovníčka).
4. **Formát čísel.** CONTRACT §6.6 žiada nedeliteľnú medzeru v tisícoch. Zdroj používa **obyčajnú
   medzeru** (v celom súbore je 0 znakov U+00A0) a `deck.js` dokonca ` ` na obyčajnú medzeru
   prepisuje. Pravidlo „čísla znak po znaku zo zdroja" je vyššie, preto `body.html` má obyčajné
   medzery. Ak sa má prejsť na nbsp, musí to byť jedna dávková zmena vo všetkých súboroch naraz.
5. **Dva vizuály na slajde.** s02 (`.kpi` strip + pipeline SVG) a s11 (gantt SVG + `.kpi` strip)
   majú po dvoch vizuáloch. s11 je tak 1:1 zo zdroja; s02 je dôsledok zlúčenia [Z1] — `.kpi` strip
   je jediné miesto, kde po vypustení Hades grafu prežili čísla 675 / 2 049 / 5 / 12.
6. **`#ct` a počet slajdov.** V hero tiny je „13 slajdov". Je to jediné číslo v `body.html`, ktoré
   nie je verbatim zo zdroja (zdroj má 21) — zmena je vynútená R03 a akceptačným kritériom č. 1.
7. **REQ-005** sa v `body.html` nikde nevyskytuje — bol len na vypadnutom slajde 1155. Ak má
   zostať v decku, najbližšie miesto je ld na s05 alebo tiny na s12.
