// node test_settings.mjs: endrede innstillinger, eksport/import og testrapport
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { changedSettings, exportSettings, parseSettings, formatReport, GROUPS, LAYOUT, layoutIds, applyLayout } from './settings_util.js';

let a = true, b = 0.5, c = 'both';
const defs = [
  { id: 'a', label: 'Valg A', type: 'bool', def: true, get: () => a },
  { id: 'b', label: 'Valg B', type: 'range', min: 0, max: 1, def: 0.5, get: () => b },
  { id: 'c', label: 'Valg C', type: 'select', options: [['both', 'Begge'], ['off', 'Av']], def: 'both', get: () => c },
];
assert.equal(changedSettings(defs).length, 0, 'alt på standard');
b = 0.9; c = 'off';
assert.deepEqual(changedSettings(defs).map((x) => x.id), ['b', 'c']);

const txt = exportSettings(defs, { v: '1' });
const r = parseSettings(`her er mine:\n${txt}\ntakk`, defs);
assert.equal(r.error, undefined); assert.deepEqual(r.values, { a: true, b: 0.9, c: 'off' });
// ugyldige verdier hoppes over / klemmes
const bad = JSON.stringify({ tag: 'tinylittleme-innstillinger', values: { a: 'ja', b: 7, c: 'xx', z: 1 } });
const r2 = parseSettings(bad, defs);
assert.deepEqual(r2.values, { b: 1 }); assert.deepEqual(r2.skipped.sort(), ['a', 'c', 'z']);
assert.ok(parseSettings('bare tull', defs).error);
assert.ok(parseSettings('{"tag":"annet","values":{}}', defs).error);

const rep = formatReport({
  version: '9.9', level: 'Bad', when: 'i dag', device: 'iPhone', screen: '390×844 @3x', touch: true, preset: 'Prince', clock: 120, points: 950,
  fps: '58 fps snitt, verste bilde 40 ms', pos: [1, 2, 3], state: 'ground', target: 'håndkle', stats: { saves: 1, respawns: 2, broken: 0, resets: 0, hard: 1, flew: false },
  changed: changedSettings(defs), marks: [{ c: 33, pos: [1, 2, 3], detail: 'kom ikke opp', lv: 'Nivå 4 · Bad', v: '9.9' }, { c: 50, pos: [4, 5, 6], detail: 'gammel feil', lv: 'Nivå 2 · Barnerom', v: '9.1' }],
  events: [{ c: 30, type: 'tilbake', detail: 'falt', pos: [0, 0, 0], st: 'air' }],
});
for (const s of ['v9.9', 'Bad', 'Valg B: 0.9 (standard 0.5)', 'kom ikke opp', 'tilbake falt', 'neste: håndkle', '58 fps', '[33 s · Nivå 4 · Bad]', '[50 s · Nivå 2 · Barnerom · fra v9.1, kan være rettet]']) assert.ok(rep.includes(s), `rapporten har «${s}»`);
console.log('innstillings-tester grønne');

// ---- gruppering (applyLayout) ----
{
  const ids = layoutIds(); assert.equal(new Set(ids).size, ids.length, 'ingen innstilling står to ganger i LAYOUT');
  const gids = GROUPS.map((g) => g[0]); assert.equal(new Set(gids).size, gids.length, 'gruppe-id-er er unike');
  for (const g of Object.keys(LAYOUT)) assert.ok(gids.includes(g), `LAYOUT-gruppe «${g}» finnes i GROUPS`);
  const src = fs.readFileSync('main.js', 'utf8');
  for (const id of ids) assert.ok(src.includes(`'${id}'`), `innstilling «${id}» i LAYOUT finnes ikke i main.js`);
  const list = [{ id: 'zzz_ny', group: 'spill' }, { id: 'vol', group: 'lyd' }, { id: 'lang', group: 'lyd' }, { id: 'buildstrength', group: 'admin' }, { id: 'buildsnap', group: 'spill' }];
  applyLayout(list);
  assert.deepEqual(list.map((d) => d.id), ['lang', 'buildsnap', 'vol', 'zzz_ny', 'buildstrength'], 'sortert etter oppsettet, ukjente sist');
  const by = Object.fromEntries(list.map((d) => [d.id, d]));
  assert.equal(by.lang.group, 'spill'); assert.equal(by.vol.group, 'lyd'); assert.equal(by.buildsnap.group, 'innhold'); assert.equal(by.buildsnap.sub, 'Byggeskjerm');
  assert.equal(by.zzz_ny.group, 'spill', 'ukjent innstilling beholder sin gruppe'); assert.equal(by.buildstrength.group, 'admin', 'admin røres ikke');
  console.log('gruppering: ok');
}
