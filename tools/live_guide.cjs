// R64: ekte nettleser (iPhone 14, Playwright): veiledning når målet er under (Nivå 4 Bad, på den nye hylla, siste delmål «Knus en vokter»). Skjermbilder før (tlm.guide=false) og etter. Ingen GPU: ingen FPS-krav.
// node tools/live_guide.cjs <utmappe> [port]   Exit 1 ved feil.
const { chromium, devices } = require('playwright');
(async () => {
  const out = process.argv[2] || '.', port = process.argv[3] || 8364, res = {}, errs = [];
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  for (const mode of (process.env.MODES || 'before,after').split(',')) {
    const ctx = await b.newContext({ ...devices['iPhone 14'] }); ctx.setDefaultTimeout(150000); const pg = await ctx.newPage();
    pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await pg.addInitScript((m) => { try { localStorage.setItem('tlm.introsweep', 'false'); localStorage.setItem('tlm.guide', m === 'after' ? 'true' : 'false'); } catch {} }, mode);
    await pg.goto(`http://localhost:${port}/?level=bad2&start=0`);
    await pg.waitForFunction(() => window.__game && window.__game.LEVEL, null, { timeout: 120000 });
    await pg.touchscreen.tap(195, 420);
    await pg.evaluate(() => {
      const g = window.__game, L = g.LEVEL, p = g.player;
      for (const q of L.goalList) if (q.id !== 'vokter') q.done = true;
      p.x = 8; p.y = 32.6; p.z = 14.5; p.vx = p.vy = p.vz = 0; p.onGround = true; p.state = 'ground';
      g.cam.yaw = 0; window.__paused = true;
    });
    await pg.waitForTimeout(2500);
    res[mode] = await pg.evaluate(() => { const g = window.__game, t = g.guide.nextTarget(), a = g.guide.aimOf(t); return { kind: t.kind, ref: t.ref?.type, vert: a.vert, vertDom: a.vertDom, ang: +a.ang.toFixed(2), band: document.querySelector('#topband')?.innerText.replace(/\n/g, ' | '), guide: g.guide.v.state(), floorArrow: g.goalArrowG.visible }; });
    await pg.screenshot({ path: `${out}/guide_${mode}.png`, timeout: 150000 });
    if (mode === 'after') {
      // åpne båndet: panelet har hele setningen og «Vis meg»
      await pg.evaluate(() => document.querySelector('#topband .tbm').click()); await pg.waitForTimeout(800);
      res.panel = await pg.evaluate(() => document.querySelector('#topband .tbp')?.innerText);
      await pg.screenshot({ path: `${out}/guide_panel.png`, timeout: 150000 });
      // Vis meg: flyr til målet og tilbake (klokka kjøres for hånd, siden uten GPU går bildet i ca. 1 fps)
      const y0 = await pg.evaluate(() => [window.__game.cam.yaw, window.__game.cam.pitch]);
      await pg.evaluate(() => { document.querySelector('#topband .tbp button[data-act="next"]').click(); });
      const seq = [];
      for (let i = 0; i < 12; i++) {
        seq.push(await pg.evaluate(() => { const g = window.__game; for (let k = 0; k < 10; k++) g.guide.tick(0.05); return [g.guide.showMe.phase, +g.cam.pitch.toFixed(2), +g.cam.yaw.toFixed(2)]; }));
        if (seq[i][0] === 'hold' && !res.shotShow) { res.shotShow = 1; await pg.waitForTimeout(1500); await pg.screenshot({ path: `${out}/guide_showme.png`, timeout: 150000 }); }
      }
      res.showme = seq; res.camBefore = y0;
      res.ev = await pg.evaluate(() => window.__game.evLog.filter((e) => e.type === 'veiledning').map((e) => e.detail));
      // ruta utheves etter stillstand: spol klokka ved å sette stall.t0 langt tilbake
      await pg.evaluate(() => { window.__game.guide.stall.t0 = performance.now() - 50000; });
      await pg.waitForTimeout(1200); res.route = await pg.evaluate(() => window.__game.guide.v.state()); await pg.screenshot({ path: `${out}/guide_route.png`, timeout: 150000 });
      res.programs = await pg.evaluate(() => window.__game.programCount()); res.calls = await pg.evaluate(() => { const s = window.__game.perfStats(); return { calls: s.calls ?? s.drawCalls, tris: s.tris ?? s.triangles }; });
    }
    await ctx.close();
  }
  res.errs = errs;
  const A = res.after;
  const ok = errs.length === 0 && A.vert === 'down' && A.vertDom && A.guide.edge && A.guide.ghost && /▼/.test(A.band) && !A.floorArrow && res.panel && /Vent|Hopp/.test(res.panel) && res.showme.some((s) => s[0] === 'hold') && res.showme[res.showme.length - 1][0] === 'idle' && res.route.frame;
  console.log(JSON.stringify(res, null, 1)); await b.close(); process.exit(ok ? 0 : 1);
})();
