// R133: BYGGING-gruppen i VELG BRETT og flyttet-varselet.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { BYGGING, buildingCards, movedNoticeShould } from './bygging_logic.js';
import { buildingGroupHtml } from './bygging_view.js';
import { DICT_KEYS } from './i18n.js';

assert.deepEqual(buildingCards({}), ['school', 'lab3d']);
assert.deepEqual(buildingCards({ build3d: false }), ['school'], '3D-LAB skjult når valget er av');
assert.deepEqual(buildingCards({ cinema: true }), [], 'ingen i kinomodus');
assert.equal(BYGGING.lab3dUrl('/x/'), '/x/?level=bygglab&lab3d=1');
assert.equal(movedNoticeShould({}), true);
assert.equal(movedNoticeShould({ seen: true }), false, 'bare én gang');
assert.equal(movedNoticeShould({ firstRun: true }), false, 'ikke for nye spillere');
assert.equal(movedNoticeShould({ on: false }), false, 'valget av');
assert.equal(movedNoticeShould({ cinema: true }), false);
assert.equal(buildingGroupHtml('BYGGING', []), '');
const g = buildingGroupHtml('BYGGING', [{ html: '<button id="mSchool">a</button>' }, { html: '<button id="mLab3d">b</button>' }]);
assert.ok(g.includes('>BYGGING<') && g.indexOf('mSchool') < g.indexOf('mLab3d'));

const main = fs.readFileSync('main.js', 'utf8'), html = fs.readFileSync('index.html', 'utf8'), list = (html.match(/const files = \[([^\]]+)\]/) || [])[1] || '';
for (const f of ['bygging_logic', 'bygging_view']) assert.ok(list.includes(`'${f}'`), `index.html: ${f}`);
const menu = main.split('function showStart')[1].split("$('start').classList.remove('hide')")[0];
assert.ok(!menu.includes('mSchool') && !menu.includes('mLab3d') && !menu.includes('schoolMenuHtml'), 'hovedmenyen har ikke lenger BYGGESKOLE/3D-LAB');
assert.match(main, /fl\('buildmoved', 'hjelp'/, 'valg i SETTINGS');
for (const k of ["flyttet-varsel vist", "flyttet-varsel lukket", "åpnet fra ${from}"]) assert.ok(main.includes(k), `logEv: ${k}`);
for (const k of ['bygging.group', 'bygging.moved.title', 'bygging.moved.text', 'bygging.moved.ok']) { assert.ok(new Set(DICT_KEYS.nb).has(k) && new Set(DICT_KEYS.en).has(k), `i18n ${k}`); }
// ingen gamle henvisninger til hovedmenyen
for (const f of ['changes_data.js', 'i18n.js']) assert.ok(!/(BYGGESKOLE|3D-LAB)[^.'\n]{0,40}på hovedmenyen|hovedmenyen[^.'\n]{0,40}(BYGGESKOLE|3D-LAB)/.test(fs.readFileSync(f, 'utf8').replace(/Ny 3D-LAB.*?\n/g, '')), `${f}: gammel henvisning`);
console.log('test_bygging: ok');
