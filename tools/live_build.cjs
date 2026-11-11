// R25: byggeskjermen på mobil (iPhone 14, Playwright): åpner begge byggestedene i Kontroll-brettet (bro og trapp), drar deler fra brettet
// med berøring, trykker PRØV og sjekker at broa bærer og trappa gir vei opp. Skjermbilder i utmappa.
// node tools/live_build.cjs <utmappe> [port]   (server på porten; playwright via NODE_PATH). Exit 1 ved feil.
const { chromium, devices } = require('playwright');
(async () => {
  const out = process.argv[2] || '.', port = process.argv[3] || 8421;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ ...devices['iPhone 14'] });
  const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await pg.addInitScript(() => { try { localStorage.setItem('tlm.buildall', 'true'); } catch {} });
  await pg.goto(`http://localhost:${port}/?level=kontroll&start=0`);
  await pg.waitForFunction(() => window.__game && window.__game.LEVEL.buildSites, null, { timeout: 30000 });
  const run = (n) => pg.evaluate((n) => window.__game.tick(n, 1 / 60), n);
  const sh = async (n) => { await pg.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await pg.screenshot({ path: `${out}/${n}.png` }); };
  let bad = 0; const ok = (k, c, d = '') => { console.log(c ? 'ok  ' : 'FEIL', k, d); if (!c) bad++; };
  const tapEl = async (sel) => { const r = await pg.locator(sel).first().boundingBox(); await pg.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); };
  const put = (x, y, z) => pg.evaluate(([x, y, z]) => { const p = window.__game.player; p.x = x; p.y = y; p.z = z; p.vx = p.vz = p.vy = 0; p.onGround = true; }, [x, y, z]);
  await pg.touchscreen.tap(195, 420); await run(30);
  // drar en kloss/planke fra brettet til (fx, fy) i brøkdeler av skjermen, med pekerhendelser (som en finger)
  // (u, v) i byggestedets enheter -> skjerm: stedet er sentrert, 1 enhet = 1/16 av bredden (iPhone 14: 390 px)
  const drag = async (id, u, v) => {
    const fx = 0.5 + u * (73.3 / 1170), fy = (1243 - 73.3 * v) / 1992;
    await pg.locator(`#bld .chip[data-id="${id}"]`).scrollIntoViewIfNeeded();   // brettet ruller sideveis
    const r = await pg.locator(`#bld .chip[data-id="${id}"]`).boundingBox(), vw = pg.viewportSize();
    await pg.mouse.move(r.x + r.width / 2, r.y + r.height / 2); await pg.mouse.down(); await pg.mouse.move(vw.width * fx, vw.height * fy, { steps: 8 }); await pg.mouse.up();
  };
  const sites = await pg.evaluate(() => window.__game.LEVEL.buildSites.map((s) => ({ id: s.id, x: s.x, y: s.y, z: s.z })));
  ok('to byggesteder', sites.length >= 2, sites.map((s) => s.id).join(','));
  for (const s of sites) {
    await put(s.x - 4, s.y, s.z + 3); await run(10);
    const btn = await pg.locator('#btnBuild').isVisible(); ok(`${s.id}: BYGG-knappen vises`, btn);
    if (!btn) continue;
    await sh(`${s.id}_0_spill`); await tapEl('#btnBuild'); await run(2);
    ok(`${s.id}: byggeskjermen åpen`, await pg.evaluate(() => document.body.classList.contains('building')));
    await sh(`${s.id}_1_bygg`);
    const ids = await pg.evaluate(() => [...document.querySelectorAll('#bld .chip')].map((c) => c.dataset.id));
    ok(`${s.id}: deler i brettet`, ids.length >= 2, ids.join(','));
    if (s.id === 'bro1') await drag('d2', 0, 0);                       // lang planke over hullet
    else { await drag('d3', 0.5, 0.75); await drag('d4', 2.5, 0.75); await drag('d6', 2.5, 2.25); }   // tre klosser som trapp
    await sh(`${s.id}_2_plassert`);
    const st = await pg.evaluate(() => window.__game.bld.state()); ok(`${s.id}: deler plassert`, st.builds.some((q) => q.id === s.id && q.placed > 0), JSON.stringify(st.builds));
    await tapEl('#bld button[data-a="try"]'); for (let i = 0; i < 40; i++) { await pg.waitForTimeout(250); if (i % 4 === 0) await sh(`${s.id}_3_prov${i}`); if (!(await pg.evaluate(() => window.__game.bld.running))) break; }
    const rs = await pg.evaluate(() => window.__game.bld.result); ok(`${s.id}: PRØV gir et lesbart utfall`, !!rs && /won|lost/.test(rs.state), JSON.stringify(rs));
    await tapEl('#bld button[data-a="back"]'); await tapEl('#bld button[data-a="back"]').catch(() => {});
    await sh(`${s.id}_4_ferdig`); await pg.evaluate(() => window.__game.bld.close && window.__game.bld.close('test'));
  }
  ok('ingen konsollfeil', errs.length === 0, errs.slice(0, 3).join(' | '));
  await b.close(); process.exit(bad ? 1 : 0);
})();
