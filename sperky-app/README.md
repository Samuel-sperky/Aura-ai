# Šperky API klient

Klient nad `SPERKY_API.md` — objednávky a produkty z `https://sperky-eshop.sk`.
Čisté HTML + CSS + JavaScript, žiadny build, žiadne závislosti. Dizajn je jazyk
rodiny Aura (tmavá téma ako default, tokeny, `color-mix`, dve hustoty, SK/EN).

Táto verzia je **dizajnová**: appka je celá naklikaná a vie hovoriť s API, ale
štandardne beží na demo dátach, takže sa dá otvoriť a posúdiť bez kľúča a bez
siete.

```
sperky-app/
├── index.html          shell + statický markup všetkých štyroch obrazoviek
├── server.mjs          statický server + proxy (drží API kľúč mimo prehliadača)
└── assets/
    ├── aura.css        rodinný dizajnový jazyk (port z aura-roadmap globals.css)
    ├── sperky.css      vrstva tejto appky
    ├── i18n.js         všetky texty (SK default, EN)
    ├── api.js          jediné miesto, ktoré sa dotýka siete
    ├── demo.js         dáta bez siete
    └── app.js          router, render, stavy, overlaye
```

## Spustenie

### 1. Len dizajn (demo dáta)

Otvor `index.html` v prehliadači. Funguje aj z `file://` — demo režim nič
nesťahuje. Toto je default po prvom otvorení.

### 2. So skutočným API (odporúčaný spôsob)

```bash
printf 'SPERKY_API_KEY=<kľúč s scope orders:read>\n' > sperky-app/.env
node --env-file=sperky-app/.env sperky-app/server.mjs
# → http://localhost:3060
```

V appke potom **Nastavenia → Zdroj dát → Cez proxy**.

Kľúč zostáva v procese servera. Prehliadač ho nikdy nevidí, requesty idú na
rovnaký origin, takže CORS vôbec nevzniká.

Server vie:

| Premenná | Default | Význam |
|---|---|---|
| `SPERKY_API_KEY` | — | kľúč pre `/api/order*`; bez neho vrátia `forbidden` |
| `SPERKY_BASE_URL` | `https://sperky-eshop.sk` | upstream |
| `PORT` | `3060` | port |
| `HOST` | `127.0.0.1` | rozhranie; mimo loopbacku server varuje |

Proxy má **allowlist ciest aj parametrov** — prepustí len štyri dokumentované
cesty a len dokumentované query parametre. Otvorený proxy s produkčným kľúčom v
hlavičke je presne to, čo sa nesmie stať.

Počúva **len na loopbacku** a nemá vlastnú autentifikáciu: kto sa naň dostane,
čita všetky objednávky. `HOST=0.0.0.0` to zapne pre celú sieť — vtedy pred neho
patrí reverzný proxy s prihlásením a server to pri starte povie.

Statický server vydá **len prípony appky** (`.html`, `.css`, `.js`, `.svg`,
`.ico`, `.png`, `.woff2`) a nič, čoho segment začína bodkou. Preto sa `.env`,
ktorý sa odporúča držať práve v tomto adresári, nedá stiahnuť.

### 3. Priamo z prehliadača

**Nastavenia → Zdroj dát → Priamo z prehliadača** + vlož kľúč. Použiteľné na
rýchly test, ale má dve daňe:

- kľúč leží v `localStorage`, takže ho prečíta ktokoľvek pri tom počítači;
- requesty sú cross-origin, takže eshop musí posielať CORS hlavičky. Keď
  neposiela, prehliadač zlyhá spôsobom, ktorý sa nedá odlíšiť od mŕtvej siete —
  appka to preto v chybe pomenuje.

## Čo appka pokrýva

| Obrazovka | Endpoint | Čo robí |
|---|---|---|
| Prehľad | `GET /api/order`, `GET /api/products` | dve dlaždice s `total` z API, súčet načítanej stránky, prvých 8 riadkov z oboch zoznamov |
| Objednávky | `GET /api/order` | stránkovanie, filtre `date_from` / `date_to` / `country` / `total_min` / `total_max`, stav filtrov v URL |
| Detail objednávky | `GET /api/order/get` | dátum, suma, krajina + ISO, položky; na požiadanie doplní názvy z `/api/products/get` |
| Produkty | `GET /api/products` | stránkovanie, `id_lang`, hľadanie v načítanej stránke |
| Detail produktu | `GET /api/products/get` | popis (sanitizovaný), varianty s cenou, EAN a skladom |
| Nastavenia | — | zdroj dát, kľúč, hlavička, téma, hustota, jazyk, log posledných 25 requestov |

Každý stav objednávky/produktu sa dá zdieľať odkazom — route aj filtre sú
v hashi (`#/orders/1763435?country=SK&page=2`).

## Pravidlá, ktoré tu držia dizajn pri pravde

Sú prevzaté z `CLAUDE.md` rodiny a v kóde sú označené komentárom:

1. **Popisok sa čita z tej istej hodnoty, z akej sa kreslí obsah.** „Súčet
   zobrazenej stránky" hlási počet riadkov, ktoré naozaj sčítal, nie konštantu.
   Preto tam nie je „za posledných 30 dní" — appka toľko dát nemá.
