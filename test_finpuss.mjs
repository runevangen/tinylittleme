// R39: finpuss av Prince: kant-shimmy, rulle ved landing, forsiktig gange og tyngre tau.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { FIN, shimmyVel, shimmyMove, rollWanted, rollProgress, carefulFactor, swingParams, lagToward, swingPeriod } from './finpuss.js';
import { P, box, newPlayer, step, applyPreset } from './physics.js';

const floor = box('floor', -50, 50, -2, 0, -50, 50);
const idle = { mx: 0, mz: 0, jumpPressed: false, jumpHeld: false, grabPressed: false, grabHeld: false };
const dt = 1 / 60;
const flags = (v) => Object.assign(P, { shimmy: v, rollOn: v, carefulOn: v, ropeHeavy: v });

// ---- ren logikk ----
assert.equal(shimmyVel(0.1), 0, 'under dødsonen: ingen shimmy');
assert.ok(shimmyVel(1) > 0 && shimmyVel(-1) < 0 && Math.abs(shimmyVel(1)) <= FIN.shimmySpeed + 1e-9, 'fortegn og tak');
assert.ok(Math.abs(shimmyVel(0.5)) < Math.abs(shimmyVel(1)), 'mer stikke = mer fart');
{ const b = box('w', 0, 4, 0, 3, 0, 1), h = { nx: 0, nz: 1, tx: 2, tz: 1.5 }, pos = { x: 2, z: 1.3 };
  const r = shimmyMove(h, b, pos, 0.5); assert.ok(r && Math.abs(r.x - 1.5) < 1e-9 && r.z === 1.3 && Math.abs(r.tx - 1.5) < 1e-9, 'nz=1: tangent (-1,0), positiv dist går mot -x');
  const e = shimmyMove(h, b, { x: 0.2, z: 1.3 }, 0.5); assert.equal(e, null, 'stopper ved hjørnet (margin)');
  const c = shimmyMove(h, b, { x: 0.5, z: 1.3 }, 5); assert.ok(Math.abs(c.x - FIN.shimmyMargin) < 1e-9, 'begrenses til kanten'); }
// rulle
assert.ok(rollWanted(20, 18, 27, 5, 7, 0.9), 'hard landing i fart med stikke: rulle');
assert.ok(!rollWanted(20, 18, 27, 0.5, 7, 0.9), 'uten fart: ingen rulle');
assert.ok(!rollWanted(20, 18, 27, 5, 7, 0.1), 'uten stikke: ingen rulle');
assert.ok(!rollWanted(28, 18, 27, 5, 7, 0.9), 'farlig landing rulles ikke');
assert.ok(!rollWanted(10, 18, 27, 5, 7, 0.9), 'myk landing trenger ingen rulle');
assert.ok(rollProgress(0) === 0 && rollProgress(FIN.rollDur) === 0 && rollProgress(FIN.rollDur / 2) > 0.4 && rollProgress(0.001) > 0.9, 'rullefremdrift');
// forsiktig
assert.ok(Math.abs(carefulFactor(0.2, 0.7) - FIN.carefulMul) < 1e-9, 'lett stikke: sakte');
assert.ok(Math.abs(carefulFactor(0.7, 0.7) - 1) < 1e-9 && carefulFactor(1, 0.7) === 1, 'ved grensen og over: full');
let pv = 0; for (let s = 0.02; s <= 1; s += 0.02) { const f = carefulFactor(s, 0.7); assert.ok(f >= pv - 1e-9, 'jevn og stigende'); pv = f; }
assert.equal(carefulFactor(0, 0.7), 1);
// tau
{ const a = swingParams(false), b = swingParams(true); assert.ok(a.gMul === 1 && a.lag === 0 && a.damp === 0.1, 'av = som før');
  assert.ok(b.gMul < 1 && b.pushMul > 1 && b.lag > 0 && b.damp < a.damp, 'tungt: lengre periode, mer fart, treghet, mindre demping');
  assert.ok(swingPeriod(6, 32 * b.gMul) > swingPeriod(6, 32) * 1.1, 'periode minst 10 % lengre');
  let x = 0; for (let i = 0; i < 12; i++) x = lagToward(x, 1, dt, 0.22); assert.ok(x > 0.1 && x < 0.6, 'treghet: stikka virker gradvis'); assert.equal(lagToward(0, 1, dt, 0), 1); }

