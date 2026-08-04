# AuraAI Chat (:8082)

Chatové okno rodiny Aura — lokálny model qwen3:4b cez Ollamu, cloud fallback so stropom a povinná citácia zdroja pri každom čísle.

## Čo je v tomto priečinku

- `index.html` — self-contained náhľad appky (otvor v prehliadači, funguje aj offline)
- `screens/` — PNG všetkých obrazoviek: tmavá téma, svetlá téma, EN a mobil 390 px
- tento README

## Obrazovky

`#chat` · `#projekty` · `#historia` · `#sablony` · `#subory` · `#spotreba` · `#stavy` · `#nastroje` · `#nastavenia`

## Čo appka v náhľade vie

- klikateľná navigácia, triedenie tabuliek klikom na hlavičku, stránkovanie nad 12 riadkov
- bez API konektora (appka nemá integrácie)
- bez importu
- bez report buildera
- chat AuraAI (`⌘J`) s 3 navrhovanými otázkami na každú obrazovku a povinnou citáciou zdroja
- SK/EN, tmavá aj svetlá téma, mobil, `⌘K` hľadanie

## Dáta

Overené čísla z pamäte Aura AI sú prenesené 1:1 a v poznámkach označené ako overené.
Ostatné hodnoty sú ukážkové v reálnom objeme (tabuľky 20–40 riadkov, grafy 12 mesiacov)
a slúžia na predvedenie rozloženia a tokov — nie sú to prevádzkové údaje.

Odkazy na ostatné appky v ľavom rade fungujú len v plnom balíku `aura-suite`.
