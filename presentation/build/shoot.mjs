#!/usr/bin/env node
/**
 * shoot.mjs — Aura AI prezentácia: verifikácia + 31 PNG + PDF
 * Vlastník: A4. Nepíše nič iné než do <vystupny-adresar>.
 *
 * Použitie:
 *   node shoot.mjs <cesta-k-html> <vystupny-adresar> [prepínače]
 *
 * Prepínače:
 *   --rename-actual   stavové PNG konfigurátora pomenuje podľa skutočného #oCap
 *                     (napr. 10-konfigurator-B-34k.png) namiesto pevných názvov
 *                     z PLAN.md §4. Pozor: potom treba prepísať INDEX.md aj asana.json.
 *   --no-pdf          preskočí fázu C
 *   --keep-going      nenulový exit kód sa potlačí (len na ladenie, NEPOUŽÍVAŤ v CI)
 *
 * Výstup:
 *   <vystupny-adresar>/screens/*.png        31 PNG, 3840×2160
 *   <vystupny-adresar>/aura-ai-prezentacia.pdf
 *
 * Prostredie: Chromium je predinštalované v /opt/pw-browsers/chromium.
 * NIKDY nespúšťať `playwright install`.
 */

import { existsSync, mkdirSync, readFileSync, statSync, openSync, readSync, closeSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve, join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';

/* ─────────────────────────────────────────────────────────────── konštanty */

const EXEC = '/opt/pw-browsers/chromium';
process.env.PLAYWRIGHT_BROWSERS_PATH ||= '/opt/pw-browsers';

/** 13 slajdov podľa CONTRACT.md §2 — poradie a slugy sú pevné. */
const SLIDES = [
  { n: '01', slug: 'hero',          title: 'Vlastné AI jadro. Naše dáta zostanú doma.' },
  { n: '02', slug: 'ai-dnes',       title: 'Ako AI používame už dnes — MCP a Hades' },
  { n: '03', slug: 'architektura',  title: 'Jedno jadro, tri izolované ruky' },
  { n: '04', slug: 'predapo',       title: 'Pred a po — prepnite stav' },
  { n: '05', slug: 'bezpecnost',    title: 'Bezpečnosť a hranica dát — štyri zóny' },
  { n: '06', slug: 'trh-ceny',      title: 'Pamäť je nedostatkový tovar' },
  { n: '07', slug: 'hardware',      title: 'Hardware — čo sme posúdili a čo prešlo' },
  { n: '08', slug: 'capex',         title: 'Tri scenáre CapEx: 17 · 33 · 54 tisíc €' },
  { n: '09', slug: 'tco',           title: 'TCO na 3 roky — a prečo prenájom nie je alternatíva' },
  { n: '10', slug: 'konfigurator',  title: 'Poskladajte si zostavu' },
  { n: '11', slug: 'harmonogram',   title: '26 týždňov, 11 brán, žiadne skratky' },
  { n: '12', slug: 'testy-rollout', title: 'Od testov k rolloutu' },
  { n: '13', slug: 'rozhodnutia',   title: 'Najbližších 45 dní rozhodne o celej investícii' },
];

/** Index slajdu (0-based) s interaktívnym nákresom Pred/Po a s konfigurátorom. */
const IX_SLIDE = 3;   // s04
const CFG_SLIDE = 9;  // s10

/**
 * Tri scenáre konfigurátora.
 *   preset  — zostava zo slajdu 08 prenesená do ovládačov slajdu 10 (+ celá infra zapnutá)
 *   target  — hlavička slajdu 08 (Tri scenáre CapEx: 17 · 33 · 54 tisíc €)
 *   expect  — #oCap, ktorý pre tento preset vydá cenový model zo zdroja
 *             (_source-v2_1.html, blok „skladatelny hardware"). Ak sa nezhoduje,
 *             niekto zmenil číslo v modeli → CONTRACT §6.1 „Čísla sú nemenné" → chyba.
 *
 * Prečo expect ≠ target: infra blok konfigurátora je 4 840 € (UPS 900 + 10GbE 700 +
 * NAS 2 700 + off-site 540), kým stack na slajde 08 počíta s ~3 500 €. Slajd 10 to sám
 * priznáva: „konfigurátor je nástroj na rozhovor, nie zdroj pravdy".
 * Názvy súborov preto držia označenie scenára zo slajdu 08 (17k/33k/54k);
 * prepínač --rename-actual ich prepne na skutočnú hodnotu.
 */
const SCENARIOS = [
  { id: 'A', label: '17k', target: 16900, expect: 18059, preset: { gpu: 'basic', plat: 'lean',  mini: 'basic', cnt: '3' } },
  { id: 'B', label: '33k', target: 32900, expect: 34779, preset: { gpu: 'std',   plat: 'solid', mini: 'std',   cnt: '3' } },
  { id: 'C', label: '54k', target: 54300, expect: 54638, preset: { gpu: 'prem',  plat: 'max',   mini: 'prem',  cnt: '3' } },
];

const SHOT_W = 1920, SHOT_H = 1080, DSF = 2;
const MOB_W = 390, MOB_H = 844;
const ANIM_MS = 700;

/* ─────────────────────────────────────────────────────────────── evidencia */

const errors = [];   // verifikačné zlyhania → nenulový exit
const warns = [];    // upozornenia → exit 0
const jsErrors = []; // pageerror + console.error
const shots = [];    // { file, w, h }
let phase = 'init';

const fail = (m) => { errors.push(`[${phase}] ${m}`); console.log(`  ✗ ${m}`); };
const warn = (m) => { warns.push(`[${phase}] ${m}`); console.log(`  ! ${m}`); };
const ok   = (m) => console.log(`  ✓ ${m}`);
const head = (m) => { console.log(`\n${m}`); };

/* ────────────────────────────────────────────────────── načítanie playwrightu */

async function loadChromium() {
  const tried = [];
  const cands = ['playwright', 'playwright-core'];
  try {
    const root = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
    if (root) cands.push(join(root, 'playwright', 'index.js'), join(root, 'playwright-core', 'index.js'));
  } catch { /* npm nemusí byť v PATH */ }
  for (const p of (process.env.NODE_PATH || '').split(':').filter(Boolean)) {
    cands.push(join(p, 'playwright', 'index.js'), join(p, 'playwright-core', 'index.js'));
  }
  cands.push('/opt/node22/lib/node_modules/playwright/index.js');

  for (const c of cands) {
    const abs = c.startsWith('/');
    if (abs && !existsSync(c)) { tried.push(`${c} (neexistuje)`); continue; }
    try {
      const m = await import(abs ? pathToFileURL(c).href : c);
      const chromium = m.chromium ?? m.default?.chromium;
      if (chromium) return { chromium, from: c };
      tried.push(`${c} (bez exportu chromium)`);
    } catch (e) {
      tried.push(`${c} (${e.code || String(e.message).split('\n')[0]})`);
    }
  }
  throw new Error('Playwright sa nepodarilo načítať. Skúšané:\n  ' + tried.join('\n  '));
}

/* ─────────────────────────────────────────────────────────────── pomocníci */

const sleep = (p, ms) => p.waitForTimeout(ms);

async function fontsReady(page) {
  try { await page.evaluate(() => document.fonts && document.fonts.ready.then(() => true)); }
  catch { /* fonts API nemusí byť */ }
}

async function safeClick(handle, label) {
  try { await handle.click({ timeout: 1500 }); return true; }
  catch {
    try { await handle.click({ timeout: 1500, force: true }); warn(`klik vynútený (force): ${label}`); return true; }
    catch (e2) { fail(`klik zlyhal: ${label} — ${String(e2.message).split('\n')[0]}`); return false; }
  }
}

/** Klik + kontrola, že tým nevznikla JS chyba. */
async function clickAndCheck(page, handle, label) {
  const before = jsErrors.length;
  const clicked = await safeClick(handle, label);
  await sleep(page, 50);
  if (jsErrors.length > before) {
    fail(`po kliku „${label}" vznikla JS chyba: ${jsErrors[jsErrors.length - 1]}`);
  }
  return clicked;
}

async function getMode(page) {
  return page.evaluate(() => document.documentElement.getAttribute('data-mode') || 'deck');
}
async function getTheme(page) {
  return page.evaluate(() => document.documentElement.getAttribute('data-theme') || 'dark');
}

async function setTheme(page, theme) {
  if (await getTheme(page) === theme) return true;
  const b = await page.$('#th');
  if (!b) { fail('#th (prepínač témy) neexistuje — tému nastavujem priamo na <html>'); await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme); return false; }
  await clickAndCheck(page, b, '#th');
  await sleep(page, 120);
  if (await getTheme(page) !== theme) { fail(`#th neprepol tému na "${theme}"`); return false; }
  return true;
}

