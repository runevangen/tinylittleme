# Nivåene (v0.72)

Seks nivåer med stigende vanskelighetsgrad: tre rom (nivå 1–3), og de samme tre rommene ommøblert (nivå 4–6, se lenger ned). Spillet åpner nivå 1 første gang, og når du når målet får du knappen «Neste nivå →». Nivåer du har klart får ✓ i ⚙ → Spill → Brett. Ingen nivåer er låst (alt kan velges fritt mens vi tester).

| | Nivå 1: Badet | Nivå 2: Barnerommet | Nivå 3: Kjøkkenet |
|---|---|---|---|
| Fil | `scenes/bad.scene.json` (R42: motgiften på medisinskapet, 190 cm; vei via kurv, badekåpe, knaggrekke og håndkle; hard vei med esker) | `scenes/barnerom.scene.json` | `scenes/kjokken.scene.json` |
| Kilde | tolket fra fire bilder | oppdiktet for spillet | oppdiktet for spillet |
| Steg i ruta | 5 | 12 | 16 |
| Klatringer | 1 (vaskekurv, 60 cm) | 1 (gardin, 34 cm) | 2 (kjøkkenhåndkle 34 cm, hvitløksflette 48 cm: tar nesten alle kreftene) |
| Hopp over gap | ingen | 1 (25 cm, over lekebøtta) | 1 (25 cm, fra overskap til kjøleskap, 2 m over gulvet) |
| Farer på ruta | ingen (kar og do ligger utenfor) | lekebøtta under hoppet | oppvaskkum og kokeplater med smal kant forbi, glatt gulv |
| Høyeste punkt | 96 cm | 148 cm | 200 cm |
| Fall som sender deg tilbake | nei | fra hylle og skap | fra hylle, overskap og kjøleskap |
| Sjekkpunkter | sisterne, vask | lekekasse, seng, nattbord, skrivebord | benk (tre steder) |
| Gått av verktøyet | 33 s | 44 s | 56 s |

## Rutene
- **Nivå 1:** gulv → vaskekurv (klatre) → sisterne → vask → tannglass.
- **Nivå 2:** gulv → to klosser → lekekasse → seng → nattbord → hopp over lekebøtta → krakk → skrivebord → gardin (klatre) → vinduskarm → vegghylle → spilleske → klesskap.
- **Nivå 3:** gulv → fire skuffer som trapp → benk → smal kant foran vasken → benk → smal kant foran kokeplatene → benk → brødrister → mikrobølgeovn → kjøkkenhåndkle (klatre) → krydderhylle → hvitløksflette (klatre) → overskap → hopp til kjøleskapet.

Skuffene i nivå 3 (åpne) og nivå 6 (lukkede fronter) er `kind: "drawer"` med `drawer: { open, front, handle, style }` i scenen (R55, `drawers.js`); tilstanden leses av tegningen, kollisjon og rute er uendret.

## Nivå 4–6: de samme rommene, løst på en ny måte
Laget av grunnscenene med `tools/make_variants.mjs` (flytter møbler, legger til hyller og ting, flytter målet). Endrer du en grunnscene, kjør verktøyet på nytt; `npm test` sier fra hvis variantene er utdaterte, og krever at ruta er en annen enn i grunnrommet.

| | Nivå 4: Badet, ommøblert | Nivå 5: Barnerommet, ommøblert | Nivå 6: Kjøkkenet, ryddet om |
|---|---|---|---|
| Fil | `scenes/bad2.scene.json` | `scenes/barnerom2.scene.json` | `scenes/kjokken2.scene.json` |
| Hva er endret | Vaskekurven står under knaggene, buksa er tatt ned, ny hylle og to nye håndklær, den lille kurven står på gulvet | Krakken er borte, ny smal hylle over lekebøtta, bok på nattbordet, to nye hyller over døra | Skuffene er lukket, kasse og håndkle foran komfyren, overskapet er kortere, kjøleskapet flyttet, liten hylle over vasken |
| Ny løsning | Fire klatringer rett opp panelveggen: kurv → badekåpe → knaggrekke → håndkle → ny hylle → håndkle → øverste hylle | Balanser på hylla over lekebøtta i stedet for å hoppe, og fortsett fra klesskapet bortover hyllene over døra med et hopp til siste hylle | Opp via kassa og håndkleet på komfyren (rett inn mellom kokeplatene og kanten), og to hopp i høyden: overskap → liten hylle → kjøleskap |
| Mål | øverste hylle, 199 cm | hylla i hjørnet, 150 cm | kjøleskapet, 190 cm |
| Steg | 8 (4 klatringer) | 15 | 12 (3 klatringer) |
| Det vanskelige | krefter: du må hvile mellom klatringene, og alt over kurven er for høyt å falle fra | smal hylle over en fare, og 1,5 m fallhøyde på slutten | varme plater rett bak deg når du kommer opp, og to hopp 2 m over gulvet |
| Gått av verktøyet | 43 s | 54 s | 56 s |

