# Aura Roadmap — 50 dokončovacích otázok

**Dátum:** 2026-07-28
**Fáza:** detailná špecifikácia pre implementačných agentov (po kontrakte, pred behom)

Kontrakt rieši *čo* staviame. Tieto otázky riešia *ako presne* — polia, texty, chovanie, hraničné
prípady. Sú to veci, ktoré by inak každý z 10 agentov rozhodol inak a appka by bola nekonzistentná.

**Ako odpovedať:** rovnako ako pri stovke — `1-6: default`, `12: b`, atď.
Všetko neoznačené beriem na **`→ odp:`**. Žiadna z nich nie je nevratná (žiadne dáta neexistujú),
takže defaulty sú bezpečné a schválením plánu ich potvrdzuješ.

---

## A. Prehľad — dashboard (1–6)

1. **Čo je v KPI stripe na Prehľade?** → odp: **6 dlaždíc** — Aktívne projekty · Projekty v riziku · Otvorené checkpointy · Rozhodnutia čakajúce na mňa · Aktívny šprint (% kapacity) · Nedokončené položky po termíne.
2. **Ako sa zoradia projekty na Prehľade?** → odp: **podľa zdravia (červené prvé), potom podľa najbližšieho checkpointu.** Riziko musí byť vidieť hneď.
3. **Koľko projektov sa zobrazí?** → odp: **všetky** (pri 50 projektoch netreba pagination na Prehľade).
4. **Je na Prehľade graf?** → odp: **áno, jeden** — vývoj dokončených story pointov po týždňoch za posledných 12 týždňov (`recharts`, séria 1 = `--chart-1`).
5. **Má Prehľad „čo sa zmenilo od naposledy"?** → odp: **nie** v prvej verzii — pridáva stavovú vrstvu, ktorá sa musí udržiavať. Namiesto toho blok „Posledná aktivita" z `audit_log` (10 riadkov).
6. **Dá sa Prehľad exportovať pre CEO report?** → odp: **áno, kopírovateľná textová sumarizácia** (tlačidlo „Kopírovať súhrn") — nie PDF, nie xlsx. Rýchla cesta do reportu.

## B. Timeline (7–15)

7. **Čo je riadok v režime Roadmap?** → odp: **projekt** (zoskupený podľa `area`). Bez tímových riadkov (tímy sme zrušili).
8. **Čo je riadok v režime Sprinty?** → odp: **šprint** ako pruh, pod ním jeho položky. Paralelné šprinty vedľa seba.
9. **Čo je v režime Rozhodnutia?** → odp: **fronta checkpointov** zoradená podľa termínu, s readiness barom a stavom. Nie časová os — je to pracovná fronta.
10. **Ako sa označí „dnes"?** → odp: **vertikálna teal linka** + label „Dnes" v hlavičke.
11. **Ako sa odlíši minulosť a budúcnosť?** → odp: **vyplnené vs obrysové značky** + textový stav (rodinný vzor z kontraktu V3 #17, to bolo dobré rozhodnutie).
12. **Čo sa dá presúvať drag&drop v Timeline?** → odp: **len v režime Sprinty** — položka medzi šprintmi a v rámci poradia. Presúvanie dátumov projektu ťahaním **nie** (nepresné, riskantné).
13. **Klávesnicová alternatíva presunu?** → odp: **dialóg „Presunúť" (`M`)** — vyber cieľový šprint zo zoznamu. Plus `↑/↓` na poradie.
14. **Sticky prvky?** → odp: **časová hlavička + ľavá identita riadku + toolbar.**
15. **Čo sa stane pri kolízii popisov?** → odp: **skrátiť s `title` tooltipom.** Semantický zoom a zhlukovanie z kontraktu V3 #21 je mimo rozsahu — pri 50 projektoch netreba.

## C. Projekty (16–22)

16. **Finálne polia projektu?** → odp: `code` (unikátny), `name`, `description`, `area`, `status`, `health`, `progress` (0–100), `owner` + `owner_initials`, `start_date`, `end_date`, `priority` (P1/P2/P3), `next_checkpoint` + `next_checkpoint_date` (počítané, nie zadávané), `version`, timestamps.
17. **Je `progress` ručný alebo počítaný?** → odp: **počítaný** z pomeru dokončených story pointov položiek projektu. Ručné číslo nikto neaktualizuje.
18. **Je `health` ručný alebo počítaný?** → odp: **ručný** (vlastník projektu vie viac než dáta), ale s návrhom z `progress` vs čas. Farby podľa kontraktu §3.2/71.
19. **Default pohľad na Projektoch?** → odp: **tabuľka** (rýchlejšie skenovanie), prepínač na karty.
20. **Filtre?** → odp: `area`, `status`, `priority`, fulltext `q`. Uložia sa do `user_view_preferences`.
21. **Dá sa projekt zmazať?** → odp: **áno, len Admin, s potvrdením a auditom.** Hard delete + `ON DELETE CASCADE` na deti (soft delete sme zrušili). Potvrdzovací dialóg vyžaduje napísať `code` projektu.
22. **Čo je v projektovom detaile (modal)?** → odp: **4 taby** — Prehľad · Položky · Checkpointy · Aktivita.

## D. Úlohy — work items (23–30)

23. **Finálne polia položky?** → odp: `project_id`, `sprint_id?`, `checkpoint_id?`, `parent_id?`, `item_type` (`task|bug|idea`), `title`, `description`, `status`, `status_category`, `priority`, `story_points`, `rank_value`, `assignee`, `reporter`, `due_date?`, `logged_minutes`, `version`, timestamps.
24. **Stavový slovník?** → odp: **DB kľúče** `backlog | in_progress | waiting | done`; **SK** Backlog / Prebieha / Čaká / Hotovo; **EN** Backlog / In progress / Waiting / Done. Zladené s `aura-kpi`.
25. **Môže mať podúloha vlastnú podúlohu?** → odp: **nie** — 2 úrovne tvrdo, validácia na serveri odmietne 3. úroveň.
26. **Ako sa počíta `story_points` rodiča?** → odp: **suma podúloh, ak má podúlohy; inak vlastná hodnota.** Zobraziť ako „5 (3+2)".
27. **Default zoradenie backlogu?** → odp: **`rank_value` vzostupne** (ručné poradie), sekundárne `priority`.
28. **Board alebo zoznam ako default?** → odp: **zoznam** (pri 2 úrovniach je hierarchia čitateľnejšia v zozname), prepínač na board podľa `status_category`.
29. **Je `assignee` voľný text alebo väzba na `app_users`?** → odp: **väzba na `app_users`** (pri 4 ľuďoch je voľný text zdroj nekonzistencie), plus možnosť „Nepriradené".
30. **Ako sa zadáva worklog?** → odp: **inline v detaile položky** — dátum (default dnes), minúty, popis. Rýchle tlačidlá +15/+30/+60 min.

## E. Checkpointy a rozhodnutia (31–38)

31. **Typy checkpointu?** → odp: **4** — `review | decision | delivery | gate`. Kontrakt V3 #26 mal 9 (míľnik, security, KPI, go-live, retro navyše) — to je zbytočná taxonómia.
32. **Lifecycle?** → odp: **4 stavy** — `planned | ready | decided | blocked`. Kontrakt V3 #27 mal 8.
33. **Výsledky rozhodnutia?** → odp: **4** — `go | conditional_go | no_go | deferred`. Kontrakt V3 #28 mal 5 (doplnenie podkladov = to isté ako `deferred`).
34. **Kedy sa dá rozhodnúť?** → odp: **až pri 100 % readiness** (kontrakt V3 #30 — správne pravidlo, jadro produktu). Admin môže override s povinným dôvodom do auditu.
35. **Musí byť schvaľovateľ iný než vlastník?** → odp: **len pri type `gate`.** Kontrakt V3 #29 to chcel aj pri go-live, ktorý sme zrušili. Pri 3–4 ľuďoch je tvrdšie pravidlo neprakticke.
36. **Dá sa rozhodnutie prepísať?** → odp: **nie.** Formálne znovuotvorenie vytvorí **nový** záznam a starý dostane `superseded_by`. Nemennosť je jadro rozhodovacej fronty.
37. **Čo sa stane po rozhodnutí?** → odp: **(a)** vytvorí sa baseline snapshot do `plan_versions`, **(b)** audit záznam, **(c)** in-app notifikácia vlastníkovi, **(d)** pri `conditional_go` sa povinne vytvorí follow-up položka.
38. **Taby detailu checkpointu?** → odp: **4** — Prehľad · Podmienky · Rozhodnutie · Aktivita. Kontrakt V3 #37 mal 6 (Príprava a Follow-up sa zlúčia do Prehľadu/Podmienok).

## F. Nastavenia, roly, audit (39–43)

39. **Čo presne smie Editor?** → odp: projekty, položky, checkpointy, worklogy, šprinty — **vytvárať a upravovať**; **nesmie** mazať projekty, spravovať používateľov, meniť nastavenia appky.
40. **Čo smie Prehliadač?** → odp: **len čítanie** + vlastné filtre a preferencie. Žiadny zápis, ani worklog.
41. **Kto môže rozhodnúť o checkpointe?** → odp: **Admin a Editor**, ale len ak je uvedený ako `approver`. Prehliadač nikdy.
42. **Čo je v Nastaveniach?** → odp: **5 sekcií** — Vzhľad (téma, hustota, jazyk) · Účet (zmena hesla) · Používatelia (len Admin) · Audit (len Admin, filtrovateľný) · Zálohy (len Admin, stav posledného dumpu).
43. **Čo sa loguje do auditu?** → odp: **každý zápis** — create/update/delete na projektoch, položkách, checkpointoch, rozhodnutiach, šprintoch, používateľoch + login/logout + override readiness. IP a User-Agent sa derivujú **na serveri**.

## G. Texty, i18n, formáty (44–47)

44. **Ako sa riešia preklady?** → odp: **jeden `src/lib/i18n.ts`** s `T_SK`/`T_EN` a `t(key)`, kľúče ploché s prefixom modulu (`projects.title`). DB číselníky `name_sk`/`name_en`. localStorage `aura_roadmap_lang`.
45. **Default jazyk?** → odp: **SK**, `document.documentElement.lang` sa mení pri prepnutí.
46. **Formát čísel a dátumov?** → odp: `Intl.NumberFormat('sk-SK')` / `en-US`, dátumy `sk-SK` / `en-GB`, desatinná čiarka, nedeliteľná medzera v tisícoch, `%` oddelené nbsp, delty vždy so znamienkom. `font-variant-numeric: tabular-nums` globálne na `body`.
47. **Tón chybových správ?** → odp: **slovensky, vecne, bez ospravedlnení** — vzor z rodiny: „Priveľa požiadaviek — skús o chvíľu.", „Záznam sa medzičasom zmenil. Obnovte údaje a skúste to znova."

## H. Prevádzka, seed, repo (48–50)

48. **Čo presne obsahuje seed?** → odp: 1 admin z env · 2 demo účty (Editor, Prehliadač) · 3 oblasti · 3 projekty · 4 checkpointy (1 rozhodnutý, 1 ready, 1 planned, 1 blocked) · 2 šprinty (1 active, 1 draft) · ~20 položiek naprieč stavmi · 5 worklogov · 3 komentáre. **Všetko fiktívne.**
49. **Názov GitHub repa?** → odp: **`DeliPistacna/aura-roadmap`**, private. Prvý push až po zelených testoch, na branch `feat/aura-family-port`.
50. **Čo sa stane s pôvodným `IT roadmap planner`?** → odp: **nič** — zostáva nedotknutý. Jeho kontajner `northstar-roadmap` na porte 3010 môže bežať ďalej; nová appka je na 3040 bez kolízie. Vypnutie starej je tvoje rozhodnutie po overení novej.
