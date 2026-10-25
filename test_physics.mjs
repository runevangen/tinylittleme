// node tinylittleme/test_physics.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { P, box, newPlayer, step, freeAt, applyPreset, stepLength, inHazard, initBodies, resetBodies, drainEvents } from './physics.js';
import { LEVEL } from './level.js';

applyPreset('klassisk');
const floor = box('floor', -50, 50, -2, 0, -50, 50);
const run = (L, p, frames, inpFn) => {
  for (let i = 0; i < frames; i++) step(p, inpFn(i, p), 1 / 60, L);
};
const idle = { mx: 0, mz: 0, jumpPressed: false, jumpHeld: false, grabPressed: false, grabHeld: false };

// 1. enkelthopp når ca. v²/2g
{
  const L = { boxes: [floor], ropes: [] };
  const p = newPlayer(0, 0, 0);
  run(L, p, 10, () => idle);
  let max = 0;
  run(L, p, 90, (i) => { max = Math.max(max, p.y); return { ...idle, jumpPressed: i === 0, jumpHeld: true }; });
  const expect = P.jump ** 2 / (2 * -P.gravity);
  assert.ok(Math.abs(max - expect) < 0.15, `hopphøyde ${max} vs ${expect}`);
  assert.equal(p.state, 'ground');
}

// 2. dobbelthopp gir klart høyere enn enkelthopp
{
  const L = { boxes: [floor], ropes: [] };
  const p = newPlayer(0, 0, 0);
  run(L, p, 10, () => idle);
  let max = 0;
  run(L, p, 120, (i) => { max = Math.max(max, p.y); return { ...idle, jumpPressed: i === 0 || i === 22, jumpHeld: true }; });
  assert.ok(max > 4.3, `dobbelthopp ${max}`);
}

// 3. kort trykk gir lavere hopp (variabel hopphøyde)
{
  const L = { boxes: [floor], ropes: [] };
  const p = newPlayer(0, 0, 0);
  run(L, p, 10, () => idle);
  let max = 0;
  run(L, p, 90, (i) => { max = Math.max(max, p.y); return { ...idle, jumpPressed: i === 0, jumpHeld: false }; });
  assert.ok(max < 1.6, `kort hopp ${max}`);
}

// 4. kantgrep + opphiving på blokk 4.4 høy (krever dobbelthopp mot kanten)
{
  const L = { boxes: [floor, box('wood', 3, 45, 0, 4.4, -5, 5)], ropes: [] };
  const p = newPlayer(2, 0, 0);
  run(L, p, 10, () => idle);
  let hung = false;
  run(L, p, 160, (i) => {
    if (p.state === 'hang') hung = true;
    return { ...idle, mx: 1, jumpPressed: i === 0 || i === 14 || (p.state === 'hang' && i > 30), jumpHeld: true };
  });
  assert.ok(hung, 'burde hengt i kanten');
  assert.equal(p.state, 'ground');
  assert.ok(Math.abs(p.y - 4.4) < 0.01 && p.x > 3, `oppe på blokka (${p.x}, ${p.y})`);
}

// 5. veggsprang: to vegger, spilleren kommer høyere enn et enkelt dobbelthopp
{
  const L = { boxes: [floor, box('w', -2, -1, 0, 30, -5, 5), box('w', 1, 2, 0, 30, -5, 5)], ropes: [] };
  const p = newPlayer(0, 0, 0);
  run(L, p, 10, () => idle);
  let max = 0, cool = 0;
  run(L, p, 420, (i) => {
    max = Math.max(max, p.y); cool--;
    const touching = p.wallT > 0 && !p.onGround && p.wallN;
    const jp = i === 0 || (touching && cool <= 0 && p.vy <= 0);
    if (jp && i > 0) cool = 8;
    // inn mot veggen når den er nær, ellers mot motsatt vegg (blikkretning = utkast)
    const mx = i < 5 ? -1 : touching ? -p.wallN.nx : p.fx;
    return { ...idle, mx, jumpPressed: jp, jumpHeld: true };
  });
  assert.ok(max > 8, `veggsprang høyde ${max}`);
}

// 6. start og mål ligger fritt i brettet, og start står på gulvet
{
  const [sx, sy, sz] = LEVEL.start;
  assert.ok(freeAt(LEVEL, sx, sy, sz), 'start inni boks');
  const [gx, gy, gz] = LEVEL.goal;
  assert.ok(freeAt(LEVEL, gx, gy + 0.01, gz), 'mål inni boks');
}

// 7. tau: å gripe i lufta gir pendel, hopp slipper med fart
{
  const L = { boxes: [floor], ropes: [{ x: 0, y: 12, z: 0, len: 8 }] };
  const p = newPlayer(1, 5, 0);
  p.vx = -4;
  let swung = false;
  run(L, p, 120, (i) => {
    if (p.state === 'swing') swung = true;
    return { ...idle, grabPressed: i === 0, grabHeld: i < 60 };
  });
  assert.ok(swung, 'burde svinge');
  assert.notEqual(p.state, 'swing');
}

// ---- «Spenning»-innstillingen ------------------------------------------
applyPreset('spenning');

// 8. enkelthopp, og et ekstra trykk i lufta gjør ingenting (ingen dobbelthopp)
{
  const L = { boxes: [floor], ropes: [] };
  const p = newPlayer(0, 0, 0);
  run(L, p, 10, () => idle);
  let max = 0;
  run(L, p, 150, (i) => { max = Math.max(max, p.y); return { ...idle, jumpPressed: i === 0 || i === 20, jumpHeld: true }; });
  const expect = P.jump ** 2 / (2 * -P.gravity);
  assert.ok(Math.abs(max - expect) < 0.2, `spenning hopp ${max} vs ${expect}`);
}

