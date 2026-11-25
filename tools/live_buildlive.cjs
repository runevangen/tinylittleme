// R49b: live-vekt i verdenen: et bygd bygg bøyer seg under figuren og brister over grensen, på Hyllebroen og et Bygglab-sted (Byggeskolen).
// node tools/live_buildlive.cjs  (playwright via NODE_PATH; server: python3 -m http.server 8765). Skjermbilder i /tmp/live_buildlive_*.png
const { chromium, devices } = require('playwright');
const CASES = [{ level: 'bro', site: 'bro1', pre: [] }, { level: 'bygglab', site: 'lab3', pre: ['lab1', 'lab2'] }];
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  let bad = 0;
  for (const c of CASES) {
    for (const mode of ['bend', 'break', 'off']) {
      const ctx = await b.newContext({ ...devices['iPhone 14'] }), pg = await ctx.newPage(); const errs = [];
      pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
      await pg.addInitScript(([on, st]) => { try { if (!/bygglab/.test(location.search)) { localStorage.setItem('tlm.intro', '0'); localStorage.setItem('tlm.labstart', 'false'); } localStorage.setItem('tlm.skole', JSON.stringify({ opened: true, card: 'skipped', done: false })); localStorage.setItem('tlm.buildlive', JSON.stringify(on)); localStorage.setItem('tlm.buildlivestiff', JSON.stringify(st)); } catch (e) {} }, [mode !== 'off', mode === 'break' ? 0.3 : 3]);
      await pg.goto(`http://localhost:8765/?level=${c.level}`); await pg.waitForFunction(() => window.__game && window.__game.bld, null, { timeout: 90000 });
      const r = await pg.evaluate(async ([cc, mode]) => {
        const G = window.__game, B = G.bld, P = G.player, T = (n) => { for (let i = 0; i < n; i++) { G.tick(1, 1 / 60); B.update(1 / 60, true); } }; T(60, 1 / 60); for (const q of cc.pre) B.stage.markPassed(q);
        if (cc.level === 'bygglab') { B.lab.go(1); T(6, 1 / 60); B.lab.go(1); T(10, 1 / 60); }
        if (cc.level !== 'bygglab') { B.open(cc.site, { force: true }); T(5, 1 / 60); }
        if (cc.level === 'bygglab') {
          const BL = await import('/build_logic.js'), parts = [['lab_plank_l_1', 0, 2.2, 0], ['lab_plank_s_1', -6, 3, -0.7], ['lab_block_1', 5, 1, 0.4], ['lab_plank_t_1', 6.5, 4, 1.2]];
          const body = BL.toB64(JSON.stringify([1, 'lab3', parts.map((p) => [p[0], Math.round(p[1] * 1000), Math.round(p[2] * 1000), Math.round(p[3] * 10000)]), []])); B.importText(`TLM1.${body}.${BL.fnv(body)}`);
        } else B.placeRef(cc.site);
        T(6, 1 / 60); B.world.commit(cc.site); T(3, 1 / 60); B.close(); T(5, 1 / 60);
        const cp = (i) => JSON.parse(JSON.stringify(i)), info0 = cp(B.world.info(cc.site)), tops = (i) => i.boxes.map((q) => +q.max[1].toFixed(3));
        const top = info0.boxes.slice().sort((a, b) => b.max[1] - a.max[1])[0]; if (!top) return { err: 'ingen boks', sid: B.siteId, n: info0.boxes.length, w: info0.boxes.slice(0, 3).map((q) => q.max[0] - q.min[0]) };
        const cx = (top.min[0] + top.max[0]) / 2, cz = (top.min[2] + top.max[2]) / 2;
        P.x = cx; P.z = cz; P.y = top.max[1] + 0.02; P.vx = P.vy = P.vz = 0; T(30, 1 / 60);
        const info1 = cp(B.world.info(cc.site)), stood = P.onGround && P.groundBox && P.groundBox.built === cc.site;
        T(90, 1 / 60); const info2 = cp(B.world.info(cc.site)), y2 = P.y, still = P.onGround;
        const drop = Math.max(0, ...info0.boxes.map((q, i) => { const o = info2.boxes.find((z) => z.id === q.id && Math.abs(z.min[0] - q.min[0]) < 1e-6); return o ? q.max[1] - o.max[1] : 0; }));
        // ned av igjen: bort fra bygget
        P.x = top.max[0] + 6; P.y = 40; T(120, 1 / 60); const info3 = cp(B.world.info(cc.site)), back = Math.max(0, ...info0.boxes.map((q) => { const o = info3.boxes.find((z) => z.id === q.id && Math.abs(z.min[0] - q.min[0]) < 1e-6); return o ? q.max[1] - o.max[1] : 0; }));
        return { n0: info0.boxes.length, stood, drop: +drop.toFixed(3), still, y2: +y2.toFixed(2), nAfter: info2.boxes.length, back: +back.toFixed(3), top: +top.max[1].toFixed(2), px: cx, pz: cz };
      }, [c, mode]);
      if (mode !== 'off') { await pg.evaluate(async ([cc, mode]) => { const G = window.__game, B = G.bld, P = G.player, T = (n) => { for (let i = 0; i < n; i++) { G.tick(1, 1 / 60); B.update(1 / 60, true); } }; B.world.commit(cc.site); T(3, 1 / 60); const t = B.world.info(cc.site).boxes.slice().sort((a, b) => b.max[1] - a.max[1])[0]; if (!t) return; P.x = (t.min[0] + t.max[0]) / 2; P.z = (t.min[2] + t.max[2]) / 2; P.y = t.max[1] + 0.02; P.vx = P.vy = P.vz = 0; T(mode === 'bend' ? 50 : 6, 1 / 60); }, [c, mode]); }
      await pg.screenshot({ path: `/tmp/live_buildlive_${c.level}_${mode}.png` });
      let ok;
      if (r.err) ok = false;
      else if (mode === 'bend') ok = r.stood && r.drop > 0.03 && r.drop <= 0.36 && r.nAfter === r.n0 && r.back < 0.01;
      else if (mode === 'break') ok = r.nAfter < r.n0;
      else ok = r.stood && r.drop === 0 && r.nAfter === r.n0;
      console.log(c.level, mode, ok ? 'OK' : 'FEIL', JSON.stringify(r), 'feil:', errs.join('|').slice(0, 200)); if (!ok || errs.length) bad++;
      await ctx.close();
    }
  }
  await b.close(); process.exitCode = bad ? 1 : 0;
})();
