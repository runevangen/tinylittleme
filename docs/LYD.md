# Lyd

Status: første versjon, helt syntetisert (Web Audio, ingen lydfiler). Skru av/på med `M` eller «Lyd»-knappen; volum under ⚙.
Lyd starter etter første tastetrykk eller trykk (nettleserregel). Motoren ligger i `audio.js` og er uavhengig av spillogikken.

## Hva som låter
| Hendelse | Lyd | Styres av |
|---|---|---|
| **Skritt** | Per underlag, alternerende venstre/høyre (lett panorering). Lyden kommer når foten treffer gulvet, i samme bilde som animasjonen. | Underlaget under foten, farten (sakte = svakere) |
| **Tar sats** | Kort innpust + tøyrasling | Hurk før avspark (Prince) |
| **Avspark** | Utpust («hup») + lite skrap fra skoen | Hoppet tar av |
| **Falle** | Vind som vokser med fallfarten (stille under ca. 5 enheter/s) | Fallfart |
| **Landing** | Underlagets lyd + dump. Hard landing: kraftig dump og tung utpust. | Fallfart |
| **Pust** | Rolig og nesten hørbar i ro (ca. 14/min). Kortere og kraftigere jo mer anstrengt (opptil ca. 85/min). Mer «munn» ved anstrengelse. | Anstrengelse: løping, hopp, hard landing, klatring |
| **Gripe kant/tau** | Kort innpust + håndklaps | Kantgrep |
| **Hive seg opp** | Lang utpust + tøy + dunk på toppen | Oppstigning |
| **Rekke ut** | Svisj | REKK UT |
| **Skrens** | Hvin | Snu i fart |
| **Dytte** | Skrapelyd som vokser med fart | Flytter en ting |
| **Ta / slippe ting** | Rasling / dunk | `F` |
| **Knuses / klemt / skylles ned** | Skår, tung dunk med utpust, vann | Fare og ting som faller |
| **Sjekkpunkt / mål** | Myk klokke / liten melodi | |

## Lydmikser (innstillinger for alle lyder)
⚙ → **Lyd**: hovedvolum, etterklang for rommet, og **volum for hver enkelt lyd** fra 0 (av) til 200 %. ▶ ved siden av hver lyd spiller den av, så du kan justere uten å spille. Det er 26 kontroller i seks grupper: bevegelse (skritt, landing, tar sats, avspark, fallvind, skrens), pust, klatring (gripe, hive seg opp, rekke ut), ting (ta opp, slippe, dytte, knuses), hendelser (klemt, kar/do, sjekkpunkt, mål) og skritt per underlag (tre, flis, matte, papir, plast, metall, glass, kurv). «Alle 100 %», «Alle av» og «Nullstill lyd» finnes også. Alt huskes i nettleseren. `M` skrur all lyd av og på.

## Underlag
Lydunderlag velges fra brettobjektets materiale: tre, flis og porselen, tekstil og matter (myk), papir og bøker, plast, metall, glass, kurv. Standard er tre.
| Underlag | Karakter | Målt tyngdepunkt |
|---|---|---|
| tekstil/matte | dempet | 0,75 kHz |
| plast | tørt tap | 1,5 kHz |
| kurv | tørr knirk | 3,0 kHz |
| tre | dump + bank | 3,2 kHz |
| papir/bok | «shff» | 5,2 kHz |
| metall | ping | 6,6 kHz |
| glass | tynn ring | 6,6 kHz |
| flis/porselen | skarpt klikk | 9,3 kHz |

Rommet har etterklang (`audio.reverb` i brettdata): bad 0,38 (flis), soverom 0,12.

## Slik er det kontrollert
Jeg kan ikke høre, så det er målt, ikke vurdert. `tools/audio_check.cjs` rendrer hver lyd offline og sjekker: ingen NaN, ingen klipping, nok styrke, flis lysere enn tre lysere enn tekstil, hard landing tydelig sterkere enn myk, anstrengt pust sterkere enn rolig, fallvind stille ved lav fart og tydelig ved høy, pust etter løping hørbart mer enn i ro. Alt passerer. Mikseren er også kontrollert: alle 26 lydene kan forhåndsspilles, blir stille ved 0 og tydelig sterkere ved 200 %. I det kjørende spillet ble det bekreftet at hendelsene utløser riktige lyder (skritt: «soft» på matta, så «tile» på gulvet).