// 9. kant grips bare når man rekker ut (GRIP) – ellers faller man
{
  const L = { boxes: [floor, box('wood', 3, 45, 0, 4.5, -5, 5)], ropes: [] };
  const trial = (reachAt) => {
    const p = newPlayer(2, 0, 0);
    run(L, p, 10, () => idle);
    let hung = false;
    run(L, p, 120, (i) => {
      if (p.state === 'hang') hung = true;
      return { ...idle, mx: 1, jumpPressed: i === 0, jumpHeld: true, grabPressed: i === reachAt, grabHeld: false };
    });
    return hung;
  };
  assert.equal(trial(-1), false, 'uten utrekning skal man ikke gripe kanten');
  assert.equal(trial(15), true, 'med utrekning i riktig øyeblikk skal man gripe kanten');
  assert.equal(trial(0), false, 'for tidlig utrekning (vinduet er over før kanten) skal bomme');
}

// 10. utrekning har pause: to trykk rett etter hverandre gir bare ett vindu
{
  const p = newPlayer(0, 5, 0);
  step(p, { ...idle, grabPressed: true }, 1 / 60, { boxes: [floor], ropes: [] });
  const first = p.reach;
  for (let i = 0; i < 40; i++) step(p, idle, 1 / 60, { boxes: [floor], ropes: [] });
  step(p, { ...idle, grabPressed: true }, 1 / 60, { boxes: [floor], ropes: [] });
  assert.ok(first > 0 && p.reach === 0, 'andre utrekning under pausen skal ignoreres');
}

// 11. glatt underlag: du bruker lengre tid på å stoppe enn på vanlig gulv
{
  const stopDist = (slick) => {
    const L = { boxes: [{ ...floor, slick }], ropes: [] };
    const p = newPlayer(0, 0, 0);
    run(L, p, 10, () => idle);
    run(L, p, 40, () => ({ ...idle, mx: 1 }));
    const x0 = p.x;
    run(L, p, 90, () => idle);
    return p.x - x0;
  };
  assert.ok(stopDist(true) > stopDist(false) * 3, 'glatt gulv skal gi lang bremselengde');
}

// 12. fare-volum oppdages
{
  const L = { boxes: [floor], ropes: [], hazards: [box('pit', 5, 10, 0, 6, -5, 5)] };
  assert.equal(inHazard(L, { x: 0, y: 0, z: 0 }), null);
  assert.ok(inHazard(L, { x: 7, y: 0, z: 0 }), 'burde treffe faren');
}

// ---- Bevegelige ting -----------------------------------------------------
const mv = (id, weight, x0, x1, y0, y1, z0, z1, extra = {}) => ({ id, material: 'plastic', weight, min: [x0, y0, z0], max: [x1, y1, z1], ...extra });
const world = (movables, boxes = [], hazards = []) => { const L = { boxes: [floor, ...boxes], ropes: [], movables, hazards }; initBodies(L); return L; };
const body = (L, id) => L.bodies.find((b) => b.id === id);

// 13. dytting: lett flytter seg mest, tung minst
{
  const dist = (w) => {
    const L = world([mv('k', w, 3, 5, 0, 2, -1, 1)]);
    const p = newPlayer(0, 0, 0);
    run(L, p, 10, () => idle);
    const x0 = body(L, 'k').min[0];
    run(L, p, 90, () => ({ ...idle, mx: 1 }));
    return body(L, 'k').min[0] - x0;
  };
  const l = dist('light'), m = dist('medium'), h = dist('heavy');
  assert.ok(l > m * 1.4 && m > h * 1.4 && h > 0.3, `dytting lett ${l.toFixed(2)} medium ${m.toFixed(2)} tung ${h.toFixed(2)}`);
}

// 14. tyngdekraft og stabling
{
  const L = world([mv('a', 'medium', 0, 2, 5, 7, 0, 2), mv('b', 'medium', 0, 2, 9, 11, 0, 2)]);
  const p = newPlayer(20, 0, 20);
  run(L, p, 120, () => idle);
  assert.ok(Math.abs(body(L, 'a').min[1]) < 1e-6 && Math.abs(body(L, 'b').min[1] - 2) < 1e-6, 'a på gulvet, b oppå a');
}

// 15. skjøre ting knuses ved fall, robuste ikke; lavt fall er trygt
{
  const L = world([mv('glass', 'light', 0, 1, 12, 13, 0, 1, { breakable: true }), mv('plast', 'light', 5, 6, 12, 13, 0, 1), mv('lavt', 'light', 9, 10, 2.5, 3.5, 0, 1, { breakable: true })]);
  const p = newPlayer(20, 0, 20);
  run(L, p, 120, () => idle);
  assert.equal(body(L, 'glass').alive, false, 'glass skal knuses');
  assert.equal(body(L, 'plast').alive, true, 'plast skal tåle fallet');
  assert.equal(body(L, 'lavt').alive, true, 'lavt fall skal ikke knuse');
  assert.ok(drainEvents(L).some((e) => e.type === 'broke' && e.id === 'glass'));
  resetBodies(L, p);
  assert.equal(body(L, 'glass').alive, true, 'nullstilling gjenoppretter');
}