### Egen stemning og vri per rom (R12)
Nivå 4–6 er ikke bare ommøblert: hver har eget lys, egen palett, nye rekvisitter og én vri. Alt står som data i `variant` i scenen (satt opp i `tools/make_variants.mjs`, kopiert til brettet av `scene2level`), ikke som kopi av grunnscenen. Logikken ligger i `variant.js` (testes i `test_variant.mjs`), tegningen i `variant_view.js`, paletten i `TINTS` i `grade.js`.

| | Nivå 4: Badet | Nivå 5: Barnerommet | Nivå 6: Kjøkkenet |
|---|---|---|---|
| Stemning | kveld: oransje sollys, korallfarger, rosa skygger | natt: blått månelys, indigo vegger, stjerner på veggene, **hjelmlykt** (lyskjegle foran figuren) | skumring i lilla og oker; når lyset slås av: mørkt, bare hjelmlykta lyser |
| Vri | **vannet stiger** (16 s tørt, 9 s stiger, 6 s fullt, 9 s synker). Vading i vann: tregere og mister krefter. Klatre opp av vannet | **leketog** på skinner i rommet: patruljerer som en maur, hopp på lokomotivet (HOPP) eller gå utenom | **lyset slås av** (15 s på, 8 s av, med blink): følg hjelmlykta, lysskiltene og pilen |
| Rekvisitter | koraller og lilla tepper, badeand med badering som flyter opp med vannet | rundt lekeløper-teppe, togskinner, stjernehimmel | kakeboks (rød, på gulvet, kan klatres på), to tepper |

Valg i ⚙ → Spill: «Nivå 4–6: egen stemning» og «Nivå 4–6: egen vri» (begge på som standard); Admin: «Hjelmlykt: styrke».

Ikke gjort ennå i nivå 4–6: nye gjenstander som *verktøy* (hårgelé, dopapirbånd, nål og tråd, stav) er ikke lagt inn som alternative løsninger. Gå-verktøyet kan ikke bruke dem, så de må prøves for hånd først.

### Nivå 7: Lekerommet (R31)
Et eget rom (ikke en variant): 600 × 300 cm, gulv og tak som legoplater (knotter, `lekerom_view.js`), tinnsoldater som vakter (maur med `skin: 'soldier'`, egen modell og marsj), egen musikk (`leke` i `music.js`) og egen palett. Scenen lages av `node tools/make_leke.mjs` (`scenes/leke.scene.json`), brettet av `scene2level` (`lego`-feltet følger med), og `test_lekerom.mjs` sjekker at begge er à jour.
- **Den vanlige veien** (`walk_route`): langs gulvet til sørøst-hjørnet og opp den smale trappa langs østveggen (fem trinn) til flagget. Rundt 41 s.
- **Byggestedet** (R30-geometri): et gap på 35 cm mellom «platta» og «tårnet». Bygg en bro (planke) og gå klosstrappa langs nordveggen: snarvei (ruta via bygget er over 20 enheter kortere).
- **Verktøy-gåten** (R29): hårgelé-flaska ligger på gulvet; første trinn av trappa til østveggen er for høyt å hoppe på, men går med gel. Går i 37,6 s mot 41,1 s uten verktøy.
- **Delmål:** samle 6 smuler, knus en tinnsoldat, bygg broen, klatre trappa langs veggen (låser målet).
- Ikke bevist her: ekte FPS og følelse på iPhone (miljøet har ingen GPU). Knottene er målt statisk: to tegnekall og under 16 000 trekanter.

