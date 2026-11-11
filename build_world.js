// R26: bygget flyttes ut i verdenen. Ren logikk (ingen DOM, ingen three.js, kan kjøres i node).
// Når PRØV lykkes, blir delene i byggestedet til faste kollisjonsflater (vanlige AABB-er i L.boxes) slik at den ekte figuren kan gå og klatre på dem.
// Byggestedet er et sideriss: u går langs x (fra midten av stedet), v oppover fra site.y, og stedet har dybden `site.d` (enheter, standard DEPTH) i z.
// Rotert planke/kloss gjøres om til smale «skiver» (en rampe av små trinn). Nedbøyning i fysikken (build_phys.js) er bare visuell: verden bruker designposen.
import { partType, corners } from './build_logic.js';

export const DEPTH = 4;           // dybden på bygget i verden (enheter, 20 cm): bred nok til at figuren kan gå på det
export const SLAB = 0.25;         // bredden på en skive i en rampe
const TILT_EPS = 0.02;            // under dette (rad) regnes delen som rett

export const siteDepth = (site) => site.d ?? DEPTH;

// høyden (nedre og øvre) til en konveks firkant ved x (null utenfor)
function spanAt(cs, x) {
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < 4; i++) {
    const a = cs[i], b = cs[(i + 1) % 4], x0 = Math.min(a.u, b.u), x1 = Math.max(a.u, b.u);
    if (x < x0 - 1e-9 || x > x1 + 1e-9) continue;
    const y = x1 - x0 < 1e-9 ? null : a.v + (b.v - a.v) * (x - a.u) / (b.u - a.u);
    if (y === null) { lo = Math.min(lo, a.v, b.v); hi = Math.max(hi, a.v, b.v); } else { lo = Math.min(lo, y); hi = Math.max(hi, y); }
  }
  return lo <= hi ? { lo, hi } : null;
}

// én del -> liste av { u0, u1, v0, v1 } i byggestedets koordinater
export function partSlabs(part) {
  const cs = corners(part), us = cs.map((c) => c.u), vs = cs.map((c) => c.v);
  const u0 = Math.min(...us), u1 = Math.max(...us), r = Math.abs(((part.rot || 0) % (Math.PI / 2) + Math.PI / 2) % (Math.PI / 2));
  if (r < TILT_EPS || Math.PI / 2 - r < TILT_EPS) return [{ u0, u1, v0: Math.min(...vs), v1: Math.max(...vs) }];
  const out = [], n = Math.max(1, Math.ceil((u1 - u0) / SLAB));
  for (let i = 0; i < n; i++) {
    const a = u0 + (u1 - u0) * i / n, b = u0 + (u1 - u0) * (i + 1) / n;
    const s0 = spanAt(cs, a + 1e-6), s1 = spanAt(cs, b - 1e-6), sm = spanAt(cs, (a + b) / 2); if (!sm) continue;
    // skiva dekker hele spennet innenfor sitt utsnitt (så rampen blir tett og toppen følger den høyeste kanten)
    const lo = Math.min(s0 ? s0.lo : sm.lo, s1 ? s1.lo : sm.lo, sm.lo), hi = Math.max(s0 ? s0.hi : sm.hi, s1 ? s1.hi : sm.hi, sm.hi);
    if (hi - lo > 0.05) out.push({ u0: a, u1: b, v0: lo, v1: hi });
  }
  return out;
}

// alle kollisjonsflater et bygg gir, i verdenskoordinater (samme format som `box()` i physics.js)
export function buildSolids(site, placed) {
  const hd = siteDepth(site) / 2, out = [];
  for (const p of placed || []) {
    const t = partType(p.type);
    for (const s of partSlabs(p)) {
      out.push({ type: t.solid || 'wood', id: `bygg_${site.id}_${p.id}`, built: site.id, material: 'wood', color: parseInt(String(t.color).slice(1), 16) || 0xc98a45,
        min: [site.x + s.u0, site.y + s.v0, site.z - hd], max: [site.x + s.u1, site.y + s.v1, site.z + hd] });
    }
  }
  return out;
}

// legg bygget inn i brettets bokser (erstatter det som lå der fra før for stedet). Returnerer antall bokser.
export function applyBuilt(L, site, placed) {
  clearBuilt(L, site.id);
  const bx = buildSolids(site, placed); L.boxes ||= []; for (const b of bx) L.boxes.push(b); return bx.length;
}
export function clearBuilt(L, siteId) {
  if (!L.boxes) return 0; let n = 0;
  for (let i = L.boxes.length - 1; i >= 0; i--) if (L.boxes[i].built && (siteId == null || L.boxes[i].built === siteId)) { L.boxes.splice(i, 1); n++; }
  return n;
}
export const builtCount = (L, siteId) => (L.boxes || []).filter((b) => b.built && (siteId == null || b.built === siteId)).length;

// står figuren inne i det nye bygget? Løft den til toppen (aldri fast inni noe). Returnerer true om den ble flyttet.
export function liftOut(L, p, siteId, half = 0.3, h = 1.7) {
  let top = null;
  for (const b of L.boxes || []) {
    if (!b.built || (siteId != null && b.built !== siteId)) continue;
    if (p.x + half > b.min[0] && p.x - half < b.max[0] && p.z + half > b.min[2] && p.z - half < b.max[2] && p.y + h > b.min[1] + 1e-3 && p.y < b.max[1] - 1e-3) top = Math.max(top ?? -Infinity, b.max[1]);
  }
  if (top === null) return false; p.y = top + 0.01; return true;
}

// ---- referansebygg og bevis (brukes av tools/ og testene) ----
// site.ref = { placed: [{id,type,u,v,rot}], links: [], surfaces: [{id,u0,u1,top}], route: [id,...] }
// route: id-er fra brettets rute (L.route), fra tingene i brettet (L.boxes) og fra `surfaces` (flater bygget gir, i byggestedets koordinater). Gir en rute i samme format som L.route.
export function refRoute(L, site) {
  const ref = site.ref; if (!ref?.route) return null;
  const hd = siteDepth(site) / 2, byId = new Map();
  for (const b of L.boxes || []) if (b.id && b.type !== 'wall' && b.type !== 'floor') byId.set(b.id, { id: b.id, x0: b.min[0], x1: b.max[0], z0: b.min[2], z1: b.max[2], top: b.max[1] });
  for (const n of L.route || []) byId.set(n.id, n);
  for (const s of ref.surfaces || []) byId.set(s.id, { id: s.id, x0: site.x + s.u0, x1: site.x + s.u1, z0: site.z - hd, z1: site.z + hd, top: site.y + s.top });
  const out = ref.route.map((id) => byId.get(id)); return out.every(Boolean) ? out : null;
}
// verste tenkelige bygg: hele byggestedet fylt med én solid blokk (for å bevise at den alternative veien aldri går gjennom stedet)
export function worstSolids(site) {
  const hd = siteDepth(site) / 2;
  return [{ type: 'wood', built: site.id, id: `bygg_${site.id}_verst`, min: [site.x - site.w / 2, site.y, site.z - hd], max: [site.x + site.w / 2, site.y + site.h, site.z + hd] }];
}
