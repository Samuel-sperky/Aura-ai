/* ══════════════════════════════════════════════════════════════
   W3 — dátová špecifikácia pre 2 appky, ktoré chýbajú v Aura Suite náhľade:
   Aura Banner Studio (8091) a Aura Retouch Studio (8092).
   Konvencie prevzaté z apps/aura-apps-hub.html: L()/cur()/int()/pc() a
   ikony z I existujú globálne, badge tóny ok/cond/no/info/q.
   Reálne fakty (porty, roly, workflow, štandardy, čísla) sú z Hades pamäte;
   všetko ostatné je označené v `note` ako ukážkové.
   ══════════════════════════════════════════════════════════════ */

const APP_BANNER = {
  key:'banner', name:'Aura Banner Studio', port:'8091', icon:'tag',
  tag:L('Samostatná appka pre render frontu, QA gates, exporty a AI providerov Banner Studia — časti, ktoré modul Marketing nezobrazuje.','A standalone app for Banner Studio\'s render queue, QA gates, exports and AI providers — the parts the Marketing module does not show.'),
  feat:[
    L('Render fronta job po jobe s retry a chybami (HTML/CSS → Playwright/Chromium → PNG → ZIP)','Job-by-job render queue with retries and errors (HTML/CSS → Playwright/Chromium → PNG → ZIP)'),
    L('QA hard gates vs soft rules s minor/major deviation a learning loop do KB','QA hard gates vs soft rules with minor/major deviation and a KB learning loop'),
    L('AI provider mock/openai/gemini s mesačným budget stropom a ZIP exportmi','AI provider mock/openai/gemini with a monthly budget cap and ZIP exports')
  ],
  screens:[
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
      ]
    },
    {
      key:'fronta', icon:'list',
      title:L('Render fronta','Render queue'),
      sub:L('Joby v pipeline: kampaň, rozmer, jazyk, stav, trvanie, chyba, retry','Pipeline jobs: campaign, size, language, status, duration, error, retry'),
      blocks:[
        {t:'kpis', items:[
          {l:L('Vo fronte','Queued'), v:int(12), tone:null},
          {l:L('Beží','Running'), v:int(3), tone:null},
          {l:L('Zlyhané (retry)','Failed (retry)'), v:int(2), tone:'no'},
          {l:L('Priemerné trvanie jobu','Avg job duration'), v:L('4,2 s','4.2 s'), tone:null}
        ]},
        {t:'table', title:L('Joby v render fronte','Jobs in the render queue'),
          cols:[L('Kampaň','Campaign'), L('Rozmer','Size'), L('Jazyk','Language'), L('Stav','Status'), L('Trvanie','Duration'), L('Chyba / retry','Error / retry')],
          rows:[
            {c:[L('Zlaté prstene','Gold rings'), '1080×1080', 'SK', ['info', L('Beží','Running')], '3,8 s', '—']},
            {c:[L('Zlaté prstene','Gold rings'), '1080×1350', 'DE', ['ok', L('Hotovo','Done')], '4,1 s', '—']},
            {c:[L('Svadobná sezóna','Wedding season'), '1200×628', 'EN', ['no', L('Zlyhal','Failed')], '—', L('timeout renderu · retry 2/3','render timeout · retry 2/3')]},
            {c:['Black Friday', '970×250', 'SK', ['q', L('Čaká','Queued')], '—', '—']},
            {c:['New Gem', '1080×1920', 'HU', ['ok', L('Hotovo','Done')], '3,9 s', '—']}
          ],
          note:L('Ukážkové položky fronty — konkrétne joby a časovanie ilustrujú priebeh, nie sú prevzaté z reálnych logov.','Illustrative queue items — the concrete jobs and timings show the flow, not pulled from real logs.')},
        {t:'timeline', title:L('História retry','Retry history'), items:[
          [L('Pred 2 min','2 min ago'), L('Svadobná sezóna 1200×628 EN — retry 2/3 po timeout renderu','Wedding season 1200×628 EN — retry 2/3 after render timeout')],
          [L('Pred 10 min','10 min ago'), L('Prvý pokus zlyhal — Chromium timeout 30 s','First attempt failed — Chromium timeout 30s')]
        ]}
      ]
    },
    {
      key:'qa', icon:'check',
      title:L('QA gates','QA gates'),
      sub:L('Hard gates vs soft rules, deviations minor/major, návrat na re-render','Hard gates vs soft rules, minor/major deviations, return to re-render'),
      blocks:[
        {t:'kpis', items:[
          {l:L('QA pass rate','QA pass rate'), v:'91 %', tone:'ok'},
          {l:L('Minor deviation','Minor deviation'), v:int(6), tone:'cond'},
          {l:L('Major deviation → re-render','Major deviation → re-render'), v:int(2), tone:'no'},
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
        {t:'list', title:L('Aktuálne deviations','Current deviations'), items:[
          {title:L('Svadobná sezóna — 1200×628 EN','Wedding season — 1200×628 EN'), sub:L('Major: tvar prsteňa nesedí s referenciou','Major: ring shape does not match the reference'), badge:['no',L('Major','Major')], meta:'12:40'},
          {title:L('Zlaté prstene — 970×250 HU','Gold rings — 970×250 HU'), sub:L('Minor: farba pozadia mimo palety sveta Quiet Luxury','Minor: background color outside the Quiet Luxury world palette'), badge:['cond',L('Minor','Minor')], meta:'11:05'}
        ]},
        {t:'note', text:L('Výsledky QA sa vracajú do znalostnej bázy (learning loop) — budúce generovania sa vyhýbajú opakovaným deviations.','QA results feed back into the knowledge base (learning loop) — future generations avoid repeat deviations.')}
      ]
    },
    {
      key:'exporty', icon:'doc',
      title:L('Exporty','Exports'),
      sub:L('ZIP balíky, obsah, veľkosť, kto stiahol, história','ZIP packages, contents, size, who downloaded, history'),
      blocks:[
        {t:'kpis', items:[
          {l:L('Exportov tento mesiac','Exports this month'), v:int(6), tone:null},
          {l:L('Celková veľkosť','Total size'), v:L('412 MB','412 MB'), tone:null},
          {l:L('Posledný export','Last export'), v:L('dnes 09:14','today 09:14'), tone:null}
        ]},
        {t:'table', title:L('História exportov','Export history'),
          cols:[L('Kampaň','Campaign'), L('Obsah','Contents'), L('Veľkosť','Size'), L('QA pred exportom','QA before export'), L('Stiahol','Downloaded by'), L('Kedy','When')],
          rows:[
            {c:['New Gem', L('40 PNG · 5 rozmerov · 8 jazykov','40 PNGs · 5 sizes · 8 languages'), '58 MB', pc(100), 'admin', L('včera 16:20','yesterday 16:20')]},
            {c:[L('Doprava zadarmo','Free shipping'), L('15 PNG · 3 jazyky','15 PNGs · 3 languages'), '21 MB', pc(100), 'admin', L('pred 4 dňami','4 days ago')]},
            {c:['Summer Sale', L('40 PNG · 5 rozmerov · 8 jazykov','40 PNGs · 5 sizes · 8 languages'), '55 MB', pc(91), 'admin', L('dnes 09:14','today 09:14')]}
          ],
          note:L('Ukážkové záznamy histórie — reálny export beží (Pipeline 1: render → PNG → ZIP), konkrétne veľkosti a časy sú ilustračné.','Illustrative history entries — the real export runs (Pipeline 1: render → PNG → ZIP); exact sizes and times are for illustration.')},
        {t:'note', text:L('Zálohový systém zatiaľ pokrýva len databázu aura_marketing — obrázkový volume (bannery-db aj vygenerované PNG) nemá zálohu.','The backup system currently covers only the aura_marketing database — the image volume (bannery-db and generated PNGs) has no backup.')},
        {t:'banner', tone:'cond', text:L('Appka beží lokálne bez GitHub repa — verzovanie a záloha kódu čakajú na push (gh nie je nainštalované).','The app runs locally without a GitHub repo — code versioning and backup are pending a push (gh is not installed).')}
      ]
    },
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
          note:L('Cena za obrázok je ukážková — reálne sadzby sa doplnia po nastavení API kľúčov (fáza 2, zatiaľ mock je default).','Price per image is illustrative — real rates will be added once API keys are set up (phase 2; mock is the default for now).')},
        {t:'form', title:L('Nastavenie providera','Provider settings'), fields:[
          {l:L('Provider','Provider'), v:'mock', type:'select', opts:['mock','openai','gemini']},
          {l:L('Budget strop','Budget cap'), v:'300 €', type:'select', opts:['100 €','200 €','300 €']},
          {l:L('API kľúče','API keys'), v:'', type:'text'},
          {l:L('Zastaviť pri prekročení stropu','Halt when cap is exceeded'), v:'', type:'switch', on:true}
        ], note:L('Default provider je mock; reálne kľúče (openai/gemini) zatiaľ nie sú doplnené.','Default provider is mock; real keys (openai/gemini) have not been added yet.')}
      ]
    },
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
        {t:'note', text:L('Audit log a GitHub remote (push kódu) sú otvorené položky — appka zatiaľ beží len lokálne s lokálnym gitom.','Audit log and a GitHub remote (code push) are open items — the app currently runs only locally with local git.')}
      ]
    }
  ]
};

