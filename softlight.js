// R17: tegner planen fra softlight_logic.js: bakt omgivelsesokklusjon (myke blobber), varm lysflekk fra vinduet og mykere skyggekant.
// Bare «Detaljert» grafikk, ikke Lav profil. Bare utseende.
import { planBlobs, planGlows, shadowRadius, softActive, softShadowType } from './softlight_logic.js';

export function makeSoftLight({ THREE, scene, LEVEL, floorY, sun, sunDir, renderer }) {   // THREE kommer inn som argument (som perf_budget.js), så budsjettet kan måles i node {
  const group = new THREE.Group(); group.name = 'softlight'; scene.add(group);
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), rg = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  for (let i = 0; i <= 8; i++) { const t = i / 8, u = Math.min(1, Math.max(0, (t - 0.25) / 0.75)), a = 1 - u * u * (3 - 2 * u); rg.addColorStop(t, `rgba(255,255,255,${a.toFixed(3)})`); }   // flat kjerne (under tingen) som toner myk ut (smoothstep, ingen synlig kant)
  g.fillStyle = rg; g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  const geo = new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2);
  const mats = new Map();
  const matFor = (kind, op) => { const k = kind + op.toFixed(2); let m = mats.get(k); if (m) return m;
    m = new THREE.MeshBasicMaterial(kind === 'glow'
      ? { map: tex, color: 0xffa640, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, fog: false }
      : { map: tex, color: 0x0c0603, transparent: true, opacity: op, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    mats.set(k, m); return m; };
  const blobs = planBlobs(LEVEL, floorY, sunDir), glows = planGlows(LEVEL, floorY, sunDir);
  const put = (p, kind, lift, order) => {
    const m = new THREE.Mesh(geo, matFor(kind, Math.round(p.op * 8) / 8)); m.scale.set(p.rx, 1, p.rz); m.position.set(p.x, p.y + lift, p.z); m.renderOrder = order; m.userData.noDetail = true; group.add(m);
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
      if (state !== act) {
        state = act; sun.shadow.radius = shadowRadius(onSet, low || gfxLow);
        if (renderer) { const t = softShadowType(onSet, false, gfxLow) === 'pcf' ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;   // R35: Lav profil skal ikke bytte skyggetype (alle shadere kompileres på nytt); bare valget og grafikknivå gjør det   // radius virker bare i PCFShadowMap
          if (renderer.shadowMap.type !== t) { renderer.shadowMap.type = t; scene.traverse((o) => { const m = o.material; if (m) for (const x of Array.isArray(m) ? m : [m]) x.needsUpdate = true; }); } }
      }
    },
  };
}
