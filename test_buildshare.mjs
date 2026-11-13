// R50: replay/spøkelse (build_replay.js), bygget som kode (build_logic.js) og beste bygg på nett (build_net.js, falsk fetch)
import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as BL from './build_logic.js';
import * as BP from './build_phys.js';
import * as RP from './build_replay.js';
import * as NET from './build_net.js';
import { drawGhost } from './build_replay_view.js';
const site = JSON.parse(fs.readFileSync('levels/kontroll.level.json', 'utf8')).build.sites[0];
const types = { a: 'plank_l', b: 'plank_s', c: 'block', d: 'weight', e: 'seesaw', f: 'plank_l' };
const mk = (have = Object.keys(types)) => BL.createBuild(site, types, have);

// ---------- 1. kode: rund tur ----------
const B = mk();
BL.place(B, 'a', 0, 0.25, 0); BL.place(B, 'c', -2, 1, 0.5); BL.place(B, 'd', 1.5, 1.2, 0); BL.place(B, 'b', 3, 3, Math.PI / 6);
BL.addLink(B, 'tape', 'a', 'c'); BL.addLink(B, 'hinge', 'a', 'd'); BL.addLink(B, 'rope', 'a', 'b'); BL.addLink(B, 'tape', 'a', null, { u: -3, v: 0 });
assert.ok(B.links.length >= 3, 'bygget har koblinger');
const code = BL.exportCode(B);
assert.ok(code && code.startsWith('TLM1.') && code.length < BL.CODE_MAX && !/\s/.test(code), 'kort kode uten mellomrom: ' + code?.length);
assert.equal(code, BL.exportCode(B), 'samme bygg gir samme kode');
const B2 = mk(); const r = BL.importCode(code, B2); assert.ok(r.ok, 'importerer: ' + r.why);
BL.applyImport(B2, r);
assert.deepEqual(BL.serialize(B2).placed, BL.serialize(B).placed, 'deler er like etter import');
assert.deepEqual(BL.serialize(B2).links, BL.serialize(B).links, 'koblinger er like etter import');
assert.equal(BL.exportCode(B2), code, 'eksport etter import gir samme kode (runder)');
assert.ok(BL.undo(B2) && !B2.placed.length, 'import kan angres');
assert.equal(BL.exportCode(mk()) .length < 200, true, 'tomt bygg: kort kode');
// mange deler holder seg under grensen (60 deler, mange koblinger)
{ const ty = {}, ids = []; for (let i = 0; i < 60; i++) { ty['p' + i] = 'block'; ids.push('p' + i); } const BB = BL.createBuild({ ...site, w: 80, h: 40 }, ty, ids);
  ids.forEach((id, i) => BL.place(BB, id, -39 + i, 1 + (i % 7), 0)); for (let i = 0; i < 59; i++) BL.addLink(BB, 'rope', ids[i], ids[i + 1]);
  const big = BL.exportCode(BB); assert.ok(big === null || big.length <= BL.CODE_MAX, 'koden er aldri lengre enn grensen'); }

