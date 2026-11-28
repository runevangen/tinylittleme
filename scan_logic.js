// R194: skannet rom (LiDAR, GLB) som bane, trinn 1. Ren logikk (ingen DOM, ingen three), testes i node: test_scan.mjs.
// Inn: trekanter i verdensrom (meter, y opp) = { pos: [x,y,z, …], idx?: [a,b,c, …] }. Ut: en scene (docs/scene.schema.json, cm) med faste bokser (voxel, flettet),
// slik at `sceneToRoom` (leditor_logic.js) gjør den om til et brett. GLB-en tegnes som utseende (scan_view.js) med `transform` (skala 20 = meter → enheter, 1 enhet = 5 cm).
// Deterministisk: samme trekanter og valg gir samme scene. Skannefiler og bilder lagres aldri her (bare tall).

export const SCAN = {
  maxFileMB: 80,            // større filer avvises (velg lavere detalj i Scaniverse/Polycam)
  maxTris: 1500000,         // flere trekanter avvises
  cellCm: 8,                // voxel-celle (5–10 cm er normalt)
  minCellCm: 5, maxCellCm: 40,
  maxBoxes: 450,            // tak på antall bokser; over det brukes grovere celle. (Brett lagres lokalt og valideres til maks 600 bokser / 150 kB, se rooms_logic.js)
  maxDimM: 30,              // rommet kan ikke være større enn dette (x/z)
  minHeightCm: 120, maxHeightCm: 600,
  maxCells: 40e6,           // tak på voxelnettet (minne)
  floorBinM: 0.02, floorMinAreaM2: 0.5, floorFrac: 0.12,   // gulvet: laveste horisontale lag med minst 12 % av det tetteste laget
  clearCm: 12,              // fri høyde for startpunktet
  unitsPerM: 20,            // meter → spillenheter (1 enhet = 5 cm)
  goalMinTopCm: 12, goalMinAreaCm2: 100, goalMax: 8,
};
const R1 = (n) => Math.round(n * 10) / 10;

// Trekantene som en liste (ax,ay,az, bx,by,bz, cx,cy,cz). `idx` er valgfri (uten: tre og tre hjørner).
export function triCount(m) { const n = m && m.idx ? m.idx.length : m && m.pos ? Math.floor(m.pos.length / 3) : 0; return Math.floor(n / 3); }
function vertsOf(m, t, o) { const i = m.idx ? [m.idx[t * 3], m.idx[t * 3 + 1], m.idx[t * 3 + 2]] : [t * 3, t * 3 + 1, t * 3 + 2], p = m.pos; for (let k = 0; k < 3; k++) { o[k * 3] = p[i[k] * 3]; o[k * 3 + 1] = p[i[k] * 3 + 1]; o[k * 3 + 2] = p[i[k] * 3 + 2]; } return o; }
// persentil som trimmer minst 3 punkter i hver ende (en løs støytrekant har tre hjørner), ellers q·n
const pct = (arr, q) => { const a = Float64Array.from(arr).sort(), n = a.length, t = n < 30 ? 0 : Math.max(3, Math.round((q < 0.5 ? q : 1 - q) * n)); return q < 0.5 ? a[Math.min(n - 1, t)] : a[Math.max(0, n - 1 - t)]; };

// 1) gulvnivå (meter): laveste tette, horisontale lag (ikke støypunkter under gulvet). null hvis ingen.
export function findFloor(m, o = {}) {
  const S = { ...SCAN, ...o }, n = triCount(m), v = new Float64Array(9), bin = new Map();
  let maxA = 0;
  for (let t = 0; t < n; t++) {
    vertsOf(m, t, v);
    const ux = v[3] - v[0], uy = v[4] - v[1], uz = v[5] - v[2], wx = v[6] - v[0], wy = v[7] - v[1], wz = v[8] - v[2];
    const nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx, len = Math.hypot(nx, ny, nz); if (!(len > 1e-12)) continue;
    if (Math.abs(ny) / len < 0.85) continue;   // bare omtrent horisontale flater
    const a = len / 2, y = (v[1] + v[4] + v[7]) / 3, k = Math.floor(y / S.floorBinM);
    const e = bin.get(k) || { a: 0, ay: 0 }; e.a += a; e.ay += a * y; bin.set(k, e); if (e.a > maxA) maxA = e.a;
  }
  if (!(maxA >= S.floorMinAreaM2)) return null;
  const keys = [...bin.keys()].sort((p, q) => p - q);
  for (const k of keys) {
    if (bin.get(k).a < S.floorFrac * maxA) continue;
    let a = 0, ay = 0; for (let d = -2; d <= 2; d++) { const e = bin.get(k + d); if (e) { a += e.a; ay += e.ay; } }   // snitt over naboene: jevn flate
    return { y: ay / a, area: a };
  }
  return null;
}

