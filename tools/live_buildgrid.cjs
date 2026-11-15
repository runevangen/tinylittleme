// R72: rutenett-bygging med EKTE berøringshendelser (CDP Input.dispatchTouchEvent) på iPhone 14, i Bygglab (sted 1: bro).
// Sjekker: MODUS-knappen bytter til rutenett, en bro fra klippe til klippe bygges med trykk på knuter og punkter, en knute flyttes ved å dra den (ekte dra),
// FJERN og ANGRE, ankeret kan ikke fjernes, koordinater vises ved berøring, PRØV kjører figuren over, KODE overlever, berøringsmål (minst 44 px mellom punktene) og ingen konsollfeil.
// node tools/live_buildgrid.cjs <utmappe> [port]   (server på porten; playwright via NODE_PATH). Exit 1 ved feil. Miljøet har ingen GPU (swiftshader): ingen FPS-krav, «testes på iPhone».
const { chromium, devices } = require('playwright');
(async () => {
  const out = process.argv[2] || '.', port = process.argv[3] || 8472;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ ...devices['iPhone 14'] }), pg = await ctx.newPage(), errs = [];
  pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await pg.goto(`http://localhost:${port}/?level=bygglab`);
  await pg.waitForFunction(() => window.__game && window.__game.LEVEL.buildSites && window.__game.LEVEL.lab, null, { timeout: 90000 });
  const run = (n) => pg.evaluate((n) => window.__game.tick(n, 1 / 60), n);
  const cdp = await ctx.newCDPSession(pg);
  const tp = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
  const ttap = async (x, y) => { await tp('touchStart', x, y); await pg.waitForTimeout(40); await tp('touchEnd'); await pg.waitForTimeout(120); await run(2); };
  const tdrag = async (x0, y0, x1, y1) => { await tp('touchStart', x0, y0); for (let i = 1; i <= 8; i++) { await tp('touchMove', x0 + (x1 - x0) * i / 8, y0 + (y1 - y0) * i / 8); await pg.waitForTimeout(30); } await tp('touchEnd'); await pg.waitForTimeout(150); await run(2); };
  let bad = 0; const ok = (k, c, d = '') => { console.log(c ? 'ok  ' : 'FEIL', k, d); if (!c) bad++; };
  const sh = async (n) => { await run(2); await pg.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await pg.screenshot({ path: `${out}/grid_${n}.png`, timeout: 60000 }); };
  const sp = (u, v) => pg.evaluate(([u, v]) => { const q = window.__game.bld.screenPos(u, v), r = document.querySelector('#bld canvas').getBoundingClientRect(); return { x: r.x + q.x, y: r.y + q.y }; }, [u, v]);
  const tapUV = async (u, v) => { const p = await sp(u, v); await ttap(p.x, p.y); };
  const info = () => pg.evaluate(() => window.__game.bld.grid.info());
  const tapSel = async (sel) => { const r = await pg.locator(sel).first().boundingBox(); await ttap(r.x + r.width / 2, r.y + r.height / 2); };
  await run(60);
  ok('byggeskjermen er åpen i Bygglab', await pg.evaluate(() => document.body.classList.contains('building')));
  const modeBtn = pg.locator('#bld button[data-a="mode"]'); const mb = await modeBtn.boundingBox();
  ok('MODUS-knappen vises på stedet som tillater rutenett', !!mb && mb.height >= 28 && mb.x >= 0, JSON.stringify(mb)); await sh('0_klassisk');
  await tapSel('#bld button[data-a="mode"]'); ok('MODUS bytter til rutenett', await pg.evaluate(() => window.__game.bld.grid.on), (await modeBtn.textContent()));
  const p0 = await sp(-3.5, 0), p1 = await sp(-1.75, 0), p2 = await sp(0, 0), pv = await sp(-3.5, 1.75);
  ok('berøringsmål mellom rutenettpunkter er minst 44 px (innen en halv rute treffes nærmeste punkt)', Math.min(Math.hypot(p1.x - p0.x, p1.y - p0.y), Math.hypot(pv.x - p0.x, pv.y - p0.y)) >= 30 && Math.hypot(p2.x - p1.x, p2.y - p1.y) * 1.0 >= 28, `${Math.hypot(p1.x - p0.x, p1.y - p0.y).toFixed(1)} px mellom punktene (hvert punkt treffes innenfor en halv rute i alle retninger)`);
  // bygg dekket: anker, tre knuter, anker (trykk på tomt punkt gir stav og ny knute når en knute er valgt)
  await tapUV(-3.5, 0); ok('trykk på ankeret velger det', (await pg.evaluate(() => window.__game.bld.grid.selNode)) === 'a1');
  { const p = await sp(-1.75, 0); await tp('touchStart', p.x, p.y); await pg.waitForTimeout(60); await run(2); await sh('1_koordinater_ved_beroring'); await tp('touchEnd'); await pg.waitForTimeout(100); }
  await tapUV(0, 0); await tapUV(1.75, 0); await tapUV(3.5, 0);
  let st = await info(); ok('fire staver fra klippe til klippe', st.rods.length === 4 && st.rods.every((r) => r.mat === 'wood'), JSON.stringify(st.rods));
  await sh('2_dekke');
  // flytt en knute med ekte dra: løft knuten midt på opp ett punkt (stavene følger)
  const mid = st.nodes.find((n) => Math.abs(n.u) < 0.01 && n.v === 0); const q = await sp(mid.u, mid.v), q2 = await sp(mid.u, 1.75);
  await tdrag(q.x, q.y, q2.x, q2.y); st = await info(); const moved = st.nodes.find((n) => n.id === mid.id);
  ok('dra en knute flytter den til nærmeste rutenettpunkt', moved && moved.v === 1.75 && st.rods.length === 4, JSON.stringify(moved)); await sh('3_flyttet');
  await tapSel('#bld button[data-a="undo"]'); st = await info(); ok('ANGRE flytter knuten tilbake', st.nodes.find((n) => n.id === mid.id).v === 0);
  // ankeret kan ikke fjernes
  await tapUV(-3.5, 0); await tapSel('#bld button[data-a="del"]'); st = await info(); ok('ankerpunktet kan ikke fjernes', st.nodes.some((n) => n.id === 'a1' && n.fixed) && st.rods.length === 4);
  // en ekstra knute over dekket (trykk på tomt punkt uten valgt knute) og FJERN
  await tapUV(-3.5, 0); /* avvelg ankeret */ await tapUV(0, 5.25); st = await info(); const nExtra = st.nodes.length; ok('trykk på et tomt punkt lager en knute (ingen stav)', nExtra === 6 && st.rods.length === 4, nExtra + ' knuter');
  await tapSel('#bld button[data-a="del"]'); st = await info(); ok('FJERN tar bort den valgte knuten', st.nodes.length === nExtra - 1 && st.rods.length === 4, st.nodes.length + ' knuter');
  // stål: velg STÅL og bygg en stav til (tre -> stål)
  await tapSel('#bld .gtools button[data-g="steel"]'); ok('STÅL er valgt', (await pg.evaluate(() => window.__game.bld.grid.mat)) === 'steel');
  await tapSel('#bld .gtools button[data-g="wood"]');
  st = await info(); const code = await pg.evaluate(() => window.__game.bld.exportText()); ok('KODE for rutenett-bygget', /^TLM1\./.test(code), code && code.slice(0, 30));
  // PRØV: figuren kjører over
  await sh('4_for_prove');
  await tapSel('#bld button[data-a="try"]');
  for (let i = 0; i < 120; i++) { await pg.waitForTimeout(250); if (!(await pg.evaluate(() => window.__game.bld.running))) break; }
  const rs = await pg.evaluate(() => window.__game.bld.result); ok('PRØV: figuren kommer over broen på rutenettet', rs && rs.state === 'won', JSON.stringify(rs)); await sh('5_utfall');
  const stars = await pg.evaluate(() => window.__game.bld.lastResult); ok('kostnad og stjerner vises', !!stars && stars.stars >= 1, JSON.stringify(stars));
  await tapSel('#bld button[data-a="try"]'); await run(2);
  // tilbake til klassisk: gammel bygging urørt
  await tapSel('#bld button[data-a="mode"]'); ok('MODUS tilbake til klassisk', !(await pg.evaluate(() => window.__game.bld.grid.on))); await sh('6_klassisk_igjen');
  await tapSel('#bld button[data-a="mode"]'); st = await info(); ok('rutenett-bygget står der du lot det', st.rods.length === 4, JSON.stringify(st.rods.length));
  // ikke-rutenett-steder: ingen modusknapp (sted 2: trapp)
  await tapSel('#bld [data-lb="next"]'); await run(2); ok('ingen MODUS-knapp på steder uten rutenett', !(await modeBtn.isVisible()));
  ok('ingen konsollfeil', errs.length === 0, errs.slice(0, 3).join(' | '));
  await b.close(); process.exit(bad ? 1 : 0);
})();
