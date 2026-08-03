/* ============================================================
   PAMÄŤ — jediná obrazovka nad kanonickým Aura.mem
   Zlúčenie: Sieť (force) · Radiál · Zoznam + Dnes (triage) + Hľadanie
   Žiadne vlastné uzly — všetko cez Aura.mem / shell / AuraChart.
   ============================================================ */
(function (w) {
  "use strict";
  var A = w.Aura, C = w.AuraChart;
  var $ = A.$, $$ = A.$$, esc = A.esc;
  function F(v, d) { return C.fmtNum(v, d); }
  var NB = " ";
  function mem() { return A.mem; }

  function h32(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function S(tag, at, p) {
    var n = document.createElementNS("http://www.w3.org/2000/svg", tag);
    if (at) for (var k in at) if (at[k] != null) n.setAttribute(k, at[k]);
    if (p) p.appendChild(n);
    return n;
  }
  function typeColor(t) { return t === "skill" ? "var(--teal)" : t === "project" ? "var(--violet)" : "var(--gold)"; }

  /* ------------------------------------------------------------
     Zdieľaný stav obrazovky
     ------------------------------------------------------------ */
  var PM = {
    tab: "graf", view: "siet", layer: "area",
    filter: { area: "", type: "", strMin: 0, per: 0 },
    weakOnly: false,
    q: "", preset: null, saved: [],
    sel: {},                 /* id -> true, výber v zozname */
    clStep: "weak", clSel: {}, triageOff: false, appFilter: "",
    rad: { level: 0, area: null, dep: null },
    net: null, inited: false, filtOpen: false
  };

  /* filter panel — na mobile (≤900) rozbaliteľný sheet, na desktope trvalý stĺpec */
  function syncFilterCollapse() {
    var tgl = $("#pm-filt-toggle"), body = $("#pm-filter-body"), hh = $("#pm-filt-h");
    if (!tgl || !body) return;
    var mob = w.matchMedia("(max-width:900px)").matches;
    if (mob) {
      tgl.hidden = false;
      if (hh) hh.style.display = "none";
      body.hidden = !PM.filtOpen;
      tgl.setAttribute("aria-expanded", String(PM.filtOpen));
      var c = $("#pm-filt-caret"); if (c) c.textContent = PM.filtOpen ? "▾" : "▸";
    } else {
      tgl.hidden = true;
      if (hh) hh.style.display = "";
      body.hidden = false;
    }
  }

  /* filter → čitateľný filter uzla */
  function passFilter(n) {
    var f = PM.filter;
    if (f.area && n.area.k !== f.area) return false;
    if (f.type && n.type !== f.type) return false;
    if (n.str < f.strMin) return false;
    if (f.per && n.age > f.per) return false;
    if (PM.weakOnly && n.str >= 0.4) return false;
    if (PM.appFilter) {
      var app = A.apps.bySlug(PM.appFilter);
      if (app) { var ids = {}; A.apps.nodes(app).forEach(function (x) { ids[x.id] = 1; }); if (!ids[n.id]) return false; }
    }
    return true;
  }
  function filteredNodes() { return mem().nodes().filter(passFilter); }

  function shareFilter() {
    A.setShared("mem.filter", { area: PM.filter.area, type: PM.filter.type, strMin: PM.filter.strMin, per: PM.filter.per, weakOnly: PM.weakOnly });
  }

  /* ============================================================
     KPI + Naposledy / dnes
     ============================================================ */
  function kpiRefresh() {
    var ns = mem().nodes();
    A.count($("#pm-k1v"), ns.length + mem().CORE_NODES, 0);
    $("#pm-k1d").textContent = F(ns.length, 0) + " v oblastiach · " + F(mem().CORE_NODES, 0) + " jadrá";
    A.count($("#pm-k2v"), mem().AREAS.length, 0);
    A.count($("#pm-k3v"), mem().weak().length, 0);
    A.count($("#pm-k4v"), mem().today().length, 0);
  }

  function recentRefresh() {
    var host = $("#pm-recent");
    if (!host) return;
    var seen = {}, list = [];
    mem().today().forEach(function (n) { if (!seen[n.id]) { seen[n.id] = 1; list.push(n); } });
    mem().nodes().slice().sort(function (a, b) {
      var ea = (a.edits || []).length, eb = (b.edits || []).length;
      if (eb !== ea) return eb - ea;
      return b.acts - a.acts;
    }).forEach(function (n) { if (list.length < 6 && !seen[n.id]) { seen[n.id] = 1; list.push(n); } });

    host.innerHTML = list.slice(0, 6).map(function (n) {
      var last = (n.edits && n.edits.length) ? n.edits[n.edits.length - 1].what : (n.today ? "dnes aktívny" : F(n.acts, 0) + "× za 30 dní");
      var cls = n.type === "skill" ? "" : n.type === "project" ? " v" : " g";
      return '<button class="fi" data-id="' + esc(n.id) + '">' +
        '<span class="fd' + cls + '"></span>' +
        '<span class="fx"><b>' + esc(n.name) + "</b><span>" + esc(mem().zoneLabel(n.area)) + " · " + esc(n.dep.name) + "</span></span>" +
        '<span class="ft">' + esc(last) + "</span></button>";
    }).join("") || '<div class="empty"><span class="eico">∅</span><p>Zatiaľ žiadna aktivita.</p></div>';
  }

  /* ============================================================
     LEGENDA (interaktívna, 5 oblastí)
     ============================================================ */
  function legendRefresh() {
    var host = $("#pm-legend");
    if (!host) return;
    var live = mem().nodes();
    host.innerHTML = mem().AREAS.map(function (a) {
      var cnt = live.filter(function (n) { return n.area.k === a.k; }).length;
      var on = PM.filter.area === a.k;
      return '<button class="fi" data-area="' + a.k + '" aria-pressed="' + on + '">' +
        '<span class="fd" style="background:' + a.color + (on ? "" : ";opacity:.6") + '"></span>' +
        '<span class="fx"><b>' + esc(mem().zoneLabel(a)) + "</b><span>" + F(cnt, 0) + " uzlov · " + a.deps.length + " oddelení</span></span>" +
        '<span class="ft">' + F((a.n / mem().TOTAL_AREA) * 100, 1) + " %</span></button>";
    }).join("");
  }

  /* ============================================================
     SIEŤ — seedovaný force layout (stabilné pozície)
     ============================================================ */
  function netBuild() {
    var W = 760, H = 520, cx = W / 2, cy = H / 2, R = 172;
    var areas = mem().AREAS, lobe = {};
    areas.forEach(function (a, i) {
      var ang = -Math.PI / 2 + i * 2 * Math.PI / areas.length;
      lobe[a.k] = { x: cx + Math.cos(ang) * R, y: cy + Math.sin(ang) * R, ang: ang, area: a };
    });
    var nodes = mem().nodes(), pos = {};
    nodes.forEach(function (n) {
      var L = lobe[n.area.k]; if (!L) return;
      var r = A.rng(h32(n.id));
      var depSpread = ((n.dep.i || 0) - (n.area.deps.length - 1) / 2) * 0.34;
      var a0 = L.ang + depSpread + (r() - 0.5) * 0.55;
      var rad = 34 + r() * 74;
      pos[n.id] = {
        x: clamp(L.x + Math.cos(a0) * rad, 26, W - 26),
        y: clamp(L.y + Math.sin(a0) * rad * 0.9, 26, H - 26)
      };
    });
    var byId = {}; nodes.forEach(function (n) { byId[n.id] = n; });
    var edges = mem().edges().filter(function (e) { return byId[e.a] && byId[e.b]; });
    PM.net = { W: W, H: H, lobe: lobe, pos: pos, nodes: nodes, edges: edges, byId: byId, areas: areas, el: {}, edgeEls: [] };
  }

  function nodeShape(n, x, y, size, fill, host) {
    var el;
    if (n.type === "skill") {
      el = S("path", { d: "M" + x + " " + (y - size) + "L" + (x + size) + " " + (y + size * 0.8) + "L" + (x - size) + " " + (y + size * 0.8) + "Z", fill: fill }, host);
    } else if (n.type === "project") {
      el = S("path", { d: "M" + x + " " + (y - size) + "L" + (x + size) + " " + y + "L" + x + " " + (y + size) + "L" + (x - size) + " " + y + "Z", fill: fill }, host);
    } else {
      el = S("circle", { cx: x, cy: y, r: size, fill: fill }, host);
    }
    return el;
  }

  function netLayerFill(n) {
    if (PM.layer === "type") return typeColor(n.type);
    return n.area.color;
  }
  function netLayerActive(n) {
    /* či je uzol v aktuálnej vrstve zvýraznený (nie stlmený vrstvou) */
    if (PM.layer === "str") return n.str >= 0.4;
    if (PM.layer === "today") return !!n.today;
    return true;
  }

  function netDraw() {
    var host = $("#pm-net"); if (!host) return;
    if (!PM.net) netBuild();
    host.innerHTML = "";
    host.classList.remove("cx-dim");
    var net = PM.net;
    S("title", {}, host).textContent = "Sieť " + net.nodes.length + " uzlov v 5 lalokoch";

    /* laloky */
    var defs = S("defs", {}, host);
    net.areas.forEach(function (a, i) {
      var g = S("radialGradient", { id: "pmg" + i }, defs);
      S("stop", { offset: "0", "stop-color": a.color, "stop-opacity": ".4" }, g);
      S("stop", { offset: "1", "stop-color": a.color, "stop-opacity": "0" }, g);
    });
    var gLobe = S("g", { class: "cx-lobe" }, host);
    net.areas.forEach(function (a, i) {
      var L = net.lobe[a.k];
      S("ellipse", { cx: L.x, cy: L.y, rx: 118, ry: 96, fill: "url(#pmg" + i + ")" }, gLobe);
    });

    /* synapsie */
    var synEmph = PM.layer === "syn";
    var gSyn = S("g", {}, host);
    net.edgeEls = [];
    net.edges.forEach(function (e) {
      var pa = net.pos[e.a], pb = net.pos[e.b]; if (!pa || !pb) return;
      var na = net.byId[e.a];
      var vis = passFilter(net.byId[e.a]) && passFilter(net.byId[e.b]);
      var mx = (pa.x + pb.x) / 2, my = (pa.y + pb.y) / 2 - (e.w < 0.5 ? 26 : 8);
      var p = S("path", {
        d: "M" + pa.x.toFixed(1) + " " + pa.y.toFixed(1) + " Q" + mx.toFixed(1) + " " + my.toFixed(1) + " " + pb.x.toFixed(1) + " " + pb.y.toFixed(1),
        fill: "none", stroke: na.area.color, "stroke-width": e.w < 0.5 ? 0.8 : 1.3,
        opacity: !vis ? 0.05 : synEmph ? 0.55 : 0.22, class: "cx-syn" + (e.w < 0.5 ? " flow" : "")
      }, gSyn);
      net.edgeEls.push({ a: e.a, b: e.b, el: p });
    });

    /* neuróny */
    var gNode = S("g", {}, host);
    net.el = {};
    net.nodes.forEach(function (n) {
      var p = net.pos[n.id]; if (!p) return;
      var vis = passFilter(n), layerOn = netLayerActive(n);
      var size = 3.6 + n.str * 7 * (PM.layer === "str" ? 1.25 : 1);
      var fill = netLayerFill(n);
      var el = nodeShape(n, p.x, p.y, size, fill, gNode);
      el.setAttribute("class", "cx-node");
      el.setAttribute("tabindex", "0");
      el.setAttribute("role", "button");
      el.setAttribute("stroke", "var(--paper)");
      el.setAttribute("stroke-width", n.pinned ? 1.6 : 0.6);
      el.setAttribute("opacity", (!vis ? 0.12 : layerOn ? 0.96 : 0.28));
      el.setAttribute("aria-label", n.name + " — " + n.area.name + ", sila " + F(n.str, 2) + ", " + n.type);
      net.el[n.id] = el;
      el.addEventListener("mouseenter", function () { netHi(n.id); });
      el.addEventListener("mouseleave", function () { netHi(null); });
      el.addEventListener("focus", function () { netHi(n.id); });
      el.addEventListener("blur", function () { netHi(null); });
      el.addEventListener("click", function () { mem().inspect(n); });
      el.addEventListener("keydown", function (e2) { if (e2.key === "Enter" || e2.key === " ") { e2.preventDefault(); mem().inspect(n); } });
    });

    /* menovky lalokov */
    var gLbl = S("g", {}, host);
    net.areas.forEach(function (a) {
      var L = net.lobe[a.k];
      var ly = clamp(L.y - 104, 16, net.H - 14);
      var t = S("text", { x: clamp(L.x, 60, net.W - 60), y: ly, "text-anchor": "middle", class: "cx-nlbl" }, gLbl);
      t.textContent = a.name;
    });

    var shown = net.nodes.filter(passFilter).length;
    $("#pm-net-cnt").textContent = F(shown, 0) + " / " + F(net.nodes.length, 0) + " uzlov · " + F(net.edges.length, 0) + " synapsií";
  }

  function netHi(id) {
    var net = PM.net, host = $("#pm-net"); if (!net || !host) return;
    if (!id) {
      host.classList.remove("cx-dim");
      Object.keys(net.el).forEach(function (k) { net.el[k].classList.remove("hot"); });
      net.edgeEls.forEach(function (e) { e.el.classList.remove("hot"); });
      return;
    }
    host.classList.add("cx-dim");
    var near = {}; near[id] = 1;
    net.edgeEls.forEach(function (e) {
      var on = e.a === id || e.b === id;
      e.el.classList.toggle("hot", on);
      if (on) { near[e.a] = 1; near[e.b] = 1; }
    });
    Object.keys(net.el).forEach(function (k) { net.el[k].classList.toggle("hot", !!near[k]); });
  }

  /* Mobilný zoznam = plnohodnotná náhrada grafu: oblasť → oddelenie → uzol.
     Zóna (zoneLabel) na úrovni oblasti, typ (ikona) + sila na úrovni uzla. */
  function netMobileList() {
    var host = $("#pm-net-list"); if (!host) return;
    var all = mem().nodes();
    host.innerHTML = mem().AREAS.map(function (a) {
      var live = all.filter(function (n) { return n.area.k === a.k && passFilter(n); });
      var byDep = {};
      live.forEach(function (n) { (byDep[n.dep.slug] = byDep[n.dep.slug] || { dep: n.dep, list: [] }).list.push(n); });
      var deps = a.deps.map(function (d) { return byDep[d.slug]; }).filter(Boolean);
      var open = PM.filter.area === a.k;
      var inner = deps.length ? deps.map(function (g) {
        var items = g.list.map(function (n) {
          return '<div class="nd"><span class="sw" style="background:' + a.color + '"></span>' +
            '<button class="lk" data-id="' + esc(n.id) + '" style="border:0;background:none;padding:0;flex:1;text-align:left;display:flex;align-items:center;gap:6px;color:var(--ink)">' +
            '<span style="color:' + typeColor(n.type) + ';display:inline-flex" aria-hidden="true">' + mem().typeIcon(n.type) + '</span>' + esc(n.name) +
            (n.pinned ? ' <span class="badge mute" style="font-size:var(--fs-label)">chránený</span>' : '') + '</button>' +
            '<span class="num" style="color:var(--ink-3);font-size:var(--fs-label);white-space:nowrap" title="sila uzla">sila ' + F(n.str, 2) + '</span></div>';
        }).join("");
        return '<details><summary>' + esc(g.dep.name) +
          ' <span class="num" style="color:var(--ink-3);font-weight:400;font-size:var(--fs-label)">· ' + esc(g.dep.type) + ' · ' + F(g.list.length, 0) + ' uzlov</span></summary>' + items + '</details>';
      }).join("") : '<p class="note">Filter v tejto oblasti nič nezobrazuje.</p>';
      return '<details' + (open ? ' open' : '') + '><summary>' + esc(mem().zoneLabel(a)) +
        ' <span class="num" style="color:var(--ink-3);font-weight:400;font-size:var(--fs-label)">· ' + F(live.length, 0) + ' uzlov · ' + deps.length + ' oddelení</span></summary>' + inner + '</details>';
    }).join("");
  }

  function pmHighlightNode(id) {
    switchTab("graf"); switchView("siet");
    setTimeout(function () {
      netDraw();
      var el = PM.net && PM.net.el[id];
      if (el) { netHi(id); el.focus(); }
      A.toast("Uzol zvýraznený v sieti", "ok");
    }, 60);
  }

  /* ============================================================
     RADIÁL — hierarchia Hades → oblasti → oddelenia → uzly
     ============================================================ */
  function radCrumb() {
    var parts = ["Hades"];
    if (PM.rad.area) parts.push(PM.rad.area.name);
    if (PM.rad.dep) parts.push(PM.rad.dep.name);
    $("#pm-rad-crumb").textContent = parts.join(" › ");
    $("#pm-rad-back").disabled = PM.rad.level === 0;
  }
  function radUp() {
    if (PM.rad.level === 2) { PM.rad.level = 1; PM.rad.dep = null; }
    else if (PM.rad.level === 1) { PM.rad.level = 0; PM.rad.area = null; }
    radCrumb(); radDraw();
  }
  function radMatch(n) { return passFilter(n); }

  function radDraw() {
    var host = $("#pm-rad"); if (!host) return;
    host.innerHTML = "";
    var W = 700, H = 470, CX = W / 2, CY = H / 2 - 4;
    var svg = S("svg", { viewBox: "0 0 " + W + " " + H, width: "100%", height: H, role: "img", class: "ach-svg" }, host);
    S("title", {}, svg).textContent = "Radiálna hierarchia pamäti — " + $("#pm-rad-crumb").textContent;

    var items, centerLabel, centerSub, R;
    if (PM.rad.level === 0) {
      items = mem().AREAS.map(function (a) {
        var live = mem().nodes().filter(function (n) { return n.area.k === a.k; });
        return { kind: "area", ref: a, label: a.name, count: live.length, color: a.color, leaves: a.deps, on: !PM.filter.area || PM.filter.area === a.k };
      });
      centerLabel = "HADES"; centerSub = F(mem().nodes().length, 0) + " uzlov"; R = 166;
    } else if (PM.rad.level === 1) {
      items = PM.rad.area.deps.map(function (d) {
        var live = mem().nodes().filter(function (n) { return n.dep.slug === d.slug; });
        return { kind: "dep", ref: d, label: d.name, count: live.length, color: PM.rad.area.color, on: (!PM.filter.type || d.type === PM.filter.type) };
      });
      centerLabel = PM.rad.area.name; centerSub = F(PM.rad.area.n, 0) + " uzlov"; R = 172;
    } else {
      var live2 = mem().nodes().filter(function (n) { return n.dep.slug === PM.rad.dep.slug; });
      items = live2.map(function (n) { return { kind: "node", ref: n, label: n.name, count: n.acts, color: PM.rad.area.color, on: radMatch(n) }; });
      centerLabel = PM.rad.dep.name; centerSub = F(PM.rad.dep.n, 0) + " uzlov"; R = 160;
    }
    var maxC = Math.max.apply(null, items.map(function (i) { return i.count; }).concat([1]));

    items.forEach(function (it, i) {
      var a0 = -Math.PI / 2 + (i * 2 * Math.PI) / Math.max(1, items.length);
      var x = CX + R * Math.cos(a0), y = CY + R * Math.sin(a0);
      var rad = 11 + 25 * Math.sqrt(Math.max(0, it.count) / maxC);
      var op = it.count === 0 ? 0.16 : it.on ? 1 : 0.22;
      S("line", { x1: CX, y1: CY, x2: x, y2: y, stroke: it.color, "stroke-width": 1.3, opacity: op * 0.45 }, svg);

      var g = S("g", { class: "ach-seg", tabindex: 0, role: "button", "aria-label": it.label + ", " + F(it.count, 0) + (it.kind === "node" ? " aktivácií" : " uzlov") }, svg);
      S("circle", { cx: x, cy: y, r: rad, fill: it.color, opacity: op * 0.22 }, g);
      S("circle", { cx: x, cy: y, r: rad, fill: "none", stroke: it.color, "stroke-width": 1.8, opacity: op }, g);
      var vt = S("text", { x: x, y: y + 4, "text-anchor": "middle", opacity: op }, g);
      vt.setAttribute("style", "font-size:var(--fs-label);fill:var(--ink)"); vt.textContent = F(it.count, 0);

      var out = rad + 9;
      var lx = x + out * Math.cos(a0), ly = y + out * Math.sin(a0);
      var anchor = Math.cos(a0) > 0.25 ? "start" : Math.cos(a0) < -0.25 ? "end" : "middle";
      var tx = S("text", { x: lx, y: ly + (Math.sin(a0) > 0.4 ? 12 : Math.sin(a0) < -0.4 ? -6 : 4), "text-anchor": anchor, opacity: op }, svg);
      tx.setAttribute("style", "font-size:var(--fs-label);font-weight:600;fill:var(--ink)");
      tx.textContent = it.label.length > 22 ? it.label.slice(0, 21) + "…" : it.label;

      (function (item) {
        function act() {
          if (item.kind === "area") { PM.rad.level = 1; PM.rad.area = item.ref; PM.rad.dep = null; radCrumb(); radDraw(); }
          else if (item.kind === "dep") { PM.rad.level = 2; PM.rad.area = item.ref.area; PM.rad.dep = item.ref; radCrumb(); radDraw(); }
          else { mem().inspect(item.ref); }
        }
        g.addEventListener("click", act);
        g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); act(); } });
      })(it);
    });

    var core = S("g", { class: "ach-seg", tabindex: 0, role: "button", "aria-label": "Jadro " + centerLabel }, svg);
    S("circle", { cx: CX, cy: CY, r: 44, fill: "var(--gold)", opacity: 0.14 }, core);
    S("circle", { cx: CX, cy: CY, r: 44, fill: "none", stroke: "var(--gold)", "stroke-width": 2 }, core);
    var ct = S("text", { x: CX, y: CY - 2, "text-anchor": "middle" }, core);
    ct.setAttribute("style", "font-family:var(--body);font-size:var(--fs-md);font-weight:600;fill:var(--gold)");
    ct.textContent = centerLabel.length > 15 ? centerLabel.slice(0, 14) + "…" : centerLabel;
    var cs = S("text", { x: CX, y: CY + 13, "text-anchor": "middle", class: "ach-tick" }, core);
    cs.textContent = centerSub;
    core.addEventListener("click", function () { if (PM.rad.level > 0) radUp(); });
  }

  /* ============================================================
     ZOZNAM — triediteľná tabuľka + multi-výber + bulk
     ============================================================ */
  function zoznamRows() {
    return filteredNodes().map(function (n) {
      return { name: n.name, type: n.type, zone: mem().zoneLabel(n.area), str: n.str, conf: n.conf, acts: n.acts, ref: n, id: n.id };
    });
  }
  function bulkBar() {
    var ids = Object.keys(PM.sel).filter(function (k) { return PM.sel[k]; });
    var bar = $("#pm-bulk");
    if (!ids.length) { bar.hidden = true; return; }
    bar.hidden = false;
    $("#pm-bulk-n").textContent = F(ids.length, 0) + " vybraných";
  }
  function selectedNodes() {
    return Object.keys(PM.sel).filter(function (k) { return PM.sel[k]; }).map(function (id) { return mem().byId(id); }).filter(Boolean);
  }
  function zoznamRender(rows) {
    var tb = $("#pm-tbl tbody");
    if (!tb) return;
    if (!rows.length) {
      tb.innerHTML = "";
      $("#pm-cards").innerHTML = "";
      $("#pm-tbl-empty").innerHTML = '<div class="empty"><span class="eico">∅</span><p>Žiadny uzol nevyhovuje filtrom. Uvoľni ich vpravo.</p></div>';
      bulkBar(); return;
    }
    $("#pm-tbl-empty").innerHTML = "";
    tb.innerHTML = rows.map(function (r) {
      return '<tr data-id="' + esc(r.id) + '" tabindex="0">' +
        '<td><input type="checkbox" class="pm-cb" data-cb="' + esc(r.id) + '" aria-label="Vybrať ' + esc(r.name) + '"' + (PM.sel[r.id] ? " checked" : "") + "></td>" +
        '<td class="k">' + esc(r.name) + "</td>" +
        "<td>" + mem().typeBadge(r.type) + "</td>" +
        "<td>" + esc(r.zone) + "</td>" +
        '<td class="num">' + F(r.str, 2) + "</td>" +
        '<td class="num">' + F(r.conf, 2) + "</td>" +
        '<td class="num">' + F(r.acts, 0) + "</td></tr>";
    }).join("");
    $$("#pm-tbl tbody tr").forEach(function (tr) {
      tr.addEventListener("click", function (e) {
        if (e.target.closest("input")) return;
        mem().inspect(tr.getAttribute("data-id"));
      });
      tr.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); mem().inspect(tr.getAttribute("data-id")); } });
    });
    $$("#pm-tbl .pm-cb").forEach(function (cb) {
      cb.addEventListener("change", function () { PM.sel[cb.getAttribute("data-cb")] = cb.checked; bulkBar(); syncAllCb(rows); });
    });
    $("#pm-cards").innerHTML = rows.map(function (r) {
      return '<div class="rowcard" data-row="' + esc(r.id) + '"><div class="rh">' +
        '<input type="checkbox" class="pm-ccb" data-cb="' + esc(r.id) + '" aria-label="Vybrať ' + esc(r.name) + '"' + (PM.sel[r.id] ? " checked" : "") + ' style="flex:0 0 auto;margin-right:2px;width:17px;height:17px">' +
        '<b>' + esc(r.name) + '</b><span class="sp" style="flex:1"></span>' + mem().typeBadge(r.type) + "</div>" +
        "<dl><dt>Oblasť</dt><dd>" + esc(r.zone) + "</dd><dt>Sila</dt><dd>" + F(r.str, 2) + "</dd><dt>Istota</dt><dd>" + F(r.conf, 2) + "</dd><dt>Aktivácie</dt><dd>" + F(r.acts, 0) + "</dd></dl></div>";
    }).join("");
    A.bindRows($("#pm-cards"), function (id) { return mem().byId(id); }, function (n) { mem().inspect(n); });
    $$("#pm-cards .pm-ccb").forEach(function (cb) {
      cb.addEventListener("click", function (e) { e.stopPropagation(); });
      cb.addEventListener("change", function () { PM.sel[cb.getAttribute("data-cb")] = cb.checked; bulkBar(); syncAllCb(rows); });
    });
    bulkBar(); syncAllCb(rows);
  }
  function syncAllCb(rows) {
    var all = $("#pm-all"); if (!all) return;
    var on = rows.length && rows.every(function (r) { return PM.sel[r.id]; });
    all.checked = !!on;
  }

  function bulkMove() {
    var sel = selectedNodes(); if (!sel.length) return;
    var areas = mem().AREAS;
    var areaK = sel[0].area.k;
    function depOpts(k) { return mem().areaByKey(k).deps.map(function (d) { return '<option value="' + d.slug + '">' + esc(d.name) + "</option>"; }).join(""); }
    var html = '<div class="field"><label for="pm-mv-a">Oblasť</label><select id="pm-mv-a">' +
      areas.map(function (a) { return '<option value="' + a.k + '"' + (a.k === areaK ? " selected" : "") + ">" + esc(a.name) + "</option>"; }).join("") + "</select></div>" +
      '<div class="field"><label for="pm-mv-d">Oddelenie</label><select id="pm-mv-d">' + depOpts(areaK) + "</select></div>" +
      '<p class="note">Presunie ' + F(sel.length, 0) + " uzlov. Zmena sa uloží až po potvrdení.</p>";
    A.detail("Presunúť " + F(sel.length, 0) + " uzlov", html, [
      { label: "Presunúť", kind: "", fn: function () {
        var a = mem().areaByKey($("#pm-mv-a").value);
        var d = a.deps.filter(function (x) { return x.slug === $("#pm-mv-d").value; })[0] || a.deps[0];
        sel.forEach(function (n) { mem().update(n, { area: a, dep: d, type: d.type }); });
        A.closeDetail(); PM.sel = {}; A.toast(F(sel.length, 0) + " uzlov presunutých do " + a.name, "ok");
      } }
    ]);
    $("#pm-mv-a").addEventListener("change", function () { $("#pm-mv-d").innerHTML = depOpts(this.value); });
  }
  function bulkTag() {
    var sel = selectedNodes(); if (!sel.length) return;
    A.detail("Pridať tag " + F(sel.length, 0) + " uzlom",
      '<div class="field"><label for="pm-tg">Tag</label><input id="pm-tg" placeholder="napr. revízia"></div><p class="note">Tag sa pridá všetkým vybraným uzlom.</p>',
      [{ label: "Pridať tag", kind: "", fn: function () {
        var t = ($("#pm-tg").value || "").trim(); if (!t) { A.toast("Zadaj tag", "warn"); return; }
        sel.forEach(function (n) { mem().update(n, { tags: (n.tags || []).concat([t]) }); });
        A.closeDetail(); PM.sel = {}; A.toast("Tag „" + t + "“ pridaný " + F(sel.length, 0) + " uzlom", "ok");
      } }]);
  }
  function runBulk(kind) {
    var sel = selectedNodes(); if (!sel.length) return;
    if (kind === "clear") { PM.sel = {}; zoznamRender(A.applySort($("#pm-tbl"), zoznamRows())); return; }
    if (kind === "archive") {
      A.confirm("Archivovať " + F(sel.length, 0) + " uzlov?", "Presunú sa do archívu a zmiznú z grafu. Dajú sa obnoviť.", function () {
        sel.forEach(function (n) { mem().archive(n); }); PM.sel = {}; A.toast(F(sel.length, 0) + " uzlov v archíve", "ok");
      }, "Archivovať", true); return;
    }
    if (kind === "pin") { sel.forEach(function (n) { if (!n.pinned) mem().togglePin(n); }); PM.sel = {}; A.toast(F(sel.length, 0) + " uzlov chránených (pripnuté)", "ok"); return; }
    if (kind === "move") { bulkMove(); return; }
    if (kind === "tag") { bulkTag(); return; }
    if (kind === "merge") {
      if (sel.length < 2) { A.toast("Na zlúčenie vyber aspoň 2 uzly", "warn"); return; }
      var keep = sel[0], drop = sel.slice(1);
      A.confirm("Zlúčiť " + F(sel.length, 0) + " uzlov?", "„" + drop.map(function (n) { return n.name; }).join("“, „") + "“ sa zlúčia do „" + keep.name + "“ a zaniknú.", function () {
        drop.forEach(function (n) { mem().merge(keep, n); }); PM.sel = {}; A.toast("Zlúčené do „" + keep.name + "“", "ok");
      }, "Zlúčiť", true); return;
    }
  }

  /* ============================================================
     DNES — triage feed
     ============================================================ */
  function dnesRender() {
    var host = $("#pm-dnes-feed"); if (!host) return;
    var list = mem().today();
    $("#pm-dnes-cnt").textContent = F(list.length, 0) + " uzlov";
    if (!list.length) { host.innerHTML = '<div class="empty"><span class="eico">∅</span><p>Dnes sa žiadny uzol neaktivoval.</p></div>'; return; }
    host.innerHTML = list.map(function (n) {
      var cls = n.type === "skill" ? "" : n.type === "project" ? " v" : " g";
      return '<div class="fi" style="grid-template-columns:12px 1fr auto" data-id="' + esc(n.id) + '">' +
        '<span class="fd' + cls + '"></span>' +
        '<span class="fx"><b>' + esc(n.name) + "</b><span>" + esc(mem().zoneLabel(n.area)) + " · " + esc(n.dep.name) + " · sila " + F(n.str, 2) + "</span></span>" +
        '<span class="ft" style="display:flex;gap:6px;align-items:center">' +
        '<button class="btn ghost" data-act="ok" style="padding:3px 8px">Potvrdiť</button>' +
        '<button class="btn ghost" data-act="edit" style="padding:3px 8px">Upraviť</button>' +
        '<button class="btn ghost" data-act="merge" style="padding:3px 8px">Zlúčiť</button>' +
        '<button class="btn ghost" data-act="del" style="padding:3px 8px">Zmazať</button>' +
        "</span></div>";
    }).join("");
    $$("#pm-dnes-feed .fi").forEach(function (row) {
      var n = mem().byId(row.getAttribute("data-id"));
      row.addEventListener("click", function (e) {
        var b = e.target.closest("button[data-act]");
        if (!b) { if (n) mem().inspect(n); return; }
        var act = b.getAttribute("data-act");
        if (act === "ok") { mem().update(n, { conf: clamp(n.conf + 0.05, 0, 1) }); A.toast("Potvrdené — istota zvýšená", "ok"); }
        else if (act === "edit") { mem().inspect(n); }
        else if (act === "merge") {
          var dupes = mem().dupes(n);
          if (!dupes.length) { A.toast("Bez zjavných duplikátov", "warn"); return; }
          A.confirm("Zlúčiť duplikát?", "„" + dupes[0].name + "“ sa zlúči do „" + n.name + "“ a zanikne.", function () { mem().merge(n, dupes[0]); A.toast("Zlúčené", "ok"); }, "Zlúčiť", true);
        }
        else if (act === "del") { A.confirm("Zmazať uzol?", "„" + n.name + "“ sa archivuje. Dá sa obnoviť.", function () { mem().archive(n); A.toast("Uzol v archíve", "ok"); }, "Zmazať", true); }
      });
    });
  }

  /* ============================================================
     HĽADANIE
     ============================================================ */
  function hlPresets() {
    var host = $("#pm-hl-presets"); if (!host) return;
    var chips = [{ k: "weak", l: "Slabé uzly" }, { k: "today", l: "Dnes aktívne" }].concat(
      mem().AREAS.map(function (a) { return { k: "area:" + a.k, l: a.name }; }));
    host.innerHTML = chips.map(function (c) {
      return '<button class="chz" data-preset="' + c.k + '" aria-pressed="' + (PM.preset === c.k) + '">' + esc(c.l) + "</button>";
    }).join("");
  }
  function hlSaved() {
    var host = $("#pm-hl-saved"); if (!host) return;
    if (!PM.saved.length) { host.innerHTML = ""; return; }
    host.innerHTML = '<span class="eyet" style="width:100%">Uložené hľadania</span>' + PM.saved.map(function (s, i) {
      return '<button class="pill" data-saved="' + i + '">' + esc(s.q || "(bez dopytu)") + "</button>";
    }).join("");
  }
  function hlResults() {
    var host = $("#pm-hl-res"); if (!host) return;
    var filt = { area: PM.filter.area, type: PM.filter.type, strMin: PM.filter.strMin };
    var res;
    if (PM.preset === "weak") res = mem().weak().filter(passFilterNoWeak).map(wrap);
    else if (PM.preset === "today") res = mem().today().filter(passFilterNoWeak).map(wrap);
    else res = mem().search(PM.q, filt).filter(function (r) { return !PM.filter.per || r.node.age <= PM.filter.per; });

    if (!PM.q && !PM.preset) {
      $("#pm-hl-cnt").textContent = "zadajte dopyt";
      $("#pm-hl-branch").textContent = "";
      host.innerHTML = '<div class="empty"><span class="eico">∅</span><p>Zadaj dopyt alebo vyber preset. Hľadá sa lexikálne aj vektorovo v ' + F(mem().nodes().length, 0) + " uzloch.</p></div>";
      return;
    }
    $("#pm-hl-cnt").textContent = F(res.length, 0) + " výsledkov";
    var branches = {};
    res.forEach(function (r) { branches[r.sc.branch] = (branches[r.sc.branch] || 0) + 1; });
    $("#pm-hl-branch").textContent = Object.keys(branches).map(function (b) { return b + " " + branches[b]; }).join(" · ");
    if (!res.length) {
      host.innerHTML = '<div class="empty"><span class="eico">∅</span><p>Pre daný dopyt a filtre nič. Uvoľni filtre vpravo v paneli Graf.</p></div>';
      return;
    }
    host.innerHTML = res.slice(0, 40).map(function (r, i) {
      var n = r.node, sc = r.sc;
      var bcls = sc.branch === "lexikálny" ? "ok" : sc.branch === "hybridný" ? "info" : sc.branch === "vektorový" ? "warn" : "mute";
      var risk = sc.branch === "vektorový" && sc.vec > 0 && sc.vec < 0.55;
      return '<div class="pm-r" data-id="' + esc(n.id) + '" style="border-top:1px solid var(--line);padding:11px 0' + (i === 0 ? ";border-top:0" : "") + '">' +
        '<div style="display:flex;gap:9px;align-items:baseline;flex-wrap:wrap">' +
        '<span class="num" style="font-size:var(--fs-label);color:var(--ink-3);width:18px">' + (i + 1) + ".</span>" +
        '<button class="btn ghost pm-open" style="border:0;background:none;padding:0;font-size:var(--fs-sm);font-weight:600;color:var(--ink)">' + A.hl(n.name, PM.q) + "</button>" +
        '<span class="badge ' + bcls + '">' + sc.branch + "</span>" + mem().typeBadge(n.type) +
        (risk ? ' <span class="srcbadge sim">riziko SK↔EN</span>' : "") +
        '<span class="sp" style="flex:1"></span>' +
        '<span class="num" style="font-size:var(--fs-sm);color:var(--accentText)">' + F(sc.s, 3) + "</span></div>" +
        '<div style="display:flex;gap:10px;align-items:center;margin:6px 0 5px 27px">' +
        '<div class="trk" style="flex:1"><i style="width:' + (sc.s * 100).toFixed(1) + '%"></i></div>' +
        '<span class="num" style="font-size:var(--fs-label);color:var(--ink-3);white-space:nowrap">lex ' + F(sc.lex, 2) + " · vec " + F(sc.vec, 2) + "</span></div>" +
        '<div class="num" style="font-size:var(--fs-label);color:var(--ink-3);margin-left:27px">' + esc(mem().zoneLabel(n.area)) + " › " + esc(n.dep.name) + " · istota " + F(n.conf, 2) + " · vek " + F(n.age, 0) + " dní</div>" +
        '<details style="margin:7px 0 0 27px"><summary style="font-size:var(--fs-label);color:var(--ink-3);cursor:pointer">Prečo tento výsledok</summary>' +
        '<div style="font-size:var(--fs-sm);color:var(--ink-2);margin-top:6px;line-height:1.6">' +
        "Lexikálna vetva " + (sc.lex > 0 ? "dala zhodu " + F(sc.lex, 2) : "nenašla priamu zhodu") + ", vektorová vetva (bge-m3) dala " + F(sc.vec, 2) + ". Výsledné skóre je vážený súčet = " + F(sc.s, 3) + ". " +
        (risk ? '<b style="color:var(--amber)">Riziko SK↔EN:</b> prekryv bge-m3 je len 3/20 — skús slovenský aj anglický tvar dopytu, samotné vektorové skóre nad 0,50 nie je dôkaz relevantnosti.' : "") +
        "</div></details>" +
        '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin:8px 0 0 27px">' +
        '<label style="font-size:var(--fs-label);color:var(--ink-3)">sila <input type="range" class="pm-str" min="0" max="100" step="5" value="' + Math.round(n.str * 100) + '" style="vertical-align:middle;width:90px" aria-label="Upraviť silu ' + esc(n.name) + '"></label>' +
        '<button class="btn ghost pm-edit" style="padding:3px 9px;font-size:var(--fs-label)">Otvoriť editor</button>' +
        '<button class="btn ghost pm-bad" style="padding:3px 9px;font-size:var(--fs-label)">Označiť zlý</button>' +
        '<button class="btn ghost pm-graph" style="padding:3px 9px;font-size:var(--fs-label)">Prejsť do grafu</button>' +
        "</div></div>";
    }).join("");

    $$("#pm-hl-res .pm-r").forEach(function (row) {
      var id = row.getAttribute("data-id"), n = mem().byId(id);
      function open() { mem().inspect(id); }
      $(".pm-open", row).addEventListener("click", open);
      $(".pm-edit", row).addEventListener("click", open);
      $(".pm-graph", row).addEventListener("click", function () { pmHighlightNode(id); });
      $(".pm-bad", row).addEventListener("click", function () { mem().update(n, { conf: clamp(n.conf - 0.2, 0, 1) }); A.toast("Označené ako slabý výsledok — istota znížená", "warn"); });
      $(".pm-str", row).addEventListener("change", function () { mem().update(n, { str: +this.value / 100 }); A.toast("Sila uzla upravená na " + F(+this.value / 100, 2), "ok"); });
    });
  }
  function passFilterNoWeak(n) {
    var w0 = PM.weakOnly; PM.weakOnly = false; var r = passFilter(n); PM.weakOnly = w0; return r;
  }
  function wrap(n) { return { node: n, sc: { s: n.str, branch: "—", lex: 0, vec: 0 } }; }

  function runSearch(q) {
    PM.q = (q || "").trim();
    if (PM.q) PM.preset = null;
    $("#pm-hl-q").value = PM.q;
    hlPresets(); hlResults();
  }

  /* ============================================================
     ENGINE GRAFY
     ============================================================ */
  function densData() {
    var adj = {}; mem().edges().forEach(function (e) { adj[e.a] = (adj[e.a] || 0) + 1; adj[e.b] = (adj[e.b] || 0) + 1; });
    return mem().AREAS.map(function (a) {
      var ns = mem().nodes().filter(function (n) { return n.area.k === a.k; });
      var deg = ns.reduce(function (s, n) { return s + (adj[n.id] || 0); }, 0);
      return { area: a, dens: ns.length ? deg / ns.length : 0, nodes: ns.length };
    });
  }
  function drawCharts() {
    var dens = densData();
    C.render("#pm-ch-dens", {
      type: "bar", title: "Hustota prepojení podľa oblasti", height: 210,
      caption: "synapsií na jeden uzol · odvodené z hrán grafu, nie merané",
      xTitle: "Oblasť", yLeft: { unit: "syn/uzol", dec: 1, min: 0 },
      x: { labels: dens.map(function (d) { return d.area.name.split(" ")[0]; }) },
      series: [{ key: "d", label: "spojení/uzol", unit: "", dec: 1, data: dens.map(function (d) { return { y: d.dens, color: d.area.color }; }) }],
      onPoint: function (i) { PM.filter.area = dens[i].area.k; applyFilterUI(); A.toast("Filter na oblasť " + dens[i].area.name, "ok"); }
    });
    $("#pm-dens-tbl").innerHTML = '<div class="tw"><table class="tbl"><thead><tr><th>Oblasť</th><th class="num">Uzlov</th><th class="num">Spojení/uzol</th></tr></thead><tbody>' +
      dens.map(function (d) { return "<tr><td>" + esc(mem().zoneLabel(d.area)) + '</td><td class="num">' + F(d.nodes, 0) + '</td><td class="num">' + F(d.dens, 1) + "</td></tr>"; }).join("") + "</tbody></table></div>";

    var grow = A.series(555, 90, 40, 10, 5.6).map(function (v) { return Math.round(v); });
    C.render("#pm-ch-grow", {
      type: "area", title: "Rast spojení v čase", height: 210,
      caption: "posledných 90 dní · kumulatívne · simulovaný priebeh",
      xTitle: "Deň", yLeft: { unit: "syn", dec: 0, min: 0 },
      x: { labels: A.days(90) },
      series: [{ key: "s", label: "synapsie", unit: "", dec: 0, color: "var(--teal)", data: grow.map(function (v) { return { y: v }; }) }]
    });
    var gr = A.days(90);
    $("#pm-grow-tbl").innerHTML = '<div class="tw"><table class="tbl"><thead><tr><th>Deň</th><th class="num">Synapsie</th></tr></thead><tbody>' +
      grow.filter(function (_, i) { return i % 9 === 0; }).map(function (v, i) { return "<tr><td>" + esc(gr[i * 9]) + '</td><td class="num">' + F(v, 0) + "</td></tr>"; }).join("") + "</tbody></table></div>";
  }

  /* ============================================================
     Prepínanie tabov / pohľadov
     ============================================================ */
  function switchTab(tab) {
    PM.tab = tab;
    $$("#pm-tabs button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-tab") === tab)); });
    $("#pm-panel-graf").hidden = tab !== "graf";
    $("#pm-panel-dnes").hidden = tab !== "dnes";
    $("#pm-panel-hladanie").hidden = tab !== "hladanie";
    $("#pm-panel-cistenie").hidden = tab !== "cistenie";
    if (tab === "cistenie") clRender();
    if (tab === "dnes") dnesRender();
    if (tab === "hladanie") hlResults();
    if (tab === "graf") redrawView();
    if (w.AuraChart) setTimeout(w.AuraChart.reflowAll, 30);
  }
  function switchView(view) {
    PM.view = view;
    $$("#pm-views button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-view") === view)); });
    $("#pm-v-siet").hidden = view !== "siet";
    $("#pm-v-radial").hidden = view !== "radial";
    $("#pm-v-zoznam").hidden = view !== "zoznam";
    $("#pm-crumb").textContent = view === "siet" ? "Sieť" : view === "radial" ? "Radiál" : "Zoznam";
    redrawView();
  }
  function redrawView() {
    if (PM.tab !== "graf") return;
    if (PM.view === "siet") { netDraw(); netMobileList(); }
    else if (PM.view === "radial") { radCrumb(); radDraw(); }
    else { zoznamRender(A.applySort($("#pm-tbl"), zoznamRows())); }
  }

  /* ------------------------------------------------------------
     Filtre UI ↔ stav
     ------------------------------------------------------------ */
  function applyFilterUI() {
    $("#pm-f-type").value = PM.filter.type;
    $("#pm-f-str").value = Math.round(PM.filter.strMin * 100);
    $("#pm-f-strv").textContent = F(PM.filter.strMin, 2);
    $("#pm-f-per").value = String(PM.filter.per);
    legendRefresh();
    shareFilter();
    redrawView();
    if (PM.tab === "hladanie") hlResults();
  }

  function showFchip(label) {
    var host = $("#pm-fchip");
    if (!label) { host.innerHTML = ""; return; }
    host.innerHTML = '<div class="fchip">filtrované z <b>' + esc(label) + '</b> <button aria-label="Zrušiť filter">✕</button></div>';
    $("#pm-fchip button").addEventListener("click", function () { resetFilters(); });
  }
  function resetFilters() {
    PM.filter = { area: "", type: "", strMin: 0, per: 0 }; PM.weakOnly = false; PM.preset = null; PM.appFilter = "";
    showFchip(null); applyFilterUI(); hlPresets();
  }

  /* ============================================================
     Registrácia obrazovky
     ============================================================ */
  A.screens = A.screens || {};
  /* ============================================================
     Sprievodca čistenia (Q16/37/38/39) — slabé → staré → osamelé → duplikáty
     ============================================================ */
  var CL_STEPS = [
    { k: "weak", name: "Slabé", desc: "Uzly so silou pod 0,40. Aura im sama neverí — pri recalle ich takmer nikdy nevytiahne, ale zaberajú miesto v grafe a mätú hľadanie." },
    { k: "stale", name: "Dlho neaktívne", desc: "Uzly bez aktivácie viac než 180 dní. Nemusia byť zlé — len ich už nikto nepotreboval. Skontrolujte, či nie sú zastarané." },
    { k: "orphan", name: "Osamelé", desc: "Uzly bez jedinej synapsie. Nič na ne nenadväzuje, takže recall ich nájde len presným dopytom." },
    { k: "dupes", name: "Duplikáty", desc: "Dvojice s podobným názvom a rovnakým typom. Namiesto archivovania sa oplatí ich zlúčiť — silnejší uzol si vezme aktivácie aj tagy toho druhého." }
  ];
  function clStepDef(k) { for (var i = 0; i < CL_STEPS.length; i++) if (CL_STEPS[i].k === k) return CL_STEPS[i]; return CL_STEPS[0]; }
  function clCandidates(k) {
    var ns = mem().nodes();
    if (k === "weak") return ns.filter(function (n) { return n.str < 0.4 && !n.pinned; });
    if (k === "stale") return ns.filter(function (n) { return n.age > 180 && !n.pinned; });
    if (k === "orphan") return ns.filter(function (n) { return mem().neighbors(n.id).length === 0 && !n.pinned; });
    /* duplikáty: unikátne dvojice */
    var seen = {}, out = [];
    ns.forEach(function (n) {
      mem().dupes(n).forEach(function (m) {
        var key = [n.id, m.id].sort().join("|");
        if (seen[key]) return;
        seen[key] = 1; out.push({ a: n, b: m });
      });
    });
    return out.slice(0, 30);
  }
  function clRender() {
    var step = clStepDef(PM.clStep), list = clCandidates(PM.clStep), dup = PM.clStep === "dupes";
    var idx = CL_STEPS.map(function (x) { return x.k; }).indexOf(PM.clStep);
    $$("#pm-cl-steps button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-s") === PM.clStep)); });
    $("#pm-cl-step").textContent = "krok " + (idx + 1) + " zo 4";
    $("#pm-cl-desc").textContent = step.desc;
    $("#pm-cl-total").textContent = F(list.length, 0) + (dup ? " dvojíc" : " uzlov");
    $("#pm-cl-do").hidden = dup;
    $("#pm-cl-all").hidden = dup;
    $("#pm-cl-none").hidden = dup;

    var tb = $("#pm-cl-tbl tbody"), cards = $("#pm-cl-cards");
    if (!list.length) {
      tb.innerHTML = '<tr><td colspan="6"><div class="empty"><span class="eico">∅</span><p>V tomto kroku niet čo čistiť. Pamäť je v poriadku.</p></div></td></tr>';
      cards.innerHTML = ""; clSelCount(); return;
    }
    if (dup) {
      tb.innerHTML = list.map(function (pr, i) {
        return '<tr><td class="k">dvojica</td><td>' + esc(pr.a.name) + " <span class=\"note\">vs</span> " + esc(pr.b.name) +
          "</td><td>" + esc(mem().zoneLabel(pr.a.area)) + '</td><td class="num">' + F(pr.a.str, 2) + " / " + F(pr.b.str, 2) +
          '</td><td class="num">' + F(pr.a.acts + pr.b.acts, 0) + '</td><td class="num"><button class="btn ghost sm" type="button" data-merge="' + i + '">Zlúčiť</button></td></tr>';
      }).join("");
      cards.innerHTML = list.map(function (pr, i) {
        return '<div class="rowcard"><div class="rh"><b>' + esc(pr.a.name) + "</b></div><dl><dt>Podobný</dt><dd>" + esc(pr.b.name) +
          "</dd><dt>Sila</dt><dd>" + F(pr.a.str, 2) + " / " + F(pr.b.str, 2) + '</dd></dl><button class="btn ghost sm" type="button" data-merge="' + i + '">Zlúčiť</button></div>';
      }).join("");
      $$("#pm-panel-cistenie [data-merge]").forEach(function (b) {
        b.addEventListener("click", function () {
          var pr = list[+b.getAttribute("data-merge")];
          var keep = pr.a.str >= pr.b.str ? pr.a : pr.b, drop = keep === pr.a ? pr.b : pr.a;
          A.confirm("Zlúčiť uzly?", "„" + drop.name + "“ sa zlúči do „" + keep.name + "“ a zanikne. Aktivácie a tagy prejdú na silnejší uzol.",
            function () { mem().merge(keep, drop); clRender(); A.toast("Zlúčené do „" + keep.name + "“", "ok"); }, "Zlúčiť", true);
        });
      });
      clSelCount(); return;
    }
    tb.innerHTML = list.map(function (n) {
      return '<tr><td><input type="checkbox" data-cl="' + esc(n.id) + '" aria-label="Vybrať uzol ' + esc(n.name) + '"' + (PM.clSel[n.id] ? " checked" : "") + "></td>" +
        '<td class="k"><button class="lk" type="button" data-open="' + esc(n.id) + '">' + esc(n.name) + "</button></td><td>" + esc(mem().zoneLabel(n.area)) + " · " + esc(n.dep.name) +
        '</td><td class="num">' + F(n.str, 2) + '</td><td class="num">' + F(n.acts, 0) + '</td><td class="num">' + F(n.age, 0) + "</td></tr>";
    }).join("");
    cards.innerHTML = list.map(function (n) {
      return '<div class="rowcard"><div class="rh"><label style="display:flex;gap:8px;align-items:center"><input type="checkbox" data-cl="' + esc(n.id) + '" aria-label="Vybrať uzol ' + esc(n.name) + '"' + (PM.clSel[n.id] ? " checked" : "") + "><b>" + esc(n.name) + "</b></label></div>" +
        "<dl><dt>Zóna</dt><dd>" + esc(mem().zoneLabel(n.area)) + "</dd><dt>Sila</dt><dd>" + F(n.str, 2) + "</dd><dt>Aktivácie</dt><dd>" + F(n.acts, 0) + "</dd><dt>Vek</dt><dd>" + F(n.age, 0) + " dní</dd></dl>" +
        '<button class="btn ghost sm" type="button" data-open="' + esc(n.id) + '">Otvoriť uzol</button></div>';
    }).join("");
    $$("#pm-panel-cistenie [data-cl]").forEach(function (c) {
      c.addEventListener("change", function () { PM.clSel[c.getAttribute("data-cl")] = c.checked; clSelCount(); });
    });
    $$("#pm-panel-cistenie [data-open]").forEach(function (b) {
      b.addEventListener("click", function () { mem().inspect(b.getAttribute("data-open")); });
    });
    clSelCount();
  }
  function clSelIds() { return Object.keys(PM.clSel).filter(function (k) { return PM.clSel[k]; }); }
  function clSelCount() {
    var n = clSelIds().length;
    $("#pm-cl-sel").textContent = F(n, 0) + " vybraných";
    $("#pm-cl-do").disabled = n === 0;
  }

  /* pruh triage nad obsahom (Q15/Q40) */
  function triageBar() {
    var host = $("#pm-triagebar"); if (!host) return;
    var n = mem().today().length;
    if (!n || PM.triageOff || PM.tab === "dnes") { host.innerHTML = ""; return; }
    host.innerHTML = '<div class="alert" style="margin-bottom:12px;flex-wrap:wrap"><span class="ai"></span>' +
      '<div style="flex:1 1 200px"><b>Máš ' + F(n, 0) + " nových uzlov na prehodnotenie</b>Dnes pribudnuté uzly ešte nikto nezaradil ani neoveril.</div>" +
      '<div class="filt" style="margin:0;gap:8px"><button class="btn" type="button" id="pm-tb-go">Spracovať</button>' +
      '<button class="btn ghost" type="button" id="pm-tb-off">Neskôr</button></div></div>';
    $("#pm-tb-go").addEventListener("click", function () { switchTab("dnes"); triageBar(); });
    $("#pm-tb-off").addEventListener("click", function () { PM.triageOff = true; triageBar(); A.toast("Triage odložený — nájdeš ho na tabe Dnes", "ok"); });
  }

  A.screens.pamat = {
    title: "Pamäť", group: "Pamäť",
    init: function () {
      kpiRefresh(); recentRefresh(); legendRefresh();
      netBuild(); netDraw(); netMobileList();
      drawCharts();
      hlPresets(); hlSaved(); hlResults();

      /* KPI */
      $("#pm-k1").addEventListener("click", function () {
        A.detail("Rozdelenie uzlov", "<dl>" + mem().AREAS.map(function (a) {
          var c = mem().nodes().filter(function (n) { return n.area.k === a.k; }).length;
          return "<dt>" + esc(mem().zoneLabel(a)) + "</dt><dd>" + F(c, 0) + " uzlov</dd>";
        }).join("") + "<dt>Systémové jadrá</dt><dd>" + F(mem().CORE_NODES, 0) + "</dd></dl><p>Živá snímka z modelu Aura.mem.</p>", []);
      });
      $("#pm-k2").addEventListener("click", function () { resetFilters(); switchTab("graf"); A.toast("Filter oblastí zrušený", "ok"); });
      $("#pm-k3").addEventListener("click", function () { presetWeak(); });
      $("#pm-k4").addEventListener("click", function () { switchTab("dnes"); });

      /* domov */
      function homeGo() { switchTab("hladanie"); runSearch($("#pm-home-q").value); }
      $("#pm-home-go").addEventListener("click", homeGo);
      $("#pm-home-q").addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); homeGo(); } });
      $("#pm-new").addEventListener("click", createNode);
      $("#pm-weak").addEventListener("click", presetWeak);
      $("#pm-triage").addEventListener("click", function () { switchTab("dnes"); });
      $("#pm-recent").addEventListener("click", function (e) { var b = e.target.closest("button[data-id]"); if (b) mem().inspect(b.getAttribute("data-id")); });

      /* sprievodca čistenia */
      $("#pm-cl-steps").addEventListener("click", function (e) {
        var b = e.target.closest("button[data-s]"); if (!b) return;
        PM.clStep = b.getAttribute("data-s"); PM.clSel = {}; clRender();
      });
      $("#pm-cl-all").addEventListener("click", function () { clCandidates(PM.clStep).forEach(function (n) { PM.clSel[n.id] = true; }); clRender(); });
      $("#pm-cl-none").addEventListener("click", function () { PM.clSel = {}; clRender(); });
      $("#pm-cl-next").addEventListener("click", function () {
        var ks = CL_STEPS.map(function (x) { return x.k; }), i = ks.indexOf(PM.clStep);
        PM.clStep = ks[(i + 1) % ks.length]; PM.clSel = {}; clRender();
      });
      $("#pm-cl-do").addEventListener("click", function () {
        var ids = clSelIds(); if (!ids.length) return;
        A.confirm("Archivovať " + F(ids.length, 0) + " uzlov?",
          "Uzly sa presunú do archívu — zmiznú z grafu, hľadania aj z appiek, ale dajú sa vrátiť cez filter Archív. Nič sa nemaže natrvalo.",
          function () {
            ids.forEach(function (id) { var nd = mem().byId(id); if (nd) mem().archive(nd); });
            PM.clSel = {}; clRender(); kpiRefresh();
            A.toast(F(ids.length, 0) + " uzlov archivovaných", "ok");
          }, "Archivovať", true);
      });

      /* taby / pohľady */
      $("#pm-tabs").addEventListener("click", function (e) { var b = e.target.closest("button[data-tab]"); if (b) { switchTab(b.getAttribute("data-tab")); triageBar(); } });
      $("#pm-views").addEventListener("click", function (e) { var b = e.target.closest("button[data-view]"); if (b) switchView(b.getAttribute("data-view")); });

      /* sieť — vrstvy */
      $("#pm-layers").addEventListener("click", function (e) {
        var b = e.target.closest("button[data-l]"); if (!b) return;
        PM.layer = b.getAttribute("data-l");
        $$("#pm-layers button").forEach(function (n) { n.setAttribute("aria-pressed", String(n === b)); });
        netDraw();
      });
      $("#pm-net-list").addEventListener("click", function (e) { var b = e.target.closest("button[data-id]"); if (b) mem().inspect(b.getAttribute("data-id")); });

      /* radiál */
      $("#pm-rad-back").addEventListener("click", radUp);

      /* zoznam — bulk + výber všetkých */
      $("#pm-all").addEventListener("change", function () {
        var rows = A.applySort($("#pm-tbl"), zoznamRows());
        rows.forEach(function (r) { PM.sel[r.id] = this.checked; }, this);
        zoznamRender(rows);
      });
      $("#pm-bulk").addEventListener("click", function (e) { var b = e.target.closest("button[data-bulk]"); if (b) runBulk(b.getAttribute("data-bulk")); });
      A.sortable($("#pm-tbl"), zoznamRows, zoznamRender);

      /* filtre */
      $("#pm-f-type").addEventListener("change", function () { PM.filter.type = this.value; applyFilterUI(); });
      $("#pm-f-str").addEventListener("input", function () { PM.filter.strMin = +this.value / 100; $("#pm-f-strv").textContent = F(PM.filter.strMin, 2); shareFilter(); redrawView(); legendRefresh(); if (PM.tab === "hladanie") hlResults(); });
      $("#pm-f-per").addEventListener("change", function () { PM.filter.per = +this.value; applyFilterUI(); });
      $("#pm-reset").addEventListener("click", resetFilters);
      $("#pm-legend").addEventListener("click", function (e) {
        var b = e.target.closest("button[data-area]"); if (!b) return;
        var k = b.getAttribute("data-area");
        PM.filter.area = PM.filter.area === k ? "" : k;
        showFchip(PM.filter.area ? mem().areaByKey(k).name : null);
        applyFilterUI();
      });

      /* charty — prepnutie na tabuľku */
      bindChartToggle("#pm-dens-t", "#pm-ch-dens", "#pm-dens-tbl");
      bindChartToggle("#pm-grow-t", "#pm-ch-grow", "#pm-grow-tbl");

      /* hľadanie */
      $("#pm-hl-go").addEventListener("click", function () { runSearch($("#pm-hl-q").value); });
      $("#pm-hl-q").addEventListener("input", function () { runSearch(this.value); });
      $("#pm-hl-q").addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); runSearch(this.value); } });
      $("#pm-hl-save").addEventListener("click", function () {
        if (!PM.q && !PM.preset) { A.toast("Najprv zadaj dopyt", "warn"); return; }
        PM.saved.unshift({ q: PM.q, preset: PM.preset }); PM.saved = PM.saved.slice(0, 8); hlSaved(); A.toast("Hľadanie uložené", "ok");
      });
      $("#pm-hl-presets").addEventListener("click", function (e) {
        var b = e.target.closest("button[data-preset]"); if (!b) return;
        var k = b.getAttribute("data-preset");
        if (k.indexOf("area:") === 0) { var ak = k.slice(5); PM.filter.area = PM.filter.area === ak ? "" : ak; PM.preset = null; showFchip(PM.filter.area ? mem().areaByKey(ak).name : null); applyFilterUI(); }
        else { PM.preset = PM.preset === k ? null : k; PM.q = ""; $("#pm-hl-q").value = ""; }
        hlPresets(); hlResults();
      });
      $("#pm-hl-saved").addEventListener("click", function (e) {
        var b = e.target.closest("button[data-saved]"); if (!b) return;
        var s = PM.saved[+b.getAttribute("data-saved")]; if (!s) return;
        PM.preset = s.preset; if (s.q) runSearch(s.q); else { PM.q = ""; $("#pm-hl-q").value = ""; hlPresets(); hlResults(); }
      });

      /* Cmd-K */
      A.registerCmd([
        { label: "Nový uzol", hint: "Pamäť · vytvoriť a otvoriť inšpektor", run: createNode },
        { label: "Slabé uzly", hint: "Pamäť · uzly pod 0,40 na čistenie", run: function () { A.go("pamat"); setTimeout(presetWeak, 60); } }
      ]);

      /* prekresli aktívny pohľad pri každej zmene modelu */
      mem().onChange(function () {
        kpiRefresh(); recentRefresh(); legendRefresh();
        PM.net = null; /* vynúť prepočet pozícií (nové/archívne uzly) */
        drawCharts();
        redrawView();
        if (PM.tab === "dnes") dnesRender();
        if (PM.tab === "hladanie") hlResults();
      });

      PM.inited = true;
    },

    onShow: function (sub) {
      if (w.AuraChart) setTimeout(w.AuraChart.reflowAll, 40);
      if (PM.inited && PM.tab === "graf" && PM.view === "siet") setTimeout(function () { netDraw(); }, 40);
      triageBar();
      if (!sub) return;
      if (mem().byId(sub)) { mem().inspect(sub); return; }
      if (sub === "slabe" || sub === "weak") { presetWeak(); return; }
      if (sub === "cistenie" || sub === "cleanup") { switchTab("cistenie"); triageBar(); return; }
      if (sub.indexOf("app:") === 0) {
        var app = A.apps.bySlug(sub.slice(4));
        if (app) {
          PM.appFilter = app.slug;
          switchTab("graf"); switchView("zoznam");
          showFchip("appka " + app.name);
          applyFilterUI();
          A.toast("Pamäť filtrovaná na appku " + app.name, "ok");
        }
        return;
      }
      if (sub === "dnes" || sub === "today" || sub === "triage") { switchTab("dnes"); return; }
      if (sub === "hladanie" || sub === "search") { switchTab("hladanie"); return; }
      var a = mem().areaByKey(sub);
      if (a) { PM.filter.area = sub; showFchip(a.name); applyFilterUI(); switchTab("graf"); return; }
      /* inak: chápeme ako dopyt */
      switchTab("hladanie"); runSearch(sub.replace(/-/g, " "));
    }
  };

  /* helpers viazané na obrazovku */
  function createNode() {
    var nd = mem().create({ name: "Nový uzol", area: mem().AREAS[0], type: "memory" });
    A.go("pamat"); mem().inspect(nd);
  }
  function presetWeak() {
    switchTab("graf"); switchView("zoznam");
    PM.weakOnly = true; PM.filter.strMin = 0;
    showFchip("Slabé uzly (sila < 0,40)");
    applyFilterUI();
    A.toast(F(mem().weak().length, 0) + " slabých uzlov na čistenie", "warn");
  }
  function bindChartToggle(btnSel, chartSel, tblSel) {
    $(btnSel).addEventListener("click", function () {
      var tbl = $(tblSel), ch = $(chartSel), showTbl = tbl.hidden;
      tbl.hidden = !showTbl; ch.hidden = showTbl;
      this.textContent = showTbl ? "Zobraziť ako graf" : "Zobraziť ako tabuľku";
    });
  }
})(window);