// 16. ting som faller på deg: knust
{
  const L = world([mv('tung', 'heavy', -1, 1, 8, 10, -1, 1)]);
  const p = newPlayer(0, 0, 0);
  run(L, p, 90, () => idle);
  assert.equal(p.crushed, 'tung', 'skal registrere klemt');
}

// 17. bæring: lett kan bæres og slippes, tung kan ikke
{
  const L = world([mv('lett', 'light', 1, 2.5, 0, 1.5, -0.7, 0.7), mv('tung', 'heavy', 6, 8, 0, 2, -1, 1)]);
  const p = newPlayer(0, 0, 0); p.fx = 1; p.fz = 0;
  run(L, p, 10, () => idle);
  step(p, { ...idle, carryPressed: true }, 1 / 60, L);
  assert.equal(p.carry?.id, 'lett', 'skal ta tak i den lette');
  const x0 = body(L, 'lett').min[0];
  run(L, p, 40, () => ({ ...idle, mx: 1 }));
  assert.ok(body(L, 'lett').min[0] > x0 + 1.5, 'bæres med');
  step(p, { ...idle, carryPressed: true }, 1 / 60, L);
  assert.equal(p.carry, null, 'slippes');
  run(L, p, 60, () => idle);
  assert.ok(Math.abs(body(L, 'lett').min[1]) < 1e-6, 'lander på gulvet');
  const L2 = world([mv('tung', 'heavy', 6, 8, 0, 2, -1, 1)]);
  const p2 = newPlayer(4.5, 0, 0); p2.fx = 1; p2.fz = 0;
  step(p2, { ...idle, carryPressed: true }, 1 / 60, L2);
  assert.equal(p2.carry, null, 'tung kan ikke bæres');
}

// 18. ting som havner i en fare forsvinner
{
  const L = world([mv('k', 'light', 5, 6, 3, 4, 0, 1)], [], [box('pit', 4, 8, 0, 2, -2, 2)]);
  const p = newPlayer(20, 0, 20);
  run(L, p, 120, () => idle);
  assert.equal(body(L, 'k').alive, false);
  assert.ok(drainEvents(L).some((e) => e.type === 'lost'));
}

// 19. spiller kan stå på en dyttet kasse og komme opp på noe høyere
{
  const L = world([mv('kasse', 'medium', 4, 8, 0, 3, -2, 2)], [box('wood', 12, 20, 0, 7, -5, 5)]);
  const p = newPlayer(0, 0, 0);
  run(L, p, 10, () => idle);
  run(L, p, 150, () => ({ ...idle, mx: 1 }));                   // dytt kassa inntil hylla
  assert.ok(body(L, 'kasse').max[0] > 10.5, `kassa dyttet fram (${body(L, 'kasse').max[0].toFixed(2)})`);
  // hopp opp på kassa
  p.x = body(L, 'kasse').min[0] - 1.2; p.y = 0; p.vx = p.vy = 0;
  run(L, p, 15, () => idle);
  run(L, p, 60, (i) => ({ ...idle, mx: 1, jumpPressed: i === 0, jumpHeld: true }));
  assert.ok(p.y >= 2.9, `på kassa (y=${p.y.toFixed(2)})`);
}

// 20. stabel: dytter du den nedre ut, glir den øvre av og faller; står du i veien blir du klemt
{
  const L = world([mv('ned', 'medium', 0, 4, 0, 3, -2, 2), mv('opp', 'light', 0.5, 3.5, 3, 5, -1.5, 1.5)]);
  const p = newPlayer(-3, 0, 0);
  run(L, p, 20, () => idle);
  assert.ok(Math.abs(body(L, 'opp').min[1] - 3) < 1e-6, 'oppe på den nedre mens den står');
  let crushed = null;
  run(L, p, 400, () => { if (p.crushed) crushed = p.crushed; return { ...idle, mx: body(L, 'opp').min[1] < 2.99 ? 0 : 1 }; });   // blir stående når den begynner å falle
  assert.ok(Math.abs(body(L, 'opp').min[1]) < 1e-6, 'øvre har falt ned');
  assert.equal(crushed, 'opp', 'du ble stående under og klemt');
}

// ---- «Prince»: gange med skritt ------------------------------------------
applyPreset('prince');
const emptyL = () => ({ boxes: [floor], ropes: [] });
const stand = (x = 0, z = 0) => { const p = newPlayer(x, 0, z); return p; };      // blikk mot +z
const fwd = { ...idle, mz: 1 };

// 21. fart bygges opp, forsiktig gange, og full fart nås
{
  const L = emptyL(), p = stand();
  run(L, p, 10, () => idle);
  run(L, p, 6, () => fwd);                                              // 0,1 s
  assert.ok(p.vz > 0.3 && p.vz < P.speed * 0.5, `fart etter 0,1 s: ${p.vz.toFixed(2)}`);
  run(L, p, 120, () => fwd);
  assert.ok(Math.abs(p.vz - P.speed) < 0.01, `full fart (${p.vz.toFixed(2)})`);
  const q = stand(10, 0);
  run(L, q, 120, () => ({ ...fwd, walk: true }));
  assert.ok(Math.abs(q.vz - P.speed * P.walkFactor) < 0.01, `gå forsiktig: ${q.vz.toFixed(2)}`);
}

