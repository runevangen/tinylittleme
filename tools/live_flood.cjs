// R65: ekte nettleser (iPhone 14, Playwright): stigende vann i Nivå 4. Skjermbilder: (1) på den nye hylla med vann på ca. 40 %: indikator, «Vann under deg», pila mot tørt mål;
// (2) hodet under vann: rødt varsel. Ingen GPU: ingen FPS-krav, spillogikken kjøres med g.tick.   node tools/live_flood.cjs <utmappe> [port]   Exit 1 ved feil.
const { chromium, devices } = require('playwright');
(async () => {
  const out = process.argv[2] || '.', port = process.argv[3] || 8365, res = {}, errs = [];
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  for (const mode of (process.env.MODES || 'av,shelf,deep').split(',')) {
    const ctx = await b.newContext({ ...devices['iPhone 14'] }); ctx.setDefaultTimeout(150000); const pg = await ctx.newPage();
    pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await pg.addInitScript((m) => { try { localStorage.setItem('tlm.introsweep', 'false'); localStorage.setItem('tlm.flood', JSON.stringify(m === 'av' ? 'av' : 'vanlig')); } catch {} }, mode);
    await pg.goto(`http://localhost:${port}/?level=bad2&start=0`);
    await pg.waitForFunction(() => window.__game && window.__game.LEVEL, null, { timeout: 120000 });
    await pg.touchscreen.tap(195, 420);
    if (mode === 'shelf') {
      await pg.evaluate(() => { const g = window.__game, p = g.player; for (const q of g.LEVEL.goalList) if (q.id === 'kurv' || q.id === 'hylle') q.done = true;
        p.x = 1.5; p.y = 32.6; p.z = 17; p.vx = p.vy = p.vz = 0; p.onGround = true; p.state = 'ground'; p.fx = -1; p.fz = 0; g.cam.yaw = Math.PI / 2; g.tick(530, 0.1); });
    } else if (mode === 'deep') {
      await pg.evaluate(() => { const g = window.__game, p = g.player; g.tick(1, 0.1); const v = g.variant; p.x = -5; p.y = 0; p.z = 12; p.vx = p.vy = p.vz = 0; p.onGround = true; p.state = 'ground'; g.cam.yaw = 0;
        let n = 0; while (v.under < 1.2 && n++ < 2000) g.tick(1, 0.1); });
    } else { await pg.evaluate(() => window.__game.tick(60, 0.1)); }
    await pg.waitForTimeout(2500);
    res[mode] = await pg.evaluate(() => { const g = window.__game, v = g.variant; return { water: +v.water.toFixed(2), under: +v.under.toFixed(2), flood: v.flood, band: document.querySelector('#topband')?.innerText.replace(/\n/g, ' | '), vig: document.getElementById('floodVig')?.style.opacity, ev: g.evLog.filter((e) => e.type === 'vann').map((e) => e.detail), waterColor: v.waterMesh.material.color.getHexString(), op: +v.waterMesh.material.opacity.toFixed(2) }; });
    await pg.screenshot({ path: `${out}/flood_${mode}.png`, timeout: 150000 });
    if (mode === 'shelf') { res.programs = await pg.evaluate(() => window.__game.programCount()); res.calls = await pg.evaluate(() => { const s = window.__game.perfStats(); return { calls: s.calls ?? s.drawCalls, tris: s.tris ?? s.triangles }; }); }
    if (mode === 'av') { res.programsAv = await pg.evaluate(() => window.__game.programCount()); res.callsAv = await pg.evaluate(() => { const s = window.__game.perfStats(); return { calls: s.calls ?? s.drawCalls, tris: s.tris ?? s.triangles }; }); }
    await ctx.close();
  }
  res.errs = errs;
  const S = res.shelf || {}, D = res.deep || {};
  const ok = errs.length === 0 && !(res.av && res.av.flood) && !/💧/.test((res.av && res.av.band) || '') && S.flood && /💧 \d+ %/.test(S.band) && D.under > 1 && +D.vig > 0.2 && /Under vann|Under water/.test(D.band);
  console.log(JSON.stringify(res, null, 1)); await b.close(); process.exit(ok ? 0 : 1);
})();