// ---------- 2. ugyldig kode avvises ----------
const why = (c, b = mk()) => { const x = BL.importCode(c, b); assert.equal(x.ok, false); return x.why; };
assert.equal(why(''), 'tom'); assert.equal(why(null), 'tom'); assert.equal(why('   \n'), 'tom'); assert.equal(why(42), 'tom');
assert.equal(why('hei på deg'), 'format'); assert.equal(why('TLM1.'), 'format'); assert.equal(why('TLM1.abc'), 'format'); assert.equal(why('TLM2.abc.def'), 'format');
assert.equal(why('x'.repeat(BL.CODE_MAX + 1)), 'lang');
assert.equal(why(code.slice(0, -1) + (code.endsWith('a') ? 'b' : 'a')), 'sum', 'ødelagt sjekksum');
assert.equal(why(code.replace(/\.[^.]+$/, '.zzzz')), 'sum');
assert.equal(why(code.slice(0, 20) + 'AAAA' + code.slice(24)), 'sum', 'endret innhold');
assert.ok(BL.importCode('  ' + code.slice(0, 30) + '\n' + code.slice(30) + ' \n', mk()).ok, 'mellomrom og linjeskift fra utklipp tåles');
// forfalskede, men «gyldig signerte» koder: samme format, ugyldig innhold
const b64 = (s) => Buffer.from(s).toString('base64url');
const fnv = (s) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); };
const forge = (j) => { const body = b64(typeof j === 'string' ? j : JSON.stringify(j)); return `TLM1.${body}.${fnv(body)}`; };
const sid = site.id, okPart = ['a', 0, 250, 0];
assert.ok(BL.importCode(forge([1, sid, [okPart], []]), mk()).ok, 'forgeringsmalen er gyldig');
assert.equal(why(forge('{ikke json')), 'format'); assert.equal(why(forge({ a: 1 })), 'format'); assert.equal(why(forge([2, sid, [], []])), 'format');
assert.equal(why(forge([1, 'annet_sted', [], []])), 'sted', 'kode fra et annet byggested');
assert.equal(why(forge([1, sid, [['ukjent', 0, 0, 0]], []])), 'del', 'ukjent del');
assert.equal(why(forge([1, sid, [['__proto__', 0, 0, 0]], []])), 'del', 'prototype-navn er ikke en del');
assert.equal(why(forge([1, sid, [['a', 0, 250, 0]], []]), mk(['b', 'c'])), 'mangler', 'del du ikke har plukket'); assert.equal(BL.importCode(forge([1, sid, [['a', 0, 250, 0], ['f', 0, 250, 0]], []]), mk(['b'])).missing, 2);
assert.equal(why(forge([1, sid, [okPart, okPart], []])), 'verdi', 'samme del to ganger');
assert.equal(why(forge([1, sid, [['a', 999999, 0, 0]], []])), 'verdi', 'utenfor stedet');
assert.equal(why(forge([1, sid, [['a', 0, -9000, 0]], []])), 'verdi'); assert.equal(why(forge([1, sid, [['a', 0, 250, 40000]], []])), 'verdi', 'vinkel utenfor');
assert.equal(why(forge([1, sid, [['a', 1.5, 250, 0]], []])), 'verdi', 'ikke heltall'); assert.equal(why(forge([1, sid, [['a', '0', 250, 0]], []])), 'verdi', 'tekst i stedet for tall');
assert.equal(why(forge([1, sid, [['a', null, 250, 0]], []])), 'verdi'); assert.equal(why(forge([1, sid, [['a', 0, 250]], []])), 'format');
assert.equal(why(forge([1, sid, [okPart, ['c', 1000, 1000, 0]], [['k1', 9, 'a', 0, 0, 'c', 0, 0]]])), 'verdi', 'ukjent koblingstype');
assert.equal(why(forge([1, sid, [okPart], [['k1', 0, 'a', 0, 0, 'zz', 0, 0]]])), 'verdi', 'kobling til del som ikke er med');
assert.equal(why(forge([1, sid, [okPart], [['k1', 0, 'a', 0, 0, 'a', 0, 0]]])), 'verdi', 'kobling til seg selv');
assert.equal(why(forge([1, sid, [okPart], [['k1<', 0, 'a', 0, 0, null, 0, 0]]])), 'format', 'ugyldig koblings-id');
assert.equal(why(forge([1, sid, [okPart], [['k1', 0, 'a', 0, 0, null, 0, 0], ['k1', 0, 'a', 0, 0, null, 0, 0]]])), 'verdi', 'samme koblings-id to ganger');
assert.equal(why(forge([1, sid, [okPart], [['k1', 0, 'a', 0, 0, null, 99999, 0]]])), 'verdi', 'festepunkt langt utenfor');
assert.equal(why(forge([1, sid, Array.from({ length: 61 }, (_, i) => ['x' + i, 0, 0, 0]), []])), 'verdi', 'for mange deler');
console.log('kode: ok');

