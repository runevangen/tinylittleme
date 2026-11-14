// Tegning av gåteverktøyet (R60): plater som synker og lyser, dører og vindebroer med lamper for hvert krav, og brytere. Logikken ligger i plates_logic.js.
// Alt deles: én boks-geometri, én sylinder, én kule og en håndfull materialer (ingen nye shadere). Brett uten `gates` lager ingenting.
import * as THREE from 'three';
import { doorBox } from './plates_logic.js';

export function buildGateViews(scene, L) {
  const S = L.gateS; if (!S || !(S.plates.length || S.doors.length || S.switches.length)) return { update() {}, count: 0 };
  const BOX = new THREE.BoxGeometry(1, 1, 1), CYL = new THREE.CylinderGeometry(0.5, 0.5, 1, 10), BALL = new THREE.SphereGeometry(0.5, 8, 6);
  const M = (c, e = 0, r = 0.5, m = 0.2) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m, emissive: e, emissiveIntensity: e ? 0.7 : 0 });
  const mFrame = M(0x4a5260, 0, 0.5, 0.4), mUp = M(0xd9a21b, 0x7a4a00), mDown = M(0x3fbf6a, 0x1f7a3a);
  const mDoor = M(0x7a5a3c, 0, 0.7, 0.1), mBridge = M(0xc98f4a, 0, 0.75, 0.05), mBridge2 = M(0x9a6a30, 0, 0.8, 0.05);
  const mRed = M(0xe0443a, 0x8a1a12), mGreen = M(0x3fcf6a, 0x1f8a3a), mLampOff = M(0x6a3a36, 0, 0.6), mLampOn = M(0x7fffa0, 0x2fbf5a);
  const mLeverOff = M(0xd9503a, 0x7a1a10), mLeverOn = M(0x3fcf6a, 0x1f8a3a);
  const mesh = (geo, mat, shadow = true) => { const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = shadow; scene.add(m); return m; };
  let count = 0;

  const plates = S.plates.map((pl) => {
    const w = pl.x1 - pl.x0, d = pl.z1 - pl.z0, cx = (pl.x0 + pl.x1) / 2, cz = (pl.z0 + pl.z1) / 2;
    const frame = mesh(BOX, mFrame), pad = mesh(BOX, mUp), glow = mesh(BOX, mRed, false); count += 3;
    frame.scale.set(w + 0.3, 0.1, d + 0.3); frame.position.set(cx, pl.y + 0.05, cz);
    glow.scale.set(w + 0.5, 0.04, d + 0.5); glow.position.set(cx, pl.y + 0.02, cz);
    pad.scale.set(w, 0.16, d);
    return { pl, pad, glow, sink: 0, cx, cz };
  });
  const switches = S.switches.map((sw) => {
    const base = mesh(CYL, mFrame), lever = mesh(BOX, mLeverOff), knob = mesh(BALL, mLeverOff); count += 3;
    base.scale.set(0.9, 0.3, 0.9); base.position.set(sw.x, sw.y + 0.15, sw.z);
    lever.scale.set(0.14, 0.9, 0.14); knob.scale.setScalar(0.32);
    return { sw, base, lever, knob, a: 0 };
  });
  const doors = S.doors.map((dr) => {
    const bridge = dr.kind === 'bridge', body = mesh(BOX, bridge ? mBridge : mDoor), strip = mesh(BOX, bridge ? mBridge2 : mRed, false); count += 2;
    const lamps = (dr.needs || []).map((id, i) => { const l = mesh(BALL, mLampOff, false); count++; l.scale.setScalar(0.32); return { l, id, i }; });
    return { dr, body, strip, lamps, bridge };
  });

  function update(now) {
    for (const v of plates) {
      const on = v.pl.on; v.sink += ((on ? 1 : 0) - v.sink) * 0.25;
      const w = v.pl.x1 - v.pl.x0, d = v.pl.z1 - v.pl.z0;
      v.pad.position.set(v.cx, v.pl.y + 0.2 - 0.12 * v.sink, v.cz); v.pad.scale.set(w, 0.16, d);
      v.pad.material = on ? mDown : mUp; v.glow.material = on ? mGreen : mRed;
      v.glow.visible = on || Math.sin(now * 0.004) > -0.4;                   // blunker rolig til den er trykket ned
    }
    for (const v of switches) {
      const on = v.sw.on; v.a += ((on ? 1 : -1) - v.a) * 0.25;
      v.lever.position.set(v.sw.x + v.a * 0.28, v.sw.y + 0.3 + 0.38, v.sw.z); v.lever.rotation.z = -v.a * 0.6;
      v.knob.position.set(v.sw.x + v.a * 0.28 + Math.sin(v.a * 0.6) * 0.5, v.sw.y + 0.3 + 0.75, v.sw.z);
      v.lever.material = v.knob.material = on ? mLeverOn : mLeverOff;
    }
    for (const v of doors) {
      const d = v.dr, r = doorBox(d, d.t), open = d.t >= 0.999, want = d.want;
      if (v.bridge) {
        v.body.visible = !!r;
        if (r) { v.body.scale.set(r.max[0] - r.min[0], (r.max[1] - r.min[1]) * 0.6, r.max[2] - r.min[2]); v.body.position.set((r.min[0] + r.max[0]) / 2, r.min[1] + (r.max[1] - r.min[1]) * 0.3, (r.min[2] + r.max[2]) / 2); }
        v.strip.visible = !!r; if (r) { v.strip.scale.set((r.max[0] - r.min[0]), (r.max[1] - r.min[1]) * 0.4, (r.max[2] - r.min[2]) * 0.86); v.strip.position.set((r.min[0] + r.max[0]) / 2, r.max[1] - (r.max[1] - r.min[1]) * 0.2, (r.min[2] + r.max[2]) / 2); }
      } else {
        v.body.visible = !!r;
        if (r) { v.body.scale.set(r.max[0] - r.min[0], r.max[1] - r.min[1], r.max[2] - r.min[2]); v.body.position.set((r.min[0] + r.max[0]) / 2, (r.min[1] + r.max[1]) / 2, (r.min[2] + r.max[2]) / 2); }
        // sporet i gulvet: rødt = låst, grønt = åpen (leses uten tekst)
        const lowY = d.dir === 'up' ? d.min[1] : d.min[1];
        v.strip.scale.set(d.max[0] - d.min[0] + 0.1, 0.06, d.max[2] - d.min[2] + 0.1); v.strip.position.set((d.min[0] + d.max[0]) / 2, lowY + 0.03, (d.min[2] + d.max[2]) / 2);
        v.strip.material = open ? mGreen : (want ? mLampOn : mRed);
      }
      const mid = [(d.min[0] + d.max[0]) / 2, d.max[1], (d.min[2] + d.max[2]) / 2], n = v.lamps.length;
      for (const q of v.lamps) {
        const on = L.gateS.plates.some((p) => p.id === q.id && p.on) || L.gateS.switches.some((s) => s.id === q.id && s.on);
        const topY = v.bridge ? d.max[1] + 0.5 : Math.min(d.max[1], d.min[1] + 6) + 0.4;
        const ax = d.max[0] - d.min[0] < d.max[2] - d.min[2] ? 2 : 0;   // lampene står på langs døra
        const off = (q.i - (n - 1) / 2) * 0.8;
        q.l.position.set(mid[0] + (ax === 0 ? off : 0), topY, mid[2] + (ax === 2 ? off : 0));
        q.l.material = on ? mLampOn : mLampOff;
      }
    }
  }
  return { update, count, plates, doors, switches };
}
