# Backlogg

Status: `[ ]` ikke startet · `[~]` påbegynt · `[x]` ferdig. Nyeste idéer øverst i hver gruppe.

## Idéer til sparring

### [ ] Flytte objekter som hjelpemiddel (og risikoen for at de faller)
Spilleren skal kunne dytte/dra ting (brettede håndklær, toalettruller, flasker, esker) for å lage sine egne trinn og broer.
Gjør du det feil, kan tingene velte eller falle over deg.

Første tanker (ikke bestemt):
- **Fysikk:** i dag er alt statiske, akse-justerte bokser. Dette krever bevegelige legemer: dytting, stabling, velting, fall. Enten en ekte fysikkmotor (f.eks. Rapier som WASM) eller en forenklet boks-fysikk med egne regler.
- **Konsekvens:** objekt som treffer deg = skade? Konkret forslag å vurdere: tilbakeføring (−poeng) som ved fall, evt. «knust»-animasjon. Vekt-klasser: lett (dyttes), tung (flyttes bare med anstrengelse), fast (kan ikke flyttes).
- **Hjelpeobjektene** som generatoren legger inn (trapp av «håndklær») kan bli flyttbare i stedet for faste. Da blir de en del av løsningen, ikke gratis trapp.
- **Validering:** boten (`tools/solve.mjs`) antar statisk verden. Med flyttbare objekter eksploderer tilstandsrommet. Trenger sannsynligvis regler som «hvert objekt har noen lovlige plasseringer» i stedet for å simulere alt.
- **Mobil:** trenger en «ta tak/dytt»-knapp som fungerer i tillegg til HOPP og REKK UT.
- **Portabilitet og flerspiller:** fysikk på tvers av enheter må være deterministisk, hvis vi senere vil ha flerspiller.

Spørsmål til neste sparring:
1. Bare dytte og dra, eller også løfte og bære?
2. Skal ting kunne gå i stykker (flaske knuses)?
3. Hvor straffende skal «feil» være? Døden-ved-fall, eller bare tid/poeng?
4. Skal bildene styre hva som er flyttbart (ting som er løse i virkeligheten), eller bestemmer vi det?
5. Gjelder det alle rom, eller er det en egenskap ved visse kapitler (lekerommet først)?

## Bevegelse og spillfølelse
- [ ] **Klatring (B):** `grip`/`slick`/`soft`-overflater, stamina, sidelengs bevegelse langs stang, tak fra bildene (knotter, håndkle, dusjkurv, tannbørste). Brettet merker allerede `holds`. Se `docs/BADET.md`.
- [ ] Spilletest av «Spenning» vs «Klassisk» med ekte hender, og justering av verdiene.
- [ ] Mobil-test av touch-kontrollene (stikke, HOPP, REKK UT).
- [ ] Bedre gåanimasjon (sett bare på stillbilder).

## Brett og innhold
- [ ] Flytte motgiften til toppen av speilskapet når klatring finnes.
- [ ] Motgift-varianter: A) bit = ferdig kapittel, B) vann stiger, rømme til døra.
- [ ] Modellere vask (forsenkning), karets avrundede ende og skråtak.
- [ ] Neste rom: lekerom (legoknotter som tak), stue, kjøkken.
- [ ] Åpne spørsmål om motgift-biter: bæres mellom rom? antall? bonusting? (`docs/BADET.md`)

## Foto → brett
- [ ] Bedre fangstprotokoll (hjørnebilder, gulvhøyde, A4-referanse). Se `docs/FOTO_TIL_BRETT.md`.
- [ ] Gjøre tolkningen til et strukturert API-kall (i dag gjort for hånd i samtale).
- [ ] Brukergjennomgang av hjelpeobjekter og feilplasserte ting før spilling.
- [ ] Personvern: behandle på enhet eller slett umiddelbart etter tolkning.

## Teknisk
- [ ] Boten forstår klatring og farer. I dag hopp, rekk ut, tau og hazards.
- [ ] Portere fysikk til Unity/Godot (`physics.js` er uten DOM).
- [ ] Flerspiller (langt frem).
- [ ] Lyd.