// ---------- 3. replay er lik originalen ----------
const P = (id, type, u, v, rot = 0) => ({ id, type, u, v, rot });
const wide = { id: 'w', w: 13, h: 8, deck: [{ u0: -9.5, u1: -3.5 }, { u0: 3.5, u1: 9.5 }] };
const link = (id, kind, a, b, la, lb, g) => ({ id, kind, a, la, b: b || null, lb: lb || null, g: g || null });
const cases = [
  { name: 'bro som bærer', def: { site, placed: [P('a', 'plank_l', 0, 0)], links: [] }, load: 'figure' },
  { name: 'bro som brekker (vekt på lang planke)', def: { site: wide, placed: [P('a', 'plank_l', 0, 0), P('d', 'weight', 0, 1.1)], links: [] }, load: 'car' },
  { name: 'tape og tau, ball', def: { site, placed: [P('a', 'plank_l', 0, 0), P('c', 'block', -2, 1)], links: [link('k1', 'tape', 'a', 'c', { x: -3.5, y: 0 }, { x: 0, y: -0.7 }), link('k2', 'rope', 'a', 'c', { x: 0, y: 0 }, { x: 0, y: 0 })] }, load: 'ball' },
  { name: 'faller (ingen bro)', def: { site, placed: [], links: [] }, load: 'robot' },
];
const strip = (pose) => JSON.parse(JSON.stringify(pose, (k, v) => (k === 'pts' ? undefined : v)));
for (const c of cases) {
  const sim = BP.createSim(c.def, { load: c.load }), ref = BP.createSim(c.def, { load: c.load });
  const rc = RP.createRecorder(sim, { load: c.load }), evs = [], steps = [strip(ref.pose())];
  while (sim.state.state === 'run' && sim.t < 31) { sim.step(); const e = sim.drain(); evs.push(...e.map((x) => ({ i: rc.rec.frames.length, ...x }))); rc.frame(sim, e); }
  const rec = rc.finish(sim.state);
  assert.ok(rec.frames.length > 30 && rec.frames.length <= RP.MAX_FRAMES, `${c.name}: ${rec.frames.length} steg`);
  assert.equal(rec.result.state, sim.state.state); assert.equal(rec.frames.length - 1, rec.result.steps);
  // 1) hvert lagret steg er identisk med posen simuleringen hadde da
  const sim2 = BP.createSim(c.def, { load: c.load }), rp = RP.createReplay(rec); let n = 0, evOut = [];
  assert.deepEqual(strip(rp.pose()), strip(sim2.pose()), `${c.name}: steg 0`);
  while (!rp.done) { evOut.push(...rp.step()); sim2.step(); sim2.drain(); n++; assert.deepEqual(strip(rp.pose()), strip(sim2.pose()), `${c.name}: steg ${n} er lik originalen`); }
  assert.equal(n, rec.frames.length - 1); assert.deepEqual(evOut, evs, `${c.name}: hendelsene (brudd, seier, tap) er like og på samme steg`);
  assert.deepEqual(rp.step(), [], 'ingen steg etter slutten'); assert.ok(rp.done);
  // 2) avspilling kan gjentas og hoppes i
  rp.seek(0); assert.deepEqual(strip(rp.pose()), strip(RP.decodeFrame(rec.skel, rec.frames[0]))); rp.seek(10 ** 6); assert.equal(rp.i, rp.last); rp.seek(-5); assert.equal(rp.i, 0);
  assert.deepEqual(strip(RP.ghostPose(rec, 12)), strip(RP.decodeFrame(rec.skel, rec.frames[12]))); assert.equal(RP.ghostPose(rec, 99999).figure.u, RP.decodeFrame(rec.skel, rec.frames[rec.frames.length - 1]).figure.u, 'spøkelset står på siste steg etter slutten');
  // 3) bevis på determinisme: en helt ny simulering gir akkurat de samme tallene som opptaket
  const sim3 = BP.createSim(c.def, { load: c.load }); for (let i = 1; i < rec.frames.length; i++) { sim3.step(); sim3.drain(); assert.deepEqual(Array.from(RP.encodeFrame(sim3.pose())), Array.from(rec.frames[i]), `${c.name}: ny simulering = opptak, steg ${i}`); if (i > 400) break; }
  if (c.name.startsWith('bro som brekker')) assert.ok(evs.some((e) => e.type === 'break' || e.type === 'linkbreak'), 'brudd spilles av');
  if (c.name === 'bro som bærer') assert.ok(evs.some((e) => e.type === 'win'));
}
// opptaket stopper ved taket (aldri ubegrenset minne)
{ const sim = BP.createSim(cases[0].def), rc = RP.createRecorder(sim); for (let i = 0; i < RP.MAX_FRAMES + 50; i++) rc.frame(sim, []); assert.equal(rc.rec.frames.length, RP.MAX_FRAMES); assert.ok(rc.rec.truncated); }
assert.ok(RP.recSeconds({ frames: new Array(61) }) === 1);
// spøkelset tegnes med få vanlige canvas-kall
{ const rec = (() => { const s = BP.createSim(cases[1].def), rc = RP.createRecorder(s); for (let i = 0; i < 200; i++) { s.step(); rc.frame(s, s.drain()); } return rc.rec; })();
  let calls = 0, fills = 0; const g = new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => { calls++; if (k === 'fill' || k === 'stroke') fills++; }), set: (t, k, v) => ((t[k] = v), true) });
  drawGhost(g, RP.ghostPose(rec, 150), (u, v) => ({ x: u * 20, y: v * 20 }), 20); assert.ok(calls > 5 && calls < 150 && fills <= 12, `spøkelset: ${calls} kall, ${fills} fyll/streker`); }
