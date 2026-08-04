/* ============================================================================
   i18n — každý text appky žije tu, nikdy v kóde.

   Formát je rovnaký ako v rodine (`keys.<modul>.ts`): kľúč → { sk, en }.
   SK je default. `t("key", { n: 3 })` interpoluje `{n}`.

   Kto pridá text do markupu alebo do app.js natvrdo, obchádza jazykový prepínač.
   ========================================================================== */
(function (global) {
  "use strict";

  var LANG_KEY = "sperky.lang";

  var appKeys = {
    "app.name": { sk: "Šperky", en: "Šperky" },
    "app.suffix": { sk: "API klient", en: "API client" },
    "app.skipToContent": { sk: "Preskočiť na obsah", en: "Skip to content" },
    "app.openMenu": { sk: "Otvoriť navigáciu", en: "Open navigation" },
    "app.closeMenu": { sk: "Zavrieť navigáciu", en: "Close navigation" },
    "app.theme.toggle": { sk: "Prepnúť tému — rýchle prepnutie", en: "Toggle theme — quick switch" },
    "app.density.toggle": { sk: "Prepnúť hustotu — rýchle prepnutie", en: "Toggle density — quick switch" },
    "app.lang.toggle": { sk: "Prepnúť jazyk", en: "Switch language" },
    "app.reload": { sk: "Načítať znova", en: "Reload" },
  };

  var navKeys = {
    "nav.overview": { sk: "Prehľad", en: "Overview" },
    "nav.orders": { sk: "Objednávky", en: "Orders" },
    "nav.products": { sk: "Produkty", en: "Products" },
    "nav.settings": { sk: "Nastavenia", en: "Settings" },
    "nav.section.data": { sk: "Dáta", en: "Data" },
    "nav.section.system": { sk: "Systém", en: "System" },
  };

  var commonKeys = {
    "common.id": { sk: "ID", en: "ID" },
    "common.detail": { sk: "Detail", en: "Detail" },
    "common.close": { sk: "Zavrieť", en: "Close" },
    "common.closeDialog": { sk: "Zavrieť dialóg", en: "Close dialog" },
    "common.closePanel": { sk: "Zavrieť panel", en: "Close panel" },
    "common.copy": { sk: "Kopírovať", en: "Copy" },
    "common.copied": { sk: "Skopírované do schránky", en: "Copied to clipboard" },
    "common.copyFailed": { sk: "Kopírovanie sa nepodarilo", en: "Copy failed" },
    "common.apply": { sk: "Použiť", en: "Apply" },
    "common.reset": { sk: "Zrušiť filtre", en: "Clear filters" },
    "common.retry": { sk: "Skúsiť znova", en: "Try again" },
    "common.refresh": { sk: "Obnoviť", en: "Refresh" },
    "common.loading": { sk: "Načítava sa…", en: "Loading…" },
    "common.prev": { sk: "Predchádzajúca", en: "Previous" },
    "common.next": { sk: "Nasledujúca", en: "Next" },
    "common.page": { sk: "Strana", en: "Page" },
    "common.perPage": { sk: "Na stránku", en: "Per page" },
    "common.range": { sk: "{from}–{to} z {total}", en: "{from}–{to} of {total}" },
    "common.pageOf": { sk: "Strana {page} z {pages}", en: "Page {page} of {pages}" },
    "common.unknown": { sk: "neznáme", en: "unknown" },
    "common.notProvided": { sk: "API to nevracia", en: "not returned by the API" },
    "common.openInShop": { sk: "Otvoriť v eshope", en: "Open in the shop" },
    "common.activeFilters": { sk: "Aktívne filtre", en: "Active filters" },
    "common.removeFilter": { sk: "Odstrániť filter {name}", en: "Remove filter {name}" },
  };

  var overviewKeys = {
    "overview.title": { sk: "Prehľad", en: "Overview" },
    "overview.desc": {
      sk: "Rýchly stav spojenia so Šperky API. Čísla sú tie, ktoré API vracia — nič sa tu nedopočítava.",
      en: "A quick view of the Šperky API connection. Every number comes from the API — nothing is derived here.",
    },
    "overview.kpi.orders": { sk: "Objednávky v API", en: "Orders in the API" },
    "overview.kpi.ordersSub": { sk: "pole `total` zo zoznamu objednávok", en: "the `total` field of the orders list" },
    "overview.kpi.products": { sk: "Produkty v API", en: "Products in the API" },
    "overview.kpi.productsSub": { sk: "pole `total` zo zoznamu produktov", en: "the `total` field of the products list" },
    "overview.kpi.pageSum": { sk: "Súčet zobrazenej stránky", en: "Sum of the shown page" },
    "overview.kpi.pageSumSub": { sk: "{n} objednávok, ktoré má prehľad načítané", en: "the {n} orders this overview has loaded" },
    "overview.scope": { sk: "Platí len pre načítané riadky, nie pre celý eshop.", en: "Applies to the loaded rows only, not to the whole shop." },
    "overview.latestOrders": { sk: "Najnovšie objednávky", en: "Latest orders" },
    "overview.latestOrdersSub": { sk: "prvá stránka zoznamu, {n} riadkov", en: "first page of the list, {n} rows" },
    "overview.latestProducts": { sk: "Produkty (prvá stránka)", en: "Products (first page)" },
    "overview.latestProductsSub": { sk: "poradie určuje API", en: "ordering comes from the API" },
    "overview.allOrders": { sk: "Všetky objednávky", en: "All orders" },
    "overview.allProducts": { sk: "Všetky produkty", en: "All products" },
  };

  var ordersKeys = {
    "orders.title": { sk: "Objednávky", en: "Orders" },
    "orders.desc": {
      sk: "GET /api/order — zoznam a detail. Endpoint vyžaduje kľúč so scope `orders:read`.",
      en: "GET /api/order — list and detail. The endpoint requires a key with the `orders:read` scope.",
    },
    "orders.col.id": { sk: "Objednávka", en: "Order" },
    "orders.col.date": { sk: "Dátum", en: "Date" },
    "orders.col.total": { sk: "Suma", en: "Total" },
    "orders.col.action": { sk: "Akcia", en: "Action" },
    "orders.filter.dateFrom": { sk: "Dátum od", en: "Date from" },
    "orders.filter.dateTo": { sk: "Dátum do", en: "Date to" },
    "orders.filter.country": { sk: "Krajina dodania (ISO)", en: "Delivery country (ISO)" },
    "orders.filter.countryHint": { sk: "napr. SK, CZ, DE", en: "e.g. SK, CZ, DE" },
    "orders.filter.totalMin": { sk: "Suma od", en: "Total from" },
    "orders.filter.totalMax": { sk: "Suma do", en: "Total to" },
    "orders.filter.badRange": { sk: "„Od“ je neskôr ako „do“.", en: "“From” is later than “to”." },
    "orders.filter.badTotal": { sk: "Dolná hranica je vyššia ako horná.", en: "The lower bound is above the upper one." },
    "orders.filter.badCountry": { sk: "Použi dvojpísmenový ISO kód.", en: "Use a two-letter ISO code." },
    "orders.empty": { sk: "Žiadne objednávky", en: "No orders" },
    "orders.emptyDesc": { sk: "API pre túto stránku nevrátilo žiadny riadok.", en: "The API returned no rows for this page." },
    "orders.emptyFiltered": { sk: "Filtru nezodpovedá žiadna objednávka", en: "No order matches the filter" },
    "orders.emptyFilteredDesc": { sk: "Skús širší rozsah dátumov alebo súm.", en: "Try a wider date or total range." },
    "orders.detail.title": { sk: "Objednávka {id}", en: "Order {id}" },
    "orders.detail.placed": { sk: "Vytvorená", en: "Placed" },
    "orders.detail.total": { sk: "Zaplatené", en: "Paid" },
    "orders.detail.country": { sk: "Krajina", en: "Country" },
    "orders.detail.items": { sk: "Položky", en: "Items" },
    "orders.detail.itemsSub": { sk: "{n} riadkov, {q} ks", en: "{n} rows, {q} pcs" },
    "orders.detail.noItems": { sk: "API nevrátilo žiadne položky.", en: "The API returned no items." },
    "orders.detail.resolveNames": { sk: "Doplniť názvy produktov", en: "Resolve product names" },
    "orders.detail.resolveHint": {
      sk: "Detail objednávky vracia len ID a množstvo. Názvy sa doťahujú z /api/products/get — jeden request na položku.",
      en: "The order detail returns only ids and quantities. Names come from /api/products/get — one request per item.",
    },
    "orders.detail.openProduct": { sk: "Otvoriť produkt {id}", en: "Open product {id}" },
    "orders.detail.resolved": { sk: "Názvy doplnené", en: "Names resolved" },
    "orders.detail.capNote": {
      sk: "Názvy sa doplnia len prvým {n} položkám z {total} — ďalšie requesty by strhli rate limit.",
      en: "Names are resolved for the first {n} of {total} items only — more requests would trip the rate limit.",
    },
    "orders.notFound": { sk: "Objednávka sa nenašla", en: "Order not found" },
    "orders.notFoundDesc": { sk: "API na ID {id} odpovedalo „not found“.", en: "The API answered “not found” for id {id}." },
    "orders.jump": { sk: "Objednávka podľa ID", en: "Order by id" },
    "orders.jumpPlaceholder": { sk: "napr. 1763435", en: "e.g. 1763435" },
    "orders.jumpOpen": { sk: "Otvoriť", en: "Open" },
  };

  var productsKeys = {
    "products.title": { sk: "Produkty", en: "Products" },
    "products.desc": {
      sk: "GET /api/products — verejný endpoint, kľúč netreba. Zoznam podporuje len stránkovanie a jazyk.",
      en: "GET /api/products — a public endpoint, no key needed. The list supports paging and language only.",
    },
    "products.col.id": { sk: "ID", en: "ID" },
    "products.col.name": { sk: "Názov", en: "Name" },
    "products.col.price": { sk: "Cena", en: "Price" },
    "products.col.variants": { sk: "Varianty", en: "Variants" },
    "products.col.action": { sk: "Akcia", en: "Action" },
    "products.hasVariants": { sk: "áno", en: "yes" },
    "products.noVariants": { sk: "nie", en: "no" },
    "products.search": { sk: "Hľadať v názve", en: "Search in name" },
    "products.searchScope": {
      sk: "Hľadanie filtruje LEN zobrazenú stránku — API pre produkty vyhľadávanie nemá.",
      en: "Search filters the shown page ONLY — the products API has no search.",
    },
    "products.lang": { sk: "Jazyk (id_lang)", en: "Language (id_lang)" },
    "products.langDefault": { sk: "Predvolený v eshope", en: "Shop default" },
    "products.priceNote": {
      sk: "Cena je surová hodnota z API, bez meny — tú endpoint nevracia. Zobrazená je v EUR.",
      en: "The price is the raw API value with no currency — the endpoint returns none. Shown in EUR.",
    },
    "products.empty": { sk: "Žiadne produkty", en: "No products" },
    "products.emptyDesc": { sk: "API pre túto stránku nevrátilo žiadny riadok.", en: "The API returned no rows for this page." },
    "products.noMatch": { sk: "Na tejto stránke nič nesedí", en: "Nothing matches on this page" },
    "products.noMatchDesc": {
      sk: "Hľadaný text sa nenašiel v {n} riadkoch tejto stránky. Skús inú stránku alebo vyššie „na stránku“.",
      en: "The text was not found in the {n} rows of this page. Try another page or a larger page size.",
    },
    "products.detail.priceBase": { sk: "Základná cena", en: "Base price" },
    "products.detail.shortDesc": { sk: "Krátky popis", en: "Short description" },
    "products.detail.desc": { sk: "Popis", en: "Description" },
    "products.detail.noDesc": { sk: "Bez popisu.", en: "No description." },
    "products.detail.variants": { sk: "Varianty", en: "Variants" },
    "products.detail.variantsSub": { sk: "{n} kombinácií", en: "{n} combinations" },
    "products.detail.noVariants": { sk: "Produkt nemá kombinácie.", en: "The product has no combinations." },
    "products.detail.values": { sk: "Hodnoty", en: "Values" },
    "products.detail.impact": { sk: "Vplyv na cenu", en: "Price impact" },
    "products.detail.finalPrice": { sk: "Výsledná cena", en: "Final price" },
    "products.detail.reference": { sk: "Kód", en: "Reference" },
    "products.detail.ean": { sk: "EAN", en: "EAN" },
    "products.detail.stock": { sk: "Sklad", en: "Stock" },
    "products.detail.default": { sk: "predvolený", en: "default" },
    "products.notFound": { sk: "Produkt sa nenašiel", en: "Product not found" },
    "products.notFoundDesc": { sk: "API na ID {id} odpovedalo „not found“.", en: "The API answered “not found” for id {id}." },
    "products.jump": { sk: "Produkt podľa ID", en: "Product by id" },
    "products.jumpPlaceholder": { sk: "napr. 49", en: "e.g. 49" },
  };

  var settingsKeys = {
    "settings.title": { sk: "Nastavenia", en: "Settings" },
    "settings.desc": { sk: "Kam sa appka pripája, čím sa autorizuje a ako vypadá.", en: "Where the app connects, how it authorizes, and how it looks." },
    "settings.connection": { sk: "Spojenie", en: "Connection" },
    "settings.mode": { sk: "Zdroj dát", en: "Data source" },
    "settings.mode.demo": { sk: "Demo dáta", en: "Demo data" },
    "settings.mode.demoHint": {
      sk: "Bez siete. Dáta majú tvar, ktorý API vracia, vrátane stránkovania a filtrov — na dizajn a klikanie stačia.",
      en: "No network. The data has the shape the API returns, paging and filters included — enough for design work.",
    },
    "settings.mode.proxy": { sk: "Cez proxy (odporúčané)", en: "Through the proxy (recommended)" },
    "settings.mode.proxyHint": {
      sk: "Requesty idú na rovnaký origin, kľúč drží server v premennej SPERKY_API_KEY. Prehliadač kľúč nikdy nevidí a CORS nevzniká.",
      en: "Requests go to the same origin and the key stays on the server in SPERKY_API_KEY. The browser never sees the key and CORS never arises.",
    },
    "settings.mode.direct": { sk: "Priamo z prehliadača", en: "Directly from the browser" },
    "settings.mode.directHint": {
      sk: "Kľúč je uložený v localStorage a posiela sa z prehliadača. Ktokoľvek pri tomto počítači ho prečíta a eshop musí povoliť CORS.",
      en: "The key sits in localStorage and is sent from the browser. Anyone at this machine can read it, and the shop must allow CORS.",
    },
    "settings.baseUrl": { sk: "Základná URL", en: "Base URL" },
    "settings.baseUrlHint": { sk: "Bez koncového lomítka. Produkcia: https://sperky-eshop.sk", en: "No trailing slash. Production: https://sperky-eshop.sk" },
    "settings.baseUrlProxyHint": { sk: "V proxy režime sa nepoužíva — cesty idú na rovnaký origin.", en: "Unused in proxy mode — paths go to the same origin." },
    "settings.apiKey": { sk: "API kľúč (orders:read)", en: "API key (orders:read)" },
    "settings.apiKeyHint": { sk: "Posiela sa ako hlavička X-Api-Key. Používajú ho len objednávky, produkty sú verejné.", en: "Sent as the X-Api-Key header. Only orders use it; products are public." },
    "settings.apiKeyShow": { sk: "Zobraziť kľúč", en: "Show key" },
    "settings.apiKeyHide": { sk: "Skryť kľúč", en: "Hide key" },
    "settings.apiKeyClear": { sk: "Vymazať kľúč", en: "Clear key" },
    "settings.apiKeyMissing": { sk: "Kľúč nie je zadaný — objednávky vrátia „forbidden“.", en: "No key set — orders will return “forbidden”." },
    "settings.authHeader": { sk: "Hlavička", en: "Header" },
    "settings.authHeader.apiKey": { sk: "X-Api-Key", en: "X-Api-Key" },
    "settings.authHeader.bearer": { sk: "Authorization: Bearer", en: "Authorization: Bearer" },
    "settings.save": { sk: "Uložiť", en: "Save" },
    "settings.saved": { sk: "Nastavenia uložené", en: "Settings saved" },
    "settings.test": { sk: "Otestovať spojenie", en: "Test the connection" },
    "settings.testRunning": { sk: "Testuje sa…", en: "Testing…" },
    "settings.testProducts": { sk: "Produkty (verejné)", en: "Products (public)" },
    "settings.testOrders": { sk: "Objednávky (kľúč)", en: "Orders (key)" },
    "settings.testOk": { sk: "OK", en: "OK" },
    "settings.testFail": { sk: "Zlyhalo", en: "Failed" },
    "settings.appearance": { sk: "Vzhľad", en: "Appearance" },
    "settings.theme": { sk: "Téma", en: "Theme" },
    "settings.theme.dark": { sk: "Tmavá", en: "Dark" },
    "settings.theme.light": { sk: "Svetlá", en: "Light" },
    "settings.density": { sk: "Hustota", en: "Density" },
    "settings.density.cozy": { sk: "Pohodlná", en: "Cozy" },
    "settings.density.compact": { sk: "Kompaktná", en: "Compact" },
    "settings.language": { sk: "Jazyk", en: "Language" },
    "settings.log": { sk: "Posledné požiadavky", en: "Recent requests" },
    "settings.logSub": { sk: "posledných {n} — len v tejto karte prehliadača", en: "last {n} — this browser tab only" },
    "settings.logEmpty": { sk: "Zatiaľ žiadny request.", en: "No request yet." },
    "settings.logClear": { sk: "Vyčistiť log", en: "Clear the log" },
    "settings.keyWarning": {
      sk: "Kľúč z dokumentácie je platný produkčný kľúč. Keď sa dostane do prehliadača alebo do gitu, treba ho rotovať.",
      en: "The key in the documentation is a live production key. If it reaches a browser or git, rotate it.",
    },
  };

  var apiKeys = {
    "api.error.FORBIDDEN": { sk: "Kľúč chýba, je neplatný alebo nemá scope orders:read.", en: "The key is missing, invalid, or lacks the orders:read scope." },
    "api.error.RATE_LIMITED": { sk: "API zablokovalo tempo požiadaviek. Chvíľu počkaj a skús znova.", en: "The API rate-limited the requests. Wait a moment and try again." },
    "api.error.NOT_FOUND": { sk: "Záznam neexistuje.", en: "The record does not exist." },
    "api.error.NO_ID": { sk: "Chýba parameter id.", en: "The id parameter is missing." },
    "api.error.UNKNOWN_CONTROLLER": { sk: "API nepozná túto cestu.", en: "The API does not know this route." },
    "api.error.INVALID_ACTION": { sk: "API odmietlo túto akciu.", en: "The API rejected this action." },
    "api.error.METHOD_NOT_ALLOWED": { sk: "Nesprávna HTTP metóda.", en: "Wrong HTTP method." },
    "api.error.NETWORK": {
      sk: "Na API sa nedá pripojiť. V priamom režime to takto vyzerá aj zablokovaný CORS — skús proxy režim.",
      en: "The API is unreachable. In direct mode a CORS block looks exactly like this — try proxy mode.",
    },
    "api.error.BAD_RESPONSE": { sk: "Odpoveď sa nedá prečítať ako JSON.", en: "The response cannot be read as JSON." },
    "api.error.HTTP": { sk: "API odpovedalo stavom {status}.", en: "The API answered with status {status}." },
    "api.error.UNKNOWN": { sk: "Neznáma chyba.", en: "Unknown error." },
    "api.error.title": { sk: "Dáta sa nepodarilo načítať", en: "Could not load the data" },
    "api.error.forbiddenTitle": { sk: "Prístup zamietnutý", en: "Access denied" },
    "api.error.goToSettings": { sk: "Otvoriť nastavenia", en: "Open settings" },
    "api.demoBadge": { sk: "Demo dáta", en: "Demo data" },
    "api.demoNotice": {
      sk: "Appka beží na demo dátach. Prepni zdroj v Nastaveniach, keď má hovoriť so skutočným API.",
      en: "The app is running on demo data. Switch the source in Settings to talk to the real API.",
    },
    "api.directNotice": {
      sk: "Priamy režim: kľúč posiela prehliadač. Na spoločnom počítači radšej použi proxy.",
      en: "Direct mode: the browser sends the key. On a shared machine, prefer the proxy.",
    },
  };

  var KEYS = Object.assign({}, appKeys, navKeys, commonKeys, overviewKeys, ordersKeys, productsKeys, settingsKeys, apiKeys);

  var lang = "sk";
  try {
    var stored = global.localStorage && global.localStorage.getItem(LANG_KEY);
    if (stored === "sk" || stored === "en") lang = stored;
  } catch (err) {
    /* privátny režim bez localStorage — SK default je v poriadku */
  }

  function t(key, vars) {
    var entry = KEYS[key];
    if (!entry) return key;
    var text = entry[lang] || entry.sk || key;
    if (!vars) return text;
    return text.replace(/\{(\w+)\}/g, function (whole, name) {
      return Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : whole;
    });
  }

  function setLang(next) {
    if (next !== "sk" && next !== "en") return;
    lang = next;
    try {
      global.localStorage.setItem(LANG_KEY, next);
    } catch (err) {
      /* neuložené, ale prepnuté v tejto session */
    }
  }

  global.I18n = {
    t: t,
    lang: function () { return lang; },
    setLang: setLang,
    locale: function () { return lang === "en" ? "en-GB" : "sk-SK"; },
    keyCount: function () { return Object.keys(KEYS).length; },
  };
})(window);
