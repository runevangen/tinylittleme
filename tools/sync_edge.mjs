// R151: edge-funksjonen (Deno) kan ikke importere fra repoets rot, så de delte filene kopieres til supabase/functions/_shared/.
// Bruk: node tools/sync_edge.mjs (skriver)  |  node tools/sync_edge.mjs --check (feiler hvis kopiene er utdatert; kjøres i npm test)
import fs from 'node:fs';
import { promptText } from './make_prompt.mjs';

const R = (p) => new URL('../' + p, import.meta.url), W = 'supabase/functions/_shared/';
export function sharedFiles() {
  const validate = fs.readFileSync(R('tools/validate_scene.mjs'), 'utf8')
    .replace("import fs from 'node:fs';\n", '').replace("from '../kinds.js'", "from './kinds.js'")
    .replace(/\nif \(process\.argv\[1\][\s\S]*$/, '\n');
  const schema = JSON.parse(fs.readFileSync(R('docs/scene.schema.json'), 'utf8'));
  return {
    'kinds.js': fs.readFileSync(R('kinds.js'), 'utf8'),
    'leveleditor_logic.js': fs.readFileSync(R('leveleditor_logic.js'), 'utf8'),
    'validate_scene.js': validate,
    'generated.js': `// GENERERT av tools/sync_edge.mjs: ikke rediger. Instruksen (docs/VISJON_PROMPT.md) og scene-skjemaet.\nexport const PROMPT = ${JSON.stringify(promptText())};\nexport const SCHEMA = ${JSON.stringify(schema)};\n`,
  };
}
if (process.argv[1] && process.argv[1].endsWith('sync_edge.mjs')) {
  const files = sharedFiles(), check = process.argv.includes('--check');
  let bad = 0;
  for (const [n, text] of Object.entries(files)) {
    const f = R(W + n), cur = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
    if (check) { if (cur !== text) { console.error(`${W}${n} er utdatert: kjør node tools/sync_edge.mjs`); bad = 1; } }
    else { fs.mkdirSync(R(W), { recursive: true }); fs.writeFileSync(f, text); }
  }
  if (check) { if (bad) process.exit(1); console.log('edge-kopiene er à jour'); } else console.log('skrev ' + W);
}
