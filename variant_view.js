// Nivå 4–6 som egne rom (R12): tegner og styrer stemning, hjelmlykt, rekvisitter og vri (vann, lys, tog) fra `variant` i brettet.
// Logikken (tider, nivåer, blanding) ligger i variant.js og testes der. Bare utseende, unntatt vading (tregere og mister krefter i vann).
import * as THREE from 'three';
import { moodAt, waterLevel, waterPhase, isWading, WADE, lightLevel, lightsPhase } from './variant.js';

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o });
const mesh = (geo, mat, shadow = true) => { const m = new THREE.Mesh(geo, mat); m.castShadow = shadow; m.receiveShadow = true; return m; };
const hexOf = (h) => (typeof h === 'number' ? h : parseInt(String(h).replace('#', ''), 16));

// Leketog (maur med skin 'train'): rødt lokomotiv med blå kjel og en gul vogn. Ser mot +x (som maurene), ca. 1,9 enheter langt.
export function buildTrain() {
  const root = new THREE.Group(), wheels = [];
  const red = std(0xd8352c, { roughness: 0.35 }), blue = std(0x2f6fd0, { roughness: 0.35 }), yel = std(0xf2c230, { roughness: 0.4 }), dark = std(0x2a2a30), wood = std(0xb8884a, { roughness: 0.8 });
  const loco = new THREE.Group(); loco.position.x = 0.45;
  const base = mesh(new THREE.BoxGeometry(1.1, 0.28, 0.78), dark); base.position.y = 0.3; loco.add(base);
  const boiler = mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.7, 14), blue); boiler.rotation.z = Math.PI / 2; boiler.position.set(0.18, 0.66, 0); loco.add(boiler);
  const cab = mesh(new THREE.BoxGeometry(0.4, 0.62, 0.7), red); cab.position.set(-0.36, 0.72, 0); loco.add(cab);
  const roof = mesh(new THREE.BoxGeometry(0.5, 0.08, 0.8), yel); roof.position.set(-0.36, 1.07, 0); loco.add(roof);
  const chim = mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.3, 10), red); chim.position.set(0.42, 1.04, 0); loco.add(chim);
  const lamp = mesh(new THREE.SphereGeometry(0.1, 10, 8), std(0xfff3b0, { emissive: 0xffd860, emissiveIntensity: 0.9 }), false); lamp.position.set(0.56, 0.7, 0); loco.add(lamp);
  root.add(loco);
  const wag = new THREE.Group(); wag.position.x = -0.62;
  const wb = mesh(new THREE.BoxGeometry(0.7, 0.3, 0.7), wood); wb.position.y = 0.55; wag.add(wb);
  const load = mesh(new THREE.BoxGeometry(0.46, 0.3, 0.5), yel); load.position.y = 0.85; wag.add(load);
  const hook = mesh(new THREE.BoxGeometry(0.3, 0.06, 0.06), dark); hook.position.set(0.5, 0.45, 0); wag.add(hook); root.add(wag);
  for (const [x, z, r] of [[0.7, 0.4, 0.2], [0.7, -0.4, 0.2], [0.2, 0.4, 0.2], [0.2, -0.4, 0.2], [-0.45, 0.38, 0.17], [-0.45, -0.38, 0.17], [-0.8, 0.38, 0.17], [-0.8, -0.38, 0.17]]) {
    const w = mesh(new THREE.CylinderGeometry(r, r, 0.1, 14), yel); w.rotation.x = Math.PI / 2; w.position.set(x, r, z); root.add(w); wheels.push(w);
  }
  return { root, update(phase, speed, squash) { for (const w of wheels) w.rotation.y = -phase * 0.9; root.scale.set(1 + squash * 0.3, 1 - squash * 0.85, 1 + squash * 0.3); } };
}

