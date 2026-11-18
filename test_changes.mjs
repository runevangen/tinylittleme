// node test_changes.mjs: R83, NYTT-menyen (changes_data.js, changes_logic.js; visningen er fixes_view.js). Data gyldig, sammenslåing av server og lokale avkryssinger, skjuling etter 14/7 dager, RPC-kall, hekter.
// Hele flyten i nettleser (falsk server, GÅ DIT, avkryssing, bilder): node tools/changes_check.cjs (Playwright).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CHANGES } from './changes_data.js';
import { buttonLabel, parseChangeChecks, parseLocal, mergeChecks, pendingChecks, buildRows, checksFromRows, validateChanges, LOCAL_KEY } from './changes_logic.js';
import { sortFixes, uncheckedCount, tabCounts, tabView, defaultTab, withCheck, versionLine, versionStatus, goUrl } from './fixes_logic.js';
import { fetchChangeChecks, checkChange } from './feedback_send.js';

// data
const main = fs.readFileSync('main.js', 'utf8'), idx = fs.readFileSync('index.html', 'utf8'), changelog = fs.readFileSync('CHANGELOG.md', 'utf8');
const levelIds = [...main.matchAll(/^\s*\{ id: '([a-z0-9]+)'/gm)].map((m) => m[1]);
assert.ok(levelIds.includes('verksted') && levelIds.includes('bygglab'));
assert.deepEqual(validateChanges(CHANGES, { levelIds, changelog }), [], 'CHANGES er gyldig');
assert.ok(CHANGES.length >= 12, 'minst 12 rader');
for (const c of CHANGES) if (c.level) assert.ok(fs.existsSync(`levels/${c.level}.level.json`) || fs.existsSync(`scenes/${c.level}.scene.json`) || ['bad', 'barnerom', 'kjokken', 'bad2', 'barnerom2', 'kjokken2'].includes(c.level), `brett ${c.level}`);
assert.ok(!CHANGES.some((c) => /\b(tast|taster|tastatur)\b/i.test(c.how)), 'ingen taster i how');
// validatoren fanger feil
const ok1 = { id: 'a', version: '2.36', date: '2026-11-18', title: 't', how: 'h', level: 'bad', spot: null };
const bad = (patch, list = [ok1]) => validateChanges(list.map((c) => ({ ...c, ...patch })), { levelIds, changelog }).length > 0;
assert.ok(bad({ id: 'x'.repeat(41) }) && bad({ version: '2' }) && bad({ version: '9.99' }) && bad({ date: '2026-13-40' }) && bad({ date: '18.11.2026' }) && bad({ title: ' ' }) && bad({ how: '' }) && bad({ level: 'finnesikke' }) && bad({ spot: { x: 1 } }) && bad({ level: '', spot: { x: 1, y: 2, z: 3 } }));
assert.ok(validateChanges([ok1, { ...ok1 }], { levelIds, changelog }).some((e) => /to ganger/.test(e)), 'unike id');
assert.ok(validateChanges([ok1, { ...ok1, id: 'b', date: '2026-11-19' }], { levelIds, changelog }).some((e) => /nyeste først/.test(e)), 'nyeste først');
assert.ok(validateChanges([], {}).length > 0);

// rader, tellere og knapp
const rows = buildRows(CHANGES, {});
assert.equal(rows.length, CHANGES.length); assert.equal(uncheckedCount(rows), CHANGES.length); assert.equal(buttonLabel(3), 'NYTT · 3'); assert.equal(buttonLabel(0), 'NYTT');
assert.deepEqual(sortFixes(rows).map((r) => r.id), CHANGES.map((c) => c.id), 'sortert som dataene (nyeste først)');
{ const o = sortFixes(rows); for (let i = 1; i < o.length; i++) assert.ok(Date.parse(o[i - 1].at) >= Date.parse(o[i].at), 'nyeste først'); }
assert.ok(rows.every((r) => r.message && r.how && r.at.startsWith(r.at.slice(0, 10))));
// server og lokal: nyeste vinner
const srv = parseChangeChecks({ ok: true, checks: [{ id: 'a', check: 'ok', note: 'x', checked_at: '2026-11-10T10:00:00Z' }, { id: 'b', check: 'fail', note: 'n', checked_at: '2026-11-10T10:00:00Z' }, { id: '', check: 'ok' }, { id: 'c', check: 'rart' }] });
assert.deepEqual(Object.keys(srv), ['a', 'b']); assert.equal(srv.a.note, '', 'ok har ingen tekst'); assert.deepEqual(parseChangeChecks(null), {}); assert.deepEqual(parseChangeChecks({ ok: false }), {});
const loc = parseLocal(JSON.stringify({ a: { check: 'fail', note: 'ny', checked_at: '2026-11-12T10:00:00Z' }, b: { check: 'ok', checked_at: '2026-11-01T10:00:00Z' }, d: { check: 'ok', checked_at: '2026-11-11T10:00:00Z' }, e: { check: 'x' } }));
assert.deepEqual(Object.keys(loc), ['a', 'b', 'd']); assert.deepEqual(parseLocal('søppel'), {}); assert.deepEqual(parseLocal(null), {}); assert.deepEqual(parseLocal('[1]'), parseLocal('[1]'));
const mg = mergeChecks(srv, loc);
assert.equal(mg.a.check, 'fail', 'lokal er nyere'); assert.equal(mg.b.check, 'fail', 'serveren er nyere'); assert.equal(mg.d.check, 'ok', 'bare lokalt');
assert.deepEqual(pendingChecks(srv, loc).map((p) => p.id).sort(), ['a', 'd'], 'sendes: nyere lokalt og bare lokalt');
assert.deepEqual(pendingChecks(mg, loc).map((p) => p.id), [], 'ingenting å sende når alt er likt');
assert.deepEqual(mergeChecks(null, null), {});
const r2 = buildRows([{ ...ok1, id: 'a' }, { ...ok1, id: 'b' }, { ...ok1, id: 'z' }], mg);
assert.deepEqual(r2.map((r) => r.check), ['fail', 'fail', null]); assert.equal(r2[0].note, 'ny');
assert.deepEqual(Object.keys(checksFromRows(r2)).sort(), ['a', 'b']);
assert.equal(LOCAL_KEY, 'tlm.changechecks');
// avkryssing via withCheck (felles med Rettelser)
assert.equal(uncheckedCount(withCheck(rows, rows[0].id, 'ok')), CHANGES.length - 1);

// skjuling etter 14/7 dager med fast now (datoen er `at` fra data)
{
  const NOW = Date.parse('2026-12-10T12:00:00Z'), v = tabView(rows, 'sjekke', false, NOW);
  assert.equal(v.shown.length + v.hidden, CHANGES.length);
  const cutoff = (NOW - 14 * 86400000);
  assert.ok(v.shown.every((r) => NOW - Date.parse(r.at) <= 14 * 86400000) && v.hidden > 0);
  assert.equal(tabView(rows, 'sjekke', true, NOW).shown.length, CHANGES.length, 'VIS ALLE');
  const chk = rows.map((r, i) => (i === 0 ? { ...r, check: 'ok', checked_at: new Date(NOW - 8 * 86400000).toISOString() } : i === 1 ? { ...r, check: 'fail', checked_at: new Date(NOW - 60 * 86400000).toISOString() } : r));
  assert.equal(tabView(chk, 'sjekket', false, NOW).shown.map((r) => r.id).join(), rows[1].id, '✓ eldre enn 7 dager skjult, ✗ aldri');
  assert.equal(defaultTab(chk), 'sjekke'); assert.equal(tabCounts(chk).sjekket, 2);
}
// versjon og lenke
assert.equal(versionStatus('2.36', '2.36'), 'ok'); assert.equal(versionStatus('2.30', '2.36'), 'eldre');
assert.equal(versionLine('2.30', '2.36', 'Kom'), 'Kom i v2.36 · du kjører v2.30: OPPDATER først'); assert.equal(versionLine('2.36', '2.36'), 'Rettet i v2.36 · du kjører v2.36');
const plate = CHANGES.find((c) => c.spot && c.level === 'verksted'); assert.ok(plate, 'minst ett sted'); assert.match(goUrl('https://x.no/spill/?v=1', plate), /level=verksted&go=14%2C11\.2%2C-1/);

// RPC
let call = null; const f = (r) => async (url, init) => { call = { url, body: JSON.parse(init.body) }; return { ok: true, status: 200, json: async () => r }; };
assert.deepEqual(await fetchChangeChecks('Rune', { fetchFn: f({ ok: true, checks: [] }) }), { ok: true, checks: [] }); assert.ok(call.url.endsWith('/rpc/tlm_my_change_checks')); assert.deepEqual(call.body, { c: 'rune' });
assert.equal(await checkChange('Rune', 'r1', 'fail', ' lang ', '2.36', 'bad', { fetchFn: f(true) }), true); assert.ok(call.url.endsWith('/rpc/tlm_check_change')); assert.deepEqual(call.body, { c: 'rune', cid: 'r1', res: 'fail', note: 'lang', ver: '2.36', lvl: 'bad' });
call = null; assert.equal(await checkChange('rune', 'r1', 'kanskje', '', '', '', { fetchFn: f(true) }), false); assert.equal(call, null); assert.equal(await checkChange('rune', '', 'ok', '', '', '', { fetchFn: f(true) }), false);
assert.equal(await fetchChangeChecks('rune', { fetchFn: async () => { throw new Error('offline'); } }), null, 'offline: null, ingen feil');
assert.equal(await checkChange('rune', 'r1', 'ok', '', '', '', { fetchFn: async () => ({ ok: false, status: 500 }) }), false);

// hekter og regler
for (const f2 of ['changes_data', 'changes_logic']) assert.ok(idx.includes(`'${f2}'`), `${f2} i files i index.html`);
assert.ok(main.includes('id="mChg"') && main.includes('openChanges') && main.includes("logEv('nytt'") && main.includes('showFixes('), 'hekter i main.js');
assert.ok(fs.readFileSync('CLAUDE.md', 'utf8').includes('changes_data.js'), 'regel i CLAUDE.md');
assert.ok(fs.readFileSync('docs/TILBAKEMELDING.md', 'utf8').includes('changes_data.js'), 'linje i docs/TILBAKEMELDING.md');
console.log('changes: ok');
