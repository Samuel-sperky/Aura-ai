/* ============================================================
   APPKY — nasadenia nad lokálnym jadrom
   Zoznam kariet + per-app dashboard: KPI → behy → náklady → pamäť.
   Dáta berie výhradne z Aura.apps / Aura.autos / Aura.mem.
   ============================================================ */
(function (w) {
  "use strict";

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { var d = document.createElement("div"); d.textContent = s == null ? "" : s; return d.innerHTML; }
  function A() { return w.Aura; }
  function C() { return w.AuraChart; }
  function mem() { return w.Aura.mem; }
  function F(v, d) { return w.AuraChart.fmtNum(v, d); }
  function apps() { return w.Aura.apps; }

  function mkTable(cols, rows) {
    return '<table class="tbl"><thead><tr>' + cols.map(function (c, i) { return "<th" + (i ? ' class="num"' : "") + ">" + esc(c) + "</th>"; }).join("") + "</tr></thead><tbody>" +
      rows.map(function (r) { return "<tr>" + r.map(function (v, i) { return "<td" + (i ? ' class="num"' : ' class="k"') + ">" + esc(v) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table>";
  }
  /* prepínač „graf → tabuľka" pre staticky aj dynamicky vložené karty */
  function bindToggle(btn, host, build) {
    if (!btn || !host || btn.__b) return;
    btn.__b = 1;
    var orig = btn.textContent;
    btn.addEventListener("click", function () {
      if (host.hasAttribute("hidden")) { host.innerHTML = build(); host.removeAttribute("hidden"); btn.textContent = "Skryť tabuľku"; btn.setAttribute("aria-expanded", "true"); }
      else { host.setAttribute("hidden", ""); btn.textContent = orig; btn.setAttribute("aria-expanded", "false"); }
    });
  }

  /* ============================================================
     E-SHOP — dávky spracovania (špecifické pre toto nasadenie)
     ============================================================ */
  var ES = {
    rows: [
      { id: "D-0412", when: "2. 8. 08:14", kind: "Popisy produktov", items: 48, min: 21, tps: 9.4, state: "Hotová", auto: "A-01", fail: 0 },
      { id: "D-0411", when: "1. 8. 19:02", kind: "Odpovede zákazníkom", items: 126, min: 14, tps: 11.2, state: "Hotová", auto: "A-06", fail: 0 },
      { id: "D-0410", when: "1. 8. 14:37", kind: "Kategorizácia", items: 310, min: 9, tps: 12.8, state: "Hotová", auto: "A-06", fail: 0 },
      { id: "D-0409", when: "1. 8. 09:20", kind: "Popisy produktov", items: 52, min: 24, tps: 8.9, state: "Hotová", auto: "A-01", fail: 0 },
      { id: "D-0408", when: "31. 7. 20:41", kind: "Preklady SK→EN", items: 64, min: 18, tps: 10.1, state: "Hotová", auto: "A-07", fail: 0 },
      { id: "D-0407", when: "31. 7. 15:05", kind: "Popisy produktov", items: 41, min: 19, tps: 9.1, state: "Čiastočná", auto: "A-01", fail: 9 },
      { id: "D-0406", when: "31. 7. 10:12", kind: "Kategorizácia", items: 288, min: 8, tps: 13.1, state: "Hotová", auto: "A-06", fail: 0 },
      { id: "D-0405", when: "30. 7. 18:55", kind: "Odpovede zákazníkom", items: 97, min: 11, tps: 11.6, state: "Hotová", auto: "A-06", fail: 0 },
      { id: "D-0404", when: "30. 7. 11:30", kind: "Popisy produktov", items: 55, min: 26, tps: 8.6, state: "Hotová", auto: "A-01", fail: 0 },
      { id: "D-0403", when: "29. 7. 21:08", kind: "Preklady SK→EN", items: 72, min: 20, tps: 10.4, state: "Zlyhala", auto: "A-07", fail: 29 },
      { id: "D-0402", when: "29. 7. 13:44", kind: "Kategorizácia", items: 265, min: 8, tps: 12.6, state: "Hotová", auto: "A-06", fail: 0 },
      { id: "D-0401", when: "29. 7. 08:02", kind: "Popisy produktov", items: 46, min: 22, tps: 9.0, state: "Hotová", auto: "A-01", fail: 0 }
    ],
    kindFilter: null
  };
  function esVisible() { return ES.kindFilter ? ES.rows.filter(function (r) { return r.kind === ES.kindFilter; }) : ES.rows.slice(); }
  function esStateBadge(s) { return '<span class="badge ' + (s === "Hotová" ? "ok" : s === "Zlyhala" ? "bad" : "warn") + '">' + esc(s) + "</span>"; }
  function esById(id) { for (var i = 0; i < ES.rows.length; i++) if (ES.rows[i].id === id) return ES.rows[i]; return null; }
  function esFchip() {
    var host = $("#es-fchip"); if (!host) return;
    host.innerHTML = ES.kindFilter ? '<div class="fchip">filtrované z <b>' + esc(ES.kindFilter) + '</b> <button aria-label="Zrušiť filter" id="es-fclr">✕</button></div>' : "";
    var b = $("#es-fclr"); if (b) b.addEventListener("click", function () { ES.kindFilter = null; esRenderRows(esVisible()); esFchip(); A().toast("Filter zrušený", "ok"); });
  }
  function esRetry(r, onlyFailed) {
    var Ax = A();
    Ax.closeDetail();
    var prevFail = r.fail;
    r.state = "Opakuje sa"; r.__retry = onlyFailed ? "chybné" : "celá";
    esRenderRows(esVisible());
    Ax.toast(onlyFailed ? "Opakujem " + F(prevFail, 0) + " chybných položiek dávky " + r.id + "…" : "Opakujem celú dávku " + r.id + " (" + F(r.items, 0) + " položiek)…");
    setTimeout(function () {
      r.fail = 0; r.state = "Hotová"; r.__retry = null;
      esRenderRows(esVisible());
      Ax.toast("Dávka " + r.id + " dokončená — 0 chybných položiek", "ok");
    }, Ax.reduce ? 300 : 1600);
  }
  function esDetail(r) {
    var Ax = A();
    var pct = r.state === "Zlyhala" ? 0 : r.state === "Čiastočná" ? 78 : 100;
    var done = Math.round(r.items * pct / 100);
    var autoName = ({ "A-01": "Popisy produktov z katalógu", "A-06": "Kategorizácia reklamácií", "A-07": "Preklad popisov SK→EN" })[r.auto] || r.auto;
    Ax.detail("Dávka " + r.id, "<dl>" +
      "<dt>Spustená</dt><dd>" + esc(r.when) + "</dd>" +
      "<dt>Typ úlohy</dt><dd>" + esc(r.kind) + "</dd>" +
      "<dt>Položiek</dt><dd>" + F(r.items, 0) + " (spracovaných " + F(done, 0) + (r.fail ? ", chybných " + F(r.fail, 0) : "") + ")</dd>" +
      "<dt>Trvanie</dt><dd>" + F(r.min, 0) + " min</dd>" +
      "<dt>Priepustnosť</dt><dd>" + F(r.tps, 1) + " tok/s</dd>" +
      "<dt>Model</dt><dd>qwen3:4b · lokálne, CPU</dd>" +
      "<dt>Zóna dát</dt><dd>" + esc(mem().zoneLabel(mem().areaByKey("biz"))) + "</dd>" +
      "<dt>Spúšťajúca automatizácia</dt><dd><button class=\"lk\" id=\"es-toauto\">" + esc(autoName) + " (" + esc(r.auto) + ")</button></dd>" +
      "<dt>Odoslané von</dt><dd>nič — celá dávka prebehla na stroji</dd>" +
      "<dt>Stav</dt><dd>" + esStateBadge(r.state) + "</dd></dl>" +
      (r.state === "Zlyhala" ? '<div class="alert bad"><span class="ai"></span><span><b>Dávka zlyhala po ' + F(r.items - r.fail, 0) + ' položkách</b>Ollama vrátila chybu pri načítaní modelu — nedostatok voľnej RAM. Zvyšných ' + F(r.fail, 0) + ' položiek sa nespracovalo.</span></div>'
        : r.state === "Čiastočná" ? '<div class="alert warn"><span class="ai"></span><span><b>' + F(r.fail, 0) + ' položiek preskočených</b>Chýbal zdrojový text v katalógu, položky ostali nezmenené.</span></div>'
          : '<p class="note">Bez chýb. Výstupy zapísané do katalógu, pôvodné texty zálohované.</p>'),
      (function () {
        var acts = [{ label: "Zobraziť položky a logy", kind: "ghost", fn: function () { Ax.closeDetail(); Ax.go("observabilita", "app:eshop"); } }];
        if (r.fail > 0) acts.push({ label: "Zopakovať len chybné (" + F(r.fail, 0) + ")", fn: function () { esRetry(r, true); } });
        acts.push({ label: "Zopakovať celú dávku", kind: r.fail ? "ghost" : "", fn: function () { esRetry(r, false); } });
        return acts;
      })());
    var tb = $("#es-toauto"); if (tb) tb.addEventListener("click", function () { Ax.closeDetail(); Ax.go("automatizacie", r.auto); });
  }
  function esRenderRows(rows) {
    var tb = $("#es-tbl tbody"), cards = $("#es-cards");
    if (!tb) return;
    var cnt = $("#es-cnt"); if (cnt) cnt.textContent = F(rows.length, 0) + " záznamov";
    if (!rows.length) {
      tb.innerHTML = '<tr><td colspan="7"><div class="empty"><span class="eico">∅</span><p>Pre tento filter niet dávok.</p><button class="btn ghost" id="es-clr">Zrušiť filter</button></div></td></tr>';
      cards.innerHTML = "";
      var c = $("#es-clr"); if (c) c.addEventListener("click", function () { ES.kindFilter = null; esRenderRows(esVisible()); esFchip(); A().toast("Filter zrušený", "ok"); });
      return;
    }
    tb.innerHTML = rows.map(function (r) {
      return '<tr tabindex="0" data-id="' + r.id + '"><td class="k">' + esc(r.id) + "</td><td>" + esc(r.when) + "</td><td>" + esc(r.kind) + '</td><td class="num">' + F(r.items, 0) + '</td><td class="num">' + F(r.min, 0) + ' min</td><td class="num">' + F(r.tps, 1) + "</td><td>" + esStateBadge(r.state) + "</td></tr>";
    }).join("");
    cards.innerHTML = rows.map(function (r) {
      return '<div class="rowcard" tabindex="0" data-id="' + r.id + '"><div class="rh"><b class="mono">' + esc(r.id) + "</b>" + esStateBadge(r.state) + "</div><dl><dt>Spustená</dt><dd>" + esc(r.when) + "</dd><dt>Typ</dt><dd>" + esc(r.kind) + "</dd><dt>Položiek</dt><dd>" + F(r.items, 0) + "</dd><dt>Trvanie</dt><dd>" + F(r.min, 0) + " min</dd></dl></div>";
    }).join("");
    function bind(el) {
      el.addEventListener("click", function () { var r = esById(el.getAttribute("data-id")); if (r) esDetail(r); });
      el.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); var r = esById(el.getAttribute("data-id")); if (r) esDetail(r); } });
    }
    $$("#es-tbl tbody tr[data-id]").forEach(bind);
    $$("#es-cards .rowcard[data-id]").forEach(bind);
  }

  /* ============================================================
     spoločné pomôcky appiek
     ============================================================ */
  var HB = { ok: "ok", warn: "warn", bad: "bad", mute: "mute", none: "mute" };
  function healthBadge(h) { return '<span class="badge ' + HB[h.k] + '">' + esc(h.label) + "</span>"; }
  function appColor(app) { return app.color || "var(--teal)"; }

  /* ============================================================
     ZOZNAM APPIEK
     ============================================================ */
  function sortedApps() {
    var rank = { bad: 0, warn: 1, mute: 2, none: 3, ok: 4 };
    return apps().all().slice().sort(function (a, b) {
      var ha = apps().health(a), hb = apps().health(b);
      if (rank[ha.k] !== rank[hb.k]) return rank[ha.k] - rank[hb.k];
      return (b.share || 0) - (a.share || 0);
    });
  }

  function renderKpi() {
    var host = $("#ap-kpi"); if (!host) return;
    var list = apps().all();
    var runsToday = list.reduce(function (s, a) { return s + apps().kpi(a).today; }, 0);
    var autos = list.reduce(function (s, a) { return s.concat(apps().autos(a)); }, []);
    var errs = autos.filter(function (r) { return r.state === "Chyba"; }).length;
    var eur = list.reduce(function (s, a) { return s + apps().cost(a).eur; }, 0);
    var items = [
      { l: "Appky v prevádzke", v: F(list.filter(function (a) { return !a.paused; }).length, 0), d: "z " + F(list.length, 0) + " celkom", tl: true },
      { l: "Spracované dnes", v: F(runsToday, 0), d: "položiek naprieč appkami" },
      { l: "Automatizácie v chybe", v: F(errs, 0), d: errs ? "vyžadujú zásah" : "všetko beží", bad: errs > 0 },
      { l: "Náklad za mesiac", v: F(eur, 2), u: "€", d: "elektrina pri " + F(apps().MACHINE.rkwh, 2) + " €/kWh" }
    ];
    host.innerHTML = items.map(function (k, i) {
      return '<button class="kpi' + (k.tl ? " tl" : "") + '" data-k="' + i + '"><span class="kl">' + esc(k.l) + '</span><b>' + esc(k.v) + (k.u ? " <em>" + k.u + "</em>" : "") + '</b><span class="kd' + (k.bad ? " dn" : "") + '">' + esc(k.d) + "</span></button>";
    }).join("");
    $$("#ap-kpi .kpi").forEach(function (b, i) {
      b.addEventListener("click", function () {
        if (i === 2 && errs) { A().go("automatizacie", "A-11"); return; }
        if (i === 3) { A().go("naklady"); return; }
        A().toast(items[i].l + ": " + items[i].v + (items[i].u ? " " + items[i].u : ""), "ok");
      });
    });
  }

  function renderCards() {
    var host = $("#ap-cards"); if (!host) return;
    var list = sortedApps();
    host.innerHTML = list.map(function (app) {
      var k = apps().kpi(app), h = k.health, c = k.cost;
      return '<button class="appcard" data-slug="' + esc(app.slug) + '" style="--ac:' + appColor(app) + '">' +
        '<span class="ac-h"><span class="ac-ico">' + apps().icon(app, 18) + "</span>" +
        "<span class=\"ac-t\"><b>" + esc(app.name) + "</b><span>" + esc(app.kind) + "</span></span>" +
        healthBadge(h) + "</span>" +
        '<span class="ac-spk" id="ac-spk-' + esc(app.slug) + '"></span>' +
        '<span class="ac-g">' +
        "<span><i>Zdravie behov</i><b>" + (h.ok ? F(h.ok, 1) + " %" : "—") + "</b></span>" +
        "<span><i>Posledná aktivita</i><b>" + esc(k.last) + "</b></span>" +
        "<span><i>Objem dnes</i><b>" + F(k.today, 0) + "</b></span>" +
        "<span><i>Náklad mesiac</i><b>" + F(c.eur, 2) + " €</b></span>" +
        "</span></button>";
    }).join("");
    list.forEach(function (app) {
      var v = apps().vol(app, 14);
      C().render("#ac-spk-" + app.slug, {
        type: "sparkline", title: "Objem appky " + app.name + " za 14 dní", height: 30, legend: false,
        series: [{ key: "v", label: "objem", unit: "ks", dec: 0, color: appColor(app), data: v.map(function (y) { return { y: y }; }) }]
      });
    });
    $$("#ap-cards .appcard").forEach(function (b) {
      b.addEventListener("click", function () { A().go("appky", b.getAttribute("data-slug")); });
    });
  }

  function renderListCharts() {
    var list = apps().all(), days = A().days(14);
    var cols = list.map(function (a) { return appColor(a); });
    var data = list.map(function (a) { return apps().vol(a, 14); });
    C().render("#ap-ch-vol", {
      type: "stacked", title: "Objem podľa appky", height: 210, caption: "posledných 14 dní · 1 stĺpec = 1 deň · denné rozloženie je simulované",
      x: { labels: days }, xTitle: "Deň", yLeft: { unit: "ks", dec: 0 },
      series: list.map(function (a, i) { return { key: a.slug, label: a.name, unit: "ks", dec: 0, color: cols[i], data: data[i].map(function (y) { return { y: y }; }) }; })
    });
    bindToggle($("#ap-vol-tbl"), $("#ap-vol-t"), function () {
      return mkTable(["Deň"].concat(list.map(function (a) { return a.name; })), days.map(function (d, i) { return [d].concat(data.map(function (s) { return F(s[i], 0); })); }));
    });

    var costs = list.map(function (a) { return apps().cost(a); });
    C().render("#ap-ch-cost", {
      type: "donut", title: "Náklady podľa appky", height: 210, unit: "€ / mesiac",
      centerLabel: F(costs.reduce(function (s, c) { return s + c.eur; }, 0), 2), centerSub: "€ / mesiac",
      caption: "rozpad mesačnej spotreby stroja (68,4 kWh) na appky · klik na výsek otvorí appku",
      items: list.map(function (a, i) { return { label: a.name, v: +costs[i].eur.toFixed(2), color: cols[i], slug: a.slug }; }),
      onSlice: function (it) { if (it.slug) A().go("appky", it.slug); }
    });
    bindToggle($("#ap-cost-tbl"), $("#ap-cost-t"), function () {
      return mkTable(["Appka", "Podiel %", "kWh", "€ / mesiac", "Tokeny M"], list.map(function (a, i) {
        return [a.name, F(costs[i].share * 100, 1), F(costs[i].kwh, 1), F(costs[i].eur, 2), F(costs[i].tok, 1)];
      }));
    });
  }

  /* ---------- formulár novej appky (staged) ---------- */
  function appForm() {
    var card = $("#ap-formcard"), host = $("#ap-form");
    if (!card || !host) return;
    var Ax = A();
    var deps = w.Aura.autos.deps, mcpAll = Object.keys(w.Aura.autos.MCP || { Asana: 1 });
    var memDeps = mem().deps().map(function (d) { return d.name; });
    host.innerHTML =
      '<div class="ch"><h3>Nová appka</h3><span class="sp"></span><span class="badge info">zmeny sa uložia až tlačidlom</span></div>' +
      '<div style="padding:0 14px 14px">' +
      '<div class="row g2" style="margin-bottom:10px">' +
      '<div class="field"><label for="af-name">Názov appky</label><input type="text" id="af-name" placeholder="napr. Reklamácie"></div>' +
      '<div class="field"><label for="af-kind">Typ nasadenia</label><select id="af-kind">' + apps().KINDS.map(function (k) { return "<option>" + esc(k) + "</option>"; }).join("") + "</select></div></div>" +
      '<div class="field" style="margin-bottom:10px"><label for="af-desc">Popis (čo appka robí)</label><textarea id="af-desc" rows="2" placeholder="Jedna–dve vety, čo nasadenie reálne robí."></textarea></div>' +
      '<div class="field" style="margin-bottom:10px"><label id="af-deps-l">Oddelenia — určujú, ktoré automatizácie a uzly pamäte appka vidí</label><div class="chips" id="af-deps" role="group" aria-labelledby="af-deps-l">' +
      deps.map(function (d) { return '<button type="button" class="chz" data-dep="' + esc(d) + '" aria-pressed="false">' + esc(d) + "</button>"; }).join("") + "</div></div>" +
      '<div class="field" style="margin-bottom:10px"><label for="af-mem">Oddelenia pamäte (voliteľné)</label><select id="af-mem" multiple size="4">' +
      memDeps.map(function (d) { return "<option>" + esc(d) + "</option>"; }).join("") + "</select></div>" +
      '<div class="field" style="margin-bottom:10px"><label id="af-mcp-l">MCP nástroje, ktoré smie appka použiť</label><div class="chips" id="af-mcp" role="group" aria-labelledby="af-mcp-l">' +
      mcpAll.map(function (n) { return '<button type="button" class="chz" data-mcp="' + esc(n) + '" aria-pressed="false">' + w.Aura.autos.mcpIcon(n) + esc(n) + "</button>"; }).join("") + "</div></div>" +
      '<div class="dirty"><span class="note" style="margin:0">Appka vznikne prázdna — čísla pribudnú, až keď jej oddelenia začnú bežať.</span><span class="sp" style="flex:1"></span>' +
      '<button class="btn ghost" id="af-cancel">Zrušiť</button><button class="btn" id="af-save">Vytvoriť appku</button></div></div>';
    card.removeAttribute("hidden");
    $$("#ap-form .chz").forEach(function (b) {
      b.addEventListener("click", function () { b.setAttribute("aria-pressed", b.getAttribute("aria-pressed") === "true" ? "false" : "true"); });
    });
    $("#af-name").focus();
    $("#af-cancel").addEventListener("click", function () { card.setAttribute("hidden", ""); host.innerHTML = ""; });
    $("#af-save").addEventListener("click", function () {
      var name = $("#af-name").value.trim();
      if (!name) { Ax.toast("Appka potrebuje názov", "warn"); $("#af-name").focus(); return; }
      var app = apps().create({
        name: name, kind: $("#af-kind").value, desc: $("#af-desc").value,
        deps: $$("#af-deps .chz[aria-pressed='true']").map(function (b) { return b.getAttribute("data-dep"); }),
        memDeps: $$("#af-mem option:checked").map(function (o) { return o.value; }),
        mcp: $$("#af-mcp .chz[aria-pressed='true']").map(function (b) { return b.getAttribute("data-mcp"); })
      });
      card.setAttribute("hidden", ""); host.innerHTML = "";
      registerAppCmds(app);
      Ax.toast("Appka „" + app.name + "“ vytvorená", "ok");
      Ax.go("appky", app.slug);
    });
  }

  /* ============================================================
     DETAIL APPKY
     ============================================================ */
  function tabs(cur) {
    var list = apps().all();
    return '<div class="seg aptabs" id="ap-tabs" role="tablist" aria-label="Appky">' +
      '<button role="tab" data-slug="" aria-selected="false">Všetky</button>' +
      list.map(function (a) {
        return '<button role="tab" data-slug="' + esc(a.slug) + '" aria-selected="' + (cur && a.slug === cur.slug) + '">' + esc(a.name) + "</button>";
      }).join("") + "</div>";
  }

  function sech(n, title, desc) {
    return '<div class="sech"><span class="n">' + n + "</span><h2>" + esc(title) + "</h2><p>" + esc(desc) + "</p></div>";
  }

  /* mini výrez siete — len uzly appky a hrany medzi nimi */
  function miniNet(app, host) {
    var nodes = apps().nodes(app).slice(0, 26);
    if (!nodes.length) { host.innerHTML = '<div class="empty"><span class="eico">∅</span><p>Appka zatiaľ nemá viazané uzly pamäte.</p></div>'; return; }
    var ids = {}; nodes.forEach(function (n, i) { ids[n.id] = i; });
    var W = 320, H = 190, cx = W / 2, cy = H / 2, R = Math.min(cx, cy) - 22;
    var pos = nodes.map(function (n, i) {
      var t = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
      var rr = R * (nodes.length > 12 && i % 2 ? 0.62 : 1);
      return { x: cx + Math.cos(t) * rr, y: cy + Math.sin(t) * rr, n: n };
    });
    var edges = mem().edges().filter(function (e) { return ids[e.a] != null && ids[e.b] != null; }).slice(0, 60);
    var svg = '<svg viewBox="0 0 ' + W + " " + H + '" width="100%" height="' + H + '" role="img" aria-label="Výrez pamäte appky ' + esc(app.name) + ' — ' + nodes.length + ' uzlov, ' + edges.length + ' spojení">' +
      '<title>Výrez pamäte appky ' + esc(app.name) + "</title>" +
      edges.map(function (e) {
        var a = pos[ids[e.a]], b = pos[ids[e.b]];
        return '<line x1="' + a.x.toFixed(1) + '" y1="' + a.y.toFixed(1) + '" x2="' + b.x.toFixed(1) + '" y2="' + b.y.toFixed(1) + '" stroke="var(--line)" stroke-width="' + (0.6 + e.w * 1.6).toFixed(2) + '"/>';
      }).join("") +
      pos.map(function (p, i) {
        var r = 3.5 + p.n.str * 4.5;
        return '<g class="mn-n" tabindex="0" role="button" data-i="' + i + '" aria-label="' + esc(p.n.name) + '">' +
          '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="' + r.toFixed(1) + '" fill="' + appColor(app) + '" fill-opacity="' + (0.35 + p.n.str * 0.55).toFixed(2) + '" stroke="' + appColor(app) + '" stroke-width="1"/>' +
          "<title>" + esc(p.n.name) + " · sila " + F(p.n.str, 2) + "</title></g>";
      }).join("") + "</svg>";
    host.innerHTML = svg;
    $$(".mn-n", host).forEach(function (g) {
      function open() { mem().inspect(pos[+g.getAttribute("data-i")].n); }
      g.addEventListener("click", open);
      g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
    });
  }

  function renderHead(app) {
    var h = apps().health(app);
    $("#ap-head").innerHTML =
      '<div class="ah-top">' +
      '<span class="ah-ico" style="color:' + appColor(app) + '">' + apps().icon(app, 20) + "</span>" +
      '<span class="ah-t"><b>' + esc(app.name) + "</b><span>" + esc(app.kind) + " · " + esc(app.host) + " · v" + esc(app.ver) + "</span></span>" +
      healthBadge(h) +
      '<span class="sp" style="flex:1"></span>' +
      '<button class="pill' + (app.paused ? "" : " on") + '" id="ap-pause" aria-pressed="' + (!app.paused) + '"><span class="d"></span>' + (app.paused ? "Pozastavená" : "Beží") + "</button>" +
      '<button class="btn ghost sm" id="ap-back">Všetky appky</button>' +
      "</div>" + tabs(app);
    $("#ap-back").addEventListener("click", function () { A().go("appky"); });
    $$("#ap-tabs button").forEach(function (b) {
      b.addEventListener("click", function () {
        var s = b.getAttribute("data-slug");
        A().go("appky", s || null);
      });
    });
    $("#ap-pause").addEventListener("click", function () {
      var Ax = A();
      if (!app.paused) {
        Ax.confirm("Pozastaviť appku " + app.name + "?",
          "Automatizácie appky (" + F(apps().autos(app).length, 0) + ") prestanú bežať a naplánované spustenia sa preskočia. Pamäť ani história behov sa nezmažú.",
          function () { apps().setPaused(app, true); renderDetail(app); Ax.toast(app.name + " · pozastavená", "warn"); }, "Pozastaviť", true);
      } else {
        apps().setPaused(app, false); renderDetail(app); Ax.toast(app.name + " · obnovená", "ok");
      }
    });
  }

  function renderAlert(app) {
    var host = $("#ap-alert"), al = apps().alerts(app);
    if (!al.length) { host.innerHTML = ""; return; }
    host.innerHTML = '<div class="alert bad" style="margin-bottom:12px"><span class="ai"></span><span><b>' + esc(al[0].title) + "</b>" +
      (al.length > 1 ? "a ďalšie " + F(al.length - 1, 0) + " automatizácie appky sú v chybe. " : "") +
      'Otvorte Observabilitu a pozrite, čo beh zhodilo.</span><button class="btn ghost sm" id="ap-toobs">Otvoriť Observabilitu</button></div>';
    $("#ap-toobs").addEventListener("click", function () { A().go("observabilita", "app:" + app.slug); });
  }

  function runsCSV(app) {
    var Ax = A(), rows = apps().runs(app, 20);
    Ax.download("auraai-behy-" + app.slug + ".csv",
      Ax.toCSV(["Kedy", "Automatizácia", "Oddelenie", "Výsledok", "Tokeny", "Trvanie (min)"],
        rows.map(function (r) { return [r.t, r.name, r.dep, r.res, r.tok, r.min]; })), "text/csv;charset=utf-8");
    Ax.toast("Exportovaných " + rows.length + " behov do CSV", "ok");
  }

  function renderDetail(app) {
    var Ax = A(), k = apps().kpi(app), c = k.cost, rows = apps().autos(app), runs = apps().runs(app, 20);
    var nodes = apps().nodes(app), weak = nodes.filter(function (n) { return n.str < 0.4; });
    var tools = apps().tools(app);
    var isEshop = app.slug === "eshop";

    renderHead(app);
    renderAlert(app);

    var empty = !rows.length;
    var html = '<p class="lead" style="margin-bottom:14px">' + esc(app.desc || "Nové nasadenie bez popisu.") + "</p>";

    /* ---- 01 KPI a trend ---- */
    html += sech("01", "KPI a trend", "Ako sa appke darí a čo za posledné dva týždne spravila.");
    html += '<div class="row g4" id="apd-kpi"></div>';
    html += '<div class="row g2">' +
      '<div class="card"><div class="ch"><h3>Objem appky</h3><span class="srcbadge sim">simulované</span><span class="sp"></span><button class="btn ghost sm" id="apd-vol-tbl" aria-expanded="false">Tabuľka</button></div><div id="apd-ch-vol"></div><div class="tw" id="apd-vol-t" hidden></div></div>' +
      '<div class="card"><div class="ch"><h3>Úspešnosť automatizácií</h3><span class="srcbadge demo">ukážkové</span><span class="sp"></span><button class="btn ghost sm" id="apd-ok-tbl" aria-expanded="false">Tabuľka</button></div><div id="apd-ch-ok"></div><div class="tw" id="apd-ok-t" hidden></div></div>' +
      "</div>";
    html += '<div class="card"><div class="ch"><h3>MCP nástroje appky</h3><span class="badge mute">' + F(tools.length, 0) + "</span><span class=\"sp\"></span><span class=\"note\" style=\"margin:0\">egress cez klasifikátor · von ide len to, čo prejde bránou</span></div>" +
      (tools.length ? '<div class="tw"><table class="tbl"><thead><tr><th>Nástroj</th><th>Automatizácií</th><th>Posledné použitie</th></tr></thead><tbody>' +
        tools.map(function (t) { return "<tr><td class=\"k\">" + w.Aura.autos.mcpIcon(t.name) + esc(t.name) + '</td><td class="num">' + F(t.n, 0) + "</td><td>" + esc(t.last) + "</td></tr>"; }).join("") +
        "</tbody></table></div>" : '<div class="empty"><span class="eico">∅</span><p>Appka nepoužíva žiadny MCP nástroj — všetko beží na stroji.</p></div>') + "</div>";

    /* ---- 02 Behy a trace ---- */
    html += sech("02", "Behy a trace", "Posledných 20 behov automatizácií appky. Klik na riadok otvorí trace strom.");
    if (empty) {
      html += '<div class="card"><div class="empty"><span class="eico">∅</span><p><b>Zatiaľ žiadne behy.</b></p>' +
        "<p>Appka " + esc(app.name) + " má priradené oddelenia: " + (app.deps.length ? "<b>" + esc(app.deps.join(", ")) + "</b>" : "<b>žiadne</b>") +
        ". Behy pribudnú, keď v týchto oddeleniach vznikne automatizácia.</p>" +
        '<button class="btn" id="apd-newauto">Pridať automatizáciu</button></div></div>';
    } else {
      html += '<div class="card"><div class="ch"><h3>Posledné behy</h3><span class="tag" id="apd-rcnt">' + F(runs.length, 0) + " záznamov</span><span class=\"sp\"></span>" +
        '<button class="btn ghost sm" id="apd-allruns">Všetky behy appky</button><button class="btn ghost sm" id="apd-csv">Export CSV</button></div>' +
        '<div class="tw"><table class="tbl" id="apd-tbl"><thead><tr><th data-sort="t">Kedy</th><th data-sort="name">Automatizácia</th><th data-sort="dep">Oddelenie</th><th>MCP</th><th data-sort="tok" class="num">Tokeny</th><th data-sort="min" class="num">Trvanie</th><th data-sort="res">Výsledok</th></tr></thead><tbody></tbody></table></div>' +
        '<div class="cards-only" id="apd-cards"></div></div>';
    }
    if (isEshop) {
      html += '<div class="card"><div class="ch"><h3>Dávky spracovania</h3><span class="badge info">špecifické pre e-shop</span><span class="tag" id="es-cnt">12 záznamov</span><span class="sp"></span><button class="btn ghost sm" id="es-csv">Export CSV</button></div>' +
        '<div id="es-fchip"></div>' +
        '<div class="tw"><table class="tbl" id="es-tbl"><thead><tr><th data-sort="id">Dávka</th><th data-sort="when">Spustená</th><th data-sort="kind">Typ úlohy</th><th data-sort="items" class="num">Položiek</th><th data-sort="min" class="num">Trvanie</th><th data-sort="tps" class="num">tok/s</th><th data-sort="state">Stav</th></tr></thead><tbody></tbody></table></div>' +
        '<div class="cards-only" id="es-cards"></div></div>';
    }

    /* ---- 03 Náklady appky ---- */
    html += sech("03", "Náklady appky", "Podiel appky na spotrebe stroja. Sadzbu vlastnia Nastavenia, celkové čísla Náklady.");
    html += '<div class="row g2"><div class="card"><div class="ch"><h3>Náklady v čase</h3><span class="srcbadge sim">simulované</span><span class="sp"></span><button class="btn ghost sm" id="apd-cost-tbl" aria-expanded="false">Tabuľka</button></div><div id="apd-ch-cost"></div><div class="tw" id="apd-cost-t" hidden></div></div>' +
      '<div class="card"><div class="ch"><h3>Rozpad nákladov</h3><span class="srcbadge meas">merané</span></div>' +
      "<dl><dt>Podiel na spotrebe stroja</dt><dd>" + F(c.share * 100, 1) + " %</dd>" +
      "<dt>Spotreba</dt><dd>" + F(c.kwh, 1) + " kWh / mesiac</dd>" +
      "<dt>Elektrina</dt><dd>" + F(c.eur, 2) + " € / mesiac pri " + F(apps().MACHINE.rkwh, 2) + " €/kWh</dd>" +
      "<dt>Tokeny</dt><dd>" + F(c.tok, 1) + " M / mesiac</dd>" +
      "<dt>Dopyty</dt><dd>" + F(c.q, 0) + " / mesiac</dd>" +
      "<dt>Ušetrený čas</dt><dd>" + F(k.saved, 0) + " h / mesiac (odhad z automatizácií)</dd></dl>" +
      '<button class="btn ghost sm" id="apd-tonak">Otvoriť Náklady</button></div></div>';

    /* ---- 04 Pamäť appky ---- */
    html += sech("04", "Pamäť appky", "Uzly viazané cez oddelenie alebo tag. Klik otvorí editovateľný inšpektor.");
    html += '<div class="row g2"><div class="card"><div class="ch"><h3>Výrez siete</h3><span class="badge mute">' + F(nodes.length, 0) + " uzlov</span><span class=\"sp\"></span><button class=\"btn ghost sm\" id=\"apd-tomem\">Otvoriť v Pamäti</button></div><div id=\"apd-net\"></div>" +
      '<p class="note">Väzba je cez oddelenia pamäte' + (app.memDeps && app.memDeps.length ? " (" + esc(app.memDeps.join(", ")) + ")" : "") + (app.tags && app.tags.length ? " a tagy (" + esc(app.tags.join(", ")) + ")" : "") + ".</p></div>" +
      '<div class="card"><div class="ch"><h3>Naposledy použité uzly</h3><span class="srcbadge demo">ukážkové</span></div><div class="feed" id="apd-nodes"></div>' +
      (weak.length ? '<div class="alert warn" style="margin-top:10px"><span class="ai"></span><span><b>' + F(weak.length, 0) + " slabých uzlov pod 0,40</b>Appka čerpá z uzlov, ktorým Aura sama neverí. Prejdite ich v čistení pamäte.</span><button class=\"btn ghost sm\" id=\"apd-clean\">Vyčistiť pamäť</button></div>" : "") +
      "</div></div>";

    $("#ap-body").innerHTML = html;

    /* ---- KPI ---- */
    var kpiItems = [
      { l: "Zdravie behov", v: k.health.ok ? F(k.health.ok, 1) : "—", u: k.health.ok ? "%" : "", d: k.health.label, tl: true },
      { l: "Posledná aktivita", v: k.last, d: rows.length ? F(rows.length, 0) + " automatizácií" : "bez automatizácií" },
      { l: "Objem dnes", v: F(k.today, 0), d: "položiek · 14-dňový priemer " + F(apps().vol(app, 14).reduce(function (a, b) { return a + b; }, 0) / 14, 0) },
      { l: "Náklad mesiac", v: F(c.eur, 2), u: "€", d: F(c.share * 100, 1) + " % spotreby stroja" }
    ];
    $("#apd-kpi").innerHTML = kpiItems.map(function (x, i) {
      return '<button class="kpi' + (x.tl ? " tl" : "") + '" data-k="' + i + '"><span class="kl">' + esc(x.l) + '</span><b>' + esc(x.v) + (x.u ? " <em>" + x.u + "</em>" : "") + '</b><span class="kd">' + esc(x.d) + "</span></button>";
    }).join("");
    $$("#apd-kpi .kpi").forEach(function (b, i) {
      b.addEventListener("click", function () {
        if (i === 0 || i === 1) A().go("automatizacie", "app:" + app.slug);
        else if (i === 3) A().go("naklady");
        else A().toast(kpiItems[i].l + ": " + kpiItems[i].v, "ok");
      });
    });

    /* ---- grafy ---- */
    var days = A().days(14), vol = apps().vol(app, 14);
    C().render("#apd-ch-vol", {
      type: "line", title: "Objem appky " + app.name, height: 200, caption: "posledných 14 dní · 1 bod = 1 deň · denné rozloženie je simulované",
      x: { labels: days }, xTitle: "Deň", yLeft: { unit: "ks", dec: 0 },
      series: [{ key: "v", label: "spracované položky", unit: "ks", dec: 0, color: appColor(app), data: vol.map(function (y) { return { y: y }; }) }]
    });
    bindToggle($("#apd-vol-tbl"), $("#apd-vol-t"), function () { return mkTable(["Deň", "Položiek"], days.map(function (d, i) { return [d, F(vol[i], 0)]; })); });

    var okRows = rows.length ? rows : [];
    C().render("#apd-ch-ok", {
      type: "bar", title: "Úspešnosť automatizácií appky", height: 200, caption: okRows.length ? "aktuálna úspešnosť každej automatizácie appky" : "appka zatiaľ nemá automatizácie",
      x: { labels: okRows.map(function (r) { return r.id; }) }, xTitle: "Automatizácia", yLeft: { unit: "%", min: 60, max: 100, dec: 0 },
      thresholds: [{ value: 95, label: "cieľ 95 %", color: "var(--gold)" }],
      series: [{ key: "ok", label: "úspešnosť", unit: "%", dec: 0, color: appColor(app), data: okRows.map(function (r) { return { y: r.ok }; }) }],
      state: okRows.length ? null : "empty",
      onPoint: function (i) { var r = okRows[i]; if (r) w.Aura.autos.runDetail(r); }
    });
    bindToggle($("#apd-ok-tbl"), $("#apd-ok-t"), function () { return mkTable(["Automatizácia", "Úspešnosť %"], okRows.map(function (r) { return [r.name, F(r.ok, 0)]; })); });

    var eurD = vol.map(function (v, i) { return { y: +(c.eur / 30 * (0.6 + v / Math.max(1, Math.max.apply(null, vol)) * 0.8)).toFixed(3) }; });
    C().render("#apd-ch-cost", {
      type: "area", title: "Náklady appky v čase", height: 200, caption: "posledných 14 dní · odvodené z objemu a sadzby " + F(apps().MACHINE.rkwh, 2) + " €/kWh",
      x: { labels: days }, xTitle: "Deň", yLeft: { unit: "€", dec: 2 },
      series: [{ key: "e", label: "náklad", unit: "€", dec: 3, color: "var(--gold)", data: eurD }]
    });
    bindToggle($("#apd-cost-tbl"), $("#apd-cost-t"), function () { return mkTable(["Deň", "Náklad €"], days.map(function (d, i) { return [d, F(eurD[i].y, 3)]; })); });

    /* ---- behy ---- */
    if (!empty) {
      var rrows = runs.slice();
      function renderRuns(list) {
        var tb = $("#apd-tbl tbody"), cards = $("#apd-cards");
        if (!tb) return;
        $("#apd-rcnt").textContent = F(list.length, 0) + " záznamov";
        tb.innerHTML = list.map(function (r, i) {
          return '<tr tabindex="0" data-i="' + i + '"><td class="k">' + esc(r.t) + "</td><td>" + esc(r.name) + "</td><td>" + esc(r.dep) + "</td><td>" + (w.Aura.autos.mcpRow(r.mcp || []) || "—") + '</td><td class="num">' + F(r.tok, 0) + '</td><td class="num">' + F(r.min, 0) + ' min</td><td><span class="badge ' + (r.res === "chyba" ? "bad" : r.res === "čaká" ? "warn" : "ok") + '">' + esc(r.res) + "</span></td></tr>";
        }).join("");
        cards.innerHTML = list.map(function (r, i) {
          return '<div class="rowcard" tabindex="0" data-i="' + i + '"><div class="rh"><b>' + esc(r.name) + '</b><span class="badge ' + (r.res === "chyba" ? "bad" : r.res === "čaká" ? "warn" : "ok") + '">' + esc(r.res) + "</span></div><dl><dt>Kedy</dt><dd>" + esc(r.t) + "</dd><dt>Oddelenie</dt><dd>" + esc(r.dep) + "</dd><dt>Tokeny</dt><dd>" + F(r.tok, 0) + "</dd><dt>Trvanie</dt><dd>" + F(r.min, 0) + " min</dd></dl></div>";
        }).join("");
        function bind(el) {
          function open() {
            var r = list[+el.getAttribute("data-i")];
            var auto = r && w.Aura.autos.byId(r.id);
            if (auto && w.Aura.autos.runDetail) w.Aura.autos.runDetail(auto);
          }
          el.addEventListener("click", open);
          el.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
        }
        $$("#apd-tbl tbody tr[data-i]").forEach(bind);
        $$("#apd-cards .rowcard[data-i]").forEach(bind);
      }
      renderRuns(rrows);
      A().sortable($("#apd-tbl"), function () { return rrows; }, renderRuns);
      $("#apd-allruns").addEventListener("click", function () { A().go("automatizacie", "app:" + app.slug); });
      $("#apd-csv").addEventListener("click", function () { runsCSV(app); });
    } else {
      var na = $("#apd-newauto");
      if (na) na.addEventListener("click", function () { A().go("automatizacie"); setTimeout(function () { var b = $("#au-new"); if (b) b.click(); }, 260); });
    }

    /* ---- e-shop dávky ---- */
    if (isEshop) {
      esRenderRows(esVisible()); esFchip();
      A().sortable($("#es-tbl"), esVisible, esRenderRows);
      $("#es-csv").addEventListener("click", function () {
        var Ax = A(), r2 = esVisible();
        Ax.download("auraai-eshop-davky.csv", Ax.toCSV(["Dávka", "Spustená", "Typ úlohy", "Položiek", "Trvanie (min)", "tok/s", "Stav"], r2.map(function (r) { return [r.id, r.when, r.kind, r.items, r.min, String(r.tps).replace(".", ","), r.state]; })), "text/csv;charset=utf-8");
        Ax.toast("Exportovaných " + r2.length + " dávok do CSV", "ok");
      });
    }

    /* ---- pamäť ---- */
    miniNet(app, $("#apd-net"));
    var top = nodes.slice().sort(function (a, b) { return b.acts - a.acts; }).slice(0, 6);
    $("#apd-nodes").innerHTML = top.length ? top.map(function (n, i) {
      return '<button class="fi" data-n="' + i + '"><span class="fd' + (n.str < 0.4 ? " w" : " ok") + '"></span><span class="fx"><b style="font-size:var(--fs-sm)">' + mem().typeIcon(n.type) + " " + esc(n.name) + "</b><span>" + esc(mem().zoneLabel(n.area)) + " · " + esc(n.dep.name) + " · sila " + F(n.str, 2) + " · " + F(n.acts, 0) + " aktivácií</span></span></button>";
    }).join("") : '<div class="empty"><span class="eico">∅</span><p>Žiadne viazané uzly.</p></div>';
    $$("#apd-nodes .fi").forEach(function (b) { b.addEventListener("click", function () { mem().inspect(top[+b.getAttribute("data-n")]); }); });
    $("#apd-tomem").addEventListener("click", function () { A().go("pamat", "app:" + app.slug); });
    $("#apd-tonak").addEventListener("click", function () { A().go("naklady"); });
    var cl = $("#apd-clean"); if (cl) cl.addEventListener("click", function () { A().go("pamat", "cistenie"); });
  }

  /* ============================================================
     prepínanie zoznam ↔ detail
     ============================================================ */
  var CUR = null;
  function showList() {
    CUR = null;
    $("#ap-list").removeAttribute("hidden");
    $("#ap-detail").setAttribute("hidden", "");
    $("#crumb").textContent = "Appky";
    $("#title").textContent = "Appky";
    renderKpi(); renderCards(); renderListCharts();
  }
  function showApp(app) {
    CUR = app;
    $("#ap-list").setAttribute("hidden", "");
    $("#ap-detail").removeAttribute("hidden");
    $("#crumb").textContent = "Appky › " + app.name;
    $("#title").textContent = app.name;
    document.title = "AuraAI · " + app.name;
    renderDetail(app);
    if (w.AuraChart) setTimeout(w.AuraChart.reflowAll, 30);
  }

  function registerAppCmds(app) {
    A().registerCmd([
      { label: "Appka — " + app.name, hint: "Appky", run: function () { A().go("appky", app.slug); } },
      { label: "Behy appky — " + app.name, hint: "Appky", run: function () { A().go("automatizacie", "app:" + app.slug); } },
      { label: "Pozastaviť appku — " + app.name, hint: "Appky", run: function () { A().go("appky", app.slug); setTimeout(function () { var b = $("#ap-pause"); if (b && !app.paused) b.click(); }, 300); } }
    ]);
  }

  w.Aura.screens.appky = {
    title: "Appky", group: "Appky",
    init: function () {
      var Ax = A();
      $("#ap-new").addEventListener("click", appForm);
      Ax.apps.onChange(function () { if (!CUR) { renderKpi(); renderCards(); renderListCharts(); } });
      mem().onChange(function () { if (CUR) renderDetail(CUR); });

      /* backlinky: uzol vie, ktorá appka ho používa */
      Ax.apps.all().forEach(function (app) {
        Ax.apps.nodes(app).forEach(function (n) {
          mem().link(n.id, { kind: "automatizácia", label: "Appka — " + app.name, go: function () { Ax.go("appky", app.slug); } });
        });
      });

      Ax.registerCmd([{ label: "Nová appka", hint: "Appky", run: function () { Ax.go("appky"); setTimeout(appForm, 260); } }]);
      Ax.apps.all().forEach(registerAppCmds);
    },
    onShow: function (sub) {
      var app = sub ? apps().bySlug(sub) : null;
      if (sub && !app) { A().toast("Appka „" + sub + "“ neexistuje", "warn"); }
      if (app) showApp(app); else showList();
    }
  };

  /* tlačidlo „+ Nová appka" pridáme do sekcie zoznamu po zostavení DOM */
  w.Aura.appsNewForm = appForm;
})(window);
