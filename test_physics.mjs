// node tinylittleme/test_physics.mjs
import assert from 'node:assert/strict';
import { P, box, newPlayer, step, freeAt, applyPreset, inHazard, initBodies, resetBodies, drainEvents } from './physics.js';
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

console.log('alle fysikktester grønne');


