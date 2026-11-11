# Innstillinger (⚙)

Alle valg ligger i **én liste, `SETTINGS` i `main.js`**. Den styrer panelet, «endret fra standard», eksport/import, «Alt til standard» og testrapporten. Legg nye valg inn der så lenge det er mulig (`fl` = av/på, `rg` = glidebryter, `sl` = valgliste). Gi hvert valg `group`, standardverdi og `get`/`set`. Rene hjelpefunksjoner (endret-liste, eksport/import, rapport) står i `settings_util.js` og testes i `test_settings.mjs`.

## Grupper
| Gruppe | Innhold |
|---|---|
| **Spill** | **Nivå 4–6: egen stemning** (`varmood`) og **egen vri** (`vartwist`) (R12, `variant.js`), **Føttene tilpasser seg trinn og kanter** (`stepadapt`) og **Figuren jubler/rykker** (`reactanim`) (R10, `polish.js`), Grafikk (Detaljert/Enkel), **Fargegradering** (`tlm.grade`: «Varm film» = Toy Story-lys med varm sol, kjølig fyll og kantlys, eller «Av»; **Fargefilter på skjermen** (`tlm.gradefilter`) slår det milde CSS-filteret av/på uten å miste lysene; laster siden på nytt; Enkel grafikk får aldri ekstra lys, clearcoat eller filter; valget logges som `grade` i rapporten), Lysstråler, mørkere hjørner og småting på gulvet (R4, atmos.js; bare med Detaljert grafikk), Startskjerm (vis ved oppstart), Hovedmeny-knapp, Autolagring, ting kommer tilbake, to trykk på Lagre/Tilbake/Ting, tekniske tall (alltid, eller trykk på teksten øverst), brettvalg, Start på nytt |
| **Styring** | Kamerafølsomhet, stikke-dødsone, knappestørrelse, kast med dra, dobbelttrykk, ◎-knapp, grip kanten, vibrasjon |
| **Kamera** | Følger retning, hjelper, utoning (+ synlighet), kameraavstand |
| **Hjelp og tekst** | Retningshjelp (kompass/gulvpil/begge/av), tips etter 3 fall, fremhev grep, lapper, lydtekst, snakkebobler |
| **Lyd og stemme** | Hovedvolum, lyd på, **musikk** (av/på og volum; tema per rom i `music.js`), stemme, stemmevolum, **pust** (volum og «rolig pust når du står stille»), skritt, hopp/landing/fall, ting og romlyd (volum), og knapper for å høre pust, skritt og hopp. Hele lydmikseren (hver enkelt lyd) ligger bak admin. |
| **Test** | Hoppfølelse (Prince/Klassisk/Spenning), FPS, **Oppløsning** (`resq`, R10: Auto følger FPS ned og opp, eller fast Full/Middels/Lav), **Lav profil** (`lowprofile`, R15: Auto/Av/På; kutter skygge-kart, støv, korn, lysstråler og ekstra lys),  **Marker her**, **Del rapport**, kopier/lim inn innstillinger, Alt til standard |
| **Admin** (skjult) | Alle hoppverdier og mekanikk-verdier (krefter, klatring, kast, hard landing, taubane …), lydmikser og etterklang, Plan/Fly, hjelpeobjekter |

## Admin
Skjult som standard. Slå på ved å trykke 7 ganger raskt på «Innstillinger»-tittelen, eller åpne siden med `?admin=1` (`?admin=0` slår av). Valget huskes. Dette er **skjuling, ikke sikkerhet**: alt ligger i nettleseren. Skal admin låses på ordentlig, må det til en tjener.

## Testing
- **Marker her** (⚑, valgfri tekst) legger en markering i loggen med posisjon og tid.
- **Del rapport** sender (delingsark på mobil, ellers kopi) en tekst med versjon, enhet, skjermstørrelse, FPS (snitt og verste bilde), endrede innstillinger, markeringer og de siste 30 hendelsene (fall, hard landing, verktøy, sjekkpunkt …). Loggen (120 hendelser) overlever at siden lastes på nytt.
- **Kopier / lim inn innstillinger** gjør at en tester og utvikleren kan kjøre med nøyaktig samme oppsett.
- **Alt til standard** nullstiller alle valg (ikke fremgangen i spillet).
- FPS-visning (⚙ → Test) hjelper når noe «skjelver»: lav FPS ga tidligere falske feil.

