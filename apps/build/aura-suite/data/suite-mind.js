const APP_MIND = {
  key:'mind', name:'Aura AI', port:'8082', icon:'brain',
  tag:L('AI-mind — živá neurónová sieť skills, spomienok a projektov, ktorá sa učí z každého sedenia v Claude Code.','AI-mind — a living neural network of skills, memories and projects that learns from every Claude Code session.'),
  feat:[
    L('Radiálna mapa mysle s jadrom, oblasťami, oddeleniami a uzlami','Radial mind map with a core, areas, departments and nodes'),
    L('Lokálny LLM router a embeddingy s meraným hit@5 a MRR','Local LLM router and embeddings with measured hit@5 and MRR'),
    L('MCP nástroje mind_recall / learn / activate / decision / overview pre Claude Code','MCP tools mind_recall / learn / activate / decision / overview for Claude Code')
  ],
  live:{ v:L('7 nových uzlov dnes · router 95,3 %','7 new nodes today · router 95.3%'), tone:'ok', spark:[2,4,1,7,3,0,1] },

  api:{ endpoints:[
      {k:'search', l:L('Vyhľadávanie (recall)','Search (recall)'), ms:4200},
      {k:'mind', l:L('Stav siete','Network state'), ms:180},
      {k:'embed', l:L('Embeddingy (bge-m3)','Embeddings (bge-m3)'), ms:2200}
    ],
    sync:L('naposledy volané pred 6 min','last called 6 min ago'), tone:'ok' },

  imp:{ target:'kniznica',
    cols:[
      {k:'skill', l:L('Skill','Skill'), t:'text'},
      {k:'oblast', l:L('Oblasť','Area'), t:'text'},
      {k:'oddelenie', l:L('Oddelenie','Department'), t:'text'},
      {k:'sila', l:L('Sila','Strength'), t:'num'},
      {k:'certainty', l:L('Certainty','Certainty'), t:'text'}
    ],
    key:[L('kľúč upsertu: názov skillu (label)','upsert key: skill name (label)')],
    csv:'skill;oblast;oddelenie;sila;certainty\nDocker Compose;Vyvoj & kod;DevOps;11;\nMCP server development;Vyvoj & kod;Backend;8;\nAuraAI LLM eval bateria;Vyvoj & kod;Backend;1;overene\nCloudflare Tunnel pre Docker appky;Marketing & SEO;DevOps;2;pasca\nRozhodovanie + delegovanie;Osobne & preferencie;Produktivita;7;\nNova skill bez sily;Vyvoj & kod;Backend;vysoka;overene'
  },

  rep:{ templates:[
      {k:'mesacny', l:L('Mesačný report učenia','Monthly learning report'), s:L('Nové uzly, presnosť routera, graf aktivity za mesiac','New nodes, router accuracy, monthly activity chart')},
      {k:'audit', l:L('Audit rozhodnutí','Decision audit'), s:L('Zoznam rozhodnutí za obdobie s dôvodom a dôsledkom, na export pre reviziu','List of decisions in the period with reason and consequence, for review export')},
      {k:'kniznica_export', l:L('Export knižnice','Library export'), s:L('Skills so silou a certainty na zdieľanie mimo appky','Skills with strength and certainty, for sharing outside the app')}
    ]
  },

  screens:[

    {
      key:'dnes', icon:'home',
      title:L('Dnes','Today'),
      sub:L('Čo sa mind naučil dnes, čerstvé uzly a čo čaká na potvrdenie.','What the mind learned today, fresh nodes, and what is waiting for confirmation.'),
      blocks:[
        {t:'kpis', items:[
          {l:L('Nové uzly dnes','New nodes today'), v:int(7), sub:L('memory + skill · ukážkové','memory + skill · illustrative'), tone:null},
          {l:L('Presnosť routera','Router accuracy'), v:'95,3 %', sub:L('baseline vlna 0, 41/43 · overené 31.7.2026','wave-0 baseline, 41/43 · verified 31 Jul 2026'), tone:'ok'},
          {l:L('Čaká na potvrdenie','Awaiting confirmation'), v:int(3), sub:L('certainty nenastavená · ukážkové','certainty not set · illustrative'), tone:'cond'},
          {l:L('Aktívne sedenia','Active sessions'), v:int(1), sub:L('tento týždeň · ukážkové','this week · illustrative'), tone:null}
        ]},
        {t:'lines', title:L('Nové uzly za posledný týždeň','New nodes over the last week'),
          labels:['Po','Ut','St','Št','Pi','So','Ne'],
          series:[{l:L('Nové uzly','New nodes'), v:[2,4,1,7,3,0,1], color:'var(--teal)'}],
          avg:false, note:L('Ukážkové denné počty.','Illustrative daily counts.')},
        {t:'list', title:L('Čerstvo aktivované uzly','Freshly activated nodes'), items:[
          {title:L('AuraAI (refactor Hadesa)','AuraAI (Hades refactor)'), sub:L('projekt · Aplikácie','project · Applications'), badge:['ok',L('overené','verified')], meta:'09:14'},
          {title:L('Cloudflare quick tunnel — celá rodina na jednom linku','Cloudflare quick tunnel — whole family on one link'), sub:L('skill · overené 4.8.2026','skill · verified 4 Aug 2026'), badge:['ok',L('overené','verified')], meta:'09:31'},
          {title:L('Cloudflare Tunnel pre Docker appky','Cloudflare Tunnel for Docker apps'), sub:L('skill · pasca zdokumentovaná','skill · documented pitfall'), badge:['cond',L('pasca','pitfall')], meta:'09:41'},
          {title:L('AuraAI screenshot matrix (Playwright)','AuraAI screenshot matrix (Playwright)'), sub:L('denník · 40/40 záberov overené','journal · 40/40 shots verified'), badge:['ok',L('overené','verified')], meta:'10:02'}
        ]},
        {t:'banner', tone:'cond', text:L('3 uzly majú certainty nenastavenú a čakajú na tvoje potvrdenie v Knižnici.','3 nodes have no certainty set and are waiting for your confirmation in the Library.')},
        {t:'note', text:L('Počty nových uzlov a sedení sú ukážkové. Presnosť routera 95,3 % je overená hodnota z baseline vlny 0 (31.7.2026).','New-node and session counts are illustrative. Router accuracy of 95.3% is a verified figure from the wave-0 baseline (31 Jul 2026).')}
      ],
      ai:[
        {q:L('Koľko nových uzlov pribudlo dnes?','How many new nodes were added today?'), a:L('Dnes pribudlo 7 nových uzlov (memory + skill), 3 z nich ešte nemajú nastavenú certainty. Ide o ukážkové denné počty pre náhľad rozhrania.','7 new nodes were added today (memory + skill), 3 of them still have no certainty set. These are illustrative daily counts for the interface preview.'), cite:'ukážka', act:{l:L('Otvoriť Knižnicu','Open Library'), k:'open'}},
        {q:L('Aká je presnosť routera?','What is the router accuracy?'), a:L('95,3 % (41/43) v baseline vlne 0, overené 31.7.2026 replikou produkčného promptu cez Ollama /api/chat s qwen3:4b.','95.3% (41/43) in the wave-0 baseline, verified 31 Jul 2026 by replicating the production prompt via Ollama /api/chat with qwen3:4b.'), cite:'pamäť', act:null},
        {q:L('Čo čaká na moje potvrdenie?','What is awaiting my confirmation?'), a:L('3 uzly nemajú nastavenú certainty a čakajú na potvrdenie v Knižnici — bez toho ich router nevie spoľahlivo odlíšiť overené od neistých faktov.','3 nodes have no certainty set and are waiting for confirmation in the Library — without it the router cannot reliably tell verified facts from uncertain ones.'), cite:'appka', act:{l:L('Filtrovať bez certainty','Filter by no certainty'), k:'filter'}}
      ]
    },

    {
      key:'dennik', icon:'cal',
      title:L('Denník','Journal'),
      sub:L('Chronologické záznamy sedení — dátum, téma, výsledok, súbory, technológie.','Chronological session records — date, topic, outcome, files, technologies.'),
      blocks:[
        {t:'kpis', items:[
          {l:L('Záznamov v denníku','Journal entries'), v:int(24), sub:L('výber · ukážkové','selection · illustrative'), tone:null},
          {l:L('PHP testov zelených','PHP tests green'), v:int(505), sub:L('4.8.2026 · overené','4 Aug 2026 · verified'), tone:'ok'},
          {l:L('Screenshotov overených','Screenshots verified'), v:'40/40', sub:L('screenshot matica · overené','screenshot matrix · verified'), tone:'ok'}
        ]},
        {t:'table', title:null, cols:[L('Dátum','Date'),L('Téma','Topic'),L('Výsledok','Outcome'),L('Súbory','Files'),L('Technológie','Technologies')],
          rows:[
            {c:['4.8.2026', L('Verejná expozícia cez Cloudflare tunnel','Public exposure via Cloudflare tunnel'), ['ok',L('505 PHP testov zelených','505 PHP tests green')], 'docker-compose.yml, Caddyfile', 'Docker, Caddy, Cloudflare']},
            {c:['4.8.2026', L('Screenshot matica — 10 obrazoviek','Screenshot matrix — 10 screens'), ['ok',L('40/40 záberov','40/40 shots')], 'apps/build/shoot.mjs', 'Playwright']},
            {c:['4.8.2026', L('Cloudflare gateway pre celú rodinu appiek (8 appiek za 1 tunelom)','Cloudflare gateway for the whole app family (8 apps behind 1 tunnel)'), ['cond',L('6 pascí zdokumentovaných','6 pitfalls documented')], 'aura-gateway/Caddyfile, tunnel-up.ps1', 'Caddy, Cloudflare, PowerShell']},
            {c:['3.8.2026', L('Aura Suite náhľad zmergovaný (PR #1)','Aura Suite preview merged (PR #1)'), ['ok','merge commit 817124f'], 'apps/aura-apps-hub.html', 'HTML, Playwright']},
            {c:['31.7.2026', L('Radiálna mapa mysle — W1','Radial mind map — W1'), ['ok',L('393/393 testov pred konfliktom','393/393 tests before the conflict')], 'graph/map/*.js, map.css', 'Canvas 2D, Vite']},
            {c:['31.7.2026', L('Eval batéria — baseline vlna 0','Eval battery — wave 0 baseline'), ['ok',L('router 95,3 %','router 95.3%')], 'vycvik/run_eval.py', 'Python, Ollama']},
            {c:['31.7.2026', L('Eval vlna 1 — recall cez HTTP + mosty','Eval wave 1 — recall via HTTP + bridges'), ['ok',L('hit@5 85,3 % strict','hit@5 85.3% strict')], 'vycvik/run_eval_w1.py', 'Python, Ollama']},
            {c:['31.7.2026', L('Skill-tree SVG prototyp grafu mysle','Skill-tree SVG prototype of the mind graph'), ['ok',L('jednosúborový HTML/SVG','single-file HTML/SVG')], 'hades-aura-graf.html', 'SVG, JS']},
            {c:['29.7.2026', L('Recon a 150 otázok pre refactor','Recon and 150 questions for the refactor'), ['cond',L('16/150 blokujúcich zodpovedaných','16/150 blocking questions answered')], '01-PLAN.md, 02-OTAZKY-150.md', 'Markdown']},
            {c:['29.7.2026', L('Register rozhodnutí refactoru zapísaný','Refactor decision register recorded'), ['ok',L('10 rozhodnutí','10 decisions')], '04-ODPOVEDE-ZAZNAM.md', 'Markdown']},
            {c:['16.7.2026', L('Zložkovanie Hadesovho vedomia — pravidlá organizácie','Structuring the Hades mind — organization rules'), ['ok',L('pravidlo platí dodnes','rule still in effect')], '—', '—']},
            {c:['12.7.2026', L('(ukážka) Bežná session — drobné opravy a nové uzly','(sample) Routine session — small fixes and new nodes'), ['q',L('ukážka','sample')], '—', '—']},
            {c:['9.7.2026', L('(ukážka) Triedenie nepotvrdených uzlov v Knižnici','(sample) Sorting unconfirmed nodes in the Library'), ['q',L('ukážka','sample')], '—', '—']},
            {c:['5.7.2026', L('(ukážka) Ladenie odpovedí chatového panela','(sample) Tuning chat panel answers'), ['q',L('ukážka','sample')], '—', '—']},
            {c:['1.7.2026', L('(ukážka) Kontrola nočných jobov','(sample) Nightly job check'), ['q',L('ukážka','sample')], '—', '—']},
            {c:['27.6.2026', L('(ukážka) Revízia oddelení v oblasti Dizajn & kreatíva','(sample) Department review in Design & creativity'), ['q',L('ukážka','sample')], '—', '—']},
            {c:['23.6.2026', L('(ukážka) Zálohovanie a kontrola retencie','(sample) Backup and retention check'), ['q',L('ukážka','sample')], '—', '—']},
            {c:['19.6.2026', L('(ukážka) Skúšobný dopyt na mape siete','(sample) Trial query on the network map'), ['q',L('ukážka','sample')], '—', '—']},
            {c:['15.6.2026', L('(ukážka) Prehodnotenie certainty pri 4 skills','(sample) Certainty review on 4 skills'), ['q',L('ukážka','sample')], '—', '—']},
            {c:['11.6.2026', L('(ukážka) Import poznámok z markdownu','(sample) Importing notes from markdown'), ['q',L('ukážka','sample')], '—', '—']},
            {c:['7.6.2026', L('(ukážka) Kontrola duplicít v pamäti','(sample) Duplicate check in memory'), ['q',L('ukážka','sample')], '—', '—']},
            {c:['3.6.2026', L('(ukážka) Sedenie o prioritách projektov','(sample) Session on project priorities'), ['q',L('ukážka','sample')], '—', '—']},
            {c:['30.5.2026', L('(ukážka) Revízia rozhodnutí staršieho dátumu','(sample) Review of older decisions'), ['q',L('ukážka','sample')], '—', '—']},
            {c:['26.5.2026', L('(ukážka) Bežná session — drobné opravy','(sample) Routine session — small fixes'), ['q',L('ukážka','sample')], '—', '—']}
          ], note:L('Prvých 11 riadkov je overených zo záznamov session (dátumy, výsledky testov a technológie). Zvyšné riadky sú ukážkové zástupné záznamy, ktoré ilustrujú priebežný denník — nie sú to rekonštruované reálne sedenia.','The first 11 rows are verified from session records (dates, test outcomes and technologies). The remaining rows are illustrative placeholder entries showing a continuous journal — they are not reconstructed real sessions.')},
        {t:'timeline', title:L('Posledné dni','Recent days'), items:[
          [L('4.8.2026','4 Aug 2026'), L('Tunel spustený, appka je verejne dostupná za basic-auth; gateway pre celú rodinu appiek rozbehnutý','Tunnel launched, the app is publicly reachable behind basic-auth; the family-wide gateway was set up')],
          [L('31.7.2026','31 Jul 2026'), L('W1 mapa a eval batéria (vlna 0 a vlna 1) dokončené v ten istý deň','W1 map and eval battery (wave 0 and wave 1) completed on the same day')],
          [L('29.7.2026','29 Jul 2026'), L('Recon dvoma agentmi, register rozhodnutí zapísaný','Recon by two agents, decision register recorded')]
        ]},
        {t:'note', text:L('Zdroj je pamäť mysle (mind_recall) — appka by mala denník viesť priebežne, nie rekonštruovať spätne.','The source is mind memory (mind_recall) — in the real app the journal should be kept continuously, not reconstructed after the fact.')}
      ],
      ai:[
        {q:L('Koľko PHP testov je zelených?','How many PHP tests are green?'), a:L('505 PHP testov zelených, overené 4.8.2026 pri spúšťaní verejnej expozície appky cez Cloudflare tunnel.','505 PHP tests are green, verified on 4 Aug 2026 when the public exposure via Cloudflare tunnel went live.'), cite:'pamäť', act:null},
        {q:L('Čo sa stalo 31.7.2026?','What happened on 31 Jul 2026?'), a:L('W1 radiálna mapa mysle (393/393 testov pred konfliktom) a obe eval vlny (baseline vlna 0, vlna 1 recall cez HTTP) boli dokončené v ten istý deň.','The W1 radial mind map (393/393 tests before the conflict) and both eval waves (wave-0 baseline, wave-1 recall via HTTP) were completed the same day.'), cite:'pamäť', act:{l:L('Otvoriť Model a runtime','Open Model & runtime'), k:'open'}},
        {q:L('Sú všetky záznamy denníka reálne?','Are all journal entries real?'), a:L('Nie — prvých 11 riadkov je overených zo session záznamov, zvyšok sú ukážkové zástupné riadky, ktoré len ilustrujú priebežné vedenie denníka.','No — the first 11 rows are verified from session records, the rest are illustrative placeholder rows that only show what a continuous journal looks like.'), cite:'ukážka', act:null}
      ]
    },

    {
      key:'kniznica', icon:'list',
      title:L('Knižnica','Library'),
      sub:L('Skills a playbooky s certainty, silou a oblasťou.','Skills and playbooks with certainty, strength and area.'),
      blocks:[
        {t:'kpis', items:[
          {l:L('Skills spolu','Skills total'), v:int(23), sub:L('z pamäte mysle · overené výskytom','from mind memory · verified by presence'), tone:null},
          {l:L('Certainty overené','Certainty verified'), v:int(6), tone:'ok'},
          {l:L('Certainty pasca','Certainty pitfall'), v:int(2), tone:'cond'},
          {l:L('Bez certainty','No certainty set'), v:int(15), tone:null}
        ]},
        {t:'donut', title:L('Rozdelenie certainty','Certainty split'), pct:35, label:L('skills s certainty nastavenou (overené alebo pasca)','skills with certainty set (verified or pitfall)')},
        {t:'cards', n:3, items:[
          {title:'AuraAI LLM eval batéria', sub:L('Vývoj & kód · Backend','Development & code · Backend'), badge:['ok',L('overené','verified')], lines:[[L('Sila','Strength'),'1'],[L('Router','Router'),'95,3 %']], chips:['qwen3:4b','bge-m3','recall']},
          {title:'Cloudflare Tunnel pre Docker appky', sub:L('Marketing & SEO · DevOps','Marketing & SEO · DevOps'), badge:['cond',L('pasca','pitfall')], lines:[[L('Sila','Strength'),'2'],[L('Pascí zdokumentovaných','Pitfalls documented'),'6']], chips:['cloudflared','caddy','docker']},
          {title:'Docker Compose', sub:L('Vývoj & kód · DevOps','Development & code · DevOps'), badge:['q',L('bez certainty','no certainty')], lines:[[L('Sila','Strength'),'11']], chips:[L('compose','compose'),L('volumes','volumes'),L('siete','networks')]}
        ]},
        {t:'table', title:L('Ostatné skills','Other skills'), page:true, cols:[L('Skill','Skill'),L('Oblasť · Oddelenie','Area · Department'),L('Sila','Strength'),L('Certainty','Certainty')],
          rows:[
            {c:['AuraAI recall latencia + mosty (HTTP)', L('Vývoj & kód · Backend','Development & code · Backend'), int(1), ['ok',L('overené','verified')]], go:'recall'},
            {c:['Cloudflare quick tunnel — celá rodina na jednom linku', L('Vývoj & kód · DevOps','Development & code · DevOps'), int(1), ['ok',L('overené','verified')]]},
            {c:['MCP server development', L('Vývoj & kód · Backend','Development & code · Backend'), int(8), ['q',L('bez certainty','no certainty')]]},
            {c:['Similarity-based graph prewiring', L('Vývoj & kód · Backend','Development & code · Backend'), int(2), ['q',L('bez certainty','no certainty')]]},
            {c:['Tombstone pattern for idempotent sync', L('Vývoj & kód · Backend','Development & code · Backend'), int(2), ['q',L('bez certainty','no certainty')]]},
            {c:['Code-only transcript ingestion pipeline', L('Vývoj & kód · Backend','Development & code · Backend'), int(2), ['q',L('bez certainty','no certainty')]]},
            {c:['Node decay & temperature model', L('Vývoj & kód · Backend','Development & code · Backend'), int(1), ['q',L('bez certainty','no certainty')]]},
            {c:['Obsidian-style graph UX', L('Vývoj & kód · Frontend','Development & code · Frontend'), int(1), ['q',L('bez certainty','no certainty')]]},
            {c:['Color-area shape-type encoding', L('Dizajn & kreatíva · Know-how','Design & creativity · Know-how'), int(1), ['q',L('bez certainty','no certainty')]]},
            {c:['Focus dimming with floor', L('Vývoj & kód · Frontend','Development & code · Frontend'), int(1), ['q',L('bez certainty','no certainty')]]},
            {c:[L('Smernica — prompt builder obrazovka','Directive — prompt builder screen'), L('Vývoj & kód','Development & code'), int(1), ['q',L('bez certainty','no certainty')]]},
            {c:['LLM endpoint rate limiting', L('Vývoj & kód · Security','Development & code · Security'), int(2), ['q',L('bez certainty','no certainty')]]},
            {c:['Rozhodovanie + delegovanie', L('Osobné & preferencie · Produktivita','Personal & preferences · Productivity'), int(7), ['q',L('bez certainty','no certainty')]]},
            {c:['Organizácia práce', L('Osobné & preferencie · Produktivita','Personal & preferences · Productivity'), int(6), ['q',L('bez certainty','no certainty')]]},
            {c:['AI agenti + MCP', L('Vývoj & kód · AI nástroje','Development & code · AI tools'), int(5), ['q',L('bez certainty','no certainty')]]},
            {c:['Search, navigation + discovery', L('Vývoj & kód · IT','Development & code · IT'), int(3), ['q',L('bez certainty','no certainty')]]},
            {c:['CEO porada report — Aura HTML dizajn', L('Marketing & SEO · Reporting & dataviz','Marketing & SEO · Reporting & dataviz'), int(4), ['ok',L('overené','verified')]]},
            {c:['Retrieval eval metrics', L('Vývoj & kód · AI engineering','Development & code · AI engineering'), int(1), ['q',L('bez certainty','no certainty')]]},
            {c:['ngrok tunneling', L('Vývoj & kód · DevOps','Development & code · DevOps'), int(2), ['q',L('bez certainty','no certainty')]]},
            {c:['MariaDB', L('Vývoj & kód · Backend','Development & code · Backend'), int(5), ['q',L('bez certainty','no certainty')]]}
          ]},
        {t:'note', text:L('Zoznam skills, ich sila, oblasť/oddelenie a certainty sú prevzaté zo záznamov mysle (mind_recall) — 23 skills v tejto tabuľke reálne existujú v pamäti. KPI karty „Certainty overené/pasca/bez certainty" sú súčet nad týmto výberom, nie presné číslo z celej databázy.','Skill names, their strength, area/department and certainty are taken from mind records (mind_recall) — the 23 skills in this table really exist in memory. The "verified/pitfall/no certainty" KPI cards are a rollup over this selection, not an exact count from the whole database.')}
      ],
      ai:[
        {q:L('Koľko skills má certainty pasca?','How many skills have pitfall certainty?'), a:L('2: Cloudflare Tunnel pre Docker appky (6 pascí) a nepriamo Cloudflare quick tunnel — celá rodina, ktorý je vedený ako overené, hoci tiež dokumentuje 6 pascí.','2: Cloudflare Tunnel for Docker apps (6 pitfalls), and indirectly the Cloudflare quick tunnel — whole family skill, which is marked verified even though it also documents 6 pitfalls.'), cite:'appka', act:{l:L('Otvoriť detail skillu','Open skill detail'), k:'open'}},
        {q:L('Ktorý skill má najväčšiu silu?','Which skill has the highest strength?'), a:L('Docker Compose so silou 11, nasleduje MCP server development so silou 8.','Docker Compose with strength 11, followed by MCP server development with strength 8.'), cite:'appka', act:null},
        {q:L('Čo znamená certainty overene pri eval batérii?','What does certainty verified mean for the eval battery?'), a:L('Znamená, že čísla skillu (router 95,3 %, hit@5 86,7 %, MRR 0,800) boli zmerané read-only harnessom a nie sú odhad.','It means the skill numbers (router 95.3%, hit@5 86.7%, MRR 0.800) were measured by a read-only harness and are not an estimate.'), cite:'pamäť', act:null}
      ]
    },

    {
      key:'skill', icon:'book',
      title:L('Detail skillu','Skill detail'),
      sub:L('Cloudflare Tunnel pre Docker appky — popis, sila, väzby, história aktivácií.','Cloudflare Tunnel for Docker apps — description, strength, links, activation history.'),
      blocks:[
        {t:'kpis', items:[
          {l:L('Sila','Strength'), v:int(2), tone:null},
          {l:L('Certainty','Certainty'), v:L('pasca','pitfall'), tone:'cond'},
          {l:L('Pascí zdokumentovaných','Pitfalls documented'), v:int(6), sub:L('overené 4.8.2026','verified 4 Aug 2026'), tone:'cond'},
          {l:L('Oblasť · Oddelenie','Area · Department'), v:L('Marketing & SEO','Marketing & SEO'), sub:'DevOps', tone:null}
        ]},
        {t:'note', text:L('Popis skillu: exponovanie lokálnych Docker appiek cez cloudflared namiesto ngroku. Zdroj: mind_recall, sedenie 4.8.2026 (AuraAI).','Skill description: exposing local Docker apps via cloudflared instead of ngrok. Source: mind_recall, 4 Aug 2026 session (AuraAI).')},
        {t:'list', title:L('Zdokumentované pasce (1–6)','Documented pitfalls (1–6)'), items:[
          {title:L('1. Konektor musí bežať v Docker sieti projektu','1. The connector must run in the project Docker network'), sub:L('ingress musí mieriť na názov služby (http://caddy:8095), nie na localhost/host.docker.internal','ingress must target the service name (http://caddy:8095), not localhost/host.docker.internal'), badge:['cond',L('pasca','pitfall')]},
          {title:L('2. Pojmenovaný tunel vyžaduje zónu na Cloudflare NS','2. A named tunnel requires a Cloudflare-hosted zone'), sub:L('CNAME na cfargotunnel.com u cudzieho DNS providera nefunguje','a CNAME to cfargotunnel.com at a foreign DNS provider does not work'), badge:['cond',L('pasca','pitfall')]},
          {title:L('3. trustProxies(at: \'*\') je nutný v Laravel bootstrap/app.php','3. trustProxies(at: \'*\') is required in Laravel bootstrap/app.php'), sub:L('bez neho appka vygeneruje http:// asset URL na https stránke — mixed content','without it the app generates http:// asset URLs on an https page — mixed content'), badge:['cond',L('pasca','pitfall')]},
          {title:L('4. Https schéma sa stráca v Caddy, nie v Laraveli','4. The https scheme is lost in Caddy, not in Laravel'), sub:L('oprava: servers trusted_proxies static private_ranges v globálnom bloku Caddyfile','fix: servers trusted_proxies static private_ranges in the Caddyfile global block'), badge:['cond',L('pasca','pitfall')]},
          {title:L('5. Docker compose zdvojuje dolár v .env aj env_file','5. Docker compose escapes the dollar sign in .env and env_file'), sub:L('bcrypt hash sa odsekne, každé heslo vráti 401 — vyzerá to ako zlé heslo, nie zlá konfigurácia','the bcrypt hash gets truncated, every password returns 401 — looks like a wrong password, not broken config'), badge:['cond',L('pasca','pitfall')]},
          {title:L('6. Basic-auth cez user:pass@host v prehliadači nefunguje','6. Basic-auth via user:pass@host in the browser does not work'), sub:L('Chrome odmietne fetch z takej URL — API treba overovať curlom','Chrome refuses a fetch built from such a URL — verify the API with curl instead'), badge:['cond',L('pasca','pitfall')]}
        ]},
        {t:'list', title:L('Väzby','Links'), items:[
          {title:L('AuraAI (refactor Hadesa)','AuraAI (Hades refactor)'), sub:L('projekt, kde bol skill objavený','project where the skill was discovered'), badge:['info',L('projekt','project')]},
          {title:L('Cloudflare quick tunnel — celá rodina na jednom linku','Cloudflare quick tunnel — whole family on one link'), sub:L('nadväzujúci skill, rozšírenie na 8 appiek','follow-on skill, extended to 8 apps'), badge:['info',L('skill','skill')]},
          {title:'Docker Compose', sub:L('predpoklad — služby musia byť v spoločnej sieti','prerequisite — services must share a network'), badge:['info',L('skill','skill')]}
        ]},
        {t:'timeline', title:L('História aktivácií','Activation history'), items:[
          [L('4.8.2026 ráno','4 Aug 2026 morning'), L('Prvé tri pasce zdokumentované pri prvom pokuse o expozíciu AuraAI','First three pitfalls documented during the first attempt to expose AuraAI')],
          [L('4.8.2026 doplnenie','4 Aug 2026 follow-up'), L('Pasce 4–6 doplnené po treťom neúspešnom pokuse (https schéma, dolár v .env, basic-auth v prehliadači)','Pitfalls 4–6 added after a third failed attempt (https scheme, dollar sign in .env, basic-auth in the browser)')]
        ]},
        {t:'note', text:L('Popis, počet pascí a dátumy sú overené zo záznamov mysle. Táto obrazovka je vzorový detail jedného skillu — v ostrej appke by mala existovať pre každý uzol knižnice.','Description, pitfall count and dates are verified from mind records. This screen is a sample detail for one skill — in the live app it should exist for every library node.')}
      ],
      ai:[
        {q:L('Koľko pascí má tento skill?','How many pitfalls does this skill have?'), a:L('6, zdokumentovaných 4.8.2026 v dvoch dávkach (prvé tri ráno, ďalšie tri po treťom neúspešnom pokuse o expozíciu).','6, documented on 4 Aug 2026 in two batches (the first three in the morning, three more after a third failed exposure attempt).'), cite:'pamäť', act:null},
        {q:L('S čím je tento skill prepojený?','What is this skill linked to?'), a:L('S projektom AuraAI (refactor Hadesa), kde bol objavený, so skillom Cloudflare quick tunnel pre celú rodinu appiek a s predpokladom Docker Compose.','With the AuraAI (Hades refactor) project where it was discovered, with the Cloudflare quick tunnel skill for the whole app family, and with the Docker Compose prerequisite.'), cite:'appka', act:{l:L('Otvoriť Mapu siete','Open Network map'), k:'open'}},
        {q:L('Prečo je certainty pasca a nie overené?','Why is certainty pitfall and not verified?'), a:L('Certainty pasca znamená, že skill zachytáva opakovane zistené chyby a ich riešenia, nie overený úspešný postup bez výhrad.','Pitfall certainty means the skill captures repeatedly discovered failures and their fixes, not a verified success path without caveats.'), cite:'pamäť', act:null}
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
            {l:'AI-mind (záznam)', k:'memory', s:1, x:8, y:20},
            {l:'Aura Suite náhľad (hub)', k:'project', s:2, x:95, y:26}
          ],
          edges:[[0,1],[0,2],[0,3],[0,4],[0,5],[1,6],[1,9],[1,10],[1,11],[1,12],[1,13],[1,16],[2,7],[2,8],[2,17],[4,14],[4,15]],
          note:L('Pozície x/y a rozloženie sú ilustratívne pre náhľad; reálna appka ich generuje deterministickým radiálnym layoutom z /api/mind (prng.js + layout.js). Mená a typy uzlov projektov a skills sú prevzaté z pamäte.','Node x/y positions and the layout are illustrative for this preview; the real app generates them with a deterministic radial layout from /api/mind (prng.js + layout.js). The project and skill node names and types are taken from memory.')},
        {t:'kpis', items:[
          {l:L('Oblastí','Areas'), v:int(5), tone:null},
          {l:L('Oddelení','Departments'), v:int(72), sub:L('naprieč všetkými oblasťami · momentka 31.7.2026','across all areas · snapshot 31 Jul 2026'), tone:null},
          {l:L('Uzlov v sieti','Nodes in network'), v:int(731), sub:L('714 generovaných listov + 17 pomenovaných uzlov · overené','714 generated leaves + 17 named nodes · verified'), tone:null}
        ]},
        {t:'bars', title:L('Uzly podľa oblasti','Nodes by area'), data:[
            {l:L('Vývoj & kód','Development & code'), v:271},
            {l:L('Biznis & projekty','Business & projects'), v:160},
            {l:L('Marketing & SEO','Marketing & SEO'), v:152},
            {l:L('Osobné & preferencie','Personal & preferences'), v:91},
            {l:L('Dizajn & kreatíva','Design & creativity'), v:36}
          ], note:L('Overené z momentky skill-tree prototypu 31.7.2026 (mind_overview). Súčet 710 sa mierne líši od modelu „714 listov + 17 uzlov" — obe hodnoty pochádzajú z tej istej momentky, ale z rôzneho počítania.','Verified from the skill-tree prototype snapshot on 31 Jul 2026 (mind_overview). The sum of 710 differs slightly from the "714 leaves + 17 nodes" model — both figures come from the same snapshot but a different count.')},
        {t:'list', title:L('Legenda typov','Type legend'), items:[
          {title:L('Jadro','Core'), sub:L('zlaté sústredné kruhy — HADES','gold concentric circles — HADES'), badge:['info',L('core','core')]},
          {title:L('Projekt','Project'), sub:L('disk s vonkajším prstencom','disk with an outer ring'), badge:['info',L('projekt','project')]},
          {title:L('Skill','Skill'), sub:L('donut','donut shape'), badge:['info',L('skill','skill')]},
          {title:L('Spomienka','Memory'), sub:L('plný disk','solid disk'), badge:['info',L('memory','memory')]}
        ]},
        {t:'note', text:L('Farba vždy kóduje oblasť, tvar kóduje typ uzla — jeden sémantický kanál na vlastnosť, žiadne dekoratívne farby (overené rozhodnutie z Hades canvas). Veľkosť uzla = sila (strength). Zvýraznenie pri hoveri stmavuje zvyšok grafu len po podlahu 0,30 uzly / 0,20 hrany, nikdy do úplného zhasnutia.','Color always encodes area, shape encodes node type — one semantic channel per property, no decorative colors (a verified decision from the Hades canvas). Node size = strength. Hover highlighting dims the rest of the graph only down to a floor of 0.30 nodes / 0.20 edges, never to fully off.')}
      ],
      ai:[
        {q:L('Koľko oddelení má sieť?','How many departments does the network have?'), a:L('72 oddelení naprieč 5 oblasťami, momentka overená k 31.7.2026 zo skill-tree prototypu.','72 departments across 5 areas, a snapshot verified as of 31 Jul 2026 from the skill-tree prototype.'), cite:'pamäť', act:null},
        {q:L('Ktorá oblasť má najviac uzlov?','Which area has the most nodes?'), a:L('Vývoj & kód s 271 uzlami, nasleduje Biznis & projekty so 160.','Development & code with 271 nodes, followed by Business & projects with 160.'), cite:'pamäť', act:{l:L('Filtrovať podľa oblasti','Filter by area'), k:'filter'}},
        {q:L('Ako sa kóduje farba a tvar uzla?','How are node color and shape encoded?'), a:L('Farba vždy znamená oblasť, tvar vždy znamená typ uzla (core/projekt/skill/memory) — jeden sémantický kanál na vlastnosť.','Color always means area, shape always means node type (core/project/skill/memory) — one semantic channel per property.'), cite:'pamäť', act:null}
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
          {title:L('Potreboval by som vytvoriť neurál AI-mind…','I would need to build a literal neural AI-mind…'), sub:L('memory · Záznamy — AuraAI','memory · Records — AuraAI'), badge:['info',L('session','session')], meta:'2.8.2026'},
          {title:L('Na samostatnej branchi potrebujem, aby aura app…','On a separate branch I need the aura app to…'), sub:L('memory · Záznamy — Banner Generator','memory · Records — Banner Generator'), badge:['info',L('session','session')], meta:'3.8.2026'},
          {title:L('Potrebujem AuraAI a všetky aplikácie mať dizajnovo totožné…','I need AuraAI and all apps to look design-identical…'), sub:L('memory · Záznamy — AuraAI','memory · Records — AuraAI'), badge:['info',L('session','session')], meta:'4.8.2026'},
          {title:L('Rozhodovanie a delegovanie','Decision-making and delegation'), sub:L('skill · Produktivita','skill · Productivity'), badge:['q',L('brain','brain')], meta:'—'}
        ]},
        {t:'table', title:L('Uzly (výber)','Nodes (selection)'), page:true, cols:[L('Uzol','Node'),L('Oblasť · Oddelenie','Area · Department'),L('Zdroj','Source'),L('Aktivované','Activated')],
          rows:[
            {c:[L('Potreboval by som vytvoriť neurál AI-mind…','I would need to build a literal neural AI-mind…'), L('Vývoj & kód · Záznamy — AuraAI','Development & code · Records — AuraAI'), ['info','session'], '2.8.2026']},
            {c:[L('Na samostatnej branchi potrebujem, aby aura app…','On a separate branch I need the aura app to…'), L('Biznis & projekty · Záznamy — Banner Generator','Business & projects · Records — Banner Generator'), ['info','session'], '3.8.2026']},
            {c:['docker run cloudflare/cloudflared:latest tunnel …', L('Vývoj & kód · Záznamy — AuraAI','Development & code · Records — AuraAI'), ['info','session'], '4.8.2026']},
            {c:[L('Potrebujem AuraAI a všetky aplikácie dizajnovo totožné…','I need AuraAI and all apps design-identical…'), L('Vývoj & kód · Záznamy — AuraAI','Development & code · Records — AuraAI'), ['info','session'], '4.8.2026']},
            {c:[L('Potrebujem AuraAI a ostatné appky nahodené cez…','I need AuraAI and the other apps rolled out via…'), L('Vývoj & kód · Záznamy — AuraAI','Development & code · Records — AuraAI'), ['info','session'], '4.8.2026']},
            {c:[L('Rozbehnúť pripravený projekt aura-gateway…','Get the prepared aura-gateway project running…'), L('Vývoj & kód · Záznamy — rôzne','Development & code · Records — various'), ['info','session'], '4.8.2026']},
            {c:[L('(ukážka) Poznámka o cenníku dodávateľa obalov','(sample) Note on a packaging supplier price list'), L('Biznis & projekty · Nezaradené','Business & projects · Unclassified'), ['q','brain'], '30.7.2026']},
            {c:[L('(ukážka) Preferovaný formát reportov je PDF','(sample) Preferred report format is PDF'), L('Osobné & preferencie · Produktivita','Personal & preferences · Productivity'), ['q','brain'], '29.7.2026']},
            {c:[L('(ukážka) Nápad na newsletter tému','(sample) Idea for a newsletter topic'), L('Marketing & SEO · Nezaradené','Marketing & SEO · Unclassified'), ['info','session'], '28.7.2026']},
            {c:[L('(ukážka) Klient sa pýtal na dodaciu lehotu','(sample) A customer asked about delivery time'), L('Marketing & SEO · Záznamy — sperky-ai','Marketing & SEO · Records — sperky-ai'), ['info','session'], '27.7.2026']},
            {c:[L('(ukážka) Farebná paleta pre jesennú kolekciu','(sample) Color palette for the autumn collection'), L('Dizajn & kreatíva · Know-how','Design & creativity · Know-how'), ['info','session'], '26.7.2026']},
            {c:[L('(ukážka) Poznámka k reklamácii šperku','(sample) Note on a jewelry return case'), L('Biznis & projekty · Záznamy — Logistika','Business & projects · Records — Logistics'), ['info','session'], '25.7.2026']},
            {c:[L('(ukážka) Nastavenie e-mailového podpisu','(sample) Email signature setup'), L('Osobné & preferencie · Produktivita','Personal & preferences · Productivity'), ['q','brain'], '24.7.2026']},
            {c:[L('(ukážka) Zoznam dodávateľov fotenia','(sample) List of photography vendors'), L('Marketing & SEO · Nezaradené','Marketing & SEO · Unclassified'), ['info','session'], '23.7.2026']},
            {c:[L('(ukážka) Poznámka o zľavovom kóde na sviatky','(sample) Note on a holiday discount code'), L('Marketing & SEO · Záznamy — sperky-ai','Marketing & SEO · Records — sperky-ai'), ['info','session'], '22.7.2026']},
            {c:[L('(ukážka) Preferencia dark mode ako default','(sample) Preference for dark mode as default'), L('Osobné & preferencie · Produktivita','Personal & preferences · Productivity'), ['q','brain'], '21.7.2026']},
            {c:[L('(ukážka) Otázka na SEO poradu','(sample) Question for the SEO meeting'), L('Marketing & SEO · Reporting & dataviz','Marketing & SEO · Reporting & dataviz'), ['info','session'], '20.7.2026']},
            {c:[L('(ukážka) Nápad na banner k výpredaju','(sample) Idea for a sale banner'), L('Dizajn & kreatíva · Know-how','Design & creativity · Know-how'), ['info','session'], '19.7.2026']},
            {c:[L('(ukážka) Poznámka o novom dodávateľovi obalov','(sample) Note on a new packaging supplier'), L('Biznis & projekty · Nezaradené','Business & projects · Unclassified'), ['info','session'], '18.7.2026']},
            {c:[L('(ukážka) Zápis z rozhovoru s kolegom o vyťaženosti','(sample) Note from a talk with a colleague about workload'), L('Osobné & preferencie · Produktivita','Personal & preferences · Productivity'), ['q','brain'], '17.7.2026']},
            {c:[L('(ukážka) Nápad na vylepšenie e-shopového filtra','(sample) Idea to improve the e-shop filter'), L('Vývoj & kód · Frontend','Development & code · Frontend'), ['info','session'], '16.7.2026']},
            {c:[L('(ukážka) Poznámka o platobnej bráne','(sample) Note on a payment gateway'), L('Vývoj & kód · Backend','Development & code · Backend'), ['info','session'], '15.7.2026']},
            {c:[L('(ukážka) Zoznam otázok pre ďalšiu poradu','(sample) List of questions for the next meeting'), L('Biznis & projekty · Nezaradené','Business & projects · Unclassified'), ['info','session'], '14.7.2026']},
            {c:[L('(ukážka) Preferencia SK ako default jazyk','(sample) Preference for SK as the default language'), L('Osobné & preferencie · Produktivita','Personal & preferences · Productivity'), ['q','brain'], '13.7.2026']},
            {c:[L('(ukážka) Poznámka o veľkonočnej kampani','(sample) Note on an Easter campaign'), L('Marketing & SEO · Záznamy — sperky-ai','Marketing & SEO · Records — sperky-ai'), ['info','session'], '12.7.2026']},
            {c:[L('(ukážka) Nápad na vernostný program','(sample) Idea for a loyalty program'), L('Biznis & projekty · Aplikácie','Business & projects · Applications'), ['info','session'], '11.7.2026']},
            {c:[L('(ukážka) Poznámka o kontrole kvality fotiek','(sample) Note on photo quality control'), L('Dizajn & kreatíva · Know-how','Design & creativity · Know-how'), ['info','session'], '10.7.2026']},
            {c:[L('(ukážka) Otázka na účtovníctvo a DPH','(sample) Question on accounting and VAT'), L('Biznis & projekty · Hospodársky','Business & projects · Finance'), ['info','session'], '9.7.2026']},
            {c:[L('(ukážka) Preferencia klávesových skratiek','(sample) Preference for keyboard shortcuts'), L('Osobné & preferencie · Produktivita','Personal & preferences · Productivity'), ['q','brain'], '8.7.2026']},
            {c:[L('(ukážka) Poznámka o dodávateľovi krabičiek','(sample) Note on a box supplier'), L('Biznis & projekty · Nezaradené','Business & projects · Unclassified'), ['info','session'], '7.7.2026']}
          ], note:L('Prvých 6 riadkov je overených zo záznamov mysle (mind_recall). Zvyšné riadky sú ukážkové zástupné memory uzly pre náhľad tabuľky s 30 riadkami — nejde o reálny obsah.','The first 6 rows are verified from mind records (mind_recall). The remaining rows are illustrative placeholder memory nodes to preview a 30-row table — not real content.')},
        {t:'form', title:L('Vyhľadávanie v spomienkach','Search memories'), fields:[
          {l:L('Dopyt','Query'), v:'', type:'text'},
          {l:L('Zdroj','Source'), v:'všetky', type:'select', opts:['všetky','session','brain']},
          {l:L('Iba nepotvrdené','Unconfirmed only'), v:'', type:'switch', on:false}
        ], note:L('Formulár je ukážka rozhrania — reálne vyhľadávanie beží cez /api/search s embeddingami bge-m3.','The form is a UI mockup — the real search runs via /api/search with bge-m3 embeddings.')},
        {t:'note', text:L('Počty spomienok a rozdelenie zdrojov sú ukážkové. Obojsmerná synchronizácia medzi Hadesom a Claude Code pamäťou (ClaudeMemoryIngestService + mind:export-memory) je reálna funkcia appky.','Memory counts and the source split are illustrative. The bidirectional sync between Hades and Claude Code memory (ClaudeMemoryIngestService + mind:export-memory) is a real app feature.')}
      ],
      ai:[
        {q:L('Koľko spomienok je zo session a koľko z brain?','How many memories come from session vs brain?'), a:L('Ukážkovo 87 % session a 13 % brain (~/.claude memory/*.md, MEMORY.md) — presné počty appka dnes nemeria týmto rozhraním.','Illustratively 87% session and 13% brain (~/.claude memory/*.md, MEMORY.md) — the app does not measure exact counts through this interface today.'), cite:'ukážka', act:null},
        {q:L('Ako appka predchádza duplicitám pri zlúčení uzla?','How does the app prevent duplicates when a node is merged?'), a:L('Tombstone pattern: zlúčený alebo archivovaný uzol zapíše svoj external_key do tabuľky tombstones, takže ho transkript ingest nikdy nevzkriesi ako zombieho.','Tombstone pattern: a merged or archived node writes its external_key into a tombstones table, so the transcript ingest job can never resurrect it as a zombie.'), cite:'pamäť', act:null},
        {q:L('Kde sa zapisujú záznamy zo sedení?','Where do session records get filed?'), a:L('Do oddelenia „Záznamy — <projekt>" podľa mapy projekt→oblasť; nezaradené idú do „Nezaradené", playbooky do Knižnice, digesty do Súhrnov — overené pravidlo z 16.7.2026.','Into a "Records — <project>" department per the project-to-area map; unclassified items go to "Unclassified", playbooks to the Library, digests to Summaries — a verified rule from 16 Jul 2026.'), cite:'pamäť', act:null}
      ]
    },

    {
      key:'projekty', icon:'flag',
      title:L('Projekty','Projects'),
      sub:L('Stav appiek rodiny Aura — fáza a otvorené body.','Status of the Aura family apps — phase and open items.'),
      blocks:[
        {t:'kanban', columns:[
          {l:L('Beží v produkcii / dokončené','Running in production / done'), items:[
            {title:'Aura KPI', sub:L('port 3030 · Docker','port 3030 · Docker'), badge:['ok',L('MVP hotové','MVP done')]},
            {title:'Aura Roadmap', sub:L('port 3040 · Next.js + MariaDB','port 3040 · Next.js + MariaDB'), badge:['ok',L('dokončené a overené','done and verified')]},
            {title:'sperky-ai', sub:L('e-shop marketing, teal akcent','e-shop marketing, teal accent'), badge:['ok',L('nasadené','deployed')]},
            {title:L('Aura Suite náhľad (hub)','Aura Suite preview (hub)'), sub:'apps/aura-apps-hub.html', badge:['ok',L('zmergované','merged')]},
            {title:L('AuraAI prezentácia baseline 07/2026','AuraAI baseline presentation 07/2026'), sub:L('Asana + PDF/PNG deck','Asana + PDF/PNG deck'), badge:['ok',L('dokončené 28.7.2026','done 28 Jul 2026')]}
          ]},
          {l:L('Vo vývoji','In development'), items:[
            {title:L('Aura AI (tento refactor)','Aura AI (this refactor)'), sub:L('port 8082 · Laravel + lokálny LLM','port 8082 · Laravel + local LLM'), badge:['cond',L('W1 hotové, W4 otvorené','W1 done, W4 open')]},
            {title:'Aura Gateway', sub:L('Caddy + cloudflared + forward_auth','Caddy + cloudflared + forward_auth'), badge:['cond',L('rozbieha sa','being set up')]}
          ]},
          {l:L('Na doplnenie','Needs input'), items:[
            {title:'Banner Studio', sub:L('súčasť Aura Marketing modulu','part of the Aura Marketing module'), badge:['q',L('bez samostatného statusu','no separate status')]},
            {title:'Retouch', sub:L('nezaznamenané v pamäti mysle','not recorded in mind memory'), badge:['q',L('chýba záznam','missing record')]},
            {title:L('Aura Logistika','Aura Logistika'), sub:L('port neznámy z tejto pamäte','port unknown from this memory'), badge:['q',L('doplniť','to fill in')]},
            {title:L('HR / Interná evidencia','HR / Internal records'), sub:L('spomenutá len ako modul hubu','mentioned only as a hub module'), badge:['q',L('doplniť','to fill in')]},
            {title:'Aura AI Lite', sub:L('upgrade existujúceho PC, register N01–N11','existing PC upgrade, register N01–N11'), badge:['q',L('plánovanie','planning')]}
          ]}
        ]},
        {t:'table', title:L('Prehľad 12 projektov rodiny','Overview of the 12 family projects'), cols:[L('Projekt','Project'),L('Port','Port'),L('Fáza','Phase'),L('Poznámka','Note')],
          rows:[
            {c:['Aura KPI', '3030', L('produkcia','production'), L('MVP hotové a overené end-to-end','MVP built and verified end-to-end')]},
            {c:['Aura Roadmap', '3040', L('produkcia','production'), L('535 unit + 47/47 e2e testov, dokončené 29.7.2026','535 unit + 47/47 e2e tests, done 29 Jul 2026')]},
            {c:['sperky-ai', '—', L('produkcia','production'), L('e-shop marketing appka, nasadená','e-shop marketing app, deployed')]},
            {c:[L('Aura Suite náhľad (hub)','Aura Suite preview (hub)'), '—', L('dokončené','done'), L('zmergované PR #1, merge commit 817124f','merged PR #1, merge commit 817124f')]},
            {c:[L('AuraAI prezentácia baseline 07/2026','AuraAI baseline presentation 07/2026'), '—', L('dokončené','done'), L('rozpor 1 879 € medzi konfigurátorom a slajdom 08 ešte neuzavretý','a 1,879 € gap between the configurator and slide 08 is still open')]},
            {c:[L('Aura AI (tento refactor)','Aura AI (this refactor)'), '8082', L('vývoj','development'), L('W1 hotové, W4 (hover-card, timeline scrubber, search) otvorené','W1 done, W4 (hover-card, timeline scrubber, search) open')]},
            {c:['Aura Gateway', '—', L('vývoj','development'), L('8 appiek za jedným quick tunelom, 6 pascí zdokumentovaných','8 apps behind one quick tunnel, 6 pitfalls documented')]},
            {c:['Banner Studio', '—', L('na doplnenie','needs input'), L('súčasť Marketing modulu, bez samostatného statusu','part of the Marketing module, no separate status')]},
            {c:['Retouch', '—', L('na doplnenie','needs input'), L('nezaznamenané v pamäti mysle','not recorded in mind memory')]},
            {c:['Aura Logistika', '—', L('na doplnenie','needs input'), L('port neznámy z tejto pamäte','port unknown from this memory')]},
            {c:[L('HR / Interná evidencia','HR / Internal records'), '—', L('na doplnenie','needs input'), L('spomenutá len ako modul hubu, chýba samostatný záznam','mentioned only as a hub module, no standalone record')]},
            {c:['Aura AI Lite', '—', L('na doplnenie','needs input'), L('plán upgradu existujúceho PC, päť cortexov, register N01–N11','plan to upgrade the existing PC, five cortexes, register N01–N11')]}
          ], note:L('12 projektov je overené výskytom v pamäti mysle. Fáza a poznámka sú prevzaté zo záznamov jednotlivých projektov, port je uvedený tam, kde ho pamäť obsahuje.','The 12 projects are verified by their presence in mind memory. Phase and note are taken from each project\'s own records; the port is shown where memory contains it.')},
        {t:'bars', title:L('Projekty podľa fázy','Projects by phase'), data:[
          {l:L('Produkcia / dokončené','Production / done'), v:5},
          {l:L('Vývoj','Development'), v:2},
          {l:L('Na doplnenie','Needs input'), v:5}
        ]},
        {t:'table', title:L('Otvorené body','Open items'), cols:[L('Projekt','Project'),L('Bod','Item'),L('Priorita','Priority')],
          rows:[
            {c:[L('Aura AI (refactor)','Aura AI (refactor)'), L('W4: detail uzla hover-card, timeline scrubber, search na mape','W4: node hover-card, timeline scrubber, search on the map'), 'P1']},
            {c:[L('Aura AI (refactor)','Aura AI (refactor)'), L('bcrypt hash tunela je v gite — pri dlhšej expozícii rotovať','tunnel bcrypt hash is tracked in git — rotate it for longer exposure'), 'P1']},
            {c:['Aura Gateway', L('passkey cez quick tunnel nefunguje (RP_ID sa mení pri reštarte) — treba e-mailový kód ako druhú cestu','passkey does not work via quick tunnel (RP_ID changes on restart) — needs an email code as a second path'), 'P1']},
            {c:['Aura Roadmap', L('zlúčiť 7 requestov Prehľadu do jedného agregačného endpointu','merge the 7 Overview requests into one aggregate endpoint'), 'P2']},
            {c:['Aura KPI', L('read-only DB používateľ kpi_ro pre Logistiku a Marketing','read-only DB user kpi_ro for Logistics and Marketing'), 'P2']},
            {c:[L('AuraAI prezentácia baseline 07/2026','AuraAI baseline presentation 07/2026'), L('rozpor 1 879 € medzi konfigurátorom a scenárom B, uzavrieť pred G3','1,879 € gap between the configurator and scenario B, close before G3'), 'P2']}
          ], note:L('Otvorené body sú overené zo záznamov jednotlivých projektov (Aura Roadmap, Aura KPI, AuraAI refactor, Aura Gateway, prezentácia).','Open items are verified from each project\'s own records (Aura Roadmap, Aura KPI, AuraAI refactor, Aura Gateway, the presentation).')},
        {t:'note', text:L('Aura Logistika, Banner Studio, Retouch a HR/Interná evidencia nemajú v tejto pamäti dosť detailu na overené čísla (port, fáza) — doplniť pri ďalšom mind_recall.','Aura Logistika, Banner Studio, Retouch and HR/Internal records do not have enough detail in this memory for verified figures (port, phase) — fill in on the next mind_recall.')}
      ],
      ai:[
        {q:L('Koľko projektov rodiny Aura beží v produkcii?','How many Aura family projects are running in production?'), a:L('5: Aura KPI, Aura Roadmap, sperky-ai, Aura Suite náhľad (hub) a AuraAI prezentácia baseline — všetky overené dokončené.','5: Aura KPI, Aura Roadmap, sperky-ai, the Aura Suite preview (hub) and the AuraAI baseline presentation — all verified as done.'), cite:'pamäť', act:{l:L('Filtrovať produkciu','Filter production'), k:'filter'}},
        {q:L('Čo chýba dokončiť na Aura AI refactore?','What is left to finish on the Aura AI refactor?'), a:L('W4: detail uzla hover-card, timeline scrubber a search na mape; plus rotácia bcrypt hashu tunela pri dlhšej expozícii.','W4: node hover-card, timeline scrubber and search on the map; plus rotating the tunnel bcrypt hash for longer exposure.'), cite:'pamäť', act:{l:L('Otvoriť Mapu siete','Open Network map'), k:'open'}},
        {q:L('Ktoré projekty potrebujú doplniť dáta?','Which projects need more data?'), a:L('Aura Logistika, Banner Studio, Retouch a HR/Interná evidencia — pamäť pre ne nemá port ani presnú fázu.','Aura Logistika, Banner Studio, Retouch and HR/Internal records — memory has no port or precise phase for them.'), cite:'pamäť', act:null}
      ]
    },

    {
      key:'rozhodnutia', icon:'check',
      title:L('Rozhodnutia','Decisions'),
      sub:L('Register nemenných rozhodnutí — čo, prečo, dôsledok, dátum.','Register of immutable decisions — what, why, consequence, date.'),
      blocks:[
        {t:'kpis', items:[
          {l:L('Rozhodnutí v registri','Decisions in the register'), v:int(25), sub:L('overené výskytom v pamäti','verified by presence in memory'), tone:'ok'},
          {l:L('Z toho 29.7.2026','Of which 29 Jul 2026'), v:int(10), sub:L('kontrakt refactoru','refactor contract'), tone:null},
          {l:L('Z toho 4.8.2026','Of which 4 Aug 2026'), v:int(6), sub:L('tunel a expozícia','tunnel and exposure'), tone:null}
        ]},
        {t:'table', title:null, page:true, cols:[L('Dátum','Date'),L('Rozhodnutie','Decision'),L('Prečo','Why'),L('Dôsledok','Consequence')],
          rows:[
            {c:['29.7.2026', L('Umiestnenie C:\\Aura\\aura-ai','Location C:\\Aura\\aura-ai'), L('nový priečinok, čistý prechod z pôvodného Hadesa','new folder, clean transition from the original Hades'), L('git a dáta sa prenášajú, pôvodný Hades sa vypína','git and data are migrated, the original Hades is shut down')]},
            {c:['29.7.2026', L('/api/v1 zachovať bit-za-bit','Keep /api/v1 byte-for-byte'), L('existujúci payload nesmie zmeniť tvar','the existing payload must not change shape'), L('žiadny konzument API sa počas refactoru nerozbije','no API consumer breaks during the refactor')]},
            {c:['29.7.2026', L('MCP nástroje mind_* → aura_*','MCP tools mind_* → aura_*'), L('nový branding appky','new app branding'), L('dočasné aliasy mind_* počas prechodného obdobia','temporary mind_* aliases during the transition period')]},
            {c:['29.7.2026', L('Vite build a rozsekanie mind.js na moduly vo W0','Vite build and splitting mind.js into modules in W0'), L('5 933 riadkov v jednom IIFE — 10 agentov by sa pobilo v setupControls() (309 riadkov)','5,933 lines in one IIFE — 10 agents would collide in setupControls() (309 lines)'), L('paralelná práca viacerých agentov bez konfliktov','multiple agents can work in parallel without conflicts')]},
            {c:['29.7.2026', L('Graf len desktop, chat aj mobil','Graph desktop-only, chat also on mobile'), L('canvas graf sa na mobile neoplatí, chat áno','a canvas graph is not worth it on mobile, chat is'), L('mobilné rozhranie sa obmedzuje na dnes/chat/denník/knižnicu','the mobile interface is limited to today/chat/journal/library')]},
            {c:['29.7.2026', L('Embeddingy plne v tomto sprinte + 3 deštruktívne nočné joby vypnuté vo W0','Embeddings fully in this sprint + 3 destructive nightly jobs disabled in W0'), L('bezpečnosť dát počas prebiehajúceho refactoru','data safety during the ongoing refactor'), L('auto-merge, mesačná archivácia a prepočet embeddingov zostávajú default vypnuté','auto-merge, monthly archiving and embedding recompute stay off by default')]},
            {c:['29.7.2026', L('Redizajn = len prestavba layoutu, farebné Aura tokeny zostávajú','Redesign = layout rebuild only, Aura color tokens stay'), L('konzistencia s ostatnými appkami rodiny','consistency with the rest of the family apps'), L('nová anatómia obrazoviek a navigácia bez nového farebného systému','new screen anatomy and navigation without a new color system')]},
            {c:['29.7.2026', L('Chatové okno = fullscreen overlay AJ samostatná obrazovka','Chat window = fullscreen overlay AND a standalone screen'), L('rôzne kontexty použitia v priebehu dňa','different usage contexts during the day'), L('jeden modul, dva režimy, prepnutie nezhodí konverzáciu','one module, two modes, switching does not drop the conversation')]},
            {c:['29.7.2026', L('DB migrácia cez mysqldump → import','DB migration via mysqldump → import'), L('čistý prechod dát bez rezíduí','a clean data transition with no leftovers'), L('nový auraai_dbdata volume, starý sa nepoužíva súbežne','new auraai_dbdata volume, the old one is not used in parallel')]},
            {c:['29.7.2026', L('Dáta migrovať 1:1, pôvodný Hades vypnúť','Migrate data 1:1, shut down the original Hades'), L('jeden zdroj pravdy počas prechodu','a single source of truth during the transition'), L('staré prostredie prestáva bežať, žiadny rozchod dát','the old environment stops running, no data drift')]},
            {c:['16.7.2026', L('Zložkovanie pamäte: session → Záznamy, playbooky → Knižnica, digesty → Súhrny, nezaradené → Nezaradené','Structuring memory: session → Records, playbooks → Library, digests → Summaries, unclassified → Unclassified'), L('konzistentná organizácia rastúcej siete','consistent organization of a growing network'), L('nové uzly majú deterministické miesto bez ručného triedenia','new nodes get a deterministic home without manual sorting')]},
            {c:['31.7.2026', L('Node decay: idle >14 dní × 0,97/beh (podlaha 1,0), hrany idle >30 dní × 0,95 (podlaha 0,5)','Node decay: idle >14 days × 0.97/run (floor 1.0), edges idle >30 days × 0.95 (floor 0.5)'), L('sieť sa nemá dusiť nepoužívanými starými uzlami','the network should not get clogged with stale unused nodes'), L('pinned uzly, jadro a manuálne fakty nikdy nedecayujú, mesačný cleanup maže slabé auto hrany','pinned nodes, the core and manual facts never decay, monthly cleanup deletes weak auto edges')]},
            {c:['31.7.2026', L('Similarity-based graph prewiring: nové uzly auto-spojené s top-3 podobnými (váha 0,5)','Similarity-based graph prewiring: new nodes auto-connect to the top-3 most similar (weight 0.5)'), L('network efekt bez ručného prepájania každého uzla','a network effect without manually linking every node'), L('recall robí aj 1-hop graph walk na polovičnú váhu','recall also does a 1-hop graph walk at half weight')]},
            {c:['31.7.2026', L('Tombstone pattern pri zlúčení/archivácii uzla','Tombstone pattern on node merge/archiving'), L('transkript ingest nesmie vzkriesiť zmazaný záznam ako zombieho','the transcript ingest must not resurrect a deleted record as a zombie'), L('tombstones tabuľka + meta.absorbed_keys na cieľovom uzle','a tombstones table + meta.absorbed_keys on the target node')]},
            {c:['31.7.2026', L('Farba = oblasť, tvar = typ uzla, jeden sémantický kanál na vlastnosť','Color = area, shape = node type, one semantic channel per property'), L('čitateľnosť mapy pri stovkách uzlov','map readability with hundreds of nodes'), L('žiadne dekoratívne farby v grafe','no decorative colors in the graph')]},
            {c:['31.7.2026', L('Focus dimming s podlahou 0,30 uzly / 0,20 hrany','Focus dimming with a 0.30 nodes / 0.20 edges floor'), L('kontext má ostať viditeľný pri hoveri, nie zmiznúť','context should stay visible on hover, not disappear'), L('zvyšok grafu stmavne, ale nikdy úplne nezhasne','the rest of the graph dims but never fully turns off')]},
            {c:['—', L('LLM endpoint throttle 20,1 na /api/chat + MCP recall limit clamp 1–30 server-side','LLM endpoint throttle 20,1 on /api/chat + MCP recall limit clamped 1–30 server-side'), L('ochrana pred zneužitím a run-away spendom na modeloch','protection against abuse and run-away model spend'), L('limit platí bez ohľadu na to, čo si pýta klient','the limit applies regardless of what the client requests')]},
            {c:['30.7.2026', L('Akcent rodiny: teal, nie zlatá','Family accent: teal, not gold'), L('konzistencia s ostatnými appkami Aura','consistency with the other Aura apps'), L('spor teal-vs-zlatá v rodine uzavretý','the teal-vs-gold dispute in the family is closed')]},
            {c:['—', L('config/recall.php default od vlny 3: mode=expand, bridge_slots=2, bridge_penalty=0,08, min_score=0,51','config/recall.php default since wave 3: mode=expand, bridge_slots=2, bridge_penalty=0.08, min_score=0.51'), L('najlepší pomer hit@5 k šumu v eval batérii','best hit@5-to-noise ratio in the eval battery'), L('recall čísla merajú produkčnú konfiguráciu, nie laboratórnu','recall numbers measure the production config, not a lab one')]},
            {c:['4.8.2026', L('Verejná expozícia cez Cloudflare quick tunnel za Caddy basic-auth','Public exposure via Cloudflare quick tunnel behind Caddy basic-auth'), L('potreba vzdialeného prístupu k appke','need for remote access to the app'), L('bcrypt hash je v git-trackovanom Caddyfile, treba ho rotovať pri dlhšej expozícii','the bcrypt hash lives in a git-tracked Caddyfile — rotate it for longer exposure')]},
            {c:['—', L('Smernica (prompt builder) ako 5. destinácia Hadesa','Directive (prompt builder) as Hades\' 5th destination'), L('potreba štruktúrovaného promptu pre Claude Code priamo z mysle','need for a structured Claude Code prompt straight from the mind'), L('5 šablón, build zo znalostí s odznakmi overené/neoverené','5 templates, build from knowledge with verified/unverified badges')]},
            {c:['4.8.2026', L('Caddy trusted_proxies static private_ranges v globálnom bloku','Caddy trusted_proxies static private_ranges in the global block'), L('X-Forwarded-Proto sa stráca už v Caddy, nie v Laraveli','X-Forwarded-Proto is lost in Caddy, not in Laravel'), L('appka za tunelom generuje správne https asset URL','the app behind the tunnel generates correct https asset URLs')]},
            {c:['4.8.2026', L('V .env zdvojiť znak dolára pre bcrypt hash','Double the dollar sign for the bcrypt hash in .env'), L('docker compose interpoluje $ z .env aj z env_file','docker compose interpolates $ from both .env and env_file'), L('heslo sa už nerozpadá na nenastavené premenné, 401 mizne','the password no longer breaks into unset variables, the 401 goes away')]},
            {c:['4.8.2026', L('Overovanie appky za basic-auth len cez curl, nie cez user:pass@host v prehliadači','Verifying the app behind basic-auth only via curl, not user:pass@host in the browser'), L('Chrome odmietne zostaviť fetch z takej URL','Chrome refuses to build a fetch from such a URL'), L('API kontroly sú spoľahlivé a nehlásia falošné výpadky','API checks are reliable and do not report false outages')]},
            {c:['4.8.2026', L('Pomenovaný tunel zamietnutý, zvolený quick tunnel','Named tunnel rejected, quick tunnel chosen'), L('named tunnel vyžaduje zónu na Cloudflare NS, ktorú appka nemá','a named tunnel requires a Cloudflare-hosted zone the app does not have'), L('URL sa mení pri reštarte kontajnera, ale appka je dostupná bez vlastnej domény','the URL changes on container restart, but the app is reachable without owning a domain')]}
          ]},
        {t:'timeline', title:L('Časová os rozhodnutí','Decision timeline'), items:[
          [L('16.7.2026','16 Jul 2026'), L('Pravidlá zložkovania pamäte stanovené — platia dodnes','Memory structuring rules established — still in effect today')],
          [L('29.7.2026','29 Jul 2026'), L('10 rozhodnutí kontraktu refactoru zapísaných v jeden deň','10 refactor-contract decisions recorded in a single day')],
          [L('30.7.2026','30 Jul 2026'), L('Akcent rodiny rozhodnutý: teal, nie zlatá — pasca uzavretá','Family accent decided: teal, not gold — pitfall closed')],
          [L('31.7.2026','31 Jul 2026'), L('5 rozhodnutí o grafe a pamäti mysle (decay, prewiring, tombstone, farba/tvar, focus dimming)','5 decisions about the graph and mind memory (decay, prewiring, tombstone, color/shape, focus dimming)')],
          [L('4.8.2026','4 Aug 2026'), L('6 rozhodnutí pri verejnej expozícii cez Cloudflare tunnel','6 decisions during the public exposure via Cloudflare tunnel')]
        ]},
        {t:'note', text:L('Všetkých 25 rozhodnutí je overených zo záznamov session o refactore AuraAI a o Hades pamäti. Register by mal byť v ostrej appke dopĺňaný priebežne cez mind_decision.','All 25 decisions are verified from the AuraAI refactor session records and the Hades memory records. In the live app the register should be kept current via mind_decision.')}
      ],
      ai:[
        {q:L('Koľko rozhodnutí je v registri?','How many decisions are in the register?'), a:L('25, všetky overené výskytom v pamäti mysle — 10 z 29.7.2026 (kontrakt refactoru) a 6 zo 4.8.2026 (tunel a expozícia).','25, all verified by presence in mind memory — 10 from 29 Jul 2026 (the refactor contract) and 6 from 4 Aug 2026 (tunnel and exposure).'), cite:'pamäť', act:null},
        {q:L('Prečo sa MCP nástroje premenúvajú na aura_*?','Why are the MCP tools being renamed to aura_*?'), a:L('Kvôli novému brandingu appky; mind_* aliasy zostávajú počas prechodného obdobia, aby sa nič nerozbilo.','Because of the app\'s new branding; mind_* aliases stay during the transition period so nothing breaks.'), cite:'pamäť', act:{l:L('Otvoriť MCP nástroje','Open MCP tools'), k:'open'}},
        {q:L('Čo hovorí rozhodnutie o farbe a tvare uzlov?','What does the decision on node color and shape say?'), a:L('Farba vždy kóduje oblasť, tvar vždy kóduje typ uzla — jeden sémantický kanál na vlastnosť, žiadne dekoratívne farby.','Color always encodes area, shape always encodes node type — one semantic channel per property, no decorative colors.'), cite:'pamäť', act:{l:L('Otvoriť Mapu siete','Open Network map'), k:'open'}}
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
            {c:['Jewelry protective packaging', L('memory','memory'), {pln:55}, ['cond',L('packaging #1, slabší smer SK→EN','packaging #1, weaker SK→EN direction')]]},
            {c:[L('Zakázané praktiky','Forbidden practices'), L('memory','memory'), {pln:48}, ['ok',L('fraud → #1','fraud → #1')]]},
            {c:[L('Referral & loyalty','Referral & loyalty'), L('skill','skill'), {pln:44}, ['ok',L('loyalty → #1','loyalty → #1')]]}
          ], note:L('Zoznam kandidátov a skóre sú ukážkové — ilustrujú tvar odpovede, nie sú z reálneho behu.','The candidate list and scores are illustrative — they show the shape of the response, not a real run.')},
        {t:'note', text:L('Vlna 1 (HTTP cez GET /api/search, 34 dopytov, overené): hit@5 85,3 % strict, efektívne ~91 % — 3 falošné miss z úzkeho SK ground-truth. Mosty SK↔EN cez HTTP overené efektívne 6/6 (tax, fraud, loyalty, packaging, refund, parcel tracking). Pri 12 súbežných dopytoch p95 latencie 12,7 s.','Wave 1 (HTTP via GET /api/search, 34 queries, verified): hit@5 85.3% strict, ~91% effective — 3 false misses from a narrow SK ground truth. SK↔EN bridges via HTTP verified effectively 6/6 (tax, fraud, loyalty, packaging, refund, parcel tracking). At 12 concurrent queries, p95 latency was 12.7s.')}
      ],
      ai:[
        {q:L('Aký je rozdiel medzi hit@5 vlny 0 a vlny 1?','What is the difference between wave-0 and wave-1 hit@5?'), a:L('Vlna 0 (interné meranie RecallEngine) dala 86,7 %, vlna 1 (cez skutočné GET /api/search, 34 dopytov) dala 85,3 % strict, efektívne ~91 % po odpočítaní 3 falošných miss z úzkeho ground-truth.','Wave 0 (internal RecallEngine measurement) gave 86.7%, wave 1 (via real GET /api/search, 34 queries) gave 85.3% strict, ~91% effective after accounting for 3 false misses from a narrow ground truth.'), cite:'pamäť', act:null},
        {q:L('Prečo je latencia /api/search vysoká?','Why is /api/search latency high?'), a:L('Dominuje živé embedovanie dopytu cez Ollamu na CPU (~2,2 s), bez cache — ten istý dopyt druhýkrát trvá rovnako dlho a pri 12 súbežných dopytoch p95 vyskočí na 12,7 s.','Live query embedding via Ollama on CPU dominates (~2.2s), with no cache — the same query twice takes the same time, and at 12 concurrent queries p95 jumps to 12.7s.'), cite:'pamäť', act:{l:L('Otvoriť Model a runtime','Open Model & runtime'), k:'open'}},
        {q:L('Fungujú mosty SK↔EN cez skutočné API?','Do the SK↔EN bridges work over the real API?'), a:L('Áno, overené efektívne 6/6 cez GET /api/search: tax, fraud, loyalty, packaging, refund, parcel tracking — smer SK→EN je pri packaging o niečo slabší.','Yes, verified effectively 6/6 via GET /api/search: tax, fraud, loyalty, packaging, refund, parcel tracking — the SK→EN direction is somewhat weaker for packaging.'), cite:'pamäť', act:null}
      ]
    },

    {
      key:'model', icon:'server',
      title:L('Model a runtime','Model & runtime'),
      sub:L('Lokálny LLM — router a embeddingy, latencie, eval batéria, budget.','Local LLM — router and embeddings, latencies, eval battery, budget.'),
      blocks:[
        {t:'kpis', items:[
          {l:L('Router presnosť','Router accuracy'), v:'95,3 %', sub:L('qwen3:4b · 41/43 · overené','qwen3:4b · 41/43 · verified'), tone:'ok'},
          {l:L('Model-only presnosť','Model-only accuracy'), v:'87,5 %', sub:L('bez regex vrstvy 1 · overené','without the layer-1 regex · verified'), tone:'ok'},
          {l:L('Embed prekryv','Embed overlap'), v:'3/20', sub:L('bge-m3 · overené','bge-m3 · verified'), tone:'cond'},
          {l:L('Embed latencia (CPU)','Embed latency (CPU)'), v:'~2,2 s', sub:L('živé embedovanie dopytu · overené','live query embedding · verified'), tone:'cond'}
        ]},
        {t:'lines', title:L('Eval batéria naprieč vlnami','Eval battery across waves'),
          labels:['V0','V1','V2','V3','V4','V5','V6','V7','V8','V9','V10','V11'],
          series:[
            {l:L('Router presnosť %','Router accuracy %'), v:[95.3,95.3,95.3,95.3,95.3,95.3,95.3,95.3,95.3,95.3,95.3,95.3], color:'var(--teal)'},
            {l:'hit@5 %', v:[86.7,85.3,85.3,85.3,85.3,85.3,85.3,85.3,85.3,85.3,85.3,85.3], color:'var(--gold)'}
          ], avg:false,
          note:L('Iba V0 a V1 sú zmerané a overené (router 95,3 % pri V0; hit@5 86,7 % pri V0 interne, 85,3 % pri V1 cez HTTP). V2–V11 appka ešte nespustila — v grafe sú zobrazené ako plochá projekcia posledného merania len pre tvar 12-vlnového grafu, nie sú to namerané dáta.','Only V0 and V1 are measured and verified (router 95.3% at V0; hit@5 86.7% at V0 internally, 85.3% at V1 via HTTP). The app has not run V2–V11 yet — the chart shows them as a flat projection of the last measurement purely for the shape of a 12-wave chart, not as measured data.')},
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
        {t:'note', text:L('Konfiguračné hodnoty a presnosti routera/embeddingu sú overené zo záznamov eval batérie (31.7.2026). Runtime prepínač lokálny/cloud je ukážkový — appka dnes beží čisto lokálne. Graf 12 vĺn je ilustratívny nad dvoma reálnymi bodmi.','Config values and router/embedding accuracies are verified from the eval-battery records (31 Jul 2026). The local/cloud runtime switch is illustrative — the app today runs purely locally. The 12-wave chart is illustrative on top of two real data points.')}
      ],
      ai:[
        {q:L('Aký model beží ako router?','Which model runs as the router?'), a:L('qwen3:4b lokálne cez Ollamu, presnosť 95,3 % (41/43) v baseline vlne 0, oproti 87,5 % bez regex vrstvy 1.','qwen3:4b locally via Ollama, 95.3% accuracy (41/43) in the wave-0 baseline, versus 87.5% without the layer-1 regex.'), cite:'pamäť', act:null},
        {q:L('Prečo je embed prekryv rizikový?','Why is the embed overlap risky?'), a:L('Najhorší zhodný pár (dodacia-lehota/delivery-time, 0,460) skóruje pod najlepším nezhodným párom (refund/black-hole, 0,502) — canon sa preto nedá jednoducho zmazať čistým prahom.','The worst matching pair (dodacia-lehota/delivery-time, 0.460) scores below the best non-matching pair (refund/black-hole, 0.502) — so the canon cannot simply be removed with a clean threshold.'), cite:'pamäť', act:null},
        {q:L('Je graf 12 vĺn reálny?','Is the 12-wave chart real?'), a:L('Nie celý — iba V0 a V1 sú zmerané, zvyšok je plochá ilustratívna projekcia, aby graf ukázal tvar 12-vlnového sledovania.','Not entirely — only V0 and V1 are measured, the rest is a flat illustrative projection so the chart shows the shape of 12-wave tracking.'), cite:'ukážka', act:null}
      ]
    },

    {
      key:'mcp', icon:'server',
      title:L('MCP nástroje','MCP tools'),
      sub:L('Nástroje pre Claude Code — meno, vstup, výstup, počet volaní, stav premenovania.','Tools for Claude Code — name, input, output, call count, rename status.'),
      blocks:[
        {t:'kpis', items:[
          {l:L('Aktívne MCP nástroje','Active MCP tools'), v:int(5), tone:'ok'},
          {l:L('Plánované premenovanie','Planned rename'), v:'mind_* → aura_*', sub:L('overené rozhodnutie 29.7.2026','verified decision 29 Jul 2026'), tone:'cond'},
          {l:L('Limit mind_recall','mind_recall limit'), v:'1–30', sub:L('clamped server-side · overené','clamped server-side · verified'), tone:null}
        ]},
        {t:'table', title:L('Nástroje','Tools'), cols:[L('Nástroj','Tool'),L('Vstup','Input'),L('Výstup','Output'),L('Počet volaní','Call count'),L('Stav premenovania','Rename status')],
          rows:[
            {c:['mind_recall', L('query, limit (1–30), session_key','query, limit (1-30), session_key'), L('zoznam relevantných uzlov so skóre','list of relevant nodes with score'), int(482), L('mind_ aktívne, aura_ plánované (alias počas prechodu)','mind_ active, aura_ planned (alias during transition)')]},
            {c:['mind_learn', L('label, type, area, department, popis','label, type, area, department, description'), L('nový alebo aktualizovaný uzol','new or updated node'), int(96), L('mind_ aktívne, aura_ plánované (alias počas prechodu)','mind_ active, aura_ planned (alias during transition)')]},
            {c:['mind_activate', L('label alebo id existujúceho uzla','label or id of an existing node'), L('posilnený uzol (strength +1)','strengthened node (strength +1)'), int(211), L('mind_ aktívne, aura_ plánované (alias počas prechodu)','mind_ active, aura_ planned (alias during transition)')]},
            {c:['mind_decision', L('čo, prečo, dôsledok','what, why, consequence'), L('nemenný záznam v registri rozhodnutí','immutable entry in the decision register'), int(25), L('mind_ aktívne, aura_ plánované (alias počas prechodu)','mind_ active, aura_ planned (alias during transition)')]},
            {c:['mind_overview', L('bez vstupu','no input'), L('súhrn oblastí, oddelení a počtov uzlov','summary of areas, departments and node counts'), int(34), L('mind_ aktívne, aura_ plánované (alias počas prechodu)','mind_ active, aura_ planned (alias during transition)')]}
          ], note:L('Popisy nástrojov a plán premenovania mind_* → aura_* (s dočasnými aliasmi) sú overené rozhodnutia z 29.7.2026. Počty volaní sú ukážkové.','Tool descriptions and the mind_* → aura_* rename plan (with temporary aliases) are verified decisions from 29 Jul 2026. Call counts are illustrative.')},
        {t:'banner', tone:'cond', text:L('POST /api/chat je throttlovaný Laravel middlewarom throttle:20,1 a MCP recall limit je server-side clampnutý na 1–30 bez ohľadu na to, čo si pýta klient — ochrana pred zneužitím a run-away spendom (overené).','POST /api/chat is throttled by the Laravel middleware throttle:20,1 and the MCP recall limit is clamped server-side to 1-30 regardless of what the client requests — protection against abuse and run-away spend (verified).')},
        {t:'note', text:L('Zoznam a popis nástrojov sú overené zo záznamov mysle. Presné počty volaní appka dnes takto neagreguje — sú ukážkové pre tvar tabuľky.','The tool list and descriptions are verified from mind records. The app does not currently aggregate exact call counts this way — they are illustrative to show the table shape.')}
      ],
      ai:[
        {q:L('Prečo sa MCP nástroje volajú mind_* a nie aura_*?','Why are the MCP tools called mind_* and not aura_*?'), a:L('mind_* je pôvodné pomenovanie z Hadesa. Rozhodnutie z 29.7.2026 hovorí premenovať na aura_* kvôli novému brandingu appky, s dočasnými mind_* aliasmi počas prechodu.','mind_* is the original naming from Hades. A decision from 29 Jul 2026 says to rename to aura_* for the app\'s new branding, with temporary mind_* aliases during the transition.'), cite:'pamäť', act:{l:L('Otvoriť Rozhodnutia','Open Decisions'), k:'open'}},
        {q:L('Ako je mind_recall chránený pred zneužitím?','How is mind_recall protected from abuse?'), a:L('Server-side clampne limit argument na rozsah 1–30 bez ohľadu na to, čo si pýta klient; POST /api/chat má navyše Laravel throttle 20 volaní za minútu.','The server clamps the limit argument to the 1-30 range regardless of what the client requests; POST /api/chat additionally has a Laravel throttle of 20 calls per minute.'), cite:'pamäť', act:null},
        {q:L('Čo robí mind_decision?','What does mind_decision do?'), a:L('Zapíše nemenné rozhodnutie (čo, prečo, dôsledok) do registra rozhodnutí — presne v tvare, aký vidno na obrazovke Rozhodnutia.','It writes an immutable decision (what, why, consequence) into the decision register — exactly in the shape seen on the Decisions screen.'), cite:'appka', act:{l:L('Otvoriť Rozhodnutia','Open Decisions'), k:'open'}}
      ]
    },

    {
      key:'nastavenia', icon:'gear',
      title:L('Nastavenia','Settings'),
      sub:L('Oblasti a oddelenia, nočné joby, expozícia Caddy + Cloudflare tunel, zálohy.','Areas and departments, nightly jobs, Caddy + Cloudflare tunnel exposure, backups.'),
      blocks:[
        {t:'table', title:L('Oblasti a oddelenia (výber)','Areas and departments (selection)'), cols:[L('Oblasť','Area'),L('Príklady oddelení','Example departments'),L('Uzlov v oblasti','Nodes in area'),L('Poznámka','Note')],
          rows:[
            {c:[L('Vývoj & kód','Development & code'), 'Backend, Frontend, DevOps, Security, AI nástroje, AI engineering, IT', int(271), L('najväčšia oblasť','the largest area')]},
            {c:[L('Biznis & projekty','Business & projects'), L('Aplikácie, Aura ekosystém, Hospodársky','Applications, Aura ecosystem, Finance'), int(160), '']},
            {c:[L('Marketing & SEO','Marketing & SEO'), 'AI-mind, DevOps, Reporting & dataviz', int(152), '']},
            {c:[L('Osobné & preferencie','Personal & preferences'), L('Produktivita','Productivity'), int(91), '']},
            {c:[L('Dizajn & kreatíva','Design & creativity'), L('Design, know-how','Design, know-how'), int(36), '']}
          ], note:L('5 oblastí, príklady oddelení a počty uzlov na oblasť sú overené k momentke 31.7.2026 (skill-tree prototyp z mind_overview). Presný celkový počet oddelení (72) je z tej istej momentky a mohol odvtedy narásť.','The 5 areas, example departments and per-area node counts are verified as of the 31 Jul 2026 snapshot (skill-tree prototype from mind_overview). The exact total department count (72) is from that same snapshot and may have grown since.')},
        {t:'form', title:L('Nočné joby','Nightly jobs'), fields:[
          {l:L('Automatické zlučovanie podobných uzlov','Auto-merge similar nodes'), v:'', type:'switch', on:false},
          {l:L('Mesačná archivácia (>90 dní)','Monthly archiving (>90 days)'), v:'', type:'switch', on:false},
          {l:L('Prepočet embeddingov','Recompute embeddings'), v:'', type:'switch', on:false},
          {l:L('Node decay (idle >14/30 dní)','Node decay (idle >14/30 days)'), v:'', type:'switch', on:true}
        ], note:L('3 deštruktívne nočné joby boli vo W0 refactoru vedome vypnuté a v tomto náhľade zostávajú vypnuté ako default (overené rozhodnutie 29.7.2026). Node decay je odlišný, nedeštruktívny mechanizmus a beží.','3 destructive nightly jobs were deliberately disabled in the W0 refactor and stay off by default in this preview (verified decision, 29 Jul 2026). Node decay is a separate, non-destructive mechanism and runs.')},
        {t:'banner', tone:'cond', text:L('Appka je verejne exponovaná cez Cloudflare quick tunnel za Caddy basic-auth (docker-compose profil tunnel, služba cloudflared → http://caddy:8095). Heslo (bcrypt hash) je v git-trackovanom Caddyfile — pri dlhšej expozícii ho treba rotovať. Rovnaký vzor sa rozširuje na aura-gateway pre celú rodinu appiek za jedným linkom.','The app is publicly exposed via a Cloudflare quick tunnel behind Caddy basic-auth (docker-compose profile tunnel, cloudflared service → http://caddy:8095). The password (bcrypt hash) lives in a git-tracked Caddyfile — rotate it for longer exposure. The same pattern is being extended to aura-gateway for the whole app family behind one link.')},
        {t:'list', title:L('Zálohy','Backups'), items:[
          {title:L('.env záloha pred tunelom','.env backup before the tunnel'), sub:'backups/.env.pre-tunnel.bak', badge:['ok',L('overené','verified')]},
          {title:L('DB / mesačná záloha AuraAI','DB / monthly AuraAI backup'), sub:L('nezdokumentované v tejto pamäti — doplniť','not documented in this memory — to fill in'), badge:['q',L('doplniť','to fill in')]}
        ], note:L('Iba .env záloha pred tunelovaním je v pamäti overená. Plán pravidelných DB záloh pre AuraAI (na rozdiel od Aura KPI a Aura Roadmap, ktoré mysqldump zálohy majú zdokumentované) tu chýba.','Only the .env backup before tunneling is verified in memory. A regular DB backup plan for AuraAI (unlike Aura KPI and Aura Roadmap, which have documented mysqldump backups) is missing here.')},
        {t:'note', text:L('Konfigurácia recall.php a stav testov (505 PHP testov zelených) sú overené. Rozdelenie oddelení do oblastí a plán záloh sú čiastočný, ukážkový výber z reálnej štruktúry.','The recall.php configuration and the test status (505 PHP tests green) are verified. The area/department split and the backup plan are a partial, illustrative selection from the real structure.')}
      ],
      ai:[
        {q:L('Ako je appka verejne dostupná?','How is the app publicly reachable?'), a:L('Cez Cloudflare quick tunnel (docker-compose profil tunnel, služba cloudflared) mierený na http://caddy:8095, za Caddy basic-auth. Overené 4.8.2026, 505 PHP testov zelených.','Via a Cloudflare quick tunnel (docker-compose profile tunnel, cloudflared service) pointed at http://caddy:8095, behind Caddy basic-auth. Verified 4 Aug 2026, 505 PHP tests green.'), cite:'pamäť', act:null},
        {q:L('Prečo sú nočné joby vypnuté?','Why are the nightly jobs disabled?'), a:L('3 deštruktívne joby (auto-merge, mesačná archivácia, prepočet embeddingov) boli vo W0 refactoru vedome vypnuté kvôli bezpečnosti dát počas prebiehajúceho refactoru — overené rozhodnutie.','3 destructive jobs (auto-merge, monthly archiving, embedding recompute) were deliberately disabled in the W0 refactor for data safety during the ongoing refactor — a verified decision.'), cite:'pamäť', act:{l:L('Otvoriť Rozhodnutia','Open Decisions'), k:'open'}},
        {q:L('Je záloha databázy AuraAI zdokumentovaná?','Is the AuraAI database backup documented?'), a:L('Nie, iba .env záloha pred tunelovaním je overená; pravidelná DB záloha pre AuraAI v pamäti chýba, na rozdiel od Aura KPI a Aura Roadmap.','No, only the .env backup before tunneling is verified; a regular DB backup for AuraAI is missing in memory, unlike Aura KPI and Aura Roadmap.'), cite:'pamäť', act:null}
      ]
    }

  ]
};
