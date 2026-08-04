#!/usr/bin/env node
/**
 * assemble.mjs — zlepí balík `apps/aura-suite/`:
 *   aura-suite/index.html          rozcestník 12 appiek
 *   aura-suite/<key>/index.html    self-contained appka (obrazovky + interakcie)
 *   aura-suite/<key>/README.md     čo appka je a čo v nej je
 *
 *   node apps/build/aura-suite/assemble.mjs
 *
 * CSS základ sa berie 1:1 z `apps/aura-apps-hub.html` a `build/aura-ai/extra.css`,
 * navrch ide `kit.css`. Logika: kit.js (jadro) → dáta → kit2.js (interakcie).
 * Dátové súbory sú `data/suite-<key>.js` a musia definovať jeden `const APP_*`.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const APPS = resolve(__dir, '../..');                 // .../apps
const OUT = join(APPS, 'aura-suite');
const DATA = join(__dir, 'data');
const read = p => readFileSync(p, 'utf8');

/* poradie a skupiny na rozcestníku + akcenty */
const ORDER = [
  ['marketing', 'prov', 'var(--b-mkt)'], ['kpi', 'prov', 'var(--b-kpi)'], ['logistika', 'prov', 'var(--b-log)'],
  ['hr', 'prov', 'var(--b-hr)'], ['roadmap', 'prov', 'var(--b-road)'], ['trzby', 'prov', 'var(--b-fin)'],
  ['mind', 'ai', 'var(--b-mind)'], ['chat', 'ai', 'var(--b-chat)'], ['banner', 'ai', 'var(--b-ban)'],
  ['retus', 'ai', 'var(--b-ret)'], ['shop', 'ai', 'var(--b-shop)'], ['auhub', 'ai', 'var(--b-hub)'],
];

/* ── CSS základ ─────────────────────────────────────────────── */
const hub = read(join(APPS, 'aura-apps-hub.html'));
const m = hub.match(/<style>([\s\S]*?)<\/style>/);
if (!m) throw new Error('V hube sa nenašiel blok <style>.');
const baseCss = m[1].trim();
const aiCss = read(join(APPS, 'build/aura-ai/extra.css'));
const kitCss = read(join(__dir, 'kit.css'));
const CSS = `${baseCss}\n\n${aiCss}\n\n${kitCss}`;

const kitJs = read(join(__dir, 'kit.js'));
const kit2Js = read(join(__dir, 'kit2.js'));
const hubJs = read(join(__dir, 'hubpage.js'));

/* ── načítanie dát appiek (vyhodnotením so stubmi) ──────────── */
const L = (sk, en) => ({ sk, en });
const cur = v => ({ t: 'cur', v }), int = v => ({ t: 'int', v }), pc = v => ({ t: 'pct', v });
function loadApp(file){
  const src = read(file);
  const names = [...src.matchAll(/^const\s+(APP_[A-Z0-9_]+)\s*=/gm)].map(x => x[1]);
  if (!names.length) throw new Error('V ' + file + ' nie je žiadny const APP_*');
  const name = names[0];
  const fn = new Function('L', 'cur', 'int', 'pc', src + `\nreturn ${name};`);
  return { obj: fn(L, cur, int, pc), src, name };
}

const found = [];
for (const [key, grp, acc] of ORDER){
  const f = join(DATA, `suite-${key}.js`);
  if (!existsSync(f)) { console.log(`  – ${key}: dáta chýbajú, appka sa preskočí`); continue; }
  const { obj, src, name } = loadApp(f);
  if (obj.key !== key) console.log(`  ! ${key}: dáta hlásia key='${obj.key}' — zosúlaďuje sa na '${key}'`);
  found.push({ key, grp, acc, obj, src, name });
}
if (!found.length) throw new Error('Žiadne dátové súbory v ' + DATA);

const META = found.map(a => ({
  key: a.key, name: a.obj.name, port: a.obj.port || '', icon: a.obj.icon || 'grid', acc: a.acc,
  tag: a.obj.tag, live: a.obj.live || null, grp: a.grp,
  n: a.key === 'chat' ? ((a.obj.nav || []).length + (a.obj.convos || []).length) : (a.obj.screens || []).length,
}));

