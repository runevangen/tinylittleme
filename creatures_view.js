// R19: modeller for pillbug (roller) og tråd-edderkopp (dangler). Begge returnerer { root, update(phase, speed, squash, alerted, t) } som maur-modellene i props.js.
import * as THREE from 'three';
import { buildSpider } from './props.js';

const mesh = (g, m) => { const o = new THREE.Mesh(g, m); o.castShadow = true; o.receiveShadow = true; return o; };
export const ROLLER_COL = 0x6f8196, WARN_COL = 0xff7a1a, DANGLER_COL = 0x2f7f6a, DANGLER_WARN = 0xff2a1a;

// Pillbug: blågrå panser av seks plater, to små øyne, følehorn og korte bein. Når den varsler lyser den oransje og ruller seg sammen til en kule; ruller den, snurrer kula.
export function buildRoller() {
  const root = new THREE.Group(), spin = new THREE.Group(), body = new THREE.Group(); spin.position.y = 0.6; body.position.y = -0.6; spin.add(body); root.add(spin);   // spin = rullesenteret (kula roterer rundt midten)
  const shell = new THREE.MeshPhysicalMaterial({ color: ROLLER_COL, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.15, emissive: 0x000000 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a3340, roughness: 0.5 }), white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.15 }), black = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1 });
  const N = 6, plates = [];
  for (let k = 0; k < N; k++) { const m = mesh(new THREE.SphereGeometry(0.42, 16, 12), shell); body.add(m); plates.push(m); }
  const head = mesh(new THREE.SphereGeometry(0.26, 14, 10), shell); body.add(head);
  const eyes = []; for (const z of [-1, 1]) { const e = mesh(new THREE.SphereGeometry(0.075, 10, 8), white), p = mesh(new THREE.SphereGeometry(0.04, 8, 6), black); e.add(p); p.position.set(0.05, 0, 0); body.add(e); eyes.push({ e, z }); }
  const feel = []; for (const z of [-1, 1]) { const f = mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.5, 6), dark); body.add(f); feel.push({ f, z }); }
  const legs = []; for (let i = 0; i < 6; i++) for (const z of [-1, 1]) { const l = mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.3, 6), dark); body.add(l); legs.push({ l, x: -0.5 + i * 0.2, z, ph: (i + (z > 0 ? 1 : 0)) % 2 ? Math.PI : 0 }); }
  const warn = new THREE.Color(WARN_COL), base = new THREE.Color(ROLLER_COL);
  function update(phase, speed = 0, squash = 0, alerted = false, t = {}) {
    const c = t.crouchK || 0, rolling = t.mode === 'roll', walk = Math.min(1, speed / 1.5) * (rolling ? 0 : 1);
    // plater: strukket ut langs x (c = 0) eller samlet i en kule (c = 1)
    for (let k = 0; k < N; k++) {                                   // plater: på rekke (c = 0) eller i en ring = kule (c = 1)
      const u = k / (N - 1) - 0.5, ph = u * Math.PI * 1.7, x0 = u * 2.0 - 0.1, y0 = 0.42 - Math.abs(u) * 0.12, x1 = Math.sin(ph) * 0.28, y1 = 0.6 - Math.cos(ph) * 0.28;
      plates[k].position.set(x0 + (x1 - x0) * c, y0 + (y1 - y0) * c, 0);
      const sy0 = 0.85 - Math.abs(u) * 0.35, sz0 = 1.05 - Math.abs(u) * 0.2;
      plates[k].scale.set(0.55 + (0.8 - 0.55) * c, sy0 + (0.8 - sy0) * c, sz0 + (0.8 - sz0) * c);
    }
    const hide = c > 0.6 ? 0 : 1;
    head.position.set(1.05 - c * 0.7, 0.34 + c * 0.15, 0); head.scale.setScalar(Math.max(0.01, 1 - c * 0.2) * (hide ? 1 : 0.01));
    for (const { e, z } of eyes) { e.position.set(1.22 - c * 0.7, 0.42 + c * 0.15, z * 0.14); e.scale.setScalar(hide ? 1 : 0.001); }
    for (const { f, z } of feel) { f.position.set(1.3 - c * 0.7, 0.55, z * 0.1); f.rotation.set(z * 0.5, 0, -1.1 + Math.sin(phase * 0.8) * 0.12); f.scale.setScalar(hide ? 1 : 0.001); }
    for (const g of legs) { const sw = Math.sin(phase + g.ph) * 0.12 * walk; g.l.position.set(g.x + sw, 0.12, g.z * 0.38); g.l.rotation.set(g.z * 0.3, 0, 0); g.l.scale.setScalar(hide ? 1 : 0.001); }
    shell.color.copy(base).lerp(warn, alerted ? Math.max(c, 0.5) : 0);
    shell.emissive.setHex(alerted ? 0xff5a00 : 0x000000); shell.emissiveIntensity = alerted ? 0.35 + 0.25 * Math.sin(phase * 3) : 0;
    spin.position.y = 0.6 + Math.abs(Math.sin(phase)) * 0.03 * walk; spin.position.x = t.mode === 'curl' ? Math.sin(phase * 4) * 0.04 : 0;
    spin.rotation.z = rolling ? -phase * 1.3 : 0;
    root.scale.set(1 + squash * 0.5, Math.max(0.04, 1 - squash * 0.96), 1 + squash * 0.5);
  }
  update(0, 0, 0, false, {});
  return { root, update };
}

// Tråd-edderkopp: en grønn edderkopp som henger i en tynn tråd fra taket. Varsler ved å riste og lyse rødt, og stuper så ned.
export function buildDangler({ ceil = 48 } = {}) {
  const root = new THREE.Group(), sp = buildSpider({ color: DANGLER_COL }), body = sp.root;
  const thread = mesh(new THREE.CylinderGeometry(0.025, 0.025, 1, 6), new THREE.MeshStandardMaterial({ color: 0xe8e8e0, roughness: 0.6 })); thread.castShadow = false;
  const glowMat = new THREE.MeshBasicMaterial({ color: DANGLER_WARN, transparent: true, opacity: 0, depthWrite: false });
  const glow = new THREE.Mesh(new THREE.SphereGeometry(1.05, 14, 10), glowMat); glow.position.set(0, 0.7, 0);
  root.add(body, thread, glow);
  function update(phase, speed = 0, squash = 0, alerted = false, t = {}) {
    const y = Number.isFinite(t.y) ? t.y : 6, len = Math.max(0.5, ceil - y - 1.2), shake = t.shake || 0, down = t.mode === 'plunge' || t.mode === 'hold';
    sp.update(phase, 0, squash, alerted, { crouchK: down ? 0 : 0.5, mode: down ? 'leap' : 'idle' });
    const sx = Math.sin(phase * 6) * 0.1 * shake;
    body.position.set(sx, 0, 0); body.rotation.z = Math.sin(phase * 5) * 0.12 * shake;
    thread.scale.set(1, len, 1); thread.position.set(sx * 0.4, 1.2 + len / 2, 0);
    glowMat.opacity = shake ? 0.18 + 0.14 * Math.sin(phase * 5) : (down ? 0.12 : 0); glow.position.x = sx;
  }
  update(0, 0, 0, false, {});
  return { root, update };
}
