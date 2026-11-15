// 08c_lys_skygge (shotlist.json): kjokken2 har vrien 'lights' (lys 15 s, blinking 1 s, så mørkt). Vi spoler til like før lyset går (variant.js lightLevel), og filmer blinkingen og at hjelmlykta tar over.
// Alt er ekte spill: figuren går fremover med stikka (touch.y), lyset styres av spillets egen vri-klokke (vt), og hjelmlykta tennes av spillet selv.
// Kamera: fritt, lavt bak figuren og litt til siden, rolig dolly mot figuren med ease. 12 bilder à 7 tikk = 1,4 s: fra full belysning, via blinking, til mørkt.
const sm = (t) => t * t * (3 - 2 * t);
const mix = (a, b, t) => a + (b - a) * t;
const START_TICKS = 13.55 * 60;      // lyset går ut etter 15 s (blinker fra 14,0 s, helt mørkt fra 14,7 s)
let cx = 0, cy = 0, cz = 0;
module.exports = {
  id: '08c_lys_skygge',
  ticksPerFrame: 7,
  async setup({ page, cine }) {
    await cine.seed(1);
    await cine.setHero({ x: 0, y: 0, z: 10, yaw: Math.PI });
    await page.evaluate(() => { window.__game.cam.yaw = 0; });
    await cine.step(START_TICKS, 1 / 60);            // spoler variantklokka (hero står stille)
    const h = await page.evaluate(() => { const p = window.__game.player; return [p.x, p.y, p.z]; });
    cx = h[0]; cy = h[1] + 0.5; cz = h[2];
  },
  async frame({ page, cine }, i, n) {
    const t = n > 1 ? i / (n - 1) : 0, e = sm(t);
    const p = await page.evaluate(() => { const g = window.__game; g.touch.x = 0; g.touch.y = 0.55; const q = g.player; return [q.x, q.y, q.z]; });
    cx = mix(cx, p[0], 0.35); cy = mix(cy, p[1] + 0.55, 0.35); cz = mix(cz, p[2], 0.35);
    const d = mix(4.8, 3.6, e);
    await cine.setCam({ x: cx - 0.9, y: mix(1.7, 1.15, e), z: cz + d, tx: cx, ty: cy, tz: cz - 1.2, fov: mix(52, 46, e) });
  },
};
