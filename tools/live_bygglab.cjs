// R67: Bygglab på mobil (iPhone 14, Playwright): ?level=bygglab åpner byggeskjermen med en gang, ◀ ▶ går gjennom alle åtte stedene, en løsning bygges og prøves med berøring,
// bygget står i verden, TILBAKE og BYGG, NULLSTILL STED og NULLSTILL ALLE, og det er ingen konsollfeil. Skjermbilder i utmappa.
// node tools/live_bygglab.cjs <utmappe> [port]   (server på porten; playwright via NODE_PATH). Exit 1 ved feil. Miljøet har ingen GPU (swiftshader): ingen FPS-krav.
const { chromium, devices } = require('playwright');
(async () => {
  const out = process.argv[2] || '.', port = process.argv[3] || 8467;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  let bad = 0; const ok = (k, c, d = '') => { console.log(c ? 'ok  ' : 'FEIL', k, d); if (!c) bad++; };
  for (const [name, opts] of [['stående', devices['iPhone 14']], ['liggende', devices['iPhone 14 landscape']]]) {
    const ctx = await b.newContext({ ...opts }), pg = await ctx.newPage(), errs = [];
    pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await pg.goto(`http://localhost:${port}/?level=bygglab`);
    await pg.waitForFunction(() => window.__game && window.__game.LEVEL.buildSites && window.__game.LEVEL.lab, null, { timeout: 60000 });
    const run = (n) => pg.evaluate((n) => window.__game.tick(n, 1 / 60), n);
    const sh = async (n) => { await pg.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await pg.screenshot({ path: `${out}/bygglab_${name}_${n}.png` }); };
    const tapEl = async (sel) => { const r = await pg.locator(sel).first().boundingBox(); await pg.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); };
    const building = () => pg.evaluate(() => document.body.classList.contains('building'));
    await run(60);
    ok(`${name}: byggeskjermen er åpen ved start`, await building(), JSON.stringify(await pg.evaluate(() => window.__game.bld.state())));
    await sh('0_start');
    const bar = await pg.evaluate(() => { const r = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), t: e.textContent }; }; return { prev: r('#bld [data-lb="prev"]'), next: r('#bld [data-lb="next"]'), site: r('#bld [data-lb="site"]'), all: r('#bld [data-lb="all"]'), nm: r('#bld .lab .nm'), hint: r('#bld .hint'), try: r('#bld [data-a="try"]'), back: r('#bld [data-a="back"]') }; });
    console.log(JSON.stringify(bar));
    ok(`${name}: knappene i lab-raden er store nok (minst 38 px) og innenfor skjermen`, ['prev', 'next', 'site', 'all'].every((k) => bar[k] && bar[k].h >= 38 && bar[k].w >= 38 && bar[k].x >= 0 && bar[k].x + bar[k].w <= pg.viewportSize().width));
    ok(`${name}: oppgaveteksten står i hint-feltet`, /Sted 1\/8: Bro/.test(bar.hint.t), bar.hint.t);
    const seen = [];
    for (let i = 0; i < 8; i++) { seen.push(await pg.evaluate(() => window.__game.bld.lab.info().n)); await tapEl('#bld [data-lb="next"]'); await run(2); if (i === 3) await sh('1_fagverk'); if (i === 6) await sh('2_taaler'); }
    ok(`${name}: ▶ går gjennom alle åtte stedene og rundt`, seen.join(',') === '1,2,3,4,5,6,7,8' && (await pg.evaluate(() => window.__game.bld.lab.info().n)) === 1, seen.join(','));
    await tapEl('#bld [data-lb="prev"]'); await run(2); ok(`${name}: ◀ går bakover rundt (til 8)`, (await pg.evaluate(() => window.__game.bld.lab.info().n)) === 8); await tapEl('#bld [data-lb="next"]'); await run(2);
    // bygg en lang planke på sted 1 med berøring: dra brikken ut av brettet
    const chip = pg.locator('#bld .chip[data-id^="lab_plank_l_"]').first(); await chip.scrollIntoViewIfNeeded();
    const r = await chip.boundingBox(), vw = pg.viewportSize(), sc = await pg.evaluate(() => { const q = window.__game.bld.screenPos(0, 0.25); return q; });
    await pg.mouse.move(r.x + r.width / 2, r.y + r.height / 2); await pg.mouse.down(); await pg.mouse.move(sc.x, sc.y, { steps: 8 }); await pg.mouse.up(); await run(2);
    const st = await pg.evaluate(() => window.__game.bld.state()); ok(`${name}: delen er plassert (uten å lete etter den)`, st.builds.some((q) => q.id === 'lab1' && q.placed === 1), JSON.stringify(st.builds.find((q) => q.id === 'lab1')));
    ok(`${name}: en ny plank er klar i brettet (ubegrenset)`, (await pg.locator('#bld .chip[data-id^="lab_plank_l_"]').count()) === 1 && (await pg.locator('#bld .chip[data-id^="lab_plank_l_"] b').first().textContent()) === '∞');
    await sh('3_plassert');
    await tapEl('#bld button[data-a="try"]');
    for (let i = 0; i < 80; i++) { await pg.waitForTimeout(250); if (!(await pg.evaluate(() => window.__game.bld.running))) break; }
    const rs = await pg.evaluate(() => window.__game.bld.result); ok(`${name}: PRØV klarer det`, rs && rs.state === 'won', JSON.stringify(rs)); await sh('4_utfall');
    await tapEl('#bld button[data-a="back"]'); await run(2); await tapEl('#bld button[data-a="back"]'); await run(5); ok(`${name}: TILBAKE (stopp, så ut) går ut til rommet`, !(await building())); await sh('5_verden');
    const nb = await pg.evaluate(() => window.__game.LEVEL.boxes.filter((q) => q.built).length); ok(`${name}: bygget står i verden`, nb > 0, nb + ' flater');
    ok(`${name}: BYGG-knappen vises ved stedet`, await pg.locator('#btnBuild').isVisible()); await tapEl('#btnBuild'); await run(2); ok(`${name}: BYGG åpner byggeskjermen igjen`, await building());
    await tapEl('#bld [data-lb="site"]'); await run(2); ok(`${name}: NULLSTILL STED fjerner bygget`, (await pg.evaluate(() => window.__game.LEVEL.boxes.filter((q) => q.built).length)) === 0);
    await tapEl('#bld [data-lb="all"]'); await run(2); ok(`${name}: NULLSTILL ALLE virker`, (await pg.evaluate(() => window.__game.bld.state().builds.every((q) => q.placed === 0))));
    ok(`${name}: ingen konsollfeil`, errs.length === 0, errs.slice(0, 3).join(' | ')); await ctx.close();
  }
  await b.close(); process.exit(bad ? 1 : 0);
})();
