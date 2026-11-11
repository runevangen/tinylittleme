// node test_boss.mjs: logikk for sjef-maur (R9) og at nivå 6 har en rettferdig sjef-arena.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { BOSS, initBoss, resetBoss, stepBoss, bossPhase } from './boss.js';
import { box, newPlayer, step, applyPreset } from './physics.js';

const mkL = () => ({ boxes: [box('floor', -40, 40, -2, 0, -40, 40), box('wall', -41, -40, 0, 40, -40, 40), box('wall', 14, 15, 0, 40, -40, 40), box('wall', -40, 40, 0, 40, -41, -40), box('wall', -40, 40, 0, 40, 40, 41)], room: { x0: -40, x1: 15, z0: -40, z1: 40 }, boss: { id: 'sjef', a: [0, 0, 0], b: [4, 0, 0] } });
const far = { x: 30, y: 0, z: 30, vx: 0, vy: 0, vz: 0, state: 'ground', fx: 1, fz: 0 };
const run = (L, p, sec, f, until) => { const ev = []; for (let t = 0; t < sec; t += 1 / 60) { for (const e of stepBoss(L, p, 1 / 60, true)) ev.push(e); f?.(); if (until && ev.some((e) => e.type === until)) break; } return ev; };

// uten brett-sjef: ingenting skjer
{ const L = { boxes: [] }; initBoss(L); assert.equal(L.bossS, null); assert.deepEqual(stepBoss(L, far, 0.1), []); }

// patrulje: går mellom endepunktene
{ const L = mkL(); initBoss(L); const xs = []; run(L, far, 20, () => xs.push(L.bossS.x)); assert.ok(Math.max(...xs) > 3.5 && Math.min(...xs) < 0.5, 'patruljerer fram og tilbake'); assert.equal(L.bossS.mode, 'patrol'); }

// full kamp: varsel → støt i veggen → svimmel → 3 hopp = slått → premie
{
  const L = mkL(); initBoss(L); const b = L.bossS, p = { x: -12, y: 0, z: 0, vx: 0, vy: 0, vz: 0, state: 'ground', fx: 1, fz: 0 }; b.x = 2; b.cool = 0;
  assert.equal(bossPhase(b), 1);
  const seen = [];
  for (let hit = 0; hit < 3; hit++) {
    b.x = 2; b.z = 0; p.x = b.x + 6; p.z = 0; b.x = 0; p.y = 0; p.vy = 0; p.state = 'ground'; b.cool = 0; b.mode = 'patrol'; b.mt = 0; b.wait = 0;
    let ev = run(L, p, 1.4); seen.push(...ev.map((e) => e.type));
    assert.ok(ev.some((e) => e.type === 'alert'), 'varsler før støtet');
    assert.equal(b.mode, 'charge', 'stormer etter varselet'); assert.ok(Math.abs(b.dirx) > 0.9, 'retningen er låst');
    p.z = 12;                                                                    // gå til siden: bommer på deg
    ev = run(L, p, 6, null, 'bump'); seen.push(...ev.map((e) => e.type));
    assert.ok(ev.some((e) => e.type === 'bump'), 'smeller i veggen'); assert.equal(b.mode, 'stunned');
    assert.ok(b.x > 9 && b.x < 14, 'stoppet foran veggen');
    p.x = b.x; p.z = b.z; p.y = b.y + 1.0; p.vy = -4; p.state = 'air';           // hopp på ryggen
    ev = run(L, p, 0.05); seen.push(...ev.map((e) => e.type));
    assert.ok(ev.some((e) => e.type === 'hit'), 'hopp på svimmel sjef gir skade');
    assert.ok(p.vy > 5, 'du spretter opp');
    if (hit < 2) { assert.equal(b.mode, 'hit'); assert.equal(b.hp, 2 - hit); assert.equal(bossPhase(b), hit + 2); }
  }
  assert.equal(b.mode, 'dead'); assert.ok(seen.includes('defeat')); assert.ok(b.prize && !b.prize.taken);
  const ev = run(L, { x: b.prize.x, y: b.prize.y, z: b.prize.z, vx: 0, vy: 0, vz: 0, state: 'ground' }, BOSS.dying + 1);
  assert.ok(ev.some((e) => e.type === 'prize'), 'premien kan tas'); assert.ok(b.gone);
  resetBoss(L); assert.equal(b.hp, 3); assert.ok(!b.gone && b.mode === 'patrol' && !b.prize);
}

