// Scene (tolket fra bilder) → spillbart brett, med enkel rute-validering og hjelpeobjekter.
// Bruk: node tools/scene2level.mjs scenes/bad.scene.json levels/bad.level.json
//
// Steg:
//  1. cm → spillenheter (1 enhet = 5 cm), objekter → bokser, farer, hold, dekor.
//  2. Overflatekart: hver topp-flate er en node. Kanter finnes der hopp + rekk ut rekker (samme budsjett som «Spenning»).
//  3. Beste rute start → mål. Der en kant er for stor legges det inn hjelpeobjekter (bro / trappetrinn).
//  4. Skriver brettet + en rapport. Bekreft etterpå med fysikk-boten: node tools/solve.mjs spenning --level=<fil>
import fs from 'node:fs';

const [, , inPath, outPath] = process.argv;
if (!inPath || !outPath) { console.error('bruk: scene2level.mjs <scene.json> <level.json>'); process.exit(1); }
const scene = JSON.parse(fs.readFileSync(inPath, 'utf8'));

const U = 5;                                    // cm per enhet
const R = scene.room;
const cx = R.width / 2, cz = R.depth / 2;
const ux = (x) => +((x - cx) / U).toFixed(3), uz = (z) => +((z - cz) / U).toFixed(3), uy = (y) => +(y / U).toFixed(3);
const hex = (s) => parseInt(String(s).replace('#', ''), 16);
const round = (n) => +n.toFixed(3);

// budsjett (matcher «Spenning» med litt margin)
const GAP_MAX = 5.5, RISE_MAX = 4.5, RISE_GAP_K = 0.4, DROP_GAP_MAX = 6.5;
const STEP = 3.2, STEP_W = 3, MIN_NODE = 0.8;

// ---- 1. objekter → bokser ------------------------------------------------
const H = R.height / U;
const x0 = ux(0), x1 = ux(R.width), z0 = uz(0), z1 = uz(R.depth);
const mk = (type, a, b, extra = {}) => ({ type, min: [round(a[0]), round(a[1]), round(a[2])], max: [round(b[0]), round(b[1]), round(b[2])], ...extra });

const boxes = [];
boxes.push(mk('floor', [x0, -2, z0], [x1, 0, z1], { id: 'gulv', color: hex(R.floor.color), slick: !!R.floor.slick, material: R.floor.material }));
const wallExtra = { color: hex(R.walls.color), material: R.walls.material };
boxes.push(mk('wall', [x0 - 1, 0, z0], [x0, H, z1], { id: 'vegg_v', ...wallExtra }));
boxes.push(mk('wall', [x1, 0, z0], [x1 + 1, H, z1], { id: 'vegg_o', ...wallExtra }));
boxes.push(mk('wall', [x0, 0, z0 - 1], [x1, H, z0], { id: 'vegg_n', ...wallExtra }));
boxes.push(mk('wall', [x0, 0, z1], [x1, H, z1 + 1], { id: 'vegg_s', ...wallExtra }));

const decor = [], holds = [], movables = [];
for (const o of scene.objects) {
  const [a, b, c, d, e, f] = o.box;
  const lo = [ux(a), uy(c), uz(e)], hi = [ux(b), uy(d), uz(f)];
  if (o.hold) holds.push({ id: o.id, kind: o.kind, min: lo, max: hi });
  if (o.movable) {                                         // løse ting: egne legemer i spillet, ikke faste flater
    movables.push({ id: o.id, kind: o.kind, material: o.material, color: hex(o.color), min: lo, max: hi, weight: o.movable, breakable: !!o.breakable });
    continue;
  }
  if (o.decor) {
    decor.push({ shape: 'box', id: o.id, kind: o.kind, pos: lo.map((v, i) => round((v + hi[i]) / 2)), size: lo.map((v, i) => round(Math.max(0.05, hi[i] - v))), color: hex(o.color), material: o.material });
    continue;
  }
  boxes.push(mk(o.material, lo, hi, { id: o.id, kind: o.kind, ...(o.group ? { group: o.group } : {}), color: hex(o.color), material: o.material, cp: !!o.cp, soft: !!o.soft }));
}
const hazards = (scene.hazards || []).map((h) => {
  const [a, b, c, d, e, f] = h.box;
  return { id: h.id, type: h.type, message: h.message, min: [ux(a), uy(c), uz(e)], max: [ux(b), uy(d), uz(f)] };
});
const windows = (scene.windows || []).map((w) => {
  const east = w.wall === 'E', west = w.wall === 'W', north = w.wall === 'N';
  const pos = east ? [x1 - 0.05, uy(w.y), uz(w.z)] : west ? [x0 + 0.05, uy(w.y), uz(w.z)] : north ? [ux(w.z), uy(w.y), z0 + 0.05] : [ux(w.z), uy(w.y), z1 - 0.05];
  return { wall: w.wall, pos, size: [round(w.w / U), round(w.h / U)] };
});
const sun = windows[0] ? (windows[0].wall === 'E' ? [30, 60, -8] : windows[0].wall === 'W' ? [-30, 60, -8] : windows[0].wall === 'N' ? [8, 60, -30] : [8, 60, 30]) : [28, 60, -24];

