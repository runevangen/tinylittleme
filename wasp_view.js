// R61: modell av vepsen (blank tegnefilm-stil, barneskala). Returnerer { root, update(phase, speed, squash, alerted, t) } som de andre fiendemodellene.
// Ingen nye shadere: bare MeshPhysical/Standard/Basic-materialer som maur og skapninger allerede bruker. ~16 meshes, ingen egne lys.
// Lesbarhet: svart/gul stripet bakkropp; ved varsel lyser den rødt (kant + liten glød) og en rød ring på flata viser hvor den stuper; skygge-flekk under viser hvor høyt den flyr.
import * as THREE from 'three';

const mesh = (g, m) => { const o = new THREE.Mesh(g, m); o.castShadow = true; o.receiveShadow = true; return o; };
export const WASP_COL = 0xf2b51d, WASP_WARN = 0xff2a1a;

export function buildWasp() {
  const root = new THREE.Group(), rig = new THREE.Group(); root.add(rig);
  const yellow = new THREE.MeshPhysicalMaterial({ color: WASP_COL, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.2 });
  const black = new THREE.MeshPhysicalMaterial({ color: 0x1b1b1f, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.25 });
  const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.15 }), pupil = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1 });
  const S = (r, mat, x, y, z, sx = 1, sy = 1, sz = 1, par = rig) => { const m = mesh(new THREE.SphereGeometry(r, 12, 8), mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); par.add(m); return m; };
  const abd = new THREE.Group(); abd.position.set(-0.35, 0, 0); rig.add(abd);                   // bakkroppen svinger i et ledd
  S(0.34, yellow, 0, 0, 0, 1.25, 0.95, 0.95, abd);                                             // stor gul bakkropp
  for (const x of [-0.22, 0.06]) S(0.3, black, x, 0, 0, 0.32, 1.0, 1.0, abd);                  // to svarte striper (tykke skiver)
  const sting = mesh(new THREE.ConeGeometry(0.07, 0.32, 8), black); sting.rotation.z = Math.PI / 2; sting.position.set(-0.55, 0, 0); abd.add(sting);
  S(0.24, yellow, 0.05, 0.02, 0, 1, 0.95, 0.95);                                               // brystet
  S(0.26, black, 0.4, 0.05, 0, 1, 1, 1);                                                       // hodet
  for (const z of [-1, 1]) { S(0.12, white, 0.55, 0.12, z * 0.15); S(0.065, pupil, 0.64, 0.12, z * 0.15); }   // store tegnefilm-øyne
  const feel = []; for (const z of [-1, 1]) { const f = mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.4, 5), black); f.position.set(0.6, 0.3, z * 0.1); f.rotation.set(z * 0.3, 0, -0.7); rig.add(f); feel.push(f); }
  const legs = []; for (const x of [0.15, -0.02, -0.18]) for (const z of [-1, 1]) { const l = mesh(new THREE.CylinderGeometry(0.018, 0.025, 0.38, 5), black); l.position.set(x, -0.28, z * 0.12); l.rotation.x = z * 0.35; rig.add(l); legs.push(l); }
  const wingMat = new THREE.MeshBasicMaterial({ color: 0xdfeeff, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide });
  const wings = []; for (const z of [-1, 1]) { const w = new THREE.Group(), m = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 6), wingMat); m.scale.set(0.8, 0.04, 0.42); m.position.set(0, 0, z * 0.32); w.add(m); w.position.set(0.0, 0.22, z * 0.08); rig.add(w); wings.push({ w, z }); }
  const glowMat = new THREE.MeshBasicMaterial({ color: WASP_WARN, transparent: true, opacity: 0, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending });
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.62, 12, 8), glowMat); glow.visible = false; rig.add(glow);
  const ringMat = new THREE.MeshBasicMaterial({ color: WASP_WARN, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.1, 28), ringMat); ring.rotation.x = -Math.PI / 2; ring.visible = false; root.add(ring);   // landingssted
  const blobMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false });
  const blob = new THREE.Mesh(new THREE.CircleGeometry(0.6, 20), blobMat); blob.rotation.x = -Math.PI / 2; root.add(blob);                        // skygge under
  const shells = [yellow, black];
  function update(phase, speed = 0, squash = 0, alerted = false, t = {}) {
    const warn = t.mode === 'warn', dive = t.mode === 'dive', down = t.mode === 'rest' || t.mode === 'stun';
    const flap = down ? Math.sin(phase * 3) * 0.25 : Math.sin(phase * 5.5) * 0.9;              // vingeslag (rolig mot bakken)
    for (const { w, z } of wings) { w.rotation.x = z * (0.5 + flap * 0.55); }
    const pulse = 0.5 + 0.5 * Math.sin(phase * 9), sh = (warn ? 1 : 0) * Math.sin(phase * 24) * 0.05;
    const hover = Number.isFinite(t.hover) ? t.hover : 0, tilt = dive ? -0.9 : warn ? 0.35 : down ? 0.2 : 0.12;
    rig.position.set(sh, hover + (down ? 0.12 : 0.35), 0); rig.rotation.z = tilt; rig.rotation.x = down ? Math.sin(phase * 2) * 0.1 : 0;
    abd.rotation.z = warn ? -0.5 : dive ? 0.25 : Math.sin(phase * 1.3) * 0.08;               // bakkroppen med brodden peker ned når den varsler
    for (const f of feel) f.rotation.x = Math.sin(phase * 2 + f.position.z * 9) * 0.2 + f.position.z * 3;
    for (const l of legs) l.rotation.z = dive ? 0.9 : down ? 0.1 : 0.45 + Math.sin(phase * 2) * 0.05;
    glow.visible = warn; glowMat.opacity = warn ? 0.14 + 0.16 * pulse : 0; glow.scale.setScalar(1 + 0.08 * pulse);
    for (const m of shells) { m.emissive.setHex(0xff1a10); m.emissiveIntensity = warn ? 0.18 + 0.3 * pulse : dive ? 0.22 : 0; }
    // ring og skygge ligger på flata under (lokale koordinater: roten står på vepsens posisjon og er dreid om y)
    const base = Number.isFinite(t.a?.[1]) ? t.a[1] : 0, gy = base - (Number.isFinite(t.y) ? t.y : base) + 0.04;
    let wx = 0, wz = 0; if (dive && Number.isFinite(t.tx)) { wx = t.tx - t.x; wz = t.tz - t.z; }
    const th = root.rotation.y, c = Math.cos(th), s = Math.sin(th), lx = wx * c - wz * s, lz = wx * s + wz * c, ty = dive && Number.isFinite(t.ty) ? t.ty - t.y + 0.04 : gy;
    ring.visible = warn || dive; ring.position.set(lx, ty, lz); ringMat.opacity = (warn || dive) ? 0.35 + 0.4 * pulse : 0; ring.scale.setScalar(warn ? 1.1 - 0.12 * pulse : 1);
    blob.position.set(0, gy, 0); blob.visible = !down; blobMat.opacity = 0.22; blob.scale.setScalar(1 - Math.min(0.5, Math.max(0, -gy - 1) * 0.08));
    root.scale.set(1 + squash * 0.5, Math.max(0.04, 1 - squash * 0.96), 1 + squash * 0.5);
  }
  update(0, 0, 0, false, {});
  return { root, update };
}
