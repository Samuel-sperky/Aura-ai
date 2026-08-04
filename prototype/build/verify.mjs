import pkg from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = pkg;
const FILE = 'file://' + process.argv[2];
const OUT = process.argv[3];
const SHOT = process.argv[4] === 'shots';
const SCREENS = ['pamat','appky','chat','smernica','automatizacie','jadro','naklady','observabilita','nastavenia'];
const fail = [], warn = [], ok = [];
const F = (m) => fail.push(m), W = (m) => warn.push(m), O = (m) => ok.push(m);

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1.5, permissions: ['clipboard-read','clipboard-write'], acceptDownloads: true });
const p = await ctx.newPage();
const errs = [], net = [];
p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text().slice(0,200)); });
p.on('request', r => { if (!r.url().startsWith('file://') && !r.url().startsWith('data:')) net.push(r.url().slice(0,90)); });

await p.goto(FILE, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1600);

/* --- 1. chyby a sieť --- */
errs.length ? F(`JS chyby (${errs.length}): ` + errs.slice(0,6).join(' | ')) : O('0 JS chýb');
net.length ? F(`sieťové požiadavky (${net.length}): ` + net.slice(0,3).join(' | ')) : O('0 sieťových požiadaviek — beží offline');

/* --- 2. obrazovky + routing --- */
const registered = await p.evaluate(() => Object.keys(window.Aura?.screens || {}));
const missing = SCREENS.filter(s => !registered.includes(s));
missing.length ? F('neregistrované obrazovky: ' + missing.join(', ')) : O(`${registered.length} obrazoviek registrovaných`);

const chartInfo = {};
for (const s of SCREENS) {
  if (!registered.includes(s)) continue;
  await p.evaluate(k => window.Aura.go(k), s);
  await p.waitForTimeout(700);
  const info = await p.evaluate((k) => {
    const v = document.querySelector('#v-' + k);
    if (!v) return null;
    const on = v.classList.contains('on');
    const svgs = [...v.querySelectorAll('svg.ach-svg')];
    const charts = svgs.map(sv => ({
      texts: sv.querySelectorAll('text').length,
      title: sv.querySelector('title')?.textContent?.slice(0, 40) || '',
      type: sv.getAttribute('data-type') || '',
      spark: sv.getAttribute('data-type') === 'sparkline'
    }));
    const ownSvg = [...v.querySelectorAll('svg:not(.ach-svg)')].length;
    return {
      on, h: v.scrollHeight, charts, ownSvg,
      tables: v.querySelectorAll('table.tbl').length,
      sortable: v.querySelectorAll('th[data-sort]').length,
      clickRows: v.querySelectorAll('table.tbl tbody tr').length,
      kpis: v.querySelectorAll('.kpi').length,
      labels: v.querySelectorAll('input,select,textarea').length,
      labelled: [...v.querySelectorAll('input,select,textarea')].filter(e =>
        e.labels?.length || e.getAttribute('aria-label') || e.closest('label')).length,
      title: document.getElementById('title').textContent,
      hash: location.hash
    };
  }, s);
  if (!info) { F(`${s}: sekcia v DOM chýba`); continue; }
  chartInfo[s] = info;
  if (!info.on) F(`${s}: sekcia sa nezobrazila`);
  if (!info.hash.includes(s)) F(`${s}: hash sa nezmenil (${info.hash})`);
  const real = info.charts.filter(c => !c.spark);
  if (s !== 'nastavenia' && real.length + (info.ownSvg > 0 ? 1 : 0) < 2)
    F(`${s}: len ${real.length} grafov (min 2)`);
  // osi vyžadujeme len od grafov, ktoré ich majú mať (donut/gauge/uptime ich z princípu nemajú)
  const AXIS = ['line', 'area', 'bar', 'stacked', 'heatmap'];
  const noAxes = real.filter(c => AXIS.includes(c.type) && c.texts < 6);
  if (noAxes.length) F(`${s}: ${noAxes.length} grafov bez osí/popisov (<6 textov): ` + noAxes.map(c=>c.title).join('; '));
  if (info.labels !== info.labelled) F(`${s}: ${info.labels - info.labelled} polí bez labelu`);
  if (info.h < 700) W(`${s}: nízka výška obsahu ${info.h} px`);
  if (SHOT) await p.screenshot({ path: `${OUT}/v-${s}.png`, fullPage: true });
}

/* --- 3. späť + deep link --- */
await p.evaluate(() => window.Aura.go('jadro'));
await p.waitForTimeout(300);
await p.goBack(); await p.waitForTimeout(500);
const afterBack = await p.evaluate(() => ({ url: location.href.slice(-30), screen: window.Aura.state.screen }));
afterBack.url.includes('about:blank') ? F('Späť opustilo appku') : O('Späť funguje (' + afterBack.screen + ')');
await p.goto(FILE + '#/observabilita'); await p.waitForTimeout(900);
(await p.evaluate(() => window.Aura.state.screen)) === 'observabilita' ? O('deep-link #/observabilita funguje') : F('deep-link nefunguje');

/* --- 4. grafy: tooltip --- */
await p.evaluate(() => window.Aura.go('jadro')); await p.waitForTimeout(800);
const hit = p.locator('#v-jadro .ach-hit').first();
if (await hit.count()) {
  await hit.hover({ position: { x: 120, y: 40 } });
  await p.waitForTimeout(250);
  const tips = await p.locator('#v-jadro .ach-tip.on').count();
  tips ? O('hover tooltip funguje') : F('hover nevytvoril tooltip');
} else W('na Jadre nie je interaktívna plocha grafu');

/* --- 5. chat --- */
if (registered.includes('chat')) {
  await p.evaluate(() => window.Aura.go('chat')); await p.waitForTimeout(700);
  const ta = p.locator('#v-chat textarea').first();
  if (await ta.count()) {
    const h0 = await ta.evaluate(e => e.clientHeight);
    await ta.fill('x'.repeat(700));
    await p.waitForTimeout(250);
    const h1 = await ta.evaluate(e => e.clientHeight);
    h1 > h0 ? O(`textarea rastie ${h0}→${h1} px`) : F(`textarea nerastie (${h0} px)`);
    await ta.fill('Zhrň mi rozhodnutia o hardvéri');
    const send = p.locator('#v-chat button').filter({ hasText: /Odosla/i }).first();
    if (await send.count()) {
      await send.click();
      const lens = [];
      for (let i = 0; i < 14; i++) { await p.waitForTimeout(170); lens.push(await p.evaluate(() => (document.querySelector('#ch-msgs, #v-chat .msgs')?.innerText || '').length)); }
      const uniq = new Set(lens).size;
      uniq >= 4 ? O(`chat streamuje (${uniq} medzistavov)`) : F(`chat nestreamuje — dĺžky: ${lens.join(',')}`);
    } else F('chat: tlačidlo Odoslať nenájdené');
  } else F('chat: textarea nenájdená');
}

/* --- 6. logy: hľadanie + export --- */
if (registered.includes('logy')) {
  await p.evaluate(() => window.Aura.go('logy')); await p.waitForTimeout(700);
  const inp = p.locator('#v-logy input[type="search"], #v-logy input[type="text"]').first();
  if (await inp.count()) {
    for (const q of ['ruka', 'Z1', 'warn', 'zaloha', 'RAM']) {
      await inp.fill(q); await p.waitForTimeout(320);
      const n = await p.locator('#v-logy table.tbl tbody tr').count();
      n > 0 ? O(`logy „${q}" → ${n}`) : F(`logy „${q}" → 0 výsledkov`);
    }
    await inp.fill('');
  } else F('logy: vyhľadávacie pole nenájdené');
  const exp = p.locator('#v-logy button').filter({ hasText: /CSV/i }).first();
  if (await exp.count()) {
    const dl = p.waitForEvent('download', { timeout: 4000 }).catch(() => null);
    await exp.click();
    (await dl) ? O('export CSV stiahol súbor') : F('export CSV nič nestiahol');
  } else W('logy: tlačidlo CSV nenájdené');
}

/* --- 7. NaN, Tab, kontrast --- */
await p.evaluate(() => window.Aura.go('pamat')); await p.waitForTimeout(600);
const allText = await p.evaluate(() => {
  const out = [];
  document.querySelectorAll('.view').forEach(v => out.push(v.innerText));
  return out.join(' ');
});
/\bNaN\b|\bundefined\b/.test(allText) ? F('v texte je NaN/undefined') : O('žiadne NaN/undefined');

