/* ============================================================================
   mode.js — A3 · prepínač Deck / Dokument, doc reveal, scroll progres
   Aura AI · interná AI infraštruktúra

   Beží ako posledný skript (tooltips.js → deck.js → mode.js), takže
   window.DECK (CONTRACT §5) už existuje. Tento súbor DECK iba konzumuje.

   Žiadny localStorage, žiadna externá závislosť. Default režim = 'deck'.
   ============================================================================ */
(function () {
  'use strict';

  var D = window.DECK;
  if (!D || typeof D.onMode !== 'function') {
    console.error('[Aura mode.js] window.DECK.onMode nie je k dispozícii — deck.js sa nenačítal alebo spadol; prepínač Deck/Dokument sa neinjektoval.');
    return;
  }

  var html = document.documentElement;
  var topBar = document.getElementById('top');
  var ctEl = document.getElementById('ct');
  var railI = document.querySelector('#rail i');

  var mode = 'deck';        /* 'deck' | 'doc' */
  var secs = [];            /* pole <section class="s"> */
  var io = null;            /* IntersectionObserver nad sekciami */
  var mo = null;            /* MutationObserver nad data-mode */
  var raf = 0;              /* throttle scroll/resize */
  var btn = null;           /* #md */
  var nameEl = null;        /* span.ctn v #ct */
  var lastIdx = -1;

  /* ---------------------------------------------------------------- utility */

  function pad(n) { return ('0' + n).slice(-2); }

  /* rovnaký formát ako deck.js: sk-SK, nedeliteľná medzera → obyčajná */
  function fmt(n) {
    return Math.round(n).toLocaleString('sk-SK').replace(/\u00a0/g, ' ');
  }

  function reduced() {
    if (typeof D.reduced === 'function') {
      try { return !!D.reduced(); } catch (e) { /* fallback nižšie */ }
    }
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function slides() {
    var l = null;
    if (typeof D.slides === 'function') {
      try { l = D.slides(); } catch (e) { l = null; }
    }
    if (!l || !l.length) { l = document.querySelectorAll('#deck .s'); }
    if (!l || !l.length) { l = document.querySelectorAll('.s'); }
    return [].slice.call(l);
  }

  function count() {
    if (typeof D.count === 'function') {
      try { var n = D.count(); if (n > 0) { return n; } } catch (e) { /* fallback */ }
    }
    return slides().length;
  }

  function current() {
    if (typeof D.current === 'function') {
      try { var n = D.current(); if (n >= 0) { return n; } } catch (e) { /* fallback */ }
    }
    return 0;
  }

  /* scroll kontejner dokumentu (report.css robí scrollerom root element) */
  function scroller() {
    var d = document.scrollingElement || html;
    if (d && d.scrollHeight - d.clientHeight > 2) { return d; }
    var b = document.body;
    if (b && b.scrollHeight - b.clientHeight > 2) { return b; }
    return d || b;
  }

  function scrollToY(y) {
    var el = scroller();
    if (!el) { return; }
    try {
      el.scrollTo({ top: y, behavior: reduced() ? 'auto' : 'smooth' });
    } catch (e) {
      el.scrollTop = y;
    }
  }

  /* --------------------------------------------------------- počítadlá KPI */
  /* deck.js spúšťa počítadlá v go(); window.DECK ich nevystavuje, takže tu
     je rovnaká logika: cubic ease-out, 950 ms, sk-SK, reduced-motion skratka.
     data-cnt značí deck.js pri inicializácii — ak by nie, doplníme rovnako. */

  function ensureCnt() {
    if (document.querySelector('[data-cnt]')) { return; }
    var bs = document.querySelectorAll('#deck .s .kpi b, .s .kpi b');
    [].forEach.call(bs, function (b) {
      var t = b.textContent.trim();
      if (/^[\d\s\u00a0]+$/.test(t) && t.replace(/\D/g, '').length) {
        b.setAttribute('data-cnt', t.replace(/\D/g, ''));
      }
    });
  }

  function counters(sec) {
    var list = sec.querySelectorAll('[data-cnt]');
    if (!list.length) { return; }
    var soft = !reduced();
    [].forEach.call(list, function (b) {
      var end = +b.getAttribute('data-cnt');
      if (!isFinite(end)) { return; }
      if (!soft) { b.textContent = fmt(end); return; }
      var t0 = null, dur = 950;
      function step(t) {
        if (t0 === null) { t0 = t; }
        var k = Math.min(1, (t - t0) / dur);
        k = 1 - Math.pow(1 - k, 3);
        b.textContent = fmt(end * k);
        if (k < 1) { requestAnimationFrame(step); }
      }
      requestAnimationFrame(step);
    });
  }

  /* ------------------------------------------------------------ doc reveal */

  function reveal(sec) {
    if (!sec || sec.classList.contains('rv')) { return; }
    sec.classList.add('rv');
    counters(sec);
  }

  /* záchranná siet pre sekcie vyššie ako viewport (IO threshold sa im
     nemusí naplniť) a pre prehliadače bez IntersectionObservera */
  function sweep() {
    var vh = window.innerHeight || html.clientHeight || 0;
    for (var k = 0; k < secs.length; k++) {
      var s = secs[k];
      if (s.classList.contains('rv')) { continue; }
      var r = s.getBoundingClientRect();
      var vis = Math.min(r.bottom, vh) - Math.max(r.top, 0);
      if (vis <= 0) { continue; }
      if (vis >= Math.min(140, r.height * 0.12) || r.height === 0) {
        reveal(s);
        if (io) { io.unobserve(s); }
      }
    }
  }

  /* ------------------------------------------------------ #ct a #rail v doc */

  /* názov sekcie z .eb — formát „NN <s>·</s> Názov bloku“ */
  function ebName(sec) {
    var eb = sec.querySelector('.eb');
    if (!eb) {
      var h = sec.querySelector('h1,h2');
      return h ? (h.textContent || '').replace(/[\t\n\r ]+/g, ' ').trim() : '';
    }
    var sep = eb.querySelector('s'), txt = '';
    if (sep) {
      var n = sep.nextSibling;
      while (n) { txt += n.textContent || ''; n = n.nextSibling; }
    }
    if (!txt.trim()) {
      txt = (eb.textContent || '').replace(/^\s*\d+\s*[·.\-]?\s*/, '');
    }
    return txt.replace(/[\t\n\r ]+/g, ' ').trim();
  }

  function ctB() {
    if (!ctEl) { return null; }
    var b = ctEl.querySelector('b');
    if (!b) {
      ctEl.innerHTML = '<b>' + pad(current() + 1) + '</b> / ' + count();
      b = ctEl.querySelector('b');
    }
    return b;
  }

  function ctAttach() {
    if (!ctEl) { return; }
    ctB();
    if (!nameEl) {
      nameEl = document.createElement('span');
      nameEl.className = 'ctn';
    }
    if (nameEl.parentNode !== ctEl) { ctEl.appendChild(nameEl); }
  }

  function ctDetach() {
    if (nameEl && nameEl.parentNode) { nameEl.parentNode.removeChild(nameEl); }
  }

  /* index sekcie, ktorá je „práve čítaná“ */
  function activeIndex() {
    var el = scroller();
    /* na konci dokumentu je to vždy posledná sekcia, aj keď je krátka */
    if (el && el.scrollHeight - el.clientHeight - el.scrollTop <= 4) { return secs.length - 1; }
    var probe = (window.innerHeight || html.clientHeight || 0) * 0.28;
    var best = 0;
    for (var k = 0; k < secs.length; k++) {
      if (secs[k].getBoundingClientRect().top <= probe) { best = k; } else { break; }
    }
    return best;
  }

  function paintCt(i) {
    var b = ctB();
    if (!b) { return; }
    if (i !== lastIdx) { b.textContent = pad(i + 1); }
    if (nameEl) {
      var nm = secs[i] ? ebName(secs[i]) : '';
      var next = nm ? ' · ' + nm : '';
      if (nameEl.textContent !== next) { nameEl.textContent = next; }
    }
    lastIdx = i;
  }

  function paintRail(p) {
    if (!railI) { return; }
    railI.style.width = (p * 100).toFixed(2) + '%';
  }

  function tick() {
    var el = scroller();
    if (el) {
      var max = el.scrollHeight - el.clientHeight;
      var p = max > 0 ? Math.min(1, Math.max(0, el.scrollTop / max)) : 1;
      paintRail(p);
    }
    sweep();
    if (secs.length) { paintCt(activeIndex()); }
  }

  function onScroll() {
    if (raf) { return; }
    raf = requestAnimationFrame(function () { raf = 0; tick(); });
  }

  /* Home / End = začiatok a konec dokumentu (deck si klávesy v doc režime
     vypína cez onMode; capture + stopPropagation to poistí) */
  function onKey(e) {
    if (mode !== 'doc') { return; }
    if (e.key !== 'Home' && e.key !== 'End') { return; }
    if (e.ctrlKey || e.metaKey || e.altKey) { return; }
    var t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) { return; }
    e.preventDefault();
    e.stopPropagation();
    if (e.key === 'Home') {
      scrollToY(0);
    } else {
      var el = scroller();
      scrollToY(el ? Math.max(0, el.scrollHeight - el.clientHeight) : 0);
    }
  }

  /* ------------------------------------------------------- setup / teardown */

  function setupDoc() {
    secs = slides();
    lastIdx = -1;
    ctAttach();
    /* #rail i má v decku transition .5s — v doc režime sleduje scroll 1:1 */
    if (railI) { railI.style.transition = 'none'; }

    if (window.IntersectionObserver) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) { return; }
          if (en.intersectionRatio >= 0.12 ||
              en.intersectionRect.height >= Math.min(140, en.boundingClientRect.height * 0.12)) {
            reveal(en.target);
            io.unobserve(en.target);
          }
        });
      }, { threshold: [0, 0.12, 0.5], rootMargin: '0px 0px -6% 0px' });
      secs.forEach(function (s) { io.observe(s); });
    } else {
      secs.forEach(reveal);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    if (document.body) {
      document.body.addEventListener('scroll', onScroll, { passive: true });
    }

    /* skok na sekciu, na ktorej bol deck — až po prekreslení layoutu */
    var i = Math.max(0, Math.min(secs.length - 1, current()));
    requestAnimationFrame(function () {
      if (mode !== 'doc') { return; }
      var el = scroller(), s = secs[i];
      if (el && s && i > 0) {
        var y = el.scrollTop + s.getBoundingClientRect().top - 52;
        try { el.scrollTo({ top: Math.max(0, y), behavior: 'auto' }); }
        catch (e) { el.scrollTop = Math.max(0, y); }
      }
      tick();
    });
  }

  function teardownDoc() {
    if (io) { io.disconnect(); io = null; }
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onScroll);
    if (document.body) { document.body.removeEventListener('scroll', onScroll); }
    if (raf) { cancelAnimationFrame(raf); raf = 0; }

    secs.forEach(function (s) { s.classList.remove('rv'); });
    ctDetach();
    lastIdx = -1;

    /* deck stav: číslo slajdu a rail späť na „slajd N / 13“ */
    var i = current(), n = count() || 1;
    var b = ctB();
    if (b) { b.textContent = pad(i + 1); }
    if (railI) {
      railI.style.transition = '';
      railI.style.width = (((i + 1) / n) * 100) + '%';
    }
  }

  /* ---------------------------------------------------------------- prepnutie */

  function apply(m) {
    m = (m === 'doc') ? 'doc' : 'deck';
    if (m === mode && html.dataset.mode === m) { return; }
    mode = m;

    if (m === 'deck') { teardownDoc(); }

    html.dataset.mode = m;
    try {
      D.onMode(m);
    } catch (e) {
      console.error('[Aura mode.js] window.DECK.onMode(' + m + ') zlyhalo:', e);
    }

    if (m === 'doc') { setupDoc(); }

    document.dispatchEvent(new CustomEvent('aura:mode', { detail: { mode: m } }));
    paintBtn();
  }

  /* ------------------------------------------------------------- prepínač #md */

  function paintBtn() {
    if (!btn) { return; }
    var doc = mode === 'doc';
    btn.textContent = doc ? 'Deck' : 'Dokument';
    btn.setAttribute('aria-pressed', doc ? 'true' : 'false');
    btn.setAttribute('aria-label', doc ? 'Prepnúť na deck (slajdy)' : 'Prepnúť na dokument (report)');
    btn.title = doc ? 'Prepnúť na deck (slajdy)' : 'Prepnúť na dokument (report)';
  }

  function injectBtn() {
    if (!topBar) {
      console.error('[Aura mode.js] #top v dokumente nie je — prepínač Deck/Dokument sa neinjektoval.');
      return false;
    }
    btn = document.createElement('button');
    btn.className = 'pill';
    btn.id = 'md';
    btn.type = 'button';
    var th = document.getElementById('th');
    if (th && th.parentNode === topBar) {
      topBar.insertBefore(btn, th.nextSibling);
    } else {
      topBar.appendChild(btn);
    }
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      apply(mode === 'doc' ? 'deck' : 'doc');
    });
    paintBtn();
    return true;
  }

  /* -------------------------------------------------------------------- init */

  html.dataset.mode = 'deck';   /* default, bez localStorage */
  ensureCnt();
  if (!injectBtn()) { return; }
  document.addEventListener('keydown', onKey, true);

  /* keby režim prepol niekto zvonku (napr. verifikačný skript A4)
     nastavením data-mode, doc logika sa aj tak správne naviaže */
  if (window.MutationObserver) {
    mo = new MutationObserver(function () {
      var ext = html.dataset.mode === 'doc' ? 'doc' : 'deck';
      if (ext !== mode) { apply(ext); }
    });
    mo.observe(html, { attributes: true, attributeFilter: ['data-mode'] });
  }
})();
