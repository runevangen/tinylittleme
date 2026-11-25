// node test_rooms.mjs: R153, Mine brett og deling med kode (rooms_logic.js, rooms_text.js, rooms_view.js, migrasjon). Ingen ekte nettkall.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ROOMS, isRoomId, newCode, cleanRoomCode, nameClean, nameOk, safeName, validateRoom, listRooms, loadRoom, addRoom, removeRoom, setRoomCode, shareRoom, fetchRoom, deleteSharedRoom, reportRoom, roomsAvailable, fmtWhen } from './rooms_logic.js';
import { rtx, rerr, ROOMS_TEXT } from './rooms_text.js';
const bad = JSON.parse(fs.readFileSync('levels/bad.level.json', 'utf8'));
const mem = () => { const m = {}; return { get: (k, d) => (k in m && m[k] !== null ? m[k] : d), set: (k, v) => { m[k] = v === undefined ? null : JSON.parse(JSON.stringify(v)); }, m }; };
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// koder
for (let i = 0; i < 50; i++) { const c = newCode(rnd); assert.match(c, /^RM-[A-HJ-NP-Z2-9]{8}$/); assert.equal(cleanRoomCode(c), c); }
assert.equal(cleanRoomCode('rm-abcd efgh'), 'RM-ABCDEFGH'); assert.equal(cleanRoomCode(' abcdefgh '), 'RM-ABCDEFGH');
for (const x of ['', 'RM-123', 'RM-ABCDEFG0', null, 'RM-ABCDEFGHJ', '<script>']) assert.equal(cleanRoomCode(x), '', String(x));
assert.ok(isRoomId('mine-abc123') && !isRoomId('bad') && !isRoomId('mine-') && !isRoomId('mine-../x') && !isRoomId(null));

// navnefilter
assert.equal(nameClean('  <b>Mitt</b>   brett  '), 'bMitt/b brett'); assert.equal(nameClean('x'.repeat(99)).length, ROOMS.nameMax);
assert.ok(nameOk('Badet mitt') && nameOk('Æøå 2') && !nameOk('') && !nameOk('  <> ') && !nameOk('Fuck rommet') && !nameOk('f.a.e.n') && !nameOk('D1TT'.replace('D1TT', 'dr1tt')) && !nameOk('SEX'));
assert.equal(safeName('fuck'), 'Mitt brett'); assert.equal(safeName('Stuen'), 'Stuen');

// innhold
assert.ok(validateRoom(bad).ok, 'et ekte brett er gyldig');
assert.equal(validateRoom(null).error, 'form'); assert.equal(validateRoom([]).error, 'form'); assert.equal(validateRoom({ ...bad, boxes: [] }).error, 'form'); assert.equal(validateRoom({ ...bad, start: [1, 2] }).error, 'form');
{ const { goal, ...no } = bad; assert.equal(validateRoom(no).error, 'form'); }
assert.equal(validateRoom({ ...bad, junk: 'x'.repeat(ROOMS.maxBytes) }).error, 'stor');
assert.equal(validateRoom(JSON.parse('{"__proto__":{"a":1},"name":"x"}')).ok, false);
{ const v = validateRoom({ ...bad, name: '<img src=x onerror=1>', hints: [{ text: '<b>hei</b>' }] }); assert.ok(v.ok); assert.ok(!JSON.stringify(v.level).includes('<'), 'ingen < i renset brett'); }

