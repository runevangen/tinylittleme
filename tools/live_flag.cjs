// R71: ⚑ på alle skjermer, iPhone 14, med ekte trykk. Sjekker per skjerm: knappen finnes, er synlig, ligger øverst (elementFromPoint treffer den),
// overlapper ingen annen knapp, boksen åpnes over alt, kan lukkes med trykk utenfor, og sending (falsk fetch) har riktig `Skjerm oppe` i rapporten.
// node tools/live_flag.cjs <utmappe> [port]   Exit 1 ved feil.
const { chromium, devices } = require('playwright');
(async () => {
  const out = process.argv[2] || '.', port = process.argv[3] || 8421;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ ...devices['iPhone 14'] });
  const pg = await ctx.newPage(); const errs = [], posts = [];
  pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await pg.route('**/rest/v1/**', async (r) => { const q = r.request(); if (q.method() === 'POST') { posts.push(q.postData()); return r.fulfill({ status: 201, body: '' }); } return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }); });
  await pg.addInitScript(() => { try { localStorage.setItem('tlm.buildall', 'true'); localStorage.setItem('tlm.tcode', JSON.stringify('test-0000')); } catch {} });
  let bad = 0; const ok = (k, c, d = '') => { console.log(c ? 'ok  ' : 'FEIL', k, d); if (!c) bad++; };
  const sh = (n) => pg.screenshot({ path: `${out}/flag_${n}.png`, timeout: 60000 });
  const run = (n) => pg.evaluate((n) => window.__game.tick(n, 1 / 60), n);
  // sjekk av ⚑ på gjeldende skjerm. want = forventet skjermnavn
  async function check(name, want, sel = '#qbtn') {
    await pg.waitForTimeout(400);
    const r = await pg.evaluate((sel) => {
      const q = document.querySelector(sel), cs = getComputedStyle(q), bb = q.getBoundingClientRect();
      const cx = bb.x + bb.width / 2, cy = bb.y + bb.height / 2, hit = document.elementFromPoint(cx, cy);
      const others = [...document.querySelectorAll('button,.tbtn,#stick,#minimap,#compass')].filter((e) => e !== q && !q.contains(e) && !document.getElementById('qpop').contains(e)).filter((e) => { const c = getComputedStyle(e); if (c.display === 'none' || c.visibility === 'hidden') return false; const r = e.getBoundingClientRect(); if (!r.width || !r.height) return false; const ox = Math.min(r.right, bb.right) - Math.max(r.left, bb.left), oy = Math.min(r.bottom, bb.bottom) - Math.max(r.top, bb.top); return ox > 1 && oy > 1 && document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) === e; }).map((e) => e.id || e.className || e.textContent.slice(0, 12));
      return { disp: cs.display, vis: cs.visibility, op: +cs.opacity, x: Math.round(bb.x), y: Math.round(bb.y), w: Math.round(bb.width), hit: hit === q || q.contains(hit), others };
    }, sel);
    ok(`${name}: ⚑ synlig og øverst`, r.disp !== 'none' && r.vis !== 'hidden' && r.hit, JSON.stringify(r));
    ok(`${name}: ingen overlapp med andre knapper`, r.others.length === 0, r.others.join(','));
    await sh(name);
    await pg.locator(sel).tap(); await pg.waitForTimeout(300);
    const pop = await pg.evaluate(() => { const p = document.getElementById('qpop'), bb = p.getBoundingClientRect(); const hit = document.elementFromPoint(bb.x + bb.width / 2, bb.y + 20); return { shown: !p.classList.contains('hide'), top: p.contains(hit), w: Math.round(bb.width), x: Math.round(bb.x) }; });
    ok(`${name}: boksen åpnes over alle lag`, pop.shown && pop.top, JSON.stringify(pop));
    await pg.fill('#qtext', 'test-' + name); posts.length = 0;
    await pg.locator('#qpop [data-send]').tap(); await pg.waitForTimeout(700);
    const rows = posts.map((x) => { try { return JSON.parse(x); } catch { return {}; } }), body = rows.reverse().find((x) => x && x.report) || null;
    ok(`${name}: sendt med skjerm «${want}»`, !!body && body.report.includes('Skjerm oppe: ' + want) && body.body.includes('test-' + name), body ? (body.report.match(/Skjerm oppe: [^\n]*/) || ['(mangler)'])[0] : 'ingen POST');
    // åpne igjen og lukk med trykk utenfor
    await pg.evaluate(() => document.getElementById('qpop').classList.contains('hide') && document.getElementById('qbtn').click()); await pg.waitForTimeout(200);
    await pg.mouse.click(5, 400); await pg.waitForTimeout(250);
    ok(`${name}: lukkes med trykk utenfor`, await pg.evaluate(() => document.getElementById('qpop').classList.contains('hide')));
  }
  await pg.goto(`http://localhost:${port}/?level=kontroll&start=0`);
  await pg.waitForFunction(() => window.__game && window.__game.LEVEL.buildSites, null, { timeout: 120000 }).catch((e) => { console.log("ERRS", errs); throw e; });
  await pg.evaluate(() => { try { localStorage.setItem('tlm.tcode', JSON.stringify('test-0000')); } catch {} });
  // oppstart/intro
  await run(5);
  await pg.evaluate(() => window.__game.diff.start());
  const hasStart = await pg.evaluate(() => !document.getElementById('start').classList.contains('hide'));
  if (hasStart) { await check('start', 'start'); await pg.locator('#mLevels').tap(); await pg.waitForTimeout(300); await check('brettvalg', 'brettvalg'); await pg.locator('#dfBack').tap(); await pg.waitForTimeout(200); await pg.locator('#mCont').tap(); await pg.waitForTimeout(300); }
  else ok('startskjerm kan åpnes (showStart)', false);
  // spill
  await run(30); await check('spill', 'spill', '#tbq');
  // meny (⋯)
  await pg.locator('#bMore').tap(); await pg.waitForTimeout(200); await check('meny', 'spill', '#tbq');   // med toppbånd ligger ⚑ i båndet; trykket lukker ⋯-menyen før rapporten bygges await pg.mouse.click(5, 400);
  // ⚙-panelet: ⚑ i hodet
  await pg.locator('#bSet').tap(); await pg.waitForTimeout(300); await check('innstillinger', 'innstillinger', '#pFlag'); await pg.locator('#pCloseTop').tap();
  // byggeskjerm
  const s = await pg.evaluate(() => window.__game.LEVEL.buildSites[0]);
  await pg.evaluate((s) => { const p = window.__game.player; p.x = s.x - 4; p.y = s.y; p.z = s.z + 3; p.vx = p.vz = p.vy = 0; p.onGround = true; }, s); await run(10);
  await pg.locator('#btnBuild').tap({ force: true }); await run(2);
  ok('byggeskjermen åpen', await pg.evaluate(() => document.body.classList.contains('building')));
  await check('bygg', `byggeskjerm (${s.id})`);
  // byggeknappene er fortsatt trykkbare (raden er kortet inn): trykk på midten av ANGRE-knappen og ⚑ sammen
  const row = await pg.evaluate(() => { const bs = [...document.querySelectorAll('#bld .bt.top button')], l = bs[bs.length - 1].getBoundingClientRect(), q = document.getElementById('qbtn').getBoundingClientRect(); return { right: Math.round(l.right), qleft: Math.round(q.left) }; });
  ok('byggeknappenes rad slutter før ⚑', row.right <= row.qleft, JSON.stringify(row));
  await pg.evaluate(() => window.__game.bld.close('test')); await run(2);
  // målskjerm
  await pg.evaluate(() => { const w = document.getElementById('win'); w.classList.remove('hide'); });
  await check('mal', 'mal'); await pg.evaluate(() => document.getElementById('win').classList.add('hide'));
  console.log('feil i konsollen:', errs.length ? errs.join(' | ') : 'ingen'); if (errs.length) bad++;
  await b.close(); process.exit(bad ? 1 : 0);
})();
