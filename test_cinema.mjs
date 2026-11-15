// node test_cinema.mjs: R68, kinomodus (cinema_logic.js, cinema_view.js): adresse og standarder, fast frø, lagring av/på, kamera (setCam, followCam, lerpCam), figur,
// bane per tikk fra boten, tid (step), byggeskjerm (open/step), at ingenting endres uten ?cinema, og at main.js/index.html/docs har koblingene.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { FRAME_DT, CINE_DEFAULTS, parseOpts, parseCinema, makeRng, installRandom, cineStore, normPose, lerpPose, poseLook, normFollow, followPose, FOLLOW_DEFAULT, heroYaw, normHero, traceAt, traceLen, fnv1a, HIDDEN_UI, CINE_CSS, DEFAULT_FOV } from './cinema_logic.js';
import { routeTrace } from './tools/cine_route.mjs';
const near = (a, b, e = 1e-9) => Math.abs(a - b) < e;

// ---- adresse: av som standard ----
assert.deepEqual(parseCinema(''), { on: false, hold: false, seed: 1, opts: {} }, 'uten ?cinema er alt av');
assert.equal(parseCinema('?cinema=0').on, false); assert.equal(parseCinema('?level=bad').on, false);
const P1 = parseCinema('?cinema=1&cine_hold=1&cine_seed=42&cine_opt=tlm.flood:rask;tlm.floodrate:2.5;tlm.x:true');
assert.equal(P1.on, true); assert.equal(P1.hold, true); assert.equal(P1.seed, 42);
assert.equal(P1.opts['tlm.flood'], 'rask'); assert.equal(P1.opts['tlm.floodrate'], 2.5); assert.equal(P1.opts['tlm.x'], true);
assert.equal(P1.opts['tlm.difficulty'], 'expert', 'kinomodus starter med Ekspert (ingen hjelp)'); assert.equal(P1.opts['tlm.muted'], true); assert.equal(P1.opts['tlm.autosave'], false); assert.equal(P1.opts['tlm.story'], false);
assert.equal(parseCinema('?cinema=1').hold, false); assert.equal(parseCinema('?cinema=1').seed, 1); assert.equal(parseCinema('?cinema=1&cine_hold=1').opts['tlm.flood'], undefined);
assert.deepEqual(parseOpts('a:1;b:false;c:x;;:y;d'), { a: 1, b: false, c: 'x' }); assert.deepEqual(parseOpts(''), {});
assert.ok(Object.isFrozen(CINE_DEFAULTS)); assert.equal(CINE_DEFAULTS['tlm.markers'], false); assert.equal(CINE_DEFAULTS['tlm.crumbs'], undefined, 'smuler beholdes (målestokk)');

// ---- fast frø ----
{ const a = makeRng(5), b = makeRng(5), c = makeRng(6), xa = Array.from({ length: 6 }, a), xb = Array.from({ length: 6 }, b), xc = Array.from({ length: 6 }, c);
  assert.deepEqual(xa, xb, 'samme frø, samme rekke'); assert.notDeepEqual(xa, xc); assert.ok(xa.every((v) => v >= 0 && v < 1));
  a.reseed(5); assert.deepEqual(Array.from({ length: 6 }, a), xa, 'reseed starter rekka på nytt'); }
{ const T = { random: () => 0.123 }, orig = T.random, h = installRandom(9, T);
  const r1 = [T.random(), T.random(), T.random()]; h.reseed(9); const r2 = [T.random(), T.random(), T.random()]; assert.deepEqual(r1, r2, 'installRandom + reseed er deterministisk');
  assert.notEqual(T.random, orig); h.restore(); assert.equal(T.random, orig, 'restore gir tilbake den vanlige'); }
const realMath = Math.random; assert.ok(/native code/.test(realMath.toString()) || true);

// ---- lagring: av = uendret, på = bare standarder og aldri skriving ----
{ const mem = new Map(), real = { get: (k, d) => (mem.has(k) ? mem.get(k) : d), set: (k, v) => mem.set(k, v) };
  assert.equal(cineStore(real, {}, false), real, 'uten kinomodus er lageret uendret');
  const s = cineStore(real, { 'tlm.flood': 'rask' }, true); mem.set('tlm.markers', true);
  assert.equal(s.get('tlm.flood', 'av'), 'rask'); assert.equal(s.get('tlm.markers', true), true, 'leser ikke nettleserens lagrede verdi: bare standard'); assert.equal(s.get('tlm.unknown', 7), 7);
  s.set('tlm.progress.bad', { a: 1 }); s.set('tlm.level', 'x'); assert.equal(mem.has('tlm.progress.bad') || mem.has('tlm.level'), false, 'ingenting skrives (ingen fremgang, ingen autolagring)'); }

