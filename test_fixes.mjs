// node test_fixes.mjs: R80, Rettelser-menyen (fixes_logic.js, feedback_send.js): sortering, tellere, tilstand, versjon, trygg plassering, lenke, RPC-kall.
// Hele flyten i nettleser (falsk server, GÅ DIT, avkryssing, bilder): node tools/fixes_check.cjs (Playwright, som boot).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { sortFixes, stateOf, stateText, uncheckedCount, buttonLabel, menuVisible, versionStatus, versionLine, levelLabel, validSpot, safePlacement, goUrl, parseGo, withCheck, OLD_UNCHECKED_DAYS, OLD_OK_DAYS, tabOf, isOld, tabCounts, defaultTab, tabLabel, tabView, showAllLabel } from './fixes_logic.js';
import { parseInbox, checkReply, validCode, FEEDBACK } from './feedback_send.js';

// sortering: nyeste først, endrer ikke originalen
const L = [{ id: 'a', at: '2026-01-01T10:00:00Z', message: 'a' }, { id: 'c', at: '2026-03-01T10:00:00Z', message: 'c' }, { id: 'b', at: '2026-02-01T10:00:00Z', message: 'b' }, { id: 'd', at: 'søppel', message: 'd' }];
assert.deepEqual(sortFixes(L).map((r) => r.id), ['c', 'b', 'a', 'd']); assert.equal(L[0].id, 'a'); assert.deepEqual(sortFixes(null), []);
// tilstand og teller
assert.equal(stateOf({}), 'ikke'); assert.equal(stateOf({ check: 'ok' }), 'ok'); assert.equal(stateOf({ check: 'fail' }), 'fail'); assert.equal(stateOf({ check: 'rart' }), 'ikke');
assert.deepEqual(['ikke', 'ok', 'fail'].map(stateText), ['IKKE SJEKKET', '✓ VIRKER', '✗ VIRKER IKKE']);
const mix = [{ id: '1' }, { id: '2', check: 'ok' }, { id: '3', check: 'fail' }, { id: '4', check: null }];
assert.equal(uncheckedCount(mix), 2); assert.equal(buttonLabel(2), 'RETTELSER · 2'); assert.equal(buttonLabel(0), 'RETTELSER');
const after = withCheck(mix, '1', 'ok'); assert.equal(uncheckedCount(after), 1); assert.equal(uncheckedCount(mix), 2, 'original uendret');
assert.equal(withCheck(mix, '1', 'fail', 'x'.repeat(500))[0].note.length, 200); assert.equal(withCheck(mix, '3', 'ok')[2].note, '', 'ok sletter teksten');
// R81: faner, 14- og 7-dagersgrenser (fast now)
{
  const NOW = Date.parse('2026-06-30T12:00:00Z'), D = 86400000, iso = (d) => new Date(NOW - d * D).toISOString();
  assert.equal(OLD_UNCHECKED_DAYS, 14); assert.equal(OLD_OK_DAYS, 7);
  const R = [
    { id: 'u-ny', at: iso(1) }, { id: 'u-14', at: iso(14) }, { id: 'u-15', at: iso(15) }, { id: 'u-gammel', at: iso(90) }, { id: 'u-søppel', at: 'søppel' },
    { id: 'o-ny', at: iso(60), check: 'ok', checked_at: iso(2) }, { id: 'o-7', at: iso(60), check: 'ok', checked_at: iso(7) }, { id: 'o-8', at: iso(60), check: 'ok', checked_at: iso(8) },
    { id: 'o-mangler', at: iso(60), check: 'ok' }, { id: 'o-null', at: iso(60), check: 'ok', checked_at: null },
    { id: 'f-ny', at: iso(60), check: 'fail', checked_at: iso(1) }, { id: 'f-gammel', at: iso(200), check: 'fail', checked_at: iso(100) }, { id: 'f-mangler', at: iso(200), check: 'fail' }];
  assert.deepEqual(tabCounts(R), { sjekke: 5, sjekket: 8 }); assert.equal(tabOf({ check: 'fail' }), 'sjekket'); assert.equal(tabOf({}), 'sjekke');
  assert.equal(uncheckedCount(R), tabCounts(R).sjekke, 'knappetallet = «Å SJEKKE»');
  assert.equal(defaultTab(R), 'sjekke'); assert.equal(defaultTab(R.filter((r) => r.check)), 'sjekket'); assert.equal(defaultTab([]), 'sjekket');
  const ids = (v) => v.shown.map((r) => r.id).sort();
  let v = tabView(R, 'sjekke', false, NOW); assert.deepEqual(ids(v), ['u-14', 'u-ny', 'u-søppel'].sort(), '14 dager er ikke «eldre enn»; ugyldig dato skjules ikke'); assert.equal(v.hidden, 2);
  v = tabView(R, 'sjekke', true, NOW); assert.equal(v.shown.length, 5); assert.equal(v.hidden, 2);
  v = tabView(R, 'sjekket', false, NOW); assert.deepEqual(ids(v), ['f-gammel', 'f-mangler', 'f-ny', 'o-7', 'o-mangler', 'o-null', 'o-ny'], 'fail skjules aldri; manglende checked_at = nylig'); assert.equal(v.hidden, 1);
  assert.deepEqual(tabView(R, 'sjekket', true, NOW).shown.map((r) => r.id).includes('o-8'), true);
  assert.ok(!isOld({ check: 'fail', checked_at: iso(999), at: iso(999) }, NOW));
  // avkryssing flytter med en gang, også en gammel usjekket
  const c = withCheck(R, 'u-gammel', 'ok', '', NOW); assert.deepEqual(tabCounts(c), { sjekke: 4, sjekket: 9 }); assert.equal(c.find((r) => r.id === 'u-gammel').checked_at, new Date(NOW).toISOString());
  assert.ok(tabView(c, 'sjekket', false, NOW).shown.some((r) => r.id === 'u-gammel'), 'nysjekket vises i SJEKKET');
  assert.equal(tabLabel('sjekke', 3), 'Å SJEKKE (3)'); assert.equal(tabLabel('sjekket', 0), 'SJEKKET (0)');
  assert.equal(showAllLabel(false, 4), 'VIS ALLE (4 eldre)'); assert.equal(showAllLabel(true, 4), 'SKJUL ELDRE');
}
// bare for dem med tester-kode
assert.ok(menuVisible('rune', validCode)); assert.ok(!menuVisible('', validCode)); assert.ok(!menuVisible('ab', validCode)); assert.ok(!menuVisible(null, validCode));
// versjon
assert.equal(versionStatus('2.28', '2.27'), 'ok'); assert.equal(versionStatus('2.27', '2.27'), 'ok'); assert.equal(versionStatus('2.27', '2.28'), 'eldre'); assert.equal(versionStatus('2.9', '2.10'), 'eldre', 'tallvis');
assert.equal(versionStatus('2.27', 'v2.27'), 'ok'); assert.equal(versionStatus('2.27', ''), 'ukjent'); assert.equal(versionStatus('2.27', 'x'), 'ukjent');
assert.ok(versionLine('2.27', '2.28').includes('OPPDATER') && !versionLine('2.28', '2.27').includes('OPPDATER'));
assert.equal(levelLabel([{ id: 'verksted', short: 'Nivå 9 · Verksted' }], 'verksted'), 'Nivå 9 · Verksted'); assert.equal(levelLabel([], 'x'), 'x'); assert.equal(levelLabel([], ''), '');
// spot og lenke
assert.deepEqual(validSpot({ x: 1, y: 0, z: 2, q: 9 }), { x: 1, y: 0, z: 2 }); assert.equal(validSpot({ x: 1, y: 'a', z: 2 }), null); assert.equal(validSpot(null), null); assert.equal(validSpot({ x: NaN, y: 0, z: 0 }), null);
assert.equal(goUrl('https://x.no/tlm/?level=bad&fresh=1', { level: 'verksted', spot: { x: -30.123, y: 0, z: 10 } }), '/tlm/?level=verksted&go=-30.12%2C0%2C10');
assert.equal(goUrl('https://x.no/tlm/', { level: 'bad', spot: null }), '/tlm/?level=bad', 'uten sted: bare brettet (starter vanlig)');
assert.deepEqual(parseGo('?level=verksted&go=-30.12%2C0%2C10'), { x: -30.12, y: 0, z: 10 }); assert.equal(parseGo('?go=1,2'), null); assert.equal(parseGo('?go=a,b,c'), null); assert.equal(parseGo(''), null);
// trygg plassering: syntetisk brett
const lvl = { start: [0, 0, 0], deathY: -15, boxes: [{ type: 'floor', min: [-20, -2, -20], max: [20, 0, 20] }, { type: 'box', min: [2, 0, -1], max: [3, 2, 1] }, { type: 'wall', min: [-20, 0, 19], max: [20, 5, 20] }], hazards: [{ min: [4, 0, -1], max: [6, 0.5, 1] }] };
const spot = { x: 2.5, y: 0, z: 0 };   // midt i en kasse? Nei: stedet kan være ved kassen
const pl = safePlacement(spot, lvl); assert.ok(pl, 'fant plass');
assert.ok(pl.dist >= 1.8 && pl.dist <= 5.5, 'et par enheter unna'); assert.equal(pl.y, 0, 'på bakken');
assert.ok(!lvl.boxes.some((b) => b.min[0] < pl.x + 0.3 && b.max[0] > pl.x - 0.3 && b.min[1] < 1.1 && b.max[1] > 0.02 && b.min[2] < pl.z + 0.3 && b.max[2] > pl.z - 0.3 && b.type !== 'floor'), 'ikke inni en boks');
assert.ok(!lvl.hazards.some((h) => pl.x > h.min[0] - 0.8 && pl.x < h.max[0] + 0.8 && pl.z > h.min[2] - 0.8 && pl.z < h.max[2] + 0.8), 'ikke i fare');
{ // kameraet ser mot stedet: forover = (-sin yaw, -cos yaw)
  const fx = -Math.sin(pl.yaw), fz = -Math.cos(pl.yaw), dx = spot.x - pl.x, dz = spot.z - pl.z, d = Math.hypot(dx, dz); assert.ok((fx * dx + fz * dz) / d > 0.999, 'yaw peker mot stedet'); }