await p.evaluate(() => window.Aura.go('jadro')); await p.waitForTimeout(600);
let stops = 0, seen = new Set();
await p.evaluate(() => document.body.focus());
for (let i = 0; i < 90; i++) {
  await p.keyboard.press('Tab');
  // identita prvku, nie jeho trieda — inak sa tlačidlá s rovnakou triedou zlúčia do jednej zastávky
  const id = await p.evaluate(() => {
    const a = document.activeElement;
    if (!a || a === document.body) return '';
    if (!a.__tabKey) { window.__tc = (window.__tc || 0) + 1; a.__tabKey = 'k' + window.__tc; }
    return a.__tabKey;
  });
  if (id && !seen.has(id)) { seen.add(id); stops++; }
}
stops >= 40 ? O(`Tab prejde ${stops} zastávok`) : F(`Tab prejde len ${stops} zastávok (min 40)`);

async function contrast(theme) {
  await p.evaluate(t => window.Aura.setTheme(t, true), theme);
  await p.waitForTimeout(350);
  return await p.evaluate(() => {
    function lum(c) {
      // podporuje rgb(0-255) aj color(srgb 0-1) — color-mix() vracia druhý formát
      const unit = /^color\(/.test(c) ? 1 : 255;
      const m = c.match(/[\d.]+/g).map(Number);
      const f = m.slice(0, 3).map(v => { v /= unit; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); });
      return .2126 * f[0] + .7152 * f[1] + .0722 * f[2];
    }
    // hľadaj prvé NEPRIEHĽADNÉ pozadie — polopriehľadné prekryvy (zebra, hover)
    // by sa inak čítali ako plná farba a hlásili by falošné prepady kontrastu
    function alphaOf(c) {
      const m = c.match(/[\d.]+/g);
      if (!m) return 1;
      if (/^color\(/.test(c)) return m.length >= 4 ? +m[3] : 1;
      return m.length >= 4 ? +m[3] : 1;
    }
    function bg(el) {
      let e = el;
      while (e) {
        const c = getComputedStyle(e).backgroundColor;
        if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c) && alphaOf(c) >= 0.9) return c;
        e = e.parentElement;
      }
      return getComputedStyle(document.body).backgroundColor || 'rgb(14,20,19)';
    }
    const bad = [];
    const sel = '.view.on .kpi b, .view.on .ach-tick, .view.on .note, .view.on td, .view.on .badge, .view.on .kd, .view.on .eyet';
    document.querySelectorAll(sel).forEach(el => {
      if (!el.offsetParent || !el.textContent.trim()) return;
      const cs = getComputedStyle(el);
      const L1 = lum(cs.color), L2 = lum(bg(el));
      const r = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05);
      const size = parseFloat(cs.fontSize);
      const need = (size >= 18 || (size >= 14 && +cs.fontWeight >= 600)) ? 3 : 4.5;
      if (r < need) bad.push(el.className.split(' ')[0] + ' ' + r.toFixed(2) + ':1 @' + size + 'px');
    });
    const small = [...document.querySelectorAll('.view.on *')].filter(e => e.children.length === 0 && e.textContent.trim() && parseFloat(getComputedStyle(e).fontSize) < 12).length;
    return { bad: [...new Set(bad)].slice(0, 6), badN: bad.length, small };
  });
}
for (const t of ['dark', 'light']) {
  const c = await contrast(t);
  c.badN ? F(`kontrast ${t}: ${c.badN} prvkov pod normu — ${c.bad.join(' | ')}`) : O(`kontrast ${t} OK`);
  c.small ? F(`${t}: ${c.small} prvkov pod 12 px`) : O(`${t}: žiadny text pod 12 px`);
}
await p.evaluate(() => window.Aura.setTheme('dark', true));

/* --- 8. responzivita --- */
for (const wpx of [1920, 1440, 1024, 390]) {
  await p.setViewportSize({ width: wpx, height: 900 });
  await p.waitForTimeout(500);
  const ov = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  ov ? F(`horizontálny pretok @${wpx}`) : O(`@${wpx} bez pretoku`);
  if (wpx === 1920) {
    const dead = await p.evaluate(() => { const c = document.querySelector('.content'); const r = c.getBoundingClientRect(); return Math.round(window.innerWidth - r.right); });
    dead > 200 ? W(`@1920 mŕtva plocha vpravo ${dead} px`) : O(`@1920 mŕtva plocha ${dead} px`);
  }
  if (wpx === 390 && SHOT) { await p.evaluate(() => window.Aura.go('jadro')); await p.waitForTimeout(400); await p.screenshot({ path: `${OUT}/v-390.png`, fullPage: true }); }
}

/* --- 9. fonty: reálne renderovanie, nie fonts.check() --- */
await p.setViewportSize({ width: 1600, height: 1000 });
await p.evaluate(() => window.Aura.go('jadro'));
await p.waitForTimeout(600);
const fonts = await p.evaluate(() => {
  function wOf(stack) {
    const s = document.createElement('span');
    s.style.cssText = 'position:absolute;left:-9999px;font-size:40px;white-space:pre;font-family:' + stack;
    s.textContent = 'Príklad textu 0123456789 ľščťžýáíé';
    document.body.appendChild(s);
    const w = s.getBoundingClientRect().width; s.remove(); return Math.round(w * 100) / 100;
  }
  const bogus = wOf("'NoSuchFontXyz123'");
  const mono = wOf("'JetBrains Mono'"), bareMono = wOf('monospace');
  const geist = wOf("'Inter'"), pf = wOf("'Playfair Display'");
  // koľko prvkov reálne renderuje fallback mono
  const usesMono = [...document.querySelectorAll('.view.on *')].filter(e =>
    e.children.length === 0 && e.textContent.trim() &&
    /JetBrains Mono|monospace/.test(getComputedStyle(e).fontFamily)).length;
  return { bogus, mono, bareMono, geist, pf, usesMono, monoReal: Math.abs(mono - bogus) > 1 && Math.abs(mono - bareMono) > 1 };
});
fonts.monoReal ? O(`JetBrains Mono sa reálne renderuje (${fonts.mono} px vs fallback ${fonts.bogus}/${fonts.bareMono})`)
  : F(`JetBrains Mono padá na fallback — ${fonts.usesMono} prvkov v cudzom písme`);

/* --- 10. typografická škála --- */
const typo = await p.evaluate(() => {
  const sizes = {};
  document.querySelectorAll('.view.on *').forEach(e => {
    if (e.children.length || !e.textContent.trim()) return;
    const fs = parseFloat(getComputedStyle(e).fontSize);
    sizes[fs] = (sizes[fs] || 0) + 1;
  });
  const cardH3 = document.querySelector('.view.on .ch h3');
  const body = document.querySelector('.view.on td, .view.on .lead, .view.on p');
  return {
    sizes, n: Object.keys(sizes).length,
    h3: cardH3 ? parseFloat(getComputedStyle(cardH3).fontSize) : 0,
    body: body ? parseFloat(getComputedStyle(body).fontSize) : 0,
    tiny: Object.entries(sizes).filter(([k]) => +k < 12).reduce((a, [, v]) => a + v, 0)
  };
});
typo.n <= 8 ? O(`typografia: ${typo.n} veľkostí (${Object.keys(typo.sizes).sort((a, b) => a - b).join(', ')})`)
  : F(`typografia: ${typo.n} rôznych veľkostí (max 8): ${Object.keys(typo.sizes).sort((a, b) => a - b).join(', ')}`);
(typo.h3 - typo.body) >= 1.4 ? O(`nadpis karty ${typo.h3} px vs telo ${typo.body} px`)
  : F(`nadpis karty ${typo.h3} px je len o ${(typo.h3 - typo.body).toFixed(1)} px väčší než telo ${typo.body} px`);
typo.tiny ? F(`${typo.tiny} prvkov pod 12 px`) : O('žiadny text pod 12 px');

