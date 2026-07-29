# Obnova databázy Aura Roadmap zo zálohy

Postup na obnovu **produkčnej** databázy `aura_roadmap` z dumpu v `backups/`.
Čítaj celé pred prvým použitím — krok 3 dáta prepisuje.

## Čo je záloha

`scripts/backup/backup.ps1` vytvorí `backups/aura-roadmap-YYYY-MM-DD_HHmmss.sql`
— plain-text `mariadb-dump --single-transaction` celej DB (schéma + dáta +
routines + events, s `DROP TABLE IF EXISTS` pred každou tabuľkou).
Uchovávajú sa **posledné 3** dumpy; staršie skript maže. Stav posledného behu je
v `backups/backup-status.json`, log v `backups/backup.log`.

Zálohy **nie sú šifrované** a **nekopírujú sa nikam mimo tohto PC** — je to
vedomé zúženie rozsahu (kontrakt §5). Ak sa v appke raz objavia dáta, ktoré by
strata bolela, doplň off-site kópiu ako samostatnú úlohu.

## 1. Over, že záloha je obnoviteľná (nedeštruktívne)

Toto nič neprepisuje — obnoví najnovší dump do zahoditeľnej DB
`aura_roadmap_restoretest`, spočíta tabuľky a DB zmaže:

```powershell
powershell -ExecutionPolicy Bypass -File C:\Aura\aura-roadmap\scripts\backup\restore-test.ps1
```

Konkrétny dump: `-DumpFile C:\Aura\aura-roadmap\backups\aura-roadmap-...sql`.

Rob to po každej zmene schémy. Záloha, ktorú si nikdy neobnovil, nie je záloha.

## 2. Priprav sa na obnovu

```powershell
cd C:\Aura\aura-roadmap
# 2a. Vypni appku, aby do DB nikto nezapisoval počas obnovy.
docker compose --env-file .env stop app
# 2b. Urob zálohu SÚČASNÉHO stavu (aj keď je pokazený — chceš mať cestu späť).
powershell -ExecutionPolicy Bypass -File .\scripts\backup\backup.ps1
# 2c. Vyber dump, z ktorého obnovuješ.
Get-ChildItem .\backups\aura-roadmap-*.sql | Sort-Object LastWriteTime -Descending
```

## 3. Obnov (DEŠTRUKTÍVNE — prepíše dáta)

```powershell
$dump = 'C:\Aura\aura-roadmap\backups\aura-roadmap-2026-07-28_120000.sql'
# Heslo prečítaj z .env (DB_ROOT_PASSWORD) — do konzoly ho nevypisuj.
docker cp $dump aura-roadmap-db:/tmp/restore.sql
docker exec -it aura-roadmap-db sh -c 'mariadb -uroot -p --default-character-set=utf8mb4 aura_roadmap < /tmp/restore.sql'
docker exec aura-roadmap-db sh -c 'rm -f /tmp/restore.sql'
```

`-p` bez hodnoty si heslo vyžiada interaktívne, takže sa neuloží do histórie
shellu.

Ak DB neexistuje (napr. po zmazaní volume `db_data`), najprv ju vytvor:

```powershell
docker exec -it aura-roadmap-db sh -c 'mariadb -uroot -p -e "CREATE DATABASE IF NOT EXISTS aura_roadmap CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"'
```

## 4. Zapni a over

```powershell
docker compose --env-file .env start app
# /api/health musí vrátiť 200 s db: true
Invoke-RestMethod http://localhost:3040/api/health
# Migračný ledger: dump obsahuje aj _migrations, takže migrate je no-op.
docker compose --env-file .env --profile tools run --rm migrator npm run db:migrate
```

Potom sa prihlás a preklikaj Prehľad / Projekty / Rozhodnutia.

## Poznámky a pasce

- **`--env-file .env` je povinný** pri každom `docker compose` príkaze. Bez neho
  sa `${...}` v `docker-compose.yml` vyhodnotia na prázdno a MariaDB nabootuje s
  prázdnou DB bez app usera.
- DB kontajner **nemá mapovaný host port** (zámerne). Všetko ide cez
  `docker exec`; lokálny `mariadb` klient na DB nedosiahne.
- Dump obsahuje aj tabuľku `_migrations`, takže po obnove je stav migrácií
  konzistentný s dátami. Nikdy `_migrations` z dumpu nevynechávaj.
- Obnova **neresetuje heslá**. Ak obnovuješ starý dump, platia heslá z času
  dumpu. Nový admin sa dá vytvoriť cez `npm run db:seed` s `ADMIN_EMAIL` /
  `ADMIN_PASSWORD` v `.env`.
