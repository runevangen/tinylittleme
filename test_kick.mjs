// node test_kick.mjs: R34, sprettboksen kaster figuren. Kastvektor, uskadd-tid, bare den som står på boksen, og alle brett med sprettboks.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { P, newPlayer, initBodies, step, applyPreset, inHazard, PRESETS } from './physics.js';
import { createToyLife, stepToys } from './toys_live.js';
import { KICK, kickVector, tryKick, tickKick, standsOn } from './toy_kick.js';
import { createReact } from './polish.js';
import { LINES } from './voice.js';

const DT = 1 / 60;
const box = { id: 'j', min: [-1.4, 0, -1.4], max: [1.4, 2.8, 1.4] };

// ---- kastvektor: bort fra boksens midte, opp, begrenset ----
{
  const k = kickVector(box, { x: 1, z: 0, fx: 0, fz: 1 });
  assert.ok(k.vx > 0 && Math.abs(k.vz) < 1e-9, 'bort fra midten (+x)'); assert.ok(Math.abs(Math.hypot(k.vx, k.vz) - KICK.speed) < 1e-9, 'fart = KICK.speed');
  assert.equal(k.vy, KICK.up); assert.ok(k.vy > 0);
  const d = kickVector(box, { x: -0.5, z: -0.5, fx: 0, fz: 1 }); assert.ok(d.vx < 0 && d.vz < 0 && Math.abs(d.vx - d.vz) < 1e-9, 'diagonal');
  const mid = kickVector(box, { x: 0, z: 0, fx: 1, fz: 0 }); assert.ok(mid.vx > 0 && Math.abs(mid.vz) < 1e-9, 'midt på: blikkretningen');
  const cap = kickVector(box, { x: 1, z: 0 }, { ...KICK, speed: 99 }); assert.ok(Math.hypot(cap.vx, cap.vz) <= KICK.maxSpeed + 1e-9, 'tak på farten');
}
// ---- tryKick: bare den som står på boksen; av = ingenting; pause ----
{
  const p = newPlayer(1, 2.8, 0); p.onGround = true; p.groundBox = box; p.state = 'ground';
  const off = tryKick(p, box, { ...KICK, on: false }); assert.equal(off, null); assert.equal(p.vy, 0, 'av: uendret');
  const other = newPlayer(5, 0, 5); other.onGround = true; other.groundBox = { id: 'gulv' };
  assert.equal(tryKick(other, box), null, 'står ikke på boksen'); assert.equal(other.vy, 0);
  const air = newPlayer(1, 3, 0); air.groundBox = box; air.onGround = false; assert.equal(tryKick(air, box), null, 'i lufta over boksen: ikke kastet'); assert.ok(!standsOn(air, box));
  const k = tryKick(p, box); assert.ok(k); assert.equal(p.vy, KICK.up); assert.ok(p.vx > 0); assert.equal(p.onGround, false); assert.equal(p.state, 'air');
  assert.equal(p.safeT, KICK.safeT); assert.ok(p.kickCd > 0);
  p.onGround = true; p.groundBox = box; assert.equal(tryKick(p, box), null, 'pause: ikke kastet igjen med en gang');
  tickKick(p, KICK.cool + 0.01); assert.equal(p.kickCd, 0); assert.ok(p.safeT > 0 && p.safeT < KICK.safeT, 'uskadd-tid teller ned');
  tickKick(p, 10); assert.equal(p.safeT, 0);
}
// ---- uskadd: hard landing / knockout fra kastet gir ingen straff, ellers vanlig straff ----
{
  applyPreset('prince');
  const floor = { type: 'wood', id: 'gulv', min: [-30, -2, -30], max: [30, 0, 30] };
  const run = (safe) => { const L = { boxes: [floor], ropes: [], hazards: [], movables: [] }; initBodies(L); const p = newPlayer(0, 14, 0); p.safeT = safe; for (let i = 0; i < 120; i++) step(p, { mx: 0, mz: 0 }, DT, L); return p; };
  const hurt = run(0), safe = run(1.5);
  assert.ok(hurt.knockout || hurt.hardLands > 0, 'uten uskadd-tid: straff ved hardt fall');
  assert.ok(!safe.knockout && safe.hardLands === 0, 'med uskadd-tid: ingen straff');
  applyPreset('mario');
}
// ---- hendelse: bare landing på boksen gir onTop; TA gir ikke ----
{
  const floor = { type: 'wood', id: 'gulv', min: [-30, -2, -30], max: [30, 0, 30] };
  const mkL = () => { const L = { boxes: [floor], ropes: [], hazards: [], movables: [{ id: 'j', kind: 'jackbox', material: 'plastic', color: 1, min: [-1.4, 0, -1.4], max: [1.4, 2.8, 1.4], weight: 'medium' }] }; initBodies(L); return L; };
  const L = mkL(), S = createToyLife(L), p = newPlayer(0.8, 6, 0), evs = [];
  for (let i = 0; i < 120; i++) { step(p, { mx: 0, mz: 0 }, DT, L); for (const ev of stepToys(S, L, p, DT)) { evs.push(ev); if (ev.act === 'pop' && ev.onTop) tryKick(p, L.bodies.find((b) => b.id === ev.id)); } tickKick(p, DT); }
  assert.ok(evs.some((e) => e.act === 'pop' && e.onTop), 'landing: pop med onTop'); assert.ok(p.x > 0.8 + 1, `kastet bort (+x), x=${p.x.toFixed(2)}`);
  const L2 = mkL(), S2 = createToyLife(L2), q = newPlayer(8, 0, 8); L2.bodies[0].carried = true;
  const e2 = stepToys(S2, L2, q, DT); assert.ok(e2.some((e) => e.act === 'pop') && !e2.some((e) => e.onTop), 'TA: pop uten onTop'); assert.equal(tryKick(q, L2.bodies[0]), null, 'figuren som ikke står på boksen påvirkes ikke'); assert.equal(q.vy, 0);
}
// ---- reaksjon og replikk ----
{ const r = createReact(); r.trigger('thrown'); let m = 0; for (let i = 0; i < 20; i++) m = Math.max(m, r.update(0.05).armsUp); assert.ok(m > 0.9, 'armene opp'); assert.ok(!r.update(2).active, 'ferdig');
  assert.ok(LINES.thrown && LINES.thrown.say.length >= 1); }
