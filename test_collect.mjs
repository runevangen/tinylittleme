// node test_collect.mjs: logikk for smuler (R3), og at smulene i nivå 1–6 ligger på nåbare, frie flater.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CRUMB, initCollect, resetCollect, stepCollect, crumbCount, crumbTotal, collectedIds, restoreCollected, crumbReachable } from './collect.js';
import { freeAt, initBodies } from './physics.js';

// --- logikk ---
{
  const L = { collectibles: [{ id: 'a', x: 0, y: 0.8, z: 0 }, { id: 'b', x: 10, y: 0.8, z: 0 }, { id: 'c', x: 0, y: 12.8, z: 0 }] };
  initCollect(L); assert.equal(crumbTotal(L), 3); assert.equal(crumbCount(L), 0);
  assert.deepEqual(stepCollect(L, { x: 5, y: 0, z: 0 }, 0.1), [], 'for langt unna');
  assert.deepEqual(stepCollect(L, { x: 0, y: 5, z: 0 }, 0.1), [], 'for høyt over smula');
  assert.deepEqual(stepCollect(L, { x: 0.5, y: 0, z: 0.3 }, 0.1, false), [], 'ikke aktiv (mål nådd / plan)');
  const ev = stepCollect(L, { x: 0.5, y: 0, z: 0.3 }, 0.1);
  assert.equal(ev.length, 1); assert.deepEqual([ev[0].type, ev[0].id, ev[0].n, ev[0].total], ['crumb', 'a', 1, 3]);
  assert.deepEqual(stepCollect(L, { x: 0.5, y: 0, z: 0.3 }, 0.1), [], 'tas bare én gang');
  assert.ok(crumbReachable(L.crumbList[1], { x: 10, y: 0.3, z: 0 }), 'hopp mot smula teller');
  assert.deepEqual(collectedIds(L), ['a']);
  // lagring og gjenoppretting; ukjente id-er ignoreres
  const M = { collectibles: L.collectibles }; initCollect(M);
  assert.equal(restoreCollected(M, ['a', 'c', 'finnesikke']), 2); assert.deepEqual(collectedIds(M), ['a', 'c']);
  assert.equal(restoreCollected(M, undefined), 0);
  resetCollect(L); assert.equal(crumbCount(L), 0);
  assert.equal(stepCollect({}, { x: 0, y: 0, z: 0 }, 1).length, 0, 'brett uten smuler');
  assert.ok(CRUMB.points > 0);
}

// --- brettene: minst 8 smuler i nivå 1–6, unike id-er, på frie, nåbare flater ---
{
  const R = 0.7;
  for (const id of ['bad', 'barnerom', 'kjokken', 'bad2', 'barnerom2', 'kjokken2', 'leke']) {
    const L = JSON.parse(fs.readFileSync(`levels/${id}.level.json`, 'utf8')), cs = L.collectibles || [];
    assert.ok(cs.length >= 8, `${id}: skal ha minst 8 smuler (har ${cs.length})`);
    assert.equal(new Set(cs.map((c) => c.id)).size, cs.length, `${id}: smule-id-er må være unike`);
    const solids = L.boxes.filter((b) => b.type !== 'floor' && b.type !== 'wall'), mov = L.movables || [];
    const topAt = (x, z) => { let t = 0; for (const b of solids) if (x > b.min[0] && x < b.max[0] && z > b.min[2] && z < b.max[2]) t = Math.max(t, b.max[1]); return t; };
    const nodes = (L.route || []).filter((n) => !n.via && !n.grip);
    initBodies(L);
    for (const c of cs) {
      const top = topAt(c.x, c.z), tag = `${id}: ${c.id} ved (${c.x}, ${c.z})`;
      assert.ok(Math.abs(c.y - top - CRUMB.lift) < 0.01, `${tag} svever ikke rett over flaten (flate ${top}, y ${c.y})`);
      assert.ok(freeAt(L, c.x, top + 0.05, c.z), `${tag}: figuren får ikke stå her`);
      assert.ok(!solids.concat(mov).some((b) => c.x + R > b.min[0] && c.x - R < b.max[0] && c.z + R > b.min[2] && c.z - R < b.max[2] && b.max[1] > top + 0.02 && b.min[1] < top + 2), `${tag}: noe står i veien`);
      assert.ok(!(L.hazards || []).some((h) => c.x > h.min[0] && c.x < h.max[0] && c.z > h.min[2] && c.z < h.max[2]), `${tag}: ligger i en fare`);
      // nåbar: gulvet, eller en flate som ruta bruker (og som walk_route beviser at kan nås)
      assert.ok(top < 0.02 || nodes.some((n) => Math.abs(n.top - top) < 0.05 && c.x > n.x0 && c.x < n.x1 && c.z > n.z0 && c.z < n.z1), `${tag}: ligger ikke på gulvet eller en flate i ruta`);
      assert.ok(Math.hypot(c.x - L.start[0], c.z - L.start[2]) > 3, `${tag}: for nær start`);
    }
    assert.ok(cs.some((c) => c.y < 1) && cs.some((c) => c.y > 2), `${id}: smulene bør ligge både på gulvet og høyere opp`);
  }
}
console.log('smule-tester grønne');