function buildRug(p, y) {
  const g = new THREE.Group(), base = hexOf(p.color || '#c44'), str = hexOf(p.stripe || '#fff');
  const layers = p.shape === 'round'
    ? [[1, base], [0.8, str], [0.66, base], [0.32, str], [0.22, base]].map(([k, c], i) => [new THREE.CylinderGeometry(p.w / 2 * k, p.w / 2 * k, 0.1, 40), c, i])
    : [[1, 1, base], [0.94, 0.7, str], [0.88, 0.4, base]].map(([kx, kz, c], i) => [new THREE.BoxGeometry(p.w * (kx === 1 ? 1 : kx), 0.1, p.d * (kz === 1 ? 1 : kz > 0.5 ? 0.82 : 0.58)), c, i]);
  for (const [geo, c, i] of layers) { const m = mesh(geo, std(c, { roughness: 1 }), false); m.position.y = y + 0.05 + i * 0.012; g.add(m); }
  g.position.x = p.x; g.position.z = p.z; if (p.rot) g.rotation.y = p.rot;
  return g;
}
function buildTrack(p, y) {
  const g = new THREE.Group(), dx = p.to[0] - p.from[0], dz = p.to[1] - p.from[1], len = Math.hypot(dx, dz), rail = std(0x8a8f99, { metalness: 0.8, roughness: 0.3 });
  for (const s of [-0.5, 0.5]) { const r = mesh(new THREE.BoxGeometry(len, 0.1, 0.1), rail, false); r.position.set(0, y + 0.18, s); g.add(r); }
  const n = Math.floor(len / 0.85), sl = new THREE.InstancedMesh(new THREE.BoxGeometry(0.28, 0.1, 1.5), std(0x6b4a2a, { roughness: 0.9 }), n), d = new THREE.Object3D();
  sl.receiveShadow = true;
  for (let i = 0; i < n; i++) { d.position.set(-len / 2 + (i + 0.5) * (len / n), y + 0.08, 0); d.updateMatrix(); sl.setMatrixAt(i, d.matrix); }
  g.add(sl); g.position.set((p.from[0] + p.to[0]) / 2, 0, (p.from[1] + p.to[1]) / 2); g.rotation.y = -Math.atan2(dz, dx);
  return g;
}
function buildDuck(p) {
  const g = new THREE.Group(), r = p.r || 1.8, yel = std(0xffd23a, { roughness: 0.3 }), org = std(0xff8a1e, { roughness: 0.4 });
  const ring = mesh(new THREE.TorusGeometry(r * 1.55, r * 0.34, 12, 28), std(0xf0f4ff, { roughness: 0.3 })); ring.rotation.x = Math.PI / 2; ring.position.y = r * 0.15; g.add(ring);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2, s = mesh(new THREE.SphereGeometry(r * 0.35, 10, 8), std(i % 2 ? 0xe8433a : 0x3a7be0, { roughness: 0.3 })); s.scale.set(1.02, 1.02, 1.02); s.position.set(Math.cos(a) * r * 1.55, r * 0.15, Math.sin(a) * r * 1.55); g.add(s); }
  const body = mesh(new THREE.SphereGeometry(r * 0.8, 20, 14), yel); body.scale.set(1.15, 0.8, 0.95); body.position.y = r * 0.65; g.add(body);
  const head = mesh(new THREE.SphereGeometry(r * 0.46, 16, 12), yel); head.position.set(r * 0.62, r * 1.3, 0); g.add(head);
  const beak = mesh(new THREE.BoxGeometry(r * 0.4, r * 0.12, r * 0.34), org); beak.position.set(r * 1.05, r * 1.25, 0); g.add(beak);
  for (const s of [-1, 1]) { const e = mesh(new THREE.SphereGeometry(r * 0.07, 8, 6), std(0x1a1a22), false); e.position.set(r * 0.88, r * 1.45, s * r * 0.2); g.add(e); }
  const tail = mesh(new THREE.ConeGeometry(r * 0.25, r * 0.5, 10), yel); tail.rotation.z = Math.PI / 2 + 0.5; tail.position.set(-r * 0.9, r * 0.85, 0); g.add(tail);
  g.position.set(p.x, 0, p.z); return g;
}
function buildStars(p, room) {
  const n = p.count || 40, pos = [], c = document.createElement('canvas'); c.width = c.height = 32;
  const cx = c.getContext('2d'), gr = cx.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,248,200,1)'); gr.addColorStop(0.3, 'rgba(255,230,150,0.7)'); gr.addColorStop(1, 'rgba(255,220,120,0)'); cx.fillStyle = gr; cx.fillRect(0, 0, 32, 32);
  let s = 12345; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < n; i++) {
    const wall = i % 4, u = rnd(), y = 16 + rnd() * 26, off = 0.25;
    pos.push(...(wall === 0 ? [room.x0 + u * (room.x1 - room.x0), y, room.z0 + off] : wall === 1 ? [room.x0 + u * (room.x1 - room.x0), y, room.z1 - off] : wall === 2 ? [room.x0 + off, y, room.z0 + u * (room.z1 - room.z0)] : [room.x1 - off, y, room.z0 + u * (room.z1 - room.z0)]));
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ size: 1.6, map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, opacity: 0 });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; return pts;
}

