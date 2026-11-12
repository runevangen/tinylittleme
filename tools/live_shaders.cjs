// R35: teller shaderprogram (renderer.info.programs) gjennom en økt i iPhone 14 (Playwright, programvare-GL er ok: vi teller programmer, ikke ms).
// Spiller oversikt, grep/ta, hopp, hard landing, lek-pop, Lav profil av/på og plan/spill, og krever at antallet er uendret etter forvarmingen.
// node tools/live_shaders.cjs [port] [nivå,nivå,...]   (server på porten; playwright via NODE_PATH). Exit 1 hvis antallet øker. Skriver også tegnekall/teksturer.
const { chromium, devices } = require('playwright');
(async () => {
  const port = process.argv[2] || 8355, levels = (process.argv[3] || 'kjokken,barnerom,kontroll').split(',');
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  let bad = 0;
  for (const level of levels) {
    const ctx = await b.newContext({ ...devices['iPhone 14'] }); const pg = await ctx.newPage(); const errs = [];
    pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await pg.addInitScript(() => { try { localStorage.setItem('tlm.buildall', 'true'); } catch {} });
    await pg.goto(`http://localhost:${port}/?level=${level}&start=0`);
    await pg.waitForFunction(() => window.__game && window.__game.LEVEL.bodies, null, { timeout: 90000 });
    await pg.waitForFunction(() => window.__game.evLog.some((e) => e.type === 'forvarming'), null, { timeout: 180000 });
    const frames = (n) => pg.evaluate((n) => new Promise((r) => { let i = 0; const f = () => (++i >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
    const run = (n) => pg.evaluate((n) => window.__game.tick(n, 1 / 60), n);
    const info = () => pg.evaluate(() => { const i = window.__game.renderer.info; return { programs: i.programs.length, calls: i.render.calls, tex: i.memory.textures, geo: i.memory.geometries }; });
    const tap = async (id) => { const r = await pg.evaluate((id) => { const e = document.getElementById(id); if (!e) return null; const q = e.getBoundingClientRect(); return { x: q.x, y: q.y, w: q.width, h: q.height }; }, id); if (r && r.w > 0) await pg.touchscreen.tap(r.x + r.w / 2, r.y + r.h / 2); };
    await frames(3); const start = await info(); const steps = [];
    const step = async (name, fn) => { await fn(); await frames(4); const n = await info(); steps.push(`${name}=${n.programs}`); if (n.programs > start.programs) { bad++; console.log('FEIL', level, name, 'shadere', start.programs, '->', n.programs); } };
    await step('start', () => pg.touchscreen.tap(195, 420));
    await step('gå', async () => { await pg.evaluate(() => { window.__game.touch.y = 1; }); await run(60); await pg.evaluate(() => { window.__game.touch.y = 0; }); });
    await step('hopp', async () => { await tap('btnJump'); await run(10); });
    await step('hard landing', async () => { await pg.evaluate(() => { const p = window.__game.player; p.y += 9; p.vy = -14; p.onGround = false; }); await run(90); });
    await step('grep/ta', async () => { await tap('btnGrab'); await run(8); await tap('btnCarry'); await run(8); });
    await step('oversikt', async () => { await tap('btnMap'); await run(20); await frames(10); });
    await step('oversikt lukk', async () => { await tap('btnMap'); await run(20); });
    await step('lek-pop', async () => { await pg.evaluate(() => { const g = window.__game; const t = g.LEVEL.bodies.find((q) => /sprettboks|jackbox/.test(q.id)); if (t) { const p = g.player; p.x = (t.min[0] + t.max[0]) / 2; p.z = (t.min[2] + t.max[2]) / 2; p.y = t.max[1] + 0.1; p.vy = 0; p.onGround = true; } }); await run(40); await tap('btnJump'); await run(120); });
    await step('lav profil på', async () => { await pg.evaluate(() => window.__game.setLow('on')); await run(5); });
    await step('lav profil av', async () => { await pg.evaluate(() => window.__game.setLow('off')); await run(5); });
    await step('plan/spill', async () => { await pg.evaluate(() => { window.__game.setMode('plan'); }); await run(10); await frames(3); await pg.evaluate(() => window.__game.setMode('play')); await run(10); });
    await step('bygg', async () => { const has = await pg.evaluate(() => { const s = window.__game.LEVEL.buildSites; if (!s || !s.length) return false; const p = window.__game.player; p.x = s[0].x - 4; p.y = s[0].y; p.z = s[0].z + 3; p.vx = p.vz = p.vy = 0; p.onGround = true; return true; }); if (has) { await run(10); await tap('btnBuild'); await run(2); await frames(4); await tap('btnBuild'); const bk = await pg.evaluate(() => { const e = document.querySelector('#bld button[data-a="back"]'); if (e) e.click(); return !!e; }); } });
    const end = await info(); const log = await pg.evaluate(() => window.__game.evLog.filter((e) => /^(forvarming|shadere)$/.test(e.type)).map((e) => e.type + ': ' + (e.detail || e.d || '')));
    console.log(`${level}: shadere ved start ${start.programs}, etter økta ${end.programs} · tegnekall ${start.calls}->${end.calls} · teksturer ${start.tex}->${end.tex} · geometrier ${start.geo}->${end.geo}`);
    console.log('  ' + steps.join(' '), '\n  logg:', JSON.stringify(log), '\n  feil:', JSON.stringify(errs.slice(0, 3)));
    if (errs.length) bad++;
    await ctx.close();
  }
  await b.close(); console.log(bad ? `${bad} FEIL` : 'ok: ingen nye shadere etter forvarming'); process.exit(bad ? 1 : 0);
})();
