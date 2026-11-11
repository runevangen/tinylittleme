// Flagg og mål som rekvisitter (R11): stoffflagg som vaier på blank stang med pyntebokstaver, lagringsflagget tennes når et
// lagringspunkt tas, og målet står på en myk, pulserende ring. Bare utseende. Enkel grafikk: ingen lys, ingen bølgeberegning.
import * as THREE from 'three';
import { createFlagState, pulse, clothWave } from './markers_logic.js';

const nd = (m) => { m.userData.noDetail = true; return m; };   // ingen kornfilter (look.detailize) på rekvisitter
const cv = (w, h = w) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const mat = (low, o) => (low ? new THREE.MeshLambertMaterial({ color: o.color, emissive: o.emissive || 0, side: o.side }) : (o.clearcoat ? new THREE.MeshPhysicalMaterial({ roughness: 0.35, clearcoatRoughness: 0.25, ...o, clearcoat: 0.8 }) : new THREE.MeshStandardMaterial({ roughness: 0.5, ...o })));
const noDetailMesh = (mesh) => { mesh.userData.noDetail = true; return mesh; };

function clothTex() {
  const c = cv(256, 160), g = c.getContext('2d');
  g.fillStyle = '#e8453c'; g.fillRect(0, 0, 256, 160);
  g.fillStyle = '#fff1c9'; g.fillRect(0, 0, 256, 16); g.fillRect(0, 144, 256, 16);          // kantbånd som sydd
  g.strokeStyle = 'rgba(255,241,201,.9)'; g.lineWidth = 3; g.setLineDash([10, 8]); g.strokeRect(14, 24, 228, 112);   // sømmer
  g.setLineDash([]); g.fillStyle = '#ffd23f'; g.strokeStyle = '#b27a00'; g.lineWidth = 4; g.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 22 : 52; g.lineTo(128 + Math.cos(a) * r, 80 + Math.sin(a) * r); }
  g.closePath(); g.fill(); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function letterTex(ch, bg) {
  const c = cv(64), g = c.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, 64, 64);
  g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 3; g.strokeRect(3, 3, 58, 58);
  g.fillStyle = '#fff'; g.font = 'bold 42px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, 32, 35);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function buildFlag(scene, { low = false } = {}) {
  const root = new THREE.Group(), st = createFlagState();
  const base = noDetailMesh(new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.4, 0.14, low ? 12 : 24), mat(low, { color: 0x3d7be0, clearcoat: true })));
  base.position.y = 0.07;
  const pole = noDetailMesh(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 1.5, low ? 6 : 10), mat(low, { color: 0xf4f0e6, clearcoat: true })));
  pole.position.y = 0.85;
  const ball = noDetailMesh(new THREE.Mesh(new THREE.SphereGeometry(0.075, low ? 8 : 14, low ? 6 : 10), mat(low, { color: 0xffc83d, emissive: 0x6a4300, clearcoat: true })));
  ball.position.y = 1.62;
  const W = 0.72, Hh = 0.45;
  const geo = new THREE.PlaneGeometry(W, Hh, low ? 1 : 10, low ? 1 : 5); geo.translate(W / 2, 0, 0);
  const cloth = noDetailMesh(new THREE.Mesh(geo, mat(low, { color: low ? 0xe8453c : 0xffffff, side: THREE.DoubleSide, roughness: 0.85 })));
  if (!low) { cloth.material.map = clothTex(); cloth.material.emissive = new THREE.Color(0xff5a1f); cloth.material.emissiveMap = cloth.material.map; cloth.material.emissiveIntensity = 0; }
  cloth.position.set(0.04, 1.3, 0);
  const rest = geo.attributes.position.array.slice();
  root.add(base, pole, ball, cloth);
  // pyntebokstaver (små klosser) ved foten
  const colors = ['#ef476f', '#06a77d', '#f2a900'], letters = ['T', 'L', 'M'];
  letters.forEach((ch, i) => {
    const m = low ? new THREE.MeshLambertMaterial({ color: colors[i] }) : new THREE.MeshStandardMaterial({ map: letterTex(ch, colors[i]), roughness: 0.45 });
    const b = noDetailMesh(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), m)), a = i * 2.1 + 0.4;
    b.position.set(Math.cos(a) * 0.62, 0.1, Math.sin(a) * 0.62); b.rotation.y = -a + (i - 1) * 0.5; root.add(b);
  });
  // glød: ring på gulvet + lys (bare i detaljert grafikk)
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.95, low ? 20 : 40), ringMat); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03; ring.renderOrder = 4; root.add(ring);
  const light = low ? null : new THREE.PointLight(0xffb45a, 0, 7);
  if (light) { light.position.y = 1.2; root.add(light); }
  scene.add(root);
  return {
    root,
    place(p) { root.position.set(p[0], p[1], p[2]); },
    ignite: st.ignite, extinguish: st.extinguish, state: st.s,
    update(now, dt) {
      const o = st.update(Math.min(0.1, dt || 0.016)), t = now / 1000, pu = pulse(t, 2.6);
      ringMat.opacity = o.lit * (0.35 + 0.2 * pu) + o.burst * 0.5; ring.scale.setScalar(1 + o.burst * 0.8 + 0.05 * pu);
      if (light) light.intensity = o.glow * (1.6 + 0.5 * pu) * 6;
      if (!low) cloth.material.emissiveIntensity = 0.06 + 0.4 * o.lit + 0.5 * o.burst;
      ball.material.emissiveIntensity = 0.3 + o.glow;
      if (low) cloth.material.color.setHex(o.lit > 0.5 ? 0xe8453c : 0xb86b66);
      if (!low) {
        const p = geo.attributes.position.array;
        for (let i = 0; i < p.length; i += 3) p[i + 2] = clothWave(rest[i] / W, rest[i + 1], t, 0.08);
        geo.attributes.position.needsUpdate = true; geo.computeVertexNormals();
      } else cloth.rotation.y = Math.sin(t * 4) * 0.25;
    },
  };
}