/* ── HTML skelety ───────────────────────────────────────────── */
const chrome = title => `<header class="gbar">
  <button class="hamb" id="hambBtn" aria-label="Menu"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button>
  <a class="brand" href="${title === 'hub' ? '#' : '../index.html'}" aria-label="Aura Suite">
    <svg class="crown" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 8l4 4 5-7 5 7 4-4-2 12H5L3 8z"/></svg>
    <span class="w"><b>Aura</b> Suite</span></a>
  <span class="demo-tag">Demo · ukážkové dáta</span>
  <div class="gspace"></div>
  <div class="ctl">
    <div class="seg" id="langseg" role="group" aria-label="Jazyk">
      <button data-lang="sk" class="on" aria-pressed="true">SK</button>
      <button data-lang="en" aria-pressed="false">EN</button></div>
    <button class="icon-btn" id="themebtn" aria-pressed="false" aria-label="Prepnúť tému">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/></svg></button>
  </div>
</header>
<div class="view" id="view"></div>
<div class="toasts" id="toasts"></div>
<noscript><div style="padding:60px 26px;max-width:620px;margin:0 auto;font-family:system-ui">
  <h1>Náhľad potrebuje JavaScript</h1><p>Obrazovky sa vykresľujú na klientovi. Statické PNG sú v priečinku <code>screens/</code>.</p></div></noscript>`;

const page = (titleTag, body, script) => `<!doctype html>
<html lang="sk" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>${titleTag}</title>
<style>
/* GENEROVANÉ — základ z apps/aura-apps-hub.html + build/aura-ai/extra.css + build/aura-suite/kit.css.
   Needituj tu; uprav zdroj a spusti node apps/build/aura-suite/assemble.mjs */
${CSS}
</style>
</head>
<body>
${body}
<script>
${script}
</script>
</body>
</html>
`;

const ICONS_FOR_HUB = `const IC=${JSON.stringify(
  (() => { const src = kitJs.match(/const I=\{([\s\S]*?)\n\};/); if (!src) throw new Error('I{} sa nenašlo v kit.js');
    const fn = new Function('return {' + src[1] + '}'); return fn(); })()
)};`;

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

/* ── rozcestník ─────────────────────────────────────────────── */
const metaJs = `const APPS_META=${JSON.stringify(META)};`;
writeFileSync(join(OUT, 'index.html'), page('Aura Suite · 12 aplikácií', chrome('hub'), `${ICONS_FOR_HUB}\n${metaJs}\n${hubJs}`));
console.log(`OK  ${join(OUT, 'index.html')}`);

