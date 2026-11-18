// node test_stats.mjs: R88 anonym statistikk. Kø, kutting, avkorting, av-tilstand, sending mot falsk server (ikke den ekte), hekter.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { STATS, EVENTS, EVENT_NAMES, ALLOWED_DATA_FIELDS, CID_RE, screenClass, deviceClass, cleanText, cleanData, buildRow, makeCid, ensureCid, createStats, createRoomAgg, hasBackData, routeShare, fpsOf, sendBlocked } from './stats_logic.js';
import { createStatsNet } from './stats_net.js';
const mkStore = () => { const m = new Map(); return { m, get: (k, d) => (m.has(k) ? m.get(k) : d), set: (k, v) => m.set(k, v) }; };
const main = fs.readFileSync('main.js', 'utf8'), build = fs.readFileSync('build.js', 'utf8'), idx = fs.readFileSync('index.html', 'utf8');

// hendelsene fra veikartet finnes, og ingenting annet
assert.deepEqual(EVENT_NAMES.sort(), ['build_try', 'checkpoint_back', 'fps_room', 'js_error', 'level_complete', 'level_quit', 'level_start', 'session_start']);
assert.ok(ALLOWED_DATA_FIELDS.every((f) => !/pos|kode|code|mail|navn|tekst|image|bilde/i.test(f)));
assert.equal(screenClass(390, 844), 'liten'); assert.equal(screenClass(844, 390), 'liten'); assert.equal(screenClass(820, 1180), 'mellom'); assert.equal(screenClass(1920, 1080), 'stor');
assert.equal(deviceClass('mobil'), 'mobil'); assert.equal(deviceClass('pc'), 'PC');

// cid
assert.ok(CID_RE.test(makeCid()) && makeCid().length === 16);
const s0 = mkStore(); const c1 = ensureCid(s0), c2 = ensureCid(s0); assert.equal(c1, c2); assert.equal(s0.get(STATS.cidKey), c1);
s0.set(STATS.cidKey, 'bad!'); assert.notEqual(ensureCid(s0), 'bad!');

// avkorting og renhet
assert.equal(cleanText('Feil på https://x.no/a?b=1 slutt\nlinje', 50), 'Feil på slutt linje');
assert.equal(cleanText('x'.repeat(500), 120).length, 120);
assert.deepEqual(cleanData('level_complete', { sek: '12.3456', poeng: 90, merke: 'medium', pos: [1, 2, 3], kode: 'rune' }), { sek: 12.35, poeng: 90, merke: 'medium' });
assert.deepEqual(cleanData('finnesikke', { a: 1 }), {});
assert.equal(buildRow({ cid: 'kort', version: '1', name: 'level_start', level: 'bad', data: {} }), null, 'ugyldig cid');
assert.equal(buildRow({ cid: c1, version: '1', name: 'ukjent', level: 'bad', data: {} }), null, 'ukjent hendelse');
{ const r = buildRow({ cid: c1, version: '2.51', name: 'js_error', level: 'bad', data: { msg: 'a'.repeat(900), stack: 'x' } }); assert.equal(r.data.msg.length, 120); assert.ok(!('stack' in r.data)); assert.ok(new TextEncoder().encode(JSON.stringify(r.data)).length <= STATS.maxBytes); assert.deepEqual(Object.keys(r).sort(), ['cid', 'data', 'level', 'name', 'version']); }

// av: ingen rader og ingen cid
{ const st = mkStore(); let on = false; const s = createStats({ store: st, on: () => on, version: () => 'v' });
  assert.equal(s.track('level_start', 'bad', {}), false); assert.equal(s.size(), 0); assert.equal(st.m.size, 0, 'ingen cid laget når av');
  on = true; assert.equal(s.track('level_start', 'bad', {}), true); assert.equal(st.m.size, 1); assert.equal(s.size(), 1);
  on = false; assert.equal(s.track('level_start', 'bad', {}), false); }
// blokkert (kinomodus/test): heller ikke cid
{ const st = mkStore(); const s = createStats({ store: st, blocked: () => true }); assert.equal(s.track('level_start', 'bad', {}), false); assert.equal(st.m.size, 0);
  assert.ok(sendBlocked({ cinema: true }) && sendBlocked({ search: '?cinema=1' }) && sendBlocked({ search: '?level=bad&nostats=1' }) && !sendBlocked({ search: '?level=bad' }) && !sendBlocked({ search: '?cinema=0' })); }
// kø: tak 100 og maks 3 feil per økt
{ const s = createStats({ store: mkStore() }); for (let i = 0; i < 150; i++) s.track('level_start', 'bad', { diff: 'medium' }); assert.equal(s.size(), STATS.maxQueue);
  const q = createStats({ store: mkStore() }); const res = [1, 2, 3, 4, 5].map((i) => q.track('js_error', 'bad', { msg: 'e' + i })); assert.deepEqual(res, [true, true, true, false, false]);
  const d = s.drain(); assert.equal(d.length, 100); assert.equal(s.size(), 0); s.restore(d); assert.equal(s.size(), 100); s.track('level_start', 'bad', {}); assert.equal(s.size(), 100); }

// aggregater
{ const a = createRoomAgg(); a.back('knapp'); a.back('falt'); a.back('druknet'); const r = a.take(2); assert.deepEqual(r, { back: 3, fall: 1, broken: 2 }); assert.ok(hasBackData(r)); assert.ok(!hasBackData(a.take(0))); }
assert.equal(routeShare([0, 0, 0], [10, 0, 0], [5, 0, 0]), 0.5); assert.equal(routeShare([0, 0, 0], [10, 0, 0], [-50, 0, 0]), 0); assert.equal(routeShare([0, 0, 0], [10, 0, 0], [10, 0, 0]), 1);
assert.equal(fpsOf(600, 20000), 30); assert.equal(fpsOf(10, 1000), 0);