// Målet: en myk, pulserende ring på gulvet og blank sokkel under flasken (flasken selv står i main.js)
export function buildGoalRing(scene, pos, { low = false } = {}) {
  const root = new THREE.Group(); root.position.set(pos[0], pos[1], pos[2]);
  const pad = noDetailMesh(new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.1, 0.12, low ? 16 : 32), mat(low, { color: 0xfff3c4, emissive: 0x3a2d00, clearcoat: true })));
  pad.position.y = 0.06;
  const m1 = new THREE.MeshBasicMaterial({ color: 0x3df0b0, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const m2 = m1.clone();
  const r1 = new THREE.Mesh(new THREE.RingGeometry(1.15, 1.5, low ? 20 : 48), m1), r2 = new THREE.Mesh(new THREE.RingGeometry(1.15, 1.25, low ? 20 : 48), m2);
  for (const r of [r1, r2]) { r.rotation.x = -Math.PI / 2; r.position.y = 0.14; r.renderOrder = 4; }
  root.add(pad, r1, r2);
  const stars = [];
  if (!low) for (let i = 0; i < 6; i++) { const s = noDetailMesh(new THREE.Mesh(new THREE.OctahedronGeometry(0.1), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffe066 : 0x8ffff0 }))); stars.push(s); root.add(s); }
  scene.add(root);
  return {
    root,
    update(now, visible = true) {
      root.visible = visible; if (!visible) return;
      const t = now / 1000, pu = pulse(t, 2.2);
      m1.opacity = 0.4 + 0.3 * pu; r1.scale.setScalar(1 + 0.04 * pu);
      const k = (t * 0.5) % 1; r2.scale.setScalar(1 + k * 0.7); m2.opacity = 0.55 * (1 - k);
      stars.forEach((s, i) => { const a = t * 0.9 + i * Math.PI / 3; s.position.set(Math.cos(a) * 1.3, 0.5 + 0.25 * Math.sin(t * 2 + i), Math.sin(a) * 1.3); s.rotation.y = t * 2 + i; });
    },
  };
}
