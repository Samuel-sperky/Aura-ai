const W1_APP = {
  key:'mind', name:'Aura AI', port:'8082', icon:'brain',
  tag:L('AI-mind — živá neurónová sieť skills, spomienok a projektov, ktorá sa učí z každého sedenia v Claude Code.','AI-mind — a living neural network of skills, memories and projects that learns from every Claude Code session.'),
  feat:[
    L('Radiálna mapa mysle s jadrom, oblasťami, oddeleniami a uzlami','Radial mind map with a core, areas, departments and nodes'),
    L('Lokálny LLM router a embeddings s meraným hit@5 a MRR','Local LLM router and embeddings with measured hit@5 and MRR'),
    L('MCP nástroje mind_recall / learn / activate / decision / overview pre Claude Code','MCP tools mind_recall / learn / activate / decision / overview for Claude Code')
  ],
  screens:[

    {
      key:'dnes', icon:'home',
      title:L('Dnes','Today'),
      sub:L('Čo sa mind naučil dnes, čerstvé uzly a čo čaká na potvrdenie.','What the mind learned today, fresh nodes, and what is waiting for confirmation.'),
      blocks:[
        {t:'kpis', items:[
          {l:L('Nové uzly dnes','New nodes today'), v:int(7), sub:L('memory + skill','memory + skill'), tone:null},
          {l:L('Presnosť routera','Router accuracy'), v:'95,3 %', sub:L('baseline vlna 0, 41/43 · overené 31.7.2026','wave-0 baseline, 41/43 · verified 31 Jul 2026'), tone:'ok'},
          {l:L('Čaká na potvrdenie','Awaiting confirmation'), v:int(3), sub:L('certainty nenastavená','certainty not set'), tone:'cond'},
          {l:L('Aktívne sedenia','Active sessions'), v:int(1), sub:L('tento týždeň','this week'), tone:null}
        ]},
        {t:'lines', title:L('Nové uzly za posledný týždeň','New nodes over the last week'),
          labels:['Po','Ut','St','Št','Pi','So','Ne'],
          series:[{l:L('Nové uzly','New nodes'), v:[2,4,1,7,3,0,1], color:'var(--teal)'}],
          avg:false, note:L('Ukážkové denné počty.','Illustrative daily counts.')},
        {t:'list', title:L('Čerstvo aktivované uzly','Freshly activated nodes'), items:[
          {title:L('AuraAI (refactor Hadesa)','AuraAI (Hades refactor)'), sub:L('projekt · Aplikácie','project · Applications'), badge:['ok',L('overené','verified')], meta:'09:14'},
          {title:L('Cloudflare Tunnel pre Docker appky','Cloudflare Tunnel for Docker apps'), sub:L('skill · pasca zdokumentovaná','skill · documented pitfall'), badge:['cond',L('pasca','pitfall')], meta:'09:41'},
          {title:L('AuraAI screenshot matrix (Playwright)','AuraAI screenshot matrix (Playwright)'), sub:L('skill · 40/40 záberov overené','skill · 40/40 shots verified'), badge:['ok',L('overené','verified')], meta:'10:02'}
        ]},
        {t:'banner', tone:'cond', text:L('3 uzly majú certainty nenastavenú a čakajú na tvoje potvrdenie v Knižnici.','3 nodes have no certainty set and are waiting for your confirmation in the Library.')},
        {t:'note', text:L('Počty nových uzlov a sedení sú ukážkové. Presnosť routera 95,3 % je overená hodnota z baseline vlny 0 (31.7.2026).','New-node and session counts are illustrative. Router accuracy of 95.3% is a verified figure from the wave-0 baseline (31 Jul 2026).')}
      ]
    },

    {
      key:'dennik', icon:'cal',
      title:L('Denník','Journal'),
      sub:L('Chronologické záznamy sedení — dátum, téma, výsledok, súbory, technológie.','Chronological session records — date, topic, outcome, files, technologies.'),
      blocks:[
        {t:'table', title:null, cols:[L('Dátum','Date'),L('Téma','Topic'),L('Výsledok','Outcome'),L('Súbory','Files'),L('Technológie','Technologies')],
          rows:[
            {c:['4.8.2026', L('Verejná expozícia cez Cloudflare tunnel','Public exposure via Cloudflare tunnel'), ['ok',L('505 PHP testov zelených','505 PHP tests green')], 'docker-compose.yml, Caddyfile', 'Docker, Caddy, Cloudflare']},
            {c:['4.8.2026', L('Screenshot matica — 10 obrazoviek','Screenshot matrix — 10 screens'), ['ok',L('40/40 záberov','40/40 shots')], 'apps/build/shoot.mjs', 'Playwright']},
            {c:['31.7.2026', L('Radiálna mapa mysle — W1','Radial mind map — W1'), ['ok',L('393/393 testov pred konfliktom','393/393 tests before the conflict')], 'graph/map/*.js, map.css', 'Canvas 2D, Vite']},
            {c:['31.7.2026', L('Eval batéria — baseline vlna 0','Eval battery — wave 0 baseline'), ['ok',L('router 95,3 %','router 95.3%')], 'vycvik/run_eval.py', 'Python, Ollama']},
            {c:['29.7.2026', L('Recon a 150 otázok pre refactor','Recon and 150 questions for the refactor'), ['cond',L('16/150 blokujúcich zodpovedaných','16/150 blocking questions answered')], '01-PLAN.md, 02-OTAZKY-150.md', 'Markdown']}
          ], note:L('Dátumy, výsledky testov a technológie sú overené zo záznamov session. Výber nie je úplný zoznam všetkých sedení.','Dates, test outcomes and technologies are verified from session records. This is a selection, not the full list of sessions.')},
        {t:'timeline', title:L('Posledné dni','Recent days'), items:[
          [L('4.8.2026','4 Aug 2026'), L('Tunel spustený, appka je verejne dostupná za basic-auth','Tunnel launched, the app is publicly reachable behind basic-auth')],
          [L('31.7.2026','31 Jul 2026'), L('W1 mapa a eval batéria dokončené v ten istý deň','W1 map and eval battery completed on the same day')],
          [L('29.7.2026','29 Jul 2026'), L('Recon dvoma agentmi, kontrakt sa pripravuje','Recon by two agents, contract in preparation')]
        ]},
        {t:'note', text:L('Zdroj je pamäť mysle (mind_recall) — appka by mala denník viesť priebežne, nie rekonštruovať spätne.','The source is mind memory (mind_recall) — in the real app the journal should be kept continuously, not reconstructed after the fact.')}
      ]
    },

    {
      key:'kniznica', icon:'list',
      title:L('Knižnica','Library'),
      sub:L('Skills a playbooky s certainty, silou a oblasťou.','Skills and playbooks with certainty, strength and area.'),
      blocks:[
        {t:'kpis', items:[
          {l:L('Skills overené','Verified skills'), v:int(9), tone:'ok'},
          {l:L('Pasce zdokumentované','Documented pitfalls'), v:int(2), tone:'cond'},
          {l:L('Bez certainty','No certainty set'), v:int(4), tone:null}
        ]},
        {t:'donut', title:L('Rozdelenie certainty','Certainty split'), pct:60, label:L('skills s certainty overené','skills with certainty verified')},
        {t:'cards', n:3, items:[
          {title:'AuraAI LLM eval batéria', sub:L('Vývoj & kód · Backend','Development & code · Backend'), badge:['ok',L('overené','verified')], lines:[[L('Sila','Strength'),'1'],[L('Router','Router'),'95,3 %']], chips:['qwen3:4b','bge-m3','recall']},
          {title:'Cloudflare Tunnel pre Docker appky', sub:L('Marketing & SEO · DevOps','Marketing & SEO · DevOps'), badge:['cond',L('pasca','pitfall')], lines:[[L('Sila','Strength'),'2'],[L('Pascí zdokumentovaných','Pitfalls documented'),'6']], chips:['cloudflared','caddy','docker']},
          {title:'Docker Compose', sub:L('Vývoj & kód · DevOps','Development & code · DevOps'), badge:['q',L('bez certainty','no certainty')], lines:[[L('Sila','Strength'),'11']], chips:[L('compose','compose'),L('volumes','volumes'),L('siete','networks')]}
        ]},
        {t:'table', title:L('Ďalšie skills','More skills'), cols:[L('Skill','Skill'),L('Oblasť','Area'),L('Sila','Strength'),L('Certainty','Certainty')],
          rows:[
            {c:['MCP server development', L('Vývoj & kód · Backend','Development & code · Backend'), int(8), ['q',L('bez certainty','no certainty')]]},
            {c:['Similarity-based graph prewiring', L('Vývoj & kód · Backend','Development & code · Backend'), int(2), ['q',L('bez certainty','no certainty')]]},
            {c:['Tombstone pattern for idempotent sync', L('Vývoj & kód · Backend','Development & code · Backend'), int(2), ['q',L('bez certainty','no certainty')]]},
            {c:['Rozhodovanie + delegovanie', L('Osobné & preferencie · Produktivita','Personal & preferences · Productivity'), int(7), ['q',L('bez certainty','no certainty')]]}
          ]},
        {t:'note', text:L('Názvy skills, ich sila a certainty sú prevzaté zo záznamov mysle. Rozdelenie „overené / bez certainty" v KPI a donute je ilustratívny súčet, nie presné číslo z databázy.','Skill names, strength and certainty are taken from mind records. The "verified / no certainty" split in the KPIs and donut is an illustrative rollup, not an exact database count.')}
      ]
    },

    {
      key:'mapa', icon:'grid',
      title:L('Mapa siete','Network map'),
      sub:L('Graf uzlov a spojení mysle — jadro, oblasti, oddelenia, uzly.','Node and connection graph of the mind — core, areas, departments, nodes.'),
      blocks:[
        {t:'graph', title:L('Radiálna mapa: jadro → oblasť → oddelenie → uzol','Radial map: core → area → department → node'),
          nodes:[
            {l:'HADES', k:'core', s:9, x:50, y:50},
            {l:'Vývoj & kód', k:'project', s:9, x:50, y:14},
            {l:'Biznis & projekty', k:'project', s:7, x:84, y:30},
            {l:'Marketing & SEO', k:'project', s:6, x:86, y:70},
            {l:'Osobné & preferencie', k:'project', s:5, x:50, y:88},
            {l:'Dizajn & kreatíva', k:'project', s:4, x:16, y:70},
            {l:'AuraAI (refactor Hadesa)', k:'project', s:2, x:34, y:6},
            {l:'Aura KPI appka', k:'project', s:7, x:92, y:14},
            {l:'Aura Roadmap', k:'project', s:4, x:97, y:44},
            {l:'Docker Compose', k:'skill', s:11, x:24, y:22},
            {l:'MCP server development', k:'skill', s:8, x:18, y:36},
            {l:'AuraAI LLM eval batéria', k:'skill', s:1, x:64, y:4},
            {l:'Cloudflare Tunnel pre Docker appky', k:'skill', s:2, x:60, y:24},
            {l:'Similarity-based graph prewiring', k:'skill', s:2, x:12, y:50},
            {l:'Rozhodovanie + delegovanie', k:'skill', s:7, x:44, y:96},
            {l:'Organizácia práce', k:'skill', s:6, x:24, y:88},
            {l:'AI-mind (záznam)', k:'memory', s:1, x:8, y:20}
          ],
          edges:[[0,1],[0,2],[0,3],[0,4],[0,5],[1,6],[1,9],[1,10],[1,11],[1,12],[1,13],[1,16],[2,7],[2,8],[4,14],[4,15]],
          note:L('Pozície x/y a rozloženie sú ilustratívne pre náhľad; reálna appka ich generuje deterministickým radiálnym layoutom z /api/mind (prng.js + layout.js). Mená a typy uzlov projektov a skills sú prevzaté z pamäte.','Node x/y positions and the layout are illustrative for this preview; the real app generates them with a deterministic radial layout from /api/mind (prng.js + layout.js). The project and skill node names and types are taken from memory.')},
        {t:'kpis', items:[
          {l:L('Oblastí','Areas'), v:int(5), tone:null},
          {l:L('Oddelení','Departments'), v:int(72), sub:L('naprieč všetkými oblasťami · momentka 31.7.2026','across all areas · snapshot 31 Jul 2026'), tone:null},
          {l:L('Uzlov v sieti','Nodes in network'), v:int(731), sub:L('714 generovaných listov + 17 pomenovaných uzlov','714 generated leaves + 17 named nodes'), tone:null}
        ]},
        {t:'list', title:L('Legenda typov','Type legend'), items:[
          {title:L('Jadro','Core'), sub:L('zlaté sústredné kruhy — HADES','gold concentric circles — HADES'), badge:['info',L('core','core')]},
          {title:L('Projekt','Project'), sub:L('disk s vonkajším prstencom','disk with an outer ring'), badge:['info',L('projekt','project')]},
          {title:L('Skill','Skill'), sub:L('donut','donut shape'), badge:['info',L('skill','skill')]},
          {title:L('Spomienka','Memory'), sub:L('plný disk','solid disk'), badge:['info',L('memory','memory')]}
        ]},
        {t:'note', text:L('Farba vždy kóduje oblasť, tvar kóduje typ uzla — jeden sémantický kanál na vlastnosť, žiadne dekoratívne farby. Veľkosť uzla = sila (strength).','Color always encodes area, shape encodes node type — one semantic channel per property, no decorative colors. Node size = strength.')}
      ]
    },

    {
      key:'spomienky', icon:'inbox',
      title:L('Spomienky','Memories'),
      sub:L('Memory uzly, vyhľadávanie, väzby a zdroj — session alebo brain.','Memory nodes, search, links, and source — session or brain.'),
      blocks:[
        {t:'kpis', items:[
          {l:L('Spomienky spolu','Total memories'), v:int(214), sub:L('ukážkové','illustrative'), tone:null},
          {l:L('Zdroj: session','Source: session'), v:'87 %', sub:L('ukážkové','illustrative'), tone:null},
          {l:L('Zdroj: brain','Source: brain'), v:'13 %', sub:'~/.claude memory/*.md, MEMORY.md', tone:null}
        ]},
        {t:'list', title:L('Nedávno aktivované','Recently activated'), items:[
          {title:L('Potreboval by som vytvoriť neurál AI-mind…','I would need to build a literal neural AI-mind…'), sub:L('memory · Záznamy — AI-mind','memory · Records — AI-mind'), badge:['info',L('session','session')], meta:'2.8.2026'},
          {title:L('Na samostatnej branchi potrebujem, aby aura app…','On a separate branch I need the aura app to…'), sub:L('memory · Záznamy — Banner Generator','memory · Records — Banner Generator'), badge:['info',L('session','session')], meta:'3.8.2026'},
          {title:L('Rozhodovanie a delegovanie','Decision-making and delegation'), sub:L('skill · Produktivita','skill · Productivity'), badge:['q',L('brain','brain')], meta:'—'}
        ]},
        {t:'form', title:L('Vyhľadávanie v spomienkach','Search memories'), fields:[
          {l:L('Dopyt','Query'), v:'', type:'text'},
          {l:L('Zdroj','Source'), v:'všetky', type:'select', opts:['všetky','session','brain']},
          {l:L('Iba nepotvrdené','Unconfirmed only'), v:'', type:'switch', on:false}
        ], note:L('Formulár je ukážka rozhrania — reálne vyhľadávanie beží cez /api/search s embeddingami bge-m3.','The form is a UI mockup — the real search runs via /api/search with bge-m3 embeddings.')},
        {t:'note', text:L('Počty spomienok a rozdelenie zdrojov sú ukážkové. Obojsmerná synchronizácia medzi Hadesom a Claude Code pamäťou (ClaudeMemoryIngestService + mind:export-memory) je reálna funkcia appky.','Memory counts and the source split are illustrative. The bidirectional sync between Hades and Claude Code memory (ClaudeMemoryIngestService + mind:export-memory) is a real app feature.')}
      ]
    },

    {
      key:'projekty', icon:'flag',
      title:L('Projekty','Projects'),
      sub:L('Stav appiek rodiny Aura — fáza a otvorené body.','Status of the Aura family apps — phase and open items.'),
      blocks:[
        {t:'kanban', columns:[
          {l:L('Beží v produkcii','Running in production'), items:[
            {title:'Aura KPI', sub:L('port 3030 · Docker','port 3030 · Docker'), badge:['ok',L('MVP hotové','MVP done')]},
            {title:'Aura Roadmap', sub:L('port 3040 · Next.js + MariaDB','port 3040 · Next.js + MariaDB'), badge:['ok',L('dokončené a overené','done and verified')]},
            {title:'sperky-ai', sub:L('e-shop marketing, teal akcent','e-shop marketing, teal accent'), badge:['ok',L('nasadené','deployed')]}
          ]},
          {l:L('Vo vývoji','In development'), items:[
            {title:L('Aura AI (tento refactor)','Aura AI (this refactor)'), sub:L('port 8082 · Laravel + lokálny LLM','port 8082 · Laravel + local LLM'), badge:['cond',L('W1 hotové, W4 otvorené','W1 done, W4 open')]},
            {title:L('Aura Suite náhľad (hub)','Aura Suite preview (hub)'), sub:'apps/aura-apps-hub.html', badge:['ok',L('zmergované','merged')]}
          ]},
          {l:L('Na doplnenie','Needs input'), items:[
            {title:'Banner Studio', sub:L('súčasť Aura Marketing modulu','part of the Aura Marketing module'), badge:['q',L('bez samostatného statusu','no separate status')]},
            {title:'Retouch', sub:L('nezaznamenané v pamäti mysle','not recorded in mind memory'), badge:['q',L('chýba záznam','missing record')]},
            {title:L('Aura Logistika','Aura Logistika'), sub:L('port neznámy z tejto pamäte','port unknown from this memory'), badge:['q',L('doplniť','to fill in')]}
          ]}
        ]},
        {t:'bars', title:L('Projekty podľa fázy','Projects by phase'), data:[
          {l:L('Produkcia','Production'), v:3},
          {l:L('Vývoj','Development'), v:2},
          {l:L('Na doplnenie','Needs input'), v:3}
        ]},
        {t:'table', title:L('Otvorené body','Open items'), cols:[L('Projekt','Project'),L('Bod','Item'),L('Priorita','Priority')],
          rows:[
            {c:[L('Aura AI (refactor)','Aura AI (refactor)'), L('W4: detail uzla hover-card, timeline scrubber, search na mape','W4: node hover-card, timeline scrubber, search on the map'), 'P1']},
            {c:[L('Aura AI (refactor)','Aura AI (refactor)'), L('bcrypt hash tunela je v gite — pri dlhšej expozícii rotovať','tunnel bcrypt hash is tracked in git — rotate it for longer exposure'), 'P1']},
            {c:['Aura Roadmap', L('zlúčiť 7 requestov Prehľadu do jedného agregačného endpointu','merge the 7 Overview requests into one aggregate endpoint'), 'P2']},
            {c:['Aura KPI', L('read-only DB používateľ kpi_ro pre Logistiku a Marketing','read-only DB user kpi_ro for Logistics and Marketing'), 'P2']}
          ], note:L('Otvorené body sú overené zo záznamov jednotlivých projektov (Aura Roadmap, Aura KPI, AuraAI refactor).','Open items are verified from each project\'s own records (Aura Roadmap, Aura KPI, AuraAI refactor).')},
        {t:'note', text:L('Aura Logistika, Banner Studio a Retouch nemajú v tejto pamäti dosť detailu na overené čísla (port, fáza) — doplniť pri ďalšom mind_recall.','Aura Logistika, Banner Studio and Retouch do not have enough detail in this memory for verified figures (port, phase) — fill in on the next mind_recall.')}
      ]
    },

    {
      key:'rozhodnutia', icon:'check',
      title:L('Rozhodnutia','Decisions'),
      sub:L('Register nemenných rozhodnutí — čo, prečo, dôsledok, dátum.','Register of immutable decisions — what, why, consequence, date.'),
      blocks:[
        {t:'table', title:null, cols:[L('Dátum','Date'),L('Rozhodnutie','Decision'),L('Prečo','Why'),L('Dôsledok','Consequence')],
          rows:[
            {c:['29.7.2026', L('Umiestnenie C:\\Aura\\aura-ai','Location C:\\Aura\\aura-ai'), L('nový priečinok, čistý prechod z pôvodného Hadesa','new folder, clean transition from the original Hades'), L('git a dáta sa prenášajú, pôvodný Hades sa vypína','git and data are migrated, the original Hades is shut down')]},
            {c:['29.7.2026', L('/api/v1 zachovať bit-za-bit','Keep /api/v1 byte-for-byte'), L('existujúci payload nesmie zmeniť tvar','the existing payload must not change shape'), L('žiadny konzument API sa počas refactoru nerozbije','no API consumer breaks during the refactor')]},
            {c:['29.7.2026', L('MCP nástroje mind_* → aura_*','MCP tools mind_* → aura_*'), L('nový branding appky','new app branding'), L('dočasné aliasy mind_* počas prechodného obdobia','temporary mind_* aliases during the transition period')]},
            {c:['29.7.2026', L('Vite build a rozsekanie mind.js na moduly vo W0','Vite build and splitting mind.js into modules in W0'), L('5 933 riadkov v jednom IIFE — 10 agentov by sa pobilo v setupControls() (309 riadkov)','5,933 lines in one IIFE — 10 agents would collide in setupControls() (309 lines)'), L('paralelná práca viacerých agentov bez konfliktov','multiple agents can work in parallel without conflicts')]},
            {c:['29.7.2026', L('Graf len desktop, chat aj mobil','Graph desktop-only, chat also on mobile'), L('canvas graf sa na mobile neoplatí, chat áno','a canvas graph is not worth it on mobile, chat is'), L('mobilné rozhranie sa obmedzuje na dnes/chat/denník/knižnicu','the mobile interface is limited to today/chat/journal/library')]}
          ]},
        {t:'timeline', title:L('Časová os rozhodnutí','Decision timeline'), items:[
          [L('29.7.2026','29 Jul 2026'), L('16 blokujúcich otázok z veľkého dotazníka zodpovedaných','16 blocking questions from the large questionnaire answered')],
          [L('30.7.2026','30 Jul 2026'), L('Akcent rodiny rozhodnutý: teal, nie zlatá — pasca uzavretá','Family accent decided: teal, not gold — pitfall closed')]
        ]},
        {t:'note', text:L('Rozhodnutia a dátumy sú prevzaté zo záznamov session o refactore AuraAI. Register by mal byť v ostrej appke dopĺňaný priebežne cez mind_decision.','Decisions and dates are taken from the AuraAI refactor session records. In the live app the register should be kept current via mind_decision.')}
      ]
    },

    {
      key:'recall', icon:'search',
      title:L('Recall','Recall'),
      sub:L('Ladiace rozhranie vyhľadávania v pamäti — dopyt, kandidáti, kvalita a latencia.','Debug interface for memory search — query, candidates, quality and latency.'),
      blocks:[
        {t:'kpis', items:[
          {l:'hit@5', v:'86,7 %', sub:L('baseline vlna 0 · overené 31.7.2026','wave-0 baseline · verified 31 Jul 2026'), tone:'ok'},
          {l:'MRR', v:'0,800', sub:L('baseline vlna 0 · overené','wave-0 baseline · verified'), tone:'ok'},
          {l:L('Latencia /api/search (p50)','Latency /api/search (p50)'), v:'4,2 s', sub:L('živé embedovanie na CPU · overené','live CPU embedding · verified'), tone:'cond'},
          {l:L('Prekryv embeddingov SK↔EN','SK↔EN embedding overlap'), v:'3/20', sub:L('canon sa nedá zmazať · overené','canon cannot be deleted · verified'), tone:'cond'}
        ]},
        {t:'form', title:L('Vyskúšať dopyt','Try a query'), fields:[
          {l:L('Dopyt','Query'), v:'aká veľká je moja sieť', type:'text'},
          {l:L('Režim','Mode'), v:'expand', type:'select', opts:['expand','strict','bridge']},
          {l:L('Min. skóre','Min. score'), v:'0,51', type:'text'}
        ], note:L('Formulár je ukážka rozhrania. Reálny endpoint je GET /api/search, default v config/recall.php: mode=expand, bridge_slots=2, bridge_penalty=0,08, min_score=0,51 — overené.','The form is a UI mockup. The real endpoint is GET /api/search, default in config/recall.php: mode=expand, bridge_slots=2, bridge_penalty=0.08, min_score=0.51 — verified.')},
        {t:'table', title:L('Kandidáti pre dopyt „vratky tovaru"','Candidates for the query "product returns"'), cols:[L('Uzol','Node'),L('Typ','Type'),L('Skóre','Score'),L('Most SK↔EN','SK↔EN bridge')],
          rows:[
            {c:['Returns runbook', L('skill','skill'), {pln:92}, ['ok',L('refund → Returns runbook #1','refund → Returns runbook #1')]]},
            {c:['Lost/stolen parcel claims', L('skill','skill'), {pln:74}, ['ok',L('parcel tracking → #3','parcel tracking → #3')]]},
            {c:[L('DPH pre e-shop','VAT for e-shop'), L('memory','memory'), {pln:61}, ['ok',L('tax → DPH #1','tax → DPH #1')]]},
            {c:['Jewelry protective packaging', L('memory','memory'), {pln:55}, ['cond',L('packaging #1, slabší smer SK→EN','packaging #1, weaker SK→EN direction')]]}
          ], note:L('Zoznam kandidátov a skóre sú ukážkové — ilustrujú tvar odpovede, nie sú z reálneho behu.','The candidate list and scores are illustrative — they show the shape of the response, not a real run.')},
        {t:'note', text:L('Vlna 1 (HTTP cez GET /api/search, 34 dopytov, overené): hit@5 85,3 % strict, efektívne ~91 % — 3 falošné miss z úzkeho SK ground-truth. Mosty SK↔EN cez HTTP overené efektívne 6/6 (tax, fraud, loyalty, packaging, refund, parcel tracking). Pri 12 súbežných dopytoch p95 latencie 12,7 s.','Wave 1 (HTTP via GET /api/search, 34 queries, verified): hit@5 85.3% strict, ~91% effective — 3 false misses from a narrow SK ground truth. SK↔EN bridges via HTTP verified effectively 6/6 (tax, fraud, loyalty, packaging, refund, parcel tracking). At 12 concurrent queries, p95 latency was 12.7s.')}
      ]
    },

    {
      key:'model', icon:'server',
      title:L('Model a runtime','Model & runtime'),
      sub:L('Lokálny LLM — router a embeddings, latencie, eval batéria, budget.','Local LLM — router and embeddings, latencies, eval battery, budget.'),
      blocks:[
        {t:'kpis', items:[
          {l:L('Router presnosť','Router accuracy'), v:'95,3 %', sub:L('qwen3:4b · 41/43 · overené','qwen3:4b · 41/43 · verified'), tone:'ok'},
          {l:L('Model-only presnosť','Model-only accuracy'), v:'87,5 %', sub:L('bez regex vrstvy 1 · overené','without the layer-1 regex · verified'), tone:'ok'},
          {l:L('Embed prekryv','Embed overlap'), v:'3/20', sub:L('bge-m3 · overené','bge-m3 · verified'), tone:'cond'}
        ]},
        {t:'table', title:L('Eval batéria — osi','Eval battery — axes'), cols:[L('Os','Axis'),L('Čo meria','What it measures'),L('Nástroj','Tool')],
          rows:[
            {c:['A · Router', L('replika produkčného promptu cez /api/chat, think:false, format:json, temp:0','replica of the production prompt via /api/chat, think:false, format:json, temp:0'), 'qwen3:4b']},
            {c:['B · Embed', L('kosínus SK↔EN párov, kľúčová metrika je prekryv','cosine of SK↔EN pairs, key metric is overlap'), 'bge-m3, /api/embed']},
            {c:['C · Recall', L('hit@5, MRR a latencia cez GET /api/search','hit@5, MRR and latency via GET /api/search'), 'run_eval.py']}
          ]},
        {t:'form', title:L('Runtime prepínač','Runtime switch'), fields:[
          {l:L('Poskytovateľ','Provider'), v:'lokálny (Ollama)', type:'select', opts:['lokálny (Ollama)','cloud (Claude)']},
          {l:L('Mesačný budget','Monthly budget'), v:'0 €', type:'text'},
          {l:L('Klasifikačný filter pred cloudom','Classification filter before cloud'), v:'', type:'switch', on:true}
        ], note:L('Prepínač a budget sú ukážka rozhrania. Kľúčové zistenie z pamäte: keď appka volá cloudový model cez MCP, posiela lokálny kontext von — preto pred takým volaním musí stáť klasifikačný filter.','The switch and budget are a UI mockup. Key finding from memory: when the app calls a cloud model via MCP, it sends local context out — so a classification filter must sit in front of that call.')},
        {t:'code', title:L('Default konfigurácia recall.php','Default recall.php configuration'), lang:'json',
          text:'{\n  "mode": "expand",\n  "bridge_slots": 2,\n  "bridge_penalty": 0.08,\n  "min_score": 0.51\n}'},
        {t:'note', text:L('Konfiguračné hodnoty a presnosti routera/embeddingu sú overené zo záznamov eval batérie (31.7.2026). Runtime prepínač lokálny/cloud je ukážkový — appka dnes beží čisto lokálne.','Config values and router/embedding accuracies are verified from the eval-battery records (31 Jul 2026). The local/cloud runtime switch is illustrative — the app today runs purely locally.')}
      ]
    },

    {
      key:'nastavenia', icon:'gear',
      title:L('Nastavenia','Settings'),
      sub:L('MCP nástroje, oblasti a oddelenia, nočné joby, expozícia, zálohy.','MCP tools, areas and departments, night jobs, exposure, backups.'),
      blocks:[
        {t:'list', title:L('MCP nástroje','MCP tools'), items:[
          {title:'mind_recall', sub:L('vyhľadá relevantné uzly k téme','looks up nodes relevant to a topic'), badge:['ok',L('aktívne','active')]},
          {title:'mind_learn', sub:L('zapíše nový skill, spomienku alebo projekt','writes a new skill, memory or project'), badge:['ok',L('aktívne','active')]},
          {title:'mind_activate', sub:L('znovu aktivuje už známy skill','reactivates an already-known skill'), badge:['ok',L('aktívne','active')]},
          {title:'mind_decision', sub:L('zapíše nemenné rozhodnutie do registra','records an immutable decision in the register'), badge:['ok',L('aktívne','active')]},
          {title:'mind_overview', sub:L('súhrn stavu celej siete','summary of the whole network state'), badge:['ok',L('aktívne','active')]}
        ]},
        {t:'table', title:L('Oblasti a oddelenia (výber)','Areas and departments (selection)'), cols:[L('Oblasť','Area'),L('Príklad oddelenia','Example department'),L('Poznámka','Note')],
          rows:[
            {c:[L('Vývoj & kód','Development & code'), 'Backend, Frontend, DevOps, Security', L('najväčšia oblasť','the largest area')]},
            {c:[L('Biznis & projekty','Business & projects'), L('Aplikácie, Aura ekosystém','Applications, Aura ecosystem'), '']},
            {c:[L('Marketing & SEO','Marketing & SEO'), 'AI-mind, DevOps', '']},
            {c:[L('Osobné & preferencie','Personal & preferences'), L('Produktivita','Productivity'), '']},
            {c:[L('Dizajn & kreatíva','Design & creativity'), L('Design, know-how','Design, know-how'), '']}
          ], note:L('5 oblastí a príklady oddelení sú overené k momentke 31.7.2026 (skill-tree prototyp z mind_overview). Presný počet oddelení (72) je z tej istej momentky a mohol odvtedy narásť.','The 5 areas and example departments are verified as of the 31 Jul 2026 snapshot (skill-tree prototype from mind_overview). The exact department count (72) is from that same snapshot and may have grown since.')},
        {t:'form', title:L('Nočné joby','Nightly jobs'), fields:[
          {l:L('Automatické zlučovanie podobných uzlov','Auto-merge similar nodes'), v:'', type:'switch', on:false},
          {l:L('Mesačná archivácia','Monthly archiving'), v:'', type:'switch', on:false},
          {l:L('Prepočet embeddingov','Recompute embeddings'), v:'', type:'switch', on:false}
        ], note:L('3 deštruktívne nočné joby boli vo W0 refactoru vedome vypnuté a v tomto náhľade zostávajú vypnuté ako default.','3 destructive nightly jobs were deliberately disabled in the W0 refactor and stay off by default in this preview.')},
        {t:'banner', tone:'cond', text:L('Appka je verejne exponovaná cez Cloudflare quick tunnel za Caddy basic-auth. Heslo (bcrypt hash) je v git-trackovanom Caddyfile — pri dlhšej expozícii ho treba rotovať.','The app is publicly exposed via a Cloudflare quick tunnel behind Caddy basic-auth. The password (bcrypt hash) lives in a git-tracked Caddyfile — rotate it for longer exposure.')},
        {t:'note', text:L('MCP nástroje, konfigurácia recall.php a stav testov (505 PHP testov zelených) sú overené. Rozdelenie oddelení do oblastí je čiastočný, ukážkový výber z reálnej štruktúry.','The MCP tools, the recall.php configuration and the test status (505 PHP tests green) are verified. The area/department split is a partial, illustrative selection from the real structure.')}
      ]
    }

  ]
};