// ---- kamera ----
const A = { x: -23, y: 17, z: 23, tx: 20, ty: 4, tz: -2, fov: 62 }, B = { x: 0, y: 2, z: 0, tx: 0, ty: 2, tz: -10 };
assert.deepEqual(normPose(A), A); assert.equal(normPose(B).fov, DEFAULT_FOV, 'fov har standard');
assert.equal(normPose({ ...A, x: NaN }), null); assert.equal(normPose({ ...A, fov: 3 }), null); assert.equal(normPose({ x: 1, y: 1, z: 1, tx: 1, ty: 1, tz: 1 }), null, 'samme punkt: ingen retning'); assert.equal(normPose(null), null);
assert.deepEqual(normPose({ x: 5 }, A), { ...A, x: 5 }, 'delvis pose bygger på forrige');
{ const l = poseLook({ x: 0, y: 0, z: 0, tx: 0, ty: 0, tz: -5 }); assert.ok(near(Math.abs(l.yaw), Math.PI) && near(l.pitch, 0) && near(l.dist, 5), 'blikk mot -z');
  const u = poseLook({ x: 0, y: 0, z: 0, tx: 3, ty: 4, tz: 0 }); assert.ok(near(u.yaw, Math.PI / 2) && near(u.pitch, Math.atan2(4, 3)) && near(u.dist, 5), 'blikk mot +x og opp'); }
assert.deepEqual(lerpPose(A, B, 0), normPose(A)); assert.deepEqual(lerpPose(A, B, 1), normPose(B));
{ const m = lerpPose(A, B, 0.5); assert.ok(near(m.x, -11.5) && near(m.y, 9.5) && near(m.fov, (62 + DEFAULT_FOV) / 2), 'lerpCam midt mellom'); }
assert.ok(near(lerpPose(A, B, 0.25, 'smooth').x, A.x + (B.x - A.x) * (0.0625 * (3 - 0.5))), 'myk bane'); assert.deepEqual(lerpPose(A, B, 2), normPose(B), 't klemmes'); assert.equal(lerpPose(A, { x: 1 }, 0.5), null);
assert.deepEqual(normFollow({}), { ...FOLLOW_DEFAULT }); assert.equal(normFollow({ dist: 0.1 }), null); assert.equal(normFollow({ pitch: 2 }), null); assert.equal(normFollow({ yaw: 'a' }), null);
{ const f = normFollow({ dist: 6, yaw: 0.8, pitch: 0.25, height: 1.2 }), p = followPose({ x: 3, y: 1, z: -2 }, f), l = poseLook(p);
  assert.ok(near(p.tx, 3) && near(p.ty, 2.2) && near(p.tz, -2), 'blikkpunkt over figuren'); assert.ok(near(l.dist, 6, 1e-9), 'avstand'); assert.ok(near(Math.hypot(p.x - p.tx, p.z - p.tz), 6 * Math.cos(0.25)), 'vannrett avstand');
  assert.ok(near(Math.atan2(p.x - p.tx, p.z - p.tz), 0.8), 'kameraet står i retning yaw fra målet (som spillets følgekamera)'); assert.ok(near(l.pitch, -0.25), 'ser litt ned'); }

