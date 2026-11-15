# Trailer: «tinylittleme»

Mål: en filmtrailer på ca. 45 sekunder som viser de kuleste tingene i spillet. **Alle bilder tas ut av selve spillmotoren** (ingen egne animasjoner eller mock-ups); bare tekstkort, klipping, overganger, fargekorrigering og musikk legges på etterpå.

## Valg (avklart med Rune)
- **Format:** liggende 16:9, ca. 45 sek. Rendret i 960 × 540 med 12 bilder per sekund fra motoren, interpolert til 24 fps og oppskalert til 1280 × 720 (ingen GPU: ca. 12 s per bilde i 720p, så dette gir 40–60 min rendering).
- **Språk:** norsk tekst. **Tone:** blanding (alvorlig og filmatisk først, litt humor når byggingen braker sammen).
- **Musikk:** spillets egen musikk (`tools/music_wav.cjs`): rolig og leken, blir mer spent når vannet stiger.
- **Med:** **sjefmauren**. **Ikke med** (valgt bort): lekerommet (nivå 7) og Bygglab. Fagverk mot firkant er ikke eget klipp.
- **Siste kort:** «tinylittleme» og «Snart til en telefon nær deg.»

## Manus
| Tid | Tekstkort | Bilder fra spillet (motoren) |
|---|---|---|
| 0:00–0:05 | «Du er 3 cm høy.» | Badet (Nivå 1): langsom kamerabane over badekaret, lysstråler fra vinduet, smuler og gulvdetaljer som gir målestokk. |
| 0:05–0:10 | «Rommet er laget for noen andre.» | Figuren klatrer opp vaskekurven: hang med vekt, grep og skyv fra med bena (R58). |
| 0:10–0:15 | «Alt lever.» | Barnerommet: sprettboksen kaster figuren (R34), leke-bilen, og en veps som varsler og stuper (R61). |
| 0:15–0:20 | «Og noen vokter.» | Kjøkkenet: **sjefmauren** varsler med rødt, løper rett fram og blir svimmel mot veggen; figuren hopper på ryggen. |
| 0:20–0:24 | «Og vannet stiger.» | Nivå 4: vannet stiger mens figuren hopper mellom hyller. Musikken skifter til den spente varianten. |
| 0:24–0:34 | «Så bygg.» | Byggeskjermen: planke plasseres og snapper, zoom, prøve. Broen bøyer seg og blir rød, brister (litt humor: «Ok. Prøv igjen.»), så ny bro som holder og «Tåler 12 klosser». |
| 0:34–0:39 | «Løs gåter.» | Stuen: figuren bærer fjernkontrollen til trykkplata, skyvedøren åpner seg. |
| 0:39–0:42 | (raske klipp) | Oljeglidning i Verkstedet, edderkopp i tråd, lys og skygger. |
| 0:42–0:45 | «tinylittleme» / «Snart til en telefon nær deg.» | Tittel over siste bilde (figuren som står på en kant og ser utover rommet). |

## Slik lages den
1. **Kinomodus i spillet** (R68): `?cinema=1` skjuler all UI og lar et skript styre kamera, figur og tid bilde for bilde, deterministisk.
2. **Ett skript per klipp** (`tools/trailer/shots/<id>.cjs`): bruker den ekte boten og rutene (`walk_route`, `tools/bot.mjs`) og testbilder for å sjekke utsnittet.
3. **Rendering i bakgrunnen** (`tools/trailer/render.cjs`): én kø, bilde for bilde.
4. **Montasje** (`tools/trailer/build.sh`): ffmpeg (klipp, overganger, interpolering, fargekorrigering, tekstkort med DejaVu-skrift, musikk fra spillet).
5. Filen leveres som mp4 (ikke sjekket inn; den bygges med skriptene).
