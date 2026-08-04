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
    tab: "graf", view: "siet", layer: "all", gq: "",
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
      var ids = appFilterIds();
      if (ids && !ids[n.id]) return false;
    }
    return true;
  }
  function filteredNodes() { return mem().nodes().filter(passFilter); }


  /* ============================================================
     KPI + Naposledy / dnes
     ============================================================ */
  function kpiRefresh() {
    var ns = mem().nodes();
    A.count($("#pm-k1v"), ns.length + mem().CORE_NODES, 0);
    $("#pm-k1d").textContent = F(ns.length, 0) + " v oblastiach · " + F(mem().CORE_NODES, 0) + " jadier";
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
     SIEŤ v7.1 — Hades hierarchia: jadro laloku → oddelenie → poznatok
     Layout: phyllotaxis + kolízna relaxácia (deterministické, cache per podpis
     množiny uzlov; jadrá sú pevné prekážky). Menovky hubov: 8 kandidátskych
     kotiev skórovaných proti occupancy mape. Render: mount raz; filtre/vrstvy
     = CSS triedy; zvýraznenie má JEDINÉHO vlastníka (applyHighlight) — hover
     je dočasný a po odchode sa obnoví predchádzajúci zdroj (search/legenda).
     ============================================================ */
  var GW = 1160, GH = 620, GPAD = 46, GOLD_ANG = 2.39996;
  var LOBE_RX = 310, LOBE_RY = 176;

  function netSig() {
    return mem().nodes().map(function (n) { return n.id + ":" + n.dep.slug + ":" + n.type; }).join("|");
  }

  /* cache appkových id pre passFilter — O(1) na uzol namiesto O(n) */
  var _appIds = { slug: null, ids: null };
  function appFilterIds() {
    if (!PM.appFilter) return null;
    if (_appIds.slug !== PM.appFilter) {
      var app = A.apps.bySlug(PM.appFilter), ids = {};
      if (app) A.apps.nodes(app).forEach(function (x) { ids[x.id] = 1; });
      _appIds = { slug: PM.appFilter, ids: ids };
    }
    return _appIds.ids;
  }

  function leafShapeAttrs(t, x, y, r) {
    /* typ nesie tvar (rovnaký slovník ako typeIcon): skill △ · project ◇ · memory ○ */
    if (t === "skill") return { tag: "path", d: "M" + x + " " + (y - r * 1.16).toFixed(1) + " L" + (x + r * 1.06).toFixed(1) + " " + (y + r * 0.86).toFixed(1) + " L" + (x - r * 1.06).toFixed(1) + " " + (y + r * 0.86).toFixed(1) + " Z" };
    if (t === "project") return { tag: "path", d: "M" + x + " " + (y - r * 1.22).toFixed(1) + " L" + (x + r * 1.22).toFixed(1) + " " + y + " L" + x + " " + (y + r * 1.22).toFixed(1) + " L" + (x - r * 1.22).toFixed(1) + " " + y + " Z" };
    return { tag: "circle" };
  }
  function leafR(n) { return 3 + n.str * 5; }   /* Ø 6–16 */

  function netBuild() {
    var sig = netSig();
    if (PM.net && PM.net.sig === sig) return;
    var prev = PM.net;
    var areas = mem().AREAS, cx = GW / 2, cy = GH / 2;
    var lobes = {}, hubs = [], leaves = [], all = [], byId = {};

    var counts = {};
    areas.forEach(function (a) { counts[a.k] = mem().nodes().filter(function (n) { return n.area.k === a.k; }).length || 1; });
    var maxC = Math.max.apply(null, Object.keys(counts).map(function (k) { return counts[k]; }));

    areas.forEach(function (a, i) {
      var ang = -Math.PI / 2 + i * 2 * Math.PI / areas.length;
      var sc = 0.78 + 0.44 * Math.sqrt(counts[a.k] / maxC);
      lobes[a.k] = {
        k: a.k, area: a, ang: ang,
        x: cx + Math.cos(ang) * LOBE_RX, y: cy + Math.sin(ang) * LOBE_RY,
        rx: 195 * sc, ry: 130 * sc
      };
    });

    /* jadrá lalokov — pevné prekážky relaxácie, aby huby nesedeli pod nimi */
    Object.keys(lobes).forEach(function (k) {
      var L = lobes[k];
      var c = { id: "core-" + k, kind: "core", area: L.area, x: L.x, y: L.y, r: 22, fixed: true, name: L.area.name };
      all.push(c); byId[c.id] = c;
    });

    /* huby = oddelenia (24), phyllotaxis vnútri laloku */
    areas.forEach(function (a) {
      var L = lobes[a.k], m = a.deps.length;
      a.deps.forEach(function (d, j) {
        var ang = j * GOLD_ANG, rad = (L.rx * 0.62) * Math.sqrt((j + 0.55) / m);
        var h = {
          id: "hub-" + d.slug, kind: "hub", dep: d, area: a,
          x: L.x + Math.cos(ang) * rad, y: L.y + Math.sin(ang) * rad * 0.82,
          r: Math.max(10, 7 + Math.min(9, d.n / 9)), name: d.name
        };
        hubs.push(h); all.push(h); byId[h.id] = h;
      });
    });

    /* leafy = živé uzly pamäte, vejár okolo svojho hubu */
    var perHub = {};
    mem().nodes().forEach(function (n) {
      var hid = "hub-" + n.dep.slug; if (!byId[hid]) return;
      (perHub[hid] = perHub[hid] || { i: 0, n: 0 }).n++;
    });
    mem().nodes().forEach(function (n) {
      var hid = "hub-" + n.dep.slug, h = byId[hid]; if (!h) return;
      var k = perHub[hid], i = k.i++;
      var spread = Math.min(2.4, 0.9 + k.n * 0.34);
      var ang = Math.atan2(h.y - lobes[n.area.k].y, h.x - lobes[n.area.k].x) + (i - (k.n - 1) / 2) * (spread / Math.max(1, k.n));
      var rad = 24 + (h32(n.id) % 15);
      var lf = {
        id: n.id, kind: "leaf", node: n, hub: h, area: n.area,
        x: h.x + Math.cos(ang) * rad, y: h.y + Math.sin(ang) * rad * 0.85,
        r: leafR(n), name: n.name
      };
      leaves.push(lf); all.push(lf); byId[lf.id] = lf;
    });

    /* kolízna relaxácia: push-apart + pružina k domovu + hranice; jadrá pevné */
    all.forEach(function (n) { n.hx = n.x; n.hy = n.y; });
    for (var it = 0; it < 110; it++) {
      var moved = 0;
      for (var i = 0; i < all.length; i++) {
        for (var j = i + 1; j < all.length; j++) {
          var A1 = all[i], B = all[j];
          var pad = (A1.kind !== "leaf" || B.kind !== "leaf") ? 9 : 5;
          var dx = B.x - A1.x, dy = B.y - A1.y;
          var d = Math.sqrt(dx * dx + dy * dy) || 0.01, min = A1.r + B.r + pad;
          if (d < min) {
            var push = (min - d) / 2 * 0.55, ux = dx / d, uy = dy / d;
            if (A1.fixed) { B.x += ux * push * 2; B.y += uy * push * 2; }
            else if (B.fixed) { A1.x -= ux * push * 2; A1.y -= uy * push * 2; }
            else { A1.x -= ux * push; A1.y -= uy * push; B.x += ux * push; B.y += uy * push; }
            moved = Math.max(moved, push);
          }
        }
      }
      all.forEach(function (n) {
        if (n.fixed) return;
        n.x += (n.hx - n.x) * 0.08; n.y += (n.hy - n.y) * 0.08;
        n.x = clamp(n.x, GPAD + n.r, GW - GPAD - n.r);
        n.y = clamp(n.y, GPAD + n.r, GH - GPAD - n.r);
      });
      if (moved < 0.15) break;
    }
    all.forEach(function (n) { n.x = Math.round(n.x * 2) / 2; n.y = Math.round(n.y * 2) / 2; });

    /* obsahový bbox — clamp panu a „prispôsobiť pohľad" */
    var bb = { x0: GW, y0: GH, x1: 0, y1: 0 };
    all.forEach(function (n) {
      bb.x0 = Math.min(bb.x0, n.x - n.r); bb.y0 = Math.min(bb.y0, n.y - n.r);
      bb.x1 = Math.max(bb.x1, n.x + n.r); bb.y1 = Math.max(bb.y1, n.y + n.r);
    });

    /* ---------- menovky hubov: 8 kotiev, skóre proti kruhom a už umiestneným ---------- */
    function lblRect(x, y, wpx, anchor) {
      var x0 = anchor === "start" ? x : anchor === "end" ? x - wpx : x - wpx / 2;
      return { x: x0, y: y - 11, w: wpx, h: 13 };
    }
    function rectCircle(rc, c) {
      var nx = clamp(c.x, rc.x, rc.x + rc.w), ny = clamp(c.y, rc.y, rc.y + rc.h);
      var d = Math.hypot(c.x - nx, c.y - ny);
      return Math.max(0, c.r - d);
    }
    function rectRect(a, b) {
      var ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      var oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      return ox > 0 && oy > 0 ? Math.min(ox, oy) : 0;
    }
    var placed = [];
    hubs.slice().sort(function (a, b) { return b.r - a.r; }).forEach(function (h) {
      var wpx = h.name.length * 7.1 + 6;
      /* dva prstence kotiev — ak je blízke okolie obsadené vejárom leafov,
         menovka odskočí ďalej (vzdialenejšie kotvy majú vyššiu základnú cenu) */
      var CAND = [
        { dx: 0, dy: -(h.r + 7), a: "middle" },
        { dx: h.r + 6, dy: -h.r + 2, a: "start" },
        { dx: h.r + 8, dy: 4, a: "start" },
        { dx: h.r + 6, dy: h.r + 11, a: "start" },
        { dx: 0, dy: h.r + 15, a: "middle" },
        { dx: -(h.r + 6), dy: h.r + 11, a: "end" },
        { dx: -(h.r + 8), dy: 4, a: "end" },
        { dx: -(h.r + 6), dy: -h.r + 2, a: "end" },
        { dx: 0, dy: -(h.r + 20), a: "middle" },
        { dx: h.r + 18, dy: -h.r - 8, a: "start" },
        { dx: h.r + 21, dy: 4, a: "start" },
        { dx: h.r + 18, dy: h.r + 22, a: "start" },
        { dx: 0, dy: h.r + 28, a: "middle" },
        { dx: -(h.r + 18), dy: h.r + 22, a: "end" },
        { dx: -(h.r + 21), dy: 4, a: "end" },
        { dx: -(h.r + 18), dy: -h.r - 8, a: "end" }
      ];
      var best = null;
      CAND.forEach(function (c, ci) {
        var lx = h.x + c.dx, ly = h.y + c.dy;
        var rc = lblRect(lx, ly, wpx, c.a);
        var cost = ci * 0.4;                      /* mierne preferuj sever, potom po smere */
        for (var q = 0; q < all.length; q++) if (all[q] !== h) cost += rectCircle(rc, all[q]) * 2;
        for (var p = 0; p < placed.length; p++) cost += rectRect(rc, placed[p]) * 3;
        cost += Math.max(0, 4 - rc.x) * 2 + Math.max(0, rc.x + rc.w - (GW - 4)) * 2 +
                Math.max(0, 14 - rc.y) * 2 + Math.max(0, rc.y + rc.h - (GH - 4)) * 2;
        if (!best || cost < best.cost) best = { cost: cost, x: lx, y: ly, a: c.a, rc: rc };
      });
      h.lbl = best; placed.push(best.rc);
    });

    /* menovky leafov: greedy podľa sily — kolízia s kruhmi/menovkami = menovka sa nekreslí */
    var leafPlaced = [];
    leaves.slice().sort(function (a, b) { return b.node.str - a.node.str; }).forEach(function (lf) {
      var wpx = Math.min(lf.name.length, 26) * 6.6 + 6;
      var rc = lblRect(lf.x, lf.y - lf.r - 4, wpx, "middle");
      var bad = 0, q;
      for (q = 0; q < all.length && bad < 2; q++) if (all[q] !== lf) bad += rectCircle(rc, all[q]);
      for (q = 0; q < placed.length && bad < 2; q++) bad += rectRect(rc, placed[q]);
      for (q = 0; q < leafPlaced.length && bad < 2; q++) bad += rectRect(rc, leafPlaced[q]);
      lf.lblOk = bad < 2;
      if (lf.lblOk) leafPlaced.push(rc);
    });

    /* hrany: stem (jadro→hub) · leaf (hub→uzol) · intra (hub↔hub) · bridge
       (top 12 podľa reálnej váhy; max 2 konce na uzol; každý lalok ≥ 1 most) */
    var edges = [];
    hubs.forEach(function (h) { edges.push({ a: "core-" + h.area.k, b: h.id, kind: "stem", w: 1.6 }); });
    leaves.forEach(function (lf) { edges.push({ a: lf.hub.id, b: lf.id, kind: "leaf", w: 0.7 }); });
    areas.forEach(function (a) {
      var hs = hubs.filter(function (h) { return h.area.k === a.k; });
      hs.forEach(function (h, i) {
        if (i < hs.length - 1) edges.push({ a: h.id, b: hs[i + 1].id, kind: "intra", w: 1.1 });
      });
    });
    var cross = mem().edges()
      .filter(function (e) { var x = byId[e.a], y = byId[e.b]; return x && y && x.area.k !== y.area.k; })
      .sort(function (x, y) { return y.w - x.w; });
    var chosen = [], endC = {};
    function takeBridge(e) {
      chosen.push(e);
      endC[e.a] = (endC[e.a] || 0) + 1; endC[e.b] = (endC[e.b] || 0) + 1;
    }
    function capOk(e) { return (endC[e.a] || 0) < 2 && (endC[e.b] || 0) < 2; }
    areas.forEach(function (a) {
      for (var i = 0; i < cross.length; i++) {
        var e = cross[i];
        if (byId[e.a].area.k !== a.k && byId[e.b].area.k !== a.k) continue;
        if (chosen.indexOf(e) > -1) break;              /* lalok už pokrytý silnejším */
        if (!capOk(e)) continue;
        takeBridge(e); break;
      }
    });
    for (var ci2 = 0; ci2 < cross.length && chosen.length < 12; ci2++) {
      var e2 = cross[ci2];
      if (chosen.indexOf(e2) > -1 || !capOk(e2)) continue;
      takeBridge(e2);
    }
    chosen.forEach(function (e) { edges.push({ a: e.a, b: e.b, kind: "bridge", w: e.w }); });

    /* adjacency — hover sa dotkne len susedstva */
    var adj = {};
    edges.forEach(function (e, i) {
      (adj[e.a] = adj[e.a] || []).push(i);
      (adj[e.b] = adj[e.b] || []).push(i);
    });

    PM.net = {
      sig: sig, lobes: lobes, hubs: hubs, leaves: leaves, all: all, byId: byId,
      edges: edges, adj: adj, bb: bb, el: {}, lbl: {}, aur: {}, eel: [],
      hoverId: null, legendHot: prev ? prev.legendHot : null,
      camBefore: prev ? prev.camBefore : null,
      cam: { k: 1, tx: 0, ty: 0 },
      lobeFocus: prev ? prev.lobeFocus : null,
      deptFocus: prev && prev.deptFocus && prev.byId[prev.deptFocus] ? prev.deptFocus : null,
      mounted: false, seq: []
    };
    if (PM.net.deptFocus && !PM.net.byId[PM.net.deptFocus]) PM.net.deptFocus = null;
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
    mem().AREAS.forEach(function (a) {
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
      net.aur[k] = S("ellipse", { cx: L.x, cy: L.y, rx: L.rx, ry: L.ry, fill: "url(#pmg-" + k + ")", filter: "url(#pm-aurora)" }, gA);
    });

    /* hviezdny prach — deterministická hĺbková vrstva pod dátami */
    var gD = S("g", { class: "nt-dust", "aria-hidden": "true" }, cam);
    for (var di = 0; di < 90; di++) {
      var dh = h32("dust" + di);
      S("circle", {
        cx: (GPAD + (dh % 1000) / 1000 * (GW - GPAD * 2)).toFixed(1),
        cy: (GPAD + ((dh >>> 10) % 1000) / 1000 * (GH - GPAD * 2)).toFixed(1),
        r: (0.7 + ((dh >>> 20) % 10) / 11).toFixed(1),
        fill: "var(--ink-3)", opacity: (0.05 + ((dh >>> 14) % 9) / 100).toFixed(2)
      }, gD);
    }

    /* hrany */
    var gB = S("g", { class: "nt-bridgeg" }, cam);
    var gE = S("g", { class: "nt-syng" }, cam);
    net.eel = [];
    net.edges.forEach(function (e) {
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
          class: "nt-e nt-bridge flow", fill: "none",
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

    /* jadrá lalokov — prstenec + bodka (vizuálne odlíšené od hubov) */
    var gC = S("g", { class: "nt-core" }, cam);
    Object.keys(net.lobes).forEach(function (k) {
      var L = net.lobes[k], core = net.byId["core-" + k];
      S("circle", { cx: L.x, cy: L.y, r: 4.5, fill: L.area.color, class: "nt-cored", "aria-hidden": "true" }, gC);
      var c = S("circle", {
        cx: L.x, cy: L.y, r: core.r, fill: L.area.color, "fill-opacity": ".06",
        stroke: L.area.color, "stroke-width": 2, filter: "url(#pm-glow)",
        class: "nt-corec nt-n", tabindex: "-1", role: "button",
        "aria-label": "Jadro laloku " + L.area.name + " — klik priblíži oblasť"
      }, gC);
      net.el[core.id] = c; c.__nid = core.id;
      netBindNode(c, core);
    });

    /* uzly: huby + leafy */
    var gH = S("g", { class: "nt-hub" }, cam);
    net.hubs.forEach(function (h, i) {
      var g = S("g", { class: "nt-hubg", style: "--i:" + i }, gH);
      var c = S("circle", {
        cx: h.x, cy: h.y, r: h.r, fill: h.area.color, "fill-opacity": ".8",
        stroke: "var(--paper)", "stroke-width": 1, filter: "url(#pm-glow)",
        class: "cx-node nt-n", tabindex: "-1", role: "button",
        "aria-label": "Oddelenie " + h.name + " — klik priblíži oddelenie"
      }, g);
      net.el[h.id] = c; c.__nid = h.id;
      netBindNode(c, h);
      var t = S("text", { x: h.lbl.x, y: h.lbl.y, "text-anchor": h.lbl.a, class: "nt-hlbl" }, g);
      t.textContent = h.name;
      net.lbl[h.id] = t;
    });
    var gL = S("g", { class: "nt-leafg" }, cam);
    net.leaves.forEach(function (lf, i) {
      var n = lf.node;
      var sh = leafShapeAttrs(n.type, lf.x, lf.y, lf.r);
      var at = {
        fill: n.area.color, "fill-opacity": (0.4 + n.str * 0.55).toFixed(2),
        stroke: "var(--paper)", "stroke-width": n.pinned ? 1.4 : 0.5,
        class: "cx-node nt-n nt-lf", style: "--i:" + i,
        tabindex: "-1", role: "button",
        "aria-label": n.name + " — " + n.area.name + ", sila " + F(n.str, 2) + ", " + n.type
      };
      var c;
      if (sh.tag === "circle") { at.cx = lf.x; at.cy = lf.y; at.r = lf.r; c = S("circle", at, gL); }
      else { at.d = sh.d; c = S("path", at, gL); }
      if (n.today) S("circle", { cx: lf.x, cy: lf.y, r: lf.r + 2, class: "nt-halo", fill: "none", stroke: n.area.color, "aria-hidden": "true" }, gL);
      net.el[lf.id] = c; c.__nid = lf.id;
      netBindNode(c, lf);
    });

    /* menovky leafov — od zoomu 1,6×, len bez kolízie (.ok), zásahy vždy (.hotl) */
    var gT = S("g", { class: "nt-llbl-g", "aria-hidden": "true" }, cam);
    net.leaves.forEach(function (lf) {
      var t = S("text", { x: lf.x, y: lf.y - lf.r - 4, "text-anchor": "middle", class: "nt-llbl" + (lf.lblOk ? " ok" : "") }, gT);
      t.textContent = lf.name;
      net.lbl[lf.id] = t;
    });

    /* poradie pre klávesnicu: jadro → huby → leafy po lalokoch */
    net.seq = [];
    mem().AREAS.forEach(function (a) {
      net.seq.push("core-" + a.k);
      net.hubs.forEach(function (h) { if (h.area.k === a.k) net.seq.push(h.id); });
    });

    /* nábeh raz (len uzly — dash na 0,2-opacity hranách nebolo vidno) */
    if (!A.reduce && !host.__introDone) {
      host.classList.add("intro");
      host.__introDone = true;
      setTimeout(function () { host.classList.remove("intro"); }, 900);
    }

    netZoomBind(host);
    netCamApply(true);
    netFocusApply(!net.lobeFocus && !net.deptFocus);  /* obnov fokus po rebuildoch */
    netStyle();
    netKpi();
  }

  function netBindNode(el, item) {
    el.addEventListener("mouseenter", function (ev) { netHi(item.id); netTip(item, ev); });
    el.addEventListener("mouseleave", function () { netHi(null); netTipHide(); });
    el.addEventListener("focus", function () { netHi(item.id); netTip(item, null); });
    el.addEventListener("blur", function () { netHi(null); netTipHide(); });
    el.addEventListener("click", function () {
      netTipHide();
      if (item.kind === "leaf") { netHi(null); mem().inspect(item.node); }
      else if (item.kind === "hub") { netFocusDept(PM.net.deptFocus === item.id ? null : item.id); }
      else { netFocusLobe(PM.net.lobeFocus === item.area.k && !PM.net.deptFocus ? null : item.area.k); }
    });
    el.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); el.dispatchEvent(new MouseEvent("click")); }
    });
  }

  /* ---------- štýl vrstvy/filtra — žiadny rebuild, len triedy/atribúty ---------- */
  function netStyle() {
    var host = $("#pm-net"), net = PM.net; if (!host || !net) return;
    host.classList.toggle("z16", net.cam.k >= 1.6);
    var app = PM.layer === "app" && $("#pm-gapp") ? A.apps.bySlug($("#pm-gapp").value) : null;
    var layIds = {};
    if (app) A.apps.nodes(app).forEach(function (n) { layIds[n.id] = 1; });
    net.leaves.forEach(function (lf) {
      var n = lf.node, el = net.el[lf.id]; if (!el) return;
      el.setAttribute("fill", PM.layer === "type" ? typeColor(n.type) : n.area.color);
      el.setAttribute("fill-opacity", (0.4 + n.str * 0.55).toFixed(2));
      el.setAttribute("stroke-width", n.pinned ? 1.4 : 0.5);
      var r = leafR(n);
      if (Math.abs(r - lf.r) > 0.4) {
        lf.r = r;
        var sh = leafShapeAttrs(n.type, lf.x, lf.y, r);
        if (sh.tag === "circle") el.setAttribute("r", r); else el.setAttribute("d", sh.d);
      }
      var vis = passFilter(n);
      el.classList.toggle("flt-out", !vis);
      var off = false;
      if (PM.layer === "act") off = !(n.today || n.acts > 20);
      if (PM.layer === "app") off = !layIds[n.id];
      el.classList.toggle("lay-off", vis && off);
      var lb = net.lbl[lf.id]; if (lb) lb.classList.toggle("flt-out", !vis);
    });
    net.hubs.forEach(function (h) {
      var el = net.el[h.id]; if (!el) return;
      el.setAttribute("fill", PM.layer === "type" ? typeColor(h.dep.type) : h.area.color);
    });
    applyHighlight();
    netStatus();
    netMobileList();
  }

  /* ============================================================
     ZVÝRAZNENIE — jediný vlastník. Zdroje v poradí priority:
     hover (dočasný) → search → legenda. Fokus laloku/oddelenia je
     samostatný kanál (ctx-out), filter je samostatný kanál (flt-out).
     ============================================================ */
  function searchHits() {
    var net = PM.net, q = A.fold(PM.gq || "");
    if (!net || !q) return null;
    var leaves = [], hubs = [], hidden = 0;
    net.leaves.forEach(function (lf) {
      if (A.fold(lf.name + " " + lf.node.dep.name + " " + lf.area.name).indexOf(q) < 0) return;
      if (passFilter(lf.node)) leaves.push(lf.id); else hidden++;
    });
    net.hubs.forEach(function (h) { if (A.fold(h.name).indexOf(q) > -1) hubs.push(h.id); });
    return { leaves: leaves, hubs: hubs, hidden: hidden };
  }
  function legendMembers(key) {
    var net = PM.net, ids = [];
    var kind = key.slice(0, key.indexOf(":")), val = key.slice(key.indexOf(":") + 1);
    if (kind === "area") net.all.forEach(function (n) { if (n.area.k === val && n.kind !== "core") ids.push(n.id); });
    else if (kind === "type") net.leaves.forEach(function (lf) { if (lf.node.type === val) ids.push(lf.id); });
    else if (kind === "act") net.leaves.forEach(function (lf) { var on = lf.node.today || lf.node.acts > 20; if (on === (val === "on")) ids.push(lf.id); });
    else if (kind === "app") {
      var app = A.apps.bySlug(val), m = {};
      if (app) A.apps.nodes(app).forEach(function (n) { m[n.id] = 1; });
      net.leaves.forEach(function (lf) { if (m[lf.id]) ids.push(lf.id); });
    }
    return ids;
  }
  function hiMembers() {
    var net = PM.net; if (!net) return null;
    if (net.hoverId != null) {
      var nodes = [net.hoverId], edges = [];
      (net.adj[net.hoverId] || []).forEach(function (i) {
        var ee = net.eel[i]; if (!ee) return;
        edges.push(i);
        [ee.e.a, ee.e.b].forEach(function (k) { if (k !== net.hoverId && nodes.indexOf(k) < 0) nodes.push(k); });
      });
      return { src: "hover", nodes: nodes, edges: edges };
    }
    var sh = searchHits();
    if (sh) {
      var nodes2 = sh.leaves.concat(sh.hubs), set = {};
      nodes2.forEach(function (id) { set[id] = 1; });
      var edges2 = [];
      net.eel.forEach(function (ee, i) {
        var e = ee.e;
        if ((set[e.a] && set[e.b]) || (e.kind === "leaf" && (set[e.a] || set[e.b])) || (e.kind === "stem" && set[e.b])) edges2.push(i);
      });
      return { src: "search", nodes: nodes2, edges: edges2, hidden: sh.hidden };
    }
    if (net.legendHot) {
      var ids = legendMembers(net.legendHot), set3 = {};
      ids.forEach(function (id) { set3[id] = 1; });
      var edges3 = [];
      net.eel.forEach(function (ee, i) { if (set3[ee.e.a] || set3[ee.e.b]) edges3.push(i); });
      return { src: "legend", nodes: ids, edges: edges3 };
    }
    return null;
  }
  function applyHighlight() {
    var net = PM.net, host = $("#pm-net"); if (!net || !host || !net.mounted) return;
    var hi = hiMembers();
    host.classList.toggle("cx-dim", !!hi);
    var hot = {};
    if (hi) hi.nodes.forEach(function (id) { hot[id] = 1; });
    Object.keys(net.el).forEach(function (id) {
      net.el[id].classList.toggle("hot", !!hot[id]);
      var lb = net.lbl[id]; if (lb) lb.classList.toggle("hotl", !!hot[id]);
    });
    var hotE = {};
    if (hi) hi.edges.forEach(function (i) { hotE[i] = 1; });
    net.eel.forEach(function (ee, i) { ee.el.classList.toggle("hot", !!hotE[i]); });
  }

  /* hover cez adjacency — len nastaví zdroj, kreslí applyHighlight */
  function netHi(id) {
    var net = PM.net; if (!net) return;
    net.hoverId = id;
    applyHighlight();
  }

  /* ---------- bohatý HTML tooltip (120 ms; meraný a clampnutý do plátna) ---------- */
  var tipTimer = null;
  function netTip(item, ev) {
    var tip = $("#pm-gtip"); if (!tip) return;
    clearTimeout(tipTimer);
    tipTimer = setTimeout(function () {
      var html;
      if (item.kind === "core") {
        var liveA = mem().nodes().filter(function (n) { return n.area.k === item.area.k; }).length;
        html = "<b>" + esc(mem().zoneLabel(item.area)) + "</b>" +
          '<span class="gt-r">jadro laloku · ' + F(item.area.n, 0) + " uzlov v podklade · " + F(liveA, 0) + " v sieti</span>" +
          '<span class="gt-r gt-hint">klik priblíži lalok</span>';
      } else if (item.kind === "hub") {
        var liveN = mem().nodes().filter(function (n) { return n.dep.slug === item.dep.slug; }).length;
        html = "<b>" + esc(item.name) + "</b>" +
          '<span class="gt-r">' + esc(mem().zoneLabel(item.area)) + "</span>" +
          '<span class="gt-r">oddelenie · ' + F(item.dep.n, 0) + " uzlov v podklade · " + F(liveN, 0) + " v sieti</span>" +
          '<span class="gt-r gt-hint">klik priblíži oddelenie</span>';
      } else {
        var n = item.node, deg = mem().neighbors(n.id).length;
        html = "<b>" + esc(n.name) + "</b>" +
          '<span class="gt-r">' + mem().typeIcon(n.type) + " " + esc(n.type) + " · " + esc(mem().zoneLabel(n.area)) + " › " + esc(n.dep.name) + "</span>" +
          '<span class="gt-r num">sila ' + F(n.str, 2) + " · istota " + F(n.conf, 2) + " · " + F(deg, 0) + " súvisiacich uzlov</span>" +
          '<span class="gt-r gt-hint">klik otvorí inšpektor</span>';
      }
      tip.innerHTML = html;
      tip.hidden = false;
      var wrap = $("#pm-v-siet").getBoundingClientRect();
      var netR = $("#pm-net").getBoundingClientRect();
      var pt;
      if (ev && ev.clientX != null) pt = { x: ev.clientX, y: ev.clientY };
      else { var b = PM.net.el[item.id].getBoundingClientRect(); pt = { x: b.left + b.width / 2, y: b.top }; }
      var tw = tip.offsetWidth, th = tip.offsetHeight;
      var x = pt.x - wrap.left + 14, y = pt.y - wrap.top + 10;
      if (pt.x + 14 + tw > netR.right) x = pt.x - wrap.left - tw - 14;
      if (pt.y + 10 + th > netR.bottom) y = pt.y - wrap.top - th - 14;
      tip.style.left = clamp(x, 6, Math.max(6, wrap.width - tw - 6)) + "px";
      tip.style.top = clamp(y, 6, Math.max(6, wrap.height - th - 6)) + "px";
    }, 120);
  }
  function netTipHide() { clearTimeout(tipTimer); var t = $("#pm-gtip"); if (t) t.hidden = true; }

  /* ---------- kamera: zoom / pan / pinch cez jediný transform ---------- */
  function netCamApply(instant) {
    var net = PM.net, cam = document.getElementById("pm-cam"); if (!net || !cam) return;
    var c = net.cam;
    /* pan clamp — obsah nesmie celý opustiť viewport */
    if (net.bb) {
      c.tx = clamp(c.tx, 80 - net.bb.x1 * c.k, GW - 80 - net.bb.x0 * c.k);
      c.ty = clamp(c.ty, 80 - net.bb.y1 * c.k, GH - 80 - net.bb.y0 * c.k);
    }
    cam.setAttribute("transform", "translate(" + c.tx + " " + c.ty + ") scale(" + c.k + ")");
    var host = $("#pm-net");
    if (host) {
      host.classList.toggle("z16", c.k >= 1.6);
      host.style.setProperty("--gki", (1 / c.k).toFixed(4));   /* menovky proti-škálujú */
    }
    renderCrumb();
  }
  function netZoomTo(k, fx, fy) {
    var net = PM.net; if (!net) return;
    var c = net.cam;
    k = clamp(k, 0.8, 4);
    c.tx = fx - (fx - c.tx) * (k / c.k);
    c.ty = fy - (fy - c.ty) * (k / c.k);
    c.k = k;
    netCamApply();
  }
  function netFitTo(x0, y0, x1, y1, pad, maxK) {
    var net = PM.net; if (!net) return;
    pad = pad == null ? 40 : pad;
    var w0 = Math.max(40, x1 - x0 + pad * 2), h0 = Math.max(40, y1 - y0 + pad * 2);
    var k = clamp(Math.min(GW / w0, GH / h0), 0.8, maxK || 4);
    net.cam.k = k;
    net.cam.tx = GW / 2 - (x0 + x1) / 2 * k;
    net.cam.ty = GH / 2 - (y0 + y1) / 2 * k;
    netCamApply();
  }
  function netFitAll() {
    var net = PM.net; if (!net || !net.bb) return;
    netFitTo(net.bb.x0, net.bb.y0, net.bb.x1, net.bb.y1, 14);
  }
  /* fit na SKUTOČNÝ box (nie viewBox) — na výškovom telefóne by letterbox
     zmenšil mapu na ~0,37×; cielime kresliacu mierku ≥ 1,15 a nechávame pan */
  function netFitViewport() {
    var net = PM.net, host = $("#pm-net"); if (!net || !net.bb || !host) return;
    var r = host.getBoundingClientRect(); if (!r.width || !r.height) return;
    var base = Math.min(r.width / GW, r.height / GH);
    var kFit = Math.min(GW / (net.bb.x1 - net.bb.x0 + 28), GH / (net.bb.y1 - net.bb.y0 + 28));
    var k = clamp(Math.max(kFit, base > 0 ? 1.15 / base : 1), 0.8, 4);
    net.cam.k = k;
    net.cam.tx = GW / 2 - (net.bb.x0 + net.bb.x1) / 2 * k;
    net.cam.ty = GH / 2 - (net.bb.y0 + net.bb.y1) / 2 * k;
    netCamApply();
  }
  function netCenterOn(id, k) {
    var net = PM.net; if (!net) return;
    var n = net.byId[id]; if (!n) return;
    var kk = k || net.cam.k;
    net.cam.k = clamp(kk, 0.8, 4);
    net.cam.tx = GW / 2 - n.x * net.cam.k;
    net.cam.ty = GH / 2 - n.y * net.cam.k;
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
      if (ev.target.closest(".nt-n")) return;
      netHi(null); netTipHide();                     /* touch: ťuk mimo čistí zvýraznenie */
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
    /* roving klávesnica: šípky = súrodenci/rodič/dieťa, +/− = zoom */
    host.addEventListener("keydown", function (ev) { netKeyNav(ev); });
    host.addEventListener("focus", function () {
      var net = PM.net;
      if (net && document.activeElement === host) {
        var first = net.el[net.seq[0]]; if (first) first.focus();
      }
    });
  }

  /* ---------- klávesová navigácia v grafe ---------- */
  function netKeyNav(ev) {
    var net = PM.net; if (!net) return;
    if (ev.key === "+" || ev.key === "=") { ev.preventDefault(); netZoomTo(net.cam.k * 1.25, GW / 2, GH / 2); return; }
    if (ev.key === "-" || ev.key === "_") { ev.preventDefault(); netZoomTo(net.cam.k / 1.25, GW / 2, GH / 2); return; }
    if (["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown"].indexOf(ev.key) < 0) return;
    var cur = document.activeElement && document.activeElement.__nid;
    if (!cur || !net.byId[cur]) return;
    ev.preventDefault();
    var it = net.byId[cur], next = null;
    function sib(list, id, dir) {
      var i = list.indexOf(id);
      return list[(i + dir + list.length) % list.length];
    }
    if (ev.key === "ArrowDown") {
      if (it.kind === "core") { var h0 = net.hubs.filter(function (h) { return h.area.k === it.area.k; })[0]; next = h0 && h0.id; }
      else if (it.kind === "hub") { var l0 = net.leaves.filter(function (lf) { return lf.hub.id === it.id; })[0]; next = l0 && l0.id; }
    } else if (ev.key === "ArrowUp") {
      if (it.kind === "leaf") next = it.hub.id;
      else if (it.kind === "hub") next = "core-" + it.area.k;
    } else {
      var dir = ev.key === "ArrowRight" ? 1 : -1;
      if (it.kind === "core") next = sib(mem().AREAS.map(function (a) { return "core-" + a.k; }), it.id, dir);
      else if (it.kind === "hub") next = sib(net.hubs.filter(function (h) { return h.area.k === it.area.k; }).map(function (h) { return h.id; }), it.id, dir);
      else next = sib(net.leaves.filter(function (lf) { return lf.hub === it.hub; }).map(function (lf) { return lf.id; }), it.id, dir);
    }
    if (next && net.el[next]) net.el[next].focus();
  }

  /* ---------- breadcrumb — VŽDY derivovaný zo stavu, nikdy imperatívny ---------- */
  function renderCrumb() {
    var net = PM.net, crumb = $("#pm-gcrumb"); if (!crumb || !net) return;
    var t = "";
    if (net.deptFocus && net.byId[net.deptFocus]) {
      var h = net.byId[net.deptFocus];
      t = mem().ZONE_CODE[h.area.k] + " › " + h.name;
    } else if (net.lobeFocus) {
      var a = mem().areaByKey(net.lobeFocus);
      if (a) t = mem().zoneLabel(a);
    } else if (Math.abs(net.cam.k - 1) > 0.05 || Math.abs(net.cam.tx) > 4 || Math.abs(net.cam.ty) > 4) {
      t = "voľný zoom " + F(net.cam.k, 1) + "×";
    }
    crumb.hidden = !t;
    if (t) $("#pm-gcrumb-t").textContent = t;
  }

  /* ---------- semantický fokus: lalok aj oddelenie (fit-to-bbox + izolácia) ---------- */
  function netFocusLobe(k) {
    var net = PM.net; if (!net) return;
    net.lobeFocus = k; net.deptFocus = null;
    netFocusApply();
  }
  function netFocusDept(hubId) {
    var net = PM.net; if (!net) return;
    if (!hubId) { netFocusLobe(net.lobeFocus); return; }
    net.deptFocus = hubId;
    net.lobeFocus = net.byId[hubId].area.k;
    netFocusApply();
  }
  function netFocusApply(skipCam) {
    var net = PM.net, host = $("#pm-net"); if (!net || !host || !net.mounted) return;
    var inSet = null;
    if (net.deptFocus && net.byId[net.deptFocus]) {
      var h = net.byId[net.deptFocus];
      inSet = {}; inSet[h.id] = 1; inSet["core-" + h.area.k] = 1;
      net.leaves.forEach(function (lf) { if (lf.hub === h) inSet[lf.id] = 1; });
    } else if (net.lobeFocus) {
      inSet = {};
      net.all.forEach(function (n) { if (n.area.k === net.lobeFocus) inSet[n.id] = 1; });
    }
    host.classList.toggle("focused", !!inSet);
    host.classList.toggle("dfocus", !!net.deptFocus);

    /* vrstvový panel (štýl neurónovej vrstvy): stĺpec v ráme + orbity + zväzok
       kriviek. Deriované z fokusu — buduje sa nanovo pri každej zmene. */
    var camEl = document.getElementById("pm-cam");
    if (net.layerG && net.layerG.parentNode) net.layerG.parentNode.removeChild(net.layerG);
    net.layerG = null;
    net._fitBox = null;
    net.leaves.forEach(function (lf) {
      var el2 = net.el[lf.id];
      if (el2 && el2.style.transform) el2.style.transform = "";
    });
    net.eel.forEach(function (ee) { ee.el.classList.remove("fib", "fibhide"); });
    if (inSet && camEl) {
      var fx0 = 1e9, fy0 = 1e9, fx1 = -1e9, fy1 = -1e9;
      Object.keys(inSet).forEach(function (id) {
        var n2 = net.byId[id]; if (!n2) return;
        fx0 = Math.min(fx0, n2.x - n2.r); fy0 = Math.min(fy0, n2.y - n2.r);
        fx1 = Math.max(fx1, n2.x + n2.r); fy1 = Math.max(fy1, n2.y + n2.r);
      });
      var fArea = net.deptFocus ? net.byId[net.deptFocus].area : mem().areaByKey(net.lobeFocus);
      var acol = fArea ? fArea.color : "var(--teal)";
      var g = S("g", { class: "nt-layerg", "aria-hidden": "true" }, camEl);
      if (net.deptFocus) {
        var h2 = net.byId[net.deptFocus];
        var core2 = net.byId["core-" + h2.area.k];
        var lvs = net.leaves.filter(function (lf) { return lf.hub === h2; })
          .sort(function (a, b) { return b.node.str - a.node.str; });
        /* stĺpec na strane od hubu smerom do voľného priestoru */
        var right = h2.x < GW / 2;
        var colX = h2.x + (right ? 1 : -1) * Math.max(64, h2.r + 44);
        var step = 26, colH = (lvs.length - 1) * step;
        var y0 = clamp(h2.y - colH / 2, GPAD + 30, GH - GPAD - colH - 12);
        /* mená sú proti-škálované (konštantné px) → šírka rámu v jednotkách
           závisí od výslednej kamery; 3 iterácie konvergujú */
        var namePx = 0;
        lvs.forEach(function (lf) { namePx = Math.max(namePx, Math.min(lf.name.length, 26) * 6.9); });
        var numW = 30, k2 = 2.4, nmW, fr;
        for (var itk = 0; itk < 3; itk++) {
          nmW = 24 + namePx / k2;
          fr = right
            ? { x: colX - numW, y: y0 - 22, w: numW + nmW, h: colH + 44 }
            : { x: colX - nmW, y: y0 - 22, w: numW + nmW, h: colH + 44 };
          var ix0 = Math.min(fr.x, core2.x - core2.r) - 8, ix1 = Math.max(fr.x + fr.w, core2.x + core2.r) + 8;
          var iy0 = Math.min(fr.y - 34, core2.y - core2.r), iy1 = Math.max(fr.y + fr.h, core2.y + core2.r);
          k2 = clamp(Math.min(GW / (ix1 - ix0 + 72), GH / (iy1 - iy0 + 72)), 0.8, 2.8);
        }
        /* rám vrstvy + hlavička prisadená k hornej hrane */
        S("rect", { x: fr.x.toFixed(1), y: fr.y.toFixed(1), width: fr.w.toFixed(1), height: fr.h.toFixed(1), rx: 10, class: "nt-frame", stroke: acol }, g);
        var t1 = S("text", { x: (fr.x + 10).toFixed(1), y: (fr.y - 24).toFixed(1), "text-anchor": "start", class: "nt-flbl" }, g);
        t1.textContent = mem().ZONE_CODE[h2.area.k] + " › " + h2.name;
        var t2 = S("text", { x: (fr.x + 10).toFixed(1), y: (fr.y - 10).toFixed(1), "text-anchor": "start", class: "nt-flbl2 num" }, g);
        t2.textContent = F(lvs.length, 0) + " uzlov v sieti · " + F(h2.dep.n, 0) + " v podklade · [" + h2.dep.type + "]";
        /* veľký orbitálny prstenec okolo hub + rám */
        var rx0 = Math.min(h2.x - h2.r, fr.x), rx1 = Math.max(h2.x + h2.r, fr.x + fr.w);
        var ry0 = Math.min(h2.y - h2.r, fr.y), ry1 = Math.max(h2.y + h2.r, fr.y + fr.h);
        S("ellipse", {
          cx: ((rx0 + rx1) / 2).toFixed(1), cy: ((ry0 + ry1) / 2).toFixed(1),
          rx: ((rx1 - rx0) / 2 + 30).toFixed(1), ry: ((ry1 - ry0) / 2 + 26).toFixed(1),
          class: "nt-ring", stroke: acol
        }, g);
        /* pôvodné rovné hrany fokusu preč — nahradí ich zväzok kriviek */
        net.eel.forEach(function (ee) { if (inSet[ee.e.a] && inSet[ee.e.b]) ee.el.classList.add("fibhide"); });
        /* jadro → hub */
        S("path", {
          d: "M" + core2.x + " " + core2.y + " Q" + ((core2.x + h2.x) / 2).toFixed(1) + " " + ((core2.y + h2.y) / 2 - 18).toFixed(1) + " " + h2.x + " " + h2.y,
          class: "nt-fib", stroke: acol, fill: "none"
        }, g);
        /* uzly do stĺpca (CSS transition), orbity + čísla + mená + krivky */
        lvs.forEach(function (lf, i) {
          var ny = y0 + i * step;
          var el2 = net.el[lf.id];
          if (el2) el2.style.transform = "translate(" + (colX - lf.x).toFixed(1) + "px," + (ny - lf.y).toFixed(1) + "px)";
          S("ellipse", { cx: colX, cy: ny, rx: (lf.r + 5.5).toFixed(1), ry: (lf.r + 3.5).toFixed(1), class: "nt-orb", stroke: acol }, g);
          S("ellipse", { cx: colX, cy: ny, rx: (lf.r + 9.5).toFixed(1), ry: (lf.r + 6).toFixed(1), class: "nt-orb o2", stroke: acol }, g);
          var ti = S("text", { x: (colX + (right ? -1 : 1) * (lf.r + 14)).toFixed(1), y: (ny + 4).toFixed(1), "text-anchor": right ? "end" : "start", class: "nt-idx num" }, g);
          ti.textContent = String(i + 1);
          var tn = S("text", { x: (colX + (right ? 1 : -1) * (lf.r + 15)).toFixed(1), y: (ny + 4).toFixed(1), "text-anchor": right ? "start" : "end", class: "nt-flbl2" }, g);
          tn.textContent = lf.name;
          /* zväzok: vejár quadratic kriviek od hrany hubu → uzol stĺpca */
          var bow = (i - (lvs.length - 1) / 2) * 9 + (right ? -14 : 14);
          var sx = h2.x + (right ? 1 : -1) * (h2.r + 1);
          S("path", {
            d: "M" + sx.toFixed(1) + " " + h2.y + " Q" + ((sx + colX) / 2).toFixed(1) + " " + (((h2.y + ny) / 2) + bow).toFixed(1) + " " + (colX + (right ? -(lf.r + 4) : lf.r + 4)).toFixed(1) + " " + ny,
            class: "nt-fib", stroke: acol, fill: "none"
          }, g);
        });
        /* kamera: fit na rám ∪ hub ∪ jadro */
        net._fitBox = {
          x0: Math.min(fr.x, core2.x - core2.r) - 8, y0: Math.min(fr.y - 34, core2.y - core2.r),
          x1: Math.max(fr.x + fr.w, core2.x + core2.r) + 8, y1: Math.max(fr.y + fr.h, core2.y + core2.r)
        };
      } else {
        /* fokus laloku: len veľký prstenec */
        S("ellipse", {
          cx: ((fx0 + fx1) / 2).toFixed(1), cy: ((fy0 + fy1) / 2).toFixed(1),
          rx: ((fx1 - fx0) / 2 + 26).toFixed(1), ry: ((fy1 - fy0) / 2 + 22).toFixed(1),
          class: "nt-ring", stroke: acol
        }, g);
      }
      net.layerG = g;
    }
    net.all.forEach(function (n) {
      var el = net.el[n.id]; if (!el) return;
      var out = !!inSet && !inSet[n.id];
      el.classList.toggle("ctx-out", out);
      var lb = net.lbl[n.id]; if (lb) lb.classList.toggle("ctx-out", out);
    });
    net.eel.forEach(function (ee) {
      var on = !inSet || (inSet[ee.e.a] && inSet[ee.e.b]);
      ee.el.classList.toggle("ctx-out", !on);
    });
    Object.keys(net.aur).forEach(function (k2) {
      var focusK = net.deptFocus && net.byId[net.deptFocus] ? net.byId[net.deptFocus].area.k : net.lobeFocus;
      net.aur[k2].classList.toggle("ctx-out", !!inSet && focusK !== k2);
    });
    if (!skipCam) {
      if (inSet && net._fitBox) {
        netFitTo(net._fitBox.x0, net._fitBox.y0, net._fitBox.x1, net._fitBox.y1, 36, 2.8);
      } else if (inSet) {
        var xs = [], ys = [];
        Object.keys(inSet).forEach(function (id) {
          var n = net.byId[id]; if (!n) return;
          xs.push(n.x - n.r, n.x + n.r); ys.push(n.y - n.r, n.y + n.r);
        });
        netFitTo(Math.min.apply(null, xs), Math.min.apply(null, ys),
                 Math.max.apply(null, xs), Math.max.apply(null, ys), 34, 2.2);
      } else {
        net.cam = { k: 1, tx: 0, ty: 0 };
        netCamApply();
      }
    }
    renderCrumb();
  }

  /* ---------- Esc reťaz — jedna úroveň na stlačenie (capture pred shellom) ---------- */
  function pmEscStep() {
    var card = $("#pm-gcard");
    if (card && card.classList.contains("gfull")) { gfullSet(false); return true; }
    var net = PM.net; if (!net) return false;
    if (net.deptFocus) { netFocusLobe(net.lobeFocus); return true; }
    if (net.lobeFocus) { netFocusLobe(null); return true; }
    if (net.cam.k !== 1 || net.cam.tx || net.cam.ty) { net.cam = { k: 1, tx: 0, ty: 0 }; netCamApply(); return true; }
    return false;
  }
  document.addEventListener("keydown", function (ev) {
    if (ev.key !== "Escape" || A.state.screen !== "pamat") return;
    /* overlaye shellu (cmdk/confirm/peek/drawer) majú prednosť */
    if ($("#cmdk").classList.contains("on") || $("#confirm").classList.contains("on") ||
        $("#dp").classList.contains("on") || $("#side").classList.contains("open")) return;
    if (ev.target && (ev.target.id === "pm-gq" || ev.target.id === "pm-hl-q" || ev.target.id === "pm-home-q") && ev.target.value) return;
    if (pmEscStep()) ev.stopPropagation();
  }, true);

  /* ---------- fullscreen (Esc zatvára, mobil auto-fit) ---------- */
  function gfullSet(on) {
    var card = $("#pm-gcard"), btn = $("#pm-gfull");
    if (!card || !btn) return;
    card.classList.toggle("gfull", on);
    if (on) { card.setAttribute("role", "dialog"); card.setAttribute("aria-modal", "true"); }
    else { card.removeAttribute("role"); card.removeAttribute("aria-modal"); }
    btn.setAttribute("aria-pressed", String(on));
    btn.textContent = on ? "Zavrieť" : "Celá obrazovka";
    document.body.style.overflow = on ? "hidden" : "";
    if (on) { netDraw(); setTimeout(netFitViewport, 60); btn.focus(); }
    else if (PM.net) { PM.net.cam = { k: 1, tx: 0, ty: 0 }; netCamApply(); }
    if (w.AuraChart) setTimeout(w.AuraChart.reflowAll, 60);
  }

  /* ---------- search v grafe: v rámci filtra, pásik zhôd, návrat kamery ---------- */
  var gqTimer = null;
  function netSearch(q) {
    clearTimeout(gqTimer);
    gqTimer = setTimeout(function () {
      var net = PM.net; if (!net) return;
      var was = PM.gq;
      PM.gq = (q || "").trim();
      if (PM.gq && !was) net.camBefore = { k: net.cam.k, tx: net.cam.tx, ty: net.cam.ty };
      if (!PM.gq && was && net.camBefore) { net.cam = net.camBefore; net.camBefore = null; netCamApply(); }
      applyHighlight();
      netHits();
      netStatus();
    }, 120);
  }
  function plural(n, one, few, many) { return n === 1 ? one : (n >= 2 && n <= 4 ? few : many); }
  function netHits() {
    var net = PM.net, badge = $("#pm-gq-n"), strip = $("#pm-ghits");
    if (!net || !badge || !strip) return;
    var sh = searchHits();
    if (!sh) { badge.hidden = true; strip.hidden = true; strip.innerHTML = ""; return; }
    var n = sh.leaves.length;
    badge.hidden = false;
    badge.textContent = F(n, 0) + " " + plural(n, "zhoda", "zhody", "zhôd");
    var html = "";
    if (!n && !sh.hidden) {
      html = '<span class="note" style="margin:0">Nič sa nenašlo.</span><button class="btn ghost sm" data-ghx="clear">Vyčistiť hľadanie</button>';
    } else {
      html = sh.leaves.slice(0, 8).map(function (id) {
        var it = net.byId[id];
        return '<button class="ghit" data-ghit="' + esc(id) + '"><span class="fd" style="background:' + it.area.color + '"></span>' + esc(it.name) + "</button>";
      }).join("");
      if (n > 8) html += '<span class="note" style="margin:0">+ ' + F(n - 8, 0) + " ďalších</span>";
      if (n > 0) html += '<button class="btn ghost sm" data-ghx="list">Zobraziť ako zoznam →</button>';
      if (sh.hidden) html += '<button class="btn ghost sm" data-ghx="filters">' + F(sh.hidden, 0) + " " + plural(sh.hidden, "zhoda skrytá", "zhody skryté", "zhôd skrytých") + " filtrom — zrušiť filtre</button>";
    }
    strip.hidden = false;
    strip.innerHTML = html;
    /* kamera: 1 zásah = center, 2–8 = fit na zásahy */
    if (n === 1) netCenterOn(sh.leaves[0]);
    else if (n >= 2 && n <= 8) {
      var xs = [], ys = [];
      sh.leaves.forEach(function (id) { var it = net.byId[id]; xs.push(it.x - it.r, it.x + it.r); ys.push(it.y - it.r, it.y + it.r); });
      netFitTo(Math.min.apply(null, xs), Math.min.apply(null, ys), Math.max.apply(null, xs), Math.max.apply(null, ys), 80);
    }
  }

  /* ---------- stavový riadok: poctivé počítadlo + chipy obmedzení ---------- */
  function activeFiltCount() {
    var f = PM.filter, n = 0;
    if (f.area) n++; if (f.type) n++; if (f.strMin) n++; if (f.per) n++;
    if (PM.weakOnly) n++; if (PM.appFilter) n++;
    return n;
  }
  function netStatus() {
    var net = PM.net, host = $("#pm-gchips"); if (!net || !host) return;
    var shown = net.leaves.filter(function (lf) { return passFilter(lf.node); }).length;
    var hi = hiMembers();
    var parts = [];
    if (hi && hi.src !== "hover") {
      var hotLeaves = hi.nodes.filter(function (id) { var it = net.byId[id]; return it && it.kind === "leaf"; }).length;
      parts.push(F(hotLeaves, 0) + " zvýraznených");
    }
    parts.push(F(shown, 0) + " / " + F(net.leaves.length, 0) + " uzlov");
    parts.push(F(net.edges.length, 0) + " synapsií");
    var chips = [];
    if (PM.layer === "type") chips.push({ l: "vrstva: typy uzlov", x: "layer" });
    if (PM.layer === "act") chips.push({ l: "vrstva: aktívne dnes alebo > 20×", x: "layer" });
    if (PM.layer === "app") {
      var ga = $("#pm-gapp"), ap = ga && A.apps.bySlug(ga.value);
      chips.push({ l: "vrstva: appka " + (ap ? ap.name : "—"), x: "layer" });
    }
    if (PM.gq) chips.push({ l: "hľadanie: „" + PM.gq + "“", x: "search" });
    if (net.legendHot) chips.push({ l: "legenda: " + legendHotLabel(net.legendHot), x: "legend" });
    var fc = activeFiltCount();
    if (fc) chips.push({ l: "filtre: " + F(fc, 0) + " " + plural(fc, "aktívny", "aktívne", "aktívnych"), x: "filters" });
    var camOff = net.lobeFocus || net.deptFocus || net.cam.k !== 1 || net.cam.tx || net.cam.ty;
    host.innerHTML = '<span class="tag num gcnt" id="pm-net-cnt">' + parts.join(" · ") + "</span>" +
      chips.map(function (c) {
        return '<button class="gchip" data-gx="' + c.x + '">' + esc(c.l) + ' <span aria-hidden="true">✕</span></button>';
      }).join("") +
      ((chips.length || camOff) ? '<button class="btn ghost sm" data-gx="all">Vyčistiť pohľad</button>' : "");
  }
  function legendHotLabel(key) {
    var kind = key.slice(0, key.indexOf(":")), val = key.slice(key.indexOf(":") + 1);
    if (kind === "area") { var a = mem().areaByKey(val); return a ? mem().zoneLabel(a) : val; }
    if (kind === "type") return val;
    if (kind === "act") return val === "on" ? "aktívne" : "spiace";
    if (kind === "app") { var ap = A.apps.bySlug(val); return "appka " + (ap ? ap.name : val); }
    return val;
  }
  function clearGx(x) {
    var net = PM.net;
    if (x === "layer" || x === "all") setLayer("all");
    if (x === "search" || x === "all") { PM.gq = ""; var i = $("#pm-gq"); if (i) i.value = ""; if (net) net.camBefore = null; netHits(); }
    if (x === "legend" || x === "all") { if (net) net.legendHot = null; legendRefresh(); }
    if (x === "filters" || x === "all") { resetFilters(); return; }   /* resetFilters volá applyFilterUI */
    if (x === "all" && net) { net.lobeFocus = null; net.deptFocus = null; netFocusApply(); }
    netStyle();
  }

  /* ---------- vrstvy ---------- */
  function setLayer(l) {
    PM.layer = l;
    $$("#pm-layers button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-l") === l)); });
    var ga = $("#pm-gapp");
    if (ga) {
      ga.hidden = l !== "app";
      if (l === "app") gappFill();
    }
    netStyle();
    legendRefresh();
  }
  function gappFill() {
    var ga = $("#pm-gapp"); if (!ga) return;
    var cur = ga.value;
    ga.innerHTML = A.apps.all().map(function (ap) { return '<option value="' + esc(ap.slug) + '">' + esc(ap.name) + "</option>"; }).join("");
    if (cur && A.apps.bySlug(cur)) ga.value = cur;
  }

  /* ---------- KPI rad siete (Hades) — všetko z degreeStats ---------- */
  function degreeStats() {
    netBuild();
    var net = PM.net, deg = {}, cnt = {}, totD = 0, totC = 0;
    net.edges.forEach(function (e) {
      if (e.kind === "stem") return;
      [e.a, e.b].forEach(function (id) {
        var it = net.byId[id];
        if (it && it.kind !== "core") { deg[it.area.k] = (deg[it.area.k] || 0) + 1; totD++; }
      });
    });
    net.all.forEach(function (it) { if (it.kind !== "core") { cnt[it.area.k] = (cnt[it.area.k] || 0) + 1; totC++; } });
    return { deg: deg, cnt: cnt, avg: totC ? totD / totC : 0 };
  }
  function netKpi() {
    var host = $("#pm-gkpi"), net = PM.net; if (!host || !net) return;
    var st = degreeStats();
    var best = mem().AREAS.slice().sort(function (a, b) {
      return (st.deg[b.k] || 0) / (st.cnt[b.k] || 1) - (st.deg[a.k] || 0) / (st.cnt[a.k] || 1);
    })[0];
    var items = [
      { l: "Uzly v sieti", v: F(net.leaves.length + net.hubs.length, 0), d: F(net.leaves.length, 0) + " satelitov · " + F(net.hubs.length, 0) + " oddelení", fn: function () { A.detail("Uzly v sieti", "<dl><dt>Satelity (poznatky)</dt><dd>" + F(net.leaves.length, 0) + "</dd><dt>Oddelenia (huby)</dt><dd>" + F(net.hubs.length, 0) + "</dd><dt>Jadrá lalokov</dt><dd>" + F(mem().CORE_NODES, 0) + "</dd><dt>V podklade</dt><dd>" + F(mem().TOTAL_ALL, 0) + " uzlov</dd></dl><p class=\"note\">Sieť je mapa " + F(net.leaves.length, 0) + " reprezentantov z " + F(mem().TOTAL_AREA, 0) + " uzlov podkladu — legenda počíta percentá z podkladu.</p>", []); } },
      { l: "Synapsie", v: F(net.edges.length, 0), d: F(net.edges.filter(function (e) { return e.kind === "bridge"; }).length, 0) + " mostov medzi lalokmi", fn: function () { A.detail("Synapsie", "<dl><dt>Kmene (jadro→oddelenie)</dt><dd>" + F(net.edges.filter(function (e) { return e.kind === "stem"; }).length, 0) + "</dd><dt>Listy (oddelenie→uzol)</dt><dd>" + F(net.edges.filter(function (e) { return e.kind === "leaf"; }).length, 0) + "</dd><dt>Vnútri laloku</dt><dd>" + F(net.edges.filter(function (e) { return e.kind === "intra"; }).length, 0) + "</dd><dt>Mosty (top 12 váhou)</dt><dd>" + F(net.edges.filter(function (e) { return e.kind === "bridge"; }).length, 0) + "</dd></dl><p class=\"note\">Mosty sa vyberajú podľa váhy synapsie, najviac 2 na uzol a aspoň 1 na lalok.</p>", []); } },
      { l: "Priem. spojení", v: F(st.avg, 1), d: "na uzol siete (bez kmeňov)", fn: function () { A.detail("Priemer spojení", "<p>Každý uzol siete (satelit alebo oddelenie) má v priemere <b class=\"num\">" + F(st.avg, 1) + "</b> spojení. Rovnaká metrika platí v legende aj v grafe hustoty. Mosty medzi lalokmi sú obmedzené na 12 najsilnejších, aby mapa ostala čitateľná.</p>", []); } },
      { l: "Najprepojenejšia", v: best ? best.name.split(" ")[0] : "—", d: best ? F((st.deg[best.k] || 0) / (st.cnt[best.k] || 1), 1) + " spojení/uzol" : "", fn: function () { if (best) { netFocusLobe(best.k); var g = $("#pm-gcard"); if (g) g.scrollIntoView({ behavior: A.reduce ? "auto" : "smooth", block: "nearest" }); } } }
    ];
    host.innerHTML = items.map(function (x, i) {
      return '<button class="kpi' + (i === 0 ? " tl" : "") + '" data-g="' + i + '"><span class="kl">' + esc(x.l) + '</span><b>' + esc(x.v) + '</b><span class="kd">' + esc(x.d) + "</span></button>";
    }).join("");
    $$("#pm-gkpi .kpi").forEach(function (b, i) { b.addEventListener("click", items[i].fn); });
  }

  /* ============================================================
     LEGENDA — layer-aware: laloky / typy / aktivita / appky. Klik zvýrazní.
     ============================================================ */
  function legendRefresh() {
    var host = $("#pm-legend");
    if (!host) return;
    netBuild();
    var net = PM.net, st = degreeStats();
    var rows, head, sub;
    function row(key, color, title, statHtml, iconHtml) {
      var on = net.legendHot === key;
      return '<button class="glg" data-lkey="' + esc(key) + '" aria-pressed="' + on + '">' +
        (iconHtml || '<span class="fd" style="background:' + color + '"></span>') +
        '<span class="glg-t"><b>' + title + "</b>" +
        '<span class="num">' + statHtml + "</span></span></button>";
    }
    if (PM.layer === "type") {
      head = "Typy uzlov"; sub = "klik zvýrazní typ · tvar nesie typ aj v mape";
      rows = ["skill", "project", "memory"].map(function (t) {
        var c = net.leaves.filter(function (lf) { return lf.node.type === t; }).length;
        return row("type:" + t, typeColor(t), esc(t),
          F(c, 0) + " uzlov v sieti",
          '<span style="color:' + typeColor(t) + ';display:inline-flex;margin-top:3px" aria-hidden="true">' + mem().typeIcon(t) + "</span>");
      });
    } else if (PM.layer === "act") {
      head = "Aktivita"; sub = "aktívne = dnes alebo viac než 20 aktivácií za 30 dní";
      var actN = net.leaves.filter(function (lf) { return lf.node.today || lf.node.acts > 20; }).length;
      rows = [
        row("act:on", "var(--teal)", "Aktívne", F(actN, 0) + " uzlov v sieti"),
        row("act:off", "var(--ink-3)", "Spiace", F(net.leaves.length - actN, 0) + " uzlov v sieti")
      ];
    } else if (PM.layer === "app") {
      head = "Appky"; sub = "klik zvýrazní uzly, z ktorých appka číta";
      rows = A.apps.all().map(function (ap) {
        return row("app:" + ap.slug, "var(--gold)", esc(ap.name), F(A.apps.nodes(ap).length, 0) + " uzlov");
      });
    } else {
      head = "Laloky a hustota"; sub = "klik zvýrazní lalok · percentá z " + F(mem().TOTAL_AREA, 0) + " uzlov podkladu";
      rows = mem().AREAS.map(function (a) {
        /* nbsp vnútri tokenov — zalomí sa len medzi metrikami, nie uprostred čísla */
        return row("area:" + a.k, a.color, esc(mem().zoneLabel(a)),
          F(st.cnt[a.k] || 0, 0) + NB + "v" + NB + "sieti · " + F((st.deg[a.k] || 0) / (st.cnt[a.k] || 1), 1) + NB + "spojení/uzol · " + F((a.n / mem().TOTAL_AREA) * 100, 1) + NB + "%");
      });
    }
    host.innerHTML = '<div class="glg-h"><b>' + head + '</b><span class="note" style="margin:0">' + sub + "</span></div>" +
      '<div class="glg-row">' + rows.join("") + "</div>";
    $$("#pm-legend .glg").forEach(function (b) {
      b.addEventListener("click", function () {
        var key = b.getAttribute("data-lkey");
        net.legendHot = net.legendHot === key ? null : key;
        /* highlight kreslí applyHighlight; na mobile filtruje zoznam */
        applyHighlight(); netStatus(); netMobileList();
        $$("#pm-legend .glg").forEach(function (x) { x.setAttribute("aria-pressed", String(x.getAttribute("data-lkey") === net.legendHot)); });
        if (PM.view === "radial") radDraw();
      });
    });
  }

  /* kompletné prekreslenie siete (mount ak treba + štýl) */
  function netDraw() { netMount(); netStyle(); }

  /* Mobilný zoznam = plnohodnotná náhrada grafu: oblasť → oddelenie → uzol.
     Legenda na mobile filtruje tento zoznam (chip = sekcia). */
  function netMobileList() {
    var host = $("#pm-net-list"); if (!host) return;
    var all = mem().nodes();
    var legendArea = null;
    var lh = PM.net && PM.net.legendHot;
    if (lh && lh.indexOf("area:") === 0) legendArea = lh.slice(5);
    host.innerHTML = mem().AREAS.filter(function (a) { return !legendArea || a.k === legendArea; }).map(function (a) {
      var live = all.filter(function (n) { return n.area.k === a.k && passFilter(n); });
      var byDep = {};
      live.forEach(function (n) { (byDep[n.dep.slug] = byDep[n.dep.slug] || { dep: n.dep, list: [] }).list.push(n); });
      var deps = a.deps.map(function (d) { return byDep[d.slug]; }).filter(Boolean);
      var open = PM.filter.area === a.k || !!legendArea;
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
      if (el) { netCenterOn(id, Math.max(PM.net.cam.k, 1.8)); el.focus(); }
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
    var svg = S("svg", { viewBox: "0 0 " + W + " " + H, width: "100%", role: "img", class: "ach-svg", style: "height:auto;max-height:66vh" }, host);
    S("title", {}, svg).textContent = "Radiálna hierarchia pamäti — " + $("#pm-rad-crumb").textContent;

    /* rovnaká mierka na každej úrovni: bublina = počet uzlov PO filtri */
    var legendArea = PM.net && PM.net.legendHot && PM.net.legendHot.indexOf("area:") === 0 ? PM.net.legendHot.slice(5) : null;
    var items, centerLabel, centerSub, centerColor, R;
    if (PM.rad.level === 0) {
      items = mem().AREAS.map(function (a) {
        var live = mem().nodes().filter(function (n) { return n.area.k === a.k && radMatch(n); });
        return { kind: "area", ref: a, label: a.name, count: live.length, color: a.color, on: (!PM.filter.area || PM.filter.area === a.k) && (!legendArea || legendArea === a.k) };
      });
      centerLabel = "HADES"; centerSub = F(filteredNodes().length, 0) + " uzlov"; centerColor = "var(--gold)"; R = 166;
    } else if (PM.rad.level === 1) {
      items = PM.rad.area.deps.map(function (d) {
        var live = mem().nodes().filter(function (n) { return n.dep.slug === d.slug && radMatch(n); });
        return { kind: "dep", ref: d, label: d.name, count: live.length, color: PM.rad.area.color, on: live.length > 0 };
      });
      var liveA = mem().nodes().filter(function (n) { return n.area.k === PM.rad.area.k && radMatch(n); });
      centerLabel = PM.rad.area.name; centerSub = F(liveA.length, 0) + " uzlov"; centerColor = PM.rad.area.color; R = 172;
    } else {
      var live2 = mem().nodes().filter(function (n) { return n.dep.slug === PM.rad.dep.slug; });
      items = live2.map(function (n) { return { kind: "node", ref: n, label: n.name, count: 1, acts: n.acts, str: n.str, color: PM.rad.area.color, on: radMatch(n) }; });
      centerLabel = PM.rad.dep.name; centerSub = F(live2.filter(radMatch).length, 0) + " uzlov"; centerColor = PM.rad.area.color; R = 160;
    }
    var maxC = Math.max.apply(null, items.map(function (i) { return i.count; }).concat([1]));

    items.forEach(function (it, i) {
      var a0 = -Math.PI / 2 + (i * 2 * Math.PI) / Math.max(1, items.length);
      var x = CX + R * Math.cos(a0), y = CY + R * Math.sin(a0);
      var rad = it.kind === "node" ? 11 + 14 * it.str : 11 + 25 * Math.sqrt(Math.max(0, it.count) / maxC);
      var op = it.count === 0 ? 0.16 : it.on ? 1 : 0.22;
      S("line", { x1: CX, y1: CY, x2: x, y2: y, stroke: it.color, "stroke-width": 1.3, opacity: op * 0.45 }, svg);

      var g = S("g", { class: "ach-seg", tabindex: 0, role: "button", "aria-label": it.label + ", " + (it.kind === "node" ? F(it.acts, 0) + " aktivácií" : F(it.count, 0) + " uzlov") }, svg);
      S("circle", { cx: x, cy: y, r: rad, fill: it.color, opacity: op * 0.22 }, g);
      S("circle", { cx: x, cy: y, r: rad, fill: "none", stroke: it.color, "stroke-width": 1.8, opacity: op }, g);
      var vt = S("text", { x: x, y: y + 4, "text-anchor": "middle", opacity: op }, g);
      vt.setAttribute("style", "font-size:var(--fs-label);fill:var(--ink)");
      vt.textContent = it.kind === "node" ? F(it.acts, 0) + "×" : F(it.count, 0);

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
    S("circle", { cx: CX, cy: CY, r: 44, fill: centerColor, opacity: 0.14 }, core);
    S("circle", { cx: CX, cy: CY, r: 44, fill: "none", stroke: centerColor, "stroke-width": 2 }, core);
    var ct = S("text", { x: CX, y: CY - 2, "text-anchor": "middle" }, core);
    ct.setAttribute("style", "font-family:var(--body);font-size:var(--fs-md);font-weight:600;fill:" + centerColor);
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
      $("#pm-tbl-empty").innerHTML = '<div class="empty"><span class="eico">∅</span><p>Žiadny uzol nevyhovuje filtrom. Uvoľni ich v lište grafu vyššie (tlačidlo Filtre).</p></div>';
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
      host.innerHTML = '<div class="empty"><span class="eico">∅</span><p>Pre daný dopyt a filtre nič. Uvoľni filtre v lište grafu na tabe Graf.</p></div>';
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
    /* rovnaká metrika ako legenda a KPI: degreeStats nad kreslenými hranami */
    var st = degreeStats();
    return mem().AREAS.map(function (a) {
      return { area: a, dens: (st.deg[a.k] || 0) / (st.cnt[a.k] || 1), nodes: st.cnt[a.k] || 0 };
    });
  }
  function drawCharts() {
    var dens = densData();
    C.render("#pm-ch-dens", {
      type: "bar", title: "Hustota prepojení podľa oblasti", height: 210,
      caption: "spojení na uzol siete · rovnaká metrika ako legenda a KPI · odvodené",
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
    /* v radiáli sú sieťové ovládače (search, vrstvy) neaktívne — nič nerobia */
    var gc = $("#pm-gcard"); if (gc) gc.classList.toggle("vradial", view === "radial");
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
    /* výber v zozname nesmie prežiť filter — hromadná akcia by siahla na skryté riadky */
    var vis = {};
    filteredNodes().forEach(function (n) { vis[n.id] = 1; });
    Object.keys(PM.sel).forEach(function (id) { if (!vis[id]) delete PM.sel[id]; });
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
        setLayer(b.getAttribute("data-l"));
      });
      var gapp = $("#pm-gapp");
      if (gapp) gapp.addEventListener("change", netStyle);
      /* zmena appiek → obnov select vrstvy aj cache filtra */
      if (A.apps.onChange) A.apps.onChange(function () {
        _appIds = { slug: null, ids: null };
        if (PM.layer === "app") { gappFill(); netStyle(); legendRefresh(); }
      });

      /* search v grafe */
      $("#pm-gq").addEventListener("input", function () { netSearch(this.value); });

      /* pásik zhôd + stavové chipy */
      $("#pm-ghits").addEventListener("click", function (e) {
        var h = e.target.closest("button[data-ghit]");
        if (h) { var id = h.getAttribute("data-ghit"); netCenterOn(id, Math.max(PM.net.cam.k, 1.8)); mem().inspect(id); return; }
        var x = e.target.closest("button[data-ghx]");
        if (!x) return;
        var ghx = x.getAttribute("data-ghx");
        if (ghx === "clear") { $("#pm-gq").value = ""; netSearch(""); }
        else if (ghx === "list") { switchTab("hladanie"); runSearch(PM.gq); }
        else resetFilters();
      });
      $("#pm-gchips").addEventListener("click", function (e) {
        var b = e.target.closest("button[data-gx]"); if (b) clearGx(b.getAttribute("data-gx"));
      });

      /* zoom klaster */
      $("#pm-gz-in").addEventListener("click", function () { netZoomTo(PM.net.cam.k * 1.25, GW / 2, GH / 2); });
      $("#pm-gz-out").addEventListener("click", function () { netZoomTo(PM.net.cam.k / 1.25, GW / 2, GH / 2); });
      $("#pm-gz-fit").addEventListener("click", function () {
        var net = PM.net; if (!net) return;
        net.lobeFocus = null; net.deptFocus = null;
        netFocusApply(true);
        netFitAll();
      });

      /* rozbaľovacie filtre */
      $("#pm-filt-toggle").addEventListener("click", function () { PM.filtOpen = !PM.filtOpen; syncFilterCollapse(); });
      syncFilterCollapse();

      /* breadcrumb návrat zo zoomu laloku */
      $("#pm-gback").addEventListener("click", function () { netFocusLobe(null); });

      /* graf na celú obrazovku (Esc zatvára, auto-fit) */
      $("#pm-gfull").addEventListener("click", function () {
        gfullSet(!$("#pm-gcard").classList.contains("gfull"));
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
      $("#pm-f-str").addEventListener("input", function () { PM.filter.strMin = +this.value / 100; $("#pm-f-strv").textContent = F(PM.filter.strMin, 2); netStyle(); redrawView(); if (PM.tab === "hladanie") hlResults(); });
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

      /* prekresli aktívny pohľad pri každej zmene modelu; layout sa prepočíta
         LEN keď sa zmenila množina uzlov (create/archive/move/typ) — úprava
         atribútov (sila, pin) je lacný restyle bez rebuildu */
      mem().onChange(function () {
        kpiRefresh(); recentRefresh();
        if (PM.net && PM.net.sig !== netSig()) PM.net = null;
        legendRefresh();
        drawCharts();
        redrawView();
        netKpi();
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
