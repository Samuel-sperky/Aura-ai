# Aura ekosystém — opis aplikácií

Stav k **7. 8. 2026**. Zdroj: Hades MCP (`mind_overview`, `mind_recall`) + repo `Samuel-sperky/Aura-ai`.

Ekosystém má tri vrstvy, ktoré sa často zamieňajú:

| Vrstva | Čo to je | Zástupca |
| --- | --- | --- |
| **Myseľ** | pamäť a AI jadro — vie, čo sa v rodine stalo | Hades (jadro) + AuraAI (rozhranie) |
| **Rozcestník** | jedna obrazovka nad všetkými appkami | AuraHub |
| **Appky** | samotné nástroje, každá s vlastnou DB a loginom | sperky-ai, KPI, Logistika, Roadmap, Zľavy… |

Legenda stavov, používaná v celom dokumente:

| Stav | Význam |
| --- | --- |
| `beží` | nasadené, overené naživo, používa sa |
| `postavené` | hotové a otestované, chýba nasadenie alebo posledný krok od používateľa |
| `rozpracované` | kód existuje, nie je dokončené ani overené |
| `plán` | rozhodnuté, nezačaté |
| `neexistuje` | spomínané v mockupe, reálne nič nie je |

Porovnanie nasadeného a nenasadeného stavu je v samostatnej sekcii nižšie — tam sú tie isté artefakty zoradené podľa **stupňa nasadenia A–D**, nie podľa appky.

---

## Prehľad portov

Jediná tabuľka, ktorú treba pozerať pred štartom novej appky — kolízia portu je najčastejšia chyba pri nasadení.

| Port | Appka | Kontajnery | Stav |
| --- | --- | --- | --- |
| 3000 | sperky-ai (Marketing) | `aura_net` | `beží` |
| 3010 | Northstar V3 (archív) | `northstar-roadmap`, `northstar-mailer` | `beží` — nedotknutý archív |
| 3011 | ads-hierarchy | worktree `aura-web` | `beží` |
| 3020 | Aura Logistika | `aura-logistika-app`, `-db` | `beží` |
| 3030 | Aura KPI | `aura-kpi-app`, `-db` | `beží` |
| 3040 | Aura Roadmap | `aura-roadmap-app`, `-db` | `beží` |
| 3050 | **AuraHub** | `aura-hub-app` | `beží` (len 127.0.0.1) |
| 3070 | Aura Zľavy (`ovl-da-zliav`) | `ovl-zliav-app`, `-db`, `-caddy` | `postavené`, chýba seed admina |
| 8082 | **AuraAI** | `auraai-app-1`, `auraai-cloudflared-1` | `beží` |
| 8091 | Aura Banner Studio | `bannery-app`, `-db`, `-ngrok` | `beží` |
| 8095 | Caddy pred AuraAI | `caddy` | `beží` |

> Pozor: kontrakt Aura Zliav hovoril port 3050, ten však bol už obsadený AuraHubom → appka reálne beží na **3070**. Kontrakt v tomto bode neplatí.

---

# Nasadené vs nenasadené

Toto je jadro dokumentu. „Hotové" a „nasadené" nie je to isté a v tejto rodine sa to rozchádza na štyroch miestach naraz — appka môže bežať a byť nepoužiteľná, alebo byť dokončená a nikde nebežať.

Rozlišujem preto **štyri stupne**, nie dva:

| Stupeň | Znamená | Koľko artefaktov |
| --- | --- | --- |
| **A — nasadené a funkčné** | beží v Dockeri, používa sa, robí to, na čo je | 6 |
| **B — nasadené, nedokončené** | beží, ale kus funkcie chýba alebo je vypnutý | 3 |
| **C — postavené, nenasadené** | kód existuje a je otestovaný, nikde nebeží | 4 |
| **D — nenasadené vôbec** | plán, rozpracované alebo neexistuje | 6 |

## Matica nasadenia

Päť dimenzií, na ktorých sa „nasadené" reálne meria. Prázdna bunka = nie.

| Artefakt | Beží v Dockeri | Git remote | Testy | Verejne dostupné | V AuraHube |
| --- | --- | --- | --- | --- | --- |
| sperky-ai | ✅ `:3000` | ✅ `aura-web` | ✅ 105 + 3 | | ⚠️ endpoint rozpracovaný |
| Aura KPI | ✅ `:3030` | ❌ len lokálny git | ❌ 0 | | ✅ živé dáta |
| Aura Logistika | ✅ `:3020` | ❌ baseline `41b7165` bez remote | ❌ 0 | | ✅ živé dáta |
| Aura Roadmap | ✅ `:3040` | ❌ `gh` chýbalo → nepushnuté | ✅ 535 + 47 | | ⚠️ endpoint rozpracovaný |
| Aura Banner Studio | ✅ `:8091` | ❌ repo + push otvorené | ❌ 0 | | |
| AuraAI | ✅ `:8082` | ⚠️ commit `f5f9840` **bez pushu** | ✅ 505 | ✅ CF tunnel za basic-auth | — |
| AuraHub | ✅ `:3050` | ❌ commit `95dcccf` bez remote | ✅ 37 | ❌ loopback only, zámerne | — |
| Aura Zľavy | ✅ `:3070` | ✅ `Samuel-sperky/ovl-da-zliav` | ✅ 866 + 30 | ❌ 127.0.0.1, žiadny tunel | |
| aura-design | ➖ nie je služba | ❌ `main` bez remote | ✅ 30 | — | — |
| Aura Suite (mockup) | ➖ HTML | ✅ PR #1 `817124f` | ➖ | | — |
| Aura Takt | ➖ HTML | ➖ | ➖ | | — |
| Northstar V3 | ✅ `:3010` | ➖ archív | ❌ 1 súbor | | — |

