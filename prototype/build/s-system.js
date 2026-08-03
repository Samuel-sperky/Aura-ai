/* ============================================================
   D — obrazovky skupiny „Systém": jadro · naklady · observabilita · nastavenia
   Registruje výhradne Aura.screens.*, nič nebootuje.
   Zdroj pravdy pre uzly/zóny = Aura.mem. Grafy = AuraChart. Shell = Aura.*.
   ============================================================ */
(function (w) {
  "use strict";

  var A = w.Aura, C = w.AuraChart;
  var $ = A.$, $$ = A.$$;

  /* ---------- spoločné pomôcky ---------- */
  function nf(v, d) { return C.fmtNum(v, d); }
  function vf(v, u, d) { return C.fmtVal(v, u, d); }
  function esc(s) { return A.esc(s); }

  function jit(seed, n, base, amp, dec) {
    var r = A.rng(seed), out = [], i;
    for (i = 0; i < n; i++) out.push(+((base + (r() - 0.5) * amp).toFixed(dec == null ? 2 : dec)));
    return out;
  }
  function endAt(arr, v) { arr[arr.length - 1] = v; return arr; }
  function clampArr(arr, lo, hi) { return arr.map(function (v) { return Math.min(hi, Math.max(lo, v)); }); }
  function dl(rows) {
    return "<dl>" + rows.map(function (r) {
      return "<dt>" + esc(r[0]) + "</dt><dd>" + (r[2] === true ? r[1] : esc(r[1])) + "</dd>";
    }).join("") + "</dl>";
  }
  function meterHtml(name, sub, val, max, unit, dec, cls, limPct) {
    var p = Math.max(0, Math.min(100, (val / max) * 100));
    return '<div class="mtr"><div class="mn"><b>' + esc(name) + "</b><span>" + esc(sub) + "</span></div>" +
      '<div class="mt"><div class="trk"><i class="' + (cls || "") + '" style="width:' + p.toFixed(1) + '%"></i>' +
      (limPct ? '<span class="lim" style="left:' + limPct + '%"></span>' : "") +
      "</div></div><div class=\"mv\">" + vf(val, unit, dec) + "</div></div>";
  }
  function emptyHtml(text, btnId, btnLabel) {
    return '<div class="empty"><span class="eico">∅</span><p>' + esc(text) + "</p>" +
      (btnId ? '<button class="btn ghost" type="button" id="' + btnId + '">' + esc(btnLabel) + "</button>" : "") +
      "</div>";
  }
  function lvlBadge(l) {
    var m = { debug: "mute", info: "info", warn: "warn", error: "bad", critical: "bad" };
    return '<span class="badge ' + (m[l] || "mute") + '">' + esc(l) + "</span>";
  }

  /* zóny: kód + názov cez Aura.mem (nikdy holé Z1) */
  function zoneLabelByCode(code) {
    if (!code || code === "—") return "— · bez zóny";
    var a = A.mem.AREAS.filter(function (x) { return x.zone === code; })[0];
    return a ? A.mem.zoneLabel(a) : code;
  }

  /* „Zobraziť ako tabuľku" — textová alternatíva grafu (idempotentné) */
  function altTable(hostSel, spec) {
    var host = $(hostSel); if (!host) return;
    var labels = (spec.x && spec.x.labels) || [];
    var series = spec.series || [];
    var head = "<tr><th>" + esc(spec.xTitle || "—") + "</th>" + series.map(function (s) {
      return '<th class="num">' + esc(s.label) + (s.unit ? " (" + esc(s.unit) + ")" : "") + "</th>";
    }).join("") + "</tr>";
    var body = labels.map(function (lab, i) {
      return "<tr><td class=\"k\">" + esc(String(lab)) + "</td>" + series.map(function (s) {
        var d = s.data[i]; var y = d == null ? null : (typeof d === "object" ? d.y : d);
        return '<td class="num">' + (y == null ? "—" : nf(y, s.dec == null ? 1 : s.dec)) + "</td>";
      }).join("") + "</tr>";
    }).join("");
    var wrap = host.__altWrap;
    if (!wrap) {
      wrap = document.createElement("div");
      host.__altWrap = wrap;
      host.parentNode.insertBefore(wrap, host.nextSibling);
      wrap.innerHTML = '<div class="filt" style="margin:8px 0 0"><button class="btn ghost" type="button" aria-expanded="false">Zobraziť ako tabuľku</button></div>' +
        '<div class="tw" hidden><table class="tbl"><thead></thead><tbody></tbody></table></div>';
      var btn = wrap.querySelector("button"), tw = wrap.querySelector(".tw");
      btn.addEventListener("click", function () {
        var opening = tw.hidden; tw.hidden = !opening;
        btn.setAttribute("aria-expanded", String(opening));
        btn.textContent = opening ? "Skryť tabuľku" : "Zobraziť ako tabuľku";
      });
    }
    wrap.querySelector("thead").innerHTML = head;
    wrap.querySelector("tbody").innerHTML = body;
  }

  var busy = false;
  function runProgress(wrap, bar, txt, steps, doneMsg, onDone) {
    if (busy) { A.toast("Počkaj, iná operácia ešte beží.", "warn"); return; }
    busy = true; wrap.hidden = false; bar.style.width = "0%";
    var i = 0;
    (function step() {
      bar.style.width = Math.round(((i + 1) / steps.length) * 100) + "%";
      txt.textContent = steps[i]; i++;
      if (i < steps.length) { setTimeout(step, A.reduce ? 90 : 430); return; }
      setTimeout(function () {
        txt.textContent = doneMsg; busy = false;
        if (onDone) onDone();
        setTimeout(function () { wrap.hidden = true; bar.style.width = "0%"; }, 900);
      }, A.reduce ? 90 : 480);
    })();
  }

  /* ---------- zdieľané prahy/model/sadzba (default; Nastavenia sú vlastník) ---------- */
  var SH = {
    model: function () { return A.getShared("model", "qwen3:4b"); },
    rate: function () { return A.getShared("rate", 14); },
    ramThr: function () { return A.getShared("ramThr", 85); },   /* % z 48 GB */
    latThr: function () { return A.getShared("latThr", 1); },    /* s */
    qualThr: function () { return A.getShared("qualThr", 80); }  /* % hit@5 */
  };

  /* ============================================================
     1) JADRO — jediný vlastník eval kvality
     ============================================================ */
  var J = {
    ph: { embed: 4.05, recall: 0.065, ser: 0.055 },
    mach: { ram: 31.2, ramMax: 48, cpu: 42, temp: 61, disk: 412, diskMax: 1000, swap: 0.4, swapMax: 8 },
    ch: {}
  };
  J.total = J.ph.embed + J.ph.recall + J.ph.ser;
  J.share = (J.ph.embed / J.total) * 100;

  J.pairs = [
    { a: "dodacia-lehota", b: "delivery-time", kind: "zhodný pár", score: 0.460, thr: 0.500, state: "pod prahom", bad: true,
      note: "Slovenský a anglický zápis tej istej veci. Mal by skórovať vysoko, skóruje najnižšie z celej batérie." },
    { a: "refund", b: "black-hole", kind: "nezhodný pár", score: 0.502, thr: 0.500, state: "nad prahom", bad: true,
      note: "Dvojica bez vecného vzťahu. Prekonáva zhodný pár vyššie — presne to je jadro problému." },
    { a: "zvyšných 17 párov", b: "—", kind: "súhrn batérie", score: -1, thr: 0.500, state: "v poriadku", bad: false,
      note: "Zvyšok dvadsiatky prešiel. Jednotlivé skóre nie sú v zázname batérie z 31. 7. 2026 — doplnia sa pri ďalšom behu." }
  ];

  J.BASE = 27.4;
  J.mods = [
    { name: "qwen3:4b", quant: "Q4_K_M", role: "router (zavedený)", ram: 2.6 },
    { name: "bge-m3", quant: "F16", role: "embeddings (zavedený)", ram: 1.2 },
    { name: "7B", quant: "Q4", role: "generovanie", ram: 4.4 },
    { name: "8B", quant: "Q5", role: "generovanie", ram: 6.1 },
    { name: "14B", quant: "Q4", role: "generovanie / kód", ram: 9.8 },
    { name: "32B", quant: "Q4", role: "uvažovanie", ram: 19 },
    { name: "70B", quant: "Q4", role: "uvažovanie", ram: 42 }
  ].map(function (m) {
    m.free = +(48 - J.BASE - m.ram).toFixed(1);
    m.fits = m.free >= 2 ? "áno" : (m.free >= 0 ? "tesne" : "nie");
    return m;
  });

  function jSpark(sel, seed, base, amp, color, unit, dec) {
    C.render(sel, { type: "sparkline", height: 26, title: "Trend",
      series: [{ key: "s", color: color, unit: unit, dec: dec, data: jit(seed, 30, base, amp, dec) }] });
  }

  function jRenderMeters() {
    var m = J.mach;
    $("#j-meters").innerHTML =
      meterHtml("RAM", "48 GB celkom · limit " + nf(SH.ramThr(), 0) + " %", m.ram, m.ramMax, "GB", 1, "", SH.ramThr()) +
      meterHtml("CPU", "AMD 9900 · 12 jadier · inferencia na CPU", m.cpu, 100, "%", 0, "a") +
      meterHtml("Teplota CPU", "throttling od 85 °C", m.temp, 100, "°C", 0, "a", 85) +
      meterHtml("Disk", "1 TB Samsung · /var", m.disk, m.diskMax, "GB", 0, "g") +
      meterHtml("Swap", "8 GB · čím nižšie, tým lepšie", m.swap, m.swapMax, "GB", 1, "v") +
      '<p class="note" style="padding-top:9px">VRAM: žiadna. Stroj má iGPU, celá inferencia beží na procesore.</p>';
  }

  /* --- reference (depth-on-demand): tabuľky do Aura.detail --- */
  function jPairsPanel() {
    var rows = J.pairs.map(function (p) {
      return '<tr><td class="k">' + esc(p.a) + '</td><td class="k">' + esc(p.b) + "</td><td>" + esc(p.kind) +
        '</td><td class="num">' + (p.score < 0 ? "—" : nf(p.score, 3)) + '</td><td class="num">' + nf(p.thr, 3) +
        '</td><td>' + (p.bad ? '<span class="badge warn">' : '<span class="badge ok">') + esc(p.state) + "</span></td></tr>";
    }).join("");
    A.detail("Krajné páry embeddingov SK↔EN",
      '<p class="note">Batéria 31. 7. 2026 · bge-m3 · 1 024 dim. · 20 párov, 3 problémové.</p>' +
      '<div class="tw"><table class="tbl"><thead><tr><th>Pojem A</th><th>Pojem B</th><th>Vzťah</th>' +
      '<th class="num">Kosínus</th><th class="num">Prah</th><th>Stav</th></tr></thead><tbody>' + rows + "</tbody></table></div>" +
      "<p>Zhodný pár <span class=\"mono\">dodacia-lehota ↔ delivery-time</span> = 0,460 skóruje nižšie ako nezhodný " +
      "<span class=\"mono\">refund ↔ black-hole</span> = 0,502. Kým sa to nevyrieši, dopyt v jednom jazyku môže minúť uzol v druhom.</p>",
      [{ label: "Nájsť v logoch", fn: function () { A.closeDetail(); A.go("observabilita", "prekryv"); } },
       { label: "Zavrieť", fn: A.closeDetail }]);
  }
  function jModsPanel() {
    var rows = J.mods.map(function (m) {
      var b = m.fits === "áno" ? "ok" : (m.fits === "tesne" ? "warn" : "bad");
      return '<tr><td class="k">' + esc(m.name) + "</td><td>" + esc(m.quant) + "</td><td>" + esc(m.role) +
        '</td><td class="num">' + vf(m.ram, "GB", 1) + '</td><td class="num">' + vf(m.free, "GB", 1) +
        '</td><td><span class="badge ' + b + '">' + esc(m.fits) + "</span></td></tr>";
    }).join("");
    A.detail("Nároky modelov na RAM",
      '<p class="note">Typický footprint zavedeného modelu vrátane kontextu (nie veľkosť súboru). Základ mimo modelov 27,4 GB.</p>' +
      '<div class="tw"><table class="tbl"><thead><tr><th>Model</th><th>Kvantizácia</th><th>Úloha</th>' +
      '<th class="num">RAM</th><th class="num">Zostane z 48 GB</th><th>Zmestí sa</th></tr></thead><tbody>' + rows + "</tbody></table></div>" +
      "<p>Do 48 GB sa ešte zmestí model do 19 GB (32B Q4), ale tesne. 70B Q4 (42 GB) sa nezmestí.</p>",
      [{ label: "Zavrieť", fn: A.closeDetail }]);
  }
  function jModDetail(m) {
    A.detail("Model · " + m.name,
      dl([["Kvantizácia", m.quant], ["Úloha", m.role], ["Stopa v RAM", vf(m.ram, "GB", 1)],
        ["Systém a služby", vf(J.BASE, "GB", 1)], ["Zostane z 48 GB", vf(m.free, "GB", 1)],
        ["Zmestí sa", m.fits], ["Inferencia", "CPU (AMD 9900), bez VRAM"]]) +
      "<p>Meranie z 31. 7. 2026: celkovo 31,2 GB z 48 GB, z toho modely 3,8 GB.</p>",
      [{ label: "Zavrieť", fn: A.closeDetail }]);
  }

  /* --- grafy (ohraničené fn, čítajú prahy zo SH; volateľné znova pri onState) --- */
  function jDrawLat() {
    var h24 = A.hours(24);
    var p50 = clampArr(jit(21, 24, 4.2, 1.1, 2), 2.9, 6.4); endAt(p50, 4.2);
    var p95 = p50.map(function (v, i) { return +(v * 1.48 + (i % 3) * 0.08 + 0.22).toFixed(2); });
    var spec = {
      type: "line", height: 230, title: "Latencia /api/search v čase",
      caption: "posledných 24 h · 1 bod = 1 h · priebeh dopočítaný, merané je p50 4,2 s",
      xTitle: "Hodina",
      series: [
        { key: "p50", label: "p50", color: "var(--teal)", unit: "s", dec: 2, data: p50 },
        { key: "p95", label: "p95", color: "var(--gold)", unit: "s", dec: 2, dash: true, data: p95 }
      ],
      x: { labels: h24 }, yLeft: { unit: "s", min: 0, max: 8, dec: 1 },
      thresholds: [{ value: SH.latThr(), axis: "left", label: "cieľ " + nf(SH.latThr(), 1) + " s", color: "var(--red)", band: "above" }],
      onPoint: function (i, lab, pts) {
        A.detail("Latencia · " + lab,
          dl([["Hodina", String(lab)], ["p50", vf(pts[0] ? pts[0].y : 0, "s", 2)], ["p95", vf(pts[1] ? pts[1].y : 0, "s", 2)],
            ["Cieľ", vf(SH.latThr(), "s", 2)], ["Nad cieľom o", vf((pts[0] ? pts[0].y : 0) - SH.latThr(), "s", 2)],
            ["Dominantná fáza", "embedovanie dopytu cez Ollamu na CPU"]]) +
          "<p>Latenciu nezníži rýchlejší RecallEngine (8–130 ms), len rýchlejšie embedovanie.</p>",
          [{ label: "Otvoriť logy tejto hodiny", fn: function () { A.closeDetail(); A.go("observabilita", "p50"); } },
           { label: "Zavrieť", fn: A.closeDetail }]);
      }
    };
    J.ch.lat = C.render("#j-lat-time", spec); altTable("#j-lat-time", spec);
  }
  function jDrawRouter() {
    var d14 = A.days(14);
    var tot = clampArr(jit(31, 14, 94.6, 3.4, 1), 88, 98); endAt(tot, 95.3);
    var mdl = clampArr(jit(32, 14, 86.8, 4.2, 1), 80, 92); endAt(mdl, 87.5);
    var spec = {
      type: "line", height: 220, title: "Úspešnosť routera qwen3:4b v čase",
      caption: "14 dní · 1 bod = 1 beh eval batérie · staršie behy dopočítané, meraný je posledný (31. 7. 2026)",
      xTitle: "Deň",
      series: [
        { key: "t", label: "Celková (model + regex)", color: "var(--teal)", unit: "%", dec: 1, data: tot },
        { key: "m", label: "Len model", color: "var(--violet)", unit: "%", dec: 1, dash: true, data: mdl }
      ],
      x: { labels: d14 }, yLeft: { unit: "%", min: 70, max: 100, dec: 0 },
      thresholds: [{ value: 90, axis: "left", label: "prah pravidla 90 %", color: "var(--amber)" }],
      onPoint: function (i, lab, pts) {
        A.detail("Eval batéria · " + lab,
          dl([["Deň", String(lab)], ["Celková úspešnosť", vf(pts[0].y, "%", 1)], ["Len model", vf(pts[1].y, "%", 1)],
            ["Prínos regex vrstvy", vf(pts[0].y - pts[1].y, "p. b.", 1)], ["Dopytov v batérii", "43"]]) +
          "<p>Regex vrstva zachytáva presné tvary (SKU, čísla objednávok). Bez nej by router padol na 87,5 %.</p>",
          [{ label: "Zavrieť", fn: A.closeDetail }]);
      }
    };
    C.render("#j-router", spec); altTable("#j-router", spec);
  }
  function jDrawHit() {
    var d14 = A.days(14);
    var hit = clampArr(jit(41, 14, 85.4, 6, 1), 76, 92); endAt(hit, 86.7);
    var mrr = clampArr(jit(42, 14, 0.782, 0.09, 3), 0.68, 0.86); endAt(mrr, 0.800);
    var spec = {
      type: "line", height: 220, title: "Recall hit@5 a MRR",
      caption: "14 dní · 1 bod = 1 beh eval batérie · staršie behy dopočítané, meraný je posledný",
      xTitle: "Deň",
      series: [
        { key: "h", label: "hit@5", color: "var(--teal)", unit: "%", axis: "left", dec: 1, data: hit },
        { key: "m", label: "MRR", color: "var(--gold)", unit: "", axis: "right", dec: 2, data: mrr }
      ],
      x: { labels: d14 }, yLeft: { unit: "%", min: 60, max: 100, dec: 0 }, yRight: { unit: "MRR", min: 0, max: 1, dec: 2 },
      thresholds: [{ value: SH.qualThr(), axis: "left", label: "prah hit@5 " + nf(SH.qualThr(), 0) + " %", color: "var(--amber)" }],
      onPoint: function (i, lab, pts) {
        A.detail("Recall · " + lab,
          dl([["Deň", String(lab)], ["hit@5", vf(pts[0].y, "%", 1)], ["MRR", nf(pts[1].y, 3)], ["Uzlov", "714"], ["Model", "bge-m3"]]) +
          "<p>MRR je na pravej osi (0–1), hit@5 na ľavej v percentách. Dve jednotky nezdieľajú škálu.</p>",
          [{ label: "Zavrieť", fn: A.closeDetail }]);
      }
    };
    C.render("#j-hit", spec); altTable("#j-hit", spec);
  }
  function jDrawRam() {
    var h24b = A.hours(24);
    var ram = clampArr(jit(51, 24, 30.8, 5, 1), 26, 38); endAt(ram, J.mach.ram);
    var lim = +(SH.ramThr() / 100 * 48).toFixed(1);
    var spec = {
      type: "area", height: 220, title: "Využitie RAM v čase",
      caption: "posledných 24 h · 1 bod = 1 h · priebeh dopočítaný, meraná je posledná hodnota 31,2 GB",
      xTitle: "Hodina",
      series: [{ key: "r", label: "Obsadená RAM", color: "var(--violet)", unit: "GB", dec: 1, data: ram }],
      x: { labels: h24b }, yLeft: { unit: "GB", min: 0, max: 48, dec: 0 },
      thresholds: [{ value: lim, axis: "left", label: "limit " + nf(lim, 1) + " GB", color: "var(--amber)", band: "above" }],
      onPoint: function (i, lab, pts) {
        var v = pts[0].y;
        A.detail("RAM · " + lab,
          dl([["Hodina", String(lab)], ["Obsadené", vf(v, "GB", 1)], ["Voľné", vf(48 - v, "GB", 1)],
            ["Podiel", vf(v / 48 * 100, "%", 1)], ["Limit upozornenia", vf(lim, "GB", 1)]]),
          [{ label: "Zavrieť", fn: A.closeDetail }]);
      }
    };
    C.render("#j-ram", spec); altTable("#j-ram", spec);
    $("#j-ram-b").textContent = vf(J.mach.ram, "GB", 1);
  }

  function jStatusForModel() {
    var mdl = SH.model();
    if (mdl === "qwen3:4b") {
      $("#j-qwen-b").textContent = "AKTÍVNY"; $("#j-qwen-b").className = "badge ok";
      $("#j-status-b").textContent = "OK"; $("#j-status-b").className = "badge ok";
      $("#j-status-t").textContent = "Ollama odpovedá, oba modely zavedené v pamäti, fronta prázdna. " +
        "Otvorený je jeden kvalitatívny problém (prekryv embeddingov), nie výpadok.";
    } else {
      $("#j-qwen-b").textContent = "NAHRADENÝ"; $("#j-qwen-b").className = "badge warn";
      $("#j-status-b").textContent = "ZMENA"; $("#j-status-b").className = "badge warn";
      $("#j-status-t").textContent = "Router beží na modeli " + mdl + " (zmenené v Nastaveniach). " +
        "Úspešnosť nie je premeraná — spusti eval batériu.";
    }
  }

  /* rozpad podľa appky — spoločný pre Jadro (záťaž) aj Náklady (peniaze) */
  function appSplit() {
    return A.apps.all().map(function (a) { return { app: a, c: A.apps.cost(a) }; })
      .sort(function (x, y) { return y.c.share - x.c.share; });
  }
  function renderAppLoad() {
    var sp = appSplit();
    C.render("#j-app", {
      type: "bar", title: "Záťaž podľa appky", height: 200,
      caption: "podiel nasadení na " + nf(A.apps.MACHINE.q, 0) + " dopytoch za mesiac · klik otvorí appku",
      x: { labels: sp.map(function (r) { return r.app.name; }) }, xTitle: "Appka",
      yLeft: { unit: "dopytov", dec: 0 },
      series: [{ key: "q", label: "dopyty", unit: "dopytov", dec: 0, color: "var(--teal)", data: sp.map(function (r) { return { y: r.c.q }; }) }],
      onPoint: function (i) { A.go("appky", sp[i].app.slug); }
    });
    var btn = $("#j-app-tbl"), host = $("#j-app-t");
    if (btn && !btn.__b) {
      btn.__b = 1;
      btn.addEventListener("click", function () {
        if (host.hasAttribute("hidden")) {
          host.innerHTML = '<table class="tbl"><thead><tr><th>Appka</th><th class="num">Dopyty / mesiac</th><th class="num">Podiel %</th></tr></thead><tbody>' +
            sp.map(function (r) { return '<tr><td class="k">' + esc(r.app.name) + '</td><td class="num">' + nf(r.c.q, 0) + '</td><td class="num">' + nf(r.c.share * 100, 1) + "</td></tr>"; }).join("") + "</tbody></table>";
          host.removeAttribute("hidden"); btn.textContent = "Skryť tabuľku"; btn.setAttribute("aria-expanded", "true");
        } else { host.setAttribute("hidden", ""); btn.textContent = "Tabuľka"; btn.setAttribute("aria-expanded", "false"); }
      });
    }
  }
  function renderAppCost() {
    var sp = appSplit();
    C.render("#n-app", {
      type: "donut", title: "Náklady podľa appky", height: 200, unit: "€ / mesiac",
      centerLabel: nf(sp.reduce(function (a, r) { return a + r.c.eur; }, 0), 2), centerSub: "€ / mesiac",
      caption: "rozpad mesačnej spotreby " + nf(A.apps.MACHINE.kwh, 1) + " kWh na nasadenia",
      items: sp.map(function (r) { return { label: r.app.name, v: +r.c.eur.toFixed(2), color: r.app.color, slug: r.app.slug }; }),
      onSlice: function (it) { if (it.slug) A.go("appky", it.slug); }
    });
    var btn = $("#n-app-tbl"), host = $("#n-app-t");
    if (btn && !btn.__b) {
      btn.__b = 1;
      btn.addEventListener("click", function () {
        if (host.hasAttribute("hidden")) {
          host.innerHTML = '<table class="tbl"><thead><tr><th>Appka</th><th class="num">kWh</th><th class="num">€ / mesiac</th><th class="num">Podiel %</th></tr></thead><tbody>' +
            sp.map(function (r) { return '<tr><td class="k">' + esc(r.app.name) + '</td><td class="num">' + nf(r.c.kwh, 1) + '</td><td class="num">' + nf(r.c.eur, 2) + '</td><td class="num">' + nf(r.c.share * 100, 1) + "</td></tr>"; }).join("") + "</tbody></table>";
          host.removeAttribute("hidden"); btn.textContent = "Skryť tabuľku"; btn.setAttribute("aria-expanded", "true");
        } else { host.setAttribute("hidden", ""); btn.textContent = "Tabuľka"; btn.setAttribute("aria-expanded", "false"); }
      });
    }
  }

  A.screens.jadro = {
    title: "Jadro", group: "Systém",
    init: function () {
      renderAppLoad();
      A.apps.onChange(renderAppLoad);
      jSpark("#j-spk-qwen", 101, 0.42, 0.22, "var(--teal)", "s", 2);
      jSpark("#j-spk-bge", 102, 4.05, 0.6, "var(--gold)", "s", 2);
      jSpark("#j-kpi-spk1", 111, 95, 4, "var(--teal)", "%", 1);
      jSpark("#j-kpi-spk2", 112, 86.5, 6, "var(--teal)", "%", 1);
      jSpark("#j-kpi-spk3", 113, 4.2, 1.2, "var(--gold)", "s", 2);
      jSpark("#j-kpi-spk4", 114, 31, 5, "var(--violet)", "GB", 1);

      A.count($("#j-kpi-router .kv"), 95.3, 1);
      A.count($("#j-kpi-hit .kv"), 86.7, 1);
      A.count($("#j-kpi-p50 .kv"), 4.2, 1);
      A.count($("#j-kpi-ram .kv"), 31.2, 1);

      /* KPI akcie — odkazy na eval kvalitu vlastní Jadro */
      $("#j-kpi-router").addEventListener("click", function () { A.go("observabilita", "router"); });
      $("#j-kpi-hit").addEventListener("click", function () {
        A.detail("Recall hit@5 = 86,7 %",
          dl([["hit@5", "86,7 %"], ["MRR", "0,800"], ["Uzlov v pamäti", "714 v 5 oblastiach"],
            ["Oblasti", "Vývoj & kód 271 · Biznis & projekty 160 · Marketing & SEO 152 · Osobné & preferencie 91 · Dizajn & kreatíva 36"],
            ["Merané", "eval batéria 31. 7. 2026"], ["Brzda", "prekryv embeddingov SK↔EN, 3 z 20 párov"]]) +
          "<p>hit@5 hovorí, ako často je správny uzol v prvej päťke. MRR 0,800 znamená, že keď tam je, býva na prvom až druhom mieste.</p>",
          [{ label: "Prejsť na pamäť", fn: function () { A.closeDetail(); A.go("pamat"); } }, { label: "Zavrieť", fn: A.closeDetail }]);
      });
      $("#j-kpi-p50").addEventListener("click", function () { A.go("observabilita", "p50"); });
      $("#j-kpi-ram").addEventListener("click", function () {
        A.detail("RAM 31,2 z 48 GB",
          dl([["Obsadené", "31,2 GB (65,0 %)"], ["Voľné", "16,8 GB"], ["Modely", "3,8 GB (qwen3:4b 2,6 + bge-m3 1,2)"],
            ["Systém a služby", "27,4 GB"], ["Limit upozornenia", nf(SH.ramThr(), 0) + " % z 48 GB"], ["VRAM", "žiadna — inferencia beží na CPU"]]) +
          "<p>Do 48 GB sa ešte zmestí model do 19 GB (32B Q4), ale tesne. 70B Q4 (42 GB) sa nezmestí.</p>",
          [{ label: "Nároky modelov na RAM", fn: function () { A.closeDetail(); jModsPanel(); } }, { label: "Zavrieť", fn: A.closeDetail }]);
      });

      /* rozklad latencie */
      var h12 = A.hours(12);
      var embed = clampArr(jit(11, 12, 4.05, 0.5, 2), 3.6, 4.6); endAt(embed, J.ph.embed);
      var recall = clampArr(jit(12, 12, 0.065, 0.1, 3), 0.008, 0.130); endAt(recall, J.ph.recall);
      var ser = clampArr(jit(13, 12, 0.055, 0.03, 3), 0.03, 0.09); endAt(ser, J.ph.ser);
      C.render("#j-lat-break", {
        type: "stacked", height: 230, title: "Rozklad latencie /api/search na fázy",
        caption: "posledných 12 h · 1 stĺpec = 1 h · priebeh dopočítaný, merané je posledné p50",
        xTitle: "Hodina",
        series: [
          { key: "e", label: "Embedovanie dopytu (Ollama, CPU)", color: "var(--neutral)", unit: "s", dec: 2, data: embed },
          { key: "r", label: "RecallEngine", color: "var(--teal)", unit: "s", dec: 3, data: recall },
          { key: "s", label: "Serializácia odpovede", color: "var(--gold)", unit: "s", dec: 3, data: ser }
        ],
        x: { labels: h12 }, yLeft: { unit: "s", min: 0, max: 6, dec: 1 },
        onPoint: function (i, lab, pts) {
          var e = pts[0].y, r = pts[1].y, s2 = pts[2].y, t = e + r + s2;
          A.detail("Rozklad latencie · " + lab,
            dl([["Celkovo", vf(t, "s", 3)], ["Embedovanie", vf(e, "s", 3) + " (" + nf(e / t * 100, 1) + " %)"],
              ["RecallEngine", vf(r * 1000, "ms", 0) + " (" + nf(r / t * 100, 1) + " %)"],
              ["Serializácia", vf(s2 * 1000, "ms", 0) + " (" + nf(s2 / t * 100, 1) + " %)"]]) +
            "<p>RecallEngine sa drží v pásme 8 až 130 ms. Zvyšok je čakanie na vektor dopytu z bge-m3 na CPU.</p>",
            [{ label: "Zavrieť", fn: A.closeDetail }]);
        }
      });
      $("#j-break-b").textContent = "embedovanie " + nf(J.share, 1) + " %";
      $("#j-break-n").textContent = "Z " + nf(J.total, 2) + " s pripadá na embedovanie dopytu " + nf(J.ph.embed, 2) + " s, teda " +
        nf(J.share, 1) + " %. RecallEngine spotrebuje " + nf(J.ph.recall * 1000, 0) + " ms a serializácia " +
        nf(J.ph.ser * 1000, 0) + " ms. Optimalizovať vyhľadávanie preto nemá zmysel.";

      jDrawLat(); jDrawRouter(); jDrawHit(); jDrawRam();
      jRenderMeters();

      /* depth-on-demand referenčné tabuľky */
      $("#j-pairs-open").addEventListener("click", jPairsPanel);
      $("#j-mods-open").addEventListener("click", jModsPanel);

      /* akcie kariet modelov */
      $("#j-md-qwen").addEventListener("click", function () { jModDetail(J.mods[0]); });
      $("#j-md-qwen-sw").addEventListener("click", function () {
        A.toast("Model routera sa mení v Nastaveniach cez Uložiť.", "ok"); A.go("nastavenia");
      });
      $("#j-md-qwen-log").addEventListener("click", function () { A.go("observabilita", "router"); });
      $("#j-md-bge").addEventListener("click", function () { jModDetail(J.mods[1]); });
      $("#j-md-bge-log").addEventListener("click", function () { A.go("observabilita", "embed"); });

      /* ovládanie */
      var pw = $("#j-prog"), pi = $("#j-prog-i"), pt = $("#j-prog-t");
      $("#j-md-bge-test").addEventListener("click", function () {
        runProgress(pw, pi, pt, ["Načítavam 20 párov…", "Počítam kosínusové podobnosti…"],
          "Test prekryvu: 3 z 20 párov mimo očakávania (nezmenené).",
          function () { A.toast("Prekryv SK↔EN: stále 3 z 20 párov.", "warn"); });
      });
      $("#j-eval").addEventListener("click", function () {
        runProgress(pw, pi, pt, ["Pripravujem 43 dopytov…", "Meriam smerovanie routera…", "Meriam recall hit@5 a MRR…",
          "Meriam 20 párov embeddingov…", "Skladám report…"],
          "Eval batéria dokončená · router 95,3 % · hit@5 86,7 % · MRR 0,800 · prekryv 3 z 20.", function () {
            A.count($("#j-kpi-router .kv"), 95.3, 1); A.count($("#j-kpi-hit .kv"), 86.7, 1); A.count($("#j-kpi-p50 .kv"), 4.2, 1);
            $("#j-status-t").textContent = "Ollama odpovedá, oba modely zavedené, fronta prázdna. Otvorený je jeden kvalitatívny problém (prekryv embeddingov), nie výpadok.";
            $("#j-status-b").textContent = "OK"; $("#j-status-b").className = "badge ok";
            A.toast("Eval batéria: 41 zo 43 dopytov správne (95,3 %).", "ok");
          });
      });
      $("#j-offline").addEventListener("click", function () {
        runProgress(pw, pi, pt, ["Odpájam sieťové rozhranie (test)…", "Overujem Ollamu na localhost:11434…", "Overujem RecallEngine bez internetu…"],
          "Offline test prešiel. Systém nepotrebuje sieť na odpoveď.", function () { A.toast("Offline test prešiel — všetko beží lokálne.", "ok"); });
      });
      $("#j-backup").addEventListener("click", function () {
        runProgress(pw, pi, pt, ["Zbieram 714 uzlov a vektorový index…", "Komprimujem zstd…", "Zapisujem /var/backups/hades/…"],
          "Záloha hotová · 42,1 MB.", function () { A.toast("Záloha uložená (42,1 MB).", "ok"); });
      });
      $("#j-queue").addEventListener("click", function () {
        A.confirm("Vyprázdniť frontu úloh?",
          "Vo fronte sú 2 zlyhané úlohy reindexu (oblasť Marketing & SEO). Vyprázdnenie ich zahodí, reindex bude treba spustiť znova.",
          function () { A.toast("Fronta vyprázdnená · 2 úlohy zahodené.", "ok"); pt.textContent = "Fronta vyprázdnená. Odporúčam manuálny reindex oblasti Marketing & SEO."; },
          "Vyprázdniť", false);
      });
      $("#j-restart").addEventListener("click", function () {
        A.confirm("Reštartovať jadro?",
          "Ollama sa ukončí a znovu zavedie oba modely. /api/search bude asi 25 sekúnd vracať 503.",
          function () {
            runProgress(pw, pi, pt, ["Zastavujem Ollamu…", "Uvoľňujem 3,8 GB pamäte…", "Štartujem Ollamu…", "Zavádzam qwen3:4b…", "Zavádzam bge-m3…"],
              "Jadro reštartované. Oba modely zavedené.", function () { A.toast("Jadro reštartované za 24 s.", "ok"); });
          }, "Reštartovať", true);
      });

      /* propagácia zdieľaného stavu (Nastavenia sú vlastník) */
      A.onState("model", jStatusForModel);
      A.onState("ramThr", function () { jRenderMeters(); jDrawRam(); });
      A.onState("latThr", function () { jDrawLat(); });
      A.onState("qualThr", function () { jDrawHit(); });

      /* živé merače */
      w.addEventListener("aura:tick", function () {
        if (A.state.screen !== "jadro") return;
        var r = Math.random();
        J.mach.cpu = Math.round(Math.min(96, Math.max(18, J.mach.cpu + (r - 0.5) * 14)));
        J.mach.temp = Math.round(Math.min(84, Math.max(48, J.mach.temp + (r - 0.5) * 5)));
        J.mach.ram = +Math.min(41, Math.max(27, J.mach.ram + (r - 0.5) * 0.9)).toFixed(1);
        jRenderMeters();
        $("#j-ram-b").textContent = vf(J.mach.ram, "GB", 1);
      });
    },
    onShow: function (sub) { if (sub === "ram") $("#j-kpi-ram").focus(); }
  };

  /* ============================================================
     2) NÁKLADY — merané v popredí, odhad úspory jasne označený
     ============================================================ */
  var N = {
    rkwh: 0.22, tokIn: 42.8, tokOut: 9.6, kwh: 68.4, q: 8420, ch: {}
  };
  N.months = [
    { m: "5/2026 (od 9. 5.)", q: 2940, tin: 14.2, tout: 3.1, kwh: 23.9 },
    { m: "6/2026", q: 7810, tin: 39.6, tout: 8.8, kwh: 66.1 },
    { m: "7/2026", q: 8420, tin: 42.8, tout: 9.6, kwh: 68.4 },
    { m: "8/2026 (prebieha)", q: 281, tin: 1.4, tout: 0.3, kwh: 2.3 }
  ];
  function nCloud(tin, tout) { return (tin + tout) * SH.rate(); }
  function nElec(kwh) { return kwh * N.rkwh; }

  function nMonthRow(m) {
    var cl = nCloud(m.tin, m.tout), lo = nElec(m.kwh), sv = cl - lo;
    return '<tr tabindex="0" data-row="' + esc(m.m) + '"><td class="k">' + esc(m.m) + '</td><td class="num">' + nf(m.q, 0) +
      '</td><td class="num">' + nf(m.tin, 1) + '</td><td class="num">' + nf(m.tout, 1) + '</td><td class="num">' + nf(m.kwh, 1) +
      '</td><td class="num">' + nf(cl, 2) + '</td><td class="num">' + nf(lo, 2) + '</td><td class="num">' + nf(sv, 2) + "</td></tr>";
  }
  function nMonthCard(m) {
    var cl = nCloud(m.tin, m.tout), lo = nElec(m.kwh), sv = cl - lo;
    return '<div class="rowcard" tabindex="0" data-row="' + esc(m.m) + '"><div class="rh"><b>' + esc(m.m) + "</b>" +
      '<span class="badge ' + (sv >= 0 ? "ok" : "bad") + '">' + vf(sv, "€", 2) + "</span></div><dl>" +
      "<dt>Dopyty</dt><dd>" + nf(m.q, 0) + "</dd><dt>Tokeny</dt><dd>" + nf(m.tin + m.tout, 1) + " M</dd>" +
      "<dt>Cloud (odhad)</dt><dd>" + vf(cl, "€", 2) + "</dd><dt>Lokálne</dt><dd>" + vf(lo, "€", 2) + "</dd></dl></div>";
  }
  function nMonthDetail(m) {
    var cl = nCloud(m.tin, m.tout), lo = nElec(m.kwh), sv = cl - lo;
    A.detail("Náklady · " + m.m,
      dl([["Dopyty", nf(m.q, 0)], ["Vstupné tokeny", nf(m.tin, 1) + " M"], ["Výstupné tokeny", nf(m.tout, 1) + " M"],
        ["Spotreba", vf(m.kwh, "kWh", 1)], ["Cena v cloude (odhad)", vf(cl, "€", 2)], ["Elektrina lokálne", vf(lo, "€", 2)],
        ["Úspora", vf(sv, "€", 2)], ["Náklad na dopyt lokálne", vf(lo / m.q, "€", 4)],
        ["Sadzba (Nastavenia)", nf(SH.rate(), 2) + " € / 1M tok."]]) +
      "<p>Cena cloudu je prepočet objemu tokenov cez sadzbu z Nastavení. Nie je to faktúra.</p>",
      [{ label: "Upraviť sadzbu", fn: function () { A.closeDetail(); A.go("nastavenia"); } }, { label: "Zavrieť", fn: A.closeDetail }]);
  }
  function nRenderMonths(rows) {
    $("#n-months-b").innerHTML = rows.map(nMonthRow).join("");
    $("#n-months-c").innerHTML = rows.map(nMonthCard).join("");
    A.bindRows($("#n-months-b"), function (k) { return rows.filter(function (m) { return m.m === k; })[0]; }, nMonthDetail);
    $$("#n-months-c .rowcard").forEach(function (c2) {
      c2.addEventListener("click", function () { nMonthDetail(rows.filter(function (m) { return m.m === c2.getAttribute("data-row"); })[0]); });
    });
  }

  function nRecompute() {
    var rate = SH.rate();
    var cloud = nCloud(N.tokIn, N.tokOut), elec = nElec(N.kwh), save = cloud - elec;

    A.count($("#n-hero"), save, 2, "€");
    $("#n-hero-sub").textContent = "Za posledných 30 dní. " + nf(N.tokIn + N.tokOut, 1) + " M tokenov a " + nf(N.q, 0) +
      " dopytov by v cloude pri sadzbe " + nf(rate, 2) + " € / 1M stálo " + nf(cloud, 2) + " €; lokálne stáli " + nf(elec, 2) +
      " € na elektrine (" + nf(N.kwh, 1) + " kWh). Hardvér sa v tomto čísle neamortizuje.";
    $("#n-rate-v").textContent = nf(rate, 2) + " € / 1M";
    $("#n-kpi-q-d").textContent = nf(N.q, 0) + " dopytov · " + nf(elec / N.q, 4) + " € elektrina / dopyt";

    var d30 = A.days(30);
    var tin = jit(71, 30, N.tokIn / 30, 0.7, 3);
    var tout = jit(72, 30, N.tokOut / 30, 0.18, 3);
    var tokSpec = {
      type: "bar", height: 220, title: "Tokeny za deň",
      caption: "posledných 30 dní · 1 stĺpec = 1 deň · denné delenie dopočítané z mesačného súčtu",
      xTitle: "Deň",
      series: [
        { key: "i", label: "Vstup", color: "var(--teal)", unit: "M tok.", dec: 2, data: tin },
        { key: "o", label: "Výstup", color: "var(--gold)", unit: "M tok.", dec: 2, data: tout }
      ],
      x: { labels: d30 }, yLeft: { unit: "M tok.", min: 0, dec: 1 },
      onPoint: function (i2, lab, pts) {
        var ci = (pts[0].y + pts[1].y) * rate;
        A.detail("Tokeny · " + lab,
          dl([["Deň", String(lab)], ["Vstup", nf(pts[0].y, 2) + " M"], ["Výstup", nf(pts[1].y, 2) + " M"],
            ["Cena v cloude (odhad)", vf(ci, "€", 3)], ["Lokálne", vf((N.kwh / 30) * N.rkwh, "€", 3)]]),
          [{ label: "Zavrieť", fn: A.closeDetail }]);
      }
    };
    if (N.ch.tok) N.ch.tok.update(tokSpec); else N.ch.tok = C.render("#n-tok", tokSpec);
    altTable("#n-tok", tokSpec);

    var kwhD = jit(81, 30, N.kwh / 30, 0.5, 3);
    var eurD = kwhD.map(function (v) { return +(v * N.rkwh).toFixed(3); });
    var elSpec = {
      type: "line", height: 220, title: "Spotreba elektriny",
      caption: "posledných 30 dní · 1 bod = 1 deň · odhad z priemerného príkonu 95 W",
      xTitle: "Deň",
      series: [
        { key: "k", label: "Spotreba", color: "var(--teal)", unit: "kWh", axis: "left", dec: 2, data: kwhD },
        { key: "e", label: "Cena", color: "var(--gold)", unit: "€", axis: "right", dec: 2, data: eurD }
      ],
      x: { labels: d30 }, yLeft: { unit: "kWh", min: 0, max: 4, dec: 1 }, yRight: { unit: "€", min: 0, max: 1.2, dec: 2 },
      onPoint: function (i2, lab, pts) {
        A.detail("Elektrina · " + lab,
          dl([["Deň", String(lab)], ["Spotreba", vf(pts[0].y, "kWh", 2)], ["Cena", vf(pts[1].y, "€", 3)], ["Sadzba", vf(N.rkwh, "€/kWh", 2)]]),
          [{ label: "Zavrieť", fn: A.closeDetail }]);
      }
    };
    if (N.ch.el) N.ch.el.update(elSpec); else N.ch.el = C.render("#n-elec", elSpec);
    altTable("#n-elec", elSpec);

    var qD = jit(91, 30, N.q / 30, 90, 0);
    var locQ = [], cloQ = [];
    for (var k = 0; k < 30; k++) {
      var qq = Math.max(60, qD[k]);
      locQ.push(+((kwhD[k] * N.rkwh) / qq).toFixed(5));
      cloQ.push(+(((tin[k] + tout[k]) * rate) / qq).toFixed(5));
    }
    var pqSpec = {
      type: "line", height: 220, title: "Náklad na jeden dopyt",
      caption: "posledných 30 dní · 1 bod = 1 deň · obe krivky v eurách na jednej osi",
      xTitle: "Deň",
      series: [
        { key: "l", label: "Lokálne", color: "var(--good)", unit: "€", dec: 4, data: locQ },
        { key: "c", label: "Cloud (odhad)", color: "var(--neutral)", unit: "€", dec: 4, dash: true, data: cloQ }
      ],
      x: { labels: d30 }, yLeft: { unit: "€", min: 0, dec: 3 },
      onPoint: function (i2, lab, pts) {
        A.detail("Náklad na dopyt · " + lab,
          dl([["Deň", String(lab)], ["Lokálne", vf(pts[0].y, "€", 5)], ["Cloud (odhad)", vf(pts[1].y, "€", 5)],
            ["Pomer", pts[0].y ? nf(pts[1].y / pts[0].y, 1) + "×" : "—"]]),
          [{ label: "Zavrieť", fn: A.closeDetail }]);
      }
    };
    if (N.ch.pq) N.ch.pq.update(pqSpec); else N.ch.pq = C.render("#n-perq", pqSpec);
    altTable("#n-perq", pqSpec);

    nRenderMonths(N.months);
  }

  A.screens.naklady = {
    title: "Náklady", group: "Systém",
    init: function () {
      renderAppCost();
      A.apps.onChange(renderAppCost);
      jSpark("#n-spk-tok", 141, 1.75, 0.5, "var(--teal)", "M", 2);
      jSpark("#n-spk-kwh", 142, 2.28, 0.6, "var(--gold)", "kWh", 2);
      jSpark("#n-spk-q", 143, 0.0018, 0.001, "var(--good)", "€", 4);
      A.count($("#n-kpi-tok .kv"), 1.75, 2);
      A.count($("#n-kpi-kwh .kv"), 68.4, 1);
      A.count($("#n-kpi-q .kv"), 0.0018, 4);

      $("#n-kpi-tok").addEventListener("click", function () {
        A.detail("Tokeny za 30 dní",
          dl([["Spolu", "52,4 M"], ["Vstup", "42,8 M"], ["Výstup", "9,6 M"], ["Dopytov", nf(N.q, 0)],
            ["Priemer / deň", "1,75 M"], ["Merané", "objem tokenov, počet dopytov"]]),
          [{ label: "Zavrieť", fn: A.closeDetail }]);
      });
      $("#n-kpi-kwh").addEventListener("click", function () {
        A.detail("Spotreba elektriny",
          dl([["Za 30 dní", vf(N.kwh, "kWh", 1)], ["Príkon (priemer)", "≈ 95 W"], ["Cena elektriny", vf(N.rkwh, "€/kWh", 2)],
            ["Náklad", vf(nElec(N.kwh), "€", 2)]]) + "<p>Príkon 95 W je odhad; kWh sa meria na zásuvke.</p>",
          [{ label: "Zavrieť", fn: A.closeDetail }]);
      });
      $("#n-kpi-q").addEventListener("click", function () {
        A.toast("Náklad na dopyt sa odvíja od latencie — pozri Jadro.", "ok"); A.go("jadro");
      });
      $("#n-torates").addEventListener("click", function () { A.go("nastavenia"); });

      $("#n-csv").addEventListener("click", function () {
        var cols = ["Mesiac", "Dopyty", "Vstup (M tok.)", "Výstup (M tok.)", "kWh", "Cloud (EUR)", "Lokálne (EUR)", "Úspora (EUR)"];
        var rows = N.months.map(function (m) {
          var cl = nCloud(m.tin, m.tout), lo = nElec(m.kwh);
          return [m.m, m.q, nf(m.tin, 1), nf(m.tout, 1), nf(m.kwh, 1), nf(cl, 2), nf(lo, 2), nf(cl - lo, 2)];
        });
        A.download("aura-naklady.csv", A.toCSV(cols, rows), "text/csv;charset=utf-8");
        A.toast("Stiahnuté: aura-naklady.csv (" + N.months.length + " riadkov).", "ok");
      });

      A.sortable($("#n-months"), function () { return N.months; }, nRenderMonths);
      A.onState("rate", function () { nRecompute(); });
      nRecompute();
    },
    onShow: function () { }
  };

  /* ============================================================
     3) OBSERVABILITA — Upozornenia + Logy + Dostupnosť (taby)
     ============================================================ */
  var U = {
    active: [
      { id: "u1", lvl: "warn", t: "Latencia /api/search nad cieľom 1 s",
        d: "p50 = 4,2 s, p95 nad 6 s. Z toho 4,05 s je embedovanie dopytu na CPU.",
        since: "31. 7. 2026 09:14", src: "produktový cieľ (nie pravidlo)", go: "p50" },
      { id: "u2", lvl: "warn", t: "Embed prekryv pod prahom",
        d: "3 z 20 párov SK↔EN mimo očakávania. Najhorší zhodný pár 0,460, najlepší nezhodný 0,502.",
        since: "31. 7. 2026 08:19", src: "eval batéria", go: "prekryv" },
      { id: "u3", lvl: "info", t: "Fronta: 2 zlyhané úlohy reindexu",
        d: "reindex:Z3 (Marketing & SEO) vyčerpal 3 pokusy, presunutý do failed_jobs.",
        since: "31. 7. 2026 11:20", src: "queue worker", go: "reindex" }
    ],
    hist: [
      { lvl: "critical", t: "Ollama neodpovedá na /api/tags", when: "31. 7. 2026 11:03", took: "3 min 21 s", by: "automatický reštart" },
      { lvl: "error", t: "Spojenie s Postgres prerušené", when: "31. 7. 2026 10:58", took: "58 s", by: "retry vrstva" },
      { lvl: "warn", t: "Teplota CPU 79 °C · throttling", when: "31. 7. 2026 16:44", took: "11 min", by: "samo odznelo" },
      { lvl: "error", t: "MCP nástroj eshop_stock vrátil 500", when: "31. 7. 2026 14:22", took: "61 s", by: "opakovanie" },
      { lvl: "critical", t: "Disk /var nad 90 %", when: "1. 8. 2026 05:20", took: "1 min 39 s", by: "čistenie starých záloh" }
    ],
    rules: [
      { id: "r1", name: "Ollama nedostupná", cond: "/api/tags neodpovedá", lvl: "critical", thr: 3, unit: "pokusy", on: true, shared: null },
      { id: "r2", name: "RAM na hrane", cond: "nad prahom % z 48 GB", lvl: "warn", thr: 85, unit: "%", on: true, shared: "ramThr" },
      { id: "r3", name: "Kvalita odpovedí", cond: "hit@5 pod prahom", lvl: "warn", thr: 80, unit: "%", on: true, shared: "qualThr" },
      { id: "r4", name: "Latencia vyhľadávania", cond: "p50 /api/search nad prahom", lvl: "warn", thr: 6, unit: "s", on: false, shared: "latThr" }
    ],
    ch: {}
  };
  function cloneRules(rs) { return rs.map(function (r) { var o = {}; for (var k in r) o[k] = r[k]; return o; }); }
  U.draft = cloneRules(U.rules);

  A.alerts = function () { return U.active.slice(); };
  A.alertApp = function (a) {
    var hit = A.apps.all().filter(function (app) {
      var hay = A.fold((a.t || "") + " " + (a.d || "") + " " + (a.src || ""));
      return [app.logq, app.name].concat(app.deps || []).some(function (t) { return t && hay.indexOf(A.fold(t)) > -1; });
    });
    return hit[0] || null;
  };
  function uBell() {
    var b = document.getElementById("bellCount");
    var n = U.active.length;
    if (b) b.textContent = n;
    var ab = $("#u-act-b");
    if (ab) { ab.textContent = n === 0 ? "žiadne" : (n + (n < 5 ? " aktívne" : " aktívnych")); ab.className = "badge " + (n === 0 ? "ok" : "warn"); }
  }

  function uAlertDetail(a) {
    A.detail("Upozornenie · " + a.t,
      dl([["Závažnosť", a.lvl], ["Vzniklo", a.since], ["Zdroj", a.src], ["Stav", "aktívne"], ["Popis", a.d]]) +
      "<p>Vyriešiť = príčina je odstránená. Stlmiť len skryje upozornenie načas — podmienka môže trvať ďalej.</p>",
      [
        { label: "Prejsť na kontext", fn: function () { A.closeDetail(); A.go("observabilita", a.go); } },
        { label: "Vyriešiť", fn: function () { A.closeDetail(); uResolve(a.id, "vyriešené"); } },
        { label: "Stlmiť načas", kind: "ghost", fn: function () { A.closeDetail(); uMuteMenu(a); } },
        { label: "Zavrieť", fn: A.closeDetail }
      ]);
  }
  function uMuteMenu(a) {
    A.detail("Stlmiť · " + a.t,
      "<p>Upozornenie sa presunie do histórie a načas sa neozve. Podmienka sa vyhodnocuje ďalej.</p>",
      [
        { label: "Stlmiť na 1 hodinu", fn: function () { A.closeDetail(); uResolve(a.id, "stlmené na 1 h"); } },
        { label: "Stlmiť na deň", fn: function () { A.closeDetail(); uResolve(a.id, "stlmené na deň"); } },
        { label: "Stlmiť na týždeň", fn: function () { A.closeDetail(); uResolve(a.id, "stlmené na týždeň"); } },
        { label: "Zrušiť", fn: A.closeDetail }
      ]);
  }
  function uResolve(id, how) {
    var idx = -1, i;
    for (i = 0; i < U.active.length; i++) if (U.active[i].id === id) idx = i;
    if (idx < 0) return;
    var a = U.active[idx];
    U.active.splice(idx, 1);
    var muted = how.indexOf("stlmené") === 0;
    U.hist.unshift({ lvl: a.lvl, t: a.t, when: a.since, took: muted ? "—" : "manuálne", by: how });
    uRenderActive(); uRenderHist(); uBell();
    A.toast("Upozornenie " + how + ": " + a.t, muted ? "warn" : "ok");
  }
  /* filter podľa appky (Q44) — platí na upozornenia aj logy */
  var OBAPP = "";
  function obApp() { return OBAPP ? A.apps.bySlug(OBAPP) : null; }
  function obAppMatch(a) {
    var app = obApp(); if (!app) return true;
    var hay = A.fold((a.t || "") + " " + (a.d || "") + " " + (a.src || ""));
    return [app.logq, app.name].concat(app.deps || []).some(function (t) { return t && hay.indexOf(A.fold(t)) > -1; });
  }
  function uRenderActive() {
    var host = $("#u-active");
    var list = U.active.filter(obAppMatch);
    if (!list.length) {
      host.innerHTML = emptyHtml(obApp() ? "Pre appku " + obApp().name + " nie sú aktívne upozornenia." : "Žiadne aktívne upozornenia. Systém je čistý.", null, null);
      return;
    }
    host.innerHTML = list.map(function (a) {
      var cls = a.lvl === "info" ? "" : (a.lvl === "warn" ? " warn" : " bad");
      /* .alert je flex-row bez wrap v shell.css → povolíme wrap inline, text flexuje,
         akcie sú v samostatnej skupine ktorá sa na úzkom zlomí pod text (0 pretoku @360) */
      return '<div class="alert' + cls + '" style="margin-bottom:9px;flex-wrap:wrap" data-id="' + a.id + '">' +
        '<span class="ai"></span><div style="flex:1 1 200px;min-width:180px"><b>' + esc(a.t) + "</b><span>" + esc(a.d) + " · od " + esc(a.since) + "</span></div>" +
        '<div class="filt" style="margin:0;gap:8px">' +
        '<button class="btn ghost" type="button" data-a="detail">Detail</button>' +
        '<button class="btn ghost" type="button" data-a="mute">Stlmiť načas</button>' +
        '<button class="btn" type="button" data-a="fix">Vyriešiť</button></div></div>';
    }).join("");
    $$("#u-active .alert").forEach(function (box) {
      var id = box.getAttribute("data-id");
      var a = U.active.filter(function (x) { return x.id === id; })[0];
      $$("button", box).forEach(function (b) {
        b.addEventListener("click", function () {
          var act = b.getAttribute("data-a");
          if (act === "detail") uAlertDetail(a);
          else if (act === "mute") uMuteMenu(a);
          else uResolve(id, "vyriešené");
        });
      });
    });
  }
  function uRenderHist() {
    var host = $("#u-hist");
    if (!U.hist.length) { host.innerHTML = emptyHtml("História je prázdna.", null, null); return; }
    host.innerHTML = '<div class="feed">' + U.hist.map(function (h, i) {
      var d = h.lvl === "critical" || h.lvl === "error" ? "r" : (h.lvl === "warn" ? "a" : "ok");
      return '<button class="fi" type="button" data-i="' + i + '"><span class="fd ' + d + '"></span>' +
        '<span class="fx"><b>' + esc(h.t) + "</b><span>" + esc(h.when) + " · " + esc(h.took) + " · " + esc(h.by) + "</span></span>" +
        '<span class="ft">' + esc(h.lvl) + "</span></button>";
    }).join("") + "</div>";
    $$("#u-hist .fi").forEach(function (b, i) {
      b.addEventListener("click", function () {
        var h = U.hist[i];
        A.detail("Záznam · " + h.t,
          dl([["Závažnosť", h.lvl], ["Vzniklo", h.when], ["Čas / stav", h.took], ["Rieš.", h.by]]),
          [{ label: "Otvoriť logy", fn: function () { A.closeDetail(); A.go("observabilita", "logy"); } }, { label: "Zavrieť", fn: A.closeDetail }]);
      });
    });
  }

  /* --- pravidlá: rozpracovaný (staged) stav --- */
  function uRulesDirty() {
    return U.draft.some(function (d, i) { return d.thr !== U.rules[i].thr || d.on !== U.rules[i].on; });
  }
  function uRuleRow(r) {
    var b = r.lvl === "critical" ? "bad" : "warn";
    return '<tr tabindex="0" data-id="' + r.id + '"><td class="k">' + esc(r.name) + "</td><td>" + esc(r.cond) + "</td>" +
      '<td><span class="badge ' + b + '">' + esc(r.lvl) + "</span></td>" +
      '<td class="num"><input id="' + r.id + '-thr" type="number" step="1" min="0" value="' + r.thr +
      '" aria-label="Prah pravidla ' + esc(r.name) + '" style="width:76px;background:var(--card-2);border:1px solid var(--line);border-radius:8px;padding:4px 7px;font-size:13px;text-align:right">' +
      ' <label for="' + r.id + '-thr" class="note">' + esc(r.unit) + "</label></td>" +
      '<td><input id="' + r.id + '-on" type="checkbox"' + (r.on ? " checked" : "") + ' aria-label="Zapnuté ' + esc(r.name) + '"> ' +
      '<label for="' + r.id + '-on" class="note">' + (r.on ? "zap" : "vyp") + "</label></td></tr>";
  }
  function uRuleCard(r) {
    /* editovateľná karta (mobil): prah + zap/vyp priamo, Uložiť/Zrušiť je v hornom bare.
       Vlastné ID so sufixom -c, aby sa nezrážali so skrytou tabuľkou (duplicitné ID). */
    var b = r.lvl === "critical" ? "bad" : "warn";
    return '<div class="rowcard" data-id="' + r.id + '" style="cursor:default"><div class="rh"><b>' + esc(r.name) + "</b>" +
      '<span style="flex:1"></span><span class="badge ' + b + '">' + esc(r.lvl) + "</span></div>" +
      '<dl><dt>Podmienka</dt><dd>' + esc(r.cond) + "</dd></dl>" +
      '<div class="filt" style="margin:10px 0 0;gap:10px">' +
        '<span style="display:flex;align-items:center;gap:6px">' +
          '<label for="' + r.id + '-thr-c" class="note">Prah</label>' +
          '<input id="' + r.id + '-thr-c" type="number" step="1" min="0" value="' + r.thr +
          '" aria-label="Prah pravidla ' + esc(r.name) + '" style="width:90px;background:var(--card);border:1px solid var(--line);border-radius:8px;padding:6px 8px;font-size:14px;text-align:right">' +
          '<span class="note">' + esc(r.unit) + "</span></span>" +
        '<span style="display:flex;align-items:center;gap:6px">' +
          '<input id="' + r.id + '-on-c" type="checkbox"' + (r.on ? " checked" : "") + ' aria-label="Zapnuté ' + esc(r.name) + '">' +
          '<label for="' + r.id + '-on-c" class="note">' + (r.on ? "zapnuté" : "vypnuté") + "</label></span>" +
        '<span class="sp" style="flex:1"></span>' +
        '<button class="btn ghost" type="button" data-a="detail">Detail</button>' +
      "</div></div>";
  }
  function uRulesBar() {
    var d = uRulesDirty();
    var bar = $("#u-rules-dirty");
    bar.textContent = d ? "Neuložené zmeny pravidiel" : "Žiadne neuložené zmeny";
    bar.className = "badge " + (d ? "warn" : "mute");
    $("#u-rules-save").disabled = !d; $("#u-rules-cancel").disabled = !d;
    $("#u-rules-b").textContent = U.draft.filter(function (r) { return r.on; }).length + " zo " + U.draft.length + " zapnutých";
  }
  function uRenderRules(rows) {
    /* rows param z Aura.sortable pracuje nad draftom */
    var src = rows || U.draft;
    $("#u-rules-b2").innerHTML = src.map(uRuleRow).join("");
    $("#u-rules-c").innerHTML = src.map(uRuleCard).join("");
    function onLabelText(el) {
      var lbl = el.parentNode.querySelector("label");
      if (lbl) lbl.textContent = el.id.indexOf("-c") > -1 ? (el.checked ? "zapnuté" : "vypnuté") : (el.checked ? "zap" : "vyp");
    }
    src.forEach(function (r) {
      /* prah aj prepínač sú v dvoch pohľadoch (tabuľka + karta) — obojsmerná synchronizácia */
      function bindThr(el) {
        if (!el) return;
        el.addEventListener("click", function (e) { e.stopPropagation(); });
        el.addEventListener("input", function () {
          var v = parseFloat(this.value);
          if (isNaN(v) || v < 0) return;
          r.thr = v;
          var isCard = this.id.indexOf("-c") > -1;
          var other = document.getElementById(isCard ? r.id + "-thr" : r.id + "-thr-c");
          if (other && other !== this) other.value = v;
          uRulesBar();
        });
      }
      function bindOn(el) {
        if (!el) return;
        el.addEventListener("click", function (e) { e.stopPropagation(); });
        el.addEventListener("change", function () {
          r.on = this.checked; onLabelText(this);
          var isCard = this.id.indexOf("-c") > -1;
          var other = document.getElementById(isCard ? r.id + "-on" : r.id + "-on-c");
          if (other && other !== this) { other.checked = r.on; onLabelText(other); }
          uRulesBar();
        });
      }
      bindThr(document.getElementById(r.id + "-thr"));
      bindThr(document.getElementById(r.id + "-thr-c"));
      bindOn(document.getElementById(r.id + "-on"));
      bindOn(document.getElementById(r.id + "-on-c"));
    });
    function ruleDetail(r) {
      A.detail("Pravidlo · " + r.name,
        dl([["Podmienka", r.cond], ["Závažnosť", r.lvl], ["Prah (rozpracovaný)", nf(r.thr, 0) + " " + r.unit],
          ["Stav", r.on ? "zapnuté" : "vypnuté"], ["Kanál", "zvonček v hlavičke + zápis do logu"],
          ["Propagácia", r.shared ? "po Uložiť sa rozpošle do Jadra" : "lokálne"]]) +
        "<p>Prah a zap/vyp sa menia priamo v tabuľke a platia až po Uložiť.</p>",
        [{ label: "Zavrieť", fn: A.closeDetail }]);
    }
    $$("#u-rules-b2 tr").forEach(function (tr) {
      var r = src.filter(function (x) { return x.id === tr.getAttribute("data-id"); })[0];
      tr.addEventListener("click", function (e) { if (e.target.tagName === "INPUT" || e.target.tagName === "LABEL") return; ruleDetail(r); });
      tr.addEventListener("keydown", function (e) { if (e.key === "Enter") ruleDetail(r); });
    });
    $$("#u-rules-c .rowcard").forEach(function (c2, i) { c2.addEventListener("click", function () { ruleDetail(src[i]); }); });
    uRulesBar();
  }
  function uRulesSave() {
    U.rules = cloneRules(U.draft);
    U.draft.forEach(function (r) { if (r.shared) A.setShared(r.shared, r.thr); });
    uRulesBar();
    A.toast("Pravidlá uložené · prahy rozposlané do Jadra.", "ok");
  }
  function uRulesCancel() {
    A.confirm("Zrušiť zmeny pravidiel?", "Prahy a prepínače sa vrátia na poslednú uloženú hodnotu.",
      function () { U.draft = cloneRules(U.rules); uRenderRules(); A.toast("Zmeny pravidiel zrušené.", "ok"); }, "Zrušiť zmeny", true);
  }

  /* --- LOGY --- */
  var L = { page: 0, per: 50, q: "", lvl: "", zone: "", src: "", r0: null, r1: null, tail: false, lastScroll: 0, ch: {} };
  var RAW = [
    ["31. 7. 2026 00:03:12", "info", "cron", "—", "Nočná záloha grafu pamäte spustená (714 uzlov)", 0],
    ["31. 7. 2026 00:04:48", "info", "cron", "—", "Záloha dokončená · 41,8 MB · /var/backups/hades/2026-07-31.tar.zst", 96000],
    ["31. 7. 2026 00:12:05", "debug", "queue", "—", "Fronta prázdna, worker prechádza do spánku", 2],
    ["31. 7. 2026 01:30:00", "info", "cron", "—", "Reindex embeddingov naplánovaný na 03:00", 1],
    ["31. 7. 2026 02:14:37", "warn", "ollama", "—", "Model qwen3:4b uvoľnený z pamäte po 5 min nečinnosti (keep_alive)", 40],
    ["31. 7. 2026 02:14:39", "info", "ollama", "—", "qwen3:4b znovu zavedený na vyžiadanie", 3120],
    ["31. 7. 2026 03:00:02", "info", "cron", "Z1", "Reindex embeddingov spustený pre oblasť Vývoj & kód (271 uzlov)", 0],
    ["31. 7. 2026 03:07:41", "info", "recall", "Z1", "Reindex dokončený · 271 vektorov · 1 024 dim.", 459000],
    ["31. 7. 2026 03:07:44", "error", "recall", "Z3", "Reindex oblasti Marketing & SEO zlyhal: timeout embedovania po 120 s", 120000],
    ["31. 7. 2026 03:07:45", "warn", "queue", "Z3", "Úloha reindex:Z3 zaradená na opakovanie (pokus 1 z 3)", 3],
    ["31. 7. 2026 03:20:11", "error", "recall", "Z3", "Reindex oblasti Marketing & SEO zlyhal: timeout embedovania po 120 s", 120000],
    ["31. 7. 2026 03:20:12", "warn", "queue", "Z3", "Úloha reindex:Z3 zaradená na opakovanie (pokus 2 z 3)", 2],
    ["31. 7. 2026 04:02:55", "debug", "laravel", "—", "GC session storage · 38 záznamov odstránených", 14],
    ["31. 7. 2026 05:41:09", "info", "nginx", "—", "Certifikát pre localhost:8082 platný ešte 284 dní", 5],
    ["31. 7. 2026 06:12:33", "info", "laravel", "Z2", "GET /api/search?q=stav+projektu+Aura · 5 zásahov", 4180],
    ["31. 7. 2026 06:12:33", "debug", "ollama", "Z2", "embed(bge-m3) dopyt · 1 024 dim.", 4060],
    ["31. 7. 2026 06:12:33", "debug", "recall", "Z2", "RecallEngine · 43 kandidátov · hit@5 áno", 68],
    ["31. 7. 2026 07:05:21", "info", "laravel", "Z4", "GET /api/search?q=moje+preferencie+pri+písaní · 5 zásahov", 4340],
    ["31. 7. 2026 07:41:02", "warn", "ollama", "—", "Vysoké zaťaženie CPU pri embedovaní: 94 % počas 12 s", 12000],
    ["31. 7. 2026 08:00:00", "info", "cron", "Z2", "Ranná synchronizácia e-shopu spustená", 1],
    ["31. 7. 2026 08:00:14", "info", "mcp", "Z2", "MCP kontext zostavený · 11 uzlov · 8 190 tokenov", 640],
    ["31. 7. 2026 08:03:47", "info", "laravel", "Z2", "GET /api/search?q=záruka+na+náradie · 5 zásahov", 4210],
    ["31. 7. 2026 08:03:47", "debug", "recall", "Z2", "Najlepší zásah: uzol #412 „Reklamácie a záruka“ · skóre 0,712", 51],
    ["31. 7. 2026 08:19:58", "warn", "recall", "Z3", "Prekryv SK↔EN pod prahom: dodacia-lehota ↔ delivery-time = 0,460", 12],
    ["31. 7. 2026 08:20:01", "warn", "recall", "Z3", "Nezhodný pár nad prahom: refund ↔ black-hole = 0,502", 9],
    ["31. 7. 2026 09:14:22", "warn", "laravel", "—", "/api/search p50 = 4,2 s prekročilo produktový cieľ 1 s", 4200],
    ["31. 7. 2026 09:14:22", "debug", "laravel", "—", "Rozklad p50: embed 4 050 ms · recall 65 ms · serializácia 55 ms", 4170],
    ["31. 7. 2026 09:31:40", "info", "laravel", "Z1", "POST /api/mind/learn · uzol #715 „Refaktor mind.js na moduly“", 220],
    ["31. 7. 2026 09:31:41", "debug", "recall", "Z1", "Vektor uložený · 1 024 dim. · index prepočítaný", 118],
    ["31. 7. 2026 10:02:19", "info", "laravel", "Z5", "GET /api/search?q=paleta+pre+tmavú+tému · 4 zásahy", 4090],
    ["31. 7. 2026 10:44:03", "debug", "vite", "Z1", "HMR update · resources/js/aura/chart.js", 340],
    ["31. 7. 2026 10:58:12", "error", "laravel", "Z1", "SQLSTATE[08006]: spojenie s Postgres prerušené počas zápisu", 8010],
    ["31. 7. 2026 10:58:13", "info", "laravel", "Z1", "Spojenie s Postgres obnovené na prvý pokus", 950],
    ["31. 7. 2026 11:03:55", "critical", "ollama", "—", "Ollama neodpovedá na /api/tags · 3 pokusy zlyhali", 15000],
    ["31. 7. 2026 11:04:12", "critical", "laravel", "—", "/api/search vracia 503 · jadro je bez zavedeného modelu", 12],
    ["31. 7. 2026 11:06:41", "info", "ollama", "—", "Ollama znovu dostupná · qwen3:4b a bge-m3 zavedené", 21400],
    ["31. 7. 2026 11:06:42", "info", "laravel", "—", "/api/search opäť odpovedá 200", 4310],
    ["31. 7. 2026 11:20:08", "warn", "queue", "Z3", "Úloha reindex:Z3 zlyhala natrvalo (3 z 3) · presunutá do failed_jobs", 4],
    ["31. 7. 2026 11:41:17", "info", "mcp", "Z1", "MCP nástroj mind_recall · 7 uzlov vrátených", 340],
    ["31. 7. 2026 12:00:00", "info", "cron", "—", "Poludňajší eval smoke test · 8 dopytov", 34000],
    ["31. 7. 2026 12:00:34", "info", "laravel", "—", "Smoke test OK · router 8 z 8 správne", 2],
    ["31. 7. 2026 12:18:52", "debug", "ollama", "Z1", "Kontext orezaný na 8 192 tokenov (bolo 9 310)", 7],
    ["31. 7. 2026 12:47:31", "info", "laravel", "Z2", "GET /api/search?q=obrat+za+jún · 5 zásahov", 4260],
    ["31. 7. 2026 13:05:09", "warn", "laravel", "—", "Voľná RAM klesla na 14,9 GB zo 48 GB", 3],
    ["31. 7. 2026 13:05:10", "debug", "laravel", "—", "Zavedené modely 3,8 GB · index 6,2 GB · Postgres 4,1 GB", 2],
    ["31. 7. 2026 13:22:44", "info", "laravel", "Z3", "POST /api/seo/audit · 34 URL · 2 nálezy", 18400],
    ["31. 7. 2026 13:59:01", "debug", "mcp", "Z4", "MCP kontext odmietnutý: dopyt mimo povolených zón", 3],
    ["31. 7. 2026 14:07:16", "info", "laravel", "Z1", "GET /api/search?q=ako+funguje+RecallEngine · 5 zásahov", 4180],
    ["31. 7. 2026 14:22:07", "error", "mcp", "Z2", "MCP nástroj eshop_stock vrátil 500 · upstream nedostupný", 5200],
    ["31. 7. 2026 14:22:08", "warn", "queue", "Z2", "eshop_stock zaradené na opakovanie o 60 s", 2],
    ["31. 7. 2026 14:23:09", "info", "mcp", "Z2", "eshop_stock OK na druhý pokus · 1 284 položiek", 3100],
    ["31. 7. 2026 15:01:33", "info", "laravel", "Z5", "GET /api/search?q=typografia+Playfair+Display · 3 zásahy", 3980],
    ["31. 7. 2026 15:30:12", "debug", "recall", "—", "Cache vektorov: 68 % zásahov · 1 240 položiek", 1],
    ["31. 7. 2026 16:11:48", "info", "laravel", "Z2", "POST /api/kpi/refresh · 12 metrík prepočítaných", 2400],
    ["31. 7. 2026 16:44:20", "warn", "ollama", "—", "Teplota CPU 79 °C · throttling na 3,9 GHz", 0],
    ["31. 7. 2026 17:02:03", "info", "laravel", "Z1", "GET /api/search?q=štruktúra+modulov+mind · 5 zásahov", 4220],
    ["31. 7. 2026 18:15:37", "debug", "queue", "—", "Plánovaný reštart workera po 6 h behu", 1200],
    ["31. 7. 2026 19:30:44", "info", "laravel", "Z3", "GET /api/search?q=pozície+kľúčových+slov · 5 zásahov", 4110],
    ["31. 7. 2026 20:05:19", "error", "ollama", "Z5", "Embedovanie zlyhalo: prázdny vstup po normalizácii", 12],
    ["31. 7. 2026 21:12:02", "info", "laravel", "Z4", "POST /api/mind/learn · uzol #716 „Preferujem stručné zhrnutia“", 210],
    ["31. 7. 2026 22:00:00", "info", "cron", "—", "Večerná kontrola integrity indexu spustená", 1],
    ["31. 7. 2026 22:03:18", "info", "cron", "—", "Integrita OK · 714 uzlov · 0 osirelých vektorov", 198000],
    ["31. 7. 2026 22:41:55", "debug", "recall", "Z2", "Prehľadaných 160 uzlov oblasti Biznis & projekty · 96 ms", 96],
    ["31. 7. 2026 23:15:41", "debug", "laravel", "—", "Denná rotácia logov · 4 súbory · 12,4 MB", 620],
    ["31. 7. 2026 23:51:07", "info", "laravel", "Z1", "GET /api/search?q=chyby+v+logoch+za+dnešok · 5 zásahov", 4190],
    ["1. 8. 2026 00:03:10", "info", "cron", "—", "Nočná záloha grafu pamäte spustená (716 uzlov)", 0],
    ["1. 8. 2026 00:05:02", "info", "cron", "—", "Záloha dokončená · 42,1 MB", 112000],
    ["1. 8. 2026 02:41:55", "warn", "ollama", "—", "Model bge-m3 uvoľnený z pamäte (keep_alive 5 min)", 38],
    ["1. 8. 2026 05:20:31", "critical", "laravel", "—", "Disk /var nad 90 %: 921 GB z 1 000 GB", 4],
    ["1. 8. 2026 05:22:10", "info", "cron", "—", "Zálohy staršie než 30 dní odstránené · uvoľnených 118 GB", 9400],
    ["1. 8. 2026 07:40:26", "info", "laravel", "Z2", "GET /api/search?q=objednávky+bez+platby · 5 zásahov", 4230]
  ];
  L.rows = RAW.map(function (r, i) {
    return { id: i + 1, t: r[0], lvl: r[1], src: r[2], zone: r[3], msg: r[4], ms: r[5],
      hour: parseInt(r[0].split(" ").pop().slice(0, 2), 10), req: "req_" + (1000 + i * 7).toString(36), trace: "tr-" + (0x4a10 + i * 13).toString(16) };
  }).reverse();

  function lSources() { var s = {}, out = []; L.rows.forEach(function (r) { s[r.src] = 1; }); for (var k in s) out.push(k); return out.sort(); }
  function lMatch(r) {
    if (L.lvl && r.lvl !== L.lvl) return false;
    if (L.zone && r.zone !== L.zone) return false;
    if (L.src && r.src !== L.src) return false;
    if (L.r0 != null && (r.hour < L.r0 || r.hour > L.r1)) return false;
    if (OBAPP) {
      var _app = obApp();
      if (_app) {
        var _hay = A.fold(r.t + " " + r.src + " " + r.zone + " " + r.msg);
        var _t = [_app.logq].concat(_app.deps || []);
        if (!_t.some(function (x) { return x && _hay.indexOf(A.fold(x)) > -1; })) return false;
      }
    }
    if (L.q) {
      var hay = A.fold([r.t, r.lvl, r.src, r.zone, zoneLabelByCode(r.zone), r.msg, r.ms + " ms", r.req, r.trace].join(" "));
      if (hay.indexOf(A.fold(L.q)) < 0) return false;
    }
    return true;
  }
  function lFiltered() { return L.rows.filter(lMatch); }
  function lDur(ms) { return ms >= 1000 ? nf(ms / 1000, 2) + " s" : nf(ms, 0) + " ms"; }
  function lDetail(r) {
    A.detail("Log #" + r.id + " · " + r.lvl,
      dl([["Čas", r.t], ["Úroveň", r.lvl], ["Zdroj", r.src], ["Zóna", zoneLabelByCode(r.zone)], ["Trvanie", lDur(r.ms)],
        ["Request", r.req], ["Trace", r.trace], ["Správa", r.msg]]) +
      "<p>Súvisiaci dopyt: <span class=\"mono\">" + esc(r.msg.indexOf("q=") > -1 ? r.msg.slice(r.msg.indexOf("q=") + 2).split(" ")[0].replace(/\+/g, " ") : "—") + "</span></p>" +
      "<p>Kontext MCP: " + esc(zoneLabelByCode(r.zone)) + ", model qwen3:4b + bge-m3, AMD 9900, CPU inferencia.</p>",
      [
        { label: "Filtrovať tento zdroj", fn: function () { A.closeDetail(); $("#l-src2").value = r.src; L.src = r.src; L.page = 0; lRender(); } },
        { label: "Kopírovať trace", fn: function () {
            var txt = r.trace + " · " + (r.lvl || "") + " · " + (r.src || "") + " · " + (r.msg || r.text || "");
            if (w.navigator && navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(txt).then(function () { A.toast("Trace " + r.trace + " skopírovaný", "ok"); },
                function () { A.toast("Kopírovanie zlyhalo", "warn"); });
            } else { A.toast("Schránka nie je dostupná v tomto prehliadači", "warn"); }
          } },
        { label: "Zavrieť", fn: A.closeDetail }
      ]);
  }
  function lRow(r) {
    return '<tr tabindex="0" data-id="' + r.id + '"><td class="k">' + A.hl(r.t, L.q) + "</td><td>" + lvlBadge(r.lvl) +
      "</td><td>" + A.hl(r.src, L.q) + "</td><td>" + A.hl(r.zone, L.q) + "</td><td>" + A.hl(r.msg, L.q) + '</td><td class="num">' + lDur(r.ms) + "</td></tr>";
  }
  function lCard(r) {
    return '<div class="rowcard" tabindex="0" data-id="' + r.id + '"><div class="rh">' + lvlBadge(r.lvl) +
      '<b style="font-size:12px">' + A.hl(r.t, L.q) + "</b></div><dl><dt>Zdroj</dt><dd>" + A.hl(r.src, L.q) +
      "</dd><dt>Zóna</dt><dd>" + A.hl(r.zone, L.q) + "</dd><dt>Správa</dt><dd>" + A.hl(r.msg, L.q) +
      "</dd><dt>Trvanie</dt><dd>" + lDur(r.ms) + "</dd></dl></div>";
  }
  function lBindRows() {
    function bind(el2) {
      var r = L.rows.filter(function (x) { return String(x.id) === el2.getAttribute("data-id"); })[0];
      if (!r) return;
      el2.addEventListener("click", function () { lDetail(r); });
      el2.addEventListener("keydown", function (e) { if (e.key === "Enter") lDetail(r); });
    }
    $$("#l-tbody tr").forEach(bind); $$("#l-cards .rowcard").forEach(bind);
  }
  function lRender() {
    var all = lFiltered(), total = all.length, pages = Math.max(1, Math.ceil(total / L.per));
    if (L.page >= pages) L.page = pages - 1;
    var from = L.page * L.per, slice = all.slice(from, from + L.per);
    $("#l-tbody").innerHTML = slice.map(lRow).join("");
    $("#l-cards").innerHTML = slice.map(lCard).join("");
    $("#l-count").textContent = total === L.rows.length ? nf(total, 0) + " záznamov" : nf(total, 0) + " z " + nf(L.rows.length, 0) + " záznamov";
    $("#l-page").textContent = total === 0 ? "žiadne záznamy" :
      "zobrazené " + nf(from + 1, 0) + "–" + nf(from + slice.length, 0) + " z " + nf(total, 0) + " · strana " + (L.page + 1) + " z " + pages;
    $("#l-prev").disabled = L.page === 0; $("#l-next").disabled = L.page >= pages - 1;
    var emp = $("#l-empty");
    if (total === 0) {
      emp.innerHTML = emptyHtml("Žiadny záznam nezodpovedá filtru. Skús skrátiť dopyt alebo zrušiť filtre.", "l-empty-clear", "Zrušiť filtre");
      $("#l-empty-clear").addEventListener("click", lClear);
    } else emp.innerHTML = "";
    lBindRows();
  }
  function lClear() {
    L.q = ""; L.lvl = ""; L.zone = ""; L.src = ""; L.r0 = null; L.r1 = null; L.page = 0;
    $("#l-q").value = ""; $("#l-lvl").value = ""; $("#l-zone").value = ""; $("#l-src2").value = "";
    $("#l-range-n").textContent = "Ťahaním myšou po grafe vyberieš hodinový rozsah.";
    $("#ob-fchip").innerHTML = "";
    lRender(); A.toast("Filtre zrušené.", "ok");
  }
  function lHist() {
    var labels = [], i;
    for (i = 0; i < 24; i++) labels.push((i < 10 ? "0" : "") + i + ":00");
    var lv = ["debug", "info", "warn", "error", "critical"];
    var colors = { debug: "var(--ink-3)", info: "var(--teal)", warn: "var(--gold)", error: "var(--amber)", critical: "var(--red)" };
    var series = lv.map(function (l) {
      var d = new Array(24).fill(0);
      L.rows.forEach(function (r) { if (r.lvl === l) d[r.hour]++; });
      return { key: l, label: l, color: colors[l], unit: "ks", dec: 0, data: d };
    });
    var spec = {
      type: "stacked", height: 210, title: "Objem logov po úrovniach",
      caption: "31. 7. – 1. 8. 2026 · 1 stĺpec = 1 hodina dňa · ťahaním vyberieš rozsah",
      xTitle: "Hodina", series: series, x: { labels: labels }, yLeft: { unit: "ks", min: 0, dec: 0 },
      onRange: function (i0, i1, labs) {
        L.r0 = i0; L.r1 = i1; L.page = 0;
        $("#l-range-n").textContent = "Rozsah " + labs[i0] + " – " + labs[i1] + " · tabuľka je filtrovaná.";
        lRender(); A.toast("Filtrujem na rozsah " + labs[i0] + " – " + labs[i1] + ".", "ok");
      },
      onPoint: function (i0, lab) {
        L.r0 = i0; L.r1 = i0; L.page = 0;
        $("#l-range-n").textContent = "Hodina " + lab + " · tabuľka je filtrovaná.";
        lRender(); A.toast("Filtrujem na hodinu " + lab + ".", "ok");
      }
    };
    L.ch.hist = C.render("#l-hist", spec); altTable("#l-hist", spec);
  }
  function lSrcChart(state) {
    var srcs = lSources();
    var mk = function (lvl, color) {
      return { key: lvl, label: lvl, color: color, unit: "ks", dec: 0,
        data: srcs.map(function (s) { return L.rows.filter(function (r) { return r.src === s && r.lvl === lvl; }).length; }) };
    };
    L.ch.src = C.render("#l-src", {
      type: "stacked", height: 210, title: "Chyby a varovania podľa zdroja",
      caption: "31. 7. – 1. 8. 2026 · 1 stĺpec = 1 zdroj", xTitle: "Zdroj", state: state || "ok",
      errorText: "Agregácia podľa zdroja zlyhala — index logov sa práve prestavuje.",
      onRetry: function () { lSrcChart("ok"); A.toast("Agregácia obnovená.", "ok"); },
      series: [mk("warn", "var(--gold)"), mk("error", "var(--amber)"), mk("critical", "var(--red)")],
      x: { labels: srcs }, yLeft: { unit: "ks", min: 0, dec: 0 },
      onPoint: function (i, lab) { L.src = lab; L.page = 0; $("#l-src2").value = lab; lRender(); A.toast("Filtrujem na zdroj " + lab + ".", "ok"); }
    });
  }
  function lTailRow() {
    var d = new Date(), p = function (x) { return (x < 10 ? "0" : "") + x; };
    var t = d.getDate() + ". " + (d.getMonth() + 1) + ". " + d.getFullYear() + " " + p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds());
    var pool = [
      ["debug", "recall", "Z1", "RecallEngine · 38 kandidátov · hit@5 áno", 74],
      ["info", "laravel", "Z2", "GET /api/search?q=stav+skladu · 5 zásahov", 4205],
      ["debug", "ollama", "Z3", "embed(bge-m3) dopyt · 1 024 dim.", 4041],
      ["info", "mcp", "Z1", "MCP nástroj mind_recall · 6 uzlov vrátených", 302],
      ["warn", "ollama", "—", "Latencia embedovania nad 4,5 s", 4520],
      ["info", "queue", "Z4", "Úloha embed:refresh dokončená", 880]
    ];
    var x = pool[Math.floor(Math.random() * pool.length)];
    L.rows.unshift({ id: L.rows.length + 1000, t: t, lvl: x[0], src: x[1], zone: x[2], msg: x[3], ms: x[4],
      hour: d.getHours(), req: "req_live" + (L.rows.length % 97), trace: "tr-live" + (L.rows.length % 97) });
    if (L.rows.length > 400) L.rows.pop();
  }

  /* --- DOSTUPNOSŤ + súhrn --- */
  function obDrawAvail() {
    $("#u-s-new").textContent = "34"; $("#u-s-done").textContent = "31"; $("#u-s-mttr").textContent = "12 min"; $("#u-s-up").textContent = "99,4 %";

    C.render("#u-tl", {
      type: "timeline", height: 210, title: "Časová os incidentov", caption: "posledných 7 dní",
      lanes: ["critical", "error", "warn", "info"], axisLabels: ["26. 7.", "28. 7.", "30. 7.", "1. 8."],
      items: [
        { at: 0.04, dur: 0.02, level: "warn", label: "Reindex Z3 timeout", time: "26. 7. 03:07", resolved: "22 min" },
        { at: 0.18, dur: 0.008, level: "error", label: "MCP eshop_stock 500", time: "27. 7. 14:41", resolved: "61 s" },
        { at: 0.33, dur: 0.05, level: "info", label: "Plánovaná údržba indexu", time: "28. 7. 02:00", resolved: "38 min" },
        { at: 0.47, dur: 0.014, level: "warn", label: "Teplota CPU 81 °C", time: "29. 7. 15:22", resolved: "9 min" },
        { at: 0.62, dur: 0.006, level: "error", label: "Postgres spojenie prerušené", time: "30. 7. 21:05", resolved: "44 s" },
        { at: 0.74, dur: 0.009, level: "critical", label: "Ollama neodpovedá", time: "31. 7. 11:03", resolved: "3 min 21 s" },
        { at: 0.78, dur: 0.03, level: "warn", label: "Prekryv embeddingov 3 z 20", time: "31. 7. 08:19", resolved: null },
        { at: 0.94, dur: 0.007, level: "critical", label: "Disk /var nad 90 %", time: "1. 8. 05:20", resolved: "1 min 39 s" }
      ],
      onItem: function (it) {
        A.detail("Incident · " + it.label,
          dl([["Kedy", it.time], ["Závažnosť", it.level], ["Trvanie", it.resolved || "trvá"], ["Stav", it.resolved ? "vyriešené" : "aktívne"]]),
          [{ label: "Otvoriť logy", fn: function () { A.closeDetail(); A.go("observabilita", "logy"); } }, { label: "Zavrieť", fn: A.closeDetail }]);
      }
    });

    var d14 = A.days(14);
    var cw = jit(201, 14, 1.8, 3.4, 0).map(function (v) { return Math.max(0, Math.round(v)); });
    var ce = jit(202, 14, 0.8, 2.4, 0).map(function (v) { return Math.max(0, Math.round(v)); });
    var cc = jit(203, 14, 0.25, 1.1, 0).map(function (v) { return Math.max(0, Math.round(v)); });
    var ci = jit(204, 14, 2.2, 3.6, 0).map(function (v) { return Math.max(0, Math.round(v)); });
    var barSpec = {
      type: "stacked", height: 210, title: "Počet upozornení v čase podľa závažnosti",
      caption: "14 dní · 1 stĺpec = 1 deň · evidencia sa začala viesť 19. 7. 2026, staršie dni dopočítané",
      xTitle: "Deň",
      series: [
        { key: "c", label: "critical", color: "var(--red)", unit: "ks", dec: 0, data: cc },
        { key: "e", label: "error", color: "var(--amber)", unit: "ks", dec: 0, data: ce },
        { key: "w", label: "warn", color: "var(--gold)", unit: "ks", dec: 0, data: cw },
        { key: "i", label: "info", color: "var(--teal)", unit: "ks", dec: 0, data: ci }
      ],
      x: { labels: d14 }, yLeft: { unit: "ks", min: 0, dec: 0 },
      onPoint: function (i, lab, pts) {
        A.detail("Upozornenia · " + lab,
          dl([["Deň", String(lab)], ["critical", nf(pts[0].y, 0)], ["error", nf(pts[1].y, 0)], ["warn", nf(pts[2].y, 0)],
            ["info", nf(pts[3].y, 0)], ["Spolu", nf(pts[0].y + pts[1].y + pts[2].y + pts[3].y, 0)]]),
          [{ label: "Zavrieť", fn: A.closeDetail }]);
      }
    };
    C.render("#u-bars", barSpec); altTable("#u-bars", barSpec);

    var labels90 = A.days(90);
    var badDays = { 74: "bad", 61: "warn", 45: "warn", 22: "warn", 12: "warn", 88: "warn", 89: "warn" };
    var days = labels90.map(function (l, i) {
      var st = badDays[i] || "ok";
      return { label: l, state: st, text: st === "ok" ? "bez incidentu" : (st === "warn" ? "degradácia (pomalé odpovede)" : "výpadok Ollamy 3 min 21 s") };
    });
    var okCount = days.filter(function (d) { return d.state === "ok"; }).length;
    $("#u-up-b").textContent = nf(99.4, 1) + " %";
    C.render("#u-up", { type: "uptime", height: 60, title: "Dostupnosť za 90 dní",
      caption: "90 dní · " + okCount + " dní bez incidentu · 1 výpadok · priebeh mimo posledného týždňa dopočítaný", days: days });

    var mttr = jit(210, 14, 12.5, 16, 1).map(function (v) { return Math.max(0.5, v); });
    var avg = mttr.reduce(function (a, b) { return a + b; }, 0) / mttr.length;
    var mttrSpec = {
      type: "line", height: 210, title: "Čas do vyriešenia",
      caption: "14 dní · 1 bod = medián dňa · dopočítané z histórie incidentov", xTitle: "Deň",
      series: [{ key: "m", label: "Medián času do vyriešenia", color: "var(--gold)", unit: "min", dec: 1, data: mttr }],
      x: { labels: d14 }, yLeft: { unit: "min", min: 0, dec: 0 },
      thresholds: [{ value: +avg.toFixed(1), axis: "left", label: "priemer " + nf(avg, 1) + " min", color: "var(--teal)" }],
      onPoint: function (i, lab, pts) {
        A.detail("Čas do vyriešenia · " + lab,
          dl([["Deň", String(lab)], ["Medián", vf(pts[0].y, "min", 1)], ["Priemer obdobia", vf(avg, "min", 1)], ["Rozdiel", vf(pts[0].y - avg, "min", 1)]]),
          [{ label: "Zavrieť", fn: A.closeDetail }]);
      }
    };
    C.render("#u-mttr", mttrSpec); altTable("#u-mttr", mttrSpec);
  }

  /* --- taby --- */
  function obTab(name) {
    if (["upozornenia", "logy", "dostupnost"].indexOf(name) < 0) name = "upozornenia";
    $$("#ob-tabs button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-t") === name)); });
    ["upozornenia", "logy", "dostupnost"].forEach(function (t) { $("#ob-" + t).hidden = t !== name; });
    if (w.AuraChart) setTimeout(w.AuraChart.reflowAll, 40);
  }
  function obFchip(text, onClear) {
    var host = $("#ob-fchip");
    host.innerHTML = '<div class="fchip">filtrované z <b>' + esc(text) + '</b> <button type="button" aria-label="Zrušiť filter">✕</button></div>';
    host.querySelector("button").addEventListener("click", function () { host.innerHTML = ""; onClear(); });
  }

  function obSetApp(slug) {
    OBAPP = slug || "";
    var sel = $("#ob-app"); if (sel && sel.value !== OBAPP) sel.value = OBAPP;
    var app = obApp();
    if (app) obFchip("appka " + app.name, function () { obSetApp(""); });
    else { var h = $("#ob-fchip"); if (h) h.innerHTML = ""; }
    uRenderActive(); lRender();
  }

  A.screens.observabilita = {
    title: "Observabilita", group: "Systém",
    init: function () {
      /* taby */
      $$("#ob-tabs button").forEach(function (b) { b.addEventListener("click", function () { obTab(b.getAttribute("data-t")); }); });

      /* filter appky — upozornenia aj logy (Q44) */
      function obFillApps() {
        var sel = $("#ob-app"), cur = sel.value;
        sel.innerHTML = '<option value="">Všetky appky</option>' + A.apps.all().map(function (a) { return '<option value="' + esc(a.slug) + '">' + esc(a.name) + "</option>"; }).join("");
        sel.value = cur;
      }
      obFillApps();
      A.apps.onChange(obFillApps);
      $("#ob-app").addEventListener("change", function () { obSetApp(this.value); });

      /* súhrnné dlaždice → detail s rozpisom + drill na tab Dostupnosť (priebeh v čase) */
      var OB_TILE = {
        "u-kpi-new": { t: "Vzniknuté upozornenia · 30 dní", d: "Počet nových incidentov za posledných 30 dní. Rozklad podľa závažnosti a priebeh v čase je na tabe Dostupnosť." },
        "u-kpi-done": { t: "Vyriešené · 30 dní", d: "Koľko incidentov sa za 30 dní uzavrelo. Vrátane automaticky vyriešených po obnovení stavu." },
        "u-kpi-mttr": { t: "Medián času do vyriešenia", d: "Polovica incidentov sa vyrieši rýchlejšie ako táto hodnota. Trend MTTR v čase je na tabe Dostupnosť." },
        "u-kpi-up": { t: "Dostupnosť · 90 dní", d: "Podiel času, počas ktorého jadro odpovedalo. Denné dlaždice dostupnosti sú na tabe Dostupnosť. Evidencia sa vedie od zavedenia tejto obrazovky (simulované)." }
      };
      Object.keys(OB_TILE).forEach(function (id) {
        var el = $("#" + id); if (!el) return;
        el.addEventListener("click", function () {
          var info = OB_TILE[id];
          A.detail(info.t, "<p>" + esc(info.d) + "</p>", [
            { label: "Otvoriť Dostupnosť", kind: "", fn: function () { A.closeDetail(); obTab("dostupnost"); } }
          ]);
        });
      });

      /* upozornenia */
      uRenderActive(); uRenderHist(); uRenderRules(); uBell();
      A.sortable($("#u-rules"), function () { return U.draft; }, uRenderRules);
      $("#u-rules-save").addEventListener("click", uRulesSave);
      $("#u-rules-cancel").addEventListener("click", uRulesCancel);
      $("#u-hist-clear").addEventListener("click", function () {
        A.confirm("Vyčistiť históriu upozornení?",
          "Zmizne " + U.hist.length + " vyriešených záznamov. Grafy nižšie zostanú nezmenené (agregované denné počty).",
          function () { U.hist = []; uRenderHist(); A.toast("História vyčistená.", "ok"); }, "Vyčistiť", true);
      });

      /* dostupnosť */
      obDrawAvail();

      /* logy — naplň selecty */
      var zsel = $("#l-zone");
      A.mem.AREAS.forEach(function (a) {
        var o = document.createElement("option"); o.value = a.zone; o.textContent = A.mem.zoneLabel(a); zsel.appendChild(o);
      });
      var oNone = document.createElement("option"); oNone.value = "—"; oNone.textContent = "— · bez zóny"; zsel.appendChild(oNone);
      var sel = $("#l-src2");
      lSources().forEach(function (s) { var o = document.createElement("option"); o.value = s; o.textContent = s; sel.appendChild(o); });

      lHist(); lSrcChart("ok"); lRender();
      A.sortable($("#l-tbl"), lFiltered, function (rows) {
        $("#l-tbody").innerHTML = rows.slice(0, L.per).map(lRow).join("");
        $("#l-cards").innerHTML = rows.slice(0, L.per).map(lCard).join("");
        lBindRows();
      });

      $("#l-q").addEventListener("input", function () { L.q = this.value.trim(); L.page = 0; lRender(); });
      $("#l-lvl").addEventListener("change", function () { L.lvl = this.value; L.page = 0; lRender(); });
      $("#l-zone").addEventListener("change", function () { L.zone = this.value; L.page = 0; lRender(); });
      $("#l-src2").addEventListener("change", function () { L.src = this.value; L.page = 0; lRender(); });
      $("#l-clear").addEventListener("click", lClear);
      $("#l-range-clear").addEventListener("click", function () {
        L.r0 = null; L.r1 = null; L.page = 0;
        $("#l-range-n").textContent = "Výber rozsahu zrušený. Ťahaním myšou po grafe vyberieš nový."; lRender();
      });
      $("#l-prev").addEventListener("click", function () { if (L.page > 0) { L.page--; lRender(); } });
      $("#l-next").addEventListener("click", function () { L.page++; lRender(); });
      $("#l-csv").addEventListener("click", function () {
        var rows = lFiltered(), cols = ["Čas", "Úroveň", "Zdroj", "Zóna", "Správa", "Trvanie (ms)", "Request", "Trace"];
        A.download("aura-logy.csv", A.toCSV(cols, rows.map(function (r) { return [r.t, r.lvl, r.src, r.zone, r.msg, r.ms, r.req, r.trace]; })), "text/csv;charset=utf-8");
        A.toast("Stiahnuté: aura-logy.csv · " + rows.length + " riadkov (aktuálny filter).", "ok");
      });
      $("#l-json").addEventListener("click", function () {
        var rows = lFiltered();
        A.download("aura-logy.json", JSON.stringify(rows, null, 2), "application/json;charset=utf-8");
        A.toast("Stiahnuté: aura-logy.json · " + rows.length + " záznamov (aktuálny filter).", "ok");
      });
      $("#l-tail").addEventListener("click", function () {
        L.tail = !L.tail; this.setAttribute("aria-pressed", String(L.tail)); this.classList.toggle("off", !L.tail);
        A.toast(L.tail ? "Live tail zapnutý — nové riadky pribúdajú hore." : "Live tail vypnutý.", L.tail ? "ok" : "warn");
      });
      w.addEventListener("scroll", function () { L.lastScroll = Date.now(); }, { passive: true });
      w.addEventListener("aura:tick", function () {
        if (!L.tail || A.state.screen !== "observabilita") return;
        if (Date.now() - L.lastScroll < 1600) { $("#l-range-n").textContent = "Live tail pozastavený počas scrollovania."; return; }
        lTailRow();
        if (L.page === 0) lRender(); else $("#l-count").textContent = nf(lFiltered().length, 0) + " záznamov (pribúdajú)";
      });
    },
    onShow: function (sub) {
      uBell();
      if (!sub) { obTab("upozornenia"); return; }
      if (sub.indexOf("app:") === 0) {
        obTab("upozornenia"); obSetApp(sub.slice(4));
        A.toast("Filtrované na appku" + (obApp() ? " " + obApp().name : ""), "ok");
        return;
      }
      if (["upozornenia", "logy", "dostupnost"].indexOf(sub) > -1) { obTab(sub); return; }
      /* deep-link do logov s predvyplneným filtrom + fchip */
      obTab("logy");
      var levels = ["debug", "info", "warn", "error", "critical"];
      L.q = ""; L.lvl = ""; L.zone = ""; L.src = ""; L.r0 = null; L.r1 = null; L.page = 0;
      $("#l-lvl").value = ""; $("#l-q").value = "";
      if (levels.indexOf(sub) > -1) {
        L.lvl = sub; $("#l-lvl").value = sub;
        obFchip("úroveň " + sub, function () { L.lvl = ""; $("#l-lvl").value = ""; lRender(); });
      } else {
        L.q = sub; $("#l-q").value = sub;
        obFchip("hľadať „" + sub + "“", function () { L.q = ""; $("#l-q").value = ""; lRender(); });
      }
      lRender();
      A.toast("Logy filtrované: " + sub, "ok");
    }
  };

  /* ============================================================
     4) NASTAVENIA — jediný vlastník model/prahy/sadzba, staged Uložiť
     ============================================================ */
  var ST_FIELDS = ["st-model", "st-embed", "st-ctx", "st-threads", "st-keep", "st-ram", "st-lat", "st-qual", "st-zone", "st-rate", "st-backup", "st-lang", "set-theme"];
  var ST_LABELS = {
    "st-model": "Model routera", "st-embed": "Model embeddingu", "st-ctx": "Veľkosť kontextu", "st-threads": "Vlákien CPU",
    "st-keep": "Držať model v RAM", "st-ram": "Prah RAM", "st-lat": "Prah latencie", "st-qual": "Prah kvality recallu",
    "st-zone": "Predvolená zóna", "st-rate": "Sadzba externého modelu", "st-backup": "Plán záloh", "st-lang": "Jazyk rozhrania", "set-theme": "Téma"
  };
  var MODEL_GB = { "qwen3:4b": 2.6, "qwen3:8b": 5.2, "llama3.1:8b": 4.9, "qwen3:14b": 9.3, "qwen3:32b": 20.1 };
  var EMBED_GB = { "bge-m3": 1.2, "nomic-embed-text": 0.3, "mxbai-embed-large": 0.7 };
  var SYS_GB = 6.4, RAM_TOTAL = 48;
  var ST = { saved: {}, tested: false };
  var MCP_TOOLS = [
    { old: "mind_learn", neu: "aura_learn", calls: 412, alias: true },
    { old: "mind_recall", neu: "aura_recall", calls: 1284, alias: true },
    { old: "mind_activate", neu: "aura_activate", calls: 968, alias: true },
    { old: "mind_overview", neu: "aura_overview", calls: 143, alias: false },
    { old: "mind_decision", neu: "aura_decision", calls: 87, alias: false }
  ];
  function stVal(id) { var el = document.getElementById(id); return el ? el.value : ""; }
  function stSnapshot() { var o = {}; ST_FIELDS.forEach(function (f) { o[f] = stVal(f); }); return o; }
  function stDiffs() { return ST_FIELDS.filter(function (f) { return String(ST.saved[f]) !== String(stVal(f)); }); }
  function stRamGB() {
    var ctx = Math.max(512, Math.min(32768, +stVal("st-ctx") || 8192));
    return { model: MODEL_GB[stVal("st-model")] || 2.6, embed: EMBED_GB[stVal("st-embed")] || 1.2, ctx: +(ctx / 1024 * 0.14).toFixed(2), sys: SYS_GB,
      get total() { return +(this.model + this.embed + this.ctx + this.sys).toFixed(2); } };
  }
  function stValidateCtx() {
    var el = $("#st-ctx"), err = $("#st-ctx-err"), v = +el.value, bad = !isFinite(v) || v < 512 || v > 32768;
    err.style.display = bad ? "" : "none";
    if (bad) err.textContent = "Kontext musí byť celé číslo v rozsahu 512 – 32 768 tokenov. Zadané: " + (el.value || "prázdne") + ".";
    el.setAttribute("aria-invalid", String(bad));
    return !bad;
  }
  function stRamAlert() {
    var r = stRamGB(), box = $("#st-ram-alert"), pct = (r.total / RAM_TOTAL) * 100;
    if (r.total > RAM_TOTAL) {
      box.innerHTML = '<div class="alert bad"><span class="ai"></span><div><b>Nezmestí sa do RAM</b>Model ' + esc(stVal("st-model")) + " s kontextom " + nf(+stVal("st-ctx") || 0, 0) +
        " tokenov potrebuje " + nf(r.total, 1) + " GB, k dispozícii je " + nf(RAM_TOTAL, 0) + " GB. Ollamu zabije OOM killer pri načítaní.</div></div>";
    } else if (pct > 85) {
      box.innerHTML = '<div class="alert warn"><span class="ai"></span><div><b>Tesne pod hranicou</b>Odhad ' + nf(r.total, 1) + " GB je " + nf(pct, 1) +
        " % z 48 GB. Nad prahom " + esc(stVal("st-ram")) + " % sa spustí upozornenie. Plánovaný upgrade +48 GB RAM to odstráni.</div></div>";
    } else {
      box.innerHTML = '<div class="alert"><span class="ai"></span><div><b>Konfigurácia sa zmestí</b>Odhad ' + nf(r.total, 1) + " GB z 48 GB (" + nf(pct, 1) +
        " %) — model " + nf(r.model, 1) + " GB, embed " + nf(r.embed, 1) + " GB, kontext " + nf(r.ctx, 2) + " GB, systém " + nf(r.sys, 1) + " GB.</div></div>";
    }
  }
  function stCharts() {
    var r = stRamGB();
    C.render("#st-ch-ram", {
      type: "gauge", title: "Odhad využitia RAM", height: 190,
      value: Math.min(r.total, RAM_TOTAL), max: RAM_TOTAL, unit: "GB", dec: 1,
      color: r.total > RAM_TOTAL * 0.85 ? "var(--red)" : r.total > RAM_TOTAL * 0.6 ? "var(--amber)" : "var(--teal)",
      sub: nf(r.total, 1) + " z 48 GB · " + nf((r.total / RAM_TOTAL) * 100, 1) + " %"
    });
    var keys = Object.keys(MODEL_GB);
    var mSpec = {
      type: "bar", title: "Odhad RAM podľa modelu", height: 200,
      caption: "pri kontexte " + nf(+stVal("st-ctx") || 8192, 0) + " tok. · odhad = model + embed + kontext + systém",
      xTitle: "Model",
      series: [{ key: "g", label: "potrebná RAM", color: "var(--teal)", unit: "GB", dec: 1,
        data: keys.map(function (k) { var t = MODEL_GB[k] + r.embed + r.ctx + r.sys; return { y: +t.toFixed(1), color: t > RAM_TOTAL ? "var(--red)" : k === stVal("st-model") ? "var(--gold)" : "var(--teal)" }; }) }],
      x: { labels: keys.map(function (k) { return k.replace("qwen3:", "q").replace("llama3.1:", "l"); }) },
      yLeft: { unit: "GB", min: 0, max: 40, dec: 0 },
      thresholds: [{ value: RAM_TOTAL * 0.85, label: "prah 85 % z 48 GB", color: "var(--amber)" }],
      onPoint: function (i) {
        var k = keys[i], t = MODEL_GB[k] + r.embed + r.ctx + r.sys;
        A.detail(k, "<dl><dt>Váhy modelu</dt><dd>" + nf(MODEL_GB[k], 1) + " GB</dd><dt>Embed model</dt><dd>" + nf(r.embed, 1) +
          " GB</dd><dt>Kontext</dt><dd>" + nf(r.ctx, 2) + " GB</dd><dt>Systém</dt><dd>" + nf(r.sys, 1) + " GB</dd><dt>Spolu</dt><dd>" + nf(t, 1) +
          " GB z 48 GB</dd></dl><p>" + (t > RAM_TOTAL ? "Táto kombinácia sa do pamäte nezmestí." : "Zmestí sa, zostáva " + nf(RAM_TOTAL - t, 1) + " GB rezervy.") + "</p>",
          [{ label: "Nastaviť tento model", kind: "ghost", fn: function () { A.closeDetail(); $("#st-model").value = k; stDirty(); } }]);
      }
    };
    C.render("#st-ch-models", mSpec); altTable("#st-ch-models", mSpec);
  }
  function stDirty() {
    var d = stDiffs(), b = $("#st-dirty");
    b.textContent = d.length ? d.length + (d.length === 1 ? " neuložená zmena: " : d.length < 5 ? " neuložené zmeny: " : " neuložených zmien: ") + d.map(function (f) { return ST_LABELS[f]; }).join(", ") : "Žiadne neuložené zmeny";
    b.className = "badge " + (d.length ? "warn" : "mute");
    $("#st-save").disabled = !d.length; $("#st-cancel").disabled = !d.length;
    stValidateCtx(); stRamAlert(); stCharts();
  }
  function stRenderTools(rows) {
    $("#st-tbl tbody").innerHTML = rows.map(function (r, i) {
      return '<tr data-i="' + i + '" tabindex="0"><td class="mono">' + esc(r.old) + '</td><td class="k">' + esc(r.neu) +
        '</td><td class="num">' + nf(r.calls, 0) + '</td><td><span class="badge ' + (r.alias ? "ok" : "mute") + '">' + (r.alias ? "zapnutý" : "vypnutý") + "</span></td></tr>";
    }).join("");
    $$("#st-tbl tbody tr").forEach(function (tr, i) {
      function toggleAlias(r) {
        if (r.alias) {
          A.confirm("Vypnúť alias " + r.old + "?",
            "Deštruktívne: starý názov „" + r.old + "“ prestane existovať. Staršie relácie Claude Code, ktoré ho majú uložený, dostanú chybu neznámeho nástroja. Nový názov „" + r.neu + "“ funguje ďalej.",
            function () { r.alias = false; stRenderTools(MCP_TOOLS); A.toast("Alias " + r.old + " vypnutý", "warn"); }, "Vypnúť alias", true);
        } else {
          r.alias = true; stRenderTools(MCP_TOOLS); A.toast("Alias " + r.old + " zapnutý", "ok");
        }
      }
      function open() {
        var r = rows[i];
        A.detail(r.old + " → " + r.neu,
          "<dl><dt>Pôvodný názov</dt><dd>" + esc(r.old) + "</dd><dt>Nový názov</dt><dd>" + esc(r.neu) +
          "</dd><dt>Volaní za 30 dní</dt><dd>" + nf(r.calls, 0) + "</dd><dt>Alias</dt><dd>" + (r.alias ? "zapnutý — fungujú oba názvy" : "vypnutý — starý názov neexistuje") + "</dd></dl>" +
          "<p>Premenovanie je súčasťou refactoru z Hadesa na Auru. Kým je alias zapnutý, staršie relácie s uloženým starým názvom nespadnú.</p>",
          [{ label: r.alias ? "Vypnúť alias" : "Zapnúť alias", kind: r.alias ? "danger" : "ghost", fn: function () { A.closeDetail(); toggleAlias(r); } }, { label: "Zavrieť", fn: A.closeDetail }]);
      }
      tr.addEventListener("click", open);
      tr.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); open(); } });
    });
    $("#st-cards").innerHTML = rows.map(function (r) {
      return '<div class="rowcard"><div class="rh"><b class="mono">' + esc(r.old) + '</b><span style="flex:1"></span><span class="badge ' + (r.alias ? "ok" : "mute") + '">' + (r.alias ? "alias" : "bez aliasu") + "</span></div>" +
        "<dl><dt>Nový názov</dt><dd>" + esc(r.neu) + "</dd><dt>Volaní</dt><dd>" + nf(r.calls, 0) + "</dd></dl></div>";
    }).join("");
  }

  /* ---------- správa appiek v Nastaveniach (Q50 + Q36) ---------- */
  function stAppsRender() {
    var tb = $("#st-apps tbody"), cards = $("#st-apps-c");
    if (!tb) return;
    var list = A.apps.all();
    function cells(a) {
      return { deps: (a.deps || []).join(", ") || "žiadne", mcp: (a.mcp || []).join(", ") || "žiadne",
        state: a.paused ? '<span class="badge warn">pozastavená</span>' : '<span class="badge ok">beží</span>' };
    }
    tb.innerHTML = list.map(function (a, i) {
      var c = cells(a);
      return '<tr data-i="' + i + '"><td class="k">' + esc(a.name) + "</td><td>" + esc(a.kind) + "</td><td>" + esc(c.deps) +
        "</td><td>" + esc(c.mcp) + "</td><td>" + c.state +
        '</td><td><button class="btn ghost sm" type="button" data-edit="' + i + '">Upraviť</button></td></tr>';
    }).join("");
    cards.innerHTML = list.map(function (a, i) {
      var c = cells(a);
      return '<div class="rowcard"><div class="rh"><b>' + esc(a.name) + "</b>" + c.state + "</div><dl><dt>Typ</dt><dd>" + esc(a.kind) +
        "</dd><dt>Oddelenia</dt><dd>" + esc(c.deps) + "</dd><dt>MCP</dt><dd>" + esc(c.mcp) +
        '</dd></dl><button class="btn ghost sm" type="button" data-edit="' + i + '">Upraviť</button></div>';
    }).join("");
    $$("#v-nastavenia [data-edit]").forEach(function (b) {
      b.addEventListener("click", function () { stAppEditor(list[+b.getAttribute("data-edit")]); });
    });
  }
  function stAppEditor(app) {
    var deps = A.autos.deps, mcpAll = Object.keys(A.autos.MCP || {});
    var html =
      '<div class="field"><label for="sa-name">Názov</label><input type="text" id="sa-name" value="' + esc(app.name) + '"></div>' +
      '<div class="field"><label for="sa-desc">Popis</label><textarea id="sa-desc" rows="3">' + esc(app.desc || "") + "</textarea></div>" +
      '<div class="field"><label id="sa-deps-l">Oddelenia</label><div class="chips" id="sa-deps" role="group" aria-labelledby="sa-deps-l">' +
      deps.map(function (d) { return '<button type="button" class="chz" data-dep="' + esc(d) + '" aria-pressed="' + ((app.deps || []).indexOf(d) > -1) + '">' + esc(d) + "</button>"; }).join("") + "</div></div>" +
      '<div class="field"><label id="sa-mcp-l">MCP nástroje</label><div class="chips" id="sa-mcp" role="group" aria-labelledby="sa-mcp-l">' +
      mcpAll.map(function (n) { return '<button type="button" class="chz" data-mcp="' + esc(n) + '" aria-pressed="' + ((app.mcp || []).indexOf(n) > -1) + '">' + esc(n) + "</button>"; }).join("") + "</div></div>" +
      '<p class="note">Zmeny sa uložia až tlačidlom nižšie. Oddelenia určujú, ktoré automatizácie a uzly pamäte appka vidí.</p>';
    A.detail("Appka · " + app.name, html, [
      { label: "Odstrániť appku", kind: "danger", fn: function () {
        A.confirm("Odstrániť appku " + app.name + "?",
          "Zanikne len jej dashboard. Automatizácie (" + nf(A.apps.autos(app).length, 0) + ") aj uzly pamäte ostávajú nedotknuté a ostanú dostupné cez Automatizácie a Pamäť.",
          function () { A.apps.remove(app); A.closeDetail(); stAppsRender(); A.toast("Appka " + app.name + " odstránená", "ok"); }, "Odstrániť", true);
      } },
      { label: "Uložiť zmeny", fn: function () {
        app.name = $("#sa-name").value.trim() || app.name;
        app.desc = $("#sa-desc").value.trim();
        app.deps = $$("#sa-deps .chz[aria-pressed='true']").map(function (b) { return b.getAttribute("data-dep"); });
        app.mcp = $$("#sa-mcp .chz[aria-pressed='true']").map(function (b) { return b.getAttribute("data-mcp"); });
        A.apps.setPaused(app, app.paused);
        A.closeDetail(); stAppsRender(); A.toast("Appka " + app.name + " uložená", "ok");
      } }
    ]);
    setTimeout(function () {
      $$("#dp-body .chz").forEach(function (b) { b.addEventListener("click", function () { b.setAttribute("aria-pressed", b.getAttribute("aria-pressed") === "true" ? "false" : "true"); }); });
    }, 20);
  }

  A.screens.nastavenia = {
    title: "Nastavenia", group: "Systém",
    init: function () {
      stAppsRender();
      A.apps.onChange(stAppsRender);
      $("#st-app-new").addEventListener("click", function () { A.go("appky"); setTimeout(function () { if (w.Aura.appsNewForm) w.Aura.appsNewForm(); }, 300); });
      $("#st-rules").innerHTML = [
        { t: "Osobné údaje", d: "mená, e-maily, telefóny, adresy — nikdy neodchádzajú", cls: " r", on: "blokované" },
        { t: "Interné ceny a marže", d: "nákupné ceny, rabaty, obchodné podmienky", cls: " a", on: "blokované" },
        { t: "Zdrojový kód a cesty", d: "úryvky kódu, cesty k súborom, obsah .env", cls: " v", on: "blokované" },
        { t: "Obsah pamäte Hades", d: "uzly z lokálnej zóny sa von neposielajú", cls: "", on: "blokované" },
        { t: "Formulácia dopytu", d: "prepísaná otázka bez identifikátorov", cls: " ok", on: "povolené" }
      ].map(function (r) {
        return '<div class="fi" style="cursor:default"><span class="fd' + r.cls + '"></span>' +
          '<span class="fx"><b>' + esc(r.t) + "</b><span>" + esc(r.d) + '</span></span><span class="ft"><span class="badge ' + (r.on === "povolené" ? "ok" : "bad") + '">' + r.on + "</span></span></div>";
      }).join("");

      stRenderTools(MCP_TOOLS);
      A.sortable($("#st-tbl"), function () { return MCP_TOOLS; }, stRenderTools);
      $("#st-alias").addEventListener("click", function () {
        var allOn = MCP_TOOLS.every(function (t) { return t.alias; });
        A.confirm(allOn ? "Vypnúť všetky aliasy?" : "Zapnúť všetky aliasy?",
          allOn ? "Deštruktívne: všetky staré názvy mind_* prestanú existovať. Relácie, ktoré si ich pamätajú, dostanú chybu neznámeho nástroja."
            : "Oba názvy budú fungovať súčasne. Odporúčané na prechodné obdobie.",
          function () { MCP_TOOLS.forEach(function (t) { t.alias = !allOn; }); stRenderTools(MCP_TOOLS); A.toast(allOn ? "Všetky aliasy vypnuté" : "Všetky aliasy zapnuté", allOn ? "warn" : "ok"); },
          allOn ? "Vypnúť" : "Zapnúť", allOn);
      });

      /* zladenie so zdieľaným stavom, ak už existuje */
      var m = A.getShared("model", null); if (m && MODEL_GB[m]) $("#st-model").value = m;
      var rt = A.getShared("rate", null); if (rt != null) $("#st-rate").value = rt;
      var rth = A.getShared("ramThr", null); if (rth != null) $("#st-ram").value = rth;
      var lth = A.getShared("latThr", null); if (lth != null) $("#st-lat").value = lth;
      var qth = A.getShared("qualThr", null); if (qth != null) $("#st-qual").value = qth;

      ST.saved = stSnapshot();
      stDirty();

      ST_FIELDS.forEach(function (f) {
        var el = document.getElementById(f); if (!el) return;
        el.addEventListener(el.tagName === "SELECT" ? "change" : "input", function () {
          if (f === "set-theme") A.setTheme(el.value, true);
          stDirty();
        });
      });

      $("#st-save").addEventListener("click", function () {
        if (!stValidateCtx()) { A.toast("Kontext je mimo povoleného rozsahu — zmeny sa neuložili", "bad"); $("#st-ctx").focus(); return; }
        var d = stDiffs();
        ST.saved = stSnapshot();
        var mdl = stVal("st-model");
        A.state.model = mdl; A.state.embed = stVal("st-embed"); A.state.ctx = +stVal("st-ctx");
        A.state.rate = +stVal("st-rate"); A.state.zone = stVal("st-zone"); A.state.lang = stVal("st-lang");
        /* zdieľaný stav s prehrávaním — obrazovky Jadro/Náklady sa aktualizujú */
        A.setShared("model", mdl);
        A.setShared("embed", stVal("st-embed"));
        A.setShared("ctx", +stVal("st-ctx"));
        A.setShared("rate", +stVal("st-rate"));
        A.setShared("ramThr", +stVal("st-ram"));
        A.setShared("latThr", +stVal("st-lat"));
        A.setShared("qualThr", +stVal("st-qual"));
        w.dispatchEvent(new CustomEvent("aura:model", { detail: { model: mdl, ctx: +stVal("st-ctx"), embed: stVal("st-embed") } }));
        w.dispatchEvent(new CustomEvent("aura:rate", { detail: { rate: +stVal("st-rate") } }));
        A.setTheme(stVal("set-theme"), true);
        stDirty();
        A.toast("Uložených " + d.length + " zmien · model, prahy a sadzba rozposlané do ostatných obrazoviek", "ok");
      });
      $("#st-cancel").addEventListener("click", function () {
        A.confirm("Zrušiť neuložené zmeny?", stDiffs().length + " zmien sa vráti na poslednú uloženú hodnotu.", function () {
          ST_FIELDS.forEach(function (f) { var el = document.getElementById(f); if (el) el.value = ST.saved[f]; });
          A.setTheme(ST.saved["set-theme"], true); stDirty(); A.toast("Zmeny zrušené", "ok");
        }, "Zrušiť zmeny", true);
      });

      $("#st-test").addEventListener("click", function () {
        var b = $("#st-test-b"), out = $("#st-test-out");
        b.className = "badge info"; b.textContent = "testuje sa…";
        out.innerHTML = '<div class="trk" style="max-width:320px"><i id="st-tp" style="width:4%"></i></div>';
        var p = 0;
        var t = setInterval(function () {
          p += 12 + Math.random() * 14;
          var bar = $("#st-tp"); if (!bar) { clearInterval(t); return; }
          bar.style.width = Math.min(100, p).toFixed(0) + "%";
          if (p < 100) return;
          clearInterval(t);
          var r = stRamGB();
          if (r.total > RAM_TOTAL) {
            b.className = "badge bad"; b.textContent = "chyba";
            out.innerHTML = '<div class="alert bad"><span class="ai"></span><div><b>Ollama odpovedala, model sa nedá načítať</b>' +
              esc(stVal("st-model")) + " potrebuje " + nf(r.total, 1) + " GB, voľných je " + nf(RAM_TOTAL - SYS_GB, 1) +
              " GB. Server vrátil <span class=\"mono\">500 model requires more system memory</span>.</div></div>";
            A.toast("Test zlyhal — model sa nezmestí do RAM", "bad");
          } else {
            b.className = "badge ok"; b.textContent = "spojenie v poriadku";
            out.innerHTML = '<div class="alert"><span class="ai"></span><div><b>Ollama 0.6.2 · localhost:11434 · odozva 41 ms</b>' +
              "Dostupné modely: <span class=\"mono\">" + Object.keys(MODEL_GB).join(" · ") + " · " + Object.keys(EMBED_GB).join(" · ") + "</span></div></div>";
            A.toast("Ollama odpovedá · 8 modelov k dispozícii", "ok");
          }
          ST.tested = true;
        }, 180);
      });

      $("#st-tonaklady").addEventListener("click", function () { A.go("naklady"); });

      w.addEventListener("hashchange", function () {
        if (A.state.screen === "nastavenia") return;
        if (stDiffs().length) A.toast("Pozor: v Nastaveniach máte " + stDiffs().length + " neuložených zmien", "warn");
      });

      /* téma sa aplikuje naživo (topbar prepínač) — nie je to staged zmena.
         Zosynchronizuj baseline, aby prepnutie témy nešpinilo formulár. */
      w.addEventListener("aura:theme", function (e) {
        var t = (e.detail && e.detail.theme) || A.state.theme;
        var sel = $("#set-theme"); if (sel) sel.value = t;
        ST.saved["set-theme"] = t;
        if (A.state.screen === "nastavenia") stDirty();
      });
    },
    onShow: function () {
      var sel = $("#set-theme");
      if (sel && A.state.theme) sel.value = A.state.theme;
      ST.saved["set-theme"] = sel ? sel.value : "dark";
      stDirty();
    }
  };

  /* ---------- príkazy do Cmd-K ---------- */
  A.registerCmd([
    { label: "Spustiť eval batériu", hint: "Jadro", run: function () { A.go("jadro"); setTimeout(function () { var b = $("#j-eval"); if (b) b.click(); }, 260); } },
    { label: "Reštartovať jadro", hint: "Jadro", run: function () { A.go("jadro"); setTimeout(function () { var b = $("#j-restart"); if (b) b.click(); }, 260); } },
    { label: "Zobraziť chyby v logoch", hint: "Observabilita", run: function () { A.go("observabilita", "error"); } },
    { label: "Zobraziť varovania v logoch", hint: "Observabilita", run: function () { A.go("observabilita", "warn"); } },
    { label: "Export logov do CSV", hint: "Observabilita", run: function () { A.go("observabilita", "logy"); setTimeout(function () { var b = $("#l-csv"); if (b) b.click(); }, 320); } },
    { label: "Aktívne upozornenia", hint: "Observabilita", run: function () { A.go("observabilita", "upozornenia"); } },
    { label: "Dostupnosť systému", hint: "Observabilita", run: function () { A.go("observabilita", "dostupnost"); } },
    { label: "Prepočítať náklady", hint: "Náklady", run: function () { A.go("naklady"); } }
  ]);

})(window);