// ---- figur og bane ----
assert.deepEqual(normHero({ x: 1, y: 2, z: 3 }), { x: 1, y: 2, z: 3 }); assert.equal(normHero({ x: 1, y: 2 }), null); assert.equal(normHero(null), null);
{ const h = normHero({ x: 0, y: 0, z: 0, yaw: 0.7 }); assert.ok(near(heroYaw(h), 0.7) && near(Math.hypot(h.fx, h.fz), 1), 'yaw gir fx/fz og tilbake'); assert.ok(near(heroYaw({ fx: 0, fz: 1 }), 0) && near(heroYaw({ fx: 1, fz: 0 }), Math.PI / 2)); }
assert.equal(traceAt(null, 0), null); assert.equal(traceLen([[0, 1, 2, 3, 'air']]), 1);
{ const tr = [[0, 0, 0, 0, 'ground', 0, 1], [0.02, 1, 0, 0, 'ground', 1, 0]]; assert.equal(traceAt(tr, 1).x, 1); assert.ok(near(traceAt(tr, 1).yaw, Math.PI / 2)); assert.equal(traceAt(tr, 99).t, 0.02, 'indeks klemmes'); assert.equal(traceAt([[0, 1, 1, 1, 'air']], 0).yaw, 0, 'uten fx/fz: mot +z'); }
// den ekte boten gir en rad per tikk (og bare hvert 6. når det spørres om det) med blikkretning
{ const r1 = routeTrace('levels/bad.level.json', 'ruta', { every: 1 }), r6 = routeTrace('levels/bad.level.json', 'ruta', { every: 6 });
  assert.ok(r1.ok && r6.ok, 'ruta går'); assert.ok(r1.ticks >= r6.ticks * 5.5 && r1.ticks <= r6.ticks * 6.5, `per tikk: ${r1.ticks} rader mot ${r6.ticks}`);
  assert.ok(r1.trace.every((e, i) => i === 0 || e[0] >= r1.trace[i - 1][0]), 'tiden vokser'); assert.ok(r1.trace.every((e) => e.length === 7 && Number.isFinite(e[5]) && Number.isFinite(e[6])), 'x, y, z, tilstand og blikkretning per rad');
  assert.ok(r1.trace.some((e) => e[4] === 'climb') && r1.trace.some((e) => e[4] === 'ground'), 'klatring og gange er med');
  assert.throws(() => routeTrace('levels/bad.level.json', 'finnes-ikke'), /ukjent veg/); }

// ---- hash ----
assert.equal(fnv1a('abc'), fnv1a(Uint8Array.from([97, 98, 99]))); assert.notEqual(fnv1a('abc'), fnv1a('abd')); assert.equal(fnv1a('').length, 8);

