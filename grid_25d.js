// R123: 3D-bygging, trinn 1 («2,5D»): DOBBEL BRO i Rutenett. Ren logikk (ingen DOM, ingen three.js, kjøres i node: test_grid25d.mjs).
// Spilleren bygger ett fagverk i 2D som før. Valget DOBBEL BRO kopierer bygget til et parallelt plan (bak) og kobler de to planene med tverrstag.
//  - lagres som `G.dbl = { w: 'smal' | 'middels' | 'bred', brace: 'x' | 'rett' }` på rutenettet (grid_logic.js tar den med i historikk, ANGRE, lagring og NULLSTILL)
//  - bredden er avstanden mellom planene: d = 1,0 / 1,25 / 1,5 «byggeenheter» (1 byggeenhet = BU = 4 verdensenheter = en enkelt bros dybde); i verdenen står planene SP = d·BU fra hverandre
//  - tverrstagene er tre-staver mellom samme knute i begge plan (RETT), og i tillegg diagonaler mellom nabo-knutene langs veien i begge retninger (X-FORM)
//  - kostnaden = det som ligger der fra før + planene (kopien av stavene du la til) + tverrstagene; teller mot budsjettet og stjernene (build_budget.starsFor, 4. argument)
//  - fysikken (build_phys.js createSim2): planene simuleres hver for seg i 2D (symmetrisk: én simulering gjelder begge), sidekraften (vind) fordeles via tverrstagene (se SIDE der)
import { isGrid, nodeOf, rodLen, roadLevel, siteHasGrid, pushHistGrid, DBL_WIDTHS, DBL_BRACES, roadRodIds } from './grid_logic.js';
import { rodPrice } from './build_materials.js';
import { partSlabs } from './build_world.js';

export const BU = 4;                    // verdensenheter per byggeenhet (= dybden på en enkelt bro i verdenen)
export const PLANE_T = 1.2;             // tykkelsen på hvert plan i verdenen (enheter): tynne tette skiver, ingen usynlige vegger
export const WIDTHS = { smal: 1.0, middels: 1.25, bred: 1.5 };   // d (byggeenheter)
export const BRACE_MAT = 'wood';
export const MIN_RODS = 2;

export const hasDouble = (B) => isGrid(B) && !!B.rg.dbl;
export const dblOf = (B) => (isGrid(B) && B.rg.dbl ? B.rg.dbl : null);
export const spacingOf = (dbl) => (WIDTHS[dbl?.w] || WIDTHS.middels) * BU;            // avstand mellom planene i verdenen
const userRods = (G) => G.rods.filter((r) => !r.deck);
export const userRodCount = (B) => (isGrid(B) ? userRods(B.rg).length : 0);

// ---------- velge og fjerne ----------
// kan spilleren velge DOBBEL BRO nå? { ok } eller { ok: false, why: 'mode' | 'few' }
export function canDouble(B) {
  if (!isGrid(B) || !siteHasGrid(B.site)) return { ok: false, why: 'mode' };
  if (userRodCount(B) < MIN_RODS) return { ok: false, why: 'few' };
  return { ok: true };
}
// velg (eller endre) bredde og tverrstag; ett steg i historikken (ANGRE tar det bort igjen)
export function gSetDouble(B, w, brace) {
  const c = canDouble(B); if (!c.ok) return c;
  if (!DBL_WIDTHS.includes(w) || !DBL_BRACES.includes(brace)) return { ok: false, why: 'val' };
  const cur = B.rg.dbl; if (cur && cur.w === w && cur.brace === brace) return { ok: true, same: true };
  pushHistGrid(B); B.rg.dbl = { w, brace }; return { ok: true, dbl: B.rg.dbl };
}
export function gClearDouble(B) {
  if (!hasDouble(B)) return false; pushHistGrid(B); delete B.rg.dbl; return true;
}

