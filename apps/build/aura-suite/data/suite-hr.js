const APP_HR = {
key:'hr', name:'Aura HR', port:'', icon:'people',
tag:L('Interná evidencia: ľudia, pozície, zdieľané schránky a firemné aplikácie s nákladmi.','Internal registry: people, roles, shared mailboxes and company apps with costs.'),
feat:[
  L('32 pozícií s náplňou práce — štruktúrované bloky + knižnica činností','32 positions with duty blocks + a shared activity library'),
  L('~90 rolových mailov s aliasmi · heslá šifrované, viditeľné len Admin','~90 role mailboxes with aliases · passwords encrypted, Admin-only'),
  L('Org-strom firmy a register aplikácií s nákladmi','Company org tree and an app register with costs')
],
live:{v:L('18 ľudí · 32 pozícií','18 people · 32 positions'), tone:'ok', spark:[16,16,17,17,17,18,18]},

imp:{
  target:'ludia',
  cols:[
    {k:'meno', l:L('Meno','Name'), t:'text'},
    {k:'pozicia', l:L('Pozícia','Position'), t:'text'},
    {k:'oddelenie', l:L('Oddelenie','Department'), t:'text'},
    {k:'mail', l:'Mail', t:'text'},
    {k:'nastup', l:L('Nástup','Start date'), t:'text'},
    {k:'stav', l:L('Stav','Status'), t:'text'}
  ],
  key:[L('kľúč upsertu: mail (unikátna priradená schránka)','upsert key: mail (unique assigned mailbox)')],
  csv:'meno;pozicia;oddelenie;mail;nastup;stav\n'
    + 'Michal;Referent expedície;Expedícia;expedicia2@sperky-aura.sk;2024-03-01;TPP\n'
    + 'Adam;Referent expedície;Expedícia;expedicia3@sperky-aura.sk;2025-02-15;dohoda\n'
    + 'Zuzana;Referentka reklamácií;Reklamácie;reklamacie2@sperky-aura.sk;2024-11-01;TPP\n'
    + 'Igor;Skladník;Sklad;sklad3@sperky-aura.sk;2026-13-01;TPP\n'
    + 'Réka;CS agentka;Zákaznícky servis;cs2@sperky-aura.sk;2025-05-01;dohoda\n'
    + 'Marek;Systémový administrátor;IT;sysadmin@sperky-aura.sk;2025-09-01;TPP\n'
    + 'Tereza;Grafička;Marketing;grafika@sperky-aura.sk;2025-01-10;TPP'
},

rep:{
  templates:[
    {k:'obsadenost', l:L('Obsadenosť pozícií','Position staffing'), s:L('32 pozícií · obsadené/voľné podľa oddelenia + graf','32 positions · filled/open by department + chart')},
    {k:'naklady', l:L('Náklady na nástroje','Tool costs'), s:L('Mesačné náklady aplikácií za 12 mesiacov + rozpad podľa vlastníka','Monthly app costs over 12 months + breakdown by owner')},
    {k:'schranky', l:L('Rolové schránky (admin)','Role mailboxes (admin)'), s:L('Zoznam schránok, prístupov a stavu hesiel — len pre rolu Admin','List of mailboxes, access and password status — Admin role only')}
  ]
},

screens:[

/* 1 — PREHĽAD ---------------------------------------------------------- */
{key:'prehlad', icon:'home', title:L('Prehľad','Overview'),
  sub:L('Súhrn evidencie — ľudia, pozície, náplne práce a náklady na nástroje.','Registry summary — people, positions, duty coverage and tool costs.'),
  blocks:[
    {t:'kpis', items:[
      {l:L('Zamestnanci','Employees'), v:int(18), sub:L('18 ľudí evidovaných · overené','18 people on record · verified'), tone:'ok', live:true},
      {l:L('Pozície','Positions'), v:int(32), sub:L('s náplňou práce · overené','with duty blocks · verified'), tone:null},
      {l:L('Zdieľané maily','Shared mailboxes'), v:'~90', sub:L('rolové a zdieľané schránky · overené','role & shared mailboxes · verified'), tone:null},
      {l:L('Aplikácie — náklady / mes.','Apps — monthly cost'), v:cur(1240), sub:L('8 platených nástrojov · overené','8 paid tools · verified'), tone:'ok'}
    ]},
    {t:'bars', title:L('Ľudia podľa oddelení','People by department'),
      data:[
        {l:L('Expedícia','Dispatch'), v:5},
        {l:'Marketing', v:4},
        {l:'IT', v:3},
        {l:L('Sklad','Warehouse'), v:3},
        {l:L('Reklamácie','Claims'), v:2},
        {l:L('Vedenie','Leadership'), v:1}
      ],
      note:L('Overené rozdelenie zo súhrnu; Zákaznícky servis je v tomto súčte zahrnutý v Expedícii — na obrazovkách Ľudia/Pozície/Org-strom je vedený samostatne (jemnejšie, ukážkové delenie).','Verified breakdown from the summary; Customer service is folded into Dispatch here — the People/Positions/Org-tree screens list it separately (a finer, illustrative split).')},
    {t:'donut', title:L('Pokrytie náplní práce','Duty coverage'), pct:85,
      label:L('z 32 pozícií','of 32 positions'),
      note:L('27 pozícií pokrytých knižnicou činností, 5 má vlastné bloky — overené.','27 positions covered by the activity library, 5 have custom blocks — verified.')},
    {t:'list', title:L('Posledné zmeny v evidencii','Recent registry changes'),
      items:[
        {title:L('Pridaná pozícia Junior vývojár (IT)','Position added: Junior developer (IT)'), sub:L('Šablóna, čaká na obsadenie','Template, awaiting hire'), badge:['q',L('nová','new')], meta:L('dnes','today')},
        {title:L('Aktualizovaná náplň — Newsletter & projekty','Duty block updated — Newsletter & projects'), sub:'Ema', badge:['ok',L('hotovo','done')], meta:L('včera','yesterday')},
        {title:L('Zmena hesla — fakturacia@sperky-aura.sk','Password changed — fakturacia@sperky-aura.sk'), sub:L('Admin-only','Admin-only'), badge:['no',L('citlivé','sensitive')], meta:L('pred 2 dňami','2 days ago')},
        {title:L('Nová aplikácia: GitHub','New app: GitHub'), sub:L('IT · 12 licencií','IT · 12 licences'), badge:['ok',L('aktívna','active')], meta:L('tento týždeň','this week')},
        {title:L('Obsadené 1 miesto — Skladník','Seat filled — Warehouse operator'), sub:'Igor', badge:['ok',L('obsadené','filled')], meta:L('minulý týždeň','last week')}
      ],
      note:L('Ukážkové položky — reálny log je na obrazovke Audit.','Illustrative entries — the real log is on the Audit screen.')}
  ],
  ai:[
    {q:L('Koľko ľudí a pozícií máme evidovaných?','How many people and positions do we have on record?'),
     a:L('Evidencia má 18 zamestnancov na 32 pozíciách. Priemerne teda pripadá menej než jeden zamestnanec na pozíciu — časť pozícií je voľná alebo obsadená viacerými ľuďmi (napr. Vývojár 2/2). 27 z 32 pozícií má náplň pokrytú knižnicou činností, 5 má vlastné bloky.','The registry has 18 employees across 32 positions — some positions are vacant, others hold more than one seat (e.g. Developer 2/2). 27 of 32 positions have duties covered by the activity library, 5 have custom blocks.'),
     cite:'appka', act:{l:L('Otvoriť Pozície','Open Positions'), k:'open'}},
    {q:L('Aké sú mesačné náklady na aplikácie?','What are the monthly app costs?'),
     a:L('Overená suma za 8 platených firemných nástrojov je 1 240 €/mes. Najväčšie položky sú Asana (280 €), Shoptet (240 €) a Ahrefs (220 €). Podrobný rozpad je na obrazovke Aplikácie.','The verified total for 8 paid company tools is €1,240/month. The largest items are Asana (€280), Shoptet (€240) and Ahrefs (€220). Full breakdown is on the Apps screen.'),
     cite:'pamäť', act:{l:L('Otvoriť Aplikácie','Open Apps'), k:'open'}},
    {q:L('Ktoré oddelenie má najviac ľudí?','Which department has the most people?'),
     a:L('Podľa overeného súhrnu má najviac ľudí Expedícia (5), za ňou Marketing (4), IT a Sklad (po 3), Reklamácie (2) a Vedenie (1). V tomto súčte je Zákaznícky servis zahrnutý v Expedícii.','Per the verified summary, Dispatch has the most people (5), followed by Marketing (4), IT and Warehouse (3 each), Claims (2) and Leadership (1). Customer service is folded into Dispatch in this total.'),
     cite:'pamäť', act:{l:L('Otvoriť Ľudia','Open People'), k:'filter'}}
  ]
},

/* 2 — ĽUDIA -------------------------------------------------------------*/
{key:'ludia', icon:'people', title:L('Ľudia','People'),
  sub:L('18 zamestnancov — pozícia, oddelenie, nástup, stav a prístupy.','18 employees — position, department, start date, status and access.'),
  blocks:[
    {t:'kpis', items:[
      {l:L('Aktívni','Active'), v:int(18), sub:L('všetci evidovaní','all on record'), tone:'ok'},
      {l:'TPP', v:int(13), sub:L('plný úväzok','full-time'), tone:null},
      {l:L('Dohoda','Part-time'), v:int(5), sub:L('dohoda o práci / brigáda','contractor / part-time'), tone:'cond'},
      {l:L('Krajiny','Countries'), v:int(2), sub:'SK · HU', tone:null}
    ]},
    {t:'table', title:null, page:true,
      cols:[L('Meno','Name'), L('Pozícia','Position'), L('Oddelenie','Department'), L('Nástup','Start'), L('Stav','Status'), L('Prístup','Access')],
      rows:[
        {id:'delaja', go:'clovek', c:['Delaja', L('CTO – Technický riaditeľ','CTO – Technical director'), L('Vedenie','Leadership'), '2023', ['ok',L('aktívny','active')], 'Admin']},
        {id:'daniel', go:'clovek', c:['Daniel', L('Vývojár','Developer'), 'IT', '2024', ['ok',L('aktívny','active')], 'Editor']},
        {id:'kiko', go:'clovek', c:['Kiko', L('Vývojár','Developer'), 'IT', '2024', ['ok',L('aktívny','active')], 'Editor']},
        {id:'marek', go:'clovek', c:['Marek', L('Systémový administrátor','Systems administrator'), 'IT', '2025', ['ok',L('aktívny','active')], 'Editor']},
        {id:'ema', go:'clovek', c:['Ema', L('Newsletter & projekty','Newsletter & projects'), 'Marketing', '2023', ['ok',L('aktívny','active')], 'Editor']},
        {id:'gabika', go:'clovek', c:['Gabika', 'SEO / Copywriter + CS', 'Marketing', '2022', ['ok',L('aktívny','active')], 'Editor']},
        {id:'tereza', go:'clovek', c:['Tereza', L('Grafička','Graphic designer'), 'Marketing', '2025', ['ok',L('aktívny','active')], 'Editor']},
        {id:'boris', go:'clovek', c:['Boris', L('Ads špecialista','Ads specialist'), 'Marketing', '2025', ['cond',L('dohoda','part-time')], 'Editor']},
        {id:'hajnalka', go:'clovek', c:['Hajnalka', 'Team Leader CS', L('Zákaznícky servis','Customer service'), '2024', ['cond',L('dohoda','part-time')], 'Editor']},
        {id:'reka', go:'clovek', c:['Réka', L('CS agentka','CS agent'), L('Zákaznícky servis','Customer service'), '2025', ['cond',L('dohoda','part-time')], L('Prehliadač','Viewer')]},
        {id:'zsofia', go:'clovek', c:['Zsófia', L('CS agentka','CS agent'), L('Zákaznícky servis','Customer service'), '2025', ['cond',L('dohoda','part-time')], L('Prehliadač','Viewer')]},
        {id:'peter', go:'clovek', c:['Peter', L('Vedúci skladu','Warehouse lead'), L('Sklad','Warehouse'), '2021', ['ok',L('aktívny','active')], 'Editor']},
        {id:'jan', go:'clovek', c:['Ján', L('Skladník','Warehouse operator'), L('Sklad','Warehouse'), '2023', ['ok',L('aktívny','active')], L('Prehliadač','Viewer')]},
        {id:'igor', go:'clovek', c:['Igor', L('Skladník','Warehouse operator'), L('Sklad','Warehouse'), '2024', ['ok',L('aktívny','active')], L('Prehliadač','Viewer')]},
        {id:'tomas', go:'clovek', c:['Tomáš', L('Vedúci expedície','Dispatch lead'), L('Expedícia','Dispatch'), '2022', ['ok',L('aktívny','active')], 'Editor']},
        {id:'michal', go:'clovek', c:['Michal', L('Referent expedície','Dispatch clerk'), L('Expedícia','Dispatch'), '2024', ['ok',L('aktívny','active')], L('Prehliadač','Viewer')]},
        {id:'adam', go:'clovek', c:['Adam', L('Referent expedície','Dispatch clerk'), L('Expedícia','Dispatch'), '2025', ['cond',L('dohoda','part-time')], L('Prehliadač','Viewer')]},
        {id:'zuzana', go:'clovek', c:['Zuzana', L('Referentka reklamácií','Claims clerk'), L('Reklamácie','Claims'), '2024', ['ok',L('aktívny','active')], L('Prehliadač','Viewer')]}
      ],
      note:L('Delaja, Daniel, Kiko, Ema, Gabika a Hajnalka (meno, pozícia, oddelenie, mail, úväzok, krajina) sú overení z pamäte Aura AI. Ostatných 12 riadkov (mená, dátumy nástupu, prístupy) je ukážkových na doplnenie tímu do overeného počtu 18.','Delaja, Daniel, Kiko, Ema, Gabika and Hajnalka (name, position, department, mail, contract, country) are verified from Aura AI memory. The other 12 rows (names, start dates, access) are illustrative, filling the roster out to the verified count of 18.')}
  ],
  ai:[
    {q:L('Kto pracuje na dohodu?','Who works part-time?'),
     a:L('Na dohodu pracuje 5 z 18 ľudí: Boris, Hajnalka, Réka, Zsófia a Adam — traja z nich v Zákazníckom servise. Hajnalka (Team Leader CS) je jediná overená z tejto skupiny.','5 of 18 people work part-time: Boris, Hajnalka, Réka, Zsófia and Adam — three of them in Customer service. Hajnalka (CS Team Leader) is the only verified one in this group.'),
     cite:'appka', act:{l:L('Filtrovať dohoda','Filter part-time'), k:'filter'}},
    {q:L('Ako naimportujem nových ľudí zo súboru?','How do I import new people from a file?'),
     a:L('Cez import wizard na tejto obrazovke: stĺpce meno, pozícia, oddelenie, mail, nástup, stav; upsert kľúč je mail. Vzorové CSV má 7 riadkov vrátane jednej chyby (neplatný dátum 2026-13-01) — wizard ju pri validácii vyznačí pred uložením.','Via the import wizard on this screen: columns name, position, department, mail, start date, status; the upsert key is mail. The sample CSV has 7 rows including one deliberate error (invalid date 2026-13-01) — the wizard flags it during validation before saving.'),
     cite:'import', act:{l:L('Otvoriť import','Open import'), k:'open'}},
    {q:L('Koľko krajín je v tíme?','How many countries are in the team?'),
     a:L('Dve — SK a HU. HU je zastúpené troma ľuďmi v Zákazníckom servise (Hajnalka, Réka, Zsófia), zvyšných 15 je zo SK.','Two — SK and HU. HU is represented by three people in Customer service (Hajnalka, Réka, Zsófia); the remaining 15 are from SK.'),
     cite:'appka', act:null}
  ]
},

/* 3 — ČLOVEK (detail) ----------------------------------------------------*/
{key:'clovek', icon:'user', title:L('Detail zamestnanca','Employee detail'),
  sub:L('Delaja · CTO – Technický riaditeľ · pozícia 1 z 32.','Delaja · CTO – Technical director · position 1 of 32.'),
  blocks:[
    {t:'cards', n:2, items:[
      {title:'Delaja', sub:L('CTO – Technický riaditeľ · Vedenie','CTO – Technical director · Leadership'), badge:['ok',L('Aktívny','Active')],
        lines:[[L('Oddelenie','Department'), L('Vedenie','Leadership')], [L('Nadriadený','Reports to'),'CEO'], [L('Priradený mail','Assigned mail'),'cto@sperky-aura.sk'], [L('Zdieľané schránky','Shared mailboxes'), L('4 (prístup Admin)','4 (Admin access)')]],
        chips:['TPP','SK']},
      {title:L('Pokrytie náplne','Duty coverage'), sub:L('CTO – Technický riaditeľ','CTO – Technical director'), badge:['ok',L('vlastné bloky','custom blocks')],
        lines:[[L('Nástup','Joined'),'2023'], [L('Rola v evidencii','Registry role'),'Admin'], [L('Posledná zmena náplne','Last duty update'), L('minulý týždeň','last week')]],
        chips:[L('vedenie','leadership'), L('bezpečnosť','security')]}
    ]},
    {t:'list', title:L('Náplň práce — bloky','Duty blocks'),
      items:[
        {title:L('Technická stratégia a architektúra','Technology strategy & architecture'), sub:L('Vlastný blok pozície','Custom position block'), badge:['info',L('vlastné','custom')]},
        {title:L('Dohľad nad IT tímom (Daniel, Kiko)','Oversight of the IT team (Daniel, Kiko)'), sub:L('Vlastný blok pozície','Custom position block'), badge:['info',L('vlastné','custom')]},
        {title:L('Schvaľovanie prístupov k aplikáciám','Approving app access'), sub:L('Knižnica činností — Bezpečnosť a prístup','Activity library — Security & access'), badge:['ok',L('knižnica','library')]},
        {title:L('Správa systémových a admin schránok','Managing system & admin mailboxes'), sub:L('Knižnica činností — IT prevádzka','Activity library — IT operations'), badge:['ok',L('knižnica','library')]}
      ],
      note:L('Ukážkové znenie blokov — status vlastné/knižnica pri CTO je overený (pozícia má vlastné bloky, nie je z knižnice).','Illustrative wording of the blocks — the custom/library status for CTO is verified (the position has custom blocks, not library ones).')},
    {t:'table', title:L('Priradené maily a aplikácie','Assigned mail & apps'),
      cols:[L('Typ','Type'), L('Názov','Name'), L('Prístup','Access')],
      rows:[
        {c:[L('Osobný mail','Personal mail'), 'cto@sperky-aura.sk', 'Admin']},
        {c:[L('Zdieľaná schránka','Shared mailbox'), 'admin@sperky-aura.sk', L('heslo: admin-only','password: admin-only')]},
        {c:[L('Zdieľaná schránka','Shared mailbox'), 'fakturacia@sperky-aura.sk', L('heslo: admin-only','password: admin-only')]},
        {c:[L('Zdieľaná schránka','Shared mailbox'), 'hr@sperky-aura.sk', L('heslo: admin-only','password: admin-only')]},
        {c:[L('Zdieľaná schránka','Shared mailbox'), 'ceo@sperky-aura.sk', L('heslo: admin-only','password: admin-only')]},
        {c:[L('Aplikácia — vlastník','App — owner'), 'Asana', L('280 €/mes.','€280/mo')]},
        {c:[L('Aplikácia — vlastník','App — owner'), 'Shoptet', L('240 €/mes.','€240/mo')]}
      ],
      note:L('Zdieľané schránky a vlastníctvo aplikácií (Asana, Shoptet) sú overené 1:1 z existujúcich dát.','Shared mailboxes and app ownership (Asana, Shoptet) are verified 1:1 from existing data.')},
    {t:'timeline', title:L('Časová os','Timeline'), items:[
      [L('Dnes','Today'), L('Schválil prístupy k 2 aplikáciám','Approved access to 2 apps')],
      [L('Minulý týždeň','Last week'), L('Náplň pozície doplnená z knižnice činností','Position duties completed from the activity library')],
      [L('Jún','June'), L('Org-strom aktualizovaný — Vedenie → IT','Org tree updated — Leadership → IT')],
      ['2023', L('Nástup do firmy','Joined the company')]
    ]}
  ],
  ai:[
    {q:L('Aké prístupy má Delaja?','What access does Delaja have?'),
     a:L('Delaja je Admin evidencie, má osobný mail cto@sperky-aura.sk a prístup (vrátane hesiel) k 4 zdieľaným schránkam: admin@, fakturacia@, hr@ a ceo@. Ako Admin je jediný, kto vidí heslá schránok.','Delaja is the registry Admin, has the personal mailbox cto@sperky-aura.sk and access (including passwords) to 4 shared mailboxes: admin@, fakturacia@, hr@ and ceo@. As Admin, only they can see mailbox passwords.'),
     cite:'appka', act:null},
    {q:L('Ktoré aplikácie vlastní Delaja?','Which apps does Delaja own?'),
     a:L('Delaja je overený vlastník dvoch platených aplikácií: Asana (280 €/mes., projekty) a Shoptet (240 €/mes., e-shop platforma) — spolu 520 € zo 1 240 € celkových mesačných nákladov.','Delaja is the verified owner of two paid apps: Asana (€280/mo, projects) and Shoptet (€240/mo, e-shop platform) — together €520 of the €1,240 total monthly cost.'),
     cite:'pamäť', act:{l:L('Otvoriť Aplikácie','Open Apps'), k:'open'}},
    {q:L('Je náplň jeho pozície kompletná?','Is his position\'s duty block complete?'),
     a:L('Áno, ale nie z knižnice — CTO má vlastné bloky (nie zdieľané s inou pozíciou), čo zodpovedá 5 pozíciám z 32, ktoré majú vlastnú náplň mimo knižnice činností.','Yes, but not via the library — CTO has custom blocks (not shared with another position), matching the 5 of 32 positions that carry a custom duty set outside the activity library.'),
     cite:'pamäť', act:null}
  ]
},

/* 4 — POZÍCIE -------------------------------------------------------------*/
{key:'pozicie', icon:'clip', title:L('Pozície','Positions'),
  sub:L('25 z 32 pozícií — oddelenie, obsadenie, zdieľané maily a stav náplne.','25 of 32 positions — department, filled seats, shared mail and duty status.'),
  blocks:[
    {t:'kpis', items:[
      {l:L('Pozícií celkom','Total positions'), v:int(32), sub:L('overené','verified'), tone:null},
      {l:L('Obsadené miesta','Filled seats'), v:int(18), sub:L('18 zamestnancov na 32 pozíciách','18 employees across 32 positions'), tone:'ok'},
      {l:L('Voľné miesta (zobrazené)','Open seats (shown)'), v:int(10), sub:L('z 25 zobrazených pozícií','of the 25 positions shown'), tone:'cond'},
      {l:L('Pokrytie knižnicou','Library coverage'), v:pc(84), sub:L('27 z 32 — overené','27 of 32 — verified'), tone:'ok'}
    ]},
    {t:'table', title:null, page:true,
      cols:[L('Pozícia','Position'), L('Oddelenie','Department'), L('Obsadenie','Filled'), L('Zdieľané maily','Shared mail'), L('Náplň','Duties')],
      rows:[
        {id:'cto', go:'pozicia', c:[L('CTO – Technický riaditeľ','CTO – Technical director'), L('Vedenie','Leadership'), '1/1', '4', ['ok', L('kompletná','complete')]]},
        {id:'coo', go:'pozicia', c:[L('COO – Prevádzkový riaditeľ','COO – Operations director'), L('Vedenie','Leadership'), '0/1', '1', ['q', L('šablóna, čaká na obsadenie','template, awaiting hire')]]},
        {id:'vyvojar', go:'pozicia', c:[L('Vývojár','Developer'), 'IT', '2/2', '2', ['ok', L('kompletná','complete')]]},
        {id:'sysadmin', go:'pozicia', c:[L('Systémový administrátor','Systems administrator'), 'IT', '1/1', '1', ['ok', L('kompletná','complete')]]},
        {id:'devops', go:'pozicia', c:[L('DevOps inžinier','DevOps engineer'), 'IT', '0/1', '0', ['q', L('šablóna, čaká na obsadenie','template, awaiting hire')]]},
        {id:'seo', go:'pozicia', c:['SEO / Copywriter', 'Marketing', '1/1', '3', ['ok', L('kompletná','complete')]]},
        {id:'newsletter', go:'pozicia', c:[L('Newsletter & projekty','Newsletter & projects'), 'Marketing', '1/1', '2', ['ok', L('kompletná','complete')]]},
        {id:'grafik', go:'pozicia', c:[L('Grafik / Grafička','Graphic designer'), 'Marketing', '1/1', '1', ['ok', L('kompletná','complete')]]},
        {id:'ads', go:'pozicia', c:[L('Ads špecialista','Ads specialist'), 'Marketing', '1/1', '1', ['cond', L('dopĺňa sa','in progress')]]},
        {id:'foto', go:'pozicia', c:[L('Fotograf / Fotografka','Photographer'), 'Marketing', '0/1', '0', ['q', L('šablóna, čaká na obsadenie','template, awaiting hire')]]},
        {id:'tlcs', go:'pozicia', c:['Team Leader CS', L('Zákaznícky servis','Customer service'), '1/1', '3', ['cond', L('dopĺňa sa','in progress')]]},
        {id:'csagent', go:'pozicia', c:[L('CS agent / CS agentka','CS agent'), L('Zákaznícky servis','Customer service'), '2/2', '2', ['ok', L('kompletná','complete')]]},
        {id:'vedskl', go:'pozicia', c:[L('Vedúci skladu','Warehouse lead'), L('Sklad','Warehouse'), '1/1', '1', ['ok', L('kompletná','complete')]]},
        {id:'skladnik', go:'pozicia', c:[L('Skladník','Warehouse operator'), L('Sklad','Warehouse'), '2/3', '1', ['cond', L('1 voľné miesto','1 open seat')]]},
        {id:'kvalita', go:'pozicia', c:[L('Manažér kvality skladu','Warehouse quality manager'), L('Sklad','Warehouse'), '0/1', '0', ['q', L('šablóna, čaká na obsadenie','template, awaiting hire')]]},
        {id:'vedexp', go:'pozicia', c:[L('Vedúci expedície','Dispatch lead'), L('Expedícia','Dispatch'), '1/1', '1', ['ok', L('kompletná','complete')]]},
        {id:'refexp', go:'pozicia', c:[L('Referent expedície','Dispatch clerk'), L('Expedícia','Dispatch'), '2/2', '1', ['ok', L('kompletná','complete')]]},
        {id:'refrekl', go:'pozicia', c:[L('Referent reklamácií','Claims clerk'), L('Reklamácie','Claims'), '1/2', '1', ['cond', L('1 voľné miesto','1 open seat')]]},
        {id:'uctovnik', go:'pozicia', c:[L('Účtovník / Účtovníčka','Accountant'), L('Vedenie','Leadership'), '0/1', '1', ['q', L('šablóna, čaká na obsadenie','template, awaiting hire')]]},
        {id:'excopy', go:'pozicia', c:[L('Externý copywriter','External copywriter'), 'Marketing', '0/1', '0', ['ok', L('kompletná (externý)','complete (external)')]]},
        {id:'ppc', go:'pozicia', c:[L('PPC špecialista','PPC specialist'), 'Marketing', '0/1', '0', ['q', L('šablóna, čaká na obsadenie','template, awaiting hire')]]},
        {id:'juniorit', go:'pozicia', c:[L('Junior vývojár','Junior developer'), 'IT', '0/1', '0', ['q', L('šablóna, čaká na obsadenie','template, awaiting hire')]]},
        {id:'nakup', go:'pozicia', c:[L('Referent nákupu','Purchasing clerk'), L('Sklad','Warehouse'), '0/1', '0', ['q', L('šablóna, čaká na obsadenie','template, awaiting hire')]]},
        {id:'preklad', go:'pozicia', c:[L('Externý prekladateľ','External translator'), L('Zákaznícky servis','Customer service'), '0/1', '0', ['ok', L('kompletná (externý)','complete (external)')]]},
        {id:'dataspec', go:'pozicia', c:[L('Špecialista dátovej analýzy','Data analysis specialist'), L('Vedenie','Leadership'), '0/1', '0', ['q', L('šablóna, čaká na obsadenie','template, awaiting hire')]]}
      ],
      note:L('CTO, Vývojár, SEO/Copywriter, Newsletter & projekty, Team Leader CS a Skladník (názov, oddelenie, obsadenie, zdieľané maily, stav náplne) sú overené 1:1. Zvyšných 19 pozícií dopĺňa evidenciu do overeného počtu 32 a je ukážkových.','CTO, Developer, SEO/Copywriter, Newsletter & projects, CS Team Leader and Warehouse operator (title, department, filled seats, shared mail, duty status) are verified 1:1. The other 19 positions fill the registry out to the verified count of 32 and are illustrative.')},
    {t:'stack', title:L('Obsadenosť podľa oddelenia (zobrazené pozície)','Staffing by department (positions shown)'),
      labels:[L('Vedenie','Leadership'), 'IT', 'Marketing', L('Zák. servis','Customer svc'), L('Sklad','Warehouse'), L('Expedícia','Dispatch'), L('Reklamácie','Claims')],
      series:[
        {l:L('obsadené','filled'), tone:'var(--good)', v:[1,3,4,3,3,3,1]},
        {l:L('voľné','open'), tone:'var(--ink-3)', v:[3,1,2,0,1,0,1]}
      ],
      note:L('Ukážkový rozpad voľných miest podľa oddelenia pre 25 zobrazených pozícií.','Illustrative breakdown of open seats by department for the 25 positions shown.')}
  ],
  ai:[
    {q:L('Koľko pozícií je voľných?','How many positions are vacant?'),
     a:L('Z 25 zobrazených pozícií je 10 bez obsadenia (šablóna čaká na obsadenie) a 3 sú čiastočne obsadené (Ads špecialista, Skladník, Referent reklamácií). Zvyšných 12 je plne obsadených.','Of the 25 positions shown, 10 have no one assigned (template awaiting hire) and 3 are partially filled (Ads specialist, Warehouse operator, Claims clerk). The other 12 are fully staffed.'),
     cite:'appka', act:{l:L('Filtrovať voľné','Filter open'), k:'filter'}},
    {q:L('Ktorá pozícia má najviac zdieľaných mailov?','Which position has the most shared mailboxes?'),
     a:L('CTO – Technický riaditeľ so 4 zdieľanými schránkami (overené), nasleduje Team Leader CS s 3 (tiež overené) a SEO/Copywriter s 3.','CTO – Technical director with 4 shared mailboxes (verified), followed by CS Team Leader with 3 (also verified) and SEO/Copywriter with 3.'),
     cite:'pamäť', act:null},
    {q:L('Prečo je pozícií viac než ľudí?','Why are there more positions than people?'),
     a:L('32 pozícií pokrýva aj voľné miesta (šablóny čakajúce na obsadenie) a externých spolupracovníkov (copywriter, prekladateľ), zatiaľ čo evidencia má 18 aktívnych zamestnancov — obe čísla sú overené.','32 positions also cover open seats (templates awaiting hire) and external collaborators (copywriter, translator), while the registry has 18 active employees — both figures are verified.'),
     cite:'pamäť', act:null}
  ]
},

/* 5 — POZÍCIA (detail) -----------------------------------------------------*/
{key:'pozicia', icon:'book', title:L('Detail pozície','Position detail'),
  sub:L('CTO – Technický riaditeľ · Vedenie · 1/1 obsadené.','CTO – Technical director · Leadership · 1/1 filled.'),
  blocks:[
    {t:'cards', n:2, items:[
      {title:L('CTO – Technický riaditeľ','CTO – Technical director'), sub:L('Vedenie · 1/1 obsadené','Leadership · 1/1 filled'), badge:['ok', L('kompletná náplň','complete duties')],
        lines:[[L('Oddelenie','Department'), L('Vedenie','Leadership')], [L('Nadriadený','Reports to'), 'CEO'], [L('Zamestnanec','Employee'), 'Delaja'], [L('Zdieľané maily','Shared mail'), '4']],
        chips:[L('vlastné bloky','custom blocks')]},
      {title:L('Knižnica činností','Activity library'), sub:L('Pokrytie tejto pozície','Coverage for this position'), badge:['info', L('vlastné','custom')],
        lines:[[L('Blokov spolu','Total blocks'), '4'], [L('Z knižnice','From library'), '2'], [L('Vlastné','Custom'), '2']],
        chips:[L('bezpečnosť','security'), L('IT prevádzka','IT operations')]}
    ]},
    {t:'list', title:L('Bloky náplne práce','Duty blocks'),
      items:[
        {title:L('Technická stratégia a architektúra','Technology strategy & architecture'), sub:L('Vlastný blok — dlhodobý smer vývoja produktu','Custom block — long-term product direction'), badge:['info', L('vlastné','custom')]},
        {title:L('Dohľad nad IT tímom','IT team oversight'), sub:L('Vlastný blok — Daniel, Kiko a budúce pozície IT','Custom block — Daniel, Kiko and future IT positions'), badge:['info', L('vlastné','custom')]},
        {title:L('Schvaľovanie prístupov k aplikáciám','Approving app access'), sub:L('Knižnica činností — Bezpečnosť a prístup','Activity library — Security & access'), badge:['ok', L('knižnica','library')]},
        {title:L('Správa systémových a admin schránok','Managing system & admin mailboxes'), sub:L('Knižnica činností — IT prevádzka','Activity library — IT operations'), badge:['ok', L('knižnica','library')]}
      ],
      note:L('Znenie blokov je ukážkové, rozdelenie 2 knižnica / 2 vlastné je ilustračné pre túto pozíciu (celkový pomer 27/5 naprieč všetkými 32 pozíciami je overený).','Block wording is illustrative; the 2 library / 2 custom split shown here is an illustrative example for this position (the overall 27/5 ratio across all 32 positions is verified).')},
    {t:'table', title:L('Knižnica činností (výber)','Activity library (excerpt)'),
      cols:[L('Činnosť','Activity'), L('Kategória','Category'), L('Použitá v pozíciách','Used in positions')],
      rows:[
        {c:[L('Schvaľovanie prístupov k aplikáciám','Approving app access'), L('Bezpečnosť a prístup','Security & access'), '3']},
        {c:[L('Správa systémových a admin schránok','Managing system & admin mailboxes'), L('IT prevádzka','IT operations'), '2']},
        {c:[L('Vybavovanie zákazníckych dopytov','Handling customer enquiries'), L('Zákaznícky servis','Customer service'), '3']},
        {c:[L('Kontrola naskladnenia tovaru','Checking inbound stock'), L('Sklad','Warehouse'), '2']},
        {c:[L('Príprava zásielok na expedíciu','Preparing shipments for dispatch'), L('Expedícia','Dispatch'), '2']},
        {c:[L('Publikovanie obsahu na sociálne siete','Publishing social media content'), 'Marketing', '2']},
        {c:[L('Mesačná kontrola nákladov na nástroje','Monthly tool-cost review'), L('Financie','Finance'), '2']}
      ],
      note:L('Knižnica činností je zdieľaná naprieč pozíciami — 7 ukážkových položiek z celkovej knižnice, ktorá pokrýva 27 z 32 pozícií (overené).','The activity library is shared across positions — 7 illustrative entries from the full library, which covers 27 of 32 positions (verified).')},
    {t:'timeline', title:L('História pozície','Position history'), items:[
      [L('Minulý týždeň','Last week'), L('Náplň doplnená — pridaný blok Dohľad nad IT tímom','Duties updated — added IT team oversight block')],
      [L('Jún','June'), L('Pozícia priradená do org-stromu (Vedenie → IT)','Position placed in the org tree (Leadership → IT)')],
      ['2023', L('Pozícia vytvorená pri nástupe zamestnanca','Position created on employee hire')]
    ]}
  ],
  ai:[
    {q:L('Má táto pozícia kompletnú náplň?','Does this position have complete duties?'),
     a:L('Áno — má 4 bloky náplne, z toho 2 vlastné (nie z knižnice) a 2 z knižnice činností. CTO patrí medzi 5 pozícií z 32, ktoré majú aspoň časť náplne vlastnú.','Yes — it has 4 duty blocks, 2 custom (not from the library) and 2 from the activity library. CTO is one of the 5 positions (of 32) with at least part of its duties custom.'),
     cite:'appka', act:null},
    {q:L('Kto momentálne zastáva túto pozíciu?','Who currently holds this position?'),
     a:L('Delaja, od roku 2023, s prístupom Admin a 4 zdieľanými schránkami. Pozícia je obsadená 1/1.','Delaja, since 2023, with Admin access and 4 shared mailboxes. The position is filled 1/1.'),
     cite:'pamäť', act:{l:L('Otvoriť detail zamestnanca','Open employee detail'), k:'open'}},
    {q:L('Používajú iné pozície rovnaké činnosti z knižnice?','Do other positions use the same library activities?'),
     a:L('Áno — napríklad „Schvaľovanie prístupov k aplikáciám“ sa v knižnici používa v 3 pozíciách a „Mesačná kontrola nákladov na nástroje“ v 2. Knižnica je zdieľaná naprieč celou organizáciou.','Yes — for example "Approving app access" is used in 3 positions in the library, and "Monthly tool-cost review" in 2. The library is shared across the whole organization.'),
     cite:'ukážka', act:{l:L('Otvoriť Pozície','Open Positions'), k:'open'}}
  ]
},

/* 6 — ORG-STROM -----------------------------------------------------------*/
{key:'org', icon:'people', title:L('Org-strom','Org tree'),
  sub:L('Oddelenia a podriadenosti — mená čiastočne reálne, počty ľudí ukážkové.','Departments and reporting lines — names partly real, headcounts illustrative.'),
  blocks:[
    {t:'table', title:null,
      cols:[L('Uzol','Node'), L('Úroveň','Level'), L('Ľudia','People'), L('Pozície','Positions')],
      rows:[
        {c:[L('Vedenie','Leadership'), '1', '2', '2']},
        {c:['· CTO – Delaja', '2', '1', '1']},
        {c:['· · IT: Daniel, Kiko', '3', '2', '2']},
        {c:['· Marketing: Gabika, Ema', '2', '2', '3']},
        {c:[L('· Zákaznícky servis: Hajnalka +2','· Customer service: Hajnalka +2'), '2', '3', '2']},
        {c:[L('· Sklad','· Warehouse'), '2', '2/3', '1']},
        {c:[L('· · Expedícia','· · Dispatch'), '3', '2', '1']},
        {c:[L('· · Reklamácie','· · Claims'), '3', '1', '1']}
      ],
      note:L('Prevzaté 1:1 z existujúcej evidencie — mená čiastočne reálne, počty ľudí ukážkové.','Carried over 1:1 from the existing registry — names partly real, headcounts illustrative.')},
    {t:'cards', n:3, items:[
      {title:L('Vedenie','Leadership'), sub:L('1 zamestnanec · 2 pozície v tejto obrazovke','1 employee · 2 positions on this screen'), badge:['ok', L('overené','verified')], lines:[[L('Vedie','Leads'), 'CEO → CTO'], [L('Zdieľané maily','Shared mail'), '4']], chips:[]},
      {title:'IT', sub:L('3 zamestnanci · reportuje CTO','3 employees · reports to CTO'), badge:['ok', L('overené','verified')], lines:[[L('Pozície','Positions'), L('Vývojár ×2, Sysadmin','Developer ×2, Sysadmin')], [L('Voľné','Open'), L('DevOps, Junior vývojár','DevOps, Junior developer')]], chips:[]},
      {title:'Marketing', sub:L('4 zamestnanci','4 employees'), badge:['ok', L('overené','verified')], lines:[[L('Pozície','Positions'), L('SEO/Copywriter, Newsletter, Grafik, Ads','SEO/Copywriter, Newsletter, Graphic, Ads')], [L('Voľné','Open'), L('Fotograf, PPC','Photographer, PPC')]], chips:[]},
      {title:L('Zákaznícky servis','Customer service'), sub:L('3 zamestnanci · HU tím','3 employees · HU team'), badge:['cond', L('dopĺňa sa','in progress')], lines:[[L('Vedie','Leads'), 'Team Leader CS'], [L('Náplň','Duties'), L('dopĺňa sa','in progress')]], chips:[]},
      {title:L('Sklad','Warehouse'), sub:L('3 zamestnanci','3 employees'), badge:['cond', L('1 voľné miesto','1 open seat')], lines:[[L('Pozície','Positions'), L('Vedúci skladu, Skladník ×2/3','Warehouse lead, operator ×2/3')]], chips:[]},
      {title:L('Expedícia · Reklamácie','Dispatch · Claims'), sub:L('4 zamestnanci spolu','4 employees combined'), badge:['ok', L('overené','verified')], lines:[[L('Expedícia','Dispatch'), '3'], [L('Reklamácie','Claims'), '1']], chips:[]}
    ]}
  ],
  ai:[
    {q:L('Kto komu reportuje vo vedení?','Who reports to whom in leadership?'),
     a:L('IT (Daniel, Kiko) reportuje CTO Delajovi, ktorý je súčasťou Vedenia. Marketing, Zákaznícky servis a Sklad sú samostatné vetvy pod Vedením — presné organizačné prepojenie nad úrovňou CTO evidencia neobsahuje.','IT (Daniel, Kiko) reports to CTO Delaja, who sits under Leadership. Marketing, Customer service and Warehouse are separate branches under Leadership — the exact reporting line above CTO level is not captured in the registry.'),
     cite:'appka', act:null},
    {q:L('Ktoré oddelenie má podriadené oddelenia?','Which department has sub-departments?'),
     a:L('Sklad má dve podriadené vetvy — Expedíciu a Reklamácie — obe na úrovni 3. IT je podriadené oddelenie vedenia (úroveň 3 pod CTO na úrovni 2).','Warehouse has two sub-branches — Dispatch and Claims — both at level 3. IT is a sub-department under leadership (level 3, below CTO at level 2).'),
     cite:'appka', act:null},
    {q:L('Je tento strom presný?','Is this tree accurate?'),
     a:L('Mená vo vetvách sú čiastočne reálne, ale počty ľudí sú označené ako ukážkové a sedia len približne na celkových 18 — presné organizačné hlásenie treba brať zo súhrnu na Prehľade, ktorý je overený.','Names in the branches are partly real, but headcounts are marked illustrative and only roughly match the total of 18 — for a precise organizational count use the verified summary on Overview.'),
     cite:'pamäť', act:{l:L('Otvoriť Prehľad','Open Overview'), k:'open'}}
  ]
},

/* 7 — MAILY --------------------------------------------------------------*/
{key:'maily', icon:'inbox', title:L('Maily','Mailboxes'),
  sub:L('26 z ~90 rolových a zdieľaných schránok — adresa, vlastník, typ, heslo, presmerovania.','26 of ~90 role & shared mailboxes — address, owner, type, password, forwards.'),
  blocks:[
    {t:'kpis', items:[
      {l:L('Schránky spolu','Total mailboxes'), v:'~90', sub:L('overené','verified'), tone:null},
      {l:L('Zobrazené','Shown here'), v:int(26), sub:L('top schránky','top mailboxes'), tone:null},
      {l:L('Admin-only heslo','Admin-only password'), v:int(7), sub:L('z 26 zobrazených','of the 26 shown'), tone:'no'},
      {l:L('Zdieľané v tíme','Shared with team'), v:int(19), sub:L('z 26 zobrazených','of the 26 shown'), tone:'ok'}
    ]},
    {t:'table', title:null, page:true,
      cols:[L('Schránka','Mailbox'), L('Vlastník','Owner'), L('Typ','Type'), L('Heslo','Password'), L('Presmerovania','Forwards')],
      rows:[
        {c:['info@sperky-aura.sk', L('Zákaznícky servis (3)','Customer service (3)'), L('Zákaznícky servis','Customer service'), L('zdieľané','shared'), 'kontakt@, hello@']},
        {c:['objednavky@sperky-aura.sk', L('Zákaznícky servis (3)','Customer service (3)'), L('Zákaznícky servis','Customer service'), L('zdieľané','shared'), 'objednavka@, order@, obj@']},
        {c:['reklamacie@sperky-aura.sk', 'Hajnalka +1', L('Reklamácie','Claims'), L('zdieľané','shared'), 'reklamacia@, vratky-info@']},
        {c:['marketing@sperky-aura.sk', 'Gabika, Ema', 'Marketing', L('zdieľané','shared'), 'pr@']},
        {c:['seo@sperky-aura.sk', 'Gabika', 'Marketing', L('zdieľané','shared'), 'seo-tools@']},
        {c:['fakturacia@sperky-aura.sk', L('Vedenie (2)','Leadership (2)'), L('Vedenie','Leadership'), L('len Admin','Admin-only'), 'faktury@, invoices@']},
        {c:['admin@sperky-aura.sk', 'Delaja, Daniel', L('IT / Systém','IT / System'), L('len Admin','Admin-only'), 'sysadmin@']},
        {c:['hr@sperky-aura.sk', L('Vedenie (2)','Leadership (2)'), 'HR', L('len Admin','Admin-only'), 'kariera@']},
        {c:['sklad@sperky-aura.sk', L('Sklad (3)','Warehouse (3)'), L('Sklad','Warehouse'), L('zdieľané','shared'), 'warehouse@, naskladnenie@']},
        {c:['expedicia@sperky-aura.sk', L('Expedícia (2)','Dispatch (2)'), L('Expedícia','Dispatch'), L('zdieľané','shared'), 'dispatch@']},
        {c:['it@sperky-aura.sk', 'Daniel, Kiko', L('IT / Systém','IT / System'), L('zdieľané','shared'), '—']},
        {c:['noreply@sperky-aura.sk', 'Delaja', L('IT / Systém','IT / System'), L('len Admin','Admin-only'), '—']},
        {c:['backup@sperky-aura.sk', 'Daniel', L('IT / Systém','IT / System'), L('len Admin','Admin-only'), '—']},
        {c:['ads@sperky-aura.sk', 'Boris', 'Marketing', L('zdieľané','shared'), '—']},
        {c:['social@sperky-aura.sk', 'Tereza, Ema', 'Marketing', L('zdieľané','shared'), '—']},
        {c:['blog@sperky-aura.sk', 'Gabika', 'Marketing', L('zdieľané','shared'), '—']},
        {c:['support@sperky-aura.sk', 'Réka, Zsófia', L('Zákaznícky servis','Customer service'), L('zdieľané','shared'), '—']},
        {c:['vratky@sperky-aura.sk', 'Hajnalka', L('Zákaznícky servis','Customer service'), L('zdieľané','shared'), '—']},
        {c:['faq@sperky-aura.sk', 'Réka', L('Zákaznícky servis','Customer service'), L('zdieľané','shared'), '—']},
        {c:['inventura@sperky-aura.sk', 'Peter', L('Sklad','Warehouse'), L('zdieľané','shared'), '—']},
        {c:['dodavatelia@sperky-aura.sk', 'Peter, Ján', L('Sklad','Warehouse'), L('zdieľané','shared'), '—']},
        {c:['dopravcovia@sperky-aura.sk', 'Tomáš', L('Expedícia','Dispatch'), L('zdieľané','shared'), '—']},
        {c:['sledovanie@sperky-aura.sk', 'Michal', L('Expedícia','Dispatch'), L('zdieľané','shared'), '—']},
        {c:['reklamacie-eu@sperky-aura.sk', 'Zuzana', L('Reklamácie','Claims'), L('zdieľané','shared'), '—']},
        {c:['ceo@sperky-aura.sk', 'Delaja', L('Vedenie','Leadership'), L('len Admin','Admin-only'), '—']},
        {c:['legal@sperky-aura.sk', L('Delaja, Účtovník/čka','Delaja, Accountant'), L('Vedenie','Leadership'), L('len Admin','Admin-only'), '—']}
      ],
      note:L('Prvých 10 schránok (info, objednavky, reklamacie, marketing, seo, fakturacia, admin, hr, sklad, expedicia) je prevzatých z overenej evidencie — aliasy/presmerovania sú tam už v zdroji označené ako ukážkové. Zvyšných 16 schránok dopĺňa výber do reálneho počtu ~90 a je ukážkových.','The first 10 mailboxes (info, orders, claims, marketing, seo, invoicing, admin, hr, warehouse, dispatch) are carried over from the verified registry — aliases/forwards were already flagged illustrative in the source. The other 16 mailboxes extend the sample toward the real count of ~90 and are illustrative.')},
    {t:'banner', tone:'cond', text:L('Heslá zdieľaných schránok vidí len Admin — pri zmene roly skontrolujte prístup k ~90 mailom.','Shared mailbox passwords are Admin-only — check access to ~90 mailboxes when changing a role.')}
  ],
  ai:[
    {q:L('Ktoré schránky majú heslo viditeľné len pre Admina?','Which mailboxes have an Admin-only password?'),
     a:L('7 z 26 zobrazených: fakturacia@, admin@, hr@, noreply@, backup@, ceo@ a legal@ — väčšinou finančné, systémové a vedenie-súvisiace schránky.','7 of the 26 shown: fakturacia@, admin@, hr@, noreply@, backup@, ceo@ and legal@ — mostly finance, system and leadership-related mailboxes.'),
     cite:'appka', act:{l:L('Filtrovať admin-only','Filter admin-only'), k:'filter'}},
    {q:L('Koľko aliasov má info@sperky-aura.sk?','How many aliases does info@sperky-aura.sk have?'),
     a:L('Podľa overenej evidencie 2 aliasy — presmerovania kontakt@ a hello@ sú v tomto zozname ukážkovým znázornením, keďže konkrétne adresy aliasov zdroj neobsahoval.','Per the verified registry, 2 aliases — the kontakt@ and hello@ forwards shown here are an illustrative example, since the source did not include the specific alias addresses.'),
     cite:'pamäť', act:null},
    {q:L('Ako naimportujem nové zdieľané schránky?','How do I import new shared mailboxes?'),
     a:L('Import wizard na obrazovke Ľudia je nastavený na zamestnancov; nové schránky sa zatiaľ pridávajú ručne cez formulár na tejto obrazovke (Editor a vyššie), heslo zapíše len Admin.','The import wizard on the People screen is set up for employees; new mailboxes are currently added manually via the form on this screen (Editor role and above), and only Admin can enter the password.'),
     cite:'appka', act:{l:L('Pridať schránku','Add mailbox'), k:'create'}}
  ]
},

/* 8 — APLIKÁCIE ------------------------------------------------------------*/
{key:'aplikacie', icon:'server', title:L('Aplikácie','Applications'),
  sub:L('15 aplikácií a služieb — účel, vlastník, mesačné náklady a stav.','15 apps & services — purpose, owner, monthly cost and status.'),
  blocks:[
    {t:'kpis', items:[
      {l:L('Overený mesačný náklad (8 appiek)','Verified monthly cost (8 apps)'), v:cur(1240), sub:L('Asana, Shoptet, Ahrefs, Workspace, Adobe CC, Figma, Slack, Canva Pro','Asana, Shoptet, Ahrefs, Workspace, Adobe CC, Figma, Slack, Canva Pro'), tone:'ok'},
      {l:L('Doplnkové nástroje (ukážkové)','Additional tools (illustrative)'), v:cur(161), sub:L('7 malých licencií navyše','7 additional small licences'), tone:null},
      {l:L('Aplikácie spolu','Apps in total'), v:int(15), sub:L('8 overených + 7 ukážkových','8 verified + 7 illustrative'), tone:null},
      {l:L('Nevyužité (na zrušenie)','Underused (candidates to cancel)'), v:int(2), sub:'Adobe CC, Canva Pro', tone:'cond'}
    ]},
    {t:'table', title:null, page:true,
      cols:['Aplikácia', L('Účel','Purpose'), L('Vlastník','Owner'), L('€ / mes.','€ / mo'), L('Licencie','Licences'), L('Stav','Status')],
      rows:[
        {c:['Asana', L('Projekty a úlohy','Projects & tasks'), 'Delaja', cur(280), '15', ['ok', L('aktívna','active')]]},
        {c:['Shoptet', L('E-shop platforma','E-shop platform'), 'Delaja', cur(240), '1', ['ok', L('aktívna','active')]]},
        {c:['Ahrefs', 'SEO', 'Gabika', cur(220), '1', ['ok', L('aktívna','active')]]},
        {c:['Google Workspace', L('Maily a dokumenty','Mail & documents'), 'Daniel', cur(180), '~90', ['ok', L('aktívna','active')]]},
        {c:['Adobe CC', L('Grafika a fotky','Graphics & photos'), 'Ema', cur(120), '2', ['cond', L('nevyužitá','underused')]]},
        {c:['Figma', L('Návrhy bannerov a UI','Banner & UI design'), 'Ema', cur(90), '3', ['ok', L('aktívna','active')]]},
        {c:['Slack', L('Interná komunikácia','Internal comms'), 'Daniel', cur(70), '12', ['ok', L('aktívna','active')]]},
        {c:['Canva Pro', L('Rýchla grafika CS','Quick CS graphics'), 'Hajnalka', cur(40), '2', ['cond', L('nevyužitá','underused')]]},
        {c:['GitHub', L('Repozitáre a CI','Repos & CI'), 'Daniel', cur(40), '12', ['ok', L('aktívna','active')]]},
        {c:['Mailchimp', L('Rozosielky newsletterov','Newsletter sends'), 'Ema', cur(35), '1', ['ok', L('aktívna','active')]]},
        {c:['Cloudflare', L('DNS a CDN','DNS & CDN'), 'Daniel', cur(20), '1', ['ok', L('aktívna','active')]]},
        {c:['Notion', L('Interná dokumentácia','Internal documentation'), 'Delaja', cur(25), '8', ['ok', L('aktívna','active')]]},
        {c:['1Password', L('Správa hesiel tímu','Team password management'), 'Daniel', cur(18), '12', ['ok', L('aktívna','active')]]},
        {c:['Zoom', L('Video hovory','Video calls'), 'Delaja', cur(15), '5', ['ok', L('aktívna','active')]]},
        {c:[L('Packeta portál','Packeta portal'), L('Konto dopravcu, zvozy','Carrier account, pickups'), 'Tomáš', cur(8), '1', ['ok', L('aktívna','active')]]}
      ],
      note:L('Prvých 8 riadkov (Asana až Canva Pro) je overených, spolu presne 1 240 €/mes. Zvyšných 7 (GitHub až Packeta portál) je ukážkových príkladov ďalších nástrojov a nie je súčasťou overenej sumy.','The first 8 rows (Asana through Canva Pro) are verified, totalling exactly €1,240/mo. The remaining 7 (GitHub through Packeta portal) are illustrative examples of further tools and are not part of the verified total.')},
    {t:'bars', title:L('Náklady podľa aplikácie (top 10)','Cost by app (top 10)'),
      data:[
        {l:'Asana', v:280}, {l:'Shoptet', v:240}, {l:'Ahrefs', v:220}, {l:'Workspace', v:180},
        {l:'Adobe CC', v:120}, {l:'Figma', v:90}, {l:'Slack', v:70}, {l:'GitHub', v:40},
        {l:'Canva Pro', v:40}, {l:'Mailchimp', v:35}
      ],
      note:L('Prvé 4 stĺpce sú overené; zvyšok ukážkový.','The first 4 bars are verified; the rest are illustrative.')}
  ],
  ai:[
    {q:L('Ktoré aplikácie sú kandidátmi na zrušenie?','Which apps are cancellation candidates?'),
     a:L('Adobe CC (120 €/mes.) a Canva Pro (40 €/mes.) sú overene označené ako nevyužité — spolu 160 € mesačne, čo je 12,9 % z overenej sumy 1 240 €.','Adobe CC (€120/mo) and Canva Pro (€40/mo) are verified as underused — together €160/month, 12.9% of the verified €1,240 total.'),
     cite:'pamäť', act:{l:L('Filtrovať nevyužité','Filter underused'), k:'filter'}},
    {q:L('Kto je najväčší vlastník nákladov na nástroje?','Who owns the most tool cost?'),
     a:L('Delaja, ako vlastník Asany (280 €) a Shoptetu (240 €), spolu 520 € — 42 % z overenej sumy 1 240 €/mes.','Delaja, as the owner of Asana (€280) and Shoptet (€240), together €520 — 42% of the verified €1,240/mo total.'),
     cite:'pamäť', act:null},
    {q:L('Prečo je celkový súčet v tabuľke vyšší než 1 240 €?','Why is the table total higher than €1,240?'),
     a:L('Pretože tabuľka pre ukážku rozšírila overený zoznam 8 aplikácií o 7 ilustračných nástrojov (GitHub, Mailchimp, Cloudflare, Notion, 1Password, Zoom, Packeta portál) v hodnote 161 €/mes., ktoré nie sú súčasťou overenej sumy.','Because the table extends the verified 8-app list with 7 illustrative tools (GitHub, Mailchimp, Cloudflare, Notion, 1Password, Zoom, Packeta portal) worth €161/mo, which are not part of the verified total.'),
     cite:'ukážka', act:null}
  ]
},

/* 9 — NÁKLADY --------------------------------------------------------------*/
{key:'naklady', icon:'coins', title:L('Náklady','Costs'),
  sub:L('12 mesiacov nákladov na nástroje — september 2025 až august 2026.','12 months of tool costs — September 2025 to August 2026.'),
  blocks:[
    {t:'kpis', items:[
      {l:L('Aktuálny mesiac (aug 2026)','Current month (Aug 2026)'), v:cur(1240), sub:L('overené','verified'), tone:'ok', live:true},
      {l:L('Pred 12 mesiacmi (sep 2025)','12 months ago (Sep 2025)'), v:cur(980), sub:L('ukážkové','illustrative'), tone:null},
      {l:L('Nárast za 12 mesiacov','12-month increase'), v:pc(26.5), sub:'980 € → 1 240 €', tone:'cond'},
      {l:L('Priemer / mesiac','Average / month'), v:cur(1098), sub:L('za posledných 12 mesiacov','over the last 12 months'), tone:null}
    ]},
    {t:'lines', title:L('Náklady na nástroje — 12 mesiacov','Tool costs — 12 months'),
      labels:['Sep','Okt','Nov','Dec','Jan','Feb','Mar','Apr','Máj','Jún','Júl','Aug'],
      series:[{l:L('Náklady spolu','Total cost'), v:[980,1000,1010,1050,1060,1080,1100,1120,1150,1180,1210,1240], color:'var(--acc)'}],
      avg:true,
      note:L('Iba posledná hodnota (august, 1 240 €) je overená; predchádzajúcich 11 mesiacov je ukážkový, plauzibilný trend rastu.','Only the last value (August, €1,240) is verified; the preceding 11 months are an illustrative, plausible growth trend.')},
    {t:'table', title:L('Mesačný rozpad','Monthly breakdown'),
      cols:[L('Mesiac','Month'), L('Náklady','Cost'), L('Zmena m/m','Change m/m')],
      rows:[
        {c:['Sep 2025', cur(980), '—']},
        {c:['Okt 2025', cur(1000), '↑']},
        {c:['Nov 2025', cur(1010), '↑']},
        {c:['Dec 2025', cur(1050), '↑']},
        {c:['Jan 2026', cur(1060), '↑']},
        {c:['Feb 2026', cur(1080), '↑']},
        {c:['Mar 2026', cur(1100), '↑']},
        {c:['Apr 2026', cur(1120), '↑']},
        {c:['Máj 2026', cur(1150), '↑']},
        {c:['Jún 2026', cur(1180), '↑']},
        {c:['Júl 2026', cur(1210), '↑']},
        {c:['Aug 2026', cur(1240), '↑']}
      ],
      note:L('Rovnaká séria ako v grafe vyššie — len posledný riadok je overený.','Same series as the chart above — only the last row is verified.')}
  ],
  ai:[
    {q:L('O koľko vzrástli náklady za rok?','How much did costs grow over the year?'),
     a:L('Podľa ukážkovej histórie o 26,5 %, z 980 € na overených 1 240 €/mes. Rast je plynulý, bez skokov — v priemere +2 % mesačne.','Per the illustrative history, by 26.5%, from €980 to the verified €1,240/mo. Growth is steady, no spikes — about +2% per month on average.'),
     cite:'ukážka', act:null},
    {q:L('Je aktuálna suma overená?','Is the current amount verified?'),
     a:L('Áno, 1 240 €/mes. za august 2026 je overené z pamäte Aura AI a zodpovedá súčtu 8 aplikácií na obrazovke Aplikácie. Ostatných 11 mesiacov histórie je ilustračných.','Yes, €1,240/mo for August 2026 is verified from Aura AI memory and matches the sum of the 8 apps on the Apps screen. The other 11 months of history are illustrative.'),
     cite:'pamäť', act:{l:L('Otvoriť Aplikácie','Open Apps'), k:'open'}},
    {q:L('Dá sa stiahnuť report nákladov?','Can I export a cost report?'),
     a:L('Áno, cez šablónu „Náklady na nástroje“ v report builderi — obsahuje graf za 12 mesiacov, tabuľku a rozpad podľa vlastníka aplikácie.','Yes, via the "Tool costs" template in the report builder — it includes the 12-month chart, the table, and a breakdown by app owner.'),
     cite:'appka', act:{l:L('Vytvoriť report','Create report'), k:'export'}}
  ]
},

/* 10 — DOKUMENTY -------------------------------------------------------------*/
{key:'dokumenty', icon:'folder', title:L('Dokumenty','Documents'),
  sub:L('Zmluvy, školenia a platnosti dokumentov zamestnancov — ukážkové.','Employee contracts, training and document validity — illustrative.'),
  blocks:[
    {t:'kpis', items:[
      {l:L('Dokumentov spolu','Total documents'), v:int(20), sub:L('ukážkové','illustrative'), tone:null},
      {l:L('Platné','Valid'), v:int(14), sub:'', tone:'ok'},
      {l:L('Končia do 30 dní','Expiring within 30 days'), v:int(4), sub:'', tone:'cond'},
      {l:L('Po platnosti','Expired'), v:int(2), sub:'', tone:'no'}
    ]},
    {t:'table', title:null, page:true,
      cols:[L('Zamestnanec','Employee'), L('Dokument','Document'), L('Platnosť do','Valid until'), L('Stav','Status')],
      rows:[
        {c:['Delaja', L('Pracovná zmluva','Employment contract'), L('bez obmedzenia','indefinite'), ['ok', L('platná','valid')]]},
        {c:['Daniel', L('Pracovná zmluva','Employment contract'), L('bez obmedzenia','indefinite'), ['ok', L('platná','valid')]]},
        {c:['Kiko', L('Pracovná zmluva','Employment contract'), L('bez obmedzenia','indefinite'), ['ok', L('platná','valid')]]},
        {c:['Marek', L('Pracovná zmluva','Employment contract'), L('bez obmedzenia','indefinite'), ['ok', L('platná','valid')]]},
        {c:['Ema', L('Pracovná zmluva','Employment contract'), L('bez obmedzenia','indefinite'), ['ok', L('platná','valid')]]},
        {c:['Gabika', L('Pracovná zmluva','Employment contract'), L('bez obmedzenia','indefinite'), ['ok', L('platná','valid')]]},
        {c:['Tereza', L('Pracovná zmluva','Employment contract'), L('bez obmedzenia','indefinite'), ['ok', L('platná','valid')]]},
        {c:['Boris', L('Dohoda o pracovnej činnosti','Part-time work agreement'), '31. 12. 2026', ['ok', L('platná','valid')]]},
        {c:['Hajnalka', L('Dohoda o pracovnej činnosti','Part-time work agreement'), '30. 9. 2026', ['cond', L('končí čoskoro','expiring soon')]]},
        {c:['Réka', L('Dohoda o pracovnej činnosti','Part-time work agreement'), '30. 9. 2026', ['cond', L('končí čoskoro','expiring soon')]]},
        {c:['Zsófia', L('Dohoda o pracovnej činnosti','Part-time work agreement'), '31. 8. 2026', ['no', L('po platnosti','expired')]]},
        {c:['Peter', L('Pracovná zmluva','Employment contract'), L('bez obmedzenia','indefinite'), ['ok', L('platná','valid')]]},
        {c:['Ján', L('Školenie BOZP','Workplace safety training'), '15. 8. 2026', ['cond', L('končí čoskoro','expiring soon')]]},
        {c:['Igor', L('Školenie BOZP','Workplace safety training'), '2. 7. 2026', ['no', L('po platnosti','expired')]]},
        {c:['Tomáš', L('Pracovná zmluva','Employment contract'), L('bez obmedzenia','indefinite'), ['ok', L('platná','valid')]]},
        {c:['Michal', L('Vodičské oprávnenie — sklad. technika','Forklift licence'), '10. 1. 2027', ['ok', L('platná','valid')]]},
        {c:['Adam', L('Dohoda o pracovnej činnosti','Part-time work agreement'), '31. 1. 2027', ['ok', L('platná','valid')]]},
        {c:['Zuzana', L('Pracovná zmluva','Employment contract'), L('bez obmedzenia','indefinite'), ['ok', L('platná','valid')]]},
        {c:['Delaja', L('Školenie GDPR','GDPR training'), '1. 6. 2027', ['ok', L('platná','valid')]]},
        {c:['Hajnalka', L('Školenie GDPR','GDPR training'), '20. 8. 2026', ['cond', L('končí čoskoro','expiring soon')]]}
      ],
      note:L('Celá obrazovka je ukážková — evidencia dokumentov zatiaľ nie je overená zo zdroja.','This entire screen is illustrative — document records are not yet verified from the source.')}
  ],
  ai:[
    {q:L('Ktorým dokumentom čoskoro končí platnosť?','Which documents are expiring soon?'),
     a:L('4 dokumenty do 30 dní: dohody Hajnalky a Réky (do 30. 9.), školenie BOZP Jána (do 15. 8.) a školenie GDPR Hajnalky (do 20. 8.). Všetky sú ukážkové dáta.','4 documents within 30 days: the agreements of Hajnalka and Réka (until Sep 30), Ján\'s safety training (until Aug 15), and Hajnalka\'s GDPR training (until Aug 20). All are illustrative data.'),
     cite:'ukážka', act:{l:L('Filtrovať končiace','Filter expiring'), k:'filter'}},
    {q:L('Má niekto dokument po platnosti?','Does anyone have an expired document?'),
     a:L('Áno — dohoda Zsófie (do 31. 8.) a školenie BOZP Igora (do 2. 7.) sú v tomto ukážkovom zozname označené ako po platnosti.','Yes — Zsófia\'s agreement (until Aug 31) and Igor\'s safety training (until Jul 2) are flagged expired in this illustrative list.'),
     cite:'ukážka', act:{l:L('Filtrovať po platnosti','Filter expired'), k:'filter'}},
    {q:L('Sledujú sa aj vodičské oprávnenia?','Are driving/equipment licences tracked too?'),
     a:L('Áno, ako príklad — Michalovo oprávnenie na skladovú techniku s platnosťou do 10. 1. 2027. Je to súčasť rovnakej ukážkovej tabuľky dokumentov.','Yes, as an example — Michal\'s forklift licence valid until Jan 10, 2027. It\'s part of the same illustrative document table.'),
     cite:'ukážka', act:null}
  ]
},

/* 11 — AUDIT ----------------------------------------------------------------*/
{key:'audit', icon:'clock', title:L('Audit','Audit'),
  sub:L('Log zmien evidencie — každá úprava sa zaznamenáva (overená funkcia, položky ukážkové).','Registry change log — every edit is recorded (verified feature, entries illustrative).'),
  blocks:[
    {t:'kpis', items:[
      {l:L('Záznamov za 30 dní','Records in 30 days'), v:int(48), sub:L('ukážkové','illustrative'), tone:null},
      {l:L('Zmeny hesiel','Password changes'), v:int(3), sub:L('všetky Admin','all Admin'), tone:'no'},
      {l:L('Nové pozície','New positions'), v:int(2), sub:'', tone:null},
      {l:L('Zmeny prístupov','Access changes'), v:int(6), sub:'', tone:'cond'}
    ]},
    {t:'list', title:L('Posledné udalosti','Recent events'),
      items:[
        {title:L('Delaja zmenil heslo schránky fakturacia@','Delaja changed the password for fakturacia@'), sub:L('Admin-only akcia','Admin-only action'), badge:['no', L('citlivé','sensitive')], meta:'04. 08. 2026 09:12'},
        {title:L('Daniel pridal pozíciu Junior vývojár (IT)','Daniel added position Junior developer (IT)'), sub:L('Šablóna bez obsadenia','Template, unfilled'), badge:['q', L('nová pozícia','new position')], meta:'03. 08. 2026 14:40'},
        {title:L('Ema aktualizovala náplň — Newsletter & projekty','Ema updated duties — Newsletter & projects'), sub:L('2 bloky upravené','2 blocks edited'), badge:['ok', L('náplň','duties')], meta:'02. 08. 2026 11:05'},
        {title:L('Hajnalka zmenila rolu Réky na Prehliadač','Hajnalka changed Réka\'s role to Viewer'), sub:L('Prístup znížený','Access lowered'), badge:['cond', L('prístup','access')], meta:'31. 07. 2026 16:20'},
        {title:L('Daniel pridal aplikáciu GitHub','Daniel added the app GitHub'), sub:L('12 licencií · 40 €/mes.','12 licences · €40/mo'), badge:['ok', L('aplikácia','app')], meta:'29. 07. 2026 10:00'},
        {title:L('Delaja schválil prístup Igora k skladu@','Delaja approved Igor\'s access to sklad@'), sub:L('Zdieľaná schránka','Shared mailbox'), badge:['ok', L('prístup','access')], meta:'28. 07. 2026 08:47'},
        {title:L('Import: 3 nové záznamy zamestnancov','Import: 3 new employee records'), sub:L('Zdroj: CSV, upsert podľa mailu','Source: CSV, upsert on mail'), badge:['ok', L('import','import')], meta:'25. 07. 2026 15:30'},
        {title:L('Delaja zmenil heslo schránky admin@','Delaja changed the password for admin@'), sub:L('Admin-only akcia','Admin-only action'), badge:['no', L('citlivé','sensitive')], meta:'22. 07. 2026 09:02'},
        {title:L('Gabika aktualizovala náplň — SEO / Copywriter','Gabika updated duties — SEO / Copywriter'), sub:L('1 blok pridaný','1 block added'), badge:['ok', L('náplň','duties')], meta:'19. 07. 2026 13:15'},
        {title:L('Delaja zmenil heslo schránky hr@','Delaja changed the password for hr@'), sub:L('Admin-only akcia','Admin-only action'), badge:['no', L('citlivé','sensitive')], meta:'15. 07. 2026 09:00'}
      ],
      note:L('Existencia audit logu ku každej zmene evidencie je overená; konkrétne záznamy sú ukážkové.','The existence of an audit log for every registry change is verified; the specific entries are illustrative.')}
  ],
  ai:[
    {q:L('Kto mení heslá zdieľaných schránok?','Who changes shared mailbox passwords?'),
     a:L('V zázname za posledných 30 dní je to výhradne Delaja (Admin) — 3 zmeny hesiel na fakturacia@, admin@ a hr@. To je v súlade s pravidlom, že heslá spravuje len Admin.','In the last 30 days\' record, it\'s exclusively Delaja (Admin) — 3 password changes on fakturacia@, admin@ and hr@. This matches the rule that only Admin manages passwords.'),
     cite:'ukážka', act:null},
    {q:L('Loguje sa aj import dát?','Is data import also logged?'),
     a:L('Áno — napríklad záznam z 25. 7. 2026 o 3 nových zamestnancoch naimportovaných cez CSV s upsert kľúčom podľa mailu.','Yes — for example, the entry from Jul 25, 2026 about 3 new employees imported via CSV with an upsert key on mail.'),
     cite:'ukážka', act:{l:L('Otvoriť import','Open import'), k:'open'}},
    {q:L('Je audit log overená funkcia appky?','Is the audit log a verified app feature?'),
     a:L('Áno — logovanie „každej zmeny evidencie“ je súčasť overenej špecifikácie appky; konkrétne udalosti zobrazené tu sú ale ukážkové ilustrácie.','Yes — logging "every registry change" is part of the app\'s verified specification; the specific events shown here are illustrative examples though.'),
     cite:'pamäť', act:null}
  ]
},

/* 12 — NASTAVENIA -------------------------------------------------------------*/
{key:'nastavenia', icon:'gear', title:L('Nastavenia','Settings'),
  sub:L('Role, prístup k heslám, jazyk a GDPR poznámka.','Roles, password access, language and a GDPR note.'),
  blocks:[
    {t:'form', title:L('Role a prístupy','Roles & access'),
      fields:[
        {l:L('Roly v evidencii','Registry roles'), s:L('Admin · Editor · Prehliadač','Admin · Editor · Viewer'), type:'text', v:L('3 roly','3 roles')},
        {l:L('Heslá zdieľaných schránok','Shared mailbox passwords'), s:L('Vidí a mení len rola Admin (~90 schránok)','Visible and editable by Admin role only (~90 mailboxes)'), type:'switch', v:'x', on:true},
        {l:L('Audit log','Audit log'), s:L('Zaznamenáva každú zmenu evidencie','Records every registry change'), type:'switch', v:'x', on:true},
        {l:L('Jazyk','Language'), s:'SK · EN', type:'select', v:'SK', opts:['SK','EN']},
        {l:L('Tmavý režim','Dark mode'), s:L('Predvolený štýl evidencie','Default registry style'), type:'switch', v:'x', on:true}
      ],
      note:L('Rozdelenie rolí a pravidlo „heslá len Admin“ je overené z existujúcej špecifikácie.','The role split and the "passwords Admin-only" rule are verified from the existing spec.')},
    {t:'note', text:L('GDPR: evidencia obsahuje osobné údaje zamestnancov (meno, kontakt, pracovné zaradenie, dokumenty). Dáta sú len na interné použitie, prístup majú Admin a Editor podľa rozsahu svojej roly, Prehliadač vidí evidenciu bez citlivých polí (heslá, mzdové údaje sa v tejto appke neevidujú). Retencia osobných dokumentov sa riadi platnou pracovnoprávnou lehotou.','GDPR: the registry holds employee personal data (name, contact, role, documents). Data is for internal use only; Admin and Editor have access per their role scope, Viewer sees the registry without sensitive fields (passwords; payroll data is not tracked in this app). Personal document retention follows the applicable labour-law period.')},
    {t:'note', text:L('Integrácie: táto appka nemá napojenie na žiadne externé API ani systém tretej strany — je to čisto interná evidencia bez Shop API alebo iného konektora.','Integrations: this app has no connection to any external API or third-party system — it is a purely internal registry with no Shop API or other connector.')},
    {t:'banner', tone:'cond', text:L('Heslá zdieľaných schránok vidí len Admin — pri zmene roly skontrolujte prístup k ~90 mailom.','Shared mailbox passwords are Admin-only — check access to ~90 mailboxes when changing a role.')}
  ],
  ai:[
    {q:L('Kto vidí heslá zdieľaných schránok?','Who can see shared mailbox passwords?'),
     a:L('Iba rola Admin. Editor a Prehliadač vidia zoznam schránok a ich účel, ale nie heslo — pravidlo je overené a platí pre všetkých ~90 schránok.','Only the Admin role. Editor and Viewer see the mailbox list and its purpose, but not the password — the rule is verified and applies to all ~90 mailboxes.'),
     cite:'pamäť', act:null},
    {q:L('Má appka napojenie na e-shop alebo iné systémy?','Does the app connect to the e-shop or other systems?'),
     a:L('Nie — je to čisto interná evidencia bez API konektorov či integrácií s inými Aura appkami alebo e-shopom.','No — it is a purely internal registry with no API connectors or integrations with other Aura apps or the e-shop.'),
     cite:'appka', act:null},
    {q:L('Aké osobné údaje appka eviduje?','What personal data does the app hold?'),
     a:L('Meno, kontakt, pracovné zaradenie (pozícia, oddelenie), priradené maily a dokumenty (zmluvy, školenia). Mzdové údaje sa v appke neevidujú, prístup je obmedzený podľa role.','Name, contact, job details (position, department), assigned mail and documents (contracts, training). Payroll data is not tracked in the app; access is restricted by role.'),
     cite:'appka', act:{l:L('Otvoriť Ľudia','Open People'), k:'open'}}
  ]
}

]
};
