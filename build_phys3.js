// R129: 3D-fysikk for fagverk (ren logikk, kjøres i node). En liten, DETERMINISTISK solver for stavverk i tre dimensjoner (x langs veien, y opp, z dybde): XPBD (posisjonsbasert, avstandsbånd med ettergivenhet),
// fast tidssteg, ingen tilfeldighet og fast rekkefølge, så samme bygg gir alltid samme utfall.
//  - hver stav er et avstandsbånd mellom to knuter (som i 2D: leddene er knuter). Kraften langs staven kommer rett ut av båndet (lambda / h²), glattet over et steg.
//  - brudd: kraften over kapasiteten i BREAK_STEPS steg på rad. Kapasitet etter materiale (GRID_MAT, build_materials.js): strekk = st·h, trykk = min(knusing sc·h, Euler-knekking 822·E·h³/L²), alt skalert med CAP_K.
//    Tau og kabel bærer bare strekk: ensidig avstandsbinding (slakk i trykk), knekker ikke.
//  - last (kule/bil): en punktmasse som kjører langs dekket (dekk-knutene sortert på x) og gir kraft ned på de to nærmeste dekk-knutene (lineært fordelt).
//  - en liten, fast sidestøt de første stegene (DISTURB) gir ustabile bygg (tårn på én stav, boks uten diagonaler) en grunn til å velte; stive bygg står.
//  - kjøretid: lokalt målt tall i test_grid3d.mjs (tak: 40 knuter / 120 staver, under 2 s også uten GPU). Ekte følelse: testes på iPhone.
import { GRID_MAT, EULER } from './build_materials.js';
import { nodeOf, rodLen, siteRoad, userRods } from './grid3d_logic.js';

export const PHYS3 = {          // tallene kan finjusteres (R130 legger dem i SETTINGS, admin)
  G: 9.8, DT: 1 / 60, SUB: 8, ITER: 4, DAMP: 1.5, RAMP: 0.6, MASS_K: 1,
  CAP_K: 0.5,                   // kapasitetene i build_materials.js er i 2D-skala; her skalert slik at last og kapasitet er i samme størrelsesorden
  STIFF: { wood: 60000, steel: 180000, rope: 80000, cable: 180000 },   // kraft per enhet tøyning (bånd: ettergivenhet = lengde / stivhet)
  BREAK_STEPS: 3, FILTER: 0.35,
  DISTURB: [0.5, 0.35], DISTURB_T: 0.25,   // sidestøt (akselerasjon i x og z) de første sekundene
  FALL_D: 1.2, DRIFT: 0.4,     // en knute som har flyttet seg mer enn FALL_D har falt; i STAND-prøven får ingen knute flytte seg mer enn DRIFT
  T_STAND: 4.5, T_MAX: 10,
};
export const LOADS3 = { ball: { m: 18, speed: 2.4, name: 'Kule', en: 'Ball' }, car: { m: 40, speed: 2, name: 'Bil', en: 'Car' }, heavy: { m: 160, speed: 2, name: 'Tung bil', en: 'Heavy car' } };
export const DEFAULT_LOAD3 = 'ball';

// kapasitet for en stav: { pcr, ccap, tcap, rope }
export function capacity3(mat, L) {
  const M = GRID_MAT[mat], K = PHYS3.CAP_K;
  if (M.rope) return { pcr: Infinity, ccap: Infinity, tcap: M.st * M.h * K, rope: true };
  return { pcr: EULER * M.E * M.h * M.h * M.h / (L * L) * K, ccap: M.sc * M.h * K, tcap: M.st * M.h * K, rope: false };
}

// definisjonen simulatoren vil ha, ut av et bygg B = { site, rg }. extra = { nodeId: masse } (fast masse, f.eks. last på toppen av et tårn)
export function simDef3(B, extra = {}) {
  const G = B.rg, rd = siteRoad(B.site);
  const nodes = G.nodes.map((n) => ({ id: n.id, x: n.x, y: n.y, z: n.z, fixed: !!n.fixed }));
  const rods = G.rods.map((r) => ({ id: r.id, a: r.a, b: r.b, mat: r.mat, deck: !!r.deck }));
  const road = G.deck && rd ? G.nodes.filter((n) => n.deck || (n.fixed && Math.abs(n.y - rd.left.y) < 1e-3 && Math.abs(n.z - rd.left.z) < 1e-3 && n.x >= rd.left.x - 1e-3 && n.x <= rd.right.x + 1e-3 && (Math.abs(n.x - rd.left.x) < 1e-3 || Math.abs(n.x - rd.right.x) < 1e-3))).sort((a, b) => a.x - b.x).map((n) => n.id) : [];
  return { nodes, rods, mass: { ...extra }, road };
}

