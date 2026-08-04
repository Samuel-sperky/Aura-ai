const W2_CHAT = {

meta:{
  name:'AuraAI',
  model:'qwen3:4b',
  tag:L('lokálny model · Ollama · beží na PC','local model · Ollama · runs on your PC'),
  shortcuts:[
    ['Cmd+K', L('nová konverzácia','new chat')],
    ['Cmd+/', L('prepnúť bočný panel','toggle sidebar')],
    ['Cmd+Shift+O', L('otvoriť ako fullscreen overlay','open as fullscreen overlay')],
    ['Esc', L('zastaviť generovanie','stop generating')],
    ['Cmd+Shift+C', L('kopírovať poslednú odpoveď','copy last reply')],
    ['Cmd+Enter', L('odoslať a vetviť konverzáciu','send and branch conversation')]
  ]
},

sugg:[
  {t:L('Team score za jún 2026','June 2026 Team score'), s:L('Aura KPI · plnenie oddelení a marža','Aura KPI · department attainment and margin')},
  {t:L('Riziko GLS tento týždeň','GLS risk this week'), s:L('Aura Logistika · objem a reklamácie','Aura Logistika · volume and claims')},
  {t:L('Copy manifest pre Summer Sale','Copy manifest for Summer Sale'), s:L('8 jazykov, campaign lock','8 languages, campaign lock')},
  {t:L('Tržby júl 2026','July 2026 revenue'), s:L('217 016 € · marža a trhy','€217,016 · margin and markets')},
  {t:L('Denník skladu — nenahrané zlato','Warehouse log — unlisted gold'), s:L('kapacita nahrávania, nie proces','upload capacity, not process')},
  {t:L('Čo vieš o mne a mojej firme?','What do you know about me and my company?'), s:L('pamäť Aura AI naprieč projektmi','Aura AI memory across projects')}
],

convos:[
  {id:'c1', title:L('KPI jún 2026 — Team score','June 2026 KPI — Team score'), when:L('dnes 09:41','today 09:41'), project:'kpi',
   snippet:L('Team score je priemer šiestich zložiek, presné percento za jún appka dopočíta po uzávierke.','Team score is the average of six components; the app finalizes the exact June figure after close.'), pinned:true, msgs:8},
  {id:'c2', title:L('GLS reklamácie — týždeň 31','GLS claims — week 31'), when:L('dnes 08:15','today 08:15'), project:'logistika',
   snippet:L('GLS neplní zmluvný denný objem, hrozí navýšenie cien od septembra.','GLS is missing the contracted daily volume; a September price hike is a risk.'), pinned:true, msgs:8},
  {id:'c3', title:L('Copy manifest Summer Sale','Summer Sale copy manifest'), when:L('včera 17:20','yesterday 17:20'), project:'kampane',
   snippet:L('Návrh copy manifestu pre 8 jazykov, headline limit 28 znakov pre 970×250.','Copy manifest draft for 8 languages, 28-character headline limit for 970×250.'), pinned:false, msgs:10},
  {id:'c4', title:L('Ceny pre banner overlay — Zlaté prstene','Prices for banner overlay — Gold rings'), when:L('včera 14:02','yesterday 14:02'), project:'kampane',
   snippet:L('Cenový overlay sa berie z e-shopu v mene trhu, bez prepočtu v renderi.','The price overlay is pulled from the shop in the market currency, no conversion in the render.'), pinned:false, msgs:5},
  {id:'c5', title:L('Tržby júl 2026 — prehľad','July 2026 revenue — overview'), when:L('2. 8. 2026','Aug 2, 2026'), project:'trzby',
   snippet:L('217 016 € tržieb, marža je zatiaľ ukážková hodnota.','€217,016 revenue; margin is a sample value for now.'), pinned:false, msgs:6},
  {id:'c6', title:L('Plnenie oddelení — Copywriter vs Newsletter-AI','Department attainment — Copywriter vs Newsletter-AI'), when:L('1. 8. 2026','Aug 1, 2026'), project:'kpi',
   snippet:L('Copywriter má váhy 60/20/20, Newsletter-AI beží na novej -1M metodike.','Copywriter uses 60/20/20 weights, Newsletter-AI runs the new -1M methodology.'), pinned:false, msgs:6},
  {id:'c7', title:L('Denník skladu — nenahrané zlato','Warehouse log — unlisted gold'), when:L('31. 7. 2026','Jul 31, 2026'), project:null,
   snippet:L('Nenahrané zlato drží väčšinu hodnoty skladu, chýba kapacita na nahrávanie.','Unlisted gold holds most of the warehouse value; upload capacity is missing.'), pinned:false, msgs:4},
  {id:'c8', title:L('Router qwen3 — few-shot pre "aká veľká je sieť"','Router qwen3 — few-shot for "how big is the network"'), when:L('31. 7. 2026','Jul 31, 2026'), project:null,
   snippet:L('Router minie na preformulovaný dopyt, treba doplniť few-shot príklad.','The router misses a rephrased query; a few-shot example is needed.'), pinned:false, msgs:5},
  {id:'c9', title:L('Cloudflare tunel — rotácia hesla','Cloudflare tunnel — password rotation'), when:L('29. 7. 2026','Jul 29, 2026'), project:null,
   snippet:L('Bcrypt hash tunelového hesla je v git-trackovanom Caddyfile.','The tunnel password bcrypt hash lives in a git-tracked Caddyfile.'), pinned:false, msgs:3},
  {id:'c10', title:L('Aura Roadmap — checkpoint rozhodnutia','Aura Roadmap — checkpoint decisions'), when:L('28. 7. 2026','Jul 28, 2026'), project:null,
   snippet:L('go / conditional_go / no_go / deferred, s baseline snapshotom a auditom.','go / conditional_go / no_go / deferred, with a baseline snapshot and audit.'), pinned:false, msgs:5},
  {id:'c11', title:L('SEO KPI akčný plán — brand skupina','SEO KPI action plan — brand group'), when:L('4. 8. 2026','Aug 4, 2026'), project:null,
   snippet:L('Brandové dopyty sú v SK Top15 so 107 klikmi za júl 2026.','Brand queries sit in SK Top15 with 107 clicks in July 2026.'), pinned:false, msgs:4},
  {id:'c12', title:L('Banner Studio — budget strop','Banner Studio — budget cap'), when:L('27. 7. 2026','Jul 27, 2026'), project:'kampane',
   snippet:L('Schválený mesačný rozpočet na generovanie je 100–300 €.','The approved monthly generation budget is €100–300.'), pinned:false, msgs:4}
],

threads:{
  c1:[
    {r:'u', t:L('Aký je Team score za jún 2026?','What is the June 2026 Team score?'), cite:null, tool:null, art:null, acts:[], fb:false},
    {r:'a',
     t:L('Team score je priemer šiestich zložiek podľa metodiky Aura KPI (plnenie oddelení, marža, dochádzka a tri ďalšie, cap 100 % na komponent). Presnú hodnotu za jún appka dopočíta až po uzávierke — ako ukážku uvádzam 78 % (ukážka), nie overené číslo.','Team score is the average of six components under the Aura KPI methodology (department attainment, margin, attendance and three more, each capped at 100%). The exact June figure is finalized only after close — as a sample I show 78% (sample), not a verified number.'),
     cite:[{k:'appka', l:'Aura KPI · /api/summary'}],
     tool:{name:'kpi_summary', args:L('department=all, month=2026-06','department=all, month=2026-06'), out:L('6 zložiek, cap 100 % na komponent, hodnota "78 %" je ukážková','6 components, 100% cap per component, "78%" value is a sample'), ms:340},
     art:null, acts:[{l:L('Otvoriť Aura KPI','Open Aura KPI'), k:'open'}], fb:true},
    {r:'u', t:L('A kde je najväčšia medzera medzi oddeleniami?','Where is the biggest gap between departments?'), cite:null, tool:null, art:null, acts:[], fb:false},
    {r:'a',
     t:L('Najväčší rozptyl je zvyčajne medzi Copywriter (váhy 60/20/20) a Newsletter-AI (nová -1M metodika s DPH a toleranciami) — obe majú odlišné vzorce, takže priame porovnanie percent je zavádzajúce. Konkrétne čísla za jún nemám potvrdené z appky, ukazujem len metodiku.','The widest spread is usually between Copywriter (60/20/20 weights) and Newsletter-AI (new -1M methodology with VAT and tolerances) — both use different formulas, so a direct percent comparison is misleading. I do not have June figures confirmed from the app, only the methodology.'),
     cite:[{k:'pamäť', l:L('Pamäť Aura AI · Aura KPI appka — metodika','Aura AI memory · Aura KPI app — methodology')}],
     tool:null, art:null, acts:[], fb:true},
    {r:'u', t:L('Ukáž mi to ako tabuľku pre všetkých 11 oddelení.','Show it to me as a table for all 11 departments.'), cite:null, tool:null, art:null, acts:[], fb:false},
    {r:'a',
     t:L('Pripravil som ukážkovú tabuľku — hodnoty nie sú z appky, len ilustrujú formát výstupu.','I put together a sample table — the values are not from the app, they only illustrate the output format.'),
     cite:[{k:'ukážka', l:L('ukážka','sample data')}], tool:null,
     art:{title:L('Plnenie oddelení — jún 2026 (ukážka)','Department attainment — June 2026 (sample)'), kind:'table', lang:null,
          text:'Oddelenie;Plnenie;Trend\nPerformance;92%;+3pb\nHospodársky;71%;-2pb\nNewsletter-AI;65%;+5pb\nCopywriter;88%;+1pb\nFotografka;77%;0pb\nNahrávanie;54%;-6pb\nExternistky;83%;+2pb\nImport;90%;+1pb\nSklad;61%;-4pb\nExpedícia;95%;+2pb\nReklamácie;74%;-1pb'},
     acts:[{l:L('Exportovať CSV','Export CSV'), k:'export'}], fb:true},
    {r:'u', t:L('Kto zmeškal uzávierku?','Who missed the close?'), cite:null, tool:null, art:null, acts:[], fb:false},
    {r:'a',
     t:L('Uzávierka je do 10. dňa v mesiaci. Bez pripojenia na appku neviem povedať, ktoré meno konkrétne mešká — môžem ti otvoriť modul Na doplnenie, kde appka vedie zoznam nevyplnených oddelení.','The close deadline is the 10th of the month. Without a live connection to the app I cannot name who is late — I can open the "To complete" module where the app tracks unfilled departments.'),
     cite:[{k:'appka', l:'Aura KPI · /na-doplnenie'}], tool:null, art:null,
     acts:[{l:L('Filtrovať Na doplnenie','Filter To complete'), k:'filter'}], fb:true}
  ],
  c2:[
    {r:'u', t:L('Aké riziko nesie GLS v tomto týždni?','What risk does GLS carry this week?'), cite:null, tool:null, art:null, acts:[], fb:false},
    {r:'a',
     t:L('GLS dlhodobo neplní dohodnutý denný objem zásielok, čo je jeden z troch aktuálnych blokátorov firmy — hrozí tým navýšenie cien od septembra. Rieši sa aj alternatíva presunu objemu na GLS HU.','GLS has been missing the agreed daily shipment volume, one of the company\'s three current blockers — a September price increase is a real risk. Shifting volume to GLS HU is being discussed as an alternative.'),
     cite:[{k:'pamäť', l:L('Pamäť Aura AI · CEO porada 31. 7. 2026','Aura AI memory · CEO meeting Jul 31, 2026')}],
     tool:{name:'logistika_shipments', args:L('carrier=GLS, week=31','carrier=GLS, week=31'), out:L('objem pod zmluvným minimom, presné čísla appka nevrátila (offline)','volume below the contracted minimum, app did not return exact figures (offline)'), ms:510},
     art:null, acts:[{l:L('Otvoriť Logistiku','Open Logistics'), k:'open'}], fb:true},
    {r:'u', t:L('Koľko reklamácií máme aktuálne otvorených?','How many claims do we currently have open?'), cite:null, tool:null, art:null, acts:[], fb:false},
    {r:'a',
     t:L('Presný počet mi appka teraz nevrátila, takže uvádzam len ilustračné číslo: 14 otvorených (ukážka), z toho väčšina na strane dopravcu. Over si to priamo v module Reklamácie.','The app did not return an exact count right now, so this is illustrative only: 14 open (sample), most of them on the carrier side. Verify this directly in the Claims module.'),
     cite:[{k:'ukážka', l:L('ukážka','sample data')}], tool:null, art:null,
     acts:[{l:L('Otvoriť Reklamácie','Open Claims'), k:'open'}], fb:true},
    {r:'u', t:L('Založ koncept novej reklamácie pre zásielku #A4471, poškodený obal.','Draft a new claim for shipment #A4471, damaged packaging.'), cite:null, tool:null, art:null, acts:[], fb:false},
    {r:'a',
     t:L('Pripravil som koncept: zásielka #A4471, dôvod poškodený obal, dopravca GLS, vinník zatiaľ neurčený. Krok som nezapísal do appky — čaká na tvoje potvrdenie.','I prepared a draft: shipment #A4471, reason damaged packaging, carrier GLS, fault party not yet determined. I have not written the step into the app — it is waiting for your confirmation.'),
     cite:[{k:'ukážka', l:L('ukážka · koncept','sample · draft')}], tool:null, art:null,
     acts:[{l:L('Založiť reklamáciu','Create claim'), k:'create'}], fb:true},
    {r:'u', t:L('Vieš to rovno odoslať bez môjho potvrdenia?','Can you send it right away without my confirmation?'), cite:null, tool:null, art:null, acts:[], fb:false},
    {r:'a',
     t:L('Nie — akcie ako založenie reklamácie sa vždy len pripravia ako koncept a čakajú na tvoje kliknutie Potvrdiť. Automatický zápis bez schválenia AuraAI nerobí.','No — actions like creating a claim are always prepared as a draft and wait for you to click Confirm. AuraAI never writes automatically without approval.'),
     cite:[{k:'appka', l:'AuraAI · pravidlá akcií'}], tool:null, art:null, acts:[], fb:true}
  ],
  c3:[
    {r:'u', t:L('Priprav copy manifest pre Summer Sale, jazyky SK a EN.','Draft a copy manifest for Summer Sale, SK and EN languages.'), cite:null, tool:null, art:null, acts:[], fb:false},
    {r:'a',
     t:L('Pred návrhom som si overil pravidlá kampane v znalostnej báze — platí campaign lock (svet Riviéra + modelka Adela) a headline limit 28 znakov pre rozmer 970×250.','Before drafting I checked the campaign rules in the knowledge base — the campaign lock holds (world Riviéra + model Adela) and the headline limit is 28 characters for the 970×250 size.'),
     cite:[{k:'pamäť', l:L('Pamäť Aura AI · Banner Studio spec v0.2','Aura AI memory · Banner Studio spec v0.2')}],
     tool:{name:'mind_recall', args:L('campaign lock summer sale headline limit','campaign lock summer sale headline limit'), out:L('campaign lock = svet+modelka, headline max 28 znakov (970×250), 4 QA deviations viedli k pravidlu','campaign lock = world+model, headline max 28 chars (970x250), rule came from 4 QA deviations'), ms:410},
     art:null, acts:[], fb:true},
    {r:'u', t:L('Napíš mi konkrétny headline a subline pre SK, rozmer 1080×1080.','Write me a concrete headline and subline for SK, size 1080x1080.'), cite:null, tool:null, art:null, acts:[], fb:false},
    {r:'a',
     t:L('Návrh:\n\n**Headline:** Leto v zlate\n**Subline:** Nová kolekcia do 31. 8.\n\nToto je ukážkový copy text, nie schválený od marketingu — pred exportom prejde cez QA gates.','Draft:\n\n**Headline:** Summer in gold\n**Subline:** New collection until Aug 31\n\nThis is sample copy, not marketing-approved — it goes through the QA gates before export.'),
     cite:[{k:'ukážka', l:L('ukážka · návrh copy','sample · copy draft')}], tool:null, art:null, acts:[], fb:true},
    {r:'u', t:L('Priprav to isté pre všetkých 8 jazykov ako manifest.','Prepare the same for all 8 languages as a manifest.'), cite:null, tool:null, art:null, acts:[], fb:false},
    {r:'a',
     t:L('Pripravil som ukážkový manifest pre 8 jazykov — obsah je len návrh na schválenie, čísla dokončenia (25/40 buniek) sú z demo dát appky, nie live stav.','I prepared a sample manifest for 8 languages — the content is a proposal awaiting approval; completion figures (25/40 cells) are demo data from the app, not the live state.'),
     cite:[{k:'ukážka', l:L('ukážka','sample data')}], tool:null,
     art:{title:L('Copy manifest — Summer Sale (návrh)','Copy manifest — Summer Sale (draft)'), kind:'code', lang:'json',
          text:'{\n  "campaign": "summer-sale",\n  "languages": ["sk","en","cz","pl","hu","ro","bg","hr"],\n  "sizes": ["1080x1080","1080x1350","1080x1920","1200x628","970x250"],\n  "headline_limit": {"970x250": 28},\n  "status": "draft"\n}'},
     acts:[{l:L('Otvoriť manifest','Open manifest'), k:'open'}], fb:true},
    {r:'u', t:L('Prečo má práve 970×250 kratší headline?','Why does 970x250 specifically have a shorter headline?'), cite:null, tool:null, art:null, acts:[], fb:false},
    {r:'a',
     t:L('Pravidlo vzniklo zo 4 predchádzajúcich QA deviations, kde headline pretiekol bezpečnú zónu banneru pri tomto úzkom formáte. Je to hard gate, export ho nedovolí obísť.','The rule came from 4 earlier QA deviations where the headline overflowed the banner safe zone at this narrow format. It is a hard gate — export cannot bypass it.'),
     cite:[{k:'pamäť', l:L('Pamäť Aura AI · Banner Studio spec v0.2','Aura AI memory · Banner Studio spec v0.2')}], tool:null, art:null, acts:[], fb:true},
    {r:'u', t:L('Vyexportuj mi zatiaľ len SK a EN verziu.','Export just the SK and EN version for now.'), cite:null, tool:null, art:null, acts:[], fb:false},
    {r:'a',
     t:L('Pripravujem CSV export len pre SK a EN bunky manifestu — zvyšných 6 jazykov ostáva v koncepte.','Preparing a CSV export for just the SK and EN manifest cells — the remaining 6 languages stay in draft.'),
     cite:[{k:'appka', l:'Marketing · /manifesty'}], tool:null, art:null,
     acts:[{l:L('Exportovať CSV','Export CSV'), k:'export'}], fb:true}
  ]
},

projects:[
  {id:'kampane', name:L('Kampane · Marketing','Campaigns · Marketing'), sub:L('Banner Studio + sperky-ai','Banner Studio + sperky-ai'),
   instr:L('Odpovedaj v tóne marketingového copywritera, vždy over campaign lock a QA hard gates pred návrhom textu. Ceny preber z e-shopu, nikdy neprepočítavaj menu.','Reply in the marketing copywriter tone, always check the campaign lock and QA hard gates before drafting copy. Take prices from the shop, never convert currency yourself.'),
   files:[{n:'kb-pravidla-bannerov.md', size:'18 kB', kind:'md'}, {n:'copy-manifest-summer.csv', size:'9 kB', kind:'csv'}, {n:'banner-1080x1080-ref.png', size:'2,1 MB', kind:'img'}],
   convos:4},
  {id:'kpi', name:L('KPI · mesačné vyhodnotenie','KPI · monthly review'), sub:L('Aura KPI appka, 11 oddelení','Aura KPI app, 11 departments'),
   instr:L('Pri číslach vždy uveď zdroj (appka/pamäť/ukážka). Nepočítaj Team score sám, cituj len z appky alebo označ ako ukážku.','Always state the source for numbers (app/memory/sample). Never compute Team score yourself — cite it from the app or mark it as a sample.'),
   files:[{n:'kpi-jun-2026.csv', size:'42 kB', kind:'csv'}, {n:'kpi-metodika.md', size:'11 kB', kind:'md'}],
   convos:2},
  {id:'logistika', name:L('Logistika · zásielky a reklamácie','Logistics · shipments and claims'), sub:L('GLS, Packeta, denný objem','GLS, Packeta, daily volume'),
   instr:L('Pri rizikách dopravcov vždy uveď, či ide o overený fakt z pamäte alebo odhad. Návrh reklamácie priprav ako koncept, nikdy neodosielaj bez potvrdenia.','For carrier risks, always state whether it is a verified memory fact or an estimate. Prepare claim drafts only — never submit without confirmation.'),
   files:[{n:'gls-tyzdenny-report.pdf', size:'310 kB', kind:'pdf'}],
   convos:1},
  {id:'trzby', name:L('Tržby · reporting','Revenue · reporting'), sub:L('mesačný report e-shopu','monthly shop report'),
   instr:L('Tržbu a maržu vždy rozlišuj — tržba môže byť z appky, marža často nie je overená. Nikdy nezaokrúhľuj overené číslo bez upozornenia.','Always distinguish revenue from margin — revenue may come from the app, margin is often not verified. Never round a verified number without flagging it.'),
   files:[{n:'trzby-jul-2026.csv', size:'88 kB', kind:'csv'}],
   convos:1}
],

prompts:[
  {t:L('Zhrň KPI oddelenia','Summarize a department\'s KPI'), s:L('vyžiada mesiac a oddelenie, vráti plnenie a trend','asks for month and department, returns attainment and trend'), tag:L('kpi','kpi')},
  {t:L('Skontroluj riziko dopravcu','Check a carrier risk'), s:L('porovná objem so zmluvným minimom','compares volume against the contracted minimum'), tag:L('logistika','logistics')},
  {t:L('Návrh copy manifestu','Draft a copy manifest'), s:L('pripraví headline a subline pre kampaň a jazyky','drafts a headline and subline for a campaign and languages'), tag:L('marketing','marketing')},
  {t:L('Vysvetli KB pravidlo','Explain a KB rule'), s:L('nájde pravidlo a dôvod jeho vzniku','finds a rule and why it was created'), tag:L('marketing','marketing')},
  {t:L('Priprav týždenný report tržieb','Draft a weekly revenue report'), s:L('zhrnie tržbu, maržu a trhy s citáciou zdroja','summarizes revenue, margin and markets with a source citation'), tag:L('trzby','revenue')},
  {t:L('Over dáta pred rozhodnutím','Verify data before a decision'), s:L('spustí mind_recall a povie, čo je overené a čo nie','runs mind_recall and states what is verified vs not'), tag:L('pamäť','memory')}
],

models:[
  {k:'qwen3:4b', l:L('lokálny · Ollama','local · Ollama'), sub:L('router + krátke odpovede','router + short replies'), tone:'ok', ctx:'32k', cost:L('0 € · beží na PC','€0 · runs on your PC')},
  {k:'bge-m3', l:L('lokálny · embeddings','local · embeddings'), sub:L('vyhľadávanie v pamäti, SK↔EN mosty','memory search, SK↔EN bridges'), tone:'ok', ctx:'8k', cost:L('0 € · beží na PC','€0 · runs on your PC')},
  {k:'cloud-fallback', l:L('cloud · záložný','cloud · fallback'), sub:L('len keď lokálny model nebeží','only when the local model is down'), tone:'warn', ctx:'128k', cost:L('podľa spotreby, strop 300 €/mes.','pay per use, €300/mo cap')}
],

usage:{
  today:{tokens:'184 tis.', cost:L('0,00 €','€0.00'), reqs:142},
  cap:L('strop 300 € / mes. (cloud fallback)','€300/mo cap (cloud fallback)'),
  rows:[
    {c:['29. 7.', 'qwen3:4b', '61 tis.', '0,4 s medián', '0,00 €']},
    {c:['30. 7.', 'qwen3:4b', '58 tis.', '0,4 s medián', '0,00 €']},
    {c:['31. 7.', 'bge-m3', '12 tis.', '2,2 s medián', '0,00 €']},
    {c:['1. 8.', 'qwen3:4b', '49 tis.', '0,4 s medián', '0,00 €']},
    {c:['4. 8.', 'cloud-fallback', '4 tis.', '1,1 s medián', '0,06 €']}
  ]
},

states:[
  {k:'empty', l:L('Prázdna obrazovka','Empty state'), d:L('Používateľ vidí privítanie, 6 návrhov a prepínač modelu s poznámkou, že model beží lokálne na jeho PC.','The user sees a welcome message, 6 suggestions and a model switcher noting the model runs locally on their PC.')},
  {k:'streaming', l:L('Streamovanie odpovede','Streaming a reply'), d:L('Text sa dopĺňa po tokenoch s blikajúcim kurzorom na konci, tlačidlo Odoslať sa zmení na Zastaviť.','Text fills in token by token with a blinking cursor at the end; the Send button turns into Stop.')},
  {k:'tool-call', l:L('Beží nástroj','Tool is running'), d:L('Zbaliteľný blok ukazuje meno nástroja a spinner, po dokončení sa rozbalí na argumenty, výstup a trvanie v ms.','A collapsible block shows the tool name and a spinner; once done it expands to arguments, output and duration in ms.')},
  {k:'error', l:L('Chyba modelu','Model error'), d:L('Bublina asistenta sa nahradí červeným pásikom s dôvodom a tlačidlom Skúsiť znova, používateľov prompt ostáva zachovaný na úpravu.','The assistant bubble is replaced by a red banner with a reason and a Retry button; the user\'s prompt stays intact for editing.')},
  {k:'rate-limit', l:L('Limit spotreby','Rate limit'), d:L('Nad stropom 300 €/mes. sa cloud fallback zastaví, lokálny model qwen3:4b beží ďalej bez obmedzenia.','Above the €300/mo cap the cloud fallback stops; the local qwen3:4b model keeps running without limits.')},
  {k:'offline', l:L('Lokálny model nebeží','Local model is down'), d:L('Banner hore hlási výpadok Ollamy a ponúkne prepnúť na cloud fallback alebo počkať na reštart kontajnera.','A banner at the top reports the Ollama outage and offers to switch to the cloud fallback or wait for a container restart.')},
  {k:'long-context', l:L('Dlhý kontext','Long context'), d:L('Staršia časť vlákna sa zbalí do súhrnu s odkazom Zobraziť pôvodné správy, aby model qwen3:4b so 32k kontextom stíhal odpovedať.','The older part of the thread collapses into a summary with a Show original messages link so the 32k-context qwen3:4b keeps up.')},
  {k:'zdieľanie', l:L('Zdieľané zobrazenie','Shared view'), d:L('Odkaz na konverzáciu sa otvára v read-only režime bez vstupného poľa a bez tlačidiel akcií, len s hlavičkou kto zdieľal a kedy.','The conversation link opens in read-only mode with no input field and no action buttons, only a header showing who shared it and when.')}
],

files:[
  {n:'brief-jesen.pdf', size:'1,2 MB', kind:'pdf', st:['ok', L('spracované','processed')]},
  {n:'kpi-jun-2026.csv', size:'42 kB', kind:'csv', st:['ok', L('spracované','processed')]},
  {n:'gls-report-w31.pdf', size:'310 kB', kind:'pdf', st:['warn', L('čiastočne prečítané — skenovaná príloha','partially read — scanned attachment')]},
  {n:'banner-1080x1080-ref.png', size:'2,1 MB', kind:'img', st:['ok', L('rozpoznané ako referenčný obrázok','recognized as a reference image')]},
  {n:'poznamky-porada.md', size:'6 kB', kind:'md', st:['err', L('nepodarilo sa načítať — kódovanie','failed to load — encoding issue')]}
],

settings:[
  {g:L('Model a beh','Model and runtime'), rows:[
    {l:L('Predvolený model','Default model'), s:L('používa sa pri novej konverzácii','used for new conversations'), type:'select', v:'qwen3:4b'},
    {l:L('Cloud fallback','Cloud fallback'), s:L('zapnúť, keď lokálny model nebeží','enable when the local model is down'), type:'switch', on:true},
    {l:L('Dĺžka kontextu','Context length'), s:L('32k pre qwen3:4b, staršie správy sa zhrnú','32k for qwen3:4b, older messages get summarized'), type:'select', v:'32k'},
    {l:L('Port lokálneho behu','Local runtime port'), s:L('Ollama beží na localhost:8082','Ollama runs on localhost:8082'), type:'text', v:'8082'}
  ]},
  {g:L('Pamäť a citácie','Memory and citations'), rows:[
    {l:L('Povinná citácia zdroja','Mandatory source citation'), s:L('bez zdroja sa číslo v odpovedi nezobrazí','a number is not shown in a reply without a source'), type:'switch', on:true},
    {l:L('Prehľadávanie pamäte Aura AI','Search Aura AI memory'), s:L('mind_recall pred odpoveďou na faktické otázky','mind_recall before answering factual questions'), type:'switch', on:true},
    {l:L('Embedding model','Embedding model'), s:L('bge-m3, SK↔EN mosty pre vyhľadávanie','bge-m3, SK↔EN bridges for search'), type:'select', v:'bge-m3'}
  ]},
  {g:L('Spotreba a limity','Usage and limits'), rows:[
    {l:L('Mesačný strop','Monthly cap'), s:L('platí len pre cloud fallback, lokálny model je 0 €','applies only to cloud fallback, local model is €0'), type:'text', v:'300 €'},
    {l:L('Upozornenie pri 80 %','Alert at 80%'), s:L('e-mail keď spotreba cloud fallbacku prekročí 240 €','email when cloud fallback spend passes €240'), type:'switch', on:true},
    {l:L('Denný limit požiadaviek','Daily request limit'), s:L('ochrana pred slučkou nástrojov','protection against a tool-call loop'), type:'text', v:'500'}
  ]},
  {g:L('Súkromie a zdieľanie','Privacy and sharing'), rows:[
    {l:L('Read-only odkazy','Read-only links'), s:L('zdieľaná konverzácia nejde upravovať ani pokračovať','a shared conversation cannot be edited or continued'), type:'switch', on:true},
    {l:L('Odosielanie kontextu do cloudu','Sending context to the cloud'), s:L('filter pred fallbackom, aby lokálne dáta neodišli von zbytočne','a filter before fallback so local data does not leave unnecessarily'), type:'switch', on:false},
    {l:L('Uchovávanie histórie','History retention'), s:L('ako dlho appka drží staré konverzácie','how long the app keeps old conversations'), type:'select', v:L('90 dní','90 days')}
  ]}
]
};