// 22. snu på stedet: du går ikke før kroppen peker riktig vei
{
  const L = emptyL(), p = stand();                                      // blikk +z
  run(L, p, 10, () => idle);
  run(L, p, 6, () => ({ ...idle, mz: -1 }));                            // 0,1 s mot motsatt vei
  assert.ok(Math.abs(p.z) < 0.02 && p.fz > -0.9, `snur først (z=${p.z.toFixed(3)}, blikk ${p.fz.toFixed(2)})`);
  run(L, p, 60, () => ({ ...idle, mz: -1 }));
  assert.ok(p.fz < -0.95, 'kroppen har snudd');
  run(L, p, 120, () => ({ ...idle, mz: -1 }));
  assert.ok(p.vz < -1, 'går nå i den nye retningen');
}

// 23. retningsskifte i fart tar tid: bremser og svinger, mye tregere enn «klassisk»
{
  const timeToReverse = (preset) => {
    applyPreset(preset);
    const L = emptyL(), p = stand();
    run(L, p, 10, () => idle);
    run(L, p, 150, () => fwd);
    let t = 0;
    for (; t < 600 && p.vz > -0.5; t++) step(p, { ...idle, mz: -1 }, 1 / 60, L);   // til du går motsatt vei
    return t;
  };
  const classic = timeToReverse('klassisk'), prince = timeToReverse('prince');
  assert.ok(prince > classic * 3 && prince > 30, `prince ${prince} vs klassisk ${classic} bilder`);
  applyPreset('prince');
}

// 24. ingen sideveis gliding: farten er alltid langs blikkretningen mens du går
{
  const L = emptyL(), p = stand();
  run(L, p, 10, () => idle);
  run(L, p, 120, () => fwd);
  let maxSlip = 0;
  run(L, p, 120, () => { maxSlip = Math.max(maxSlip, Math.abs(p.vx * p.fz - p.vz * p.fx)); return { ...idle, mx: 1 }; });   // 90° sving
  assert.ok(maxSlip < 1e-6, `sideveis fart ${maxSlip}`);
  assert.ok(p.fx > 0.9, 'svingte');
}

// 25. ett trykk = ett skritt: et kort trykk gir en liten, avsluttet bevegelse som stopper på skrittgrensen
{
  const L = emptyL();
  const tap = (frames) => {
    const p = stand();
    run(L, p, 10, () => idle);
    run(L, p, frames, () => fwd);
    run(L, p, 150, () => idle);
    return p;
  };
  const p1 = tap(3), p2 = tap(30);
  assert.ok(p1.z > 0.1 && p1.z < 0.9, `et kort trykk gir ett skritt (z=${p1.z.toFixed(2)})`);
  assert.ok(p2.z > p1.z + 0.3, `et lengre trykk går lengre (z=${p2.z.toFixed(2)})`);
  for (const p of [p1, p2]) {
    const r = p.gait % Math.PI;
    assert.ok(Math.hypot(p.vx, p.vz) < 0.01 && (r < 0.06 || r > Math.PI - 0.06), `stopper på skrittgrensen (fase ${p.gait.toFixed(2)})`);
  }
}

// 26. skrittlengde vokser med farten
{
  assert.ok(stepLength(3.6) > stepLength(1.5) && stepLength(1.5) > stepLength(0.2) - 1e-9 && stepLength(0.2) >= P.stepMin);
}

// 27. løpehopp går lengre enn stående hopp
{
  const jumpDist = (run0) => {
    const L = emptyL(), p = stand();
    run(L, p, 10, () => idle);
    run(L, p, run0, () => fwd);
    const z0 = p.z;
    step(p, { ...fwd, jumpPressed: true, jumpHeld: true }, 1 / 60, L);
    run(L, p, 150, (i) => ({ ...(run0 ? fwd : idle), jumpHeld: i < 60 }));
    return p.z - z0;
  };
  const standing = jumpDist(0), running = jumpDist(150);
  assert.ok(running > standing + 3 && running > 5, `løpehopp ${running.toFixed(2)} vs stående ${standing.toFixed(2)}`);
}

// 28. hopp har forberedelse: ingen fart opp rett etter trykket, men hopper like etter
{
  const L = emptyL(), p = stand();
  run(L, p, 10, () => idle);
  step(p, { ...idle, jumpPressed: true, jumpHeld: true }, 1 / 60, L);
  run(L, p, 2, () => ({ ...idle, jumpHeld: true }));
  assert.ok(p.windup > 0 && p.y === 0, 'i hurk, ikke løftet ennå');
  let max = 0;
  run(L, p, 90, () => { max = Math.max(max, p.y); return { ...idle, jumpHeld: true }; });
  assert.ok(max > 3, `hoppet tar av etter forberedelsen (${max.toFixed(2)})`);
}

// 29. landing etter høyt fall tar tid (hurk), men lavt fall gjør ingenting
{
  const fall = (y0) => {
    const L = emptyL(), p = newPlayer(0, y0, 0);
    let recover = 0;
    for (let i = 0; i < 200; i++) { step(p, idle, 1 / 60, L); recover = Math.max(recover, p.recover); if (p.onGround) break; }
    return recover;
  };
  assert.ok(fall(12) > 0.1, 'høyt fall gir hurk');
  assert.equal(fall(2), 0, 'lavt fall gir ingen hurk');
  const L = emptyL(), p = newPlayer(0, 12, 0);
  for (let i = 0; i < 200 && !p.onGround; i++) step(p, idle, 1 / 60, L);
  run(L, p, 14, () => fwd);
  assert.ok(p.vz <= P.speed * P.landSlow + 0.01, `i hurk går du tregt (${p.vz.toFixed(2)})`);
}

