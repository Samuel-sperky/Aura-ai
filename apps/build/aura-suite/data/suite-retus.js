/* ══════════════════════════════════════════════════════════════
   Aura Retouch Studio (:8092) — rozšírený dátový balík pre Aura Suite náhľad.
   Základ prevzatý 1:1 z apps/build/aura-ai/data-studios.js (APP_RETUS) a
   doplnený o zvyšné obrazovky reálnej appky (15 routes / 9 views), api/imp/rep
   konektory a ai otázky. Overené fakty (porty, roly, workflow, protokoly,
   štandardy, počty z MVP dodávky) sú z Hades pamäte — v poznámkach označené.
   Všetko ostatné (konkrétne SKU, mená dávok, denné čísla) je ukážkové.
   Konvencie L()/cur()/int()/pc() a ikony z I existujú globálne (engine).
   ══════════════════════════════════════════════════════════════ */

const APP_RETUS2 = {
  key:'retus', name:'Aura Retouch Studio', port:'8092', icon:'image',
  tag:L('Samostatná appka pre tím retušérov: pracovná plocha pred/po, protokoly s dedičnosťou, QA kontrola a export podľa štandardov.','A standalone app for the retouch team: before/after workspace, inheritance-based protocols, QA review and export to standard.'),
  feat:[
    L('Workflow Nová → AI predspracovanie → V retuši → Na kontrole → Schválená/Zamietnutá → Export s reworkom','Workflow New → AI preprocessing → In retouch → In review → Approved/Rejected → Export with rework'),
    L('Protokoly ako matica typ šperku × typ záberu s dedičnosťou krokov — spoločné kroky sa neduplikujú','Protocols as a jewel type × shot type matrix with step inheritance — shared steps are not duplicated'),
    L('Blokujúce štandardy: biele #FFFFFF, presné rozmery, JPEG q90, sRGB — export sa zastaví, ak fotka nevyhovuje','Blocking standards: white #FFFFFF, exact dimensions, JPEG q90, sRGB — export halts if a photo does not comply')
  ],
  live:{v:L('24 v retuši · 9 na kontrole','24 in retouch · 9 in review'), tone:'cond', spark:[21,23,24,22,25,23,24]},

  api:{ endpoints:[
      {k:'photos', l:L('Fotky','Photos'), ms:64},
      {k:'jobs', l:L('AI joby','AI jobs'), ms:180},
      {k:'protocols', l:L('Protokoly','Protocols'), ms:40},
      {k:'exports', l:L('Exporty','Exports'), ms:210}
    ],
    sync:L('pred 5 min','5 min ago'), tone:'ok' },

  imp:{ target:'import',
    cols:[
      {k:'sku', l:L('SKU','SKU'), t:'text'},
      {k:'typ', l:L('Typ šperku','Jewel type'), t:'text'},
      {k:'material', l:L('Materiál','Material'), t:'text'},
      {k:'pocet_zaberov', l:L('Počet záberov','Shot count'), t:'num'}
    ],
    key:[L('kľúč upsertu: SKU','upsert key: SKU')],
    csv:'sku;typ;material;pocet_zaberov\n10245;prsteň;zlato 585;3\n10246;náramok;striebro 925;2\n10247;náušnice;zlato 585;4\n10248;retiazka;striebro 925;2\n10249;prívesok;zlato 375;3\nA10250;sada;zlato 585;5\n10251;prsteň;;3' },

  rep:{ templates:[
      {k:'priepustnost', l:L('Priepustnosť retušérov','Retoucher throughput'), s:L('Fotky/deň, plnenie cieľa, trend 12 týždňov','Photos/day, target attainment, 12-week trend')},
      {k:'qa', l:L('QA report','QA report'), s:L('Schválené/zamietnuté, adaptívna miera kontroly, rework','Approved/rejected, adaptive review rate, rework')},
      {k:'chyby', l:L('Report chýb','Error report'), s:L('Kategórie chýb za 12 týždňov, trend, top príčiny','Error categories over 12 weeks, trend, top causes')}
    ] },

  screens:[
    {
      key:'prehlad', icon:'gauge',
      title:L('Prehľad','Overview'),
      sub:L('Fronta práce, priepustnosť retušérov, QA prechodnosť, blokujúce štandardy','Work queue, retoucher throughput, QA pass rate, blocking standards'),
      blocks:[
        {t:'kpis', items:[
          {l:L('Fotky v retuši','Photos in retouch'), v:int(24), tone:null, live:true},
          {l:L('Na kontrole','In review'), v:int(9), tone:'cond'},
          {l:L('Zamietnuté (rework)','Rejected (rework)'), v:int(3), tone:'no'},
          {l:L('AI budget','AI budget'), v:L('mock','mock'), sub:L('reálne providery vo fáze 2','real providers in phase 2'), tone:null}
        ]},
        {t:'bars', title:L('Priepustnosť retušérov (fotky/deň)','Retoucher throughput (photos/day)'),
          data:[{l:L('Retušér 1','Retoucher 1'), v:14},{l:L('Retušér 2','Retoucher 2'), v:11},{l:L('Retušér 3','Retoucher 3'), v:9}],
          note:L('Ukážkové čísla priepustnosti — ilustrujú rozdiely medzi retušérmi, nie sú z reálneho merania.','Illustrative throughput numbers — they show differences between retouchers, not a real measurement.')},
        {t:'donut', title:L('QA prechodnosť dnes','QA pass rate today'), pct:82, label:L('14 schválených zo 17 rozhodnutí kontrolóra','14 approved out of 17 reviewer decisions'), note:L('Prepočet z dnešných rozhodnutí na obrazovke Kontrola — ukážkový deň.','Computed from today\'s decisions on the Review screen — illustrative day.')},
        {t:'table', title:L('Priepustnosť voči cieľu (14 fotiek/deň)','Throughput vs target (14 photos/day)'),
          cols:[L('Retušér','Retoucher'), L('Fotky/deň','Photos/day'), L('Plnenie cieľa','Target attainment')],
          rows:[
            {c:[L('Retušér 1','Retoucher 1'), int(14), {pln:100}]},
            {c:[L('Retušér 2','Retoucher 2'), int(11), {pln:79}]},
            {c:[L('Retušér 3','Retoucher 3'), int(9), {pln:64}]}
          ],
          note:L('Ukážkové čísla priepustnosti — ilustrujú rozdiely medzi retušérmi, nie sú z reálneho merania.','Illustrative throughput numbers — they show differences between retouchers, not a real measurement.')},
        {t:'banner', tone:'cond', text:L('AI predspracovanie beží na mock provideri — pozadie, čistenie prachu, upscaling a farebná korekcia ako job fronta; reálne AI providery sú naplánované na fázu 2.','AI preprocessing runs on the mock provider — background, dust cleanup, upscaling and color correction as a job queue; real AI providers are planned for phase 2.')}
      ],
      ai:[
        {q:L('Koľko fotiek je aktuálne v retuši a na kontrole?','How many photos are currently in retouch and in review?'), a:L('24 fotiek je v retuši, 9 čaká na kontrole a 3 boli dnes zamietnuté a idú do reworku. AI budget beží zatiaľ na mock provideri.','24 photos are in retouch, 9 are awaiting review and 3 were rejected today and go to rework. The AI budget still runs on the mock provider.'), cite:'appka', act:{l:L('Otvoriť frontu','Open queue'), k:'open'}},
        {q:L('Aká je priepustnosť jednotlivých retušérov?','What is each retoucher\'s throughput?'), a:L('Retušér 1 dáva 14 fotiek/deň (100 % cieľa), Retušér 2 11 (79 %), Retušér 3 9 (64 %) — ukážkové čísla, nie reálne meranie.','Retoucher 1 delivers 14 photos/day (100% of target), Retoucher 2 11 (79%), Retoucher 3 9 (64%) — illustrative numbers, not a real measurement.'), cite:'ukážka', act:null},
        {q:L('Aká je dnešná QA prechodnosť?','What is today\'s QA pass rate?'), a:L('82 % — 14 schválených zo 17 rozhodnutí kontrolóra za dnešný deň (ukážkový deň).','82% — 14 approvals out of 17 reviewer decisions today (illustrative day).'), cite:'appka', act:{l:L('Otvoriť kontrolu','Open review'), k:'open'}}
      ]
    },
    {
      key:'import', icon:'dl',
      title:L('Import','Import'),
      sub:L('Dávky fotiek (RAW/HEIC/JPEG) a import katalógu z Excelu (sku;typ;material;počet_záberov)','Photo batches (RAW/HEIC/JPEG) and catalog import from Excel (sku;type;material;shot_count)'),
      blocks:[
        {t:'kpis', items:[
          {l:L('Dávok dnes','Batches today'), v:int(3), tone:null},
          {l:L('Fotiek importovaných dnes','Photos imported today'), v:int(48), tone:null},
          {l:L('Chyby importu','Import errors'), v:int(2), tone:'no'},
          {l:L('Podporované formáty','Supported formats'), v:'RAW · HEIC · JPEG', tone:null}
        ]},
        {t:'table', title:L('Dávky importu','Import batches'),
          cols:[L('Dávka','Batch'), L('Počet fotiek','Photo count'), L('Zdroj','Source'), L('Stav','Status')],
          rows:[
            {c:['DAV-101', int(32), L('RAW import','RAW import'), ['ok', L('Hotovo','Done')]]},
            {c:['DAV-102', int(18), L('HEIC import','HEIC import'), ['ok', L('Hotovo','Done')]]},
            {c:['DAV-103', int(40), L('Priečinok OneDrive','OneDrive folder'), ['ok', L('Hotovo','Done')]]},
            {c:['DAV-104', int(24), L('Ručný upload','Manual upload'), ['ok', L('Hotovo','Done')]]},
            {c:['DAV-105', int(12), L('RAW import','RAW import'), ['no', L('Chyba','Error')]]},
            {c:['DAV-106', int(29), L('HEIC import','HEIC import'), ['ok', L('Hotovo','Done')]]},
            {c:['DAV-107', int(35), L('Priečinok OneDrive','OneDrive folder'), ['ok', L('Hotovo','Done')]]},
            {c:['DAV-108', int(9), L('Ručný upload','Manual upload'), ['q', L('Čaká','Queued')]]},
            {c:['DAV-109', int(21), L('RAW import','RAW import'), ['ok', L('Hotovo','Done')]]},
            {c:['DAV-110', int(15), L('HEIC import','HEIC import'), ['info', L('Spracováva sa','Processing')]]},
            {c:['DAV-111', int(38), L('Priečinok OneDrive','OneDrive folder'), ['ok', L('Hotovo','Done')]]},
            {c:['DAV-112', int(27), L('RAW import','RAW import'), ['ok', L('Hotovo','Done')]]},
            {c:['DAV-113', int(11), L('Ručný upload','Manual upload'), ['ok', L('Hotovo','Done')]]},
            {c:['DAV-114', int(30), L('HEIC import','HEIC import'), ['ok', L('Hotovo','Done')]]},
            {c:['DAV-115', int(8), L('RAW import','RAW import'), ['no', L('Chyba','Error')]]},
            {c:['DAV-116', int(33), L('Priečinok OneDrive','OneDrive folder'), ['ok', L('Hotovo','Done')]]},
            {c:['DAV-117', int(19), L('Ručný upload','Manual upload'), ['ok', L('Hotovo','Done')]]},
            {c:['DAV-118', int(26), L('RAW import','RAW import'), ['ok', L('Hotovo','Done')]]},
            {c:['DAV-119', int(14), L('HEIC import','HEIC import'), ['q', L('Čaká','Queued')]]},
            {c:['DAV-120', int(37), L('Priečinok OneDrive','OneDrive folder'), ['ok', L('Hotovo','Done')]]},
            {c:['DAV-121', int(22), L('RAW import','RAW import'), ['ok', L('Hotovo','Done')]]},
            {c:['DAV-122', int(16), L('Ručný upload','Manual upload'), ['info', L('Spracováva sa','Processing')]]}
          ],
          note:L('Ukážkové dávky — konkrétne počty a stavy ilustrujú priebeh importu, nie sú z reálnych logov.','Illustrative batches — the concrete counts and statuses show the import flow, not pulled from real logs.'), page:true},
        {t:'form', title:L('Import katalógu z Excelu','Catalog import from Excel'), fields:[
          {l:L('SKU','SKU'), s:L('kľúč upsertu','upsert key'), type:'text', v:''},
          {l:L('Typ šperku','Jewel type'), type:'text', v:''},
          {l:L('Materiál','Material'), type:'text', v:''},
          {l:L('Počet záberov','Shot count'), type:'text', v:''}
        ], note:L('Stĺpce sku;typ;material;pocet_zaberov, upsert podľa SKU. Chýbajúci materiál (napr. riadok 10251) import zastaví s chybou.','Columns sku;type;material;shot_count, upsert by SKU. A missing material (e.g. row 10251) halts the import with an error.')},
        {t:'note', text:L('Appka spracúva RAW aj HEIC vstupy (Docker: node:20-slim + libvips) — fotky sa po importe automaticky zaraďujú do stavu Nová podľa priradeného protokolu.','The app processes RAW and HEIC inputs (Docker: node:20-slim + libvips) — after import, photos are automatically placed in the New state per their assigned protocol.')}
      ],
      ai:[
        {q:L('Koľko fotiek sa dnes importovalo a koľko zlyhalo?','How many photos were imported today and how many failed?'), a:L('48 fotiek v 3 dávkach dnes, z toho 2 dávky (DAV-105, DAV-115) skončili chybou importu — ukážkový deň.','48 photos in 3 batches today, of which 2 batches (DAV-105, DAV-115) ended in an import error — illustrative day.'), cite:'appka', act:null},
        {q:L('Aký formát má import katalógu?','What format does the catalog import use?'), a:L('Excel/CSV so stĺpcami sku;typ;material;pocet_zaberov, upsert podľa SKU — riadok bez materiálu (10251) import zastaví.','Excel/CSV with columns sku;type;material;shot_count, upsert by SKU — a row without material (10251) halts the import.'), cite:'import', act:{l:L('Otvoriť import','Open import'), k:'open'}},
        {q:L('Aké formáty fotiek appka podporuje?','What photo formats does the app support?'), a:L('RAW aj HEIC vedľa štandardného JPEG — Docker image beží na node:20-slim s libvips práve kvôli tomu.','RAW and HEIC alongside standard JPEG — the Docker image runs node:20-slim with libvips specifically for this.'), cite:'pamäť', act:null}
      ]
    },
    {
      key:'fronta', icon:'list',
      title:L('Fronta','Queue'),
      sub:L('Kanban podľa workflow stavov a tabuľka fotiek vo fronte','Kanban by workflow state and a table of queued photos'),
      blocks:[
        {t:'kpis', items:[
          {l:L('Priemerný čas v stave „V retuši"','Avg time in "In retouch"'), v:L('1,8 dňa','1.8 days'), tone:null},
          {l:L('Čaká na AI job','Awaiting AI job'), v:int(4), tone:'cond'},
          {l:L('V rework-u','In rework'), v:int(3), tone:'no'},
          {l:L('Fotiek vo fronte spolu','Total photos in queue'), v:int(51), tone:null}
        ]},
        {t:'kanban', columns:[
          {l:L('Nová','New'), items:[
            {title:'SKU-1042', sub:L('náramok · makro','bracelet · macro'), badge:['q',L('Nová','New')]},
            {title:'SKU-1055', sub:L('retiazka · voľne položená','chain · laid flat'), badge:['q',L('Nová','New')]}
          ]},
          {l:L('AI predspracovanie','AI preprocessing'), items:[
            {title:'SKU-1039', sub:L('pozadie + čistenie prachu','background + dust cleanup'), badge:['info',L('Job beží','Job running')]}
          ]},
          {l:L('V retuši','In retouch'), items:[
            {title:'SKU-1031', sub:L('prsteň · detail','ring · detail'), badge:['cond',L('Rozpracované','In progress')]},
            {title:'SKU-1033', sub:L('náušnice · sada','earrings · set'), badge:['cond',L('Rozpracované','In progress')]}
          ]},
          {l:L('Na kontrole','In review'), items:[
            {title:'SKU-1028', sub:L('náušnice · sada','earrings · set'), badge:['info',L('Čaká na kontrolóra','Awaiting reviewer')]}
          ]},
          {l:L('Schválená / Zamietnutá','Approved / Rejected'), items:[
            {title:'SKU-1020', sub:L('zamietnuté — kategória: farba pozadia','rejected — category: background color'), badge:['no',L('Zamietnutá','Rejected')]}
          ]},
          {l:L('Export','Export'), items:[
            {title:'SKU-1015', sub:L('2000×2000 + odvodeniny + IG','2000×2000 + derivatives + IG'), badge:['ok',L('Hotovo','Done')]}
          ]}
        ]},
        {t:'table', title:L('Fotky vo fronte','Photos in the queue'),
          cols:[L('SKU','SKU'), L('Typ šperku','Jewel type'), L('Typ záberu','Shot type'), L('Retušér','Retoucher'), L('Stav','Status'), L('Protokol','Protocol'), L('Čas v stave','Time in state')],
          rows:[
            {c:['SKU-1001', L('Prsteň','Ring'), L('Detailný záber','Detail shot'), L('Retušér 1','Retoucher 1'), ['ok',L('Export','Export')], L('Prsteň / Detail','Ring / Detail'), '—'], go:'fotka'},
            {c:['SKU-1002', L('Náramok','Bracelet'), L('Makro','Macro'), L('Retušér 2','Retoucher 2'), ['ok',L('Export','Export')], L('Náramok / Makro','Bracelet / Macro'), '—'], go:'fotka'},
            {c:['SKU-1003', L('Náušnice','Earrings'), L('Sada (pár)','Set (pair)'), L('Retušér 3','Retoucher 3'), ['ok',L('Schválená','Approved')], L('Náušnice / Sada','Earrings / Set'), '2 h'], go:'fotka'},
            {c:['SKU-1004', L('Retiazka','Chain'), L('Voľne položená','Laid flat'), L('Retušér 1','Retoucher 1'), ['no',L('Zamietnutá','Rejected')], L('Retiazka / Voľne','Chain / Laid flat'), '5 h'], go:'fotka'},
            {c:['SKU-1005', L('Prívesok','Pendant'), L('Na modelke','On model'), L('Retušér 2','Retoucher 2'), ['info',L('Na kontrole','In review')], L('Prívesok / Model','Pendant / On model'), '1,1 dňa'], go:'fotka'},
            {c:['SKU-1006', L('Sada','Set'), L('Sada (pár)','Set (pair)'), L('Retušér 3','Retoucher 3'), ['cond',L('V retuši','In retouch')], L('Sada / Sada','Set / Set'), '0,9 dňa'], go:'fotka'},
            {c:['SKU-1007', L('Prsteň','Ring'), L('Makro','Macro'), L('Retušér 1','Retoucher 1'), ['cond',L('V retuši','In retouch')], L('Prsteň / Makro','Ring / Macro'), '1,4 dňa'], go:'fotka'},
            {c:['SKU-1008', L('Náramok','Bracelet'), L('Detailný záber','Detail shot'), L('Retušér 2','Retoucher 2'), ['info',L('AI predspracovanie','AI preprocessing')], L('Náramok / Detail','Bracelet / Detail'), '18 min'], go:'fotka'},
            {c:['SKU-1009', L('Náušnice','Earrings'), L('Voľne položená','Laid flat'), L('Retušér 3','Retoucher 3'), ['q',L('Nová','New')], L('Náušnice / Voľne','Earrings / Laid flat'), '—'], go:'fotka'},
            {c:['SKU-1010', L('Retiazka','Chain'), L('Makro','Macro'), L('Retušér 1','Retoucher 1'), ['ok',L('Export','Export')], L('Retiazka / Makro','Chain / Macro'), '—'], go:'fotka'},
            {c:['SKU-1011', L('Prívesok','Pendant'), L('Detailný záber','Detail shot'), L('Retušér 2','Retoucher 2'), ['ok',L('Schválená','Approved')], L('Prívesok / Detail','Pendant / Detail'), '3 h'], go:'fotka'},
            {c:['SKU-1012', L('Sada','Set'), L('Na modelke','On model'), L('Retušér 3','Retoucher 3'), ['cond',L('V retuši','In retouch')], L('Sada / Model','Set / On model'), '2,1 dňa'], go:'fotka'},
            {c:['SKU-1013', L('Prsteň','Ring'), L('Sada (pár)','Set (pair)'), L('Retušér 1','Retoucher 1'), ['info',L('Na kontrole','In review')], L('Prsteň / Sada','Ring / Set'), '0,6 dňa'], go:'fotka'},
            {c:['SKU-1014', L('Náramok','Bracelet'), L('Voľne položená','Laid flat'), L('Retušér 2','Retoucher 2'), ['q',L('Nová','New')], L('Náramok / Voľne','Bracelet / Laid flat'), '—'], go:'fotka'},
            {c:['SKU-1015', L('Náušnice','Earrings'), L('Makro','Macro'), L('Retušér 3','Retoucher 3'), ['ok',L('Export','Export')], L('Náušnice / Makro','Earrings / Macro'), '—'], go:'fotka'},
            {c:['SKU-1016', L('Retiazka','Chain'), L('Na modelke','On model'), L('Retušér 1','Retoucher 1'), ['cond',L('V retuši','In retouch')], L('Retiazka / Model','Chain / On model'), '1,0 dňa'], go:'fotka'},
            {c:['SKU-1017', L('Prívesok','Pendant'), L('Sada (pár)','Set (pair)'), L('Retušér 2','Retoucher 2'), ['info',L('AI predspracovanie','AI preprocessing')], L('Prívesok / Sada','Pendant / Set'), '22 min'], go:'fotka'},
            {c:['SKU-1018', L('Sada','Set'), L('Detailný záber','Detail shot'), L('Retušér 3','Retoucher 3'), ['ok',L('Schválená','Approved')], L('Sada / Detail','Set / Detail'), '4 h'], go:'fotka'},
            {c:['SKU-1019', L('Prsteň','Ring'), L('Voľne položená','Laid flat'), L('Retušér 1','Retoucher 1'), ['q',L('Nová','New')], L('Prsteň / Voľne','Ring / Laid flat'), '—'], go:'fotka'},
            {c:['SKU-1020', L('Náramok','Bracelet'), L('Na modelke','On model'), L('Retušér 2','Retoucher 2'), ['no',L('Zamietnutá','Rejected')], L('Náramok / Model','Bracelet / On model'), '6 h'], go:'fotka'},
            {c:['SKU-1021', L('Náušnice','Earrings'), L('Detailný záber','Detail shot'), L('Retušér 3','Retoucher 3'), ['cond',L('V retuši','In retouch')], L('Náušnice / Detail','Earrings / Detail'), '0,4 dňa'], go:'fotka'},
            {c:['SKU-1022', L('Retiazka','Chain'), L('Sada (pár)','Set (pair)'), L('Retušér 1','Retoucher 1'), ['info',L('Na kontrole','In review')], L('Retiazka / Sada','Chain / Set'), '0,8 dňa'], go:'fotka'},
            {c:['SKU-1023', L('Prívesok','Pendant'), L('Makro','Macro'), L('Retušér 2','Retoucher 2'), ['ok',L('Export','Export')], L('Prívesok / Makro','Pendant / Macro'), '—'], go:'fotka'},
            {c:['SKU-1024', L('Sada','Set'), L('Voľne položená','Laid flat'), L('Retušér 3','Retoucher 3'), ['q',L('Nová','New')], L('Sada / Voľne','Set / Laid flat'), '—'], go:'fotka'},
            {c:['SKU-1025', L('Prsteň','Ring'), L('Na modelke','On model'), L('Retušér 1','Retoucher 1'), ['cond',L('V retuši','In retouch')], L('Prsteň / Model','Ring / On model'), '1,6 dňa'], go:'fotka'},
            {c:['SKU-1026', L('Náramok','Bracelet'), L('Sada (pár)','Set (pair)'), L('Retušér 2','Retoucher 2'), ['info',L('AI predspracovanie','AI preprocessing')], L('Náramok / Sada','Bracelet / Set'), '9 min'], go:'fotka'},
            {c:['SKU-1027', L('Náušnice','Earrings'), L('Na modelke','On model'), L('Retušér 3','Retoucher 3'), ['ok',L('Schválená','Approved')], L('Náušnice / Model','Earrings / On model'), '1,5 h'], go:'fotka'}
          ],
          note:L('Ukážkové položky fronty — SKU, časy v stave a priradenia retušérov ilustrujú priebeh, workflow stavy a protokoly sú reálne.','Illustrative queue items — the SKUs, time-in-state and retoucher assignments are for illustration; the workflow states and protocols are real.'), page:true}
      ],
      ai:[
        {q:L('Koľko fotiek čaká na AI predspracovanie?','How many photos are waiting for AI preprocessing?'), a:L('4 fotky sú aktuálne v stave AI predspracovanie (napr. SKU-1008, SKU-1017, SKU-1026) — job fronta beží na mock provideri.','4 photos are currently in the AI preprocessing state (e.g. SKU-1008, SKU-1017, SKU-1026) — the job queue runs on the mock provider.'), cite:'appka', act:null},
        {q:L('Ktoré fotky sú v reworku po zamietnutí?','Which photos are in rework after being rejected?'), a:L('3 fotky sú aktuálne zamietnuté a čakajú na rework (napr. SKU-1004, SKU-1020) — vracajú sa do stavu V retuši s anotáciou kontrolóra.','3 photos are currently rejected and awaiting rework (e.g. SKU-1004, SKU-1020) — they return to the In retouch state with the reviewer\'s annotation.'), cite:'appka', act:{l:L('Filtrovať zamietnuté','Filter rejected'), k:'filter'}},
        {q:L('Aký je priemerný čas fotky v stave V retuši?','What is the average time a photo spends in In retouch?'), a:L('1,8 dňa — ukážkový priemer, reálne meranie čaká na dlhší prevádzkový beh appky.','1.8 days — an illustrative average; a real measurement needs a longer operational run of the app.'), cite:'ukážka', act:null}
      ]
    },
    {
      key:'retus', icon:'swap',
      title:L('Pracovná plocha retuše','Retouch workspace'),
      sub:L('Fotka pred/po, kroky protokolu, nástroje a hodnoty, AI predspracovanie ako job','Before/after photo, protocol steps, tools and values, AI preprocessing as a job'),
      blocks:[
        {t:'cards', n:2, items:[
          {title:L('Pred','Before'), sub:L('SKU-1031 · prsteň','SKU-1031 · ring'), lines:[[L('Zdroj','Source'), L('RAW import','RAW import')],[L('Rozmer','Size'), '4000×3000']]},
          {title:L('Po','After'), sub:L('po kroku 4/6 protokolu','after step 4/6 of the protocol'), badge:['cond',L('V retuši','In retouch')], lines:[[L('Rozmer','Size'), '2000×2000'],[L('Formát','Format'), 'JPEG q90 · sRGB']]}
        ]},
        {t:'table', title:L('Kroky protokolu — Prsteň / Detailný záber','Protocol steps — Ring / Detail shot'),
          cols:[L('Krok','Step'), L('Nástroj','Tool'), L('Hodnota','Value'), L('Recept','Recipe'), L('Stav','Status')],
          rows:[
            {c:[L('1. Orezanie a rovnanie','1. Crop & straighten'), L('Crop','Crop'), '1:1', '—', ['ok', L('Hotovo','Done')]]},
            {c:[L('2. Odstránenie prachu (AI)','2. Dust removal (AI)'), L('AI job','AI job'), L('automaticky','automatic'), '—', ['ok', L('Hotovo','Done')]]},
            {c:[L('3. Biele pozadie','3. White background'), L('Levels/Curves','Levels/Curves'), '#FFFFFF', 'preset_biele.atn', ['ok', L('Hotovo','Done')]]},
            {c:[L('4. Farebná korekcia zlata','4. Gold color correction'), 'LUT', 'gold_warm.cube', 'gold_warm.cube', ['cond', L('Prebieha','In progress')]]},
            {c:[L('5. Doostrenie','5. Sharpening'), L('Unsharp mask','Unsharp mask'), '120/0.5/0', '—', ['q', L('Čaká','Pending')]]},
            {c:[L('6. Kontrola rozmeru pred exportom','6. Size check before export'), L('Automaticky','Automatic'), '2000×2000', '—', ['q', L('Čaká','Pending')]]}
          ],
          note:L('Kroky, hodnoty nástrojov a recepty pochádzajú z konkrétneho protokolu (matica typ šperku × typ záberu s dedičnosťou) — táto ukážka ilustruje jeden priebeh.','Steps, tool values and recipes come from a specific protocol (jewel type × shot type matrix with inheritance) — this example illustrates one run.')},
        {t:'list', title:L('AI predspracovanie — jobs','AI preprocessing jobs'), items:[
          {title:L('Pozadie → biele #FFFFFF','Background → white #FFFFFF'), sub:L('dokončené','completed'), badge:['ok',L('Hotovo','Done')], meta:'09:12'},
          {title:L('Čistenie prachu','Dust cleanup'), sub:L('dokončené','completed'), badge:['ok',L('Hotovo','Done')], meta:'09:12'},
          {title:L('Upscaling','Upscaling'), sub:L('beží','running'), badge:['info',L('Job beží','Job running')], meta:'09:14'}
        ]},
        {t:'note', text:L('AI robí pozadie, čistenie prachu, upscaling a farebnú korekciu ako job fronta (mock v MVP, reálne providery vo fáze 2).','AI handles background, dust cleanup, upscaling and color correction as a job queue (mock in the MVP, real providers in phase 2).')}
      ],
      ai:[
        {q:L('Ktoré kroky protokolu sú na tejto fotke ešte otvorené?','Which protocol steps on this photo are still open?'), a:L('Kroky 5 (doostrenie) a 6 (kontrola rozmeru pred exportom) čakajú, krok 4 (farebná korekcia zlata cez LUT gold_warm.cube) práve prebieha.','Steps 5 (sharpening) and 6 (size check before export) are pending, step 4 (gold color correction via LUT gold_warm.cube) is in progress.'), cite:'appka', act:null},
        {q:L('Aké AI joby bežali na tejto fotke?','What AI jobs ran on this photo?'), a:L('Pozadie → biele #FFFFFF a čistenie prachu sú hotové, upscaling aktuálne beží — všetko na mock provideri.','Background → white #FFFFFF and dust cleanup are done, upscaling is currently running — all on the mock provider.'), cite:'appka', act:null},
        {q:L('Aký recept sa používa na farebnú korekciu zlata?','What recipe is used for gold color correction?'), a:L('LUT gold_warm.cube — recepty typu LUT/.atn/preset sú súčasťou definície protokolu a dedia sa podľa materiálu.','LUT gold_warm.cube — LUT/.atn/preset recipe types are part of the protocol definition and are inherited by material.'), cite:'appka', act:{l:L('Otvoriť protokol','Open protocol'), k:'open'}}
      ]
    },
    {
      key:'fotka', icon:'image',
      title:L('Detail fotky','Photo detail'),
      sub:L('SKU, priradený protokol, kroky, verzie a anotácie kontrolóra','SKU, assigned protocol, steps, versions and reviewer annotations'),
      blocks:[
        {t:'cards', n:2, items:[
          {title:'SKU-1020', sub:L('náramok · na modelke','bracelet · on model'), badge:['no',L('Zamietnutá','Rejected')], lines:[[L('Materiál','Material'), L('striebro 925','silver 925')],[L('Protokol','Protocol'), L('Náramok / Na modelke','Bracelet / On model')]]},
          {title:L('Aktuálna verzia','Current version'), sub:'v5', lines:[[L('Rozmer','Size'), '2000×2000'],[L('Formát','Format'), 'JPEG q90 · sRGB']]}
        ]},
        {t:'table', title:L('História verzií','Version history'),
          cols:[L('Verzia','Version'), L('Dátum','Date'), L('Autor','Author'), L('Zmena','Change'), L('Stav','Status')],
          rows:[
            {c:['v1', '28.7.', L('Import','Import'), L('RAW import, 4000×3000','RAW import, 4000×3000'), ['q', L('Nová','New')]]},
            {c:['v2', '29.7.', L('AI job','AI job'), L('pozadie + čistenie prachu','background + dust cleanup'), ['ok', L('Hotovo','Done')]]},
            {c:['v3', '30.7.', L('Retušér 2','Retoucher 2'), L('kroky 1–3 protokolu','protocol steps 1–3'), ['ok', L('Hotovo','Done')]]},
            {c:['v4', '31.7.', L('Retušér 2','Retoucher 2'), L('kroky 4–6, export na kontrolu','steps 4–6, sent to review'), ['info', L('Na kontrole','In review')]]},
            {c:['v5', '31.7.', L('Kontrolór','Reviewer'), L('zamietnutá — anotácia v obrázku','rejected — in-image annotation'), ['no', L('Zamietnutá','Rejected')]]}
          ],
          note:L('Ukážková história — princíp verzovania krokov a stavov je reálny.','Illustrative history — the step and status versioning principle is real.')},
        {t:'list', title:L('Anotácie kontrolóra','Reviewer annotations'), items:[
          {title:L('Farba pozadia mimo #FFFFFF','Background color off #FFFFFF'), sub:L('anotácia priamo v obrázku (canvas), roh vpravo hore','in-image annotation (canvas), top-right corner'), badge:['no',L('Farba pozadia','Background color')], meta:'31.7. 14:12'}
        ]},
        {t:'note', text:L('Zamietnutie vždy nesie anotáciu priamo v obrázku (canvas) a kategóriu chyby — fotka sa vracia do stavu V retuši na rework.','A rejection always carries an in-image annotation (canvas) and an error category — the photo returns to the In retouch state for rework.')}
      ],
      ai:[
        {q:L('Prečo bola táto fotka zamietnutá?','Why was this photo rejected?'), a:L('Kategória chyby: farba pozadia mimo tolerancie #FFFFFF, anotácia je priamo v obrázku vpravo hore.','Error category: background color outside the #FFFFFF tolerance, the annotation is directly in the image, top right.'), cite:'appka', act:null},
        {q:L('Aký protokol je priradený k tejto fotke?','What protocol is assigned to this photo?'), a:L('Náramok / Na modelke — materiál striebro 925 riadi aj farebnú korekciu v AI predspracovaní.','Bracelet / On model — the silver 925 material also drives the color correction in AI preprocessing.'), cite:'appka', act:{l:L('Otvoriť protokol','Open protocol'), k:'open'}},
        {q:L('Koľko verzií táto fotka má?','How many versions does this photo have?'), a:L('5 verzií od RAW importu po zamietnutie — každý krok protokolu a každé rozhodnutie kontrolóra sa verzuje.','5 versions from RAW import to rejection — every protocol step and every reviewer decision is versioned.'), cite:'ukážka', act:null}
      ]
    },
    {
      key:'protokoly', icon:'doc',
      title:L('Protokoly','Protocols'),
      sub:L('Matica typ šperku × typ záberu s dedičnosťou, kroky, recepty .atn/LUT/preset','Jewel type × shot type matrix with inheritance, steps, .atn/LUT/preset recipes'),
      blocks:[
        {t:'kpis', items:[
          {l:L('Protokolov v seede','Protocols seeded'), v:int(18), tone:null},
          {l:L('Dedičnosť krokov','Step inheritance'), v:L('zapnutá','on'), tone:null},
          {l:L('Typy receptov','Recipe types'), v:L('.atn · LUT · preset','.atn · LUT · preset'), tone:null}
        ]},
        {t:'table', title:L('Matica protokolov','Protocol matrix'),
          cols:[L('Typ šperku','Jewel type'), L('Typ záberu','Shot type'), L('Kroky','Steps'), L('Recept','Recipe'), L('Dedí z','Inherits from')],
          rows:[
            {c:[L('Prsteň','Ring'), L('Detailný záber','Detail shot'), '6', 'gold_warm.cube', L('Základ · Kov','Base · Metal')], go:'protokol'},
            {c:[L('Prsteň','Ring'), L('Makro','Macro'), '6', 'gold_warm.cube', L('Základ · Kov','Base · Metal')], go:'protokol'},
            {c:[L('Prsteň','Ring'), L('Na modelke','On model'), '7', 'gold_warm.cube', L('Základ · Kov · Model','Base · Metal · Model')], go:'protokol'},
            {c:[L('Prsteň','Ring'), L('Voľne položená','Laid flat'), '5', 'gold_warm.cube', L('Základ · Kov','Base · Metal')], go:'protokol'},
            {c:[L('Náramok','Bracelet'), L('Makro','Macro'), '5', 'silver_cool.cube', L('Základ · Kov','Base · Metal')], go:'protokol'},
            {c:[L('Náramok','Bracelet'), L('Detailný záber','Detail shot'), '6', 'silver_cool.cube', L('Základ · Kov','Base · Metal')], go:'protokol'},
            {c:[L('Náramok','Bracelet'), L('Na modelke','On model'), '7', 'silver_cool.cube', L('Základ · Kov · Model','Base · Metal · Model')], go:'protokol'},
            {c:[L('Náušnice','Earrings'), L('Sada (pár)','Set (pair)'), '7', 'preset_biele.atn', L('Základ','Base')], go:'protokol'},
            {c:[L('Náušnice','Earrings'), L('Detailný záber','Detail shot'), '6', 'preset_biele.atn', L('Základ','Base')], go:'protokol'},
            {c:[L('Náušnice','Earrings'), L('Na modelke','On model'), '7', 'preset_biele.atn', L('Základ · Model','Base · Model')], go:'protokol'},
            {c:[L('Retiazka','Chain'), L('Voľne položená','Laid flat'), '5', 'silver_cool.cube', L('Základ · Kov','Base · Metal')], go:'protokol'},
            {c:[L('Retiazka','Chain'), L('Makro','Macro'), '5', 'silver_cool.cube', L('Základ · Kov','Base · Metal')], go:'protokol'},
            {c:[L('Retiazka','Chain'), L('Na modelke','On model'), '7', 'silver_cool.cube', L('Základ · Kov · Model','Base · Metal · Model')], go:'protokol'},
            {c:[L('Prívesok','Pendant'), L('Detailný záber','Detail shot'), '6', 'rose_gold.cube', L('Základ · Kov','Base · Metal')], go:'protokol'},
            {c:[L('Prívesok','Pendant'), L('Makro','Macro'), '5', 'rose_gold.cube', L('Základ · Kov','Base · Metal')], go:'protokol'},
            {c:[L('Prívesok','Pendant'), L('Sada (pár)','Set (pair)'), '6', 'rose_gold.cube', L('Základ · Kov','Base · Metal')], go:'protokol'},
            {c:[L('Sada','Set'), L('Sada (pár)','Set (pair)'), '7', 'preset_biele.atn', L('Základ','Base')], go:'protokol'},
            {c:[L('Sada','Set'), L('Na modelke','On model'), '8', 'preset_biele.atn', L('Základ · Model','Base · Model')], go:'protokol'},
            {c:[L('Sada','Set'), L('Detailný záber','Detail shot'), '6', 'preset_biele.atn', L('Základ','Base')], go:'protokol'},
            {c:[L('Prsteň','Ring'), L('Sada (pár)','Set (pair)'), '6', 'stone_clear.atn', L('Základ · Kov · Kameň','Base · Metal · Stone')], go:'protokol'},
            {c:[L('Náramok','Bracelet'), L('Voľne položená','Laid flat'), '4', 'silver_cool.cube', L('Základ · Kov','Base · Metal')], go:'protokol'},
            {c:[L('Prívesok','Pendant'), L('Na modelke','On model'), '7', 'rose_gold.cube', L('Základ · Kov · Model','Base · Metal · Model')], go:'protokol'}
          ],
          note:L('Reálny seed má cca 18 protokolov — táto matica so 22 riadkami rozširuje ukážku o ďalšie kombinácie na ilustráciu princípu dedičnosti (platina/kameň v receptoch je príkladová).','The real seed has about 18 protocols — this 22-row matrix extends the example with more combinations to illustrate the inheritance principle (platinum/stone in recipes is illustrative).'), page:true},
        {t:'list', title:L('Typy receptov','Recipe types'), items:[
          {title:'.atn (Photoshop Action)', sub:L('nahraná sekvencia krokov','recorded step sequence')},
          {title:'LUT (.cube)', sub:L('farebná korekcia kovu/pozadia','metal/background color correction')},
          {title:L('Preset','Preset'), sub:L('nastavenie nástroja s pevnými hodnotami','tool setting with fixed values')}
        ]},
        {t:'note', text:L('Materiál (kov, kameň) riadi protokol aj AI predspracovanie — spoločné kroky sa vďaka dedičnosti neduplikujú.','Material (metal, stone) drives both the protocol and AI preprocessing — shared steps are not duplicated thanks to inheritance.')}
      ],
      ai:[
        {q:L('Koľko protokolov je v systéme?','How many protocols are in the system?'), a:L('Reálny seed má cca 18 protokolov; matica na tejto obrazovke ukazuje 22 kombinácií typ šperku × typ záberu vrátane princípu dedičnosti.','The real seed has about 18 protocols; the matrix on this screen shows 22 jewel-type × shot-type combinations including the inheritance principle.'), cite:'pamäť', act:null},
        {q:L('Ako funguje dedičnosť krokov?','How does step inheritance work?'), a:L('Kroky zo Základu a Kovu sa dedia do konkrétnych kombinácií (napr. Prsteň/Detail dedí zo Základ · Kov) — spoločné kroky sa nezadávajú duplicitne.','Steps from Base and Metal are inherited into specific combinations (e.g. Ring/Detail inherits from Base · Metal) — shared steps are not entered twice.'), cite:'appka', act:{l:L('Otvoriť detail protokolu','Open protocol detail'), k:'open'}},
        {q:L('Aký recept používa Náušnice / Sada (pár)?','What recipe does Earrings / Set (pair) use?'), a:L('preset_biele.atn, dedí len zo Základu (bez kovovej LUT, keďže záber je sada bez dôrazu na farbu kovu).','preset_biele.atn, inherits only from Base (no metal LUT, since the shot is a set without emphasis on metal color).'), cite:'appka', act:null}
      ]
    },
    {
      key:'protokol', icon:'book',
      title:L('Detail protokolu','Protocol detail'),
      sub:L('Prsteň / Detailný záber — kroky, recepty, dedičnosť','Ring / Detail shot — steps, recipes, inheritance'),
      blocks:[
        {t:'cards', n:2, items:[
          {title:L('Protokol','Protocol'), sub:L('Prsteň / Detailný záber','Ring / Detail shot'), lines:[[L('Dedí z','Inherits from'), L('Základ · Kov','Base · Metal')],[L('Materiál','Material'), L('zlato 585 (variabilné podľa SKU)','gold 585 (variable per SKU)')]]},
          {title:L('Recepty','Recipes'), sub:L('priradené k tomuto protokolu','assigned to this protocol'), lines:[['LUT', 'gold_warm.cube'],['.atn', 'preset_biele.atn']]}
        ]},
        {t:'table', title:L('Kroky protokolu (6)','Protocol steps (6)'),
          cols:[L('Krok','Step'), L('Nástroj','Tool'), L('Hodnota','Value'), L('Recept','Recipe'), L('Dedený z','Inherited from')],
          rows:[
            {c:[L('1. Orezanie a rovnanie','1. Crop & straighten'), L('Crop','Crop'), '1:1', '—', L('Základ','Base')]},
            {c:[L('2. Odstránenie prachu (AI)','2. Dust removal (AI)'), L('AI job','AI job'), L('automaticky','automatic'), '—', L('Základ','Base')]},
            {c:[L('3. Biele pozadie','3. White background'), L('Levels/Curves','Levels/Curves'), '#FFFFFF', 'preset_biele.atn', L('Základ','Base')]},
            {c:[L('4. Farebná korekcia zlata','4. Gold color correction'), 'LUT', 'gold_warm.cube', 'gold_warm.cube', L('Kov','Metal')]},
            {c:[L('5. Doostrenie','5. Sharpening'), L('Unsharp mask','Unsharp mask'), '120/0.5/0', '—', L('Prsteň / Detailný záber','Ring / Detail shot')]},
            {c:[L('6. Kontrola rozmeru pred exportom','6. Size check before export'), L('Automaticky','Automatic'), '2000×2000', '—', L('Základ','Base')]}
          ],
          note:L('Kroky 1–3 a 6 sa dedia zo Základu, krok 4 z vrstvy Kov, iba krok 5 (doostrenie) je špecifický pre kombináciu Prsteň/Detailný záber.','Steps 1–3 and 6 are inherited from Base, step 4 from the Metal layer, only step 5 (sharpening) is specific to the Ring/Detail shot combination.')},
        {t:'timeline', title:L('Vrstvy dedičnosti','Inheritance layers'), items:[
          [L('Základ','Base'), L('Orezanie, biele pozadie, kontrola rozmeru — spoločné pre všetky protokoly','Crop, white background, size check — shared across all protocols')],
          [L('Kov (zlato)','Metal (gold)'), L('Farebná korekcia LUT gold_warm.cube — spoločná pre všetky zlaté produkty','LUT gold_warm.cube color correction — shared across all gold products')],
          [L('Prsteň / Detailný záber','Ring / Detail shot'), L('Doostrenie 120/0.5/0 — špecifické pre túto kombináciu','Sharpening 120/0.5/0 — specific to this combination')]
        ]},
        {t:'note', text:L('Dedičnosť znamená, že zmena v Základe alebo v Kove sa prejaví vo všetkých protokoloch, ktoré z nej dedia — bez ručnej úpravy každého protokolu zvlášť.','Inheritance means a change in Base or Metal propagates to every protocol that inherits from it — without manually editing each protocol separately.')}
      ],
      ai:[
        {q:L('Ktoré kroky sú zdedené a ktoré špecifické?','Which steps are inherited and which are specific?'), a:L('Kroky 1, 2, 3 a 6 sa dedia zo Základu, krok 4 z vrstvy Kov, iba krok 5 (doostrenie) je vlastný tomuto protokolu.','Steps 1, 2, 3 and 6 are inherited from Base, step 4 from the Metal layer, only step 5 (sharpening) belongs to this protocol.'), cite:'appka', act:null},
        {q:L('Čo sa stane, ak sa zmení recept v Kove?','What happens if the recipe in Metal changes?'), a:L('Zmena gold_warm.cube vo vrstve Kov sa prejaví vo všetkých protokoloch pre zlaté produkty, ktoré z nej dedia — bez potreby upravovať každý zvlášť.','A change to gold_warm.cube in the Metal layer propagates to all gold-product protocols that inherit from it — no need to edit each one separately.'), cite:'appka', act:null},
        {q:L('Aké recepty tento protokol používa?','What recipes does this protocol use?'), a:L('LUT gold_warm.cube na farebnú korekciu a .atn preset_biele.atn na biele pozadie.','LUT gold_warm.cube for color correction and .atn preset_biele.atn for the white background.'), cite:'appka', act:null}
      ]
    },
    {
      key:'kontrola', icon:'shield',
      title:L('Kontrola (QA)','Review (QA)'),
      sub:L('Schválená/zamietnutá s anotáciou a kategóriou chyby, adaptívna miera kontroly, rework','Approved/rejected with annotation and error category, adaptive review rate, rework'),
      blocks:[
        {t:'kpis', items:[
          {l:L('Schválené dnes','Approved today'), v:int(14), tone:'ok'},
          {l:L('Zamietnuté dnes','Rejected today'), v:int(3), tone:'cond'},
          {l:L('Miera kontroly','Review sampling rate'), v:'100 %', sub:L('adaptívne podľa retušéra','adaptive per retoucher'), tone:null}
        ]},
        {t:'table', title:L('Kategórie chýb (zamietnutia)','Error categories (rejections)'),
          cols:[L('Kategória','Category'), L('Počet','Count'), L('Príklad','Example')],
          rows:[
            {c:[L('Farba pozadia','Background color'), int(2), L('mimo toleranciu #FFFFFF','outside the #FFFFFF tolerance')]},
            {c:[L('Prach / škvrny','Dust / spots'), int(1), L('viditeľné po AI čistení','visible after AI cleanup')]},
            {c:[L('Rozmer / orezanie','Size / crop'), int(0), '—']},
            {c:[L('Ostrenie','Sharpening'), int(0), '—']},
            {c:[L('Farebná korekcia kovu','Metal color correction'), int(0), '—']}
          ],
          note:L('Ukážkové kategórie a počty — kategorizácia chýb v QA je reálna, konkrétne čísla ilustrujú jeden deň.','Illustrative categories and counts — the QA error categorization is real, the specific numbers illustrate one day.')},
        {t:'table', title:L('Adaptívna miera kontroly podľa retušéra','Adaptive review rate by retoucher'),
          cols:[L('Retušér','Retoucher'), L('Chybovosť (30 dní)','Error rate (30 days)'), L('Miera kontroly','Review rate'), L('Trend','Trend')],
          rows:[
            {c:[L('Retušér 1','Retoucher 1'), '3 %', '50 %', '↓']},
            {c:[L('Retušér 2','Retoucher 2'), '9 %', '100 %', '→']},
            {c:[L('Retušér 3','Retoucher 3'), L('nový — dáta sa zbierajú','new — data being collected'), '100 %', '—']}
          ],
          note:L('Ukážkové hodnoty — princíp (nižšia dlhodobá chybovosť znižuje % kontrolovaných vzoriek) je reálny.','Illustrative values — the principle (a lower long-term error rate lowers the % of samples reviewed) is real.')},
        {t:'list', title:L('Posledné rozhodnutia kontrolóra','Recent reviewer decisions'), items:[
          {title:'SKU-1020', sub:L('Zamietnuté — kategória: farba pozadia, anotácia priamo vo fotke','Rejected — category: background color, annotated on the photo'), badge:['no',L('Zamietnutá','Rejected')], meta:'10:02'},
          {title:'SKU-1018', sub:L('Schválené','Approved'), badge:['ok',L('Schválená','Approved')], meta:'09:47'},
          {title:'SKU-1015', sub:L('Schválené — export pripravený','Approved — export ready'), badge:['ok',L('Schválená','Approved')], meta:'09:30'}
        ]},
        {t:'note', text:L('Adaptívna miera kontroly znižuje % kontrolovaných vzoriek pri retušéroch s dlhodobo nízkou chybovosťou; zamietnutie vždy nesie anotáciu v obrázku (canvas) a kategóriu chyby.','The adaptive sampling rate lowers the reviewed sample percentage for retouchers with a consistently low error rate; a rejection always carries an in-image annotation (canvas) and an error category.')}
      ],
      ai:[
        {q:L('Aký je pomer schválených a zamietnutých dnes?','What is today\'s approve/reject ratio?'), a:L('14 schválených, 3 zamietnuté — miera kontroly je zatiaľ 100 %, adaptívne sa zníži len pri dlhodobo nízkej chybovosti.','14 approved, 3 rejected — the review rate is currently 100%, it only drops adaptively with a consistently low error rate.'), cite:'appka', act:null},
        {q:L('Ktorý retušér má najnižšiu mieru kontroly?','Which retoucher has the lowest review rate?'), a:L('Retušér 1 s chybovosťou 3 % za 30 dní má mieru kontroly zníženú na 50 %, ostatní zostávajú na 100 %.','Retoucher 1, with a 3% error rate over 30 days, has the review rate lowered to 50%, others remain at 100%.'), cite:'ukážka', act:null},
        {q:L('Čo sa deje po zamietnutí fotky?','What happens after a photo is rejected?'), a:L('Fotka dostane anotáciu priamo v obrázku a kategóriu chyby, vráti sa do stavu V retuši na rework.','The photo receives an in-image annotation and an error category, and returns to the In retouch state for rework.'), cite:'appka', act:{l:L('Otvoriť fotku','Open photo'), k:'open'}}
      ]
    },
    {
      key:'chyby', icon:'warn',
      title:L('Chyby','Errors'),
      sub:L('Štatistika kategórií chýb za 12 týždňov','Error category statistics over 12 weeks'),
      blocks:[
        {t:'kpis', items:[
          {l:L('Zamietnutí za 12 týždňov','Rejections over 12 weeks'), v:int(41), tone:null},
          {l:L('Najčastejšia kategória','Most frequent category'), v:L('Farba pozadia','Background color'), tone:'cond'},
          {l:L('Trend voči predošlým 12 týž.','Trend vs. prior 12 weeks'), v:'−18 %', tone:'ok'}
        ]},
        {t:'stack', title:L('Zamietnutia podľa kategórie (12 ISO týždňov)','Rejections by category (12 ISO weeks)'),
          labels:['W21','W22','W23','W24','W25','W26','W27','W28','W29','W30','W31','W32'],
          series:[
            {l:L('Farba pozadia','Background color'), tone:'var(--no)', v:[3,2,3,2,1,2,1,2,1,2,2,2]},
            {l:L('Prach / škvrny','Dust / spots'), tone:'var(--cond)', v:[2,1,2,1,2,1,1,1,0,1,1,1]},
            {l:L('Rozmer / orezanie','Size / crop'), tone:'var(--info)', v:[1,1,0,1,0,1,0,0,1,0,0,0]},
            {l:L('Ostrenie','Sharpening'), tone:'var(--acc)', v:[1,0,1,0,1,0,1,0,0,1,0,0]}
          ],
          note:L('Ukážkový 12-týždňový trend — kategorizácia chýb v QA je reálna, konkrétne týždenné počty ilustrujú pokles po zavedení adaptívnej kontroly.','Illustrative 12-week trend — the QA error categorization is real, the specific weekly counts illustrate a decline after adaptive review was introduced.')},
        {t:'table', title:L('Súhrn kategórií za 12 týždňov','Category summary over 12 weeks'),
          cols:[L('Kategória','Category'), L('Počet spolu','Total count'), L('Podiel','Share'), L('Trend','Trend')],
          rows:[
            {c:[L('Farba pozadia','Background color'), int(23), pc(56), '↓']},
            {c:[L('Prach / škvrny','Dust / spots'), int(14), pc(34), '↓']},
            {c:[L('Rozmer / orezanie','Size / crop'), int(5), pc(12), '→']},
            {c:[L('Ostrenie','Sharpening'), int(5), pc(12), '→']}
          ],
          note:L('Ukážkový súhrn — presné pomery sa upresnia po dlhšom prevádzkovom behu appky.','Illustrative summary — exact ratios will firm up after a longer operational run of the app.')},
        {t:'note', text:L('Farba pozadia mimo #FFFFFF a viditeľný prach po AI kroku sú dlhodobo najčastejšie kategórie — obe majú etalóny a zlé príklady v Knižnici.','Background color off #FFFFFF and visible dust after the AI step are consistently the most frequent categories — both have references and bad examples in the Library.')}
      ],
      ai:[
        {q:L('Ktorá kategória chýb je najčastejšia?','Which error category is most frequent?'), a:L('Farba pozadia — 23 zamietnutí za 12 týždňov (56 % zo všetkých), nasleduje prach/škvrny s 14 (34 %).','Background color — 23 rejections over 12 weeks (56% of all), followed by dust/spots with 14 (34%).'), cite:'appka', act:null},
        {q:L('Klesá alebo rastie počet chýb?','Is the error count falling or rising?'), a:L('Klesá — trend −18 % voči predošlým 12 týždňom, čo sa pripisuje adaptívnej miere kontroly a knižnici zlých príkladov.','It\'s falling — a −18% trend vs. the prior 12 weeks, attributed to the adaptive review rate and the library of bad examples.'), cite:'ukážka', act:null},
        {q:L('Kde nájdem príklady tejto chyby?','Where can I find examples of this error?'), a:L('V Knižnici sú zlé príklady vrátane farby pozadia mimo #FFFFFF a viditeľného prachu po AI kroku.','The Library has bad examples including background color off #FFFFFF and visible dust after the AI step.'), cite:'appka', act:{l:L('Otvoriť knižnicu','Open library'), k:'open'}}
      ]
    },
    {
      key:'kniznica', icon:'grid',
      title:L('Knižnica','Library'),
      sub:L('Etalóny, zlé príklady, playbook, cheat-sheet','Reference standards, bad examples, playbook, cheat-sheet'),
      blocks:[
        {t:'gallery', title:L('Etalóny podľa typu šperku','Reference standards by jewel type'), items:[
          {t:L('Prsteň','Ring'), n:12, qa:12},
          {t:L('Náramok','Bracelet'), n:9, qa:9},
          {t:L('Náušnice','Earrings'), n:10, qa:10},
          {t:L('Retiazka','Chain'), n:7, qa:7}
        ], note:L('Ukážkové počty etalónov — princíp transparentnej knižnice je reálny.','Illustrative reference counts — the transparent-library principle is real.')},
        {t:'list', title:L('Zlé príklady (čo nerobiť)','Bad examples (what not to do)'), items:[
          {title:L('Farba pozadia mimo #FFFFFF','Background color off #FFFFFF'), sub:L('typická chyba pri manuálnom podexponovaní','common mistake with manual underexposure')},
          {title:L('Viditeľný prach po AI kroku','Visible dust after the AI step'), sub:L('kontrola vyžaduje 100% zväčšenie','review requires 100% zoom')}
        ]},
        {t:'cards', n:2, items:[
          {title:L('Playbook','Playbook'), sub:L('know-how naprieč typmi šperkov a záberov','know-how across jewel and shot types'), chips:[L('kov','metal'), L('kameň','stone'), L('svetlo','light')]},
          {title:L('Cheat-sheet','Cheat sheet'), sub:L('rýchla referencia hodnôt nástrojov','quick reference for tool values'), chips:['LUT', '.atn', L('Preset','Preset')]}
        ]},
        {t:'note', text:L('Knižnica je transparentná pre celý tím — etalóny a zlé príklady slúžia ako spoločný referenčný bod pri zaškolení aj kontrole.','The library is transparent to the whole team — references and bad examples serve as a shared benchmark for onboarding and review.')}
      ],
      ai:[
        {q:L('Koľko etalónov je v knižnici?','How many reference standards are in the library?'), a:L('Spolu 38 etalónov naprieč štyrmi typmi šperkov (prsteň 12, náramok 9, náušnice 10, retiazka 7) — ukážkové počty.','38 references in total across four jewel types (ring 12, bracelet 9, earrings 10, chain 7) — illustrative counts.'), cite:'ukážka', act:null},
        {q:L('Kde nájdem zlé príklady na zaškolenie?','Where can I find bad examples for onboarding?'), a:L('V zozname zlých príkladov — farba pozadia mimo #FFFFFF a viditeľný prach po AI kroku, oba s vysvetlením príčiny.','In the bad examples list — background color off #FFFFFF and visible dust after the AI step, both with an explanation of the cause.'), cite:'appka', act:null},
        {q:L('Čo obsahuje cheat-sheet?','What does the cheat sheet contain?'), a:L('Rýchlu referenciu hodnôt nástrojov naprieč typmi receptov — LUT, .atn a preset.','A quick reference for tool values across recipe types — LUT, .atn and preset.'), cite:'appka', act:null}
      ]
    },
    {
      key:'export', icon:'inbox',
      title:L('Export','Export'),
      sub:L('Presety 2000×2000 + odvodeniny + IG, názvy SKU_typ_poradie.jpg, ZIP/OneDrive, blokujúce štandardy','2000×2000 presets + derivatives + IG, SKU_type_order.jpg naming, ZIP/OneDrive, blocking standards'),
      blocks:[
        {t:'kpis', items:[
          {l:L('Exportovaných fotiek dnes','Photos exported today'), v:int(18), tone:null},
          {l:L('Blokované štandardom','Blocked by standard'), v:int(1), tone:'no'},
          {l:L('Formát','Format'), v:'JPEG q90 · sRGB', tone:null}
        ]},
        {t:'table', title:L('Export presety','Export presets'),
          cols:[L('Preset','Preset'), L('Rozmer','Size'), L('Použitie','Use')],
          rows:[
            {c:[L('Hlavný','Primary'), '2000×2000', L('e-shop katalóg','e-shop catalog')]},
            {c:[L('Odvodenina — malá','Derivative — small'), '800×800', L('náhľady/miniatúry','thumbnails')]},
            {c:['Instagram', '1080×1080', L('sociálne siete','social media')]}
          ]},
        {t:'list', title:L('Kanály exportu','Export channels'), items:[
          {title:'ZIP', sub:L('balík na stiahnutie','downloadable package')},
          {title:'OneDrive', sub:L('priamy upload do zdieľaného priečinka','direct upload to a shared folder')},
          {title:'Instagram', sub:L('preset 1080×1080 pre sociálne siete','1080×1080 preset for social media')}
        ]},
        {t:'code', title:L('Konvencia názvov súborov','File naming convention'), lang:'text', text:'SKU_typ_poradie.jpg\n\ni.e. 10245_hlavny_1.jpg\n     10245_ig_1.jpg'},
        {t:'banner', tone:'cond', text:L('Blokujúce štandardy pred exportom: biele pozadie #FFFFFF, presné rozmery, JPEG q90, sRGB — export sa zastaví, ak fotka nevyhovuje.','Blocking standards before export: white background #FFFFFF, exact dimensions, JPEG q90, sRGB — export halts if a photo does not comply.')},
        {t:'note', text:L('Export smeruje do ZIP a/alebo priamo na OneDrive; napojenie na katalóg e-shopu zatiaľ nie je (ručne / Excel).','Export goes to a ZIP and/or directly to OneDrive; there is no e-shop catalog integration yet (manual / Excel).')}
      ],
      ai:[
        {q:L('Koľko fotiek sa dnes exportovalo?','How many photos were exported today?'), a:L('18 fotiek, 1 bola blokovaná štandardom (biele pozadie/presné rozmery/JPEG q90/sRGB) a export sa pre ňu zastavil.','18 photos, 1 was blocked by a standard (white background/exact dimensions/JPEG q90/sRGB) and the export halted for it.'), cite:'appka', act:null},
        {q:L('Aké presety sa exportujú?','What presets are exported?'), a:L('Hlavný 2000×2000 pre e-shop katalóg, odvodenina 800×800 na náhľady a Instagram preset 1080×1080.','Primary 2000×2000 for the e-shop catalog, an 800×800 derivative for thumbnails, and a 1080×1080 Instagram preset.'), cite:'appka', act:null},
        {q:L('Kam smeruje výstup exportu?','Where does the export output go?'), a:L('Do ZIP balíka a/alebo priamo na OneDrive — napojenie na katalóg e-shopu zatiaľ nie je, katalóg sa vedie ručne/cez Excel.','To a ZIP package and/or directly to OneDrive — there is no e-shop catalog integration yet, the catalog is maintained manually/via Excel.'), cite:'appka', act:{l:L('Exportovať','Export'), k:'export'}}
      ]
    },
    {
      key:'nastavenia', icon:'gear',
      title:L('Nastavenia','Settings'),
      sub:L('Individuálne účty a roly, blokujúce štandardy, integrácie, zálohy a build appky','Individual accounts and roles, blocking standards, integrations, backups and app build'),
      blocks:[
        {t:'form', title:L('Prihlásenie','Login'), fields:[
          {l:L('Model prihlásenia','Login model'), v:L('individuálne účty','individual accounts'), type:'text'},
          {l:'JWT', v:L('session token po prihlásení','session token after login'), type:'text'},
          {l:L('Roly','Roles'), v:L('Retušér · Kontrolór · Admin','Retoucher · Reviewer · Admin'), type:'text'}
        ], note:L('Retouch Studio používa individuálne účty (na rozdiel od Banner Studia so zdieľaným heslom) — každý retušér a kontrolór má vlastné prihlásenie.','Retouch Studio uses individual accounts (unlike Banner Studio\'s shared password) — each retoucher and reviewer has their own login.')},
        {t:'list', title:L('Používatelia (ukážka)','Users (example)'), items:[
          {title:L('Retušér 1','Retoucher 1'), sub:L('rola Retušér','role Retoucher'), badge:['ok',L('Aktívny','Active')]},
          {title:L('Retušér 2','Retoucher 2'), sub:L('rola Retušér','role Retoucher'), badge:['ok',L('Aktívny','Active')]},
          {title:L('Retušér 3','Retoucher 3'), sub:L('rola Retušér','role Retoucher'), badge:['ok',L('Aktívny','Active')]},
          {title:L('Kontrolór','Reviewer'), sub:L('rola Kontrolór','role Reviewer'), badge:['ok',L('Aktívny','Active')]},
          {title:'admin', sub:L('rola Admin','role Admin'), badge:['ok',L('Aktívny','Active')]}
        ]},
        {t:'table', title:L('Blokujúce štandardy','Blocking standards'),
          cols:[L('Štandard','Standard'), L('Hodnota','Value'), L('Vynútenie','Enforcement')],
          rows:[
            {c:[L('Farba pozadia','Background color'), '#FFFFFF', ['no', L('Blokujúce','Blocking')]]},
            {c:[L('Rozmer','Dimensions'), '2000×2000', ['no', L('Blokujúce','Blocking')]]},
            {c:[L('Formát a kvalita','Format & quality'), 'JPEG q90', ['no', L('Blokujúce','Blocking')]]},
            {c:[L('Farebný priestor','Color space'), 'sRGB', ['no', L('Blokujúce','Blocking')]]}
          ]},
        {t:'timeline', title:L('Dodávka appky','App delivery'), items:[
          [L('MVP postavené','MVP built'), L('21.7.2026 — sprintom 12 agentov, ~88 min, ~2 M tokenov, 0 chýb','21 Jul 2026 — 12-agent sprint, ~88 min, ~2M tokens, 0 defects')],
          [L('Testy','Tests'), L('node --test 25/25 zelené','node --test 25/25 green')],
          [L('Otvorené','Open'), L('docker compose overenie proti živej MariaDB, git init na baseline, voliteľná SMTP závislosť','docker compose verification against a live MariaDB, git init on the baseline, optional SMTP dependency')]
        ]},
        {t:'note', text:L('Kontajner retus-app beží na node:20-slim + libvips (podpora RAW/HEIC), port 8092. Katalóg šperkov sa vedie ručne/cez Excel, bez priameho napojenia na e-shop.','The retus-app container runs on node:20-slim + libvips (RAW/HEIC support), port 8092. The jewelry catalog is maintained manually/via Excel, with no direct e-shop integration.')}
      ],
      ai:[
        {q:L('Aké roly appka rozlišuje?','What roles does the app distinguish?'), a:L('Retušér, Kontrolór a Admin, každý s individuálnym účtom (na rozdiel od Banner Studia, ktoré má jedno zdieľané heslo).','Retoucher, Reviewer and Admin, each with an individual account (unlike Banner Studio, which uses one shared password).'), cite:'pamäť', act:null},
        {q:L('Aké štandardy sú blokujúce pred exportom?','Which standards are blocking before export?'), a:L('Biele pozadie #FFFFFF, presný rozmer 2000×2000, formát JPEG q90 a farebný priestor sRGB — všetky 4 zastavia export, ak fotka nevyhovuje.','White background #FFFFFF, exact 2000×2000 dimensions, JPEG q90 format and sRGB color space — all 4 halt the export if a photo does not comply.'), cite:'appka', act:null},
        {q:L('Ako a kedy bolo MVP postavené?','How and when was the MVP built?'), a:L('21.7.2026, sprintom 12 agentov za približne 88 minút a ~2 milióny tokenov, s 25/25 zelenými testami a 0 chybami pri finálnom review.','On 21 Jul 2026, via a 12-agent sprint in about 88 minutes and ~2 million tokens, with 25/25 green tests and 0 defects at final review.'), cite:'pamäť', act:null}
      ]
    }
  ]
};
