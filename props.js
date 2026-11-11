// Former for ting som ikke er firkanter: do, badekar … Kollisjonen i fysikken er fortsatt bokser;
// dette er bare utseendet. Brettet gir hver boks `kind` og evt. `group`; boksene i en gruppe tegnes som ÉN ting.
import * as THREE from 'three';
import { letterStack, letterTopY, studLayout, STUD_H, carWheel } from './toys.js';
import { TOY_BUILDERS } from './toys_view.js';          // R18: levende leker (tennisball, vippehest, wind-up, sprettboks)

const porcelain = (color = 0xf1eee6) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.06 });
const chrome = () => new THREE.MeshStandardMaterial({ color: 0xe4e6e8, metalness: 1, roughness: 0.12 });
const mesh = (geo, mat, shadow = true) => { const m = new THREE.Mesh(geo, mat); m.castShadow = shadow; m.receiveShadow = true; return m; };

// avrundet rektangel (radius per hjørne: [−x−z, +x−z, +x+z, −x+z]) som Shape / Path i XY
function rrPath(path, w, d, r) {
  const [a, b, c, e] = Array.isArray(r) ? r : [r, r, r, r], x = w / 2, y = d / 2;
  path.moveTo(-x + a, -y); path.lineTo(x - b, -y); path.quadraticCurveTo(x, -y, x, -y + b);
  path.lineTo(x, y - c); path.quadraticCurveTo(x, y, x - c, y); path.lineTo(-x + e, y);
  path.quadraticCurveTo(-x, y, -x, y - e); path.lineTo(-x, -y + a); path.quadraticCurveTo(-x, -y, -x + a, -y);
  return path;
}
function ellipsePath(path, rx, rz, n = 40) {
  for (let i = 0; i <= n; i++) { const t = (i / n) * Math.PI * 2, x = Math.cos(t) * rx, y = Math.sin(t) * rz; i ? path.lineTo(x, y) : path.moveTo(x, y); }
  return path;
}
// ekstrudert form stående på y=0 med høyde h og avrundede kanter (bv)
function extrudeUp(shape, h, bv) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: Math.max(0.01, h - 2 * bv), bevelEnabled: bv > 0, bevelThickness: bv, bevelSize: bv, bevelSegments: 3, curveSegments: 10 });
  g.rotateX(-Math.PI / 2); g.translate(0, bv, 0);
  return g;
}
export function roundedBoxGeo(w, h, d, rc = 0.4, bv = 0.2) {
  const s = new THREE.Shape(); const r = Math.max(0.01, Math.min(rc, Math.min(w, d) / 2 - bv - 0.01));
  rrPath(s, Math.max(0.02, w - 2 * bv), Math.max(0.02, d - 2 * bv), r);
  return extrudeUp(s, h, bv);
}
const bounds = (boxes) => {
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (const b of boxes) for (let i = 0; i < 3; i++) { mn[i] = Math.min(mn[i], b.min[i]); mx[i] = Math.max(mx[i], b.max[i]); }
  return { min: mn, max: mx, c: mn.map((v, i) => (v + mx[i]) / 2), s: mn.map((v, i) => mx[i] - v) };
};

// ---------- do ----------
function toilet(members) {
  const tank = members.find((m) => m.kind === 'toilet_tank'), bowls = members.filter((m) => m.kind === 'toilet_bowl'), lid = members.find((m) => m.kind === 'toilet_lid');
  if (!tank || !bowls.length) return null;
  const T = bounds([tank]), B = bounds(bowls), all = bounds(members);
  const dx = B.c[0] - T.c[0], dz = B.c[2] - T.c[2];
  const dir = Math.abs(dx) > Math.abs(dz) ? [Math.sign(dx), 0] : [0, Math.sign(dz)];                // fra vegg/tank mot skålen
  const th = Math.atan2(-dir[1], dir[0]);
  const loc = (wx, wz) => [(wx - all.c[0]) * dir[0] + (wz - all.c[2]) * dir[1], -(wx - all.c[0]) * dir[1] + (wz - all.c[2]) * dir[0]];
  const along = (b) => dir[0] ? b.s[0] : b.s[2], across = (b) => dir[0] ? b.s[2] : b.s[0];
  const g = new THREE.Group(); g.position.set(all.c[0], 0, all.c[2]); g.rotation.y = th;
  const pw = porcelain(), cr = chrome();

  // sisterne + lokk + spylerknapp
  const [tx, tz] = loc(T.c[0], T.c[2]), tl = along(T), tw = across(T), tH = T.s[1];
  const cistern = mesh(roundedBoxGeo(tl, tH - 0.7, tw, 0.9, 0.3), pw); cistern.position.set(tx, 0, tz); g.add(cistern);
  const cap = mesh(roundedBoxGeo(tl + 0.25, 0.7, tw + 0.25, 1.0, 0.25), pw); cap.position.set(tx, tH - 0.7, tz); g.add(cap);
  const btn = mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.25, 20), cr); btn.position.set(tx, tH + 0.05, tz); g.add(btn);

  // skål (oval, hul, med vann) + sete
  const [bx, bz] = loc(B.c[0], B.c[2]), bl = along(B), bw = across(B), top = B.s[1];
  const prof = [[0.001, 0], [0.5, 0], [0.62, 0.9], [0.86, 3.4], [0.98, 6.2], [1, top - 0.4], [0.98, top], [0.84, top], [0.74, top - 0.8], [0.6, top * 0.6], [0.4, top * 0.38], [0.3, top * 0.3], [0.001, top * 0.28]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const bowlMat = pw.clone(); bowlMat.side = THREE.DoubleSide;
  const bowl = mesh(new THREE.LatheGeometry(prof, 36), bowlMat); bowl.scale.set(bl / 2, 1, bw / 2); bowl.position.set(bx, 0, bz); g.add(bowl);
  const water = mesh(new THREE.CircleGeometry(0.46, 32), new THREE.MeshPhysicalMaterial({ color: 0x6fb3cf, roughness: 0.04, transparent: true, opacity: 0.82, clearcoat: 1 }), false);
  water.rotation.x = -Math.PI / 2; water.scale.set(bl / 2, bw / 2, 1); water.position.set(bx, top * 0.4, bz); g.add(water);
  const seatShape = new THREE.Shape(); ellipsePath(seatShape, bl / 2 * 1.02, bw / 2 * 1.02);
  const hole = new THREE.Path(); ellipsePath(hole, bl / 2 * 0.66, bw / 2 * 0.7); seatShape.holes.push(hole);
  const seatMat = new THREE.MeshPhysicalMaterial({ color: 0xf7f3e8, roughness: 0.25, clearcoat: 0.6 });
  const seat = mesh(extrudeUp(seatShape, 0.55, 0.12), seatMat); seat.position.set(bx + bl * 0.02, top - 0.12, bz); g.add(seat);

  // åpent lokk lent mot sisternen
  if (lid) {
    const L = bounds([lid]), [lx, lz] = loc(L.c[0], L.c[2]), lw = across(L), lh = L.s[1], lt = along(L);
    const s = new THREE.Shape(); rrPath(s, lw, lh, Math.min(lw, lh) * 0.3);
    const gp = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.1, lt - 0.3), bevelEnabled: true, bevelThickness: 0.15, bevelSize: 0.15, bevelSegments: 2 });
    gp.rotateY(Math.PI / 2); gp.translate(-(lt - 0.3) / 2, 0, 0);                   // tykkelsen langs «frem»
    const lm = mesh(gp, seatMat); lm.position.set(lx, L.c[1], lz); g.add(lm);
  }
  return g;
}

