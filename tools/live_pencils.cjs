// R90: ekte spillflyt for solide blyanter (iPhone 14, Playwright): finner en blyant, stiller figuren ved siden av og går mot den; skjermbilde før/etter.
// node tools/live_pencils.cjs <utmappe> [port] [nivå]
const { chromium, devices } = require('playwright');
(async () => {
  const out = process.argv[2] || '.', port = process.argv[3] || 8390, lv = process.argv[4] || 'barnerom';
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ ...devices['iPhone 14'] }); const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await pg.addInitScript(() => { try { localStorage.setItem('tlm.introsweep', 'false'); } catch {} });
  await pg.goto(`http://localhost:${port}/?level=${lv}&start=0`);
  await pg.waitForFunction(() => window.__game && window.__game.LEVEL.bodies, null, { timeout: 30000 });
  await pg.evaluate(() => { window.__paused = true; });
  const run = (n) => pg.evaluate((n) => window.__game.tick(n, 1 / 60), n);
  await pg.touchscreen.tap(195, 420); await run(30);
  const boxes = await pg.evaluate(() => window.__game.LEVEL.boxes.filter((b) => b.pencil || b.eraser).length);
  // en blyant i nærheten av start: stå 2 enheter sør for midtkula (kameraet ser mot -z) og gå nordover
  const info = await pg.evaluate(() => { const g = window.__game, s = g.LEVEL.start, ps = g.LEVEL.boxes.filter((b) => b.pencil), c = (b) => [(b.min[0] + b.max[0]) / 2, (b.min[2] + b.max[2]) / 2];
    ps.sort((a, b2) => Math.hypot(c(a)[0] - s[0], c(a)[1] - s[2]) - Math.hypot(c(b2)[0] - s[0], c(b2)[1] - s[2])); const bd = ps[0]; if (!bd) return null; const [cx, cz] = c(bd);
    const p = g.player; p.x = cx; p.z = cz + 2; p.y = bd.min[1]; p.vx = p.vz = p.vy = 0; p.onGround = true; g.cam.yaw = 0; return { cx, cz, y: bd.min[1] }; });
  await run(10); await pg.screenshot({ path: `${out}/pencil_before.png` });
  const res = await pg.evaluate((i) => { const g = window.__game, p = g.player; let maxY = 0; g.touch.x = 0; g.touch.y = 1; for (let k = 0; k < 120; k++) { g.tick(1, 1 / 60); maxY = Math.max(maxY, p.y - i.y); } g.touch.x = g.touch.y = 0; return { dz: p.z - i.cz, maxY }; }, info);
  await pg.screenshot({ path: `${out}/pencil_after.png` });
  console.log(JSON.stringify({ lv, boxes, info, res, errs })); await b.close(); process.exit(boxes > 0 && info && errs.length === 0 ? 0 : 1);
})();
