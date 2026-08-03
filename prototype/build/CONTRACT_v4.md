# KONTRAKT v4 — AuraAI redizajn (9 obrazoviek, pamäť v centre)

Staviame **náhľad reálneho rozhrania AuraAI** (refactor Hadesa, Laravel + vanilla JS, Ollama
qwen3:4b router + bge-m3 embed, stroj AMD 9900 + 48 GB RAM, CPU inferencia, localhost:8082).
Framework (shell, engine, **Aura.mem**) je HOTOVÝ — len ho volaj. Píš VÝHRADNE svoje súbory.

## Vlastníctvo súborov

| Agent | Súbory | Obrazovky (kľúče) |
|---|---|---|
| **B — Pamäť** | `build/s-pamat.html` · `build/s-pamat.js` | `pamat` (jediná, s pohľadmi + tabmi) |
| **C — Práca** | `build/s-praca.html` · `build/s-praca.js` | `chat` · `smernica` · `eshop` · `automatizacie` |
| **D — Systém** | `build/s-system.html` · `build/s-system.js` | `jadro` · `naklady` · `observabilita` · `nastavenia` |

Nikdy needituj `engine.js`, `shell.css`, `shell.js`, `data.js`, `base.html`, `boot.js`, cudzie
`s-*.js`, ani tento kontrakt. Zlepenie robí hlavný agent. **`s-*.html`** = iba
`<section class="view" id="v-KĽÚČ">…</section>` bloky (žiadny `<style>`/`<script>`/`<head>`).
**`s-*.js`** = iba registrácie obrazoviek. Žiadny `DOMContentLoaded`, žiadne `Aura.boot()`.

## Registrácia obrazovky

```js
Aura.screens.jadro = {
  title: "Jadro", group: "Systém",
  init: function () { /* raz: vykresli grafy, naviaž listenery */ },
  onShow: function (sub) { /* pri každom zobrazení; sub = časť za druhým lomítkom */ }
};
```
Kľúč sedí s `id="v-<kľúč>"` v HTML. Navigáciu robí hlavný agent — nepíš `<nav>`.

## Aura.mem — kanonický model pamäte (HOTOVÝ, `data.js`)

Jeden zdroj pravdy pre uzly. **Každá obrazovka, ktorá spomína uzol pamäte, ho berie odtiaľto a
otvára cezeň inšpektor.** NIKDY si nerob vlastné uzly.

```js
Aura.mem.AREAS            // 5 oblastí: {k,name,n,color,zone,slug,share,deps:[{name,n,type,slug,str,conf,acts,last,hist,nodeList,area}]}
Aura.mem.nodes()          // pole živých uzlov (bez archívu). Uzol: {id,slug,name,dep,area,type,str,conf,acts,age,hist,tags,pinned,archived,desc,src,edits,today}
Aura.mem.nodes(true)      // vrátane archívu
Aura.mem.archived()       // len archivované
Aura.mem.byId(id)         // uzol podľa id
Aura.mem.weak(0.4)        // slabé uzly (str < prah)
Aura.mem.today()          // dnes aktívne uzly (na triage)
Aura.mem.neighbors(id)    // [{node,w}] po hranách grafu, zoradené podľa sily väzby
Aura.mem.edges()          // [{a,b,w}] všetky synapsie (id→id)
Aura.mem.search(q, {area,type,strMin,confMin}) // [{node, sc:{s,branch,lex,vec}}] zoradené podľa skóre
Aura.mem.zoneLabel(area)  // "Z1 · Vývoj & kód"  (zóny = kód + názov, VŠADE)
Aura.mem.typeBadge(type)  // <span class="badge …">skill</span>
Aura.mem.typeIcon(type)   // malé SVG (skill=trojuholník, project=kosoštvorec, memory=kruh)

Aura.mem.inspect(nodeOrId)      // OTVORÍ editovateľný inšpektor v peek paneli (CRUD, backlinks, susedia)
Aura.mem.create({name,desc,type,area,dep,str,conf,tags})  // vytvorí a vráti uzol
Aura.mem.update(node,{...})     // upraví
Aura.mem.archive(node)/restore/remove/togglePin(node)
Aura.mem.merge(keep,drop) · Aura.mem.dupes(node)
Aura.mem.link(nodeId,{kind,label,go})   // ZAREGISTRUJ backlink: kind='chat'|'smernica'|'automatizácia'|'log', go=fn()
Aura.mem.backlinks(id)          // [{kind,label,go}]
Aura.mem.onChange(fn)           // fn(kind,node) pri každej zmene — prekresli svoj pohľad
```

**Otvorenie uzla odkiaľkoľvek:** `Aura.mem.inspect(node)` alebo `Aura.go("node", node.id)`.
Namiesto starého `nodeDetail()` / „Hľadať súvisiace" re-searchu — vždy inšpektor.

## AuraChart — grafový engine (HOTOVÝ, len volaj)

