#!/usr/bin/env node
/**
 * assemble.mjs — zlepí apps/aura-ai.html z častí.
 *
 *   node assemble.mjs
 *
 * CSS základ sa berie 1:1 zo `apps/aura-apps-hub.html` (blok <style>), aby
 * bola vizuálna identita rodiny zaručená a nie prepísaná ručnou kópiou.
 * Nad ním sa vkladá extra.css (chat + bloky, ktoré hub nemá).
 *
 * Poradie skriptov je záväzné:
 *   core.js  → definuje L/state/tr/ikony/grafy/bloky/router
 *   data-*.js → dáta obrazoviek (používajú L/cur/int/pc z core)
 *   chat.js  → renderer chatu (číta W2_CHAT pri načítaní)
 *   init     → registrácia appiek + prvý route
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const APPS_DIR = resolve(__dir, '../..');            // .../apps
const HUB = join(APPS_DIR, 'aura-apps-hub.html');
const OUT = join(APPS_DIR, 'aura-ai.html');

const read = p => readFileSync(p, 'utf8');
const part = n => { const p = join(__dir, n); if (!existsSync(p)) throw new Error('Chýba časť: ' + n); return read(p); };

/* 1) CSS základ z hubu */
const hub = read(HUB);
const m = hub.match(/<style>([\s\S]*?)<\/style>/);
if (!m) throw new Error('V hube sa nenašiel blok <style>.');
const baseCss = m[1].trim();
if (baseCss.length < 20000) throw new Error('CSS základ je podozrivo krátky (' + baseCss.length + ' B) — over extrakciu.');

/* 2) časti */
const extraCss = part('extra.css');
const body = part('body.html');
const core = part('core.js');
const chat = part('chat.js');
const DATA = ['data-mind.js', 'data-chat.js', 'data-studios.js', 'data-shophub.js'];
const data = DATA.map(part).join('\n');

const init = `
/* ── init: registrácia appiek v poradí rozcestníka ─────────── */
reg(typeof W1_APP!=='undefined'?W1_APP:null);
reg(CHAT_META);
(typeof W3_APPS!=='undefined'?W3_APPS:[]).forEach(reg);
(typeof W4_APPS!=='undefined'?W4_APPS:[]).forEach(reg);
applyStatic();
route();
/* expozícia pre náhľadový/screenshot skript — const nie sú automaticky na window */
Object.assign(window,{APPS,CHAT,state,I,EXTRA,go,route,openCmdk,closeOverlay,toast,openArt,closeArt,renderChat,renderHub});
`;

const html = `<!doctype html>
<html lang="sk" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Aura AI · chat a zvyšné aplikácie</title>
<style>
/* ══════════════════════════════════════════════════════════════
   ZÁKLAD — prevzatý 1:1 z apps/aura-apps-hub.html (blok <style>).
   Needituj tu: uprav hub alebo build/aura-ai/extra.css a spusti
   node apps/build/aura-ai/assemble.mjs
   ══════════════════════════════════════════════════════════════ */
${baseCss}

${extraCss}
</style>
</head>
<body>
${body}
<script>
/* GENEROVANÝ SÚBOR — zdroj je apps/build/aura-ai/*, zlepené assemble.mjs */
${core}
${data}
${chat}
${init}
</script>
</body>
</html>
`;

writeFileSync(OUT, html);
const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
console.log(`OK  ${OUT}  (${kb} kB)`);
console.log(`    CSS základ ${(baseCss.length / 1024).toFixed(0)} kB + extra ${(extraCss.length / 1024).toFixed(0)} kB`);
console.log(`    dáta: ${DATA.join(', ')}`);