// ---- fysikk ----
applyPreset('mario');
// kant-shimmy: heng i en kant på x=5 (vender mot +x), gå sidelengs (langs z)
const hangAt = () => {
  const L = { boxes: [floor, box('wood', -5, 5, 0, 4, -3, 3)], ropes: [] };
  const p = newPlayer(5.6, 3.2, 0); p.vy = 0; p.state = 'air';
  for (let i = 0; i < 90 && p.state !== 'hang'; i++) step(p, { ...idle, mx: -1, grabPressed: i === 0, grabHeld: true }, dt, L);
  return { L, p };
};
{ flags(false); P.autoGrab = true;
  let { L, p } = hangAt(); assert.equal(p.state, 'hang', 'henger i kanten');
  const z0 = p.z; for (let i = 0; i < 60; i++) step(p, { ...idle, mz: 1 }, dt, L); assert.ok(Math.abs(p.z - z0) < 0.01 && p.state === 'hang', 'uten shimmy står han stille');
  flags(true);
  ({ L, p } = hangAt()); const x0 = p.x, z1 = p.z, ev = [];
  for (let i = 0; i < 60; i++) { step(p, { ...idle, mz: 1 }, dt, L); ev.push(...(L.events || [])); L.events = []; }
  assert.equal(p.state, 'hang', 'blir hengende'); assert.ok(Math.abs(p.z - z1) > 0.7 && p.z > z1, `shimmy sidelengs (dz=${(p.z - z1).toFixed(2)})`);
  assert.ok(Math.abs(p.x - x0) < 1e-6 && p.hang.tz > z1, 'holder seg til veggen');
  assert.equal(ev.filter((e) => e.type === 'shimmy').length, 1, 'logger shimmy én gang per heng');
  for (let i = 0; i < 400; i++) step(p, { ...idle, mz: 1 }, dt, L); assert.ok(p.z <= 3 - FIN.shimmyMargin + 1e-6 && p.state === 'hang', 'stopper ved kanthjørnet, faller ikke');
  for (let i = 0; i < 200; i++) step(p, { ...idle, mz: -1 }, dt, L); assert.ok(p.z < 0 && p.state === 'hang', 'kan gå tilbake');
  // hiv deg opp fra den nye posisjonen (HOPP)
  for (let i = 0; i < 120; i++) step(p, { ...idle, jumpPressed: i === 0 }, dt, L); assert.ok(p.onGround && Math.abs(p.y - 4) < 0.02, `hiver seg opp etter shimmy (${p.state} y=${p.y.toFixed(2)} x=${p.x.toFixed(2)} z=${p.z.toFixed(2)})`);
  // stikka bort fra veggen slipper fortsatt
  ({ L, p } = hangAt()); for (let i = 0; i < 10; i++) step(p, { ...idle, mx: 1 }, dt, L); assert.notEqual(p.state, 'hang', 'bort fra veggen slipper');
  // en vegg i veien stopper shimmy
  { const L2 = { boxes: [floor, box('wood', -5, 5, 0, 4, -3, 3), box('wall', 4.9, 7, 0, 9, 0.6, 1.2)], ropes: [] }; const q = newPlayer(5.6, 3.2, 0); q.state = 'air';
    for (let i = 0; i < 90 && q.state !== 'hang'; i++) step(q, { ...idle, mx: -1, grabPressed: i === 0, grabHeld: true }, dt, L2);
    if (q.state === 'hang') { for (let i = 0; i < 120; i++) step(q, { ...idle, mz: 1 }, dt, L2); assert.ok(q.z < 0.6, `hinder stopper shimmy (z=${q.z.toFixed(2)})`); } }
}
// rulle ved landing: fall fra 4 med fart; hard terskel 18
const fall = (on, mx, h = 9) => {
  applyPreset('prince'); flags(on); const L = { boxes: [floor, box('wood', -5, 30, 0.01, 0.02, -3, 3)], ropes: [] };
  const p = newPlayer(0, h, 0); p.vx = 5; p.fx = 1; p.fz = 0; let ev = [], recMax = 0;
  for (let i = 0; i < 200; i++) { step(p, { ...idle, mx }, dt, L); ev.push(...(L.events || [])); L.events = []; recMax = Math.max(recMax, p.recover); if (p.knockout) break; }
  return { p, ev, recMax };
};
{ const base = fall(false, 1); assert.ok(base.p.hardLands === 1 && base.recMax >= P.stunTime - 0.01, 'uten rulle: bedøvet (som før)');
  const r = fall(true, 1); assert.equal(r.p.hardLands, 0, 'med rulle og stikke: ikke bedøvet'); assert.equal(r.p.rolls, 1); assert.ok(r.recMax < 0.3, 'ingen bedøvelse');
  assert.ok(r.ev.some((e) => e.type === 'roll'), 'roll-hendelse logges');
  const s = fall(true, 0); assert.ok(s.p.hardLands === 1 && s.p.rolls === 0, 'uten stikke: bedøvet likevel');
  const k = fall(true, 1, 30); assert.ok(k.p.knockout && k.p.rolls === 0, 'farlig fall rulles ikke: tilbake til lagring');
  // uskadd-tid: nytt hardt fall like etter rullen gir ingen bedøvelse
  applyPreset('prince'); flags(true); const L = { boxes: [floor, box('wood', -5, 30, 0.01, 0.02, -3, 3)], ropes: [] }; const p = newPlayer(0, 9, 0); p.vx = 5;
  for (let i = 0; i < 80 && !p.rolls; i++) step(p, { ...idle, mx: 1 }, dt, L); assert.equal(p.rolls, 1); assert.ok(p.rollSafeT > 0.5, 'uskadd-tid etter rulle');
  p.y = 9; p.vy = 0; p.onGround = false; for (let i = 0; i < 80; i++) step(p, { ...idle, mx: 1 }, dt, L); assert.equal(p.hardLands, 0, 'uskadd i rulletiden');
  const sp0 = fall(true, 1); assert.ok(Math.hypot(sp0.p.vx, sp0.p.vz) > 0.5, 'rullen beholder fart'); }
