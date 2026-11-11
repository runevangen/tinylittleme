// R17: tegner planen fra softlight_logic.js: bakt omgivelsesokklusjon (myke blobber), varm lysflekk fra vinduet og mykere skyggekant.
// Bare «Detaljert» grafikk, ikke Lav profil. Bare utseende.
import * as THREE from 'three';
import { planBlobs, planGlows, shadowRadius, softActive } from './softlight_logic.js';

export function makeSoftLight({ scene, LEVEL, floorY, sun, sunDir }) {
  const group = new THREE.Group(); group.name = 'softlight'; scene.add(group);
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), rg = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.5, 'rgba(255,255,255,.9)'); rg.addColorStop(0.78, 'rgba(255,255,255,.3)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  const geo = new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2);
  const mats = new Map();
  const matFor = (kind, op) => { const k = kind + op.toFixed(2); let m = mats.get(k); if (m) return m;
    m = new THREE.MeshBasicMaterial(kind === 'glow'
      ? { map: tex, color: 0xffa640, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, fog: false }
      : { map: tex, color: 0x150c05, transparent: true, opacity: op, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    mats.set(k, m); return m; };
  const blobs = planBlobs(LEVEL, floorY, sunDir), glows = planGlows(LEVEL, floorY, sunDir);
  const put = (p, kind, lift, order) => {
    const m = new THREE.Mesh(geo, matFor(kind, Math.round(p.op * 20) / 20)); m.scale.set(p.rx, 1, p.rz); m.position.set(p.x, p.y + lift, p.z); m.renderOrder = order; m.userData.noDetail = true; group.add(m);
  };
  for (const p of blobs) put(p, 'ao', 0.045, 1);
  for (const p of glows) put(p, 'glow', 0.06, 2);
  group.visible = false;
  let state = null;
  return {
    group, count: { blobs: blobs.length, glows: glows.length },
    // onSet = valget, low = Lav profil, gfxLow = Enkel grafikk
    update(onSet, low, gfxLow) {
      const act = softActive(onSet, low, gfxLow); group.visible = act;
      if (state !== act) { state = act; sun.shadow.radius = shadowRadius(onSet, low || gfxLow); }
    },
  };
}
