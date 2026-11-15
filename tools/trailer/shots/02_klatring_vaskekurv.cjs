// 02_klatring_vaskekurv (shotlist.json): figuren går mot vaskekurven (bad) og klatrer opp veggen med ekte spillfysikk:
// stikka framover (touch.y = 1), GREP holdt (touch.grab) og en KeyE-keydown (grep-kant) hvert 20. tikk, som i verifisert bilde B.
// Fritt kamera skrått bakfra (venstre side), lavt og hevet etter hvert, dollyet inn med ease; blikket følger figurens høyde glattet.
const sm = (t) => t * t * (3 - 2 * t);
const mix = (a, b, t) => a + (b - a) * t;
let ty = 0, cyS = 0;
module.exports = {
  id: '02_klatring_vaskekurv',
  ticksPerFrame: 9,   // 60 bilder x 9 tikk = 9 s: nok til å nå toppen av kurven (y 12) og få hang/mantle med, litt raskere enn sanntid (1,8x)
  async setup({ cine }) {
    await cine.seed(1);
    await cine.setHero({ x: 3.5, y: 0, z: 13.4, yaw: 3.14159 });
    ty = 0.9; cyS = 1.2;
  },
  async frame({ page, cine, ticksPerFrame }, i, n) {
    const t = n > 1 ? i / (n - 1) : 0, e = sm(t);
    // inndata for de neste 5 tikkene (kalles før advance): stikke framover, grep holdt, grep-kant hvert 20. tikk (hver 4. bilde)
    await page.evaluate(([i]) => {
      const g = window.__game; g.cam.yaw = 0; g.touch.x = 0; g.touch.y = 1; g.touch.grab = true;
      if (i % 4 === 0) window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', key: 'e' }));
      setTimeout(() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE', key: 'e' })), 0);
    }, [i]);
    const h = await cine.get('hero');
    const p = h || (await page.evaluate(() => window.__game.cine.hero));
    ty = mix(ty, p.y + 0.5, 0.4);
    cyS = mix(cyS, Math.max(1.0, p.y - 0.3), 0.3);
    // skrått fra venstre og nær: figuren minst ca. 100 px, kurvens venstre kant og toppkanten synlige mot rommet
    await cine.setCam({ x: p.x - mix(3.4, 3.0, e), y: cyS, z: p.z + mix(4.0, 3.4, e), tx: p.x + 0.3, ty, tz: p.z - 0.6, fov: mix(46, 44, e) });
  },
};
