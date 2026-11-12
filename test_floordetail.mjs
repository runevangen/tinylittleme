// node test_floordetail.mjs: gulvdetaljer (R13): tetthet etter rom og kvalitet, målestokk-ring ved start, ingenting inni møbler, fuger på rutenettet
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { detailCount, pickDetails, hashStr, floorKind, TILE, KINDS, BEAD, beadBoxes, beadRadius, routeClear, START_YAW, START_CAM, isMat, toScreen, floorAt } from './floordetail_logic.js';

const fy = (L) => Math.max(0, ...L.boxes.filter((b) => b.type === 'floor').map((b) => b.max[1]));
const names = ['bad', 'barnerom', 'kjokken', 'bad2', 'barnerom2', 'kjokken2', 'leke'];
for (const id of names) {
  const L = JSON.parse(fs.readFileSync(`levels/${id}.level.json`, 'utf8')), room = L.room, y = fy(L);
  const hi = detailCount(room, 'high'), mid = detailCount(room, 'mid'), low = detailCount(room, 'low');
  assert.ok(hi >= 30 && hi <= 140, `${id}: tetthet høy (${hi})`);
  assert.ok(mid < hi && mid >= Math.floor(hi / 2) - 1 && low === 0, `${id}: halvert på mid, ingen på low`);
  assert.ok(detailCount(room, 'high', 1.6) > hi && detailCount(room, 'high', 0.5) < hi, `${id}: tetthetsvalg`);
  const sp = pickDetails(L, y, hashStr(id + ':fd'), { count: hi, ring: 6 });
  assert.deepEqual(sp, pickDetails(L, y, hashStr(id + ':fd'), { count: hi, ring: 6 }), `${id}: samme plassering hver gang`);
  assert.ok(sp.length >= hi * 0.9, `${id}: fant steder (${sp.length}/${hi + 5})`);
  const blocks = L.boxes.filter((b) => b.type !== 'floor' && b.type !== 'wall' && !b.dyn && !b.carried && !isMat(b));
  for (const s of sp) {
    assert.ok(KINDS.includes(s.kind), `${id}: kjent slag ${s.kind}`);
    assert.ok(s.x > room.x0 && s.x < room.x1 && s.z > room.z0 && s.z < room.z1, `${id}: i rommet`);
    for (const b of blocks) if (b.min[1] < y + 5 && b.max[1] > y) assert.ok(!(s.x > b.min[0] && s.x < b.max[0] && s.z > b.min[2] && s.z < b.max[2]), `${id}: ${s.kind} inni «${b.id}»`);
    for (const b of L.boxes.filter(isMat)) if (s.x > b.min[0] && s.x < b.max[0] && s.z > b.min[2] && s.z < b.max[2]) assert.ok(s.y >= b.max[1] - 0.01, `${id}: ${s.kind} gjemt under «${b.id}»`);
    assert.ok(Math.hypot(s.x - L.start[0], s.z - L.start[2]) >= 1.5, `${id}: ikke under føttene ved start`);
    if (s.kind === 'grout') { assert.equal(floorKind(room), 'tile'); assert.ok(!room.floor.diagonal, 'ingen fugeskitt på diagonale fliser'); const k = s.rot === 0 ? (s.z - room.z0) / TILE : (s.x - room.x0) / TILE; assert.ok(Math.abs(k - Math.round(k)) < 1e-6, `${id}: skitt ligger i fuge`); }
  }
  // målestokk-ringen: minst 3 gjenkjennelige ting 4-13 enheter fra start i kameraets blikkretning
  const ringed = sp.filter((s) => s.ring), base = Math.atan2(-Math.cos(START_YAW), -Math.sin(START_YAW));
  assert.ok(ringed.length >= 5, `${id}: ring (${ringed.length})`);
  const near = sp.filter((s) => { const d = Math.hypot(s.x - L.start[0], s.z - L.start[2]); return s.kind !== 'stain' && s.kind !== 'grout' && d >= 1.0 && d <= 13.5; });
  assert.ok(near.length >= 3, `${id}: minst tre ting for målestokk ved start (${near.length})`);
  // synsfelt ved start: projiser med start-kameraet (pitch 0.3, fov 52, mobil høyformat); minst 3 ulike gjenkjennelige slag innenfor bildet, i ulike avstander fra kamera-kanten
  for (const dist of [5.0, 5.2, 5.5]) {
    const cam = { ...START_CAM, dist }, vis = sp.filter((s) => { if (s.kind === 'stain' || s.kind === 'grout') return false; const p = toScreen(L.start[0], L.start[1] + 0.62, L.start[2], START_YAW, cam, s.x, s.y, s.z); return p && p[0] > 0.04 && p[0] < 0.96 && p[1] > 0.38 && p[1] < 0.92; });
    assert.ok(vis.length >= 3, `${id}: minst tre ting i synsfeltet ved start (avstand ${dist}): ${vis.length}`);
    assert.ok(new Set(vis.map((s) => s.kind)).size >= 2, `${id}: ulike slag i synsfeltet`);
    if (id.startsWith('barnerom')) { const low = vis.filter((s) => toScreen(L.start[0], L.start[1] + 0.62, L.start[2], START_YAW, cam, s.x, s.y, s.z)[1] > 0.6); assert.ok(low.length >= 1, `${id}: noe i nedre halvdel (${dist})`); }
  }
  { const q = floorAt(L.start[0], L.start[1] + 0.62, L.start[2], START_YAW, START_CAM, 0.5, 0.6, L.start[1]), b = toScreen(L.start[0], L.start[1] + 0.62, L.start[2], START_YAW, START_CAM, q[0], L.start[1], q[1]); assert.ok(Math.abs(b[0] - 0.5) < 1e-6 && Math.abs(b[1] - 0.6) < 1e-6, 'floorAt og toScreen er hverandres inverse'); }
  const kinds = new Set(sp.map((s) => s.kind)); assert.ok(kinds.size >= 4, `${id}: variasjon (${[...kinds]})`);
}
// rommene skal ha ulik karakter: trebrettet har blyanter og viskelær, flisene fugeskitt
const kinds = (id) => { const L = JSON.parse(fs.readFileSync(`levels/${id}.level.json`, 'utf8')); return pickDetails(L, fy(L), hashStr(id + ':fd'), { count: 80, ring: 6 }).map((s) => s.kind); };
assert.ok(kinds('barnerom').filter((k) => k === 'pencil').length > kinds('kjokken').filter((k) => k === 'pencil').length, 'blyanter mest i barnerommet');
assert.ok(kinds('kjokken').includes('grout') && !kinds('barnerom').includes('grout'), 'fugeskitt bare på flis');
// R37: perlene er solide kuler som aldri står på ruta
import { P, newPlayer, step, applyPreset, initBodies } from './physics.js';
import { walkRoute } from './tools/walk_route.mjs';
const idle = { mx: 0, mz: 0, jumpPressed: false, jumpHeld: false, grabPressed: false, grabHeld: false };
let nBeads = 0;
for (const f of fs.readdirSync('levels').filter((x) => x.endsWith('.level.json')).sort()) {
  const id = f.replace('.level.json', ''), file = `levels/${f}`, L = JSON.parse(fs.readFileSync(file, 'utf8')); if (!L.room) continue;
  for (const dens of [0.5, 1, 1.6]) {
    const sp = pickDetails(L, fy(L), hashStr(id + ':fd'), { count: detailCount(L.room, 'high', dens), ring: 6 }), bb = beadBoxes(sp), keep = routeClear(L); nBeads += bb.length;
    assert.equal(bb.length, sp.filter((s) => s.kind === 'bead').length, `${id}: en boks per perle`);
    for (const [i, b] of bb.entries()) {
      const r = (b.max[0] - b.min[0]) / 2; assert.ok(b.round && b.bead && !b.dyn && r >= 0.15 && r <= 0.5, `${id}: liten statisk kule (r=${r})`);
      const cx = (b.min[0] + b.max[0]) / 2, cz = (b.min[2] + b.max[2]) / 2;
      assert.ok(!keep.some((q) => cx > q[0] && cx < q[1] && cz > q[2] && cz < q[3]), `${id}: ${b.id} står nær en flate på ruta`);
      assert.ok(Math.hypot(cx - L.start[0], cz - L.start[2]) >= 1.5 && Math.hypot(cx - L.goal[0], cz - L.goal[2]) >= 6, `${id}: ikke ved start/mål`);
      assert.ok(Math.abs(b.min[1] - fy(L)) < 0.4 || sp.filter((s) => s.kind === 'bead')[i].onMat, `${id}: perla ligger på gulvet`);
      for (const c of bb.slice(i + 1)) assert.ok(Math.hypot(cx - (c.min[0] + c.max[0]) / 2, cz - (c.min[2] + c.max[2]) / 2) >= BEAD.gap - 1e-6, `${id}: perler for tett`);
    }
    // den ekte fysikken: gå rett på en perle (ingen sikte-hjelp) og bli stoppet/gli av, mens uten perle går figuren rett gjennom punktet
    if (dens === 1 && bb[0]) {
      const b = bb[0], cx = (b.min[0] + b.max[0]) / 2, cz = (b.min[2] + b.max[2]) / 2;
      const run = (withBead) => {
        applyPreset('mario'); Object.assign(P, { edgeGuard: false, autoJump: false, airSteady: false, magnet: false, holdGrab: false });
        const W = { boxes: [{ id: 'gulv', type: 'floor', min: [-50, -5, -50], max: [50, 0, 50] }], movables: [], deathY: -50, start: [0, 0, 0] }; initBodies(W);
        const bx = JSON.parse(JSON.stringify(b)), r = (b.max[0] - b.min[0]) / 2; bx.min = [3 - r, 0, -r]; bx.max = [3 + r, 2 * r, r]; if (withBead) W.boxes.push(bx);
        const p = newPlayer(0, 0, 0); let maxY = 0, minX = 99;
        for (let i = 0; i < 20; i++) step(p, { ...idle }, 1 / 60, W);
        for (let i = 0; i < 240; i++) { step(p, { ...idle, mx: 1 }, 1 / 60, W); maxY = Math.max(maxY, p.y); }
        return { x: p.x, z: p.z, maxY };
      };
      const free = run(false), hit = run(true);
      assert.ok(free.x > 5, 'fri gange går forbi'); if (process.env.V) console.log(id, free, hit);
      assert.ok(hit.x < free.x - 0.5 || hit.maxY > 0.05 || Math.abs(hit.z) > 0.05, `${id}: perla stopper/løfter/skyver figuren sidelengs (x ${hit.x.toFixed(2)} mot ${free.x.toFixed(2)}, z ${hit.z.toFixed(2)})`);
      assert.ok(hit.maxY < 0.2 + 2 * BEAD.r * 1.5 + 0.3, 'ingen kantgrep/klatring på kula');
    }
  }
  // walk_route uendret grønn med perlene som faste kuler på gulvet
  const sp = pickDetails(L, fy(L), hashStr(id + ':fd'), { count: detailCount(L.room, 'high', 1.6), ring: 6 }), plain = walkRoute(file, {}), withB = walkRoute(file, { extraBoxes: beadBoxes(sp) });
  assert.equal(withB.ok, plain.ok, `${id}: ruta med perler (${withB.why}) som uten (${plain.why})`);
}
assert.ok(nBeads >= 20, `perler i brettene (${nBeads})`);
// registrert i index.html (ny modul)
const idx = fs.readFileSync('index.html', 'utf8');
for (const f of ['floordetail', 'floordetail_logic']) assert.ok(idx.includes(`'${f}'`), `${f} i files i index.html`);
// matta: ingen bumpMap (flimrer)
const pj = fs.readFileSync('props.js', 'utf8'); const mat = pj.slice(pj.indexOf('  mat(sx, sy, sz, o)'), pj.indexOf('  basket('));
assert.ok(!/bumpMap/.test(mat), 'mattene har ikke bumpMap (moiré)');
console.log('floordetail ok');
