// R26: bygget flyttes ut i verdenen (build_world.js). Referansebygget i hvert byggebrett (bro, trapp) gir en gyldig rute, brettet kan også fullføres uten å bygge,
// og et dårlig (verst tenkelig) bygg stenger aldri den alternative veien. Dessuten: skiver/ramper, lagre/fortsett, solide flater i physics.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { walkRoute } from './tools/walk_route.mjs';
import * as BW from './build_world.js';
import * as BP from './build_phys.js';
import * as BL from './build_logic.js';
import { P, newPlayer, step, applyPreset, initBodies } from './physics.js';

const lv = (id) => JSON.parse(fs.readFileSync(`levels/${id}.level.json`, 'utf8'));
// 1) enkle deler: en rett planke = én boks i riktig høyde; en rotert planke blir en rampe av skiver som stiger jevnt
{
  const site = { id: 's', x: 10, y: 2, z: -3, w: 20, h: 10 };
  const flat = BW.buildSolids(site, [{ id: 'a', type: 'plank_l', u: 0, v: 0.25, rot: 0 }]); assert.equal(flat.length, 1);
  assert.deepEqual(flat[0].min, [6, 2, -3 - BW.DEPTH / 2]); assert.deepEqual(flat[0].max, [14, 2.5, -3 + BW.DEPTH / 2]); assert.equal(flat[0].built, 's');
  const ramp = BW.partSlabs({ id: 'r', type: 'plank_l', u: 0, v: 3, rot: Math.PI / 6 });
  assert.ok(ramp.length >= 10, 'rampe av mange skiver'); for (let i = 1; i < ramp.length; i++) assert.ok(Math.abs(ramp[i].u0 - ramp[i - 1].u1) < 1e-6 && Math.abs(ramp[i].v1 - ramp[i - 1].v1) < 0.45, 'skivene henger sammen og trinnene er små');
  assert.ok(Math.max(...ramp.map((q) => q.v1)) - Math.min(...ramp.map((q) => q.v0)) > 3.5, 'rampen er høy nok');
    const up = BW.partSlabs({ id: 'u', type: 'plank_l', u: 0, v: 4, rot: Math.PI / 2 }); assert.equal(up.length, 1, 'plank på høykant er én søyle'); assert.ok(up[0].v1 - up[0].v0 > 7.9);
}
// 2) legge inn og fjerne i brettet; figuren løftes ut av bygget
{
  const L = { boxes: [{ id: 'x', min: [0, 0, 0], max: [1, 1, 1] }] }, site = { id: 's', x: 0, y: 0, z: 0, w: 20, h: 10 };
  assert.equal(BW.applyBuilt(L, site, [{ id: 'a', type: 'block', u: 0, v: 0.75, rot: 0 }]), 1); assert.equal(L.boxes.length, 2);
  assert.equal(BW.applyBuilt(L, site, [{ id: 'a', type: 'block', u: 1, v: 0.75, rot: 0 }, { id: 'b', type: 'block', u: 3, v: 0.75, rot: 0 }]), 2); assert.equal(BW.builtCount(L, 's'), 2, 'ny bygging erstatter den gamle');
  const p = { x: 1, y: 0, z: 0 }; assert.ok(BW.liftOut(L, p, 's') && p.y >= 1.5 - 1e-6, 'figuren løftes opp på bygget i stedet for å stå fast inni'); assert.ok(!BW.liftOut(L, p, 's'));
  assert.equal(BW.clearBuilt(L, 's'), 2); assert.equal(L.boxes.length, 1, 'andre bokser berøres ikke');
}
// 2b) delene settes: en kloss som svever faller ned på den under, en som ligger nedsunket i underlaget løftes opp
{
  const site = { id: 's', w: 14, h: 8, deck: [{ u0: -7, u1: 7 }] };
  const sp = BP.settledPlaced({ site, placed: [{ id: 'a', type: 'block', u: 0, v: 0.75, rot: 0 }, { id: 'b', type: 'block', u: 0, v: 4, rot: 0 }, { id: 'c', type: 'block', u: 4, v: 0.3, rot: 0 }], links: [] });
  const by = Object.fromEntries(sp.map((p) => [p.id, p])); assert.ok(Math.abs(by.b.v - 2.25) < 0.15, `svevende kloss faller ned på den under (${by.b.v.toFixed(2)})`); assert.ok(by.c.v > 0.7, 'nedsunket kloss løftes opp');
  assert.equal(JSON.stringify(sp), JSON.stringify(BP.settledPlaced({ site, placed: [{ id: 'a', type: 'block', u: 0, v: 0.75, rot: 0 }, { id: 'b', type: 'block', u: 0, v: 4, rot: 0 }, { id: 'c', type: 'block', u: 4, v: 0.3, rot: 0 }], links: [] })), 'samme resultat hver gang');
  const pl = BP.settledPlaced({ site: { id: 'w', w: 13, h: 8, deck: [{ u0: -9.5, u1: -3.5 }, { u0: 3.5, u1: 9.5 }] }, placed: [{ id: 'p', type: 'plank_l', u: 0, v: 0.25, rot: 0 }], links: [] })[0]; assert.ok(Math.abs(pl.rot) < 0.1 && Math.abs(pl.u) < 0.3, 'planken ligger rett over gapet');
}
// 3) bygget er solid for den ekte figuren: uten bro faller du i gapet, med bro går du over
{
  const L = lv('bro'), site = L.build.sites[0]; applyPreset('mario'); Object.assign(P, { edgeGuard: true, autoJump: true, airSteady: true, magnet: true, holdGrab: true });
  const walkAcross = (withBuild) => {
    const LL = JSON.parse(JSON.stringify(L)); initBodies(LL); if (withBuild) BW.applyBuilt(LL, site, BP.settledPlaced({ site, placed: site.ref.placed, links: [] }));
    const p = newPlayer(site.x - 14, site.y, site.z), idle = { mx: 0, mz: 0, jumpPressed: false, jumpHeld: false, grabPressed: false, grabHeld: false };
    for (let i = 0; i < 20; i++) step(p, idle, 1 / 60, LL);
    for (let i = 0; i < 60 * 12; i++) step(p, { ...idle, mx: 0.6 }, 1 / 60, LL);
    return p;
  };
  assert.ok(walkAcross(true).x > site.x + 6 && Math.abs(walkAcross(true).y - site.y) < 0.6, 'går over broen');
  assert.ok(walkAcross(false).x < site.x, 'uten bro stopper figuren ved kanten (gapet kan ikke krysses ved å gå)');
}
// 4) alle fire byggebrettene (R26: bro og trapp, R30: vippe og kjøkkenbro): byggestedet er med delene, referansebygget består prøven i 2D-fysikken, og ruta via bygget går i ekte fysikk
for (const id of ['bro', 'trapp', 'vippe', 'kjokkenbro', 'leke']) {
  const L = lv(id), site = L.build.sites[0]; assert.ok(site.ref?.placed?.length && site.ref.route, `${id}: referansebygg og rute i brettet`);
  const types = Object.fromEntries(L.build.parts.map((q) => [q.id, q.type]));
  const need = {}; for (const p of site.ref.placed) need[p.type] = (need[p.type] || 0) + 1; for (const [t, n] of Object.entries(need)) assert.ok(L.build.parts.filter((q) => q.type === t).length >= n, `${id}: nok deler av typen ${t} å finne i rommet`);
  const sim = BP.runSim({ site, placed: site.ref.placed, links: site.ref.links }); assert.equal(sim.result, 'won', `${id}: referansebygget består PRØV (${sim.reason})`); assert.equal(sim.breaks.length, 0);
  assert.equal(BP.runSim({ site, placed: [], links: [] }).result, 'lost', `${id}: uten bygg består ikke prøven`);
  const gl = (L.goals || []).find((g) => g.type === 'flag'); assert.ok(gl && gl.flag === site.id, `${id}: bygg-delmålet er koblet til byggestedet`); assert.ok(!gl.gate && !gl.req, `${id}: bygging er valgfritt`);
  const alt = walkRoute(`levels/${id}.level.json`); assert.ok(alt.ok, `${id}: målet kan nås uten å bygge (den harde veien): ${alt.why}`);
  const route = BW.refRoute(L, site); assert.ok(route, `${id}: ruta via bygget finnes`);
  const built = walkRoute(null, { level: L, route, extraBoxes: BW.buildSolids(site, BP.settledPlaced({ site, placed: site.ref.placed, links: site.ref.links })) }); assert.ok(built.ok, `${id}: ruta via det ferdige bygget går: ${built.why}`);
  const len = (r) => { let q = [L.start[0], L.start[2]], t = 0; for (const n of r.slice(1)) { const c = [(n.x0 + n.x1) / 2, (n.z0 + n.z1) / 2]; t += Math.hypot(c[0] - q[0], c[1] - q[1]); q = c; } return t; };
  assert.ok(len(route) < len(L.route) - 20, `${id}: bygging er snarveien (${len(route).toFixed(0)} mot ${len(L.route).toFixed(0)} enheter)`);
  // et dårlig bygg (hele stedet fylt med solid) stenger ikke den harde veien
  const bad = walkRoute(null, { level: L, extraBoxes: BW.worstSolids(site) }); assert.ok(bad.ok, `${id}: verst tenkelige bygg stenger ikke den alternative veien: ${bad.why}`);
  // og et halvt bygg (uten bro) hjelper ikke: ruta via bygget går ikke uten delene
  const none = walkRoute(null, { level: L, route }); assert.ok(!none.ok, `${id}: uten bygget går ikke snarveien`);
  void types;
}
// 5) R30: vippa i verden: støtta (fulcrum) under dreiepunktet er en solid søyle, og den prøvde vippa blir en rampe
{
  const L = lv('vippe'), site = L.build.sites[0], sp = BP.settledPlaced({ site, placed: site.ref.placed, links: [] }), v = sp[0];
  assert.ok(Math.abs(v.rot) > 0.15 && Math.abs(v.rot) < 0.4, `vippa legger seg skrått (${v.rot.toFixed(2)} rad)`);
  const solids = BW.buildSolids(site, sp), f = solids.find((b) => b.id.endsWith('_stotte')); assert.ok(f, 'støtte under vippa');
  assert.ok(f.min[1] < site.y - 7 && f.max[1] < site.y + v.v, 'støtta når ned til gulvet i rommet og ligger under planken'); assert.ok(solids.length > 5, 'planken er en rampe av skiver');
  assert.equal(BW.fulcrum({ id: 's', x: 0, y: 0, z: 0, w: 10, h: 5 }, { id: 'p', u: 0, v: 0.2 }), null, 'ingen støtte om planken ligger rett på underlaget');
}
console.log('bygg-i-verden-tester grønne');
