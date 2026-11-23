// R132: spøkelsesbro i verden og oppdragskort ved BYGG-knappen på mobil (iPhone 14 stående og liggende, Playwright): Hyllebroen (bro), Trapp, Vippe og Byggeskolen (sted 2 trapp, sted 3 vippe, sted 1 bro).
// Sjekker omriss (2 tegnekall, ingen skygge), kort med oppdrag, krymping etter BYGG, skjult når bestått/langt unna/valget av/Ekspert uten hjelp. node tools/live_buildghostw.cjs <utmappe> [port]. Ingen FPS-krav (ingen GPU).
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..'), out = process.argv[2] || '.', port = +(process.argv[3] || 8471);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); const p = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f; if (!fs.existsSync(p)) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(p).pipe(r); });

(async () => {
  await new Promise((r) => srv.listen(port, r));
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  let bad = 0; const ok = (k, c, d = '') => { console.log(c ? 'ok  ' : 'FEIL', k, d); if (!c) bad++; };
  const cases = [['bro', null, 'hylle', 'bridge'], ['trapp', null, 'trapp', 'stairs'], ['vippe', null, 'vippe', 'seesaw'], ['bygglab', 'lab1', 'skole1', 'bridge'], ['bygglab', 'lab2', 'skole2', 'stairs'], ['bygglab', 'lab3', 'skole3', 'seesaw']];
  for (const [fmt, opts] of [['st', devices['iPhone 14']], ['li', devices['iPhone 14 landscape']]]) {
    for (const [lvl, siteId, tag, kind] of cases.filter((c) => fmt === 'st' || ['bro', 'skole3'].includes(c[2]))) {
      const ctx = await b.newContext({ ...opts }), pg = await ctx.newPage(), errs = [];
      pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
      await pg.addInitScript(() => { try { localStorage.setItem('tlm.labstart', 'false'); localStorage.setItem('tlm.intro', '0'); } catch (e) { /* */ } });
      await pg.goto(`http://localhost:${port}/?level=${lvl}`);
      await pg.waitForFunction(() => window.__game && window.__game.LEVEL.buildSites, null, { timeout: 60000 });
      const run = (n) => pg.evaluate((n) => window.__game.tick(n, 1 / 60), n);
      const sh = async (n) => { await pg.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await pg.screenshot({ path: `${out}/ghostw_${tag}_${fmt}_${n}.png` }); };
      const place = (dx, dz = 4) => pg.evaluate(([dx, dz, sid]) => { const g = window.__game, s = g.LEVEL.buildSites.find((q) => !sid || q.id === sid) || g.LEVEL.buildSites[0]; Object.assign(g.player, { x: s.x + dx, y: s.y + 0.2, z: s.z + dz, vx: 0, vy: 0, vz: 0, onGround: true }); return s.id; }, [dx, dz, siteId]);
      await run(30);
      const id = await place(-9, 7); await pg.evaluate(() => { const g = window.__game, s = g.LEVEL.buildSites.find((q) => q.id === g.bld.ghostStats().shown) || g.LEVEL.buildSites[0]; g.cam.yaw = Math.atan2(g.player.x - s.x, g.player.z - s.z); }); await run(60);
      const st = await pg.evaluate(() => window.__game.bld.ghostStats());
      ok(`${lvl}/${tag} ${fmt}: spøkelsesbro vises (${id}, ${kind})`, st.shown === id && st.kind === kind && st.draw === 1 && st.shadow === 0 && st.tris <= 72, JSON.stringify(st));
      const card = await pg.evaluate(() => { const e = document.getElementById('btnBuildCard'); return { t: e.innerText, vis: getComputedStyle(e).display, small: e.className, r: e.getBoundingClientRect().toJSON(), btn: document.getElementById('btnBuild').getBoundingClientRect().toJSON(), vw: innerWidth, vh: innerHeight }; });
      ok(`${lvl}/${tag} ${fmt}: oppdragskort med knappenavn og gap`, card.vis !== 'none' && /OPPDRAG/.test(card.t) && /Bygg en|Legg en/.test(card.t) && /BYGG/.test(card.t) && !/\[|tast/i.test(card.t) && card.r.right <= card.vw && card.r.bottom <= card.vh, JSON.stringify(card));
      const box = await pg.evaluate(() => { const g = window.__game; return { b: g.bld.ghostBox(g.camera), c: document.getElementById('btnBuildCard').getBoundingClientRect().toJSON(), vw: innerWidth, vh: innerHeight }; });
      // skjermboks: NDC -> px; omrisset må ligge (helt eller delvis) i bildet og kortet skal ikke dekke det
      const px = box.b && { l: (box.b.x0 + 1) / 2 * box.vw, r: (box.b.x1 + 1) / 2 * box.vw, t: (1 - box.b.y1) / 2 * box.vh, bt: (1 - box.b.y0) / 2 * box.vh };
      const vis = px && box.b.inFront > 0.9 && px.r > 0 && px.l < box.vw && px.bt > 0 && px.t < box.vh;
      const inter = px ? Math.max(0, Math.min(px.r, box.c.right) - Math.max(px.l, box.c.left)) * Math.max(0, Math.min(px.bt, box.c.bottom) - Math.max(px.t, box.c.top)) : 0, area = px ? Math.max(1, (px.r - px.l) * (px.bt - px.t)) : 1;
      ok(`${lvl}/${tag} ${fmt}: omrisset er i kamerabildet`, !!vis, JSON.stringify({ px, inFront: box.b && box.b.inFront }));
      ok(`${lvl}/${tag} ${fmt}: kortet dekker under 45 % av omrisset`, inter / area < 0.45, `${(inter / area * 100).toFixed(0)} %`);
      await sh('1_naer');
      for (let i = 0; i < 4; i++) { await place(-12, 30); await run(10); }
      const far = await pg.evaluate(() => ({ g: window.__game.bld.ghostStats().shown, v: getComputedStyle(document.getElementById('btnBuildCard')).display }));
      ok(`${lvl}/${tag} ${fmt}: borte når du går langt unna`, far.g === null && far.v === 'none', JSON.stringify(far));
      await place(-9, 7); await run(40);
      await pg.evaluate(() => window.__game.bld.open()); await run(4);
      const hid = await pg.evaluate(() => window.__game.bld.ghostStats().shown); ok(`${lvl}/${tag} ${fmt}: skjult i byggeskjermen`, hid === null, String(hid));
      await pg.evaluate(() => window.__game.bld.close('test')); for (let i = 0; i < 8; i++) { await place(-9, 7); await run(20); if (await pg.evaluate(() => getComputedStyle(document.getElementById('btnBuildCard')).display !== 'none')) break; }   // BYGG vises bare med føttene i bakken
      const sm = await pg.evaluate(() => { const e = document.getElementById('btnBuildCard'); return { c: e.className, t: e.innerText, vis: getComputedStyle(e).display }; });
      ok(`${lvl}/${tag} ${fmt}: kortet krymper etter første BYGG`, sm.c === 'small' && sm.vis !== 'none' && sm.t.length < 40, JSON.stringify(sm));
      await sh('2_etter_bygg');
      if (fmt === 'st') {   // bestått: borte; valget av; Ekspert uten hjelp
        await pg.evaluate((sid) => window.__game.bld.stage.markPassed(sid), id); await run(40);
        ok(`${lvl}/${tag}: borte når stedet er bestått`, (await pg.evaluate(() => window.__game.bld.ghostStats().shown)) === null);
      }
      ok(`${lvl}/${tag} ${fmt}: ingen konsollfeil`, errs.length === 0, errs.slice(0, 3).join(' | '));
      if (fmt === 'st' && tag === 'hylle') {
        await pg.evaluate(() => { localStorage.setItem('tlm.difficulty', '"expert"'); localStorage.setItem('tlm.helplevel', '"none"'); });
        await pg.reload(); await pg.waitForFunction(() => window.__game && window.__game.LEVEL.buildSites, null, { timeout: 60000 }); await run(30); await place(-8); await run(40);
        ok('bro: Ekspert uten hjelp: skjult', (await pg.evaluate(() => window.__game.bld.ghostStats().shown)) === null);
        await pg.evaluate(() => { localStorage.setItem('tlm.difficulty', '"medium"'); localStorage.setItem('tlm.helplevel', '"normal"'); localStorage.setItem('tlm.buildghostworld', 'false'); });
        await pg.reload(); await pg.waitForFunction(() => window.__game && window.__game.LEVEL.buildSites, null, { timeout: 60000 }); await run(30); await place(-8); await run(40);
        ok('bro: valget av: ingen omriss og ingen kort', (await pg.evaluate(() => window.__game.bld.ghostStats().shown)) === null && (await pg.evaluate(() => getComputedStyle(document.getElementById('btnBuildCard')).display)) === 'none');
      }
      await ctx.close();
    }
  }
  await b.close(); srv.close(); console.log(bad ? `${bad} FEIL` : 'alt ok'); process.exit(bad ? 1 : 0);
})();
