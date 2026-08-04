/* ============================================================================
   Šperky API klient — JEDINÉ miesto, ktoré sa dotýka siete.

   Kontrakt vrstvy: žiadna funkcia tu NEVYHADZUJE. Vracia buď
     { ok: true,  data: … }
   alebo
     { ok: false, code: "FORBIDDEN" | "RATE_LIMITED" | …, status, message }
   `message` je už preložený cez i18n, takže view ho len vykreslí.

   Prečo je to takto: API signalizuje chybu tromi rôznymi spôsobmi —
   HTTP stavom, `{"error":"…"}` na najvyššej úrovni a `{"result":{"ok":false,
   "error":"…"}}` vnútri obálky. Kto by to riešil vo view, spraví to trikrát
   a raz nesprávne.

   Režimy (`mode`):
     demo   — nesiaha na sieť, dáta dodáva demo.js
     proxy  — rovnaký origin, kľúč drží server (SPERKY_API_KEY)
     direct — kľúč posiela prehliadač; vyžaduje CORS na strane eshopu
   ========================================================================== */
(function (global) {
  "use strict";

  var t = global.I18n.t;

  var LS = {
    mode: "sperky.mode",
    baseUrl: "sperky.baseUrl",
    apiKey: "sperky.apiKey",
    authHeader: "sperky.authHeader",
  };

  var DEFAULTS = {
    mode: "demo", // bezpečný default: appka po otvorení nič neposiela nikam
    baseUrl: "https://sperky-eshop.sk",
    apiKey: "",
    authHeader: "apiKey", // "apiKey" | "bearer"
  };

  var TIMEOUT_MS = 15000;
  var LOG_MAX = 25;
  var PER_PAGE_MAX = 100; // dokumentovaný strop, appka ho nesmie prekročiť

  var log = [];
  var logListeners = [];

  /* ── konfigurácia ─────────────────────────────────────────────────────── */
  function read(key, fallback) {
    try {
      var value = global.localStorage.getItem(key);
      return value === null || value === "" ? fallback : value;
    } catch (err) {
      return fallback;
    }
  }

  function config() {
    var mode = read(LS.mode, DEFAULTS.mode);
    if (mode !== "demo" && mode !== "proxy" && mode !== "direct") mode = DEFAULTS.mode;
    var header = read(LS.authHeader, DEFAULTS.authHeader);
    return {
      mode: mode,
      baseUrl: String(read(LS.baseUrl, DEFAULTS.baseUrl)).replace(/\/+$/, ""),
      apiKey: read(LS.apiKey, DEFAULTS.apiKey),
      authHeader: header === "bearer" ? "bearer" : "apiKey",
    };
  }

  function setConfig(patch) {
    Object.keys(patch).forEach(function (name) {
      if (!LS[name]) return;
      try {
        global.localStorage.setItem(LS[name], String(patch[name]));
      } catch (err) {
        /* bez localStorage sa nastavenie neprežije reload — vedomý kompromis */
      }
    });
  }

  /* ── log požiadaviek ──────────────────────────────────────────────────── */
  function pushLog(entry) {
    log.unshift(entry);
    if (log.length > LOG_MAX) log.length = LOG_MAX;
    logListeners.forEach(function (fn) { fn(log); });
  }

  /* ── mapovanie chýb ───────────────────────────────────────────────────── */
  var ERROR_CODES = {
    forbidden: "FORBIDDEN",
    rate_limited: "RATE_LIMITED",
    unknown_controller: "UNKNOWN_CONTROLLER",
    invalid_action: "INVALID_ACTION",
    method_not_allowed: "METHOD_NOT_ALLOWED",
    "not found": "NOT_FOUND",
    not_found: "NOT_FOUND",
    "no id": "NO_ID",
    no_id: "NO_ID",
  };

  function fail(code, status, vars) {
    var key = "api.error." + code;
    var message = t(key, vars);
    return {
      ok: false,
      code: code,
      status: status || 0,
      message: message === key ? t("api.error.UNKNOWN") : message,
    };
  }

  function failFromApi(raw, status) {
    var code = ERROR_CODES[String(raw || "").toLowerCase()];
    if (code) return fail(code, status);
    return { ok: false, code: "API", status: status || 0, message: String(raw || t("api.error.UNKNOWN")) };
  }

  /* ── query string ─────────────────────────────────────────────────────── */
  function buildQuery(params) {
    var usp = new URLSearchParams();
    Object.keys(params || {}).forEach(function (name) {
      var value = params[name];
      if (value === undefined || value === null || value === "") return;
      usp.set(name, String(value));
    });
    var qs = usp.toString();
    return qs ? "?" + qs : "";
  }

  function clampPerPage(value) {
    var n = Number(value) || 50;
    return Math.min(Math.max(1, Math.round(n)), PER_PAGE_MAX);
  }

  /* ── jadro: jeden request ─────────────────────────────────────────────── */
  function request(path, params, opts) {
    var cfg = config();
    var options = opts || {};
    var url = (cfg.mode === "proxy" ? "" : cfg.baseUrl) + path + buildQuery(params);
    var headers = { Accept: "application/json" };

    /* Kľúč posielame LEN v direct režime a LEN na chránené cesty. V proxy režime
       ho pripája server, a produkty ho nepotrebujú vôbec — posielať ho zbytočne
       znamená vystaviť ho zbytočne. */
    if (options.auth && cfg.mode === "direct" && cfg.apiKey) {
      if (cfg.authHeader === "bearer") headers.Authorization = "Bearer " + cfg.apiKey;
      else headers["X-Api-Key"] = cfg.apiKey;
    }

    var started = (global.performance && global.performance.now()) || 0;
    var controller = typeof AbortController === "function" ? new AbortController() : null;
    var timer = controller ? global.setTimeout(function () { controller.abort(); }, TIMEOUT_MS) : null;

    function record(status, code) {
      var now = (global.performance && global.performance.now()) || started;
      pushLog({
        time: new Date(),
        url: path + buildQuery(params),
        status: status,
        ms: Math.round(now - started),
        code: code || null,
        mode: cfg.mode,
      });
    }

    return global
      .fetch(url, {
        method: "GET",
        headers: headers,
        signal: controller ? controller.signal : undefined,
        credentials: "omit",
        cache: "no-store",
      })
      .then(function (response) {
        return response.text().then(function (text) {
          return { response: response, text: text };
        });
      })
      .then(function (pair) {
        var status = pair.response.status;
        var body;
        try {
          body = JSON.parse(pair.text);
        } catch (err) {
          record(status, "BAD_RESPONSE");
          return fail("BAD_RESPONSE", status);
        }

        /* Chyba na najvyššej úrovni: {"error":"forbidden"} atď. Prichádza aj so
           stavom 200, preto sa kontroluje pred stavom. */
        if (body && typeof body.error === "string") {
          var topLevel = failFromApi(body.error, status);
          record(status, topLevel.code);
          return topLevel;
        }

        if (!pair.response.ok) {
          record(status, "HTTP");
          return fail("HTTP", status, { status: status });
        }

        var result = body && body.result;
        if (result === undefined || result === null) {
          record(status, "BAD_RESPONSE");
          return fail("BAD_RESPONSE", status);
        }

        /* Chyba v obálke: {"result":{"ok":false,"error":"not found"}} */
        if (result.ok === false) {
          var inner = failFromApi(result.error, status);
          record(status, inner.code);
          return inner;
        }

        record(status, null);
        return { ok: true, data: result };
      })
      .catch(function (err) {
        /* Zlyhaný CORS preflight a mŕtva sieť sú z prehliadača nerozlíšiteľné —
           obe skončia ako TypeError. Text chyby to hovorí nahlas. */
        var aborted = err && err.name === "AbortError";
        record(0, aborted ? "TIMEOUT" : "NETWORK");
        return fail("NETWORK", 0);
      })
      .then(function (outcome) {
        if (timer) global.clearTimeout(timer);
        return outcome;
      });
  }

  /* ── demo adaptér ─────────────────────────────────────────────────────── */
  function demo(op, args) {
    var provider = global.SperkyDemo;
    if (!provider) return Promise.resolve(fail("UNKNOWN", 0));
    return provider[op](args).then(function (outcome) {
      pushLog({
        time: new Date(),
        url: provider.describe(op, args),
        status: outcome.ok ? 200 : 404,
        ms: provider.latency(),
        code: outcome.ok ? null : outcome.code,
        mode: "demo",
      });
      return outcome;
    });
  }

  function isDemo() {
    return config().mode === "demo";
  }

  /* ── operácie ─────────────────────────────────────────────────────────── */
  function listOrders(query) {
    var q = query || {};
    var params = {
      page: Math.max(1, Number(q.page) || 1),
      per_page: clampPerPage(q.per_page),
      date_from: q.date_from,
      date_to: q.date_to,
      country: q.country ? String(q.country).toUpperCase() : "",
      total_min: q.total_min,
      total_max: q.total_max,
    };
    if (isDemo()) return demo("listOrders", params);
    return request("/api/order", params, { auth: true }).then(normalizeList);
  }

  function getOrder(id) {
    if (!id) return Promise.resolve(fail("NO_ID", 0));
    if (isDemo()) return demo("getOrder", { id: Number(id) });
    return request("/api/order/get", { id: id }, { auth: true });
  }

  function listProducts(query) {
    var q = query || {};
    var params = {
      page: Math.max(1, Number(q.page) || 1),
      per_page: clampPerPage(q.per_page),
      id_lang: q.id_lang,
    };
    if (isDemo()) return demo("listProducts", params);
    return request("/api/products", params, { auth: false }).then(normalizeList);
  }

  function getProduct(id, idLang) {
    if (!id) return Promise.resolve(fail("NO_ID", 0));
    if (isDemo()) return demo("getProduct", { id: Number(id) });
    return request("/api/products/get", { id: id, id_lang: idLang }, { auth: false });
  }

  /* Zoznamy prichádzajú ako {data, page, per_page, total}. Keď niektoré pole
     chýba, dopočítame ho z toho, čo prišlo — view smie počítať s tvarom. */
  function normalizeList(outcome) {
    if (!outcome.ok) return outcome;
    var d = outcome.data || {};
    var rows = Array.isArray(d.data) ? d.data : [];
    return {
      ok: true,
      data: {
        rows: rows,
        page: Number(d.page) || 1,
        perPage: Number(d.per_page) || rows.length,
        total: Number(d.total) || rows.length,
      },
    };
  }

  /* Test spojenia pre Nastavenia: produkty (verejné) a objednávky (kľúč)
     samostatne, aby bolo vidieť, ktorá polovica zlyhala. */
  function ping() {
    return Promise.all([
      listProducts({ page: 1, per_page: 1 }),
      listOrders({ page: 1, per_page: 1 }),
    ]).then(function (pair) {
      return { products: pair[0], orders: pair[1] };
    });
  }

  global.Api = {
    config: config,
    setConfig: setConfig,
    perPageMax: PER_PAGE_MAX,
    listOrders: listOrders,
    getOrder: getOrder,
    listProducts: listProducts,
    getProduct: getProduct,
    ping: ping,
    log: function () { return log.slice(); },
    clearLog: function () { log = []; logListeners.forEach(function (fn) { fn(log); }); },
    onLog: function (fn) { logListeners.push(fn); },
  };
})(window);