### Nivå 8: Stuen (R62)
Et eget rom (ikke en variant): 670 × 280 cm, laget av `node tools/make_stue.mjs` (`scenes/stue.scene.json`), brettet av `scene2level`; `test_stue.mjs` sjekker at begge er à jour. Logikken (hint, oppsummering) ligger i `stue_logic.js`; gåten bruker `plates_logic.js` (R60), byggestedet R30/R31.
- **Rommet:** teppe (lesbare soner, bare utseende), sofa med to myke puter (`soft`, myke landinger) og en trapp av tre bøker foran, sofabord med spilleske, TV-benk, og bokhylla langs østveggen: syv trinn opp (den harde veien) til toppen, pluss tre hyllefjell fra TV-benken (snarveien). Lekebil, vippehest og bokstavklosser står på teppet.
- **Gåten:** en skyvedør (`d1`, vegg til vegg og til taket, ingen vei rundt) deler rommet. Fjernkontrollen (eller boka) er lett nok til å bæres (TA) og må settes på den gule plata (`p1`, terskel 2: figuren alene er for lett). Døra blir stående åpen (`latch`). `tools/gate_bot.mjs` beviser det med ekte fysikk.
- **Byggestedet** (`stue1`): gapet på 35 cm mellom sofaen og sofabordet, samme mål som i lekerommet, så referansebygget (en lang planke) bærer ball og bil. Ruta via bygget er over 20 enheter kortere enn den harde veien (`test_buildworld.mjs`).
- **Delmål:** 6 smuler, åpne skyvedøren, bygg broen (valgfritt), klatre opp bokhylla (låser målet). **Fiender:** to maur og en veps (R61). **10 smuler.** Egen musikk (`stue` i `music.js`), palett (`grade.js`), fortelling og intro (nivå 8). Nivåvalget og «Neste nivå» kommer fra `LEVELS` i `main.js`.
- **Bevis:** `node tools/walk_route.mjs levels/stue.level.json` (hovedveien, ca. 42 s; med døra lukket kommer du ikke fram), `node tools/gate_bot.mjs levels/stue.level.json`, `node tools/bot.mjs levels/stue.level.json` (ruta og bygget består streng modus).
- **Gulvdetaljer:** rommet er stort, så `room.fdetMax` (118) i scenen setter et lavere tak enn standarden (140) så `perf_budget`/`FDET` holder. Ikke bevist her: ekte FPS og følelse på iPhone (miljøet har ingen GPU).
### Nivå 9: Verkstedet (R63)
Siste rom, 700 × 260 cm (`tools/make_verksted.mjs` → `scenes/verksted.scene.json` → `levels/verksted.level.json`; `test_verksted.mjs` sjekker at de er à jour). «Neste nivå» er nivået med lavest `n` over dette (`nextLevelOf`), så nivå 8 (Stuen, R62) kan komme før eller etter; etter siste nivå viser målskjermen «Alle nivåene klart» og knappen til avslutningen.
- **Hovedveien** (`walk_route`, ca. 47 s): gulv (oljeflekk `olje_1`, glatt) → kasse → verktøykasse med oljet, glatt lokk → oljefille (grep) → arbeidsbenken → gåtekammeret → port → verktøyvegg (grep) → hylle → verktøykassa med motgiften.
- **Vektgåten:** to plater (tung 6, lett 4) og nøyaktig fem mutre à 2 som kan bæres (TA): tre på den tunge, to på den lette. Porten åpner bare når begge er nede samtidig. `gate_bot` løser den med ekte fysikk (`solveGates(…, { from })`), og `walk_route` med lukket port feiler.
- **Byggestedet:** gapet over porten (45 cm) mellom to hyller; én planke rekker ikke, to planker uten tape faller. Referansebygget er to lange planker teipet sammen (`tol` på broflata gir plass til at den henger litt). Snarveien går forbi hele gåten; boten beviser både hovedveien og `bygg:verksted1`.
- **Glatt** (`slick: true` på en boks i scenen): gli uten grep (`slickAccel`, admin-innstilling), rød ✕ og glansstriper (`readable_view.js`); gripbare flater (fillen) virker fra glatt underlag. Sykkeldekket (`tire`) er rundt og ruller når du dytter det.
- Ikke bevist her: ekte FPS og følelsen av å gli på iPhone (testes på iPhone).

## Slik lages og sjekkes et nivå
1. Skriv scenen (`scenes/<navn>.scene.json`, mål i cm) og kontroller den: `node tools/validate_scene.mjs scenes/<navn>.scene.json`.
2. Lag brettet: `node tools/scene2level.mjs scenes/<navn>.scene.json levels/<navn>.level.json`. Rutekartet finner veien og sier fra om det måtte legge inn hjelpetrinn (nivåene skal ha 0).
3. Gå ruta med ekte fysikk: `node tools/walk_route.mjs levels/<navn>.level.json --verbose`. Verktøyet spiller som en øvet spiller i Mario-stil med hjelpemidlene på (går til riktig kant, hopper, holder GREP, hiver seg opp, går rundt hindringer). Går ruta, er nivået gjennomførbart. Går den ikke, viser det hvor det stopper.
4. Legg nivået i `LEVELS` i `main.js` (med `n` for nivånummer). `npm test` går alle tre rutene og krever at hvert nivå har flere steg enn det forrige.

## Regler for nivåbygging (lært underveis)
- Løft over ca. 2,8 enheter (14 cm) krever kantgrep, og da må kanten være tykk nok å ta i (minst 1,5 enheter). Tynne hyller må kunne nås med et rent hopp.
- Trappetrinn som henger over hverandre (skuffer) må ha hel front, ellers går figuren inn under neste trinn.
- Ikke la det være sprekker på rundt 3 cm mellom ting: figuren er 3 cm bred og kan kile seg fast.
- En klatreflate må henge foran kanten du skal opp på, og du må ha noe å stå på foran den (minst 14 cm). Toppen av klatreflaten må ligge i høyde med flaten du skal opp på.
- Ikke sett småting der du lander fra et trinn over (figuren blir stående oppå dem).
- Flater som ligger i en fare (kokeplate) eller under noe annet (skap under benkeplate) regnes ikke som trygge flater i rutekartet.

