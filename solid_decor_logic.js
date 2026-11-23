// R91: solid dekor. Dekor (`LEVEL.decor`, tegnet uten kollisjon: glass på hylla, krydder, krukker …) som er stort nok til at figuren merker det, får en akse-justert
// kollisjonsboks. Ren logikk (ingen THREE): brukes av main.js (setSolid hver ramme), av tools/solid_audit.mjs og av walk_route/boten (så ruta alltid testes med boksene på).
// Flate ting (plater, dører, speil, tepper, fuger) og ting som henger høyt over alt figuren kan stå på er bevisst IKKE solide.
export const SOLID = {
  near: 0.3,        // en boks nærmere enn dette fra dekorens midtpunkt «dekker» den (veggmontert, i en annen boks)
  flatT: 0.2,       // tynnere enn dette i én retning = plate/panel (speil, plakat, flis, fuge): flatt
  bigH: 0.5,        // «store nok»: høyere enn dette …
  bigW: 0.6,        // … eller bredere enn dette
  thinW: 0.4,       // staver smalere enn dette i begge retninger (flaggstenger, tau, stenger) er «små» selv om de er høye
  highGap: 3,       // henger mer enn dette over det nærmeste underlaget: ligger høyt over spilleren
  inset: 0.05,      // kollisjonsboksen er litt mindre enn tegningen (sylindrene er ikke firkantede)
  flatKinds: ['mat', 'rug', 'mirror', 'door', 'drawer'],
  slit: 0.5,        // R156: en glipe mellom veggmontert dekor (dør, gerikt) og veggen bak som er smalere enn dette fylles igjen, så figuren ikke kommer bak dekoret
};
const isBlock = (b) => !b.dyn && !b.carried && b.type !== 'floor';
// avstand fra et punkt til en akse-justert boks
export function distToBox(b, p) { let s = 0; for (let i = 0; i < 3; i++) { const d = Math.max(b.min[i] - p[i], 0, p[i] - b.max[i]); s += d * d; } return Math.sqrt(s); }
const half = (d) => d.size.map((v) => v / 2);
export const decorMin = (d) => d.pos.map((v, i) => v - half(d)[i]);
export const decorMax = (d) => d.pos.map((v, i) => v + half(d)[i]);
// toppen av det nærmeste underlaget under dekoren (boksene som overlapper fotavtrykket i x/z), ellers -Infinity
export function supportTop(d, boxes) {
  const lo = decorMin(d), hi = decorMax(d); let top = -Infinity;
  for (const b of boxes) {
    if (b.dyn || b.carried || b.type === 'wall' || b.decorSolid) continue;
    if (b.max[0] <= lo[0] || b.min[0] >= hi[0] || b.max[2] <= lo[2] || b.min[2] >= hi[2]) continue;
    if (b.max[1] <= lo[1] + SOLID.near && b.max[1] > top) top = b.max[1];
  }
  return top;
}
// Dom for én dekorting: 'solid' (får boks) | 'covered' (har allerede kollisjon rett ved) | 'flat' | 'small' | 'high'
export function classifyDecor(d, boxes) {
  if (SOLID.flatKinds.includes(d.kind)) return 'flat';
  const s = d.size, mn = Math.min(s[0], s[1], s[2]);
  if (mn < SOLID.flatT) return 'flat';
  const wide = Math.max(s[0], s[2]);
  if (!(wide > SOLID.bigW || (s[1] > SOLID.bigH && wide >= SOLID.thinW))) return 'small';
  if (boxes.some((b) => isBlock(b) && distToBox(b, d.pos) <= SOLID.near)) return 'covered';
  if (decorMin(d)[1] - supportTop(d, boxes) > SOLID.highGap) return 'high';
  return 'solid';
}
export function decorReport(L) {
  const boxes = L.boxes || [], out = { solid: [], covered: [], flat: [], small: [], high: [] };
  for (const d of L.decor || []) out[classifyDecor(d, boxes)].push(d);
  return out;
}
// Kollisjonsbokser for de solide dekorene. Typen følger materialet (glass lager glasslyd og slipper lyset gjennom), ingen dyn: de dyttes ikke.
export function decorSolidBoxes(L) {
  return decorReport(L).solid.map((d) => {
    const lo = decorMin(d), hi = decorMax(d), e = SOLID.inset;
    return { id: `dekor_${d.id}`, kind: d.kind, type: d.material || 'plastic', material: d.material, decorSolid: true, cp: false, soft: false,
      min: lo.map((v, i) => v + (i === 1 ? 0 : e)), max: hi.map((v, i) => v - (i === 1 ? 0 : e)) };
  });
}
// R156: dør og gerikt står noen få mm foran veggen. Figuren kunne gå inn i glipa og stå «bak veggen» ved døra. Boksen for døra/dekoret trekkes bakover til veggen (uten å gjøre noe annet tykkere).
const wallBehind = (lo, hi, boxes) => {
  let best = null;
  for (const b of boxes) {
    if (b.type !== 'wall' || b.dyn) continue;
    if (b.max[0] <= lo[0] || b.min[0] >= hi[0] || b.max[1] <= lo[1] || b.min[1] >= hi[1]) continue;
    for (const [axis, dir] of [[2, 1], [2, -1], [0, 1], [0, -1]]) {
      const o = axis === 2 ? 0 : 2; if (b.max[o] <= lo[o] || b.min[o] >= hi[o]) continue;
      const gap = dir > 0 ? b.min[axis] - hi[axis] : lo[axis] - b.max[axis];
      if (gap > -1e-9 && gap <= SOLID.slit && (!best || gap < best.gap)) best = { axis, dir, face: dir > 0 ? b.min[axis] : b.max[axis], gap };
    }
  }
  return best;
};
export function decorGapBoxes(L) {
  const boxes = L.boxes || [], out = [], solidIds = new Set(decorSolidBoxes(L).map((b) => b.id));
  const e = SOLID.inset;
  for (const d of L.decor || []) {
    const isDoor = d.kind === 'door', id = `dekor_${d.id}`;
    if (!isDoor && !solidIds.has(id)) continue;
    const lo = decorMin(d), hi = decorMax(d), inset = isDoor ? 0 : e;
    const lo2 = lo.map((v, i) => v + (i === 1 ? 0 : inset)), hi2 = hi.map((v, i) => v - (i === 1 ? 0 : inset));
    const w = wallBehind(lo2, hi2, boxes); if (!w || w.gap < 1e-6 && !isDoor) continue;
    const mn = lo2.slice(), mx = hi2.slice(); if (w.dir > 0) mx[w.axis] = w.face; else mn[w.axis] = w.face;
    out.push({ id: `dekor_${d.id}_glipe`, kind: d.kind, type: d.material || 'wood', material: d.material, decorSolid: true, cp: false, soft: false, min: mn, max: mx });
  }
  return out;
}
// Legger boksene i L.boxes mens de er på (billig når ingenting endres)
export function createDecorSolid(L) {
  const boxes = [...decorSolidBoxes(L), ...decorGapBoxes(L)]; let on = false;
  return { boxes, get on() { return on; }, count: boxes.length,
    set(v) { v = !!v; if (v === on) return false; on = v; for (const b of boxes) { const i = L.boxes.indexOf(b); if (v && i < 0) L.boxes.push(b); else if (!v && i >= 0) L.boxes.splice(i, 1); } return true; } };
}
// alle kollisjonsbokser fra dekor (solide ting + glipe-fyll, R156): det walk_route og spillet legger inn
export const decorAllBoxes = (L) => [...decorSolidBoxes(L), ...decorGapBoxes(L)];
