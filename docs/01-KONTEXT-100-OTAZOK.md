# Aura Roadmap (Northstar V3 → aura-app family) — 100 kontextových otázok

**Dátum:** 2026-07-28
**Zdroj:** `C:\Users\Ucet\Desktop\IT roadmap planner` (Northstar V3)
**Cieľ:** preniesť pod aura-app family (`C:\Aura\*`), **zjednodušiť** a **ujednotiť** dizajnovo aj logicky.

## Ako odpovedať

Nemusíš písať 100 odpovedí. Pri každej otázke je **`→ odp:`** = moje odporúčanie.
Staci odpovedať štýlom:

```
1: C
2-10: default
11: nie, chcem MariaDB
23-40: default okrem 31 (nechať) a 34 (zmazať)
```

Čokoľvek neoznačené = beriem **default (moje odporúčanie)** a zapíšem to do kontraktu.
Otázky označené 🔴 sú **nevratné** (schéma / verejné API / mazanie) — tie potrebujem
potvrdiť explicitne, default tam neplatí.

---

## A. Cieľ, rozsah a umiestnenie (1–10)

1. 🔴 **Kde má appka žiť?** (a) `C:\Aura\aura-roadmap` — konzistentne s rodinou, (b) `C:\Users\Ucet\Desktop\AuraAI`, (c) ostať v `IT roadmap planner`.
   → odp: **(a)** `C:\Aura\aura-roadmap` — rodina je v `C:\Aura`, integrácie a docker siete tam fungujú.
2. **Ako sa má appka volať v UI?** (a) „Aura Roadmap", (b) „Aura Northstar", (c) „Aura Plán", (d) iné.
   → odp: **(a) Aura Roadmap** — hovorí čo to je, „Northstar" nič nepovie.
3. **Má sa zachovať názov `northstar` v kóde/kontajneroch?** → odp: **nie** — všade `aura-roadmap`, konzistentne s `aura-kpi`/`aura-logistika`.
4. 🔴 **Je toto port (prepísanie na rodinný stack), alebo len skin (nechať Cloudflare a doladiť CSS)?**
   → odp: **plný port**. Cloudflare D1/R2 je v rodine cudzorodý, blokuje integrácie s MariaDB appkami a zdvojuje devops.
5. **Prepisujeme na zelenej lúke, alebo migrujeme existujúci kód postupne?** → odp: **nový skeleton z rodinného vzoru + prenos logiky po moduloch** (nie copy-paste celého repa).
6. **Sú v existujúcej appke reálne dáta, ktoré treba zachovať?** (D1 je v docker volume `northstar-roadmap-data`) → odp: **potrebujem od teba** — ak áno, spravím export pred čímkoľvek.
7. **Kto appku bude reálne používať?** (a) len ty, (b) ty + 2–3 ľudia, (c) celý tím (~12 ľudí), (d) externisti tiež.
   → odp: **potrebujem od teba** — toto určuje, či vôbec potrebujeme roly, timesheety a schvaľovanie.
8. **Na čo appku reálne používaš dnes?** (a) plánovanie IT/dev práce Aura, (b) evidencia projektov pre CEO reporting, (c) sprintové riadenie, (d) zatiaľ nič, je to prototyp.
   → odp: **potrebujem od teba** — najdôležitejšia otázka celého dotazníka.
9. **Aká je cieľová mierka?** Kontrakt V3 hovorí 500 projektov / 100 tímov / 2 000 users / 100 000 položiek.
   → odp: **znížiť na ~50 projektov / 5 tímov / 15 users / 5 000 položiek**. Terajší cieľ je enterprise fantázia, ktorá zdvojnásobuje kód (virtualizácia, cursor pagination, concurrency).
10. **Má appka byť verejne tunelovaná cez ngrok, alebo len localhost?** → odp: **len localhost**, ngrok profil pripravený ale vypnutý (ako `aura-kpi`).

## B. Stack a architektúra (11–22)

11. 🔴 **Databáza:** (a) MariaDB 11.4 ako celá rodina, (b) ostať na D1/SQLite, (c) Postgres.
    → odp: **(a) MariaDB 11.4** — jediná cesta k integráciám (read-only user, spoločná sieť) a k rodinným zálohovým skriptom.
