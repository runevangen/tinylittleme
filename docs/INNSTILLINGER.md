# Innstillinger (⚙)

Alle valg ligger i **én liste, `SETTINGS` i `main.js`**. Den styrer panelet, «endret fra standard», eksport/import, «Alt til standard» og testrapporten. Legg nye valg inn der så lenge det er mulig (`fl` = av/på, `rg` = glidebryter, `sl` = valgliste). Gi hvert valg `group`, standardverdi og `get`/`set`. Rene hjelpefunksjoner (endret-liste, eksport/import, rapport) står i `settings_util.js` og testes i `test_settings.mjs`.

## Grupper og rekkefølge (v1.18)
Rekkefølgen og grupperingen i panelet styres av `GROUPS` og `LAYOUT` i `settings_util.js` (ikke av hvor innstillingen står i `SETTINGS`). `applyLayout(SETTINGS)` setter `group`/`sub` og sorterer. **Ny innstilling:** legg den i `SETTINGS` som før (med en `group`), og legg id-en til i riktig gruppe i `LAYOUT` (gjerne i en `{ sub, ids }`-undermeny hvis den sjelden brukes). Glemmer du `LAYOUT`, havner den sist i sin egen `group`, så ingenting forsvinner. En test (`test_settings.mjs`) passer på at id-ene i `LAYOUT` finnes og ikke står to ganger.

Panelet har et **søkefelt** øverst (skjuler rader som ikke treffer og åpner gruppene med treff), og undermenyer (sammenfoldet, husker åpen/lukket i `tlm.subopen`).

| Gruppe | Innhold |
|---|---|
| **Spill** | Språk, autolagring, startskjerm, trykk to ganger, ting kommer tilbake; Brett-velger, Start på nytt, Hovedmeny |
| **Innhold og utfordring** | Gåter, delmål, smuler, tilbehør, fortelling, maur, sjef, skapninger, levende leker, nivå 4–6 stemning og vri; undermeny **Byggeskjerm** (snapping, sakte film) |
| **Styring** | Styringsstil, hjelp-nivå, stikke (flytende/kurve/dødsone), knappestørrelse, gangfart, treghet, grip kanten, sikte-hjelp, kast, dobbelttrykk, vibrasjon; undermeny **Mus og tastatur (PC)** |
| **Figuren** | Føttene tilpasser seg trinn, jubel/rykk, blunking |
| **Kamera** | Følging, avstand, synsfelt, vinkel, ser foran, hjelper, utoning, følsomhet, ◎-knapp, skygge under figuren, kamerasyn; undermeny **Skulderkamera** |
| **Grafikk og ytelse** | Grafikknivå, fargegradering og -filter, myke skygger, mørke hjørner, lysstråler, støv, gulvdetaljer, småting, oppløsning, små teksturer, lav profil, FPS |
| **Hjelp og veiledning** | Pil/kompass mot delmål, retningshjelp, lyssøyle, minikart, markører, grep, tips etter fall, snakkebobler, tekniske tall, gåte-kamerasveip; undermeny **Nivåstart** |
| **Lyd og stemme** | Hovedvolum, lyd, musikk (+ volum), stemme (+ volum); undermeny **Pust og lydnivåer** (pust, skritt, hopp, ting, leker, romlyd) |
| **Test og tilbakemelding** | Vurderingsknappen ⚑, marker her, del/kopier rapport og innstillinger, alt til standard |
| **Admin** (skjult) | Alle hoppverdier og mekanikk-verdier, lydmikser og etterklang, Plan/Fly, hjelpeobjekter, byggestyrke m.m. |

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
- **Små teksturer** (⚙ → Test, `tlm.texsmall`, standard av, R21): prosedyreteksturene (`look.js`, `props.js`) lages i halv størrelse (sider fra 256 og opp, minst 128; normalkart er allerede av i lav kvalitet). Alltid på med Enkel grafikk og Lav profil «På». Målt: bad 41 til 7 MB, kjøkken 66 til 10 MB teksturminne. Siden lastes på nytt ved endring (teksturer kan ikke byttes midt i spillet). Logges som `teksturer`. Minnebudsjett (`MEM_BUDGET` i `perf_budget.js`) og teksturminne/geometrier står i `budsjett`-linja. Nivåbytte laster siden på nytt, så alt frigjøres; `disposeTree` finnes for bytte uten omlasting.
- **Budsjett** (R15, `perf_budget.js`): ca. 30 bilder etter oppstart (og etter at Lav profil endres) logges `budsjett` med tegnekall, trekanter, lys og meshes (før/etter sammenslåing), og med «OVER BUDSJETT» hvis det går over taket (`BUDGET`: 220 kall, 60 000 trekanter, 6 lys). Linja står også i testrapporten («Scene: …»). Statiske ting (rekvisitter, kontaktskygger, småting) og figuren/maurene slås sammen per materiale og ledd, så de tegnes med få kall.
- **Minikart** (⚙ → Hjelp, `tlm.minimap`, standard på, av på «Enkel» grafikk): R20 (`overview.js`, `overview_logic.js`). Lite rundt kart øverst til venstre (liggende: under kompassbobla) med rommet, mål, lagringsflagg (etter lagring), uoppdagede smuler og figuren; kartet dreier så blikkretningen peker opp. Trykk på minikartet eller på kartknappen (ved siden av ◎) for oversikt: kameraet flyr opp over rommet i 3 sekunder (stikke og knapper skjules da, spillet venter), viser MÅL, FLAGG, DU og smuler som prikker, og flyr tilbake til samme kameravinkel. Trykk i bildet for å gå videre med en gang. Logges som `oversikt` (start, hoppet over, slutt) og `minikart` (av/på).
- **Tydelige markører** (⚙ → Hjelp, `tlm.markers`, standard på): R14 (`readable.js`, `readable_view.js`). Pila mot neste mål holdes unna knapper og HUD (måles fra de ekte knappene; havner den bak en knapp eller utenfor skjermen tegnes en kantstilt pil med mørk kontrastkant), grep har en svevende oransje ▲, hyller på ruta har teal kant, glatte flater (fliser) har kjølige glansstriper, og en rød ✕ vises på flaten når du hopper mot noe som ikke kan gripes. «i»-merkene skjules når de ville havnet bak en knapp. Logges som `markør` (første kantstilte pil, første ugripbare flate, av/på).

