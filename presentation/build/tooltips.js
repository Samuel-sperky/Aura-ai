/* tooltips.js — slovníček pojmov a whitelist podčiarknutých pojmov
 * Vlastník: A1 · Obsah. Konzumuje: deck.js (A2) a report.css/mode.js (A3).
 *
 * AURA_GLOSSARY  — všetkých 44 pojmov zo zdroja _source-v2_1.html (objekt G, riadky 1363–1408),
 *                  prenesených verbatim vrátane kľúča `help`. Poradie zachované zo zdroja.
 *                  Formát: kluc: ['Titulok','Text'].
 *                  Modál slovníčka zobrazuje všetky okrem `help` (zoradené podľa titulku, locale 'sk').
 *
 * AURA_TT_INLINE — 14 kľúčov (R21 hovorí ~12), ktoré smú byť v texte slajdov podčiarknuté ako
 *                  <span class="tt" data-t="kluc" tabindex="0">. Zvyšné pojmy žijú len v slovníčku.
 *                  Výnimka (rozhodnutie A1): vizuály prenesené zo zdroja 1:1 — SVG grafy,
 *                  tabuľka na s07, .bars na s06/s09 a .kpi strip na s02 — si nechávajú svoje
 *                  pôvodné class="tt" data-t="…" (edge, ecc, cond, noncomp, msrp a SVG pojmy),
 *                  pretože CONTRACT zakazuje meniť data-atribúty prenesených blokov.
 *                  Viď do-asany.md, sekcia „Poznámky pre A2/A3/hlavného agenta“.
 */

