# Nasadenie na Cloudflare Pages

Zverejní dva výstupy repa pod jedným odkazom, chránené menom a heslom (HTTP Basic Auth):

```
/                 rozcestník
/prezentacia/     presentation/aura-ai-prezentacia.html  (+ PDF)
/hub/             apps/aura-apps-hub.html                (+ PDF)
```

Heslo rieši Pages Function `functions/_middleware.js` — beží pred **každou** požiadavkou,
teda aj pred PDF a statickými súbormi. Údaje sú Cloudflare secrets, **nie sú v repe**.

## Prvé nasadenie

Potrebuješ účet na Cloudflare (stačí Free) a Node 18+.

```bash
cd deploy
npm install
npx wrangler login          # otvorí prehliadač, prihlásenie do Cloudflare
```

Vytvor projekt a nastav prihlasovacie údaje:

```bash
npx wrangler pages project create aura-suite --production-branch main

npx wrangler pages secret put AURA_USER --project-name aura-suite   # vloží sa: aura
npx wrangler pages secret put AURA_PASS --project-name aura-suite   # vloží sa: heslo
```

Nasaď:

```bash
npm run deploy
```

Wrangler vypíše výslednú adresu, tvar: `https://aura-suite.pages.dev`
(prvé nasadenie môže dať aj `https://<hash>.aura-suite.pages.dev` — produkčná je tá bez hashu).

## Ďalšie nasadenia

```bash
cd deploy && npm run deploy
```

`build.mjs` vždy nanovo poskladá `site/` z aktuálnych `presentation/` a `apps/`,
takže stačí prebuildovať HTML v repe a nasadiť.

## Lokálna skúška pred nasadením

```bash
cd deploy
node build.mjs
npx wrangler pages dev --binding AURA_USER=aura --binding AURA_PASS=test
# http://localhost:8788  → vypýta si meno a heslo
```

## Zmena hesla

```bash
npx wrangler pages secret put AURA_PASS --project-name aura-suite
```

Zmena platí okamžite, bez nasadzovania. Prehliadač si Basic Auth pamätá do zatvorenia
okna — po zmene hesla treba zavrieť a znova otvoriť okno.

## Poznámky

- Heslo drž v ASCII. Basic Auth posiela údaje cez `atob`/base64 a diakritika sa
  v niektorých prehliadačoch zakóduje inak, než server očakáva.
- `robots.txt` a hlavička `X-Robots-Tag: noindex` držia stránky mimo vyhľadávačov.
- Basic Auth je jednoduchá zábrana, nie ochrana citlivých dát. Cez HTTPS je heslo
  šifrované, ale odkaz aj heslo sa dajú preposlať ďalej — posielaj ich adresne.
- Najväčší súbor je `hub` PDF (~15 MB), limit Cloudflare Pages je 25 MiB na súbor.
- PNG screenshoty (`screens/`) sa nenasadzujú — HTML sú self-contained a nepotrebujú ich.