console.log('replay: ok');

// ---------- 4. klientlaget mot Supabase (falsk fetch) ----------
let seen; const mkF = (status, data) => async (url, init) => { seen = { url, init, body: JSON.parse(init.body) }; return { ok: status < 300, status, json: async () => data, text: async () => '' }; };
const GOOD = 'tlm-7c3e8e5d';
assert.equal(NET.bridgeLevel('kontroll', 'bro'), 'kontroll:bro'); assert.ok(NET.bridgeLevel('x'.repeat(60), 'y').length <= 40);
assert.ok(NET.netReady({ enabled: true, code: GOOD, online: true }) && !NET.netReady({ enabled: false, code: GOOD }) && !NET.netReady({ enabled: true, code: '' }) && !NET.netReady({ enabled: true, code: 'ab' }) && !NET.netReady({ enabled: true, code: GOOD, online: false }), 'bare med på, gyldig kode og nett');
const sub = { code: ' Rune-7c3e ', level: 'kontroll:bro', version: '1.55', parts: 2, cost: 5, stars: 3, bcode: code };
let res = await NET.submitBridge(sub, { fetchFn: mkF(200, { ok: true, rank: 2, cost: 5, parts: 2 }) });
assert.deepEqual(res, { rank: 2, cost: 5, parts: 2 }); assert.ok(seen.url.endsWith('/rest/v1/rpc/tlm_submit_bridge') && seen.init.method === 'POST');
assert.deepEqual(seen.body, { c: 'rune-7c3e', lvl: 'kontroll:bro', ver: '1.55', n_parts: 2, n_cost: 5, n_stars: 3, bcode: code }, 'riktige feltnavn, kode i små bokstaver');
assert.equal(seen.init.headers.apikey, (await import('./feedback_send.js')).FEEDBACK.key); assert.ok(!/service_role/.test(JSON.stringify(seen.init.headers)));
assert.equal(await NET.submitBridge({ ...sub, stars: 9, cost: -4 }, { fetchFn: mkF(200, { ok: true, rank: 1, cost: 0, parts: 2 }) }).then(() => [seen.body.n_stars, seen.body.n_cost].join()), '3,0', 'tall saneres');
let called = 0; const cnt = async () => { called++; return { ok: true, status: 200, json: async () => ({ ok: true }) }; };
assert.equal(await NET.submitBridge({ ...sub, code: '' }, { fetchFn: cnt }), null); assert.equal(await NET.submitBridge({ ...sub, bcode: 'ikke en kode' }, { fetchFn: cnt }), null); assert.equal(await NET.submitBridge({ ...sub, bcode: 'TLM1.' + 'a'.repeat(7000) }, { fetchFn: cnt }), null); assert.equal(called, 0, 'ugyldig kode eller bygg: ingen nettkall');
assert.equal(await NET.submitBridge(sub, { fetchFn: mkF(200, { ok: false }) }), null, 'ukjent tester-kode: ingenting');
assert.equal(await NET.submitBridge(sub, { fetchFn: mkF(500, {}) }), null); assert.equal(await NET.submitBridge(sub, { fetchFn: async () => { throw new Error('offline'); } }), null, 'uten nett: null, ingen feil');
const row = (o = {}) => ({ rank: 1, parts: 2, cost: 5, stars: 3, code, is_me: false, ...o });
let best = await NET.bestBridges(' Rune-7c3e', 'kontroll:bro', { fetchFn: mkF(200, { ok: true, bridges: [row(), row({ rank: 2, is_me: true, cost: 6, tester_code: 'hemmelig', name: 'Ola' }), row({ rank: 3, code: 'ondskap<script>' }), row({ rank: 0 }), row({ rank: 4, stars: 77, cost: -1 })] }) });
assert.ok(seen.url.endsWith('/rest/v1/rpc/tlm_best_bridges')); assert.deepEqual(seen.body, { c: 'rune-7c3e', lvl: 'kontroll:bro' });
assert.deepEqual(best.map((b) => b.rank), [1, 2, 4], 'rader med ugyldig kode eller rang filtreres bort');
assert.deepEqual(Object.keys(best[1]).sort(), ['code', 'cost', 'me', 'parts', 'rank', 'stars'], 'bare anonyme felt (ingen navn eller koder)'); assert.equal(best[2].stars, 3); assert.equal(best[2].cost, 0);
assert.deepEqual(NET.standing(best), { rank: 2, of: 3 }, '«Du er nr 2 av 3»'); assert.deepEqual(NET.standing(Array.from({ length: 10 }, (_, i) => ({ rank: i + 1, me: i === 6 }))), { rank: 7, of: null }, 'topp 10: ingen «av»'); assert.equal(NET.standing([row({ me: false })].map((b) => ({ ...b }))), null, 'ikke med på lista');
assert.equal(await NET.bestBridges(GOOD, 'l', { fetchFn: mkF(200, { ok: false }) }), null); assert.equal(await NET.bestBridges('', 'l', { fetchFn: cnt }), null); assert.equal(await NET.bestBridges(GOOD, 'l', { fetchFn: async () => { throw new Error('x'); } }), null, 'uten nett: null');
assert.equal((await NET.bestBridges(GOOD, 'l', { fetchFn: mkF(200, { ok: true, bridges: [] }) })).length, 0); assert.equal((await NET.bestBridges(GOOD, 'l', { fetchFn: mkF(200, { ok: true, bridges: Array.from({ length: 30 }, (_, i) => row({ rank: i + 1 })) }) })).length, 10, 'maks 10');
assert.equal(await NET.bestBridges(GOOD, 'l', { fetchFn: mkF(200, { ok: true, bridges: 'tekst' }) }), null);
console.log('beste bygg (klient): ok');