// 30. å hive seg opp på en kant tar tid og er en jevn bevegelse
{
  const L = { boxes: [floor, box('wood', 3, 45, 0, 4.5, -5, 5)], ropes: [] };
  const p = newPlayer(0.3, 0, 0); p.fx = 1; p.fz = 0;
  run(L, p, 10, () => idle);
  let hungAt = -1, mantleFrames = 0, lastY = -1, monotone = true;
  run(L, p, 420, (i) => {
    if (p.state === 'hang' && hungAt < 0) hungAt = i;
    if (p.state === 'mantle') { mantleFrames++; if (p.y < lastY - 1e-9) monotone = false; lastY = p.y; }
    return { ...idle, mx: 1, jumpPressed: i === 30 || (p.state === 'hang' && i > hungAt + 8), jumpHeld: true, grabPressed: i === 50 };
  });
  assert.ok(hungAt > 0, 'grep kanten');
  assert.ok(mantleFrames > 40 && mantleFrames < 60, `oppstigning ca. ${P.mantleTime} s (${mantleFrames} bilder)`);
  assert.ok(monotone, 'jevn stigning');
  assert.ok(Math.abs(p.y - 4.5) < 0.01 && p.state === 'ground', `oppe (y=${p.y.toFixed(2)}, ${p.state})`);
}

// 31. landing registreres med styrke og tid (brukes til å animere demping)
{
  const L = emptyL(), p = newPlayer(0, 8, 0);
  for (let i = 0; i < 200 && !p.onGround; i++) step(p, idle, 1 / 60, L);
  const expect = Math.sqrt(2 * -P.gravity * 8);
  assert.ok(Math.abs(p.landImpact - expect) < 1.5 && p.landT < 0.05, `landing ${p.landImpact.toFixed(1)} vs ${expect.toFixed(1)}`);
  run(L, p, 30, () => idle);
  assert.ok(p.landT > 0.45, 'tid siden landing teller opp');
  assert.ok(p.airT === 0, 'tid i lufta nullstilles på bakken');
}

// 32. dytting registreres (animasjon: lener seg inn)
{
  const L = world([mv('k', 'medium', 1.5, 3.5, 0, 2, -1, 1)]);
  const p = newPlayer(0, 0, 0); p.fx = 1; p.fz = 0;
  run(L, p, 10, () => idle);
  assert.ok(p.pushT === 0, 'ikke dyttet ennå');
  run(L, p, 40, () => ({ ...idle, mx: 1 }));
  assert.ok(p.pushT > 0, 'dytter');
}

// 33. en tommel som hviler på stikken gir ingen mikroskritt; en tydelig retning starter gange, og svak retning holder den gående
{
  const L = emptyL();
  const p = stand();
  run(L, p, 10, () => idle);
  run(L, p, 120, () => ({ ...idle, mz: 0.2 }));
  assert.ok(Math.abs(p.z) < 0.01, `lett berøring flytter ikke (z=${p.z.toFixed(3)})`);
  run(L, p, 40, () => ({ ...idle, mz: 0.6 }));
  assert.ok(p.z > 0.1, 'tydelig retning starter gange');
  const z1 = p.z;
  run(L, p, 40, () => ({ ...idle, mz: 0.2 }));
  assert.ok(p.z > z1 + 0.1, 'holder seg i gang når input faller til svak verdi (hysterese)');
}

// 20. ujevne bildetider (telefon): å stå stille skal aldri flimre mellom «står» og «luft»
{
  const L = { boxes: [floor], ropes: [] };
  const p = newPlayer(0, 0, 0);
  run(L, p, 10, () => idle);
  let seed = 12345, air = 0;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  const dts = [(r) => (1 / 120) * (0.95 + 0.1 * r), (r) => (1 / 60) * (0.9 + 0.2 * r), (r) => 0.001 + 0.049 * r, (r) => 1e-5 * r + 1e-6];
  for (const f of dts) for (let i = 0; i < 3000; i++) { step(p, idle, f(rnd()), L); if (!p.onGround) air++; }
  assert.equal(air, 0, `stod i lufta i ${air} bilder med ujevne bildetider`);
  assert.equal(p.y, 0);
}

// 21. sett på: bære en ting og sette den på en hylle/bord foran deg, oppå en annen ting, men ikke på en flate som er for liten
{
  const table = box('table', 1.6, 4, 0, 1.2, -1.5, 1.5);
  const L = world([mv('lett', 'light', 0.5, 1.5, 0, 1, -0.5, 0.5)], [table]);
  const p = newPlayer(0, 0, 0); p.fx = 1; p.fz = 0;
  run(L, p, 10, () => idle);
  step(p, { ...idle, carryPressed: true }, 1 / 60, L);
  assert.equal(p.carry?.id, 'lett');
  step(p, { ...idle, carryPressed: true }, 1 / 60, L);
  assert.equal(p.carry, null);
  const b = body(L, 'lett');
  assert.ok(Math.abs(b.min[1] - 1.2) < 1e-6, `skal stå på bordet (y=${b.min[1]})`);
  assert.ok(b.min[0] >= 1.6 - 1e-6 && b.max[0] <= 4 + 1e-6, 'innenfor bordplaten');
  run(L, p, 60, () => idle);
  assert.ok(Math.abs(b.min[1] - 1.2) < 1e-6, 'blir stående');

  // oppå en annen ting
  const L2 = world([mv('lett', 'light', 0.4, 1.0, 0, 1, -0.3, 0.3), mv('kasse', 'medium', 1.3, 2.7, 0, 1.2, -0.7, 0.7)]);
  const p2 = newPlayer(0, 0, 0); p2.fx = 1; p2.fz = 0;
  run(L2, p2, 10, () => idle);
  step(p2, { ...idle, carryPressed: true }, 1 / 60, L2); step(p2, { ...idle, carryPressed: true }, 1 / 60, L2);
  assert.ok(Math.abs(body(L2, 'lett').min[1] - 1.2) < 1e-6, 'stables oppå kassen');

  // for liten flate: faller til gulvet i stedet
  const pole = box('pole', 1.6, 1.7, 0, 1.2, -0.1, 0.1);
  const L3 = world([mv('lett', 'light', 0.5, 1.5, 0, 1, -0.5, 0.5)], [pole]);
  const p3 = newPlayer(0, 0, 0); p3.fx = 1; p3.fz = 0;
  run(L3, p3, 10, () => idle);
  step(p3, { ...idle, carryPressed: true }, 1 / 60, L3); step(p3, { ...idle, carryPressed: true }, 1 / 60, L3);
  run(L3, p3, 60, () => idle);
  assert.ok(Math.abs(body(L3, 'lett').min[1]) < 1e-6, 'for smal støtte: på gulvet');
}