assert.deepEqual(safePlacement(spot, lvl), pl, 'deterministisk');
assert.equal(safePlacement(null, lvl), null); assert.equal(safePlacement({ x: 0, y: 0, z: 0 }, null), null);
assert.equal(safePlacement({ x: 500, y: 0, z: 500 }, lvl), null, 'utenfor brettet: ingen plass, vanlig start');
{ const small = { start: [0, 0, 0], boxes: [{ type: 'floor', min: [-1, -2, -1], max: [1, 0, 1] }] }; const q = safePlacement({ x: 0, y: 0, z: 0 }, small, { dists: [0.4] }); assert.ok(q && Math.abs(q.x) <= 0.7 && Math.abs(q.z) <= 0.7, 'på flata, ikke over kanten'); }
// det ekte Verkstedet: trykkplata (eksempelsvaret v2.27) gir en plassering på gulvet
const vk = JSON.parse(fs.readFileSync('levels/verksted.level.json', 'utf8')), pl0 = vk.gates.plates[0], ps = { x: (pl0.x0 + pl0.x1) / 2, y: pl0.y, z: (pl0.z0 + pl0.z1) / 2 };
const pv = safePlacement(ps, vk); assert.ok(pv, 'Verkstedet: plass ved plata'); assert.ok(Math.abs(pv.y - pl0.y) <= 0.6); assert.ok(Math.hypot(pv.x - ps.x, pv.z - ps.z) < 6);