async function setMode(page, mode) {
  if (await getMode(page) === mode) return true;
  const b = await page.$('#md');
  if (!b) { fail('#md (prepínač Deck/Dokument) neexistuje — režim sa nedá prepnúť'); return false; }
  await clickAndCheck(page, b, '#md');
  await sleep(page, 250);
  if (await getMode(page) !== mode) { fail(`#md neprepol režim na "${mode}"`); return false; }
  return true;
}

async function goSlide(page, i) {
  const viaApi = await page.evaluate((n) => {
    if (window.DECK && typeof window.DECK.go === 'function') { window.DECK.go(n); return true; }
    return false;
  }, i);
  if (!viaApi) {
    const dots = await page.$$('#dots span');
    if (dots[i]) await dots[i].click({ force: true, timeout: 1500 }).catch(() => {});
    else return false;
  }
  await sleep(page, 140);
  return true;
}

async function nanCheck(page, ctx) {
  const hit = await page.evaluate(() => {
    const t = document.body.innerText || '';
    if (/NaN/.test(t)) return t.split('\n').find(l => /NaN/.test(l)) || 'NaN';
    const ids = ['oCap', 'oTco', 'oMon', 'oLines', 'oFlags', 'vE', 'vH', 'vC', 'vL', 'vI', 'vR', 'ct'];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el && /NaN/.test(el.textContent || '')) return `#${id}: ${el.textContent.trim().slice(0, 80)}`;
    }
    return null;
  });
  if (hit) fail(`NaN v texte (${ctx}): ${String(hit).trim().slice(0, 120)}`);
}