**Čo z matice vypadne na prvý pohľad:** verejne dostupná je **jedna jediná** appka z jedenástich (AuraAI, a to za basic-auth). A **šesť artefaktov nemá git remote** — beží kód, ktorý existuje v jedinej kópii na jednom PC.

## A — nasadené a funkčné (6)

| Artefakt | Kde | Odkedy |
| --- | --- | --- |
| sperky-ai | `:3000` | produkčná, najstaršia |
| Aura KPI | `:3030` | 23. 7. 2026 |
| Aura Logistika | `:3020` | pred KPI |
| Aura Roadmap | `:3040` | 29. 7. 2026, doladené 30. 7. |
| Aura Banner Studio | `:8091` | Pipeline 1 naživo |
| Northstar V3 | `:3010` | archív, zámerne nedotknutý |

## B — nasadené, ale nedokončené (3)

Tie najzradnejšie. Appka odpovedá na `/api/health`, takže monitoring je zelený, ale funkciu nemá.

| Artefakt | Čo beží | Čo chýba | Dôsledok |
| --- | --- | --- | --- |
| **AuraHub** `:3050` | shell, 6 kariet, keš, kontrakt, 37 testov | `/api/summary` v Roadmape, sperky-ai a HR | **4 zo 6 kariet nemá dáta.** Hub korektne hlási dôvod namiesto čísla, takže to nevyzerá ako porucha — ale rozcestník bez čísel neplní účel |
| **Aura Zľavy** `:3070` | celý stack + Caddy, `boot_ok`, `db:true` | seed admina (chce reálne TTY) a onboarding v UI; `WRITES_ENABLED=false` | **Nasadené a nepoužiteľné.** Bez účtu sa nedá prihlásiť, bez kľúča appka nič nezapíše. Presne toto sa už raz stalo: `users=0` → všetky API volania `401` → UI plné červených chýb, hoci appka bola zdravá |
| **AuraAI** `:8082` | mapa mysle (W1), agent centre (W0), chat, tunel | W4 (hover-card uzla, timeline scrubber, search), lokálny LLM, embeddings | Mapa sa dá prezerať, ale nedá sa v nej **hľadať** — pri 800 uzloch je to citeľné |

## C — postavené, ale nenasadené (4)

Hotové a otestované, nikde to nebeží ako služba.

| Artefakt | Prečo nie je nasadené | Čo by nasadenie znamenalo |
| --- | --- | --- |
| **aura-design** | zámerne — nie je to služba ani npm balík, distribuuje sa **kopírovaním** cez `sync.mjs` | „nasadené" = skopírované do appky; overené je to len pre bridge vrstvy, do ktorých appiek reálne dorazilo, **som nemeral** |
| **Aura Suite** (mockup) | je to predloha, nie appka — svoju úlohu splnil a AuraHub z neho vznikol | nič, je to zámer |
| **Aura Takt** | jednosúborový HTML bez servera | otvoriť súbor; perzistencia je cez export/import JSON, nie DB |
| **`/api/summary` pre Roadmap + sperky-ai** | agenti spadli na session limit, zmeny zostali **necommitnuté** na `feat/suite-visuals` (5 + 3 súbory) | odblokuje 2 zo 4 mŕtvych kariet hubu — **jediná položka v tejto tabuľke, ktorá reálne blokuje inú appku** |

## D — nenasadené vôbec (6)

| Vec | Stupeň | Poznámka |
| --- | --- | --- |
| **Tržby appka** | neexistuje | existuje len karta v mockupe a report za júl 2026 (217 016 €) |
| **HR `/api/summary`** | neexistuje | HR karta v hube nemá čo čítať; `aura-hr-mapa` je predloha rodiny, nie appka s endpointom |
| **Auth pred AuraHub** | plán | **blokuje expozíciu hubu** — bez neho by boli čísla všetkých appiek verejné bez hesla |
| **Read-only DB users** `kpi_ro`, `roadmap_ro` | plán | dovtedy sa integrácie medzi appkami robia ručne |
| **i18n v sperky-ai** | vyňaté rozhodnutím | 5 760 inline `style={{}}`, 0 UI i18n na 233 000 riadkoch → samostatný projekt 3–5 M tokenov |
| **SMTP e-maily, Admin-Evidencia** (KPI) | vynechané | nahradené in-app badge |

## Tri vzory, ktoré z porovnania vyšli

**1. Nasadené ≠ použiteľné.** Dva z troch prípadov stupňa B by prešli akýmkoľvek healthcheckom. Zľavy to už raz predvedli naostro: Samuel videl appku plnú červených chýb a príčina nebola chyba v kóde, ale **chýbajúci admin účet** — a appka mu to nepovedala. Akceptačné kritérium „beží" musí znamenať „prihlásim sa a spravím jednu reálnu operáciu", nie „`/api/health` vráti 200".

