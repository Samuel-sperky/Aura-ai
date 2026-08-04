// HTTP Basic Auth pred celým webom (vrátane statických súborov a PDF).
// Prihlasovacie údaje sú Cloudflare secrets AURA_USER / AURA_PASS — nikdy nie v repe.

const enc = new TextEncoder();

function safeEqual(a, b) {
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.byteLength !== bb.byteLength) return false;
  return crypto.subtle.timingSafeEqual(ab, bb);
}

const DENIED = `<!doctype html><meta charset="utf-8">
<title>Aura — prístup</title>
<style>
  html{color-scheme:dark}
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0e1413;
       color:#e6efee;font:16px/1.6 Inter,system-ui,sans-serif;text-align:center;padding:24px}
  strong{color:#05bcc4}
</style>
<div>
  <p style="font-size:28px;margin:0 0 8px">Aura</p>
  <p>Tento náhľad je chránený heslom.</p>
  <p style="opacity:.6;font-size:14px">Zadaj <strong>meno a heslo</strong>, ktoré si dostal.</p>
</div>`;

export async function onRequest({ request, env, next }) {
  const user = env.AURA_USER;
  const pass = env.AURA_PASS;

  if (!user || !pass) {
    return new Response(
      'Prístup nie je nakonfigurovaný: chýbajú secrets AURA_USER / AURA_PASS.',
      { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } },
    );
  }

  const header = request.headers.get('Authorization') || '';
  const [scheme, encoded] = header.split(' ');

  if (scheme === 'Basic' && encoded) {
    let decoded = '';
    try {
      decoded = atob(encoded);
    } catch {
      decoded = '';
    }
    const sep = decoded.indexOf(':');
    if (
      sep > -1 &&
      safeEqual(decoded.slice(0, sep), user) &&
      safeEqual(decoded.slice(sep + 1), pass)
    ) {
      const res = await next();
      const out = new Response(res.body, res);
      out.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
      out.headers.set('Cache-Control', 'private, no-store');
      return out;
    }
  }

  return new Response(DENIED, {
    status: 401,
    headers: {
      // Iba ASCII: hodnota hlavicky musi byt ByteString (bez diakritiky a pomlciek U+2014).
      'WWW-Authenticate': 'Basic realm="Aura - interny nahlad", charset="UTF-8"',
      'content-type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
    },
  });
}
