// R19: pillbug (roller) og tråd-edderkopp (dangler): varselstiming, nullstilling, knus, og fordeling i nivå 3-6.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { newPlayer } from './physics.js';
import { initAnts, stepAnts, resetAnts, ANT } from './ants.js';
import { ROLLER, DANGLER, TUNE, warnTime } from './creatures.js';

const mkL = (ants) => { const L = { ants }; initAnts(L); return L; };
const grounded = (x, z, y = 0) => { const p = newPlayer(x, y, z); p.state = 'ground'; p.onGround = true; return p; };
const far = grounded(0, 60);
const DT = 1 / 60;
const MIN_WARN = 0.5;   // krav fra R19: ingen skade uten minst 0,5 s varsel

// ---- roller ----
{
  const L = mkL([{ id: 'r', type: 'roller', a: [-8, 0, 0], b: [8, 0, 0] }]), r = L.antList[0];
  assert.equal(r.type, 'roller'); assert.equal(r.danger, false);
  // ute av syne: går rolig og er ufarlig
  for (let i = 0; i < 120; i++) stepAnts(L, far, DT); assert.equal(r.mode, 'walk'); assert.equal(r.danger, false);
  // du kommer nær: varsler, og er ufarlig hele varselet
  const p = grounded(5, 0); p.x = r.x + 4; p.z = 0;
  let evs = stepAnts(L, p, DT); assert.ok(evs.some((e) => e.type === 'alert' && e.kind === 'roller'), 'varsler');
  assert.equal(r.mode, 'curl'); let warnT = 0, hurt = false, rolled = false;
  for (let i = 0; i < 60 * 3 && !rolled; i++) { const e = stepAnts(L, p, DT); if (e.some((x) => x.type === 'hurt')) hurt = true; if (e.some((x) => x.type === 'roll')) rolled = true; else warnT += DT; if (!rolled) assert.equal(r.danger, false, 'ufarlig under varselet'); }
  assert.ok(rolled, 'ruller etter varselet'); assert.ok(warnT >= MIN_WARN, `varsel ${warnT.toFixed(2)} s`); assert.ok(!hurt, 'ingen skade under varselet'); assert.ok(r.danger, 'farlig når den ruller');
  // blir du stående i veien, støter den deg (etter varselet)
  p.x = r.x + 0.3; p.z = 0; let got = false;
  for (let i = 0; i < 30 && !got; i++) { r.invuln = 0; got = stepAnts(L, p, DT).some((e) => e.type === 'hurt' && e.kind === 'roller'); p.x = r.x + 0.3; } assert.ok(got, 'støt når den ruller');
  // rullen slutter i enden, og den er svimmel og ufarlig
  let stopped = false; const away = grounded(0, 40);
  for (let i = 0; i < 60 * 4 && !stopped; i++) stopped = stepAnts(L, away, DT).some((e) => e.type === 'stop'); assert.ok(stopped, 'stopper'); assert.equal(r.mode, 'rest'); assert.equal(r.danger, false);
  // ligger du rett oppå mens den hviler: ingenting skjer (ufarlig)
  const on = grounded(r.x + 0.2, r.z); L.antInvuln = 0; assert.ok(!stepAnts(L, on, DT).some((e) => e.type === 'hurt'), 'hvile = ufarlig');
  // tilbake til gange
  for (let i = 0; i < 60 * (ROLLER.rest + 0.5); i++) stepAnts(L, away, DT); assert.equal(r.mode, 'walk');
}
// avblåst varsel: rygger du før halvveis
{
  const L = mkL([{ id: 'r', type: 'roller', a: [-8, 0, 0], b: [8, 0, 0] }]), r = L.antList[0];
  stepAnts(L, grounded(r.x + 4, 0), DT); assert.equal(r.mode, 'curl');
  for (let i = 0; i < 6; i++) stepAnts(L, far, DT); assert.equal(r.mode, 'walk', 'avblåst'); assert.ok(r.crouchK <= 0.2);
}
// knus fra oven (HOPP) ufarliggjør, også under rulling, og nullstilling
{
  const L = mkL([{ id: 'r', type: 'roller', a: [-8, 0, 0], b: [8, 0, 0] }]), r = L.antList[0];
  stepAnts(L, grounded(r.x + 4, 0), DT); for (let i = 0; i < 60; i++) stepAnts(L, grounded(r.x + 40, 0), DT);   // la den rulle (sett fra langt unna avblåser, så tving)
  r.mode = 'roll'; r.mt = 0; r.rollDir = 1;
  const t = newPlayer(r.x, ROLLER.hgt * 0.8, 0); t.state = 'air'; t.vy = -6;
  const e = stepAnts(L, t, DT); assert.ok(e.some((x) => x.type === 'stomp' && x.kind === 'roller'), 'knust'); assert.equal(t.vy, ANT.bounce); assert.equal(r.alive, false);
  for (let i = 0; i < 60 * ROLLER.respawn + 60; i++) stepAnts(L, far, DT); assert.ok(r.alive && r.mode === 'walk' && r.danger === false, 'kommer tilbake nullstilt');
  r.mode = 'roll'; resetAnts(L); assert.equal(r.mode, 'walk'); assert.equal(r.danger, false); assert.equal(r.crouchK, 0, 'resetAnts nullstiller');
}