// ---- alle brett med sprettboks: kast fra alle kanter lander trygt, ikke i fare, ikke urettferdig langt ----
for (const preset of Object.keys(PRESETS)) {
  applyPreset(preset);
  for (const lv of fs.readdirSync('levels').filter((f) => f.endsWith('.level.json'))) {
    const src = JSON.parse(fs.readFileSync(`levels/${lv}`, 'utf8')); const jb = (src.movables || []).filter((m) => m.kind === 'jackbox'); if (!jb.length) continue;
    for (const m of jb) for (const [ox, oz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [.7, .7], [-.7, .7], [.7, -.7], [-.7, -.7], [0, 0]]) {
      const L = JSON.parse(JSON.stringify(src)); initBodies(L); const S = createToyLife(L); const b = L.bodies.find((x) => x.id === m.id);
      const hx = (b.max[0] - b.min[0]) / 2 * 0.8, hz = (b.max[2] - b.min[2]) / 2 * 0.8, cx = (b.min[0] + b.max[0]) / 2, cz = (b.min[2] + b.max[2]) / 2;
      const p = newPlayer(cx + ox * hx, b.max[1] + 0.05, cz + oz * hz); p.fx = 0; p.fz = 1;
      let kicked = false, dmg = false, hz2 = false, maxD = 0;
      for (let i = 0; i < 60 * 5; i++) {
        step(p, { mx: 0, mz: 0 }, DT, L);
        for (const ev of stepToys(S, L, p, DT)) if (ev.act === 'pop' && ev.onTop && tryKick(p, b)) kicked = true;
        tickKick(p, DT); if (p.knockout || p.hardLands) dmg = true; if (inHazard(L, p)) hz2 = true; maxD = Math.max(maxD, Math.hypot(p.x - cx, p.z - cz));
      }
      const tag = `${preset}/${lv}/${m.id}/${ox},${oz}`;
      assert.ok(kicked, `${tag}: kastet`); assert.ok(!dmg, `${tag}: ingen straff fra kastet`); assert.ok(!hz2, `${tag}: ikke i fare`);
      assert.ok(maxD < 9, `${tag}: ikke urettferdig langt (${maxD.toFixed(1)})`); assert.ok(p.onGround && p.y > -1, `${tag}: står trygt etterpå (y=${p.y.toFixed(1)})`);
    }
  }
}
applyPreset('mario');
console.log('kast-tester grønne');
