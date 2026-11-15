# Shotlist: trailer fra selve spillet

Maskinlesbar versjon: `tools/trailer/shotlist.json` (startpose, bilder, handlinger, rutesteg, kamera og API per klipp). Manus: `docs/TRAILER.md`. Alle klipp tas ut av motoren; ingen egne animasjoner. Format 960 x 540, 12 bilder/s, ett bilde = 5 fysikk-tikk. Summen er 540 bilder (45 s).

## Hva som ble sjekket (8 stillbilder, programvare-GL, liggende 960 x 540)
Bildene er ikke sjekket inn. Alle ble tatt med `?level=<brett>&start=0`, `window.__paused = true`, `window.__game.tick`, figuren satt via `window.__game.player`, UI skjult med CSS og `tlm.markers/labels/minimap/guide = false`, `tlm.compassmode = off`.

| Bilde | Brett | Resultat |
|---|---|---|
| A (to ganger) | bad | Fritt kamera (`window.__camLock = true`, `camera.position/lookAt`) virker. Første forsøk fra gulvet [-6,6,22] ga bare en nærbilde av kurven. Fra [-23,17,23] mot [20,4,-2] (fov 62) kommer baderommet, kurven, eskertrappa og smuler fint med (brukbart). Badekaret skjules av trebrettet til høyre; lysstråler ble ikke sett. |
| B | bad | Boten-lignende klatring i nettleseren virker med `touch.y = 1`, `touch.grab = true` og en `KeyE` keydown hvert 20. tikk (grab-kanten). Figuren er `climb` på kurven etter 327 tikk. Kameraet (yaw 0.5, dist 7) var dårlig: kurven fyller halve bildet og figuren er kuttet øverst. Første forsøk med `touch.y = -1` gjorde ingenting (feil retning). |
| C | barnerom | Sprettboksen kaster figuren høyt med armene opp (R34 virker), men klovnehatten dekker halve bildet fra yaw 0.5. Flytt kamera til siden. |
| D | kjokken2 | Sjefmauren ligger i `windup` etter ca. 1,5 s og lyser rødt, store øyne, flott. Figuren blir liten (dist 9), kjøleskapet fyller venstre kant. Gå nærmere og fra siden. |
| F | bro | Byggeskjermen kan åpnes og styres med dra-og-slipp: plank_l gir «Tåler ca. 2 klosser», ★★★. Utsnittet er lite midt i en mørk flate, og prøven gikk bare t = 0.3 s etter 9 s veggtid. |

Ikke tatt (bildebudsjettet var brukt): stigende vann (E ble bare lastet), stuen (G, bare lastet, døra ble ikke lest), sluttbildet (H), veps, edderkopp, olje, lys og skygge. Disse er merket «ikke verifisert» i JSON-en.

## Funn som endrer manuset
- **Veps i barnerommet finnes ikke.** Vepser er i `kjokken`, `kjokken2`, `stue` og `verksted`. Klippet er splittet: 03 (sprettboks, leke-bil i barnerom) og 03b (veps i kjokken).
- **Sjefmauren er i nivå 6 (`kjokken2`), ikke i nivå 3.** Han ligger i `L.boss` (a [-31,0,-8], b [-19,0,-8]) og smeller i kjoleskapet (front z = -17).
- **Stigende vann er et valg, ikke standard.** Sett `tlm.flood = 'rask'` og `tlm.floodrate = 2.5` før lasting. Ellers bare vading.
- **Byggeklippet bør filmes i `bygglab` (lab7 «Tåler»)**, ikke i `kontroll` (der mangler ref-bygget). Beregnet i node: plank_l alene tåler 4 klosser, «to lange planker med tape» tåler 12 (stemmer med «Tåler 12 klosser» i manus). Brudd i nettleseren er ikke sett.

