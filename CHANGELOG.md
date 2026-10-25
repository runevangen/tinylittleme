# Endringslogg

Versjonsnummeret (`version.js`, vises øverst til venstre i spillet) økes for hver endring som committes. Nyeste øverst.

- **0.26** – Rå research-mapper (`research_notes/`, `reports/`) holdes utenfor git; ferdige rapporter kopieres til `docs/`.
- **0.25** – Valgfri kamerafølging (tast X eller ⚙): kameraet dreier seg langsomt bak figuren når den går på bakken, og slutter i 1,5 s etter at du selv drar i kameraet. Av som standard.
- **0.24** – Foto → brett, strukturert: JSON-skjema (`docs/scene.schema.json`), validator (`npm run validate -- scenes/x.scene.json`: feil og advarsler om overlapp, ukjente kinds, lette ting som er for store …), tinglisten (`kinds.js`) og en generert instruks til tolkningssteget (`docs/VISJON_PROMPT.md`). `npm test` kjører nå også scene-testene. I ⚙ kan hjelpeobjektene fra brettlageren merkes med gule kanter og listes, så et menneske kan se over dem.
- **0.23** – Romlyd: dryppende kran og vifte i badet (`audio.ambience` i scenen; mikser-kanaler «Rom»). Lydtekst for hørselshemmede (tast V eller ⚙): korte tekster med retning (◀ ▶) for landing, drypp, knusing, klemt, plask, sjekkpunkt, ta/slipp; virker også med lyden av. Boten (`tools/solve.mjs`) viser nå hvilke bevegelser løsningen bruker og kan prøve uten veggsprang (`--nowalljump`).
- **0.22** – Verktøy du bærer og bruker med F: **hårgelé** (smør et klistrete grep-felt på veggen: vått i 20 s = sklir og koster stamina, så fast) og **dopapirrull** (ruller ut et bånd over en kant: klatrbart, men revner etter ca. 7 s i bruk). Nytt trykk samme sted slipper tingen; nullstill (N) fjerner felt og bånd. Prøverommet har gelflaske (kast den opp på hylla!) og rull øverst på tårnet. Tester 27–28.
- **0.21** – Klatring på grep-flater (første versjon): fest med REKK UT mot en flate merket `grip`, styr opp/ned/sidelengs, stamina (10 s, vises som «grep ▮▮▮▯» i HUD), hiv deg over kanten, hopp løs. Klatreanimasjon. Håndkle-rute i prøverommet `?level=klatring` (nedre håndkle, hvilehylle, hopp-og-grip, øvre håndkle). Tester 25–26.
- **0.20** – Klatrehjelp (første versjon): kast (hold F og slipp, med bue), hard landing i Prince (bedøvet / tilbake til lagringspunkt) og myke flater, stavhopp med ørepinne, svamp og dopapirhaug. Nytt prøverom `?level=klatring`. Se `docs/KLATREHJELP.md`.
- **0.19** – Småting med ekte former og tekstur: såpepumpe, tannkrem, tannglass med børste, kran, barbermaskin, dopapir, vaskeskap med dører og knotter, vask med sluk og vann, speil med ramme, dusjkurver av krom, flettet kurv, frottéhåndklær, vevd matte, glasshylle, doskrubb. Teksturer tegnes i nettleseren (frotté, flett, tre, etikett, krom).
- **0.18** – Do og badekar tegnes som ekte former (ikke bokser): do med oval skål, sete, sisterne og åpent lokk; badekar med avrundet ende, sluk, kran og vannpytt. Vann i do-skålen. Nytt: `props.js`; brettet får `kind`/`group` per boks. Kollisjonen er uendret.
- **0.17** – Sett på: bærer du en ting og står foran et bord, en hylle, en kasse eller en annen ting, setter F den trygt oppå (opp til litt over hodet). Ny test.
- **0.16** – Figuren flimret mellom «står» og «luft» (armer og bein skalv) når bildetidene var ujevne, slik de er på telefon. Fikset i fysikken: like lange delsteg og gulvsondering. Ny test.
- **0.15** – Versjonsnummer i spillet og endringslogg.
- **0.14** – Bena skjelver ikke lenger: jevn hoftehøyde og myk svingfot.
- **0.13** – Lydmikser (volum per lyd) og brettknapp med hukommelse.
- **0.12** – Figur: ingen skjelving i armene, bøyelig overkropp, hopp/fall/landing som bevegelse.
- **0.11** – Syntetisert lydmotor.
- **0.10** – Gange med skritt og fast fot (IK).
