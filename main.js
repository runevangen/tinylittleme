import * as THREE from 'three';
import { RoomEnvironment } from './lib/RoomEnvironment.js';
import { createAudio, surfaceOf, SOUND_LIST } from './audio.js';
import { VERSION } from './version.js';
import { buildGroup, buildSingle, roundedBoxGeo } from './props.js';
import { createVoice } from './voice.js';
import { P, PRESETS, applyPreset, newPlayer, resetPlayer, step, freeAt, inHazard, initBodies, resetBodies, drainEvents, findCarryTarget, findPlaceSpot, throwVelocity, toolHint, zipNear, findReachTarget } from './physics.js';

const $ = (id) => document.getElementById(id);
// mobil (berøring) er hovedplattformen: tekst som nevner taster skal si knappene i stedet
const TOUCH = matchMedia('(pointer:coarse)').matches;
const GREP = TOUCH ? 'GREP' : 'Shift/E', TA = TOUCH ? 'TA' : 'F', key = (k) => (TOUCH ? '' : ` (${k})`);
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
function primeVoice() { try { if (hasTTS) speechSynthesis.speak(Object.assign(new SpeechSynthesisUtterance(' '), { volume: 0 })); } catch { /* ok */ } }
function unlockAudio() {
  primeVoice();
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

let vibOn = store.get('tlm.vib', true);
const buzz = (ms) => { if (vibOn && navigator.vibrate) try { navigator.vibrate(ms); } catch { /* ikke støttet */ } };   // Android; iOS Safari støtter ikke vibrasjon

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

// brukslapper: små lapper med bruksanvisning ved ting som kan gjøre noe (brettets `hints`, bl.a. i treningsrommet). Vises når du er nær.
let labelsOn = store.get('tlm.labels', true);
const labels = [];
function makeBadge() {                                         // liten «i»-merking som viser at tingen kan gjøre noe
  const c = document.createElement('canvas'); c.width = c.height = 96; const g = c.getContext('2d');
  g.fillStyle = 'rgba(18,26,44,0.92)'; g.beginPath(); g.arc(48, 48, 44, 0, 7); g.fill();
  g.strokeStyle = '#ffa940'; g.lineWidth = 6; g.stroke();
  g.fillStyle = '#ffd9a0'; g.font = '700 54px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('i', 48, 52);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, opacity: 0, sizeAttenuation: false }));
  sp.scale.set(0.045, 0.045, 1); sp.renderOrder = 20; sp.visible = false; return sp;
}
// hjelpekort: en skuff som sklir inn fra høyre når du kommer nær noe du ikke har lest om, og sklir ut igjen etter noen sekunder.
// Fliken («i») blir stående ved kanten: trykk på den for å hente teksten frem igjen (for tingen nær deg, ellers den siste).
const infoCard = document.createElement('div'); infoCard.id = 'infocard';
infoCard.innerHTML = '<button id="infotab" aria-label="Vis hjelp">i</button><div id="infobody"></div>'; document.body.appendChild(infoCard);
const infoBody = infoCard.querySelector('#infobody'), infoTab = infoCard.querySelector('#infotab');
const infoSeen = new Set(); let infoCur = null, infoOpen = false, infoPinned = false, infoT = 0, infoLast = null;
function openInfo(l, pinned) {
  if (!l) return;
  infoCur = l; infoLast = l; infoBody.innerHTML = `<b>${l.title}</b>${l.body ? `<span>${l.body}</span>` : ''}`;
  infoOpen = true; infoPinned = !!pinned; infoT = pinned ? 9 : 5.5; infoCard.classList.add('show'); infoSeen.add(l);
}
function closeInfo() { infoOpen = false; infoPinned = false; infoCard.classList.remove('show'); }
infoTab.addEventListener('click', () => { if (infoOpen) closeInfo(); else { const n = labels.filter((l) => l.d < 13).sort((a, b) => a.d - b.d)[0] || infoLast; if (n) openInfo(n, true); } });
infoBody.addEventListener('click', closeInfo);
for (const h of LEVEL.hints || []) { const sp = makeBadge(); sp.position.set(...h.pos); scene.add(sp); const [title, ...rest] = h.text.split('\n'); labels.push({ sp, pos: h.pos, title, body: rest.join(' ') }); }
let infoPrev = performance.now();
function updateLabels() {
  const now = performance.now(), dt = Math.min(0.1, (now - infoPrev) / 1000); infoPrev = now;
  let near = null;
  for (const l of labels) { l.d = Math.hypot(player.x - l.pos[0], player.z - l.pos[2], (player.y - l.pos[1]) * 0.5); if (!near || l.d < near.d) near = l; }
  const on = labelsOn && mode === 'play' && labels.length > 0;
  for (const l of labels) {
    const o = on ? Math.max(0, Math.min(1, (13 - l.d) / 4)) : 0;
    l.sp.material.opacity += (o - l.sp.material.opacity) * 0.2; l.sp.visible = l.sp.material.opacity > 0.03;
  }
  infoCard.style.display = on ? '' : 'none';
  if (!on) { if (infoOpen) closeInfo(); return; }
  infoTab.classList.toggle('dim', !(near && near.d < 13) && !infoLast);
  if (!infoOpen && near && near.d < 5.5 && !infoSeen.has(near)) openInfo(near, false);              // første gang du kommer nær: skyv inn
  if (infoOpen) {
    infoT -= dt;
    if (infoPinned ? (infoCur && infoCur.d > 9) : infoT <= 0) closeInfo();                          // lest ferdig eller gått bort
  }
}

const nice = (id) => (id && (LEVEL.hints || []).find((h) => h.id === id)?.text.split('\n')[0]) || id || 'flaten';   // pent navn til hint-linja når brettet har en lapp for tingen

// grep-kode: alt som kan klatres i har en varm oransje kant (alltid litt synlig); «Fremhev grep» i ⚙ gjør dem tydeligere og pulserende
let gripHi = store.get('tlm.griphi', false);
const gripMarks = [];
function gripMark(b) {
  const sx = b.max[0] - b.min[0] + 0.08, sy = b.max[1] - b.min[1] + 0.08, sz = b.max[2] - b.min[2] + 0.08;
  const g = new THREE.Group(), cx = (b.min[0] + b.max[0]) / 2, cy = (b.min[1] + b.max[1]) / 2, cz = (b.min[2] + b.max[2]) / 2;
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(sx, sy, sz)), new THREE.LineBasicMaterial({ color: 0xffa940, transparent: true, opacity: 0.6 }));
  const glow = new THREE.Mesh(new THREE.BoxGeometry(sx + 0.06, sy + 0.06, sz + 0.06), new THREE.MeshBasicMaterial({ color: 0xffa940, transparent: true, opacity: 0.2, depthWrite: false }));
  g.add(edges, glow); g.position.set(cx, cy, cz); scene.add(g);
  const m = { g, edges, glow }; gripMarks.push(m); return m;
}

// synlige objekter per kollisjonsboks: brukes til å tone ut ting som står mellom kamera og figur
const fadeEntries = [];
const regFade = (obj, boxes, extra = []) => { if (boxes.some((b) => b.type !== 'floor')) fadeEntries.push({ obj: [obj, ...extra], boxes: boxes.filter((b) => b.type !== 'floor'), t: 0, orig: new Map(), clone: new Map() }); };