// 2) hele jobben. opts: { cellCm?, maxBoxes?, name? }. Gir { ok:true, scene, transform, info } eller { ok:false, reason: 'tom'|'mange'|'ingen_gulv'|'stor'|'liten' }.
export function scanToScene(m, opts = {}) {
  const S = { ...SCAN, ...opts }, n = triCount(m);
  if (!n || !m.pos || m.pos.length < 9) return { ok: false, reason: 'tom' };
  if (n > S.maxTris) return { ok: false, reason: 'mange', tris: n };
  const fl = findFloor(m, S); if (!fl) return { ok: false, reason: 'ingen_gulv', tris: n };
  const fy = fl.y;
  // rommets rammer fra hjørnene (persentiler: noen støypunkter får ikke gjøre rommet stort)
  const nv = Math.floor(m.pos.length / 3), step = Math.max(1, Math.floor(nv / 200000)), xs = [], ys = [], zs = [];
  for (let i = 0; i < nv; i += step) { if (m.pos[i * 3 + 1] < fy - 0.1) continue; xs.push(m.pos[i * 3]); ys.push(m.pos[i * 3 + 1]); zs.push(m.pos[i * 3 + 2]); }
  if (xs.length < 3) return { ok: false, reason: 'ingen_gulv', tris: n };
  const minX = pct(xs, 0.002), maxX = pct(xs, 0.998), minZ = pct(zs, 0.002), maxZ = pct(zs, 0.998), topY = pct(ys, 0.998);
  const W = (maxX - minX), D = (maxZ - minZ);
  if (W > S.maxDimM || D > S.maxDimM) return { ok: false, reason: 'stor', tris: n };
  if (W < 0.6 || D < 0.6) return { ok: false, reason: 'liten', tris: n };
  const widthCm = R1(W * 100), depthCm = R1(D * 100), heightCm = R1(Math.min(S.maxHeightCm, Math.max(S.minHeightCm, (topY - fy) * 100)));

  let cell = Math.min(S.maxCellCm, Math.max(S.minCellCm, S.cellCm)), vox = null, boxes = null, cells = 0;
  for (let round = 0; round < 12; round++) {
    const nx = Math.ceil(widthCm / cell), ny = Math.ceil(heightCm / cell), nz = Math.ceil(depthCm / cell);
    if (nx * ny * nz > S.maxCells) { cell = Math.min(S.maxCellCm, Math.ceil(cell * 1.25)); continue; }
    vox = voxelize(m, { minX, minZ, fy, cell, nx, ny, nz });
    boxes = mergeBoxes(vox, cell, { widthCm, depthCm, heightCm });
    cells = vox.count;
    if (boxes.length <= S.maxBoxes || cell >= S.maxCellCm) break;
    cell = Math.min(S.maxCellCm, Math.max(cell + 1, Math.ceil(cell * 1.2)));
  }
  let truncated = 0;
  if (boxes.length > S.maxBoxes) { truncated = boxes.length - S.maxBoxes; boxes = boxes.map((b, i) => ({ b, i, v: (b[1] - b[0]) * (b[3] - b[2]) * (b[5] - b[4]) })).sort((p, q) => q.v - p.v || p.i - q.i).slice(0, S.maxBoxes).sort((p, q) => p.i - q.i).map((e) => e.b); }

  const objects = boxes.map((b, i) => ({ id: `skann_${i + 1}`, kind: 'box', material: 'wood', color: '#c8b89a', box: b, confidence: 0.6 }));
  const start = pickStart(vox, cell, S);
  const goals = goalOptions(objects, heightCm, S);
  const g0 = goals[0] || { x: widthCm / 2, y: 0, z: depthCm / 2, on: '' };
  const scene = {
    name: opts.name || 'Skannet rom', units: 'cm', frame: 'Origo i hjørnet (minst x, minst z) av skannet, gulvet er y = 0. Laget av scan_logic.js.',
    source: { photos: 0, views: [], interpreted_by: 'scan_logic.js (voxel av skannet mesh)', scale_anchors: ['skannet i meter (LiDAR)'], uncertainty: 'kollisjon er grove bokser fra skannet; selve skannet vises som utseende' },
    room: { width: widthCm, depth: depthCm, height: heightCm, floor: { material: 'wood', color: '#b99b78' }, walls: { material: 'plaster', color: '#e9e1d3' }, ceiling: { material: 'plaster', color: '#f2ede2' } },
    start: { x: start.x, z: start.z }, goal: { x: g0.x, y: g0.y, z: g0.z, ...(g0.on ? { on: g0.on } : {}) }, objects,
  };
  // meter → enheter: spillkoordinat = (verdens − min) · 20 − halv romstørrelse (enheter); gulvet er y = 0
  const U = S.unitsPerM, transform = { scale: U, offset: [-minX * U - widthCm / 10, -fy * U, -minZ * U - depthCm / 10].map((v) => Math.round(v * 1000) / 1000) };
  return { ok: true, scene, transform, goals, info: { tris: n, cellCm: cell, voxels: cells, boxes: objects.length, truncated, widthCm, depthCm, heightCm, floorM: Math.round(fy * 1000) / 1000, goalCount: goals.length } };
}

