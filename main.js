import * as THREE from 'three';
import { RoomEnvironment } from './lib/RoomEnvironment.js';
import { createAudio, surfaceOf, SOUND_LIST } from './audio.js';
import { VERSION } from './version.js';
import { buildGroup, buildSingle } from './props.js';
import { P, PRESETS, applyPreset, newPlayer, resetPlayer, step, freeAt, inHazard, initBodies, resetBodies, drainEvents, findCarryTarget, findPlaceSpot, throwVelocity, toolHint } from './physics.js';

const $ = (id) => document.getElementById(id);
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* privat modus e.l. */ } },
};

// Brett: ?level=bad (eller soverom/poc). Uten parameter åpnes brettet du sist spilte.
const LEVELS = [
  { id: 'soverom', label: 'Soverom (håndlaget)', short: 'Soverom' },
  { id: 'bad', label: 'Bad (tolket fra 3 bilder)', short: 'Bad' },
  { id: 'poc', label: 'Prøverom: flytte ting', short: 'Prøverom' },
  { id: 'klatring', label: 'Prøverom: klatrehjelp (stav, svamp, fall)', short: 'Klatring' },
];
const levelParam = new URLSearchParams(location.search).get('level');
let levelId = levelParam === '' ? 'soverom' : (levelParam ?? store.get('tlm.level', 'soverom'));
let LEVEL = null, levelName = '';
if (levelId && levelId !== 'soverom') {
  try {
    const r = await fetch(`./levels/${encodeURIComponent(levelId)}.level.json`);
    if (!r.ok) throw new Error(r.status);
    LEVEL = await r.json(); levelName = levelId;
  } catch { LEVEL = null; }
}
if (!LEVEL) { LEVEL = (await import('./level.js')).LEVEL; levelId = 'soverom'; }
store.set('tlm.level', levelId);
const levelLabel = LEVELS.find((l) => l.id === levelId)?.short || levelId;
const SUN = LEVEL.sun || [28, 60, -24];

// ---------- lyd ----------
// Web Audio kan først startes etter en brukerhandling (nettleserregel), så den opprettes ved første tastetrykk/trykk.
let audio = null;
let soundMuted = store.get('tlm.muted', false);
function unlockAudio() {
  if (!audio) {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      audio = createAudio(new Ctx(), { volume: store.get('tlm.vol', 0.7), reverb: store.get('tlm.reverb', null) ?? LEVEL.audio?.reverb ?? 0.12, levels: store.get('tlm.mix2', {}) });
      audio.setMuted(soundMuted);
    } catch { audio = null; }
  }
  audio?.resume();
}
addEventListener('pointerdown', unlockAudio); addEventListener('keydown', unlockAudio);
// valgfri kamerafølging: kameraet dreier seg langsomt bak figuren når den går (av etter at du selv har dratt i kameraet)
let autoCam = store.get('tlm.autocam', false), lastDrag = -99;
function toggleAutoCam() { autoCam = !autoCam; store.set('tlm.autocam', autoCam); toast(autoCam ? 'Kamera følger retning' : 'Kamera følger ikke'); const c = document.getElementById('chkAutoCam'); if (c) c.checked = autoCam; }

// lydtekst: viser korte tekster for viktige lyder (for hørselshemmede, og når lyden er av). Skritt og pust er utelatt.
let cuesOn = store.get('tlm.cues', false);
function cue(text, pan = 0) {
  if (!cuesOn) return;
  const box = document.getElementById('cues'); if (!box) return;
  const el = document.createElement('div'); el.className = 'cue'; el.textContent = `${pan < -0.3 ? '◀ ' : ''}🔊 ${text}${pan > 0.3 ? ' ▶' : ''}`;
  box.appendChild(el); while (box.children.length > 4) box.firstChild.remove();
  setTimeout(() => el.classList.add('out'), 1500); setTimeout(() => el.remove(), 2000);
}
function toggleCues() { cuesOn = !cuesOn; store.set('tlm.cues', cuesOn); toast(cuesOn ? 'Lydtekst på' : 'Lydtekst av'); const c = document.getElementById('chkCues'); if (c) c.checked = cuesOn; }

function toggleSound() {
  soundMuted = !soundMuted; store.set('tlm.muted', soundMuted);
  audio?.setMuted(soundMuted);
  const b = document.getElementById('bSound'); if (b) { b.textContent = soundMuted ? 'Lyd av' : 'Lyd'; b.classList.toggle('on', !soundMuted); }
}

// ---------- poeng ----------
const SCORE = { start: 1000, save: 25, respawn: 10, broken: 5, resetThings: 15, perTenSeconds: 2, hardLand: 3 };

// ---------- renderer / scene ----------
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = LEVEL.look?.exposure ?? 1.05;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xcbbfae);
scene.fog = new THREE.Fog(0xcbbfae, 55, 150);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;

const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 400);

const sun = new THREE.DirectionalLight(0xffe7c2, LEVEL.look?.sun ?? 3.0);
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
const room = LEVEL.room;
const tileTex = canvasTex(256, (g, S) => {
  g.fillStyle = '#cfcfc8'; g.fillRect(0, 0, S, S);                       // fuge
  const gr = g.createLinearGradient(0, 0, S, S);
  gr.addColorStop(0, '#fbfbf8'); gr.addColorStop(1, '#eceae3');
  g.fillStyle = gr; g.fillRect(5, 5, S - 10, S - 10);
});
const std = (o) => new THREE.MeshStandardMaterial(o);

function material(b) {
  const col = b.color ?? 0xcccccc;
  const kind = b.type === 'floor' || b.type === 'wall' ? `${b.type}:${b.material || 'default'}` : (b.material || b.type);
  switch (kind) {
    case 'floor:default': case 'floor:wood': return std({ map: floorTex.clone(), roughness: 0.5 });
    case 'floor:tile': return std({ map: tileTex.clone(), color: col, roughness: 0.14 });
    case 'wall:tile': return std({ map: tileTex.clone(), color: col, roughness: 0.2 });
    case 'wall:default': case 'wall:plaster': case 'wall': return std({ map: plasterTex.clone(), color: col, roughness: 0.95 });
    case 'wood': case 'woodpanel': return std({ map: woodTex.clone(), color: col, roughness: 0.55 });
    case 'book': return std({ color: col, roughness: 0.78 });
    case 'plastic': return std({ color: col, roughness: 0.3, metalness: 0.1 });
    case 'porcelain': return std({ color: col, roughness: 0.07 });
    case 'ceramic': return std({ color: col, roughness: 0.15 });
    case 'glass': return new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.04, transparent: true, opacity: 0.4, transmission: 0.6 });
    case 'metal': return std({ color: col, roughness: 0.22, metalness: 1 });
    case 'mirror': return std({ color: 0xffffff, roughness: 0.02, metalness: 1 });
    case 'fabric': return std({ color: col, roughness: 1 });
    case 'wicker': case 'paper': return std({ color: col, roughness: 0.92 });
    default: return std({ color: col, roughness: 0.7 });
  }
}
const pageMat = std({ map: pagesTex, roughness: 0.9 });
const woodKinds = new Set(['wood', 'woodpanel']);

// ting som består av flere bokser (do, badekar …) tegnes som én ekte form; kollisjonen er fortsatt boksene
const drawn = new Set(); let hasToilet = false;
{
  const groups = new Map();
  for (const b of LEVEL.boxes) if (b.group) { if (!groups.has(b.group)) groups.set(b.group, []); groups.get(b.group).push(b); }
  for (const [, members] of groups) {
    const o = buildGroup(members); if (!o) continue;
    scene.add(o); members.forEach((m) => drawn.add(m));
    if (members.some((m) => m.kind === 'toilet_tank')) hasToilet = true;
  }
}
for (const b of LEVEL.boxes) {
  if (drawn.has(b)) continue;
  const sx = b.max[0] - b.min[0], sy = b.max[1] - b.min[1], sz = b.max[2] - b.min[2];
  const cx = b.min[0] + sx / 2, cy = b.min[1] + sy / 2, cz = b.min[2] + sz / 2;
  const shaped = b.kind && b.type !== 'floor' && b.type !== 'wall' && !b.dyn ? buildSingle(b.kind, [sx, sy, sz], { color: b.color, id: b.id, material: b.material }) : null;
  if (shaped) { shaped.position.set(cx, cy, cz); scene.add(shaped); continue; }
  const mat = material(b);
  const tiled = b.material === 'tile';
  if (b.type === 'floor') {
    const rep = tiled ? 4 : 18;
    mat.map.repeat.set(sx / rep, sz / rep);
    if (tiled) { mat.map.center.set(0.5, 0.5); mat.map.rotation = room.floor?.diagonal ? Math.PI / 4 : 0; }
  } else if (woodKinds.has(b.material || b.type)) {
    mat.map.repeat.set(Math.max(1, Math.max(sx, sz) / 8), Math.max(1, sy / 8));
  } else if (b.type === 'wall') {
    if (tiled) mat.map.repeat.set(Math.max(sx, sz) / 4, Math.max(1, sy / 4));
    else mat.map.repeat.set(Math.max(sx, sz) / 10, 8);
  }
  const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
  m.position.set(cx, cy, cz);
  m.castShadow = b.type !== 'floor' && b.type !== 'wall' && b.material !== 'glass'; m.receiveShadow = true;
  scene.add(m);

  if (b.type === 'book' && sy > 1 && Math.min(sx, sz) > 1.5) {
    // liggende bok: sider synlige på tre sider, rygg mot -x
    const pm = new THREE.Mesh(new THREE.BoxGeometry(sx - 0.3, Math.max(0.2, sy - 0.24), sz + 0.04), pageMat);
    pm.position.set(cx + 0.17, cy, cz); pm.castShadow = false; pm.receiveShadow = true; scene.add(pm);
  }
}