// 22. kast: kort trykk slipper, hold + slipp kaster; lengre hold gir lengre kast
{
  const held = (h, pressed = false) => ({ ...idle, carryHeld: h, carryPressed: pressed });
  const throwWith = (frames) => {
    const L = world([mv('lett', 'light', 0.5, 1.2, 0, 0.7, -0.3, 0.3)]);
    const p = newPlayer(0, 0, 0); p.fx = 1; p.fz = 0;
    run(L, p, 10, () => held(false));
    step(p, held(true, true), 1 / 60, L);                       // ta
    run(L, p, 6, () => held(true)); run(L, p, 2, () => held(false));
    assert.equal(p.carry?.id, 'lett', 'tatt');
    step(p, held(true, true), 1 / 60, L);                       // trykk igjen: begynner å lade
    run(L, p, frames, () => held(true));
    step(p, held(false), 1 / 60, L);                            // slipp
    run(L, p, 120, () => held(false));
    return { L, p, b: body(L, 'lett') };
  };
  const tap = throwWith(3);
  assert.equal(tap.p.carry, null);
  assert.ok(tap.b.min[0] < 1.6, `kort trykk = slipp foran deg (x=${tap.b.min[0]})`);
  const weak = throwWith(18), strong = throwWith(60);
  assert.ok(weak.b.min[0] > tap.b.min[0] + 1, 'hold = kast');
  assert.ok(strong.b.min[0] > weak.b.min[0] + 1.5, `sterkere kast går lenger (${weak.b.min[0].toFixed(1)} vs ${strong.b.min[0].toFixed(1)})`);
  assert.ok(Math.abs(strong.b.min[1]) < 1e-6 && strong.b.vx === 0, 'stopper og blir liggende');
}

// 23. harde landinger (Prince): moderat fall = ok, høyt fall = bedøvet, veldig høyt = tilbake; myk flate demper
{
  applyPreset('prince');
  const fall = (h, boxes = []) => {
    const L = { boxes: [floor, ...boxes], ropes: [] };
    const p = newPlayer(0, h, 0);
    run(L, p, 200, () => idle);
    return p;
  };
  const low = fall(3), mid = fall(10), high = fall(25);
  assert.equal(low.hardLands, 0, 'lite fall: ingen straff');
  assert.equal(mid.hardLands, 1, 'middels fall: bedøvet');
  assert.ok(!mid.knockout && !low.knockout);
  assert.ok(high.knockout, 'høyt fall: tilbake til lagringspunktet');
  const soft = box('soft', -3, 3, 0, 2, -3, 3, { soft: true });
  const pad = fall(25 + 2, [soft]);
  assert.ok(!pad.knockout && pad.hardLands === 0, `myk flate fra 27: ${pad.knockout} ${pad.hardLands}`);
  applyPreset('klassisk');
  const kl = fall(25);
  assert.ok(!kl.knockout && kl.hardLands === 0, 'klassisk har ikke harde landinger');
}

// 24. stavhopp: med stav og fart kommer du opp på en hylle som er for høy for vanlig hopp
{
  applyPreset('prince');
  const hylle = box('hylle', 0, 12, 0, 5.6, -3, 3);
  const attempt = (withPole, lead) => {
    const L = world(withPole ? [{ id: 'stav', kind: 'qtip', pole: 1.5, material: 'plastic', weight: 'light', min: [-9.4, 0, -0.07], max: [-7.9, 0.14, 0.07] }] : [], [hylle]);
    const p = newPlayer(-9, 0, 0); p.fx = 1; p.fz = 0;
    run(L, p, 10, () => idle);
    if (withPole) { step(p, { ...idle, carryPressed: true, carryHeld: true }, 1 / 60, L); run(L, p, 6, () => ({ ...idle, carryHeld: true })); run(L, p, 4, () => ({ ...idle, carryHeld: false })); assert.equal(p.carry?.id, 'stav'); }
    let jumped = false, ij = 0;
    for (let i = 0; i < 500; i++) {
      const j = !jumped && p.x > -lead;
      if (j) { jumped = true; ij = i; }
      step(p, { ...idle, mx: 1, carryHeld: false, jumpPressed: j, jumpHeld: jumped && i - ij < 60 }, 1 / 60, L);
      if (p.onGround && p.y > 5.5 && p.x > 0 && p.x < 12) p.top = true;      // stod på hyllen
    }
    return p;
  };
  let ok = 0; for (const lead of [2.0, 3.0, 3.8]) { const p = attempt(true, lead); if (p.top) ok++; }
  assert.ok(ok >= 2, `med stav og fart kommer du opp på 5,6 (${ok}/3)`);
  assert.equal(ok, 3, 'alle tre anløp');
  const no = attempt(false, 3.4);
  assert.ok(!no.top, 'uten stav kommer du ikke opp');
  applyPreset('klassisk');
}

