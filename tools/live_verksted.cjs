// R63: ekte spillflyt for Verkstedet (iPhone 14, Playwright, swiftshader uten GPU): start, oljeflekk (glatt) og glir, verktøykassa, benken med gåtekammeret, porten, målskjerm og avslutning.
// node tools/live_verksted.cjs <utmappe> [port]   Exit 1 hvis noe i flyten ikke virker eller det kommer konsollfeil. Ekte FPS og følelsen av å gli: testes på iPhone.
const { chromium, devices } = require('playwright');
(async () => {
  const out = process.argv[2] || '.', port = process.argv[3] || 8319;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ ...devices['iPhone 14'] }); const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await pg.addInitScript(() => { try { localStorage.setItem('tlm.introsweep', 'false'); localStorage.setItem('tlm.cues', 'true'); localStorage.setItem('tlm.storySeen.verksted', 'true'); } catch {} });
  await pg.goto(`http://localhost:${port}/?level=verksted&start=0`);
  await pg.waitForFunction(() => window.__game && window.__game.player, null, { timeout: 40000 });
  await pg.evaluate(() => { window.__paused = true; });
  const run = (n) => pg.evaluate((n) => window.__game.tick(n, 1 / 60), n);
  const put = (x, y, z, fx = 1, fz = 0) => pg.evaluate(([x, y, z, fx, fz]) => { const g = window.__game, p = g.player; p.x = x; p.y = y; p.z = z; p.vx = p.vy = p.vz = 0; p.state = 'ground'; p.onGround = true; p.fx = fx; p.fz = fz; g.touch.x = 0; g.touch.y = 0; }, [x, y, z, fx, fz]);
  const ux = (x) => x / 5 - 70, uz = (z) => z / 5 - 26, res = {};
  await pg.touchscreen.tap(195, 420); await run(30);
  await pg.screenshot({ path: `${out}/verksted_start.png` });
  // oljeflekken: løp inn og slipp stikka: figuren sklir
  await put(ux(60), 0, uz(120)); await pg.evaluate(() => { window.__game.touch.x = 1; window.__game.touch.y = 0; }); await run(50); await pg.screenshot({ path: `${out}/verksted_olje_inn.png` });
  await pg.evaluate(() => { window.__game.touch.x = 0; }); const a = await pg.evaluate(() => window.__game.player.x); await run(40); const bx = await pg.evaluate(() => ({ x: window.__game.player.x, slick: !!window.__game.player.groundBox?.slick }));
  res.slide = { before: +a.toFixed(2), after: +bx.x.toFixed(2), onSlick: bx.slick }; await pg.screenshot({ path: `${out}/verksted_olje_gli.png` });
  // verktøykassa med glatt lokk og fillen
  await put(ux(300), 3.8, uz(130)); await run(10); await pg.screenshot({ path: `${out}/verksted_kasse_fille.png` });
  // benken: gåtekammeret med platene og mutrene
  await put(ux(360), 11.2, uz(100), 1, 0); await run(10); await pg.screenshot({ path: `${out}/verksted_kammer.png` });
  // løs gåten: legg tre mutre på den tunge og to på den lette, og se porten åpne seg
  await pg.evaluate(() => { const g = window.__game, L = g.LEVEL, pv = L.gateS.plates.find((q) => q.id === 'pv'), ph = L.gateS.plates.find((q) => q.id === 'ph'), nuts = L.bodies.filter((b) => b.kind === 'nut');
    const place = (b, pl, k) => { const w = b.max[0] - b.min[0], d = b.max[2] - b.min[2], cx = (pl.x0 + pl.x1) / 2 + (k - 1) * 1.7, cz = (pl.z0 + pl.z1) / 2; b.min[0] = cx - w / 2; b.max[0] = cx + w / 2; b.min[2] = cz - d / 2; b.max[2] = cz + d / 2; b.vx = b.vz = 0; };
    nuts.slice(0, 3).forEach((b, k) => place(b, pv, k)); nuts.slice(3).forEach((b, k) => place(b, ph, k)); });
  await run(150); res.gate = await pg.evaluate(() => ({ open: window.__game.LEVEL.gateS.doors[0].t, plates: window.__game.LEVEL.gateS.plates.map((q) => [q.id, q.load, q.on]) })); await pg.screenshot({ path: `${out}/verksted_port_open.png` });
  // verktøyveggen og hylla
  await put(ux(660), 11.2, uz(110), 0, -1); await run(10); await pg.screenshot({ path: `${out}/verksted_vegg.png` });
  // målskjerm: stå ved målet. Nivå 9 er siste nivå: «alle nivåene klart» og avslutningen
  await pg.evaluate(() => { const g = window.__game; g.LEVEL.goalList?.forEach((q) => { q.done = true; }); });
  await put(ux(542), 122 / 5, uz(30)); await run(40);
  res.win = await pg.evaluate(() => ({ title: document.getElementById('winTitle')?.textContent, next: document.getElementById('nextLevel')?.textContent, shown: !document.getElementById('win')?.classList.contains('hide') }));
  await pg.screenshot({ path: `${out}/verksted_mal.png` });
  const log = await pg.evaluate(() => (window.__game.evLog || []).filter((e) => /glatt|gåte|MÅL/.test(JSON.stringify(e))).slice(-10));
  const ok = res.slide.onSlick && res.slide.after - res.slide.before > 1 && res.gate.open > 0.99 && res.win.shown && /Alle nivåene/.test(res.win.title || '') && /AVSLUTNINGEN/i.test(res.win.next || '') && errs.length === 0;
  console.log(JSON.stringify({ res, log, errs, ok })); await b.close(); process.exit(ok ? 0 : 1);
})();
