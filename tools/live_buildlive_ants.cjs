// R49c: maur som last på bygget. Med live-vekt og «Maur belaster bygg» på bøyer et bygd bygg seg mer når maur står på det og kan briste av mange maur
// (og figuren); med valget av er alt som før. Hyllebroen (bro) og et Bygglab-sted. Skjermbilder i /tmp/live_buildlive_ants_*.png
// node tools/live_buildlive_ants.cjs  (playwright via NODE_PATH; server: python3 -m http.server 8765)
const { chromium, devices } = require('playwright');
const CASES = [{ level: 'bro', site: 'bro1', pre: [] }, { level: 'bygglab', site: 'lab3', pre: ['lab1', 'lab2'] }];
// bend: tre maur (én synlig) står på toppen, ingen figur. break: mange maur + lav stivhet. off: maur står der, men «Maur belaster bygg» er av.
const MODES = { bend: { ants: true, n: 1, load: 0.7, stiff: 1.5 }, break: { ants: true, n: 14, load: 0.3, stiff: 1 }, off: { ants: false, n: 1, load: 0.7, stiff: 1.5 } };
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  let bad = 0;
  for (const c of CASES) {
    for (const [mode, M] of Object.entries(MODES)) {
      if (process.env.ONLY && !`${c.level}_${mode}`.includes(process.env.ONLY)) continue;
      const ctx = await b.newContext({ ...devices['iPhone 14'] }), pg = await ctx.newPage(); const errs = [];
      pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
      await pg.addInitScript(([M]) => { try { if (!/bygglab/.test(location.search)) { localStorage.setItem('tlm.intro', '0'); localStorage.setItem('tlm.labstart', 'false'); } localStorage.setItem('tlm.skole', JSON.stringify({ opened: true, card: 'skipped', done: false })); localStorage.setItem('tlm.buildlive', 'true'); localStorage.setItem('tlm.buildliveants', JSON.stringify(M.ants)); localStorage.setItem('tlm.buildliveantload', JSON.stringify(M.load)); localStorage.setItem('tlm.buildlivestiff', JSON.stringify(M.stiff)); } catch (e) {} }, [M]);
      await pg.goto(`http://localhost:8765/?level=${c.level}`); await pg.waitForFunction(() => window.__game && window.__game.bld, null, { timeout: 90000 });
      const r = await pg.evaluate(async ([cc, M]) => {
        const G = window.__game, B = G.bld, P = G.player, L = G.LEVEL, T = (n) => { for (let i = 0; i < n; i++) { G.tick(1, 1 / 60); B.update(1 / 60, true); } }; T(60); for (const q of cc.pre) B.stage.markPassed(q);
        if (cc.level === 'bygglab') { B.lab.go(1); T(6); B.lab.go(1); T(10); }
        if (cc.level !== 'bygglab') { B.open(cc.site, { force: true }); T(5); }
        if (cc.level === 'bygglab') {
          const BL = await import('/build_logic.js'), parts = [['lab_plank_l_1', 0, 2.2, 0], ['lab_plank_s_1', -6, 3, -0.7], ['lab_block_1', 5, 1, 0.4], ['lab_plank_t_1', 6.5, 4, 1.2]];
          const body = BL.toB64(JSON.stringify([1, 'lab3', parts.map((p) => [p[0], Math.round(p[1] * 1000), Math.round(p[2] * 1000), Math.round(p[3] * 10000)]), []])); B.importText(`TLM1.${body}.${BL.fnv(body)}`);
        } else B.placeRef(cc.site);
        T(6); B.world.commit(cc.site); T(3); B.close(); T(5);
        const cp = (i) => JSON.parse(JSON.stringify(i)), info0 = cp(B.world.info(cc.site));
        const top = info0.boxes.slice().sort((a, b) => b.max[1] - a.max[1])[0]; if (!top) return { err: 'ingen boks' };
        const cx = (top.min[0] + top.max[0]) / 2, cz = (top.min[2] + top.max[2]) / 2;
        // figuren langt unna; mauras patruljer flyttes til toppen av bygget (ingen bevegelse: a = b, fart 0)
        P.x = top.max[0] + 12; P.y = 40; P.vx = P.vy = P.vz = 0; T(90);
        if (!L.antList) L.antList = []; if (!L.antList[0]) L.antList.push({ id: 'x0', type: 'ant', rad: 0.62, hgt: 0.8, a: [0, 0, 0], b: [0, 0, 0], len: 1, speed: 0, s: 0.5, dir: 1, wait: 0, x: 0, y: 0, z: 0, fx: 1, fz: 0, alive: true, dead: 0, squash: 0, alerted: false, phase: 0 });   // Bygglab har ingen maur: ett logisk (uten modell)
        const base = L.antList[0], pin = (t, k) => { t.a = [cx + ((k % 5) - 2) * Math.min(0.25, (top.max[0] - top.min[0]) / 8), top.max[1], cz]; t.b = [...t.a]; t.len = 1; t.speed = 0; t.s = 0.5; t.alive = true; t.squash = 0; t.alerted = false; };
        pin(base, 0);
        for (let k = 1; k < M.n; k++) { const t = JSON.parse(JSON.stringify(base)); t.id = 'x' + k; pin(t, k); L.antList.push(t); }
        const ph = (n) => { T(n); const i = cp(B.world.info(cc.site)); return Math.max(0, ...info0.boxes.map((q) => { const o = i.boxes.find((z) => z.id === q.id && Math.abs(z.min[0] - q.min[0]) < 1e-6); return o ? q.max[1] - o.max[1] : 0; })); };
        const drop = ph(120);
        P.x = top.min[0] - 4; P.z = cz; P.y = top.max[1] + 1; P.vx = P.vy = P.vz = 0; T(240);   // figuren ved siden av, så skjermbildet viser bygget og mauras forskyvning
        const dropNow = ph(1) || drop, nAfter = B.world.info(cc.site).boxes.length, yOff = base.liveY || 0;
        return { n0: info0.boxes.length, nAfter, drop: +Math.max(drop, dropNow).toFixed(3), antOff: +yOff.toFixed(3), ants: L.antList.length, falling: !!base.liveFall, alive: base.alive };
      }, [c, M]);
      await pg.evaluate(() => { const G = window.__game; G.cam?.snap?.(); }).catch(() => {});
      await pg.screenshot({ path: `/tmp/live_buildlive_ants_${c.level}_${mode}.png` });
      let ok;
      if (r.err) ok = false;
      else if (mode === 'bend') ok = r.drop > 0.03 && r.drop <= 0.36 && r.nAfter === r.n0 && r.antOff < -0.02;
      else if (mode === 'break') ok = r.nAfter < r.n0 && (r.falling || !r.alive);
      else ok = r.drop === 0 && r.nAfter === r.n0 && r.antOff === 0;
      console.log(c.level, mode, ok ? 'OK' : 'FEIL', JSON.stringify(r), 'feil:', errs.join('|').slice(0, 200)); if (!ok || errs.length) bad++;
      await ctx.close();
    }
  }
  await b.close(); process.exitCode = bad ? 1 : 0;
})();