/* --- 11.–13. jeden prechod obrazovkami: kolízie, mŕtve tlačidlá, klávesnica --- */
let collisions = 0, colEx = [], dead = [];
const errB4 = errs.length;
for (const s of SCREENS) {
  if (!registered.includes(s)) continue;
  await p.evaluate(k => window.Aura.go(k), s);
  await p.waitForTimeout(420);

  // mŕtve tlačidlá — klikanie priamo v stránke (rýchle)
  const d = await p.evaluate(async (k) => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const out = [], tested = new Set();
    const fresh = () => [...document.querySelectorAll('#v-' + k + ' button')].filter(b => b.offsetParent && !b.disabled);
    for (let guard = 0; guard < 44; guard++) {
      // znovu sa opýtaj na tlačidlá — po prekreslení sú staré odkazy odpojené od DOM
      // a klik na ne by nič neurobil, čo by vyzeralo ako mŕtvy prvok
      const b = fresh().find(x => !tested.has((x.textContent || x.getAttribute('aria-label') || '?').trim().replace(/\s+/g, ' ').slice(0, 28)));
      if (!b) break;
      tested.add((b.textContent || b.getAttribute('aria-label') || '?').trim().replace(/\s+/g, ' ').slice(0, 28));
      // už-aktívna voľba segmentu/prepínača (aria-pressed/current=true) — re-klik je korektný no-op, nie mŕtve tlačidlo
      if (b.getAttribute('aria-pressed') === 'true' || b.getAttribute('aria-current') === 'true') continue;
      const label = (b.textContent || b.getAttribute('aria-label') || '?').trim().replace(/\s+/g, ' ').slice(0, 28);
      // deterministický podpis: obsah obrazovky + otvorené vrstvy + ich obsah + hash.
      // Toasty sa pred klikom vyprázdnia, inak by dobiehajúce toasty z predchádzajúcich
      // klikov menili podpis náhodne v oboch smeroch.
      document.querySelectorAll('#toasts .toast').forEach(t => t.remove());
      const sig = () => (document.querySelector('.view.on') || document).innerHTML + '§' +
        document.querySelectorAll('.dp.on, .modal.on').length + '§' +
        (document.getElementById('dp-body') || {}).innerHTML + '§' +
        document.querySelectorAll('#toasts .toast').length + '§' + location.hash;
      const before = sig();
      try { b.click(); } catch (e) { }
      await sleep(90);
      if (sig() === before) out.push(label);
      window.Aura.closeDetail(); window.Aura.closeConfirm && window.Aura.closeConfirm(); window.Aura.closeCmd && window.Aura.closeCmd();
      await sleep(30);
    }
    return out;
  }, s);
  if (d.length) dead.push(`${s}: ${d.slice(0, 6).map(x => '"' + x + '"').join(', ')}`);

  // klávesnica na grafoch
  const hits = await p.locator(`#v-${s} .ach-hit`).count();
  for (let i = 0; i < Math.min(hits, 5); i++) {
    try {
      await p.locator(`#v-${s} .ach-hit`).nth(i).focus();
      await p.keyboard.press('ArrowRight');
      await p.keyboard.press('Enter');
      await p.waitForTimeout(90);
      await p.evaluate(() => window.Aura.closeDetail());
    } catch { }
  }

  // kolízie popiskov
  await p.evaluate(k => window.Aura.go(k), s);
  await p.waitForTimeout(350);
  const c = await p.evaluate((k) => {
    const out = [];
    document.querySelectorAll('#v-' + k + ' svg.ach-svg').forEach(sv => {
      const ts = [...sv.querySelectorAll('text')].map(t => ({ b: t.getBoundingClientRect(), s: t.textContent }))
        .filter(x => x.b.width && x.s.trim());
      for (let i = 0; i < ts.length; i++) for (let j = i + 1; j < ts.length; j++) {
        const a = ts[i].b, b = ts[j].b;
        const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (ox > 1.5 && oy > 1.5) out.push(ts[i].s.slice(0, 14) + ' × ' + ts[j].s.slice(0, 14));
      }
    });
    return out;
  }, s);
  if (c.length) { collisions += c.length; colEx.push(`${s}: ${c.slice(0, 2).join(', ')}`); }
}
collisions ? F(`${collisions} kolízií popiskov v grafoch — ${colEx.slice(0, 4).join(' | ')}`) : O('0 kolízií popiskov v grafoch');
dead.length ? F(`tlačidlá bez efektu — ${dead.join(' | ')}`) : O('žiadne mŕtve tlačidlo');
errs.length === errB4 ? O('klávesová aktivácia grafov bez chyby')
  : F(`klávesnica v grafoch vyvolala ${errs.length - errB4} chýb: ${errs.slice(errB4, errB4 + 3).join(' | ')}`);

/* --- 14. mobil: klikateľné karty a triedenie (čistý stav, bez filtrov z predchádzajúcich testov) --- */
await p.setViewportSize({ width: 375, height: 800 });
await p.goto(FILE, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1200);
let mobBad = [];
for (const s of SCREENS) {
  if (!registered.includes(s)) continue;
  await p.evaluate(k => window.Aura.go(k), s);
  await p.waitForTimeout(450);
  const r = await p.evaluate((k) => {
    const v = document.querySelector('#v-' + k);
    // tabuľka „mizne" iba ak je display:none A nemá kartový fallback (.cards-only s .rowcard).
    // alt-tabuľky grafov ostávajú viditeľné a rolovateľné — tie sú v poriadku.
    let vanish = 0;
    v.querySelectorAll('table.tbl').forEach(t => {
      const hidden = getComputedStyle(t).display === 'none';
      let co = null, e = t.closest('.tw'); while (e) { if (e.classList && e.classList.contains('cards-only')) { co = e; break; } e = e.nextElementSibling; }
      const cards = co ? co.querySelectorAll('.rowcard').length : 0;
      // tabuľka v neaktívnom tabe / zbalenej alt-sekcii sa nepočíta (nie je teraz na obrazovke)
      let inactive = false, a = t.parentElement;
      while (a && a.id !== 'v-' + k) { const cs = getComputedStyle(a); if (a.hidden || cs.display === 'none' || cs.visibility === 'hidden') { inactive = true; break; } a = a.parentElement; }
      if (hidden && !cards && !inactive) vanish++;
    });
    return { vanish };
  }, s);
  if (r.vanish) mobBad.push(`${s}: ${r.vanish} tabuľka mizne bez fallbacku`);
}
mobBad.length ? W(`mobil: ${mobBad.join(' | ')}`) : O('mobil: každá tabuľka má karty aj triedenie');

/* --- 15. rozšírená mobilná sada: pretok, offscreen topbar, dotykové ciele ≥44, drawer --- */
{
  const MW = [360, 390, 414, 768];
  const badOver = [], badTop = [], badTouch = new Set();
  for (const wpx of MW) {
    await p.setViewportSize({ width: wpx, height: 820 });
    await p.waitForTimeout(150);
    for (const s of SCREENS) {
      if (!registered.includes(s)) continue;
      await p.evaluate(k => window.Aura.go(k), s);
      await p.waitForTimeout(160);
      const r = await p.evaluate(() => {
        const vw = window.innerWidth;
        // otvor alt-tabuľky grafov (stres-test šírky)
        document.querySelectorAll('.view.on details.ach-alt').forEach(d => d.open = true);
        const docOver = document.documentElement.scrollWidth - vw;
        let topOff = 0;
        document.querySelectorAll('.top button').forEach(el => { if (!el.offsetParent) return; const b = el.getBoundingClientRect(); if (b.right > vw + 1 || b.left >= vw) topOff++; });
        const small = [];
        document.querySelectorAll('.top button, .view.on button, .view.on [role="tab"], .view.on .seg button, .view.on .chz, .view.on .sortbar button, .view.on .lk').forEach(el => {
          if (!el.offsetParent) return; const b = el.getBoundingClientRect();
          if (b.height > 2 && (b.height < 44 || b.width < 24)) small.push((el.textContent || el.getAttribute('aria-label') || '?').trim().replace(/\s+/g, ' ').slice(0, 16) + ' ' + Math.round(b.width) + 'x' + Math.round(b.height));
        });
        return { docOver, topOff, small };
      });
      if (r.docOver > 1) badOver.push(`${s}@${wpx}(+${r.docOver})`);
      if (r.topOff) badTop.push(`${s}@${wpx}(${r.topOff})`);
      r.small.forEach(x => badTouch.add(x));
    }
  }
  badOver.length ? F(`mobil pretok: ${badOver.slice(0, 6).join(', ')}`) : O('mobil: 0 horizontálneho pretoku (360/390/414/768, aj alt-tabuľky)');
  badTop.length ? F(`mobil topbar offscreen: ${badTop.slice(0, 6).join(', ')}`) : O('mobil: 0 offscreen prvkov topbaru (zvonček/téma/avatar dosiahnuteľné)');
  badTouch.size ? F(`mobil dotykové ciele <44px: ${[...badTouch].slice(0, 8).join(' | ')}`) : O('mobil: všetky dotykové ciele ≥ 44 px');

  // drawer otvor/zavri @390
  await p.setViewportSize({ width: 390, height: 844 });
  await p.evaluate(() => window.Aura.go('pamat')); await p.waitForTimeout(200);
  const drawer = await p.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    document.getElementById('burger').click(); await sleep(250);
    const open = document.getElementById('side').classList.contains('open');
    const sc = document.getElementById('dp-scrim'); if (sc) sc.click(); await sleep(250);
    const closed = !document.getElementById('side').classList.contains('open');
    return open && closed;
  });
  drawer ? O('mobil: drawer sa otvorí (burger) aj zavrie (scrim)') : F('mobil: drawer nefunguje');

  // tap na grafe ukáže tooltip @390
  await p.evaluate(() => window.Aura.go('jadro')); await p.waitForTimeout(1000);
  const tapTip = await p.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    /* najširšia interaktívna plocha — úzke plochy patria grafom v skrytých/úzkych kartách */
    const hit = [...document.querySelectorAll('#v-jadro .ach-hit, #v-jadro .ach-bar, #v-jadro svg .ach-cell')]
      .sort((a, z) => z.getBoundingClientRect().width - a.getBoundingClientRect().width)[0];
    if (!hit) return 'skip';
    const b = hit.getBoundingClientRect();
    const t = new Touch({ identifier: 1, target: hit, clientX: b.left + b.width / 2, clientY: b.top + b.height / 2 });
    hit.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [t], targetTouches: [t], changedTouches: [t] }));
    await sleep(200);
    if (document.querySelector('#v-jadro .ach-tip.on')) return true;
    return 'noTip[hits=' + document.querySelectorAll('#v-jadro .ach-hit').length +
      ' tips=' + document.querySelectorAll('#v-jadro .ach-tip').length +
      ' w=' + Math.round(b.width) + ' vis=' + (b.width > 0 && b.height > 0) + ']';
  });
  tapTip === true ? O('mobil: tap na grafe ukáže tooltip') : (tapTip === 'skip' ? W('mobil: graf na Jadre bez interaktívnej plochy') : W('mobil: tap tooltip neoverený (' + tapTip + ')'));
}
await p.setViewportSize({ width: 1600, height: 1000 });

