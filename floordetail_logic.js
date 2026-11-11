// Gulvdetaljer (R13): ren logikk uten three (testes i node, test_floordetail.mjs). Selve tegningen ligger i floordetail.js.
// Småting for målestokk på gulvet (blyantstumper, viskelær, perler, smulehauger, flekker, skitt i fugene), tettheten satt etter rom og kvalitet.
// Bare utseende: ingen kollisjon. Vanlig småplukk (smuler, knapper, hår) ligger fra før i atmos.js; dette kommer i tillegg og fyller de tomme flatene.
import { rng, hashStr, inAvoid } from './atmos_logic.js';

export { hashStr };
export const DENS_STEPS = [['0.5', 'Få'], ['1', 'Vanlig'], ['1.6', 'Mange']];
// vekter per gulvtype: hva som ligger igjen i et rom med akkurat dette gulvet
export const WEIGHTS = {
  tile: { stain: 3, grout: 5, crumbs: 3, bead: 1, pencil: 1, eraser: 0 },     // bad og kjøkken: fuger med skitt, flekker og smuler
  wood: { stain: 2, grout: 0, crumbs: 2, bead: 3, pencil: 4, eraser: 2 },     // barnerom: blyanter, perler, viskelær
};
export const KINDS = ['stain', 'grout', 'crumbs', 'bead', 'pencil', 'eraser'];
export const START_YAW = 0.35;                                               // kameraets første retning (cam.yaw i main.js); blikk = (−sin yaw, −cos yaw)
export const TILE = 4;                                                      // fliser/fuger: en flis er 4 enheter (se main.js, repeat = sx / 4)

// antall: ca. 1,5 per 100 enheter² gulv i full kvalitet; «mid» halvparten; «low» ingen (Lav profil / Enkel grafikk tegner ikke småting)
export function detailCount(room, quality = 'high', density = 1) {
  const area = (room.x1 - room.x0) * (room.z1 - room.z0), q = quality === 'high' ? 1 : quality === 'mid' ? 0.5 : 0;
  return Math.max(0, Math.min(140, Math.round(area / 100 * 1.5 * q * density)));
}
export function floorKind(room) { return room?.floor?.material === 'tile' ? 'tile' : 'wood'; }

