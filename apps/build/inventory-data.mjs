/**
 * inventory-data.mjs — jediný zdroj pravdy pre prehľad aplikácií Aura Suite.
 *
 * Z tohto súboru sa generuje HTML (inventory-html.mjs) aj XLSX (inventory-xlsx.py).
 * Spustenie `node inventory-data.mjs` vypíše dáta ako JSON (vstup pre python skript).
 *
 * PRAVIDLO PROJEKTU: neznáme výsledky sa nevymýšľajú. Každý riadok nesie zdroj
 * a stupeň overenia:
 *   overené        — je to v tomto repe, dá sa otvoriť/spustiť a skontrolovať
 *   rekonštruované — z Hades pamäte (reálne appky v C:\Aura), v tomto repe dôkaz nie je
 *   ukážkové       — demo hodnota mockupu, nie prevádzkový údaj
 */

export const META = {
  titul: 'Prehľad aplikácií Aura Suite',
  podtitul: 'Koľko aplikácií máme, čo každá robí a v akom stave je',
  datum: '4. 8. 2026',
  rozsah: 'Aura Suite — 6 modulov podľa reálnych aplikácií rodiny Aura',
  zdrojRepo: 'apps/aura-apps-hub.html · apps/README.md (merge 817124f)',
  zdrojHades: 'Hades pamäť — recon rodiny appiek C:\\Aura (28. 7. – 3. 8. 2026)',
  poznamka:
    'Obrazovka = samostatná hash-routa. Modulové obrazovky sa počítajú vrátane intro stránky ' +
    'modulu; vstupné obrazovky (login, workspace, profil) a rozcestník sa počítajú zvlášť. ' +
    'README uvádza zaokrúhlené „45+ obrazoviek" — presný počet je nižšie v liste Obrazovky.',
};

export const LEGENDA = {
  overenie: [
    ['overené', 'Je to v tomto repe — dá sa otvoriť a skontrolovať (HTML mockup, README, git história).'],
    ['rekonštruované', 'Z Hades pamäte o reálnych appkách v C:\\Aura. V tomto repe dôkaz nie je.'],
    ['ukážkové', 'Demo hodnota mockupu na predvedenie rozloženia — nie prevádzkový údaj.'],
  ],
  stav: [
    ['V prevádzke', 'Appka beží, používa sa.'],
    ['MVP v prevádzke', 'Overená end-to-end, ale s otvorenými bodmi na ďalší sprint.'],
    ['Neexistuje', 'Modul je zatiaľ len statický report alebo náhľad, appka nie je postavená.'],
  ],
};

/* ── 6 modulov ─────────────────────────────────────────────────────────── */

