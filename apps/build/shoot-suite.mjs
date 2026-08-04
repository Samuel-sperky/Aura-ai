#!/usr/bin/env node
/**
 * shoot-suite.mjs — PNG všetkých obrazoviek balíka apps/aura-suite/
 *
 *   node shoot-suite.mjs [appka1 appka2 …]      (bez argumentu = všetky)
 *
 * Pre každú appku a každú obrazovku: tmavá téma · svetlá téma · EN · mobil 390 px.
 * Navyše interakčné stavy (import, report, konektor, chat, ⌘K) v tmavej téme.
 * Výstup: aura-suite/<appka>/screens/*.png  +  aura-suite/index → screens rozcestníka.
 *
 * Chromium je predinštalovaný v /opt/pw-browsers — `playwright install` sa nespúšťa.
 */
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dir = dirname(fileURLToPath(import.meta.url));
process.env.PLAYWRIGHT_BROWSERS_PATH ||= '/opt/pw-browsers';
const SUITE = resolve(__dir, '../aura-suite');
const W = 1600, H = 1000, DSF = 2, MW = 390, MH = 844, ANIM = 380;
const only = process.argv.slice(2);
const errors = [], jsErrors = [];
let shots = 0;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ok = m => console.log('  ✓ ' + m);
const fail = m => { errors.push(m); console.log('  ✗ ' + m); };

async function loadChromium(){
  const c = ['/opt/node22/lib/node_modules/playwright/index.js', 'playwright', 'playwright-core'];
  try { const r = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
    if (r) c.unshift(join(r, 'playwright', 'index.js')); } catch {}
  for (const p of c){
    const abs = p.startsWith('/');
    if (abs && !existsSync(p)) continue;
    try { const m = await import(abs ? pathToFileURL(p).href : p);
      const ch = m.chromium ?? m.default?.chromium; if (ch) return ch; } catch {}
  }
  throw new Error('Playwright sa nepodarilo načítať.');
}