function pngSize(p) {
  try {
    const fd = openSync(p, 'r');
    const b = Buffer.alloc(24);
    readSync(fd, b, 0, 24, 0);
    closeSync(fd);
    if (b.readUInt32BE(0) !== 0x89504e47) return null;
    return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  } catch { return null; }
}

async function shoot(page, dir, file) {
  const path = join(dir, file);
  await page.screenshot({ path, animations: 'disabled' });
  const sz = pngSize(path);
  if (!sz) { fail(`PNG ${file} sa nedá prečítať`); return; }
  if (sz.w !== SHOT_W * DSF || sz.h !== SHOT_H * DSF) {
    warn(`PNG ${file} má ${sz.w}×${sz.h}, očakávané ${SHOT_W * DSF}×${SHOT_H * DSF}`);
  }
  shots.push({ file, ...sz });
  console.log(`  → ${file}  ${sz.w}×${sz.h}`);
}

/* ─────────────────────────────────────────────────────────────── FÁZA A */

async function phaseA(page) {
  phase = 'A/verifikácia';
  head('── FÁZA A · verifikácia ─────────────────────────────────────────');

  /* A1 — 13 slajdov a počítadlo */
  const nS = await page.evaluate(() => document.querySelectorAll('.s').length);
  if (nS === 13) ok('presne 13 elementov .s');
  else fail(`.s je ${nS}, očakávaných 13`);

  const ct = await page.evaluate(() => {
    const el = document.getElementById('ct');
    return el ? (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim() : null;
  });
  if (ct == null) fail('#ct neexistuje');
  else if (/\/\s*13\b/.test(ct)) ok(`#ct = "${ct}"`);
  else fail(`#ct = "${ct}" — chýba "/ 13"`);

  /* A2 — DECK API (kontrakt A2↔A3) */
  const deck = await page.evaluate(() => {
    if (!window.DECK) return null;
    return { count: typeof window.DECK.count === 'function' ? window.DECK.count() : null, go: typeof window.DECK.go === 'function' };
  });
  if (!deck) fail('window.DECK neexistuje (CONTRACT §5)');
  else {
    if (deck.count !== 13) fail(`DECK.count() = ${deck.count}, očakávaných 13`);
    if (!deck.go) fail('DECK.go nie je funkcia');
    if (deck.count === 13 && deck.go) ok('window.DECK API prítomné');
  }

  /* A3 — žiadny localStorage/sessionStorage (Aura tvrdé pravidlo) */
  const store = await page.evaluate(() => {
    try { return { ls: localStorage.length, ss: sessionStorage.length }; } catch { return { ls: 0, ss: 0 }; }
  });
  if (store.ls || store.ss) fail(`použitý storage — localStorage:${store.ls} sessionStorage:${store.ss}`);
  else ok('žiadny localStorage / sessionStorage');

  /* A4 — globálne ovládanie: #gl / #gx / #th / #md / #dots / #nav .pill / #top .pill */
  const gl = await page.$('#gl');
  if (!gl) fail('#gl (slovníček) neexistuje');
  else {
    await clickAndCheck(page, gl, '#gl (otvoriť slovníček)');
    await sleep(page, 200);
    const open = await page.evaluate(() => {
      const gv = document.getElementById('gv');
      return !!gv && (gv.classList.contains('on') || getComputedStyle(gv).display !== 'none');
    });
    if (!open) fail('#gl neotvoril slovníček #gv');
    const gx = await page.$('#gx');
    if (!gx) fail('#gx (zavrieť slovníček) neexistuje');
    else await clickAndCheck(page, gx, '#gx (zavrieť slovníček)');
    await page.keyboard.press('Escape');
    await sleep(page, 150);
    const stillOpen = await page.evaluate(() => {
      const gv = document.getElementById('gv');
      return !!gv && gv.classList.contains('on');
    });
    if (stillOpen) fail('slovníček #gv sa nezavrel ani po #gx ani po Escape');
    else ok('#gl → #gv → #gx / Escape funguje');
  }

  const topPills = await page.$$('#top .pill, #nav .pill');
  if (!topPills.length) fail('žiadny .pill v #top ani #nav');
  for (const p of topPills) {
    const id = await p.evaluate(el => el.id || '');
    const label = await p.evaluate(el => '#' + (el.id || '?') + ' .pill „' + (el.textContent || '').trim().slice(0, 24) + '"');
    // #gl/#gx sú otestované vyššie, #md a #th majú vlastný test — klik na ne tu
    // by nechal stránku v inom režime a schoval #dots a #nav.
    if (['gl', 'gx', 'md', 'th'].includes(id)) continue;
    await clickAndCheck(page, p, label);
  }
  ok(`kliknuté všetky .pill v #top a #nav (${topPills.length})`);

  // #md a #th tam a späť — stránka musí skončiť v deck × dark
  await setMode(page, 'doc'); await setMode(page, 'deck');
  await setTheme(page, 'light'); await setTheme(page, 'dark');
  if (await getMode(page) !== 'deck') fail('po teste #md stránka nezostala v režime deck');
  if (await getTheme(page) !== 'dark') fail('po teste #th stránka nezostala v téme dark');
  ok('#md a #th prepínajú tam aj späť');

  const dots = await page.$$('#dots span');
  if (dots.length !== 13) fail(`#dots span je ${dots.length}, očakávaných 13`);
  for (let i = 0; i < dots.length; i++) await clickAndCheck(page, dots[i], `#dots span[${i + 1}]`);
  if (dots.length) ok(`kliknuté všetky #dots span (${dots.length})`);

  /* A5 — interaktívne prvky vnútri každého slajdu */
  const slides = await page.$$('.s');
  let cTt = 0, cSeg = 0, cOpt = 0, cHot = 0;
  for (let i = 0; i < slides.length; i++) {
    await goSlide(page, i);
    const nm = `s${SLIDES[i] ? SLIDES[i].n : String(i + 1).padStart(2, '0')}`;

    for (const h of await slides[i].$$('.seg button')) {
      const t = await h.evaluate(el => (el.textContent || '').trim().slice(0, 20));
      await clickAndCheck(page, h, `${nm} .seg button „${t}"`); cSeg++;
    }
    for (const h of await slides[i].$$('.opts button')) {
      const t = await h.evaluate(el => (el.getAttribute('data-v') || '') + ' ' + (el.textContent || '').trim().slice(0, 16));
      await clickAndCheck(page, h, `${nm} .opts button [${t}]`); cOpt++;
    }
    for (const h of await slides[i].$$('.ix .hot')) {
      const t = await h.evaluate(el => el.getAttribute('data-k') || '?');
      await clickAndCheck(page, h, `${nm} .ix .hot [${t}]`); cHot++;
    }
    for (const h of await slides[i].$$('.tt')) {
      const t = await h.evaluate(el => el.getAttribute('data-t') || (el.textContent || '').trim().slice(0, 18));
      await clickAndCheck(page, h, `${nm} .tt [${t}]`); cTt++;
      await page.keyboard.press('Escape'); // tooltip prekrýva ďalší cieľ
      await sleep(page, 20);
    }
    await nanCheck(page, `${nm} po klikoch`);
  }
  if (!cTt) fail('nenašiel sa ani jeden .tt (tooltip) — očakávaných ~12 pojmov');
  if (!cSeg) fail('nenašiel sa ani jeden .seg button');
  if (!cOpt) fail('nenašiel sa ani jeden .opts button (konfigurátor)');
  if (!cHot) fail('nenašiel sa ani jeden .ix .hot (nákres Pred/Po)');
  ok(`interaktívne prvky: ${cTt}× .tt · ${cSeg}× .seg button · ${cOpt}× .opts button · ${cHot}× .ix .hot`);

  /* A6 — konfigurátor: slidery na min a max, kontrola NaN */
  await goSlide(page, CFG_SLIDE);
  const ranges = await page.$$('.cfg input[type="range"], #s10 input[type="range"]');
  if (!ranges.length) fail('konfigurátor: žiadny input[type=range]');
  for (const pos of ['min', 'max', 'reset']) {
    for (const r of ranges) {
      const before = jsErrors.length;
      const id = await r.evaluate((el, p) => {
        if (!el.dataset.orig) el.dataset.orig = el.value;
        el.value = p === 'min' ? el.min : p === 'max' ? el.max : el.dataset.orig;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return el.id || el.name || '?';
      }, pos);
      if (jsErrors.length > before) fail(`slider #${id} na ${pos} vyvolal JS chybu: ${jsErrors[jsErrors.length - 1]}`);
    }
    await sleep(page, 120);
    await nanCheck(page, `slidery na ${pos}`);
  }
  if (ranges.length) ok(`slidery (${ranges.length}) prešli min → max → default bez NaN`);

  /* A7 — všetky 4 kombinácie režim × téma */
  for (const mode of ['deck', 'doc']) {
    for (const theme of ['dark', 'light']) {
      const before = jsErrors.length;
      await setMode(page, mode);
      await setTheme(page, theme);
      await sleep(page, 300);
      const st = await page.evaluate(() => ({
        mode: document.documentElement.getAttribute('data-mode') || 'deck',
        theme: document.documentElement.getAttribute('data-theme') || 'dark',
        visible: [...document.querySelectorAll('.s')].filter(s => s.getBoundingClientRect().height > 0).length,
      }));
      if (st.mode !== mode || st.theme !== theme) fail(`kombinácia ${mode}×${theme} sa nenastavila (je ${st.mode}×${st.theme})`);
      else if (!st.visible) fail(`kombinácia ${mode}×${theme}: žiadny .s nemá nenulovú výšku`);
      else if (jsErrors.length > before) fail(`kombinácia ${mode}×${theme} vyvolala JS chybu`);
      else ok(`kombinácia ${mode} × ${theme} — ${st.visible} viditeľných .s`);
      await nanCheck(page, `${mode}×${theme}`);
    }
  }

  /* A8 — SVG sa vykreslili (v doc režime je viditeľné všetko) */
  await setMode(page, 'doc');
  await setTheme(page, 'dark');
  await sleep(page, 400);
  const svg = await page.evaluate(() => {
    const out = { total: 0, zero: [] };
    document.querySelectorAll('svg').forEach((s, i) => {
      out.total++;
      const r = s.getBoundingClientRect();
      if (!(r.width > 0 && r.height > 0)) {
        const sec = s.closest('.s');
        out.zero.push(`svg[${i}] v ${sec ? (sec.id || 'sekcii') : 'dokumente'} (${Math.round(r.width)}×${Math.round(r.height)})`);
      }
    });
    return out;
  });
  if (!svg.total) fail('v dokumente nie je ani jeden <svg>');
  else if (svg.zero.length) svg.zero.forEach(z => fail(`SVG s nulovou veľkosťou: ${z}`));
  else ok(`všetkých ${svg.total} <svg> má nenulovú veľkosť`);
  await nanCheck(page, 'doc režim, celý dokument');

  /* A9 — Tab audit v oboch režimoch */
  for (const mode of ['deck', 'doc']) {
    await setMode(page, mode);
    await sleep(page, 250);
    await tabAudit(page, mode);
  }

  /* A10 — 390×844 bez horizontálneho scrollu */
  await page.setViewportSize({ width: MOB_W, height: MOB_H });
  await sleep(page, 250);
  for (const mode of ['deck', 'doc']) {
    await setMode(page, mode);
    await sleep(page, 250);
    if (mode === 'deck') {
      for (let i = 0; i < 13; i++) {
        await goSlide(page, i);
        await sleep(page, 120);
        const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
        if (m.sw > m.cw + 1) fail(`390 px / deck / s${SLIDES[i].n}: scrollWidth ${m.sw} > clientWidth ${m.cw}`);
      }
      ok('390 px / deck — 13 slajdov skontrolovaných');
    } else {
      const m = await page.evaluate(() => {
        window.scrollTo(0, 0);
        return { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth };
      });
      if (m.sw > m.cw + 1) fail(`390 px / doc: scrollWidth ${m.sw} > clientWidth ${m.cw}`);
      else ok(`390 px / doc — scrollWidth ${m.sw} ≤ clientWidth ${m.cw}`);
    }
  }

  /* späť do východiskového stavu */
  await page.setViewportSize({ width: SHOT_W, height: SHOT_H });
  await setMode(page, 'deck');
  await setTheme(page, 'dark');
  await goSlide(page, 0);
  await sleep(page, 300);
}

async function tabAudit(page, mode) {
  await page.evaluate(() => { const a = document.activeElement; if (a && a.blur) a.blur(); });
  const badPaths = new Map();
  const seen = new Set();
  let bodyHits = 0, steps = 0;
  const MAX = 400;
  for (let i = 0; i < MAX; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body || el === document.documentElement) return null;
      const cs = getComputedStyle(el);
      let p = el.tagName.toLowerCase();
      if (el.id) p += '#' + el.id;
      const cn = typeof el.className === 'string' ? el.className : (el.className && el.className.baseVal) || '';
      if (cn) p += '.' + String(cn).trim().split(/\s+/).slice(0, 2).join('.');
      const k = el.getAttribute('data-k') || el.getAttribute('data-t') || el.getAttribute('data-v');
      if (k) p += `[${k}]`;
      return { p, os: cs.outlineStyle, ow: cs.outlineWidth, bs: cs.boxShadow !== 'none' };
    });
    if (!info) { if (++bodyHits >= 2) break; continue; }
    bodyHits = 0;
    steps++;
    if (seen.has(info.p) && seen.size > 5 && i > 40) { /* pokračuj, len nezapisuj duplikát */ }
    seen.add(info.p);
    if (info.os === 'none' || info.ow === '0px') {
      if (!badPaths.has(info.p)) badPaths.set(info.p, info);
    }
  }
  if (!steps) { fail(`Tab audit (${mode}): Tabom sa nedá zamerať ani jeden prvok`); return; }
  if (badPaths.size) {
    for (const [p, info] of badPaths) {
      fail(`Tab audit (${mode}): ${p} — outline-style:${info.os} outline-width:${info.ow}${info.bs ? ' (má box-shadow, ale kontrakt žiada outline)' : ''}`);
    }
  } else {
    ok(`Tab audit (${mode}): ${steps} zastavení, ${seen.size} unikátnych prvkov — všetky majú viditeľný outline`);
  }
}