// Voxeloverflaten: hver trekant prøves tett nok til at ingen celle på overflaten hoppes over. Gulv-laget, takets øverste lag og ytterste lag mot veggene tas ikke med
// (rommets gulv, vegger og tak lages av sceneToLevel). Enkeltceller uten naboer (støy) fjernes.
function voxelize(m, g) {
  const { minX, minZ, fy, cell, nx, ny, nz } = g, c = cell / 100, n = triCount(m), v = new Float64Array(9), grid = new Uint8Array(nx * ny * nz);
  const idx = (ix, iy, iz) => (iy * nz + iz) * nx + ix;
  const put = (x, y, z) => {
    const ix = Math.floor((x - minX) / c), iy = Math.floor((y - fy) / c), iz = Math.floor((z - minZ) / c);
    if (ix < 0 || iy < 0 || iz < 0 || ix >= nx || iy >= ny || iz >= nz) return; grid[idx(ix, iy, iz)] = 1;
  };
  const step = c * 0.5;
  for (let t = 0; t < n; t++) {
    vertsOf(m, t, v);
    const e = Math.max(Math.hypot(v[3] - v[0], v[4] - v[1], v[5] - v[2]), Math.hypot(v[6] - v[0], v[7] - v[1], v[8] - v[2]), Math.hypot(v[6] - v[3], v[7] - v[4], v[8] - v[5]));
    const k = e <= step ? 1 : Math.ceil(e / step);
    for (let i = 0; i <= k; i++) for (let j = 0; j <= k - i; j++) {
      const a = i / k, b = j / k, d = 1 - a - b;
      put(v[0] * d + v[3] * a + v[6] * b, v[1] * d + v[4] * a + v[7] * b, v[2] * d + v[5] * a + v[8] * b);
    }
  }
  // rydd: gulv (nederste lag), tak (øverste lag), ytterste ring mot veggene
  for (let iy = 0; iy < ny; iy++) for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) {
    const p = idx(ix, iy, iz); if (!grid[p]) continue;
    if (iy === 0 || iy >= ny - 1 || ix === 0 || iz === 0 || ix === nx - 1 || iz === nz - 1) grid[p] = 0;
  }
  // støy: celler uten en eneste nabo (26) fjernes (leses fra en kopi, så resultatet ikke avhenger av rekkefølgen)
  const copy = grid.slice();
  for (let iy = 1; iy < ny - 1; iy++) for (let iz = 1; iz < nz - 1; iz++) for (let ix = 1; ix < nx - 1; ix++) {
    const p = idx(ix, iy, iz); if (!copy[p]) continue;
    let nb = 0; for (let dy = -1; dy <= 1 && !nb; dy++) for (let dz = -1; dz <= 1 && !nb; dz++) for (let dx = -1; dx <= 1; dx++) { if ((dx || dy || dz) && copy[idx(ix + dx, iy + dy, iz + dz)]) { nb = 1; break; } }
    if (!nb) grid[p] = 0;
  }
  let count = 0; for (let i = 0; i < grid.length; i++) if (grid[i]) count++;
  return { grid, nx, ny, nz, count, idx };
}

// Grådig sammenslåing: utvid i x, så z, så y så lenge alle cellene er brukt og ledige. Rekkefølge y, z, x (deterministisk).
function mergeBoxes(vox, cell, R) {
  const { grid, nx, ny, nz, idx } = vox, seen = new Uint8Array(grid.length), out = [];
  const free = (ix, iy, iz) => grid[idx(ix, iy, iz)] && !seen[idx(ix, iy, iz)];
  for (let iy = 0; iy < ny; iy++) for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) {
    if (!free(ix, iy, iz)) continue;
    let x1 = ix; while (x1 + 1 < nx && free(x1 + 1, iy, iz)) x1++;
    let z1 = iz; for (;;) { if (z1 + 1 >= nz) break; let ok = true; for (let x = ix; x <= x1; x++) if (!free(x, iy, z1 + 1)) { ok = false; break; } if (!ok) break; z1++; }
    let y1 = iy; for (;;) { if (y1 + 1 >= ny) break; let ok = true; for (let z = iz; z <= z1 && ok; z++) for (let x = ix; x <= x1; x++) if (!free(x, y1 + 1, z)) { ok = false; break; } if (!ok) break; y1++; }
    for (let y = iy; y <= y1; y++) for (let z = iz; z <= z1; z++) for (let x = ix; x <= x1; x++) seen[idx(x, y, z)] = 1;
    out.push([R1(ix * cell), R1(Math.min(R.widthCm, (x1 + 1) * cell)), R1(iy * cell), R1(Math.min(R.heightCm, (y1 + 1) * cell)), R1(iz * cell), R1(Math.min(R.depthCm, (z1 + 1) * cell))]);
  }
  return out;
}

