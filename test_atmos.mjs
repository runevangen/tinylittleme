// node test_atmos.mjs: lysstråler og småting (atmos_logic.js)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { beamPlan, pickSpots, hashStr, avoidZones, inAvoid } from './atmos_logic.js';

for (const id of ['bad', 'barnerom', 'kjokken', 'poc', 'klatring']) {
  const L = JSON.parse(fs.readFileSync(`levels/${id}.level.json`, 'utf8')), room = L.room, fy = Math.max(0, ...L.boxes.filter((b) => b.type === 'floor').map((b) => b.max[1]));
  for (const w of L.windows) {
    const p = beamPlan(w, room, L.sun || [28, 60, -24], fy);
    assert.ok(p && p.slabs.length >= 3 && p.dir[1] < -0.4, `${id}: stråleplan`);
    const wl = { N: [0, 0, 1], S: [0, 0, -1], E: [-1, 0, 0], W: [1, 0, 0] }[w.wall];
    assert.ok(p.dir[0] * wl[0] + p.dir[2] * wl[2] > 0.1, `${id}: lyset går inn i rommet`);
    for (const s of p.slabs) for (const q of [s.a2, s.b2]) assert.ok(q[0] >= room.x0 && q[0] <= room.x1 && q[2] >= room.z0 && q[2] <= room.z1 && q[1] >= fy - 0.01, `${id}: strålen holder seg i rommet`);
    assert.ok(p.slabs.some((s) => s.len > 4), `${id}: strålen har lengde`);
  }
  const spots = pickSpots(L.boxes, room, fy, hashStr(id), 40);
  assert.ok(spots.length >= 20, `${id}: finner steder for småting (${spots.length})`);
  for (const s of spots) {
    assert.ok(s.x > room.x0 && s.x < room.x1 && s.z > room.z0 && s.z < room.z1, `${id}: småting i rommet`);
    for (const b of L.boxes) if (b.type !== 'floor' && b.type !== 'wall' && !b.dyn && s.x > b.min[0] && s.x < b.max[0] && s.z > b.min[2] && s.z < b.max[2])
      assert.ok(s.y >= b.max[1] - 0.01 || b.min[1] >= s.y + 5, `${id}: småting inni «${b.id}»`);
  }
  assert.deepEqual(spots, pickSpots(L.boxes, room, fy, hashStr(id), 40), 'samme plassering hver gang');
}
for (const id of ['bad', 'barnerom']) {   // småting holdes unna start og mål og har variasjon i former
  const L = JSON.parse(fs.readFileSync(`levels/${id}.level.json`, 'utf8')), fy = Math.max(0, ...L.boxes.filter((b) => b.type === 'floor').map((b) => b.max[1])), av = avoidZones(L, fy);
  const sp = pickSpots(L.boxes, L.room, fy, hashStr(id), 40, av);
  assert.ok(sp.length >= 15, `${id}: nok småting med frisoner (${sp.length})`);
  for (const s of sp) { assert.ok(!inAvoid(av, s.x, s.z), `${id}: småting i frisone`); assert.ok(Math.hypot(s.x - L.start[0], s.z - L.start[2]) >= 9, `${id}: småting nær start`); }
  assert.ok(new Set(sp.map((s) => s.kind)).size >= 5, `${id}: variasjon i former`);
}
// R57: ingen strålestripe krysser en solid boks i noen brett (og lekerommet), og lys på gulvet ligger ikke i/under møbler
{
  const { beamSolid, rayHitT, beamBlockers } = await import('./atmos_logic.js');
  const unit = { type: 'wood', min: [0, 0, 0], max: [2, 2, 2] };
  assert.equal(rayHitT([-1, 1, 1], [1, 0, 0], [unit]), 1, 'stråle treffer boks');
  assert.equal(rayHitT([-1, 5, 1], [1, 0, 0], [unit]), null, 'stråle over boks');
  assert.equal(rayHitT([1, 1, 1], [1, 0, 0], [unit]), null, 'start inni hoppes over');
  assert.equal(rayHitT([-1, 1, 1], [-1, 0, 0], [unit]), null, 'stråle bort fra boks');
  assert.equal(rayHitT([-1, 1, 1], [1, 0, 0], [unit], 0.5), null, 'treff etter tmax ignoreres');
  const room = { x0: 0, x1: 40, z0: 0, z1: 40, height: 30 }, win = { wall: 'N', pos: [20, 15, 0], size: [8, 8] };
  const free = beamPlan(win, room, [0, 60, -10], 0, 5, []);
  const blocker = { type: 'wood', min: [0, 0, 0], max: [40, 40, 40].map((v, k) => k === 1 ? 40 : v) };
  const mid = { type: 'wood', min: [10, 0, 8], max: [30, 12, 14] };
  const cut = beamPlan(win, room, [0, 60, -10], 0, 5, [mid]);
  assert.ok(free.patch && free.patch.length === 16 && free.slabs.length === 5);
  assert.ok(cut.slabs.length < 5 || cut.slabs.some((s, i) => s.len < free.slabs[i]?.len - 0.01) || !cut.patch, 'boks i veien kutter stråler');
  assert.equal(beamPlan(win, room, [0, 60, -10], 0, 5, [{ ...mid, dyn: true }]).slabs.length, 5, 'dynamiske ting påvirker ikke');
  const ids = fs.readdirSync('levels').filter((f) => f.endsWith('.level.json')).map((f) => f.replace('.level.json', ''));
  assert.ok(ids.length >= 7, 'alle brett');
  let nSlabs = 0;
  for (const id of ids) {
    const L = JSON.parse(fs.readFileSync(`levels/${id}.level.json`, 'utf8')), fy = Math.max(0, ...L.boxes.filter((b) => b.type === 'floor').map((b) => b.max[1])), bl0 = L.boxes.filter(beamSolid);
    for (const w of L.windows || []) {
      const bl = beamBlockers(w, L.boxes);
      const p = beamPlan(w, L.room, L.sun || [28, 60, -24], fy, 5, L.boxes);
      for (const s of p.slabs) {
        nSlabs++;
        for (let i = 0; i <= 12; i++) for (let j = 0; j <= 12; j++) {   // punkter på selve stripa: ingen inni en boks (0,1 cm slingring)
          const f = i / 12, g = j / 12, top = [0, 1, 2].map((k) => s.a[k] + (s.b[k] - s.a[k]) * f), bot = [0, 1, 2].map((k) => s.a2[k] + (s.b2[k] - s.a2[k]) * f), q = [0, 1, 2].map((k) => top[k] + (bot[k] - top[k]) * g);
          for (const b of bl) { const e = 0.1; assert.ok(!(q[0] > b.min[0] + e && q[0] < b.max[0] - e && q[1] > b.min[1] + e && q[1] < b.max[1] - e && q[2] > b.min[2] + e && q[2] < b.max[2] - e) || (s.a[0] > b.min[0] && s.a[0] < b.max[0] && s.a[1] > b.min[1] && s.a[1] < b.max[1] && s.a[2] > b.min[2] && s.a[2] < b.max[2]), `${id}: stråle krysser «${b.id}» ved ${q.map((v) => v.toFixed(1))}`); }
        }
      }
      if (p.patch) for (const cell of p.patch) for (const q of cell.q) for (const b of bl) assert.ok(!(q[0] > b.min[0] && q[0] < b.max[0] && q[2] > b.min[2] && q[2] < b.max[2] && b.min[1] <= fy + 0.3 && b.max[1] > fy + 0.04), `${id}: lysflekk i «${b.id}»`);
    }
  }
  assert.ok(nSlabs > 10, 'noen stråler beholdes');
  assert.ok(ids.some((id) => { const L = JSON.parse(fs.readFileSync(`levels/${id}.level.json`, 'utf8')); return (L.windows || []).some((w) => beamPlan(w, L.room, L.sun || [28, 60, -24], 0, 5, L.boxes).patch); }), 'lys på gulvet beholdes der det er åpent');
}
console.log('atmos ok');