export const MODULY = [
  {
    id: 'marketing',
    nazov: 'Aura Marketing',
    akcent: '--b-mkt',
    ucel: 'Marketingový kokpit: ads hierarchia s ROAS pásmami a AI banner štúdio s campaign lockom.',
    realnaAppka: 'sperky-ai (aura-web) + Aura Banner Studio',
    port: '3000 · 8091',
    stav: { label: 'V prevádzke', tone: 'ok' },
    hubApi: { label: 'Chýba', tone: 'no' },
    vetva: 'B (sperky-ai) + A (Banner Studio)',
    stack:
      'sperky-ai: Next.js 16 + React 19 + TS, argon2id + jose + zod, defineRoute() pipeline, ' +
      'non-root kontajner, 43 numerovaných migrácií s _migrations ledgerom. ' +
      'Banner Studio: Node 20 + Express 4 + MariaDB 11.4 + vanilla SPA + JWT, ' +
      'Playwright/Chromium render, obrázky na volume.',
    testy: 'sperky-ai: 105 vitest + 3 Playwright. Banner Studio: 0 testov.',
    git: 'sperky-ai: repo aura-web (4 worktree). Banner Studio: bez GitHub remote — gh nie je v prostredí.',
    velkost: 'sperky-ai globals.css 1 172 r. / 719 súborov · ~233 000 riadkov kódu',
    vlastnik: 'Gabika (Banner Studio) · Marketing: Gabika, Ema',
    naklady: 'AI budget strop 300 € / mes. (provider default mock → reálne čerpanie 0 €)',
    kontajnery: 'sperky-ai-app-1 · bannery-app / bannery-db / bannery-ngrok',
    funkcie: [
      ['Strom Platforma → Kampaň → Zostava → Reklama s rollupom a ROAS pásmami', 'Doména', 'repo · hub', 'overené'],
      ['Bannery 8 jazykov × 5 rozmerov, deterministický render HTML/CSS → PNG → ZIP', 'Doména', 'repo · hub + Hades · Banner Studio', 'overené'],
      ['Campaign lock (svet + modelka), QA gates a learning loop do znalostnej bázy', 'Doména', 'repo · hub + Hades · Banner Studio', 'overené'],
      ['AI provider abstrakcia mock / OpenAI GPT / Gemini 3 Pro Image, default mock + budget strop', 'Integrácia', 'Hades · Banner Studio', 'rekonštruované'],
      ['Ads tabuľka: 11 riadkov hierarchie s rollupom metrík a farebnými ROAS pásmami', 'Obrazovka', 'repo · hub', 'overené'],
      ['Galéria bannerov s filtrom podľa kampane a rozmeru', 'Obrazovka', 'repo · hub', 'overené'],
      ['Znalostná báza importovaná zo sperky-ai (DB aura_marketing), 3 modelky, produkty + ceny', 'Integrácia', 'Hades · Banner Studio', 'rekonštruované'],
      ['Nastavenia: provider, budget strop, API kľúče, rozmery a jazyky, export ZIP, learning loop', 'Nastavenia', 'repo · hub', 'overené'],
    ],
    obrazovky: [
      ['intro', 'Intro modulu', 'intro'],
      ['dashboard', 'Prehľad', 'dashboard'],
      ['list', 'Kampane', 'zoznam (6 riadkov)'],
      ['bannery', 'Bannery', 'galéria'],
      ['ads', 'Ads', 'tabuľka (11 riadkov)'],
      ['detail', 'Detail kampane', 'detail'],
      ['settings', 'Nastavenia', 'nastavenia'],
    ],
    kpis: [['Aktívne kampane', '4'], ['Vygenerované bannery', '320'], ['AI budget', '62 % z 300 €'], ['QA pass rate', '91 %'], ['Blended ROAS', '3,4']],
  },
  {
    id: 'kpi',
    nazov: 'Aura KPI',
    akcent: '--b-kpi',
    ucel: 'Mesačné a ročné KPI 12 oddelení s pásmami, uzávierkou a Team score.',
    realnaAppka: 'aura-kpi (C:\\Aura\\aura-kpi)',
    port: '3030',
    stav: { label: 'MVP v prevádzke', tone: 'ok' },
    hubApi: { label: 'Hotové (8003483)', tone: 'ok' },
    vetva: 'A (vanilla SPA)',
    stack: 'Node 20 + Express 4 + MariaDB 11.4 + vanilla SPA + JWT, bez build stepu, window.registerView() SPA kit',
    testy: '0 testov (vetva A) — overené end-to-end ručne v Dockeri 23. 7. 2026',
    git: 'lokálny git, 8 commitov A0–A7, bez remote',
    velkost: 'styles.css 652 r. · 12 oddelení · 16 metrík · 38 vstupov · 48 pásiem · 22 nových tabuliek',
    vlastnik: 'Ema',
    naklady: 'bez licenčného nákladu (vlastná appka, vlastný hardware)',
    kontajnery: 'aura-kpi-app : 3030 · aura-kpi-db (mariadb 11.4)',
    funkcie: [
      ['Plnenie = (skutočnosť − Min) / (Max − Min), cap 100 %; farby zelená ≥100 / žltá 60–99 / červená <60 / sivá', 'Doména', 'repo · hub + Hades · Aura KPI', 'overené'],
      ['Team score = priemer 6 zložiek; Copywriter váhy 60/20/20; Import tolerancia 5 %; EBITDA pásmo 1–5 %', 'Doména', 'Hades · Aura KPI', 'rekonštruované'],
      ['Heatmapa plnenia oddelení × mesiac, A/B porovnanie období a ročný pohľad', 'Obrazovka', 'repo · hub', 'overené'],
      ['Uzávierka do 10. dňa; monthPill (Otvorený / Po termíne / Uzavretý) + fillPill (Nevyplnené / Rozpracované / Kompletné)', 'Proces', 'repo · hub + Hades · Aura KPI', 'overené'],
      ['Modul „Na doplnenie" — čo ktoré oddelenie ešte nevyplnilo, s termínom', 'Obrazovka', 'repo · hub', 'overené'],
      ['SEO porada — 72 otázok ako samostatný modul', 'Obrazovka', 'repo · hub + Hades · Aura KPI', 'overené'],
      ['Integrácie Logistika + SEO (read-only, graceful fallback), denníky projekty / sklad / externistky', 'Integrácia', 'Hades · Aura KPI', 'rekonštruované'],
      ['Roly Admin / Editor / Prehliadač, menné účty M:N na oddelenia, Hospodársky len Admin + manažment', 'Bezpečnosť', 'Hades · Aura KPI', 'rekonštruované'],
      ['XLSX export, polročný a ročný report, audit log, zálohovací skript, SK/EN, dark mode', 'Dáta', 'Hades · Aura KPI', 'rekonštruované'],
    ],
    obrazovky: [
      ['intro', 'Intro modulu', 'intro'],
      ['dashboard', 'Prehľad', 'dashboard'],
      ['list', 'Oddelenia', 'zoznam (12 riadkov)'],
      ['analyza', 'Analýza', 'heatmapa + A/B'],
      ['rok', 'Rok', 'tabuľka (7 riadkov)'],
      ['missing', 'Na doplnenie', 'tabuľka (6 riadkov)'],
      ['seo', 'SEO porada', 'tabuľka (12 riadkov)'],
      ['detail', 'Detail oddelenia', 'detail'],
      ['settings', 'Nastavenia', 'nastavenia'],
    ],
    kpis: [['Team score', '61,9 %'], ['Vyplnené oddelenia', '7 / 12'], ['Najlepšie oddelenie', 'Copywriter'], ['Po termíne', '3']],
  },
  {
    id: 'logistika',
    nazov: 'Aura Logistika',
    akcent: '--b-log',
    ucel: 'Týždenná evidencia zásielok a reklamácií naprieč 8 krajinami a 5 prepravcami.',
    realnaAppka: 'aura-logistika (C:\\Aura\\aura-logistika)',
    port: '3020',
    stav: { label: 'V prevádzke', tone: 'ok' },
    hubApi: { label: 'Hotové (0ffec3d)', tone: 'ok' },
    vetva: 'A (vanilla SPA)',
    stack: 'Node 20 + Express 4 + MariaDB + vanilla SPA + JWT, bez build stepu',
    testy: '0 testov',
    git: 'prvý git repo dostala až 3. 8. 2026 (baseline commit 41b7165) — dovtedy bez verziovania',
    velkost: 'styles.css 643 r.',
    vlastnik: 'Daniel',
    naklady: 'bez licenčného nákladu; poštovné júl 2026 ≈ 11 603 € (prevádzkový náklad dopravy)',
    kontajnery: 'aura-logistika (sieť aura-logistika_aura-logistika)',
    funkcie: [
      ['Súhrny za ISO-týždeň × krajina (8) × prepravca (5) s upsertom a auditom', 'Doména', 'repo · hub', 'overené'],
      ['Stavy zásielok: odoslané / doručené / na ceste / vrátené / stratené / výdajňa', 'Doména', 'repo · hub', 'overené'],
      ['Reklamačné prípady so životným cyklom zahájené → vyriešené, ∅ a medián času riešenia', 'Doména', 'repo · hub', 'overené'],
      ['CSV import a XLSX export + tlačová verzia pre týždennú poradu', 'Dáta', 'repo · hub', 'overené'],
      ['SVG grafy vývoja doručenosti s kĺzavým priemerom', 'Obrazovka', 'repo · hub', 'overené'],
      ['Alert na zmluvné minimum prepravcu (scenár GLS)', 'Stavy a alerty', 'repo · hub', 'ukážkové'],
      ['Endpoint /api/summary pre Aura Hub — živé dáta na rozcestníku', 'Integrácia', 'Hades · Aura Hub', 'rekonštruované'],
      ['Nastavenia: povinné krajiny, prepravcovia, upsert + audit, zálohy', 'Nastavenia', 'repo · hub', 'overené'],
    ],
    obrazovky: [
      ['intro', 'Intro modulu', 'intro'],
      ['dashboard', 'Prehľad', 'dashboard'],
      ['list', 'Zásielky', 'zoznam (6 riadkov)'],
      ['claims', 'Reklamácie', 'tabuľka'],
      ['vyvoj', 'Vývoj', 'graf trendu'],
      ['detail', 'Detail zásielky', 'detail'],
      ['settings', 'Nastavenia', 'nastavenia'],
    ],
    kpis: [['Odoslané (W31)', '2 340'], ['Doručenosť', '94,1 %'], ['Otvorené reklamácie', '37'], ['Poštovné (júl)', '11 603 €']],
  },
  {
    id: 'hr',
    nazov: 'Aura HR',
    akcent: '--b-hr',
    ucel: 'Interná evidencia: ľudia, pozície, zdieľané schránky a firemné aplikácie s nákladmi.',
    realnaAppka: 'aura-hr-mapa (interná evidencia)',
    port: 'neuvedený v pamäti · plán hr.aura-ai.sk',
    stav: { label: 'V prevádzke', tone: 'ok' },
    hubApi: { label: 'Neexistuje', tone: 'no' },
    vetva: 'A (vanilla SPA) — praotec vetvy',
    stack: 'Node + Express + MariaDB + vanilla SPA + JWT; styles.css a SPA kit sa z tejto appky kopírujú do ostatných',
    testy: '0 testov',
    git: 'nie je v Hades zázname',
    velkost: '32 pozícií · ~90 rolových mailov · 18 zamestnancov · 8 uzlov org-stromu',
    vlastnik: 'Delaja (CTO)',
    naklady: 'register 8 firemných aplikácií ≈ 1 240 € / mes.',
    kontajnery: 'nie je v Hades zázname',
    funkcie: [
      ['32 pozícií s náplňou práce — štruktúrované bloky + knižnica činností', 'Doména', 'repo · hub', 'overené'],
      ['~90 rolových mailov s aliasmi; heslá šifrované, viditeľné len Admin', 'Bezpečnosť', 'repo · hub', 'overené'],
      ['Org-strom firmy — 8 uzlov, 3 úrovne, ľudia a pozície na uzol', 'Obrazovka', 'repo · hub', 'overené'],
      ['Register firemných aplikácií s nákladmi, vlastníkmi a licenciami (8 aplikácií)', 'Doména', 'repo · hub', 'ukážkové'],
      ['Karty zamestnancov: pozícia, oddelenie, mail, úväzok, krajina', 'Obrazovka', 'repo · hub', 'ukážkové'],
      ['Audit log a roly; prepínač „heslá mailov len Admin"', 'Bezpečnosť', 'repo · hub', 'overené'],
      ['Zdroj dizajnu vetvy A — styles.css a window.registerView() kit pre Logistiku, KPI a Banner Studio', 'Tech', 'Hades · aura-app family', 'rekonštruované'],
    ],
    obrazovky: [
      ['intro', 'Intro modulu', 'intro'],
      ['dashboard', 'Prehľad', 'dashboard'],
      ['list', 'Zamestnanci', 'zoznam (6 riadkov)'],
      ['pozicie', 'Pozície', 'tabuľka (6 riadkov)'],
      ['maily', 'Maily', 'tabuľka (10 riadkov)'],
      ['aplikacie', 'Aplikácie', 'tabuľka (8 riadkov)'],
      ['org', 'Org-strom', 'tabuľka (8 riadkov)'],
      ['detail', 'Detail zamestnanca', 'detail'],
      ['settings', 'Nastavenia', 'nastavenia'],
    ],
    kpis: [['Zamestnanci', '18'], ['Pozície', '32'], ['Zdieľané maily', '~90'], ['Aplikácie — náklady/mes.', '1 240 €']],
  },
  {
    id: 'roadmap',
    nazov: 'Aura Roadmap',
    akcent: '--b-road',
    ucel: 'Plánovanie, evidencia pre reporting a rozhodovacia fronta.',
    realnaAppka: 'aura-roadmap (C:\\Aura\\aura-roadmap)',
    port: '3040',
    stav: { label: 'V prevádzke', tone: 'ok' },
    hubApi: { label: 'Chýba (WIP)', tone: 'no' },
    vetva: 'B (Next 16 + React 19)',
    stack:
      'Node 22 alpine + Next.js 16 output standalone + React 19 + TS, MariaDB 11.4 s raw ' +
      'parametrizovaným SQL (bez ORM), numerované migrácie + _migrations ledger, argon2id + jose HS256 ' +
      '+ app_sessions revalidované per request, defineRoute() pipeline 100 %, CSRF fail-closed, ' +
      'rate-limit + lockout 5/15 min → 423, CSP, non-root kontajner',
    testy: 'vitest ko-lokované + 3 Playwright e2e + axe; guard globals.css.test.ts zhodí testy pri raw hex mimo :root',
    git: 'branch feat/aura-family-port, 10 commitov, BEZ GitHub remote (gh nie je v prostredí)',
    velkost: 'globals.css 605 r. + timeline.module.css 1 820 r. · 20 tabuliek (zjednodušené z 36)',
    vlastnik: 'Daniel',
    naklady: 'bez licenčného nákladu',
    kontajnery: 'aura-roadmap-app : 3040 · aura-roadmap-db (DB aura_roadmap)',
    funkcie: [
      ['Checkpoint readiness → nemenné rozhodnutie go / conditional_go / no_go / deferred + baseline snapshot', 'Doména', 'repo · hub', 'overené'],
      ['Timeline: 3 režimy (Roadmap / Sprinty / Rozhodnutia) × 3 zoomy (kvartál / mesiac / týždeň) × 2 hustoty', 'Obrazovka', 'repo · hub + Hades · Aura Roadmap', 'overené'],
      ['Šprinty draft → commit → close s carry-over nedokončených položiek', 'Proces', 'repo · hub', 'overené'],
      ['Jeden pevný stavový model backlog → in_progress → waiting → done (workflow engine zrušený)', 'Doména', 'repo · hub + Hades · Aura Roadmap', 'overené'],
      ['2 úrovne práce (Úloha → Podúloha), typy task / bug / idea; custom fields a dashboard builder zrušené', 'Doména', 'Hades · Aura Roadmap', 'rekonštruované'],
      ['Projekty s fázou, prioritou, rizikom, sprintom a termínom (6 projektov)', 'Obrazovka', 'repo · hub', 'ukážkové'],
      ['Rozhodovacia fronta — 5 rozhodnutí s dopadom a termínom', 'Obrazovka', 'repo · hub', 'overené'],
      ['Bezpečnostná pipeline defineRoute(): auth → rateLimit → zod → handler, CSRF fail-closed, lockout 5/15 min', 'Bezpečnosť', 'Hades · Aura Roadmap', 'rekonštruované'],
    ],
    obrazovky: [
      ['intro', 'Intro modulu', 'intro'],
      ['dashboard', 'Prehľad', 'dashboard'],
      ['list', 'Úlohy', 'zoznam (6 riadkov)'],
      ['timeline', 'Timeline', 'timeline (5 riadkov)'],
      ['projekty', 'Projekty', 'tabuľka (6 riadkov)'],
      ['rozhodnutia', 'Rozhodnutia', 'tabuľka (5 riadkov)'],
      ['detail', 'Detail úlohy', 'detail'],
      ['settings', 'Nastavenia', 'nastavenia'],
    ],
    kpis: [['Aktívne projekty', '6'], ['Úlohy v behu', '5'], ['Rozhodnutia vo fronte', '2'], ['Checkpointy po termíne', '1']],
  },
  {
    id: 'trzby',
    nazov: 'Aura Tržby',
    akcent: '--b-fin',
    ucel: 'E-shop report tržieb — júl 2026 (1.–27.), 5 679 objednávok.',
    realnaAppka: 'dnes statický HTML report · appka zatiaľ neexistuje',
    port: 'plán 3060 · trzby.aura-ai.sk',
    stav: { label: 'Appka neexistuje', tone: 'no' },
    hubApi: { label: 'Neexistuje', tone: 'no' },
    vetva: 'plán A (vanilla SPA)',
    stack: 'dnes samostatný HTML report (štandard Inter). Plán: vanilla SPA na porte 3060, nightly sync 03:00 zo sperky-ai /api/orders/export (vznikne až s F6)',
    testy: '—',
    git: 'report je súčasťou tohto repa; appka neexistuje',
    velkost: '5 679 objednávok · 27 dní · 8 KPI kariet',
    vlastnik: 'Delaja (CTO)',
    naklady: 'bez licenčného nákladu',
    kontajnery: '—',
    funkcie: [
      ['Klientske filtre prepočítavajú celý report (trh, platba, kov, zákazník, zľava)', 'Doména', 'repo · hub', 'overené'],
      ['Denný graf s prepínačom tržba / zisk / objednávky + kumulatívna krivka', 'Obrazovka', 'repo · hub', 'overené'],
      ['Zoraditeľné tabuľky, riadok = filter, CSV export (BOM + „;" pre Excel SK)', 'Dáta', 'repo · hub', 'overené'],
      ['Segmenty ako pravidlá v Definíciách so spätným prepočtom (nový / opakovaný, zľava áno / nie)', 'Doména', 'repo · hub + Hades · plán F2–F6', 'overené'],
      ['Analytické pohľady: Trhy (6), Koše (4), Hodiny a dni, Expedícia (4)', 'Obrazovka', 'repo · hub', 'overené'],
      ['Zistenia — pravidlové, nie AI generované', 'Doména', 'Hades · plán F2–F6', 'rekonštruované'],
      ['Reálne čísla júl 2026: tržba 217 016 €, zisk 126 541 €, marža 66,1 %, AOV 38,21 €, expedícia 69,6 % do 24 h', 'Dáta', 'repo · hub + Hades · hub náhľad', 'overené'],
      ['Objednávky a položky bez osobných údajov, multi-mena, storná hrubé aj čisté (plán appky)', 'Bezpečnosť', 'Hades · plán F2–F6', 'rekonštruované'],
    ],
    obrazovky: [
      ['intro', 'Intro modulu', 'intro'],
      ['dashboard', 'Prehľad', 'dashboard'],
      ['list', 'Segmenty', 'zoznam (6 riadkov)'],
      ['trhy', 'Trhy', 'tabuľka (6 riadkov)'],
      ['expedicia', 'Expedícia', 'tabuľka (4 riadky)'],
      ['hodiny', 'Hodiny a dni', 'grafy'],
      ['kose', 'Koše', 'tabuľka (4 riadky)'],
      ['definicie', 'Definície', 'tabuľka (3 riadky)'],
      ['detail', 'Detail segmentu', 'detail'],
      ['settings', 'Nastavenia', 'nastavenia'],
    ],
    kpis: [['Tržba', '217 016 €'], ['Zisk', '126 541 €'], ['Marža', '66,1 %'], ['AOV', '38,21 €'], ['Objednávky', '5 679'], ['Expedícia medián', '18,7 h']],
  },
];