// opts: { load: 'ball' | 'car' | 'heavy' | null (ingen last), mode: 'load' | 'stand' }
export function createSim3(def, opts = {}) {
  const P = PHYS3, h = P.DT / P.SUB, idx = new Map(def.nodes.map((n, i) => [n.id, i])), N = def.nodes.length;
  const px = new Float64Array(N), py = new Float64Array(N), pz = new Float64Array(N), vx = new Float64Array(N), vy = new Float64Array(N), vz = new Float64Array(N), w = new Float64Array(N), x0 = new Float64Array(N), y0 = new Float64Array(N), z0 = new Float64Array(N), m = new Float64Array(N);
  def.nodes.forEach((n, i) => { px[i] = x0[i] = n.x; py[i] = y0[i] = n.y; pz[i] = z0[i] = n.z; });
  const rods = def.rods.map((r) => {
    const a = idx.get(r.a), b = idx.get(r.b), L = Math.hypot(px[a] - px[b], py[a] - py[b], pz[a] - pz[b]), cap = capacity3(r.mat, L), M = GRID_MAT[r.mat];
    m[a] += M.m * L * P.MASS_K / 2; m[b] += M.m * L * P.MASS_K / 2;
    return { id: r.id, a, b, L, mat: r.mat, deck: !!r.deck, rope: cap.rope, alpha: L / P.STIFF[r.mat], pcr: cap.pcr, ccap: cap.ccap, tcap: cap.tcap, f: 0, over: 0, broken: false, mode: null };
  });
  for (const [id, mass] of Object.entries(def.mass || {})) if (idx.has(id)) m[idx.get(id)] += mass;
  def.nodes.forEach((n, i) => { w[i] = n.fixed ? 0 : 1 / Math.max(m[i], 0.05); });
  const LD = opts.load ? LOADS3[opts.load] : null, road = (def.road || []).map((id) => idx.get(id)), mode = opts.mode || (LD && road.length >= 2 ? 'load' : 'stand');
  const sim = { t: 0, steps: 0, breaks: [], state: { state: 'run', reason: null }, load: null, mode, def, rods, pos: { x: px, y: py, z: pz }, ids: def.nodes.map((n) => n.id) };
  if (mode === 'load' && LD && road.length >= 2) sim.load = { m: LD.m, speed: LD.speed, s: px[road[0]], end: px[road[road.length - 1]], seg: 0, n: 0 };
  const lam = new Float64Array(rods.length), fsum = new Float64Array(rods.length);
  const disp = (i) => Math.hypot(px[i] - x0[i], py[i] - y0[i], pz[i] - z0[i]);

  function loadForce(fy) {   // lasten står på det dekk-feltet hvor den er; vekten fordeles på de to dekk-knutene
    const L = sim.load; if (!L) return;
    let k = 0; while (k < road.length - 2 && px[road[k + 1]] < L.s) k++;
    const a = road[k], b = road[k + 1], dx = px[b] - px[a], t = dx > 1e-6 ? Math.min(1, Math.max(0, (L.s - px[a]) / dx)) : 0; L.seg = k;
    const W = L.m * P.G * h * Math.min(1, sim.t / P.RAMP); fy.a = a; fy.b = b; fy.wa = W * (1 - t); fy.wb = W * t;
  }
  const fy = { a: -1, b: -1, wa: 0, wb: 0 };
  sim.step = function step() {
    if (sim.state.state !== 'run') return sim.state;
    fsum.fill(0);
    const dist = sim.t < P.DISTURB_T, gk = Math.min(1, sim.t / P.RAMP);   // tyngden og lasten settes på jevnt (bygget senkes ned), ellers gir det første støtet falske brudd
    for (let s = 0; s < P.SUB; s++) {
      if (sim.load) loadForce(fy); else { fy.a = -1; fy.b = -1; }
      const ox = new Float64Array(px), oy = new Float64Array(py), oz = new Float64Array(pz);
      for (let i = 0; i < N; i++) {
        if (!w[i]) continue;
        let ax = 0, az = 0; if (dist) { ax = P.DISTURB[0] * (i % 2 ? 1 : 0.6); az = P.DISTURB[1] * (i % 3 ? 1 : 0.5); }
        vy[i] -= P.G * gk * h; vx[i] += ax * h; vz[i] += az * h;
        if (i === fy.a) vy[i] -= fy.wa * w[i]; if (i === fy.b) vy[i] -= fy.wb * w[i];
        const dmp = 1 - P.DAMP * h; vx[i] *= dmp; vy[i] *= dmp; vz[i] *= dmp;
        px[i] += vx[i] * h; py[i] += vy[i] * h; pz[i] += vz[i] * h;
      }
      lam.fill(0);
      for (let it = 0; it < P.ITER; it++) for (let q = 0; q < rods.length; q++) {
        const r = rods[q]; if (r.broken) continue; const a = r.a, b = r.b, dx = px[a] - px[b], dy = py[a] - py[b], dz = pz[a] - pz[b], len = Math.hypot(dx, dy, dz) || 1e-9, C = len - r.L;
        if (r.rope && C < 0) continue;   // tau og kabel er slakke i trykk
        const wsum = w[a] + w[b]; if (!wsum) continue; const at = r.alpha / (h * h), dl = -(C + at * lam[q]) / (wsum + at); lam[q] += dl;
        const nx = dx / len, ny = dy / len, nz = dz / len;
        px[a] += w[a] * dl * nx; py[a] += w[a] * dl * ny; pz[a] += w[a] * dl * nz; px[b] -= w[b] * dl * nx; py[b] -= w[b] * dl * ny; pz[b] -= w[b] * dl * nz;
      }
      for (let q = 0; q < rods.length; q++) fsum[q] += -lam[q] / (h * h);   // strekk > 0, trykk < 0
      for (let i = 0; i < N; i++) { if (!w[i]) continue; vx[i] = (px[i] - ox[i]) / h; vy[i] = (py[i] - oy[i]) / h; vz[i] = (pz[i] - oz[i]) / h; }
    }
    sim.t += P.DT; sim.steps++;
    for (let q = 0; q < rods.length; q++) {
      const r = rods[q]; if (r.broken) { r.f = 0; continue; }
      r.f += (fsum[q] / P.SUB - r.f) * P.FILTER; const cap = r.f >= 0 ? r.tcap : Math.min(r.pcr, r.ccap);
      if (Math.abs(r.f) > cap && !(r.rope && r.f < 0)) r.over++; else r.over = 0;
      if (r.over >= P.BREAK_STEPS) { r.broken = true; r.mode = r.f >= 0 ? 'tear' : (r.pcr < r.ccap ? 'buckle' : 'crush'); sim.breaks.push({ id: r.id, t: +sim.t.toFixed(3), mode: r.mode }); }
    }
    if (sim.load && sim.t >= P.RAMP) { sim.load.s += sim.load.speed * P.DT; sim.load.n++; }
    // utfall
    let far = 0; for (let i = 0; i < N; i++) if (w[i]) far = Math.max(far, disp(i)); sim.maxDisp = far;
    if (sim.breaks.length) sim.state = { state: 'lost', reason: 'brudd' };
    else if (far > P.FALL_D) sim.state = { state: 'lost', reason: 'fall' };
    else if (sim.load && sim.load.s >= sim.load.end) sim.state = { state: 'won', reason: null };
    else if (!sim.load && sim.t >= P.T_STAND) sim.state = far <= P.DRIFT ? { state: 'won', reason: null } : { state: 'lost', reason: 'drift' };
    else if (sim.t >= P.T_MAX) sim.state = { state: 'lost', reason: 'tid' };
    return sim.state;
  };
  // kraft langs hver stav i samme form som 2D-fysikken (grid_stress.js rodLoad): { id, nc, nt, pcr, tcap, ccap, broken, mode }
  sim.axial = () => rods.map((r) => ({ id: r.id, nc: Math.max(0, -r.f), nt: Math.max(0, r.f), pcr: r.pcr, tcap: r.tcap, ccap: r.ccap, broken: r.broken, mode: r.mode }));
  sim.nodePos = () => sim.ids.map((id, i) => ({ id, x: px[i], y: py[i], z: pz[i] }));
  sim.loadPos = () => (sim.load ? { x: sim.load.s, seg: sim.load.seg } : null);
  return sim;
}

// kjører en hel prøve. Returnerer { result: 'won' | 'lost', reason, t, steps, breaks, maxDisp, nodes } (nodes: slutt-posisjoner, avrundet, for deterministisk sammenligning)
export function runSim3(def, opts = {}) {
  const sim = createSim3(def, opts), max = Math.ceil((PHYS3.T_MAX + 1) / PHYS3.DT);
  for (let i = 0; i < max && sim.state.state === 'run'; i++) sim.step();
  const rd = (v) => Math.round(v * 1e6) / 1e6;
  return { result: sim.state.state === 'won' ? 'won' : 'lost', reason: sim.state.reason, t: +sim.t.toFixed(3), steps: sim.steps, breaks: sim.breaks, maxDisp: rd(sim.maxDisp || 0), mode: sim.mode, nodes: sim.nodePos().map((n) => ({ id: n.id, x: rd(n.x), y: rd(n.y), z: rd(n.z) })) };
}
// bekvem: bygg -> prøve
export const runBuild3 = (B, opts = {}, extra = {}) => runSim3(simDef3(B, extra), opts);
export { rodLen, nodeOf, userRods };