// sokkellist (kun med malte vegger), tak og vinduer
{
  const w = room.x1 - room.x0, d = room.z1 - room.z0, ox = (room.x0 + room.x1) / 2, oz = (room.z0 + room.z1) / 2;
  if (room.walls?.material !== 'tile' && !levelName) {
    const mat = std({ color: 0xffffff, roughness: 0.5 });
    for (const [x, z, sx, sz] of [[ox, room.z0 + 0.3, w, 0.6], [ox, room.z1 - 0.3, w, 0.6], [room.x0 + 0.3, oz, 0.6, d], [room.x1 - 0.3, oz, 0.6, d]]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(sx, 3, sz), mat); m.position.set(x, 1.5, z); m.receiveShadow = true; scene.add(m);
    }
  }
  const ceilMat = room.ceiling?.material === 'woodpanel'
    ? std({ map: woodTex.clone(), color: hexNum(room.ceiling.color), roughness: 0.6 })
    : std({ color: 0xf5f1e8, roughness: 1 });
  if (ceilMat.map) ceilMat.map.repeat.set(w / 10, d / 10);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w, d), ceilMat);
  ceil.rotation.x = Math.PI / 2; ceil.position.set(ox, room.height, oz); ceil.receiveShadow = true; scene.add(ceil);

  const frameMat = std({ color: 0xf0ead8, roughness: 0.5 });
  for (const win of LEVEL.windows || []) {
    const g = new THREE.Group(); g.position.set(...win.pos);
    g.rotation.y = { N: 0, S: Math.PI, E: -Math.PI / 2, W: Math.PI / 2 }[win.wall] ?? 0;
    const [ww, wh] = win.size;
    g.add(new THREE.Mesh(new THREE.PlaneGeometry(ww, wh), new THREE.MeshBasicMaterial({ color: 0xfff6e0 })));
    for (const [x, y, sx, sy] of [[0, wh / 2 + 0.4, ww + 1.6, 0.8], [0, -wh / 2 - 0.4, ww + 1.6, 0.8], [-ww / 2 - 0.4, 0, 0.8, wh], [ww / 2 + 0.4, 0, 0.8, wh], [0, 0, 0.4, wh]]) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, 0.7), frameMat); f.position.set(x, y, 0.3); g.add(f);
    }
    scene.add(g);
  }
}
function hexNum(h) { return typeof h === 'number' ? h : parseInt(String(h).replace('#', ''), 16); }

for (const d of LEVEL.decor || []) {
  const sg = d.kind && buildSingle(d.kind, d.size, { color: d.color, id: d.id, material: d.material });
  if (sg) { sg.position.set(...d.pos); scene.add(sg); continue; }
  const geo = d.shape === 'sphere' ? new THREE.SphereGeometry(d.size[0], 16, 12) : new THREE.BoxGeometry(...d.size);
  const mat = d.emissive !== undefined || d.metal !== undefined
    ? std({ color: d.color, emissive: d.emissive ?? 0, roughness: d.rough ?? 0.5, metalness: d.metal ?? 0 })
    : material({ type: d.material || 'plastic', material: d.material, color: d.color });
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...d.pos); m.castShadow = d.material !== 'mirror'; scene.add(m);
}

for (const h of LEVEL.hazards || []) {   // litt synlig vann i do-skålen
  if (h.type !== 'flush' || hasToilet) continue;
  const r = Math.min(h.max[0] - h.min[0], h.max[2] - h.min[2]) / 2 - 0.3;
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.05, 24), new THREE.MeshStandardMaterial({ color: 0x5a8fa8, roughness: 0.05, transparent: true, opacity: 0.8 }));
  disc.position.set((h.min[0] + h.max[0]) / 2, 2.2, (h.min[2] + h.max[2]) / 2); scene.add(disc);
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

// kastebue: vises mens du lader opp et kast (hold F)
const ARC_N = 28;
const arcGeo = new THREE.BufferGeometry(); arcGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ARC_N * 3), 3));
const arc = new THREE.Line(arcGeo, new THREE.LineBasicMaterial({ color: 0xffd23f }));
arc.frustumCulled = false; arc.visible = false; scene.add(arc);
function updateArc() {
  const p = player, b = p.carry;
  if (!b || p.charge < P.throwMin || mode !== 'play') { arc.visible = false; return; }
  const k = Math.min(1, (p.charge - P.throwMin) / P.throwFull), v = throwVelocity(p, k), a = arcGeo.attributes.position, h = 0.05;
  let x = (b.min[0] + b.max[0]) / 2, y = (b.min[1] + b.max[1]) / 2, z = (b.min[2] + b.max[2]) / 2, vy = v.vy, n = 0;
  for (; n < ARC_N; n++) {
    a.setXYZ(n, x, y, z);
    vy += P.gravity * h; x += v.vx * h; y += vy * h; z += v.vz * h;
    if (insideAny(x, y, z, 0)) { n++; break; }
  }
  a.needsUpdate = true; arcGeo.setDrawRange(0, Math.max(2, n)); arc.visible = true;
}

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
const RIG_S = 1.07;   // figuren tegnes litt større enn animasjonsrommet (så den blir ~1,0 høy)
function buildHero() {
  const root = new THREE.Group();
  const rig = new THREE.Group(); rig.scale.setScalar(RIG_S); root.add(rig);
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
  const limb = (up, lo, r, mat) => {
    const top = new THREE.Group(), u = cap(r, up, mat); u.position.y = -(up / 2 + r * 0.6); top.add(u);
    const mid = new THREE.Group(); mid.position.y = -(up + r * 1.2); top.add(mid);
    const l = cap(r * 0.9, lo, mat); l.position.y = -(lo / 2 + r * 0.6); mid.add(l);
    return { top, mid, end: -(lo + r * 1.2), l1: up + r * 1.2, l2: lo + r * 1.2 };
  };

  // ryggrad i to deler: bekken (følger hoftene) og bryst (kan bøye og vri seg), så kroppen ikke er én stiv pinne
  const body = new THREE.Group(); body.position.y = 0.46; rig.add(body);
  const pelvis = cap(0.08, 0.05, M.pants); pelvis.scale.set(1.4, 1, 0.9); pelvis.position.y = 0.0; body.add(pelvis);
  const chest = new THREE.Group(); chest.position.y = 0.09; body.add(chest);
  const torso = cap(0.088, 0.17, M.shirt); torso.scale.set(1.25, 1, 0.8); torso.position.y = 0.09; chest.add(torso);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.05, 10), M.skin); neck.position.y = 0.195; chest.add(neck);
  const head = new THREE.Group(); head.position.y = 0.28; chest.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 16), M.skin); skull.castShadow = true; head.add(skull);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.081, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), M.hair); hair.rotation.x = -0.35; hair.position.y = 0.006; head.add(hair);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.01, 8, 8), M.eye); e.position.set(s * 0.028, 0.01, 0.069); head.add(e); }

  const arm = (s) => {
    const a = limb(0.09, 0.09, 0.03, M.shirt); a.top.position.set(s * 0.125, 0.16, 0); chest.add(a.top);
    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 10), M.shirt); shoulder.castShadow = true; a.top.add(shoulder);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 8), M.skin); hand.scale.set(0.9, 1.15, 0.75); hand.position.y = a.end - 0.012; a.mid.add(hand);
    return a;
  };
  const leg = (s) => {
    const l = limb(0.15, 0.15, 0.045, M.pants); l.top.position.set(s * 0.055, 0.46, 0); rig.add(l.top);
    const footG = new THREE.Group(); footG.position.y = l.end; l.mid.add(footG); l.footG = footG;      // ankelen
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.045, 0.16), M.shoe); foot.position.set(0, -0.005, 0.035); foot.castShadow = true; footG.add(foot);
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.077, 0.014, 0.162), M.sole); sole.position.set(0, -0.03, 0.035); footG.add(sole);
    return l;
  };
  const L = { armL: arm(-1), armR: arm(1), legL: leg(-1), legR: leg(1) };
  const cur = { aL: 0, aR: 0, zL: 0, zR: 0, eL: 0, eR: 0, hL: 0, hR: 0, kL: 0, kR: 0, lean: 0, chest: 0, twist: 0, hy: 0, hp: 0, fp: 0 };
  return { root, body, chest, head, ...L, cur, yaw: 0, ph: 0, accLean: 0, bob: 0, pv: null, ikW: 0, hipY: 0.46 };
}
const hero = buildHero();
hero.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
scene.add(hero.root);

