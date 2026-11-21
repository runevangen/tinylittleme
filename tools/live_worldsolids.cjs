// R116: kollisjonsboksene til bygde deler følger det som tegnes (ingen usynlig vegg). node tools/live_worldsolids.cjs  (playwright via NODE_PATH; server: python3 -m http.server 8765)
const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ ...devices['iPhone 14'] }), pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await pg.addInitScript(() => { try { localStorage.setItem('tlm.skole', JSON.stringify({ opened: true, card: 'skipped', done: false })); } catch (e) {} });
  await pg.goto('http://localhost:8765/?level=bygglab'); await pg.waitForFunction(() => window.__game && window.__game.bld, null, { timeout: 90000 });
  const r = await pg.evaluate(async () => {
    const G = window.__game, B = G.bld, BL = await import('/build_logic.js'); G.tick(60, 1 / 60); B.stage.markPassed('lab1'); B.stage.markPassed('lab2');
    B.lab.go(1); G.tick(6, 1 / 60); B.lab.go(1); G.tick(10, 1 / 60); B.placeRef('lab3');
    const parts = [['lab_plank_l_1', 0, 2.2, 0.5236], ['lab_plank_s_1', -6, 3, -0.7], ['lab_block_1', 5, 1, 0.4], ['lab_plank_t_1', 6.5, 4, 1.2]];   // rotert og skrå
    const body = BL.toB64(JSON.stringify([1, 'lab3', parts.map((p) => [p[0], Math.round(p[1] * 1000), Math.round(p[2] * 1000), Math.round(p[3] * 10000)]), []]));
    const ok = B.importText(`TLM1.${body}.${BL.fnv(body)}`); G.tick(3, 1 / 60);
    const n = B.world.commit('lab3'); G.tick(3, 1 / 60); const info = B.world.info('lab3'); const a = info.boxes; const out = { ok, n, boxes: a.length, meshes: info.meshes.length, bad: [] };
    // hver boks må ligge innenfor minst én tegnet dels omskrevne boks (± 0,05) og en boks uten mesh er en feil
    for (const q of a) { const fits = info.meshes.some((m) => q.min[0] >= m.min[0] - 0.05 && q.max[0] <= m.max[0] + 0.05 && q.min[1] >= m.min[1] - 0.05 && q.max[1] <= m.max[1] + 0.05 && q.min[2] >= m.min[2] - 0.05 && q.max[2] <= m.max[2] + 0.05); if (!fits) out.bad.push(q.id); }
    B.world.uncommit('lab3'); out.after = B.world.info('lab3').boxes.length; return out;
  });
  console.log(JSON.stringify(r), 'feil', errs.join('|').slice(0, 300));
  process.exitCode = r.ok && r.boxes > 0 && !r.bad.length && r.after === 0 && !errs.length ? 0 : 1; await b.close();
})();
