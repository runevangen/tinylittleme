// 05_stigende_vann (shotlist.json): bad2 med stigende vann (rask, x2.5). Figuren (den ekte boten, bane per tikk fra tools/cine_route.mjs) klatrer fra vaskekurvens topp opp badekape_bla til knaggrekka mens vannet stiger.
// Spoling: 15 tikk (0,25 s) spillid per bilde, dvs. 3x sanntid; vannet forhåndskjøres 21 s så det står på ca. 7 enheter ved klippstart og når maks (14) mot slutten.
// Merk: i kinomodus leser store.get() bare standardene, så localStorage (tlm.flood) virker ikke. Valgene settes derfor med cine.set('flood' | 'floodrate'); localStorage-feltet under er bare med for fullstendighetens skyld.
const fs = require('fs'), path = require('path'), cp = require('child_process');
const ROOT = path.resolve(__dirname, '..', '..', '..');
const T0 = 840, PER = 15, PRE = 1260;   // rutetikk ved klippstart, tikk per bilde, forhåndskjøring av vannet (21 s)
const A = { x: -3.5, y: 14.5, z: 9.5, tx: 6.5, ty: 12.8, tz: 7.5, fov: 50 };
const B = { x: -5.5, y: 20.5, z: 8.5, tx: 8.8, ty: 20.3, tz: 7, fov: 60 };
module.exports = {
  id: '05_stigende_vann',
  ticksPerFrame: 0.0001,   // lib-steget gjør ingenting (floor = 0 tikk); frame() stegger selv sammen med ruta
  localStorage: { 'tlm.flood': 'rask', 'tlm.floodrate': '2.5' },
  async setup({ cine, page }) {
    const out = path.join(require('os').tmpdir(), 'tlm_bad2_route.json');
    if (!fs.existsSync(out)) cp.execFileSync('node', [path.join(ROOT, 'tools', 'cine_route.mjs'), path.join(ROOT, 'levels', 'bad2.level.json'), 'ruta', '--every', '1', '--out', out], { cwd: ROOT, stdio: 'ignore' });
    const trace = JSON.parse(fs.readFileSync(out, 'utf8')).trace;
    await cine.seed(1);
    await cine.set('flood', 'rask'); await cine.set('floodrate', 2.5);
    await cine.setHero({ x: 1.7, y: 12, z: 11.4, yaw: 0 });
    await page.evaluate((n) => { const g = window.__game; g.variant.restartFlood && g.variant.restartFlood(); g.cine.step(n, 1 / 60); }, PRE);
    await page.evaluate(async (tr) => { window.__route = await window.__game.cine.runRoute(tr); window.__route.seek(tr.length ? 0 : 0); }, trace);
    await page.evaluate((t0) => window.__route.seek(t0), T0);
  },
  async frame({ cine, page }, i, n) {
    const t = n > 1 ? i / (n - 1) : 0;
    if (i > 0) await page.evaluate((k) => { const r = window.__route, c = window.__game.cine; const p = window.__game.player; for (let j = 0; j < k; j++) { p.state = 'air'; c.step(1, 1 / 60); r.advance(1); } }, PER);
    await cine.setCam(await cine.lerpCam(A, B, t, 'smooth'));
  },
};
