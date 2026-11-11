// R18: ekte spillflyt for leker (iPhone 14, Playwright): trykker de ekte knappene TA / HOPP, dytter med stikka, og sjekker lyd + lydtekst + skjermbilde.
// node tools/live_toys.cjs <utmappe> [port]   (server på porten; playwright via NODE_PATH). Exit 1 hvis en lek ikke svarer.
const { chromium, devices } = require('playwright');
(async () => {
  const out = process.argv[2] || '.', port = process.argv[3] || 8318;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ ...devices['iPhone 14'] });
  const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await pg.addInitScript(() => { try { localStorage.setItem('tlm.cues', 'true'); } catch {} });
  await pg.goto(`http://localhost:${port}/?level=barnerom&start=0`);
  await pg.waitForFunction(() => window.__game && window.__game.LEVEL.bodies, null, { timeout: 30000 });
  await pg.evaluate(() => { window.__paused = true; const g = window.__game; window.__snd = []; window.__cues = []; new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => window.__cues.push(n.textContent)))).observe(document.getElementById('cues'), { childList: true }); });
  const sh = async (n) => { await pg.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await pg.screenshot({ path: `${out}/${n}.png` }); };
  const tap = async (id) => { const r = await pg.locator('#' + id).boundingBox(); await pg.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); };
  const hold = async (id, n = 8) => { const r = await pg.locator('#' + id).boundingBox(); await pg.mouse.move(r.x + r.width / 2, r.y + r.height / 2); await pg.mouse.down(); await run(n); await pg.mouse.up(); await run(6); };   // trykk og hold (ekte pekerhendelser)
  const run = (n) => pg.evaluate((n) => window.__game.tick(n, 1 / 60), n);
  const put = (x, y, z, yaw) => pg.evaluate(([x, y, z, yaw]) => { const g = window.__game, p = g.player; p.x = x; p.y = y; p.z = z; p.vx = p.vz = p.vy = 0; p.onGround = true; p.fx = 0; p.fz = -1; if (yaw != null) g.cam.yaw = yaw; }, [x, y, z, yaw]);
  const take = () => pg.evaluate(() => { const r = { snd: window.__snd.splice(0), cues: window.__cues.splice(0) }; return r; });
  const res = {}; let bad = 0; const ok = (k, c, d) => { res[k] = { ok: !!c, ...d }; if (!c) bad++; };
  const body = (id) => pg.evaluate((id) => { const b = window.__game.LEVEL.bodies.find((q) => q.id === id); return [+((b.min[0] + b.max[0]) / 2).toFixed(2), +((b.min[2] + b.max[2]) / 2).toFixed(2)]; }, id);
  await pg.touchscreen.tap(195, 420); await run(30);   // første berøring låser opp lyden
  await pg.evaluate(() => { const g = window.__game; const a = g.audio; if (!a) throw new Error('ingen lyd'); if (a) for (const n of ['squeak', 'honk', 'creak', 'boing', 'toyTick']) { const o = a[n]; a[n] = (...x) => { window.__snd.push(n); return o.apply(a, x); }; } });
  await take();
  // Overblikk: alle leker i bildet
  await put(1, 0, -17, 0); await run(60); await sh('toys_overview');
  // 1. sprettboks (middels tung, ikke bærbar): HOPP fra toppen → landing → boing
  await put(6.6, 2.8, -4.6, 0); await run(5); await take(); await tap('btnJump'); await run(90); await sh('toys_jackbox'); let t = await take(); ok('jackbox HOPP', t.snd.includes('boing') && t.cues.some((c) => /boing/.test(c)), t);
  // 2. vippehest: HOPP (knapp) fra toppen → landing → knirk
  await put(-2, 3.3, -1.4, 0); await run(5); await take(); await tap('btnJump'); await run(90); await sh('toys_horse'); t = await take(); ok('horse HOPP', t.snd.includes('creak') && t.cues.some((c) => /knirk/.test(c)), t);
  // 3. tennisball: dytt med stikka (+ TA som alternativ)
  await put(2.3, 0, -3.8, 0); await run(10); await take(); const b0 = await body('leke_tennisball');
  await pg.evaluate(() => { window.__game.touch.y = 1; }); await run(50); await pg.evaluate(() => { window.__game.touch.y = 0; }); t = await take(); const b1 = await body('leke_tennisball');
  ok('ball dytt', t.snd.includes('squeak') && Math.hypot(b1[0] - b0[0], b1[1] - b0[1]) > 0.3, { b0, b1, ...t }); await sh('toys_ball');
  await put(2.3, 0, -3.8, 0); await run(10); await take(); await tap('btnCarry'); await run(10); t = await take(); res['ball TA'] = t;
  await hold('btnCarry'); await take();
  // 4. bil (for stor til å bæres): HOPP fra toppen → landing → tut
  await put(-2.6, 2.2, -13.6, 0); await run(5); await take(); await tap('btnJump'); await run(90); await sh('toys_car'); t = await take(); ok('car HOPP', t.snd.includes('honk') && t.cues.some((c) => /tut/.test(c)), t);
  // 5. wind-up: TA, slipp (TA) → tikk og går
  await put(5.4, 0, -11.2, 0); await run(10); await take(); const w0 = await body('leke_robot'); await tap('btnCarry'); await run(12); let t1 = await take(); await hold('btnCarry'); await run(40); await sh('toys_windup'); t = await take(); const w1 = await body('leke_robot');
  ok('windup TA/slipp', t1.snd.includes('toyTick') && t.snd.includes('toyTick') && t.cues.some((c) => /tikk/.test(c)), { t1, t, w0, w1 });
  console.log(JSON.stringify(res, null, 1)); console.log('feil:', errs);
  await b.close(); process.exit(bad || errs.length ? 1 : 0);
})();
