// R40: ekte nettleser (iPhone 14, Playwright): snu med skritt, fotløft over hinder, nye poser i heng/veggglid. Skjermbilder + måltall.
// node tools/live_heromove.cjs <utmappe> [port] [nivå]   Exit 1 ved feil. Ingen GPU: ingen FPS-krav.
const { chromium, devices } = require('playwright');
(async () => {
  const out = process.argv[2] || '.', port = process.argv[3] || 8340, lv = process.argv[4] || 'kontroll';
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ ...devices['iPhone 14'] }); const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await pg.addInitScript(() => { try { localStorage.setItem('tlm.introsweep', 'false'); } catch {} });
  await pg.goto(`http://localhost:${port}/?level=${lv}&start=0`);
  await pg.waitForFunction(() => window.__game && window.__game.LEVEL, null, { timeout: 30000 });
  await pg.evaluate(() => { window.__paused = true; });
  await pg.touchscreen.tap(195, 420);
  const r = await pg.evaluate(() => {
    const g = window.__game, p = g.player, res = {}; let now = 1000;
    const pose = (n, f, upd = true) => { for (let i = 0; i < n; i++) { now += 16; if (f) f(i); if (upd) g.update(1 / 60); g.poseHero(p, now, 1 / 60, 'play'); } };
    p.vx = p.vz = 0; pose(30);
    // 1) snu raskt på stedet: roterer blikkretningen 3 rad/s
    let a = 0, lifts = [], spread = [];
    pose(90, () => { a += 3 / 60; p.fx = Math.sin(a); p.fz = Math.cos(a); });
    pose(10, () => { a += 3 / 60; p.fx = Math.sin(a); p.fz = Math.cos(a); });
    res.turnEv = g.evLog.filter((e) => e.type === 'snusteg').length;
    for (let i = 0; i < 40; i++) { a += 3 / 60; p.fx = Math.sin(a); p.fz = Math.cos(a); pose(1); lifts.push(g.hero.legL.top.position.y); }
    res.yawRate = g.hero.yawRate;
    res.legSpread = [g.hero.legL.top.rotation.z, g.hero.legR.top.rotation.z];
    // 2) heng og veggglid
    p.state = 'hang'; pose(40, (i) => { p.vx = 1.5; }, false); res.hangArms = [g.hero.armL.top.rotation.x, g.hero.armR.top.rotation.x];
    p.state = 'air'; p.onGround = false; p.sliding = true; p.vy = -3.5; pose(40, null, false); res.slideArms = [g.hero.armL.top.rotation.x, g.hero.armR.top.rotation.x];
    res.gripEv = g.evLog.filter((e) => e.type === 'grepspose').map((e) => e.detail);
    p.state = 'ground'; p.sliding = false; p.onGround = true; p.vx = p.vz = 0; p.vy = 0;
    // 3) trinn
    p.stepDy = 0.1; pose(8, null, false); res.stepEv = g.evLog.filter((e) => e.type === 'trinn').length;
    return res;
  });
  await pg.evaluate(() => { const g = window.__game; g.player.state = 'air'; g.player.onGround = false; g.player.sliding = true; g.player.vy = -3.5; let now = 5000; for (let i = 0; i < 60; i++) { now += 16; g.poseHero(g.player, now, 1 / 60, 'play'); } });
  await pg.screenshot({ path: `${out}/heromove_slide.png` });
  await pg.evaluate(() => { const g = window.__game; g.player.state = 'hang'; g.player.sliding = false; g.player.vx = 1.5; let now = 9000; for (let i = 0; i < 60; i++) { now += 16; g.poseHero(g.player, now, 1 / 60, 'play'); } });
  await pg.screenshot({ path: `${out}/heromove_hang.png` });
  const ok = r.turnEv >= 3 && r.gripEv.includes('hang') && r.gripEv.includes('slide') && r.stepEv >= 1 && errs.length === 0;
  console.log(JSON.stringify({ r, errs, ok })); await b.close(); process.exit(ok ? 0 : 1);
})();
