# Akcent v rodine Aura — rozhodovací podklad

Stav zistenia: 2026-07-30. Podklad pre vlastníka. **Nič nebolo zmenené**, žiadny
git príkaz meniaci stav nebol spustený. Aplikačná fáza sa spustí len na pokyn.

---

## 1. Čo je skutočnosť

**Redizajn (zlatý akcent) JE nasadený v produkcii — ale nie je zmergovaný do `main`.**
To sú dve nezávislé veci a práve ich rozpor je jadro celého problému.

### Nasadené = zlatá (dokázané)

Živý kontajner `sperky-ai-app-1` servuje zlatý akcent. Overené dvoma nezávislými
cestami — z filesystemu bežiaceho kontajnera aj po HTTP z bežiacej appky:

```
docker exec sperky-ai-app-1 sh -c "grep -o -- '--accent:[^;]*' /app/.next/static/chunks/*.css"
--accent:#b88a3a      (light)
--accent:#d8b878      (dark)

Invoke-WebRequest http://127.0.0.1:3000/_next/static/chunks/1hn_pwrz5cwh_.css  → 200, LEN=34151
--accent:#b88a3a
--accent:#d8b878
```

Že build pochádza z branche `redesign` a nie z `main`, dokazuje fingerprint 5 z 5
charakteristických tokenov. Všetkých päť je v `aura-redesign\src\app\globals.css`
a v `main` ani jeden:

| token | deployed CSS | aura-redesign | sperky-ai (main) |
|---|---|---|---|
| `--accent-soft` | `#f2e6cb` | `#f2e6cb` | `#d6f5f6` |
| `--accent-tint` | `#faf4e8` | `#faf4e8` | `#eef9f9` |
| `--chart-1` | `#bf8f34` | `#bf8f34` | `#d8b878` |
| `--accent-text` | `#8a6417` | `#8a6417` | *neexistuje* |
| `--gold-soft` | `#ead7b0` | `#ead7b0` | `#ead7b0` (spoločný) |

### `main` = stále teal (dokázané)

```
git show main:src/app/globals.css | Select-String "--accent"
  --accent: #03797e;   --accent2: #05bcc4;   --accent-soft: #d6f5f6;
git merge-base --is-ancestor redesign main   → EXITCODE=1   (NIE je zmergovaný)
git merge-base --is-ancestor main redesign   → EXITCODE=0   (redesign je 12 commitov PRED main)
git merge-base main redesign                 → 858549c = main HEAD (žiadna divergencia)
git log main --oneline | Select-String redesign  → 0 zhôd
```

V historii `main` nie je ani jeden commit, ktorý by RD3 zlatý redizajn nasadzoval.
Reťaz `vlna0`–`vlna6` (12 commitov) existuje **výhradne** na branchi `redesign`.

### Ako sa teda zlatá dostala na produkciu

Časová os hovorí jasne — a nie v prospech „schváleného nasadenia":

```
18:07:53  5eb029f  feat(vlna1): dizajn tokeny/témy       ← posledná zmena globals.css
18:11:57  c6f4061  docs(redizajn): follow-up register     ← HEAD branche redesign
18:12     CSS chunky v kontajneri (mtime)
18:13:09  aura-web:latest  Created
18:13:37  sperky-ai-app-1  created  → Up 8 days (healthy), bez rebuildu
```

Image vznikol **72 sekúnd po poslednom commite na `redesign`**, z worktree
`C:\Aura\aura-redesign`. Compose reťaz bežiaceho kontajnera navyše obsahuje
override súbor zo **scratchpadu inej session**:

```
com.docker.compose.project.config_files =
  C:\Aura\sperky-ai\docker-compose.prod.yml,
  C:\Aura\sperky-ai\docker-compose.ngrok.yml,
  ...\Temp\claude\...\scratchpad\compose.redesign-context.yml   ← už NEEXISTUJE (Test-Path: MISSING)
```

To je odtlačok **overovacieho behu redizajnu, ktorý tam ostal bežať 8 dní**, nie
odtlačok deployu. Ak by šlo o schválené nasadenie, `redesign` by bol zmergovaný do
`main`, image by bol postavený z `main` a compose by neodkazoval na zmiznutý
dočasný súbor.

### Otázka, ktorú viem položiť len vlastníkovi

