#!/usr/bin/env node
/**
 * inventory-html.mjs — z inventory-data.mjs vygeneruje apps/prehlad-aplikacii.html
 *
 * Jeden self-contained HTML: Aura tokeny, dark + light, karty modulov, filtre,
 * vyhľadávanie a tlačová verzia. Bez CDN skriptov, bez localStorage, bez analytiky.
 * Jediná externá závislosť sú Google Fonts so systémovým fallbackom.
 *
 * Použitie: node inventory-html.mjs [výstup.html]
 */
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { META, LEGENDA, MODULY, SPOLOCNE, NAKLADY, RIZIKA, GLOBALNE_OBRAZOVKY, sumar } from './inventory-data.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const out = resolve(process.argv[2] || resolve(__dir, '..', 'prehlad-aplikacii.html'));
const S = sumar();

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const num = (n) => n.toLocaleString('sk-SK').replace(/\u00a0/g, ' ');
const eur = (n) => `${num(n)} €`;
const slug = (s) =>
  String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');

/* ─ triedy pre odznaky overenia a rizika ─ */
const OVER_CLS = { 'overené': 'ok', 'rekonštruované': 'cond', 'ukážkové': 'q' };
const SEV_CLS = { 'vysoké': 'no', 'stredné': 'cond', 'nízke': 'q' };

const ICON = {
  mkt: '<path d="M3 11l14-5v12L3 13v-2z"/><path d="M6 12v5"/>',
  kpi: '<path d="M3 17V9m5 8V4m5 13v-6m5 6V7"/>',
  log: '<path d="M2 7h11v8H2zM13 10h4l3 3v2h-7z"/><circle cx="6" cy="17" r="1.6"/><circle cx="16" cy="17" r="1.6"/>',
  hr: '<circle cx="8" cy="7" r="3"/><path d="M2 19c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="8" r="2.2"/>',
  road: '<path d="M4 20V6a2 2 0 012-2h9l4 4v12z"/><path d="M8 10h7M8 14h5"/>',
  fin: '<path d="M3 18l5-6 4 3 5-8"/><path d="M3 21h18"/>',
};
const iconFor = { marketing: 'mkt', kpi: 'kpi', logistika: 'log', hr: 'hr', roadmap: 'road', trzby: 'fin' };
const svg = (k) =>
  `<svg viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg>`;

/* ═════════════════════════ CSS ═════════════════════════ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Playfair+Display:wght@600;700;800&family=Geist+Mono:wght@400;500&display=swap');
:root{
  --teal:#05bcc4; --teal-2:#03797e; --gold:#d8b878; --gold-t:#c9a869;
  --paper:#0e1413; --card:#131b1a; --card-2:#1b2523; --line:#22302e;
  --ink:#e8f0ef; --ink-2:#b9c9c7; --ink-3:#829896;
  --good:#3fbf7f; --amber:#e8a33d; --red:#e0554e; --violet:#8b7fd4;
  --b-mkt:#05bcc4; --b-hr:#8b7fd4; --b-kpi:#d3a53a; --b-fin:#2fae7a; --b-log:#e07a3e; --b-road:#2a8f96;
  --mono:'Geist Mono',ui-monospace,monospace;
  --disp:'Playfair Display',Georgia,serif;
  --body:'Geist',Inter,system-ui,sans-serif;
  --acc:var(--teal); --r:14px; --tnum:"tnum" 1,"lnum" 1;
}
:root[data-theme="light"]{
  --paper:#f4f0f3; --card:#ffffff; --card-2:#eae3e8; --line:#ded5dc;
  --ink:#131b1a; --ink-2:#37423f; --ink-3:#5a6968; --gold-t:#8a6417;
}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{font-family:var(--body);background:var(--paper);color:var(--ink);-webkit-font-smoothing:antialiased;line-height:1.55;overflow-x:hidden}
.mono{font-family:var(--mono);font-feature-settings:var(--tnum)}
h1,h2,h3{font-family:var(--disp);letter-spacing:-.4px;margin:0}
:focus-visible{outline:2px solid var(--acc);outline-offset:2px;border-radius:4px}

/* topbar */
.top{position:sticky;top:0;z-index:40;display:flex;align-items:center;gap:12px;height:52px;padding:0 20px;
  background:color-mix(in srgb,var(--paper) 88%,transparent);backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}
.top .brand{display:flex;align-items:center;gap:9px;font-weight:600;letter-spacing:.02em}
.top .crown{width:20px;height:20px;color:var(--gold)}
.top .sep{width:1px;height:20px;background:var(--line)}
.top .where{color:var(--ink-3);font:500 12.5px var(--mono)}
.top .sp{margin-left:auto}
.btn{display:inline-flex;align-items:center;gap:7px;height:32px;padding:0 12px;border:1px solid var(--line);
  background:var(--card);color:var(--ink);border-radius:9px;font:500 12.5px var(--body);cursor:pointer;transition:.15s}
