import * as THREE from 'three';
import { newPlayer, resetPlayer, step } from './physics.js';
import { LEVEL } from './level.js';

// ---------- scene ----------
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xbfe3ff);
scene.fog = new THREE.Fog(0xbfe3ff, 60, 140);
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 300);

scene.add(new THREE.HemisphereLight(0xffffff, 0xb59a7a, 1.0));
const sun = new THREE.DirectionalLight(0xfff2d6, 2.2);
sun.position.set(30, 70, 25);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -50, right: 50, top: 50, bottom: -50, near: 1, far: 200 });
scene.add(sun);

function plankTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#d9b382'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 4; i++) {
    g.fillStyle = i % 2 ? '#d2a974' : '#dfbb8d';
    g.fillRect(0, i * 64, 256, 64);
    g.fillStyle = '#b88c5a'; g.fillRect(0, i * 64, 256, 2);
    g.fillRect(((i * 97) % 200) + 20, i * 64, 2, 64);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const edgeMat = new THREE.LineBasicMaterial({ color: 0x3a2a20 });
for (const b of LEVEL.boxes) {
  if (b.hidden) continue;
  const sx = b.max[0] - b.min[0], sy = b.max[1] - b.min[1], sz = b.max[2] - b.min[2];
  const geo = new THREE.BoxGeometry(sx, sy, sz);
  const mat = new THREE.MeshLambertMaterial({ color: b.color ?? 0xcccccc });
  if (b.type === 'floor') { mat.map = plankTexture(); mat.map.repeat.set(sx / 8, sz / 8); mat.color.set(0xffffff); }
  const m = new THREE.Mesh(geo, mat);
  m.position.set(b.min[0] + sx / 2, b.min[1] + sy / 2, b.min[2] + sz / 2);
  m.castShadow = b.type !== 'floor'; m.receiveShadow = true;
  scene.add(m);
  if (b.type !== 'floor') m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat));
}

// tau
const ropeMat = new THREE.LineBasicMaterial({ color: 0x222222 });
const ropeLines = LEVEL.ropes.map((r) => {
  const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(r.x, 60, r.z), new THREE.Vector3(r.x, r.y - r.len, r.z)]);
  const line = new THREE.Line(geo, ropeMat); scene.add(line);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 12), new THREE.MeshLambertMaterial({ color: 0xff6b6b }));
  knob.position.set(r.x, r.y - r.len, r.z); scene.add(knob);
  return line;
});

// mål: trylledrikk
const goal = new THREE.Group();
goal.add(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 1.1, 16), new THREE.MeshLambertMaterial({ color: 0x66ffcc, emissive: 0x22aa88 })));
const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.5, 12), new THREE.MeshLambertMaterial({ color: 0xffffff }));
neck.position.y = 0.8; goal.add(neck);
goal.position.set(...LEVEL.goal); scene.add(goal);
const glow = new THREE.PointLight(0x66ffcc, 40, 14); glow.position.y = 1; goal.add(glow);

// spiller (leketøysfigur)
const hero = new THREE.Group();
const skin = new THREE.MeshLambertMaterial({ color: 0xffd9b3 });
const shirt = new THREE.MeshLambertMaterial({ color: 0xd62828 });
const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.27, 0.3, 4, 12), shirt); body.position.y = 0.38;
const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), skin); head.position.y = 0.8;
const cap = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x1d3557 }));
cap.position.y = 0.84;
const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
for (const s of [-1, 1]) {
  const e = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), eyeMat); e.position.set(s * 0.1, 0.8, 0.26); hero.add(e);
}
const arms = [-1, 1].map((s) => {
  const a = new THREE.Group(); a.position.set(s * 0.3, 0.55, 0);
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.3, 4, 8), skin); m.position.y = -0.2; a.add(m);
  hero.add(a); return a;
});
hero.add(body, head, cap);
hero.traverse((o) => { if (o.isMesh) o.castShadow = true; });
scene.add(hero);

// ---------- input ----------
const keys = new Set();
let jumpEdge = false, grabEdge = false;
const touch = { x: 0, y: 0, jump: false, grab: false };
addEventListener('keydown', (e) => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (keys.has(e.code)) return;
  keys.add(e.code);
  if (e.code === 'Space') jumpEdge = true;
  if (['ShiftLeft', 'ShiftRight', 'KeyE'].includes(e.code)) grabEdge = true;
  if (e.code === 'KeyR') restart();
  if (e.code === 'KeyH') document.getElementById('help').classList.toggle('hide');
});
addEventListener('keyup', (e) => keys.delete(e.code));
const held = (...codes) => codes.some((c) => keys.has(c));

let yaw = 0.35, pitch = 0.45;
let drag = null;
canvas.addEventListener('pointerdown', (e) => { drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', (e) => {
  if (!drag || drag.id !== e.pointerId) return;
  yaw -= (e.clientX - drag.x) * 0.006; pitch = Math.min(1.3, Math.max(0.05, pitch + (e.clientY - drag.y) * 0.004));
  drag.x = e.clientX; drag.y = e.clientY;
});
canvas.addEventListener('pointerup', () => { drag = null; });

