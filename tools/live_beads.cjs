// R37: ekte spillflyt for solide perler (iPhone 14, Playwright): finner en perle i brettet, går inn i den og sjekker at figuren stoppes/glir av; skjermbilde.
// node tools/live_beads.cjs <utmappe> [port] [nivå]   Exit 1 hvis perla ikke er solid eller det er konsollfeil.
const { chromium, devices } = require('playwright');
(async () => {
  const out = process.argv[2] || '.', port = process.argv[3] || 8319, lv = process.argv[4] || 'kjokken';
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ ...devices['iPhone 14'] }); const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await pg.addInitScript(() => { try { localStorage.setItem('tlm.introsweep', 'false'); } catch {} });
  await pg.goto(`http://localhost:${port}/?level=${lv}&start=0`);
  await pg.waitForFunction(() => window.__game && window.__game.LEVEL.bodies, null, { timeout: 30000 });
  await pg.evaluate(() => { window.__paused = true; });
  const run = (n) => pg.evaluate((n) => window.__game.tick(n, 1 / 60), n);
  await pg.touchscreen.tap(195, 420); await run(30);
  const beads = await pg.evaluate(() => window.__game.LEVEL.boxes.filter((b) => b.bead).length);
  // sett figuren 2 enheter vest for en perle og gå mot den
  const r = await pg.evaluate(() => { const g = window.__game, bd = g.LEVEL.boxes.find((b) => b.bead), cx = (bd.min[0] + bd.max[0]) / 2, cz = (bd.min[2] + bd.max[2]) / 2, y = bd.min[1] < 0.4 ? 0 : bd.min[1], rad = (bd.max[0] - bd.min[0]) / 2;
    const p = g.player; p.x = cx - 2; p.z = cz; p.y = y; p.vx = p.vz = p.vy = 0; p.onGround = true; g.cam.yaw = -Math.PI / 2; return { cx, cz, rad, y }; });
  await run(10);
  await pg.screenshot({ path: `${out}/beads_${lv}_before.png` });
  const res = await pg.evaluate((i) => { const g = window.__game, p = g.player; let maxY = 0; g.touch.x = 0; g.touch.y = 1; for (let k = 0; k < 150; k++) { g.tick(1, 1 / 60); maxY = Math.max(maxY, p.y); } g.touch.x = g.touch.y = 0; return { x: +p.x.toFixed(2), z: +p.z.toFixed(2), maxY: +maxY.toFixed(2), beadX: +i.cx.toFixed(2), stoppedBefore: p.x < i.cx + 0.1 }; }, r);
  console.log(JSON.stringify({ lv, beads, r, res, errs })); await pg.screenshot({ path: `${out}/beads_${lv}_after.png` }); await b.close(); process.exit(beads > 0 && errs.length === 0 && (res.stoppedBefore || res.maxY > 0.1 || Math.abs(res.z - r.cz) > 0.05) ? 0 : 1);
})();