12. 🔴 **Framework:** (a) Next.js 16 App Router ako `sperky-ai`/`ads-hierarchy`, (b) Node+Express+vanilla SPA ako `aura-kpi`/`aura-logistika`, (c) ostať na `vinext`.
    → odp: **potrebujem recon report** — rodina má oba vzory. Moja predbežná preferencia: **(b) Express + vanilla SPA**, pretože táto appka je vnútorný nástroj a vzor `aura-kpi` je najjednoduchší na údržbu. Ale ak je appka ťažká na interakcie (drag&drop timeline), (a) môže byť lepšie. **Rozhodnem po recon reporte a dám ti to na potvrdenie.**
13. **`vinext` (0.0.50) — akceptovateľná závislosť?** → odp: **nie, vyhodiť**. Verzia 0.0.x pre jadro buildu je riziko bez prínosu.
14. **ORM:** (a) Drizzle, (b) raw SQL + query helper ako `aura-kpi`, (c) Prisma.
    → odp: **(b) raw SQL + helper** ak ideme Express cestou (rodinný vzor), **(a) Drizzle** ak Next.js.
15. **TypeScript alebo JS?** → odp: **TS ak Next.js, JS ak Express** — podľa toho, čo má vzorová appka rodiny; nemiešať.
16. **Prílohy k položkám (dnes R2, do 100 MB):** (a) lokálny disk + docker volume, (b) MariaDB blob, (c) zrušiť prílohy úplne, (d) len URL odkazy.
    → odp: **(d) len URL odkazy** v prvej verzii, (a) ako P2. Upload súborov je celý bezpečnostný a zálohovací balík navyše pre feature, ktorú v internom plánovači skoro nepoužiješ.
17. **Email notifikácie (dnes SMTP sidecar + outbox tabuľka):** (a) zachovať, (b) zrušiť, len in-app, (c) zachovať ale P2.
    → odp: **(b) zrušiť teraz, len in-app badge** — presne ako sa rozhodlo pri `aura-kpi`. Šetrí sidecar kontajner, outbox, retry logiku a 2 API routy.
18. **Notifikačné centrum in-app:** zachovať? → odp: **áno, ale zjednodušené** — jedna tabuľka, zvonček s počtom, bez severity vetvenia.
19. **`app/chatgpt-auth.ts` + `.openai/hosting.json` + `app/_sites-preview` — ChatGPT apps hosting.** Používaš to? → odp: **zmazať** — nesúvisí s internou appkou, je to mŕtvy prílepok.
20. **Optimistic concurrency (`version` stĺpec + `409 Conflict`) na 7 tabuľkách:** → odp: **nechať len na `checkpoints` a `sprints`** (tam reálne hrozí súbeh pri rozhodovaní), inde zmazať.
21. **Soft delete (`deleted_at`) — na ktorých entitách?** → odp: **len `work_items` a `sprints`**; inde hard delete s audit záznamom.
22. **Testy:** (a) `node --test` ako dnes, (b) vitest ako `sperky-ai`, (c) oboje.
    → odp: **zladiť s rodinou** podľa recon reportu, nie vymýšľať tretí spôsob.

## C. Dátový model — čo zostáva a čo padá (23–40)

Dnes je **30 tabuliek**. Cieľ: **~14**.

