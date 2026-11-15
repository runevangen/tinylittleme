// R70: en plassert del kan flyttes etterpå, med EKTE berøringshendelser (CDP Input.dispatchTouchEvent) på iPhone 14.
// Sjekker: flytt etter plassering, flytt med verktøy (TAPE) valgt, trykk med verktøy kobler fortsatt, flytt en tynn planke utzoomet (12 px ved siden av),
// flytt etter zoom og etter stoppet prøve, ANGRE og NULLSTILL. Skjermbilder i utmappa.
// node tools/live_buildmove.cjs <utmappe> [port]   Exit 1 ved feil.
const { chromium, devices } = require('playwright');
(async () => {
  const out = process.argv[2] || '.', port = process.argv[3] || 8421;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ ...devices['iPhone 14'], deviceScaleFactor: +(process.env.DSF || 1) });
  const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await pg.addInitScript(() => { try { localStorage.setItem('tlm.buildall', 'true'); } catch {} });
  await pg.goto(`http://localhost:${port}/?level=kontroll&start=0`);
  await pg.waitForFunction(() => window.__game && window.__game.LEVEL.buildSites, null, { timeout: 30000 });
  const run = (n) => pg.evaluate((n) => window.__game.tick(n, 1 / 60), n);
  const cdp = await ctx.newCDPSession(pg);
  const tp = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
  const tdrag = async (x0, y0, x1, y1) => { await tp('touchStart', x0, y0); for (let i = 1; i <= 8; i++) { await tp('touchMove', x0 + (x1 - x0) * i / 8, y0 + (y1 - y0) * i / 8); await pg.waitForTimeout(30); } await tp('touchEnd'); await pg.waitForTimeout(120); };
  const ttap = async (x, y) => { await tp('touchStart', x, y); await pg.waitForTimeout(40); await tp('touchEnd'); await pg.waitForTimeout(150); };
  let bad = 0; const ok = (k, c, d = '') => { console.log(c ? 'ok  ' : 'FEIL', k, d); if (!c) bad++; };
  const sh = async (n) => { console.log('shot', n); await pg.screenshot({ path: `${out}/${n}.png`, timeout: 60000 }); console.log('shot ok'); };
  const tapSel = async (sel) => { const r = await pg.locator(sel).first().boundingBox(); await ttap(r.x + r.width / 2, r.y + r.height / 2); };
  const st = () => pg.evaluate(() => window.__game.bld.state().builds[0]);
  const parts = async () => (await st()).parts;
  const at = async (id) => (await parts()).find((q) => q.id === id);
  const place = async (id, x, y) => { await pg.locator(`#bld .chip[data-id="${id}"]`).scrollIntoViewIfNeeded(); const c = await pg.locator(`#bld .chip[data-id="${id}"]`).boundingBox(); await tdrag(c.x + c.width / 2, c.y + c.height / 2, x, y); };
  const scr = async (id) => { const { view: v } = await pg.evaluate(() => window.__game.bld.state()); const q = await at(id); const r = await pg.locator('#bld canvas').boundingBox(); return { x: r.x + v.W / 2 + (q.u - v.cu) * v.scale, y: r.y + v.H / 2 + v.oy - (q.v - v.cv) * v.scale }; };
  const nl = async () => (await st()).links;
  const scrA = async (id) => { const p = await scr(id); return [p.x, p.y]; };
  const moves = async (k, id, x0, y0, x1, y1) => { const a = await at(id); await tdrag(x0, y0, x1, y1); const c = await at(id); ok(k, !!a && !!c && (a.u !== c.u || a.v !== c.v), `${JSON.stringify(a)} -> ${JSON.stringify(c)}  [${x0.toFixed(0)},${y0.toFixed(0)}] alle: ${JSON.stringify(await parts())}`); return c; };
  await pg.touchscreen.tap(195, 420); await run(30);
  const s = await pg.evaluate(() => window.__game.LEVEL.buildSites[0]);
  await pg.evaluate((s) => { const p = window.__game.player; p.x = s.x - 4; p.y = s.y; p.z = s.z + 3; p.vx = p.vz = p.vy = 0; p.onGround = true; }, s); await run(10);
  await tapSel('#btnBuild'); await run(2);
  ok('byggeskjermen åpen', await pg.evaluate(() => document.body.classList.contains('building')));
  await place('d3', 195, 355); await place('d4', 230, 355); await place('d2', 130, 250);
  ok('tre deler plassert', (await parts()).length === 3);
  const PART = process.env.PART || '12';   // delkjøring (miljøer uten GPU er trege): PART=1 flytting og verktøy, PART=2 zoom, prøve, angre
  if (PART.includes('1')) {
  await moves('flytt klossen etter plassering', 'd4', ...(await scrA('d4')), 300, 200);
  await moves('flytt planken etter plassering', 'd2', ...(await scrA('d2')), 150, 220);
  // verktøy valgt: dra flytter fortsatt, trykk kobler
  await tapSel('#bld button[data-t="tape"]');
  await moves('flytt med TAPE valgt', 'd4', ...(await scrA('d4')), 232, 355);
  const l0 = await nl(); const pA = await scr('d3'), pB = await scr('d4'), sc = (await pg.evaluate(() => window.__game.bld.state())).view.scale;   // to klosser side om side: trykk like ved skjøten
  await ttap(pA.x + 0.3 * sc, pA.y); await ttap(pB.x - 0.6 * sc, pB.y - 0.5 * sc);
  ok('trykk med TAPE kobler (uten å flytte delen)', (await nl()) === l0 + 1, `koblinger ${l0} -> ${await nl()}`);
  await tapSel('#bld button[data-t="tape"]');
  }
  if (PART.includes('2')) {
  // tynn planke utzoomet: grip 12 px ved siden av
  for (let i = 0; i < 3; i++) await tapSel('#bld .zoom button[data-z="out"]');
  { const v = (await pg.evaluate(() => window.__game.bld.state())).view, p2 = await scr('d2'); const a = await at('d2');
    await tdrag(p2.x, p2.y + 12, p2.x + 40, p2.y + 12); const c = await at('d2');
    ok(`grip tynn planke 12 px ved siden av (${v.scale.toFixed(1)} px/enhet)`, a.u !== c.u || a.v !== c.v, JSON.stringify(a) + ' -> ' + JSON.stringify(c)); }
  await tapSel('#bld .zoom button[data-z="fit"]');
  await moves('flytt etter zoom (tilpass)', 'd2', ...(await scrA('d2')), 190, 230);
  // zoom inn og dra rundt
  for (let i = 0; i < 2; i++) await tapSel('#bld .zoom button[data-z="in"]');
  { const v = (await pg.evaluate(() => window.__game.bld.state())).view; await moves(`flytt innzoomet (${v.scale.toFixed(0)} px/enhet)`, 'd2', ...(await scrA('d2')), 195, 300); }
  await tapSel('#bld .zoom button[data-z="fit"]');
  // etter PRØV og stopp
  await tapSel('#bld button[data-a="try"]'); await pg.waitForTimeout(1200); await tapSel('#bld button[data-a="try"]'); await pg.waitForTimeout(300);
  ok('prøven er stoppet', !(await pg.evaluate(() => window.__game.bld.running)));
  await moves('flytt etter stoppet prøve', 'd2', ...(await scrA('d2')), 150, 230);
  await sh('final_etter_prove');
  // ANGRE og NULLSTILL
  const before = await at('d2'); await tapSel('#bld button[data-a="undo"]');
  const afterU = await at('d2'); ok('ANGRE virker etter flytting', JSON.stringify(before) !== JSON.stringify(afterU), JSON.stringify(afterU));
  await tapSel('#bld button[data-a="reset"]'); ok('NULLSTILL virker', (await parts()).length === 0);
  }
  ok('ingen konsollfeil', errs.length === 0, errs.slice(0, 3).join(' | '));
  await b.close(); process.exit(bad ? 1 : 0);
})();
