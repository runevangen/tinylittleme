// R147: brett-tekster på begge språk. Hver hint-lapp, hvert byggested og hvert løsningsnavn har `en`; brettnavn og LEVELS har engelsk;
// setLevelLang bytter tekst på stedet og tilbake uten tap; engelsk tekst har samme knapper som norsk (BUILD, TAKE ... ikke norske knappenavn).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { applyLevelEn } from './tools/add_levels_en.mjs';
import { LEVEL_NAMES_EN, localizeLevels, setLevelLang, levelNameL } from './levels_lang.js';

const dir = new URL('./levels/', import.meta.url);
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.level.json'));
assert.ok(files.length >= 20);
const NB_BTN = /\b(TA|HOPP|GREP|SLIPP|SMØR|BYGG|PRØV|KNYT|TRÆ|SUG|STÅL|TREKANT|RULL UT|HENG TAU|FEST OPPE|FEST NEDE)\b/;
let hints = 0, sites = 0, sols = 0;
for (const f of files) {
  const L = JSON.parse(fs.readFileSync(new URL(f, dir), 'utf8')), id = f.replace('.level.json', '');
  assert.deepEqual(applyLevelEn(JSON.parse(JSON.stringify(L))), [], `${id}: tekst uten engelsk`);   // tabellen dekker alt
  assert.ok(L.nameEn, id + ': nameEn');
  const walk = (o, key) => {
    if (Array.isArray(o)) return o.forEach((v) => walk(v, key));
    if (!o || typeof o !== 'object') return;
    for (const [k, f2] of [['hints', 'text'], ['del', 'text'], ['add', 'text'], ['sites', 'label'], ['solutions', 'name']]) if (key === k && typeof o[f2] === 'string') {
      assert.ok(o.en && o.en !== o[f2], `${id}: ${k} mangler en: ${o[f2].slice(0, 40)}`); assert.ok(!NB_BTN.test(o.en), `${id}: norsk knapp i engelsk tekst: ${o.en.slice(0, 60)}`);
      if (k === 'hints' || k === 'del' || k === 'add') { hints++; assert.equal(o.en.split('\n').length, o.text.split('\n').length, `${id}: samme antall linjer`); } else if (k === 'sites') sites++; else sols++;
    }
    for (const [k, v] of Object.entries(o)) if (v && typeof v === 'object') walk(v, k);
  };
  walk(L, '');
}
assert.ok(hints > 100 && sites > 20 && sols > 20, `${hints}/${sites}/${sols}`);

// bytte på stedet og tilbake
const L = JSON.parse(fs.readFileSync(new URL('barnerom.level.json', dir), 'utf8')), nb0 = JSON.stringify(L);
assert.ok(setLevelLang(L, 'en') > 3);
assert.ok(L.hints.every((h) => h.text === h.en)); assert.ok(L.build.sites.every((s) => s.label === s.en));
setLevelLang(L, 'nb'); assert.equal(JSON.stringify(L), nb0, 'tilbake til norsk gir samme brett');
setLevelLang(L, 'en'); setLevelLang(L, 'en'); setLevelLang(L, 'nb'); assert.equal(JSON.stringify(L), nb0);
assert.equal(levelNameL(L, 'en'), 'Level 2: The nursery'); assert.equal(levelNameL(L, 'nb'), 'Nivå 2: Barnerommet');

// LEVELS: label/short følger språket, norsk original i nb
const main = fs.readFileSync('main.js', 'utf8');
const ids = [...main.matchAll(/^  \{ id: '(\w+)'(?:, [^}]*?)?, label: '([^']*)', short: '([^']*)'/gm)];
assert.ok(ids.length >= 24, 'fant LEVELS i main.js: ' + ids.length);
let lang = 'nb';
const lv = localizeLevels(ids.map((m) => ({ id: m[1], label: m[2], short: m[3] })), () => lang);
for (const l of lv) {
  assert.ok(LEVEL_NAMES_EN[l.id], `engelsk navn mangler: ${l.id}`);
  lang = 'nb'; const nb = l.short; lang = 'en'; assert.notEqual(l.short, nb, l.id); assert.equal(l.nb.short, nb); assert.ok(l.label && l.label !== l.nb.label, l.id);
}
for (const id of Object.keys(LEVEL_NAMES_EN)) assert.ok(ids.some((m) => m[1] === id), `ukjent brett i engelsk tabell: ${id}`);
console.log('levels_en ok', { hints, sites, sols });