// ting som består av flere bokser (do, badekar …) tegnes som én ekte form; kollisjonen er fortsatt boksene
const drawn = new Set(); let hasToilet = false;
{
  const groups = new Map();
  for (const b of LEVEL.boxes) if (b.group) { if (!groups.has(b.group)) groups.set(b.group, []); groups.get(b.group).push(b); }
  for (const [, members] of groups) {
    const o = buildGroup(members); if (!o) continue;
    scene.add(o); members.forEach((m) => drawn.add(m)); regFade(o, members);
    if (members.some((m) => m.kind === 'toilet_tank')) hasToilet = true;
  }
}
for (const b of LEVEL.boxes) {
  if (drawn.has(b)) continue;
  const sx = b.max[0] - b.min[0], sy = b.max[1] - b.min[1], sz = b.max[2] - b.min[2];
  const cx = b.min[0] + sx / 2, cy = b.min[1] + sy / 2, cz = b.min[2] + sz / 2;
  const shaped = b.kind && b.type !== 'floor' && b.type !== 'wall' && !b.dyn ? buildSingle(b.kind, [sx, sy, sz], { color: b.color, id: b.id, material: b.material }) : null;
  if (b.grip) gripMark(b);
  if (shaped) { shaped.position.set(cx, cy, cz); scene.add(shaped); regFade(shaped, [b]); continue; }
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
  const fadeExtra = [];

  if (b.type === 'book' && sy > 1 && Math.min(sx, sz) > 1.5) {
    // liggende bok: sider synlige på tre sider, rygg mot -x
    const pm = new THREE.Mesh(new THREE.BoxGeometry(sx - 0.3, Math.max(0.2, sy - 0.24), sz + 0.04), pageMat);
    pm.position.set(cx + 0.17, cy, cz); pm.castShadow = false; pm.receiveShadow = true; scene.add(pm); fadeExtra.push(pm);
  }
  regFade(m, [b], fadeExtra);
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
  // liten utforsker: oransje jakke, grønnblått skjerf, gul hjelm med lykt og briller, sekk og verktøybelte (kontrast mot det hvite badet)
  const mat = (color, rough = 0.75, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, ...extra });
  const M = {
    skin: mat(0xf0c09e, 0.6), jacket: mat(0xe8742a, 0.8), jacketD: mat(0xc4561a, 0.85), scarf: mat(0x23a6a0, 0.9), pants: mat(0x3a4a5a, 0.85),
    boot: mat(0x7a5236, 0.7), sole: mat(0xe9e0cf, 0.8), glove: mat(0x5a3d28, 0.8), hair: mat(0x4a2f1c, 0.8), helmet: mat(0xf3b938, 0.45),
    strap: mat(0x5a3d28, 0.85), lens: new THREE.MeshPhysicalMaterial({ color: 0xffe27a, roughness: 0.1, transparent: true, opacity: 0.7 }),
    lamp: new THREE.MeshStandardMaterial({ color: 0xfff6c8, emissive: 0xffe9a0, emissiveIntensity: 0.9 }), pack: mat(0x6f7a3a, 0.9), roll: mat(0x4d6d82, 0.9),
    pouch: mat(0x8a6a46, 0.85), gold: mat(0xd8b24a, 0.35, { metalness: 0.8 }), white: new THREE.MeshBasicMaterial({ color: 0xffffff }), pupil: new THREE.MeshBasicMaterial({ color: 0x1b1b1b }),
    brow: mat(0x3a2418, 0.9), mouth: new THREE.MeshBasicMaterial({ color: 0x8a3030 }), blush: new THREE.MeshBasicMaterial({ color: 0xf08080, transparent: true, opacity: 0 }),
    sweat: new THREE.MeshStandardMaterial({ color: 0x9fd8f0, roughness: 0.1, transparent: true, opacity: 0.85 }), line: new THREE.MeshBasicMaterial({ color: 0x241d20, side: THREE.BackSide }),
  };
  const shadow = (m) => { m.castShadow = true; return m; };
  const outline = (m, k = 1.07) => { const o = new THREE.Mesh(m.geometry, M.line); o.scale.setScalar(k); m.add(o); return m; };      // tegneserie-kant (omvendt skall)
  const cap = (r, l, mat, ol = true) => { const m = shadow(new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 6, 12), mat)); return ol ? outline(m, 1.08) : m; };
  const limb = (up, lo, r, mat, matLo = mat) => {
    const top = new THREE.Group(), u = cap(r, up, mat); u.position.y = -(up / 2 + r * 0.6); top.add(u);
    const mid = new THREE.Group(); mid.position.y = -(up + r * 1.2); top.add(mid);
    const l = cap(r * 0.9, lo, matLo); l.position.y = -(lo / 2 + r * 0.6); mid.add(l);
    return { top, mid, end: -(lo + r * 1.2), l1: up + r * 1.2, l2: lo + r * 1.2 };
  };

  // ryggrad i to deler: bekken (følger hoftene) og bryst (kan bøye og vri seg)
  const body = new THREE.Group(); body.position.y = 0.46; rig.add(body);
  const pelvis = cap(0.08, 0.05, M.pants); pelvis.scale.set(1.4, 1, 0.9); body.add(pelvis);
  const belt = shadow(new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.014, 8, 24), M.strap)); belt.rotation.x = Math.PI / 2; belt.scale.set(1.35, 0.95, 1); belt.position.y = 0.045; body.add(belt);
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.026, 0.012), M.gold); buckle.position.set(0, 0.045, 0.098); body.add(buckle);
  for (const sx of [-1, 1]) { const po = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.03), M.pouch)); po.position.set(sx * 0.1, 0.03, 0.055); po.rotation.y = sx * 0.5; body.add(po); }
  const chest = new THREE.Group(); chest.position.y = 0.09; body.add(chest);
  const torso = cap(0.088, 0.17, M.jacket); torso.scale.set(1.25, 1, 0.8); torso.position.y = 0.09; chest.add(torso);
  const zip = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.17, 0.006), M.jacketD); zip.position.set(0, 0.1, 0.0775); chest.add(zip);
  const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.035, 0.01), M.jacketD); pocket.position.set(0.055, 0.12, 0.074); pocket.rotation.y = 0.35; chest.add(pocket);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.05, 10), M.skin); neck.position.y = 0.2; chest.add(neck);
  const scarfRing = shadow(new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.024, 8, 18), M.scarf)); scarfRing.rotation.x = Math.PI / 2; scarfRing.position.y = 0.195; scarfRing.scale.set(1.15, 1, 1); chest.add(scarfRing);
  const knot = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), M.scarf)); knot.position.set(0.04, 0.185, 0.06); chest.add(knot);
  // skjerfhaler (to ledd) som flagrer bakover med farten
  const tailA = new THREE.Group(); tailA.position.set(0.02, 0.19, -0.058); chest.add(tailA);
  const tA = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.012), M.scarf)); tA.position.y = -0.05; tailA.add(tA);
  const tailB = new THREE.Group(); tailB.position.y = -0.1; tailA.add(tailB);
  const tB = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.085, 0.012), M.scarf)); tB.position.y = -0.0425; tailB.add(tB);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.012, 0.014), M.jacket); stripe.position.y = -0.07; tailB.add(stripe);
  // sekk med sovepose
  const packG = new THREE.Group(); packG.position.set(0, 0.09, -0.1); chest.add(packG);
  const pk = shadow(new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.1, 5, 10), M.pack)); pk.scale.set(1.3, 1, 0.8); packG.add(pk);
  const rollM = shadow(new THREE.Mesh(new THREE.CapsuleGeometry(0.028, 0.1, 5, 10), M.roll)); rollM.rotation.z = Math.PI / 2; rollM.position.y = 0.105; packG.add(rollM);
  const flap = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 0.02), M.pouch); flap.position.set(0, 0.0, -0.03); packG.add(flap);

  // hode (stort og tydelig): hjelm, lykt, briller, hår under hjelmen og et ansikt som kan uttrykke seg
  const HS = 1.38;
  const head = new THREE.Group(); head.position.y = 0.265; chest.add(head);
  const headS = new THREE.Group(); headS.scale.setScalar(HS); head.add(headS);
  const skull = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.075, 24, 18), M.skin)); outline(skull, 1.05); headS.add(skull);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.0125, 8, 8), M.skin); nose.position.set(0, -0.008, 0.077); nose.scale.set(1, 0.9, 1.1); headS.add(nose);
  for (const sx of [-1, 1]) { const ear = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.017, 8, 8), M.skin)); ear.position.set(sx * 0.076, -0.005, 0); ear.scale.set(0.6, 1, 0.9); headS.add(ear); }
  const helmet = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.084, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.52), M.helmet)); outline(helmet, 1.05); helmet.rotation.x = -0.12; helmet.position.y = 0.012; headS.add(helmet);
  const visor = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.008, 20, 1, false, -Math.PI * 0.45, Math.PI * 0.9), M.helmet)); visor.rotation.set(0.15, 0, 0); visor.position.set(0, 0.034, 0.045); visor.rotation.y = Math.PI * 0.5 * 0; headS.add(visor);
  const hStrap = new THREE.Mesh(new THREE.TorusGeometry(0.081, 0.0055, 6, 28), M.strap); hStrap.rotation.x = Math.PI / 2 + 0.12; hStrap.position.y = 0.047; headS.add(hStrap);
  for (const sx of [-1, 1]) {                                              // briller skjøvet opp på hjelmen
    const ring = shadow(new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.005, 6, 14), M.strap)); ring.position.set(sx * 0.03, 0.062, 0.062); ring.rotation.x = -0.6; headS.add(ring);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.019, 14), M.lens); lens.position.set(sx * 0.03, 0.0625, 0.0635); lens.rotation.x = -0.6; headS.add(lens);
  }
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.016, 0.02, 10), M.lamp); lamp.rotation.x = Math.PI / 2 - 0.5; lamp.position.set(0, 0.083, 0.035); headS.add(lamp);
  for (const [x, y, z, r] of [[0, 0.0, -0.074, 0.02], [-0.04, -0.005, -0.066, 0.017], [0.04, -0.005, -0.066, 0.017], [0.07, 0.005, -0.03, 0.014], [-0.07, 0.005, -0.03, 0.014]]) {
    const h = shadow(new THREE.Mesh(new THREE.SphereGeometry(r, 8, 8), M.hair)); h.position.set(x, y, z); headS.add(h);       // hår som titter ut under hjelmen
  }
  // ansikt
  const face = { eyes: [], pupils: [], brows: [], blush: [] };
  for (const sx of [-1, 1]) {
    const eye = new THREE.Group(); eye.position.set(sx * 0.03, 0.006, 0.0655); headS.add(eye);
    const white = new THREE.Mesh(new THREE.SphereGeometry(0.0215, 14, 12), M.white); white.scale.set(1, 1.15, 0.45); eye.add(white);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.0125, 12, 10), M.pupil); pupil.scale.set(1, 1.1, 0.5); pupil.position.z = 0.0065; eye.add(pupil);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.0042, 6, 6), M.white); glint.position.set(0.004, 0.005, 0.0105); pupil.add(glint);
    face.eyes.push(eye); face.pupils.push(pupil);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.0075, 0.008), M.brow); brow.position.set(sx * 0.031, 0.04, 0.064); headS.add(brow); face.brows.push(brow);
    const bl = new THREE.Mesh(new THREE.CircleGeometry(0.014, 12), M.blush); bl.position.set(sx * 0.047, -0.02, 0.06); bl.rotation.y = sx * 0.55; headS.add(bl); face.blush.push(bl);
  }
  face.smile = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.0042, 6, 14, Math.PI), M.mouth); face.smile.position.set(0, -0.03, 0.0715); headS.add(face.smile);
  face.open = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), M.mouth); face.open.position.set(0, -0.034, 0.07); face.open.scale.set(1, 1, 0.4); face.open.visible = false; headS.add(face.open);
  face.sweat = new THREE.Group(); { const d = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 8), M.sweat); const c = new THREE.Mesh(new THREE.ConeGeometry(0.0085, 0.02, 8), M.sweat); c.position.y = 0.014; face.sweat.add(d, c); face.sweat.position.set(0.062, 0.035, 0.045); face.sweat.visible = false; headS.add(face.sweat); }

  const arm = (s) => {
    const a = limb(0.09, 0.09, 0.034, M.jacket); a.top.position.set(s * 0.127, 0.16, 0); chest.add(a.top);
    const shoulder = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.043, 12, 10), M.jacket)); a.top.add(shoulder);
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.016, 10), M.jacketD); cuff.position.y = a.end + 0.012; a.mid.add(cuff);
    const hand = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.036, 12, 10), M.glove)); hand.scale.set(0.95, 1.15, 0.85); hand.position.y = a.end - 0.016; a.mid.add(hand);
    const thumb = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.0165, 8, 8), M.glove)); thumb.position.set(-s * 0.03, a.end - 0.005, 0.014); a.mid.add(thumb);
    return a;
  };
  const leg = (s) => {
    const l = limb(0.15, 0.15, 0.047, M.pants); l.top.position.set(s * 0.058, 0.46, 0); rig.add(l.top);
    const footG = new THREE.Group(); footG.position.y = l.end; l.mid.add(footG); l.footG = footG;      // ankelen
    const boot = shadow(new THREE.Mesh(roundedBoxGeo(0.088, 0.062, 0.175, 0.03, 0.014), M.boot)); boot.geometry.translate(0, -0.031, 0); boot.position.set(0, 0.018, 0.036); outline(boot, 1.05); footG.add(boot);
    const sole = shadow(new THREE.Mesh(roundedBoxGeo(0.092, 0.02, 0.18, 0.032, 0.008), M.sole)); sole.geometry.translate(0, -0.01, 0); sole.position.set(0, -0.026, 0.036); footG.add(sole);
    const cuffB = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.05, 0.024, 10), M.boot); cuffB.position.y = 0.02; footG.add(cuffB);
    return l;
  };
  const L = { armL: arm(-1), armR: arm(1), legL: leg(-1), legR: leg(1) };
  const cur = { aL: 0, aR: 0, zL: 0, zR: 0, eL: 0, eR: 0, hL: 0, hR: 0, kL: 0, kR: 0, lean: 0, chest: 0, twist: 0, hy: 0, hp: 0, fp: 0 };
  return { root, body, chest, head, ...L, cur, yaw: 0, ph: 0, accLean: 0, bob: 0, pv: null, ikW: 0, hipY: 0.46,
    face, tailA, tailB, packG, helmet, sec: { a: 0, av: 0, b: 0, bv: 0, pk: 0, pkv: 0 }, mood: { name: '', t: 0 }, look: { x: 0, y: 0, tx: 0, ty: 0, t: 0 }, blink: { t: 2, v: 0 }, idleT: 0, talkT: 0 };
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
  } else if (p.state === 'climb') {                              // klatrer: én arm rekker frem og opp mot veggen mens den andre trekker, bena trår mot veggen
    const m = clampN(p.climbMove / 0.8, 0, 1), s1 = Math.sin(p.climbPh * 2), tired = clampN(1 - p.stam / (P.stamina * 0.3), 0, 1);
    const u = lerpN(0.6, (s1 + 1) / 2, m), v = 1 - u + (0.6 - (1 - 0.6)) * (1 - m);      // venstre/høyre arm: 1 = rekker, 0 = trekker (i ro: begge halvveis oppe)
    const vv = lerpN(0.6, 1 - (s1 + 1) / 2, m);
    const shake = tired * 0.05 * Math.sin(sec * 37);
    const stepL = lerpN(0.3, smooth3(vv), m), stepR = lerpN(0.3, smooth3(u), m);          // kryssmønster: venstre bein trår når høyre arm rekker
    Object.assign(T, {
      aL: lerpN(-1.1, -2.85, u) + shake, aR: lerpN(-1.1, -2.85, vv) - shake, eL: lerpN(-1.7, -0.15, u), eR: lerpN(-1.7, -0.15, vv),
      zL: 0.16, zR: -0.16,
      hL: lerpN(-0.3, -1.05, stepL), hR: lerpN(-0.3, -1.05, stepR), kL: lerpN(0.5, 1.5, stepL), kR: lerpN(0.5, 1.5, stepR),
      lean: 0.2 + 0.05 * tired, chest: 0.1, hp: -0.28, twist: 0.12 * s1 * m,
    });
    bob = -0.05;
  } else if (p.state === 'hang' || p.state === 'zip') {
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

  if (hero.gripNear && (p.state === 'ground' || p.state === 'air') && !p.carry) { T.aR = Math.min(T.aR, -1.75); T.eR = -0.45; }   // rekker en arm mot grepet

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

// ---------- sjarm: ansikt (blunking, blikk, uttrykk) og ting som henger etter (skjerf, sekk) ----------
const setMood = (name, secs) => { hero.mood.name = name; hero.mood.t = secs; };

// stemmen: korte replikker (voice.js) sies med nettleserens talesyntese (høy tone, norsk stemme om den finnes) og vises i en snakkeboble over hodet
const hasTTS = 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
let voiceOn = store.get('tlm.voice', true), bubblesOn = store.get('tlm.bubbles', true), voiceVol = store.get('tlm.voicevol', 0.9), ttsVoice = null;
function pickVoice() { const vs = hasTTS ? speechSynthesis.getVoices() : []; ttsVoice = vs.find((v) => /^nb/i.test(v.lang)) || vs.find((v) => /^no/i.test(v.lang)) || vs.find((v) => /^nn/i.test(v.lang)) || null; }
if (hasTTS) { pickVoice(); speechSynthesis.addEventListener?.('voiceschanged', pickVoice); }
function speakTTS(text) {
  if (!hasTTS || !voiceOn || soundMuted || !ttsVoice) return;                       // uten norsk stemme: bare snakkebobler
  try {
    const u = new SpeechSynthesisUtterance(text); u.voice = ttsVoice; u.lang = ttsVoice.lang; u.pitch = 1.9; u.rate = 1.12; u.volume = voiceVol;
    if (speechSynthesis.speaking) speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch { /* ikke støttet */ }
}
const bubbleEl = document.getElementById('bubble'); let bubbleUntil = 0;
function showBubble(text, secs) { if (!bubblesOn) return; bubbleEl.textContent = text; bubbleEl.classList.add('show'); bubbleUntil = performance.now() / 1000 + secs; hero.talkT = secs; }
const voice = createVoice({ speak: speakTTS, show: showBubble, now: () => performance.now() / 1000, enabled: () => (voiceOn || bubblesOn) && mode === 'play' });
const say = (key, force) => voice.say(key, force);
const _v3 = new THREE.Vector3();
function updateBubble(now) {
  if (now / 1000 > bubbleUntil) { bubbleEl.classList.remove('show'); return; }
  hero.head.getWorldPosition(_v3); _v3.y += 0.22; _v3.project(camera);
  if (_v3.z > 1) { bubbleEl.classList.remove('show'); return; }
  const x = Math.max(80, Math.min(innerWidth - 80, (_v3.x * 0.5 + 0.5) * innerWidth)), y = Math.max(70, (-_v3.y * 0.5 + 0.5) * innerHeight);
  bubbleEl.style.left = `${x}px`; bubbleEl.style.top = `${y}px`;
}
const stamEl = $('stam'), stamFill = stamEl.firstElementChild;
function updateStam() {                                   // krefter-stripe over hodet mens du klatrer eller er sliten
  const f = clampN(player.stam / P.stamina, 0, 1), show = mode === 'play' && (player.state === 'climb' || f < 0.97);
  stamEl.style.display = show ? 'block' : 'none'; if (!show) return;
  hero.head.getWorldPosition(_v3); _v3.y += 0.18; _v3.project(camera);
  stamEl.style.left = `${(_v3.x * 0.5 + 0.5) * innerWidth}px`; stamEl.style.top = `${(-_v3.y * 0.5 + 0.5) * innerHeight}px`;
  stamFill.style.transform = `scaleX(${f})`; stamEl.className = f < 0.15 ? 'crit' : f < 0.3 ? 'low' : '';
}
const F = { sm: 0.35, op: 0, bw: 0, bl: 0, eyeY: 1, pup: 1, blush: 0, sweat: 0 };       // glattede uttrykksverdier
function animateHero(p, now, dt) {
  const sec = now / 1000, h = hero, f = h.face, st = p.state, sp = Math.hypot(p.vx, p.vz);
  h.mood.t = Math.max(0, h.mood.t - dt); const mood = h.mood.t > 0 ? h.mood.name : '';
  const climbing = st === 'climb' || st === 'hang' || st === 'mantle', falling = !p.onGround && p.vy < -7 && !climbing, rising = !p.onGround && p.vy > 3 && !climbing;
  const stunned = (p.recover > 0.35 && p.landImpact >= P.hardLand && p.onGround) || mood === 'hurt', tired = Math.max(0, 1 - p.stam / (P.stamina * 0.3));
  // idle: gjesp etter lang tid i ro
  h.idleT = (sp < 0.15 && p.onGround && !p.carry && mode === 'play') ? h.idleT + dt : 0;
  if (h.idleT > 26 && !mood) { setMood('yawn', 2.2); say('yawn'); h.idleT = 0; }
  if (h.idleT > 14 && h.idleT - dt <= 14) say('idle');
  h.talkT = Math.max(0, h.talkT - dt);
  // mål for uttrykk
  let sm = 0.35, op = 0, bw = 0, bl = 0, eyeY = 1, pup = 1, blush = 0, sweat = 0;
  if (climbing) { sm = -0.25; bw = -0.25; eyeY = 0.8; if (tired > 0.1) { bw = 0.3 * tired - 0.25 * (1 - tired); blush = 0.5 * tired; sweat = tired > 0.5 ? 1 : 0; sm = -0.5; } }
  if (rising) { sm = 0.8; bl = 0.004; }
  if (falling) { eyeY = 1.2; pup = 0.75; bw = 0.3; bl = 0.012; op = 0.9; sm = 0; }
  if (p.carry && p.onGround) { bw = -0.1; sm = 0.1; }
  if (stunned) { eyeY = 0.12; bw = 0.35; op = 0.4; sm = -0.4; blush = 0.4; }
  if (mood === 'happy') { sm = 1; eyeY = 0.55; bl = 0.008; blush = 0.6; op = 0; bw = 0; }
  if (mood === 'worry') { bw = 0.4; bl = 0.008; sm = -0.3; eyeY = 1.1; }
  if (mood === 'yawn') { op = 1.3; eyeY = 0.1; sm = 0; bl = 0.01; }
  if (h.talkT > 0 && !stunned) { op = Math.max(op, 0.55 + 0.45 * Math.sin(sec * 17)); sm = Math.max(sm, 0.2); }          // munnen beveger seg mens han snakker
  const k = 1 - Math.exp(-dt / 0.07);
  F.sm += (sm - F.sm) * k; F.op += (op - F.op) * k; F.bw += (bw - F.bw) * k; F.bl += (bl - F.bl) * k; F.eyeY += (eyeY - F.eyeY) * k; F.pup += (pup - F.pup) * k; F.blush += (blush - F.blush) * k; F.sweat += (sweat - F.sweat) * k;
  // blunking
  h.blink.t -= dt; if (h.blink.t <= 0 && h.blink.v === 0) { h.blink.v = 1; h.blink.ph = 0; }
  let bAmt = 0; if (h.blink.v) { h.blink.ph += dt / 0.16; bAmt = Math.sin(Math.min(1, h.blink.ph) * Math.PI); if (h.blink.ph >= 1) { h.blink.v = 0; h.blink.t = 1.8 + Math.random() * 3.6; } }
  // blikk: ser dit han går/hopper, ellers lett rundt i hvile
  h.look.t -= dt;
  if (h.look.t <= 0) { h.look.t = 1.2 + Math.random() * 2.2; if (sp < 0.2 && p.onGround) { h.look.tx = (Math.random() - 0.5) * 1.6; h.look.ty = (Math.random() - 0.4) * 1.0; } else { h.look.tx = 0; h.look.ty = 0; } }
  let ty = h.look.ty, tx = h.look.tx; if (falling) ty = -0.7; else if (rising || climbing) ty = 0.7; if (stunned) { tx = 0; ty = 0; }
  h.look.x += (tx - h.look.x) * (1 - Math.exp(-dt / 0.09)); h.look.y += (ty - h.look.y) * (1 - Math.exp(-dt / 0.09));
  for (let i = 0; i < 2; i++) {
    const e = f.eyes[i], pu = f.pupils[i];
    e.scale.y = Math.max(0.07, F.eyeY * (1 - 0.93 * bAmt)); e.scale.x = 1 + (F.eyeY > 1 ? 0.08 : 0);
    pu.scale.set(F.pup, 1.1 * F.pup, 0.5); pu.position.set(h.look.x * 0.0075, h.look.y * 0.006, 0.0065);
    f.brows[i].rotation.z = (i === 0 ? 1 : -1) * F.bw; f.brows[i].position.y = 0.04 + F.bl + (F.eyeY < 0.4 ? -0.006 : 0);
    f.blush[i].material.opacity = F.blush;
  }
  f.smile.visible = F.op < 0.5; f.smile.rotation.z = F.sm >= 0 ? Math.PI : 0; f.smile.scale.set(1 + 0.25 * Math.abs(F.sm), Math.max(0.12, Math.abs(F.sm)), 1);
  f.smile.position.y = -0.03 + (F.sm >= 0 ? 0.004 : -0.004);
  f.open.visible = F.op >= 0.5; f.open.scale.set(1 + 0.3 * F.op, 0.5 + 0.9 * F.op, 0.4);
  f.sweat.visible = F.sweat > 0.5; f.sweat.position.y = 0.035 - 0.012 * ((sec * 1.2) % 1);
  // skjerf: to ledd som fjærer. Flyr bakover med fart, løftes i fall, henger ned i ro
  const sf = p.vx * p.fx + p.vz * p.fz, S = h.sec;
  const tA = clampN(sf * 0.16, -0.2, 1.0) + clampN(-p.vy * 0.045, 0, 1.2) - clampN(p.vy * 0.02, 0, 0.35) + (climbing ? 0.05 : 0);
  S.av += ((tA - S.a) * 70 - S.av * 7) * dt; S.a += S.av * dt;
  S.bv += (((S.a * 0.9 + (tA - S.a) * 0.4) - S.b) * 90 - S.bv * 8) * dt; S.b += S.bv * dt;
  h.tailA.rotation.x = 0.12 + S.a; h.tailB.rotation.x = S.b * 0.7; h.tailA.rotation.z = Math.sin(sec * 3 + S.a * 4) * 0.05 * Math.min(1, Math.abs(S.a) * 2);
  // sekk: slenger med akselerasjon og fjærer ved landing
  if (p.landT < dt * 2.5 && p.landImpact > 3) S.pkv -= p.landImpact * 0.012;
  S.pkv += ((-S.pk) * 120 - S.pkv * 9) * dt; S.pk += S.pkv * dt;
  h.packG.position.y = 0.09 + S.pk; h.packG.rotation.x = -h.accLean * 0.9 - S.pk * 2;
}

// ---------- tilstand ----------
initBodies(LEVEL);
const bodyMeshes = LEVEL.bodies.map((b) => {
  const sx = b.max[0] - b.min[0], sy = b.max[1] - b.min[1], sz = b.max[2] - b.min[2];
  const mesh = (b.kind && buildSingle(b.kind, [sx, sy, sz], { color: b.color, id: b.id, material: b.material })) || new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material({ type: b.type, material: b.material, color: b.color }));
  mesh.castShadow = mesh.receiveShadow = true; scene.add(mesh);
  return { b, mesh, size: [sx, sy, sz] };
});
// taubaner (nål + tråd) opprettes av fysikken: en tynn rød tråd mellom to knuter
const zipMeshes = new Map();
function syncZips() {
  const alive = new Set(LEVEL.zips || []);
  for (const z of alive) if (!zipMeshes.has(z)) {
    const line = makeCyl(0.035), k1 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), line.material), k2 = k1.clone();
    line.material = new THREE.MeshStandardMaterial({ color: 0xd04a4a, roughness: 0.8, emissive: 0x3a0c0c }); k1.material = k2.material = line.material;
    k1.position.set(...z.a); k2.position.set(...z.b); setCyl(line, new THREE.Vector3(...z.a), new THREE.Vector3(...z.b));
    scene.add(line, k1, k2); zipMeshes.set(z, [line, k1, k2]);
  }
  for (const [z, ms] of zipMeshes) if (!alive.has(z)) { scene.remove(...ms); zipMeshes.delete(z); }
}
// laget grep (hårgelé, papirbånd) opprettes av fysikken mens du spiller: tegnes her
const madeMeshes = new Map();
function syncMade() {
  const alive = new Set(LEVEL.made || []);
  for (const b of alive) {
    if (!madeMeshes.has(b)) {
      const sx = b.max[0] - b.min[0], sy = b.max[1] - b.min[1], sz = b.max[2] - b.min[2];
      const g = buildSingle(b.kind, [sx, sy, sz], { color: b.color, id: b.id, material: b.material });
      if (!g) continue;
      g.position.set(b.min[0] + sx / 2, b.min[1] + sy / 2, b.min[2] + sz / 2); scene.add(g); madeMeshes.set(b, { g, dry: false, mark: b.grip ? gripMark(b) : null });
    }
    const m = madeMeshes.get(b);
    if (m && b.kind === 'gel' && !b.wet && !m.dry) { m.dry = true; m.g.userData.dry?.(); }
  }
  for (const [b, m] of madeMeshes) if (!alive.has(b)) { scene.remove(m.g); if (m.mark) { scene.remove(m.mark.g); gripMarks.splice(gripMarks.indexOf(m.mark), 1); } madeMeshes.delete(b); }
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
  resetBodies(LEVEL, player); stats.resets++; say('reset');
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
let camLook = 0, camPitchBias = 0, camLift = 0, camAssist = store.get('tlm.camassist', true);
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
  if (m === 'plan') toast(TOUCH ? 'Plan: stikken flytter, dra for å snurre, klyp for zoom' : 'Plan: WASD flytter, dra for å snurre, hjul/klyp for zoom');
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
  if (e.code === 'KeyZ') camBehind();
  if (e.code === 'KeyT') restartAll();
  if (e.code === 'KeyF') carryEdge = true;
  if (e.code === 'KeyN') resetThings();
  if (e.code === 'KeyM') toggleSound();
  if (e.code === 'KeyV') toggleCues();
  if (e.code === 'KeyX') toggleAutoCam();
  if (e.code === 'KeyL' && labels.length) { labelsOn = !labelsOn; store.set('tlm.labels', labelsOn); toast(labelsOn ? 'Brukslapper på' : 'Brukslapper av'); const c = document.getElementById('chkLabels'); if (c) c.checked = labelsOn; }
  if (e.code === 'KeyP' || e.code === 'Tab') setMode('plan');
  if (e.code === 'KeyG') setMode('fly');
  if (e.code === 'KeyH') $('help').classList.toggle('hide');
  if (e.code === 'Escape') $('panel').classList.add('hide');
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => keys.clear());
const held = (...codes) => codes.some((c) => keys.has(c));

