# Backlogg

Status: `[ ]` ikke startet · `[~]` påbegynt · `[x]` ferdig. Nyeste idéer øverst i hver gruppe.

## Fra spill-research (`docs/DESIGNLAERDOM.md`, v0.27)
Rangert etter verdi/innsats i rapporten. Kildegrunnlaget er svakt (søkesammendrag), så tallverdier er startverdier for tuning.
- [~] **Grep-kode (v0.28):** oransje kant på grep-flater, valgfri fremheving, og figuren rekker ut en arm når noe kan gripes. Gjenstår: tydelig negativ markering av glatte flater.
- [~] **Tilgivelse for mobilinput (v0.28):** coyote 0,14 s, hoppbuffer holdes under hurk/landing, REKK UT snapper (0,45 enheter). Gjenstår: bredere auto-kantgrep uten knapp, spilletest av verdiene.
- [x] **Stamina i figuren (v0.38):** stripe over hodet, skjelving og svette fra 30 %, tom stamina = kontrollert skli (0,45 s), papirbånd koster lite. Trenger spilletest av tallene.
- [ ] **Billig utvei:** auto-respawn av ting som havner utilgjengelig, nullstill (N) gratis når en ting er fysisk fastlåst, og trygg autolagring av grunnfremgang (lagring til 25 poeng er risikabelt for korte mobiløkter).
- [ ] **Fallgrenser varslet:** landingsmarkør/kontaktskygge, vindlyd og FOV-økning mot terskelen, tre tydelige landingsklasser.
- [ ] **Bot begrenset til menneskelige evner**, to-nivå validering (streng/løs), viser ruten, og feil på lange ruter går til menneskelig gjennomgang. Avgjør om veggsprang skal være et tillatt verktøy eller blokkeres.
- [ ] **Ett verktøy per rom** og hint etter 3 feil på samme sted; første rom per mekanikk uten poengtap.
- [ ] **Touch:** kast med dra–slipp og snap, kameraassistanse, kontroller minst 44 pt, presets for tilgjengelighet.
- [ ] **Personvern:** del bare geometri/objektliste, slett bilder etter generering, private brett som standard, overlay av AI-tolkningen på originalbildet før publisering.
- [~] **Kombineringsmotor** (v0.40): nål + trådsnelle → taubane er hardkodet i `physics.js` (`useTool`, `useZip`). Gjenstår: en tabell over egenskaper og regler (BotW/Scribblenauts) når det kommer flere kombinasjoner.
- [ ] **Verifiser** hullene i kapittel 5 av rapporten (staminatall, fallterskler, coyote-verdier, single-slot) mot primærkilder når nettilgang finnes.

## Idéer til sparring

### [~] Flytte objekter som hjelpemiddel (og risikoen for at de faller)
PoC er bygd: dytte (etter vekt), bære lette ting, stable, glir av ved dårlig støtte, knuses ved fall, klemt, fare-soner, nullstill. Se `docs/FLYTTBARE_TING.md` og prøverommet `?level=poc`.

Gjenstår / til sparring:
1. **Dra og løfte:** nå bare dytte og bære lette ting. Skal tunge kunne dras? (Å sette en lett ting oppå en hylle/annen ting er på plass fra v0.17; gjenstår: medium ting, og å løfte over hodet.)
2. **Straff:** nå klemt = tilbake til lagringspunkt (−10), knust = −5, nullstilling = −15. Riktig nivå?
3. **Bildene bestemmer?** Nå markeres løse ting for hånd i `scene.json`. Kan visjonssteget gjette (løst/fast, tung/lett, skjør)?
4. **Boten og puslespill:** boten flytter ikke ting. Hvordan validere at et brett er løsbart *ved å flytte ting*? Forslag: egne «lovlige plasseringer» per ting.
5. **Friksjon:** en ting på en annen følger ikke med når du dytter. Skal den det (realistisk, men fjerner fall-fellen)?
6. **Tipping og rotasjon** (ikke bare bokser).
7. Bedre skår/effekter.

