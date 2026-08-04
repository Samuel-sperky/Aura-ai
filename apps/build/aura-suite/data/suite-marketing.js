const APP_MARKETING = {
key:'marketing', name:'Aura Marketing', port:'3000 · 8091', icon:'megaphone',
tag:L('Marketingový kokpit: ads hierarchia s ROAS pásmami a AI banner štúdio s campaign lockom.','E-shop marketing cockpit: ads hierarchy with ROAS bands and an AI banner studio with campaign lock.'),
feat:[
  L('Strom Platforma → Kampaň → Zostava → Reklama s rollupom a ROAS pásmami','Platform → Campaign → Ad set → Ad tree with rollups and ROAS bands'),
  L('Bannery 8 jazykov × 5 rozmerov, render HTML/CSS → PNG → ZIP','Banners in 8 languages × 5 sizes, HTML/CSS → PNG → ZIP render'),
  L('Campaign lock (svet + modelka), QA gates a learning do KB','Campaign lock (world + model), QA gates and a KB learning loop')
],
live:{v:L('4 kampane · budget 62 %','4 campaigns · budget 62%'), tone:'cond', spark:[2,3,3,4,4,4,4]},

api:{
  endpoints:[
    {k:'campaigns', l:L('Kampane','Campaigns'), ms:180},
    {k:'products', l:L('Produkty','Products'), ms:140},
    {k:'stats', l:L('Štatistiky','Stats'), ms:225}
  ],
  sync:L('pred 5 min','5 min ago'), tone:'ok'
},

imp:{
  target:'kampane',
  cols:[
    {k:'kampan', l:L('Kampaň','Campaign'), t:'text'},
    {k:'svet', l:L('Svet','World'), t:'text'},
    {k:'modelka', l:L('Modelka','Model'), t:'text'},
    {k:'jazyky', l:L('Jazyky','Languages'), t:'num'},
    {k:'bannery', l:L('Bannery','Banners'), t:'num'},
    {k:'stav', l:L('Stav','Status'), t:'text'}
  ],
  key:[L('kľúč upsertu: názov kampane (unikátny)','upsert key: campaign name (unique)')],
  csv:'kampan;svet;modelka;jazyky;bannery;stav\n'+
      'Letné náušnice;Riviéra;Adela;5;25;Hotová\n'+
      'Diamantový výpredaj;Quiet Luxury;Nikola;8;40;Hotová\n'+
      'Zásnubné prstene;Quiet Luxury;Nikola;8;40;Lock aktívny\n'+
      'Perlová kolekcia;Atelier;Viktória;6;30;Pozastavená\n'+
      'Cyber Monday;Nordic Frost;Viktória;8;0;Návrh\n'+
      'Jesenná kolekcia;Riviéra;Nikola;8;40;QA\n'+
      'Zimné novinky;Atelier;Viktória;8;0;Návrh'
},

rep:{
  templates:[
    {k:'mesacny', l:L('Mesačný výkon','Monthly performance'), s:L('KPI + graf bannerov podľa rozmeru + tabuľka kampaní','KPIs + banner-size chart + campaign table')},
    {k:'roas', l:L('ROAS podľa platformy','ROAS by platform'), s:L('Rollup Platforma→Kampaň→Zostava→Reklama s pásmami a akciami','Platform→Campaign→Ad set→Ad rollup with bands and actions')},
    {k:'qa', l:L('QA report','QA report'), s:L('Pravidlá KB, pass rate a learning loop deviation → pravidlo','KB rules, pass rate and the deviation → rule learning loop')}
  ]
},

screens:[

/* 1 ─────────────────────────────────────────── PREHĽAD */
{key:'prehlad', icon:'grid', title:L('Prehľad','Overview'),
 sub:L('Marketingový modul nad sperky-ai a AI banner štúdio na jeden pohľad.','Marketing module over sperky-ai and the AI banner studio at a glance.'),
 blocks:[
  {t:'kpis', items:[
    {l:L('Aktívne kampane','Active campaigns'), v:int(4), sub:L('overené','verified'), tone:'ok'},
    {l:L('Vygenerované bannery','Banners generated'), v:int(320), sub:L('8 jazykov × 5 rozmerov · overené','8 languages × 5 sizes · verified'), live:true},
    {l:L('AI budget','AI budget'), v:L('62 % z 300 €','62% of €300'), sub:L('overené','verified'), tone:'cond'},
    {l:L('QA pass rate','QA pass rate'), v:L('91 %','91%'), sub:L('overené','verified'), tone:'ok'}
  ]},
  {t:'bars', title:L('Bannery podľa rozmeru','Banners by size'),
    data:[{l:'1080×1080', v:96}, {l:'1080×1350', v:80}, {l:'1080×1920', v:56}, {l:'1200×628', v:48}, {l:'970×250', v:40}],
    note:L('320 bannerov spolu — overené','320 banners in total — verified')},
  {t:'donut', title:L('Čerpanie AI budgetu','AI budget burn'), pct:62, label:L('strop 300 € / mesiac','€300 monthly cap'),
    note:L('186 € vyčerpaných z 300 € — overené','€186 used of €300 — verified')},
  {t:'list', title:L('Kampane vyžadujúce akciu','Campaigns needing action'),
    items:[
      {title:'Black Friday', sub:L('manifest nedokončený','manifest unfinished'), badge:['q', L('Návrh','Draft')]},
      {title:L('Svadobná sezóna','Wedding season'), sub:L('2 bannery zablokované — major deviation','2 banners blocked — major deviation'), badge:['cond','QA']},
      {title:L('Zlaté prstene','Gold rings'), sub:L('render beží — 35/40 PNG','render running — 35/40 PNGs'), badge:['cond', L('Render','Render')]}
    ], note:L('stavy prevzaté z Banner Studia — overené','statuses taken from Banner Studio — verified')},
  {t:'banner', tone:'cond', text:L('AI budget: čerpanie 62 % mesačného stropu 300 € — pri prekročení sa generovanie zastaví.','AI budget at 62% of the €300 monthly cap — generation halts once the limit is hit.')}
 ],
 ai:[
  {q:L('Koľko kampaní je práve aktívnych a koľko bannerov už vzniklo?','How many campaigns are active right now and how many banners exist?'),
   a:L('4 aktívne kampane, spolu vygenerovaných 320 bannerov (8 jazykov × 5 rozmerov). Obe čísla sú overené z Banner Studia.','4 active campaigns, 320 banners generated in total (8 languages × 5 sizes). Both numbers are verified from Banner Studio.'),
   cite:'appka', act:{l:L('Otvoriť kampane','Open campaigns'), k:'open'}},
  {q:L('Ako blízko sme k mesačnému stropu AI budgetu?','How close are we to the monthly AI budget cap?'),
   a:L('Vyčerpaných je 186 € z 300 € (62 %), zostáva 114 € rezervy. Pri prekročení stropu sa generovanie automaticky zastaví.','186 € of 300 € is used (62%), leaving €114 headroom. Generation halts automatically once the cap is exceeded.'),
   cite:'appka', act:{l:L('Otvoriť čerpanie','Open spend'), k:'open'}},
  {q:L('Ktoré kampane potrebujú zásah dnes?','Which campaigns need attention today?'),
   a:L('Black Friday čaká na dokončenie manifestu, Svadobná sezóna má 2 zablokované bannery po QA major deviation a Zlaté prstene majú rozbehnutý render (35/40 PNG).','Black Friday needs its manifest finished, Wedding season has 2 blocked banners after a QA major deviation, and Gold rings has a render in progress (35/40 PNGs).'),
   cite:'appka', act:{l:L('Otvoriť zoznam','Open list'), k:'filter'}}
 ]},

/* 2 ─────────────────────────────────────────── KAMPANE */
{key:'kampane', icon:'list', title:L('Kampane','Campaigns'),
 sub:L('24 kampaní so stavmi renderu, počtom bannerov a ROAS pásmom.','24 campaigns with render status, banner counts and ROAS band.'),
 blocks:[
  {t:'kpis', items:[
    {l:L('Aktívne kampane','Active campaigns'), v:int(4), tone:'ok'},
    {l:L('V príprave','In draft'), v:int(3), tone:'q'},
    {l:L('Dokončené / archivované','Done / archived'), v:int(14), tone:'ok'},
    {l:L('Pozastavené (ROAS < 2)','Paused (ROAS < 2)'), v:int(3), tone:'no'}
  ]},
  {t:'table', title:null,
   cols:[L('Kampaň','Campaign'), L('Svet','World'), L('Modelka','Model'), L('Jazyky','Languages'), L('Bannery','Banners'), 'ROAS', L('Stav','Status')],
   rows:[
    {c:['Summer Sale','Riviéra','Adela',int(8),int(40),L('3,1','3.1'),['info',L('Lock aktívny','Lock active')]], go:'kampan'},
    {c:[L('Svadobná sezóna','Wedding season'),'Atelier','Viktória',int(8),int(40),L('3,6','3.6'),['cond','QA']], go:'kampan'},
    {c:[L('Zlaté prstene','Gold rings'),'Quiet Luxury','Nikola',int(8),int(35),L('5,1','5.1'),['cond',L('Render','Render')]], go:'kampan'},
    {c:['Black Friday',L('Nočné mesto','Night city'),'Nikola',int(8),'—','—',['q',L('Návrh','Draft')]], go:'kampan'},
    {c:['New Gem','Botanika','Adela',int(8),int(40),'—',['ok','Export ZIP']], go:'kampan'},
    {c:[L('Doprava zadarmo','Free shipping'),'Studio','Viktória',int(3),int(15),'—',['ok',L('Hotová','Done')]], go:'kampan'},
    {c:[L('Valentínska kolekcia','Valentine collection'),'Sunset Coast','Adela',int(8),int(40),L('4,2','4.2'),['ok',L('Hotová','Done')]], go:'kampan'},
    {c:[L('Deň matiek','Mother’s day'),'Nordic Frost','Viktória',int(6),int(30),L('3,8','3.8'),['ok',L('Hotová','Done')]], go:'kampan'},
    {c:[L('Vianočná kampaň 2025','Christmas campaign 2025'),'Velvet Room','Nikola',int(8),int(40),L('5,6','5.6'),['ok',L('Archivovaná','Archived')]], go:'kampan'},
    {c:[L('Jarná kolekcia','Spring collection'),'Botanika','Adela',int(8),int(40),L('2,9','2.9'),['ok',L('Hotová','Done')]], go:'kampan'},
    {c:[L('Diamantový výpredaj','Diamond sale'),'Quiet Luxury','Nikola',int(8),int(40),L('4,4','4.4'),['ok',L('Hotová','Done')]], go:'kampan'},
    {c:[L('Letné náušnice','Summer earrings'),'Riviéra','Adela',int(5),int(25),L('3,3','3.3'),['ok',L('Hotová','Done')]], go:'kampan'},
    {c:[L('Perlová kolekcia','Pearl collection'),'Atelier','Viktória',int(6),int(30),L('1,6','1.6'),['no',L('Pozastavená','Paused')]], go:'kampan'},
    {c:[L('Pánske šperky','Men’s jewelry'),L('Nočné mesto','Night city'),'Nikola',int(4),int(20),L('2,1','2.1'),['ok',L('Hotová','Done')]], go:'kampan'},
    {c:[L('Zásnubné prstene','Engagement rings'),'Quiet Luxury','Nikola',int(8),int(40),L('4,9','4.9'),['info',L('Lock aktívny','Lock active')]], go:'kampan'},
    {c:['Cyber Monday','Nordic Frost','Viktória',int(8),'—','—',['q',L('Návrh','Draft')]], go:'kampan'},
    {c:[L('Náramky s príveskom','Charm bracelets'),'Sunset Coast','Adela',int(5),int(25),L('3,0','3.0'),['ok',L('Hotová','Done')]], go:'kampan'},
    {c:[L('Retiazky 585','585 chains'),'Studio','Viktória',int(4),int(20),L('1,4','1.4'),['no',L('Pozastavená','Paused')]], go:'kampan'},
    {c:[L('Strieborný set','Silver set'),'Botanika','Adela',int(6),int(30),L('2,6','2.6'),['ok',L('Hotová','Done')]], go:'kampan'},
    {c:[L('Výpredaj skladu','Warehouse clearance'),'Velvet Room','Nikola',int(3),int(15),L('1,9','1.9'),['ok',L('Archivovaná','Archived')]], go:'kampan'},
    {c:[L('Jesenná kolekcia','Autumn collection'),'Riviéra','Adela',int(8),int(40),L('3,7','3.7'),['cond','QA']], go:'kampan'},
    {c:[L('Zimné novinky','Winter arrivals'),'Atelier','Viktória',int(8),'—','—',['q',L('Návrh','Draft')]], go:'kampan'},
    {c:[L('Krst a prvé sväté prijímanie','Christenings & communions'),'Studio','Viktória',int(4),int(20),L('2,4','2.4'),['ok',L('Hotová','Done')]], go:'kampan'},
    {c:[L('Výročná kampaň Aura 10 rokov','Aura 10th anniversary'),'Quiet Luxury','Nikola',int(8),int(40),L('4,1','4.1'),['cond',L('Render','Render')]], go:'kampan'}
   ],
   note:L('6 kampaní (Summer Sale … Doprava zadarmo) sú overené 1:1 z Banner Studia, zvyšných 18 je ukážkových v rovnakom formáte. ROAS pásma <2/2–4/≥4 sú overené.','6 campaigns (Summer Sale … Free shipping) are verified 1:1 from Banner Studio, the remaining 18 are illustrative in the same format. The <2/2–4/≥4 ROAS bands are verified.'),
   page:true}
 ],
 ai:[
  {q:L('Koľko kampaní je pozastavených a prečo?','How many campaigns are paused and why?'),
   a:L('3 kampane sú pozastavené — Perlová kolekcia (ROAS 1,6), Retiazky 585 (ROAS 1,4) — obe pod pásmom 2, kde appka odporúča kampaň vypnúť.','3 campaigns are paused — Pearl collection (ROAS 1.6), 585 chains (ROAS 1.4) — both under the 2.0 band where the app recommends pausing.'),
   cite:'ukážka', act:{l:L('Filtrovať pozastavené','Filter paused'), k:'filter'}},
  {q:L('Ktoré 6 kampaní sú reálne overené?','Which 6 campaigns are actually verified?'),
   a:L('Summer Sale, Svadobná sezóna, Zlaté prstene, Black Friday, New Gem a Doprava zadarmo — ich svet, modelka, jazyky, počet bannerov a stav prišli 1:1 z Banner Studia.','Summer Sale, Wedding season, Gold rings, Black Friday, New Gem and Free shipping — their world, model, languages, banner count and status came 1:1 from Banner Studio.'),
   cite:'pamäť', act:null},
  {q:L('Aký je priemerný počet bannerov na kampaň?','What is the average number of banners per campaign?'),
   a:L('Pri 18 dokončených/aktívnych kampaniach s vyplneným počtom bannerov vychádza priemer okolo 32 bannerov na kampaň (8 jazykov je bežné, počet rozmerov sa líši).','Across 18 done/active campaigns with a banner count filled in, the average is roughly 32 banners per campaign (8 languages is common, the number of sizes varies).'),
   cite:'ukážka', act:null}
 ]},

/* 3 ─────────────────────────────────────────── KAMPAN (detail) */
{key:'kampan', icon:'doc', title:L('Kampaň — Summer Sale','Campaign — Summer Sale'),
 sub:L('Detail kampane: campaign lock, manifest, render pipeline, QA a aktivita.','Campaign detail: campaign lock, manifest, render pipeline, QA and activity.'),
 blocks:[
  {t:'cards', n:2, items:[
   {title:L('Campaign lock','Campaign lock'), sub:L('Jeden svet · jedna modelka · identity lock','One world · one model · identity lock'),
    badge:['info', L('Lock aktívny','Lock active')],
    lines:[[L('Modelka','Model'), 'Adela (26–32, mediteránska)'], [L('Svet','World'),'Riviéra'], [L('Rozmery','Sizes'),'1080×1080 · 1080×1350 · 1080×1920 · 1200×628 · 970×250']],
    chips:[L('8 jazykov','8 languages')]},
   {title:L('Render pipeline','Render pipeline'), sub:L('Deterministický HTML/CSS render','Deterministic HTML/CSS render'),
    badge:['ok','Export ZIP'],
    lines:[['Pipeline', L('HTML/CSS → PNG → ZIP','HTML/CSS → PNG → ZIP')], ['Provider', L('mock · strop 300 €','mock · €300 cap')], [L('Export','Export'), L('40 PNG v 5 rozmeroch','40 PNGs in 5 sizes')]],
    chips:[L('Hotovo','Done')]}
  ]},
  {t:'donut', title:L('QA gates','QA gates'), pct:91, label:L('bannerov prešlo QA','of banners passed QA'), note:L('overené — modul kb','verified — kb module')},
  {t:'gallery', title:L('Bannery kampane podľa rozmeru','Campaign banners by size'),
   items:[{t:'1080×1080', n:8, qa:98},{t:'1080×1350', n:8, qa:96},{t:'1080×1920', n:8, qa:94},{t:'1200×628', n:8, qa:95},{t:'970×250', n:8, qa:90}],
   note:L('8 jazykov na rozmer — overené','8 languages per size — verified')},
  {t:'timeline', title:L('Aktivita','Activity'), items:[
   [L('Dnes','Today'), L('Export ZIP pripravený — 40 PNG v 5 rozmeroch','ZIP export ready — 40 PNGs in 5 sizes')],
   [L('Včera','Yesterday'), L('QA hard gates: 2 bannery major deviation → re-render','QA hard gates: 2 banners major deviation → re-render')],
   [L('Pred 3 dňami','3 days ago'), L('Render dokončený (HTML/CSS → PNG)','Render finished (HTML/CSS → PNG)')],
   [L('Pred 5 dňami','5 days ago'), L('Campaign lock: svet Riviéra + modelka Adela','Campaign lock: world Riviéra + model Adela')]
  ]}
 ],
 ai:[
  {q:L('Čo znamená campaign lock pri tejto kampani?','What does the campaign lock mean for this campaign?'),
   a:L('Svet Riviéra a modelka Adela sú zamknuté naprieč 8 jazykmi a 5 rozmermi — kým je kampaň otvorená, ani jedno sa nemení. Zmena znamená novú kampaň.','World Riviéra and model Adela are locked across 8 languages and 5 sizes — neither changes while the campaign is open. A change means a new campaign.'),
   cite:'appka', act:null},
  {q:L('Prešli všetky bannery kampane QA?','Did all campaign banners pass QA?'),
   a:L('91 % prešlo na prvý pokus, 2 bannery mali major deviation a boli poslané na re-render — export ZIP sa spustil až po ich oprave.','91% passed on the first try, 2 banners had a major deviation and were sent for a re-render — the ZIP export only ran after they were fixed.'),
   cite:'appka', act:{l:L('Otvoriť KB','Open KB'), k:'open'}},
  {q:L('Aký je stav exportu tejto kampane?','What is this campaign’s export status?'),
   a:L('Kampaň je hotová — export ZIP so 40 PNG v 5 rozmeroch je pripravený na stiahnutie.','The campaign is done — a ZIP export with 40 PNGs in 5 sizes is ready to download.'),
   cite:'appka', act:{l:L('Otvoriť bannery','Open banners'), k:'export'}}
 ]},

/* 4 ─────────────────────────────────────────── ADS */
{key:'ads', icon:'trend', title:L('Ads','Ads'),
 sub:L('Platforma → Kampaň → Zostava → Reklama s rollupom podľa ROAS pásiem.','Platform → Campaign → Ad set → Ad rollup by ROAS band.'),
 blocks:[
  {t:'kpis', items:[
   {l:'Blended ROAS', v:L('3,4','3.4'), sub:L('všetky platformy · ukážka','all platforms · sample')},
   {l:L('Škálovať (≥4)','Scale (≥4)'), v:int(11), tone:'ok'},
   {l:L('Držať (2–4)','Hold (2–4)'), v:int(11), tone:'cond'},
   {l:L('Vypnúť (<2)','Pause (<2)'), v:int(8), tone:'no'}
  ]},
  {t:'table', title:null,
   cols:[L('Položka','Item'), L('Úroveň','Level'), 'Spend', 'ROAS', L('Pásmo','Band'), L('Akcia','Action')],
   rows:[
    {c:['Google Ads',L('Platforma','Platform'),cur(9840),L('4,6','4.6'),['ok','≥ 4'],['ok',L('Škálovať','Scale')]]},
    {c:[L('· Kampaň: Zlaté prstene','· Campaign: Gold rings'),L('Kampaň','Campaign'),cur(5320),L('5,1','5.1'),['ok','≥ 4'],['ok',L('Škálovať','Scale')]]},
    {c:[L('· · Zostava: RO výkon','· · Ad set: RO performance'),L('Zostava','Ad set'),cur(2980),L('5,8','5.8'),['ok','≥ 4'],['ok',L('Škálovať','Scale')]]},
    {c:[L('· · · Reklama: banner 1080×1080','· · · Ad: banner 1080×1080'),L('Reklama','Ad'),cur(1640),L('6,2','6.2'),['ok','≥ 4'],['ok',L('Škálovať','Scale')]]},
    {c:[L('· · · Reklama: banner 1200×628','· · · Ad: banner 1200×628'),L('Reklama','Ad'),cur(1340),L('5,3','5.3'),['ok','≥ 4'],['ok',L('Škálovať','Scale')]]},
    {c:[L('· · Zostava: HU brand','· · Ad set: HU brand'),L('Zostava','Ad set'),cur(2340),L('3,4','3.4'),['cond','2–4'],['cond',L('Držať','Hold')]]},
    {c:[L('· Kampaň: Summer Sale','· Campaign: Summer Sale'),L('Kampaň','Campaign'),cur(4520),L('3,1','3.1'),['cond','2–4'],['cond',L('Držať','Hold')]]},
    {c:[L('· Kampaň: Diamantový výpredaj','· Campaign: Diamond sale'),L('Kampaň','Campaign'),cur(3120),L('4,4','4.4'),['ok','≥ 4'],['ok',L('Škálovať','Scale')]]},
    {c:[L('· · Zostava: SK výkon','· · Ad set: SK performance'),L('Zostava','Ad set'),cur(1780),L('4,7','4.7'),['ok','≥ 4'],['ok',L('Škálovať','Scale')]]},
    {c:[L('· · · Reklama: banner 1080×1350','· · · Ad: banner 1080×1350'),L('Reklama','Ad'),cur(980),L('5,0','5.0'),['ok','≥ 4'],['ok',L('Škálovať','Scale')]]},
    {c:[L('· · Zostava: CZ brand','· · Ad set: CZ brand'),L('Zostava','Ad set'),cur(1340),L('3,2','3.2'),['cond','2–4'],['cond',L('Držať','Hold')]]},
    {c:[L('· Kampaň: Jesenná kolekcia','· Campaign: Autumn collection'),L('Kampaň','Campaign'),cur(1980),L('3,7','3.7'),['cond','2–4'],['cond',L('Držať','Hold')]]},
    {c:[L('· · Zostava: HU remarketing','· · Ad set: HU remarketing'),L('Zostava','Ad set'),cur(1100),L('3,9','3.9'),['cond','2–4'],['cond',L('Držať','Hold')]]},
    {c:['Meta Ads',L('Platforma','Platform'),cur(6210),L('2,8','2.8'),['cond','2–4'],['cond',L('Držať','Hold')]]},
    {c:[L('· Kampaň: Svadobná sezóna','· Campaign: Wedding season'),L('Kampaň','Campaign'),cur(3890),L('3,6','3.6'),['cond','2–4'],['cond',L('Držať','Hold')]]},
    {c:[L('· · Zostava: SK remarketing','· · Ad set: SK remarketing'),L('Zostava','Ad set'),cur(1260),L('1,7','1.7'),['no','< 2'],['no',L('Vypnúť','Pause')]]},
    {c:[L('· · · Reklama: video 9:16','· · · Ad: video 9:16'),L('Reklama','Ad'),cur(480),L('1,2','1.2'),['no','< 2'],['no',L('Vypnúť','Pause')]]},
    {c:[L('· Kampaň: Perlová kolekcia','· Campaign: Pearl collection'),L('Kampaň','Campaign'),cur(1450),L('1,6','1.6'),['no','< 2'],['no',L('Vypnúť','Pause')]]},
    {c:[L('· · Zostava: SK lookalike','· · Ad set: SK lookalike'),L('Zostava','Ad set'),cur(820),L('1,5','1.5'),['no','< 2'],['no',L('Vypnúť','Pause')]]},
    {c:[L('· Kampaň: Zásnubné prstene','· Campaign: Engagement rings'),L('Kampaň','Campaign'),cur(2760),L('4,9','4.9'),['ok','≥ 4'],['ok',L('Škálovať','Scale')]]},
    {c:[L('· · Zostava: RO engagement','· · Ad set: RO engagement'),L('Zostava','Ad set'),cur(1540),L('5,2','5.2'),['ok','≥ 4'],['ok',L('Škálovať','Scale')]]},
    {c:[L('· · · Reklama: carousel 1080×1080','· · · Ad: carousel 1080×1080'),L('Reklama','Ad'),cur(890),L('5,5','5.5'),['ok','≥ 4'],['ok',L('Škálovať','Scale')]]},
    {c:['TikTok Ads',L('Platforma','Platform'),cur(2140),L('2,3','2.3'),['cond','2–4'],['cond',L('Držať','Hold')]]},
    {c:[L('· Kampaň: Letné náušnice','· Campaign: Summer earrings'),L('Kampaň','Campaign'),cur(1230),L('2,6','2.6'),['cond','2–4'],['cond',L('Držať','Hold')]]},
    {c:[L('· · Zostava: SK video','· · Ad set: SK video'),L('Zostava','Ad set'),cur(720),L('2,9','2.9'),['cond','2–4'],['cond',L('Držať','Hold')]]},
    {c:[L('· · · Reklama: video 9:16','· · · Ad: video 9:16'),L('Reklama','Ad'),cur(410),L('3,1','3.1'),['cond','2–4'],['cond',L('Držať','Hold')]]},
    {c:[L('· Kampaň: Pánske šperky','· Campaign: Men’s jewelry'),L('Kampaň','Campaign'),cur(910),L('1,8','1.8'),['no','< 2'],['no',L('Vypnúť','Pause')]]},
    {c:[L('· · Zostava: CZ video','· · Ad set: CZ video'),L('Zostava','Ad set'),cur(560),L('1,6','1.6'),['no','< 2'],['no',L('Vypnúť','Pause')]]},
    {c:[L('· Kampaň: Retiazky 585','· Campaign: 585 chains'),L('Kampaň','Campaign'),cur(630),L('1,3','1.3'),['no','< 2'],['no',L('Vypnúť','Pause')]]},
    {c:[L('· · Zostava: HU video','· · Ad set: HU video'),L('Zostava','Ad set'),cur(340),L('1,1','1.1'),['no','< 2'],['no',L('Vypnúť','Pause')]]}
   ],
   note:L('hodnoty spendu a ROAS sú ukážkové · pásma <2 vypnúť / 2–4 držať / ≥4 škálovať sú overené z reálnej appky sperky-ai','spend and ROAS values are illustrative · the <2 pause / 2–4 hold / ≥4 scale bands are verified from the real sperky-ai app'),
   page:true}
 ],
 ai:[
  {q:L('Aké sú ROAS pásma a čo znamenajú?','What are the ROAS bands and what do they mean?'),
   a:L('Pod 2 appka odporúča reklamu vypnúť, medzi 2 a 4 ju držať bez zmeny a od 4 vyššie škálovať rozpočet. Toto pravidlo je overené z reálnej ads hierarchie v sperky-ai.','Below 2 the app recommends pausing, between 2 and 4 holding steady, and 4+ scaling the budget. This rule is verified from the real ads hierarchy in sperky-ai.'),
   cite:'pamäť', act:null},
  {q:L('Ktorá platforma má najhorší ROAS?','Which platform has the worst ROAS?'),
   a:L('TikTok Ads je na hranici pásma Držať (2,3), no viacero jeho zostáv (Pánske šperky, Retiazky 585) je už pod 2 a mali by sa vypnúť.','TikTok Ads sits at the edge of the Hold band (2.3), but several of its ad sets (Men’s jewelry, 585 chains) are already below 2 and should be paused.'),
   cite:'ukážka', act:{l:L('Filtrovať Vypnúť','Filter Pause'), k:'filter'}},
  {q:L('Koľko položiek je v pásme Škálovať?','How many items are in the Scale band?'),
   a:L('11 z 30 riadkov stromu (Platforma→Kampaň→Zostava→Reklama) má ROAS ≥ 4 a odporúčanie škálovať, najmä pod Google Ads.','11 of the 30 tree rows (Platform→Campaign→Ad set→Ad) have ROAS ≥ 4 and a scale recommendation, mostly under Google Ads.'),
   cite:'ukážka', act:null}
 ]},

/* 5 ─────────────────────────────────────────── BANNERY */
{key:'bannery', icon:'image', title:L('Bannery','Banners'),
 sub:L('Galéria rozmerov a tabuľka jednotlivých bannerov.','Size gallery and a table of individual banners.'),
 blocks:[
  {t:'gallery', title:L('Bannery podľa rozmeru','Banners by size'),
   items:[{t:'1080×1080', n:96, qa:96},{t:'1080×1350', n:80, qa:92},{t:'1080×1920', n:56, qa:89},{t:'1200×628', n:48, qa:88},{t:'970×250', n:40, qa:90}],
   note:L('8 jazykov × 5 rozmerov = 320 bannerov spolu — overené · render HTML/CSS → PNG → ZIP','8 languages × 5 sizes = 320 banners total — verified · HTML/CSS → PNG → ZIP render')},
  {t:'table', title:L('Bannery — výber','Banners — sample'),
   cols:[L('Kampaň','Campaign'), L('Jazyk','Language'), L('Rozmer','Size'), L('Stav','Status'), 'QA', L('Vytvorené','Created')],
   rows:[
    {c:['Summer Sale','SK','1080×1080',['ok','Export ZIP'],int(98),L('27. 7.','Jul 27')]},
    {c:['Summer Sale','CZ','1080×1350',['ok','Export ZIP'],int(96),L('27. 7.','Jul 27')]},
    {c:['Summer Sale','HU','1080×1920',['ok','Export ZIP'],int(94),L('27. 7.','Jul 27')]},
    {c:['Summer Sale','RO','1200×628',['ok','Export ZIP'],int(95),L('27. 7.','Jul 27')]},
    {c:['Summer Sale','PL','970×250',['ok','Export ZIP'],int(90),L('27. 7.','Jul 27')]},
    {c:[L('Svadobná sezóna','Wedding season'),'SK','970×250',['no',L('Zablokovaný','Blocked')],int(58),L('3. 8.','Aug 3')]},
    {c:[L('Svadobná sezóna','Wedding season'),'CZ','970×250',['no',L('Zablokovaný','Blocked')],int(61),L('3. 8.','Aug 3')]},
    {c:[L('Svadobná sezóna','Wedding season'),'HU','1080×1080',['ok',L('QA prešlo','QA passed')],int(92),L('2. 8.','Aug 2')]},
    {c:[L('Svadobná sezóna','Wedding season'),'RO','1080×1350',['ok',L('QA prešlo','QA passed')],int(91),L('2. 8.','Aug 2')]},
    {c:[L('Zlaté prstene','Gold rings'),'SK','1080×1080',['cond',L('Render beží','Render running')],'—',L('4. 8.','Aug 4')]},
    {c:[L('Zlaté prstene','Gold rings'),'CZ','1080×1080',['cond',L('Render beží','Render running')],'—',L('4. 8.','Aug 4')]},
    {c:[L('Zlaté prstene','Gold rings'),'HU','1200×628',['ok',L('Hotový','Done')],int(93),L('2. 8.','Aug 2')]},
    {c:[L('Zlaté prstene','Gold rings'),'RO','970×250',['ok',L('Hotový','Done')],int(89),L('2. 8.','Aug 2')]},
    {c:['New Gem','SK','1080×1080',['ok','Export ZIP'],int(97),L('30. 7.','Jul 30')]},
    {c:['New Gem','CZ','1080×1350',['ok','Export ZIP'],int(95),L('30. 7.','Jul 30')]},
    {c:['New Gem','HU','1080×1920',['ok','Export ZIP'],int(92),L('30. 7.','Jul 30')]},
    {c:[L('Doprava zadarmo','Free shipping'),'SK','1200×628',['ok',L('Hotová','Done')],int(96),L('20. 7.','Jul 20')]},
    {c:[L('Doprava zadarmo','Free shipping'),'CZ','970×250',['ok',L('Hotová','Done')],int(94),L('20. 7.','Jul 20')]},
    {c:['Black Friday','SK','1080×1080',['q',L('Čaká na manifest','Awaiting manifest')],'—','—']},
    {c:[L('Diamantový výpredaj','Diamond sale'),'SK','1080×1080',['ok',L('Hotový','Done')],int(90),L('1. 8.','Aug 1')]},
    {c:[L('Valentínska kolekcia','Valentine collection'),'SK','1080×1350',['ok',L('Hotový','Done')],int(93),L('12. 1.','Jan 12')]},
    {c:[L('Perlová kolekcia','Pearl collection'),'SK','970×250',['cond',L('QA upozornenie','QA warning')],int(61),L('15. 6.','Jun 15')]},
    {c:[L('Zásnubné prstene','Engagement rings'),'SK','1080×1080',['ok',L('Hotový','Done')],int(95),L('10. 7.','Jul 10')]},
    {c:[L('Jesenná kolekcia','Autumn collection'),'SK','1080×1080',['cond',L('QA beží','QA running')],int(88),L('4. 8.','Aug 4')]}
   ],
   note:L('výber 24 z 320 bannerov · Svadobná sezóna SK/CZ 970×250 = 2 zablokované bannery (major deviation) — overené v znalostnej báze','sample of 24 of 320 banners · Wedding season SK/CZ 970×250 = 2 blocked banners (major deviation) — verified in the knowledge base'),
   page:true}
 ],
 ai:[
  {q:L('Koľko bannerov je celkovo a v akých rozmeroch?','How many banners are there in total and in which sizes?'),
   a:L('320 bannerov v 5 rozmeroch: 1080×1080 (96), 1080×1350 (80), 1080×1920 (56), 1200×628 (48), 970×250 (40). Overené z Banner Studia.','320 banners across 5 sizes: 1080×1080 (96), 1080×1350 (80), 1080×1920 (56), 1200×628 (48), 970×250 (40). Verified from Banner Studio.'),
   cite:'appka', act:null},
  {q:L('Ktoré bannery sú zablokované a prečo?','Which banners are blocked and why?'),
   a:L('2 bannery Svadobnej sezóny (SK a CZ, 970×250) sú zablokované pre major deviation kontrastu — čakajú na re-render.','2 Wedding season banners (SK and CZ, 970×250) are blocked for a contrast major deviation — awaiting a re-render.'),
   cite:'appka', act:{l:L('Otvoriť kampaň','Open campaign'), k:'open'}},
  {q:L('Ktorý rozmer má najnižšie QA skóre?','Which size has the lowest QA score?'),
   a:L('1080×1920 má najnižšie QA skóre spomedzi rozmerov (89), zatiaľ čo 1080×1080 je najvyššie (96).','1080×1920 has the lowest QA score among the sizes (89), while 1080×1080 is the highest (96).'),
   cite:'appka', act:null}
 ]},

/* 6 ─────────────────────────────────────────── MODELKY */
{key:'modelky', icon:'people', title:L('Modelky','Models'),
 sub:L('3 identity · vek a typ sa v rámci kampane nemenia (identity lock).','3 identities · age and type never change within a campaign (identity lock).'),
 blocks:[
  {t:'cards', n:3, items:[
   {title:'Adela', sub:L('mediteránska · teplý tón · vek 26–32','Mediterranean · warm tone · age 26–32'),
    badge:['info', L('Lock aktívny','Lock active')],
    lines:[[L('Seed','Seed'),'ad-7741'], [L('Bannery','Banners'), '80'], [L('Svety','Worlds'), 'Riviéra · Botanika · Sunset Coast']],
    chips:['Summer Sale', 'New Gem']},
   {title:'Viktória', sub:L('severská · studený tón · vek 24–30','Nordic · cool tone · age 24–30'),
    badge:['cond','QA'],
    lines:[[L('Seed','Seed'),'vk-3126'], [L('Bannery','Banners'), '55'], [L('Svety','Worlds'), 'Atelier · Studio · Nordic Frost']],
    chips:[L('Svadobná sezóna','Wedding season'), L('Doprava zadarmo','Free shipping')]},
   {title:'Nikola', sub:L('quiet luxury · neutrálny tón · vek 28–34','quiet luxury · neutral tone · age 28–34'),
    badge:['cond', L('Render','Render')],
    lines:[[L('Seed','Seed'),'nk-9052'], [L('Bannery','Banners'), '35'], [L('Svety','Worlds'), 'Quiet Luxury · Nočné mesto · Velvet Room']],
    chips:[L('Zlaté prstene','Gold rings'), 'Black Friday']}
  ]},
  {t:'table', title:L('Priradenie modelka × kampaň','Model × campaign assignment'),
   cols:[L('Kampaň','Campaign'), L('Modelka','Model'), L('Svet','World'), L('Zamknuté','Locked'), L('Bannery','Banners'), L('Stav','Status')],
   rows:[
    {c:['Summer Sale','Adela','Riviéra',['ok',L('áno','yes')],int(40),['info',L('Lock aktívny','Lock active')]]},
    {c:[L('Svadobná sezóna','Wedding season'),'Viktória','Atelier',['ok',L('áno','yes')],int(40),['cond','QA']]},
    {c:[L('Zlaté prstene','Gold rings'),'Nikola','Quiet Luxury',['ok',L('áno','yes')],int(35),['cond',L('Render','Render')]]},
    {c:['New Gem','Adela','Botanika',['ok',L('áno','yes')],int(40),['ok','Export ZIP']]},
    {c:[L('Doprava zadarmo','Free shipping'),'Viktória','Studio',['ok',L('áno','yes')],int(15),['ok',L('Hotová','Done')]]},
    {c:['Black Friday','Nikola',L('Nočné mesto','Night city'),['q',L('nie — koncept','no — draft')],'—',['q',L('Návrh','Draft')]]},
    {c:[L('Diamantový výpredaj','Diamond sale'),'Nikola','Quiet Luxury',['ok',L('áno','yes')],int(40),['ok',L('Hotová','Done')]]},
    {c:[L('Zásnubné prstene','Engagement rings'),'Nikola','Quiet Luxury',['ok',L('áno','yes')],int(40),['info',L('Lock aktívny','Lock active')]]},
    {c:[L('Valentínska kolekcia','Valentine collection'),'Adela','Sunset Coast',['ok',L('áno','yes')],int(40),['ok',L('Hotová','Done')]]},
    {c:[L('Perlová kolekcia','Pearl collection'),'Viktória','Atelier',['ok',L('áno','yes')],int(30),['no',L('Pozastavená','Paused')]]},
    {c:[L('Jesenná kolekcia','Autumn collection'),'Adela','Riviéra',['ok',L('áno','yes')],int(40),['cond','QA']]}
   ],
   note:L('Po zamknutí sa modelka ani svet v kampani nemenia — zmena znamená novú kampaň (reálna logika Banner Studia, overené).','Once locked, neither the model nor the world changes within a campaign — a change means a new campaign (real Banner Studio logic, verified).')}
 ],
 ai:[
  {q:L('Koľko modeliek appka používa a prečo tak málo?','How many models does the app use and why so few?'),
   a:L('3 stále identity — Adela, Viktória, Nikola. Campaign lock drží jednu modelku a jeden svet naprieč celou kampaňou (8 jazykov, 5 rozmerov), takže vizuálna konzistencia sa nerozbíja pridávaním ďalších tvárí.','3 fixed identities — Adela, Viktória, Nikola. The campaign lock keeps one model and one world across the whole campaign (8 languages, 5 sizes), so visual consistency doesn’t break by adding more faces.'),
   cite:'appka', act:null},
  {q:L('Ktorá modelka má najviac aktívnych kampaní?','Which model has the most active campaigns?'),
   a:L('Nikola je aktuálne priradená k 4 kampaniam v tabuľke (Zlaté prstene, Black Friday, Diamantový výpredaj, Zásnubné prstene), najviac spomedzi troch modeliek.','Nikola is currently assigned to 4 campaigns in the table (Gold rings, Black Friday, Diamond sale, Engagement rings), the most of the three models.'),
   cite:'ukážka', act:{l:L('Filtrovať Nikola','Filter Nikola'), k:'filter'}},
  {q:L('Čo sa stane, ak treba zmeniť svet uprostred kampane?','What happens if the world needs to change mid-campaign?'),
   a:L('Nedá sa — svet aj modelka sú v rámci kampane tvrdo zamknuté. Zmena znamená založenie novej kampane s novým lockom.','It can’t — both the world and the model are hard-locked within a campaign. A change means starting a new campaign with a new lock.'),
   cite:'appka', act:null}
 ]},

/* 7 ─────────────────────────────────────────── PRODUKTY */
{key:'produkty', icon:'coins', title:L('Produkty','Products'),
 sub:L('Ceny pre cenový overlay bannerov · 22 produktov · zmena ceny → re-render dotknutých bannerov.','Prices for the banner price overlay · 22 products · a price change → re-render of affected banners.'),
 blocks:[
  {t:'kpis', items:[
   {l:L('Produktov v cenníku','Products priced'), v:int(22)},
   {l:L('S overenou cenou','Price verified'), v:int(15), tone:'ok'},
   {l:L('Mení sa denne','Changes daily'), v:int(2), tone:'cond'},
   {l:L('Bez banneru','No banner'), v:int(2), tone:'q'}
  ]},
  {t:'table', title:null,
   cols:[L('Produkt','Product'), L('Kód','SKU'), L('Cena','Price'), L('Akčná cena','Sale price'), L('V banneroch','In banners'), L('Stav','Status')],
   rows:[
    {c:[L('Zlatý prsteň s briliantom','Gold ring with diamond'),'AU-R-118',cur(489),cur(439),int(12),['ok',L('cena overená','price verified')]]},
    {c:[L('Set svadobných obrúčok','Wedding band set'),'AU-W-201',cur(690),cur(621),int(10),['ok',L('cena overená','price verified')]]},
    {c:[L('Náramok z bieleho zlata','White gold bracelet'),'AU-B-042',cur(259),'—',int(8),['cond',L('bez akcie','no promo')]]},
    {c:[L('Strieborné náušnice','Silver earrings'),'AG-E-077',cur(39),cur(29),int(6),['ok',L('cena overená','price verified')]]},
    {c:[L('Retiazka zlatá 585','Gold chain 585'),'AU-N-014',cur(179),'—',int(4),['cond',L('cena sa mení denne','price changes daily')]]},
    {c:[L('Prívesok srdce','Heart pendant'),'AG-P-033',cur(24),cur(19),'—',['q',L('bez banneru','no banner')]]},
    {c:[L('Zásnubný prsteň platina','Platinum engagement ring'),'PL-R-205',cur(1290),'—',int(6),['ok',L('cena overená','price verified')]]},
    {c:[L('Náušnice visiace zlaté','Gold drop earrings'),'AU-E-091',cur(145),cur(129),int(5),['ok',L('cena overená','price verified')]]},
    {c:[L('Strieborný náramok s príveskami','Silver charm bracelet'),'AG-B-058',cur(65),'—',int(4),['cond',L('bez akcie','no promo')]]},
    {c:[L('Pánska retiazka oceľová','Steel men’s chain'),'INX-N-301',cur(39),'—',int(3),['cond',L('cena sa mení denne','price changes daily')]]},
    {c:[L('Snubné prstene set striebro','Silver wedding band set'),'AG-W-210',cur(210),cur(189),int(4),['ok',L('cena overená','price verified')]]},
    {c:[L('Perlový náhrdelník','Pearl necklace'),'AG-N-140',cur(89),'—',int(3),['cond',L('bez akcie','no promo')]]},
    {c:[L('Zlatý prívesok kríž','Gold cross pendant'),'AU-P-066',cur(99),'—',int(2),['ok',L('cena overená','price verified')]]},
    {c:[L('Diamantové náušnice','Diamond earrings'),'AU-E-150',cur(890),cur(799),int(6),['ok',L('cena overená','price verified')]]},
    {c:[L('Strieborný prsteň minimalistický','Minimalist silver ring'),'AG-R-025',cur(29),'—',int(8),['ok',L('cena overená','price verified')]]},
    {c:[L('Zlatý náramok s kamienkami','Gold bracelet with stones'),'AU-B-077',cur(320),cur(288),int(4),['ok',L('cena overená','price verified')]]},
    {c:[L('Prívesok mesiac striebro','Silver moon pendant'),'AG-P-090',cur(22),cur(19),int(3),['ok',L('cena overená','price verified')]]},
    {c:[L('Manžetové gombíky oceľ','Steel cufflinks'),'INX-C-014',cur(45),'—','—',['q',L('bez banneru','no banner')]]},
    {c:[L('Zlatá obrúčka pánska','Men’s gold band'),'AU-W-230',cur(410),'—',int(2),['cond',L('bez akcie','no promo')]]},
    {c:[L('Náhrdelník srdce zlato','Gold heart necklace'),'AU-N-055',cur(199),cur(179),int(5),['ok',L('cena overená','price verified')]]},
    {c:[L('Náušnice kruhy strieborné','Silver hoop earrings'),'AG-E-102',cur(34),'—',int(3),['ok',L('cena overená','price verified')]]},
    {c:[L('Prsteň s perlou','Pearl ring'),'AG-R-140',cur(55),cur(49),int(2),['ok',L('cena overená','price verified')]]}
   ],
   note:L('Banner preberá hotovú cenu v mene trhu (RO v RON, HU v HUF, BG v BGN) — prepočet rieši e-shop, nie render. Overený mechanizmus, konkrétne ceny sú ukážkové.','The banner takes the final price in the market currency (RO in RON, HU in HUF, BG in BGN) — conversion is handled by the shop, not the render. The mechanism is verified, the specific prices are illustrative.'),
   page:true}
 ],
 ai:[
  {q:L('Čo sa stane, keď sa zmení cena produktu?','What happens when a product price changes?'),
   a:L('Zmena ceny spustí re-render všetkých bannerov, kde je daný produkt použitý — napríklad zlatý prsteň s briliantom je v 12 banneroch.','A price change triggers a re-render of every banner where that product appears — for example, the gold ring with diamond is used in 12 banners.'),
   cite:'appka', act:null},
  {q:L('Ktoré produkty nemajú akčnú cenu?','Which products have no sale price?'),
   a:L('7 z 22 produktov beží bez akcie (napr. náramok z bieleho zlata, perlový náhrdelník) — banner pre ne zobrazuje len plnú cenu.','7 of 22 products run without a promo (e.g. white gold bracelet, pearl necklace) — their banner shows only the full price.'),
   cite:'appka', act:{l:L('Filtrovať bez akcie','Filter no promo'), k:'filter'}},
  {q:L('Prečo sa cena v banneri neprepočítava z eur?','Why isn’t the banner price converted from euros?'),
   a:L('Banner preberá hotovú cenu priamo z e-shopu v mene daného trhu (napr. HUF, RON, BGN) — konverziu robí e-shop, nie render, takže sa vyhne dvojitému zaokrúhľovaniu.','The banner takes the final price straight from the shop in the market’s own currency (e.g. HUF, RON, BGN) — the shop handles conversion, not the render, avoiding double rounding.'),
   cite:'appka', act:null}
 ]},

/* 8 ─────────────────────────────────────────── MANIFESTY */
{key:'manifesty', icon:'book', title:L('Copy manifesty','Copy manifests'),
 sub:L('Summer Sale · matica 8 jazykov × 5 rozmerov = 40 buniek.','Summer Sale · matrix of 8 languages × 5 sizes = 40 cells.'),
 blocks:[
  {t:'matrix', title:L('Stav manifestu podľa jazyka × rozmeru','Manifest status by language × size'),
   rows:['SK','CZ','HU','RO','PL','SI','HR','BG'],
   cols:['1080×1080','1080×1350','1080×1920','1200×628','970×250'],
   st:{SK:[2,2,2,2,2],CZ:[2,2,2,2,2],HU:[2,2,2,1,1],RO:[2,2,2,2,1],PL:[2,2,1,1,0],SI:[2,2,2,1,0],HR:[2,1,1,0,0],BG:[2,2,1,1,0]},
   note:L('2 = hotové, 1 = koncept, 0 = chýba. Klik na bunku otvorí manifest. Overené: 8 jazykov × 5 rozmerov.','2 = done, 1 = draft, 0 = missing. Click a cell to open the manifest. Verified: 8 languages × 5 sizes.')},
  {t:'table', title:L('Texty podľa jazyka','Copy by language'),
   cols:[L('Jazyk','Language'), 'Headline', 'Subline', 'CTA', L('Cena','Price')],
   rows:[
    {c:[L('slovenčina','Slovak'),'Letná kolekcia až −30 %','Zlato a striebro na leto — doprava zadarmo nad 60 €','Kúpiť teraz','od 39 €']},
    {c:[L('čeština','Czech'),'Letní kolekce až −30 %','Zlato a stříbro na léto — doprava zdarma nad 60 €','Koupit nyní','od 39 €']},
    {c:[L('maďarčina','Hungarian'),'Nyári kollekció −30%-ig','Arany és ezüst a nyárra — ingyenes szállítás 25 000 Ft felett','Vásárlás','15 900 Ft-tól']},
    {c:[L('rumunčina','Romanian'),'Colecția de vară până la −30%','Aur și argint pentru vară — transport gratuit peste 300 RON','Cumpără acum','de la 195 RON']},
    {c:[L('poľština','Polish'),'Kolekcja letnia do −30%','Złoto i srebro na lato — darmowa dostawa od 250 zł','Kup teraz','od 169 zł']},
    {c:[L('slovinčina','Slovenian'),'Poletna kolekcija do −30 %','Zlato in srebro za poletje — brezplačna dostava nad 60 €','Kupi zdaj','od 39 €']},
    {c:[L('chorvátčina','Croatian'),'Ljetna kolekcija do −30 %','Zlato i srebro za ljeto — besplatna dostava nad 60 €','Kupi sada','od 39 €']},
    {c:[L('bulharčina','Bulgarian'),'Лятна колекция до −30%','Злато и сребро за лятото — безплатна доставка над 120 лв.','Купи сега','от 79 лв.']}
   ],
   note:L('subline sa pre 970×250 automaticky skracuje — overená mechanika','the subline is auto-shortened for 970×250 — verified mechanic')}
 ],
 ai:[
  {q:L('Koľko buniek manifestu ešte chýba?','How many manifest cells are still missing?'),
   a:L('Z 40 buniek (8 jazykov × 5 rozmerov) je 6 úplne prázdnych (0), najmä pri 970×250 a 1200×628 v menších jazykoch ako HR a PL.','Of 40 cells (8 languages × 5 sizes) 6 are completely empty (0), mostly at 970×250 and 1200×628 in smaller languages like HR and PL.'),
   cite:'appka', act:{l:L('Otvoriť maticu','Open matrix'), k:'filter'}},
  {q:L('Prečo sa headline pre 970×250 skracuje?','Why is the headline shortened for 970×250?'),
   a:L('970×250 je najužší formát a má hard gate na max 28 znakov headline — subline sa preto automaticky skracuje, aby sa text zmestil do bezpečnej zóny.','970×250 is the narrowest format and has a hard gate of max 28 headline characters — the subline is auto-shortened so the copy fits the safe area.'),
   cite:'appka', act:{l:L('Otvoriť KB','Open KB'), k:'open'}},
  {q:L('Ktorý jazyk má manifest najviac dokončený?','Which language has the most complete manifest?'),
   a:L('SK a CZ majú všetkých 5 rozmerov hotových (stav 2), zatiaľ čo HR má hotový iba jeden rozmer.','SK and CZ have all 5 sizes done (status 2), while HR has only one size done.'),
   cite:'appka', act:null}
 ]},

/* 9 ─────────────────────────────────────────── KB */
{key:'kb', icon:'brain', title:L('Znalostná báza','Knowledge base'),
 sub:L('Pravidlá renderu, ktoré sa učia z QA výsledkov (learning loop).','Render rules learned from QA results (learning loop).'),
 blocks:[
  {t:'kpis', items:[
   {l:L('Pravidiel v KB','Rules in KB'), v:int(18), sub:L('z toho 6 hard gates · overené','6 of them hard gates · verified')},
   {l:L('Aplikované pri renderi','Applied on render'), v:int(320), sub:L('všetky bannery · overené','all banners · verified')},
   {l:'Learning loop', v:L('zapnutý','on'), sub:'QA → KB'},
   {l:L('Zablokované rendery','Blocked renders'), v:int(2), sub:L('major deviation · overené','major deviation · verified'), tone:'no'}
  ]},
  {t:'list', title:L('Pravidlá (výber)','Rules (sample)'), items:[
   {title:L('Logo minimálne 8 % šírky banneru','Logo at least 8% of banner width'), sub:L('Kompozícia · hard gate · 320 aplikácií','Composition · hard gate · 320 applications'), badge:['no','hard gate']},
   {title:L('Headline max 28 znakov pre 970×250','Headline max 28 characters for 970×250'), sub:L('Typografia · hard gate · 40 aplikácií','Typography · hard gate · 40 applications'), badge:['no','hard gate']},
   {title:L('Text na fotke vždy s prekryvom 35 %','Text over a photo always needs a 35% overlay'), sub:L('Kontrast · hard gate (WCAG 4,5:1) · 184 aplikácií','Contrast · hard gate (WCAG 4.5:1) · 184 applications'), badge:['no','hard gate']},
   {title:L('Modelka a svet sa v kampani nemenia','Model and world stay fixed within a campaign'), sub:L('Identita · soft rule · campaign lock','Identity · soft rule · campaign lock'), badge:['cond','soft rule']},
   {title:L('Cena v mene trhu, nie prepočet z EUR','Price in the market currency, not converted from EUR'), sub:L('Ceny · soft rule · 52 aplikácií','Pricing · soft rule · 52 applications'), badge:['cond','soft rule']},
   {title:L('CTA minimálne 24 px od okraja (16 px pri 970×250)','CTA at least 24px from the edge (16px at 970×250)'), sub:L('Bezpečná zóna · soft rule · 320 aplikácií','Safe area · soft rule · 320 applications'), badge:['cond','soft rule']}
  ], note:L('Hard gates blokujú export, soft rules len upozornia — overené 1:1 z Banner Studia.','Hard gates block the export, soft rules only warn — verified 1:1 from Banner Studio.')},
  {t:'table', title:L('Learning loop — z deviation do pravidla','Learning loop — from deviation to rule'),
   cols:[L('Deviation','Deviation'), L('Kampaň','Campaign'), L('Nové pravidlo','New rule'), L('Zápis','Recorded')],
   rows:[
    {c:[L('Headline pretiekol (970×250)','Headline overflowed (970×250)'),L('Svadobná sezóna','Wedding season'),L('Limit 28 znakov','28-character limit'),['ok',L('zapísané do KB','written to KB')]]},
    {c:[L('Nízky kontrast textu na fotke','Low text contrast over photo'),L('Zlaté prstene','Gold rings'),L('Prekryv 35 %','35% overlay'),['ok',L('zapísané do KB','written to KB')]]},
    {c:[L('Cena prepočítaná z EUR','Price converted from EUR'),'Summer Sale',L('Cena v mene trhu','Price in market currency'),['ok',L('zapísané do KB','written to KB')]]},
    {c:[L('Logo pod 8 % šírky','Logo below 8% width'),'Black Friday',L('Minimum 8 % šírky','8% width minimum'),['cond',L('čaká na potvrdenie','awaiting confirmation')]]}
   ],
   note:L('Learning loop sa dá vypnúť v Nastaveniach.','The learning loop can be switched off in Settings.')}
 ],
 ai:[
  {q:L('Koľko pravidiel je hard gate a čo to znamená?','How many rules are hard gates and what does that mean?'),
   a:L('6 z 18 pravidiel sú hard gates — bránia exportu bannera, kým sa nesplnia. Ostatné sú soft rules, ktoré len upozornia.','6 of 18 rules are hard gates — they block a banner’s export until met. The rest are soft rules that only warn.'),
   cite:'appka', act:null},
  {q:L('Ako vzniklo pravidlo o headline pri 970×250?','How did the 970×250 headline rule come about?'),
   a:L('Vzniklo zo 4 QA deviations, kde headline pretekal cez bezpečnú zónu banneru — learning loop ho zapísal ako limit 28 znakov.','It came from 4 QA deviations where the headline overflowed the banner safe area — the learning loop recorded it as a 28-character limit.'),
   cite:'appka', act:{l:L('Otvoriť bannery','Open banners'), k:'open'}},
  {q:L('Koľko renderov je práve zablokovaných?','How many renders are currently blocked?'),
   a:L('2 bannery (Svadobná sezóna, 970×250 SK a CZ) sú zablokované na major deviation a čakajú na re-render.','2 banners (Wedding season, 970×250 SK and CZ) are blocked on a major deviation and await a re-render.'),
   cite:'appka', act:{l:L('Otvoriť bannery','Open banners'), k:'open'}}
 ]},

/* 10 ─────────────────────────────────────────── SPEND */
{key:'spend', icon:'coins', title:L('Čerpanie AI budgetu','AI budget spend'),
 sub:L('12 mesiacov čerpania AI budgetu podľa providera.','12 months of AI budget burn by provider.'),
 blocks:[
  {t:'kpis', items:[
   {l:L('Mesačný strop','Monthly cap'), v:cur(300), sub:L('overené','verified')},
   {l:L('Vyčerpané (august)','Used (August)'), v:cur(186), sub:L('62 % stropu · overené','62% of cap · verified'), tone:'cond'},
   {l:L('Rezerva','Headroom'), v:cur(114), sub:L('do konca mesiaca','until month end'), tone:'ok'},
   {l:L('Aktívny provider','Active provider'), v:'mock', sub:L('openai a gemini bez API kľúčov','openai and gemini without API keys'), tone:'q'}
  ]},
  {t:'lines', title:L('Čerpanie AI budgetu (12 mesiacov)','AI budget burn (12 months)'),
   labels:['Sep','Okt',L('Nov','Nov'),L('Dec','Dec'),'Jan','Feb','Mar','Apr',L('Máj','May'),L('Jún','Jun'),L('Júl','Jul'),L('Aug','Aug')],
   series:[
    {l:L('Čerpanie','Burn'), v:[95,112,138,165,120,108,145,160,175,190,210,186], color:'var(--acc)'},
    {l:L('Strop','Cap'), v:[300,300,300,300,300,300,300,300,300,300,300,300], color:'var(--line)'}
   ], avg:false,
   note:L('August (aktuálny mesiac) 186 € je overené, ostatných 11 mesiacov je ukážkových.','August (the current month) at €186 is verified, the other 11 months are illustrative.')},
  {t:'table', title:L('Čerpanie podľa providera','Spend by provider'),
   cols:[L('Provider','Provider'), L('Spend (august)','Spend (August)'), L('Bannery','Banners'), L('Ø na banner','Avg per banner'), L('Stav','Status')],
   rows:[
    {c:['mock',cur(186),int(320),L('0,58 €','€0.58'),['ok',L('aktívny','active')]]},
    {c:['openai (GPT)',cur(0),int(0),'—',['q',L('bez API kľúča','no API key')]]},
    {c:['gemini (3 Pro Image)',cur(0),int(0),'—',['q',L('bez API kľúča','no API key')]]}
   ],
   note:L('mock je deterministický HTML/CSS render — 186 € a 320 bannerov sú overené, openai a gemini čakajú na API kľúče.','mock is a deterministic HTML/CSS render — €186 and 320 banners are verified, openai and gemini await API keys.')}
 ],
 ai:[
  {q:L('Koľko z mesačného budgetu ostáva?','How much of the monthly budget is left?'),
   a:L('Zostáva 114 € z 300 € (38 % rezervy). Pri prekročení stropu sa generovanie automaticky zastaví.','€114 of €300 remains (38% headroom). Generation halts automatically once the cap is exceeded.'),
   cite:'appka', act:null},
  {q:L('Prečo majú openai a gemini nulový spend?','Why do openai and gemini show zero spend?'),
   a:L('Appka beží na provideri mock (deterministický HTML/CSS render) — API kľúče pre openai a gemini ešte nie sú vyplnené v Nastaveniach.','The app runs on the mock provider (deterministic HTML/CSS render) — API keys for openai and gemini haven’t been added in Settings yet.'),
   cite:'appka', act:{l:L('Otvoriť Nastavenia','Open Settings'), k:'open'}},
  {q:L('Ako vyzerá trend čerpania za posledný rok?','What does the spend trend look like over the last year?'),
   a:L('Čerpanie kolíše medzi 95 € a 210 € mesačne, s vrcholom v júli (210 €) pred augustovým poklesom na 186 €. Strop 300 € nebol zatiaľ nikdy prekročený.','Spend fluctuates between €95 and €210 per month, peaking in July (€210) before dropping to €186 in August. The €300 cap has never been exceeded so far.'),
   cite:'ukážka', act:null}
 ]},

/* 11 ─────────────────────────────────────────── AUDIT */
{key:'audit', icon:'clip', title:L('Audit','Audit'),
 sub:L('Kto čo kedy urobil — 26 posledných záznamov.','Who did what and when — the 26 latest records.'),
 blocks:[
  {t:'kpis', items:[
   {l:L('Záznamov dnes','Records today'), v:int(4)},
   {l:L('Aktívni používatelia','Active users'), v:int(3)},
   {l:L('Posledná akcia','Last action'), v:L('pred 40 min','40 min ago')},
   {l:L('Automatizované (Systém)','Automated (System)'), v:int(11), tone:'info'}
  ]},
  {t:'table', title:null,
   cols:[L('Dátum','Date'), L('Používateľ','User'), L('Akcia','Action'), L('Objekt','Object')],
   rows:[
    {c:[L('4. 8. 09:12','Aug 4, 09:12'),'Gabika',L('Vytvorená kampaň','Campaign created'),L('Jesenná kolekcia','Autumn collection')]},
    {c:[L('4. 8. 09:15','Aug 4, 09:15'),'Gabika',L('Campaign lock nastavený','Campaign lock set'),L('Jesenná kolekcia — Adela / Riviéra','Autumn collection — Adela / Riviéra')]},
    {c:[L('4. 8. 10:02','Aug 4, 10:02'),L('Systém','System'),L('Render spustený','Render started'),L('Jesenná kolekcia — 40 PNG','Autumn collection — 40 PNGs')]},
    {c:[L('4. 8. 11:40','Aug 4, 11:40'),L('Systém','System'),L('QA gate zlyhal','QA gate failed'),L('Jesenná kolekcia — kontrast textu','Autumn collection — text contrast')]},
    {c:[L('3. 8. 14:20','Aug 3, 14:20'),'Ema',L('Copy manifest upravený','Copy manifest edited'),L('Svadobná sezóna — headline SK','Wedding season — headline SK')]},
    {c:[L('3. 8. 15:05','Aug 3, 15:05'),L('Systém','System'),L('QA gate zlyhal (major deviation)','QA gate failed (major deviation)'),L('Svadobná sezóna — 2 bannery 970×250','Wedding season — 2 banners 970×250')]},
    {c:[L('3. 8. 16:12','Aug 3, 16:12'),'Gabika',L('Pravidlo pridané do KB','Rule added to KB'),L('Headline max 28 znakov pre 970×250','Headline max 28 characters for 970×250')]},
    {c:[L('2. 8. 08:44','Aug 2, 08:44'),L('Systém','System'),'Export ZIP',L('Svadobná sezóna — 38/40 PNG','Wedding season — 38/40 PNGs')]},
    {c:[L('2. 8. 09:30','Aug 2, 09:30'),'Ema',L('Zmena ceny produktu','Product price changed'),L('Zlatý prsteň s briliantom 489 € → 439 €','Gold ring with diamond €489 → €439')]},
    {c:[L('2. 8. 09:31','Aug 2, 09:31'),L('Systém','System'),L('Re-render spustený','Re-render started'),L('12 bannerov s cenovým overlayom','12 banners with a price overlay')]},
    {c:[L('1. 8. 10:15','Aug 1, 10:15'),'Gabika',L('Vytvorená kampaň','Campaign created'),L('Diamantový výpredaj','Diamond sale')]},
    {c:[L('1. 8. 10:20','Aug 1, 10:20'),'Gabika',L('Campaign lock nastavený','Campaign lock set'),L('Diamantový výpredaj — Nikola / Quiet Luxury','Diamond sale — Nikola / Quiet Luxury')]},
    {c:[L('1. 8. 13:00','Aug 1, 13:00'),L('Systém','System'),L('Kampaň škálovaná (ROAS ≥ 4)','Campaign scaled (ROAS ≥ 4)'),L('Diamantový výpredaj — Google Ads','Diamond sale — Google Ads')]},
    {c:[L('31. 7. 09:00','Jul 31, 09:00'),'admin',L('Nastavenie AI providera skontrolované','AI provider setting reviewed'),L('mock (bez zmeny)','mock (no change)')]},
    {c:[L('31. 7. 11:22','Jul 31, 11:22'),'Ema',L('Import kampaní (CSV)','Campaign import (CSV)'),L('3 nové riadky, 1 chyba','3 new rows, 1 error')]},
    {c:[L('30. 7. 15:40','Jul 30, 15:40'),L('Systém','System'),'Export ZIP',L('New Gem — 40/40 PNG','New Gem — 40/40 PNGs')]},
    {c:[L('30. 7. 16:00','Jul 30, 16:00'),'Gabika',L('Kampaň uzavretá','Campaign closed'),'New Gem']},
    {c:[L('29. 7. 09:12','Jul 29, 09:12'),L('Systém','System'),L('Kampaň pozastavená (ROAS < 2)','Campaign paused (ROAS < 2)'),L('Perlová kolekcia — Meta Ads','Pearl collection — Meta Ads')]},
    {c:[L('29. 7. 09:15','Jul 29, 09:15'),'Ema',L('Poznámka k pozastaveniu','Pause note'),L('Perlová kolekcia — čaká sa na nový manifest','Pearl collection — awaiting a new manifest')]},
    {c:[L('28. 7. 14:00','Jul 28, 14:00'),'admin',L('Zmena budget stropu','Budget cap changed'),L('200 € → 300 €','€200 → €300')]},
    {c:[L('27. 7. 10:30','Jul 27, 10:30'),'Gabika',L('Manifest schválený','Manifest approved'),L('Summer Sale — 8 jazykov','Summer Sale — 8 languages')]},
    {c:[L('27. 7. 11:00','Jul 27, 11:00'),L('Systém','System'),'Export ZIP',L('Summer Sale — 40/40 PNG','Summer Sale — 40/40 PNGs')]},
    {c:[L('26. 7. 09:00','Jul 26, 09:00'),'Ema',L('Pridaný produkt do cenníka','Product added to price list'),L('Diamantové náušnice','Diamond earrings')]},
    {c:[L('25. 7. 13:15','Jul 25, 13:15'),L('Systém','System'),L('QA gate prešiel','QA gate passed'),L('Zlaté prstene — 35/35 PNG (priebežne)','Gold rings — 35/35 PNGs (in progress)')]},
    {c:[L('24. 7. 10:00','Jul 24, 10:00'),'admin',L('Vytvorený používateľ','User created'),L('Ema (rola Editor)','Ema (role Editor)')]},
    {c:[L('20. 7. 09:00','Jul 20, 09:00'),'Gabika',L('Kampaň uzavretá','Campaign closed'),L('Doprava zadarmo','Free shipping')]}
   ],
   note:L('formát a udalosti sú ukážkové, štýl vychádza z reálneho auditného logu Banner Studia.','the format and events are illustrative, styled after Banner Studio’s real audit log.'),
   page:true}
 ],
 ai:[
  {q:L('Kto naposledy menil budget strop?','Who last changed the budget cap?'),
   a:L('admin zmenil budget strop z 200 € na 300 € 28. 7. o 14:00.','admin changed the budget cap from €200 to €300 on Jul 28 at 14:00.'),
   cite:'ukážka', act:null},
  {q:L('Koľko akcií vykonal systém automaticky?','How many actions did the system perform automatically?'),
   a:L('11 z 26 zobrazených záznamov vykonal Systém automaticky — hlavne render, export a rozhodnutia o škálovaní/pozastavení podľa ROAS pásiem.','11 of the 26 records shown were performed automatically by the System — mainly render, export and scale/pause decisions based on ROAS bands.'),
   cite:'ukážka', act:null},
  {q:L('Kedy bol naposledy importovaný CSV kampaní?','When was the campaign CSV last imported?'),
   a:L('Ema importovala CSV kampaní 31. 7. o 11:22 — priniesol 3 nové riadky a 1 chybu, ktorú treba doriešiť.','Ema imported the campaign CSV on Jul 31 at 11:22 — it brought 3 new rows and 1 error that needs resolving.'),
   cite:'ukážka', act:{l:L('Otvoriť import','Open import'), k:'open'}}
 ]},

/* 12 ─────────────────────────────────────────── NASTAVENIA */
{key:'nastavenia', icon:'gear', title:L('Nastavenia','Settings'),
 sub:L('AI provider, budget, render a znalostná báza.','AI provider, budget, render and knowledge base.'),
 blocks:[
  {t:'form', title:L('AI provider','AI provider'), fields:[
   {l:L('Provider','Provider'), s:L('mock · openai (GPT) · gemini (3 Pro Image)','mock · openai (GPT) · gemini (3 Pro Image)'), type:'select', v:'mock', opts:['mock','openai','gemini']},
   {l:L('Budget strop','Budget cap'), s:L('Mesačný limit generovania — overené 300 €','Monthly generation limit — verified €300'), type:'select', v:'300 €', opts:['100 €','200 €','300 €']},
   {l:L('API kľúče','API keys'), s:L('Zatiaľ nevyplnené','Not set yet'), type:'text', v:''}
  ], note:L('Pri prekročení budget stropu sa generovanie automaticky zastaví.','Generation halts automatically once the budget cap is exceeded.')},
  {t:'form', title:L('Render a znalostná báza','Render & knowledge base'), fields:[
   {l:L('Rozmery a jazyky','Sizes & languages'), s:L('5 rozmerov · 8 jazykov — overené','5 sizes · 8 languages — verified'), type:'text', v:L('5 rozmerov · 8 jazykov','5 sizes · 8 languages')},
   {l:L('Export ZIP (PNG)','ZIP export (PNG)'), s:L('Deterministický render','Deterministic render'), type:'switch', on:true},
   {l:L('Learning loop do KB','KB learning loop'), s:L('Výsledky QA sa vracajú do znalostnej bázy','QA results feed back into the knowledge base'), type:'switch', on:true}
  ]},
  {t:'note', text:L('Jedno zdieľané prihlasovacie heslo pre Banner Studio (:8091) — individuálne účty a rate-limit sú v pláne rodiny Aura, zatiaľ nie sú nasadené.','A single shared login password for Banner Studio (:8091) — individual accounts and rate-limiting are on the Aura family roadmap but not deployed yet.')}
 ],
 ai:[
  {q:L('Aký AI provider appka práve používa?','Which AI provider is the app currently using?'),
   a:L('mock — deterministický HTML/CSS render bez volania externého AI modelu. openai a gemini sú pripravené ako alternatívy, ale API kľúče ešte nie sú vyplnené.','mock — a deterministic HTML/CSS render with no external AI model call. openai and gemini are ready as alternatives, but API keys haven’t been added yet.'),
   cite:'appka', act:null},
  {q:L('Čo sa stane po prekročení budget stropu?','What happens once the budget cap is exceeded?'),
   a:L('Generovanie sa automaticky zastaví — appka nespustí ďalší render, kým sa strop nezvýši alebo nezačne nový mesiac.','Generation halts automatically — the app won’t start another render until the cap is raised or a new month begins.'),
   cite:'appka', act:null},
  {q:L('Dá sa vypnúť learning loop do KB?','Can the KB learning loop be turned off?'),
   a:L('Áno, prepínačom v tejto sekcii — keď je vypnutý, výsledky QA sa už nezapisujú ako nové pravidlá do znalostnej bázy.','Yes, via the switch in this section — when off, QA results no longer get written into the knowledge base as new rules.'),
   cite:'appka', act:null}
 ]}

]
};
