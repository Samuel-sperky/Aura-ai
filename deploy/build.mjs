// Poskladá adresár `site/` pre Cloudflare Pages z existujúcich výstupov repa.
// Spúšťa sa z deploy/: node build.mjs
import { cp, mkdir, rm, writeFile, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..');
const site = join(here, 'site');

const FILES = [
  ['presentation/aura-ai-prezentacia.html', 'prezentacia/index.html'],
  ['presentation/aura-ai-prezentacia.pdf', 'prezentacia/aura-ai-prezentacia.pdf'],
  ['apps/aura-apps-hub.html', 'hub/index.html'],
  ['apps/aura-apps-hub.pdf', 'hub/aura-apps-hub.pdf'],
];

const INDEX = `<!doctype html>
<html lang="sk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Aura — interné náhľady</title>
<style>
  :root{
    --paper:#0e1413; --ink:#e8f0ef; --muted:#93a6a4;
    --teal:#05bcc4; --deep:#03797e; --gold:#d8b878; --line:#1e2b29;
  }
  *{box-sizing:border-box}
  html{color-scheme:dark}
  body{
    margin:0; min-height:100vh; padding:48px 24px;
    background:
      radial-gradient(1100px 620px at 78% -12%, rgba(5,188,196,.15), transparent 62%),
      radial-gradient(760px 460px at 6% 108%, rgba(216,184,120,.10), transparent 60%),
      var(--paper);
    color:var(--ink);
    font:16px/1.65 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;
    display:flex; align-items:center; justify-content:center;
  }
  main{width:100%; max-width:940px}
  .crown{color:var(--gold); font-size:26px; line-height:1}
  h1{
    font-family:"Playfair Display",Georgia,serif; font-weight:600;
    font-size:clamp(34px,6vw,52px); margin:14px 0 10px; letter-spacing:-.01em;
  }
  h1 em{font-style:normal; color:var(--teal)}
  .lede{color:var(--muted); max-width:60ch; margin:0 0 38px}
  .grid{display:grid; gap:20px; grid-template-columns:repeat(auto-fit,minmax(290px,1fr))}
  .card{
    display:flex; flex-direction:column; gap:12px;
    padding:26px; border:1px solid var(--line); border-radius:16px;
    background:linear-gradient(180deg,rgba(255,255,255,.035),rgba(255,255,255,.012));
    text-decoration:none; color:inherit;
    transition:border-color .18s ease, transform .18s ease, box-shadow .18s ease;
  }
  .card:hover,.card:focus-visible{
    border-color:var(--teal); transform:translateY(-3px);
    box-shadow:0 14px 40px rgba(0,0,0,.45); outline:none;
  }
  .tag{
    font:600 11px/1 ui-monospace,"JetBrains Mono",monospace; letter-spacing:.14em;
    text-transform:uppercase; color:var(--deep); filter:brightness(1.6);
  }
  .card h2{font-size:21px; margin:0; font-weight:600}
  .card p{margin:0; color:var(--muted); font-size:15px}
  .meta{
    margin-top:auto; padding-top:14px; border-top:1px solid var(--line);
    display:flex; gap:14px; flex-wrap:wrap; font-size:13px; color:var(--muted);
  }
  .pdf{color:var(--teal); text-decoration:none; border-bottom:1px dotted currentColor}
  footer{margin-top:36px; font-size:13px; color:var(--muted)}
  footer b{color:var(--gold); font-weight:600}
  @media (prefers-reduced-motion:reduce){ .card{transition:none} .card:hover{transform:none} }
</style>
</head>
<body>
<main>
  <div class="crown">&#9819;</div>
  <h1>Aura — <em>interné náhľady</em></h1>
  <p class="lede">
    Dva výstupy projektu Aura. Prístup je chránený heslom, stránky nie sú indexované
    vyhľadávačmi a neposielajú žiadne dáta tretím stranám.
  </p>

  <div class="grid">
    <a class="card" href="/prezentacia/">
      <span class="tag">Prezentácia</span>
      <h2>Aura AI — vlastné jadro</h2>
      <p>13 slajdov, režim deck aj dokument, dark/light, slovníček pojmov a konfigurátor zostavy s TCO.</p>
      <span class="meta">Otvoriť náhľad
        <a class="pdf" href="/prezentacia/aura-ai-prezentacia.pdf">PDF (13 strán)</a>
      </span>
    </a>

    <a class="card" href="/hub/">
      <span class="tag">Aura Suite</span>
      <h2>Rozcestník aplikácií</h2>
      <p>6 modulov a 45+ obrazoviek: Marketing, KPI, Logistika, HR, Roadmap, Tržby. SK/EN, dark/light, AuraAI chat.</p>
      <span class="meta">Otvoriť náhľad
        <a class="pdf" href="/hub/aura-apps-hub.pdf">PDF (57 strán)</a>
      </span>
    </a>
  </div>

  <footer>Neverejné. <b>Odkaz ani heslo neposielaj ďalej</b> bez dohody.</footer>
</main>
</body>
</html>
`;

const HEADERS = `/*
  X-Frame-Options: SAMEORIGIN
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  X-Robots-Tag: noindex, nofollow, noarchive
`;

const ROBOTS = `User-agent: *
Disallow: /
`;

await rm(site, { recursive: true, force: true });
await mkdir(site, { recursive: true });

for (const [from, to] of FILES) {
  const src = join(repo, from);
  try {
    await stat(src);
  } catch {
    console.error(`CHÝBA: ${from}`);
    process.exit(1);
  }
  const dest = join(site, to);
  await mkdir(dirname(dest), { recursive: true });
  await cp(src, dest);
  console.log(`${from}  ->  site/${to}`);
}

await writeFile(join(site, 'index.html'), INDEX);
await writeFile(join(site, '_headers'), HEADERS);
await writeFile(join(site, 'robots.txt'), ROBOTS);
console.log('site/index.html, site/_headers, site/robots.txt zapísané');
console.log('\nHotovo. Nasadenie:  npx wrangler pages deploy');
