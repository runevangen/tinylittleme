// R34: ekte spillflyt for sprettboks-kastet (iPhone 14, Playwright): står på sprettboksen, trykker HOPP-knappen (landing popper boksen) og sjekker kastet.
// node tools/live_kick.cjs <utmappe> [port] [nivå]   Exit 1 hvis figuren ikke kastes.
const { chromium, devices } = require('playwright');
(async () => {
  const out = process.argv[2] || '.', port = process.argv[3] || 8318, lv = process.argv[4] || 'barnerom';
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ ...devices['iPhone 14'] }); const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await pg.addInitScript(() => { try { localStorage.setItem('tlm.introsweep', 'false'); } catch {} });   // intro-sveipet dekker knappene
  await pg.goto(`http://localhost:${port}/?level=${lv}&start=0`);
  await pg.waitForFunction(() => window.__game && window.__game.LEVEL.bodies, null, { timeout: 30000 });
  await pg.evaluate(() => { window.__paused = true; });
  const run = (n) => pg.evaluate((n) => window.__game.tick(n, 1 / 60), n);
  const tap = async (id) => { const r = await pg.locator('#' + id).boundingBox(); await pg.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); };
  await pg.touchscreen.tap(195, 420); await run(30);
  const info = await pg.evaluate(() => { const b = window.__game.LEVEL.bodies.find((q) => q.id === 'leke_sprettboks'); return { cx: (b.min[0] + b.max[0]) / 2, cz: (b.min[2] + b.max[2]) / 2, top: b.max[1] }; });
  // står på boksen (litt ut fra midten), HOPP-knappen: hopper og lander på boksen -> popper -> kastes
  await pg.evaluate((i) => { const g = window.__game, p = g.player; p.x = i.cx + 0.8; p.z = i.cz; p.y = i.top; p.vx = p.vz = p.vy = 0; p.onGround = true; p.fx = 0; p.fz = -1; g.cam.yaw = 0; }, info);
  await run(5); { const r = await pg.locator('#btnJump').boundingBox(); await pg.mouse.move(r.x + r.width / 2, r.y + r.height / 2); await pg.mouse.down(); await run(3); await pg.mouse.up(); } const trace = [];
  for (let i = 0; i < 14; i++) { await run(8); trace.push(await pg.evaluate(() => { const p = window.__game.player; return [+p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2), +p.vy.toFixed(1), p.onGround]; })); if (i === 6) await pg.screenshot({ path: `${out}/kick_${lv}_air.png` }); }
  await run(60); await pg.screenshot({ path: `${out}/kick_${lv}_after.png` });
  const end = await pg.evaluate(() => { const p = window.__game.player; return { x: p.x, y: p.y, z: p.z, safeT: p.safeT, onGround: p.onGround }; });
  const d = Math.hypot(end.x - info.cx, end.z - info.cz); const maxY = Math.max(...trace.map((t) => t[1]));
  const ok = d > 2.5 && maxY > info.top + 2 && errs.length === 0;
  console.log(JSON.stringify({ lv, trace: trace.slice(0, 8), info, end, d: +d.toFixed(2), maxY, errs, ok })); await b.close(); process.exit(ok ? 0 : 1);
})();