**2. Bez remote znamená jediná kópia.** Šesť artefaktov beží z kódu, ktorý nie je nikde inde než na tom PC — vrátane AuraAI, kde je posledný commit s tunelom (`f5f9840`) **nepushnutý**, a vrátane Roadmapu, kde je chýbajúci `git remote add + push` zapísaný ako **jediné nesplnené akceptačné kritérium** celého kontraktu. Dôvod je zhodný a banálny: `gh` nebolo v prostredí nainštalované. Je to najlacnejšia otvorená položka v celom zozname a zároveň tá s najhoršou stratou pri poruche disku.

**3. Rozpracované na branchi je horšie než nezačaté.** `/api/summary` pre Roadmap a sperky-ai je napísané, ale necommitnuté na `feat/suite-visuals`. Vyzerá to ako „takmer hotové", takže sa to neplánuje znova — ale nikto nevie, či to funguje, a nikto to nedokončí, kým to niekto neotvorí. Nezačatá práca je aspoň v zozname.

---

## Hades — jadro pamäti

**Čo to je:** živá neurónová sieť, ktorá sa učí z každého rozhovoru v Claude Code. Pamätá si skills, spomienky a projekty a nikdy nezabúda. Repo `Samuel-sperky/hades.git`, stack Laravel/PHP + MariaDB v Dockeri, MCP server nad Streamable HTTP (JSON-RPC).

**Stav:** `beží` a **ďalej sa rozvíja**.

> Hades sa **nevypína ani nenahrádza.** AuraAI nie je jeho náhrada, je to rozhranie a ďalšia vrstva nad tým istým žijúcim jadrom: Hades zostáva jadrom vedomia (uzly, hrany, MCP nástroje), AuraAI mu dáva appku, mapu, chat a agentov. Migrácia dát 1:1 je presun na nový stack, nie odchod z Hadesa. Plánuje sa vo **vlnách rozvoja** — nie ku „koncu života".

### Rozmery mysle (merané 7. 8. 2026)

| Metrika | Hodnota |
| --- | --- |
| Uzly | 800 |
| Hrany | 2 617 |
| Vyžaduje revíziu | 5 |
| Typy uzlov | `skill`, `memory`, `project` |

### Oblasti

| Oblasť | Uzly | Oddelení |
| --- | --- | --- |
| Vývoj & kód | 303 | 33 |
| Biznis & projekty | 178 | 17 |
| Marketing & SEO | 178 | 25 |
| Osobné & preferencie | 97 | 8 |
| Dizajn & kreatíva | 40 | 4 |

Oddelenia typu `Záznamy — <projekt>` sú automatické archívy sessions, nie ručne vedené kategórie — preto ich je v Vývoji 33.

### MCP nástroje

| Nástroj | Kedy volať |
| --- | --- |
| `mind_recall` | na začiatku session s témou; kedykoľvek treba starší kontext |
| `mind_overview` | pred `mind_learn`, na výber správnej oblasti/oddelenia |
| `mind_learn` | keď vznikne nová zručnosť, fakt o používateľovi alebo projekt |
| `mind_activate` | keď sa už známa zručnosť použije znova |
| `mind_decision` | zápis rozhodnutia |

**Tvrdé pravidlo:** do mysle nikdy nejdú heslá, API kľúče, finančné ani zdravotné údaje.

**Pasca pri čítaní:** `mind_recall` na širokú tému vráti 90 000+ znakov (celé popisy projektov sú dlhé odstavce, nie súhrny). Buď obmedziť `limit` na 3–5 uzlov, alebo výstup čítať zo súboru — inak zaberie polovicu kontextu.

---

## AuraAI — refactor Hadesa

**Čo to je:** Hades prestavaný na plnohodnotnú appku rodiny Aura — `C:\Aura\aura-ai`. Pridáva vlastné chatové okno, lokálny LLM v Dockeri a vizuálnu mapu mysle. `/api/v1` zostáva **bit-za-bit rovnaké**, aby existujúci klienti nespadli.

**Stav:** `beží` na `http://localhost:8082`, verejne exponované cez Cloudflare quick tunnel od 4. 8. 2026. Brána: 505 PHP testov zelených.

### Rozhodnutia, ktoré určujú tvar appky

| Téma | Rozhodnutie |
| --- | --- |
| Umiestnenie | `C:\Aura\aura-ai` — nový priečinok, prenesený git aj dáta |
| Migrácia dát | `mysqldump` → import do čistého `auraai_dbdata`, 1:1 |
| Pôvodný Hades | **rozvíja sa ďalej** — AuraAI je vrstva nad ním, nie jeho náhrada |
| MCP nástroje | `mind_*` → `aura_*`, s `mind_*` aliasmi počas prechodu |
| `/api/v1` | zachovať bez zmeny payloadu |
| Redizajn | prestavba layoutu a navigácie; farebné Aura tokeny zostávajú |
| Build | Vite + rozsekanie `mind.js` (5 933 LOC v jednom IIFE) na ES moduly |
| Mobil | chat a dashboardy áno, graf desktop-only |
| Chat | jeden modul, dva režimy — fullscreen overlay aj samostatná obrazovka; prepnutie nezhodí konverzáciu |