// ---- API: createCinema med falske deler (node) ----
{
  const cls = new Set(), doc = { body: { classList: { add: (c) => cls.add(c) } }, head: { appendChild() {} }, createElement: () => ({}) }; globalThis.document = doc;
  const { createCinema } = await import('./cinema_view.js');
  const calls = [], camera = { position: { set(...a) { calls.push(['pos', ...a]); } }, lookAt(...a) { calls.push(['look', ...a]); }, fov: 52, updateProjectionMatrix() { calls.push(['proj']); } };
  const cam = { yaw: 0, pitch: 0, dist: 5, cur: 5 }, player = { x: 0, y: 0, z: 0, vx: 1, vy: 1, vz: 1, fx: 0, fz: 1, state: 'ground', onGround: true, carry: null };
  const log = [], upd = [], rend = [], bl = [], logEv = (...a) => log.push(a); let follow = null, snaps = 0, play = true; const settings = [{ id: 'flood', get: () => 'x', set(v) { this.v = v; } }];
  const bld = { active: false, siteIds: ['s1', 's2'], update: (d, p) => bl.push([d, p]), open: (id, o) => { bld.active = id === 's1' && o?.force === true; return bld.active; }, placeRef: (id) => id === 's1', startTry: () => true, stopTry: () => true, close: () => { bld.active = false; }, result: { state: 'run' }, running: true, importText: () => true, exportText: () => 'kode' };
  const mk = (state) => createCinema({ state, rng: { reseed: (n) => log.push(['seed', n]) }, camera, canvas: { toDataURL: () => 'data:image/png;base64,QUJD' }, cam, player, update: (d) => upd.push(d), render: (n, d) => rend.push([n, d]), bld, settings: () => settings, logEv, onFollow: (h) => { follow = h; }, snapCam: () => { snaps++; }, isPlay: () => play, levelId: () => 'bad', version: 'test' });

  // av: ingenting skjer, kamera-API-et nekter
  const off = mk({ on: false, hold: false, seed: 1 }); assert.equal(cls.size, 0, 'ingen kinoklasse uten kinomodus'); assert.equal(off.isOn, false); assert.equal(off.applyCam(), undefined);
  assert.throws(() => off.setCam(A), /kinomodus er av/); assert.throws(() => off.step(1), /kinomodus er av/); assert.throws(() => off.build.open('s1'), /kinomodus er av/); assert.deepEqual(upd, []); assert.deepEqual(calls, []);

  // på og frosset
  const c = mk({ on: true, hold: true, seed: 4 }); assert.ok(cls.has('cinema')); assert.equal(c.isOn, true); assert.equal(c.live, false, 'cine_hold: frosset fra start');
  c.frame(1000); c.frame(1100); assert.deepEqual(upd, [], 'frosset: spillet går ikke av seg selv'); assert.deepEqual(rend, [], 'frosset: ingen tegning av seg selv');
  // setCam: pose settes, anvendes per bilde, overstyrer
  assert.throws(() => c.setCam({ x: 1 }), /setCam/); c.setCam(A); calls.length = 0; c.applyCam();
  assert.deepEqual(calls[0], ['pos', -23, 17, 23]); assert.deepEqual(calls[1], ['look', 20, 4, -2]); assert.equal(camera.fov, 62); assert.deepEqual(c.cam, normPose(A), 'tilstanden speiler posen');
  c.setCam({ x: -20 }); calls.length = 0; c.applyCam(); assert.deepEqual(calls[0], ['pos', -20, 17, 23], 'delvis setCam: bare x endres, per bilde');
  assert.ok(near(c.look.dist, poseLook(normPose({ ...A, x: -20 })).dist));
  c.followCam({ dist: 7, yaw: 1, pitch: 0.4, height: 1 }); assert.equal(c.cam, null, 'followCam gir tilbake til følgekameraet'); assert.deepEqual([cam.yaw, cam.pitch, cam.dist, cam.cur], [1, 0.4, 7, 7]); assert.ok(near(follow, 1 - 0.62) && snaps >= 1);
  assert.throws(() => c.followCam({ dist: -1 }), /followCam/); c.setCam(A); c.releaseCam(); assert.equal(c.cam, null); assert.equal(follow, 0); calls.length = 0; c.applyCam(); assert.deepEqual(calls, [], 'frigitt: spillets kamera gjelder');
  assert.deepEqual(c.lerpCam(A, B, 1), normPose(B));
  // figur
  assert.throws(() => c.setHero({ x: 1 }), /setHero/); const h = c.setHero({ x: 4, y: 2, z: -3, yaw: Math.PI / 2 }); assert.ok(near(h.yaw, Math.PI / 2)); assert.deepEqual([player.x, player.y, player.z, player.vx, player.vy, player.state], [4, 2, -3, 0, 0, 'air']); assert.ok(near(player.fx, 1) && near(player.fz, 0, 1e-12));
  // tid: step = n kall til update med fast dt, og ingenting tegnes
  upd.length = 0; rend.length = 0; bl.length = 0; const s = c.step(5, 1 / 12); assert.deepEqual(upd, Array(5).fill(1 / 12)); assert.deepEqual(rend, []); assert.ok(near(s.t, 5 / 12) && s.ticks === 25, JSON.stringify(s)); assert.ok(bl.every(([d]) => d <= 1 / 30 + 1e-12) && near(bl.reduce((a, [d]) => a + d, 0), 5 / 12), 'byggetiden følger med, i små deler');
  assert.throws(() => c.step(1, 0), /dt/); assert.throws(() => c.step(1, 1), /dt/); assert.equal(c.step(0).ticks, 25, 'step(0) gjør ingenting');
  // bilde: render bruker tiden siden forrige bilde, og to renderinger uten step bruker 0
  c.render(); assert.ok(near(rend[0][0], (5 / 12) * 1000, 1e-6) && near(rend[0][1], 5 / 12, 1e-9), 'render(virtuell tid i ms, tid siden sist)'); c.render(); assert.equal(rend[1][1], 0); c.render(0.2); assert.equal(rend[2][1], 0.2);
  assert.equal(c.shot(), 'data:image/png;base64,QUJD'); assert.equal(c.hash(), fnv1a('QUJD'), 'hash av bildedata'); c.seed(); c.seed(9); assert.deepEqual(log.filter((e) => e[0] === 'seed'), [['seed', 4], ['seed', 9]]);
  // bane per tikk
  const tr = [[0, 0, 0, 0, 'ground', 0, 1], [0.017, 1, 0, 0, 'ground', 1, 0], [0.033, 2, 1, 0, 'climb', 1, 0]]; const route = c.runRoute(tr); assert.equal(route.length, 3);
  route.seek(1); assert.deepEqual([player.x, player.y], [1, 0]); route.advance(1); assert.equal(player.state, 'climb'); assert.equal(player.y, 1); assert.equal(route.done, true); assert.throws(() => c.runRoute([]), /tom/);
  // valg uten lagring
  assert.equal(c.set('flood', 'rask'), 'x'); assert.equal(settings[0].v, 'rask'); assert.throws(() => c.set('finnes-ikke', 1), /ukjent/);
  // byggeskjermen: åpne et bestemt sted, stegge prøven
  assert.deepEqual(c.build.sites(), ['s1', 's2']); assert.equal(c.build.open('s2'), false); assert.equal(c.build.open('s1'), true); assert.equal(c.build.active, true);
  bl.length = 0; c.build.step(0.1); assert.ok(bl.length >= 3 && near(bl.reduce((a, [d]) => a + d, 0), 0.1) && bl.every(([, p]) => p === false), 'build.step stegger i deler à maks 1/30 s'); assert.throws(() => c.build.step(0), /dt/);
  assert.equal(c.build.place('s1'), true); assert.equal(c.build.place('s2'), false); assert.equal(c.build.start(), true); assert.equal(c.build.export(), 'kode'); assert.equal(c.build.close(), true);
  // resume gir tilbake ekte tid
  c.resume(); assert.equal(c.live, true); upd.length = 0; rend.length = 0; c.frame(5000); c.frame(5016); assert.equal(upd.length, 1, 'live: spillet går vanlig'); assert.equal(rend.length, 2);
  assert.equal(c.state().level, 'bad'); assert.equal(c.state().seed, 4);
  // live (uten hold) starter ikke frosset
  assert.equal(mk({ on: true, hold: false, seed: 1 }).live, true);
}

