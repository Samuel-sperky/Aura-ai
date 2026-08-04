#!/usr/bin/env node
/**
 * shoot-aura-ai.mjs — verifikácia + PNG pre apps/aura-ai.html
 *
 *   node shoot-aura-ai.mjs [../aura-ai.html] [../screens-aura-ai]
 *
 * Výstup: <out>/*.png (tmavá téma = všetky obrazovky, chatové stavy,
 *         svetlé ukážky, mobil 390 px) + <out>/_prehlad.png (kontaktný list).
 *
 * Chromium je predinštalovaný v /opt/pw-browsers — `playwright install`
 * sa NIKDY nespúšťa.
 */
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve, join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dir = dirname(fileURLToPath(import.meta.url));
process.env.PLAYWRIGHT_BROWSERS_PATH ||= '/opt/pw-browsers';
const HTML = resolve(__dir, process.argv[2] || '../aura-ai.html');
const OUT = resolve(__dir, process.argv[3] || '../screens-aura-ai');
const W = 1600, H = 1000, DSF = 2, ANIM = 420;

const errors = [], jsErrors = [], shots = [];
const ok = m => console.log('  ✓ ' + m);
const fail = m => { errors.push(m); console.log('  ✗ ' + m); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function loadChromium(){
  const cands = ['playwright', 'playwright-core', '/opt/node22/lib/node_modules/playwright/index.js'];
  try { const r = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
    if (r) cands.push(join(r, 'playwright', 'index.js'), join(r, 'playwright-core', 'index.js')); } catch {}
  for (const c of cands){
    const abs = c.startsWith('/');
    if (abs && !existsSync(c)) continue;
    try { const m = await import(abs ? pathToFileURL(c).href : c);
      const chromium = m.chromium ?? m.default?.chromium; if (chromium) return chromium; } catch {}
  }
  throw new Error('Playwright sa nepodarilo načítať.');
}

/* obrazovky appiek sa čítajú z appky samej — matica nemôže zostať pozadu */
const CHAT_PAGES = ['', 'c1', 'c2', 'c3', 'projekty', 'projekt/kampane', 'historia', 'sablony', 'subory', 'spotreba', 'stavy', 'nastavenia'];
const CHAT_STATES = [
  ['chat-stav-stream', 'chat/c1/stream'], ['chat-stav-nastroj', 'chat/c1/nastroj'],
  ['chat-stav-chyba', 'chat/c1/chyba'], ['chat-stav-limit', 'chat/c1/limit'],
  ['chat-stav-offline', 'chat/c2/offline'], ['chat-stav-artefakt', 'chat/c3/artefakt'],
  ['chat-stav-dlhy-kontext', 'chat/c3/long'], ['chat-zdielane', 'chat/zdielane/c2']];
const LIGHT = [['hub', 'hub'], ['mind-dnes', 'mind/dnes'], ['mind-mapa', 'mind/mapa'], ['chat-c1', 'chat/c1'],
  ['banner-prehlad', 'banner/prehlad'], ['retus-kontrola', 'retus/kontrola'], ['shop-prehlad', 'shop/prehlad'], ['auhub-prevadzka', 'auhub/prevadzka']];
const MOBILE = [['hub', 'hub'], ['chat', 'chat'], ['chat-c1', 'chat/c1'], ['mind-dnes', 'mind/dnes'],
  ['banner-fronta', 'banner/fronta'], ['auhub-prehlad', 'auhub/prehlad']];

async function main(){
  if (!existsSync(HTML)) { console.error('Chýba HTML: ' + HTML); process.exit(2); }
  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
  const chromium = await loadChromium();
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DSF });
  const page = await ctx.newPage();
  page.on('pageerror', e => jsErrors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.googleapis|ERR_CONNECTION/.test(m.text())) jsErrors.push(m.text()); });

  await page.goto(pathToFileURL(HTML).href, { waitUntil: 'load' });
  await sleep(ANIM);

  console.log('\nFáza A — verifikácia');
  const apps = await page.evaluate(() => window.APPS.map(a => ({ k: a.key, s: (a.screens || []).map(x => x.key) })));
  apps.length === 6 ? ok('rozcestník má 6 aplikácií') : fail(`rozcestník má ${apps.length} aplikácií (čakané 6)`);
  const cards = await page.$$eval('.mcard', e => e.length);
  cards === 6 ? ok('6 kariet na rozcestníku') : fail(`kariet: ${cards}`);
  const convos = await page.evaluate(() => (window.CHAT.convos || []).length);
  convos >= 10 ? ok(`konverzácií: ${convos}`) : fail(`konverzácií len ${convos}`);

  const routes = [['hub', 'hub']];
  for (const a of apps){
    if (a.k === 'chat') { for (const p of CHAT_PAGES) routes.push(['chat' + (p ? '-' + p.replace(/\//g, '-') : ''), 'chat' + (p ? '/' + p : '')]); }
    else for (const s of a.s) routes.push([`${a.k}-${s}`, `${a.k}/${s}`]);
  }
  routes.push(...CHAT_STATES);

  console.log('\nFáza B — screenshoty (tmavá téma, SK)');
  for (const [slug, hash] of routes){
    await page.evaluate(h => { location.hash = '#' + h; }, hash);
    await sleep(ANIM);
    const bad = await page.evaluate(() => {
      const t = document.getElementById('view').innerText;
      return { short: document.getElementById('view').innerHTML.length < 900, junk: /undefined|NaN|\[object/.test(t) };
    });
    if (bad.short) fail(`${slug}: prázdna obrazovka`);
    if (bad.junk) fail(`${slug}: undefined/NaN v texte`);
    const f = join(OUT, `${slug}.png`);
    await page.screenshot({ path: f, fullPage: true });
    shots.push(f); ok(`${slug}.png`);
  }

  console.log('\nFáza C — interakčné stavy');
  const states = [
    ['stav-cmdk', 'mind/dnes', async () => { await page.evaluate(() => window.openCmdk()); await sleep(200); await page.fill('#cmdkIn', 'banner'); }],
    ['stav-odoslane', 'chat/c2', async () => {
      await page.evaluate(() => { document.getElementById('cin').innerText = 'Zhrň mi reklamácie GLS za W31 a navrhni krok.'; });
      await page.evaluate(() => document.querySelector('.csend').click()); }],
    ['stav-artefakt-panel', 'chat/c3', async () => { await page.evaluate(() => { const b = [...document.querySelectorAll('.act')].find(x => /\.sql|json|manifest|tabu|dopyt|payload|artefakt/i.test(x.textContent)); if (b) b.click(); }); }],
  ];
  for (const [slug, hash, fn] of states){
    await page.evaluate(h => { location.hash = '#' + h; }, hash);
    await sleep(ANIM);
    await fn(); await sleep(360);
    const f = join(OUT, `${slug}.png`);
    await page.screenshot({ path: f, fullPage: true });
    shots.push(f); ok(`${slug}.png`);
    await page.evaluate(() => { window.closeOverlay(); window.state.art = null; window.EXTRA.c2 = []; });
  }

  console.log('\nFáza D — svetlá téma');
  await page.evaluate(() => document.getElementById('themebtn').click());
  for (const [slug, hash] of LIGHT){
    await page.evaluate(h => { location.hash = '#' + h; }, hash);
    await sleep(ANIM);
    const f = join(OUT, `${slug}-light.png`);
    await page.screenshot({ path: f, fullPage: true });
    shots.push(f); ok(`${slug}-light.png`);
  }
  await page.evaluate(() => document.getElementById('themebtn').click());

  console.log('\nFáza E — EN rozcestník + mobil 390 px');
  await page.evaluate(() => { location.hash = '#hub'; });
  await page.evaluate(() => document.querySelector('#langseg [data-lang="en"]').click());
  await sleep(ANIM);
  let f = join(OUT, 'hub-en.png');
  await page.screenshot({ path: f, fullPage: true }); shots.push(f); ok('hub-en.png');
  f = join(OUT, 'chat-c1-en.png');
  await page.evaluate(() => { location.hash = '#chat/c1'; }); await sleep(ANIM);
  await page.screenshot({ path: f, fullPage: true }); shots.push(f); ok('chat-c1-en.png');
  await page.evaluate(() => document.querySelector('#langseg [data-lang="sk"]').click());

  await page.setViewportSize({ width: 390, height: 844 });
  for (const [slug, hash] of MOBILE){
    await page.evaluate(h => { location.hash = '#' + h; }, hash);
    await sleep(ANIM + 120);
    const hs = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    if (hs) fail(`mobil ${slug}: vodorovný scroll`);
    const ff = join(OUT, `mobil-${slug}.png`);
    await page.screenshot({ path: ff, fullPage: true });
    shots.push(ff); ok(`mobil-${slug}.png`);
  }
  await page.setViewportSize({ width: W, height: H });

  console.log('\nFáza F — kontaktný list');
  const cells = shots.filter(s => !s.includes('mobil-')).map(fp => {
    const b64 = readFileSync(fp).toString('base64');
    return `<figure><img src="data:image/png;base64,${b64}"><figcaption>${basename(fp, '.png')}</figcaption></figure>`;
  }).join('');
  const gal = `<!doctype html><meta charset=utf-8><style>
    body{margin:0;background:#0e1413;color:#829896;font:500 11px 'Geist Mono',ui-monospace,monospace;padding:18px}
    h1{font:700 22px Georgia,serif;color:#e8f0ef;margin:0 0 4px}
    p{margin:0 0 18px;color:#829896}
    .g{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
    figure{margin:0}
    img{width:100%;display:block;border:1px solid #22302e;border-radius:8px}
    figcaption{padding:5px 2px 0;letter-spacing:.04em}</style>
    <h1>Aura AI · chat a zvyšné aplikácie</h1><p>${shots.filter(s => !s.includes('mobil-')).length} obrazoviek · kontaktný list</p>
    <div class="g">${cells}</div>`;
  const gfile = join(OUT, '_prehlad.html');
  writeFileSync(gfile, gal);
  const gp = await ctx.newPage();
  await gp.setViewportSize({ width: 1800, height: 1200 });
  await gp.goto(pathToFileURL(gfile).href, { waitUntil: 'load' });
  await sleep(600);
  const sheet = join(OUT, '_prehlad.png');
  await gp.screenshot({ path: sheet, fullPage: true });
  ok('_prehlad.png (kontaktný list)');

  await browser.close();
  console.log('\n─────────────────────────────');
  console.log(`PNG: ${shots.length + 1}   JS chyby: ${jsErrors.length}   verif. zlyhania: ${errors.length}`);
  if (jsErrors.length){ console.log('JS chyby:'); jsErrors.slice(0, 8).forEach(e => console.log('  ! ' + e)); }
  if (errors.length || jsErrors.length) process.exit(1);
  console.log('OK');
}
main().catch(e => { console.error(e); process.exit(2); });