.btn:hover{border-color:color-mix(in srgb,var(--acc) 50%,var(--line));color:var(--acc)}
.btn svg{width:15px;height:15px}

/* layout */
.wrap{max-width:1220px;margin:0 auto;padding:0 20px 72px}
section{scroll-margin-top:64px}
.hero{padding:52px 0 26px;position:relative}
.eb{font:600 11.5px var(--mono);letter-spacing:.2em;text-transform:uppercase;color:var(--acc);display:flex;gap:10px;align-items:center}
.eb .n{color:var(--ink-3)}
.hero h1{font-size:clamp(30px,4.6vw,46px);font-weight:800;line-height:1.05;margin:16px 0 12px}
.hero .tag{color:var(--ink-2);font-size:17.5px;max-width:640px;margin:0 0 18px}
.meta-l{display:flex;flex-wrap:wrap;gap:8px 18px;font:500 12.5px var(--mono);color:var(--ink-3)}
.note{color:var(--ink-3);font-size:13px;border-left:2px solid var(--line);padding:8px 0 8px 14px;margin:22px 0 0;max-width:780px}
h2.sh{font-size:23px;font-weight:700;margin:0 0 4px}
.sh-sub{color:var(--ink-3);font-size:13.5px;margin:0 0 18px}
.sec{padding-top:46px}
.goldline{height:1px;background:linear-gradient(90deg,color-mix(in srgb,var(--gold) 45%,transparent),transparent);margin:0 0 22px}

/* KPI tiles */
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:6px 0 0}
@media(max-width:900px){.kpis{grid-template-columns:repeat(2,1fr)}}
.kpi{background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:14px 15px}
.kpi .l{color:var(--ink-3);font-size:11.5px;text-transform:uppercase;letter-spacing:.09em;font-weight:600}
.kpi .v{font-weight:700;font-size:27px;line-height:1.15;margin-top:5px;font-feature-settings:var(--tnum)}
.kpi .s{color:var(--ink-3);font-size:12px;margin-top:2px}
.kpi.acc .v{color:var(--acc)}

/* toolbar */
.tools{position:sticky;top:52px;z-index:30;display:flex;flex-wrap:wrap;gap:10px;align-items:center;
  padding:12px 0;background:color-mix(in srgb,var(--paper) 92%,transparent);backdrop-filter:blur(8px)}
.search{display:flex;align-items:center;gap:8px;height:34px;padding:0 12px;background:var(--card);
  border:1px solid var(--line);border-radius:10px;min-width:250px;flex:1;max-width:380px}
.search svg{width:15px;height:15px;color:var(--ink-3);flex:none}
.search input{border:0;background:transparent;color:var(--ink);font:400 13.5px var(--body);width:100%;outline:none}
.chips{display:flex;flex-wrap:wrap;gap:6px}
.chip{height:30px;padding:0 11px;border:1px solid var(--line);background:transparent;color:var(--ink-2);
  border-radius:99px;font:500 12px var(--body);cursor:pointer;transition:.15s}
.chip:hover{color:var(--ink)}
.chip[aria-pressed="true"]{background:color-mix(in srgb,var(--acc) 16%,transparent);border-color:color-mix(in srgb,var(--acc) 55%,var(--line));color:var(--acc)}
.count{margin-left:auto;color:var(--ink-3);font:500 12.5px var(--mono)}

/* module cards */
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:16px}
.mcard{--acc:var(--b-mkt);background:var(--card);border:1px solid var(--line);border-radius:var(--r);
  padding:0;overflow:hidden;display:flex;flex-direction:column}
.mcard .bar{height:3px;background:linear-gradient(90deg,var(--acc),transparent)}
.mcard .hd{display:flex;gap:12px;align-items:flex-start;padding:16px 17px 12px}
.mcard .ic{width:36px;height:36px;flex:none;border-radius:10px;display:grid;place-items:center;
  background:color-mix(in srgb,var(--acc) 15%,transparent);color:var(--acc)}
.mcard .ic svg{width:19px;height:19px}
.mcard h3{font-size:18.5px;font-weight:700}
.mcard .no{font:600 11px var(--mono);color:var(--ink-3);letter-spacing:.12em}
.mcard .ucel{color:var(--ink-2);font-size:13.5px;padding:0 17px;margin:0 0 12px}
.badges{display:flex;flex-wrap:wrap;gap:6px;padding:0 17px 13px}
.badge{display:inline-flex;align-items:center;gap:5px;height:23px;padding:0 9px;border-radius:6px;
  font:600 11px var(--body);border:1px solid transparent;white-space:nowrap}