### Hotové vlny

**W0 — agent command centre** (`postavené`): statický `AgentRegistry` s 23 agentmi (17 class-based, 4 closure `aura:*`, 2 placeholdery), tabuľka + model `agent_runs`, event `AgentPulse` (`ShouldBroadcastNow`, kanál `agents`), job `RunAgentJob` (Artisan::call, heuristický progres 50/100, respektuje `paused`), `AgentController` s `/api/agents`. Deštruktívny run bez flagu = `423 destructive_disabled`, placeholder = `422`. 7/7 testov.

**W1 — radiálna mapa mysle** (`postavené`, 31. 7. 2026): domovskou obrazovkou je `graf`. Nový izolovaný balík `resources/js/graph/map/` — deterministický radiálny layout (mulberry32 seed z ID → stabilné pozície), 4-úrovňový stavový stroj `mapa → oblasť → oddelenie → uzol`, rotácia konštelácie, tweenovaná kamera, jadro ako radiálna projekcia celej siete, intro ~2,5 s (za `prefers-reduced-motion` vypnuté), hash router `#mapa/<area>/<dept>/<nodeId>` s deep-linkom. Starý d3-force draw path je pre obrazovku `graf` vypnutý. 13 nových testov.

**Neurobené (W4):** hover-card detailu uzla, timeline scrubber, search na mape — úroveň `node` je na to pripravená.

### Expozícia

Služba `cloudflared` v `docker-compose.yml` pod profilom `tunnel`, mieri na `http://caddy:8095` — teda **za** basic-auth Caddy, HTTP aj WebSocket jedným tunelom.

```bash
docker compose --profile tunnel up -d cloudflared
docker logs auraai-cloudflared-1        # tu sa prečíta verejná URL
```

Overené cez verejnú URL: `/` = `401` basic-auth, `POST /mcp?token=` = `200` s `tools/list`.

### Nedoriešené

| Vec | Prečo to je problém |
| --- | --- |
| bcrypt hash tunelového hesla je v git-trackovanom `docker/Caddyfile` | je to **jediná** brána medzi internetom a appkou — pri dlhodobom exponovaní rotovať |
| quick tunnel URL sa mení pri každom restarte | stabilná URL vyžaduje zónu na Cloudflare NS |
| lokálny LLM (Ollama) a embeddings | zapojené v pláne, 3 deštruktívne nočné joby zámerne vypnuté vo W0 |

---

## AuraHub — rozcestník rodiny

**Čo to je:** jedna obrazovka nad všetkými appkami. `C:\Aura\aura-hub`, port **3050** (mapping len `127.0.0.1:3050:3000`), kontajner `aura-hub-app`, Node 22 alpine + Express 4, **bez databázy** — hub nič nevlastní, čísla patria appkám. 37 testov (`node:test`) zelených, git `main`, commit `95dcccf`, bez remote.

**Stav:** `beží`, ale len 2 z 6 kariet majú živé dáta.

### Architektúra

Každá appka vystavuje `GET /api/summary`, chránený zdieľaným tokenom v hlavičke `X-Aura-Hub-Token` (timing-safe compare). Hub sa dopytuje paralelne, validuje payload proti kontraktu (`server/src/contract.js`) a kešuje 30 s so zdieľaním jedného dopytu medzi súbežnými čitateľmi.

**Odpovede `/api/summary`:**

| Status | Body | Význam |
| --- | --- | --- |
| 200 | `{ metrics, spark, attention }` | OK |
| 401 | `unauthorized` | chýbajúci alebo nesprávny token |
| 503 | `hub_token_not_configured` | appka token nemá nastavený |
| 503 | `db_unavailable` | appka žije, jej DB nie |

**Kontrakt payloadu:**

| Pole | Pravidlo |
| --- | --- |
| `metrics` | 1–3 položky; `value` **vždy** číslo; `tone` ∈ `ok` \| `cond` \| `no` \| `neutral` |
| `spark` | prázdne alebo 6–12 čísel |
| `attention` | 0–3 položky; `severity` ∈ `no` \| `cond` |
| labely | `*_sk` aj `*_en` |

Hub je v Docker sieti každej appky ako external guest (`aura-kpi_aura-kpi`, `aura-logistika_aura-logistika`, `aura-roadmap_aura-roadmap`, `sperky-ai_aura_net`) a adresuje kontajnery menami na porte 3000.

### Tri pravidlá

1. **Nikdy nezobraz číslo, ktorému neveríš.** Nedostupná appka, neplatný payload alebo odpoveď za iný modul renderuje **dôvod**, nikdy staré ani zástupné číslo.
2. **Jedna appka nesmie zhodiť stránku.** Timeout 4 s, degraduje jedna karta.
3. **Hub nesmie zaťažovať appky.** Preto tá 30 s keš a zdieľanie dopytu.

### Stav pripojenia modulov

