# Aura Logistika (:3020)

Týždenná evidencia zásielok a reklamácií naprieč 8 krajinami a 5 prepravcami.

## Čo je v tomto priečinku

- `index.html` — self-contained náhľad appky (otvor v prehliadači, funguje aj offline)
- `screens/` — PNG všetkých obrazoviek: tmavá téma, svetlá téma, EN a mobil 390 px
- tento README

## Obrazovky

`#reklamacie` · `#reklamacia` · `#vyvoj` · `#stavy` · `#prepravcovia` · `#krajiny` · `#import` · `#audit` · `#nastavenia` · `#prehlad` · `#zasielky` · `#zasielka`

## Čo appka v náhľade vie

- klikateľná navigácia, triedenie tabuliek klikom na hlavičku, stránkovanie nad 12 riadkov
- Shop API konektor: LIVE pilulka, sync, simulácia výpadku
- import wizard so 4 krokmi (reálne CSV cez FileReader, mapovanie, validácia, upsert + Vrátiť)
- report builder so živým náhľadom, CSV, tlačou a plánovaním
- chat AuraAI (`⌘J`) s 3 navrhovanými otázkami na každú obrazovku a povinnou citáciou zdroja
- SK/EN, tmavá aj svetlá téma, mobil, `⌘K` hľadanie

## Dáta

Overené čísla z pamäte Aura AI sú prenesené 1:1 a v poznámkach označené ako overené.
Ostatné hodnoty sú ukážkové v reálnom objeme (tabuľky 20–40 riadkov, grafy 12 mesiacov)
a slúžia na predvedenie rozloženia a tokov — nie sú to prevádzkové údaje.

Odkazy na ostatné appky v ľavom rade fungujú len v plnom balíku `aura-suite`.
