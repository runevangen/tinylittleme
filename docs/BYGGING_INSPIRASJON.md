# Byggedelen: inspirasjon fra brobyggerspill og hva som kan gjøre tinylittleme unikt

Notat laget etter ønske fra Rune: *«Tror dette kan bli en unik nøkkel ved å blande plattform og byggespill med god fysikkmotor.»*
Kilder merket **(søk)** er fra nettsøk (tynt grunnlag, se nederst). Resten er fra generell kjennskap til sjangeren og bør sjekkes mot spill man har spilt selv.

## Hva vi har i dag (v1.48)
Egen byggeskjerm (sideriss, snapping, zoom), 2D-fysikk med planker som bøyer seg og brekker, klosser, vekter, tau, tape, ledd, vippe, testfigur som går over, byggesteder i nivå (bro, trapp, kjøkkenbro), bygget flyttes ut som solid i verdenen, delene må **letes opp** i nivået, og det finnes alltid en vanskelig vei uten bygging. Kode: `build.js`, `build_logic.js`, `build_phys.js`, `build_world.js`, `build_zoom.js`.

## Hva brobyggerspillene gjør bra
| Mønster | Eksempel | Hva det gir |
|---|---|---|
| **Lesbar svikt** | Poly Bridge: man ser hvor det ryker, fikser og prøver igjen. Svikten er halve moroa **(søk)**. Spenning vises ofte som farge (blå → rød) på hver del. | Spilleren lærer fysikken uten tekst. |
| **Budsjett og materialvalg** | Tre er billig og svakt, stål sterkt og dyrt, kabel bare i strekk **(søk)**. | Rom for flere gode løsninger i stedet for én fasit. |
| **Flere løsninger, sammenligning** | Det finnes aldri bare én måte **(søk)**. Man sammenligner seg med andre. | Gjenspillbarhet. |
| **Replay og deling** | Utvikleren sier at å se andres broer, både flotte og sprø, var halve gleden, så deling ble et kjernemål **(søk)**. | Fellesskap og viral spredning. |
| **Verksted/sandkasse** | Ubegrenset byggemodus og spillerlagde brett **(søk)**. | Lang levetid. |
| **Dynamiske deler** | Fjærer, tau/kabler, vindebroer **(søk)**; hydraulikk og stempler i serien (fra hukommelse). | Mer variert enn «bare en bro». |
| **Ulike «laster»** | Kjøretøy, ulike vekter, flere kjøretøy samtidig (fra hukommelse). | Samme bro, nye krav. |
| **Tydelig forklaring** | Kritikk mot Bridge Constructor: mangler forklaring på hvorfor det feilet **(søk)**. | En mulighet for oss å gjøre det bedre. |
| **Gripende lite sett med deler** | World of Goo: begrenset antall noder, og hver del teller (fra hukommelse). | Tett, lesbar puslespillfølelse. |

## Hva som er unikt hos oss (kombinasjonen)
Ingen av de rene brobyggerne har en **figur som lever i verdenen** og samler delene selv. Vi har allerede deler som må letes opp, en vanskelig vei uten bygging og en leketøy-verden i barneskala. Det åpner for ting de andre ikke kan:

1. **Husholdningsting som byggemateriale.** Blyant (stiv og lett), linjal (lang planke), legoklosser (knotter = snapping), bøker (tunge blokker), gummistrikk (elastisk tau), binders (ledd), svamp (demper). Det passer rett inn i «liten i et stort hus».
2. **Smulene som budsjett.** Smulene du allerede samler (belønning for å utforske) kan kjøpe bedre materiale. Plattform og bygging henger sammen: å utforske gir bedre bygg.
3. **Den ekte figuren er lasten.** Dagens testfigur er en kule. Neste steg er at *du* går over broen og den gir etter live, og at maur og fiender går over den og belaster den.
4. **Leker som testlast.** «Send leke-bilen / wind-up-roboten over broen» i stedet for en anonym kule.
5. **Bygg under press.** Bygg mens en maur jakter, eller før vannet stiger (vann-varianten fra R42).
6. **Bygget lever videre.** Det du bygde i ett rom, kan gjenbrukes eller brukes av maurene senere (kan også bli rotete, så det må velges forsiktig).
7. **Fellesskap via tilbakemeldingsløypa.** Vi har allerede Supabase og tester-koder. Beste bygg per tester («færrest deler») kan deles og sammenlignes.

