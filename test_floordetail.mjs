// node test_floordetail.mjs: gulvdetaljer (R13): tetthet etter rom og kvalitet, målestokk-ring ved start, ingenting inni møbler, fuger på rutenettet
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { detailCount, pickDetails, hashStr, floorKind, TILE, KINDS, START_YAW, START_CAM, isMat, toScreen, floorAt } from './floordetail_logic.js';

const fy = (L) => Math.max(0, ...L.boxes.filter((b) => b.type === 'floor').map((b) => b.max[1]));
const names = ['bad', 'barnerom', 'kjokken', 'bad2', 'barnerom2', 'kjokken2'];
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
// registrert i index.html (ny modul)
const idx = fs.readFileSync('index.html', 'utf8');
for (const f of ['floordetail', 'floordetail_logic']) assert.ok(idx.includes(`'${f}'`), `${f} i files i index.html`);
// matta: ingen bumpMap (flimrer)
const pj = fs.readFileSync('props.js', 'utf8'); const mat = pj.slice(pj.indexOf('  mat(sx, sy, sz, o)'), pj.indexOf('  basket('));
assert.ok(!/bumpMap/.test(mat), 'mattene har ikke bumpMap (moiré)');
console.log('floordetail ok');
