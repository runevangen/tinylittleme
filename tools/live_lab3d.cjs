// R130: 3D-laben på mobil (iPhone 14, Playwright): ?level=bygglab&lab3d=1 åpner 3D-laben, hurtigvisninger, lag ◀ ▶, bygg med berøring (trykk punkt + trykk knute), SÅ SLIK, PRØV (flat bro feiler, tetraeder-bro består),
// belastningsfarger, bygget står i rommet etter TILBAKE, ingen konsollfeil. Skjermbilder i utmappa. Ingen GPU (swiftshader): ingen FPS-krav, prøven kjøres med en gang (runAll).
// node tools/live_lab3d.cjs <utmappe>   (server startes selv; playwright via NODE_PATH). Exit 1 ved feil.
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..'), out = process.argv[2] || '.';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(r); });
(async () => {
  await new Promise((ok) => srv.listen(0, ok)); const port = srv.address().port;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  let bad = 0; const ok = (k, c, d = '') => { console.log(c ? 'ok  ' : 'FEIL', k, d); if (!c) bad++; };
  for (const [name, opts] of [['staaende', devices['iPhone 14']], ['liggende', devices['iPhone 14 landscape']]]) {
    const ctx = await b.newContext({ ...opts }), pg = await ctx.newPage(), errs = [];
    pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await pg.goto(`http://localhost:${port}/?level=bygglab&lab3d=1`);
    await pg.waitForFunction(() => window.__game && window.__game.LEVEL && window.__game.lab3d, null, { timeout: 90000 });
    const run = (n) => pg.evaluate((n) => window.__game.tick(n, 1 / 60), n);
    await run(120);
    const L = () => pg.evaluate(() => window.__game.lab3d);
    const sh = async (n) => { await pg.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await pg.screenshot({ path: `${out}/lab3d_${name}_${n}.png` }); };
    const open = await pg.evaluate(() => document.body.classList.contains('lab3d'));
    ok(`${name}: 3D-laben er åpen`, open);
    const cvBox = async () => { const r = await pg.locator('#lab3d canvas').boundingBox(); return r; };
    const proj = (p) => pg.evaluate((p) => { const c = window.__game.lab3d.ctl, cv = document.querySelector('#lab3d canvas'), r = cv.getBoundingClientRect(); return import('./grid3d_cam.js').then((C) => { const q = C.project(c.cam, p, r.width, r.height); return { x: r.x + q.x, y: r.y + q.y }; }); }, p);
    const tapPt = async (p) => { const q = await proj(p); await pg.touchscreen.tap(q.x, q.y); await pg.waitForTimeout(60); };
    const click = async (sel) => { const r = await pg.locator(sel).first().boundingBox(); await pg.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); await pg.waitForTimeout(60); };
    const btns = await pg.evaluate(() => [...document.querySelectorAll('#lab3d button')].filter((b) => b.offsetParent).map((b) => { const r = b.getBoundingClientRect(); return { t: b.textContent, w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y), r: Math.round(r.right), bt: Math.round(r.bottom) }; }));
    const vp = pg.viewportSize();
    ok(`${name}: knappene er store nok (minst 40 px) og innenfor skjermen`, btns.length >= 12 && btns.every((q) => q.h >= 40 && q.w >= 40 && q.x >= 0 && q.r <= vp.width + 1 && q.bt <= vp.height + 1), JSON.stringify(btns.filter((q) => q.h < 40 || q.w < 40 || q.r > vp.width + 1 || q.bt > vp.height + 1)));
    const noKeys = await pg.evaluate(() => !/\b(tast|Space|Enter|WASD)\b/i.test(document.querySelector('#lab3d').textContent));
    ok(`${name}: teksten nevner ikke taster`, noKeys);
    await sh('0_start');
    // hurtigvisninger
    for (const v of ['side', 'topp', '3d', 'foran']) { await click(`#lab3d [data-l="view:${v}"]`); const cur = await pg.evaluate(() => window.__game.lab3d.ctl.cam.view); ok(`${name}: visning ${v}`, cur === v, cur); if (v === 'topp' || v === 'side') await sh('1_' + v); }
    // dra for å rotere, klyp for å zoome (CDP-berøring)
    const cb = await cvBox(); const cx = cb.x + cb.width / 2, cy = cb.y + cb.height / 2;
    const cdp = await ctx.newCDPSession(pg); const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x: p[0], y: p[1], id: i })) });
    const y0 = await pg.evaluate(() => window.__game.lab3d.ctl.cam.yaw);
    await touch('touchStart', [[cx, cy]]); for (let i = 1; i <= 6; i++) await touch('touchMove', [[cx + i * 12, cy + i * 4]]); await touch('touchEnd', []);
    const y1 = await pg.evaluate(() => window.__game.lab3d.ctl.cam.yaw); ok(`${name}: dra med én finger roterer`, Math.abs(y1 - y0) > 0.2, `${y0.toFixed(2)} -> ${y1.toFixed(2)}`);
    const z0 = await pg.evaluate(() => window.__game.lab3d.ctl.cam.zoom);
    await touch('touchStart', [[cx - 30, cy], [cx + 30, cy]]); for (let i = 1; i <= 6; i++) await touch('touchMove', [[cx - 30 - i * 10, cy], [cx + 30 + i * 10, cy]]); await touch('touchEnd', []);
    const z1 = await pg.evaluate(() => window.__game.lab3d.ctl.cam.zoom); ok(`${name}: klyp zoomer`, z1 > z0 * 1.3, `${z0.toFixed(2)} -> ${z1.toFixed(2)}`);
    await click('#lab3d [data-l="view:3d"]'); await pg.evaluate(() => { const c = window.__game.lab3d.ctl; c.cam.zoom = 1; });
    await click('#lab3d [data-l="view:foran"]');
    // lag ◀ ▶
    const li0 = await pg.evaluate(() => window.__game.lab3d.ctl.layerInfo()); await click('#lab3d [data-l="lnext"]'); const li1 = await pg.evaluate(() => window.__game.lab3d.ctl.layerInfo());
    ok(`${name}: LAG ▶ bytter dybde`, li1.value > li0.value, JSON.stringify([li0, li1])); await click('#lab3d [data-l="lprev"]');
    // flat bro i ett lag (z = 0): feiler
    await pg.evaluate(() => window.__game.lab3d.ctl.setLayer(0));
    for (const x of [2, 4, 6]) { await tapPt({ x, y: -2, z: 0 }); await tapPt({ x, y: -2, z: 0 }); }   // første trykk legger knuten og velger den, andre trykk fjerner valget
    const nF = await pg.evaluate(() => window.__game.lab3d.ctl.status().nodes); ok(`${name}: trykk på lyse punkt legger knuter (3)`, nF === 3, String(nF));
    // staver med berøring: knute -> knute
    const ids = await pg.evaluate(() => window.__game.lab3d.ctl.B.rg.nodes.filter((n) => !n.fixed && !n.deck).map((n) => n.id));
    await tapPt({ x: 2, y: -2, z: 0 }); await tapPt({ x: 0, y: 0, z: 0 });   // k0 - a1
    await tapPt({ x: 6, y: -2, z: 0 }); await tapPt({ x: 8, y: 0, z: 0 });   // k2 - a2
    await tapPt({ x: 2, y: -2, z: 0 }); await tapPt({ x: 4, y: -2, z: 0 }); await tapPt({ x: 4, y: -2, z: 0 }); await tapPt({ x: 6, y: -2, z: 0 });
    await tapPt({ x: 2, y: -2, z: 0 }); await tapPt({ x: 2, y: 0, z: 0 }); await tapPt({ x: 6, y: -2, z: 0 }); await tapPt({ x: 6, y: 0, z: 0 });
    await tapPt({ x: 4, y: -2, z: 0 }); await tapPt({ x: 4, y: 0, z: 0 });
    const nR = await pg.evaluate(() => window.__game.lab3d.ctl.status().rods); ok(`${name}: to trykk (knute, knute) lager en stav`, nR === 7, String(nR));
    await sh('2_flat');
    await click('#lab3d [data-l="try"]'); await pg.evaluate(() => { window.__game.lab3d.ctl.runAll(); window.__game.lab3d.finished(); window.__game.lab3d.redraw(); });
    let last = await pg.evaluate(() => window.__game.lab3d.ctl.last); ok(`${name}: flat bro (ett lag) velter`, last && !last.passed && last.reason === 'fall', JSON.stringify(last));
    const m1 = await pg.evaluate(() => document.querySelector('#lab3d .msg').textContent); ok(`${name}: rådet nevner lag`, /lag/i.test(m1), m1);
    await sh('3_flat_feilet');
    // nullstill og bygg med guide (SÅ SLIK) via berøring
    await click('#lab3d [data-l="try"]'); await click('#lab3d [data-l="reset"]');
    await click('#lab3d [data-l="guide"]'); await sh('4_guide');
    let steps = 0;
    for (let g = 0; g < 40; g++) {
      const nx = await pg.evaluate(() => { const c = window.__game.lab3d.ctl; const n = c.guideNext(); if (!n || n.done) return null; c.guideGo(); const G = c.B.rg; const q = (id) => G.nodes.find((x) => x.id === id); return n.k === 'node' ? { k: 'node', p: n.p } : { k: 'rod', a: q(n.a), b: q(n.b) }; });
      if (!nx) break; steps++;
      await pg.evaluate(() => window.__game.lab3d.ctl.setView('foran'));
      const sel = await pg.evaluate(() => window.__game.lab3d.ctl.sel);
      if (nx.k === 'node') { if (sel) { await tapPt(nx.p); await tapPt(nx.p); } else await tapPt(nx.p); }
      else if (sel === nx.a.id) await tapPt(nx.b); else if (sel === nx.b.id) await tapPt(nx.a); else { await tapPt(nx.a); await tapPt(nx.b); }
      if (steps === 3) await sh('5_guide_mid');
    }
    const prog = await pg.evaluate(() => window.__game.lab3d.ctl.guideProgress()); ok(`${name}: guiden bygges ferdig med berøring`, prog.n === prog.of, JSON.stringify(prog));
    await pg.evaluate(() => window.__game.lab3d.ctl.setView('3d')); await sh('6_bygget_3d');
    await click('#lab3d [data-l="try"]');
    // litt ekte tid på fysikk (swiftshader er sakte), så resten
    await pg.waitForTimeout(300); await pg.evaluate(() => { const c = window.__game.lab3d.ctl; if (c.state === 'run') { for (let i = 0; i < 90; i++) { c.sim.step(); c.peaks.feed(c.sim.axial(), c.sim.t); } window.__game.lab3d.redraw(); } }); await sh('7_prove_midt');
    await pg.evaluate(() => { window.__game.lab3d.ctl.runAll(); window.__game.lab3d.finished(); window.__game.lab3d.redraw(); }); await pg.waitForTimeout(200);
    last = await pg.evaluate(() => window.__game.lab3d.ctl.last); ok(`${name}: tetraeder-bro består`, last && last.passed, JSON.stringify(last)); await sh('8_bestatt');
    const rx = await pg.evaluate(() => { const f = window.__game.lab3d.ctl.frame(390, 500); return { colored: f.rods.filter((r) => !r.deck && r.ratio != null).length, ratios: f.rods.filter((r) => !r.deck).map((r) => +(r.ratio || 0).toFixed(2)) }; });
    ok(`${name}: staver har belastningsfarge etter PRØV`, rx.colored >= 9, JSON.stringify(rx));
    const inRoom = await pg.evaluate(() => { let n = 0; const g = window.__game.scene; return g ? 1 : 0; }); void inRoom;
    await click('#lab3d [data-l="back"]'); await run(30);
    const closed = await pg.evaluate(() => !document.body.classList.contains('lab3d')); ok(`${name}: TILBAKE lukker laben`, closed);
    const st = await pg.evaluate(() => { const g = window.__game.scene; let n = 0, g3 = null; g && g.traverse((o) => { if (o.name === 'lab3d') g3 = o; }); return g3 ? g3.children.length : -1; });
    ok(`${name}: bygget står i rommet (tegnet)`, st > 10, String(st));
    await sh('9_rommet');
    await pg.evaluate(() => { const g = window.__game.scene; });
    ok(`${name}: ingen konsollfeil`, errs.length === 0, errs.join(' | ').slice(0, 300));
    await ctx.close();
  }
  await b.close(); srv.close(); console.log(bad ? `live_lab3d: ${bad} feil` : 'live_lab3d: ok'); process.exit(bad ? 1 : 0);
})();
