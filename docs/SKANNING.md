# Skannet rom (LiDAR, GLB) som bane (R194, trinn 1)

Safari på iOS har ikke WebXR/ARKit, så skanningen gjøres **utenfor** spillet, og modellen lastes inn som en bane.

## Slik eksporterer du GLB
**Scaniverse (iPhone med LiDAR)**
1. Skann rommet (gå sakte rundt, ta med gulvet og hjørnene).
2. Trykk på skanningen → del-ikonet → **Export Model** → format **GLB**. Velg **Medium** eller lavere detalj (ikke «Ultra»).
3. Lagre i **Filer** på telefonen.

**Polycam**
1. Skann i LiDAR-modus og prosesser (Space / Room).
2. **Export** → **GLB**. Velg lav eller middels detalj (Polycam viser filstørrelsen).
3. Lagre i **Filer**.

Anbefalt: under ca. 30 MB og under 500 000 trekanter. Grensene i spillet er 80 MB og 1,5 million trekanter (da kommer en melding om å velge lavere detalj).

## Slik laster du den inn
1. Hovedmenyen → **VELG BRETT** → **LAG BRETT FRA BILDER** → **SKANNET ROM (GLB)**.
2. Velg detalj i kollisjonen (FIN 5 cm, NORMAL 8 cm, GROV 12 cm) og trykk **VELG GLB-FIL** (på iPhone åpner det Filer).
3. Spillet leser filen, finner gulvet, gjør overflaten om til grove bokser (kollisjon) og setter start og mål selv. Du får samme resultatskjerm som for brett fra bilder: **SPILL**, **FLY RUNDT**, **JUSTER** (flytt start/mål, **MÅL 1–4**, lys), **NAVN** og **MINE BRETT**.
4. Selve skanningen vises som utseende (de grå boksene skjules). ⚙ → Test → «Skannet rom: vis skanningen som utseende» slår det av.

## Hva skjer med filen
- GLB-filen leses **på telefonen** og lagres i nettleseren (IndexedDB) knyttet til brettet. Den sendes **aldri** til noen tjeneste. Bare tallene (bokser, start, mål) ligger i brettet.
- Et DELT brett (kode) har bare boksene: den som åpner det ser de grå boksene, ikke skanningen.
- Slett brettet i MINE BRETT; GLB-en blir liggende i nettleserlageret til du tømmer nettstedets data (trinn 1 rydder ikke automatisk).

## `?scan=<sti>` (fra repoet)
`https://…/index.html?scan=skann/rom.glb` laster en GLB som ligger i repoet, som om du hadde valgt den fra Filer (krever tester-kode). **GitHub Pages er offentlig:** legger du skanningen av hjemmet ditt i repoet, kan alle som kjenner adressen laste den ned. Skannefiler og bilder legges aldri i repoet av agenter.

## Slik virker det (kort)
`scan_logic.js` (ren, testet i node): meter → enheter (×20, 1 enhet = 5 cm), gulv = laveste tette horisontale lag (støypunkter under gulvet teller ikke), voxel av overflaten (gulv-, tak- og veggringlag tas ikke med, enkeltceller fjernes), grådig sammenslåing til bokser (tak 450 bokser: ved flere brukes grovere celle, og et brett lagres lokalt med maks 600 bokser / 150 kB), start = ledig gulvflekk nær ett hjørne, mål = høyeste brede flate (spillet prøver de seks høyeste og velger første som kan vinnes). Resultatet er en vanlig scene som går gjennom `sceneToRoom`. Taket i GLB-en klippes bort så kameraet ser ned i rommet; materialene gjøres ulyste (lyset er bakt inn i skanningen).

## Testet hvor
Node (`test_scan.mjs`) og Chromium uten GPU (`tools/live_scan.cjs`, iPhone 14-emulering, syntetisk GLB): logikk, import, brett, spilling. **Må sjekkes på telefon:** ekte Scaniverse/Polycam-fil (detalj, størrelse, lastetid), FPS med en tung GLB, Filer-velgeren på iPhone, minne.