2. **Počítadlo v navigácii ukazuje, koľko je v API, nie koľko prešlo filtrom.**
   Filtrovaný počet patrí do pagera.
3. **Ovládací prvok nesmie nabízať stav, ktorý API odmietne.** Dátumový rozsah
   pozpätku, dolná hranica nad hornou a trojpísmenový ISO kód sa zastavia
   vo formulári, nie zlyhaným requestom.
4. **Chyba má jednu cestu.** API signalizuje zlyhanie tromi spôsobmi (HTTP stav,
   `{"error":…}`, `{"result":{"ok":false}}`); `api.js` ich mapuje na jeden kód
   a preložený text, takže view nemá tri vetvy a jednu z nich rozbitú.
5. **Strop, ktorý nikoho neinformuje, vyzerá ako „hotovo".** Doplnenie názvov
   spracuje najviac 20 položiek a keď ich je viac, povie to.
6. **Rate limit je per IP, nie per používateľ.** Preto žiadne fan-out volanie:
   prehľad je 2 requesty, zoznam 1, doplnenie názvov jeden po druhom s odstupom.
7. **Široká tabuľka sa na mobil neposiela.** Pod 700 px sa riadky vykresľujú ako
   karty s menovkami stĺpcov. Zmerané na 390 px: žiadne vodorovné pretečenie na
   žiadnej obrazovke.
8. **Popis produktu je cudzie HTML.** Prechádza allowlistom prvkov (`<script>`,
   `on*` a nehttp odkazy padajú), až potom sa vykreslí.

## Známe hranice (vedomé, nie chyby)

- **Hľadanie produktov filtruje len načítanú stránku** — `/api/products` nemá
  vyhľadávací parameter. Je to napísané priamo nad zoznamom.
- **Produkty nemajú menu.** Endpoint ju nevracia; appka zobrazuje EUR a hovorí
  to. Surová hodnota (aj so šiestimi desatinnými miestami) je v tooltipe.
- **Zoznam objednávok nevracia krajinu**, aj keď sa podľa nej dá filtrovať —
  krajina je až v detaile.
- **Žiadne grafy.** Zmysluplný graf potrebuje agregáciu, ktorú API nedá bez
  ťahania desiatok stránok; to by strhlo rate limit. Ďalší krok, nie táto verzia.
- **Fonty Geist a Playfair Display** sa ťahajú z Google Fonts. Bez siete appka
  spadne na systémový font, inak je nedotknutá.

## Bezpečnosť kľúča — čo je odmerané

Zmerané cez podvrhnutý „eshop", ktorý loguje každú prijatú hlavičku, plus
prehliadač, ktorý zaznamenáva každý odchádzajúci request:

| Otázka | Výsledok |
|---|---|
| Je kľúč v repozitári alebo v git histórii? | nie — prehľadané všetky blob objekty všetkých commitov |
| Je kľúč natvrdo v zdrojákoch appky? | nie, žiadny reťazec tvaru tajomstva |
| Dostane sa serverový kľúč v proxy režime do prehliadača? | nie — 0 requestov a 0 odpovedí ho nesie, `localStorage` obsahuje len `sperky.mode` |
| Posiela sa kľúč na verejné produkty? | nie, `/api/products*` ide bez hlavičky v oboch režimoch |
| Cestuje kľúč v URL alebo v `Referer`? | nie, výhradne v hlavičke; `Referrer-Policy: same-origin`, takže Google Fonts nedostane ani cestu |
| Vypisuje ho log požiadaviek v UI? | nie, log má len cestu, stav a trvanie |
| Vracia ho server niekde v tele odpovede? | nie |
| Dá sa stiahnuť `/.env`, `/server.mjs`, `/README.md`? | nie, 404 (pred opravou `/.env` vrátilo kľúč) |
| Je proxy dosiahnuteľný zo siete? | nie, loopback (pred opravou `http://<ip>:3060/api/order` vrátilo 200) |
| Môže odpoveď proxy prečítať cudzia stránka? | nie, žiadne `Access-Control-*` hlavičky |

V **direct** režime kľúč v prehliadači **je** — v `localStorage` a v hlavičke
requestu. To nie je chyba, to je cena toho režimu a appka ju hovorí nahlas.
Zaujímavé zistenie z merania: proti eshopu bez CORS hlavičiek sa reálny request
ani nevyšle — prehliadač skončí na preflighte, takže kľúč fyzicky neopustí
stroj a appka to ohlási ako nedostupné API.

## Rotácia kľúča

Kľúč vypísaný v dokumentácii `SPERKY_API.md` je **platný produkčný kľúč** s scope
`orders:read`. Je v Markdown dokumente, teda pravdepodobne aj v gite a v histórii
chatov. Odporúčam ho rotovať a nový držať len v `.env` na strane servera. Tento
repozitár žiadny kľúč neobsahuje — `.gitignore` v roote pokrýva `.env` na každej
úrovni a v kóde nie je nikde zapísaný.

## Ďalší krok

- Skutočný beh proti produkcii (v tomto prostredí je `sperky-eshop.sk` na úrovni
  siete blokovaný, takže overené je len demo + proxy vrstva).
- Ak sa má appka pripojiť na rodinu Aura (auth, `defineRoute()`, MariaDB), je to
  port do Next.js podľa `CLAUDE.md`; tento HTML klient je dizajnová predloha.