// rettferdig: støt mot en våken sjef gir tilbakestøt, pansret rygg gir bare sprett, svimmel sjef er ufarlig
{
  const L = mkL(); initBoss(L); const b = L.bossS; b.cool = 99;
  let p = { x: 0.5, y: 0, z: 0, vx: 0, vy: 0, vz: 0, state: 'ground', fx: 1, fz: 0 };
  let ev = run(L, p, 0.05); assert.ok(ev.some((e) => e.type === 'hurt')); assert.ok(Math.hypot(p.vx, p.vz) > 5 && p.vy > 3);
  assert.equal(b.hp, 3);
  b.mode = 'patrol'; b.mt = 0; L.antInvuln = 0; p = { x: b.x, y: b.y + 1.9, z: b.z, vx: 0, vy: -5, vz: 0, state: 'air', fx: 1, fz: 0 };
  ev = run(L, p, 0.02); assert.ok(ev.some((e) => e.type === 'clang') && p.vy > 4 && b.hp === 3, 'pansret rygg: bare sprett');
  b.mode = 'stunned'; b.mt = 0; L.antInvuln = 0; p = { x: b.x + 1, y: 0, z: b.z, vx: 0, vy: 0, vz: 0, state: 'ground', fx: 1, fz: 0 };
  ev = run(L, p, 0.5); assert.ok(!ev.some((e) => e.type === 'hurt'), 'svimmel: ufarlig å røre');
}

// bom i åpent rom: først pust, så slumper sjefen uansett (ingen fastlåst kamp)
{
  const L = mkL(); L.boxes = [box('floor', -400, 400, -2, 0, -400, 400)]; L.room = null; initBoss(L); const b = L.bossS; b.cool = 0; b.x = 0;
  const p = { x: 12, y: 0, z: 0, vx: 0, vy: 0, vz: 0, state: 'ground', fx: 1, fz: 0 };
  const ev = run(L, p, 16, () => { if (b.mode === 'windup' && b.wind > 0.7) p.z = 40; else if (b.mode === 'patrol') { p.z = b.z; p.x = b.x + 12; } });
  assert.ok(ev.some((e) => e.type === 'tired' && !e.worn), 'første bom: pust'); assert.ok(ev.some((e) => e.type === 'tired' && e.worn), 'andre bom: slumper');
}

// ekte fysikk: bare stikke + HOPP fra bakken lander på ryggen til en svimmel sjef
{
  applyPreset('klassisk');
  const L = mkL(); L.ropes = []; initBoss(L); const b = L.bossS; b.mode = 'stunned'; b.mt = 0; b.x = 10; b.z = 0;
  const p = newPlayer(6.5, 0, 0); let hit = false;
  for (let i = 0; i < 200 && !hit; i++) {
    step(p, { mx: i > 4 && i < 14 ? 1 : 0, mz: 0, jumpPressed: i === 10, jumpHeld: i >= 10 && i < 30, grabPressed: false, grabHeld: false }, 1 / 60, L);
    b.mt = 0;                                                                    // holder den svimmel
    for (const e of stepBoss(L, p, 1 / 60, true)) if (e.type === 'hit') hit = true;
  }
  assert.ok(hit, 'stikke + HOPP slår sjefen');
}