// ---------- 5. modulene er med i index.html, og tekstene nevner knapper ----------
const html = fs.readFileSync('index.html', 'utf8'); for (const f of ['build_replay', 'build_replay_view', 'build_net']) assert.ok(html.includes(`'${f}'`), `${f} i files`);
const { DICT_KEYS } = await import('./i18n.js'); for (const l of ['nb', 'en']) for (const k of ['replay', 'copy', 'paste', 'best', 'use', 'close', 'try', 'none', 'copied', 'show', 'long', 'pasteTitle', 'imported', 'err.tom', 'err.lang', 'err.format', 'err.sum', 'err.sted', 'err.del', 'err.mangler', 'err.verdi', 'bestTitle', 'loading', 'empty', 'offline', 'row', 'me', 'standing', 'standingTop', 'rank']) assert.ok(DICT_KEYS[l].includes('build.share.' + k), `${l}: build.share.${k}`);
assert.ok(DICT_KEYS.nb.includes('build.hintReplay'));
const src = fs.readFileSync('i18n.js', 'utf8').split('\n').filter((l) => /build\.share\.|build\.hintReplay/.test(l)).join('\n'); assert.ok(!/ taster?\b|Trykk [A-Z]\b(?!\w)/.test(src.replace(/Trykk og hold/g, '')), 'tekstene nevner knapper, ikke taster');
console.log('deling: ok');
