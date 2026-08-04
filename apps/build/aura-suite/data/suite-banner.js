/* ══════════════════════════════════════════════════════════════
   Aura Suite — dátový súbor appky Aura Banner Studio (:8091)
   Rozšírenie APP_BANNER (apps/build/aura-ai/data-studios.js) na plnú
   navigáciu (12 obrazoviek) podľa KONTRAKT-AURA-SUITE.md.
   Overené fakty pochádzajú z Hades pamäte (mind_recall, session
   aura-suite-2026-08-04) — sú označené v poznámkach blokov. Všetko
   ostatné (konkrétne kampane, produkty, ceny, joby, deviations,
   exporty) je ukážkové a je tak v `note` napísané.
   ══════════════════════════════════════════════════════════════ */

const APP_BANNER2 = {
  key:'banner', name:'Aura Banner Studio', port:'8091', icon:'tag',
  tag:L('Samostatná appka pre kampane, render frontu, QA gates, exporty a AI providerov Banner Studia.','A standalone app for Banner Studio\'s campaigns, render queue, QA gates, exports and AI providers.'),
  feat:[
    L('Kampane s tvrdým lockom (1 svet + 1 modelka) a render frontou HTML/CSS → Playwright/Chromium → PNG → ZIP','Campaigns with a hard lock (1 world + 1 model) and a render queue: HTML/CSS → Playwright/Chromium → PNG → ZIP'),
    L('QA hard gates vs soft rules s minor/major deviation a learning loop do znalostnej bázy','QA hard gates vs soft rules with minor/major deviation and a learning loop into the knowledge base'),
    L('AI provider mock/openai/gemini s mesačným budget stropom 100–300 € a ZIP exportmi','AI provider mock/openai/gemini with a €100–300 monthly budget cap and ZIP exports')
  ],
  live:{v:L('QA pass rate 91 % · AI budget 62 % zo stropu 300 €','QA pass rate 91% · AI budget at 62% of the €300 cap'), tone:'cond', spark:[55,58,60,57,62,60,62]},

  api:{ endpoints:[
      {k:'products', l:L('Produkty','Products'), ms:140},
      {k:'kb', l:L('Znalostná báza','Knowledge base'), ms:95},
      {k:'render', l:L('Render','Render'), ms:310}
    ],
    sync:L('pred 3 min','3 min ago'), tone:'ok' },

  imp:{ target:'kampane',
    cols:[
      {k:'kod', l:L('Kód kampane','Campaign code'), t:'text'},
      {k:'svet', l:L('Svet','World'), t:'text'},
      {k:'modelka', l:L('Modelka','Model'), t:'text'},
      {k:'jazyky', l:L('Jazyky','Languages'), t:'num'},
      {k:'stav', l:L('Stav','Status'), t:'text'}
    ],
    key:[L('kľúč upsertu: kód kampane','upsert key: campaign code')],
    csv:'kod;svet;modelka;jazyky;stav\nBF-2026;Bold Statement;Adela;8;navrh\nWED-SEA;Wedding Bloom;Viktoria;8;qa\nGOLD-RIN;Golden Hour;Nikola;8;render\nNEWGEM-01;Quiet Luxury;Adela;8;hotova\nSPRING-26;Urban Editorial;Zuzka;8;render\nPEARL-01;Quiet Luxury;Adela;8;hotova\n' },

  rep:{ templates:[
      {k:'qa', l:L('QA report','QA report'), s:L('Hard gates vs soft rules, deviations minor/major, trend prechodnosti','Hard gates vs soft rules, minor/major deviations, pass-rate trend')},
      {k:'exporty', l:L('Report exportov','Export report'), s:L('ZIP balíky, veľkosti, kto a kedy stiahol','ZIP packages, sizes, who downloaded and when')},
      {k:'budget', l:L('Čerpanie AI budgetu','AI budget burn'), s:L('Mesačné čerpanie voči stropu podľa providera','Monthly burn vs cap by provider')}
    ] },

  screens:[
    /* ───────────────────────── 1. PREHĽAD ───────────────────────── */
    {
      key:'prehlad', icon:'gauge',
      title:L('Prehľad','Overview'),
      sub:L('Stav pipeline, joby, budget a QA prechodnosť','Pipeline status, jobs, budget and QA pass rate'),
      blocks:[
        {t:'kpis', items:[
          {l:L('Aktívne kampane','Active campaigns'), v:int(4), sub:L('campaign lock: 1 svet + 1 modelka · 3 modelky (Adela, Nikola, Viktória)','campaign lock: 1 world + 1 model · 3 models (Adela, Nikola, Viktória)'), tone:null},
          {l:L('Vygenerované bannery','Banners generated'), v:int(320), sub:L('8 jazykov × 5 rozmerov','8 languages × 5 sizes'), tone:null},
          {l:L('AI budget — čerpanie','AI budget — burn'), v:'62 %', sub:L('z mesačného stropu 300 €','of the €300 monthly cap'), tone:'cond'},
          {l:L('QA pass rate','QA pass rate'), v:'91 %', sub:L('bannerov prešlo QA gates','of banners passed QA gates'), tone:'ok'}
        ]},
        {t:'bars', title:L('Bannery podľa rozmeru','Banners by size'),
          data:[{l:'1080×1080', v:96},{l:'1080×1350', v:80},{l:'1080×1920', v:56},{l:'1200×628', v:48},{l:'970×250', v:40}]},
        {t:'donut', title:L('QA prechodnosť','QA pass rate'), pct:91, label:L('bannerov prešlo QA gates','of banners passed QA gates')},
        {t:'list', title:L('Kampane vyžadujúce akciu','Campaigns needing action'), items:[
          {title:L('Black Friday','Black Friday'), sub:L('manifest nedokončený','manifest unfinished'), badge:['q',L('Návrh','Draft')]},
          {title:L('Svadobná sezóna','Wedding season'), sub:L('2 bannery major deviation','2 banners major deviation'), badge:['cond','QA']},
          {title:L('Zlaté prstene','Gold rings'), sub:L('render beží — 35/40 PNG','render running — 35/40 PNGs'), badge:['cond','Render']}
        ]},
        {t:'banner', tone:'cond', text:L('AI budget: čerpanie 62 % mesačného stropu 300 € — pri prekročení sa generovanie zastaví.','AI budget at 62% of the €300 monthly cap — generation halts at the limit.')}
      ],
      ai:[
        {q:L('Koľko je aktívnych kampaní a koľko bannerov je hotových?','How many active campaigns are there and how many banners are done?'),
         a:L('4 aktívne kampane, spolu 320 vygenerovaných bannerov (8 jazykov × 5 rozmerov). Zlaté prstene majú render rozbehnutý na 35/40 PNG, Black Friday čaká na dokončenie manifestu.','4 active campaigns, 320 banners generated in total (8 languages × 5 sizes). Gold rings has a render in progress at 35/40 PNGs, Black Friday is waiting on the manifest.'),
         cite:'appka', act:{l:L('Otvoriť kampane','Open campaigns'), k:'open'}},
        {q:L('Aké je čerpanie AI budgetu tento mesiac?','What is the AI budget burn this month?'),
         a:L('62 % z mesačného stropu 300 € (186 € vyčerpaných, 114 € rezerva). Strop 100–300 € je overený z rozhodnutí projektu, generovanie sa pri prekročení zastaví.','62% of the €300 monthly cap (€186 used, €114 headroom). The €100–300 cap is a verified project decision; generation halts if it is exceeded.'),
         cite:'appka', act:{l:L('Otvoriť AI provider','Open AI provider'), k:'open'}},
        {q:L('Ktoré kampane potrebujú pozornosť?','Which campaigns need attention?'),
         a:L('Black Friday má nedokončený manifest, Svadobná sezóna má 2 bannery s major deviation po QA a Zlaté prstene majú render ešte v behu.','Black Friday has an unfinished manifest, Wedding season has 2 banners with a major QA deviation, and Gold rings still has a render in progress.'),
         cite:'appka', act:{l:L('Otvoriť QA gates','Open QA gates'), k:'filter'}}
      ]
    },

    /* ───────────────────────── 2. KAMPANE ───────────────────────── */
    {
      key:'kampane', icon:'megaphone',
      title:L('Kampane','Campaigns'),
      sub:L('Zoznam kampaní: svet, modelka, jazyky, bannery, stav','Campaign list: world, model, languages, banners, status'),
      blocks:[
        {t:'kpis', items:[
          {l:L('Kampaní spolu','Total campaigns'), v:int(23), tone:null},
          {l:L('V behu (render/QA)','In progress (render/QA)'), v:int(7), tone:'cond'},
          {l:L('Hotové','Done'), v:int(10), tone:'ok'},
          {l:L('Campaign lock','Campaign lock'), v:L('1 svet + 1 modelka','1 world + 1 model'), sub:L('tvrdé pravidlo na kampaň','hard rule per campaign'), tone:null}
        ]},
        {t:'bars', title:L('Kampane podľa sveta','Campaigns by world'),
          data:[{l:'Quiet Luxury', v:5},{l:'Golden Hour', v:5},{l:'Wedding Bloom', v:5},{l:L('Winter Frost','Winter Frost'), v:3},{l:L('Urban Editorial','Urban Editorial'), v:3},{l:L('Bold Statement','Bold Statement'), v:2}],
          note:L('Quiet Luxury je jediný názov sveta, ktorý sa reálne objavuje v QA dátach appky (paleta pozadia). Ostatné názvy svetov sú ukážkové.','Quiet Luxury is the only world name that actually appears in the app\'s QA data (background palette). The other world names are illustrative.')},
        {t:'table', title:L('Zoznam kampaní','Campaign list'),
          cols:[L('Kampaň','Campaign'), L('Svet','World'), L('Modelka','Model'), L('Jazyky','Languages'), L('Bannery','Banners'), L('Stav','Status')],
          rows:[
            {c:[L('Black Friday','Black Friday'), L('Bold Statement','Bold Statement'), 'Adela', int(8), '0/40', ['q', L('Návrh','Draft')]], go:'kampan'},
            {c:[L('Svadobná sezóna','Wedding season'), L('Wedding Bloom','Wedding Bloom'), 'Viktória', int(8), '38/40', ['cond', 'QA']], go:'kampan'},
            {c:[L('Zlaté prstene','Gold rings'), L('Golden Hour','Golden Hour'), 'Nikola', int(8), '35/40', ['info', L('Render','Rendering')]], go:'kampan'},
            {c:['New Gem', 'Quiet Luxury', 'Adela', int(8), '40/40', ['ok', L('Hotová','Done')]], go:'kampan'},
            {c:['Summer Sale', 'Golden Hour', 'Viktória', int(8), '40/40', ['ok', L('Hotová','Done')]], go:'kampan'},
            {c:[L('Doprava zadarmo','Free shipping'), 'Quiet Luxury', 'Nikola', int(3), '15/15', ['ok', L('Hotová','Done')]], go:'kampan'},
            {c:[L('Valentín','Valentine\'s'), L('Wedding Bloom','Wedding Bloom'), 'Adela', int(8), '40/40', ['ok', L('Hotová','Done')]], go:'kampan'},
            {c:[L('Vianočná kolekcia','Christmas collection'), L('Winter Frost','Winter Frost'), 'Viktória', int(8), '0/40', ['q', L('Návrh','Draft')]], go:'kampan'},
            {c:[L('Jarná kolekcia','Spring collection'), L('Urban Editorial','Urban Editorial'), 'Nikola', int(8), '20/40', ['info', L('Render','Rendering')]], go:'kampan'},
            {c:[L('Perlové šperky','Pearl jewelry'), 'Quiet Luxury', 'Adela', int(8), '40/40', ['ok', L('Hotová','Done')]], go:'kampan'},
            {c:[L('Strieborné náušnice','Silver earrings'), L('Winter Frost','Winter Frost'), 'Viktória', int(8), '12/40', ['info', L('Render','Rendering')]], go:'kampan'},
            {c:[L('Diamantové trio','Diamond trio'), 'Golden Hour', 'Nikola', int(8), '0/40', ['q', L('Návrh','Draft')]], go:'kampan'},
            {c:[L('Výpredaj skladu','Stock clearance'), L('Urban Editorial','Urban Editorial'), 'Adela', int(8), '40/40', ['ok', L('Hotová','Done')]], go:'kampan'},
            {c:[L('Nová sezóna 2026','New season 2026'), 'Quiet Luxury', 'Viktória', int(8), '5/40', ['info', L('Render','Rendering')]], go:'kampan'},
            {c:[L('Darček pre mamu','Gift for mom'), L('Wedding Bloom','Wedding Bloom'), 'Nikola', int(8), '24/40', ['cond', 'QA']], go:'kampan'},
            {c:[L('Snubné prstene','Wedding rings'), L('Wedding Bloom','Wedding Bloom'), 'Adela', int(8), '40/40', ['ok', L('Hotová','Done')]], go:'kampan'},
            {c:[L('Retro kolekcia','Retro collection'), L('Urban Editorial','Urban Editorial'), 'Viktória', int(8), '0/40', ['no', L('Pozastavená','Paused')]], go:'kampan'},
            {c:[L('Zlaté reťaze','Gold chains'), 'Golden Hour', 'Nikola', int(8), '40/40', ['ok', L('Hotová','Done')]], go:'kampan'},
            {c:[L('Charitatívna kampaň','Charity campaign'), 'Quiet Luxury', 'Adela', int(8), '8/40', ['info', L('Render','Rendering')]], go:'kampan'},
            {c:[L('Letná akcia','Summer promo'), 'Golden Hour', 'Viktória', int(8), '40/40', ['ok', L('Hotová','Done')]], go:'kampan'},
            {c:['Black Week', L('Bold Statement','Bold Statement'), 'Nikola', int(8), '0/40', ['q', L('Návrh','Draft')]], go:'kampan'},
            {c:[L('Mikuláš','St. Nicholas Day'), L('Winter Frost','Winter Frost'), 'Adela', int(8), '40/40', ['q', L('Archivovaná','Archived')]], go:'kampan'},
            {c:[L('Deň žien','Women\'s Day'), L('Wedding Bloom','Wedding Bloom'), 'Viktória', int(8), '40/40', ['ok', L('Hotová','Done')]], go:'kampan'}
          ],
          note:L('Overené: pravidlo campaign lock (1 svet + 1 modelka), počet modeliek (3: Adela, Viktória, Nikola) a 8 jazykov na kampaň. Konkrétnych 23 kampaní, názvy svetov (okrem Quiet Luxury) a počty bannerov sú ukážkové — ilustrujú rozloženie stavov, nie sú z reálnej databázy kampaní.','Verified: the campaign-lock rule (1 world + 1 model), the number of models (3: Adela, Viktória, Nikola) and 8 languages per campaign. The 23 specific campaigns, the world names (except Quiet Luxury) and the banner counts are illustrative — they show the status spread, not pulled from the real campaign database.'),
          page:true},
        {t:'donut', title:L('Podiel hotových kampaní','Share of completed campaigns'), pct:43, label:L('z 23 kampaní je exportovaných','of 23 campaigns are exported')}
      ],
      ai:[
        {q:L('Koľko kampaní je práve v render alebo QA fáze?','How many campaigns are currently in render or QA?'),
         a:L('7 kampaní: 5 v Render (Zlaté prstene, Jarná kolekcia, Strieborné náušnice, Nová sezóna 2026, Charitatívna kampaň) a 2 v QA (Svadobná sezóna, Darček pre mamu).','7 campaigns: 5 in Render (Gold rings, Spring collection, Silver earrings, New season 2026, Charity campaign) and 2 in QA (Wedding season, Gift for mom).'),
         cite:'appka', act:{l:L('Filtrovať podľa stavu','Filter by status'), k:'filter'}},
        {q:L('Čo znamená campaign lock?','What does campaign lock mean?'),
         a:L('Každá kampaň má naviazaný presne jeden svet (napr. Quiet Luxury) a jednu modelku — kombináciu nie je možné počas kampane meniť, je to overené tvrdé pravidlo appky.','Each campaign is tied to exactly one world (e.g. Quiet Luxury) and one model — the combination cannot be changed during the campaign; this is a verified hard rule of the app.'),
         cite:'pamäť', act:null},
        {q:L('Ktorá modelka má najviac kampaní?','Which model has the most campaigns?'),
         a:L('Adela a Viktória majú po 8 kampaní, Nikola 7 — rozdiel je malý a rozloženie je skôr rovnomerné naprieč 23 kampaňami.','Adela and Viktória each have 8 campaigns, Nikola has 7 — the difference is small and the spread is fairly even across the 23 campaigns.'),
         cite:'appka', act:{l:L('Otvoriť modelky','Open models'), k:'open'}}
      ]
    },

    /* ───────────────────────── 3. KAMPAŇ (detail) ───────────────────────── */
    {
      key:'kampan', icon:'flag',
      title:L('Detail kampane','Campaign detail'),
      sub:L('New Gem — lock, manifest, render, QA, export, aktivita','New Gem — lock, manifest, render, QA, export, activity'),
      blocks:[
        {t:'cards', n:2, items:[
          {title:L('Campaign lock','Campaign lock'), sub:'New Gem', lines:[[L('Svet','World'), 'Quiet Luxury'],[L('Modelka','Model'), 'Adela']]},
          {title:L('Stav','Status'), sub:L('export dokončený','export completed'), badge:['ok', L('Hotová','Done')], lines:[[L('Bannery','Banners'), '40/40'],[L('QA pass rate','QA pass rate'), '100 %']]}
        ]},
        {t:'gantt', title:L('Priebeh pipeline','Pipeline progress'), rows:[
          {l:L('Manifest','Manifest'), s:0, w:15, b:['ok', L('Hotovo','Done')]},
          {l:L('Render','Render'), s:15, w:45, b:['ok', L('Hotovo','Done')]},
          {l:'QA', s:60, w:20, b:['ok', L('Hotovo','Done')]},
          {l:L('Export','Export'), s:80, w:20, b:['ok', L('Hotovo','Done')]}
        ], today:100, note:L('Pipeline 1 (deterministický HTML/CSS → Playwright/Chromium → PNG → ZIP) beží naživo — táto kampaň prešla všetkými 4 krokmi.','Pipeline 1 (deterministic HTML/CSS → Playwright/Chromium → PNG → ZIP) runs live — this campaign has passed through all 4 steps.')},
        {t:'matrix', title:L('Manifest — stav podľa rozmeru × jazyka','Manifest — status by size × language'),
          rows:['1080×1080','1080×1350','1080×1920','1200×628','970×250'],
          cols:['SK','EN','DE','HU','CZ','PL','RO','BG'],
          st:{
            '1080×1080':[2,2,2,2,2,2,2,2],
            '1080×1350':[2,2,2,2,2,2,2,2],
            '1080×1920':[2,2,2,2,2,2,2,2],
            '1200×628':[2,2,2,2,2,2,2,2],
            '970×250':[2,2,2,2,2,2,2,2]
          },
          note:L('New Gem má všetkých 40 kombinácií (5 rozmerov × 8 jazykov) dokončených — zodpovedá exportu 40 PNG · 58 MB z obrazovky Exporty.','New Gem has all 40 combinations (5 sizes × 8 languages) completed — matches the 40 PNG · 58 MB export on the Exports screen.')},
        {t:'timeline', title:L('Aktivita kampane','Campaign activity'), items:[
          [L('Včera 16:20','Yesterday 16:20'), L('Export stiahnutý — admin, 40 PNG · 58 MB','Export downloaded — admin, 40 PNGs · 58 MB')],
          [L('Včera 15:58','Yesterday 15:58'), L('QA gates prešli — 100 % pass rate','QA gates passed — 100% pass rate')],
          [L('Včera 15:10','Yesterday 15:10'), L('Render dokončený — 40/40 PNG','Render completed — 40/40 PNGs')],
          [L('Včera 14:40','Yesterday 14:40'), L('Render spustený pre 5 rozmerov × 8 jazykov','Render started for 5 sizes × 8 languages')],
          [L('Pred 3 dňami','3 days ago'), L('Manifest dokončený a zamknutý (svet Quiet Luxury, modelka Adela)','Manifest completed and locked (world Quiet Luxury, model Adela)')]
        ]},
        {t:'banner', tone:'ok', text:L('Campaign lock aktívny: New Gem beží so svetom Quiet Luxury a modelkou Adela — zmena jedného z nich by vyžadovala novú kampaň.','Campaign lock active: New Gem runs with the Quiet Luxury world and the Adela model — changing either would require a new campaign.')},
        {t:'note', text:L('New Gem je reprezentatívny príklad hotovej kampane — hodnoty pipeline a matice manifestu sú ukážkové, princíp locku, matice manifestu a 4-krokovej pipeline je reálny.','New Gem is a representative example of a completed campaign — the pipeline and manifest-matrix values are illustrative; the lock principle, manifest matrix and 4-step pipeline are real.')}
      ],
      ai:[
        {q:L('Aký svet a akú modelku má New Gem zamknuté?','Which world and model does New Gem have locked?'),
         a:L('Svet Quiet Luxury a modelka Adela — campaign lock znamená, že táto kombinácia platí pre celú kampaň a nedá sa počas jej behu meniť.','World Quiet Luxury and model Adela — campaign lock means this combination applies to the whole campaign and cannot be changed while it runs.'),
         cite:'appka', act:null},
        {q:L('Je manifest kampane kompletný?','Is the campaign manifest complete?'),
         a:L('Áno, všetkých 40 kombinácií (5 rozmerov × 8 jazykov) je dokončených, čo zodpovedá exportu 40 PNG · 58 MB.','Yes, all 40 combinations (5 sizes × 8 languages) are complete, matching the 40 PNG · 58 MB export.'),
         cite:'appka', act:{l:L('Otvoriť manifesty','Open manifests'), k:'open'}},
        {q:L('Kedy bol export stiahnutý a kým?','When was the export downloaded and by whom?'),
         a:L('Včera o 16:20 účtom admin — appka má zatiaľ len jeden zdieľané prihlasovacie meno, takže všetky exporty sťahuje ten istý účet.','Yesterday at 16:20 by the admin account — the app currently has only one shared login, so the same account downloads every export.'),
         cite:'appka', act:{l:L('Otvoriť exporty','Open exports'), k:'open'}}
      ]
    },

    /* ───────────────────────── 4. MODELKY ───────────────────────── */
    {
      key:'modelky', icon:'user',
      title:L('Modelky','Models'),
      sub:L('3 identity a ich priradenie ku kampaniam','3 identities and their campaign assignments'),
      blocks:[
        {t:'kpis', items:[
          {l:L('Modelky','Models'), v:int(3), sub:L('Adela, Viktória, Nikola','Adela, Viktória, Nikola'), tone:null},
          {l:L('Priradených kampaní','Assigned campaigns'), v:int(23), tone:null},
          {l:L('Najvyťaženejšia','Most assigned'), v:L('Adela / Viktória (8)','Adela / Viktória (8)'), tone:null},
          {l:L('Campaign lock','Campaign lock'), v:L('1 modelka na kampaň','1 model per campaign'), tone:null}
        ]},
        {t:'cards', n:3, items:[
          {title:'Adela', sub:L('8 kampaní priradených','8 campaigns assigned'), badge:['ok', L('Aktívna','Active')], lines:[[L('Svety','Worlds'), 'Quiet Luxury, Wedding Bloom, Urban Editorial'],[L('Hotové kampane','Completed campaigns'), int(5)]]},
          {title:'Viktória', sub:L('8 kampaní priradených','8 campaigns assigned'), badge:['ok', L('Aktívna','Active')], lines:[[L('Svety','Worlds'), 'Wedding Bloom, Golden Hour, Winter Frost, Urban Editorial'],[L('Hotové kampane','Completed campaigns'), int(4)]]},
          {title:'Nikola', sub:L('7 kampaní priradených','7 campaigns assigned'), badge:['ok', L('Aktívna','Active')], lines:[[L('Svety','Worlds'), 'Golden Hour, Quiet Luxury, Urban Editorial, Bold Statement'],[L('Hotové kampane','Completed campaigns'), int(1)]]}
        ]},
        {t:'bars', title:L('Kampane podľa modelky','Campaigns by model'),
          data:[{l:'Adela', v:8},{l:'Viktória', v:8},{l:'Nikola', v:7}]},
        {t:'list', title:L('Pravidlo priradenia','Assignment rule'), items:[
          {title:L('Campaign lock','Campaign lock'), sub:L('jedna modelka je na kampaň zamknutá spolu so svetom, zmena vyžaduje novú kampaň','one model is locked to a campaign together with a world; a change requires a new campaign'), badge:['ok', L('Overené','Verified')]},
          {title:L('3 stále modelky','3 standing models'), sub:L('Adela, Viktória, Nikola — nie je plánované pridávanie ďalších v MVP','Adela, Viktória, Nikola — no additional models are planned for the MVP'), badge:['q', L('Stav','Status')]}
        ]},
        {t:'note', text:L('Mená modeliek (Adela, Viktória, Nikola) a pravidlo campaign lock sú overené z pamäte Aura AI. Konkrétne počty priradených kampaní a hotových kampaní na modelku sú ukážkové, vychádzajú z tabuľky na obrazovke Kampane.','The model names (Adela, Viktória, Nikola) and the campaign-lock rule are verified from Aura AI memory. The specific assigned/completed campaign counts per model are illustrative, based on the Campaigns table.')}
      ],
      ai:[
        {q:L('Koľko modeliek appka používa?','How many models does the app use?'),
         a:L('3 stále modelky — Adela, Viktória a Nikola. Toto je overené z pamäte projektu, nie je to ukážkové číslo.','3 standing models — Adela, Viktória and Nikola. This is verified from project memory, not an illustrative number.'),
         cite:'pamäť', act:null},
        {q:L('Môže mať jedna kampaň dve modelky?','Can one campaign have two models?'),
         a:L('Nie — campaign lock viaže kampaň na presne jednu modelku spolu s jedným svetom; kombinácia sa počas behu kampane nemení.','No — campaign lock ties a campaign to exactly one model together with one world; the combination does not change while the campaign runs.'),
         cite:'pamäť', act:null},
        {q:L('Ktorá modelka má najviac hotových kampaní?','Which model has the most completed campaigns?'),
         a:L('Adela s 5 hotovými kampaňami spomedzi svojich 8 priradených, pred Viktóriou so 4 z 8.','Adela with 5 completed campaigns out of her 8 assigned, ahead of Viktória with 4 out of 8.'),
         cite:'ukážka', act:{l:L('Otvoriť kampane','Open campaigns'), k:'filter'}}
      ]
    },

    /* ───────────────────────── 5. PRODUKTY ───────────────────────── */
    {
      key:'produkty', icon:'bag',
      title:L('Produkty','Products'),
      sub:L('Katalóg produktov s cenami pre overlay do bannerov','Product catalog with prices for the banner overlay'),
      blocks:[
        {t:'kpis', items:[
          {l:L('Produktov v katalógu','Products in catalog'), v:int(22), tone:null},
          {l:L('Priemerná cena','Average price'), v:cur(223), tone:null},
          {l:L('Najpoužívanejší produkt','Most used product'), v:L('Snubný prsteň pár','Wedding rings pair'), sub:L('v 6 kampaniach','in 6 campaigns'), tone:null},
          {l:L('Kategórií','Categories'), v:int(5), tone:null}
        ]},
        {t:'table', title:L('Produkty a ceny pre overlay','Products and overlay prices'),
          cols:[L('Produkt','Product'), 'SKU', L('Kategória','Category'), L('Cena','Price'), L('Použité v kampaniach','Used in campaigns')],
          rows:[
            {c:[L('Zlatý prsteň s diamantom','Gold ring with diamond'), 'RG-1042', L('Prstene','Rings'), cur(429), int(5)]},
            {c:[L('Strieborný prsteň Eternity','Silver Eternity ring'), 'RG-1088', L('Prstene','Rings'), cur(89), int(3)]},
            {c:[L('Zásnubný prsteň Solitaire','Solitaire engagement ring'), 'RG-1105', L('Prstene','Rings'), cur(650), int(4)]},
            {c:[L('Snubný prsteň pár','Wedding rings pair'), 'RG-1120', L('Prstene','Rings'), cur(390), int(6)]},
            {c:[L('Strieborné náušnice kvapka','Silver drop earrings'), 'ER-2031', L('Náušnice','Earrings'), cur(59), int(4)]},
            {c:[L('Zlaté náušnice pecky','Gold stud earrings'), 'ER-2050', L('Náušnice','Earrings'), cur(129), int(5)]},
            {c:[L('Perlové náušnice','Pearl earrings'), 'ER-2077', L('Náušnice','Earrings'), cur(79), int(3)]},
            {c:[L('Náramok Tenis','Tennis bracelet'), 'BR-3010', L('Náramky','Bracelets'), cur(189), int(4)]},
            {c:[L('Náramok Charm','Charm bracelet'), 'BR-3033', L('Náramky','Bracelets'), cur(99), int(3)]},
            {c:[L('Strieborný náramok jemný','Fine silver bracelet'), 'BR-3050', L('Náramky','Bracelets'), cur(65), int(2)]},
            {c:[L('Zlatá retiazka jemná','Fine gold chain'), 'CH-4012', L('Retiazky','Chains'), cur(149), int(5)]},
            {c:[L('Strieborná retiazka pánska','Men\'s silver chain'), 'CH-4040', L('Retiazky','Chains'), cur(119), int(2)]},
            {c:[L('Perlový prívesok','Pearl pendant'), 'PD-5005', L('Prívesky','Pendants'), cur(69), int(3)]},
            {c:[L('Zlatý prívesok srdce','Gold heart pendant'), 'PD-5022', L('Prívesky','Pendants'), cur(159), int(4)]},
            {c:[L('Prívesok Iniciála','Initial pendant'), 'PD-5044', L('Prívesky','Pendants'), cur(45), int(2)]},
            {c:[L('Diamantový prsteň Trio','Diamond Trio ring'), 'RG-1150', L('Prstene','Rings'), cur(890), int(3)]},
            {c:[L('Zlaté náušnice kruhy','Gold hoop earrings'), 'ER-2090', L('Náušnice','Earrings'), cur(99), int(3)]},
            {c:[L('Náramok Perlový','Pearl bracelet'), 'BR-3070', L('Náramky','Bracelets'), cur(119), int(2)]},
            {c:[L('Retiazka s príveskom','Chain with pendant'), 'CH-4060', L('Retiazky','Chains'), cur(179), int(3)]},
            {c:[L('Snubné prstene set','Wedding rings set'), 'RG-1170', L('Prstene','Rings'), cur(780), int(4)]},
            {c:[L('Náušnice Visiace','Dangle earrings'), 'ER-2110', L('Náušnice','Earrings'), cur(89), int(2)]},
            {c:[L('Prívesok Anjelik','Little angel pendant'), 'PD-5060', L('Prívesky','Pendants'), cur(39), int(1)]}
          ],
          note:L('Katalóg, SKU a ceny sú ukážkové — overlay ceny do manifestu je reálna funkcia appky, konkrétny e-shop katalóg zatiaľ nie je napojený.','The catalog, SKUs and prices are illustrative — overlaying prices into the manifest is a real app function, the actual e-shop catalog is not connected yet.'),
          page:true},
        {t:'bars', title:L('Produkty podľa kategórie','Products by category'),
          data:[{l:L('Prstene','Rings'), v:6},{l:L('Náušnice','Earrings'), v:5},{l:L('Náramky','Bracelets'), v:4},{l:L('Retiazky','Chains'), v:3},{l:L('Prívesky','Pendants'), v:4}]},
        {t:'note', text:L('Import produktov prebieha cez CSV (pozri Import) s kľúčom upsertu na kód kampane; produkty samotné sa importujú s vlastným SKU kľúčom.','Products are imported via CSV (see Import) with the campaign code as the upsert key; products themselves are imported keyed by their own SKU.')}
      ],
      ai:[
        {q:L('Koľko produktov je v katalógu?','How many products are in the catalog?'),
         a:L('22 produktov v 5 kategóriách (prstene, náušnice, náramky, retiazky, prívesky), priemerná cena je 223 €.','22 products across 5 categories (rings, earrings, bracelets, chains, pendants), the average price is €223.'),
         cite:'appka', act:null},
        {q:L('Ktorý produkt sa používa v najviac kampaniach?','Which product is used in the most campaigns?'),
         a:L('Snubný prsteň pár (RG-1120) sa objavuje v 6 kampaniach, tesne pred zásnubným prsteňom Solitaire so 4.','The wedding rings pair (RG-1120) appears in 6 campaigns, just ahead of the Solitaire engagement ring with 4.'),
         cite:'ukážka', act:{l:L('Otvoriť produkt','Open product'), k:'open'}},
        {q:L('Odkiaľ pochádzajú ceny na overlay?','Where do the overlay prices come from?'),
         a:L('Zatiaľ z ručne udržiavaného katalógu appky (import cez CSV) — priame napojenie na e-shop katalóg ešte nie je implementované.','Currently from the app\'s manually maintained catalog (imported via CSV) — a direct e-shop catalog connection is not implemented yet.'),
         cite:'appka', act:{l:L('Otvoriť import','Open import'), k:'open'}}
      ]
    },

    /* ───────────────────────── 6. MANIFESTY ───────────────────────── */
    {
      key:'manifesty', icon:'grid',
      title:L('Manifesty','Manifests'),
      sub:L('Matica 8 jazykov × 5 rozmerov a stav dokončenia copy manifestov','8-language × 5-size matrix and copy-manifest completion status'),
      blocks:[
        {t:'kpis', items:[
          {l:L('Kombinácií na kampaň','Combinations per campaign'), v:int(40), sub:L('5 rozmerov × 8 jazykov','5 sizes × 8 languages'), tone:null},
          {l:L('Jazykov','Languages'), v:int(8), tone:null},
          {l:L('Rozmerov','Sizes'), v:int(5), tone:null},
          {l:L('New Gem — dokončenosť','New Gem — completion'), v:'100 %', tone:'ok'}
        ]},
        {t:'matrix', title:L('Manifest — New Gem (dokončená kampaň)','Manifest — New Gem (completed campaign)'),
          rows:['1080×1080','1080×1350','1080×1920','1200×628','970×250'],
          cols:['SK','EN','DE','HU','CZ','PL','RO','BG'],
          st:{
            '1080×1080':[2,2,2,2,2,2,2,2],
            '1080×1350':[2,2,2,2,2,2,2,2],
            '1080×1920':[2,2,2,2,2,2,2,2],
            '1200×628':[2,2,2,2,2,2,2,2],
            '970×250':[2,2,2,2,2,2,2,2]
          },
          note:L('Zodpovedá exportu 40 PNG · 58 MB pre New Gem z obrazovky Exporty.','Matches the 40 PNG · 58 MB export for New Gem on the Exports screen.')},
        {t:'matrix', title:L('Manifest — Zlaté prstene (rozrenderovaná kampaň)','Manifest — Gold rings (campaign in progress)'),
          rows:['1080×1080','1080×1350','1080×1920','1200×628','970×250'],
          cols:['SK','EN','DE','HU','CZ','PL','RO','BG'],
          st:{
            '1080×1080':[2,2,2,2,2,2,2,1],
            '1080×1350':[2,2,2,2,2,2,1,1],
            '1080×1920':[2,2,2,2,2,1,0,0],
            '1200×628':[2,2,2,2,1,1,0,0],
            '970×250':[2,2,2,2,2,2,1,0]
          },
          note:L('35 z 40 kombinácií dokončených (zvyšné 5 sú v render fronte alebo čakajú) — ilustruje priebeh rozrenderovanej kampane.','35 of 40 combinations completed (the remaining 5 are in the render queue or waiting) — illustrates a campaign mid-render.')},
        {t:'table', title:L('Kľúče copy manifestu (výber)','Copy manifest keys (selection)'),
          cols:[L('Kľúč','Key'), L('Popis','Description'), L('Príklad (SK)','Example (SK)')],
          rows:[
            {c:['headline', L('hlavný nadpis bannera','banner headline'), L('Nová kolekcia je tu','New collection is here')]},
            {c:['subheadline', L('podnadpis','subheadline'), L('Limitovaná edícia šperkov','Limited edition jewelry')]},
            {c:['cta', L('text tlačidla','button text'), L('Zobraziť ponuku','View offer')]},
            {c:['price_label', L('popisok ceny','price label'), L('od 89 €','from €89')]},
            {c:['badge_text', L('text odznaku (napr. zľava)','badge text (e.g. discount)'), '-20 %']}
          ],
          note:L('Kľúče manifestu sú ukážkové — ilustrujú štruktúru JSON copy manifestu, nie sú výpisom reálnej šablóny.','The manifest keys are illustrative — they show the structure of the JSON copy manifest, not a dump of the real template.')},
        {t:'note', text:L('Overené: 8 jazykov a 5 rozmerov (1080×1080, 1080×1350, 1080×1920, 1200×628, 970×250) sú reálna konfigurácia appky. Konkrétne jazykové kódy (SK/EN/DE/HU/CZ/PL/RO/BG) sú ukážkové — appka overuje len počet 8, nie konkrétny zoznam jazykov.','Verified: 8 languages and 5 sizes (1080×1080, 1080×1350, 1080×1920, 1200×628, 970×250) are the app\'s real configuration. The specific language codes (SK/EN/DE/HU/CZ/PL/RO/BG) are illustrative — the app confirms only the count of 8, not a concrete language list.')}
      ],
      ai:[
        {q:L('Koľko kombinácií rozmer × jazyk má jedna kampaň?','How many size × language combinations does one campaign have?'),
         a:L('40 kombinácií — 5 rozmerov (1080×1080, 1080×1350, 1080×1920, 1200×628, 970×250) krát 8 jazykov. Toto je overená konfigurácia appky.','40 combinations — 5 sizes (1080×1080, 1080×1350, 1080×1920, 1200×628, 970×250) times 8 languages. This is a verified app configuration.'),
         cite:'pamäť', act:null},
        {q:L('Aký je stav manifestu pre Zlaté prstene?','What is the manifest status for Gold rings?'),
         a:L('35 z 40 kombinácií je dokončených, zvyšných 5 je rozpracovaných alebo chýba, najmä pri jazykoch RO a BG vo väčších rozmeroch.','35 of 40 combinations are done, the remaining 5 are in progress or missing, mostly for RO and BG in the larger sizes.'),
         cite:'ukážka', act:{l:L('Otvoriť render frontu','Open render queue'), k:'open'}},
        {q:L('Čo obsahuje jeden manifest kľúč ako headline?','What does a manifest key like headline contain?'),
         a:L('Textový obsah pre daný jazyk, ktorý sa dosadí do HTML/CSS šablóny pred renderom cez Playwright — napr. headline "Nová kolekcia je tu".','Text content for the given language that gets substituted into the HTML/CSS template before the Playwright render — e.g. the headline "New collection is here".'),
         cite:'ukážka', act:null}
      ]
    },

    /* ───────────────────────── 7. FRONTA ───────────────────────── */
    {
      key:'fronta', icon:'list',
      title:L('Render fronta','Render queue'),
      sub:L('Joby v pipeline: kampaň, rozmer, jazyk, stav, trvanie, chyba, retry','Pipeline jobs: campaign, size, language, status, duration, error, retry'),
      blocks:[
        {t:'kpis', items:[
          {l:L('Vo fronte','Queued'), v:int(7), tone:null},
          {l:L('Beží','Running'), v:int(5), tone:null},
          {l:L('Zlyhané (retry)','Failed (retry)'), v:int(3), tone:'no'},
          {l:L('Priemerné trvanie jobu','Avg job duration'), v:L('4,0 s','4.0 s'), tone:null}
        ]},
        {t:'table', title:L('Joby v render fronte','Jobs in the render queue'),
          cols:[L('Kampaň','Campaign'), L('Rozmer','Size'), L('Jazyk','Language'), L('Stav','Status'), L('Trvanie','Duration'), L('Chyba / retry','Error / retry')],
          rows:[
            {c:[L('Zlaté prstene','Gold rings'), '1080×1080', 'SK', ['info', L('Beží','Running')], '3,8 s', '—']},
            {c:[L('Zlaté prstene','Gold rings'), '1080×1350', 'DE', ['ok', L('Hotovo','Done')], '4,1 s', '—']},
            {c:[L('Svadobná sezóna','Wedding season'), '1200×628', 'EN', ['no', L('Zlyhal','Failed')], '—', L('timeout renderu · retry 2/3','render timeout · retry 2/3')]},
            {c:['Black Friday', '970×250', 'SK', ['q', L('Čaká','Queued')], '—', '—']},
            {c:['New Gem', '1080×1920', 'HU', ['ok', L('Hotovo','Done')], '3,9 s', '—']},
            {c:[L('Jarná kolekcia','Spring collection'), '1080×1080', 'CZ', ['info', L('Beží','Running')], '4,0 s', '—']},
            {c:[L('Jarná kolekcia','Spring collection'), '1080×1350', 'PL', ['q', L('Čaká','Queued')], '—', '—']},
            {c:[L('Strieborné náušnice','Silver earrings'), '970×250', 'SK', ['ok', L('Hotovo','Done')], '3,6 s', '—']},
            {c:[L('Strieborné náušnice','Silver earrings'), '1200×628', 'EN', ['no', L('Zlyhal','Failed')], '—', L('chýbajúci obrázok produktu · retry 1/3','missing product image · retry 1/3')]},
            {c:[L('Diamantové trio','Diamond trio'), '1080×1080', 'SK', ['q', L('Čaká','Queued')], '—', '—']},
            {c:[L('Nová sezóna 2026','New season 2026'), '1080×1920', 'DE', ['info', L('Beží','Running')], '4,3 s', '—']},
            {c:[L('Nová sezóna 2026','New season 2026'), '1200×628', 'HU', ['q', L('Čaká','Queued')], '—', '—']},
            {c:[L('Darček pre mamu','Gift for mom'), '970×250', 'RO', ['ok', L('Hotovo','Done')], '3,7 s', '—']},
            {c:[L('Darček pre mamu','Gift for mom'), '1080×1080', 'BG', ['ok', L('Hotovo','Done')], '3,8 s', '—']},
            {c:[L('Charitatívna kampaň','Charity campaign'), '1080×1350', 'SK', ['info', L('Beží','Running')], '4,1 s', '—']},
            {c:[L('Charitatívna kampaň','Charity campaign'), '1080×1920', 'EN', ['q', L('Čaká','Queued')], '—', '—']},
            {c:['Summer Sale', '1200×628', 'DE', ['ok', L('Hotovo','Done')], '4,0 s', '—']},
            {c:['Summer Sale', '970×250', 'PL', ['ok', L('Hotovo','Done')], '3,9 s', '—']},
            {c:[L('Letná akcia','Summer promo'), '1080×1080', 'CZ', ['no', L('Zlyhal','Failed')], '—', L('chyba layout enginu · retry 3/3','layout engine error · retry 3/3')]},
            {c:[L('Letná akcia','Summer promo'), '1080×1350', 'SK', ['ok', L('Hotovo','Done')], '4,2 s', '—']},
            {c:[L('Výpredaj skladu','Stock clearance'), '1080×1920', 'EN', ['ok', L('Hotovo','Done')], '3,8 s', '—']},
            {c:[L('Výpredaj skladu','Stock clearance'), '1200×628', 'HU', ['q', L('Čaká','Queued')], '—', '—']},
            {c:[L('Zlaté reťaze','Gold chains'), '970×250', 'DE', ['ok', L('Hotovo','Done')], '3,7 s', '—']},
            {c:[L('Zlaté reťaze','Gold chains'), '1080×1080', 'RO', ['info', L('Beží','Running')], '4,0 s', '—']},
            {c:[L('Snubné prstene','Wedding rings'), '1080×1350', 'BG', ['ok', L('Hotovo','Done')], '4,1 s', '—']},
            {c:[L('Perlové šperky','Pearl jewelry'), '1080×1920', 'SK', ['q', L('Čaká','Queued')], '—', '—']}
          ],
          note:L('Ukážkové položky fronty — konkrétne joby a časovanie ilustrujú priebeh, nie sú prevzaté z reálnych logov. Pipeline HTML/CSS → Playwright/Chromium → PNG → ZIP je overená a beží naživo.','Illustrative queue items — the concrete jobs and timings show the flow, not pulled from real logs. The HTML/CSS → Playwright/Chromium → PNG → ZIP pipeline is verified and runs live.'),
          page:true},
        {t:'timeline', title:L('História retry','Retry history'), items:[
          [L('Pred 2 min','2 min ago'), L('Svadobná sezóna 1200×628 EN — retry 2/3 po timeout renderu','Wedding season 1200×628 EN — retry 2/3 after render timeout')],
          [L('Pred 8 min','8 min ago'), L('Strieborné náušnice 1200×628 EN — retry 1/3, chýbajúci obrázok produktu','Silver earrings 1200×628 EN — retry 1/3, missing product image')],
          [L('Pred 15 min','15 min ago'), L('Letná akcia 1080×1080 CZ — retry 3/3, chyba layout enginu, presunuté na manuálnu kontrolu','Summer promo 1080×1080 CZ — retry 3/3, layout engine error, moved to manual review')],
          [L('Pred 22 min','22 min ago'), L('Prvý pokus Svadobná sezóna zlyhal — Chromium timeout 30 s','First attempt for Wedding season failed — Chromium timeout 30s')]
        ]}
      ],
      ai:[
        {q:L('Koľko jobov práve beží a koľko zlyhalo?','How many jobs are running and how many failed?'),
         a:L('5 jobov beží, 7 čaká vo fronte a 3 zlyhali a sú na retry — Svadobná sezóna (timeout), Strieborné náušnice (chýbajúci obrázok) a Letná akcia (chyba layout enginu, retry 3/3).','5 jobs are running, 7 are queued and 3 failed and are on retry — Wedding season (timeout), Silver earrings (missing image) and Summer promo (layout engine error, retry 3/3).'),
         cite:'appka', act:{l:L('Filtrovať zlyhané','Filter failed'), k:'filter'}},
        {q:L('Aká je pipeline za render frontou?','What pipeline is behind the render queue?'),
         a:L('HTML/CSS šablóna sa renderuje cez Playwright/Chromium na PNG a bannery sa balia do ZIP — toto je overená, naživo bežiaca Pipeline 1 appky.','An HTML/CSS template is rendered via Playwright/Chromium into a PNG and the banners are packaged into a ZIP — this is the app\'s verified, live-running Pipeline 1.'),
         cite:'pamäť', act:null},
        {q:L('Čo sa stane s jobom po 3 neúspešných retry?','What happens to a job after 3 failed retries?'),
         a:L('Letná akcia 1080×1080 CZ je na retry 3/3 po chybe layout enginu — po vyčerpaní retry limitu ide job na manuálnu kontrolu namiesto ďalšieho automatického pokusu.','Summer promo 1080×1080 CZ is on retry 3/3 after a layout engine error — once the retry limit is exhausted the job moves to manual review instead of another automatic attempt.'),
         cite:'ukážka', act:{l:L('Otvoriť job','Open job'), k:'open'}}
      ]
    },

    /* ───────────────────────── 8. QA ───────────────────────── */
    {
      key:'qa', icon:'check',
      title:L('QA gates','QA gates'),
      sub:L('Hard gates vs soft rules, deviations minor/major, návrat na re-render','Hard gates vs soft rules, minor/major deviations, return to re-render'),
      blocks:[
        {t:'kpis', items:[
          {l:L('QA pass rate','QA pass rate'), v:'91 %', tone:'ok'},
          {l:L('Minor deviation','Minor deviation'), v:int(15), tone:'cond'},
          {l:L('Major deviation → re-render','Major deviation → re-render'), v:int(5), tone:'no'},
          {l:L('Kandidátov na edit','Candidates per edit'), v:int(5), tone:null}
        ]},
        {t:'table', title:L('Hard gates vs soft rules','Hard gates vs soft rules'),
          cols:[L('Pravidlo','Rule'), L('Typ','Type'), L('Popis','Description'), L('Dôsledok','Consequence')],
          rows:[
            {c:[L('Vernosť produktu','Product fidelity'), ['no', L('Hard gate','Hard gate')], L('Tvar, farba a detail šperku musia sedieť s referenciou','Jewel shape, color and detail must match the reference'), L('Zamietnutie → re-render','Reject → re-render')]},
            {c:[L('Campaign lock','Campaign lock'), ['no', L('Hard gate','Hard gate')], L('Jeden svet + jedna modelka na kampaň','One world + one model per campaign'), L('Blokuje generovanie','Blocks generation')]},
            {c:[L('Kompozícia a nálada','Composition & mood'), ['cond', L('Soft rule','Soft rule')], L('Odporúčaný layout podľa Creative Playbooku','Recommended layout per the Creative Playbook'), L('Minor deviation, prejde s poznámkou','Minor deviation, passes with a note')]},
            {c:[L('Text v manifeste','Manifest copy'), ['cond', L('Soft rule','Soft rule')], L('Preklad sedí s copy manifestom pre daný jazyk','Translation matches the language copy manifest'), L('Minor deviation','Minor deviation')]}
          ],
          note:L('Two-stage generovanie: scéna bez produktu → cielený edit vloží šperk, 5 kandidátov na edit.','Two-stage generation: scene without the product first, then a targeted edit inserts the jewel, 5 candidates per edit.')},
        {t:'table', title:L('Aktuálne deviations','Current deviations'),
          cols:[L('Kampaň','Campaign'), L('Rozmer','Size'), L('Jazyk','Language'), L('Typ','Type'), L('Popis','Description'), L('Kedy','When')],
          rows:[
            {c:[L('Svadobná sezóna','Wedding season'), '1200×628', 'EN', ['no', L('Major','Major')], L('tvar prsteňa nesedí s referenciou','ring shape does not match the reference'), '12:40']},
            {c:[L('Zlaté prstene','Gold rings'), '970×250', 'HU', ['cond', L('Minor','Minor')], L('farba pozadia mimo palety sveta Quiet Luxury','background color outside the Quiet Luxury world palette'), '11:05']},
            {c:[L('Darček pre mamu','Gift for mom'), '1080×1080', 'SK', ['cond', L('Minor','Minor')], L('kontrast textu na pozadí nižší než odporúčanie','text contrast on background below the recommendation'), '10:52']},
            {c:[L('Charitatívna kampaň','Charity campaign'), '1080×1350', 'EN', ['cond', L('Minor','Minor')], L('preklad CTA nesedí s copy manifestom','CTA translation does not match the copy manifest'), '10:20']},
            {c:[L('Jarná kolekcia','Spring collection'), '1080×1920', 'CZ', ['no', L('Major','Major')], L('produkt orezaný mimo bezpečnú zónu','product cropped outside the safe zone'), '09:58']},
            {c:[L('Nová sezóna 2026','New season 2026'), '1200×628', 'DE', ['cond', L('Minor','Minor')], L('logo posunuté o 4 px mimo mriežku','logo shifted 4px off the grid'), '09:44']},
            {c:[L('Strieborné náušnice','Silver earrings'), '970×250', 'PL', ['cond', L('Minor','Minor')], L('veľkosť ceny menšia než minimálna','price text smaller than the minimum'), '09:30']},
            {c:[L('Diamantové trio','Diamond trio'), '1080×1080', 'HU', ['no', L('Major','Major')], L('farba kovu nesedí s referenciou produktu','metal color does not match the product reference'), '09:12']},
            {c:['Summer Sale', '1200×628', 'RO', ['cond', L('Minor','Minor')], L('chýba diakritika v preklade','missing diacritics in the translation'), '08:55']},
            {c:[L('Letná akcia','Summer promo'), '1080×1350', 'BG', ['cond', L('Minor','Minor')], L('kompozícia mimo odporúčaný layout','composition outside the recommended layout'), '08:40']},
            {c:[L('Výpredaj skladu','Stock clearance'), '1080×1920', 'SK', ['cond', L('Minor','Minor')], L('tieň produktu príliš tmavý','product shadow too dark'), '08:22']},
            {c:[L('Zlaté reťaze','Gold chains'), '970×250', 'EN', ['no', L('Major','Major')], L('chýbajúci produkt v scéne','product missing from the scene'), '08:05']},
            {c:[L('Snubné prstene','Wedding rings'), '1080×1080', 'DE', ['cond', L('Minor','Minor')], L('nesúlad medzery medzi CTA a cenou','spacing mismatch between the CTA and the price'), '07:48']},
            {c:[L('Perlové šperky','Pearl jewelry'), '1080×1350', 'CZ', ['cond', L('Minor','Minor')], L('farba pozadia mimo palety sveta','background color outside the world palette'), '07:30']},
            {c:[L('Mikuláš','St. Nicholas Day'), '1080×1920', 'PL', ['cond', L('Minor','Minor')], L('text presahuje bezpečnú zónu','text overflows the safe zone'), L('včera 16:40','yesterday 16:40')]},
            {c:[L('Deň žien','Women\'s Day'), '1200×628', 'RO', ['no', L('Major','Major')], L('modelka nesedí s campaign lock (zámena)','model does not match the campaign lock (mix-up)'), L('včera 15:20','yesterday 15:20')]},
            {c:[L('Retro kolekcia','Retro collection'), '970×250', 'BG', ['cond', L('Minor','Minor')], L('kontrast CTA tlačidla nízky','low contrast on the CTA button'), L('včera 14:05','yesterday 14:05')]},
            {c:['New Gem', '1080×1080', 'HU', ['cond', L('Minor','Minor')], L('zaoblenie rohov nesedí so štýlom sveta','corner radius does not match the world style'), L('včera 11:30','yesterday 11:30')]},
            {c:[L('Doprava zadarmo','Free shipping'), '1080×1350', 'SK', ['cond', L('Minor','Minor')], L('ikonka dopravy nesedí s brand kitom','shipping icon does not match the brand kit'), L('pred 3 dňami','3 days ago')]},
            {c:[L('Vianočná kolekcia','Christmas collection'), '1200×628', 'EN', ['no', L('Major','Major')], L('chýbajúci snehový efekt podľa world briefu','missing snow effect per the world brief'), L('pred 3 dňami','3 days ago')]}
          ],
          note:L('Prvé 2 riadky (Svadobná sezóna, Zlaté prstene) sú prevzaté z overeného prehľadu appky. Ostatných 18 deviations je ukážkových a ilustruje rozdelenie minor/major naprieč kampaňami, celkový súčet zodpovedá KPI vyššie (15 minor, 5 major).','The first 2 rows (Wedding season, Gold rings) are taken from the app\'s verified overview. The other 18 deviations are illustrative and show the minor/major split across campaigns; the total matches the KPIs above (15 minor, 5 major).'),
          page:true},
        {t:'note', text:L('Výsledky QA sa vracajú do znalostnej bázy (learning loop) — budúce generovania sa vyhýbajú opakovaným deviations.','QA results feed back into the knowledge base (learning loop) — future generations avoid repeat deviations.')}
      ],
      ai:[
        {q:L('Aký je rozdiel medzi hard gate a soft rule?','What is the difference between a hard gate and a soft rule?'),
         a:L('Hard gate (vernosť produktu, campaign lock) banner zamietne a vráti na re-render. Soft rule (kompozícia, manifest copy) prejde ako minor deviation s poznámkou.','A hard gate (product fidelity, campaign lock) rejects the banner and sends it back for re-render. A soft rule (composition, manifest copy) passes as a minor deviation with a note.'),
         cite:'appka', act:null},
        {q:L('Koľko je aktuálne major deviations, ktoré čakajú na re-render?','How many major deviations are currently waiting for a re-render?'),
         a:L('5 major deviations — Svadobná sezóna, Jarná kolekcia, Diamantové trio, Zlaté reťaze, Deň žien a Vianočná kolekcia (chýbajúci produkt, orezanie, farba kovu, zámena modelky, chýbajúci efekt).','5 major deviations — Wedding season, Spring collection, Diamond trio, Gold chains, Women\'s Day and Christmas collection (missing product, cropping, metal color, model mix-up, missing effect).'),
         cite:'appka', act:{l:L('Filtrovať major','Filter major'), k:'filter'}},
        {q:L('Kam sa premietajú výsledky QA?','Where do the QA results feed into?'),
         a:L('Do znalostnej bázy cez learning loop — opakované deviations (napr. farba mimo palety sveta) sa zapisujú ako pravidlo, aby sa budúce generovania rovnakej chybe vyhli.','Into the knowledge base via the learning loop — repeated deviations (e.g. color outside a world palette) get written back as a rule so future generations avoid the same mistake.'),
         cite:'appka', act:{l:L('Otvoriť KB','Open KB'), k:'open'}}
      ]
    },

    /* ───────────────────────── 9. KB ───────────────────────── */
    {
      key:'kb', icon:'book',
      title:L('Znalostná báza','Knowledge base'),
      sub:L('Pravidlá pre generovanie a learning loop z QA výsledkov','Generation rules and the learning loop from QA results'),
      blocks:[
        {t:'kpis', items:[
          {l:L('Pravidiel v KB','Rules in KB'), v:int(34), tone:null},
          {l:L('Naučených tento mesiac','Learned this month'), v:int(12), tone:'ok'},
          {l:L('Zdroj importu','Import source'), v:'aura_marketing', sub:L('sperky-ai DB','sperky-ai DB'), tone:null},
          {l:L('Posledná aktualizácia','Last update'), v:L('dnes 09:20','today 09:20'), tone:null}
        ]},
        {t:'table', title:L('Pravidlá KB (výber)','KB rules (selection)'),
          cols:[L('Pravidlo','Rule'), L('Kategória','Category'), L('Popis','Description'), L('Zdroj','Source')],
          rows:[
            {c:[L('Campaign lock','Campaign lock'), L('Hard gate','Hard gate'), L('1 svet + 1 modelka na kampaň','1 world + 1 model per campaign'), L('import','import')]},
            {c:[L('Vernosť produktu','Product fidelity'), L('Hard gate','Hard gate'), L('tvar/farba/detail šperku musí sedieť s referenciou','jewel shape/color/detail must match the reference'), L('import','import')]},
            {c:['Quiet Luxury — paleta', L('Svet','World'), L('teplé neutrály, žiadne sýte farby v pozadí','warm neutrals, no saturated background colors'), L('import','import')]},
            {c:['Golden Hour — paleta', L('Svet','World'), L('teplé zlaté svetlo, dlhé tiene','warm golden light, long shadows'), L('import','import')]},
            {c:[L('Adela — vizuálne rysy','Adela — visual traits'), L('Modelka','Model'), L('referenčné fotky a povolené pózy','reference photos and allowed poses'), L('import','import')]},
            {c:[L('Kompozícia a nálada','Composition & mood'), L('Soft rule','Soft rule'), L('odporúčaný layout podľa Creative Playbooku','recommended layout per the Creative Playbook'), L('import','import')]},
            {c:[L('Text v manifeste','Manifest copy'), L('Soft rule','Soft rule'), L('preklad sedí s copy manifestom pre daný jazyk','translation matches the language copy manifest'), L('import','import')]},
            {c:[L('Kontrast CTA min. 4,5:1','CTA contrast min. 4.5:1'), L('Soft rule (naučené)','Soft rule (learned)'), L('naučené z deviation Retro kolekcia — nízky kontrast tlačidla','learned from the Retro collection deviation — low button contrast'), L('learning loop','learning loop')]},
            {c:[L('Snehový efekt povinný — Winter Frost','Snow effect required — Winter Frost'), L('Svet (naučené)','World (learned)'), L('naučené z deviation Vianočná kolekcia — chýbajúci efekt','learned from the Christmas collection deviation — missing effect'), L('learning loop','learning loop')]},
            {c:[L('Zaoblenie rohov podľa štýlu sveta','Corner radius per world style'), L('Soft rule (naučené)','Soft rule (learned)'), L('naučené z deviation New Gem 1080×1080 HU','learned from the New Gem 1080×1080 HU deviation'), L('learning loop','learning loop')]},
            {c:[L('Diakritika povinná — RO preklad','Diacritics required — RO translation'), L('Soft rule (naučené)','Soft rule (learned)'), L('naučené z deviation Summer Sale RO','learned from the Summer Sale RO deviation'), L('learning loop','learning loop')]},
            {c:[L('Minimálna veľkosť ceny','Minimum price text size'), L('Soft rule (naučené)','Soft rule (learned)'), L('naučené z deviation Strieborné náušnice PL','learned from the Silver earrings PL deviation'), L('learning loop','learning loop')]},
            {c:[L('Bezpečná zóna orezania produktu','Product crop safe zone'), L('Hard gate (naučené)','Hard gate (learned)'), L('sprísnené po deviation Jarná kolekcia CZ','tightened after the Spring collection CZ deviation'), L('learning loop','learning loop')]},
            {c:[L('Overenie zhody modelky pred renderom','Model-match check before render'), L('Hard gate (naučené)','Hard gate (learned)'), L('pridané po zámene modelky Deň žien RO','added after the Women\'s Day RO model mix-up'), L('learning loop','learning loop')]}
          ],
          note:L('Prvé dve pravidlá (Campaign lock, Vernosť produktu) sú overené z pamäte Aura AI vrátane princípu two-stage generovania. Ostatné pravidlá vrátane 6 „naučených" ilustrujú, ako learning loop premieňa QA deviations na pravidlá — konkrétne znenia sú ukážkové.','The first two rules (Campaign lock, Product fidelity) are verified from Aura AI memory, including the two-stage generation principle. The other rules, including the 6 "learned" ones, illustrate how the learning loop turns QA deviations into rules — the specific wording is illustrative.'),
          page:true},
        {t:'timeline', title:L('Learning loop — posledné udalosti','Learning loop — recent events'), items:[
          [L('Dnes 09:20','Today 09:20'), L('Deviation Deň žien (zámena modelky) → nové hard gate pravidlo „overenie zhody modelky pred renderom"','Women\'s Day deviation (model mix-up) → new hard gate rule "model-match check before render"')],
          [L('Včera 16:40','Yesterday 16:40'), L('Deviation Vianočná kolekcia (chýbajúci sneh) → doplnené pravidlo pre svet Winter Frost','Christmas collection deviation (missing snow) → rule added for the Winter Frost world')],
          [L('Pred 3 dňami','3 days ago'), L('Deviation Jarná kolekcia (orezanie produktu) → sprísnená bezpečná zóna orezania','Spring collection deviation (product cropping) → tightened crop safe zone')],
          [L('Pred 5 dňami','5 days ago'), L('Import znalostnej bázy zo sperky-ai aura_marketing DB — počiatočný seed pravidiel','Knowledge base import from the sperky-ai aura_marketing DB — initial rule seed')]
        ]},
        {t:'note', text:L('Znalostná báza je importovaná zo sperky-ai databázy aura_marketing (overené) a synchronizácia je zatiaľ jednosmerná — Banner Studio číta pravidlá, ale nezapisuje späť do aura_marketing.','The knowledge base is imported from the sperky-ai aura_marketing database (verified) and the sync is currently one-way — Banner Studio reads rules but does not write back into aura_marketing.')}
      ],
      ai:[
        {q:L('Odkiaľ pochádza znalostná báza?','Where does the knowledge base come from?'),
         a:L('Bola importovaná zo sperky-ai databázy aura_marketing. Toto je overený fakt, synchronizácia je zatiaľ len jednosmerná (import, nie zápis späť).','It was imported from the sperky-ai aura_marketing database. This is a verified fact; the sync is currently one-way only (import, not write-back).'),
         cite:'pamäť', act:null},
        {q:L('Ako funguje learning loop?','How does the learning loop work?'),
         a:L('QA deviation (napr. chýbajúci snehový efekt) sa po opakovaní zapíše ako nové pravidlo do KB, takže budúce generovania rovnakú chybu už neurobia.','A QA deviation (e.g. a missing snow effect) that repeats gets written back as a new rule in the KB, so future generations no longer make the same mistake.'),
         cite:'appka', act:{l:L('Otvoriť QA gates','Open QA gates'), k:'open'}},
        {q:L('Koľko pravidiel pribudlo tento mesiac z learning loopu?','How many rules were added this month via the learning loop?'),
         a:L('12 nových pravidiel, z toho 6 zo skutočných QA deviations zaznamenaných na obrazovke QA gates (kontrast CTA, snehový efekt, zaoblenie rohov, diakritika, veľkosť ceny, bezpečná zóna orezania a zhoda modelky).','12 new rules, 6 of them derived from actual QA deviations logged on the QA gates screen (CTA contrast, snow effect, corner radius, diacritics, price size, crop safe zone and model match).'),
         cite:'ukážka', act:null}
      ]
    },

    /* ───────────────────────── 10. EXPORTY ───────────────────────── */
    {
      key:'exporty', icon:'doc',
      title:L('Exporty','Exports'),
      sub:L('ZIP balíky, obsah, veľkosť, kto stiahol, história','ZIP packages, contents, size, who downloaded, history'),
      blocks:[
        {t:'kpis', items:[
          {l:L('Exportov tento mesiac','Exports this month'), v:int(15), tone:null},
          {l:L('Celková veľkosť (mesiac)','Total size (month)'), v:L('675 MB','675 MB'), tone:null},
          {l:L('Posledný export','Last export'), v:L('dnes 09:14','today 09:14'), tone:null}
        ]},
        {t:'table', title:L('História exportov','Export history'),
          cols:[L('Kampaň','Campaign'), L('Obsah','Contents'), L('Veľkosť','Size'), L('QA pred exportom','QA before export'), L('Stiahol','Downloaded by'), L('Kedy','When')],
          rows:[
            {c:['New Gem', L('40 PNG · 5 rozmerov · 8 jazykov','40 PNGs · 5 sizes · 8 languages'), '58 MB', pc(100), 'admin', L('včera 16:20','yesterday 16:20')]},
            {c:[L('Doprava zadarmo','Free shipping'), L('15 PNG · 3 jazyky','15 PNGs · 3 languages'), '21 MB', pc(100), 'admin', L('pred 4 dňami','4 days ago')]},
            {c:['Summer Sale', L('40 PNG · 5 rozmerov · 8 jazykov','40 PNGs · 5 sizes · 8 languages'), '55 MB', pc(91), 'admin', L('dnes 09:14','today 09:14')]},
            {c:[L('Valentín','Valentine\'s'), L('40 PNG · 5 rozmerov · 8 jazykov','40 PNGs · 5 sizes · 8 languages'), '57 MB', pc(100), 'admin', L('pred 6 dňami','6 days ago')]},
            {c:[L('Perlové šperky','Pearl jewelry'), L('40 PNG · 5 rozmerov · 8 jazykov','40 PNGs · 5 sizes · 8 languages'), '54 MB', pc(100), 'admin', L('pred 8 dňami','8 days ago')]},
            {c:[L('Výpredaj skladu','Stock clearance'), L('40 PNG · 5 rozmerov · 8 jazykov','40 PNGs · 5 sizes · 8 languages'), '59 MB', pc(95), 'admin', L('pred 9 dňami','9 days ago')]},
            {c:[L('Snubné prstene','Wedding rings'), L('40 PNG · 5 rozmerov · 8 jazykov','40 PNGs · 5 sizes · 8 languages'), '56 MB', pc(100), 'admin', L('pred 11 dňami','11 days ago')]},
            {c:[L('Zlaté reťaze','Gold chains'), L('40 PNG · 5 rozmerov · 8 jazykov','40 PNGs · 5 sizes · 8 languages'), '53 MB', pc(100), 'admin', L('pred 12 dňami','12 days ago')]},
            {c:[L('Letná akcia','Summer promo'), L('40 PNG · 5 rozmerov · 8 jazykov','40 PNGs · 5 sizes · 8 languages'), '55 MB', pc(97), 'admin', L('pred 14 dňami','14 days ago')]},
            {c:[L('Deň žien','Women\'s Day'), L('40 PNG · 5 rozmerov · 8 jazykov','40 PNGs · 5 sizes · 8 languages'), '52 MB', pc(100), 'admin', L('pred 16 dňami','16 days ago')]},
            {c:[L('Mikuláš','St. Nicholas Day'), L('40 PNG · 5 rozmerov · 8 jazykov','40 PNGs · 5 sizes · 8 languages'), '60 MB', pc(90), 'admin', L('pred 20 dňami','20 days ago')]},
            {c:[L('Darček pre mamu (predbežný export)','Gift for mom (interim export)'), L('24 PNG · 3 rozmery · 8 jazykov','24 PNGs · 3 sizes · 8 languages'), '32 MB', pc(88), 'admin', L('pred 22 dňami','22 days ago')]},
            {c:[L('New Gem (predbežný export)','New Gem (interim export)'), L('16 PNG · 2 rozmery · 8 jazykov','16 PNGs · 2 sizes · 8 languages'), '22 MB', pc(100), 'admin', L('pred 25 dňami','25 days ago')]},
            {c:[L('Summer Sale (predbežný export)','Summer Sale (interim export)'), L('24 PNG · 3 rozmery · 8 jazykov','24 PNGs · 3 sizes · 8 languages'), '30 MB', pc(85), 'admin', L('pred 27 dňami','27 days ago')]},
            {c:[L('Výpredaj skladu (predbežný export)','Stock clearance (interim export)'), L('8 PNG · 1 rozmer · 8 jazykov','8 PNGs · 1 size · 8 languages'), '11 MB', pc(100), 'admin', L('pred 30 dňami','30 days ago')]},
            {c:[L('Zlaté reťaze (predbežný export)','Gold chains (interim export)'), L('16 PNG · 2 rozmery · 8 jazykov','16 PNGs · 2 sizes · 8 languages'), '20 MB', pc(94), 'admin', L('pred 32 dňami','32 days ago')]},
            {c:[L('Valentín (predbežný export)','Valentine\'s (interim export)'), L('8 PNG · 1 rozmer · 8 jazykov','8 PNGs · 1 size · 8 languages'), '10 MB', pc(100), 'admin', L('pred 35 dňami','35 days ago')]},
            {c:[L('Perlové šperky (predbežný export)','Pearl jewelry (interim export)'), L('16 PNG · 2 rozmery · 8 jazykov','16 PNGs · 2 sizes · 8 languages'), '19 MB', pc(96), 'admin', L('pred 38 dňami','38 days ago')]},
            {c:[L('Snubné prstene (predbežný export)','Wedding rings (interim export)'), L('8 PNG · 1 rozmer · 8 jazykov','8 PNGs · 1 size · 8 languages'), '9 MB', pc(100), 'admin', L('pred 40 dňami','40 days ago')]},
            {c:[L('Letná akcia (predbežný export)','Summer promo (interim export)'), L('16 PNG · 2 rozmery · 8 jazykov','16 PNGs · 2 sizes · 8 languages'), '18 MB', pc(92), 'admin', L('pred 42 dňami','42 days ago')]}
          ],
          note:L('Prvé 3 riadky (New Gem, Doprava zadarmo, Summer Sale) sú prevzaté z overeného prehľadu appky. Zvyšných 17 exportov je ukážkových — ilustrujú, že appka umožňuje aj predbežné (čiastočné) exporty pred dokončením celej kampane. Všetky exporty sťahuje účet admin, keďže appka má zatiaľ len jedno zdieľané prihlásenie.','The first 3 rows (New Gem, Free shipping, Summer Sale) are taken from the app\'s verified overview. The other 17 exports are illustrative — they show that the app also supports interim (partial) exports before a campaign is fully done. All exports are downloaded by the admin account, since the app currently has only one shared login.'),
          page:true},
        {t:'note', text:L('Zálohový systém zatiaľ pokrýva len databázu aura_marketing — obrázkový volume (bannery-db aj vygenerované PNG) nemá zálohu.','The backup system currently covers only the aura_marketing database — the image volume (bannery-db and generated PNGs) has no backup.')},
        {t:'banner', tone:'cond', text:L('Appka beží lokálne bez GitHub repa — verzovanie a záloha kódu čakajú na push (gh nie je nainštalované).','The app runs locally without a GitHub repo — code versioning and backup are pending a push (gh is not installed).')}
      ],
      ai:[
        {q:L('Koľko exportov prebehlo tento mesiac a akú majú celkovú veľkosť?','How many exports happened this month and what is their total size?'),
         a:L('15 exportov s celkovou veľkosťou približne 675 MB — posledný export bol dnes o 09:14 pre Summer Sale.','15 exports totaling approximately 675 MB — the latest export was today at 09:14 for Summer Sale.'),
         cite:'appka', act:null},
        {q:L('Existuje záloha obrázkových dát?','Is there a backup of the image data?'),
         a:L('Nie — zálohový systém pokrýva len databázu aura_marketing. Volume bannery-db aj vygenerované PNG obrázky zatiaľ zálohu nemajú, je to otvorené riziko.','No — the backup system currently covers only the aura_marketing database. The bannery-db volume and the generated PNG images have no backup yet; this is an open risk.'),
         cite:'pamäť', act:{l:L('Otvoriť nastavenia','Open settings'), k:'open'}},
        {q:L('Robí appka aj čiastočné exporty pred dokončením kampane?','Does the app also produce partial exports before a campaign is finished?'),
         a:L('Áno, história obsahuje predbežné exporty (napr. 8–24 PNG namiesto plných 40) pre kampane ako Darček pre mamu alebo Zlaté reťaze, ktoré v čase exportu ešte neboli hotové.','Yes, the history includes interim exports (e.g. 8–24 PNGs instead of the full 40) for campaigns like Gift for mom or Gold chains that were not yet finished at export time.'),
         cite:'ukážka', act:{l:L('Otvoriť históriu exportov','Open export history'), k:'filter'}}
      ]
    },

    /* ───────────────────────── 11. AI PROVIDER ───────────────────────── */
    {
      key:'provider', icon:'brain',
      title:L('AI provider','AI provider'),
      sub:L('mock / openai / gemini, budget strop a čerpanie, kľúče, cena za obrázok, limity','mock / openai / gemini, budget cap and burn, keys, price per image, limits'),
      blocks:[
        {t:'kpis', items:[
          {l:L('Aktívny provider','Active provider'), v:L('mock','mock'), tone:null},
          {l:L('Mesačný strop','Monthly cap'), v:cur(300), tone:null},
          {l:L('Vyčerpané','Used'), v:cur(186), tone:'cond'},
          {l:L('Rezerva','Headroom'), v:cur(114), tone:null}
        ]},
        {t:'donut', title:L('Čerpanie AI budgetu','AI budget burn'), pct:62, label:L('z mesačného stropu 300 €','of the €300 monthly cap')},
        {t:'table', title:L('Providery','Providers'),
          cols:[L('Provider','Provider'), L('Model','Model'), L('Stav','Status'), L('Cena za obrázok','Price per image'), L('API kľúč','API key')],
          rows:[
            {c:['Mock', L('deterministický render (bez AI)','deterministic render (no AI)'), ['ok', L('Aktívny','Active')], L('0 €','€0'), L('nepotrebný','not needed')]},
            {c:['OpenAI', 'GPT Image', ['q', L('Pripravené','Ready')], L('ukážka: 0,04 €/obr.','example: €0.04/img'), L('zatiaľ nevyplnený','not set yet')]},
            {c:['Gemini', '3 Pro Image', ['q', L('Pripravené','Ready')], L('ukážka: 0,03 €/obr.','example: €0.03/img'), L('zatiaľ nevyplnený','not set yet')]}
          ],
          note:L('Overené: providery mock/OpenAI (GPT Image)/Gemini (3 Pro Image) a rozsah mesačného budget stropu 100–300 €. Cena za obrázok je ukážková — reálne sadzby sa doplnia po nastavení API kľúčov (fáza 2, zatiaľ mock je default).','Verified: the mock/OpenAI (GPT Image)/Gemini (3 Pro Image) providers and the €100–300 monthly budget cap range. The price per image is illustrative — real rates will be added once API keys are set up (phase 2; mock is the default for now).')},
        {t:'bars', title:L('Mesačné čerpanie budgetu (12 mesiacov)','Monthly budget burn (12 months)'),
          data:[{l:'W1',v:0},{l:'W2',v:0},{l:'W3',v:0},{l:'W4',v:0},{l:'W5',v:0},{l:'W6',v:0},{l:'W7',v:20},{l:'W8',v:45},{l:'W9',v:80},{l:'W10',v:120},{l:'W11',v:155},{l:'W12',v:186}],
          note:L('Ukážkový priebeh čerpania za posledných 12 mesiacov — appka beží od nedávna na mocku, reálne AI generovanie (a teda skutočné čerpanie) sa rozbieha až posledné mesiace, preto sú prvé mesiace na nule.','Illustrative burn trend over the last 12 months — the app has only recently started running on the mock provider, so real AI generation (and real spend) only ramps up in the most recent months, hence the early zeros.')},
        {t:'form', title:L('Nastavenie providera','Provider settings'), fields:[
          {l:L('Provider','Provider'), v:'mock', type:'select', opts:['mock','openai','gemini']},
          {l:L('Budget strop','Budget cap'), v:'300 €', type:'select', opts:['100 €','200 €','300 €']},
          {l:L('API kľúče','API keys'), v:'', type:'text'},
          {l:L('Zastaviť pri prekročení stropu','Halt when cap is exceeded'), v:'', type:'switch', on:true}
        ], note:L('Default provider je mock; reálne kľúče (openai/gemini) zatiaľ nie sú doplnené.','Default provider is mock; real keys (openai/gemini) have not been added yet.')}
      ],
      ai:[
        {q:L('Ktoré AI providery appka podporuje?','Which AI providers does the app support?'),
         a:L('mock (deterministický render bez AI, aktívny default), OpenAI GPT Image a Gemini 3 Pro Image — obidva reálne providery sú pripravené, ale API kľúče zatiaľ nie sú vyplnené.','mock (deterministic render without AI, the active default), OpenAI GPT Image and Gemini 3 Pro Image — both real providers are ready but the API keys are not set yet.'),
         cite:'pamäť', act:null},
        {q:L('Aký je rozsah mesačného budget stropu?','What is the range of the monthly budget cap?'),
         a:L('100–300 € mesačne, aktuálne nastavený na 300 € s čerpaním 186 € (62 %). Pri prekročení stropu sa generovanie zastaví.','€100–300 per month, currently set to €300 with €186 (62%) used. Generation halts once the cap is exceeded.'),
         cite:'pamäť', act:{l:L('Zmeniť strop','Change cap'), k:'open'}},
        {q:L('Koľko by stálo prepnutie na reálny provider?','How much would switching to a real provider cost?'),
         a:L('Podľa ukážkových sadzieb cca 0,04 €/obrázok pri OpenAI GPT Image alebo 0,03 €/obrázok pri Gemini 3 Pro Image — pri 320 vygenerovaných banneroch by to bolo približne 10–13 €, reálne sadzby sa potvrdia po nastavení kľúčov.','Based on illustrative rates, about €0.04/image for OpenAI GPT Image or €0.03/image for Gemini 3 Pro Image — for 320 generated banners that would be roughly €10–13; real rates will be confirmed once the keys are set up.'),
         cite:'ukážka', act:null}
      ]
    },

    /* ───────────────────────── 12. NASTAVENIA ───────────────────────── */
    {
      key:'nastavenia', icon:'gear',
      title:L('Nastavenia','Settings'),
      sub:L('Roly a používatelia, zdieľané heslo → JWT, rozmery a jazyky, zálohy DB a volume images, audit','Roles and users, shared password → JWT, sizes & languages, DB and image-volume backups, audit'),
      blocks:[
        {t:'form', title:L('Prihlásenie','Login'), fields:[
          {l:L('Model prihlásenia','Login model'), v:L('jedno zdieľané heslo','one shared password'), type:'text'},
          {l:'JWT', v:L('session token po prihlásení','session token after login'), type:'text'},
          {l:L('Rola','Role'), v:'admin', type:'text'}
        ], note:L('Banner Studio používa jedno zdieľané heslo → JWT → rola admin (nie individuálne účty ako v Retouch Studiu).','Banner Studio uses one shared password → JWT → admin role (not individual accounts like in Retouch Studio).')},
        {t:'table', title:L('Rozmery a jazyky','Sizes & languages'),
          cols:[L('Rozmer','Size'), L('Použitie','Use'), L('Jazyky','Languages')],
          rows:[
            {c:['1080×1080', L('Instagram feed','Instagram feed'), '8']},
            {c:['1080×1350', L('Instagram feed (na výšku)','Instagram feed (portrait)'), '8']},
            {c:['1080×1920', L('Stories / Reels','Stories / Reels'), '8']},
            {c:['1200×628', L('Facebook / LinkedIn link ad','Facebook / LinkedIn link ad'), '8']},
            {c:['970×250', L('Display banner','Display banner'), '8']}
          ],
          note:L('5 rozmerov × 8 jazykov — reálna konfigurácia copy manifestov.','5 sizes × 8 languages — the real copy-manifest configuration.')},
        {t:'list', title:L('Používatelia (ukážka)','Users (example)'), items:[
          {title:'admin', sub:L('Jediný účet — zdieľané heslo','Single account — shared password'), badge:['ok',L('Aktívny','Active')]},
          {title:L('Ďalší používateľ (plán)','Additional user (planned)'), sub:L('Pomenované účty zatiaľ nie sú implementované','Named accounts are not implemented yet'), badge:['q',L('Plán','Planned')]}
        ]},
        {t:'timeline', title:L('Zálohy','Backups'), items:[
          [L('Databáza aura_marketing','aura_marketing database'), L('Zálohovaná','Backed up')],
          [L('bannery-db a volume s obrázkami','bannery-db and the image volume'), L('Zatiaľ bez zálohy — otvorené riziko','Not backed up yet — open risk')]
        ]},
        {t:'note', text:L('Audit log a GitHub remote (push kódu) sú otvorené položky — appka zatiaľ beží len lokálne s lokálnym gitom. Kontajnery: bannery-app (port 8091), bannery-db, bannery-ngrok, sieť bannery — overené z pamäte Aura AI.','Audit log and a GitHub remote (code push) are open items — the app currently runs only locally with local git. Containers: bannery-app (port 8091), bannery-db, bannery-ngrok, network bannery — verified from Aura AI memory.')}
      ],
      ai:[
        {q:L('Ako funguje prihlásenie do appky?','How does login work in the app?'),
         a:L('Jedno zdieľané heslo sa vymení za JWT s rolou admin — appka zatiaľ nemá individuálne pomenované účty, na rozdiel od Retouch Studia.','One shared password is exchanged for a JWT with the admin role — the app does not yet have individually named accounts, unlike Retouch Studio.'),
         cite:'pamäť', act:null},
        {q:L('Sú zálohované všetky dáta appky?','Is all of the app\'s data backed up?'),
         a:L('Nie — zálohovaná je len databáza aura_marketing. bannery-db a volume s vygenerovanými obrázkami zatiaľ zálohu nemajú, je to otvorené riziko.','No — only the aura_marketing database is backed up. bannery-db and the volume with generated images have no backup yet; this is an open risk.'),
         cite:'pamäť', act:{l:L('Otvoriť exporty','Open exports'), k:'open'}},
        {q:L('Na akom porte a v akých kontajneroch appka beží?','On which port and in which containers does the app run?'),
         a:L('Port 8091, kontajnery bannery-app, bannery-db a bannery-ngrok v sieti bannery — appka zatiaľ nemá GitHub remote, beží len s lokálnym gitom.','Port 8091, containers bannery-app, bannery-db and bannery-ngrok on the bannery network — the app has no GitHub remote yet and runs with local git only.'),
         cite:'pamäť', act:null}
      ]
    }
  ]
};