// 25. klatring på grep-flater: fest med REKK UT, klatre opp og over kanten, sidelengs, ned igjen, stamina, hopp løs
{
  applyPreset('prince');
  const tower = box('grip', 0, 1, 0, 9, -3, 3, { grip: true });
  const wall = box('wall', 5, 6, 0, 10, -3, 3);
  const mk = () => { const L = { boxes: [floor, tower, wall], ropes: [] }; const p = newPlayer(-0.3, 0, 0); p.fx = 1; p.fz = 0; return { L, p }; };
  const go = (L, p, n, inp) => { for (let i = 0; i < n; i++) step(p, { ...idle, ...(typeof inp === 'function' ? inp(i) : inp) }, 1 / 60, L); };
  // fest
  let { L, p } = mk(); go(L, p, 10, {});
  go(L, p, 2, (i) => ({ mx: 1, grabPressed: i === 0 }));
  assert.equal(p.state, 'climb', 'REKK UT mot en grep-flate fester deg');
  // opp
  go(L, p, 60, { mx: 1 });
  assert.ok(p.y > 1.5, `klatrer opp (y=${p.y})`);
  assert.ok(p.stam < P.stamina - 0.5, 'stamina går ned');
  // sidelengs
  const z0 = p.z; go(L, p, 30, { mz: 1 });
  assert.ok(Math.abs(p.z - z0) > 0.3 && p.state === 'climb', 'beveger seg langs flaten');
  // ned til bakken og slipp
  go(L, p, 200, { mx: -1 });
  assert.equal(p.state, 'ground', `kommer ned til bakken (${p.state})`);
  p.stam = 1; go(L, p, 300, {}); assert.ok(p.stam > P.stamina - 1e-6, 'stamina henter seg inn på bakken');
  // helt opp og over kanten
  ({ L, p } = mk()); go(L, p, 10, {}); go(L, p, 2, (i) => ({ mx: 1, grabPressed: i === 0 }));
  go(L, p, 60 * 10, { mx: 1 });
  assert.ok(['hang', 'mantle', 'ground'].includes(p.state) && p.y > 7, `kommer til toppen (${p.state}, y=${p.y.toFixed(1)})`);
  if (p.state === 'hang') { go(L, p, 120, (i) => ({ mx: i < 3 ? 1 : 0, jumpPressed: i === 0 })); }
  assert.equal(p.state, 'ground'); assert.ok(Math.abs(p.y - 9) < 0.05, `står oppå (y=${p.y})`);
  // stamina tom: du glir av
  ({ L, p } = mk()); go(L, p, 10, {}); go(L, p, 2, (i) => ({ mx: 1, grabPressed: i === 0 }));
  p.stam = 0.2; go(L, p, 40, { mx: 1 });
  assert.notEqual(p.state, 'climb', 'tom stamina: slipper');
  // hopp løs
  ({ L, p } = mk()); go(L, p, 10, {}); go(L, p, 2, (i) => ({ mx: 1, grabPressed: i === 0 })); go(L, p, 40, { mx: 1 });
  go(L, p, 2, (i) => ({ jumpPressed: i === 0 }));
  assert.equal(p.state, 'air'); assert.ok(p.vx < -1, 'sparker bort fra flaten');
  // vanlig vegg: ingen feste
  ({ L, p } = mk()); p.x = 4.7; p.fx = 1; go(L, p, 10, {}); go(L, p, 4, (i) => ({ mx: 1, grabPressed: i === 0 }));
  assert.notEqual(p.state, 'climb', 'vanlig vegg er ikke klatrbar');
  applyPreset('klassisk');
}

// 26. prøverom «klatring»: håndklerute fra papirhaugen til toppen av tårnet (klatre, hvile, hoppe og gripe)
{
  applyPreset('prince');
  const LV = JSON.parse(fs.readFileSync(new URL('./levels/klatring.level.json', import.meta.url), 'utf8'));
  const L = { boxes: LV.boxes, ropes: [], movables: [], hazards: [] };
  const p = newPlayer(-1.6, 2.01, -4); p.fx = 1; p.fz = 0;
  for (let i = 0; i < 30; i++) step(p, idle, 1 / 60, L);
  let phase = 0, done = false;
  for (let i = 0; i < 60 * 40 && !done; i++) {
    let inp = {}; const gnd = p.state === 'ground';
    if (phase === 0) { inp = { mx: 1, grabPressed: i % 20 === 0 }; if (p.state === 'hang' || (gnd && p.y > 8.5)) phase = 1; }
    if (phase === 1) { inp = { mx: 1, jumpPressed: p.state === 'hang' && i % 30 === 0 }; if (gnd && p.y > 8.5) phase = 2; }
    if (phase === 2) { inp = { mz: 1 }; if (p.z > 2.5) phase = 25; }
    if (phase === 25) { inp = { mx: -1 }; if (p.x < -1.15) phase = 3; }
    if (phase === 3) { if (p.stam > 9.9) phase = 4; }
    if (phase === 4) { inp = { mx: 1, jumpPressed: gnd && i % 40 === 0, jumpHeld: true, grabPressed: !gnd && i % 40 === 12 }; if (p.state === 'climb') phase = 5; }
    if (phase === 5) { inp = { mx: 1, jumpPressed: p.state === 'hang' && i % 30 === 0 }; if (gnd && p.y > 17) done = true; }
    step(p, { ...idle, ...inp }, 1 / 60, L);
  }
  assert.ok(done, `håndklerute til toppen (fase ${phase}, ${p.state}, y=${p.y.toFixed(1)})`);
  applyPreset('klassisk');
}

