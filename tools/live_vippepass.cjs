// R115: bestått Vippe (klassisk modus) skal åpne Fagverk (lab4). node tools/live_vippepass.cjs  (playwright via NODE_PATH; server: python3 -m http.server 8765)
const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ ...devices['iPhone 14'] }), pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message));
  await pg.addInitScript(() => { try { localStorage.setItem('tlm.skole', JSON.stringify({ opened: true, card: 'skipped', done: false })); } catch (e) {} });
  await pg.goto('http://localhost:8765/?level=bygglab'); await pg.waitForFunction(() => window.__game && window.__game.bld, null, { timeout: 90000 });
  const r = await pg.evaluate(async () => {
    const B = window.__game.bld; window.__game.tick(60, 1 / 60);
    // gå til sted 3 (Vippe) uten å ha bestått Bro: åpne det direkte
    B.stage.markPassed('lab1'); B.stage.markPassed('lab2');
    B.lab.go(1); window.__game.tick(6, 1 / 60); B.lab.go(1); window.__game.tick(10, 1 / 60);
    const site = B.siteId, ref = B.placeRef('lab3'); window.__game.tick(6, 1 / 60);
    const before = B.stage.locked('lab4');
    window.__game.bld.act && 0;
    return { site, ref, before };
  });
  console.log('før', JSON.stringify(r));
  // trykk PRØV
  console.log('startTry', await pg.evaluate(() => { const r = window.__game.bld.startTry(); window.__game.tick(5, 1 / 60); return [r, document.querySelector('#bld').className]; }));
  for (let i = 0; i < 40; i++) { await pg.evaluate(() => { for (let k = 0; k < 30; k++) window.__game.bld.update(1 / 60); }); const done = await pg.evaluate(() => window.__game.bld.stage.passed.includes('lab3')); if (done) break; }
  const after = await pg.evaluate(() => ({ passed: window.__game.bld.stage.passed, lockedLab4: window.__game.bld.stage.locked('lab4') }));
  console.log('debug', await pg.evaluate(() => { const B = window.__game.bld, rec = B.record('lab3'); return JSON.stringify({ rec: !!rec, res: rec && rec.meta ? rec.meta.result || rec.meta : null }).slice(0, 300); }));
  console.log('etter', JSON.stringify(after), 'feil', errs.join('|').slice(0, 200));
  process.exitCode = after.passed.includes('lab3') && !after.lockedLab4 ? 0 : 1; await b.close();
})();