let camSens = store.get('tlm.camsens', 1);
let camAnim = null;                                                           // mykt kameraskift: {from, to, pf, pt, t}
const angDiff = (a, b) => ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
function turnCamera(toYaw, toPitch) { camAnim = { from: cam.yaw, d: angDiff(cam.yaw, toYaw), pf: cam.pitch, pt: toPitch ?? cam.pitch, t: 0 }; lastDrag = -99; }
const camBehind = () => turnCamera(Math.atan2(-player.fx, -player.fz), 0.32);                       // bak figuren, litt ovenfra
// neste hinder: ruta fra rute-grafen (flater og grep-flater i rekkefølge); uten rute (håndlagde brett) er det målet
let routeCur = 0;
function nextTarget() {
  const R = LEVEL.route, g = LEVEL.goal;
  if (R?.length > 1) {
    let i = -1;
    if (player.state === 'climb') i = R.findIndex((w) => (w.grip || w.via) && w.id === player.climb?.box?.id);
    else if (player.onGround) R.forEach((w, k) => { if (!w.grip && !w.via && player.y - w.top > -0.3 && player.y - w.top < 3.5 && player.x >= w.x0 - 0.3 && player.x <= w.x1 + 0.3 && player.z >= w.z0 - 0.3 && player.z <= w.z1 + 0.3) i = k; });   // flaten du står på (også når du står på en løs ting oppå)
    if (i >= 0) routeCur = i;
    const w = R[Math.min(routeCur + 1, R.length - 1)];
    if (w !== R[R.length - 1]) return { x: Math.max(w.x0, Math.min(w.x1, player.x)), y: w.top, z: Math.max(w.z0, Math.min(w.z1, player.z)), label: w.label || nice(w.id).replace(/_/g, ' '), final: false, act: w.act || (w.grip ? 'klatre' : '') };
  }
  return { x: g[0], y: g[1], z: g[2], label: 'MÅL', final: true };
}
const camToGoal = () => { const t = nextTarget(); turnCamera(Math.atan2(-(t.x - player.x), -(t.z - player.z)), 0.32); };    // neste mål rett frem
function stepCamAnim(dt) {
  if (!camAnim) return; camAnim.t = Math.min(1, camAnim.t + dt / 0.4); const k = 1 - Math.pow(1 - camAnim.t, 3);
  cam.yaw = camAnim.from + camAnim.d * k; cam.pitch = camAnim.pf + (camAnim.pt - camAnim.pf) * k; if (camAnim.t >= 1) camAnim = null;
}
let compassOn = store.get('tlm.compass', true);
const compEl = $('compass'), compArrow = $('compArrow'), compTxt = $('compTxt');
const goalArrow = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape([[0, 0.5], [0.3, -0.25], [0, -0.1], [-0.3, -0.25]].map(([x, y]) => new THREE.Vector2(x, y)))),
  new THREE.MeshBasicMaterial({ color: 0xffa940, transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthWrite: false }));
