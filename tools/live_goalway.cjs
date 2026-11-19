// R98: ekte nettleser (iPhone 14, Playwright): oppdragslinje og peiling i Badet og Kjøkkenet på Nybegynner, Medium og Ekspert. Skjermbilder + rapport (JSON på stdout). Ingen GPU: ingen FPS-krav, klokka til peilingen spoles for hånd.
// node tools/live_goalway.cjs <utmappe>   (playwright via NODE_PATH). Exit 1 ved feil.
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..'), out = process.argv[2] || '.';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.wav': 'audio/wav' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); const p = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f; if (!p.startsWith(root) || !fs.existsSync(p)) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(p).pipe(r); });
(async () => {
  await new Promise((ok) => srv.listen(0, ok)); const port = srv.address().port, res = {}, errs = [], bad = [], notes = [];
  const launch = () => chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  let b = await launch();
  const scenario = async (lvl, diff) => {
    const ctx = await b.newContext({ ...devices['iPhone 14'] }); ctx.setDefaultTimeout(150000); const pg = await ctx.newPage();
    pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await pg.addInitScript((d) => { try { localStorage.setItem('tlm.introsweep', 'false'); localStorage.setItem('tlm.difficulty', JSON.stringify(d)); } catch {} }, diff);
    await pg.goto(`http://localhost:${port}/?level=${lvl}&start=0`);
    await pg.waitForFunction(() => window.__game && window.__game.LEVEL, null, { timeout: 120000 });
    await pg.touchscreen.tap(195, 420); await pg.waitForTimeout(2500);
    const k = `${lvl}_${diff}`, r = (res[k] = {});
    const snap = () => pg.evaluate(() => { const g = window.__game, w = g.way.v.state(), vis = (s) => { const e = document.querySelector(s); return !!e && getComputedStyle(e).display !== 'none'; }; return { quest: w.quest, text: w.questText, icon: w.questIcon, peek: w.peek, glow: w.glow, arrow: g.markers.goalDir ? !!(g.goalArrow && g.goalArrow.visible) : false, compass: vis('#compass'), edge: g.guide.v.state().edge, ringGuide: g.guide.v.state().ghost }; });
    r.start = await snap(); await pg.screenshot({ path: `${out}/goalway_${k}_start.png`, timeout: 150000 }).catch((e) => errs.push("skjermbilde: " + e.message.slice(0, 60)));
    if (diff === 'expert') {
      // stå stille i 9 s: spol klokka, kamera snudd bort fra målet, så peilingen kommer inn ved kanten
      await pg.evaluate(() => { const g = window.__game; const t = g.guide.nextTarget(); g.cam.yaw = Math.atan2(-(t.x - g.player.x), -(t.z - g.player.z)) + Math.PI; g.way.s.t0 = performance.now() - 9000; g.way.s.nextPeekAt = 0; });
      await pg.waitForTimeout(2500); await pg.evaluate(() => { window.__game.way.s.peekUntil = performance.now() + 20000; }); await pg.waitForTimeout(2500); r.peek = await snap(); await pg.screenshot({ path: `${out}/goalway_${k}_peek.png`, timeout: 150000 }).catch((e) => errs.push("skjermbilde: " + e.message.slice(0, 60)));
      // trykk på ikonet: oppdragslinja hentes fram
      await pg.evaluate(() => window.__game.way.tap('ikon')); await pg.waitForTimeout(1200); r.tapped = await snap(); await pg.screenshot({ path: `${out}/goalway_${k}_tapped.png`, timeout: 150000 }).catch((e) => errs.push("skjermbilde: " + e.message.slice(0, 60)));
      // glød: kamera mot målet
      await pg.evaluate(() => { const g = window.__game; for (const q of g.LEVEL.goalList) if (q.type === 'reach') q.done = true; const t = g.guide.nextTarget(); g.cam.yaw = Math.atan2(-(t.x - g.player.x), -(t.z - g.player.z)); g.way.s.wasIn = false; g.way.s.glowUntil = 0; });
      await pg.waitForTimeout(2500); r.glow = await snap(); await pg.screenshot({ path: `${out}/goalway_${k}_glow.png`, timeout: 150000 }).catch((e) => errs.push("skjermbilde: " + e.message.slice(0, 60)));
      if (r.start.quest || r.start.arrow || r.start.compass || r.start.edge) bad.push(`${k}: Ekspert har linje/pil/kompass uten trykk`);
      if (!r.peek.peek) bad.push(`${k}: ingen peiling etter stillstand`); if (!r.tapped.quest) bad.push(`${k}: linja kom ikke fram ved trykk`);
      if (r.peek.arrow || r.peek.edge) bad.push(`${k}: pil under peiling`);
    } else if (!r.start.quest || !r.start.text) bad.push(`${k}: ingen oppdragslinje`);
    r.ev = await pg.evaluate(() => window.__game.evLog.filter((e) => e.type === 'maalvei').map((e) => e.detail));
    await ctx.close();
  };
  for (const [lvl, diff] of [['bad', 'medium'], ['bad', 'expert'], ['kjokken', 'beginner'], ['kjokken', 'expert']]) {
    for (let k = 0; k < 4; k++) { try { await scenario(lvl, diff); break; } catch (e) { try { await b.close(); } catch {} b = await launch(); notes.push(`${lvl}/${diff} forsøk ${k + 1}: ${e.message.split('\n')[0].slice(0, 80)}`); if (k === 3) bad.push(`${lvl}/${diff}: nettleseren krasjet 4 ganger`); } }
  }
  await b.close(); srv.close();
  console.log(JSON.stringify({ res, errs: errs.slice(0, 5), notes, bad }, null, 1)); process.exit(bad.length || errs.length ? 1 : 0);
})();
