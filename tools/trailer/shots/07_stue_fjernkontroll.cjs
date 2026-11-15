// 07_stue_fjernkontroll (shotlist.json): figuren tar fjernkontrollen (TA), bærer den over stuegulvet til den gule plata p1 og slipper den (TA); plata går ned og skyvedøren d1 åpner seg.
// Ekte spillfysikk, ingen teleportering: figuren styres som en spiller (touch.x/touch.y + KeyF-tastetrykk som TA-kant). Styringen peker mot plata hvert bilde (stikka etter kamera-yaw 0: x = +x, y = -z).
// Tempo: 11 tikk per bilde (2,2x sanntid) så gåturen (ca. 27 enheter) og døra rekkes på 60 bilder. Målt: TA ved tikk ca. 20, framme ved plata ca. tikk 540, døra full åpen 75 tikk etter slipp.
// Kamera: fritt, jevn bane (ease inn/ut). Starter lavt og bredt bak figuren ved fjernkontrollen, følger skrått fra siden, og ender med plata i forgrunnen og døra bak.
const sm = (t) => t * t * (3 - 2 * t);
const mix = (a, b, t) => a + (b - a) * t;
const PLATE = [-34, 4];          // mål for figuren (plata: x -38..-28, z -2..10)
const TA_FRAME = 2;              // bilde der TA trykkes ved fjernkontrollen
let phase = 'wait', dropAt = -1, look = null, camPos = null;
module.exports = {
  id: '07_stue_fjernkontroll',
  ticksPerFrame: 11,
  async setup({ cine, page }) {
    await cine.seed(1);
    await cine.setHero({ x: -56.0, y: 0, z: 19.8, yaw: 1.5708 });
    await page.evaluate(() => { window.__game.cam.yaw = 0; });
    phase = 'wait'; dropAt = -1; look = null; camPos = null;
  },
  async frame({ cine, page }, i, n) {
    const t = n > 1 ? i / (n - 1) : 0, e = sm(t);
    const key = (code, type) => page.evaluate(([c, ty]) => window.dispatchEvent(new KeyboardEvent(ty, { code: c, bubbles: true })), [code, type]);
    const p = await cine.get('hero');
    const st = await page.evaluate(() => { const g = window.__game; return { carry: !!g.player.carry, door: g.LEVEL.gateS.doors[0].t }; });
    // styring
    let tx = 0, ty = 0;
    if (i === TA_FRAME) await key('KeyF', 'keydown');
    if (i === TA_FRAME + 1) await key('KeyF', 'keyup');
    if (st.carry && phase === 'wait') phase = 'walk';
    if (phase === 'walk') {
      const dx = PLATE[0] - p.x, dz = PLATE[1] - p.z, d = Math.hypot(dx, dz);
      if (d < 1.2) { phase = 'drop'; dropAt = i; } else { tx = dx / d; ty = -dz / d; }
    }
    if (phase === 'drop' && i === dropAt + 1) await key('KeyF', 'keydown');
    if (phase === 'drop' && i === dropAt + 2) { await key('KeyF', 'keyup'); phase = 'done'; }
    await page.evaluate(([x, y]) => { const g = window.__game; g.cam.yaw = 0; g.touch.x = x; g.touch.y = y; }, [tx, ty]);
    // kamera hengt på figuren (jevn, eased offset): fra +z-siden (figuren går fra venstre mot høyre, fjernkontrollen foran ham skjuler ham ikke); starter nær ved fjernkontrollen og veggen, glir bakover og opp så plata og døra (til høyre) kommer med mot slutten
    const o = { x: mix(-0.6, -2.8, e), y: mix(1.3, 2.4, e), z: mix(4.6, 5.6, e) };
    const l = { x: mix(0.9, 3.6, e), y: mix(0.6, 1.0, e), z: -0.5 };
    await cine.setCam({ x: p.x + o.x, y: o.y, z: p.z + o.z, tx: p.x + l.x, ty: l.y, tz: p.z + l.z, fov: mix(46, 50, e) });
  },
};