.badge.ok{background:color-mix(in srgb,var(--good) 15%,transparent);color:var(--good);border-color:color-mix(in srgb,var(--good) 35%,transparent)}
.badge.cond{background:color-mix(in srgb,var(--amber) 15%,transparent);color:var(--amber);border-color:color-mix(in srgb,var(--amber) 35%,transparent)}
.badge.no{background:color-mix(in srgb,var(--red) 15%,transparent);color:var(--red);border-color:color-mix(in srgb,var(--red) 35%,transparent)}
.badge.q{background:var(--card-2);color:var(--ink-3);border-color:var(--line)}
.badge.mono{font-family:var(--mono);font-weight:500}
.mcard .nums{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--line);border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.mcard .nums div{background:var(--card);padding:10px 12px}
.mcard .nums b{display:block;font-size:19px;font-weight:700;font-feature-settings:var(--tnum)}
.mcard .nums span{color:var(--ink-3);font-size:11px;text-transform:uppercase;letter-spacing:.07em;font-weight:600}
.mcard .body{padding:14px 17px 4px}
.mcard .lbl{font:600 11px var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3);margin:0 0 8px}
ul.fn{list-style:none;margin:0 0 14px;padding:0;display:grid;gap:7px}
ul.fn li{display:flex;gap:9px;font-size:13.2px;color:var(--ink-2);line-height:1.45}
ul.fn li i{width:5px;height:5px;border-radius:50%;background:var(--acc);flex:none;margin-top:7px}
ul.fn li em{font-style:normal;color:var(--ink-3);font:500 11px var(--mono);white-space:nowrap}
details.tech{border-top:1px solid var(--line);margin:0 -17px;padding:0}
details.tech>summary{cursor:pointer;list-style:none;padding:12px 17px;font:600 12.5px var(--body);color:var(--ink-2);display:flex;align-items:center;gap:8px}
details.tech>summary::-webkit-details-marker{display:none}
details.tech>summary::after{content:'';width:6px;height:6px;border-right:1.6px solid currentColor;border-bottom:1.6px solid currentColor;transform:rotate(45deg);margin-left:auto;transition:.2s}
details.tech[open]>summary::after{transform:rotate(225deg)}
details.tech>summary:hover{color:var(--acc)}
dl.kv{margin:0;padding:2px 17px 16px;display:grid;grid-template-columns:auto 1fr;gap:7px 14px;font-size:12.8px}
dl.kv dt{color:var(--ink-3);font:600 11.5px var(--mono);white-space:nowrap}
dl.kv dd{margin:0;color:var(--ink-2)}

/* tables */
.tw{border:1px solid var(--line);border-radius:var(--r);overflow:hidden;background:var(--card)}
.tscroll{overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:13.2px;min-width:640px}
th{text-align:left;padding:11px 13px;background:var(--card-2);color:var(--ink-3);font:600 11px var(--body);
  text-transform:uppercase;letter-spacing:.09em;border-bottom:1px solid var(--line);white-space:nowrap}
td{padding:11px 13px;border-bottom:1px solid var(--line);color:var(--ink-2);vertical-align:top}
tr:last-child td{border-bottom:0}
tbody tr:hover td{background:color-mix(in srgb,var(--acc) 5%,transparent)}
td.n{font-family:var(--mono);text-align:right;font-feature-settings:var(--tnum);white-space:nowrap}
td b{color:var(--ink);font-weight:600}
tfoot td{background:var(--card-2);color:var(--ink);font-weight:600;border-top:1px solid var(--line)}
.dot{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:7px;vertical-align:1px}
.empty{padding:34px 16px;text-align:center;color:var(--ink-3);font-size:13.5px;display:none}
.empty.on{display:block}

/* legend */
.leg{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px}
.leg .box{background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:15px 16px}
.leg dt{display:flex;align-items:center;gap:8px;font-weight:600;font-size:13.5px;margin-top:11px}
.leg dt:first-of-type{margin-top:0}
.leg dd{margin:3px 0 0;color:var(--ink-3);font-size:12.8px}
footer{margin-top:52px;padding-top:20px;border-top:1px solid var(--line);color:var(--ink-3);font-size:12.5px}
footer p{margin:5px 0}