// lokal lagring
{
  const st = mem(); assert.deepEqual(listRooms(st), []);
  const a = addRoom(st, { name: 'Stuen min', level: bad, rnd }); assert.ok(a.ok && isRoomId(a.id));
  assert.equal(listRooms(st).length, 1); assert.equal(loadRoom(st, a.id).name, 'Stuen min', 'navnet settes på brettet');
  assert.equal(addRoom(st, { name: 'x', level: { a: 1 } }).reason, 'form');
  const b = addRoom(st, { name: 'fuck', level: bad, code: 'RM-ABCDEFGH', mine: false, rnd }); assert.ok(b.ok); assert.equal(listRooms(st)[0].name, 'Mitt brett'); assert.equal(listRooms(st)[0].mine, false);
  const again = addRoom(st, { name: 'y', level: bad, code: 'RM-ABCDEFGH', mine: false, rnd }); assert.ok(again.again && again.id === b.id); assert.equal(listRooms(st).length, 2, 'samme kode dupliseres ikke');
  assert.ok(setRoomCode(st, a.id, 'RM-ZZZZ2222')); assert.equal(listRooms(st).find((r) => r.id === a.id).code, 'RM-ZZZZ2222');
  assert.ok(removeRoom(st, a.id)); assert.equal(listRooms(st).length, 1); assert.equal(loadRoom(st, a.id), null, 'brettet er borte'); assert.ok(!removeRoom(st, a.id));
  assert.equal(loadRoom(st, 'bad'), null, 'bare mine-id'); st.set(ROOMS.dataKey('mine-abc123'), { evil: 1 }); assert.equal(loadRoom(st, 'mine-abc123'), null, 'ødelagt brett lastes ikke');
  const full = mem(); for (let i = 0; i < ROOMS.max; i++) assert.ok(addRoom(full, { name: 'n' + i, level: bad, rnd }).ok); assert.equal(addRoom(full, { name: 'ett til', level: bad, rnd }).reason, 'fullt');
}

// nettet (falsk fetch)
let seen; const fake = (status, body) => async (url, init) => { seen = { url, body: init.body ? JSON.parse(init.body) : null, init }; return { ok: status < 300, status, json: async () => body }; };
{
  const r = await shareRoom({ tcode: 'Rune', name: 'Stuen', level: bad, version: '2.99', rcode: 'RM-ABCDEFGH' }, { fetchFn: fake(200, { ok: true, code: 'RM-ABCDEFGH' }) });
  assert.deepEqual(r, { ok: true, code: 'RM-ABCDEFGH' }); assert.ok(seen.url.endsWith('/rest/v1/rpc/tlm_share_room')); assert.equal(seen.body.c, 'rune'); assert.equal(seen.body.rc, 'RM-ABCDEFGH'); assert.equal(seen.body.nm, 'Stuen'); assert.ok(seen.body.lvl.boxes.length);
  assert.ok(!JSON.stringify(seen.body).includes('image'), 'ingen bilder sendes');
  assert.equal((await shareRoom({ tcode: 'x', name: 'a', level: bad })).reason, 'kode', 'uten gyldig kode skjer ingenting');
  assert.equal((await shareRoom({ tcode: 'rune', name: 'a', level: { a: 1 } })).reason, 'feil');
  assert.equal((await shareRoom({ tcode: 'rune', name: 'a', level: bad }, { fetchFn: fake(200, { ok: false, reason: 'kode' }) })).reason, 'kode');
  assert.equal((await shareRoom({ tcode: 'rune', name: 'a', level: bad }, { fetchFn: fake(200, { ok: false, reason: 'grense' }) })).reason, 'grense');
  assert.equal((await shareRoom({ tcode: 'rune', name: 'a', level: bad }, { fetchFn: async () => { throw new Error('off'); } })).reason, 'nett');
  assert.equal((await shareRoom({ tcode: 'rune', name: 'a', level: bad }, { fetchFn: fake(500, {}) })).reason, 'feil');
  const g = await fetchRoom({ tcode: 'rune', rcode: 'rm-abcdefgh' }, { fetchFn: fake(200, { ok: true, name: 'Stuen', level: bad }) });
  assert.ok(g.ok && g.name === 'Stuen' && g.code === 'RM-ABCDEFGH'); assert.equal(seen.body.rc, 'RM-ABCDEFGH'); assert.ok(seen.url.endsWith('/tlm_get_room'));
  assert.equal((await fetchRoom({ tcode: 'rune', rcode: 'nei' })).reason, 'kodeformat');
  assert.equal((await fetchRoom({ tcode: 'rune', rcode: 'RM-ABCDEFGH' }, { fetchFn: fake(200, { ok: false, reason: 'finnes ikke' }) })).reason, 'finnes ikke');
  assert.equal((await fetchRoom({ tcode: 'rune', rcode: 'RM-ABCDEFGH' }, { fetchFn: fake(200, { ok: true, name: 'x', level: { evil: 1 } }) })).reason, 'feil', 'ugyldig brett fra server avvises');
  assert.equal((await fetchRoom({ tcode: 'rune', rcode: 'RM-ABCDEFGH' }, { fetchFn: fake(200, { ok: true, name: 'fuck', level: bad }) })).name, 'Mitt brett', 'navnefilter også på hentet navn');
  assert.ok((await deleteSharedRoom({ tcode: 'rune', rcode: 'RM-ABCDEFGH' }, { fetchFn: fake(200, { ok: true }) })).ok); assert.ok(seen.url.endsWith('/tlm_delete_room'));
  assert.ok((await reportRoom({ tcode: 'rune', rcode: 'RM-ABCDEFGH', note: '<x>' }, { fetchFn: fake(200, { ok: true }) })).ok); assert.ok(!seen.body.note.includes('<'));
}
assert.ok(roomsAvailable({ on: true, code: 'rune' }) && !roomsAvailable({ on: true, code: '' }) && !roomsAvailable({ on: false, code: 'rune' }) && !roomsAvailable({ on: true, code: 'rune', cinema: true }), 'bare testere, bare når valget er på');