23. 🔴 **`projects`** (30 stĺpcov vrátane `budget`, `spent`, `timelineStart`, `timelineSpan`, `taskCount`, `risks`) → odp: **zachovať, ale zoštíhliť** — zmazať `timeline_start`/`timeline_span` (počíta sa z dátumov), `task_count`/`completed_task_count` (denormalizácia = bug), `risks` (číslo bez obsahu).
24. 🔴 **`budget` + `spent` na projekte** — sleduješ v tejto appke peniaze? → odp: **potrebujem od teba**. Ak nie, zmazať.
25. 🔴 **`tasks` vs `work_items` — dve paralelné tabuľky na to isté** (V2 dedičstvo). → odp: **zmazať `tasks`, nechať `work_items`**. Toto je najväčší logický duplikát v appke.
26. 🔴 **`work_items` hierarchia Epic→Feature→Story→Task→Subtask (5 úrovní) + Bug + Spike.** → odp: **zredukovať na 2 úrovne: Úloha → Podúloha**, typy `task | bug | idea`. 5 úrovní je Jira ceremónia pre 12-členný tím.
27. 🔴 **`work_items` prioritizačné skóre (`value/risk/urgency/effort/priorityScore` + admin váhy)** → odp: **zmazať**, nechať ručné poradie `rank_value` + `priority P1/P2/P3`. Vážené skórovanie nikto neudržiava.
28. 🔴 **`workflows` + `workflow_statuses` + `workflow_transitions`** (workflow engine per projekt) → odp: **zmazať všetky 3**. Jeden pevný stavový model pre celú appku: `Backlog → Prebieha → Čaká → Hotovo` (zladené s `aura-kpi` slovníkom).
29. 🔴 **`custom_fields` + `work_item_custom_values`** → odp: **zmazať obe**. Konfigurovateľné polia sú najdrahšia a najmenej používaná feature v internom nástroji.
30. 🔴 **`dashboard_layouts` + `dashboard_widgets` + `dashboard_layout_versions` + `react-grid-layout`** (admin dashboard builder z V2) → odp: **zmazať všetko**. Jeden dobre navrhnutý dashboard > builder, ktorý si nastavíš raz.
31. 🔴 **`user_view_preferences` + `team_view_presets`** (per-page uložené filtre a tímové presety) → odp: **zmazať `team_view_presets`, `user_view_preferences` nechať** (uložený posledný filter je reálne užitočný).
32. 🔴 **`timesheets` + `timesheet_entries` + týždenné schvaľovanie** → odp: **potrebujem od teba**. Ak nikto neschvaľuje výkazy, zmazať oboje a nechať len `worklogs`.
33. 🔴 **`worklogs` (evidencia času)** → odp: **zachovať, ale nepovinné**. Kontrakt V3 #78 ich robí povinnými pri dokončení položky — to je otrava, zrušiť.
34. 🔴 **`attachments`** → odp: **zmazať tabuľku** (viď 16), nahradiť `links` (url + label) alebo úplne vynechať.
35. 🔴 **`email_outbox`** → odp: **zmazať** (viď 17).
36. 🔴 **`plan_versions` (baseline + snapshot JSON + publikovanie)** → odp: **zachovať zjednodušene** — baseline snapshot áno (potrebné na „plán vs realita"), ale bez draft/publish workflow a bez `version`.
37. 🔴 **`checkpoint_templates` + `checkpoint_requirements` + readiness %** → odp: **zachovať `checkpoint_requirements` (checklist), zmazať `checkpoint_templates`**. Readiness = pomer splnených povinných bodov, to je dobré jadro produktu.
38. 🔴 **`checkpoint_decisions` + `checkpoint_sprints` + `sprint_allocations`** → odp: **`checkpoint_decisions` zachovať** (nemenný záznam rozhodnutia = jadro), **`checkpoint_sprints` a `sprint_allocations` zmazať**.
39. 🔴 **`work_item_comments` + `work_item_watchers` + `work_item_dependencies`** → odp: **komentáre zachovať, watchers zmazať, dependencies zachovať len typ `blokuje`** (bez `lag_days`).
40. 🔴 **`teams` + `user_team_memberships`** → odp: **potrebujem od teba**. Pri ≤5 ľuďoch je tím zbytočná vrstva; pri 12 s oddeleniami má zmysel (a mapovalo by sa na oddelenia v `aura-kpi`).

## D. Zjednodušenie funkcií, IA a navigácia (41–58)

41. 🔴 **V1 `app/RoadmapApp.tsx` (68 KB) + `app/globals.css` (65 KB) — zmazať?** → odp: **áno, zmazať celé**.
42. 🔴 **V2 `app/v2/*` (~200 KB: WorkspaceApp, views, Modals, DashboardBuilder, AdminSettings) — zmazať?** → odp: **áno, zmazať celé**; čo z toho prežije, prežije ako feature v novom UI.
43. **Zostáva teda len V3 Timeline ako jadro?** → odp: **áno** — a preto zrušiť aj názvy „V2/V3" v kóde, je to jedna appka.
44. **5 režimov Timeline (`story`, `roadmap`, `sprints`, `decisions`, `calendar`) — koľko zostane?** → odp: **3: Roadmap, Sprinty, Rozhodnutia**. `story` a `roadmap` sú 80 % to isté; `calendar` duplikuje roadmap v inom obale.
45. **Ktorý je default?** → odp: **Roadmap**.
46. **5 zoomov (rok/kvartál/mesiac/týždeň/šprint)** → odp: **3: kvartál / mesiac / týždeň**.
47. **3 hustoty (comfortable/cozy/compact)** → odp: **1 hustota**. Toto je čistý CSS balast (3× tokeny, 3× QA).
48. **Legacy redirecty `/roadmap` a `/checkpoints` → Timeline (`LegacyTimelineRedirect.tsx`)** → odp: **zmazať**. Nová appka nemá legacy.
49. **Route `/[view]` catch-all z V2 (9 pohľadov: overview, projects, structure, roadmap, checkpoints, tasks, kpi, capacity, settings)** → odp: **zmazať catch-all**, explicitné routy pre to, čo prežije.
50. **Aká má byť finálna navigácia?** → odp: **6 položiek: Prehľad · Timeline · Projekty · Úlohy · Rozhodnutia · Nastavenia**.
51. **`/structure` (portfólio → program → projekt) — potrebné?** → odp: **zmazať ako samostatný pohľad**; portfólio/program zostávajú ako filtre na projekte.
52. 🔴 **Dvojica `portfolio` + `program` na projekte — používaš obe úrovne?** → odp: **potrebujem od teba**. Pri jednofirmovom IT stačí jedna („oblasť").
53. **`/kpi` pohľad (zdravie, trendy, zdrojové metriky)** → odp: **zmazať z tejto appky** — KPI má vlastnú appku `aura-kpi`, toto je duplikát. Namiesto toho odkaz/embed.
54. **`/capacity` (bary, heatmapa, projektové záväzky)** → odp: **zjednodušiť na jeden kapacitný panel vnútri Sprintov**, nie samostatný pohľad.
55. **Drag & drop (`@dnd-kit`) v backlogu a sprint planneri** → odp: **zachovať** — tu má reálnu hodnotu; ale s klávesnicovou alternatívou (dialóg „Presunúť").
56. **Virtualizácia (`@tanstack/react-virtual`)** → odp: **zmazať** — pri 5 000 položkách a serverovom filtrovaní netreba.
57. **Modal-first detail (`?project=<id>` centrovaný modal)** → odp: **zachovať**, je to rodinný vzor.
58. **Opakované checkpointy (recurrence rule + inštancie, kontrakt #34)** → odp: **zmazať** — implementované alebo nie, je to zbytočná zložitosť.

## E. Dizajn a UI ujednotenie (59–74)

59. 🔴 **Zdroj pravdy pre dizajn:** (a) oficiálny Aura design systém rodiny (`styles.css` z `aura-kpi`/banner-studio), (b) terajší `app/v3/styles.css`, (c) mix.
    → odp: **(a)** — skopírovať rodinný `styles.css` 1:1 a doplniť len timeline-špecifické komponenty.
60. **`--ns-*` alias vrstva nad `--aura-*` tokenmi** → odp: **zmazať celú alias vrstvu**, používať priamo `--aura-*`.
61. **Tri CSS súbory (`globals.css` 65 KB + `v2/styles.css` 65 KB + `v3/styles.css` 59 KB = 189 KB)** → odp: **jeden `styles.css`**, cieľ pod 45 KB.
62. 🔴 **Fonty:** kontrakt V3 káže Geist + Geist Mono + Playfair Display; rodina používa **Inter**.
    → odp: **Inter** (+ systémový fallback), `font-variant-numeric: tabular-nums` globálne. Playfair je dekorácia, ktorá do interného nástroja nepatrí.
63. **Presné tokeny:** teal `#05bcc4` / deep `#03797e`, gold `#d8b878` / `#c9a869` / `#8a6417`, paper dark `#0e1413` light `#f8f4f7`, line dark `#22302e`. Potvrdzuješ? → odp: **áno**, sú to tokeny z Aura HTML report štandardu a rodinných apiek.
64. **Dark/light** → odp: **oboje, dark ako default**, prepínač pill vpravo hore, `:root[data-theme]`, farby cez `color-mix` na tokeny (rodinný vzor).
65. **Semantické farby** → odp: **striktne: zelená `#3fbf7f` = good, gold = warn, `#e0554e` = risk. Kategórie iba brand tóny.** Nikdy červená na neutrálnu kategóriu.
66. **Ikony:** `lucide-react` (dnes) vs inline SVG (rodina) → odp: **podľa frameworku** — pri Next.js `lucide-react`, pri vanilla SPA inline SVG set. Žiadne emoji v UI.
67. **Grafy** → odp: **ručné SVG** s rodinným `renderLineChart` helperom (rodina to tak má a knižnica by bola prvá v rodine).
68. **Jazyk UI** → odp: **slovenčina** (kód a komentáre anglicky). Konzistentné s rodinou.
69. **i18n SK/EN?** → odp: **nie** — `aura-kpi` má SK/EN, ale tu je to interný nástroj pre teba; pridať sa dá neskôr.
70. 🔴 **Stavové slovníky sú dnes nekonzistentné:** projekt `On track/At risk/Blocked/Planned` (EN) vs task `Nové/Prebieha/Čaká/Hotovo` (SK) vs work_item `Backlog` vs checkpoint `planned/ready/approved/blocked`.
    → odp: **jeden slovník, SK v UI + stabilné EN kľúče v DB**. Toto je najviditeľnejšia „logická neujednotenosť".
71. **Zdravie projektu `green/amber/red/blue`** → odp: **zjednotiť s KPI appkou**: zelená ≥100 %, žltá 60–99 %, červená <60 %, sivá = bez dát. Zrušiť `blue`.
72. **Mobilná parita (kontrakt #89: plná parita vrátane plánovania a uploadu)** → odp: **znížiť na čítanie + rýchle akcie na mobile**; drag&drop plánovanie je desktop feature. Plná parita = 2× práce za nič.
73. **Accessibility cieľ WCAG 2.2 AA + plná klávesnica** → odp: **zachovať** — je to lacné, keď sa robí od začiatku, a `prefers-reduced-motion` je rodinný štandard.
74. **Animácie** → odp: **IntersectionObserver reveal + hover 150–200 ms, `prefers-reduced-motion` vypína** (rodinný štandard).

## F. Auth, roly a bezpečnosť (75–82)

75. 🔴 **Roly:** dnes admin/editor/viewer. → odp: **zachovať 3 roly** (rodinný vzor `aura-kpi`: Admin/Editor/Prehliadač), SK názvy v UI.
76. **Auth mechanizmus** → odp: **zladiť s rodinou** — podľa recon reportu (PBKDF2 alebo bcrypt + session cookie / JWT). Nevymýšľať vlastné.
77. **Názov cookie** → odp: `aura_roadmap_token` (rodinná konvencia `<app>_token`).
78. **Prvý admin z `ADMIN_EMAIL`/`ADMIN_PASSWORD`** → odp: **zachovať**, + self-service zmena hesla (ako v `aura-kpi`).
79. **Per-projektové oprávnenia (kontrakt #76: Editor len v tíme priradenom k projektu)** → odp: **zmazať** — globálne roly stačia. Granulárne práva sú najčastejší zdroj bugov.
80. **Audit log** → odp: **zachovať**, jedna tabuľka `audit_log` s rodinnou schémou.
81. **Origin/CSRF kontrola na zápisových API** → odp: **zachovať**.
82. **Security prehliadka** → odp: **povinná** — auth aj keby to bol localhost (rodinné pravidlo pre exponované endpointy).

## G. Integrácie s aura rodinou (83–90)

83. **Má appka čítať dáta z iných aura apiek?** (a) nie, (b) `aura-kpi`, (c) `aura-logistika`, (d) `sperky-ai`.
    → odp: **potrebujem od teba**. Predbežne: **nie v prvej verzii**, štruktúra pripravená.
84. **Majú iné appky čítať z tejto?** → odp: **pripraviť read-only DB user** `roadmap_ro` (rodinný vzor), ale nezapájať teraz.
85. **Spoločná docker sieť s rodinou?** → odp: **áno, pripravené ale zakomentované** (vzor `aura-kpi` A5).
86. 🔴 **Port:** obsadené sú 3000 (sperky-ai), 3010 (northstar), 3011 (ads-hierarchy), 3030 (aura-kpi). → odp: **3040**.
87. **Jeden login pre celú rodinu (SSO)?** → odp: **nie teraz** — samostatné účty ako ostatné appky; je to otvorený bod pre celú rodinu, nie pre túto appku.
88. **Má appka vedieť o oddeleniach z `aura-kpi`?** → odp: **potrebujem od teba** (súvisí s otázkou 40 o tímoch).
89. **Prepojenie na Asanu / kalendár / porady?** → odp: **nie** — udrž rozsah; ak treba, samostatná úloha.
90. **Zálohy** → odp: **rodinný `mysqldump` skript do `backups/`, posledné 3** (globálne pravidlo).

## H. Prevádzka, migrácia, testy a release (91–100)

91. **Docker Compose** → odp: **áno**, `aura-roadmap-app` + `aura-roadmap-db` (rodinná konvencia), ngrok profil vypnutý.
92. 🔴 **Migrácia existujúcich D1 dát do MariaDB** → odp: **potrebujem odpoveď na otázku 6**. Ak sú dáta reálne: export → transform skript → import, so zálohou. Ak sú to len seed dáta: **čistý štart so seedom**.
93. **Seed dáta** → odp: **fiktívne demo portfólio** (3 projekty, 2 šprinty, 4 checkpointy) — nikdy reálne osobné údaje.
94. **Testy — čo pokryť** → odp: **schéma bootstrap, auth+RBAC, checkpoint readiness→decision, sprint commit→close, API kontrakty, docker smoke**.
95. **Playwright / axe** → odp: **áno na 3 kľúčové obrazovky**, nie na všetko.
96. **Performance profil (kontrakt #91: 500 projektov / 100 000 položiek)** → odp: **zmazať z akceptačných kritérií** (viď 9).
97. 🔴 **Git:** (a) nový repo `aura-roadmap`, (b) branch v existujúcom repe, (c) worktree.
    → odp: **(a) nový lokálny repo + feature branch `feat/aura-family-port`**, push len na feature branch.
98. **Má sa pôvodný `IT roadmap planner` zachovať ako archív?** → odp: **áno, nechať nedotknutý**, kým nová appka nebeží overená. Nič nemažem.
99. **Dokumentácia** → odp: **`CLAUDE.md` + `README.md` + `KONTRAKT.md` v projekte** (rodinný štandard po šprinte).
100. **Definícia hotového** → odp: **appka beží v Dockeri na 3040, login funguje, 3 režimy Timeline, checkpoint readiness→rozhodnutie, sprint commit→close, worklog, audit, dark+light, mobil čitateľný, testy zelené, security prehliadka, overené v prehliadači screenshotmi.**

---

## Zhrnutie navrhovaného zjednodušenia

| Vec | Dnes | Návrh |
|---|---|---|
| Generácie UI | 3 (V1+V2+V3) | 1 |
| Zdrojový kód | ~600 KB | cieľ ~180 KB |
| CSS | 189 KB v 3 súboroch | 1 súbor, cieľ <45 KB |
| Tabuľky | 30 | ~14 |
| Režimy Timeline | 5 | 3 |
| Zoomy | 5 | 3 |
| Hustoty | 3 | 1 |
| Hierarchia práce | 5 úrovní + Bug + Spike | 2 úrovne, 3 typy |
| Workflow engine | konfigurovateľný per projekt | 1 pevný stavový model |
| Custom fields | áno | nie |
| Dashboard builder | áno | nie |
| Kontajnery | 2 (app + mailer) | 2 (app + db) |
| Cieľová mierka | 500 proj / 2 000 users | 50 proj / 15 users |

**Tabuľky, ktoré padajú (16):** `tasks`, `workflows`, `workflow_statuses`, `workflow_transitions`,
`custom_fields`, `work_item_custom_values`, `dashboard_layouts`, `dashboard_widgets`,
`dashboard_layout_versions`, `team_view_presets`, `attachments`, `email_outbox`,
`checkpoint_templates`, `checkpoint_sprints`, `sprint_allocations`, `work_item_watchers`
(+ podmienene `timesheets`, `timesheet_entries` podľa otázky 32).

## Čo potrebujem od teba nutne (bez toho neviem začať)

Otázky **6, 7, 8, 12, 24, 32, 40, 52, 83** — všetko ostatné viem rozhodnúť sám na default.
Najdôležitejšia je **8** (na čo to reálne používaš).
