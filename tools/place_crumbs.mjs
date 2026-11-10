// Plasserer smuler (R3) i en scene: velger ca. 10 steder som er nåbare (gulv koblet til start, og flatene ruta bruker),
// jevnt spredt, og skriver dem som `collectibles` i scenen (cm), slik som `ants`.
// Bruk: node tools/place_crumbs.mjs scenes/bad.scene.json [flere ...]   (make_variants.mjs kaller også autoCrumbs for nivå 4–6)
// Rent og deterministisk: samme scene gir alltid samme smuler.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const U = 5, N = 10, STEP = 1.5, R = 0.7, CLEAR_H = 2.0, MAX_PER_SURFACE = 2, LIFT_FLOOR = 0;

export function crumbsFromLevel(L, scene) {
  const solids = L.boxes.filter((b) => b.type !== 'floor' && b.type !== 'wall');
  const mov = (L.movables || []);
  const all = [...solids, ...mov];
  const inb = (b, x, z, r) => x + r > b.min[0] && x - r < b.max[0] && z + r > b.min[2] && z - r < b.max[2];
  const topAt = (x, z) => { let t = 0; for (const b of solids) if (x > b.min[0] && x < b.max[0] && z > b.min[2] && z < b.max[2]) t = Math.max(t, b.max[1]); return t; };
  const clear = (x, z, top, r) => !all.some((b) => inb(b, x, z, r) && b.max[1] > top + 0.02 && b.min[1] < top + CLEAR_H);
  const movOver = (x, z) => mov.some((b) => inb(b, x, z, 1.2));
  const hazOver = (x, z) => (L.hazards || []).some((h) => inb({ min: [h.min[0] - 1.5, 0, h.min[2] - 1.5], max: [h.max[0] + 1.5, 0, h.max[2] + 1.5] }, x, z, 0));
  const flat = (x, z, top) => [[0, 0], [R, 0], [-R, 0], [0, R], [0, -R]].every(([dx, dz]) => Math.abs(topAt(x + dx, z + dz) - top) < 0.02);
  const nodes = (L.route || []).filter((n) => !n.via && !n.grip && n.id !== 'gulv');
  const x0 = L.room.x0, x1 = L.room.x1, z0 = L.room.z0, z1 = L.room.z1;
  const gx = Math.floor((x1 - x0) / STEP), gz = Math.floor((z1 - z0) / STEP);
  const cx = (i) => x0 + (i + 0.5) * STEP, cz = (j) => z0 + (j + 0.5) * STEP;
  // gulv: flomfyll fra start (hvor kan du faktisk gå på gulvet?)
  const floorFree = (i, j) => { const x = cx(i), z = cz(j); return !all.some((b) => inb(b, x, z, R) && b.min[1] < 1.0 && b.max[1] > 0.02); };
  const seen = new Set(), key = (i, j) => i * 10000 + j;
  { const si = Math.floor((L.start[0] - x0) / STEP), sj = Math.floor((L.start[2] - z0) / STEP), q = [[si, sj]]; seen.add(key(si, sj));
    while (q.length) { const [i, j] = q.pop(); for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= gx || b >= gz || seen.has(key(a, b)) || !floorFree(a, b)) continue; seen.add(key(a, b)); q.push([a, b]); } } }
  const cands = [];
  for (let i = 1; i < gx - 1; i++) for (let j = 1; j < gz - 1; j++) {
    const x = cx(i), z = cz(j), top = topAt(x, z);
    if (Math.hypot(x - L.start[0], z - L.start[2]) < 4 || Math.hypot(x - L.goal[0], z - L.goal[2]) < 3 || hazOver(x, z) || movOver(x, z)) continue;
    if (!clear(x, z, top, R) || !flat(x, z, top)) continue;
    let surf;
    if (top < 0.02) { if (!seen.has(key(i, j))) continue; surf = 'gulv'; if (x - x0 < 1.5 || x1 - x < 1.5 || z - z0 < 1.5 || z1 - z < 1.5) continue; }
    else {
      const n = nodes.find((m) => Math.abs(m.top - top) < 0.05 && x > m.x0 + 0.8 && x < m.x1 - 0.8 && z > m.z0 + 0.8 && z < m.z1 - 0.8);
      if (!n) continue; surf = n.id;
    }
    const box = solids.filter((b) => b.id && b.max[1] === top && x > b.min[0] && x < b.max[0] && z > b.min[2] && z < b.max[2])[0];
    const on = surf === 'gulv' ? 'gulv' : box?.id;
    if (!on || (on !== 'gulv' && !scene.objects.some((o) => o.id === on))) continue;
    cands.push({ x, z, top, y: top + LIFT_FLOOR, surf, on });
  }
  const chosen = [], perSurf = new Map();
  const d = (a, b) => Math.hypot(a.x - b.x, a.z - b.z, (a.top - b.top) * 1.2);
  const pick = (pool, want) => {
    for (let k = 0; k < want; k++) {
      let best = null, bs = -1;
      for (const c of pool) {
        if (chosen.includes(c) || (c.surf !== 'gulv' && (perSurf.get(c.surf) || 0) >= MAX_PER_SURFACE)) continue;
        const ref = [{ x: L.start[0], z: L.start[2], top: 0 }, { x: L.goal[0], z: L.goal[2], top: L.goal[1] }, ...chosen];
        const s = Math.min(...ref.map((r) => d(c, r)));
        if (s > bs + 1e-9) { bs = s; best = c; }
      }
      if (!best) break; chosen.push(best); perSurf.set(best.surf, (perSurf.get(best.surf) || 0) + 1);
    }
  };
  const high = cands.filter((c) => c.surf !== 'gulv'), floor = cands.filter((c) => c.surf === 'gulv');
  pick(high, Math.min(6, N - 3)); pick(floor, N - chosen.length); pick(high, N - chosen.length);
  const cx0 = scene.room.width / 2, cz0 = scene.room.depth / 2;
  return chosen.map((c, i) => ({ id: `smule_${i + 1}`, on: c.on, at: [+(c.x * U + cx0).toFixed(1), +(c.z * U + cz0).toFixed(1)] }));
}

// kjører scene2level på en midlertidig kopi og velger smuler
export function autoCrumbs(scene) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'crumbs-'));
  try {
    const sp = path.join(dir, 's.scene.json'), lp = path.join(dir, 'l.level.json');
    fs.writeFileSync(sp, JSON.stringify({ ...scene, collectibles: [] }));
    execFileSync('node', [path.join(HERE, 'scene2level.mjs'), sp, lp], { stdio: 'pipe' });
    return crumbsFromLevel(JSON.parse(fs.readFileSync(lp, 'utf8')), scene);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const f of process.argv.slice(2)) {
    const s = JSON.parse(fs.readFileSync(f, 'utf8')); s.collectibles = autoCrumbs(s);
    fs.writeFileSync(f, JSON.stringify(s, null, 2) + '\n'); console.log(`${f}: ${s.collectibles.length} smuler`);
  }
}
