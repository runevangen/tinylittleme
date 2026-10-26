# 1. persons visning (prøve, v0.49)

Slå på: ⚙ → Kamera → «Kamerasyn / View» → «1. person (prøve)», eller åpne siden med `?view=first`. Standard er fortsatt 3. person.

## Hva er gjort
Kameraet sitter i øyehøyde (0,8 enheter ≈ 4 cm over føttene), 0,14 foran figuren, følger stivt (ingen etterslep) og ser dit `cam.yaw`/`cam.pitch` peker (±1,25 rad opp/ned, bredere synsfelt 74°). Hodet, skjerfet og sekken skjules; overkropp, armer og ben vises (du ser dem når du ser ned). Stikken beveger relativt til blikkretningen som før, dra på høyre halvdel snur blikket, ◎ / dobbelttrykk snur blikket dit figuren ser. Fysikken er uendret. Auto-kamera, utoning, løft over vegger og kamerapilen er av i denne visningen; snakkeboble og kraftstripe over hodet er skjult (kreftene står i HUD-en).

## Funn (testet i emulert iPhone 14)
**Det går:** alle mekanikker er brukbare uten endring i fysikken (gå, hoppe, gripe, klatre, bære, kaste med dra, taubane, kompass og gulvpil). Koden er ca. 30 linjer.

**Det som er svakt:**
1. **Kanter og avstander.** Når du står på en flate og ser fremover, ser du bare en endeløs, flat treplate. Du ser kanten først når du ser 40–60° ned. Hopp over gap og landing blir gjetting uten hjelp.
2. **Føttene** vises først når du ser ca. 65° ned eller mer. Det er for mye til at du kan se dem mens du spiller.
3. **Skala.** Øynene er 4 cm over gulvet, så rommet er enormt og teksturene (tre, tøy) dominerer bildet og gir dårlig dybde.
4. **Tilbakemelding fra figuren** (skjelving, svette, utmattet, glad) vises ikke. Bare hendene og HUD-en forteller det.
5. **Pekekontroll:** dra for å se rundt og stikke for å gå samtidig går, men blikket drar lett av gårde i hopp og klatring (ingen auto-hjelp).

## Hva som skal til hvis dette skal bli en ekte modus
- Se ned mot kanten av seg selv når du nærmer deg et fall (auto-pitch ned ved kant).
- Kontaktskygge og landingsmarkør under figuren, og kantlinje på flater i nærheten.
- Hender og gjenstander tydeligere i bildet, og en kraftindikator i bildekanten.
- Valg for synsfelt, snu-hastighet og «invertert blikk» (komfort/kvalme).
- Spilletest på ekte telefon med noen som ikke har spilt før.

Anbefaling: behold som valgfri prøve; 3. person er best til plattformspill i denne skalaen. Hvis 1. person skal brukes, bør det være i rolige utforskingsbrett og ikke i klatre- og hoppbrett.

## Over skulderen (v0.52, standard fra v0.53)
⚙ → Kamera → «Kamerasyn» → «Over skulderen (som PUBG)», eller `?view=shoulder`. Kameraet står tett bak figuren (3 enheter) og forskjøvet 0,5 til høyre (eller venstre skulder), litt lavere vinkel og synsfelt 58°. Et hårkors står midt på skjermen. Mens du bærer noe: hold TA litt (over ca. 0,3 s) og kastet går dit hårkorset peker, med kraft etter holdetiden (dra ned på TA-knappen virker også). Avstand, sideforskyvning, side og hårkors kan justeres i ⚙ → Kamera. Utoning og kamerahjelp virker som i vanlig 3. person. Figuren går fortsatt i «Prince»-gange (snur seg gradvis mot gangretningen), så den går ikke sidelengs.

Fra v0.53 er «Over skulderen» standard. Vil du ha den gamle kameraet bak figuren: ⚙ → Kamera → Kamerasyn → «3. person», eller `?view=third`.