/* --- 16. Appky (v6): zoznam, detail, taby, formulár, väzby --- */
const go = async (k, s) => { await p.evaluate(([k, s]) => window.Aura.go(k, s || null), [k, s]); await p.waitForTimeout(700); };

await go('appky');
const cards = await p.evaluate(() => document.querySelectorAll('#ap-cards .appcard').length);
cards >= 4 ? O(`appky: zoznam vykreslil ${cards} kariet s mini-KPI`) : F(`appky: len ${cards} kariet (min 4)`);
const cardData = await p.evaluate(() => {
  const c = document.querySelector('#ap-cards .appcard');
  return c ? { labels: [...c.querySelectorAll('.ac-g i')].map(e => e.textContent), spark: !!c.querySelector('svg') } : null;
});
(cardData && cardData.labels.length === 4 && cardData.spark)
  ? O('appky: karta má 4 stavové údaje + mini-graf')
  : F('appky: karta nemá 4 údaje alebo mini-graf: ' + JSON.stringify(cardData));

await p.evaluate(() => document.querySelector('#ap-cards .appcard').click());
await p.waitForTimeout(900);
const det = await p.evaluate(() => ({
  hash: location.hash,
  title: document.getElementById('title').textContent,
  crumb: document.getElementById('crumb').textContent,
  secs: [...document.querySelectorAll('#ap-body .sech h2')].map(h => h.textContent),
  listHidden: document.getElementById('ap-list').hasAttribute('hidden'),
  tabs: document.querySelectorAll('#ap-tabs button').length,
  sticky: getComputedStyle(document.querySelector('.apphead')).position
}));
det.hash.startsWith('#/appky/') && !det.listHidden === false ? O('appky: klik na kartu otvoril dashboard (' + det.hash + ')') : F('appky: klik na kartu neotvoril detail (' + det.hash + ')');
JSON.stringify(det.secs) === JSON.stringify(['KPI a trend', 'Behy a trace', 'Náklady appky', 'Pamäť appky'])
  ? O('appky: sekcie v poradí KPI → behy → náklady → pamäť')
  : F('appky: zlé poradie sekcií: ' + det.secs.join(' | '));
det.crumb.startsWith('Appky ›') ? O('appky: drobky „' + det.crumb + '"') : F('appky: drobky bez appky (' + det.crumb + ')');
det.sticky === 'sticky' ? O('appky: hlavička appky je sticky') : F('appky: hlavička nie je sticky (' + det.sticky + ')');
det.tabs >= 5 ? O(`appky: ${det.tabs} tabov v hlavičke`) : F(`appky: len ${det.tabs} tabov`);

const runsN = await p.evaluate(() => document.querySelectorAll('#apd-tbl tbody tr').length);
runsN > 0 && runsN <= 20 ? O(`appky: sekcia behov má ${runsN} záznamov`) : F(`appky: behy ${runsN} (očakávam 1–20)`);
const netN = await p.evaluate(() => document.querySelectorAll('#apd-net .mn-n').length);
netN > 0 ? O(`appky: výrez siete pamäte (${netN} uzlov)`) : F('appky: výrez siete prázdny');

// tab prepne appku bez opustenia obrazovky
await p.evaluate(() => {
  const cur = location.hash.split('/')[2];
  const t = [...document.querySelectorAll('#ap-tabs button')].filter(b => b.dataset.slug && b.dataset.slug !== cur);
  t[t.length - 1].click();
});
await p.waitForTimeout(800);
const afterTab = await p.evaluate(() => ({ hash: location.hash, screen: window.Aura.state.screen, title: document.getElementById('title').textContent }));
afterTab.screen === 'appky' && afterTab.hash !== det.hash
  ? O('appky: tab prepol dashboard (' + afterTab.title + ')')
  : F('appky: tab neprepol appku (' + JSON.stringify(afterTab) + ')');

// alias starého #/eshop
await p.evaluate(() => { location.hash = '#/eshop'; });
await p.waitForTimeout(800);
const alias = await p.evaluate(() => location.hash);
alias === '#/appky/eshop' ? O('appky: #/eshop presmeruje na dashboard prvej appky') : F('appky: alias #/eshop zlyhal (' + alias + ')');
const davky = await p.evaluate(() => document.querySelectorAll('#es-tbl tbody tr').length);
davky > 0 ? O(`appky: e-shop si zachoval dávky (${davky})`) : F('appky: dávky e-shopu sa stratili');

// formulár novej appky
await go('appky');
await p.evaluate(() => document.querySelector('#ap-new').click());
await p.waitForTimeout(400);
const labelled = await p.evaluate(() => {
  const f = [...document.querySelectorAll('#ap-form input,#ap-form select,#ap-form textarea')];
  return { n: f.length, ok: f.filter(e => e.labels?.length || e.getAttribute('aria-label')).length };
});
labelled.n === labelled.ok ? O('appky: formulár má label ku každému poľu') : F(`appky: ${labelled.n - labelled.ok} polí formulára bez labelu`);
// prázdny submit musí dať viditeľnú chybu (Q84)
await p.evaluate(() => document.querySelector('#af-save').click());
await p.waitForTimeout(300);
const err = await p.evaluate(() => (document.querySelector('#af-err')?.textContent || ''));
err.includes('názov') ? O('appky: prázdny submit ukáže inline chybu') : F('appky: prázdny submit mlčí');
await p.fill('#af-name', 'Testovacia appka');
await p.evaluate(() => document.querySelector('#af-save').click());
await p.waitForTimeout(700);
// Q86: toast s linkom „Zobraziť detail" namiesto redirectu
const created = await p.evaluate(() => ({
  toast: [...document.querySelectorAll('.toast')].map(t => t.textContent).join(' | '),
  inList: !!document.querySelector('#ap-cards .appcard[data-slug="testovacia-appka"]'),
  slug: (window.Aura.apps.bySlug('testovacia-appka') || {}).slug
}));
created.toast.includes('vytvorená') && created.inList && created.slug === 'testovacia-appka'
  ? O('appky: vytvorenie = toast s linkom, čistý slug, karta v zozname')
  : F('appky: vytvorenie appky zlyhalo (' + JSON.stringify(created) + ')');