/* ─────────────────────────────────────────────────────────────── FÁZA B */

async function phaseB(page, dir, renameActual) {
  phase = 'B/PNG';
  head('── FÁZA B · 31 PNG (1920×1080 @2× → 3840×2160) ──────────────────');

  await setMode(page, 'deck');
  await fontsReady(page);

  /* 26 PNG — 13 slajdov × dark/light */
  for (const theme of ['dark', 'light']) {
    await setTheme(page, theme);
    await sleep(page, 300);
    for (let i = 0; i < SLIDES.length; i++) {
      await goSlide(page, i);
      await fontsReady(page);
      await sleep(page, ANIM_MS);
      await nanCheck(page, `snímanie s${SLIDES[i].n} ${theme}`);
      await shoot(page, dir, `${SLIDES[i].n}-${SLIDES[i].slug}-${theme}.png`);
    }
  }

  /* 5 stavových PNG — dark téma */
  await setTheme(page, 'dark');
  await sleep(page, 200);

  /* 04 · nákres Pred/Po */
  await goSlide(page, IX_SLIDE);
  await sleep(page, ANIM_MS);
  const seg = await page.$('#ixseg');
  if (!seg) {
    fail('#ixseg neexistuje — stavové PNG 04-predapo-dnes/ciel sa nedajú spraviť');
  } else {
    const eng = await page.$('.ix .hot[data-k="eng"]');
    if (eng) await clickAndCheck(page, eng, 's04 .hot[eng] (naplnenie detail panelu)');
    else warn('.ix .hot[data-k="eng"] neexistuje — detail panel zostane prázdny');
    for (const [st, name] of [['now', '04-predapo-dnes.png'], ['tg', '04-predapo-ciel.png']]) {
      const b = await page.$(`#ixseg button[data-st="${st}"]`);
      if (!b) { fail(`#ixseg button[data-st="${st}"] neexistuje — ${name} sa nedá spraviť`); continue; }
      await clickAndCheck(page, b, `#ixseg [${st}]`);
      await fontsReady(page);
      await sleep(page, ANIM_MS);
      await nanCheck(page, `stav ${st}`);
      await shoot(page, dir, name);
    }
    const back = await page.$('#ixseg button[data-st="now"]');
    if (back) await back.click({ force: true }).catch(() => {});
  }

  /* 10 · konfigurátor A / B / C */
  await goSlide(page, CFG_SLIDE);
  await sleep(page, ANIM_MS);
  const capexReport = [];
  for (const sc of SCENARIOS) {
    const applied = await applyPreset(page, sc.preset);
    if (!applied) { fail(`scenár ${sc.id}: zostavu sa nepodarilo nastaviť — PNG preskočené`); continue; }
    await ensureInfraAllOn(page);
    await sleep(page, 250);
    const out = await page.evaluate(() => {
      const g = (id) => { const e = document.getElementById(id); return e ? (e.textContent || '').trim() : null; };
      return { cap: g('oCap'), tco: g('oTco'), mon: g('oMon') };
    });
    const capNum = out.cap ? Number(String(out.cap).replace(/[^\d]/g, '')) : NaN;
    let label = sc.label;
    if (!Number.isFinite(capNum)) {
      fail(`scenár ${sc.id}: #oCap sa nedá prečítať ("${out.cap}")`);
    } else {
      const actualK = `${Math.round(capNum / 1000)}k`;
      const delta = capNum - sc.target;
      capexReport.push(`${sc.id}: #oCap ${out.cap} (slajd 08: ${sc.target} € · Δ ${delta > 0 ? '+' : ''}${delta} €) · TCO ${out.tco} · ${out.mon}/mes.`);
      if (capNum !== sc.expect) {
        fail(`scenár ${sc.id}: #oCap = ${capNum} €, cenový model zdroja dáva ${sc.expect} €. `
          + `Niektoré číslo v konfigurátore sa zmenilo (CONTRACT §6.1) — alebo sa zmenil preset/infra. Skontrolovať deck.js.`);
      }
      if (Math.abs(delta) > 2500) {
        warn(`scenár ${sc.id}: #oCap ${out.cap} sa líši od hlavičky slajdu 08 (${sc.target} €) o ${delta} €. Skutočná hodnota = ${actualK}; názov súboru drží označenie scenára — pozri --rename-actual.`);
      }
      if (renameActual && actualK !== sc.label) {
        label = actualK;
        warn(`--rename-actual: scenár ${sc.id} sa uloží ako ...-${label}.png — treba prepísať INDEX.md aj asana.json`);
      }
    }
    await fontsReady(page);
    await sleep(page, ANIM_MS);
    await nanCheck(page, `konfigurátor ${sc.id}`);
    await shoot(page, dir, `10-konfigurator-${sc.id}-${label}.png`);
  }
  if (capexReport.length) { head('  Konfigurátor — skutočné výstupy:'); capexReport.forEach(r => console.log(`    ${r}`)); }

  if (shots.length !== 31) fail(`nasnímaných ${shots.length} PNG, očakávaných 31`);
  else ok('31 PNG hotových');
}

