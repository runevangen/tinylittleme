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
Jeg kan ikke høre, så det er målt, ikke vurdert. `tools/audio_check.cjs` rendrer hver lyd offline og sjekker: ingen NaN, ingen klipping, nok styrke, flis lysere enn tre lysere enn tekstil, hard landing tydelig sterkere enn myk, anstrengt pust sterkere enn rolig, fallvind stille ved lav fart og tydelig ved høy, pust etter løping hørbart mer enn i ro. Alt passerer. I det kjørende spillet ble det bekreftet at hendelsene utløser riktige lyder (skritt: «soft» på matta, så «tile» på gulvet).

## Det jeg ikke vet
- **Hvordan det låter.** Syntetiserte skritt og pust kan lyde kunstige. Tallene (styrke, tonehøyde, takt) er første gjetning. Justér etter ørene.
- Mobil: Safari starter lyd først etter første trykk. Ikke testet på telefon.

## Neste steg
- Ekte lyder: ta opp skritt, pust og ting med mobilen (foley) og bytte ut den syntetiske lyden der den låter dårligst. Flere varianter per underlag så det ikke repeterer.
- Romlyd: dryppende kran, fjern vifte, klokke, vindu. Romtone per rom.
- Ting i rommet gir lyd (dytting av ulike materialer, glass som ringer).
- Lyd med posisjon (3D) og visuell støtte for hørselshemmede.
- Musikk, og tydeligere mikser (egne volum for skritt, pust, miljø).