| Karta | `/api/summary` | Stav |
| --- | --- | --- |
| KPI | áno (commit `8003483`) | `beží` — živé dáta |
| Logistika | áno (commit `0ffec3d`) | `beží` — živé dáta |
| Roadmap | **nie** | `rozpracované` — 5 súborov necommitnutých na `feat/suite-visuals` |
| Marketing (sperky-ai) | **nie** | `rozpracované` — 3 súbory necommitnuté |
| HR | **nie** | `plán` |
| Tržby | — | `neexistuje` (appka ako taká) |

Karty bez endpointu to **korektne hlásia** — nezobrazujú vymyslené čísla.

### Bezpečnosť

Hub **nemá vlastné prihlásenie** (je to rozcestník nad appkami, ktoré login majú), preto loopback-only + `noindex`. Striktná CSP bez `unsafe-inline`, `X-Frame-Options: DENY`, non-root kontajner.

> **PRED TUNELOVANÍM TREBA PRIDAŤ AUTH.** Inak sú hlavičkové čísla všetkých appiek verejné bez hesla.

---

## Appky rodiny

### Rodina má dve technologické vetvy

Toto je najdôležitejší fakt pri každom rozhodnutí „kde to postavíme". Rodina **nie je 9 appiek, ale 5** — `ads-hierarchy`, `aura-redesign`, `aura-prototype` a `mindmap-orient` sú git worktree jedného repa `aura-web` (= sperky-ai), nie samostatné projekty.

| | Vetva A — vanilla SPA | Vetva B — Next |
| --- | --- | --- |
| Línia | `aura-hr-mapa` → `aura-logistika` → `aura-kpi` → `aura-banner-studio` | `sperky-ai` → `aura-roadmap` → `ovl-da-zliav` |
| Stack | Node 20 + Express 4 + MariaDB + JWT, bez build stepu | Next.js 16 + React 19 + TS + MariaDB 11.4 |
| Auth | JWT cookie | argon2id + jose + `app_sessions` per request |
| API | ručné route | `defineRoute()` pipeline auth → rateLimit → zod → handler |
| Testy | 0 | vitest + Playwright + axe |
| Bezpečnosť | bez CSRF, bez rate-limitu, fallback heslá v kóde | CSRF fail-closed, rate-limit, lockout, CSP, non-root |
| Distribúcia CSS | `styles.css` sa kopíruje 1:1 medzi appkami | `globals.css` + CSS modules |

**Pravidlo pre nové appky: stavaj na vetve B.** Má bezpečnostný a testovací základ, ktorý sa dodatočne dopĺňa drahšie, než sa fork spraví na začiatku. Vetva A sa hodí len na jednoduché interné CRUD nástroje bez expozície.

**Tokeny:** obe vetvy majú **rovnaké hodnoty**, len iné názvy — `--paper`→`--bg`, `--surface`→`--panel`, `--ink-soft`→`--ink2`, `--line`→`--border`, `--ok`→`--success`. Pri prenose dizajnu sa mapujú názvy, hodnoty sa nemenia.

---

### sperky-ai (Marketing)

Najstaršia a najväčšia appka, produkčná, port 3000, sieť `aura_net`. Vetva B, ~233 000 riadkov, 719 súborov, 43 numerovaných migrácií s `_migrations` ledgerom, reálny zálohový systém s restore-testom.

**Stav:** `beží`.

**Kritické zistenie z reconu (3. 8. 2026):** appku **nie je možné prefarbiť zmenou tokenov** — má 5 760 inline `style={{}}` proti 3 829 `className`, vizuál je zapečený v JSX s hardcoded hodnotami. Navyše 0 UI i18n a 0 render testov na 52 komponentov. Zavedenie i18n je tam **samostatný projekt na 3–5 M tokenov**, nie súčasť dizajnovej úlohy.

### Aura KPI — port 3030

Mesačné a ročné sledovanie KPI tímu podľa 14 xlsx (Master + 11 oddelení + Team score). Vetva A. **Stav:** `beží`, MVP overené end-to-end v Dockeri, 8 commitov, sprint 8 agentov.

Metodika: `plnenie = (skutočnosť − Min) / (Max − Min)`, cap 100 %; Team score = priemer 6 zložiek; Copywriter váhy 60/20/20; Import tolerancia 5 %. Farebná škála plnenia: zelená ≥ 100, žltá 60–99, červená < 60, sivá.

Postavené: 12 oddelení / 16 metrík / 38 vstupov / 48 pásiem, login + roly + M:N práva, dashboard, analýza, rok, heatmapa, A/B, „Vyplň mesiac", modul „Na doplnenie", denníky, integrácie Logistika + SEO (read-only s graceful fallbackom), SEO porada (72 otázok), xlsx export, polročný/ročný report, audit, zálohy, SK/EN, dark mode.

Vynechané: Admin-Evidencia, SMTP e-maily (len in-app badge).

**Otvorené:** read-only DB user `kpi_ro` v `aura_logistika` + `aura_marketing` (dovtedy sa integrácie robia ručne), `year_refs` UI pre 2025 tržby/COGS (bez nich sa YoY tržba a Import tolerancia nedopočíta).

### Aura Logistika — port 3020

Týždenná evidencia zásielok a reklamácií. Vetva A, DB `aura-logistika-db`. **Stav:** `beží`.

