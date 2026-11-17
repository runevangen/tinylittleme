// 06a_gap_maal (shotlist.json): verdensbilde før byggeskjermen. Bygglab, sted lab4 «Fagverk»: figuren står på kanten av første sokkel (ped_a4), gapet (5 bredt) foran, og målflagget (lab.flag [2.4,3,0]) på andre sokkel.
// Kameraet står først på figuren (bak, litt fra siden), svinger så over gapet og stopper med flagget i bildet. Ekte 3D-scene (bygget lukkes, figuren settes med setHero, ingen styring); ingen egne animasjoner.
const sm = (t) => t * t * (3 - 2 * t);
const HERO = { x: -13.6, y: 3, z: 0, yaw: Math.PI / 2 };
const A = { x: -18.5, y: 4.9, z: 4.2, tx: -12, ty: 3.9, tz: 0, fov: 55 };
const B = { x: -5.6, y: 8.2, z: 14.5, tx: -5.6, ty: 3.2, tz: 0, fov: 55 };
module.exports = {
  id: '06a_gap_maal',
  async setup({ cine, page }) {
    await cine.seed(1);
    await cine.set('labstart', false);
    await cine.setHero(HERO);
    await cine.step(3, 1 / 60);
    await page.evaluate(() => { const b = window.__game.bld; if (b.active) b.close('kino'); });
    await cine.setHero(HERO);
  },
  async frame({ cine, page }, i, n) {
    const t = n > 1 ? i / (n - 1) : 0;
    await page.evaluate(() => { const g = window.__game; g.touch.x = 0; g.touch.y = 0; });
    await cine.setHero(HERO);
    await cine.setCam(await cine.lerpCam(A, B, sm(t), 'smooth'));
  },
};
