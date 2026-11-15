// R69: ekte nettleser (iPhone 14, Playwright): vanskelighetsnivå. Teller hjelpeelementer (DOM og 3D) per nivå, «Avslutt til meny» fra spill, bygg og målskjerm, «Velg brett» og merker. Ingen GPU: ingen FPS-krav (testes på iPhone).
// node tools/live_difficulty.cjs <utmappe> [port]   Krever server på port (standard 8469) og playwright. Exit 1 ved feil.
const { chromium, devices } = require('playwright');
(async () => {
  const out = process.argv[2] || '.', port = process.argv[3] || 8469, part = process.argv[4] || '', only = (n) => !part || part.split(',').includes(String(n)), res0 = {}, base = `http://localhost:${port}/`, res = {}, bad = [], errs = [];
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const mk = async (init) => {
    const ctx = await b.newContext({ ...devices['iPhone 14'] }); ctx.setDefaultTimeout(150000); const pg = await ctx.newPage();
    pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await pg.addInitScript((i) => { try { if (!localStorage.getItem('__init')) { localStorage.setItem('__init', '1'); for (const [k, v] of Object.entries(i)) localStorage.setItem(k, JSON.stringify(v)); } } catch {} }, init);
    return { ctx, pg };
  };
  const clk = (pg, sel) => pg.evaluate((q) => document.querySelector(q).click(), sel);   // DOM-trykk (raskt; Playwrights click venter på bilder, og uten GPU tar det lang tid)
  const ready = async (pg, url) => { await pg.goto(base + url); await pg.waitForFunction(() => window.__game && window.__game.LEVEL, null, { timeout: 120000 }); };
  // 1) hjelpeelementer per nivå (bad2: sju grep-flater, delmål og skjult mål)
  if (only(1)) for (const d of ['beginner', 'medium', 'expert']) {
    const { ctx, pg } = await mk({ 'tlm.difficulty': d, 'tlm.introsweep': false });
    await ready(pg, 'index.html?level=bad2&start=0');
    await pg.touchscreen.tap(195, 420);
    await pg.evaluate(() => { const g = window.__game, p = g.player; p.x = 5; p.y = 12; p.z = 10; p.fx = 1; p.fz = 0; p.vx = p.vy = p.vz = 0; p.onGround = true; p.state = 'ground'; g.cam.yaw = -Math.PI / 2; });
    await pg.waitForTimeout(7000);
    res[d] = await pg.evaluate(() => ({ diff: window.__game.diff.get(), count: window.__game.diff.count(), band: window.__game.diff.tb.current()?.kind, nextText: document.querySelector('#topband .tbt')?.textContent, hint: document.querySelector('#topband .tbk')?.textContent, ver: document.querySelector('#topband .tbv')?.textContent }));
    if (process.env.SHOT === 'all' || d === process.env.SHOT) await pg.screenshot({ path: `${out}/diff_${d}.png`, timeout: 150000 }); await ctx.close();
  }
  if (only(1)) {
  if (res.expert.count.sum !== 0) bad.push('Ekspert: hjelpeelementer synlige: ' + JSON.stringify(res.expert.count));
  if (!(res.beginner.count.sum > res.medium.count.sum && res.medium.count.sum > res.expert.count.sum)) bad.push('forventet Nybegynner > Medium > Ekspert i antall hjelpeelementer: ' + [res.beginner.count.sum, res.medium.count.sum, res.expert.count.sum]);
  if (res.medium.count.kantpil + res.medium.count.markorGrep > 2 + 1) bad.push('Medium: for mange markører'); }
  // 2) startskjerm: Nytt spill → velg vanskelighet; Velg brett; Avslutt til meny
  if (only(2)) { const { ctx, pg } = await mk({ 'tlm.cleared': { bad: 80 }, 'tlm.badges': { bad: { beginner: 1 } } });
    await ready(pg, 'index.html'); await pg.waitForTimeout(1500);
    await pg.screenshot({ path: `${out}/diff_start.png`, timeout: 150000 });
    await clk(pg, '#mNew'); await clk(pg, '#mNew');   // første trykk: «Slette fremgangen? Trykk igjen», andre: velgeren (trykk via DOM: siden er treg uten GPU, og bekreftelsen går ut etter 4 s)
    await pg.waitForSelector('button[data-d]');
    res.pickerButtons = await pg.$$eval('button[data-d]', (e) => e.map((x) => x.dataset.d)); await pg.screenshot({ path: `${out}/diff_picker.png`, timeout: 150000 });
    await clk(pg, '#dfBack'); await pg.waitForSelector('#mLevels'); await clk(pg, '#mLevels'); await pg.waitForSelector('button[data-l]');
    res.levelList = await pg.$$eval('button[data-l]', (e) => e.map((x) => x.textContent)); await pg.screenshot({ path: `${out}/diff_levels.png`, timeout: 150000 });
    await clk(pg, 'button[data-l="bad"]'); await pg.waitForSelector('button[data-d]');
    res.levelDiffs = await pg.$$eval('button[data-d]', (e) => e.map((x) => x.dataset.d));
    // lagre noe fremgang på nivå 1 (Nybegynner), så velg Ekspert fra start: den gamle fremgangen skal bli stående
    await pg.evaluate(() => localStorage.setItem('tlm.progress.bad', JSON.stringify({ clock: 99, save: [0, 0, 0] })));
    await clk(pg, 'button[data-d="expert"]'); await pg.waitForFunction(() => window.__game?.diff && window.__game.diff.get() === 'expert', null, { timeout: 120000 });
    res.afterPlay = await pg.evaluate(() => ({ diff: window.__game.diff.get(), key: window.__game.diff.key(), old: localStorage.getItem('tlm.progress.bad') !== null, url: location.search, lvl: window.__game.LEVEL.name || '' }));
    await pg.waitForTimeout(3000); await pg.screenshot({ path: `${out}/diff_expert_play.png`, timeout: 150000 });
    // ⋯-menyen: Avslutt til meny
    await pg.evaluate(() => document.getElementById('bMore').click()); await pg.waitForTimeout(300);
    await pg.screenshot({ path: `${out}/diff_more.png`, timeout: 150000 });
    await clk(pg, '#bMenu'); await pg.waitForSelector('#mCont'); res.quitText = await pg.textContent('#start .tag'); res.contSmall = await pg.textContent('#mCont small');
    await pg.screenshot({ path: `${out}/diff_quit.png`, timeout: 150000 });
    res.saved = await pg.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('tlm.progress.')));
    // ⚙ → Vanskelighet
    await clk(pg, '#mSet'); await pg.waitForTimeout(500); res.settingsSel = await pg.evaluate(() => { const s = document.querySelector('select[data-s="difficulty"]'); return s ? { v: s.value, o: [...s.options].map((x) => x.textContent) } : null; });
    await pg.evaluate(() => document.getElementById('pMenu').scrollIntoView()); res.pMenuText = await pg.textContent('#pMenu');
    await ctx.close(); }
  // 3) målskjerm: merke og knapper; Avslutt til meny; Spill igjen
  if (only(3)) { const { ctx, pg } = await mk({ 'tlm.difficulty': 'medium', 'tlm.introsweep': false, 'tlm.goallock': false, 'tlm.story': false });
    await ready(pg, 'index.html?level=bad&start=0'); await pg.waitForTimeout(3000);
    await pg.evaluate(() => { const g = window.__game, p = g.player, q = g.LEVEL.goal; p.x = q[0]; p.y = q[1]; p.z = q[2]; p.vx = p.vy = p.vz = 0; p.onGround = true; p.state = 'ground'; });
    await pg.waitForFunction(() => !document.getElementById('win').classList.contains('hide'), null, { timeout: 90000 }); await pg.waitForTimeout(800);
    res.win = await pg.evaluate(() => ({ badge: document.getElementById('winbadge')?.textContent, badges: JSON.parse(localStorage.getItem('tlm.badges')), menu: document.getElementById('winMenu')?.textContent, again: document.getElementById('again')?.textContent }));
    await pg.screenshot({ path: `${out}/diff_win.png`, timeout: 150000 });
    await clk(pg, '#again'); await pg.waitForSelector('button[data-d]'); res.againDiffs = await pg.$$eval('button[data-d]', (e) => e.map((x) => x.dataset.d)); await pg.screenshot({ path: `${out}/diff_again.png`, timeout: 150000 });
    await clk(pg, '#dfBack'); await clk(pg, '#winMenu'); await pg.waitForSelector('#mCont'); res.winQuit = await pg.textContent('#start .tag');
    await ctx.close(); }
  // 4) byggeskjermen og oversikten: Avslutt til meny
  if (only(4)) { const { ctx, pg } = await mk({ 'tlm.introsweep': false, 'tlm.story': false });
    await ready(pg, 'index.html?level=bro&start=0'); await pg.waitForTimeout(3000);
    const opened = await pg.evaluate(() => { const g = window.__game; const s = g.LEVEL.buildSites?.[0]; if (!s) return 'ingen bygg'; const p = g.player; p.x = s.x - 3; p.y = s.y + 0.05; p.z = s.z; p.vx = p.vy = p.vz = 0; p.onGround = true; p.state = 'ground'; return g.bld.open() ? 'ok' : 'åpnet ikke'; });
    await pg.waitForTimeout(1500);
    res.build = await pg.evaluate(() => ({ active: window.__game.bld?.active, btn: document.querySelector('#bld .bmenu')?.textContent, opened: 0 })); res.build.opened = opened;
    await pg.screenshot({ path: `${out}/diff_build.png`, timeout: 150000 });
    if (res.build.active) { await clk(pg, '#bld .bmenu'); await pg.waitForSelector('#mCont'); res.build.after = await pg.evaluate(() => ({ active: window.__game.bld.active, start: !document.getElementById('start').classList.contains('hide') })); }
    await ctx.close(); }
  await b.close();
  console.log(JSON.stringify(res, null, 1)); if (errs.length) { console.log('KONSOLLFEIL', [...new Set(errs)]); process.exit(1); }
  if (only(2)) {
  if (res.pickerButtons?.join() !== 'beginner,medium,expert') bad.push('vanskelighetsvelger');
  if (!res.levelList?.some((t) => t.includes('Nivå 1')) || !res.levelList.some((t) => t.includes('🥉'))) bad.push('Velg brett viser nivå 1 med merke');
  if (res.afterPlay?.diff !== 'expert' || !res.afterPlay.old || !/fresh|level=bad/.test(res.afterPlay.url + 'level=bad')) bad.push('Velg brett på Ekspert: ' + JSON.stringify(res.afterPlay));
  if (!/lagret/i.test(res.quitText || '')) bad.push('Avslutt til meny viser «Fremgangen er lagret»'); }
  if (only(3) && (!res.win?.badge || !res.win.badges?.bad?.medium)) bad.push('merke på målskjermen: ' + JSON.stringify(res.win));
  if (only(4) && res.build?.active && !res.build.after?.start) bad.push('Avslutt til meny fra bygg');
  if (bad.length) { console.log('FEIL', bad); process.exit(1); } console.log('live difficulty: ok');
})();
