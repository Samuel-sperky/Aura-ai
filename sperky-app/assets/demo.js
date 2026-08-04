/* ============================================================================
   Demo dáta — appka sa dá otvoriť a preklikať bez siete a bez kľúča.

   Pravidlo: demo NESMIE vracať bohatší tvar, než vracia skutočné API.
   Zoznam objednávok pozná len id / date_add / total_paid / currency; krajina je
   až v detaile, aj keď sa podľa nej dá filtrovať. Kto to tu „vylepší“, postaví
   dizajn na poliach, ktoré v produkcii neprídu.

   Dáta sú deterministické (seedovaný generátor), takže dizajn sa medzi
   reloadmi nemení a screenshoty sú porovnateľné.
   ========================================================================== */
(function (global) {
  "use strict";

  var LATENCY_MS = 180; // aby boli skeletony a spinnery viditeľné

  var COUNTRIES = [
    { iso: "SK", sk: "Slovensko", en: "Slovakia", weight: 62 },
    { iso: "CZ", sk: "Česko", en: "Czechia", weight: 18 },
    { iso: "HU", sk: "Maďarsko", en: "Hungary", weight: 5 },
    { iso: "AT", sk: "Rakúsko", en: "Austria", weight: 4 },
    { iso: "DE", sk: "Nemecko", en: "Germany", weight: 4 },
    { iso: "PL", sk: "Poľsko", en: "Poland", weight: 3 },
    { iso: "SI", sk: "Slovinsko", en: "Slovenia", weight: 2 },
    { iso: "RO", sk: "Rumunsko", en: "Romania", weight: 2 },
  ];

  var MATERIALS = ["Chirurgická ocel", "Striebro 925", "Pozlátená ocel", "Titán", "Zlato 585"];
  var KINDS = ["Náramok", "Náhrdelník", "Prívesok", "Náušnice", "Prsteň", "Retiazka", "Set", "Piercing"];
  var MOTIFS = ["so srdcom", "s kubickou zirkóniou", "s perlou", "s krížikom", "s gravírovaním", "s onyxom", "s medailónom", "s nekonečnom", "s guličkami", "s mesiačikom"];
  var COLORS = ["Strieborná", "Zlatá", "Ružovozlatá", "Čierna", "Oranžová - Žltá", "Modrá"];
  var SIZES = ["48", "50", "52", "54", "56", "58"];

  /* mulberry32 — malý deterministický PRNG */
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var x = a;
      x = Math.imul(x ^ (x >>> 15), 1 | x);
      x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pick(rand, list) {
    return list[Math.floor(rand() * list.length)];
  }

  function round2(n) {
    return Math.round(n * 100) / 100;
  }

  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function stamp(date) {
    return (
      date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate()) +
      " " + pad(date.getHours()) + ":" + pad(date.getMinutes()) + ":" + pad(date.getSeconds())
    );
  }

  /* ── produkty ─────────────────────────────────────────────────────────── */
  var PRODUCTS = (function build() {
    var rand = rng(20260804);
    var out = [];
    for (var i = 0; i < 420; i += 1) {
      var id = 22 + i * 7 + Math.floor(rand() * 5);
      var kind = pick(rand, KINDS);
      var material = pick(rand, MATERIALS);
      var motif = pick(rand, MOTIFS);
      var hasAttributes = rand() < 0.42;
      var price = round2(4 + rand() * 86);
      var variants = [];
      if (hasAttributes) {
        var count = 2 + Math.floor(rand() * 4);
        var useSizes = kind === "Prsteň";
        for (var v = 0; v < count; v += 1) {
          variants.push({
            id_product_attribute: id * 4 + v,
            price_impact: rand() < 0.7 ? 0 : round2(rand() * 6 - 1),
            reference: "C" + (10 + (i % 80)) + "." + (v + 1),
            ean13: String(1000000 + id * 13 + v),
            quantity: rand() < 0.18 ? 0 : Math.floor(rand() * 42),
            is_default: v === 0,
            values: [useSizes ? "Veľkosť " + SIZES[v % SIZES.length] : COLORS[v % COLORS.length]],
          });
        }
      }
      out.push({
        id: id,
        name: kind + " z materiálu " + material.toLowerCase() + " " + motif,
        price: rand() < 0.3 ? price + rand() * 0.999999 : price, // API vracia aj 6 desatinných miest
        has_attributes: hasAttributes,
        description_short: kind + " " + motif + ", " + material.toLowerCase() + ". Antialergický povrch, vhodný na každodenné nosenie.",
        description:
          "<h3>" + kind + " " + motif + "</h3>" +
          "<p>Vyrobené z materiálu <strong>" + material.toLowerCase() + "</strong>. Povrch je odolný voči zmene farby a vode.</p>" +
          "<ul><li>Materiál: " + material + "</li><li>Zapínanie: karabínka</li><li>Balenie: darčeková krabička</li></ul>",
        variants: variants,
      });
    }
    return out;
  })();

  var PRODUCT_BY_ID = PRODUCTS.reduce(function (map, product) {
    map[product.id] = product;
    return map;
  }, {});

  /* ── objednávky ───────────────────────────────────────────────────────── */
  var ORDERS = (function build() {
    var rand = rng(773311);
    var out = [];
    var id = 1763435;
    var when = new Date(2026, 7, 4, 18, 40, 0); // 2026-08-04, o niekoľko minút dozadu
    var weighted = [];
    COUNTRIES.forEach(function (country) {
      for (var w = 0; w < country.weight; w += 1) weighted.push(country);
    });

    for (var i = 0; i < 640; i += 1) {
      var country = pick(rand, weighted);
      var itemCount = 1 + Math.floor(rand() * 3.4);
      var items = [];
      var goods = 0;
      for (var k = 0; k < itemCount; k += 1) {
        var product = PRODUCTS[Math.floor(rand() * PRODUCTS.length)];
        var qty = 1 + Math.floor(rand() * 2.3);
        items.push({ id: product.id, qty: qty });
        goods += product.price * qty;
      }
      var shipping = country.iso === "SK" ? 3.9 : 6.5;
      out.push({
        id: id,
        date_add: stamp(when),
        total_paid: round2(goods * 1.2 + shipping),
        currency: "EUR",
        products: items,
        country: country.sk,
        country_en: country.en,
        country_iso: country.iso,
      });
      id -= 1 + Math.floor(rand() * 3);
      when = new Date(when.getTime() - Math.floor((2 + rand() * 12) * 3600 * 1000));
    }
    return out; // najnovšie prvé — rovnako ako produkčné API
  })();

  var ORDER_BY_ID = ORDERS.reduce(function (map, order) {
    map[order.id] = order;
    return map;
  }, {});

  /* ── filtre a stránkovanie ────────────────────────────────────────────── */
  function dayOf(dateAdd) {
    return String(dateAdd).slice(0, 10);
  }

  function filterOrders(params) {
    return ORDERS.filter(function (order) {
      if (params.date_from && dayOf(order.date_add) < params.date_from) return false;
      if (params.date_to && dayOf(order.date_add) > params.date_to) return false;
      if (params.country && order.country_iso !== String(params.country).toUpperCase()) return false;
      if (params.total_min !== undefined && params.total_min !== "" && order.total_paid < Number(params.total_min)) return false;
      if (params.total_max !== undefined && params.total_max !== "" && order.total_paid > Number(params.total_max)) return false;
      return true;
    });
  }

  function paginate(rows, params) {
    var perPage = Math.min(Math.max(1, Number(params.per_page) || 50), 100);
    var page = Math.max(1, Number(params.page) || 1);
    var start = (page - 1) * perPage;
    return {
      rows: rows.slice(start, start + perPage),
      page: page,
      perPage: perPage,
      total: rows.length,
    };
  }

  function later(value) {
    return new Promise(function (resolve) {
      global.setTimeout(function () { resolve(value); }, LATENCY_MS);
    });
  }

  function notFound() {
    return { ok: false, code: "NOT_FOUND", status: 200, message: global.I18n.t("api.error.NOT_FOUND") };
  }

  /* ── operácie (rovnaké podpisy ako v api.js) ──────────────────────────── */
  function listOrders(params) {
    var page = paginate(filterOrders(params), params);
    return later({
      ok: true,
      data: {
        rows: page.rows.map(function (order) {
          /* zámerne len štyri polia — presne to, čo vracia produkcia */
          return { id: order.id, date_add: order.date_add, total_paid: order.total_paid, currency: order.currency };
        }),
        page: page.page,
        perPage: page.perPage,
        total: page.total,
      },
    });
  }

  function getOrder(args) {
    var order = ORDER_BY_ID[args.id];
    if (!order) return later(notFound());
    var lang = global.I18n.lang();
    return later({
      ok: true,
      data: {
        ok: true,
        id: order.id,
        date_add: order.date_add,
        total_paid: order.total_paid,
        currency: order.currency,
        products: order.products.map(function (item) { return { id: item.id, qty: item.qty }; }),
        country: lang === "en" ? order.country_en : order.country,
        country_iso: order.country_iso,
      },
    });
  }

  function listProducts(params) {
    var page = paginate(PRODUCTS, params);
    return later({
      ok: true,
      data: {
        rows: page.rows.map(function (product) {
          return { id: product.id, name: product.name, price: product.price, has_attributes: product.has_attributes };
        }),
        page: page.page,
        perPage: page.perPage,
        total: page.total,
      },
    });
  }

  function getProduct(args) {
    var product = PRODUCT_BY_ID[args.id];
    if (!product) return later(notFound());
    return later({
      ok: true,
      data: {
        ok: true,
        id: product.id,
        name: product.name,
        price: product.price,
        description: product.description,
        description_short: product.description_short,
        has_attributes: product.has_attributes,
        attributes: product.variants,
      },
    });
  }

  function describe(op, args) {
    var query = Object.keys(args || {})
      .filter(function (name) { return args[name] !== undefined && args[name] !== ""; })
      .map(function (name) { return name + "=" + args[name]; })
      .join("&");
    var path = {
      listOrders: "/api/order",
      getOrder: "/api/order/get",
      listProducts: "/api/products",
      getProduct: "/api/products/get",
    }[op];
    return path + (query ? "?" + query : "") + "  [demo]";
  }

  global.SperkyDemo = {
    listOrders: listOrders,
    getOrder: getOrder,
    listProducts: listProducts,
    getProduct: getProduct,
    describe: describe,
    latency: function () { return LATENCY_MS; },
  };
})(window);
