# CONTRACT — rozhranie medzi agentmi A1–A4

Zdroj pravdy: `presentation/build/_source-v2_1.html` (21 slajdov). **Nikto ho needituje.**
Plán: `PLAN.md` v roote repa. Každý agent píše **výhradne** svoje súbory a žiadne iné.

---

## 1 · Súbory a vlastníctvo

| Súbor | Vlastník | Obsah |
|---|---|---|
| `build/body.html` | **A1** | výhradne 13× `<section class="s" id="sNN">…</section>`, v poradí, nič iné (žiadny `<style>`, `<script>`, `<head>`) |
| `build/tooltips.js` | **A1** | `window.AURA_GLOSSARY` + `window.AURA_TT_INLINE` |
| `build/do-asany.md` | **A1** | texty, ktoré sa nezmestili na slajd → vstup pre A4 subtasky |
| `build/deck.css` | **A2** | všetko CSS pre deck režim vrátane `:root` tokenov |
| `build/deck.js` | **A2** | jedno IIFE: navigácia, téma, animácie, tooltipy, slovníček, nákres, konfigurátor. Exportuje `window.DECK` |
| `build/report.css` | **A3** | výhradne pravidlá pod `html[data-mode="doc"]` a `@media print` |
| `build/mode.js` | **A3** | jedno IIFE: prepínač Deck/Dokument, doc reveal, číslovanie sekcií |
| `build/shoot.mjs` | **A4** | Playwright: verifikácia + 31 PNG + PDF |
| `build/asana.json` | **A4** | kostra Asana projektu ako dáta |
| `build/INDEX.md` | **A4** | tabuľka PNG → Asana task |

Zlepenie do jedného `presentation/aura-ai-prezentacia.html` robí **hlavný agent**, nie A1–A4.
Poradie v hlave: `deck.css` → `report.css`. Poradie skriptov na konci body:
`tooltips.js` → `deck.js` → `mode.js`.

---

## 2 · Slajdy — pevné ID a poradie

| ID | Názov | Vznikol zo sekcií zdroja (riadky) |
|---|---|---|
| `s01` | Vlastné AI jadro. Naše dáta zostanú doma. | 278 |
| `s02` | Ako AI používame už dnes — MCP a Hades | **983 + 456** |
| `s03` | Jedno jadro, tri izolované ruky | 296 |
| `s04` | Pred a po — prepnite stav | 1040 |
| `s05` | Bezpečnosť a hranica dát — štyri zóny | **820 + 402** |
| `s06` | Pamäť je nedostatkový tovar | 601 |
| `s07` | Hardware — čo sme posúdili a čo prešlo | **623 + 681 + 654** |
| `s08` | Tri scenáre CapEx: 17 · 33 · 54 tisíc € | 705 |
| `s09` | TCO na 3 roky — a prečo prenájom nie je alternatíva | **761 + 799** |
| `s10` | Poskladajte si zostavu | 1193 |
| `s11` | 26 týždňov, 11 brán, žiadne skratky | 521 |
| `s12` | Od testov k rolloutu | **882 + 907** |
| `s13` | Najbližších 45 dní rozhodne o celej investícii | **1256 + 956** |

Sekcia 1155 (Deväť rozmerov / Pred a po v číslach) **padá úplne**.

Eyebrow formát: `<div class="eb an">NN <s>·</s> Názov bloku</div>` — `NN` je dvojciferné číslo slajdu.

---

## 3 · Dizajnové tokeny — finálne hodnoty

```css
:root{
  --teal:#05bcc4; --teal-2:#03797e; --teal-3:#7fd0d4;
  --gold:#d8b878; --gold-t:#c9a869;
  --paper:#0e1413; --card:#131b1a; --card-2:#1b2523; --line:#22302e;
  --ink:#e8f0ef; --ink-2:#b9c9c7; --ink-3:#829896;
  --good:#3fbf7f; --amber:#e8a33d; --red:#e0554e; --violet:#8b7fd4;
  --mono:'JetBrains Mono',ui-monospace,monospace;
  --disp:'Playfair Display',Georgia,serif;
  --body:'Inter',system-ui,sans-serif;
}
:root[data-theme="light"]{
  --paper:#f8f4f7; --card:#fffdfe; --card-2:#ece6ea; --line:#e2dae0;
  --ink:#131b1a; --ink-2:#3b4a48; --ink-3:#667574; --gold-t:#8a6417;
}
```