- **Tilbehør på figuren** (⚙ → Spill, `tlm.rewards`, standard på, R16): hatter, skjerf og sekk som låses opp ved å ta alle smulene i et nivå (nivå 1 til 6). Valget gjøres i lekerommet på startskjermen og huskes (`tlm.unlocks`, `tlm.equip`; beste smuler og tid i `tlm.best`). Admin: «Alt tilbehør åpent» (`tlm.rewardsall`). Logges som `belønning`.
- **Myke skygger og lysflekk** (⚙ → Spill, tlm.softlight, standard på, R17, softlight.js + softlight_logic.js): bakte mørke blobber under og rundt faste ting og i gulvhjørnene, varm lysflekk fra vinduet og mykere skyggekant (sun.shadow.radius). Bare Detaljert grafikk; Enkel grafikk og Lav profil beholder dagens look (test_softlight.mjs). Logges som «myke skygger».

- **Delmål** (⚙ → Spill, `tlm.goals`, standard på, R23): panel under HUD-linja med ett aktivt delmål; trykk på det for hele lista. Av = ingen panel, ingen telling, ingen lås.
- **Pila peker mot aktivt delmål** (⚙ → Hjelp, `tlm.goalarrow`, standard på): kompass og gulvpil følger delmålet (flate, nærmeste smule, nærmeste maur, sjef). Av = pila følger ruta som før.
- **Delmål som låser målet** (⚙ → Admin, `tlm.goallock`, standard på): delmål merket `gate` (alltid på ruta) må være klare før målet åpner; ellers vises «Målet er låst». Flymodus omgår låsen. Logges som `delmål`-hendelse («lås på/av»).
- **Byggeskjerm: snapping** (⚙ → Spill, `tlm.buildsnap`, standard på, R24): delene snapper til rutenett og festepunkter i byggeskjermen (`build.js`, `build_logic.js`). Admin: `tlm.buildall` gir alle deler (test). Hendelser logges som `bygg`.
- **Byggeskjerm: PRØV i sakte film** (⚙ → Spill, `tlm.buildslow`, standard av, R25): fysikken i `build_phys.js` går i 35 % fart så man ser hvor det bøyer og brekker. Admin: `tlm.buildstrength` (0,5–2, standard 1) skalerer brekkgrensene. Verktøy: TAPE (stiv), LEDD (svinger), TAU (bare i strekk); testfiguren går til flagget. Hendelser: `bygg` (`prøv`, `brakk`, `tape/ledd/tau røk`, `prøve klarte det/feilet`).
- **Byggeskjerm: vippe-hint** (⚙ → Hjelp, `tlm.buildsee`, standard på, R30): første gang vippa legges ut i en økt, vises en kort hint-tekst om dreiepunktet og at den må roteres skrått (↺ ↻). Hendelsen logges som `bygg` (`plasser v1 (seesaw) …`).
- **Byggeskjerm: bygget står i verden** (⚙ → Admin, `tlm.buildworld`, standard på, R26): et bygg som har klart PRØV flyttes ut i verden som solide flater (`build_world.js`), så den ekte figuren kan gå og klatre på det. Et endret bygg må prøves på nytt. Hendelser: `bygg` (`bygget står i verdenen`, `bygget fjernet fra verden`), `delmål` (`bygget … klart`).
- **Levende leker** (⚙ → Spill, `tlm.toys`, standard på, R18, `toys_live.js` + `toys_view.js`): tennisball (piper og ruller videre når den dyttes eller spretter), leketøysbil (tuter når den dyttes, tas eller du lander på den), vippehest (gynger og knirker når du lander på den med HOPP), wind-up-robot (TA den og slipp: den går noen skritt i blikkretningen, tikker og stopper) og sprettboks (lokket slår opp og klovnen spretter ut ved landing eller TA). Alle er vanlige flyttbare ting (`movable` i scenen, id `leke_…`), ingen ny kollisjonsmodell. Lyder i ⚙ → Lyd («Leker: volum»), lydtekst når den er på. Admin: «hvor lenge wind-up-roboten går» (`tlm.toywind`). Logges som `leke` (`<id> pop/rock/honk/squeak/wind/go/stop`, «levende leker på/av»).

- **Gulvdetaljer** (⚙ → Spill, `tlm.floordetail`, standard på, R13, `floordetail.js` + `floordetail_logic.js`): blyantstumper, viskelær, perler, smulehauger, flekker og skitt i fugene for målestokk. Tettheten settes etter romstørrelse og kvalitet (full på Detaljert grafikk, halvert med Lav profil «På», ingen med Enkel grafikk) og typene etter gulvet (flis: fugeskitt og flekker; tre: blyanter, viskelær, perler). Minst fem ting ligger alltid rundt start, i det området av bildet som knappene ikke dekker. `tlm.fdens` (Admin, Få/Vanlig/Mange, laster siden på nytt) justerer tettheten. Logges som `gulvdetaljer`.
- **Matter uten flimmer** (R13): mattene (`mat` i `props.js`) har et grovere, mykere flettemønster og ingen relieffkart (relieffkart bruker skjermderivater og flimrer i bevegelse); mipmap og anisotropi står på som før.