@media(max-width:640px){
  .wrap{padding:0 14px 56px}
  .hero{padding-top:34px}
  .grid{grid-template-columns:1fr}
  .tools{position:static}
  .count{margin-left:0;width:100%}
}
@media print{
  .top,.tools,.btn{display:none!important}
  body{background:#fff;color:#000}
  :root{--paper:#fff;--card:#fff;--card-2:#f4f4f4;--line:#ccc;--ink:#111;--ink-2:#333;--ink-3:#666}
  .wrap{max-width:none;padding:0}
  .grid{grid-template-columns:1fr 1fr}
  .mcard,.tw,.kpi{break-inside:avoid;page-break-inside:avoid}
  details.tech{display:block}
  details.tech>summary{display:none}
  dl.kv{padding-top:10px}
  section{page-break-before:auto}
  table{min-width:0;font-size:10.5px}
  th,td{padding:5px 7px}
  @page{size:A4 landscape;margin:12mm}
}
`;

/* ═════════════════════════ komponenty ═════════════════════════ */

const crown = `<svg class="crown" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z"/></svg>`;

const kpiTile = (l, v, s, acc) =>
  `<div class="kpi${acc ? ' acc' : ''}"><div class="l">${esc(l)}</div><div class="v">${esc(v)}</div>${s ? `<div class="s">${esc(s)}</div>` : ''}</div>`;

function moduleCard(m, i) {
  const fns = m.funkcie
    .map((f) => `<li><i></i><span>${esc(f[0])} <em>· ${esc(f[3])}</em></span></li>`)
    .join('');
  const kv = [
    ['Reálna appka', m.realnaAppka],
    ['Port / URL', m.port],
    ['Vetva rodiny', m.vetva],
    ['Stack', m.stack],
    ['Testy', m.testy],
    ['Git', m.git],
    ['Veľkosť', m.velkost],
    ['Kontajnery', m.kontajnery],
    ['Vlastník', m.vlastnik],
    ['Náklady', m.naklady],
    ['Hub /api/summary', m.hubApi.label],
  ]
    .map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`)
    .join('');
  const search = [m.nazov, m.ucel, m.realnaAppka, m.port, m.vetva, m.stack, m.vlastnik, ...m.funkcie.map((f) => f[0])]
    .join(' ')
    .toLowerCase();
  const rizik = RIZIKA.filter((r) => r[0] === m.nazov.replace('Aura ', '')).length;
  return `<article class="mcard" style="--acc:var(${m.akcent})" data-modul="${m.id}" data-s="${esc(search)}">
  <div class="bar"></div>
  <div class="hd">
    <div class="ic">${svg(iconFor[m.id])}</div>
    <div>
      <div class="no">MODUL ${String(i + 1).padStart(2, '0')}</div>
      <h3>${esc(m.nazov)}</h3>
    </div>
  </div>
  <p class="ucel">${esc(m.ucel)}</p>
  <div class="badges">
    <span class="badge ${m.stav.tone}">${esc(m.stav.label)}</span>
    <span class="badge ${m.hubApi.tone === 'ok' ? 'ok' : 'q'} mono">hub API: ${esc(m.hubApi.label)}</span>
    <span class="badge q mono">${esc(m.port)}</span>
    <span class="badge ${m.vetva.startsWith('B') ? 'ok' : 'cond'} mono">vetva ${esc(m.vetva.slice(0, 1))}</span>
  </div>
  <div class="nums">
    <div><b>${m.funkcie.length}</b><span>funkcií</span></div>
    <div><b>${m.obrazovky.length}</b><span>obrazoviek</span></div>
    <div><b>${rizik}</b><span>rizík</span></div>
  </div>
  <div class="body">
    <p class="lbl">Čo modul robí</p>
    <ul class="fn">${fns}</ul>
  </div>
  <details class="tech">
    <summary>Technický profil, vlastník a náklady</summary>
    <dl class="kv">${kv}</dl>
  </details>
</article>`;
}

/* funkcie — jedna tabuľka za všetky moduly + spoločnú vrstvu */
const funkcieRows = [
  ...MODULY.flatMap((m) =>
    m.funkcie.map((f) => ({ modul: m.nazov, id: m.id, funkcia: f[0], kat: f[1], zdroj: f[2], over: f[3] })),
  ),
  ...SPOLOCNE.map((s) => ({
    modul: 'Spoločná vrstva',
    id: 'spolocne',
    funkcia: `${s[0]} — ${s[1]}`,
    kat: 'Spoločné',
    zdroj: s[3],
    over: s[4],
    platnost: s[2],
  })),
];

const kategorie = [...new Set(funkcieRows.map((r) => r.kat))];

function funkcieTable() {
  const rows = funkcieRows
    .map(
      (r) => `<tr data-modul="${r.id}" data-kat="${slug(r.kat)}" data-over="${slug(r.over)}"
   data-s="${esc(`${r.modul} ${r.funkcia} ${r.kat} ${r.zdroj} ${r.over}`.toLowerCase())}">
  <td><b>${esc(r.modul)}</b>${r.platnost ? `<br><span class="mono" style="font-size:11px;color:var(--ink-3)">${esc(r.platnost)}</span>` : ''}</td>
  <td>${esc(r.funkcia)}</td>
  <td><span class="badge q">${esc(r.kat)}</span></td>
  <td class="mono" style="font-size:11.5px">${esc(r.zdroj)}</td>
  <td><span class="badge ${OVER_CLS[r.over]}">${esc(r.over)}</span></td>
</tr>`,
    )
    .join('');
  return `<div class="tw"><div class="tscroll"><table id="tFn">
  <thead><tr><th>Modul</th><th>Funkcia</th><th>Kategória</th><th>Zdroj</th><th>Overenie</th></tr></thead>
  <tbody>${rows}</tbody></table></div><div class="empty" id="emptyFn">Filtru nič nevyhovuje.</div></div>`;
}

function obrazovkyTable() {
  const rows = MODULY.flatMap((m, mi) =>
    m.obrazovky.map(
      (o, oi) => `<tr data-modul="${m.id}" data-s="${esc(`${m.nazov} ${o[1]} ${o[2]} ${o[0]}`.toLowerCase())}">
  <td><b>${esc(m.nazov)}</b></td><td class="n">${mi + 1}.${oi + 1}</td>
  <td class="mono">#${esc(m.id)}/${esc(o[0])}</td><td>${esc(o[1])}</td><td>${esc(o[2])}</td></tr>`,
    ),
  ).join('');
  const glob = GLOBALNE_OBRAZOVKY.map(
    (g, i) => `<tr data-modul="global" data-s="${esc(`${g[1]} ${g[2]}`.toLowerCase())}">
  <td><b>Globálne</b></td><td class="n">0.${i + 1}</td><td class="mono">#${esc(g[0])}</td><td>${esc(g[1])}</td><td>${esc(g[2])}</td></tr>`,
  ).join('');
  return `<div class="tw"><div class="tscroll"><table id="tScr">
  <thead><tr><th>Modul</th><th>#</th><th>Routa</th><th>Obrazovka</th><th>Typ / obsah</th></tr></thead>
  <tbody>${rows}${glob}</tbody>
  <tfoot><tr><td colspan="2">Spolu</td><td class="mono">${S.obrazoviekModuly} modulových + ${S.obrazoviekGlobal} globálnych</td><td colspan="2">${S.obrazoviekSpolu} obrazoviek</td></tr></tfoot>
  </table></div><div class="empty" id="emptyScr">Filtru nič nevyhovuje.</div></div>`;
}