Zásielky = súhrnné čísla za ISO-týždeň × krajina (SK, CZ, HU, RO, SI, HR, PL, BG) × prepravca (packeta/posta/gls/sps/dpd), stavy odoslané / doručené / na ceste / vrátené / stratené / výdajňa, plus poštovné a hodnota €, unikát + upsert + audit. Reklamácie = jednotlivé prípady, stavy zahájené → doručené → vyriešené/stratené, výsledok / spôsob / vinník, čas riešenia ∅ + medián. Dashboard s inline-SVG grafmi, CSV import / XLSX export, backup skript s testovaným restore.

**Dlh:** appka dlho **nebola git repo** — baseline commit `41b7165` dostala až 3. 8. 2026. 0 testov. Mala fallback `ADMIN_PASSWORD || "admin123"` na appke publikovanej na `0.0.0.0:3020`; KPI si to isté odstránilo commitom `6169eb0` a pridalo fail-closed bootcheck — Logistika to potrebuje tiež.

### Aura Roadmap — port 3040

Port appky Northstar V3 na rodinný stack. Vetva B, DB `aura_roadmap`, cookie `aura_roadmap_session`. **Stav:** `beží`, dokončené a overené 29. 7. 2026, ďalej dolaďované do 30. 7.

**Tri piliere:** plánovanie (Timeline) · evidencia pre reporting (Projekty, Prehľad) · rozhodovacia fronta (Checkpointy).

Jadro domény: checkpoint readiness → **nemenné** rozhodnutie (`go` / `conditional_go` / `no_go` / `deferred`) → baseline snapshot + audit + follow-up; sprint `draft → commit → close` s carry-over; optimistic concurrency `409 VERSION_CONFLICT` na `checkpoints`, `sprints`, `work_items`.

**Dosiahnuté zjednodušenie proti Northstaru:**

| | Pred | Po |
| --- | --- | --- |
| Generácie UI | 3 | 1 |
| Tabuľky | 36 | 20 |
| CSS | 189 KB v 3 súboroch | 1 súbor, 560 riadkov |
| Režimy Timeline | 5 | 3 |
| Zoomy | 5 | 3 |
| Hustoty | 3 | 2 |
| Hierarchia práce | 5 úrovní + Bug + Spike | 2 úrovne, typy `task`/`bug`/`idea` |
| Runtime | Cloudflare Worker + D1 + R2 + vinext | Node 22 + Next 16 standalone + MariaDB 11.4 |
| Testy | 1 súbor | 22 unit + 4 e2e |

**Brána (zelená):** tsc čistý, lint 0 chýb, 535 unit testov, `next build` prejde, 47/47 Playwright vrátane axe v oboch témach, `/api/health` `{"ok":true,"db":true}`, seed idempotentný (druhý beh 0 riadkov), zálohy funkčné.

**Kľúčové poučenie z tohto projektu:** reporty 11 agentov tvrdili „done", overenie našlo **11 defektov, 4 blokujúce**. Agentov report nie je dôkaz.

**Otvorené v poradí hodnoty:** (1) zlúčiť 7 requestov Prehľadu do jedného agregačného endpointu — to bol dôvod na zvýšenie rate-limitu, (2) observabilita chýb route handlerov, (3) integrácie cez `roadmap_ro`, (4) `/api/summary` pre AuraHub.

### Aura Zľavy (`ovl-da-zliav`) — port 3070

Lokálna appka na ovládanie zliav v eshope Šperky cez REST API. Vetva B, DB `ovl_zliav`, Caddy pred appkou, **žiadny tunel**. **Stav:** `postavené` a nasadené lokálne 6. 8. 2026; chýba už len seed admina (vyžaduje skutočné TTY) a onboarding v UI.

**Tri obmedzenia shop API, ktoré určili celý dizajn appky:**

1. `POST /api/products/setReduction` je **jediný** write endpoint — len percentuálna zľava s časovým oknom, strop 30 %, okno max 3 mesiace.
2. Zľavu **nie je možné zmazať** (`reduction` musí byť > 0). Jediné zrušenie je posunúť `to` do minulosti — to je hack, nie funkcia API, a zámerne sa neimplementoval. Zľavy len expirujú.
3. `GET /api/products` ani `/api/products/get` **nevracajú aktuálnu zľavu** — appka vie len to, čo sama zapísala. Bez vlastného audit logu nemá ako zistiť stav.

**Invarianty:** desiatka produktov vynútená **schémou** (`slot` UNIQUE + CHECK 1–10, obsadzovanie jediným `INSERT..SELECT`), žiadny zápis bez potvrdenia (`preview_token`: HS256 JWT, TTL 15 min, SHA-256 hash kanonickej sady + `price_at_preview`, jednorazový), runaway strop 60 zápisov/h počítaný dotazom nad append-only `audit_log`, `setReduction` volá výhradne `src/lib/engine/executor.ts` (vynútené grepom v teste).

**Stav overenia:** 866 testov, Playwright 30/30, typecheck + lint čisté, migrácia 0009, `boot_ok`. Neoverené: preklik v prehliadači (Caddy basic auth sa z agenta vyplniť nedá).