// To-ledds bein-IK i sagittalplanet: gitt hoftehøyde og ankelens posisjon (z fremover, y opp) → hofte- og kneledd.
const ANKLE_H = 0.037;                       // ankel over såle (rig-lokalt)
function solveLeg(leg, hipY, z, ankleY) {
  const l1 = leg.l1, l2 = leg.l2, dy = ankleY - hipY;
  const d = Math.min(Math.max(Math.hypot(z, dy), Math.abs(l1 - l2) + 1e-3), l1 + l2 - 1e-4);
  const clamp1 = (v) => Math.max(-1, Math.min(1, v));
  const kappa = Math.PI - Math.acos(clamp1((l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2)));   // knebøy
  const beta = Math.acos(clamp1((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)));
  const theta = Math.atan2(-z, -dy) - beta;                                                  // lår (negativ = fremover)
  return { theta, kappa };
}
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth3 = (x) => x * x * (3 - 2 * x);
// Fotbane over ett skrittløp (u = 0..1). Standfasen går bakover like fort som kroppen går fremover, så foten står fast.
function footPath(u, s, A, lift) {
  const um = (u + s / 2) % 1;
  if (um < s) return { z: A - 2 * A * (um / s), y: 0, pitch: 0 };
  const v = (um - s) / (1 - s), e = smooth3(v);
  // tåen peker litt ned når foten løftes og litt opp rett før hælen treffer
  const pitch = 0.35 * smooth3(clampN(v / 0.2, 0, 1)) * (1 - smooth3(clampN((v - 0.2) / 0.4, 0, 1))) - 0.3 * smooth3(clampN((v - 0.7) / 0.3, 0, 1));
  // svingen starter og slutter med samme fart som foten har mot gulvet (Hermite) → ingen knekk ved tåavspark og hælstrøk
  const T = -2 * A * (1 - s) / s, v2 = v * v, v3 = v2 * v;
  const z = A * (-1 + 6 * v2 - 4 * v3) + T * (2 * v3 - 3 * v2 + v);
  return { z, y: lift * Math.sin(Math.PI * v), pitch };
}

function footstep(side, sp) {
  if (!audio) return;
  audio.step(surfaceOf(player.groundBox), Math.max(0.2, Math.min(1, 0.3 + 0.7 * sp / P.speed)), side);
}

const DIP_MAX = 0.17;   // hvor mye hoftene kan synke i hurk (landing/forberedelse)