// ---------- tverrstag ----------
// knutene langs veien (ankre og dekk) fra venstre til høyre: tverrstagene følger dem. Uten veilinje: den laveste raden.
function chainNodes(B) {
  const G = B.rg, rv = roadLevel(B.site); let ns;
  if (rv != null) ns = G.nodes.filter((n) => Math.abs(n.v - rv) < 1e-6);
  else { const lo = Math.min(...G.nodes.map((n) => n.v)); ns = G.nodes.filter((n) => Math.abs(n.v - lo) < 1e-6); }
  return ns.sort((a, b) => a.u - b.u);
}
// knutene som får et tverrstag rett over: alle knuter du og dekket har lagt (ikke ankrene: de står fast i underlaget i begge plan)
const braceNodes = (B) => B.rg.nodes.filter((n) => !n.fixed).sort((a, b) => a.u - b.u || a.v - b.v);
// tverrstagene: [{ id, a: { id, z }, b: { id, z }, len (verdensenheter), diag }], z = 0 (foran) eller 1 (bak). Deterministisk rekkefølge.
export function braceList(B, dbl = dblOf(B)) {
  if (!dbl || !isGrid(B)) return [];
  const sp = spacingOf(dbl), out = []; let k = 1;
  for (const n of braceNodes(B)) out.push({ id: 'tv' + k++, a: { id: n.id, z: 0 }, b: { id: n.id, z: 1 }, len: sp, diag: false });
  if (dbl.brace === 'x') {
    const ch = chainNodes(B);
    for (let i = 0; i + 1 < ch.length; i++) {
      const a = ch[i], b = ch[i + 1], len = Math.hypot(b.u - a.u, sp);
      out.push({ id: 'tv' + k++, a: { id: a.id, z: 0 }, b: { id: b.id, z: 1 }, len, diag: true });
      out.push({ id: 'tv' + k++, a: { id: a.id, z: 1 }, b: { id: b.id, z: 0 }, len, diag: true });
    }
  }
  return out;
}
// pris: tverrstag = tre per lengde (lengden i byggeenheter à 5 cm i rutenettet: verdensenheten er den samme)
export const BRACE_PRICE = 0.4;   // per enhet lengde (tynne tverrstag i tre: billigere enn en bærende stav)
export const braceCost = (br) => Math.max(1, Math.ceil(BRACE_PRICE * br.len - 1e-9));
// ekstra kostnad og deler bygget får av dobbel bro (build_budget.starsFor 4. argument). 0 uten dobbel bro.
export function extraOf(B) {
  const dbl = dblOf(B); if (!dbl) return { cost: 0, parts: 0 };
  const G = B.rg, rods = userRods(G), br = braceList(B, dbl);
  return { cost: rods.reduce((s, r) => s + rodPrice(r.mat, rodLen(G, r)), 0) + br.reduce((s, b) => s + braceCost(b), 0), parts: rods.length + br.length };
}
// tekst-tall til dialogen: kostnad av planene og av tverrstagene hver for seg, for en gitt bredde og form (uten å endre bygget)
export function previewCost(B, w, brace) {
  const G = B.rg, rods = userRods(G), tmp = { ...B, rg: { ...G, dbl: { w, brace } } }, br = braceList(tmp, tmp.rg.dbl);
  return { planes: rods.reduce((s, r) => s + rodPrice(r.mat, rodLen(G, r)), 0), braces: br.reduce((s, b) => s + braceCost(b), 0), nBraces: br.length };
}

// ---------- fysikk: parametre til createSim2 ----------
// `layers` i simuleringsdefinisjonen: { n: 2, d (byggeenheter), braces: [{ id, diag }] }. Selve sidekraft-modellen står i build_phys.js (SIDE, lateralStep).
export function layersOf(B) {
  const dbl = dblOf(B); if (!dbl) return null;
  return { n: 2, d: WIDTHS[dbl.w], brace: dbl.brace, braces: braceList(B, dbl).map((b) => ({ id: b.id, diag: b.diag })) };
}

// ---------- 3D: modell til forhåndsvisning og verden ----------
// punkter i rommet: x = u (langs broen), y = v (opp), z = -sp/2 (foran) eller +sp/2 (bak)
export function model3d(B, dbl = dblOf(B)) {
  if (!dbl || !isGrid(B)) return null;
  const G = B.rg, sp = spacingOf(dbl), pts = [], idx = new Map(), edges = [];
  const P = (id, zi) => { const key = id + ':' + zi; if (!idx.has(key)) { const n = nodeOf(G, id); idx.set(key, pts.length); pts.push({ x: n.u, y: n.v, z: zi ? sp / 2 : -sp / 2 }); } return idx.get(key); };
  const road = roadRodIds(B);
  for (const zi of [0, 1]) for (const r of G.rods) edges.push({ a: P(r.a, zi), b: P(r.b, zi), kind: r.deck || (road && road.has(r.id)) ? 'road' : 'rod', mat: r.mat });
  for (const b of braceList(B, dbl)) edges.push({ a: P(b.a.id, b.a.z), b: P(b.b.id, b.b.z), kind: b.diag ? 'diag' : 'brace', mat: BRACE_MAT });
  // dekket: en flate mellom planene langs veien
  const deck = []; if (road) for (const r of G.rods) if (road.has(r.id)) deck.push([P(r.a, 0), P(r.b, 0), P(r.b, 1), P(r.a, 1)]);
  let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity; for (const p of pts) { u0 = Math.min(u0, p.x); u1 = Math.max(u1, p.x); v0 = Math.min(v0, p.y); v1 = Math.max(v1, p.y); }
  return { pts, edges, deck, sp, center: { x: (u0 + u1) / 2, y: (v0 + v1) / 2, z: 0 }, size: Math.max(u1 - u0, v1 - v0, sp) };
}
// enkel perspektiv: drei om y (yaw) og x (pitch), og projiser til et rektangel w × h. Returnerer { pts: [{x,y,d}], order } (d = dybde, større = lenger bort)
export function project(model, yaw, pitch, w, h) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), c = model.center, dist = model.size * 2.6, f = Math.min(w, h) * 0.5 * dist / (model.size * 0.36);
  const pts = model.pts.map((p) => {
    const x = p.x - c.x, y = p.y - c.y, z = p.z - c.z;
    const x1 = x * cy + z * sy, z1 = -x * sy + z * cy, y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp, dep = dist + z2, k = f / dep;
    return { x: w / 2 + x1 * k, y: h / 2 - y2 * k, d: dep };
  });
  return { pts };
}