// 27. hårgelé: smør et grep-felt på veggen, slipp flasken, klatre opp (vått gel koster mer stamina og sklir), gelen tørker
{
  applyPreset('prince');
  const hylle = box('hylle', 0, 12, 0, 5.6, -4, 4), skap = box('skap', 12, 16, 0, 12, -4, 4);
  const flaske = { id: 'gele', kind: 'gel_bottle', tool: 'gel', material: 'plastic', weight: 'light', min: [10.4, 5.6, -0.2], max: [11.0, 7.0, 0.2] };
  const L = world([flaske], [hylle, skap]);
  const p = newPlayer(9.5, 5.6, 0); p.fx = 1; p.fz = 0;
  const tap = (n = 3) => { step(p, { ...idle, carryHeld: true, carryPressed: true }, 1 / 60, L); for (let i = 0; i < n; i++) step(p, { ...idle, carryHeld: true }, 1 / 60, L); step(p, { ...idle, carryHeld: false }, 1 / 60, L); };
  run(L, p, 20, () => idle);
  tap(); assert.equal(p.carry?.id, 'gele', 'tok flasken');
  run(L, p, 100, () => ({ ...idle, mx: 1 }));                                  // gå inntil veggen
  tap(); assert.equal(L.made.length, 1, 'smurte et felt');
  const g = L.made[0];
  assert.ok(g.grip && g.wet && g.max[1] - g.min[1] > 5, `felt ${g.min[1].toFixed(1)}–${g.max[1].toFixed(1)}`);
  tap(); assert.equal(p.carry, null, 'neste trykk ved samme vegg slipper flasken');
  run(L, p, 30, () => idle);
  // klatre opp
  step(p, { ...idle, mx: 1, grabPressed: true }, 1 / 60, L); run(L, p, 20, () => ({ ...idle, mx: 1 }));
  assert.equal(p.state, 'climb', `festet i gelen (${p.state})`);
  let top = false; for (let i = 0; i < 60 * 8 && !top; i++) { step(p, { ...idle, mx: 1, jumpPressed: p.state === 'hang' && i % 30 === 0 }, 1 / 60, L); if (p.state === 'ground' && p.y > 11.9) top = true; }
  assert.ok(top, `kom opp på skapet (${p.state}, y=${p.y.toFixed(1)}, stam ${p.stam.toFixed(1)})`);
  // tørker
  run(L, p, 60 * 21, () => idle);
  assert.ok(!g.wet && g.gripDrain < 0.5 && !g.gripSlide, 'gelen har tørket til et fast grep');
  // nullstilling fjerner feltet
  resetBodies(L, p); assert.equal(L.made.length, 0); assert.ok(!L.boxes.includes(g));
  applyPreset('klassisk');
}

// 28. dopapirrull: ruller ut et bånd ned over kanten; du kan klatre i det, men det revner
{
  applyPreset('prince');
  const tarn = box('tarn', 0, 10, 0, 10, -4, 4);
  const rull = { id: 'rull', kind: 'roll', tool: 'roll', material: 'paper', weight: 'light', min: [7.0, 10, -0.5], max: [8.0, 12, 0.5] };
  const L = world([rull], [tarn]);
  const p = newPlayer(6, 10, 0); p.fx = 1; p.fz = 0;
  const tap = () => { step(p, { ...idle, carryHeld: true, carryPressed: true }, 1 / 60, L); run(L, p, 3, () => ({ ...idle, carryHeld: true })); step(p, { ...idle, carryHeld: false }, 1 / 60, L); };
  run(L, p, 20, () => idle);
  tap(); assert.equal(p.carry?.id, 'rull');
  run(L, p, 100, () => ({ ...idle, mx: 1 }));                                   // frem til kanten (x≈9.7)
  assert.ok(p.x > 9.3 && p.y === 10, `ved kanten (${p.x.toFixed(2)}, ${p.y})`);
  tap(); assert.equal(L.made.length, 1, 'bånd rullet ut');
  const b = L.made[0]; assert.ok(b.min[1] === 0 && b.max[1] === 10 && b.grip && b.max[0] > 10, 'henger fra kanten ned til gulvet');
  tap(); assert.equal(p.carry, null, 'neste trykk slipper rullen');
  // hopp av kanten og grip båndet, klatre ned
  p.x = 10.4; p.y = 9.5; p.vx = p.vy = 0; p.onGround = false; p.state = 'air'; p.fx = -1; p.fz = 0;         // hoppet av kanten og faller forbi båndet
  let attached = false; for (let i = 0; i < 60 && !attached; i++) { step(p, { ...idle, mx: -1, grabPressed: i === 0 }, 1 / 60, L); if (p.state === 'climb') attached = true; }
  assert.ok(attached, `grep båndet (${p.state}, y=${p.y.toFixed(1)}, x=${p.x.toFixed(2)})`);
  // henger du for lenge, revner det
  run(L, p, 60 * 10, () => idle);
  assert.equal(L.made.length, 0, 'båndet revnet');
  assert.notEqual(p.state, 'climb');
  applyPreset('klassisk');
}

console.log('alle fysikktester grønne');




