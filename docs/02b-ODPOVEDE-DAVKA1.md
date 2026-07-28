# Odpovede — dávka 1 (blokujúce otázky)

**Dátum:** 2026-07-28
**Zdroj:** priama odpoveď používateľa na 4 blokujúce otázky z `01-KONTEXT-100-OTAZOK.md`

---

## #8 — Na čo appku reálne používaš?

**Odpoveď: všetky tri účely naraz + dnes je to prototyp.**

- ✅ Plánovanie IT/dev práce Aura
- ✅ Evidencia projektov pre CEO reporting
- ✅ Rozhodovacia fronta (checkpointy)
- ✅ Zatiaľ nič, je to prototyp

**Interpretácia:** appka sa dnes reálne nepoužíva, ale **zamýšľané použitie sú všetky tri
oblasti**. Staviame teda podľa zamýšľaného použitia, **nie** podľa toho, čo existujúci kód
náhodou obsahuje.

**Dôsledky pre rozsah:**
- Jadro nie je jedna vec — sú to **tri rovnocenné piliere**: Timeline/Sprinty (plánovanie),
  Projekty/Prehľad (evidencia pre reporting), Checkpointy/Rozhodnutia (rozhodovacia fronta).
- Otázka 44 (koľko režimov Timeline zostane) sa **mení**: `decisions` režim je teraz
  plnohodnotný pilier, nie vedľajšia vec. Návrh 3 režimov (Roadmap / Sprinty / Rozhodnutia)
  **potvrdený a posilnený**.
- Otázka 53 (zmazať `/kpi` pohľad) **potvrdená** — reporting znamená „ťahám čísla o projektoch",
  nie „druhá KPI appka". Prehľad musí byť dobrý zdroj čísel pre CEO report.
- Keďže je to prototyp bez reálneho používania, **nie sme viazaní existujúcimi UX rozhodnutiami**
  — môžeme zjednodušovať agresívne.

## #4 + #11 — Port alebo skin?

**Odpoveď: plný port na MariaDB. 🔴 NEVRATNÉ — potvrdené používateľom.**

**Dôsledky:**
- Padá: Cloudflare Worker runtime, D1 (SQLite), R2 binding `FILES`, `wrangler`,
  `@cloudflare/vite-plugin`, `@cloudflare/workers-types`, `vinext` 0.0.50, `worker/index.ts`,
  `worker-configuration.d.ts`, `.wrangler/` volume.
- Prichádza: MariaDB 11.4, Docker Compose `aura-roadmap-app` + `aura-roadmap-db`,
  rodinné zálohovanie `mysqldump` → `backups/` (posledné 3).
- Otázka 16 (prílohy v R2) — R2 zaniká, takže **odpoveď (d) len URL odkazy** je teraz
  automatická, nie voliteľná.
- Otázka 92 (migrácia D1 → MariaDB) — **zaniká** vďaka odpovedi na #6.
- Framework (otázka 12) zostáva otvorený, rozhodne sa po recon reporte.

## #7 — Kto bude appku používať?

**Odpoveď: ja + 2–3 ľudia.**

**Dôsledky — padajú tabuľky a moduly:**
- `teams` — zmazať (otázka 40 vyriešená: pri 3–4 ľuďoch je tím zbytočná vrstva)
- `user_team_memberships` — zmazať
- `timesheets` — zmazať (otázka 32 vyriešená: nikto neschvaľuje výkazy 3 ľuďom)
- `timesheet_entries` — zmazať
- `team_view_presets` — zmazať (už bolo navrhnuté, teraz je to isté)
- `sprint_allocations` — zmazať (kapacita per tím nemá zmysel bez tímov)
- `work_item_watchers` — zmazať (pri 4 ľuďoch všetci vidia všetko)
- **Zostávajú 3 roly** Admin / Editor / Prehliadač (otázka 75 potvrdená)
- **Per-projektové oprávnenia** (otázka 79) — zmazať, globálne roly stačia. Potvrdené.
- `app/ExecutionViews.tsx` (20 KB) — časť s timesheetmi padá
- API routy `/api/timesheets`, `/api/timesheets/[id]/[action]`, `/api/admin/teams`,
  `/api/admin/teams/[id]`, `/api/admin/view-presets`, `/api/work-items/[id]/watch` — padajú
- Kapacitný panel (otázka 54) — zostáva, ale ako **kapacita osôb**, nie tímov

## #6 — Sú v appke reálne dáta?

**Odpoveď: nie, len seed / testovacie.**

**Dôsledky:**
- **Čistý štart.** Žiadny D1 → MariaDB migračný skript, žiadny export, nulové riziko straty dát.
- Otázka 92 (migrácia) — **zaniká**.
- Otázka 93 (seed) potvrdená: fiktívne demo portfólio, žiadne reálne osobné údaje.
- Otázka 98 potvrdená: pôvodný `C:\Users\Ucet\Desktop\IT roadmap planner` zostáva
  **nedotknutý ako archív**. Nič sa nemaže.
- Odpadá celá kategória rizika „strata dát pri migrácii" z akceptačných kritérií.

---

## Automaticky vyriešené otázky touto dávkou

| # | Otázka | Vyriešené ako |
|---|---|---|
| 4 | Port vs skin | Plný port 🔴 |
| 6 | Reálne dáta | Nie, čistý štart |
| 7 | Používatelia | Ja + 2–3 ľudia |
| 8 | Use case | Všetky 3 piliere |
| 11 | Databáza | MariaDB 11.4 🔴 |
| 16 | Prílohy | Len URL odkazy (R2 zaniká) |
| 32 | Timesheety | Zmazať |
| 40 | Tímy | Zmazať |
| 44 | Režimy Timeline | 3 (Roadmap / Sprinty / Rozhodnutia) — potvrdené |
| 53 | KPI pohľad | Zmazať, Prehľad slúži reportingu |
| 75 | Roly | 3 roly, SK názvy |
| 79 | Per-projektové práva | Zmazať |
| 92 | Migrácia dát | Zaniká |
| 93 | Seed | Fiktívne demo |
| 98 | Archív pôvodnej appky | Zachovať nedotknutý |

## Zostávajúce blokujúce otázky

| # | Otázka | Stav |
|---|---|---|
| 12 | Framework: Next.js vs Express+vanilla SPA | Čaká na recon report (2 agenti) |
| 24 | Sleduješ v appke peniaze (`budget` / `spent`)? | Čaká na používateľa |
| 52 | Používaš obe úrovne `portfolio` + `program`? | Čaká na používateľa |
| 83 | Má appka čítať dáta z iných aura apiek? | Čaká na používateľa |

## Aktualizovaný počet tabuliek

- Dnes: **30**
- Po dávke 1 (7 ďalších padá nad pôvodný návrh 16): **~11**

**Padá 19 tabuliek:** `tasks`, `workflows`, `workflow_statuses`, `workflow_transitions`,
`custom_fields`, `work_item_custom_values`, `dashboard_layouts`, `dashboard_widgets`,
`dashboard_layout_versions`, `team_view_presets`, `attachments`, `email_outbox`,
`checkpoint_templates`, `checkpoint_sprints`, `sprint_allocations`, `work_item_watchers`,
`teams`, `user_team_memberships`, `timesheets`, `timesheet_entries`

**Zostáva ~11:** `projects`, `checkpoints`, `checkpoint_requirements`, `checkpoint_decisions`,
`sprints`, `work_items`, `work_item_comments`, `work_item_dependencies`, `worklogs`,
`plan_versions`, `notifications`, `audit_log`, `users`, `sessions`, `user_preferences`,
`user_view_preferences` — presný finálny zoznam ide do kontraktu.