// ---- dangler ----
{
  const L = mkL([{ id: 'd', type: 'dangler', a: [0, 0, 0], b: [0, 0, 0] }]), d = L.antList[0];
  assert.equal(d.type, 'dangler'); assert.ok(d.y >= DANGLER.up - 1e-6, 'henger høyt oppe');
  for (let i = 0; i < 300; i++) stepAnts(L, far, DT); assert.equal(d.mode, 'up', 'gir ikke når du er langt unna');
  // du står under: oppe er den ufarlig, så varsel (rister), så stup/lav (farlig), så opp igjen
  const p = grounded(0, 0); let warn = 0, hurtBeforeDanger = false, sawAlert = false, sawPlunge = false, sawDanger = false, hurtInDanger = false;
  for (let i = 0; i < 60 * 8; i++) {
    L.antInvuln = 0;
    const e = stepAnts(L, p, DT); p.vx = p.vy = 0; p.state = 'ground'; p.onGround = true;
    if (e.some((x) => x.type === 'alert')) sawAlert = true; if (e.some((x) => x.type === 'plunge')) sawPlunge = true;
    if (d.mode === 'warn') { warn += DT; assert.equal(d.danger, false); assert.ok(d.shake > 0); }
    if (e.some((x) => x.type === 'hurt')) { if (d.danger) hurtInDanger = true; else hurtBeforeDanger = true; }
    if (d.danger) sawDanger = true;
  }
  assert.ok(sawAlert && sawPlunge && sawDanger, 'hele syklusen'); assert.ok(!hurtBeforeDanger, 'ingen skade uten fare'); assert.ok(hurtInDanger, 'støt når den henger lavt over deg');
  assert.ok(warn >= MIN_WARN, `varsel ${warn.toFixed(2)} s`);
  // knus når den henger lavt
  resetAnts(L); assert.equal(d.mode, 'up'); assert.equal(d.danger, false);
  d.mode = 'hold'; d.mt = 0; d.y = d.base + DANGLER.low; d.danger = true;
  const t = newPlayer(0, d.y + DANGLER.hgt * 0.8, 0); t.state = 'air'; t.vy = -6;
  const e = stepAnts(L, t, DT); assert.ok(e.some((x) => x.type === 'stomp' && x.kind === 'dangler'), 'knust'); assert.equal(d.alive, false);
  for (let i = 0; i < 60 * DANGLER.respawn + 60; i++) stepAnts(L, far, DT); assert.ok(d.alive && d.mode === 'up' && d.danger === false, 'kommer tilbake nullstilt');
  // oppe i luften (over hodet) er den aldri farlig
  resetAnts(L); const q = grounded(0, 0); L.antInvuln = 0; assert.ok(!stepAnts(L, q, DT).some((x) => x.type === 'hurt'));
}
// admin-faktoren kan aldri gi under 0,5 s varsel
{ TUNE.warn = 0.1; assert.ok(warnTime(ROLLER.curl) >= MIN_WARN && warnTime(DANGLER.warn) >= MIN_WARN); TUNE.warn = 1; assert.equal(warnTime(1), 1); }
assert.ok(ROLLER.curl >= MIN_WARN && DANGLER.warn >= MIN_WARN);

// ---- fordeling: hvert av nivå 3-6 har minst én ny skapning, og de er ulike per rom ----
{
  const types = (n) => (JSON.parse(fs.readFileSync(`levels/${n}.level.json`, 'utf8')).ants || []).map((a) => a.type || 'ant');
  const has = (n) => types(n).filter((t) => t === 'roller' || t === 'dangler');
  for (const n of ['kjokken', 'bad2', 'barnerom2', 'kjokken2']) assert.ok(has(n).length >= 1, `${n}: mangler ny skapning`);
  assert.ok(has('kjokken').every((t) => t === 'roller') && has('bad2').every((t) => t === 'dangler'), 'nivå 3 pillbug, nivå 4 tråd');
  assert.ok(has('barnerom2').includes('roller') && has('barnerom2').includes('dangler'), 'nivå 5 begge');
  assert.ok(has('kjokken2').includes('roller') && has('kjokken2').includes('dangler'), 'nivå 6 begge');
  for (const n of ['bad', 'barnerom']) assert.ok(has(n).length === 0, `${n}: uendret`);
  // danglere trenger fri flate rundt hjemmet, og taket høyere enn «oppe»
  for (const n of ['bad2', 'barnerom2', 'kjokken2']) {
    const L = JSON.parse(fs.readFileSync(`levels/${n}.level.json`, 'utf8'));
    for (const a of L.ants.filter((x) => x.type === 'dangler')) {
      assert.ok(L.room.height > a.a[1] + DANGLER.up + 2, `${n}: ${a.id} må ha tak over seg`);
      for (const b of L.boxes.filter((b) => b.type !== 'floor' && b.type !== 'wall')) assert.ok(!(a.a[0] + 1.5 > b.min[0] && a.a[0] - 1.5 < b.max[0] && a.a[2] + 1.5 > b.min[2] && a.a[2] - 1.5 < b.max[2] && b.max[1] > 0.01 && b.min[1] < 1), `${n}: ${a.id} står inntil ${b.id}`);
    }
  }
}
console.log('skapning-tester grønne');