// ---------- verden: kollisjonsflater og tegnede deler ----------
// planene står i z = site.z ± sp/2, hvert PLANE_T tykt; dekket (veien) er en tett skive mellom dem. Skråstaver og andre staver som ikke er vei er bare i planene.
// placed: delene slik de ligger (settledPlaced), road: id-er til veistavene (roadRodIds) eller null. Samme format som buildSolids (build_world.js).
export function buildSolids25(site, placed, road, sp) {
  const out = [], ht = PLANE_T / 2, mk = (p, s, z0, z1, extra = '') => ({ type: 'wood', id: `bygg_${site.id}_${p.id}${extra}`, built: site.id, material: 'wood', color: 0xc98a45, min: [site.x + s.u0, site.y + s.v0, site.z + z0], max: [site.x + s.u1, site.y + s.v1, site.z + z1] });
  for (const p of placed || []) {
    const slabs = partSlabs(p), isRoad = !!road && road.has(p.id);
    for (const s of slabs) {
      out.push(mk(p, s, -sp / 2 - ht, -sp / 2 + ht, '_f'), mk(p, s, sp / 2 - ht, sp / 2 + ht, '_b'));
      if (isRoad) out.push(mk(p, s, -sp / 2 + ht, sp / 2 - ht, '_d'));   // dekket mellom planene (tett: ingen hull i veien)
    }
  }
  return out;
}
// tverrstagene som linjer i verdenskoordinater (til tegning): [{ a: {x,y,z}, b: {x,y,z}, diag }]
export function braceLines(site, B) {
  const dbl = dblOf(B), G = B?.rg; if (!dbl || !G) return []; const sp = spacingOf(dbl);
  const W = (id, zi) => { const n = nodeOf(G, id); return { x: site.x + n.u, y: site.y + n.v, z: site.z + (zi ? sp / 2 : -sp / 2) }; };
  return braceList(B, dbl).map((b) => ({ a: W(b.a.id, b.a.z), b: W(b.b.id, b.b.z), diag: b.diag }));
}
// delene (planene) slik de tegnes i verdenen: hver stav to ganger, foran og bak: [{ ...part, z: dz }]
export const planesOf = (placed, sp) => (placed || []).flatMap((p) => [{ ...p, dz: -sp / 2 }, { ...p, dz: sp / 2 }]);

// ---------- brett ----------
// et sted kan kreve eller invitere til sidevind: `site.grid.stage.wind` (Byggeskolen: alle bygg testes med vind) eller PLAY.wide (valgfritt, bare når bygget er dobbelt)
export const WIND_MAX = 3;
export const windOf = (stage) => (stage && Number.isFinite(stage.wind) && stage.wind > 0 ? Math.min(WIND_MAX, stage.wind) : 0);
export const WIDE_SITES = { kjokken1: { wind: 1.5 } };   // R123: byggebrett der en bred bro er et valgfritt delmål (flagget «bred_<sted>»)
export const wideFlag = (siteId) => `bred_${siteId}`;
export const wideOf = (siteId) => WIDE_SITES[siteId] || null;
// vinden prøven skal ha: Byggeskole-stedet (stage.wind) alltid; byggebrettets valgfrie mål bare når bygget er dobbelt
export function windFor(B, stage, wide = wideOf(B?.site?.id)) {
  const sw = windOf(stage); if (sw) return sw;
  return hasDouble(B) && wide ? windOf(wide) : 0;
}

