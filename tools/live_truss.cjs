// R49a2: fagverk-hjelp og knekking på mobil (iPhone 14, Playwright): legger inn firkant/trekant/blyant-trekant via kode, viser ringer og ⚠, prøver og ser forklaringen.
// node tools/live_truss.cjs <utmappe> [port]   (server: python3 -m http.server <port>; playwright via NODE_PATH)
const { chromium, devices } = require('playwright');
(async () => {
  const out = process.argv[2] || '.', port = process.argv[3] || 8431;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ ...devices['iPhone 14'] });
  const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await pg.addInitScript(() => { try { localStorage.setItem('tlm.buildall', 'true'); } catch {} });
  await pg.route('**/levels/kontroll.level.json*', async (route) => { const r = await route.fetch(); const j = await r.json(); const add = (id, type) => j.build.parts.push({ id, type, x: -40, y: 0.9, z: -20 }); add('x1', 'plank_s'); add('x2', 'plank_s'); add('x3', 'plank_l'); add('x4', 'pencil'); add('x5', 'pencil'); add('x6', 'plank_s'); await route.fulfill({ response: r, json: j }); });
  await pg.goto(`http://localhost:${port}/?level=kontroll&start=0`);
  await pg.waitForFunction(() => window.__game && window.__game.LEVEL.buildSites, null, { timeout: 60000 });
  const run = (n) => pg.evaluate((n) => window.__game.tick(n, 1 / 60), n);
  const sh = async (n) => { await pg.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await pg.screenshot({ path: `${out}/${n}.png` }); };
  const tapEl = async (sel) => { const r = await pg.locator(sel).first().boundingBox(); await pg.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); };
  await pg.touchscreen.tap(195, 420); await run(30);
  const s = await pg.evaluate(() => { const q = window.__game.LEVEL.buildSites[0]; return { x: q.x, y: q.y, z: q.z }; });
  await pg.evaluate(([x, y, z]) => { const p = window.__game.player; p.x = x - 4; p.y = y; p.z = z + 3; p.vx = p.vz = p.vy = 0; p.onGround = true; }, [s.x, s.y, s.z]); await run(10);
  await tapEl('#btnBuild'); await run(2);
  const mk = (which) => pg.evaluate(async (which) => {
    const BL = await import('./build_logic.js?x=' + Math.random()), L = window.__game.LEVEL, site = L.buildSites[0], types = BL.partTypes(L), ids = L.buildParts.map((q) => q.id);
    const B = BL.createBuild(site, types, ids); const put = (id, u, v, rot) => { B.placed.push({ id, type: types[id], u, v, rot }); };
    const hinge = (a, ax, ay, b, bx, by) => { B.links.push({ id: 'k' + (B.links.length + 1), kind: 'hinge', a, la: { x: ax, y: ay }, b, lb: { x: bx, y: by }, g: null }); };
    if (which === 'quad') { put('d2', 0, 0.25, 0); put('x1', -3, 2.75, Math.PI / 2); put('x2', 3, 2.75, Math.PI / 2); put('x3', 0, 5, 0); hinge('d2', -3, 0.25, 'x1', -2, 0); hinge('d2', 3, 0.25, 'x2', -2, 0); hinge('x1', 2, 0, 'x3', -3, 0); hinge('x2', 2, 0, 'x3', 3, 0); }
    if (which === 'tri') { const rise = Math.sqrt(16 - 9), th = Math.atan2(rise, 3); put('d2', 0, 0.25, 0); put('x1', -1.5, 0.5 + rise / 2, th); put('x2', 1.5, 0.5 + rise / 2, -th); hinge('d2', -3, 0.25, 'x1', -2, 0); hinge('d2', 3, 0.25, 'x2', 2, 0); hinge('x1', 2, 0, 'x2', -2, 0); put('d3', 0, 0.5 + rise + 0.77, 0); }
    if (which === 'pencil') { const L5 = 5, hs = 3.5, rise = Math.sqrt(25 - 12.25), th = Math.atan2(rise, hs); put('d2', 0, 0.25, 0); put('x4', -hs / 2, 0.5 + rise / 2, th); put('x5', hs / 2, 0.5 + rise / 2, -th); hinge('d2', -hs, 0.25, 'x4', -2.5, 0); hinge('d2', hs, 0.25, 'x5', 2.5, 0); hinge('x4', 2.5, 0, 'x5', -2.5, 0); put('d5', 0, 0.5 + rise + 0.77, 0); }
    return BL.exportCode(B);
  }, which);
  const doImport = async (which) => { const code = await mk(which); console.log('check', JSON.stringify(await pg.evaluate(async (c) => { const BL = await import('./build_logic.js?y=' + Math.random()), L = window.__game.LEVEL; const B = BL.createBuild(L.buildSites[0], BL.partTypes(L), L.buildParts.map((q) => q.id)); const r = BL.importCode(c, B); return { ok: r.ok, why: r.why, missing: r.missing }; }, code)), 'active', JSON.stringify(await pg.evaluate(() => window.__game.bld.state()))); const ok = await pg.evaluate((c) => window.__game.bld.importText(c), code); await run(5); await pg.waitForTimeout(400); return ok; };
  console.log('pencil import', await doImport('pencil'));
  await tapEl('#bld button[data-a="try"]'); for (let i = 0; i < 160; i++) { await pg.waitForTimeout(500); if (!(await pg.evaluate(() => window.__game.bld.running))) break; }
  await pg.waitForTimeout(600); await sh('6_blyant_ferdig'); console.log('result', JSON.stringify(await pg.evaluate(() => window.__game.bld.result)));
  await tapEl('#bld button[data-a="try"]'); await pg.waitForTimeout(300);
  console.log('quad import', await doImport('quad'));
  await tapEl('#bld button[data-a="try"]'); for (let i = 0; i < 160; i++) { await pg.waitForTimeout(500); if (!(await pg.evaluate(() => window.__game.bld.running))) break; }
  await pg.waitForTimeout(600); await sh('7_firkant_ferdig'); console.log('result', JSON.stringify(await pg.evaluate(() => window.__game.bld.result)));
  console.log('errors', errs.slice(0, 5));
  await b.close();
})();
