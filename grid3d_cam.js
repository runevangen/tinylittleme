// R130: 3D-laben, kamera og plassering (ren logikk: ingen DOM, ingen three.js, kjøres i node: test_grid3d_ui.mjs).
//  - orbit-kamera rundt et mål: dra = roter (yaw/pitch), klyp = zoom, to fingre = flytt (pan). Fire hurtigvisninger: FORAN, SIDE, TOPP, 3D.
//  - projeksjonen er et mildt perspektiv (skala = k · avstand / dybde), så FORAN/SIDE/TOPP ser nesten rette ut og 3D gir dybde.
//  - LAG: et plan av rutenettet vises om gangen. Laget går langs aksen som peker mot kameraet i visningen: FORAN og 3D = z, SIDE = x, TOPP = y.
//    Trykk på et punkt i laget for å legge en knute; knuter og staver i andre lag vises dempet.
import { lattice3, stepOf } from './grid3d_logic.js';

export const VIEW_IDS = ['foran', 'side', 'topp', '3d'];
export const VIEWS = { foran: { yaw: 0, pitch: 0 }, side: { yaw: Math.PI / 2, pitch: 0 }, topp: { yaw: 0, pitch: Math.PI / 2 }, '3d': { yaw: -0.7, pitch: 0.45 } };
export const LAYER_AXIS = { foran: 'z', side: 'x', topp: 'y', '3d': 'z', free: 'z' };
export const CAM = { pitchMin: -0.15, pitchMax: Math.PI / 2, zoomMin: 0.4, zoomMax: 4, rot: 0.008, distK: 3 };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const r3 = (x) => Math.round(x * 1000) / 1000;

export const siteBox = (site) => ({ x: site.x, y: site.y, z: site.z });
export const siteCenter = (site) => ({ x: (site.x[0] + site.x[1]) / 2, y: (site.y[0] + site.y[1]) / 2, z: (site.z[0] + site.z[1]) / 2 });
export const siteRadius = (site) => Math.max(1, Math.hypot(site.x[1] - site.x[0], site.y[1] - site.y[0], site.z[1] - site.z[0]) / 2);

export function camNew(site, view = '3d') {
  const c = siteCenter(site), tall = (site.y[1] - site.y[0]) > Math.max(site.x[1] - site.x[0], site.z[1] - site.z[0]) * 1.5, R = siteRadius(site) * (tall ? 1.35 : 1);   // R131: høye steder (tårn, tripod) får bildet litt mer luft, så toppen og lasten ikke kuttes
  return camView({ yaw: 0, pitch: 0, zoom: 1, tx: c.x, ty: c.y, tz: c.z, R, view }, view);
}
// fører kameraet til en av hurtigvisningene (flytter ikke målet eller zoomen)
export function camView(cam, id) {
  const v = VIEWS[id]; if (!v) return cam;
  cam.yaw = v.yaw; cam.pitch = v.pitch; cam.view = id; return cam;
}
export function camHome(cam, site) { const c = siteCenter(site); cam.tx = c.x; cam.ty = c.y; cam.tz = c.z; cam.zoom = 1; return cam; }
export function camRotate(cam, dx, dy) {
  cam.yaw += dx * CAM.rot; cam.pitch = clamp(cam.pitch + dy * CAM.rot, CAM.pitchMin, CAM.pitchMax); cam.view = 'free'; return cam;
}
export function camZoom(cam, factor) { cam.zoom = clamp(cam.zoom * (Number.isFinite(factor) && factor > 0 ? factor : 1), CAM.zoomMin, CAM.zoomMax); return cam; }