// ---------- badekar ----------
function tub(members) {
  const A = bounds(members), w = A.s[0], d = A.s[2], h = A.s[1];
  const t = Math.max(0.8, Math.min(...members.map((m) => Math.min(m.max[0] - m.min[0], m.max[2] - m.min[2]))));   // veggtykkelse
  const rRound = Math.min(w * 0.45, 6), rSmall = 1.6;                           // en avrundet ende (sør, mot døra) og en rettere (nord, mot vannkrana)
  const outer = new THREE.Shape(); rrPath(outer, w - 0.4, d - 0.4, [rSmall, rSmall, rRound, rRound]);
  const inner = new THREE.Path(); rrPath(inner, w - 2 * t, d - 2 * t, [Math.max(0.3, rSmall - t * 0.6), Math.max(0.3, rSmall - t * 0.6), rRound - t * 0.7, rRound - t * 0.7]);
  outer.holes.push(inner);
  const g = new THREE.Group(); g.position.set(A.c[0], 0, A.c[2]);
  if (members.some((m) => m.face === 'S')) g.rotation.y = Math.PI;                 // kran og sluk i sørenden (standard: nord)
  const pw = porcelain(0xf0ede4), cr = chrome();
  const shell = mesh(extrudeUp(outer, h, 0.3), pw); shell.position.y = 0; g.add(shell);
  // innvendig bunn og sluk
  const floor = new THREE.Shape(); rrPath(floor, w - 2 * t + 0.1, d - 2 * t + 0.1, [Math.max(0.3, rSmall - t * 0.6), Math.max(0.3, rSmall - t * 0.6), rRound - t * 0.7, rRound - t * 0.7]);
  const bottom = mesh(extrudeUp(floor, 0.08, 0), pw); bottom.position.y = 0.01; g.add(bottom);
  const drainZ = -d / 2 + t + 2.4;
  const drain = mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.06, 20), cr, false); drain.position.set(0, 0.1, drainZ); g.add(drain);
  const puddle = mesh(new THREE.CircleGeometry(1.5, 28), new THREE.MeshPhysicalMaterial({ color: 0x7fb9d2, roughness: 0.04, transparent: true, opacity: 0.55, clearcoat: 1 }), false);
  puddle.rotation.x = -Math.PI / 2; puddle.scale.set(1, 1.35, 1); puddle.position.set(0, 0.13, drainZ + 0.2); g.add(puddle);
  // kran og to håndtak på nordveggen (utenfor spillbar sone)
  const zN = -d / 2 + 0.2, yTap = h + 1.8;
  const base = mesh(new THREE.CylinderGeometry(0.7, 0.8, 0.5, 20), cr); base.rotation.x = Math.PI / 2; base.position.set(0, yTap, zN + 0.1); g.add(base);
  const spout = mesh(new THREE.CylinderGeometry(0.28, 0.28, 2.6, 16), cr); spout.rotation.x = Math.PI / 2; spout.position.set(0, yTap, zN + 1.4); g.add(spout);
  const tip = mesh(new THREE.CylinderGeometry(0.28, 0.2, 0.7, 16), cr); tip.position.set(0, yTap - 0.3, zN + 2.6); g.add(tip);
  for (const sx of [-2.2, 2.2]) {
    const stem = mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.9, 12), cr); stem.rotation.x = Math.PI / 2; stem.position.set(sx, yTap, zN + 0.5); g.add(stem);
    const knob = mesh(new THREE.SphereGeometry(0.5, 14, 10), cr); knob.position.set(sx, yTap, zN + 1.1); g.add(knob);
  }
  return g;
}


// vasken (v0.88): benkeplate av fire bokser rundt en ekte forsenkning. Hullet er mellom randboksene (venstre/høyre/foran) og bakstykket (vask_plate); bunnen er toppen av skapet under.
function sink(members) {
  const A = bounds(members), byId = (id) => members.find((m) => m.id === id);
  const back = byId('vask_plate'), L = byId('vask_rim_v'), R = byId('vask_rim_h'), F = byId('vask_rim_f');
  if (!back || !L || !R || !F) return null;
  const h = A.s[1], hx0 = L.max[0], hx1 = R.min[0], hz0 = back.max[2], hz1 = F.min[2], hw = hx1 - hx0, hd = hz1 - hz0;
  const g = new THREE.Group(), pw = porcelain(members[0].color), cr = chrome();
  g.position.set(A.c[0], A.min[1], A.c[2]);
  const outer = new THREE.Shape(); rrPath(outer, A.s[0] - 0.2, A.s[2] - 0.2, 0.7);
  const hc = [(hx0 + hx1) / 2 - A.c[0], (hz0 + hz1) / 2 - A.c[2]];
  const hp = new THREE.Path(); rrPath(hp, hw, hd, 1.4); const pts = hp.getPoints(24).map((q) => new THREE.Vector2(q.x + hc[0], q.y + hc[1])); outer.holes.push(new THREE.Path(pts));
  const slab = mesh(extrudeUp(outer, h, 0.14), pw); g.add(slab);
  const bowl = new THREE.Shape(pts); const bottom = mesh(extrudeUp(bowl, 0.06, 0), new THREE.MeshPhysicalMaterial({ color: 0xdfe3e4, roughness: 0.16, clearcoat: 1 })); bottom.position.y = 0.02; g.add(bottom);
  const dz = hc[1] + hd * 0.18;
  const drain = mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.04, 16), cr, false); drain.position.set(hc[0], 0.1, dz); g.add(drain);
  const wat = mesh(new THREE.CircleGeometry(1, 28), new THREE.MeshPhysicalMaterial({ color: 0x7fb9d2, roughness: 0.04, transparent: true, opacity: 0.5 }), false); wat.rotation.x = -Math.PI / 2; wat.scale.set(hw * 0.2, hd * 0.2, 1); wat.position.set(hc[0], 0.12, dz); g.add(wat);
  return g;
}

