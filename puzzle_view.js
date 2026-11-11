// Tegning av gåten (R7): platen på flata og broen som ruller ut. Logikken ligger i puzzle.js.
import * as THREE from 'three';
import { bridgeBox } from './puzzle.js';

const SLAT = 0.9;   // avstand mellom planker i broen (enheter)

export function buildPuzzleViews(scene, L) {
  return (L.puzzleList || []).map((p) => {
    const pl = p.plate;
    // platen: en lav, rund knapp med en gylden ring som lyser; trykket ned (grønn) når nøkkelen står på
    const plate = new THREE.Group(); plate.position.set(pl.x, pl.y, pl.z);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x5b6470, roughness: 0.5, metalness: 0.3 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(pl.r, pl.r * 1.06, 0.16, 28), baseMat); base.position.y = 0.08; base.castShadow = base.receiveShadow = true; plate.add(base);
    const padMat = new THREE.MeshStandardMaterial({ color: 0xd9a21b, roughness: 0.35, metalness: 0.5, emissive: 0x7a4a00, emissiveIntensity: 0.6 });
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(pl.r * 0.78, pl.r * 0.78, 0.1, 28), padMat); pad.position.y = 0.2; pad.receiveShadow = true; plate.add(pad);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(new THREE.RingGeometry(pl.r * 1.15, pl.r * 1.5, 32), ringMat); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; plate.add(ring);
    // en keyhole-markering oppå (liten sirkel + strek) så den leses som «lås»
    const dark = new THREE.MeshStandardMaterial({ color: 0x2a1c05, roughness: 0.6 });
    const kh = new THREE.Mesh(new THREE.CylinderGeometry(pl.r * 0.2, pl.r * 0.2, 0.04, 16), dark); kh.position.set(0, 0.27, -pl.r * 0.12); plate.add(kh);
    const ks = new THREE.Mesh(new THREE.BoxGeometry(pl.r * 0.14, 0.04, pl.r * 0.38), dark); ks.position.set(0, 0.27, pl.r * 0.16); plate.add(ks);
    scene.add(plate);

    // broen: planke som vokser, med tverrbord
    const b = p.bridge, ax = b.axis === 'z' ? 2 : 0, full = b.max[ax] - b.min[ax];
    const bridge = new THREE.Group(); bridge.visible = false; scene.add(bridge);
    const wood = new THREE.MeshStandardMaterial({ color: b.color ?? 0xc98f4a, roughness: 0.75 }), wood2 = new THREE.MeshStandardMaterial({ color: 0x9a6a30, roughness: 0.8 });
    const deck = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), wood2); deck.castShadow = deck.receiveShadow = true; bridge.add(deck);
    const slats = [];
    for (let o = SLAT / 2; o < full; o += SLAT) { const s = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), wood); s.castShadow = s.receiveShadow = true; bridge.add(s); slats.push({ s, o }); }
    function update(now) {
      const t = p.t;
      ring.visible = !p.open; ringMat.opacity = 0.35 + 0.25 * Math.sin(now * 0.004);
      padMat.emissive.setHex(p.pressed || p.open ? 0x1f7a3a : 0x7a4a00); padMat.color.setHex(p.pressed || p.open ? 0x3fbf6a : 0xd9a21b);
      pad.position.y = p.pressed || p.open ? 0.13 : 0.2;
      bridge.visible = !!p.box;
      if (!p.box) return;
      const r = bridgeBox(p, t), len = r.max[ax] - r.min[ax], c = [(r.min[0] + r.max[0]) / 2, (r.min[1] + r.max[1]) / 2, (r.min[2] + r.max[2]) / 2], th = r.max[1] - r.min[1], w = r.max[2 - ax] - r.min[2 - ax];
      const place = (m, along, alongLen, h, y) => { // along = midtpunkt langs aksen
        if (ax === 0) { m.scale.set(alongLen, h, w); m.position.set(along, y, c[2]); } else { m.scale.set(w, h, alongLen); m.position.set(c[0], y, along); }
      };
      place(deck, c[ax], len, th * 0.55, r.min[1] + th * 0.275);
      for (const { s, o } of slats) {
        const from = b.anchor === 'max' ? b.max[ax] - o : b.min[ax] + o, vis = Math.abs(from - (b.anchor === 'max' ? b.max[ax] : b.min[ax])) < len - 0.2;
        s.visible = vis; place(s, from, SLAT * 0.78, th * 0.5, r.max[1] - th * 0.25);
      }
    }
    return { p, plate, bridge, update };
  });
}
