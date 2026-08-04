const APP_TRZBY = {
  key:'trzby', name:'Aura Tržby', port:'3050', icon:'coins',
  tag:L('E-shop report tržieb — mesačné a týždenné čísla, trhy, produkty, koše a expedícia z e-shop exportov.','E-shop revenue report — monthly and weekly figures, markets, products, baskets and dispatch from e-shop exports.'),
  feat:[
    L('Overené čísla za júl 2026 (5 679 objednávok) rozpísané po trhoch, produktoch, hodinách a košoch','Verified July 2026 figures (5,679 orders) broken down by market, product, hour and basket'),
    L('Import objednávok z e-shop CSV s upsertom podľa čísla objednávky','Order import from the e-shop CSV with upsert by order number'),
    L('Report builder pre mesačný report tržieb, report trhov a report marže','Report builder for the monthly revenue report, market report and margin report')
  ],
  live:{v:L('217 016 € tržba · 126 541 € zisk (overené, júl 2026)','€217,016 revenue · €126,541 profit (verified, July 2026)'), tone:'ok', spark:[6.47,7.02,7.18,6.89,7.24,5.01,5.62]},

  api:{
    endpoints:[
      {k:'orders',  l:L('Objednávky','Orders'),   ms:142},
      {k:'stats',   l:L('Štatistiky','Stats'),    ms:184},
      {k:'shipping',l:L('Doprava','Shipping'),    ms:205}
    ],
    sync:L('pred 3 min','3 min ago'), tone:'ok'
  },

  imp:{
    target:'objednavky',
    cols:[
      {k:'cislo',  l:L('Č. objednávky','Order no.'), t:'text'},
      {k:'datum',  l:L('Dátum','Date'), t:'text'},
      {k:'trh',    l:L('Trh','Market'), t:'text'},
      {k:'hodnota',l:L('Hodnota','Value'), t:'num'},
      {k:'doprava',l:L('Doprava','Shipping'), t:'num'},
      {k:'platba', l:L('Platba','Payment'), t:'text'},
      {k:'stav',   l:L('Stav','Status'), t:'text'}
    ],
    key:[L('kľúč upsertu: č. objednávky (unikátne)','upsert key: order number (unique)')],
    csv:'cislo;datum;trh;hodnota;doprava;platba;stav\nSK-20260701-014;2026-07-01;SK;42,50;3,90;dobierka;Tovar odoslaný\nHU-20260701-032;2026-07-01;HU;38,10;0;karta;Doručené\nRO-20260702-009;2026-07-02;RO;61,20;3,90;dobierka;Tovar odoslaný\nCZ-20260703-018;prilis vela dat;CZ;27,80;2,90;prevod;Nová\nPL-20260704-005;2026-07-04;PL;55,00;3,90;dobierka;Zrušená\nSK-20260705-021;2026-07-05;SK;19,90;2,90;karta;Doručené'
  },

  rep:{
    templates:[
      {k:'mesacny', l:L('Mesačný report tržieb','Monthly revenue report'), s:L('KPI strip + denný graf + tabuľka mesiacov','KPI strip + daily chart + monthly table')},
      {k:'trhy',    l:L('Report trhov','Markets report'),                 s:L('Podiel tržby, AOV a vrátky po trhoch','Revenue share, AOV and returns by market')},
      {k:'marza',   l:L('Report marže','Margin report'),                  s:L('Marža podľa segmentov + definície výpočtu','Margin by segment + calculation definitions')}
    ]
  },

  screens:[

    /* ============ 1. PREHĽAD ============ */
    {key:'prehlad', icon:'grid', title:L('Prehľad','Overview'),
      sub:L('Súhrn júla 2026 — tržba, zisk, marža a najdôležitejšie zistenia','July 2026 summary — revenue, profit, margin and the key findings'),
      blocks:[
        {t:'kpis', items:[
          {l:L('Tržba','Revenue'), v:cur(217016), sub:L('run-rate 31 dní: 250 822 €','31-day run-rate: €250,822'), tone:'ok', live:true},
          {l:L('Zisk','Profit'), v:cur(126541), sub:L('58,3 % z tržby','58.3% of revenue'), tone:'ok', live:true},
          {l:L('Marža','Margin'), v:'66,1 %', sub:L('zlato 54,6 % vs ostatné 77,4 %','gold 54.6% vs others 77.4%'), tone:'cond', live:true},
          {l:'AOV', v:cur(38.21), sub:L('medián koša 25,41 €','basket median €25.41'), tone:'ok', live:true}
        ]},
        {t:'donut', title:L('Expedícia do 24 h','Dispatch within 24h'), pct:69.6, label:L('objednávok do 24 h','of orders within 24h'),
          note:L('overené — 69,6 % do 24 h, medián 18,7 h (júl 2026). Detail na obrazovke Expedícia.','verified — 69.6% within 24h, median 18.7h (July 2026). Detail on the Dispatch screen.')},
        {t:'list', title:L('Zistenia','Findings'), items:[
          {title:L('Týždeň 30 klesol o −18,2 %','Week 30 dropped −18.2%'), sub:L('64 033 € → 52 384 € (t29 → t30)','€64,033 → €52,384 (w29 → w30)'), badge:['no',L('overené','verified')]},
          {title:L('Zlato = 49,8 % tržby pri 22,4 % objednávok','Gold = 49.8% of revenue at 22.4% of orders'), sub:L('marža zlata 54,6 % vs ostatné 77,4 %','gold margin 54.6% vs others 77.4%'), badge:['cond',L('overené','verified')]},
          {title:L('Opakovaní zákazníci = 44,2 % objednávok','Repeat customers = 44.2% of orders'), sub:L('45,6 % tržby od vracajúcich sa','45.6% of revenue from repeat buyers'), badge:['ok',L('overené','verified')]}
        ], note:L('Zdroj: e-shop export stats (júl 2026, 5 679 objednávok).','Source: e-shop stats export (July 2026, 5,679 orders).')},
        {t:'banner', tone:'cond', text:L('Sobota je systematicky najslabší deň — 5 774 € vs Ø plný deň 8 091 € (overené). Detail na obrazovke Hodiny a dni.','Saturday is systematically the weakest day — €5,774 vs €8,091 average full day (verified). Detail on the Hours & days screen.')}
      ],
      ai:[
        {q:L('Aká bola tržba a zisk v júli 2026?','What was July 2026 revenue and profit?'),
         a:L('Tržba za 1.–27. júl 2026 bola 217 016 € pri zisku 126 541 € (58,3 % z tržby) a marži 66,1 %. Run-rate na celých 31 dní je 250 822 €. Ide o 5 679 objednávok.','July 1–27, 2026 revenue was €217,016 with profit of €126,541 (58.3% of revenue) and a margin of 66.1%. The 31-day run-rate is €250,822. This covers 5,679 orders.'),
         cite:'pamäť', act:{l:L('Otvoriť definície','Open definitions'), k:'open'}},
        {q:L('Prečo klesol týždeň 30?','Why did week 30 drop?'),
         a:L('Tržba v týždni 30 klesla o −18,2 % oproti týždňu 29 (64 033 € → 52 384 €). Presná príčina poklesu nie je v dátach rozpísaná — treba porovnať s marketingovým spendom a sezónnosťou daného obdobia.','Week 30 revenue dropped −18.2% versus week 29 (€64,033 → €52,384). The exact cause is not broken out in the data — compare against marketing spend and seasonality for that period.'),
         cite:'pamäť', act:{l:L('Otvoriť týždne','Open weeks'), k:'filter'}},
        {q:L('Aký je podiel zlata na tržbe?','What is gold\'s share of revenue?'),
         a:L('Zlato tvorí 22,4 % objednávok, no až 49,8 % tržby, pri nižšej marži 54,6 % oproti 77,4 % pri ostatných kovoch. Ide teda o objemovo malý, ale hodnotovo dominantný a menej ziskový segment.','Gold accounts for 22.4% of orders but 49.8% of revenue, at a lower margin of 54.6% versus 77.4% for other metals. It is a small-volume but value-dominant and less profitable segment.'),
         cite:'pamäť', act:{l:L('Otvoriť produkty','Open products'), k:'filter'}}
      ]
    },

    /* ============ 2. MESIAC ============ */
    {key:'mesiac', icon:'cal', title:L('Mesiace','Months'),
      sub:L('Posledných 12 mesiacov — tržba, zisk, marža a AOV. Overený je len júl 2026, ostatné mesiace sú ukážkové na tvar trendu.','Last 12 months — revenue, profit, margin and AOV. Only July 2026 is verified; other months are illustrative for trend shape.'),
      blocks:[
        {t:'lines', title:L('Tržba a zisk po mesiacoch','Revenue and profit by month'),
          labels:['Aug','Sep','Okt','Nov','Dec','Jan','Feb','Mar','Apr','Máj','Jún','Júl'],
          series:[
            {l:L('Tržba','Revenue'), v:[152400,148200,164800,210500,244900,178300,182600,195100,187900,201400,208700,217016], color:'var(--acc)'},
            {l:L('Zisk','Profit'),   v:[88392,85956,95584,122090,142042,103414,105908,113158,108982,116812,121046,126541], color:'var(--good)'}
          ], avg:false,
          note:L('júl 2026 (217 016 € / 126 541 €) je overený z e-shop exportu, predchádzajúcich 11 mesiacov je ukážkových na ilustráciu sezónneho tvaru (Vianoce = špička).','July 2026 (€217,016 / €126,541) is verified from the e-shop export; the preceding 11 months are illustrative to show the seasonal shape (Christmas peak).')},
        {t:'lines', title:L('Marža po mesiacoch','Margin by month'),
          labels:['Aug','Sep','Okt','Nov','Dec','Jan','Feb','Mar','Apr','Máj','Jún','Júl'],
          series:[{l:L('Marža','Margin'), v:[61.2,60.5,62.8,65.4,67.9,63.1,63.8,64.5,63.9,64.7,65.5,66.1], color:'var(--amber)'}],
          avg:true, note:L('júl 66,1 % overený, ostatné mesiace ukážkové.','July 66.1% verified, other months illustrative.')},
        {t:'table', title:L('Mesačná tabuľka','Monthly table'),
          cols:[L('Mesiac','Month'),L('Tržba','Revenue'),L('Zisk','Profit'),L('Marža','Margin'),'AOV',L('Pozn.','Note')],
          rows:[
            {c:['Aug 2025',cur(152400),cur(88392),'61,2 %',cur(34.80),['info',L('ukážka','sample')]]},
            {c:['Sep 2025',cur(148200),cur(85956),'60,5 %',cur(34.20),['info',L('ukážka','sample')]]},
            {c:['Okt 2025',cur(164800),cur(95584),'62,8 %',cur(35.60),['info',L('ukážka','sample')]]},
            {c:['Nov 2025',cur(210500),cur(122090),'65,4 %',cur(39.90),['info',L('ukážka','sample')]]},
            {c:['Dec 2025',cur(244900),cur(142042),'67,9 %',cur(41.20),['info',L('ukážka','sample')]]},
            {c:['Jan 2026',cur(178300),cur(103414),'63,1 %',cur(35.10),['info',L('ukážka','sample')]]},
            {c:['Feb 2026',cur(182600),cur(105908),'63,8 %',cur(35.40),['info',L('ukážka','sample')]]},
            {c:['Mar 2026',cur(195100),cur(113158),'64,5 %',cur(36.20),['info',L('ukážka','sample')]]},
            {c:['Apr 2026',cur(187900),cur(108982),'63,9 %',cur(35.80),['info',L('ukážka','sample')]]},
            {c:['Máj 2026',cur(201400),cur(116812),'64,7 %',cur(36.90),['info',L('ukážka','sample')]]},
            {c:['Jún 2026',cur(208700),cur(121046),'65,5 %',cur(37.50),['info',L('ukážka','sample')]]},
            {c:['Júl 2026',cur(217016),cur(126541),'66,1 %',cur(38.21),['ok',L('overené','verified')]]}
          ],
          note:L('Len riadok Júl 2026 je overený z e-shop exportu stats (5 679 objednávok, 1.–27. 7.). Ostatné riadky sú ukážkové.','Only the July 2026 row is verified from the e-shop stats export (5,679 orders, Jul 1–27). Other rows are illustrative.'),
          page:true}
      ],
      ai:[
        {q:L('Ktorý mesiac mal najvyššiu tržbu?','Which month had the highest revenue?'),
         a:L('V tejto ukážkovej 12-mesačnej rade má najvyššiu tržbu december (244 900 €, sezónna špička), no overený je len júl 2026 s 217 016 €. Pre reálne porovnanie by bolo treba doplniť exporty za ostatné mesiace.','In this illustrative 12-month series December has the highest revenue (€244,900, seasonal peak), but only July 2026 at €217,016 is verified. A real comparison would require exports for the other months.'),
         cite:'ukážka', act:null},
        {q:L('Ako sa vyvíjala marža počas roka?','How did margin trend through the year?'),
         a:L('V ukážkovej rade sa marža pohybuje medzi 60,5 % a 67,9 %, s júlom 2026 na 66,1 % (overené). Trend má sezónny tvar, presné hodnoty mimo júla treba brať len orientačne.','In the illustrative series margin ranges from 60.5% to 67.9%, with July 2026 at 66.1% (verified). The trend has a seasonal shape; exact values outside July should be read only as illustrative.'),
         cite:'pamäť', act:null},
        {q:L('Aký je rozdiel medzi tržbou a ziskom v tabuľke?','What is the difference between revenue and profit in the table?'),
         a:L('Zisk = marža mínus doprava a priame poplatky, nie čistý zisk (chýba marketing, mzdy, réžia). Podrobná definícia je na obrazovke Definície.','Profit = margin minus shipping and direct fees, not net profit (excludes marketing, payroll, overhead). The full definition is on the Definitions screen.'),
         cite:'appka', act:{l:L('Otvoriť definície','Open definitions'), k:'open'}}
      ]
    },

    /* ============ 3. TÝŽDNE ============ */
    {key:'tyzdne', icon:'trend', title:L('Týždne','Weeks'),
      sub:L('ISO týždne W20–W31 — tržba, zisk a objednávky. Pokles W29→W30 (−18,2 %) je overený.','ISO weeks W20–W31 — revenue, profit and orders. The W29→W30 drop (−18.2%) is verified.'),
      blocks:[
        {t:'lines', title:L('Tržba po týždňoch','Revenue by week'),
          labels:['W20','W21','W22','W23','W24','W25','W26','W27','W28','W29','W30','W31'],
          series:[{l:L('Tržba','Revenue'), v:[58200,61500,57800,63100,59700,62400,60800,63900,61200,64033,52384,39500], color:'var(--acc)'}],
          avg:true,
          note:L('W29 (64 033 €) a W30 (52 384 €) sú overené — pokles −18,2 %. W31 je neúplný týždeň (dáta len do 27. 7.). Ostatné týždne sú ukážkové.','W29 (€64,033) and W30 (€52,384) are verified — a −18.2% drop. W31 is a partial week (data only through Jul 27). Other weeks are illustrative.')},
        {t:'bars', title:L('Objednávky po týždňoch','Orders by week'),
          data:[
            {l:'W20',v:1523},{l:'W21',v:1610},{l:'W22',v:1513},{l:'W23',v:1652},{l:'W24',v:1563},
            {l:'W25',v:1633},{l:'W26',v:1592},{l:'W27',v:1673},{l:'W28',v:1602},{l:'W29',v:1676},
            {l:'W30',v:1371},{l:'W31',v:1034}
          ], note:L('Ukážkové odvodené z tržby a AOV 38,21 €, okrem trendu poklesu W30, ktorý je overený.','Illustrative, derived from revenue and the €38.21 AOV, except the verified W30 downturn trend.')},
        {t:'table', title:L('Týždenná tabuľka','Weekly table'),
          cols:[L('Týždeň','Week'),L('Tržba','Revenue'),L('Zisk','Profit'),L('Objednávky','Orders'),L('Δ vs predch.','Δ vs prev.'),L('Stav','Status')],
          rows:[
            {c:['W20',cur(58200),cur(33756),'1 523','—',['info',L('ukážka','sample')]]},
            {c:['W21',cur(61500),cur(35670),'1 610',L('+5,7 %','+5.7%'),['info',L('ukážka','sample')]]},
            {c:['W22',cur(57800),cur(33524),'1 513',L('−6,0 %','−6.0%'),['info',L('ukážka','sample')]]},
            {c:['W23',cur(63100),cur(36598),'1 652',L('+9,2 %','+9.2%'),['info',L('ukážka','sample')]]},
            {c:['W24',cur(59700),cur(34626),'1 563',L('−5,4 %','−5.4%'),['info',L('ukážka','sample')]]},
            {c:['W25',cur(62400),cur(36192),'1 633',L('+4,5 %','+4.5%'),['info',L('ukážka','sample')]]},
            {c:['W26',cur(60800),cur(35264),'1 592',L('−2,6 %','−2.6%'),['info',L('ukážka','sample')]]},
            {c:['W27',cur(63900),cur(37062),'1 673',L('+5,1 %','+5.1%'),['info',L('ukážka','sample')]]},
            {c:['W28',cur(61200),cur(35496),'1 602',L('−4,2 %','−4.2%'),['info',L('ukážka','sample')]]},
            {c:['W29',cur(64033),cur(37139),'1 676',L('+4,6 %','+4.6%'),['ok',L('overené','verified')]]},
            {c:['W30',cur(52384),cur(30383),'1 371',L('−18,2 %','−18.2%'),['no',L('overené','verified')]]},
            {c:['W31',cur(39500),cur(22910),'1 034',L('−24,6 % (neúplný)','−24.6% (partial)'),['info',L('neúplný týždeň','partial week')]]}
          ],
          note:L('Tržba W29/W30 a pokles −18,2 % sú overené. Zisk, objednávky a ostatné týždne sú ukážkové (odvodené z priemernej marže 58 % a AOV).','W29/W30 revenue and the −18.2% drop are verified. Profit, orders and the other weeks are illustrative (derived from a 58% average margin and the AOV).'),
          page:true}
      ],
      ai:[
        {q:L('O koľko klesla tržba v týždni 30?','How much did revenue drop in week 30?'),
         a:L('Tržba klesla z 64 033 € (W29) na 52 384 € (W30), teda o −18,2 %. Sú to overené čísla z e-shop exportu.','Revenue dropped from €64,033 (W29) to €52,384 (W30), a −18.2% decline. These are verified figures from the e-shop export.'),
         cite:'pamäť', act:null},
        {q:L('Je W31 kompletný týždeň?','Is W31 a complete week?'),
         a:L('Nie, W31 je v tejto tabuľke neúplný — dáta za júl 2026 pokrývajú len obdobie 1.–27. 7., takže posledný týždeň chýba niekoľko dní.','No, W31 is incomplete in this table — the July 2026 data only covers the period Jul 1–27, so the last week is missing several days.'),
         cite:'pamäť', act:null},
        {q:L('Ktorý týždeň mal najviac objednávok?','Which week had the most orders?'),
         a:L('V ukážkovej rade W29 s 1 676 objednávkami, tesne pred poklesom v W30. Presný počet objednávok po týždňoch appka z exportu priamo nemá — je odvodený z tržby a AOV.','In the illustrative series, W29 with 1,676 orders, right before the W30 drop. The exact weekly order count is not directly in the export — it is derived from revenue and AOV.'),
         cite:'ukážka', act:null}
      ]
    },

    /* ============ 4. OBJEDNÁVKY ============ */
    {key:'objednavky', icon:'list', title:L('Objednávky','Orders'),
      sub:L('Vzorka 35 z 5 679 objednávok júla 2026 — jednotlivé záznamy sú ukážkové, súčet 5 679 je overený.','A sample of 35 of the 5,679 July 2026 orders — individual records are illustrative, the 5,679 total is verified.'),
      blocks:[
        {t:'kpis', items:[
          {l:L('Objednávky spolu','Total orders'), v:'5 679', sub:L('overené, júl 2026','verified, July 2026'), tone:'ok', live:true},
          {l:L('Zobrazená vzorka','Sample shown'), v:'35', sub:L('ukážkové jednotlivé záznamy','illustrative individual records'), tone:null},
          {l:L('Dobierka','COD'), v:'65,8 %', sub:L('podiel na tržbe, overené','share of revenue, verified'), tone:'cond'},
          {l:L('Opakovaní zákazníci','Repeat customers'), v:'44,2 %', sub:L('z objednávok, overené','of orders, verified'), tone:'ok'}
        ]},
        {t:'table', title:L('Vzorka objednávok','Order sample'),
          cols:[L('Dátum','Date'),L('Trh','Market'),L('Hodnota','Value'),L('Doprava','Shipping'),L('Platba','Payment'),L('Stav','Status')],
          rows:[
            {c:['1. 7.','HU',cur(41.20),cur(0),'karta',['ok',L('Doručené','Delivered')]]},
            {c:['1. 7.','RO',cur(38.60),cur(3.90),L('dobierka','COD'),['info',L('Tovar odoslaný','Shipped')]]},
            {c:['2. 7.','SK',cur(22.50),cur(2.90),'karta',['ok',L('Doručené','Delivered')]]},
            {c:['2. 7.','CZ',cur(64.10),cur(3.90),L('dobierka','COD'),['info',L('Tovar odoslaný','Shipped')]]},
            {c:['2. 7.','PL',cur(29.90),cur(3.90),L('dobierka','COD'),['cond',L('Nová','New')]]},
            {c:['3. 7.','HU',cur(85.00),cur(0),'karta',['info',L('Tovar odoslaný','Shipped')]]},
            {c:['3. 7.','SI',cur(19.90),cur(2.90),L('prevod','Transfer')  ,['ok',L('Doručené','Delivered')]]},
            {c:['4. 7.','RO',cur(52.30),cur(3.90),L('dobierka','COD'),['info',L('Tovar odoslaný','Shipped')]]},
            {c:['4. 7.','HR',cur(33.40),cur(3.90),L('dobierka','COD'),['no',L('Zrušená','Cancelled')]]},
            {c:['4. 7.','SK',cur(18.70),cur(2.90),'karta',['ok',L('Doručené','Delivered')]]},
            {c:['5. 7.','HU',cur(120.00),cur(0),'karta',['info',L('Tovar odoslaný','Shipped')]]},
            {c:['5. 7.','BG',cur(27.10),cur(3.90),L('dobierka','COD'),['cond',L('Nová','New')]]},
            {c:['6. 7.','CZ',cur(45.60),cur(2.90),L('prevod','Transfer'),['ok',L('Doručené','Delivered')]]},
            {c:['6. 7.','RO',cur(61.20),cur(3.90),L('dobierka','COD'),['info',L('Tovar odoslaný','Shipped')]]},
            {c:['7. 7.','SK',cur(25.40),cur(2.90),'karta',['ok',L('Doručené','Delivered')]]},
            {c:['8. 7.','HU',cur(38.10),cur(0),'karta',['ok',L('Doručené','Delivered')]]},
            {c:['8. 7.','PL',cur(55.00),cur(3.90),L('dobierka','COD'),['no',L('Zrušená','Cancelled')]]},
            {c:['9. 7.','RO',cur(29.90),cur(3.90),L('dobierka','COD'),['info',L('Tovar odoslaný','Shipped')]]},
            {c:['9. 7.','SI',cur(17.50),cur(2.90),'karta',['cond',L('Nová','New')]]},
            {c:['10. 7.','HU',cur(95.00),cur(0),'karta',['info',L('Tovar odoslaný','Shipped')]]},
            {c:['10. 7.','SK',cur(21.90),cur(2.90),L('dobierka','COD'),['ok',L('Doručené','Delivered')]]},
            {c:['11. 7.','CZ',cur(33.20),cur(2.90),L('prevod','Transfer'),['info',L('Tovar odoslaný','Shipped')]]},
            {c:['11. 7.','HR',cur(24.60),cur(3.90),L('dobierka','COD'),['ok',L('Doručené','Delivered')]]},
            {c:['12. 7.','RO',cur(47.80),cur(3.90),L('dobierka','COD'),['info',L('Tovar odoslaný','Shipped')]]},
            {c:['13. 7.','HU',cur(63.40),cur(0),'karta',['ok',L('Doručené','Delivered')]]},
            {c:['14. 7.','BG',cur(19.90),cur(3.90),L('dobierka','COD'),['cond',L('Nová','New')]]},
            {c:['15. 7.','SK',cur(28.50),cur(2.90),'karta',['ok',L('Doručené','Delivered')]]},
            {c:['16. 7.','PL',cur(41.00),cur(3.90),L('dobierka','COD'),['info',L('Tovar odoslaný','Shipped')]]},
            {c:['17. 7.','HU',cur(110.50),cur(0),'karta',['info',L('Tovar odoslaný','Shipped')]]},
            {c:['18. 7.','RO',cur(35.60),cur(3.90),L('dobierka','COD'),['ok',L('Doručené','Delivered')]]},
            {c:['20. 7.','SI',cur(22.30),cur(2.90),L('prevod','Transfer'),['cond',L('Nová','New')]]},
            {c:['22. 7.','SK',cur(29.90),cur(2.90),'karta',['ok',L('Doručené','Delivered')]]},
            {c:['24. 7.','HR',cur(31.20),cur(3.90),L('dobierka','COD'),['info',L('Tovar odoslaný','Shipped')]]},
            {c:['26. 7.','HU',cur(48.90),cur(0),'karta',['cond',L('Nová','New')]]},
            {c:['27. 7.','RO',cur(58.20),cur(3.90),L('dobierka','COD'),['cond',L('Nová','New')]]}
          ],
          note:L('Jednotlivé objednávky sú ukážkové na ilustráciu stĺpcov. Súčet 5 679 objednávok a podiely dobierky (65,8 %) a opakovaných zákazníkov (44,2 %) sú overené.','Individual orders are illustrative to show the columns. The 5,679 total and the COD (65.8%) and repeat-customer (44.2%) shares are verified.'),
          page:true}
      ],
      ai:[
        {q:L('Koľko objednávok bolo v júli spolu?','How many orders were there in July total?'),
         a:L('5 679 objednávok za obdobie 1.–27. 7. 2026 — je to overené číslo z e-shop exportu stats. Tabuľka nižšie zobrazuje len ukážkovú vzorku 35 záznamov.','5,679 orders for the Jul 1–27, 2026 period — a verified figure from the e-shop stats export. The table below shows only an illustrative sample of 35 records.'),
         cite:'pamäť', act:null},
        {q:L('Aký je podiel platby na dobierku?','What is the share of cash-on-delivery payments?'),
         a:L('Dobierka tvorí 65,8 % tržby a je dominantná forma platby, čo so sebou nesie riziko neprevzatia zásielky pri drahších objednávkach.','COD accounts for 65.8% of revenue and is the dominant payment method, which carries a risk of non-pickup on higher-value orders.'),
         cite:'pamäť', act:{l:L('Otvoriť dopravu','Open shipping'), k:'open'}},
        {q:L('Je vzorka objednávok reprezentatívna?','Is the order sample representative?'),
         a:L('Nie priamo — 35 zobrazených objednávok je ukážkových a slúži na demonštráciu stĺpcov (dátum, trh, hodnota, doprava, platba, stav). Reálne agregáty (počty, podiely) v KPI kartách sú overené.','Not directly — the 35 shown orders are illustrative and demonstrate the columns (date, market, value, shipping, payment, status). The real aggregates (counts, shares) in the KPI cards are verified.'),
         cite:'ukážka', act:null}
      ]
    },

    /* ============ 5. TRHY ============ */
    {key:'trhy', icon:'flag', title:L('Trhy','Markets'),
      sub:L('8 trhov — podiel tržby, AOV, objednávky a vrátky. HU+RO+SK = 63,9 % tržby je overené.','8 markets — revenue share, AOV, orders and returns. HU+RO+SK = 63.9% of revenue is verified.'),
      blocks:[
        {t:'kpis', items:[
          {l:L('HU+RO+SK','HU+RO+SK'), v:'63,9 %', sub:L('podiel na tržbe, overené','share of revenue, verified'), tone:'ok'},
          {l:'Top trh', v:'HU', sub:L('26,4 % tržby (ukážka)','26.4% of revenue (sample)'), tone:null},
          {l:L('Trhov spolu','Total markets'), v:'8', sub:L('sledovaných v reporte','tracked in the report'), tone:null},
          {l:L('Rastúce vrátky','Rising returns'), v:'PL', sub:L('sledovať vývoj (ukážka)','watch the trend (sample)'), tone:'cond'}
        ]},
        {t:'bars', title:L('Podiel tržby po trhoch','Revenue share by market'),
          data:[{l:'HU',v:26.4},{l:'RO',v:19.8},{l:'SK',v:17.7},{l:'CZ',v:13.2},{l:'PL',v:9.1},{l:'SI',v:5.3},{l:'HR',v:4.6},{l:'BG',v:3.9}],
          note:L('HU+RO+SK spolu 63,9 % je overené, jednotlivé podiely sú ukážkové.','HU+RO+SK combined 63.9% is verified, individual shares are illustrative.')},
        {t:'table', title:L('Tabuľka trhov','Markets table'),
          cols:[L('Trh','Market'),L('Podiel tržby','Revenue share'),'AOV',L('Objednávky','Orders'),L('Vrátky','Returns'),L('Stav','Status')],
          rows:[
            {c:['HU','26,4 %',cur(41.20),'1 390','2,1 %',['ok','OK']]},
            {c:['RO','19,8 %',cur(39.80),'1 080','2,4 %',['ok','OK']]},
            {c:['SK','17,7 %',cur(36.10),'1 065','1,6 %',['ok','OK']]},
            {c:['CZ','13,2 %',cur(35.60),'805','2,0 %',['ok','OK']]},
            {c:['PL','9,1 %',cur(33.90),'580','4,3 %',['cond',L('rast vratiek','returns rising')]]},
            {c:['SI','5,3 %',cur(34.00),'300','2,2 %',['ok','OK']]},
            {c:['HR','4,6 %',cur(33.50),'250','2,5 %',['ok','OK']]},
            {c:['BG','3,9 %',cur(32.90),'209','2,3 %',['ok','OK']]}
          ],
          note:L('Overené: HU+RO+SK = 63,9 % tržby. Jednotlivé podiely, AOV, objednávky a vrátky po trhu sú ukážkové.','Verified: HU+RO+SK = 63.9% of revenue. Individual per-market shares, AOV, orders and returns are illustrative.'),
          page:true}
      ],
      ai:[
        {q:L('Aký je podiel HU, RO a SK na tržbe?','What is the combined HU, RO and SK revenue share?'),
         a:L('HU+RO+SK dokopy tvoria 63,9 % tržby v júli 2026 — je to overené číslo. Rozdelenie na jednotlivé trhy (HU 26,4 %, RO 19,8 %, SK 17,7 %) je ukážkové.','HU+RO+SK together make up 63.9% of July 2026 revenue — a verified figure. The breakdown into individual markets (HU 26.4%, RO 19.8%, SK 17.7%) is illustrative.'),
         cite:'pamäť', act:null},
        {q:L('Ktorý trh má rastúce vrátky?','Which market has rising returns?'),
         a:L('V ukážkovej tabuľke je to Poľsko (PL) so 4,3 % vrátok, ktoré je označené na sledovanie. Presné vrátky po trhu appka z exportu priamo nemá.','In the illustrative table it is Poland (PL) at 4.3% returns, flagged to watch. Exact per-market returns are not directly in the export.'),
         cite:'ukážka', act:null},
        {q:L('Koľko trhov appka sleduje?','How many markets does the app track?'),
         a:L('8 trhov: HU, RO, SK, CZ, PL, SI, HR a BG. Súčet ich podielov na tržbe je 100 %.','8 markets: HU, RO, SK, CZ, PL, SI, HR and BG. Their revenue shares sum to 100%.'),
         cite:'appka', act:null}
      ]
    },

    /* ============ 6. PRODUKTY ============ */
    {key:'produkty', icon:'tag', title:L('Produkty','Products'),
      sub:L('Top 28 produktov podľa tržby — ukážkový produktový rozpis, agregát zlato/ostatné je overený.','Top 28 products by revenue — illustrative product breakdown, the gold/other aggregate is verified.'),
      blocks:[
        {t:'kpis', items:[
          {l:L('Zlato — podiel tržby','Gold — revenue share'), v:'49,8 %', sub:L('pri 22,4 % objednávok, overené','at 22.4% of orders, verified'), tone:'cond'},
          {l:L('Zlato — marža','Gold — margin'), v:'54,6 %', sub:L('vs ostatné kovy 77,4 %, overené','vs other metals 77.4%, verified'), tone:'cond'},
          {l:L('Top 28 produktov','Top 28 products'), v:'78,8 %', sub:L('podiel na tržbe (ukážka)','of revenue (sample)'), tone:null},
          {l:L('Produktov v tabuľke','Products listed'), v:'28', sub:L('z aktívneho sortimentu (ukážka)','of the active assortment (sample)'), tone:null}
        ]},
        {t:'bars', title:L('Top 8 produktov podľa tržby','Top 8 products by revenue'),
          data:[
            {l:L('Zlatá retiazka Figaro','Gold figaro chain'),v:12600},
            {l:L('Zlatý zásnubný prsteň','Gold engagement ring'),v:11550},
            {l:L('Zlatý prsteň Solitaire','Gold solitaire ring'),v:9750},
            {l:L('Zlaté náušnice Mini Hoops','Gold mini hoop earrings'),v:9450},
            {l:L('Zlatá retiazka Rope','Gold rope chain'),v:9600},
            {l:L('Zlatý tenisový náramok','Gold tennis bracelet'),v:8100},
            {l:L('Zlatý prsteň Eternity','Gold eternity ring'),v:7200},
            {l:L('Zlatá svadobná sada','Gold wedding set'),v:7800}
          ], note:L('Ukážkové hodnoty — appka nemá produktový export za júl 2026 v pamäti.','Illustrative values — the app does not have a July 2026 product export in memory.')},
        {t:'table', title:L('Tabuľka produktov','Products table'),
          cols:[L('Produkt','Product'),L('Predané','Units sold'),L('Tržba','Revenue'),L('Marža','Margin'),L('Podiel','Share')],
          rows:[
            {c:[L('Zlaté náušnice Mini Hoops','Gold mini hoop earrings'),int(210),cur(9450),'55,0 %','4,4 %']},
            {c:[L('Strieborné náušnice Drop','Silver drop earrings'),int(380),cur(6840),'76,0 %','3,2 %']},
            {c:[L('Zlatý prsteň Solitaire','Gold solitaire ring'),int(150),cur(9750),'53,0 %','4,5 %']},
            {c:[L('Strieborný prsteň Twist','Silver twist ring'),int(300),cur(4500),'78,0 %','2,1 %']},
            {c:[L('Oceľový náhrdelník Bar','Steel bar necklace'),int(260),cur(5200),'80,0 %','2,4 %']},
            {c:[L('Zlatá retiazka Figaro','Gold figaro chain'),int(90),cur(12600),'50,0 %','5,8 %']},
            {c:[L('Strieborný náramok Chain','Silver chain bracelet'),int(340),cur(5440),'77,0 %','2,5 %']},
            {c:[L('Zlatá sada Srdce','Gold heart set'),int(70),cur(6650),'52,0 %','3,1 %']},
            {c:[L('Piercing do nosa Stud','Nose piercing stud'),int(500),cur(4500),'82,0 %','2,1 %']},
            {c:[L('Piercing do pupku Banana','Belly piercing banana'),int(420),cur(4620),'81,0 %','2,1 %']},
            {c:[L('Zlaté náušnice Pearl','Gold pearl earrings'),int(130),cur(4940),'56,0 %','2,3 %']},
            {c:[L('Strieborný náhrdelník Infinity','Silver infinity necklace'),int(250),cur(4750),'75,0 %','2,2 %']},
            {c:[L('Zlatý prsteň Eternity','Gold eternity ring'),int(100),cur(7200),'54,0 %','3,3 %']},
            {c:[L('Oceľový náramok Cuff','Steel cuff bracelet'),int(180),cur(3960),'79,0 %','1,8 %']},
            {c:[L('Strieborné náušnice Hoops L','Silver hoops L'),int(220),cur(3740),'76,0 %','1,7 %']},
            {c:[L('Zlatá retiazka Rope','Gold rope chain'),int(60),cur(9600),'49,0 %','4,4 %']},
            {c:[L('Strieborná sada Minimal','Silver minimal set'),int(150),cur(3600),'74,0 %','1,7 %']},
            {c:[L('Piercing do ucha Helix','Ear helix piercing'),int(460),cur(4600),'83,0 %','2,1 %']},
            {c:[L('Zlatý tenisový náramok','Gold tennis bracelet'),int(45),cur(8100),'51,0 %','3,7 %']},
            {c:[L('Strieborný prsteň Ban','Silver band ring'),int(310),cur(4340),'77,0 %','2,0 %']},
            {c:[L('Náhrdelník chirurgická oceľ Coin','Steel coin necklace'),int(200),cur(4200),'80,0 %','1,9 %']},
            {c:[L('Zlaté náušnice Huggies','Gold huggie earrings'),int(190),cur(6080),'57,0 %','2,8 %']},
            {c:[L('Strieborný náhrdelník Star','Silver star necklace'),int(240),cur(3840),'75,0 %','1,8 %']},
            {c:[L('Zlatý zásnubný prsteň','Gold engagement ring'),int(55),cur(11550),'52,0 %','5,3 %']},
            {c:[L('Oceľové náušnice Basic','Steel basic earrings'),int(520),cur(3640),'84,0 %','1,7 %']},
            {c:[L('Strieborný náramok Charm','Silver charm bracelet'),int(270),cur(4860),'76,0 %','2,2 %']},
            {c:[L('Zlatá svadobná sada','Gold wedding set'),int(30),cur(7800),'50,0 %','3,6 %']},
            {c:[L('Piercing do pupku Zirkón','Belly piercing zircon'),int(380),cur(4560),'80,0 %','2,1 %']}
          ],
          note:L('Celá tabuľka je ukážková (appka nemá produktový export za júl 2026 v pamäti). Overený je len agregát: zlato 22,4 % objednávok = 49,8 % tržby, marža 54,6 % vs ostatné 77,4 %.','The whole table is illustrative (the app has no July 2026 product export in memory). Only the aggregate is verified: gold 22.4% of orders = 49.8% of revenue, margin 54.6% vs 77.4% for others.'),
          page:true}
      ],
      ai:[
        {q:L('Ktorý produkt má najvyššiu tržbu?','Which product has the highest revenue?'),
         a:L('V tejto ukážkovej tabuľke je to Zlatá retiazka Figaro s 12 600 € pri 90 predaných kusoch. Ide o ilustračné dáta — appka nemá produktový export za júl 2026.','In this illustrative table it is the Gold figaro chain at €12,600 across 90 units sold. This is illustrative data — the app has no July 2026 product export.'),
         cite:'ukážka', act:null},
        {q:L('Aký je rozdiel v marži medzi zlatom a ostatnými kovmi?','What is the margin gap between gold and other metals?'),
         a:L('Zlato má maržu 54,6 %, ostatné kovy 77,4 % — rozdiel 22,8 percentuálneho bodu. Toto je overené číslo z e-shop exportu za júl 2026.','Gold has a 54.6% margin, other metals 77.4% — a 22.8 percentage-point gap. This is a verified figure from the July 2026 e-shop export.'),
         cite:'pamäť', act:{l:L('Otvoriť definície','Open definitions'), k:'open'}},
        {q:L('Koľko produktov appka zobrazuje?','How many products does the app show?'),
         a:L('28 produktov, ktoré podľa ukážkových čísel tvoria 78,8 % tržby — zvyšok je dlhý chvost menších položiek, ktorý tabuľka nezobrazuje.','28 products, which by illustrative figures make up 78.8% of revenue — the rest is a long tail of smaller items the table does not show.'),
         cite:'ukážka', act:null}
      ]
    },

    /* ============ 7. KOŠE ============ */
    {key:'kose', icon:'coins', title:L('Koše','Baskets'),
      sub:L('4 pásma hodnoty objednávky. Pásmo > 60 € = 44,4 % tržby je overené, ostatné sú ukážkové.','4 order-value bands. The >€60 band = 44.4% of revenue is verified, the others are illustrative.'),
      blocks:[
        {t:'kpis', items:[
          {l:'AOV', v:cur(38.21), sub:L('priemerná hodnota objednávky, overené','average order value, verified'), tone:'ok'},
          {l:L('Medián','Median'), v:cur(25.41), sub:L('typická objednávka, overené','typical order, verified'), tone:'ok'},
          {l:L('Pásmo > 60 €','Band > €60'), v:'44,4 %', sub:L('tržby pri 15,4 % objednávok, overené','of revenue at 15.4% of orders, verified'), tone:'cond'},
          {l:L('So zľavou — AOV','Discounted — AOV'), v:cur(59.82), sub:L('vs 30,35 € bez zľavy','vs €30.35 full price'), tone:'cond'}
        ]},
        {t:'table', title:L('Pásma hodnoty objednávky','Order-value bands'),
          cols:[L('Pásmo','Band'),L('Podiel obj.','Order share'),L('Podiel tržby','Revenue share'),L('Stav','Status')],
          rows:[
            {c:[L('< 10 €','< €10'),{pln:14.8},{pln:4.1},['info',L('ukážka','sample')]]},
            {c:[L('10–25 €','€10–25'),{pln:34.6},{pln:21.3},['info',L('ukážka','sample')]]},
            {c:[L('25–60 €','€25–60'),{pln:35.2},{pln:30.2},['info',L('ukážka','sample')]]},
            {c:[L('> 60 €','> €60'),{pln:15.4},{pln:44.4},['cond',L('overené — 44,4 % tržby','verified — 44.4% of revenue')]]}
          ],
          note:L('Pásmo > 60 € (15,4 % obj. / 44,4 % tržby) je overené. Ostatné tri pásma sú ukážkové — priemer nereprezentuje typickú objednávku (medián 25,41 €).','The >€60 band (15.4% orders / 44.4% revenue) is verified. The other three bands are illustrative — the mean does not represent the typical order (median €25.41).')},
        {t:'bars', title:L('Jemnejšie rozdelenie hodnôt (ukážka)','Finer value distribution (sample)'),
          data:[
            {l:'< 10 €',v:14.8},{l:'10–20 €',v:19.4},{l:'20–25 €',v:15.2},{l:'25–35 €',v:16.8},
            {l:'35–50 €',v:12.9},{l:'50–60 €',v:5.5},{l:'60–100 €',v:10.6},{l:'> 100 €',v:4.8}
          ], note:L('Ukážkové jemnejšie pásma na ilustráciu rozdelenia — súčty prvých štyroch a posledných dvoch zodpovedajú overeným 4 pásmam vyššie.','Illustrative finer bands to show the distribution — the first four and last two sums match the verified 4 bands above.')}
      ],
      ai:[
        {q:L('Prečo sa AOV a medián líšia?','Why do AOV and median differ?'),
         a:L('AOV 38,21 € je priemer ovplyvnený drahšími objednávkami (pásmo > 60 € tvorí 44,4 % tržby pri len 15,4 % objednávok), zatiaľ čo medián 25,41 € lepšie zachytáva typickú objednávku. Oba údaje sú overené.','The €38.21 AOV is a mean skewed by higher-value orders (the >€60 band is 44.4% of revenue at only 15.4% of orders), while the €25.41 median better reflects the typical order. Both figures are verified.'),
         cite:'pamäť', act:{l:L('Otvoriť definície','Open definitions'), k:'open'}},
        {q:L('Ako zľava ovplyvňuje košík?','How does a discount affect the basket?'),
         a:L('Objednávky so zľavou majú vyšší AOV (59,82 € vs 30,35 € bez zľavy), ale nižšiu maržu (57,5 % vs 72,2 %). Oba páry čísel sú overené.','Discounted orders have a higher AOV (€59.82 vs €30.35 full price) but lower margin (57.5% vs 72.2%). Both number pairs are verified.'),
         cite:'pamäť', act:null},
        {q:L('Koľko tržby tvorí najvyššie pásmo?','How much revenue does the top band make up?'),
         a:L('Pásmo nad 60 € tvorí 44,4 % tržby pri 15,4 % objednávok — je to overené číslo a najvýznamnejšie zistenie tejto obrazovky.','The band above €60 makes up 44.4% of revenue at 15.4% of orders — a verified figure and the key finding of this screen.'),
         cite:'pamäť', act:null}
      ]
    },

    /* ============ 8. HODINY A DNI ============ */
    {key:'hodiny', icon:'clock', title:L('Hodiny a dni','Hours & days'),
      sub:L('Hodinový profil (špička 11:00) a priemerná tržba po dňoch. Sobota a noc sú overené.','Hourly profile (11:00 peak) and average revenue by weekday. Saturday and the night share are verified.'),
      blocks:[
        {t:'lines', title:L('Hodinový profil tržby','Hourly revenue profile'),
          labels:['0','2','4','6','8','10','12','14','16','18','20','22'],
          series:[{l:L('Tržba podľa hodiny','Revenue by hour'), v:[140,95,80,260,720,1240,1210,1020,930,850,700,390], color:'var(--acc)'}],
          avg:false,
          note:L('Špička o 11:00 a noc 0–6 h = 5,5 % tržby sú overené. Presný tvar krivky medzi meranými bodmi je ukážkový.','The 11:00 peak and the 0–6h night share of 5.5% of revenue are verified. The exact curve shape between measured points is illustrative.')},
        {t:'bars', title:L('Priemerná tržba po dňoch týždňa','Average revenue by weekday'),
          data:[
            {l:L('Po','Mon'),v:8210},{l:L('Ut','Tue'),v:8090},{l:L('St','Wed'),v:8340},{l:L('Št','Thu'),v:7980},
            {l:L('Pi','Fri'),v:8150},{l:L('So','Sat'),v:5774},{l:L('Ne','Sun'),v:7870}
          ], note:L('Sobota 5 774 € je overená (najslabší deň). Ostatné dni sú ukážkové (Ø plný deň ≈ 8 091 €).','Saturday at €5,774 is verified (weakest day). The other days are illustrative (average full day ≈ €8,091).')},
        {t:'table', title:L('Rozdelenie tržby po pásmach dňa','Revenue split by time-of-day band'),
          cols:[L('Pásmo','Band'),L('Podiel tržby','Revenue share'),L('Stav','Status')],
          rows:[
            {c:[L('Noc 0–6 h','Night 0–6h'),'5,5 %',['ok',L('overené','verified')]]},
            {c:[L('Ráno 6–12 h','Morning 6–12h'),'38,2 %',['info',L('ukážka','sample')]]},
            {c:[L('Poobede 12–18 h','Afternoon 12–18h'),'34,1 %',['info',L('ukážka','sample')]]},
            {c:[L('Večer 18–24 h','Evening 18–24h'),'22,2 %',['info',L('ukážka','sample')]]}
          ], note:L('Len podiel nočného pásma (5,5 %) je overený, ostatné tri pásma sú ukážkové doplnenie do 100 %.','Only the night band share (5.5%) is verified; the other three bands are an illustrative fill to 100%.')}
      ],
      ai:[
        {q:L('Kedy je denná špička tržby?','When is the daily revenue peak?'),
         a:L('Denná špička je o 11:00 — overené z e-shop exportu. Noc medzi 0. a 6. hodinou tvorí len 5,5 % tržby.','The daily peak is at 11:00 — verified from the e-shop export. The 0–6h night window is only 5.5% of revenue.'),
         cite:'pamäť', act:null},
        {q:L('Ktorý deň v týždni je najslabší?','Which weekday is weakest?'),
         a:L('Sobota, s priemernou tržbou 5 774 € oproti Ø plnému dňu 8 091 € — je to systematický a overený vzorec, nie jednorazová odchýlka.','Saturday, averaging €5,774 versus the €8,091 average full day — a systematic, verified pattern, not a one-off deviation.'),
         cite:'pamäť', act:{l:L('Otvoriť prehľad','Open overview'), k:'open'}},
        {q:L('Aký je podiel nočných objednávok?','What is the share of night orders?'),
         a:L('Objednávky medzi 0. a 6. hodinou tvoria len 5,5 % tržby — prevažná väčšina obratu vzniká cez deň, so špičkou o 11:00.','Orders placed between midnight and 6am make up only 5.5% of revenue — the vast majority of turnover happens during the day, peaking at 11:00.'),
         cite:'pamäť', act:null}
      ]
    },

    /* ============ 9. EXPEDÍCIA ============ */
    {key:'expedicia', icon:'truck', title:L('Expedícia','Dispatch'),
      sub:L('Percentily expedičného času a 12-týždňový trend podielu do 24 h.','Dispatch time percentiles and a 12-week trend of the share within 24h.'),
      blocks:[
        {t:'kpis', items:[
          {l:L('P50 · medián','P50 · median'), v:'18,7 h', sub:L('overené, cieľ splnený','verified, on target'), tone:'ok', live:true},
          {l:'P75', v:'27,4 h', sub:L('nad 24 h (ukážka)','over 24h (sample)'), tone:'cond'},
          {l:'P90', v:'42,6 h', sub:L('mimo cieľa (ukážka)','off target (sample)'), tone:'no'},
          {l:L('Podiel do 24 h','Share within 24h'), v:'69,6 %', sub:L('cieľ 80 %, overené','target 80%, verified'), tone:'cond', live:true}
        ]},
        {t:'table', title:L('Percentily expedičného času','Dispatch time percentiles'),
          cols:[L('Ukazovateľ','Metric'),L('Hodnota','Value'),L('Stav','Status')],
          rows:[
            {c:[L('P50 · medián expedície','P50 · dispatch median'),'18,7 h',['ok',L('v cieli, overené','on target, verified')]]},
            {c:['P75','27,4 h',['cond',L('nad 24 h (ukážka)','over 24h (sample)')]]},
            {c:['P90','42,6 h',['no',L('mimo cieľa (ukážka)','off target (sample)')]]},
            {c:[L('Podiel do 24 h','Share within 24h'),'69,6 %',['cond',L('cieľ 80 %, overené','target 80%, verified')]]}
          ],
          note:L('P50 (18,7 h) a podiel do 24 h (69,6 %) sú overené z e-shop exportu, merané len na stave „Tovar odoslaný" (4 928 z 5 679 objednávok). P75 a P90 sú ukážkové.','P50 (18.7h) and the within-24h share (69.6%) are verified from the e-shop export, measured only on the "Shipped" status (4,928 of 5,679 orders). P75 and P90 are illustrative.')},
        {t:'lines', title:L('Podiel do 24 h po týždňoch','Share within 24h by week'),
          labels:['W20','W21','W22','W23','W24','W25','W26','W27','W28','W29','W30','W31'],
          series:[{l:L('Do 24 h','Within 24h'), v:[71.2,68.5,70.1,72.4,69.8,73.0,70.5,68.9,71.7,69.4,65.2,69.6], color:'var(--amber)'}],
          avg:true, note:L('Úroveň zodpovedá overenému júlovému priemeru 69,6 %, týždenný priebeh je ukážkový.','The level matches the verified July average of 69.6%; the weekly path is illustrative.')}
      ],
      ai:[
        {q:L('Aký je medián času expedície?','What is the median dispatch time?'),
         a:L('18,7 hodiny (P50), meraných na objednávkach v stave „Tovar odoslaný" (4 928 z 5 679). Je to overené číslo a spĺňa interný cieľ.','18.7 hours (P50), measured on orders in "Shipped" status (4,928 of 5,679). This is a verified figure and meets the internal target.'),
         cite:'pamäť', act:null},
        {q:L('Koľko objednávok sa odošle do 24 h?','How many orders ship within 24h?'),
         a:L('69,6 % objednávok sa odošle do 24 hodín, čo je pod cieľom 80 %. Toto číslo je overené, P75 (27,4 h) a P90 (42,6 h) sú ukážkové doplnenie.','69.6% of orders ship within 24 hours, below the 80% target. This figure is verified; P75 (27.4h) and P90 (42.6h) are illustrative additions.'),
         cite:'pamäť', act:{l:L('Filtrovať nad 24 h','Filter over 24h'), k:'filter'}},
        {q:L('Prečo sa meria len na stave Tovar odoslaný?','Why is this measured only on the Shipped status?'),
         a:L('Doručené objednávky nemajú v exporte samostatný čas odoslania — posledný stav prepísal záznam o odoslaní. Preto sa expedičný čas počíta len na podmnožine 4 928 objednávok v stave „Tovar odoslaný".','Delivered orders have no separate dispatch timestamp in the export — the latest status overwrote the shipped record. So dispatch time is computed only on the 4,928-order subset in "Shipped" status.'),
         cite:'appka', act:null}
      ]
    },

    /* ============ 10. DOPRAVA ============ */
    {key:'doprava', icon:'swap', title:L('Doprava a platby','Shipping & payments'),
      sub:L('Spôsoby dopravy a platby, náklady na dopravu. Doprava 11 603 € a dobierka 65,8 % sú overené.','Shipping and payment methods, shipping costs. Shipping €11,603 and COD 65.8% are verified.'),
      blocks:[
        {t:'kpis', items:[
          {l:L('Doprava spolu','Total shipping'), v:cur(11603), sub:L('z rozdielu marža → zisk, overené','from the margin → profit gap, verified'), tone:'cond'},
          {l:L('Dobierka','COD'), v:'65,8 %', sub:L('podiel na tržbe, overené','share of revenue, verified'), tone:'cond'},
          {l:L('Karta','Card'), v:'28,4 %', sub:L('podiel na tržbe (ukážka)','share of revenue (sample)'), tone:null},
          {l:L('Prevod','Transfer'), v:'5,8 %', sub:L('podiel na tržbe (ukážka)','share of revenue (sample)'), tone:null}
        ]},
        {t:'table', title:L('Spôsoby platby','Payment methods'),
          cols:[L('Platba','Payment'),L('Podiel tržby','Revenue share'),L('AOV','AOV'),L('Stav','Status')],
          rows:[
            {c:[L('Dobierka','COD'),'65,8 %',cur(38.63),['cond',L('overené — riziko neprevzatia','verified — non-pickup risk')]]},
            {c:['Karta','28,4 %',cur(37.90),['ok',L('ukážka','sample')]]},
            {c:[L('Prevod','Transfer'),'5,8 %',cur(41.10),['ok',L('ukážka','sample')]]}
          ],
          note:L('Podiel dobierky 65,8 % je overený, ostatné dva spôsoby a AOV sú ukážkové doplnenie do 100 %.','The COD share of 65.8% is verified; the other two methods and AOV are an illustrative fill to 100%.')},
        {t:'table', title:L('Dopravcovia','Carriers'),
          cols:[L('Dopravca','Carrier'),L('Podiel zásielok','Share of shipments'),L('Priemerná cena','Average cost'),L('Stav','Status')],
          rows:[
            {c:['GLS','42,0 %',cur(3.90),['ok',L('ukážka','sample')]]},
            {c:['Packeta','31,0 %',cur(2.90),['ok',L('ukážka','sample')]]},
            {c:[L('Osobný odber','Pickup point'),'18,0 %',cur(0),['ok',L('ukážka','sample')]]},
            {c:[L('Iný kuriér','Other courier'),'9,0 %',cur(4.50),['info',L('ukážka','sample')]]}
          ],
          note:L('Celá tabuľka dopravcov je ukážková — appka nemá rozpis nákladov po dopravcovi za júl 2026 v pamäti. Súčet nákladov na dopravu (11 603 €) je overený.','The entire carriers table is illustrative — the app has no per-carrier cost breakdown for July 2026 in memory. The total shipping cost (€11,603) is verified.')}
      ],
      ai:[
        {q:L('Koľko stála doprava v júli?','How much did shipping cost in July?'),
         a:L('11 603 € — je to overené číslo, ktoré tvorí najväčšiu časť rozdielu medzi maržou (143 423 €) a ziskom (126 541 €), teda 16 882 €.','€11,603 — a verified figure that makes up the largest part of the 16,882 gap between margin (€143,423) and profit (€126,541).'),
         cite:'pamäť', act:{l:L('Otvoriť definície','Open definitions'), k:'open'}},
        {q:L('Prečo je dobierka riziková?','Why is COD risky?'),
         a:L('Dobierka tvorí 65,8 % tržby s priemernou hodnotou objednávky 38,63 € — pri neprevzatí zásielky firma stráca náklady na tovar aj dopravu obojsmerne. Podiel 65,8 % je overený, AOV je ukážkové doplnenie.','COD makes up 65.8% of revenue at an average order value of €38.63 — a non-pickup means the company loses both goods and round-trip shipping costs. The 65.8% share is verified; the AOV is an illustrative addition.'),
         cite:'pamäť', act:null},
        {q:L('Ktorý dopravca vozí najviac zásielok?','Which carrier ships the most parcels?'),
         a:L('V ukážkovej tabuľke GLS s 42,0 % zásielok. Skutočný rozpis po dopravcoch appka za júl 2026 v pamäti nemá.','In the illustrative table, GLS at 42.0% of shipments. The app does not have the actual per-carrier breakdown for July 2026 in memory.'),
         cite:'ukážka', act:null}
      ]
    },

    /* ============ 11. DEFINÍCIE ============ */
    {key:'definicie', icon:'doc', title:L('Definície','Definitions'),
      sub:L('Ako report počíta maržu a zisk — júl 2026.','How the report computes margin and profit — July 2026.'),
      blocks:[
        {t:'table', cols:[L('Pojem','Term'),L('Definícia','Definition'),L('Hodnota júl','July value'),L('Pozn.','Note')],
          rows:[
            {c:[L('Marža','Margin'), L('tržba − náklady tovaru','revenue − cost of goods'), '66,1 %',
                L('zlato 54,6 % vs ostatné 77,4 %','gold 54.6% vs others 77.4%')]},
            {c:[L('Zisk','Profit'), L('marža − doprava − priame poplatky','margin − shipping − direct fees'), cur(126541),
                L('rozdiel 16 882 €, z toho doprava 11 603 €','difference €16,882, of which shipping €11,603')]},
            {c:[L('AOV','AOV'), L('tržba / počet objednávok','revenue / number of orders'), cur(38.21),
                L('priemer, skreslený drahšími košmi — pozri medián','a mean, skewed by higher-value baskets — see median')]},
            {c:[L('Medián koša','Basket median'), L('stredná hodnota objednávky','the middle order value'), cur(25.41),
                L('lepšie zachytáva typickú objednávku ako AOV','better reflects the typical order than AOV')]},
            {c:[L('Run-rate','Run-rate'), L('tržba za 27 dní / 27 × 31','27-day revenue / 27 × 31'), cur(250822),
                L('projekcia na celý mesiac, nie skutočný výsledok','a full-month projection, not the actual outcome')]},
            {c:[L('Expedícia P50','Dispatch P50'), L('medián času od objednania po odoslanie','median time from order to dispatch'), '18,7 h',
                L('len na stave „Tovar odoslaný" — 4 928 z 5 679 objednávok','only on the "Shipped" status — 4,928 of 5,679 orders')]},
            {c:[L('Upozornenie','Caveat'), L('nezahŕňa marketing, mzdy ani réžiu','excludes marketing, payroll and overhead'), '—',
                ['no', L('NIE je čistý zisk','NOT net profit')]]}
          ],
          note:L('Definície a hodnoty na tejto obrazovke sú overené z e-shop exportu stats za júl 2026.','Definitions and values on this screen are verified from the July 2026 e-shop stats export.')},
        {t:'note', text:L('Marža sa v exporte zhoduje na 99,98 % s poľom „Marža objednávky" — malý rozdiel je zaokrúhľovanie. Zisk = marža − doprava − ďalšie priame poplatky; 5 278 € zo 16 882 € rozdielu export nerozpisuje na položky.','Margin matches the export\'s "Order margin" field to 99.98% — the small gap is rounding. Profit = margin − shipping − other direct fees; €5,278 of the €16,882 gap is not itemized by the export.')}
      ],
      ai:[
        {q:L('Ako sa počíta marža?','How is margin calculated?'),
         a:L('Marža = tržba mínus náklady tovaru. Za júl 2026 je to 66,1 %, so zlatom na 54,6 % a ostatnými kovmi na 77,4 %. Hodnota sa zhoduje s poľom v exporte na 99,98 %.','Margin = revenue minus cost of goods. For July 2026 it is 66.1%, with gold at 54.6% and other metals at 77.4%. The value matches the export field to 99.98%.'),
         cite:'appka', act:null},
        {q:L('Prečo zisk nie je čistý zisk?','Why isn\'t profit the net profit?'),
         a:L('Zisk = marža − doprava − priame poplatky (126 541 €), no nezahŕňa marketing, mzdy ani réžiu. Preto je v tabuľke explicitne označený ako „NIE čistý zisk".','Profit = margin − shipping − direct fees (€126,541), but it excludes marketing, payroll and overhead. That is why the table explicitly flags it as "NOT net profit".'),
         cite:'appka', act:null},
        {q:L('Prečo sa AOV a medián líšia?','Why do AOV and the median differ?'),
         a:L('AOV (38,21 €) je priemer skreslený drahšími objednávkami, medián (25,41 €) ukazuje strednú, typickú objednávku. Oba údaje sú overené.','AOV (€38.21) is a mean skewed by higher-value orders; the median (€25.41) shows the middle, typical order. Both figures are verified.'),
         cite:'pamäť', act:{l:L('Otvoriť koše','Open baskets'), k:'open'}}
      ]
    },

    /* ============ 12. NASTAVENIA ============ */
    {key:'nastavenia', icon:'gear', title:L('Nastavenia','Settings'),
      sub:L('Predvoľby reportu, exportu a upozornení.','Report, export and alert preferences.'),
      blocks:[
        {t:'form', title:L('Predvoľby reportu','Report preferences'),
          fields:[
            {l:L('Predvolené obdobie','Default period'), s:L('zobrazené pri otvorení appky','shown on app open'), type:'select', v:L('Aktuálny mesiac','Current month'), opts:[L('Aktuálny mesiac','Current month'),L('Aktuálny týždeň','Current week'),L('Vlastný rozsah','Custom range')]},
            {l:L('Mena zobrazenia','Display currency'), s:L('všetky trhy prepočítané na EUR','all markets converted to EUR'), type:'select', v:'EUR', opts:['EUR','HUF','RON']},
            {l:L('Zaokrúhľovanie percent','Percent rounding'), s:L('počet desatinných miest','number of decimal places'), type:'select', v:'1', opts:['0','1','2']},
            {l:L('Upozornenie na týždenný pokles','Weekly-drop alert'), s:L('notifikácia pri poklese > 10 % t/t','notify on a week-over-week drop > 10%'), type:'switch', v:'x', on:true}
          ], note:L('Ukážkové nastavenia — slúžia na demonštráciu obrazovky, nemenia overené čísla.','Illustrative settings — for screen demonstration only, they do not change verified figures.')},
        {t:'form', title:L('API a import','API & import'),
          fields:[
            {l:L('Interval synchronizácie','Sync interval'), s:L('Shop API konektor','Shop API connector'), type:'select', v:L('15 minút','15 minutes'), opts:[L('5 minút','5 minutes'),L('15 minút','15 minutes'),L('60 minút','60 minutes')]},
            {l:L('Formát CSV exportu','CSV export format'), s:L('BOM + bodkočiarka pre Excel SK','BOM + semicolon for Excel SK'), type:'switch', v:'x', on:true},
            {l:L('Upsert kľúč importu','Import upsert key'), s:L('č. objednávky, nezmeniteľné','order number, not editable'), type:'text', v:L('Č. objednávky','Order number')}
          ]},
        {t:'banner', tone:'ok', text:L('Shop API konektor je pripojený, posledná synchronizácia pred 3 min (orders, stats, shipping).','The Shop API connector is connected, last sync 3 min ago (orders, stats, shipping).')}
      ],
      ai:[
        {q:L('Ako často sa synchronizujú dáta?','How often does data sync?'),
         a:L('Predvolený interval Shop API konektora je 15 minút, sleduje endpointy orders, stats a shipping. Poslednú synchronizáciu vidno v Nastaveniach.','The Shop API connector\'s default interval is 15 minutes, covering the orders, stats and shipping endpoints. The last sync is visible in Settings.'),
         cite:'appka', act:null},
        {q:L('Dá sa zmeniť mena zobrazenia?','Can the display currency be changed?'),
         a:L('Áno, predvolene EUR, appka podporuje aj HUF a RON pre lokálne prehľady jednotlivých trhov.','Yes, EUR by default; the app also supports HUF and RON for local per-market views.'),
         cite:'appka', act:null},
        {q:L('Čo je upsert kľúč pri importe?','What is the import upsert key?'),
         a:L('Č. objednávky — unikátny identifikátor, podľa ktorého sa pri opakovanom importe CSV záznamy aktualizujú namiesto duplicitného vytvorenia.','The order number — a unique identifier that repeated CSV imports use to update records instead of creating duplicates.'),
         cite:'appka', act:{l:L('Otvoriť import','Open import'), k:'open'}}
      ]
    }
  ]
};
