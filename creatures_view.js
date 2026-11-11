// R19: modeller for pillbug (roller) og tråd-edderkopp (dangler). Begge returnerer { root, update(phase, speed, squash, alerted, t) } som maur-modellene i props.js.
import * as THREE from 'three';
import { buildSpider } from './props.js';

const mesh = (g, m) => { const o = new THREE.Mesh(g, m); o.castShadow = true; o.receiveShadow = true; return o; };
export const ROLLER_COL = 0x3f5a78, WARN_COL = 0xff7a1a, DANGLER_COL = 0x2f7f6a, DANGLER_WARN = 0xff2a1a;

// Pillbug: sammenhengende blågrått panser av overlappende plater (annenhver plate litt lysere, så ringene synes), stort hode med øyne og følehorn, lyse bein.
// Når den varsler beholder den kroppsfargen: den ruller seg sammen til en kule, rister, og en oransje glød (skall rundt kula + ring på gulvet) pulserer. Ruller den, snurrer kula.
export function buildRoller() {
  const root = new THREE.Group(), rig = new THREE.Group(), spin = new THREE.Group(), body = new THREE.Group(); rig.scale.setScalar(1.15); spin.position.y = 0.6; body.position.y = -0.6; spin.add(body); rig.add(spin); root.add(rig);   // spin = rullesenteret (kula roterer rundt midten)
  const shellA = new THREE.MeshPhysicalMaterial({ color: ROLLER_COL, roughness: 0.45, clearcoat: 0.35, clearcoatRoughness: 0.3 }), shellB = shellA.clone(); shellB.color.setHex(0x52708f);
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a3340, roughness: 0.5 }), leg = new THREE.MeshStandardMaterial({ color: 0xaab6c4, roughness: 0.5 }), white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.15 }), black = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1 });
  const N = 7, plates = [];
  for (let k = 0; k < N; k++) { const m = mesh(new THREE.SphereGeometry(0.46, 18, 14), k % 2 ? shellB : shellA); body.add(m); plates.push(m); }
  const belly = mesh(new THREE.SphereGeometry(0.5, 14, 10), dark); body.add(belly);                       // mørk underside: dekker alle mellomrom mellom platene
  const headM = new THREE.MeshStandardMaterial({ color: 0x27323f, roughness: 0.4 }), head = mesh(new THREE.SphereGeometry(0.34, 16, 12), headM); body.add(head);
  const eyes = []; for (const z of [-1, 1]) { const e = mesh(new THREE.SphereGeometry(0.14, 12, 10), white), p = mesh(new THREE.SphereGeometry(0.08, 8, 6), black); e.add(p); p.position.set(0.09, 0.01, 0); body.add(e); eyes.push({ e, z }); }
  const feel = []; for (const z of [-1, 1]) { const f = mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.7, 6), dark), tip = mesh(new THREE.SphereGeometry(0.065, 8, 6), leg); tip.position.y = 0.37; f.add(tip); body.add(f); feel.push({ f, z }); }
  const legs = []; for (let i = 0; i < 6; i++) for (const z of [-1, 1]) { const l = mesh(new THREE.CylinderGeometry(0.05, 0.065, 0.36, 6), leg); body.add(l); legs.push({ l, x: -0.55 + i * 0.22, z, ph: (i + (z > 0 ? 1 : 0)) % 2 ? Math.PI : 0 }); }
  // varselglød: skall rundt kula (baksiden, så den ser ut som en lysende kant) og en ring på gulvet
  const glowMat = new THREE.MeshBasicMaterial({ color: WARN_COL, transparent: true, opacity: 0, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending });
  const glow = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), glowMat); glow.position.y = 0.6; glow.visible = false; rig.add(glow);
  const ringMat = new THREE.MeshBasicMaterial({ color: WARN_COL, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.05, 32), ringMat); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03; ring.visible = false; rig.add(ring);
  function update(phase, speed = 0, squash = 0, alerted = false, t = {}) {
    const c = t.crouchK || 0, rolling = t.mode === 'roll', walk = Math.min(1, speed / 1.5) * (rolling ? 0 : 1);
    for (let k = 0; k < N; k++) {                                   // plater: tett på rekke (c = 0) eller i en ring = kule (c = 1)
      const u = k / (N - 1) - 0.5, th = (k / N) * Math.PI * 2, x0 = u * 1.5 - 0.1, y0 = 0.42 + (1 - 4 * u * u) * 0.1, x1 = Math.sin(th) * 0.3, y1 = 0.6 - Math.cos(th) * 0.3;
      plates[k].position.set(x0 + (x1 - x0) * c, y0 + (y1 - y0) * c, 0);
      const sx0 = 0.8, sy0 = 0.85 - Math.abs(u) * 0.3, sz0 = 1.0 - Math.abs(u) * 0.3;
      plates[k].scale.set(sx0 + (0.95 - sx0) * c, sy0 + (0.95 - sy0) * c, sz0 + (0.95 - sz0) * c);
    }
    const hide = c > 0.6 ? 0 : 1;
    belly.position.set(-0.1, 0.2, 0); belly.scale.set(1.55 * (1 - c) + 0.01, 0.4 * (1 - c) + 0.01, 0.75 * (1 - c) + 0.01);
    head.position.set(1.0 - c * 0.7, 0.38 + c * 0.1, 0); head.scale.setScalar(Math.max(0.01, 1 - c * 0.2) * (hide ? 1 : 0.01));
    for (const { e, z } of eyes) { e.position.set(1.18 - c * 0.7, 0.5 + c * 0.1, z * 0.21); e.scale.setScalar(hide ? 1 : 0.001); }
    for (const { f, z } of feel) { f.position.set(1.18 - c * 0.7, 0.62, z * 0.12); f.rotation.set(z * 0.45, 0, -1.0 + Math.sin(phase * 0.8 + z) * 0.15); f.scale.setScalar(hide ? 1 : 0.001); }
    for (const g of legs) { const sw = Math.sin(phase + g.ph) * 0.12 * walk; g.l.position.set(g.x + sw, 0.14, g.z * 0.4); g.l.rotation.set(g.z * 0.35, 0, 0); g.l.scale.setScalar(hide ? 1 : 0.001); }
    // varsel: bare glød og risting, fargen på kroppen beholdes
    const pulse = 0.5 + 0.5 * Math.sin(phase * 7), on = alerted ? Math.max(0.35, c) : 0;
    glow.visible = ring.visible = on > 0.01; glow.scale.setScalar(0.55 + 0.38 * c + 0.04 * pulse); glowMat.opacity = on * (0.16 + 0.2 * pulse) * (t.mode === 'roll' ? 0.6 : 1);
    ring.scale.setScalar(0.75 + 0.3 * c + 0.06 * pulse); ringMat.opacity = on * (0.4 + 0.35 * pulse);
    shellA.emissive.setHex(alerted ? 0xff4400 : 0x000000); shellB.emissive.copy(shellA.emissive); shellA.emissiveIntensity = shellB.emissiveIntensity = alerted ? 0.06 + 0.08 * pulse : 0;   // svak varm kant, ikke omfarging
    const sh = t.mode === 'curl' ? Math.sin(phase * 22) * 0.07 : 0;
    spin.position.y = 0.6 + Math.abs(Math.sin(phase)) * 0.03 * walk; spin.position.x = sh; spin.rotation.x = t.mode === 'curl' ? Math.sin(phase * 19) * 0.12 : 0;
    spin.rotation.z = rolling ? -phase * 1.3 : 0;
    glow.rotation.z = ring.rotation.z = 0;
    root.scale.set(1 + squash * 0.5, Math.max(0.04, 1 - squash * 0.96), 1 + squash * 0.5);
  }
  update(0, 0, 0, false, {});
  return { root, update };
}

