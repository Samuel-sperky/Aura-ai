#!/usr/bin/env node
/**
 * shoot.mjs — Aura Suite (náhľad aplikácií): verifikácia + PNG + PDF
 *
 * Použitie:
 *   node shoot.mjs [../aura-apps-hub.html] [../screens]
 *
 * Výstup:
 *   <out>/*.png    rozcestník + 6 modulov × (intro/dashboard/list/detail/settings)
 *   <out>/aura-apps-hub.pdf   všetky obrazovky za sebou (tmavá téma)
 *
 * Prostredie: Chromium je predinštalované v /opt/pw-browsers/chromium.
 * NIKDY nespúšťať `playwright install`.
 */
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dir = dirname(fileURLToPath(import.meta.url));
process.env.PLAYWRIGHT_BROWSERS_PATH ||= '/opt/pw-browsers';

const HTML = resolve(__dir, process.argv[2] || '../aura-apps-hub.html');
const OUT  = resolve(__dir, process.argv[3] || '../screens');
const W = 1600, H = 1000, DSF = 2, ANIM = 550;

const MODULES = ['marketing','kpi','logistika','hr','roadmap','trzby'];
const SCREENS = ['dashboard','list','detail','settings'];
const errors = [], jsErrors = [], shots = [];
const ok = m => console.log('  ✓ ' + m);
const fail = m => { errors.push(m); console.log('  ✗ ' + m); };

