// node test_atmos.mjs: lysstråler og småting (atmos_logic.js)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { beamPlan, pickSpots, hashStr } from './atmos_logic.js';

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
console.log('atmos ok');