/* ── spoločná vrstva (platí naprieč modulmi) ───────────────────────────── */

export const SPOLOCNE = [
  ['Shop API konektor', 'LIVE pilulka v hlavičke, 5 endpointov (orders / products / stats / shipping / returns) s latenciou a časom syncu, 4 stavy (live / stale / error / demo), tikajúce „pred X min" + Synchronizovať teraz s deterministickým jitterom ±2 %, prepínač Simulovať výpadok, audit log', 'Tržby, Logistika, Marketing, KPI', 'repo · hub + README', 'overené'],
  ['Import wizard', '4 kroky: súbor → mapovanie stĺpcov → validácia → súhrn. Reálny CSV cez FileReader s autodetekciou „;" / „," a BOM, auto-match podľa hlavičky, typová kontrola s tabuľkou chýb, upsert s kľúčom per modul, undo posledného importu, história v Nastaveniach', 'všetkých 6 modulov', 'repo · hub + README', 'overené'],
  ['Report builder', 'Šablóny per modul, obdobie, výber sekcií (KPI / graf / tabuľka / Zistenia), živý HTML náhľad, CSV s BOM + „;", Tlač/PDF cez print CSS, zdieľateľný hash-odkaz, plánovanie reportov, šablónované AI komentáre z reálnych čísel', 'všetkých 6 modulov', 'repo · hub + README', 'overené'],
  ['AuraAI chat asistent', 'Dokovaný pravý panel 360 px (na mobile fullscreen), FAB s korunkou + ⌘J + položka v ⌘K palete, kontextová hlavička „vidí: modul / stránka · filter", 3 navrhované otázky pre každú z 45 stránok, povinná citácia zdroja (API · sync / import / ukážka), 4 typy akcií so zápisom do Aktivity', 'všetkých 6 modulov', 'repo · hub + README', 'overené'],
  ['Globálna navigácia', '⌘K / Ctrl+K vyhľadávanie naprieč modulmi, panel notifikácií, profilové menu, klávesy 1–6 na skok na modul, ←/→ medzi obrazovkami, Esc zavrie overlay', 'všetkých 6 modulov', 'repo · hub + README', 'overené'],
  ['Dvojjazyčnosť SK / EN', 'Celé rozhranie vrátane formátu čísel a dátumov; prepínač vpravo hore', 'všetkých 6 modulov', 'repo · hub', 'overené'],
  ['Dark / Light téma', 'Prepínač funguje na všetkých obrazovkách; light téma spĺňa AA kontrast', 'všetkých 6 modulov', 'repo · hub + README', 'overené'],
  ['Prístupnosť', ':focus-visible, role=switch, ARIA popisy, landmarky header / main / aside, scope na tabuľkách, aria-sort pri triedení', 'všetkých 6 modulov', 'repo · hub + README', 'overené'],
  ['Stavy rozhrania', 'Skeleton loading pri prepínaní obrazoviek, toasty po akciách, empty stav pri prázdnom filtri, onboarding prázdny štart, chybové bannery s reálnymi scenármi', 'všetkých 6 modulov', 'repo · hub + README', 'overené'],
  ['Vstupné obrazovky', 'login → workspace (výber pracovného priestoru) → rozcestník; profilová stránka', 'globálne', 'repo · hub', 'overené'],
  ['Tabuľkové ovládanie', 'Triedenie klikom na hlavičku, pager nad 10 riadkov, Filter ako popover, klikateľné riadky → detail, create/edit modál s toastom', 'všetkých 6 modulov', 'repo · hub + README', 'overené'],
  ['Nulové externé závislosti', 'Bez localStorage, bez analytiky, bez CDN skriptov; grafy ručné SVG/CSS; jediná externá závislosť sú Google Fonts so systémovým fallbackom', 'globálne', 'repo · hub + README', 'overené'],
  ['Aura Hub — rozcestník appiek', 'Samostatná appka C:\\Aura\\aura-hub na porte 3050 (Node 22 + Express 4, bez DB, 37 testov). 6 kariet modulov s live metrikami, sparkline a pásom cross-app alertov. Každá appka vystavuje GET /api/summary chránený tokenom X-Aura-Hub-Token; hub sa dopytuje paralelne, validuje payload proti kontraktu a kešuje 30 s', 'globálne', 'Hades · Aura Hub', 'rekonštruované'],
];

