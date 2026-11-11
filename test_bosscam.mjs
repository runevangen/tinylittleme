// node test_bosscam.mjs: sjef-kameraet holder figuren i bildet (portrett) og aldri bak sjefen
import assert from 'node:assert/strict';
import { bossFrame, bossCamStep, angleDiff } from './camera_util.js';
const FOV = 52 * Math.PI / 180, ASPECT = 390 / 844, DIST = 5.5, PITCH = 0.3, dt = 1 / 30;
// som main.js: mål 0.62 over figuren, kamera bak/over med sideforskyvning (ox,oz)
function view(s, yaw, p, wx, wy, wz) {
  const pitch = PITCH + s.pitch, cp = Math.cos(pitch), d = DIST + s.dist;
  const tx = p.x + s.ox, ty = 0.62, tz = p.z + s.oz;
  const cx = p.x + Math.sin(yaw) * cp * d + s.ox, cy = ty + Math.sin(pitch) * d, cz = p.z + Math.cos(yaw) * cp * d + s.oz;
  const f = [tx - cx, ty - cy, tz - cz], fl = Math.hypot(...f); f.forEach((v, i) => (f[i] = v / fl));
  const r = [-f[2], 0, f[0]], rl = Math.hypot(r[0], r[2]); r[0] /= rl; r[2] /= rl;
  const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
  const v = [wx - cx, wy - cy, wz - cz], z = v[0] * f[0] + v[1] * f[1] + v[2] * f[2];
  const th = Math.tan(FOV / 2);
  return { x: (v[0] * r[0] + v[1] * r[1] + v[2] * r[2]) / z / (th * ASPECT), y: (v[0] * u[0] + v[1] * u[1] + v[2] * u[2]) / z / th, z, cx, cz };
}
const cases = [];
for (const sep of [3, 6, 12, 20]) for (const a of [0, 0.8, 1.6, 2.4, 3.14, -1.2]) for (const y0 of [0, 0.35, 1.5, -1.5, 3]) cases.push({ sep, a, y0 });
for (const mode of ['windup', 'stunned']) for (const { sep, a, y0 } of cases) {
  const p = { x: 0, z: 0 }, B = { x: Math.sin(a) * sep, z: Math.cos(a) * sep, mode };
  const s = { k: 0, shift: 0, dist: 0, pitch: 0, ox: 0, oz: 0 }; let yaw = y0, minT = null;
  for (let i = 0; i < 90; i++) {                                 // 3 s spilletid
    yaw = bossCamStep(s, bossFrame(0, 0, B.x, B.z, mode), B, p, yaw, dt);
    const h = view(s, yaw, p, 0, 0.9, 0), b = view(s, yaw, p, B.x, 1.2, B.z), t = i * dt;
    const tag = `${mode} sep ${sep} vinkel ${a} yaw0 ${y0} t ${t.toFixed(2)}`;
    assert.ok(Math.abs(h.x) < 0.95 && Math.abs(h.y) < 0.95, `figuren i bildet: ${tag} (${h.x.toFixed(2)},${h.y.toFixed(2)})`);
    if (t >= 0.8 && sep <= 12) assert.ok(Math.abs(b.x) < 1 && b.y > -1 && b.y < 1, `sjefen i bildet: ${tag} (${b.x.toFixed(2)},${b.y.toFixed(2)})`);
    if (t >= 0.8 && mode === 'windup' && sep >= 5) {              // hele sjefen (krone ca. 6 m opp når den reiser seg, bein ±3 m) skal være med, ikke bare midten
      const top = view(s, yaw, p, B.x, 6.8, B.z), side = view(s, yaw, p, B.x + Math.cos(a) * 3, 0, B.z - Math.sin(a) * 3), side2 = view(s, yaw, p, B.x - Math.cos(a) * 3, 0, B.z + Math.sin(a) * 3);
      assert.ok(top.z > 0.5 && top.y < 0.97, `sjefens krone klippet: ${tag} (${top.y.toFixed(2)})`);
      for (const q of [side, side2]) assert.ok(Math.abs(q.x) < 1.15, `sjefens bein klippet: ${tag} (${q.x.toFixed(2)})`);
    }
    if (t >= 0.8 && mode === 'stunned') {                        // linja kamera -> figur skal ikke gå gjennom sjefens sirkel
      const dx = -h.cx, dz = -h.cz, l2 = dx * dx + dz * dz, tt = Math.max(0, Math.min(1, ((B.x - h.cx) * dx + (B.z - h.cz) * dz) / l2));
      const dd = Math.hypot(h.cx + dx * tt - B.x, h.cz + dz * tt - B.z);
      assert.ok(tt >= 1 - 1e-9 || dd > 2.2 || Math.hypot(B.x, B.z) > Math.hypot(h.cx, h.cz), `figuren skjult bak sjefen: ${tag}`);
    }
  }
}
assert.ok(Math.abs(angleDiff(0, 0)) === 0);
console.log('sjef-kamera-tester grønne');