function poseHero(p, now, dt, mode) {
  const c = hero.cur, sp = Math.hypot(p.vx, p.vz), sec = now / 1000;
  const T = { aL: 0, aR: 0, zL: 0.06, zR: -0.06, eL: -0.15, eR: -0.15, hL: 0, hR: 0, kL: 0, kR: 0, lean: 0, chest: 0, twist: 0, hy: 0, hp: 0, fp: 0 };
  let bob = 0;

  // akselerasjon langs blikkretningen: fremover når du setter fart, bakover når du bremser
  if (!hero.pv) hero.pv = [p.vx, p.vz];
  const acc = ((p.vx - hero.pv[0]) * p.fx + (p.vz - hero.pv[1]) * p.fz) / Math.max(dt, 1e-3);
  hero.pv = [p.vx, p.vz];
  hero.accLean += (clampN(acc * 0.012, -0.3, 0.3) - hero.accLean) * (1 - Math.exp(-dt / 0.15));

  // fotbaner fra fysikkens skrittfase (samme distanse som kroppen faktisk har gått → ingen gliding)
  const A_MAX = 0.25, kSp = clampN(sp / P.speed, 0, 1), SL = 2 * p.stepLen;
  const sFrac = Math.max(0.28, Math.min(0.64, 2 * A_MAX / SL)), A = sFrac * SL / 2, lift = 0.025 + 0.06 * kSp;
  const u = (p.gait / (Math.PI * 2)) % 1, idleW = clampN(1 - sp / 0.35, 0, 1);
  const pathL = footPath(u, sFrac, A, lift), pathR = footPath((u + 0.5) % 1, sFrac, A, lift);
  for (const f of [pathL, pathR]) { f.z *= 1 - idleW; f.y *= 1 - idleW; f.pitch *= 1 - idleW; }
  const gaitN = { L: pathL.z / (A + 1e-6), R: pathR.z / (A + 1e-6) };
  pathL.z /= RIG_S; pathR.z /= RIG_S;          // rig-lokalt: figuren er skalert, så foten må flyttes tilsvarende mindre
  const gaitOn = P.gaitMode && mode !== 'fly' && p.state === 'ground' && p.onGround && !p.skid;

  // hurk: forberedelse før hopp (armene bak) og demping etter landing (armene frem). 0 = oppreist, 1 = dypt.
  const wDF = p.windup > 0 ? smooth3(clampN((P.jumpWindup - p.windup) / 0.07, 0, 1)) : 0;
  const li = clampN((p.landImpact - 3) / 18, 0, 1);
  const lDF = li * (p.landT < 0.06 ? p.landT / 0.06 : Math.exp(-(p.landT - 0.06) * 5.5));
  const rDF = p.recover > 0 ? 0.9 * smooth3(clampN(p.recover / 0.15, 0, 1)) : 0;
  const df = p.onGround ? Math.max(wDF, lDF, rDF) : 0;
  const idleNow = sp < 0.15 && p.onGround && !p.windup && df < 0.05;

  if (mode === 'fly') {
    Object.assign(T, { lean: 0.9, aL: -2.6, aR: -2.6, eL: 0, eR: 0, hL: 0.3, hR: 0.1, kL: 0.2, kR: 0.5, chest: 0.1 });
  } else if (p.state === 'mantle' && p.mantle) {
    const uu = Math.min(1, p.mantle.t / p.mantle.dur), pull = smooth3(Math.min(1, uu / 0.6)), over = smooth3(Math.max(0, (uu - 0.6) / 0.4));
    Object.assign(T, {
      aL: -3.05 + 2.3 * pull, aR: -3.05 + 2.3 * pull, eL: -0.1 - 0.7 * pull, eR: -0.1 - 0.7 * pull,
      hL: -0.2 - 0.9 * Math.sin(pull * Math.PI), hR: 0.1, kL: 0.4 + 0.9 * Math.sin(pull * Math.PI), kR: 0.3,
      lean: 0.1 + 0.3 * pull * (1 - over), chest: 0.15 * pull * (1 - over), hp: -0.25 * (1 - over), twist: 0.08 * Math.sin(pull * Math.PI),
    });
    bob = -0.06 * pull;
  } else if (p.state === 'climb') {                              // klatrer: armene veksler opp langs flaten, bena trår
    const ph = p.climbPh * 2, s1 = Math.sin(ph), tired = clampN(1 - p.stam / (P.stamina * 0.35), 0, 1);
    Object.assign(T, {
      aL: -2.85 + 0.45 * s1, aR: -2.85 - 0.45 * s1, eL: -0.35, eR: -0.35,
      hL: -0.55 + 0.4 * s1, hR: -0.55 - 0.4 * s1, kL: 0.95 - 0.35 * s1, kR: 0.95 + 0.35 * s1,
      lean: 0.1 + 0.05 * tired, chest: -0.04, hp: -0.18, twist: 0.06 * s1,
    });
    bob = 0.02 * Math.abs(s1);
  } else if (p.state === 'hang') {
    const sway = Math.sin(sec * 1.5);
    Object.assign(T, { aL: -3.05, aR: -3.05, eL: -0.12, eR: -0.12, hL: 0.12 + sway * 0.1, hR: 0.22 - sway * 0.1, kL: 0.3, kR: 0.15, lean: sway * 0.03, chest: -0.05, hp: -0.2, twist: sway * 0.05 });
  } else if (p.state === 'swing') {
    const k = clampN((p.vx * p.fx + p.vz * p.fz) * 0.1, -0.8, 0.8);
    Object.assign(T, { aL: -3.0, aR: -3.1, eL: -0.1, eR: -0.1, hL: -0.5 * k + 0.2, hR: -0.5 * k + 0.4, kL: 0.5, kR: 0.8, lean: -0.25 * k, chest: -0.1 * k, hp: -0.15 });
  } else if (p.reach > 0) {
    Object.assign(T, { aL: -2.75, aR: -3.1, eL: -0.05, eR: -0.05, hL: -0.6, hR: 0.3, kL: 1.0, kR: 0.2, lean: 0.15, chest: 0.12, hp: -0.2 });
  } else if (!p.onGround) {
    if (p.sliding) {
      Object.assign(T, { aL: -2.8, aR: -2.8, eL: -0.3, eR: -0.3, hL: -0.2, hR: 0.1, kL: 0.6, kR: 0.7, lean: 0.05, hp: -0.15 });
    } else {
      // hopp/fall som en bevegelse: strekk ved avspark → trekke opp til toppen → strekke bena ned mot landing
      const r = clampN(p.vy / P.jump, -1.6, 1);                                   // 1 = avspark, 0 = toppunkt, <0 = faller
      const run = clampN(sp / (P.speed * 1.3), 0, 1);                              // løpehopp (skritt) vs stående hopp
      const e = p.vy > 0 && p.airT < 0.22 ? 1 - p.airT / 0.22 : 0;                // avsparkets strekk
      const fallK = smooth3(clampN(-r / 1.1, 0, 1));
      const tuck = smooth3(1 - clampN(r, 0, 1)) * (1 - fallK) * (1 - e);
      const fast = clampN((-p.vy - 8) / 14, 0, 1);                                // hardt fall: armene opp
      const hL = lerpN(-0.95, -1.05, run) * tuck, hR = lerpN(-0.95, 0.55, run) * tuck;
      const kL = lerpN(1.35, 0.45, run) * tuck, kR = lerpN(1.35, 1.2, run) * tuck;
      T.hL = hL + 0.08 * e - (0.3 + 0.15 * run) * fallK; T.hR = hR + 0.08 * e - 0.08 * fallK;
      T.kL = kL * (1 - fallK) + 0.3 * fallK; T.kR = kR * (1 - fallK) + 0.22 * fallK; T.fp = 0.75 * e + 0.2 * tuck;
      T.aL = -3.0 * e - 0.9 * tuck - 1.2 * fallK - 0.9 * fast; T.aR = T.aL * lerpN(0.9, 0.75, run);
      T.zL = 0.2 + 0.55 * tuck + 0.5 * fallK; T.zR = -(0.2 + 0.5 * tuck + 0.55 * fallK);
      T.eL = T.eR = -0.35 - 0.5 * tuck - 0.2 * fallK;
      T.lean = 0.06 + 0.12 * run * (1 - fallK) - 0.04 * e; T.chest = 0.05 + 0.1 * tuck; T.hp = -0.1 - 0.1 * fast;
      T.twist = 0.12 * run * tuck;
    }
  } else if (p.skid) {                                          // du skrider mens du snur: lent bakover, bein foran
    Object.assign(T, { aL: -0.9, aR: -0.4, zL: 0.5, zR: -0.5, eL: -0.3, eR: -0.3, hL: -0.55, hR: 0.45, kL: 0.2, kR: 0.6, lean: -0.3, chest: -0.08 });
  } else {
    if (P.gaitMode && sp > 0.15) {
      const k = kSp, amp = (0.3 + 0.45 * k) * smooth3(clampN(sp / 0.8, 0, 1));    // armsving vokser jevnt med farten (ikke en terskel)
      Object.assign(T, { aL: -amp * gaitN.R, aR: -amp * gaitN.L, eL: -0.25 - 0.45 * k, eR: -0.25 - 0.45 * k, lean: 0.04 + 0.1 * k, chest: 0.03 + 0.07 * k, hp: -0.04 * k });
      T.twist = -0.14 * k * (gaitN.L - gaitN.R) / 2;                                // overkroppen vrir seg motsatt hoftene
    } else if (sp > 0.4 && !P.gaitMode) {
      const k = Math.min(1, sp / 5.6);
      hero.ph += dt * (2.2 + sp * 1.0);                         // takten følger farten (ikke en fast frekvens)
      const stepIdx = Math.floor(hero.ph / Math.PI);
      if (stepIdx !== hero.lastStep) { hero.lastStep = stepIdx; if (audio && mode === 'play') footstep(stepIdx % 2 ? 1 : -1, sp); }
      const ph = hero.ph, sn = Math.sin(ph), amp = 0.5 + 0.45 * k;
      Object.assign(T, {
        hL: -sn * amp, hR: sn * amp,
        kL: Math.max(0, Math.sin(ph + 1.6)) * (0.5 + 0.7 * k), kR: Math.max(0, Math.sin(ph + 1.6 + Math.PI)) * (0.5 + 0.7 * k),
        aL: sn * (0.35 + 0.5 * k), aR: -sn * (0.35 + 0.5 * k), eL: -0.25 - 0.45 * k, eR: -0.25 - 0.45 * k, lean: 0.06 + 0.1 * k, chest: 0.04, twist: -0.1 * sn * k,
      });
      bob = Math.abs(Math.cos(ph)) * 0.02 * k;
    } else if (idleNow) {                                       // hvile: pust i brystet, litt armsvev, hodet ser seg rundt
      const br = Math.sin(sec * 1.7);
      T.chest = br * 0.02; T.lean = br * 0.008;
      T.aL = Math.sin(sec * 0.9) * 0.025 + br * 0.01; T.aR = Math.sin(sec * 0.9 + 1.3) * 0.025 - br * 0.01;
      T.hy = Math.sin(sec * 0.43) * 0.28 + Math.sin(sec * 0.17) * 0.18; T.hp = Math.sin(sec * 0.29) * 0.07;
    }
    if (df > 0.01) {                                            // hurk: lent frem, armene bak (forberedelse) eller frem (landing)
      T.lean += 0.42 * df; T.chest += 0.14 * df; T.zL += 0.15 * df; T.zR -= 0.15 * df;
      T.aL += 0.6 * wDF - 0.85 * Math.max(0, df - wDF); T.aR += 0.6 * wDF - 0.85 * Math.max(0, df - wDF);
      if (!P.gaitMode) { T.hL += -0.65 * df; T.hR += -0.65 * df; T.kL += 1.3 * df; T.kR += 1.3 * df; bob = -DIP_MAX * 0.8 * df; }
    }
    if (p.carry) { T.aL = T.aR = -1.25; T.eL = T.eR = -0.95; T.zL = 0.1; T.zR = -0.1; T.lean -= 0.04; }       // holder tingen foran seg
    else if (p.pushT > 0) { T.lean += 0.22; T.chest += 0.1; T.aL = T.aR = -1.4; T.eL = T.eR = -0.2; }          // lener seg inn i det han dytter
  }
  if (!p.skid && p.state !== 'mantle' && p.state !== 'hang' && p.state !== 'swing' && mode !== 'fly' && p.onGround) T.lean += hero.accLean;

  // jevn overgang: armer/overkropp rolig, ben raskere; alt raskere i lufta og i hurk
  const quick = !p.onGround || p.windup > 0 || df > 0.2;
  const slowKeys = new Set(['aL', 'aR', 'zL', 'zR', 'eL', 'eR', 'lean', 'chest', 'twist', 'hy', 'hp']);
  for (const key in T) c[key] += (T[key] - c[key]) * (1 - Math.exp(-dt / (slowKeys.has(key) ? (quick ? (!p.onGround && p.airT < 0.25 ? 0.04 : 0.06) : 0.14) : (!p.onGround ? 0.05 : 0.08))));
  hero.armL.top.rotation.set(c.aL, 0, -c.zL); hero.armR.top.rotation.set(c.aR, 0, -c.zR);
  hero.armL.mid.rotation.x = c.eL; hero.armR.mid.rotation.x = c.eR;

  // bein: bland mellom FK-posene og IK (fast fot) etter om vi går/står
  hero.ikW += ((gaitOn ? 1 : 0) - hero.ikW) * (1 - Math.exp(-(gaitOn ? (p.landT < 0.12 ? 25 : 10) : 12) * dt));
  const w = hero.ikW, Lmax = hero.legL.l1 + hero.legL.l2;
  // hoftehøyde = laveste av de to føttenes rekkevidde (jevn funksjon; en av/på-test på «stående fot» ga et hopp i hoften ved hvert skritt)
  const Lc = 0.985 * Lmax, reach = (f) => ANKLE_H + f.y + Math.sqrt(Math.max(1e-4, Lc * Lc - f.z * f.z));
  const rA = reach(pathL), rB = reach(pathR), sh = Math.max(0, 0.05 - Math.abs(rA - rB)) / 0.05;   // myk min: ingen knekk der foten som begrenser hoften byttes
  const ikHip = Math.min(rA, rB) - sh * sh * 0.0125 - 0.02 * kSp - DIP_MAX * df;
  hero.bob += (bob - hero.bob) * (1 - Math.exp(-dt / 0.06));
  const hipY = 0.46 + hero.bob + (ikHip - (0.46 + hero.bob)) * w;
  const ikL = solveLeg(hero.legL, hipY, pathL.z, ANKLE_H + pathL.y), ikR = solveLeg(hero.legR, hipY, pathR.z, ANKLE_H + pathR.y);
  // skritt-lyd: lyd når en fot treffer gulvet (samme øyeblikk som animasjonen)
  const plL = pathL.y < 0.002, plR = pathR.y < 0.002;
  if (audio && mode === 'play' && gaitOn && hero.gaitWas) { if (plL && !hero.plL) footstep(-1, sp); if (plR && !hero.plR) footstep(1, sp); }
  hero.plL = plL; hero.plR = plR; hero.gaitWas = gaitOn;
  const mix = (fk, ik) => fk + (ik - fk) * w;
  hero.legL.top.rotation.x = mix(c.hL, ikL.theta); hero.legR.top.rotation.x = mix(c.hR, ikR.theta);
  hero.legL.mid.rotation.x = mix(c.kL, ikL.kappa); hero.legR.mid.rotation.x = mix(c.kR, ikR.kappa);
  hero.legL.footG.rotation.x = mix(c.fp, -(ikL.theta + ikL.kappa) + pathL.pitch); hero.legR.footG.rotation.x = mix(c.fp, -(ikR.theta + ikR.kappa) + pathR.pitch);
  hero.legL.top.position.y = hero.legR.top.position.y = hipY;

  // overkropp: bekken bærer lean, bryst bøyer og vrir mer, hodet ser dit kroppen går (pluss litt omkringsyn i hvile)
  hero.body.position.y = hipY;
  hero.body.rotation.x = c.lean; hero.body.rotation.y = -c.twist * 0.4;
  hero.chest.rotation.x = c.chest; hero.chest.rotation.y = c.twist;
  hero.head.rotation.x = c.hp - (c.lean + c.chest) * 0.7; hero.head.rotation.y = c.hy - c.twist * 0.6;

  // kroppen: i gange-modus snur fysikken gradvis; ellers begrenses snuhastigheten her
  const target = Math.atan2(p.fx, p.fz);
  if (P.gaitMode) hero.yaw = target;
  else {
    const d = ((target - hero.yaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    const maxStep = P.turnRate * dt;
    hero.yaw += Math.max(-maxStep, Math.min(maxStep, d));
  }
  hero.root.rotation.y = hero.yaw;
}
function lerpN(a, b, t) { return a + (b - a) * t; }

// ---------- tilstand ----------
initBodies(LEVEL);
const bodyMeshes = LEVEL.bodies.map((b) => {
  const sx = b.max[0] - b.min[0], sy = b.max[1] - b.min[1], sz = b.max[2] - b.min[2];
  const mesh = (b.kind && buildSingle(b.kind, [sx, sy, sz], { color: b.color, id: b.id, material: b.material })) || new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material({ type: b.type, material: b.material, color: b.color }));
  mesh.castShadow = mesh.receiveShadow = true; scene.add(mesh);
  return { b, mesh, size: [sx, sy, sz] };
});
// laget grep (hårgelé, papirbånd) opprettes av fysikken mens du spiller: tegnes her
const madeMeshes = new Map();
function syncMade() {
  const alive = new Set(LEVEL.made || []);
  for (const b of alive) {
    if (!madeMeshes.has(b)) {
      const sx = b.max[0] - b.min[0], sy = b.max[1] - b.min[1], sz = b.max[2] - b.min[2];
      const g = buildSingle(b.kind, [sx, sy, sz], { color: b.color, id: b.id, material: b.material });
      if (!g) continue;
      g.position.set(b.min[0] + sx / 2, b.min[1] + sy / 2, b.min[2] + sz / 2); scene.add(g); madeMeshes.set(b, { g, dry: false });
    }
    const m = madeMeshes.get(b);
    if (m && b.kind === 'gel' && !b.wet && !m.dry) { m.dry = true; m.g.userData.dry?.(); }
  }
  for (const [b, m] of madeMeshes) if (!alive.has(b)) { scene.remove(m.g); madeMeshes.delete(b); }
}
const shards = [];
function spawnShards(pos, color) {
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), new THREE.MeshStandardMaterial({ color: color ?? 0xdddddd, roughness: 0.4 }));
    m.position.set(...pos); m.castShadow = true; scene.add(m);
    shards.push({ m, v: new THREE.Vector3((Math.random() - 0.5) * 8, 3 + Math.random() * 5, (Math.random() - 0.5) * 8), t: 1.6 });
  }
}

