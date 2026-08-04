const APP_LOGISTIKA = {
  key:'logistika', name:'Aura Logistika', port:'3020', icon:'truck',
  tag:L('Týždenná evidencia zásielok a reklamácií naprieč 8 krajinami a 5 prepravcami.','Weekly shipment and claims tracking across 8 countries and 5 carriers.'),
  feat:[
    L('Súhrny za ISO-týždeň × krajina × prepravca s upsertom a auditom','ISO-week × country × carrier summaries with upsert and audit'),
    L('Reklamačné prípady so životným cyklom a ∅/medián časom riešenia','Claim cases with a lifecycle and avg/median resolution time'),
    L('CSV import, XLSX export, tlač a SVG grafy s kĺzavým priemerom','CSV import, XLSX export, print and SVG charts with a moving average')
  ],
  live:{v:L('2 340 zásielok (W31, overené) · 37 reklamácií','2,340 shipments (W31, verified) · 37 claims'), tone:'cond', spark:[2.01,2.05,2.14,2.21,2.29,2.18,2.34]},

  api:{ endpoints:[
      {k:'shipping', l:L('Zásielky','Shipments'), ms:140},
      {k:'returns', l:L('Vrátenia a reklamácie','Returns & claims'), ms:165},
      {k:'carriers', l:L('Prepravcovia','Carriers'), ms:95}
    ], sync:L('pred 12 min','12 min ago'), tone:'ok' },

  imp:{ target:'zasielky',
    cols:[
      {k:'tyzden', l:L('Týždeň','Week'), t:'text'},
      {k:'krajina', l:L('Krajina','Country'), t:'text'},
      {k:'prepravca', l:L('Prepravca','Carrier'), t:'text'},
      {k:'odoslane', l:L('Odoslané','Shipped'), t:'num'},
      {k:'dorucene', l:L('Doručené','Delivered'), t:'num'}
    ],
    key:[L('kľúč upsertu: ISO-týždeň × krajina × prepravca','upsert key: ISO week × country × carrier')],
    csv:'tyzden;krajina;prepravca;odoslane;dorucene\nW31;SK;packeta;512;496\nW31;HU;gls;401;378\nW31;CZ;gls;348;247\nW31;RO;sps;265;170\nW31;PL;dpd;190;173\nW31;BG;posta;88;77\nW31;XX;gls;60;58\nW31;SI;dpd;45;44'
  },

  rep:{ templates:[
      {k:'tyzdenny', l:L('Týždenný report zásielok','Weekly shipment report'), s:L('KPI + graf odoslaných + tabuľka týždňa','KPIs + shipped chart + weekly table')},
      {k:'mesacny', l:L('Mesačný report','Monthly report'), s:L('Súhrn za mesiac naprieč krajinami a prepravcami + náklady na poštovné','Monthly summary across countries and carriers + postage costs')},
      {k:'reklamacie', l:L('Report reklamácií','Claims report'), s:L('Prípady, výsledky, Ø a medián času riešenia voči SLA','Cases, outcomes, avg/median resolution time vs SLA')}
    ] },

  screens:[
{ key:'reklamacie', icon:'warn', title:L('Reklamácie','Claims'),
  sub:L('Prípady so životným cyklom zahájené → doručené → vyriešené/stratené','Cases with a lifecycle of opened → returned → resolved/lost'),
  blocks:[
    {t:'kpis', items:[
      {l:L('Otvorené','Open'), v:int(8), sub:L('zahájené + čaká na posúdenie','opened + awaiting assessment'), tone:'cond'},
      {l:L('Vyriešené','Resolved'), v:int(16), tone:'ok'},
      {l:L('Stratené','Lost'), v:int(2), tone:'no'},
      {l:L('Ø / medián čas riešenia','Avg / median resolution time'), v:L('5,6 / 5 dní','5.6 / 5 days'), sub:L('vzorka 18 uzavretých prípadov','sample of 18 closed cases')}
    ]},
    {t:'donut', title:L('Vyriešené v SLA','Resolved within SLA'), pct:61, label:L('do 5 dní','within 5 days'),
      note:L('11 z 18 uzavretých prípadov vo vzorke · ukážkový výpočet','11 of 18 closed cases in the sample · illustrative calculation')},
    {t:'bars', title:L('Reklamácie podľa prepravcu','Claims by carrier'),
      data:[{l:'gls',v:7},{l:'dpd',v:6},{l:'posta',v:5},{l:'packeta',v:4},{l:'sps',v:4}],
      note:L('počty z tejto vzorky 26 prípadov, nie z celej histórie','counts from this 26-case sample, not the full history')},
    {t:'table', title:L('Prípady','Cases'),
      cols:['ID', L('Krajina','Country'), L('Prepravca','Carrier'), L('Stav','State'), L('Výsledok','Outcome'), L('Spôsob','Method'), L('Vinník','Fault'), L('Čas riešenia','Resolution time')],
      rows:[
        {id:'r312', go:'reklamacia', c:['R-2026-0312','HU','gls',['cond',L('zahájené','opened')],'—','—',L('prepravca','carrier'),L('4 dni','4 days')]},
        {id:'r311', go:'reklamacia', c:['R-2026-0311','BG','posta',['cond',L('zahájené','opened')],'—','—',L('prepravca','carrier'),L('2 dni','2 days')]},
        {id:'r309', go:'reklamacia', c:['R-2026-0309','SK','packeta',['info',L('doručené','delivered')],'—','—',L('e-shop','e-shop'),L('3 dni','3 days')]},
        {id:'r305', active:true, go:'reklamacia', c:['R-2026-0305','CZ','gls',['ok',L('vyriešené','resolved')],['ok',L('uznaná','accepted')],L('dobropis','credit note'),L('prepravca','carrier'),L('4 dni','4 days')]},
        {id:'r301', go:'reklamacia', c:['R-2026-0301','RO','sps',['ok',L('vyriešené','resolved')],['no',L('zamietnutá','rejected')],L('výmena','replacement'),L('zákazník','customer'),L('6 dní','6 days')]},
        {id:'r298', go:'reklamacia', c:['R-2026-0298','PL','dpd',['no',L('stratené','lost')],['ok',L('uznaná','accepted')],L('vrátenie peňazí','refund'),L('prepravca','carrier'),L('12 dní','12 days')]},
        {id:'r270', go:'reklamacia', c:['R-2026-0270','SK','posta',['ok',L('vyriešené','resolved')],['ok',L('uznaná','accepted')],L('dobropis','credit note'),L('prepravca','carrier'),L('5 dní','5 days')]},
        {id:'r272', go:'reklamacia', c:['R-2026-0272','CZ','packeta',['ok',L('vyriešené','resolved')],['ok',L('uznaná','accepted')],L('vrátenie peňazí','refund'),L('prepravca','carrier'),L('3 dni','3 days')]},
        {id:'r273', go:'reklamacia', c:['R-2026-0273','HU','dpd',['ok',L('vyriešené','resolved')],['no',L('zamietnutá','rejected')],'—',L('zákazník','customer'),L('7 dní','7 days')]},
        {id:'r275', go:'reklamacia', c:['R-2026-0275','RO','gls',['ok',L('vyriešené','resolved')],['ok',L('uznaná','accepted')],L('výmena','replacement'),L('prepravca','carrier'),L('4 dni','4 days')]},
        {id:'r276', go:'reklamacia', c:['R-2026-0276','PL','dpd',['ok',L('vyriešené','resolved')],['ok',L('uznaná','accepted')],L('dobropis','credit note'),L('prepravca','carrier'),L('6 dní','6 days')]},
        {id:'r278', go:'reklamacia', c:['R-2026-0278','BG','posta',['ok',L('vyriešené','resolved')],['ok',L('uznaná','accepted')],L('vrátenie peňazí','refund'),L('prepravca','carrier'),L('8 dní','8 days')]},
        {id:'r279', go:'reklamacia', c:['R-2026-0279','SI','dpd',['ok',L('vyriešené','resolved')],['no',L('zamietnutá','rejected')],'—',L('zákazník','customer'),L('5 dní','5 days')]},
        {id:'r281', go:'reklamacia', c:['R-2026-0281','HR','sps',['ok',L('vyriešené','resolved')],['ok',L('uznaná','accepted')],L('výmena','replacement'),L('prepravca','carrier'),L('4 dni','4 days')]},
        {id:'r282', go:'reklamacia', c:['R-2026-0282','SK','packeta',['ok',L('vyriešené','resolved')],['ok',L('uznaná','accepted')],L('dobropis','credit note'),L('prepravca','carrier'),L('2 dni','2 days')]},
        {id:'r284', go:'reklamacia', c:['R-2026-0284','CZ','gls',['ok',L('vyriešené','resolved')],['ok',L('uznaná','accepted')],L('dobropis','credit note'),L('prepravca','carrier'),L('5 dní','5 days')]},
        {id:'r286', go:'reklamacia', c:['R-2026-0286','HU','gls',['ok',L('vyriešené','resolved')],['ok',L('uznaná','accepted')],L('vrátenie peňazí','refund'),L('e-shop','e-shop'),L('3 dni','3 days')]},
        {id:'r287', go:'reklamacia', c:['R-2026-0287','RO','sps',['ok',L('vyriešené','resolved')],['no',L('zamietnutá','rejected')],'—',L('zákazník','customer'),L('9 dní','9 days')]},
        {id:'r289', go:'reklamacia', c:['R-2026-0289','PL','gls',['ok',L('vyriešené','resolved')],['ok',L('uznaná','accepted')],L('výmena','replacement'),L('prepravca','carrier'),L('4 dni','4 days')]},
        {id:'r291', go:'reklamacia', c:['R-2026-0291','BG','posta',['no',L('stratené','lost')],['ok',L('uznaná','accepted')],L('vrátenie peňazí','refund'),L('prepravca','carrier'),L('10 dní','10 days')]},
        {id:'r293', go:'reklamacia', c:['R-2026-0293','SI','dpd',['ok',L('vyriešené','resolved')],['ok',L('uznaná','accepted')],L('dobropis','credit note'),L('prepravca','carrier'),L('3 dni','3 days')]},
        {id:'r295', go:'reklamacia', c:['R-2026-0295','HR','sps',['info',L('doručené','delivered')],'—','—',L('e-shop','e-shop'),L('2 dni','2 days')]},
        {id:'r300', go:'reklamacia', c:['R-2026-0300','SK','posta',['cond',L('zahájené','opened')],'—','—',L('prepravca','carrier'),L('1 deň','1 day')]},
        {id:'r302', go:'reklamacia', c:['R-2026-0302','CZ','packeta',['cond',L('zahájené','opened')],'—','—',L('e-shop','e-shop'),L('1 deň','1 day')]},
        {id:'r303', go:'reklamacia', c:['R-2026-0303','HU','dpd',['info',L('doručené','delivered')],'—','—',L('zákazník','customer'),L('4 dni','4 days')]},
        {id:'r313', go:'reklamacia', c:['R-2026-0313','RO','gls',['cond',L('zahájené','opened')],'—','—',L('prepravca','carrier'),L('1 deň','1 day')]}
      ],
      note:L('R-2026-0312, 0311, 0309, 0305, 0301 a 0298 sú prenesené 1:1 z evidencie appky, zvyšných 20 prípadov je ukážková vzorka pre 25+ riadkov.','R-2026-0312, 0311, 0309, 0305, 0301 and 0298 carry over 1:1 from the app, the remaining 20 cases are an illustrative sample to reach 25+ rows.'),
      page:true},
    {t:'list', title:L('Prípady po SLA (nad 5 dní)','Cases past SLA (over 5 days)'), items:[
        {title:'R-2026-0298', sub:L('PL · dpd · stratené · plná náhrada','PL · dpd · lost · full compensation'), badge:['no','12 d'], meta:L('uzavreté','closed')},
        {title:'R-2026-0291', sub:L('BG · posta · stratené · vrátenie peňazí','BG · post · lost · refund'), badge:['no','10 d'], meta:L('uzavreté','closed')},
        {title:'R-2026-0287', sub:L('RO · sps · zamietnutá','RO · sps · rejected'), badge:['cond','9 d'], meta:L('uzavreté','closed')},
        {title:'R-2026-0278', sub:L('BG · posta · uznaná, vrátenie peňazí','BG · post · accepted, refund'), badge:['cond','8 d'], meta:L('uzavreté','closed')},
        {title:'R-2026-0273', sub:L('HU · dpd · zamietnutá','HU · dpd · rejected'), badge:['cond','7 d'], meta:L('uzavreté','closed')}
      ], note:L('ukážkový výber z 18 uzavretých prípadov vzorky','illustrative selection from the 18 closed cases in the sample')}
  ],
  ai:[
    {q:L('Koľko reklamácií je momentálne otvorených?','How many claims are currently open?'),
     a:L('8 z 26 zobrazených prípadov je v stave zahájené alebo doručené (čaká na posúdenie); zvyšných 18 je uzavretých ako vyriešené alebo stratené.','8 of the 26 shown cases are opened or delivered (awaiting assessment); the remaining 18 are closed as resolved or lost.'),
     cite:'appka', act:{l:L('Filtrovať otvorené','Filter open'), k:'filter'}},
    {q:L('Aký je priemerný čas riešenia?','What is the average resolution time?'),
     a:L('Priemer je 5,6 dňa, medián 5 dní na vzorke 18 uzavretých prípadov; v 5-dňovom SLA sa zmestilo 11 z 18 (61 %).','The average is 5.6 days, median 5 days, over a sample of 18 closed cases; 11 of 18 (61%) fit the 5-day SLA.'),
     cite:'appka', act:null},
    {q:L('Ktorý prepravca má najviac reklamácií?','Which carrier has the most claims?'),
     a:L('GLS so 7 prípadmi z 26 v tejto vzorke, nasleduje DPD so 6; najmenej packeta a SPS so 4.','GLS with 7 of the 26 cases in this sample, followed by DPD with 6; packeta and SPS have the fewest with 4.'),
     cite:'appka', act:null}
  ]
},
{ key:'reklamacia', icon:'flag', title:L('Reklamácia','Claim'),
  sub:L('Detail prípadu — priebeh, vinník, spôsob a výsledok riešenia','Case detail — timeline, fault, method and outcome'),
  blocks:[
    {t:'kpis', items:[
      {l:L('Stav','State'), v:L('Vyriešené','Resolved'), tone:'ok'},
      {l:L('Čas riešenia','Resolution time'), v:L('4 dni','4 days')},
      {l:L('SLA 5 dní','5-day SLA'), v:L('V SLA','Within SLA'), tone:'ok'},
      {l:L('Výsledok','Outcome'), v:L('Uznaná','Accepted'), tone:'ok'}
    ]},
    {t:'timeline', title:'R-2026-0305 · CZ · gls', items:[
      [L('Pred 4 dňami','4 days ago'), L('Reklamácia zahájená — poškodená zásielka','Claim opened — damaged parcel')],
      [L('Pred 3 dňami','3 days ago'), L('Prepravca kontaktovaný, žiadosť o vyjadrenie','Carrier contacted, statement requested')],
      [L('Pred 3 dňami','3 days ago'), L('Prepravca uznal škodu, náhrada schválená','Carrier accepted fault, compensation approved')],
      [L('Dnes','Today'), L('Dobropis vystavený a odoslaný zákazníkovi','Credit note issued and sent to the customer')]
    ]},
    {t:'donut', title:L('SLA čas vyčerpaný','SLA time used'), pct:100, label:L('vyriešené v SLA 5 dní','resolved within the 5-day SLA')},
    {t:'cards', n:2, items:[
      {title:'CZ', sub:L('Krajina','Country'), badge:['ok','gls'],
       lines:[[L('Prepravca','Carrier'),'gls'], [L('Odoslané (W31)','Shipped (W31)'), int(348)]]},
      {title:L('Vinník','Fault'), sub:L('prepravca','carrier'), badge:['no', L('prepravca','carrier')],
       lines:[[L('Spôsob','Method'), L('dobropis','credit note')], [L('Suma','Amount'), '—']]}
    ]}
  ],
  ai:[
    {q:L('Kto niesol vinu za túto reklamáciu?','Who was at fault for this claim?'),
     a:L('Prepravca (GLS) — poškodenie bolo uznané a vyriešené dobropisom do 4 dní, v rámci 5-dňového SLA.','The carrier (GLS) — the damage was accepted and resolved with a credit note within 4 days, inside the 5-day SLA.'),
     cite:'appka', act:null},
    {q:L('Ako dlho trvalo vyriešenie?','How long did the resolution take?'),
     a:L('4 dni od zahájenia po vystavenie dobropisu, čo je pod SLA hranicou 5 dní.','4 days from opening to issuing the credit note, which is under the 5-day SLA.'),
     cite:'appka', act:null},
    {q:L('Aký bol spôsob vyriešenia?','What was the resolution method?'),
     a:L('Dobropis (uznaná reklamácia) — prepravca prevzal zodpovednosť za poškodenú zásielku.','A credit note (accepted claim) — the carrier took responsibility for the damaged parcel.'),
     cite:'appka', act:null}
  ]
},
{ key:'vyvoj', icon:'trend', title:L('Vývoj','Trends'),
  sub:L('Odoslané zásielky po ISO-týždňoch, 12 týždňov s kĺzavým priemerom','Shipped parcels by ISO week, 12 weeks with a moving average'),
  blocks:[
    {t:'kpis', items:[
      {l:L('Odoslané (W31)','Shipped (W31)'), v:int(2340), sub:L('overené · maximum obdobia','verified · period maximum'), tone:'ok', live:true},
      {l:L('Priemer za 12 týždňov','12-week average'), v:int(2048)},
      {l:L('Najvyšší týždeň','Highest week'), v:'W31 · 2 340'},
      {l:L('Najnižší týždeň','Lowest week'), v:'W20 · 1 780'}
    ]},
    {t:'lines', title:L('Zásielky po týždňoch + kĺzavý priemer','Weekly parcels + moving average'),
      labels:['W20','W21','W22','W23','W24','W25','W26','W27','W28','W29','W30','W31'],
      series:[
        {l:L('Odoslané','Shipped'), v:[1780,1830,1870,1920,1960,2010,2050,2140,2210,2290,2180,2340], color:'var(--acc)'},
        {l:'GLS', v:[570,586,598,614,627,643,655,690,715,760,700,749], color:'var(--teal)'},
        {l:'packeta', v:[383,393,402,413,421,432,430,455,472,498,466,512], color:'var(--violet)'}
      ],
      avg:true,
      note:L('W26–W31 (vrátane rozpisu GLS/packeta) sú prenesené 1:1 z evidencie appky, W31 celkom = 2 340 (overené); W20–W25 sú ukážkový dopočet do 12 týždňov.','W26–W31 (including the GLS/packeta split) carry over 1:1 from the app, W31 total = 2,340 (verified); W20–W25 are an illustrative extension to 12 weeks.')},
    {t:'bars', title:L('Podiel prepravcov na objeme — W31','Carrier share of volume — W31'),
      data:[{l:'GLS',v:749},{l:'packeta',v:512},{l:L('ostatní','others'),v:1079}],
      note:L('GLS a packeta sú overené, „ostatní" je dopočet do overeného celku 2 340','GLS and packeta are verified, "others" is a residual computed to the verified total of 2,340')}
  ],
  ai:[
    {q:L('Ako sa vyvíjal objem zásielok za posledných 12 týždňov?','How has shipment volume trended over the last 12 weeks?'),
     a:L('Rástol z 1 780 (W20) na 2 340 (W31), priemer za obdobie je 2 048 zásielok/týždeň; W31 je zároveň overené maximum.','It grew from 1,780 (W20) to 2,340 (W31), averaging 2,048 shipments/week; W31 is also the verified maximum.'),
     cite:'appka', act:null},
    {q:L('Aký je podiel GLS na celkovom objeme?','What is GLS\'s share of total volume?'),
     a:L('GLS mala vo W31 749 zásielok z 2 340, teda cca 32 % objemu — najviac zo všetkých prepravcov.','GLS had 749 of 2,340 shipments in W31, about 32% of volume — the most of any carrier.'),
     cite:'appka', act:null},
    {q:L('Je trend rastúci?','Is the trend upward?'),
     a:L('Väčšinou áno, okrem poklesu vo W30 (2 180), po ktorom nasledoval opätovný rast vo W31 (+7,3 % medzitýždenne).','Mostly yes, aside from a dip in W30 (2,180), followed by renewed growth in W31 (+7.3% week over week).'),
     cite:'appka', act:null}
  ]
},
{ key:'stavy', icon:'list', title:L('Stavy','States'),
  sub:L('Rozdelenie zásielok podľa stavu po ISO-týždňoch, 12 týždňov','Breakdown of parcels by state by ISO week, 12 weeks'),
  blocks:[
    {t:'kpis', items:[
      {l:L('Doručené (W31)','Delivered (W31)'), v:L('94,1 %','94.1%'), tone:'ok', sub:L('overené','verified')},
      {l:L('Na ceste (W31)','In transit (W31)'), v:L('3,1 %','3.1%'), tone:'cond'},
      {l:L('Výdajňa (W31)','Pickup point (W31)'), v:L('1,6 %','1.6%'), tone:'info'},
      {l:L('Vrátené + stratené (W31)','Returned + lost (W31)'), v:L('1,2 %','1.2%'), tone:'cond'}
    ]},
    {t:'stack', title:L('Mix stavov po týždňoch','State mix by week'),
      labels:['W20','W21','W22','W23','W24','W25','W26','W27','W28','W29','W30','W31'],
      series:[
        {l:L('Doručené','Delivered'), tone:'var(--good)', v:[1673,1720,1758,1805,1842,1889,1925,2010,2075,2150,2040,2202]},
        {l:L('Na ceste','In transit'), tone:'var(--amber)', v:[59,60,62,63,65,66,70,72,75,78,80,73]},
        {l:L('Výdajňa','Pickup point'), tone:'var(--violet)', v:[28,29,30,31,31,32,33,36,38,40,36,37]},
        {l:L('Vrátené + stratené','Returned + lost'), tone:'var(--red)', v:[20,21,20,21,22,23,22,22,22,22,24,28]}
      ],
      note:L('W26–W31 sú prenesené 1:1 z evidencie appky (W31 doručenosť 94,1 % overené); W20–W25 sú ukážkový dopočet zachovávajúci rovnaký pomer stavov.','W26–W31 carry over 1:1 from the app (W31 delivery rate 94.1% verified); W20–W25 are an illustrative extension keeping the same state ratio.')},
    {t:'table', title:L('Mix stavov (W31)','State mix (W31)'), cols:[L('Stav','State'), L('Podiel','Share')],
      rows:[
        {c:[['ok',L('doručené','delivered')], L('94,1 %','94.1%')]},
        {c:[['cond',L('na ceste','in transit')], L('3,1 %','3.1%')]},
        {c:[['info',L('výdajňa','pickup point')], L('1,6 %','1.6%')]},
        {c:[['cond',L('vrátené','returned')], L('0,9 %','0.9%')]},
        {c:[['no',L('stratené','lost')], L('0,3 %','0.3%')]}
      ], note:L('overené — súčet dáva 100 %','verified — the total sums to 100%')}
  ],
  ai:[
    {q:L('Aký je pomer stavov vo W31?','What is the state mix in W31?'),
     a:L('94,1 % doručené, 3,1 % na ceste, 1,6 % výdajňa, 0,9 % vrátené, 0,3 % stratené — súčet sedí na 100 % (overené).','94.1% delivered, 3.1% in transit, 1.6% pickup point, 0.9% returned, 0.3% lost — sums to 100% (verified).'),
     cite:'appka', act:null},
    {q:L('Rastie podiel vrátených a stratených zásielok?','Is the share of returned and lost parcels rising?'),
     a:L('Mierne áno — z 22 (W26) na 28 (W30/W31), čo súvisí s konkrétnymi prípadmi v PL (nevyzdvihnutá dobierka) a BG (stratená zásielka).','Slightly yes — from 22 (W26) to 28 (W30/W31), tied to specific cases in PL (uncollected COD) and BG (a lost parcel).'),
     cite:'appka', act:{l:L('Otvoriť Reklamácie','Open Claims'), k:'open'}},
    {q:L('Kedy bol podiel doručených najvyšší?','When was the delivered share highest?'),
     a:L('Vo W31 s 2 202 doručenými kusmi z 2 340 (94,1 %), čo je zároveň overené maximum obdobia.','In W31 with 2,202 delivered of 2,340 (94.1%), which is also the verified maximum for the period.'),
     cite:'appka', act:null}
  ]
},
{ key:'prepravcovia', icon:'swap', title:L('Prepravcovia','Carriers'),
  sub:L('5 prepravcov — objem, cena, doručenosť a zmluvné minimum','5 carriers — volume, price, delivery rate and contracted minimum'),
  blocks:[
    {t:'kpis', items:[
      {l:L('Prepravcovia','Carriers'), v:int(5)},
      {l:L('Najväčší objem (W31)','Largest volume (W31)'), v:'GLS · 749', tone:'cond'},
      {l:L('Najlepšia doručenosť (W31)','Best delivery rate (W31)'), v:'packeta · 96,1 %', tone:'ok'},
      {l:L('Zmluvné minimum GLS','GLS contracted minimum'), v:L('~280 / deň','~280 / day'), sub:L('overené','verified'), tone:'cond'}
    ]},
    {t:'bars', title:L('Objem podľa prepravcu — W31','Volume by carrier — W31'),
      data:[{l:'gls',v:749},{l:'packeta',v:512},{l:'sps',v:265},{l:'dpd',v:190},{l:'posta',v:88}],
      note:L('overené (widget appky za W31)','verified (app widget for W31)')},
    {t:'table', title:L('Prehľad prepravcov — W31','Carrier overview — W31'),
      cols:[L('Prepravca','Carrier'), L('Objem','Volume'), L('Ø cena / zásielka','Avg price / parcel'), L('Doručenosť','Delivery rate'), L('Ø dní','Avg days'), L('Stav','Status')],
      rows:[
        {c:['packeta', int(512), L('2,99 €','€2.99'), L('96,1 %','96.1%'), L('2,1 d','2.1 d'), ['ok', L('doručené','delivered')]]},
        {c:['gls', int(749), L('4,20 €','€4.20'), L('93,4 %','93.4%'), L('2,8 d','2.8 d'), ['cond', L('sleduj objem','watch volume')]]},
        {c:['sps', int(265), L('3,80 €','€3.80'), L('94,7 %','94.7%'), L('3,0 d','3.0 d'), ['ok', L('doručené','delivered')]]},
        {c:['dpd', int(190), L('4,50 €','€4.50'), L('91,2 %','91.2%'), L('3,4 d','3.4 d'), ['cond', L('vrátené ↑','returns ↑')]]},
        {c:['posta', int(88), L('3,30 €','€3.30'), L('88,5 %','88.5%'), L('4,2 d','4.2 d'), ['no', L('1 stratená','1 lost')]]}
      ],
      note:L('Objem a doručenosť sú z widgetu appky (ukážkové okrem overeného celku W31); cena za packetu ~2,99 € je bežná trhová referencia, ostatné ceny sú ukážkové.','Volume and delivery rate are from the app widget (illustrative aside from the verified W31 total); packeta\'s price of ~€2.99 is a common market reference, other prices are illustrative.')},
    {t:'banner', tone:'cond', text:L('GLS vyžaduje min. 80 % zo zmluvného objemu 350 zásielok/deň (~280/deň) v auguste — inak hrozí zdraženie. Priemer W31 je cca 107 zásielok/deň (749/7), teda pod hranicou. (overené)','GLS requires at least 80% of the contracted 350 parcels/day (~280/day) in August — otherwise prices may rise. The W31 average is about 107 parcels/day (749/7), below the threshold. (verified)')}
  ],
  ai:[
    {q:L('Plní GLS zmluvné minimum?','Is GLS meeting the contracted minimum?'),
     a:L('Nie — priemer W31 je cca 107 zásielok/deň, kým zmluva vyžaduje aspoň 80 % z 350/deň (~280/deň); riziko zdraženia od septembra.','No — the W31 average is about 107 parcels/day, while the contract requires at least 80% of 350/day (~280/day); risk of a price increase from September.'),
     cite:'pamäť', act:null},
    {q:L('Ktorý prepravca má najvyššiu doručenosť?','Which carrier has the highest delivery rate?'),
     a:L('Packeta s 96,1 %, pred SPS (94,7 %) a GLS (93,4 %); najnižšiu má pošta s 88,5 %.','Packeta with 96.1%, ahead of SPS (94.7%) and GLS (93.4%); the lowest is the post office at 88.5%.'),
     cite:'appka', act:null},
    {q:L('Koľko stojí v priemere jedna zásielka podľa prepravcu?','What does a parcel cost on average by carrier?'),
     a:L('Packeta je najlacnejšia s bežnou referenciou ~2,99 €, DPD najdrahšie ~4,50 € — okrem packety sú ceny ukážkové.','Packeta is the cheapest at a common reference of ~€2.99, DPD the most expensive at ~€4.50 — aside from packeta, prices are illustrative.'),
     cite:'ukážka', act:null}
  ]
},
{ key:'krajiny', icon:'pin', title:L('Krajiny','Countries'),
  sub:L('8 krajín — objem, doručenosť, vrátky a priemerná doba doručenia','8 countries — volume, delivery rate, returns and average delivery time'),
  blocks:[
    {t:'kpis', items:[
      {l:L('Krajín','Countries'), v:int(8)},
      {l:L('Najvyššia doručenosť','Highest delivery rate'), v:'SK · 96,5 %', tone:'ok'},
      {l:L('Najviac vrátok/strát','Most returns/losses'), v:'PL · 8,9 %', sub:L('overené (17 zo 190 vo W30)','verified (17 of 190 in W30)'), tone:'cond'},
      {l:L('Priemerná doba doručenia','Average delivery time'), v:L('3,0 d','3.0 d'), sub:L('ukážkový priemer 8 krajín','illustrative average of 8 countries')}
    ]},
    {t:'table', title:L('Prehľad krajín — W31','Country overview — W31'),
      cols:[L('Krajina','Country'), L('Objem','Volume'), L('Doručenosť','Delivery rate'), L('Vrátky/straty','Returns/losses'), L('Ø doba doručenia','Avg delivery time')],
      rows:[
        {c:['SK', int(512), L('96,5 %','96.5%'), L('0,6 %','0.6%'), L('2,3 d','2.3 d')]},
        {c:['HU', int(401), L('95,0 %','95.0%'), L('0,7 %','0.7%'), L('2,6 d','2.6 d')]},
        {c:['CZ', int(348), L('93,0 %','93.0%'), L('0,8 %','0.8%'), L('2,9 d','2.9 d')]},
        {c:['RO', int(265), L('92,5 %','92.5%'), L('0,9 %','0.9%'), L('3,1 d','3.1 d')]},
        {c:['PL', int(190), L('86,5 %','86.5%'), L('8,9 %','8.9%'), L('3,3 d','3.3 d')]},
        {c:['BG', int(88), L('89,0 %','89.0%'), L('1,1 %','1.1%'), L('4,1 d','4.1 d')]},
        {c:['SI', int(45), L('94,0 %','94.0%'), L('0,5 %','0.5%'), L('2,7 d','2.7 d')]},
        {c:['HR', int(39), L('93,5 %','93.5%'), L('0,6 %','0.6%'), L('2,8 d','2.8 d')]}
      ],
      note:L('Objem SK–BG a PL vrátky 8,9 % (17 zo 190 vo W30) sú prenesené z evidencie appky; doručenosť, ostatné vrátky a Ø doba doručenia sú ukážkové, SI a HR sú nová ukážková krajina v tabuľke.','SK–BG volume and PL returns of 8.9% (17 of 190 in W30) carry over from the app; delivery rate, other returns and avg delivery time are illustrative, SI and HR are newly added illustrative countries.')}
  ],
  ai:[
    {q:L('Ktorá krajina má najvyššie vrátky?','Which country has the highest returns?'),
     a:L('Poľsko s 8,9 % (17 z 190 zásielok vo W30 cez DPD) — reálne zistený nárast pri neprevzatých dobierkach.','Poland with 8.9% (17 of 190 parcels in W30 via DPD) — a genuine increase tied to uncollected COD.'),
     cite:'appka', act:{l:L('Otvoriť Zásielky','Open Shipments'), k:'open'}},
    {q:L('Aká je doručenosť v SK?','What is the delivery rate in SK?'),
     a:L('Okolo 96,5 % — nad celkovým priemerom appky 94,1 % (W31, overené).','About 96.5% — above the app-wide W31 average of 94.1% (verified).'),
     cite:'appka', act:null},
    {q:L('Ktorá krajina má najdlhšiu dobu doručenia?','Which country has the longest delivery time?'),
     a:L('Bulharsko s cca 4,1 dňa v priemere, čo súvisí aj s nižšou doručenosťou 89 % a jednou stratenou zásielkou vo W30.','Bulgaria at about 4.1 days on average, tied to a lower 89% delivery rate and one lost parcel in W30.'),
     cite:'ukážka', act:null}
  ]
},
{ key:'import', icon:'dl', title:L('Import','Import'),
  sub:L('História CSV importov týždenných súhrnov, chyby a upsert kľúč','History of weekly-summary CSV imports, errors and the upsert key'),
  blocks:[
    {t:'kpis', items:[
      {l:L('Importov spolu','Total imports'), v:int(24), sub:L('posledných 10 zobrazených','last 10 shown')},
      {l:L('Úspešnosť riadkov','Row success rate'), v:L('98,2 %','98.2%'), tone:'ok'},
      {l:L('Posledný import','Last import'), v:'01.08.2026'},
      {l:L('Otvorené chyby','Open errors'), v:int(2), tone:'cond'}
    ]},
    {t:'table', title:L('História importov','Import history'),
      cols:[L('Dátum','Date'), L('Súbor','File'), L('Riadkov','Rows'), L('Úspešné','Successful'), L('Chyby','Errors'), L('Stav','Status')],
      rows:[
        {c:['01.08.2026','shipments_w31.csv', int(36), int(34), int(2), ['cond',L('čiastočne','partial')]]},
        {c:['25.07.2026','shipments_w30.csv', int(34), int(34), int(0), ['ok','OK']]},
        {c:['18.07.2026','shipments_w29.csv', int(34), int(33), int(1), ['cond',L('čiastočne','partial')]]},
        {c:['11.07.2026','shipments_w28.csv', int(34), int(34), int(0), ['ok','OK']]},
        {c:['04.07.2026','shipments_w27.csv', int(34), int(34), int(0), ['ok','OK']]},
        {c:['27.06.2026','shipments_w26.csv', int(34), int(32), int(2), ['cond',L('čiastočne','partial')]]},
        {c:['20.06.2026','shipments_w25.csv', int(30), int(30), int(0), ['ok','OK']]},
        {c:['13.06.2026','shipments_w24.csv', int(30), int(29), int(1), ['cond',L('čiastočne','partial')]]},
        {c:['06.06.2026','shipments_w23.csv', int(30), int(30), int(0), ['ok','OK']]},
        {c:['30.05.2026','shipments_w22.csv', int(30), int(30), int(0), ['ok','OK']]}
      ], note:L('ukážková história, posledných 10 z ~24 importov','illustrative history, last 10 of ~24 imports')},
    {t:'list', title:L('Chyby posledného importu','Errors in the last import'), items:[
        {title:L('Riadok 7','Row 7'), sub:L('Neznámy kód krajiny „XX" — očakávané SK, CZ, HU, RO, SI, HR, PL, BG','Unknown country code "XX" — expected SK, CZ, HU, RO, SI, HR, PL, BG'), badge:['no', L('chyba','error')], meta:'shipments_w31.csv'},
        {title:L('Riadok 22','Row 22'), sub:L('Chýba hodnota „prepravca"','Missing "carrier" value'), badge:['no', L('chyba','error')], meta:'shipments_w31.csv'}
      ]},
    {t:'note', text:L('Kľúč upsertu: ISO-týždeň × krajina × prepravca. Riadok so zhodným kľúčom prepíše existujúci záznam a zapíše sa do auditu, chybné riadky sa neuložia.','Upsert key: ISO week × country × carrier. A row with a matching key overwrites the existing record and is logged to the audit trail; invalid rows are not saved.')}
  ],
  ai:[
    {q:L('Kedy prebehol posledný import?','When was the last import?'),
     a:L('1. 8. 2026 — 36 riadkov, 34 úspešných, 2 s chybou (neplatný kód krajiny a chýbajúci prepravca).','Aug 1, 2026 — 36 rows, 34 successful, 2 with an error (invalid country code and a missing carrier).'),
     cite:'import', act:null},
    {q:L('Aký je kľúč upsertu pri importe?','What is the upsert key on import?'),
     a:L('ISO-týždeň × krajina × prepravca — pri zhode kľúča sa riadok prepíše, inak sa vytvorí nový.','ISO week × country × carrier — a matching key overwrites the row, otherwise a new one is created.'),
     cite:'import', act:null},
    {q:L('Aká je celková úspešnosť importov?','What is the overall import success rate?'),
     a:L('98,2 % riadkov sa naimportuje bez chyby na základe histórie posledných 10 dávok (330 z 336 riadkov).','98.2% of rows import without error based on the history of the last 10 batches (330 of 336 rows).'),
     cite:'import', act:null}
  ]
},
{ key:'audit', icon:'shield', title:L('Audit','Audit'),
  sub:L('Záznam zmien — upserty, importy, reklamácie a nastavenia','Change log — upserts, imports, claims and settings'),
  blocks:[
    {t:'kpis', items:[
      {l:L('Udalostí (7 dní)','Events (7 days)'), v:int(10)},
      {l:L('Import','Import'), v:int(3)},
      {l:L('Zmeny reklamácií','Claim changes'), v:int(2)},
      {l:L('Zálohy','Backups'), v:int(1), tone:'ok'}
    ]},
    {t:'table', title:L('Posledné záznamy','Recent entries'),
      cols:[L('Dátum a čas','Date & time'), L('Používateľ','User'), L('Akcia','Action'), L('Cieľ','Target'), L('Poznámka','Note')],
      rows:[
        {c:['04.08.2026 08:12','admin@sperky-eshop.sk', L('Upsert riadku','Row upsert'), 'W31 · SK · packeta', L('CSV import — aktualizované len odoslané/doručené','CSV import — only shipped/delivered updated')]},
        {c:['01.08.2026 09:03','admin@sperky-eshop.sk', L('CSV import','CSV import'), 'shipments_w31.csv', L('36 riadkov, 2 chyby','36 rows, 2 errors')]},
        {c:['31.07.2026 14:21','hajnalka@sperky-eshop.sk', L('Zmena stavu reklamácie','Claim status change'), 'R-2026-0305', L('zahájené → vyriešené','opened → resolved')]},
        {c:['30.07.2026 16:40','hajnalka@sperky-eshop.sk', L('Nová reklamácia','New claim'), 'R-2026-0313', L('RO · gls · zahájená','RO · gls · opened')]},
        {c:['29.07.2026 10:15','admin@sperky-eshop.sk', L('Export XLSX','XLSX export'), L('Týždenný report W30','Weekly report W30'), '—']},
        {c:['28.07.2026 11:02','admin@sperky-eshop.sk', L('Zmena nastavenia','Setting change'), L('Zmluvné minimum GLS','GLS contracted minimum'), L('Poznámka doplnená z porady s dopravcom','Note added from a carrier call')]},
        {c:['25.07.2026 09:00','admin@sperky-eshop.sk', L('CSV import','CSV import'), 'shipments_w30.csv', L('34 riadkov, 0 chýb','34 rows, 0 errors')]},
        {c:['22.07.2026 13:47','hajnalka@sperky-eshop.sk', L('Uzavretie prípadu','Case closed'), 'R-2026-0298', L('stratené — plná náhrada','lost — full compensation')]},
        {c:['18.07.2026 09:00','admin@sperky-eshop.sk', L('CSV import','CSV import'), 'shipments_w29.csv', L('34 riadkov, 1 chyba','34 rows, 1 error')]},
        {c:['15.07.2026 08:30','admin@sperky-eshop.sk', L('Záloha databázy','Database backup'), L('Plánovaná záloha','Scheduled backup'), L('Test obnovy OK','Restore test OK')]}
      ], note:L('ukážkový výber udalostí, appka loguje každú zmenu evidencie','illustrative selection of events, the app logs every registry change')}
  ],
  ai:[
    {q:L('Kto naposledy upravil súhrn zásielok?','Who last edited a shipment summary?'),
     a:L('admin@sperky-eshop.sk cez upsert riadku W31 · SK · packeta počas importu 1. 8. 2026.','admin@sperky-eshop.sk via an upsert of row W31 · SK · packeta during the Aug 1, 2026 import.'),
     cite:'appka', act:null},
    {q:L('Eviduje appka zmeny reklamácií?','Does the app log claim changes?'),
     a:L('Áno — zmeny stavu (napr. zahájené → vyriešené) aj uzavretie prípadu sa zapisujú do auditu s používateľom a časom.','Yes — status changes (e.g. opened → resolved) and case closures are logged with the user and timestamp.'),
     cite:'appka', act:null},
    {q:L('Ako dlho sa uchováva audit log?','How long is the audit log retained?'),
     a:L('Táto vzorka zobrazuje posledných 10 udalostí za cca 3 týždne; appka loguje priebežne pri každej zmene evidencie.','This sample shows the last 10 events over about 3 weeks; the app logs continuously on every registry change.'),
     cite:'ukážka', act:null}
  ]
},
{ key:'nastavenia', icon:'gear', title:L('Nastavenia','Settings'),
  sub:L('Evidencia, dáta a výstupy, jazyk a prístup','Registry, data and outputs, language and access'),
  blocks:[
    {t:'form', title:L('Evidencia','Registry'), fields:[
      {l:L('Povinné krajiny','Required countries'), s:L('presne 8, nemenné','exactly 8, fixed'), type:'text', v:'SK · CZ · HU · RO · SI · HR · PL · BG'},
      {l:L('Prepravcovia','Carriers'), s:L('voliteľný výber z 5','optional pick of 5'), type:'text', v:'packeta · posta · gls · sps · dpd'},
      {l:L('Upsert + audit','Upsert + audit'), s:L('unikátny kľúč týždeň × krajina × prepravca','unique key week × country × carrier'), type:'switch', on:true}
    ]},
    {t:'form', title:L('Dáta a výstupy','Data & outputs'), fields:[
      {l:L('CSV import','CSV import'), s:L('týždenné súhrny','weekly summaries'), type:'switch', on:true},
      {l:L('XLSX export + tlač','XLSX export + print'), s:L('výstupy pre týždennú poradu','outputs for the weekly meeting'), type:'switch', on:true},
      {l:L('Zálohy','Backups'), s:L('skript s testovaným restore','script with a tested restore'), type:'switch', on:true}
    ]},
    {t:'form', title:L('Jazyk, vzhľad a prístup','Language, appearance & access'), fields:[
      {l:L('Jazyk','Language'), s:'SK · EN', type:'select', v:'SK', opts:['SK','EN']},
      {l:'Dark mode', s:L('predvolená tmavá téma','dark theme by default'), type:'switch', on:true},
      {l:L('Roly','Roles'), s:L('Admin · Editor · Viewer','Admin · Editor · Viewer'), type:'text', v:L('3 roly','3 roles')}
    ]},
    {t:'note', text:L('Zmena hesla a rolí je self-service z tejto obrazovky (mimo rozsahu tejto ukážky dát).','Password and role changes are self-service from this screen (outside the scope of this data sample).')}
  ],
  ai:[
    {q:L('Ktoré krajiny appka vyžaduje?','Which countries does the app require?'),
     a:L('8 povinných krajín: SK, CZ, HU, RO, SI, HR, PL, BG; prepravca je voliteľný z piatich (packeta, pošta, GLS, SPS, DPD).','8 required countries: SK, CZ, HU, RO, SI, HR, PL, BG; the carrier is an optional pick of five (packeta, post, GLS, SPS, DPD).'),
     cite:'appka', act:null},
    {q:L('Ako funguje upsert?','How does upsert work?'),
     a:L('Unikátny kľúč je týždeň × krajina × prepravca — opakovaný import rovnakého kľúča prepíše existujúci riadok a zapíše sa do auditu, nevytvorí duplicitu.','The unique key is week × country × carrier — re-importing the same key overwrites the existing row and logs it to the audit trail, without creating a duplicate.'),
     cite:'appka', act:null},
    {q:L('Dá sa appka prepnúť do angličtiny?','Can the app be switched to English?'),
     a:L('Áno, prepínač jazyka SK/EN je v sekcii Jazyk, vzhľad a prístup spolu s tmavým režimom.','Yes, the SK/EN language switch is in the Language, appearance & access section alongside dark mode.'),
     cite:'appka', act:null}
  ]
},
{ key:'prehlad', icon:'home', title:L('Prehľad','Overview'),
  sub:L('Denný pohľad na odoslané zásielky, doručenosť a otvorené reklamácie','Daily view of shipped parcels, delivery rate and open claims'),
  blocks:[
    {t:'kpis', items:[
      {l:L('Odoslané (W31)','Shipped (W31)'), v:int(2340), sub:L('overené · ISO-týždeň 31','verified · ISO week 31'), tone:'ok', live:true},
      {l:L('Doručenosť (W31)','Delivery rate (W31)'), v:L('94,1 %','94.1%'), sub:L('overené','verified'), tone:'ok'},
      {l:L('Otvorené reklamácie','Open claims'), v:int(37), sub:L('zahájené + čakajú na posúdenie','opened + awaiting assessment'), tone:'cond'},
      {l:L('Poštovné (júl)','Postage (July)'), v:cur(11603), sub:L('náklad dopravy z e-shop dát · overené','shipping cost from e-shop data · verified')}
    ]},
    {t:'bars', title:L('Odoslané podľa krajín — W31','Shipped by country — W31'),
      data:[{l:'SK',v:512},{l:'HU',v:401},{l:'CZ',v:348},{l:'RO',v:265},{l:'PL',v:190},{l:'BG',v:88},{l:'SI',v:45},{l:'HR',v:39}],
      note:L('Celkový súčet 2 340 je overený; rozpis podľa 8 krajín je ukážková podmnožina a nesčíta sa presne na celok','Total of 2,340 is verified; the 8-country breakdown is an illustrative subset and does not sum exactly to the total')},
    {t:'donut', title:L('Reklamácie v riešení','Claims in progress'), pct:87, label:L('v SLA 5 dní','within 5-day SLA'),
      note:L('32 v SLA, 5 po SLA · ukážkový rozpad z 37 otvorených','32 within SLA, 5 past SLA · illustrative split of the 37 open')},
    {t:'list', title:L('Posledné udalosti','Recent events'), items:[
        {title:L('W31 · SK · packeta','W31 · SK · packeta'), sub:L('Súhrn týždňa uzavretý (upsert + audit)','Weekly summary closed (upsert + audit)'), badge:['ok', L('doručené','delivered')], meta:'W31'},
        {title:'R-2026-0313', sub:L('RO · gls — reklamácia zahájená','RO · gls — claim opened'), badge:['cond', L('zahájené','opened')], meta:L('dnes','today')},
        {title:L('W31 · CZ · gls','W31 · CZ · gls'), sub:L('98 zásielok stále na ceste','98 parcels still in transit'), badge:['cond', L('na ceste','in transit')], meta:'W31'},
        {title:L('W30 · BG · pošta','W30 · BG · post'), sub:L('1 zásielka označená ako stratená → R-2026-0311','1 parcel marked lost → R-2026-0311'), badge:['no', L('stratené','lost')], meta:'W30'},
        {title:L('Import shipments_w31.csv','Import shipments_w31.csv'), sub:L('36 riadkov, 2 chyby','36 rows, 2 errors'), badge:['cond', L('čiastočne','partial')], meta:'01.08.'}
      ], note:L('ukážkový výber, appka eviduje viac udalostí v audite','illustrative selection, the app logs more events in the audit trail')},
    {t:'banner', tone:'cond', text:L('GLS vyžaduje min. 80 % zo zmluvného objemu 350 zásielok/deň (~280/deň) v auguste — inak hrozí zdraženie. (overené)','GLS requires at least 80% of the contracted 350 parcels/day (~280/day) in August — otherwise prices may rise. (verified)')}
  ],
  ai:[
    {q:L('Aká je aktuálna doručenosť?','What is the current delivery rate?'),
     a:L('94,1 % za W31 (overené) — nad hranicou 90 %, ale mix stavov sa sleduje po týždňoch, lebo podiel vrátených a stratených mierne rastie.','94.1% for W31 (verified) — above the 90% threshold, but the state mix is tracked weekly since the returned/lost share is creeping up.'),
     cite:'appka', act:{l:L('Otvoriť Vývoj','Open Trends'), k:'open'}},
    {q:L('Koľko reklamácií je otvorených?','How many claims are open?'),
     a:L('37 otvorených reklamácií, z toho podľa vzorky cca 32 v 5-dňovom SLA a 5 po SLA.','37 open claims, of which per the sample about 32 are within the 5-day SLA and 5 are past it.'),
     cite:'appka', act:{l:L('Otvoriť Reklamácie','Open Claims'), k:'open'}},
    {q:L('Plní GLS zmluvný objem?','Is GLS meeting its contracted volume?'),
     a:L('Nie celkom — zmluva vyžaduje aspoň ~280 zásielok/deň, priemer W31 je len cca 107/deň (749/7). Riziko zdraženia v auguste.','Not quite — the contract needs at least ~280 parcels/day, W31 averages only about 107/day (749/7). Risk of a price increase in August.'),
     cite:'pamäť', act:{l:L('Otvoriť Prepravcovia','Open Carriers'), k:'open'}}
  ]
},
{ key:'zasielky', icon:'truck', title:L('Zásielky','Shipments'),
  sub:L('Súhrnné riadky týždeň × krajina × prepravca s upsertom (unikátny kľúč)','Summary rows by week × country × carrier with upsert (unique key)'),
  blocks:[
    {t:'kpis', items:[
      {l:L('Odoslané (W31)','Shipped (W31)'), v:int(2340), sub:L('overené','verified'), tone:'ok'},
      {l:L('Doručenosť (W31)','Delivery rate (W31)'), v:L('94,1 %','94.1%'), sub:L('overené','verified'), tone:'ok'},
      {l:L('Riadkov v tabuľke','Rows in table'), v:int(36), sub:L('vzorka W29–W31','W29–W31 sample')},
      {l:L('Rozsah evidencie','Coverage'), v:L('8 krajín × 5 prepravcov','8 countries × 5 carriers')}
    ]},
    {t:'table', title:L('Súhrny podľa týždňa','Weekly summaries'),
      cols:[L('Týždeň','Week'), L('Krajina','Country'), L('Prepravca','Carrier'), L('Odoslané','Shipped'), L('Stav','State'), L('Hodnota','Value')],
      rows:[
        {id:'w31sk', go:'zasielka', c:['W31','SK','packeta', int(512), ['ok',L('doručené','delivered')], cur(18400)]},
        {id:'w31sk-posta', go:'zasielka', c:['W31','SK','posta', int(81), ['ok',L('doručené','delivered')], cur(2910)]},
        {id:'w31cz', go:'zasielka', c:['W31','CZ','gls', int(348), ['cond',L('na ceste','in transit')], cur(12100)]},
        {id:'w31cz-packeta', go:'zasielka', c:['W31','CZ','packeta', int(39), ['ok',L('doručené','delivered')], cur(1360)]},
        {id:'w31hu', go:'zasielka', c:['W31','HU','gls', int(401), ['ok',L('doručené','delivered')], cur(15900)]},
        {id:'w31hu-dpd', go:'zasielka', c:['W31','HU','dpd', int(60), ['ok',L('doručené','delivered')], cur(2380)]},
        {id:'w31ro', go:'zasielka', c:['W31','RO','sps', int(265), ['info',L('výdajňa','pickup point')], cur(9700)]},
        {id:'w31ro-gls', go:'zasielka', c:['W31','RO','gls', int(33), ['ok',L('doručené','delivered')], cur(1210)]},
        {id:'w31pl', go:'zasielka', c:['W31','PL','dpd', int(197), ['ok',L('doručené','delivered')], cur(6540)]},
        {id:'w31bg', go:'zasielka', c:['W31','BG','posta', int(91), ['ok',L('doručené','delivered')], cur(3000)]},
        {id:'w31si', go:'zasielka', c:['W31','SI','dpd', int(45), ['ok',L('doručené','delivered')], cur(1575)]},
        {id:'w31hr', go:'zasielka', c:['W31','HR','sps', int(39), ['ok',L('doručené','delivered')], cur(1365)]},
        {id:'w30sk', go:'zasielka', c:['W30','SK','packeta', int(477), ['ok',L('doručené','delivered')], cur(17100)]},
        {id:'w30sk-posta', go:'zasielka', c:['W30','SK','posta', int(72), ['cond',L('na ceste','in transit')], cur(2590)]},
        {id:'w30cz', go:'zasielka', c:['W30','CZ','gls', int(324), ['ok',L('doručené','delivered')], cur(11300)]},
        {id:'w30cz-packeta', go:'zasielka', c:['W30','CZ','packeta', int(36), ['ok',L('doručené','delivered')], cur(1250)]},
        {id:'w30hu', go:'zasielka', c:['W30','HU','gls', int(374), ['ok',L('doručené','delivered')], cur(14800)]},
        {id:'w30hu-dpd', go:'zasielka', c:['W30','HU','dpd', int(56), ['ok',L('doručené','delivered')], cur(2220)]},
        {id:'w30ro', go:'zasielka', c:['W30','RO','sps', int(247), ['ok',L('doručené','delivered')], cur(9040)]},
        {id:'w30ro-gls', go:'zasielka', c:['W30','RO','gls', int(30), ['ok',L('doručené','delivered')], cur(1100)]},
        {id:'w30pl', active:true, go:'zasielka', c:['W30','PL','dpd', int(190), ['cond',L('vrátené','returned')], cur(6300)]},
        {id:'w30bg', go:'zasielka', c:['W30','BG','posta', int(88), ['no',L('stratené','lost')], cur(2900)]},
        {id:'w30si', go:'zasielka', c:['W30','SI','dpd', int(42), ['ok',L('doručené','delivered')], cur(1470)]},
        {id:'w30hr', go:'zasielka', c:['W30','HR','sps', int(36), ['ok',L('doručené','delivered')], cur(1260)]},
        {id:'w29sk', go:'zasielka', c:['W29','SK','packeta', int(460), ['ok',L('doručené','delivered')], cur(16500)]},
        {id:'w29sk-posta', go:'zasielka', c:['W29','SK','posta', int(68), ['ok',L('doručené','delivered')], cur(2440)]},
        {id:'w29cz', go:'zasielka', c:['W29','CZ','gls', int(305), ['ok',L('doručené','delivered')], cur(10600)]},
        {id:'w29cz-packeta', go:'zasielka', c:['W29','CZ','packeta', int(33), ['ok',L('doručené','delivered')], cur(1150)]},
        {id:'w29hu', go:'zasielka', c:['W29','HU','gls', int(360), ['ok',L('doručené','delivered')], cur(14300)]},
        {id:'w29hu-dpd', go:'zasielka', c:['W29','HU','dpd', int(52), ['info',L('výdajňa','pickup point')], cur(2060)]},
        {id:'w29ro', go:'zasielka', c:['W29','RO','sps', int(240), ['ok',L('doručené','delivered')], cur(8800)]},
        {id:'w29ro-gls', go:'zasielka', c:['W29','RO','gls', int(28), ['ok',L('doručené','delivered')], cur(1030)]},
        {id:'w29pl', go:'zasielka', c:['W29','PL','dpd', int(176), ['ok',L('doručené','delivered')], cur(5840)]},
        {id:'w29bg', go:'zasielka', c:['W29','BG','posta', int(79), ['ok',L('doručené','delivered')], cur(2610)]},
        {id:'w29si', go:'zasielka', c:['W29','SI','dpd', int(41), ['ok',L('doručené','delivered')], cur(1440)]},
        {id:'w29hr', go:'zasielka', c:['W29','HR','sps', int(35), ['ok',L('doručené','delivered')], cur(1225)]}
      ],
      note:L('W31 SK/packeta, CZ/gls, HU/gls, RO/sps a W30 PL/dpd, BG/posta sú prenesené 1:1 z evidencie appky; ostatné kombinácie, krajiny SI/HR a týždeň W29 sú ukážková vzorka na doplnenie 30–40 riadkov.','W31 SK/packeta, CZ/gls, HU/gls, RO/sps and W30 PL/dpd, BG/posta carry over 1:1 from the app; the remaining combinations, SI/HR countries and week W29 are an illustrative sample filling out the 30–40 rows.'),
      page:true}
  ],
  ai:[
    {q:L('Ako funguje kľúč upsertu?','How does the upsert key work?'),
     a:L('Unikátny kľúč je týždeň × krajina × prepravca. Opätovný import rovnakého kľúča prepíše existujúci riadok namiesto vytvorenia duplicity.','The unique key is week × country × carrier. Re-importing the same key overwrites the existing row instead of creating a duplicate.'),
     cite:'appka', act:null},
    {q:L('Ktoré riadky sú overené a ktoré ukážkové?','Which rows are verified and which are illustrative?'),
     a:L('W31 SK/packeta (512), CZ/gls (348), HU/gls (401), RO/sps (265) a W30 PL/dpd (190), BG/posta (88) sú prenesené 1:1 z appky, zvyšok tabuľky je ukážka.','W31 SK/packeta (512), CZ/gls (348), HU/gls (401), RO/sps (265) and W30 PL/dpd (190), BG/posta (88) carry over 1:1 from the app, the rest of the table is illustrative.'),
     cite:'appka', act:null},
    {q:L('Koľko riadkov má aktuálne táto tabuľka?','How many rows does this table currently have?'),
     a:L('36 riadkov naprieč W29–W31, 12 kombinácií krajina × prepravca za každý týždeň.','36 rows across W29–W31, 12 country × carrier combinations per week.'),
     cite:'appka', act:null}
  ]
},
{ key:'zasielka', icon:'doc', title:L('Zásielka','Shipment'),
  sub:L('Detail súhrnného riadku — stavy, časová os, prepravca a krajina','Detail of a summary row — states, timeline, carrier and country'),
  blocks:[
    {t:'kpis', items:[
      {l:L('Odoslané','Shipped'), v:int(512), sub:'W31 · SK · packeta'},
      {l:L('Doručené','Delivered'), v:int(492), sub:L('96,1 % z odoslaných','96.1% of shipped'), tone:'ok'},
      {l:L('Poštovné','Postage'), v:cur(2620)},
      {l:L('Hodnota','Value'), v:cur(18400)}
    ]},
    {t:'timeline', title:L('Priebeh W31 · SK · packeta','Timeline W31 · SK · packeta'), items:[
      [L('Piatok','Friday'), L('Súhrn týždňa uzavretý (upsert + audit)','Weekly summary closed (upsert + audit)')],
      [L('Štvrtok','Thursday'), L('492 doručených · 20 na ceste','492 delivered · 20 in transit')],
      [L('Pondelok','Monday'), L('CSV import týždenných dát','Weekly data CSV import')],
      ['W31', L('Riadok vytvorený (kľúč týždeň × krajina × prepravca)','Row created (week × country × carrier key)')]
    ]},
    {t:'cards', n:2, items:[
      {title:'packeta', sub:L('Prepravca','Carrier'), badge:['ok', L('doručené','delivered')],
       lines:[[L('Doručenosť','Delivery rate'), L('96,1 %','96.1%')], [L('Ø dní','Avg days'), L('2,1 d','2.1 d')]]},
      {title:'SK', sub:L('Krajina','Country'), badge:['ok', L('v cieli','on target')],
       lines:[[L('Odoslané','Shipped'), int(512)], [L('Podiel z W31','Share of W31'), L('~21,9 %','~21.9%')]]}
    ]},
    {t:'note', text:L('Tento záznam je súhrnný riadok (nie jednotlivá zásielka) — evidencia appky je na úrovni týždeň × krajina × prepravca.','This record is a summary row (not an individual parcel) — the app tracks data at the week × country × carrier level.')}
  ],
  ai:[
    {q:L('Aká je doručenosť tohto súhrnu?','What is the delivery rate of this summary?'),
     a:L('492 z 512 kusov bolo doručených, čo je 96,1 % — nad celkovým priemerom appky za W31 (94,1 %).','492 of 512 pieces were delivered, i.e. 96.1% — above the app-wide W31 average (94.1%).'),
     cite:'appka', act:null},
    {q:L('Kedy bol súhrn uzavretý?','When was the summary closed?'),
     a:L('V piatok, po tom čo sa v pondelok naimportovali dáta a vo štvrtok bol stav 492 doručených / 20 na ceste.','On Friday, after Monday\'s data import and Thursday\'s status of 492 delivered / 20 in transit.'),
     cite:'appka', act:null},
    {q:L('Koľko stálo poštovné pri tomto riadku?','What did postage cost for this row?'),
     a:L('2 620 € pri hodnote tovaru 18 400 €, teda približne 14,2 % z hodnoty zásielok.','€2,620 against a goods value of €18,400, i.e. about 14.2% of the shipment value.'),
     cite:'appka', act:null}
  ]
}
  ]
};
