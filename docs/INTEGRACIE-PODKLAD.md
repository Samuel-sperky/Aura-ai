# Integrácia Roadmap → aura-kpi — pripravený podklad

**Dátum:** 2026-07-30
**Stav:** **pripravené, NEZAPOJENÉ.** Toto je „pripraviť" polovica rozhodnutia #83
(„nie v prvej verzii — pripraviť read-only usera, nezapájať").
**Zdroj:** `Workflow({ name: 'aura-roadmap-integrations', args: { reconOnly: true } })`

Zapojenie sa spustí tým istým workflow **bez** `reconOnly` — až tá vlna mení migráciu
v Roadmape, compose siete a adaptér vnútri **bežiacej** `aura-kpi`. Zostáva za tvojím
pokynom.

---

## Navrhnutý kontrakt: SQL views, nie surové tabuľky

Existujúca integrácia má pascu, ktorú tento návrh vedome obchádza: `aura-kpi` si
**hardcoduje názvy stĺpcov** susedných DB (`shipments.sent`, `claims.opened_on`), a
`aura-logistika` nemá git repo vôbec — takže rename tam rozbije KPI bez histórie na diff.

Roadmap preto exponuje **views** s verzovaným kontraktom. Migrácia
`db/migrations/0003_kpi_contract.sql`, idempotentné `CREATE OR REPLACE VIEW`, bez
`DEFINER` klauzuly a bez stored routines:

| View | Čo vracia |
|---|---|
| `kpi_v_contract` | `contract_version`, `source_app` — verzia kontraktu, aby sused vedel, s čím hovorí |
| `kpi_v_delivery_month` | per rok/mesiac: `sprints_closed`, `points_committed`, `points_completed`, `projects_with_closed_sprint` (z `sprints` so `status='completed'`, grupované podľa `end_date`) |
| `kpi_v_checkpoint_month` | per rok/mesiac: `checkpoints_due`, `checkpoints_decided`, `checkpoints_decided_on_time` (rozhodnuté do termínu) |
| `kpi_v_portfolio_now` | aktuálny snapshot: `projects_total`, `_running`, `_on_track`, `_at_risk`, `_blocked`, `progress_avg_pct` |

Granty idú **len na views**, nikdy na tabuľky, a spúšťa ich admin **raz ručne** — nie
migrácia:

```sql
CREATE USER IF NOT EXISTS 'kpi_ro'@'%' IDENTIFIED BY '<zvol-silne-heslo>';
GRANT SELECT ON aura_roadmap.kpi_v_contract         TO 'kpi_ro'@'%';
GRANT SELECT ON aura_roadmap.kpi_v_delivery_month   TO 'kpi_ro'@'%';
GRANT SELECT ON aura_roadmap.kpi_v_checkpoint_month TO 'kpi_ro'@'%';
GRANT SELECT ON aura_roadmap.kpi_v_portfolio_now    TO 'kpi_ro'@'%';
```

## Prepojenie sietí

Mení sa **len** `C:\Aura\aura-kpi\docker-compose.yml`. Roadmap compose sa nemení — jeho
zakomentovaný `sperky-ai_aura_net` blok je pre opačný smer.

| | |
|---|---|
| External sieť | `aura-roadmap_aura-roadmap` |
| DB host | `aura-roadmap-db`, port 3306, **bez** host port mappingu |
| Env prefix | `ROADMAP` → `ROADMAP_DB_{HOST,PORT,USER,PASSWORD,NAME}` |

`pool.js` netreba meniť — je generický, nový zdroj je len nový prefix.
`isConfigured("ROADMAP")` je true len ak HOST + USER + NAME sú neprázdne, takže
nenakonfigurovaný zdroj sa ticho preskočí.

## Registrácia nového source v aura-kpi má 12 dotykových bodov

Toto je najdôležitejšie zistenie prieskumu: adaptér sám **nestačí**. Tri z týchto miest
sú hardcoded zoznamy, ktoré pri vynechaní spôsobia, že sa auto hodnoty **ticho
neuplatnia**:

- `compute.js:279-281` — `departments.filter(d => d.source === "seo" || d.source === "logistika")`. Bez pridania `"roadmap"` set `integDepts` neriadi `useAuto` a hodnoty sa nepoužijú.
- `routes/_kpi.js:153` — `useAuto` podľa source. Bez toho „Na doplnenie" hlási auto-vyplnené polia ako chýbajúce.
- `routes/department.js:35` — `isInteg` podľa source.

Zvyšok: nový `integrations/roadmap.js` (vzor `logistika.js`, 93 LOC), `integrations/index.js`
(`ALL` zoznam), `routes/integrations.js` (`configured` + whitelist), `kpi-config.js`
(dept blok + metrika), frontend badge na 3 miestach, `docker-compose.yml`, `.env.example`.

## Dve pasce, ktoré musí zapojenie rešpektovať

**1. `integration_values` nemá `department_key`.** Kľúč je len `metric_key|input_key`, a
`metric_key='plnenie'` **nie je** globálne unikátny — používajú ho expedicia, reklamacie,
fotografka, nahravanie aj newsletter. Presne preto existuje ten `integDepts` guard. Nové
`input_key` nesmú kolidovať s obsadenými (`prijate`, `spracovane`, `otvorene`, `zavrete`,
`in_top3`, `kw_1_3`, `kw_4_10`, `ctr`, `uverejnene`, …), inak si dva zdroje prepíšu hodnoty.
Voľné a navrhnuté: `commitnute`, `dokoncene`.

**2. KPI nemá migračný ledger.** `db.js:runSchema()` spúšťa `schema.sql` pri každom boote,
ale sú to len `CREATE TABLE IF NOT EXISTS` — na existujúcej DB sa zmena ENUM
**neaplikuje**. Treba idempotentné `ALTER TABLE ... MODIFY COLUMN`:

```sql
ALTER TABLE departments MODIFY COLUMN source
  ENUM('manual','seo','logistika','roadmap') NOT NULL DEFAULT 'manual';
ALTER TABLE integration_values MODIFY COLUMN source
  ENUM('seo','logistika','roadmap') NOT NULL;
```

Sú to zmeny schémy v **bežiacej** appke → pred spustením `mysqldump` záloha do `backups/`
a tvoje explicitné potvrdenie.

## Priorita hodnôt v KPI (aby bolo jasné, čo integrácia prepíše)

Ručné (`period_values`) **>** `override_value` **>** `auto_value`. Integrácia zapisuje
`auto_value`, takže **nikdy neprepíše** ručne zadanú ani manuálne prepísanú hodnotu.
Navyše `if (r.value === null) continue` — null nikdy neprepíše predošlú auto hodnotu.

Automatický pull sa spúšťa v `routes/months.js:87` pri `POST /months/:y/:m/open`; nový
source sa tam napojí sám cez `ALL`. `compute.recomputePeriod(year, month)` sa volá len ak
`written > 0`, obalené v try/catch — pri chybe prepočtu auto hodnoty zostanú zapísané.

## Prečo sa druhá vlna nespustila

Safety klasifikátor ju zablokoval, a mal pravdu: modifikuje bežiacu `aura-kpi`, čo je
presne tá integrácia, ktorú si odpoveďou na #83 odložil, a žiadna neskoršia správa ten
mandát nezmenila — generické „pokračuj" na to nestačí. Tretia a štvrtá vlna potom padli
na session limit.