## Ikke gjort ennå
- Nivå 2 og 3 er enkle i formen (mest klosser med farge): de trenger egne former for seng, stol, kjøleskap, komfyr, og flere småting.
- Ingen egen historie eller overgang mellom nivåene, og ingen låsing.
- Vanskelighetsgraden er satt etter rutelengde, farer og fallhøyde, ikke etter spilletest. Trenger tilbakemelding.

## Maur (v0.77)
Levende fiender som patruljerer en strek (`ants` i `level.json`, laget av `ants` i scenen). Hopp på ryggen (HOPP) = de knuses og du spretter opp; ellers støter de deg tilbake (−4 poeng) og er ufarlige i 1,3 s. De ser deg på 7 enheter (på samme høyde) og løper da mot deg langs streken. Knuste maur kommer tilbake etter 25 s. De hindrer aldri ruta (de kan knuses), så `walk_route` og rutekartet ignorerer dem. Hengende og klatrende er utenfor rekkevidde. Av/på: ⚙ → Hjelp og tekst → «Maur».

I scenen (cm): `"ants": [{ "id": "maur_gulv", "on": "gulv", "from": [x, z], "to": [x, z], "crumb": true, "speed": 2.4 }]`. `on` er `gulv` eller id-en til tingen de går på (toppen av den). `npm test` passer på at hver bane er fri for ting og ligger på flata, og at ingen starter nærmere enn 12 enheter fra start. Variantene (nivå 4–6) arver banene fra grunnscenen; flytter en variant på ting, kortes banen i `tools/make_variants.mjs`.

## Smuler (R3)
Gylne smuler å samle som belønning for å utforske (`collect.js`, modell `buildCrumb` i `props.js`). Du plukker dem ved å gå eller hoppe inn i dem; +10 poeng hver. Teller kompakt i HUD-en («★ 3/10»), står i målskjermen («Smuler: X/Y»), lagres i autolagringen (`crumbs` med id-er) og nullstilles ved «Start på nytt». Av/på: ⚙ → Spill → «Smuler».

I scenen (cm): `"collectibles": [{ "id": "smule_1", "on": "gulv", "at": [x, z] }]` (`on` = `gulv` eller id-en til tingen). `node tools/place_crumbs.mjs scenes/<navn>.scene.json` velger 10 jevnt spredte steder (4 på gulvet, koblet til start, resten på flatene ruta bruker, ikke i farer eller under ting) og skriver dem inn. `make_variants.mjs` gjør det samme for nivå 4–6; kjør `scene2level` etterpå. `npm test` (`test_collect.mjs`) krever minst 8 per brett i nivå 1–6, fri plass og nåbar flate.

## Leker i barneskala (R2)
Nye kinds i `props.js`/`kinds.js` med ren logikk i `toys.js` (testet i `test_scene.mjs`): `letterblock` (bokstavkloss, bokstaven er siste tegn i id-en etter «_», stablede lag får neste bokstav), `legoblock` (knotter innenfor boksen, stables og klatres på) og `toycar` (varebil/buss, hele boksen er karosseri). Alle fyller boksen sin, så kollisjonen stemmer med utseendet. Plassert i barnerommet (nivå 2 og 5, arvet): bokstavklosser i stedet for klossene, legotrapp og leketøysbil på teppet, en dyttbar bokstavkloss; og i kjøkkenet (nivå 3): legotårn, bokstavkloss og bil ved døra. Rutene er uendret og går.

### Flere slag fiender (R6)
`type` på en maur i scenen (og `ants` i level.json): `ant` (standard), `spider` eller `carrier`. Logikken ligger i `foes.js` (testet i `test_physics.mjs`), modellene i `props.js` (`buildSpider`, `buildCarrier`).
- **Edderkopp-vakt** (`"type": "spider", "on": ..., "from": [x, z]`, ingen `to`): står på stedet. Ser den deg (5,5 enheter, samme høyde) duker den i 0,55 s (varsel + hvesing, rygg unna så avblåses det), hopper mot deg (aldri lenger enn 4 enheter fra hjemmet), hviler 1,2 s og går hjem. Støt = −4 poeng; hopp på ryggen (HOPP), også midt i hoppet, = knus og sprett. `npm test` krever at hele hoppflata (4 enheter rundt hjemmet) er fri og på samme flate, at ingen starter innenfor syn fra start, og at ingen annen patrulje går inn i flata.
- **Bærer-maur** (`"type": "carrier"`, `from`/`to` som vanlig maur): går tregere (1,1) og bærer en stor smule. Knuses den, slipper den smula: gå inn i den (etter 0,8 s) for +5 poeng («smule tatt», `stats.crumbs`). Hvis R3 (smuler) finnes, kan hendelsen `crumb` i `antEvent` (main.js) rutes dit.
- Plassering: nivå 2 og 5: bærer + edderkopp; nivå 3: bærer + edderkopp; nivå 4: bærer + edderkopp (laget i `make_variants.mjs`); nivå 6: bærer + to edderkopper. Nivå 1 er uendret. Lyder: `spiderhiss`, `spiderleap`, `crumb` (audio.js).

