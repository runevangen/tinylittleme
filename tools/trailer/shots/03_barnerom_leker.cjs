// 03_barnerom_leker (shotlist.json): sprettboksen (barnerom, leke_sprettboks) popper og kaster figuren (R34, ekte spillfysikk).
// Figuren settes oppå boksen (bilde 6, ellers er han langt unna kamera); spillet kaster ham selv. Han står litt til -x for midten,
// så han kastes mot -x (venstre i bildet, bort fra kommoden til høyre). Fritt kamera fra +z-siden (ikke rett mot klovnehatten), blikket
// følger boksen først og så figuren oppover (glattet), med dolly og ease.
const sm = (t) => t * t * (3 - 2 * t);
const mix = (a, b, t) => a + (b - a) * t;
const BOX = [6.6, 2.8, -4.6], PUT = 5, CAR = [-2.6, 1.4, -13.6], WALK = 22;
// Del 1 (bilde 0-21): sprettboksen kaster figuren. Kameraet står øst for boksen og ser mot -z/-x (vippehesten og tennisballen ligger bak/utenfor bildet, ikke i forgrunnen).
// Del 2 (bilde 22-35): skjult overgang (figuren settes ved leke-bilen); så går han inn i bilen med stikka: spillets egen leketøysfunksjon
// (toys_live.js) lar bilen rulle og tute når den dyttes. Kameraet panorerer fra boksen til bilen.
let tx = BOX[0] - 0.5, ty = 2.5, tz = BOX[2];
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
    if (i === WALK) await cine.setHero({ x: -2.6, y: 0, z: -9.4, yaw: 3.14159 });
    await page.evaluate(([w]) => { const g = window.__game; g.touch.x = 0; g.touch.y = w ? 1 : 0; if (w) g.cam.yaw = 0; }, [i >= WALK]);
    const p = await cine.get('hero');
    const follow = i >= PUT, ph = sm(Math.min(1, Math.max(0, (i - (WALK - 2)) / 10)));
    tx = mix(tx, follow ? p.x : BOX[0] - 0.5, 0.3); ty = mix(ty, follow ? p.y + 0.6 : 2.6, 0.3); tz = mix(tz, follow ? p.z : BOX[2], 0.3);
    await cine.setCam({ x: mix(mix(9.6, 9.2, e), 4.8, ph), y: mix(mix(6.5, 7.5, e), 6.4, ph), z: mix(mix(3.0, 1.5, e), -8.8, ph), tx, ty, tz, fov: mix(50, 54, e) });   // høyt og skrått ovenfra: ballen og hesten kommer ikke i forgrunnen
  },
};
