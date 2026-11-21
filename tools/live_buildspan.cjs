// R118: FRA og TIL ved byggestedet på mobil (iPhone 14 stående og liggende, Playwright): bilder nær og på middels avstand i Hyllebroen, Kjøkkenbroen, Trapp og Byggeskolen (sted 3),
// BYGG-knappen med navn og gap, byggeskjermen med FRA/TIL-etiketter, ingen skygge og høyst 8 tegnekall for markørene, skjult på Ekspert uten hjelp og med valget av.
// node tools/live_buildspan.cjs <utmappe> [port]   (playwright via NODE_PATH; miljøet har ingen GPU: ingen FPS-krav). Exit 1 ved feil.
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..'), out = process.argv[2] || '.', port = +(process.argv[3] || 8471);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); const p = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f; if (!fs.existsSync(p)) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(p).pipe(r); });
(async () => {
  await new Promise((r) => srv.listen(port, r));
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  let bad = 0; const ok = (k, c, d = '') => { console.log(c ? 'ok  ' : 'FEIL', k, d); if (!c) bad++; };
  const cases = [['bro', null, 'hylle'], ['kjokkenbro', null, 'kjokken'], ['trapp', null, 'trapp'], ['bygglab', 'lab3', 'skole3']];
  for (const [fmt, opts] of [['st', devices['iPhone 14']], ['li', devices['iPhone 14 landscape']]]) {
    for (const [lvl, siteId, tag] of cases.filter((c) => fmt === 'st' || !process.env.SPAN_ONLY || process.env.SPAN_ONLY.split(',').includes(c[0]))) {
      const ctx = await b.newContext({ ...opts }), pg = await ctx.newPage(), errs = [];
      pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
      await pg.addInitScript(() => { try { localStorage.setItem('tlm.labstart', 'false'); localStorage.setItem('tlm.intro', '0'); } catch (e) { /* */ } });
      await pg.goto(`http://localhost:${port}/?level=${lvl}`);
      await pg.waitForFunction(() => window.__game && window.__game.LEVEL.buildSites, null, { timeout: 60000 });
      const run = (n) => pg.evaluate((n) => window.__game.tick(n, 1 / 60), n);
      const sh = async (n) => { await pg.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await pg.screenshot({ path: `${out}/span_${tag}_${fmt}_${n}.png` }); };
      const place = (dx, dz = 4) => pg.evaluate(([dx, dz, sid]) => { const g = window.__game, s = g.LEVEL.buildSites.find((q) => !sid || q.id === sid) || g.LEVEL.buildSites[0]; Object.assign(g.player, { x: s.x + dx, y: s.y + 0.2, z: s.z + dz, vx: 0, vy: 0, vz: 0, onGround: true }); g.cam.yaw = Math.atan2(-(s.x - g.player.x), -(s.z - g.player.z)); return s.id; }, [dx, dz, siteId]);
      await run(30);
      const id = await place(-9, 7); await run(40);
      const st = await pg.evaluate(() => window.__game.bld.spanStats());
      ok(`${lvl} ${fmt}: markørene vises nær stedet (${id})`, st.shown === id && st.draw > 0 && st.draw <= 8 && st.shadow === 0, JSON.stringify(st));
      const txt = await pg.evaluate(() => ({ b: document.getElementById('btnBuild').innerText, s: document.getElementById('btnBuildSpan').innerText, vis: getComputedStyle(document.getElementById('btnBuild')).display }));
      ok(`${lvl} ${fmt}: BYGG-knappen har stedsnavn og FRA/TIL-rad med gap`, txt.vis !== 'none' && /BYGG/.test(txt.b) && /FRA/.test(txt.s) && /TIL/.test(txt.s) && /gap/.test(txt.s), JSON.stringify(txt));
      await sh('1_naer');
      await place(-12, 15); await run(40); await sh('2_middels');
      await place(-9, 7); await run(40);
      const log = await pg.evaluate(() => (window.__game.events || window.__game.log || []).length);
      // byggeskjermen
      await pg.evaluate(() => window.__game.bld.open()); await run(4); await sh('3_byggeskjerm');
      const hid = await pg.evaluate(() => window.__game.bld.spanStats().shown); ok(`${lvl} ${fmt}: markørene skjules i byggeskjermen`, hid === null, String(hid));
      await pg.evaluate(() => window.__game.bld.close('test')); await run(40);
      ok(`${lvl} ${fmt}: ingen konsollfeil`, errs.length === 0, errs.slice(0, 3).join(' | '));
      if (fmt === 'st' && lvl === 'bro') {   // Ekspert uten hjelp og valget av
        await pg.evaluate(() => { localStorage.setItem('tlm.difficulty', '"expert"'); localStorage.setItem('tlm.helplevel', '"none"'); });
        await pg.reload(); await pg.waitForFunction(() => window.__game && window.__game.LEVEL.buildSites, null, { timeout: 60000 }); await run(30); await place(-8); await run(40);
        ok('bro: Ekspert uten hjelp: markørene er skjult', (await pg.evaluate(() => window.__game.bld.spanStats().shown)) === null);
        await pg.evaluate(() => { localStorage.setItem('tlm.difficulty', '"medium"'); localStorage.setItem('tlm.helplevel', '"normal"'); localStorage.setItem('tlm.buildfromto', 'false'); });
        await pg.reload(); await pg.waitForFunction(() => window.__game && window.__game.LEVEL.buildSites, null, { timeout: 60000 }); await run(30); await place(-8); await run(40);
        ok('bro: valget av: ingen markører og ingen rad', (await pg.evaluate(() => window.__game.bld.spanStats().shown)) === null && (await pg.evaluate(() => getComputedStyle(document.getElementById('btnBuildSpan')).display)) === 'none');
      }
      await ctx.close();
    }
  }
  await b.close(); srv.close(); console.log(bad ? `${bad} FEIL` : 'alt ok'); process.exit(bad ? 1 : 0);
})();
