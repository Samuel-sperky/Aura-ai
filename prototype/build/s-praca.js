/* ============================================================
   PRÁCA — Chat · Smernica · Automatizácie
   Volá výhradne Aura.mem / Aura shell / AuraChart.
   Uzly pamäte berie z Aura.mem (jeden zdroj pravdy), otvára cez Aura.mem.inspect.
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
  var NB = " ";
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function slugify(s) { return A().fold(s || "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

  function copyText(t, okMsg) {
    var ok = function () { A().toast(okMsg || "Skopírované do schránky", "ok"); };
    var fb = function () {
      var ta = document.createElement("textarea");
      ta.value = t; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.left = "-9999px";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); ok(); } catch (e) { A().toast("Kopírovanie sa nepodarilo, text vyberte ručne.", "bad"); }
      ta.remove();
    };
    if (w.navigator && navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok, fb);
    else fb();
  }

  function chNow() {
    var d = new Date(), p = function (x) { return (x < 10 ? "0" : "") + x; };
    return d.getDate() + ". " + (d.getMonth() + 1) + ". " + d.getFullYear() + " · " + p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds());
  }

  /* ---------- jednoduchý markdown (escapuje HTML) ---------- */
  var codeStore = [];
  function inline(s) {
    var out = esc(s);
    out = out.replace(/`([^`]+)`/g, function (m, c) { return '<code style="font-family:var(--mono);font-size:var(--fs-label);background:var(--card-2);border:1px solid var(--line);border-radius:4px;padding:1px 5px">' + c + "</code>"; });
    out = out.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
    out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
    return out;
  }
  function md(src) {
    var lines = String(src == null ? "" : src).split("\n"), out = [], i = 0, buf = [], list = null;
    function closeList() { if (list) { out.push("</" + list + ">"); list = null; } }
    function flushP() { if (!buf.length) return; out.push('<p style="margin:0 0 9px">' + inline(buf.join(" ")) + "</p>"); buf = []; }
    while (i < lines.length) {
      var ln = lines[i];
      if (/^```/.test(ln)) {
        flushP(); closeList();
        var lang = ln.replace(/^```/, "").trim(), code = []; i++;
        while (i < lines.length && !/^```/.test(lines[i])) { code.push(lines[i]); i++; }
        i++;
        var raw = code.join("\n"), ci = codeStore.push(raw) - 1;
        out.push('<div style="border:1px solid var(--line);border-radius:9px;overflow:hidden;margin:0 0 10px">' +
          '<div style="display:flex;align-items:center;gap:8px;background:var(--card-2);padding:5px 10px;border-bottom:1px solid var(--line)">' +
          '<span class="num" style="font-size:var(--fs-label);color:var(--ink-3)">' + esc(lang || "kód") + "</span><span style=\"flex:1\"></span>" +
          '<button class="btn ghost" data-code="' + ci + '" style="padding:3px 9px;font-size:var(--fs-label)">Kopírovať kód</button></div>' +
          '<pre style="margin:0;padding:10px 12px;overflow-x:auto;font-family:var(--mono);font-size:var(--fs-label);line-height:1.55">' + esc(raw) + "</pre></div>");
        continue;
      }
      if (/^\s*$/.test(ln)) { flushP(); closeList(); i++; continue; }
      var hm = ln.match(/^(#{1,4})\s+(.*)$/);
      if (hm) { flushP(); closeList(); var sz = [19, 15.5, 14, 12.5][hm[1].length - 1]; out.push('<div style="font-family:var(--disp);font-weight:600;font-size:' + sz + 'px;margin:12px 0 6px">' + inline(hm[2]) + "</div>"); i++; continue; }
      var um = ln.match(/^\s*[-*]\s+(.*)$/);
      if (um) { flushP(); if (list !== "ul") { closeList(); out.push('<ul style="margin:0 0 9px;padding-left:18px">'); list = "ul"; } out.push('<li style="margin-bottom:3px">' + inline(um[1]) + "</li>"); i++; continue; }
      var om = ln.match(/^\s*\d+[.)]\s+(.*)$/);
      if (om) { flushP(); if (list !== "ol") { closeList(); out.push('<ol style="margin:0 0 9px;padding-left:20px">'); list = "ol"; } out.push('<li style="margin-bottom:3px">' + inline(om[1]) + "</li>"); i++; continue; }
      if (/^\s*>\s?/.test(ln)) { flushP(); closeList(); out.push('<div style="border-left:3px solid var(--teal-2);padding:4px 0 4px 10px;margin:0 0 9px;color:var(--ink-2)">' + inline(ln.replace(/^\s*>\s?/, "")) + "</div>"); i++; continue; }
      buf.push(ln.trim()); i++;
    }
    flushP(); closeList();
    return out.join("");
  }
  function bindCodeCopy(root) {
    root.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("button[data-code]") : null;
      if (!b) return;
      copyText(codeStore[+b.getAttribute("data-code")] || "", "Blok kódu skopírovaný");
    });
  }

  /* ---------- tabuľková alternatíva grafu ---------- */
  function mkTable(cols, rows) {
    return '<table class="tbl"><thead><tr>' + cols.map(function (c, i) { return "<th" + (i ? ' class="num"' : "") + ">" + esc(c) + "</th>"; }).join("") + "</tr></thead><tbody>" +
      rows.map(function (r) { return "<tr>" + r.map(function (v, i) { return "<td" + (i ? ' class="num"' : ' class="k"') + ">" + esc(v) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table>";
  }
  function bindTableToggle(btnId, hostId, build) {
    var btn = $("#" + btnId), host = $("#" + hostId);
    if (!btn || !host) return;
    var orig = btn.textContent;
    btn.addEventListener("click", function () {
      if (host.hasAttribute("hidden")) { host.innerHTML = build(); host.removeAttribute("hidden"); btn.textContent = "Skryť tabuľku"; btn.setAttribute("aria-expanded", "true"); }
      else { host.setAttribute("hidden", ""); btn.textContent = orig; btn.setAttribute("aria-expanded", "false"); }
    });
  }

  /* ---------- MCP ikony (bez emoji) ---------- */
  var MCP_META = {
    "Asana": "#f06a6a", "Canva": "#00c4cc", "M365": "#d83b01", "Ahrefs": "#ff8800", "Zapier": "#ff4a00"
  };
  function mcpIcon(name) {
    var col = MCP_META[name] || "var(--teal)", ini = (name || "?").slice(0, 1).toUpperCase();
    return '<span class="num" title="' + esc(name) + '" aria-label="MCP nástroj ' + esc(name) + '" ' +
      'style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:5px;font-size:var(--fs-label);font-weight:700;color:#fff;background:' + col + ';margin-right:3px;vertical-align:-3px">' + esc(ini) + "</span>";
  }
  function mcpRow(list) { return (list || []).map(function (n) { return mcpIcon(n) + '<span style="font-size:var(--fs-label);margin-right:8px">' + esc(n) + "</span>"; }).join(""); }

  /* ---------- recall z Aura.mem (jeden zdroj pravdy) ---------- */
  function memRecall(q, n, appSlug) {
    n = n || 3;
    var res = mem().search(q || "");
    if (!res.length) {
      res = mem().nodes().slice().sort(function (a, b) { return b.str - a.str; }).map(function (nd) { return { node: nd, sc: { s: nd.str } }; });
    }
    /* kontext appky obmedzí zdroje len na jej uzly (Q42) */
    if (appSlug) {
      var app = A().apps.bySlug(appSlug);
      if (app) {
        var ids = {}; A().apps.nodes(app).forEach(function (x) { ids[x.id] = 1; });
        var only = res.filter(function (r) { return ids[r.node.id]; });
        res = only.length ? only : [];
      }
    }
    return res.slice(0, n).map(function (r) { return { node: r.node, score: +(r.sc.s || r.node.str).toFixed(3) }; });
  }

  /* ============================================================
     1 · CHAT
     ============================================================ */
  var CH = {
    convs: [], cur: null, streaming: false, timer: null, tps: [], model: "qwen3:4b",
    pendingSend: null, seq: 0, zone: "local", search: "", linked: {}, app: ""
  };
  var ZONE_TXT = {
    local: { b: "lokálna zóna", cls: "ok", note: "Lokálna zóna — nič neopúšťa tento stroj." },
    work: { b: "pracovná zóna", cls: "info", note: "Pracovná zóna — projekty a kód, stále lokálne." },
    public: { b: "verejná zóna", cls: "warn", note: "Verejná zóna — vhodné pri odoslaní von, bez osobných údajov." }
  };

  var CH_ANSWERS = [
    { key: "refactor", text: "Rozdelenie `mind.js` je najskôr o hraniciach, nie o súboroch. V jednom IIFE máš **5 933 riadkov**, ktoré miešajú štyri zodpovednosti.\n\n## Navrhované moduly\n\n1. `graph.js` — uzly, hrany, sila a rozpad\n2. `recall.js` — vyhľadávanie, skórovanie, hybridné zlučovanie\n3. `embed.js` — komunikácia s Ollamou, cache vektorov\n4. `mcp.js` — nástroje `mind_*` a klasifikačný filter\n\n## Prvý krok\n\nZačni od `recall.js`, lebo je najlepšie ohraničený a máš na neho meranie (8–130 ms).\n\n```js\n// recall.js — jediný vstupný bod\nexport function recall(query, opts) {\n  const lex = lexical(query, opts);\n  const vec = vector(query, opts);\n  return merge(lex, vec, opts.weights);\n}\n```\n\n> Kým nemáš test na starý výstup, refactor nerob. Eval batéria 43 dopytov je tvoja poistka." },
    { key: "latencia", text: "Latencia **4,2 s** nie je v RecallEngine. Ten beží 8–130 ms.\n\n## Kde sa čas stráca\n\n- embedovanie dopytu cez Ollamu na CPU: ≈ 4,1 s\n- samotné hľadanie v indexe: 8–130 ms\n- serializácia odpovede: pod 10 ms\n\n## Čo s tým\n\n1. Cache embeddingov pre opakované dopyty — pri 15 dopytoch v histórii by pomohla v 4 prípadoch\n2. Kratší dopyt pred embedovaním (odstránenie stop slov)\n3. Po upgrade presunúť `bge-m3` na kartu s 32 GB VRAM\n\nBod 1 vieš urobiť dnes, bod 3 až po nákupe." },
    { key: "obecne", text: "Rozumiem. Beriem to z toho, čo mám v pamäti.\n\n## Čo o tom viem\n\n- Zdroje nižšie sú uzly Hadesu, ktoré recall vytiahol\n- Sila uzla hovorí, ako často sa potvrdil v praxi\n- Ak je istota nízka, ber odpoveď ako návrh, nie ako fakt\n\n## Návrh ďalšieho kroku\n\nUpresni, či ide o **kód**, **projekt** alebo **preferenciu** — router potom vyberie inú vetvu a recall iné oddelenie.\n\nAk chceš, uložím túto odpoveď ako nový uzol pamäte." }
  ];
  var CH_RULES = [
    { re: /[\w.+-]+@[\w-]+\.[a-z]{2,}/gi, why: "osobné údaje — e-mailová adresa" },
    { re: /(\+421|\b09)[\d\s]{7,}/g, why: "osobné údaje — telefónne číslo" },
    { re: /\d+([.,]\d+)?\s?(€|eur\b)/gi, why: "interné ceny" },
    { re: /\b(nákupn\w+|veľkoobchodn\w+|marž\w+|rabat\w*)\b/gi, why: "interné ceny — obchodné podmienky" },
    { re: /\b[\w/.-]+\.(php|js|css|sql|py|env)\b/gi, why: "zdrojový kód — cesta k súboru" }
  ];

  function chPickAnswer(q) {
    var f = A().fold(q || "");
    if (f.indexOf("refactor") > -1 || f.indexOf("mind.js") > -1 || f.indexOf("modul") > -1) return CH_ANSWERS[0];
    if (f.indexOf("latenc") > -1 || f.indexOf("pomal") > -1 || f.indexOf("rychl") > -1 || f.indexOf("search") > -1) return CH_ANSWERS[1];
    return CH_ANSWERS[2];
  }
  function chRouter(q) {
    var f = A().fold(q || "");
    return /(refactor|latenc|kod|search|modul)/.test(f)
      ? { path: "regex vrstva 1", cls: "ok", note: "dopyt zachytila regex vrstva, model sa nevolal" }
      : { path: "model qwen3:4b", cls: "info", note: "regex vrstva nezachytila, rozhodol model" };
  }

  function chSeedConvs() {
    var src = memRecall("refactor mind.js moduly", 3);
    CH.convs = [
      { id: "c1", title: "Rozdelenie mind.js na moduly", when: "1. 8. 2026 · 09:14", zone: "local", pinned: true, msgs: [
        { role: "user", text: "Ako mám rozdeliť mind.js? Má 5 933 riadkov v jednom IIFE.", at: "1. 8. 2026 · 09:14:02" },
        { role: "ai", text: CH_ANSWERS[0].text, at: "1. 8. 2026 · 09:14:11", done: true,
          meta: { model: "qwen3:4b", ctx: 1240, tps: 18.4, recallMs: 96, router: { path: "regex vrstva 1", cls: "ok", note: "dopyt zachytila regex vrstva, model sa nevolal" }, sources: src } }
      ] },
      { id: "c2", title: "Prečo je /api/search pomalé", when: "31. 7. 2026 · 17:40", zone: "local", pinned: false, msgs: [] },
      { id: "c3", title: "Tón popisov produktov pre e-shop", when: "31. 7. 2026 · 11:05", zone: "work", pinned: false, msgs: [] },
      { id: "c4", title: "Prahy upozornení na RAM", when: "30. 7. 2026 · 20:18", zone: "local", pinned: false, msgs: [] }
    ];
    CH.cur = CH.convs[0];
  }
  function chConvList() {
    var q = A().fold(CH.search);
    var rows = CH.convs.filter(function (c) { return !q || A().fold(c.title).indexOf(q) > -1; });
    rows.sort(function (a, b) { return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0); });
    return rows;
  }
  function chRenderConvs() {
    var rows = chConvList();
    $("#ch-convs").innerHTML = rows.length ? rows.map(function (c) {
      var on = c === CH.cur;
      return '<div class="fi" data-conv="' + c.id + '" aria-current="' + on + '" style="cursor:pointer' + (on ? ";background:color-mix(in srgb,var(--teal) 10%,var(--card))" : "") + '">' +
        '<span class="fd' + (on ? "" : c.pinned ? " g" : "") + '"></span>' +
        '<span class="fx"><b style="font-size:var(--fs-sm)">' + (c.pinned ? "Pripnuté · " : "") + esc(c.title) + "</b><span>" + esc(c.when) + " · " + F(c.msgs.length, 0) + " správ · " + esc(ZONE_TXT[c.zone].b) + "</span></span>" +
        '<span class="ft" style="display:flex;gap:3px">' +
        '<button class="btn ghost" data-pin="' + c.id + '" aria-label="Pripnúť konverzáciu" aria-pressed="' + c.pinned + '" style="padding:1px 6px;font-size:var(--fs-label)">' + (c.pinned ? "Odopnúť" : "Pripnúť") + "</button>" +
        '<button class="btn ghost" data-del="' + c.id + '" aria-label="Zmazať konverzáciu" style="padding:1px 6px;font-size:var(--fs-label)">×</button></span></div>';
    }).join("") : '<div class="empty" style="padding:20px 8px"><p>Žiadna konverzácia nezodpovedá hľadaniu.</p></div>';
    $("#ch-convsel").innerHTML = rows.map(function (c) { return '<option value="' + c.id + '"' + (c === CH.cur ? " selected" : "") + ">" + esc(c.title) + "</option>"; }).join("");
    $("#ch-title").textContent = CH.cur ? CH.cur.title : "Nová konverzácia";
  }

  function chMsgHTML(m, i) {
    if (m.role === "user") {
      return '<div style="display:flex;justify-content:flex-end;margin-bottom:14px"><div style="max-width:76%;background:color-mix(in srgb,var(--teal) 12%,var(--card));border:1px solid color-mix(in srgb,var(--teal) 30%,var(--line));border-radius:12px 12px 4px 12px;padding:10px 13px;font-size:var(--fs-sm)">' +
        md(m.text) + '<div class="num" style="font-size:var(--fs-label);color:var(--ink-3);margin-top:4px;text-align:right">' + esc(m.at) + "</div></div></div>";
    }
    var meta = m.meta || {};
    var head = '<div style="display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin-bottom:6px">' +
      '<span class="badge info">' + esc(meta.model || CH.model) + "</span>" +
      (meta.router ? '<span class="badge ' + meta.router.cls + '" title="' + esc(meta.router.note) + '">router: ' + esc(meta.router.path) + "</span>" : "") +
      '<span class="num" style="font-size:var(--fs-label);color:var(--ink-3);margin-left:auto">' + esc(m.at) + "</span></div>";
    var body = '<div id="' + (m.streaming ? "ch-stream" : "ch-m" + i) + '" style="font-size:var(--fs-sm);line-height:1.62">' +
      md(m.text) + (m.streaming ? '<span style="display:inline-block;width:8px;height:15px;background:var(--teal);vertical-align:-2px;animation:pulse 1s infinite"></span>' : "") + "</div>";
    if (m.streaming) return '<div style="margin-bottom:16px">' + head + body + "</div>";

    var metrics = '<div class="num" style="display:flex;gap:12px;flex-wrap:wrap;font-size:var(--fs-label);color:var(--ink-3);margin-top:9px;padding-top:8px;border-top:1px solid var(--line)">' +
      "<span>kontext " + F(meta.ctx || 0, 0) + " / " + F(8192, 0) + " tok</span><span>" + F(meta.tps || 0, 1) + " tok/s</span><span>recall " + F(meta.recallMs || 0, 0) + " ms</span><span>" + F((m.text || "").length / 4, 0) + " tok odpovede</span></div>";

    var src = (meta.sources || []).length
      ? '<details style="margin-top:8px" open><summary style="font-size:var(--fs-label);color:var(--ink-3);cursor:pointer">Recall zdroje — ' + meta.sources.length + " uzlov Hadesu (klik otvorí inšpektor)</summary><div class=\"feed\" style=\"margin-top:5px\">" +
        meta.sources.map(function (s) {
          var nd = s.node;
          return '<button class="fi" data-src="' + esc(nd.id) + '"><span class="fd v"></span>' +
            '<span class="fx"><b style="font-size:var(--fs-sm)">' + esc(nd.name) + "</b><span>" + esc(mem().zoneLabel(nd.area)) + " › " + esc(nd.dep.name) + " · sila " + F(nd.str, 2) + " · istota " + F(nd.conf, 2) + "</span></span>" +
            '<span class="ft">' + F(s.score, 3) + "</span></button>";
        }).join("") + "</div></details>"
      : "";

    var acts = '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:9px">' +
      '<button class="btn ghost" data-act="copy" data-i="' + i + '" style="padding:4px 10px;font-size:var(--fs-label)">Kopírovať</button>' +
      '<button class="btn ghost" data-act="regen" data-i="' + i + '" style="padding:4px 10px;font-size:var(--fs-label)">Regenerovať</button>' +
      '<button class="btn ghost" data-act="save" data-i="' + i + '" style="padding:4px 10px;font-size:var(--fs-label)">Uložiť odpoveď → uzol</button>' +
      '<span style="flex:1"></span>' +
      '<button class="btn ghost" data-act="up" data-i="' + i + '" aria-label="Odpoveď bola užitočná" aria-pressed="' + (m.vote === 1) + '" style="padding:4px 10px;font-size:var(--fs-label)' + (m.vote === 1 ? ";border-color:var(--good);color:var(--good)" : "") + '">Palec hore</button>' +
      '<button class="btn ghost" data-act="down" data-i="' + i + '" aria-label="Odpoveď nebola užitočná" aria-pressed="' + (m.vote === -1) + '" style="padding:4px 10px;font-size:var(--fs-label)' + (m.vote === -1 ? ";border-color:var(--red);color:var(--red)" : "") + '">Palec dole</button></div>' +
      (m.vote ? '<p class="note" style="margin-top:6px">Hodnotenie ' + (m.vote === 1 ? "posilnilo" : "oslabilo") + " silu a istotu " + F((meta.sources || []).length, 0) + " zdrojových uzlov v pamäti.</p>" : "");

    return '<div style="margin-bottom:18px">' + head + body + metrics + src + acts + "</div>";
  }
  function chStateEmpty() {
    var sug = ["Ako mám rozdeliť mind.js na moduly?", "Prečo je /api/search pomalé a čo s tým?", "Zhrň mi, čo si sa dnes naučil o e-shope.", "Aký tón mám používať v popisoch produktov?"];
    $("#ch-msgs").innerHTML = '<div class="empty" style="padding:40px 16px"><span class="eico">∅</span><p style="font-size:var(--fs-sm)">Konverzácia je prázdna. Model beží lokálne, nič neopúšťa tento stroj.</p>' +
      '<div style="display:flex;flex-direction:column;gap:7px;margin-top:10px;width:min(520px,100%)">' +
      sug.map(function (s) { return '<button class="btn ghost" data-sug="' + esc(s) + '" style="text-align:left;justify-content:flex-start">' + esc(s) + "</button>"; }).join("") + "</div></div>";
  }
  function chRenderMsgs() {
    var host = $("#ch-msgs");
    if (!CH.cur || !CH.cur.msgs.length) { chStateEmpty(); return; }
    host.innerHTML = CH.cur.msgs.map(chMsgHTML).join("");
    host.scrollTop = host.scrollHeight;
  }
  function chScroll() { var h = $("#ch-msgs"); h.scrollTop = h.scrollHeight; }
  function chSetBusy(b) { CH.streaming = b; $("#ch-send").disabled = b; $("#ch-stop").disabled = !b; $("#ch-in").disabled = b; }

  var CH_TPS_LAST = null;
  function chTpsChart(reset) {
    if (reset) CH.tps = [];
    var data = CH.tps.length ? CH.tps : (CH_TPS_LAST || (CH_TPS_LAST = A().series(9317, 26, 9.6, 2.6, -0.02).map(function (v) { return +clamp(v, 4, 24).toFixed(1); })));
    CH.tpsData = data;
    C().render("#ch-ch-tps", {
      type: "line", title: "Rýchlosť generovania", height: 200,
      caption: (CH.tps.length ? "priebeh aktuálnej odpovede" : "priebeh poslednej dokončenej odpovede") + " · 1 bod ≈ 0,4 s · merané v rozhraní",
      xTitle: "Čas od začiatku odpovede",
      series: [{ key: "t", label: "rýchlosť", color: "var(--teal)", unit: "tok/s", dec: 1, data: data.map(function (v) { return { y: v }; }) }],
      x: { labels: data.map(function (_, i) { return F(i * 0.4, 1) + " s"; }) },
      yLeft: { unit: "tok/s", min: 0, max: 26, dec: 0 },
      thresholds: [{ value: 18, label: "typických 18 tok/s", color: "var(--gold)" }]
    });
  }
  function chCtxChart() {
    var used = 0;
    (CH.cur ? CH.cur.msgs : []).forEach(function (m) { used += Math.ceil((m.text || "").length / 4); });
    used += 320;
    CH.ctxUsed = used;
    C().render("#ch-ch-ctx", {
      type: "gauge", title: "Využitie kontextového okna", height: 200,
      value: Math.min(used, 8192), max: 8192, unit: "tok", dec: 0,
      color: used > 6800 ? "var(--red)" : used > 5000 ? "var(--amber)" : "var(--teal)",
      sub: F(used, 0) + " z 8 192 tokenov · " + F((used / 8192) * 100, 1) + " % okna"
    });
    return used;
  }

  function chGateBuild(text) {
    var held = [], outText = text;
    CH_RULES.forEach(function (r) {
      var m; r.re.lastIndex = 0;
      while ((m = r.re.exec(text)) !== null) { held.push({ frag: m[0], why: r.why }); if (!r.re.global) break; }
    });
    held.forEach(function (h) { outText = outText.split(h.frag).join("[zadržané: " + h.why.split(" — ")[0] + "]"); });
    memRecall(text, 2).forEach(function (s) { held.push({ frag: s.node.name + " (uzol Hadesu, " + mem().zoneLabel(s.node.area) + ")", why: "lokálna zóna — obsah pamäte neopúšťa stroj" }); });
    return { out: outText, held: held };
  }
  function chShowGate(text) {
    var g = chGateBuild(text);
    CH.pendingSend = { text: text, filtered: g.out };
    $("#ch-gate-out").textContent = g.out;
    $("#ch-gate-b").textContent = "zadržaných " + F(g.held.length, 0) + " útržkov";
    $("#ch-gate-held").innerHTML = g.held.length ? g.held.map(function (h) {
      var cls = h.why.indexOf("osobné") > -1 ? " r" : h.why.indexOf("ceny") > -1 ? " a" : h.why.indexOf("kód") > -1 ? " v" : "";
      return '<div class="fi" style="cursor:default"><span class="fd' + cls + '"></span><span class="fx"><b style="font-size:var(--fs-sm);word-break:break-word">' + esc(h.frag.length > 70 ? h.frag.slice(0, 69) + "…" : h.frag) + "</b><span>" + esc(h.why) + "</span></span></div>";
    }).join("") : '<div class="empty" style="padding:14px"><p>Filter nič nezadržal — celý dopyt je bezpečný na odoslanie.</p></div>';
    $("#ch-gate").style.display = "block";
    $("#ch-gate-no").focus();
  }

  function chLinkSources(sources, tema) {
    (sources || []).forEach(function (s) {
      var key = "chat|" + s.node.id + "|" + tema;
      if (CH.linked[key]) return;
      CH.linked[key] = 1;
      mem().link(s.node.id, { kind: "chat", label: "Chat — " + tema, go: function () { A().go("chat"); } });
    });
  }

  function chSend(text, viaMcp) {
    if (!CH.cur) { CH.cur = { id: "c" + (++CH.seq), title: text.slice(0, 42), when: chNow(), zone: CH.zone, pinned: false, msgs: [] }; CH.convs.unshift(CH.cur); }
    if (!CH.cur.msgs.length) CH.cur.title = text.slice(0, 42) + (text.length > 42 ? "…" : "");
    CH.cur.msgs.push({ role: "user", text: text, at: chNow() });
    var ans = chPickAnswer(text);
    var router = viaMcp ? { path: "MCP → Claude (filtrované)", cls: "warn", note: "dopyt odišiel von cez klasifikačný filter" } : chRouter(text);
    var sources = memRecall(text, 3, CH.app);
    chLinkSources(sources, CH.cur.title);
    var msg = { role: "ai", text: "", at: chNow(), streaming: true, done: false,
      meta: { model: viaMcp ? "claude cez MCP" : CH.model, ctx: 0, tps: 0, recallMs: Math.round(8 + Math.random() * 122), router: router, sources: sources } };
    CH.cur.msgs.push(msg);
    chRenderConvs(); chRenderMsgs(); chSetBusy(true); chTpsChart(true);

    var toks = ans.text.split(/(\s+)/), i = 0, t0 = Date.now(), acc = 0;
    CH.timer = setInterval(function () {
      if (i >= toks.length) { chFinish(msg, t0); return; }
      msg.text += toks[i]; i++; acc++;
      var el = $("#ch-stream");
      if (el) { el.innerHTML = md(msg.text) + '<span style="display:inline-block;width:8px;height:15px;background:var(--teal);vertical-align:-2px;animation:pulse 1s infinite"></span>'; chScroll(); }
      if (acc % 10 === 0) { var secs = (Date.now() - t0) / 1000; CH.tps.push(+Math.min(26, secs > 0 ? (msg.text.length / 4) / secs : 0).toFixed(1)); chTpsChart(false); }
    }, 40);
  }
  function chFinish(msg, t0) {
    clearInterval(CH.timer); CH.timer = null;
    msg.streaming = false; msg.done = true;
    var secs = Math.max(0.4, (Date.now() - t0) / 1000);
    msg.meta.tps = +((msg.text.length / 4) / secs).toFixed(1);
    chSetBusy(false); chRenderMsgs(); msg.meta.ctx = chCtxChart(); chRenderMsgs(); chTpsChart(false);
  }

  function chVote(m, dir) {
    var s = (m.meta && m.meta.sources) || [];
    s.forEach(function (x) {
      var nd = x.node;
      mem().update(nd, { str: +clamp(nd.str + dir * 0.03, 0, 1).toFixed(2), conf: +clamp(nd.conf + dir * 0.02, 0, 1).toFixed(2) });
    });
  }
  function chSaveNode(m) {
    var Ax = A();
    var firstH = (m.text.match(/^#{1,3}\s+(.*)$/m) || [])[1];
    var name = (firstH || m.text.replace(/[#>*`]/g, "").split("\n").filter(function (l) { return l.trim(); })[0] || "Odpoveď z chatu").slice(0, 60);
    var areas = mem().AREAS;
    function opt(a, cur) { return '<option value="' + a.k + '"' + (a.k === cur ? " selected" : "") + ">" + esc(a.name) + "</option>"; }
    var html =
      '<p class="note">Vytvorí sa nový uzol pamäte a hneď sa otvorí inšpektor na doladenie. Prepojí sa na zdrojové uzly cez susedstvo.</p>' +
      '<div class="field"><label for="cs-name">Názov uzla</label><input type="text" id="cs-name" value="' + esc(name) + '"></div>' +
      '<div class="row g2"><div class="field"><label for="cs-area">Oblasť</label><select id="cs-area">' + areas.map(function (a) { return opt(a, "dev"); }).join("") + '</select></div>' +
      '<div class="field"><label for="cs-type">Typ</label><select id="cs-type"><option value="memory">memory</option><option value="skill">skill</option><option value="project">project</option></select></div></div>' +
      '<div class="field"><label for="cs-desc">Obsah / poznámka</label><textarea id="cs-desc" rows="4">' + esc(m.text) + "</textarea></div>";
    Ax.detail("Uložiť odpoveď ako uzol pamäte", html, [
      { label: "Vytvoriť uzol a otvoriť inšpektor", fn: function () {
        var area = mem().areaByKey($("#cs-area").value);
        var nd = mem().create({ name: ($("#cs-name").value || name).trim(), desc: $("#cs-desc").value, type: $("#cs-type").value, area: area, dep: area.deps[0], src: "chat · uložená odpoveď" });
        mem().link(nd.id, { kind: "chat", label: "Chat — " + (CH.cur ? CH.cur.title : "odpoveď"), go: function () { A().go("chat"); } });
        Ax.toast("Uzol vytvorený · " + area.name, "ok");
        mem().inspect(nd);
      } },
      { label: "Zrušiť", kind: "ghost", fn: function () { Ax.closeDetail(); } }
    ]);
  }

  function chSetZone(z) {
    CH.zone = z;
    if (CH.cur) CH.cur.zone = z;
    $$("#ch-zone button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-zone") === z)); });
    var t = ZONE_TXT[z];
    $("#ch-zone-note").textContent = t.note;
    var b = $("#ch-zone-b"); b.textContent = t.b; b.className = "badge " + t.cls;
  }

  w.Aura.screens.chat = {
    title: "Chat", group: "Práca",
    init: function () {
      var Ax = A();
      chSeedConvs(); chRenderConvs(); chRenderMsgs(); chTpsChart(true); chCtxChart(); chSetZone("local");
      bindCodeCopy($("#ch-msgs"));
      bindTableToggle("ch-tps-tbl", "ch-tps-t", function () {
        return mkTable(["Čas", "tok/s"], (CH.tpsData || []).map(function (v, i) { return [F(i * 0.4, 1) + " s", F(v, 1)]; }));
      });
      bindTableToggle("ch-ctx-tbl", "ch-ctx-t", function () {
        var u = CH.ctxUsed || 0;
        return mkTable(["Položka", "Tokenov"], [["Systémový prompt + recall", F(320, 0)], ["Správy konverzácie", F(Math.max(0, u - 320), 0)], ["Spolu využité", F(u, 0)], ["Limit okna", F(8192, 0)], ["Zostáva", F(Math.max(0, 8192 - u), 0)]]);
      });

      var ta = $("#ch-in");
      function grow() {
        ta.style.height = "44px"; ta.style.height = Math.min(200, Math.max(44, ta.scrollHeight)) + "px";
        var tok = Math.ceil(ta.value.length / 4), used = 0;
        (CH.cur ? CH.cur.msgs : []).forEach(function (m) { used += Math.ceil((m.text || "").length / 4); });
        var tot = tok + used + 320, b = $("#ch-tok");
        b.textContent = F(tot, 0) + " / " + F(8192, 0) + " tokenov";
        b.className = "badge " + (tot > 8192 ? "bad" : tot > 7000 ? "warn" : "mute");
        $("#ch-warn").textContent = tot > 8192 ? "Prekročené kontextové okno o " + F(tot - 8192, 0) + " tokenov — najstaršie správy sa pri odoslaní odrežú." : tot > 7000 ? "Blížite sa k limitu 8 192 tokenov (zostáva " + F(8192 - tot, 0) + ")." : "";
      }
      ta.addEventListener("input", grow); grow();

      function doSend() {
        var txt = ta.value.trim();
        if (!txt || CH.streaming) return;
        if ($("#ch-mcp").getAttribute("aria-pressed") === "true") { chShowGate(txt); return; }
        ta.value = ""; grow(); chSend(txt, false);
      }
      $("#ch-send").addEventListener("click", doSend);
      ta.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); doSend(); } });
      $("#ch-stop").addEventListener("click", function () {
        if (!CH.streaming) return;
        var m = CH.cur.msgs[CH.cur.msgs.length - 1];
        clearInterval(CH.timer); CH.timer = null; m.streaming = false; m.done = true;
        m.text += "\n\n> Generovanie zastavené používateľom.";
        m.meta.tps = CH.tps.length ? CH.tps[CH.tps.length - 1] : 0;
        chSetBusy(false); chRenderMsgs(); m.meta.ctx = chCtxChart(); chRenderMsgs();
        Ax.toast("Generovanie zastavené", "warn");
      });

      $$("#ch-zone button").forEach(function (b) { b.addEventListener("click", function () { chSetZone(b.getAttribute("data-zone")); Ax.toast("Zóna dát: " + ZONE_TXT[b.getAttribute("data-zone")].b, b.getAttribute("data-zone") === "public" ? "warn" : "ok"); }); });

      $("#ch-mcp").addEventListener("click", function () {
        var on = this.getAttribute("aria-pressed") !== "true";
        this.setAttribute("aria-pressed", String(on)); this.classList.toggle("on", on);
        Ax.toast(on ? "Dopyt pôjde von cez MCP — pred odoslaním uvidíte náhľad brány" : "Dopyt zostáva lokálny", on ? "warn" : "ok");
      });
      $("#ch-gate-no").addEventListener("click", function () { $("#ch-gate").style.display = "none"; CH.pendingSend = null; Ax.toast("Odoslanie zrušené — von nešlo nič", "ok"); });
      $("#ch-gate-yes").addEventListener("click", function () {
        $("#ch-gate").style.display = "none";
        var p = CH.pendingSend; CH.pendingSend = null; if (!p) return;
        ta.value = ""; grow(); chSend(p.text, true); Ax.toast("Odoslané cez MCP vo filtrovanej podobe", "warn");
      });

      $("#ch-attach").addEventListener("click", function () {
        Ax.detail("Príloha k správe", "<p>Rozhranie je náhľad bez sieťovej vrstvy, takže sa tu súbor reálne nenahráva. V ostrej verzii sa príloha spracuje lokálne: text sa rozdelí na úseky, zaembeduje cez bge-m3 a pripojí ku kontextu konverzácie.</p><dl><dt>Podporované</dt><dd>.txt · .md · .csv · .php · .js</dd><dt>Limit</dt><dd>2 MB na súbor, max 8 súborov</dd><dt>Zóna</dt><dd>dedí sa zo zóny konverzácie</dd></dl>", []);
      });
      $("#ch-new").addEventListener("click", function () {
        CH.cur = { id: "c" + (++CH.seq) + "n", title: "Nová konverzácia", when: chNow(), zone: CH.zone, pinned: false, msgs: [] };
        CH.convs.unshift(CH.cur); chRenderConvs(); chRenderMsgs(); chTpsChart(true); chCtxChart();
      });

      $("#ch-search").addEventListener("input", function () { CH.search = this.value; chRenderConvs(); });

      $("#ch-convs").addEventListener("click", function (e) {
        var pin = e.target.closest("button[data-pin]");
        if (pin) { e.stopPropagation(); var c = CH.convs.filter(function (x) { return x.id === pin.getAttribute("data-pin"); })[0]; if (c) { c.pinned = !c.pinned; chRenderConvs(); Ax.toast(c.pinned ? "Konverzácia pripnutá" : "Odopnuté", "ok"); } return; }
        var del = e.target.closest("button[data-del]");
        if (del) { e.stopPropagation(); var id = del.getAttribute("data-del"); var cc = CH.convs.filter(function (x) { return x.id === id; })[0]; if (!cc) return;
          Ax.confirm("Zmazať konverzáciu?", "„" + cc.title + "“ sa natrvalo odstráni z histórie.", function () {
            CH.convs = CH.convs.filter(function (x) { return x.id !== id; });
            if (CH.cur === cc) CH.cur = CH.convs[0] || null;
            chRenderConvs(); chRenderMsgs(); chCtxChart(); Ax.toast("Konverzácia zmazaná", "ok");
          }, "Zmazať", true); return; }
        var row = e.target.closest("[data-conv]");
        if (!row) return;
        CH.cur = CH.convs.filter(function (c) { return c.id === row.getAttribute("data-conv"); })[0];
        if (CH.cur) chSetZone(CH.cur.zone);
        chRenderConvs(); chRenderMsgs(); chCtxChart();
      });
      $("#ch-convsel").addEventListener("change", function () { CH.cur = CH.convs.filter(function (c) { return c.id === this.value; }.bind(this))[0]; if (CH.cur) chSetZone(CH.cur.zone); chRenderConvs(); chRenderMsgs(); chCtxChart(); });

      $("#ch-msgs").addEventListener("click", function (e) {
        var s = e.target.closest("button[data-src]");
        if (s) { mem().inspect(s.getAttribute("data-src")); return; }
        var sg = e.target.closest("button[data-sug]");
        if (sg) { ta.value = sg.getAttribute("data-sug"); grow(); doSend(); return; }
        var b = e.target.closest("button[data-act]");
        if (!b) return;
        var act = b.getAttribute("data-act"), i = +b.getAttribute("data-i"), m = CH.cur && CH.cur.msgs[i];
        if (!m) return;
        if (act === "copy") copyText(m.text, "Odpoveď skopírovaná do schránky");
        else if (act === "regen") { CH.cur.msgs = CH.cur.msgs.slice(0, i); var prev = CH.cur.msgs[CH.cur.msgs.length - 1]; var q = prev && prev.role === "user" ? prev.text : "zhrň to"; if (prev && prev.role === "user") CH.cur.msgs.pop(); chSend(q, false); }
        else if (act === "save") chSaveNode(m);
        else if (act === "up" || act === "down") {
          var nv = act === "up" ? 1 : -1;
          if (m.vote === nv) { m.vote = 0; } else { m.vote = nv; chVote(m, nv); }
          chRenderMsgs();
          Ax.toast(m.vote === 1 ? "Užitočné — zdrojové uzly posilnené" : m.vote === -1 ? "Neužitočné — zdrojové uzly oslabené" : "Hodnotenie zrušené", m.vote === -1 ? "warn" : "ok");
        }
      });

      /* kontext appky — recall čerpá len z jej uzlov (Q27/41/42) */
      function chFillApps() {
        var sel = $("#ch-app"), cur = sel.value;
        sel.innerHTML = '<option value="">všetky</option>' + Ax.apps.all().map(function (a) { return '<option value="' + esc(a.slug) + '">' + esc(a.name) + "</option>"; }).join("");
        sel.value = cur;
      }
      chFillApps();
      Ax.apps.onChange(chFillApps);
      $("#ch-app").addEventListener("change", function () {
        CH.app = this.value;
        var app = CH.app ? Ax.apps.bySlug(CH.app) : null;
        var b = $("#ch-app-b");
        if (b) { b.textContent = app ? "appka: " + app.name : "celá pamäť"; b.className = "badge " + (app ? "info" : "mute"); }
        Ax.toast(app ? "Kontext: appka " + app.name + " — odpovede čerpajú len z jej uzlov" : "Kontext: celá pamäť", "ok");
      });

      $("#ch-model").addEventListener("change", function () { CH.model = this.value; $("#ch-model-b").textContent = this.value; Ax.toast("Model konverzácie: " + this.value, "ok"); });
      w.addEventListener("aura:model", function (e) { var mdl = e.detail && e.detail.model; if (!mdl) return; CH.model = mdl; var sel = $("#ch-model"); if (sel && $$("option", sel).some(function (o) { return o.value === mdl; })) sel.value = mdl; $("#ch-model-b").textContent = mdl; });

      mem().onChange(function () { if (Ax.state.screen === "chat") chRenderMsgs(); });

      Ax.registerCmd([{ label: "Chat — nová konverzácia", hint: "Práca", run: function () { Ax.go("chat"); setTimeout(function () { var b = $("#ch-new"); if (b) b.click(); }, 200); } }]);
    },
    onShow: function () {
      var mobile = w.innerWidth < 900, sh = $("#ch-shell");
      sh.style.gridTemplateColumns = mobile ? "1fr" : "270px 1fr";
      $("#ch-side").style.display = mobile ? "none" : "flex";
      $("#ch-convsel").style.display = mobile ? "" : "none";
      $("#ch-convsel-l").style.display = mobile ? "" : "none";
      if (w.AuraChart) setTimeout(w.AuraChart.reflowAll, 40);
    }
  };

  /* ============================================================
     2 · SMERNICA
     ============================================================ */
  var SM_TPL = {
    app: { name: "Nová appka", title: "Nová appka — pracovný názov", goal: "Na konci beží spustiteľná appka s jednou hlavnou obrazovkou a jedným dátovým zdrojom.", ctxt: "Stroj: AMD 9900, 48 GB RAM, CPU inferencia. Stack: Laravel + vanilla JS + Vite, bez frameworku na frontende.\nPort 8082 je obsadený Aurou, použi iný.", steps: "Popíš dátový model a napíš migrácie\nPostav jednu obrazovku od začiatku do konca vrátane prázdneho a chybového stavu\nPridaj jeden reálny dátový zdroj, žiadne atrapy\nNapíš test na hlavnú cestu\nSpusti a priloz výstup", done: "Appka sa spustí jedným príkazom, hlavná obrazovka zobrazí reálne dáta, test na hlavnú cestu prejde.", limits: "Žiadna knižnica navyše bez odsúhlasenia. Žiadny localStorage. Žiadne emoji vo výstupoch.", claims: [["Stroj má 48 GB RAM", true], ["Port 8082 je obsadený", true], ["Cieľová záťaž je pod 100 používateľov", false]] },
    refactor: { name: "Refactor", title: "Refactor — rozdelenie modulu", goal: "Jeden veľký súbor je rozdelený na moduly s jasnými hranicami a správanie sa nezmenilo.", ctxt: "mind.js má 5 933 riadkov v jednom IIFE a mieša štyri zodpovednosti: graf, recall, embed, MCP nástroje.\nExistuje eval batéria 43 dopytov s nameraným hit@5 86,7 % a MRR 0,800 — slúži ako poistka.", steps: "Spusti eval batériu a ulož výstup ako referenciu\nVytiahni recall do samostatného modulu, nič iné nemeň\nSpusti eval znova a porovnaj s referenciou\nOpakuj pre embed, graf a MCP nástroje\nOdstráň mŕtvy kód až na konci", done: "Každý modul má jeden vstupný bod, eval batéria dáva rovnaké čísla ako pred refactorom, žiadny súbor nemá nad 800 riadkov.", limits: "Nemeň verejné API nástrojov mind_*. Nepridávaj nové funkcie počas refactoru.", claims: [["mind.js má 5 933 riadkov", true], ["hit@5 je 86,7 %", true], ["Refactor zrýchli recall", false]] },
    bug: { name: "Bug fix", title: "Bug fix — popis chyby", goal: "Chyba je reprodukovaná testom, opravená a test po oprave prechádza.", ctxt: "Prejav: čo sa deje. Očakávanie: čo sa má diať. Prostredie: verzia, prehliadač, dáta.\nPosledná zmena pred výskytom chyby je známa.", steps: "Reprodukuj chybu a zapíš presné kroky\nNapíš padajúci test\nNájdi príčinu, nie prejav\nOprav a spusti test\nPozri, či rovnaká príčina nie je aj inde", done: "Padajúci test po oprave prechádza, pôvodné kroky už chybu nevyvolajú, v kóde je poznámka na príčinu.", limits: "Neopravuj obchádzkou. Nemeň nesúvisiaci kód v tom istom commite.", claims: [["Chyba je reprodukovateľná", true], ["Príčina je v recall vetve", false], ["Týka sa len slovenských dopytov", false]] },
    audit: { name: "Audit", title: "Audit rozhrania alebo kódu", goal: "Zoznam defektov s prioritou, každý s dôkazom a návrhom opravy.", ctxt: "Predchádzajúci audit našiel 35 defektov: grafy bez osí, dve jednotky na jednej škále, 99 mŕtvych prvkov, chat bez streamovania, kontrast 2,30:1.\nCieľom nie je názor, ale merateľné zistenie.", steps: "Prejdi každú obrazovku a zapíš, čo sa nedá prečítať alebo použiť\nOveruj čísla, nie dojmy — kontrast, veľkosť písma, počet klikateľných prvkov\nKaždý defekt zaraď do P0–P4\nPri každom defekte uveď, kde presne je\nNavrhni opravu jednou vetou", done: "Každý defekt má miesto, prioritu, dôkaz a návrh opravy. Žiadna položka bez dôkazu.", limits: "Nepíš, že niečo „pôsobí neprofesionálne“. Buď konkrétny alebo mlč.", claims: [["Predchádzajúci audit našiel 35 defektov", true], ["Kontrast teal na bielej je 2,30:1", true], ["Používatelia sa v rozhraní strácajú", false]] },
    sprint: { name: "Sprint agentov", title: "Sprint agentov — paralelná práca", goal: "Viacero agentov pracuje súčasne bez konfliktov a výsledok sa dá zlepiť.", ctxt: "Každý agent píše výhradne svoje súbory. Zdieľané súbory (engine, štýly, shell) needituje nikto z nich.\nZlepenie robí hlavný agent na konci.", steps: "Rozdeľ prácu tak, aby sa súbory neprekrývali\nNapíš kontrakt: API, triedy, pravidlá, reálne čísla\nSpusti agentov paralelne\nPo každom agentovi over syntax\nZlep výsledok a prejdi kontrolný zoznam", done: "Každý agent odovzdal svoje súbory, syntax prejde, zlepený výsledok sa otvorí bez chýb v konzole.", limits: "Žiadny agent needituje cudzie súbory ani kontrakt. Žiadny agent nevymýšľa namerané fakty.", claims: [["Súbory sa medzi agentmi neprekrývajú", true], ["Kontrakt obsahuje reálne namerané čísla", true], ["Paralelný beh je rýchlejší než sekvenčný", false]] }
  };
  var SM = { tpl: null, claims: [], hist: [], links: [] };

  function smFields() { return { title: $("#sm-title").value, goal: $("#sm-goal").value, ctxt: $("#sm-ctxt").value, steps: $("#sm-steps").value, done: $("#sm-done").value, limits: $("#sm-limits").value }; }
  function smMarkdown() {
    var f = smFields(), out = [];
    out.push("# " + (f.title || "Smernica bez názvu"), "");
    out.push("> Vygenerované v AuraAI · " + chNow() + (SM.tpl ? " · šablóna: " + SM_TPL[SM.tpl].name : ""), "");
    out.push("## Cieľ", f.goal || "_neuvedené_", "");
    out.push("## Kontext a známe fakty", f.ctxt || "_neuvedené_", "");
    out.push("## Kroky");
    (f.steps || "").split("\n").filter(function (l) { return l.trim(); }).forEach(function (l, i) { out.push((i + 1) + ". " + l.trim()); });
    if (!(f.steps || "").trim()) out.push("_neuvedené_");
    out.push("", "## Definícia hotového", f.done || "_neuvedené_", "");
    out.push("## Zákazy a hranice", f.limits || "_neuvedené_", "");
    if (SM.links.length) { out.push("## Prepojené uzly pamäte"); SM.links.forEach(function (id) { var nd = mem().byId(id); if (nd) out.push("- " + nd.name + " (" + mem().zoneLabel(nd.area) + ", " + nd.type + ", sila " + F(nd.str, 2) + ", istota " + F(nd.conf, 2) + ")"); }); out.push(""); }
    out.push("## Tvrdenia a ich overenie");
    if (SM.claims.length) {
      SM.claims.forEach(function (c) { out.push("- **" + (c.ver ? "OVERENÉ" : "NEOVERENÉ") + "** — " + c.text); });
      var un = SM.claims.filter(function (c) { return !c.ver; }).length;
      if (un) out.push("", "> " + un + " tvrdení je neoverených. Neznáme sa nevymýšľa — over ich alebo ich zo smernice vyhoď.");
    } else out.push("_žiadne tvrdenia_");
    return out.join("\n");
  }
  function smRenderLinked() {
    var host = $("#sm-linked");
    $("#sm-linkcnt").textContent = F(SM.links.length, 0) + " uzlov";
    host.innerHTML = SM.links.length ? SM.links.map(function (id) {
      var nd = mem().byId(id); if (!nd) return "";
      return '<button class="fi" data-lnode="' + esc(nd.id) + '"><span class="fd v"></span><span class="fx"><b style="font-size:var(--fs-sm)">' + esc(nd.name) + '</b><span>' + esc(mem().zoneLabel(nd.area)) + " · " + esc(nd.type) + " · sila " + F(nd.str, 2) + '</span></span><span class="ft"><span class="badge mute" data-rmlink="' + esc(nd.id) + '" style="cursor:pointer" role="button" aria-label="Odobrať prepojenie">odobrať ×</span></span></button>';
    }).join("") : '<div class="empty" style="padding:12px"><p>Žiadne prepojené uzly. Cez „Vložiť kontext z pamäte“ ich pripojíte.</p></div>';
  }
  function smRenderClaims() {
    $("#sm-claims").innerHTML = SM.claims.length ? SM.claims.map(function (c, i) {
      return '<div class="fi" style="cursor:default"><span class="fd' + (c.ver ? " ok" : " a") + '"></span><span class="fx"><b style="font-size:var(--fs-sm)">' + esc(c.text) + '</b><span>' + (c.ver ? "overené — má zdroj alebo meranie" : "neoverené — do smernice ide s výhradou") + '</span></span><span class="ft" style="display:flex;gap:5px;align-items:center"><button class="badge ' + (c.ver ? "ok" : "warn") + '" data-claim="' + i + '" style="cursor:pointer;font-family:var(--mono)" aria-label="Prepnúť overenie tvrdenia">' + (c.ver ? "overené" : "neoverené") + '</button><button class="btn ghost" data-del="' + i + '" aria-label="Odstrániť tvrdenie" style="padding:2px 8px;font-size:var(--fs-label)">×</button></span></div>';
    }).join("") : '<div class="empty" style="padding:14px"><p>Žiadne tvrdenia. Vyberte šablónu alebo pridajte tvrdenie ručne.</p></div>';
  }
  function smPreview() {
    var m = smMarkdown();
    $("#sm-prev").innerHTML = md(m);
    var un = SM.claims.filter(function (c) { return !c.ver; }).length;
    $("#sm-meta").textContent = F(m.length, 0) + " znakov · " + F(Math.ceil(m.length / 4), 0) + " tokenov" + (un ? " · " + un + " neoverených" : "");
  }
  function smLoadTpl(k) {
    var t = SM_TPL[k]; if (!t) return;
    SM.tpl = k;
    $("#sm-title").value = t.title; $("#sm-goal").value = t.goal; $("#sm-ctxt").value = t.ctxt;
    $("#sm-steps").value = t.steps; $("#sm-done").value = t.done; $("#sm-limits").value = t.limits;
    SM.claims = t.claims.map(function (c) { return { text: c[0], ver: c[1] }; });
    $("#sm-tplname").textContent = "šablóna: " + t.name;
    $$("#v-smernica .chz[data-tpl]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-tpl") === k)); });
    smRenderClaims(); smPreview();
  }
  function smHistRows() { return SM.hist; }
  function smHistRender(rows) {
    $("#sm-tbl tbody").innerHTML = rows.map(function (r, i) {
      return '<tr data-i="' + i + '" tabindex="0"><td class="k">' + esc(r.date) + "</td><td>" + esc(r.title) + '</td><td><span class="badge mute">' + esc(r.tpl) + '</span></td><td class="num">' + F(r.claims, 0) + '</td><td class="num">' + F(r.ver, 0) + '</td><td class="num">' + F(r.chars, 0) + "</td></tr>";
    }).join("");
    $$("#sm-tbl tbody tr").forEach(function (tr, i) {
      function open() {
        var r = rows[i];
        A().detail(r.title, "<dl><dt>Dátum</dt><dd>" + esc(r.date) + "</dd><dt>Šablóna</dt><dd>" + esc(r.tpl) + "</dd><dt>Tvrdení</dt><dd>" + F(r.claims, 0) + "</dd><dt>Z toho overených</dt><dd>" + F(r.ver, 0) + " (" + F((r.ver / Math.max(1, r.claims)) * 100, 0) + " %)</dd><dt>Znakov</dt><dd>" + F(r.chars, 0) + "</dd></dl><p>" + esc(r.goal) + "</p>", [
          { label: "Načítať späť do formulára", fn: function () { A().closeDetail(); smLoadHist(r); } },
          { label: "Stiahnuť .md", kind: "ghost", fn: function () { A().download(slugify(r.title) + ".md", r.mdText || ("# " + r.title + "\n\n" + r.goal), "text/markdown;charset=utf-8"); A().toast("Smernica stiahnutá", "ok"); } }
        ]);
      }
      tr.addEventListener("click", open);
      tr.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); open(); } });
    });
    $("#sm-cards").innerHTML = rows.map(function (r, i) {
      return '<button type="button" class="rowcard" data-row="' + i + '"><div class="rh"><b>' + esc(r.title) + '</b><span style="flex:1"></span><span class="badge mute">' + esc(r.tpl) + "</span></div><dl><dt>Dátum</dt><dd>" + esc(r.date) + "</dd><dt>Tvrdení</dt><dd>" + F(r.claims, 0) + " / overených " + F(r.ver, 0) + "</dd></dl></button>";
    }).join("");
    A().bindRows($("#sm-cards"), function (i) { return rows[+i]; }, smLoadHist);
    $("#sm-hcnt").textContent = F(rows.length, 0) + " záznamov";
  }
  function smLoadHist(r) {
    if (r.snap) {
      $("#sm-title").value = r.snap.title; $("#sm-goal").value = r.snap.goal; $("#sm-ctxt").value = r.snap.ctxt;
      $("#sm-steps").value = r.snap.steps; $("#sm-done").value = r.snap.done; $("#sm-limits").value = r.snap.limits;
      SM.claims = (r.snap.claims || []).map(function (c) { return { text: c.text, ver: c.ver }; });
      SM.links = (r.snap.links || []).slice();
    } else {
      var key = Object.keys(SM_TPL).filter(function (k) { return SM_TPL[k].name === r.tpl; })[0];
      if (key) smLoadTpl(key);
      $("#sm-title").value = r.title; $("#sm-goal").value = r.goal;
    }
    $("#sm-tplname").textContent = "šablóna: " + r.tpl;
    smRenderClaims(); smRenderLinked(); smPreview();
    A().toast("Smernica „" + r.title + "“ načítaná späť do formulára", "ok");
  }

  /* v4: výber uzlov z pamäte, vloženie do kontextu + prepojenie (mem.link) */
  function smCtxPicker() {
    var Ax = A();
    var html = '<p class="note">Vyberte uzly Hadesu. Do sekcie kontextu sa vloží ich názov, zóna, sila a istota — nie celý obsah. Uzly sa prepoja na smernicu (smernica sa nestáva uzlom).</p>' +
      '<div class="field"><label for="sm-pick-q">Hľadať uzol</label><input type="search" id="sm-pick-q" placeholder="napr. recall, popisy, kontrast…"></div>' +
      '<div class="feed" id="sm-pick-list"></div>';
    Ax.detail("Vložiť kontext z pamäte", html, [{ label: "Hotovo", kind: "ghost", fn: function () { Ax.closeDetail(); } }]);
    function render(q) {
      var res = mem().search(q || "");
      if (!res.length) res = mem().nodes().slice().sort(function (a, b) { return b.str - a.str; }).map(function (n) { return { node: n }; });
      res = res.slice(0, 20);
      $("#sm-pick-list").innerHTML = res.map(function (r) {
        var nd = r.node, on = SM.links.indexOf(nd.id) > -1;
        return '<button class="fi" data-pick="' + esc(nd.id) + '"><span class="fd' + (on ? " ok" : " v") + '"></span><span class="fx"><b style="font-size:var(--fs-sm)">' + esc(nd.name) + '</b><span>' + esc(mem().zoneLabel(nd.area)) + " › " + esc(nd.dep.name) + " · " + esc(nd.type) + " · sila " + F(nd.str, 2) + '</span></span><span class="ft"><span class="badge ' + (on ? "ok" : "mute") + '">' + (on ? "vložené" : "vložiť") + "</span></span></button>";
      }).join("");
      $$("#sm-pick-list button[data-pick]").forEach(function (b) {
        b.addEventListener("click", function () {
          var id = b.getAttribute("data-pick"), nd = mem().byId(id);
          if (SM.links.indexOf(id) > -1) return;
          SM.links.push(id);
          var line = "- " + nd.name + " (" + mem().zoneLabel(nd.area) + ", " + nd.type + ", sila " + F(nd.str, 2) + ", istota " + F(nd.conf, 2) + ")";
          var ta = $("#sm-ctxt"); ta.value = (ta.value ? ta.value.replace(/\s+$/, "") + "\n" : "") + line;
          mem().link(id, { kind: "smernica", label: "Smernica — " + ($("#sm-title").value || "bez názvu"), go: function () { A().go("smernica"); } });
          smRenderLinked(); smPreview(); render($("#sm-pick-q").value);
          Ax.toast("Uzol vložený a prepojený", "ok");
        });
      });
    }
    render("");
    var qi = $("#sm-pick-q"); if (qi) qi.addEventListener("input", function () { render(this.value); });
  }

  w.Aura.screens.smernica = {
    title: "Smernica", group: "Práca",
    init: function () {
      var Ax = A(), Ch = C();
      SM.hist = [
        { date: "1. 8. 2026", title: "Rozdelenie mind.js na moduly", tpl: "Refactor", claims: 3, ver: 2, chars: 1840, goal: "Jeden veľký súbor je rozdelený na moduly s jasnými hranicami a správanie sa nezmenilo." },
        { date: "31. 7. 2026", title: "Audit rozhrania AuraAI", tpl: "Audit", claims: 4, ver: 3, chars: 2210, goal: "Zoznam defektov s prioritou, každý s dôkazom a návrhom opravy." },
        { date: "30. 7. 2026", title: "Sprint dvoch agentov na rozhraní", tpl: "Sprint agentov", claims: 3, ver: 3, chars: 1620, goal: "Viacero agentov pracuje súčasne bez konfliktov a výsledok sa dá zlepiť." },
        { date: "28. 7. 2026", title: "Oprava diakritiky vo vyhľadávaní", tpl: "Bug fix", claims: 3, ver: 2, chars: 1180, goal: "Chyba je reprodukovaná testom, opravená a test po oprave prechádza." },
        { date: "25. 7. 2026", title: "Generátor popisov produktov", tpl: "Nová appka", claims: 3, ver: 1, chars: 1970, goal: "Na konci beží spustiteľná appka s jednou hlavnou obrazovkou a jedným dátovým zdrojom." },
        { date: "21. 7. 2026", title: "Cache embeddingov pre opakované dopyty", tpl: "Refactor", claims: 4, ver: 3, chars: 1540, goal: "Opakovaný dopyt sa neembeduje znova, latencia klesne pod 1 s." }
      ];
      smRenderClaims(); smRenderLinked(); smPreview(); smHistRender(SM.hist);
      Ax.sortable($("#sm-tbl"), smHistRows, smHistRender);
      bindCodeCopy($("#sm-prev"));

      ["sm-title", "sm-goal", "sm-ctxt", "sm-steps", "sm-done", "sm-limits"].forEach(function (id) { document.getElementById(id).addEventListener("input", smPreview); });

      $$("#v-smernica .chz[data-tpl]").forEach(function (b) {
        b.setAttribute("aria-pressed", "false");
        b.addEventListener("click", function () { smLoadTpl(b.getAttribute("data-tpl")); Ax.toast("Šablóna „" + SM_TPL[b.getAttribute("data-tpl")].name + "“ načítaná", "ok"); });
      });

      $("#sm-claims").addEventListener("click", function (e) {
        var t = e.target.closest("button[data-claim]");
        if (t) { var i = +t.getAttribute("data-claim"); SM.claims[i].ver = !SM.claims[i].ver; smRenderClaims(); smPreview(); return; }
        var d = e.target.closest("button[data-del]");
        if (d) { SM.claims.splice(+d.getAttribute("data-del"), 1); smRenderClaims(); smPreview(); }
      });
      $("#sm-linked").addEventListener("click", function (e) {
        var rm = e.target.closest("[data-rmlink]");
        if (rm) { e.stopPropagation(); SM.links = SM.links.filter(function (x) { return x !== rm.getAttribute("data-rmlink"); }); smRenderLinked(); smPreview(); Ax.toast("Prepojenie odobraté", "ok"); return; }
        var n = e.target.closest("[data-lnode]");
        if (n) mem().inspect(n.getAttribute("data-lnode"));
      });
      $("#sm-addclaim").addEventListener("click", function () {
        Ax.detail("Nové tvrdenie", '<div class="field"><label for="sm-nc">Znenie tvrdenia</label><input type="text" id="sm-nc" placeholder="napr. Router má nameranú úspešnosť 95,3 %"><p class="hint">Ak k tvrdeniu nemáte zdroj alebo meranie, nechajte ho ako neoverené. Neznáme sa nevymýšľa.</p></div>', [
          { label: "Pridať ako overené", fn: function () { var v = $("#sm-nc").value.trim(); if (v) { SM.claims.push({ text: v, ver: true }); smRenderClaims(); smPreview(); } Ax.closeDetail(); } },
          { label: "Pridať ako neoverené", kind: "ghost", fn: function () { var v = $("#sm-nc").value.trim(); if (v) { SM.claims.push({ text: v, ver: false }); smRenderClaims(); smPreview(); } Ax.closeDetail(); } }
        ]);
      });
      $("#sm-ctx").addEventListener("click", smCtxPicker);

      $("#sm-copy").addEventListener("click", function () { copyText(smMarkdown(), "Markdown smernice skopírovaný"); });
      $("#sm-dl").addEventListener("click", function () { var f = smFields(); Ax.download(slugify(f.title || "smernica") + ".md", smMarkdown(), "text/markdown;charset=utf-8"); Ax.toast("Súbor " + slugify(f.title || "smernica") + ".md stiahnutý", "ok"); });
      /* väzba smernice na appku (Q49) */
      function smFillApps() {
        var sel = $("#sm-app"), cur = sel.value;
        sel.innerHTML = '<option value="">žiadna — všeobecná smernica</option>' + Ax.apps.all().map(function (a) { return '<option value="' + esc(a.slug) + '">' + esc(a.name) + "</option>"; }).join("");
        sel.value = cur;
      }
      smFillApps();
      Ax.apps.onChange(smFillApps);

      $("#sm-save").addEventListener("click", function () {
        var f = smFields();
        if (!f.title.trim()) { Ax.toast("Smernica potrebuje názov", "warn"); $("#sm-title").focus(); return; }
        var mdText = smMarkdown();
        var appSlug = $("#sm-app").value, sapp = appSlug ? Ax.apps.bySlug(appSlug) : null;
        if (sapp) {
          Ax.apps.nodes(sapp).slice(0, 3).forEach(function (n) {
            mem().link(n.id, { kind: "smernica", label: "Smernica — " + f.title.trim() + " (" + sapp.name + ")", go: function () { Ax.go("smernica"); } });
          });
        }
        SM.hist.unshift({ date: "1. 8. 2026", title: f.title.trim(), tpl: SM.tpl ? SM_TPL[SM.tpl].name : "bez šablóny", claims: SM.claims.length, ver: SM.claims.filter(function (c) { return c.ver; }).length, chars: mdText.length, goal: f.goal || "—", mdText: mdText, snap: { title: f.title, goal: f.goal, ctxt: f.ctxt, steps: f.steps, done: f.done, limits: f.limits, claims: SM.claims.slice(), links: SM.links.slice() } });
        smHistRender(SM.hist);
        Ax.toast("Smernica uložená do histórie · prepojené uzly ostávajú v pamäti", "ok");
      });
      $("#sm-clear").addEventListener("click", function () {
        Ax.confirm("Vyprázdniť formulár?", "Neuložená smernica a jej prepojenia sa stratia.", function () {
          ["sm-title", "sm-goal", "sm-ctxt", "sm-steps", "sm-done", "sm-limits"].forEach(function (id) { document.getElementById(id).value = ""; });
          SM.claims = []; SM.tpl = null; SM.links = [];
          $("#sm-tplname").textContent = "bez šablóny";
          $$("#v-smernica .chz[data-tpl]").forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
          smRenderClaims(); smRenderLinked(); smPreview();
        }, "Vyprázdniť", true);
      });

      var wk = [], data = [], rg = Ax.rng(909);
      for (var i = 0; i < 12; i++) { wk.push("T" + (i + 1)); data.push({ y: Math.round(2 + rg() * 8) }); }
      data[11] = { y: 6 };
      Ch.render("#sm-ch-weeks", {
        type: "bar", title: "Smernice v čase", height: 210, caption: "posledných 12 týždňov · 1 stĺpec = 1 týždeň · simulovaný priebeh, posledný týždeň je skutočný", xTitle: "Týždeň",
        series: [{ key: "s", label: "vytvorené smernice", color: "var(--teal)", unit: "ks", dec: 0, data: data }],
        x: { labels: wk }, yLeft: { unit: "ks", min: 0, max: 12, dec: 0 },
        onPoint: function (i2, lb, pts) { A().detail("Týždeň " + lb, "<dl><dt>Vytvorených smerníc</dt><dd>" + F(pts[0].y, 0) + "</dd><dt>Priemer za 12 týždňov</dt><dd>" + F(data.reduce(function (a, b) { return a + b.y; }, 0) / 12, 1) + "</dd></dl>", []); }
      });
      bindTableToggle("sm-weeks-tbl", "sm-weeks-t", function () { return mkTable(["Týždeň", "Smerníc"], wk.map(function (l, i) { return [l, F(data[i].y, 0)]; })); });

      var tplCounts = [{ label: "Refactor", v: 19, color: "var(--teal)" }, { label: "Bug fix", v: 15, color: "var(--gold)" }, { label: "Nová appka", v: 12, color: "var(--violet)" }, { label: "Audit", v: 10, color: "var(--good)" }, { label: "Sprint agentov", v: 8, color: "var(--amber)" }];
      Ch.render("#sm-ch-tpl", {
        type: "donut", title: "Podiel šablón", height: 210, unit: "ks", centerLabel: "64", centerSub: "smerníc", items: tplCounts,
        onSlice: function (it) { var key = Object.keys(SM_TPL).filter(function (k) { return SM_TPL[k].name === it.label; })[0]; if (key) { smLoadTpl(key); A().toast("Šablóna „" + it.label + "“ načítaná", "ok"); } }
      });
      bindTableToggle("sm-tpl-tbl", "sm-tpl-t", function () { return mkTable(["Šablóna", "Smerníc"], tplCounts.map(function (t) { return [t.label, F(t.v, 0)]; })); });

      Ax.registerCmd([{ label: "Smernica — nová z šablóny", hint: "Práca", run: function () { Ax.go("smernica"); } }]);
    },
    onShow: function () { }
  };

  /* ============================================================
     4 · AUTOMATIZÁCIE
     ============================================================ */
  var AU = {
    deps: w.Aura.autos.deps,
    filter: { dep: "", trig: "", state: "", app: "" }, live: false, seq: 12,
    prio: ["Rýchlosť", "Chyby", "Čas", "Náklady"],
    prioDesc: { "Rýchlosť": "hotové skôr než ručne", "Chyby": "menej omylov než človek", "Čas": "ušetrené hodiny tímu", "Náklady": "až potom cena tokenov" },
    rows: w.Aura.autos.rows
  };
  var AU_HIST = w.Aura.autos.hist;
  function auAppDeps(slug) { var app = A().apps.bySlug(slug); return app ? app.deps : null; }
  function auVisible() {
    var appDeps = AU.filter.app ? auAppDeps(AU.filter.app) : null;
    return AU.rows.filter(function (r) {
      return (!AU.filter.dep || r.dep === AU.filter.dep) && (!AU.filter.trig || r.trig === AU.filter.trig) &&
        (!AU.filter.state || r.state === AU.filter.state) && (!appDeps || appDeps.indexOf(r.dep) > -1);
    });
  }
  function auStateBadge(s) { return '<span class="badge ' + (s === "Aktívna" ? "ok" : s === "Chyba" ? "bad" : "warn") + '">' + esc(s) + "</span>"; }
  function auTrigBadge(t) { return '<span class="badge ' + (t === "cron" ? "info" : t === "MCP" ? "mute" : "warn") + '">' + esc(t) + "</span>"; }
  function auById(id) { for (var i = 0; i < AU.rows.length; i++) if (AU.rows[i].id === id) return AU.rows[i]; return null; }

  /* trace strom behu (router→recall→generácia→MCP) — vnorený zoznam, kým engine strom nie je */
  function auTraceHTML(r, fromStep) {
    fromStep = fromStep || 0;
    var rt = A().rng((r.id || "x").split("").reduce(function (a, c) { return a + c.charCodeAt(0); }, 7));
    var routerMs = Math.round(120 + rt() * 260), recallMs = Math.round(8 + rt() * 120), genS = +(r.avg * 0.6 + rt() * 4).toFixed(1), genTok = Math.round(600 + r.avg * 45);
    function step(idx, title, meta, cls) {
      var sk = idx < fromStep;
      return '<div class="fi" style="cursor:default' + (sk ? ";opacity:.5" : "") + '"><span class="fd' + (sk ? "" : (cls || "")) + '"></span><span class="fx"><b style="font-size:var(--fs-sm)">' + title + (sk ? " · preskočené" : "") + '</b><span>' + (sk ? "použitý posledný výstup (cache)" : meta) + "</span></span></div>";
    }
    var mcpSk = 3 < fromStep;
    var mcpSteps = (r.mcp || []).map(function (n) { return '<div class="fi" style="cursor:default"><span class="fd v"></span><span class="fx"><b style="font-size:var(--fs-sm)">' + mcpIcon(n) + "MCP → " + esc(n) + '</b><span>egress cez klasifikátor · ' + F(Math.round(200 + rt() * 900), 0) + " ms · " + F(Math.round(40 + rt() * 180), 0) + " tok</span></span></div>"; }).join("");
    return '<div class="feed">' +
      step(0, "1 · Router (qwen3:4b)", "klasifikácia oddelenia · " + F(routerMs, 0) + " ms · " + F(Math.round(20 + rt() * 40), 0) + " tok", " ok") +
      step(1, "2 · Recall (RecallEngine)", "hybridné hľadanie v pamäti · " + F(recallMs, 0) + " ms · " + F(Math.round(3 + rt() * 5), 0) + " uzlov", "") +
      step(2, "3 · Generácia (qwen3:4b)", F(genS, 1) + " s · " + F(genTok, 0) + " tok · " + F(genTok / genS, 1) + " tok/s", " a") +
      '<details style="margin-top:2px"' + (mcpSk ? "" : " open") + '><summary style="font-size:var(--fs-label);color:var(--ink-3);cursor:pointer;padding:6px 0">4 · MCP nástroje — ' + F((r.mcp || []).length, 0) + (mcpSk ? " · preskočené" : "") + "</summary>" + (mcpSk ? '<p class="note">Preskočené — použitý posledný výstup.</p>' : (mcpSteps || '<p class="note">Bez MCP volaní.</p>')) + "</details>" +
      "</div>";
  }

  function auRunDetail(r, fromStep) {
    var Ax = A();
    var steps = ["1 · Router", "2 · Recall", "3 · Generácia", "4 · MCP nástroje"];
    var html = (fromStep ? '<div class="fchip">retry od kroku <b>' + esc(steps[fromStep]) + '</b> · predošlé preskočené</div>' : "") +
      '<dl><dt>Automatizácia</dt><dd>' + esc(r.name) + "</dd><dt>Oddelenie</dt><dd>" + esc(r.dep) + "</dd><dt>Spúšťač</dt><dd>" + auTrigBadge(r.trig) + " · " + esc(r.next) + "</dd><dt>Trvanie</dt><dd>" + F(r.avg, 0) + " min</dd><dt>Stav</dt><dd>" + auStateBadge(r.state) + "</dd></dl>" +
      '<p style="font-weight:600;margin:10px 0 6px">MCP nástroje</p><div style="margin-bottom:10px">' + (mcpRow(r.mcp) || "<span class=\"note\">žiadne</span>") + "</div>" +
      '<p style="font-weight:600;margin:10px 0 6px">Trace strom behu</p>' + auTraceHTML(r, fromStep) +
      (r.state === "Chyba" && !fromStep ? '<div class="alert bad" style="margin-top:10px"><span class="ai"></span><span><b>Beh zlyhal v kroku 4 (MCP → Canva)</b>Export vrátil timeout. „Retry od kroku" spustí len zvyšné kroky.</span></div>' : '<p class="note" style="margin-top:8px"><span class="srcbadge sim">simulované</span> Časy a tokeny na krok sú ukážkové.</p>');
    Ax.detail("Beh · " + r.name, html, [
      { label: "Retry celého behu", fn: function () { Ax.closeDetail(); auRun(r); } },
      { label: "Retry od kroku…", kind: "ghost", fn: function () { auRetryFromStep(r); } },
      { label: "Upraviť automatizáciu", kind: "ghost", fn: function () { auEditor(r); } }
    ]);
  }
  function auRetryFromStep(r) {
    var Ax = A();
    var steps = ["1 · Router", "2 · Recall", "3 · Generácia", "4 · MCP nástroje"];
    var html = '<p class="note">Vyberte krok, od ktorého sa beh zopakuje. Predošlé kroky sa preskočia a použije sa ich posledný výstup.</p><div class="feed">' +
      steps.map(function (s, i) { return '<button class="fi" data-step="' + i + '"><span class="fd"></span><span class="fx"><b style="font-size:var(--fs-sm)">' + esc(s) + '</b><span>zopakovať od tohto kroku</span></span></button>'; }).join("") + "</div>";
    Ax.detail("Retry od kroku · " + r.name, html, []);
    setTimeout(function () {
      $$("#dp-body button[data-step]").forEach(function (b) { b.addEventListener("click", function () { var i = +b.getAttribute("data-step"); Ax.toast(r.name + " · beh zopakovaný od kroku " + steps[i], "ok"); auRunDetail(r, i); }); });
    }, 20);
  }

  function auDetail(r) {
    var Ax = A();
    Ax.detail(r.name, "<dl>" +
      "<dt>Oddelenie</dt><dd>" + esc(r.dep) + "</dd>" +
      "<dt>Spúšťač</dt><dd>" + auTrigBadge(r.trig) + " · ďalší beh: " + esc(r.next) + "</dd>" +
      "<dt>MCP nástroje</dt><dd>" + (mcpRow(r.mcp) || "žiadne") + "</dd>" +
      "<dt>Priemerný čas</dt><dd>" + F(r.avg, 0) + " min / beh</dd>" +
      "<dt>Úspešnosť</dt><dd>" + F(r.ok, 0) + " %</dd>" +
      "<dt>Ušetrené</dt><dd>" + F(r.saved, 0) + " h / mesiac</dd>" +
      "<dt>Posledný beh</dt><dd>" + esc(r.last) + "</dd>" +
      "<dt>Stav</dt><dd>" + auStateBadge(r.state) + "</dd></dl>" +
      "<p style='font-weight:600;margin-bottom:6px'>Kroky agenta</p><ol style='margin:0;padding-left:18px;font-size:var(--fs-sm);color:var(--ink-2);line-height:1.9'>" + r.steps.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ol>" +
      (r.state === "Chyba" ? "<div class='alert bad' style='margin-top:12px'><span class='ai'></span><span><b>Posledný beh zlyhal</b>Export v Canve vrátil timeout. Automatizácia je pozastavená do zásahu.</span></div>" : "") +
      "<p class='note' style='margin-top:12px'>Poradie priorít: " + AU.prio.join(" › ") + ". Prevádzkové čísla sú ukážkové.</p>",
      [
        { label: r.state === "Pozastavená" ? "Obnoviť" : "Pozastaviť", kind: "ghost", fn: function () { r.state = r.state === "Pozastavená" ? "Aktívna" : "Pozastavená"; auRender(); Ax.closeDetail(); Ax.toast(r.name + " · " + r.state.toLowerCase(), "ok"); } },
        { label: "Detail behu (trace)", kind: "ghost", fn: function () { auRunDetail(r); } },
        { label: "Upraviť", kind: "ghost", fn: function () { auEditor(r); } },
        { label: "Spustiť teraz", fn: function () { Ax.closeDetail(); auRun(r); } }
      ]);
  }

  /* v4: plný editor create/edit so staged Uložiť */
  function auEditor(existing) {
    var Ax = A();
    var d = existing || { name: "", dep: AU.deps[0], trig: "cron", mcp: [], steps: ["", "", ""], avg: 15, next: "", ok: 90, saved: 0, state: "Aktívna" };
    var mcpAll = Object.keys(MCP_META);
    function depOpt(v) { return AU.deps.map(function (x) { return '<option' + (x === v ? " selected" : "") + ">" + esc(x) + "</option>"; }).join(""); }
    function trigOpt(v) { return ["cron", "MCP", "admin"].map(function (x) { return '<option' + (x === v ? " selected" : "") + ">" + esc(x) + "</option>"; }).join(""); }
    var html =
      '<div class="field"><label for="ae-name">Názov</label><input type="text" id="ae-name" value="' + esc(d.name) + '" placeholder="napr. Popisy produktov z katalógu"></div>' +
      '<div class="row g2"><div class="field"><label for="ae-dep">Oddelenie</label><select id="ae-dep">' + depOpt(d.dep) + '</select></div>' +
      '<div class="field"><label for="ae-trig">Spúšťač</label><select id="ae-trig">' + trigOpt(d.trig) + '</select></div></div>' +
      '<div class="field"><label>MCP nástroje</label><div class="chips" id="ae-mcp">' + mcpAll.map(function (n) { var on = (d.mcp || []).indexOf(n) > -1; return '<button type="button" class="chz" data-mcp="' + esc(n) + '" aria-pressed="' + on + '">' + mcpIcon(n) + esc(n) + "</button>"; }).join("") + "</div></div>" +
      '<div class="field"><label for="ae-steps">Kroky (jeden na riadok)</label><textarea id="ae-steps" rows="5" placeholder="1 krok = 1 riadok">' + esc((d.steps || []).join("\n")) + "</textarea></div>" +
      '<div class="row g2"><div class="field"><label for="ae-avg">Priemerný čas (min)</label><input type="number" id="ae-avg" min="1" max="240" value="' + F(d.avg, 0).replace(/\s/g, "") + '"></div>' +
      '<div class="field"><label for="ae-next">Ďalší beh (popis)</label><input type="text" id="ae-next" value="' + esc(d.next || "") + '" placeholder="napr. denne 06:00"></div></div>' +
      '<p class="note">Zmeny sa uložia až tlačidlom nižšie (staged).</p>';
    Ax.detail(existing ? "Upraviť automatizáciu" : "Nová automatizácia", html, [
      { label: existing ? "Uložiť zmeny" : "Vytvoriť automatizáciu", fn: function () {
        var name = $("#ae-name").value.trim();
        if (!name) { Ax.toast("Automatizácia potrebuje názov", "warn"); $("#ae-name").focus(); return; }
        var mcp = $$("#ae-mcp button[aria-pressed='true']").map(function (b) { return b.getAttribute("data-mcp"); });
        var steps = $("#ae-steps").value.split("\n").map(function (s) { return s.trim(); }).filter(Boolean);
        var avg = clamp(+$("#ae-avg").value || 15, 1, 240);
        var next = $("#ae-next").value.trim() || ($("#ae-trig").value === "MCP" ? "na MCP udalosť" : $("#ae-trig").value === "admin" ? "ručne adminom" : "podľa cronu");
        if (existing) { existing.name = name; existing.dep = $("#ae-dep").value; existing.trig = $("#ae-trig").value; existing.mcp = mcp; existing.steps = steps; existing.avg = avg; existing.next = next; Ax.toast("Automatizácia upravená", "ok"); }
        else { AU.seq++; AU.rows.unshift({ id: "A-" + (AU.seq < 10 ? "0" : "") + AU.seq, name: name, dep: $("#ae-dep").value, trig: $("#ae-trig").value, last: "—", next: next, ok: 90, saved: 0, state: "Aktívna", mcp: mcp, steps: steps, avg: avg }); Ax.toast("Automatizácia vytvorená", "ok"); }
        Ax.closeDetail(); auRender();
      } },
      { label: "Zrušiť", kind: "ghost", fn: function () { Ax.closeDetail(); } }
    ]);
    setTimeout(function () { $$("#ae-mcp button[data-mcp]").forEach(function (b) { b.addEventListener("click", function () { b.setAttribute("aria-pressed", String(b.getAttribute("aria-pressed") !== "true")); }); }); }, 20);
  }

  function auRun(r) {
    var Ax = A();
    Ax.toast(r.name + " · spustené (" + r.trig + ")");
    setTimeout(function () {
      var ok = r.state !== "Chyba";
      AU_HIST.unshift({ t: "teraz", agent: r.name, dep: r.dep, res: ok ? "hotovo" : "chyba", tok: 800 + r.avg * 40, min: r.avg, id: r.id });
      if (AU_HIST.length > 40) AU_HIST.pop();
      r.last = "teraz"; auRender();
      Ax.toast(r.name + (ok ? " · dokončené za " + F(r.avg, 0) + " min" : " · zlyhalo"), ok ? "ok" : "bad");
    }, 1400);
  }

  function auRenderRows(rows) {
    var tb = $("#au-tbl tbody"), cards = $("#au-cards");
    if (!tb) return;
    if (!rows.length) {
      tb.innerHTML = '<tr><td colspan="7"><div class="empty"><span class="eico">∅</span><p>Pre tento filter niet automatizácií.</p><button class="btn ghost" id="au-clr">Zrušiť filtre</button></div></td></tr>';
      cards.innerHTML = "";
      var c = $("#au-clr"); if (c) c.addEventListener("click", function () { AU.filter = { dep: "", trig: "", state: "" }; $("#au-dep").value = ""; $("#au-trig").value = ""; $("#au-state").value = ""; auRender(); auFchip(); });
      return;
    }
    tb.innerHTML = rows.map(function (r) {
      var toggle = '<button class="pill' + (r.state !== "Pozastavená" ? " on" : "") + '" data-toggle="' + r.id + '" aria-pressed="' + (r.state !== "Pozastavená") + '" aria-label="' + (r.state === "Pozastavená" ? "Spustiť automatizáciu" : "Pozastaviť automatizáciu") + '" style="padding:2px 9px;font-size:var(--fs-label)">' + (r.state === "Pozastavená" ? "Spustiť" : "Pauza") + "</button>";
      return '<tr data-row="' + r.id + '" tabindex="0"><td class="who" style="color:var(--ink);font-weight:500">' + esc(r.name) + " " + mcpRow(r.mcp) + "</td><td>" + esc(r.dep) + "</td><td>" + auTrigBadge(r.trig) + ' <span class="num" style="font-size:var(--fs-label);color:var(--ink-3)">' + esc(r.next) + '</span></td><td class="num" style="font-size:var(--fs-label)">' + esc(r.last) + '</td><td class="num">' + F(r.ok, 0) + ' %</td><td class="num">' + F(r.saved, 0) + " h</td><td>" + auStateBadge(r.state) + " " + toggle + "</td></tr>";
    }).join("");
    cards.innerHTML = rows.map(function (r) {
      return '<button type="button" class="rowcard" data-row="' + r.id + '"><div class="rh"><b>' + esc(r.name) + "</b>" + auStateBadge(r.state) + "</div><dl><dt>Oddelenie</dt><dd>" + esc(r.dep) + "</dd><dt>Spúšťač</dt><dd>" + esc(r.trig) + " · " + esc(r.next) + "</dd><dt>Úspešnosť</dt><dd>" + F(r.ok, 0) + " %</dd><dt>Ušetrené</dt><dd>" + F(r.saved, 0) + " h</dd></dl></button>";
    }).join("");
    A().bindRows($("#au-tbl tbody"), auById, auDetail);
    A().bindRows($("#au-cards"), auById, auDetail);
    $$("#au-tbl button[data-toggle]").forEach(function (b) {
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        var r = auById(b.getAttribute("data-toggle")); if (!r) return;
        r.state = r.state === "Pozastavená" ? "Aktívna" : "Pozastavená"; auRender();
        A().toast(r.name + " · " + r.state.toLowerCase(), "ok");
      });
    });
  }
  function auRenderHist() {
    var el = $("#au-hist"); if (!el) return;
    el.innerHTML = AU_HIST.slice(0, 12).map(function (h) {
      var d = h.res === "hotovo" ? "ok" : h.res === "chyba" ? "r" : "a";
      var r = auById(h.id);
      return '<button class="fi" data-hrun="' + esc(h.id || "") + '"><span class="fd ' + d + '"></span><span class="fx"><b>' + (r ? mcpRow(r.mcp) : "") + esc(h.agent) + '</b><span>' + esc(h.dep) + " · " + esc(h.res) + (h.tok ? " · " + F(h.tok, 0) + " tok · " + F(h.min, 0) + " min" : "") + '</span></span><span class="ft">' + esc(h.t) + "</span></button>";
    }).join("");
    $$("#au-hist button[data-hrun]").forEach(function (b) { b.addEventListener("click", function () { var r = auById(b.getAttribute("data-hrun")); if (r) auRunDetail(r); }); });
  }
  function auFchip() {
    var host = $("#au-fchip"); if (!host) return;
    var parts = [];
    if (AU.filter.app) { var ap = A().apps.bySlug(AU.filter.app); if (ap) parts.push("appka " + ap.name); }
    if (AU.filter.dep) parts.push(AU.filter.dep);
    if (AU.filter.trig) parts.push(AU.filter.trig);
    if (AU.filter.state) parts.push(AU.filter.state);
    host.innerHTML = parts.length ? '<div class="fchip">filtrované z <b>' + esc(parts.join(" · ")) + '</b> <button aria-label="Zrušiť filtre" id="au-fclr">✕</button></div>' : "";
    var b = $("#au-fclr"); if (b) b.addEventListener("click", function () { AU.filter = { dep: "", trig: "", state: "", app: "" }; $("#au-app").value = ""; $("#au-dep").value = ""; $("#au-trig").value = ""; $("#au-state").value = ""; auRender(); auFchip(); });
  }
  function auRenderPrio() {
    var host = $("#au-prio"); if (!host) return;
    host.innerHTML = AU.prio.map(function (p, i) {
      return '<div class="step"><span class="r">' + (i + 1) + '</span><b>' + esc(p) + '</b><span>' + esc(AU.prioDesc[p]) + '</span>' +
        '<div style="display:flex;gap:4px;margin-top:6px">' +
        '<button class="btn ghost" data-pup="' + i + '" aria-label="Presunúť vyššie" ' + (i === 0 ? "disabled" : "") + ' style="padding:2px 8px;font-size:var(--fs-label)">▲</button>' +
        '<button class="btn ghost" data-pdn="' + i + '" aria-label="Presunúť nižšie" ' + (i === AU.prio.length - 1 ? "disabled" : "") + ' style="padding:2px 8px;font-size:var(--fs-label)">▼</button></div></div>' +
        (i < AU.prio.length - 1 ? '<span class="arrow">›</span>' : "");
    }).join("");
    $$("#au-prio [data-pup]").forEach(function (b) { b.addEventListener("click", function () { var i = +b.getAttribute("data-pup"); if (i > 0) { var t = AU.prio[i - 1]; AU.prio[i - 1] = AU.prio[i]; AU.prio[i] = t; auRenderPrio(); A().toast("Priorita „" + AU.prio[i - 1] + "“ posunutá vyššie", "ok"); } }); });
    $$("#au-prio [data-pdn]").forEach(function (b) { b.addEventListener("click", function () { var i = +b.getAttribute("data-pdn"); if (i < AU.prio.length - 1) { var t = AU.prio[i + 1]; AU.prio[i + 1] = AU.prio[i]; AU.prio[i] = t; auRenderPrio(); A().toast("Priorita „" + AU.prio[i + 1] + "“ posunutá nižšie", "ok"); } }); });
  }
  function auRender() {
    auRenderRows(A().applySort($("#au-tbl"), auVisible()));
    auRenderHist();
    $("#au-cnt").textContent = auVisible().length + " z " + AU.rows.length;
  }

  w.Aura.screens.automatizacie = {
    title: "Automatizácie", group: "Práca",
    init: function () {
      var Ax = A(), Ch = C();
      $("#au-dep").innerHTML = '<option value="">Všetky oddelenia</option>' + AU.deps.map(function (d) { return "<option>" + esc(d) + "</option>"; }).join("");
      function auFillApps() {
        var cur = $("#au-app").value;
        $("#au-app").innerHTML = '<option value="">Všetky appky</option>' + Ax.apps.all().map(function (a) { return '<option value="' + esc(a.slug) + '">' + esc(a.name) + "</option>"; }).join("");
        $("#au-app").value = cur;
      }
      auFillApps();
      Ax.apps.onChange(auFillApps);
      ["#au-app", "#au-dep", "#au-trig", "#au-state"].forEach(function (sel) { $(sel).addEventListener("change", function () { AU.filter.app = $("#au-app").value; AU.filter.dep = $("#au-dep").value; AU.filter.trig = $("#au-trig").value; AU.filter.state = $("#au-state").value; auRender(); auFchip(); }); });

      var totalSaved = AU.rows.reduce(function (s, r) { return s + r.saved; }, 0);
      var avgOk = AU.rows.reduce(function (s, r) { return s + r.ok; }, 0) / AU.rows.length;
      $("#au-kpi").innerHTML = [
        { l: "Aktívne", v: F(AU.rows.filter(function (r) { return r.state === "Aktívna"; }).length, 0), d: "z " + AU.rows.length + " celkom" },
        { l: "Behov dnes", v: "38", d: "+6 oproti včera" },
        { l: "Úspešnosť", v: F(avgOk, 1), u: "%", d: "priemer" },
        { l: "Ušetrený čas", v: F(totalSaved, 0), u: "h", d: "za mesiac" }
      ].map(function (k, i) { return '<button class="kpi' + (i === 0 ? " tl" : "") + '" data-k="' + i + '"><span class="kl">' + esc(k.l) + '</span><b>' + esc(k.v) + (k.u ? ' <em>' + k.u + "</em>" : "") + '</b><span class="kd">' + esc(k.d) + "</span></button>"; }).join("");
      $$("#au-kpi .kpi").forEach(function (b, i) {
        b.addEventListener("click", function () {
          if (i === 0) { AU.filter = { dep: "", trig: "", state: "Aktívna" }; $("#au-state").value = "Aktívna"; auRender(); auFchip(); Ax.toast("Filter: aktívne", "ok"); }
          else if (i === 3) Ax.detail("Ušetrený čas", "<dl><dt>Spolu</dt><dd>" + F(totalSaved, 0) + " h / mesiac</dd><dt>Najviac</dt><dd>Copywriting</dd></dl><p class='note'>Súčet odhadovaného ušetreného času naprieč automatizáciami. Odhad, nie meranie.</p>", []);
          else Ax.toast("Behov dnes: 38 · úspešnosť " + F(avgOk, 1) + " %", "ok");
        });
      });

      auRenderPrio();
      $("#au-prio-reset").addEventListener("click", function () { AU.prio = ["Rýchlosť", "Chyby", "Čas", "Náklady"]; auRenderPrio(); Ax.toast("Poradie priorít obnovené", "ok"); });

      auRender(); auFchip();
      Ax.sortable($("#au-tbl"), auVisible, auRenderRows);

      $("#au-new").addEventListener("click", function () { auEditor(null); });
      $("#au-csv").addEventListener("click", function () {
        var rows = auVisible();
        Ax.download("auraai-automatizacie.csv", Ax.toCSV(["ID", "Automatizácia", "Oddelenie", "Spúšťač", "Ďalší beh", "Posledný beh", "Úspešnosť %", "Ušetrené h", "Stav"], rows.map(function (r) { return [r.id, r.name, r.dep, r.trig, r.next, r.last, r.ok, r.saved, r.state]; })), "text/csv;charset=utf-8");
        Ax.toast("Exportovaných " + rows.length + " automatizácií", "ok");
      });
      $("#au-live").addEventListener("click", function () { AU.live = !AU.live; this.classList.toggle("on", AU.live); this.setAttribute("aria-pressed", String(AU.live)); Ax.toast(AU.live ? "Živý feed behov zapnutý" : "Živý feed vypnutý", "ok"); });
      w.addEventListener("aura:tick", function () {
        if (!AU.live || Ax.state.screen !== "automatizacie") return;
        var act = AU.rows.filter(function (r) { return r.state === "Aktívna"; });
        var r = act[Math.floor((AU_HIST.length * 7) % act.length)] || AU.rows[0];
        AU_HIST.unshift({ t: "teraz", agent: r.name, dep: r.dep, res: "hotovo", tok: 600 + r.avg * 30, min: r.avg, id: r.id });
        if (AU_HIST.length > 40) AU_HIST.pop();
        auRenderHist();
      });

      var days14 = Ax.days(14);
      Ch.render("#au-ch-ok", {
        type: "line", title: "Úspešnosť behov v čase", height: 200, caption: "posledných 14 dní · 1 bod = 1 deň · priebeh simulovaný", x: { labels: days14 }, xTitle: "Deň",
        yLeft: { unit: "%", min: 70, max: 100, dec: 0 }, thresholds: [{ value: 90, label: "cieľ 90 %", color: "var(--gold)" }],
        series: [{ key: "o", label: "úspešnosť", unit: "%", dec: 0, color: "var(--teal)", data: Ax.series(771, 14, 91, 5, 0.2).map(function (v) { return { y: +clamp(v, 72, 100).toFixed(0) }; }) }]
      });
      var okData = Ax.series(771, 14, 91, 5, 0.2).map(function (v) { return +clamp(v, 72, 100).toFixed(0); });
      bindTableToggle("au-ok-tbl", "au-ok-t", function () { return mkTable(["Deň", "Úspešnosť %"], days14.map(function (d, i) { return [d, F(okData[i], 0)]; })); });

      var depNames = ["Copywriting", "Newsletter", "Performance", "Foto & retuš", "Video"], depSeeds = [11, 22, 33, 44, 55], depCols = ["var(--teal)", "var(--gold)", "var(--violet)", "var(--good)", "var(--teal-3)"];
      var depData = depNames.map(function (d, i) { return Ax.series(depSeeds[i], 14, 3, 4, 0).map(function (v) { return Math.max(0, Math.round(v)); }); });
      Ch.render("#au-ch-dep", {
        type: "stacked", title: "Behy podľa oddelenia", height: 200, caption: "posledných 14 dní · 1 stĺpec = 1 deň", x: { labels: days14 }, xTitle: "Deň", yLeft: { unit: "behov", dec: 0 },
        series: depNames.map(function (d, i) { return { key: d, label: d, unit: "beh", dec: 0, color: depCols[i], data: depData[i].map(function (v) { return { y: v }; }) }; })
      });
      bindTableToggle("au-dep-tbl", "au-dep-t", function () { return mkTable(["Deň"].concat(depNames), days14.map(function (dd, i) { return [dd].concat(depNames.map(function (_, j) { return F(depData[j][i], 0); })); })); });

      var savedData = Ax.series(991, 30, 6, 3, 5.2).map(function (v) { return Math.round(v); });
      var d30 = Ax.days(30);
      Ch.render("#au-ch-saved", {
        type: "area", title: "Ušetrený čas kumulatívne", height: 200, caption: "za 30 dní · 1 bod = 1 deň · priebeh simulovaný", x: { labels: d30 }, xTitle: "Deň", yLeft: { unit: "h", dec: 0 },
        series: [{ key: "h", label: "ušetrené hodiny", unit: "h", dec: 0, color: "var(--teal)", data: savedData.map(function (v) { return { y: v }; }) }]
      });
      bindTableToggle("au-saved-tbl", "au-saved-t", function () { return mkTable(["Deň", "Ušetrené h"], d30.map(function (d, i) { return [d, F(savedData[i], 0)]; })); });

      Ch.render("#au-ch-trig", {
        type: "donut", title: "Podľa spúšťača", height: 200, unit: "automatizácií", centerLabel: F(AU.rows.length, 0), centerSub: "spolu", caption: "ako sa automatizácie spúšťajú",
        items: [
          { label: "MCP", v: AU.rows.filter(function (r) { return r.trig === "MCP"; }).length, color: "var(--teal)" },
          { label: "cron", v: AU.rows.filter(function (r) { return r.trig === "cron"; }).length, color: "var(--gold)" },
          { label: "admin", v: AU.rows.filter(function (r) { return r.trig === "admin"; }).length, color: "var(--violet)" }
        ],
        onSlice: function (it) { AU.filter = { dep: "", trig: it.label, state: "" }; $("#au-trig").value = it.label; auRender(); auFchip(); Ax.toast("Filter spúšťača: " + it.label, "ok"); }
      });

      Ax.registerCmd([
        { label: "Automatizácie — agenti", hint: "Práca", run: function () { Ax.go("automatizacie"); } },
        { label: "Nová automatizácia", hint: "Automatizácie", run: function () { Ax.go("automatizacie"); setTimeout(function () { auEditor(null); }, 260); } },
        { label: "Spustiť automatizáciu popisov", hint: "Automatizácie", run: function () { Ax.go("automatizacie"); setTimeout(function () { auRun(auById("A-01")); }, 300); } }
      ]);
    },
    onShow: function (sub) {
      if (!sub) return;
      /* deep-link z appky: #/automatizacie/app:<slug> */
      if (sub.indexOf("app:") === 0) {
        var slug = sub.slice(4);
        if (A().apps.bySlug(slug)) {
          AU.filter = { dep: "", trig: "", state: "", app: slug };
          var s = $("#au-app"); if (s) s.value = slug;
          ["#au-dep", "#au-trig", "#au-state"].forEach(function (q) { var e = $(q); if (e) e.value = ""; });
          auRender(); auFchip();
        }
        return;
      }
      var r = auById(sub.toUpperCase());
      if (r) setTimeout(function () { auDetail(r); }, 120);
    }
  };

  /* trace strom a detail behu sprístupníme aj obrazovke Appky (jeden vzor, jedno miesto) */
  w.Aura.autos.runDetail = function (r, fromStep) { auRunDetail(r, fromStep); };
  w.Aura.autos.trace = function (r, fromStep) { return auTraceHTML(r, fromStep); };
  w.Aura.autos.mcpRow = function (list) { return mcpRow(list); };
  w.Aura.autos.mcpIcon = function (name) { return mcpIcon(name); };
  w.Aura.autos.MCP = MCP_META;
  w.Aura.autos.stateBadge = function (s) { return auStateBadge(s); };

})(window);
