# Backlogg

Status: `[ ]` ikke startet · `[~]` påbegynt · `[x]` ferdig. Nyeste idéer øverst i hver gruppe.

## Idéer til sparring

### [~] Flytte objekter som hjelpemiddel (og risikoen for at de faller)
PoC er bygd: dytte (etter vekt), bære lette ting, stable, glir av ved dårlig støtte, knuses ved fall, klemt, fare-soner, nullstill. Se `docs/FLYTTBARE_TING.md` og prøverommet `?level=poc`.

Gjenstår / til sparring:
1. **Dra og løfte:** nå bare dytte og bære lette ting. Skal tunge kunne dras? Skal man kunne løfte noe oppå en hylle?
2. **Straff:** nå klemt = tilbake til lagringspunkt (−10), knust = −5, nullstilling = −15. Riktig nivå?
3. **Bildene bestemmer?** Nå markeres løse ting for hånd i `scene.json`. Kan visjonssteget gjette (løst/fast, tung/lett, skjør)?
4. **Boten og puslespill:** boten flytter ikke ting. Hvordan validere at et brett er løsbart *ved å flytte ting*? Forslag: egne «lovlige plasseringer» per ting.
5. **Friksjon:** en ting på en annen følger ikke med når du dytter. Skal den det (realistisk, men fjerner fall-fellen)?
6. **Tipping og rotasjon** (ikke bare bokser).
7. Bedre skår/effekter.

## Bevegelse og spillfølelse
- [ ] **Klatring (B):** `grip`/`slick`/`soft`-overflater, stamina, sidelengs bevegelse langs stang, tak fra bildene (knotter, håndkle, dusjkurv, tannbørste). Brettet merker allerede `holds`. Se `docs/BADET.md`.
- [ ] Spilletest av «Spenning» vs «Klassisk» med ekte hender, og justering av verdiene.
- [ ] Mobil-test av touch-kontrollene (stikke, HOPP, REKK UT).
- [x] «Prince»-følelse (treghet, vekt, hurk, oppstigning som tar tid, roligere kamera). Første versjon. Trenger spilletest.
- [x] Gange med skritt og fast fot (IK): første versjon. Trenger spilletest.
- [ ] Finpuss av Prince: kant-shimmy (gå sidelengs i hengende), rulle/ta imot ved landing, forsiktig gange som aldri faller av kanten, tau-sving som føles tyngre.
- [ ] Kamera: valgfri automatisk dreining etter bevegelsesretning, evt. fastere kameravinkler per brett.
- [x] Figur med bøyelig overkropp, hopp/fall/landing som bevegelse, levende hvile. Første versjon. Trenger spilletest.
- [ ] Fingre og hender som tar tak, ansikt (øyne som ser og blunker), klær som beveger seg (hår, jakke).
- [ ] Snu på stedet med små skritt (nå roterer bare kroppen), og tråkke over små hindre.
- [ ] Bedre hang/sving/veggglid (ofte bare enkle poser ennå).

## Lyd
- [x] Første lydmotor (syntetisert): skritt per underlag, pust, tar sats, avspark, fall, landing, hendelser. Trenger lytting.
- [x] Lydmikser: volum for hver lyd, forhåndsspilling, huskes.
- [ ] Ekte lydopptak (foley) og flere varianter per underlag.
- [ ] Romlyd/ambiens per rom (dryppende kran, vifte), og 3D-lyd.
- [ ] Musikk, mikser, visuell støtte for hørselshemmede.

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