**Bolo nasadenie zlatej zámerné, alebo tam ten kontajner ostal po overovaní?**
Z technických dôkazov to je overovací kontajner. Ale kontajner beží 8 dní a tunel
`https://karma-crucial-shorty.ngrok-free.dev` má na ňom **9459 spojení** — takže
buď vlastník zlatú verziu reálne používa a je s ňou v pohode, alebo si nevšimol,
že produkcia nesedí s `main`. Túto jednu vec dôkazy nerozhodnú. Zvyšok podkladu
pokrýva obe odpovede.

### Vedľajšie nálezy, ktoré patria k rozhodnutiu

- Lokálny `main` (858549c) je **1 commit PRED `origin/main`** (c2ac428) — nepushnuté.
  `redesign` je plne pushnutý (local == origin == c6f4061).
- Produkcia sa **neservuje cez Caddy**. `.env.production` má `DOMAIN=localhost`,
  `sperky-ai-caddy-1` drží len self-signed cert od interného „local" issuera.
  Verejný vstup je **hostový ngrok agent** (PID 27112) → `http://localhost:3000`,
  ktorý ide priamo na app a Caddy (aj jeho HSTS / X-Frame-Options) obchádza.
- Repo `aura-web` (= `sperky-ai`) má **7 worktree, nie 4**: navyše `aura-backup`
  (`feature/onedrive-backup`) a `aura-hardening` (`feat/proxy-fail-closed`).

---

## 2. Tabuľka stavu

| appka | akcent light / dark | vetva | nasadené? |
|---|---|---|---|
| **sperky-ai `@main`** | `#03797e` / `#05bcc4` teal | B (Next.js) | **NIE** — image beží z `redesign` |
| **sperky-ai `@redesign`** | `#b88a3a` / `#d8b878` **ZLATÁ** | B, worktree, nezmergovaný | **ÁNO** — `sperky-ai-app-1`, :3000 + ngrok |
| ads-hierarchy | `#03797e` / `#05bcc4` teal | B, worktree | nie (len 8 riadkov KPI density vs main) |
| mindmap-orient | `#03797e` / `#05bcc4` teal | B, worktree | nie (globals.css **byte-identický** s main) |
| aura-prototype | `#087f83` / `#05bcc4` teal (iný odtieň) | B, worktree | nie (zlatá z produktu zmazaná) |
| aura-roadmap | `#03797e` / `#05bcc4` teal | B, vlastné repo + remote | ÁNO — `aura-roadmap-app`, :3040 |
| aura-kpi | `#03797e` / `#05bcc4` teal | A (vanilla) | ÁNO — `aura-kpi-app`, :3030 |
| aura-logistika | `#03797e` / `#05bcc4` teal | A (vanilla) | ÁNO — `aura-logistika-app`, :3020 |
| aura-banner-studio | `#03797e` / `#05bcc4` teal | A (vanilla) | ÁNO — `bannery-app`, :8091 |
| aura-hr-mapa | `#03797e` / `#05bcc4` teal | A (vanilla) | ÁNO — `aura-hr-app`, :8090 |

**Live stav rodiny je rozdvojený: 5 appiek teal, produkčná `sperky-ai` zlatá.**

Efektívna plocha na zjednotenie je **7 súborov, nie 9**: `mindmap-orient` je
byte-identický s `main` (md5 `c02b0c33ee8065f9448432cd24e4d738`), `ads-hierarchy`
sa líši len v KPI density tokenoch (nulový farebný rozdiel).

Ako sa CSS dostane na live (rozhoduje o cene overenia):

| appka | mount | zmena CSS znamená |
|---|---|---|
| sperky-ai, aura-kpi, aura-logistika, aura-hr-mapa, aura-roadmap | žiadny | **rebuild image + restart** |
| aura-banner-studio | bind `C:\Aura\aura-banner-studio\server` → `/app` (rw) | len reload, bez rebuildu |

---

## 3. Dve možnosti a ich reálna cena

### Možnosť A — Teal všade

Zladí sa **6 zo 7 dotknutých súborov**: 4 vanilla appky, `sperky-ai@main`
(+ automaticky `ads-hierarchy` a `mindmap-orient`) a `aura-roadmap`. Meniť treba
prakticky len branch `redesign`, plus dorovnať odtieň v `aura-prototype`.

Cena práce:
- `aura-redesign\src\app\globals.css` — prepísať blok akcentu (5 tokenov light +
  2 dark + `--accent-rgb`) a **8 call-site miest**, kde `var(--accent-text)`
  nahradil teal akcent: riadky 447, 645, 691, 739, 761, 764, 816, 838.