function nakladyTable() {
  const rows = NAKLADY.saas
    .map(
      (r) => `<tr><td><b>${esc(r[0])}</b></td><td>${esc(r[1])}</td><td>${esc(r[2])}</td>
  <td class="n">${eur(r[3])}</td><td class="n">${num(r[4])}</td>
  <td><span class="badge ${r[5] === 'aktívna' ? 'ok' : 'cond'}">${esc(r[5])}</span></td></tr>`,
    )
    .join('');
  const interne = NAKLADY.interne
    .map(
      (r) => `<tr><td><b>${esc(r[0])}</b></td><td>${esc(r[1])}</td><td>${esc(r[2])}</td>
  <td class="n">${eur(r[3])}</td><td class="mono">${esc(r[4])}</td><td><span class="badge q">${esc(r[5])}</span></td></tr>`,
    )
    .join('');
  return `<div class="tw"><div class="tscroll"><table>
  <thead><tr><th>Aplikácia</th><th>Účel</th><th>Vlastník</th><th>€ / mes.</th><th>Licencie</th><th>Stav</th></tr></thead>
  <tbody>${rows}</tbody>
  <tfoot><tr><td colspan="3">Spolu — externé SaaS (${S.saasPocet})</td><td class="n">${eur(S.saasSpolu)}</td><td colspan="2">z toho nevyužité ${eur(S.saasUspora)} → potenciál úspory ~13 %</td></tr></tfoot>
  </table></div></div>
<h3 style="font-size:16px;margin:26px 0 10px">Interné rozpočty a prevádzkové náklady</h3>
<div class="tw"><div class="tscroll"><table>
  <thead><tr><th>Položka</th><th>Popis</th><th>Vlastník</th><th>Suma</th><th>Obdobie</th><th>Poznámka</th></tr></thead>
  <tbody>${interne}</tbody></table></div></div>
<div class="note">${NAKLADY.poznamky.map(esc).join('<br>')}</div>`;
}