window.AURA_GLOSSARY = {
 help:['Vysvetlivky','Pojmy s bodkovanou linkou majú vysvetlenie. Nabehnite naň myšou, kliknite na mobile, alebo otvorte celý slovníček tlačidlom vpravo hore.'],
 rag:['RAG — odpoveď z našich dokumentov','Model si pred odpoveďou najprv vyhľadá relevantné pasáže v našich vlastných súboroch a odpovedá z nich, nie z pamäti. Preto si menej vymýšľa a odpoveď sa dá dohľadať k zdroju. „RAG index“ je ten vyhľadávateľný katalóg našich dokumentov.'],
 b70:['70B model · orchestrácia','70B znamená 70 miliárd parametrov — veľkosť modelu. Čím väčší, tým lepšie zvláda zložité zadania, ale potrebuje viac pamäti. Orchestrácia je rozdeľovanie práce: jadro rozhodne, ktorý worker čo urobí a v akom poradí.'],
 rbac:['RBAC — prístup podľa roly','Namiesto individuálnych povolení má každý človek rolu (Admin, Editor, Prehliadač) a rola určuje, čo smie vidieť a robiť. Zmena práv sa deje na role, nie na desiatkach miest.'],
 sec:['Secrets — prístupové kľúče','Heslá, API kľúče a tokeny, ktorými sa systém prihlasuje k iným službám. Ležia v jednom chránenom trezore, nie v konfiguračných súboroch — aby sa dali otočiť bez prepisovania kódu.'],
 audit:['Audit log — nemazateľný záznam','Zápis kto, kedy, akým nástrojom a s akými dátami niečo urobil. „Nemazateľný“ znamená, že sa dá iba pridávať — ani administrátor nemôže riadok odstrániť. Bez toho nie je čo doložiť pri kontrole.'],
 nas:['NAS — sieťové úložisko','Samostatná krabica s diskami, ku ktorej pristupujú všetky počítače po sieti. Tu ležia naše dáta a záložné kópie. „Off-site kópia“ je druhá kópia mimo budovy — pre prípad požiaru či krádeže.'],
 mcp:['MCP — protokol pre AI nástroje','Model Context Protocol. Spoločný jazyk, ktorým AI hovorí s aplikáciami — dostane zoznam nástrojov (napr. „vytvor úlohu v Asane“) a môže ich volať. Vďaka nemu AI nielen radí, ale koná.'],
 vram:['VRAM — pamäť grafickej karty','Model musí byť celý naložený v pamäti karty, inak nebeží. 70B model potrebuje približne 70–80 GB, preto je 96 GB bezpečná a 48 GB tesná. Nie je to to isté ako bežná RAM.'],
 ecc:['ECC — pamäť s opravou chýb','Pamäť, ktorá si sama zachytí a opraví náhodné bitové chyby. Pri dlhých výpočtoch to znamená, že sa úloha nepokazí v polovici. Bežné hráčske karty ju nemajú.'],
 bw:['Priepustnosť pamäti (GB/s)','Koľko dát prejde medzi pamäťou a čipom za sekundu. Toto rozhoduje, ako rýchlo model odpovedá — model musí pri každom slove prečítať celú svoju pamäť. Vysoký výkon s nízkou priepustnosťou je pomalý.'],
 tops:['TOPS — počet operácií','Marketingové číslo: koľko biliónov operácií čip zvládne za sekundu. Vyzerá dobre na obale, ale pri veľkých modeloch je limitom priepustnosť pamäti, nie počet operácií.'],
 tok:['Token a tokeny za sekundu','Token je časť slova — model generuje odpoveď po tokenoch. „Tokeny za sekundu“ je rýchlosť písania: pod 5 je to nepríjemné čakanie, nad 20 sa to číta plynulo ako chat.'],
 quant:['Quantizácia (Q4, Q8, FP8)','Zmenšenie modelu tým, že sa čísla v ňom uložia s menšou presnosťou. Q8 je jemnejšia a vernejšia, Q4 zaberie polovicu, ale môže stratiť kvalitu. Preto sa kvalita meria, nie predpokladá.'],
 fp8:['FP8 — 8-bitová presnosť','Formát čísel, v ktorom model beží. Menšia presnosť = menej pamäti a väčšia rýchlosť. Pri FP8 sa 70B model zmestí na jednu 96 GB kartu vrátane rezervy.'],
 uni:['Unified memory — zdieľaná pamäť','Procesor a grafika používajú jednu spoločnú pamäť namiesto dvoch oddelených. Výhoda: dá sa jej mať veľa (128 GB). Nevýhoda: je výrazne pomalšia než pamäť na grafickej karte.'],
 ctx:['Kontext','Koľko textu si model naraz „drží pred očami“ — zadanie, dokumenty, doterajšia konverzácia. Zaberá pamäť navyše nad samotný model, preto sa musí počítať pri návrhu.'],
 gddr:['GDDR7 — typ pamäti','Najnovší typ pamäti na grafických kartách. Práve jej je na trhu nedostatok, pretože ju vykupujú dátové centrá — a to je príčina zdražovania celého hardwaru v roku 2026.'],
 msrp:['MSRP — odporúčaná cena výrobcu','Cena, za ktorú výrobca produkt uvedie. Reálna predajná cena môže byť dnes výrazne vyššia; rozdiel medzi MSRP a cenou v obchode je presne to, čo tento graf ukazuje.'],
 gate:['Brána (stage gate)','Kontrolný bod, kde sa formálne rozhodne, či sa pokračuje. Nie je to termín ani porada — je to rozhodnutie s pripojenými dôkazmi. Kým brána neprejde, ďalšia fáza nezačne.'],
 p0:['P0 až P3 — závažnosť chyby','P0 je kritická chyba, ktorá blokuje prevádzku, P3 je kozmetická. Pravidlo projektu: brána sa neotvorí, kým sú otvorené chyby P0 alebo P1.'],
 cond:['CONDITIONAL — podmienečne vyhovuje','Variant vyzerá na papieri v poriadku, ale nemá dôkaz. Nesmie sa odporučiť ani kúpiť, kým testom nepreukáže, že splní požiadavku.'],
 noncomp:['NON-COMPLIANT — nevyhovuje','Variant nesplňuje zadanú požiadavku a do odporúčania nevstupuje. Uvádzame ho, aby bolo zrejmé, že bol posúdený a prečo padol.'],
 budg:['Budgetary cena','Orientačná cena na plánovanie, nie záväzná ponuka. Nedá sa z nej objednať a môže sa zmeniť. Pred schválením investície ju musí nahradiť formálna ponuka s platnosťou.'],
 capex:['CapEx — jednorazová investícia','Kapitálový výdaj: nákup hardwaru, ktorý sa odpisuje niekoľko rokov. Zaplatí sa raz na začiatku.'],
 opex:['OpEx — priebežné náklady','Prevádzkové výdaje, ktoré platíme každý mesiac: energia, cloud, licencie, podpora.'],
 tco:['TCO — celkové náklady vlastníctva','Súčet všetkého za dané obdobie, nie len cena nákupu: hardware plus energia, cloud, licencie, implementácia, školenie, podpora a rezerva. Až toto číslo sa dá porovnávať s alternatívou.'],
 rez:['Rezerva','Percento navyše na veci, ktoré nikto nepredvídal — zdraženie, náhradný diel, predĺženie prác. Bez rezervy sa každý rozpočet prekročí a nikto nevie prečo.'],
 ondem:['On-demand a spot cena','On-demand je prenájom výpočtu za hodinu s garanciou, že o kapacitu neprídeme. Spot je lacnejší, ale poskytovateľ ho môže kedykoľvek odobrať — na rozbehnutú úlohu sa nedá spoliehať.'],
 lp:['Least privilege — minimálne práva','Každý človek a každá služba dostane presne tie práva, ktoré potrebuje na svoju prácu, a nič viac. Keď potom niečo unikne, škoda je ohraničená.'],
 segm:['Segmentácia siete','Rozdelenie siete na oddelené časti, ktoré medzi sebou nevidia, ak to nie je výslovne povolené. Keď sa jeden počítač nakazí, nemá odkiaľ pokračovať dovnútra.'],
 atrest:['Šifrovanie v pokoji','Dáta na diskoch sú zašifrované aj vtedy, keď sa s nimi nepracuje. Kto odnesie disk alebo celý počítač, dostane nečitateľné dáta.'],
 rpo:['RPO a RTO','RPO je koľko dát si dovolíme stratiť (napr. maximálne hodinu práce). RTO je za ako dlho musíme byť po havárii späť v prevádzke. Obe čísla určujú, ako často zálohovať a čo pripraviť dopredu.'],
 prov:['Provenance — pôvod dát','Ku každej informácii, ktorú AI použije, vieme dohľadať z ktorého dokumentu prišla. Vďaka tomu sa odpoveď dá overiť a nesprávny zdroj sa dá odstrániť.'],
 scope:['Scope tokenu','Rozsah oprávnení prístupového kľúča — napríklad „len čítať kalendár“ namiesto „robiť čokoľvek v účte“. Úzky scope znamená, že ukradnutý kľúč nestačí na veľkú škodu.'],
 idem:['Idempotencia','Vlastnosť, že opakované spustenie tej istej operácie nespôsobí duplikát. Keď sa spojenie preruší a zápis sa zopakuje, v Asane nevznikne tá istá úloha dvakrát.'],
 extid:['Externé ID a väzba','Ku každej vytvorenej úlohe si uložíme jej identifikátor v Asane. Preto vieme, čo už bolo odoslané, čo sa zmenilo a čo sa dá vrátiť späť.'],
 soak:['Soak test — dlhá záťaž','Nie krátky špičkový test, ale hodiny nepretržitej práce. Odhalí veci, ktoré sa objavia až po čase: prehrievanie, únik pamäti, zaplnenie diskov.'],
 rb:['Rollback — vrátenie zmeny','Pripravený a vyskúšaný postup, ako sa vrátiť do predchádzajúceho funkčného stavu. Kľúčové slovo je „vyskúšaný“ — rollback, ktorý sa nikdy netestoval, nie je plán.'],
 raid:['RAID register','Riziká, problémy (Issues), predpoklady (Assumptions) a rozhodnutia (Decisions). Štyri zoznamy, ktoré sa vedú priebežne — aby sa vedelo, čo hrozí, čo horí a prečo sme sa kedy rozhodli.'],
 mat:['Skóre 5×5','Riziko sa hodnotí pravdepodobnosťou 1–5 a dopadom 1–5. Súčin dá číslo, podľa ktorého sa riziká zoradia — namiesto debaty, ktoré je „vážnejšie“.'],
 slo:['SLO — dohodnutá úroveň služby','Konkrétny merateľný sľub, napríklad „odpoveď do 5 sekúnd pri 10 súbežných úlohách“. Bez čísla sa nedá povedať, či systém funguje dobre alebo zle.'],
 cc:['Change control','Formálny postup na zmenu rozsahu: čo sa mení, prečo, aký to má dopad na čas, náklady a riziko, a kto to schválil. Chráni pred tichým rozrastaním projektu.'],
 edge:['Uzly a spojenia v pamäti','Uzol je jeden poznatok — skill, projekt alebo fakt. Spojenie je vzťah medzi dvomi poznatkami. Sieť spojení robí z pamäti niečo použiteľnejšie než zoznam: súvislosti sa nájdu samé.']
};

window.AURA_TT_INLINE = [
  'tco',    /* s09 eyebrow — 3-ročný TCO */
  'capex',  /* s08 h2 — Tri scenáre CapEx */
  'budg',   /* s08 ld — budgetary blok */
  'rez',    /* s09 tabuľka — Rezerva 10 % */
  'vram',   /* s06 box +55 %, s07 tabuľka — hlavička Pamäť */
  'bw',     /* s07 ld a hlavička tabuľky — priepustnosť pamäti */
  'quant',  /* s07 box Main Basic — Q8 */
  'uni',    /* s07 box a tabuľka — 128 GB unified */
  'gate',   /* s11 ld — brány */
  'p0',     /* s11 ld, s12 karta Bezpečnosť a DR — P0/P1 */
  'rag',    /* s03 box Jadro rozhoduje — RAG index */
  'mcp',    /* s02 h2 — MCP */
  /* +2 doplnené hlavným agentom: oba padajú mimo SVG a tabuľky, takže patria
     do deklarovaného zoznamu, nie do výnimky pre prenesené vizuály. */
  'msrp',   /* s06 .bars — MSRP verzus reálna cena je pointa celého slajdu */
  'edge'    /* s02 .kpi strip — uzly a spojenia v Hades pamäti */
];
