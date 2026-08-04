const APP_ROADMAP = {
key:'roadmap', name:'Aura Roadmap', port:'3040', icon:'flag',
tag:L('Plánovanie, evidencia pre reporting a rozhodovacia fronta — checkpointy, šprinty a nemenné rozhodnutia.','Planning, reporting evidence and a decision queue — checkpoints, sprints and immutable decisions.'),
feat:[
  L('Checkpoint readiness → nemenné rozhodnutie (go / conditional_go / no_go / deferred) s baseline snapshotom a auditom','Checkpoint readiness → immutable decision (go / conditional_go / no_go / deferred) with a baseline snapshot and audit'),
  L('Timeline: 3 režimy (Roadmap / Sprinty / Rozhodnutia) × 3 zoomy (kvartál / mesiac / týždeň) × 2 hustoty','Timeline: 3 modes (Roadmap / Sprints / Decisions) × 3 zooms (quarter / month / week) × 2 densities'),
  L('Šprinty draft → commit → close s carry-over; 2 úrovne práce (Úloha → Podúloha), typy task / bug / idea','Sprints draft → commit → close with carry-over; 2 work levels (Task → Subtask), types task / bug / idea')
],
live:{v:L('11 úloh v S-31 · 2 rozhodnutia vo fronte','11 items in S-31 · 2 decisions queued'), tone:'cond', spark:[9,12,14,14,12,11,11]},

imp:{ target:'ulohy',
  cols:[
    {k:'polozka', l:L('Položka','Item'), t:'text'},
    {k:'typ', l:L('Typ','Type'), t:'text'},
    {k:'projekt', l:L('Projekt','Project'), t:'text'},
    {k:'sprint', l:L('Sprint','Sprint'), t:'text'},
    {k:'stav', l:L('Stav','State'), t:'text'},
    {k:'termin', l:L('Termín','Due'), t:'text'}
  ],
  key:[L('kľúč upsertu: položka × projekt','upsert key: item × project')],
  csv:'polozka;typ;projekt;sprint;stav;termin\nObnova SSL certifikátov;task;Bezpečnosť;S-32;backlog;2026-08-25\nDark mode audit;task;Aura KPI;S-32;backlog;2026-09-05\nBug: duplicitné notifikácie;bug;Aura Roadmap;S-31;in_progress;2026-08-08\nNápad: mobilný widget;idea;—;—;backlog;čoskoro\nRevízia SLA reklamácií;task;Reklamačný workflow v2;S-32;backlog;2026-09-10\nBug: chýbajúci audit log pri exporte;bug;Aura Roadmap;S-32;backlog;2026-09-02'
},

rep:{ templates:[
  {k:'portfolio', l:L('Stav portfólia','Portfolio status'), s:L('Projekty, plnenie, riziká, checkpointy','Projects, completion, risks, checkpoints')},
  {k:'rozhodnutia', l:L('Rozhodnutia za obdobie','Decisions for the period'), s:L('go / conditional_go / no_go / deferred s baseline a follow-up','go / conditional_go / no_go / deferred with baseline and follow-up')},
  {k:'sprint', l:L('Sprint report','Sprint report'), s:L('Plnenie šprintu, carry-over, práca podľa typu','Sprint completion, carry-over, work by type')}
]},

screens:[

{ key:'timeline', icon:'cal', title:L('Timeline','Timeline'),
  sub:L('3 režimy (Roadmap / Sprinty / Rozhodnutia) × 3 zoomy (kvartál / mesiac / týždeň) × 2 hustoty (cozy / compact).','3 modes (Roadmap / Sprints / Decisions) × 3 zooms (quarter / month / week) × 2 densities (cozy / compact).'),
  blocks:[
    {t:'gantt', title:L('Timeline — režim Roadmap (mesiac, cozy)','Timeline — Roadmap mode (month, cozy)'), today:36,
      rows:[
        {l:L('E-shop · Migrácia platobnej brány','E-shop · Payment gateway migration'), s:8, w:35, b:['info',L('in_progress','in_progress')]},
        {l:L('Aura Roadmap · Release v2.0','Aura Roadmap · Release v2.0'), s:0, w:16, b:['ok',L('done','done')]},
        {l:L('Aura KPI · Automatické KPI vstupy','Aura KPI · Automated KPI inputs'), s:10, w:40, b:['cond','conditional_go']},
        {l:L('Bezpečnosť · Penetračný audit','Security · Penetration audit'), s:20, w:55, b:['q','deferred']},
        {l:L('Aura Banner Studio · Pilot renderu','Aura Banner Studio · Render pilot'), s:15, w:22, b:['ok',L('done','done')]},
        {l:L('Aura Logistika · integrácia','Aura Logistika · integration'), s:38, w:45, b:['info',L('in_progress','in_progress')]},
        {l:L('Aura Hub · SSO migrácia','Aura Hub · SSO migration'), s:30, w:38, b:['info',L('in_progress','in_progress')]},
        {l:L('Aura Tržby · appka','Aura Tržby · app'), s:45, w:50, b:['q',L('naplánované','planned')]},
        {l:L('Sklad · reorganizácia','Warehouse · reorganization'), s:48, w:35, b:['info',L('in_progress','in_progress')]},
        {l:L('CRM napojenie','CRM integration'), s:33, w:42, b:['no',L('blokované','blocked')]},
        {l:L('Reklamačný workflow v2','Claims workflow v2'), s:25, w:30, b:['info',L('in_progress','in_progress')]},
        {l:L('Newsletter automatizácia','Newsletter automation'), s:12, w:20, b:['ok',L('done','done')]}
      ],
      note:L('12 riadkov · dátumy a % ukážkové, dnešný deň (4. 8. 2026) zvýraznený na osi','12 rows · dates and % illustrative, today (Aug 4, 2026) is marked on the axis')},
    {t:'cards', n:3, items:[
      {title:'Roadmap', sub:L('Projekty a míľniky na časovej osi — predvolený režim','Projects and milestones on the timeline — default mode'), badge:['ok',L('predvolené','default')], lines:[[L('Zoom','Zoom'),L('kvartál · mesiac · týždeň','quarter · month · week')],[L('Hustota','Density'),'cozy · compact']]},
      {title:L('Šprinty','Sprints'), sub:L('Sprintové stĺpce s carry-over šípkami medzi šprintami','Sprint columns with carry-over arrows between sprints'), badge:['info',L('12 šprintov','12 sprints')], lines:[[L('Aktuálny','Current'),'S-31 · commit']]},
      {title:L('Rozhodnutia','Decisions'), sub:L('Checkpointy na osi, farba podľa rozhodnutia','Checkpoints on the axis, colored by decision'), badge:['cond',L('2 vo fronte','2 queued')], lines:[[L('Nemenné','Immutable'),L('áno','yes')]]}
    ]},
    {t:'form', title:L('Ovládanie timelinu','Timeline controls'), fields:[
      {l:L('Režim','Mode'), s:L('Roadmap · Sprinty · Rozhodnutia','Roadmap · Sprints · Decisions'), type:'select', v:'Roadmap', opts:['Roadmap',L('Sprinty','Sprints'),L('Rozhodnutia','Decisions')]},
      {l:'Zoom', s:L('kvartál · mesiac · týždeň','quarter · month · week'), type:'select', v:L('mesiac','month'), opts:[L('kvartál','quarter'),L('mesiac','month'),L('týždeň','week')]},
      {l:L('Hustota','Density'), s:'cozy · compact', type:'select', v:'cozy', opts:['cozy','compact']}
    ], note:L('overené 1:1 z hubu — presne tieto tri ovládacie prvky appka má','verified 1:1 from the hub — the app has exactly these three controls')}
  ],
  ai:[
    {q:L('Aký je predvolený režim a zoom timelinu?','What is the default timeline mode and zoom?'), a:L('Režim Roadmap, zoom mesiac, hustota cozy — všetky tri sú predvolené.','Roadmap mode, month zoom, cozy density — all three are the defaults.'), cite:'appka', act:null},
    {q:L('Kde je na osi dnešný deň?','Where is today on the axis?'), a:L('Dnešok (4. 8. 2026) je približne na 36 % šírky zobrazeného obdobia.','Today (Aug 4, 2026) sits at roughly 36% of the displayed period.'), cite:'ukážka', act:null},
    {q:L('Koľko šprintov appka sleduje v režime Sprinty?','How many sprints does the app track in Sprints mode?'), a:L('12 šprintov (S-21 až S-32) so stĺpcami a carry-over šípkami medzi nimi.','12 sprints (S-21 to S-32) as columns with carry-over arrows between them.'), cite:'appka', act:{l:L('Prepnúť na Sprinty','Switch to Sprints'), k:'filter'}}
  ]
},

{ key:'projekty', icon:'doc', title:L('Projekty','Projects'),
  sub:L('20 projektov: stav, vlastník, checkpointy, plnenie.','20 projects: status, owner, checkpoints, completion.'),
  blocks:[
    {t:'kpis', items:[
      {l:L('Nízke riziko','Low risk'), v:int(7), tone:'ok'},
      {l:L('Stredné riziko','Medium risk'), v:int(7), tone:'cond'},
      {l:L('Vysoké riziko','High risk'), v:int(3), tone:'no'},
      {l:L('Nehodnotené','Not rated'), v:int(3), tone:'info'}
    ]},
    {t:'bars', title:L('Projekty podľa fázy','Projects by phase'),
      data:[{l:L('Realizácia','Delivery'),v:6},{l:L('Dokončené','Done'),v:2},{l:L('Analýza','Analysis'),v:5},{l:L('Návrh','Design'),v:5},{l:L('Čaká na dodávateľa','Waiting on vendor'),v:2}],
      note:L('20 projektov spolu','20 projects in total')},
    {t:'table', title:null,
      cols:[L('Projekt','Project'),L('Vlastník','Owner'),L('Fáza','Phase'),L('Priorita','Priority'),'Sprint',L('Položky','Items'),'Done %',L('Riziko','Risk'),L('Termín','Due')],
      rows:[
        {c:['E-shop','Delaja',L('Realizácia','Delivery'),'P1','S-31','24/41',{pln:58},['cond',L('stredné','medium')],L('15. 9.','Sep 15')], go:'projekt'},
        {c:['Aura Roadmap','Daniel',L('Dokončené','Done'),'P2','S-30','36/36',{pln:100},['ok',L('nízke','low')],L('30. 6.','Jun 30')], go:'projekt'},
        {c:['Aura KPI','Ema',L('Realizácia','Delivery'),'P1','S-31','19/30',{pln:63},['cond',L('stredné','medium')],L('31. 8.','Aug 31')], go:'projekt'},
        {c:[L('Bezpečnosť','Security'),'Kiko',L('Čaká na dodávateľa','Waiting on vendor'),'P1','S-32','6/18',{pln:33},['no',L('vysoké','high')],L('10. 10.','Oct 10')], go:'projekt'},
        {c:['Aura Banner Studio','Gabika',L('Návrh','Design'),'P3','S-32','4/22',{pln:18},['info',L('nehodnotené','not rated')],L('30. 11.','Nov 30')], go:'projekt'},
        {c:[L('Aura Logistika integrácia','Aura Logistics integration'),'Daniel',L('Analýza','Analysis'),'P2','S-32','3/15',{pln:20},['cond',L('stredné','medium')],L('31. 10.','Oct 31')], go:'projekt'},
        {c:['Aura Hub — SSO migrácia','Delaja',L('Realizácia','Delivery'),'P1','S-31','12/25',{pln:48},['no',L('vysoké','high')],L('20. 9.','Sep 20')], go:'projekt'},
        {c:['Aura Tržby appka','Daniel',L('Analýza','Analysis'),'P2','S-32','2/20',{pln:10},['cond',L('stredné','medium')],L('15. 12.','Dec 15')], go:'projekt'},
        {c:[L('Mobilný klient — prieskum','Mobile client — research'),'Kiko',L('Návrh','Design'),'P3','S-30','5/12',{pln:42},['ok',L('nízke','low')],L('30. 9.','Sep 30')], go:'projekt'},
        {c:[L('SEO technický audit','SEO technical audit'),'Gabika',L('Realizácia','Delivery'),'P2','S-31','9/16',{pln:56},['ok',L('nízke','low')],L('25. 8.','Aug 25')], go:'projekt'},
        {c:[L('Sklad — reorganizácia','Warehouse — reorganization'),'Hajnalka',L('Analýza','Analysis'),'P2','S-32','3/14',{pln:21},['cond',L('stredné','medium')],L('30. 11.','Nov 30')], go:'projekt'},
        {c:[L('Onboarding flow — redizajn','Onboarding flow — redesign'),'Ema',L('Návrh','Design'),'P3','S-32','2/10',{pln:20},['ok',L('nízke','low')],L('15. 12.','Dec 15')], go:'projekt'},
        {c:[L('Zálohovací runbook','Backup runbook'),'Kiko',L('Dokončené','Done'),'P2','S-29','8/8',{pln:100},['ok',L('nízke','low')],L('10. 7.','Jul 10')], go:'projekt'},
        {c:[L('CRM napojenie','CRM integration'),'Delaja',L('Čaká na dodávateľa','Waiting on vendor'),'P2','S-31','4/19',{pln:21},['no',L('vysoké','high')],L('30. 10.','Oct 30')], go:'projekt'},
        {c:[L('Reklamačný workflow v2','Claims workflow v2'),'Hajnalka',L('Realizácia','Delivery'),'P2','S-31','11/17',{pln:65},['cond',L('stredné','medium')],L('5. 9.','Sep 5')], go:'projekt'},
        {c:[L('Newsletter automatizácia','Newsletter automation'),'Gabika',L('Realizácia','Delivery'),'P3','S-30','7/9',{pln:78},['ok',L('nízke','low')],L('20. 8.','Aug 20')], go:'projekt'},
        {c:[L('Fotoštúdio — kapacita','Photo studio — capacity'),'Ema',L('Návrh','Design'),'P3','S-32','1/8',{pln:13},['info',L('nehodnotené','not rated')],L('31. 1. 2027','Jan 31, 2027')], go:'projekt'},
        {c:[L('Zlúčenie API Prehľadu','Overview API merge'),'Daniel',L('Analýza','Analysis'),'P2','S-32','2/10',{pln:20},['ok',L('nízke','low')],L('30. 9.','Sep 30')], go:'projekt'},
        {c:[L('Observabilita logov','Log observability'),'Kiko',L('Návrh','Design'),'P3','S-32','1/9',{pln:11},['cond',L('stredné','medium')],L('31. 10.','Oct 31')], go:'projekt'},
        {c:[L('Akcent teal/zlatá — zjednotenie','Teal/gold accent — unification'),'Delaja',L('Návrh','Design'),'P3','S-32','1/6',{pln:17},['info',L('nehodnotené','not rated')],L('31. 12.','Dec 31')], go:'projekt'}
      ],
      note:L('prvých 6 riadkov overených z hubu 1:1 (E-shop, Aura Roadmap, Aura KPI, Bezpečnosť, Aura Banner Studio, Aura Logistika integrácia) · zvyšných 14 ukážkové, 3 z nich (Zlúčenie API Prehľadu, Observabilita logov, Akcent teal/zlatá) odvodené z reálnych otvorených bodov appky','first 6 rows verified from the hub 1:1 (E-shop, Aura Roadmap, Aura KPI, Security, Aura Banner Studio, Aura Logistics integration) · the remaining 14 illustrative, 3 of them (Overview API merge, Log observability, Teal/gold accent) derived from the app\'s real open items')}
  ],
  ai:[
    {q:L('Koľko projektov appka sleduje?','How many projects does the app track?'), a:L('20 projektov naprieč fázami Analýza → Realizácia → Dokončené, 6 z nich má overené dáta z pôvodného náhľadu.','20 projects across the Analysis → Delivery → Done phases, 6 of them with verified data from the original preview.'), cite:'appka', act:null},
    {q:L('Ktorý projekt má najvyššie riziko?','Which project has the highest risk?'), a:L('Bezpečnosť (penetračný audit) a CRM napojenie majú riziko vysoké — oba čakajú na dodávateľa.','Security (penetration audit) and CRM integration are rated high risk — both waiting on a vendor.'), cite:'appka', act:{l:L('Filtrovať vysoké riziko','Filter high risk'), k:'filter'}},
    {q:L('Ktorý projekt je hotový na 100 %?','Which project is 100% complete?'), a:L('Aura Roadmap (36/36, S-30) a Zálohovací runbook (8/8, S-29).','Aura Roadmap (36/36, S-30) and the Backup runbook (8/8, S-29).'), cite:'appka', act:null}
  ]
},

{ key:'projekt', icon:'folder', title:L('Projekt: E-shop','Project: E-shop'),
  sub:L('Detail projektu — checkpointy, míľniky, riziká, časová os.','Project detail — checkpoints, milestones, risks, timeline.'),
  blocks:[
    {t:'kpis', items:[
      {l:L('Plnenie','Completion'), v:'58 %'},
      {l:L('Priorita','Priority'), v:'P1'},
      {l:L('Riziko','Risk'), v:L('stredné','medium'), tone:'cond'},
      {l:L('Termín','Due'), v:L('15. 9.','Sep 15'), sub:'S-31'}
    ]},
    {t:'table', title:L('Checkpoint projektu','Project checkpoint'),
      cols:['Checkpoint','Readiness',L('Rozhodnutie','Decision'),'Baseline','Follow-up'],
      rows:[
        {c:[L('CP-08 · Go-live platby','CP-08 · Go-live payments'), {pln:72}, ['cond','conditional_go'], 'BL-2026-06-14', L('FU-31: 3DS testy','FU-31: 3DS tests')], go:null}
      ],
      note:L('overené 1:1 z hubu','verified 1:1 from the hub')},
    {t:'timeline', title:L('Časová os checkpointu','Checkpoint timeline'), items:[
      [L('Dnes','Today'), L('Follow-up úloha založená do backlogu','Follow-up item created in the backlog')],
      [L('Včera','Yesterday'), L('Rozhodnutie conditional_go (nemenné) + baseline + audit','Decision conditional_go (immutable) + baseline + audit')],
      [L('Pred 3 dňami','3 days ago'), L('Readiness vyhodnotená','Readiness evaluated')],
      [L('Pred týždňom','A week ago'), L('Checkpoint vytvorený','Checkpoint created')]
    ]},
    {t:'banner', tone:'cond', text:L('Checkpoint CP-08 Go-live platby: conditional_go, readiness 72 % — 3DS testy sú vo follow-upe FU-31.','Checkpoint CP-08 Go-live payments: conditional_go, readiness 72% — 3DS tests are tracked in follow-up FU-31.')}
  ],
  ai:[
    {q:L('Aký je stav projektu E-shop?','What is the status of the E-shop project?'), a:L('Realizácia, plnenie 58 %, sprint S-31, riziko stredné, termín 15. 9.','Delivery phase, 58% complete, sprint S-31, medium risk, due Sep 15.'), cite:'appka', act:null},
    {q:L('Aké rozhodnutie padlo na checkpointe Go-live platby?','What decision was made on the Go-live payments checkpoint?'), a:L('conditional_go pri readiness 72 % — follow-up FU-31 rieši 3DS testy.','conditional_go at 72% readiness — follow-up FU-31 covers the 3DS tests.'), cite:'appka', act:{l:L('Otvoriť Checkpointy','Open Checkpoints'), k:'open'}},
    {q:L('Kedy bol checkpoint založený a rozhodnutý?','When was the checkpoint created and decided?'), a:L('Založený pred týždňom, readiness vyhodnotená pred 3 dňami, rozhodnutie padlo včera.','Created a week ago, readiness evaluated 3 days ago, the decision was made yesterday.'), cite:'appka', act:null}
  ]
},

{ key:'ulohy', icon:'list', title:L('Úlohy','Work items'),
  sub:L('32 položiek: typ (úloha / bug / nápad), stav, priorita, sprint.','32 items: type (task / bug / idea), state, priority, sprint.'),
  blocks:[
    {t:'kpis', items:[
      {l:L('Backlog','Backlog'), v:int(13), tone:null},
      {l:L('V behu','In progress'), v:int(8), tone:'info'},
      {l:L('Čaká','Waiting'), v:int(5), tone:'cond'},
      {l:L('Hotovo','Done'), v:int(6), tone:'ok'}
    ]},
    {t:'table', title:null,
      cols:[L('Položka','Item'),L('Typ','Type'),L('Projekt','Project'),'Sprint',L('Priorita','Priority'),L('Stav','State'),L('Termín','Due')],
      rows:[
        {c:[L('Migrácia platobnej brány','Payment gateway migration'),'task','E-shop','S-31 · commit','P1',['info','in_progress'],L('9. 8.','Aug 9')], go:'uloha'},
        {c:[L('Bug: 409 pri uložení checkpointu','Bug: 409 on checkpoint save'),'bug','Aura Roadmap','S-31 · commit','P2',['cond','waiting'],L('6. 8.','Aug 6')], go:'uloha'},
        {c:[L('Návrh onboarding flowu','Onboarding flow idea'),'idea','—','—','P3',['q','backlog'],'—'], go:'uloha'},
        {c:[L('Podúloha: zod kontrakt API','Subtask: zod API contract'),'task','Aura Roadmap','S-30 · close','P2',['ok','done'],L('28. 7.','Jul 28')], go:'uloha'},
        {c:[L('Audit prístupov Q3','Q3 access audit'),'task',L('Bezpečnosť','Security'),'S-32 · draft','P1',['q','backlog'],L('20. 8.','Aug 20')], go:'uloha'},
        {c:['Carry-over: e2e axe','task','Aura Roadmap','S-31 · commit','P2',['info','in_progress'],L('9. 8.','Aug 9')], go:'uloha'},
        {c:[L('Nastavenie sandbox 3DS prostredia','3DS sandbox setup'),'task','E-shop','S-31 · commit','P1',['info','in_progress'],L('8. 8.','Aug 8')], go:'uloha'},
        {c:[L('Bug: timeout pri retry platby','Bug: timeout on payment retry'),'bug','E-shop','S-31 · commit','P1',['cond','waiting'],L('9. 8.','Aug 9')], go:'uloha'},
        {c:[L('Nápad: fallback platobná brána','Idea: fallback payment gateway'),'idea','E-shop','—','P1',['q','backlog'],'—'], go:'uloha'},
        {c:[L('SSO login formulár','SSO login form'),'task','Aura Hub — SSO migrácia','S-31 · commit','P1',['info','in_progress'],L('12. 8.','Aug 12')], go:'uloha'},
        {c:[L('Migrácia rolí z legacy','Legacy role migration'),'task','Aura Hub — SSO migrácia','S-32 · draft','P1',['q','backlog'],L('5. 9.','Sep 5')], go:'uloha'},
        {c:[L('Bug: duplicitné session cookies','Bug: duplicate session cookies'),'bug','Aura Hub — SSO migrácia','S-31 · commit','P1',['cond','waiting'],L('10. 8.','Aug 10')], go:'uloha'},
        {c:[L('Nightly export objednávok','Nightly order export'),'task','Aura Tržby appka','S-32 · draft','P2',['q','backlog'],L('20. 9.','Sep 20')], go:'uloha'},
        {c:[L('Nápad: segmentácia podľa marže','Idea: margin-based segmentation'),'idea','Aura Tržby appka','—','P2',['q','backlog'],'—'], go:'uloha'},
        {c:[L('Prieskum konkurenčných appiek','Competitor app research'),'task',L('Mobilný klient — prieskum','Mobile client — research'),'S-30 · close','P3',['ok','done'],L('25. 7.','Jul 25')], go:'uloha'},
        {c:[L('Oprava duplicitných title tagov','Fix duplicate title tags'),'task',L('SEO technický audit','SEO technical audit'),'S-31 · commit','P2',['info','in_progress'],L('14. 8.','Aug 14')], go:'uloha'},
        {c:['404 v sitemap.xml','bug',L('SEO technický audit','SEO technical audit'),'S-31 · commit','P2',['ok','done'],L('30. 7.','Jul 30')], go:'uloha'},
        {c:[L('Prepočet kapacity regálov','Shelf capacity recalculation'),'task',L('Sklad — reorganizácia','Warehouse — reorganization'),'S-32 · draft','P2',['q','backlog'],L('25. 9.','Sep 25')], go:'uloha'},
        {c:[L('Wireframe nového flow','Wireframe of the new flow'),'task',L('Onboarding flow — redizajn','Onboarding flow — redesign'),'S-32 · draft','P3',['q','backlog'],L('1. 10.','Oct 1')], go:'uloha'},
        {c:[L('Skript zálohy DB (retencia 3)','DB backup script (retention 3)'),'task',L('Zálohovací runbook','Backup runbook'),'S-29 · close','P2',['ok','done'],L('10. 7.','Jul 10')], go:'uloha'},
        {c:[L('Test obnovy zo zálohy','Backup restore test'),'task',L('Zálohovací runbook','Backup runbook'),'S-29 · close','P2',['ok','done'],L('10. 7.','Jul 10')], go:'uloha'},
        {c:[L('Bug: duplicitné kontakty pri sync','Bug: duplicate contacts on sync'),'bug',L('CRM napojenie','CRM integration'),'S-31 · commit','P2',['cond','waiting'],L('15. 9.','Sep 15')], go:'uloha'},
        {c:[L('Mapovanie polí CRM ↔ appka','CRM ↔ app field mapping'),'task',L('CRM napojenie','CRM integration'),'S-32 · draft','P2',['q','backlog'],L('30. 9.','Sep 30')], go:'uloha'},
        {c:[L('Nový stavový diagram reklamácie','New claim state diagram'),'task',L('Reklamačný workflow v2','Claims workflow v2'),'S-31 · commit','P2',['info','in_progress'],L('1. 9.','Sep 1')], go:'uloha'},
        {c:[L('Nápad: automatická eskalácia po 5 dňoch','Idea: auto-escalation after 5 days'),'idea',L('Reklamačný workflow v2','Claims workflow v2'),'—','P2',['q','backlog'],'—'], go:'uloha'},
        {c:[L('A/B test predmetu e-mailu','Email subject A/B test'),'task',L('Newsletter automatizácia','Newsletter automation'),'S-30 · close','P3',['ok','done'],L('15. 8.','Aug 15')], go:'uloha'},
        {c:[L('Šablóna pre opustený košík','Abandoned cart template'),'task',L('Newsletter automatizácia','Newsletter automation'),'S-31 · commit','P3',['info','in_progress'],L('20. 8.','Aug 20')], go:'uloha'},
        {c:[L('Nápad: skriptovaný scenár fotenia','Idea: scripted shoot scenario'),'idea',L('Fotoštúdio — kapacita','Photo studio — capacity'),'—','P3',['q','backlog'],'—'], go:'uloha'},
        {c:[L('Agregačný endpoint /api/summary','Aggregate /api/summary endpoint'),'task',L('Zlúčenie API Prehľadu','Overview API merge'),'S-32 · draft','P2',['info','in_progress'],L('15. 9.','Sep 15')], go:'uloha'},
        {c:[L('Štruktúrované logovanie route handlerov','Structured logging for route handlers'),'task',L('Observabilita logov','Log observability'),'S-32 · draft','P3',['q','backlog'],L('30. 9.','Sep 30')], go:'uloha'},
        {c:[L('Read-only DB user roadmap_ro','Read-only roadmap_ro DB user'),'task',L('Aura Logistika integrácia','Aura Logistics integration'),'S-32 · draft','P2',['cond','waiting'],L('20. 9.','Sep 20')], go:'uloha'},
        {c:[L('Zjednotenie --on-accent tokenu','Unify the --on-accent token'),'task',L('Akcent teal/zlatá — zjednotenie','Teal/gold accent — unification'),'S-32 · draft','P3',['q','backlog'],L('15. 11.','Nov 15')], go:'uloha'}
      ],
      note:L('6 riadkov overených z hubu 1:1 · 22 úloh (task), 5 bugov, 5 nápadov (idea) spolu 32 · zvyšok ukážkový, niektoré odvodené z reálnych otvorených bodov appky','6 rows verified from the hub 1:1 · 22 tasks, 5 bugs, 5 ideas — 32 in total · the rest illustrative, some derived from the app\'s real open items')},
    {t:'list', title:L('Priorita P1 v behu alebo čaká','Priority P1 in progress or waiting'), items:[
      {title:L('Migrácia platobnej brány','Payment gateway migration'), sub:'E-shop · S-31', badge:['info','in_progress']},
      {title:L('Bug: timeout pri retry platby','Bug: timeout on payment retry'), sub:'E-shop · S-31', badge:['cond','waiting']},
      {title:L('SSO login formulár','SSO login form'), sub:'Aura Hub — SSO migrácia · S-31', badge:['info','in_progress']},
      {title:L('Bug: duplicitné session cookies','Bug: duplicate session cookies'), sub:'Aura Hub — SSO migrácia · S-31', badge:['cond','waiting']}
    ], note:L('4 z 32 položiek','4 of 32 items')}
  ],
  ai:[
    {q:L('Koľko úloh je typu bug?','How many items are of type bug?'), a:L('5 položiek je typu bug, 5 typu idea, zvyšných 22 sú úlohy (task).','5 items are bugs, 5 are ideas, the remaining 22 are tasks.'), cite:'appka', act:{l:L('Filtrovať bug','Filter bugs'), k:'filter'}},
    {q:L('Koľko položiek čaká v stave waiting?','How many items are in the waiting state?'), a:L('5 položiek má stav waiting — väčšinou čakajú na reprodukciu chyby alebo na iný tím.','5 items are in the waiting state — mostly blocked on a bug repro or another team.'), cite:'appka', act:null},
    {q:L('Ako sa importujú nové úlohy?','How are new items imported?'), a:L('Cez import wizard s kľúčom položka × projekt — CSV so stĺpcami polozka;typ;projekt;sprint;stav;termin, s automatickým párovaním a upsertom.','Via the import wizard keyed on item × project — a CSV with columns polozka;typ;projekt;sprint;stav;termin, auto-matched and upserted.'), cite:'import', act:{l:L('Otvoriť import','Open import'), k:'create'}}
  ]
},

{ key:'uloha', icon:'clip', title:L('Úloha: Migrácia platobnej brány','Item: Payment gateway migration'),
  sub:L('Detail úlohy s podúlohami — 2 úrovne práce (Úloha → Podúloha).','Item detail with subtasks — 2 work levels (Task → Subtask).'),
  blocks:[
    {t:'kpis', items:[
      {l:L('Stav','State'), v:L('in_progress','in_progress'), tone:'info'},
      {l:'Sprint', v:'S-31 · commit'},
      {l:L('Priorita','Priority'), v:'P1'},
      {l:L('Termín','Due'), v:L('9. 8.','Aug 9')}
    ]},
    {t:'table', title:L('Podúlohy','Subtasks'),
      cols:[L('Podúloha','Subtask'),L('Typ','Type'),L('Stav','State'),L('Termín','Due')],
      rows:[
        {c:[L('Nastavenie sandbox 3DS prostredia','3DS sandbox setup'),'task',['ok','done'],L('8. 8.','Aug 8')], go:null},
        {c:[L('Bug: timeout pri retry platby','Bug: timeout on payment retry'),'bug',['cond','waiting'],L('9. 8.','Aug 9')], go:null},
        {c:[L('Nápad: fallback platobná brána','Idea: fallback payment gateway'),'idea',['q','backlog'],'—'], go:null}
      ],
      note:L('3 podúlohy — 1/3 hotová (33 %)','3 subtasks — 1/3 done (33%)')},
    {t:'timeline', title:L('Časová os úlohy','Item timeline'), items:[
      [L('Dnes','Today'), L('Podúloha Bug: timeout pri retry platby presunutá do waiting','Subtask Bug: timeout on payment retry moved to waiting')],
      [L('Včera','Yesterday'), L('Podúloha Nastavenie sandbox 3DS prostredia dokončená','Subtask 3DS sandbox setup completed')],
      [L('Pred 3 dňami','3 days ago'), L('Úloha presunutá z backlogu do in_progress','Item moved from backlog to in_progress')],
      ['S-31 · commit', L('Úloha zaradená do šprintu S-31','Item added to sprint S-31')]
    ], note:L('ukážkové','illustrative')},
    {t:'banner', tone:'cond', text:L('Blokuje ju bug s timeoutom pri retry platby (waiting) — bez opravy sa nedá dokončiť zvyšná podúloha 3DS overenia.','Blocked by the payment-retry timeout bug (waiting) — the remaining 3DS-verification subtask cannot finish without a fix.')}
  ],
  ai:[
    {q:L('Aký je stav úlohy Migrácia platobnej brány?','What is the status of the Payment gateway migration item?'), a:L('in_progress, sprint S-31 (commit), termín 9. 8., priorita P1.','in_progress, sprint S-31 (commit), due Aug 9, priority P1.'), cite:'appka', act:null},
    {q:L('Koľko podúloh úloha má?','How many subtasks does the item have?'), a:L('3 podúlohy: sandbox 3DS (done), bug s timeoutom pri retry (waiting), nápad fallback brány (backlog) — plnenie 1/3.','3 subtasks: 3DS sandbox (done), payment-retry timeout bug (waiting), fallback-gateway idea (backlog) — 1/3 complete.'), cite:'appka', act:null},
    {q:L('Prečo úloha ešte nie je hotová?','Why is the item not done yet?'), a:L('Plnenie podúloh je 1/3 — zvyšné dve čakajú: jedna na opravu bugu, druhá ešte ani nezačala.','Subtask completion is 1/3 — the other two are pending: one on a bug fix, the other not yet started.'), cite:'appka', act:null}
  ]
},

{ key:'sprinty', icon:'clock', title:L('Šprinty','Sprints'),
  sub:L('12 šprintov: draft → commit → close, carry-over, plnenie.','12 sprints: draft → commit → close, carry-over, completion.'),
  blocks:[
    {t:'kpis', items:[
      {l:L('Aktuálny šprint','Current sprint'), v:'S-31', sub:'commit'},
      {l:L('Plnenie S-31','S-31 completion'), v:'55 %', tone:'cond'},
      {l:L('Carry-over do S-31','Carried over to S-31'), v:int(1), sub:L('Carry-over: e2e axe','Carry-over: e2e axe')},
      {l:L('Uzavreté šprinty','Closed sprints'), v:int(10), tone:'ok'}
    ]},
    {t:'table', title:null,
      cols:['Sprint',L('Obdobie','Period'),L('Stav','State'),L('Položky','Items'),'Plnenie',L('Carry-over','Carry-over'),L('Poznámka','Note')],
      rows:[
        {c:['S-21','10.3.–23.3.',['ok','close'],7,{pln:95},0,'—'], go:null},
        {c:['S-22','24.3.–6.4.',['ok','close'],8,{pln:98},0,'—'], go:null},
        {c:['S-23','7.4.–20.4.',['ok','close'],10,{pln:100},0,'—'], go:null},
        {c:['S-24','21.4.–4.5.',['ok','close'],9,{pln:92},1,'—'], go:null},
        {c:['S-25','5.5.–18.5.',['ok','close'],11,{pln:100},0,'—'], go:null},
        {c:['S-26','19.5.–1.6.',['ok','close'],13,{pln:97},0,'—'], go:null},
        {c:['S-27','2.6.–15.6.',['ok','close'],10,{pln:100},1,'—'], go:null},
        {c:['S-28','16.6.–29.6.',['ok','close'],9,{pln:100},0,'—'], go:null},
        {c:['S-29','30.6.–13.7.',['ok','close'],12,{pln:100},0,'—'], go:null},
        {c:['S-30','14.7.–27.7.',['ok','close'],14,{pln:100},0,'—'], go:null},
        {c:['S-31','28.7.–10.8.',['info','commit'],11,{pln:55},1,L('Carry-over: e2e axe zo S-30','Carry-over: e2e axe from S-30')], go:null},
        {c:['S-32','11.8.–24.8.',['q','draft'],6,{pln:0},0,'—'], go:null}
      ],
      note:L('S-28–S-32 stav a S-31 carry-over (e2e axe) overené z hubu 1:1 · ostatné (obdobia, plnenie, počty) ukážkové','S-28–S-32 status and the S-31 carry-over (e2e axe) verified from the hub 1:1 · the rest (periods, completion, counts) illustrative')},
    {t:'lines', title:L('Plnenie šprintu (%)','Sprint completion (%)'), avg:false,
      labels:['S-21','S-22','S-23','S-24','S-25','S-26','S-27','S-28','S-29','S-30','S-31','S-32'],
      series:[{l:L('Plnenie','Completion'), v:[95,98,100,92,100,97,100,100,100,100,55,0], color:'var(--acc)'}],
      note:L('S-31 (55 %) a S-32 (0 %, práve draftovaný) overené z hubu','S-31 (55%) and S-32 (0%, currently in draft) verified from the hub')}
  ],
  ai:[
    {q:L('Koľko šprintov appka sleduje?','How many sprints does the app track?'), a:L('12 šprintov, S-21 až S-32, dvojtýždňové cykly.','12 sprints, S-21 to S-32, two-week cycles.'), cite:'appka', act:null},
    {q:L('Ktorý šprint je aktuálne otvorený?','Which sprint is currently open?'), a:L('S-31 v stave commit, plnenie 55 %, obdobie 28. 7.–10. 8.','S-31 in the commit state, 55% complete, period Jul 28–Aug 10.'), cite:'appka', act:null},
    {q:L('Čo znamená carry-over v S-31?','What does the carry-over in S-31 mean?'), a:L('1 položka (Carry-over: e2e axe) bola prenesená z uzavretého S-30 — overené z pôvodných dát appky.','1 item (Carry-over: e2e axe) was carried over from the closed S-30 — verified from the app\'s original data.'), cite:'pamäť', act:{l:L('Otvoriť úlohu','Open the item'), k:'open'}}
  ]
},

{ key:'checkpointy', icon:'check', title:L('Checkpointy','Checkpoints'),
  sub:L('28 checkpointov: readiness, termín, stav.','28 checkpoints: readiness, due date, state.'),
  blocks:[
    {t:'kpis', items:[
      {l:L('Rozhodnuté','Decided'), v:int(25)},
      {l:L('Naplánované','Planned'), v:int(3), tone:'info'},
      {l:L('Priemerná readiness (rozhodnuté)','Avg readiness (decided)'), v:'62 %'},
      {l:L('Po termíne','Overdue'), v:int(1), tone:'no', sub:L('zhoduje sa s Prehľadom','matches the Overview')}
    ]},
    {t:'table', title:null,
      cols:['Checkpoint',L('Projekt','Project'),'Readiness',L('Termín','Due'),L('Stav','State')],
      rows:[
        {c:[L('CP-01 · Kickoff kritérií pripravenosti','CP-01 · Kickoff of readiness criteria'),'Aura Roadmap',{pln:90},'10. 4.',['ok',L('rozhodnuté · go','decided · go')]], go:null},
        {c:[L('CP-02 · Výber DB stacku','CP-02 · DB stack selection'),'Aura Roadmap',{pln:85},'24. 4.',['ok',L('rozhodnuté · go','decided · go')]], go:null},
        {c:[L('CP-03 · Rozsah zjednodušenia (36→20 tabuliek)','CP-03 · Simplification scope (36→20 tables)'),'Aura Roadmap',{pln:80},'8. 5.',['ok',L('rozhodnuté · go','decided · go')]], go:null},
        {c:[L('CP-04 · Rate-limit kalibrácia','CP-04 · Rate-limit calibration'),L('Bezpečnosť','Security'),{pln:55},'15. 5.',['cond',L('rozhodnuté · conditional_go','decided · conditional_go')]], go:null},
        {c:[L('CP-05 · Dizajnový systém — zjednotenie (teal)','CP-05 · Design system — unification (teal)'),'Aura Banner Studio',{pln:60},'22. 5.',['cond',L('rozhodnuté · conditional_go','decided · conditional_go')]], go:null},
        {c:[L('CP-06 · Rozsah Aura KPI integrácií','CP-06 · Aura KPI integration scope'),'Aura KPI',{pln:70},'29. 5.',['ok',L('rozhodnuté · go','decided · go')]], go:null},
        {c:[L('CP-07 · Bezpečnostný audit dodávateľa','CP-07 · Vendor security audit'),L('Bezpečnosť','Security'),{pln:25},'5. 6.',['no',L('rozhodnuté · no_go','decided · no_go')]], go:null},
        {c:[L('CP-08 · Go-live platby','CP-08 · Go-live payments'),'E-shop',{pln:72},'14. 6.',['cond',L('rozhodnuté · conditional_go','decided · conditional_go')]], go:'projekt'},
        {c:[L('CP-09 · Release v2.0','CP-09 · Release v2.0'),'Aura Roadmap',{pln:96},'28. 6.',['ok',L('rozhodnuté · go','decided · go')]], go:null},
        {c:[L('CP-10 · Automatické KPI vstupy','CP-10 · Automated KPI inputs'),'Aura KPI',{pln:64},'5. 7.',['cond',L('rozhodnuté · conditional_go','decided · conditional_go')]], go:null},
        {c:[L('CP-11 · Penetračný audit','CP-11 · Penetration audit'),L('Bezpečnosť','Security'),{pln:38},'12. 7.',['q',L('rozhodnuté · deferred','decided · deferred')]], go:null},
        {c:[L('CP-12 · Pilot renderu','CP-12 · Render pilot'),'Aura Banner Studio',{pln:88},'19. 7.',['ok',L('rozhodnuté · go','decided · go')]], go:null},
        {c:[L('CP-13 · SSO gateway architektúra','CP-13 · SSO gateway architecture'),'Aura Hub — SSO migrácia',{pln:68},'26. 7.',['cond',L('rozhodnuté · conditional_go','decided · conditional_go')]], go:null},
        {c:[L('CP-14 · Nightly export objednávok','CP-14 · Nightly order export'),'Aura Tržby appka',{pln:20},'2. 8.',['q',L('rozhodnuté · deferred','decided · deferred')]], go:null},
        {c:[L('CP-15 · Mobilný klient — go/no-go','CP-15 · Mobile client — go/no-go'),L('Mobilný klient — prieskum','Mobile client — research'),{pln:45},'9. 8.',['no',L('rozhodnuté · no_go','decided · no_go')]], go:null},
        {c:[L('CP-16 · SEO technický audit — rozsah','CP-16 · SEO technical audit — scope'),L('SEO technický audit','SEO technical audit'),{pln:82},'16. 8.',['ok',L('rozhodnuté · go','decided · go')]], go:null},
        {c:[L('CP-17 · Kapacita skladu Q4','CP-17 · Q4 warehouse capacity'),L('Sklad — reorganizácia','Warehouse — reorganization'),{pln:58},'23. 8.',['cond',L('rozhodnuté · conditional_go','decided · conditional_go')]], go:null},
        {c:[L('CP-18 · Onboarding redizajn — koncept','CP-18 · Onboarding redesign — concept'),L('Onboarding flow — redizajn','Onboarding flow — redesign'),{pln:40},'30. 8.',['q',L('rozhodnuté · deferred','decided · deferred')]], go:null},
        {c:[L('CP-19 · Zálohovací runbook — schválenie','CP-19 · Backup runbook — approval'),L('Zálohovací runbook','Backup runbook'),{pln:100},'6. 9.',['ok',L('rozhodnuté · go','decided · go')]], go:null},
        {c:[L('CP-20 · CRM napojenie — výber nástroja','CP-20 · CRM integration — tool selection'),L('CRM napojenie','CRM integration'),{pln:30},'13. 9.',['no',L('rozhodnuté · no_go','decided · no_go')]], go:null},
        {c:[L('CP-21 · Reklamačný workflow v2 — spustenie','CP-21 · Claims workflow v2 — launch'),L('Reklamačný workflow v2','Claims workflow v2'),{pln:75},'20. 9.',['ok',L('rozhodnuté · go','decided · go')]], go:null},
        {c:[L('CP-22 · Newsletter automatizácia — pilot','CP-22 · Newsletter automation — pilot'),L('Newsletter automatizácia','Newsletter automation'),{pln:66},'27. 9.',['cond',L('rozhodnuté · conditional_go','decided · conditional_go')]], go:null},
        {c:[L('CP-23 · Fotoštúdio kapacita','CP-23 · Photo studio capacity'),L('Fotoštúdio — kapacita','Photo studio — capacity'),{pln:15},'4. 10.',['q',L('rozhodnuté · deferred','decided · deferred')]], go:null},
        {c:[L('CP-24 · Agregačný endpoint Prehľadu','CP-24 · Overview aggregate endpoint'),L('Zlúčenie API Prehľadu','Overview API merge'),{pln:80},'11. 10.',['ok',L('rozhodnuté · go','decided · go')]], go:null},
        {c:[L('CP-25 · Observabilita — logovanie','CP-25 · Observability — logging'),L('Observabilita logov','Log observability'),{pln:50},'18. 10.',['cond',L('rozhodnuté · conditional_go','decided · conditional_go')]], go:null},
        {c:[L('CP-26 · roadmap_ro read-only DB user','CP-26 · roadmap_ro read-only DB user'),L('Aura Logistika integrácia','Aura Logistics integration'),{pln:35},'29. 7.',['no',L('po termíne','overdue')]], go:null},
        {c:[L('CP-27 · Akcent teal/zlatá — zjednotenie appiek','CP-27 · Teal/gold accent — family-wide unification'),L('Akcent teal/zlatá — zjednotenie','Teal/gold accent — unification'),{pln:20},'1. 11.',['info',L('naplánovaný','planned')]], go:null},
        {c:['CP-28 · GitHub remote + push (aura-roadmap)','Aura Roadmap',{pln:60},'8. 11.',['info',L('naplánovaný','planned')]], go:null}
      ],
      note:L('CP-08–CP-12 (readiness a rozhodnutie) overené z hubu 1:1 · CP-28 (chýbajúci GitHub remote) je reálny otvorený bod appky · ostatné čísla a dátumy ukážkové','CP-08–CP-12 (readiness and decision) verified from the hub 1:1 · CP-28 (missing GitHub remote) is a real open item of the app · other numbers and dates illustrative')},
    {t:'bars', title:L('Rozhodnutia podľa typu (25 rozhodnutých)','Decisions by type (25 decided)'),
      data:[{l:'go',v:10},{l:'conditional_go',v:8},{l:'no_go',v:3},{l:'deferred',v:4}],
      note:L('zhoduje sa s obrazovkou Rozhodnutia','matches the Decisions screen')}
  ],
  ai:[
    {q:L('Koľko checkpointov appka eviduje?','How many checkpoints does the app track?'), a:L('28 checkpointov — 25 už má rozhodnutie, 3 sú naplánované (CP-26 až CP-28), z toho CP-26 je po termíne.','28 checkpoints — 25 already decided, 3 planned (CP-26 to CP-28), of which CP-26 is overdue.'), cite:'appka', act:null},
    {q:L('Ktorý checkpoint má najnižšiu readiness?','Which checkpoint has the lowest readiness?'), a:L('CP-23 Fotoštúdio kapacita s readiness 15 % — rozhodnutie deferred.','CP-23 Photo studio capacity at 15% readiness — decision deferred.'), cite:'appka', act:null},
    {q:L('Aký je stav CP-28?','What is the status of CP-28?'), a:L('CP-28 (GitHub remote + push appky Aura Roadmap) je naplánovaný, readiness 60 % — jediné nesplnené akceptačné kritérium z portu appky.','CP-28 (GitHub remote + push for Aura Roadmap) is planned, 60% readiness — the app port\'s single unmet acceptance criterion.'), cite:'pamäť', act:null}
  ]
},

{ key:'rozhodnutia', icon:'gauge', title:L('Rozhodnutia','Decisions'),
  sub:L('25 nemenných rozhodnutí: čo, prečo, dôsledok, dátum, kto.','25 immutable decisions: what, why, consequence, date, who.'),
  blocks:[
    {t:'kpis', items:[
      {l:'go', v:int(10), tone:'ok'},
      {l:'conditional_go', v:int(8), tone:'cond'},
      {l:'no_go', v:int(3), tone:'no'},
      {l:'deferred', v:int(4), tone:'q'}
    ]},
    {t:'table', title:null,
      cols:['Checkpoint',L('Projekt','Project'),'Readiness',L('Rozhodnutie','Decision'),L('Dôsledok','Consequence'),L('Dátum','Date'),L('Kto','Who')],
      rows:[
        {c:[L('CP-01 · Kickoff kritérií pripravenosti','CP-01 · Kickoff of readiness criteria'),'Aura Roadmap',{pln:90},['ok','go'],L('Kritériá schválené, port pokračuje do W1','Criteria approved, the port continues into W1'),'10. 4.','Daniel'], go:null},
        {c:[L('CP-02 · Výber DB stacku','CP-02 · DB stack selection'),'Aura Roadmap',{pln:85},['ok','go'],L('MariaDB 11.4 potvrdená, Cloudflare D1 zamietnuté','MariaDB 11.4 confirmed, Cloudflare D1 rejected'),'24. 4.','Delaja'], go:null},
        {c:[L('CP-03 · Rozsah zjednodušenia (36→20 tabuliek)','CP-03 · Simplification scope (36→20 tables)'),'Aura Roadmap',{pln:80},['ok','go'],L('Rozsah schválený, workflow engine a custom fields padajú','Scope approved, the workflow engine and custom fields are dropped'),'8. 5.','Daniel'], go:null},
        {c:[L('CP-04 · Rate-limit kalibrácia','CP-04 · Rate-limit calibration'),L('Bezpečnosť','Security'),{pln:55},['cond','conditional_go'],L('Limity dočasne zvýšené, treba zlúčiť fan-out endpointy','Limits raised temporarily, fan-out endpoints need merging'),'15. 5.','Kiko'], go:null},
        {c:[L('CP-05 · Dizajnový systém — zjednotenie (teal)','CP-05 · Design system — unification (teal)'),'Aura Banner Studio',{pln:60},['cond','conditional_go'],L('Akcent teal potvrdený, rozpor so zlatou odložený','Teal accent confirmed, the gold conflict deferred'),'22. 5.','Gabika'], go:null},
        {c:[L('CP-06 · Rozsah Aura KPI integrácií','CP-06 · Aura KPI integration scope'),'Aura KPI',{pln:70},['ok','go'],L('SEO a Logistika integrácie P1, e-shop API P2','SEO and Logistics integrations P1, e-shop API P2'),'29. 5.','Ema'], go:null},
        {c:[L('CP-07 · Bezpečnostný audit dodávateľa','CP-07 · Vendor security audit'),L('Bezpečnosť','Security'),{pln:25},['no','no_go'],L('Dodávateľ nesplnil požiadavky, hľadá sa náhrada','Vendor did not meet the requirements, a replacement is sought'),'5. 6.','Kiko'], go:null},
        {c:[L('CP-08 · Go-live platby','CP-08 · Go-live payments'),'E-shop',{pln:72},['cond','conditional_go'],L('Baseline BL-2026-06-14 · FU-31: 3DS testy','Baseline BL-2026-06-14 · FU-31: 3DS tests'),'14. 6.','Delaja'], go:'projekt'},
        {c:[L('CP-09 · Release v2.0','CP-09 · Release v2.0'),'Aura Roadmap',{pln:96},['ok','go'],L('Baseline BL-2026-06-28 · bez follow-upu','Baseline BL-2026-06-28 · no follow-up'),'28. 6.','Daniel'], go:null},
        {c:[L('CP-10 · Automatické KPI vstupy','CP-10 · Automated KPI inputs'),'Aura KPI',{pln:64},['cond','conditional_go'],L('Baseline BL-2026-07-05 · FU-33: 2 oddelenia manuálne','Baseline BL-2026-07-05 · FU-33: 2 departments stay manual'),'5. 7.','Ema'], go:null},
        {c:[L('CP-11 · Penetračný audit','CP-11 · Penetration audit'),L('Bezpečnosť','Security'),{pln:38},['q','deferred'],L('Baseline BL-2026-07-12 · FU-35: čaká na dodávateľa','Baseline BL-2026-07-12 · FU-35: waiting on vendor'),'12. 7.','Kiko'], go:null},
        {c:[L('CP-12 · Pilot renderu','CP-12 · Render pilot'),'Aura Banner Studio',{pln:88},['ok','go'],L('Baseline BL-2026-07-19 · FU-36: QA prah 90 %','Baseline BL-2026-07-19 · FU-36: 90% QA threshold'),'19. 7.','Gabika'], go:null},
        {c:[L('CP-13 · SSO gateway architektúra','CP-13 · SSO gateway architecture'),'Aura Hub — SSO migrácia',{pln:68},['cond','conditional_go'],L('Caddy forward_auth potvrdený, treba HMAC hlavičky','Caddy forward_auth confirmed, HMAC headers needed'),'26. 7.','Delaja'], go:null},
        {c:[L('CP-14 · Nightly export objednávok','CP-14 · Nightly order export'),'Aura Tržby appka',{pln:20},['q','deferred'],L('Čaká na /api/orders/export v sperky-ai (F6)','Waiting on /api/orders/export in sperky-ai (F6)'),'2. 8.','Daniel'], go:null},
        {c:[L('CP-15 · Mobilný klient — go/no-go','CP-15 · Mobile client — go/no-go'),L('Mobilný klient — prieskum','Mobile client — research'),{pln:45},['no','no_go'],L('Nedostatočný dopyt, prieskum sa zastavuje','Insufficient demand, the research is stopped'),'9. 8.','Kiko'], go:null},
        {c:[L('CP-16 · SEO technický audit — rozsah','CP-16 · SEO technical audit — scope'),L('SEO technický audit','SEO technical audit'),{pln:82},['ok','go'],L('Rozsah 40 strán potvrdený','40-page scope confirmed'),'16. 8.','Gabika'], go:null},
        {c:[L('CP-17 · Kapacita skladu Q4','CP-17 · Q4 warehouse capacity'),L('Sklad — reorganizácia','Warehouse — reorganization'),{pln:58},['cond','conditional_go'],L('Regály B a C, sklad A odložený','Racks B and C, warehouse A deferred'),'23. 8.','Hajnalka'], go:null},
        {c:[L('CP-18 · Onboarding redizajn — koncept','CP-18 · Onboarding redesign — concept'),L('Onboarding flow — redizajn','Onboarding flow — redesign'),{pln:40},['q','deferred'],L('Čaká na UX audit','Waiting on a UX audit'),'30. 8.','Ema'], go:null},
        {c:[L('CP-19 · Zálohovací runbook — schválenie','CP-19 · Backup runbook — approval'),L('Zálohovací runbook','Backup runbook'),{pln:100},['ok','go'],L('Retencia 3, mysqldump potvrdený','Retention 3, mysqldump confirmed'),'6. 9.','Kiko'], go:null},
        {c:[L('CP-20 · CRM napojenie — výber nástroja','CP-20 · CRM integration — tool selection'),L('CRM napojenie','CRM integration'),{pln:30},['no','no_go'],L('Zvolený nástroj nepodporuje potrebné API','The chosen tool does not support the required API'),'13. 9.','Delaja'], go:null},
        {c:[L('CP-21 · Reklamačný workflow v2 — spustenie','CP-21 · Claims workflow v2 — launch'),L('Reklamačný workflow v2','Claims workflow v2'),{pln:75},['ok','go'],L('Nový stavový diagram schválený','New state diagram approved'),'20. 9.','Hajnalka'], go:null},
        {c:[L('CP-22 · Newsletter automatizácia — pilot','CP-22 · Newsletter automation — pilot'),L('Newsletter automatizácia','Newsletter automation'),{pln:66},['cond','conditional_go'],L('Pilot na 1 segmente, vyhodnotenie o 4 týždne','Pilot on 1 segment, evaluated in 4 weeks'),'27. 9.','Gabika'], go:null},
        {c:[L('CP-23 · Fotoštúdio kapacita','CP-23 · Photo studio capacity'),L('Fotoštúdio — kapacita','Photo studio — capacity'),{pln:15},['q','deferred'],L('Čaká na rozpočet','Waiting on budget'),'4. 10.','Ema'], go:null},
        {c:[L('CP-24 · Agregačný endpoint Prehľadu','CP-24 · Overview aggregate endpoint'),L('Zlúčenie API Prehľadu','Overview API merge'),{pln:80},['ok','go'],L('7 requestov zlúčených do 1','7 requests merged into 1'),'11. 10.','Daniel'], go:null},
        {c:[L('CP-25 · Observabilita — logovanie','CP-25 · Observability — logging'),L('Observabilita logov','Log observability'),{pln:50},['cond','conditional_go'],L('Základné logovanie, alerting v ďalšom kole','Basic logging, alerting in a later round'),'18. 10.','Kiko'], go:null}
      ],
      note:L('rozhodnutie je po zápise nemenné · baseline + audit + follow-up · CP-08–CP-12 overené z hubu 1:1, ostatné ukážkové','the decision is immutable once recorded · baseline + audit + follow-up · CP-08–CP-12 verified from the hub 1:1, the rest illustrative')},
    {t:'banner', tone:'info', text:L('Rozhodnutie sa po zápise už neupravuje — zmenu rieši nová follow-up úloha a nový baseline snapshot, nikdy prepis pôvodného záznamu.','Once recorded a decision is never edited — a change goes through a new follow-up item and a new baseline snapshot, never a rewrite of the original record.')}
  ],
  ai:[
    {q:L('Koľko rozhodnutí appka eviduje a v akom pomere?','How many decisions does the app track, and in what ratio?'), a:L('25 rozhodnutí — 10 go, 8 conditional_go, 3 no_go, 4 deferred.','25 decisions — 10 go, 8 conditional_go, 3 no_go, 4 deferred.'), cite:'appka', act:null},
    {q:L('Prečo je rozhodnutie nemenné?','Why is a decision immutable?'), a:L('Po zápise sa checkpoint neupravuje — zmenu rieši nový baseline snapshot a follow-up úloha, nie prepis rozhodnutia.','Once recorded the checkpoint is not edited — a change goes through a new baseline snapshot and a follow-up item, not a rewrite of the decision.'), cite:'pamäť', act:null},
    {q:L('Ktoré rozhodnutie malo najvyššiu readiness?','Which decision had the highest readiness?'), a:L('CP-19 Zálohovací runbook — schválenie so 100 % readiness, rozhodnutie go.','CP-19 Backup runbook — approval at 100% readiness, decision go.'), cite:'appka', act:null}
  ]
},

{ key:'rizika', icon:'warn', title:L('Riziká','Risks'),
  sub:L('Register rizík s dopadom a pravdepodobnosťou — 18 záznamov, ukážkové.','Risk register with impact and likelihood — 18 records, illustrative.'),
  blocks:[
    {t:'kpis', items:[
      {l:L('Otvorené','Open'), v:int(10), tone:'no'},
      {l:L('Zmierňuje sa','Mitigating'), v:int(5), tone:'cond'},
      {l:L('Uzavreté','Closed'), v:int(3), tone:'ok'},
      {l:L('Kritické skóre','Critical score'), v:int(2), tone:'no', sub:L('dodávateľ pentestu · Aura Tržby appka','pentest vendor · Aura Tržby app')}
    ]},
    {t:'table', title:null,
      cols:[L('Riziko','Risk'),L('Projekt','Project'),L('Pravdepodobnosť','Likelihood'),L('Dopad','Impact'),L('Skóre','Score'),L('Vlastník','Owner'),L('Opatrenie','Mitigation'),L('Stav','State')],
      rows:[
        {c:[L('Dodávateľ penetračného testu nedodá termín','Pentest vendor misses the deadline'),L('Bezpečnosť','Security'),L('vysoká','high'),L('vysoký','high'),['no',L('kritické','critical')],'Kiko',L('Hľadá sa náhradný dodávateľ','A replacement vendor is being sought'),L('otvorené','open')]},
        {c:[L('3DS overenie predĺži go-live','3DS verification delays go-live'),'E-shop',L('stredná','medium'),L('vysoký','high'),['no',L('vysoké','high')],'Delaja',L('Sandbox testy pred ostrým nasadením','Sandbox tests before production rollout'),L('zmierňuje sa','mitigating')]},
        {c:[L('Rate-limit fan-out zhodí appku pri tíme za NAT','Rate-limit fan-out breaks the app for a team behind NAT'),L('Bezpečnosť','Security'),L('nízka','low'),L('stredný','medium'),['cond',L('stredné','medium')],'Kiko',L('Limity zvýšené (read 600, write 120, heavy 120)','Limits raised (read 600, write 120, heavy 120)'),L('uzavreté','closed')]},
        {c:[L('Manuálne KPI vstupy skreslia Team score','Manual KPI inputs skew the team score'),'Aura KPI',L('stredná','medium'),L('stredný','medium'),['cond',L('stredné','medium')],'Ema',L('2 oddelenia dočasne manuálne, plán automatizácie','2 departments temporarily manual, automation planned'),L('zmierňuje sa','mitigating')]},
        {c:[L('HMAC hlavičky SSO nesprávne podpísané','SSO HMAC headers signed incorrectly'),'Aura Hub — SSO migrácia',L('nízka','low'),L('vysoký','high'),['cond',L('stredné','medium')],'Delaja',L('Code review + integračné testy pred prepnutím','Code review + integration tests before cutover'),L('otvorené','open')]},
        {c:[L('Nightly sync tržieb závisí od appky, ktorá ešte neexistuje','Nightly revenue sync depends on an app that does not exist yet'),'Aura Tržby appka',L('vysoká','high'),L('vysoký','high'),['no',L('kritické','critical')],'Daniel',L('Čaká sa na /api/orders/export vo F6','Waiting on /api/orders/export in F6'),L('otvorené','open')]},
        {c:[L('CRM nástroj nepodporuje potrebné API','CRM tool lacks the required API'),L('CRM napojenie','CRM integration'),L('vysoká','high'),L('stredný','medium'),['no',L('vysoké','high')],'Delaja',L('Hľadá sa alternatívny nástroj','An alternative tool is being sought'),L('otvorené','open')]},
        {c:[L('Kapacita skladu B/C nepokryje Q4 špičku','Warehouse B/C capacity will not cover the Q4 peak'),L('Sklad — reorganizácia','Warehouse — reorganization'),L('stredná','medium'),L('stredný','medium'),['cond',L('stredné','medium')],'Hajnalka',L('Sklad A zostáva ako záloha','Warehouse A stays as a backup'),L('zmierňuje sa','mitigating')]},
        {c:[L('Newsletter pilot na 1 segmente neodhalí edge-case','Newsletter pilot on 1 segment misses edge cases'),L('Newsletter automatizácia','Newsletter automation'),L('nízka','low'),L('nízky','low'),['ok',L('nízke','low')],'Gabika',L('Vyhodnotenie po 4 týždňoch','Evaluated after 4 weeks'),L('otvorené','open')]},
        {c:[L('SEO audit rozsahu 40 strán nepokryje kategórie','40-page SEO audit scope misses categories'),L('SEO technický audit','SEO technical audit'),L('nízka','low'),L('stredný','medium'),['ok',L('nízke','low')],'Gabika',L('Rozsah revidovaný s Gabikou','Scope reviewed with Gabika'),L('uzavreté','closed')]},
        {c:[L('Rozpočet na fotoštúdio neschválený','Photo studio budget not approved'),L('Fotoštúdio — kapacita','Photo studio — capacity'),L('stredná','medium'),L('nízky','low'),['ok',L('nízke','low')],'Ema',L('Čaká sa na rozhodnutie CEO','Waiting on a CEO decision'),L('otvorené','open')]},
        {c:[L('Mobilný klient — nedostatočný dopyt','Mobile client — insufficient demand'),L('Mobilný klient — prieskum','Mobile client — research'),L('vysoká','high'),L('nízky','low'),['cond',L('stredné','medium')],'Kiko',L('Prieskum ukončený, projekt zastavený','Research finished, project stopped'),L('uzavreté','closed')]},
        {c:[L('Reklamačný workflow v2 — eskalácia bez majiteľa','Claims workflow v2 — escalation has no owner'),L('Reklamačný workflow v2','Claims workflow v2'),L('stredná','medium'),L('stredný','medium'),['cond',L('stredné','medium')],'Hajnalka',L('Doplnená automatická eskalácia po 5 dňoch','Auto-escalation after 5 days added'),L('zmierňuje sa','mitigating')]},
        {c:[L('Onboarding redizajn čaká na UX audit','Onboarding redesign waits on a UX audit'),L('Onboarding flow — redizajn','Onboarding flow — redesign'),L('stredná','medium'),L('nízky','low'),['ok',L('nízke','low')],'Ema',L('UX audit naplánovaný na S-32','UX audit scheduled for S-32'),L('otvorené','open')]},
        {c:[L('Akcent teal vs zlatá naprieč appkami','Teal vs gold accent across the apps'),L('Akcent teal/zlatá — zjednotenie','Teal/gold accent — unification'),L('vysoká','high'),L('nízky','low'),['cond',L('stredné','medium')],'Delaja',L('Zjednotenie odložené ako samostatná úloha','Unification deferred as a separate task'),L('otvorené','open')]},
        {c:[L('Observabilita appiek — chyby sa hľadajú ručne','App observability — errors are found manually'),L('Observabilita logov','Log observability'),L('vysoká','high'),L('stredný','medium'),['no',L('vysoké','high')],'Kiko',L('Štruktúrované logovanie v S-32','Structured logging in S-32'),L('otvorené','open')]},
        {c:[L('roadmap_ro čítanie zaťaží appky pri fan-oute','roadmap_ro reads overload the apps under fan-out'),L('Aura Logistika integrácia','Aura Logistics integration'),L('nízka','low'),L('stredný','medium'),['ok',L('nízke','low')],'Daniel',L('Kešovanie 30 s na strane hubu','30s caching on the hub side'),L('zmierňuje sa','mitigating')]},
        {c:[L('GitHub remote appky Aura Roadmap chýba','Aura Roadmap app is missing a GitHub remote'),'Aura Roadmap',L('nízka','low'),L('nízky','low'),['ok',L('nízke','low')],'Daniel',L('git remote add + push naplánované (CP-28)','git remote add + push planned (CP-28)'),L('otvorené','open')]}
      ],
      note:L('ukážkové dáta — register rizík ako koncept · riadky 3, 16 a 18 odvodené z reálnych overených poučení a otvorených bodov appky','illustrative data — the risk register is a concept · rows 3, 16 and 18 are derived from real verified lessons and open items of the app')},
    {t:'donut', title:L('Podiel otvorených rizík','Share of open risks'), pct:56, label:L('otvorené','open'), note:L('10 z 18 rizík','10 of 18 risks')}
  ],
  ai:[
    {q:L('Koľko rizík appka eviduje?','How many risks does the app track?'), a:L('18 rizík naprieč 15 projektmi — dáta sú ukážkové.','18 risks across 15 projects — the data is illustrative.'), cite:'ukážka', act:null},
    {q:L('Ktoré riziko má najvyššie skóre?','Which risk has the highest score?'), a:L('Dve kritické: dodávateľ penetračného testu (Bezpečnosť) a závislosť na neexistujúcej appke (Aura Tržby).','Two critical ones: the pentest vendor (Security) and the dependency on an app that does not exist yet (Aura Tržby).'), cite:'ukážka', act:null},
    {q:L('Koľko rizík je stále otvorených?','How many risks are still open?'), a:L('10 z 18 je otvorených, 5 sa zmierňuje, 3 sú uzavreté.','10 of 18 are open, 5 are mitigating, 3 are closed.'), cite:'ukážka', act:{l:L('Filtrovať otvorené','Filter open'), k:'filter'}}
  ]
},

{ key:'audit', icon:'term', title:L('Audit','Audit'),
  sub:L('Audit log — každá zmena checkpointu, šprintu a rozhodnutia.','Audit log — every checkpoint, sprint and decision change.'),
  blocks:[
    {t:'kpis', items:[
      {l:L('Rozhodnutia zapísané (7 dní)','Decisions recorded (7 days)'), v:int(5)},
      {l:L('409 konflikty zachytené','409 conflicts captured'), v:int(2), tone:'cond'},
      {l:L('Bezpečnostné udalosti','Security events'), v:int(2), tone:'cond'},
      {l:L('Posledná záloha','Last backup'), v:L('pred 12 h','12h ago'), sub:L('78 KB · retencia 3','78 KB · retention 3')}
    ]},
    {t:'table', title:null,
      cols:[L('Čas','Time'),L('Kto','Who'),L('Entita','Entity'),L('Akcia','Action'),L('Detail','Detail')],
      rows:[
        {c:['28.7. 14:00','Delaja','CP-08',L('vytvorenie','creation'),L('Checkpoint vytvorený','Checkpoint created')]},
        {c:['01.8. 09:10','Delaja','CP-08','readiness',L('Readiness vyhodnotená','Readiness evaluated')]},
        {c:['03.8. 09:12','Delaja','CP-08',L('rozhodnutie','decision'),L('Rozhodnutie conditional_go (nemenné) + baseline + audit','Decision conditional_go (immutable) + baseline + audit')]},
        {c:['03.8. 09:15','Delaja','FU-31',L('založenie','item created'),L('Follow-up úloha založená do backlogu','Follow-up item created in the backlog')]},
        {c:['27.7. 08:00','Daniel','S-30',L('šprint','sprint'),L('Sprint S-30 uzavretý (close)','Sprint S-30 closed')]},
        {c:['28.7. 08:00','Daniel','S-31',L('šprint','sprint'),L('Sprint S-31 commitnutý (55 % naplánované)','Sprint S-31 committed (55% planned)')]},
        {c:['28.7. 08:05','Daniel',L('S-30 → S-31','S-30 → S-31'),L('carry-over','carry-over'),L('Carry-over: e2e axe prenesené z S-30 do S-31','Carry-over: e2e axe moved from S-30 to S-31')]},
        {c:['02.8. 11:20','Kiko',L('úloha: bug 409','item: bug 409'),L('chyba','error'),L('409 VERSION_CONFLICT zachytený v logu','409 VERSION_CONFLICT captured in the log')]},
        {c:['05.7. 22:00',L('systém','system'),'DB',L('záloha','backup'),L('Nočný mysqldump — dump 78 KB, retencia 3','Nightly mysqldump — 78 KB dump, retention 3')]},
        {c:['28.6. 10:00','Daniel','CP-09',L('rozhodnutie','decision'),L('Rozhodnutie go (nemenné) + baseline','Decision go (immutable) + baseline')]},
        {c:['12.7. 15:30','Kiko','CP-11',L('rozhodnutie','decision'),L('Rozhodnutie deferred (nemenné) — čaká na dodávateľa','Decision deferred (immutable) — waiting on vendor')]},
        {c:['19.7. 13:10','Gabika','CP-12',L('rozhodnutie','decision'),L('Rozhodnutie go (nemenné) — QA prah 90 % vo follow-upe','Decision go (immutable) — 90% QA threshold in the follow-up')]},
        {c:['01.8. 09:00','Ema',L('účet','account'),'security',L('Zmena hesla používateľa','User password changed')]},
        {c:['30.7. 23:55',L('systém','system'),L('účet','account'),'security',L('3 zlyhané prihlásenia za 12 min — účet zamknutý na 15 min (423)','3 failed logins in 12 min — account locked for 15 min (423)')]},
        {c:['31.7. 17:40','Hajnalka','S-31',L('súbežnosť','concurrency'),L('409 VERSION_CONFLICT pri úprave sprintu (súbežná úprava)','409 VERSION_CONFLICT while editing the sprint (concurrent edit)')]},
        {c:['29.7. 12:00','Gabika',L('report','report'),L('export','export'),L('Export xlsx — Sprint report S-30','xlsx export — Sprint report S-30')]},
        {c:['29.7. 06:00',L('systém','system'),'e2e','test',L('Beh 47/47 zelených vrátane axe (2 témy)','Run 47/47 green including axe (2 themes)')]},
        {c:['20.7. 10:15','Daniel',L('úlohy','items'),'import',L('Import CSV — 2 nové, 1 aktualizovaný','CSV import — 2 new, 1 updated')]},
        {c:['18.7. 09:00','Delaja','CP-13',L('vytvorenie','creation'),L('Checkpoint vytvorený — SSO gateway architektúra','Checkpoint created — SSO gateway architecture')]},
        {c:['26.7. 14:20','Delaja','CP-13',L('rozhodnutie','decision'),L('Rozhodnutie conditional_go (nemenné) — HMAC hlavičky do follow-upu','Decision conditional_go (immutable) — HMAC headers in the follow-up')]}
      ],
      note:L('409 VERSION_CONFLICT zápis, lockout politika (5/15 min → 423) a zálohy (78 KB, retencia 3) overené · časy a ostatné položky ukážkové','the 409 VERSION_CONFLICT entry, lockout policy (5/15min → 423) and backups (78 KB, retention 3) verified · times and other entries illustrative')},
    {t:'banner', tone:'cond', text:L('Prihlásenie sa nikdy nezvyšuje nad 10/min — je to bezpečnostne kritický bucket, kryje zámok účtu po 5 zlyhaniach za 15 minút.','The login rate limit is never raised above 10/min — it is a security-critical bucket that backs the account lockout after 5 failures in 15 minutes.')}
  ],
  ai:[
    {q:L('Čo appka loguje pri konflikte verzií?','What does the app log on a version conflict?'), a:L('409 VERSION_CONFLICT sa zapisuje do auditu s entitou a časom — presne takto bol zachytený konflikt na úlohe bug 409.','A 409 VERSION_CONFLICT is written to the audit log with the entity and time — exactly how the conflict on item bug 409 was captured.'), cite:'appka', act:null},
    {q:L('Aká je politika zálohovania?','What is the backup policy?'), a:L('Nočný mysqldump beží automaticky, posledné 3 zálohy sa držia — overené (dump 78 KB).','A nightly mysqldump runs automatically, the last 3 backups are kept — verified (78 KB dump).'), cite:'pamäť', act:null},
    {q:L('Koľko pokusov o prihlásenie appka toleruje?','How many login attempts does the app tolerate?'), a:L('5 zlyhaní za 15 minút → účet sa zamkne na 15 minút (HTTP 423) — login limit sa nikdy nezvyšuje.','5 failures in 15 minutes → the account locks for 15 minutes (HTTP 423) — the login limit is never raised.'), cite:'pamäť', act:null}
  ]
},

{ key:'nastavenia', icon:'gear', title:L('Nastavenia','Settings'),
  sub:L('Timeline, proces a roly, technické fakty appky.',"Timeline, process and roles, the app's technical facts."),
  blocks:[
    {t:'form', title:L('Timeline','Timeline'), fields:[
      {l:L('Režim','Mode'), s:L('Roadmap · Sprinty · Rozhodnutia','Roadmap · Sprints · Decisions'), type:'select', v:'Roadmap', opts:['Roadmap',L('Sprinty','Sprints'),L('Rozhodnutia','Decisions')]},
      {l:'Zoom', s:L('kvartál · mesiac · týždeň','quarter · month · week'), type:'select', v:L('mesiac','month'), opts:[L('kvartál','quarter'),L('mesiac','month'),L('týždeň','week')]},
      {l:L('Hustota','Density'), s:'cozy · compact', type:'select', v:'cozy', opts:['cozy','compact']}
    ], note:L('overené 1:1 z hubu','verified 1:1 from the hub')},
    {t:'form', title:L('Proces a roly','Process & roles'), fields:[
      {l:L('Stavový model','State model'), s:'backlog → in_progress → waiting → done', type:'switch', on:true},
      {l:L('Šprinty s carry-over','Sprints with carry-over'), s:'draft → commit → close', type:'switch', on:true},
      {l:L('Roly','Roles'), s:L('Admin · Editor · Prehliadač','Admin · Editor · Viewer'), type:'select', v:'Admin', opts:['Admin','Editor',L('Prehliadač','Viewer')]}
    ], note:L('jeden pevný stavový model, bez konfigurovateľného workflow enginu','one fixed state model, no configurable workflow engine')},
    {t:'code', title:L('Technické fakty (overené)','Technical facts (verified)'), lang:'text',
      text:'Port 3040 · DB aura_roadmap · cookie aura_roadmap_session\nStack: Node 22 + Next.js 16 (standalone) + React 19 + TypeScript + MariaDB 11.4 (raw SQL)\n20 tabuliek · 535 unit testov (22 súborov) · 47/47 e2e (Playwright + axe)\nOptimistic concurrency: version + 409 VERSION_CONFLICT (checkpoints, sprints, work_items)\n6 rout: Prehľad · Timeline · Projekty · Úlohy · Rozhodnutia · Nastavenia\nRoly: Admin · Editor · Prehliadač\nTri piliere: plánovanie · evidencia pre reporting · rozhodovacia fronta'},
    {t:'banner', tone:'cond', text:L('Otvorené do ďalšieho šprintu: zlúčiť 7 requestov Prehľadu do 1 endpointu · observabilita chýba (chyby sa hľadajú ručne v docker logs) · 23 lint upozornení · integrácie cez roadmap_ro · rozpor teal/zlatá v rodine appiek.','Open for the next sprint: merge the 7 Overview requests into 1 endpoint · observability is missing (errors are found manually in docker logs) · 23 lint warnings · roadmap_ro integrations · the teal/gold accent conflict across the app family.')}
  ],
  ai:[
    {q:L('Aký je stavový model úloh?','What is the item state model?'), a:L('backlog → in_progress → waiting → done — jeden pevný model, bez konfigurovateľného workflow enginu.','backlog → in_progress → waiting → done — one fixed model, no configurable workflow engine.'), cite:'appka', act:null},
    {q:L('Koľko unit testov appka má?','How many unit tests does the app have?'), a:L('535 unit testov v 22 súboroch + 47/47 e2e testov (Playwright) vrátane axe na oboch témach.','535 unit tests across 22 files + 47/47 e2e tests (Playwright) including axe on both themes.'), cite:'pamäť', act:null},
    {q:L('Aké sú otvorené body appky?','What are the app\'s open items?'), a:L('Zlúčenie 7 requestov Prehľadu, chýbajúca observabilita, 23 lint upozornení, integrácie cez roadmap_ro a rozpor akcentu teal/zlatá v rodine.','Merging the 7 Overview requests, missing observability, 23 lint warnings, roadmap_ro integrations, and the teal/gold accent conflict across the family.'), cite:'pamäť', act:null}
  ]
},

{ key:'prehlad', icon:'home', title:L('Prehľad','Overview'),
  sub:L('Tri piliere appky — plánovanie, evidencia pre reporting, rozhodovacia fronta — na jednej obrazovke.',"The app's three pillars — planning, reporting evidence, decision queue — on one screen."),
  blocks:[
    {t:'kpis', items:[
      {l:L('Aktívne projekty','Active projects'), v:int(6), sub:L('3 piliere: plán · evidencia · rozhodnutia','3 pillars: plan · evidence · decisions')},
      {l:L('Úlohy v behu','Items in progress'), v:int(8), sub:'in_progress', tone:'info'},
      {l:L('Rozhodnutia vo fronte','Decisions queued'), v:int(2), sub:L('čakajú na go / no-go','awaiting go / no-go'), tone:'cond'},
      {l:L('Checkpointy po termíne','Checkpoints overdue'), v:int(1), sub:L('vyžaduje rozhodnutie','needs a decision'), tone:'no'}
    ]},
    {t:'bars', title:L('Práca naprieč šprintami (položky)','Work across sprints (items)'),
      data:[{l:'S-21',v:7},{l:'S-22',v:8},{l:'S-23',v:10},{l:'S-24',v:9},{l:'S-25',v:11},{l:'S-26',v:13},{l:'S-27',v:10},{l:'S-28',v:9},{l:'S-29',v:12},{l:'S-30',v:14},{l:'S-31',v:11},{l:'S-32',v:6}],
      note:L('S-28 až S-32 zhodné s hodnotami hubu (overené) · S-21–S-27 ukážkové na doplnenie histórie','S-28 to S-32 match the hub values (verified) · S-21–S-27 illustrative to fill in history')},
    {t:'donut', title:L('Rozloženie stavov položiek','Item state distribution'), pct:52, label:L('done','done'),
      note:L('overené z hubu: done 27 · in_progress 5 · waiting 3 · backlog 17 = 52 položiek celkom','verified from the hub: done 27 · in_progress 5 · waiting 3 · backlog 17 = 52 items in total')},
    {t:'list', title:L('Rozhodnutia vo fronte','Decisions queue'), items:[
      {title:L('Checkpoint: Go-live brána','Checkpoint: Go-live gate'), sub:L('Aura KPI · readiness 78 % · conditional_go · follow-up založený','Aura KPI · readiness 78% · conditional_go · follow-up created'), badge:['cond','conditional_go']},
      {title:L('Checkpoint: Q3 rozpočet infra','Checkpoint: Q3 infra budget'), sub:L('Bezpečnosť · deferred — čaká na cenové ponuky','Security · deferred — awaiting quotes'), badge:['q','deferred']}
    ], note:L('overené z hubu 1:1 — obe položky','verified from the hub 1:1 — both items')},
    {t:'banner', tone:'cond', text:L('1 checkpoint po termíne — čaká na rozhodnutie vo fronte.','1 checkpoint overdue — awaiting a decision in the queue.')}
  ],
  ai:[
    {q:L('Koľko úloh je aktuálne v behu?','How many items are currently in progress?'), a:L('8 z 32 evidovaných úloh má stav in_progress, najviac naviazaných na aktuálny šprint S-31 (commit).','8 of the 32 tracked items are in_progress, most tied to the current sprint S-31 (commit).'), cite:'appka', act:{l:L('Otvoriť Úlohy','Open Work items'), k:'filter'}},
    {q:L('Ktoré rozhodnutia čakajú vo fronte?','Which decisions are queued?'), a:L('Dve: Go-live brána (Aura KPI, readiness 78 %, conditional_go) a Q3 rozpočet infra (Bezpečnosť, deferred).','Two: the Go-live gate (Aura KPI, readiness 78%, conditional_go) and the Q3 infra budget (Security, deferred).'), cite:'appka', act:{l:L('Otvoriť Rozhodnutia','Open Decisions'), k:'open'}},
    {q:L('Aký je pomer done vs backlog položiek?','What is the done vs backlog ratio?'), a:L('27 z 52 položiek (52 %) je done, 17 (33 %) je v backlogu — zvyšok je in_progress alebo waiting.','27 of 52 items (52%) are done, 17 (33%) are in the backlog — the rest is in_progress or waiting.'), cite:'appka', act:null}
  ]
}

]
};