## Nøkkel og lås (R7)
En liten, valgfri gåte i nivå 3 og 6 (`puzzle.js` logikk, `puzzle_view.js` tegning, testet i `test_puzzle.mjs`). En gylden nøkkel (`kind: "key"`, løs og lett) ligger på overskapet: ta den (TA), bær den til den gylne platen på samme flate og legg den på (SLIPP). Platen blir grønn, og en bro ruller ut over gapet mot neste flate (nivå 3: overskap til kjøleskap; nivå 6: overskap til lille hylle). Broen er en snarvei: rutekartet og `walk_route` bruker den aldri, så målet nås uansett.
- Pila/kompasset peker på «NØKKELEN», så på «LÅSEN», mens du står på flata gåten ligger på og den er uløst; etterpå følger den ruta igjen. Hint-teksten bruker knappenavn. Nøkkelen går tilbake med «Ting ↺».
- I scenen (cm): `"puzzles": [{ "id": "bro", "key": "noekkel", "label": "låsen", "en": "the lock", "plate": { "on": "overskap", "at": [x, z], "r": 10 }, "bridge": { "box": [x0,x1,y0,y1,z0,z1], "axis": "x", "anchor": "max" } }]`, og nøkkelen som vanlig ting med `movable: "light"`. `anchor` er enden broen vokser ut fra. `scene2level` gjør det om til `puzzles` i level.json; `make_variants.mjs` flytter gåten i nivå 6.
- Åpne gåter lagres i autolagringen (`puzzles`) og nullstilles ved «Start på nytt». Loggen: `gåte: nøkkel på plata`, `gåte: åpnet`, `gåte: broen ute`.
## Sjef-maur i nivå 6 (R9)
Nivå 6 har en sjef-maur (`boss` i `kjokken2.level.json`, laget fra `s.boss` i `tools/make_variants.mjs`; `scene2level` skriver den). Logikk: `boss.js` (testet i `test_boss.mjs`), modell: `boss_model.js`, helsebar: `boss_ui.js`; hekter i `main.js` (`bossEvent`, `bossMesh`). Den hindrer aldri ruta (ingen kollisjonsboks).
- **Faser:** patrulje (går mellom `a` og `b`, mot deg når den ser deg, 15 enheter) → varsel (reiser seg, glør rødt, 1,1 s; retningen låses etter 65 % av tida) → støt (løper rett fram) → treffer den vegg/kasse: svimmel 4,8 s (lav, stjerner, ufarlig å røre) → hopp på ryggen (HOPP) = skade, den rister og går videre raskere. Tre hjerter = tre hopp; fase 2 og 3 er raskere med kortere varsel. Hopp på ryggen når den ikke er svimmel gir bare sprett.
- **Rettferdig:** bommer den (støt lenger enn 17 enheter uten å treffe) puster den, og etter to bom slumper den uansett (i det store rommet er det oftest slik den blir svimmel: stikk til siden to ganger, så HOPP på ryggen; boten i test_boss.mjs beviser det). Under varsel/kamp skjules NESTE-pillen, og en stor stripe midt på skjermen sier hva du skal gjøre. Treff mot deg gir tilbakestøt og −4 poeng, aldri å falle ut av brettet.
- **Belønning:** fanfare, konfetti og en stor gyllen smule som tas ved å gå inn i den (+25 poeng, `stats.boss`).
- **Innstilling:** ⚙ → Hjelp → «Sjef-maur i siste rom» (`tlm.boss`). Logg: `sjef varsler`, `sjef stormer`, `sjef svimmel`, `sjef truffet`, `SJEF SLÅTT`, `sjef-smule tatt`. Lyder: `bossroar`, `bossbump`, `fanfare`.
- Plassering: venstre del av kjøkkenet (patrulje x −31…−19, z −8). Bærer-mauren i nivå 6 starter lenger øst, så den ikke går gjennom sjefen. `npm test` sjekker at sjefen har fri bane, ikke ser deg fra start og ikke står nær andre fiender.

