// node test_i18n.mjs: begge språk har de samme nøklene, og plassholdere går opp
import assert from 'node:assert/strict';
import { makeT, DICT_KEYS, NAMES } from './i18n.js';
assert.deepEqual([...DICT_KEYS.nb].sort(), [...DICT_KEYS.en].sort(), 'nb og en har samme nøkler');
let lang = 'nb'; const { T, name } = makeT(() => lang);
assert.equal(T('btn.smear'), 'SMØR'); assert.equal(T('hint.take', { name: 'Nål' }), 'ta Nål');
lang = 'en'; assert.equal(T('btn.smear'), 'SMEAR'); assert.equal(T('hint.take', { name: 'Needle' }), 'take Needle');
for (const l of ['nb', 'en']) { lang = l; for (const k of DICT_KEYS[l]) assert.ok(!/\{\w+\}/.test(T(k, { m: 'M', btn: 'X', z: 'Z', g: 'G', name: 'Y', next: 'N', list: 'L', tieTop: 'A', tieEnd: 'B', press: 'P', hang: 'Q', grab: 'C', thread: 'D', smear: 'E', unroll: 'F', drop: 'G', jump: 'H', take: 'I', center: 'J', look: 'K', place: 'L', n: '1', total: '2', rank: '1', stars: 'S', loads: 'La', heavy: 'He', budget: '6', k: '3', cost: '5', parts: '2', of: '3', task: 'T', mat: 'M', len: '3', c: '1', r: '2', i: '1', ax: 'A', max: '6', rod: 'R', id: 'r1', act: 'A', pts: '5' })), `plassholder i ${l}:${k}`); }
assert.equal(name('gel_bottle', '?'), 'Hair gel'); lang = 'nb'; assert.equal(name('gel_bottle', '?'), 'Hårgelé'); assert.equal(name('xyz', 'reserve'), 'reserve');
for (const [k, v] of Object.entries(NAMES)) assert.equal(v.length, 2, k);

