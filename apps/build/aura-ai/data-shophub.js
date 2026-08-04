/* W4 — dátová špecifikácia pre sperky-ai a Aura Hub.
   Konvencie z apps/aura-apps-hub.html: L(sk,en), cur(n), int(n), pc(n) sú globálne.
   Reálne fakty z Hades pamäte sú označené priamo v texte (commit, port, kontrakt).
   Všetko ostatné (konkrétne čísla objednávok/tržieb/latencie/časov) je ukážkové. */

const APP_SHOP = {
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
      "43 číslovaných migrácií s _migrations ledgerom, reálny zálohový systém s restore-testom.",
      "43 numbered migrations with a _migrations ledger, a real backup system with a restore test."
    ),
    L(
      "Vetva B rodiny — bezpečnostný a testovací základ, na ktorom majú stavať nové appky.",
      "The family's branch B — the security and test foundation new apps are meant to build on."
    )
  ],
  screens: [
    {
      key: 'prehlad',
      icon: 'grid',
      title: L("Prehľad", "Overview"),
      sub: L(
        "Objednávky, tržba a stav feedov — appka zatiaľ nevystavuje /api/summary pre Aura Hub.",
        "Orders, revenue and feed status — the app does not yet expose /api/summary for Aura Hub."
      ),
      blocks: [
        {
          t: 'kpis',
          items: [
            { l: L("Objednávky (júl 2026)", "Orders (July 2026)"), v: int(482), sub: L("ukážkové dáta", "sample data"), tone: null },
            { l: L("Tržba (júl 2026)", "Revenue (July 2026)"), v: cur(38940), sub: L("ukážkové dáta", "sample data"), tone: null },
            { l: L("Konverzný pomer", "Conversion rate"), v: "2,3 %", sub: L("ukážkové dáta", "sample data"), tone: 'cond' }
          ]
        },
        {
          t: 'lines',
          title: L("Objednávky za posledných 8 týždňov", "Orders over the last 8 weeks"),
          labels: [
            L("T1", "W1"), L("T2", "W2"), L("T3", "W3"), L("T4", "W4"),
            L("T5", "W5"), L("T6", "W6"), L("T7", "W7"), L("T8", "W8")
          ],
          series: [
            { l: L("Objednávky", "Orders"), v: [94, 101, 88, 112, 120, 105, 130, 118], color: 'var(--teal)' }
          ],
          avg: false,
          note: L("Ukážkový trend, nie živé dáta.", "Sample trend, not live data.")
        },
        {
          t: 'donut',
          title: L("Stav feedov", "Feed status"),
          pct: 76,
          label: L("feedy v poriadku", "feeds healthy")
        },
        {
          t: 'note',
          text: L(
            "sperky-ai zatiaľ nemá endpoint /api/summary pre Aura Hub — implementácia zostala rozpracovaná na branchi feat/suite-visuals (3 súbory necommitnuté, agent spadol na session limit).",
            "sperky-ai does not yet have the /api/summary endpoint for Aura Hub — implementation stalled uncommitted on branch feat/suite-visuals (3 files, the agent hit a session limit)."
          )
        }
      ]
    },
    {
      key: 'produkty',
      icon: 'tag',
      title: L("Produkty", "Products"),
      sub: L(
        "Katalóg, ceny, varianty, obsadenosť fotiek a popiskov, stav SEO.",
        "Catalog, pricing, variants, photo/copy coverage, SEO status."
      ),
      blocks: [
        {
          t: 'kpis',
          items: [
            { l: L("Produkty v katalógu", "Catalog products"), v: int(1240), sub: L("ukážkové", "sample"), tone: null },
            { l: L("Aktívne varianty", "Active variants"), v: int(3860), sub: L("ukážkové", "sample"), tone: null },
            { l: L("Chýbajúce hlavné fotky", "Missing primary photos"), v: int(54), sub: L("ukážkové", "sample"), tone: 'no' }
          ]
        },
        {
          t: 'bars',
          title: L("Obsadenosť fotiek podľa kategórie", "Photo coverage by category"),
          data: [
            { l: L("Prstene", "Rings"), v: 94 },
            { l: L("Náušnice", "Earrings"), v: 88 },
            { l: L("Náhrdelníky", "Necklaces"), v: 76 },
            { l: L("Náramky", "Bracelets"), v: 69 }
          ]
        },
        {
          t: 'table',
          title: L("Stav SEO popiskov", "SEO listing status"),
          cols: [L("Kategória", "Category"), L("Jazykové mutácie", "Locales"), L("Stav", "Status"), L("Poznámka", "Note")],
          rows: [
            { c: [L("Prstene", "Rings"), "SK, EN, CZ, HU", ['ok', L("Kompletné", "Complete")], L("—", "—")] },
            { c: [L("Náušnice", "Earrings"), "SK, EN, CZ, HU", ['ok', L("Kompletné", "Complete")], L("—", "—")] },
            { c: [L("Náhrdelníky", "Necklaces"), "SK, EN", ['cond', L("Čiastočné", "Partial")], L("CZ, HU chýbajú", "CZ, HU missing")] },
            { c: [L("Náramky", "Bracelets"), "SK", ['no', L("Chýba", "Missing")], L("čaká na copy", "waiting on copy")] }
          ],
          note: L("Ukážkové dáta.", "Sample data.")
        }
      ]
    },
    {
      key: 'objednavky',
      icon: 'inbox',
      title: L("Objednávky", "Orders"),
      sub: L(
        "Zoznam objednávok so stavmi, doprava, platba, dobierka.",
        "Order list with statuses, shipping, payment, cash-on-delivery."
      ),
      blocks: [
        {
          t: 'kpis',
          items: [
            { l: L("Otvorené objednávky", "Open orders"), v: int(37), sub: L("ukážkové", "sample"), tone: null },
            { l: L("Po termíne", "Overdue"), v: int(4), sub: L("ukážkové", "sample"), tone: 'no' },
            { l: L("Podiel dobierky", "Cash-on-delivery share"), v: "18 %", sub: L("ukážkové", "sample"), tone: null }
          ]
        },
        {
          t: 'table',
          title: null,
          cols: [L("Objednávka", "Order"), L("Zákazník", "Customer"), L("Doprava", "Shipping"), L("Platba", "Payment"), L("Stav", "Status")],
          rows: [
            { c: ["SP-20260714", L("J. Nováková", "J. Nováková"), L("Kuriér", "Courier"), L("Karta", "Card"), ['ok', L("Doručená", "Delivered")]] },
            { c: ["SP-20260721", L("M. Horváth", "M. Horváth"), L("Slovenská pošta", "Slovak Post"), L("Dobierka", "COD"), ['cond', L("V príprave", "Preparing")]] },
            { c: ["SP-20260722", L("K. Bartošová", "K. Bartošová"), L("Kuriér", "Courier"), L("Karta", "Card"), ['no', L("Zrušená", "Cancelled")]] },
            { c: ["SP-20260724", L("T. Kováč", "T. Kováč"), L("Kuriér", "Courier"), L("Dobierka", "COD"), ['cond', L("Expedovaná", "Shipped")]] }
          ],
          note: L("Ukážkové dáta.", "Sample data.")
        },
        {
          t: 'list',
          title: L("Posledné udalosti", "Recent events"),
          items: [
            { title: L("Platba prijatá — SP-20260714", "Payment received — SP-20260714"), sub: L("karta, Stripe", "card, Stripe"), badge: ['ok', L("OK", "OK")], meta: "09:12" },
            { title: L("Dobierka nevyzdvihnutá — SP-20260709", "COD not picked up — SP-20260709"), sub: L("vrátená kuriérom", "returned by courier"), badge: ['no', L("Pozor", "Attention")], meta: "yesterday" }
          ]
        }
      ]
    },
    {
      key: 'obsah',
      icon: 'doc',
      title: L("Obsah", "Content"),
      sub: L(
        "SEO a copy: kategórie, popisky, jazykové mutácie, štruktúrované dáta.",
        "SEO and copy: categories, listings, locales, structured data."
      ),
      blocks: [
        {
          t: 'kpis',
          items: [
            { l: L("Kategórie", "Categories"), v: int(38), sub: L("ukážkové", "sample"), tone: null },
            { l: L("Jazykové mutácie", "Locales"), v: int(4), sub: L("SK kompletná, ostatné čiastočne — ukážkové rozloženie", "SK complete, others partial — sample split"), tone: 'cond' },
            { l: L("Štruktúrované dáta (JSON-LD)", "Structured data (JSON-LD)"), v: "64 %", sub: L("ukážkové", "sample"), tone: 'cond' }
          ]
        },
        {
          t: 'table',
          title: L("Jazykové mutácie — pokrytie", "Locale coverage"),
          cols: [L("Mutácia", "Locale"), L("Popisky kategórií", "Category copy"), L("Popisky produktov", "Product copy"), L("Stav", "Status")],
          rows: [
            { c: ["SK", "100 %", "94 %", ['ok', L("Kompletné", "Complete")]] },
            { c: ["EN", "88 %", "61 %", ['cond', L("Čiastočné", "Partial")]] },
            { c: ["CZ", "40 %", "22 %", ['no', L("Na doplnenie", "To be filled in")]] },
            { c: ["HU", "12 %", "4 %", ['no', L("Na doplnenie", "To be filled in")]] }
          ],
          note: L("Ukážkové dáta.", "Sample data.")
        },
        {
          t: 'note',
          text: L(
            "SEO cieľ appky je e-shop sperky-eshop.sk a jeho jazykové mutácie — nie interná Aura appka; Aura je len značka a dizajn tokeny appky.",
            "The app's SEO target is the e-shop sperky-eshop.sk and its locales — not the internal Aura app; Aura is only the brand and design tokens of the app."
          )
        },
        {
          t: 'code',
          title: L("Štruktúrované dáta produktu (tvar ukážkový)", "Product structured data (illustrative shape)"),
          lang: 'json',
          text: "{\n  \"@context\": \"https://schema.org\",\n  \"@type\": \"Product\",\n  \"name\": \"Zlatý prsteň Riviéra\",\n  \"sku\": \"SP-RG-0142\",\n  \"offers\": {\n    \"@type\": \"Offer\",\n    \"priceCurrency\": \"EUR\",\n    \"price\": \"189.00\",\n    \"availability\": \"https://schema.org/InStock\"\n  }\n}"
        }
      ]
    },
    {
      key: 'nastavenia',
      icon: 'gear',
      title: L("Nastavenia", "Settings"),
      sub: L(
        "Integrácie, migrácie DB s ledgerom, rate-limit a lockout, zálohy s restore-testom, roly a práva.",
        "Integrations, DB migrations with a ledger, rate-limit and lockout, backups with a restore test, roles and permissions."
      ),
      blocks: [
        {
          t: 'kpis',
          items: [
            { l: L("Migrácie DB (ledger)", "DB migrations (ledger)"), v: int(43), sub: L("číslované, s _migrations ledgerom", "numbered, with a _migrations ledger"), tone: 'ok' },
            { l: L("Testy (vitest + playwright)", "Tests (vitest + playwright)"), v: int(108), sub: L("105 vitest + 3 playwright", "105 vitest + 3 playwright"), tone: 'ok' },
            { l: L("Lockout po zlyhaní prihlásenia", "Lockout after failed logins"), v: "5 / 15 min → 423", sub: L("rate-limit + lockout na vetve B", "rate-limit + lockout on branch B"), tone: null }
          ]
        },
        {
          t: 'list',
          title: L("Integrácie", "Integrations"),
          items: [
            { title: L("Aura Hub — /api/summary", "Aura Hub — /api/summary"), sub: L("endpoint chýba, WIP na feat/suite-visuals", "endpoint missing, WIP on feat/suite-visuals"), badge: ['no', L("Nepripojené", "Not connected")], meta: "" },
            { title: L("Aura KPI — export objednávok", "Aura KPI — order export"), sub: L("plánované až v P2", "planned only for P2"), badge: ['q', L("Plánované", "Planned")], meta: "" }
          ]
        },
        {
          t: 'banner',
          tone: 'no',
          text: L(
            "OTVORENÉ: src/proxy.ts má dev-fallback SESSION_SECRET — s ním sa dá vyrobiť dev-JWT, ktorý prejde bránou bez akéhokoľvek dotazu do DB. Proxy sama osebe nikdy nie je autorizácia; requireUser()/requireRight() musí byť v každom handleri zvlášť.",
            "OPEN: src/proxy.ts has a dev-fallback SESSION_SECRET — it can mint a dev-JWT that passes the gate without any DB check. The proxy alone is never authorization; requireUser()/requireRight() must run in every handler separately."
          )
        },
        {
          t: 'list',
          title: L("Zálohy", "Backups"),
          items: [
            { title: L("mysqldump + restore-test", "mysqldump + restore test"), sub: L("reálny zálohový systém vetvy B, presný harmonogram je ukážkový", "real backup system on branch B, the exact schedule is illustrative"), badge: ['ok', L("Aktívne", "Active")], meta: "" },
            { title: L("Volume obrázkov produktov", "Product image volume"), sub: L("nie je pokrytý centrálnym zálohovým systémom aura_marketing", "not covered by the central aura_marketing backup system"), badge: ['cond', L("Overiť", "Verify")], meta: "" }
          ]
        },
        {
          t: 'list',
          title: L("Roly a práva", "Roles and permissions"),
          items: [
            { title: L("Admin", "Admin"), sub: L("ukážkový model rolí — plný rozsah", "sample role model — full scope"), badge: ['q', L("Ukážkové", "Sample")], meta: "" },
            { title: L("Editor", "Editor"), sub: L("ukážkový model rolí — bez nastavení", "sample role model — no settings"), badge: ['q', L("Ukážkové", "Sample")], meta: "" },
            { title: L("Prehliadač", "Viewer"), sub: L("ukážkový model rolí — len na čítanie", "sample role model — read only"), badge: ['q', L("Ukážkové", "Sample")], meta: "" }
          ]
        }
      ]
    }
  ]
};

