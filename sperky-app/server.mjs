/* ============================================================================
   Statický server + proxy na Šperky API. Bez závislostí — `node server.mjs`.

   Načo to je: appka je čisté HTML, ale objednávky vyžadujú kľúč. Keby ho posielal
   prehliadač, (a) leží v localStorage, kde ho prečíta ktokoľvek pri počítači, a
   (b) request beží cross-origin, takže ho eshop musí povoliť v CORS — a keď
   nepovolí, vyzerá to úplne rovnako ako mŕtva sieť.

   Tento proces obe veci ruší: prehliadač hovorí s ním (rovnaký origin, žiadny
   CORS) a kľúč z `SPERKY_API_KEY` sa pripája až tu.

   Spustenie (odporúčane cez `.env`, nie cez argument príkazu — argumenty vidí
   každý `ps`, a `.env` je v .gitignore):

     printf 'SPERKY_API_KEY=…\n' > sperky-app/.env
     node --env-file=sperky-app/.env sperky-app/server.mjs

   Bez `.env` funguje aj obyčajná premenná prostredia:

     PORT=3060 SPERKY_BASE_URL='https://sperky-eshop.sk' node server.mjs
   ========================================================================== */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const PORT = Number(process.env.PORT || 3060);
/* Loopback, nie 0.0.0.0. Proxy nemá žiadnu vlastnú autentifikáciu — kto sa naň
   dostane, čita všetky objednávky. Na `0.0.0.0` je to teda neautentifikovaná
   čítačka objednávok pre celú sieť, hoci samotný kľúč nikam neunikne.
   Zmerané pred opravou: `http://<adresa-stroja>:3060/api/order` vrátilo 200. */
const HOST = process.env.HOST || "127.0.0.1";
const BASE_URL = String(process.env.SPERKY_BASE_URL || "https://sperky-eshop.sk").replace(/\/+$/, "");
const API_KEY = process.env.SPERKY_API_KEY || "";
const UPSTREAM_TIMEOUT_MS = 20000;

/* Zámerný allowlist, nie prefix `/api/`. Otvorený proxy s produkčným kľúčom v
   hlavičke je presne to, čo sa nesmie stať — každá cesta tu je vypísaná ručne
   a všetko ostatné končí 404. */
const ROUTES = new Map([
  ["/api/order", { path: "/api/order", auth: true }],
  ["/api/order/get", { path: "/api/order/get", auth: true }],
  ["/api/products", { path: "/api/products", auth: false }],
  ["/api/products/get", { path: "/api/products/get", auth: false }],
]);

/* Prepúšťame len parametre, ktoré API dokumentuje. Neznámy parameter
   nepreposielame — nech sa cez proxy nedá skúšať, čo eshop ešte prijme. */
const ALLOWED_PARAMS = new Set([
  "page", "per_page", "id", "id_lang",
  "date_from", "date_to", "country", "total_min", "total_max",
]);

/* Zároveň allowlist toho, čo sa vôbec dá stiahnuť. Prípona mimo tejto mapy je
   404, takže server nevydá ani `server.mjs`, ani `README.md`, ani nič, čo si
   niekto do adresára pridá. Dôvod je konkrétny: `.env` s kľúčom sa odporúča
   držať práve tu, a pred touto zmenou `GET /.env` vrátilo kľúč v plaintexte. */
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function notFound(res) {
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("not found");
}

async function serveStatic(req, res, pathname) {
  const wanted = pathname === "/" ? "/index.html" : pathname;
  let decoded;
  try {
    decoded = decodeURIComponent(wanted);
  } catch {
    notFound(res);
    return;
  }

  /* Bodkové súbory sú mimo hry — `.env` leží v tomto adresári. */
  if (decoded.split("/").some((segment) => segment.startsWith("."))) {
    notFound(res);
    return;
  }
  /* Prípona musí byť v allowliste; `.env`, `.mjs`, `.md` ani bezprípony nič. */
  const mime = MIME[extname(decoded)];
  if (!mime) {
    notFound(res);
    return;
  }
  /* `normalize` + kontrola prefixu: bez toho `/../../etc/passwd` odíde von. */
  const target = normalize(join(ROOT, decoded));
  if (!target.startsWith(ROOT.endsWith(sep) ? ROOT : ROOT + sep)) {
    notFound(res);
    return;
  }

  try {
    const file = await readFile(target);
    res.writeHead(200, {
      "Content-Type": mime,
      "Content-Length": file.length,
      /* Appka je statická a mení sa pri každom builde ručne — no-cache drží
         prehliadač pri pravde bez cache-bustingu v URL. */
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "same-origin",
    });
    res.end(file);
  } catch {
    notFound(res);
  }
}