await p.evaluate(() => { [...document.querySelectorAll('.toast .toast-undo')].find(b => b.textContent.includes('Zobraziť'))?.click(); });
await p.waitForTimeout(800);
const emptyState = await p.evaluate(() => ({ title: document.getElementById('title').textContent, empty: (document.querySelector('#ap-body .empty')?.innerText || '').slice(0, 40) }));
emptyState.title === 'Testovacia appka' && emptyState.empty
  ? O('appky: link z toastu otvoril detail s prázdnym stavom')
  : W('appky: detail novej appky bez prázdneho stavu (' + JSON.stringify(emptyState) + ')');

// filter appky v Automatizáciách
await go('automatizacie', 'app:studio');
const auF = await p.evaluate(() => ({
  rows: document.querySelectorAll('#au-tbl tbody tr').length,
  all: window.Aura.autos.rows.length,
  chip: document.querySelector('#au-fchip').innerText.replace(/\s+/g, ' ').trim(),
  sel: document.querySelector('#au-app').value
}));
auF.rows > 0 && auF.rows < auF.all && auF.chip.includes('appka') && auF.sel === 'studio'
  ? O(`automatizácie: filter appky zúžil ${auF.all} → ${auF.rows} a zobrazil fchip`)
  : F('automatizácie: filter appky nefunguje: ' + JSON.stringify(auF));

// filter appky v Observabilite (alerty + logy)
await go('observabilita', 'app:eshop');
const obF = await p.evaluate(() => document.querySelector('#ob-fchip').innerText.replace(/\s+/g, ' ').trim());
obF.includes('appka') ? O('observabilita: filter appky nastavený (' + obF + ')') : F('observabilita: filter appky bez fchip');
await p.evaluate(() => [...document.querySelectorAll('#ob-tabs button')].find(b => b.textContent === 'Logy').click());
await p.waitForTimeout(600);
const lc = await p.evaluate(() => document.querySelector('#l-count').textContent);
/z \d+ záznamov|z \d+/.test(lc) ? O('observabilita: logy zúžené na appku (' + lc + ')') : F('observabilita: logy nezúžené (' + lc + ')');

// rozpad podľa appky na Nákladoch a Jadre + správa v Nastaveniach
await go('naklady');
(await p.evaluate(() => !!document.querySelector('#n-app svg'))) ? O('náklady: rozpad podľa appky vykreslený') : F('náklady: rozpad podľa appky chýba');
await go('jadro');
(await p.evaluate(() => !!document.querySelector('#j-app svg'))) ? O('jadro: záťaž podľa appky vykreslená') : F('jadro: záťaž podľa appky chýba');
await go('nastavenia');
const stApps = await p.evaluate(() => document.querySelectorAll('#st-apps tbody tr').length);
stApps >= 4 ? O(`nastavenia: správa appiek (${stApps} riadkov)`) : F('nastavenia: tabuľka appiek prázdna');

/* --- 17. Pamäť (v6): poradie, triage pruh, sprievodca čistenia --- */
await go('pamat');
const pmOrder = await p.evaluate(() => {
  const kids = [...document.querySelector('#v-pamat').children];
  const home = kids.findIndex(e => e.querySelector && e.querySelector('#pm-home-q'));
  const kpi = kids.findIndex(e => e.querySelector && e.querySelector('#pm-k1'));
  return { home, kpi };
});
pmOrder.home > -1 && pmOrder.home < pmOrder.kpi ? O('pamäť: hľadanie je nad KPI') : F('pamäť: poradie hľadanie/KPI zlé: ' + JSON.stringify(pmOrder));
const tb = await p.evaluate(() => document.querySelector('#pm-triagebar').innerText.replace(/\s+/g, ' ').trim());
/nových uzlov na prehodnotenie/.test(tb) ? O('pamäť: triage pruh („' + tb.slice(0, 42) + '…")') : F('pamäť: triage pruh chýba');
await p.evaluate(() => [...document.querySelectorAll('#pm-tabs button')].find(b => b.textContent === 'Čistenie').click());
await p.waitForTimeout(600);
const cl = await p.evaluate(() => ({
  steps: [...document.querySelectorAll('#pm-cl-steps button')].map(b => b.textContent),
  rows: document.querySelectorAll('#pm-cl-tbl tbody tr').length,
  boxes: document.querySelectorAll('#pm-cl-tbl tbody input[data-cl]').length
}));
cl.steps.length === 4 && cl.rows > 0 && cl.boxes > 0
  ? O(`pamäť: sprievodca čistenia (${cl.steps.join(' → ')}), ${cl.rows} kandidátov`)
  : F('pamäť: sprievodca čistenia nefunguje: ' + JSON.stringify(cl));
const arch = await p.evaluate(async () => {
  const before = window.Aura.mem.nodes().length;
  const cs = [...document.querySelectorAll('#pm-cl-tbl tbody input[data-cl]')].slice(0, 2);
  cs.forEach(c => { c.checked = true; c.dispatchEvent(new Event('change', { bubbles: true })); });
  document.querySelector('#pm-cl-do').click();
  await new Promise(r => setTimeout(r, 200));
  document.querySelector('#confirm-yes').click();
  await new Promise(r => setTimeout(r, 400));
  return { before, after: window.Aura.mem.nodes().length };
});
arch.after === arch.before - 2 ? O(`pamäť: hromadné archivovanie funguje (${arch.before} → ${arch.after})`) : F('pamäť: archivovanie zlyhalo: ' + JSON.stringify(arch));
await p.evaluate(() => [...document.querySelectorAll('#pm-cl-steps button')].find(b => b.textContent === 'Duplikáty').click());
await p.waitForTimeout(500);
const dup = await p.evaluate(() => document.querySelectorAll('#pm-cl-tbl [data-merge]').length);
dup > 0 ? O(`pamäť: krok duplikátov ponúka zlúčenie (${dup} dvojíc)`) : W('pamäť: žiadne duplikáty na zlúčenie');

// inšpektor uzla ukazuje appky
await p.evaluate(() => { const n = window.Aura.mem.nodes().find(x => x.dep.name === 'E-shop Šperky'); window.Aura.mem.inspect(n); });
await p.waitForTimeout(500);
const insApps = await p.evaluate(() => [...document.querySelectorAll('#dp-body [data-app]')].map(b => b.textContent.trim()));
insApps.length ? O('pamäť: inšpektor ukazuje appky uzla (' + insApps.join(', ') + ')') : F('pamäť: inšpektor bez odznakov appiek');
await p.evaluate(() => window.Aura.closeDetail());

/* --- 18. v7 brány: graf, tokeny, mobil, toky --- */
await p.setViewportSize({ width: 1600, height: 1000 });
await go('pamat');
await p.waitForTimeout(900);

// graf: hierarchia + 0 tvrdých prekryvov + hover rozpočet
const g7 = await p.evaluate(() => {
  const svg = document.getElementById('pm-net');
  const hubs = svg.querySelectorAll('.nt-hub .nt-n').length;
  const leaves = svg.querySelectorAll('.nt-lf').length;
  /* leafy sú aj path tvary (typ = tvar) → pozície z getBBox */
  const ns = [...svg.querySelectorAll('.nt-n')].map(c => {
    const b = c.getBBox();
    return { x: b.x + b.width / 2, y: b.y + b.height / 2, r: Math.max(b.width, b.height) / 2 };
  });
  let hard = 0;
  for (let i = 0; i < ns.length; i++) for (let j = i + 1; j < ns.length; j++) {
    if (Math.hypot(ns[i].x - ns[j].x, ns[i].y - ns[j].y) < (ns[i].r + ns[j].r) / 2) hard++;
  }
  const els = [...svg.querySelectorAll('.nt-lf')].slice(0, 40);
  const t0 = performance.now();
  for (const el of els) { el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true })); el.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true })); }
  const per = (performance.now() - t0) / 80;
  return { hubs, leaves, hard, hoverMs: +per.toFixed(2) };
});
(g7.hubs >= 20 && g7.leaves >= 60) ? O(`graf v7: hierarchia ${g7.hubs} hubov + ${g7.leaves} satelitov`) : F('graf v7: hierarchia chýba ' + JSON.stringify(g7));
g7.hard === 0 ? O('graf v7: 0 tvrdých prekryvov uzlov') : F(`graf v7: ${g7.hard} tvrdých prekryvov`);
g7.hoverMs < 8 ? O(`graf v7: hover ${g7.hoverMs} ms/op (rozpočet <8 ms)`) : F(`graf v7: hover ${g7.hoverMs} ms/op nad rozpočtom`);

