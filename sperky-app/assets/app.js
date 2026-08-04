/* ============================================================================
   Šperky API klient — view vrstva.

   Delenie zodpovednosti:
     i18n.js  — texty
     api.js   — sieť a mapovanie chýb (nikdy nevyhadzuje)
     demo.js  — dáta bez siete
     app.js   — router, render, stavy, overlaye

   Dve pravidlá, ktoré tu držia dizajn pri pravde:
   1) Popisok, ktorý hovorí o počte alebo rozsahu, sa čita z TEJ ISTEJ hodnoty,
      z akej sa kreslí obsah (napr. súčet stránky z načítaných riadkov), nikdy
      z konštanty v texte.
   2) Ovládací prvok sa nesmie nabízať pre stav, ktorý API odmietne — filtre
      posielame len v podobe, akú endpoint dokumentuje.
   ========================================================================== */
(function (global) {
  "use strict";

  var doc = global.document;
  var t = global.I18n.t;
  var Api = global.Api;

  /* ── ikony (lucide, aria-hidden) ──────────────────────────────────────── */
  var ICONS = {
    gem: '<path d="M6 3h12l4 6-10 12L2 9Z"/><path d="M2 9h20"/><path d="m12 21 4-12-4-6-4 6 4 12"/>',
    gauge: '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
    receipt: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M8 7h8"/><path d="M8 11h8"/><path d="M8 15h5"/>',
    package: '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
    settings: '<path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>',
    menu: '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.9 4.9 1.4 1.4"/><path d="m17.7 17.7 1.4 1.4"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.3 17.7-1.4 1.4"/><path d="m19.1 4.9-1.4 1.4"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    rows: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/>',
    languages: '<path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 9-9 9 9 0 0 1 6.7 3H21"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9 9 0 0 1-6.7-3H3"/><path d="M3 21v-5h5"/>',
    filter: '<path d="M3 5h18l-7 8v6l-4-2v-4Z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-5"/><path d="M12 8h.01"/>',
    alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    plug: '<path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v3a6 6 0 0 1-12 0V8Z"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    "arrow-right": '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    "chevron-left": '<path d="m15 18-6-6 6-6"/>',
    "chevron-right": '<path d="m9 18 6-6-6-6"/>',
    "external-link": '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    copy: '<rect width="13" height="13" x="9" y="9" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1Z"/>',
    lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  };

  function icon(name, size) {
    var svg = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", String(size || 16));
    svg.setAttribute("height", String(size || 16));
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.7");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML = ICONS[name] || "";
    return svg;
  }

  function paintIcons(root) {
    (root || doc).querySelectorAll("[data-icon]").forEach(function (host) {
      if (host.firstChild) return;
      host.appendChild(icon(host.dataset.icon, Number(host.dataset.iconSize) || 16));
    });
  }

  /* ── DOM helper ───────────────────────────────────────────────────────── */
  function el(tag, attrs, children) {
    var node = doc.createElement(tag);
    Object.keys(attrs || {}).forEach(function (name) {
      var value = attrs[name];
      if (value === undefined || value === null || value === false) return;
      if (name === "class") node.className = value;
      else if (name === "text") node.textContent = String(value);
      else if (name === "html") node.innerHTML = value;
      else if (name === "onClick") node.addEventListener("click", value);
      else if (name === "dataset") Object.keys(value).forEach(function (k) { node.dataset[k] = value[k]; });
      else if (value === true) node.setAttribute(name, "");
      else node.setAttribute(name, String(value));
    });
    (children || []).forEach(function (child) {
      if (child === null || child === undefined || child === false) return;
      node.appendChild(typeof child === "string" ? doc.createTextNode(child) : child);
    });
    return node;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
    return node;
  }

  function iconBtn(name, label, cls, onClick) {
    var button = el("button", { class: cls, type: "button", onClick: onClick }, [icon(name)]);
    button.appendChild(el("span", { class: "sr-only", text: label }));
    return button;
  }

  /* ── formátovanie ─────────────────────────────────────────────────────── */
  var fmt = {
    int: function (value) {
      var n = Number(value);
      if (!isFinite(n)) return "—";
      return new Intl.NumberFormat(global.I18n.locale()).format(n);
    },
    money: function (value, currency) {
      var n = Number(value);
      if (!isFinite(n)) return "—";
      try {
        return new Intl.NumberFormat(global.I18n.locale(), {
          style: "currency",
          currency: currency || "EUR",
          maximumFractionDigits: 2,
        }).format(n);
      } catch (err) {
        /* neznámy ISO kód meny — radšej číslo s kódom než výnimka */
        return n.toFixed(2) + " " + (currency || "");
      }
    },
    /* API vracia "YYYY-MM-DD HH:MM:SS"; Safari to bez `T` neparsuje. */
    parse: function (value) {
      if (!value) return null;
      var date = new Date(String(value).replace(" ", "T"));
      return isNaN(date.getTime()) ? null : date;
    },
    date: function (value) {
      var date = fmt.parse(value);
      if (!date) return String(value || "—");
      return new Intl.DateTimeFormat(global.I18n.locale(), { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
    },
    time: function (value) {
      var date = fmt.parse(value);
      if (!date) return "";
      return new Intl.DateTimeFormat(global.I18n.locale(), { hour: "2-digit", minute: "2-digit" }).format(date);
    },
    clock: function (date) {
      return new Intl.DateTimeFormat(global.I18n.locale(), { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(date);
    },
  };

  /* ── sanitizácia popisu produktu ──────────────────────────────────────────
     `description` prichádza z eshopu ako HTML. Vykresliť ho ako innerHTML bez
     filtra znamená pustiť si do stránky čokoľvek, čo je v katalógu — vrátane
     <script> a on* atribútov. Allowlist je zámerne krátky. */
  var ALLOWED_TAGS = {
    P: 1, BR: 1, STRONG: 1, B: 1, EM: 1, I: 1, U: 1, SPAN: 1, DIV: 1, SMALL: 1,
    UL: 1, OL: 1, LI: 1, H1: 1, H2: 1, H3: 1, H4: 1, H5: 1, H6: 1,
    TABLE: 1, THEAD: 1, TBODY: 1, TR: 1, TD: 1, TH: 1, A: 1, IMG: 1, HR: 1,
  };

  function sanitizeHtml(html) {
    var host = el("div", { class: "spProse" });
    var parsed;
    try {
      parsed = new DOMParser().parseFromString("<body>" + String(html || "") + "</body>", "text/html");
    } catch (err) {
      host.textContent = String(html || "");
      return host;
    }

    (function walk(source, target) {
      Array.prototype.forEach.call(source.childNodes, function (node) {
        if (node.nodeType === 3) {
          target.appendChild(doc.createTextNode(node.nodeValue));
          return;
        }
        if (node.nodeType !== 1) return;
        if (!ALLOWED_TAGS[node.tagName]) {
          /* neznámy prvok zahodíme, ale jeho text zachováme */
          walk(node, target);
          return;
        }
        var copy = doc.createElement(node.tagName.toLowerCase());
        if (node.tagName === "A") {
          var href = node.getAttribute("href") || "";
          if (/^https?:\/\//i.test(href)) {
            copy.setAttribute("href", href);
            copy.setAttribute("rel", "noopener noreferrer");
            copy.setAttribute("target", "_blank");
          }
        }
        if (node.tagName === "IMG") {
          var src = node.getAttribute("src") || "";
          if (!/^https?:\/\//i.test(src)) return;
          copy.setAttribute("src", src);
          copy.setAttribute("alt", node.getAttribute("alt") || "");
          copy.setAttribute("loading", "lazy");
        }
        walk(node, copy);
        target.appendChild(copy);
      });
    })(parsed.body, host);

    return host;
  }

  /* ── toasty ───────────────────────────────────────────────────────────── */
  function toast(kind, message) {
    var stack = doc.getElementById("toasts");
    var node = el("div", { class: "toast toast-" + kind, role: kind === "error" ? "alert" : "status" }, [
      icon(kind === "ok" ? "check" : kind === "error" ? "alert" : "info"),
      el("span", { text: message }),
    ]);
    node.appendChild(iconBtn("x", t("common.close"), "toast-close", function () { node.remove(); }));
    stack.appendChild(node);
    global.setTimeout(function () { node.remove(); }, 6000);
  }

  function copyText(value) {
    var done = function () { toast("ok", t("common.copied")); };
    var failed = function () { toast("error", t("common.copyFailed")); };
    if (global.navigator.clipboard && global.navigator.clipboard.writeText) {
      global.navigator.clipboard.writeText(value).then(done, failed);
      return;
    }
    failed();
  }

  /* ── i18n aplikácia na statický markup ────────────────────────────────── */
  function applyI18n(root) {
    (root || doc).querySelectorAll("[data-i18n]").forEach(function (node) {
      node.textContent = t(node.dataset.i18n);
    });
    (root || doc).querySelectorAll("[data-i18n-attr]").forEach(function (node) {
      node.dataset.i18nAttr.split(";").forEach(function (pair) {
        var parts = pair.split(":");
        if (parts.length !== 2) return;
        node.setAttribute(parts[0].trim(), t(parts[1].trim()));
      });
    });
  }

  /* ── téma / hustota / jazyk ───────────────────────────────────────────── */
  var prefs = {
    theme: function () { return doc.documentElement.dataset.theme === "light" ? "light" : "dark"; },
    density: function () { return doc.documentElement.dataset.density === "compact" ? "compact" : "cozy"; },
    setTheme: function (value) {
      doc.documentElement.dataset.theme = value === "light" ? "light" : "dark";
      store("sperky.theme", value);
      syncChrome();
    },
    setDensity: function (value) {
      if (value === "compact") doc.documentElement.dataset.density = "compact";
      else delete doc.documentElement.dataset.density;
      store("sperky.density", value);
      syncChrome();
    },
    setLang: function (value) {
      global.I18n.setLang(value);
      doc.documentElement.lang = value;
      applyI18n(doc);
      syncChrome();
      renderCurrentView(true);
    },
  };

  function store(key, value) {
    try {
      global.localStorage.setItem(key, value);
    } catch (err) {
      /* nastavenie zostáva len v tejto session */
    }
  }

  /* ── stav a router ────────────────────────────────────────────────────── */
  var ROUTES = { overview: 1, orders: 1, products: 1, settings: 1 };
  var current = { route: "overview", id: null, query: new URLSearchParams() };
  var rendered = { ordersKey: null, productsKey: null, overviewLoaded: false };
  var tokens = { orders: 0, products: 0, overview: 0, detail: 0 };
  var openedFromList = false;

  function parseHash() {
    var raw = String(global.location.hash || "").replace(/^#\/?/, "");
    var split = raw.split("?");
    var segments = split[0].split("/").filter(Boolean);
    var route = segments[0] || "overview";
    return {
      route: ROUTES[route] ? route : "overview",
      id: segments[1] ? decodeURIComponent(segments[1]) : null,
      query: new URLSearchParams(split[1] || ""),
    };
  }

  function hashFor(route, query, id) {
    var qs = query ? query.toString() : "";
    return "#/" + route + (id ? "/" + encodeURIComponent(id) : "") + (qs ? "?" + qs : "");
  }

  function go(route, query, id) {
    global.location.hash = hashFor(route, query, id);
  }

  function listQuery() {
    /* kópia bez detailových parametrov — detail nesmie zmeniť stav zoznamu */
    return new URLSearchParams(current.query.toString());
  }

  function onHashChange() {
    var next = parseHash();
    var routeChanged = next.route !== current.route;
    current = next;
    syncNav();
    closeOverlay(true);

    doc.querySelectorAll("[id^='view-']").forEach(function (section) {
      section.hidden = section.id !== "view-" + current.route;
    });
    doc.getElementById("topbarTitle").textContent = t("nav." + current.route);
    if (routeChanged) doc.getElementById("main").scrollIntoView({ block: "start" });

    renderCurrentView(false);

    if (current.id) {
      if (current.route === "orders") openOrderDetail(current.id);
      if (current.route === "products") openProductDetail(current.id);
    }
  }

  function renderCurrentView(force) {
    renderModeNotice();
    if (current.route === "overview") views.overview(force);
    if (current.route === "orders") views.orders(force);
    if (current.route === "products") views.products(force);
    if (current.route === "settings") views.settings(force);
  }

  function syncNav() {
    doc.querySelectorAll(".nav-item").forEach(function (link) {
      var active = link.dataset.route === current.route;
      link.classList.toggle("active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  /* ── chrome: zdroj dát, prepínače ─────────────────────────────────────── */
  function syncChrome() {
    var cfg = Api.config();
    var badge = doc.getElementById("sourceBadge");
    badge.dataset.mode = cfg.mode;
    doc.getElementById("sourceLabel").textContent = t("settings.mode." + cfg.mode);
    doc.getElementById("baseUrlLabel").textContent =
      cfg.mode === "direct" ? cfg.baseUrl.replace(/^https?:\/\//, "") : cfg.mode === "proxy" ? global.location.host : "";

    var themeBtn = doc.getElementById("themeBtn");
    clear(themeBtn).appendChild(icon(prefs.theme() === "dark" ? "sun" : "moon"));
    themeBtn.appendChild(el("span", { class: "sr-only", text: t("app.theme.toggle") }));

    var densityBtn = doc.getElementById("densityBtn");
    clear(densityBtn).appendChild(icon("rows"));
    densityBtn.appendChild(el("span", { class: "sr-only", text: t("app.density.toggle") }));

    doc.getElementById("langBtnLabel").textContent = global.I18n.lang() === "sk" ? "EN" : "SK";
    doc.getElementById("langBtn").setAttribute("aria-label", t("app.lang.toggle"));
    doc.getElementById("topbarTitle").textContent = t("nav." + current.route);
  }

  function renderModeNotice() {
    var host = clear(doc.getElementById("modeNotice"));
    var mode = Api.config().mode;
    if (current.route === "settings" || mode === "proxy") return;

    var notice = el("div", { class: "notice " + (mode === "demo" ? "notice-accent" : "notice-warn") }, [
      icon(mode === "demo" ? "info" : "alert"),
      el("div", { class: "notice-body", text: t(mode === "demo" ? "api.demoNotice" : "api.directNotice") }),
      el("a", { class: "btn btn-sm btn-outline", href: "#/settings", text: t("api.error.goToSettings") }),
    ]);
    host.appendChild(notice);
  }

  function setNavCount(id, value) {
    var node = doc.getElementById(id);
    if (value === null || value === undefined) {
      node.hidden = true;
      return;
    }
    node.hidden = false;
    node.textContent = fmt.int(value);
  }

  /* ── zdieľané stavy ───────────────────────────────────────────────────── */
  function stateBlock(options) {
    var wrap = el("div", { class: "state " + (options.tone || "state-muted") }, [
      el("div", { class: "state-icon" }, [icon(options.icon || "inbox", 24)]),
      el("p", { class: "state-title", text: options.title }),
      options.desc ? el("p", { class: "state-desc", text: options.desc }) : null,
    ]);
    if (options.actions && options.actions.length) {
      wrap.appendChild(el("div", { class: "state-actions" }, options.actions));
    }
    return wrap;
  }

  function errorBlock(outcome, onRetry) {
    var forbidden = outcome.code === "FORBIDDEN";
    var actions = [];
    if (onRetry) {
      actions.push(el("button", { class: "btn btn-outline", type: "button", text: t("common.retry"), onClick: onRetry }));
    }
    if (forbidden || outcome.code === "NETWORK") {
      actions.push(el("a", { class: "btn btn-accent", href: "#/settings", text: t("api.error.goToSettings") }));
    }
    return stateBlock({
      tone: "state-error",
      icon: forbidden ? "lock" : "alert",
      title: t(forbidden ? "api.error.forbiddenTitle" : "api.error.title"),
      desc: outcome.message,
      actions: actions,
    });
  }

  function skeletonTable(rows, cols) {
    var body = el("div", { class: "skeleton-stack" });
    for (var r = 0; r < rows; r += 1) {
      var line = el("div", { class: "row", style: "gap: var(--space-3)" });
      for (var c = 0; c < cols; c += 1) {
        line.appendChild(el("div", { class: "skeleton", style: "flex: " + (c === 1 ? 4 : 1) }));
      }
      body.appendChild(line);
    }
    return body;
  }

  /* ── pager ────────────────────────────────────────────────────────────── */
  function renderPager(host, meta, onPage) {
    clear(host);
    if (!meta || !meta.total) {
      host.hidden = true;
      return;
    }
    host.hidden = false;
    var pages = Math.max(1, Math.ceil(meta.total / meta.perPage));
    var from = (meta.page - 1) * meta.perPage + 1;
    var to = Math.min(meta.total, from + meta.rowCount - 1);

    host.appendChild(el("span", {
      class: "pagination-info",
      text: t("common.range", { from: fmt.int(from), to: fmt.int(to), total: fmt.int(meta.total) }),
    }));
    host.appendChild(el("div", { class: "spacer" }));

    var pageInput = el("input", {
      class: "input tnum",
      style: "width: 78px; text-align: center",
      inputmode: "numeric",
      value: String(meta.page),
      "aria-label": t("common.page"),
    });
    pageInput.addEventListener("change", function () {
      var wanted = Math.min(Math.max(1, Number(pageInput.value) || 1), pages);
      pageInput.value = String(wanted);
      if (wanted !== meta.page) onPage(wanted);
    });

    var prev = el("button", { class: "btn btn-outline btn-sm", type: "button", disabled: meta.page <= 1 }, [
      icon("chevron-left"), el("span", { text: t("common.prev") }),
    ]);
    prev.addEventListener("click", function () { onPage(meta.page - 1); });

    var next = el("button", { class: "btn btn-outline btn-sm", type: "button", disabled: meta.page >= pages }, [
      el("span", { text: t("common.next") }), icon("chevron-right"),
    ]);
    next.addEventListener("click", function () { onPage(meta.page + 1); });

    host.appendChild(el("div", { class: "pagination" }, [
      prev,
      pageInput,
      el("span", { class: "pagination-info", text: "/ " + fmt.int(pages) }),
      next,
    ]));
  }

  /* ── tabuľka objednávok ───────────────────────────────────────────────── */
  function ordersTable(rows, onOpen) {
    /* Mena nemá vlastný stĺpec — `fmt.money` ju vykreslí priamo v sume podľa
       ISO kódu z riadku, takže samostatný stĺpec by opakoval to isté. */
    var head = el("tr", {}, [
      el("th", { text: t("orders.col.id") }),
      el("th", { text: t("orders.col.date") }),
      el("th", { class: "num", text: t("orders.col.total") }),
      el("th", { text: t("orders.col.action") }),
    ]);
    var body = el("tbody");

    rows.forEach(function (order) {
      var open = function () { onOpen(order.id); };
      var button = el("button", { class: "spRowBtn", type: "button", onClick: open }, [
        el("span", { text: t("common.detail") }), icon("arrow-right", 13),
      ]);
      button.setAttribute("aria-label", t("orders.detail.title", { id: order.id }));

      body.appendChild(el("tr", {}, [
        el("td", { class: "spIdCell", dataset: { label: t("orders.col.id") }, text: "#" + order.id }),
        el("td", { class: "spDate", dataset: { label: t("orders.col.date") } }, [
          el("span", { text: fmt.date(order.date_add) }),
          el("span", { class: "spDateTime", text: " " + fmt.time(order.date_add) }),
        ]),
        el("td", { class: "num spMoney", dataset: { label: t("orders.col.total") }, text: fmt.money(order.total_paid, order.currency) }),
        el("td", { dataset: { label: t("orders.col.action") } }, [button]),
      ]));
    });

    return el("div", { class: "tbl-wrap" }, [
      el("table", { class: "tbl spCardTable" }, [el("thead", {}, [head]), body]),
    ]);
  }

  /* ── tabuľka produktov ───────────────────────────────────────────────── */
  function productsTable(rows, onOpen) {
    var head = el("tr", {}, [
      el("th", { text: t("products.col.id") }),
      el("th", { text: t("products.col.name") }),
      el("th", { class: "num", text: t("products.col.price") }),
      el("th", { text: t("products.col.variants") }),
      el("th", { text: t("products.col.action") }),
    ]);
    var body = el("tbody");

    rows.forEach(function (product) {
      var open = function () { onOpen(product.id); };
      var button = el("button", { class: "spRowBtn", type: "button", onClick: open }, [
        el("span", { text: t("common.detail") }), icon("arrow-right", 13),
      ]);
      button.setAttribute("aria-label", t("products.col.name") + ": " + product.name);

      var priceCell = el("td", {
        class: "num spMoney",
        dataset: { label: t("products.col.price") },
        text: fmt.money(product.price, "EUR"),
      });
      /* Surová hodnota má aj šesť desatinných miest — zobrazená je zaokrúhlená,
         takže presné číslo musí byť dostupné, nie stratené. */
      priceCell.setAttribute("data-tip", String(product.price));

      body.appendChild(el("tr", {}, [
        el("td", { class: "spIdCell", dataset: { label: t("products.col.id") }, text: String(product.id) }),
        el("td", { class: "spNameCell", dataset: { label: t("products.col.name") } }, [el("strong", { text: product.name })]),
        priceCell,
        el("td", { dataset: { label: t("products.col.variants") } }, [
          el("span", {
            class: "badge " + (product.has_attributes ? "badge-accent" : "badge-neutral"),
            text: t(product.has_attributes ? "products.hasVariants" : "products.noVariants"),
          }),
        ]),
        el("td", { dataset: { label: t("products.col.action") } }, [button]),
      ]));
    });

    return el("div", { class: "tbl-wrap" }, [
      el("table", { class: "tbl spCardTable" }, [el("thead", {}, [head]), body]),
    ]);
  }

  /* ── VIEW: prehľad ────────────────────────────────────────────────────── */
  var views = {};

  views.overview = function (force) {
    if (rendered.overviewLoaded && !force) return;
    rendered.overviewLoaded = true;

    var token = ++tokens.overview;
    var ordersHost = doc.getElementById("overviewOrders");
    var productsHost = doc.getElementById("overviewProducts");
    clear(ordersHost).appendChild(skeletonTable(5, 3));
    clear(productsHost).appendChild(skeletonTable(5, 3));
    doc.getElementById("kpiOrders").textContent = "—";
    doc.getElementById("kpiProducts").textContent = "—";
    doc.getElementById("kpiPageSum").textContent = "—";

    var PREVIEW = 8;

    Api.listOrders({ page: 1, per_page: PREVIEW }).then(function (outcome) {
      if (token !== tokens.overview) return;
      if (!outcome.ok) {
        clear(ordersHost).appendChild(errorBlock(outcome, function () { views.overview(true); }));
        return;
      }
      var data = outcome.data;
      doc.getElementById("kpiOrders").textContent = fmt.int(data.total);
      setNavCount("navOrdersCount", data.total);
      doc.getElementById("overviewOrdersSub").textContent = t("overview.latestOrdersSub", { n: data.rows.length });

      /* Súčet je zo VŠETKÝCH riadkov, ktoré tu naozaj sú — a popisok pod ním
         hlási to isté číslo, nie konštantu. */
      var sum = data.rows.reduce(function (acc, order) { return acc + (Number(order.total_paid) || 0); }, 0);
      var currency = (data.rows[0] && data.rows[0].currency) || "EUR";
      doc.getElementById("kpiPageSum").textContent = fmt.money(sum, currency);
      doc.getElementById("kpiPageSumSub").textContent = t("overview.kpi.pageSumSub", { n: fmt.int(data.rows.length) });

      clear(ordersHost);
      if (!data.rows.length) {
        ordersHost.appendChild(stateBlock({ title: t("orders.empty"), desc: t("orders.emptyDesc") }));
        return;
      }
      ordersHost.appendChild(ordersTable(data.rows, function (id) { openFromList("orders", id); }));
    });

    Api.listProducts({ page: 1, per_page: PREVIEW }).then(function (outcome) {
      if (token !== tokens.overview) return;
      if (!outcome.ok) {
        clear(productsHost).appendChild(errorBlock(outcome, function () { views.overview(true); }));
        return;
      }
      doc.getElementById("kpiProducts").textContent = fmt.int(outcome.data.total);
      setNavCount("navProductsCount", outcome.data.total);
      clear(productsHost);
      if (!outcome.data.rows.length) {
        productsHost.appendChild(stateBlock({ title: t("products.empty"), desc: t("products.emptyDesc") }));
        return;
      }
      productsHost.appendChild(productsTable(outcome.data.rows, function (id) { openFromList("products", id); }));
    });
  };

  /* ── VIEW: objednávky ─────────────────────────────────────────────────── */
  var ORDER_FILTERS = ["date_from", "date_to", "country", "total_min", "total_max"];

  function ordersQueryFromUrl() {
    var query = current.query;
    var out = {
      page: Math.max(1, Number(query.get("page")) || 1),
      per_page: Number(query.get("per_page")) || 50,
    };
    ORDER_FILTERS.forEach(function (name) {
      var value = query.get(name);
      if (value) out[name] = value;
    });
    return out;
  }

  function fillOrdersForm(query) {
    doc.getElementById("fDateFrom").value = query.date_from || "";
    doc.getElementById("fDateTo").value = query.date_to || "";
    doc.getElementById("fCountry").value = query.country || "";
    doc.getElementById("fTotalMin").value = query.total_min || "";
    doc.getElementById("fTotalMax").value = query.total_max || "";
    doc.getElementById("fPerPage").value = String(query.per_page || 50);
  }

  function renderActiveFilters(query) {
    var host = clear(doc.getElementById("ordersActiveFilters"));
    var labels = {
      date_from: t("orders.filter.dateFrom"),
      date_to: t("orders.filter.dateTo"),
      country: t("orders.filter.country"),
      total_min: t("orders.filter.totalMin"),
      total_max: t("orders.filter.totalMax"),
    };
    var any = false;
    ORDER_FILTERS.forEach(function (name) {
      if (!query[name]) return;
      any = true;
      var chip = el("span", { class: "spFilterChip" }, [
        el("span", { text: labels[name] + ": " + query[name] }),
      ]);
      chip.appendChild(iconBtn("x", t("common.removeFilter", { name: labels[name] }), "", function () {
        var next = listQuery();
        next.delete(name);
        next.set("page", "1");
        go("orders", next);
      }));
      host.appendChild(chip);
    });
    if (any) host.insertBefore(el("span", { class: "meta", text: t("common.activeFilters") + ":" }), host.firstChild);
  }

  views.orders = function (force) {
    var query = ordersQueryFromUrl();
    var key = JSON.stringify(query);
    fillOrdersForm(query);
    renderActiveFilters(query);
    if (rendered.ordersKey === key && !force) return;
    rendered.ordersKey = key;

    var token = ++tokens.orders;
    var host = doc.getElementById("ordersTable");
    var pager = doc.getElementById("ordersPager");
    pager.hidden = true;
    clear(host).appendChild(skeletonTable(6, 4));

    Api.listOrders(query).then(function (outcome) {
      if (token !== tokens.orders) return;
      clear(host);
      if (!outcome.ok) {
        pager.hidden = true;
        host.appendChild(errorBlock(outcome, function () { views.orders(true); }));
        return;
      }
      var data = outcome.data;
      var filtered = ORDER_FILTERS.some(function (name) { return query[name]; });
      /* Počítadlo v navigácii hovorí „koľko je v API", nie „koľko prešlo
         filtrom" — inak by po zafiltrovaní tvrdilo, že eshop má menej
         objednávok, než má. Filtrovaný počet patrí do pagera. */
      if (!filtered) setNavCount("navOrdersCount", data.total);

      if (!data.rows.length) {
        pager.hidden = true;
        host.appendChild(stateBlock({
          icon: "inbox",
          title: t(filtered ? "orders.emptyFiltered" : "orders.empty"),
          desc: t(filtered ? "orders.emptyFilteredDesc" : "orders.emptyDesc"),
          actions: filtered ? [el("button", {
            class: "btn btn-outline", type: "button", text: t("common.reset"),
            onClick: resetOrderFilters,
          })] : [],
        }));
        return;
      }

      host.appendChild(ordersTable(data.rows, function (id) { openFromList("orders", id); }));
      renderPager(pager, { page: data.page, perPage: data.perPage, total: data.total, rowCount: data.rows.length }, function (page) {
        var next = listQuery();
        next.set("page", String(page));
        go("orders", next);
      });
    });
  };

  function resetOrderFilters() {
    var next = new URLSearchParams();
    next.set("per_page", doc.getElementById("fPerPage").value || "50");
    go("orders", next);
  }

  function applyOrderFilters() {
    var errorNode = doc.getElementById("ordersFilterError");
    var from = doc.getElementById("fDateFrom").value;
    var to = doc.getElementById("fDateTo").value;
    var country = doc.getElementById("fCountry").value.trim().toUpperCase();
    var min = doc.getElementById("fTotalMin").value;
    var max = doc.getElementById("fTotalMax").value;

    /* Vstup, ktorý by API odmietlo alebo ktorý nemôže vrátiť nič, zastavíme tu —
       zlyhaný request nie je spôsob, ako niekomu povedať, že si preklepol dátum. */
    var problem = "";
    if (from && to && from > to) problem = t("orders.filter.badRange");
    else if (min && max && Number(min) > Number(max)) problem = t("orders.filter.badTotal");
    else if (country && !/^[A-Z]{2}$/.test(country)) problem = t("orders.filter.badCountry");

    errorNode.textContent = problem;
    errorNode.hidden = !problem;
    doc.getElementById("fCountry").setAttribute("aria-invalid", problem === t("orders.filter.badCountry") ? "true" : "false");
    if (problem) return;

    var next = new URLSearchParams();
    if (from) next.set("date_from", from);
    if (to) next.set("date_to", to);
    if (country) next.set("country", country);
    if (min) next.set("total_min", min);
    if (max) next.set("total_max", max);
    next.set("per_page", doc.getElementById("fPerPage").value || "50");
    next.set("page", "1");
    go("orders", next);
  }

  /* ── VIEW: produkty ──────────────────────────────────────────────────── */
  function productsQueryFromUrl() {
    return {
      page: Math.max(1, Number(current.query.get("page")) || 1),
      per_page: Number(current.query.get("per_page")) || 50,
      id_lang: current.query.get("id_lang") || "",
      q: current.query.get("q") || "",
    };
  }

  var productRows = [];

  views.products = function (force) {
    var query = productsQueryFromUrl();
    doc.getElementById("pPerPage").value = String(query.per_page);
    doc.getElementById("pIdLang").value = query.id_lang;
    doc.getElementById("productSearch").value = query.q;

    var key = JSON.stringify({ page: query.page, per_page: query.per_page, id_lang: query.id_lang });
    if (rendered.productsKey === key && !force) {
      paintProductRows(query.q);
      return;
    }
    rendered.productsKey = key;

    var token = ++tokens.products;
    var host = doc.getElementById("productsTable");
    var pager = doc.getElementById("productsPager");
    pager.hidden = true;
    clear(host).appendChild(skeletonTable(6, 4));

    Api.listProducts(query).then(function (outcome) {
      if (token !== tokens.products) return;
      if (!outcome.ok) {
        productRows = [];
        clear(host).appendChild(errorBlock(outcome, function () { views.products(true); }));
        return;
      }
      var data = outcome.data;
      productRows = data.rows;
      setNavCount("navProductsCount", data.total);
      paintProductRows(query.q);
      renderPager(pager, { page: data.page, perPage: data.perPage, total: data.total, rowCount: data.rows.length }, function (page) {
        var next = listQuery();
        next.set("page", String(page));
        go("products", next);
      });
    });
  };

  function paintProductRows(search) {
    var host = clear(doc.getElementById("productsTable"));
    var needle = String(search || "").trim().toLowerCase();
    var rows = needle
      ? productRows.filter(function (product) { return String(product.name).toLowerCase().indexOf(needle) !== -1; })
      : productRows;

    if (!productRows.length) {
      host.appendChild(stateBlock({ icon: "inbox", title: t("products.empty"), desc: t("products.emptyDesc") }));
      return;
    }
    if (!rows.length) {
      host.appendChild(stateBlock({
        icon: "search",
        title: t("products.noMatch"),
        desc: t("products.noMatchDesc", { n: productRows.length }),
        actions: [el("button", {
          class: "btn btn-outline", type: "button", text: t("common.reset"),
          onClick: function () {
            var next = listQuery();
            next.delete("q");
            go("products", next);
          },
        })],
      }));
      return;
    }
    host.appendChild(productsTable(rows, function (id) { openFromList("products", id); }));
  }

  /* ── VIEW: nastavenia ────────────────────────────────────────────────── */
  views.settings = function () {
    var cfg = Api.config();
    doc.getElementById("sBaseUrl").value = cfg.baseUrl;
    doc.getElementById("sBaseUrl").disabled = cfg.mode === "proxy";
    doc.getElementById("baseUrlHint").textContent = t(cfg.mode === "proxy" ? "settings.baseUrlProxyHint" : "settings.baseUrlHint");
    doc.getElementById("sApiKey").value = cfg.apiKey;
    doc.getElementById("sApiKey").disabled = cfg.mode !== "direct";
    doc.getElementById("sAuthHeader").value = cfg.authHeader;
    doc.getElementById("sAuthHeader").disabled = cfg.mode !== "direct";
    doc.getElementById("modeHint").textContent = t("settings.mode." + cfg.mode + "Hint");
    /* Chýbajúci kľúč sa hlási LEN v direct režime — v proxy ho drží server
       a v demo sa nepoužíva vôbec, takže inde by to bolo falošné varovanie. */
    doc.getElementById("keyMissing").hidden = !(cfg.mode === "direct" && !cfg.apiKey);
    doc.getElementById("keyReveal").textContent =
      t(doc.getElementById("sApiKey").type === "password" ? "settings.apiKeyShow" : "settings.apiKeyHide");

    doc.querySelectorAll("#modeSwitch .seg-btn").forEach(function (button) {
      button.setAttribute("aria-selected", button.dataset.mode === cfg.mode ? "true" : "false");
    });
    doc.querySelectorAll("#themeSwitch .seg-btn").forEach(function (button) {
      button.setAttribute("aria-selected", button.dataset.theme === prefs.theme() ? "true" : "false");
    });
    doc.querySelectorAll("#densitySwitch .seg-btn").forEach(function (button) {
      button.setAttribute("aria-selected", button.dataset.density === prefs.density() ? "true" : "false");
    });
    doc.querySelectorAll("#langSwitch .seg-btn").forEach(function (button) {
      button.setAttribute("aria-selected", button.dataset.lang === global.I18n.lang() ? "true" : "false");
    });
    renderLog(Api.log());
  };

  function renderLog(entries) {
    var host = doc.getElementById("requestLog");
    if (!host) return;
    clear(host);
    doc.getElementById("logSub").textContent = t("settings.logSub", { n: entries.length });
    if (!entries.length) {
      host.appendChild(stateBlock({ icon: "info", title: t("settings.logEmpty") }));
      return;
    }
    var list = el("div", { class: "spLog" });
    entries.forEach(function (entry) {
      var bad = entry.status === 0 || entry.status >= 400 || entry.code;
      list.appendChild(el("div", { class: "spLogRow" }, [
        el("span", { class: "spLogTime", text: fmt.clock(entry.time) }),
        el("span", { class: "spLogStatus " + (bad ? "spLogBad" : "spLogOk"), text: entry.status ? String(entry.status) : "ERR" }),
        el("span", { class: "spLogUrl", text: entry.url + (entry.code ? "  " + entry.code : "") }),
        el("span", { class: "spLogMs", text: entry.ms + " ms" }),
      ]));
    });
    host.appendChild(list);
  }

  function saveSettings() {
    Api.setConfig({
      baseUrl: doc.getElementById("sBaseUrl").value.trim().replace(/\/+$/, ""),
      apiKey: doc.getElementById("sApiKey").value.trim(),
      authHeader: doc.getElementById("sAuthHeader").value,
    });
    resetCaches();
    syncChrome();
    views.settings(true);
    toast("ok", t("settings.saved"));
  }

  function setMode(mode) {
    Api.setConfig({ mode: mode });
    resetCaches();
    syncChrome();
    views.settings(true);
    renderModeNotice();
  }

  function resetCaches() {
    rendered.ordersKey = null;
    rendered.productsKey = null;
    rendered.overviewLoaded = false;
    setNavCount("navOrdersCount", null);
    setNavCount("navProductsCount", null);
  }

  function testConnection() {
    var host = clear(doc.getElementById("testResult"));
    var button = doc.getElementById("settingsTest");
    button.disabled = true;
    host.appendChild(el("span", { class: "spinner" }));
    host.appendChild(el("span", { class: "meta", text: t("settings.testRunning") }));

    Api.ping().then(function (result) {
      button.disabled = false;
      clear(host);
      [
        { label: t("settings.testProducts"), outcome: result.products },
        { label: t("settings.testOrders"), outcome: result.orders },
      ].forEach(function (row) {
        var ok = row.outcome.ok;
        var badge = el("span", { class: "badge " + (ok ? "badge-ok" : "badge-danger") }, [
          icon(ok ? "check" : "x", 12),
          el("span", { text: row.label + ": " + t(ok ? "settings.testOk" : "settings.testFail") }),
        ]);
        if (!ok) badge.setAttribute("data-tip", row.outcome.message);
        host.appendChild(badge);
      });
      renderLog(Api.log());
      if (!result.orders.ok) toast("warn", result.orders.message);
      else if (!result.products.ok) toast("warn", result.products.message);
      else toast("ok", t("settings.testOk"));
    });
  }

  /* ── overlaye ─────────────────────────────────────────────────────────── */
  var overlay = { node: null, restoreFocus: null };

  function openOverlay(node) {
    closeOverlay(true);
    overlay.restoreFocus = doc.activeElement;
    overlay.node = node;
    doc.getElementById("overlayRoot").appendChild(node);
    doc.body.style.overflow = "hidden";
    var focusable = node.querySelector("button, [href], input, select, textarea");
    if (focusable) focusable.focus();
  }

  function closeOverlay(silent) {
    if (!overlay.node) return;
    overlay.node.remove();
    overlay.node = null;
    doc.body.style.overflow = "";
    if (overlay.restoreFocus && overlay.restoreFocus.focus) overlay.restoreFocus.focus();
    overlay.restoreFocus = null;
    if (silent) return;
    /* Detail je v URL, takže zavretie musí URL vrátiť na zoznam. Keď sa detail
       otvoril klikom, back() zachová stav zoznamu vrátane stránky a filtrov. */
    if (openedFromList && global.history.length > 1) global.history.back();
    else go(current.route, listQuery());
    openedFromList = false;
  }

  function openFromList(route, id) {
    openedFromList = true;
    /* Krížom cez route sa parametre neprenášajú — `country=SK` z objednávok
       nemá na produktoch čo robiť a po zavretí detailu by tam zostal visieť. */
    var query = route === current.route ? listQuery() : new URLSearchParams();
    global.location.hash = hashFor(route, query, id);
  }

  function overlayShell(kind, headChildren, bodyNode, footChildren) {
    var isDrawer = kind === "drawer";
    var panel = el("div", { class: isDrawer ? "drawer" : "modal modal-lg", role: "dialog", "aria-modal": "true" });
    var head = el("div", { class: isDrawer ? "drawer-head" : "modal-head" }, headChildren);
    head.appendChild(iconBtn("x", t(isDrawer ? "common.closePanel" : "common.closeDialog"),
      "btn btn-ghost btn-icon " + (isDrawer ? "" : "modal-close"), function () { closeOverlay(false); }));
    panel.appendChild(head);
    panel.appendChild(el("div", { class: isDrawer ? "drawer-body" : "modal-body" }, [bodyNode]));
    if (footChildren) panel.appendChild(el("div", { class: isDrawer ? "drawer-foot" : "modal-foot" }, footChildren));

    var backdrop = el("div", { class: isDrawer ? "drawer-backdrop" : "modal-backdrop" }, [panel]);
    backdrop.addEventListener("mousedown", function (event) {
      if (event.target === backdrop) closeOverlay(false);
    });
    return backdrop;
  }

  /* ── detail objednávky ───────────────────────────────────────────────── */
  function openOrderDetail(id) {
    var token = ++tokens.detail;
    var body = el("div", {}, [skeletonTable(4, 2)]);
    var head = [el("div", {}, [
      el("h2", { text: t("orders.detail.title", { id: id }) }),
      el("div", { class: "modal-head-sub", text: t("common.loading") }),
    ])];
    var shell = overlayShell("drawer", head, body, [
      el("button", { class: "btn btn-outline", type: "button", text: t("common.close"), onClick: function () { closeOverlay(false); } }),
    ]);
    openOverlay(shell);

    Api.getOrder(id).then(function (outcome) {
      if (token !== tokens.detail || !overlay.node) return;
      var sub = shell.querySelector(".modal-head-sub");
      clear(body);
      if (!outcome.ok) {
        sub.textContent = "";
        body.appendChild(outcome.code === "NOT_FOUND"
          ? stateBlock({ tone: "state-muted", icon: "inbox", title: t("orders.notFound"), desc: t("orders.notFoundDesc", { id: id }) })
          : errorBlock(outcome, function () { openOrderDetail(id); }));
        return;
      }
      var order = outcome.data;
      sub.textContent = fmt.date(order.date_add) + " " + fmt.time(order.date_add);
      body.appendChild(orderDetailBody(order));
      var foot = shell.querySelector(".drawer-foot");
      clear(foot);
      foot.appendChild(el("button", { class: "btn btn-ghost", type: "button", onClick: function () { copyText(JSON.stringify(order, null, 2)); } }, [
        icon("copy"), el("span", { text: "JSON" }),
      ]));
      foot.appendChild(el("div", { class: "spacer" }));
      foot.appendChild(el("button", { class: "btn btn-outline", type: "button", text: t("common.close"), onClick: function () { closeOverlay(false); } }));
    });
  }

  function orderDetailBody(order) {
    var wrap = el("div", { class: "page-stack" });

    var facts = el("dl", { class: "dl" });
    facts.appendChild(el("dt", { text: t("common.id") }));
    facts.appendChild(el("dd", { class: "mono", text: String(order.id) }));
    facts.appendChild(el("dt", { text: t("orders.detail.placed") }));
    facts.appendChild(el("dd", { text: fmt.date(order.date_add) + " · " + fmt.time(order.date_add) }));
    facts.appendChild(el("dt", { text: t("orders.detail.total") }));
    facts.appendChild(el("dd", {}, [el("strong", { text: fmt.money(order.total_paid, order.currency) })]));
    facts.appendChild(el("dt", { text: t("orders.detail.country") }));
    facts.appendChild(el("dd", {}, [
      el("span", { text: order.country || t("common.unknown") }),
      order.country_iso ? el("span", { class: "badge badge-neutral", style: "margin-left: var(--space-2)", text: order.country_iso }) : null,
    ]));
    wrap.appendChild(el("section", { class: "panel-soft" }, [el("div", { class: "panel-body" }, [facts])]));

    var items = Array.isArray(order.products) ? order.products : [];
    var qty = items.reduce(function (acc, item) { return acc + (Number(item.qty) || 0); }, 0);
    var itemsHost = el("div", { class: "spItems" });

    items.forEach(function (item) {
      var row = el("div", { class: "spItem", dataset: { productId: String(item.id) } }, [
        el("span", { class: "spItemQty", text: (Number(item.qty) || 0) + "×" }),
        el("div", { class: "spItemMain" }, [
          el("div", { class: "spItemName", text: "#" + item.id }),
          el("div", { class: "spItemId", text: "id_product=" + item.id }),
        ]),
      ]);
      row.appendChild(el("button", {
        class: "spRowBtn", type: "button",
        "aria-label": t("orders.detail.openProduct", { id: item.id }),
        onClick: function () { openFromList("products", item.id); },
      }, [icon("external-link", 13)]));
      itemsHost.appendChild(row);
    });

    var resolveBtn = el("button", { class: "btn btn-outline btn-sm", type: "button" }, [
      icon("package"), el("span", { text: t("orders.detail.resolveNames") }),
    ]);
    resolveBtn.addEventListener("click", function () { resolveItemNames(itemsHost, items, resolveBtn); });

    var panel = el("section", { class: "panel" }, [
      el("div", { class: "panel-head" }, [
        el("div", {}, [
          el("h3", { text: t("orders.detail.items") }),
          el("div", { class: "panel-head-sub", text: t("orders.detail.itemsSub", { n: items.length, q: qty }) }),
        ]),
        el("div", { class: "panel-head-actions" }, [items.length ? resolveBtn : null]),
      ]),
      el("div", { class: "panel-body" }, [
        items.length ? itemsHost : stateBlock({ icon: "inbox", title: t("orders.detail.noItems") }),
        items.length ? el("p", { class: "field-hint", text: t("orders.detail.resolveHint") }) : null,
      ]),
    ]);
    wrap.appendChild(panel);
    return wrap;
  }

  /* Názvy sa doťahujú po jednom a s odstupom. Fan-out na jeden bucket podľa IP
     je presne to, čím si appka strhne rate limit — 20 requestov naraz na jedno
     zobrazenie je cesta k 429 na všetkom ostatnom. */
  var RESOLVE_MAX = 20;
  var RESOLVE_GAP_MS = 120;

  function resolveItemNames(host, items, button) {
    button.disabled = true;
    var slice = items.slice(0, RESOLVE_MAX);
    if (items.length > slice.length) {
      /* Strop, ktorý nikoho neinformuje, vyzerá ako „všetko doplnené". */
      toast("warn", t("orders.detail.capNote", { n: slice.length, total: items.length }));
    }

    var index = 0;
    (function step() {
      if (index >= slice.length) {
        button.disabled = false;
        clear(button).appendChild(icon("check"));
        button.appendChild(el("span", { text: t("orders.detail.resolved") }));
        return;
      }
      var item = slice[index];
      index += 1;
      Api.getProduct(item.id).then(function (outcome) {
        var row = host.querySelector('[data-product-id="' + item.id + '"] .spItemName');
        if (row) row.textContent = outcome.ok ? outcome.data.name : "#" + item.id + " — " + outcome.message;
        global.setTimeout(step, RESOLVE_GAP_MS);
      });
    })();
  }

  /* ── detail produktu ─────────────────────────────────────────────────── */
  function openProductDetail(id) {
    var token = ++tokens.detail;
    var body = el("div", {}, [skeletonTable(5, 2)]);
    var head = [el("div", {}, [
      el("h2", { text: "#" + id }),
      el("div", { class: "modal-head-sub", text: t("common.loading") }),
    ])];
    var shell = overlayShell("modal", head, body, [
      el("button", { class: "btn btn-outline", type: "button", text: t("common.close"), onClick: function () { closeOverlay(false); } }),
    ]);
    openOverlay(shell);

    Api.getProduct(id, current.query.get("id_lang") || "").then(function (outcome) {
      if (token !== tokens.detail || !overlay.node) return;
      clear(body);
      if (!outcome.ok) {
        body.appendChild(outcome.code === "NOT_FOUND"
          ? stateBlock({ tone: "state-muted", icon: "inbox", title: t("products.notFound"), desc: t("products.notFoundDesc", { id: id }) })
          : errorBlock(outcome, function () { openProductDetail(id); }));
        return;
      }
      var product = outcome.data;
      shell.querySelector(".modal-head h2").textContent = product.name || "#" + product.id;
      shell.querySelector(".modal-head-sub").textContent = "id " + product.id;
      body.appendChild(productDetailBody(product));

      var foot = shell.querySelector(".modal-foot");
      clear(foot);
      foot.appendChild(el("button", { class: "btn btn-ghost", type: "button", onClick: function () { copyText(JSON.stringify(product, null, 2)); } }, [
        icon("copy"), el("span", { text: "JSON" }),
      ]));
      foot.appendChild(el("div", { class: "spacer" }));
      foot.appendChild(el("button", { class: "btn btn-outline", type: "button", text: t("common.close"), onClick: function () { closeOverlay(false); } }));
    });
  }

  function productDetailBody(product) {
    var wrap = el("div", { class: "page-stack" });
    var variants = Array.isArray(product.attributes) ? product.attributes : [];

    var facts = el("dl", { class: "dl" });
    facts.appendChild(el("dt", { text: t("products.detail.priceBase") }));
    var price = el("dd", {}, [el("strong", { text: fmt.money(product.price, "EUR") })]);
    price.setAttribute("data-tip", String(product.price));
    facts.appendChild(price);
    facts.appendChild(el("dt", { text: t("products.col.variants") }));
    facts.appendChild(el("dd", {}, [
      el("span", {
        class: "badge " + (product.has_attributes ? "badge-accent" : "badge-neutral"),
        text: product.has_attributes ? t("products.detail.variantsSub", { n: variants.length }) : t("products.noVariants"),
      }),
    ]));
    wrap.appendChild(el("section", { class: "panel-soft" }, [el("div", { class: "panel-body" }, [facts])]));

    if (product.description_short) {
      wrap.appendChild(el("section", { class: "panel" }, [
        el("div", { class: "panel-head" }, [el("h3", { text: t("products.detail.shortDesc") })]),
        el("div", { class: "panel-body" }, [sanitizeHtml(product.description_short)]),
      ]));
    }

    wrap.appendChild(el("section", { class: "panel" }, [
      el("div", { class: "panel-head" }, [el("h3", { text: t("products.detail.desc") })]),
      el("div", { class: "panel-body" }, [
        product.description ? sanitizeHtml(product.description) : el("p", { class: "muted", text: t("products.detail.noDesc") }),
      ]),
    ]));

    var variantsBody = variants.length
      ? el("div", { class: "tbl-wrap" }, [variantsTable(variants, product.price)])
      : stateBlock({ icon: "inbox", title: t("products.detail.noVariants") });

    wrap.appendChild(el("section", { class: "panel" }, [
      el("div", { class: "panel-head" }, [
        el("div", {}, [
          el("h3", { text: t("products.detail.variants") }),
          el("div", { class: "panel-head-sub", text: t("products.detail.variantsSub", { n: variants.length }) }),
        ]),
      ]),
      el("div", { class: variants.length ? "panel-body flush" : "panel-body" }, [variantsBody]),
    ]));

    return wrap;
  }

  function variantsTable(variants, basePrice) {
    var head = el("tr", {}, [
      el("th", { text: t("products.detail.values") }),
      el("th", { text: t("products.detail.reference") }),
      el("th", { text: t("products.detail.ean") }),
      el("th", { class: "num", text: t("products.detail.impact") }),
      el("th", { class: "num", text: t("products.detail.finalPrice") }),
      el("th", { class: "num", text: t("products.detail.stock") }),
    ]);
    var body = el("tbody");

    variants.forEach(function (variant) {
      var impact = Number(variant.price_impact) || 0;
      var quantity = Number(variant.quantity) || 0;
      var stockClass = quantity === 0 ? "spStockOut" : quantity < 5 ? "spStockLow" : "spStockOk";
      var values = Array.isArray(variant.values) ? variant.values : [];

      var valueCell = el("td", { dataset: { label: t("products.detail.values") } }, [
        el("div", { class: "spVarValues" }, values.map(function (value) {
          return el("span", { class: "badge badge-neutral", text: value });
        }).concat(variant.is_default ? [el("span", { class: "badge badge-gold", text: t("products.detail.default") })] : [])),
      ]);

      body.appendChild(el("tr", {}, [
        valueCell,
        el("td", { class: "mono", dataset: { label: t("products.detail.reference") }, text: variant.reference || "—" }),
        el("td", { class: "mono", dataset: { label: t("products.detail.ean") }, text: variant.ean13 || "—" }),
        el("td", { class: "num", dataset: { label: t("products.detail.impact") }, text: impact === 0 ? "—" : (impact > 0 ? "+" : "") + fmt.money(impact, "EUR") }),
        el("td", { class: "num spMoney", dataset: { label: t("products.detail.finalPrice") }, text: fmt.money(Number(basePrice) + impact, "EUR") }),
        el("td", { class: "num", dataset: { label: t("products.detail.stock") } }, [
          el("span", { class: "spStock " + stockClass, text: fmt.int(quantity) }),
        ]),
      ]));
    });

    return el("table", { class: "tbl spCardTable" }, [el("thead", {}, [head]), body]);
  }

  /* ── mobilná navigácia ───────────────────────────────────────────────── */
  function setMenu(open) {
    doc.getElementById("sidebar").classList.toggle("open", open);
    doc.getElementById("navOverlay").hidden = !open;
    var button = doc.getElementById("menuBtn");
    button.setAttribute("aria-expanded", open ? "true" : "false");
    clear(button).appendChild(icon(open ? "x" : "menu"));
    button.appendChild(el("span", { class: "sr-only", text: t(open ? "app.closeMenu" : "app.openMenu") }));
  }

  /* ── boot ─────────────────────────────────────────────────────────────── */
  function wire() {
    doc.getElementById("menuBtn").addEventListener("click", function () {
      setMenu(!doc.getElementById("sidebar").classList.contains("open"));
    });
    doc.getElementById("navOverlay").addEventListener("click", function () { setMenu(false); });
    doc.getElementById("nav").addEventListener("click", function (event) {
      if (event.target.closest(".nav-item")) setMenu(false);
    });

    doc.getElementById("themeBtn").addEventListener("click", function () {
      prefs.setTheme(prefs.theme() === "dark" ? "light" : "dark");
      if (current.route === "settings") views.settings(true);
    });
    doc.getElementById("densityBtn").addEventListener("click", function () {
      prefs.setDensity(prefs.density() === "compact" ? "cozy" : "compact");
      if (current.route === "settings") views.settings(true);
    });
    doc.getElementById("langBtn").addEventListener("click", function () {
      prefs.setLang(global.I18n.lang() === "sk" ? "en" : "sk");
    });

    /* objednávky */
    doc.getElementById("ordersApply").addEventListener("click", applyOrderFilters);
    doc.getElementById("ordersReset").addEventListener("click", resetOrderFilters);
    doc.getElementById("ordersFilters").addEventListener("submit", function (event) {
      event.preventDefault();
      applyOrderFilters();
    });
    doc.getElementById("ordersFilters").addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        applyOrderFilters();
      }
    });
    doc.getElementById("fCountry").addEventListener("input", function (event) {
      event.target.value = event.target.value.toUpperCase();
    });
    doc.getElementById("fPerPage").addEventListener("change", applyOrderFilters);
    doc.getElementById("orderJumpBtn").addEventListener("click", function () {
      var id = doc.getElementById("orderJumpInput").value.trim();
      if (id) openFromList("orders", id);
    });
    doc.getElementById("orderJumpInput").addEventListener("keydown", function (event) {
      if (event.key === "Enter") doc.getElementById("orderJumpBtn").click();
    });

    /* produkty */
    doc.getElementById("productsApply").addEventListener("click", function () {
      var next = new URLSearchParams();
      var idLang = doc.getElementById("pIdLang").value.trim();
      var search = doc.getElementById("productSearch").value.trim();
      next.set("per_page", doc.getElementById("pPerPage").value || "50");
      if (idLang) next.set("id_lang", idLang);
      if (search) next.set("q", search);
      next.set("page", "1");
      go("products", next);
      views.products(true);
    });
    doc.getElementById("pPerPage").addEventListener("change", function () {
      doc.getElementById("productsApply").click();
    });
    doc.getElementById("productSearch").addEventListener("input", function (event) {
      /* Hľadanie filtruje načítanú stránku, takže nesmie robiť request. Stav
         ide do URL, aby sa odkaz dal poslať. */
      var next = listQuery();
      if (event.target.value.trim()) next.set("q", event.target.value.trim());
      else next.delete("q");
      global.history.replaceState(null, "", hashFor("products", next));
      current.query = next;
      paintProductRows(event.target.value);
    });
    doc.getElementById("productJumpBtn").addEventListener("click", function () {
      var id = doc.getElementById("productJumpInput").value.trim();
      if (id) openFromList("products", id);
    });
    doc.getElementById("productJumpInput").addEventListener("keydown", function (event) {
      if (event.key === "Enter") doc.getElementById("productJumpBtn").click();
    });

    /* nastavenia */
    doc.getElementById("modeSwitch").addEventListener("click", function (event) {
      var button = event.target.closest("[data-mode]");
      if (button) setMode(button.dataset.mode);
    });
    doc.getElementById("themeSwitch").addEventListener("click", function (event) {
      var button = event.target.closest("[data-theme]");
      if (button) {
        prefs.setTheme(button.dataset.theme);
        views.settings(true);
      }
    });
    doc.getElementById("densitySwitch").addEventListener("click", function (event) {
      var button = event.target.closest("[data-density]");
      if (button) {
        prefs.setDensity(button.dataset.density);
        views.settings(true);
      }
    });
    doc.getElementById("langSwitch").addEventListener("click", function (event) {
      var button = event.target.closest("[data-lang]");
      if (button) prefs.setLang(button.dataset.lang);
    });
    doc.getElementById("settingsSave").addEventListener("click", saveSettings);
    doc.getElementById("settingsTest").addEventListener("click", testConnection);
    doc.getElementById("keyReveal").addEventListener("click", function () {
      var input = doc.getElementById("sApiKey");
      var hidden = input.type === "password";
      input.type = hidden ? "text" : "password";
      doc.getElementById("keyReveal").textContent = t(hidden ? "settings.apiKeyHide" : "settings.apiKeyShow");
    });
    doc.getElementById("keyClear").addEventListener("click", function () {
      doc.getElementById("sApiKey").value = "";
      Api.setConfig({ apiKey: "" });
      resetCaches();
      toast("ok", t("settings.saved"));
    });
    doc.getElementById("logClear").addEventListener("click", function () {
      Api.clearLog();
    });

    /* prehľad */
    doc.querySelectorAll('[data-action="reload-overview"]').forEach(function (button) {
      button.addEventListener("click", function () { views.overview(true); });
    });

    Api.onLog(function (entries) {
      if (current.route === "settings") renderLog(entries);
    });

    doc.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        if (overlay.node) closeOverlay(false);
        else if (doc.getElementById("sidebar").classList.contains("open")) setMenu(false);
      }
    });

    global.addEventListener("hashchange", onHashChange);
  }

  function boot() {
    applyI18n(doc);
    paintIcons(doc);
    wire();
    setMenu(false);
    syncChrome();
    if (!global.location.hash) global.history.replaceState(null, "", "#/overview");
    onHashChange();
  }

  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", boot);
  else boot();
})(window);
