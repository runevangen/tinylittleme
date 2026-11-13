// R60: ekte spillflyt for gåteverktøy (iPhone 14, Playwright): TA ved klossen, bær til plata, TA setter den fra seg, døra åpner seg; bryteren (TA) senker vindebroen.
// node tools/live_gates.cjs <utmappe> [port]   (server på porten; playwright via NODE_PATH). Ekte FPS/følelse: testes på iPhone.
const { chromium, devices } = require('playwright');
(async () => {
  const out = process.argv[2] || '.', port = process.argv[3] || 8360;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ ...devices['iPhone 14'] });
  const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await pg.addInitScript(() => { try { localStorage.setItem('tlm.cues', 'true'); localStorage.setItem('tlm.seen.gates', 'true'); localStorage.setItem('tlm.introsweep', 'false'); } catch {} });
  await pg.goto(`http://localhost:${port}/?level=gaate&start=0`);
  await pg.waitForFunction(() => window.__game && window.__game.LEVEL.gateS, null, { timeout: 30000 });
  await pg.evaluate(() => { window.__paused = true; });
  const run = (n) => pg.evaluate((n) => window.__game.tick(n, 1 / 60), n);
  const sh = async (n) => { await run(2); await pg.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await pg.screenshot({ path: `${out}/${n}.png` }); };
  const tap = async (id) => { const r = await pg.locator('#' + id).boundingBox(); await pg.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); };
  const put = (x, y, z, fx, fz, yaw) => pg.evaluate(([x, y, z, fx, fz, yaw]) => { const g = window.__game, p = g.player; p.x = x; p.y = y; p.z = z; p.vx = p.vz = p.vy = 0; p.onGround = true; p.fx = fx; p.fz = fz; if (yaw != null) g.cam.yaw = yaw; }, [x, y, z, fx, fz, yaw]);
  const st = () => pg.evaluate(() => { const L = window.__game.LEVEL; return { doors: L.gateS.doors.map((d) => `${d.id}:${d.t.toFixed(2)}`), plates: L.gateS.plates.map((p) => `${p.id}:${p.on ? 'ned' : 'opp'}(${p.load})`), sw: L.gateS.switches.map((s) => `${s.id}:${s.on}`), carry: window.__game.player.carry?.id || null, hint: document.getElementById('hint').textContent, toast: document.getElementById('toast').textContent }; });
  const res = {}; let bad = 0; const ok = (k, c, d) => { res[k] = { ok: !!c, ...d }; if (!c) bad++; };
  const y = 0;
  await pg.touchscreen.tap(195, 420); await run(30);
  await sh('gates_0_start');
  // 1. klosse_a ligger ved (-66,-16.5). Stå vest for den og se østover (+x): TA
  await put(-69, y, -16.5, 1, 0, -Math.PI / 2); await run(20); let s = await st(); ok('hint før TA', /TA/.test(s.hint), s);
  await tap('btnCarry'); await run(12); s = await st(); ok('TA tar klossen', s.carry === 'klosse_a', s); await sh('gates_1_carry');
  // 2. bær til plata p1 (x -56..-48, z -4..4): stå på plata og se østover, TA setter klossen fra seg
  await put(-54, y, 0, 1, 0, -Math.PI / 2); await run(5); await tap('btnCarry'); await run(80); s = await st();
  ok('plate trykket av klossen', s.plates[0].startsWith('p1:ned'), s); ok('port 1 åpen', parseFloat(s.doors[0].split(':')[1]) === 1, s); await sh('gates_2_door_open');
  // 3. to-plate-gåten: p2 (x -20..-12, z -16..-8), p3 (z 8..16). Sett klosse_b og klosse_c på dem (via TA)
  await put(-33, y, -10, 1, 0, -Math.PI / 2); await pg.evaluate(() => { const b = window.__game.LEVEL.bodies.find((q) => q.id === 'klosse_b'); const p = window.__game.player; p.x = (b.min[0] + b.max[0]) / 2 - 1; p.z = (b.min[2] + b.max[2]) / 2; p.fx = 1; p.fz = 0; }); await run(5); await tap('btnCarry'); await run(10);
  await put(-16, y, -12, 1, 0); await run(3); await tap('btnCarry'); await run(60); s = await st(); ok('plate 1 av 2', s.plates[1].startsWith('p2:ned') && parseFloat(s.doors[1].split(':')[1]) === 0, s); await sh('gates_3_one_of_two');
  await pg.evaluate(() => { const b = window.__game.LEVEL.bodies.find((q) => q.id === 'klosse_c'); const p = window.__game.player; p.x = (b.min[0] + b.max[0]) / 2 - 1; p.z = (b.min[2] + b.max[2]) / 2; p.fx = 1; p.fz = 0; p.vx = p.vz = 0; }); await run(5); await tap('btnCarry'); await run(10);
  await put(-16, y, 12, 1, 0); await run(3); await tap('btnCarry'); await run(80); s = await st(); ok('plate 2 av 2: porten åpner', s.plates[2].startsWith('p3:ned') && parseFloat(s.doors[1].split(':')[1]) === 1, s); await sh('gates_4_two_plates');
  // 4. bryteren på plattformen (x 22, z 0, y 6): stå ved den, hintet nevner TA, TA slår den, vindebroen kommer
  await put(21, 6, 0, 1, 0, -Math.PI / 2); await run(10); s = await st(); ok('bryter-hint', /TA/.test(s.hint) && /bryter/i.test(s.hint), s);
  await sh('gates_5_switch'); await tap('btnCarry'); await run(120); s = await st(); ok('bryter senker broen', s.sw[0] === 's1:true' && parseFloat(s.doors[2].split(':')[1]) === 1, s); await sh('gates_6_bridge');
  // 5. nisja: stå på hjørneplata (figuren alene), nisje-døra åpner for godt
  await put(-70, y, -16, 1, 0, -Math.PI / 2); await run(100); s = await st(); ok('hjørneplata åpner nisja', parseFloat(s.doors[3].split(':')[1]) === 1, s); await put(-56, y, 24, 0, 1, 0); await run(100); s = await st(); ok('nisja blir stående åpen', parseFloat(s.doors[3].split(':')[1]) === 1, s); await sh('gates_7_nook');
  // 6. autolagring: bryter og latch-dør i lagringen
  const sv = await pg.evaluate(() => { window.dispatchEvent(new Event('pagehide')); const k = Object.keys(localStorage).filter((x) => /prog/i.test(x)); return k.map((x) => (localStorage.getItem(x) || '').slice(0, 0) + (/"gates":\{[^}]*\}/.exec(localStorage.getItem(x)) || [''])[0]); });
  ok('lagret', sv.some((x) => /"sw":\["s1"\]/.test(x) && /"open":\["d4"\]/.test(x)), { sv });
  console.log(JSON.stringify(res, null, 1)); console.log('feil:', errs);
  await b.close(); process.exit(bad || errs.length ? 1 : 0);
})();
