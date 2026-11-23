// node test_i18n.mjs: begge språk har de samme nøklene, og plassholdere går opp
import assert from 'node:assert/strict';
import { makeT, DICT_KEYS, NAMES } from './i18n.js';
assert.deepEqual([...DICT_KEYS.nb].sort(), [...DICT_KEYS.en].sort(), 'nb og en har samme nøkler');
let lang = 'nb'; const { T, name } = makeT(() => lang);
assert.equal(T('btn.smear'), 'SMØR'); assert.equal(T('hint.take', { name: 'Nål' }), 'ta Nål');
lang = 'en'; assert.equal(T('btn.smear'), 'SMEAR'); assert.equal(T('hint.take', { name: 'Needle' }), 'take Needle');
for (const l of ['nb', 'en']) { lang = l; for (const k of DICT_KEYS[l]) { const vars = {}; for (const m of (T(k).matchAll(/\{(\w+)\}/g))) vars[m[1]] = 'v'; assert.ok(!/\{\w+\}/.test(T(k, vars)), `plassholder i ${l}:${k}`); } }
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

// ---------- R148 runde 3: ordbøkene i i18n.js, lydmikser, versjonssjekk, ⚑ Send, index.html ----------
import { SOUND_LIST } from './audio.js';
import { cardText, menuLine, upToDateText } from './version_check_logic.js';
import { reasonText, statsLines } from './feedback_send.js';
import { dt, TEXT_KEYS as DT_KEYS } from './difficulty.js';
import { ft } from './firstrun_logic.js';
import { rt } from './rewards.js';
import { sv } from './storage_logic.js';
// 8. de fire egne ordbøkene er flyttet inn i i18n.js og modulene slår opp der
for (const f of ['difficulty.js', 'firstrun_logic.js', 'rewards.js', 'storage_logic.js']) assert.ok(!/^const TXT = \{/m.test(fs.readFileSync(f, 'utf8')), `${f}: egen ordbok igjen`);
for (const [fn, key, l] of [[dt, 'df.back', 'Tilbake/Back'], [ft, 'fr.backMenu', 'TILBAKE TIL MENY/BACK TO MENU'], [rt, 'rw.back', 'Tilbake/Back'], [sv, 'sv.cancel', 'AVBRYT/CANCEL']]) { const [a, b] = l.split('/'); assert.equal(fn('nb', key), a); assert.equal(fn('en', key), b); }
assert.ok(DT_KEYS.nb.length > 10 && DT_KEYS.en.length === DT_KEYS.nb.length);
// 9. nb og en bruker de samme plassholderne i hver tekst
const phs = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
for (const k of DICT_KEYS.nb) { lang = 'nb'; const a = T(k); lang = 'en'; const b = T(k); assert.equal(phs(a), phs(b), `plassholdere ulike i ${k}`); }
// 10. lydmikser: hver lyd og gruppe har navn på begge språk
for (const sd of SOUND_LIST) for (const l of ['nb', 'en']) { lang = l; assert.notEqual(T('snd.' + sd.id), 'snd.' + sd.id, `mangler lydnavn ${sd.id} ${l}`); assert.notEqual(T('sndg.' + sd.group), 'sndg.' + sd.group, `mangler lydgruppe ${sd.group}`); }
lang = 'en'; assert.equal(T('snd.jump'), 'Take-off ("hup")'); lang = 'nb'; assert.equal(T('snd.jump'), SOUND_LIST.find((s) => s.id === 'jump').label);
for (const sd of SOUND_LIST) { lang = 'nb'; assert.equal(T('snd.' + sd.id), sd.label, `norsk lydnavn avviker: ${sd.id}`); }
// 11. versjonssjekk og ⚑ Send på begge språk
assert.equal(cardText('2.5'), 'NY VERSJON v2.5 · TRYKK FOR Å OPPDATERE'); assert.equal(cardText('2.5', 'en'), 'NEW VERSION v2.5 · TAP TO UPDATE');
assert.equal(menuLine('2.1', 'idle', 'en'), 'Version v2.1 · CHECK NOW'); assert.equal(menuLine('2.1', 'checking'), 'Versjon v2.1 · SJEKKER …'); assert.equal(upToDateText('en'), 'You have the latest version');
for (const r of ['kode', 'grense', 'nett', 'feil', 'tom', 'ukjent']) { assert.ok(reasonText(r, 'en') && reasonText(r, 'en') !== reasonText(r, 'nb') || r === 'ukjent', r); }
assert.deepEqual(statsLines({ me: { sent: 3, fixed: 1, working: 1 }, all: { sent: 9, fixed: 4, testers: 3 } }, 'en'), ['You have reported 3 · 1 fixed · 1 in progress', 'Together you have reported 9, and 4 are fixed']);
assert.match(statsLines({ me: { sent: 0 }, all: { sent: 0 } })[0], /Du har ikke meldt/);
// 12. index.html og main.js: statisk tekst følger språket (applyIxText), ⚑-boksen bygges av T, ingen hardkodet norsk igjen i mikser/sending
for (const k of ['ix.help', 'ix.save', 'ix.back', 'ix.ovhint', 'fq.aria']) for (const l of ['nb', 'en']) { lang = l; assert.ok(T(k).length > 2, k); }
lang = 'en'; assert.ok(/<kbd>Space<\/kbd>/.test(T('ix.help')) && !/Mellomrom/.test(T('ix.help')));
assert.ok(/function applyIxText/.test(main) && /applyIxText\(\); if \(qpopRebuild\)/.test(main), 'applyLang kaller applyIxText');
for (const bad of ['Lydmikser:', 'Alle av</button>', 'Skriv hva som skjedde', 'Send til Claude</button>', "'Sendt! Takk", 'Svar fra Claude:', 'Tester-kode (én gang)']) assert.ok(!main.includes(bad), `hardkodet norsk i main.js: ${bad}`);
assert.ok(!fs.readFileSync('version_check_view.js', 'utf8').includes("'Oppdaterer …'"), 'versjonssjekk har hardkodet tekst');
console.log('språk-tester grønne');