async function applyPreset(page, preset) {
  let allOk = true;
  for (const [grp, v] of Object.entries(preset)) {
    const b = await page.$(`.opts[data-grp="${grp}"] button[data-v="${v}"]`);
    if (!b) { fail(`konfigurátor: .opts[data-grp="${grp}"] button[data-v="${v}"] neexistuje`); allOk = false; continue; }
    await clickAndCheck(page, b, `.opts[${grp}]=${v}`);
    await sleep(page, 60);
  }
  // gpu=prem si v zdroji sám prepne platformu na max → dorovnaj podľa presetu
  if (preset.plat) {
    const b = await page.$(`.opts[data-grp="plat"] button[data-v="${preset.plat}"]`);
    if (b) {
      const pressed = await b.evaluate(el => el.getAttribute('aria-pressed') === 'true');
      if (!pressed) await clickAndCheck(page, b, `.opts[plat]=${preset.plat} (dorovnanie)`);
    }
  }
  return allOk;
}

async function ensureInfraAllOn(page) {
  const btns = await page.$$('.opts[data-grp="infra"] button');
  if (!btns.length) { warn('konfigurátor: .opts[data-grp="infra"] neexistuje'); return; }
  for (const b of btns) {
    const pressed = await b.evaluate(el => el.getAttribute('aria-pressed') === 'true');
    if (!pressed) {
      const v = await b.evaluate(el => el.getAttribute('data-v'));
      await clickAndCheck(page, b, `.opts[infra]=${v} (zapnutie)`);
    }
  }
}