const APP_HUB = {
  key: 'hub',
  name: 'Aura Hub',
  port: '3050',
  icon: 'home',
  tag: L(
    "Rozcestník rodiny Aura — bez vlastnej databázy, dopytuje appky cez /api/summary a kešuje 30 s.",
    "The Aura family's hub — no database of its own, queries the apps via /api/summary and caches for 30s."
  ),
  feat: [
    L(
      "Tri pravidlá: nikdy nezobraz číslo, ktorému neveríš; jedna appka nesmie zhodiť stránku; hub nesmie zaťažovať appky.",
      "Three rules: never show a number you don't trust; one app must not crash the page; the hub must not burden the apps."
    ),
    L(
      "Node 22 alpine + Express 4, bez databázy — čísla patria appkám, hub nič nevlastní.",
      "Node 22 alpine + Express 4, no database of its own — the numbers belong to the apps, the hub owns none."
    ),
    L(
      "Loopback-only (127.0.0.1:3050) + noindex; pred akýmkoľvek tunelovaním treba pridať auth.",
      "Loopback-only (127.0.0.1:3050) + noindex; auth must be added before any tunneling."
    )
  ],
  screens: [
    {
      key: 'prehlad',
      icon: 'grid',
      title: L("Prehľad", "Overview"),
      sub: L(
        "6 kariet appiek s live metrikou, sparkline a attention pásom.",
        "6 app cards with a live metric, sparkline and an attention strip."
      ),
      blocks: [
        {
          t: 'note',
          text: L(
            "Tri pravidlá hubu: (1) nikdy nezobraz číslo, ktorému neveríš, (2) jedna appka nesmie zhodiť stránku, (3) hub nesmie zaťažovať appky.",
            "The hub's three rules: (1) never show a number you don't trust, (2) one app must not crash the page, (3) the hub must not burden the apps."
          )
        },
        {
          t: 'cards',
          n: 3,
          items: [
            {
              title: "Aura KPI",
              sub: L("Živé dáta cez /api/summary.", "Live data via /api/summary."),
              badge: ['ok', L("Pripojené", "Connected")],
              lines: [[L("Port", "Port"), "3030"], [L("Posledný commit", "Last commit"), "8003483"]],
              chips: [L("live", "live")]
            },
            {
              title: L("Aura Logistika", "Aura Logistics"),
              sub: L("Živé dáta cez /api/summary.", "Live data via /api/summary."),
              badge: ['ok', L("Pripojené", "Connected")],
              lines: [[L("Port", "Port"), "3020"], [L("Posledný commit", "Last commit"), "0ffec3d"]],
              chips: [L("live", "live")]
            },
            {
              title: L("Aura Roadmap", "Aura Roadmap"),
              sub: L("Endpoint chýba — WIP na feat/suite-visuals.", "Endpoint missing — WIP on feat/suite-visuals."),
              badge: ['no', L("Bez API", "No API")],
              lines: [[L("Port", "Port"), "3040"], [L("Dôvod", "Reason"), L("5 súborov necommitnutých", "5 uncommitted files")]],
              chips: [L("dôvod, nie číslo", "reason, not a number")]
            },
            {
              title: "sperky-ai",
              sub: L("Endpoint chýba — WIP na feat/suite-visuals.", "Endpoint missing — WIP on feat/suite-visuals."),
              badge: ['no', L("Bez API", "No API")],
              lines: [[L("Port", "Port"), "3000"], [L("Dôvod", "Reason"), L("3 súbory necommitnuté", "3 uncommitted files")]],
              chips: [L("dôvod, nie číslo", "reason, not a number")]
            },
            {
              title: L("Aura HR", "Aura HR"),
              sub: L("Endpoint nikdy neexistoval.", "Endpoint never existed."),
              badge: ['no', L("Bez API", "No API")],
              lines: [[L("Dôvod", "Reason"), L("nikdy neimplementované", "never implemented")]],
              chips: []
            },
            {
              title: L("Tržby", "Revenue"),
              sub: L("Appka zatiaľ neexistuje.", "The app does not exist yet."),
              badge: ['q', L("Plánované", "Planned")],
              lines: [[L("Plánovaný port", "Planned port"), "3060"]],
              chips: []
            }
          ]
        },
        {
          t: 'banner',
          tone: 'cond',
          text: L(
            "Karty bez endpointu zobrazujú dôvod nedostupnosti, nikdy staré ani zástupné číslo — pravidlo hubu č. 1.",
            "Cards without an endpoint show the reason, never a stale or placeholder number — hub rule #1."
          )
        },
        {
          t: 'note',
          text: L(
            "Live metriky a sparkline pre KPI a Logistiku sú tu ukážkové vizualizácie tejto špecifikácie, nie skutočné čísla stiahnuté z appiek.",
            "The live metrics and sparklines for KPI and Logistics shown here are sample visualizations for this spec, not real figures pulled from the apps."
          )
        }
      ]
    },
    {
      key: 'pripojenia',
      icon: 'swap',
      title: L("Pripojenia", "Connections"),
      sub: L(
        "Appky, porty, endpoint /api/summary, stav pripojenia, latencia, posledný sync.",
        "Apps, ports, the /api/summary endpoint, connection state, latency, last sync."
      ),
      blocks: [
        {
          t: 'table',
          title: L("Stav pripojenia appiek", "App connection status"),
          cols: [
            L("Appka", "App"), L("Port", "Port"), L("Endpoint", "Endpoint"),
            L("Stav", "Status"), L("Latencia", "Latency"), L("Posledný sync", "Last sync"),
            L("Dôvod nedostupnosti", "Unavailability reason")
          ],
          rows: [
            { c: ["Aura KPI", "3030", "/api/summary", ['ok', L("Pripojené", "Connected")], "~90 ms", "~12:41", L("—", "—")] },
            { c: [L("Aura Logistika", "Aura Logistics"), "3020", "/api/summary", ['ok', L("Pripojené", "Connected")], "~140 ms", "~12:41", L("—", "—")] },
            { c: [L("Aura Roadmap", "Aura Roadmap"), "3040", "/api/summary", ['no', L("Bez API", "No API")], "—", "—",
              L("Endpoint neimplementovaný, WIP na feat/suite-visuals (5 súborov vrátane env.ts a rateLimit.ts)", "Endpoint not implemented, WIP on feat/suite-visuals (5 files incl. env.ts and rateLimit.ts)") ] },
            { c: ["sperky-ai", "3000", "/api/summary", ['no', L("Bez API", "No API")], "—", "—",
              L("Endpoint neimplementovaný, WIP na feat/suite-visuals (3 súbory)", "Endpoint not implemented, WIP on feat/suite-visuals (3 files)") ] },
            { c: [L("Aura HR", "Aura HR"), L("—", "—"), "/api/summary", ['no', L("Bez API", "No API")], "—", "—",
              L("Endpoint nikdy neexistoval", "Endpoint never existed") ] },
            { c: [L("Tržby", "Revenue"), L("3060 (plán)", "3060 (planned)"), "/api/summary", ['q', L("Neexistuje", "Does not exist")], "—", "—",
              L("Appka ešte nebola postavená", "The app has not been built yet") ] }
          ],
          note: L(
            "Latencia a časy syncu sú ilustračné; skutočné hodnoty meria hub live pri každom dopyte.",
            "Latency and sync times are illustrative; the hub measures real values live on every request."
          )
        },
        {
          t: 'code',
          title: L("Kontrakt /api/summary (tvar reálny, hodnoty ukážkové)", "/api/summary contract (shape real, values illustrative)"),
          lang: 'json',
          text: "{\n  \"metrics\": [\n    { \"label_sk\": \"Plnenie\", \"label_en\": \"Fulfillment\", \"value\": 92, \"tone\": \"ok\" }\n  ],\n  \"spark\": [61, 64, 66, 70, 72, 75, 78, 80],\n  \"attention\": [\n    { \"label_sk\": \"3 objednávky po termíne\", \"label_en\": \"3 orders overdue\", \"severity\": \"cond\" }\n  ]\n}"
        },
        {
          t: 'note',
          text: L(
            "Hlavička X-Aura-Hub-Token (timing-safe compare); hub kešuje odpoveď 30 s a dopyt na appku má timeout 4 s. Chyby: 503 hub_token_not_configured, 401 unauthorized, 503 db_unavailable. Metriky 1–3, spark prázdny alebo 6–12 čísel, attention 0–3.",
            "Header X-Aura-Hub-Token (timing-safe compare); the hub caches the response for 30s and each app request times out at 4s. Errors: 503 hub_token_not_configured, 401 unauthorized, 503 db_unavailable. 1–3 metrics, spark empty or 6–12 numbers, 0–3 attention items."
          )
        }
      ]
    },
    {
      key: 'prevadzka',
      icon: 'shield',
      title: L("Prevádzka", "Operations"),
      sub: L(
        "Kontajnery a porty, health, zálohy podľa databázy a volume, expozícia — otvorené bezpečnostné body.",
        "Containers and ports, health, backups by database and volume, exposure — open security issues."
      ),
      blocks: [
        {
          t: 'table',
          title: L("Appky rodiny — kontajnery a porty", "Family apps — containers and ports"),
          cols: [L("Appka", "App"), L("Port", "Port"), L("Kontajner", "Container"), L("Stack", "Stack")],
          rows: [
            { c: ["sperky-ai", "3000", "sperky-ai-app-1", L("Next.js 16 + React 19 (vetva B)", "Next.js 16 + React 19 (branch B)")] },
            { c: [L("Aura Logistika", "Aura Logistics"), "3020", L("bez git repo", "no git repo"), L("Node + Express (vetva A)", "Node + Express (branch A)")] },
            { c: ["Aura KPI", "3030", "aura-kpi-app", L("Node + Express + MariaDB (vetva A)", "Node + Express + MariaDB (branch A)")] },
            { c: [L("Aura Roadmap", "Aura Roadmap"), "3040", "aura-roadmap-app", L("Next.js 16 + MariaDB (fork vetvy B)", "Next.js 16 + MariaDB (branch B fork)")] },
            { c: ["Aura Hub", "3050", "aura-hub-app", L("Node 22 + Express, bez DB", "Node 22 + Express, no DB")] },
            { c: ["AuraAI", "8082", L("—", "—"), L("refaktor Hadesa", "Hades refactor")] },
            { c: [L("Banner Studio", "Banner Studio"), "8091", "bannery-app", L("Node + Express + MariaDB (vetva A)", "Node + Express + MariaDB (branch A)")] },
            { c: [L("Retouch Studio", "Retouch Studio"), "8092", "retus-app", L("Node + Express + MariaDB (vetva A)", "Node + Express + MariaDB (branch A)")] }
          ],
          note: L(
            "Northstar V3 (pôvodná appka) beží nedotknuté ako archív na porte 3010, ads-hierarchy worktree na porte 3011.",
            "Northstar V3 (the original app) still runs untouched as an archive on port 3010, the ads-hierarchy worktree on port 3011."
          )
        },
        {
          t: 'banner',
          tone: 'no',
          text: L(
            "OTVORENÉ: aura-kpi má fallback ADMIN_PASSWORD priamo v kóde; aura-banner-studio beží verejne cez ngrok so zdieľaným heslom s fallbackom a bez rate-limitu; sperky-ai/src/proxy.ts má dev-fallback SESSION_SECRET, ktorým sa dá vyrobiť dev-JWT bez overenia voči DB. (Konkrétne hodnoty sú zámerne mimo tohto náhľadu.)",
            "OPEN: aura-kpi has a fallback ADMIN_PASSWORD directly in code; aura-banner-studio runs publicly over ngrok with a single shared password fallback and no rate limit; sperky-ai/src/proxy.ts has a dev-fallback SESSION_SECRET that can mint a dev-JWT without any DB check. (The literal values are deliberately kept out of this preview.)"
          )
        },
        {
          t: 'banner',
          tone: 'cond',
          text: L(
            "Ngrok tunely rodiny nemajú basic auth ani IP restrikciu — jediná brána je login appky. Aura Logistika nemá git repo vôbec; aura-kpi si hardcoduje jej názvy stĺpcov, takže nesledovaná zmena v Logistike tichým spôsobom rozbije integráciu.",
            "The family's ngrok tunnels have no basic auth or IP restriction — the app's own login is the only gate. Aura Logistika has no git repo at all; aura-kpi hardcodes its column names, so an untracked change in Logistics silently breaks the integration."
          )
        },
        {
          t: 'list',
          title: L("Zálohy podľa databázy a volume", "Backups by database and volume"),
          items: [
            { title: "aura_marketing", sub: L("Jediná appková DB v rodine, ktorá má nightly zálohu.", "The only app DB in the family with a nightly backup."), badge: ['ok', L("Zálohované", "Backed up")], meta: "" },
            { title: L("bannery-db + volume obrázkov", "bannery-db + image volume"), sub: L("Bez zálohy vôbec.", "No backup at all."), badge: ['no', L("Nezálohované", "Not backed up")], meta: "" },
            { title: L("aura_kpi / aura_roadmap / aura_hub", "aura_kpi / aura_roadmap / aura_hub"), sub: L("Mimo centrálneho zálohového systému aura_marketing; Roadmap má vlastný mysqldump s restore-testom.", "Outside the central aura_marketing backup system; Roadmap has its own mysqldump with a restore test."), badge: ['cond', L("Čiastočne", "Partial")], meta: "" }
          ]
        },
        {
          t: 'table',
          title: L("Expozícia", "Exposure"),
          cols: [L("Appka", "App"), L("Spôsob prístupu", "Access method"), L("Stav zabezpečenia", "Security state")],
          rows: [
            { c: ["Aura Hub", L("loopback-only 127.0.0.1:3050 + noindex", "loopback-only 127.0.0.1:3050 + noindex"),
              ['cond', L("Bez vlastného loginu — pred tunelovaním treba pridať auth", "No login of its own — auth must be added before tunneling")] ] },
            { c: [L("sperky-ai / marketing", "sperky-ai / marketing"), "ngrok",
              ['cond', L("Appkový login, tunel bez basic auth", "App login, tunnel has no basic auth")] ] },
            { c: [L("Banner Studio", "Banner Studio"), "ngrok",
              ['no', L("Zdieľané heslo s fallbackom, bez rate-limitu", "Shared password with a fallback, no rate limit")] ] },
            { c: ["AuraAI", L("Cloudflare quick tunnel", "Cloudflare quick tunnel"),
              ['cond', L("Basic auth cez Caddy, URL sa mení pri reštarte", "Basic auth via Caddy, URL changes on restart")] ] }
          ],
          note: L(
            "Zálohy pokrývajú len databázu aura_marketing; ostatné DB a volumy sú otvorené body, nie vyriešené stavy.",
            "Backups cover only the aura_marketing database; the other DBs and volumes are open issues, not resolved states."
          )
        }
      ]
    }
  ]
};

const W4_APPS = [ APP_SHOP, APP_HUB ];
