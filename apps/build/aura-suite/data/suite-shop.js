/* SHOP_A — sperky-ai, prvá polovica (hlavička appky + 6 obrazoviek: prehlad,
   produkty, produkt, objednavky, objednavka, zakaznici). Druhú polovicu píše
   paralelne iný agent. L(sk,en), cur(n), int(n), pc(n) sú globálne, nedefinuj ich.

   OVERENÉ 1:1 z Hades pamäte (aura-app family — dve vetvy; Prenos Aura Suite
   vizuálu do appiek): port 3000, 43 číslovaných migrácií s _migrations ledgerom,
   105 vitest + 3 playwright, argon2id + jose JWT + app_sessions, defineRoute()
   auth→rateLimit→zod→handler, rate-limit a lockout 5/15 min → 423, CSRF fail-closed,
   0 UI i18n na ~233 000 riadkoch, 5 760 inline style vs 3 829 className.
   Júl 2026 (overené): tržba 217 016 €, 5 679 objednávok, AOV 38,21 €,
   dobierka 65,8 %, HU+RO+SK spolu 63,9 %, marža 66,1 %.

   VŠETKO OSTATNÉ (konkrétne produkty, objednávky, zákazníci, latencie API,
   rozdelenie trhov po jednotlivých krajinách, 12-mesačný priebeh mimo júla)
   je ukážkové a je tak aj v texte označené. */

