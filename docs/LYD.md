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
