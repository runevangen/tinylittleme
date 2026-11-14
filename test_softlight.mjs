// node test_softlight.mjs: R17 myke skygger og lysbaking (softlight_logic.js)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { planBlobs, planGlows, shadowRadius, softActive, SOFT } from './softlight_logic.js';

for (const id of ['bad', 'barnerom', 'kjokken', 'poc', 'klatring', 'barnerom2', 'kjokken2', 'bad2', 'leke', 'stue']) {
  const L = JSON.parse(fs.readFileSync(`levels/${id}.level.json`, 'utf8')), room = L.room, fy = Math.max(0, ...L.boxes.filter((b) => b.type === 'floor').map((b) => b.max[1]));
  const sun = L.sun || [28, 60, -24], bl = planBlobs(L, fy, sun), gl = planGlows(L, fy, sun);
  assert.ok(bl.length >= 4 && bl.length <= SOFT.maxBlobs, `${id}: blobber (${bl.length})`);
  assert.equal(bl.filter((b) => b.kind === 'corner').length, 4, `${id}: fire hjørner`);
  for (const b of bl) { assert.ok(b.op > 0 && b.op <= 0.95 && b.rx > 0 && b.rz > 0, `${id}: gyldig blob`); assert.ok(b.x > room.x0 - 3 && b.x < room.x1 + 3 && b.z > room.z0 - 3 && b.z < room.z1 + 3, `${id}: blob i rommet`); }
  assert.equal(gl.length, (L.windows || []).length, `${id}: én lysflekk per vindu`);
  for (const g of gl) assert.ok(g.x >= room.x0 && g.x <= room.x1 && g.z >= room.z0 && g.z <= room.z1 && g.y === fy, `${id}: lysflekk på gulvet`);
}
// begrensning
{ const L = JSON.parse(fs.readFileSync('levels/barnerom.level.json', 'utf8')); assert.equal(planBlobs(L, 0, [1, 1, 1], 6).length, 6, 'maks antall'); }
// lav profil / Enkel grafikk / valget av slår alt av
assert.ok(softActive(true, false, false), 'på i Detaljert');
assert.ok(!softActive(true, true, false), 'lav profil: av');
assert.ok(!softActive(true, false, true), 'Enkel grafikk: av');
assert.ok(!softActive(false, false, false), 'valget av: av');
assert.equal(shadowRadius(true, false), SOFT.shadowRadius); assert.equal(shadowRadius(true, true), SOFT.shadowRadiusOff); assert.equal(shadowRadius(false, false), SOFT.shadowRadiusOff);
console.log('test_softlight: ok');
