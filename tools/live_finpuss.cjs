// R39: ekte spillflyt for finpuss (iPhone 14, Playwright): kant-shimmy og rulle ved landing, med skjermbilde.
// node tools/live_finpuss.cjs <utmappe> [port] [nivå]   Exit 1 hvis shimmy eller rulle ikke virker, eller konsollfeil.
const { chromium, devices } = require('playwright');
(async () => {
  const out = process.argv[2] || '.', port = process.argv[3] || 8319, lv = process.argv[4] || 'kontroll';
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ ...devices['iPhone 14'] }); const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await pg.addInitScript(() => { try { localStorage.setItem('tlm.introsweep', 'false'); } catch {} });
  await pg.goto(`http://localhost:${port}/?level=${lv}&start=0`);
  await pg.waitForFunction(() => window.__game && window.__game.player, null, { timeout: 30000 });
  await pg.evaluate(() => { window.__paused = true; });
  const run = (n) => pg.evaluate((n) => window.__game.tick(n, 1 / 60), n);
  await pg.touchscreen.tap(195, 420); await run(30);
  // 1) shimmy: hent en bred, høy boks og heng på sørsiden (+z)
  const info = await pg.evaluate(() => {
    const g = window.__game, L = g.LEVEL; const c = L.boxes.filter((q) => q.type !== 'floor' && q.type !== 'wall' && !q.dyn && !q.grip && q.max[1] > 1.5 && q.max[0] - q.min[0] > 3).sort((a, b) => (b.max[0] - b.min[0]) - (a.max[0] - a.min[0]))[0];
    const p = g.player, cx = (c.min[0] + c.max[0]) / 2, top = c.max[1];
    g.P.shimmy = true; g.cam.yaw = 0;
    p.state = 'hang'; p.onGround = false; p.x = cx; p.z = c.max[2] + 0.3; p.y = top - 1; p.vx = p.vy = p.vz = 0; p.fx = 0; p.fz = -1;
    p.hang = { nx: 0, nz: 1, top, tx: cx, tz: c.max[2] - 0.35, box: c };
    return { id: c.id, cx, x0: c.min[0], x1: c.max[0], top };
  });
  await run(10); await pg.screenshot({ path: `${out}/finpuss_hang.png` });
  const before = await pg.evaluate(() => window.__game.player.x);
  await pg.evaluate(() => { window.__game.touch.x = 1; window.__game.touch.y = 0; }); await run(50);
  const mid = await pg.evaluate(() => ({ x: window.__game.player.x, st: window.__game.player.state, mv: window.__game.player.hangMove })); await pg.screenshot({ path: `${out}/finpuss_shimmy.png` });
  await pg.evaluate(() => { window.__game.touch.x = 0; });
  const shimmyOk = mid.st === 'hang' && Math.abs(mid.x - before) > 0.5;
  // 2) rulle: fall med fart og stikke fremover
  await pg.evaluate(() => { const g = window.__game, p = g.player; g.touch.x = 0; g.touch.y = 0; g.P.rollOn = true; g.P.hardLand = 12; g.P.knockV = 40; p.x = 2; p.z = 2; p.y = 16; p.vx = 0; p.vz = 0; p.vy = 0; p.state = 'air'; p.hang = null; p.onGround = false; p.hardLands = 0; p.rolls = 0; });
  let rolled = false, shot = false;
  for (let i = 0; i < 160 && !rolled; i++) { await pg.evaluate(() => { const g = window.__game; g.touch.x = 0; g.touch.y = -1; }); await run(1); rolled = await pg.evaluate(() => window.__game.player.rolls > 0); }
  if (rolled) { await run(6); await pg.screenshot({ path: `${out}/finpuss_roll.png` }); shot = true; }
  const end = await pg.evaluate(() => ({ rolls: window.__game.player.rolls, hard: window.__game.player.hardLands, rec: window.__game.player.recover }));
  const ok = shimmyOk && rolled && end.hard === 0 && errs.length === 0;
  console.log(JSON.stringify({ lv, info, before, mid, shimmyOk, rolled, shot, end, errs, ok })); await b.close(); process.exit(ok ? 0 : 1);
})();
