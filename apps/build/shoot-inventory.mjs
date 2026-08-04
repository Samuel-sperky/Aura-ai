#!/usr/bin/env node
/**
 * shoot-inventory.mjs — prehlad-aplikacii.html: verifikácia + PNG + PDF
 *
 * Použitie:
 *   node shoot-inventory.mjs [html] [outDir]
 * Predvolene: ../prehlad-aplikacii.html → ../screens/ + ../prehlad-aplikacii.pdf
 *
 * Vyžaduje Playwright a Chromium v /opt/pw-browsers/chromium.
 * `playwright install` sa nespúšťa — prehliadač je predinštalovaný.
 */
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const HTML = resolve(process.argv[2] || resolve(__dir, '..', 'prehlad-aplikacii.html'));
const OUT = resolve(process.argv[3] || resolve(__dir, '..', 'screens'));
const PDF = resolve(__dir, '..', 'prehlad-aplikacii.pdf');
const W = 1440;
const H = 950;
const DSF = 1;
const ANIM = 350;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jsErrors = [];
let bad = 0;
const ok = (m) => console.log(`  ✓ ${m}`);
const fail = (m) => {
  bad++;
  console.log(`  ✗ ${m}`);
};

async function loadChromium() {
  for (const c of ['playwright', '/opt/node22/lib/node_modules/playwright/index.mjs']) {
    try {
      const abs = c.startsWith('/');
      if (abs && !existsSync(c)) continue;
      const m = await import(abs ? pathToFileURL(c).href : c);
      const chromium = m.chromium ?? m.default?.chromium;
      if (chromium) return chromium;
    } catch {}
  }
  throw new Error('Playwright sa nepodarilo načítať.');
}

