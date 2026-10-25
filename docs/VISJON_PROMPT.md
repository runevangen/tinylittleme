# Instruks til bildetolkningen (generert av `tools/make_prompt.mjs`: ikke rediger for hånd)

Du får 3–4 vanlige mobilbilder av ett rom. Lag en **scene** (JSON som følger `docs/scene.schema.json`) som spillet gjør om til et 3D-brett.
Svar bare med JSON. Kontroller resultatet med `node tools/validate_scene.mjs` før det brukes.

## Mål og koordinater
- Alle mål i **cm**. Origo i rommets nordvestre hjørne: x mot øst, z mot sør (mot døra), y opp fra gulvet.
- Finn skala fra kjente gjenstander: toalettrull ≈ 10 × 10 cm, flis ≈ 20 × 20 cm, do-sete ≈ 40 cm over gulvet, dør ≈ 200 cm.
- Hver ting er en aksejustert boks `box: [x0, x1, y0, y1, z0, z1]` (min før maks). Bruk flere bokser for ting som ikke er firkantede (se grupper).
- Gi hver ting `confidence` (0–1) og hvilke bilder den sees på (`photos`). Gjett heller enn å utelate, men sett lav confidence.

## Tinglisten (kind)
Bruk et kind fra tabellen når det passer; ellers et kort engelsk navn (tegnes som vanlig boks). «ja» = tegnes med ekte form, «boks» = vanlig boks.

| kind | form | beskrivelse |
|---|---|---|
| `tub` | ja | badekar: lag fire bokser (to langsider, to ender) i samme group; en fare «pit» for innsiden |
| `toilet_tank` | ja | do: sisterne (stående boks mot veggen), i samme group som toilet_bowl |
| `toilet_bowl` | ja | do: skålen som fire bokser rundt et hull (fare «flush» i hullet), i samme group |
| `toilet_lid` | ja | do: åpent lokk (tynn stående boks mot sisternen), i samme group |
| `vanity` | ja | vaskeskap (tre) med dører |
| `vanity_top` | ja | benkeplate/vask (porselen), flat topp; sluk og vann tegnes automatisk |
| `chest` | boks | kommode, benk, hylle, kasse av tre (vanlig boks) |
| `table` | boks | bord (vanlig boks) |
| `box` | boks | eske / enkel boks |
| `crate` | boks | kasse (tre) |
| `vase` | boks | vase / skjør pynteting (breakable: true) |
| `wall_cabinet` | boks | veggskap |
| `door` | boks | dør / åpen skapdør |
| `sill` | boks | vinduskarm |
| `shelf` | ja | glasshylle med braketter |
| `mirror` | ja | speil med ramme (bruk decor: true) |
| `light_box` | ja | lampeboks / lysrør over speil |
| `bottle` | ja | flaske (såpe, sjampo …); id med «pump» får pumpehode |
| `tube` | ja | tube (tannkrem) |
| `faucet` | ja | kran (krom) |
| `shaver` | ja | barbermaskin / føner |
| `roll` | ja | toalettrull |
| `cup` | ja | tannglass / kopp |
| `toothbrush` | ja | tannbørste |
| `knob` | ja | knott / håndtak (decor: true) |
| `towel` | ja | brettet håndkle (frotté) |
| `towel_hang` | ja | håndkle som henger langs en vegg; sett grip: true for klatring |
| `mat` | ja | matte / dørmatte |
| `basket` | ja | vaskekurv / flettet kurv |
| `bag` | ja | pose / toalettveske |
| `caddy` | ja | dusjkurv (kromtråd) |
| `pole` | ja | doskrubb / stang |
| `qtip` | ja | ørepinne (stav): movable light + pole: 1.5 |
| `sponge` | ja | svamp: movable light + soft: true |
| `paper_pile` | ja | haug med dopapir: soft: true (fast myk flate) |
| `needle` | ja | nål: movable light + tool: "needle" (trædes med en trådsnelle til en taubane) |
| `spool` | ja | trådsnelle: movable light + tool: "spool" + thread: true |
| `gel_bottle` | ja | hårgelé: movable light + tool: "gel" |

## Felt per ting
- `material`: wood, woodpanel, tile, porcelain, ceramic, plastic, fabric, paper, metal, glass, mirror, wicker, book, plaster.
- `color`: hex `#rrggbb`. Bildene er ofte nesten hvite: velg farger som skiller tingene (se `look`).
- `cp: true` på et par solide flater midtveis (sjekkpunkt). `soft: true` på myke flater (matte, håndkle, papirhaug) som demper fall.
- `movable`: light | medium | heavy for løse ting (lett = kan bæres, maks 17 cm). `breakable: true` for skjøre.
- `grip: true` på ting man kan klatre i (håndkle som henger, kabel). `hold: true` på mulige tak (knotter, kurver).
- `tool`: gel | roll | needle | spool (krever movable light): hårgelé og dopapirrull. `pole`: stavlengde (enheter) for en stav.
- `decor: true` for ting uten kollisjon (speil, knotter). `group: "navn"` for ting som består av flere bokser (do, badekar).

## Farer og start/mål
- `hazards`: type pit | flush (pit = kar/grop man ikke kommer ut av; flush = do-skål). `box` i cm og en `message`.
- `start`: {x, z} der spilleren kommer inn (ved døra). `goal`: {x, y, z} en ting høyt oppe som er et mål.
- `windows`: vegg (N/S/E/W), posisjon langs veggen, y, w, h. `look`: lysdempning. `audio`: {reverb, ambience: ["drip","fan"]}.

## Det du ikke ser
Døras plassering og baksider må gjettes. Skriv det i `source.uncertainty`. Et menneske skal se over **hjelpeobjekter** (trappetrinn generatoren legger inn) og feilplasserte ting før brettet spilles.