/* ─────────────────────────────────────────────────────────────── FÁZA C */

async function phaseC(page, outRoot) {
  phase = 'C/PDF';
  head('── FÁZA C · PDF (A4 landscape, print CSS) ───────────────────────');
  const path = join(outRoot, 'aura-ai-prezentacia.pdf');
  await page.emulateMedia({ media: 'print' });
  await sleep(page, 400);
  await fontsReady(page);
  try {
    await page.pdf({ format: 'A4', landscape: true, printBackground: true, path });
  } catch (e) {
    fail(`page.pdf zlyhalo: ${String(e.message).split('\n')[0]}`);
    await page.emulateMedia({ media: null });
    return null;
  }
  await page.emulateMedia({ media: null });

  const size = statSync(path).size;
  const kb = Math.round(size / 1024);
  console.log(`  → aura-ai-prezentacia.pdf  ${kb} kB`);
  if (size < 200 * 1024) warn(`PDF má len ${kb} kB — podozrivo málo na 13 slajdov s grafmi. Skontrolovať @media print.`);

  // Počet strán bez pdf-lib: heuristika nad surovým streamom.
  const raw = readFileSync(path).toString('latin1');
  const byType = (raw.match(/\/Type\s*\/Page(?![sA-Za-z])/g) || []).length;
  const counts = [...raw.matchAll(/\/Count\s+(\d+)/g)].map(m => +m[1]);
  const byCount = counts.length ? Math.max(...counts) : null;
  const pages = byType || byCount;
  if (!pages) warn('počet strán PDF sa nedá určiť z hlavičiek (stream je komprimovaný) — skontrolovať ručne, očakávaných 13');
  else if (pages !== 13) fail(`PDF má ${pages} strán (/Type /Page: ${byType}, /Count: ${byCount ?? '—'}), očakávaných 13. `
    + `Najčastejšia príčina: body{overflow:hidden} alebo .s{position:absolute} neprebité v @media print (PLAN §2.4).`);
  else ok('PDF má 13 strán');
  return { path, kb, pages };
}