async function main() {
  if (!existsSync(HTML)) {
    console.error('Chýba HTML: ' + HTML);
    process.exit(2);
  }
  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

  const chromium = await loadChromium();
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DSF });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => jsErrors.push(String(e)));
  page.on('console', (m) => {
    // Google Fonts nie sú v offline prostredí dostupné — systémový fallback je v poriadku
    if (m.type() === 'error' && !/ERR_(CONNECTION|NAME|INTERNET)/.test(m.text())) jsErrors.push(m.text());
  });

  await page.goto(pathToFileURL(HTML).href, { waitUntil: 'domcontentloaded' });
  await sleep(600);

  console.log('\nFáza A — verifikácia');
  const cards = await page.$$eval('#cards .mcard', (e) => e.length);
  cards === 6 ? ok('6 kariet modulov') : fail(`kariet je ${cards} (čakané 6)`);

  const fnRows = await page.$$eval('#tFn tbody tr', (e) => e.length);
  fnRows >= 60 ? ok(`${fnRows} riadkov funkcií`) : fail(`funkcií je ${fnRows} (čakané ≥60)`);

  const scrRows = await page.$$eval('#tScr tbody tr', (e) => e.length);
  scrRows === 54 ? ok('54 riadkov obrazoviek') : fail(`obrazoviek je ${scrRows} (čakané 54)`);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  overflow <= 0 ? ok('žiadne horizontálne pretečenie') : fail(`stránka preteká o ${overflow} px`);

  // filter po module
  await page.click('.chip[data-f="modul"][data-v="kpi"]');
  await sleep(ANIM);
  const visible = await page.$$eval('#cards .mcard', (els) =>
    els.filter((e) => getComputedStyle(e).display !== 'none').length,
  );
  visible === 1 ? ok('filter modulu zúži karty na 1') : fail(`filter modulu nechal ${visible} kariet`);
  await page.click('.chip[data-f="modul"][data-v="all"]');
  await sleep(ANIM);

  // filter po overení
  await page.click('.chip[data-f="over"][data-v="overene"]');
  await sleep(ANIM);
  const cnt = await page.textContent('#cntFn');
  /z 61 funkcií/.test(cnt) ? ok(`filter overenia: ${cnt}`) : fail(`neočekávaný počet: ${cnt}`);
  await page.click('.chip[data-f="over"][data-v="all"]');
  await sleep(ANIM);

  // vyhľadávanie
  await page.fill('#q', 'timeline');
  await sleep(ANIM);
  const found = await page.$$eval('#tFn tbody tr', (els) =>
    els.filter((e) => getComputedStyle(e).display !== 'none').length,
  );
  found > 0 ? ok(`vyhľadávanie „timeline" → ${found} funkcií`) : fail('vyhľadávanie nenašlo nič');
  await page.fill('#q', '');
  await sleep(ANIM);

  console.log('\nFáza B — screenshoty');
  const shots = [
    ['prehlad-hero', async () => page.evaluate(() => window.scrollTo(0, 0))],
    ['prehlad-moduly', async () => page.evaluate(() => document.getElementById('moduly').scrollIntoView())],
    ['prehlad-funkcie', async () => page.evaluate(() => document.getElementById('funkcie').scrollIntoView())],
    ['prehlad-obrazovky', async () => page.evaluate(() => document.getElementById('obrazovky').scrollIntoView())],
    ['prehlad-naklady', async () => page.evaluate(() => document.getElementById('naklady').scrollIntoView())],
    ['prehlad-rizika', async () => page.evaluate(() => document.getElementById('rizika').scrollIntoView())],
    ['prehlad-legenda', async () => page.evaluate(() => document.getElementById('legenda').scrollIntoView())],
  ];
  for (const [name, act] of shots) {
    await act();
    await sleep(ANIM);
    await page.screenshot({ path: join(OUT, `${name}.png`) });
    ok(`${name}.png`);
  }

  // celá stránka + light téma + mobil + rozbalený technický profil
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(200);
  await page.screenshot({ path: join(OUT, 'prehlad-full.png'), fullPage: true });
  ok('prehlad-full.png (celá stránka)');

  await page.evaluate(() => {
    document.querySelectorAll('details.tech').forEach((d) => (d.open = true));
    document.getElementById('moduly').scrollIntoView();
  });
  await sleep(ANIM);
  await page.screenshot({ path: join(OUT, 'prehlad-tech.png') });
  ok('prehlad-tech.png (rozbalený technický profil)');

  await page.click('#theme');
  await sleep(ANIM);
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(200);
  await page.screenshot({ path: join(OUT, 'prehlad-light.png') });
  await page.evaluate(() => document.getElementById('moduly').scrollIntoView());
  await sleep(ANIM);
  await page.screenshot({ path: join(OUT, 'prehlad-light-moduly.png') });
  ok('prehlad-light.png + prehlad-light-moduly.png');
  await page.click('#theme');
  await sleep(ANIM);

  const mob = await ctx.newPage();
  await mob.setViewportSize({ width: 390, height: 844 });
  await mob.goto(pathToFileURL(HTML).href, { waitUntil: 'domcontentloaded' });
  await sleep(600);
  await mob.screenshot({ path: join(OUT, 'prehlad-mobil.png') });
  const mobOverflow = await mob.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  mobOverflow <= 0 ? ok('prehlad-mobil.png (390 px, bez pretečenia)') : fail(`mobil preteká o ${mobOverflow} px`);
  await mob.close();

  console.log('\nFáza C — PDF');
  await page.emulateMedia({ media: 'print' });
  await page.pdf({
    path: PDF,
    format: 'A4',
    landscape: true,
    printBackground: true,
    margin: { top: '12mm', bottom: '12mm', left: '12mm', right: '12mm' },
  });
  ok(`prehlad-aplikacii.pdf`);

  await browser.close();

  console.log('\nJS chyby: ' + (jsErrors.length ? jsErrors.join(' | ') : 'žiadne'));
  console.log(bad === 0 && jsErrors.length === 0 ? '\n✓ VŠETKO PREŠLO' : `\n✗ ${bad} zlyhaní`);
  process.exit(bad === 0 && jsErrors.length === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
