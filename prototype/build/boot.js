/* ===== AuraAI boot — dopojenie kostry a štart ===== */
(function (w) {
  "use strict";
  var A = w.Aura, $ = A.$;

  /* ---------- sekcie: rozdelia obrazovku na pomenované bloky ----------
     Bez nich beží 15 kariet za sebou s rovnakou 13px medzerou a obrazovka
     sa nedá preletieť očami. Nadpis sa vkladá pred kartu s daným názvom. */
  var SECTIONS = {
    jadro: [
      ["qwen3:4b", "Modely", "Čo je práve zavedené v pamäti a ako sa to správa."],
      ["Rozklad latencie", "Latencia a kvalita", "Kde sa míňa čas odpovede a či vyhľadávanie stále trafí správny kontext."],
      ["Využitie RAM", "Pamäť a stroj", "Koľko z 48 GB je obsadených a v akom stave je hardvér."],
      ["Otvorený problém", "Otvorené problémy", "Známe slabé miesta, ktoré ešte nie sú vyriešené."],
      ["Ovládanie jadra", "Ovládanie", "Zásahy do behu — prepnutie modelu, údržba, meranie."]
    ],
    naklady: [
      ["Ušetrené oproti cloudu", "Koľko to šetrí", "Hlavné číslo a sadzby, z ktorých sa počíta."],
      ["Kumulatívna úspora", "Vývoj v čase", "Ako úspora, objem a spotreba rástli."],
      ["Podľa zóny dát", "Kam spotreba ide", "Rozpad podľa zóny, typu úlohy a appky."],
      ["Mesiace", "Mesačný prehľad", "Podrobné čísla po mesiacoch."]
    ],
    upozornenia: [
      ["Aktívne", "Čo horí teraz", "Nevyriešené problémy a stav za posledný mesiac."],
      ["Časová os incidentov", "Ako to vyzerá v čase", "Kedy problémy vznikali a ako rýchlo sa riešili."],
      ["Pravidlá upozornení", "Pravidlá a história", "Kedy sa má ozvať a čo sa už vyriešilo."]
    ],
    logy: [
      ["Objem logov", "Objem a chyby", "Koľko záznamov vzniká a odkiaľ chodia chyby."],
      ["Záznamy", "Záznamy", "Fulltext cez všetky stĺpce, ignoruje diakritiku."]
    ],
    mapa: [
      ["Radiálna mapa", "Mapa pamäte", "Klik zanorí o úroveň nižšie, hľadanie zvýrazní zhody."],
      ["Rast uzlov", "Ako pamäť rastie", "Prírastok uzlov a ich rozdelenie podľa typu."]
    ],
    cortexy: [
      ["Laloky a hustota", "Neurónová sieť", "Uzly a synapsie v piatich lalokoch. Hover rozsvieti spojenia, prepínač odkrýva vrstvy."],
      ["Hustota prepojení", "Ako sieť rastie", "Hustota podľa oblasti a rast spojení v čase."]
    ],
    automatizacie: [
      ["Poradie priorít", "Priorita", "Podľa čoho sa rozhoduje, čo agenti automatizujú."],
      ["Automatizácie", "Zoznam automatizácií", "Kto beží, na akom spúšťači a koľko šetrí."],
      ["Úspešnosť behov", "Výkon v čase", "Úspešnosť, objem a ušetrený čas."],
      ["História behov", "História", "Beh po behu — čo agenti spravili."]
    ],
    dnes: [
      ["Aktivita po hodinách", "Priebeh dňa", "Kedy sa dnes pracovalo a čo z toho vzniklo."],
      ["Heatmapa učenia", "Dlhodobý pohľad", "Séria dní a rozloženie učenia v čase."],
      ["Nové uzly dnes", "Čo pribudlo", "Konkrétne uzly — klik otvorí mapu na danom mieste."]
    ],
    hladanie: [
      ["Dopyt", "Hľadanie", "Skóre, typ zásahu a čas pri každom výsledku."],
      ["Kvalita vyhľadávania", "Kvalita a rýchlosť", "Ako dobre a ako rýchlo pamäť nachádza kontext."],
      ["História dopytov", "História", "Z týchto dopytov sa počíta hit@5 a MRR."]
    ],
    chat: [
      ["Rýchlosť generovania", "Meranie odpovede", "Priebeh generovania a využitie kontextového okna."]
    ],
    smernica: [
      ["Skladanie smernice", "Tvorba", "Vľavo sa skladá, vpravo hneď vidno výsledok."],
      ["Smernice v čase", "Prehľad", "Koľko ich vzniká a z akých šablón."]
    ],
    nastavenia: [
      ["Modely a runtime", "Model a beh", "Čo sa zavádza do pamäte a s akým kontextom."],
      ["Prahy a upozornenia", "Prahy a zóny", "Kedy sa má appka ozvať a čo smie odísť von."],
      ["Ceny, zálohy", "Prevádzka", "Sadzby, zálohy, jazyk, téma a MCP nástroje."]
    ]
  };
  function injectSections() {
    Object.keys(SECTIONS).forEach(function (key) {
      var view = document.getElementById("v-" + key);
      if (!view) return;
      SECTIONS[key].forEach(function (sec, i) {
        var target = null;
        Array.prototype.some.call(view.querySelectorAll(".ch h3"), function (h3) {
          if ((h3.textContent || "").trim().indexOf(sec[0]) !== 0) return false;
          var node = h3.closest(".card") || h3.closest(".kpi");
          while (node && node.parentNode !== view) node = node.parentNode;
          if (node) { target = node; return true; }
          return false;
        });
        if (!target) return;
        var head = document.createElement("div");
        head.className = "sech";
        head.innerHTML = '<span class="n">' + ("0" + (i + 1)).slice(-2) + "</span>" +
          "<h2>" + A.esc(sec[1]) + "</h2>" +
          (sec[2] ? "<p>" + A.esc(sec[2]) + "</p>" : "");
        view.insertBefore(head, target);
      });
    });
  }
  injectSections();

  /* mini sparkliny v bočnom paneli */
  var ramHist = A.series(7714, 40, 62, 3.2, 0.05);
  var cpuHist = A.series(3311, 40, 66, 9, 0.02);
  function miniSpark(sel, data, color) {
    AuraChart.render(sel, {
      type: "sparkline", title: sel === "#mini-ram" ? "RAM trend" : "CPU trend", height: 20, legend: false,
      series: [{ data: data.map(function (v) { return { y: v }; }), color: color, unit: "%" }]
    });
  }
  miniSpark("#mini-ram", ramHist, "var(--teal)");
  miniSpark("#mini-cpu", cpuHist, "var(--gold)");

  var RUNNING = [
    "Recall — „rozhodnutia o hardvéri“",
    "Embedovanie dopytu (bge-m3)",
    "Generovanie odpovede — 9,4 tok/s",
    "Zápis uzla do pamäte"
  ];
  var rIdx = 0, tick = 0;
  w.addEventListener("aura:tick", function () {
    tick++;
    ramHist.push(Math.max(40, Math.min(96, ramHist[ramHist.length - 1] + (Math.random() - 0.48) * 2.4)));
    ramHist.shift();
    cpuHist.push(Math.max(10, Math.min(99, cpuHist[cpuHist.length - 1] + (Math.random() - 0.5) * 9)));
    cpuHist.shift();
    miniSpark("#mini-ram", ramHist, "var(--teal)");
    miniSpark("#mini-cpu", cpuHist, "var(--gold)");
    $("#mini-ram-v").textContent = AuraChart.fmtNum(ramHist[ramHist.length - 1], 0) + " %";
    $("#mini-cpu-v").textContent = AuraChart.fmtNum(cpuHist[cpuHist.length - 1], 0) + " %";
    if (tick % 4 === 0) {
      rIdx = (rIdx + 1) % RUNNING.length;
      $("#running-t").textContent = RUNNING[rIdx];
    }
  });

  /* rýchle akcie */
  $("#qa-chat").addEventListener("click", function () { A.go("chat"); A.toast("Nová konverzácia", "ok"); });
  $("#qa-search").addEventListener("click", A.openCmd);
  $("#qa-eval").addEventListener("click", function () {
    /* zjednotené s Jadrom: prejdi na Jadro a spusti reálny eval s progres-barom */
    A.go("jadro");
    setTimeout(function () { var b = document.getElementById("j-eval"); if (b) b.click(); else A.toast("Eval batéria spustená", "ok"); }, 280);
  });
  var paused = false;
  $("#qa-pause").addEventListener("click", function () {
    var self = this;
    A.confirm(paused ? "Spustiť jadro?" : "Pozastaviť jadro?",
      paused ? "Fronta sa začne znova spracúvať." : "Nové dopyty sa zaradia do fronty, ale nebudú sa spracúvať.",
      function () {
        paused = !paused;
        self.textContent = paused ? "Spustiť jadro" : "Pauza jadra";
        $("#running").style.opacity = paused ? ".45" : "1";
        $("#running-t").textContent = paused ? "Pozastavené" : RUNNING[rIdx];
        A.toast(paused ? "Jadro pozastavené" : "Jadro beží", paused ? "warn" : "ok");
      }, paused ? "Spustiť" : "Pozastaviť", !paused);
  });
  /* odznaky v navigácii držia živé čísla, nie napevno zapísané */
  function navBadges() {
    var d = $("#nav-dnes"), a = $("#nav-auto"), ap = $("#nav-appky");
    if (d && A.mem) { var n = A.mem.today().length; d.textContent = n ? "+" + n : ""; d.hidden = !n; }
    if (a && A.autos) a.textContent = A.autos.rows.filter(function (r) { return r.state === "Aktívna"; }).length;
    if (ap && A.apps) ap.textContent = A.apps.all().length;
  }
  navBadges();
  if (A.mem) A.mem.onChange(navBadges);
  if (A.apps) A.apps.onChange(navBadges);

  /* zvonček: aktívne upozornenia s názvom appky + skok (Q51/Q72) */
  $("#bellBtn").addEventListener("click", function () {
    var list = A.alerts ? A.alerts() : [];
    if (!list.length) { A.go("observabilita"); return; }
    var html = '<div class="feed">' + list.map(function (a, i) {
      var app = A.alertApp ? A.alertApp(a) : null;
      return '<button class="fi" data-al="' + i + '"><span class="fd' + (a.lvl === "info" ? "" : a.lvl === "warn" ? " a" : " r") + '"></span>' +
        '<span class="fx"><b style="font-size:12.5px">' + (app ? A.esc(app.name) + " — " : "") + A.esc(a.t) + "</b><span>" + A.esc(a.d) + " · od " + A.esc(a.since) + "</span></span></button>";
    }).join("") + "</div>";
    A.detail("Aktívne upozornenia (" + list.length + ")", html, [
      { label: "Otvoriť Observabilitu", fn: function () { A.closeDetail(); A.go("observabilita"); } }
    ]);
    setTimeout(function () {
      A.$$("#dp-body [data-al]").forEach(function (b) {
        b.addEventListener("click", function () {
          var a = list[+b.getAttribute("data-al")], app = A.alertApp ? A.alertApp(a) : null;
          A.closeDetail();
          if (app) A.go("appky", app.slug); else A.go("observabilita");
        });
      });
    }, 20);
  });

  /* ---------- globálne „+ Nový" ---------- */
  var newBtn = $("#newBtn"), newPop = $("#newPop");
  if (newBtn && newPop) {
    function closeNew() { newPop.classList.remove("on"); newBtn.setAttribute("aria-expanded", "false"); }
    newBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      var on = newPop.classList.toggle("on");
      newBtn.setAttribute("aria-expanded", String(on));
    });
    document.addEventListener("click", function (e) { if (!newPop.contains(e.target) && e.target !== newBtn) closeNew(); });
    newPop.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-new]"); if (!b) return;
      closeNew();
      var kind = b.getAttribute("data-new");
      if (kind === "node") {
        if (A.mem) { var nd = A.mem.create({ name: "Nový uzol", desc: "" }); A.mem.inspect(nd); A.toast("Nový uzol — vyplň a ulož", "ok"); }
      } else if (kind === "chat") { A.go("chat"); A.toast("Nová konverzácia", "ok"); }
      else if (kind === "smernica") { A.go("smernica"); }
      else if (kind === "automatizacia") { A.go("automatizacie", "new"); }
    });
  }

  /* „práve beží" — klik otvorí, čo beží (Q75) */
  var runEl = $("#running");
  if (runEl) {
    runEl.style.cursor = "pointer";
    runEl.setAttribute("tabindex", "0");
    runEl.setAttribute("role", "button");
    var openRun = function () {
      A.detail("Práve beží", '<p>' + A.esc($("#running-t").textContent) + '</p>' +
        '<p class="note" style="margin-top:8px">Recall prehľadáva pamäť a skladá kontext pre odpoveď. ' +
        'Klikni na uzol nižšie a otvorí sa v inšpektore.</p>' +
        '<div class="reln" style="margin-top:10px">' + (A.mem ? A.mem.today().slice(0, 4).map(function (n) {
          return '<button class="lk" data-run-node="' + n.id + '">' + A.mem.typeIcon(n.type) + ' ' + A.esc(n.name) + '</button>';
        }).join("") : "") + '</div>',
        [{ label: "Otvoriť pamäť", kind: "ghost", fn: function () { A.closeDetail(); A.go("pamat"); } }]);
      A.$$("[data-run-node]").forEach(function (b) { b.addEventListener("click", function () { A.mem.inspect(this.getAttribute("data-run-node")); }); });
    };
    runEl.addEventListener("click", openRun);
    runEl.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openRun(); } });
  }

  /* pätička s priznaním, čo je merané a čo simulované */
  $("#global-disc").innerHTML =
    "Náhľad rozhrania AuraAI · lokálne jadro na stroji AMD 9900 + iGPU, 48 GB RAM, CPU inferencia · " +
    "modely qwen3:4b (router) a bge-m3 (embeddings) cez Ollama.<br>" +
    "Merané hodnoty z eval batérie 31. 7. 2026 sú prenesené verbatim: router 95,3 % (41/43), " +
    "model bez regex vrstvy 87,5 %, recall hit@5 86,7 %, MRR 0,800, /api/search p50 4,2 s, " +
    "RecallEngine 8–130 ms, prekryv embeddingov SK↔EN 3/20. " +
    "Priebehy v čase sú <b>simulované</b> — história týchto metrík sa zatiaľ nezbiera. " +
    "Prevádzkové dáta (logy, fronta, náklady) sú ukážkové.<br>" +
    "Súbor je self-contained: fonty Geist a Playfair Display sú vložené priamo v ňom, " +
    "appka nerobí žiadnu sieťovú požiadavku a funguje offline. Bez localStorage.";

  /* ---------- univerzálne ⌘K: uzly pamäte + akcie ---------- */
  if (A.mem) {
    A.registerCmd(A.mem.nodes().map(function (n) {
      return { label: n.name, hint: A.mem.zoneLabel(n.area) + " · " + n.type, run: function () { A.mem.inspect(n); } };
    }));
    A.registerCmd([
      { label: "Nový uzol", hint: "vytvoriť pamäť", run: function () { var nd = A.mem.create({ name: "Nový uzol" }); A.mem.inspect(nd); } },
      { label: "Slabé uzly", hint: "čistenie pamäte", run: function () { A.go("pamat", "slabe"); } },
      { label: "Triage — dnes pridané", hint: "prehodnotiť", run: function () { A.go("pamat", "dnes"); } },
      { label: "Spustiť eval", hint: "router · embed · recall", run: function () { A.go("jadro"); A.toast("Eval batéria spustená", "ok"); } },
      { label: "Prepnúť tému", hint: "svetlá / tmavá", run: function () { A.setTheme(A.state.theme === "light" ? "dark" : "light"); } }
    ]);
  }

  A.boot();
})(window);