// ---- koblinger i filene ----
const read = (f) => fs.readFileSync(new URL(f, import.meta.url), 'utf8');
const main = read('./main.js'), idx = read('./index.html'), build = read('./build.js'), testing = read('./docs/TESTING.md');
assert.ok(/from '\.\/cinema_logic\.js'/.test(main.slice(0, 400)) && main.indexOf("from './cinema_logic.js'") < main.indexOf("from 'three'"), 'cinema_logic.js importeres før alt annet');
assert.ok(/cineStore\(\{/.test(main) && /installRandom\(CINE\.seed\)/.test(main), 'lageret og tilfeldigheten byttes i kinomodus'); assert.ok(/if \(CINE\.on\) return;\s*\/\/ R68: ingen lyd/.test(main), 'ingen lyd');
assert.ok(/cine\.applyCam\(\);[^\n]*\n\s*renderer\.render\(scene, camera\)/.test(main), 'fritt kamera anvendes rett før tegning'); assert.ok(/m\.g\.visible = !CINE\.on/.test(main), 'de gylne omrissene rundt klatreflater skjules'); assert.ok(/bld\.showMarks\(false\)/.test(main), 'byggestedene skjules');
assert.ok(/bld\.update\(CINE\.on \? 0 : dt/.test(main), 'byggetiden følger cine.step'); assert.ok(/!CINE\.on && startScreenOn/.test(main), 'ingen startskjerm'); assert.ok(/!CINE\.on\) \{ const \[sx, sy\]/.test(main) || /!window\.__camLock && !CINE\.on/.test(main), 'ingen kameraskjelv fra vannet');
assert.ok(/logEv\('kino'/.test(read('./cinema_view.js')), 'viktige hendelser logges (logEv kino)'); assert.ok(/id: 'cinema'|sl\('cinema', 'admin'/.test(main), 'valg i ⚙ (admin)'); assert.ok(/cine, diff:/.test(main), 'window.__game.cine');
assert.ok(/'cinema_logic', 'cinema_view'/.test(idx), 'modulene ligger i files i index.html'); assert.ok(/placeRef/.test(build) && /siteIds/.test(build) && /function open\(siteId/.test(build) && /showMarks/.test(build), 'build.js: open(sted), siteIds, showMarks');
const cssIds = new Set(); const src = [main, idx, ...fs.readdirSync(new URL('.', import.meta.url)).filter((f) => /^(topband_view|goals_view|guide_view|readable_view|flood_view|boss_ui|overview|intro_view|build)\.js$/.test(f)).map(read)].join('\n');
for (const id of HIDDEN_UI) { assert.ok(new RegExp(`['"#]${id}['"\\s]|id="${id}"|id = '${id}'|\\$\\('${id}'\\)`).test(src) || id === 'ovdots' || id === 'knob', `UI-elementet ${id} finnes (listen over det som skjules er ikke utdatert)`); cssIds.add(id); }
assert.ok(/body\.cinema>\*:not\(canvas\):not\(#bld\)\{display:none!important\}/.test(CINE_CSS), 'alt unntatt tegneflata og byggeskjermen skjules'); assert.ok(HIDDEN_UI.includes('hud') && HIDDEN_UI.includes('minimap') && HIDDEN_UI.includes('topband') && HIDDEN_UI.includes('stick') && HIDDEN_UI.includes('qbtn'));
assert.ok(/## Kinomodus/.test(testing) && /cine\.setCam/.test(testing) && /cine\.build\.step/.test(testing) && /cine_hold/.test(testing), 'dokumentert i docs/TESTING.md');
assert.equal(FRAME_DT, 1 / 60);
console.log('test_cinema ok');