## Bevegelse og spillfølelse
- [~] **Klatrehjelp (v0.20):** kast, hard landing/myke flater og stavhopp er på plass i prøverommet `?level=klatring` (`docs/KLATREHJELP.md`). Nål + tråd → taubane er på plass fra v0.40. Gjenstår: flere kombinasjoner (svamp + vann, håndkle + håndkle), papirhaug som presses sammen, stavhopp-animasjon, bot som bruker stav/kast. Trenger spilletest av verdiene.
- [~] **Klatring (B):** første versjon fra v0.21: `grip`-flater, stamina, opp/ned/sidelengs, kantgrep over toppen (`docs/KLATREHJELP.md`, prøverom `?level=klatring`). Hårgelé og dopapirbånd er med fra v0.22. Badet (v0.39): et oppfunnet håndkle over servantkanten er grep (det står ikke på bildene). Gjenstår: flere grep i badet (knotter, dusjkurv), `slick`-flater, sidelengs langs stang, boten som klatrer. Se `docs/BADET.md`.
- [ ] Spilletest av «Spenning» vs «Klassisk» med ekte hender, og justering av verdiene.
- [ ] Mobil-test av touch-kontrollene (stikke, HOPP, REKK UT).
- [x] «Prince»-følelse (treghet, vekt, hurk, oppstigning som tar tid, roligere kamera). Første versjon. Trenger spilletest.
- [x] Gange med skritt og fast fot (IK): første versjon. Trenger spilletest.
- [ ] Finpuss av Prince: kant-shimmy (gå sidelengs i hengende), rulle/ta imot ved landing, forsiktig gange som aldri faller av kanten, tau-sving som føles tyngre.
- [~] Kamerahjelp (v0.44): utoning av ting i veien og pil når figuren er utenfor skjermen er på plass. Fra v0.45 løfter kameraet seg over vegger og ser nedover i fall / oppover i klatring. Gjenstår: silhuett gjennom ting som ikke kan tones ut (løse ting, tak).
- [~] Kamera: valgfri automatisk dreining etter bevegelsesretning (v0.25, tast X, trenger spilletest: holder du stikken til siden går figuren i en sving). Gjenstår: fastere kameravinkler per brett.
- [x] Figur med bøyelig overkropp, hopp/fall/landing som bevegelse, levende hvile. Første versjon. Trenger spilletest.
- [~] Figur (v0.34): ansikt med blunking/blikk/uttrykk og skjerf/sekk som fjærer er på plass. Gjenstår: fingre som tar tak, hår/jakke som beveger seg, tilbehør å samle (hatter m.m.), valg av utseende, stemme (neste).
- [ ] Snu på stedet med små skritt (nå roterer bare kroppen), og tråkke over små hindre.
- [ ] Bedre hang/sving/veggglid (ofte bare enkle poser ennå).

## Lyd
- [x] Første lydmotor (syntetisert): skritt per underlag, pust, tar sats, avspark, fall, landing, hendelser. Trenger lytting.
- [x] Lydmikser: volum for hver lyd, forhåndsspilling, huskes.
- [ ] Ekte lydopptak (foley) og flere varianter per underlag.
- [~] Romlyd/ambiens: dryppende kran og vifte i badet (v0.23, `audio.ambience`). Gjenstår: 3D-lyd, ambiens for flere rom.
- [x] Mikser (v0.13) og visuell støtte for hørselshemmede: lydtekst med retning (v0.23, tast V).
- [ ] Musikk.

## Brett og innhold
- [ ] Flytte motgiften til toppen av speilskapet når klatring finnes.
- [ ] Motgift-varianter: A) bit = ferdig kapittel, B) vann stiger, rømme til døra.
- [~] Vask (forsenkning), karets avrundede ende og skråtak: *utseendet* er på plass fra v0.18–0.19 (`props.js`: do, kar, vask, småting). Kollisjonen er fortsatt bokser: vasken er flat å gå på, karet har rettvinklede vegger. Skråtak mangler. Venter på bildene for å rette formene (hvilken ende er rund osv.).
- [ ] Neste rom: lekerom (legoknotter som tak), stue, kjøkken.
- [ ] Åpne spørsmål om motgift-biter: bæres mellom rom? antall? bonusting? (`docs/BADET.md`)

## Foto → brett
- [ ] Bedre fangstprotokoll (hjørnebilder, gulvhøyde, A4-referanse). Se `docs/FOTO_TIL_BRETT.md`.
- [~] Strukturert tolkning: skjema, validator, tingliste og instruks er på plass (v0.24, `docs/VISJON_PROMPT.md`). Gjenstår selve API-kallet (bilder inn, scene ut) og at det kjøres med en nøkkel; i dag gjøres steget fortsatt for hånd i en samtale.
- [~] Brukergjennomgang: hjelpeobjekter kan merkes og listes i ⚙ (v0.24). Gjenstår: en visning der man kan flytte/fjerne feilplasserte ting før spilling.
- [ ] Personvern: behandle på enhet eller slett umiddelbart etter tolkning.

## Teknisk
- [ ] Boten forstår klatring og farer. I dag hopp, rekk ut, tau og hazards.
- [ ] Portere fysikk til Unity/Godot (`physics.js` er uten DOM).
- [ ] Flerspiller (langt frem).
