// R31: Lekerommet (nivå 7): tegner legoknotter på gulv og tak (lekerom_logic.js bestemmer hvor) og tinnsoldaten (egen fiende). Bare utseende, ingen kollisjon.
// Knottene er to InstancedMesh (ett tegnekall for gulvet og ett for taket), så hele rommet koster 2 tegnekall og under 16 000 trekanter (LEGO.budget). main.js slår dem IKKE sammen.
import * as THREE from 'three';
import { LEGO, studPlan, marchPose } from './lekerom_logic.js';

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, ...o });
const mesh = (geo, mat, shadow = true) => { const m = new THREE.Mesh(geo, mat); m.castShadow = shadow; m.receiveShadow = true; return m; };

// Én sekskantet knott uten bunn: sider + lokk (18 trekanter), laget som egen geometri så den ikke trenger BufferGeometryUtils.
export function studGeometry(r = LEGO.studR, h = LEGO.studH, sides = LEGO.sides) {
  const side = new THREE.CylinderGeometry(r, r, h, sides, 1, true).toNonIndexed(), cap = new THREE.CircleGeometry(r, sides).rotateX(-Math.PI / 2).translate(0, h / 2, 0).toNonIndexed();
  const g = new THREE.BufferGeometry();
  for (const k of ['position', 'normal']) { const a = side.attributes[k].array, b = cap.attributes[k].array, o = new Float32Array(a.length + b.length); o.set(a); o.set(b, a.length); g.setAttribute(k, new THREE.BufferAttribute(o, 3)); }
  return g;
}

export function makeLekerom({ scene, LEVEL, floorY = 0, quality = 'high', density = 1 }) {
  const group = new THREE.Group(); group.name = 'lekerom'; scene.add(group);
  const plan = studPlan(LEVEL, { quality, density });
  if (!plan.studs) return { group, count: 0, tris: 0, calls: 0, plan, update(on) { group.visible = on; } };
  const geo = studGeometry(), mat = std(0xffffff, { roughness: 0.3, metalness: 0.05 }), d = new THREE.Object3D(), col = new THREE.Color();
  const make = (list, y, flip) => {
    if (!list.length) return null;
    const im = new THREE.InstancedMesh(geo, mat, list.length); im.castShadow = false; im.receiveShadow = true; im.frustumCulled = false; im.userData.noDetail = true;
    list.forEach((s, i) => { d.position.set(s.x, y, s.z); d.rotation.set(flip ? Math.PI : 0, (i % 6) * 0.1, 0); d.updateMatrix(); im.setMatrixAt(i, d.matrix); im.setColorAt(i, col.setHex(s.c)); });
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; group.add(im); return im;
  };
  const H = LEVEL.room?.height ?? 52;
  make(plan.floor, floorY + LEGO.studH / 2, false);          // knottene står på gulvet
  make(plan.ceil, H - LEGO.studH / 2, true);                  // og henger ned fra taket
  let calls = 0; group.traverse((o) => { if (o.isMesh) calls++; });
  return { group, count: plan.studs, tris: plan.tris, calls, plan, update(on) { group.visible = on; } };
}

// Tinnsoldat (maur med skin 'soldier'): rød jakke, blå bukser, svart hatt med gul busk og gevær på skulderen, stående på en grønn rund plate. Ser mot +x (som maurene), ca. 1,3 enheter høy.
export function buildSoldier() {
  const root = new THREE.Group();
  const red = std(0xd23a2e, { roughness: 0.35 }), blue = std(0x2f55b8, { roughness: 0.4 }), skin = std(0xf0c9a0), black = std(0x1f2024, { roughness: 0.45 }), gold = std(0xf2c230, { roughness: 0.3, metalness: 0.4 }), base = std(0x3b9c4e, { roughness: 0.5 }), steel = std(0x9aa0a8, { metalness: 0.7, roughness: 0.3 });
  const body = new THREE.Group(); root.add(body);
  const plate = mesh(new THREE.CylinderGeometry(0.62, 0.66, 0.08, 14), base); plate.position.y = 0.04; root.add(plate);
  const legs = [-1, 1].map((s) => { const p = new THREE.Group(); p.position.set(0, 0.5, s * 0.17); const l = mesh(new THREE.BoxGeometry(0.2, 0.46, 0.2), blue); l.position.y = -0.23; p.add(l); const f = mesh(new THREE.BoxGeometry(0.3, 0.08, 0.22), black); f.position.set(0.05, -0.46, 0); p.add(f); body.add(p); return p; });
  const torso = mesh(new THREE.BoxGeometry(0.34, 0.5, 0.52), red); torso.position.y = 0.76; body.add(torso);
  const belt = mesh(new THREE.BoxGeometry(0.36, 0.07, 0.54), black); belt.position.y = 0.55; body.add(belt);
  for (const y of [0.68, 0.82, 0.96]) { const b = mesh(new THREE.SphereGeometry(0.034, 8, 6), gold, false); b.position.set(0.18, y, 0); body.add(b); }
  const arms = [-1, 1].map((s) => { const p = new THREE.Group(); p.position.set(0, 0.96, s * 0.3); const a = mesh(new THREE.BoxGeometry(0.14, 0.42, 0.13), red); a.position.y = -0.2; p.add(a); const h = mesh(new THREE.SphereGeometry(0.07, 8, 6), skin, false); h.position.y = -0.43; p.add(h); body.add(p); return p; });
  const head = mesh(new THREE.SphereGeometry(0.2, 14, 10), skin); head.position.y = 1.17; body.add(head);
  for (const s of [-1, 1]) { const e = mesh(new THREE.SphereGeometry(0.025, 6, 5), black, false); e.position.set(0.18, 1.2, s * 0.07); body.add(e); }
  const hat = mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.3, 12), black); hat.position.y = 1.4; body.add(hat);
  const brim = mesh(new THREE.BoxGeometry(0.3, 0.04, 0.34), black, false); brim.position.set(0.1, 1.27, 0); body.add(brim);
  const plume = mesh(new THREE.SphereGeometry(0.07, 8, 6), gold, false); plume.position.y = 1.6; body.add(plume);
  const gun = mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.1, 6), steel); gun.position.set(-0.12, 1.05, -0.3); gun.rotation.z = 0.08; body.add(gun);
  const bayonet = mesh(new THREE.ConeGeometry(0.03, 0.18, 6), steel, false); bayonet.position.set(-0.12 + 0.045, 1.67, -0.3); body.add(bayonet);
  return {
    root,
    update(phase, speed, squash, alerted) {
      const m = marchPose(phase, speed), al = alerted ? 0.25 : 0;
      legs[0].rotation.z = m.legL; legs[1].rotation.z = m.legR; arms[0].rotation.z = m.armL - al; arms[1].rotation.z = m.armR; body.position.y = m.bob;
      root.scale.set(1 + squash * 0.3, 1 - squash * 0.85, 1 + squash * 0.3);
    },
  };
}