`AuraChart.render(hostElOrSelector, spec)` → `{update(spec),patch(obj)}`. Typy: `line area bar
stacked heatmap gauge donut sparkline uptime timeline`. **Každý časový graf má `caption`, osi a
jednotky; dve jednotky = dve osi.** Pomôcky `AuraChart.fmtNum(v,dec)`, `AuraChart.fmtVal(v,unit,dec)`.
(Plné špecifiká typov pozri `CONTRACT.md §3` — nezmenené.) Engine dostane rozšírenia (trace strom,
textové tabuľky) od agenta E — ak ich potrebuješ a ešte nie sú, nechaj TODO a použi zoznam.

## Aura shell API (HOTOVÝ)

```js
Aura.toast(text,'ok'|'warn'|'bad') · Aura.confirm(title,text,onYes,yesLabel,danger)
Aura.detail(title,htmlString,[{label,fn,kind}]) · Aura.closeDetail()   // peek panel
Aura.go(key,sub) · Aura.sortable(table,getRows,render) · Aura.bindRows(scope,resolve,open)
Aura.fold(s) · Aura.hl(text,q) · Aura.download(name,content,mime) · Aura.toCSV(cols,rows)
Aura.count(el,value,dec,unit) · Aura.registerCmd([{label,hint,run}])
Aura.setShared(k,v)/getShared(k,dflt)/onState(k,fn)   // zdieľaný stav s prehrávaním
Aura.series(seed,n,base,spread,trend) · Aura.hours(n) · Aura.days(n) · Aura.rng(seed)
Aura.esc(s) · Aura.$ · Aura.$$ · Aura.reduce
window.addEventListener('aura:tick', fn)   // každé 2 s pri Live
window.addEventListener('aura:theme', fn)
```

## Prierezové pravidlá (platia pre všetkých)

1. **Zóny = kód + názov VŠADE** cez `Aura.mem.zoneLabel(area)` → „Z1 · Vývoj & kód". Žiadne holé Z1.
2. **Odznak pôvodu dát** pri každom grafe/čísle: `<span class="srcbadge meas">merané</span>`,
   `.sim` (simulované), `.demo` (ukážkové). Reálne eval čísla (CONTRACT §7) = `meas`; priebehy
   v čase generované cez `Aura.series` = `sim`; prevádzka = `demo`.
3. **Filter chip po deep-linku**: keď obrazovka príde s `sub` filtrom, zobraz
   `<div class="fchip">filtrované z <b>X</b> <button aria-label="Zrušiť filter">✕</button></div>`
   a klik chip zmaže filter.
4. **Deštruktívne akcie** cez `Aura.confirm(...,true)` s popisom následku.
5. **Žiadne demo tlačidlá typu „Simulovať výpadok"/„Demonštrácia stavov" v produkčnom UI.**
   Stavy loading/empty/error rob cez `state:` v `AuraChart` alebo triedu `.empty`, nie tlačidlom.
6. **Uložiť/Zrušiť (staged) pri úpravách** — model, prahy, automatizácie, uzly. Nič sa nemení
   „naživo" bez potvrdenia okrem drobností s toast+Späť.
7. Žiadny `localStorage`/sieť/knižnica. Čísla `sk-SK` cez `fmtNum`. Diakritika správne, žiadne emoji.
   `<label for>` ku každému inputu; ikonové tlačidlá `aria-label`; dekoratívne SVG `aria-hidden`.
   Nič pod 11 px. Každý riadok/KPI klikateľný (detail alebo `Aura.go`). Kompaktná hustota.
8. **Každá obrazovka ≥ 2 grafy** cez `AuraChart` s osami. Textová alternatíva grafu: pod grafom
   `<button class="btn ghost">Zobraziť ako tabuľku</button>` prepínajúca skrytú tabuľku.

## Reálne overené čísla (eval 31. 7. 2026) — verbatim

Router 95,3 % (41/43) · bez regex 87,5 % · SK↔EN prekryv 3/20 (otvorený problém) · hit@5 86,7 % ·
MRR 0,800 · /api/search p50 4,2 s · RecallEngine 8–130 ms · RAM 48 GB, upgrade +48 GB + 32 GB VRAM ·
pamäť ~714 uzlov, 5 oblastí (Vývoj 271 · Biznis 160 · Marketing 152 · Osobné 91 · Dizajn 36).
**Eval čísla vlastní IBA Jadro** — Hľadanie a inde na ne len odkazujú (`Aura.go("jadro")`).

## Existujúci kód na PORTOVANIE

Súčasné funkčné obrazovky sú v `a1.js`/`a2.js`/`a1.html`/`a2.html`. **Preber osvedčený kód**
(grafy, tabuľky, streaming chatu, skladanie smernice, dávky e-shopu, ovládanie jadra, logy) a
**aplikuj naň v4 zmeny** z prompta. Needituj a1/a2 — kopíruj do svojich s-* súborov.
```
```