/* ─────────────────────────────────────────────────────────────── main */

async function main() {
  const argv = process.argv.slice(2);
  const flags = new Set(argv.filter(a => a.startsWith('--')));
  const pos = argv.filter(a => !a.startsWith('--'));

  if (flags.has('--help') || pos.length < 2) {
    console.log('Použitie: node shoot.mjs <cesta-k-html> <vystupny-adresar> [--rename-actual] [--no-pdf] [--keep-going]');
    process.exit(flags.has('--help') ? 0 : 2);
  }
  const htmlPath = resolve(pos[0]);
  const outRoot = resolve(pos[1]);
  if (!existsSync(htmlPath)) { console.error(`CHYBA: HTML neexistuje: ${htmlPath}`); process.exit(2); }
  const screensDir = join(outRoot, 'screens');
  mkdirSync(screensDir, { recursive: true });

  console.log(`Aura AI · shoot.mjs`);
  console.log(`  HTML   : ${htmlPath}`);
  console.log(`  Výstup : ${outRoot}`);
  console.log(`  PNG    : ${screensDir}`);

  const { chromium, from } = await loadChromium();
  console.log(`  Playwright: ${from}`);

  const launchOpts = { headless: true, args: ['--force-color-profile=srgb', '--font-render-hinting=none'] };
  if (existsSync(EXEC)) launchOpts.executablePath = EXEC;
  else warn(`${EXEC} neexistuje — spúšťam Chromium z PLAYWRIGHT_BROWSERS_PATH (playwright install NESPÚŠŤAŤ)`);

  let browser;
  try {
    browser = await chromium.launch(launchOpts);
  } catch (e) {
    if (launchOpts.executablePath) {
      console.log(`  ! launch s executablePath zlyhal (${String(e.message).split('\n')[0]}) — skúšam bez neho`);
      delete launchOpts.executablePath;
      browser = await chromium.launch(launchOpts);
    } else throw e;
  }
  console.log(`  Chromium: ${browser.version()}`);

  const ctx = await browser.newContext({
    viewport: { width: SHOT_W, height: SHOT_H },
    deviceScaleFactor: DSF,
    locale: 'sk-SK',
    timezoneId: 'Europe/Bratislava',
    colorScheme: 'dark',
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(6000);

  const softNet = /favicon|fonts\.googleapis|fonts\.gstatic|net::ERR_|Failed to load resource|ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED|ERR_PROXY/i;
  page.on('pageerror', (e) => {
    const m = `pageerror: ${e.message.split('\n')[0]}`;
    jsErrors.push(m);
    console.log(`  ✗ ${m}`);
  });
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const t = msg.text();
    if (softNet.test(t)) { warns.push(`[console] sieť/asset: ${t.slice(0, 140)}`); return; }
    const m = `console.error: ${t.split('\n')[0].slice(0, 200)}`;
    jsErrors.push(m);
    console.log(`  ✗ ${m}`);
  });
  page.on('requestfailed', (r) => {
    warns.push(`[network] ${r.method()} ${r.url().slice(0, 120)} — ${r.failure()?.errorText || 'zlyhalo'}`);
  });

  let pdf = null;
  try {
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load', timeout: 30000 });
    await fontsReady(page);
    await sleep(page, 600);

    await phaseA(page);
    await phaseB(page, screensDir, flags.has('--rename-actual'));
    if (!flags.has('--no-pdf')) pdf = await phaseC(page, outRoot);
    else console.log('\n(--no-pdf) fáza C preskočená');
  } catch (e) {
    fail(`neošetrená výnimka: ${e.stack || e.message}`);
  } finally {
    await ctx.close().catch(() => {});
    await browser.close().catch(() => {});
  }

  /* ── zhrnutie ── */
  phase = 'zhrnutie';
  const allErr = [...errors, ...jsErrors.map(m => `[JS] ${m}`)];
  head('════════════════════════ ZHRNUTIE ════════════════════════');
  console.log(`  JS chyby (pageerror + console.error) : ${jsErrors.length}`);
  console.log(`  Verifikačné zlyhania                 : ${errors.length}`);
  console.log(`  Upozornenia                          : ${warns.length}`);
  console.log(`  PNG                                  : ${shots.length} / 31`);
  console.log(`  PNG adresár                          : ${screensDir}`);
  console.log(`  PDF                                  : ${pdf ? `${pdf.path} (${pdf.kb} kB, strán: ${pdf.pages ?? '?'})` : '—'}`);

  if (warns.length) {
    head('  Upozornenia:');
    const uniq = [...new Set(warns)];
    uniq.slice(0, 40).forEach(w => console.log(`    ! ${w}`));
    if (uniq.length > 40) console.log(`    … a ďalších ${uniq.length - 40}`);
  }
  if (allErr.length) {
    head('  CHYBY:');
    allErr.forEach(e => console.log(`    ✗ ${e}`));
    console.log(`\n  NEPREŠLO — ${allErr.length} chýb.`);
    if (!flags.has('--keep-going')) process.exit(1);
  } else {
    console.log('\n  VŠETKO PREŠLO.');
  }
}

main().catch((e) => {
  console.error(`\nFATÁLNA CHYBA: ${e.stack || e.message}`);
  process.exit(1);
});
