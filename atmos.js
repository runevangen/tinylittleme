// Atmosfære (R4): lysstråler fra vinduet, mørkere hjørner/kontaktskygger og småting (smuler, knapper, hår) for målestokk.
// Bare utseende, ingen kollisjon. Tre grupper som main.js slår av/på: rays, ao, clutter. Logikken ligger i atmos_logic.js.
import * as THREE from 'three';
import { beamPlan, pickSpots, hashStr, avoidZones } from './atmos_logic.js';

const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const sm = (t) => t * t * (3 - 2 * t);
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

export function makeAtmos({ scene, LEVEL, floorY, sun, look, name = 'x' }) {
  const room = LEVEL.room, groups = { rays: new THREE.Group(), ao: new THREE.Group(), clutter: new THREE.Group() };
  scene.add(groups.rays, groups.ao, groups.clutter);

  // ---------- lysstråler: myke striper fra hvert vindu ned mot gulvet, med lyst felt der de lander og støvkorn i strålen ----------
  const beamTex = (() => {                                      // u = langs vinduets høyde (myk kant), v = langs strålen (sterkest ved vinduet, forsvinner mot gulvet)
    const W = 16, H = 64, c = cv(W, H), g = c.getContext('2d'), img = g.createImageData(W, H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const u = x / (W - 1), v = 1 - y / (H - 1), edge = sm(Math.min(1, Math.min(u, 1 - u) / 0.3)), along = sm(Math.min(1, v / 0.06)) * Math.pow(1 - v, 0.7);
      const i = (y * W + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = 255; img.data[i + 3] = 255 * edge * along;
    }
    g.putImageData(img, 0, 0); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const patchTex = (() => {
    const S = 64, c = cv(S, S), g = c.getContext('2d'), img = g.createImageData(S, S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const i = (y * S + x) * 4, e = sm(Math.min(1, Math.min(x, S - 1 - x, y, S - 1 - y) / (S * 0.3))); img.data[i] = img.data[i + 1] = img.data[i + 2] = 255; img.data[i + 3] = 255 * e; }
    g.putImageData(img, 0, 0); return new THREE.CanvasTexture(c);
  })();
  const beamMats = [], motes = [];
  const quad = (p0, p1, p2, p3) => {                            // p0,p1 = to punkter ved vinduet (u 0→1), p2,p3 = samme to ved enden; uv: x = u, y = langs strålen
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([...p0, ...p1, ...p2, ...p3], 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 1, 1, 0, 0, 1, 0], 2)); geo.setIndex([0, 1, 3, 0, 3, 2]); return geo;
  };
  for (const win of LEVEL.windows || []) {
    const plan = beamPlan(win, room, sun, floorY, 5, LEVEL.boxes || []); if (!plan) continue;
    plan.slabs.forEach((s, i) => {
      const mat = new THREE.MeshBasicMaterial({ map: beamTex, color: 0xffb640, transparent: true, opacity: 0.36, blending: THREE.NormalBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
      mat.userData.base = 0.34 + (i % 2) * 0.1; mat.userData.mid = lerp3(lerp3(s.a, s.b, 0.5), lerp3(s.a2, s.b2, 0.5), 0.5); mat.userData.ph = i * 1.7; beamMats.push(mat);
      const m = new THREE.Mesh(quad(s.a, s.b, s.a2, s.b2), mat); m.renderOrder = 3; m.frustumCulled = false; groups.rays.add(m);
    });
    if (plan.patch) {
    const pm = new THREE.MeshBasicMaterial({ map: patchTex, color: 0xffc04a, transparent: true, opacity: 0.55, blending: THREE.NormalBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    pm.userData.base = 0.55; pm.userData.ph = 0.5; beamMats.push(pm);
    const pg = new THREE.BufferGeometry(), P = plan.patch, pi = [];
    pg.setAttribute('position', new THREE.Float32BufferAttribute(P.flatMap((c) => c.q.flat()), 3)); pg.setAttribute('uv', new THREE.Float32BufferAttribute(P.flatMap((c) => c.uv.flat()), 2));
    P.forEach((_, k) => pi.push(k * 4, k * 4 + 1, k * 4 + 2, k * 4, k * 4 + 2, k * 4 + 3)); pg.setIndex(pi);
    const pmesh = new THREE.Mesh(pg, pm); pmesh.renderOrder = 2; pmesh.frustumCulled = false; groups.rays.add(pmesh);
    }
    // støvkorn som svever i strålene
    const n = plan.slabs.length ? 36 : 0, pos = new Float32Array(n * 3), seed = [], dot = cv(32, 32), dg = dot.getContext('2d'), rg = dg.createRadialGradient(16, 16, 0, 16, 16, 16);
    rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.5, 'rgba(255,255,255,.3)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); dg.fillStyle = rg; dg.fillRect(0, 0, 32, 32);
    for (let i = 0; i < n; i++) seed.push({ s: (i * 0.618) % 1, k: ((i * 0.37 + 0.11) % 1), ph: i * 2.3, sl: plan.slabs[i % plan.slabs.length] });
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ map: new THREE.CanvasTexture(dot), color: 0xfff0cc, size: 0.22, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending }));
    pts.frustumCulled = false; pts.renderOrder = 4; groups.rays.add(pts); motes.push({ geo, seed, n });
  }

  // ---------- mørkere hjørner: vegg mot vegg og vegg mot tak, pluss kontaktskygge under møbler som står på noe ----------
  const gradTex = (() => { const c = cv(4, 64), g = c.getContext('2d'), lg = g.createLinearGradient(0, 0, 0, 64); lg.addColorStop(0, 'rgba(0,0,0,1)'); lg.addColorStop(0.35, 'rgba(0,0,0,.55)'); lg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = lg; g.fillRect(0, 0, 4, 64); return new THREE.CanvasTexture(c); })();
  const shadeMat = (op) => new THREE.MeshBasicMaterial({ map: gradTex, color: 0x120a04, transparent: true, opacity: op, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const strip = (len, w, n, up, pos, op) => {                    // flate mot en vegg med normal n; «mørk side» (+y på flaten) peker mot up
    const x = new THREE.Vector3().crossVectors(up, n).normalize(), m = new THREE.Mesh(new THREE.PlaneGeometry(len, w), shadeMat(op));
    m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, up, n)); m.position.copy(pos); m.renderOrder = 1; groups.ao.add(m);
  };
  {
    const H = room.height, up = new THREE.Vector3(0, 1, 0), cw = Math.min(5, (room.x1 - room.x0) * 0.12), tw = 7, e = 0.04;
    const walls = [   // [normal inn, midtpunkt-x, midtpunkt-z, lengde langs veggen, retning langs veggen]
      [new THREE.Vector3(0, 0, 1), (room.x0 + room.x1) / 2, room.z0 + e, room.x1 - room.x0, new THREE.Vector3(1, 0, 0)],
      [new THREE.Vector3(0, 0, -1), (room.x0 + room.x1) / 2, room.z1 - e, room.x1 - room.x0, new THREE.Vector3(-1, 0, 0)],
      [new THREE.Vector3(1, 0, 0), room.x0 + e, (room.z0 + room.z1) / 2, room.z1 - room.z0, new THREE.Vector3(0, 0, -1)],
      [new THREE.Vector3(-1, 0, 0), room.x1 - e, (room.z0 + room.z1) / 2, room.z1 - room.z0, new THREE.Vector3(0, 0, 1)],
    ];
    for (const [n, cx, cz, len, along] of walls) {
      strip(len, 4, new THREE.Vector3(0, 1, 0), n.clone().negate(), new THREE.Vector3(cx + n.x * 2, floorY + 0.05, cz + n.z * 2), 0.5);   // mot gulvet langs veggen
      strip(len, tw, n, up, new THREE.Vector3(cx, H - tw / 2, cz), 0.55);                    // mot taket
      for (const sgn of [-1, 1]) {                                                           // mot vegghjørnene (mørk side peker mot hjørnet)
        const toward = along.clone().multiplyScalar(sgn), p = new THREE.Vector3(cx, (H + floorY) / 2, cz).addScaledVector(toward, len / 2 - cw / 2);
        strip(H - floorY, cw, n, toward, p, 0.6);
      }
    }
  }
  for (const b of LEVEL.boxes) {                                  // formede møbler får ikke kontaktskygge i main.js; legg den til her
    if (!b.kind || b.group || b.dyn || b.carried || b.type === 'floor' || b.type === 'wall' || b.type === 'book') continue;
    const sx = b.max[0] - b.min[0], sy = b.max[1] - b.min[1], sz = b.max[2] - b.min[2];
    if (Math.min(sx, sz) <= 0.4 || sy < 0.3) continue;
    if (!LEVEL.boxes.some((c) => c !== b && !c.dyn && Math.abs(c.max[1] - b.min[1]) < 0.05 && c.min[0] < b.max[0] && c.max[0] > b.min[0] && c.min[2] < b.max[2] && c.max[2] > b.min[2])) continue;
    const cs = look.contactShadow(sx, sz, Math.max(0.3, Math.min(0.9, Math.min(sx, sz) * 0.35))); cs.position.set(b.min[0] + sx / 2, b.min[1] + 0.03, b.min[2] + sz / 2); groups.ao.add(cs);
  }

  // ---------- småting: smuler, knapper, hår og små biter på gulv og flater (målestokk, ingen kollisjon) ----------
  {
    const K = 1.0;                                                  // målestokk: figuren er ca. 1,8 enheter høy; småting er mindre enn støvlene, men fortsatt lesbare
    const std = (c, r = 0.9) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
    const G = { crumb: new THREE.DodecahedronGeometry(0.16 * K, 0), pebble: new THREE.IcosahedronGeometry(0.2 * K, 0), button: new THREE.CylinderGeometry(0.24 * K, 0.24 * K, 0.06 * K, 18), hole: new THREE.CylinderGeometry(0.03 * K, 0.03 * K, 0.07 * K, 6),
      chip: new THREE.BoxGeometry(0.4 * K, 0.05 * K, 0.28 * K), pill: new THREE.CapsuleGeometry(0.07 * K, 0.22 * K, 3, 8), clip: new THREE.TorusGeometry(0.16 * K, 0.018 * K, 5, 14), coin: new THREE.CylinderGeometry(0.2 * K, 0.2 * K, 0.035 * K, 16) };
    const hsl = (h, s, l) => new THREE.Color().setHSL(h, s, l);
    const spots = pickSpots(LEVEL.boxes, room, floorY, hashStr(name), 40, avoidZones(LEVEL, floorY));
    const mk = (geo, col, rough) => new THREE.Mesh(geo, std(col, rough));
    for (const s of spots) {
      let o, lift = 0.03 * K;
      if (s.kind === 'crumb') { o = mk(G.crumb, hsl(0.09 + s.h * 0.05, 0.45 + s.a * 0.2, 0.5 + s.c * 0.25)); o.scale.set(s.s * (0.8 + s.a), s.s * 0.5, s.s * (0.7 + s.h * 0.6)); lift = 0.05 * K * s.s; }
      else if (s.kind === 'pebble') { o = mk(G.pebble, hsl(0.07 + s.h * 0.1, 0.1 + s.a * 0.15, 0.35 + s.c * 0.3), 0.8); o.scale.set(s.s * (0.7 + s.a * 0.8), s.s * 0.4, s.s * (0.6 + s.h * 0.6)); lift = 0.05 * K * s.s; }
      else if (s.kind === 'button') { o = new THREE.Group(); o.add(new THREE.Mesh(G.button, std(hsl(s.h, 0.65, 0.5), 0.4)));
        const n = s.a < 0.5 ? 2 : 4, pts = n === 2 ? [[-0.06, 0], [0.06, 0]] : [[-0.06, -0.06], [0.06, -0.06], [-0.06, 0.06], [0.06, 0.06]];
        for (const [hx, hz] of pts) { const h = new THREE.Mesh(G.hole, std(0x222222, 0.6)); h.position.set(hx * K, 0.005 * K, hz * K); o.add(h); } o.scale.setScalar(s.s * 0.9); lift = 0.03 * K * s.s; }
      else if (s.kind === 'chip') { o = mk(G.chip, hsl(s.h, 0.4, 0.75)); o.scale.set(s.s, s.s, s.s * (0.6 + s.a * 0.6)); lift = 0.025 * K * s.s; }
      else if (s.kind === 'pill') { o = mk(G.pill, hsl(s.h, 0.7, 0.6), 0.35); o.rotation.z = Math.PI / 2; o.scale.setScalar(s.s); lift = 0.07 * K * s.s; }
      else if (s.kind === 'clip') { o = mk(G.clip, 0xb8bcc4, 0.3); o.rotation.x = Math.PI / 2; o.scale.set(s.s * 1.3, s.s * 0.7, s.s); lift = 0.02 * K; }
      else if (s.kind === 'coin') { o = mk(G.coin, s.a < 0.5 ? 0xc9a33a : 0xb9bcc0, 0.3); o.scale.setScalar(s.s * 0.9); lift = 0.02 * K; }
      else { const pts = []; for (let i = 0; i < 9; i++) { const t = i / 8; pts.push(new THREE.Vector3((t - 0.5) * 1.1 * K * s.s, 0, Math.sin(t * 5 + s.c * 6) * 0.16 * K * s.s)); }
        o = mk(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.014 * K, 4), s.a < 0.3 ? 0xb88a4a : 0x2b1d14, 0.7); lift = 0.02 * K; }
      o.position.set(s.x, s.y + lift, s.z); o.rotation.y = s.rot;
      o.castShadow = false; o.receiveShadow = true; o.userData.noDetail = true; groups.clutter.add(o);
    }
  }

  return {
    groups, count: { spots: groups.clutter.children.length, beams: beamMats.length },
    update(sec, { rays = true, ao = true, clutter = true, plan = false, cam = null } = {}) {
      groups.rays.visible = rays && !plan; groups.ao.visible = ao; groups.clutter.visible = clutter;
      if (!groups.rays.visible) return;
      for (const m of beamMats) { const mid = m.userData.mid, near = cam && mid ? sm(Math.max(0, Math.min(1, (Math.hypot(cam.x - mid[0], cam.y - mid[1], cam.z - mid[2]) - 5) / 14))) : 1;   // tones ut når kameraet er inni strålen, så bildet ikke blir utvasket
        m.opacity = m.userData.base * near * (0.9 + 0.1 * Math.sin(sec * 0.4 + m.userData.ph)); }          // rolig, ikke flimmer
      for (const { geo, seed, n } of motes) {
        const a = geo.attributes.position.array;
        for (let i = 0; i < n; i++) { const d = seed[i], t = (d.s + sec * 0.012 + i * 0.01) % 1, top = lerp3(d.sl.a, d.sl.b, d.k), bot = lerp3(d.sl.a2, d.sl.b2, d.k), p = lerp3(top, bot, Math.min(0.95, t * 0.9));
          a[i * 3] = p[0] + Math.sin(sec * 0.3 + d.ph) * 0.4; a[i * 3 + 1] = p[1] + Math.sin(sec * 0.4 + d.ph * 1.3) * 0.25; a[i * 3 + 2] = p[2] + Math.cos(sec * 0.25 + d.ph) * 0.4; }
        geo.attributes.position.needsUpdate = true;
      }
    },
  };
}