/* ── náklady ───────────────────────────────────────────────────────────── */

export const NAKLADY = {
  saas: [
    ['Asana', 'Projekty a úlohy', 'Delaja', 280, 15, 'aktívna'],
    ['Shoptet', 'E-shop platforma', 'Delaja', 240, 1, 'aktívna'],
    ['Ahrefs', 'SEO analýza', 'Gabika', 220, 1, 'aktívna'],
    ['Google Workspace', 'Maily a dokumenty', 'Daniel', 180, 90, 'aktívna'],
    ['Adobe CC', 'Grafika a fotky', 'Ema', 120, 2, 'nevyužitá'],
    ['Figma', 'Návrhy bannerov a UI', 'Ema', 90, 3, 'aktívna'],
    ['Slack', 'Interná komunikácia', 'Daniel', 70, 12, 'aktívna'],
    ['Canva Pro', 'Rýchla grafika CS', 'Hajnalka', 40, 2, 'nevyužitá'],
  ],
  interne: [
    ['AI budget — Marketing', 'Mesačný strop na generovanie bannerov; provider default mock, reálne čerpanie 0 €', 'Gabika', 300, 'strop / mes.', 'ukážkové čerpanie 62 % = 186 €'],
    ['Poštovné — Logistika', 'Prevádzkový náklad dopravy z e-shop dát, júl 2026', 'Daniel', 11603, 'júl 2026', 'z e-shop dát'],
  ],
  poznamky: [
    'Register SaaS aplikácií je z obrazovky HR → Aplikácie; README aj obrazovka označujú sumy ako čiastočne ukážkové.',
    'Adobe CC (120 €) a Canva Pro (40 €) sú v appke označené ako nevyužité → potenciál úspory 160 € / mes., t. j. ~13 % nákladov.',
    'Vlastné Aura appky nemajú licenčný náklad — bežia na vlastnom hardware v Dockeri.',
  ],
};