Nové farby sa **nevymýšľajú**. Odtiene výhradne cez `color-mix(in srgb, var(--token) N%, var(--card))`.
Semantika: teal = neutrálne/pozitívne, gold = pozor/podmienené, red = riziko/padá, good = potvrdené.

---

## 4 · Povolený slovník tried

A1 smie použiť **iba** tieto triedy. Nič nové nevymýšľa — ak niečo chýba, napíše to do `do-asany.md`
a použije najbližšiu existujúcu.

**Layout:** `s` `wr` `split` `g` `g2` `g3` `g4` `g5` `g6`
**Typografia:** `eb` `sub` `ld` `tiny` `mono` `svl` `gt` `an`
**Karty:** `c` `c gd` `c am` `tg` `tg gd` `tg am` `tg rd` `kpi` `box` `box ok` `box w` `box bad`
**Tabuľky:** `tw` `n` (na `td`) `badge ok` `badge cond` `badge no` `badge q`
**Grafy:** `bars` `bar` `lb` `tr` `vl` `stack` `lgd` `nd` `ln` `fl`
**Interaktivita:** `seg` `ix` `hot` `dp` `dr` `nowv` `hint` `cfg` `fld` `opts` `rw` `out` `big` `sm` `lin` `lin tot` `flg` `f-w` `f-b` `f-o` `tt`
**Utility:** `r` (na `<hr>`)

Animácie: `class="an"` + `style="animation-delay:.NNs"`. Delay nikdy nad `.8s` (pri manažérskom
publiku nemá zmysel čakať na obsah).

---

## 5 · `window.DECK` API — kontrakt medzi A2 a A3

A2 vytvorí, A3 iba konzumuje:

```js
window.DECK = {
  go(n),              // prepne na slajd 0..12
  current(),          // vráti index aktuálneho slajdu
  count(),            // 13
  slides(),           // pole <section> elementov
  onMode(mode),       // A3 volá pri prepnutí; mode = 'deck' | 'doc'
                      // deck.js si v 'doc' vypne klávesy, swipe, dots a .s.on logiku
  reduced()           // true ak prefers-reduced-motion
};
document.addEventListener('aura:mode', e => {...});  // e.detail.mode
```

A3 nastavuje `document.documentElement.dataset.mode = 'deck' | 'doc'` a **potom** volá
`window.DECK.onMode(mode)`. Default pri načítaní: `deck`. Žiadny `localStorage`.

---

## 6 · Tvrdé pravidlá pre všetkých

1. **Čísla sú nemenné.** Každé číslo, dátum, €, %, GB a GB/s sa prenáša znak po znaku zo zdroja.
   Nič sa neprepočítava, nezaokrúhľuje ani nedopĺňa. Ak číslo v zdroji nie je, na slajde nebude.
2. Žiadny `localStorage` / `sessionStorage`.
3. Žiadna nová externá závislosť. Jediná povolená je Google Fonts v `<head>` (rieši hlavný agent).
4. Grafy ručné SVG s `viewBox` — žiadna knižnica.
5. `@media (prefers-reduced-motion: reduce)` vypína všetky animácie a `scroll-behavior`.
6. Čísla vo formáte `sk-SK`: desatinná čiarka, nedeliteľná medzera v tisícoch, `€` a `%` oddelené nbsp.
7. Slovenská diakritika všade správne. Žiadne emoji (výnimka: koruna `♛` v hero).
8. Tón: manažment schvaľujúci investíciu. Stručne, vecne, bez marketingu. Kde je tvrdenie bez dôkazu,
   povie sa to otvorene — tak ako to robí zdroj („Neznáme výsledky sa nevymýšľajú").
