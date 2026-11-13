// R58: ekte nettleser (iPhone 14, Playwright): poser for grep, heng, opptrekk og avspark. Skjermbilder + måltall. Ingen GPU: ingen FPS-krav.
// node tools/live_climbfeel.cjs <utmappe> [port] [nivå]   Exit 1 ved feil.
const { chromium, devices } = require('playwright');
(async () => {
  const out = process.argv[2] || '.', port = process.argv[3] || 8341, lv = process.argv[4] || 'kontroll';
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ ...devices['iPhone 14'] }); const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await pg.addInitScript(() => { try { localStorage.setItem('tlm.introsweep', 'false'); } catch {} });
  await pg.goto(`http://localhost:${port}/?level=${lv}&start=0`);
  await pg.waitForFunction(() => window.__game && window.__game.LEVEL, null, { timeout: 30000 });
  await pg.evaluate(() => { window.__paused = true; });
  await pg.touchscreen.tap(195, 420);
  const snap = (name) => pg.evaluate((n) => { const g = window.__game, h = g.hero; return { n, aL: +h.armL.top.rotation.x.toFixed(2), eL: +h.armL.mid.rotation.x.toFixed(2), kL: +h.legL.mid.rotation.x.toFixed(2), kR: +h.legR.mid.rotation.x.toFixed(2), hL: +h.legL.top.rotation.x.toFixed(2), bobY: +h.body.position.y.toFixed(3), fg: g.hero.cfFg }; }, name);
  const run = (fn) => pg.evaluate(fn);
  const res = {};
  const setup = `const g = window.__game, p = g.player; let now = window.__now || 1000; const pose = (n, f, upd) => { for (let i = 0; i < n; i++) { now += 16; if (f) f(i); if (upd) g.update(1 / 60); g.poseHero(p, now, 1 / 60, 'play'); } };`;
  const A = (body) => pg.evaluate(new Function(`${setup} ${body}; window.__now = now;`));
  await A(`p.vx = p.vz = 0; p.state = 'ground'; p.onGround = true; pose(30)`);
  await A(`p.state = 'hang'; p.onGround = false; p.vx = p.vz = 0; p.vy = 0; pose(2)`); res.catch = await snap('catch'); await pg.screenshot({ path: `${out}/climbfeel_catch.png` });
  await A(`pose(60)`); res.hang = await snap('hang'); await pg.screenshot({ path: `${out}/climbfeel_hang.png` });
  await A(`p.state = 'mantle'; p.mantle = { t: 0, dur: 0.8, fx: p.x, fy: p.y, fz: p.z, tx: p.x, ty: p.y + 1, tz: p.z }; pose(30, (i) => { p.mantle.t = i * 0.8 / 30 * 0.6; })`); res.pull = await snap('pull'); await pg.screenshot({ path: `${out}/climbfeel_pull.png` });
  await A(`p.mantle = null; p.state = 'climb'; p.climb = null; pose(2); p.state = 'air'; p.onGround = false; p.vy = 8; pose(6)`); res.kick = await snap('kick'); await pg.screenshot({ path: `${out}/climbfeel_kick.png` });
  res.ev = await run(() => window.__game.evLog.filter((e) => e.type === 'klatrepose').map((e) => e.detail));
  const ok = errs.length === 0 && ['catch', 'hang', 'pull', 'kick'].every((x) => res.ev.includes(x) || res.ev.includes('avspark')) && res.ev.includes('hang') && res.ev.includes('avspark');
  console.log(JSON.stringify({ res, errs, ok })); await b.close(); process.exit(ok ? 0 : 1);
})();