## Det jeg ikke vet
- **Hvordan det låter.** Syntetiserte skritt og pust kan lyde kunstige. Tallene (styrke, tonehøyde, takt) er første gjetning. Justér etter ørene.
- Mobil: Safari starter lyd først etter første trykk. Ikke testet på telefon.

## Neste steg
- Ekte lyder: ta opp skritt, pust og ting med mobilen (foley) og bytte ut den syntetiske lyden der den låter dårligst. Flere varianter per underlag så det ikke repeterer.
- Romlyd: dryppende kran, fjern vifte, klokke, vindu. Romtone per rom.
- Ting i rommet gir lyd (dytting av ulike materialer, glass som ringer).
- Lyd med posisjon (3D) og visuell støtte for hørselshemmede.
- Rikere musikk (flere stemmer, ekte melodier), og tydeligere mikser (egne volum for skritt, pust, miljø).

## Romlyd og lydtekst (v0.23)
- **Romlyd:** brettets `audio.ambience` (liste) styrer: `drip` = dryppende kran (en dråpe hvert 2,4–6 s, plassert ved første boks med `kind: faucet`, panorert etter kameraet) og `fan` = vifte/lav romtone. Begge har egne kanaler i mikseren (gruppe «Rom»).
- **Lydtekst (V eller ⚙):** korte tekster øverst til høyre for viktige lyder, med ◀ ▶ for retning: landing / hard landing, drypp, noe knuses, klemt, plask/skylling, sjekkpunkt, tak i kanten, tok/slapp ting. Skritt og pust er utelatt. Lagres i nettleseren; virker også når lyden er av.

## Musikk (R5, `music.js`)
Prosedyrebasert musikk, helt syntetisert, uten filer. Den starter etter første trykk sammen med lydmotoren og ligger på samme bus som effektene (`audio.out`).
- **Tema per rom** (`THEMES`): bad (klokkeaktig, 84 slag/min), barnerom (spilledåse, 104), kjøkken (plukkende, mixolydisk, 116). Velges av `audio.theme` i brettet, ellers av navnet (`themeFor`). Hvert tema har grunntone, skala, akkordgang, tempo og sving.
- **Stemning** (`moodFor`, kalles hvert bilde i `musicFrame`): `calm` (rolig), `tense` (en levende maur har sett deg: mørkere skala, raskere tempo, perkusjon og puls) og `win` (mål nådd: lysere, glitrende). Hver endring logges med `logEv('musikk', stemning)`.
- **Mobil:** puls og bass ligger høyt nok (puls på grunntonen, ca 200–300 Hz, bass med overtone) til at iPhone-høyttaleren gjengir dem; ingenting under ca 150 Hz bærer hele lyden.
- **Balanse:** standardvolum 0,2 (var 0,6). Målt offline med `tools/music_balance.cjs` (RMS i dBFS gjennom samme kjede, musikk ved volum 0,35): musikk `calm` -40,8, `tense` -37,8; skritt (matte) -45,5, landing (flis) -36,4, anstrengt pust -31,7 (høyeste 0,25 s). Ved 0,35 lå musikken altså over skrittene, så standarden er senket til 0,2 (ca 5 dB lavere, `calm` omtrent som skrittene og klart under landing og pust). Musikken dukker dessuten (`music.duck`) til 30–45 % i 0,8–1,6 s når mål, maur-støt eller knusing låter. Tallene er første gjetning; hør etter på telefon og justér volumet i ⚙.
- **Avbrudd:** iPhone setter lyden i `suspended`/`interrupted` ved lås eller fanebytte. Pumpen planlegger ingenting mens lyden ikke går, stopper i skjult fane, og lyden tas opp igjen på `visibilitychange`, `pageshow`, `statechange` og neste trykk.
- **Innstillinger** (⚙, gruppe Lyd): «Musikk» (av/på) og «Musikk: volum».
- **Tester:** `test_music.mjs` (logikk, ducking, resume/skjult fane mot falsk AudioContext) og `tools/music_balance.cjs` (balansemåling) og `tools/music_game_check.cjs` (kjører spillet i Playwright og sjekker at stemningen faktisk bytter til tense og win og logges).

