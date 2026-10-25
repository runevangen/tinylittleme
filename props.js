// Former for ting som ikke er firkanter: do, badekar … Kollisjonen i fysikken er fortsatt bokser;
// dette er bare utseendet. Brettet gir hver boks `kind` og evt. `group`; boksene i en gruppe tegnes som ÉN ting.
import * as THREE from 'three';

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

const BUILDERS = [
  [(ms) => ms.some((m) => m.kind === 'toilet_tank'), toilet],
  [(ms) => ms.every((m) => m.kind === 'tub'), tub],
];
// Tegn en gruppe bokser som én ting. Returnerer et Object3D, eller null hvis gruppen ikke har noen egen form (da tegnes boksene som vanlig).
export function buildGroup(members) {
  for (const [test, fn] of BUILDERS) if (test(members)) return fn(members);
  return null;
}
