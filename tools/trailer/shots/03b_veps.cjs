// 03b_veps (shotlist.json): vepsen i kjokken ser figuren (varsler, siger og lyser), stuper, og figuren tar et sidesteg så den bommer.
// Alt er ekte spillogikk: vepsen settes bare på banen (t.s) litt før synsvidde; figuren styres med touch.x (kamera-yaw 0, +x).
// Figuren står foran bordet (z < 2: under bordplata skjules han for vepsen). Kamera: fritt, fra +z-siden (under bordet; leker og maur står bak figuren), følger midtpunktet mellom veps og figur.
const sm = (t) => t * t * (3 - 2 * t);
const mix = (a, b, t) => a + (b - a) * t;
const HX = 6, HZ = -1.5;
let cx = 0, cy = 0, cz = 0;
module.exports = {
  id: '03b_veps',
  async setup({ page, cine }) {
    await cine.seed(1);
    await cine.setHero({ x: HX, y: 0, z: HZ, yaw: -1.5708 });   // vender mot vepsen (kommer fra -x)
    await page.evaluate(() => { const t = window.__game.LEVEL.antList.find((a) => a.type === 'wasp'); t.s = 0.276; t.mode = 'patrol'; t.dir = 1; t.wait = 0; window.__game.cam.yaw = 0; });
    cx = 2.5; cy = 1.9; cz = 0;
  },
  async frame({ page, cine }, i, n) {
    const t = n > 1 ? i / (n - 1) : 0, e = sm(t);
    const s = await page.evaluate((i) => {     // sidesteg (+x) fra bilde 12 til 19, ellers står han stille
      const g = window.__game, w = g.LEVEL.antList.find((a) => a.type === 'wasp'), p = g.player;
      g.touch.x = i >= 12 && i < 19 ? 1 : 0; g.touch.y = 0;
      return { w: [w.x, w.y, w.z], p: [p.x, p.y, p.z] };
    }, i);
    const mx = mix(s.w[0], s.p[0], 0.5), my = mix(s.w[1], s.p[1] + 0.8, 0.5), mz = mix(s.w[2], s.p[2], 0.5);
    cx = mix(cx, mx, 0.25); cy = mix(cy, my, 0.25); cz = mix(cz, mz, 0.25);
    const d = mix(8.0, 6.0, e);
    await cine.setCam({ x: cx - 1.0, y: mix(1.6, 2.1, e), z: cz + d, tx: cx, ty: cy, tz: cz, fov: mix(50, 44, e) });
  },
};