// forsiktig gange: lett stikke er tregere, og stopper ved kanten uten å falle
{ applyPreset('prince'); const L = { boxes: [floor, box('wood', -5, 5, 0, 4, -3, 3)], ropes: [] };
  const dist = (on, mag) => { flags(false); P.carefulOn = on; const p = newPlayer(-3, 4, 0); for (let i = 0; i < 20; i++) step(p, { ...idle }, dt, L); for (let i = 0; i < 90; i++) step(p, { ...idle, mx: mag }, dt, L); return p.x + 3; };
  const d0 = dist(false, 0.4), d1 = dist(true, 0.4); assert.ok(d1 < d0 * 0.9 && d1 > 0.3, `forsiktig gange er sakte (${d1.toFixed(2)} mot ${d0.toFixed(2)})`);
  assert.ok(Math.abs(dist(true, 1) - dist(false, 1)) < 1e-6, 'full stikke upåvirket');
  flags(true); P.edgeGuard = true; const p = newPlayer(0, 4, 0); for (let i = 0; i < 20; i++) step(p, { ...idle }, dt, L);
  for (let i = 0; i < 600; i++) step(p, { ...idle, mx: 0.35 }, dt, L); assert.ok(p.y > 3.99 && p.x > 4.4 && p.x <= 5.01, `lett stikke stopper ved kanten, faller ikke (x=${p.x.toFixed(2)}, y=${p.y.toFixed(2)})`); P.edgeGuard = false; }
// tau: tyngre sving (lengre periode, treghet)
{ applyPreset('mario'); const L = { boxes: [floor], ropes: [{ x: 0, y: 12, z: 0, len: 8 }] };
  const swing = (heavy) => { flags(false); P.ropeHeavy = heavy; const p = newPlayer(0.5, 5, 0); p.vy = 2; const xs = []; let sw = false, crossings = [];
    for (let i = 0; i < 900; i++) { step(p, { ...idle, mx: 0, grabHeld: true, grabPressed: i < 30 }, dt, L); if (p.state === 'swing') { sw = true; xs.push(p.x); } else if (sw) break; }
    for (let i = 1; i < xs.length; i++) if (xs[i - 1] * xs[i] < 0) crossings.push(i);
    return { sw, n: xs.length, crossings, amp: Math.max(...xs.map(Math.abs)) }; };
  const a = swing(false), b = swing(true); assert.ok(a.sw && b.sw, 'fanger tauet');
  assert.ok(a.crossings.length >= 3 && b.crossings.length >= 3, 'svinger frem og tilbake');
  const per = (r) => (r.crossings[2] - r.crossings[0]) * dt; assert.ok(per(b) > per(a) * 1.05, `lengre periode (${per(b).toFixed(2)} s mot ${per(a).toFixed(2)} s)`); }
// fysikken er uendret når alt er av (ren fysikk), og flaggene er av som standard
flags(false); for (const k of ['shimmy', 'rollOn', 'carefulOn', 'ropeHeavy']) assert.equal(P[k], false);
// modulen ligger i files i index.html
assert.ok(/'finpuss'/.test(fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8')), 'finpuss ligger i files i index.html');
console.log('finpuss: ok');