// ---------- R146 runde 1: ⚙, NYTT, RETTELSER-visning, spillhendelser og stemme på begge språk ----------
import fs from 'node:fs';
import { SETTING_TEXT, PANEL_TEXT, settingLabel, panelText } from './settings_text.js';
import { CHANGES } from './changes_data.js';
import { CHANGES_TEXT, changeText } from './changes_text.js';
import { fx, versionLineL } from './fixes_text.js';
import { LINES, createVoice } from './voice.js';
import { buildRows } from './changes_logic.js';
const main = fs.readFileSync('main.js', 'utf8');
// 1. alle ikke-admin-innstillinger har norsk og engelsk etikett (uten R-nummer og PROTOTYPE)
const ids = [...main.matchAll(/^\s*(?:\.\.\.\(.*?\[)?(?:fl|rg|sl)\('(\w+)', '(\w+)', /gm)].filter((m) => m[2] !== 'admin').map((m) => m[1]);
assert.ok(ids.length > 150, 'fant innstillingene');
const lost = ids.filter((id) => !SETTING_TEXT[id] && id !== 'platform');
assert.deepEqual(lost, [], 'innstillinger uten oversettelse: ' + lost.join(','));
for (const [id, v] of Object.entries(SETTING_TEXT)) {
  assert.ok(v.length === 2 || v.length === 4, id); assert.ok(v.every(Boolean), id);
  for (const s of v) assert.ok(!/\bR\d{2,3}\b|PROTOTYPE/.test(s), `${id}: R-nummer eller PROTOTYPE i etikett`);
  if (id !== 'lang' && id !== 'view') assert.notEqual(v[0], v[1], `${id}: samme tekst på begge språk`);
  assert.ok(!/\b(TAKE|JUMP|GRAB)\b.*\b(tast|key)\b/i.test(v[1]), id);
}
assert.equal(settingLabel('fps', 'x', 'en'), 'Show frames per second (FPS)'); assert.equal(settingLabel('fps', 'x', 'nb'), 'Vis bilder per sekund (FPS)'); assert.equal(settingLabel('p_stamina', 'Krefter', 'en'), 'Krefter');
for (const [k, v] of Object.entries(PANEL_TEXT)) assert.equal(v.length, 2, k);
assert.equal(panelText('g.kamera', 'en'), 'Camera'); assert.equal(panelText('title', 'nb'), 'Innstillinger');
// 2. NYTT: hver rad har engelsk tittel og «slik tester du»; korte titler; ingen taster
for (const c of CHANGES) {
  assert.ok(CHANGES_TEXT[c.id], `NYTT mangler oversettelse: ${c.id}`);
  for (const l of ['nb', 'en']) { const x = changeText(c, l); assert.ok(x.title && x.how, `${c.id} ${l}`); assert.ok(x.title.length <= 260, `${c.id} ${l}: tittel for lang`); }
  assert.ok(changeText(c, 'en').title !== c.title, `${c.id}: engelsk tittel er lik norsk`);
}
assert.deepEqual(Object.keys(CHANGES_TEXT).filter((k) => !CHANGES.some((c) => c.id === k)), [], 'ukjente NYTT-id-er');
{ const r = buildRows(CHANGES, {}, (c) => changeText(c, 'en')); assert.equal(r[0].message, changeText(CHANGES[0], 'en').title); assert.equal(buildRows(CHANGES, {})[0].message, CHANGES[0].title); }
// 3. RETTELSER/NYTT-visning
assert.equal(fx('en').go, 'GO THERE'); assert.equal(fx('nb').go, 'GÅ DIT'); assert.ok(Object.keys(fx('nb')).every((k) => k in fx('en')), 'fixes_text: samme nøkler');
assert.equal(versionLineL('nb', 'ok', '2.1', '2.0', 'Rettet'), 'Rettet i v2.0 · du kjører v2.1'); assert.match(versionLineL('en', 'eldre', '2.0', '2.1', 'Kom'), /Came in v2.1 .* UPDATE first/);
// 4. spillhendelser: nøklene i toast.* finnes på begge språk og id-er vises aldri rått
assert.ok(DICT_KEYS.nb.filter((k) => k.startsWith('toast.')).length >= 60);
assert.ok(!/toast\(`\$\{(ev\.)?id\} /.test(main) && !/Klemt av \$\{id\}/.test(main), 'rå id i toast');
for (const l of ['nb', 'en']) { lang = l; assert.ok(T('toast.broke', { name: 'Vasen', n: 5 }).includes('Vasen')); assert.ok(!/pillbug/i.test(T('toast.hurtRoller', { n: 1, jump: 'J' })) || l === 'en'); }
// 5. stemme: engelsk replikk finnes for alle, og duplisert nøkkel er borte
const vsrc = fs.readFileSync('voice.js', 'utf8'); const keys = [...vsrc.matchAll(/^  (\w+):\s+\{ say:/gm)].map((m) => m[1]); assert.equal(new Set(keys).size, keys.length, 'duplisert nøkkel i LINES');
for (const [k, L] of Object.entries(LINES)) { assert.ok(L.en && L.en.length === L.say.length, `${k}: en-replikker`); for (const s of L.en) assert.ok(s.length <= 40, `${k}: «${s}» for lang`); }
assert.ok(!/Sugd|Dopapir-tau/.test(vsrc), 'norskfeil i stemmen');
{ let tt = 0; const out = []; const v = createVoice({ speak: (x) => out.push(x), show: () => {}, now: () => tt, rnd: () => 0, lang: () => 'en' }); v.say('goal'); assert.equal(out[0], 'The antidote! Finally!'); }
// 6. alvor 2–3-funn er rettet
const src = fs.readFileSync('i18n.js', 'utf8');
for (const bad of ['ville gått', "'Legoklosse'", 'Tåler X', 'SNAP PÅ', "'SLOW'", 'Genvei', 'røyk', 'Wind-up-robot']) assert.ok(!src.slice(0, src.indexOf('\n  en: {')).includes(bad) && !(bad === 'Wind-up-robot' && /windup: \['Wind/.test(src)), `norskfeil igjen: ${bad}`);
assert.ok(!fs.readFileSync('storage_logic.js', 'utf8').includes('Bytte fremgangen'));
// 7. nye moduler i index.html
const idx = fs.readFileSync('index.html', 'utf8'); for (const f of ['settings_text', 'changes_text', 'fixes_text']) assert.ok(idx.includes(`'${f}'`), `${f} i files`);
console.log('språk-tester grønne');