const goal = [ux(scene.goal.x), uy(scene.goal.y), uz(scene.goal.z)];
const start = [ux(scene.start.x), 0, uz(scene.start.z)];

// ---- 2. overflatekart -----------------------------------------------------
const nodes = [];
const fromBox = (b) => ({ id: b.id, x0: b.min[0], x1: b.max[0], z0: b.min[2], z1: b.max[2], top: b.max[1] });
nodes.push({ id: 'gulv', x0, x1, z0, z1, top: 0 });
for (const b of boxes) {
  if (b.type === 'floor' || b.type === 'wall') continue;
  if (b.max[1] < 0.6) continue;                              // matter o.l. regnes som gulv
  if (b.max[0] - b.min[0] < MIN_NODE || b.max[2] - b.min[2] < MIN_NODE) continue;
  nodes.push(fromBox(b));
}
const gapOf = (A, B) => {
  const dx = Math.max(0, Math.max(A.x0, B.x0) - Math.min(A.x1, B.x1));
  const dz = Math.max(0, Math.max(A.z0, B.z0) - Math.min(A.z1, B.z1));
  return Math.hypot(dx, dz);
};
const edgeOK = (A, B) => {
  const g = gapOf(A, B), rise = B.top - A.top;
  if (rise > 0.25) return g <= GAP_MAX && rise <= RISE_MAX - RISE_GAP_K * g;
  return g <= DROP_GAP_MAX;
};
function reachable() {
  const seen = new Set([0]), q = [0];
  while (q.length) {
    const a = q.shift();
    for (let b = 0; b < nodes.length; b++) if (!seen.has(b) && edgeOK(nodes[a], nodes[b])) { seen.add(b); q.push(b); }
  }
  return seen;
}
const goalIdx = () => nodes.findIndex((n) => n.id !== 'gulv' && goal[0] >= n.x0 - 0.01 && goal[0] <= n.x1 + 0.01 && goal[2] >= n.z0 - 0.01 && goal[2] <= n.z1 + 0.01 && Math.abs(n.top - goal[1]) < 0.05);
if (goalIdx() < 0) { console.error('fant ingen flate under målet'); process.exit(1); }

function idealPath() {                                       // Dijkstra over «ideelle» kanter
  const dist = nodes.map(() => Infinity), prev = nodes.map(() => -1), done = new Set();
  dist[0] = 0;
  for (;;) {
    let a = -1;
    for (let i = 0; i < nodes.length; i++) if (!done.has(i) && (a < 0 || dist[i] < dist[a])) a = i;
    if (a < 0 || dist[a] === Infinity) break;
    done.add(a);
    for (let b = 0; b < nodes.length; b++) {
      if (done.has(b)) continue;
      const g = gapOf(nodes[a], nodes[b]);
      if (g > 30) continue;
      const rise = nodes[b].top - nodes[a].top;
      const excess = Math.max(0, rise - (RISE_MAX - RISE_GAP_K * g)) + Math.max(0, g - GAP_MAX);
      const c = g + (rise > 0 ? rise * 1.5 : -rise * 0.2) + 0.3 + excess * 8 + (banned.has(`${a}-${b}`) ? 1e6 : 0);   // uoverkommelige hopp er dyre: bruk ekte objekter som trinn
      if (dist[a] + c < dist[b]) { dist[b] = dist[a] + c; prev[b] = a; }
    }
  }
  const path = []; for (let i = goalIdx(); i >= 0; i = prev[i]) path.unshift(i);
  return path;
}