### Nye skapninger (R19): pillbug og edderkopp i tråd
Logikk i `creatures.js` (testet i `test_creatures.mjs`), modeller i `creatures_view.js`; hekter i `ants.js` (`type: 'roller' | 'dangler'`) og `creatureEvent` i `main.js`. Bare farlige når `t.danger` er sann, og aldri uten varsel på minst 0,5 s (admin-faktoren `creaturewarn` har gulv 0,7). Alt logges som `logEv('fiende', 'type hendelse id')`. Av/på: ⚙ → Spill → «Nye skapninger».
- **Pillbug** (`"type": "roller", "from": [x, z], "to": [x, z]`): går sakte (ufarlig). Ser den deg (6,5 enheter) rister den og lyser oransje i 0,8 s mens den ruller seg sammen, så ruller den som en kule langs streken mot deg (7,5, farlig), blir svimmel og ufarlig i 1,8 s. Rygg unna før varselet er halvveis = avblåst. HOPP på den = knust (borte i 25 s).
- **Edderkopp i tråd** (`"type": "dangler", "from": [x, z]`, ingen `to`): henger i en tråd fra taket, over hodet ditt. Når du er nær (8 enheter): rister og lyser rødt i 0,9 s, stuper, henger lavt i 1 s (farlig), trekkes opp. Gå forbi mens den er oppe; HOPP på den når den henger lavt = knust (borte i 20 s).
- Plassering: nivå 3: pillbug; nivå 4: to edderkopper i tråd; nivå 5: tråd-edderkopp + pillbug; nivå 6: pillbug (arvet fra nivå 3) + tråd-edderkopp. Nivå 1–2 uendret. Hver trenger fri gulvflate (`npm test` sjekker at tråd-edderkopper har fri flate og tak over seg).

## Delmål (R23)
Hvert av nivå 1–6 har 2–4 delmål (`goals` i scenen, i cm; `scene2level` gjør dem om til `goals` i brettet; nivå 4–6 settes i `tools/make_variants.mjs`). Logikk: `goals.js` (testet i `test_goals.mjs`), panel: `goals_view.js`, tekster `goal.*` i `i18n.js`. Felt: `id`, `type` (`reach` = stå på flata `on`, `crumbs`/`stomp` med `n`, `puzzle`, `boss`, `flag`), `label`, `en`, `gate` (må være klart før målet åpner; bare `reach`/`crumbs`, og `reach` må ligge på ruta), `req` (påkrevd for «alle klare», låser ikke), `after` (ordnet kjede). Uten `gate`/`req` er delmålet valgfritt. Fremdriften lagres i autolagringen (`goals`, `goalFlags`). Et byggedelmål (R24) bruker `type: 'flag'` og settes med `window.__game.setGoalFlag('navn')` / `setGoalFlag(LEVEL, 'navn')`. Hendelser logges som `delmål` og `mål låst`.

## Byggebrett (R26): bygg broen eller ta den harde veien
To ekstrabrett (velges i ⚙ → Spill → Brett): `bro` (Hyllebroen) og `trapp` (Klossetrappa). Scenene ligger i `scenes/bro.scene.json` og `scenes/trapp.scene.json` (laget av `tools/scene2level.mjs` som vanlig).
- **Regel: det finnes alltid en vei uten bygging, og den er vanskelig.** `ruta` i brettet er den harde veien (i `bro`: et langt stykke over gulvet og opp den smale trappa til høyre; i `trapp`: et 21 cm hopp opp bak hylla og et gaphopp, med en maur på gulvet). `walk_route` går den. Bygging er snarveien og belønner å lete etter delene.
- **Bygget i verden** (`build_world.js`): når PRØV lykkes, finner `settledPlaced` (i `build_phys.js`) hvor delene ender opp (klosser faller på plass), og de blir AABB-er i `L.boxes` (rotert planke = rampe av smale skiver). Nedbøyning er bare visuell. Bygget lagres med autolagringen (`build` i fremgangen) og settes tilbake ved «Fortsett».
- **Referansebygg** i scenen (`build.sites[].ref`: `placed`, `links`, `surfaces`, `route`) er en kjent god bygging. `node test_buildworld.mjs` viser at den består PRØV, at ruta via bygget går i ekte fysikk og er kortere enn den harde veien, at målet nås uten bygg, og at et verst tenkelig bygg (hele stedet fylt med solid) ikke stenger den harde veien.
- **Delmål:** «Bygg …» er et valgfritt `flag`-delmål (`flag` = byggestedets id) som settes når bygget klarer PRØV; «Nå flagget» låser målet og kan nås begge veier.