**AI agent — poctivý rozsah:** V1 je deterministický pravidlový analytik (`src/lib/ai/rules.ts`), nie LLM. Každé zistenie má akciu, ktorá otvorí predvyplnený drawer. **Agent nikdy nezapisuje sám.** Obrátkovosť je zamknutá karta so vzorcom a 3 chýbajúcimi vstupmi — API nedáva COGS ani zásobu nevariantných produktov.

**Šprint predajnosť** (6. 8. 2026) pridal čítanie objednávok: `orders-client.ts` (jediný smie volať `/api/order`), 20-hodinový sync interval — **nie nočný**, appka beží na pracovnom PC, ktoré je v noci vypnuté. Zmerané proti reálnemu shopu: 3 dni = 978 objednávok, shop celkovo 1 765 576 objednávok a 40 483 produktov, limit 300 req / 60 s na kľúč.

### Aura Banner Studio — port 8091

Samostatná Docker appka (`C:\Aura\aura-banner-studio`), oddelená od integrácie v sperky-ai. Vetva A + Playwright/Chromium render. **Stav:** `beží` — MVP Pipeline 1 (deterministický HTML/CSS render → PNG → ZIP).

Domény: kampane s tvrdým lockom (svet + modelka), 3 modelky, produkty a ceny, copy manifesty (8 jazykov × 5 rozmerov), KB importovaná zo `aura_marketing`. AI provider abstrakcia `mock` / `openai` / `gemini`, default `mock`, budget strop.

**Otvorené:** GitHub repo a push, AI kľúče, P2 social/QA z mocku na reálne.

### aura-hr-mapa

Prvá appka vetvy A a **predloha pre celú líniu** — z nej sa kopíroval `styles.css`, `src/{db,auth,crypto,audit,util}.js` a Dockerfile do Logistiky, KPI aj Banner Studia. HR modul ako karta v AuraHube existuje, `/api/summary` nemá.

### Northstar V3 — port 3010, archív

Pôvodný IT roadmap planner. **Zostáva nedotknutý** a môže ďalej bežať. Jeho technický dlh je zdokumentovaný ako zoznam pascí, ktoré sa nemajú zopakovať: vinext 0.0.50 na najkritickejšej vrstve, tri generácie UI v jednom repe, alias vrstva `--ns-*` nad už správnymi `--aura-*` tokenmi, `tasks` a `work_items` ako dve tabuľky na to isté, 9 tabuliek čistej konfigurovateľnosti (workflow engine + custom fields + dashboard builder), denormalizované počítadlá, enterprise mierka 500 projektov / 100 000 položiek pre 15 užívateľov.

> **Poučenie:** mierku v kontrakte treba držať pri realite, inak architektúru riadi fantázia.

---

## Zdieľané veci

### aura-design — dizajnový balík rodiny

`C:\Aura\aura-design`, git `main`, 30 testov. **Stav:** `postavené` 3. 8. 2026.

**Distribúcia kopírovaním** cez `sync.mjs` + `manifest.json` — nie npm balík ani submodul. Dôvod: rodina má 5 appiek v 2 vetvách, dve bez build stepu a len 2 z 5 repozitárov majú remote. Kopírovanie funguje vo všetkých piatich. Skopírované súbory nesú hlavičku `GENERATED FILE`; `node sync.mjs --check` vráti exit 1, ak niekto upravil kópiu namiesto zdroja.

**Alias vrstva** je kľúčový trik: názvy tokenov sa medzi vetvami rozišli (`--surface` vs `--panel` vs `--card`), preto `suite.css` nepoužíva ani jeden priamo — píše sa proti neutrálnym `--as-*` aliasom, ktoré na tokeny appky namapuje malý bridge (`bridge/vanilla.css`, `next.css`, `hub.css`). Load order: **app stylesheet → bridge → accents → suite.**

**Obsahuje len to, čo appky nemajú:** breadcrumb, karta modulu, ikonový rail, attention chips, live bar + sparkline, baner. **Zámerne neobsahuje** karty, tabuľky, badge, modály, drawer, toasty, empty states, skeletony, command palette ani grafy — tie každá appka už má udržiavané a kopírovanie by duplikovalo živý kód.

**Modulové akcenty** sú oddelené od stavových farieb: `--b-mkt` teal, `--b-kpi` zlatá `#d3a53a`, `--b-log` oranžová `#e07a3e`, `--b-hr` fialová `#8b7fd4`, `--b-road` `#2a8f96`, `--b-fin` zelená `#2fae7a`. Akcent hovorí „v ktorej appke som", stavová farba „je toto číslo dobré". Keby sa zliali, zdravá metrika v Logistike by vyzerala ako varovanie.

### Tri dizajnové štandardy — nezamieňať

| Štandard | Fonty | Forma |
| --- | --- | --- |
| **Appky** | Geist (UI) + Playfair Display (brand serif) | SPA, dark default, 2 hustoty |
| **HTML reporty** | Inter | scrollovaný dokument |
| **Deck (prezentácie)** | Playfair + Inter + JetBrains Mono | slajd na obrazovku, dvojrežimový deck/dokument, tlač na A4 landscape |

Spoločné tokeny: teal `#05bcc4` / deep `#03797e`, zlatá `#d8b878` / `#c9a869` / light `#8a6417`, paper dark `#0e1413` / light `#f8f4f7`. Odtiene **výhradne** cez `color-mix`, žiadny raw hex ani `rgba()` mimo `:root` — `aura-roadmap` to vynucuje guard testom, ktorý na literálovej farbe zhodí celý balík testov.