/* ── appky ──────────────────────────────────────────────────── */
for (const a of found){
  const dir = join(OUT, a.key);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const init = `const APP=Object.assign(${a.name},{key:'${a.key}',acc:'${a.acc}'});
${metaJs}
applyStatic();
route();
Object.assign(window,{APP,APPS_META,state,I,go,route,openCmdk,closeOverlay,toast,openImport,openReport,openConn,connSync,connOut,aiToggle,aiAsk,sortBy,pageBy,impUndo,iwSample,iwStep,iwApply,rbDraw,rbCsv});`;
  const script = `${kitJs}\n${a.src}\n${init.split('\n').slice(0, 2).join('\n')}\n${kit2Js}\n${init.split('\n').slice(2).join('\n')}`;
  writeFileSync(join(dir, 'index.html'), page(`${a.obj.name} · náhľad obrazoviek`, chrome(a.key), script));
  const sc = a.key === 'chat'
    ? (a.obj.nav || []).map(n => '`#' + n.k + '`').join(' · ')
    : (a.obj.screens || []).map(s => '`#' + s.key + '`').join(' · ');
  const readme = `# ${a.obj.name}${a.obj.port ? ` (:${a.obj.port})` : ''}

${typeof a.obj.tag === 'object' ? a.obj.tag.sk : a.obj.tag}

## Čo je v tomto priečinku

- \`index.html\` — self-contained náhľad appky (otvor v prehliadači, funguje aj offline)
- \`screens/\` — PNG všetkých obrazoviek: tmavá téma, svetlá téma, EN a mobil 390 px
- tento README

## Obrazovky

${sc}

## Čo appka v náhľade vie

- klikateľná navigácia, triedenie tabuliek klikom na hlavičku, stránkovanie nad 12 riadkov
- ${a.obj.api ? 'Shop API konektor: LIVE pilulka, sync, simulácia výpadku' : 'bez API konektora (appka nemá integrácie)'}
- ${a.obj.imp ? 'import wizard so 4 krokmi (reálne CSV cez FileReader, mapovanie, validácia, upsert + Vrátiť)' : 'bez importu'}
- ${a.obj.rep ? 'report builder so živým náhľadom, CSV, tlačou a plánovaním' : 'bez report buildera'}
- chat AuraAI (\`⌘J\`) s 3 navrhovanými otázkami na každú obrazovku a povinnou citáciou zdroja
- SK/EN, tmavá aj svetlá téma, mobil, \`⌘K\` hľadanie

## Dáta

Overené čísla z pamäte Aura AI sú prenesené 1:1 a v poznámkach označené ako overené.
Ostatné hodnoty sú ukážkové v reálnom objeme (tabuľky 20–40 riadkov, grafy 12 mesiacov)
a slúžia na predvedenie rozloženia a tokov — nie sú to prevádzkové údaje.

Odkazy na ostatné appky v ľavom rade fungujú len v plnom balíku \`aura-suite\`.
`;
  writeFileSync(join(dir, 'README.md'), readme);
  console.log(`OK  ${join(dir, 'index.html')}  (${a.key === 'chat' ? (a.obj.convos || []).length + ' konverzácií' : (a.obj.screens || []).length + ' obrazoviek'})`);
}

/* ── README balíka ──────────────────────────────────────────── */
const rows = META.map((a, i) => `| ${String(i + 1).padStart(2, '0')} | [${a.name}](${a.key}/index.html) | ${a.port ? ':' + a.port : '—'} | ${a.n} | ${typeof a.tag === 'object' ? a.tag.sk : a.tag} |`).join('\n');
writeFileSync(join(OUT, 'README.md'), `# Aura Suite — kompletný náhľad 12 aplikácií

Každá appka má vlastný priečinok, vlastný self-contained \`index.html\`, PNG všetkých
obrazoviek v štyroch variantoch (tmavá, svetlá, EN, mobil 390 px) a vlastný README.
Rozcestník je [\`index.html\`](index.html).

| # | Aplikácia | Port | Obrazovky | Čo to je |
|---|---|---|---|---|
${rows}

## Ako to prestavať

\`\`\`bash
node apps/build/aura-suite/assemble.mjs        # dáta + kit → aura-suite/**/index.html
node apps/build/shoot-suite.mjs               # → aura-suite/<app>/screens/*.png
node apps/build/aura-suite/zip.mjs            # → aura-suite/_zip/<app>.zip + aura-suite.zip
\`\`\`

Súbory \`index.html\` sú **generované** — needituj ich. Zdroj je
\`apps/build/aura-suite/\` (kit.js, kit2.js, kit.css, hubpage.js, data/suite-*.js).
CSS základ sa preberá 1:1 z \`apps/aura-apps-hub.html\`, aby sa vizuál rodiny
nemohol rozísť ručnou kópiou.

## Dáta

Overené čísla z pamäte Aura AI sú prenesené 1:1 a označené; ostatné sú ukážkové
v reálnom objeme (tabuľky 20–40 riadkov, grafy 12 mesiacov / 12 ISO týždňov).
Konkrétne hodnoty hesiel a tajomstiev sú zámerne mimo náhľadu.
`);
console.log(`OK  ${join(OUT, 'README.md')}`);
console.log(`\nappiek: ${found.length}/12   CSS ${(CSS.length / 1024).toFixed(0)} kB   kit ${((kitJs.length + kit2Js.length) / 1024).toFixed(0)} kB`);
