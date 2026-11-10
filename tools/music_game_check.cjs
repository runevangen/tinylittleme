// Spilltest for R5: musikken bytter faktisk stemning i det kjørende spillet, og logger det.
// Bruk: python3 -m http.server 8318 &  node tools/music_game_check.cjs http://localhost:8318
const { chromium, devices } = require('playwright');
const base = process.argv[2] || 'http://localhost:8318';
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const out = [];
  for (const id of ['bad', 'barnerom', 'kjokken']) {
    const pg = await b.newPage({ ...devices['iPhone 14'] });
    const errs = []; pg.on('pageerror', (e) => errs.push(String(e)));
    await pg.goto(`${base}/index.html?level=${id}`); await pg.waitForFunction(() => window.__game?.player);
    const r = await pg.evaluate(async () => {
      const G = window.__game; G.unlockAudio(); await new Promise((r) => setTimeout(r, 300));
      const res = { theme: G.music.state.theme, mood0: G.music.state.mood };
      const a = G.LEVEL.antList[0]; G.player.x = a.x + 1; G.player.z = a.z; G.player.y = a.y; G.tick(3);
      res.alerted = a.alerted; res.mood1 = G.music.state.mood; res.bpm1 = G.music.state.bpm;
      G.player.x = 1e3; G.tick(3); res.mood2 = G.music.state.mood;                    // ut av syne: rolig igjen
      const g = G.LEVEL.goal; G.player.x = g[0]; G.player.y = g[1]; G.player.z = g[2]; G.player.vx = G.player.vy = G.player.vz = 0; G.tick(5);
      res.mood3 = G.music.state.mood;
      res.log = G.evLog.filter((e) => e.type === 'musikk').map((e) => e.detail);
      return res;
    });
    await pg.screenshot({ path: `/tmp/music_${id}.png`, timeout: 20000 }).catch(() => { r.screenshot = 'tidsavbrudd (programvare-GL)'; });
    out.push({ id, errs, ...r }); console.error('ferdig', id, JSON.stringify(r));
    await pg.close();
  }
  console.log(JSON.stringify(out, null, 1)); await b.close();
  const bad = out.filter((o) => o.errs.length || o.mood0 !== 'calm' || o.mood1 !== 'tense' || o.mood3 !== 'win' || o.log.join() !== 'tense,calm,win');
  if (bad.length) { console.error('FEIL', bad.map((o) => o.id)); process.exit(1); }
  console.log('music_game_check: ok');
})();