- **Smuler** (⚙ → Spill, `tlm.crumbs`, standard på): gylne smuler å samle i brettene (R3). Av = ingen smuler vises eller plukkes.
- **Gåter** (⚙ → Spill, `tlm.puzzles`, standard på): nøkkel og lås (R7). Av = ingen veiledning mot nøkkelen, og nøkkelen åpner ikke broen (en åpnet bro står).
- **Gåter: kamerasveip** (⚙ → Hjelp, `tlm.puzcam`, standard på): når broen åpnes svinger kameraet kort mot den; pila peker på broen til du er over.

- **Lav profil** (⚙ → Test, `tlm.lowprofile`, standard Auto, R15): slår av sol-skygge-kart, støv, korn (detalj-shaderen), lysstråler, fyll-/kantlys og målets punktlys. Auto slår den på når FPS er under 22 i tre vinduer på rad og oppløsningen allerede er på bunnen; den blir på til du velger Av eller laster siden på nytt. Logges som `lav profil`.
- **Budsjett** (R15, `perf_budget.js`): ca. 30 bilder etter oppstart (og etter at Lav profil endres) logges `budsjett` med tegnekall, trekanter, lys og meshes (før/etter sammenslåing), og med «OVER BUDSJETT» hvis det går over taket (`BUDGET`: 220 kall, 60 000 trekanter, 6 lys). Linja står også i testrapporten («Scene: …»). Statiske ting (rekvisitter, kontaktskygger, småting) og figuren/maurene slås sammen per materiale og ledd, så de tegnes med få kall.
- **Minikart** (⚙ → Hjelp, `tlm.minimap`, standard på, av på «Enkel» grafikk): R20 (`overview.js`, `overview_logic.js`). Lite rundt kart øverst til venstre (liggende: under kompassbobla) med rommet, mål, lagringsflagg (etter lagring), uoppdagede smuler og figuren; kartet dreier så blikkretningen peker opp. Trykk på minikartet eller på kartknappen (ved siden av ◎) for oversikt: kameraet flyr opp over rommet i 3 sekunder (stikke og knapper skjules da, spillet venter), viser MÅL, FLAGG, DU og smuler som prikker, og flyr tilbake til samme kameravinkel. Trykk i bildet for å gå videre med en gang. Logges som `oversikt` (start, hoppet over, slutt) og `minikart` (av/på).
- **Tydelige markører** (⚙ → Hjelp, `tlm.markers`, standard på): R14 (`readable.js`, `readable_view.js`). Pila mot neste mål holdes unna knapper og HUD (måles fra de ekte knappene; havner den bak en knapp eller utenfor skjermen tegnes en kantstilt pil med mørk kontrastkant), grep har en svevende oransje ▲, hyller på ruta har teal kant, glatte flater (fliser) har kjølige glansstriper, og en rød ✕ vises på flaten når du hopper mot noe som ikke kan gripes. «i»-merkene skjules når de ville havnet bak en knapp. Logges som `markør` (første kantstilte pil, første ugripbare flate, av/på).

- **Tilbehør på figuren** (⚙ → Spill, `tlm.rewards`, standard på, R16): hatter, skjerf og sekk som låses opp ved å ta alle smulene i et nivå (nivå 1 til 6). Valget gjøres i lekerommet på startskjermen og huskes (`tlm.unlocks`, `tlm.equip`; beste smuler og tid i `tlm.best`). Admin: «Alt tilbehør åpent» (`tlm.rewardsall`). Logges som `belønning`.
- **Myke skygger og lysflekk** (⚙ → Spill, tlm.softlight, standard på, R17, softlight.js + softlight_logic.js): bakte mørke blobber under og rundt faste ting og i gulvhjørnene, varm lysflekk fra vinduet og mykere skyggekant (sun.shadow.radius). Bare Detaljert grafikk; Enkel grafikk og Lav profil beholder dagens look (test_softlight.mjs). Logges som «myke skygger».

- **Delmål** (⚙ → Spill, `tlm.goals`, standard på, R23): panel under HUD-linja med ett aktivt delmål; trykk på det for hele lista. Av = ingen panel, ingen telling, ingen lås.
- **Pila peker mot aktivt delmål** (⚙ → Hjelp, `tlm.goalarrow`, standard på): kompass og gulvpil følger delmålet (flate, nærmeste smule, nærmeste maur, sjef). Av = pila følger ruta som før.
- **Delmål som låser målet** (⚙ → Admin, `tlm.goallock`, standard på): delmål merket `gate` (alltid på ruta) må være klare før målet åpner; ellers vises «Målet er låst». Flymodus omgår låsen. Logges som `delmål`-hendelse («lås på/av»).