goalArrow.rotation.x = -Math.PI / 2; goalArrow.renderOrder = 5; goalArrow.visible = false;
const goalArrowG = new THREE.Group(); goalArrowG.add(goalArrow); scene.add(goalArrowG);
function compassFrame(now) {
  const t = nextTarget(), dx = t.x - player.x, dz = t.z - player.z, dist = Math.hypot(dx, dz);
  const show = compassOn && mode === 'play' && !won && dist > (t.final ? 2.5 : 0.6);
  compEl.style.display = show ? 'flex' : 'none';
  goalArrow.visible = show && player.onGround; goalArrowG.visible = goalArrow.visible;
  if (!show) return;
  const sy = Math.sin(cam.yaw), cy = Math.cos(cam.yaw);
  const ang = Math.atan2(dx * cy - dz * sy, -dx * sy - dz * cy);                     // 0 = rett frem på skjermen, positiv = til høyre
  compArrow.style.transform = `rotate(${ang}rad)`;
  const dy = t.y - player.y;
  $('compLbl').textContent = t.final ? 'MÅL' : `NESTE: ${t.label}`.toUpperCase();
  compTxt.textContent = `${(dist * 0.05).toFixed(1).replace('.', ',')} m${t.act ? ` · ▲ ${t.act}` : Math.abs(dy) > 0.6 ? (dy > 0 ? ' · ▲ opp' : ' · ▼ ned') : ''}`;
  goalArrowG.position.set(player.x + dx / dist * 1.4, player.y + 0.03 + 0.01 * Math.sin(now / 200), player.z + dz / dist * 1.4);
  goalArrowG.rotation.y = Math.atan2(-dx, -dz);
}
compEl.addEventListener('pointerdown', (e) => { e.stopPropagation(); camToGoal(); });
$('btnCenter').addEventListener('pointerdown', (e) => { e.stopPropagation(); camBehind(); });
const pointers = new Map();
let pinch0 = 0;
function activeCam() { return mode === 'plan' ? planCam : cam; }
canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId);
  if (TOUCH && mode !== 'fly' && stickId === null && e.clientX < innerWidth * 0.5 && e.clientY > innerHeight * 0.2) {      // venstre halvdel: stikken dukker opp der tommelen treffer
    stickId = e.pointerId; setStickCenter(e.clientX, e.clientY); stick.classList.add('float'); stickMove(e); return;
  }
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t0: performance.now() });
  if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); }
});
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerId === stickId) { stickMove(e); return; }            // fingeren styrer stikken (flytende), ikke kameraet
  const p = pointers.get(e.pointerId); if (!p) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
  const c = activeCam();
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
    if (pinch0) zoom(pinch0 / d); pinch0 = d; return;
  }
  camAnim = null; c.yaw -= dx * 0.006 * camSens; lastDrag = performance.now() / 1000;
  c.pitch += dy * 0.005 * camSens;
  const lim = mode === 'plan' ? [-0.3, 1.5] : [-0.35, 1.35];
  c.pitch = Math.min(lim[1], Math.max(lim[0], c.pitch));
});
let lastTap = { t: 0, x: 0, y: 0 };
const endPtr = (e) => {
  const p = pointers.get(e.pointerId);
  if (p && pointers.size === 1 && mode === 'play' && Math.hypot(e.clientX - p.x0, e.clientY - p.y0) < 10 && performance.now() - p.t0 < 280) {      // kort trykk
    const now = performance.now();
    if (now - lastTap.t < 330 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 45) { camBehind(); lastTap.t = 0; } else lastTap = { t: now, x: e.clientX, y: e.clientY };
  }
  pointers.delete(e.pointerId); pinch0 = 0;
};
canvas.addEventListener('pointerup', endPtr); canvas.addEventListener('pointercancel', endPtr);
function zoom(f) {
  if (mode === 'plan') planCam.dist = Math.min(120, Math.max(8, planCam.dist * f));
  else cam.dist = Math.min(16, Math.max(2.2, cam.dist * f));
}
canvas.addEventListener('wheel', (e) => { e.preventDefault(); zoom(Math.exp(e.deltaY * 0.0012)); }, { passive: false });