// bot i det ekte, store kjøkkenet (nivå 6): stikk til siden når den varsler, hopp på ryggen når den er svimmel. Ingen gjetting: etter høyst to støt er den svimmel (vegg eller utmattet), og tre hopp slår den.
{
  applyPreset('klassisk');
  const L = JSON.parse(fs.readFileSync('levels/kjokken2.level.json', 'utf8')); L.ropes = L.ropes || []; initBoss(L); const b = L.bossS;
  const p = newPlayer(b.a[0] + 9, 0, b.a[2] + 5); p.x = b.x + 9; p.z = b.z + 5;
  let holdT = 0, hits = 0, charges = 0, bumps = 0, worn = 0, hurts = 0, maxSincePhase = 0, sinceHit = 0, jumpCool = 0, t = 0;
  const T = (type) => type;
  while (t < 150 && !b.gone && b.mode !== 'dead') {
    let mx = 0, mz = 0, jump = false;
    const dx = b.x - p.x, dz = b.z - p.z, d = Math.hypot(dx, dz);
    if (b.mode === 'windup' || b.mode === 'charge') {                            // stikk vinkelrett på støtretningen (den låste retningen), bort fra veggene
      const fx = b.mode === 'charge' ? b.dirx : b.fx, fz = b.mode === 'charge' ? b.dirz : b.fz;
      let sx = -fz, sz = fx; if ((p.x + sx * 5 - L.room.x0) < 0 || p.x + sx * 5 > L.room.x1 || p.z + sz * 5 < L.room.z0 || p.z + sz * 5 > L.room.z1) { sx = -sx; sz = -sz; }
      if (Math.abs((p.x - b.x) * sx + (p.z - b.z) * sz) < 4) { mx = sx; mz = sz; }       // 4 m til siden holder
    } else if (b.mode === 'stunned') {
      if (d > 1.2) { mx = dx / d; mz = dz / d; }
      if (d < 3.4 && jumpCool <= 0) { jump = true; jumpCool = 0.6; holdT = 0.45; }
    } else if ((b.mode === 'patrol' || b.mode === 'tired' || b.mode === 'hit') && d < 7) { mx = -dx / d; mz = -dz / d; }       // pust ut: hold avstand
    else if (d > 11) { mx = dx / d; mz = dz / d; }                                  // for langt unna: gå nærmere så den ser deg
    jumpCool -= 1 / 60; holdT -= 1 / 60;
    step(p, { mx, mz, jumpPressed: jump, jumpHeld: jump || holdT > 0, grabPressed: false, grabHeld: false }, 1 / 60, L);
    for (const e of stepBoss(L, p, 1 / 60, true)) { if (e.type === 'charge') charges++; if (e.type === 'bump') bumps++; if (e.type === 'tired' && e.worn) worn++; if (e.type === 'hit') hits++; if (e.type === 'hurt') { hurts++; if (process.env.DBG) console.log('HURT', t.toFixed(1), b.mode, b.mt.toFixed(2), d.toFixed(1)); } }
    t += 1 / 60; if (process.env.DBG && Math.round(t * 60) % 30 === 0) console.log(t.toFixed(1), b.mode, b.x.toFixed(1), b.z.toFixed(1), 'p', p.x.toFixed(1), p.z.toFixed(1), p.y.toFixed(1), p.state, d.toFixed(1));
  }
  assert.ok(b.mode === 'dead' || b.gone, `boten slo sjefen med stikk + HOPP (treff ${hits}, støt ${charges}, vegg ${bumps}, utslitt ${worn}, au ${hurts}, tid ${t.toFixed(0)} s)`);
  assert.ok(hurts <= 3, `boten ble ikke truffet mer enn nødvendig (${hurts})`);
  console.log(`bot: sjef slått på ${t.toFixed(0)} s, ${charges} støt, ${bumps} i vegg, ${worn} utslitt, ${hurts} au`);
}

// nivå 6: sjefen har fri bane, står langt fra start og andre fiender; de andre brettene har ingen sjef
{
  for (const f of fs.readdirSync('levels').filter((n) => n.endsWith('.level.json'))) {
    const L = JSON.parse(fs.readFileSync(`levels/${f}`, 'utf8'));
    if (f !== 'kjokken2.level.json') { assert.ok(!L.boss, `${f}: sjefen hører hjemme i siste rom`); continue; }
    assert.ok(L.boss, 'nivå 6 har en sjef');
    const R = BOSS.rad + 0.3, solid = L.boxes.filter((x) => x.type !== 'floor' && x.type !== 'wall' && x.max[1] - x.min[1] > 0.5);
    for (let i = 0; i <= 40; i++) {
      const t = i / 40, x = L.boss.a[0] + (L.boss.b[0] - L.boss.a[0]) * t, z = L.boss.a[2] + (L.boss.b[2] - L.boss.a[2]) * t;
      for (const s of solid) assert.ok(!(x + R > s.min[0] && x - R < s.max[0] && z + R > s.min[2] && z - R < s.max[2]), `sjefen går inn i ${s.id}`);
      assert.ok(x - R > L.room.x0 && x + R < L.room.x1 && z - R > L.room.z0 && z + R < L.room.z1, 'sjefen er inne i rommet');
      assert.ok(Math.hypot(x - L.start[0], z - L.start[2]) > BOSS.alert + 4, 'sjefen ser deg ikke fra start');
    }
    for (const a of L.ants) for (let i = 0; i <= 40; i++) for (let j = 0; j <= 10; j++) {                    // ingen annen fiende går eller hopper inn i sjefens område
      const t = i / 40, u = j / 10, spiderR = a.type === 'spider' ? 4 : 0;
      assert.ok(Math.hypot(a.a[0] + (a.b[0] - a.a[0]) * t - (L.boss.a[0] + (L.boss.b[0] - L.boss.a[0]) * u), a.a[2] + (a.b[2] - a.a[2]) * t - (L.boss.a[2] + (L.boss.b[2] - L.boss.a[2]) * u)) > BOSS.rad + 1.5 + spiderR, `${a.id} er for nær sjefen`);
    }
  }
}
console.log('test_boss: OK');
