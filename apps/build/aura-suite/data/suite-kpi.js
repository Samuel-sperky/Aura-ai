const APP_KPI = {
  key:'kpi', name:'Aura KPI', port:'3030', icon:'gauge',
  tag:L('Mesačné a ročné KPI 12 oddelení s pásmami, uzávierkou a Team score.','Monthly and yearly KPIs for 12 departments with bands, a close date and a Team score.'),
  feat:[
    L('Plnenie = (skutočnosť − Min) / (Max − Min), cap 100 % · 16 metrík · 38 vstupov · 48 pásiem','Attainment = (actual − Min) / (Max − Min), capped at 100% · 16 metrics · 38 inputs · 48 bands'),
    L('Heatmapa, A/B porovnanie mesiacov a ročný pohľad s toleranciou ±5 %','Heatmap, month-to-month A/B compare and a yearly view with a ±5% tolerance'),
    L('Uzávierka do 10. dňa v mesiaci, denníky oddelení a integrácie Logistika + SEO','Close by the 10th of the month, department logs and Logistics + SEO integrations')
  ],
  live:{v:L('7/12 vyplnených · 3 po termíne','7/12 filled · 3 overdue'), tone:'no', spark:[55,58,60,57,62,60,62]},

  api:{
    endpoints:[
      {k:'shipments', l:L('Zásielky (Logistika)','Shipments (Logistics)'), ms:180},
      {k:'claims', l:L('Reklamácie (Logistika)','Claims (Logistics)'), ms:210},
      {k:'seo', l:L('Copywriter KPI (SEO appka)','Copywriter KPI (SEO app)'), ms:340}
    ],
    sync:L('pred 6 min','6 min ago'), tone:'cond'
  },

  imp:{
    target:'oddelenia',
    cols:[
      {k:'oddelenie', l:L('Oddelenie','Department'), t:'text'},
      {k:'metrika', l:L('Metrika','Metric'), t:'text'},
      {k:'skutocnost', l:L('Skutočnosť','Actual'), t:'num'},
      {k:'mesiac', l:L('Mesiac','Month'), t:'text'}
    ],
    key:[L('kľúč upsertu: mesiac × oddelenie × metrika','upsert key: month × department × metric')],
    csv:'oddelenie;metrika;skutocnost;mesiac\nSklad;presnosť evidencie;97,80;2026-07\nImport;COGS v tolerancii;1;2026-07\nExpedícia;čas do odoslania;22;2026-07\nReklamácie;vyriešenosť;88;2026-07\nExternistky;plnenie úloh;95;2026-07\nSklad;obrátkovosť;41 dní;2026-07\nIT;dodržanie termínov;12;2026-07'
  },

  rep:{
    templates:[
      {k:'mesacny', l:L('Mesačný report','Monthly report'), s:L('Plnenie oddelení + heatmapa + tabuľka vstupov','Department attainment + heatmap + inputs table')},
      {k:'polrocny', l:L('Polročný report','Half-year report'), s:L('Priemer H1/H2, trend a porovnanie oddelení','H1/H2 average, trend and department comparison')},
      {k:'rocny', l:L('Ročný report','Yearly report'), s:L('YoY 2025 vs 2026 s toleranciou ±5 %','YoY 2025 vs 2026 with a ±5% tolerance')}
    ]
  },

  screens:[
{
  key:'prehlad', icon:'grid', title:L('Prehľad','Overview'),
  sub:L('Team score, plnenie 12 oddelení za jún 2026 a heatmapa naprieč rokom','Team score, June 2026 attainment across 12 departments and a year-long heatmap'),
  blocks:[
    {t:'kpis', items:[
      {l:'Team score', v:L('61,9 %','61.9%'), sub:L('priemer 6 zložiek (overené)','average of 6 components (verified)'), tone:'cond'},
      {l:L('Vyplnené oddelenia','Departments filled'), v:'7 / 12', sub:L('za jún 2026','for June 2026'), tone:'cond'},
      {l:L('Najlepšie oddelenie','Top department'), v:'Copywriter', sub:L('plnenie 100 %','100% attainment'), tone:'ok'},
      {l:L('Po termíne','Overdue'), v:'3', sub:L('uzávierka bola 10. 7.','close was Jul 10'), tone:'no'}
    ]},
    {t:'bars', title:L('Plnenie oddelení — jún 2026 (%)','Department attainment — June 2026 (%)'),
      data:[
        {l:'Copywriter', v:100},
        {l:L('Nahrávanie','Uploads'), v:88.5},
        {l:'Performance', v:87.2},
        {l:'Newsletter-AI', v:84.6},
        {l:'Import', v:91.3},
        {l:L('Expedícia','Dispatch'), v:82.5},
        {l:L('Externistky','Externals'), v:79.4},
        {l:L('Sklad','Warehouse'), v:76.8},
        {l:L('Reklamácie','Claims'), v:73.9},
        {l:L('Fotografka','Photographer'), v:68.1},
        {l:'IT', v:5},
        {l:L('Hospodársky','Business'), v:0}
      ],
      note:L('Overené 1:1 z KPI 3×60/20/20 analýzy jún 2026. Hospodársky bez dát (zobrazené ako 0, sivá farba).','Verified 1:1 from the KPI 3×60/20/20 June 2026 analysis. Business/finance has no data (shown as 0, grey colour).')
    },
    {t:'heat', title:L('Plnenie oddelení × mesiac (2026)','Department attainment × month (2026)'),
      cols:[L('Jan','Jan'),L('Feb','Feb'),L('Mar','Mar'),L('Apr','Apr'),L('Máj','May'),L('Jún','Jun'),L('Júl','Jul'),L('Aug','Aug'),L('Sep','Sep'),L('Okt','Oct'),L('Nov','Nov'),L('Dec','Dec')],
      rows:[
        {l:'Copywriter', v:[86,91,95,89,97,100,null,null,null,null,null,null]},
        {l:L('Nahrávanie','Uploads'), v:[72,80,85,78,84,88.5,null,null,null,null,null,null]},
        {l:'Performance', v:[90,83,88,92,85,87.2,null,null,null,null,null,null]},
        {l:'Newsletter-AI', v:[65,71,78,80,82,84.6,null,null,null,null,null,null]},
        {l:'Import', v:[80,85,82,88,90,91.3,null,null,null,null,null,null]},
        {l:L('Expedícia','Dispatch'), v:[74,77,80,79,81,82.5,null,null,null,null,null,null]},
        {l:L('Externistky','Externals'), v:[70,73,75,77,78,79.4,null,null,null,null,null,null]},
        {l:L('Sklad','Warehouse'), v:[65,68,72,70,74,76.8,null,null,null,null,null,null]},
        {l:L('Reklamácie','Claims'), v:[68,70,72,71,73,73.9,null,null,null,null,null,null]},
        {l:L('Fotografka','Photographer'), v:[75,70,62,74,71,68.1,null,null,null,null,null,null]},
        {l:'IT', v:[40,55,48,52,null,5,null,null,null,null,null,null]},
        {l:L('Hospodársky','Business'), v:[null,null,null,null,null,null,null,null,null,null,null,null]}
      ],
      note:L('Jún 2026 = reálne plnenie (overené). Jan–máj ukážkové. Júl a ďalšie mesiace zatiaľ bez uzávierky (dnes 4. 8. 2026).','June 2026 = real attainment (verified). Jan–May illustrative. July onward not yet closed (today is Aug 4, 2026).')
    },
    {t:'donut', pct:58, label:L('Kompletnosť vyplnenia — júl 2026','Fill completeness — July 2026'),
      note:L('22 kompletných · 9 rozpracovaných · 7 nevyplnených z 38 vstupov (ukážka)','22 complete · 9 in progress · 7 not filled of 38 inputs (illustrative)')},
    {t:'banner', tone:'no', text:L('Po termíne: Fotografka, Hospodársky a IT nevyplnili jún — uzávierka bola 10. 7. 2026.','Overdue: Photographer, Business/finance and IT missed the June close (day 10, Jul 10, 2026).')}
  ],
  ai:[
    {q:L('Koľko oddelení má za jún plnenie nad 80 %?','How many departments are above 80% attainment for June?'), a:L('Šesť: Copywriter (100 %), Import (91,3 %), Nahrávanie (88,5 %), Performance (87,2 %), Newsletter-AI (84,6 %) a Expedícia (82,5 %). Čísla sú overené z KPI analýzy jún 2026.','Six: Copywriter (100%), Import (91.3%), Uploads (88.5%), Performance (87.2%), Newsletter-AI (84.6%) and Dispatch (82.5%). Figures verified from the June 2026 KPI analysis.'), cite:'appka', act:{l:L('Otvoriť Oddelenia','Open Departments'), k:'open'}},
    {q:L('Prečo je Hospodársky sivé v heatmape?','Why is Business/finance grey in the heatmap?'), a:L('Sivá znamená bez dát — oddelenie nemá zaznamenané žiadne vstupy za žiadny mesiac roku 2026, vrátane uzávierky za jún.','Grey means no data — the department has no recorded inputs for any month of 2026, including the June close.'), cite:'appka', act:null},
    {q:L('Kedy bude vidno júl v heatmape?','When will July show in the heatmap?'), a:L('Až po uzávierke 10. 8. 2026. Dnes je 4. 8., júl je stále otvorený mesiac.','Only after the Aug 10, 2026 close. Today is Aug 4 — July is still an open month.'), cite:'appka', act:null}
  ]
},
{
  key:'oddelenia', icon:'list', title:L('Oddelenia','Departments'),
  sub:L('12 oddelení, ich plnenie za aktuálny mesiac a stav vyplnenia','12 departments, their current-month attainment and fill status'),
  blocks:[
    {t:'kpis', items:[
      {l:L('Oddelení spolu','Total departments'), v:'12'},
      {l:L('Uzavretých za jún','Closed for June'), v:'9'},
      {l:L('Otvorených (júl)','Open (July)'), v:'2'},
      {l:L('Po termíne','Overdue'), v:'3', tone:'no'}
    ]},
    {t:'table', title:null,
      cols:[L('Oddelenie','Department'), L('Plnenie','Attainment'), L('Mesiac','Month'), L('Vyplnenie','Fill'), L('Vstupy','Inputs'), 'Trend'],
      rows:[
        {c:['Copywriter', {pln:100}, ['ok',L('Uzavretý','Closed')], ['ok',L('Kompletné','Complete')], '5/5', '↑'], go:'oddelenie'},
        {c:[L('Nahrávanie','Uploads'), {pln:88.5}, ['ok',L('Uzavretý','Closed')], ['ok',L('Kompletné','Complete')], '4/4', '↑'], go:'oddelenie'},
        {c:['Performance', {pln:87.2}, ['ok',L('Uzavretý','Closed')], ['ok',L('Kompletné','Complete')], '6/6', '→'], go:'oddelenie'},
        {c:['Import', {pln:91.3}, ['ok',L('Uzavretý','Closed')], ['ok',L('Kompletné','Complete')], '4/4', '↑'], go:'oddelenie'},
        {c:[L('Expedícia','Dispatch'), {pln:82.5}, ['ok',L('Uzavretý','Closed')], ['ok',L('Kompletné','Complete')], '4/4', '↑'], go:'oddelenie'},
        {c:[L('Externistky','Externals'), {pln:79.4}, ['ok',L('Uzavretý','Closed')], ['ok',L('Kompletné','Complete')], '3/3', '→'], go:'oddelenie'},
        {c:[L('Sklad','Warehouse'), {pln:76.8}, ['ok',L('Uzavretý','Closed')], ['ok',L('Kompletné','Complete')], '5/5', '→'], go:'oddelenie'},
        {c:[L('Reklamácie','Claims'), {pln:73.9}, ['info',L('Otvorený','Open')], ['cond',L('Rozpracované','In progress')], '2/4', '↓'], go:'oddelenie'},
        {c:[L('Fotografka','Photographer'), {pln:68.1}, ['no',L('Po termíne','Overdue')], ['cond',L('Rozpracované','In progress')], '2/4', '↓'], go:'oddelenie'},
        {c:['Newsletter-AI', {pln:84.6}, ['info',L('Otvorený','Open')], ['cond',L('Rozpracované','In progress')], '3/5', '↑'], go:'oddelenie'},
        {c:['IT', {pln:5}, ['no',L('Po termíne','Overdue')], ['cond',L('Rozpracované','In progress')], '1/4', '↓'], go:'oddelenie'},
        {c:[L('Hospodársky','Business/finance'), {pln:null}, ['no',L('Po termíne','Overdue')], ['q',L('Nevyplnené','Not filled')], '0/6', '—'], go:'oddelenie'}
      ],
      note:L('Plnenia jún 2026 overené 1:1 z KPI analýzy. Stavy Otvorený/Uzavretý/Po termíne ukážkové.','June 2026 attainment verified 1:1 from the KPI analysis. Open/Closed/Overdue statuses illustrative.'),
      page:true
    },
    {t:'banner', tone:'no', text:L('3 oddelenia po termíne za jún: Fotografka, Hospodársky, IT. Hospodársky vidí v tejto tabuľke len Admin a manažment.','3 departments overdue for June: Photographer, Business/finance, IT. Business/finance is visible in this table only to Admin and management.')}
  ],
  ai:[
    {q:L('Ktoré oddelenie má najnižšie plnenie?','Which department has the lowest attainment?'), a:L('IT s 5 % — dôvod: väčšina vstupov (3 zo 4) chýba a metrický set bol prvýkrát nastavený až v júli 2026 ako baseline.','IT at 5% — most inputs (3 of 4) are missing and the metric set was only first configured as a July 2026 baseline.'), cite:'appka', act:null},
    {q:L('Koľko vstupov chýba celkovo?','How many inputs are missing in total?'), a:L('Súčtom neúplných riadkov v tabuľke: 2+2+2+3+6 = 15 z aktuálnych mesiacov naprieč piatimi oddeleniami.','Summing incomplete rows in the table: 2+2+2+3+6 = 15 across the current months of five departments.'), cite:'appka', act:{l:L('Otvoriť Na doplnenie','Open To fill'), k:'open'}},
    {q:L('Kto vidí riadok Hospodársky?','Who can see the Business/finance row?'), a:L('Len role Admin a manažment — ostatní editori a prehliadači ho v tabuľke nevidia vôbec.','Only the Admin role and management — other editors and viewers cannot see it in the table at all.'), cite:'appka', act:null}
  ]
},
{
  key:'oddelenie', icon:'doc', title:L('Oddelenie — Copywriter','Department — Copywriter'),
  sub:L('Detail metodiky, pásiem, vstupov a 12-mesačnej histórie plnenia','Detail of the methodology, bands, inputs and 12-month attainment history'),
  blocks:[
    {t:'kpis', items:[
      {l:L('Plnenie jún 2026','June 2026 attainment'), v:L('100 %','100%'), sub:L('Uzavretý 11. 7. 2026','Closed Jul 11, 2026'), tone:'ok'},
      {l:L('Váhová schéma','Weight scheme'), v:'60/20/20', sub:L('3 metriky','3 metrics')},
      {l:L('Vyplnenie','Fill'), v:'5/5', sub:L('kompletné','complete'), tone:'ok'},
      {l:L('Trend vs máj','Trend vs May'), v:'↑', sub:L('97 % → 100 %','97% → 100%')}
    ]},
    {t:'table', title:L('Metriky a pásma','Metrics and bands'),
      cols:[L('Metrika','Metric'), L('Pásmo (Min–Max)','Band (Min–Max)'), L('Váha','Weight'), L('Skutočnosť','Actual'), L('Plnenie','Attainment')],
      rows:[
        {c:[L('Top 100 KW v TOP 3','Top 100 KWs in TOP 3'), '20–35 %', '60 %', '35 %', {pln:100}]},
        {c:[L('Hustota KW 1–3','KW density 1–3'), '150–250', '20 %', '250', {pln:100}]},
        {c:['CTR', '1–2 %', '20 %', '2 %', {pln:100}]}
      ],
      note:L('Plnenie = (skutočnosť − Min) / (Max − Min), cap 100 %. Váhy 60/20/20 overené.','Attainment = (actual − Min) / (Max − Min), capped at 100%. 60/20/20 weights verified.')
    },
    {t:'table', title:L('Vstupy za jún 2026','Inputs for June 2026'),
      cols:[L('Vstup','Input'), L('Hodnota','Value'), L('Zdroj','Source'), L('Zapísané','Logged')],
      rows:[
        {c:[L('Počet KW v TOP 3 (z fixných 100)','KW count in TOP 3 (of a fixed 100)'), '35', L('SEO appka (automaticky)','SEO app (automatic)'), L('3. 7.','Jul 3')]},
        {c:[L('Hustota KW pozícia 1–3','KW density position 1–3'), '250', L('SEO appka (automaticky)','SEO app (automatic)'), L('3. 7.','Jul 3')]},
        {c:['CTR', '2 %', L('SEO appka (automaticky)','SEO app (automatic)'), L('3. 7.','Jul 3')]},
        {c:[L('Editor','Editor'), 'copywriter@sperky-aura.sk', L('ručne','manual'), L('1. 7.','Jul 1')]},
        {c:[L('Uzávierka','Close'), L('10. 7. 2026','Jul 10, 2026'), L('systém','system'), L('11. 7.','Jul 11')]}
      ],
      note:L('4/5 vstupov prichádza automaticky zo SEO appky — Copywriter je jediné oddelenie s plnou integráciou.','4 of 5 inputs arrive automatically from the SEO app — Copywriter is the only department with a full integration.')
    },
    {t:'lines', title:L('12-mesačná história plnenia','12-month attainment history'),
      labels:[L('Jan','Jan'),L('Feb','Feb'),L('Mar','Mar'),L('Apr','Apr'),L('Máj','May'),L('Jún','Jun'),L('Júl','Jul'),L('Aug','Aug'),L('Sep','Sep'),L('Okt','Oct'),L('Nov','Nov'),L('Dec','Dec')],
      series:[{l:'Copywriter', v:[86,91,95,89,97,100,null,null,null,null,null,null], color:'var(--acc)'}],
      avg:true,
      note:L('Jún 2026 = reálne overené plnenie 100 %. Jan–máj ukážkové, júl a ďalej zatiaľ bez uzávierky.','June 2026 = verified 100% attainment. Jan–May illustrative, July onward not yet closed.')
    },
    {t:'timeline', title:L('História mesiaca','Month history'),
      items:[
        [L('11. 7.','Jul 11'), L('Mesiac uzavretý (po 10. dni)','Month closed (after day 10)')],
        [L('8. 7.','Jul 8'), L('Kompletné — všetky vstupy vyplnené','Complete — all inputs filled')],
        [L('3. 7.','Jul 3'), L('Rozpracované — vyplnené prvé vstupy','In progress — first inputs filled')],
        [L('1. 7.','Jul 1'), L('Mesiac otvorený','Month opened')]
      ]
    }
  ],
  ai:[
    {q:L('Prečo má Copywriter 100 %?','Why does Copywriter score 100%?'), a:L('Všetky tri metriky dosiahli hornú hranicu svojho pásma (35 KW, 250 hustota, 2 % CTR) — plnenie sa pri dosiahnutí Max capuje na 100 %.','All three metrics hit the top of their band (35 KWs, 250 density, 2% CTR) — attainment caps at 100% once the Max is reached.'), cite:'appka', act:null},
    {q:L('Odkiaľ prichádzajú dáta Copywritera?','Where does Copywriter data come from?'), a:L('4 z 5 vstupov automaticky zo SEO appky (integrácia), len editor a uzávierka sú manuálne.','4 of 5 inputs come automatically from the SEO app (the integration); only the editor and close are manual.'), cite:'appka', act:{l:L('Otvoriť Integrácie','Open Integrations'), k:'open'}},
    {q:L('Aký je trend za posledných 6 mesiacov?','What is the 6-month trend?'), a:L('Kolísavý rast s miernym poklesom v apríli (89 %), zakončený júnovým maximom 100 %. Staršie mesiace sú ukážkové.','A fluctuating rise with a small April dip (89%), ending at the June peak of 100%. Earlier months are illustrative.'), cite:'ukážka', act:null}
  ]
},
{
  key:'vyplnit', icon:'send', title:L('Vyplniť mesiac','Fill month'),
  sub:L('Formulár vyplnenia — Newsletter-AI, júl 2026 (otvorený, 3 z 5 vstupov)','Fill-in form — Newsletter-AI, July 2026 (open, 3 of 5 inputs)'),
  blocks:[
    {t:'banner', tone:'cond', text:L('Otvorený mesiac. Uzávierka do 10. 8. 2026 — po termíne sa oddelenie označí ako Po termíne a upozornenie ide na e-mail.','Open month. Close by Aug 10, 2026 — after that the department is flagged Overdue and a reminder e-mail goes out.')},
    {t:'form', title:L('Newsletter-AI — júl 2026','Newsletter-AI — July 2026'),
      fields:[
        {l:L('Pomer tržba/admin vs plán','Revenue/admin ratio vs plan'), s:L('pásmo 90–110 % · váha 60 %','band 90–110% · weight 60%'), type:'text', v:'104 %'},
        {l:L('Marža v cieli','Margin in target'), s:L('pásmo 45–55 %, binárne · váha 20 %','band 45–55%, binary · weight 20%'), type:'text', v:'51 %'},
        {l:L('Konverzie newslettera','Newsletter conversions'), s:L('nový vstup — zadaj tento mesiac','new input — enter this month'), type:'text', v:''},
        {l:L('Zhoda atribúcie','Attribution match'), s:L('pásmo invert 10→5 · váha 20 %','inverted band 10→5 · weight 20%'), type:'text', v:''},
        {l:L('Poznámka','Note'), s:L('voliteľné, uvidí Admin aj Editor','optional, visible to Admin and Editor'), type:'textarea', v:''}
      ],
      note:L('Po uložení sa plnenie prepočíta okamžite podľa (skutočnosť−Min)/(Max−Min), cap 100 %.','On save, attainment recalculates immediately as (actual−Min)/(Max−Min), capped at 100%.')
    },
    {t:'table', title:L('Predchádzajúci mesiac (jún) pre porovnanie','Previous month (June) for reference'),
      cols:[L('Vstup','Input'), L('Jún','June'), L('Júl (zatiaľ)','July (so far)')],
      rows:[
        {c:[L('Pomer tržba/admin vs plán','Revenue/admin ratio vs plan'), '101 %', '104 %']},
        {c:[L('Marža v cieli','Margin in target'), '49 %', '51 %']},
        {c:[L('Konverzie newslettera','Newsletter conversions'), '312', '—']},
        {c:[L('Zhoda atribúcie','Attribution match'), '6,2', '—']}
      ],
      note:L('Hodnoty ukážkové.','Values illustrative.')
    }
  ],
  ai:[
    {q:L('Čo sa stane, ak nevyplním do 10. 8.?','What happens if I don’t fill by Aug 10?'), a:L('Oddelenie sa označí Po termíne, ako sa to stalo Fotografke, Hospodárskemu a IT za jún — appka to zapíše do auditu a pošle upozornenie.','The department gets flagged Overdue, as happened to Photographer, Business/finance and IT in June — the app logs it in the audit trail and sends a reminder.'), cite:'appka', act:{l:L('Otvoriť Audit','Open Audit'), k:'open'}},
    {q:L('Prečo sú dva vstupy prázdne?','Why are two inputs empty?'), a:L('Konverzie newslettera a zhoda atribúcie sú vstupy, ktoré ešte nikto tento mesiac nezadal — preto je oddelenie v stave Rozpracované, 3 z 5.','Newsletter conversions and attribution match haven’t been entered yet this month — that’s why the department shows In progress, 3 of 5.'), cite:'appka', act:null},
    {q:L('Kto môže tento formulár upraviť?','Who can edit this form?'), a:L('Role Editor priradená na Newsletter-AI a Admin. Prehliadač formulár vidí, ale nemôže ukladať.','The Editor role assigned to Newsletter-AI, plus Admin. A Viewer can see the form but cannot save.'), cite:'appka', act:{l:L('Otvoriť Nastavenia','Open Settings'), k:'open'}}
  ]
},
{
  key:'analyza', icon:'trend', title:L('Analýza','Analysis'),
  sub:L('A/B porovnanie mesiacov naprieč 12 oddeleniami a heatmapa posledných troch mesiacov','A/B month comparison across 12 departments and a heatmap of the last three months'),
  blocks:[
    {t:'table', title:L('A/B porovnanie — máj vs jún 2026','A/B compare — May vs June 2026'),
      cols:[L('Oddelenie','Department'), L('Máj','May'), L('Jún','June'), 'Δ'],
      rows:[
        {c:['Copywriter', {pln:97}, {pln:100}, '+3 p.b.']},
        {c:[L('Nahrávanie','Uploads'), {pln:84}, {pln:88.5}, '+4,5 p.b.']},
        {c:['Performance', {pln:85}, {pln:87.2}, '+2,2 p.b.']},
        {c:['Newsletter-AI', {pln:82}, {pln:84.6}, '+2,6 p.b.']},
        {c:['Import', {pln:90}, {pln:91.3}, '+1,3 p.b.']},
        {c:[L('Expedícia','Dispatch'), {pln:81}, {pln:82.5}, '+1,5 p.b.']},
        {c:[L('Externistky','Externals'), {pln:78}, {pln:79.4}, '+1,4 p.b.']},
        {c:[L('Sklad','Warehouse'), {pln:74}, {pln:76.8}, '+2,8 p.b.']},
        {c:[L('Reklamácie','Claims'), {pln:73}, {pln:73.9}, '+0,9 p.b.']},
        {c:[L('Fotografka','Photographer'), {pln:71}, {pln:68.1}, '−2,9 p.b.']},
        {c:['IT', {pln:null}, {pln:5}, '—']},
        {c:[L('Hospodársky','Business'), {pln:null}, {pln:null}, '—']}
      ],
      note:L('Jún = reálne overené plnenie. Máj ukážkový (appka nemá importovanú históriu spred júla 2026).','June = verified real attainment. May is illustrative (the app has no imported history before July 2026).')
    },
    {t:'heat', title:L('Posledné 3 mesiace × oddelenie','Last 3 months × department'),
      cols:[L('Apr','Apr'), L('Máj','May'), L('Jún','Jun')],
      rows:[
        {l:'Copywriter', v:[89,97,100]},
        {l:L('Nahrávanie','Uploads'), v:[78,84,88.5]},
        {l:'Performance', v:[92,85,87.2]},
        {l:'Newsletter-AI', v:[80,82,84.6]},
        {l:'Import', v:[88,90,91.3]},
        {l:L('Expedícia','Dispatch'), v:[79,81,82.5]},
        {l:L('Externistky','Externals'), v:[77,78,79.4]},
        {l:L('Sklad','Warehouse'), v:[70,74,76.8]},
        {l:L('Reklamácie','Claims'), v:[71,73,73.9]},
        {l:L('Fotografka','Photographer'), v:[74,71,68.1]},
        {l:'IT', v:[52,null,5]},
        {l:L('Hospodársky','Business'), v:[null,null,null]}
      ],
      note:L('Jún reálny, apríl a máj ukážkové.','June real, April and May illustrative.')
    },
    {t:'banner', tone:'ok', text:L('10 z 12 oddelení zlepšilo plnenie medzimesačne, výnimka Fotografka (−2,9 p.b.) a Hospodársky/IT bez porovnania.','10 of 12 departments improved month over month; the exception is Photographer (−2.9pp) and Business/IT have no comparison.')}
  ],
  ai:[
    {q:L('Ktoré oddelenie kleslo medzi májom a júnom?','Which department dropped between May and June?'), a:L('Jediné Fotografka, z 71 % na 68,1 % (−2,9 p.b.) — oddelenie je zároveň po termíne.','Only Photographer, from 71% to 68.1% (−2.9pp) — the department is also overdue.'), cite:'appka', act:{l:L('Otvoriť oddelenie','Open department'), k:'open'}},
    {q:L('Prečo IT a Hospodársky nemajú máj?','Why do IT and Business have no May figure?'), a:L('IT malo júl 2026 ako prvý baseline mesiac metrík (máj neexistuje), Hospodársky nemá dáta ani za jún.','IT’s metric set only started as a July 2026 baseline (no May figure exists), and Business/finance has no data even for June.'), cite:'pamäť', act:null},
    {q:L('Je toto porovnanie overené?','Is this comparison verified?'), a:L('Len stĺpec Jún je overený 1:1 z KPI analýzy. Máj a heatmapa staršie mesiace sú ukážkové, appka históriu pred júlom 2026 neimportuje.','Only the June column is verified 1:1 from the KPI analysis. May and the older heatmap months are illustrative — the app does not import history before July 2026.'), cite:'ukážka', act:null}
  ]
},
{
  key:'rok', icon:'cal', title:L('Rok','Year'),
  sub:L('Ročné porovnanie 2025 vs 2026 s toleranciou ±5 %','Yearly comparison 2025 vs 2026 with a ±5% tolerance'),
  blocks:[
    {t:'kpis', items:[
      {l:L('Priemer 2026 (YTD)','2026 average (YTD)'), v:L('81,2 %','81.2%'), sub:L('12 oddelení, ukážka','12 departments, illustrative')},
      {l:L('Priemer 2025','2025 average'), v:L('77,9 %','77.9%'), sub:L('ukážka','illustrative')},
      {l:L('Mimo tolerancie','Out of tolerance'), v:'2', sub:L('Newsletter-AI, Hospodársky','Newsletter-AI, Business'), tone:'no'},
      {l:L('Tolerancia','Tolerance'), v:'± 5 %', sub:L('metodika appky (overené)','app methodology (verified)')}
    ]},
    {t:'table', title:null,
      cols:[L('Oddelenie','Department'), '2025', '2026', 'Δ', L('Tolerancia','Tolerance')],
      rows:[
        {c:['Copywriter', '92,4 %', '96,1 %', '+3,7 p.b.', ['ok', L('v tolerancii','within tolerance')]]},
        {c:[L('Nahrávanie','Uploads'), '81,0 %', '85,3 %', '+4,3 p.b.', ['ok', L('v tolerancii','within tolerance')]]},
        {c:['Performance', '88,9 %', '86,4 %', '−2,5 p.b.', ['ok', L('v tolerancii','within tolerance')]]},
        {c:['Newsletter-AI', '70,2 %', '79,8 %', '+9,6 p.b.', ['cond', L('nad +5 %','above +5%')]]},
        {c:['Import', '84,1 %', '88,7 %', '+4,6 p.b.', ['ok', L('v tolerancii','within tolerance')]]},
        {c:[L('Expedícia','Dispatch'), '79,0 %', '81,6 %', '+2,6 p.b.', ['ok', L('v tolerancii','within tolerance')]]},
        {c:[L('Externistky','Externals'), '75,5 %', '78,2 %', '+2,7 p.b.', ['ok', L('v tolerancii','within tolerance')]]},
        {c:[L('Sklad','Warehouse'), '74,1 %', '77,3 %', '+3,2 p.b.', ['ok', L('v tolerancii','within tolerance')]]},
        {c:[L('Reklamácie','Claims'), '71,4 %', '73,2 %', '+1,8 p.b.', ['ok', L('v tolerancii','within tolerance')]]},
        {c:[L('Fotografka','Photographer'), '78,5 %', '70,9 %', '−7,6 p.b.', ['cond', L('pod −5 %','below −5%')]]},
        {c:['IT', '—', '5,0 %', '—', ['q', L('bez porovnania','no comparison')]]},
        {c:[L('Hospodársky','Business/finance'), '66,3 %', '52,1 %', '−14,2 p.b.', ['no', L('mimo tolerancie','out of tolerance')]]}
      ],
      note:L('Metodika ±5 % tolerancie je overená; konkrétne ročné hodnoty sú ukážkové (year_refs 2025 v appke zatiaľ nevyplnené).','The ±5% tolerance methodology is verified; specific yearly figures are illustrative (2025 year_refs are not yet filled in the app).'),
      page:true
    },
    {t:'banner', tone:'no', text:L('Bez vyplnených year_refs za 2025 appka YoY tržbu ani import toleranciu nedopočíta — dopĺňa sa v Nastaveniach.','Without filled-in 2025 year_refs, the app cannot compute YoY revenue or the import tolerance — add them in Settings.')}
  ],
  ai:[
    {q:L('Ktoré oddelenia sú mimo tolerancie?','Which departments are out of tolerance?'), a:L('Hospodársky (−14,2 p.b., mimo ±5 %) a čiastočne Newsletter-AI (+9,6 p.b., nad hornou hranicou) a Fotografka (−7,6 p.b., pod dolnou hranicou).','Business/finance (−14.2pp, outside ±5%) and partially Newsletter-AI (+9.6pp, above the upper bound) and Photographer (−7.6pp, below the lower bound).'), cite:'ukážka', act:null},
    {q:L('Čo znamená tolerancia ±5 %?','What does the ±5% tolerance mean?'), a:L('Rozdiel medzi rokmi nad 5 percentuálnych bodov sa označí ako mimo tolerancie a ide na kontrolu, či ide o reálny trend alebo chybu vstupu.','A year-over-year gap over 5 percentage points is flagged as out of tolerance and reviewed to see whether it is a real trend or a data-entry error.'), cite:'appka', act:null},
    {q:L('Prečo IT nemá rok 2025?','Why does IT have no 2025 figure?'), a:L('IT dostalo svoj metrický set až v júli 2026 ako baseline — pred tým sa IT výkon KPI metódou nemeral.','IT only received its metric set in July 2026 as a baseline — before that, IT performance was not measured with the KPI method.'), cite:'pamäť', act:null}
  ]
},
{
  key:'doplnenie', icon:'warn', title:L('Na doplnenie','To fill'),
  sub:L('Chýbajúce vstupy za zmeškaný jún a otvorený júl','Missing inputs for the missed June close and the open July month'),
  blocks:[
    {t:'kpis', items:[
      {l:L('Chýbajúcich vstupov','Missing inputs'), v:'24', tone:'no'},
      {l:L('Po termíne (jún)','Overdue (June)'), v:'11', tone:'no'},
      {l:L('Otvorené (júl)','Open (July)'), v:'13', tone:'cond'},
      {l:L('Oddelení dotknutých','Departments affected'), v:'9 / 12'}
    ]},
    {t:'table', title:null,
      cols:[L('Oddelenie','Department'), L('Chýbajúci vstup','Missing input'), L('Termín','Due'), L('Stav','Status')],
      rows:[
        {c:[L('Fotografka','Photographer'), L('Počet nafotených produktov','Products photographed count'), L('10. 7.','Jul 10'), ['no', L('Po termíne','Overdue')]]},
        {c:[L('Fotografka','Photographer'), L('Priebežnosť zavreté÷otvorené','Closed÷open ratio'), L('10. 7.','Jul 10'), ['no', L('Po termíne','Overdue')]]},
        {c:[L('Hospodársky','Business/finance'), L('EBITDA marža','EBITDA margin'), L('10. 7.','Jul 10'), ['no', L('Po termíne','Overdue')]]},
        {c:[L('Hospodársky','Business/finance'), L('Náklad vs strop','Cost vs cap'), L('10. 7.','Jul 10'), ['no', L('Po termíne','Overdue')]]},
        {c:[L('Hospodársky','Business/finance'), 'PNO %', L('10. 7.','Jul 10'), ['no', L('Po termíne','Overdue')]]},
        {c:[L('Hospodársky','Business/finance'), L('Tržby celkom','Total revenue'), L('10. 7.','Jul 10'), ['no', L('Po termíne','Overdue')]]},
        {c:[L('Hospodársky','Business/finance'), L('Náklady celkom','Total costs'), L('10. 7.','Jul 10'), ['no', L('Po termíne','Overdue')]]},
        {c:[L('Hospodársky','Business/finance'), L('DPH prehľad','VAT overview'), L('10. 7.','Jul 10'), ['no', L('Po termíne','Overdue')]]},
        {c:['IT', L('Uptime a incidenty','Uptime & incidents'), L('10. 7.','Jul 10'), ['no', L('Po termíne','Overdue')]]},
        {c:['IT', L('Čas do produkcie','Time to production'), L('10. 7.','Jul 10'), ['no', L('Po termíne','Overdue')]]},
        {c:['IT', L('Blokovanie iných oddelení','Blocking other departments'), L('10. 7.','Jul 10'), ['no', L('Po termíne','Overdue')]]},
        {c:['Newsletter-AI', L('Konverzie newslettera','Newsletter conversions'), L('10. 8.','Aug 10'), ['cond', L('Otvorené','Open')]]},
        {c:['Newsletter-AI', L('Zhoda atribúcie','Attribution match'), L('10. 8.','Aug 10'), ['cond', L('Otvorené','Open')]]},
        {c:[L('Reklamácie','Claims'), L('Ø čas riešenia prípadov','Avg case resolution time'), L('10. 8.','Aug 10'), ['cond', L('Otvorené','Open')]]},
        {c:[L('Reklamácie','Claims'), L('Počet uzavretých prípadov','Closed cases count'), L('10. 8.','Aug 10'), ['cond', L('Otvorené','Open')]]},
        {c:['Copywriter', L('Top 100 KW v TOP 3 (júl)','Top 100 KWs in TOP 3 (July)'), L('10. 8.','Aug 10'), ['cond', L('Otvorené','Open')]]},
        {c:[L('Nahrávanie','Uploads'), L('Uverejnené vs plán (júl)','Published vs plan (July)'), L('10. 8.','Aug 10'), ['cond', L('Otvorené','Open')]]},
        {c:['Performance', L('Marža % (júl)','Margin % (July)'), L('10. 8.','Aug 10'), ['cond', L('Otvorené','Open')]]},
        {c:['Import', L('COGS v tolerancii (júl)','COGS within tolerance (July)'), L('10. 8.','Aug 10'), ['cond', L('Otvorené','Open')]]},
        {c:[L('Expedícia','Dispatch'), L('Čas do odoslania (júl)','Time to dispatch (July)'), L('10. 8.','Aug 10'), ['cond', L('Otvorené','Open')]]},
        {c:[L('Sklad','Warehouse'), L('Presnosť evidencie (júl)','Record accuracy (July)'), L('10. 8.','Aug 10'), ['cond', L('Otvorené','Open')]]},
        {c:[L('Externistky','Externals'), L('Plnenie úloh (júl)','Task completion (July)'), L('10. 8.','Aug 10'), ['cond', L('Otvorené','Open')]]},
        {c:['IT', L('Report disciplína (júl)','Report discipline (July)'), L('10. 8.','Aug 10'), ['cond', L('Otvorené','Open')]]},
        {c:[L('Fotografka','Photographer'), L('Podiel retuše (júl)','Retouch share (July)'), L('10. 8.','Aug 10'), ['cond', L('Otvorené','Open')]]}
      ],
      note:L('Riadky 1–11 sú reálne overené prípady po termíne za jún (Fotografka, Hospodársky, IT). Riadky za júl sú ukážkové — mesiac je stále otvorený.','Rows 1–11 are real, verified overdue June cases (Photographer, Business/finance, IT). The July rows are illustrative — the month is still open.'),
      page:true
    },
    {t:'banner', tone:'no', text:L('Po termíne ide automatická e-mailová pripomienka pred uzávierkou a záznam do auditu pri prekročení 10. dňa.','An automatic e-mail reminder goes out before the close, and an overdue record is written to the audit log after day 10.')}
  ],
  ai:[
    {q:L('Ktoré oddelenie má najviac chýbajúcich vstupov?','Which department has the most missing inputs?'), a:L('Hospodársky — 6 chýbajúcich vstupov za jún, celé oddelenie je nevyplnené.','Business/finance — 6 missing inputs for June, the whole department is unfilled.'), cite:'appka', act:{l:L('Otvoriť oddelenie','Open department'), k:'open'}},
    {q:L('Kedy sa júlové položky stanú po termíne?','When do the July items become overdue?'), a:L('Po 10. 8. 2026 — do vtedy majú stav Otvorené, potom sa prepnú na Po termíne rovnako ako júnové prípady.','After Aug 10, 2026 — until then they show Open, then flip to Overdue just like the June cases.'), cite:'appka', act:null},
    {q:L('Dá sa vstup vyplniť priamo odtiaľto?','Can I fill an input directly from here?'), a:L('Áno, klik na riadok otvorí formulár Vyplniť mesiac pre dané oddelenie a mesiac.','Yes, clicking a row opens the Fill month form for that department and month.'), cite:'appka', act:{l:L('Otvoriť Vyplniť','Open Fill'), k:'open'}}
  ]
},
{
  key:'denniky', icon:'clip', title:L('Denníky','Logs'),
  sub:L('Denné a týždenné zápisy troch oddelení — vstup pre mesačné plnenie','Daily and weekly logs of three departments — the input for monthly attainment'),
  blocks:[
    {t:'kpis', items:[
      {l:L('Sklad — zápisov v júli','Warehouse — July entries'), v:'23/23', tone:'ok'},
      {l:L('Externistky — aktívnych','Externals — active'), v:'6', sub:L('5 oblastí','5 areas')},
      {l:L('Projekty — sledovaných','Projects — tracked'), v:'5', sub:L('4 oddelenia','4 departments')},
      {l:L('Plnenie Sklad / Ext. jún','Warehouse / Externals June'), v:L('76,8 % / 79,4 %','76.8% / 79.4%'), tone:'ok'}
    ]},
    {t:'table', title:L('Sklad — denník júl 2026','Warehouse — July 2026 log'),
      cols:[L('Dátum','Date'), L('Prijaté','Received'), L('Vyskladnené','Picked'), L('Inventúra Δ','Inventory Δ'), L('Zapísal','Logged by'), L('Stav','Status')],
      rows:[
        {c:[L('St 1. 7.','Wed Jul 1'), int(380), int(360), '−1', 'Marek', ['ok', L('uzavretý','closed')]]},
        {c:[L('Št 2. 7.','Thu Jul 2'), int(395), int(370), '0', 'Delaja', ['ok', L('uzavretý','closed')]]},
        {c:[L('Pi 3. 7.','Fri Jul 3'), int(410), int(402), '−2', 'Marek', ['ok', L('uzavretý','closed')]]},
        {c:[L('Po 6. 7.','Mon Jul 6'), int(365), int(350), '0', 'Delaja', ['ok', L('uzavretý','closed')]]},
        {c:[L('Ut 7. 7.','Tue Jul 7'), int(372), int(360), '−1', 'Marek', ['ok', L('uzavretý','closed')]]},
        {c:[L('St 8. 7.','Wed Jul 8'), int(388), int(375), '0', 'Delaja', ['ok', L('uzavretý','closed')]]},
        {c:[L('Št 9. 7.','Thu Jul 9'), int(401), int(390), '−1', 'Marek', ['ok', L('uzavretý','closed')]]},
        {c:[L('Pi 10. 7.','Fri Jul 10'), int(415), int(408), '0', 'Delaja', ['ok', L('uzavretý','closed')]]},
        {c:[L('Po 13. 7.','Mon Jul 13'), int(358), int(340), '−2', 'Marek', ['ok', L('uzavretý','closed')]]},
        {c:[L('Ut 14. 7.','Tue Jul 14'), int(367), int(352), '0', 'Delaja', ['ok', L('uzavretý','closed')]]},
        {c:[L('St 15. 7.','Wed Jul 15'), int(379), int(365), '−1', 'Marek', ['ok', L('uzavretý','closed')]]},
        {c:[L('Št 16. 7.','Thu Jul 16'), int(392), int(380), '0', 'Delaja', ['ok', L('uzavretý','closed')]]},
        {c:[L('Pi 17. 7.','Fri Jul 17'), int(405), int(398), '−1', 'Marek', ['ok', L('uzavretý','closed')]]},
        {c:[L('Po 20. 7.','Mon Jul 20'), int(361), int(345), '0', 'Delaja', ['ok', L('uzavretý','closed')]]},
        {c:[L('Ut 21. 7.','Tue Jul 21'), int(374), int(360), '−2', 'Marek', ['ok', L('uzavretý','closed')]]},
        {c:[L('St 22. 7.','Wed Jul 22'), int(385), int(372), '0', 'Delaja', ['ok', L('uzavretý','closed')]]},
        {c:[L('Št 23. 7.','Thu Jul 23'), int(398), int(388), '−1', 'Marek', ['ok', L('uzavretý','closed')]]},
        {c:[L('Pi 24. 7.','Fri Jul 24'), int(412), int(400), '0', 'Delaja', ['ok', L('uzavretý','closed')]]},
        {c:[L('Po 27. 7.','Mon Jul 27'), int(402), int(412), '−1', 'Marek', ['ok', L('uzavretý','closed')]]},
        {c:[L('Ut 28. 7.','Tue Jul 28'), int(355), int(388), '0', 'Delaja', ['ok', L('uzavretý','closed')]]},
        {c:[L('St 29. 7.','Wed Jul 29'), int(428), int(441), '−2', 'Marek', ['ok', L('uzavretý','closed')]]},
        {c:[L('Št 30. 7.','Thu Jul 30'), int(366), int(405), '0', 'Delaja', ['ok', L('uzavretý','closed')]]},
        {c:[L('Pi 31. 7.','Fri Jul 31'), int(310), int(352), '−1', 'Delaja', ['ok', L('uzavretý','closed')]]}
      ],
      note:L('Δ = rozdiel fyzickej inventúry proti systému. Posledný týždeň (27.–31. 7.) je reálny zdroj plnenia 76,8 % za jún; ostatné dni ukážkové.','Δ = physical inventory vs system. The last week (Jul 27–31) is the real source behind the 76.8% June attainment; other days illustrative.')
    },
    {t:'table', title:L('Externistky — denník júl 2026','Externals — July 2026 log'),
      cols:[L('Týždeň','Week'), L('Externistka','External'), L('Oblasť','Area'), L('Hodiny','Hours'), L('Výkon','Output'), L('Stav','Status')],
      rows:[
        {c:['W27', 'Ivana K.', L('Fotenie produktov','Product photography'), '12 h', L('34 ks','34 pcs'), ['ok', L('zapísané','logged')]]},
        {c:['W27', 'Lucia M.', L('Popisky produktov','Product copy'), '10 h', L('24 popiskov','24 descriptions'), ['ok', L('zapísané','logged')]]},
        {c:['W27', 'Zuzana B.', L('Retuš fotiek','Photo retouching'), '9 h', L('60 fotiek','60 photos'), ['ok', L('zapísané','logged')]]},
        {c:['W27', 'Katarína S.', L('Balenie zásielok','Parcel packing'), '8 h', L('152 zásielok','152 parcels'), ['ok', L('zapísané','logged')]]},
        {c:['W27', 'Petra D.', L('Nahrávanie na web','Web uploads'), '7 h', L('19 produktov','19 products'), ['ok', L('zapísané','logged')]]},
        {c:['W27', 'Monika R.', L('Sociálne siete','Social media'), '6 h', L('4 posty','4 posts'), ['ok', L('zapísané','logged')]]},
        {c:['W28', 'Ivana K.', L('Fotenie produktov','Product photography'), '11 h', L('30 ks','30 pcs'), ['ok', L('zapísané','logged')]]},
        {c:['W28', 'Lucia M.', L('Popisky produktov','Product copy'), '10 h', L('24 popiskov','24 descriptions'), ['ok', L('zapísané','logged')]]},
        {c:['W28', 'Zuzana B.', L('Retuš fotiek','Photo retouching'), '10 h', L('60 fotiek','60 photos'), ['ok', L('zapísané','logged')]]},
        {c:['W28', 'Katarína S.', L('Balenie zásielok','Parcel packing'), '9 h', L('153 zásielok','153 parcels'), ['ok', L('zapísané','logged')]]},
        {c:['W28', 'Petra D.', L('Nahrávanie na web','Web uploads'), '8 h', L('20 produktov','20 products'), ['ok', L('zapísané','logged')]]},
        {c:['W28', 'Monika R.', L('Sociálne siete','Social media'), '6 h', L('4 posty','4 posts'), ['ok', L('zapísané','logged')]]},
        {c:['W29', 'Ivana K.', L('Fotenie produktov','Product photography'), '12 h', L('33 ks','33 pcs'), ['ok', L('zapísané','logged')]]},
        {c:['W29', 'Lucia M.', L('Popisky produktov','Product copy'), '11 h', L('26 popiskov','26 descriptions'), ['ok', L('zapísané','logged')]]},
        {c:['W29', 'Zuzana B.', L('Retuš fotiek','Photo retouching'), '10 h', L('64 fotiek','64 photos'), ['ok', L('zapísané','logged')]]},
        {c:['W29', 'Katarína S.', L('Balenie zásielok','Parcel packing'), '8 h', L('152 zásielok','152 parcels'), ['ok', L('zapísané','logged')]]},
        {c:['W29', 'Petra D.', L('Nahrávanie na web','Web uploads'), '7 h', L('19 produktov','19 products'), ['cond', L('2 dni chýbajú','2 days missing')]]},
        {c:['W29', 'Monika R.', L('Sociálne siete','Social media'), '7 h', L('5 postov','5 posts'), ['ok', L('zapísané','logged')]]},
        {c:['W30', 'Ivana K.', L('Fotenie produktov','Product photography'), '11 h', L('31 ks','31 pcs'), ['ok', L('zapísané','logged')]]},
        {c:['W30', 'Lucia M.', L('Popisky produktov','Product copy'), '10 h', L('22 popiskov','22 descriptions'), ['ok', L('zapísané','logged')]]},
        {c:['W30', 'Zuzana B.', L('Retuš fotiek','Photo retouching'), '9 h', L('56 fotiek','56 photos'), ['ok', L('zapísané','logged')]]},
        {c:['W30', 'Katarína S.', L('Balenie zásielok','Parcel packing'), '9 h', L('153 zásielok','153 parcels'), ['ok', L('zapísané','logged')]]},
        {c:['W30', 'Petra D.', L('Nahrávanie na web','Web uploads'), '8 h', L('20 produktov','20 products'), ['ok', L('zapísané','logged')]]},
        {c:['W30', 'Monika R.', L('Sociálne siete','Social media'), '6 h', L('5 postov','5 posts'), ['ok', L('zapísané','logged')]]}
      ],
      note:L('Mesačné súčty (Ivana 46 h, Lucia 41 h, Zuzana 38 h, Katarína 34 h, Petra 30 h, Monika 25 h) a plnenie 79,4 % za jún sú reálne; týždenný rozklad je ukážkový.','Monthly totals (Ivana 46h, Lucia 41h, Zuzana 38h, Katarína 34h, Petra 30h, Monika 25h) and the 79.4% June attainment are real; the weekly breakdown is illustrative.')
    },
    {t:'table', title:L('Projekty — týždenný denník','Projects — weekly log'),
      cols:[L('Týždeň','Week'), L('Projekt','Project'), L('Oddelenie','Department'), L('Plnenie','Progress'), L('Stav','Status')],
      rows:[
        {c:['W27', L('Fotobanka 2026','Photo bank 2026'), L('Fotografka','Photographer'), {pln:20}, ['cond', L('beží','running')]]},
        {c:['W28', L('Fotobanka 2026','Photo bank 2026'), L('Fotografka','Photographer'), {pln:28}, ['cond', L('beží','running')]]},
        {c:['W29', L('Fotobanka 2026','Photo bank 2026'), L('Fotografka','Photographer'), {pln:35}, ['cond', L('beží','running')]]},
        {c:['W30', L('Fotobanka 2026','Photo bank 2026'), L('Fotografka','Photographer'), {pln:44}, ['cond', L('beží','running')]]},
        {c:['W31', L('Fotobanka 2026','Photo bank 2026'), L('Fotografka','Photographer'), {pln:52}, ['cond', L('beží','running')]]},
        {c:['W27', L('KPI rozšírenie','KPI extension'), 'IT', {pln:40}, ['cond', L('beží','running')]]},
        {c:['W28', L('KPI rozšírenie','KPI extension'), 'IT', {pln:50}, ['cond', L('beží','running')]]},
        {c:['W29', L('KPI rozšírenie','KPI extension'), 'IT', {pln:58}, ['cond', L('beží','running')]]},
        {c:['W30', L('KPI rozšírenie','KPI extension'), 'IT', {pln:65}, ['cond', L('beží','running')]]},
        {c:['W31', L('KPI rozšírenie','KPI extension'), 'IT', {pln:71}, ['cond', L('beží','running')]]},
        {c:['W27', L('Import feedov','Feed import'), 'Import', {pln:55}, ['cond', L('beží','running')]]},
        {c:['W28', L('Import feedov','Feed import'), 'Import', {pln:65}, ['cond', L('beží','running')]]},
        {c:['W29', L('Import feedov','Feed import'), 'Import', {pln:74}, ['cond', L('beží','running')]]},
        {c:['W30', L('Import feedov','Feed import'), 'Import', {pln:82}, ['no', L('po termíne','overdue')]]},
        {c:['W31', L('Import feedov','Feed import'), 'Import', {pln:88}, ['no', L('po termíne','overdue')]]},
        {c:['W27', L('Automatizácia newslettera','Newsletter automation'), 'Newsletter-AI', {pln:10}, ['cond', L('beží','running')]]},
        {c:['W28', L('Automatizácia newslettera','Newsletter automation'), 'Newsletter-AI', {pln:18}, ['cond', L('beží','running')]]},
        {c:['W29', L('Automatizácia newslettera','Newsletter automation'), 'Newsletter-AI', {pln:24}, ['cond', L('beží','running')]]},
        {c:['W30', L('Automatizácia newslettera','Newsletter automation'), 'Newsletter-AI', {pln:29}, ['cond', L('beží','running')]]},
        {c:['W31', L('Automatizácia newslettera','Newsletter automation'), 'Newsletter-AI', {pln:34}, ['cond', L('beží','running')]]},
        {c:['W27', L('Sklad — mapa pozícií','Warehouse — location map'), L('Sklad','Warehouse'), {pln:60}, ['cond', L('beží','running')]]},
        {c:['W28', L('Sklad — mapa pozícií','Warehouse — location map'), L('Sklad','Warehouse'), {pln:72}, ['cond', L('beží','running')]]},
        {c:['W29', L('Sklad — mapa pozícií','Warehouse — location map'), L('Sklad','Warehouse'), {pln:82}, ['ok', L('beží','running')]]},
        {c:['W30', L('Sklad — mapa pozícií','Warehouse — location map'), L('Sklad','Warehouse'), {pln:90}, ['ok', L('beží','running')]]},
        {c:['W31', L('Sklad — mapa pozícií','Warehouse — location map'), L('Sklad','Warehouse'), {pln:95}, ['ok', L('pred dokončením','near completion')]]}
      ],
      note:L('5 projektov naviazaných na oddelenia KPI, klik na riadok otvorí oddelenie. Priebeh po týždňoch je ukážkový, koncové hodnoty W31 zodpovedajú prehľadu v module Roadmap.','5 projects tied to KPI departments, click a row to open the department. The weekly progression is illustrative; the W31 end values match the Roadmap module overview.')
    }
  ],
  ai:[
    {q:L('Prečo má denník tri karty?','Why does the log have three tables?'), a:L('Sklad a Externistky sú denníky, ktoré priamo napájajú mesačné plnenie (76,8 % a 79,4 % za jún); Projekty sú súvisiace, ale samostatné — sledujú realizáciu, nie KPI vstup.','Warehouse and Externals are logs that feed directly into monthly attainment (76.8% and 79.4% for June); Projects are related but separate — they track delivery, not the KPI input itself.'), cite:'appka', act:null},
    {q:L('Prečo Petra D. má stav s upozornením?','Why does Petra D. have a warning status?'), a:L('V týždni W29 jej chýbajú 2 dni zápisov — mesačný súčet 30 h je napriek tomu reálny a použitý pri júnovom plnení.','In week W29 she is missing 2 days of entries — the monthly total of 30h is still real and used in the June attainment.'), cite:'appka', act:null},
    {q:L('Ktorý projekt je po termíne?','Which project is overdue?'), a:L('Import feedov — pôvodný termín 31. 7. 2026 padol pri plnení 88 %, projekt pokračuje ako po termíne.','Feed import — the original Jul 31, 2026 deadline was missed at 88% progress; the project continues as overdue.'), cite:'ukážka', act:{l:L('Otvoriť Roadmap projekt','Open Roadmap project'), k:'open'}}
  ]
},
{
  key:'seo', icon:'search', title:L('SEO porada','SEO meeting'),
  sub:L('Vzorka 26 zo 72 otázok reálneho modulu, stav k aktuálnej porade','A sample of 26 of the 72 questions in the real module, status as of the current meeting'),
  blocks:[
    {t:'kpis', items:[
      {l:L('Otázok v module','Questions in the module'), v:'72', sub:L('overený rozsah','verified scope')},
      {l:L('V tejto vzorke','In this sample'), v:'26'},
      {l:L('Zodpovedané','Answered'), v:'15', tone:'ok'},
      {l:L('Otvorené','Open'), v:'11', tone:'cond'}
    ]},
    {t:'table', title:null,
      cols:[L('Skupina','Group'), L('Otázka','Question'), L('Vlastník','Owner'), L('Stav','Status')],
      rows:[
        {c:[L('Obsah','Content'), L('Máme obsahový plán na Q3?','Do we have a Q3 content plan?'), 'Gabika', ['ok', L('Zodpovedané','Answered')]]},
        {c:[L('Obsah','Content'), L('Pokrývajú kategórie long-tail dopyty?','Do categories cover long-tail queries?'), 'Gabika', ['ok', L('Zodpovedané','Answered')]]},
        {c:[L('Obsah','Content'), L('Aktualizujeme staršie blogové články?','Are we refreshing older blog posts?'), 'Gabika', ['cond', L('Otvorené','Open')]]},
        {c:[L('Obsah','Content'), L('Máme obsah pre všetkých 8 jazykových mutácií?','Do we have content for all 8 language versions?'), 'Gabika', ['cond', L('Otvorené','Open')]]},
        {c:[L('Obsah','Content'), L('Sledujeme kanibalizáciu kľúčových slov?','Are we tracking keyword cannibalization?'), 'Gabika', ['ok', L('Zodpovedané','Answered')]]},
        {c:[L('Technika','Technical'), L('Sú Core Web Vitals v zelenom pásme?','Are Core Web Vitals in the green?'), 'Daniel', ['ok', L('Zodpovedané','Answered')]]},
        {c:[L('Technika','Technical'), L('Indexuje Google všetky jazykové mutácie?','Does Google index all language versions?'), 'Daniel', ['cond', L('Otvorené','Open')]]},
        {c:[L('Technika','Technical'), L('Máme správne hreflang tagy?','Are hreflang tags set up correctly?'), 'Daniel', ['ok', L('Zodpovedané','Answered')]]},
        {c:[L('Technika','Technical'), L('Je sitemap.xml aktuálny?','Is sitemap.xml up to date?'), 'Daniel', ['ok', L('Zodpovedané','Answered')]]},
        {c:[L('Technika','Technical'), L('Máme štruktúrované dáta pre kategórie?','Do categories have structured data?'), 'Daniel', ['cond', L('Otvorené','Open')]]},
        {c:['Linkbuilding', L('Rastie počet odkazujúcich domén?','Is the referring-domain count growing?'), 'Gabika', ['ok', L('Zodpovedané','Answered')]]},
        {c:['Linkbuilding', L('Máme plán spoluprác s partnermi?','Do we have a partner outreach plan?'), 'Ema', ['cond', L('Otvorené','Open')]]},
        {c:['Linkbuilding', L('Sledujeme a odmietame toxické odkazy?','Are we monitoring and disavowing toxic links?'), 'Gabika', ['ok', L('Zodpovedané','Answered')]]},
        {c:['Linkbuilding', L('Máme prehľad o odkazoch konkurencie?','Do we track competitor backlinks?'), 'Gabika', ['cond', L('Otvorené','Open')]]},
        {c:[L('AI-vyhľadávanie','AI search'), L('Zobrazujeme sa v AI Overviews?','Do we appear in AI Overviews?'), 'Gabika', ['cond', L('Otvorené','Open')]]},
        {c:[L('AI-vyhľadávanie','AI search'), L('Máme štruktúrované dáta pre produkty?','Do products have structured data?'), 'Daniel', ['ok', L('Zodpovedané','Answered')]]},
        {c:[L('AI-vyhľadávanie','AI search'), L('Meriame návštevnosť z AI asistentov?','Do we measure traffic from AI assistants?'), 'Ema', ['cond', L('Otvorené','Open')]]},
        {c:[L('AI-vyhľadávanie','AI search'), L('Testovali sme, ako nás cituje ChatGPT/Gemini?','Have we tested how ChatGPT/Gemini cite us?'), 'Gabika', ['cond', L('Otvorené','Open')]]},
        {c:[L('Konkurencia','Competitors'), L('Sledujeme pozície top 3 konkurentov denne?','Do we track the top 3 competitors’ positions daily?'), 'Gabika', ['ok', L('Zodpovedané','Answered')]]},
        {c:[L('Konkurencia','Competitors'), L('Vieme, prečo konkurent výrazne narástol?','Do we know why a competitor grew sharply?'), 'Gabika', ['ok', L('Zodpovedané','Answered')]]},
        {c:[L('Konkurencia','Competitors'), L('Máme porovnanie Domain Rating s hlavným konkurentom?','Do we compare Domain Rating with the main competitor?'), 'Gabika', ['ok', L('Zodpovedané','Answered')]]},
        {c:[L('Konkurencia','Competitors'), L('Analyzujeme obsahové medzery voči konkurencii?','Do we analyze content gaps vs competitors?'), 'Gabika', ['cond', L('Otvorené','Open')]]},
        {c:[L('Meranie','Measurement'), L('Máme napojený Rank Tracker na aktuálne KW?','Is Rank Tracker connected to current KWs?'), 'Gabika', ['cond', L('Otvorené','Open')]]},
        {c:[L('Meranie','Measurement'), L('Je GSC prepojené so všetkými doménovými mutáciami?','Is GSC connected for all domain versions?'), 'Daniel', ['ok', L('Zodpovedané','Answered')]]},
        {c:[L('Meranie','Measurement'), L('Meriame brand vs non-brand dopyty oddelene?','Do we measure brand vs non-brand queries separately?'), 'Gabika', ['ok', L('Zodpovedané','Answered')]]},
        {c:[L('Meranie','Measurement'), L('Máme dohodnutý spôsob vyhodnotenia zmien URL?','Do we have an agreed way to evaluate URL changes?'), 'Gabika', ['ok', L('Zodpovedané','Answered')]]}
      ],
      note:L('Kategórie a rozsah 72 otázok sú overená funkcia appky (SEO porada modul). Konkrétne otázky, vlastníci a stavy v tejto vzorke sú ukážkové.','The categories and the 72-question scope are a verified app feature (SEO meeting module). The specific questions, owners and statuses in this sample are illustrative.'),
      page:true
    },
    {t:'banner', tone:'cond', text:L('11 z 26 otázok vo vzorke je otvorených — najviac v skupinách Meranie a AI-vyhľadávanie.','11 of the 26 sampled questions are open — most in the Measurement and AI search groups.')}
  ],
  ai:[
    {q:L('Koľko otázok obsahuje modul spolu?','How many questions does the module contain in total?'), a:L('72 otázok v 6 skupinách — táto obrazovka zobrazuje vzorku 26. Rozsah 72 je overená funkcia appky.','72 questions across 6 groups — this screen shows a 26-question sample. The scope of 72 is a verified app feature.'), cite:'appka', act:null},
    {q:L('Kto rieši najviac otázok?','Who handles the most questions?'), a:L('Gabika — vo vzorke má 18 z 26 riadkov, ostatné patria Danielovi (technika) a Eme (partnerstvá, meranie).','Gabika — she has 18 of the 26 sampled rows, the rest belong to Daniel (technical) and Ema (partnerships, measurement).'), cite:'ukážka', act:null},
    {q:L('Napája sa táto obrazovka na Copywriter KPI?','Does this screen feed into Copywriter KPI?'), a:L('Nie priamo — SEO porada je kvalitatívny modul porady, kým Copywriter KPI berie čísla (Top100 KW, CTR) automaticky zo SEO appky cez samostatnú integráciu.','Not directly — the SEO meeting is a qualitative discussion module, while Copywriter KPI pulls numbers (Top100 KWs, CTR) automatically from the SEO app via a separate integration.'), cite:'appka', act:{l:L('Otvoriť Integrácie','Open Integrations'), k:'open'}}
  ]
},
{
  key:'integracie', icon:'swap', title:L('Integrácie','Integrations'),
  sub:L('Read-only napojenie na Logistiku (zásielky, reklamácie) a SEO appku (Copywriter KPI) s graceful fallback','Read-only connection to Logistics (shipments, claims) and the SEO app (Copywriter KPI) with a graceful fallback'),
  blocks:[
    {t:'kpis', items:[
      {l:L('Aktívne integrácie','Active integrations'), v:'2', sub:'Logistika · SEO'},
      {l:L('Posledná synchronizácia','Last sync'), v:L('pred 6 min','6 min ago')},
      {l:L('Priemerná odozva','Avg latency'), v:'210 ms'},
      {l:'Fallback', v:L('zapnutý','on'), tone:'ok'}
    ]},
    {t:'cards', n:2, items:[
      {title:'Aura Logistika', sub:L('Zásielky a reklamácie oddelení Expedícia + Reklamácie','Shipments & claims for Dispatch + Claims'), badge:['ok',L('pripojené','connected')],
        lines:[[L('Endpoint','Endpoint'),'/api/v1/shipments, /api/v1/claims'], [L('Smer','Direction'), L('len na čítanie','read-only')], [L('Sync','Sync'), L('pred 6 min','6 min ago')]],
        chips:[L('Expedícia','Dispatch'), L('Reklamácie','Claims')]},
      {title:L('SEO appka','SEO app'), sub:L('Copywriter KPI — Top100 KW, hustota, CTR','Copywriter KPI — Top100 KWs, density, CTR'), badge:['ok',L('pripojené','connected')],
        lines:[[L('Endpoint','Endpoint'),'/api/v1/seo'], [L('Smer','Direction'), L('len na čítanie','read-only')], [L('Sync','Sync'), L('pred 6 min','6 min ago')]],
        chips:['Copywriter']}
    ]},
    {t:'table', title:L('Mapovanie polí','Field mapping'),
      cols:[L('Zdrojová appka','Source app'), L('Pole','Field'), L('Cieľové oddelenie','Target department'), L('Cieľová metrika','Target metric')],
      rows:[
        {c:['Logistika', L('čas do odoslania (h)','time to dispatch (h)'), L('Expedícia','Dispatch'), L('čas do odoslania','time to dispatch')]},
        {c:['Logistika', L('chybné expedície (%)','failed dispatches (%)'), L('Expedícia','Dispatch'), L('chybné expedície','failed dispatches')]},
        {c:['Logistika', L('vyriešené prípady (%)','resolved cases (%)'), L('Reklamácie','Claims'), L('vyriešenosť','resolution rate')]},
        {c:['Logistika', 'SLA 5 dní', L('Reklamácie','Claims'), 'SLA 5 dní']},
        {c:[L('SEO appka','SEO app'), 'Top100 KW v TOP3', 'Copywriter', L('Top 100 KW v TOP 3','Top 100 KWs in TOP 3')]},
        {c:[L('SEO appka','SEO app'), L('hustota KW 1–3','KW density 1–3'), 'Copywriter', L('hustota KW','KW density')]},
        {c:[L('SEO appka','SEO app'), 'CTR', 'Copywriter', 'CTR']}
      ],
      note:L('Mapovanie je overená funkcia appky (integrácie Logistika + SEO, read-only, graceful fallback). Konkrétne hodnoty polí sú ukážkové.','The mapping is a verified app feature (Logistics + SEO integrations, read-only, graceful fallback). Specific field values are illustrative.')
    },
    {t:'banner', tone:'cond', text:L('Graceful fallback: keď je zdrojová appka nedostupná, KPI appka zobrazí poslednú známu hodnotu s časovou značkou namiesto pádu obrazovky.','Graceful fallback: when the source app is unreachable, the KPI app shows the last known value with a timestamp instead of the screen failing.')}
  ],
  ai:[
    {q:L('Čo sa stane, keď Logistika appka spadne?','What happens if the Logistics app goes down?'), a:L('KPI appka nezobrazí chybu — použije poslednú známu synchronizovanú hodnotu a označí ju časovou značkou (graceful fallback, overená funkcia).','The KPI app doesn’t show an error — it uses the last known synced value and timestamps it (graceful fallback, a verified feature).'), cite:'appka', act:null},
    {q:L('Prečo je integrácia len na čítanie?','Why is the integration read-only?'), a:L('KPI appka nemá zapisovací prístup do Logistiky ani SEO appky — číta hodnoty cez read-only DB usera, aby zmena v KPI nikdy neovplyvnila zdrojovú appku.','The KPI app has no write access to Logistics or the SEO app — it reads via a read-only DB user, so a KPI-side change can never affect the source app.'), cite:'pamäť', act:null},
    {q:L('Ktoré oddelenie má automatický vstup?','Which department has an automatic input?'), a:L('Copywriter (zo SEO appky) a čiastočne Expedícia + Reklamácie (z Logistiky). Ostatné oddelenia vypĺňajú vstupy ručne.','Copywriter (from the SEO app) and partially Dispatch + Claims (from Logistics). Other departments fill inputs manually.'), cite:'appka', act:{l:L('Otvoriť Oddelenie','Open Department'), k:'open'}}
  ]
},
{
  key:'audit', icon:'shield', title:L('Audit','Audit'),
  sub:L('Neupraviteľný záznam akcií v appke — prihlásenia, uzávierky, vstupy, exporty, práva','An append-only record of app actions — logins, closes, inputs, exports, permissions'),
  blocks:[
    {t:'kpis', items:[
      {l:L('Záznamov spolu','Total records'), v:L('1 240','1,240'), sub:L('ukážka','illustrative')},
      {l:L('Za posledných 24 h','Last 24h'), v:'18'},
      {l:L('Neúspešné prihlásenia','Failed logins'), v:'1', tone:'cond'},
      {l:L('Exporty tento mesiac','Exports this month'), v:'2'}
    ]},
    {t:'table', title:null,
      cols:[L('Čas','Time'), L('Používateľ','User'), L('Akcia','Action'), L('Entita','Entity'), L('Detail','Detail')],
      rows:[
        {c:[L('11. 7. 09:02','Jul 11, 09:02'), 'system', L('Mesiac uzavretý','Month closed'), L('Copywriter (jún)','Copywriter (June)'), L('plnenie 100 %','100% attainment')]},
        {c:[L('11. 7. 09:02','Jul 11, 09:02'), 'system', ['no', L('Po termíne','Overdue')], L('Fotografka (jún)','Photographer (June)'), L('uzávierka zmeškaná','close missed')]},
        {c:[L('11. 7. 09:02','Jul 11, 09:02'), 'system', ['no', L('Po termíne','Overdue')], L('Hospodársky (jún)','Business (June)'), L('uzávierka zmeškaná','close missed')]},
        {c:[L('11. 7. 09:02','Jul 11, 09:02'), 'system', ['no', L('Po termíne','Overdue')], L('IT (jún)','IT (June)'), L('uzávierka zmeškaná','close missed')]},
        {c:[L('10. 7. 16:40','Jul 10, 16:40'), 'copywriter@sperky-aura.sk', L('Vstup upravený','Input edited'), 'Copywriter', 'CTR 2 %']},
        {c:[L('10. 7. 14:12','Jul 10, 14:12'), 'admin@sperky-aura.sk', L('Export xlsx','xlsx export'), L('Mesačný report','Monthly report'), L('jún 2026','June 2026')]},
        {c:[L('9. 7. 11:05','Jul 9, 11:05'), 'nahravanie@sperky-aura.sk', L('Mesiac uzavretý','Month closed'), L('Nahrávanie (jún)','Uploads (June)'), L('plnenie 88,5 %','88.5% attainment')]},
        {c:[L('8. 7. 10:30','Jul 8, 10:30'), 'performance@sperky-aura.sk', L('Mesiac uzavretý','Month closed'), L('Performance (jún)','Performance (June)'), L('plnenie 87,2 %','87.2% attainment')]},
        {c:[L('3. 7. 15:20','Jul 3, 15:20'), 'copywriter@sperky-aura.sk', L('Vstup pridaný','Input added'), 'Copywriter', L('hustota KW 250','KW density 250')]},
        {c:[L('2. 7. 09:15','Jul 2, 09:15'), 'admin@sperky-aura.sk', L('Zmena hesla','Password change'), 'admin@sperky-aura.sk', L('self-service','self-service')]},
        {c:[L('1. 8. 08:44','Aug 1, 08:44'), 'system', L('Pripomienka e-mailom','E-mail reminder'), 'Newsletter-AI', L('uzávierka o 9 dní','close in 9 days')]},
        {c:[L('1. 8. 08:44','Aug 1, 08:44'), 'system', L('Pripomienka e-mailom','E-mail reminder'), L('Reklamácie','Claims'), L('uzávierka o 9 dní','close in 9 days')]},
        {c:[L('31. 7. 17:02','Jul 31, 17:02'), 'import@sperky-aura.sk', L('Import CSV','CSV import'), L('Import (júl)','Import (July)'), L('4 riadky upsert','4 rows upserted')]},
        {c:[L('31. 7. 17:02','Jul 31, 17:02'), 'system', L('Chyba importu','Import error'), L('Import (júl)','Import (July)'), L('1 riadok odmietnutý — neplatná hodnota','1 row rejected — invalid value')]},
        {c:[L('30. 7. 09:40','Jul 30, 09:40'), 'sklad@sperky-aura.sk', L('Vstup pridaný','Input added'), L('Sklad','Warehouse'), L('inventúrny rozdiel −1','inventory delta −1')]},
        {c:[L('29. 7. 09:12','Jul 29, 09:12'), 'sklad@sperky-aura.sk', L('Vstup pridaný','Input added'), L('Sklad','Warehouse'), L('inventúrny rozdiel −2','inventory delta −2')]},
        {c:[L('28. 7. 09:05','Jul 28, 09:05'), 'sklad@sperky-aura.sk', L('Vstup pridaný','Input added'), L('Sklad','Warehouse'), L('vyskladnené 388','picked 388')]},
        {c:[L('27. 7. 09:00','Jul 27, 09:00'), 'sklad@sperky-aura.sk', L('Vstup pridaný','Input added'), L('Sklad','Warehouse'), L('vyskladnené 412','picked 412')]},
        {c:[L('26. 7. 13:20','Jul 26, 13:20'), 'admin@sperky-aura.sk', L('Rola zmenená','Role changed'), 'hajnalka@sperky-aura.sk', L('Editor → Prehliadač','Editor → Viewer')]},
        {c:[L('24. 7. 10:11','Jul 24, 10:11'), 'externistky@sperky-aura.sk', L('Vstup pridaný','Input added'), L('Externistky','Externals'), L('júlové hodiny','July hours')]},
        {c:[L('21. 7. 09:30','Jul 21, 09:30'), 'admin@sperky-aura.sk', L('Vytvorený účet','Account created'), 'fotografka@sperky-aura.sk', L('Editor, Fotografka','Editor, Photographer')]},
        {c:[L('15. 7. 08:50','Jul 15, 08:50'), 'system', L('Prihlásenie zlyhalo','Login failed'), 'it@sperky-aura.sk', L('nesprávne heslo (3. pokus)','wrong password (3rd attempt)')]},
        {c:[L('15. 7. 08:52','Jul 15, 08:52'), 'it@sperky-aura.sk', L('Prihlásenie','Login'), 'it@sperky-aura.sk', L('úspešné','successful')]},
        {c:[L('12. 7. 12:00','Jul 12, 12:00'), 'admin@sperky-aura.sk', L('Export xlsx','xlsx export'), L('Ročný report','Yearly report'), '2025 vs 2026']},
        {c:[L('5. 7. 09:00','Jul 5, 09:00'), 'admin@sperky-aura.sk', L('Nastavenie zmenené','Setting changed'), L('Hospodársky — prístup','Business — access'), L('obmedzené na Admin + manažment','restricted to Admin + management')]},
        {c:[L('1. 7. 00:05','Jul 1, 00:05'), 'system', L('Mesiac otvorený','Month opened'), L('všetky oddelenia (júl 2026)','all departments (July 2026)'), '12']}
      ],
      note:L('Audit log je append-only (žiadne mazanie ani prepis). Uzávierky a status Po termíne sú overená logika appky, konkrétne časy a mená sú ukážkové.','The audit log is append-only (no deletion or overwrite). Closes and the Overdue status are verified app logic; specific times and names are illustrative.'),
      page:true
    },
    {t:'banner', tone:'info', text:L('Záznam sa nedá zmazať ani upraviť — jediný spôsob opravy chyby je nový záznam s vysvetlením.','A record cannot be deleted or edited — the only way to correct a mistake is a new record with an explanation.')}
  ],
  ai:[
    {q:L('Dá sa audit záznam vymazať?','Can an audit record be deleted?'), a:L('Nie — log je append-only. Oprava chyby ide len cez nový záznam, pôvodný zostáva viditeľný.','No — the log is append-only. A mistake is corrected only via a new record; the original stays visible.'), cite:'appka', act:null},
    {q:L('Kto zmenil prístup k Hospodárskemu?','Who changed access to Business/finance?'), a:L('admin@sperky-aura.sk, 5. 7. 2026 — nastavenie obmedzilo viditeľnosť na Admin a manažment.','admin@sperky-aura.sk, Jul 5, 2026 — the setting restricted visibility to Admin and management.'), cite:'ukážka', act:{l:L('Otvoriť Nastavenia','Open Settings'), k:'open'}},
    {q:L('Prečo je v logu chyba importu?','Why is there an import error in the log?'), a:L('CSV import 31. 7. mal 5 riadkov, appka prijala 4 a 1 odmietla pre neplatnú hodnotu — presne to demonštruje aj import wizard s toleranciou 5 %.','The Jul 31 CSV import had 5 rows; the app accepted 4 and rejected 1 for an invalid value — the same behaviour the import wizard demonstrates with its 5% tolerance.'), cite:'appka', act:{l:L('Otvoriť Import','Open Import'), k:'open'}}
  ]
},
{
  key:'nastavenia', icon:'gear', title:L('Nastavenia','Settings'),
  sub:L('Roly Admin/Editor/Prehliadač, M:N práva na oddelenia a obmedzený prístup k Hospodárskemu','Admin/Editor/Viewer roles, M:N department rights and restricted access to Business/finance'),
  blocks:[
    {t:'table', title:L('Roly','Roles'),
      cols:[L('Rola','Role'), L('Vidí','Sees'), L('Upravuje vstupy','Edits inputs'), L('Uzatvára mesiac','Closes month'), L('Exportuje','Exports')],
      rows:[
        {c:['Admin', L('všetky oddelenia vrátane Hospodárskeho','all departments incl. Business/finance'), L('áno','yes'), L('áno','yes'), L('áno','yes')]},
        {c:['Editor', L('len priradené oddelenia (M:N)','only assigned departments (M:N)'), L('áno, na priradených','yes, on assigned'), L('áno, na priradených','yes, on assigned'), L('áno, na priradených','yes, on assigned')]},
        {c:[L('Prehliadač','Viewer'), L('len priradené oddelenia (M:N)','only assigned departments (M:N)'), L('nie','no'), L('nie','no'), L('áno, len na čítanie','yes, read-only')]}
      ],
      note:L('Roly a M:N model práv sú overená funkcia appky.','Roles and the M:N rights model are a verified app feature.')
    },
    {t:'table', title:L('Používatelia a priradené oddelenia','Users and assigned departments'),
      cols:[L('Používateľ','User'), L('Rola','Role'), L('Priradené oddelenia','Assigned departments')],
      rows:[
        {c:['admin@sperky-aura.sk', 'Admin', L('všetky (12/12)','all (12/12)')]},
        {c:['copywriter@sperky-aura.sk', 'Editor', 'Copywriter']},
        {c:['nahravanie@sperky-aura.sk', 'Editor', L('Nahrávanie','Uploads')]},
        {c:['performance@sperky-aura.sk', 'Editor', 'Performance']},
        {c:['newsletter@sperky-aura.sk', 'Editor', 'Newsletter-AI']},
        {c:['foto@sperky-aura.sk', 'Editor', L('Fotografka','Photographer')]},
        {c:['externistky@sperky-aura.sk', 'Editor', L('Externistky','Externals')]},
        {c:['import@sperky-aura.sk', 'Editor', 'Import']},
        {c:['sklad@sperky-aura.sk', 'Editor', L('Sklad','Warehouse')]},
        {c:['expedicia@sperky-aura.sk', 'Editor', L('Expedícia','Dispatch')]},
        {c:['reklamacie@sperky-aura.sk', 'Editor', L('Reklamácie','Claims')]},
        {c:['it@sperky-aura.sk', 'Editor', 'IT']},
        {c:['hajnalka@sperky-aura.sk', L('Prehliadač','Viewer'), L('Reklamácie, Externistky','Claims, Externals')]}
      ],
      note:L('Hospodársky nemá žiadny Editor účet — jediný prístup je cez rolu Admin. Hajnalka je príklad M:N práv na dve oddelenia naraz. Priradenia sú ukážkové.','Business/finance has no Editor account — the only access is via the Admin role. Hajnalka is an example of M:N rights across two departments at once. Assignments are illustrative.'),
      page:true
    },
    {t:'form', title:L('Vzhľad a jazyk','Appearance & language'),
      fields:[
        {l:'Dark mode', s:L('Predvolená tmavá téma','Dark theme by default'), type:'switch', on:true},
        {l:L('Jazyk','Language'), s:'SK · EN', type:'select', v:'SK', opts:['SK','EN']},
        {l:L('Zmena hesla','Change password'), s:L('Self-service pre každý účet','Self-service for every account'), type:'text', v:L('Zmeniť','Change')}
      ]
    },
    {t:'banner', tone:'info', text:L('Hospodársky má obmedzený prístup — vidí ho len rola Admin a manažment, bez samostatného Editor účtu.','Business/finance has restricted access — only the Admin role and management can see it, with no separate Editor account.')}
  ],
  ai:[
    {q:L('Kto vidí oddelenie Hospodársky?','Who can see the Business/finance department?'), a:L('Len rola Admin a manažment; neexistuje preň žiadny Editor účet, na rozdiel od ostatných 11 oddelení.','Only the Admin role and management; no Editor account exists for it, unlike the other 11 departments.'), cite:'appka', act:null},
    {q:L('Môže Prehliadač upravovať vstupy?','Can a Viewer edit inputs?'), a:L('Nie, len číta a exportuje. Príklad: Hajnalka má rolu Prehliadač na oddelenia Reklamácie a Externistky.','No, only read and export. Example: Hajnalka has the Viewer role on the Claims and Externals departments.'), cite:'appka', act:null},
    {q:L('Ako fungujú M:N práva?','How do M:N rights work?'), a:L('Jeden používateľ môže mať priradených viac oddelení a jedno oddelenie môže mať viac používateľov — napríklad Hajnalka má prístup na dve oddelenia naraz.','One user can have several departments assigned and one department can have several users — for example Hajnalka has access to two departments at once.'), cite:'appka', act:null}
  ]
}
  ]
};