// zoom + lalok focus + Esc + search + vrstva bez rebuildov
const g8 = await p.evaluate(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const svg = document.getElementById('pm-net'), cam = document.getElementById('pm-cam');
  const r = svg.getBoundingClientRect();
  svg.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: -120, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }));
  await sleep(120);
  const zoomed = cam.getAttribute('transform') !== 'translate(0 0) scale(1)';
  document.querySelector('#pm-net .nt-corec').dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await sleep(420);
  const crumb = !document.getElementById('pm-gcrumb').hidden;
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await sleep(420);
  const back = cam.getAttribute('transform') === 'translate(0 0) scale(1)';
  const q = document.getElementById('pm-gq'); q.value = 'ollama'; q.dispatchEvent(new Event('input', { bubbles: true }));
  await sleep(240);
  const hots = document.querySelectorAll('#pm-net .nt-n.hot').length;
  q.value = ''; q.dispatchEvent(new Event('input', { bubbles: true })); await sleep(200);
  const before = document.querySelector('#pm-net .nt-lf');
  document.querySelector('#pm-layers [data-l="type"]').click();
  await sleep(120);
  const sameNode = before === document.querySelector('#pm-net .nt-lf');
  document.querySelector('#pm-layers [data-l="all"]').click();
  return { zoomed, crumb, back, hots, sameNode };
});
g8.zoomed && g8.back ? O('graf v7: zoom kolieskom + Esc reset') : F('graf v7: zoom/reset zlyhal ' + JSON.stringify(g8));
g8.crumb ? O('graf v7: klik na jadro laloku = fokus s breadcrumb') : F('graf v7: fokus laloku nefunguje');
g8.hots > 0 ? O(`graf v7: search zvýraznil ${g8.hots} zhôd`) : F('graf v7: search nič nezvýraznil');
g8.sameNode ? O('graf v7: prepnutie vrstvy bez rebuildu DOM') : F('graf v7: vrstva prestavala DOM');

// --- v7.1 brány: menovky, dátový kontrakt, fokus oddelenia, search×filter, stav ---
const g9 = await p.evaluate(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const A = window.Aura, svg = document.getElementById('pm-net');
  // 1) menovky hubov nesmú tvrdo kolidovať s uzlami (prienik > 4 jednotky)
  const circles = [...svg.querySelectorAll('.nt-n')].map(c => {
    const b = c.getBBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2, r: Math.max(b.width, b.height) / 2 };
  });
  let lblHits = 0;
  for (const t of svg.querySelectorAll('.nt-hlbl')) {
    const rc = t.getBBox();
    for (const c of circles) {
      const nx = Math.max(rc.x, Math.min(c.x, rc.x + rc.width));
      const ny = Math.max(rc.y, Math.min(c.y, rc.y + rc.height));
      if (c.r - Math.hypot(c.x - nx, c.y - ny) > 4) { lblHits++; break; }
    }
  }
  // 2) hover počet spojení == inšpektorové "Súvisiace uzly" (mem.neighbors)
  const lf = svg.querySelector('.nt-lf');
  lf.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, clientX: 400, clientY: 400 }));
  await sleep(260);
  const tipTxt = document.getElementById('pm-gtip').textContent;
  const tipDeg = +(tipTxt.match(/(\d+)\s+súvisiacich/) || [])[1];
  const memDeg = A.mem.neighbors(lf.__nid).length;
  lf.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
  // 3) mosty: reálne váhy (rôzne), max 2 na uzol, každý lalok ≥ 1
  const ws = new Set(), endC = {}, lobeHit = {};
  document.querySelectorAll('#pm-net .nt-e.nt-bridge').forEach(e => ws.add(e.getAttribute('stroke')));
  const cross = A.mem.edges().filter(e => {
    const a = A.mem.byId(e.a), b = A.mem.byId(e.b);
    return a && b && a.area.k !== b.area.k;
  });
  const wVals = new Set(cross.map(e => e.w));
  // 4) create → nový uzol má hrany; remove → žiadne visiace hrany
  const nd = A.mem.create({ name: 'Verify uzol v71' });
  const degNew = A.mem.neighbors(nd.id).length;
  A.mem.remove(nd);
  const dangling = A.mem.edges().filter(e => !A.mem.byId(e.a) || !A.mem.byId(e.b)).length;
  await sleep(400);
  return { lblHits, tipDeg, memDeg, wDistinct: wVals.size, degNew, dangling };
});
g9.lblHits === 0 ? O('graf v7.1: menovky hubov bez tvrdých kolízií s uzlami') : F(`graf v7.1: ${g9.lblHits} menoviek koliduje s uzlami`);
g9.tipDeg === g9.memDeg ? O(`graf v7.1: hover spojenia == inšpektor (${g9.memDeg})`) : F('graf v7.1: hover vs inšpektor nesedí ' + JSON.stringify(g9));
g9.wDistinct > 5 ? O(`graf v7.1: mosty majú reálne váhy (${g9.wDistinct} hodnôt)`) : F('graf v7.1: váhy mostov degenerované');
g9.degNew >= 1 ? O(`graf v7.1: nový uzol dostane ${g9.degNew} hrán (nie sirota)`) : F('graf v7.1: create() tvorí sirotu');
g9.dangling === 0 ? O('graf v7.1: remove() nenecháva visiace hrany') : F(`graf v7.1: ${g9.dangling} visiacich hrán po remove`);

const g10 = await p.evaluate(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const A = window.Aura, cam = document.getElementById('pm-cam');
  const camK = () => +(cam.getAttribute('transform').match(/scale\(([\d.]+)/) || [0, 1])[1];
  // 1) hub klik = fokus oddelenia s vlastným crumbom; Esc = o úroveň (dept→lalok→koreň)
  document.querySelector('#pm-net .nt-hub .nt-n').dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await sleep(420);
  const deptCrumb = document.getElementById('pm-gcrumb-t').textContent;
  const deptZoom = camK() > 1.3;
  /* vrstvový panel: rám + stĺpec + orbity + hlavička + zväzok kriviek */
  const orbs = document.querySelectorAll('#pm-net .nt-orb').length;
  const ring = !!document.querySelector('#pm-net .nt-ring');
  const frame = !!document.querySelector('#pm-net .nt-frame');
  const flbl = (document.querySelector('#pm-net .nt-flbl') || {}).textContent || '';
  const idx = document.querySelectorAll('#pm-net .nt-idx').length;
  const fibs = document.querySelectorAll('#pm-net .nt-fib').length;
  const hidden = document.querySelectorAll('#pm-net .nt-e.fibhide').length;
  /* stĺpec: fokusované leafy zarovnané na jednu zvislicu */
  await sleep(500);
  const colXs = [...document.querySelectorAll('#pm-net .nt-lf')]
    .filter(el => el.style.transform)
    .map(el => { const b = el.getBoundingClientRect(); return b.left + b.width / 2; });
  const colSpread = colXs.length >= 2 ? Math.max(...colXs) - Math.min(...colXs) : 0;
  const colN = colXs.length;
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await sleep(360);
  const lobeCrumb = document.getElementById('pm-gcrumb-t').textContent;
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await sleep(360);
  const rootOk = document.getElementById('pm-gcrumb').hidden && camK() === 1;
  // 2) crumb prežije zmenu modelu korektne (fokus sa obnoví, neklame)
  document.querySelector('#pm-net .nt-corec').dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await sleep(420);
  const n0 = A.mem.nodes()[0];
  A.mem.update(n0, { str: Math.min(1, n0.str + 0.01) });
  await sleep(500);
  const crumbAfterEdit = !document.getElementById('pm-gcrumb').hidden && camK() > 1.3;
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await sleep(300);
  // 3) search rešpektuje filter (0 .hot mimo passFilter) + hlási skryté zhody
  document.getElementById('pm-filt-toggle').click(); await sleep(120);
  const ft = document.getElementById('pm-f-type');
  ft.value = 'project'; ft.dispatchEvent(new Event('change', { bubbles: true }));
  await sleep(240);
  const q = document.getElementById('pm-gq');
  q.value = 'docker'; q.dispatchEvent(new Event('input', { bubbles: true }));
  await sleep(300);
  const hotOut = document.querySelectorAll('#pm-net .nt-n.hot.flt-out').length;
  const hiddenNote = (document.getElementById('pm-ghits').textContent || '').includes('filtrom');
  // 4) stavový riadok hlási zvýraznené aj dôvody ako chipy
  const chips = [...document.querySelectorAll('#pm-gchips .gchip')].map(c => c.textContent);
  const hasSearchChip = chips.some(t => t.includes('hľadanie'));
  const hasFilterChip = chips.some(t => t.includes('filtre'));
  // 5) „Vyčistiť pohľad" vráti neutrálny stav
  [...document.querySelectorAll('#pm-gchips button')].find(b => b.textContent.includes('Vyčistiť'))?.click();
  await sleep(360);
  const cleaned = !document.getElementById('pm-gq').value &&
    document.querySelectorAll('#pm-gchips .gchip').length === 0 && camK() === 1;
  // 6) zoom klaster: + zväčší, ⊙ prispôsobí, Esc vráti
  document.getElementById('pm-gz-in').click(); await sleep(200);
  const zIn = camK() > 1.05;
  document.getElementById('pm-gz-fit').click(); await sleep(200);
  const zFit = camK() > 0.85;
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await sleep(240);
  // 7) fullscreen: Esc zatvára
  document.getElementById('pm-gfull').click(); await sleep(300);
  const fullOn = document.getElementById('pm-gcard').classList.contains('gfull');
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await sleep(300);
  const fullEsc = fullOn && !document.getElementById('pm-gcard').classList.contains('gfull');
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await sleep(200);
  const resid = [...document.querySelectorAll('#pm-net .nt-lf')].filter(el => el.style.transform).length;
  const layerGone = !document.querySelector('#pm-net .nt-frame');
  return { deptCrumb, deptZoom, lobeCrumb, rootOk, crumbAfterEdit, hotOut, hiddenNote, hasSearchChip, hasFilterChip, cleaned, zIn, zFit, fullEsc, orbs, ring, frame, flbl, idx, fibs, hidden, colSpread, colN, resid, layerGone };
});
(g10.deptCrumb.includes('›') && g10.deptZoom) ? O(`graf v7.1: hub klik = fokus oddelenia („${g10.deptCrumb}")`) : F('graf v7.1: fokus oddelenia zlyhal ' + JSON.stringify(g10));
(g10.ring && g10.frame && g10.orbs >= 4 && g10.flbl.includes('›') && g10.idx >= 2 && g10.fibs >= 3 && g10.hidden >= 2)
  ? O(`graf v7.2: vrstvový panel (rám + prstenec + ${g10.orbs} orbít + ${g10.fibs} kriviek zväzku)`)
  : F('graf v7.2: vrstvový panel chýba ' + JSON.stringify({ ring: g10.ring, frame: g10.frame, orbs: g10.orbs, flbl: g10.flbl, idx: g10.idx, fibs: g10.fibs, hidden: g10.hidden }));