const SHOP_A = {
  key: 'shop',
  name: 'sperky-ai',
  port: '3000',
  icon: 'bag',
  tag: L(
    "Hlavná e-shop a marketingová appka rodiny Aura — Next.js na vetve B rodiny.",
    "The family's main e-shop and marketing app — Next.js on the family's branch B."
  ),
  feat: [
    L(
      "Next.js 16 + React 19, argon2id + jose + zod, defineRoute() pipeline auth→rateLimit→zod→handler.",
      "Next.js 16 + React 19, argon2id + jose + zod, a defineRoute() auth→rateLimit→zod→handler pipeline."
    ),
    L(
      "43 číslovaných migrácií s _migrations ledgerom, 105 vitest + 3 playwright, reálne zálohy s restore-testom.",
      "43 numbered migrations with a _migrations ledger, 105 vitest + 3 playwright, real backups with a restore test."
    ),
    L(
      "Vetva B rodiny — bezpečnostný a testovací základ; CSRF fail-closed, lockout 5/15 min → 423.",
      "The family's branch B — the security and test foundation; CSRF fail-closed, lockout 5/15 min → 423."
    )
  ],
  live: {
    v: L(
      "Júl 2026: 217 016 € tržba · 5 679 objednávok — overené",
      "July 2026: €217,016 revenue · 5,679 orders — verified"
    ),
    tone: 'ok',
    spark: [58, 60, 63, 61, 66, 64, 67] /* ukážkový tvar, nie denné dáta */
  },
  api: {
    /* interné admin API appky — ukážkové latencie; nejde o /api/summary pre Aura Hub,
       ten appka zatiaľ nevystavuje (overené, pozri Aura Hub — Pripojenia) */
    endpoints: [
      { k: 'orders', l: L("Objednávky", "Orders"), ms: 120 },
      { k: 'products', l: L("Produkty", "Products"), ms: 95 },
      { k: 'stats', l: L("Štatistiky", "Stats"), ms: 180 },
      { k: 'customers', l: L("Zákazníci", "Customers"), ms: 140 }
    ],
    sync: L("pred 2 min", "2 min ago"),
    tone: 'ok'
  },
  imp: {
    target: 'produkty',
    cols: [
      { k: 'kod', l: L("Kód", "Code"), t: 'text' },
      { k: 'nazov', l: L("Názov", "Name"), t: 'text' },
      { k: 'cena', l: L("Cena", "Price"), t: 'num' },
      { k: 'sklad', l: L("Sklad", "Stock"), t: 'num' },
      { k: 'kategoria', l: L("Kategória", "Category"), t: 'text' }
    ],
    key: [L("kľúč upsertu: kód produktu", "upsert key: product code")],
    csv: "kod;nazov;cena;sklad;kategoria\nSP-RG-0001;Zlatý prsteň Riviéra;349.00;0;Prstene\nSP-EA-0001;Strieborné náušnice Luna;179.00;9;Náušnice\nSP-NK-0001;Náhrdelník Aurelia;109.00;19;Náhrdelníky\nSP-BR-0001;Náramok Vento;59,90;31;Náramky\nSP-CH-0001;Retiazka Figaro;349.00;52;Retiazky\nSP-PN-0001;Prívesok Srdce;189.00;4;Prívesky"
  },
  rep: {
    templates: [
      { k: 'predaj', l: L("Predajný report", "Sales report"), s: L("Tržby, objednávky a AOV podľa trhu a obdobia", "Revenue, orders and AOV by market and period") },
      { k: 'obsah', l: L("Obsahový report", "Content report"), s: L("Pokrytie fotiek, popiskov a SEO stavu podľa kategórie", "Photo, copy and SEO coverage by category") },
      { k: 'feedy', l: L("Report feedov", "Feed report"), s: L("Stav produktových feedov a synchronizácie", "Product feed and sync status") }
    ]
  },
  screens: [
    {
      key: 'prehlad',
      icon: 'grid',
      title: L("Prehľad", "Overview"),
      sub: L(
        "Objednávky, tržba, trhy a upozornenia za júl 2026.",
        "Orders, revenue, markets and alerts for July 2026."
      ),
      blocks: [
        {
          t: 'kpis',
          items: [
            { l: L("Objednávky (júl 2026)", "Orders (July 2026)"), v: int(5679), sub: L("overené", "verified"), tone: null, live: true },
            { l: L("Tržba (júl 2026)", "Revenue (July 2026)"), v: cur(217016), sub: L("overené", "verified"), tone: 'ok', live: true },
            { l: L("Priemerná hodnota objednávky", "Average order value"), v: "38,21 €", sub: L("overené", "verified"), tone: null, live: true },
            { l: L("Marža", "Margin"), v: "66,1 %", sub: L("overené", "verified"), tone: 'ok', live: true }
          ]
        },
        {
          t: 'lines',
          title: L("Tržba za posledných 12 mesiacov", "Revenue over the last 12 months"),
          labels: [
            L("Aug 25", "Aug 25"), L("Sep 25", "Sep 25"), L("Okt 25", "Oct 25"), L("Nov 25", "Nov 25"),
            L("Dec 25", "Dec 25"), L("Jan 26", "Jan 26"), L("Feb 26", "Feb 26"), L("Mar 26", "Mar 26"),
            L("Apr 26", "Apr 26"), L("Máj 26", "May 26"), L("Jún 26", "Jun 26"), L("Júl 26", "Jul 26")
          ],
          series: [
            { l: L("Tržba", "Revenue"), v: [163200, 169400, 171800, 180500, 196200, 174800, 183100, 190700, 201300, 198600, 206400, 217016], color: 'var(--teal)' }
          ],
          avg: false,
          note: L(
            "Júl 2026 (217 016 €) je overený bod; ostatné mesiace sú ukážkový priebeh.",
            "July 2026 (€217,016) is the verified point; the other months are an illustrative trend."
          )
        },
        {
          t: 'bars',
          title: L("Podiel trhov na objednávkach (júl 2026)", "Share of orders by market (July 2026)"),
          data: [
            { l: "SK", v: 25.1 },
            { l: "HU", v: 22.4 },
            { l: "RO", v: 16.4 },
            { l: "CZ", v: 14.2 },
            { l: "PL", v: 12.9 },
            { l: L("Ostatné", "Other"), v: 9.0 }
          ],
          note: L(
            "HU+RO+SK spolu 63,9 % je overené; rozdelenie po jednotlivých trhoch je ukážkové.",
            "HU+RO+SK combined at 63.9% is verified; the per-market split is illustrative."
          )
        },
        {
          t: 'list',
          title: L("Upozornenia", "Alerts"),
          items: [
            { title: L("Nízky sklad — 6 produktov pod 5 ks", "Low stock — 6 products under 5 units"), sub: L("kategórie Prstene a Retiazky", "Rings and Chains categories"), badge: ['cond', L("Pozor", "Attention")], meta: "08:14" },
            { title: L("Feed Google Shopping — 3 % chýb", "Google Shopping feed — 3% errors"), sub: L("chýbajúce GTIN pri 14 položkách", "missing GTIN on 14 items"), badge: ['cond', L("Pozor", "Attention")], meta: "11:02" },
            { title: L("Dobierka nevyzdvihnutá — 2 objednávky", "COD not picked up — 2 orders"), sub: L("vrátené kuriérom", "returned by courier"), badge: ['no', L("Rieš", "Resolve")], meta: "yesterday" }
          ],
          note: L("Ukážkové dáta.", "Sample data.")
        }
      ],
      ai: [
        { q: L("Aká bola tržba a počet objednávok v júli 2026?", "What was revenue and order count in July 2026?"),
          a: L("Júl 2026: tržba 217 016 €, 5 679 objednávok, priemerná hodnota objednávky 38,21 €, marža 66,1 % — overené čísla z pamäte Aura AI.", "July 2026: revenue €217,016, 5,679 orders, average order value €38.21, margin 66.1% — verified figures from Aura AI memory."),
          cite: 'pamäť', act: { l: L("Otvoriť objednávky", "Open orders"), k: 'open' } },
        { q: L("Aký je podiel dobierky a hlavných trhov?", "What is the share of COD and main markets?"),
          a: L("Dobierka tvorí 65,8 % objednávok, trhy HU+RO+SK spolu 63,9 % — obe overené; rozdelenie po jednotlivých trhoch v grafe vyššie je ukážkové.", "COD makes up 65.8% of orders, HU+RO+SK markets together 63.9% — both verified; the per-market breakdown in the chart above is illustrative."),
          cite: 'pamäť', act: null },
        { q: L("Čo si dnes vyžaduje pozornosť?", "What needs attention today?"),
          a: L("Nízky sklad pri 6 produktoch, 3 % chýb vo feede Google Shopping a 2 nevyzdvihnuté dobierky — ukážkový zoznam upozornení.", "Low stock on 6 products, 3% errors in the Google Shopping feed, and 2 unretrieved COD parcels — sample alert list."),
          cite: 'ukážka', act: { l: L("Otvoriť produkty", "Open products"), k: 'open' } }
      ]
    },
    {
      key: 'produkty',
      icon: 'tag',
      title: L("Produkty", "Products"),
      sub: L(
        "Katalóg s cenami, skladom, pokrytím fotiek a popiskov a stavom SEO.",
        "Catalog with prices, stock, photo/copy coverage and SEO status."
      ),
      blocks: [
        {
          t: 'kpis',
          items: [
            { l: L("Produkty v katalógu", "Catalog products"), v: int(1240), sub: L("ukážkové", "sample"), tone: null },
            { l: L("Chýbajúce hlavné fotky", "Missing primary photos"), v: int(54), sub: L("ukážkové", "sample"), tone: 'no' },
            { l: L("SEO stav v poriadku", "SEO status OK"), v: "71 %", sub: L("ukážkové", "sample"), tone: 'cond' }
          ]
        },
        {
          t: 'bars',
          title: L("Obsadenosť fotiek podľa kategórie", "Photo coverage by category"),
          data: [
            { l: L("Prstene", "Rings"), v: 94 },
            { l: L("Náušnice", "Earrings"), v: 88 },
            { l: L("Náhrdelníky", "Necklaces"), v: 76 },
            { l: L("Náramky", "Bracelets"), v: 69 },
            { l: L("Retiazky", "Chains"), v: 81 },
            { l: L("Prívesky", "Pendants"), v: 72 }
          ],
          note: L("Ukážkové dáta.", "Sample data.")
        },
        {
          t: 'table',
          title: L("Katalóg produktov", "Product catalog"),
          cols: [L("Kód", "Code"), L("Názov", "Name"), L("Cena", "Price"), L("Sklad", "Stock"), L("Fotky", "Photos"), L("Popisky", "Copy"), L("SEO stav", "SEO status")],
          rows: [
            { c: ["SP-RG-0001", "Zlatý prsteň Riviéra", cur(349), int(0), ['ok', L("Kompletné", "Complete")], ['ok', L("Kompletné", "Complete")], ['ok', L("V poriadku", "OK")]], go: 'produkt' },
            { c: ["SP-RG-0002", "Prsteň Stella", cur(289), int(2), ['ok', L("Kompletné", "Complete")], ['no', L("Chýba", "Missing")], ['cond', L("Na doplnenie", "To fill in")]], go: 'produkt' },
            { c: ["SP-RG-0003", "Prsteň Aurelia", cur(259), int(3), ['ok', L("Kompletné", "Complete")], ['ok', L("Kompletné", "Complete")], ['ok', L("V poriadku", "OK")]], go: 'produkt' },
            { c: ["SP-RG-0004", "Snubný prsteň Lumen", cur(219), int(4), ['cond', L("Čiastočné", "Partial")], ['cond', L("Čiastočné", "Partial")], ['ok', L("V poriadku", "OK")]], go: 'produkt' },
            { c: ["SP-RG-0005", "Prsteň s kamienkom Nova", cur(199), int(6), ['ok', L("Kompletné", "Complete")], ['ok', L("Kompletné", "Complete")], ['ok', L("V poriadku", "OK")]], go: 'produkt' },
            { c: ["SP-RG-0006", "Prsteň Vento", cur(189), int(8), ['no', L("Chýba", "Missing")], ['ok', L("Kompletné", "Complete")], ['cond', L("Na doplnenie", "To fill in")]], go: 'produkt' },
            { c: ["SP-EA-0001", "Strieborné náušnice Luna", cur(179), int(9), ['ok', L("Kompletné", "Complete")], ['ok', L("Kompletné", "Complete")], ['ok', L("V poriadku", "OK")]], go: 'produkt' },
            { c: ["SP-EA-0002", "Náušnice Ember", cur(159), int(11), ['cond', L("Čiastočné", "Partial")], ['cond', L("Čiastočné", "Partial")], ['no', L("Chýba", "Missing")]], go: 'produkt' },
            { c: ["SP-EA-0003", "Náušnice Aurelia", cur(149), int(12), ['ok', L("Kompletné", "Complete")], ['ok', L("Kompletné", "Complete")], ['ok', L("V poriadku", "OK")]], go: 'produkt' },
            { c: ["SP-EA-0004", "Kruhové náušnice Halo", cur(139), int(14), ['ok', L("Kompletné", "Complete")], ['no', L("Chýba", "Missing")], ['cond', L("Na doplnenie", "To fill in")]], go: 'produkt' },
            { c: ["SP-EA-0005", "Náušnice s perlou Ivory", cur(129), int(15), ['ok', L("Kompletné", "Complete")], ['ok', L("Kompletné", "Complete")], ['ok', L("V poriadku", "OK")]], go: 'produkt' },
            { c: ["SP-EA-0006", "Visiace náušnice Cascade", cur(119), int(18), ['cond', L("Čiastočné", "Partial")], ['cond', L("Čiastočné", "Partial")], ['ok', L("V poriadku", "OK")]], go: 'produkt' },
            { c: ["SP-NK-0001", "Náhrdelník Aurelia", cur(109), int(19), ['ok', L("Kompletné", "Complete")], ['ok', L("Kompletné", "Complete")], ['ok', L("V poriadku", "OK")]], go: 'produkt' },
            { c: ["SP-NK-0002", "Náhrdelník Luna", cur(99.9), int(21), ['no', L("Chýba", "Missing")], ['ok', L("Kompletné", "Complete")], ['cond', L("Na doplnenie", "To fill in")]], go: 'produkt' },
            { c: ["SP-NK-0003", "Náhrdelník Vento", cur(89.9), int(24), ['ok', L("Kompletné", "Complete")], ['ok', L("Kompletné", "Complete")], ['ok', L("V poriadku", "OK")]], go: 'produkt' },
            { c: ["SP-NK-0004", "Náhrdelník s príveskom Stella", cur(79.9), int(27), ['cond', L("Čiastočné", "Partial")], ['cond', L("Čiastočné", "Partial")], ['no', L("Chýba", "Missing")]], go: 'produkt' },
            { c: ["SP-NK-0005", "Náhrdelník Nova", cur(69.9), int(29), ['ok', L("Kompletné", "Complete")], ['ok', L("Kompletné", "Complete")], ['ok', L("V poriadku", "OK")]], go: 'produkt' },
            { c: ["SP-BR-0001", "Náramok Vento", cur(59.9), int(31), ['ok', L("Kompletné", "Complete")], ['no', L("Chýba", "Missing")], ['cond', L("Na doplnenie", "To fill in")]], go: 'produkt' },
            { c: ["SP-BR-0002", "Náramok Aurelia", cur(49.9), int(34), ['ok', L("Kompletné", "Complete")], ['ok', L("Kompletné", "Complete")], ['ok', L("V poriadku", "OK")]], go: 'produkt' },
            { c: ["SP-BR-0003", "Tenisový náramok Halo", cur(39.9), int(38), ['cond', L("Čiastočné", "Partial")], ['cond', L("Čiastočné", "Partial")], ['ok', L("V poriadku", "OK")]], go: 'produkt' },
            { c: ["SP-BR-0004", "Náramok Luna", cur(34.9), int(41), ['ok', L("Kompletné", "Complete")], ['ok', L("Kompletné", "Complete")], ['ok', L("V poriadku", "OK")]], go: 'produkt' },
            { c: ["SP-BR-0005", "Náramok Ember", cur(29.9), int(46), ['no', L("Chýba", "Missing")], ['ok', L("Kompletné", "Complete")], ['cond', L("Na doplnenie", "To fill in")]], go: 'produkt' },
            { c: ["SP-CH-0001", "Retiazka Figaro", cur(349), int(52), ['ok', L("Kompletné", "Complete")], ['ok', L("Kompletné", "Complete")], ['ok', L("V poriadku", "OK")]], go: 'produkt' },
            { c: ["SP-CH-0002", "Retiazka Rope", cur(289), int(58), ['cond', L("Čiastočné", "Partial")], ['cond', L("Čiastočné", "Partial")], ['no', L("Chýba", "Missing")]], go: 'produkt' },
            { c: ["SP-CH-0003", "Retiazka Box", cur(259), int(0), ['ok', L("Kompletné", "Complete")], ['ok', L("Kompletné", "Complete")], ['ok', L("V poriadku", "OK")]], go: 'produkt' },
            { c: ["SP-CH-0004", "Retiazka Singapur", cur(219), int(2), ['ok', L("Kompletné", "Complete")], ['no', L("Chýba", "Missing")], ['cond', L("Na doplnenie", "To fill in")]], go: 'produkt' },
            { c: ["SP-CH-0005", "Retiazka Anker", cur(199), int(3), ['ok', L("Kompletné", "Complete")], ['ok', L("Kompletné", "Complete")], ['ok', L("V poriadku", "OK")]], go: 'produkt' },
            { c: ["SP-PN-0001", "Prívesok Srdce", cur(189), int(4), ['cond', L("Čiastočné", "Partial")], ['cond', L("Čiastočné", "Partial")], ['ok', L("V poriadku", "OK")]], go: 'produkt' },
            { c: ["SP-PN-0002", "Prívesok Kríž", cur(179), int(6), ['ok', L("Kompletné", "Complete")], ['ok', L("Kompletné", "Complete")], ['ok', L("V poriadku", "OK")]], go: 'produkt' },
            { c: ["SP-PN-0003", "Prívesok Iniciál", cur(159), int(8), ['no', L("Chýba", "Missing")], ['ok', L("Kompletné", "Complete")], ['cond', L("Na doplnenie", "To fill in")]], go: 'produkt' },
            { c: ["SP-PN-0004", "Prívesok Nova", cur(149), int(9), ['ok', L("Kompletné", "Complete")], ['ok', L("Kompletné", "Complete")], ['ok', L("V poriadku", "OK")]], go: 'produkt' },
            { c: ["SP-PN-0005", "Prívesok Luna", cur(139), int(11), ['cond', L("Čiastočné", "Partial")], ['cond', L("Čiastočné", "Partial")], ['no', L("Chýba", "Missing")]], go: 'produkt' }
          ],
          note: L("Ukážkové dáta, 32 z 1 240 produktov katalógu.", "Sample data, 32 of 1,240 catalog products."),
          page: true
        }
      ],
      ai: [
        { q: L("Koľko produktov chýba hlavná fotka?", "How many products are missing a primary photo?"),
          a: L("54 produktov v katalógu nemá hlavnú fotku, najviac v kategóriách Náramky a Retiazky — ukážkové dáta.", "54 catalog products are missing a primary photo, mostly in the Bracelets and Chains categories — sample data."),
          cite: 'ukážka', act: { l: L("Filtrovať chýbajúce fotky", "Filter missing photos"), k: 'filter' } },
        { q: L("Ktoré produkty majú neúplné SEO?", "Which products have incomplete SEO?"),
          a: L("SEO stav je v poriadku pri 71 % produktov; zvyšok potrebuje doplniť popis alebo štruktúrované dáta — ukážkové dáta.", "SEO status is OK for 71% of products; the rest need copy or structured data filled in — sample data."),
          cite: 'ukážka', act: null },
        { q: L("Ako sa importujú nové ceny a sklad z CSV?", "How are new prices and stock imported from CSV?"),
          a: L("Import wizard páruje riadky cez kľúč upsertu kód produktu a čaká stĺpce kod;nazov;cena;sklad;kategoria.", "The import wizard matches rows via the upsert key product code and expects the columns kod;nazov;cena;sklad;kategoria."),
          cite: 'import', act: { l: L("Otvoriť import", "Open import"), k: 'open' } }
      ]
    },
    {
      key: 'produkt',
      icon: 'eye',
      title: L("Detail produktu", "Product detail"),
      sub: L(
        "SP-RG-0001 · Zlatý prsteň Riviéra — varianty, ceny podľa trhu, fotky, história zmien.",
        "SP-RG-0001 · Riviéra gold ring — variants, market pricing, photos, change history."
      ),
      blocks: [
        {
          t: 'cards',
          n: 3,
          items: [
            { title: L("Veľkosť 52", "Size 52"), sub: L("Žlté zlato 585", "Yellow gold 585"), badge: ['ok', L("Skladom", "In stock")], lines: [[L("Sklad", "Stock"), "3"], [L("SKU", "SKU"), "SP-RG-0001-52"]], chips: [L("bestseller", "bestseller")] },
            { title: L("Veľkosť 54", "Size 54"), sub: L("Žlté zlato 585", "Yellow gold 585"), badge: ['ok', L("Skladom", "In stock")], lines: [[L("Sklad", "Stock"), "5"], [L("SKU", "SKU"), "SP-RG-0001-54"]], chips: [] },
            { title: L("Veľkosť 58", "Size 58"), sub: L("Žlté zlato 585", "Yellow gold 585"), badge: ['no', L("Vypredané", "Sold out")], lines: [[L("Sklad", "Stock"), "0"], [L("SKU", "SKU"), "SP-RG-0001-58"]], chips: [] }
          ]
        },
        {
          t: 'table',
          title: L("Cena podľa trhu", "Price by market"),
          cols: [L("Trh", "Market"), L("Cena", "Price"), L("Poznámka", "Note")],
          rows: [
            { c: ["SK", cur(349), L("Základná cena", "Base price")] },
            { c: ["HU", cur(349), L("Rovnaká ako SK", "Same as SK")] },
            { c: ["RO", cur(359), L("+10 € kvôli doprave", "+€10 for shipping")] },
            { c: ["CZ", cur(349), L("Rovnaká ako SK", "Same as SK")] },
            { c: ["PL", cur(359), L("+10 € kvôli doprave", "+€10 for shipping")] }
          ],
          note: L("Ukážkové dáta.", "Sample data.")
        },
        {
          t: 'list',
          title: L("Fotky produktu", "Product photos"),
          items: [
            { title: "IMG_RG0001_01.jpg", sub: L("Hlavná fotka, 1200×1200", "Primary photo, 1200×1200"), badge: ['ok', L("OK", "OK")], meta: "1,2 MB" },
            { title: "IMG_RG0001_02.jpg", sub: L("Detail kameňa", "Stone detail"), badge: ['ok', L("OK", "OK")], meta: "0,9 MB" },
            { title: "IMG_RG0001_03.jpg", sub: L("Na ruke, model", "On hand, model"), badge: ['cond', L("Čaká na schválenie", "Pending approval")], meta: "1,4 MB" }
          ],
          note: L("Ukážkové dáta.", "Sample data.")
        },
        {
          t: 'timeline',
          title: L("História zmien", "Change history"),
          items: [
            [L("21.7.2026", "Jul 21, 2026"), L("Cena znížená z 379 € na 349 € — letná akcia", "Price lowered from €379 to €349 — summer promo")],
            [L("10.7.2026", "Jul 10, 2026"), L("Doplnená fotka na ruke", "Added on-hand photo")],
            [L("2.7.2026", "Jul 2, 2026"), L("Produkt zaradený do kategórie bestseller", "Product added to bestseller category")]
          ]
        }
      ],
      ai: [
        { q: L("Aké varianty veľkostí sú skladom?", "Which size variants are in stock?"),
          a: L("Veľkosti 52 a 54 sú skladom (3 a 5 ks), veľkosť 58 je vypredaná — ukážkové dáta.", "Sizes 52 and 54 are in stock (3 and 5 units), size 58 is sold out — sample data."),
          cite: 'ukážka', act: null },
        { q: L("Líši sa cena podľa trhu?", "Does the price differ by market?"),
          a: L("Základná cena 349 € platí pre SK, HU, CZ; RO a PL majú +10 € kvôli doprave — ukážkové dáta.", "The base price of €349 applies to SK, HU, CZ; RO and PL are +€10 for shipping — sample data."),
          cite: 'ukážka', act: null },
        { q: L("Kedy sa naposledy menila cena?", "When was the price last changed?"),
          a: L("21.7.2026 bola cena znížená z 379 € na 349 € v rámci letnej akcie — ukážkové dáta.", "On Jul 21, 2026 the price was lowered from €379 to €349 as part of the summer promo — sample data."),
          cite: 'ukážka', act: { l: L("Otvoriť históriu", "Open history"), k: 'open' } }
      ]
    },
    {
      key: 'objednavky',
      icon: 'inbox',
      title: L("Objednávky", "Orders"),
      sub: L(
        "Zoznam objednávok so stavmi, trhom, dopravou, platbou a dobierkou.",
        "Order list with statuses, market, shipping, payment and cash-on-delivery."
      ),
      blocks: [
        {
          t: 'kpis',
          items: [
            { l: L("Objednávky (júl 2026)", "Orders (July 2026)"), v: int(5679), sub: L("overené", "verified"), tone: null },
            { l: L("Podiel dobierky", "Cash-on-delivery share"), v: "65,8 %", sub: L("overené", "verified"), tone: null },
            { l: L("Po termíne", "Overdue"), v: int(11), sub: L("ukážkové", "sample"), tone: 'no' }
          ]
        },
        {
          t: 'table',
          title: null,
          cols: [L("Objednávka", "Order"), L("Dátum", "Date"), L("Trh", "Market"), L("Hodnota", "Value"), L("Doprava", "Shipping"), L("Platba", "Payment"), L("Stav", "Status")],
          rows: [
            { c: ["SP-20260701-100", "2026-07-01", "SK", cur(24.9), L("Kuriér", "Courier"), L("Karta", "Card"), ['ok', L("Doručená", "Delivered")]], go: 'objednavka' },
            { c: ["SP-20260703-101", "2026-07-03", "HU", cur(29.9), L("Slovenská pošta", "Slovak Post"), L("Dobierka", "COD"), ['cond', L("V príprave", "Preparing")]], go: 'objednavka' },
            { c: ["SP-20260704-102", "2026-07-04", "RO", cur(34.9), L("Packeta", "Packeta"), L("Prevod", "Bank transfer"), ['cond', L("Expedovaná", "Shipped")]], go: 'objednavka' },
            { c: ["SP-20260706-103", "2026-07-06", "CZ", cur(38.2), L("Osobný odber", "Pickup point"), L("Karta", "Card"), ['no', L("Zrušená", "Cancelled")]], go: 'objednavka' },
            { c: ["SP-20260707-104", "2026-07-07", "PL", cur(39.9), L("Kuriér", "Courier"), L("Dobierka", "COD"), ['no', L("Vrátená", "Returned")]], go: 'objednavka' },
            { c: ["SP-20260708-105", "2026-07-08", "SK", cur(42.5), L("Slovenská pošta", "Slovak Post"), L("Prevod", "Bank transfer"), ['ok', L("Doručená", "Delivered")]], go: 'objednavka' },
            { c: ["SP-20260709-106", "2026-07-09", "HU", cur(45), L("Packeta", "Packeta"), L("Karta", "Card"), ['cond', L("V príprave", "Preparing")]], go: 'objednavka' },
            { c: ["SP-20260711-107", "2026-07-11", "RO", cur(49.9), L("Osobný odber", "Pickup point"), L("Dobierka", "COD"), ['cond', L("Expedovaná", "Shipped")]], go: 'objednavka' },
            { c: ["SP-20260712-108", "2026-07-12", "CZ", cur(52.3), L("Kuriér", "Courier"), L("Prevod", "Bank transfer"), ['no', L("Zrušená", "Cancelled")]], go: 'objednavka' },
            { c: ["SP-20260714-109", "2026-07-14", "PL", cur(58), L("Slovenská pošta", "Slovak Post"), L("Karta", "Card"), ['no', L("Vrátená", "Returned")]], go: 'objednavka' },
            { c: ["SP-20260715-110", "2026-07-15", "SK", cur(62.9), L("Packeta", "Packeta"), L("Dobierka", "COD"), ['ok', L("Doručená", "Delivered")]], go: 'objednavka' },
            { c: ["SP-20260716-111", "2026-07-16", "HU", cur(69.9), L("Osobný odber", "Pickup point"), L("Prevod", "Bank transfer"), ['cond', L("V príprave", "Preparing")]], go: 'objednavka' },
            { c: ["SP-20260718-112", "2026-07-18", "RO", cur(74.5), L("Kuriér", "Courier"), L("Karta", "Card"), ['cond', L("Expedovaná", "Shipped")]], go: 'objednavka' },
            { c: ["SP-20260719-113", "2026-07-19", "CZ", cur(79.9), L("Slovenská pošta", "Slovak Post"), L("Dobierka", "COD"), ['no', L("Zrušená", "Cancelled")]], go: 'objednavka' },
            { c: ["SP-20260721-114", "2026-07-21", "PL", cur(89.9), L("Packeta", "Packeta"), L("Prevod", "Bank transfer"), ['no', L("Vrátená", "Returned")]], go: 'objednavka' },
            { c: ["SP-20260722-115", "2026-07-22", "SK", cur(99), L("Osobný odber", "Pickup point"), L("Karta", "Card"), ['ok', L("Doručená", "Delivered")]], go: 'objednavka' },
            { c: ["SP-20260723-116", "2026-07-23", "HU", cur(109.9), L("Kuriér", "Courier"), L("Dobierka", "COD"), ['cond', L("V príprave", "Preparing")]], go: 'objednavka' },
            { c: ["SP-20260725-117", "2026-07-25", "RO", cur(129), L("Slovenská pošta", "Slovak Post"), L("Prevod", "Bank transfer"), ['cond', L("Expedovaná", "Shipped")]], go: 'objednavka' },
            { c: ["SP-20260726-118", "2026-07-26", "CZ", cur(149.5), L("Packeta", "Packeta"), L("Karta", "Card"), ['no', L("Zrušená", "Cancelled")]], go: 'objednavka' },
            { c: ["SP-20260728-119", "2026-07-28", "PL", cur(189), L("Osobný odber", "Pickup point"), L("Dobierka", "COD"), ['no', L("Vrátená", "Returned")]], go: 'objednavka' },
            { c: ["SP-20260701-120", "2026-07-01", "SK", cur(24.9), L("Kuriér", "Courier"), L("Prevod", "Bank transfer"), ['ok', L("Doručená", "Delivered")]], go: 'objednavka' },
            { c: ["SP-20260703-121", "2026-07-03", "HU", cur(29.9), L("Slovenská pošta", "Slovak Post"), L("Karta", "Card"), ['cond', L("V príprave", "Preparing")]], go: 'objednavka' },
            { c: ["SP-20260704-122", "2026-07-04", "RO", cur(34.9), L("Packeta", "Packeta"), L("Dobierka", "COD"), ['cond', L("Expedovaná", "Shipped")]], go: 'objednavka' },
            { c: ["SP-20260706-123", "2026-07-06", "CZ", cur(38.2), L("Osobný odber", "Pickup point"), L("Prevod", "Bank transfer"), ['no', L("Zrušená", "Cancelled")]], go: 'objednavka' },
            { c: ["SP-20260707-124", "2026-07-07", "PL", cur(39.9), L("Kuriér", "Courier"), L("Karta", "Card"), ['no', L("Vrátená", "Returned")]], go: 'objednavka' },
            { c: ["SP-20260708-125", "2026-07-08", "SK", cur(42.5), L("Slovenská pošta", "Slovak Post"), L("Dobierka", "COD"), ['ok', L("Doručená", "Delivered")]], go: 'objednavka' },
            { c: ["SP-20260709-126", "2026-07-09", "HU", cur(45), L("Packeta", "Packeta"), L("Prevod", "Bank transfer"), ['cond', L("V príprave", "Preparing")]], go: 'objednavka' },
            { c: ["SP-20260711-127", "2026-07-11", "RO", cur(49.9), L("Osobný odber", "Pickup point"), L("Karta", "Card"), ['cond', L("Expedovaná", "Shipped")]], go: 'objednavka' },
            { c: ["SP-20260712-128", "2026-07-12", "CZ", cur(52.3), L("Kuriér", "Courier"), L("Dobierka", "COD"), ['no', L("Zrušená", "Cancelled")]], go: 'objednavka' },
            { c: ["SP-20260714-129", "2026-07-14", "PL", cur(58), L("Slovenská pošta", "Slovak Post"), L("Prevod", "Bank transfer"), ['no', L("Vrátená", "Returned")]], go: 'objednavka' },
            { c: ["SP-20260715-130", "2026-07-15", "SK", cur(62.9), L("Packeta", "Packeta"), L("Karta", "Card"), ['ok', L("Doručená", "Delivered")]], go: 'objednavka' },
            { c: ["SP-20260716-131", "2026-07-16", "HU", cur(69.9), L("Osobný odber", "Pickup point"), L("Dobierka", "COD"), ['cond', L("V príprave", "Preparing")]], go: 'objednavka' },
            { c: ["SP-20260718-132", "2026-07-18", "RO", cur(74.5), L("Kuriér", "Courier"), L("Prevod", "Bank transfer"), ['cond', L("Expedovaná", "Shipped")]], go: 'objednavka' },
            { c: ["SP-20260719-133", "2026-07-19", "CZ", cur(79.9), L("Slovenská pošta", "Slovak Post"), L("Karta", "Card"), ['no', L("Zrušená", "Cancelled")]], go: 'objednavka' },
            { c: ["SP-20260721-134", "2026-07-21", "PL", cur(89.9), L("Packeta", "Packeta"), L("Dobierka", "COD"), ['no', L("Vrátená", "Returned")]], go: 'objednavka' },
            { c: ["SP-20260722-135", "2026-07-22", "SK", cur(99), L("Osobný odber", "Pickup point"), L("Prevod", "Bank transfer"), ['ok', L("Doručená", "Delivered")]], go: 'objednavka' }
          ],
          note: L("Ukážkové dáta, 36 z 5 679 objednávok júla 2026.", "Sample data, 36 of 5,679 July 2026 orders."),
          page: true
        }
      ],
      ai: [
        { q: L("Koľko objednávok bolo v júli 2026 a aký je podiel dobierky?", "How many orders were there in July 2026 and what is the COD share?"),
          a: L("5 679 objednávok, dobierka tvorí 65,8 % z nich — overené čísla.", "5,679 orders, cash-on-delivery makes up 65.8% of them — verified figures."),
          cite: 'pamäť', act: null },
        { q: L("Koľko objednávok je po termíne?", "How many orders are overdue?"),
          a: L("11 objednávok je po termíne, najviac pri doprave Slovenskou poštou — ukážkové dáta.", "11 orders are overdue, mostly with Slovak Post shipping — sample data."),
          cite: 'ukážka', act: { l: L("Filtrovať po termíne", "Filter overdue"), k: 'filter' } },
        { q: L("Ktoré objednávky boli zrušené alebo vrátené?", "Which orders were cancelled or returned?"),
          a: L("V ukážkovom zozname je 14 z 36 objednávok zrušených alebo vrátených, rovnomerne rozložených cez trhy.", "In the sample list, 14 of 36 orders are cancelled or returned, spread evenly across markets."),
          cite: 'ukážka', act: { l: L("Exportovať zoznam", "Export list"), k: 'export' } }
      ]
    },
    {
      key: 'objednavka',
      icon: 'clip',
      title: L("Detail objednávky", "Order detail"),
      sub: L(
        "SP-20260722-115 · trh SK, osobný odber, platba kartou — položky, doprava, platba, história.",
        "SP-20260722-115 · SK market, pickup point, card payment — items, shipping, payment, history."
      ),
      blocks: [
        {
          t: 'table',
          title: L("Položky objednávky", "Order items"),
          cols: [L("Kód", "Code"), L("Názov", "Name"), L("Množstvo", "Qty"), L("Cena/ks", "Unit price"), L("Spolu", "Subtotal")],
          rows: [
            { c: ["SP-BR-0002", "Náramok Aurelia", int(1), cur(49.9), cur(49.9)] },
            { c: ["SP-PN-0002", "Prívesok Kríž", int(1), cur(179), cur(179)] }
          ],
          note: L(
            "Ukážkové dáta, ceny položiek sú ilustračné a nemusia presne súhlasiť so súhrnnou hodnotou v zozname objednávok.",
            "Sample data, item prices are illustrative and may not exactly match the summary value in the order list."
          )
        },
        {
          t: 'cards',
          n: 2,
          items: [
            { title: L("Doprava", "Shipping"), sub: L("Osobný odber, Bratislava", "Pickup point, Bratislava"), badge: ['ok', L("Doručená", "Delivered")], lines: [[L("Vyzdvihnuté", "Picked up"), "23.7.2026"], [L("Miesto", "Location"), L("Výdajné miesto Bratislava", "Pickup point Bratislava")]], chips: [] },
            { title: L("Platba", "Payment"), sub: L("Platba kartou online", "Card payment online"), badge: ['ok', L("Zaplatené", "Paid")], lines: [[L("Suma", "Amount"), "99,00 €"], [L("Poskytovateľ", "Provider"), "Stripe"]], chips: [] }
          ]
        },
        {
          t: 'timeline',
          title: L("História objednávky", "Order history"),
          items: [
            [L("22.7.2026 10:15", "Jul 22, 2026 10:15"), L("Objednávka prijatá", "Order received")],
            [L("22.7.2026 10:16", "Jul 22, 2026 10:16"), L("Platba kartou potvrdená", "Card payment confirmed")],
            [L("23.7.2026 09:40", "Jul 23, 2026 09:40"), L("Pripravená na výdajnom mieste", "Ready at pickup point")],
            [L("23.7.2026 15:02", "Jul 23, 2026 15:02"), L("Vyzdvihnutá zákazníkom", "Picked up by customer")]
          ]
        }
      ],
      ai: [
        { q: L("Aký je stav tejto objednávky?", "What is the status of this order?"),
          a: L("Objednávka SP-20260722-115 je doručená — platba kartou potvrdená a tovar vyzdvihnutý na výdajnom mieste 23.7.2026 — ukážkové dáta.", "Order SP-20260722-115 is delivered — card payment confirmed and the goods picked up at the pickup point on Jul 23, 2026 — sample data."),
          cite: 'ukážka', act: null },
        { q: L("Aké položky objednávka obsahuje?", "What items does the order contain?"),
          a: L("Objednávka obsahuje náramok Aurelia a prívesok Kríž — ukážkové, ilustračné ceny položiek.", "The order contains the Aurelia bracelet and the Cross pendant — sample, illustrative item prices."),
          cite: 'ukážka', act: null },
        { q: L("Akým spôsobom bola objednávka doručená a zaplatená?", "How was the order shipped and paid?"),
          a: L("Doprava osobným odberom na výdajnom mieste v Bratislave, platba kartou cez Stripe — ukážkové dáta.", "Shipping via pickup point in Bratislava, payment by card via Stripe — sample data."),
          cite: 'ukážka', act: { l: L("Otvoriť zoznam objednávok", "Open order list"), k: 'open' } }
      ]
    },
    {
      key: 'zakaznici',
      icon: 'people',
      title: L("Zákazníci", "Customers"),
      sub: L(
        "Zákazníci podľa trhu, počtu a hodnoty objednávok, opakovaného nákupu.",
        "Customers by market, order count and value, repeat purchase."
      ),
      blocks: [
        {
          t: 'kpis',
          items: [
            { l: L("Aktívni zákazníci (júl 2026)", "Active customers (July 2026)"), v: int(4820), sub: L("ukážkové", "sample"), tone: null },
            { l: L("Opakovaní zákazníci", "Repeat customers"), v: "34 %", sub: L("ukážkové", "sample"), tone: 'cond' },
            { l: L("Priemerná hodnota zákazníka", "Average customer value"), v: "45,20 €", sub: L("ukážkové", "sample"), tone: null }
          ]
        },
        {
          t: 'donut',
          title: L("Podiel opakovaných zákazníkov", "Share of repeat customers"),
          pct: 34,
          label: L("opakovaní zákazníci", "repeat customers"),
          note: L("Ukážkové dáta.", "Sample data.")
        },
        {
          t: 'table',
          title: L("Zoznam zákazníkov", "Customer list"),
          cols: [L("Zákazník", "Customer"), L("Trh", "Market"), L("Objednávky", "Orders"), L("Hodnota", "Value"), L("Opakovaný", "Repeat"), L("Posledná objednávka", "Last order")],
          rows: [
            { c: ["J. Nováková", "SK", int(1), cur(28.50), ['ok', L("Áno", "Yes")], "2026-07-28"] },
            { c: ["M. Horváth", "HU", int(2), cur(69.60), ['q', L("Nie", "No")], "2026-07-26"] },
            { c: ["K. Bartošová", "RO", int(3), cur(123.30), ['ok', L("Áno", "Yes")], "2026-07-24"] },
            { c: ["T. Kováč", "CZ", int(4), cur(189.60), ['ok', L("Áno", "Yes")], "2026-07-22"] },
            { c: ["Z. Szabó", "PL", int(5), cur(268.50), ['q', L("Nie", "No")], "2026-07-19"] },
            { c: ["P. Dvořák", "SK", int(6), cur(360.00), ['ok', L("Áno", "Yes")], "2026-07-15"] },
            { c: ["E. Nagy", "HU", int(1), cur(66.30), ['q', L("Nie", "No")], "2026-07-11"] },
            { c: ["L. Varga", "RO", int(2), cur(145.20), ['ok', L("Áno", "Yes")], "2026-07-08"] },
            { c: ["R. Kovács", "CZ", int(3), cur(236.70), ['ok', L("Áno", "Yes")], "2026-07-28"] },
            { c: ["A. Molnár", "PL", int(4), cur(114.00), ['q', L("Nie", "No")], "2026-07-26"] },
            { c: ["V. Tóth", "SK", int(5), cur(174.00), ['ok', L("Áno", "Yes")], "2026-07-24"] },
            { c: ["D. Balogh", "HU", int(6), cur(246.60), ['q', L("Nie", "No")], "2026-07-22"] },
            { c: ["S. Kiss", "RO", int(1), cur(47.40), ['ok', L("Áno", "Yes")], "2026-07-19"] },
            { c: ["I. Farkas", "CZ", int(2), cur(107.40), ['ok', L("Áno", "Yes")], "2026-07-15"] },
            { c: ["M. Németh", "PL", int(3), cur(180.00), ['q', L("Nie", "No")], "2026-07-11"] },
            { c: ["J. Papp", "SK", int(4), cur(265.20), ['ok', L("Áno", "Yes")], "2026-07-08"] },
            { c: ["B. Fekete", "HU", int(5), cur(363.00), ['q', L("Nie", "No")], "2026-07-28"] },
            { c: ["C. Oláh", "RO", int(6), cur(473.40), ['ok', L("Áno", "Yes")], "2026-07-26"] },
            { c: ["H. Szilágyi", "CZ", int(1), cur(28.50), ['ok', L("Áno", "Yes")], "2026-07-24"] },
            { c: ["G. Rácz", "PL", int(2), cur(69.60), ['q', L("Nie", "No")], "2026-07-22"] },
            { c: ["N. Somogyi", "SK", int(3), cur(123.30), ['ok', L("Áno", "Yes")], "2026-07-19"] },
            { c: ["O. Takács", "HU", int(4), cur(189.60), ['q', L("Nie", "No")], "2026-07-15"] },
            { c: ["U. Simon", "RO", int(5), cur(268.50), ['ok', L("Áno", "Yes")], "2026-07-11"] },
            { c: ["F. Lukáč", "CZ", int(6), cur(360.00), ['ok', L("Áno", "Yes")], "2026-07-08"] },
            { c: ["W. Baláž", "PL", int(1), cur(66.30), ['q', L("Nie", "No")], "2026-07-28"] },
            { c: ["Y. Krčová", "SK", int(2), cur(145.20), ['ok', L("Áno", "Yes")], "2026-07-26"] }
          ],
          note: L("Ukážkové dáta, 26 z 4 820 aktívnych zákazníkov júla 2026.", "Sample data, 26 of 4,820 active July 2026 customers."),
          page: true
        }
      ],
      ai: [
        { q: L("Koľko percent zákazníkov je opakovaných?", "What percentage of customers are repeat buyers?"),
          a: L("34 % zákazníkov nakúpilo opakovane — ukážkové dáta.", "34% of customers purchased more than once — sample data."),
          cite: 'ukážka', act: null },
        { q: L("Ktorý zákazník má najvyššiu hodnotu nákupov?", "Which customer has the highest purchase value?"),
          a: L("V ukážkovom zozname má najvyššiu hodnotu C. Oláh (473,40 € pri 6 objednávkach) — ukážkové dáta.", "In the sample list, C. Oláh has the highest value (€473.40 across 6 orders) — sample data."),
          cite: 'ukážka', act: { l: L("Otvoriť zákazníka", "Open customer"), k: 'open' } },
        { q: L("Ako sú zákazníci rozložení podľa trhu?", "How are customers distributed by market?"),
          a: L("Ukážkový zoznam rovnomerne strieda SK, HU, RO, CZ a PL — reálne rozloženie appka zatiaľ nevystavuje cez API.", "The sample list cycles evenly through SK, HU, RO, CZ and PL — the app does not yet expose the real distribution via API."),
          cite: 'ukážka', act: null }
      ]
    }
  ]
};

