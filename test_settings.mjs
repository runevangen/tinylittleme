// node test_settings.mjs: endrede innstillinger, eksport/import og testrapport
import assert from 'node:assert/strict';
import { changedSettings, exportSettings, parseSettings, formatReport } from './settings_util.js';

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
  changed: changedSettings(defs), marks: [{ c: 33, pos: [1, 2, 3], detail: 'kom ikke opp' }],
  events: [{ c: 30, type: 'tilbake', detail: 'falt', pos: [0, 0, 0], st: 'air' }],
});
for (const s of ['v9.9', 'Bad', 'Valg B: 0.9 (standard 0.5)', 'kom ikke opp', 'tilbake falt', 'neste: håndkle', '58 fps']) assert.ok(rep.includes(s), `rapporten har «${s}»`);
console.log('innstillings-tester grønne');