async function main(){
  if (!existsSync(SUITE)) { console.error('Chýba ' + SUITE + ' — spusti najprv assemble.mjs'); process.exit(2); }
  const apps = readdirSync(SUITE).filter(d => statSync(join(SUITE, d)).isDirectory() && d !== '_zip' && !d.startsWith('_'))
    .filter(d => existsSync(join(SUITE, d, 'index.html')))
    .filter(d => !only.length || only.includes(d));
  const chromium = await loadChromium();
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });

  /* rozcestník */
  {
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DSF });
    const p = await ctx.newPage();
    p.on('pageerror', e => jsErrors.push('hub: ' + e));
    const dir = join(SUITE, '_screens'); if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    await p.goto(pathToFileURL(join(SUITE, 'index.html')).href, { waitUntil: 'load' });
    await sleep(ANIM);
    const cards = await p.$$eval('.mcard', e => e.length);
    cards === apps.length ? ok(`rozcestník: ${cards} kariet`) : fail(`rozcestník má ${cards} kariet, appiek je ${apps.length}`);
    await p.screenshot({ path: join(dir, 'rozcestnik.png'), fullPage: true }); shots++;
    await p.evaluate(() => document.getElementById('themebtn').click()); await sleep(240);
    await p.screenshot({ path: join(dir, 'rozcestnik-light.png'), fullPage: true }); shots++;
    await p.evaluate(() => document.getElementById('themebtn').click());
    await p.evaluate(() => document.querySelector('#langseg [data-lang="en"]').click()); await sleep(240);
    await p.screenshot({ path: join(dir, 'rozcestnik-en.png'), fullPage: true }); shots++;
    await p.setViewportSize({ width: MW, height: MH }); await sleep(240);
    await p.evaluate(() => document.querySelector('#langseg [data-lang="sk"]').click()); await sleep(200);
    await p.screenshot({ path: join(dir, 'rozcestnik-mobil.png'), fullPage: true }); shots++;
    ok('rozcestník: 4 zábery');
    await ctx.close();
  }

  for (const app of apps){
    console.log(`\n── ${app}`);
    const dir = join(SUITE, app, 'screens');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const url = pathToFileURL(join(SUITE, app, 'index.html')).href;
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DSF });
    const p = await ctx.newPage();
    p.on('pageerror', e => jsErrors.push(`${app}: ${e}`));
    p.on('console', m => { if (m.type() === 'error' && !/fonts\.googleapis|ERR_CONNECTION/.test(m.text())) jsErrors.push(`${app}: ${m.text()}`); });
    await p.goto(url, { waitUntil: 'load' });
    await sleep(ANIM);

    const keys = await p.evaluate(() => {
      const A = window.APP;
      if (A.key === 'chat') return ['new'].concat((A.convos || []).slice(0, 6).map(c => c.id))
        .concat((A.nav || []).filter(n => n.k !== 'chat').map(n => n.k));
      return (A.screens || []).map(s => s.key);
    });
    const feats = await p.evaluate(() => ({ imp: !!window.APP.imp, rep: !!window.APP.rep, api: !!window.APP.api, chat: window.APP.key === 'chat' }));

    const shoot = async (slug, suffix) => {
      const f = join(dir, `${slug}${suffix}.png`);
      await p.screenshot({ path: f, fullPage: true }); shots++;
    };
    const check = async slug => {
      const bad = await p.evaluate(() => {
        const v = document.getElementById('view');
        return { short: v.innerHTML.length < 800, junk: /undefined|NaN|\[object/.test(v.innerText) };
      });
      if (bad.short) fail(`${app}/${slug}: prázdna obrazovka`);
      if (bad.junk) fail(`${app}/${slug}: undefined/NaN v texte`);
    };

    /* tmavá téma + kontrola */
    for (const k of keys){
      await p.evaluate(x => { location.hash = '#' + x; }, k); await sleep(ANIM);
      await check(k); await shoot(k, '');
    }
    ok(`tmavá: ${keys.length}`);

    /* svetlá téma */
    await p.evaluate(() => document.getElementById('themebtn').click());
    for (const k of keys){ await p.evaluate(x => { location.hash = '#' + x; }, k); await sleep(260); await shoot(k, '-light'); }
    await p.evaluate(() => document.getElementById('themebtn').click());
    ok(`svetlá: ${keys.length}`);

    /* EN */
    await p.evaluate(() => document.querySelector('#langseg [data-lang="en"]').click());
    for (const k of keys){ await p.evaluate(x => { location.hash = '#' + x; }, k); await sleep(260); await shoot(k, '-en'); }
    await p.evaluate(() => document.querySelector('#langseg [data-lang="sk"]').click());
    ok(`EN: ${keys.length}`);

    /* interakčné stavy (tmavá, desktop) */
    const st = [];
    st.push(['stav-cmdk', async () => { await p.evaluate(() => window.openCmdk()); await sleep(200); await p.fill('#cmdkIn', 'a'); }]);
    if (!feats.chat) st.push(['stav-chat', async () => { await p.evaluate(() => window.aiToggle()); await sleep(240);
      await p.evaluate(() => { const b = document.querySelector('.ai-chip'); if (b) b.click(); }); }]);
    if (feats.api) st.push(['stav-konektor', async () => { await p.evaluate(() => window.openConn()); }]);
    if (feats.imp) st.push(['stav-import', async () => { await p.evaluate(() => window.openImport()); await sleep(200);
      await p.evaluate(() => window.iwSample()); }]);
    if (feats.imp) st.push(['stav-import-validacia', async () => { await p.evaluate(() => window.openImport()); await sleep(150);
      await p.evaluate(() => { window.iwSample(); window.iwStep(1); }); }]);
    if (feats.rep) st.push(['stav-report', async () => { await p.evaluate(() => window.openReport()); }]);
    for (const [slug, fn] of st){
      await p.evaluate(x => { location.hash = '#' + x; }, keys[0]); await sleep(300);
      await fn(); await sleep(320);
      await shoot(slug, '');
      await p.evaluate(() => { window.closeOverlay(); if (window.state.chat && window.state.chat.open) window.aiToggle(); });
      await sleep(120);
    }
    ok(`stavy: ${st.length}`);

    /* mobil */
    await p.setViewportSize({ width: MW, height: MH });
    for (const k of keys){
      await p.evaluate(x => { location.hash = '#' + x; }, k); await sleep(300);
      const hs = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      if (hs) fail(`${app}/${k}: vodorovný scroll na 390 px`);
      await shoot(k, '-mobil');
    }
    ok(`mobil: ${keys.length}`);
    await ctx.close();
  }

  await browser.close();
  console.log('\n─────────────────────────────');
  console.log(`appiek: ${apps.length}   PNG: ${shots}   JS chyby: ${jsErrors.length}   verif. zlyhania: ${errors.length}`);
  if (jsErrors.length){ console.log('JS chyby:'); [...new Set(jsErrors)].slice(0, 10).forEach(e => console.log('  ! ' + e)); }
  if (errors.length){ console.log('zlyhania:'); errors.slice(0, 12).forEach(e => console.log('  ! ' + e)); }
  if (errors.length || jsErrors.length) process.exit(1);
  console.log('OK');
}
main().catch(e => { console.error(e); process.exit(2); });