const APP_RETUS = {
  key:'retus', name:'Aura Retouch Studio', port:'8092', icon:'image',
  tag:L('Samostatná appka pre tím retušérov: pracovná plocha pred/po, protokoly s dedičnosťou, QA kontrola a export podľa štandardov.','A standalone app for the retouch team: before/after workspace, inheritance-based protocols, QA review and export to standard.')  ,
  feat:[
    L('Workflow Nová → AI predspracovanie → V retuši → Na kontrole → Schválená/Zamietnutá → Export','Workflow New → AI preprocessing → In retouch → In review → Approved/Rejected → Export'),
    L('Protokoly ako matica typ šperku × typ záberu s dedičnosťou krokov','Protocols as a jewel type × shot type matrix with step inheritance'),
    L('Blokujúce štandardy: biele #FFFFFF, JPEG q90, sRGB, 2000×2000','Blocking standards: white #FFFFFF, JPEG q90, sRGB, 2000×2000')
  ],
  screens:[
    {
      key:'prehlad', icon:'gauge',
      title:L('Prehľad','Overview'),
      sub:L('Fronta práce, priepustnosť retušérov, QA, blokujúce štandardy','Work queue, retoucher throughput, QA, blocking standards'),
      blocks:[
        {t:'kpis', items:[
          {l:L('Fotky v retuši','Photos in retouch'), v:int(24), tone:null},
          {l:L('Na kontrole','In review'), v:int(9), tone:'cond'},
          {l:L('Zamietnuté (rework)','Rejected (rework)'), v:int(3), tone:'no'},
          {l:L('AI budget','AI budget'), v:L('mock','mock'), sub:L('reálne providery vo fáze 2','real providers in phase 2'), tone:null}
        ]},
        {t:'kanban', columns:[
          {l:L('Nová','New'), items:[{title:'SKU-1042', sub:L('náramok · makro','bracelet · macro'), badge:['q',L('Nová','New')]}]},
          {l:L('AI predspracovanie','AI preprocessing'), items:[{title:'SKU-1039', sub:L('pozadie + čistenie prachu','background + dust cleanup'), badge:['info',L('Job beží','Job running')]}]},
          {l:L('V retuši','In retouch'), items:[{title:'SKU-1031', sub:L('prsteň · detail','ring · detail'), badge:['cond',L('Rozpracované','In progress')]}]},
          {l:L('Na kontrole','In review'), items:[{title:'SKU-1028', sub:L('náušnice · sada','earrings · set'), badge:['info',L('Čaká na kontrolóra','Awaiting reviewer')]}]},
          {l:L('Schválená / Zamietnutá','Approved / Rejected'), items:[{title:'SKU-1020', sub:L('zamietnuté — kategória: farba pozadia','rejected — category: background color'), badge:['no',L('Zamietnutá','Rejected')]}]},
          {l:L('Export','Export'), items:[{title:'SKU-1015', sub:L('2000×2000 + odvodeniny + IG','2000×2000 + derivatives + IG'), badge:['ok',L('Hotovo','Done')]}]}
        ]},
        {t:'bars', title:L('Priepustnosť retušérov (fotky/deň)','Retoucher throughput (photos/day)'),
          data:[{l:L('Retušér 1','Retoucher 1'), v:14},{l:L('Retušér 2','Retoucher 2'), v:11},{l:L('Retušér 3','Retoucher 3'), v:9}]},
        {t:'table', title:L('Priepustnosť voči cieľu (14 fotiek/deň)','Throughput vs target (14 photos/day)'),
          cols:[L('Retušér','Retoucher'), L('Fotky/deň','Photos/day'), L('Plnenie cieľa','Target attainment')],
          rows:[
            {c:[L('Retušér 1','Retoucher 1'), int(14), {pln:100}]},
            {c:[L('Retušér 2','Retoucher 2'), int(11), {pln:79}]},
            {c:[L('Retušér 3','Retoucher 3'), int(9), {pln:64}]}
          ],
          note:L('Ukážkové čísla priepustnosti — ilustrujú rozdiely medzi retušérmi, nie sú z reálneho merania.','Illustrative throughput numbers — they show differences between retouchers, not a real measurement.')}
      ]
    },
    {
      key:'retus', icon:'swap',
      title:L('Pracovná plocha retuše','Retouch workspace'),
      sub:L('Fotka pred/po, kroky protokolu, nástroje a hodnoty, AI predspracovanie ako job','Before/after photo, protocol steps, tools and values, AI preprocessing as a job'),
      blocks:[
        {t:'cards', n:2, items:[
          {title:L('Pred','Before'), sub:'SKU-1031 · ' + 'prsteň', lines:[[L('Zdroj','Source'), L('RAW import','RAW import')],[L('Rozmer','Size'), '4000×3000']]},
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
        {t:'table', title:L('Matica protokolov (výber)','Protocol matrix (selection)'),
          cols:[L('Typ šperku','Jewel type'), L('Typ záberu','Shot type'), L('Kroky','Steps'), L('Recept','Recipe'), L('Dedí z','Inherits from')],
          rows:[
            {c:[L('Prsteň','Ring'), L('Detailný záber','Detail shot'), '6', 'gold_warm.cube', L('Základ · Kov','Base · Metal')]},
            {c:[L('Náramok','Bracelet'), L('Makro','Macro'), '5', 'silver_cool.cube', L('Základ · Kov','Base · Metal')]},
            {c:[L('Náušnice','Earrings'), L('Sada (pár)','Set (pair)'), '7', 'preset_biele.atn', L('Základ','Base')]},
            {c:[L('Retiazka','Chain'), L('Voľne položená','Laid flat'), '5', 'silver_cool.cube', L('Základ · Kov','Base · Metal')]}
          ],
          note:L('Matica a počty krokov sú ukážkové — reálny seed má cca 18 protokolov, konkrétne kombinácie len ilustrujú princíp dedičnosti.','The matrix and step counts are illustrative — the real seed has about 18 protocols; the specific combinations only illustrate the inheritance principle.')},
        {t:'list', title:L('Typy receptov','Recipe types'), items:[
          {title:'.atn (Photoshop Action)', sub:L('nahraná sekvencia krokov','recorded step sequence')},
          {title:'LUT (.cube)', sub:L('farebná korekcia kovu/pozadia','metal/background color correction')},
          {title:L('Preset','Preset'), sub:L('nastavenie nástroja s pevnými hodnotami','tool setting with fixed values')}
        ]},
        {t:'note', text:L('Materiál (kov, kameň) riadi protokol aj AI predspracovanie — spoločné kroky sa vďaka dedičnosti neduplikujú.','Material (metal, stone) drives both the protocol and AI preprocessing — shared steps are not duplicated thanks to inheritance.')}
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
            {c:[L('Rozmer / orezanie','Size / crop'), int(0), '—']}
          ],
          note:L('Ukážkové kategórie a počty — kategorizácia chýb v QA je reálna, konkrétne čísla ilustrujú jeden deň.','Illustrative categories and counts — the QA error categorization is real, the specific numbers illustrate one day.')},
        {t:'list', title:L('Posledné rozhodnutia kontrolóra','Recent reviewer decisions'), items:[
          {title:'SKU-1020', sub:L('Zamietnuté — kategória: farba pozadia, anotácia priamo vo fotke','Rejected — category: background color, annotated on the photo'), badge:['no',L('Zamietnutá','Rejected')], meta:'10:02'},
          {title:'SKU-1018', sub:L('Schválené','Approved'), badge:['ok',L('Schválená','Approved')], meta:'09:47'},
          {title:'SKU-1015', sub:L('Schválené — export pripravený','Approved — export ready'), badge:['ok',L('Schválená','Approved')], meta:'09:30'}
        ]},
        {t:'note', text:L('Adaptívna miera kontroly znižuje % kontrolovaných vzoriek pri retušéroch s dlhodobo nízkou chybovosťou; zamietnutie vždy nesie anotáciu v obrázku (canvas) a kategóriu chyby.','The adaptive sampling rate lowers the reviewed sample percentage for retouchers with a consistently low error rate; a rejection always carries an in-image annotation (canvas) and an error category.')}
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
        {t:'code', title:L('Konvencia názvov súborov','File naming convention'), lang:'text', text:'SKU_typ_poradie.jpg\n\ni.e. 10245_hlavny_1.jpg\n     10245_ig_1.jpg'},
        {t:'banner', tone:'cond', text:L('Blokujúce štandardy pred exportom: biele pozadie #FFFFFF, presné rozmery, JPEG q90, sRGB — export sa zastaví, ak fotka nevyhovuje.','Blocking standards before export: white background #FFFFFF, exact dimensions, JPEG q90, sRGB — export halts if a photo does not comply.')},
        {t:'note', text:L('Export smeruje do ZIP a/alebo priamo na OneDrive; napojenie na katalóg e-shopu zatiaľ nie je (ručne / Excel).','Export goes to a ZIP and/or directly to OneDrive; there is no e-shop catalog integration yet (manual / Excel).')}
      ]
    }
  ]
};

const W3_APPS = [ APP_BANNER, APP_RETUS ];
