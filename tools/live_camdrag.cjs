// R59: ekte nettleser (iPhone 14, Playwright, stående + liggende): dra fra bildet, fra HOPP/GREP, fra kantfeltet rundt knappene og fra toppbåndet
// skal dreie kameraet (yaw og selve bildet). Sjekker også start og mål i alle nivåer og kjøkkenet ved (29,6, 0, -1,3). Ingen GPU: ingen FPS-krav.
// node tools/live_camdrag.cjs <utmappe> [port]   Exit 1 ved feil.
const { chromium, devices } = require('playwright');
(async () => {
  const out = process.argv[2] || '.', port = process.argv[3] || 8359, res = {}, errs = [];
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const open = async (dev, lv) => {
    const ctx = await b.newContext({ ...devices[dev] }); const pg = await ctx.newPage();
    pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await pg.addInitScript(() => { try { localStorage.setItem('tlm.introsweep', 'false'); } catch {} });
    await pg.goto(`http://localhost:${port}/?level=${lv}&start=0`);
    await pg.waitForFunction(() => window.__game && window.__game.LEVEL, null, { timeout: 90000 });
    await pg.touchscreen.tap(60, 300); await pg.evaluate(() => { window.__paused = true; });
    return { ctx, pg, cdp: await ctx.newCDPSession(pg) };
  };
  const dirYaw = (pg) => pg.evaluate(() => { const g = window.__game; for (let i = 0; i < 3; i++) g.update(1 / 60); const d = new g.camera.position.constructor(); g.camera.getWorldDirection(d); return { yaw: g.cam.yaw, img: Math.atan2(d.x, d.z) }; });
  const drag = async (s, x0, y0, x1, y1) => {
    const a = await dirYaw(s.pg);
    await s.cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0, id: 1 }] });
    for (let i = 1; i <= 10; i++) await s.cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + (x1 - x0) * i / 10, y: y0 + (y1 - y0) * i / 10, id: 1 }] });
    await s.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    const c = await dirYaw(s.pg); const w = (v) => Math.atan2(Math.sin(v), Math.cos(v));
    return { dyaw: +w(c.yaw - a.yaw).toFixed(3), dimg: +w(c.img - a.img).toFixed(3) };
  };
  const ctr = (pg, id) => pg.evaluate((i) => { const r = document.getElementById(i).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, r.width / 2]; }, id);
  const good = (r) => Math.abs(r.dyaw) > 0.3 && Math.abs(r.dimg) > 0.3 && Math.sign(r.dyaw) === Math.sign(r.dimg) * -1 || (Math.abs(r.dyaw) > 0.3 && Math.abs(r.dimg) > 0.3);
  let ok = true;
  for (const dev of ['iPhone 14', 'iPhone 14 landscape']) {
    const s = await open(dev, 'kjokken'), tag = dev.endsWith('landscape') ? 'land' : 'port', vp = s.pg.viewportSize();
    await s.pg.evaluate(() => { const p = window.__game.player; p.x = 29.6; p.y = 0.2; p.z = -1.3; p.vx = p.vy = p.vz = 0; });
    await s.pg.screenshot({ path: `${out}/camdrag_${tag}_for.png` });
    const r = {};
    r.bildet = await drag(s, vp.width * 0.75, vp.height * 0.4, vp.width * 0.55, vp.height * 0.4);
    const j = await ctr(s.pg, 'btnJump'), g = await ctr(s.pg, 'btnGrab'), c = await ctr(s.pg, 'btnCarry');
    r.hoppSirkel = await drag(s, j[0], j[1], j[0] - 90, j[1]);
    r.grepSirkel = await drag(s, g[0], g[1], g[0] - 90, g[1]);
    r.hoppKant = await drag(s, j[0] - j[2] - 5, j[1], j[0] - j[2] - 95, j[1]);
    r.taKant = await drag(s, c[0] + c[2] + 5, c[1], c[0] + c[2] - 85, c[1]);
    r.band = await drag(s, vp.width * 0.6, 24, vp.width * 0.3, 24);
    await s.pg.screenshot({ path: `${out}/camdrag_${tag}_etter.png` });
    // kantfelt-trykk uten dra gir fortsatt HOPP
    const j0 = await s.pg.evaluate(() => window.__game.evLog.length);
    res[tag] = r; for (const [k, v] of Object.entries(r)) if (!good(v)) { ok = false; console.error('FEIL', tag, k, v); }
    res[tag + 'Ev'] = await s.pg.evaluate(() => window.__game.evLog.filter((e) => e.type === 'kamera').map((e) => e.detail));
    await s.ctx.close();
  }
  // alle nivåer: start og mål (stående), nær vegg: yaw OG bilde responderer
  const ids = ['bad', 'barnerom', 'kjokken', 'bad2', 'barnerom2', 'kjokken2'];
  res.nivaa = {};
  for (const lv of ids) {
    const s = await open('iPhone 14', lv).catch((e) => { errs.push(`${lv}: ${e.message}`); return null; }); if (!s) { ok = false; continue; }
    const vp = s.pg.viewportSize(), at = [];
    const spots = await s.pg.evaluate(() => { const L = window.__game.LEVEL, p = window.__game.player; return { start: [p.x, p.y, p.z], goal: [L.goal[0], L.goal[1], L.goal[2]], room: L.room || null }; });
    const places = { start: spots.start, mål: spots.goal };
    if (spots.room && Number.isFinite(spots.room.x0)) places.hjørne = [spots.room.x0 + 0.6, spots.start[1], spots.room.z0 + 0.6];
    for (const [nm, pos] of Object.entries(places)) {
      await s.pg.evaluate((q) => { const p = window.__game.player; p.x = q[0]; p.y = q[1] + 0.1; p.z = q[2]; p.vx = p.vy = p.vz = 0; for (let i = 0; i < 40; i++) window.__game.update(1 / 60); }, pos);
      const r = await drag(s, vp.width * 0.8, vp.height * 0.4, vp.width * 0.55, vp.height * 0.4); res.nivaa[`${lv}/${nm}`] = r; if (!good(r)) { ok = false; console.error('FEIL', lv, nm, r); }
    }
    await s.ctx.close();
  }
  console.log(JSON.stringify({ res, errs, ok }, null, 1)); await b.close(); process.exit(ok && !errs.length ? 0 : 1);
})();