/* ── riziká a otvorené body ────────────────────────────────────────────── */

export const RIZIKA = [
  ['Logistika', 'Fallback ADMIN_PASSWORD || "admin123" na appke publikovanej na 0.0.0.0:3020', 'Ktokoľvek v sieti sa dostane do evidencie zásielok a reklamácií.', 'vysoké', 'otvorené', 'Hades · recon 3. 8. 2026', 'KPI to už odstránil commitom 6169eb0 a pridal fail-closed bootcheck — rovnaký postup treba zopakovať tu.'],
  ['Marketing', 'Produkcia sperky-ai sa nestavia z main', 'Kto spustí docker compose -f docker-compose.prod.yml up -d --build, prepne live dizajn zo zlatej na teal bez toho, aby sa dotkol jediného súboru — vyzerá to ako rutinný restart.', 'vysoké', 'otvorené', 'Hades · Aura redizajn', 'Poistka existuje: image aura-web:gold-c6f4061 + záloha DB aura_marketing_pre-teal-deploy_20260730.sql.'],
  ['Tržby', 'Appka neexistuje — modul je len statický HTML report', 'Čísla sa nedajú aktualizovať bez ručného exportu; závisí na sperky-ai /api/orders/export, ktorý vznikne až s fázou F6.', 'vysoké', 'blokuje', 'Hades · Aura Hub + plán F2–F6', 'Plán: vanilla SPA port 3060, nightly sync 03:00.'],
  ['Spoločné', 'Aura Hub nemá vlastné prihlásenie (loopback-only + noindex)', 'Pri tunelovaní cez ngrok by boli hlavičkové čísla všetkých appiek verejné bez hesla.', 'vysoké', 'otvorené', 'Hades · Aura Hub', 'Pred tunelovaním pridať auth. Plán gateway: Caddy forward_auth na hub + HMAC identity hlavičky.'],
  ['Marketing', 'A11Y: --on-accent #ffffff bez dark override', 'Biela na #05bcc4 ≈ 2,2 : 1 v dark režime (sperky-ai, ads-hierarchy, mindmap-orient); 4 vanilla appky token nemajú vôbec a hardcodujú color:#fff.', 'stredné', 'otvorené', 'Hades · Aura redizajn', 'Správne to majú len aura-prototype a aura-roadmap.'],
  ['Marketing', 'sperky-ai: 0 UI i18n na ~233 000 riadkoch, 0 render testov na 52 komponentov, 5 760 inline style={{}}', 'Appku nie je možné prefarbiť zmenou tokenov ani preložiť bez samostatného projektu (odhad 3–5 M tokenov).', 'stredné', 'otvorené', 'Hades · recon 3. 8. 2026', 'Vizuál je v JSX s hardcoded hodnotami — 5 760 inline style vs 3 829 className.'],
  ['KPI', 'Otvorené body po MVP: zmeniť ADMIN_PASSWORD, chýba read-only DB user kpi_ro, chýba year_refs UI', 'Bez kpi_ro sa integrácie Logistika + Marketing robia ručne; bez year_refs sa YoY tržba a Import tolerancia nedopočítajú.', 'stredné', 'otvorené', 'Hades · Aura KPI', 'Plus exceljs padá na zakázaných znakoch v názvoch hárkov.'],
  ['Roadmap', 'Chýba endpoint /api/summary pre Aura Hub', 'Karta Roadmap na rozcestníku nemá živé dáta — hlási dôvod namiesto čísla.', 'stredné', 'otvorené', 'Hades · Aura Hub', 'Rozpracované necommitnuté zmeny zostali na branchi feat/suite-visuals (5 súborov vrátane env.ts a rateLimit.ts) — agenti spadli na session limit.'],
  ['HR', 'Endpoint /api/summary neexistuje vôbec', 'Modul HR na rozcestníku nikdy nedá živé číslo.', 'stredné', 'otvorené', 'Hades · Aura Hub', 'Zároveň appka nemá v pamäti zaznamenaný port ani git repo.'],
  ['Tržby', 'Nesúlad rozhodnutia a mockupu: zisk a marža', 'Reálna appka ich má VYNECHAŤ (nie sú nákupné ceny), mockup ich zobrazuje (zisk 126 541 €, marža 66,1 %).', 'stredné', 'na rozhodnutie', 'Hades · plán F2–F6', 'Ak sa čísla majú zachovať, treba doplniť nákupné ceny do zdroja dát.'],
  ['Logistika', '0 testov a do 3. 8. 2026 žiadne verziovanie', 'Zmeny sa nedali vrátiť ani auditovať; regresie nikto nezachytí.', 'stredné', 'čiastočne vyriešené', 'Hades · recon 3. 8. 2026', 'Baseline commit 41b7165 už existuje, testy stále chýbajú.'],
  ['Spoločné', 'Vetva A (vanilla SPA) nemá CSRF, rate-limit, lockfile ani testy', 'Štyri appky rodiny (HR, Logistika, KPI, Banner Studio) zdieľajú tento základ vrátane fallback hesiel v kóde.', 'stredné', 'otvorené', 'Hades · aura-app family', 'Pravidlo pre nové appky: stavaj na vetve B (sperky-ai / aura-roadmap) — bezpečnostný a testovací základ sa dodatočne dopĺňa drahšie.'],
  ['Marketing', 'Banner Studio bez GitHub remote a so zdieľaným prihlasovacím heslom', 'Kód existuje len lokálne; prístup nie je menný, nedá sa odobrať jednému človeku.', 'stredné', 'otvorené', 'Hades · Banner Studio', 'gh CLI nie je v prostredí nainštalované.'],
  ['Roadmap', 'Bez GitHub remote; compose zakazuje publikovať DB port', 'Jediné nesplnené akceptačné kritérium portu. Next dev nedosiahne DB → appka nemá CSS iterační loop, každá vizuálna zmena ide cez rebuild image.', 'nízke', 'otvorené', 'Hades · Aura Roadmap', 'Chýba len git remote add + push.'],
  ['Spoločné', 'Mockup: rozšírenia I1–I3 (55 % JS) sú post-render DOM patchery', 'window.POST + MutationObserver sa do Next appiek preniesť nedajú — konektor, import, report a chat treba prepísať na komponenty.', 'stredné', 'na rozhodnutie', 'Hades · recon 3. 8. 2026', 'Mockup má 706 r. CSS + 3 033 r. JS, z toho 1 290 r. fixtures na zahodenie.'],
  ['Spoločné', 'Repo Aura-ai nemá CI workflow', 'Nič nekontroluje HTML ani screenshot pipeline pri push.', 'nízke', 'otvorené', 'Hades · hub náhľad', 'Verifikácia beží len ručne cez apps/build/shoot.mjs.'],
];

