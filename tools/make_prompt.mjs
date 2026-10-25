// Lager instruksen til bildetolkningen (docs/VISJON_PROMPT.md) ut fra kinds.js, så den aldri går ut av takt med spillet.
// Bruk: node tools/make_prompt.mjs          (skriver filen)
//       node tools/make_prompt.mjs --check  (feiler hvis filen er utdatert)
import fs from 'node:fs';
import { KINDS, MATERIALS, WEIGHTS, HAZARDS, TOOLS } from '../kinds.js';

export function promptText() {
  const rows = Object.entries(KINDS).map(([k, v]) => `| \`${k}\` | ${v.shaped ? 'ja' : 'boks'} | ${v.desc} |`).join('\n');
  return `# Instruks til bildetolkningen (generert av \`tools/make_prompt.mjs\`: ikke rediger for hånd)

Du får 3–4 vanlige mobilbilder av ett rom. Lag en **scene** (JSON som følger \`docs/scene.schema.json\`) som spillet gjør om til et 3D-brett.
Svar bare med JSON. Kontroller resultatet med \`node tools/validate_scene.mjs\` før det brukes.

## Mål og koordinater
- Alle mål i **cm**. Origo i rommets nordvestre hjørne: x mot øst, z mot sør (mot døra), y opp fra gulvet.
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
- \`color\`: hex \`#rrggbb\`. Bildene er ofte nesten hvite: velg farger som skiller tingene (se \`look\`).
- \`cp: true\` på et par solide flater midtveis (sjekkpunkt). \`soft: true\` på myke flater (matte, håndkle, papirhaug) som demper fall.
- \`movable\`: ${WEIGHTS.join(' | ')} for løse ting (lett = kan bæres, maks 17 cm). \`breakable: true\` for skjøre.
- \`grip: true\` på ting man kan klatre i (håndkle som henger, kabel). \`hold: true\` på mulige tak (knotter, kurver).
- \`tool\`: ${TOOLS.join(' | ')} (krever movable light): hårgelé og dopapirrull. \`pole\`: stavlengde (enheter) for en stav.
- \`decor: true\` for ting uten kollisjon (speil, knotter). \`group: "navn"\` for ting som består av flere bokser (do, badekar).

## Farer og start/mål
- \`hazards\`: type ${HAZARDS.join(' | ')} (pit = kar/grop man ikke kommer ut av; flush = do-skål). \`box\` i cm og en \`message\`.
- \`start\`: {x, z} der spilleren kommer inn (ved døra). \`goal\`: {x, y, z} en ting høyt oppe som er et mål.
- \`windows\`: vegg (N/S/E/W), posisjon langs veggen, y, w, h. \`look\`: lysdempning. \`audio\`: {reverb, ambience: ["drip","fan"]}.

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