// basisvektorene (høyre, opp, mot kameraet d) ut fra yaw og pitch
export function basis(cam) {
  const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
  const d = { x: sy * cp, y: sp, z: cy * cp }, right = { x: cy, y: 0, z: -sy };
  const up = { x: d.y * right.z, y: d.z * right.x - d.x * right.z, z: -d.y * right.x };
  return { d, right, up };
}
// piksler per enhet i målets dybde
export const pxPerUnit = (cam, w, h) => (Math.min(w, h) / (cam.R * 1.75)) * cam.zoom;
// to fingre: flytt målet slik at bildet følger fingrene
export function camPan(cam, dx, dy, w, h) {
  const b = basis(cam), k = pxPerUnit(cam, w, h);
  cam.tx -= (b.right.x * dx - b.up.x * dy) / k; cam.ty -= (b.right.y * dx - b.up.y * dy) / k; cam.tz -= (b.right.z * dx - b.up.z * dy) / k; return cam;
}
// 3D-punkt -> skjermpunkt { x, y, s (skala), z (dybde, større = lenger bort) }
export function project(cam, p, w, h) {
  const b = basis(cam), D = cam.R * CAM.distK, vx = p.x - cam.tx, vy = p.y - cam.ty, vz = p.z - cam.tz;
  const cx = vx * b.right.x + vy * b.right.y + vz * b.right.z, cy = vx * b.up.x + vy * b.up.y + vz * b.up.z, cd = vx * b.d.x + vy * b.d.y + vz * b.d.z;   // cd: mot kameraet
  const depth = Math.max(0.3 * D, D - cd), s = pxPerUnit(cam, w, h) * D / depth;
  return { x: w / 2 + cx * s, y: h / 2 - cy * s, s, z: depth };
}

// ---------- lag ----------
export const layerAxisOf = (view) => LAYER_AXIS[view] || 'z';
export function layerValues(site, axis) { return [...new Set(lattice3(site).map((p) => p[axis]))].sort((a, b) => a - b); }
export const layerMid = (site, axis) => { const v = layerValues(site, axis); return v[Math.floor((v.length - 1) / 2)] ?? 0; };
const near = (a, b) => Math.abs(a - b) < 1e-3;
export function layerStep(site, axis, value, dir) {
  const v = layerValues(site, axis); if (!v.length) return value; let i = v.findIndex((q) => near(q, value)); if (i < 0) i = 0;
  return v[clamp(i + (dir < 0 ? -1 : 1), 0, v.length - 1)];
}
export const layerIndex = (site, axis, value) => { const v = layerValues(site, axis), i = v.findIndex((q) => near(q, value)); return { i: Math.max(0, i), n: v.length }; };
export const inLayer = (p, axis, value) => near(p[axis], value);
export const layerPoints = (site, axis, value) => lattice3(site).filter((p) => inLayer(p, axis, value));
// plan-firkanten (fire hjørner) som viser laget
export function layerQuad(site, axis, value) {
  const [x0, x1] = site.x, [y0, y1] = site.y, [z0, z1] = site.z;
  if (axis === 'z') return [{ x: x0, y: y0, z: value }, { x: x1, y: y0, z: value }, { x: x1, y: y1, z: value }, { x: x0, y: y1, z: value }];
  if (axis === 'x') return [{ x: value, y: y0, z: z0 }, { x: value, y: y0, z: z1 }, { x: value, y: y1, z: z1 }, { x: value, y: y1, z: z0 }];
  return [{ x: x0, y: value, z: z0 }, { x: x1, y: value, z: z0 }, { x: x1, y: value, z: z1 }, { x: x0, y: value, z: z1 }];
}
// de tolv kantene i stedets boks (til en tynn ramme)
export function boxEdges(site) {
  const [x0, x1] = site.x, [y0, y1] = site.y, [z0, z1] = site.z, P = [];
  for (const x of [x0, x1]) for (const y of [y0, y1]) for (const z of [z0, z1]) P.push({ x, y, z });
  const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]]; return E.map(([a, b]) => [P[a], P[b]]);
}

// ---------- plukking ----------
const d2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
// nærmeste av punktene (hver med .p = 3D-punkt) til skjermpunktet, innenfor maxPx; ved likt velges det nærmeste kameraet
export function pickNearest(cam, items, sx, sy, w, h, maxPx) {
  let best = null, bd = maxPx;
  for (const it of items) { const q = project(cam, it.p, w, h), d = d2(q, { x: sx, y: sy }); if (d < bd - 1e-6 || (best && Math.abs(d - bd) < 1e-6 && q.z < best.z)) { bd = d; best = { it, d, z: q.z }; } }
  return best ? best.it : null;
}
// avstand fra et skjermpunkt til en strek
export function segDist(a, b, px, py) {
  const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy; if (!L2) return Math.hypot(px - a.x, py - a.y);
  const t = clamp(((px - a.x) * dx + (py - a.y) * dy) / L2, 0, 1); return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy));
}
export const snapStep = (site) => stepOf(site);
export { r3 };