const player = newPlayer(...LEVEL.start);
const save = { pos: [...LEVEL.start] };
const stats = { saves: 0, respawns: 0, broken: 0, resets: 0, hard: 0, flew: false };
let mode = 'play';                 // play | plan | fly
let won = false, clock = 0;

function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 1700);
}
const points = () => Math.max(0, SCORE.start - stats.saves * SCORE.save - stats.respawns * SCORE.respawn - stats.broken * SCORE.broken - stats.resets * SCORE.resetThings - stats.hard * SCORE.hardLand - Math.floor(clock / 10) * SCORE.perTenSeconds);
function placeFlag() { flag.position.set(save.pos[0], save.pos[1], save.pos[2]); }
placeFlag();

function doSave() {
  if (mode !== 'play') return toast('Gå ut av plan-/flymodus først');
  if (!player.onGround) return toast('Stå støtt for å lagre');
  save.pos = [player.x, player.y, player.z]; stats.saves++; placeFlag(); audio?.checkpoint();
  toast(`Lagringspunkt satt  −${SCORE.save} poeng`);
}
function goBack() {
  if (mode !== 'play') return;
  resetPlayer(player, ...save.pos); stats.respawns++;
  toast(`Tilbake til lagringspunkt  −${SCORE.respawn} poeng`);
}
function resetThings() {
  if (mode !== 'play') return;
  resetBodies(LEVEL, player); stats.resets++;
  toast(`Ting satt tilbake  −${SCORE.resetThings} poeng`);
}
function restartAll() {
  resetPlayer(player, ...LEVEL.start);
  resetBodies(LEVEL, player);
  save.pos = [...LEVEL.start]; stats.saves = stats.respawns = stats.broken = stats.resets = 0; stats.flew = false;
  won = false; clock = 0; placeFlag(); $('win').classList.add('hide'); setMode('play');
}

// ---------- modus: plan / fly ----------
const cam = { yaw: 0.35, pitch: 0.3, dist: 5.5, cur: 5.5, target: new THREE.Vector3(...LEVEL.start) };
let camFocusY = null;   // rolig høydefølging: kameraet hopper ikke med hvert hopp
const planCam = { yaw: 0.6, pitch: 0.7, dist: 55, pivot: new THREE.Vector3(8, 15, 0) };
if (levelName) {                                   // mindre rom: nærmere og mer ovenfra
  planCam.dist = Math.max(LEVEL.room.x1 - LEVEL.room.x0, LEVEL.room.z1 - LEVEL.room.z0) * 1.05;
  planCam.pitch = 1.15;
}

