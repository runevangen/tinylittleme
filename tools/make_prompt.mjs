// Lager instruksen til bildetolkningen (docs/VISJON_PROMPT.md) ut fra kinds.js, så den aldri går ut av takt med spillet.
// Bruk: node tools/make_prompt.mjs          (skriver filen)
//       node tools/make_prompt.mjs --check  (feiler hvis filen er utdatert)
import fs from 'node:fs';
import { KINDS, MATERIALS, WEIGHTS, HAZARDS, TOOLS } from '../kinds.js';

export function promptText() {
  const rows = Object.entries(KINDS).map(([k, v]) => `| \`${k}\` | ${v.shaped ? 'ja' : 'boks'} | ${v.desc} |`).join('\n');
  return `# Instruks til bildetolkningen (generert av \`tools/make_prompt.mjs\`: ikke rediger for hånd)

Du får 2–4 vanlige mobilbilder av ett sted: et rom innendørs, eller et lite avgrenset område utendørs (terrasse, hjørne av hagen, liten lekeplass). Lag en **scene** (JSON som følger \`docs/scene.schema.json\`) som spillet gjør om til et 3D-brett.
Svar bare med JSON. **Personer, ansikter og dyr skal aldri med i scenen** (ikke som ting, navn eller notater); hopp over dem, og beskriv aldri hvem som bor eller er der. Kontroller resultatet med \`node tools/validate_scene.mjs\` før det brukes.

## Gjør rommet gjenkjennelig (viktigst)
Spilleren skal kjenne igjen sitt eget rom. Ta det på alvor: et brett som bare er noen bokser kastet inn, mislykkes.
- **Skallet først.** \`room.floor\`, \`room.walls\` og \`room.ceiling\` får materiale og farge slik de faktisk ser ut (veggfarge, gulvbelegg, tak). Er veggene ulike (en panelvegg, en malt vegg), legg tynne \`decor: true\`-bokser (1–2 cm) langs veggen i riktig farge. Legg inn **hvert vindu** i \`windows\` med riktig vegg, plassering og størrelse, og **hver dør** som en tynn boks (4–8 cm tykk, ca. 200 cm høy, bredde ca. 80–90 cm), aldri med en stor grunnflate.
- **Lister er tynne striper.** Taklist, fotlist og gerikt er 2–10 cm brede striper langs vegg, tak eller dør. De dekker aldri hele gulvflaten.
- **Store møbler, så middels, så småting.** Ta med alle store møbler (sofa, seng, skrivebord, TV-benk, hyller, bord) med riktige mål, deretter middels ting (kofferter, krakker, strykebrett, lamper) og til slutt tydelige småting som står oppå (maks ca. 60 ting totalt). Det er rotet og møblene som gjør rommet gjenkjennelig.
- **Møbler leveres som ÉN boks med hele ytre mål.** Sofa, seng, skrivebord, bord, bokhylle (\`shelf_unit\`), lampe, puff og koffert er egne typer (\`sofa\`, \`bed\`, \`desk\`, \`table\`, \`shelf_unit\`, \`lamp\`, \`pouffe\`, \`suitcase\`): en boks per møbel, ikke sete, rygg og ben som egne bokser. Spillet bygger formen. Sett \`face\` til veggen ryggen, hodegavlen eller baksiden står mot (\`N\`, \`S\`, \`E\` eller \`W\`; \`N\` hvis ukjent).
- **Plassér riktig.** Det som står mot en vegg, har boksen helt inntil veggen (f.eks. \`x0: 0\`). Det som står på gulvet har \`y0: 0\`. Det som står oppå et møbel har \`y0\` lik møbelets topp. Typiske høyder: sofa- og sengesete 40–50 cm, skrivebord 72–76 cm, spisebord 74 cm, sidebord 40–55 cm, TV-benk 50–90 cm, bokhylle 150–200 cm.
- **Fargene er tingenes ekte farger.** Mobilbilder inne er ofte varme og mørke. Velg fargen tingen ville hatt i dagslys, ikke bildets fargestikk.
- **Ikke finn på.** Bare ting som sees på bildene. Er du usikker, sett \`confidence\` under 0,5. Bilder, rammer og plakater er pyntebokser (\`decor: true\`, tynne, 2 cm), og du gjengir aldri hva som er avbildet (ingen personer).
- **Oppgitte mål er fasit.** Oppgir spilleren romets bredde, dybde eller høyde, bruker du dem nøyaktig som \`room.width\`, \`room.depth\` og \`room.height\`, og skalerer alt annet etter dem.
- **Alltid hele scenen på toppnivå.** Verktøyet tar imot scenen direkte: \`name\`, \`units\` (alltid «cm»), \`room\` (med \`width\`, \`depth\`, \`height\`, \`floor\`, \`walls\`, \`ceiling\`), \`start\`, \`goal\` og \`objects\`. Aldri pakket inn i et ytre objekt, og aldri uten \`units\` og \`room\`.
- **Hold svaret kort.** Svaret kuttes hvis det blir for langt. Maks 45 ting (slå sammen like småting til én boks), id-er på maks 14 tegn, ingen \`note\`, ingen \`photos\`, \`confidence\` bare når den er under 0,5, ingen forklaringer. Start med \`units\`, \`name\` og \`room\`.
- **Målet** (\`goal\`) legges på et fast møbel mellom 40 og 160 cm over gulvet, aldri på en dør, en liste eller en løs småting.

## Mål og koordinater
- Alle mål i **cm**. Origo i stedets nordvestre hjørne (utendørs: avgrens stedet med usynlige vegger rundt det du ser; hekker, gjerder og murer er egne ting): x mot øst, z mot sør (mot døra), y opp fra gulvet.
- Finn skala fra kjente gjenstander: toalettrull ≈ 10 × 10 cm, flis ≈ 20 × 20 cm, do-sete ≈ 40 cm over gulvet, dør ≈ 200 cm.
- Hver ting er en aksejustert boks \`box: [x0, x1, y0, y1, z0, z1]\` (min før maks). Bruk flere bokser for ting som ikke er firkantede (se grupper).
- Gi hver ting \`confidence\` (0–1) og hvilke bilder den sees på (\`photos\`). Gjett heller enn å utelate, men sett lav confidence.

## Tinglisten (kind)
Bruk et kind fra tabellen når det passer; ellers et kort engelsk navn (tegnes som vanlig boks). «ja» = tegnes med ekte form, «boks» = vanlig boks.

| kind | form | beskrivelse |
|---|---|---|
${rows}

## Felt per ting
- \`material\`: ${MATERIALS.join(', ')}.
- \`color\`: hex \`#rrggbb\`. Bildene er ofte nesten hvite: velg farger som skiller tingene (ikke demp lyset for å få det til).
- \`cp: true\` på et par solide flater midtveis (sjekkpunkt). \`soft: true\` på myke flater (matte, håndkle, papirhaug) som demper fall.
- \`movable\`: ${WEIGHTS.join(' | ')} for løse ting (lett = kan bæres, maks 17 cm). \`breakable: true\` for skjøre.
- \`grip: true\` på ting man kan klatre i (håndkle som henger, kabel). \`hold: true\` på mulige tak (knotter, kurver).
- \`tool\`: ${TOOLS.join(' | ')} (krever movable light): hårgelé og dopapirrull. \`pole\`: stavlengde (enheter) for en stav.
- \`decor: true\` for ting uten kollisjon (speil, knotter). \`group: "navn"\` for ting som består av flere bokser (do, badekar).

## Farer og start/mål
- \`hazards\`: type ${HAZARDS.join(' | ')} (pit = kar/grop man ikke kommer ut av; flush = do-skål). \`box\` i cm og en \`message\`.
- \`start\`: {x, z} der spilleren kommer inn (ved døra). \`goal\`: {x, y, z} en ting høyt oppe som er et mål.
- \`windows\`: vegg (N/S/E/W), posisjon langs veggen, y, w, h. \`look\`: utelat den, eller bruk exposure 1.2–1.5 og sun 3–3.5 (rommet skal være lyst og lesbart; aldri under 1.1). \`audio\`: {reverb, ambience: ["drip","fan"]}.

## Utendørs og farer
- Utendørs bruker du stein, gress, grus, benk, trapp, hekk, bord, lekeapparat, vann og kantstein fra tabellen. Gulvet er bakken (\`room.floor\`); \`room.height\` er hvor høyt brettet skal gå (f.eks. 250 cm), \`ceiling\` settes til en usynlig, lav lysdempning.
- Farer: **vann** = \`hazards\` med type \`pit\` (man kommer ikke opp igjen); **kantstein** = lav boks, og der den danner en kant ned mot vei eller vann legger du en \`pit\` ved siden av; **glatt underlag** (våt stein, løs grus, is) = \`slick: true\` på tingen.

## Det du ikke ser
Døras plassering og baksider må gjettes. Skriv det i \`source.uncertainty\`. Et menneske skal se over **hjelpeobjekter** (trappetrinn generatoren legger inn) og feilplasserte ting før brettet spilles.
`;
}
if (process.argv[1] && process.argv[1].endsWith('make_prompt.mjs')) {
  const out = new URL('../docs/VISJON_PROMPT.md', import.meta.url), text = promptText();
  if (process.argv.includes('--check')) {
    const cur = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '';
    if (cur !== text) { console.error('docs/VISJON_PROMPT.md er utdatert: kjør node tools/make_prompt.mjs'); process.exit(1); }
    console.log('instruksen er à jour'); 
  } else { fs.writeFileSync(out, text); console.log('skrev docs/VISJON_PROMPT.md'); }
}