function rizikaTable() {
  const rows = RIZIKA.map(
    (r) => `<tr data-s="${esc(r.join(' ').toLowerCase())}">
  <td><b>${esc(r[0])}</b></td>
  <td><b>${esc(r[1])}</b><br><span style="color:var(--ink-3)">${esc(r[2])}</span></td>
  <td><span class="badge ${SEV_CLS[r[3]]}">${esc(r[3])}</span></td>
  <td><span class="badge q">${esc(r[4])}</span></td>
  <td>${esc(r[6])}</td>
  <td class="mono" style="font-size:11.5px">${esc(r[5])}</td></tr>`,
  ).join('');
  return `<div class="tw"><div class="tscroll"><table>
  <thead><tr><th>Modul</th><th>Riziko / otvorený bod</th><th>Závažnosť</th><th>Stav</th><th>Kontext a zmiernenie</th><th>Zdroj</th></tr></thead>
  <tbody>${rows}</tbody></table></div></div>`;
}

function legenda() {
  const over = LEGENDA.overenie
    .map(([k, v]) => `<dt><span class="badge ${OVER_CLS[k]}">${esc(k)}</span></dt><dd>${esc(v)}</dd>`)
    .join('');
  const stav = LEGENDA.stav.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
  return `<div class="leg">
  <div class="box"><p class="lbl" style="font:600 11px var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3);margin:0 0 10px">Stupeň overenia</p><dl style="margin:0">${over}</dl></div>
  <div class="box"><p class="lbl" style="font:600 11px var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3);margin:0 0 10px">Stav aplikácie</p><dl style="margin:0">${stav}</dl></div>
  <div class="box"><p class="lbl" style="font:600 11px var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3);margin:0 0 10px">Vetvy rodiny appiek</p>
    <dl style="margin:0">
      <dt><span class="badge cond mono">vetva A</span></dt><dd>Vanilla SPA + Express: Node 20 + Express 4 + MariaDB + JWT, bez build stepu. Rýchla na postavenie, ale bez testov, CSRF, rate-limitu a lockfile. Línia aura-hr-mapa → aura-logistika → aura-kpi → Banner Studio.</dd>
      <dt><span class="badge ok mono">vetva B</span></dt><dd>Next 16 + React 19 + TS: argon2id + jose + zod, defineRoute() pipeline, migrácie s ledgerom, testy vrátane e2e a axe, non-root kontajner. sperky-ai a aura-roadmap. Pravidlo: nové appky stavať tu.</dd>
    </dl></div>
  <div class="box"><p class="lbl" style="font:600 11px var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3);margin:0 0 10px">Zdroje</p>
    <dl style="margin:0">
      <dt class="mono">repo · hub</dt><dd>apps/aura-apps-hub.html — mockup 6 modulov, merge 817124f.</dd>
      <dt class="mono">repo · README</dt><dd>apps/README.md — popis modulov, live vrstvy a ovládania.</dd>
      <dt class="mono">Hades · …</dt><dd>Hades pamäť: recon rodiny appiek C:\\Aura z 28. 7. – 3. 8. 2026. V tomto repe dôkaz nie je.</dd>
    </dl></div>
</div>`;
}

/* ═════════════════════════ dokument ═════════════════════════ */

const modulChips = [
  `<button class="chip" data-f="modul" data-v="all" aria-pressed="true">Všetky moduly</button>`,
  ...MODULY.map((m) => `<button class="chip" data-f="modul" data-v="${m.id}" aria-pressed="false">${esc(m.nazov.replace('Aura ', ''))}</button>`),
  `<button class="chip" data-f="modul" data-v="spolocne" aria-pressed="false">Spoločná vrstva</button>`,
].join('');

const katChips = [
  `<button class="chip" data-f="kat" data-v="all" aria-pressed="true">Všetky kategórie</button>`,
  ...kategorie.map((k) => `<button class="chip" data-f="kat" data-v="${slug(k)}" aria-pressed="false">${esc(k)}</button>`),
].join('');

const overChips = [
  `<button class="chip" data-f="over" data-v="all" aria-pressed="true">Každé overenie</button>`,
  ...LEGENDA.overenie.map(([k]) => `<button class="chip" data-f="over" data-v="${slug(k)}" aria-pressed="false">${esc(k)}</button>`),
].join('');