- `aura-prototype\src\app\globals.css` — odaliasovať 6 zlatých tokenov
  (riadky 33–34, 39–40, 47), `--accent` `#087f83` → `#03797e`, `.btn-gold`
  (riadok 669) vrátiť na `--brand-gold`.
- Vanilla appky, `main`, `roadmap`: **0 farebných zmien**.
- Rebuild `aura-web` z `main` + restart `sperky-ai-app-1`.

Riziko:
- **Ak je zlatá na live schválená, ide o vizuálny regres na produkcii.** Vlastník
  otvorí ngrok URL a UI zmení farbu. Toto je jediné vážne riziko možnosti A.
- Rollback je triviálny: `redesign` je plne pushnutý na `origin/redesign`, image sa
  dá znovu postaviť z c6f4061.
- Pozor: pred rebuildom z `main` treba vyriešiť, že lokálny `main` je 1 commit
  pred `origin/main`.

### Možnosť B — Zlatá všade

Zladí sa s tým, čo reálne beží na produkcii. Ale treba prepísať **6 appiek** vrátane
`main` a plne overenej `aura-roadmap`.

Cena práce:
- 8 súborov mení farby: `main` (→ propaguje do `ads-hierarchy`, `mindmap-orient`),
  `aura-prototype`, `aura-roadmap`, 4× vanilla `styles.css`.
- **Každé call-site `--gold-text` / `--brand-gold` treba pre-auditovať**, pretože
  akcent a brand mark splynú na jeden odtieň — a rozdiel koruna vs nav-rail stojí
  presne na tom, že sa líšia.
- Do vanilla appiek treba doniesť aj `--accent-text` (`#8a6417`), inak zlatý text
  a 1px linky spadnú pod AA. To je nový token v 4 súboroch, nie prepis hodnoty.
- 5 rebuildov image + restartov (banner-studio stačí reload).

Riziko:
- **4 vanilla appky nemajú žiadne testy ani git remote.** Overené:
  `aura-logistika` a `aura-hr-mapa` nemajú `.git` **vôbec**; `aura-kpi` a
  `aura-banner-studio` majú `.git`, ale `git remote -v` je **prázdny**; ani jedna
  nemá `package.json` s `test` skriptom. Regres v nich teda **nie je detekovateľný
  automaticky ani vrátiteľný z remote** — jediná záchrana je manuálny preklik a
  lokálna kópia súboru pred zmenou.
- `aura-roadmap` je jediný súbor v rodine s nulovým porušením raw-hex pravidla a
  správnym dark `--on-accent`. Prepisovať ju znamená rozbíjať referenciu.
- Mení sa 5 živých appiek namiesto 1 → 5× väčšia plocha na regres.

---

## 4. Odporúčanie

**Odporúčam možnosť A (teal všade) — ale až po jednej odpovedi vlastníka.**

Najprv sa spýtaj sám seba na tú jednu vec, ktorú dôkazy nerozhodli: *chcel som mať
zlatú na produkcii?*

- **Ak nie** (a technické dôkazy hovoria, že to je 8 dní starý overovací kontajner):
  možnosť A bez výhrad. Nie je to regres, je to náprava neúmyselného stavu.
- **Ak áno, vedome a zlatú chcem:** tvoja preferencia váži viac než dokument, ale
  potom to nerob ako „zlatá všade" naslepo. Prečítaj si najprv poslednú podsekciu.

Prečo A:

1. **7 z 10 appiek už na teal sedí** a všetky sú na `#03797e` / `#05bcc4`. Nesúhlasia
   len 2 worktree — a **oba sú nezmergované feature branche**. Meniť dva nezmergované
   branche je nesúmerne lacnejšie a bezpečnejšie než meniť 5 živých appiek.
2. **Informačná hodnota.** `AURA-DESIGN-HANDOFF.md` (riadok 301) predpisuje:
   *teal = dá sa s tým interagovať, zlatá = toto je brand alebo si práve tu.*
   Ak je akcent zlatý, brand a interaktivita majú tú istú farbu a UI stráca jeden
   celý rozmer informácie. Aktívna navigácia je toho presný symptóm: zlatý rail
   (vanilla + roadmap) vs čierny ink pill (všetkých 5 worktree) — worktree ten
   rail museli zrušiť, lebo by splynul s akcentom.