### Aura Suite — mockup rozcestníka

`apps/aura-apps-hub.html` v repe `Samuel-sperky/Aura-ai`, PR #1 zmergovaný `817124f`. **Stav:** `postavené` (mockup, nie appka). Jeden self-contained HTML so 6 modulmi podľa reálnych appiek, 45+ obrazoviek, 74 PNG + PDF na 57 strán cez `apps/build/shoot.mjs`.

Slúžil ako predloha pre AuraHub. **Pozor pri ďalšom prenose:** rozšírenia I1–I3 (55 % JS mockupu) sú post-render DOM patchery cez `window.POST` + `MutationObserver` — do Next appiek sa preniesť **nedajú**, treba prepis na komponenty. Z 3 033 riadkov JS je 1 290 riadkov fixtures na zahodenie.

### Aura Takt — nástroj na riadenie tímu

Jednosúborový HTML (666 riadkov, bez závislostí a bez `localStorage`), 8 záložiek: Dnes · Commity · Ľudia · Blokátory · Rozhodnutia · Piatok · Mesiac · Dáta. **Stav:** `postavené`.

**Poučenie, ktoré platí pre každý ďalší nástroj:** nástroj má hodnotu len ak predvyplní reálny kontext z pamäte — prázdna šablóna sa nepoužije. A kľúčová funkcia nie je evidencia, ale **generátor podkladu na uzávierku**: prevádza zapísané dáta na text, ktorý sa dá priamo predniesť CEO.

---

## Čo je otvorené — súhrn

Zoradené podľa toho, čo blokuje najviac vecí.

| # | Vec | Kde | Prečo |
| --- | --- | --- | --- |
| 1 | `/api/summary` pre Roadmap a sperky-ai | AuraHub | 4 zo 6 kariet hubu sú prázdne; kód je rozpracovaný a necommitnutý na `feat/suite-visuals` |
| 2 | Auth pred AuraHub | AuraHub | bez neho sa hub nesmie tunelovať — čísla všetkých appiek by boli verejné |
| 3 | Seed admina + onboarding | Aura Zľavy | appka je postavená, ale bez účtu sa nedá prihlásiť a kľúč do shopu sa neuloží |
| 4 | Rotácia bcrypt hashu z `docker/Caddyfile` | AuraAI | jediná brána medzi internetom a appkou, hash je v gite |
| 5 | Read-only DB users (`kpi_ro`, `roadmap_ro`) | KPI, Roadmap | dovtedy sa integrácie robia ručne |
| 6 | Fail-closed bootcheck + git hygiena | Logistika | 0 testov, historicky fallback heslo na `0.0.0.0` |
| 7 | Agregačný endpoint Prehľadu | Roadmap | 7 requestov na jedno zobrazenie; to bol dôvod na zvýšenie rate-limitu |
| 8 | Observabilita chýb route handlerov | Roadmap | padajúci endpoint sa musel hľadať meraním z prehliadača |
| 9 | i18n v sperky-ai | sperky-ai | samostatný projekt 3–5 M tokenov, zámerne vyňatý |
| 10 | Zjednotenie akcentu teal vs zlatá | celá rodina | odložené rozhodnutím; teal je zatiaľ platný |
| 11 | Tržby ako appka | — | existuje len ako karta v mockupe a report za júl 2026 |

---

## Metodika, ktorou sa toto stavia

Nie je to náhodné — každá appka rodiny vznikla tým istým postupom a je to overený vzor:

1. **Recon** — 1–2 agenti prečítajú existujúci stav a napíšu, čo tam reálne je (nie čo má byť).
2. **Dotazník** — 100 (niekedy 150 alebo 200) kontextových otázok v oblastiach; blokujúce otázky sa oddelia a musia byť zodpovedané pred štartom.
3. **Kritik** — agent, ktorý dotazník a navrhované odpovede spochybní.
4. **Kontrakt** — jeden dokument, zdroj pravdy, s akceptačnými kritériami, odhadom spendu a registrom rozhodnutí. Mení sa len so vstupom používateľa.
5. **Sprint** — 8–20 agentov s **disjunktným vlastníctvom** modulov, prípadne v git worktree, ak hrozí konflikt.
6. **Verifikačná brána** — tsc, lint, unit, build, e2e, axe, live smoke v Dockeri.
7. **Bug hunt** — 3 nezávislí lovci → potvrdené nálezy → opravári, každá oprava s **failing-first** testom.
8. **Zápis do Hadesa** — projekt aj pasce, aby sa to druhý raz nehľadalo.

**Tvrdé poučenie, ktoré stojí za bodmi 6–7:** agentov report nie je dôkaz. V Roadmape 11 reportov tvrdilo „done" a overenie našlo 11 defektov, 4 blokujúce. V Zľavách bug hunt našiel 23 nálezov, z ktorých najvážnejší bol, že **scheduler nikdy nezapisoval** — a integračné testy to maskovali, pretože bežali s fake executorom. Preto platí: aspoň jeden test vždy s **produkčným** wiringom.