// Start: en ledig gulvflekk (fri høyde `clearCm` og to celler fri rundt) så nær hjørnet (minst x, størst z) som mulig. Midt i rommet hvis ingenting er fritt.
function pickStart(vox, cell, S) {
  const { grid, nx, ny, nz, idx } = vox, hi = Math.max(1, Math.min(ny - 1, Math.ceil(S.clearCm / cell)));
  const colFree = (ix, iz) => { if (ix < 0 || iz < 0 || ix >= nx || iz >= nz) return false; for (let iy = 0; iy <= hi; iy++) if (grid[idx(ix, iy, iz)]) return false; return true; };
  let best = null, bd = Infinity;
  for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) {
    if (!colFree(ix, iz)) continue; let ok = true; for (let dz = -2; dz <= 2 && ok; dz++) for (let dx = -2; dx <= 2; dx++) if (!colFree(ix + dx, iz + dz)) { ok = false; break; }
    if (!ok) continue;
    const d = ix * ix + (nz - 1 - iz) * (nz - 1 - iz); if (d < bd) { bd = d; best = [ix, iz]; }
  }
  if (!best) return { x: R1(nx * cell / 2), z: R1(nz * cell / 2), free: false };
  return { x: R1((best[0] + 0.5) * cell), z: R1((best[1] + 0.5) * cell), free: true };
}

// Målforslag: de høyeste, brede flatene (cm). Rekkefølge: høyest først, så størst. { x, y, z, on, top, area }
export function goalOptions(objects, heightCm, o = {}) {
  const S = { ...SCAN, ...o }, out = [];
  for (const ob of objects) {
    const [x0, x1, , y1, z0, z1] = ob.box, area = (x1 - x0) * (z1 - z0);
    if (y1 < S.goalMinTopCm || area < S.goalMinAreaCm2 || y1 > heightCm - 20) continue;
    out.push({ x: R1((x0 + x1) / 2), y: R1(y1), z: R1((z0 + z1) / 2), on: ob.id, top: y1, area });
  }
  out.sort((a, b) => b.top - a.top || b.area - a.area || (a.on < b.on ? -1 : 1));
  return out.slice(0, S.goalMax);
}
// Samme scene med et annet mål (ett av goalOptions).
export function withGoal(scene, g) { const s = JSON.parse(JSON.stringify(scene)); s.goal = { x: g.x, y: g.y, z: g.z, on: g.on }; return s; }

// ---- grenser og tekst-nøkler (visningen oversetter) ----
export function fileCheck(bytes, o = {}) { const S = { ...SCAN, ...o }; if (!(bytes > 0)) return 'tom'; if (bytes > S.maxFileMB * 1048576) return 'fil_stor'; return ''; }
export const scanLog = (what, d = {}) => `${what}${d.bytes != null ? `, ${(d.bytes / 1048576).toFixed(1)} MB` : ''}${d.tris != null ? `, ${d.tris} trekanter` : ''}${d.boxes != null ? `, ${d.boxes} bokser` : ''}${d.cellCm != null ? `, celle ${d.cellCm} cm` : ''}${d.ms != null ? `, ${Math.round(d.ms)} ms` : ''}${d.err ? `, feil: ${String(d.err).slice(0, 80)}` : ''}`;
export const SCAN_ID_RE = /^scan-[a-z0-9]{6,12}$/;
export const newScanId = (rnd = Math.random) => { let s = 'scan-'; for (let i = 0; i < 8; i++) s += 'abcdefghjkmnpqrstuvwxyz23456789'[Math.floor(rnd() * 31)]; return s; };
// Utseendet som følger brettet: { id, scale, offset:[x,y,z] } (tall, aldri filen). Hentes opp av main.js via `level.scan`.
export function scanInfo(id, transform, heightCm) { return { id, scale: transform.scale, offset: transform.offset.slice(), ...(heightCm ? { cut: Math.round((heightCm / 5 - 1.5) * 100) / 100 } : {}) }; }   // cut: taket klippes bort (y i enheter)
export const scanOk = (s) => !!s && SCAN_ID_RE.test(String(s.id)) && Number.isFinite(s.scale) && s.scale > 0 && Array.isArray(s.offset) && s.offset.length === 3 && s.offset.every(Number.isFinite);
