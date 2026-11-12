// R44: zoom i byggeskjermen på mobil (iPhone 14, Playwright): +, −, ⤢, dobbelttrykk, del i hånden mens det zoomes; knappene dekker ikke brettet.
// node tools/live_buildzoom.cjs <utmappe> [port]. Exit 1 ved feil.
const { chromium, devices } = require('playwright');
(async () => {
  const out = process.argv[2] || '.', port = process.argv[3] || 8444;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ ...devices['iPhone 14'] });
  const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await pg.addInitScript(() => { try { localStorage.setItem('tlm.buildall', 'true'); } catch {} });
  await pg.goto(`http://localhost:${port}/?level=kontroll&start=0`);
  await pg.waitForFunction(() => window.__game && window.__game.LEVEL.buildSites, null, { timeout: 60000 });
  const run = (n) => pg.evaluate((n) => window.__game.tick(n, 1 / 60), n);
  const sh = async (n) => { await pg.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await pg.screenshot({ path: `${out}/${n}.png` }); };
  let bad = 0; const ok = (k, c, d = '') => { console.log(c ? 'ok  ' : 'FEIL', k, d); if (!c) bad++; };
  const box = async (sel) => pg.locator(sel).first().boundingBox();
  const tapEl = async (sel) => { const r = await box(sel); await pg.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); };
  const scale = () => pg.evaluate(() => { const a = window.__game.bld.screenPos(0, 0), c = window.__game.bld.screenPos(1, 0); return c.x - a.x; });
  const logs = () => pg.evaluate(() => (window.__game.events || []).length);
  const s = (await pg.evaluate(() => window.__game.LEVEL.buildSites.map((q) => ({ id: q.id, x: q.x, y: q.y, z: q.z }))))[0];
  await pg.evaluate((s) => { const p = window.__game.player; p.x = s.x - 4; p.y = s.y; p.z = s.z + 3; p.vx = p.vz = p.vy = 0; p.onGround = true; }, s);
  await pg.touchscreen.tap(195, 420); await run(30); await run(10);
  await tapEl('#btnBuild'); await run(2);
  ok('byggeskjermen åpen', await pg.evaluate(() => document.body.classList.contains('building')));
  const s0 = await scale(); await sh('z0_fit');
  // knappene dekker ikke brettet ved tilpasset visning, og ikke de andre knappene
  const zb = await pg.evaluate(() => [...document.querySelectorAll('#bld .zoom button')].map((e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, z: e.dataset.z }; }));
  const sites = await pg.evaluate(() => { const B = window.__game.bld; const a = B.screenPos(-5.5, 8), c = B.screenPos(5.5, 0); return { l: a.x, t: a.y, r: c.x, b: c.y }; });
  ok('tre zoom-knapper', zb.length === 3, zb.map((q) => q.z).join(','));
  const others = await pg.evaluate(() => [...document.querySelectorAll('#bld .bt button, #bld .tray')].map((e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }));
  const hit = (a, c) => a.x < c.x + c.w && c.x < a.x + a.w && a.y < c.y + c.h && c.y < a.y + a.h;
  ok('zoom-knappene overlapper ikke ANGRE/NULLSTILL/PRØV/TILBAKE eller bunnrad', !zb.some((a) => others.some((o) => hit(a, o))));
  ok('zoom-knappene innenfor skjermen (390 bred)', zb.every((a) => a.x >= 0 && a.x + a.w <= 390 && a.w >= 40 && a.h >= 34), JSON.stringify(zb.map((a) => [a.x, a.y, a.w, a.h])));
  ok('knappene dekker ikke byggeplassen (tilpasset)', zb.every((a) => !hit(a, { x: sites.l, y: sites.t, w: sites.r - sites.l, h: sites.b - sites.t })), JSON.stringify(sites));
  await tapEl('#bld .zoom [data-z="in"]'); await run(2); const s1 = await scale(); ok('+ zoomer inn', s1 > s0 * 1.4, `${s0.toFixed(1)} -> ${s1.toFixed(1)}`); await sh('z1_plus');
  await tapEl('#bld .zoom [data-z="in"]'); await tapEl('#bld .zoom [data-z="in"]'); await run(2); const s2 = await scale(); ok('flere + øker mer', s2 > s1 * 2, s2.toFixed(1)); await sh('z2_plusplus');
  await tapEl('#bld .zoom [data-z="out"]'); await run(2); const s3 = await scale(); ok('− zoomer ut', s3 < s2 * 0.8, s3.toFixed(1));
  await tapEl('#bld .zoom [data-z="fit"]'); await run(2); const s4 = await scale(); ok('⤢ tilbake til hele byggeplassen', Math.abs(s4 - s0) < 0.5, s4.toFixed(1));
  for (let i = 0; i < 14; i++) await tapEl('#bld .zoom [data-z="in"]'); await run(2); const smax = await scale(); ok('maks-zoom over gammel grense (80 px/enhet)', smax > 80 && smax <= 240.5, smax.toFixed(1)); await sh('z3_maks');
  await tapEl('#bld .zoom [data-z="fit"]'); await run(2);
  // dobbelttrykk (to raske trykk på tomt sted) zoomer inn, og igjen tilbake
  const dtap = (x, y) => pg.evaluate(([x, y]) => { const c = document.querySelector('#bld canvas'); for (let i = 0; i < 2; i++) for (const t of ['pointerdown', 'pointerup']) { (t === 'pointerdown' ? c : window).dispatchEvent(new PointerEvent(t, { bubbles: true, cancelable: true, pointerId: 31, clientX: x, clientY: y, pointerType: 'touch' })); } }, [x, y]);   // to raske trykk (swiftshader er for treg til ekte tidsavstand via touchscreen.tap)
  await dtap(300, 330); await run(2); const d1 = await scale(); ok('dobbelttrykk zoomer inn', d1 > s0 * 2, d1.toFixed(1)); await sh('z4_dbl');
  await dtap(250, 350); await run(2); const d2 = await scale(); ok('dobbelttrykk igjen: tilbake til hele byggeplassen', Math.abs(d2 - s0) < 0.5, d2.toFixed(1));
  // del i hånden mens + trykkes (andre finger på knappen)
  const chip = pg.locator('#bld .chip').first(); await chip.scrollIntoViewIfNeeded(); const cr = await chip.boundingBox();
  await pg.mouse.move(cr.x + cr.width / 2, cr.y + cr.height / 2); await pg.mouse.down(); await pg.mouse.move(200, 400, { steps: 5 });
  await pg.evaluate(() => { const e = document.querySelector('#bld .zoom [data-z="in"]'); const r = e.getBoundingClientRect(); e.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 77, clientX: r.x + 5, clientY: r.y + 5, pointerType: 'touch' })); });
  await run(2); const h1 = await scale(); ok('+ virker mens en del holdes', h1 > s0 * 1.4, h1.toFixed(1)); await sh('z5_holder');
  await pg.mouse.move(210, 420, { steps: 3 }); await pg.mouse.up(); await run(2);
  const st = await pg.evaluate(() => window.__game.bld.state()); ok('delen ble plassert etter zoom', st.builds.some((q) => q.placed > 0), JSON.stringify(st.builds));
  await sh('z6_plassert');
  const rep = await pg.evaluate(() => JSON.stringify((window.__game.eventLog || window.__game.events || []).slice(-30)));
  ok('ingen konsollfeil', errs.length === 0, errs.slice(0, 3).join(' | '));
  await b.close(); process.exit(bad ? 1 : 0);
})();
