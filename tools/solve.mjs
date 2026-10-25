// Løsbarhetsvalidator (prototype): Go-Explore med tilfeldige handlinger over den ekte fysikken.
// Bruk: node tinylittleme/tools/solve.mjs [maks_iterasjoner]
// Finner boten målet, er brettet løsbart (og vi har en vei). Finner den det ikke, er brettet
// enten umulig eller bare vanskelig – ikke et bevis, men et godt signal.
import { newPlayer, step } from '../physics.js';
import { LEVEL } from '../level.js';

const MAX = Number(process.argv[2]) || 400000;
const [gx, gy, gz] = LEVEL.goal;
const DIRS = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [.7, .7], [.7, -.7], [-.7, .7], [-.7, -.7]];

let seed = 12345;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const pick = (a) => a[Math.floor(rnd() * a.length)];

const key = (p) => `${Math.floor(p.x)}|${Math.floor(p.y)}|${Math.floor(p.z)}|${p.state}`;
const score = (p) => p.y * 3 - Math.hypot(p.x - gx, p.z - gz) * 0.5;
const clone = (p) => ({ ...p, wallN: p.wallN && { ...p.wallN }, hang: p.hang && { ...p.hang }, swing: p.swing && { ...p.swing } });
const atGoal = (p) => Math.hypot(p.x - gx, p.z - gz) < 2 && Math.abs(p.y - gy) < 2.5;

const start = newPlayer(...LEVEL.start);
for (let i = 0; i < 10; i++) step(start, { mx: 0, mz: 0 }, 1 / 60, LEVEL);
const archive = new Map([[key(start), { p: start, n: 0, parent: null, act: null, best: score(start) }]]);
let found = null, bestY = 0;

for (let it = 0; it < MAX && !found; it++) {
  const cells = [...archive.values()];
  // vekt: nye/lite besøkte celler og høye celler
  let cell;
  for (let t = 0; t < 4; t++) {
    const c = cells[Math.floor(rnd() * cells.length)];
    if (!cell || c.n / (1 + Math.max(0, c.best) * 0.05) < cell.n / (1 + Math.max(0, cell.best) * 0.05)) cell = c;
  }
  cell.n++;
  const p = clone(cell.p);
  const [mx, mz] = pick(DIRS);
  const frames = 3 + Math.floor(rnd() * 22);
  const act = { mx, mz, frames, jump: rnd() < 0.5, jumpAt: Math.floor(rnd() * frames), hold: rnd() < 0.7, grab: rnd() < 0.3 };
  for (let f = 0; f < frames; f++) {
    step(p, {
      mx, mz, jumpPressed: act.jump && f === act.jumpAt, jumpHeld: act.hold,
      grabPressed: act.grab && f === 0, grabHeld: act.grab,
    }, 1 / 60, LEVEL);
    if (p.y < LEVEL.deathY) break;
  }
  if (p.y < LEVEL.deathY) continue;
  bestY = Math.max(bestY, p.y);
  if (atGoal(p)) { found = { p, parent: cell, act }; break; }
  const k = key(p), s = score(p), old = archive.get(k);
  if (!old || s > old.best) archive.set(k, { p, n: old ? old.n : 0, parent: cell, act, best: s });
  if (it % 50000 === 0) console.log(`it=${it} celler=${archive.size} høyest=${bestY.toFixed(1)}`);
}

if (found) {
  const path = []; let c = found;
  while (c.parent) { path.push(c.act); c = c.parent; }
  const secs = path.reduce((s, a) => s + a.frames, 0) / 60;
  console.log(`LØSBART: mål nådd med ${path.length} handlinger (~${secs.toFixed(0)} s), celler=${archive.size}`);
} else {
  console.log(`IKKE FUNNET etter ${MAX} forsøk. høyest nådd y=${bestY.toFixed(1)} (mål y=${gy}), celler=${archive.size}`);
}
process.exit(found ? 0 : 1);