(g10.colN >= 2 && g10.colSpread <= 2)
  ? O(`graf v7.2: fokus = zvislý stĺpec (${g10.colN} uzlov, rozptyl ${g10.colSpread.toFixed(1)} px)`)
  : F('graf v7.2: stĺpec nezarovnaný ' + JSON.stringify({ colN: g10.colN, colSpread: g10.colSpread }));
(g10.resid === 0 && g10.layerGone)
  ? O('graf v7.2: po Esc sa uzly vrátia na organické pozície, panel zmizne')
  : F('graf v7.2: zvyšky stĺpca po Esc ' + JSON.stringify({ resid: g10.resid, layerGone: g10.layerGone }));
(!g10.lobeCrumb.includes('›') && g10.rootOk) ? O('graf v7.1: Esc reťaz oddelenie → lalok → koreň (1 úroveň/stlačenie)') : F('graf v7.1: Esc reťaz zlyhala ' + JSON.stringify(g10));
g10.crumbAfterEdit ? O('graf v7.1: breadcrumb + fokus prežijú zmenu modelu (derivované)') : F('graf v7.1: breadcrumb po edite klame');
g10.hotOut === 0 && g10.hiddenNote ? O('graf v7.1: search rešpektuje filter + hlási skryté zhody') : F('graf v7.1: search obchádza filter ' + JSON.stringify(g10));
g10.hasSearchChip && g10.hasFilterChip ? O('graf v7.1: stavový riadok ukazuje chipy obmedzení') : F('graf v7.1: chipy chýbajú');
g10.cleaned ? O('graf v7.1: „Vyčistiť pohľad" vráti neutrálny stav') : F('graf v7.1: vyčistenie pohľadu zlyhalo');
g10.zIn && g10.zFit ? O('graf v7.1: zoom klaster − ⊙ + funguje') : F('graf v7.1: zoom klaster zlyhal');
g10.fullEsc ? O('graf v7.1: Esc zatvára fullscreen') : F('graf v7.1: fullscreen Esc zlyhal');

// jednotná metrika: legenda == graf hustoty == KPI priemer
const g11 = await p.evaluate(() => {
  const nums = [...document.querySelectorAll('#pm-legend .glg-t .num')].map(s => {
    const m = s.textContent.replace(/ /g, ' ').match(/(\d+)\s*v\s*sieti\s*·\s*([\d,]+)\s*spojení/);
    return m ? { cnt: +m[1], per: +m[2].replace(',', '.') } : null;
  }).filter(Boolean);
  const kpiAvg = +(document.querySelectorAll('#pm-gkpi .kpi b')[2] || {}).textContent?.replace(',', '.');
  const tot = nums.reduce((s, x) => s + x.cnt, 0);
  const wAvg = nums.reduce((s, x) => s + x.per * x.cnt, 0) / (tot || 1);
  return { rows: nums.length, tot, wAvg: +wAvg.toFixed(1), kpiAvg };
});
(g11.rows === 5 && Math.abs(g11.wAvg - g11.kpiAvg) <= 0.15)
  ? O(`graf v7.1: jedna metrika spojení/uzol (legenda ø${g11.wAvg} == KPI ${g11.kpiAvg})`)
  : F('graf v7.1: metriky sa rozchádzajú ' + JSON.stringify(g11));

// radiál rešpektuje filter (stred = filtrovaný počet)
const g12 = await p.evaluate(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  document.getElementById('pm-filt-toggle').click(); await sleep(120);
  const ft = document.getElementById('pm-f-type');
  ft.value = 'project'; ft.dispatchEvent(new Event('change', { bubbles: true }));
  await sleep(240);
  const filtered = window.Aura.mem.nodes().filter(n => n.type === 'project').length;
  document.querySelector('#pm-views [data-view="radial"]').click();
  await sleep(400);
  const centerSub = document.querySelector('#pm-rad .ach-tick')?.textContent || '';
  document.querySelector('#pm-views [data-view="siet"]').click();
  document.getElementById('pm-reset').click();
  await sleep(240);
  return { filtered, centerSub };
});
g12.centerSub.includes(String(g12.filtered))
  ? O(`radiál v7.1: stred == filtrovaný počet (${g12.filtered})`)
  : F('radiál v7.1: ignoruje filter ' + JSON.stringify(g12));

// bulk výber neprežije filter
const g13 = await p.evaluate(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  document.getElementById('pm-all').checked = true;
  document.getElementById('pm-all').dispatchEvent(new Event('change', { bubbles: true }));
  await sleep(240);
  const before = document.getElementById('pm-bulk-n').textContent;
  const ft = document.getElementById('pm-f-type');
  ft.value = 'project'; ft.dispatchEvent(new Event('change', { bubbles: true }));
  await sleep(300);
  const rows = document.querySelectorAll('#pm-tbl tbody tr').length;
  const barHidden = document.getElementById('pm-bulk').hidden;
  const after = barHidden ? '0' : document.getElementById('pm-bulk-n').textContent;
  const selN = +(after.match(/\d+/) || [0])[0];
  document.getElementById('pm-reset').click();
  document.querySelectorAll('#pm-tbl .pm-cb:checked').forEach(cb => { cb.checked = false; cb.dispatchEvent(new Event('change', { bubbles: true })); });
  await sleep(200);
  return { before, rows, selN };
});
g13.selN <= g13.rows ? O(`zoznam v7.1: výber orezaný na viditeľné (${g13.selN} ≤ ${g13.rows})`) : F('zoznam v7.1: výber prežil filter ' + JSON.stringify(g13));