const stick = $('stick'), knob = $('knob');
let stickId = null, stickC = null;                                   // pekerid og midtpunkt (px) mens stikken er i bruk
function setStickCenter(x, y) { stickC = [x, y]; stick.style.left = `${x - 65}px`; stick.style.top = `${y - 65}px`; stick.style.bottom = 'auto'; stick.style.display = 'block'; }
function stickMove(e) {
  if (!stickC) { const r = stick.getBoundingClientRect(); stickC = [r.left + r.width / 2, r.top + r.height / 2]; }
  let dx = (e.clientX - stickC[0]) / 65, dy = (e.clientY - stickC[1]) / 65;
  const l = Math.hypot(dx, dy);
  if (l > 1) {                                                        // dras utenfor kanten: stikken følger etter, så tommelen aldri «går tom»
    setStickCenter(stickC[0] + (dx / l) * (l - 1) * 65, stickC[1] + (dy / l) * (l - 1) * 65); stick.classList.add('float');
    dx /= l; dy /= l;
  }
  touch.x = dx; touch.y = -dy; knob.style.transform = `translate(${dx * 40}px, ${dy * 40}px)`;
}
stick.addEventListener('pointerdown', (e) => { stickId = e.pointerId; stick.setPointerCapture(e.pointerId); stickC = null; stickMove(e); });
stick.addEventListener('pointermove', (e) => { if (e.pointerId === stickId) stickMove(e); });
const stickEnd = (e) => {
  if (e.pointerId !== stickId) return; stickId = null; stickC = null; touch.x = touch.y = 0; knob.style.transform = '';
  if (stick.classList.contains('float')) { stick.classList.remove('float'); stick.style.left = stick.style.top = stick.style.bottom = ''; stick.style.display = ''; }   // tilbake til hvilestilling (flyttet eller flytende)
};
stick.addEventListener('pointerup', stickEnd); stick.addEventListener('pointercancel', stickEnd);
canvas.addEventListener('pointerup', (e) => { if (e.pointerId === stickId) stickEnd(e); }); canvas.addEventListener('pointercancel', (e) => { if (e.pointerId === stickId) stickEnd(e); });
function bindBtn(id, key, edge) {
  const el = $(id);
  el.addEventListener('pointerdown', (e) => { el.setPointerCapture(e.pointerId); touch[key] = true; edge(); });
  const up = () => { touch[key] = false; };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
}
bindBtn('btnJump', 'jump', () => { jumpEdge = true; });
bindBtn('btnGrab', 'grab', () => { grabEdge = true; });
bindBtn('btnCarry', 'carry', () => { carryEdge = true; });
// knapper som koster poeng må trykkes to ganger (første trykk «armerer» i 2,5 s), så de ikke utløses ved et uhell
function confirmed(btn, label, cost, fn) {
  let t = null; const orig = btn.textContent;
  btn.onclick = () => {
    if (t) { clearTimeout(t); t = null; btn.classList.remove('armed'); btn.textContent = orig; fn(); return; }
    btn.classList.add('armed'); btn.textContent = `Sikker? −${cost}`;
    t = setTimeout(() => { t = null; btn.classList.remove('armed'); btn.textContent = orig; }, 2500);
  };
}
confirmed($('bThings'), 'Ting', SCORE.resetThings, resetThings);
$('bLevel').textContent = `Brett: ${levelLabel}`;
$('bLevel').onclick = () => { const i = LEVELS.findIndex((l) => l.id === levelId), n = LEVELS[(i + 1) % LEVELS.length].id; store.set('tlm.level', n); location.search = `?level=${n}`; };
$('bSound').onclick = toggleSound; $('bSound').textContent = soundMuted ? 'Lyd av' : 'Lyd'; $('bSound').classList.toggle('on', !soundMuted);
confirmed($('bSave'), 'Lagre', SCORE.save, doSave); confirmed($('bBack'), 'Tilbake', SCORE.respawn, goBack);
$('bPlan').onclick = () => setMode('plan'); $('bFly').onclick = () => setMode('fly');
$('again').onclick = restartAll;

