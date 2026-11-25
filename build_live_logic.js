// R49b: live-vekt i verdenen, første trinn. Ren logikk (ingen DOM, ingen three.js, kan kjøres i node).
// Et bygg som står i verdenen (build_world.js) gir etter når figuren (eller noe den bærer) står på det, og brister over grensen.
// Ingen ny fysikkmodell: grensen er `capacity()` (build_capacity.js, «tåler ca. N klosser»), regnet om til figur-enheter.
//   1 figur = 1 enhet. Bygget tåler minst én figur (det har bestått PRØV med den), altså grense = max(1, N) × stivhet.
//   Noe figuren bærer teller som en enhet til. Maur er ikke last i dette trinnet.
// Nedbøyningen er bare visuell og i verdenen: boksene og meshen flyttes ned med samme tall, glatt, og tilbake når lasten er borte.
import { partSlabs } from './build_world.js';
import { partType } from './build_logic.js';

export const DEFL_MAX = 0.35;       // største nedbøyning (enheter à 5 cm)
export const DEFL_RATE = 1.4;       // hvor fort nedbøyningen følger lasten (enheter per sekund), så figuren aldri «faller» gjennom flaten
export const FIG_LOAD = 1;          // figuren i figur-enheter
export const CARRY_LOAD = 1;        // noe figuren bærer
export const STIFF_MIN = 0.1, STIFF_MAX = 3, STIFF_DEF = 1;
export const LIVE_TOP_TOL = 0.12;   // hvor mye over/under toppen av en del figurens fot kan være for at delen bærer den

export const stiffOf = (s) => (Number.isFinite(+s) && +s > 0 ? Math.min(STIFF_MAX, Math.max(STIFF_MIN, +s)) : STIFF_DEF);

// grensen (figur-enheter) ut av capacity()-svaret ({n, max, capped}) og stivhet. Uten bygg/kapasitet: minst én figur.
export const liveLimit = (cap, stiff = STIFF_DEF) => Math.max(1, cap && Number.isFinite(cap.n) ? cap.n : 0) * stiffOf(stiff);

// øverste flate av en del ved u (designposen), eller null om delen ikke dekker u
export function topAt(part, u) {
  let top = null;
  for (const s of partSlabs(part)) if (u >= s.u0 - 1e-9 && u <= s.u1 + 1e-9) top = Math.max(top ?? -Infinity, s.v1);
  return top;
}

// hvilken del bærer en ting som står ved (u, v)? Den øverste flaten ved u som ligger ved eller litt under foten. null om ingen.
export function supportOf(placed, u, v, tol = LIVE_TOP_TOL) {
  let best = null, bt = -Infinity;
  for (const p of placed || []) {
    const t = topAt(p, u); if (t === null) continue;
    if (t <= v + tol && t >= v - DEFL_MAX - tol && t > bt) { bt = t; best = p.id; }
  }
  return best;
}

// last per del (id -> figur-enheter). standing: [{ u, v, load?, part? }] i byggestedets koordinater (u bortover, v = fotens høyde).
// Står `part` oppgitt (den ekte flaten under figuren) brukes den; ellers finner vi delen fra u og v. Ting uten bærende del gir ingen last.
export function liveLoad(placed, standing) {
  const out = new Map();
  for (const s of standing || []) {
    const id = s.part && (placed || []).some((p) => p.id === s.part) ? s.part : supportOf(placed, s.u, s.v);
    if (id == null) continue;
    out.set(id, (out.get(id) || 0) + (Number.isFinite(s.load) ? s.load : FIG_LOAD));
  }
  return out;
}

// lengden på en del gir myke planker mer nedbøyning enn korte klosser
export const softness = (part) => { const w = partType(part?.type)?.w || 4; return Math.min(1, Math.max(0.4, 0.4 + 0.6 * w / 8)); };

// nedbøyning i enheter: 0 uten last, jevn og stigende (metter mot DEFL_MAX), aldri over DEFL_MAX. cap = grensen for delen (figur-enheter).
export function deflection(load, cap, part) {
  if (!(load > 0) || !(cap > 0)) return 0;
  const r = Math.min(1, load / cap), k = 3, f = (1 - Math.exp(-k * r)) / (1 - Math.exp(-k));
  return DEFL_MAX * f * softness(part);
}
// over grensen? (lik grense holder)
export const breaks = (load, cap) => load > 0 && cap > 0 && load > cap + 1e-9;

// glatt mot målet: aldri raskere enn DEFL_RATE. Negativ dt gir ingen endring.
export function approach(cur, target, dt, rate = DEFL_RATE) {
  if (!(dt > 0)) return cur;
  const step = rate * dt; return Math.abs(target - cur) <= step ? target : cur + Math.sign(target - cur) * step;
}

// Tilstand per sted: { defl: Map(id -> nå), broken: Set(id), max } og ett steg. Returnerer { broke: [id], maxDefl }.
export const liveState = () => ({ defl: new Map(), broken: new Set(), max: 0 });
export function liveStep(st, placed, standing, cap, dt, opts = {}) {
  const loads = liveLoad(placed, standing), broke = [];
  for (const p of placed || []) {
    if (st.broken.has(p.id)) continue;
    const l = loads.get(p.id) || 0;
    if (breaks(l, cap)) { st.broken.add(p.id); st.defl.delete(p.id); broke.push(p.id); continue; }
    const target = deflection(l, cap, p), cur = st.defl.get(p.id) || 0, nxt = opts.snap ? target : approach(cur, target, dt);
    if (nxt > 1e-5 || cur > 1e-5) st.defl.set(p.id, nxt < 1e-5 ? 0 : nxt);
    if (nxt > st.max) st.max = nxt;
  }
  return { broke, maxDefl: Math.max(0, ...[...st.defl.values()]) };
}