// sending mot falsk server
const calls = []; let mode = 'ok';
const fake = async (url, opt) => { calls.push({ url, opt }); if (mode === 'net') throw new Error('nett'); return { ok: mode === 'ok', status: mode === 'ok' ? 201 : mode === 'rls' ? 401 : 503 }; };
const cfg = { url: 'https://fake.example', key: 'KEY', table: 'tlm_events' };
const logs = [];
{ const st = mkStore(); const s = createStats({ store: st, version: () => '2.51' });
  const hooks = {}; const doc = { hidden: false, addEventListener: (t, f) => { hooks['doc:' + t] = f; } }, win = { addEventListener: (t, f) => { hooks['win:' + t] = f; } };
  let ivFn = null; const net = createStatsNet({ stats: s, cfg, fetchFn: fake, beacon: null, win, doc, setIv: (f, ms) => { ivFn = f; assert.equal(ms, 60000); return 1; }, logEv: (t, d) => logs.push([t, d]) });
  assert.equal(net.url, 'https://fake.example/rest/v1/tlm_events');
  s.track('session_start', 'bad', { platform: 'mobil', screen: 'liten', diff: 'medium' }); s.track('level_start', 'bad', { diff: 'medium' }); s.track('level_quit', 'bad', { sek: 40, andel: 0.3 });
  assert.equal(await net.flush('test'), 3, 'én gruppe med tre hendelser'); assert.equal(calls.length, 1);
  const c = calls[0]; assert.equal(c.opt.method, 'POST'); assert.equal(c.opt.keepalive, true); assert.equal(c.opt.headers.apikey, 'KEY'); assert.equal(c.opt.headers['Content-Type'], 'application/json');
  const body = JSON.parse(c.opt.body); assert.ok(Array.isArray(body) && body.length === 3 && body.every((r) => r.cid === body[0].cid && EVENTS[r.name]));
  assert.ok(!/rune|tester|code|e-?post|userAgent|Mozilla/i.test(c.opt.body), 'ingen personfelt i nettlasten');
  assert.deepEqual(logs.at(-1), ['statistikk', 'sendt 3 hendelser (test)']); assert.equal(logs.filter((l) => l[0] === 'statistikk').length, 1, 'én logg per sending, ikke per hendelse');
  assert.equal(await net.flush('tom'), 0); assert.equal(calls.length, 1, 'tom kø sender ikke');
  // nettfeil: stille, køen beholdes
  mode = 'net'; s.track('level_start', 'bad', {}); assert.equal(await net.flush('x'), 0); assert.equal(s.size(), 1);
  mode = 'srv'; assert.equal(await net.flush('x'), 0); assert.equal(s.size(), 1, '503: prøv igjen senere');
  mode = 'rls'; assert.equal(await net.flush('x'), 0); assert.equal(s.size(), 0, '401: ikke prøv de samme på nytt');
  mode = 'ok'; s.track('level_start', 'bad', {}); doc.hidden = true; hooks['doc:visibilitychange'](); await new Promise((r) => setTimeout(r, 5)); assert.equal(s.size(), 0, 'sendes når siden skjules');
  s.track('level_start', 'bad', {}); hooks['win:pagehide'](); await new Promise((r) => setTimeout(r, 5)); assert.equal(s.size(), 0, 'sendes ved pagehide');
  s.track('level_start', 'bad', {}); const n0 = calls.length; ivFn(); await new Promise((r) => setTimeout(r, 5)); assert.equal(calls.length, n0 + 1, 'hvert 60. sekund');
}
// av: ingenting sendes, selv om flush kalles
{ const n0 = calls.length; const s = createStats({ store: mkStore(), on: () => false }); s.track('level_start', 'bad', {}); const net = createStatsNet({ stats: s, cfg, fetchFn: fake, beacon: null, win: { addEventListener() {} }, doc: { addEventListener() {} }, setIv: null }); assert.equal(await net.flush('x'), 0); assert.equal(calls.length, n0); }
// beacon når fetch mangler
{ const bc = []; const s = createStats({ store: mkStore() }); s.track('level_start', 'bad', {}); const net = createStatsNet({ stats: s, cfg, fetchFn: null, beacon: (u, b) => { bc.push([u, b]); return true; }, win: { addEventListener() {} }, doc: { addEventListener() {} }, setIv: null }); assert.equal(await net.flush('x', { unloading: true }), 1); assert.equal(bc[0][0], 'https://fake.example/rest/v1/tlm_events?apikey=KEY'); assert.equal(bc[0][1].type, 'application/json'); }

// hekter i koden
assert.ok(idx.includes("'stats_logic', 'stats_net'"), 'filene står i files i index.html');
for (const h of ["sts.track('session_start'", 'statsLevelStart()', "statsLevelEnd('quit')", "statsLevelEnd('complete'", "sts.track('js_error'", "fl('stats', 'test'", 'tlm.stats'.length ? 'STATS.onKey' : '']) assert.ok(main.includes(h), `main.js: ${h}`);
assert.ok(main.includes("type === 'tilbake' && statHook"), 'tilbake-tellere via logEv');
assert.ok(build.includes("onStat('build_try'"), 'build_try i build.js');
assert.ok(!/setInterval|requestAnimationFrame/.test(fs.readFileSync('stats_logic.js', 'utf8')), 'ingen tikk-hendelser i kjernen');
console.log('statistikk-tester grønne');