export const GLOBALNE_OBRAZOVKY = [
  ['hub', 'Rozcestník (hub)', '6 kariet modulov s live metrikami a pásom alertov'],
  ['login', 'Login', 'vstupná obrazovka'],
  ['workspace', 'Workspace', 'výber pracovného priestoru'],
  ['profile', 'Profil', 'profilová stránka používateľa'],
];

/* ── výpočty ───────────────────────────────────────────────────────────── */

export function sumar() {
  const obrazoviekModuly = MODULY.reduce((a, m) => a + m.obrazovky.length, 0);
  const funkciiModuly = MODULY.reduce((a, m) => a + m.funkcie.length, 0);
  const vsetkyOverenia = [...MODULY.flatMap((m) => m.funkcie.map((f) => f[3])), ...SPOLOCNE.map((s) => s[4])];
  const pocet = (k) => vsetkyOverenia.filter((v) => v === k).length;
  return {
    modulov: MODULY.length,
    realnychAppiek: 6, // sperky-ai, Banner Studio, aura-kpi, aura-logistika, aura-hr-mapa, aura-roadmap
    vPrevadzke: MODULY.filter((m) => m.stav.tone === 'ok').length,
    chybajucich: MODULY.filter((m) => m.stav.tone === 'no').length,
    obrazoviekModuly,
    obrazoviekGlobal: GLOBALNE_OBRAZOVKY.length,
    obrazoviekSpolu: obrazoviekModuly + GLOBALNE_OBRAZOVKY.length,
    funkciiModuly,
    funkciiSpolocnych: SPOLOCNE.length,
    funkciiSpolu: funkciiModuly + SPOLOCNE.length,
    overenychFunkcii: pocet('overené'),
    rekonstruovanychFunkcii: pocet('rekonštruované'),
    ukazkovychFunkcii: pocet('ukážkové'),
    hubApiHotove: MODULY.filter((m) => m.hubApi.tone === 'ok').length,
    rizikVysokych: RIZIKA.filter((r) => r[3] === 'vysoké').length,
    rizikSpolu: RIZIKA.length,
    saasSpolu: NAKLADY.saas.reduce((a, r) => a + r[3], 0),
    saasPocet: NAKLADY.saas.length,
    saasUspora: NAKLADY.saas.filter((r) => r[5] === 'nevyužitá').reduce((a, r) => a + r[3], 0),
  };
}

export const DATA = { META, LEGENDA, MODULY, SPOLOCNE, NAKLADY, RIZIKA, GLOBALNE_OBRAZOVKY, sumar: sumar() };

if (import.meta.url === `file://${process.argv[1]}`) {
  process.stdout.write(JSON.stringify(DATA, null, 1));
}
