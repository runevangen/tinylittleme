// Sjef-maur (R9): modell og tegnefilm-animasjon. Bygger på maur-modellen (buildAnt), men stor, mørkerød, med gullkrone, sinte bryn og stjerner når den er svimmel.
// Lokal +x er fremover. Returnerer { root, update(b, now) } der b er sjef-tilstanden fra boss.js.
import * as THREE from 'three';
import { buildAnt } from './props.js';
import { BOSS } from './boss.js';

export function buildBoss() {
  const ant = buildAnt({ color: 0x7c1f14 }), root = new THREE.Group(), rig = new THREE.Group(), big = new THREE.Group();
  const SC = BOSS.rad / 0.62 * 0.92;                                         // antas som en vanlig maur (rad 0,62), skalert til sjefens størrelse
  big.scale.setScalar(SC); big.add(ant.root); rig.add(big); root.add(rig);
  const shells = [];                                                          // skallmaterialer: gløder rødt når den varsler
  ant.root.traverse((o) => { if (o.material && o.material.clearcoat !== undefined) { o.material.emissive = new THREE.Color(0); shells.push(o.material); } });
  const gold = new THREE.MeshStandardMaterial({ color: 0xffc83a, roughness: 0.25, metalness: 0.7, emissive: 0x3a2400 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1c0a06, roughness: 0.5 });
  const M = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; return m; };
  // krone: ring med fem spisser, på hodet (hodet sitter foran: x ≈ 0,62)
  const crown = new THREE.Group();
  const ring = M(new THREE.CylinderGeometry(0.3, 0.3, 0.14, 16, 1, true), gold); ring.material.side = THREE.DoubleSide; crown.add(ring);
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2, sp = M(new THREE.ConeGeometry(0.07, 0.22, 6), gold); sp.position.set(Math.cos(a) * 0.27, 0.16, Math.sin(a) * 0.27); crown.add(sp); const ball = M(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshStandardMaterial({ color: i % 2 ? 0xe23a3a : 0x3aa0e2, roughness: 0.2 })); ball.position.set(Math.cos(a) * 0.27, 0.3, Math.sin(a) * 0.27); crown.add(ball); }
  crown.position.set(0.58, 1.05, 0); crown.rotation.z = -0.1; ant.root.add(crown);
  // sinte bryn over de store øynene
  for (const z of [-1, 1]) { const br = M(new THREE.BoxGeometry(0.34, 0.07, 0.09), dark); br.position.set(0.9, 0.99, z * 0.2); br.rotation.x = z * 0.42; br.rotation.z = -0.15; ant.root.add(br); }
  // stjerner som kretser over hodet når den er svimmel
  const stars = new THREE.Group(), starMat = new THREE.MeshStandardMaterial({ color: 0xffe14a, emissive: 0xaa8800, roughness: 0.4 });
  for (let i = 0; i < 4; i++) { const s = M(new THREE.OctahedronGeometry(0.17, 0), starMat); s.userData.a = i / 4 * Math.PI * 2; stars.add(s); }
  stars.visible = false; ant.root.add(stars);
  // kontaktskygge på gulvet (billig blob)
  const blob = new THREE.Mesh(new THREE.CircleGeometry(BOSS.rad * 1.1, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = 0.03; root.add(blob);
  const red = new THREE.Color(0xff2a10);

  function update(b, now = 0) {
    let squash = 0, rear = 0, shake = 0, glow = 0, slump = 0, spin = 0;
    const mode = b.mode;
    if (mode === 'windup') { rear = Math.sin(Math.min(1, b.wind * 1.4) * Math.PI / 2) * 0.55; shake = b.wind * 0.07; glow = 0.35 + 0.65 * (Math.sin(b.mt * 28) * 0.5 + 0.5); }
    else if (mode === 'charge') { rear = -0.12; glow = 0.5; }
    else if (mode === 'stunned') { slump = b.stunK; glow = 0; }
    else if (mode === 'hit') { shake = 0.12; glow = Math.max(0, 1 - b.mt / 0.5) * (Math.sin(b.mt * 40) > 0 ? 1 : 0.2); slump = Math.max(0, 1 - b.mt * 3) * 0.6; }
    else if (mode === 'dead') { squash = Math.min(1, b.mt / 0.9); spin = b.mt * 9; }
    for (const m of shells) m.emissive.copy(red).multiplyScalar(glow * 0.55);
    ant.update(b.anim * 9, b.speedNow || 0, 0, b.alerted);
    ant.root.rotation.z = rear * (mode === 'stunned' ? 0 : 1);                  // reiser seg på bakbeina
    rig.position.set((Math.random() - 0.5) * shake, -slump * 0.7, (Math.random() - 0.5) * shake);
    rig.rotation.x = mode === 'stunned' ? Math.sin(b.anim * 4) * 0.06 : 0;
    rig.rotation.y = spin; rig.scale.set(1 + squash * 0.55, Math.max(0.05, 1 - squash * 0.95), 1 + squash * 0.55);
    big.scale.setScalar(SC * (mode === 'stunned' ? 1 - slump * 0.12 : 1));
    stars.visible = mode === 'stunned';
    if (stars.visible) { stars.position.set(0.6, 1.5, 0); stars.children.forEach((s) => { const a = s.userData.a + b.anim * 4; s.position.set(Math.cos(a) * 0.5, Math.sin(a * 2) * 0.05, Math.sin(a) * 0.5); s.rotation.y = a * 2; }); }
    crown.visible = mode !== 'dead' || b.mt < 1.2;
    root.visible = !b.gone;
  }
  return { root, update, ant, SC };
}

// Premien: en stor gyllen smule som ligger igjen når sjefen er slått.
export function buildPrize() {
  const g = new THREE.Group(), mat = new THREE.MeshStandardMaterial({ color: 0xffd24a, roughness: 0.3, metalness: 0.4, emissive: 0x7a4a00, flatShading: true });
  const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 0), mat); m.scale.set(1.2, 0.9, 1); m.castShadow = true; g.add(m);
  const halo = new THREE.Mesh(new THREE.RingGeometry(0.75, 0.9, 28), new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }));
  halo.rotation.x = -Math.PI / 2; halo.position.y = -0.3; g.add(halo);
  return g;
}
