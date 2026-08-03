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

  /* rozbaľovacie filtre v lište grafu (Q11) */
  function syncFilterCollapse() {
    var tgl = $("#pm-filt-toggle"), body = $("#pm-filter-body");
    if (!tgl || !body) return;
    body.hidden = !PM.filtOpen;
    tgl.setAttribute("aria-expanded", String(PM.filtOpen));
    var c = $("#pm-filt-caret"); if (c) c.textContent = PM.filtOpen ? "▾" : "▸";
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
     SIEŤ v7 — Hades hierarchia: jadro laloku → oddelenie → poznatok
     Layout: phyllotaxis (zlatý uhol) + kolízna relaxácia, deterministický,
     počíta sa raz a cachuje podľa podpisu množiny uzlov.
     Render: mount raz, vrstvy/filtre = len CSS triedy. Hover cez adjacency.
     ============================================================ */
  var GW = 960, GH = 620, GPAD = 40, GOLD_ANG = 2.39996;

  function netSig() {
    return mem().nodes().map(function (n) { return n.id; }).join("|");
  }

  function netBuild() {
    var sig = netSig();
    if (PM.net && PM.net.sig === sig) return;
    var areas = mem().AREAS, cx = GW / 2, cy = GH / 2, R = 205;
    var lobes = {}, hubs = [], leaves = [], all = [], byId = {};

    var counts = {};
    areas.forEach(function (a) { counts[a.k] = mem().nodes().filter(function (n) { return n.area.k === a.k; }).length || 1; });
    var maxC = Math.max.apply(null, Object.keys(counts).map(function (k) { return counts[k]; }));

    areas.forEach(function (a, i) {
      var ang = -Math.PI / 2 + i * 2 * Math.PI / areas.length;
      var sc = 0.78 + 0.44 * Math.sqrt(counts[a.k] / maxC);          /* elipsa rastie s obsahom */
      lobes[a.k] = {
        k: a.k, area: a, ang: ang,
        x: cx + Math.cos(ang) * R, y: cy + Math.sin(ang) * R * 0.88,
        rx: 150 * sc, ry: 120 * sc
      };
    });

    /* huby = oddelenia (24), phyllotaxis vnútri laloku */
    areas.forEach(function (a) {
      var L = lobes[a.k], m = a.deps.length;
      a.deps.forEach(function (d, j) {
        var ang = j * GOLD_ANG, rad = (L.rx * 0.62) * Math.sqrt((j + 0.55) / m);
        var h = {
          id: "hub-" + d.slug, kind: "hub", dep: d, area: a,
          x: L.x + Math.cos(ang) * rad, y: L.y + Math.sin(ang) * rad * 0.82,
          r: 7 + Math.min(9, d.n / 9), name: d.name
        };
        hubs.push(h); all.push(h); byId[h.id] = h;
      });
    });

    /* leafy = živé uzly pamäte, vejár okolo svojho hubu */
    var perHub = {};
    mem().nodes().forEach(function (n) {
      var hid = "hub-" + n.dep.slug, h = byId[hid]; if (!h) return;
      var k = (perHub[hid] = perHub[hid] || { i: 0, n: 0 });
      k.n++;
    });
    mem().nodes().forEach(function (n) {
      var hid = "hub-" + n.dep.slug, h = byId[hid]; if (!h) return;
      var k = perHub[hid], i = k.i++;
      var spread = Math.min(2.4, 0.9 + k.n * 0.34);
      var ang = Math.atan2(h.y - lobes[n.area.k].y, h.x - lobes[n.area.k].x) + (i - (k.n - 1) / 2) * (spread / Math.max(1, k.n));
      var rad = 22 + (h32(n.id) % 14);
      var lf = {
        id: n.id, kind: "leaf", node: n, hub: h, area: n.area,
        x: h.x + Math.cos(ang) * rad, y: h.y + Math.sin(ang) * rad * 0.85,
        r: 3 + n.str * 3.4, name: n.name
      };
      leaves.push(lf); all.push(lf); byId[lf.id] = lf;
    });

    /* kolízna relaxácia: push-apart + pružina k domovu + hranice */
    all.forEach(function (n) { n.hx = n.x; n.hy = n.y; });
    for (var it = 0; it < 110; it++) {
      var moved = 0;
      for (var i = 0; i < all.length; i++) {
        for (var j = i + 1; j < all.length; j++) {
          var A1 = all[i], B = all[j];
          var pad = (A1.kind === "hub" || B.kind === "hub") ? 9 : 5;
          var dx = B.x - A1.x, dy = B.y - A1.y;
          var d = Math.sqrt(dx * dx + dy * dy) || 0.01, min = A1.r + B.r + pad;
          if (d < min) {
            var push = (min - d) / 2 * 0.55, ux = dx / d, uy = dy / d;
            A1.x -= ux * push; A1.y -= uy * push; B.x += ux * push; B.y += uy * push;
            moved = Math.max(moved, push);
          }
        }
      }
      all.forEach(function (n) {
        n.x += (n.hx - n.x) * 0.08; n.y += (n.hy - n.y) * 0.08;
        n.x = clamp(n.x, GPAD + n.r, GW - GPAD - n.r);
        n.y = clamp(n.y, GPAD + n.r, GH - GPAD - n.r);
      });
      if (moved < 0.15) break;
    }
    all.forEach(function (n) { n.x = Math.round(n.x * 2) / 2; n.y = Math.round(n.y * 2) / 2; });

    /* hrany: stem (jadro→hub) · leaf (hub→uzol) · intra (hub↔hub) · bridge (top12 medzi lalokmi) */
    var edges = [];
    hubs.forEach(function (h) {
      var L = lobes[h.area.k];
      edges.push({ a: "core-" + h.area.k, b: h.id, kind: "stem", w: 1.6 });
    });
    leaves.forEach(function (lf) { edges.push({ a: lf.hub.id, b: lf.id, kind: "leaf", w: 0.7 }); });
    areas.forEach(function (a) {
      var hs = hubs.filter(function (h) { return h.area.k === a.k; });
      hs.forEach(function (h, i) {
        var t = hs[(i + 1) % hs.length];
        if (t && t !== h && i < hs.length - 1) edges.push({ a: h.id, b: t.id, kind: "intra", w: 1.1 });
      });
    });
    var bridges = mem().edges()
      .filter(function (e) { var x = byId[e.a], y = byId[e.b]; return x && y && x.area.k !== y.area.k; })
      .sort(function (x, y) { return y.w - x.w; }).slice(0, 12);
    bridges.forEach(function (e) { edges.push({ a: e.a, b: e.b, kind: "bridge", w: e.w }); });

    /* adjacency — hover sa dotkne len susedstva */
    var adj = {};
    edges.forEach(function (e, i) {
      (adj[e.a] = adj[e.a] || []).push(i);
      (adj[e.b] = adj[e.b] || []).push(i);
    });

    PM.net = {
      sig: sig, lobes: lobes, hubs: hubs, leaves: leaves, all: all, byId: byId,
      edges: edges, adj: adj, el: {}, eel: [], hi: null,
      cam: { k: 1, tx: 0, ty: 0 }, lobeFocus: null, mounted: false
    };
  }

  /* ---------- mount (raz na podpis) ---------- */
  function netMount() {
    var host = $("#pm-net"); if (!host) return;
    netBuild();
    var net = PM.net;
    if (net.mounted && host.__sig === net.sig) return;
    host.__sig = net.sig; net.mounted = true;
    host.innerHTML = "";
    S("title", {}, host).textContent = "Sieť pamäte: " + net.leaves.length + " uzlov v " + net.hubs.length + " oddeleniach a 5 lalokoch";

    var defs = S("defs", {}, host);
    mem().AREAS.forEach(function (a, i) {
      var g = S("radialGradient", { id: "pmg-" + a.k }, defs);
      S("stop", { offset: "0", "stop-color": a.color, "stop-opacity": ".5" }, g);
      S("stop", { offset: "1", "stop-color": a.color, "stop-opacity": "0" }, g);
    });
    var fA = S("filter", { id: "pm-aurora", x: "-40%", y: "-40%", width: "180%", height: "180%" }, defs);
    S("feGaussianBlur", { stdDeviation: "18" }, fA);
    var fG = S("filter", { id: "pm-glow", x: "-60%", y: "-60%", width: "220%", height: "220%" }, defs);
    S("feGaussianBlur", { stdDeviation: "2.4", result: "b" }, fG);
    var fm = S("feMerge", {}, fG); S("feMergeNode", { in: "b" }, fm); S("feMergeNode", { in: "SourceGraphic" }, fm);

    var cam = S("g", { id: "pm-cam" }, host);

    /* aurora laloky */
    var gA = S("g", { class: "nt-aurora", "aria-hidden": "true" }, cam);
    Object.keys(net.lobes).forEach(function (k) {
      var L = net.lobes[k];
      S("ellipse", { cx: L.x, cy: L.y, rx: L.rx, ry: L.ry, fill: "url(#pmg-" + k + ")", filter: "url(#pm-aurora)" }, gA);
    });

    /* hrany */
    var gB = S("g", { class: "nt-bridge" }, cam);
    var gE = S("g", { class: "nt-syn" }, cam);
    net.eel = [];
    net.edges.forEach(function (e, i) {
      var pa = e.a.indexOf("core-") === 0 ? net.lobes[e.a.slice(5)] : net.byId[e.a];
      var pb = net.byId[e.b];
      if (!pa || !pb) return;
      var el;
      if (e.kind === "bridge") {
        /* oblúk VON od stredu plátna — most nejde cez cudzie zhluky */
        var mx = (pa.x + pb.x) / 2, my = (pa.y + pb.y) / 2;
        var vx = mx - GW / 2, vy = my - GH / 2, vl = Math.sqrt(vx * vx + vy * vy) || 1;
        var len = Math.hypot(pb.x - pa.x, pb.y - pa.y), off = len * 0.22;
        el = S("path", {
          d: "M" + pa.x + " " + pa.y + " Q" + (mx + vx / vl * off) + " " + (my + vy / vl * off) + " " + pb.x + " " + pb.y,
          class: "nt-e nt-" + e.kind + " flow", fill: "none",
          stroke: (net.byId[e.a] || net.byId[e.b]).area.color
        }, gB);
      } else if (e.kind === "intra") {
        var mx2 = (pa.x + pb.x) / 2, my2 = (pa.y + pb.y) / 2;
        var dx = pb.x - pa.x, dy = pb.y - pa.y, l2 = Math.hypot(dx, dy) || 1;
        el = S("path", {
          d: "M" + pa.x + " " + pa.y + " Q" + (mx2 - dy / l2 * l2 * 0.12) + " " + (my2 + dx / l2 * l2 * 0.12) + " " + pb.x + " " + pb.y,
          class: "nt-e nt-intra", fill: "none", stroke: pb.area.color
        }, gE);
      } else {
        el = S("line", { x1: pa.x, y1: pa.y, x2: pb.x, y2: pb.y, class: "nt-e nt-" + e.kind, stroke: pb.area.color }, gE);
      }
      net.eel.push({ e: e, el: el });
    });

    /* jadrá lalokov */
    var gC = S("g", { class: "nt-core" }, cam);
    Object.keys(net.lobes).forEach(function (k) {
      var L = net.lobes[k];
      var c = S("circle", {
        cx: L.x, cy: L.y, r: 15, fill: L.area.color, "fill-opacity": ".28",
        stroke: L.area.color, "stroke-width": 1.4, filter: "url(#pm-glow)",
        class: "nt-corec", tabindex: "0", role: "button",
        "aria-label": "Lalok " + L.area.name + " — klik priblíži oblasť"
      }, gC);
      c.addEventListener("click", function () { netFocusLobe(PM.net.lobeFocus === k ? null : k); });
      c.addEventListener("keydown", function (ev) { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); netFocusLobe(PM.net.lobeFocus === k ? null : k); } });
    });

    /* uzly: huby + leafy — kruhy (typ nesie farba/ikona v tooltipe) */
    net.el = {};
    var gH = S("g", { class: "nt-hub" }, cam);
    net.hubs.forEach(function (h, i) {
      var g = S("g", { class: "nt-hubg", style: "--i:" + i }, gH);
      var c = S("circle", {
        cx: h.x, cy: h.y, r: h.r, fill: h.area.color, "fill-opacity": ".8",
        stroke: "var(--paper)", "stroke-width": 1, filter: "url(#pm-glow)",
        class: "cx-node nt-n", tabindex: "0", role: "button",
        "aria-label": "Oddelenie " + h.name + " — " + h.dep.n + " uzlov v podklade"
      }, g);
      net.el[h.id] = c;
      netBindNode(c, h);
      var t = S("text", { x: h.x, y: h.y - h.r - 5, "text-anchor": "middle", class: "nt-hlbl" }, g);
      t.textContent = h.name;
    });
    var gL = S("g", { class: "nt-leaf" }, cam);
    net.leaves.forEach(function (lf, i) {
      var n = lf.node;
      var c = S("circle", {
        cx: lf.x, cy: lf.y, r: lf.r, fill: n.area.color,
        "fill-opacity": (0.4 + n.str * 0.55).toFixed(2),
        stroke: "var(--paper)", "stroke-width": n.pinned ? 1.4 : 0.5,
        class: "cx-node nt-n nt-lf" + (n.today ? " today" : ""), style: "--i:" + i,
        tabindex: "0", role: "button",
        "aria-label": n.name + " — " + n.area.name + ", sila " + F(n.str, 2) + ", " + n.type
      }, gL);
      net.el[lf.id] = c;
      netBindNode(c, lf);
    });

    /* menovky leafov — viditeľné od zoomu 1,6× (CSS trieda na svg) */
    var gT = S("g", { class: "nt-llbl-g", "aria-hidden": "true" }, cam);
    net.leaves.forEach(function (lf) {
      var t = S("text", { x: lf.x, y: lf.y - lf.r - 3, "text-anchor": "middle", class: "nt-llbl" }, gT);
      t.textContent = lf.name;
    });

    /* nábeh raz (Q95) */
    if (!A.reduce && !host.__introDone) {
      host.classList.add("intro");
      host.__introDone = true;
      setTimeout(function () { host.classList.remove("intro"); }, 1400);
    }

    netCamApply(true);
    netStyle();
    netKpi();
    netZoomBind(host);
  }

  function netBindNode(el, item) {
    el.addEventListener("mouseenter", function (ev) { netHi(item.id); netTip(item, ev); });
    el.addEventListener("mouseleave", function () { netHi(null); netTipHide(); });
    el.addEventListener("focus", function (ev) { netHi(item.id); netTip(item, ev); });
    el.addEventListener("blur", function () { netHi(null); netTipHide(); });
    el.addEventListener("click", function () {
      if (item.kind === "leaf") { netTipHide(); mem().inspect(item.node); }
      else { netFocusLobe(PM.net.lobeFocus === item.area.k ? null : item.area.k); }
    });
    el.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); el.dispatchEvent(new MouseEvent("click")); }
    });
    el.addEventListener("touchstart", function (ev) { netHi(item.id); netTip(item, ev.touches[0]); }, { passive: true });
  }

  /* ---------- štýl vrstvy/filtra — žiadny rebuild, len triedy ---------- */
  function netStyle() {
    var host = $("#pm-net"), net = PM.net; if (!host || !net) return;
    host.setAttribute("class", "cx-svg gnet lay-" + PM.layer + (host.classList.contains("intro") ? " intro" : "") + (net.cam.k >= 1.6 ? " z16" : "") + (host.classList.contains("cx-dim") ? " cx-dim" : ""));
    var app = PM.layer === "app" && $("#pm-gapp") ? A.apps.bySlug($("#pm-gapp").value) : null;
    var appIds = {};
    if (app) A.apps.nodes(app).forEach(function (n) { appIds[n.id] = 1; });
    net.leaves.forEach(function (lf) {
      var n = lf.node, el = net.el[lf.id]; if (!el) return;
      var vis = passFilter(n);
      var on = true;
      if (PM.layer === "type") el.setAttribute("fill", typeColor(n.type));
      else el.setAttribute("fill", n.area.color);
      if (PM.layer === "act") on = !!n.today || n.acts > 20;
      if (PM.layer === "app") on = !!appIds[n.id];
      el.setAttribute("opacity", !vis ? 0.08 : on ? 0.95 : 0.18);
    });
    net.hubs.forEach(function (h) {
      var el = net.el[h.id]; if (!el) return;
      if (PM.layer === "type") el.setAttribute("fill", typeColor(h.dep.type));
      else el.setAttribute("fill", h.area.color);
    });
    var shown = net.leaves.filter(function (lf) { return passFilter(lf.node); }).length;
    var cnt = $("#pm-net-cnt");
    if (cnt) cnt.textContent = F(shown, 0) + " / " + F(net.leaves.length, 0) + " uzlov · " + F(net.edges.length, 0) + " synapsií";
    netMobileList();
  }

  /* ---------- hover cez adjacency: dotkne sa len susedstva ---------- */
  function netHi(id) {
    var net = PM.net, host = $("#pm-net"); if (!net || !host) return;
    if (net.hi) {
      net.hi.nodes.forEach(function (k) { var e = net.el[k]; if (e) e.classList.remove("hot"); });
      net.hi.edges.forEach(function (i) { net.eel[i] && net.eel[i].el.classList.remove("hot"); });
      net.hi = null;
    }
    if (!id) { host.classList.remove("cx-dim"); return; }
    host.classList.add("cx-dim");
    var nodes = [id], edgeIdx = [];
    (net.adj[id] || []).forEach(function (i) {
      var ee = net.eel[i]; if (!ee) return;
      edgeIdx.push(i);
      [ee.e.a, ee.e.b].forEach(function (k) { if (k !== id && k.indexOf("core-") !== 0 && nodes.indexOf(k) < 0) nodes.push(k); });
    });
    nodes.forEach(function (k) { var e = net.el[k]; if (e) e.classList.add("hot"); });
    edgeIdx.forEach(function (i) { net.eel[i].el.classList.add("hot"); });
    net.hi = { nodes: nodes, edges: edgeIdx };
  }

  /* ---------- bohatý HTML tooltip (Q21, 120 ms) ---------- */
  var tipTimer = null;
  function netTip(item, ev) {
    var tip = $("#pm-gtip"); if (!tip) return;
    clearTimeout(tipTimer);
    tipTimer = setTimeout(function () {
      var html;
      if (item.kind === "hub") {
        var liveN = mem().nodes().filter(function (n) { return n.dep.slug === item.dep.slug; }).length;
        html = "<b>" + esc(item.name) + "</b>" +
          '<span class="gt-r">' + esc(mem().zoneLabel(item.area)) + "</span>" +
          '<span class="gt-r">oddelenie · ' + F(item.dep.n, 0) + " uzlov v podklade · " + F(liveN, 0) + " v sieti</span>" +
          '<span class="gt-r gt-hint">klik priblíži lalok</span>';
      } else {
        var n = item.node, deg = (PM.net.adj[n.id] || []).length;
        html = "<b>" + esc(n.name) + "</b>" +
          '<span class="gt-r">' + mem().typeIcon(n.type) + " " + esc(n.type) + " · " + esc(mem().zoneLabel(n.area)) + " › " + esc(n.dep.name) + "</span>" +
          '<span class="gt-r num">sila ' + F(n.str, 2) + " · istota " + F(n.conf, 2) + " · " + F(deg, 0) + " spojení</span>" +
          '<span class="gt-r gt-hint">klik otvorí inšpektor</span>';
      }
      tip.innerHTML = html;
      tip.hidden = false;
      var wrap = $("#pm-v-siet").getBoundingClientRect();
      var x = ev.clientX - wrap.left + 14, y = ev.clientY - wrap.top + 10;
      if (x + 260 > wrap.width) x -= 280;
      if (y + 110 > wrap.height) y -= 120;
      tip.style.left = Math.max(6, x) + "px"; tip.style.top = Math.max(6, y) + "px";
    }, 120);
  }
  function netTipHide() { clearTimeout(tipTimer); var t = $("#pm-gtip"); if (t) t.hidden = true; }

  /* ---------- kamera: zoom / pan / pinch cez jediný transform ---------- */
  function netCamApply(instant) {
    var net = PM.net, cam = document.getElementById("pm-cam"); if (!net || !cam) return;
    var c = net.cam;
    if (!instant && !A.reduce && cam.animate) {
      var from = cam.getAttribute("transform") || "translate(0 0) scale(1)";
      cam.setAttribute("transform", "translate(" + c.tx + " " + c.ty + ") scale(" + c.k + ")");
    } else {
      cam.setAttribute("transform", "translate(" + c.tx + " " + c.ty + ") scale(" + c.k + ")");
    }
    var host = $("#pm-net");
    if (host) host.classList.toggle("z16", c.k >= 1.6);
  }
  function netZoomTo(k, fx, fy) {
    var net = PM.net, c = net.cam;
    k = clamp(k, 0.8, 4);
    /* bod (fx,fy) vo viewBox súradniciach ostane pod kurzorom */
    c.tx = fx - (fx - c.tx) * (k / c.k);
    c.ty = fy - (fy - c.ty) * (k / c.k);
    c.k = k;
    netCamApply();
  }
  function netZoomBind(host) {
    if (host.__zoomBound) return; host.__zoomBound = true;
    var raf = null;
    function vb(ev) {
      var r = host.getBoundingClientRect();
      return { x: (ev.clientX - r.left) * GW / r.width, y: (ev.clientY - r.top) * GH / r.height };
    }
    host.addEventListener("wheel", function (ev) {
      ev.preventDefault();
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = null;
        var p = vb(ev), c = PM.net.cam;
        netZoomTo(c.k * (ev.deltaY < 0 ? 1.16 : 0.86), p.x, p.y);
      });
    }, { passive: false });
    var ptrs = {}, panFrom = null, pinch = null;
    host.addEventListener("pointerdown", function (ev) {
      if (ev.target.closest(".nt-n") || ev.target.closest(".nt-corec")) return;
      ptrs[ev.pointerId] = vb(ev);
      host.setPointerCapture(ev.pointerId);
      var ids = Object.keys(ptrs);
      if (ids.length === 1) panFrom = { x: ev.clientX, y: ev.clientY, tx: PM.net.cam.tx, ty: PM.net.cam.ty };
      if (ids.length === 2) {
        var a = ptrs[ids[0]], b = ptrs[ids[1]];
        pinch = { d: Math.hypot(b.x - a.x, b.y - a.y), k: PM.net.cam.k, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
        panFrom = null;
      }
    });
    host.addEventListener("pointermove", function (ev) {
      if (!(ev.pointerId in ptrs)) return;
      ptrs[ev.pointerId] = vb(ev);
      var ids = Object.keys(ptrs);
      if (pinch && ids.length === 2) {
        var a = ptrs[ids[0]], b = ptrs[ids[1]];
        var d = Math.hypot(b.x - a.x, b.y - a.y);
        netZoomTo(pinch.k * d / pinch.d, pinch.cx, pinch.cy);
      } else if (panFrom) {
        var r = host.getBoundingClientRect();
        PM.net.cam.tx = panFrom.tx + (ev.clientX - panFrom.x) * GW / r.width;
        PM.net.cam.ty = panFrom.ty + (ev.clientY - panFrom.y) * GH / r.height;
        netCamApply(true);
      }
    });
    function up(ev) { delete ptrs[ev.pointerId]; panFrom = null; pinch = null; }
    host.addEventListener("pointerup", up); host.addEventListener("pointercancel", up);
    host.addEventListener("dblclick", function (ev) {
      if (ev.target.closest(".nt-n")) return;
      netFocusLobe(null);
    });
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape" && PM.net && (PM.net.lobeFocus || PM.net.cam.k !== 1) && A.state.screen === "pamat") netFocusLobe(null);
    });
  }

  /* ---------- semantický zoom na lalok (Q42/49) ---------- */
  function netFocusLobe(k) {
    var net = PM.net; if (!net) return;
    net.lobeFocus = k;
    var crumb = $("#pm-gcrumb");
    if (k) {
      var L = net.lobes[k];
      var zoom = 2.1;
      net.cam.k = zoom;
      net.cam.tx = GW / 2 - L.x * zoom;
      net.cam.ty = GH / 2 - L.y * zoom;
      netCamApply();
      if (crumb) { crumb.hidden = false; $("#pm-gcrumb-t").textContent = mem().zoneLabel(L.area); }
    } else {
      net.cam = { k: 1, tx: 0, ty: 0 };
      netCamApply();
      if (crumb) crumb.hidden = true;
    }
  }

  /* ---------- search v grafe (dim + hot + center, debounce 120 ms) ---------- */
  var gqTimer = null;
  function netSearch(q) {
    clearTimeout(gqTimer);
    gqTimer = setTimeout(function () {
      var net = PM.net, host = $("#pm-net"), badge = $("#pm-gq-n");
      if (!net || !host) return;
      var fq = A.fold(q || "");
      netHi(null);
      if (!fq) { host.classList.remove("cx-dim"); if (badge) badge.hidden = true; Object.keys(net.el).forEach(function (k) { net.el[k].classList.remove("hot"); }); return; }
      host.classList.add("cx-dim");
      var hits = [];
      net.leaves.forEach(function (lf) {
        var on = A.fold(lf.name + " " + lf.node.dep.name + " " + lf.area.name).indexOf(fq) > -1;
        net.el[lf.id].classList.toggle("hot", on);
        if (on) hits.push(lf);
      });
      net.hubs.forEach(function (h) {
        var on = A.fold(h.name).indexOf(fq) > -1;
        net.el[h.id].classList.toggle("hot", on);
        if (on) hits.push(h);
      });
      if (badge) { badge.hidden = false; badge.textContent = F(hits.length, 0) + " zhôd"; }
      if (hits.length === 1) {
        /* center bez zoomu (Q50) */
        var c = PM.net.cam;
        c.tx = GW / 2 - hits[0].x * c.k; c.ty = GH / 2 - hits[0].y * c.k;
        netCamApply();
      }
    }, 120);
  }

  /* ---------- KPI rad siete (Hades) ---------- */
  function netKpi() {
    var host = $("#pm-gkpi"), net = PM.net; if (!host || !net) return;
    var deg = {};
    net.edges.forEach(function (e) { if (e.kind === "leaf" || e.kind === "bridge") { deg[e.a] = (deg[e.a] || 0) + 1; deg[e.b] = (deg[e.b] || 0) + 1; } });
    var per = {}, cnt = {};
    net.leaves.forEach(function (lf) { per[lf.area.k] = (per[lf.area.k] || 0) + (deg[lf.id] || 0); cnt[lf.area.k] = (cnt[lf.area.k] || 0) + 1; });
    var best = mem().AREAS.slice().sort(function (a, b) { return (per[b.k] || 0) / (cnt[b.k] || 1) - (per[a.k] || 0) / (cnt[a.k] || 1); })[0];
    var avg = net.leaves.length ? (net.edges.filter(function (e) { return e.kind !== "stem"; }).length * 2 / (net.leaves.length + net.hubs.length)) : 0;
    var items = [
      { l: "Uzly v sieti", v: F(net.leaves.length + net.hubs.length, 0), d: F(net.leaves.length, 0) + " poznatkov · " + F(net.hubs.length, 0) + " oddelení", fn: function () { A.detail("Uzly v sieti", "<dl><dt>Poznatky</dt><dd>" + F(net.leaves.length, 0) + "</dd><dt>Oddelenia (huby)</dt><dd>" + F(net.hubs.length, 0) + "</dd><dt>Jadrá lalokov</dt><dd>5</dd><dt>V podklade</dt><dd>" + F(mem().TOTAL_ALL, 0) + " uzlov</dd></dl><p class=\"note\">Sieť agreguje podkladovú pamäť do čitateľnej mapy — legenda počíta percentá z celku.</p>", []); } },
      { l: "Synapsie", v: F(net.edges.length, 0), d: F(net.edges.filter(function (e) { return e.kind === "bridge"; }).length, 0) + " mostov medzi lalokmi", fn: function () { A.detail("Synapsie", "<dl><dt>Kmene (jadro→oddelenie)</dt><dd>" + F(net.edges.filter(function (e) { return e.kind === "stem"; }).length, 0) + "</dd><dt>Listy (oddelenie→uzol)</dt><dd>" + F(net.edges.filter(function (e) { return e.kind === "leaf"; }).length, 0) + "</dd><dt>Vnútri laloku</dt><dd>" + F(net.edges.filter(function (e) { return e.kind === "intra"; }).length, 0) + "</dd><dt>Mosty (top 12 váhou)</dt><dd>" + F(net.edges.filter(function (e) { return e.kind === "bridge"; }).length, 0) + "</dd></dl>", []); } },
      { l: "Priem. spojení", v: F(avg, 1), d: "na uzol siete", fn: function () { A.detail("Priemer spojení", "<p>Každý uzol siete má v priemere <b class=\"num\">" + F(avg, 1) + "</b> spojení. Mosty medzi lalokmi sú obmedzené na 12 najsilnejších, aby graf ostal čitateľný.</p>", []); } },
      { l: "Najprepojenejšia", v: best ? best.name.split(" ")[0] : "—", d: best ? F((per[best.k] || 0) / (cnt[best.k] || 1), 1) + " spojení/uzol" : "", fn: function () { if (best) netFocusLobe(best.k); } }
    ];
    host.innerHTML = items.map(function (x, i) {
      return '<button class="kpi' + (i === 0 ? " tl" : "") + '" data-g="' + i + '"><span class="kl">' + esc(x.l) + '</span><b>' + esc(x.v) + '</b><span class="kd">' + esc(x.d) + "</span></button>";
    }).join("");
    $$("#pm-gkpi .kpi").forEach(function (b, i) { b.addEventListener("click", items[i].fn); });
  }

  /* ============================================================
     LEGENDA „Laloky a hustota" — pod grafom, klik zvýrazní lalok (Q9)
     ============================================================ */
  function legendRefresh() {
    var host = $("#pm-legend");
    if (!host) return;
    netBuild();
    var net = PM.net;
    var degPer = {}, cntPer = {};
    net.edges.forEach(function (e) {
      [e.a, e.b].forEach(function (id) {
        var it = net.byId[id]; if (!it) return;
        degPer[it.area.k] = (degPer[it.area.k] || 0) + 1;
      });
    });
    net.all.forEach(function (it) { cntPer[it.area.k] = (cntPer[it.area.k] || 0) + 1; });
    host.innerHTML = '<div class="glg-h"><b>Laloky a hustota</b><span class="note" style="margin:0">klik zvýrazní lalok · percentá z ' + F(mem().TOTAL_AREA, 0) + ' uzlov podkladu</span></div>' +
      '<div class="glg-row">' + mem().AREAS.map(function (a) {
        var on = PM.net && PM.net.legendHot === a.k;
        return '<button class="glg" data-lobe="' + a.k + '" aria-pressed="' + !!on + '">' +
          '<span class="fd" style="background:' + a.color + '"></span>' +
          "<span class=\"glg-t\"><b>" + esc(mem().zoneLabel(a)) + "</b>" +
          '<span class="num">' + F(cntPer[a.k] || 0, 0) + " v sieti · " + F(((degPer[a.k] || 0) / (cntPer[a.k] || 1)), 1) + " spojení/uzol · " + F((a.n / mem().TOTAL_AREA) * 100, 1) + " %</span></span></button>";
      }).join("") + "</div>";
    $$("#pm-legend .glg").forEach(function (b) {
      b.addEventListener("click", function () {
        var k = b.getAttribute("data-lobe");
        var net2 = PM.net;
        net2.legendHot = net2.legendHot === k ? null : k;
        var host2 = $("#pm-net");
        host2.classList.toggle("cx-dim", !!net2.legendHot);
        Object.keys(net2.el).forEach(function (id) {
          var it = net2.byId[id];
          net2.el[id].classList.toggle("hot", !!net2.legendHot && it.area.k === net2.legendHot);
        });
        net2.eel.forEach(function (ee) {
          var xa = net2.byId[ee.e.a], xb = net2.byId[ee.e.b];
          ee.el.classList.toggle("hot", !!net2.legendHot && ((xa && xa.area.k === net2.legendHot) || (xb && xb.area.k === net2.legendHot)));
        });
        legendRefresh();
      });
    });
  }

  /* kompletné prekreslenie siete (mount ak treba + štýl) */
  function netDraw() { netMount(); netStyle(); }

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
    /* zoznam je od v7 samostatná karta pod grafom — „zoznam" naň odscrolluje */
    if (view === "zoznam") {
      var lc = $("#pm-v-zoznam");
      if (lc) lc.scrollIntoView({ behavior: A.reduce ? "auto" : "smooth", block: "start" });
      redrawView();
      return;
    }
    PM.view = view;
    $$("#pm-views button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-view") === view)); });
    $("#pm-v-siet").hidden = view !== "siet";
    $("#pm-v-radial").hidden = view !== "radial";
    redrawView();
  }
  function redrawView() {
    if (PM.tab === "graf") {
      if (PM.view === "siet") netDraw();
      else { radCrumb(); radDraw(); }
    }
    zoznamRender(A.applySort($("#pm-tbl"), zoznamRows()));
    var lc = $("#pm-list-cnt");
    if (lc) lc.textContent = F(filteredNodes().length, 0) + " uzlov";
  }

  /* ------------------------------------------------------------
     Filtre UI ↔ stav
     ------------------------------------------------------------ */
  function applyFilterUI() {
    if (PM.net && PM.net.mounted) netStyle();
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
    $("#pm-tb-off").addEventListener("click", function () {
      PM.triageOff = true; triageBar();
      A.toast("Pripomeniem zajtra — uzly ostávajú na tabe Dnes", "ok", { undo: function () { PM.triageOff = false; triageBar(); } });
    });
  }

  /* zdroj zvončeka: nevybavený triage (Q74) */
  if (A.registerInbox) A.registerInbox("triage", "Triage — dnes pridané uzly", function () { return PM.triageOff ? 0 : mem().today().length; }, function () { A.go("pamat", "dnes"); });

  A.screens.pamat = {
    title: "Pamäť", group: "Pamäť",
    init: function () {
      kpiRefresh(); recentRefresh();
      netDraw(); legendRefresh(); redrawView();
      drawCharts();
      hlPresets(); hlSaved(); hlResults();

      /* KPI */
      $("#pm-k1").addEventListener("click", function () { A.go("pamat", "zoznam"); });
      $("#pm-k2").addEventListener("click", function () {
        A.detail("Rozdelenie uzlov", "<dl>" + mem().AREAS.map(function (a) {
          var c = mem().nodes().filter(function (n) { return n.area.k === a.k; }).length;
          return "<dt>" + esc(mem().zoneLabel(a)) + "</dt><dd>" + F(c, 0) + " uzlov</dd>";
        }).join("") + "<dt>Systémové jadrá</dt><dd>" + F(mem().CORE_NODES, 0) + "</dd></dl><p>Živá snímka z modelu Aura.mem.</p>", []);
      });
      $("#pm-k3").addEventListener("click", function () { A.go("pamat", "slabe"); });
      $("#pm-k4").addEventListener("click", function () { A.go("pamat", "dnes"); });

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
      $("#pm-tabs").addEventListener("click", function (e) {
        var b = e.target.closest("button[data-tab]"); if (!b) return;
        var t = b.getAttribute("data-tab");
        A.go("pamat", t === "graf" ? null : t);
        if (t === "graf") { switchTab("graf"); triageBar(); }
      });
      $("#pm-views").addEventListener("click", function (e) { var b = e.target.closest("button[data-view]"); if (b) switchView(b.getAttribute("data-view")); });

      /* sieť — vrstvy (len CSS/štýl, žiadny rebuild) */
      $("#pm-layers").addEventListener("click", function (e) {
        var b = e.target.closest("button[data-l]"); if (!b) return;
        PM.layer = b.getAttribute("data-l");
        $$("#pm-layers button").forEach(function (n) { n.setAttribute("aria-pressed", String(n === b)); });
        var ga = $("#pm-gapp");
        if (ga) {
          ga.hidden = PM.layer !== "app";
          if (PM.layer === "app" && !ga.options.length) {
            ga.innerHTML = A.apps.all().map(function (ap) { return '<option value="' + esc(ap.slug) + '">' + esc(ap.name) + "</option>"; }).join("");
          }
        }
        netStyle();
      });
      var gapp = $("#pm-gapp");
      if (gapp) gapp.addEventListener("change", netStyle);

      /* search v grafe */
      $("#pm-gq").addEventListener("input", function () { netSearch(this.value); });

      /* rozbaľovacie filtre */
      $("#pm-filt-toggle").addEventListener("click", function () { PM.filtOpen = !PM.filtOpen; syncFilterCollapse(); });
      syncFilterCollapse();

      /* breadcrumb návrat zo zoomu laloku */
      $("#pm-gback").addEventListener("click", function () { netFocusLobe(null); });

      /* mobil: graf na celú obrazovku */
      $("#pm-gfull").addEventListener("click", function () {
        var card = $("#pm-gcard"), on = !card.classList.contains("gfull");
        card.classList.toggle("gfull", on);
        this.setAttribute("aria-pressed", String(on));
        this.textContent = on ? "Zavrieť" : "Celá obrazovka";
        document.body.style.overflow = on ? "hidden" : "";
        if (w.AuraChart) setTimeout(w.AuraChart.reflowAll, 60);
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
      $("#pm-f-str").addEventListener("input", function () { PM.filter.strMin = +this.value / 100; $("#pm-f-strv").textContent = F(PM.filter.strMin, 2); shareFilter(); netStyle(); redrawView(); if (PM.tab === "hladanie") hlResults(); });
      $("#pm-f-per").addEventListener("change", function () { PM.filter.per = +this.value; applyFilterUI(); });
      $("#pm-reset").addEventListener("click", resetFilters);

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
      if (!sub) { if (PM.inited && PM.tab !== "graf") switchTab("graf"); return; }
      if (mem().byId(sub)) { mem().inspect(sub); return; }
      if (sub === "slabe" || sub === "weak") { presetWeak(); return; }
      if (sub === "cistenie" || sub === "cleanup") { switchTab("cistenie"); triageBar(); return; }
      if (sub === "zoznam") { switchTab("graf"); switchView("zoznam"); return; }
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
    A.go("pamat");
    mem().inspect(mem().newDraft());
    setTimeout(function () { var i = A.$("#ins-name"); if (i) { i.focus(); i.select(); } }, 120);
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
