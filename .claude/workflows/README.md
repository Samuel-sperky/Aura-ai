# Workflows — Aura Roadmap

Opakovateľné agentové workflows pre túto appku a pre rodinu. Spúšťajú sa nástrojom
`Workflow` z Claude Code **v tomto projekte** (workflow sa hľadá v `.claude/workflows/`
relatívne k pracovnému adresáru session).

```
Workflow({ name: 'aura-verify' })
```

Sú verzované s kódom zámerne — keď sa zmení appka, zmení sa s ňou aj to, ako sa overuje.

## Prehľad

| Workflow | Agentov | Kedy spustiť | Stav |
|---|---|---|---|
| `aura-verify` | 4 | Pred každým commitom, ktorý sa dotkol `src/`, `db/` alebo `scripts/`. Vždy pred pushom. | **pripravený** |
| `aura-new-app` | 3 | Pri zakladaní novej appky rodiny | **pripravený** |
| `aura-roadmap-integrations` | 5 | Až keď sa rozhodneš zapojiť Roadmap do rodiny | **odložený rozhodnutím** |
| `aura-family-accent-unify` | 5 | Až keď sa rozhodneš doriešiť teal vs zlatá | **odložený rozhodnutím** |

## `aura-verify` — overovacia brána

Nahrádza ručné spúšťanie `tsc` / `lint` / `vitest` / `build` / `e2e` a pridáva to,
čo sa pri ručnom overovaní vždy preskočí: **kontroly súladu s kontraktom** (zakázané
tabuľky a stĺpce, soft delete, `version` presne na troch tabuľkách, raw hex v CSS,
handler bez auth, dev-fallback secrety).

```
Workflow({ name: 'aura-verify' })
Workflow({ name: 'aura-verify', args: { skipE2e: true } })
```

Predpoklady pre živú fázu: beží Docker, existuje `.env` s `ADMIN_EMAIL`/`ADMIN_PASSWORD`,
a raz vykonané `npx playwright install chromium`.

**Prečo existuje:** jedenásťagentový build šprint nahlásil „done" na každom agentovi.
Brána našla **11 defektov**, štyri blokujúce — seed, ktorý vôbec nedobehol a jeho proces
visel šesť hodín; zálohovací skript, ktorý sa neparsoval; rate-limit, ktorý dovolil ~4
zobrazenia Prehľadu za minútu pre celý tím; a stránku, ktorá na mobile panovala o 424 px.
Ani jedno z toho nebolo v žiadnom agentovom reporte. Preto: **meraj, nedôveruj.**

## `aura-new-app` — scaffold novej appky rodiny

```
Workflow({ name: 'aura-new-app', args: {
  name: 'aura-sklad',
  port: 3050,
  dbName: 'aura_sklad',
  title: 'Aura Sklad',
  purpose: 'Evidencia skladových zásob a pohybov',
}})
```

Bez argumentov vypíše, čo očakáva, a zoznam obsadených portov.

Rodina zakladá nové appky kopírovaním staršej — je to zdokumentované rozhodnutie
(`aura-kpi/navrh/BUILD-SPEC.md` to hovorí priamo) a funguje. Kopíruje ale aj chyby:
`aura-kpi` a `aura-logistika` majú ~440 duplikovaných riadkov s dvojriadkovým rozdielom
a ich `app.js` sa už rozišiel o 286 riadkov, takže oprava sa musí aplikovať dva- až
trikrát.

Tento workflow kopíruje z `aura-roadmap`, ktorá je prvá appka rodiny s reálnou
overovacou bránou, a — to je hlavné — **prenáša do novej appky zoznam 14 overených
pascí** a v bráne overí, že žiadna z nich sa nevrátila.

## `aura-roadmap-integrations` — odložený

Read-only user `roadmap_ro` a plnenie IT projektov ako metrika v `aura-kpi`.

**Odložené rozhodnutím** (otázka #83: „nie v prvej verzii — pripraviť read-only usera,
nezapájať"). Nespúšťaj ako rutinnú follow-up prácu.

Rodina má presne jeden integračný vzor a workflow ho rešpektuje: `aura-kpi` čita
susedov read-only cez SQL, žiadne HTTP API-to-API volania medzi appkami v `C:\Aura`
neexistujú. Workflow zároveň obchádza pascu, ktorú má existujúca integrácia: `aura-kpi`
si hardcoduje názvy stĺpcov susedných DB a `aura-logistika` nemá git repo vôbec, takže
rename tam rozbije KPI bez histórie na diff. Roadmap preto exponuje **SQL view** ako
stabilný kontrakt, nie surové tabuľky.

## `aura-family-accent-unify` — odložený

Rozpor teal vs zlatá naprieč rodinou.

**Odložené rozhodnutím** (otázka #63: „teal teraz + samostatná úloha na zjednotenie
rodiny"). Dotýka sa `sperky-ai`, ktorý je v prevádzke.

Workflow je zámerne postavený tak, že **fáza 1 nemení ani jeden súbor** — zisťuje, čo
reálne beží na live. Dôvod: Hades tvrdí, že redizajn so zlatým akcentom bol nasadený
21. 7. 2026, ale git tvrdí, že branch `redesign` nie je v `main`. Obe tvrdenia nemôžu
byť pravdivé a každé tokenové rozhodnutie závisí od toho, ktoré platí. Hádať by
znamenalo prefarbiť päť aplikácií nesprávne.

Aplikačná fáza sa **nespúšťa automaticky**. Workflow skončí podkladom
`docs/AKCENT-ROZHODNUTIE.md` a čaká na rozhodnutie vlastníka — prefarbenie piatich
apiek, z ktorých jedna je v produkcii a štyri nemajú testy ani git históriu, nie je
rozhodnutie, ktoré si workflow smie vziať sám.

## Konvencie, ktoré tieto workflows držia

- **Agenti nespúšťajú git príkazy.** Commituje orchestrátor, po zelenej bráne.
- **Vlastníctvo súborov je explicitné** v každej úlohe. Paralelní agenti si nesmú
  písať do tých istých súborov — v build šprinte to bola príčina troch nesúladov.
- **Heslá sa načítavajú z `.env` do premenných prostredia a nikdy sa nevypisujú.**
- **Reporty majú JSON schému.** Voľný text sa nedá spoľahlivo spracovať ďalšou fázou.
- **Brána je vždy posledná fáza a má `effort: 'high'`.**
