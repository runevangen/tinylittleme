// node test_heromove.mjs: R40, snu med skritt, tråkke over små hindre (og at høye hindre stopper), poser for heng/veggglid/sving.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { MOVE, createTurnSteps, canStepOver, effectiveStepUp, createStepOver, gripPose } from './hero_move.js';
import { P, box, newPlayer, step, applyPreset } from './physics.js';

const DT = 1 / 60;
// ---- snu med skritt ----
{
  const t = createTurnSteps(); let n = 0, maxL = 0, maxR = 0, feet = [];
  for (let i = 0; i < 90; i++) { const o = t.update(DT, { yawRate: 3, standing: true }); if (o.stepped) { n++; feet.push(o.foot); } maxL = Math.max(maxL, o.liftL); maxR = Math.max(maxR, o.liftR); assert.ok(!(o.liftL > 0 && o.liftR > 0), 'bare en fot i lufta'); }
  assert.ok(n >= 5, `raskt snu gir flere skritt på 1,5 s (${n})`);
  assert.ok(feet.every((f, i) => i === 0 || f !== feet[i - 1]), 'annenhver fot');
  assert.ok(maxL > 0.03 && maxL <= MOVE.turnLift + 1e-9 && maxR > 0.03, 'fotløft innenfor grensen');
  const q = createTurnSteps(); for (let i = 0; i < 60; i++) assert.ok(!q.update(DT, { yawRate: 0.9, standing: true }).active, 'sakte snu: ingen skritt');
  const g = createTurnSteps(); for (let i = 0; i < 60; i++) assert.ok(!g.update(DT, { yawRate: 4, standing: false }).active, 'i fart: ingen snuskritt');
  const off = createTurnSteps(); for (let i = 0; i < 60; i++) assert.ok(!off.update(DT, { yawRate: 4, standing: true, on: false }).active, 'av: ingen skritt');
  const d = createTurnSteps(); let o; for (let i = 0; i < 10; i++) o = d.update(DT, { yawRate: -3, standing: true }); assert.equal(o.dir, -1, 'retning følger snuretningen');
  const e = createTurnSteps(); for (let i = 0; i < 20; i++) e.update(DT, { yawRate: 3, standing: true }); for (let i = 0; i < 40; i++) o = e.update(DT, { yawRate: 0, standing: true }); assert.ok(!o.active && o.liftL === 0 && o.liftR === 0, 'stopper når stikka slippes');
}
// ---- tråkke over: grenser ----
{
  assert.ok(canStepOver(0.1) && canStepOver(MOVE.stepOverMax) && !canStepOver(0.01) && !canStepOver(0.16) && !canStepOver(NaN) && !canStepOver(0.1, 0), 'canStepOver grenser');
  assert.equal(effectiveStepUp(0, 0.15, true), 0.15, 'Prince med hjelp: små hindre tråkkes over');
  assert.equal(effectiveStepUp(0, 0.15, false), 0, 'ingen hjelp: ingenting tråkkes over');
  assert.equal(effectiveStepUp(0.6, 0.15, true), 0.6, 'mye hjelp: høyeste vinner');
  const s = createStepOver(); assert.ok(!s.trigger(0.5) && !s.update(DT).active, 'for høyt: ingen animasjon');
  assert.ok(s.trigger(0.1) && s.out.started === true); let mx = 0, act = 0; for (let i = 0; i < 30; i++) { const o = s.update(DT); mx = Math.max(mx, o.lift); act += o.active ? 1 : 0; }
  assert.ok(mx > 0.1 && mx <= 0.1 + 0.035 + 1e-9, `foten løftes over kanten (${mx})`); assert.ok(act > 5 && !s.update(DT).active, 'slutter');
  const f1 = (s.trigger(0.1), s.out.foot, s.update(DT).foot); s.update(1); s.trigger(0.1); assert.notEqual(s.update(DT).foot, f1, 'annenhver fot');
}
// ---- fysikk: små hindre gås over uten hopp, høye stopper ----
{
  const floor = box('floor', -50, 50, -2, 0, -50, 50), idle = { mx: 0, mz: 0, jumpPressed: false, jumpHeld: false, grabPressed: false, grabHeld: false };
  const walk = (h) => { const L = { boxes: [floor, box('wood', 2, 6, 0, h, -3, 3)], ropes: [] }; const p = newPlayer(0, 0, 0); p.fx = 1; p.fz = 0; for (let i = 0; i < 20; i++) step(p, { ...idle }, DT, L); for (let i = 0; i < 150; i++) step(p, { ...idle, mx: 1 }, DT, L); return p; };
  applyPreset('prince'); const base = P.stepUp; P.stepUp = effectiveStepUp(base, MOVE.stepOverMax, true);
  let p = walk(0.1); assert.ok(p.x > 3 && !p.jumping, `0,1 høyt hinder tråkkes over uten hopp (x=${p.x.toFixed(2)})`);
  p = walk(0.3); assert.ok(p.x < 2.1, `0,3 høyt hinder over grensen stopper fortsatt (x=${p.x.toFixed(2)})`);
  p = walk(1.5); assert.ok(p.x < 2.1, 'høyt hinder stopper');
  P.stepUp = effectiveStepUp(base, MOVE.stepOverMax, false); p = walk(0.1); assert.ok(p.x < 2.1, 'uten hjelp: også 0,1 stopper (som før)');
  P.stepUp = 0; applyPreset('klassisk');
}
// ---- poser ----
{
  const fin = (o) => Object.values(o).every(Number.isFinite);
  for (const k of ['hang', 'slide', 'swing']) for (const o of [{}, { sec: 3, speed: 2, signed: 3, tired: 1, vy: -9 }, { sec: 1, speed: 0.5, signed: -4, tired: 0.3, vy: -2 }]) assert.ok(fin(gripPose(k, o)), `${k} endelige tall`);
  const hs = []; for (let i = 0; i < 40; i++) { const g = gripPose('hang', { sec: i * 0.05, speed: 1.5 }); hs.push(g.aL - g.aR); }
  assert.ok(Math.max(...hs) > 0.2 && Math.min(...hs) < -0.2, 'heng i bevegelse: hendene skifter på å ta tak');
  const still = gripPose('hang', { sec: 0.3, speed: 0 }); assert.ok(Math.abs(still.aL - still.aR) < 1e-9, 'heng i ro: begge hender like');
  assert.ok(gripPose('hang', { tired: 1 }).eL < gripPose('hang', { tired: 0 }).eL, 'trett: albuene bøyes mer');
  assert.ok(gripPose('hang', { signed: 2, speed: 2 }).roll < 0 && gripPose('hang', { signed: -2, speed: 2 }).roll > 0, 'heng: kroppen heller med farten');
  assert.ok(gripPose('slide', { vy: -6 }).lean > gripPose('slide', { vy: 0 }).lean && gripPose('slide').aL < -2.5, 'veggglid: armene opp, lener mot veggen med fart');
  assert.ok(gripPose('swing', { signed: 6 }).lean < 0 && gripPose('swing', { signed: -6 }).lean > 0 && gripPose('swing', { signed: 6 }).hL < gripPose('swing', { signed: 0 }).hL, 'sving: lener og bena slenger med farten');
}
// ---- koblinger i main.js og index.html ----
{
  const m = fs.readFileSync(new URL('./main.js', import.meta.url), 'utf8'), h = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
  assert.ok(/from '\.\/hero_move\.js'/.test(m) && h.includes("'hero_move'"), 'hero_move i main.js og files');
  assert.ok(/turnSteps\.update\(dt/.test(m) && /stepOverAnim\.trigger\(p\.stepDy/.test(m) && /gripPose\(gs/.test(m), 'poseHero bruker modulen');
  for (const id of ['turnsteps', 'stepover', 'gripposes', 'smallstep']) assert.ok(new RegExp(`id: '${id}'|fl\\('${id}'`).test(m), `SETTINGS: ${id}`);
  for (const ev of ['snusteg', 'trinn', 'grepspose']) assert.ok(m.includes(`logEv('${ev}'`), `logEv ${ev}`);
  assert.ok(/effectiveStepUp\(lv\.stepUp, smallStepH/.test(m), 'reapplyKnobs bruker smallStepH');
}
console.log('test_heromove: OK');
