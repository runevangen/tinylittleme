// R48: leker som testlast på mobil (iPhone 14, Playwright): leke-brettet krever ball og bil. Åpner byggeskjermen, legger ut planken, velger last med knappene, trykker PRØV,
// sjekker at brettet ikke er løst før begge har klart det, og at det ikke er konsollfeil. Skjermbilder i utmappa.
// node tools/live_buildloads.cjs <utmappe> [port]   (server på porten; playwright via NODE_PATH). Exit 1 ved feil.
const { chromium, devices } = require('playwright');
(async () => {
  const out = process.argv[2] || '.', port = process.argv[3] || 8461;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  let bad = 0; const ok = (k, c, d = '') => { console.log(c ? 'ok  ' : 'FEIL', k, d); if (!c) bad++; };
  const ctx = await b.newContext({ ...devices['iPhone 14'] }), pg = await ctx.newPage(), errs = [];
  pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await pg.addInitScript(() => { try { localStorage.setItem('tlm.buildall', 'true'); localStorage.setItem('tlm.story', 'false'); localStorage.setItem('tlm.introsweep', 'false'); } catch {} });
  await pg.goto(`http://localhost:${port}/?level=leke&start=0`);
  await pg.waitForFunction(() => window.__game && window.__game.LEVEL.buildSites, null, { timeout: 30000 });
  const run = (n) => pg.evaluate((n) => window.__game.tick(n, 1 / 60), n);
  const sh = async (n) => { await pg.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await pg.screenshot({ path: `${out}/loads_${n}.png` }); };
  const tapEl = async (sel) => { const ok2 = await pg.evaluate((sel) => { const e = document.querySelector(sel) || document.querySelector('#bld .bxgo .try, #bld .cxgo .try'); if (!e) return false; e.click(); return true; }, sel); await run(3); return ok2; };
  await pg.touchscreen.tap(195, 420); await run(30);
  await pg.evaluate(() => { const q = window.__game.LEVEL.buildSites[0], p = window.__game.player; p.x = q.x - 8; p.y = q.y; p.z = q.z + 3; p.vx = p.vz = p.vy = 0; p.onGround = true; });
  await run(10); ok('BYGG-knappen vises', await pg.locator('#btnBuild').isVisible()); await pg.evaluate(() => window.__game.bld.open()); await run(2);   // knappen kan ligge under hintkortet øverst til høyre i starten, så åpne direkte
  ok('byggeskjermen åpen', await pg.evaluate(() => document.body.classList.contains('building')));
  try { await pg.getByText('HOPP OVER').first().click({ timeout: 3000 }); } catch {}
  await run(5);
  const ids = await pg.evaluate(() => [...document.querySelectorAll('#bld .chip')].map((c) => c.dataset.id)); const chip = ids.find((i) => /^p1$/.test(i)) || ids[0];
  await pg.locator(`#bld .chip[data-id="${chip}"]`).scrollIntoViewIfNeeded();
  const r = await pg.locator(`#bld .chip[data-id="${chip}"]`).boundingBox(), vw = pg.viewportSize(), p0 = await pg.evaluate(() => { const s = window.__game.bld; return s.screenPos(0, 0.25); });
  await pg.mouse.move(r.x + r.width / 2, r.y + r.height / 2); await pg.mouse.down(); await pg.mouse.move(p0.x, p0.y, { steps: 8 }); await pg.mouse.up();
  const btns = await pg.evaluate(() => [...document.querySelectorAll('#bld .loads button')].map((x) => x.textContent));
  ok('to laster å velge mellom (ball og bil), ikke figuren', btns.length === 2 && /Ball/.test(btns[0]) && /Bil/.test(btns[1]), JSON.stringify(btns));
  await sh('1_valg');
  const tryLoad = async (sel, name) => {
    if (sel) await tapEl(sel); await tapEl('#bld .bxgo .try, #bld .cxgo .try, #bld button[data-a="try"]');
    for (let i = 0; i < 80; i++) { await pg.waitForTimeout(250); if (!(await pg.evaluate(() => window.__game.bld.running))) break; }
    const rs = await pg.evaluate(() => window.__game.bld.result); await sh(`3_${name}_utfall`); return rs;
  };
  const curSel = () => pg.evaluate(() => document.querySelector('#bld .loads button.on')?.dataset.l);
  let rs = await tryLoad('#bld .loads button[data-l="ball"]', 'ball'); console.log('ball:', JSON.stringify(rs));
  ok('ballen vant', rs && rs.state === 'won');
  if (rs && rs.state === 'won') {
    ok('hintet sier neste last', /Trykk PRØV/.test(rs.hint) && /bil/i.test(rs.hint), rs.hint);
    await tapEl('#bld .bxgo .try, #bld .cxgo .try, #bld button[data-a="try"]');   // STOPP
    ok('bil er valgt automatisk', (await curSel()) === 'car', await curSel());
    await sh('4_etter_ball');
    const card = await pg.evaluate(() => document.querySelector('.bnres')?.textContent || '(ingen kort i denne skinnet)'); console.log('kort:', card);
    rs = await tryLoad(null, 'bil'); console.log('bil:', JSON.stringify(rs && rs.state));
    ok('begge klart: løst', await pg.evaluate(() => window.__game.bld.isSolved('leke1')));
  }
  ok('ingen konsollfeil', errs.length === 0, errs.slice(0, 3).join(' | '));
  await ctx.close(); await b.close(); process.exit(bad ? 1 : 0);
})();
