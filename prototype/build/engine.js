/* ============================================================
   AuraChart — ručný SVG grafový engine pre AuraAI
   Rieši defekty auditu: osi + jednotky, dvojosa, tooltip+crosshair,
   výber rozsahu ťahaním, klik na bod, klávesnica, prahy s pásmom,
   správny pomer strán (ResizeObserver), stavy skeleton/empty/error.
   Žiadna knižnica. Používa výhradne Aura tokeny.
   ============================================================ */
(function (w) {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  var uid = 0;

  /* ---------- formátovanie sk-SK ---------- */
  var NBSP = " ";
  function fmtNum(v, dec) {
    if (v == null || !isFinite(v)) return "—";
    var d = dec == null ? (Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : 2) : dec;
    var s = v.toFixed(d);
    var p = s.split(".");
    p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
    return p.join(",");
  }
  function fmtVal(v, unit, dec) {
    var s = fmtNum(v, dec);
    return unit ? s + NBSP + unit : s;
  }
  function niceMax(v) {
    if (v <= 0) return 1;
    var e = Math.pow(10, Math.floor(Math.log10(v)));
    var n = v / e;
    var m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
    return m * e;
  }
  function el(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function hel(tag, cls, parent, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }
  function esc(s) { var d = document.createElement("div"); d.textContent = s == null ? "" : s; return d.innerHTML; }

  /* ---------- registry pre resize a re-render pri zmene témy ---------- */
  var charts = [];
  var ro = w.ResizeObserver ? new ResizeObserver(function (es) {
    es.forEach(function (e) {
      var c = charts.filter(function (x) { return x.host === e.target; })[0];
      if (c) draw(c);
    });
  }) : null;

  function reflowAll() { charts.forEach(draw); }
  w.addEventListener("aura:theme", reflowAll);

  /* ---------- verejné API ---------- */
  function render(host, spec) {
    if (typeof host === "string") host = document.querySelector(host);
    if (!host) return null;
    var existing = charts.filter(function (c) { return c.host === host; })[0];
    var c = existing || { host: host, id: ++uid };
    c.spec = normalize(spec);
    if (!existing) {
      charts.push(c);
      host.classList.add("ach");
      if (ro) ro.observe(host);
    }
    draw(c);
    return {
      update: function (s) { c.spec = normalize(s); draw(c); },
      patch: function (o) { Object.keys(o).forEach(function (k) { c.spec[k] = o[k]; }); draw(c); }
    };
  }

  function normalize(s) {
    s = s || {};
    s.type = s.type || "line";
    s.series = (s.series || []).map(function (se, i) {
      return {
        key: se.key || "s" + i,
        label: se.label || se.key || "séria " + (i + 1),
        color: se.color || defColor(i),
        unit: se.unit || "",
        axis: se.axis === "right" ? "right" : "left",
        dash: !!se.dash,
        dec: se.dec,
        data: (se.data || []).map(function (d) { return typeof d === "number" ? { y: d } : d; })
      };
    });
    s.height = s.height || 200;
    s.state = s.state || "ok";
    return s;
  }
  function defColor(i) {
    return ["var(--teal)", "var(--gold)", "var(--violet)", "var(--good)", "var(--amber)", "var(--teal-3)"][i % 6];
  }
  function cssVal(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  /* ---------- kreslenie ---------- */
  function draw(c) {
    var host = c.host, s = c.spec;
    /* zruš poslucháčov predchádzajúceho vykreslenia — inak sa pri každom
       prekreslení pridá ďalší window listener a počet rastie donekonečna */
    if (c.cleanup) { try { c.cleanup(); } catch (e) { } c.cleanup = null; }
    host.innerHTML = "";
    var W = Math.max(220, host.clientWidth || 600);
    var H = s.height;

    if (s.state === "loading") return skeleton(host, H);
    if (s.state === "error") return stateBox(host, H, "error", s.errorText || "Dáta sa nepodarilo načítať.", s.onRetry, "Skúsiť znova");
    /* gauge a donut nemajú `series` — dáta nesú vo `value` / `items`;
       bez tejto vetvy by sa vykreslili ako prázdny stav */
    var hasData = s.series.some(function (se) { return se.data.length; })
      || s.type === "heatmap" || s.type === "uptime" || s.type === "timeline"
      || (s.type === "gauge" && s.value != null)
      || (s.type === "donut" && (s.items || []).length > 0);
    if (!hasData || s.state === "empty") return stateBox(host, H, "empty", s.emptyText || "Zatiaľ žiadne dáta v tomto rozsahu.", s.onEmptyAction, s.emptyAction);

    if (s.type === "heatmap") return drawHeatmap(c, W, H);
    if (s.type === "gauge") return drawGauge(c, W, H);
    if (s.type === "donut") return drawDonut(c, W, H);
    if (s.type === "sparkline") return drawSpark(c, W, H);
    if (s.type === "uptime") return drawUptime(c, W, H);
    if (s.type === "timeline") return drawTimeline(c, W, H);
    return drawXY(c, W, H);
  }

  function skeleton(host, H) {
    var d = hel("div", "ach-sk", host);
    d.style.height = H + "px";
    d.setAttribute("aria-busy", "true");
    d.setAttribute("aria-label", "Načítava sa graf");
    return d;
  }
  function stateBox(host, H, kind, text, action, actionLabel) {
    var d = hel("div", "ach-state ach-" + kind, host);
    d.style.minHeight = H + "px";
    hel("div", "ach-state-ico", d, kind === "error" ? "!" : "∅");
    hel("p", null, d, text);
    if (action) {
      var b = hel("button", "ach-btn", d, actionLabel || "Akcia");
      b.type = "button";
      b.addEventListener("click", action);
    }
    return d;
  }

  /* ---------- hlavný XY graf: line / area / bar / stacked ---------- */
  function drawXY(c, W, H) {
    var s = c.spec, host = c.host;
    var right = s.series.some(function (se) { return se.axis === "right"; });
    /* horný okraj 30 px: jednotka osi sa kreslí nad graf a nesmie kolidovať s najvyšším tickom */
    var m = { t: 30, r: right ? 58 : 18, b: 34, l: 52 };
    var iw = W - m.l - m.r, ih = H - m.t - m.b;
    var n = Math.max.apply(null, s.series.map(function (se) { return se.data.length; }));
    var labels = (s.x && s.x.labels) || [];

    function scale(axis) {
      var ss = s.series.filter(function (se) { return se.axis === axis; });
      if (!ss.length) return null;
      var vals = [];
      if (s.type === "stacked" && axis === "left") {
        for (var i = 0; i < n; i++) {
          var sum = 0;
          ss.forEach(function (se) { sum += (se.data[i] && se.data[i].y) || 0; });
          vals.push(sum);
        }
      } else {
        ss.forEach(function (se) { se.data.forEach(function (d) { if (d.y != null) vals.push(d.y); }); });
      }
      var cfg = (axis === "left" ? s.yLeft : s.yRight) || {};
      (s.thresholds || []).forEach(function (t) { if ((t.axis || "left") === axis) vals.push(t.value); });
      var mx = cfg.max != null ? cfg.max : niceMax(Math.max.apply(null, vals) * 1.08);
      var mn = cfg.min != null ? cfg.min : 0;
      return { min: mn, max: mx, cfg: cfg, unit: cfg.unit || (ss[0] && ss[0].unit) || "" };
    }
    var L = scale("left"), R = scale("right");
    function yPos(v, axis) {
      var sc = axis === "right" ? R : L;
      if (!sc) return ih;
      var t = (v - sc.min) / (sc.max - sc.min || 1);
      return m.t + ih - t * ih;
    }
    function xPos(i) {
      if (s.type === "bar" || s.type === "stacked" || n === 1) return m.l + (i + 0.5) * (iw / n);
      return m.l + (n === 1 ? iw / 2 : (i / (n - 1)) * iw);
    }

    var svg = el("svg", { width: "100%", height: H, viewBox: "0 0 " + W + " " + H, role: "img", class: "ach-svg", "data-type": s.type }, host);
    var title = s.title || "Graf";
    el("title", {}, svg).textContent = title + (s.caption ? " — " + s.caption : "");

    /* prahové pásma najprv (pod dátami) */
    (s.thresholds || []).forEach(function (t) {
      var ax = t.axis || "left", y = yPos(t.value, ax);
      if (t.band) {
        var y0 = t.band === "above" ? m.t : y, y1 = t.band === "above" ? y : m.t + ih;
        el("rect", { x: m.l, y: Math.min(y0, y1), width: iw, height: Math.abs(y1 - y0), fill: t.color || "var(--red)", opacity: ".07" }, svg);
      }
    });

    /* mriežka + os Y ľavá */
    var TICKS = 4;
    for (var i = 0; i <= TICKS; i++) {
      var yy = m.t + ih - (i / TICKS) * ih;
      el("line", { x1: m.l, y1: yy, x2: m.l + iw, y2: yy, stroke: "var(--line)", "stroke-width": 1, opacity: i === 0 ? 1 : .65 }, svg);
      if (L) {
        var v = L.min + (i / TICKS) * (L.max - L.min);
        var tx = el("text", { x: m.l - 7, y: yy + 3.5, "text-anchor": "end", class: "ach-tick" }, svg);
        tx.textContent = fmtNum(v, L.cfg.dec != null ? L.cfg.dec : (L.max <= 3 ? 1 : 0));
      }
      if (R) {
        var v2 = R.min + (i / TICKS) * (R.max - R.min);
        var tx2 = el("text", { x: m.l + iw + 7, y: yy + 3.5, "text-anchor": "start", class: "ach-tick ach-tick-r" }, svg);
        tx2.textContent = fmtNum(v2, R.cfg.dec != null ? R.cfg.dec : (R.max <= 3 ? 1 : 0));
      }
    }
    /* jednotky osí */
    if (L && L.unit) { var ul = el("text", { x: m.l - 7, y: m.t - 13, "text-anchor": "end", class: "ach-unit" }, svg); ul.textContent = L.unit; }
    if (R && R.unit) { var ur = el("text", { x: m.l + iw + 7, y: m.t - 13, "text-anchor": "start", class: "ach-unit ach-unit-r" }, svg); ur.textContent = R.unit; }

    /* os X */
    /* rozostup popiskov osi X — pri 74 px sa dlhšie hodnoty („9,6 s" × „10,0 s") lepia k sebe.
       Na úzkom (mobil < ~420 px) sa plocha zmenší a slotov je málo — vtedy zväčšíme minimálny
       rozostup, prípadne popisky mierne otočíme, aby sa nikdy neprekryli (0 kolízií). */
    var narrow = W < 420;
    /* na úzkom zväčši minimálny rozostup slotov — menej popiskov, žiadne prekrytie */
    var perLabel = narrow ? 118 : 96;
    var step = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(iw / perLabel))));
    var lastRight = -1e9, lastNode = null;
    for (var j = 0; j < n; j++) {
      if (j % step && j !== n - 1) continue;
      var lb = labels[j];
      if (lb == null) continue;
      var cx = xPos(j);
      /* preskoč popisok, ktorý by naliehal na predchádzajúci (odhad ~6,6 px na znak + medzera);
         odhad je zámerne štedrý, aby aj na úzkom platilo 0 kolízií */
      var half = String(lb).length * 3.4 + (narrow ? 8 : 6);
      if (cx - half < lastRight) {
        /* posledný popisok osi má prednosť — radšej odstráň ten predošlý, než ich nechať prekryté */
        if (j === n - 1 && lastNode) { lastNode.parentNode.removeChild(lastNode); lastNode = null; }
        else continue;
      }
      lastRight = cx + half;
      lastNode = el("text", { x: cx, y: H - 13, "text-anchor": "middle", class: "ach-tick" }, svg);
      lastNode.textContent = lb;
    }
    /* popis rozsahu ide do HTML pod graf — v SVG by dlhý text pretiekol šírku stránky */

    /* dáta */
    var gid = "acg" + c.id;
    if (s.type === "stacked") {
      var acc = new Array(n).fill(0);
      s.series.forEach(function (se, si) {
        var bw = (iw / n) * 0.62;
        se.data.forEach(function (d, i2) {
          if (d.y == null) return;
          var y0 = yPos(acc[i2], "left"), y1 = yPos(acc[i2] + d.y, "left");
          el("rect", {
            x: xPos(i2) - bw / 2, y: y1, width: bw, height: Math.max(1, y0 - y1),
            fill: se.color, opacity: ".92", class: "ach-bar", "data-i": i2, "data-s": si
          }, svg);
          acc[i2] += d.y;
        });
      });
    } else if (s.type === "bar") {
      var groups = s.series.length;
      s.series.forEach(function (se, si) {
        var bw = (iw / n) * 0.72 / groups;
        se.data.forEach(function (d, i2) {
          if (d.y == null) return;
          var yv = yPos(d.y, se.axis);
          var bx = xPos(i2) - (bw * groups) / 2 + si * bw;
          el("rect", {
            x: bx, y: yv, width: Math.max(1, bw - 1.5), height: Math.max(1, m.t + ih - yv),
            fill: d.color || se.color, opacity: ".92", class: "ach-bar", "data-i": i2, "data-s": si
          }, svg);
        });
      });
    } else {
      s.series.forEach(function (se, si) {
        var pts = se.data.map(function (d, i2) { return [xPos(i2), yPos(d.y, se.axis)]; });
        if (!pts.length) return;
        var dd = pts.map(function (p, i2) { return (i2 ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(" ");
        if (s.type === "area" && si === 0) {
          var grad = el("linearGradient", { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 }, el("defs", {}, svg));
          el("stop", { offset: "0", "stop-color": se.color, "stop-opacity": ".34" }, grad);
          el("stop", { offset: "1", "stop-color": se.color, "stop-opacity": "0" }, grad);
          el("path", { d: dd + " L" + pts[pts.length - 1][0].toFixed(1) + " " + (m.t + ih) + " L" + pts[0][0].toFixed(1) + " " + (m.t + ih) + " Z", fill: "url(#" + gid + ")" }, svg);
        }
        el("path", {
          d: dd, fill: "none", stroke: se.color, "stroke-width": 2.1,
          "stroke-linejoin": "round", "stroke-linecap": "round",
          "stroke-dasharray": se.dash ? "5 4" : null, opacity: se.dash ? .9 : 1
        }, svg);
        pts.forEach(function (p, i2) {
          el("circle", { cx: p[0], cy: p[1], r: 2.6, fill: se.color, class: "ach-pt", "data-i": i2, "data-s": si, opacity: n > 40 ? 0 : .95 }, svg);
        });
      });
    }

    /* prahové čiary nad dátami */
    (s.thresholds || []).forEach(function (t) {
      var ax = t.axis || "left", y = yPos(t.value, ax);
      el("line", { x1: m.l, y1: y, x2: m.l + iw, y2: y, stroke: t.color || "var(--red)", "stroke-width": 1.4, "stroke-dasharray": "6 4", opacity: .95 }, svg);
      if (t.label) {
        var lt = el("text", { x: m.l + iw - 4, y: y - 5, "text-anchor": "end", class: "ach-thr", fill: t.color || "var(--red)" }, svg);
        lt.textContent = t.label;
      }
    });

    /* interakcia: crosshair + tooltip + výber rozsahu + klik */
    var cross = el("line", { y1: m.t, y2: m.t + ih, stroke: "var(--ink-3)", "stroke-width": 1, "stroke-dasharray": "3 3", opacity: 0 }, svg);
    var selRect = el("rect", { y: m.t, height: ih, fill: "var(--teal)", opacity: 0, "pointer-events": "none" }, svg);
    var hit = el("rect", { x: m.l, y: m.t, width: iw, height: ih, fill: "transparent", class: "ach-hit", tabindex: 0, role: "application", "aria-label": title + ". Šípkami prechádzaj dátové body." }, svg);
    var tip = hel("div", "ach-tip", host);
    var focusIdx = -1, dragFrom = null;

    function idxFromX(px) {
      if (s.type === "bar" || s.type === "stacked") return Math.max(0, Math.min(n - 1, Math.floor((px - m.l) / (iw / n))));
      return Math.max(0, Math.min(n - 1, Math.round(((px - m.l) / iw) * (n - 1))));
    }
    function showAt(i) {
      if (i < 0 || i >= n) return;
      var x = xPos(i);
      cross.setAttribute("x1", x); cross.setAttribute("x2", x); cross.setAttribute("opacity", .8);
      var rows = s.series.map(function (se) {
        var d = se.data[i];
        if (!d || d.y == null) return "";
        var unit = se.unit || (se.axis === "right" ? (R && R.unit) : (L && L.unit)) || "";
        return '<span class="ach-tip-row"><i style="background:' + se.color + '"></i>' + esc(se.label) + '<b>' + fmtVal(d.y, unit, se.dec) + '</b></span>';
      }).join("");
      tip.innerHTML = '<span class="ach-tip-h">' + esc(labels[i] != null ? labels[i] : "bod " + (i + 1)) + "</span>" + rows;
      tip.classList.add("on");
      var hw = host.clientWidth;
      var tw = tip.offsetWidth || 150;
      tip.style.left = Math.max(4, Math.min(hw - tw - 4, x - tw / 2)) + "px";
      tip.style.top = (m.t + 4) + "px";
      focusIdx = i;
    }
    function hide() { cross.setAttribute("opacity", 0); tip.classList.remove("on"); }

    /* index priamo z udalosti — nespoliehať sa na focusIdx, ktorý pri dotyku
       ani pri programovom kliku nie je nastavený (inak sa vždy otvorí prvý bod) */
    function idxFromClientX(clientX) {
      var r = svg.getBoundingClientRect();
      if (!r.width) return 0;
      return idxFromX((clientX - r.left) * (W / r.width));
    }
    function idxFromEvent(e) { return idxFromClientX(e.clientX); }
    function pointsAt(i) { return s.series.map(function (se) { return se.data[i]; }); }

    var dragMoved = false, suppressClick = false;

    hit.addEventListener("mousemove", function (e) {
      var i = idxFromEvent(e);
      showAt(i);
      if (dragFrom != null) {
        if (i !== dragFrom) dragMoved = true;
        var a = Math.min(xPos(dragFrom), xPos(i)), b = Math.max(xPos(dragFrom), xPos(i));
        selRect.setAttribute("x", a); selRect.setAttribute("width", Math.max(1, b - a)); selRect.setAttribute("opacity", ".14");
      }
    });
    hit.addEventListener("mouseleave", function () { if (afterTouch()) return; hide(); });
    hit.addEventListener("mousedown", function (e) { dragFrom = idxFromEvent(e); dragMoved = false; });

    /* dotyk: tap/ťah po grafe ukáže crosshair + tooltip aj bez myši.
       passive — necháme stránku rolovať, len zobrazíme hodnotu pod prstom. */
    function onTouch(e) {
      var t = e.touches && e.touches[0];
      if (!t) return;
      touched();
      showAt(idxFromClientX(t.clientX));
    }
    hit.addEventListener("touchstart", onTouch, { passive: true });
    hit.addEventListener("touchmove", onTouch, { passive: true });

    function onUp(e) {
      if (dragFrom != null && dragMoved) {
        var i = idxFromEvent(e);
        if (Math.abs(i - dragFrom) >= 1 && s.onRange) {
          s.onRange(Math.min(dragFrom, i), Math.max(dragFrom, i), labels);
        }
        /* ťahanie končí kliknutím — potlač ho, inak by onPoint hneď prepísal vybraný rozsah */
        suppressClick = true;
        setTimeout(function () { suppressClick = false; }, 0);
      }
      dragFrom = null; dragMoved = false; selRect.setAttribute("opacity", 0);
    }
    w.addEventListener("mouseup", onUp);
    c.cleanup = function () { w.removeEventListener("mouseup", onUp); };

    hit.addEventListener("click", function (e) {
      if (suppressClick || !s.onPoint) return;
      var i = idxFromEvent(e);
      showAt(i);
      s.onPoint(i, labels[i], pointsAt(i));
    });
    hit.addEventListener("focus", function () { showAt(focusIdx < 0 ? 0 : focusIdx); });
    hit.addEventListener("blur", hide);
    hit.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { showAt(Math.min(n - 1, focusIdx + 1)); e.preventDefault(); }
      else if (e.key === "ArrowLeft") { showAt(Math.max(0, focusIdx - 1)); e.preventDefault(); }
      else if (e.key === "Home") { showAt(0); e.preventDefault(); }
      else if (e.key === "End") { showAt(n - 1); e.preventDefault(); }
      else if ((e.key === "Enter" || e.key === " ") && s.onPoint && focusIdx > -1) {
        /* tretí argument je povinný — bez neho padne každý handler, ktorý číta body */
        s.onPoint(focusIdx, labels[focusIdx], pointsAt(focusIdx));
        e.preventDefault();
      }
    });

    caption(host, s);
    legend(host, s);
    textAlt(host, s, labels);
  }

  /* popis rozsahu ako HTML (zalomí sa, nepretečie) */
  function caption(host, s) {
    if (!s.caption) return;
    hel("p", "ach-cap-h", host, s.caption);
  }

  /* ---------- legenda + textová alternatíva ---------- */
  function legend(host, s) {
    if (s.legend === false || s.series.length === 0) return;
    var lg = hel("div", "ach-lgd", host);
    s.series.forEach(function (se) {
      var it = hel("span", null, lg);
      var i = hel("i", null, it); i.style.background = se.color;
      if (se.dash) i.classList.add("dash");
      it.appendChild(document.createTextNode(se.label + (se.unit ? " (" + se.unit + ")" : "")));
    });
    (s.thresholds || []).forEach(function (t) {
      if (!t.label) return;
      var it = hel("span", "thr", lg);
      var i = hel("i", "dash", it); i.style.background = t.color || "var(--red)";
      it.appendChild(document.createTextNode(t.label));
    });
  }
  function textAlt(host, s, labels) {
    var d = hel("details", "ach-alt", host);
    hel("summary", null, d, "Dáta ako tabuľka");
    /* .tw + .tbl → na mobile sa chytí pravidiel pre rolovateľnú tabuľku (inak viacstĺpcová pretečie) */
    var tw = hel("div", "tw", d);
    var t = hel("table", "tbl", tw), th = hel("tr", null, hel("thead", null, t));
    hel("th", null, th, s.xTitle || "Čas");
    s.series.forEach(function (se) { hel("th", null, th, se.label + (se.unit ? " (" + se.unit + ")" : "")); });
    var tb = hel("tbody", null, t);
    var n = Math.max.apply(null, s.series.map(function (se) { return se.data.length; }));
    for (var i = 0; i < n; i++) {
      var tr = hel("tr", null, tb);
      hel("td", null, tr, labels[i] != null ? String(labels[i]) : String(i + 1));
      s.series.forEach(function (se) {
        var v = se.data[i];
        hel("td", null, tr, v && v.y != null ? fmtNum(v.y, se.dec) : "—");
      });
    }
  }

  /* ---------- heatmapa ---------- */
  function drawHeatmap(c, W, H) {
    var s = c.spec, host = c.host;
    var rows = s.rows || [], cols = s.cols || [], cells = s.cells || [];
    var m = { t: 18, r: 8, b: 20, l: 34 };
    var cw = (W - m.l - m.r) / cols.length, chh = (H - m.t - m.b) / rows.length;
    var svg = el("svg", { width: "100%", height: H, viewBox: "0 0 " + W + " " + H, role: "img", class: "ach-svg", "data-type": s.type }, host);
    el("title", {}, svg).textContent = (s.title || "Heatmapa") + (s.caption ? " — " + s.caption : "");
    var mx = Math.max.apply(null, cells.map(function (x) { return x.v || 0; }).concat([1]));
    var tip = hel("div", "ach-tip", host);
    cols.forEach(function (cl, ci) {
      if (ci % Math.ceil(cols.length / 12) === 0) {
        var t = el("text", { x: m.l + ci * cw + cw / 2, y: 12, "text-anchor": "middle", class: "ach-tick" }, svg);
        t.textContent = cl;
      }
    });
    rows.forEach(function (r, ri) {
      var t = el("text", { x: m.l - 6, y: m.t + ri * chh + chh / 2 + 3.5, "text-anchor": "end", class: "ach-tick" }, svg);
      t.textContent = r;
    });
    cells.forEach(function (cell) {
      var op = mx ? 0.1 + 0.85 * (cell.v / mx) : 0.1;
      var rect = el("rect", {
        x: m.l + cell.c * cw + 1, y: m.t + cell.r * chh + 1,
        width: Math.max(1, cw - 2), height: Math.max(1, chh - 2), rx: 2.5,
        fill: cell.v ? "var(--teal)" : "var(--card-2)", opacity: cell.v ? op : 1,
        stroke: "var(--line)", "stroke-width": cell.v ? 0 : 1, class: "ach-cell", tabindex: 0,
        role: "img"
      }, svg);
      var lbl = (rows[cell.r] || "") + " " + (cols[cell.c] || "") + ": " + fmtVal(cell.v, s.unit || "");
      el("title", {}, rect).textContent = lbl;
      function show(e) {
        tip.innerHTML = '<span class="ach-tip-h">' + esc(lbl) + "</span>";
        tip.classList.add("on");
        tip.style.left = Math.min(host.clientWidth - 150, m.l + cell.c * cw) + "px";
        tip.style.top = (m.t + cell.r * chh - 6) + "px";
      }
      rect.addEventListener("mouseenter", show);
      rect.addEventListener("focus", show);
      rect.addEventListener("touchstart", function (e) { touched(); show(e); }, { passive: true });
      rect.addEventListener("mouseleave", function () { if (afterTouch()) return; tip.classList.remove("on"); });
      rect.addEventListener("blur", function () { tip.classList.remove("on"); });
      if (s.onCell) rect.addEventListener("click", function () { s.onCell(cell); });
    });
    caption(host, s);
  }

  /* ---------- gauge ---------- */
  function drawGauge(c, W, H) {
    var s = c.spec, host = c.host;
    var v = s.value || 0, max = s.max || 100;
    var size = Math.min(W, H);
    var R = size / 2 - 12, CX = W / 2, CY = H / 2 + 4;
    var C = 2 * Math.PI * R;
    var svg = el("svg", { width: "100%", height: H, viewBox: "0 0 " + W + " " + H, role: "img", class: "ach-svg", "data-type": s.type }, host);
    el("title", {}, svg).textContent = (s.title || "Ukazovateľ") + ": " + fmtVal(v, s.unit || "");
    el("circle", { cx: CX, cy: CY, r: R, fill: "none", stroke: "var(--line)", "stroke-width": 9 }, svg);
    el("circle", {
      cx: CX, cy: CY, r: R, fill: "none", stroke: s.color || "var(--teal)", "stroke-width": 9,
      "stroke-linecap": "round", "stroke-dasharray": C,
      "stroke-dashoffset": C * (1 - Math.max(0, Math.min(1, v / max))),
      transform: "rotate(-90 " + CX + " " + CY + ")"
    }, svg);
    /* hodnota a jej jednotka musia mať dosť odstupu — pri 28px Playfair sa inak prekrývajú */
    var t1 = el("text", { x: CX, y: CY + 1, "text-anchor": "middle", class: "ach-gv" }, svg);
    t1.textContent = fmtNum(v, s.dec);
    var t2 = el("text", { x: CX, y: CY + 24, "text-anchor": "middle", class: "ach-gl" }, svg);
    t2.textContent = s.unit || "";
    if (s.sub) hel("p", "ach-cap-h", host, s.sub);
  }

  /* ---------- donut ---------- */
  function drawDonut(c, W, H) {
    var s = c.spec, host = c.host, items = s.items || [];
    var total = items.reduce(function (a, b) { return a + b.v; }, 0) || 1;
    var size = Math.min(W, H), R = size / 2 - 10, r0 = R * 0.62, CX = W / 2, CY = H / 2;
    var svg = el("svg", { width: "100%", height: H, viewBox: "0 0 " + W + " " + H, role: "img", class: "ach-svg", "data-type": s.type }, host);
    el("title", {}, svg).textContent = s.title || "Rozdelenie";
    var tip = hel("div", "ach-tip", host), a0 = -Math.PI / 2;
    items.forEach(function (it, i) {
      var a1 = a0 + (it.v / total) * Math.PI * 2;
      var lg = a1 - a0 > Math.PI ? 1 : 0;
      var p = ["M", CX + R * Math.cos(a0), CY + R * Math.sin(a0),
        "A", R, R, 0, lg, 1, CX + R * Math.cos(a1), CY + R * Math.sin(a1),
        "L", CX + r0 * Math.cos(a1), CY + r0 * Math.sin(a1),
        "A", r0, r0, 0, lg, 0, CX + r0 * Math.cos(a0), CY + r0 * Math.sin(a0), "Z"].join(" ");
      var path = el("path", { d: p, fill: it.color || defColor(i), class: "ach-seg", tabindex: 0, role: "img" }, svg);
      var lbl = it.label + ": " + fmtVal(it.v, s.unit || "") + " (" + fmtNum(it.v / total * 100, 1) + " %)";
      el("title", {}, path).textContent = lbl;
      function show() { tip.innerHTML = '<span class="ach-tip-h">' + esc(lbl) + "</span>"; tip.classList.add("on"); tip.style.left = "8px"; tip.style.top = "6px"; }
      path.addEventListener("mouseenter", show); path.addEventListener("focus", show);
      path.addEventListener("touchstart", function (e) { touched(); show(e); }, { passive: true });
      path.addEventListener("mouseleave", function () { if (afterTouch()) return; tip.classList.remove("on"); });
      path.addEventListener("blur", function () { tip.classList.remove("on"); });
      if (s.onSlice) path.addEventListener("click", function () { s.onSlice(it); });
      a0 = a1;
    });
    if (s.centerLabel) {
      var t1 = el("text", { x: CX, y: CY - 1, "text-anchor": "middle", class: "ach-gv" }, svg);
      t1.textContent = s.centerLabel;
      var t2 = el("text", { x: CX, y: CY + 22, "text-anchor": "middle", class: "ach-gl" }, svg);
      t2.textContent = s.centerSub || "";
    }
    var lg2 = hel("div", "ach-lgd", host);
    items.forEach(function (it, i) {
      var sp = hel("span", null, lg2);
      var ic = hel("i", null, sp); ic.style.background = it.color || defColor(i);
      sp.appendChild(document.createTextNode(it.label + " · " + fmtNum(it.v / total * 100, 1) + " %"));
    });
  }

  /* ---------- sparkline ---------- */
  /* po dotyku prehliadač dopošle kompatibilné mouse udalosti vrátane mouseleave —
     tá by tooltip hneď zhasla. Krátke okno po tape ju ignoruje (tap = ukáž a nechaj). */
  var lastTouch = 0;
  function touched() { lastTouch = Date.now(); }
  function afterTouch() { return Date.now() - lastTouch < 1200; }

  function drawSpark(c, W, H) {
    var s = c.spec, host = c.host, d0 = s.series[0];
    var vals = d0.data.map(function (d) { return d.y; });
    var mx = Math.max.apply(null, vals), mn = Math.min.apply(null, vals), rg = (mx - mn) || 1;
    var svg = el("svg", { width: "100%", height: H, viewBox: "0 0 " + W + " " + H, preserveAspectRatio: "none", role: "img", class: "ach-svg", "data-type": "sparkline" }, host);
    el("title", {}, svg).textContent = (s.title || "Trend") + ": " + fmtVal(vals[vals.length - 1], d0.unit);
    var pts = vals.map(function (v, i) { return [(i / (vals.length - 1)) * W, H - 2 - ((v - mn) / rg) * (H - 4)]; });
    el("path", { d: pts.map(function (p, i) { return (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(" "), fill: "none", stroke: d0.color, "stroke-width": 1.6 }, svg);
  }

  /* ---------- uptime dlaždice ---------- */
  function drawUptime(c, W, H) {
    var s = c.spec, host = c.host, days = s.days || [];
    /* na dotykovom/úzkom displeji zväčši dlaždice, aby boli prst-priateľské
       (na desktope ostáva kompaktný pruh z shell.css) */
    var touch = W < 560 || (w.matchMedia && w.matchMedia("(pointer:coarse)").matches);
    var wrap = hel("div", "ach-up", host);
    days.forEach(function (d) {
      var t = hel("button", "ach-up-d " + (d.state || "ok"), wrap);
      t.type = "button";
      if (touch) { t.style.height = "40px"; t.style.width = "14px"; t.style.borderRadius = "3px"; }
      t.title = d.label + ": " + (d.text || d.state);
      t.setAttribute("aria-label", t.title);
      if (s.onDay) t.addEventListener("click", function () { s.onDay(d); });
      else t.disabled = true;
    });
    caption(host, s);
  }

  /* ---------- timeline incidentov ---------- */
  function drawTimeline(c, W, H) {
    var s = c.spec, host = c.host, items = s.items || [];
    var m = { t: 12, r: 12, b: 26, l: 12 };
    var iw = W - m.l - m.r;
    var svg = el("svg", { width: "100%", height: H, viewBox: "0 0 " + W + " " + H, role: "img", class: "ach-svg", "data-type": s.type }, host);
    el("title", {}, svg).textContent = s.title || "Časová os";
    var lanes = s.lanes || ["critical", "error", "warn", "info"];
    var lh = (H - m.t - m.b) / lanes.length;
    var tip = hel("div", "ach-tip", host);
    lanes.forEach(function (ln, i) {
      el("line", { x1: m.l, y1: m.t + i * lh + lh / 2, x2: m.l + iw, y2: m.t + i * lh + lh / 2, stroke: "var(--line)" }, svg);
      var t = el("text", { x: m.l, y: m.t + i * lh + lh / 2 - 6, class: "ach-tick" }, svg);
      t.textContent = ln;
    });
    items.forEach(function (it) {
      var li = Math.max(0, lanes.indexOf(it.level));
      var x = m.l + (it.at || 0) * iw;
      var wpx = Math.max(4, (it.dur || 0.01) * iw);
      var col = { critical: "var(--red)", error: "var(--red)", warn: "var(--amber)", info: "var(--teal)", ok: "var(--good)" }[it.level] || "var(--teal)";
      var r = el("rect", { x: x, y: m.t + li * lh + lh / 2 - 5, width: wpx, height: 10, rx: 3, fill: col, opacity: .9, tabindex: 0, role: "img", class: "ach-ev" }, svg);
      var lbl = (it.time || "") + " · " + it.label + (it.resolved ? " · vyriešené za " + it.resolved : "");
      el("title", {}, r).textContent = lbl;
      function show() { tip.innerHTML = '<span class="ach-tip-h">' + esc(lbl) + "</span>"; tip.classList.add("on"); tip.style.left = Math.min(host.clientWidth - 190, x) + "px"; tip.style.top = "2px"; }
      r.addEventListener("mouseenter", show); r.addEventListener("focus", show);
      r.addEventListener("touchstart", function (e) { touched(); show(e); }, { passive: true });
      r.addEventListener("mouseleave", function () { if (afterTouch()) return; tip.classList.remove("on"); });
      r.addEventListener("blur", function () { tip.classList.remove("on"); });
      if (s.onItem) r.addEventListener("click", function () { s.onItem(it); });
    });
    (s.axisLabels || []).forEach(function (a, i, arr) {
      var t = el("text", { x: m.l + (i / (arr.length - 1)) * iw, y: H - 8, "text-anchor": i === 0 ? "start" : i === arr.length - 1 ? "end" : "middle", class: "ach-tick" }, svg);
      t.textContent = a;
    });
  }

  w.AuraChart = { render: render, fmtNum: fmtNum, fmtVal: fmtVal, reflowAll: reflowAll, NBSP: NBSP };
})(window);