3. **Nedetekovateľnosť regresu vo vanilla appkách.** Toto je najsilnejší argument.
   V možnosti B sú 4 z 5 menených živých appiek bez testov, bez remote, dve úplne
   bez gitu. Nesprávnu zmenu tam nikto nezistí a nikto ju nevráti.
4. **Reverzibilnosť.** V A meníš `redesign` (pushnutý, obnoviteľný) a rebuilduješ z
   `main` (pushnutý až na 1 commit). V B meníš súbory, ktoré neexistujú nikde inde
   než na disku.

### Dôležité: možnosť A nezahadzuje redizajn

Zlatý flip je **~8 riadkov z 211 vložených** v `globals.css`. Zvyšok tej práce je
dobrý, ortogonálny k odtieňu a chceš ho aj pri teal:

- **a11y text varianty** `--success-text` `#087348`, `--danger-text` `#b02e2e`,
  `--warn-text` `#974900` — fill hodnoty majú na vlastnom tinte 3,6–4,4:1, čo je pod AA.
- **`--accent-text`** ako samostatný token pre text/link/focus/1px linku (pri teal
  ostáva teal, ale split fill-vs-text je správny vzor).
- **stmavené grafové série** `--chart-1` `#bf8f34`, `--chart-2` `#0b969a` pre ≥3:1
  graphics contrast na bielej.
- **8-point spacing scale** `--space-1..4` + sidebar/content/page-pad tokeny (aditívne).
- **Dátový kánon**: MY = `--chart-gold`, KONKURENT = `--chart-accent`, a tie dva sa
  nikdy nesmú rovnať.

Takže rozumný cieľ nie je „zahoď `redesign`", ale **„zmerguj `redesign` bez zlatého
flipu"**. Tým dostaneš 12 commitov práce aj kánon zároveň.

### Ak vlastník trvá na zlatej

Nerob „zlatá všade" ako prepis 6 appiek. Urob to takto:
1. Zmerguj `redesign` do `main` normálne (je to clean fast-forward) a nasaď z `main`
   — tým sa produkcia zlegalizuje bez jedinej vizuálnej zmeny.
2. Ostatné appky **nechaj teal**, kým sa neaktualizuje `AURA-DESIGN-HANDOFF.md`
   a nerozhodne sa, čím sa nahradí signál „si tu" (dnes zlatý rail).
3. Až potom, ako samostatná úloha, migruj vanilla appky — s lokálnou zálohou
   `styles.css` pred každou zmenou.

To je jediná verzia „zlatej", ktorá nerozbije informačnú štruktúru naslepo.

---

## 5. Presný plán aplikácie (možnosť A)

Predpoklad: vlastník odklikol A. Vykonáva sa v tomto poradí, po každom kroku sa overuje.

### Krok 0 — poistky, pred akoukoľvek zmenou

1. Skopírovať mimo repo (do `backups/`) aktuálne `styles.css` všetkých 4 vanilla appiek
   — sú to jediné existujúce kópie, nie sú nikde v remote.
2. Zapísať si `aura-web:latest` digest (`sha256:f314fe0bfae6…`, Created
   2026-07-21T16:13:09Z) a `BUILD_ID=yHkmEtAzrf6t6DhnvsS0n`, aby sa dal zlatý build
   identifikovať a v núdzi obnoviť z c6f4061.
3. Rozhodnúť, čo s nepushnutým `main` commitom 858549c (`fix(import)`) — rebuild sa
   robí z neho.

### Krok 1 — `aura-redesign` na teal (jediný súbor s farebnou zmenou)

`C:\Aura\aura-redesign\src\app\globals.css`, `:root`:

| token | z (zlatá) | na (teal) |
|---|---|---|
| `--accent` | `#b88a3a` | `#03797e` |
| `--accent2` | `#d8b878` | `#05bcc4` |
| `--accent-text` | `#8a6417` | `#03797e` (teal už AA na `--bg` — netreba tmavší variant) |
| `--accent-soft` | `#f2e6cb` | `#d6f5f6` |
| `--accent-tint` | `#faf4e8` | `#eef9f9` |
| `--accent-rgb` | `184, 138, 58` | `3, 121, 126` |

`[data-theme=dark]`: `--accent` `#d8b878` → `#05bcc4`, `--accent2` `#e6cd9a` → `#4dd9df`,
`--accent-text` `#e0c48a` → `#4dd9df`, `--accent-soft` `#3a2e18` → tmavý teal wash,
`--accent-tint` `#241d10` → tmavší teal wash.

