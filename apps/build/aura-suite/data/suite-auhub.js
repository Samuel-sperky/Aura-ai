/* Aura Hub — dátová špecifikácia pre apps/aura-suite/.
   Konvencie: L(sk,en), cur(n), int(n), pc(n) sú globálne (dodáva engine).
   Fakty overené v pamäti Aura AI (Hades) sú v texte označené "overené" a nesú
   konkrétnu hodnotu (port, commit, dátum). Všetko ostatné (latencie, časy syncu,
   konkrétne alerty, audit riadky) je ukážkové a je to v note/popise napísané —
   pravidlo projektu "neznáme výsledky sa nevymýšľajú". */

const APP_AUHUB = {
  key: 'auhub',
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
  live: {
    v: L("2/6 appiek živých · 4 bez API", "2/6 apps live · 4 without an API"),
    tone: 'cond',
    spark: [2, 2, 2, 2, 2, 2, 2, 2]
  },

  /* Hub sa správa ako klient — dopytuje /api/summary appiek rodiny. Latencie a
     sync časy sú ukážkové, appky a ich stav pripojenia sú overené. */
  api: {
    endpoints: [
      { k: 'kpi', l: L("Aura KPI /api/summary", "Aura KPI /api/summary"), ms: 90 },
      { k: 'logistika', l: L("Aura Logistika /api/summary", "Aura Logistics /api/summary"), ms: 140 },
      { k: 'roadmap', l: L("Aura Roadmap /api/summary", "Aura Roadmap /api/summary"), ms: null },
      { k: 'shop', l: L("sperky-ai /api/summary", "sperky-ai /api/summary"), ms: null }
    ],
    sync: L("pred 1 min", "1 min ago"),
    tone: 'cond'
  },

  rep: {
    templates: [
      { k: 'dostupnost', l: L("Report dostupnosti", "Availability report"), s: L("Uptime, p50/p95 latencia appiek za 12 intervalov", "Uptime, app p50/p95 latency over 12 intervals") },
      { k: 'bezpecnost', l: L("Report bezpečnostných bodov", "Security issues report"), s: L("Register otvorených bodov naprieč rodinou, bez konkrétnych hodnôt tajomstiev", "Family-wide open-issues register, without literal secret values") }
    ]
  },

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
      ],
      ai: [
        {
          q: L("Koľko appiek je práve pripojených živo?", "How many apps are currently connected live?"),
          a: L(
            "2 zo 6 — Aura KPI (port 3030, posledný commit 8003483) a Aura Logistika (port 3020, commit 0ffec3d). Ostatné 4 karty zobrazujú dôvod, nie číslo.",
            "2 of 6 — Aura KPI (port 3030, last commit 8003483) and Aura Logistics (port 3020, commit 0ffec3d). The other 4 cards show a reason, not a number."
          ),
          cite: 'appka',
          act: { l: L("Otvoriť Pripojenia", "Open Connections"), k: 'open' }
        },
        {
          q: L("Prečo Roadmap a sperky-ai nemajú živé dáta?", "Why do Roadmap and sperky-ai have no live data?"),
          a: L(
            "Obe majú endpoint /api/summary rozpracovaný na branchi feat/suite-visuals — Roadmap 5 necommitnutých súborov, sperky-ai 3. Kým nie je zlúčené, karta korektne hlási dôvod namiesto čísla.",
            "Both have the /api/summary endpoint stalled on branch feat/suite-visuals — Roadmap has 5 uncommitted files, sperky-ai has 3. Until merged, the card correctly shows a reason instead of a number."
          ),
          cite: 'pamäť',
          act: null
        },
        {
          q: L("Existuje appka Tržby?", "Does the Revenue app exist?"),
          a: L(
            "Nie, zatiaľ nebola postavená. Je len naplánovaná na port 3060, preto karta ukazuje badge Plánované, nie chybu pripojenia.",
            "No, it hasn't been built yet. It's only planned for port 3060, so the card shows a Planned badge, not a connection error."
          ),
          cite: 'pamäť',
          act: null
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
            "Hlavička X-Aura-Hub-Token (timing-safe compare); hub kešuje odpoveď 30 s a dopyt na appku má timeout 4 s. Chyby: 503 hub_token_not_configured, 401 unauthorized, 503 db_unavailable. Metriky 1–3, spark prázdny alebo 6–12 čísel, attention 0–3. Podrobný rozpis polí je na obrazovke Kontrakt.",
            "Header X-Aura-Hub-Token (timing-safe compare); the hub caches the response for 30s and each app request times out at 4s. Errors: 503 hub_token_not_configured, 401 unauthorized, 503 db_unavailable. 1–3 metrics, spark empty or 6–12 numbers, 0–3 attention items. Full field breakdown is on the Contract screen."
          )
        }
      ],
      ai: [
        {
          q: L("Ktoré appky sú momentálne pripojené?", "Which apps are currently connected?"),
          a: L(
            "Aura KPI na porte 3030 (~90 ms) a Aura Logistika na porte 3020 (~140 ms) — obe majú stav Pripojené. Roadmap, sperky-ai, HR a Tržby sú bez API.",
            "Aura KPI on port 3030 (~90 ms) and Aura Logistics on port 3020 (~140 ms) — both show Connected. Roadmap, sperky-ai, HR and Revenue have no API."
          ),
          cite: 'appka',
          act: { l: L("Filtrovať pripojené", "Filter connected"), k: 'filter' }
        },
        {
          q: L("Aká je hlavička pre autentifikáciu appiek?", "What header authenticates the apps?"),
          a: L(
            "X-Aura-Hub-Token, porovnávaný timing-safe metódou. Chýbajúca konfigurácia na strane appky vráti 503 hub_token_not_configured, zlý token 401 unauthorized.",
            "X-Aura-Hub-Token, compared with a timing-safe method. Missing configuration on the app side returns 503 hub_token_not_configured, a wrong token returns 401 unauthorized."
          ),
          cite: 'pamäť',
          act: { l: L("Otvoriť Kontrakt", "Open Contract"), k: 'open' }
        },
        {
          q: L("Prečo Roadmap nemá latenciu ani sync čas?", "Why does Roadmap show no latency or sync time?"),
          a: L(
            "Lebo endpoint /api/summary v nej ešte neexistuje — hub sa naň ani nedopytuje, takže tabuľka korektne ukazuje pomlčky namiesto vymyslených čísel.",
            "Because the /api/summary endpoint doesn't exist there yet — the hub doesn't even query it, so the table correctly shows dashes instead of made-up numbers."
          ),
          cite: 'pamäť',
          act: null
        }
      ]
    },
    {
      key: 'kontrakt',
      icon: 'book',
      title: L("Kontrakt", "Contract"),
      sub: L(
        "Polia kontraktu /api/summary, validácia, chybové kódy a príklady odpovedí.",
        "Fields of the /api/summary contract, validation, error codes and example responses."
      ),
      blocks: [
        {
          t: 'kpis',
          items: [
            { l: L("Keš odpovede", "Response cache"), v: "30 s", sub: L("zdieľaný medzi súbežnými čitateľmi", "shared across concurrent readers"), tone: 'ok' },
            { l: L("Timeout na appku", "Per-app timeout"), v: "4 s", sub: L("appka nestihne = karta degraduje, stránka nespadne", "app misses it = card degrades, page doesn't crash"), tone: 'ok' },
            { l: L("Metriky", "Metrics"), v: "1–3", sub: L("value vždy číslo, tone ok|cond|no|neutral", "value always a number, tone ok|cond|no|neutral"), tone: null },
            { l: L("Spark / attention", "Spark / attention"), v: L("prázdne alebo 6–12 / 0–3", "empty or 6–12 / 0–3"), sub: L("attention severity len no|cond", "attention severity only no|cond"), tone: null }
          ]
        },
        {
          t: 'table',
          title: L("Polia kontraktu", "Contract fields"),
          cols: [L("Pole", "Field"), L("Typ", "Type"), L("Povinné", "Required"), L("Popis", "Description")],
          rows: [
            { c: ["metrics", L("pole objektov, 1–3", "array of objects, 1–3"), ['ok', L("Áno", "Yes")], L("hlavné čísla appky pre kartu hubu", "the app's headline numbers for the hub card")] },
            { c: ["metrics[].label_sk", "string", ['ok', L("Áno", "Yes")], L("popisok metriky v slovenčine", "metric label in Slovak")] },
            { c: ["metrics[].label_en", "string", ['ok', L("Áno", "Yes")], L("popisok metriky v angličtine", "metric label in English")] },
            { c: ["metrics[].value", "number", ['ok', L("Áno", "Yes")], L("hodnota — vždy číslo, nikdy reťazec ani null", "value — always a number, never a string or null")] },
            { c: ["metrics[].tone", L("enum: ok|cond|no|neutral", "enum: ok|cond|no|neutral"), ['ok', L("Áno", "Yes")], L("farebný tón karty pre túto metriku", "the card's color tone for this metric")] },
            { c: ["spark", L("pole čísel, prázdne alebo 6–12", "array of numbers, empty or 6–12"), ['cond', L("Voliteľné", "Optional")], L("sparkline trend; menej než 6 alebo viac než 12 sa zamietne", "sparkline trend; fewer than 6 or more than 12 is rejected")] },
            { c: ["attention", L("pole objektov, 0–3", "array of objects, 0–3"), ['cond', L("Voliteľné", "Optional")], L("položky attention pásu na Prehľade", "attention-strip items on Overview")] },
            { c: ["attention[].label_sk / label_en", "string", ['ok', L("Áno, ak attention[i] existuje", "Yes, if attention[i] exists")], L("text upozornenia dvojjazyčne", "warning text, bilingual")] },
            { c: ["attention[].severity", L("enum: no|cond", "enum: no|cond"), ['ok', L("Áno, ak attention[i] existuje", "Yes, if attention[i] exists")], L("len dve úrovne — attention nemá ok", "only two levels — attention has no ok")] }
          ],
          note: L("Tvar je reálny (server/src/contract.js), hodnoty v príkladoch sú ukážkové.", "The shape is real (server/src/contract.js), the values in the examples are illustrative.")
        },
        {
          t: 'table',
          title: L("Chybové kódy", "Error codes"),
          cols: [L("HTTP", "HTTP"), L("Kód", "Code"), L("Kedy nastane", "When it happens"), L("Čo vidí hub", "What the hub sees")],
          rows: [
            { c: ["503", "hub_token_not_configured", L("appka nemá nastavený zdieľaný token", "the app has no shared token configured"), L("karta zobrazí dôvod, nie staré číslo", "card shows the reason, not a stale number")] },
            { c: ["401", "unauthorized", L("hlavička X-Aura-Hub-Token chýba alebo nesedí", "the X-Aura-Hub-Token header is missing or wrong"), L("karta zobrazí dôvod, hub log zaznamená pokus", "card shows the reason, hub log records the attempt")] },
            { c: ["503", "db_unavailable", L("appka má DB, ale tá práve neodpovedá", "the app has a DB but it's not responding right now"), L("karta zobrazí dôvod, keš sa nepíše", "card shows the reason, cache is not written")] },
            { c: [L("žiadny (timeout)", "none (timeout)"), L("interné: request_timeout", "internal: request_timeout"), L("appka neodpovie do 4 s", "the app doesn't respond within 4s"), L("karta zobrazí dôvod, ostatné karty nie sú ovplyvnené", "card shows the reason, other cards are unaffected")] }
          ],
          note: L("Kódy sú overené z pamäte Aura AI (architektúra hubu, 3.8.2026).", "Codes are verified from Aura AI memory (hub architecture, 3.8.2026).")
        },
        {
          t: 'code',
          title: L("Príklad — appka bez konfigurovaného tokenu", "Example — app with no token configured"),
          lang: 'json',
          text: "HTTP/1.1 503 Service Unavailable\n{\n  \"error\": \"hub_token_not_configured\"\n}"
        },
        {
          t: 'note',
          text: L(
            "Validácia payloadu beží na strane hubu proti tomuto kontraktu ešte pred zápisom do keše — neplatný tvar sa zahodí rovnako ako výpadok appky, karta zobrazí dôvod.",
            "Payload validation runs on the hub side against this contract before it's written to the cache — an invalid shape is dropped the same way as an app outage, the card shows the reason."
          )
        }
      ],
      ai: [
        {
          q: L("Koľko metrík môže appka poslať naraz?", "How many metrics can an app send at once?"),
          a: L(
            "1 až 3. Každá musí mať label_sk, label_en, číselnú value a tone jedno z ok|cond|no|neutral — inak validácia payload zahodí.",
            "1 to 3. Each must have label_sk, label_en, a numeric value and a tone of ok|cond|no|neutral — otherwise validation drops the payload."
          ),
          cite: 'appka',
          act: null
        },
        {
          q: L("Aký je rozdiel medzi 401 a 503 hub_token_not_configured?", "What's the difference between 401 and 503 hub_token_not_configured?"),
          a: L(
            "503 hub_token_not_configured znamená, že appka vôbec nemá nastavený zdieľaný token na svojej strane. 401 unauthorized znamená, že token má, ale hlavička od hubu naň nesedí.",
            "503 hub_token_not_configured means the app has no shared token configured on its side at all. 401 unauthorized means it has one, but the header from the hub doesn't match it."
          ),
          cite: 'pamäť',
          act: { l: L("Otvoriť tabuľku chybových kódov", "Open error code table"), k: 'open' }
        },
        {
          q: L("Môže attention obsahovať tón ok?", "Can attention include an ok tone?"),
          a: L(
            "Nie — severity attention položiek má len dve hodnoty, no a cond. Zdravý stav sa v attention páse jednoducho nezobrazuje, tam patria len upozornenia.",
            "No — attention item severity has only two values, no and cond. A healthy state simply isn't shown in the attention strip, only warnings belong there."
          ),
          cite: 'pamäť',
          act: null
        }
      ]
    },
    {
      key: 'alerty',
      icon: 'bell',
      title: L("Alerty", "Alerts"),
      sub: L(
        "Cross-app pás upozornení zo všetkých appiek rodiny na jednom mieste.",
        "A cross-app alert strip from all the family's apps in one place."
      ),
      blocks: [
        {
          t: 'kpis',
          items: [
            { l: L("Kritické (no)", "Critical (no)"), v: int(9), sub: L("naprieč rodinou", "family-wide"), tone: 'no' },
            { l: L("Na zváženie (cond)", "To review (cond)"), v: int(10), sub: L("naprieč rodinou", "family-wide"), tone: 'cond' },
            { l: L("Informačné / plán", "Informational / planned"), v: int(3), sub: L("bez akcie", "no action needed"), tone: null },
            { l: L("Zdroj: pamäť Aura AI", "Source: Aura AI memory"), v: int(14), sub: L("z 22 riadkov je overených", "of 22 rows are verified"), tone: 'ok' }
          ]
        },
        {
          t: 'table',
          title: L("Cross-app alerty", "Cross-app alerts"),
          cols: [L("Appka", "App"), L("Alert", "Alert"), L("Závažnosť", "Severity"), L("Zdroj", "Source"), L("Kedy", "When")],
          rows: [
            { c: [L("Aura Roadmap", "Aura Roadmap"), L("Endpoint /api/summary chýba — WIP na feat/suite-visuals, 5 súborov", "The /api/summary endpoint is missing — WIP on feat/suite-visuals, 5 files"), ['no', L("Kritický", "Critical")], L("Hades pamäť, 3.8.2026", "Hades memory, 8/3/2026"), L("trvá", "ongoing")] },
            { c: ["sperky-ai", L("Endpoint /api/summary chýba — WIP na feat/suite-visuals, 3 súbory", "The /api/summary endpoint is missing — WIP on feat/suite-visuals, 3 files"), ['no', L("Kritický", "Critical")], L("Hades pamäť, 3.8.2026", "Hades memory, 8/3/2026"), L("trvá", "ongoing")] },
            { c: ["sperky-ai", L("dev-fallback SESSION_SECRET v src/proxy.ts — proxy sama osebe nikdy nie je autorizácia", "dev-fallback SESSION_SECRET in src/proxy.ts — the proxy alone is never authorization"), ['no', L("Kritický", "Critical")], L("recon 28.7.2026", "recon 7/28/2026"), L("otvorené", "open")] },
            { c: [L("Aura Banner Studio", "Aura Banner Studio"), L("Zdieľané heslo s fallbackom, verejne cez ngrok bez rate-limitu", "Single shared password with a fallback, public over ngrok with no rate limit"), ['no', L("Kritický", "Critical")], L("recon 28.7.2026", "recon 7/28/2026"), L("otvorené", "open")] },
            { c: ["AuraAI", L("bcrypt hash tunelového hesla je git-trackovaný v Caddyfile", "The tunnel password's bcrypt hash is git-tracked in the Caddyfile"), ['no', L("Kritický", "Critical")], L("Hades pamäť, 4.8.2026", "Hades memory, 8/4/2026"), L("otvorené", "open")] },
            { c: [L("bannery-db + volume obrázkov", "bannery-db + image volume"), L("Bez zálohy vôbec", "No backup at all"), ['no', L("Kritický", "Critical")], L("audit záloh", "backup audit"), L("trvá", "ongoing")] },
            { c: [L("Ngrok tunely rodiny", "Family ngrok tunnels"), L("Bez basic auth aj bez IP restrikcie, jediná brána je login appky", "No basic auth or IP restriction, the app's own login is the only gate"), ['no', L("Kritický", "Critical")], L("recon 28.7.2026", "recon 7/28/2026"), L("otvorené", "open")] },
            { c: [L("Aura Hub", "Aura Hub"), L("Nemá vlastné prihlásenie — pred tunelovaním treba pridať auth", "Has no login of its own — auth must be added before tunneling"), ['no', L("Kritický", "Critical")], L("Hades pamäť, 3.8.2026", "Hades memory, 8/3/2026"), L("otvorené", "open")] },
            { c: [L("Aura KPI", "Aura KPI"), L("3 oddelenia po termíne mesačnej uzávierky", "3 departments overdue on the monthly close"), ['no', L("Kritický", "Critical")], L("ukážka", "sample"), L("pred 2 h", "2h ago")] },
            { c: [L("Aura Logistika", "Aura Logistics"), L("Zásielka SP-20260701 zdržaná nad 48 h", "Shipment SP-20260701 delayed over 48h"), ['no', L("Kritický", "Critical")], L("ukážka", "sample"), L("pred 5 h", "5h ago")] },
            { c: [L("Aura Logistika", "Aura Logistics"), L("Nemá git repo — žiadna história zmien ani rollback", "Has no git repo — no change history or rollback"), ['cond', L("Na zváženie", "To review")], L("recon 28.7.2026", "recon 7/28/2026"), L("trvá", "ongoing")] },
            { c: [L("Aura KPI", "Aura KPI"), L("Hardcoduje názvy stĺpcov Logistiky — krehká integrácia", "Hardcodes Logistics column names — fragile integration"), ['cond', L("Na zváženie", "To review")], L("recon 28.7.2026", "recon 7/28/2026"), L("trvá", "ongoing")] },
            { c: [L("aura_kpi / aura_roadmap / aura_hub", "aura_kpi / aura_roadmap / aura_hub"), L("Mimo centrálneho zálohového systému aura_marketing", "Outside the central aura_marketing backup system"), ['cond', L("Na zváženie", "To review")], L("audit záloh", "backup audit"), L("trvá", "ongoing")] },
            { c: [L("Aura Roadmap", "Aura Roadmap"), L("GitHub remote chýba — gh nie je v prostredí nainštalované", "GitHub remote is missing — gh is not installed in the environment"), ['cond', L("Na zváženie", "To review")], L("Hades pamäť, 29.7.2026", "Hades memory, 7/29/2026"), L("otvorené", "open")] },
            { c: ["AuraAI", L("Cloudflare quick tunnel URL sa mení pri každom reštarte", "Cloudflare quick tunnel URL changes on every restart"), ['cond', L("Na zváženie", "To review")], L("Hades pamäť, 4.8.2026", "Hades memory, 8/4/2026"), L("známe", "known")] },
            { c: [L("Docker Compose", "Docker Compose"), L("Riziko service-name alias collision pri zdieľaných sieťach", "Service-name alias collision risk on shared networks"), ['cond', L("Na zváženie", "To review")], L("skill pamäť", "skill memory"), L("známe", "known")] },
            { c: [L("Aura Hub", "Aura Hub"), L("Cache hit-rate 30 s okna klesol pod 70 %", "The 30s cache hit rate dropped below 70%"), ['cond', L("Na zváženie", "To review")], L("ukážka", "sample"), L("pred 40 min", "40 min ago")] },
            { c: [L("Aura Logistika", "Aura Logistics"), L("Latencia /api/summary ~140 ms — nad priemerom rodiny", "/api/summary latency ~140ms — above the family average"), ['cond', L("Na zváženie", "To review")], L("ukážka", "sample"), L("pred 12 min", "12 min ago")] },
            { c: [L("Aura KPI", "Aura KPI"), L("Hospodársky modul viditeľný len Admin + manažment — prístup overiť po zmene rolí", "Finance module visible only to Admin + management — verify access after role changes"), ['cond', L("Na zváženie", "To review")], L("ukážka", "sample"), L("pred 1 d", "1d ago")] },
            { c: [L("Aura KPI", "Aura KPI"), L("Historický ADMIN_PASSWORD fallback odstránený", "Historical ADMIN_PASSWORD fallback removed"), ['ok', L("Vyriešené", "Resolved")], L("commit 6169eb0", "commit 6169eb0"), L("28.7.2026", "7/28/2026")] },
            { c: [L("Aura HR", "Aura HR"), L("Endpoint nikdy neexistoval", "Endpoint never existed"), ['q', L("Info", "Info")], L("Hades pamäť", "Hades memory"), L("trvalé", "permanent")] },
            { c: [L("Tržby", "Revenue"), L("Appka ešte nebola postavená", "The app has not been built yet"), ['q', L("Info", "Info")], L("Hades pamäť", "Hades memory"), L("plán", "planned")] },
            { c: [L("Aura Suite plán", "Aura Suite plan"), L("Centrálny audit v hube je len naplánovaný (F3), zatiaľ neimplementovaný", "Central audit in the hub is only planned (F3), not implemented yet"), ['q', L("Info", "Info")], L("Hades pamäť, 3.8.2026", "Hades memory, 8/3/2026"), L("plán", "planned")] }
          ],
          note: L(
            "Stĺpec Zdroj rozlišuje overené fakty z pamäte Aura AI (dátum/commit) od riadkov označených „ukážka“ — tie posledné simulujú, ako by attention pás vyzeral pri plnej prevádzke appiek, ktoré ešte nemajú endpoint.",
            "The Source column distinguishes verified facts from Aura AI memory (date/commit) from rows marked \"sample\" — the latter simulate what the attention strip would look like once apps without an endpoint yet go live."
          )
        },
        {
          t: 'banner',
          tone: 'no',
          text: L(
            "9 kritických položiek je momentálne otvorených naprieč rodinou — 5 z nich sú bezpečnostné body (proxy fallback, Banner Studio heslo, ngrok, Caddyfile hash, chýbajúci login hubu), nie prevádzkové drobnosti.",
            "9 critical items are currently open across the family — 5 of them are security issues (proxy fallback, Banner Studio password, ngrok, Caddyfile hash, missing hub login), not minor operational items."
          )
        }
      ],
      ai: [
        {
          q: L("Koľko kritických alertov je otvorených?", "How many critical alerts are open?"),
          a: L(
            "9 s tónom no, z toho 5 sú bezpečnostné (proxy fallback, Banner Studio, ngrok bez auth, Caddyfile hash, chýbajúci login hubu) a zvyšné sú chýbajúce endpointy a záloha.",
            "9 with a no tone, of which 5 are security-related (proxy fallback, Banner Studio, ngrok without auth, Caddyfile hash, missing hub login) and the rest are missing endpoints and backups."
          ),
          cite: 'appka',
          act: { l: L("Filtrovať kritické", "Filter critical"), k: 'filter' }
        },
        {
          q: L("Ktoré riadky sú overené a ktoré ukážkové?", "Which rows are verified and which are illustrative?"),
          a: L(
            "14 z 22 riadkov má v stĺpci Zdroj konkrétny dátum, commit alebo recon — to sú overené fakty z pamäte Aura AI. Riadky so slovom „ukážka“ (napr. zdržaná zásielka, cache hit-rate) simulujú budúcu prevádzku.",
            "14 of 22 rows have a concrete date, commit or recon note in the Source column — those are verified facts from Aura AI memory. Rows marked \"sample\" (e.g. delayed shipment, cache hit rate) simulate future operation."
          ),
          cite: 'pamäť',
          act: null
        },
        {
          q: L("Je centrálny audit v hube už hotový?", "Is central audit in the hub already built?"),
          a: L(
            "Nie, je to len naplánovaná časť Aura Suite plánu F3 (ingest endpoint pre doménové udalosti appiek) — v tomto náhľade je preto v alertoch označený ako info/plán, nie ako funkčná vlastnosť.",
            "No, it's only a planned part of the Aura Suite F3 plan (an ingest endpoint for apps' domain events) — in this preview it's therefore marked info/planned in alerts, not as a working feature."
          ),
          cite: 'pamäť',
          act: null
        }
      ]
    },
    {
      key: 'health',
      icon: 'bolt',
      title: L("Health", "Health"),
      sub: L(
        "Dostupnosť appiek za posledných 12 ISO týždňov, p50/p95 latencia dopytov hubu.",
        "App availability over the last 12 ISO weeks, hub request p50/p95 latency."
      ),
      blocks: [
        {
          t: 'kpis',
          items: [
            { l: L("Priemerná dostupnosť (pripojené appky)", "Average availability (connected apps)"), v: "97,8 %", sub: L("KPI + Logistika, ukážkové", "KPI + Logistics, sample"), tone: 'ok' },
            { l: L("p50 latencia", "p50 latency"), v: "95 ms", sub: L("dopyt hubu na appku, ukážkové", "hub-to-app request, sample"), tone: 'ok' },
            { l: L("p95 latencia", "p95 latency"), v: "410 ms", sub: L("ukážkové, spôsobuje timeout blízko 4 s výnimočne", "sample, occasionally nears the 4s timeout"), tone: 'cond' },
            { l: L("Výpadky za 12 týždňov", "Outages over 12 weeks"), v: int(3), sub: L("ukážkové, appky bez API sa nepočítajú (nemajú čo merať)", "sample, apps without an API aren't counted (nothing to measure)"), tone: 'cond' }
          ]
        },
        {
          t: 'lines',
          title: L("Dostupnosť appiek — 12 ISO týždňov", "App availability — 12 ISO weeks"),
          labels: [
            L("T21", "W21"), L("T22", "W22"), L("T23", "W23"), L("T24", "W24"),
            L("T25", "W25"), L("T26", "W26"), L("T27", "W27"), L("T28", "W28"),
            L("T29", "W29"), L("T30", "W30"), L("T31", "W31"), L("T32", "W32")
          ],
          series: [
            { l: "Aura KPI", v: [99, 100, 98, 100, 97, 99, 100, 96, 99, 100, 98, 99], color: 'var(--good)' },
            { l: L("Aura Logistika", "Aura Logistics"), v: [96, 97, 95, 98, 94, 97, 96, 92, 97, 96, 95, 97], color: 'var(--acc)' }
          ],
          avg: true,
          note: L(
            "Ukážkový trend dostupnosti v %. Roadmap a sperky-ai chýbajú v grafe — bez endpointu nemá hub čo merať, nie preto, že by boli na 0 %.",
            "Sample availability trend in %. Roadmap and sperky-ai are missing from the chart — with no endpoint the hub has nothing to measure, not because they are at 0%."
          )
        },
        {
          t: 'heat',
          title: L("Plnenie dostupnosti podľa appky a týždňa", "Availability fulfillment by app and week"),
          cols: [
            "T21", "T22", "T23", "T24", "T25", "T26", "T27", "T28", "T29", "T30", "T31", "T32"
          ],
          rows: [
            { l: "Aura KPI", v: [99, 100, 98, 100, 97, 99, 100, 96, 99, 100, 98, 99] },
            { l: L("Aura Logistika", "Aura Logistics"), v: [96, 97, 95, 98, 94, 97, 96, 92, 97, 96, 95, 97] },
            { l: L("Aura Roadmap", "Aura Roadmap"), v: [null, null, null, null, null, null, null, null, null, null, null, null] },
            { l: "sperky-ai", v: [null, null, null, null, null, null, null, null, null, null, null, null] }
          ],
          note: L(
            "null = appka v danom týždni nemala endpoint /api/summary, nie výpadok s hodnotou 0. Farby a čísla sú ukážkové.",
            "null = the app had no /api/summary endpoint that week, not an outage with a value of 0. Colors and numbers are illustrative."
          )
        },
        {
          t: 'note',
          text: L(
            "Health obrazovka meria len appky, ktoré hubu odpovedajú — je to dôsledok pravidla č. 3 (hub nesmie zaťažovať appky): nikdy sa neopakuje dopyt na appku, ktorá endpoint nemá.",
            "The Health screen only measures apps that respond to the hub — a consequence of rule #3 (the hub must not burden the apps): it never retries a request against an app that has no endpoint."
          )
        }
      ],
      ai: [
        {
          q: L("Ktorá appka má vyššiu dostupnosť, KPI alebo Logistika?", "Which app has higher availability, KPI or Logistics?"),
          a: L(
            "Aura KPI, s priemerom bližšie k 99 % oproti Logistike okolo 96 % v ukážkovom 12-týždňovom trende. Obe čísla sú ilustračné, nie namerané.",
            "Aura KPI, averaging closer to 99% versus Logistics around 96% in the sample 12-week trend. Both figures are illustrative, not measured."
          ),
          cite: 'ukážka',
          act: null
        },
        {
          q: L("Prečo Roadmap a sperky-ai nemajú v heat mape žiadne farby?", "Why does Roadmap and sperky-ai have no colors in the heat map?"),
          a: L(
            "Lebo hodnota je null, nie nula — appky v danom období nemali endpoint /api/summary, takže hub nemá čo merať. Nula by nesprávne vyzerala ako výpadok.",
            "Because the value is null, not zero — the apps had no /api/summary endpoint during that period, so the hub has nothing to measure. A zero would incorrectly look like an outage."
          ),
          cite: 'pamäť',
          act: null
        },
        {
          q: L("Aká je p95 latencia dopytu hubu na appku?", "What's the p95 latency of a hub-to-app request?"),
          a: L(
            "Ukážkovo 410 ms, čo je stále pod 4-sekundovým timeoutom kontraktu, ale dosť blízko na to, aby si zaslúžilo sledovanie pri pridávaní ďalších appiek.",
            "A sample 410ms, which is still under the contract's 4-second timeout, but close enough to be worth watching as more apps are added."
          ),
          cite: 'ukážka',
          act: null
        }
      ]
    },
    {
      key: 'prevadzka',
      icon: 'shield',
      title: L("Prevádzka", "Operations"),
      sub: L(
        "Kontajnery a porty, zálohy podľa databázy a volume, expozícia — otvorené prevádzkové body.",
        "Containers and ports, backups by database and volume, exposure — open operational issues."
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
            "Zálohy pokrývajú len databázu aura_marketing; ostatné DB a volumy sú otvorené body, nie vyriešené stavy. Podrobný register bezpečnostných bodov je na obrazovke Bezpečnosť.",
            "Backups cover only the aura_marketing database; the other DBs and volumes are open issues, not resolved states. The detailed security issues register is on the Security screen."
          )
        }
      ],
      ai: [
        {
          q: L("Ktorá databáza je jediná so zálohou?", "Which database is the only one with a backup?"),
          a: L(
            "aura_marketing — jediná appková DB v rodine s nightly zálohou. bannery-db a jej volume obrázkov nemajú zálohu vôbec, ostatné tri (aura_kpi, aura_roadmap, aura_hub) sú mimo centrálneho systému, hoci Roadmap má vlastný mysqldump s restore-testom.",
            "aura_marketing — the only app DB in the family with a nightly backup. bannery-db and its image volume have no backup at all, the other three (aura_kpi, aura_roadmap, aura_hub) are outside the central system, though Roadmap has its own mysqldump with a restore test."
          ),
          cite: 'pamäť',
          act: { l: L("Otvoriť zoznam záloh", "Open backup list"), k: 'open' }
        },
        {
          q: L("Ktoré appky bežia na porte v konflikte s Aura Hub?", "Which apps run on a port conflicting with Aura Hub?"),
          a: L(
            "Žiadne — rodina používa unikátne porty 3000, 3010, 3011, 3020, 3030, 3040, 3050, 8082, 8091, 8092. Hub si drží 3050 a mapuje ho len na 127.0.0.1.",
            "None — the family uses unique ports 3000, 3010, 3011, 3020, 3030, 3040, 3050, 8082, 8091, 8092. The hub keeps 3050 and maps it only to 127.0.0.1."
          ),
          cite: 'pamäť',
          act: null
        },
        {
          q: L("Ktorá appka má najslabšiu expozíciu?", "Which app has the weakest exposure?"),
          a: L(
            "Banner Studio — beží verejne cez ngrok so zdieľaným heslom s fallbackom a bez rate-limitu, to je jediný riadok s tónom no v tabuľke Expozícia.",
            "Banner Studio — it runs publicly over ngrok with a single shared password fallback and no rate limit, the only row with a no tone in the Exposure table."
          ),
          cite: 'appka',
          act: null
        }
      ]
    },
    {
      key: 'bezpecnost',
      icon: 'shield',
      title: L("Bezpečnosť", "Security"),
      sub: L(
        "Register otvorených bezpečnostných bodov naprieč rodinou — bez konkrétnych hodnôt tajomstiev.",
        "A register of open security issues across the family — without literal secret values."
      ),
      blocks: [
        {
          t: 'kpis',
          items: [
            { l: L("Otvorené kritické body", "Open critical issues"), v: int(7), sub: L("naprieč rodinou", "family-wide"), tone: 'no' },
            { l: L("Na zváženie", "To review"), v: int(6), sub: L("naprieč rodinou", "family-wide"), tone: 'cond' },
            { l: L("Vyriešené / informačné", "Resolved / informational"), v: int(3), sub: L("bez akcie alebo hotové", "no action or done"), tone: 'ok' },
            { l: L("Appky s fail-closed testovacím základom", "Apps with a fail-closed test foundation"), v: "1/6", sub: L("sperky-ai (vetva B)", "sperky-ai (branch B)"), tone: 'cond' }
          ]
        },
        {
          t: 'table',
          title: L("Register otvorených bodov", "Open issues register"),
          cols: [L("Appka", "App"), L("Bod", "Issue"), L("Závažnosť", "Severity"), L("Stav", "Status"), L("Odporúčanie", "Recommendation")],
          rows: [
            { c: ["Aura Hub", L("Nemá vlastné prihlásenie", "Has no login of its own"), ['cond', L("Na zváženie", "To review")], L("otvorené", "open"), L("pridať auth pred akýmkoľvek tunelovaním", "add auth before any tunneling")] },
            { c: ["Aura Hub", L("Zdieľaný X-Aura-Hub-Token medzi hubom a appkami", "Shared X-Aura-Hub-Token between hub and apps"), ['q', L("Info", "Info")], L("mitigované timing-safe compare", "mitigated by timing-safe compare"), L("pravidelná rotácia, žiadny fallback pri chýbajúcej hodnote", "rotate regularly, no fallback if the value is missing")] },
            { c: ["sperky-ai", L("dev-fallback SESSION_SECRET v src/proxy.ts", "dev-fallback SESSION_SECRET in src/proxy.ts"), ['no', L("Kritický", "Critical")], L("otvorené", "open"), L("odstrániť fallback, fail-closed bez neho", "remove the fallback, fail closed without it")] },
            { c: ["sperky-ai", L("Proxy sama osebe nie je autorizácia", "The proxy alone is not authorization"), ['cond', L("Na zváženie", "To review")], L("pripomienka procesu", "process reminder"), L("requireUser()/requireRight() v každom handleri zvlášť", "requireUser()/requireRight() in every handler separately")] },
            { c: ["Aura KPI", L("Historický ADMIN_PASSWORD fallback", "Historical ADMIN_PASSWORD fallback"), ['ok', L("Vyriešené", "Resolved")], L("odstránené commitom 6169eb0 + fail-closed bootcheck", "removed by commit 6169eb0 + fail-closed bootcheck"), L("overiť, že sa fallback nevráti pri ďalšom forku appky", "verify the fallback doesn't return in the app's next fork")] },
            { c: [L("Banner Studio", "Banner Studio"), L("Jediné zdieľané heslo s fallbackom", "A single shared password with a fallback"), ['no', L("Kritický", "Critical")], L("otvorené", "open"), L("individuálne účty, odstrániť fallback", "individual accounts, remove the fallback")] },
            { c: [L("Banner Studio", "Banner Studio"), L("Verejne cez ngrok bez rate-limitu", "Public over ngrok with no rate limit"), ['no', L("Kritický", "Critical")], L("otvorené", "open"), L("rate-limit + lockout pred prihlásením", "rate limit + lockout before login")] },
            { c: [L("Ngrok tunely rodiny", "Family ngrok tunnels"), L("Žiadna basic auth ani IP restrikcia", "No basic auth or IP restriction"), ['cond', L("Na zváženie", "To review")], L("otvorené", "open"), L("basic auth na tuneli alebo prechod na gateway s forward_auth", "basic auth on the tunnel or move to a gateway with forward_auth")] },
            { c: [L("Aura Logistika", "Aura Logistics"), L("Nemá git repo vôbec", "Has no git repo at all"), ['cond', L("Na zváženie", "To review")], L("otvorené", "open"), L("založiť repo + remote pred ďalším nasadením", "set up a repo + remote before the next deployment")] },
            { c: ["Aura KPI", L("Hardcoduje názvy stĺpcov Logistiky", "Hardcodes Logistics column names"), ['cond', L("Na zváženie", "To review")], L("otvorené", "open"), L("kontrakt cez read-only DB usera namiesto hardcoded názvov", "a contract via a read-only DB user instead of hardcoded names")] },
            { c: [L("bannery-db + volume obrázkov", "bannery-db + image volume"), L("Bez zálohy vôbec", "No backup at all"), ['no', L("Kritický", "Critical")], L("otvorené", "open"), L("zaviesť nightly zálohu DB aj volume", "set up a nightly backup for both the DB and the volume")] },
            { c: [L("aura_kpi / aura_roadmap / aura_hub", "aura_kpi / aura_roadmap / aura_hub"), L("Mimo centrálneho zálohového systému aura_marketing", "Outside the central aura_marketing backup system"), ['cond', L("Na zváženie", "To review")], L("čiastočne (Roadmap má vlastný mysqldump)", "partial (Roadmap has its own mysqldump)"), L("zjednotiť pod centrálny systém alebo doplniť restore-test všade", "unify under the central system or add a restore test everywhere")] },
            { c: ["AuraAI", L("bcrypt hash tunelového hesla je git-trackovaný v Caddyfile", "The tunnel password's bcrypt hash is git-tracked in the Caddyfile"), ['no', L("Kritický", "Critical")], L("otvorené", "open"), L("presunúť do secrets mimo repa, rotovať pri dlhodobom exponovaní", "move it to secrets outside the repo, rotate for long-term exposure")] },
            { c: ["AuraAI", L("Cloudflare quick tunnel URL sa mení pri reštarte", "Cloudflare quick tunnel URL changes on restart"), ['q', L("Info", "Info")], L("známe obmedzenie", "known limitation"), L("zvážiť pomenovaný tunel so zónou na Cloudflare NS", "consider a named tunnel with a zone on Cloudflare NS")] },
            { c: [L("Docker Compose (rodina)", "Docker Compose (family)"), L("Riziko service-name alias collision na zdieľaných sieťach", "Service-name alias collision risk on shared networks"), ['cond', L("Na zváženie", "To review")], L("známe riziko", "known risk"), L("unikátne názvy services aj keď sa container_name zhoduje", "unique service names even when container_name matches")] },
            { c: [L("Rodina appiek", "Family of apps"), L("Len sperky-ai (vetva B) má argon2id, rate-limit, lockout a testovací základ", "Only sperky-ai (branch B) has argon2id, rate-limit, lockout and a test foundation"), ['q', L("Info", "Info")], L("architektonické rozhodnutie", "architectural decision"), L("nové appky s expozíciou stavať na vetve B, vetva A len na interné nástroje", "build new exposed apps on branch B, branch A only for internal tools")] }
          ],
          note: L(
            "Register vychádza z reconu 28.7.2026 a 4.8.2026 (Hades pamäť) — konkrétne hodnoty hesiel, hashov a tokenov sú zámerne mimo tohto náhľadu, register drží len druh problému a odporúčanie.",
            "The register is based on the 7/28/2026 and 8/4/2026 recon (Hades memory) — literal password, hash and token values are deliberately kept out of this preview, the register only holds the issue type and recommendation."
          )
        },
        {
          t: 'banner',
          tone: 'no',
          text: L(
            "Tri body sú kritické a priamo verejne exponované: Banner Studio (zdieľané heslo cez ngrok, bez rate-limitu), AuraAI (git-trackovaný hash tunelového hesla) a sperky-ai (dev-fallback SESSION_SECRET). Konkrétne hodnoty zámerne nie sú súčasťou tohto náhľadu.",
            "Three items are critical and directly publicly exposed: Banner Studio (shared password over ngrok, no rate limit), AuraAI (git-tracked tunnel password hash) and sperky-ai (dev-fallback SESSION_SECRET). Literal values are deliberately not part of this preview."
          )
        }
      ],
      ai: [
        {
          q: L("Koľko bodov je práve kritických?", "How many issues are currently critical?"),
          a: L(
            "7 s tónom no. Tri z nich sú priamo verejne exponované appky (Banner Studio, AuraAI tunel, sperky-ai proxy fallback), zvyšné sa týkajú chýbajúcich záloh a sperky-ai autorizácie.",
            "7 with a no tone. Three of them are directly publicly exposed apps (Banner Studio, AuraAI tunnel, sperky-ai proxy fallback), the rest concern missing backups and sperky-ai authorization."
          ),
          cite: 'appka',
          act: { l: L("Filtrovať kritické", "Filter critical"), k: 'filter' }
        },
        {
          q: L("Sú v tomto registri vypísané konkrétne heslá alebo tokeny?", "Are literal passwords or tokens listed in this register?"),
          a: L(
            "Nie, zámerne nie. Register drží len druh problému (napr. „zdieľané heslo s fallbackom“) a odporúčanie — konkrétne hodnoty tajomstiev sem podľa pravidiel appky nepatria.",
            "No, deliberately not. The register only holds the issue type (e.g. \"shared password with a fallback\") and a recommendation — literal secret values don't belong here under the app's rules."
          ),
          cite: 'pamäť',
          act: null
        },
        {
          q: L("Ktorá appka má riešenie už hotové?", "Which app already has a fix in place?"),
          a: L(
            "Aura KPI — historický ADMIN_PASSWORD fallback bol odstránený commitom 6169eb0 a doplnený fail-closed bootcheck, preto má v registri tón ok, nie no.",
            "Aura KPI — the historical ADMIN_PASSWORD fallback was removed by commit 6169eb0 with a fail-closed bootcheck added, which is why it shows an ok tone in the register, not no."
          ),
          cite: 'pamäť',
          act: null
        }
      ]
    },
    {
      key: 'tokeny',
      icon: 'clip',
      title: L("Tokeny", "Tokens"),
      sub: L(
        "Service tokeny appiek pre /api/summary: rotácia a posledné použitie, bez konkrétnych hodnôt.",
        "Service tokens the apps use for /api/summary: rotation and last use, without literal values."
      ),
      blocks: [
        {
          t: 'kpis',
          items: [
            { l: L("Aktívne tokeny", "Active tokens"), v: "2/6", sub: L("KPI a Logistika majú nastavený X-Aura-Hub-Token", "KPI and Logistics have X-Aura-Hub-Token configured"), tone: 'cond' },
            { l: L("Appky bez tokenu", "Apps without a token"), v: int(4), sub: L("Roadmap, sperky-ai, HR, Tržby", "Roadmap, sperky-ai, HR, Revenue"), tone: 'no' },
            { l: L("Odporúčaná rotácia", "Recommended rotation"), v: "90 dní", sub: L("ukážková politika, appka zatiaľ nemá login na jej vynútenie", "sample policy, the app has no login yet to enforce it"), tone: null },
            { l: L("Fallback hodnoty tokenu", "Token fallback values"), v: int(0), sub: L("žiadny — fail-closed, chýbajúci token = 503", "none — fail closed, a missing token means 503"), tone: 'ok' }
          ]
        },
        {
          t: 'table',
          title: L("Service tokeny appiek", "App service tokens"),
          cols: [L("Appka", "App"), L("Premenná", "Variable"), L("Rotácia", "Rotation"), L("Posledné použitie", "Last used"), L("Stav", "Status")],
          rows: [
            { c: ["Aura KPI", "AURA_HUB_TOKEN", L("90 dní (ukážkové)", "90 days (sample)"), L("pred 3 min", "3 min ago"), ['ok', L("Aktívny", "Active")]] },
            { c: [L("Aura Logistika", "Aura Logistics"), "AURA_HUB_TOKEN", L("90 dní (ukážkové)", "90 days (sample)"), L("pred 3 min", "3 min ago"), ['ok', L("Aktívny", "Active")]] },
            { c: [L("Aura Roadmap", "Aura Roadmap"), "AURA_HUB_TOKEN", L("nekonfigurované", "not configured"), L("—", "—"), ['no', L("Chýba", "Missing")]] },
            { c: ["sperky-ai", "AURA_HUB_TOKEN", L("nekonfigurované", "not configured"), L("—", "—"), ['no', L("Chýba", "Missing")]] },
            { c: [L("Aura HR", "Aura HR"), L("N/A — appka nikdy neimplementovala /api/summary", "N/A — the app never implemented /api/summary"), L("—", "—"), L("—", "—"), ['q', L("Nerelevantné", "Not applicable")]] },
            { c: [L("Tržby", "Revenue"), L("N/A — appka neexistuje", "N/A — the app does not exist"), L("—", "—"), L("—", "—"), ['q', L("Nerelevantné", "Not applicable")]] },
            { c: [L("Banner Studio (mimo /api/summary)", "Banner Studio (outside /api/summary)"), L("zdieľané heslo appky, nie hub token", "the app's shared password, not a hub token"), L("žiadna zaznamenaná rotácia", "no rotation on record"), L("neznáme", "unknown"), ['no', L("Rizikové", "At risk")]] }
          ],
          note: L(
            "Tabuľka ukazuje len názvy premenných a stav, nie hodnoty. Rotácia a posledné použitie pre KPI/Logistiku sú ukážkové — hub log presné časy nezbiera, len keš 30 s.",
            "The table shows only variable names and status, not values. Rotation and last-use for KPI/Logistics are illustrative — the hub log does not collect exact times, only the 30s cache."
          )
        },
        {
          t: 'note',
          text: L(
            "Fail-closed pravidlo rodiny: appka bez nakonfigurovaného tokenu vráti 503 hub_token_not_configured namiesto toho, aby akceptovala default alebo prázdnu hodnotu. Preto Roadmap a sperky-ai v tabuľke nemajú fallback, majú Chýba.",
            "The family's fail-closed rule: an app with no token configured returns 503 hub_token_not_configured instead of accepting a default or empty value. That's why Roadmap and sperky-ai show Missing in the table, not a fallback."
          )
        }
      ],
      ai: [
        {
          q: L("Ktoré appky majú nakonfigurovaný hub token?", "Which apps have a hub token configured?"),
          a: L(
            "Len Aura KPI a Aura Logistika majú AURA_HUB_TOKEN nastavený a používaný. Roadmap a sperky-ai ho nemajú — nie je to chyba, len ešte nemajú hotový samotný endpoint /api/summary.",
            "Only Aura KPI and Aura Logistics have AURA_HUB_TOKEN set and in use. Roadmap and sperky-ai don't have it — that's not a bug, they simply don't have the /api/summary endpoint finished yet."
          ),
          cite: 'appka',
          act: { l: L("Otvoriť Pripojenia", "Open Connections"), k: 'open' }
        },
        {
          q: L("Čo sa stane, keď appka nemá token nastavený?", "What happens when an app has no token configured?"),
          a: L(
            "Vráti 503 hub_token_not_configured. Rodina nepoužíva fallback hodnoty tokenov — to je zámerné poučenie z pascí s fallback heslami, ktoré sa objavili v iných appkách.",
            "It returns 503 hub_token_not_configured. The family doesn't use fallback token values — that's a deliberate lesson from the fallback-password traps seen in other apps."
          ),
          cite: 'pamäť',
          act: null
        },
        {
          q: L("Prečo je Banner Studio v tejto tabuľke označené ako rizikové?", "Why is Banner Studio flagged as at risk in this table?"),
          a: L(
            "Nejde o hub token, ale o vlastné appkové heslo — je zdieľané s fallbackom a bez zaznamenanej rotácie, čo je iný typ problému než chýbajúci hub token, ale rovnako otvorený bod.",
            "It's not about the hub token but the app's own password — it's shared with a fallback and has no recorded rotation, a different kind of problem than a missing hub token, but an open issue all the same."
          ),
          cite: 'pamäť',
          act: null
        }
      ]
    },
    {
      key: 'audit',
      icon: 'clock',
      title: L("Audit", "Audit"),
      sub: L(
        "Log dopytov hubu na appky a udalostí hubu samého — ukážkový, kým nie je hotový centrálny audit z plánu F3.",
        "A log of the hub's requests to the apps and of the hub's own events — illustrative until the central F3 audit is built."
      ),
      blocks: [
        {
          t: 'kpis',
          items: [
            { l: L("Udalosti dnes", "Events today"), v: int(27), sub: L("ukážkové, 08:02–12:41", "sample, 08:02–12:41"), tone: null },
            { l: L("Úspešné dopyty", "Successful requests"), v: int(21), sub: L("2xx z hub→appka volaní", "2xx from hub→app calls"), tone: 'ok' },
            { l: L("Chyby / timeouty", "Errors / timeouts"), v: int(2), sub: L("401 pokus + 1 timeout, oba ukážkové", "401 attempt + 1 timeout, both sample"), tone: 'no' },
            { l: L("Preskočené appky", "Apps skipped"), v: int(4), sub: L("Roadmap, sperky-ai (2×) — bez tokenu, nedopytuje sa", "Roadmap, sperky-ai (2×) — no token, not queried"), tone: 'cond' }
          ]
        },
        {
          t: 'table',
          title: L("Log udalostí", "Event log"),
          cols: [L("Čas", "Time"), L("Appka", "App"), L("Udalosť", "Event"), L("Aktér", "Actor"), L("Výsledok", "Result")],
          page: true,
          rows: [
            { c: ["08:02", "Aura Hub", L("Štart kontajnera aura-hub-app", "aura-hub-app container start"), L("systém", "system"), ['ok', "OK"]] },
            { c: ["08:02", "Aura KPI", L("/api/summary dopyt", "/api/summary request"), "hub", ['ok', "200"]] },
            { c: ["08:02", L("Aura Logistika", "Aura Logistics"), L("/api/summary dopyt", "/api/summary request"), "hub", ['ok', "200"]] },
            { c: ["08:02", L("Aura Roadmap", "Aura Roadmap"), L("/api/summary dopyt preskočený — token nenastavený", "/api/summary request skipped — token not set"), "hub", ['q', L("preskočené", "skipped")]] },
            { c: ["08:02", "sperky-ai", L("/api/summary dopyt preskočený — token nenastavený", "/api/summary request skipped — token not set"), "hub", ['q', L("preskočené", "skipped")]] },
            { c: ["08:05", "Aura Hub", L("Odpoveď zapísaná do keše (30 s TTL)", "Response written to cache (30s TTL)"), L("systém", "system"), ['ok', "OK"]] },
            { c: ["08:32", "Aura KPI", L("/api/summary dopyt", "/api/summary request"), "hub", ['ok', "200"]] },
            { c: ["08:32", L("Aura Logistika", "Aura Logistics"), L("/api/summary dopyt", "/api/summary request"), "hub", ['ok', "200"]] },
            { c: ["09:00", "Aura Hub", L("Rotácia logov", "Log rotation"), L("systém", "system"), ['ok', "OK"]] },
            { c: ["09:14", L("Aura Logistika", "Aura Logistics"), L("Latencia nad 150 ms", "Latency above 150ms"), "hub", ['cond', L("upozornenie", "warning")]] },
            { c: ["09:41", "Aura KPI", L("/api/summary dopyt", "/api/summary request"), "hub", ['ok', "200"]] },
            { c: ["09:41", L("Aura Logistika", "Aura Logistics"), L("/api/summary dopyt", "/api/summary request"), "hub", ['ok', "200"]] },
            { c: ["10:03", "Aura Hub", L("Pokus o prístup na interný endpoint bez X-Aura-Hub-Token", "Access attempt on an internal endpoint without X-Aura-Hub-Token"), L("neznámy klient", "unknown client"), ['no', "401"]] },
            { c: ["10:03", "Aura Hub", L("Zaznamenaná anomália frekvencie dopytov", "Request-rate anomaly recorded"), L("systém", "system"), ['cond', L("upozornenie", "warning")]] },
            { c: ["10:15", "Aura KPI", L("/api/summary dopyt", "/api/summary request"), "hub", ['ok', "200"]] },
            { c: ["10:15", L("Aura Logistika", "Aura Logistics"), L("/api/summary dopyt", "/api/summary request"), "hub", ['ok', "200"]] },
            { c: ["10:41", L("Aura Roadmap", "Aura Roadmap"), L("/api/summary stále nekonfigurované", "/api/summary still not configured"), "hub", ['q', L("preskočené", "skipped")]] },
            { c: ["10:41", "sperky-ai", L("/api/summary stále nekonfigurované", "/api/summary still not configured"), "hub", ['q', L("preskočené", "skipped")]] },
            { c: ["11:00", "Aura Hub", L("Report hit-rate keše vygenerovaný", "Cache hit-rate report generated"), L("systém", "system"), ['ok', "OK"]] },
            { c: ["11:12", L("Aura Logistika", "Aura Logistics"), L("Latencia späť pod 140 ms", "Latency back under 140ms"), "hub", ['ok', "OK"]] },
            { c: ["11:20", "Aura KPI", L("/api/summary dopyt — timeout po 4 s", "/api/summary request — timed out after 4s"), "hub", ['no', L("timeout", "timeout")]] },
            { c: ["11:20", "Aura KPI", L("Opakovaný dopyt úspešný", "Retried request succeeded"), "hub", ['ok', "200"]] },
            { c: ["11:41", L("Aura Logistika", "Aura Logistics"), L("/api/summary dopyt", "/api/summary request"), "hub", ['ok', "200"]] },
            { c: ["11:41", "Aura KPI", L("/api/summary dopyt", "/api/summary request"), "hub", ['ok', "200"]] },
            { c: ["12:00", "Aura Hub", L("Report dostupnosti vygenerovaný", "Availability report generated"), L("systém", "system"), ['ok', "OK"]] },
            { c: ["12:11", "Aura Hub", L("Register bezpečnostných bodov skontrolovaný manuálne", "Security issues register checked manually"), L("vlastník", "owner"), ['ok', "OK"]] },
            { c: ["12:41", "Aura KPI", L("/api/summary dopyt — posledný sync", "/api/summary request — last sync"), "hub", ['ok', "200"]] },
            { c: ["12:41", L("Aura Logistika", "Aura Logistics"), L("/api/summary dopyt — posledný sync", "/api/summary request — last sync"), "hub", ['ok', "200"]] }
          ],
          note: L(
            "Celý log je ukážkový. Hub nemá vlastnú databázu, takže si dnes neukladá históriu udalostí — centrálny audit s ingest endpointom je len naplánovaný v Aura Suite pláne F3.",
            "The whole log is illustrative. The hub has no database of its own, so it doesn't currently persist an event history — a central audit with an ingest endpoint is only planned in the Aura Suite F3 plan."
          )
        },
        {
          t: 'note',
          text: L(
            "Keď F3 pribudne, tento log sa nahradí reálnymi doménovými udalosťami appiek s retenciou 1 rok — dnešná tabuľka je len ukážka jej budúceho tvaru.",
            "Once F3 lands, this log will be replaced with real app domain events retained for 1 year — today's table is only a preview of its future shape."
          )
        }
      ],
      ai: [
        {
          q: L("Ukladá hub tieto audit záznamy reálne?", "Does the hub actually persist these audit records?"),
          a: L(
            "Nie, hub nemá vlastnú databázu, takže dnes nič neukladá — celá tabuľka je ukážka toho, ako by centrálny audit vyzeral po dodaní plánu F3 (ingest endpoint, retencia 1 rok).",
            "No, the hub has no database of its own, so today it persists nothing — the whole table is a preview of what a central audit would look like once the F3 plan is delivered (ingest endpoint, 1-year retention)."
          ),
          cite: 'pamäť',
          act: null
        },
        {
          q: L("Koľko dopytov skončilo chybou?", "How many requests ended in an error?"),
          a: L(
            "Dve v ukážkovom logu — jeden neautorizovaný pokus o interný endpoint (401) o 10:03 a jeden timeout dopytu na Aura KPI o 11:20, ktorý sa pri opakovaní podaril.",
            "Two in the sample log — one unauthorized attempt on an internal endpoint (401) at 10:03 and one Aura KPI request timeout at 11:20, which succeeded on retry."
          ),
          cite: 'ukážka',
          act: { l: L("Filtrovať chyby", "Filter errors"), k: 'filter' }
        },
        {
          q: L("Prečo majú Roadmap a sperky-ai v logu „preskočené“?", "Why do Roadmap and sperky-ai show \"skipped\" in the log?"),
          a: L(
            "Lebo nemajú nastavený token ani hotový endpoint — hub ich podľa pravidla č. 3 (nesmie zaťažovať appky) opakovane nedopytuje, len si to raz za interval poznačí.",
            "Because they have no token set and no finished endpoint — per rule #3 (must not burden the apps), the hub doesn't repeatedly query them, it just notes it once per interval."
          ),
          cite: 'pamäť',
          act: null
        }
      ]
    },
    {
      key: 'nastavenia',
      icon: 'gear',
      title: L("Nastavenia", "Settings"),
      sub: L(
        "Cache, timeout, jazyk a téma hubu; zapojenie appiek; pripomienky pred exponovaním.",
        "Hub cache, timeout, language and theme; app connections; reminders before exposure."
      ),
      blocks: [
        {
          t: 'form',
          title: L("Všeobecné", "General"),
          fields: [
            { l: L("TTL keše /api/summary", "/api/summary cache TTL"), s: L("koľko sekúnd hub drží poslednú platnú odpoveď appky", "how many seconds the hub holds an app's last valid response"), type: 'text', v: "30" },
            { l: L("Timeout dopytu na appku", "Per-app request timeout"), s: L("appka, ktorá do tohto času neodpovie, dostane dôvod namiesto čísla", "an app that doesn't answer in this time gets a reason instead of a number"), type: 'text', v: "4" },
            { l: L("Predvolený jazyk", "Default language"), s: L("SK je predvolený jazyk hubu aj rodiny", "SK is the default language of the hub and the family"), type: 'select', v: "SK", opts: ["SK", "EN"] },
            { l: L("Tmavá téma", "Dark theme"), s: L("prepínač svetlá/tmavá, rodina má obe", "light/dark toggle, the family has both"), type: 'switch', v: 'x', on: true }
          ],
          note: L("Ukážkové hodnoty formulára — engine hodnoty pri ukladaní validuje proti kontraktu.", "Sample form values — the engine validates values against the contract on save.")
        },
        {
          t: 'form',
          title: L("Pripojenia appiek", "App connections"),
          fields: [
            { l: "Aura KPI", s: L("port 3030 · /api/summary aktívny", "port 3030 · /api/summary active"), type: 'switch', v: 'x', on: true },
            { l: L("Aura Logistika", "Aura Logistics"), s: L("port 3020 · /api/summary aktívny", "port 3020 · /api/summary active"), type: 'switch', v: 'x', on: true },
            { l: L("Aura Roadmap", "Aura Roadmap"), s: L("port 3040 · endpoint chýba, prepínač bez efektu kým nie je nasadený", "port 3040 · endpoint missing, switch has no effect until deployed"), type: 'switch', v: 'x', on: false },
            { l: "sperky-ai", s: L("port 3000 · endpoint chýba, prepínač bez efektu kým nie je nasadený", "port 3000 · endpoint missing, switch has no effect until deployed"), type: 'switch', v: 'x', on: false },
            { l: L("Aura HR", "Aura HR"), s: L("endpoint nikdy neexistoval — pripojenie nie je možné", "endpoint never existed — connection is not possible"), type: 'switch', v: 'x', on: false },
            { l: L("Tržby", "Revenue"), s: L("appka neexistuje — pripojenie nie je možné", "the app does not exist — connection is not possible"), type: 'switch', v: 'x', on: false }
          ],
          note: L("Vypnutie appky tu len skryje jej kartu na Prehľade, nezasahuje do appky samotnej.", "Turning an app off here only hides its card on Overview, it doesn't touch the app itself.")
        },
        {
          t: 'banner',
          tone: 'cond',
          text: L(
            "Hub nemá vlastné prihlásenie — je to rozcestník nad appkami, ktoré login majú. Pred akýmkoľvek tunelovaním (ngrok, Cloudflare) treba pridať auth, inak sú hlavičkové čísla všetkých appiek verejné bez hesla.",
            "The hub has no login of its own — it's a hub sitting on top of apps that do have one. Before any tunneling (ngrok, Cloudflare), auth must be added, otherwise every app's headline numbers are public without a password."
          )
        },
        {
          t: 'list',
          title: L("Plánované zmeny (Aura Suite plán F2–F6)", "Planned changes (Aura Suite F2–F6 plan)"),
          items: [
            { title: L("Gateway s forward_auth", "Gateway with forward_auth"), sub: L("Caddy pred hubom pri každom requeste, subdomény na aura-ai.sk", "Caddy in front of the hub on every request, subdomains on aura-ai.sk"), badge: ['q', L("Plánované — F3", "Planned — F3")], meta: "" },
            { title: L("Centrálny audit", "Central audit"), sub: L("ingest endpoint pre doménové udalosti appiek, retencia 1 rok", "ingest endpoint for app domain events, 1-year retention"), badge: ['q', L("Plánované — F3", "Planned — F3")], meta: "" },
            { title: L("Migrácia rolí appiek na hub", "Migrating app roles to the hub"), sub: L("Aura Roadmap ako prvá appka s plnou migráciou na hub roly", "Aura Roadmap as the first app with a full migration to hub roles"), badge: ['q', L("Plánované — F3", "Planned — F3")], meta: "" },
            { title: L("Tržby appka", "Revenue app"), sub: L("vanilla SPA, port 3060, nightly sync zo sperky-ai", "vanilla SPA, port 3060, nightly sync from sperky-ai"), badge: ['q', L("Plánované — F6", "Planned — F6")], meta: "" }
          ],
          note: L("100 rozhodnutí plánu je zapísaných mimo tejto appky (docs/KONTRAKT-sso.md); tu je len súhrn toho, čo sa dotýka hubu.", "The plan's 100 decisions are recorded outside this app (docs/KONTRAKT-sso.md); this is only a summary of what touches the hub.")
        }
      ],
      ai: [
        {
          q: L("Prečo sú prepínače Roadmap a sperky-ai vypnuté?", "Why are the Roadmap and sperky-ai toggles switched off?"),
          a: L(
            "Lebo obe appky ešte nemajú nasadený endpoint /api/summary — prepínač by aj tak nemal čo zapnúť, kým WIP na feat/suite-visuals nie je zlúčený.",
            "Because neither app has the /api/summary endpoint deployed yet — the toggle wouldn't have anything to turn on until the WIP on feat/suite-visuals is merged."
          ),
          cite: 'appka',
          act: null
        },
        {
          q: L("Kde sa rieši prihlásenie do hubu?", "Where is hub login handled?"),
          a: L(
            "Nikde zatiaľ — hub nemá vlastné prihlásenie a spolieha sa na loopback-only prístup a noindex. Prihlásenie naprieč rodinou má priniesť až gateway s forward_auth z plánu F3.",
            "Nowhere yet — the hub has no login of its own and relies on loopback-only access and noindex. Family-wide login is only meant to arrive with the F3 plan's gateway and forward_auth."
          ),
          cite: 'pamäť',
          act: { l: L("Otvoriť Bezpečnosť", "Open Security"), k: 'open' }
        },
        {
          q: L("Aký je timeout pre appku, ktorá neodpovie?", "What's the timeout for an app that doesn't respond?"),
          a: L(
            "4 sekundy — po tomto čase hub kartu tej appky degraduje na dôvod namiesto čísla, ostatné karty to neovplyvní (pravidlo č. 2).",
            "4 seconds — after that the hub degrades that app's card to a reason instead of a number, other cards are unaffected (rule #2)."
          ),
          cite: 'pamäť',
          act: null
        }
      ]
    }
  ]
};