// Hovedinngang. opts: { moods(), twists(), lamp(), say(key), logEv(type, tekst), P }. Uten `variant` i brettet gjør alt ingenting.
export function makeVariant({ scene, LEVEL, renderer, sun, floorY = 0, opts = {} }) {
  const V = LEVEL.variant;
  const off = { active: false, raysFactor: 1, beforeStep() {}, afterStep() {}, update() {}, info: () => null };
  if (!V) return off;
  const moodsOn = opts.moods || (() => true), twistsOn = opts.twists || (() => true), lampOpt = opts.lamp || (() => 1), say = opts.say || (() => ''), logEv = opts.logEv || (() => {});
  const room = LEVEL.room, group = new THREE.Group(); scene.add(group);
  let vt = 0, wadeSaved = null, phase = null, waterNow = 0, wading = false, lightNow = 1, starsMat = null, prevWading = false;

  // grunnverdier (fra grade.js og main.js) som stemningen blander fra
  const hemi = scene.children.find((o) => o.isHemisphereLight), dirs = scene.children.filter((o) => o.isDirectionalLight && o !== sun);
  const base = { exp: renderer.toneMappingExposure, env: scene.environmentIntensity, sun: sun.intensity, sunC: sun.color.clone(), bg: scene.background?.clone?.(), fog: scene.fog?.color.clone(),
    hemi: hemi?.intensity ?? 0, hemiSky: hemi?.color.clone(), hemiGround: hemi?.groundColor.clone(), dirs: dirs.map((d) => d.intensity) };
  const wins = []; scene.traverse((o) => { if (o.userData?.win && o.material?.color) wins.push({ m: o.material, c: o.material.color.clone() }); });
  const tmp = new THREE.Color(), tmp2 = new THREE.Color();

  // hjelmlykt: kjegle av lys foran figuren, og en svak lysstripe i lufta
  const lampL = new THREE.SpotLight(0xfff0cc, 0, 0, 0.5, 0.75, 1); lampL.castShadow = false; scene.add(lampL, lampL.target);
  const LEN = 13, coneGeo = new THREE.ConeGeometry(Math.tan(0.5) * LEN, LEN, 24, 1, true).translate(0, -LEN / 2, 0).rotateX(-Math.PI / 2);
  { const pos = coneGeo.attributes.position, col = []; for (let i = 0; i < pos.count; i++) { const k = Math.max(0, 1 - pos.getZ(i) / LEN); col.push(k, k, k); } coneGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); }   // lysner mot enden
  const cone = new THREE.Mesh(coneGeo, new THREE.MeshBasicMaterial({ color: 0xfff0c8, vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  cone.frustumCulled = false; cone.visible = false; scene.add(cone);
  const dirF = { x: 0, z: 1 };

  // rekvisitter
  const ducks = [];
  for (const p of V.props || []) {
    if (p.type === 'rug') group.add(buildRug(p, floorY));
    else if (p.type === 'track') group.add(buildTrack(p, floorY));
    else if (p.type === 'duck') { const d = buildDuck(p); group.add(d); ducks.push(d); }
    else if (p.type === 'stars') { const s = buildStars(p, room); starsMat = s.material; group.add(s); }
  }
  // vann
  let water = null;
  if (V.twist?.type === 'water') {
    const w = room.x1 - room.x0, d = room.z1 - room.z0;
    water = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshPhysicalMaterial({ color: 0x4fb8e0, transparent: true, opacity: 0.55, roughness: 0.05, metalness: 0.1, depthWrite: false }));
    water.rotation.x = -Math.PI / 2; water.position.set((room.x0 + room.x1) / 2, floorY, (room.z0 + room.z1) / 2); water.renderOrder = 2; water.visible = false; group.add(water);
  }

  const api = {
    active: true, raysFactor: 1, mood: V.mood, twist: V.twist?.type, waterMesh: water,
    get time() { return vt; }, get water() { return waterNow; }, get wading() { return wading; }, get light() { return lightNow; },
    // før fysikken: vannet gjør figuren treg og sliten (bare mens du går i det)
    beforeStep(p, dt, active = true) {
      if (!active) return;
      vt += dt;
      if (V.twist?.type === 'water' && twistsOn()) {
        waterNow = waterLevel(vt, V.twist);
        wading = isWading(p.y, floorY, waterNow) && !['climb', 'hang', 'mantle', 'zip', 'swing'].includes(p.state);
        if (wading && opts.P) { wadeSaved = opts.P.speed; opts.P.speed = wadeSaved * WADE.speed; p.stam = Math.max(0, p.stam - WADE.drain * dt); }
        if (wading !== prevWading) { prevWading = wading; logEv('vri', wading ? 'vader' : 'tørr'); }
        const ph = waterPhase(vt, V.twist); if (ph !== phase) { phase = ph; if (ph === 'stiger') { say('var.water.up'); logEv('vri', 'vannet stiger'); } else if (ph === 'tørr') logEv('vri', 'vannet er borte'); }
      } else { waterNow = 0; wading = false; }
      if (V.twist?.type === 'lights' && twistsOn()) {
        const ph = lightsPhase(vt, V.twist); if (ph !== phase) { phase = ph; say(ph === 'mørkt' ? 'var.lights.off' : 'var.lights.on'); logEv('vri', ph === 'mørkt' ? 'lyset slukket' : 'lyset tent'); }
      }
    },
    afterStep() { if (wadeSaved !== null && opts.P) { opts.P.speed = wadeSaved; wadeSaved = null; } },
    // hvert bilde: stemning, lommelykt, vann, rekvisitter
    update(now, dt, p, mode = 'play') {
      const m = moodAt(V, vt, { moods: moodsOn(), twists: twistsOn() }), w = m.w, L = (a, b) => a + (b - a) * w;
      lightNow = V.twist?.type === 'lights' && twistsOn() ? lightLevel(vt, V.twist) : 1;
      renderer.toneMappingExposure = base.exp * L(1, m.expMul);
      scene.environmentIntensity = base.env * L(1, m.envMul);
      sun.intensity = base.sun * L(1, m.sunMul); if (m.sunColor !== null) sun.color.copy(base.sunC).lerp(tmp.setHex(m.sunColor), w); else sun.color.copy(base.sunC);
      if (hemi) { hemi.intensity = base.hemi * L(1, m.hemiMul); if (m.hemiSky !== null) { hemi.color.copy(base.hemiSky).lerp(tmp.setHex(m.hemiSky), w); hemi.groundColor.copy(base.hemiGround).lerp(tmp2.setHex(m.hemiGround), w); } }
      dirs.forEach((d, i) => { d.intensity = base.dirs[i] * L(1, m.fill); });
      if (base.bg) { scene.background.copy(base.bg).lerp(tmp.setHex(m.bg), w); }
      if (base.fog) { scene.fog.color.copy(base.fog).lerp(tmp.setHex(m.bg), w); }
      for (const x of wins) x.m.color.copy(x.c).lerp(tmp.setHex(m.win), w);
      api.raysFactor = L(1, m.rays);
      if (starsMat) starsMat.opacity = Math.max(0, m.lamp * w) * (0.75 + 0.25 * Math.sin(now * 1.7));
      // hjelmlykt (kjegle foran figuren)
      const on = m.lamp * w * lampOpt();
      if (p) {
        const fx = p.fx ?? 0, fz = p.fz ?? 1; dirF.x += (fx - dirF.x) * Math.min(1, dt * 8); dirF.z += (fz - dirF.z) * Math.min(1, dt * 8);
        const l = Math.hypot(dirF.x, dirF.z) || 1, ux = dirF.x / l, uz = dirF.z / l, hy = p.y + 0.95;
        lampL.position.set(p.x + ux * 0.25, hy, p.z + uz * 0.25); lampL.target.position.set(p.x + ux * 9, hy - 2.4, p.z + uz * 9);
        cone.position.copy(lampL.position); cone.lookAt(lampL.target.position);
      }
      lampL.intensity = 80 * on; lampL.visible = on > 0.01;
      cone.visible = on > 0.01 && mode !== 'plan'; cone.material.opacity = 0.16 * on;
      // vann og anda
      if (water) { water.visible = waterNow > 0.02; water.position.y = floorY + waterNow + Math.sin(now * 1.3) * 0.03; water.material.opacity = 0.5 + 0.08 * Math.sin(now * 0.9); }
      for (const d of ducks) { const lvl = Math.max(0, waterNow); d.position.y = floorY + lvl + (lvl > 0.05 ? Math.sin(now * 1.6 + d.position.x) * 0.06 : 0); d.rotation.y = lvl > 0.05 ? now * 0.15 : 0; }
    },
    info: () => ({ mood: V.mood, twist: V.twist?.type, t: +vt.toFixed(1), water: +waterNow.toFixed(2), light: lightNow, wading }),
  };
  return api;
}
