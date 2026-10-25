import * as THREE from 'three';
import { RoomEnvironment } from './lib/RoomEnvironment.js';
import { P, PRESETS, applyPreset, newPlayer, resetPlayer, step, freeAt } from './physics.js';
import { LEVEL } from './level.js';

const $ = (id) => document.getElementById(id);
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* privat modus e.l. */ } },
};

// ---------- poeng ----------
const SCORE = { start: 1000, save: 25, respawn: 10, perTenSeconds: 2 };

// ---------- renderer / scene ----------
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xcbbfae);
scene.fog = new THREE.Fog(0xcbbfae, 55, 150);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;

const camera = new THREE.PerspectiveCamera(55, 1, 0.05, 400);

const sun = new THREE.DirectionalLight(0xffe7c2, 3.0);
sun.castShadow = true;
const bigShadow = Math.min(renderer.capabilities.maxTextureSize, 4096);
sun.shadow.mapSize.set(devicePixelRatio > 2 || innerWidth < 700 ? 2048 : bigShadow, devicePixelRatio > 2 || innerWidth < 700 ? 2048 : bigShadow);
Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 220 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
scene.add(sun, sun.target);
scene.add(new THREE.HemisphereLight(0xfff4e0, 0x9b8468, 0.35));

// ---------- prosedyre-teksturer ----------
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function canvasTex(size, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return t;
}
function grain(g, S, r, lines, rgb) {
  for (let i = 0; i < lines; i++) {
    const y = r() * S;
    g.strokeStyle = `rgba(${rgb},${0.04 + r() * 0.13})`;
    g.lineWidth = 0.6 + r() * 1.8;
    g.beginPath(); let yy = y; g.moveTo(0, yy);
    for (let x = 0; x <= S; x += 16) { yy += (r() - 0.5) * 2.2 + Math.sin(x * 0.02 + y) * 0.4; g.lineTo(x, yy); }
    g.stroke();
  }
}
const woodTex = canvasTex(512, (g, S) => {
  const r = rng(7);
  g.fillStyle = '#ebe5dc'; g.fillRect(0, 0, S, S);
  grain(g, S, r, 260, '90,60,30');
  for (let k = 0; k < 3; k++) {
    const x = r() * S, y = r() * S, gr = g.createRadialGradient(x, y, 1, x, y, 20);
    gr.addColorStop(0, 'rgba(80,50,25,.45)'); gr.addColorStop(1, 'rgba(80,50,25,0)');
    g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, 32, 12, 0, 0, 7); g.fill();
  }
});
const floorTex = canvasTex(1024, (g, S) => {
  const r = rng(21), n = 6, h = S / n;
  for (let i = 0; i < n; i++) {
    const t = 0.82 + r() * 0.18;
    g.fillStyle = `rgb(${Math.round(222 * t)},${Math.round(176 * t)},${Math.round(122 * t)})`;
    g.fillRect(0, i * h, S, h);
    g.save(); g.beginPath(); g.rect(0, i * h, S, h); g.clip();
    g.translate(0, i * h); grain(g, S, r, 40, '110,70,35'); g.restore();
    g.fillStyle = 'rgba(60,35,15,.55)'; g.fillRect(0, i * h, S, 3);                // lang skjøt
    const sx = r() * S; g.fillRect(sx, i * h, 3, h);                                // kort skjøt
  }
});
const pagesTex = canvasTex(128, (g, S) => {
  g.fillStyle = '#efe6cf'; g.fillRect(0, 0, S, S);
  for (let y = 0; y < S; y += 3) { g.fillStyle = `rgba(120,100,70,${0.12 + (y % 6) * 0.03})`; g.fillRect(0, y, S, 1); }
});
const plasterTex = canvasTex(256, (g, S) => {
  const r = rng(3); g.fillStyle = '#f2ece0'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(120,100,80,${r() * 0.05})`; g.fillRect(r() * S, r() * S, 2, 2); }
});

// ---------- brettet ----------
function material(b) {
  const col = b.color ?? 0xcccccc;
  switch (b.type) {
    case 'floor': { const m = new THREE.MeshStandardMaterial({ map: floorTex.clone(), roughness: 0.5, metalness: 0 }); m.map.needsUpdate = true; return m; }
    case 'wood': return new THREE.MeshStandardMaterial({ map: woodTex, color: col, roughness: 0.55 });
    case 'book': return new THREE.MeshStandardMaterial({ color: col, roughness: 0.78 });
    case 'plastic': return new THREE.MeshStandardMaterial({ color: col, roughness: 0.3, metalness: 0.15 });
    case 'wall': return new THREE.MeshStandardMaterial({ map: plasterTex, color: col, roughness: 0.95 });
    default: return new THREE.MeshStandardMaterial({ color: col, roughness: 0.7 });
  }
}
const pageMat = new THREE.MeshStandardMaterial({ map: pagesTex, roughness: 0.9 });

for (const b of LEVEL.boxes) {
  const sx = b.max[0] - b.min[0], sy = b.max[1] - b.min[1], sz = b.max[2] - b.min[2];
  const cx = b.min[0] + sx / 2, cy = b.min[1] + sy / 2, cz = b.min[2] + sz / 2;
  const mat = material(b);
  if (b.type === 'floor') mat.map.repeat.set(sx / 18, sz / 18);
  else if (b.type === 'wood') { mat.map = woodTex.clone(); mat.map.needsUpdate = true; mat.map.repeat.set(Math.max(1, Math.max(sx, sz) / 8), Math.max(1, sy / 8)); }
  else if (b.type === 'wall') { mat.map = plasterTex.clone(); mat.map.needsUpdate = true; mat.map.repeat.set(Math.max(sx, sz) / 10, 8); }
  const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
  m.position.set(cx, cy, cz);
  m.castShadow = b.type !== 'floor' && b.type !== 'wall'; m.receiveShadow = true;
  scene.add(m);

  if (b.type === 'book' && sy > 1 && Math.min(sx, sz) > 1.5) {
    // liggende bok: sider synlige på tre sider, rygg mot -x
    const pm = new THREE.Mesh(new THREE.BoxGeometry(sx - 0.3, Math.max(0.2, sy - 0.24), sz + 0.04), pageMat);
    pm.position.set(cx + 0.17, cy, cz); pm.castShadow = false; pm.receiveShadow = true; scene.add(pm);
  }
}

// sokkellist rundt rommet
{
  const H = LEVEL.room.half, mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
  for (const [x, z, sx, sz] of [[0, -H + 0.3, 2 * H, 0.6], [0, H - 0.3, 2 * H, 0.6], [-H + 0.3, 0, 0.6, 2 * H], [H - 0.3, 0, 0.6, 2 * H]]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, 3, sz), mat); m.position.set(x, 1.5, z); m.receiveShadow = true; scene.add(m);
  }
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(2 * H, 2 * H), new THREE.MeshStandardMaterial({ color: 0xf5f1e8, roughness: 1 }));
  ceil.rotation.x = Math.PI / 2; ceil.position.y = LEVEL.room.height; scene.add(ceil);
  // vindu på nordveggen: lyset kommer derfra
  const win = new THREE.Mesh(new THREE.PlaneGeometry(26, 34), new THREE.MeshBasicMaterial({ color: 0xfff6e0 }));
  win.position.set(8, 46, -H + 0.05); scene.add(win);
  const frame = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
  for (const [x, y, sx, sy] of [[8, 63.5, 28, 1.5], [8, 28.5, 28, 1.5], [-5.2, 46, 1.5, 36], [21.2, 46, 1.5, 36], [8, 46, 1.2, 34]]) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, 1), frame); f.position.set(x, y, -H + 0.3); scene.add(f);
  }
}

for (const d of LEVEL.decor || []) {
  const geo = d.shape === 'sphere' ? new THREE.SphereGeometry(d.size[0], 16, 12) : new THREE.BoxGeometry(...d.size);
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: d.color, emissive: d.emissive ?? 0x000000, roughness: d.rough ?? 0.5, metalness: d.metal ?? 0 }));
  m.position.set(...d.pos); m.castShadow = true; scene.add(m);
}

// tau
const ropeMat = new THREE.MeshStandardMaterial({ color: 0x3a2f28, roughness: 0.9 });
const Y = new THREE.Vector3(0, 1, 0);
function makeCyl(r) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 8), ropeMat); m.castShadow = true; scene.add(m); return m; }
function setCyl(m, a, b) {
  const d = new THREE.Vector3().subVectors(b, a), len = d.length();
  m.position.copy(a).addScaledVector(d, 0.5); m.scale.set(1, len, 1);
  m.quaternion.setFromUnitVectors(Y, d.normalize());
}
const ropes = LEVEL.ropes.map((r) => {
  const top = makeCyl(0.05), line = makeCyl(0.09);
  setCyl(top, new THREE.Vector3(r.x, LEVEL.room.height, r.z), new THREE.Vector3(r.x, r.y, r.z));
  const end = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 10), new THREE.MeshStandardMaterial({ color: 0xc1121f, roughness: 0.4 }));
  end.castShadow = true; scene.add(end);
  return { r, line, end };
});

// mål: flaske
const goal = new THREE.Group();
const glass = new THREE.MeshPhysicalMaterial({ color: 0x77ffd0, emissive: 0x1fbf90, emissiveIntensity: 0.9, roughness: 0.1, transmission: 0.2, transparent: true, opacity: 0.9 });
goal.add(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.72, 1.1, 20), glass));
const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.3, 0.5, 14), glass); neck.position.y = 0.78; goal.add(neck);
const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.2, 12), new THREE.MeshStandardMaterial({ color: 0xa9774b, roughness: 0.9 })); cork.position.y = 1.12; goal.add(cork);
goal.position.set(...LEVEL.goal); scene.add(goal);
const glow = new THREE.PointLight(0x66ffcc, 30, 14); glow.position.y = 1; goal.add(glow);

// lagringsflagg
const flag = new THREE.Group();
{
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.4, 8), new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.4 }));
  pole.position.y = 0.7;
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.38), new THREE.MeshStandardMaterial({ color: 0xffb703, side: THREE.DoubleSide, roughness: 0.7 }));
  cloth.position.set(0.3, 1.2, 0);
  flag.add(pole, cloth); scene.add(flag);
}

// ---------- figur ----------
function buildHero() {
  const root = new THREE.Group();
  const rig = new THREE.Group(); rig.scale.setScalar(1.07); root.add(rig);
  const M = {
    skin: new THREE.MeshStandardMaterial({ color: 0xe6b392, roughness: 0.65 }),
    shirt: new THREE.MeshStandardMaterial({ color: 0x2f5d7c, roughness: 0.8 }),
    pants: new THREE.MeshStandardMaterial({ color: 0x353b48, roughness: 0.85 }),
    shoe: new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.6 }),
    sole: new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.9 }),
    hair: new THREE.MeshStandardMaterial({ color: 0x3b2a1c, roughness: 0.8 }),
    eye: new THREE.MeshBasicMaterial({ color: 0x151515 }),
  };
  const cap = (r, l, mat) => { const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 6, 12), mat); m.castShadow = true; return m; };
  const limb = (up, lo, r, mat, hand) => {
    const top = new THREE.Group(), u = cap(r, up, mat); u.position.y = -(up / 2 + r * 0.6); top.add(u);
    const mid = new THREE.Group(); mid.position.y = -(up + r * 1.2); top.add(mid);
    const l = cap(r * 0.9, lo, mat); l.position.y = -(lo / 2 + r * 0.6); mid.add(l);
    return { top, mid, end: -(lo + r * 1.2), };
  };

  const body = new THREE.Group(); body.position.y = 0.46; rig.add(body);
  const torso = cap(0.085, 0.2, M.shirt); torso.scale.set(1.25, 1, 0.8); torso.position.y = 0.14; body.add(torso);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.05, 10), M.skin); neck.position.y = 0.285; body.add(neck);
  const head = new THREE.Group(); head.position.y = 0.37; body.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 16), M.skin); skull.castShadow = true; head.add(skull);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.081, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), M.hair); hair.rotation.x = -0.35; hair.position.y = 0.006; head.add(hair);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.01, 8, 8), M.eye); e.position.set(s * 0.028, 0.01, 0.069); head.add(e); }

  const arm = (s) => {
    const a = limb(0.09, 0.09, 0.03, M.shirt); a.top.position.set(s * 0.125, 0.25, 0); body.add(a.top);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 8), M.skin); hand.position.y = a.end - 0.01; a.mid.add(hand);
    return a;
  };
  const leg = (s) => {
    const l = limb(0.15, 0.15, 0.045, M.pants); l.top.position.set(s * 0.055, 0.46, 0); rig.add(l.top);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.045, 0.16), M.shoe); foot.position.set(0, l.end - 0.005, 0.035); foot.castShadow = true; l.mid.add(foot);
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.077, 0.014, 0.162), M.sole); sole.position.set(0, l.end - 0.03, 0.035); l.mid.add(sole);
    return l;
  };
  const L = { armL: arm(-1), armR: arm(1), legL: leg(-1), legR: leg(1) };
  const cur = { aL: 0, aR: 0, zL: 0, zR: 0, eL: 0, eR: 0, hL: 0, hR: 0, kL: 0, kR: 0, lean: 0, hy: 0 };
  return { root, body, head, ...L, cur, yaw: 0, ph: 0 };
}
const hero = buildHero();
hero.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
scene.add(hero.root);

function lerpAngle(a, b, k) { let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * k; }

function poseHero(p, now, dt, mode) {
  const c = hero.cur, sp = Math.hypot(p.vx, p.vz), sec = now / 1000;
  const T = { aL: 0, aR: 0, zL: 0.06, zR: -0.06, eL: -0.15, eR: -0.15, hL: 0, hR: 0, kL: 0, kR: 0, lean: 0 };
  let bob = 0;
  if (mode === 'fly') {
    Object.assign(T, { lean: 0.9, aL: -2.6, aR: -2.6, eL: 0, eR: 0, hL: 0.3, hR: 0.1, kL: 0.2, kR: 0.5 });
  } else if (p.state === 'hang') {
    const sway = Math.sin(sec * 2.2) * 0.12;
    Object.assign(T, { aL: -3.05, aR: -3.05, eL: -0.1, eR: -0.1, hL: 0.1 + sway, hR: 0.2 - sway, kL: 0.3, kR: 0.15 });
  } else if (p.state === 'swing') {
    const k = Math.max(-0.8, Math.min(0.8, (p.vx * p.fx + p.vz * p.fz) * 0.1));
    Object.assign(T, { aL: -3.0, aR: -3.1, eL: -0.1, eR: -0.1, hL: -0.5 * k + 0.2, hR: -0.5 * k + 0.4, kL: 0.5, kR: 0.8, lean: -0.25 * k });
  } else if (p.reach > 0) {
    Object.assign(T, { aL: -2.75, aR: -3.1, eL: -0.05, eR: -0.05, hL: -0.6, hR: 0.3, kL: 1.0, kR: 0.2, lean: 0.15 });
  } else if (!p.onGround) {
    if (p.sliding) Object.assign(T, { aL: -2.8, aR: -2.8, eL: -0.3, eR: -0.3, hL: -0.2, hR: 0.1, kL: 0.6, kR: 0.7 });
    else if (p.vy > 0) Object.assign(T, { aL: -1.2, aR: -0.5, zL: 0.35, zR: -0.35, eL: -0.6, eR: -0.4, hL: -0.9, hR: 0.2, kL: 1.2, kR: 0.5, lean: 0.12 });
    else Object.assign(T, { aL: -0.4, aR: -0.4, zL: 0.95, zR: -0.95, eL: -0.2, eR: -0.2, hL: -0.35, hR: 0.2, kL: 0.5, kR: 0.3, lean: 0.05 });
  } else if (sp > 0.4) {
    const k = Math.min(1, sp / 6.5);
    hero.ph += dt * (6 + sp * 1.7);
    const ph = hero.ph, s = Math.sin(ph);
    Object.assign(T, {
      hL: -s * 0.95 * k, hR: s * 0.95 * k,
      kL: Math.max(0, Math.sin(ph + 1.6)) * 1.1 * k, kR: Math.max(0, Math.sin(ph + 1.6 + Math.PI)) * 1.1 * k,
      aL: s * 0.8 * k, aR: -s * 0.8 * k, eL: -0.35 - 0.35 * k, eR: -0.35 - 0.35 * k, lean: 0.12 * k,
    });
    bob = Math.abs(Math.cos(ph)) * 0.025 * k;
  } else {
    const br = Math.sin(sec * 1.8) * 0.015; T.aL = br; T.aR = -br; T.lean = br;
  }
  const k = 1 - Math.pow(0.0001, dt);   // ~ jevn overgang uavhengig av bilderate
  for (const key in T) c[key] += (T[key] - c[key]) * k;
  hero.armL.top.rotation.set(c.aL, 0, -c.zL); hero.armR.top.rotation.set(c.aR, 0, -c.zR);
  hero.armL.mid.rotation.x = c.eL; hero.armR.mid.rotation.x = c.eR;
  hero.legL.top.rotation.x = c.hL; hero.legR.top.rotation.x = c.hR;
  hero.legL.mid.rotation.x = c.kL; hero.legR.mid.rotation.x = c.kR;
  hero.body.rotation.x = c.lean; hero.body.position.y = 0.46 + bob;
  hero.head.rotation.x = -c.lean * 0.6;
  hero.yaw = lerpAngle(hero.yaw, Math.atan2(p.fx, p.fz), 1 - Math.pow(0.001, dt));
  hero.root.rotation.y = hero.yaw;
}

// ---------- tilstand ----------
const player = newPlayer(...LEVEL.start);
const save = { pos: [...LEVEL.start] };
const stats = { saves: 0, respawns: 0, flew: false };
let mode = 'play';                 // play | plan | fly
let won = false, clock = 0;

function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 1700);
}
const points = () => Math.max(0, SCORE.start - stats.saves * SCORE.save - stats.respawns * SCORE.respawn - Math.floor(clock / 10) * SCORE.perTenSeconds);
function placeFlag() { flag.position.set(save.pos[0], save.pos[1], save.pos[2]); }
placeFlag();

function doSave() {
  if (mode !== 'play') return toast('Gå ut av plan-/flymodus først');
  if (!player.onGround) return toast('Stå støtt for å lagre');
  save.pos = [player.x, player.y, player.z]; stats.saves++; placeFlag();
  toast(`Lagringspunkt satt  −${SCORE.save} poeng`);
}
function goBack() {
  if (mode !== 'play') return;
  resetPlayer(player, ...save.pos); stats.respawns++;
  toast(`Tilbake til lagringspunkt  −${SCORE.respawn} poeng`);
}
function restartAll() {
  resetPlayer(player, ...LEVEL.start);
  save.pos = [...LEVEL.start]; stats.saves = stats.respawns = 0; stats.flew = false;
  won = false; clock = 0; placeFlag(); $('win').classList.add('hide'); setMode('play');
}

// ---------- modus: plan / fly ----------
const cam = { yaw: 0.35, pitch: 0.3, dist: 5.5, cur: 5.5, target: new THREE.Vector3(...LEVEL.start) };
const planCam = { yaw: 0.6, pitch: 0.7, dist: 55, pivot: new THREE.Vector3(8, 15, 0) };

function setMode(m) {
  if (m === mode) m = 'play';
  if (mode === 'fly' && m !== 'fly') {      // lande: ikke fast inni noe
    player.vx = player.vy = player.vz = 0; player.state = 'air';
    for (let i = 0; i < 400 && !freeAt(LEVEL, player.x, player.y, player.z); i++) player.y += 0.25;
  }
  mode = m;
  if (m === 'plan') planCam.pivot.set(player.x, player.y + 4, player.z);
  if (m === 'fly') { stats.flew = true; toast('Flymodus – tiden teller ikke som gyldig'); }
  $('bPlan').classList.toggle('on', m === 'plan'); $('bFly').classList.toggle('on', m === 'fly');
  if (m === 'plan') toast('Plan: WASD flytter, dra for å snurre, hjul/klyp for zoom');
}

// ---------- input ----------
const keys = new Set();
let jumpEdge = false, grabEdge = false;
const touch = { x: 0, y: 0, jump: false, grab: false };
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
  if (e.repeat || keys.has(e.code)) return;
  keys.add(e.code);
  if (e.code === 'Space') jumpEdge = true;
  if (['ShiftLeft', 'ShiftRight', 'KeyE'].includes(e.code)) grabEdge = true;
  if (e.code === 'KeyK') doSave();
  if (e.code === 'KeyR') goBack();
  if (e.code === 'KeyT') restartAll();
  if (e.code === 'KeyP' || e.code === 'Tab') setMode('plan');
  if (e.code === 'KeyG') setMode('fly');
  if (e.code === 'KeyH') $('help').classList.toggle('hide');
  if (e.code === 'Escape') $('panel').classList.add('hide');
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => keys.clear());
const held = (...codes) => codes.some((c) => keys.has(c));

const pointers = new Map();
let pinch0 = 0;
function activeCam() { return mode === 'plan' ? planCam : cam; }
canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId); pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); }
});
canvas.addEventListener('pointermove', (e) => {
  const p = pointers.get(e.pointerId); if (!p) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
  const c = activeCam();
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
    if (pinch0) zoom(pinch0 / d); pinch0 = d; return;
  }
  c.yaw -= dx * 0.006;
  c.pitch += dy * 0.005;
  const lim = mode === 'plan' ? [-0.3, 1.5] : [-0.35, 1.35];
  c.pitch = Math.min(lim[1], Math.max(lim[0], c.pitch));
});
const endPtr = (e) => { pointers.delete(e.pointerId); pinch0 = 0; };
canvas.addEventListener('pointerup', endPtr); canvas.addEventListener('pointercancel', endPtr);
function zoom(f) {
  if (mode === 'plan') planCam.dist = Math.min(120, Math.max(8, planCam.dist * f));
  else cam.dist = Math.min(16, Math.max(2.2, cam.dist * f));
}
canvas.addEventListener('wheel', (e) => { e.preventDefault(); zoom(Math.exp(e.deltaY * 0.0012)); }, { passive: false });

const stick = $('stick'), knob = $('knob');
let stickId = null;
function stickMove(e) {
  const r = stick.getBoundingClientRect();
  let dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2), dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
  const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
  touch.x = dx; touch.y = -dy; knob.style.transform = `translate(${dx * 40}px, ${dy * 40}px)`;
}
stick.addEventListener('pointerdown', (e) => { stickId = e.pointerId; stick.setPointerCapture(e.pointerId); stickMove(e); });
stick.addEventListener('pointermove', (e) => { if (e.pointerId === stickId) stickMove(e); });
const stickEnd = (e) => { if (e.pointerId !== stickId) return; stickId = null; touch.x = touch.y = 0; knob.style.transform = ''; };
stick.addEventListener('pointerup', stickEnd); stick.addEventListener('pointercancel', stickEnd);
function bindBtn(id, key, edge) {
  const el = $(id);
  el.addEventListener('pointerdown', (e) => { el.setPointerCapture(e.pointerId); touch[key] = true; edge(); });
  const up = () => { touch[key] = false; };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
}
bindBtn('btnJump', 'jump', () => { jumpEdge = true; });
bindBtn('btnGrab', 'grab', () => { grabEdge = true; });
$('bSave').onclick = doSave; $('bBack').onclick = goBack;
$('bPlan').onclick = () => setMode('plan'); $('bFly').onclick = () => setMode('fly');
$('again').onclick = restartAll;

// ---------- innstillingspanel (hoppfølelse) ----------
const TUNE = [
  ['gravity', 'Tyngdekraft', -45, -14, 1], ['jump', 'Hoppkraft', 8, 16, 0.1], ['airJumps', 'Dobbelthopp (0 = av)', 0, 1, 1],
  ['airAccel', 'Styring i lufta', 2, 40, 1], ['speed', 'Løpefart', 3, 10, 0.1],
  ['reachTime', 'Rekk-ut: varighet (s)', 0.1, 1, 0.05], ['reachCooldown', 'Rekk-ut: pause (s)', 0, 1.5, 0.05],
  ['reachAbove', 'Rekk-ut: ekstra rekkevidde opp', 0, 1.5, 0.05], ['ropeReach', 'Tau-rekkevidde', 0.8, 3.5, 0.1],
];
let presetName = store.get('tlm.preset', 'spenning');
if (!PRESETS[presetName]) presetName = 'spenning';
applyPreset(presetName);
Object.assign(P, store.get('tlm.custom', {}));
function buildPanel() {
  const p = $('panel');
  p.innerHTML = `<h3>Hoppinnstillinger</h3>
    <label>Forhåndsinnstilling</label>
    <select id="presetSel">${Object.entries(PRESETS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}</select>
    <label style="display:flex;gap:8px;align-items:center;font-weight:600"><input type="checkbox" id="autoGrab"> Grip kanten automatisk</label>
    <div id="sliders"></div>
    <div class="row"><button id="resetPreset">Nullstill</button><button id="closePanel">Lukk</button></div>
    <small><b>Klassisk:</b> raskt, dobbelthopp, kanten grips av seg selv.<br><b>Spenning:</b> tyngre og tregere hopp, ingen dobbelthopp. Du må trykke REKK UT (Shift/E) i riktig øyeblikk for å gripe kant eller tau.</small>`;
  $('presetSel').value = presetName;
  $('autoGrab').checked = P.autoGrab;
  $('autoGrab').onchange = (e) => { P.autoGrab = e.target.checked; saveCustom(); };
  $('sliders').innerHTML = TUNE.map(([k, label, min, max, st]) =>
    `<label>${label}<span id="v_${k}">${(+P[k]).toFixed(2)}</span></label><input type="range" id="s_${k}" min="${min}" max="${max}" step="${st}" value="${P[k]}">`).join('');
  for (const [k] of TUNE) $('s_' + k).oninput = (e) => { P[k] = +e.target.value; $('v_' + k).textContent = (+P[k]).toFixed(2); saveCustom(); };
  $('presetSel').onchange = (e) => { presetName = e.target.value; store.set('tlm.preset', presetName); applyPreset(presetName); store.set('tlm.custom', {}); buildPanel(); };
  $('resetPreset').onclick = () => { applyPreset(presetName); store.set('tlm.custom', {}); buildPanel(); toast('Nullstilt'); };
  $('closePanel').onclick = () => $('panel').classList.add('hide');
}
function saveCustom() { const o = { autoGrab: P.autoGrab }; for (const [k] of TUNE) o[k] = P[k]; store.set('tlm.custom', o); }
$('bSet').onclick = () => { buildPanel(); $('help').classList.add('hide'); $('panel').classList.toggle('hide'); };
setTimeout(() => $('help').classList.add('hide'), 15000);   // H henter den tilbake

// ---------- oppdatering ----------
const V = new THREE.Vector3();
function axes() {
  const ix = (held('KeyD', 'ArrowRight') ? 1 : 0) - (held('KeyA', 'ArrowLeft') ? 1 : 0) + touch.x;
  const iz = (held('KeyW', 'ArrowUp') ? 1 : 0) - (held('KeyS', 'ArrowDown') ? 1 : 0) + touch.y;
  return [Math.max(-1, Math.min(1, ix)), Math.max(-1, Math.min(1, iz))];
}
const upKey = () => held('Space') || touch.jump;
const downKey = () => held('KeyC', 'ControlLeft', 'ControlRight') || touch.grab;
const boost = () => held('ShiftLeft', 'ShiftRight');

function update(dt) {
  const [ix, iz] = axes();
  if (mode === 'plan') {
    const c = planCam, sp = c.dist * 0.6 * (boost() ? 2.5 : 1);
    const fx = -Math.sin(c.yaw), fz = -Math.cos(c.yaw), rx = Math.cos(c.yaw), rz = -Math.sin(c.yaw);
    c.pivot.x += (rx * ix + fx * iz) * sp * dt; c.pivot.z += (rz * ix + fz * iz) * sp * dt;
    c.pivot.y += ((upKey() ? 1 : 0) - (downKey() ? 1 : 0)) * sp * dt;
    c.pivot.y = Math.max(0, c.pivot.y);
    jumpEdge = grabEdge = false;
    return;
  }
  const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
  if (mode === 'fly') {
    const sp = boost() ? 38 : 13, cp = Math.cos(cam.pitch), sn = Math.sin(cam.pitch);
    // fremover = der kameraet ser, også opp/ned: ser du ned mot et brett, flyr du ned mot det
    const mx = rx * ix + fx * cp * iz, mz = rz * ix + fz * cp * iz;
    player.x += mx * sp * dt;
    player.z += mz * sp * dt;
    player.y += (-sn * iz + (upKey() ? 1 : 0) - (downKey() ? 1 : 0)) * sp * dt;
    player.y = Math.max(0, player.y);
    player.vx = player.vz = player.vy = 0; player.state = 'air'; player.onGround = false;
    if (ix || iz) { const l = Math.hypot(mx, mz) || 1; player.fx = mx / l; player.fz = mz / l; }
    jumpEdge = grabEdge = false;
    return;
  }

  if (!won) clock += dt;
  const inp = {
    mx: rx * ix + fx * iz, mz: rz * ix + fz * iz,
    jumpPressed: jumpEdge, jumpHeld: held('Space') || touch.jump,
    grabPressed: grabEdge, grabHeld: held('ShiftLeft', 'ShiftRight', 'KeyE') || touch.grab,
  };
  jumpEdge = grabEdge = false;
  step(player, inp, dt, LEVEL);

  if (player.onGround && player.groundBox?.cp && player.y > save.pos[1] + 0.01) { save.pos = [player.x, player.y, player.z]; placeFlag(); toast('Sjekkpunkt'); }
  if (player.y < LEVEL.deathY) { resetPlayer(player, ...save.pos); stats.respawns++; toast(`Falt – tilbake til lagringspunkt  −${SCORE.respawn} poeng`); }

  const g = LEVEL.goal;
  if (!won && Math.hypot(player.x - g[0], player.z - g[2]) < 2 && Math.abs(player.y - g[1]) < 2.5) {
    won = true;
    $('winStats').innerHTML = `Tid: ${clock.toFixed(1)} s<br>Lagringspunkter brukt: ${stats.saves}<br>Tilbakeføringer: ${stats.respawns}<br><b style="font-size:22px">Poeng: ${points()}</b>` +
      (stats.flew ? '<br><i>Flymodus ble brukt – resultatet er ikke gyldig</i>' : '');
    $('win').classList.remove('hide');
  }
}

// ---------- tegning ----------
function insideAny(x, y, z, m) {
  for (const b of LEVEL.boxes) if (x > b.min[0] - m && x < b.max[0] + m && y > b.min[1] - m && y < b.max[1] + m && z > b.min[2] - m && z < b.max[2] + m) return true;
  return false;
}

function render(now, dt) {
  poseHero(player, now, dt, mode);
  hero.root.position.set(player.x, player.y, player.z);
  const sq = Math.max(-0.1, Math.min(0.14, player.vy * 0.008));
  hero.root.scale.set(1 - sq * 0.4, 1 + sq, 1 - sq * 0.4);

  for (const { r, line, end } of ropes) {
    const a = new THREE.Vector3(r.x, r.y, r.z);
    const b = player.rope === r ? new THREE.Vector3(player.x, player.y + 0.85, player.z) : new THREE.Vector3(r.x, r.y - r.len, r.z);
    setCyl(line, a, b); end.position.copy(b);
  }
  goal.rotation.y = now * 0.002; goal.position.y = LEVEL.goal[1] + 0.35 + Math.sin(now * 0.003) * 0.12;
  flag.children[1].rotation.y = Math.sin(now * 0.004) * 0.25;

  let desired, look;
  if (mode === 'plan') {
    const c = planCam, cp = Math.cos(c.pitch);
    look = c.pivot;
    desired = new THREE.Vector3(c.pivot.x + Math.sin(c.yaw) * cp * c.dist, Math.max(0.6, c.pivot.y + Math.sin(c.pitch) * c.dist), c.pivot.z + Math.cos(c.yaw) * cp * c.dist);
    camera.position.lerp(desired, 1 - Math.pow(0.0005, dt));
    camera.lookAt(look);
  } else {
    cam.target.lerp(V.set(player.x, player.y + 0.62, player.z), 1 - Math.pow(0.002, dt));
    const cp = Math.cos(cam.pitch), dir = new THREE.Vector3(Math.sin(cam.yaw) * cp, Math.sin(cam.pitch), Math.cos(cam.yaw) * cp);
    let d = cam.dist;
    for (; d > 1.1; d -= 0.2) { if (!insideAny(cam.target.x + dir.x * d, cam.target.y + dir.y * d, cam.target.z + dir.z * d, 0.25)) break; }
    cam.cur += (d - cam.cur) * (d < cam.cur ? 0.5 : 0.08);
    camera.position.copy(cam.target).addScaledVector(dir, cam.cur);
    camera.lookAt(cam.target);
  }
  sun.target.position.set(player.x, player.y, player.z);
  sun.position.set(player.x + 28, player.y + 60, player.z - 24);
  renderer.render(scene, camera);
  $('hud').textContent =
    `${mode === 'plan' ? 'PLAN' : mode === 'fly' ? 'FLY' : player.state}${player.sliding ? ' (glir)' : ''}${player.reach > 0 ? ' · REKKER UT' : ''}\n` +
    `høyde ${player.y.toFixed(1)}  tid ${clock.toFixed(0)}s\nlagret ${stats.saves} · tilbake ${stats.respawns} · poeng ${points()}`;
}

function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  update(dt); render(now, dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

window.__game = { player, LEVEL, P, save, stats, setMode, cam, planCam, restartAll };
