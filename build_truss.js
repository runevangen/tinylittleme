// R49a2: hjelp som viser stive og slappe deler i fagverk (ren logikk: ingen DOM, ingen three.js, kjøres i node).
//  - floppyJoints(def): ledd som kan svinge. Hver del er en stiv kropp (3 frihetsgrader: u, v, vinkel); et ledd fjerner 2, tape fjerner 3, et ledd mot underlaget fester et punkt.
//    Vi finner bevegelsene som er mulige uten å bruke noe kraft (nullrommet til ligningene for småbevegelser) og peker på leddene der to deler kan dreie mot hverandre.
//    En trekant av tre ledd-forbundne planker har ingen slike bevegelser; en firkant har én. «Legg til en diagonal» foreslår to hjørner som ikke henger direkte sammen.
//  - slenderParts(def): slanke deler som er festet i et fagverk og knekker ved lite trykk (Euler: kapasitet ∝ E·h³/L²), med «tåler ca. N klosser»
// Alt er deterministisk (ingen simulering): samme bygg gir alltid samme svar.
import { partType, toWorldPt } from './build_logic.js';
import { buckleLoad, crushCap } from './build_materials.js';

export const BLOCK_FORCE = 288;       // en kloss veier 9 kuler · 1 · tyngde 32
export const FLAT_BLOCKS = 3;
export const SLENDER_BLOCKS = 9;      // en slank del (kjede) som knekker under så mange klosser, regnes som «slank»
const EPS = 1e-9;

// nullrommet til A (m rader, n kolonner): Gauss-eliminasjon med delvis pivotering, faste rekkefølger
function nullspace(A, n) {
  const R = A.map((r) => r.slice()), piv = []; let row = 0;
  for (let c = 0; c < n && row < R.length; c++) {
    let p = row; for (let i = row + 1; i < R.length; i++) if (Math.abs(R[i][c]) > Math.abs(R[p][c])) p = i;
    if (Math.abs(R[p][c]) < EPS) continue;
    [R[row], R[p]] = [R[p], R[row]]; const d = R[row][c]; for (let j = c; j < n; j++) R[row][j] /= d;
    for (let i = 0; i < R.length; i++) if (i !== row && Math.abs(R[i][c]) > 0) { const f = R[i][c]; for (let j = c; j < n; j++) R[i][j] -= f * R[row][j]; }
    piv.push(c); row++;
  }
  const free = []; for (let c = 0; c < n; c++) if (!piv.includes(c)) free.push(c);
  return free.map((fc) => { const v = new Array(n).fill(0); v[fc] = 1; piv.forEach((pc, r) => { v[pc] = -R[r][fc]; }); return v; });
}

// def: { placed: [{id,type,u,v,rot}], links: [...] } (som createSim). Svar: { joints: [{ id, kind, u, v }], dof, suggest: { a, b } | null }
export function floppyJoints(def) {
  const placed = def.placed || [], idx = new Map(placed.map((p, i) => [p.id, i])), n = placed.length * 3, rows = [], pins = [];
  const addPin = (l, A, B, pt) => {      // fart i punktet er lik for de to delene: vA + ωA × (m − cA) = vB + ωB × (m − cB)
    const ia = idx.get(l.a), ib = B ? idx.get(l.b) : -1, a = placed[ia], b = B ? placed[ib] : null;
    for (const k of [0, 1]) { const r = new Array(n).fill(0); r[ia * 3 + k] = 1; r[ia * 3 + 2] = k === 0 ? -(pt.v - a.v) : (pt.u - a.u); if (b) { r[ib * 3 + k] = -1; r[ib * 3 + 2] = k === 0 ? (pt.v - b.v) : -(pt.u - b.u); } rows.push(r); }
    if (l.kind === 'tape') { const r = new Array(n).fill(0); r[ia * 3 + 2] = 1; if (b) r[ib * 3 + 2] = -1; rows.push(r); }
  };
  for (const l of def.links || []) {
    if (l.kind !== 'hinge' && l.kind !== 'tape') continue; if (!idx.has(l.a) || (l.b && !idx.has(l.b))) continue;
    const a = placed[idx.get(l.a)], pt = toWorldPt(a, l.la.x, l.la.y);
    addPin(l, a, !!l.b, pt); pins.push({ link: l, pt, ia: idx.get(l.a), ib: l.b ? idx.get(l.b) : -1 });
  }
  if (!pins.length) return { joints: [], dof: 0, suggest: null };
  const modes = nullspace(rows, n), joints = [];
  for (const p of pins) {
    if (p.link.kind !== 'hinge') continue;
    const swing = modes.some((m) => Math.abs(m[p.ia * 3 + 2] - (p.ib >= 0 ? m[p.ib * 3 + 2] : 0)) > 1e-7);
    if (swing) joints.push({ id: p.link.id, kind: 'hinge', u: p.pt.u, v: p.pt.v, a: p.link.a, b: p.link.b || null });
  }
  joints.sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
  return { joints, dof: modes.length, suggest: suggestDiagonal(joints) };
}
// to ledd som kan svinge og ikke sitter på samme del: kortest mulige diagonal (stivere og billigere enn en lang)
export function suggestDiagonal(joints) {
  let best = null;
  for (let i = 0; i < joints.length; i++) for (let j = i + 1; j < joints.length; j++) {
    const a = joints[i], b = joints[j]; if (a.a === b.a || a.a === b.b || (a.b && (a.b === b.a || a.b === b.b))) continue;
    const d = Math.hypot(a.u - b.u, a.v - b.v); if (d > 0.5 && (!best || d < best.d - 1e-9)) best = { d, a: { u: a.u, v: a.v }, b: { u: b.u, v: b.v } };
  }
  return best ? { a: best.a, b: best.b } : null;
}

// slanke deler som er festet med ledd/tape/tau/gummi (da bærer de kraft langs lengden). blocks = ca. antall klosser de tåler i trykk før de knekker
export function slenderParts(def, opts = {}) {
  const strength = opts.strength ?? 1, linked = new Set(); for (const l of def.links || []) { linked.add(l.a); if (l.b) linked.add(l.b); }
  const out = [];
  for (const p of def.placed || []) {
    const ty = partType(p.type); if (ty.w < ty.h * 2 || !linked.has(p.id) || ty.pivot) continue;
    const cap = Math.min(buckleLoad(p.type, ty.w, ty.h), crushCap(p.type, ty.h)) * strength, blocks = Math.floor(cap / BLOCK_FORCE);
    const flat = Math.abs(Math.sin(p.rot || 0)) < 0.2;      // vannrette deler ligger vanligvis på noe og bøyer i stedet for å knekke; bare svært slanke flagges
    if (blocks < (flat ? FLAT_BLOCKS : SLENDER_BLOCKS)) out.push({ id: p.id, type: p.type, u: p.u, v: p.v, blocks, ratio: +(ty.w / ty.h).toFixed(1) });
  }
  return out.sort((x, y) => x.blocks - y.blocks || (x.id < y.id ? -1 : 1));
}

// alt hjelpen trenger: { joints, suggest, slender }. on = false gir tom hjelp.
export function trussHelp(def, opts = {}) {
  if (opts.on === false) return { joints: [], suggest: null, slender: [], dof: 0 };
  const f = floppyJoints(def); return { joints: f.joints, suggest: f.suggest, slender: slenderParts(def, opts), dof: f.dof };
}
// teksten som hører til: nøkkel i i18n.js
export function helpKey(h) { return h.joints.length ? 'build.help.floppy' : h.slender.length ? 'build.help.slender' : null; }