const solid = (b) => b.type !== 'floor' && b.type !== 'wall' && !b.dyn && !b.carried;
export const isMat = (b) => b.kind === 'mat' && b.max[1] - b.min[1] <= 1.5;   // matter og tepper er lave: småting kan ligge oppå dem
function pickKind(r, w, only) {
  const ks = (only || KINDS).filter((k) => (w[k] || 0) > 0); let tot = 0; for (const k of ks) tot += w[k];
  let x = r() * tot; for (const k of ks) { x -= w[k]; if (x <= 0) return k; } return ks[ks.length - 1];
}
// Steder: n småting på gulvet (aldri under/inni en kloss, ikke nær start og mål) pluss en «målestokk-ring»: minst `ring` gjenkjennelige
// ting (blyant, viskelær, perle, smulehaug) 4–10 enheter foran start i kameraets første blikkretning, så første bildet viser noe å lese skala av.
export function pickDetails(L, floorY, seed, { count = 40, ring = 6, diag = !!L.room?.floor?.diagonal, yaw = START_YAW } = {}) {
  const room = L.room, r = rng(seed), all = L.boxes.filter(solid), blocks = all.filter((b) => !isMat(b)), mats = all.filter(isMat), W = WEIGHTS[floorKind(room)];
  const covered = (x, z) => blocks.some((b) => x > b.min[0] - 0.8 && x < b.max[0] + 0.8 && z > b.min[2] - 0.8 && z < b.max[2] + 0.8 && b.min[1] < floorY + 5 && b.max[1] > floorY - 0.05);
  const matAt = (x, z) => mats.filter((b) => x > b.min[0] + 0.8 && x < b.max[0] - 0.8 && z > b.min[2] + 0.8 && z < b.max[2] - 0.8).reduce((m, b) => Math.max(m, b.max[1]), -1);   // topp av matte under punktet, ellers -1
  const avoid = [];
  if (L.start) avoid.push({ x: L.start[0], z: L.start[2], r: 1.5 });
  if (L.goal) avoid.push({ x: L.goal[0], z: L.goal[2], r: 6 });
  const matEdge = (x, z) => mats.some((b) => x > b.min[0] - 0.6 && x < b.max[0] + 0.6 && z > b.min[2] - 0.6 && z < b.max[2] + 0.6) && matAt(x, z) < 0;   // på kanten av en matte: halvveis under den
  const inRoom = (x, z, m = 1.5) => x > room.x0 + m && x < room.x1 - m && z > room.z0 + m && z < room.z1 - m;
  const mk = (kind, x, z, extra = {}) => {
    const my = matAt(x, z), o = { kind, x, y: my > floorY ? my : floorY, z, onMat: my > floorY, rot: r() * Math.PI * 2, s: 0.7 + r() * 0.7, c: r(), h: r(), a: r(), ...extra };
    if (kind === 'grout') {                                                    // skitt langs en fuge: på rutenettet, aldri på diagonale fliser
      const alongX = r() < 0.5, line = (alongX ? Math.round((z - room.z0) / TILE) * TILE + room.z0 : Math.round((x - room.x0) / TILE) * TILE + room.x0);
      if (alongX) { o.z = line; o.rot = 0; } else { o.x = line; o.rot = Math.PI / 2; }
      o.len = 0.8 + r() * 2.2;
    }
    return o;
  };
  const out = [], free = (x, z) => inRoom(x, z) && !covered(x, z) && !matEdge(x, z) && !inAvoid(avoid, x, z);
  // 1) målestokk-ringen foran start
  const sx = L.start?.[0] ?? 0, sz = L.start?.[2] ?? 0;
  const base = Math.atan2(-Math.cos(yaw), -Math.sin(yaw)), ringKinds = ['pencil', 'eraser', 'bead', 'crumbs', 'pencil'].filter((k) => (W[k] || 0) > 0 || k === 'crumbs' || k === 'bead');
  const fwd = [-Math.sin(yaw), -Math.cos(yaw)], rgt = [Math.cos(yaw), -Math.sin(yaw)];
  const nNear = Math.min(3, ring);                                           // de tre første helt nær figuren, foran og litt til høyre: det området av mobilbildet som verken minikart, målpanel eller knapper dekker (kameraet står bratt og ser bare noen få enheter i trange rom)
  for (let i = 0, tries = 0; i < ring && tries++ < 600;) {
    const near = i < nNear && tries < 250, wide = tries / 600;                              // smal kjegle først; utvides hvis møbler tar plassen
    let x, z;
    if (near) { const f = 0.4 + r() * 1.9, q = -0.3 + r() * 2.0; x = sx + fwd[0] * f + rgt[0] * q; z = sz + fwd[1] * f + rgt[1] * q; }
    else { const ang = base + (r() - 0.5) * (0.7 + wide * 0.8), d = 4.5 + r() * (5 + wide * 6); x = sx + Math.cos(ang) * d; z = sz + Math.sin(ang) * d; }
    if (!free(x, z) || out.some((o) => Math.hypot(o.x - x, o.z - z) < 1.6)) continue;
    out.push(mk(ringKinds[i % ringKinds.length], x, z, { ring: true, s: 1 + r() * 0.3 })); i++;
  }
  // 2) resten spredt over gulvet, mest langs vegger og i fugene
  for (let tries = 0; out.length < count + ring && tries++ < count * 40;) {
    const edge = r() < 0.4, e = 1.2 + r() * 6; let x = room.x0 + 1.5 + r() * (room.x1 - room.x0 - 3), z = room.z0 + 1.5 + r() * (room.z1 - room.z0 - 3);
    if (edge) { const side = Math.floor(r() * 4); if (side === 0) z = room.z0 + e; else if (side === 1) z = room.z1 - e; else if (side === 2) x = room.x0 + e; else x = room.x1 - e; }
    const kind = pickKind(r, diag ? { ...W, grout: 0 } : W);
    if (!free(x, z)) continue;
    const o = mk(kind, x, z); if (kind === 'grout' && !free(o.x, o.z)) continue;
    if (o.onMat && (kind === 'stain' || kind === 'grout')) continue;      // flate flekker/fuger hører ikke hjemme på en matte
    out.push(o);
  }
  return out;
}