const stick = document.getElementById('stick'), knob = document.getElementById('knob');
let stickId = null;
function stickMove(e) {
  const r = stick.getBoundingClientRect();
  let dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2), dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
  const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
  touch.x = dx; touch.y = -dy;
  knob.style.transform = `translate(${dx * 40}px, ${dy * 40}px)`;
}
stick.addEventListener('pointerdown', (e) => { stickId = e.pointerId; stick.setPointerCapture(e.pointerId); stickMove(e); });
stick.addEventListener('pointermove', (e) => { if (e.pointerId === stickId) stickMove(e); });
const stickEnd = (e) => { if (e.pointerId !== stickId) return; stickId = null; touch.x = touch.y = 0; knob.style.transform = ''; };
stick.addEventListener('pointerup', stickEnd); stick.addEventListener('pointercancel', stickEnd);
function bindBtn(id, key, edgeSetter) {
  const el = document.getElementById(id);
  el.addEventListener('pointerdown', (e) => { el.setPointerCapture(e.pointerId); touch[key] = true; edgeSetter(); });
  const up = () => { touch[key] = false; };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
}
bindBtn('btnJump', 'jump', () => { jumpEdge = true; });
bindBtn('btnGrab', 'grab', () => { grabEdge = true; });

// ---------- spill ----------
const player = newPlayer(...LEVEL.start);
let respawn = [...LEVEL.start];
let won = false, clock = 0;
const camTarget = new THREE.Vector3(...LEVEL.start);
const overlay = document.getElementById('win');
const hud = document.getElementById('hud');

function restart() {
  resetPlayer(player, ...LEVEL.start);
  respawn = [...LEVEL.start]; won = false; clock = 0; overlay.classList.add('hide');
}
document.getElementById('again').addEventListener('click', restart);

function update(dt) {
  if (!won) clock += dt;
  const ix = (held('KeyD', 'ArrowRight') ? 1 : 0) - (held('KeyA', 'ArrowLeft') ? 1 : 0) + touch.x;
  const iz = (held('KeyW', 'ArrowUp') ? 1 : 0) - (held('KeyS', 'ArrowDown') ? 1 : 0) + touch.y;
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
  const inp = {
    mx: rx * ix + fx * iz, mz: rz * ix + fz * iz,
    jumpPressed: jumpEdge, jumpHeld: held('Space') || touch.jump,
    grabPressed: grabEdge, grabHeld: held('ShiftLeft', 'ShiftRight', 'KeyE') || touch.grab,
  };
  jumpEdge = grabEdge = false;
  step(player, inp, dt, LEVEL);

  if (player.onGround && player.groundBox?.cp) respawn = [player.x, player.y, player.z];
  if (player.y < LEVEL.deathY) { resetPlayer(player, ...respawn); }

  const g = LEVEL.goal;
  if (!won && Math.hypot(player.x - g[0], player.z - g[2]) < 2 && Math.abs(player.y - g[1]) < 2.5) {
    won = true;
    document.getElementById('time').textContent = clock.toFixed(1);
    overlay.classList.remove('hide');
  }
}

let dispFx = 0, dispFz = 1;
function render(now) {
  hero.position.set(player.x, player.y, player.z);
  dispFx += (player.fx - dispFx) * 0.3; dispFz += (player.fz - dispFz) * 0.3;
  hero.rotation.y = Math.atan2(dispFx, dispFz);
  const s = Math.max(-0.12, Math.min(0.18, player.vy * 0.012));
  hero.scale.set(1 - s * 0.5, 1 + s, 1 - s * 0.5);
  const up = player.state === 'hang' || player.state === 'swing';
  const swing = player.state === 'ground' ? Math.sin(now * 0.02) * Math.min(1, Math.hypot(player.vx, player.vz) / 6) * 0.9 : 0;
  arms[0].rotation.x = up ? Math.PI : swing; arms[1].rotation.x = up ? Math.PI : -swing;

  LEVEL.ropes.forEach((r, i) => {
    const pos = ropeLines[i].geometry.attributes.position;
    if (player.rope === r) pos.setXYZ(1, player.x, player.y + 0.85, player.z);
    else pos.setXYZ(1, r.x, r.y - r.len, r.z);
    pos.needsUpdate = true;
  });

  goal.rotation.y = now * 0.002; goal.position.y = LEVEL.goal[1] + 0.6 + Math.sin(now * 0.003) * 0.15;

  camTarget.lerp(new THREE.Vector3(player.x, player.y + 1.2, player.z), 0.12);
  const d = 13;
  camera.position.set(
    camTarget.x + Math.sin(yaw) * Math.cos(pitch) * d,
    camTarget.y + Math.sin(pitch) * d,
    camTarget.z + Math.cos(yaw) * Math.cos(pitch) * d,
  );
  camera.lookAt(camTarget);
  renderer.render(scene, camera);
  hud.textContent = `${player.state}${player.sliding ? ' (glir)' : ''}  høyde ${player.y.toFixed(1)}  tid ${clock.toFixed(0)}s`;
}

function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  update(dt); render(now);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// for testing/inspeksjon fra konsollen
window.__game = { player, LEVEL, restart };
