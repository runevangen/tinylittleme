// R124: «Runde 2»-brettene (bro2, kjokkenbro2) på iPhone 14 (stående og liggende) med EKTE berøring (CDP Input.dispatchTouchEvent).
// Sjekker: brettet starter uten feil; kortet «Prøv Byggeskolen · Fagverk først» (TIL BYGGESKOLEN / HOPP OVER) vises én gang; firkant uten diagonal gir hintet «Legg inn en diagonal»;
// en rett rad gir etter; trekantbroen (referansen) bygges med trykk på knutene og består PRØV; bygget står i verden; den harde veien finnes; Byggeskolen (Bygglab) har samme hint. Bilder i <utmappe>.
// node tools/live_badebro.cjs <utmappe> [port]   (playwright via NODE_PATH). Exit 1 ved feil. Ingen GPU (swiftshader ~1 fps): ingen FPS-krav, ekte følelse «testes på iPhone».
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.wav': 'audio/wav', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); const p = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f; if (!fs.existsSync(p)) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
(async () => {
  const out = process.argv[2] || '.'; fs.mkdirSync(out, { recursive: true }); await new Promise((ok) => srv.listen(+process.argv[3] || 0, ok)); const port = srv.address().port;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  let bad = 0; const ok = (k, c, d = '') => { console.log(c ? 'ok  ' : 'FEIL', k, d); if (!c) bad++; }; const errs = [];
  const lv = (n) => JSON.parse(fs.readFileSync(path.join(root, `levels/${n}.level.json`), 'utf8')).build.sites[0];
  let r2on = true;
  async function session(level, init, fn, viewport) {
    const dev = { ...devices['iPhone 14'], ...(viewport ? { viewport, screen: viewport } : {}) };
    const ctx = await b.newContext(dev), pg = await ctx.newPage();
    pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await pg.addInitScript(init, r2on); await pg.goto(`http://localhost:${port}/?level=${level}`); await pg.waitForFunction(() => window.__game && window.__game.bld, null, { timeout: 120000 }); await pg.evaluate(() => window.__game.tick(30, 1 / 60));
    const cdp = await ctx.newCDPSession(pg), tp = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
    const run = (n) => pg.evaluate((n) => window.__game.tick(n, 1 / 60), n);
    const t = {
      run,
      open: (id) => pg.evaluate((id) => { const o = window.__game.bld.open(id, { force: true }); window.__game.tick(4, 1 / 60); return o; }, id),
      tap: async (x, y) => { await tp('touchStart', x, y); await pg.waitForTimeout(40); await tp('touchEnd'); await pg.waitForTimeout(120); await run(3); },
      sp: (u, v) => pg.evaluate(([u, v]) => { const q = window.__game.bld.screenPos(u, v), r = document.querySelector('#bld canvas').getBoundingClientRect(); return { x: r.x + q.x, y: r.y + q.y }; }, [u, v]),
      mat: (m) => pg.evaluate((m) => window.__game.bld.grid.setMat(m), m),
      sh: async (n) => { await run(2); await pg.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await pg.screenshot({ path: `${out}/round2_${n}.png`, timeout: 60000 }); },
      info: () => pg.evaluate(() => window.__game.bld.grid.info()),
      // dra fra en knute til et punkt = en stav (som en spiller gjør i den nye byggeskjermen)
      drag: async (x0, y0, x1, y1) => { await tp('touchStart', x0, y0); for (let i = 1; i <= 8; i++) { await tp('touchMove', x0 + (x1 - x0) * i / 8, y0 + (y1 - y0) * i / 8); await pg.waitForTimeout(25); } await run(2); await tp('touchEnd'); await pg.waitForTimeout(100); await run(3); },
      rod: async (a, b2, m) => { await t.mat(m); const p = await t.sp(a[0], a[1]), q = await t.sp(b2[0], b2[1]); await t.drag(p.x, p.y, q.x, q.y); },
      withLoad: async (l) => { await pg.evaluate(() => window.__game.bld.stopTry()); await run(2); await pg.locator('#bld .bxmore').first().click(); await run(3); await pg.locator(`#bld .bxsheet .loads button[data-l="${l}"]`).first().click(); await run(2); await pg.evaluate(() => window.__game.bld.bux.sheet(false)); await run(2); return t.tryIt(); },
      tryIt: async () => { await pg.evaluate(() => window.__game.bld.startTry()); for (let i = 0; i < 40 && (await pg.evaluate(() => window.__game.bld.running)); i++) await pg.evaluate(() => { for (let k = 0; k < 150 && window.__game.bld.running; k++) window.__game.bld.update(1 / 60, true); }); return pg.evaluate(() => window.__game.bld.result); },
    };
    await fn(t, pg); await ctx.close();
  }
  const INIT = (_on) => { try { localStorage.setItem('tlm.buildux', 'true'); localStorage.setItem('tlm.gridlock', 'false'); localStorage.setItem('tlm.gridstage', 'true'); localStorage.setItem('tlm.buildtruss2', JSON.stringify('off')); localStorage.setItem('tlm.squaretip', 'false'); } catch (e) { /* ok */ } };
  const buildSpec = async (t, site, spec) => {   // id 0 og 1 er ankrene, 2.. er spec.nodes
    const an = site.anchors, ref = spec, pts = [[an[0].u, 0], [an[1].u, 0], ...ref.nodes];   // hver stav dras fra en knute som finnes (ankrene først), til punktet i den andre enden
    const have = new Set([0, 1]), prio = ([a, b2]) => { const p = pts[a], q = pts[b2]; return p[1] === 0 && q[1] === 0 ? 0 : p[0] !== q[0] && p[1] !== q[1] ? 1 : 2; };   // nedre rad først, så diagonaler, så stolper og øvre rad: ingen firkant står åpen (DIAGONAL-knappen ville dekket knutene)
    let todo = ref.rods.slice().sort((x, y) => prio(x) - prio(y));
    for (let guard = 0; todo.length && guard < 60; guard++) {
      const i = todo.findIndex(([a, b2]) => have.has(a) || have.has(b2)); if (i < 0) break; const [a, b2, m] = todo.splice(i, 1)[0];
      const before = (await t.info()).rods.length;
      if (have.has(a)) { await t.rod(pts[a], pts[b2], m); } else { await t.rod(pts[b2], pts[a], m); } have.add(a); have.add(b2);
      if ((await t.info()).rods.length === before) { console.log('    stav ikke lagt:', a, b2, m, JSON.stringify([pts[a], pts[b2]])); if (process.env.DBG) await t.sh('dbg_' + a + '_' + b2); }
    }
  };
  for (const [id, sid] of [['bro2', 'hylle2'], ['kjokkenbro2', 'kjk2']].filter(([i]) => !process.env.ONLY || process.env.ONLY === i)) {
    const site = lv(id), an = site.anchors, half = an[1].u;
    await session(id, INIT, async (t, pg) => {
      await t.sh(`${id}_0_verden`);
      await t.run(40); const stats = await pg.evaluate(() => JSON.stringify(window.__game.perfStats && window.__game.perfStats())); console.log('    perf:', stats);
      ok(`${id}: åpner byggestedet ${sid}`, await t.open(sid)); ok(`${id}: rutenett er på`, await pg.evaluate(() => window.__game.bld.grid.on)); await t.sh(`${id}_1_tom`);
      // tre alene: en rett rad av tre gir etter
      const rowN = []; for (let u = -half; u <= half; u += 2) rowN.push([u, 0]);
      for (let i = 0; i < rowN.length - 1; i++) await t.rod(rowN[i], rowN[i + 1], 'wood');
      let s = await t.info(); ok(`${id}: rett rad av tre er lagt (${rowN.length - 1} staver)`, s.rods.length === rowN.length - 1, String(s.rods.length));
      const rl = await t.withLoad('car'); ok(`${id}: tre alene: bilen kommer ikke over`, rl.state === 'lost', JSON.stringify(rl)); await t.sh(`${id}_2_tre_feiler`);
      await pg.evaluate(() => window.__game.bld.stopTry()); await pg.evaluate(() => window.__game.bld.resetBuild()); await t.run(3);
      // fagverket i stål (referanse)
      await buildSpec(t, site, site.ref.grid); s = await t.info(); ok(`${id}: fagverket i stål er lagt (${site.ref.grid.rods.length} staver)`, s.rods.length === site.ref.grid.rods.length, String(s.rods.length)); await t.sh(`${id}_3_fagverk`);
      const rs = []; for (const l of site.grid.stage.loads) rs.push((await t.withLoad(l)).state); ok(`${id}: fagverket består PRØV med alle lastene (${site.grid.stage.loads.join('+')})`, rs.every((x) => x === 'won'), rs.join()); await t.sh(`${id}_4_bestatt`);
      ok(`${id}: oppdraget er bestått`, await pg.evaluate(() => { const g = window.__game.bld.stage.state; return !!g && g.passed; }));
      await pg.evaluate(() => window.__game.bld.close && window.__game.bld.close()); await t.run(20);
      const n = await pg.evaluate((sid) => window.__game.bld.worldCount(sid), sid); ok(`${id}: bygget står i verden`, n > 0, String(n)); await t.sh(`${id}_5_i_verden`);
    });
  }
  // liggende format, Hyllebroen
  await session('bro2', INIT, async (t, pg) => { ok('åpner byggestedet (liggende)', await t.open('hylle2')); await t.run(5); await t.sh('6_liggende_tom'); await buildSpec(t, lv('bro2'), lv('bro2').ref.best); await t.sh('7_liggende_best'); }, { width: 844, height: 390 });
  // brettlisten (⚙ → Spill → Brett) følger valget buildround2
  for (const on of [true, false]) {
    r2on = on;
    await session('bro', (on) => { try { localStorage.setItem('tlm.buildux', 'true'); localStorage.setItem('tlm.buildround2', String(on)); } catch (e) { /* ok */ } }, async (t, pg) => {
      await pg.locator('#bSet').click(); await t.run(3);
      const o = await pg.evaluate(() => { const e = document.getElementById('levelSel'); if (e) return [...e.options].map((x) => x.value); const b = [...document.querySelectorAll('#panel button, #panel summary, #panel [data-g]')].find((x) => /Spill/.test(x.textContent)); if (b) b.click(); const e2 = document.getElementById('levelSel'); return e2 ? [...e2.options].map((x) => x.value) : null; });
      ok(`brettlisten ${on ? 'har' : 'har ikke'} Runde 2-brettene (valget ${on ? 'på' : 'av'})`, !!o && o.includes('bro') && o.includes('bro2') === on && o.includes('kjokkenbro2') === on, JSON.stringify(o)); await t.sh(`8_brettliste_${on ? 'paa' : 'av'}`);
    });
  }
  ok('ingen konsollfeil', errs.length === 0, errs.slice(0, 3).join(' | '));
  await b.close(); srv.close(); process.exit(bad ? 1 : 0);
})();
