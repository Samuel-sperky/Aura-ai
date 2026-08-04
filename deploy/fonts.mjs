// Stiahne Google Fonts a vráti CSS s @font-face, kde je woff2 vložený ako data URI.
// Ponechá len latin + latin-ext (slovenská diakritika: č š ž ť ď ň ľ ĺ ŕ).
const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

const KEEP = new Set(['latin', 'latin-ext']);
const cache = new Map();

async function woff2DataUri(url) {
  if (cache.has(url)) return cache.get(url);
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const uri = `data:font/woff2;base64,${buf.toString('base64')}`;
  cache.set(url, { uri, bytes: buf.length });
  return cache.get(url);
}

export async function inlineFonts(query) {
  const cssUrl = `https://fonts.googleapis.com/css2?${query}&display=swap`;
  const res = await fetch(cssUrl, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`CSS ${res.status}: ${cssUrl}`);
  const css = await res.text();

  const out = [];
  let total = 0;
  // bloky: /* subset */\n@font-face { ... }
  const re = /\/\*\s*([\w-]+)\s*\*\/\s*(@font-face\s*\{[^}]*\})/g;
  let m;
  while ((m = re.exec(css))) {
    const [, subset, block] = m;
    if (!KEEP.has(subset)) continue;
    const urlMatch = block.match(/url\((https:\/\/[^)]+\.woff2)\)/);
    if (!urlMatch) continue;
    const { uri, bytes } = await woff2DataUri(urlMatch[1]);
    total += bytes;
    out.push(block.replace(urlMatch[1], uri).replace(/\n\s*/g, ' ').trim());
  }
  if (!out.length) throw new Error(`žiadny latin subset: ${query}`);
  return { css: out.join('\n'), bytes: total, faces: out.length };
}
