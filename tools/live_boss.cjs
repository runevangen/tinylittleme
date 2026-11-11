// Ekte spillflyt mot sjefen (iPhone 14, Playwright): skjermbilde og måling av figurens skjermposisjon i windup, charge, tired og stunned.
// node tools/live_boss.cjs <utmappe> [port]   (krever at en server kjører på porten, og playwright via NODE_PATH)
// Spillet kjøres med den ekte update() (tick), så kameraet glattes som i et levende spill uavhengig av FPS. Exit-kode 1 hvis figuren ikke er trygt i bildet.
const { chromium, devices } = require('playwright');
const SAFE = { xmax: 0.82, ymin: -0.26, ymax: 0.22 };   // NDC: samme bånd som anchorLook (BOSS_HERO_Y) for høyden; i tillegg må figuren (±MARG px) ikke overlappe noen knapp (ekte DOM-rektangler)
const TOL = 0.1;                                          // kameraet glattes (sjefen kan dra det inn), så figuren får ligge litt utenfor ankerbåndet så lenge den ikke overlapper en knapp
const HX = 16, HY = 28, GAP = 2;                          // figurens skjermboks (px, halv bredde/høyde rundt prosjektert midtpunkt) + luft til knapper/HUD
(async () => {
  const out = process.argv[2] || '.', port = process.argv[3] || 8302;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ ...devices['iPhone 14'], deviceScaleFactor: Number(process.env.DPR || 1) });
  const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await pg.goto(`http://localhost:${port}/?level=kjokken2&start=0`);
  await pg.waitForFunction(() => window.__game && window.__game.LEVEL.bossS, null, { timeout: 30000 });
  await pg.evaluate(() => { window.__paused = true; });
  const probe = () => pg.evaluate(() => {
    const g = window.__game, B = g.LEVEL.bossS, p = g.player, cam = g.camera;
    cam.updateMatrixWorld(true);
    const V = cam.position.constructor, pr = (x, y, z) => { const v = new V(x, y, z).project(cam); return { x: v.x, y: v.y }; };
    const h = pr(p.x, p.y + 0.6, p.z);
    const W = innerWidth, H = innerHeight, px = (h.x + 1) / 2 * W, py = (1 - h.y) / 2 * H;
    const hit = [...document.querySelectorAll('.tbtn, #stick, #bossbar, #hud, #toast.show')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && getComputedStyle(e).display !== 'none' && px + 16 + 2 > r.left && px - 16 - 2 < r.right && py + 28 + 2 > r.top && py - 28 - 2 < r.bottom; }).map((e) => e.id || e.className);
    return { hit, px: Math.round(px), py: Math.round(py), mode: B.mode, sep: +Math.hypot(B.x - p.x, B.z - p.z).toFixed(2), camDist: +Math.hypot(cam.position.x - p.x, cam.position.y - p.y - 0.5, cam.position.z - p.z).toFixed(2), hx: +h.x.toFixed(2), hy: +h.y.toFixed(2), yaw: +g.cam.yaw.toFixed(2), want: +Math.atan2(-(B.x - p.x), -(B.z - p.z)).toFixed(2), pos: [p.x, p.z].map((v) => +v.toFixed(1)), bpos: [B.x, B.z].map((v) => +v.toFixed(1)) };
  });
  const shot = async (name) => { await pg.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await pg.screenshot({ path: `${out}/${name}.png` }); };
  const res = []; let bad = 0;
  for (const [px, pz] of (process.env.STARTS ? JSON.parse(process.env.STARTS) : [[-25, -1], [-34.5, -3], [-25, -14], [-22, -3]])) {
    await pg.evaluate(([x, z]) => { const g = window.__game, p = g.player; p.x = x; p.y = 0; p.z = z; p.vx = p.vz = p.vy = 0; p.onGround = true; Object.assign(g.LEVEL.bossS, { mode: 'patrol', mt: 0, x: -29, z: -8, cool: 0, hp: 3, misses: 0 }); g.cam.yaw = 0; }, [px, pz]);
    await pg.evaluate(() => window.__game.tick(15, 1 / 60));
    const seen = {};
    for (let round = 0; round < 12 && !['windup', 'charge', 'tired', 'stunned'].every((k) => seen[k]); round++) {
      // kjør spillogikken inne i siden til sjefen går inn i en fase vi ikke har målt ennå (raskt: ingen rundtur per bilde)
      const m = await pg.evaluate((have) => { const g = window.__game, B = g.LEVEL.bossS; for (let i = 0; i < 1500; i++) { g.tick(3, 1 / 60); if (['windup', 'charge', 'tired', 'stunned'].includes(B.mode) && !have.includes(B.mode)) return B.mode; } return null; }, Object.keys(seen));
      if (!m) break;
      if (m === 'stunned') {   // gå mot sjefen for hopp-på-ryggen-vinduet, og vent til kameraet har satt seg bak figuren (maks ca. 4,6 s)
        await pg.evaluate(() => { const g = window.__game, B = g.LEVEL.bossS, p = g.player; const tx = -B.x, tz = -8 - B.z, tl = Math.hypot(tx, tz) || 1; p.x = B.x + tx / tl * 2.6; p.z = B.z + tz / tl * 2.6; p.y = 0; p.vx = p.vz = 0; });
        for (let k = 0; k < 14; k++) { await pg.evaluate(() => window.__game.tick(20, 1 / 60)); const q = await probe(); if (q.mode !== 'stunned' || Math.abs(Math.atan2(Math.sin(q.yaw - q.want), Math.cos(q.yaw - q.want))) < 0.2) break; }
      } else for (let k = 0; k < (m === 'windup' ? 3 : 24); k++) { await pg.evaluate(() => window.__game.tick(10, 1 / 60)); const q = await probe(); if (q.mode !== m || (q.hy > SAFE.ymin - TOL && q.hy < SAFE.ymax + TOL && Math.abs(q.hx) < 0.12 && k >= 1)) break; }   // vent til kameraet har satt seg (0,17 s-steg, maks 4 s; en støt-slynget figur skal rekke å bli fanget igjen)
      seen[m] = 1;
      const s2 = await probe(); s2.start = `${px},${pz}`; res.push(s2);
      const tol = TOL + (m === 'windup' ? 0.1 : 0), ok = Math.abs(s2.hx) < SAFE.xmax && s2.hy > SAFE.ymin - tol && s2.hy < SAFE.ymax + tol && !s2.hit.length; if (!ok) bad++;
      console.log(ok ? 'OK ' : 'BAD', JSON.stringify(s2));
      await shot(`${px}_${pz}_${s2.mode}`);
    }
    console.log('start', px, pz, 'sett:', Object.keys(seen).join(','));
  }
  // treff-toast: sjefen støter inn i figuren midt i stormen; toasten skal være én kort linje og ikke dekke sjefen
  await pg.evaluate(() => { const g = window.__game, p = g.player, B = g.LEVEL.bossS; p.x = -22; p.z = -8; p.y = 0; p.vx = p.vz = p.vy = 0; p.onGround = true; Object.assign(B, { mode: 'patrol', mt: 0, x: -30, z: -8, cool: 0, hp: 3, misses: 0 }); g.cam.yaw = 0; g.stats.hits = 0; });
  await pg.evaluate(() => { for (let i = 0; i < 2000; i++) { window.__game.tick(4, 1 / 60); if (window.__game.stats.hits > 0) break; } });   // figuren står stille til sjefen treffer
  await pg.evaluate(() => window.__game.tick(2, 1 / 60));
  const tb = await pg.evaluate(() => { const r = document.getElementById('toast').getBoundingClientRect(); return { text: document.getElementById('toast').textContent, show: document.getElementById('toast').classList.contains('show'), top: r.top, bottom: r.bottom, h: r.height, w: r.width, fight: document.body.classList.contains('bossfight') }; });
  console.log('toast', JSON.stringify(tb), JSON.stringify(await probe()), JSON.stringify(await pg.evaluate(() => { const g = window.__game, c = g.camera, p = g.player; return { cam: [c.position.x, c.position.y, c.position.z].map((v) => +v.toFixed(1)), p: [p.x, p.y, p.z, p.vx, p.vz, p.state].map((v) => typeof v === 'number' ? +v.toFixed(1) : v) }; }))); await pg.evaluate(() => document.getElementById('toast').classList.add('show')); await pg.waitForTimeout(350); await shot('toast_hurt');   // toasten er alt falmet bort i den trege swiftshader-kjøringen: vis den igjen for skjermbildet
  await pg.evaluate(() => window.__game.tick(18, 1 / 60)); const ah = await probe(); console.log('vis', JSON.stringify(await pg.evaluate(() => { const g = window.__game, h = g.hero, c = g.camera; const hr = h.root || h.group || h; const v = new c.position.constructor(); hr.getWorldPosition && hr.getWorldPosition(v); return { vis: hr.visible, wp: [v.x, v.y, v.z].map((x) => +x.toFixed(1)), keys: Object.keys(h).slice(0, 12) }; }))); console.log('etter støtet (0,3 s)', JSON.stringify(ah)); await shot('after_hit');
  if (!(Math.abs(ah.hx) < SAFE.xmax && ah.hy > SAFE.ymin - TOL && ah.hy < SAFE.ymax + TOL)) bad++;
  if (!/^Au! .4$/.test(tb.text) || tb.h > 34) { bad++; console.log('BAD toast', tb.text); }
  console.log('errors', errs, 'bad', bad);
  await b.close(); process.exit(bad || errs.length ? 1 : 0);
})();