## Klipp, begrunnelse og risiko
| Klipp | Valgt | Risiko |
|---|---|---|
| 01 Bad, oversikt (60) | `bad`, fritt kamera fra [-23,17,23], figuren [-5.5,0,19.4] som målestokk | Lysstråler er ikke sett. Gylne omriss rundt klatreflater og små markører står igjen selv med markører av: må skjules i kinomodus. Eskertrappa (hard vei) dominerer. |
| 02 Klatring (60) | `bad`, kurv_knagg (route[1..2]), start [3.5,0,13], 5,5 s | Kameraet må fra den frie siden (yaw -0.6) og følge figuren; ellers kuttes figuren. Staten er `climb` langs veggen, `hang` først ved kanten. Krefter går fra 6 til 4,5. |
| 03 Barnerom (36) | `barnerom`, sprettboks [6.6,-4.6] og leke-bil [-2.6,-13.6] | Klovnen skjuler bildet fra feil vinkel. Hoppet må skriptes (ingen bot). |
| 03b Veps (24) | `kjokken`, veps_bord, figuren [-12,0,6] | Ikke prøvd. Vepsen er liten. Varselet varer bare 0,9 s: timing av sidesteg er sårbar. |
| 04 Sjefmaur (60) | `kjokken2`, figuren [-25,0,-14], sjef i [-25,0,-8] | Hele sekvensen (varsle, støt, svimmel, hopp) er ikke filmet. Svimmel-tiden (4,8 s) er nok til hoppet; sjefen kan også bli sliten etter to bom. Figuren er liten i bildet. |
| 05 Vann (48) | `bad2` med `tlm.flood = rask`, figuren på kurven [5.7,12,7] | 31,5 s veggtid i spillet må spoles (15 tikk per bilde). Er vannet synlig fra kamera? Ikke sett. Kameraskjelv/vignett før drukning kan dukke opp: sett `tlm.floodshake = 0`. |
| 06 Bygging (120) | `bygglab` lab7: plank_l alene (tåler 4), så to planker med tape (tåler 12). Alternativ `bro` bro1 | Størst risiko. Sanntids-simulering: trenger `cine.build.step`. Skjermen er 2D med knapper; liten i liggende format, må zoomes og beskjæres. Klippet er det lengste (120 bilder, 10 s). |
| 07 Stue (60) | `stue`, fjernkontroll [-55,0,19] til plate p1 (x -38..-28, z -2..10), dør d1 | Ikke verifisert at døra åpner seg (vekt 2, kroppen må settes inn i plata ved ekte bæring). Døra synker langsomt: fint, men avhenger av kameraet. |
| 08a Olje (12) | `verksted`, olje_1, figuren [-64,0,4] | Sklien er rask: 1 s. Kameraet må være lavt for å vise glansen. |
| 08b Edderkopp (12) | `kjokken2` traad_kjokken [24,0,3] | Tråden går over bildet: kamera må se opp. Takt (oppe 1,6 s) kan bomme. |
| 08c Lys/skygge (12) | `kjokken2` lights-twist (15 s på / 8 s av) | Mørk scene ser dårlig ut etter ffmpeg-fargekorrigering. 900 tikk før lyset slås av. |
| 09 Slutt (36) | `verksted` maal [38.4,24.4,-20] (alt: stue maal, bad medisinskap) | Ikke sett. Hylle-kanten er 122 cm opp: god dybde, men glatt rom med lite farge. |

## Hva som kreves av API-et
- **R68 (kinomodus)** trengs for: `setCam`/`followCam` per bilde (følgekameraet henger etter og kutter figuren), `setHero` (rene starter), `step` (fast tid), `runRoute` med bane per tikk (boten sporer bare hvert 6. tikk), `cine.build.open/step` (byggeskjermen går i sanntid) og skjuling av gylne omriss (`tlm.markers = false` skjuler dem ikke).
- **Dagens `window.__game`** (player, tick, LEVEL, cam, camera + `__camLock`, `touch`, `bld`) rekker for klippene 01, 02, 03, 03b, 04, 07, 08, 09, og kan brukes midlertidig, men gir ujevn kamerabane og ingen bygge-klipp.

## Generelle risikoer
- **Rendertid:** 540 bilder x ca. 12 s (programvare-GL, målt 40-76 s per innlasting og bilde) er omtrent 108 min, mot 40-60 min i `docs/TRAILER.md`. Enten 480 x 270 for utkast eller færre bilder (10 fps).
- Liggende format kutter toppen og bunnen av høye klatrebilder (kurv 12 enheter, medisinskap 38): hold figuren i midten med `height`.
- Byggeskjermen er laget for stående mobil; 16:9 gir mye tom flate.
- Programvare-GL gir noe annen skygge og glans enn en iPhone.
