// node test_flag.mjs: R71, ⚑ på alle skjermer (flag_logic.js): skjermvalg, når den flytende knappen vises, og at hektene finnes i index.html og main.js.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { screenOf, floatOn, FLAG_SCREENS } from './flag_logic.js';
import { formatReport } from './settings_util.js';

const cases = [
  [{}, 'spill'], [{ more: true }, 'meny'], [{ start: true }, 'start'], [{ start: true, pick: true }, 'brettvalg'], [{ building: true }, 'bygg'],
  [{ ov: true }, 'oversikt'], [{ win: true }, 'mal'], [{ intro: true }, 'intro'], [{ story: true, win: true }, 'historie'],
  [{ panel: true, building: true, start: true }, 'innstillinger'], [{ building: true, ov: true }, 'bygg'], [{ start: true, win: true }, 'start'],
];
for (const [s, id] of cases) assert.equal(screenOf(s).id, id, JSON.stringify(s));
assert.equal(screenOf({ building: true, buildSite: 'bro1' }).label, 'byggeskjerm (bro1)', 'byggested i etiketten');
assert.equal(screenOf({}).label, 'spill');
for (const id of FLAG_SCREENS) assert.ok(screenOf({ start: id === 'start' }).label, id);

// flytende ⚑: alle skjermer unntatt spill/meny med toppbånd (⚑ ligger i båndet) og innstillinger (⚑ i panelhodet)
for (const id of ['start', 'brettvalg', 'bygg', 'oversikt', 'mal', 'intro', 'historie']) {
  assert.ok(floatOn(id, { tbOn: true }), `${id}: flytende ⚑ også med toppbånd`);
  assert.ok(floatOn(id, { tbOn: false }), `${id}: flytende ⚑ uten toppbånd`);
  assert.ok(!floatOn(id, { qbtnOn: false }), `${id}: av når innstillingen er av`);
  assert.ok(!floatOn(id, { cinema: true }), `${id}: kinomodus skjuler`);
}
assert.ok(!floatOn('spill', { tbOn: true }) && floatOn('spill', { tbOn: false }), 'spill: som før (bånd eller flytende)');
assert.ok(!floatOn('meny', { tbOn: true }) && floatOn('meny', { tbOn: false }));
assert.ok(!floatOn('innstillinger', {}), 'panelet har egen ⚑ i hodet');
assert.ok(!floatOn('ukjent', {}));

// rapporten sier hvilken skjerm
const base = { version: '1', level: 'L', when: 'n', device: 'd', screen: '390×844 @3x', touch: true, fps: 'f', preset: 'p', clock: 1, points: 0, pos: [0, 0, 0], state: 's', stats: { saves: 0, respawns: 0, broken: 0, resets: 0, hard: 0 }, changed: [], marks: [], events: [] };
assert.match(formatReport({ ...base, where: 'byggeskjerm (bro1)' }), /Skjerm oppe: byggeskjerm \(bro1\)/);
assert.doesNotMatch(formatReport(base), /Skjerm oppe/);

// hektene
const idx = fs.readFileSync('./index.html', 'utf8'), main = fs.readFileSync('./main.js', 'utf8'), build = fs.readFileSync('./build.js', 'utf8');
assert.match(idx, /'flag_logic'/, 'flag_logic i files');
assert.match(idx, /html body\.flagscr #qbtn\{display:flex!important/, 'CSS for flytende ⚑');
assert.doesNotMatch(idx, /body\.ovview #qbtn/, 'oversikten skjuler ikke ⚑');
const z = (sel) => +(idx.match(new RegExp(sel + '[^}]*z-index:(\\d+)'))?.[1]);
const zq = Math.max(z('#qpop\\{'), +(idx.match(/#qpop\{z-index:(\d+)\}/)?.[1] || 0)), zb = +(idx.match(/body\.flagscr #qbtn\{[^}]*z-index:(\d+)/)[1]);
for (const [name, v] of [['#start', 9], ['#story', 9], ['#win', 8], ['#introsw', 8], ['#panel', 10]]) assert.ok(zb > v, `⚑-knappen over ${name}`);
assert.ok(zq > zb, '⚑-boksen over knappen og alle lag');
assert.match(main, /id="pFlag"/, '⚑ i ⚙-panelhodet'); assert.match(main, /where: currentScreen\(\)\.label/, 'rapporten har skjerm');
assert.match(main, /pointerdown[^\n]*#qbtn, #pFlag, #topband[^\n]*true\)/, 'lukkes ved trykk utenfor (capture)');
assert.match(build, /body\.flagscr #bld \.bt\.top\{right:/, 'plass til ⚑ i byggeskjermens øverste rad');
assert.match(build, /tagName === 'INPUT'/, 'skriving i ⚑-boksen trigger ikke byggetaster');
console.log('flag ok');
