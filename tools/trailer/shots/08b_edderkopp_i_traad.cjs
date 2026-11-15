// 08b_edderkopp_i_traad (shotlist.json): kjokken2, traad_kjokken (dangler) over [24,0,3]. Figuren står stille 7 enheter unna; tråd-edderkoppen rister (varsel), stuper og henger lavt.
// Setup spoler motoren til varselet (mode 'warn') og litt til, så de 12 bildene (1 s) dekker resten av varselet, stupet (0,25 s) og starten av det lave henget.
// Kamera: fritt, lavt og fra siden, rolig tilt/dolly (ease inn/ut). Målet ligger høyt så tråden synes opp mot taket.
const sl = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '..', 'shotlist.json'), 'utf8')).klipp.find((k) => k.id === '08b_edderkopp_i_traad');
const A = { x: 12.5, y: 2.4, z: 0.0, tx: 21, ty: 3.0, tz: 3, fov: 56 };
const B = { x: 12.3, y: 2.4, z: 0.4, tx: 21.3, ty: 2.8, tz: 3, fov: 54 };   // justert etter test 2 (figuren ble kuttet nede til høyre i siste bilde); ikke testet etterpå
const WARN_INTO = 27;   // tikk inn i varselet ved klippstart (varselet varer 0,9 s = 54 tikk)
module.exports = {
  id: '08b_edderkopp_i_traad',
  async setup({ cine, page }) {
    await cine.seed(1); await cine.setHero({ x: 17, y: 0, z: 3, yaw: sl.startpose.yaw });
    const r = await page.evaluate((into) => {
      const g = window.__game, c = g.cine, d = g.LEVEL.antList.find((a) => a.id === 'traad_kjokken');
      let n = 0; while (d.mode !== 'warn' && n++ < 2000) c.step(1, 1 / 60);
      c.step(into, 1 / 60); return { n, mode: d.mode, y: d.y };
    }, WARN_INTO);
    if (r.mode !== 'warn') throw new Error('08b: edderkoppen varslet ikke: ' + JSON.stringify(r));
  },
  async frame({ cine }, i, n) {
    const t = n > 1 ? i / (n - 1) : 0;
    await cine.setCam(await cine.lerpCam(A, B, t, 'smooth'));
  },
};
