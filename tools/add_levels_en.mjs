// R147: legger `en`-felt (engelsk tekst) i et brett: hint-lapper (`hints[].en`, tittel + brødtekst som `text`), byggesteder (`build.sites[].en`),
// løsningsnavn i Byggeskolen (`lab.solutions[].en`) og brettnavn (`nameEn`). Også under `required` (de to variantene). Tallene fra tabellen i tools/levels_en_data.mjs.
// Bruk: node tools/add_levels_en.mjs [levels/x.level.json ...]   (uten argumenter: alle brett). scene2level kaller applyLevelEn selv, så et ombygd brett beholder dem.
import fs from 'node:fs';
import { HINT_EN, NAME_EN, SITE_EN, SOL_EN } from './levels_en_data.mjs';

// Går gjennom hele brettet. Returnerer teksten som mangler engelsk (tom liste = alt dekket).
export function applyLevelEn(level) {
  const missing = [];
  const walk = (o, key) => {
    if (Array.isArray(o)) { for (const v of o) walk(v, key); return; }
    if (!o || typeof o !== 'object') return;
    if ((key === 'hints' || key === 'del' || key === 'add') && typeof o.text === 'string') { if (HINT_EN[o.text]) o.en = HINT_EN[o.text]; else missing.push(o.text); }
    else if (key === 'sites' && typeof o.label === 'string') { if (SITE_EN[o.label]) o.en = SITE_EN[o.label]; else missing.push(o.label); }
    else if (key === 'solutions' && typeof o.name === 'string') { if (SOL_EN[o.name]) o.en = SOL_EN[o.name]; else missing.push(o.name); }
    for (const [k, v] of Object.entries(o)) if (v && typeof v === 'object') walk(v, k);
  };
  walk(level, '');
  if (typeof level.name === 'string') { if (NAME_EN[level.name]) level.nameEn = NAME_EN[level.name]; else missing.push(level.name); }
  return missing;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = new URL('../levels/', import.meta.url);
  const files = process.argv.length > 2 ? process.argv.slice(2) : fs.readdirSync(dir).filter((f) => f.endsWith('.level.json')).map((f) => new URL(f, dir).pathname);
  for (const f of files) {
    const level = JSON.parse(fs.readFileSync(f, 'utf8')), miss = applyLevelEn(level);
    fs.writeFileSync(f, JSON.stringify(level, null, 1));
    console.log(`${f}: ${miss.length ? 'MANGLER ' + miss.length : 'ok'}`);
  }
}
