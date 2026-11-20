// R105: NULLSTILL STED/ALLE i Bygglab (Byggeskole) skal beholde den nye byggeskjermen (før: klassisk skjerm med MODUS). node tools/live_labreset.cjs (playwright via NODE_PATH; serverer med `python3 -m http.server 8765`).
const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ ...devices['iPhone 14'] }), pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message));
  await pg.goto('http://localhost:8765/?level=bygglab'); await pg.waitForFunction(() => window.__game && window.__game.bld, null, { timeout: 90000 });
  await pg.evaluate(() => window.__game.tick(60, 1 / 60));
  const st = () => pg.evaluate(() => ({ mode: window.__game.bld.grid.info().mode, modeBtn: !!document.querySelector('#bld [data-a="mode"]') && getComputedStyle(document.querySelector('#bld [data-a="mode"]')).display !== 'none', more: !!document.querySelector('#bld [data-bx="more"]') && document.querySelector('#bld [data-bx="more"]').getBoundingClientRect().width > 0 }));
  console.log('før', JSON.stringify(await st()));
  await pg.evaluate(() => { window.__game.bld.lab.resetSite('lab1'); window.__game.tick(6, 1 / 60); });
  console.log('etter nullstill sted', JSON.stringify(await st()));
  await pg.evaluate(() => { window.__game.bld.lab.resetAll(); window.__game.tick(6, 1 / 60); });
  console.log('etter nullstill alle', JSON.stringify(await st()), errs.join('|'));
  await b.close();
})();
