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


// ---------- teksturer (tegnes i nettleseren, ingen bildefiler) ----------
function rng(seed) { let a = seed; return () => { a = (a * 1664525 + 1013904223) % 4294967296; return a / 4294967296; }; }
function canvasTex(size, draw, { repeat = [1, 1], srgb = true } = {}) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); t.anisotropy = 4;
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
  for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) { const v = (i + j) % 2 ? 235 : 150; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(i * 8 + 1, j * 8 + 1, 6, 6); }
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
const stripeTex = (c1, c2) => canvasTex(128, (g, S) => { g.fillStyle = c1; g.fillRect(0, 0, S, S); g.fillStyle = c2; g.fillRect(0, S * 0.08, S, S * 0.07); g.fillRect(0, S * 0.85, S, S * 0.07); });

const hexStr = (c) => '#' + (typeof c === 'number' ? c : parseInt(String(c).replace('#', ''), 16)).toString(16).padStart(6, '0');
const plasticMat = (color) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.28, clearcoat: 0.6, clearcoatRoughness: 0.2 });
const bar = (a, b, r, mat) => {                                         // tynn stang mellom to punkter
  const d = new THREE.Vector3().subVectors(b, a), m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 6), mat);
  m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); m.castShadow = true; return m;
};
const lathe = (pts, seg = 28) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(Math.max(0.0005, r), y)), seg);

// ---------- enkeltting: bygges rundt midten av boksen (sx, sy, sz) ----------
const SINGLE = {
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
  mirror(sx, sy, sz) {
    const g = new THREE.Group(), cr = chrome(), f = 0.35;
    g.add(mesh(new THREE.BoxGeometry(sx - 0.2, sy - 0.2, 0.1), new THREE.MeshStandardMaterial({ color: 0xdfe9ee, metalness: 0.85, roughness: 0.04, emissive: 0x6d7f88, emissiveIntensity: 0.35 }), false));
    for (const [x, y, w, h] of [[0, sy / 2, sx + f, f], [0, -sy / 2, sx + f, f], [-sx / 2, 0, f, sy], [sx / 2, 0, f, sy]]) { const b = mesh(new THREE.BoxGeometry(w, h, sz + 0.25), cr); b.position.set(x, y, 0); g.add(b); }
    return g;
  },
};
// ting fra scene: bruk det vi har (kind, ellers materialet). Returnerer en gruppe sentrert i boksen, eller null.
export function buildSingle(kind, size, opts = {}) {
  const fn = SINGLE[kind]; if (!fn) return null;
  const [sx, sy, sz] = size, o = { color: opts.color ?? 0xcccccc, id: opts.id || '', material: opts.material };
  const g = fn(sx, sy, sz, o); return g;
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