function setMode(m) {
  audio?.quietLoops();
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
let jumpEdge = false, grabEdge = false, carryEdge = false;
const touch = { x: 0, y: 0, jump: false, grab: false, carry: false };
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
  if (e.code === 'KeyF') carryEdge = true;
  if (e.code === 'KeyN') resetThings();
  if (e.code === 'KeyM') toggleSound();
  if (e.code === 'KeyV') toggleCues();
  if (e.code === 'KeyX') toggleAutoCam();
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
  c.yaw -= dx * 0.006; lastDrag = performance.now() / 1000;
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
bindBtn('btnCarry', 'carry', () => { carryEdge = true; });
$('bThings').onclick = resetThings;
$('bLevel').textContent = `Brett: ${levelLabel}`;
$('bLevel').onclick = () => { const i = LEVELS.findIndex((l) => l.id === levelId), n = LEVELS[(i + 1) % LEVELS.length].id; store.set('tlm.level', n); location.search = `?level=${n}`; };
$('bSound').onclick = toggleSound; $('bSound').textContent = soundMuted ? 'Lyd av' : 'Lyd'; $('bSound').classList.toggle('on', !soundMuted);
$('bSave').onclick = doSave; $('bBack').onclick = goBack;
$('bPlan').onclick = () => setMode('plan'); $('bFly').onclick = () => setMode('fly');
$('again').onclick = restartAll;

// ---------- innstillingspanel (hoppfølelse) ----------
const TUNE = [
  ['gravity', 'Tyngdekraft', -45, -14, 1], ['jump', 'Hoppkraft', 8, 16, 0.1], ['airJumps', 'Dobbelthopp (0 = av)', 0, 1, 1],
  ['airAccel', 'Styring i lufta', 2, 40, 1], ['speed', 'Løpefart', 3, 10, 0.1],
  ['accel', 'Akselerasjon', 4, 60, 1], ['decel', 'Bremsing', 4, 60, 1], ['turnDecel', 'Retningsskifte (lavt = tregt)', 4, 60, 1],
  ['jumpWindup', 'Hopp: forberedelse (s)', 0, 0.3, 0.01], ['mantleTime', 'Hiv deg opp: tid (s)', 0, 1.5, 0.05], ['landK', 'Landing: hurk per fallfart', 0, 0.05, 0.002],
  ['jumpBoost', 'Løpehopp: fartsfaktor', 1, 2, 0.05], ['turnRate', 'Snu-hastighet (rad/s)', 2, 16, 0.5],
  ['reachTime', 'Rekk-ut: varighet (s)', 0.1, 1, 0.05], ['reachCooldown', 'Rekk-ut: pause (s)', 0, 1.5, 0.05],
  ['reachAbove', 'Rekk-ut: ekstra rekkevidde opp', 0, 1.5, 0.05], ['ropeReach', 'Tau-rekkevidde', 0.8, 3.5, 0.1],
];
let presetName = store.get('tlm.preset2', 'prince');
if (!PRESETS[presetName]) presetName = 'prince';
applyPreset(presetName);
Object.assign(P, store.get('tlm.custom2', {}));
// ---------- lydmikser ----------
function mixerHtml() {
  const groups = {};
  for (const sd of SOUND_LIST) (groups[sd.group] ||= []).push(sd);
  return Object.entries(groups).map(([g, items]) => `<div class="mixg">${g}</div>` + items.map((sd) =>
    `<div class="mixrow"><div class="mixh"><span>${sd.label}</span><span><b data-val="${sd.id}"></b> <button class="pl" data-play="${sd.id}">▶</button></span></div><input type="range" data-mix="${sd.id}" min="0" max="2" step="0.05"></div>`).join('')).join('');
}
const mixText = (v) => (v <= 0 ? 'av' : `${Math.round(v * 100)} %`);
function wireMixer() {
  const mix = store.get('tlm.mix2', {});
  const setOne = (id, v, save = true) => {
    const el = document.querySelector(`[data-mix="${id}"]`), lab = document.querySelector(`[data-val="${id}"]`);
    if (el) el.value = v; if (lab) lab.textContent = mixText(v);
    if (save) { mix[id] = v; store.set('tlm.mix2', mix); }
    audio?.setLevel(id, v);
  };
  for (const sd of SOUND_LIST) {
    const v = mix[sd.id] ?? 1, el = document.querySelector(`[data-mix="${sd.id}"]`);
    el.value = v; document.querySelector(`[data-val="${sd.id}"]`).textContent = mixText(v);
    el.oninput = () => setOne(sd.id, +el.value);
  }
  document.querySelectorAll('[data-play]').forEach((btn) => {
    btn.onclick = () => { unlockAudio(); Promise.resolve(audio?.resume()).then(() => audio?.preview(btn.dataset.play)); };
  });
  $('mixAll100').onclick = () => SOUND_LIST.forEach((sd) => setOne(sd.id, 1));
  $('mixAllOff').onclick = () => SOUND_LIST.forEach((sd) => setOne(sd.id, 0));
  $('mixReset').onclick = () => { SOUND_LIST.forEach((sd) => setOne(sd.id, 1)); store.set('tlm.mix2', {}); store.set('tlm.reverb', null); $('s_rev').value = LEVEL.audio?.reverb ?? 0.12; $('v_rev').textContent = (+$('s_rev').value).toFixed(2); audio?.setReverb(LEVEL.audio?.reverb ?? 0.12); toast('Lyd nullstilt'); };
  const rev0 = store.get('tlm.reverb', null) ?? LEVEL.audio?.reverb ?? 0.12;
  $('s_rev').value = rev0; $('v_rev').textContent = (+rev0).toFixed(2);
  $('s_rev').oninput = (e) => { const v = +e.target.value; store.set('tlm.reverb', v); audio?.setReverb(v); $('v_rev').textContent = v.toFixed(2); };
}

// hjelpeobjekter (trappetrinn o.l. som brettlageren la inn for at ruten skal gå) kan merkes med gule kanter, så et menneske kan se over dem
const helperBoxes = LEVEL.boxes.filter((b) => b.helper), helperCount = helperBoxes.length;
const helperMarks = new THREE.Group(); helperMarks.visible = false; scene.add(helperMarks);
for (const b of helperBoxes) {
  const g = new THREE.BoxGeometry(b.max[0] - b.min[0] + 0.06, b.max[1] - b.min[1] + 0.06, b.max[2] - b.min[2] + 0.06);
  const l = new THREE.LineSegments(new THREE.EdgesGeometry(g), new THREE.LineBasicMaterial({ color: 0xffd23f }));
  l.position.set((b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2); helperMarks.add(l);
}

function buildPanel() {
  const p = $('panel');
  p.innerHTML = `<h3>Brett</h3>
    <select id="levelSel">${LEVELS.map((l) => `<option value="${l.id}">${l.label}</option>`).join('')}</select>
    <h3 style="margin-top:14px">Lyd</h3>
    <label>Hovedvolum <span id="v_vol"></span></label><input type="range" id="s_vol" min="0" max="1" step="0.05">
    <label>Etterklang (rom) <span id="v_rev"></span></label><input type="range" id="s_rev" min="0" max="0.8" step="0.02">
    <details open><summary>Lydmikser: volum for hver lyd (0 = av, ▶ spiller den)</summary>${mixerHtml()}
      <div class="row"><button id="mixAll100">Alle 100 %</button><button id="mixAllOff">Alle av</button><button id="mixReset">Nullstill lyd</button></div></details>
    <label style="display:flex;gap:8px;align-items:center;font-weight:600"><input type="checkbox" id="chkCues"> Lydtekst: vis tekst for lyder (V)</label>
    ${helperCount ? `<label style="display:flex;gap:8px;align-items:center;font-weight:600"><input type="checkbox" id="chkHelpers"> Merk ${helperCount} hjelpeobjekter (lagt inn av brettlageren)</label><small>${(LEVEL.report?.helpers || []).map((h) => `${h.id}: ${h.size_cm.join('×')} cm, topp ${h.top_cm} cm ved (${h.at_cm.join(', ')})`).join('<br>')}</small>` : ''}
    <label style="display:flex;gap:8px;align-items:center;font-weight:600"><input type="checkbox" id="chkAutoCam"> Kamera følger retning (X)</label>
    <h3 style="margin-top:14px">Hoppinnstillinger</h3>
    <label>Forhåndsinnstilling</label>
    <select id="presetSel">${Object.entries(PRESETS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}</select>
    <label style="display:flex;gap:8px;align-items:center;font-weight:600"><input type="checkbox" id="autoGrab"> Grip kanten automatisk</label>
    <div id="sliders"></div>
    <div class="row"><button id="resetPreset">Nullstill</button><button id="closePanel">Lukk</button></div>
    <small><b>Prince:</b> vekt og treghet: du bygger opp fart, snur ikke på stedet, hopp har forberedelse, landing etter fall tar tid og å hive seg opp tar tid. Hold C for å gå forsiktig.<br><b>Klassisk:</b> raskt, dobbelthopp, kanten grips av seg selv.<br><b>Spenning:</b> tyngre og tregere hopp, ingen dobbelthopp. Du må trykke REKK UT (Shift/E) i riktig øyeblikk for å gripe kant eller tau.</small>`;
  $('s_vol').value = store.get('tlm.vol', 0.7); $('v_vol').textContent = (+$('s_vol').value).toFixed(2);
  $('s_vol').oninput = (e) => { const v = +e.target.value; store.set('tlm.vol', v); audio?.setVolume(v); $('v_vol').textContent = v.toFixed(2); };
  $('levelSel').value = levelId;
  $('levelSel').onchange = (e) => { store.set('tlm.level', e.target.value); location.search = `?level=${e.target.value}`; };
  wireMixer();
  if ($('chkHelpers')) { $('chkHelpers').checked = helperMarks.visible; $('chkHelpers').onchange = (e) => { helperMarks.visible = e.target.checked; }; }
  $('chkAutoCam').checked = autoCam; $('chkAutoCam').onchange = (e) => { autoCam = e.target.checked; store.set('tlm.autocam', autoCam); };
  $('chkCues').checked = cuesOn; $('chkCues').onchange = (e) => { cuesOn = e.target.checked; store.set('tlm.cues', cuesOn); };
  $('presetSel').value = presetName;
  $('autoGrab').checked = P.autoGrab;
  $('autoGrab').onchange = (e) => { P.autoGrab = e.target.checked; saveCustom(); };
  $('sliders').innerHTML = TUNE.map(([k, label, min, max, st]) =>
    `<label>${label}<span id="v_${k}">${(+P[k]).toFixed(2)}</span></label><input type="range" id="s_${k}" min="${min}" max="${max}" step="${st}" value="${P[k]}">`).join('');
  for (const [k] of TUNE) $('s_' + k).oninput = (e) => { P[k] = +e.target.value; $('v_' + k).textContent = (+P[k]).toFixed(2); saveCustom(); };
  $('presetSel').onchange = (e) => { presetName = e.target.value; store.set('tlm.preset2', presetName); applyPreset(presetName); store.set('tlm.custom2', {}); buildPanel(); };
  $('resetPreset').onclick = () => { applyPreset(presetName); store.set('tlm.custom2', {}); buildPanel(); toast('Nullstilt'); };
  $('closePanel').onclick = () => $('panel').classList.add('hide');
}
function saveCustom() { const o = { autoGrab: P.autoGrab }; for (const [k] of TUNE) o[k] = P[k]; store.set('tlm.custom2', o); }
$('bSet').onclick = () => { buildPanel(); $('help').classList.add('hide'); $('panel').classList.toggle('hide'); };
setTimeout(() => $('help').classList.add('hide'), 15000);   // H henter den tilbake

// ---------- oppdatering ----------
const V = new THREE.Vector3();
function axes() {
  // dødsone på stikken: en tommel som bare hviler der skal ikke gi bevegelse (ga skjelvende armer og mikroskritt)
  const mag = Math.hypot(touch.x, touch.y), DZ = 0.22, tk = mag < DZ ? 0 : (mag - DZ) / (1 - DZ) / mag;
  const ix = (held('KeyD', 'ArrowRight') ? 1 : 0) - (held('KeyA', 'ArrowLeft') ? 1 : 0) + touch.x * tk;
  const iz = (held('KeyW', 'ArrowUp') ? 1 : 0) - (held('KeyS', 'ArrowDown') ? 1 : 0) + touch.y * tk;
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
    carryPressed: carryEdge, carryHeld: held('KeyF') || touch.carry,
    walk: held('KeyC', 'AltLeft', 'AltRight'),
  };
  jumpEdge = grabEdge = carryEdge = false;
  const pre = { onGround: player.onGround, vy: player.vy, state: player.state, windup: player.windup, carry: !!player.carry, hard: player.hardLands, reach: player.reach > 0, bodies: (LEVEL.bodies || []).map((b) => b.min[0] + b.min[2]) };
  step(player, inp, dt, LEVEL);
  if (autoCam && mode === 'play' && player.onGround && !player.carry && performance.now() / 1000 - lastDrag > 1.5) {       // sving kameraet bak figuren
    const sp = Math.hypot(player.vx, player.vz);
    if (sp > 0.8) {
      const want = Math.atan2(-player.fx, -player.fz), d = ((want - cam.yaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
      cam.yaw += Math.max(-1, Math.min(1, d)) * Math.min(1, 0.6 * Math.min(1, sp / P.speed) * dt * Math.min(1, Math.abs(d) * 1.5 + 0.2));
    }
  }
  audioFrame(pre, dt); cueFrame(pre); ambientTick(dt);

  if (player.onGround && player.groundBox?.cp && player.y > save.pos[1] + 0.01) { save.pos = [player.x, player.y, player.z]; placeFlag(); toast('Sjekkpunkt'); audio?.checkpoint(); cue('sjekkpunkt'); }
  if (player.y < LEVEL.deathY) { resetPlayer(player, ...save.pos); stats.respawns++; toast(`Falt – tilbake til lagringspunkt  −${SCORE.respawn} poeng`); }
  for (const ev of drainEvents(LEVEL)) {
    if (ev.type === 'broke') { audio?.shatter(); cue('noe knuses'); stats.broken++; spawnShards(ev.pos, LEVEL.bodies.find((b) => b.id === ev.id)?.color); toast(`${ev.id} gikk i stykker  −${SCORE.broken} poeng`); }
    else if (ev.type === 'lost') { audio?.splash('pit'); cue('plask'); toast(`${ev.id} forsvant`); }
    else if (ev.type === 'use') audio?.pickup();
    else if (ev.type === 'tore') { audio?.drop('paper'); toast('Papirbåndet revnet'); }
  }
  if (player.hardLands > pre.hard) { stats.hard++; toast(`Hardt landet – bedøvet  −${SCORE.hardLand} poeng`); }
  if (player.knockout) {
    player.knockout = false; audio?.crush();
    resetPlayer(player, ...save.pos); stats.respawns++;
    toast(`Landet for hardt – tilbake til lagringspunkt  −${SCORE.respawn} poeng`);
  }
  if (player.crushed) {
    const id = player.crushed; player.crushed = null; audio?.crush(); cue('dunk: klemt');
    resetPlayer(player, ...save.pos); stats.respawns++;
    toast(`Klemt av ${id}!  −${SCORE.respawn} poeng`);
  }
  const hz = inHazard(LEVEL, player);
  if (hz) {
    audio?.splash(hz.type === 'flush' ? 'flush' : 'pit'); cue(hz.type === 'flush' ? 'skylling' : 'plask');
    resetPlayer(player, ...(hz.type === 'flush' ? LEVEL.start : save.pos)); stats.respawns++;
    toast(`${hz.message || 'Fare!'}  −${SCORE.respawn} poeng`);
  }

  const g = LEVEL.goal;
  if (!won && Math.hypot(player.x - g[0], player.z - g[2]) < 2 && Math.abs(player.y - g[1]) < 2.5) {
    won = true; audio?.win();
    $('winStats').innerHTML = `Tid: ${clock.toFixed(1)} s<br>Lagringspunkter brukt: ${stats.saves}<br>Tilbakeføringer: ${stats.respawns}<br>Ting knust: ${stats.broken} · nullstilt: ${stats.resets}<br><b style="font-size:22px">Poeng: ${points()}</b>` +
      (stats.flew ? '<br><i>Flymodus ble brukt – resultatet er ikke gyldig</i>' : '');
    $('win').classList.remove('hide');
  }
}

// romlyd: dryppende kran m.m. fra brettets audio.ambience, planlagt her slik at lydtekst virker uten lyd
const AMB = LEVEL.audio?.ambience || [];
const dripSrc = LEVEL.boxes.find((b) => b.kind === 'faucet');
let dripT = 1 + Math.random() * 2;
function panOf(x, z) {                                       // -1 venstre … +1 høyre sett fra kameraet
  const rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
  return Math.max(-1, Math.min(1, ((x - player.x) * rx + (z - player.z) * rz) / 14));
}
function ambientTick(dt) {
  if (mode === 'plan') return;
  if (AMB.includes('fan')) audio?.hum(0.05);
  if (AMB.includes('drip')) {
    dripT -= dt;
    if (dripT <= 0) {
      dripT = 2.4 + Math.random() * 3.6;
      const pan = dripSrc ? panOf((dripSrc.min[0] + dripSrc.max[0]) / 2, (dripSrc.min[2] + dripSrc.max[2]) / 2) : 0;
      audio?.drip(pan); cue('drypp', pan);
    }
  }
}
// lydtekst for det som skjer (uavhengig av om lyden er på)
function cueFrame(pre) {
  const p = player;
  if (!pre.onGround && p.onGround && pre.vy < -9) cue(p.landImpact >= P.hardLand ? 'hard landing' : 'landing');
  if (pre.state !== 'hang' && p.state === 'hang') cue('tak i kanten');
  if (!pre.carry && p.carry) cue('tok tingen');
  if (pre.carry && !p.carry) cue('slapp / kastet');
}

// lyder som følger av hva som skjedde i dette bildet
function audioFrame(pre, dt) {
  if (!audio) return;
  const p = player, sp = Math.hypot(p.vx, p.vz), surf = surfaceOf(p.groundBox);
  if (pre.windup === 0 && p.windup > 0) audio.windup();                                       // tar sats
  if (pre.onGround && !p.onGround && p.vy > 5) audio.jump();                                  // avspark
  if (!pre.onGround && p.onGround && pre.vy < -3) audio.land(surf, -pre.vy);                  // landing
  if (pre.state !== 'hang' && p.state === 'hang') audio.grab();
  if (pre.state !== 'climb' && p.state === 'climb') audio.grab();
  if (pre.state !== 'swing' && p.state === 'swing') audio.grab();
  if (pre.state !== 'mantle' && p.state === 'mantle') audio.mantle();
  if (!pre.reach && p.reach > 0) audio.reach();
  if (!pre.carry && p.carry) audio.pickup();
  if (pre.carry && !p.carry) audio.drop(surf);
  audio.fall(p.state === 'air' && p.vy < 0 ? -p.vy : 0);                                      // fallvind
  audio.skid(p.skid ? Math.min(1, sp / P.speed) : 0);
  let moved = 0; (LEVEL.bodies || []).forEach((b, i) => { if (b.alive && !b.carried) moved += Math.abs(b.min[0] + b.min[2] - pre.bodies[i]); });
  audio.scrape(Math.min(1, moved / (dt * 3)));                                               // dytting
  audio.tick(dt, { active: true, speed01: sp / P.speed, climbing: ['hang', 'mantle', 'swing', 'climb'].includes(p.state) });
}

// ---------- tegning ----------
function insideAny(x, y, z, m) {
  for (const b of LEVEL.boxes) if (!b.carried && x > b.min[0] - m && x < b.max[0] + m && y > b.min[1] - m && y < b.max[1] + m && z > b.min[2] - m && z < b.max[2] + m) return true;
  return false;
}

function render(now, dt) {
  poseHero(player, now, dt, mode);
  updateArc(); syncMade();
  hero.root.position.set(player.x, player.y, player.z);
  hero.root.scale.set(1, 1, 1);                                  // ingen strekk/klem: det ga «puls» og sjøsyke

  for (const { r, line, end } of ropes) {
    const a = new THREE.Vector3(r.x, r.y, r.z);
    const b = player.rope === r ? new THREE.Vector3(player.x, player.y + 0.85, player.z) : new THREE.Vector3(r.x, r.y - r.len, r.z);
    setCyl(line, a, b); end.position.copy(b);
  }
  for (const { b, mesh, size } of bodyMeshes) {
    mesh.visible = b.alive;
    const bx = b.max[0] - b.min[0], by = b.max[1] - b.min[1], bz = b.max[2] - b.min[2];
    mesh.position.set(b.min[0] + bx / 2, b.min[1] + by / 2, b.min[2] + bz / 2);
    if (b.pole) mesh.rotation.y = b.carried ? Math.atan2(-player.fz, player.fx) : (bz > bx ? Math.PI / 2 : 0);   // staven peker fremover når du bærer den
  }
  for (let i = shards.length - 1; i >= 0; i--) {
    const s = shards[i]; s.t -= dt; s.v.y -= 22 * dt;
    s.m.position.addScaledVector(s.v, dt);
    if (s.m.position.y < 0.12) { s.m.position.y = 0.12; s.v.set(0, 0, 0); }
    if (s.t <= 0) { scene.remove(s.m); shards.splice(i, 1); }
  }
  const hint = $('hint');
  if (mode === 'play' && !won) {
    const t = player.carry ? null : findCarryTarget(player, LEVEL);
    hint.textContent = player.carry ? (player.charge >= P.throwMin ? 'Slipp F: KAST' : toolHint(player, LEVEL) === 'gel' ? 'F: smør gel på veggen · hold F: kast' : toolHint(player, LEVEL) === 'roll' ? 'F: rull ut et bånd over kanten · hold F: kast' : (() => { const sp = findPlaceSpot(player, LEVEL); return (sp && sp.c.type !== 'floor' && sp.min[1] > player.y + 0.2 ? `F: sett på ${sp.c.id || 'flaten'}` : 'F: slipp') + ' · hold F: kast'; })()) : t ? `F: ta ${t.id}` : '';
    hint.classList.toggle('hide', !hint.textContent);
  } else hint.classList.add('hide');
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
    if (camFocusY === null || Math.hypot(player.x - cam.target.x, player.z - cam.target.z) > 12 || Math.abs(player.y - camFocusY) > 14) {
      camFocusY = player.y; cam.target.set(player.x, player.y + 0.62, player.z);   // stor teleportering (respawn): hopp direkte
    }
    const settled = player.onGround || ['hang', 'mantle', 'swing', 'climb'].includes(player.state) || mode === 'fly';
    if (settled) camFocusY += (player.y - camFocusY) * (1 - Math.pow(0.08, dt));        // følg rolig når du står
    else camFocusY = Math.min(player.y + 0.9, Math.max(player.y - 0.9, camFocusY));       // i lufta: ikke følg hvert hopp
    const kxz = 1 - Math.pow(0.04, dt);
    cam.target.x += (player.x - cam.target.x) * kxz; cam.target.z += (player.z - cam.target.z) * kxz;
    cam.target.y = camFocusY + 0.62;
    const cp = Math.cos(cam.pitch), dir = new THREE.Vector3(Math.sin(cam.yaw) * cp, Math.sin(cam.pitch), Math.cos(cam.yaw) * cp);
    let d = cam.dist;
    for (; d > 1.1; d -= 0.2) { if (!insideAny(cam.target.x + dir.x * d, cam.target.y + dir.y * d, cam.target.z + dir.z * d, 0.25)) break; }
    cam.cur += (d - cam.cur) * (d < cam.cur ? 0.5 : 0.08);
    camera.position.copy(cam.target).addScaledVector(dir, cam.cur);
    camera.lookAt(cam.target);
  }
  sun.target.position.set(player.x, player.y, player.z);
  sun.position.set(player.x + SUN[0], player.y + SUN[1], player.z + SUN[2]);
  renderer.render(scene, camera);
  $('hud').textContent =
    `v${VERSION} · ${levelLabel} · ${mode === 'plan' ? 'PLAN' : mode === 'fly' ? 'FLY' : player.state}${player.sliding ? ' (glir)' : ''}${player.reach > 0 ? ' · REKKER UT' : ''}\n` +
    `høyde ${player.y.toFixed(1)}  tid ${clock.toFixed(0)}s${player.state === 'climb' || player.stam < P.stamina - 0.05 ? '  grep ' + '▮'.repeat(Math.max(0, Math.round(10 * player.stam / P.stamina))) + '▯'.repeat(10 - Math.max(0, Math.round(10 * player.stam / P.stamina))) : ''}\nlagret ${stats.saves} · tilbake ${stats.respawns} · poeng ${points()}`;
}

function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (!window.__paused) update(dt);
  render(now, dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

window.__game = { touch, get audio() { return audio; }, unlockAudio, player, LEVEL, P, save, stats, setMode, cam, planCam, restartAll, update, poseHero, hero, tick: (n, dt = 1 / 60) => { for (let i = 0; i < n; i++) update(dt); } };   // tick: kjør spillogikk raskt (testing)