## Forslag til veikartpunkter (ikke lagt i `ROADMAP.md` ennå)
Rangert etter verdi mot innsats. Alle følger reglene våre: mobil først, `walk_route` uendret, alltid en vanskelig vei uten bygging.

| # | Punkt | Innhold | Størrelse |
|---|---|---|---|
| R45 | **Lesbar svikt** | Spenningsfarge (blå → rød) på hver del under prøven, tydelig brudd-markering og en kort «hvorfor brakk det»-setning med forslag (f.eks. «Planken bar for mye her. Prøv en støtte under.»). | Liten–middels |
| R46 | **Leker som materialer** | Blyant, linjal, legoklosse, bok, gummistrikk, binders, svamp som delvarianter med egen vekt, stivhet og lyd. Legoknotter gir snapping. | Middels |
| R47 | **Stjerner og smulebudsjett** | 1–3 stjerner per bygg etter antall deler/materialkostnad. Smuler kan «kjøpe» bedre materiale. Lagres i belønningene. | Middels |
| R48 | **Leker som testlast** | Prøven kan bruke leke-bilen, ballen eller wind-up-roboten i stedet for kulen. Ulike vekter og hjul. | Middels |
| R49 | **Live-vekt i verdenen** | Når du går på et bygg i verdenen, gir det etter og kan briste (først enkelt: nedbøyning + grense), og maur belaster det. | Stor |
| R50 | **Replay, deling og beste bygg** | Spill av siste prøve som spøkelse, eksporter bygget som kort kode, og vis beste bygg per tester (Supabase). | Middels |
| R51 | **Dynamiske deler** | Fjær, trinse og stempel/vindebro (hydraulikk-lignende) i `build_phys.js`, hver for seg testet. | Stor |
| R52 | **Verksted** | Fri byggemodus fra startskjermen med ubegrensede deler, lagring og lasting, og egne utfordringer. | Middels |

**Anbefalt rekkefølge:** R45 → R46 → R47 → R48, så R50. Ta R49 og R51 når det føles bra i hendene. R52 sist.

## Risiko og forbehold
- **Verdien er ikke bevist.** Byggeskjermen er bygd uten GPU og uten at noen har spilt den lenge på telefon. Det største spørsmålet er om det føles godt med tommel. Rapporter fra R27 bør styre hvor mye vi bygger videre.
- **Fysikken må forbli deterministisk** (samme bygg gir samme resultat), ellers mister `walk_route` og botten beviset sitt.
- **Live-vekt (R49) er den store risikoen:** den kan gjøre verdenen ustabil og ruter uforutsigbare. Må bygges forsiktig, med av/på i ⚙.
- **Omfang:** mange av punktene krever nye deler og nye brett, som hver må gås med `walk_route`.

## Om kildene
Nettsøket ga bare delvis og tynt materiale, og ingenting om World of Goo eller Besiege. Det som er merket **(søk)** støttes av:
- [Red Bull: Poly Bridge interview](https://www.redbull.com/ie-en/poly-bridge-interview-constructing-a-viral-hit) (deling og replay)
- [Hardcore Gamer: Review Poly Bridge](https://hardcoregamer.com/reviews/review-poly-bridge/215737/) og [Cubed3](https://www.cubed3.com/games/reviews/pc/poly-bridge) (fiasko og forbedring)
- [Common Sense Education: Bridge Constructor](https://www.commonsense.org/education/reviews/bridge-constructor) (savnet forklaring)
- [Game Geeker: beste fysikk-konstruksjonsspill](https://gamegeeker.com/editors-picks/best-physics-construction-puzzle-games?market=FR)