async function loadChromium(){
  const cands = ['playwright','playwright-core','/opt/node22/lib/node_modules/playwright/index.js'];
  try { const r = execFileSync('npm',['root','-g'],{encoding:'utf8'}).trim();
    if(r) cands.push(join(r,'playwright','index.js'), join(r,'playwright-core','index.js')); } catch {}
  for (const c of cands){
    const abs = c.startsWith('/');
    if (abs && !existsSync(c)) continue;
    try { const m = await import(abs ? pathToFileURL(c).href : c);
      const chromium = m.chromium ?? m.default?.chromium; if (chromium) return chromium; } catch {}
  }
  throw new Error('Playwright sa nepodarilo načítať.');
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main(){
  if (!existsSync(HTML)) { console.error('Chýba HTML: ' + HTML); process.exit(2); }
  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
  const chromium = await loadChromium();
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DSF });
  const page = await ctx.newPage();
  page.on('pageerror', e => jsErrors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') jsErrors.push(m.text()); });

  const url = pathToFileURL(HTML).href;
  const routes = [['hub', 'hub'], ['login', 'login'], ['workspace', 'workspace'], ['profile', 'profile']];
  for (const m of MODULES){ routes.push([m, `${m}`]); for (const s of SCREENS) routes.push([`${m}-${s}`, `${m}/${s}`]); }
  routes.push([`marketing-detail-summer`, 'marketing/detail/summer']);

  console.log('\nFáza A — verifikácia');
  await page.goto(url, { waitUntil: 'networkidle' });
  await sleep(ANIM);
  const cardCount = await page.$$eval('.mcard', els => els.length);
  cardCount === 6 ? ok('rozcestník má 6 modulov') : fail(`rozcestník má ${cardCount} modulov (čakané 6)`);

  console.log('\nFáza B — screenshoty (tmavá téma, SK)');
  for (const [slug, hash] of routes){
    await page.evaluate(h => { location.hash = '#' + h; }, hash);
    await sleep(ANIM);
    const file = join(OUT, `${slug}.png`);
    await page.screenshot({ path: file, fullPage: true });
    shots.push(file); ok(`${slug}.png`);
  }

  console.log('\nFáza B2 — interakčné stavy (overlay/modál)');
  const states = [
    ['state-cmdk', 'marketing/dashboard', () => window.openCmdk()],
    ['state-modal', 'kpi/list', () => window.openModal('kpi')],
    ['state-notif', 'logistika/dashboard', () => window.openNotif()],
    ['state-usermenu', 'hr/dashboard', () => window.openUser()],
    ['state-empty', 'trzby/list', () => { window.state.query.trzby = 'zzz'; window.renderList(window.MOD.trzby); }],
  ];
  for (const [slug, hash, fn] of states){
    await page.evaluate(h => { location.hash = '#' + h; }, hash);
    await sleep(ANIM);
    await page.evaluate(fn);
    await sleep(260);
    const file = join(OUT, `${slug}.png`);
    await page.screenshot({ path: file, fullPage: true });
    shots.push(file); ok(`${slug}.png`);
    await page.evaluate(() => window.closeOverlay && window.closeOverlay());
    await page.evaluate(() => { window.state.query = {}; });
  }
  // mobilná ukážka
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => { location.hash = '#hub'; });
  await sleep(ANIM);
  await page.screenshot({ path: join(OUT, 'mobile-hub.png'), fullPage: true }); shots.push(join(OUT, 'mobile-hub.png')); ok('mobile-hub.png');
  await page.evaluate(() => { location.hash = '#marketing/list'; });
  await sleep(ANIM + 260);
  await page.evaluate(() => document.getElementById('hambBtn').click());
  await sleep(200);
  await page.screenshot({ path: join(OUT, 'mobile-drawer.png'), fullPage: true }); shots.push(join(OUT, 'mobile-drawer.png')); ok('mobile-drawer.png');
  await page.setViewportSize({ width: W, height: H });

  console.log('\nFáza C — svetlá téma (ukážky) + EN rozcestník');
  await page.evaluate(() => document.getElementById('themebtn').click());
  for (const [slug, hash] of [['hub','hub'],['kpi-dashboard','kpi/dashboard'],['hr-detail','hr/detail'],['trzby-list','trzby/list']]){
    await page.evaluate(h => { location.hash = '#' + h; }, hash);
    await sleep(ANIM);
    const file = join(OUT, `${slug}-light.png`);
    await page.screenshot({ path: file, fullPage: true });
    shots.push(file); ok(`${slug}-light.png`);
  }
  await page.evaluate(() => document.getElementById('themebtn').click()); // späť na dark
  await page.evaluate(() => document.querySelector('#langseg [data-lang="en"]').click());
  await page.evaluate(() => { location.hash = '#hub'; });
  await sleep(ANIM);
  await page.screenshot({ path: join(OUT, 'hub-en.png'), fullPage: true });
  shots.push(join(OUT, 'hub-en.png')); ok('hub-en.png');
  await page.evaluate(() => document.querySelector('#langseg [data-lang="sk"]').click());

  console.log('\nFáza D — PDF (všetky obrazovky za sebou)');
  const darkShots = shots.filter(s => typeof s === 'string' && s.endsWith('.png')
    && !s.includes('-light') && !s.includes('-en') && !s.includes('state-') && !s.includes('mobile-'));
  const galleryItems = darkShots.map(f => {
    const b64 = readFileSync(f).toString('base64');
    return `<div class="pg"><img src="data:image/png;base64,${b64}"></div>`;
  }).join('');
  const gallery = `<!doctype html><meta charset=utf-8><style>
    @page{size:A4 landscape;margin:0}*{margin:0}
    .pg{page-break-after:always;display:flex;align-items:center;justify-content:center;height:100vh;background:#0e1413}
    img{max-width:100%;max-height:100%;display:block}</style>${galleryItems}`;
  const gfile = join(OUT, '_gallery.html');
  writeFileSync(gfile, gallery);
  const gpage = await ctx.newPage();
  await gpage.goto(pathToFileURL(gfile).href, { waitUntil: 'networkidle' });
  const pdf = join(dirname(OUT), 'aura-apps-hub.pdf');
  await gpage.pdf({ path: pdf, landscape: true, printBackground: true, preferCSSPageSize: true });
  ok(`PDF: ${pdf} (${darkShots.length} strán)`);

  await browser.close();

  console.log('\n─────────────────────────────');
  console.log(`PNG: ${shots.length}   PDF: 1   JS chyby: ${jsErrors.length}   verif. zlyhania: ${errors.length}`);
  if (jsErrors.length){ console.log('JS chyby:'); jsErrors.slice(0,10).forEach(e => console.log('  ! ' + e)); }
  if (errors.length || jsErrors.length) process.exit(1);
  console.log('OK');
}
main().catch(e => { console.error(e); process.exit(2); });
