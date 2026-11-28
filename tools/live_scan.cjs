// R194: skannet rom (GLB) i nettleser (Playwright, iPhone 14): lager en liten GLB selv (tools/glb_make.mjs), laster den inn med filvalget, får et brett, spiller og flyr i det,
// og sjekker at GLB-en vises som utseende (boksene skjules) og at ?scan=<sti> virker. Kjør: NODE_PATH=$(npm root -g) node tools/live_scan.cjs [skjermbildemappe]
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..'), out = process.argv[2] || '/tmp';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/json' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); const p = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
  if (!p.startsWith(root) || !fs.existsSync(p)) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(p).pipe(r); });
let errs = [];
(async () => {
  const { roomMesh, writeGLB } = await import('./glb_make.mjs'); const glb = writeGLB(roomMesh());
  await new Promise((ok) => srv.listen(0, ok)); const port = srv.address().port;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await (await b.newContext({ ...devices['iPhone 14'] })).newPage(); errs = [];
  pg.on('pageerror', (e) => errs.push(e.message)); const all = []; pg.on('console', (m) => { all.push(m.type() + ': ' + m.text().slice(0, 160)); if (m.type() === 'error' && !/ERR_TUNNEL_CONNECTION_FAILED/.test(m.text())) errs.push(m.text()); });   // tunnel-feil = nett utenfor localhost i sandkassen, ikke en spillfeil
  await pg.route('**/skann/test.glb', (rt) => rt.fulfill({ status: 200, contentType: 'model/gltf-binary', body: glb }));   // ?scan=<sti>: filen ligger ikke i repoet, bare i testen
  await pg.addInitScript(() => { try { if (!sessionStorage.getItem('init')) { sessionStorage.setItem('init', '1'); localStorage.setItem('tlm.bygging.moved', 'true'); localStorage.setItem('tlm.cleared', JSON.stringify({ 1: 100 })); localStorage.setItem('tlm.tcode', JSON.stringify('rune')); } } catch {} });
  await pg.goto(`http://localhost:${port}/`); await pg.waitForSelector('#mLevels', { timeout: 120000 });
  await pg.click('#mLevels', { noWaitAfter: true, timeout: 90000 }); await pg.waitForSelector('#mLed'); await pg.click('#mLed', { noWaitAfter: true, timeout: 90000 }); await pg.waitForSelector('#ledScan');
  await pg.screenshot({ path: `${out}/scan_menu.png`, fullPage: true });
  await pg.click('#ledScan', { noWaitAfter: true }); await pg.waitForSelector('#scFile', { state: 'attached' }); await pg.screenshot({ path: `${out}/scan_pick.png`, fullPage: true });
  // for stor fil og feil fil gir norsk melding
  await pg.evaluate(() => { const dt = new DataTransfer(); dt.items.add(new File([new ArrayBuffer(81 * 1048576)], 'stor.glb')); const i = document.getElementById('scFile'); i.files = dt.files; i.dispatchEvent(new Event('change')); });   // 81 MB, laget i siden await pg.waitForFunction(() => /for stor/.test(document.getElementById('ledMsg').textContent), null, { timeout: 30000 }); console.log('stor fil:', await pg.textContent('#ledMsg'));
  await pg.setInputFiles('#scFile', { name: 'tull.glb', mimeType: 'model/gltf-binary', buffer: Buffer.from('dette er ikke en glb') }); await pg.waitForFunction(() => /ikke leses som GLB/.test(document.getElementById('ledMsg').textContent), null, { timeout: 30000 }); console.log('feil fil:', await pg.textContent('#ledMsg'));
  await pg.click('#scCells [data-c="12"]'); await pg.click('#scCells [data-c="8"]');
  await pg.setInputFiles('#scFile', { name: 'Stua_mi.glb', mimeType: 'model/gltf-binary', buffer: glb });
  await pg.waitForSelector('#ledPlay', { timeout: 90000 }); await pg.screenshot({ path: `${out}/scan_result.png`, fullPage: true });
  console.log('resultat:', (await pg.textContent('#start .ledbox')).replace(/\s+/g, ' '), '|', await pg.inputValue('#ledName'));
  const stored = await pg.evaluate(() => new Promise((ok) => { const r = indexedDB.open('tlm-scan', 1); r.onsuccess = () => { const q = r.result.transaction('glb').objectStore('glb').count(); q.onsuccess = () => ok(q.result); }; r.onerror = () => ok(-1); })); console.log('GLB i IndexedDB:', stored); if (stored !== 1) errs.push('GLB ble ikke lagret lokalt');
  const net = []; pg.on('request', (r) => { if (!r.url().startsWith(`http://localhost:${port}`) && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) net.push(r.url()); });
  await pg.click('#ledPlay', { noWaitAfter: true }); await pg.waitForFunction(() => window.__game && window.__game.LEVEL && location.search.includes('mine-'), null, { timeout: 400000 }).catch(async (e) => { await pg.screenshot({ path: `${out}/scan_fail.png` }); console.log('url', pg.url(), 'feil', errs.slice(0, 5), '\nkonsoll', all.slice(-12).join('\n  ')); console.log('evlog', await pg.evaluate(() => (localStorage.getItem('tlm.evlog') || '').slice(-600))); throw e; });
  await pg.waitForFunction(() => (JSON.parse(localStorage.getItem('tlm.evlog') || '[]')).some((e) => /utseende lastet|utseende mangler|utseende feilet/.test(JSON.stringify(e))), null, { timeout: 60000 }).catch(() => {});
  await pg.waitForTimeout(4000); await pg.screenshot({ path: `${out}/scan_play.png` });
  const info = await pg.evaluate(() => { const L = window.__game.LEVEL; return { scan: L.scan, boxes: L.boxes.length, name: L.name, start: L.start, goal: L.goal }; }); console.log('brett', JSON.stringify(info));
  const vis = await pg.evaluate(() => { const sc = window.__game.scene; let n = 0, tri = 0; if (sc) sc.traverse((o) => { if (o.userData && o.userData.scan && o.isMesh) { n++; tri += o.geometry.index ? o.geometry.index.count / 3 : 0; } }); return { meshes: n, tris: tri, hasScene: !!sc }; }); console.log('utseende i scenen', JSON.stringify(vis));
  // GLB-en ligger på samme sted som kollisjonen: boksen rundt GLB-meshen (verdensrom, enheter) mot rommets mål i brettet, og mot den høyeste boksen (sofarygg)
  const fit = await pg.evaluate(() => { const sc = window.__game.scene, R = window.__game.LEVEL.room; let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9]; sc.updateMatrixWorld(true);
    sc.traverse((o) => { if (!(o.userData && o.userData.scan && o.isMesh)) return; const p = o.geometry.attributes.position, e = o.matrixWorld.elements; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const w = [e[0] * x + e[4] * y + e[8] * z + e[12], e[1] * x + e[5] * y + e[9] * z + e[13], e[2] * x + e[6] * y + e[10] * z + e[14]]; for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], w[k]); mx[k] = Math.max(mx[k], w[k]); } } });
    return { glbMin: mn.map((v) => +v.toFixed(2)), glbMax: mx.map((v) => +v.toFixed(2)), room: [R.x0, R.x1, R.z0, R.z1, R.height] }; });
  console.log('passer', JSON.stringify(fit)); { const g = fit.glbMin, h = fit.glbMax, r = fit.room; const nearV = (a, b) => Math.abs(a - b) < 1.5; if (!(nearV(g[0], r[0]) && nearV(h[0], r[1]) && nearV(g[2], r[2]) && nearV(h[2], r[3]) && g[1] < 1.5 && nearV(h[1], r[4]))) errs.push('GLB og brettet passer ikke: ' + JSON.stringify(fit)); }
  const ev = await pg.evaluate(() => JSON.parse(localStorage.getItem('tlm.evlog') || '[]').filter((e) => /skann/.test(JSON.stringify(e))).map((e) => JSON.stringify(e).slice(0, 200))); console.log('logg\n  ' + ev.join('\n  '));
  if (!vis.meshes) errs.push('ingen GLB-mesh i scenen (utseendet ble ikke lastet)');
  if (net.length) console.log('eksterne kall (ikke localhost):', net.slice(0, 5).join(' '));
  // fly rundt (uten tak): skjermbilde
  await pg.evaluate(() => window.__game.setMode && window.__game.setMode('fly')); await pg.waitForTimeout(2500); await pg.screenshot({ path: `${out}/scan_fly.png` });
  // ?scan=<sti>
  await pg.goto(`http://localhost:${port}/?scan=skann/test.glb`); await pg.waitForSelector('#ledPlay', { timeout: 150000 }); console.log('?scan: resultatskjerm', (await pg.inputValue('#ledName')));
  await pg.screenshot({ path: `${out}/scan_url.png`, fullPage: true });
  console.log(errs.length ? 'FEIL: ' + errs.slice(0, 4).join(' | ') : 'ingen konsollfeil'); await b.close(); srv.close(); process.exit(errs.length ? 1 : 0);
})().catch((e) => { console.error(e); console.error('konsollfeil før feilen:', typeof errs !== 'undefined' ? errs.slice(0, 5) : ''); process.exit(1); });