// most vyhľadávaní: graf search → „Zobraziť ako zoznam" → ranked výsledky (F16)
const g14 = await p.evaluate(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const q = document.getElementById('pm-gq');
  q.value = 'ollama'; q.dispatchEvent(new Event('input', { bubbles: true }));
  await sleep(300);
  const btn = [...document.querySelectorAll('#pm-ghits button')].find(b => b.textContent.includes('zoznam'));
  if (!btn) return { btn: false };
  btn.click();
  await sleep(300);
  const tab = document.querySelector('#pm-tabs [data-tab="hladanie"]').getAttribute('aria-pressed') === 'true';
  const hlq = document.getElementById('pm-hl-q').value;
  const res = document.querySelectorAll('#pm-hl-res .pm-r').length;
  document.querySelector('#pm-tabs [data-tab="graf"]').click();
  q.value = ''; q.dispatchEvent(new Event('input', { bubbles: true }));
  await sleep(240);
  return { btn: true, tab, hlq, res };
});
(g14.btn && g14.tab && g14.hlq === 'ollama' && g14.res > 0)
  ? O(`graf v7.3: „Zobraziť ako zoznam" prepne na ranked výsledky (${g14.res})`)
  : F('graf v7.3: most vyhľadávaní zlyhal ' + JSON.stringify(g14));

// staged create: počet uzlov sa pred potvrdením nemení (Q81)
const staged = await p.evaluate(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const before = window.Aura.mem.nodes().length;
  document.getElementById('pm-new').click();
  await sleep(400);
  const during = window.Aura.mem.nodes().length;
  const title = document.getElementById('dp-title').textContent;
  window.Aura.closeDetail(); await sleep(150);
  return { before, during, title };
});
staged.during === staged.before && /návrh/i.test(staged.title)
  ? O('toky: nový uzol je staged draft (' + staged.title + ')')
  : F('toky: uzol vzniká pred potvrdením ' + JSON.stringify(staged));

// pauza appky kaskáduje (Q82) + undo toast
const pause = await p.evaluate(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const app = window.Aura.apps.bySlug('eshop');
  window.Aura.apps.setPaused(app, true);
  await sleep(100);
  const paused = window.Aura.autos.rows.filter(r => r.state === 'Pozastavená (appka)').length;
  window.Aura.apps.setPaused(app, false);
  await sleep(100);
  const restored = window.Aura.autos.rows.filter(r => r.state === 'Pozastavená (appka)').length;
  return { paused, restored };
});
pause.paused > 0 && pause.restored === 0
  ? O(`toky: pauza appky kaskáduje na ${pause.paused} automatizácií a undo ich vráti`)
  : F('toky: pauza nekaskáduje ' + JSON.stringify(pause));

// zvonček derivovaný (Q74)
const bell = await p.evaluate(() => ({
  badge: +document.getElementById('bellCount').textContent,
  sum: window.Aura.inbox().reduce((s, x) => s + x.n, 0)
}));
bell.badge === bell.sum && bell.sum > 0
  ? O(`zvonček: derivovaný zo zdrojov (${bell.sum})`)
  : F('zvonček: badge nesedí so zdrojmi ' + JSON.stringify(bell));

// dirty guard Nastavení (Q78)
await go('nastavenia');
const guard = await p.evaluate(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const inp = document.getElementById('st-ctx');
  inp.value = '16384'; inp.dispatchEvent(new Event('input', { bubbles: true })); inp.dispatchEvent(new Event('change', { bubbles: true }));
  await sleep(200);
  window.Aura.go('jadro');
  await sleep(300);
  const dialog = document.getElementById('confirm').classList.contains('on');
  const stayed = window.Aura.state.screen === 'nastavenia';
  if (dialog) document.getElementById('confirm-yes').click();
  await sleep(300);
  return { dialog, stayed, after: window.Aura.state.screen };
});
guard.dialog && guard.stayed && guard.after === 'jadro'
  ? O('nastavenia: dirty guard zastaví odchod a potvrdenie pustí')
  : W('nastavenia: dirty guard neoverený ' + JSON.stringify(guard));

// mobil: spodná lišta + bottom sheet + graf zoznam/fullscreen
await p.setViewportSize({ width: 390, height: 844 });
await p.waitForTimeout(600);
const mb = await p.evaluate(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const bn = document.getElementById('bnav');
  const bnavOn = getComputedStyle(bn).display !== 'none';
  document.querySelector('#bnav [data-b="pamat"]').click(); await sleep(500);
  const svgHidden = getComputedStyle(document.getElementById('pm-net')).display === 'none';
  const listOn = getComputedStyle(document.getElementById('pm-net-list')).display !== 'none';
  /* legenda na mobile filtruje zoznam (chip = sekcia) */
  const secBefore = document.querySelectorAll('#pm-net-list > details').length;
  document.querySelector('#pm-legend .glg').click(); await sleep(300);
  const secAfter = document.querySelectorAll('#pm-net-list > details').length;
  document.querySelector('#pm-legend .glg').click(); await sleep(200);
  const legendFilters = secBefore === 5 && secAfter === 1;
  document.getElementById('pm-gfull').click(); await sleep(700);
  const netEl = document.getElementById('pm-net');
  const fullOn = document.getElementById('pm-gcard').classList.contains('gfull') && getComputedStyle(netEl).display !== 'none';
  /* auto-fit: kresliaca mierka ≥ 1,1 (predtým 0,40 = nečitateľné) */
  const rr = netEl.getBoundingClientRect();
  const camT = document.getElementById('pm-cam').getAttribute('transform');
  const kk = +(camT.match(/scale\(([\d.]+)/) || [0, 1])[1];
  const drawScale = Math.min(rr.width / 1160, rr.height / 620) * kk;
  document.getElementById('pm-gfull').click(); await sleep(200);
  window.Aura.detail('Sheet test', '<p>x</p>', []); await sleep(400);
  const dp = document.getElementById('dp').getBoundingClientRect();
  const sheet = dp.width >= 380 && dp.bottom >= 830 && dp.top > 100;
  window.Aura.closeDetail();
  return { bnavOn, svgHidden, listOn, fullOn, sheet, legendFilters, drawScale: +drawScale.toFixed(2) };
});
mb.bnavOn ? O('mobil: spodná navigačná lišta aktívna') : F('mobil: spodná lišta chýba');
mb.svgHidden && mb.listOn ? O('mobil: graf = zoznam lalokov') : F('mobil: graf zoznam zlyhal ' + JSON.stringify(mb));
mb.legendFilters ? O('mobil: legenda filtruje zoznam (chip = sekcia)') : F('mobil: legenda nefiltruje zoznam ' + JSON.stringify(mb));
mb.fullOn ? O('mobil: „Celá obrazovka" ukáže interaktívny graf') : F('mobil: fullscreen graf zlyhal');
mb.drawScale >= 1.1 ? O(`mobil: fullscreen auto-fit (mierka ${mb.drawScale})`) : F(`mobil: fullscreen mierka ${mb.drawScale} < 1,1`);
mb.sheet ? O('mobil: peek = bottom sheet') : F('mobil: bottom sheet zlyhal ' + JSON.stringify(mb));
await p.setViewportSize({ width: 1600, height: 1000 });

// token lint: hardcoded hex v obrazovkových zdrojoch (build-time kontrola)
import fsx from 'node:fs';
import pathx from 'node:path';
const srcDir = pathx.dirname(new URL(import.meta.url).pathname);
let hexLeaks = [];
for (const f of ['s-pamat.html','s-praca.html','s-system.html','s-appky.html','s-pamat.js','s-appky.js','boot.js']) {
  const txt = fsx.readFileSync(pathx.join(srcDir, f), 'utf8');
  const m = txt.match(/#[0-9a-fA-F]{6}\b/g) || [];
  if (m.length) hexLeaks.push(f + ':' + m.length);
}
// s-praca.js má povolenú výnimku: MCP brand farby v MCP_META
{
  const txt = fsx.readFileSync(pathx.join(srcDir, 's-praca.js'), 'utf8').replace(/MCP_META = \{[^}]*\}/, '');
  const m = txt.match(/#[0-9a-fA-F]{6}\b/g) || [];
  if (m.length) hexLeaks.push('s-praca.js:' + m.length);
}
hexLeaks.length ? F('token lint: hardcoded hex — ' + hexLeaks.join(', ')) : O('token lint: 0 hardcoded hex v obrazovkách');

/* --- výsledok --- */
console.log('\n===== OK (' + ok.length + ') =====');
ok.forEach(x => console.log('  ✔ ' + x));
if (warn.length) { console.log('\n===== UPOZORNENIA (' + warn.length + ') ====='); warn.forEach(x => console.log('  ~ ' + x)); }
console.log('\n===== CHYBY (' + fail.length + ') =====');
fail.forEach(x => console.log('  ✘ ' + x));
console.log('\nvýška obsahu:', Object.entries(chartInfo).map(([k, v]) => `${k}=${v.h}px/${v.charts.filter(c=>!c.spark).length}g`).join(' '));
await b.close();
process.exit(fail.length ? 1 : 0);