const HTML = `<!doctype html>
<html lang="sk" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(META.titul)} — Aura</title>
<meta name="description" content="${esc(META.podtitul)}: ${S.modulov} modulov, ${S.funkciiSpolu} funkcií, ${S.obrazoviekSpolu} obrazoviek.">
<meta name="robots" content="noindex">
<style>${CSS}</style>
</head>
<body>
<header class="top">
  <div class="brand">${crown}<span>Aura</span></div>
  <div class="sep"></div>
  <div class="where">prehľad aplikácií · ${esc(META.datum)}</div>
  <div class="sp"></div>
  <button class="btn" id="theme" aria-label="Prepnúť tmavý a svetlý režim">
    <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M18 13.5A7.5 7.5 0 018.5 4a7.5 7.5 0 109.5 9.5z"/></svg>
    <span id="themeL">Svetlý režim</span>
  </button>
  <button class="btn" onclick="window.print()">
    <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M6 8V3h10v5M6 16H4V8h14v8h-2M6 13h10v6H6z"/></svg>
    Tlač / PDF
  </button>
</header>

<main class="wrap">
  <section class="hero">
    <div class="eb">Aura Suite <span class="n">· register aplikácií</span></div>
    <h1>${esc(META.titul)}</h1>
    <p class="tag">${esc(META.podtitul)}.</p>
    <div class="meta-l">
      <span>${esc(META.rozsah)}</span>
      <span>stav k ${esc(META.datum)}</span>
      <span>zdroje: ${esc(META.zdrojRepo)}</span>
    </div>
    <div class="kpis" style="margin-top:26px">
      ${kpiTile('Aplikácií / modulov', String(S.modulov), `${S.vPrevadzke} v prevádzke · ${S.chybajucich} neexistuje`, true)}
      ${kpiTile('Funkcií spolu', String(S.funkciiSpolu), `${S.funkciiModuly} modulových + ${S.funkciiSpolocnych} spoločných`)}
      ${kpiTile('Obrazoviek', String(S.obrazoviekSpolu), `${S.obrazoviekModuly} modulových + ${S.obrazoviekGlobal} globálnych`)}
      ${kpiTile('Overených funkcií', `${S.overenychFunkcii} / ${S.funkciiSpolu}`, `${S.rekonstruovanychFunkcii} rekonštruovaných · ${S.ukazkovychFunkcii} ukážkových`)}
      ${kpiTile('Hub /api/summary', `${S.hubApiHotove} / ${S.modulov}`, 'KPI a Logistika dávajú živé dáta')}
      ${kpiTile('Otvorených rizík', String(S.rizikSpolu), `${S.rizikVysokych} s vysokou závažnosťou`)}
      ${kpiTile('Externé SaaS', eur(S.saasSpolu), `${S.saasPocet} aplikácií / mes.`)}
      ${kpiTile('Vetva B / vetva A', '2 / 4', 'appky s testami a auth pipeline / vanilla SPA')}
    </div>
    <p class="note">${esc(META.poznamka)}</p>
  </section>

  <section class="sec" id="moduly">
    <div class="goldline"></div>
    <h2 class="sh">Aplikácie po moduloch</h2>
    <p class="sh-sub">${S.modulov} modulov Aura Suite, každý postavený podľa konkrétnej reálnej aplikácie rodiny. Rozbaľ „Technický profil" pre stack, git, testy, vlastníka a náklady.</p>
    <div class="tools">
      <label class="search">
        <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="10" cy="10" r="6"/><path d="M14.5 14.5L19 19"/></svg>
        <input id="q" type="search" placeholder="Hľadaj v moduloch a funkciách…" autocomplete="off">
      </label>
      <div class="chips">${modulChips}</div>
      <span class="count" id="cntMod"></span>
    </div>
    <div class="grid" id="cards">${MODULY.map(moduleCard).join('\n')}</div>
    <div class="empty" id="emptyMod">Filtru nič nevyhovuje.</div>
  </section>

  <section class="sec" id="funkcie">
    <div class="goldline"></div>
    <h2 class="sh">Všetky funkcie na jednom mieste</h2>
    <p class="sh-sub">${S.funkciiSpolu} funkcií — ${S.funkciiModuly} modulových a ${S.funkciiSpolocnych} zo spoločnej vrstvy. Filtre a vyhľadávanie hore platia aj pre túto tabuľku.</p>
    <div class="tools">
      <div class="chips">${katChips}</div>
      <div class="chips">${overChips}</div>
      <span class="count" id="cntFn"></span>
    </div>
    ${funkcieTable()}
  </section>

  <section class="sec" id="obrazovky">
    <div class="goldline"></div>
    <h2 class="sh">Obrazovky</h2>
    <p class="sh-sub">${S.obrazoviekSpolu} obrazoviek: ${S.obrazoviekModuly} v moduloch (vrátane intro stránky každého modulu) a ${S.obrazoviekGlobal} globálnych.</p>
    ${obrazovkyTable()}
  </section>

  <section class="sec" id="naklady">
    <div class="goldline"></div>
    <h2 class="sh">Náklady</h2>
    <p class="sh-sub">Vlastné Aura appky nemajú licenčný náklad. Platíme za ${S.saasPocet} externých SaaS aplikácií — spolu ${eur(S.saasSpolu)} / mes.</p>
    ${nakladyTable()}
  </section>

  <section class="sec" id="rizika">
    <div class="goldline"></div>
    <h2 class="sh">Riziká a otvorené body</h2>
    <p class="sh-sub">${S.rizikSpolu} zaznamenaných rizík, z toho ${S.rizikVysokych} s vysokou závažnosťou. Vychádzajú z reconu rodiny appiek — v tomto repe ich nevidno.</p>
    ${rizikaTable()}
  </section>

  <section class="sec" id="legenda">
    <div class="goldline"></div>
    <h2 class="sh">Legenda a metodika</h2>
    <p class="sh-sub">Ako čítať odznaky a odkiaľ ktorý údaj pochádza.</p>
    ${legenda()}
  </section>

  <footer>
    <p><b>Pravidlo projektu:</b> neznáme výsledky sa nevymýšľajú. Každý riadok nesie zdroj a stupeň overenia; kde tvrdenie nemá dôkaz, je to napísané.</p>
    <p>Zdroje: ${esc(META.zdrojRepo)} · ${esc(META.zdrojHades)}</p>
    <p>Generované z <span class="mono">apps/build/inventory-data.mjs</span> — dáta sa upravujú tam, nie v tomto HTML. Prestavba: <span class="mono">node apps/build/inventory-html.mjs</span>.</p>
  </footer>
</main>

<script>
(function(){
  var st={q:'',modul:'all',kat:'all',over:'all'};
  var cards=[].slice.call(document.querySelectorAll('#cards .mcard'));
  var fnRows=[].slice.call(document.querySelectorAll('#tFn tbody tr'));
  var scrRows=[].slice.call(document.querySelectorAll('#tScr tbody tr'));

  function apply(){
    var q=st.q.trim().toLowerCase();
    var nm=0;
    cards.forEach(function(c){
      var ok=(st.modul==='all'||st.modul===c.dataset.modul) && (!q||c.dataset.s.indexOf(q)>-1);
      c.style.display=ok?'':'none'; if(ok)nm++;
    });
    document.getElementById('emptyMod').classList.toggle('on',nm===0);
    document.getElementById('cntMod').textContent=nm+' z '+cards.length+' modulov';

    var nf=0;
    fnRows.forEach(function(r){
      var ok=(st.modul==='all'||st.modul===r.dataset.modul)
        && (st.kat==='all'||st.kat===r.dataset.kat)
        && (st.over==='all'||st.over===r.dataset.over)
        && (!q||r.dataset.s.indexOf(q)>-1);
      r.style.display=ok?'':'none'; if(ok)nf++;
    });
    document.getElementById('emptyFn').classList.toggle('on',nf===0);
    document.getElementById('cntFn').textContent=nf+' z '+fnRows.length+' funkcií';

    scrRows.forEach(function(r){
      var ok=(st.modul==='all'||st.modul===r.dataset.modul||r.dataset.modul==='global'&&st.modul==='all')
        && (!q||r.dataset.s.indexOf(q)>-1);
      r.style.display=ok?'':'none';
    });
    var nScr=scrRows.filter(function(r){return r.style.display!=='none';}).length;
    document.getElementById('emptyScr').classList.toggle('on',nScr===0);
  }

  document.getElementById('q').addEventListener('input',function(e){st.q=e.target.value;apply();});
  [].slice.call(document.querySelectorAll('.chip')).forEach(function(b){
    b.addEventListener('click',function(){
      var f=b.dataset.f;
      document.querySelectorAll('.chip[data-f="'+f+'"]').forEach(function(o){o.setAttribute('aria-pressed',String(o===b));});
      st[f]=b.dataset.v; apply();
    });
  });

  var root=document.documentElement, tl=document.getElementById('themeL');
  document.getElementById('theme').addEventListener('click',function(){
    var light=root.getAttribute('data-theme')==='light';
    root.setAttribute('data-theme',light?'dark':'light');
    tl.textContent=light?'Svetlý režim':'Tmavý režim';
  });

  document.addEventListener('keydown',function(e){
    if(e.key==='/'&&e.target.tagName!=='INPUT'){e.preventDefault();document.getElementById('q').focus();}
  });

  apply();
})();
</script>
</body>
</html>
`;

writeFileSync(out, HTML, 'utf8');
console.log(
  `✓ ${out}\n  ${S.modulov} modulov · ${S.funkciiSpolu} funkcií · ${S.obrazoviekSpolu} obrazoviek · ${S.rizikSpolu} rizík · ${(HTML.length / 1024).toFixed(0)} kB`,
);