// Tråd-edderkopp: en grønn edderkopp som henger i en tynn tråd fra taket. Varsler ved å riste, lyse rødt (rød kant på kroppen + rød ring på gulvet under) og sige ned i bildet, og stuper så ned.
// Gløden er liten og ligger nær kroppen (ikke en stor kule), og ringen ligger flatt på gulvet, så ingenting dekker figuren eller knappene.
export function buildDangler({ ceil = 48 } = {}) {
  const root = new THREE.Group(), rig = new THREE.Group(), sp = buildSpider({ color: DANGLER_COL }), body = sp.root; rig.scale.setScalar(0.85);
  const shells = []; body.traverse((o) => { if (o.isMesh && o.material && o.material.clearcoat > 0 && !shells.includes(o.material)) shells.push(o.material); });
  const thread = mesh(new THREE.CylinderGeometry(0.025, 0.025, 1, 6), new THREE.MeshStandardMaterial({ color: 0xe8e8e0, roughness: 0.6 })); thread.castShadow = false;
  const glowMat = new THREE.MeshBasicMaterial({ color: DANGLER_WARN, transparent: true, opacity: 0, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending });
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.62, 14, 10), glowMat); glow.position.set(0, 0.62, 0);
  const ringMat = new THREE.MeshBasicMaterial({ color: DANGLER_WARN, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.2, 32), ringMat); ring.rotation.x = -Math.PI / 2; ring.visible = false;   // markerer landingsplassen på gulvet
  rig.add(body, glow); root.add(rig, thread, ring);
  function update(phase, speed = 0, squash = 0, alerted = false, t = {}) {
    const y = Number.isFinite(t.y) ? t.y : 6, len = Math.max(0.5, ceil - y - 1.2), shake = t.shake || 0, down = t.mode === 'plunge' || t.mode === 'hold', warn = t.mode === 'warn';
    sp.update(phase, 0, squash, alerted, { crouchK: down ? 0 : 0.5, mode: down ? 'leap' : 'idle' });
    const sx = Math.sin(phase * 6) * 0.1 * shake;
    rig.position.set(sx, 0, 0); body.rotation.z = Math.sin(phase * 5) * 0.12 * shake;
    thread.scale.set(1, len, 1); thread.position.set(sx * 0.4, 1.2 + len / 2, 0);
    const pulse = 0.5 + 0.5 * Math.sin(phase * 9), a = warn ? 1 : (down ? 0.35 : 0);
    glowMat.opacity = warn ? 0.14 + 0.16 * pulse : 0; glow.scale.setScalar(1 + 0.08 * pulse);
    for (const m of shells) { m.emissive.setHex(0xff1a10); m.emissiveIntensity = warn ? 0.18 + 0.28 * pulse : (down ? 0.18 : 0); }   // rød kant på kroppen (kroppsfargen beholdes)
    ring.visible = a > 0; ringMat.opacity = a * (0.35 + 0.4 * pulse); ring.position.set(0, (Number.isFinite(t.base) ? t.base - y : -y) + 0.04, 0); ring.scale.setScalar(warn ? 1.15 - 0.15 * pulse : 1);
  }
  update(0, 0, 0, false, {});
  return { root, update };
}
