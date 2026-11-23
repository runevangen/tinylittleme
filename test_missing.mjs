// R149: «Mangler for full score»: ren logikk, tekster på nb og en, hekter i main.js/build.js/buildnext_view.js, ⚙-valg og modul i index.html
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { levelMissing, siteMissing, siteMissingText, lineText, MS } from './missing_logic.js';
import { makeT, DICT_KEYS } from './i18n.js';
import { weightText } from './stars2_logic.js';
let lang = 'nb'; const { T } = makeT(() => lang);

// vanlig brett: alt oppnådd = ingen linjer
assert.deepEqual(levelMissing({ stars: 3, crumbs: 10, total: 10, goalsDone: 4, goalsTotal: 4 }), []);
assert.deepEqual(levelMissing({ stars: 2, crumbs: 0, total: 0 }), [], 'uten smuler i brettet mangler ingen stjerne');
assert.deepEqual(levelMissing({ stars: 1, crumbs: 1, total: 10, flew: true }), [], 'flymodus: ingenting');
// smuler, delmål, byggesteder, merke; maks 3
const a = levelMissing({ stars: 1, crumbs: 8, total: 10, goalsDone: 3, goalsTotal: 4, sitesLeft: 1, sitesTotal: 2 });
assert.equal(a.length, MS.max); assert.deepEqual(a.map((l) => l.key), ['ms.crumbs', 'ms.goals', 'ms.sites']);
assert.equal(lineText(a[0], T), 'Mangler: 2 av 10 smuler for tre stjerner');
assert.equal(lineText(a[1], T), 'Mangler: 1 av 4 delmål');
lang = 'en'; assert.equal(lineText(a[0], T), 'Missing: 2 of 10 crumbs for three stars'); lang = 'nb';
assert.ok(levelMissing({ stars: 2, crumbs: 5, total: 10 }).every((l) => l.key === 'ms.crumbs'), 'to stjerner: smuler mangler');
// byggested
assert.deepEqual(siteMissing({ stars: 3, chips: [{ k: 'cheap', ok: true }, { k: 'light', ok: true }] }), []);
assert.equal(siteMissingText([], T), '');
const m = siteMissing({ stars: 2, next: { cost: 12, parts: 5 }, chips: [{ k: 'cheap', ok: false, target: 9 }, { k: 'light', ok: false, target: 3.5 }, { k: 'bonus', ok: true }] });
assert.equal(m.length, 3);
assert.equal(siteMissingText(m, T, weightText), 'Mangler: ★ (kostnad høyst 12) · BILLIGST (under 9) · LETTEST (under 3,5)');
lang = 'en'; assert.equal(siteMissingText(m, T, weightText), 'Missing: ★ (cost at most 12) · CHEAPEST (under 9) · LIGHTEST (under 3,5)'); lang = 'nb';
assert.equal(siteMissingText(siteMissing({ stars: 1 }), T), 'Mangler: ★', 'uten neste-mål');
// tekster: ingen taster, begge språk har nøklene
for (const k of DICT_KEYS.nb.filter((x) => x.startsWith('ms.'))) assert.ok(DICT_KEYS.en.includes(k), k);
for (const l of ['nb', 'en']) { lang = l; for (const k of DICT_KEYS[l].filter((x) => x.startsWith('ms.'))) assert.ok(!/\b(tast|key|Enter|Shift)\b/i.test(T(k)), k); } lang = 'nb';
// hekter og valg
const main = fs.readFileSync('main.js', 'utf8'), idx = fs.readFileSync('index.html', 'utf8');
assert.ok(/fl\('missing', 'spill'/.test(main) && main.includes("store.get('tlm.missing', true)"), 'valg i ⚙');
assert.ok(main.includes('missingWinHTML(d)') && main.includes("logEv('mangler'"), 'målskjermen og logg');
assert.ok(fs.readFileSync('build.js', 'utf8').includes('siteMissing(') && fs.readFileSync('buildnext_view.js', 'utf8').includes('siteMissingText('), 'byggekortet (delt, R101)');
assert.ok(idx.includes("'missing_logic'"), 'modul i index.html');
console.log('test_missing: ok');