## Dekning (R99)
Revisjon av hendelser og rom. «Før» er stillingen før R99, «nå» er etter. Alt er fortsatt syntetisert; ingen lydfiler er lagt inn.

### Hendelser
| Hendelse | Før | Nå (lyd-id i mikseren) |
|---|---|---|
| Skritt, landing, hopp, grep, pust, fall | lyd | uendret, men med variasjon (se under) |
| Ta og slippe ting, dytte, knuse, klemt, kar/do | lyd | uendret (`pickup`, `drop` varierer nå) |
| Mål, sjekkpunkt, smuler, sjef, maur, edderkopp, veps, leker | lyd | uendret |
| **Byggeskjerm: sette ut del** | nesten stille (`bhop`) | `bplace`: tre dump, stål ping, tau mykt dask, kloss klakk (valgt av delen: `buildMaterial`) |
| **Feste (TAPE/LEDD/TAU/GUMMI)** | `bhop` | `battach`: tape kort riv, ledd klikk-knepp, tau knute, gummi tvang |
| **Knute og stav i Rutenett** | `bhop` | `bknot` (dunk) og `brod` (tre dunk, stål ping, tau dask) |
| **Angre, slett, nullstill** | stille | `bpop` (liten pop) |
| **PRØV start** | stille | `bstart` (kort stigende tone) |
| **Brudd** | `bcreak` + `bbreak` | uendret: knirk vokser med belastning (`bcreak(stress)`), så smell (`bbreak`); testfigurens fall: `bsplash` |
| **Lasten kommer over** | bare mål-melodi | `barrive` (dump + lys tone) rett før melodien |
| **Mål og stjerner** | `win` (fast melodi) | `bstars(n)`: 3–5 toner etter antall stjerner, glitter ved tre |
| Menyknapper, toasts | stille | uendret (bevisst: ingen UI-lyder ennå) |

### Rom (romtone, `audio.ambience` i brettet; tabellen `AMB_BY_ID` i `audio_fx.js` brukes hvis brettet mangler listen)
| Rom | Før | Nå |
|---|---|---|
| Bad (1, 4) | drypp + vifte | uendret |
| Barnerom (2, 5) | ingen | svak romtone `room:toy` + spilledåse (`plink`) |
| Kjøkken (3, 6, Bygg 4) | drypp + vifte | kjøleskap-brum (`fridge`) + tikkende klokke (`clock`) + drypp |
| Lekerom (7) | ingen | `room:play` + `plink` |
| Stue (8) | ingen | `room:stue` + klokke + svakt vindpust (`gust`) |
| Verksted (9) | ingen | `room:shop` + fjern bank (`knock`) |
| Soverom | ingen | `room:night` + `gust` |
| Bygglab og prøverom | ingen | `room:lab` (+ `knock` i Bygglab) |

Romtonene er laget slik: jevn bakgrunn er filtrert støy (`hum`/`amb`) med nivå høyst 0,06 (under skritt, målt i `audio_check`); enkelthendelser kommer med minst 1,2 s mellomrom, og i rom med klokke midt mellom to tikk, så to romlyder aldri ligger oppå hverandre (`createAmbience`). De er av i hovedmenyen, under vann (stigende vann), i bygging, i planvisning og når fanen er skjult. Av/på: ⚙ → Lyd → «Romtone». Volum: mikseren, gruppe «Rom» (`fan`, `fridge`, `clock`, `room`, `amb`, `drip`).

