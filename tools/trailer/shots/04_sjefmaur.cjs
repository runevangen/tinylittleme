// 04_sjefmaur (shotlist.json): sjefen reiser seg, løper på figuren, figuren tar et sidesteg, sjefen smeller i kjøleskapet og blir svimmel, figuren hopper på ryggen (event 'hit').
// Figuren styres som en spiller (stikke + HOPP): touch.x og et Space-tastetrykk per bilde. Kamera: fritt, jevn bane (ease inn/ut) skrått fra siden så sjef, figur og kjøleskap synes samtidig.
// Tidsplan (bilde): 0-12 windup, 13-22 charge, 22 bump i kjøleskapet (stunned), 29 hopp, 40 sjefen får skade (hit).
const sl = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '..', 'shotlist.json'), 'utf8')).klipp.find((k) => k.id === '04_sjefmaur');
const A = { x: -17.5, y: 3.6, z: -9.5, tx: -24, ty: 1.6, tz: -10.8, fov: 52 };   // justert etter test 2 (boss var kuttet til venstre i bilde 1); ikke testet etterpå
const B = { x: -16.5, y: 2.6, z: -11.8, tx: -24, ty: 1.6, tz: -14.5, fov: 46 };
const S = { s0: 5, s1: 14, back0: 21, back1: 29, jump: 29, jumpEnd: 33 };   // sidesteg (touch.x = +1), tilbake (-1), hopp (Space)
module.exports = {
  id: '04_sjefmaur',
  async setup({ cine, page }) {
    await cine.seed(1); await cine.setHero(sl.startpose);
    await page.evaluate(() => { const g = window.__game; Object.assign(g.LEVEL.bossS, { mode: 'patrol', x: -25, z: -8, cool: 0, hp: 3, mt: 0, misses: 0 }); g.cam.yaw = 0; });
  },
  async frame({ cine, page }, i, n) {
    const t = n > 1 ? i / (n - 1) : 0;
    await cine.setCam(await cine.lerpCam(A, B, t, 'smooth'));
    await page.evaluate(([f, S]) => {
      const g = window.__game; g.cam.yaw = 0;
      g.touch.x = f >= S.s0 && f < S.s1 ? 1 : (f >= S.back0 && f < S.back1 ? -1 : 0); g.touch.y = 0;
      if (f === S.jump) window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true }));
      if (f === S.jumpEnd) window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space', bubbles: true }));
    }, [i, S]);
  },
};
