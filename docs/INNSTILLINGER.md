# Innstillinger (⚙)

Alle valg ligger i **én liste, `SETTINGS` i `main.js`**. Den styrer panelet, «endret fra standard», eksport/import, «Alt til standard» og testrapporten. Legg nye valg inn der så lenge det er mulig (`fl` = av/på, `rg` = glidebryter, `sl` = valgliste). Gi hvert valg `group`, standardverdi og `get`/`set`. Rene hjelpefunksjoner (endret-liste, eksport/import, rapport) står i `settings_util.js` og testes i `test_settings.mjs`.

## Grupper
| Gruppe | Innhold |
|---|---|
| **Spill** | Autolagring, ting kommer tilbake, to trykk på Lagre/Tilbake/Ting, tekniske tall, brettvalg, Start på nytt |
| **Styring** | Kamerafølsomhet, stikke-dødsone, knappestørrelse, kast med dra, dobbelttrykk, ◎-knapp, grip kanten, vibrasjon |
| **Kamera** | Følger retning, hjelper, utoning (+ synlighet), kameraavstand |
| **Hjelp og tekst** | Retningshjelp (kompass/gulvpil/begge/av), tips etter 3 fall, fremhev grep, lapper, lydtekst, snakkebobler |
| **Lyd og stemme** | Hovedvolum, lyd på, stemme, stemmevolum |
| **Test** | Hoppfølelse (Prince/Klassisk/Spenning), FPS, **Marker her**, **Del rapport**, kopier/lim inn innstillinger, Alt til standard |
| **Admin** (skjult) | Alle hoppverdier og mekanikk-verdier (krefter, klatring, kast, hard landing, taubane …), lydmikser og etterklang, Plan/Fly, hjelpeobjekter |

## Admin
Skjult som standard. Slå på ved å trykke 7 ganger raskt på «Innstillinger»-tittelen, eller åpne siden med `?admin=1` (`?admin=0` slår av). Valget huskes. Dette er **skjuling, ikke sikkerhet**: alt ligger i nettleseren. Skal admin låses på ordentlig, må det til en tjener.

## Testing
- **Marker her** (⚑, valgfri tekst) legger en markering i loggen med posisjon og tid.
- **Del rapport** sender (delingsark på mobil, ellers kopi) en tekst med versjon, enhet, skjermstørrelse, FPS (snitt og verste bilde), endrede innstillinger, markeringer og de siste 30 hendelsene (fall, hard landing, verktøy, sjekkpunkt …). Loggen (120 hendelser) overlever at siden lastes på nytt.
- **Kopier / lim inn innstillinger** gjør at en tester og utvikleren kan kjøre med nøyaktig samme oppsett.
- **Alt til standard** nullstiller alle valg (ikke fremgangen i spillet).
- FPS-visning (⚙ → Test) hjelper når noe «skjelver»: lav FPS ga tidligere falske feil.
