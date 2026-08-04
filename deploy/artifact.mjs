// Preloží self-contained HTML stránku repa na obsah artifactu:
//  - odstráni doctype/<html>/<head>/<body> (artifact ich dodáva sám)
//  - vyhodí odkazy na Google Fonts (CSP ich blokuje) a nahradí ich vloženými @font-face
//  - zachová všetky <style> a <script> bloky nedotknuté
import { readFile, writeFile } from 'node:fs/promises';
import { inlineFonts } from './fonts.mjs';

const TARGETS = [
  {
    src: '/home/user/Aura-ai/presentation/aura-ai-prezentacia.html',
    out: '/home/user/Aura-ai/deploy/artifact/aura-ai-prezentacia.html',
    title: 'Aura AI — vlastné AI jadro',
    fonts:
      'family=Playfair+Display:wght@500;600&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700',
  },
  {
    src: '/home/user/Aura-ai/apps/aura-apps-hub.html',
    out: '/home/user/Aura-ai/deploy/artifact/aura-apps-hub.html',
    title: 'Aura Suite — rozcestník aplikácií',
    fonts:
      'family=Geist:wght@400;500;600;700&family=Playfair+Display:wght@600;700;800&family=Geist+Mono:wght@400;500',
  },
];

function bodyOf(html, src) {
  const open = html.match(/<body[^>]*>/i);
  const close = html.lastIndexOf('</body>');
  if (!open || close === -1) throw new Error(`nenašiel som <body> v ${src}`);
  const attrs = open[0].slice(5, -1).trim();
  if (attrs) throw new Error(`<body> má atribúty (${attrs}) — treba ich preniesť ručne`);
  return html.slice(open.index + open[0].length, close);
}

function headStyles(html) {
  const head = html.slice(
    html.search(/<head[^>]*>/i),
    html.search(/<\/head>/i),
  );
  const styles = head.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || [];
  return styles
    .map((s) =>
      // @import na Google Fonts je v <style> — CSP ho zablokuje, preč s ním
      s.replace(/@import\s+url\(['"]?https:\/\/fonts\.googleapis\.com[^)]*\)\s*;?/gi, ''),
    )
    .join('\n');
}

for (const t of TARGETS) {
  const html = await readFile(t.src, 'utf8');
  const { css, bytes, faces } = await inlineFonts(t.fonts);

  const parts = [
    `<title>${t.title}</title>`,
    `<style>\n/* Google Fonts vložené ako data URI — artifact CSP blokuje externé hostiteľské servery. */\n${css}\n</style>`,
    headStyles(html),
    bodyOf(html, t.src),
  ];

  const result = parts.join('\n');
  await writeFile(t.out, result);

  const check = {
    subor: t.out.split('/').pop(),
    'kB celkom': Math.round(result.length / 1024),
    'kB fonty': Math.round(bytes / 1024),
    'font-face': faces,
    'externé URL': (result.match(/https?:\/\/(?!fonts\.gstatic)[^"' )]+/g) || []).length,
    'zvyšné <head>/<body>': (result.match(/<\/?(html|head|body|!doctype)\b/gi) || []).length,
  };
  console.log(check);
}
