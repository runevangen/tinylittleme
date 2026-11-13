// R61: ekte spillflyt for vepsen (iPhone 14, Playwright, swiftshader uten GPU): patrulje, varsel, stup, bom, gjemme seg, knus. Skjermbilder + logg.
// node tools/live_wasp.cjs <utmappe> [port] [nivå]   Exit 1 hvis noe i flyten ikke virker eller det kommer konsollfeil. Ekte FPS/følelse: testes på iPhone.
const { chromium, devices } = require('playwright');
(async () => {
  const out = process.argv[2] || '.', port = process.argv[3] || 8319, lv = process.argv[4] || 'kjokken';
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ ...devices['iPhone 14'] }); const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await pg.addInitScript(() => { try { localStorage.setItem('tlm.introsweep', 'false'); localStorage.setItem('tlm.cues', 'true'); } catch {} });
  await pg.goto(`http://localhost:${port}/?level=${lv}&start=0`);
  await pg.waitForFunction(() => window.__game && window.__game.player, null, { timeout: 30000 });
  await pg.evaluate(() => { window.__paused = true; });
  const run = (n) => pg.evaluate((n) => window.__game.tick(n, 1 / 60), n);
  await pg.touchscreen.tap(195, 420); await run(30);
  const st = () => pg.evaluate(() => { const t = window.__game.LEVEL.antList.find((a) => a.type === 'wasp'); return { mode: t.mode, x: +t.x.toFixed(2), y: +t.y.toFixed(2), z: +t.z.toFixed(2), danger: t.danger, alive: t.alive }; });
  const put = (x, z) => pg.evaluate(([x, z]) => { const g = window.__game, p = g.player; p.x = x; p.z = z; p.y = 0; p.vx = p.vy = p.vz = 0; p.state = 'ground'; p.onGround = true; g.touch.x = 0; g.touch.y = 0; g.LEVEL.antInvuln = 0; }, [x, z]);
  const w = await pg.evaluate(() => { const t = window.__game.LEVEL.antList.find((a) => a.type === 'wasp'); return { x: t.x, z: t.z, a: t.a, b: t.b }; });
  const res = {}; res.patrol = await st();
  const setS = (sx) => pg.evaluate((sx) => { const t = window.__game.LEVEL.antList.find((a) => a.type === 'wasp'); t.s = sx; t.mode = 'patrol'; t.dir = 1; t.wait = 0; t.alive = true; }, sx);
  const X = 9, Z = 0.4, sAt = (x) => (x - w.a[0]) / (w.b[0] - w.a[0]);   // gulvflekk foran bordet, fri for leker
  // 1) patrulje: vepsen i lufta over gulvet (skjermbilde)
  await setS(sAt(X - 5)); await put(X, Z - 6); await run(5); await pg.screenshot({ path: `${out}/veps_patrulje.png` });
  // 2) varsel: stå rett under den
  await setS(sAt(X - 3)); await put(X, Z); await run(20); res.warn = await st(); await pg.screenshot({ path: `${out}/veps_varsel.png` });
  // 3) stup: la den sikte, stikk til siden (bom)
  await run(60); res.dive = await st(); await pg.screenshot({ path: `${out}/veps_stup.png` });
  await put(X + 2, Z); await run(70); res.miss = await st(); await pg.screenshot({ path: `${out}/veps_bom.png` });
  // 4) tilbake til patrulje
  await put(0, 60); await run(60 * 8); res.back = await st();
  // 5) gjemme seg under bordet
  const tab = await pg.evaluate(() => { const q = window.__game.LEVEL.boxes.find((x) => x.id === 'bord'); return q ? { x: (q.min[0] + q.max[0]) / 2, z: (q.min[2] + q.max[2]) / 2, ok: true } : { ok: false }; });
  res.table = tab;
  if (tab.ok) { await pg.evaluate(([x, z]) => { const t = window.__game.LEVEL.antList.find((a) => a.type === 'wasp'); window.__game.player.x = x; window.__game.player.z = z; window.__game.player.y = 0; t.s = 0.5; t.mode = 'patrol'; }, [tab.x, tab.z]); await run(120); res.hidden = await st(); await pg.screenshot({ path: `${out}/veps_gjemt.png` }); }
  // 6) knus midt i stupet
  await setS(sAt(X - 3)); await put(X, Z);
  await run(25); res.warn2 = await st(); await run(40); res.dive2 = await st();
  await pg.evaluate(() => { const g = window.__game, t = g.LEVEL.antList.find((a) => a.type === 'wasp'); g.player.x = t.x; g.player.z = t.z; g.player.y = t.y + 0.45; g.player.vy = -6; g.player.state = 'air'; g.player.onGround = false; }); await run(2);
  res.stomp = await st(); await run(10); await pg.screenshot({ path: `${out}/veps_knust.png` });
  const log = await pg.evaluate(() => (window.__game.evLog || []).filter((e) => JSON.stringify(e).includes('veps')).slice(-12));
  const ok = res.patrol.y > 2 && res.warn.mode === 'warn' && res.dive.mode === 'dive' && res.miss.mode !== 'dive' && res.back.mode === 'patrol' && (!tab.ok || res.hidden.mode === 'patrol') && res.stomp.alive === false && errs.length === 0;
  console.log(JSON.stringify({ lv, res, log, errs, ok })); await b.close(); process.exit(ok ? 0 : 1);
})();
