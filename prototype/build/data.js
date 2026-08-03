/* ===== AuraAI — kanonický model pamäte (Aura.mem) =====================
   Jeden zdroj pravdy pre uzly, oblasti, hrany, backlinks a CRUD.
   Používajú ho VŠETKY obrazovky (Pamäť, Chat, Smernica, Logy…).
   #/node/<slug> route otvorí editovateľný inšpektor odkiaľkoľvek.
   ===================================================================== */
(function (w) {
  "use strict";
  var A = w.Aura, esc = A.esc;

  /* deterministické pomôcky (rovnaké semienko = rovnaké hodnoty) */
  function h32(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; } return h; }
  function det(s) { return A.rng(h32(s)); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  var NB = " ";
  function F(v, d) { return w.AuraChart.fmtNum(v, d); }

  /* ---------- reálne oblasti a počty z mind_overview (verbatim) ---------- */
  var AREAS = [
    { k: "dev", name: "Vývoj & kód", n: 271, color: "var(--teal)", deps: [
      { name: "Laravel & PHP", n: 68, type: "skill", nodes: ["Eloquent vzťahy a eager loading", "Service container a väzby", "Vlastné Artisan príkazy"] },
      { name: "JavaScript & Vite", n: 54, type: "skill", nodes: ["Vite build a delenie kódu", "ES moduly bez bundlera", "Vykresľovanie do canvasu 2D"] },
      { name: "Python & skripty", n: 39, type: "skill", nodes: ["Dávkové spracovanie CSV", "Migrácia vektorov medzi modelmi", "Automatizácia zálohy pamäte"] },
      { name: "Databázy & SQL", n: 33, type: "skill", nodes: ["SQLite ako vektorový sklad", "Indexy nad JSON stĺpcami", "Migrácie bez výpadku"] },
      { name: "DevOps & Docker", n: 31, type: "skill", nodes: ["Ollama v kontajneri", "Reverzná proxy na porte 8082", "Limity pamäte kontajnera"] },
      { name: "Git & CI", n: 25, type: "skill", nodes: ["Vetvenie pre paralelných agentov", "Kontroly pred commitom", "Návrat po zlom zlúčení"] },
      { name: "Testovanie", n: 21, type: "skill", nodes: ["Eval batéria routera", "Snímkové testy rozhrania", "Meranie latencie recallu"] }
    ] },
    { k: "biz", name: "Biznis & projekty", n: 160, color: "var(--gold)", deps: [
      { name: "Aura AI", n: 44, type: "project", nodes: ["Architektúra refactoru Hadesa", "Rozdelenie mind.js na moduly", "Plán upgradu stroja"] },
      { name: "E-shop Šperky", n: 38, type: "project", nodes: ["Štruktúra katalógu", "Tón popisov produktov", "Pravidlá kategorizácie"] },
      { name: "Klienti & ponuky", n: 31, type: "project", nodes: ["Šablóna cenovej ponuky", "Otázky pri prvom hovore", "Rozsah a hranice zákazky"] },
      { name: "Financie & fakturácia", n: 26, type: "memory", nodes: ["Splatnosť a upomienky", "Rozdelenie nákladov na projekty", "Sadzby podľa typu práce"] },
      { name: "Procesy", n: 21, type: "memory", nodes: ["Denný rituál plánovania", "Odovzdávanie práce agentom", "Kontrolný zoznam pred nasadením"] }
    ] },
    { k: "mkt", name: "Marketing & SEO", n: 152, color: "var(--violet)", deps: [
      { name: "Obsah & copy", n: 41, type: "skill", nodes: ["Štruktúra článku pre vyhľadávanie", "Písanie nadpisov", "Prepis odborného textu do ľudskej reči"] },
      { name: "Technické SEO", n: 35, type: "skill", nodes: ["Indexovateľnosť a robots", "Rýchlosť načítania a LCP", "Štruktúrované údaje produktov"] },
      { name: "Analytika", n: 29, type: "memory", nodes: ["Čítanie Search Console", "Rozdiel medzi dojmami a klikmi", "Sezónnosť dopytu po šperkoch"] },
      { name: "Sociálne siete", n: 26, type: "project", nodes: ["Plán príspevkov na mesiac", "Formát krátkych videí", "Reakcie na komentáre"] },
      { name: "Reklama PPC", n: 21, type: "memory", nodes: ["Rozpočet podľa marže", "Vylučujúce kľúčové slová", "Meranie návratnosti"] }
    ] },
    { k: "per", name: "Osobné & preferencie", n: 91, color: "var(--good)", deps: [
      { name: "Štýl komunikácie", n: 27, type: "memory", nodes: ["Krátke vety, žiadna vata", "Priame pomenovanie problému", "Bez marketingového tónu"] },
      { name: "Pracovné návyky", n: 24, type: "memory", nodes: ["Hlboká práca v dopoludní", "Jedna veľká úloha denne", "Rozhodnutia sa zapisujú"] },
      { name: "Nástroje & prostredie", n: 22, type: "memory", nodes: ["Tmavá téma všade", "Klávesnica pred myšou", "Lokálne pred cloudom"] },
      { name: "Jazyk & tón", n: 18, type: "memory", nodes: ["Slovenčina s diakritikou", "Odborné termíny bez prekladu", "Žiadne emoji vo výstupoch"] }
    ] },
    { k: "dsg", name: "Dizajn & kreatíva", n: 36, color: "var(--amber)", deps: [
      { name: "Typografia", n: 13, type: "skill", nodes: ["Serif na nadpisy, sans na text", "Tabuľkové číslice v dátach", "Minimálna veľkosť 11 px"] },
      { name: "Farby & témy", n: 12, type: "memory", nodes: ["Teal a zlatá ako pár", "Kontrast aspoň 4,5:1", "Svetlá téma nie je inverzia"] },
      { name: "Rozloženie", n: 11, type: "skill", nodes: ["Mriežka 12 stĺpcov", "Hustota dát pred bielym miestom", "Karta ako základná jednotka"] }
    ] }
  ];
  var CORE_NODES = 4, TOTAL_AREA = 710, TOTAL_ALL = TOTAL_AREA + CORE_NODES; /* 714 */

  /* zóny = oblasti (kód + názov, konzistentne všade) — Q33 */
  var ZONE_CODE = { dev: "Z1", biz: "Z2", mkt: "Z3", per: "Z4", dsg: "Z5" };

  /* ---------- zdroje mind_learn (proveniencia) ---------- */
  var SESSIONS = ["session · Claude Code 31. 7.", "session · Codex 29. 7.", "mind_learn · manuálne", "session · Claude Code 24. 7.", "import · mind.js refactor"];

  /* ---------- vybuduj uzly (oddelenia + listy) ---------- */
  var _nodes = [], _byId = {};
  (function build() {
    AREAS.forEach(function (a, ai) {
      a.i = ai; a.slug = a.k; a.share = a.n / TOTAL_AREA; a.zone = ZONE_CODE[a.k];
      a.deps.forEach(function (d, di) {
        var r = det(a.k + "|" + d.name);
        d.area = a; d.i = di; d.slug = a.k + "-" + di;
        d.str = +clamp(0.34 + r() * 0.62, 0, 1).toFixed(2);
        d.conf = +clamp(0.48 + r() * 0.5, 0, 1).toFixed(2);
        d.born = +(r() * 0.45).toFixed(3);
        d.acts = Math.round(6 + r() * 54);
        d.last = Math.round(r() * 21);
        d.hist = A.series(h32(d.slug), 14, 3, 4, 0.15);
        d.nodeList = d.nodes.map(function (nm, ni) {
          var rr = det(d.slug + "|" + nm);
          var nd = {
            id: d.slug + "-" + ni, slug: d.slug + "-" + ni, name: nm,
            dep: d, area: a, type: d.type,
            str: +clamp(0.3 + rr() * 0.68, 0, 1).toFixed(2),
            conf: +clamp(0.45 + rr() * 0.54, 0, 1).toFixed(2),
            acts: Math.round(2 + rr() * 40),
            age: Math.round(rr() * 320),
            hist: A.series(h32(d.slug + nm), 14, 2, 3, 0.1),
            tags: [], pinned: false, archived: false, desc: "",
            src: SESSIONS[Math.floor(rr() * SESSIONS.length)],
            edits: [], today: false
          };
          _nodes.push(nd); _byId[nd.id] = nd;
          return nd;
        });
      });
    });
    /* zopár „dnes aktívnych" pre triage (deterministicky) */
    var rt = det("today-active");
    _nodes.forEach(function (n) { if (rt() < 0.14) { n.today = true; } });
  })();

  var ALL_DEPS = AREAS.reduce(function (acc, a) { return acc.concat(a.deps); }, []);

  /* ---------- hrany / synapsie (odvodené, nie merané) ----------
     husté vnútri oddelenia, mosty pri zdieľanom type medzi oblasťami */
  var _edges = [], _adj = {};
  (function edges() {
    function link(a, b, w0) {
      if (a.id === b.id) return;
      _edges.push({ a: a.id, b: b.id, w: w0 });
      (_adj[a.id] = _adj[a.id] || []).push({ id: b.id, w: w0 });
      (_adj[b.id] = _adj[b.id] || []).push({ id: a.id, w: w0 });
    }
    ALL_DEPS.forEach(function (d) {
      var ns = d.nodeList;
      for (var i = 0; i < ns.length; i++) for (var j = i + 1; j < ns.length; j++) link(ns[i], ns[j], 0.8);
    });
    /* mosty: pre každý uzol nájdi 1 uzol v inej oblasti s rovnakým typom */
    var r = det("bridges");
    _nodes.forEach(function (n) {
      if (r() > 0.5) return;
      var cand = _nodes.filter(function (m) { return m.type === n.type && m.area.k !== n.area.k; });
      if (!cand.length) return;
      link(n, cand[Math.floor(r() * cand.length)], 0.35);
    });
  })();

  /* ---------- backlinks registry (kto uzol referuje) ----------
     obrazovky volajú mem.link(nodeId, {kind,label,go}) pri inite */
  var _back = {};
  function addBack(id, ref) { (_back[id] = _back[id] || []).push(ref); }

  /* ---------- listeners na zmeny ---------- */
  var _subs = [];
  function emit(kind, node) { _subs.forEach(function (fn) { try { fn(kind, node); } catch (e) { console.error(e); } }); }

  /* ---------- hybridné vyhľadávanie (lexikálne + odvodené vektorové) ---------- */
  function score(n, q) {
    var fq = A.fold(q), nm = A.fold(n.name), dp = A.fold(n.dep.name), ar = A.fold(n.area.name);
    var lex = nm.indexOf(fq) === 0 ? 1 : nm.indexOf(fq) > -1 ? 0.72 : (dp.indexOf(fq) > -1 || ar.indexOf(fq) > -1) ? 0.4 : 0;
    var tokq = fq.split(/\s+/).filter(Boolean), hit = 0;
    tokq.forEach(function (t) { if (nm.indexOf(t) > -1) hit++; });
    var vec = tokq.length ? (hit / tokq.length) * (0.55 + n.conf * 0.4) : 0;
    var s = Math.max(lex, vec * 0.9) * (0.7 + n.str * 0.3);
    var branch = lex >= 0.72 ? "lexikálny" : vec > lex ? "vektorový" : "hybridný";
    return { s: +s.toFixed(3), branch: branch, lex: +lex.toFixed(2), vec: +vec.toFixed(2) };
  }

  /* ======================= verejné API ======================= */
  A.mem = {
    AREAS: AREAS, TOTAL_ALL: TOTAL_ALL, TOTAL_AREA: TOTAL_AREA, CORE_NODES: CORE_NODES,
    ZONE_CODE: ZONE_CODE,
    zoneLabel: function (a) { return (a.zone || ZONE_CODE[a.k]) + NB + "·" + NB + a.name; },
    areaByKey: function (k) { return AREAS.filter(function (a) { return a.k === k; })[0]; },
    deps: function () { return ALL_DEPS.slice(); },
    nodes: function (incArch) { return incArch ? _nodes.slice() : _nodes.filter(function (n) { return !n.archived; }); },
    archived: function () { return _nodes.filter(function (n) { return n.archived; }); },
    byId: function (id) { return _byId[id]; },
    weak: function (t) { t = t == null ? 0.4 : t; return A.mem.nodes().filter(function (n) { return n.str < t; }); },
    today: function () { return A.mem.nodes().filter(function (n) { return n.today; }); },
    neighbors: function (id) {
      return (_adj[id] || []).slice().sort(function (a, b) { return b.w - a.w; })
        .map(function (e) { return { node: _byId[e.id], w: e.w }; }).filter(function (x) { return x.node && !x.node.archived; });
    },
    edges: function () { return _edges; },
    typeBadge: function (t) {
      var cls = t === "skill" ? "info" : t === "project" ? "warn" : "mute";
      return '<span class="badge ' + cls + '">' + esc(t) + "</span>";
    },
    typeIcon: function (t) {
      /* skill = trojuholník, project = kosoštvorec, memory = kruh */
      if (t === "skill") return '<svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true"><path d="M6 1 11 10.5H1z" fill="currentColor"/></svg>';
      if (t === "project") return '<svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true"><path d="M6 1 11 6 6 11 1 6z" fill="currentColor"/></svg>';
      return '<svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true"><circle cx="6" cy="6" r="5" fill="currentColor"/></svg>';
    },
    search: function (q, filt) {
      filt = filt || {};
      var out = _nodes.filter(function (n) { return !n.archived; }).map(function (n) {
        var sc = q ? score(n, q) : { s: n.str, branch: "—", lex: 0, vec: 0 };
        return { node: n, sc: sc };
      }).filter(function (r) {
        if (q && r.sc.s <= 0) return false;
        if (filt.area && r.node.area.k !== filt.area) return false;
        if (filt.type && r.node.type !== filt.type) return false;
        if (filt.strMin && r.node.str < filt.strMin) return false;
        if (filt.confMin && r.node.conf < filt.confMin) return false;
        return true;
      });
      out.sort(function (a, b) { return b.sc.s - a.sc.s; });
      return out;
    },
    /* CRUD */
    create: function (attrs) {
      var area = attrs.area || AREAS[0];
      var dep = attrs.dep || area.deps[0];
      var id = "new-" + (h32(attrs.name + "|" + Date.parse ? attrs.name : attrs.name) >>> 0).toString(36) + "-" + _nodes.length;
      var nd = {
        id: id, slug: id, name: attrs.name || "Nový uzol", dep: dep, area: area,
        type: attrs.type || dep.type || "memory",
        str: attrs.str != null ? attrs.str : 0.5, conf: attrs.conf != null ? attrs.conf : 0.6,
        acts: 0, age: 0, hist: A.series(h32(id), 14, 1, 2, 0.05),
        tags: attrs.tags || [], pinned: false, archived: false, desc: attrs.desc || "",
        src: attrs.src || "mind_learn · manuálne", edits: [{ what: "vytvorený", when: "teraz" }], today: true
      };
      _nodes.push(nd); _byId[id] = nd; emit("create", nd);
      return nd;
    },
    update: function (nd, patch) {
      Object.keys(patch).forEach(function (k) { nd[k] = patch[k]; });
      nd.edits = (nd.edits || []).concat([{ what: "upravený", when: "teraz" }]);
      emit("update", nd);
      return nd;
    },
    archive: function (nd) { nd.archived = true; nd.edits = (nd.edits || []).concat([{ what: "archivovaný", when: "teraz" }]); emit("archive", nd); },
    restore: function (nd) { nd.archived = false; nd.edits = (nd.edits || []).concat([{ what: "obnovený", when: "teraz" }]); emit("restore", nd); },
    remove: function (nd) { var i = _nodes.indexOf(nd); if (i > -1) _nodes.splice(i, 1); delete _byId[nd.id]; emit("remove", nd); },
    togglePin: function (nd) { nd.pinned = !nd.pinned; emit("update", nd); },
    merge: function (keep, drop) {
      keep.str = Math.max(keep.str, drop.str); keep.acts += drop.acts;
      keep.tags = (keep.tags || []).concat(drop.tags || []);
      keep.edits = (keep.edits || []).concat([{ what: "zlúčený s „" + drop.name + "“", when: "teraz" }]);
      A.mem.remove(drop); emit("update", keep);
    },
    /* návrhy duplikátov (podobný názov v inom oddelení) */
    dupes: function (nd) {
      return _nodes.filter(function (m) {
        if (m.id === nd.id || m.archived) return false;
        var a = A.fold(nd.name).split(/\s+/), b = A.fold(m.name);
        var hit = a.filter(function (t) { return t.length > 3 && b.indexOf(t) > -1; }).length;
        return hit >= 1 && m.type === nd.type;
      }).slice(0, 4);
    },
    link: addBack,
    backlinks: function (id) { return _back[id] || []; },
    onChange: function (fn) { _subs.push(fn); },
    _score: score
  };

  /* ---------- editovateľný inšpektor uzla (peek panel s dirty-bar) ----------
     volateľný odkiaľkoľvek cez #/node/<slug> aj priamo mem.inspect(node) */
  A.mem.inspect = function (nd) {
    if (typeof nd === "string") nd = _byId[nd];
    if (!nd) { A.toast("Uzol sa nenašiel", "warn"); return; }
    var draft = { name: nd.name, desc: nd.desc, str: nd.str, conf: nd.conf, type: nd.type, areaK: nd.area.k, depSlug: nd.dep.slug, tags: (nd.tags || []).slice() };
    var mem = A.mem;

    function depsFor(areaK) { return mem.areaByKey(areaK).deps; }
    function opt(v, cur, lbl) { return '<option value="' + esc(v) + '"' + (v === cur ? " selected" : "") + ">" + esc(lbl) + "</option>"; }

    function body() {
      var neigh = mem.neighbors(nd.id).slice(0, 6);
      var backs = mem.backlinks(nd.id);
      var dupes = mem.dupes(nd);
      var inApps = A.apps ? A.apps.forNode(nd) : [];
      return '' +
        '<div class="ins" data-ins>' +
          (inApps.length ? '<div class="chips" style="margin-bottom:10px" aria-label="Appky, ktoré uzol používajú">' +
            inApps.map(function (ap, i) { return '<button type="button" class="chz" data-app="' + i + '" style="color:' + (ap.color || "var(--teal)") + '">' + A.apps.icon(ap, 12) + " " + esc(ap.name) + "</button>"; }).join("") + "</div>" : "") +
          '<div class="field"><label for="ins-name">Názov</label>' +
            '<input id="ins-name" data-f="name" value="' + esc(draft.name) + '"></div>' +
          '<div class="field"><label for="ins-desc">Obsah / poznámka</label>' +
            '<textarea id="ins-desc" data-f="desc" rows="3" placeholder="Čo tento uzol drží…">' + esc(draft.desc) + '</textarea></div>' +
          '<div class="row g2">' +
            '<div class="field"><label for="ins-str">Sila · <b data-o="str">' + F(draft.str, 2) + '</b></label>' +
              '<input id="ins-str" data-f="str" type="range" min="0" max="1" step="0.01" value="' + draft.str + '"></div>' +
            '<div class="field"><label for="ins-conf">Istota · <b data-o="conf">' + F(draft.conf, 2) + '</b></label>' +
              '<input id="ins-conf" data-f="conf" type="range" min="0" max="1" step="0.01" value="' + draft.conf + '"></div>' +
          '</div>' +
          '<div class="row g3">' +
            '<div class="field"><label for="ins-type">Typ</label><select id="ins-type" data-f="type">' +
              opt("skill", draft.type, "skill") + opt("memory", draft.type, "memory") + opt("project", draft.type, "project") + '</select></div>' +
            '<div class="field"><label for="ins-area">Oblasť</label><select id="ins-area" data-f="areaK">' +
              AREAS.map(function (a) { return opt(a.k, draft.areaK, a.name); }).join("") + '</select></div>' +
            '<div class="field"><label for="ins-dep">Oddelenie</label><select id="ins-dep" data-f="depSlug">' +
              depsFor(draft.areaK).map(function (d) { return opt(d.slug, draft.depSlug, d.name); }).join("") + '</select></div>' +
          '</div>' +
          '<div class="field"><label>Tagy</label><div class="tagbox" data-tags>' +
            draft.tags.map(function (t) { return '<span class="chz on" data-tag="' + esc(t) + '">' + esc(t) + ' ✕</span>'; }).join("") +
            '<input class="taginp" data-taginp placeholder="+ tag, Enter"></div></div>' +
          '<div class="prov"><span class="eyet">Proveniencia</span>' +
            '<div class="prow"><span>Zdroj</span><b>' + esc(nd.src) + '</b></div>' +
            '<div class="prow"><span>Aktivácií</span><b>' + F(nd.acts, 0) + '× / 30 dní</b></div>' +
            '<div class="prow"><span>Vek</span><b>' + F(nd.age, 0) + ' dní</b></div>' +
            '<div class="prow"><span>Zmeny</span><b>' + (nd.edits && nd.edits.length ? esc(nd.edits[nd.edits.length - 1].what) + " · " + nd.edits.length + "×" : "—") + '</b></div>' +
          '</div>' +
          (dupes.length ? '<div class="dupes"><span class="eyet">Možné duplikáty</span>' +
            dupes.map(function (m) { return '<button class="lk" data-merge="' + m.id + '">Zlúčiť s „' + esc(m.name) + '“</button>'; }).join("") + '</div>' : "") +
          '<div class="rels"><span class="eyet">Súvisiace uzly · po hranách</span>' +
            (neigh.length ? '<div class="reln">' + neigh.map(function (x) {
              return '<button class="lk" data-node="' + x.node.id + '">' + mem.typeIcon(x.node.type) + " " + esc(x.node.name) + '</button>';
            }).join("") + '</div>' : '<p class="note">Bez prepojení.</p>') + '</div>' +
          '<div class="rels"><span class="eyet">Odkazuje naň</span>' +
            (backs.length ? '<div class="reln">' + backs.map(function (b, i) {
              return '<button class="lk" data-back="' + i + '"><span class="badge mute">' + esc(b.kind) + '</span> ' + esc(b.label) + '</button>';
            }).join("") + '</div>' : '<p class="note">Zatiaľ naň nič neodkazuje.</p>') + '</div>' +
          '<div class="eyet" style="margin-top:12px">História aktivácií · 14 dní</div><div id="dp-spark" style="height:52px"></div>' +
          '<p class="note" style="margin-top:5px">Simulovaný priebeh — Hades ukladá len 14-dňový agregát.</p>' +
        '</div>';
    }

    function dirty() {
      return draft.name !== nd.name || draft.desc !== nd.desc || draft.str !== nd.str || draft.conf !== nd.conf ||
        draft.type !== nd.type || draft.areaK !== nd.area.k || draft.depSlug !== nd.dep.slug ||
        draft.tags.join("|") !== (nd.tags || []).join("|");
    }
    function actions() {
      var acts = [
        { label: nd.pinned ? "Odopnúť" : "Pripnúť", kind: "ghost", fn: function () { mem.togglePin(nd); A.toast(nd.pinned ? "Uzol pripnutý a chránený" : "Odopnuté", "ok"); render(); } },
        { label: "Zabudnúť → archív", kind: "ghost", fn: function () {
            A.confirm("Zabudnúť uzol?", "„" + nd.name + "“ sa presunie do archívu. Dá sa obnoviť; z pamäte a grafu zmizne.", function () { mem.archive(nd); A.closeDetail(); A.toast("Presunuté do archívu", "ok"); }, "Zabudnúť", true);
          } }
      ];
      if (dirty()) acts.push({ label: "Uložiť", kind: "", fn: save });
      return acts;
    }
    function save() {
      var area = mem.areaByKey(draft.areaK);
      var dep = area.deps.filter(function (d) { return d.slug === draft.depSlug; })[0] || area.deps[0];
      mem.update(nd, { name: draft.name.trim() || nd.name, desc: draft.desc, str: +draft.str, conf: +draft.conf, type: draft.type, area: area, dep: dep, tags: draft.tags.slice() });
      A.closeDetail();
      A.toast("Uzol uložený", "ok");
    }
    function render() {
      A.detail(nd.name, body(), actions());
      var root = A.$("#dp-body");
      /* live náhľad posuvníkov + dirty prepočet akcií */
      root.addEventListener("input", function (e) {
        var f = e.target.getAttribute("data-f"); if (!f) return;
        draft[f] = e.target.type === "range" ? +e.target.value : e.target.value;
        if (f === "str" || f === "conf") { var o = A.$('[data-o="' + f + '"]', root); if (o) o.textContent = F(draft[f], 2); }
        if (f === "areaK") { draft.depSlug = mem.areaByKey(draft.areaK).deps[0].slug; refreshActions(); render(); return; }
        refreshActions();
      });
      /* tagy */
      var tagInp = A.$("[data-taginp]", root);
      if (tagInp) tagInp.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && this.value.trim()) { e.preventDefault(); draft.tags.push(this.value.trim()); render(); }
      });
      A.$$("[data-tag]", root).forEach(function (c) {
        c.addEventListener("click", function () { var t = this.getAttribute("data-tag"); draft.tags = draft.tags.filter(function (x) { return x !== t; }); render(); });
      });
      /* prepojenia */
      A.$$("[data-node]", root).forEach(function (b) { b.addEventListener("click", function () { A.mem.inspect(this.getAttribute("data-node")); }); });
      A.$$("[data-merge]", root).forEach(function (b) { b.addEventListener("click", function () {
        var other = mem.byId(this.getAttribute("data-merge"));
        A.confirm("Zlúčiť uzly?", "„" + other.name + "“ sa zlúči do „" + nd.name + "“ a zanikne.", function () { mem.merge(nd, other); render(); A.toast("Zlúčené", "ok"); }, "Zlúčiť", true);
      }); });
      A.$$("[data-app]", root).forEach(function (b) { b.addEventListener("click", function () {
        var ap = A.apps.forNode(nd)[+this.getAttribute("data-app")];
        if (ap) { A.closeDetail(); A.go("appky", ap.slug); }
      }); });
      A.$$("[data-back]", root).forEach(function (b) { b.addEventListener("click", function () {
        var ref = mem.backlinks(nd.id)[+this.getAttribute("data-back")]; if (ref && ref.go) { A.closeDetail(); ref.go(); }
      }); });
      w.AuraChart.render("#dp-spark", { type: "sparkline", title: "Aktivácie uzla " + nd.name, height: 52,
        series: [{ key: "a", label: "aktivácie", color: "var(--teal)", unit: "×", data: nd.hist.map(function (v) { return { y: v }; }) }] });
    }
    function refreshActions() {
      /* prekresli len tlačidlá panela bez straty fokusu vo formulári */
      var af = A.$("#dp-actions"); if (!af) return;
      af.innerHTML = "";
      actions().forEach(function (a) {
        var b = document.createElement("button");
        b.className = "btn" + (a.kind ? " " + a.kind : "");
        b.textContent = a.label; b.addEventListener("click", a.fn); af.appendChild(b);
      });
    }
    render();
  };

  /* ============================================================
     AUTOMATIZÁCIE — dataset (jediný vlastník dát)
     Obrazovka Práca ich vykresľuje, Appky z nich počítajú behy a zdravie.
     ============================================================ */
  A.autos = {
    deps: ["Copywriting", "Newsletter", "Performance", "Foto & retuš", "Video"],
    rows: [
      { id: "A-01", name: "Popisy produktov z katalógu", dep: "Copywriting", trig: "MCP", last: "2. 8. 08:20", next: "na MCP udalosť (nové SKU)", ok: 97, saved: 42, state: "Aktívna", mcp: ["Asana", "M365"], steps: ["Načítaj nové SKU", "Vygeneruj popis (qwen3:4b)", "Skontroluj tón", "Zapíš do katalógu"], avg: 21 },
      { id: "A-02", name: "Newsletter — týždenný koncept", dep: "Newsletter", trig: "cron", last: "1. 8. 06:00", next: "pondelok 06:00", ok: 92, saved: 18, state: "Aktívna", mcp: ["M365", "Canva"], steps: ["Zozbieraj novinky", "Návrh štruktúry", "Náhľad v Canve"], avg: 34 },
      { id: "A-03", name: "Meta Ads — návrh variantov", dep: "Performance", trig: "admin", last: "1. 8. 14:10", next: "ručne adminom", ok: 88, saved: 26, state: "Aktívna", mcp: ["Ahrefs", "Canva"], steps: ["Analýza výkonu", "3 varianty kreatívy", "Rozpočet podľa marže"], avg: 28 },
      { id: "A-04", name: "Retuš — dávkové predspracovanie", dep: "Foto & retuš", trig: "MCP", last: "1. 8. 19:40", next: "na MCP udalosť (nové foto)", ok: 95, saved: 31, state: "Aktívna", mcp: ["M365"], steps: ["Zrovnaj bielu", "Orež na formát", "Zálohuj originál"], avg: 12 },
      { id: "A-05", name: "Krátke video — strih z klipov", dep: "Video", trig: "admin", last: "31. 7. 20:05", next: "ručne adminom", ok: 84, saved: 22, state: "Aktívna", mcp: ["Canva"], steps: ["Vyber zábery", "Zostrih 30 s", "Titulky"], avg: 41 },
      { id: "A-06", name: "Kategorizácia reklamácií", dep: "Copywriting", trig: "MCP", last: "1. 8. 10:12", next: "na MCP udalosť (nový tiket)", ok: 99, saved: 14, state: "Aktívna", mcp: ["Asana"], steps: ["Načítaj tikety", "Klasifikuj (router)", "Priraď oddeleniu"], avg: 9 },
      { id: "A-07", name: "Preklad popisov SK→EN", dep: "Copywriting", trig: "cron", last: "31. 7. 22:00", next: "denne 22:00", ok: 96, saved: 19, state: "Pozastavená", mcp: ["M365"], steps: ["Vyber nepreložené", "Preklad", "Kontrola termínov"], avg: 16 },
      { id: "A-08", name: "SEO — kontrola indexovateľnosti", dep: "Performance", trig: "cron", last: "1. 8. 03:00", next: "denne 03:00", ok: 90, saved: 11, state: "Aktívna", mcp: ["Ahrefs"], steps: ["Prejdi sitemap", "Skontroluj robots", "Report chýb"], avg: 24 },
      { id: "A-09", name: "Odpovede na komentáre", dep: "Newsletter", trig: "admin", last: "1. 8. 16:30", next: "ručne adminom", ok: 87, saved: 8, state: "Aktívna", mcp: ["M365"], steps: ["Načítaj komentáre", "Návrh odpovede", "Schválenie adminom"], avg: 7 },
      { id: "A-10", name: "Foto — pomenovanie a triedenie", dep: "Foto & retuš", trig: "MCP", last: "31. 7. 12:44", next: "na MCP udalosť (nové foto)", ok: 98, saved: 16, state: "Aktívna", mcp: ["M365"], steps: ["Rozpoznaj SKU", "Premenuj", "Zaraď do priečinka"], avg: 6 },
      { id: "A-11", name: "Zostrih reels z produktu", dep: "Video", trig: "MCP", last: "30. 7. 18:00", next: "na MCP udalosť (nový klip)", ok: 79, saved: 20, state: "Chyba", mcp: ["Canva"], steps: ["Import klipov", "Šablóna reels", "Export"], avg: 38 },
      { id: "A-12", name: "Newsletter — A/B predmety", dep: "Newsletter", trig: "cron", last: "1. 8. 06:05", next: "pondelok 06:05", ok: 93, saved: 6, state: "Aktívna", mcp: ["M365", "Ahrefs"], steps: ["Návrh 4 predmetov", "Odhad otvorenosti", "Výber dvoch"], avg: 5 }
    ],
    hist: [
      { t: "pred 3 m", agent: "Popisy produktov z katalógu", dep: "Copywriting", res: "hotovo", tok: 1640, min: 21, id: "A-01" },
      { t: "pred 14 m", agent: "Kategorizácia reklamácií", dep: "Copywriting", res: "hotovo", tok: 720, min: 9, id: "A-06" },
      { t: "pred 40 m", agent: "Meta Ads — návrh variantov", dep: "Performance", res: "hotovo", tok: 2210, min: 28, id: "A-03" },
      { t: "pred 1 h", agent: "Zostrih reels z produktu", dep: "Video", res: "chyba", tok: 980, min: 12, id: "A-11" },
      { t: "pred 2 h", agent: "Foto — pomenovanie a triedenie", dep: "Foto & retuš", res: "hotovo", tok: 410, min: 6, id: "A-10" },
      { t: "pred 3 h", agent: "SEO — kontrola indexovateľnosti", dep: "Performance", res: "hotovo", tok: 1180, min: 24, id: "A-08" },
      { t: "pred 5 h", agent: "Newsletter — týždenný koncept", dep: "Newsletter", res: "čaká", tok: 0, min: 0, id: "A-02" }
    ],
    byId: function (id) { for (var i = 0; i < A.autos.rows.length; i++) if (A.autos.rows[i].id === id) return A.autos.rows[i]; return null; },
    /* trace strom behu doplní obrazovka Práca (vlastní vykreslenie) */
    runDetail: null
  };

  /* ============================================================
     APPKY — nasadenia, ktoré na jadre bežia (kanonický registry)
     Väzba na automatizácie cez oddelenia, na pamäť cez oddelenie/tag.
     ============================================================ */
  var APP_ICONS = {
    bag: '<path d="M6 2 3 7v13a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V7l-3-5z"/><path d="M3 7h18M16 11a4 4 0 0 1-8 0"/>',
    chart: '<path d="M3 17l5-6 4 3 5-7 4 5"/><path d="M3 21h18"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    cam: '<rect x="2" y="6" width="14" height="12" rx="2"/><path d="m16 11 6-3v8l-6-3z"/>',
    cube: '<path d="M12 2 3 7v10l9 5 9-5V7z"/><path d="m3 7 9 5 9-5M12 12v10"/>'
  };
  /* podiel na spotrebe stroja (súčet 100 %) — z merania oddelení, nie odhad na appku */
  var APPS = [
    { slug: "eshop", name: "E-shop Šperky", kind: "E-shop", icon: "bag", color: "var(--teal)",
      desc: "Prvé reálne nasadenie Aury mimo vývoja: generovanie popisov produktov, kategorizácia a odpovede zákazníkom bežia lokálne cez qwen3:4b. Žiadny text katalógu neopúšťa stroj.",
      host: "sperky-eshop.sk · lokálne · od 4/2026", since: "apríl 2026", ver: "1.4.2",
      deps: ["Copywriting"], memDeps: ["E-shop Šperky"], tags: ["eshop", "katalog"],
      mcp: ["Asana", "M365"], share: 0.38, paused: false, seed: 4101, logq: "eshop" },
    { slug: "marketing", name: "Marketing & SEO", kind: "Marketing", icon: "chart", color: "var(--violet)",
      desc: "Návrhy reklamných variantov, kontrola indexovateľnosti a čítanie Search Console. Dáta z Ahrefs chodia dnu, von neodchádza nič okrem dopytu.",
      host: "interné · lokálne · od 6/2026", since: "jún 2026", ver: "0.9.1",
      deps: ["Performance"], memDeps: ["Obsah & copy", "Technické SEO", "Analytika", "Reklama PPC"], tags: ["seo", "ppc"],
      mcp: ["Ahrefs", "Canva"], share: 0.24, paused: false, seed: 4202, logq: "Z3" },
    { slug: "newsletter", name: "Newsletter", kind: "Komunikácia", icon: "mail", color: "var(--gold)",
      desc: "Týždenný koncept newslettra, A/B predmety a návrhy odpovedí na komentáre. Odosielanie schvaľuje človek.",
      host: "interné · lokálne · od 6/2026", since: "jún 2026", ver: "0.7.0",
      deps: ["Newsletter"], memDeps: ["Obsah & copy", "Sociálne siete"], tags: ["newsletter"],
      mcp: ["M365", "Ahrefs", "Canva"], share: 0.16, paused: false, seed: 4303, logq: "newsletter" },
    { slug: "studio", name: "Foto/Video štúdio", kind: "Štúdio", icon: "cam", color: "var(--good)",
      desc: "Dávkové predspracovanie fotiek, pomenovanie podľa SKU a zostrih krátkych videí. Najviac dávkovej práce, najmenej textu.",
      host: "interné · lokálne · od 5/2026", since: "máj 2026", ver: "1.1.0",
      deps: ["Foto & retuš", "Video"], memDeps: ["Typografia", "Farby & témy", "Rozloženie"], tags: ["foto", "video"],
      mcp: ["Canva", "M365"], share: 0.22, paused: false, seed: 4404, logq: "foto" }
  ];
  var _asubs = [];
  function aemit(kind, app) { _asubs.forEach(function (f) { try { f(kind, app); } catch (e) { console.error(e); } }); }
  function slugify(s) {
    return A.fold(s).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 24) || "appka";
  }
  /* mesačná spotreba stroja — rovnaké čísla ako Náklady (68,4 kWh · 0,22 €/kWh · 52,4 M tok.) */
  var MACHINE = { kwh: 68.4, rkwh: 0.22, mtok: 52.4, q: 8420 };

  A.apps = {
    KINDS: ["E-shop", "Marketing", "Komunikácia", "Štúdio", "Vlastné"],
    MACHINE: MACHINE,
    all: function () { return APPS.filter(function (a) { return !a.archived; }); },
    bySlug: function (s) { for (var i = 0; i < APPS.length; i++) if (APPS[i].slug === s) return APPS[i]; return null; },
    icon: function (app, size) {
      size = size || 16;
      return '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size + '" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
        (APP_ICONS[app.icon] || APP_ICONS.cube) + "</svg>";
    },
    onChange: function (fn) { _asubs.push(fn); },
    create: function (attrs) {
      var app = {
        slug: slugify(attrs.name || "appka") + "-" + (APPS.length + 1),
        name: (attrs.name || "Nová appka").trim(), kind: attrs.kind || "Vlastné",
        icon: attrs.icon || "cube", color: attrs.color || "var(--teal-3)",
        desc: (attrs.desc || "").trim(), host: attrs.host || "interné · lokálne · nové nasadenie",
        since: "august 2026", ver: "0.1.0",
        deps: attrs.deps || [], memDeps: attrs.memDeps || [], tags: attrs.tags || [],
        mcp: attrs.mcp || [], share: 0, paused: false, origin: "user", seed: 4500 + APPS.length
      };
      APPS.push(app); aemit("create", app);
      return app;
    },
    remove: function (app) {
      var i = APPS.indexOf(app); if (i > -1) APPS.splice(i, 1);
      aemit("remove", app);
    },
    setPaused: function (app, v) { app.paused = !!v; aemit("update", app); },
    /* --- väzby --- */
    autos: function (app) {
      return A.autos.rows.filter(function (r) { return (app.deps || []).indexOf(r.dep) > -1; });
    },
    nodes: function (app) {
      var deps = app.memDeps || [], tags = app.tags || [];
      return A.mem.nodes().filter(function (n) {
        if (deps.indexOf(n.dep.name) > -1) return true;
        return (n.tags || []).some(function (t) { return tags.indexOf(t) > -1; });
      });
    },
    forNode: function (nd) {
      return A.apps.all().filter(function (app) {
        if ((app.memDeps || []).indexOf(nd.dep.name) > -1) return true;
        return (nd.tags || []).some(function (t) { return (app.tags || []).indexOf(t) > -1; });
      });
    },
    /* --- prevádzka --- */
    health: function (app) {
      var rows = A.apps.autos(app);
      if (!rows.length) return { k: "none", ok: 0, label: "bez behov" };
      if (app.paused) return { k: "mute", ok: 0, label: "pozastavená" };
      var bad = rows.filter(function (r) { return r.state === "Chyba"; }).length;
      var okAvg = rows.reduce(function (s, r) { return s + r.ok; }, 0) / rows.length;
      if (bad) return { k: "bad", ok: okAvg, label: "chyba v " + bad + " automatizácii" };
      if (okAvg < 85) return { k: "bad", ok: okAvg, label: "úspešnosť pod 85 %" };
      if (okAvg < 95) return { k: "warn", ok: okAvg, label: "úspešnosť pod 95 %" };
      return { k: "ok", ok: okAvg, label: "beží v poriadku" };
    },
    /* objem spracovaných položiek za n dní (deterministické) */
    vol: function (app, n) {
      var rows = A.apps.autos(app);
      var base = 8 + rows.length * 6 + Math.round((app.share || 0.1) * 60);
      return A.series(app.seed || 4100, n || 14, base, base * 0.45, 0.6)
        .map(function (v) { return Math.max(0, Math.round(v)); });
    },
    cost: function (app) {
      var sh = app.share || 0;
      var kwh = MACHINE.kwh * sh, eur = kwh * MACHINE.rkwh, tok = MACHINE.mtok * sh;
      return { share: sh, kwh: kwh, eur: eur, tok: tok, q: Math.round(MACHINE.q * sh) };
    },
    /* posledných n behov appky — živý feed (Aura.autos.hist) + deterministická história */
    runs: function (app, n) {
      n = n || 20;
      var rows = A.apps.autos(app);
      if (!rows.length) return [];
      var ids = {}; rows.forEach(function (r) { ids[r.id] = r; });
      var live = A.autos.hist.filter(function (h) { return ids[h.id]; })
        .map(function (h) { return { t: h.t, id: h.id, name: h.agent, dep: h.dep, res: h.res, tok: h.tok, min: h.min, live: true }; });
      var rnd = A.rng(app.seed || 4100), out = [], hours = 2;
      for (var i = 0; out.length < n && i < n * 3; i++) {
        var r = rows[i % rows.length];
        var fail = rnd() * 100 > r.ok;
        hours += 1 + Math.floor(rnd() * 5);
        out.push({
          t: hours < 24 ? "pred " + hours + " h" : "pred " + Math.floor(hours / 24) + " d",
          id: r.id, name: r.name, dep: r.dep,
          res: fail ? "chyba" : "hotovo",
          tok: Math.round(300 + rnd() * 40 * r.avg),
          min: Math.max(1, Math.round(r.avg * (0.6 + rnd() * 0.8))),
          mcp: r.mcp
        });
      }
      return live.concat(out).slice(0, n);
    },
    /* MCP nástroje appky + kedy ich naposledy použila */
    tools: function (app) {
      var rows = A.apps.autos(app);
      return (app.mcp || []).map(function (name) {
        var users = rows.filter(function (r) { return (r.mcp || []).indexOf(name) > -1; });
        return { name: name, last: users.length ? users[0].last : "zatiaľ nepoužité", n: users.length };
      });
    },
    /* aktívne problémy appky (pruh nad KPI) */
    alerts: function (app) {
      return A.apps.autos(app).filter(function (r) { return r.state === "Chyba"; })
        .map(function (r) { return { id: r.id, title: r.name + " — posledný beh zlyhal", dep: r.dep }; });
    },
    kpi: function (app) {
      var rows = A.apps.autos(app), runs = A.apps.runs(app, 12), v = A.apps.vol(app, 14);
      return {
        health: A.apps.health(app),
        last: runs.length ? runs[0].t : "—",
        today: v[v.length - 1] || 0,
        cost: A.apps.cost(app),
        autos: rows.length,
        saved: rows.reduce(function (s, r) { return s + r.saved; }, 0)
      };
    }
  };
})(window);
