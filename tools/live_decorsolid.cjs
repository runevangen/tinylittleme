// R91: ekte spillflyt for solid dekor (iPhone 14, Playwright): stiller figuren på krydderhylla i Kjøkken, går mot et glass; skjermbilde før/etter.
// node tools/live_decorsolid.cjs <utmappe> [port]   (server: python3 -m http.server <port> i prosjektmappa)
const { chromium, devices } = require('playwright');
(async () => {
  const out = process.argv[2] || '.', port = process.argv[3] || 8391;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ ...devices['iPhone 14'] }); const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await pg.addInitScript(() => { try { localStorage.setItem('tlm.introsweep', 'false'); } catch {} });
  await pg.goto(`http://localhost:${port}/?level=kjokken&start=0`);
  await pg.waitForFunction(() => window.__game && window.__game.LEVEL.bodies, null, { timeout: 60000 });
  await pg.evaluate(() => { window.__paused = true; });
  const run = (n) => pg.evaluate((n) => window.__game.tick(n, 1 / 60), n);
  await pg.touchscreen.tap(195, 420); await run(30);
  const boxes = await pg.evaluate(() => window.__game.LEVEL.boxes.filter((x) => x.decorSolid).length);
  await pg.evaluate(() => { const g = window.__game, p = g.player; p.x = 24.7; p.z = -27.35; p.y = 30.4; p.vx = p.vz = p.vy = 0; p.onGround = true; g.cam.yaw = 0; });
  await run(10); await pg.screenshot({ path: `${out}/decor_before.png` });
  const res = await pg.evaluate(() => { const g = window.__game, p = g.player; g.touch.x = 0; g.touch.y = 1; for (let k = 0; k < 120; k++) g.tick(1, 1 / 60); g.touch.x = g.touch.y = 0; return { x: +p.x.toFixed(2), z: +p.z.toFixed(2), y: +p.y.toFixed(2) }; });
  await run(10); await pg.screenshot({ path: `${out}/decor_after.png` });
  console.log(JSON.stringify({ boxes, res, errs })); await b.close(); process.exit(boxes === 3 && res.z > -27.9 && res.z < -27.5 && res.y > 30 && errs.length === 0 ? 0 : 1);
})();