// ---------- teksturer (tegnes i nettleseren, ingen bildefiler) ----------
function rng(seed) { let a = seed; return () => { a = (a * 1664525 + 1013904223) % 4294967296; return a / 4294967296; }; }
let ANISO = 4;
export const setAniso = (n) => { ANISO = n; };      // settes fra main.js etter at maskinvaren er spurt (skarpere teksturer på skrå flater)
function canvasTex(size, draw, { repeat = [1, 1], srgb = true } = {}) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); t.anisotropy = ANISO;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const cache = {};
const once = (k, f) => cache[k] ?? (cache[k] = f());
// frotté: tette løkker (lyse/mørke prikker) – brukes både som farge og relieff
const terryTex = () => once('terry', () => canvasTex(256, (g, S) => {
  const r = rng(5); g.fillStyle = '#d9d9d9'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 5200; i++) { const v = 150 + r() * 105; g.fillStyle = `rgb(${v},${v},${v})`; g.beginPath(); g.arc(r() * S, r() * S, 1.2 + r() * 1.6, 0, 7); g.fill(); }
}));
// flettet tøy (matte) og kurvfletting
const weaveTex = () => once('weave', () => canvasTex(128, (g, S) => {
  g.fillStyle = '#bdbdbd'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) { const v = (i + j) % 2 ? 212 : 172; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(i * 8 + 1, j * 8 + 1, 6, 6); }
}));
const wickerTex = () => once('wicker', () => canvasTex(128, (g, S) => {
  g.fillStyle = '#9a8f80'; g.fillRect(0, 0, S, S);                       // mørke mellomrom mellom flettene
  for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) {
    const v = 214 + ((i + j) % 2) * 34; g.fillStyle = `rgb(${v},${v},${v})`;
    if ((i + j) % 2) g.fillRect(i * 16, j * 16 + 2, 16, 12); else g.fillRect(i * 16 + 2, j * 16, 12, 16);
  }
}));
const woodishTex = () => once('wood', () => canvasTex(256, (g, S) => {
  const r = rng(11); g.fillStyle = '#e6d3b2'; g.fillRect(0, 0, S, S);
  for (let y = 0; y < S; y += 3) { g.strokeStyle = `rgba(110,75,35,${0.08 + r() * 0.16})`; g.lineWidth = 0.6 + r() * 1.4; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= S; x += 16) g.lineTo(x, y + (r() - 0.5) * 2 + Math.sin(x * 0.03 + y) * 0.7); g.stroke(); }
}));
const brushedTex = () => once('brushed', () => canvasTex(128, (g, S) => {
  const r = rng(2); g.fillStyle = '#c9ccd0'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 700; i++) { const v = 150 + r() * 100; g.strokeStyle = `rgba(${v},${v},${v + 5},.5)`; g.lineWidth = 0.5; const y = r() * S; g.beginPath(); g.moveTo(0, y); g.lineTo(S, y + (r() - 0.5)); g.stroke(); }
}));
const labelTex = (hue = '#e8eef2') => canvasTex(128, (g, S) => {
  g.fillStyle = hue; g.fillRect(0, 0, S, S);
  g.fillStyle = 'rgba(20,50,90,.65)'; g.fillRect(0, S * 0.12, S, S * 0.1); g.fillRect(0, S * 0.78, S, S * 0.05);
  for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(30,30,30,.35)'; g.fillRect(S * 0.14, S * (0.3 + i * 0.07), S * (0.72 - (i % 3) * 0.14), 3); }
});
const letterTex = (L, base) => once('letter' + L + base.getHexString(), () => canvasTex(128, (g, S) => {
  g.clearRect(0, 0, S, S);
  g.fillStyle = '#' + new THREE.Color(base).lerp(new THREE.Color(0xffffff), 0.72).getHexString(); g.beginPath(); g.roundRect ? g.roundRect(S * 0.04, S * 0.04, S * 0.92, S * 0.92, S * 0.14) : g.rect(S * 0.04, S * 0.04, S * 0.92, S * 0.92); g.fill();
  g.fillStyle = '#' + new THREE.Color(base).multiplyScalar(0.78).getHexString(); g.font = `bold ${S * 0.68}px "Trebuchet MS", Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(L, S / 2, S * 0.56);
}));
const stripeTex = (c1, c2) => canvasTex(128, (g, S) => { g.fillStyle = c1; g.fillRect(0, 0, S, S); g.fillStyle = c2; g.fillRect(0, S * 0.08, S, S * 0.07); g.fillRect(0, S * 0.85, S, S * 0.07); });

const hexStr = (c) => '#' + (typeof c === 'number' ? c : parseInt(String(c).replace('#', ''), 16)).toString(16).padStart(6, '0');
const plasticMat = (color) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.28, clearcoat: 0.6, clearcoatRoughness: 0.2 });
const bar = (a, b, r, mat) => {                                         // tynn stang mellom to punkter
  const d = new THREE.Vector3().subVectors(b, a), m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 6), mat);
  m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); m.castShadow = true; return m;
};
const lathe = (pts, seg = 28) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(Math.max(0.0005, r), y)), seg);

// ---------- enkeltting: bygges rundt midten av boksen (sx, sy, sz) ----------
// ---------- listverk: fotlist, taklist, gerikt (lister og foringer) ----------
// Profilen tegnes i (dybde u fra veggen, høyde v) og trekkes ut langs lengden. Fronten peker +z (lister langs x), +x (lister langs z) eller +z (lister langs y).
const LIST_PROFILES = {
  fotlist: (d, h) => [[0, 0], [d * 0.78, 0], [d * 0.78, h * 0.74], [d * 0.92, h * 0.8], [d, h * 0.9], [d * 0.9, h], [0, h]],
  gerikt: (d, h) => [[0, 0], [d * 0.8, 0], [d, h * 0.07], [d, h * 0.93], [d * 0.8, h], [0, h]],
  listverk: (d, h) => [[0, 0], [d, 0], [d, h * 0.82], [d * 0.7, h], [0, h]],
};
function listGeo(kind, sx, sy, sz) {
  const dims = [sx, sy, sz], axis = dims.indexOf(Math.max(sx, sy, sz));
  const len = dims[axis], d = axis === 2 ? sx : sz, h = axis === 1 ? sx : sy;
  const mir = (pts) => pts.map(([u, v]) => new THREE.Vector2(-u, v));      // speilet: etter rotasjonen peker fronten mot +z
  let shape;
  if (kind === 'taklist') {                                                  // hulkil: buet kant mellom vegg og tak
    shape = new THREE.Shape(); shape.moveTo(0, h); shape.lineTo(0, h * 0.12); shape.quadraticCurveTo(-d * 0.5, h * 0.06, -d, h); shape.lineTo(0, h);
  } else shape = new THREE.Shape(mir((LIST_PROFILES[kind] || LIST_PROFILES.listverk)(d, h)));
  const g = new THREE.ExtrudeGeometry(shape, { depth: len, bevelEnabled: false, curveSegments: 10 });   // profilen i XY, lengden langs z
  g.translate(d / 2, -h / 2, -len / 2);
  g.rotateY(Math.PI / 2);                                                    // lengde langs x, ryggen mot −z, fronten mot +z
  if (axis === 1) g.rotateZ(Math.PI / 2);                                    // lang langs y
  if (axis === 2) g.rotateY(Math.PI / 2);                                    // lang langs z (fronten mot +x)
  g.computeVertexNormals();
  return g;
}
const paintMat = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.45, side: THREE.DoubleSide });
const listBuilder = (kind) => (sx, sy, sz, o) => { const g = new THREE.Group(); g.add(mesh(listGeo(kind, sx, sy, sz), paintMat(o.color ?? 0xf3efe6))); return g; };

const SINGLE = {
  fotlist: listBuilder('fotlist'), taklist: listBuilder('taklist'), gerikt: listBuilder('gerikt'), listverk: listBuilder('listverk'),
  bottle(sx, sy, sz, o) {
    const g = new THREE.Group(), r = Math.min(sx, sz) / 2, y0 = -sy / 2, bh = sy * 0.6;
    const bodyMat = plasticMat(o.color);
    g.add(mesh(lathe([[0.001, y0], [r * 0.9, y0], [r, y0 + 0.12], [r, y0 + bh], [r * 0.5, y0 + bh + sy * 0.12], [r * 0.42, y0 + sy * 0.84]]), bodyMat));
    const lab = mesh(new THREE.CylinderGeometry(r * 1.01, r * 1.01, bh * 0.55, 28, 1, true), new THREE.MeshStandardMaterial({ map: labelTex(), roughness: 0.6, side: THREE.DoubleSide }), false);
    lab.position.y = y0 + bh * 0.5; g.add(lab);
    if (/pump/i.test(o.id)) {                                           // pumpehode
      const stem = mesh(new THREE.CylinderGeometry(r * 0.16, r * 0.16, sy * 0.12, 10), plasticMat(0xf2f2f2)); stem.position.y = y0 + sy * 0.9; g.add(stem);
      const head = mesh(roundedBoxGeo(r * 1.0, r * 0.4, r * 0.5, 0.1, 0.06), plasticMat(0xf2f2f2)); head.position.set(r * 0.25, y0 + sy * 0.96, 0); g.add(head);
    } else {
      const cap = mesh(new THREE.CylinderGeometry(r * 0.46, r * 0.5, sy * 0.16, 18), plasticMat(0xf4f4f4)); cap.position.y = y0 + sy * 0.92; g.add(cap);
    }
    return g;
  },
  tube(sx, sy, sz, o) {
    const g = new THREE.Group(), r = sx / 2;
    const body = mesh(new THREE.CylinderGeometry(r * 0.78, r, sy * 0.82, 20, 1), new THREE.MeshStandardMaterial({ map: stripeTex('#f3f3f3', '#2a6fb8'), roughness: 0.4 }));
    body.scale.z = Math.min(1, (sz / 2) / r) * 0.62; body.position.y = -sy * 0.09; g.add(body);
    const crimp = mesh(new THREE.BoxGeometry(r * 1.9, sy * 0.1, Math.max(0.05, sz * 0.18)), plasticMat(0xeeeeee)); crimp.position.y = -sy / 2 + sy * 0.05; g.add(crimp);
    const neck = mesh(new THREE.CylinderGeometry(r * 0.3, r * 0.5, sy * 0.1, 14), plasticMat(0xf4f4f4)); neck.position.y = sy * 0.37; g.add(neck);
    const cap = mesh(new THREE.CylinderGeometry(r * 0.38, r * 0.38, sy * 0.1, 14), plasticMat(0x2a6fb8)); cap.position.y = sy * 0.46; g.add(cap);
    return g;
  },
  faucet(sx, sy, sz) {
    const g = new THREE.Group(), cr = chrome(), r = Math.min(sx, sz) * 0.32, y0 = -sy / 2;
    const base = mesh(new THREE.CylinderGeometry(r * 1.15, r * 1.3, sy * 0.16, 22), cr); base.position.y = y0 + sy * 0.08; g.add(base);
    const post = mesh(new THREE.CylinderGeometry(r * 0.7, r * 0.8, sy * 0.45, 18), cr); post.position.y = y0 + sy * 0.38; g.add(post);
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, y0 + sy * 0.55, 0), new THREE.Vector3(0, y0 + sy * 0.86, 0.02), new THREE.Vector3(0, y0 + sy * 0.97, sz * 0.2), new THREE.Vector3(0, y0 + sy * 0.9, sz * 0.4)]);
    g.add(mesh(new THREE.TubeGeometry(curve, 16, r * 0.45, 10), cr));
    const lever = mesh(roundedBoxGeo(sx * 0.9, r * 0.5, r * 0.6, 0.1, 0.06), cr); lever.position.set(sx * 0.35, y0 + sy * 0.62, 0); lever.rotation.z = 0.25; g.add(lever);
    return g;
  },
  shaver(sx, sy, sz, o) {
    const g = new THREE.Group();
    const body = mesh(roundedBoxGeo(sx, sy * 0.82, sz * 0.8, Math.min(sx, sz) * 0.4, 0.12), plasticMat(o.color)); body.position.y = -sy / 2; g.add(body);
    const head = mesh(roundedBoxGeo(sx * 1.05, sy * 0.2, sz, 0.3, 0.1), plasticMat(0x2e3238)); head.position.y = sy * 0.32; g.add(head);
    const foil = mesh(new THREE.BoxGeometry(sx * 0.8, 0.05, sz * 0.7), chrome(), false); foil.position.y = sy * 0.5; g.add(foil);
    return g;
  },
  roll(sx, sy, sz, o) {
    const g = new THREE.Group(), r = Math.min(sx, sz) / 2;
    const paper = mesh(new THREE.CylinderGeometry(r, r, sy, 32, 1, true), new THREE.MeshStandardMaterial({ color: 0xfbfaf6, roughness: 0.95, side: THREE.DoubleSide })); g.add(paper);
    for (const sgn of [-1, 1]) { const ring = mesh(new THREE.RingGeometry(r * 0.32, r, 32), new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.95 }), false); ring.rotation.x = sgn * Math.PI / 2; ring.position.y = sgn * sy / 2; g.add(ring); }
    const core = mesh(new THREE.CylinderGeometry(r * 0.32, r * 0.32, sy * 1.002, 18, 1, true), new THREE.MeshStandardMaterial({ color: 0xb59a74, roughness: 0.9, side: THREE.DoubleSide })); g.add(core);
    return g;
  },
  cup(sx, sy, sz, o) {
    const g = new THREE.Group(), r = Math.min(sx, sz) / 2, t = 0.12, y0 = -sy / 2;
    const mat = new THREE.MeshPhysicalMaterial({ color: o.color, roughness: 0.1, clearcoat: 1, side: THREE.DoubleSide });
    g.add(mesh(lathe([[0.001, y0], [r * 0.78, y0], [r * 0.82, y0 + 0.05], [r, y0 + sy], [r - t, y0 + sy], [r * 0.78 - t, y0 + t * 1.4], [0.001, y0 + t * 1.4]], 30), mat));
    return g;
  },
  toothbrush(sx, sy, sz, o) {
    const g = new THREE.Group();
    const handle = mesh(roundedBoxGeo(sx, sy * 0.78, sz, Math.min(sx, sz) * 0.45, 0.04), plasticMat(o.color)); handle.position.y = -sy / 2; g.add(handle);
    const head = mesh(roundedBoxGeo(sx * 1.1, sy * 0.2, sz * 1.5, 0.08, 0.03), plasticMat(o.color)); head.position.y = sy * 0.3; g.add(head);
    const bristle = mesh(new THREE.BoxGeometry(sx * 0.9, sy * 0.06, sz * 1.2), new THREE.MeshStandardMaterial({ color: 0xf6f6f0, roughness: 1 }), false); bristle.position.y = sy * 0.46; g.add(bristle);
    return g;
  },
  knob(sx, sy, sz, o) {
    const g = new THREE.Group(), cr = chrome(), r = Math.min(sx, sy) / 2;
    const ball = mesh(new THREE.SphereGeometry(r, 18, 12), cr); ball.scale.z = Math.min(1.2, (sz / 2) / r) * 0.9; ball.position.z = sz * 0.1; g.add(ball);
    return g;
  },
  towel(sx, sy, sz, o) {
    const g = new THREE.Group(), tt = terryTex().clone(); tt.repeat.set(Math.max(1, sx / 4), Math.max(1, sz / 4)); tt.needsUpdate = true;
    const mat = new THREE.MeshStandardMaterial({ color: o.color, map: tt, bumpMap: tt, bumpScale: 1.2, roughness: 1 });
    const n = Math.max(1, Math.round(sy / 1.3));                           // brettede lag
    for (let i = 0; i < n; i++) {
      const lh = sy / n, m = mesh(roundedBoxGeo(sx - (i % 2) * 0.15, lh * 1.04, sz - ((i + 1) % 2) * 0.15, Math.min(sx, sz) * 0.12, Math.min(0.25, lh * 0.35)), mat);
      m.position.y = -sy / 2 + i * lh; g.add(m);
    }
    const band = mesh(new THREE.BoxGeometry(sx * 1.003, sy * 0.12, sz * 0.12), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }), false); band.position.set(0, sy * 0.1, sz * 0.5); g.add(band);
    return g;
  },
  mat(sx, sy, sz, o) {
    const g = new THREE.Group(), wt = weaveTex().clone(); wt.repeat.set(sx / 3, sz / 3); wt.needsUpdate = true;
    const m = mesh(roundedBoxGeo(sx, sy, sz, Math.min(sx, sz) * 0.08, Math.min(0.18, sy * 0.4)), new THREE.MeshStandardMaterial({ color: o.color, map: wt, bumpMap: wt, bumpScale: 0.8, roughness: 1 }));
    m.position.y = -sy / 2; g.add(m);
    return g;
  },
  basket(sx, sy, sz, o) {
    const g = new THREE.Group(), wt = wickerTex().clone(); wt.repeat.set(3, 2); wt.needsUpdate = true;
    const mat = new THREE.MeshStandardMaterial({ color: o.color, map: wt, bumpMap: wt, bumpScale: 1.5, roughness: 0.95, side: THREE.DoubleSide });
    const body = mesh(lathe([[0.001, -sy / 2], [0.86, -sy / 2], [0.88, -sy / 2 + 0.2], [0.98, sy * 0.28], [1, sy * 0.36], [0.93, sy * 0.36], [0.91, -sy / 2 + 0.3], [0.001, -sy / 2 + 0.3]], 32), mat);
    body.scale.set(sx / 2, 1, sz / 2); g.add(body);
    const lid = mesh(lathe([[0.001, sy * 0.46], [0.9, sy * 0.46], [1.03, sy * 0.38], [1.03, sy * 0.34], [0.001, sy * 0.34]], 32), mat); lid.scale.set(sx / 2, 1, sz / 2); g.add(lid);
    const knobM = mesh(new THREE.SphereGeometry(Math.min(sx, sz) * 0.07, 12, 8), mat); knobM.position.y = sy * 0.48; g.add(knobM);
    return g;
  },
  hamper(sx, sy, sz, o) {                                           // firkantet flettet kurv: vaskekurv med lokk, eller åpen kurv (id med «aapen»)
    const g = new THREE.Group(), wt = wickerTex().clone(); wt.repeat.set(Math.max(2, (sx + sz) / 3), Math.max(2, sy / 1.5)); wt.needsUpdate = true;
    const mat = new THREE.MeshStandardMaterial({ color: o.color, map: wt, bumpMap: wt, bumpScale: 1.6, roughness: 0.95 });
    const open = /aapen/i.test(o.id), lidH = open ? 0 : Math.min(0.9, sy * 0.1), rc = Math.min(sx, sz) * 0.1;
    const body = mesh(roundedBoxGeo(sx * 0.97, sy - lidH, sz * 0.97, rc, 0.15), mat); body.position.y = -sy / 2; g.add(body);
    const dark = new THREE.MeshStandardMaterial({ color: new THREE.Color(o.color).multiplyScalar(0.45), roughness: 1 });
    if (open) {                                                         // tykk kant øverst og mørkt innvendig
      const rim = mesh(roundedBoxGeo(sx, 0.35, sz, rc, 0.12), mat); rim.position.y = sy / 2 - 0.35; g.add(rim);
      const ins = mesh(new THREE.BoxGeometry(sx * 0.86, 0.04, sz * 0.86), dark, false); ins.position.y = sy / 2 + 0.01; g.add(ins);
      for (const s of [-1, 1]) { const hd = mesh(new THREE.BoxGeometry(0.08, 0.5, sz * 0.3), dark, false); hd.position.set(s * sx * 0.488, sy * 0.3, 0); g.add(hd); }   // håndtakshull
    } else {
      const lid = mesh(roundedBoxGeo(sx, lidH, sz, rc, 0.12), mat); lid.position.y = sy / 2 - lidH; g.add(lid);
      const gap = mesh(new THREE.BoxGeometry(sx * 0.985, 0.06, sz * 0.985), dark, false); gap.position.y = sy / 2 - lidH; g.add(gap);
    }
    return g;
  },
  toyblock(sx, sy, sz, o) {                                         // treklosser: avrundede terninger stablet i høyden, med en innfelt rute på sidene
    const g = new THREE.Group(), n = Math.max(1, Math.round(sy / Math.max(sx, sz))), h = sy / n;
    const mat = new THREE.MeshStandardMaterial({ color: o.color, roughness: 0.55 }), inl = new THREE.MeshStandardMaterial({ color: new THREE.Color(o.color).lerp(new THREE.Color(0xffffff), 0.45), roughness: 0.6 });
    for (let i = 0; i < n; i++) {
      const b = mesh(roundedBoxGeo(sx, h * 0.985, sz, Math.min(sx, sz) * 0.12, Math.min(0.14, h * 0.1)), mat); b.position.y = -sy / 2 + i * h; g.add(b);
      for (const [dx, dz, w, d] of [[0, 1, sx * 0.62, 0.05], [0, -1, sx * 0.62, 0.05], [1, 0, 0.05, sz * 0.62], [-1, 0, 0.05, sz * 0.62]]) { const p = mesh(new THREE.BoxGeometry(w, h * 0.6, d), inl, false); p.position.set(dx * sx / 2, -sy / 2 + i * h + h / 2, dz * sz / 2); g.add(p); }
    }
    return g;
  },
  letterblock(sx, sy, sz, o) {                                      // bokstavkloss: pastell, avrundet, med bokstav på alle sider og oppå; høyere enn bred = stablet
    const g = new THREE.Group(), letters = letterStack(o.id, sx, sy, sz), n = letters.length, h = sy / n, base = new THREE.Color(o.color).lerp(new THREE.Color(0xffffff), 0.35);
    const mat = new THREE.MeshStandardMaterial({ color: base, roughness: 0.6 });
    letters.forEach((L, i) => {
      const b = mesh(roundedBoxGeo(sx, h * 0.985, sz, Math.min(sx, sz) * 0.14, Math.min(0.14, h * 0.1)), mat); b.position.y = -sy / 2 + i * h; g.add(b);
      const tex = letterTex(L, new THREE.Color(o.color)), lm = new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
      for (const [dx, dz, ry, w] of [[0, 1, 0, sx], [0, -1, Math.PI, sx], [1, 0, Math.PI / 2, sz], [-1, 0, -Math.PI / 2, sz]]) {
        const p = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.78, h * 0.78), lm); p.rotation.y = ry; p.position.set(dx * (sx / 2 + 0.012), -sy / 2 + i * h + h / 2, dz * (sz / 2 + 0.012)); g.add(p);
      }
      if (i === n - 1) { const top = new THREE.Mesh(new THREE.PlaneGeometry(sx * 0.78, sz * 0.78), lm); top.rotation.x = -Math.PI / 2; top.position.set(0, letterTopY(sy, n), 0); g.add(top); }
    });
    return g;
  },
  legoblock(sx, sy, sz, o) {                                        // Lego-aktig kloss: kropp med knotter på toppen (knottene ligger innenfor boksen). Kan stables og klatres på.
    const g = new THREE.Group(), mat = new THREE.MeshStandardMaterial({ color: o.color, roughness: 0.32, metalness: 0 }), stud = Math.min(STUD_H, sy * 0.3), bh = sy - stud;
    const body = mesh(roundedBoxGeo(sx, bh, sz, Math.min(sx, sz) * 0.05, Math.min(0.1, bh * 0.1)), mat); body.position.y = -sy / 2; g.add(body);
    const geo = new THREE.CylinderGeometry(0.42, 0.42, stud * 1.02, 14);
    const r = Math.min(0.42, sx * 0.28, sz * 0.28), sg = r === 0.42 ? geo : new THREE.CylinderGeometry(r, r, stud * 1.02, 14);
    for (const [x, z] of studLayout(sx, sz)) { const s = mesh(sg, mat); s.position.set(x, sy / 2 - stud / 2, z); g.add(s); }
    return g;
  },
  toycar(sx, sy, sz, o) {                                           // leketøysbil (liten varebil/buss): hele boksen er karosseri, så toppen er flat; hjul og vinduer er pynt innenfor boksen
    const g = new THREE.Group(), body = new THREE.MeshStandardMaterial({ color: o.color, roughness: 0.3 }), dark = new THREE.MeshStandardMaterial({ color: 0x2a2f36, roughness: 0.5 });
    const glass = new THREE.MeshStandardMaterial({ color: 0xbfe3f4, roughness: 0.08, metalness: 0.2 }), white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    const long = sx >= sz, L = long ? sx : sz, W = long ? sz : sx, car = new THREE.Group();            // bygges langs x, dreies til lengste side
    const w = carWheel(L, sy, W), hb = sy - w.r * 0.5;
    const hull = mesh(roundedBoxGeo(L, hb, W * 0.98, Math.min(W, hb) * 0.18, Math.min(0.2, hb * 0.1)), body); hull.position.y = -sy / 2 + w.r * 0.5; car.add(hull);
    const wy = -sy / 2 + hb * 0.5 + w.r * 0.5 + hb * 0.12;                                              // vindusbånd
    for (const s of [-1, 1]) {
      const win = mesh(new THREE.BoxGeometry(L * 0.62, hb * 0.28, 0.04), glass, false); win.position.set(-L * 0.06, wy, s * (W * 0.49 + 0.015)); car.add(win);
      const ws = mesh(new THREE.BoxGeometry(0.04, hb * 0.28, W * 0.76), glass, false); if (s > 0) { ws.position.set(L / 2 + 0.01, wy, 0); car.add(ws); }
      for (const hx of w.xs) { const wh = mesh(new THREE.CylinderGeometry(w.r, w.r, 0.2, 20), dark); wh.rotation.x = Math.PI / 2; wh.position.set(hx, w.y, s * (W / 2 - 0.04)); car.add(wh); const hub = mesh(new THREE.CylinderGeometry(w.r * 0.5, w.r * 0.5, 0.22, 14), white, false); hub.rotation.x = Math.PI / 2; hub.position.set(hx, w.y, s * (W / 2 - 0.035)); car.add(hub); }
    }
    for (const s of [-1, 1]) { const hl = mesh(new THREE.SphereGeometry(Math.min(0.3, W * 0.09), 10, 8), white, false); hl.position.set(L / 2 - 0.02, -sy / 2 + hb * 0.3 + w.r * 0.5, s * W * 0.3); car.add(hl); }
    if (!long) car.rotation.y = -Math.PI / 2;
    g.add(car); return g;
  },
  ball(sx, sy, sz, o) {
    const g = new THREE.Group(), r = Math.min(sx, sy, sz) / 2, col = new THREE.Color(o.color);
    g.add(mesh(new THREE.SphereGeometry(r, 28, 20), new THREE.MeshStandardMaterial({ color: col, roughness: 0.45 })));
    const band = new THREE.MeshStandardMaterial({ color: col.clone().lerp(new THREE.Color(0xffffff), 0.8), roughness: 0.5 });
    for (const rot of [0, Math.PI / 2]) { const t = mesh(new THREE.TorusGeometry(r * 1.002, r * 0.07, 8, 40), band, false); t.rotation.x = rot; g.add(t); }
    return g;
  },
  bag(sx, sy, sz, o) {
    const g = new THREE.Group(), wt = weaveTex().clone(); wt.repeat.set(2, 2); wt.needsUpdate = true;
    const body = mesh(new THREE.SphereGeometry(0.5, 20, 14), new THREE.MeshStandardMaterial({ color: o.color, map: wt, bumpMap: wt, bumpScale: 0.6, roughness: 1 }));
    body.scale.set(sx, sy * 0.86, sz); body.position.y = -sy * 0.07; g.add(body);
    const strap = mesh(new THREE.TorusGeometry(Math.min(sx, sz) * 0.2, 0.06, 8, 18), new THREE.MeshStandardMaterial({ color: 0xcfc6b0, roughness: 1 })); strap.position.y = sy * 0.44; g.add(strap);
    return g;
  },
  caddy(sx, sy, sz) {
    const g = new THREE.Group(), cr = chrome(), r = 0.045, x = sx / 2, y = sy / 2, z = sz / 2;
    const P = (a, b, c) => new THREE.Vector3(a, b, c);
    for (const yy of [-y, y]) for (const [a, b] of [[[-x, -z], [x, -z]], [[x, -z], [x, z]], [[x, z], [-x, z]], [[-x, z], [-x, -z]]]) g.add(bar(P(a[0], yy, a[1]), P(b[0], yy, b[1]), r * 1.5, cr));
    for (const [px, pz] of [[-x, -z], [x, -z], [x, z], [-x, z]]) g.add(bar(P(px, -y, pz), P(px, y, pz), r * 1.5, cr));
    for (let i = 1; i < 6; i++) { const t = -x + (2 * x * i) / 6; g.add(bar(P(t, -y, -z), P(t, -y, z), r, cr)); }
    for (let i = 1; i < 4; i++) { const t = -z + (2 * z * i) / 4; g.add(bar(P(-x, -y, t), P(x, -y, t), r, cr)); }
    for (let i = 1; i < 6; i++) { const t = -x + (2 * x * i) / 6; g.add(bar(P(t, -y, z), P(t, y, z), r, cr)); g.add(bar(P(t, -y, -z), P(t, y, -z), r, cr)); }
    return g;
  },
  vanity(sx, sy, sz, o) {
    const g = new THREE.Group(), wt = woodishTex().clone(); wt.repeat.set(2, 1); wt.needsUpdate = true;
    const wood = new THREE.MeshStandardMaterial({ color: o.color, map: wt, roughness: 0.55 });
    g.add(mesh(new THREE.BoxGeometry(sx, sy, sz), wood));
    const dark = new THREE.MeshStandardMaterial({ color: new THREE.Color(o.color).multiplyScalar(0.55), roughness: 0.6 });
    const front = sz / 2 + 0.01, pw = sx / 2 - 0.5;
    for (const cx of [-sx / 4, sx / 4]) {                                       // to dører med innfelt panel og fuge
      for (const [dx, dy, w, h] of [[0, sy * 0.4, pw, 0.1], [0, -sy * 0.4, pw, 0.1], [-pw / 2, 0, 0.1, sy * 0.8], [pw / 2, 0, 0.1, sy * 0.8]]) {
        const l = mesh(new THREE.BoxGeometry(w, h, 0.06), dark, false); l.position.set(cx + dx, dy, front); g.add(l);
      }
    }
    const seam = mesh(new THREE.BoxGeometry(0.1, sy * 0.96, 0.07), dark, false); seam.position.set(0, 0, front); g.add(seam);
    return g;
  },
  vanity_top(sx, sy, sz, o) {
    const g = new THREE.Group(), pw = porcelain(o.color);
    g.add(mesh(roundedBoxGeo(sx, sy, sz, 0.8, 0.18), pw)); g.children[0].position.y = -sy / 2;
    // vask: forsenket utseende (selve flaten er flat i fysikken)
    const rx = sx * 0.2, rz = sz * 0.32, cx = -sx * 0.05, cz = sz * 0.08;
    const rim = mesh(new THREE.TorusGeometry(1, 0.06, 8, 40), pw); rim.rotation.x = Math.PI / 2; rim.scale.set(rx, rz, 1); rim.position.set(cx, sy / 2 + 0.03, cz); g.add(rim);
    const bas = mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshPhysicalMaterial({ color: 0xcfd3d4, roughness: 0.2, clearcoat: 0.8 }), false); bas.rotation.x = -Math.PI / 2; bas.scale.set(rx * 0.97, rz * 0.97, 1); bas.position.set(cx, sy / 2 + 0.02, cz); g.add(bas);
    const dr = mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.04, 16), chrome(), false); dr.position.set(cx, sy / 2 + 0.05, cz - rz * 0.35); g.add(dr);
    const wat = mesh(new THREE.CircleGeometry(1, 28), new THREE.MeshPhysicalMaterial({ color: 0x7fb9d2, roughness: 0.04, transparent: true, opacity: 0.5 }), false); wat.rotation.x = -Math.PI / 2; wat.scale.set(rx * 0.35, rz * 0.3, 1); wat.position.set(cx, sy / 2 + 0.06, cz - rz * 0.3); g.add(wat);
    return g;
  },
  shelf(sx, sy, sz, o) {
    const g = new THREE.Group(), cr = chrome();
    g.add(mesh(new THREE.BoxGeometry(sx, sy, sz), new THREE.MeshPhysicalMaterial({ color: 0xbfe0dc, roughness: 0.05, transparent: true, opacity: 0.45, transmission: 0.5 }), false));
    for (const sgn of [-1, 1]) { const b = mesh(new THREE.BoxGeometry(0.25, 1.2, 0.25), cr); b.position.set(sgn * (sx / 2 - 0.5), -sy / 2 - 0.6, sz / 2 - 0.4); g.add(b); }
    return g;
  },
  light_box(sx, sy, sz, o) {
    const g = new THREE.Group();
    g.add(mesh(roundedBoxGeo(sx, sy, sz, 1.2, 0.3), new THREE.MeshStandardMaterial({ color: 0xfff7e0, emissive: 0xfff0c0, emissiveIntensity: 0.55, roughness: 0.4 }))); g.children[0].position.y = -sy / 2;
    return g;
  },
  pole(sx, sy, sz, o) {
    const g = new THREE.Group(), r = Math.min(sx, sz) / 2;
    const h = mesh(new THREE.CylinderGeometry(r * 0.35, r * 0.35, sy * 0.78, 10), plasticMat(0x2e3238)); h.position.y = sy * 0.09; g.add(h);
    const head = mesh(lathe([[0.001, -sy / 2], [r * 0.8, -sy / 2 + 0.1], [r, -sy * 0.38], [r * 0.7, -sy * 0.26], [r * 0.35, -sy * 0.2]]), new THREE.MeshStandardMaterial({ color: 0x3b3f46, roughness: 0.9 })); g.add(head);
    return g;
  },
  key(sx, sy, sz) {                                                 // nøkkel (R7): gylden, flat, med ring i den ene enden og to tenner; bygges langs x
    const g = new THREE.Group(), gold = new THREE.MeshStandardMaterial({ color: 0xffc83a, roughness: 0.25, metalness: 0.7, emissive: 0x6a4200, emissiveIntensity: 0.45 });
    const t = Math.min(sy, 0.5), R = Math.min(sz * 0.36, sx * 0.17), L = sx - R * 2 - t * 0.4;
    const bow = mesh(new THREE.TorusGeometry(R, t * 0.42, 8, 20), gold); bow.rotation.x = Math.PI / 2; bow.position.x = -sx / 2 + R + t * 0.4; g.add(bow);
    const shaft = mesh(new THREE.BoxGeometry(L, t * 0.62, t * 0.62), gold); shaft.position.x = sx / 2 - L / 2; g.add(shaft);
    for (const k of [0.16, 0.34]) { const tooth = mesh(new THREE.BoxGeometry(t * 0.55, t * 0.5, sz * 0.26), gold); tooth.position.set(sx / 2 - L * k, 0, sz * 0.13 + t * 0.12); g.add(tooth); }
    return g;
  },
  qtip(sx, sy, sz) {                                                // ørepinne: stav med bomullstipper; bygges langs x
    const g = new THREE.Group(), L = Math.max(sx, sy, sz), t = Math.min(sx, sy, sz), r = Math.max(0.035, t * 0.32);
    const stick = mesh(new THREE.CylinderGeometry(r, r, L, 10), new THREE.MeshStandardMaterial({ color: 0xf2f1ec, roughness: 0.5 })); stick.rotation.z = Math.PI / 2; g.add(stick);
    const cotton = new THREE.MeshStandardMaterial({ color: 0xfffefb, roughness: 1, map: terryTex(), bumpMap: terryTex(), bumpScale: 0.6 });
    for (const sgn of [-1, 1]) {
      const tip = mesh(new THREE.CapsuleGeometry(Math.min(t / 2, r * 2.1), t * 0.9, 4, 10), cotton); tip.rotation.z = Math.PI / 2; tip.position.x = sgn * (L / 2 - t * 0.55); g.add(tip);
    }
    return g;
  },
  sponge(sx, sy, sz, o) {
    const g = new THREE.Group(), tex = canvasTex(128, (c, S) => {
      const r = rng(9); c.fillStyle = '#f4d24a'; c.fillRect(0, 0, S, S);
      for (let i = 0; i < 260; i++) { const rr = 1.5 + r() * 4; c.fillStyle = `rgba(150,100,0,${0.15 + r() * 0.3})`; c.beginPath(); c.arc(r() * S, r() * S, rr, 0, 7); c.fill(); c.fillStyle = 'rgba(255,240,170,.5)'; c.beginPath(); c.arc(r() * S - 1, r() * S - 1, rr * 0.5, 0, 7); c.fill(); }
    });
    const body = mesh(roundedBoxGeo(sx, sy * 0.68, sz, Math.min(sx, sz) * 0.16, Math.min(0.22, sy * 0.2)), new THREE.MeshStandardMaterial({ color: 0xffffff, map: tex, bumpMap: tex, bumpScale: 2.5, roughness: 1 }));
    body.position.y = -sy / 2; g.add(body);
    const pad = mesh(roundedBoxGeo(sx, sy * 0.3, sz, Math.min(sx, sz) * 0.16, Math.min(0.14, sy * 0.1)), new THREE.MeshStandardMaterial({ color: 0x3f8f4f, map: weaveTex(), roughness: 1 }));
    pad.position.y = -sy / 2 + sy * 0.7; g.add(pad);
    return g;
  },
  paper_pile(sx, sy, sz) {                                          // haug av utrullet dopapir
    const g = new THREE.Group(), r = rng(31), mat = new THREE.MeshStandardMaterial({ color: 0xfbfaf6, roughness: 0.95, map: terryTex(), bumpMap: terryTex(), bumpScale: 0.3 });
    const n = 14;
    for (let i = 0; i < n; i++) {
      const f = 1 - (i / n) * 0.55, w = sx * f * (0.7 + r() * 0.3), d = sz * f * (0.7 + r() * 0.3), h = sy / n * 1.7;
      const m = mesh(roundedBoxGeo(w, h, d, Math.min(w, d) * 0.3, h * 0.45), mat);
      m.position.set((r() - 0.5) * sx * 0.15, -sy / 2 + (i / n) * sy * 0.88, (r() - 0.5) * sz * 0.15); m.rotation.y = r() * Math.PI; g.add(m);
    }
    return g;
  },
  towel_hang(sx, sy, sz, o) {                                        // håndkle som henger langs en vegg: klatrbart
    const g = new THREE.Group(), tt = terryTex().clone(); tt.repeat.set(Math.max(1, sz / 3), Math.max(1, sy / 3)); tt.needsUpdate = true;
    const mat = new THREE.MeshStandardMaterial({ color: o.color, map: tt, bumpMap: tt, bumpScale: 1.4, roughness: 1 });
    g.add(mesh(roundedBoxGeo(sx, sy, sz, Math.min(sx, sz) * 0.3, Math.min(0.15, sx * 0.3)), mat)); g.children[0].position.y = -sy / 2;
    const band = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 });
    if (!/kape|bukse|jakke/i.test(o.id)) for (const f of [0.12, 0.88]) { const b = mesh(new THREE.BoxGeometry(sx + 0.08, sy * 0.05, Math.max(0.05, sz - 0.04)), band, false); b.position.y = -sy / 2 + sy * f; g.add(b); }   // håndklær har striper; klær har ikke
    return g;
  },
  needle(sx, sy, sz, o) {                                           // nål: lang, tynn og blank, med øye i den ene enden; får en rød tråd når den er trædd
    const g = new THREE.Group(), r = Math.min(sy, sz) * 0.42, cr = chrome();
    const body = mesh(new THREE.CylinderGeometry(r, r, sx * 0.86, 10), cr); body.rotation.z = Math.PI / 2; body.position.x = -sx * 0.07; g.add(body);
    const tip = mesh(new THREE.ConeGeometry(r, sx * 0.14, 10), cr); tip.rotation.z = -Math.PI / 2; tip.position.x = sx * 0.43; g.add(tip);
    const eye = mesh(new THREE.TorusGeometry(r * 1.1, r * 0.3, 6, 12), cr); eye.position.x = -sx * 0.4; g.add(eye);
    const th = new THREE.Group(); th.visible = false;
    const strand = mesh(new THREE.CylinderGeometry(r * 0.35, r * 0.35, sx * 1.1, 6), new THREE.MeshStandardMaterial({ color: 0xd04a4a, roughness: 0.9 }), false);
    strand.rotation.z = Math.PI / 2; strand.position.set(-sx * 0.95, -r * 0.5, 0); th.add(strand); g.add(th);
    g.userData.thread = (on) => { th.visible = on; };
    return g;
  },
  spool(sx, sy, sz, o) {                                             // trådsnelle: rød tråd mellom to tre-skiver
    const g = new THREE.Group(), r = Math.min(sx, sz) / 2, wood = new THREE.MeshStandardMaterial({ color: 0xc8a064, roughness: 0.7 });
    const core = mesh(new THREE.CylinderGeometry(r * 0.7, r * 0.7, sy * 0.78, 20), new THREE.MeshStandardMaterial({ color: 0xd04a4a, roughness: 0.95, map: terryTex(), bumpMap: terryTex(), bumpScale: 0.4 })); g.add(core);
    for (const sgn of [-1, 1]) { const d = mesh(new THREE.CylinderGeometry(r, r, sy * 0.11, 20), wood); d.position.y = sgn * sy * 0.445; g.add(d); }
    return g;
  },
  gel_bottle(sx, sy, sz, o) {                                        // hårgelé: bred, lav boks med blått lokk
    const g = new THREE.Group(), r = Math.min(sx, sz) / 2, y0 = -sy / 2;
    g.add(mesh(lathe([[0.001, y0], [r * 0.95, y0], [r, y0 + 0.1], [r, y0 + sy * 0.72], [r * 0.82, y0 + sy * 0.8]]), new THREE.MeshPhysicalMaterial({ color: o.color, roughness: 0.08, clearcoat: 1, transparent: true, opacity: 0.85 })));
    const lab = mesh(new THREE.CylinderGeometry(r * 1.01, r * 1.01, sy * 0.38, 28, 1, true), new THREE.MeshStandardMaterial({ map: labelTex('#e8f6fb'), roughness: 0.6, side: THREE.DoubleSide }), false); lab.position.y = y0 + sy * 0.38; g.add(lab);
    const cap = mesh(new THREE.CylinderGeometry(r * 0.62, r * 0.7, sy * 0.24, 20), plasticMat(0x1d6fb8)); cap.position.y = y0 + sy * 0.88; g.add(cap);
    return g;
  },
  gel(sx, sy, sz, o) {                                               // klistrete felt på veggen: blankt og blått mens det er vått, matt og stivt når det har tørket
    const g = new THREE.Group();
    const wet = new THREE.MeshPhysicalMaterial({ color: 0x8fd8ee, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.78 });
    const m = mesh(roundedBoxGeo(sx, sy, sz, Math.min(sx, sz) * 0.45, Math.min(sx, sy, sz) * 0.3), wet);
    m.position.y = -sy / 2; g.add(m);
    g.userData.dry = () => { m.material = new THREE.MeshStandardMaterial({ color: 0xcfe9ef, roughness: 0.55, transparent: true, opacity: 0.92 }); };
    return g;
  },
  paper_strip(sx, sy, sz, o) {                                       // dopapirbånd: ark med perforering
    const g = new THREE.Group(), mat = new THREE.MeshStandardMaterial({ color: 0xfbfaf6, roughness: 0.95, map: terryTex(), bumpMap: terryTex(), bumpScale: 0.25 });
    const n = Math.max(1, Math.round(sy / 0.9)), h = sy / n;
    for (let i = 0; i < n; i++) { const m = mesh(roundedBoxGeo(sx, h * 0.93, sz, Math.min(sx, sz) * 0.2, Math.min(0.03, sx * 0.2)), mat); m.position.y = -sy / 2 + i * h + h * 0.035; g.add(m); }
    return g;
  },
  mirror(sx, sy, sz) {
    const g = new THREE.Group(), cr = chrome(), f = 0.35;
    g.add(mesh(new THREE.BoxGeometry(sx - 0.2, sy - 0.2, 0.1), new THREE.MeshStandardMaterial({ color: 0xdfe9ee, metalness: 0.85, roughness: 0.04, emissive: 0x6d7f88, emissiveIntensity: 0.35 }), false));
    for (const [x, y, w, h] of [[0, sy / 2, sx + f, f], [0, -sy / 2, sx + f, f], [-sx / 2, 0, f, sy], [sx / 2, 0, f, sy]]) { const b = mesh(new THREE.BoxGeometry(w, h, sz + 0.25), cr); b.position.set(x, y, 0); g.add(b); }
    return g;
  },
};
// ting fra scene: bruk det vi har (kind, ellers materialet). Returnerer en gruppe sentrert i boksen, eller null.
export function buildSingle(kind, size, opts = {}) {
  const fn = SINGLE[kind] || TOY_BUILDERS[kind]; if (!fn) return null;
  const [sx, sy, sz] = size, o = { color: opts.color ?? 0xcccccc, id: opts.id || '', material: opts.material };
  const g = fn(sx, sy, sz, o); return g;
}

const BUILDERS = [
  [(ms) => ms.some((m) => m.kind === 'toilet_tank'), toilet],
  [(ms) => ms.every((m) => m.kind === 'tub'), tub],
  [(ms) => ms.some((m) => m.id === 'vask_plate'), sink],
];
// Tegn en gruppe bokser som én ting. Returnerer et Object3D, eller null hvis gruppen ikke har noen egen form (da tegnes boksene som vanlig).
export function buildGroup(members) {
  for (const [test, fn] of BUILDERS) if (test(members)) return fn(members);
  return null;
}

// ---------- maur (v0.77): blank, litt tegnefilm-aktig (store øyne, tykk kropp), seks bein som går i trebeinsgange ----------
// Lokal +x er fremover. Returnerer { root, update(phase, speed, squash, alerted) }.
export function buildAnt({ color = 0x9a3a1e, crumb = false } = {}) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const shell = new THREE.MeshPhysicalMaterial({ color, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.12 });
  const dark = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.42), roughness: 0.4 });
  const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.15 }), black = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1 });
  const S = (r, mat, x, y, z, sx = 1, sy = 1, sz = 1) => { const m = mesh(new THREE.SphereGeometry(r, 20, 14), mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); body.add(m); return m; };
  S(0.44, shell, -0.66, 0.56, 0, 1.25, 1, 1);                           // bakkropp
  S(0.3, shell, -0.02, 0.58, 0, 1.15, 0.95, 0.9);                       // bryst
  const head = S(0.37, shell, 0.62, 0.62, 0, 1, 1, 1.05);               // hode
  for (const z of [-1, 1]) {                                            // store øyne med glans
    S(0.17, white, 0.84, 0.74, z * 0.2, 1, 1.15, 1);
    S(0.085, black, 0.97, 0.75, z * 0.2); S(0.03, white, 1.0, 0.8, z * 0.17);
  }
  const mouth = mesh(new THREE.TorusGeometry(0.1, 0.022, 6, 14, Math.PI), dark); mouth.position.set(0.97, 0.52, 0); mouth.rotation.set(0, Math.PI / 2, Math.PI); body.add(mouth);
  const ant = [];                                                       // følehorn: to ledd + kule i tuppen
  for (const z of [-1, 1]) {
    const a = mesh(new THREE.CylinderGeometry(0.03, 0.04, 1, 6), dark), b = mesh(new THREE.CylinderGeometry(0.025, 0.03, 1, 6), dark), tip = S(0.06, shell, 0, 0, 0);
    body.add(a, b); ant.push({ a, b, tip, z });
  }
  // bein: hofte på brystet, kne opp og ut, fot i bakken. Tre par, hvert bein går i fase etter trebeinsgangen
  const legMat = dark, legs = [];
  for (const [i, hx] of [0.18, 0, -0.18].entries()) for (const z of [-1, 1]) {
    const up = mesh(new THREE.CylinderGeometry(0.055, 0.07, 1, 8), legMat), lo = mesh(new THREE.CylinderGeometry(0.04, 0.055, 1, 8), legMat), knee = mesh(new THREE.SphereGeometry(0.085, 10, 8), legMat);
    body.add(up, lo, knee); legs.push({ up, lo, knee, hx, z, ph: (i + (z > 0 ? 1 : 0)) % 2 ? Math.PI : 0 });
  }
  let crumbMesh = null;
  if (crumb) {                                                          // en brødsmule på ryggen: maurene bærer hjem mat
    crumbMesh = mesh(new THREE.DodecahedronGeometry(0.26, 0), new THREE.MeshStandardMaterial({ color: 0xe2b66a, roughness: 1, flatShading: true })); crumbMesh.position.set(-0.45, 1.12, 0); crumbMesh.scale.set(1.2, 0.8, 1); body.add(crumbMesh);
  }
  const seg = (m, a, b) => { const d = new THREE.Vector3().subVectors(b, a), l = d.length() || 1e-3; m.position.copy(a).addScaledVector(d, 0.5); m.scale.set(1, l, 1); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.divideScalar(l)); };
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
  function update(phase, speed = 0, squash = 0, alerted = false) {
    const walk = Math.min(1, speed / 2);
    for (const l of legs) {
      const t = phase + l.ph, swing = Math.sin(t) * 0.3 * walk, lift = Math.max(0, Math.cos(t)) * 0.2 * walk;
      A.set(l.hx, 0.46, l.z * 0.18);                                                     // hofte
      C.set(l.hx + swing * 0.6, 0.78 + lift * 0.5, l.z * 0.58);                          // kne
      B.set(l.hx * 1.4 + swing, lift, l.z * 0.78);                                       // fot
      seg(l.up, A, C); seg(l.lo, C, B); l.knee.position.copy(C);
    }
    const perk = alerted ? 0.25 : 0, wob = Math.sin(phase * 0.7) * 0.08;
    for (const f of ant) {                                                               // følehornene spriker og vifter; reiser seg når den har sett deg
      A.set(0.78, 0.92, f.z * 0.14); C.set(1.05 + perk * 0.3, 1.2 + perk, f.z * (0.3 + wob)); B.set(1.32 + perk * 0.4, 1.28 + perk * 1.2 + wob, f.z * (0.52 + wob));
      seg(f.a, A, C); seg(f.b, C, B); f.tip.position.copy(B);
    }
    body.position.y = Math.abs(Math.sin(phase)) * 0.045 * walk; body.rotation.z = Math.sin(phase) * 0.04 * walk;
    head.rotation.y = Math.sin(phase * 0.5) * 0.12 * (1 - walk);
    root.scale.set(1 + squash * 0.5, Math.max(0.04, 1 - squash * 0.96), 1 + squash * 0.5);   // knust: flat som en pannekake
  }
  update(0, 0, 0, false);
  return { root, update };
}

// ---------- smule (R3): gylden, blank stjerneklump som flyter og snurrer. Returnerer { root, update(t, got) } ----------
export function buildCrumb() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const gold = new THREE.MeshStandardMaterial({ color: 0xffc83a, roughness: 0.25, metalness: 0.55, emissive: 0xc77a10, emissiveIntensity: 0.55, flatShading: true });
  const core = mesh(new THREE.OctahedronGeometry(0.42, 0), gold); core.scale.set(1, 1.15, 1); body.add(core);
  const cap = mesh(new THREE.DodecahedronGeometry(0.22, 0), gold); cap.position.set(0.12, 0.34, 0.05); body.add(cap);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.72, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.16, depthWrite: false })); body.add(glow);
  function update(t, got = false) {
    body.rotation.y = t * 2.2; body.position.y = Math.sin(t * 2.6) * 0.12; body.rotation.z = Math.sin(t * 1.7) * 0.12;
    root.visible = !got;
  }
  update(0, false);
  return { root, update };
}

// ---- R6: edderkopp-vakt og bærer-maur ---------------------------------------------------------------------
// Edderkopp: rund, lilla kropp med gule flekker, fire store øyne, åtte bein. Står stille (puster), duker når den ser deg, strekker beina i hoppet.
// update(phase, speed, squash, alerted, t): t er maur-oppføringen (t.crouchK 0..1, t.mode 'idle' | 'crouch' | 'leap' | 'rest' | 'return').
export function buildSpider({ color = 0x6a3a86 } = {}) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const shell = new THREE.MeshPhysicalMaterial({ color, roughness: 0.3, clearcoat: 0.9, clearcoatRoughness: 0.15 });
  const dark = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.45), roughness: 0.45 });
  const spot = new THREE.MeshStandardMaterial({ color: 0xf2c64a, roughness: 0.4 });
  const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.15 }), black = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1 });
  const S = (r, mat, x, y, z, sx = 1, sy = 1, sz = 1) => { const m = mesh(new THREE.SphereGeometry(r, 20, 14), mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); body.add(m); return m; };
  S(0.46, shell, -0.4, 0.62, 0, 1.1, 0.95, 1);                           // bakkropp
  for (const [x, z, r] of [[-0.5, 0.2, 0.09], [-0.5, -0.2, 0.09], [-0.78, 0, 0.1], [-0.28, 0, 0.08]]) S(r, spot, x, 1.02 - Math.abs(x + 0.5) * 0.1, z);   // gule flekker
  S(0.32, shell, 0.3, 0.58, 0, 1, 0.95, 1.1);                            // hode
  for (const z of [-1, 1]) {                                            // fire øyne: to store, to små
    S(0.15, white, 0.52, 0.7, z * 0.17); S(0.075, black, 0.64, 0.7, z * 0.17); S(0.025, white, 0.68, 0.74, z * 0.15);
    S(0.09, white, 0.5, 0.82, z * 0.1); S(0.045, black, 0.57, 0.82, z * 0.1);
  }
  const fang = []; for (const z of [-1, 1]) { const f = mesh(new THREE.ConeGeometry(0.05, 0.22, 8), white); f.position.set(0.58, 0.4, z * 0.09); f.rotation.z = Math.PI * 0.95; body.add(f); fang.push(f); }
  const legs = [];
  // fire par bein i et tydelig fan: første par peker framover, siste bakover, midtparene rett ut til siden (ang = vinkel fra framretning mot siden, len = rekkevidde)
  for (const [i, [hx, ang, len]] of [[0.38, 0.62, 1.2], [0.18, 1.2, 1.4], [-0.04, 1.85, 1.4], [-0.26, 2.5, 1.2]].entries()) for (const z of [-1, 1]) {
    const up = mesh(new THREE.CylinderGeometry(0.03, 0.045, 1, 8), dark), lo = mesh(new THREE.CylinderGeometry(0.02, 0.032, 1, 8), dark), knee = mesh(new THREE.SphereGeometry(0.05, 10, 8), dark), foot = mesh(new THREE.SphereGeometry(0.035, 8, 6), dark);
    body.add(up, lo, knee, foot); legs.push({ up, lo, knee, foot, hx, z, ang, len, ph: (i + (z > 0 ? 1 : 0)) % 2 ? Math.PI : 0 });
  }
  const seg = (m, a, b) => { const d = new THREE.Vector3().subVectors(b, a), l = d.length() || 1e-3; m.position.copy(a).addScaledVector(d, 0.5); m.scale.set(1, l, 1); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.divideScalar(l)); };
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
  function update(phase, speed = 0, squash = 0, alerted = false, t = {}) {
    const crouch = t.crouchK || 0, leap = t.mode === 'leap', walk = Math.min(1, speed / 2), idle = Math.sin(phase * 0.35);
    for (const l of legs) {
      const sw = Math.sin(phase + l.ph) * 0.2 * walk, lift = Math.max(0, Math.cos(phase + l.ph)) * 0.18 * walk;
      const reach = leap ? 1.3 : 1 - crouch * 0.2, cx = Math.cos(l.ang), sz = Math.sin(l.ang) * l.z;
      A.set(l.hx, 0.58 - crouch * 0.2, l.z * 0.18);
      C.set(l.hx + cx * l.len * 0.5 * reach, (leap ? 1.2 : 1.08) + crouch * 0.2 + idle * 0.02, sz * l.len * 0.5 * reach + l.z * 0.12);
      B.set(l.hx + cx * l.len * reach + sw, leap ? 0.5 : lift, sz * l.len * reach);
      seg(l.up, A, C); seg(l.lo, C, B); l.knee.position.copy(C); l.foot.position.copy(B);
    }
    body.position.y = -crouch * 0.18 + (leap ? 0.1 : 0) + idle * 0.015; body.rotation.z = leap ? -0.25 : crouch * 0.08;
    for (const f of fang) f.rotation.x = (alerted ? 0.35 : 0.1) * (f.position.z > 0 ? 1 : -1);
    root.scale.set(1 + squash * 0.5, Math.max(0.04, 1 - squash * 0.96), 1 + squash * 0.5);
  }
  update(0, 0, 0, false, {});
  return { root, update };
}

// Bærer-maur: som en maur, men olivengrønn og med en stor, gyllen smule på ryggen (forsvinner når den er knust og slipper smula).
export function buildCarrier({ color = 0x5f6b2a } = {}) {
  const a = buildAnt({ color }), crumb = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xf0c060, roughness: 0.9, flatShading: true });
  const big = mesh(new THREE.DodecahedronGeometry(0.5, 0), mat); big.scale.set(1.1, 0.85, 1); crumb.add(big);
  const bit = mesh(new THREE.DodecahedronGeometry(0.2, 0), mat); bit.position.set(0.3, -0.25, 0.3); crumb.add(bit);
  crumb.position.set(-0.45, 1.35, 0); a.root.add(crumb);
  return { root: a.root, crumb, update(phase, speed, squash, alerted, t = {}) { a.update(phase, speed, squash, alerted); crumb.visible = t.carry !== false; } };
}

// Smula som ligger igjen etter en bærer-maur (gyllen, ligger og vipper litt).
export function buildDropCrumb() {
  const g = new THREE.Group(), mat = new THREE.MeshStandardMaterial({ color: 0xf5c55a, roughness: 0.6, emissive: 0x5a3c00, flatShading: true });
  const m = mesh(new THREE.DodecahedronGeometry(0.4, 0), mat); m.scale.set(1.2, 0.85, 1); g.add(m);
  return g;
}
