// 03_barnerom_leker (shotlist.json): sprettboksen (barnerom, leke_sprettboks) popper og kaster figuren (R34, ekte spillfysikk).
// Figuren settes oppå boksen (bilde 6, ellers er han langt unna kamera); spillet kaster ham selv. Han står litt til -x for midten,
// så han kastes mot -x (venstre i bildet, bort fra kommoden til høyre). Fritt kamera fra +z-siden (ikke rett mot klovnehatten), blikket
// følger boksen først og så figuren oppover (glattet), med dolly og ease.
const sm = (t) => t * t * (3 - 2 * t);
const mix = (a, b, t) => a + (b - a) * t;
const BOX = [6.6, 2.8, -4.6], PUT = 5;
let tx = BOX[0], ty = 2.5, tz = BOX[2];
module.exports = {
  id: '03_barnerom_leker',
  async setup({ page, cine }) {
    await cine.seed(1);
    await cine.setHero({ x: 2.0, y: 0, z: 24.4, yaw: 3.14159 });
    await page.evaluate(() => { window.__game.cam.yaw = 0; });
    tx = BOX[0] - 0.5; ty = 2.6; tz = BOX[2];
  },
  async frame({ page, cine }, i, n) {
    const t = n > 1 ? i / (n - 1) : 0, e = sm(t);
    if (i === PUT) await cine.setHero({ x: 6.0, y: 3.0, z: -4.6, yaw: 1.5708 });
    const p = await cine.get('hero');
    const follow = i >= PUT;
    tx = mix(tx, follow ? p.x : BOX[0] - 0.5, 0.3); ty = mix(ty, follow ? p.y + 0.6 : 2.6, 0.3); tz = mix(tz, follow ? p.z : BOX[2], 0.3);
    await cine.setCam({ x: mix(3.5, -0.5, e), y: mix(2.2, 4.6, e), z: mix(4.2, 3.4, e), tx, ty, tz, fov: mix(50, 54, e) });
  },
};
