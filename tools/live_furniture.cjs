// R182: møbelmalene i ekte spill (iPhone 14, Playwright): alle åtte malene i en liten testscene (laget av tools/scene2level.mjs, servert som brettet «furntest»), skjermbilder.
// node tools/live_furniture.cjs <utmappe> [port]   (server på porten, f.eks. python3 -m http.server 8365; playwright via NODE_PATH). Ekte FPS/følelse: testes på iPhone.
const { chromium, devices } = require('playwright');
const fs = require('fs'), { execFileSync } = require('child_process');
(async () => {
  const out = process.argv[2] || '.', port = process.argv[3] || 8365;
  const o = (id, kind, material, color, box, extra = {}) => ({ id, kind, material, color, box, confidence: 1, photos: [], ...extra });
  const scene = { name: 'Møbeltest', units: 'cm', validate: true, rev: 1, source: { photos: 0, views: [], interpreted_by: 'testscene R182', uncertainty: 'ingen' },
    room: { width: 700, depth: 400, height: 260, floor: { material: 'wood', color: '#c99a62' }, walls: { material: 'plaster', color: '#e9d7b0' }, ceiling: { material: 'plaster', color: '#f6efe0' } },
    start: { x: 350, z: 360 }, goal: { x: 100, y: 85, z: 80, on: 'sofa' },
    objects: [
      o('sofa', 'sofa', 'fabric', '#b3452f', [20, 220, 0, 85, 10, 100], { face: 'N' }),
      o('seng', 'bed', 'fabric', '#3f6fa8', [460, 640, 0, 100, 10, 220], { face: 'N' }),
      o('skrivebord', 'desk', 'wood', '#b88a58', [260, 400, 0, 74, 10, 80], { face: 'N' }),
      o('bord', 'table', 'wood', '#9a6a3c', [40, 160, 0, 45, 150, 230]),
      o('hylle', 'shelf_unit', 'wood', '#a87a48', [230, 310, 0, 180, 120, 150], { face: 'N' }),
      o('lampe', 'lamp', 'fabric', '#f2e2b0', [330, 360, 0, 150, 130, 160]),
      o('puff', 'pouffe', 'fabric', '#5a8f6a', [200, 245, 0, 40, 180, 225]),
      o('koffert', 'suitcase', 'plastic', '#2f7f9e', [400, 445, 0, 65, 270, 295], { face: 'S' }),
    ] };
  fs.writeFileSync('/tmp/furntest.scene.json', JSON.stringify(scene)); execFileSync('node', ['tools/scene2level.mjs', '/tmp/furntest.scene.json', '/tmp/furntest.level.json'], { stdio: 'pipe' });
  const lvl = fs.readFileSync('/tmp/furntest.level.json', 'utf8');
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ ...devices['iPhone 14'] });
  const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await pg.route('**/levels/furntest.level.json*', (r) => r.fulfill({ contentType: 'application/json', body: lvl }));
  await pg.addInitScript(() => { try { localStorage.setItem('tlm.cues', 'true'); localStorage.setItem('tlm.introsweep', 'false'); localStorage.setItem('tlm.camdist', '20'); localStorage.setItem('tlm.camassist', 'false'); } catch {} });
  await pg.goto(`http://localhost:${port}/?level=furntest&start=0`);
  try { await pg.waitForFunction(() => window.__game && window.__game.LEVEL, null, { timeout: 240000 }); } catch (e) { console.log('STARTET IKKE: ' + errs.slice(0, 4).join(' | ')); await b.close(); process.exit(1); }
  await pg.evaluate(() => { window.__paused = true; });
  const run = (n) => pg.evaluate((n) => window.__game.tick(n, 1 / 60), n);
  await pg.touchscreen.tap(195, 420); await run(30);
  const stats = await pg.evaluate(() => { const g = window.__game; return { furn: g.LEVEL.boxes.filter((b) => ['sofa', 'bed', 'desk', 'table', 'shelf_unit', 'lamp', 'pouffe', 'suitcase'].includes(b.kind)).map((b) => [b.id, b.kind, b.face || '-'].join(':')).join(' '), calls: g.renderer ? g.renderer.info.render.calls : null, tris: g.renderer ? g.renderer.info.render.triangles : null }; });
  console.log(JSON.stringify(stats));
  const put = (x, y, z, fx, fz) => pg.evaluate(([x, y, z, fx, fz]) => { const p = window.__game.player; p.x = x; p.y = y; p.z = z; p.vx = p.vz = p.vy = 0; p.onGround = true; p.fx = fx; p.fz = fz; }, [x, y, z, fx, fz]);
  const sh = async (n) => { await run(3); await pg.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await pg.screenshot({ path: `${out}/furn_${n}.png`, timeout: 180000 }); };
  await sh('0_start');
  const J = (id) => pg.evaluate((id) => { const b = window.__game.LEVEL.boxes.find((q) => q.id === id); return { x: (b.min[0] + b.max[0]) / 2, zmin: b.min[2], zmax: b.max[2] }; }, id);
  // figuren står på gulvet foran møbelet (sør for det og ser nordover; kofferten og puffen sett fra nord), kameraet følger bak
  for (const [id, n, north, dist] of [['sofa', 1], ['seng', 2], ['skrivebord', 3], ['hylle', 4], ['bord', 5], ['lampe', 6], ['puff', 7], ['koffert', 8, true], ['koffert', 9, true, 11]]) {
    const q = await J(id); await put(q.x, 0, north ? q.zmin - (dist || 22) : q.zmax + (dist || 22), 0, north ? 1 : -1); await run(25); await sh(`${n}_${id}`);
  }
  console.log(errs.length ? 'FEIL: ' + errs.slice(0, 3).join(' | ') : 'ingen konsollfeil');
  await b.close(); process.exit(errs.length ? 1 : 0);
})();