## Flere byggebrett og byggedelen vippe (R30)
To nye byggebrett (velges i ⚙ → Spill → Brett): `vippe` (Vippa over gapet, barnerom: tre, lys vegg) og `kjokkenbro` (Bro til kjøleskapet, kjøkken: flis). Scenene ligger i `scenes/vippe.scene.json` og `scenes/kjokkenbro.scene.json` (laget med `tools/scene2level.mjs` som vanlig). Begge har den harde veien (`ruta` i brettet, bevist med `walk_route`: opp den smale trappa til høyre uten å bygge), et referansebygg og et valgfritt «Bygg …»-delmål (`flag` = byggestedets id) pluss «Nå flagget» som låser målet.
- **Ny del: vippe** (`seesaw` i `build_logic.js`/`build_phys.js`): en stiv planke (8 enheter) med et fast dreiepunkt midt under seg (en kule nøyaktig i midten, festet til underlaget med et skjult ledd som ikke tegnes som ledd). Den svinger fritt rundt midten, men bøyer seg lite og sklir ikke bort. I `vippe`-brettet er den høye hylla 10 cm høyere enn den lave, og gapet er for bredt til å hoppe: legg vippa midt over gapet (festepunktet midt i gapet), rotér den to trinn skrått med ↺ ↻ så den går fra den lave til den høye hylla, og trykk PRØV. En lang planke på skrå kan også klare det (uten støtte i midten), så vippa er en trygg vei, ikke den eneste.
- **I verden:** en prøvd vippe blir en rampe av smale skiver (som en rotert planke) og får en solid støtte (`fulcrum` i `build_world.js`) fra undersiden av planken ned til gulvet i rommet (`site.drop`, i cm i scenen). Støtta er ikke del av ruta.
- **Referansebygg og bevis:** `node test_buildworld.mjs` går alle fire byggebrett (bro, trapp, vippe, kjokkenbro): referansebygget består PRØV, ruta via bygget går i ekte fysikk og er kortere enn den harde veien, brettet kan fullføres uten å bygge, og et verst tenkelig bygg stenger ikke den harde veien. `node test_buildphys.mjs` tester vippa (bærer figuren, dreiepunktet holder, ligger rett uten vekt, vipper ned mot en teipet vekt, determinisme).

## Verktøy-gåter i nivå 4–6 (R29)
Hvert variantrom har en genvei med verktøy (`shortcuts` i brettet, satt opp med `addShortcut` i `tools/make_variants.mjs`, kopiert av `scene2level`). Logikken ligger i `shortcut.js` (testet i `test_shortcut.mjs`).
- **Slik virker den:** en trapp av 2–4 trinn (bokser merket `"shortcut": true` i scenen, ikke en del av den vanlige ruta) der første trinn er for høyt til å hoppe opp på. Ta hårgelé-flaska (TA), bær den til trinnet, trykk SMØR (TA-knappen), legg den fra deg (SLIPP) og klatre i gelen (GREP). Så hopper du oppover trappa til flata genveien ender på (`join`).
- **Nivå 4 (badet):** to trinn opp til vaskekurven (hopper over klatringen i kurven). **Nivå 5 (barnerommet):** tre trinn foran skrivebordet (hopper over bøkene og hyllene). **Nivå 6 (kjøkkenet):** fire trinn opp til kjøkkenbenken (hopper over kassa og håndkleet på komfyren). Den vanlige ruta (lengre og tyngre) fungerer fortsatt uten verktøyet.
- **Bevis:** `node tools/walk_route.mjs levels/<navn>.level.json` går den vanlige ruta og beviser tre ting for hver genvei: (1) første trinn kan ikke nås uten verktøyet, (2) med verktøyet (gelfeltet lages av den ekte fysikken, `toolBoxes` i `shortcut.js`) går hele ruta til målet, (3) genveien er raskere enn den vanlige ruta. Trinnene holdes utenfor rutekartet i `scene2level` (`shortcut: true`), så den vanlige ruta og «ingen hjelpetrinn» er uendret.
- **Spill og logg:** første trinn og toppen gir et varsel (⚙ → Hjelp → «Verktøy-genveier», `tlm.shortcuthint`) og logges som `genvei` (`<id> første trinn` / `<id> oppe`). Gel, bånd og taubane logges som før som `use`.
- **Ny genvei:** legg `addShortcut(s, k, { … })` i `make_variants.mjs` (flaske, trinn i cm, hvor figuren står når den smører, `join`), kjør `make_variants` og `scene2level`, og gå ruta. Hold bane for maur fri for trinnene (`test_scene.mjs` sier fra).