## Variasjon (R99)
Alle gjentatte lyder (skritt, landing, slippe/ta ting, grep og alle bygglyder) får per gang en variant fra `makeVariation` (`audio_fx.js`): tonehøyde og styrke varierer ±4,5 % (klemt til 3–6 %), seks varianter, og samme variant velges aldri to ganger på rad. Det gjelder også ved ekte lydfiler (avspillingshastighet og volum). Eksisterende volumstandarder er uendret. `tools/audio_check.cjs` spiller 14 skritt og 10 landinger etter hverandre og sjekker at ingen to naboer er like, at variasjonen er innenfor ±6 %, og at ingen variant klipper eller blir for svak (mot medianen).

## Ekte lyd (valgfritt, ingenting lagt inn ennå)
`audio_samples.js` lar ekte opptak erstatte syntesen lyd for lyd. Mekanismen:
- Legg filen i `sounds/<id>.<ext>` (`ogg`, `mp3` eller `m4a`; kolon i id-en blir understrek: `step:wood` → `sounds/step_wood.m4a`) og føy `'<id>': '<ext>'` til `SAMPLE_IDS` i `audio_samples.js`. Uten oppføring i `SAMPLE_IDS` skjer det ingenting (ingen 404-forespørsler).
- Filen lastes først når lyden skal spilles første gang (lazy), aldri ved oppstart. Den første gangen brukes syntesen; neste gang filen. Mangler eller feiler filen, brukes syntesen for alltid i den økten.
- URL-en får `?v=<versjon>` (cache-bust), som resten av spillet.
- Mikser, variasjon og «Bruk ekte lydfiler» (⚙, admin) gjelder like for ekte lyd. Lyd-id er kanal-id i `SOUND_LIST` (mikseren viser dem).

**Slik tar Rune opp foley på mobilen:** talememo-appen (m4a), rolig rom, telefonen 10–20 cm fra lydkilden, ett opptak per lyd med 3–6 varianter etter hverandre (klipp dem opp i egne filer ved behov). Lengde: skritt og klikk 0,1–0,3 s, dunk og dask 0,2–0,5 s, brudd 0,6–1 s, melodi/mål 1–2 s. Mono, 44,1 kHz, m4a (iPhone) eller ogg; trim stillhet i starten (maks 20 ms før lyden). Normaliser toppen til ca. −3 dBFS; spillet regner med at filen er omtrent like sterk som syntesen på 100 % i mikseren, og resten justeres der. Bruk én fil per id; variasjonen (tonehøyde og styrke) legges på av spillet.

**Best å bytte først** (der syntesen låter mest kunstig, og som høres oftest): 1) `step:wood`, `step:tile`, `step:soft` (skritt), 2) `bplace` og `battach` (bygging), 3) `bbreak`/`bcreak` (brudd), 4) `land`, 5) `pickup`/`drop`, 6) `fridge` (kjøleskapsbrum, kan være en lang løkke senere), `clock`.

## iPhone og bakgrunn (R99)
- Lydmotoren lages først ved første trykk (`unlockAudio` i `main.js`); ingen lyd og ingen romtone starter før det. Når den er låst opp logges `logEv('lyd', 'låst opp …')`, og første bygglyd logges som `logEv('lyd', 'første bygglyd: …')`.
- `lifecycle()` (`audio_fx.js`) avgjør: skjult fane og kjørende lyd gir `suspend` (ingenting spilles eller planlegges i bakgrunnen); synlig fane med stoppet lyd gir `resume`. `audio.resume()` gjør ingenting mens fanen er skjult.
- Ikke testet på telefon: hvordan romtonene og bygglydene låter, og om iPhone-høyttaleren gjengir kjøleskapsbrummet (lavt, 160 Hz). Testes på iPhone.

## Tester (R99)
`test_audiofx.mjs` (variasjon, romtoner per brett og at brettfilene stemmer med tabellen, planlegger uten overlapp, livssyklus, ekte lyd med falsk fetch), og `tools/audio_check.cjs` (offline-rendring: ingen NaN, ingen klipping, rimelig styrke per bygglyd, romtoner og enkelthendelser under skritt, variasjon).
