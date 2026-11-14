// R62: Stuen (nivå 8) i ekte spill (iPhone 14, Playwright): start, fjernkontrollen, plata og skyvedøren, sofaen og bokhylla; skjermbilder til en mappe.
// node tools/live_stue.cjs <utmappe> [port]   (server på porten, f.eks. python3 -m http.server 8362; playwright via NODE_PATH). Ekte FPS/følelse: testes på iPhone.
const { chromium, devices } = require('playwright');
(async () => {
  const out = process.argv[2] || '.', port = process.argv[3] || 8362;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ ...devices['iPhone 14'] });
  const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await pg.addInitScript(() => { try { localStorage.setItem('tlm.cues', 'true'); localStorage.setItem('tlm.introsweep', 'false'); } catch {} });
  await pg.goto(`http://localhost:${port}/?level=stue&start=0`);
  await pg.waitForFunction(() => window.__game && window.__game.LEVEL && window.__game.LEVEL.gateS, null, { timeout: 180000 });
  await pg.evaluate(() => { window.__paused = true; });
  const run = (n) => pg.evaluate((n) => window.__game.tick(n, 1 / 60), n);
  const sh = async (n) => { await run(2); await pg.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await pg.screenshot({ path: `${out}/${n}.png` }); };
  const put = (x, y, z, fx, fz) => pg.evaluate(([x, y, z, fx, fz]) => { const p = window.__game.player; p.x = x; p.y = y; p.z = z; p.vx = p.vz = p.vy = 0; p.onGround = true; p.fx = fx; p.fz = fz; }, [x, y, z, fx, fz]);
  const st = () => pg.evaluate(() => { const g = window.__game, L = g.LEVEL; return { door: L.gateS.doors[0].t, plate: L.gateS.plates[0].on, hint: (document.getElementById('toast') || {}).textContent, y: g.player.y, carry: g.player.carry && g.player.carry.id }; });
  const res = {}; let bad = 0; const ok = (k, c, d) => { res[k] = { ok: !!c, ...d }; if (!c) bad++; };
  await pg.touchscreen.tap(195, 420); await run(40);
  await sh('stue_0_start');
  // fjernkontrollen ligger ved (60..76, 235..243 cm) = (-55..-52, 15..17 enheter): stå vest for den, se østover, TA
  await pg.evaluate(() => { const b = window.__game.LEVEL.movables.find((q) => q.id === 'fjernkontroll'); const p = window.__game.player; p.x = b.min[0] - 0.7; p.z = (b.min[2] + b.max[2]) / 2; p.y = 0; p.vx = p.vz = p.vy = 0; p.fx = 1; p.fz = 0; });
  await run(30); let s = await st(); await sh('stue_1_remote');
  const tap = async (id) => { const r = await pg.locator('#' + id).boundingBox(); await pg.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); };
  await tap('btnCarry'); await run(12); s = await st(); ok('TA tar fjernkontrollen', s.carry === 'fjernkontroll', s); await sh('stue_2_carry');
  // plata p1: x 145..195 cm, z 130..190 cm = (-38..-28, -6..6): stå på plata og slipp
  await put(-33, 0, 0, 1, 0); await run(5); await pg.evaluate(() => { window.__game.touch.carry = true; }); await run(4); await pg.evaluate(() => { window.__game.touch.carry = false; }); await run(100);
  s = await st(); ok('plata ned og døra åpen', s.plate && s.door === 1, s); await sh('stue_3_door_open');
  // sofaen: stå på boktrappa og se mot setet; så toppen av bokhylla
  await put(-9, 0, 0, 0, -1); await run(20); await sh('stue_4_sofa');
  await put(53, 0, 24, 1, 0); await run(20); await sh('stue_5_shelf');
  // oversiktsbilder: kameraet langt unna og ovenfra (bare for å se rommet), og tegnetall
  const view = (yaw, pitch, dist, x, y, z) => pg.evaluate(([yaw, pitch, dist, x, y, z]) => { const g = window.__game; g.cam.yaw = yaw; g.cam.pitch = pitch; g.cam.dist = dist; g.cam.cur = dist; g.cam.target.set(x, y, z); g.player.x = x; g.player.z = z; g.player.y = y; }, [yaw, pitch, dist, x, y, z]);
  await view(0.0, 0.85, 70, -30, 0, 0); await run(30); await sh('stue_6_west');
  await view(0.0, 0.85, 70, 20, 0, 0); await run(30); await sh('stue_7_east');
  await view(-0.5, 0.45, 55, 15, 4, 0); await run(30); await sh('stue_8_sofa_table');
  const ps = await pg.evaluate(() => { const g = window.__game; const p = g.perfStats(); return { calls: p.calls, tris: p.triangles ?? p.tris, programs: g.programCount() }; }); console.log('tegnekall/trekanter:', JSON.stringify(ps));
  console.log(JSON.stringify(res, null, 1)); console.log('feil:', errs);
  await b.close(); process.exit(bad || errs.length ? 1 : 0);
})();