Ponechať bez zmeny (to je hodnota redizajnu): `--success-text`, `--danger-text`,
`--warn-text`, `--chart-1` `#bf8f34`, `--chart-2` `#0b969a`, `--space-1..4`,
sidebar/content/page-pad tokeny, `--gold` `#b88a3a`, `--brand-gold` `#d8b878`,
`--gold-text` `#8a6417`.

Call-sites, kde `var(--accent-text)` prevzal úlohu teal akcentu — prejsť jeden po
druhom (riadky 447, 645, 691, 739, 761, 764, 816, 838). Kde ide o **text / link /
focus-ring / 1px linku**, `--accent-text` môže ostať (teraz je teal). Kde ide o
**fill**, musí to byť `--accent`.

Rozhodnutie, ktoré tu treba spraviť explicitne: **aktívna navigácia** (riadok 839) —
vrátiť zlatý rail podľa handoffu (riadky 281–287), alebo nechať ink pill? Handoff
predpisuje rail. Odporúčam rail, ale je to samostatné vizuálne rozhodnutie.

### Krok 2 — `aura-prototype` dorovnať odtieň

`C:\Aura\aura-prototype\src\app\globals.css`:
- `--accent` `#087f83` → `#03797e` (prototype má štvrtý, cudzí teal).
- Odaliasovať `--gold`, `--brand-gold`, `--gold-rgb`, `--gold-text` (riadky 33–34,
  39–40, 47) — dnes všetky ukazujú na akcent, čím je zlatá z produktu zmazaná.
- `.btn-gold` (riadok 669) vrátiť na `var(--brand-gold)`.
- **Ponechať** `--on-accent` `#102321` — prototype ho má správne.

### Krok 3 — oprava a11y, ktorá platí pri oboch možnostiach

Toto je **skutočná AA chyba v dark mode na primárnych CTA v 7 z 10 appiek** a je
nezávislá od výberu akcentu:

- `C:\Aura\sperky-ai\src\app\globals.css` riadok 179: pridať dark override
  `--on-accent: #0e1413` (dnes ostáva `#ffffff` → biela na `#05bcc4` ≈ 2,2:1).
  Propaguje sa do `ads-hierarchy` aj `mindmap-orient`.
- 4× vanilla `styles.css`: token `--on-accent` **vôbec neexistuje**, appky majú
  hardcoded `color: #fff` na `.btn-accent` / `.btn-primary`. Pridať `--on-accent`
  do token bloku, dark override `#0e1413`, a hardcode nahradiť tokenom.
  Cesty: `C:\Aura\aura-kpi\server\public\styles.css`,
  `C:\Aura\aura-logistika\server\public\styles.css`,
  `C:\Aura\aura-banner-studio\server\public\styles.css`,
  `C:\Users\Ucet\Desktop\Šperky Aura app\aura-hr-mapa\server\public\styles.css`.

### Krok 4 — bez zmeny

`aura-roadmap`, `sperky-ai@main`, `ads-hierarchy`, `mindmap-orient` — žiadna farebná
zmena. `aura-roadmap` slúži ako referencia: nula raw-hex porušení, správny dark
`--on-accent` `#0e1413`, explicitné komentáre zámeru.

### Krok 5 — nasadenie a overenie

| appka | ako nasadiť | ako overiť |
|---|---|---|
| sperky-ai | rebuild `aura-web` z `main` (po rozhodnutí o merge `redesign`), restart `sperky-ai-app-1` | `docker exec … grep -o -- '--accent:[^;]*' /app/.next/static/chunks/*.css` musí vrátiť `#03797e` + `#05bcc4`; potom `http://127.0.0.1:3000` preklik login → dashboard → ads → SEO, light + dark, **screenshot**; testy repa zelené pred commitom |
| aura-redesign | bez nasadenia (branch) | `npm run build` + lint; vizuálny preklik dev serveru |
| aura-banner-studio | bind mount → len reload | `http://localhost:8091`, preklik + **screenshot** light/dark |
| aura-kpi | rebuild image + restart | `http://localhost:3030`, preklik + **screenshot** |
| aura-logistika | rebuild image + restart | `http://localhost:3020`, preklik + **screenshot** |
| aura-hr-mapa | rebuild image + restart | `http://localhost:8090`, preklik + **screenshot** |
| aura-roadmap | bez zmeny | `http://localhost:3040` kontrolný screenshot ako referencia |

