// node tinylittleme/test_physics.mjs
import assert from 'node:assert/strict';
import { P, box, newPlayer, step, freeAt } from './physics.js';
import { LEVEL } from './level.js';

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

console.log('alle fysikktester grønne');