// inbox: nye felt (brett, sted, avkryssing) og RPC-kallene
const inb = parseInbox({ ok: true, me: {}, all: {}, replies: [
  { id: 'a', version: '2.27', message: 'Rettet: plata', read: true, at: '2026-05-01', level: 'verksted', spot: { x: -30, y: 0, z: 10 }, check: 'ok', note: 'bra' },
  { id: 'b', message: 'Uten sted', level: 'bad', spot: null, check: 'rart' }, { id: 'c', message: 'x', spot: { x: 'a' } }] });
assert.deepEqual(inb.replies[0].spot, { x: -30, y: 0, z: 10 }); assert.equal(inb.replies[0].check, 'ok'); assert.equal(inb.replies[0].level, 'verksted');
assert.equal(inb.replies[0].checked_at, null, 'manglende checked_at = null'); assert.equal(parseInbox({ ok: true, replies: [{ id: 'z', message: 'm', check: 'ok', checked_at: '2026-06-01T10:00:00Z' }] }).replies[0].checked_at, '2026-06-01T10:00:00Z');
assert.equal(inb.replies[1].spot, null); assert.equal(inb.replies[1].check, null, 'ukjent avkryssing blir null'); assert.equal(inb.replies[2].spot, null); assert.equal(inb.replies[2].level, '');
let call; const okFetch = async (url, init) => { call = { url, body: JSON.parse(init.body) }; return { ok: true, status: 200, json: async () => ({ ok: true }) }; };
assert.equal(await checkReply(' Rune ', 'r1', 'fail', '  virker ikke  ', { fetchFn: okFetch }), true);
assert.equal(call.url, `${FEEDBACK.url}/rest/v1/rpc/tlm_check_reply`); assert.deepEqual(call.body, { c: 'rune', rid: 'r1', res: 'fail', note: 'virker ikke' });
call = null; assert.equal(await checkReply('rune', 'r1', 'kanskje', '', { fetchFn: okFetch }), false); assert.equal(call, null, 'ugyldig valg: ingen kall');
assert.equal(await checkReply('rune', '', 'ok', '', { fetchFn: okFetch }), false);
assert.equal(await checkReply('rune', 'r1', 'ok', '', { fetchFn: async () => { throw new Error('offline'); } }), false, 'uten nett: false, ingen feil');
assert.equal(await checkReply('rune', 'r1', 'ok', '', { fetchFn: async () => ({ ok: false, status: 500 }) }), false);

// hekter
const idx = fs.readFileSync('index.html', 'utf8'), main = fs.readFileSync('main.js', 'utf8'), view = fs.readFileSync('fixes_view.js', 'utf8');
for (const f of ['fixes_logic', 'fixes_view']) assert.ok(idx.includes(`'${f}'`), `${f} i files i index.html`);
assert.ok(main.includes('id="mFix"') && main.includes('parseGo(location.search)') && main.includes('showFixes('), 'hekter i main.js');
assert.ok(view.includes('logEv?.(C.tag') && view.includes("tag: 'rettelser'") && main.includes("logEv('rettelser'"), 'logEv(rettelser)');
assert.ok(view.includes('data-tab') && view.includes('fxAll') && view.includes('`fane ${tab}`'), 'faner og VIS ALLE i fixes_view.js');
assert.ok(!/\b(tast|trykk [A-Z]\b)/i.test(view.replace(/Trykk GÅ DIT/g, '')), 'ingen taster i teksten');
console.log('fixes: ok');