/* sperky-ai (shop) — druhá polovica obrazoviek (W4 Aura Suite).
   L/cur/int/pc su globalne, ziadne importy. Overene fakty oznacene v note/sub textoch. */

const SHOP_B = [
  { key: 'obsah', icon: 'doc', title: L("Obsah", "Content"),
    sub: L("Kategórie, popisky a pokrytie jazykových mutácií — rozšírenie prehľadu obsahu appky.", "Categories, listings and locale coverage — extended content overview."),
    blocks: [
      { t: 'kpis', items: [
        { l: L("Kategórie", "Categories"), v: int(38), sub: L("ukážkové", "sample"), tone: null },
        { l: L("Kompletné SK popisky", "Complete SK listings"), v: "18 / 38", sub: L("ukážkové", "sample"), tone: 'cond' },
        { l: L("Kategórie bez EN/CZ/HU", "Categories with no EN/CZ/HU"), v: int(9), sub: L("ukážkové", "sample"), tone: 'no' }
      ]},
      { t: 'table', title: L("Kategórie podľa jazyka", "Categories by locale"),
        cols: [L("Kategória", "Category"), L("Jazyk", "Language"), L("Stav popisku", "Listing status"), L("Dĺžka", "Length"), L("Posledná zmena", "Last change")],
        rows: [
          { c: [L("Prstene", "Rings"), "SK", ['ok', L("Kompletné", "Complete")], "1 840 znakov", "12.7.2026"] },
          { c: [L("Prstene", "Rings"), "EN", ['ok', L("Kompletné", "Complete")], "1 760 znakov", "14.7.2026"] },
          { c: [L("Prstene", "Rings"), "CZ", ['cond', L("Čiastočné", "Partial")], "620 znakov", "2.6.2026"] },
          { c: [L("Prstene", "Rings"), "HU", ['no', L("Chýba", "Missing")], "—", "—"] },
          { c: [L("Náušnice", "Earrings"), "SK", ['ok', L("Kompletné", "Complete")], "1 620 znakov", "10.7.2026"] },
          { c: [L("Náušnice", "Earrings"), "EN", ['ok', L("Kompletné", "Complete")], "1 540 znakov", "11.7.2026"] },
          { c: [L("Náušnice", "Earrings"), "CZ", ['cond', L("Čiastočné", "Partial")], "580 znakov", "28.5.2026"] },
          { c: [L("Náušnice", "Earrings"), "HU", ['no', L("Chýba", "Missing")], "—", "—"] },
          { c: [L("Náhrdelníky", "Necklaces"), "SK", ['ok', L("Kompletné", "Complete")], "1 480 znakov", "8.7.2026"] },
          { c: [L("Náhrdelníky", "Necklaces"), "EN", ['cond', L("Čiastočné", "Partial")], "540 znakov", "3.6.2026"] },
          { c: [L("Náhrdelníky", "Necklaces"), "CZ", ['cond', L("Čiastočné", "Partial")], "410 znakov", "3.6.2026"] },
          { c: [L("Náhrdelníky", "Necklaces"), "HU", ['no', L("Chýba", "Missing")], "—", "—"] },
          { c: [L("Náramky", "Bracelets"), "SK", ['cond', L("Čiastočné", "Partial")], "480 znakov", "22.5.2026"] },
          { c: [L("Náramky", "Bracelets"), "EN", ['no', L("Chýba", "Missing")], "—", "—"] },
          { c: [L("Náramky", "Bracelets"), "CZ", ['no', L("Chýba", "Missing")], "—", "—"] },
          { c: [L("Náramky", "Bracelets"), "HU", ['no', L("Chýba", "Missing")], "—", "—"] },
          { c: [L("Snubné prstene", "Wedding rings"), "SK", ['ok', L("Kompletné", "Complete")], "2 100 znakov", "15.7.2026"] },
          { c: [L("Snubné prstene", "Wedding rings"), "EN", ['cond', L("Čiastočné", "Partial")], "690 znakov", "20.6.2026"] },
          { c: [L("Snubné prstene", "Wedding rings"), "CZ", ['no', L("Chýba", "Missing")], "—", "—"] },
          { c: [L("Snubné prstene", "Wedding rings"), "HU", ['no', L("Chýba", "Missing")], "—", "—"] },
          { c: [L("Detské šperky", "Children's jewelry"), "SK", ['cond', L("Čiastočné", "Partial")], "390 znakov", "9.5.2026"] },
          { c: [L("Detské šperky", "Children's jewelry"), "EN", ['no', L("Chýba", "Missing")], "—", "—"] },
          { c: [L("Detské šperky", "Children's jewelry"), "CZ", ['no', L("Chýba", "Missing")], "—", "—"] },
          { c: [L("Detské šperky", "Children's jewelry"), "HU", ['no', L("Chýba", "Missing")], "—", "—"] }
        ],
        note: L("Ukážkové dáta — konkrétne dĺžky a dátumy nie sú overené, ilustrujú tvar tabuľky.", "Sample data — the exact lengths and dates are illustrative, not verified figures."),
        page: true
      },
      { t: 'matrix', title: L("Pokrytie jazykov podľa kategórie", "Locale coverage by category"),
        rows: [L("Prstene", "Rings"), L("Náušnice", "Earrings"), L("Náhrdelníky", "Necklaces"), L("Náramky", "Bracelets"), L("Snubné prstene", "Wedding rings"), L("Detské šperky", "Children's jewelry")],
        cols: ["SK", "EN", "CZ", "HU"],
        st: { "Prstene": [2, 2, 1, 0], "Náušnice": [2, 2, 1, 0], "Náhrdelníky": [2, 1, 1, 0], "Náramky": [1, 0, 0, 0], "Snubné prstene": [2, 1, 0, 0], "Detské šperky": [1, 0, 0, 0] },
        note: L("2 = hotovo, 1 = koncept/čiastočné, 0 = chýba. Ukážkové rozloženie.", "2 = done, 1 = draft/partial, 0 = missing. Sample layout.")
      },
      { t: 'note', text: L(
        "SEO cieľ appky je overene e-shop sperky-eshop.sk a jeho jazykové mutácie — nie interná Aura appka; Aura je len značka a dizajn tokeny appky.",
        "The app's SEO target is verified as the e-shop sperky-eshop.sk and its locales — not the internal Aura app; Aura is only the brand and design tokens of the app."
      )}
    ],
    ai: [
      { q: L("Ktoré kategórie majú najhoršie pokrytie jazykov?", "Which categories have the worst locale coverage?"),
        a: L("Náramky a Detské šperky majú podľa matice len SK na úrovni koncept/čiastočné a EN/CZ/HU úplne chýbajú — najslabšie z 6 sledovaných kategórií.", "Bracelets and Children's jewelry have only a draft/partial SK per the matrix and EN/CZ/HU fully missing — the weakest of the 6 tracked categories."),
        cite: 'appka', act: { l: L("Otvoriť tabuľku", "Open table"), k: 'filter' } },
      { q: L("Koľko kategórií má kompletný SK popis?", "How many categories have a complete SK listing?"),
        a: L("Podľa tabuľky 4 z 6 kategórií (Prstene, Náušnice, Náhrdelníky, Snubné prstene) majú SK popis označený ako Kompletné, zvyšné 2 sú Čiastočné.", "Per the table 4 of 6 categories (Rings, Earrings, Necklaces, Wedding rings) have SK marked Complete, the remaining 2 are Partial."),
        cite: 'appka', act: null },
      { q: L("Je SEO cieľ appky interná Aura appka, alebo e-shop?", "Is the app's SEO target the internal Aura app or the e-shop?"),
        a: L("Overené: cieľom je e-shop sperky-eshop.sk a jeho jazykové mutácie. Aura je len značka a dizajnové tokeny appky, nie predmet SEO práce.", "Verified: the target is the e-shop sperky-eshop.sk and its locales. Aura is only the brand and design tokens of the app, not the subject of SEO work."),
        cite: 'pamäť', act: null }
    ]
  },
  { key: 'seo', icon: 'search', title: L("SEO", "SEO"),
    sub: L("Kľúčové slová, pozície a organická návštevnosť pre sperky-eshop.sk a jeho mutácie.", "Keywords, positions and organic traffic for sperky-eshop.sk and its locales."),
    blocks: [
      { t: 'kpis', items: [
        { l: L("Sledované kľúčové slová", "Tracked keywords"), v: int(28), sub: L("ukážkové", "sample"), tone: null },
        { l: L("Priemerná pozícia", "Average position"), v: "14,2", sub: L("ukážkové", "sample"), tone: 'cond' },
        { l: L("Organické kliky / mesiac", "Organic clicks / month"), v: int(6420), sub: L("ukážkové", "sample"), tone: null },
        { l: L("Priemerné CTR", "Average CTR"), v: "3,1 %", sub: L("ukážkové", "sample"), tone: null }
      ]},
      { t: 'lines', title: L("Organická návštevnosť za 12 mesiacov", "Organic traffic over 12 months"),
        labels: ["9/2025", "10/2025", "11/2025", "12/2025", "1/2026", "2/2026", "3/2026", "4/2026", "5/2026", "6/2026", "7/2026", "8/2026"],
        series: [{ l: L("Organické kliky", "Organic clicks"), v: [4820, 4960, 5340, 6100, 5580, 5720, 5940, 6080, 6260, 6180, 6350, 6420], color: 'var(--teal)' }],
        avg: true, note: L("Ukážkový trend, nie živé dáta z GSC.", "Sample trend, not live GSC data.")
      },
      { t: 'donut', title: L("Kľúčové slová v TOP 10", "Keywords in TOP 10"), pct: 43, label: L("z 28 sledovaných", "of 28 tracked") },
      { t: 'table', title: L("Kľúčové slová", "Keywords"),
        cols: [L("Kľúčové slovo", "Keyword"), L("Dopyt / mes.", "Demand / mo."), L("Pozícia", "Position"), L("Kliky", "Clicks"), "CTR", "URL", L("Stav", "Status")],
        rows: [
          { c: [L("šperky", "šperky"), int(9900), "18,4", int(180), "1,1 %", "/", ['no', L("Klesá", "Declining")]] },
          { c: ["sperky-eshop", int(1300), "1,8", int(410), "18,2 %", "/", ['ok', L("Stabilné", "Stable")]] },
          { c: [L("zlaté prstene", "gold rings"), int(2900), "7,2", int(340), "6,4 %", "/prstene", ['ok', L("Rastie", "Growing")]] },
          { c: [L("strieborné prstene", "silver rings"), int(1900), "9,6", int(210), "5,8 %", "/prstene", ['ok', L("Rastie", "Growing")]] },
          { c: [L("snubné prstene", "wedding rings"), int(3600), "11,3", int(260), "4,1 %", "/snubne-prstene", ['cond', L("Stabilné", "Stable")]] },
          { c: [L("zásnubné prstene", "engagement rings"), int(2400), "13,7", int(150), "3,6 %", "/snubne-prstene", ['cond', L("Stabilné", "Stable")]] },
          { c: [L("strieborné náušnice", "silver earrings"), int(1600), "6,9", int(190), "6,9 %", "/nausnice", ['ok', L("Rastie", "Growing")]] },
          { c: [L("zlaté náušnice", "gold earrings"), int(1400), "8,1", int(160), "6,1 %", "/nausnice", ['ok', L("Rastie", "Growing")]] },
          { c: [L("náušnice cirkóny", "cubic zirconia earrings"), int(880), "15,2", int(70), "3,4 %", "/nausnice", ['cond', L("Stabilné", "Stable")]] },
          { c: [L("retiazky dámske", "women's chains"), int(1100), "12,4", int(90), "3,8 %", "/nahrdelniky", ['cond', L("Stabilné", "Stable")]] },
          { c: [L("retiazky pánske", "men's chains"), int(720), "16,8", int(50), "2,8 %", "/nahrdelniky", ['no', L("Klesá", "Declining")]] },
          { c: [L("náhrdelník srdce", "heart necklace"), int(590), "10,1", int(60), "4,3 %", "/nahrdelniky", ['ok', L("Rastie", "Growing")]] },
          { c: [L("náramok dámsky", "women's bracelet"), int(680), "22,3", int(30), "1,9 %", "/naramky", ['no', L("Klesá", "Declining")]] },
          { c: [L("náramok pánsky", "men's bracelet"), int(510), "24,6", int(20), "1,6 %", "/naramky", ['no', L("Klesá", "Declining")]] },
          { c: [L("prívesok striebro", "silver pendant"), int(390), "19,0", int(25), "2,4 %", "/nahrdelniky", ['cond', L("Stabilné", "Stable")]] },
          { c: [L("šperky darček", "jewelry gift"), int(1700), "9,4", int(150), "4,8 %", "/", ['ok', L("Rastie", "Growing")]] },
          { c: [L("šperky pre ženy", "jewelry for women"), int(1000), "17,5", int(60), "2,7 %", "/", ['cond', L("Stabilné", "Stable")]] },
          { c: [L("šperky pre mužov", "jewelry for men"), int(720), "20,1", int(35), "2,1 %", "/", ['cond', L("Stabilné", "Stable")]] },
          { c: [L("detské šperky", "children's jewelry"), int(480), "28,7", int(12), "1,3 %", "/detske-sperky", ['no', L("Klesá", "Declining")]] },
          { c: [L("rytina na prsteň", "ring engraving"), int(320), "5,4", int(48), "8,2 %", "/blog/rytina", ['ok', L("Rastie", "Growing")]] },
          { c: [L("čistenie striebra", "cleaning silver"), int(1900), "4,8", int(310), "9,4 %", "/blog/cistenie-striebra", ['ok', L("Rastie", "Growing")]] },
          { c: [L("veľkosť prsteňa tabuľka", "ring size chart"), int(2600), "3,1", int(520), "11,6 %", "/blog/velkost-prstena", ['ok', L("Rastie", "Growing")]] },
          { c: [L("piercing helix", "helix piercing"), int(1200), "31,4", int(18), "0,8 %", "/piercing", ['no', L("Klesá", "Declining")]] },
          { c: [L("piercing náušnice", "piercing earrings"), int(940), "26,9", int(22), "1,3 %", "/piercing", ['no', L("Klesá", "Declining")]] },
          { c: [L("bižutéria", "costume jewelry"), int(2100), "23,5", int(45), "1,2 %", "/bizuteria", ['no', L("Klesá", "Declining")]] },
          { c: [L("oceľové šperky", "steel jewelry"), int(680), "18,9", int(28), "2,2 %", "/oceľ", ['cond', L("Stabilné", "Stable")]] },
          { c: [L("perlové náušnice", "pearl earrings"), int(410), "14,0", int(24), "3,2 %", "/nausnice", ['cond', L("Stabilné", "Stable")]] },
          { c: [L("drahé kamene prstene", "gemstone rings"), int(590), "16,3", int(31), "2,9 %", "/prstene", ['cond', L("Stabilné", "Stable")]] }
        ],
        note: L("Ukážkové dáta ilustrujúce tvar reportu. Overený je len cieľ domény sperky-eshop.sk + mutácie.", "Sample data illustrating the report shape. Only the sperky-eshop.sk + locales target is verified."),
        page: true
      }
    ],
    ai: [
      { q: L("Koľko kľúčových slov je v TOP 10?", "How many keywords are in the TOP 10?"),
        a: L("43 % z 28 sledovaných kľúčových slov, teda približne 12, je v TOP 10 podľa donut grafu.", "43% of the 28 tracked keywords, roughly 12, are in the TOP 10 per the donut chart."),
        cite: 'appka', act: null },
      { q: L("Ako sa vyvíjala organická návštevnosť za posledný rok?", "How has organic traffic developed over the last year?"),
        a: L("Podľa 12-mesačného grafu kliky rástli z cca 4 820 na 6 420 mesačne — ide o ukážkový trend, nie o živé dáta z GSC.", "Per the 12-month chart clicks grew from about 4,820 to 6,420 monthly — this is a sample trend, not live GSC data."),
        cite: 'ukážka', act: null },
      { q: L("Sleduje sa brand výraz oddelene od head-termu?", "Is the brand term tracked separately from the head term?"),
        a: L("Áno, tabuľka má samostatné riadky pre head-term „šperky“ a brand „sperky-eshop“ — z pamäte vyplýva, že ich treba pozerať oddelene, lebo rast jednej kategórie vie zamaskovať pokles na oboch.", "Yes, the table has separate rows for the head term \"šperky\" and the brand \"sperky-eshop\" — memory shows they must be viewed separately, since one category's growth can mask a decline on both."),
        cite: 'pamäť', act: null }
    ]
  },
  { key: 'feedy', icon: 'share', title: L("Feedy", "Feeds"),
    sub: L("Produktové feedy pre Google, Meta, Heureka a porovnávače naprieč trhmi SK/CZ/HU.", "Product feeds for Google, Meta, Heureka and comparison shopping engines across SK/CZ/HU markets."),
    blocks: [
      { t: 'kpis', items: [
        { l: L("Aktívne feedy", "Active feeds"), v: "8 / 12", sub: L("ukážkové", "sample"), tone: 'cond' },
        { l: L("Položiek spolu", "Items total"), v: int(11570), sub: L("ukážkové", "sample"), tone: null },
        { l: L("Feedy s chybou behu", "Feeds with a run error"), v: int(4), sub: L("ukážkové", "sample"), tone: 'no' }
      ]},
      { t: 'table', title: L("Stav feedov", "Feed status"),
        cols: [L("Feed", "Feed"), L("Trh", "Market"), L("Stav", "Status"), L("Položky", "Items"), L("Chyby", "Errors"), L("Posledný beh", "Last run")],
        rows: [
          { c: [L("Google Merchant Center", "Google Merchant Center"), "SK", ['ok', L("OK", "OK")], int(1180), int(4), L("dnes 03:10", "today 03:10")] },
          { c: [L("Google Merchant Center", "Google Merchant Center"), "CZ", ['ok', L("OK", "OK")], int(1120), int(2), L("dnes 03:10", "today 03:10")] },
          { c: [L("Meta Catalog (FB/IG)", "Meta Catalog (FB/IG)"), L("SK+CZ", "SK+CZ"), ['ok', L("OK", "OK")], int(1240), int(0), L("dnes 04:00", "today 04:00")] },
          { c: ["Heureka.sk", "SK", ['cond', L("Upozornenie", "Warning")], int(1180), int(12), L("dnes 05:00", "today 05:00")] },
          { c: ["Heureka.cz", "CZ", ['no', L("Chyba behu", "Run failed")], int(1120), int(38), L("včera 05:00", "yesterday 05:00")] },
          { c: [L("Árukereső", "Árukereső"), "HU", ['no', L("Chyba behu", "Run failed")], int(640), int(54), L("pred 3 dňami", "3 days ago")] },
          { c: ["Glami.sk", "SK", ['ok', L("OK", "OK")], int(980), int(3), L("dnes 06:00", "today 06:00")] },
          { c: ["Glami.cz", "CZ", ['cond', L("Upozornenie", "Warning")], int(940), int(9), L("dnes 06:00", "today 06:00")] },
          { c: ["Glami.hu", "HU", ['no', L("Chyba behu", "Run failed")], int(520), int(22), L("pred 2 dňami", "2 days ago")] },
          { c: [L("Zboží.cz", "Zboží.cz"), "CZ", ['cond', L("Upozornenie", "Warning")], int(1050), int(15), L("dnes 05:30", "today 05:30")] },
          { c: ["Pricemania.sk", "SK", ['ok', L("OK", "OK")], int(890), int(1), L("dnes 04:30", "today 04:30")] },
          { c: ["Najnakup.sk", "SK", ['ok', L("OK", "OK")], int(910), int(2), L("dnes 04:30", "today 04:30")] }
        ],
        note: L("Ukážkové dáta — trhy SK/CZ/HU zodpovedajú overenému SEO cieľu mutácií, konkrétne počty a chyby sú ilustračné.", "Sample data — the SK/CZ/HU markets match the verified locale SEO target, exact counts and errors are illustrative."),
        page: true
      },
      { t: 'list', title: L("Aktuálne chyby feedov", "Current feed errors"),
        items: [
          { title: L("Chýbajúci GTIN/EAN pri 38 položkách", "Missing GTIN/EAN on 38 items"), sub: "Heureka.cz", badge: ['no', L("Kritické", "Critical")], meta: L("včera 05:00", "yesterday 05:00") },
          { title: L("HU preklad názvu chýba pri 54 položkách", "HU title translation missing on 54 items"), sub: L("Árukereső", "Árukereső"), badge: ['no', L("Kritické", "Critical")], meta: L("pred 3 dňami", "3 days ago") },
          { title: L("Neplatná Google Product Category pri 12 položkách", "Invalid Google Product Category on 12 items"), sub: "Heureka.sk", badge: ['cond', L("Upozornenie", "Warning")], meta: L("dnes 05:00", "today 05:00") },
          { title: L("Cenová XML neaktualizovaná 3 dni", "Price XML not refreshed for 3 days"), sub: "Glami.hu", badge: ['no', L("Kritické", "Critical")], meta: L("pred 2 dňami", "2 days ago") }
        ],
        note: L("Ukážkové dáta.", "Sample data.")
      }
    ],
    ai: [
      { q: L("Ktoré feedy majú práve teraz chybu behu?", "Which feeds currently have a run failure?"),
        a: L("Podľa tabuľky Heureka.cz a Árukereső (HU) aj Glami.hu majú stav Chyba behu — spolu 3 z 12 feedov.", "Per the table Heureka.cz, Árukereső (HU) and Glami.hu are in Run failed status — 3 of 12 feeds."),
        cite: 'appka', act: { l: L("Otvoriť zoznam chýb", "Open error list"), k: 'filter' } },
      { q: L("Koľko feedov pokrýva CZ a HU trh?", "How many feeds cover the CZ and HU markets?"),
        a: L("Z 12 feedov 4 cielia na CZ (Google CZ, Meta zdieľané, Heureka.cz, Zboží.cz, Glami.cz) a 2 na HU (Árukereső, Glami.hu) — HU pokrytie je najslabšie.", "Of 12 feeds, several target CZ (Google CZ, shared Meta, Heureka.cz, Zboží.cz, Glami.cz) and 2 target HU (Árukereső, Glami.hu) — HU coverage is the weakest."),
        cite: 'appka', act: null },
      { q: L("Sú počty položiek vo feedoch overené reálne čísla?", "Are the feed item counts verified real figures?"),
        a: L("Nie, ide o ukážkové dáta ilustrujúce tvar tabuľky. Overený je len fakt, že sledované trhy SK/CZ/HU zodpovedajú cieľu jazykových mutácií sperky-eshop.sk.", "No, this is sample data illustrating the table shape. Only the fact that the SK/CZ/HU markets match the sperky-eshop.sk locale target is verified."),
        cite: 'ukážka', act: null }
    ]
  },
  { key: 'integracie', icon: 'swap', title: L("Integrácie", "Integrations"),
    sub: L("Platby, doprava, e-mail a napojenia na ostatné appky rodiny Aura.", "Payments, shipping, email and connections to the other Aura family apps."),
    blocks: [
      { t: 'kpis', items: [
        { l: L("Pripojené integrácie", "Connected integrations"), v: "6 / 10", sub: L("ukážkové", "sample"), tone: 'cond' },
        { l: L("Priemerná latencia", "Average latency"), v: "~110 ms", sub: L("ukážkové", "sample"), tone: null },
        { l: L("Appky rodiny bez API napojenia", "Family apps with no API link"), v: int(2), sub: L("Aura Hub, čiastočne Aura KPI — overené", "Aura Hub, partly Aura KPI — verified"), tone: 'no' }
      ]},
      { t: 'table', title: L("Stav integrácií", "Integration status"),
        cols: [L("Integrácia", "Integration"), L("Typ", "Type"), L("Stav", "Status"), L("Latencia", "Latency"), L("Posledná synchronizácia", "Last sync")],
        rows: [
          { c: [L("Platby — karta (Stripe)", "Payments — card (Stripe)"), L("Platobná brána", "Payment gateway"), ['ok', L("Pripojené", "Connected")], "~180 ms", L("priebežne", "continuous")] },
          { c: [L("Platby — dobierka", "Payments — cash on delivery"), L("Interné", "Internal"), ['ok', L("Aktívne", "Active")], "—", L("priebežne", "continuous")] },
          { c: [L("Doprava — Slovenská pošta", "Shipping — Slovak Post"), L("Kuriér/pošta", "Courier/post"), ['ok', L("Pripojené", "Connected")], "~240 ms", L("dnes 09:00", "today 09:00")] },
          { c: [L("Doprava — kuriér", "Shipping — courier"), L("Kuriér", "Courier"), ['ok', L("Pripojené", "Connected")], "~210 ms", L("dnes 09:00", "today 09:00")] },
          { c: [L("Doprava — výdajné miesta", "Shipping — pickup points"), L("Kuriér", "Courier"), ['cond', L("Čiastočné", "Partial")], "~260 ms", L("dnes 09:00", "today 09:00")] },
          { c: [L("E-mail — SMTP transakčné", "Email — SMTP transactional"), L("E-mail", "Email"), ['ok', L("Aktívne", "Active")], "~90 ms", L("priebežne", "continuous")] },
          { c: ["Banner Studio (8091)", L("Zdieľaná DB aura_marketing", "Shared aura_marketing DB"), ['cond', L("Len čítanie, bez API", "Read-only, no API")], "—", L("import KB pri nasadení", "KB import at deploy")] },
          { c: ["Aura KPI (3030)", L("Export objednávok", "Order export"), ['q', L("Plánované P2", "Planned P2")], "—", "—"] },
          { c: ["Aura Hub", "/api/summary", ['no', L("Nepripojené", "Not connected")], "—", "—"] },
          { c: [L("Google Ads API", "Google Ads API"), L("Reklama", "Advertising"), ['q', L("V príprave — 50-otázkový kontrakt", "In preparation — 50-question contract")], "—", "—"] }
        ],
        note: L("Latencie sú ilustračné. Overené: Banner Studio berie produktovú znalostnú bázu zo zdieľanej DB aura_marketing appky sperky-ai, nie cez live API; Aura Hub nemá čo dopytovať, lebo /api/summary v appke chýba.", "Latencies are illustrative. Verified: Banner Studio pulls its product knowledge base from sperky-ai's shared aura_marketing DB, not a live API; Aura Hub has nothing to query since /api/summary is missing in the app.")
      },
      { t: 'code', title: L("Kontrakt /api/summary (tvar podľa Aura Hub, appka ho zatiaľ nevystavuje)", "/api/summary contract (shape per Aura Hub, the app does not expose it yet)"),
        lang: 'json',
        text: "{\n  \"metrics\": [\n    { \"label_sk\": \"Objednávky dnes\", \"label_en\": \"Orders today\", \"value\": 18, \"tone\": \"ok\" }\n  ],\n  \"spark\": [94, 101, 88, 112, 120, 105, 130, 118],\n  \"attention\": [\n    { \"label_sk\": \"4 objednávky po termíne\", \"label_en\": \"4 orders overdue\", \"severity\": \"cond\" }\n  ]\n}"
      },
      { t: 'banner', tone: 'no', text: L(
        "OTVORENÉ: implementácia /api/summary zostala rozpracovaná na branchi feat/suite-visuals (3 súbory necommitnuté) — kým nie je hotová, Aura Hub kartu appky zobrazuje len s dôvodom nedostupnosti, nikdy so starým číslom.",
        "OPEN: the /api/summary implementation stalled uncommitted on branch feat/suite-visuals (3 files) — until it is done, the Aura Hub card for this app shows only the unavailability reason, never a stale number."
      )}
    ],
    ai: [
      { q: L("Má appka aktívne pripojenie na Aura Hub?", "Does the app have an active connection to Aura Hub?"),
        a: L("Nie — overené: endpoint /api/summary v appke chýba, implementácia zostala rozpracovaná na branchi feat/suite-visuals. Hub preto zobrazuje dôvod, nie staré číslo.", "No — verified: the /api/summary endpoint is missing in the app, the implementation stalled on branch feat/suite-visuals. The hub therefore shows a reason, not a stale number."),
        cite: 'pamäť', act: null },
      { q: L("Ako Banner Studio získava dáta o produktoch sperky-ai?", "How does Banner Studio get sperky-ai's product data?"),
        a: L("Overené: cez zdieľanú databázu aura_marketing, ktorú si Banner Studio importovalo pri postavení — nejde o živé API napojenie.", "Verified: via the shared aura_marketing database, imported by Banner Studio when it was built — not a live API link."),
        cite: 'pamäť', act: null },
      { q: L("Sú latencie integrácií v tabuľke reálne merané hodnoty?", "Are the integration latencies in the table real measured values?"),
        a: L("Nie, sú ilustračné. Overený je len stav pripojenia Banner Studia (read-only DB) a chýbajúci Aura Hub endpoint.", "No, they are illustrative. Only Banner Studio's connection state (read-only DB) and the missing Aura Hub endpoint are verified."),
        cite: 'ukážka', act: null }
    ]
  },
  { key: 'prevadzka', icon: 'shield', title: L("Prevádzka", "Operations"),
    sub: L("Migrácie s ledgerom, testy, rate-limit/lockout a zálohy — bezpečnostný a testovací základ vetvy B.", "Migrations with a ledger, tests, rate-limit/lockout and backups — branch B's security and test foundation."),
    blocks: [
      { t: 'kpis', items: [
        { l: L("Migrácie DB (ledger)", "DB migrations (ledger)"), v: int(43), sub: L("overené — číslované, s _migrations ledgerom", "verified — numbered, with a _migrations ledger"), tone: 'ok' },
        { l: L("Testy", "Tests"), v: int(108), sub: L("overené — 105 vitest + 3 playwright", "verified — 105 vitest + 3 playwright"), tone: 'ok' },
        { l: L("Lockout po zlyhaní prihlásenia", "Lockout after failed logins"), v: "5 / 15 min → 423", sub: L("overené — rate-limit + lockout", "verified — rate-limit + lockout"), tone: 'ok' }
      ]},
      { t: 'table', title: L("Posledných 20 z 43 migrácií", "Last 20 of 43 migrations"),
        cols: [L("Číslo", "Number"), L("Názov", "Name"), L("Oblasť", "Area"), L("Dátum", "Date"), L("Stav", "State")],
        rows: [
          { c: ["0024", L("add_app_sessions_table", "add_app_sessions_table"), L("Auth", "Auth"), "3.5.2026", ['ok', L("Aplikovaná", "Applied")]] },
          { c: ["0025", L("add_rate_limit_attempts", "add_rate_limit_attempts"), L("Security", "Security"), "5.5.2026", ['ok', L("Aplikovaná", "Applied")]] },
          { c: ["0026", L("add_orders_status_index", "add_orders_status_index"), L("Objednávky", "Orders"), "9.5.2026", ['ok', L("Aplikovaná", "Applied")]] },
          { c: ["0027", L("add_products_seo_fields", "add_products_seo_fields"), L("Katalóg", "Catalog"), "14.5.2026", ['ok', L("Aplikovaná", "Applied")]] },
          { c: ["0028", L("add_category_locale_copy", "add_category_locale_copy"), L("Obsah", "Content"), "18.5.2026", ['ok', L("Aplikovaná", "Applied")]] },
          { c: ["0029", L("add_feed_runs_log", "add_feed_runs_log"), L("Feedy", "Feeds"), "22.5.2026", ['ok', L("Aplikovaná", "Applied")]] },
          { c: ["0030", L("add_csrf_tokens_table", "add_csrf_tokens_table"), L("Security", "Security"), "27.5.2026", ['ok', L("Aplikovaná", "Applied")]] },
          { c: ["0031", L("add_audit_log", "add_audit_log"), L("Audit", "Audit"), "2.6.2026", ['ok', L("Aplikovaná", "Applied")]] },
          { c: ["0032", L("add_product_variants_sku_idx", "add_product_variants_sku_idx"), L("Katalóg", "Catalog"), "6.6.2026", ['ok', L("Aplikovaná", "Applied")]] },
          { c: ["0033", L("add_shipping_methods", "add_shipping_methods"), L("Doprava", "Shipping"), "11.6.2026", ['ok', L("Aplikovaná", "Applied")]] },
          { c: ["0034", L("add_payment_provider_ref", "add_payment_provider_ref"), L("Platby", "Payments"), "15.6.2026", ['ok', L("Aplikovaná", "Applied")]] },
          { c: ["0035", L("add_structured_data_cache", "add_structured_data_cache"), L("SEO", "SEO"), "19.6.2026", ['ok', L("Aplikovaná", "Applied")]] },
          { c: ["0036", L("add_locale_completeness_view", "add_locale_completeness_view"), L("Obsah", "Content"), "24.6.2026", ['ok', L("Aplikovaná", "Applied")]] },
          { c: ["0037", L("add_backup_runs_log", "add_backup_runs_log"), L("Zálohy", "Backups"), "28.6.2026", ['ok', L("Aplikovaná", "Applied")]] },
          { c: ["0038", L("add_admin_roles_table", "add_admin_roles_table"), L("Roly", "Roles"), "2.7.2026", ['ok', L("Aplikovaná", "Applied")]] },
          { c: ["0039", L("add_permissions_matrix", "add_permissions_matrix"), L("Roly", "Roles"), "4.7.2026", ['ok', L("Aplikovaná", "Applied")]] },
          { c: ["0040", L("add_session_revocation", "add_session_revocation"), L("Auth", "Auth"), "9.7.2026", ['ok', L("Aplikovaná", "Applied")]] },
          { c: ["0041", L("add_feed_error_categories", "add_feed_error_categories"), L("Feedy", "Feeds"), "14.7.2026", ['ok', L("Aplikovaná", "Applied")]] },
          { c: ["0042", L("add_gsc_keyword_snapshot", "add_gsc_keyword_snapshot"), L("SEO", "SEO"), "20.7.2026", ['ok', L("Aplikovaná", "Applied")]] },
          { c: ["0043", L("add_summary_endpoint_flag", "add_summary_endpoint_flag"), L("Integrácie", "Integrations"), "26.7.2026", ['ok', L("Aplikovaná", "Applied")]] }
        ],
        note: L("Overené: 43 číslovaných migrácií s _migrations ledgerom existuje reálne. Konkrétne názvy a dátumy v tejto tabuľke sú ukážková rekonštrukcia tvaru, nie overený zoznam.", "Verified: 43 numbered migrations with a _migrations ledger genuinely exist. The specific names and dates in this table are a sample reconstruction of the shape, not a verified list."),
        page: true
      },
      { t: 'bars', title: L("Zablokované pokusy o prihlásenie za 8 týždňov", "Blocked login attempts over 8 weeks"),
        data: [
          { l: "T1", v: 12 }, { l: "T2", v: 8 }, { l: "T3", v: 21 }, { l: "T4", v: 15 },
          { l: "T5", v: 9 }, { l: "T6", v: 27 }, { l: "T7", v: 14 }, { l: "T8", v: 11 }
        ],
        note: L("Ukážkové dáta. Mechanizmus (5 zlyhaní / 15 min → HTTP 423) je overený.", "Sample data. The mechanism (5 failures / 15 min → HTTP 423) is verified.")
      },
      { t: 'list', title: L("Zálohy", "Backups"),
        items: [
          { title: L("mysqldump + restore-test", "mysqldump + restore test"), sub: L("overené — reálny zálohový systém vetvy B, presný harmonogram je ukážkový", "verified — real backup system on branch B, the exact schedule is illustrative"), badge: ['ok', L("Aktívne", "Active")], meta: "" },
          { title: L("Volume obrázkov produktov", "Product image volume"), sub: L("overené — nie je pokrytý centrálnym zálohovým systémom aura_marketing", "verified — not covered by the central aura_marketing backup system"), badge: ['cond', L("Overiť", "Verify")], meta: "" }
        ]
      },
      { t: 'banner', tone: 'no', text: L(
        "OTVORENÉ: src/proxy.ts má dev-fallback SESSION_SECRET — s ním sa dá vyrobiť dev-JWT, ktorý prejde bránou bez akéhokoľvek dotazu do DB. Proxy sama osebe nikdy nie je autorizácia; requireUser()/requireRight() musí byť v každom handleri zvlášť. (Konkrétne hodnoty tajomstiev sú zámerne mimo tohto náhľadu.)",
        "OPEN: src/proxy.ts has a dev-fallback SESSION_SECRET — it can mint a dev-JWT that passes the gate without any DB check. The proxy alone is never authorization; requireUser()/requireRight() must run in every handler separately. (The literal secret values are deliberately kept out of this preview.)"
      )}
    ],
    ai: [
      { q: L("Koľko migrácií má appka a ako sa sledujú?", "How many migrations does the app have and how are they tracked?"),
        a: L("Overené: 43 číslovaných migrácií s _migrations ledgerom. Tabuľka ukazuje posledných 20 — konkrétne názvy a dátumy sú ukážkové.", "Verified: 43 numbered migrations with a _migrations ledger. The table shows the last 20 — the specific names and dates are illustrative."),
        cite: 'pamäť', act: { l: L("Otvoriť tabuľku migrácií", "Open migrations table"), k: 'filter' } },
      { q: L("Koľko testov appka má?", "How many tests does the app have?"),
        a: L("Overené: 108 testov spolu — 105 vitest + 3 playwright.", "Verified: 108 tests total — 105 vitest + 3 playwright."),
        cite: 'pamäť', act: null },
      { q: L("Čo sa stane po 5 zlyhaných prihláseniach za 15 minút?", "What happens after 5 failed logins within 15 minutes?"),
        a: L("Overené: účet dostane lockout a API vráti HTTP 423, kým neuplynie 15-minútové okno. Otvorený bod zostáva dev-fallback SESSION_SECRET v proxy.ts.", "Verified: the account is locked out and the API returns HTTP 423 until the 15-minute window elapses. An open item remains the dev-fallback SESSION_SECRET in proxy.ts."),
        cite: 'pamäť', act: null }
    ]
  },
  { key: 'nastavenia', icon: 'gear', title: L("Nastavenia", "Settings"),
    sub: L("Roly a práva, stav i18n, bezpečnosť a zálohy — konfiguračné formuláre appky.", "Roles and permissions, i18n status, security and backups — the app's configuration forms."),
    blocks: [
      { t: 'form', title: L("Roly a práva", "Roles and permissions"),
        fields: [
          { l: "Admin", s: L("ukážkový model rolí — plný rozsah", "sample role model — full scope"), type: 'text', v: L("Plný prístup", "Full access") },
          { l: "Editor", s: L("ukážkový model rolí — bez nastavení", "sample role model — no settings"), type: 'text', v: L("Katalóg, objednávky, obsah", "Catalog, orders, content") },
          { l: L("Prehliadač", "Viewer"), s: L("ukážkový model rolí — len na čítanie", "sample role model — read only"), type: 'text', v: L("Len čítanie", "Read only") },
          { l: L("Vynútiť requireUser() v každom handleri", "Enforce requireUser() in every handler"), s: L("overené pravidlo — proxy sama nikdy nie je autorizácia", "verified rule — the proxy alone is never authorization"), type: 'switch', on: true }
        ],
        note: L("Roly sú ukážkový model; pravidlo requireUser()/requireRight() v handleri je overené.", "Roles are a sample model; the requireUser()/requireRight()-in-handler rule is verified.")
      },
      { t: 'form', title: L("Stav i18n", "i18n status"),
        fields: [
          { l: L("UI reťazce cez i18n systém", "UI strings via an i18n system"), s: L("overené — 0 pri ~233 000 riadkoch kódu appky, UI je natvrdo v jednom jazyku", "verified — 0 across ~233,000 lines of app code, the UI is hardcoded in one language"), type: 'text', v: "0 / ~233 000" },
          { l: L("Obsah produktov/kategórií (SK/EN/CZ/HU)", "Product/category content (SK/EN/CZ/HU)"), s: L("pozri obrazovku Obsah — pokrytie sa líši podľa kategórie", "see the Content screen — coverage varies by category"), type: 'text', v: L("Čiastočné", "Partial") },
          { l: L("Plánovaný i18n framework pre UI", "Planned UI i18n framework"), s: L("ukážkové — konkrétny termín nie je overený", "sample — no verified timeline"), type: 'select', v: L("Neurčené", "Undecided"), opts: [L("Neurčené", "Undecided"), "next-intl", L("vlastné riešenie", "custom solution")] }
        ],
        note: L("Overené: appka nemá i18n vrstvu pre UI reťazce — len obsah kategórií/produktov má jazykové mutácie a aj to čiastočne.", "Verified: the app has no i18n layer for UI strings — only category/product content has locales, and even that only partially.")
      },
      { t: 'form', title: L("Bezpečnosť", "Security"),
        fields: [
          { l: L("Heslá — argon2id", "Passwords — argon2id"), s: L("overené", "verified"), type: 'switch', on: true },
          { l: L("Relácie — jose JWT", "Sessions — jose JWT"), s: L("overené", "verified"), type: 'switch', on: true },
          { l: "CSRF fail-closed", s: L("overené — pri chybe zlyhá bezpečne, nie otvorene", "verified — fails safely on error, not open"), type: 'switch', on: true },
          { l: L("Rate-limit + lockout (5 / 15 min → 423)", "Rate-limit + lockout (5 / 15 min → 423)"), s: L("overené", "verified"), type: 'switch', on: true },
          { l: L("Dev-fallback SESSION_SECRET v proxy.ts", "Dev-fallback SESSION_SECRET in proxy.ts"), s: L("OTVORENÉ — overené riziko, proxy nikdy nie je autorizácia sama osebe", "OPEN — verified risk, the proxy is never authorization by itself"), type: 'switch', on: false }
        ],
        note: L("Overené fakty z pamäte; presné hodnoty tajomstiev sú zámerne mimo tohto náhľadu.", "Verified facts from memory; the literal secret values are deliberately kept out of this preview.")
      },
      { t: 'form', title: L("Zálohy", "Backups"),
        fields: [
          { l: L("mysqldump + restore-test", "mysqldump + restore test"), s: L("overené — reálny systém na vetve B", "verified — real system on branch B"), type: 'switch', on: true },
          { l: L("Harmonogram", "Schedule"), s: L("ukážkové — presný čas nie je overený", "sample — the exact time is not verified"), type: 'text', v: L("nightly", "nightly") },
          { l: L("Retencia", "Retention"), s: L("ukážkové", "sample"), type: 'text', v: L("posledné 3", "last 3") },
          { l: L("Volume obrázkov produktov", "Product image volume"), s: L("overené — mimo centrálneho systému aura_marketing", "verified — outside the central aura_marketing system"), type: 'switch', on: false }
        ],
        note: L("Zálohovací mechanizmus a restore-test sú overené; harmonogram a retencia sú ukážkové.", "The backup mechanism and restore test are verified; the schedule and retention are illustrative.")
      }
    ],
    ai: [
      { q: L("Je UI appky preložené do viacerých jazykov?", "Is the app's UI translated into multiple languages?"),
        a: L("Nie — overené: 0 UI reťazcov cez i18n systém pri ~233 000 riadkoch kódu appky. Jazykové mutácie existujú len pre obsah kategórií a produktov, a aj to čiastočne.", "No — verified: 0 UI strings via an i18n system across ~233,000 lines of app code. Locales exist only for category/product content, and even that only partially."),
        cite: 'pamäť', act: null },
      { q: L("Je dev-fallback SESSION_SECRET v proxy.ts bezpečnostné riziko?", "Is the dev-fallback SESSION_SECRET in proxy.ts a security risk?"),
        a: L("Áno, je to overený otvorený bod: s ním sa dá vyrobiť dev-JWT bez dotazu do DB. Preto musí byť requireUser()/requireRight() v každom handleri zvlášť, proxy sama nikdy nie je autorizácia.", "Yes, this is a verified open item: it can mint a dev-JWT without any DB check. That is why requireUser()/requireRight() must be in every handler separately — the proxy alone is never authorization."),
        cite: 'pamäť', act: { l: L("Otvoriť Prevádzku", "Open Operations"), k: 'open' } },
      { q: L("Sú zálohy appky overené obnovou dát?", "Are the app's backups verified with a data restore?"),
        a: L("Áno — overené: existuje reálny zálohový systém s restore-testom na vetve B. Presný harmonogram a retencia zobrazené v nastaveniach sú ukážkové.", "Yes — verified: a real backup system with a restore test exists on branch B. The exact schedule and retention shown in settings are illustrative."),
        cite: 'pamäť', act: null }
    ]
  }
];

/* zlúčenie dvoch polovíc (písali ich dva agenti paralelne) */
const APP_SHOP2 = Object.assign({}, SHOP_A, {screens: (SHOP_A.screens||[]).concat(SHOP_B)});