// ---- 3. hjelpeobjekter ----------------------------------------------------
const helperColors = ['#b9c7d8', '#d8c1b9', '#c4d8b9', '#d8d2b9'];
const helpers = [];
const banned = new Set();
let hc = 0;
const overlap3 = (lo, hi) => [...boxes, ...movables].some((b) => b.type !== 'floor' && lo[0] < b.max[0] && hi[0] > b.min[0] && lo[1] < b.max[1] - 0.001 && hi[1] > b.min[1] + 0.001 && lo[2] < b.max[2] && hi[2] > b.min[2]);
const inRoom = (lo, hi) => lo[0] >= x0 && hi[0] <= x1 && lo[2] >= z0 && hi[2] <= z1;
function addHelper(kind, lo, hi, note) {
  const id = `hjelp_${kind}_${++hc}`;
  boxes.push(mk('fabric', lo, hi, { id, kind: 'towel', color: hex(helperColors[hc % helperColors.length]), material: 'fabric', helper: true }));
  nodes.push({ id, x0: lo[0], x1: hi[0], z0: lo[2], z1: hi[2], top: hi[1] });
  helpers.push({ id, kind, note, size_cm: lo.map((v, i) => Math.round((hi[i] - v) * U)), at_cm: [Math.round((lo[0] + hi[0]) / 2 * U + cx), Math.round((lo[2] + hi[2]) / 2 * U + cz)], top_cm: Math.round(hi[1] * U) });
  return nodes.length - 1;
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Fest en trapp av n bokser inntil B, stående på A-nivå. Prøver sider og sideveis forskyvninger.
const supported = (A, lo, hi) => {                         // minst 70 % av fotavtrykket hviler på A
  const ox = Math.max(0, Math.min(hi[0], A.x1) - Math.max(lo[0], A.x0)), oz = Math.max(0, Math.min(hi[2], A.z1) - Math.max(lo[2], A.z0));
  return ox * oz >= 0.7 * (hi[0] - lo[0]) * (hi[2] - lo[2]);
};
function placeStairs(A, B, n) {
  const sides = [];                                          // retning vekk fra B, utover mot A
  const bc = [(B.x0 + B.x1) / 2, (B.z0 + B.z1) / 2], ac = [(A.x0 + A.x1) / 2, (A.z0 + A.z1) / 2];
  const toA = [ac[0] - bc[0], ac[1] - bc[1]];
  const all = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  all.sort((p, q) => (q[0] * toA[0] + q[1] * toA[1]) - (p[0] * toA[0] + p[1] * toA[1]));
  for (const s of all) sides.push(s);
  for (const [dx, dz] of sides) {
    for (const off of [0, 3, -3, 6, -6, 9, -9, 12, -12]) {
      const los = [], his = []; let ok = true;
      for (let k = 1; k <= n; k++) {
        const dist = (n - k) * STEP_W;
        let lo, hi;
        if (dx) {
          const edge = dx > 0 ? B.x1 : B.x0;
          const lat = clamp((B.z0 + B.z1) / 2 + off, B.z0 + STEP_W / 2, B.z1 - STEP_W / 2);
          const a0 = dx > 0 ? edge + dist : edge - dist - STEP_W;
          lo = [a0, A.top, lat - STEP_W / 2]; hi = [a0 + STEP_W, A.top + STEP * k, lat + STEP_W / 2];
        } else {
          const edge = dz > 0 ? B.z1 : B.z0;
          const lat = clamp((B.x0 + B.x1) / 2 + off, B.x0 + STEP_W / 2, B.x1 - STEP_W / 2);
          const a0 = dz > 0 ? edge + dist : edge - dist - STEP_W;
          lo = [lat - STEP_W / 2, A.top, a0]; hi = [lat + STEP_W / 2, A.top + STEP * k, a0 + STEP_W];
        }
        if (!inRoom(lo, hi) || overlap3(lo, hi) || !supported(A, lo, hi)) { ok = false; break; }
        los.push(lo); his.push(hi);
      }
      if (ok) { for (let k = 0; k < n; k++) addHelper('trapp', los[k], his[k], `trinn ${k + 1}/${n} (brettede håndklær / esker)`); return true; }
    }
  }
  return false;
}

function fixEdge(iA, iB) {
  let A = nodes[iA]; const B = nodes[iB];
  const g = gapOf(A, B), rise = B.top - A.top;
  if (g > 4 && (rise > 0.25 || g > DROP_GAP_MAX)) {          // bro over gapet
    const ox = Math.max(A.x0, B.x0) < Math.min(A.x1, B.x1);
    const oz = Math.max(A.z0, B.z0) < Math.min(A.z1, B.z1);
    const dxg = Math.max(0, Math.max(A.x0, B.x0) - Math.min(A.x1, B.x1)), dzg = Math.max(0, Math.max(A.z0, B.z0) - Math.min(A.z1, B.z1));
    const alongX = !ox && (oz || dxg >= dzg);
    let lo, hi;
    if (alongX) {
      const aRight = A.x1 <= B.x0;
      const e0 = aRight ? A.x1 : B.x1, e1 = aRight ? B.x0 : A.x0;
      const lat = clamp((B.z0 + B.z1) / 2, A.z0 + 1.5, A.z1 - 1.5);
      lo = [e0 - 0.3, A.top - 0.8, lat - 1.5]; hi = [e1 + 0.3, A.top, lat + 1.5];
    } else {
      const aBelow = A.z1 <= B.z0;
      const e0 = aBelow ? A.z1 : B.z1, e1 = aBelow ? B.z0 : A.z0;
      const lat = clamp((B.x0 + B.x1) / 2, A.x0 + 1.5, A.x1 - 1.5);
      lo = [lat - 1.5, A.top - 0.8, e0 - 0.3]; hi = [lat + 1.5, A.top, e1 + 0.3];
    }
    if (lo[0] < hi[0] && lo[2] < hi[2] && !overlap3([lo[0], lo[1] + 0.01, lo[2]], hi)) {
      const idx = addHelper('bro', lo, hi, 'bro over gapet (linjal / planke)');
      A = nodes[idx];
    } else return false;                                      // broen er blokkert av noe
  }
  const r2 = B.top - A.top;
  if (r2 > RISE_MAX - 0.5) {
    const n = Math.max(1, Math.ceil((r2 - 3.4) / STEP));
    if (!placeStairs(A, B, n)) return false;
  }
  return true;
}

for (let iter = 0; iter < (scene.validate === false ? 0 : 120); iter++) {
  const seen = reachable();
  if (seen.has(goalIdx())) break;
  const path = idealPath();
  let acted = false;
  for (let i = 0; i + 1 < path.length; i++) {
    const A = nodes[path[i]], B = nodes[path[i + 1]];
    if (seen.has(path[i]) && !edgeOK(A, B)) {
      const nBefore = nodes.length, hBefore = helpers.length, bBefore = boxes.length;
      const ok = fixEdge(path[i], path[i + 1]) && nodes.length > nBefore;
      if (process.env.DEBUG) console.log(`  iter ${iter}: ${A.id} → ${B.id} (gap ${gapOf(A, B).toFixed(1)}, stiger ${(B.top - A.top).toFixed(1)}) ${ok ? 'fikset' : 'IKKE mulig'}`);
      if (!ok) {               // rull tilbake delvis arbeid og prøv en annen rute
        nodes.length = nBefore; helpers.length = hBefore; boxes.length = bBefore;
        banned.add(`${path[i]}-${path[i + 1]}`);
      }
      acted = true; break;
    }
  }
  if (!acted) { console.warn('  ingen kant å fikse; avbryter'); break; }
}
// rydd: fjern hjelpeobjekter som ikke trengs for å nå målet
if (reachable().has(goalIdx())) {
  for (let h = helpers.length - 1; h >= 0; h--) {
    const id = helpers[h].id, ni = nodes.findIndex((n) => n.id === id), bi = boxes.findIndex((b) => b.id === id);
    const nodeBak = nodes[ni], boxBak = boxes[bi];
    nodes.splice(ni, 1); boxes.splice(bi, 1);
    if (reachable().has(goalIdx())) helpers.splice(h, 1);
    else { nodes.splice(ni, 0, nodeBak); boxes.splice(bi, 0, boxBak); }
  }
}
const finalSeen = reachable();
const solvable = finalSeen.has(goalIdx());

// ---- 4. skriv ---------------------------------------------------------------
const level = {
  name: scene.name,
  boxes, movables, decor, hazards, holds, windows, sun, look: scene.look, audio: scene.audio,
  ropes: [],
  start, goal,
  deathY: -15,
  room: { x0, x1, z0, z1, height: H, floor: R.floor, walls: R.walls, ceiling: R.ceiling },
  report: { source: scene.source, solvable_by_graph: solvable, helpers, nodes: nodes.length, reachable: finalSeen.size },
};
fs.mkdirSync(outPath.replace(/[^/]+$/, '') || '.', { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(level, null, 1));
console.log(`${scene.name}: ${boxes.length} bokser, ${hazards.length} farer, ${holds.length} klatretak (ennå ubrukt), ${decor.length} dekor`);
console.log(`løse ting (kan flyttes): ${movables.length}`);
console.log(scene.validate === false ? 'rute-graf: hoppet over (validate:false, brettet er laget for å flytte ting)' : `rute-graf: ${solvable ? 'MÅL NÅS' : 'MÅL IKKE NÅDD'}  |  hjelpeobjekter lagt inn: ${helpers.length}`);
for (const h of helpers) console.log(`  + ${h.id.padEnd(16)} ${h.size_cm.join('×')} cm, topp ${h.top_cm} cm, ved (${h.at_cm.join(', ')})`);
process.exit(solvable || scene.validate === false ? 0 : 2);
