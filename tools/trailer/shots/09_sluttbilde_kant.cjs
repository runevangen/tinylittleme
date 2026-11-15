// 09_sluttbilde_kant (shotlist.json): figuren står på målet øverst på hylla (verksted, maal) og ser utover rommet; langsom kamerabane (ease inn/ut), figuren puster (idle). Tittelkortet legges på i ffmpeg.
// Figuren plasseres med setHero (målet nås ellers først etter ca. 47 s bot-rute) og settes til å stå stille (ingen styring).
const sm = (t) => t * t * (3 - 2 * t);
const mix = (a, b, t) => a + (b - a) * t;
// Kamerapose fra shotlist (42,26,-12 mot 10,10,5) stod foran figuren og så bort fra ham (figuren utenfor bildet): kameraet står nå på +z-siden av figuren, litt bak (øst), og ser vestover utover rommet; figuren i høyre tredjedel.
const A = { x: 43, y: 26.2, z: -16.5, tx: 28, ty: 21, tz: -20, fov: 55 };
const B = { x: 41.5, y: 26.8, z: -15.5, tx: 26, ty: 20.5, tz: -19, fov: 55 };
module.exports = {
  id: '09_sluttbilde_kant',
  async setup({ cine, page }) {
    await cine.seed(1);
    await cine.setHero({ x: 38.4, y: 24.4, z: -20, yaw: -1.9 });
    await page.evaluate(() => { window.__game.cam.yaw = 0; });
  },
  async frame({ cine, page }, i, n) {
    const t = n > 1 ? i / (n - 1) : 0;
    await page.evaluate(() => { const g = window.__game; g.touch.x = 0; g.touch.y = 0; });
    await cine.setCam(await cine.lerpCam(A, B, t, 'smooth'));
  },
};