// tekster: begge språk, ingen taster
for (const lang of ['nb', 'en']) {
  for (const k of ['btn', 'btnSub', 'title', 'intro', 'empty', 'play', 'share', 'del', 'report', 'back', 'fromCode', 'fetch', 'codeLabel', 'confirmDel', 'deleted', 'reported', 'setting']) assert.ok(String(rtx(lang, k)).length > 2, `${lang} ${k}`);
  for (const r of ['kode', 'nett', 'grense', 'finnes ikke', 'kodeformat', 'fullt', 'stor', 'form', 'feil']) assert.ok(rerr(lang, r).length > 5, `${lang} ${r}`);
  assert.ok(rtx(lang, 'shared', 'RM-X').includes('RM-X') && rtx(lang, 'got', 'N').includes('N'));
  assert.ok(!/\b(tast|taster|tastatur|keyboard|key)\b/i.test(JSON.stringify(ROOMS_TEXT[lang])), 'ingen taster: ' + lang);
}

// hekter og migrasjon
const main = fs.readFileSync('main.js', 'utf8'), idx = fs.readFileSync('index.html', 'utf8'), sql = fs.readFileSync('supabase/migrations/20261123_tlm_rooms.sql', 'utf8');
for (const h of ["fl('roomson', 'test'", 'isRoomId(levelId)', 'roomsPick(buildingPick())', 'createRoomsView(']) assert.ok(main.includes(h), h);
for (const f of ['rooms_logic', 'rooms_text', 'rooms_view']) assert.ok(idx.includes(`'${f}'`), `index.html files: ${f}`);
assert.match(sql, /enable row level security/); assert.match(sql, /revoke all on public\.tlm_rooms from anon/); assert.ok(!/create policy/.test(sql), 'ingen direkte tilgang');
for (const f of ['tlm_share_room', 'tlm_get_room', 'tlm_delete_room', 'tlm_report_room']) assert.ok(sql.includes(`function public.${f}(`) && sql.includes('is_tester'), f);
assert.ok(/owner = k/.test(sql), 'bare eier sletter'); assert.ok(!/'owner', r\.owner/.test(sql), 'eier gis aldri ut');
// R184: dato og klokkeslett på egne brett
const at1 = new Date(2026, 10, 25, 7, 42).getTime(); assert.equal(fmtWhen(at1, at1), '25.11. 07:42'); assert.equal(fmtWhen(new Date(2025, 0, 5, 18, 5).getTime(), at1), '05.01. 2025 18:05'); assert.equal(fmtWhen(0), ''); assert.equal(fmtWhen(undefined), '');
console.log('test_rooms: ok');
