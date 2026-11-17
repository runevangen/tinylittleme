// 06b_bro_brister (shotlist.json): byggeskjermen i Bygglab, sted lab4 «Fagverk», MODUS Rutenett. Samme bro som i 06_bygging (9 staver i tre, Pratt-fagverk), bygd raskt med trykk,
// med last Leke-bil og spillets standardstyrke (tre er svakt i rutenett, R74; ingen innstilling endret): stavene går grønn -> gul -> oransje -> rød,
// ledd røyker, broen faller og lasten havner i gapet. SLOW trykkes som i spillet (knapp). Alt er ekte byggeskjerm; ingen egne animasjoner.
// Deterministisk: samme bygg, samme frø og samme dt gir samme utfall.
const SITE = 'lab4';
const DT_EDIT = 0.02, DT_SIM = 0.12;
const HIDE = '#bld .loads,#bld .share,#bld [data-a=menu],#bld .menu{display:none!important}';
const ST = 1.25, X = [-2.5, -1.25, 0, 1.25, 2.5];
const TAPS = [[X[0], 0], [X[1], ST], [X[2], ST], [X[3], ST], [X[4], 0], [X[4], 0], [X[1], 0], [X[1], ST], [X[2], 0], [X[2], ST], [X[2], ST], [X[3], 0], [X[3], ST], [X[2], 0]];
const T = { tap0: 1, deselect: 15, try: 17 };
const SLOW_AT = +process.env.SLOW_AT || 0.5;   // trykk SLOW når største belastning (ratio) passerer dette
module.exports = {
  id: '06b_bro_brister',
  ticksPerFrame: 1,
  async setup({ page, cine }) {
    await cine.seed(1);
    await cine.set('gridstage', false);   // fri rutenett-bygging (uten oppdragskrav og låsing), som da klippet ble laget
    await cine.build.open(SITE);
    await cine.build.step(DT_EDIT);
    const click = async (sel) => { const r = await page.locator(sel).first().boundingBox(); await page.mouse.click(r.x + r.width / 2, r.y + r.height / 2); await cine.build.step(DT_EDIT); };
    await click('#bld [data-a=mode]');                                          // MODUS: Rutenett
    await page.addStyleTag({ content: HIDE });
    for (let k = 0; k < 3; k++) await click('#bld .zoom button[data-z=in]');
    const sp = await page.evaluate(() => window.__game.bld.screenPos(0, 0));
    const dy = 330 - sp.y;
    await page.mouse.move(480, 200); await page.mouse.down(); await page.mouse.move(480, 200 + dy, { steps: 5 }); await page.mouse.up(); await cine.build.step(DT_EDIT);
    this.slowed = false;
  },
  async frame({ page, cine }, i, n) {
    const pos = (u, v) => page.evaluate(([u, v]) => window.__game.bld.screenPos(u, v), [u, v]);
    const box = async (sel) => { const r = await page.locator(sel).first().boundingBox(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; };
    let dt = DT_EDIT;
    const k = i - T.tap0;
    if (k >= 0 && k < TAPS.length) { const [u, v] = TAPS[k], p = await pos(u, v); await page.mouse.click(p.x, p.y); }
    if (i === T.deselect) { const p = await pos(X[2], 0); await page.mouse.click(p.x, p.y); }
    if (i === T.deselect + 1) {   // velg lasten (lastknappene vises bare mens vi trykker)
      await page.addStyleTag({ content: '#bld .loads{display:flex!important}' });
      for (const b of await page.locator('#bld .loads button').all()) if ((await b.textContent()).includes(process.env.LOAD || 'Bil')) { const r = await b.boundingBox(); await page.mouse.click(r.x + r.width / 2, r.y + r.height / 2); }
      if (process.env.CLIP_DEBUG) console.log('last:', await page.evaluate(() => [...document.querySelectorAll('#bld .loads button.on')].map((b) => b.textContent)));
      await page.addStyleTag({ content: HIDE });
    }
    if (i === T.try) { const r = await box('#bld [data-a=try]'); await page.mouse.click(r.x, r.y); }
    if (i > T.try) {
      dt = DT_SIM;
      const st = await page.evaluate(() => { const b = window.__game.bld, p = b.grid.peaks; return { pk: p ? Math.max(0, ...p.map((x) => x.r || 0)) : 0, s: b.result && b.result.state, speed: b.grid.speed }; });
      if (!this.slowed && st.s === 'run' && st.pk >= SLOW_AT) { const r = await box('#bld .gsim button[data-gs=slow]'); await page.mouse.click(r.x, r.y); this.slowed = true; }
      if (process.env.CLIP_DEBUG) console.log(i, JSON.stringify(st), this.slowed);
    }
    await cine.build.step(dt);
  },
};
