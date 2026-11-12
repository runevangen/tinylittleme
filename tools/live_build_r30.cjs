// R30: de nye byggebrettene på mobil (iPhone 14, Playwright): vippe (barnerom) og kjokkenbro (kjøkken). Åpner byggeskjermen, drar delene ut med berøring
// (vippa roteres ett trinn med ↺), trykker PRØV, og sjekker at prøven gir et utfall, at bygget står i verden og at det ikke er konsollfeil. Skjermbilder i utmappa.
// node tools/live_build_r30.cjs <utmappe> [port]   (server på porten; playwright via NODE_PATH). Exit 1 ved feil.
const { chromium, devices } = require('playwright');
(async () => {
  const out = process.argv[2] || '.', port = process.argv[3] || 8421;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  let bad = 0; const ok = (k, c, d = '') => { console.log(c ? 'ok  ' : 'FEIL', k, d); if (!c) bad++; };
  for (const [lvl, drops] of [['vippe', [['v1', 0, 1.25, 1]]], ['kjokkenbro', [['p1', 0, 0.25, 0]]]]) {
    const ctx = await b.newContext({ ...devices['iPhone 14'] }), pg = await ctx.newPage(), errs = [];
    pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await pg.addInitScript(() => { try { localStorage.setItem('tlm.buildall', 'true'); } catch {} });
    await pg.goto(`http://localhost:${port}/?level=${lvl}&start=0`);
    await pg.waitForFunction(() => window.__game && window.__game.LEVEL.buildSites, null, { timeout: 30000 });
    const run = (n) => pg.evaluate((n) => window.__game.tick(n, 1 / 60), n);
    const sh = async (n) => { await pg.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await pg.screenshot({ path: `${out}/${lvl}_${n}.png` }); };
    const tapEl = async (sel) => { const r = await pg.locator(sel).first().boundingBox(); await pg.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); };
    await pg.touchscreen.tap(195, 420); await run(30);
    const s = await pg.evaluate(() => { const q = window.__game.LEVEL.buildSites[0], p = window.__game.player; p.x = q.x - 8; p.y = q.y; p.z = q.z + 3; p.vx = p.vz = p.vy = 0; p.onGround = true; return { id: q.id, w: q.w, h: q.h }; });
    await run(10); await sh('0_spill');
    ok(`${lvl}: BYGG-knappen vises`, await pg.locator('#btnBuild').isVisible());
    await tapEl('#btnBuild'); await run(2); ok(`${lvl}: byggeskjermen åpen`, await pg.evaluate(() => document.body.classList.contains('building')));
    for (const [id, u, v, rot] of drops) {
      const fx = 0.5 + u * (51.6 / 1170), fy = (1258 - 51.6 * v) / 1992;   // site w=20, h=12 på iPhone 14: 51,6 px (3x) per enhet, v=0 ved y=1258
      await pg.locator(`#bld .chip[data-id="${id}"]`).scrollIntoViewIfNeeded();
      const r = await pg.locator(`#bld .chip[data-id="${id}"]`).boundingBox(), vw = pg.viewportSize();
      await pg.mouse.move(r.x + r.width / 2, r.y + r.height / 2); await pg.mouse.down(); await pg.mouse.move(vw.width * fx, vw.height * fy, { steps: 8 }); await pg.mouse.up();
      for (let i = 0; i < rot; i++) await tapEl('#bld button[data-a="rotl"]');
    }
    await sh('1_plassert');
    const st = await pg.evaluate(() => window.__game.bld.state()); ok(`${lvl}: delen er plassert`, st.builds.some((q) => q.id === s.id && q.placed > 0), JSON.stringify(st.builds));
    await tapEl('#bld button[data-a="try"]');
    for (let i = 0; i < 60; i++) { await pg.waitForTimeout(250); if (i % 6 === 0) await sh(`2_prov${i}`); if (!(await pg.evaluate(() => window.__game.bld.running))) break; }
    const rs = await pg.evaluate(() => window.__game.bld.result); ok(`${lvl}: PRØV gir et utfall`, !!rs && /won|lost/.test(rs.state), JSON.stringify(rs)); ok(`${lvl}: PRØV klarer det`, rs && rs.state === 'won');
    await sh('3_utfall'); await tapEl('#bld button[data-a="back"]'); await tapEl('#bld button[data-a="back"]').catch(() => {}); await run(5); await sh('4_verden');
    const nb = await pg.evaluate(() => window.__game.LEVEL.boxes.filter((b) => b.built).length); ok(`${lvl}: bygget står i verden`, nb > 0, nb + ' flater');
    ok(`${lvl}: ingen konsollfeil`, errs.length === 0, errs.slice(0, 3).join(' | ')); await ctx.close();
  }
  await b.close(); process.exit(bad ? 1 : 0);
})();
