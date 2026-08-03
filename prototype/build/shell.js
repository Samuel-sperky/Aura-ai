/* ===== AuraAI shell — router, téma, toast, detail panel, Cmd-K, tabuľky ===== */
(function (w) {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = w.matchMedia && w.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function esc(s) { var d = document.createElement("div"); d.textContent = s == null ? "" : s; return d.innerHTML; }

  var A = w.Aura = {
    screens: {},          // key -> {title, group, init, onShow}
    state: { screen: null, theme: "dark", autorefresh: true },
    esc: esc, $: $, $$: $$, reduce: reduce
  };

  /* ---------- zdieľaný stav s prehrávaním ----------
     Obrazovky sa inicializujú lenivo, takže obyčajný CustomEvent sa stratí,
     ak sa hodnota zmenila skôr, než sa obrazovka prvýkrát otvorila.
     onState() preto novoregistrovanému poslucháčovi hneď doručí aktuálnu hodnotu. */
  var _shared = {}, _subs = {};
  A.setShared = function (key, value) {
    _shared[key] = value;
    (_subs[key] || []).forEach(function (fn) { try { fn(value); } catch (e) { console.error("onState " + key, e); } });
  };
  A.getShared = function (key, dflt) { return key in _shared ? _shared[key] : dflt; };
  A.onState = function (key, fn) {
    (_subs[key] = _subs[key] || []).push(fn);
    if (key in _shared) { try { fn(_shared[key]); } catch (e) { console.error("onState " + key, e); } }
  };

  /* ---------- triedenie podľa typu hodnoty ---------- */
  var MON = { "1": 0, "2": 1, "3": 2, "4": 3, "5": 4, "6": 5, "7": 6, "8": 7, "9": 8, "10": 9, "11": 10, "12": 11 };
  A.sortValue = function (v) {
    if (v == null) return { t: "s", v: "" };
    if (typeof v === "number") return { t: "n", v: v };
    var s = String(v).trim();
    // "31. 7. 2026 · 09:14" | "31. 7. 08:14" | "2. 8." | "14:22:07"
    var d = s.match(/^(\d{1,2})\.\s*(\d{1,2})\.(?:\s*(\d{4}))?/);
    if (d) {
      var yr = d[3] ? +d[3] : 2026;
      var tm = s.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
      var ms = Date.UTC(yr, (MON[d[2]] != null ? MON[d[2]] : +d[2] - 1), +d[1],
        tm ? +tm[1] : 0, tm ? +tm[2] : 0, tm && tm[3] ? +tm[3] : 0);
      return { t: "n", v: ms };
    }
    var t = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (t) return { t: "n", v: (+t[1]) * 3600 + (+t[2]) * 60 + (t[3] ? +t[3] : 0) };
    var num = s.replace(/\s| /g, "").replace(",", ".").replace(/[^\d.\-]/g, "");
    if (num !== "" && num !== "-" && !isNaN(+num) && /\d/.test(s)) return { t: "n", v: +num };
    return { t: "s", v: s.toLowerCase() };
  };
  A.sortRows = function (rows, key, dir) {
    var mul = dir === "descending" ? -1 : 1;
    return rows.slice().sort(function (a, b) {
      var x = A.sortValue(a[key]), y = A.sortValue(b[key]);
      if (x.t === "n" && y.t === "n") return (x.v - y.v) * mul;
      return String(x.v).localeCompare(String(y.v), "sk") * mul;
    });
  };
  /* aplikuje aktuálne triedenie tabuľky na ľubovoľné pole — volaj to v každom renderi */
  A.applySort = function (table, rows) {
    if (!table || !table.__sort) return rows;
    return A.sortRows(rows, table.__sort.key, table.__sort.dir);
  };

  /* ---------- jednotná obsluha riadkov: tabuľka aj mobilné karty ---------- */
  A.bindRows = function (scope, resolve, open) {
    if (!scope) return;
    $$("[data-row]", scope).forEach(function (el) {
      if (el.__bound) return;
      el.__bound = 1;
      if (el.tagName !== "BUTTON" && !el.hasAttribute("tabindex")) el.setAttribute("tabindex", "0");
      el.addEventListener("click", function () { var it = resolve(el.getAttribute("data-row")); if (it) open(it); });
      el.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); var it = resolve(el.getAttribute("data-row")); if (it) open(it); }
      });
    });
  };

  /* ---------- toast ---------- */
  A.toast = function (msg, kind, opts) {
    opts = opts || {};
    var box = $("#toasts");
    var t = document.createElement("div");
    t.className = "toast " + (kind || "");
    t.setAttribute("role", "status");
    var span = document.createElement("span");
    span.textContent = msg;
    t.appendChild(span);
    if (opts.undo) {
      var b = document.createElement("button");
      b.className = "toast-undo"; b.type = "button"; b.textContent = opts.undoLabel || "Späť";
      b.addEventListener("click", function () { kill(0); try { opts.undo(); } catch (e) { console.error(e); } });
      t.appendChild(b);
    }
    box.appendChild(t);
    var life = opts.undo ? 7000 : 5000, timer = null, born = Date.now(), left = life;
    function kill(delay) {
      clearTimeout(timer);
      setTimeout(function () { t.style.opacity = "0"; setTimeout(function () { t.remove(); }, 300); }, delay || 0);
    }
    function arm(ms) { timer = setTimeout(function () { kill(0); }, ms); }
    /* hover pozastaví odpočet */
    t.addEventListener("mouseenter", function () { clearTimeout(timer); left -= Date.now() - born; });
    t.addEventListener("mouseleave", function () { born = Date.now(); arm(Math.max(900, left)); });
    arm(life);
    return t;
  };
  /* deštruktívna akcia = toast so Späť (7 s) */
  A.undoToast = function (msg, undoFn, kind) { return A.toast(msg, kind || "ok", { undo: undoFn }); };

  /* guard pred odchodom z obrazovky s neuloženými zmenami */
  A.setLeaveGuard = function (fn) { A.state._leaveGuard = fn || null; };

  /* ---------- inbox: zvonček počíta zo zaregistrovaných zdrojov (Q74) ---------- */
  var _inbox = {};
  A.registerInbox = function (key, label, countFn, goFn) { _inbox[key] = { label: label, count: countFn, go: goFn }; A.refreshBell(); };
  A.inbox = function () {
    return Object.keys(_inbox).map(function (k) {
      var src = _inbox[k], n = 0;
      try { n = src.count() || 0; } catch (e) { }
      return { key: k, label: src.label, n: n, go: src.go };
    }).filter(function (x) { return x.n > 0; });
  };
  A.refreshBell = function () {
    var b = $("#bellCount"); if (!b) return;
    var total = A.inbox().reduce(function (s, x) { return s + x.n; }, 0);
    b.textContent = total;
    b.style.display = total ? "" : "none";
  };

  /* ---------- potvrdzovací dialóg ---------- */
  A.confirm = function (title, text, onYes, yesLabel, danger) {
    var m = $("#confirm");
    $("#confirm-t").textContent = title;
    $("#confirm-p").textContent = text;
    var yes = $("#confirm-yes");
    yes.textContent = yesLabel || "Potvrdiť";
    yes.className = "btn" + (danger ? " danger" : "");
    var clone = yes.cloneNode(true);
    yes.parentNode.replaceChild(clone, yes);
    clone.addEventListener("click", function () { m.classList.remove("on"); onYes && onYes(); });
    m.classList.add("on");
    clone.focus();
  };
  A.closeConfirm = function () { $("#confirm").classList.remove("on"); };

  /* ---------- detail panel ---------- */
  var lastFocus = null;
  A.detail = function (title, html, actions) {
    lastFocus = document.activeElement;
    $("#dp-title").textContent = title;
    $("#dp-body").innerHTML = html;
    var af = $("#dp-actions");
    af.innerHTML = "";
    (actions || []).forEach(function (a) {
      var b = document.createElement("button");
      b.className = "btn" + (a.kind ? " " + a.kind : " ghost");
      b.textContent = a.label;
      b.addEventListener("click", a.fn);
      af.appendChild(b);
    });
    $("#dp").classList.add("on");
    $("#dp-scrim").classList.add("on");
    $("#dp-close").focus();
  };
  A.closeDetail = function () {
    $("#dp").classList.remove("on");
    $("#dp-scrim").classList.remove("on");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  };

  /* ---------- téma (synchronizovaná, ukladá sa „na server" – tu do pamäte relácie) ---------- */
  A.setTheme = function (t, silent) {
    A.state.theme = t;
    document.documentElement.setAttribute("data-theme", t);
    var b = $("#themeBtn");
    if (b) b.textContent = t === "light" ? "Tmavá" : "Svetlá";
    var sel = $("#set-theme");
    if (sel && sel.value !== t) { sel.value = t; sel.dispatchEvent(new Event("change", { bubbles: true })); }
    A.setShared("theme", t);
    w.dispatchEvent(new CustomEvent("aura:theme", { detail: { theme: t } }));
    if (!silent) A.toast("Téma uložená do profilu: " + (t === "light" ? "svetlá" : "tmavá"), "ok");
  };

  /* ---------- router (hash) ---------- */
  A.go = function (key, sub, replace) {
    if (A.state._leaveGuard && key !== A.state.screen) {
      var g = A.state._leaveGuard;
      g(function () { A.state._leaveGuard = null; A.go(key, sub, replace); });
      return;
    }
    var h = "#/" + key + (sub ? "/" + sub : "");
    if (location.hash !== h) {
      if (replace) location.replace(h); else location.hash = h;
      return; // hashchange dorobí zvyšok
    }
    A.show(key, sub);
  };
  A.show = function (key, sub) {
    var sc = A.screens[key];
    if (!sc) {
      key = A.screens.pamat ? "pamat" : (A.screens.mapa ? "mapa" : Object.keys(A.screens)[0]);
      sc = A.screens[key];
    }
    if (!sc) { console.warn("Aura: žiadna obrazovka nie je registrovaná"); return; }
    A.state.screen = key;
    /* peek panel nesmie prežiť prechod obrazovky — inak nad novou obrazovkou
       visí detail zo starej (#/node/ deep-link si inšpektor otvorí až po show) */
    if (A.state._lastScreen && A.state._lastScreen !== key) A.closeDetail();
    A.state._lastScreen = key;
    $$(".view").forEach(function (v) { v.classList.remove("on"); });
    var v = $("#v-" + key);
    if (v) v.classList.add("on");
    $$("#nav button[data-v]").forEach(function (b) {
      b.setAttribute("aria-selected", String(b.getAttribute("data-v") === key));
    });
    $("#crumb").textContent = sc.group || "";
    $("#title").textContent = sc.title || key;
    document.title = "AuraAI · " + (sc.title || key);
    if (!sc._inited) { sc._inited = true; try { sc.init && sc.init(); } catch (e) { console.error("init " + key, e); } }
    try { sc.onShow && sc.onShow(sub); } catch (e) { console.error("onShow " + key, e); }
    w.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    A.closeSide();
    if (w.AuraChart) setTimeout(w.AuraChart.reflowAll, 30);
  };
  function fromHash() {
    var p = (location.hash || "").replace(/^#\/?/, "").split("/");
    /* #/node/<slug> — otvorí editovateľný inšpektor uzla nad domovskou obrazovkou */
    if (p[0] === "node" && p[1]) {
      if (!A.state.screen) A.show(A.screens.pamat ? "pamat" : (A.screens.mapa ? "mapa" : Object.keys(A.screens)[0]));
      if (A.mem && A.mem.inspect) A.mem.inspect(decodeURIComponent(p[1]));
      return;
    }
    /* E-shop je od v6 prvou appkou — starý odkaz #/eshop vedie na jej dashboard */
    if (p[0] === "eshop" && A.screens.appky) { A.go("appky", "eshop", true); return; }
    A.show(p[0] || (A.screens.pamat ? "pamat" : "mapa"), p[1]);
  }
  w.addEventListener("hashchange", fromHash);

  /* ---------- bočný panel na mobile ---------- */
  A.closeSide = function () { $("#side").classList.remove("open"); $("#dp-scrim").classList.remove("on"); };

  /* ---------- triediteľné tabuľky ---------- */
  A.sortable = function (table, getRows, render) {
    if (!table) return;
    var ths = $$("th[data-sort]", table);
    function paint() {
      ths.forEach(function (o) {
        var ar = $(".ar", o);
        if (table.__sort && table.__sort.key === o.getAttribute("data-sort")) {
          o.setAttribute("aria-sort", table.__sort.dir);
          ar.textContent = table.__sort.dir === "ascending" ? "↑" : "↓";
        } else { o.removeAttribute("aria-sort"); ar.textContent = "↕"; }
      });
      $$(".sortbar button", table.parentNode.parentNode || document).forEach(function (b) {
        if (!b.__forTable || b.__forTable !== table) return;
        b.setAttribute("aria-pressed", String(!!(table.__sort && table.__sort.key === b.getAttribute("data-k"))));
        b.textContent = b.__label + (table.__sort && table.__sort.key === b.getAttribute("data-k")
          ? (table.__sort.dir === "ascending" ? " ↑" : " ↓") : "");
      });
    }
    function doSort(key) {
      var dir = (table.__sort && table.__sort.key === key && table.__sort.dir === "ascending") ? "descending" : "ascending";
      table.__sort = { key: key, dir: dir };
      paint();
      render(A.sortRows(getRows(), key, dir));
    }
    ths.forEach(function (th) {
      th.setAttribute("tabindex", "0");
      th.setAttribute("role", "columnheader");
      if (!$(".ar", th)) { var s = document.createElement("span"); s.className = "ar"; s.textContent = "↕"; th.appendChild(s); }
      th.addEventListener("click", function () { doSort(th.getAttribute("data-sort")); });
      th.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); doSort(th.getAttribute("data-sort")); } });
    });
    /* mobilný panel triedenia — pod 900 px je tabuľka skrytá aj s hlavičkami */
    var wrap = table.closest(".tw");
    if (wrap && !wrap.__sortbar) {
      wrap.__sortbar = 1;
      var bar = document.createElement("div");
      bar.className = "sortbar";
      bar.setAttribute("aria-label", "Triedenie");
      ths.forEach(function (th) {
        var b = document.createElement("button");
        b.type = "button";
        b.__label = (th.textContent || "").replace(/[↕↑↓]/g, "").trim();
        b.__forTable = table;
        b.setAttribute("data-k", th.getAttribute("data-sort"));
        b.setAttribute("aria-pressed", "false");
        b.textContent = b.__label;
        b.addEventListener("click", function () { doSort(th.getAttribute("data-sort")); });
        bar.appendChild(b);
      });
      wrap.parentNode.insertBefore(bar, wrap);
    }
    paint();
  };

  /* ---------- pomôcky ---------- */
  A.fold = function (s) {
    return (s == null ? "" : String(s)).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  };
  A.hl = function (text, q) {
    if (!q) return esc(text);
    var f = A.fold(text), fq = A.fold(q), out = "", i = 0;
    while (true) {
      var p = f.indexOf(fq, i);
      if (p < 0 || !fq) { out += esc(text.slice(i)); break; }
      out += esc(text.slice(i, p)) + "<mark>" + esc(text.slice(p, p + q.length)) + "</mark>";
      i = p + q.length;
    }
    return out;
  };
  A.download = function (name, content, mime) {
    var blob = new Blob([content], { type: mime || "text/plain;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 400);
  };
  A.toCSV = function (cols, rows) {
    var esc2 = function (v) { v = v == null ? "" : String(v); return /[",;\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    return [cols.map(esc2).join(";")].concat(rows.map(function (r) { return r.map(esc2).join(";"); })).join("\n");
  };
  /* animácia čísla — LEN pri prvom zobrazení (defekt auditu č. 32) */
  var counted = {};
  A.count = function (elm, to, dec, unit) {
    var id = elm.getAttribute("data-cid") || (elm.setAttribute("data-cid", "c" + Math.random().toString(36).slice(2)), elm.getAttribute("data-cid"));
    var fin = w.AuraChart.fmtNum(to, dec) + (unit ? " " + unit : "");
    if (counted[id] || reduce) { elm.textContent = fin; return; }
    counted[id] = 1;
    var t0 = null;
    requestAnimationFrame(function f(ts) {
      if (!t0) t0 = ts;
      var p = Math.min((ts - t0) / 800, 1), k = 1 - Math.pow(1 - p, 3);
      elm.textContent = w.AuraChart.fmtNum(to * k, dec) + (unit ? " " + unit : "");
      if (p < 1) requestAnimationFrame(f); else elm.textContent = fin;
    });
  };
  /* deterministický pseudo-náhodný generátor pre hodnoverné priebehy */
  A.rng = function (seed) {
    var s = seed >>> 0 || 1;
    return function () { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  };
  A.series = function (seed, n, base, spread, trend) {
    var r = A.rng(seed), out = [], v = base;
    for (var i = 0; i < n; i++) {
      v += (r() - 0.5) * spread + (trend || 0);
      out.push(Math.max(0, +v.toFixed(3)));
    }
    return out;
  };
  A.hours = function (n, endHour) {
    var out = [], e = endHour == null ? 15 : endHour;
    for (var i = n - 1; i >= 0; i--) { var h = (e - i + 24) % 24; out.push((h < 10 ? "0" : "") + h + ":00"); }
    return out;
  };
  A.days = function (n) {
    var out = [], M = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
    var d = 1, m = 8;
    for (var i = n - 1; i >= 0; i--) {
      var dd = d - i;
      var mm = m;
      while (dd <= 0) { mm--; dd += 31; }
      out.push(dd + ". " + mm + ".");
    }
    return out;
  };

  /* ---------- Cmd-K ---------- */
  var cmdItems = [];
  A.registerCmd = function (items) { cmdItems = cmdItems.concat(items); };
  A.openCmd = function () {
    var m = $("#cmdk");
    m.classList.add("on");
    var inp = $("#cmdk-i");
    inp.value = ""; renderCmd(""); inp.focus();
  };
  function renderCmd(q) {
    var res = $("#cmdk-res");
    var fq = A.fold(q);
    var list = cmdItems.filter(function (it) { return !fq || A.fold(it.label + " " + (it.hint || "")).indexOf(fq) > -1; }).slice(0, 40);
    if (!list.length) { res.innerHTML = '<div class="empty"><span class="eico">∅</span><p>Nič nenájdené pre „' + esc(q) + '“.</p></div>'; return; }
    res.innerHTML = list.map(function (it, i) {
      return '<button class="r" data-i="' + i + '" role="option" aria-selected="' + (i === 0) + '">' +
        '<span>' + A.hl(it.label, q) + (it.hint ? ' <span class="t">' + esc(it.hint) + "</span>" : "") + "</span>" +
        (it.score != null ? '<span class="sc">' + w.AuraChart.fmtNum(it.score, 2) + "</span>" : "") + "</button>";
    }).join("");
    $$(".r", res).forEach(function (b, i) {
      b.addEventListener("click", function () { $("#cmdk").classList.remove("on"); list[i].run(); });
    });
  }
  A.closeCmd = function () { $("#cmdk").classList.remove("on"); };

  /* ---------- štart ---------- */
  A.boot = function () {
    /* navigácia */
    $("#nav").addEventListener("click", function (e) {
      var b = e.target.closest("button[data-v]");
      if (b) A.go(b.getAttribute("data-v"));
    });
    $("#burger").addEventListener("click", function () { $("#side").classList.add("open"); $("#dp-scrim").classList.add("on"); });
    $("#dp-scrim").addEventListener("click", function () { A.closeSide(); A.closeDetail(); });
    $("#dp-close").addEventListener("click", A.closeDetail);
    $("#themeBtn").addEventListener("click", function () { A.setTheme(A.state.theme === "light" ? "dark" : "light"); });
    $("#confirm-no").addEventListener("click", A.closeConfirm);
    $("#cmdk-i").addEventListener("input", function () { renderCmd(this.value); });
    $("#cmdBtn").addEventListener("click", A.openCmd);

    document.addEventListener("keydown", function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); A.openCmd(); }
      else if (e.key === "Escape") {
        if ($("#cmdk").classList.contains("on")) A.closeCmd();
        else if ($("#confirm").classList.contains("on")) A.closeConfirm();
        else if ($("#dp").classList.contains("on")) A.closeDetail();
        else if ($("#side").classList.contains("open")) A.closeSide();
      }
    });
    $$(".modal").forEach(function (m) {
      m.addEventListener("mousedown", function (e) { if (e.target === m) m.classList.remove("on"); });
    });

    /* hodiny + auto-refresh */
    function stamp() {
      var d = new Date();
      var p = function (x) { return (x < 10 ? "0" : "") + x; };
      $("#upd").textContent = "aktualizované " + p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds());
    }
    stamp();
    setInterval(function () {
      if (!A.state.autorefresh) return;
      stamp();
      w.dispatchEvent(new CustomEvent("aura:tick"));
    }, 2000);
    $("#autoBtn").addEventListener("click", function () {
      A.state.autorefresh = !A.state.autorefresh;
      this.classList.toggle("on", A.state.autorefresh);
      this.setAttribute("aria-pressed", String(A.state.autorefresh));
      $(".d", this).style.background = A.state.autorefresh ? "var(--good)" : "var(--ink-3)";
      A.toast(A.state.autorefresh ? "Automatické obnovovanie zapnuté (2 s)" : "Automatické obnovovanie vypnuté", "ok");
    });

    /* globálne príkazy do Cmd-K */
    A.registerCmd(Object.keys(A.screens).map(function (k) {
      return { label: "Prejsť na " + A.screens[k].title, hint: A.screens[k].group, run: function () { A.go(k); } };
    }));

    A.setTheme("dark", true);
    fromHash();
    if (!location.hash) A.go(A.screens.pamat ? "pamat" : "mapa", null, true);
  };
})(window);
