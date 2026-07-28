#!/usr/bin/env node
/**
 * assemble.mjs — zlepí výstupy agentov A1–A3 do jedného self-contained HTML.
 *
 *   node assemble.mjs
 *
 * Vstup (build/):  body.html · tooltips.js · deck.css · report.css · deck.js · mode.js
 * Výstup:          ../aura-ai-prezentacia.html
 *
 * Poradie je dané kontraktom (CONTRACT.md §1):
 *   CSS   deck.css  →  report.css        (report prepisuje deck špecificitou)
 *   JS    tooltips.js → deck.js → mode.js
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const B = dirname(fileURLToPath(import.meta.url));
const OUT = join(B, '..', 'aura-ai-prezentacia.html');

const NEED = ['body.html', 'tooltips.js', 'deck.css', 'report.css', 'deck.js', 'mode.js'];
const missing = NEED.filter(f => !existsSync(join(B, f)));
if (missing.length) {
  console.error('CHÝBAJÚ SÚBORY OD AGENTOV:\n  ' + missing.join('\n  '));
  process.exit(1);
}
const read = f => readFileSync(join(B, f), 'utf8');

const body = read('body.html');
const sections = (body.match(/<section class="s[ "]/g) || []).length;
if (sections !== 13) {
  console.error(`body.html má ${sections} sekcií, očakávam 13.`);
  process.exit(1);
}

const html = `<!DOCTYPE html>
<html lang="sk" data-theme="dark" data-mode="deck">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="Aura AI — vlastné AI jadro. Investičné rozhodnutie, stav k 28. 7. 2026.">
<title>Aura AI — Vlastné AI jadro | Investičné rozhodnutie</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
<style>
/* ===== deck.css (A2) ===== */
${read('deck.css').trim()}

/* ===== report.css (A3) ===== */
${read('report.css').trim()}
</style>
</head>
<body>
<noscript><p style="padding:24px;font:16px/1.5 system-ui">Táto prezentácia potrebuje JavaScript — bez neho nefunguje navigácia, slovníček ani konfigurátor zostavy.</p></noscript>

<div id="amb" aria-hidden="true"><i></i><i></i></div>
<div id="rail"><i></i></div>
<div id="top">
  <span class="cr">♛</span><span>Aura&nbsp;AI · interná AI infraštruktúra</span>
  <span class="sp"></span>
  <span id="st"><b></b>At risk</span>
  <button class="pill" id="gl">? Slovníček</button>
  <button class="pill" id="th">Light</button>
</div>

<div id="tip" role="tooltip"><b></b><p></p></div>
<div id="gv" role="dialog" aria-modal="true" aria-label="Slovníček pojmov"><div class="gw"><div class="eb">Vysvetlivky</div><h2>Slovníček pojmov</h2><p class="ld">Každý pojem je v prezentácii podčiarknutý bodkovanou linkou — po nabehnutí myšou alebo kliknutí sa zobrazí vysvetlenie. Tu sú všetky na jednom mieste.</p><div class="gg" id="gg"></div><p class="tiny">Zavriete klávesom Esc alebo kliknutím mimo.</p></div></div>
<button class="pill" id="gx" style="display:none">✕ Zavrieť</button>

<div id="deck">
${body.trim()}
</div>

<div id="ct"><b>01</b> / 13</div>
<div id="dots"></div>
<div id="nav">
  <button class="pill" id="pv">← Späť</button>
  <button class="pill" id="nx">Ďalej →</button>
</div>

<script>
/* ===== tooltips.js (A1) ===== */
${read('tooltips.js').trim()}
</script>
<script>
/* ===== deck.js (A2) ===== */
${read('deck.js').trim()}
</script>
<script>
/* ===== mode.js (A3) ===== */
${read('mode.js').trim()}
</script>
</body>
</html>
`;

writeFileSync(OUT, html, 'utf8');
const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
console.log(`OK  ${OUT}`);
console.log(`    ${sections} sekcií · ${kb} KB`);
