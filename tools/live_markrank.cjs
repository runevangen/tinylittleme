// R66: ekte nettleser (iPhone 14, Playwright): markørbudsjett. Før (tlm.markrank=false) og etter, på Normal og Mye, i Nivå 4 (bad2: sju grep-flater samlet rundt vaskekurven). Ingen GPU: ingen FPS-krav (testes på iPhone).
// node tools/live_markrank.cjs <utmappe> [port]   Exit 1 ved feil.
const { chromium, devices } = require('playwright');
(async () => {
  const out = process.argv[2] || '.', port = process.argv[3] || 8366, res = {}, errs = [];
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  for (const mode of ['before', 'normal', 'much', 'none']) {
    const ctx = await b.newContext({ ...devices['iPhone 14'] }); ctx.setDefaultTimeout(150000); const pg = await ctx.newPage();
    pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await pg.addInitScript((m) => { try { localStorage.setItem('tlm.introsweep', 'false'); localStorage.setItem('tlm.markrank', m === 'before' ? 'false' : 'true'); localStorage.setItem('tlm.helplevel', JSON.stringify(m === 'before' ? 'normal' : m)); } catch {} }, mode);
    await pg.goto(`http://localhost:${port}/?level=bad2&start=0`);
    await pg.waitForFunction(() => window.__game && window.__game.LEVEL, null, { timeout: 120000 });
    await pg.touchscreen.tap(195, 420);
    await pg.evaluate(() => { const g = window.__game, p = g.player; p.x = 5; p.y = 12; p.z = 10; p.fx = 1; p.fz = 0; p.vx = p.vy = p.vz = 0; p.onGround = true; p.state = 'ground'; g.cam.yaw = -Math.PI / 2; });
    await pg.waitForTimeout(6000);
    res[mode] = await pg.evaluate(() => { const g = window.__game, d = g.mv.debug(), pl = g.markPlan(); return { gripsShown: d.gripsShown, picked: (pl.order || []), budget: pl.budget, goalDir: g.markers.goalDir(), wmark: g.mv.edge.style.display, guideEdge: document.getElementById('guideEdge')?.style.display, compArrow: document.getElementById('compArrow')?.style.visibility, stats: g.perfStats() }; });
    await pg.screenshot({ path: `${out}/markrank_${mode}.png`, timeout: 150000 });
    await ctx.close();
  }
  await b.close();
  console.log(JSON.stringify(res, null, 1)); if (errs.length) { console.log('KONSOLLFEIL', errs); process.exit(1); }
  const bad = [];
  if (!(res.before.gripsShown >= 3 && res.before.gripsShown > res.normal.gripsShown)) bad.push('før: forventet mange grep-markører, fikk ' + res.before.gripsShown);
  if (!(res.normal.gripsShown <= 2 && res.normal.gripsShown >= 1)) bad.push('Normal: 1-2 grep synlige');
  if (!(res.normal.picked.length <= 3)) bad.push('Normal: høyst 3 markører');
  if (!(res.much.picked.length <= 6)) bad.push('Mye: høyst 6');
  if (res.none.gripsShown !== 0 || res.none.picked.length !== 0) bad.push('Ingen: ingen verdensmarkører');
  if (bad.length) { console.log('FEIL', bad); process.exit(1); } console.log('live markrank: ok');
})();