// ---------- innstillingspanel (hoppfølelse) ----------
const TUNE = [
  ['gravity', 'Tyngdekraft', -45, -14, 1], ['jump', 'Hoppkraft', 8, 16, 0.1], ['airJumps', 'Dobbelthopp (0 = av)', 0, 1, 1],
  ['airAccel', 'Styring i lufta', 2, 40, 1], ['speed', 'Løpefart', 3, 10, 0.1],
  ['accel', 'Akselerasjon', 4, 60, 1], ['decel', 'Bremsing', 4, 60, 1], ['turnDecel', 'Retningsskifte (lavt = tregt)', 4, 60, 1],
  ['jumpWindup', 'Hopp: forberedelse (s)', 0, 0.3, 0.01], ['mantleTime', 'Hiv deg opp: tid (s)', 0, 1.5, 0.05], ['landK', 'Landing: hurk per fallfart', 0, 0.05, 0.002],
  ['jumpBoost', 'Løpehopp: fartsfaktor', 1, 2, 0.05], ['turnRate', 'Snu-hastighet (rad/s)', 2, 16, 0.5],
  ['reachTime', 'Grep: varighet (s)', 0.1, 1, 0.05], ['reachCooldown', 'Grep: pause (s)', 0, 1.5, 0.05],
  ['reachAbove', 'Grep: ekstra rekkevidde opp', 0, 1.5, 0.05], ['ropeReach', 'Tau-rekkevidde', 0.8, 3.5, 0.1],
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
    <label style="display:flex;gap:8px;align-items:center;font-weight:600"><input type="checkbox" id="chkBubbles"> Snakkebobler</label>
    ${hasTTS ? '<label style="display:flex;gap:8px;align-items:center;font-weight:600"><input type="checkbox" id="chkVoice"> Stemme (figuren snakker)</label><label>Stemmevolum <span id="v_vvol"></span></label><input type="range" id="s_vvol" min="0.2" max="1" step="0.1"><small id="voiceNote"></small>' : ''}
    <label style="display:flex;gap:8px;align-items:center;font-weight:600"><input type="checkbox" id="chkCues"> Lydtekst: vis tekst for lyder${key('V')}</label>
    ${helperCount ? `<label style="display:flex;gap:8px;align-items:center;font-weight:600"><input type="checkbox" id="chkHelpers"> Merk ${helperCount} hjelpeobjekter (lagt inn av brettlageren)</label><small>${(LEVEL.report?.helpers || []).map((h) => `${h.id}: ${h.size_cm.join('×')} cm, topp ${h.top_cm} cm ved (${h.at_cm.join(', ')})`).join('<br>')}</small>` : ''}
    <label style="display:flex;gap:8px;align-items:center;font-weight:600"><input type="checkbox" id="chkAutoCam"> Kamera følger retning${key('X')}</label>
    <label style="display:flex;gap:8px;align-items:center;font-weight:600"><input type="checkbox" id="chkCompass"> Målkompass og pil på gulvet</label>
    <label style="display:flex;gap:8px;align-items:center;font-weight:600"><input type="checkbox" id="chkAssist"> Kameraet hjelper (over vegger, i fall og klatring)</label>
    <label style="display:flex;gap:8px;align-items:center;font-weight:600"><input type="checkbox" id="chkFade"> Tone ut ting som står i veien for kameraet</label>
    <label style="display:flex;gap:8px;align-items:center;font-weight:600"><input type="checkbox" id="chkGripHi"> Fremhev grep (oransje, pulserende)</label>
    ${labels.length ? `<label style="display:flex;gap:8px;align-items:center;font-weight:600"><input type="checkbox" id="chkLabels"> Brukslapper ved ting${key('L')}</label>` : ''}
    <div class="row" style="margin-top:10px"><button id="pSound">Lyd av/på</button><button id="pPlan">Plan</button><button id="pFly">Fly</button></div>
    <label>Kamerafølsomhet (dra) <span id="v_camsens"></span></label><input type="range" id="s_camsens" min="0.4" max="2" step="0.1">
    ${navigator.vibrate ? '<label style="display:flex;gap:8px;align-items:center;font-weight:600"><input type="checkbox" id="chkVib"> Vibrasjon</label>' : ''}
    <h3 style="margin-top:14px">Hoppinnstillinger</h3>
    <label>Forhåndsinnstilling</label>
    <select id="presetSel">${Object.entries(PRESETS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}</select>
    <label style="display:flex;gap:8px;align-items:center;font-weight:600"><input type="checkbox" id="autoGrab"> Grip kanten automatisk</label>
    <div id="sliders"></div>
    <div class="row"><button id="resetPreset">Nullstill</button><button id="closePanel">Lukk</button></div>
    <small><b>Prince:</b> vekt og treghet: du bygger opp fart, snur ikke på stedet, hopp har forberedelse, landing etter fall tar tid og å hive seg opp tar tid. ${TOUCH ? 'Skyv stikken forsiktig for å gå forsiktig.' : 'Hold C for å gå forsiktig.'}<br><b>Klassisk:</b> raskt, dobbelthopp, kanten grips av seg selv.<br><b>Spenning:</b> tyngre og tregere hopp, ingen dobbelthopp. Du må trykke GREP${key('Shift/E')} i riktig øyeblikk for å gripe kant eller tau.</small>`;
  $('s_vol').value = store.get('tlm.vol', 0.7); $('v_vol').textContent = (+$('s_vol').value).toFixed(2);
  $('s_vol').oninput = (e) => { const v = +e.target.value; store.set('tlm.vol', v); audio?.setVolume(v); $('v_vol').textContent = v.toFixed(2); };
  $('levelSel').value = levelId;
  $('levelSel').onchange = (e) => { store.set('tlm.level', e.target.value); location.search = `?level=${e.target.value}`; };
  wireMixer();
  $('pSound').onclick = toggleSound; $('pPlan').onclick = () => { setMode('plan'); $('panel').classList.add('hide'); }; $('pFly').onclick = () => { setMode('fly'); $('panel').classList.add('hide'); };
  $('s_camsens').value = camSens; $('v_camsens').textContent = (+camSens).toFixed(1);
  $('s_camsens').oninput = (e) => { camSens = +e.target.value; store.set('tlm.camsens', camSens); $('v_camsens').textContent = camSens.toFixed(1); };
  if ($('chkVib')) { $('chkVib').checked = vibOn; $('chkVib').onchange = (e) => { vibOn = e.target.checked; store.set('tlm.vib', vibOn); if (vibOn) buzz(30); }; }
  if ($('chkHelpers')) { $('chkHelpers').checked = helperMarks.visible; $('chkHelpers').onchange = (e) => { helperMarks.visible = e.target.checked; }; }
  if ($('chkLabels')) { $('chkLabels').checked = labelsOn; $('chkLabels').onchange = (e) => { labelsOn = e.target.checked; store.set('tlm.labels', labelsOn); }; }
  $('chkCompass').checked = compassOn; $('chkCompass').onchange = (e) => { compassOn = e.target.checked; store.set('tlm.compass', compassOn); };
  $('chkAssist').checked = camAssist; $('chkAssist').onchange = (e) => { camAssist = e.target.checked; store.set('tlm.camassist', camAssist); };
  $('chkFade').checked = fadeOn; $('chkFade').onchange = (e) => { fadeOn = e.target.checked; store.set('tlm.fade', fadeOn); };
  $('chkGripHi').checked = gripHi; $('chkGripHi').onchange = (e) => { gripHi = e.target.checked; store.set('tlm.griphi', gripHi); };
  $('chkAutoCam').checked = autoCam; $('chkAutoCam').onchange = (e) => { autoCam = e.target.checked; store.set('tlm.autocam', autoCam); };
  $('chkBubbles').checked = bubblesOn; $('chkBubbles').onchange = (e) => { bubblesOn = e.target.checked; store.set('tlm.bubbles', bubblesOn); };
  if ($('chkVoice')) {
    $('chkVoice').checked = voiceOn; $('chkVoice').onchange = (e) => { voiceOn = e.target.checked; store.set('tlm.voice', voiceOn); if (voiceOn) { primeVoice(); say('checkpoint', true); } };
    $('s_vvol').value = voiceVol; $('v_vvol').textContent = (+voiceVol).toFixed(1); $('s_vvol').oninput = (e) => { voiceVol = +e.target.value; store.set('tlm.voicevol', voiceVol); $('v_vvol').textContent = voiceVol.toFixed(1); };
    $('voiceNote').textContent = ttsVoice ? `Stemme: ${ttsVoice.name} (${ttsVoice.lang}). Lyden kommer fra telefonen.` : 'Fant ingen norsk stemme på denne enheten: da vises bare snakkebobler.';
  }
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
  const mag = Math.hypot(touch.x, touch.y), DZ = 0.22, tk = mag < DZ ? 0 : Math.pow((mag - DZ) / (1 - DZ), 1.35) / mag;   // myk kurve: finere kontroll nær midten
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

  if (player.onGround && player.groundBox?.cp && player.y > save.pos[1] + 0.01) { save.pos = [player.x, player.y, player.z]; placeFlag(); toast('Sjekkpunkt'); audio?.checkpoint(); cue('sjekkpunkt'); setMood('happy', 1.6); say('checkpoint'); }
  if (player.y < LEVEL.deathY) { resetPlayer(player, ...save.pos); stats.respawns++; toast(`Falt – tilbake til lagringspunkt  −${SCORE.respawn} poeng`); }
  for (const ev of drainEvents(LEVEL)) {
    if (ev.type === 'broke') { audio?.shatter(); cue('noe knuses'); stats.broken++; spawnShards(ev.pos, LEVEL.bodies.find((b) => b.id === ev.id)?.color); toast(`${ev.id} gikk i stykker  −${SCORE.broken} poeng`); }
    else if (ev.type === 'lost') { audio?.splash('pit'); cue('plask'); toast(`${ev.id} forsvant`); }
    else if (ev.type === 'exhausted') { setMood('hurt', 0.6); buzz(30); cue('puster tungt'); }
    else if (ev.type === 'use') {
      audio?.pickup(); buzz(20); setMood('happy', 0.9);
      if (ev.tool === 'thread') { toast(`Nålen er trædd. Fest tråden øverst med ${TA}, gå så ned og fest den med ${TA} igjen.`); say('thread'); }
      else if (ev.tool === 'zipA') toast(`Tråden er festet her. Gå dit den skal ende (lavere) og trykk ${TA}.`);
      else if (ev.tool === 'zip') { toast(`Taubane! Gå tilbake til øvre ende og trykk ${GREP} for å henge deg i den.`); say('zip'); }
      else say(ev.tool === 'gel' ? 'gel' : 'roll');
    }
    else if (ev.type === 'toolhint') toast(ev.tool === 'needle' ? `Gå bort til en trådsnelle og trykk ${TA} for å træ nålen.` : ev.tool === 'spool' ? `Gå bort til en nål og trykk ${TA} for å træ den.` : ev.tool === 'zip' ? ({ 'zip-flat': 'For flatt: tråden må ende minst 8 cm lavere enn der den starter.', 'zip-far': 'For langt: tråden rekker høyst ca. 1,2 m.', 'zip-blocked': 'Noe er i veien for tråden.' }[ev.why] || `Stå på bakken og trykk ${TA} for å feste tråden.`) : ev.tool === 'gel' ? `Gå helt inntil en vegg og trykk ${TA} for å smøre. ${TA} igjen legger fra seg.` : `Gå helt ut til en kant og trykk ${TA} for å rulle ut. ${TA} igjen legger fra seg.`);
    else if (ev.type === 'tore') { audio?.drop('paper'); toast('Papirbåndet revnet'); say('tore'); }
  }
  if (player.hardLands > pre.hard) { setMood('hurt', 1.3); say('hardland'); stats.hard++; toast(`Hardt landet – bedøvet  −${SCORE.hardLand} poeng`); }
  if (player.knockout) {
    player.knockout = false; audio?.crush(); buzz(90); say('knockout');
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
    audio?.splash(hz.type === 'flush' ? 'flush' : 'pit'); cue(hz.type === 'flush' ? 'skylling' : 'plask'); say(hz.type === 'flush' ? 'flush' : 'pit');
    resetPlayer(player, ...(hz.type === 'flush' ? LEVEL.start : save.pos)); stats.respawns++;
    toast(`${hz.message || 'Fare!'}  −${SCORE.respawn} poeng`);
  }

  const g = LEVEL.goal;
  if (!won && Math.hypot(player.x - g[0], player.z - g[2]) < 2 && Math.abs(player.y - g[1]) < 2.5) {
    won = true; audio?.win(); setMood('happy', 6); say('goal', true);
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
let sayFell = false, sayTired = false;
function voiceFrame(pre) {
  const p = player;
  if (mode !== 'play') return;
  if (!p.onGround && p.vy < -13 && !sayFell && p.state === 'air') { sayFell = true; say('fall'); }
  if (p.onGround) sayFell = false;
  if (!pre.onGround && p.onGround && pre.vy < -16 && p.landImpact < P.hardLand && !p.knockout) say('softland');
  if (pre.onGround && !p.onGround && p.vaulting) say('vault');
  if (pre.state === 'mantle' && p.state !== 'mantle') say('top');
  const climbingNow = p.state === 'climb' || p.state === 'hang';
  if (climbingNow && p.stam < 2.6 && !sayTired) { sayTired = true; say('tired'); }
  if (!climbingNow && p.stam > 5) sayTired = false;
  if (!pre.carry && p.carry) say('pickup');
  if (pre.carry && !p.carry) say((LEVEL.bodies || []).some((b) => !b.carried && Math.hypot(b.vx || 0, b.vz || 0) > 1) ? 'throw' : 'drop');
}
function cueFrame(pre) {
  const p = player;
  voiceFrame(pre);
  if (!pre.onGround && p.onGround && pre.vy < -9) cue(p.landImpact >= P.hardLand ? 'hard landing' : 'landing');
  if (p.landImpact >= P.hardLand && !pre.onGround && p.onGround) buzz(45);
  if ((pre.state !== 'hang' && p.state === 'hang') || (pre.state !== 'climb' && p.state === 'climb')) buzz(14);
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
  if (pre.state !== 'zip' && p.state === 'zip') { audio.grab(); setMood('happy', 3); say('zipping', true); }
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
  { const tb = document.getElementById('btnCarry'); const lab = player.carry && player.charge >= P.throwMin ? 'KAST' : 'TA'; if (tb && tb.textContent !== lab) { tb.textContent = lab; tb.style.background = lab === 'KAST' ? '#c77d12cc' : ''; } }   // knappen sier KAST når holdetiden er nådd
  hero.gripNear = mode === 'play' && !player.carry && player.reach <= 0 && !!findReachTarget(player, LEVEL, 0.35);      // hånden løftes litt når noe kan gripes
  poseHero(player, now, dt, mode); animateHero(player, now, dt); updateBubble(now); updateStam();
  updateArc(); syncMade(); syncZips(); updateLabels();
  const pulse = 0.5 + 0.5 * Math.sin(now / 260);
  for (const m of gripMarks) { m.edges.material.opacity = gripHi ? 0.7 + 0.3 * pulse : 0.85; m.glow.material.opacity = gripHi ? 0.12 + 0.2 * pulse : 0.07; }
  hero.root.position.set(player.x, player.y, player.z);
  hero.root.scale.set(1, 1, 1);                                  // ingen strekk/klem: det ga «puls» og sjøsyke

  for (const { r, line, end } of ropes) {
    const a = new THREE.Vector3(r.x, r.y, r.z);
    const b = player.rope === r ? new THREE.Vector3(player.x, player.y + 0.85, player.z) : new THREE.Vector3(r.x, r.y - r.len, r.z);
    setCyl(line, a, b); end.position.copy(b);
  }
  for (const { b, mesh, size } of bodyMeshes) {
    mesh.visible = b.alive;
    if (b.kind === 'needle' && mesh.userData.thread && mesh.userData.on !== !!b.threaded) { mesh.userData.on = !!b.threaded; mesh.userData.thread(!!b.threaded); }
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
    const th = player.carry ? toolHint(player, LEVEL) : null;
    const toolText = { gel: `${TA}: smør gel på veggen`, roll: `${TA}: rull ut et bånd over kanten`, 'need-gel': `Gå helt inntil en vegg, så smører ${TA} gel`, 'need-roll': `Gå helt ut til en kant, så ruller ${TA} ut et bånd`,
      thread: `${TA}: træ nålen med tråden`, 'need-thread': 'Finn en trådsnelle å træ nålen med', 'need-needle': 'Finn en nål å træ tråden i',
      'zip-a': `${TA}: fest tråden her (høyt oppe)`, 'zip-b': `Gå dit tråden skal ende (lavere), så fester ${TA} den` }[th];
    const zn = !player.carry && zipNear(player, LEVEL);
    hint.textContent = player.carry ? (player.charge >= P.throwMin ? `Slipp ${TA}: KAST` : toolText ? `${toolText} · hold ${TA}: kast` : (() => { const sp = findPlaceSpot(player, LEVEL); return (sp && sp.c.type !== 'floor' && sp.min[1] > player.y + 0.2 ? `${TA}: sett på ${nice(sp.c.id)}` : `${TA}: slipp`) + ` · hold ${TA}: kast`; })()) : zn ? `${GREP}: heng deg i tråden og skli ned` : t ? `${TA}: ta ${nice(t.id)}` : '';
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
    // kameraassistanse: se der du lander (fall) og opp mot neste grep (klatring), og løft deg over vegger i stedet for å bli trukket tett inn
    const falling = !player.onGround && player.vy < -6 && !['hang', 'mantle', 'swing', 'climb', 'zip'].includes(player.state);
    const climbing = ['climb', 'hang'].includes(player.state);
    const lookT = camAssist ? (falling ? -0.9 : climbing ? 0.8 : 0) : 0, pitchT = camAssist ? (falling ? 0.14 : climbing ? -0.08 : 0) : 0;
    const ka = 1 - Math.pow(0.15, dt);
    camLook += (lookT - camLook) * ka; camPitchBias += (pitchT - camPitchBias) * ka;
    cam.target.y = camFocusY + 0.62 + camLook;
    const dirAt = (pitch) => { const c = Math.cos(pitch); return new THREE.Vector3(Math.sin(cam.yaw) * c, Math.sin(pitch), Math.cos(cam.yaw) * c); };
    const clearAt = (dv, dd) => !insideAny(cam.target.x + dv.x * dd, cam.target.y + dv.y * dd, cam.target.z + dv.z * dd, 0.25);
    let liftT = 0;
    if (camAssist && mode !== 'fly' && !clearAt(dirAt(cam.pitch + camPitchBias), cam.dist)) {         // noe i veien på full avstand: prøv en høyere vinkel
      for (let o = 0.12; o <= 0.96; o += 0.12) { const pp = Math.min(1.3, cam.pitch + camPitchBias + o); if (clearAt(dirAt(pp), cam.dist)) { liftT = pp - cam.pitch - camPitchBias; break; } }
    }
    camLift += (liftT - camLift) * (liftT > camLift ? 1 - Math.pow(0.02, dt) : 1 - Math.pow(0.2, dt));
    const pitchNow = Math.min(1.3, cam.pitch + camPitchBias + camLift);
    const cp = Math.cos(pitchNow), dir = new THREE.Vector3(Math.sin(cam.yaw) * cp, Math.sin(pitchNow), Math.cos(cam.yaw) * cp);
    let d = cam.dist;
    for (; d > 1.1; d -= 0.2) { if (!insideAny(cam.target.x + dir.x * d, cam.target.y + dir.y * d, cam.target.z + dir.z * d, 0.25)) break; }
    cam.cur += (d - cam.cur) * (d < cam.cur ? 0.5 : 0.08);
    if (!window.__camLock) { camera.position.copy(cam.target).addScaledVector(dir, cam.cur);
    camera.lookAt(cam.target); }
  }
  camera.updateMatrixWorld(); updateFades(dt); updateOffscreen();
  sun.target.position.set(player.x, player.y, player.z);
  sun.position.set(player.x + SUN[0], player.y + SUN[1], player.z + SUN[2]);
  renderer.render(scene, camera);
  $('hud').textContent =
    `v${VERSION} · ${levelLabel} · ${mode === 'plan' ? 'PLAN' : mode === 'fly' ? 'FLY' : player.state}${player.sliding ? ' (glir)' : ''}${player.reach > 0 ? ' · GREPER' : ''}\n` +
    `høyde ${player.y.toFixed(1)}  tid ${clock.toFixed(0)}s${player.state === 'climb' || player.stam < P.stamina - 0.05 ? '  grep ' + '▮'.repeat(Math.max(0, Math.round(10 * player.stam / P.stamina))) + '▯'.repeat(10 - Math.max(0, Math.round(10 * player.stam / P.stamina))) : ''}\nlagret ${stats.saves} · tilbake ${stats.respawns} · poeng ${points()}`;
}

// ---------- kamerahjelp: tone ut det som står i veien, og vis hvor figuren er når den er utenfor skjermen ----------
let fadeOn = store.get('tlm.fade', true);
const FADE_OP = 0.16;
function segHitsBox(a, d, b, pad) {                              // linjestykke a→a+d mot boks (utvidet med pad): slab-metoden
  let t0 = 0, t1 = 1;
  for (let i = 0; i < 3; i++) {
    const lo = b.min[i] - pad, hi = b.max[i] + pad;
    if (Math.abs(d[i]) < 1e-9) { if (a[i] < lo || a[i] > hi) return false; continue; }
    let u = (lo - a[i]) / d[i], v = (hi - a[i]) / d[i]; if (u > v) [u, v] = [v, u];
    t0 = Math.max(t0, u); t1 = Math.min(t1, v); if (t0 > t1) return false;
  }
  return true;
}
function setFadeMats(e, on) {
  for (const root of e.obj) root.traverse((o) => {
    if (!o.isMesh) return;
    if (on) {
      if (!e.orig.has(o)) e.orig.set(o, o.material);
      if (!e.clone.has(o)) { const cl = (x) => { const c = x.clone(); c.transparent = true; return c; }; e.clone.set(o, Array.isArray(o.material) ? o.material.map(cl) : cl(o.material)); }
      o.material = e.clone.get(o);
    } else if (e.orig.has(o)) o.material = e.orig.get(o);
  });
}
function updateFades(dt) {
  const on = fadeOn && mode !== 'plan' && cam.cur > 0.6;
  const a = [camera.position.x, camera.position.y, camera.position.z], d = [cam.target.x - a[0], cam.target.y - a[1], cam.target.z - a[2]];
  for (const e of fadeEntries) {
    const hit = on && e.boxes.some((b) => !b.carried && segHitsBox(a, d, b, 0.12));
    const was = e.t;
    e.t = Math.max(0, Math.min(1, e.t + (hit ? 1 : -1) * dt * 6));
    if (e.t > 0 && was === 0) setFadeMats(e, true);
    if (e.t > 0) {
      const op = 1 - (1 - FADE_OP) * e.t;
      for (const o of e.clone.keys()) for (const mt of [].concat(e.clone.get(o))) { mt.opacity = op; mt.depthWrite = e.t < 0.5; }
    }
    if (e.t === 0 && was > 0) setFadeMats(e, false);
  }
}
const offEl = $('offscreen');
function updateOffscreen() {
  hero.head.getWorldPosition(_v3); _v3.project(camera);
  const behind = _v3.z > 1, x = behind ? -_v3.x : _v3.x, y = behind ? -_v3.y : _v3.y;
  const out = behind || Math.abs(_v3.x) > 1.02 || _v3.y > 1.02 || _v3.y < -1.02;
  offEl.style.display = out && mode === 'play' ? 'flex' : 'none';
  if (!out || mode !== 'play') return;
  const k = 1 / Math.max(Math.abs(x) / 0.86, Math.abs(y) / 0.72, 1e-3);
  offEl.style.left = `${(x * k * 0.5 + 0.5) * innerWidth}px`; offEl.style.top = `${(-y * k * 0.5 + 0.5) * innerHeight}px`;
  offEl.firstElementChild.style.transform = `rotate(${Math.atan2(x, y)}rad)`;
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
  stepCamAnim(dt); compassFrame(now);
  render(now, dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

window.__camDbg = () => ({ camLook, camPitchBias, camLift, cur: cam.cur, pitch: cam.pitch });
window.__fadeCount = () => fadeEntries.filter((e) => e.t > 0.5).length;
window.__game = { camera, goalArrow, goalArrowG, say, setMood, touch, get audio() { return audio; }, unlockAudio, player, LEVEL, P, save, stats, setMode, cam, planCam, restartAll, update, poseHero, hero, tick: (n, dt = 1 / 60) => { for (let i = 0; i < n; i++) update(dt); } };   // tick: kjør spillogikk raskt (testing)