async function proxy(req, res, pathname, search) {
  if (req.method !== "GET") {
    sendJson(res, 405, { error: "method_not_allowed" });
    return;
  }
  const route = ROUTES.get(pathname);
  if (!route) {
    sendJson(res, 404, { error: "unknown_controller" });
    return;
  }
  if (route.auth && !API_KEY) {
    /* Rovnaký tvar, aký vracia eshop — klient pozná len jednu chybovú cestu. */
    console.warn("[proxy] %s bez SPERKY_API_KEY → forbidden", pathname);
    sendJson(res, 403, { error: "forbidden" });
    return;
  }

  const incoming = new URLSearchParams(search);
  const forwarded = new URLSearchParams();
  for (const [name, value] of incoming) {
    if (ALLOWED_PARAMS.has(name) && value !== "") forwarded.set(name, value);
  }

  const url = BASE_URL + route.path + (forwarded.size ? "?" + forwarded : "");
  const headers = { Accept: "application/json" };
  if (route.auth) headers["X-Api-Key"] = API_KEY;

  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const upstream = await fetch(url, { method: "GET", headers, signal: controller.signal });
    const body = await upstream.text();
    /* Log bez kľúča a bez tela: cesta, stav, trvanie. */
    console.log("[proxy] %s%s → %d (%d ms)", route.path, forwarded.size ? "?" + forwarded : "", upstream.status, Date.now() - started);
    res.writeHead(upstream.status, {
      "Content-Type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
      "Content-Length": Buffer.byteLength(body),
      "Cache-Control": "no-store",
      /* Odpoveď eshopu je dáta, nie dokument — keby prišla s text/html, nech ju
         prehliadač na tomto origine nevykreslí. Žiadne Access-Control-* hlavičky
         tu zámerne nie sú: cudzia stránka si túto odpoveď nesmie prečítať. */
      "X-Content-Type-Options": "nosniff",
    });
    res.end(body);
  } catch (err) {
    const aborted = err?.name === "AbortError";
    console.error("[proxy] %s → %s", route.path, aborted ? "timeout" : String(err?.message || err));
    sendJson(res, 502, { error: aborted ? "upstream_timeout" : "upstream_unreachable" });
  } finally {
    clearTimeout(timer);
  }
}

const server = createServer((req, res) => {
  const url = new URL(req.url || "/", "http://localhost");
  if (url.pathname.startsWith("/api/")) {
    proxy(req, res, url.pathname, url.search.replace(/^\?/, ""));
    return;
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { Allow: "GET, HEAD" }).end();
    return;
  }
  serveStatic(req, res, url.pathname);
});

server.listen(PORT, HOST, () => {
  console.log("Šperky API klient beží na http://%s:%d", HOST === "0.0.0.0" ? "localhost" : HOST, PORT);
  console.log("Upstream: %s", BASE_URL);
  console.log("Kľúč pre objednávky: %s", API_KEY ? "nastavený (SPERKY_API_KEY)" : "CHÝBA — objednávky vrátia forbidden");
  if (HOST !== "127.0.0.1" && HOST !== "localhost" && HOST !== "::1") {
    console.warn(
      "POZOR: server počúva na %s, nie na loopbacku. Proxy nemá vlastnú autentifikáciu,\n" +
      "       takže každý, kto sa naň dostane, čita všetky objednávky. Ak to je zámer,\n" +
      "       daj pred neho reverzný proxy s prihlásením.",
      HOST,
    );
  }
  console.log("V appke prepni Nastavenia → Zdroj dát → Cez proxy.");
});