## Boten: klatring, verktøy og bygging (R32)
`node tools/bot.mjs levels/<navn>.level.json [--verbose] [--svg rute.svg] [--json]` går **alle** veiene i et brett med den ekte fysikken (`tools/bot.mjs`, testet i `test_bot.mjs`; bygger på `walkRoute` i `tools/walk_route.mjs`):
- `ruta`: den vanlige ruta, med klatring (GREP mot klatreflater, kantgrep, hvile mellom klatringene) og hopp.
- `genvei:<id>`: verktøy-genveiene fra R29 (hårgelé). Beviser at første trinn ikke kan nås uten verktøyet, at ruta med verktøyet går, og bruker gelfeltet fysikken faktisk lager.
- `bygg:<id>`: byggesnarveiene fra R30 (bro, trapp, vippe, kjøkkenbro). Referansebygget må bestå PRØV i 2D-fysikken, bygget settes inn som faste flater i verden, og ruta via bygget går.
- **To nivåer av menneskelige evner:** *streng* = uten sikte-hjelp (kantvakt, luftstøtte, magnet) og uten veggsprang, bare det en spiller klarer med stikke + HOPP + GREP (autohopp og «hold GREP» regnes som at spilleren trykker riktig). *Løs* = alle hjelpemidler på, slik spillet står som standard. Kreftene (stamina) og hvilepausene er de samme begge steder: de ligger i fysikken.
- **Dommer:** `BESTÅR_STRENG` (alt går), `BESTÅR_LØS` (går bare med hjelpemidler: vurder om brettet er for knapt), `FEIL` (kort rute som ikke går, avslutter med 2) og `TIL_GJENNOMGANG` (lang rute som ikke går, avslutter med 3: ≥ 10 steg eller ≥ 120 enheter gange). På en lang rute kan det like gjerne være boten som er for dum, så et menneske må se på den (spill den, eller se SVG-sporet) før brettet endres. Lista over det som skal gjennomgås skrives ut sist, med årsak.
- **Veggsprang (avgjort):** spillere *kan* bruke det (fysikken har det), men et brett skal aldri kreve det. Boten bruker det aldri, og streng modus slår det av (`wallKick`/`wallUp` = 0). `test_bot.mjs` viser at alle ruter går uten.
- **Vis ruta:** `--verbose` skriver ett trinn per linje (flate, høyde, klatre/hopp/gå). `--svg rute.svg` tegner et sideriss av rommet med botens spor (rød linje = gikk, oransje = feilet der den stoppet) og kan åpnes i nettleser.
- **Dekning:** Kontroll og alle seks nivåene (og byggebrettene) består i streng modus. Kontroll fikk en ekte rute (trinn → plattformer) i stedet for gulv → siste plattform. `test_bot.mjs` krever at hvert brett med rute er med i lista, så et nytt brett må legges inn der.
- **Legge til et nytt brett:** lag ruta som vanlig, kjør `node tools/bot.mjs levels/<navn>.level.json`, og legg id-en i `ids` i `test_bot.mjs`. `solve.mjs` (tilfeldig søk) er uendret og gjelder fortsatt prototyper uten rute; `--nowalljump` finnes der.

## Leker som byggematerialer (R46)
`build_toys.js` (ren logikk, testet i `test_buildtoys.mjs`) har fem deler: **blyant** (stiv, lett, sprø), **linjal** (lang, bøyer seg mye), **legoklosse** (knotter som klikker mot andre legoklosser), **bok** (tung blokk) og **svamp** (myk, dempende, brekker ikke). Geometrien slås inn i `PART_TYPES`, materialene i `MATERIAL`; tegningen (knotter, spiss, streker, hull) ligger i `build_toys_view.js`. Delene ligger på gulvet i `bro`, `kjokkenbro` og `leke` (`build.parts` i scenen); ingen er nødvendig, referansebyggene bruker bare planker. Gummistrikk og binders mangler (trenger egne koblingstyper).

## Leker som testlast (R48)
`build_loads.js` (ren logikk, testet i `test_buildloads.mjs`) har fire laster som PRØV kan bruke i stedet for bare testfiguren: **testfiguren** (masse 1, hopper høyt), **tennisballen** (lett, ruller, tar tid på å få opp fart, små sprett), **leke-bilen** (tung, raskest, hjul, bare små hopp) og **wind-up-roboten** (går selv, i rykk, står stille et øyeblikk hver tredje sekund). Fysikken (`createSim(def, { load })` i `build_phys.js`) bruker massen, radius, fart, akselerasjon, hoppfart og friksjon fra tabellen; alt er deterministisk (bare tid, ingen tilfeldighet). Samme bygg gir ulikt utfall: bilen belaster planken mest og krever en sterkere (festet, kortere spenn) bro enn ballen; en lang planke over et smalt gap holder ball, figur og robot, men ikke bilen, mens den samme planken teipet fast i begge ender bærer bilen.
- **Valg:** store knapper over delene (`.loads`), uten tastatur. Flere laster kan prøves etter hverandre på samme bygg (STOPP, velg ny last, PRØV); en hake viser hvilke som har klart bygget. Endres bygget, nullstilles haken.
- **Krav i scenen:** `build.sites[].loads: ['ball', 'car']` (fra `scene2level.mjs` til nivået). Da vises bare de kravte lastene, og stedet regnes som løst (delmål, bygget ut i verdenen) først når alle er bestått. Uten `loads` er valget fritt, og en hvilken som helst last løser stedet. I `leke` kreves ball og bil; referansebygget (lang planke) består begge. Bestått-listen lagres med autolagringen (`build.loads`).
- Tegning: `build_loads_view.js` (canvas 2D, ~10 til 20 tegnekall per last, ingen nye shadere).