**Vanilla appky nemajú testy — jediné overenie je manuálny preklik + screenshot.**
Overiť treba minimálne: primárne CTA (`.btn-accent`), aktívna navigácia, link v
texte, jeden graf so sériami MY/KONKURENT, jeden success/danger pill — a to
**v light aj dark**. Bez screenshotu sa krok nepočíta za overený.

Overovať appku po appke, nie všetky naraz. Pri akomkoľvek vizuálnom prekvapení
zastaviť a nahlásiť, nie „doladiť".

### Mimo rozsahu tejto úlohy (nerobiť teraz, flagnuť samostatne)

- Konsolidácia 4 vanilla `styles.css` do jedného zdroja. Je to reálne možné pre 3 zo 4
  (`hr-mapa` riadky 1–520 sú byte-identický prefix `logistika`; `hr-mapa`/`logistika`/`kpi`
  majú identickú 60-riadkovú token hlavičku, md5 `7c9f63b6`), ale `banner-studio` má
  navyše `--surface-3`, `--r-xl`, `--shadow-gold`, `--ok-soft`, reálny mono stack — musí
  sa zlievať prvý. `kpi` má zámernú behaviorálnu odlišnosť (tabuľky nie sú klikateľné
  by default, `.lc-svg` premenovaný selektor), ktorú naivný prepis zničí.
- Farba linkov: teal `a` (vanilla + roadmap) vs `color: inherit` (všetkých 5 worktree).
  Samostatné rozhodnutie, nezávislé od odtieňa akcentu.
- Produkcia obchádza Caddy (ngrok priamo na `:3000`), takže HSTS a `X-Frame-Options:
  DENY` z Caddyfile sa na verejný traffic **neaplikujú**. Bezpečnostná vec, nie dizajnová.

---

## 6. Čo NEMENIŤ za žiadnych okolností

Platí pri oboch možnostiach, nech vyhrá ktorýkoľvek akcent:

1. **`--gold-text` `#8a6417` (light) / `#d8b878` (dark) je jediná zlatá na TEXT.**
   `--brand-gold` `#d8b878` má na svetlom podklade kontrast **1,9:1** a je
   nečitateľná. Nikdy `--brand-gold` ako farba textu na svetlom.
2. **`--muted` `#566964` nezosvetľovať.** Je to najsvetlejší povolený text, ≈5,8:1
   na `--bg` / `--panel`, a bol **zámerne** stmavený z `#5e7270` v a11y sweepe.
3. **`--brand-gold` `#d8b878` ostáva len na fill** — koruna, logo, brand mark.
   Nie text, nie 1px linka, nie focus ring.
4. **Semantické `*-text` varianty ostávajú:** `--success-text` `#087348`,
   `--danger-text` `#b02e2e`, `--warn-text` `#974900`. Pills a inline hodnoty čítajú
   tieto; surové `--success` / `--error` / `--warn` sú fill/graf a na vlastnom tinte
   majú 3,6–4,4:1, teda **pod AA**.
5. **Mimo `:root` a `[data-theme]` blokov žiadny raw hex ani rgba** — len
   `color-mix(in srgb, var(--token) N%, transparent)`.
6. **`--chart-gold` a `--chart-accent` sa nikdy nesmú rovnať.** MY = `--chart-gold`,
   KONKURENT = `--chart-accent`. Porovnania MY vs KONKURENT musia čítať
   `--chart-accent`, nikdy surové `--accent`.

---

## Stop — odovzdanie

Podklad je hotový. **Aplikačná fáza sa nespustí bez pokynu vlastníka.**

Čo potrebujem od vlastníka, aby sa dalo pokračovať:

1. **A alebo B?** (odporúčam A — teal, s merge redizajnu bez zlatého flipu)
2. **Bolo nasadenie zlatej na `:3000` zámerné, alebo tam ten kontajner ostal po overovaní?**
3. **Aktívna navigácia** — zlatý rail (handoff) alebo čierny ink pill (worktree)?
4. **Čo s nepushnutým `main` commitom 858549c** pred rebuildom produkcie?

Krok 3 (`--on-accent` v dark mode) je pravá AA chyba na primárnych CTA v 7 z 10
appiek a dá sa spraviť samostatne, nezávisle od odpovedí vyššie.
