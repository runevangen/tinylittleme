// R50: deling, replay og spøkelse på mobil (iPhone 14, Playwright). Leke-brettet: legger ut planken, PRØV, SE IGJEN, KODE, LIM INN, og sjekker at det ikke er konsollfeil. Skjermbilder i utmappa.
// node tools/live_buildshare.cjs <utmappe> [port]   (server på porten; playwright via NODE_PATH). Exit 1 ved feil.
const { chromium, devices } = require('playwright');
(async () => {
  const out = process.argv[2] || '.', port = process.argv[3] || 8450;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  let bad = 0; const ok = (k, c, d = '') => { console.log(c ? 'ok  ' : 'FEIL', k, d); if (!c) bad++; };
  const ctx = await b.newContext({ ...devices['iPhone 14'] }), pg = await ctx.newPage(), errs = [];
  pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await pg.addInitScript(() => { try { localStorage.setItem('tlm.buildall', 'true'); localStorage.setItem('tlm.story', 'false'); localStorage.setItem('tlm.introsweep', 'false'); localStorage.setItem('tlm.buildloads', 'false'); localStorage.setItem('tlm.tcode', JSON.stringify('tlm-teststed')); } catch {} });
  await pg.route('**/rest/v1/rpc/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(r.request().url().includes('best') ? { ok: true, bridges: [] } : { ok: true, rank: 1, cost: 2, parts: 1 }) }));
  await pg.goto(`http://localhost:${port}/?level=leke&start=0`);
  await pg.waitForFunction(() => window.__game && window.__game.LEVEL.buildSites, null, { timeout: 30000 });
  const run = (n) => pg.evaluate((n) => window.__game.tick(n, 1 / 60), n);
  const stepB = (n) => pg.evaluate((n) => { for (let i = 0; i < n; i++) window.__game.bld.update(1 / 60, true); }, n);   // bare byggemodus (uten tegning av verden: ~1 fps uten GPU)
  const sh = async (n) => { await pg.screenshot({ path: `${out}/share_${n}.png` }); };
  const tapEl = async (sel) => { const r = await pg.locator(sel).first().boundingBox(); await pg.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); };
  await pg.touchscreen.tap(195, 420); await run(30);
  await pg.evaluate(() => { const q = window.__game.LEVEL.buildSites[0], p = window.__game.player; p.x = q.x - 8; p.y = q.y; p.z = q.z + 3; p.vx = p.vz = p.vy = 0; p.onGround = true; });
  await run(10); await pg.evaluate(() => window.__game.bld.open()); await run(2);
  const ids = await pg.evaluate(() => [...document.querySelectorAll('#bld .chip')].map((c) => c.dataset.id)); const chip = ids.find((i) => /^p1$/.test(i)) || ids[0];
  await pg.locator(`#bld .chip[data-id="${chip}"]`).scrollIntoViewIfNeeded();
  const r = await pg.locator(`#bld .chip[data-id="${chip}"]`).boundingBox(), p0 = await pg.evaluate(() => window.__game.bld.screenPos(0, 0.25));
  await pg.mouse.move(r.x + r.width / 2, r.y + r.height / 2); await pg.mouse.down(); await pg.mouse.move(p0.x, p0.y, { steps: 8 }); await pg.mouse.up();
  await sh('1_bygg');
  const vis = (s) => pg.evaluate((s) => { const e = document.querySelector(`#bld [data-s="${s}"]`); return !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 0; }, s);
  ok('KODE, LIM INN og BESTE vises (tester-kode satt), SE IGJEN ikke før en prøve', (await vis('copy')) && (await vis('paste')) && (await vis('best')) && !(await vis('replay')));
  const rows = await pg.evaluate(() => [...document.querySelectorAll('#bld .share button')].filter((e) => getComputedStyle(e).display !== 'none').map((e) => { const r = e.getBoundingClientRect(); return { t: e.textContent, x: r.x, w: r.width, h: r.height, b: r.bottom }; }));
  ok('knappene er store nok og innenfor skjermen', rows.every((x) => x.h >= 36 && x.w >= 60 && x.x >= 0 && x.x + x.w <= 390), JSON.stringify(rows));
  const tray = await pg.locator('#bld .tray').boundingBox(); ok('delingsraden ligger over delene', rows.every((x) => x.b <= tray.y + 1));
  await tapEl('#bld button[data-a="try"]');
  for (let i = 0; i < 80; i++) { await stepB(60); if (i === 3) await sh('2_underveis'); if (!(await pg.evaluate(() => window.__game.bld.running))) break; }
  const rs = await pg.evaluate(() => window.__game.bld.result); ok('prøven ga et utfall', !!rs && /won|lost/.test(rs.state), JSON.stringify(rs));
  ok('SE IGJEN vises etter prøven, de andre er skjult', (await vis('replay')) && !(await vis('copy'))); await sh('3_ferdig');
  await tapEl('#bld [data-s="replay"]'); await stepB(10);
  ok('replay går', await pg.evaluate(() => window.__game.bld.replaying)); await sh('4_replay');
  for (let i = 0; i < 120 && (await pg.evaluate(() => window.__game.bld.running)); i++) await stepB(60);
  const rs2 = await pg.evaluate(() => window.__game.bld.result); ok('replayet ender som originalen', rs2 && rs2.state === rs.state, JSON.stringify(rs2));
  await tapEl('#bld button[data-a="try"]');   // STOPP
  await tapEl('#bld [data-s="paste"]'); await pg.waitForTimeout(200); ok('LIM INN åpner feltet', await pg.evaluate(() => document.querySelector('#bld .modal').classList.contains('open'))); await sh('5_lim_inn');
  await pg.fill('#bld .modal textarea', 'ikke en kode'); await tapEl('#bld .modal [data-m="use"]'); await pg.waitForTimeout(200);
  ok('ugyldig kode avvises og feltet står åpent', await pg.evaluate(() => document.querySelector('#bld .modal').classList.contains('open')));
  const code = await pg.evaluate(() => window.__game.bld.exportText()); ok('koden finnes', /^TLM1\./.test(code), String(code).length + ' tegn');
  await pg.fill('#bld .modal textarea', code); await tapEl('#bld .modal [data-m="use"]'); await pg.waitForTimeout(200);
  ok('gyldig kode lukker feltet', !(await pg.evaluate(() => document.querySelector('#bld .modal').classList.contains('open'))));
  await tapEl('#bld [data-s="best"]'); await pg.waitForTimeout(500); ok('BESTE åpner lista (tom, falsk svar)', await pg.evaluate(() => document.querySelector('#bld .modal').classList.contains('open') && /ennå|Ingen/.test(document.querySelector('#bld .modal .list').textContent)), await pg.evaluate(() => document.querySelector('#bld .modal .list').textContent)); await sh('6_beste');
  await tapEl('#bld .modal [data-m="close"]'); await sh('7_tilbake');
  ok('ingen konsollfeil', errs.length === 0, errs.slice(0, 3).join(' | '));
  await ctx.close(); await b.close(); process.exit(bad ? 1 : 0);
})();
