// 06_bygging (shotlist.json): byggeskjermen i Bygglab, sted lab7 «Tåler». Alt er ekte byggeskjerm og fysikk (build.js / build_phys.js), styrt med musa som på mobil.
// Del 1: én lang planke + en stabel klosser (planka tåler ca. 4) -> PRØV -> brudd. Del 2: NULLSTILL, to lange planker med tape (tåler ca. 12) -> PRØV -> testfiguren går over (seier).
// Byggeskjermen er et 2D-sidebilde, ikke 3D-scenen: vi zoomer (+) og panorerer til broen fyller bildet, og skjuler bare lastknappene/delingsknappene (ingen egen animasjon).
const SITE = 'lab7';
const DT_EDIT = 0.02, DT_SIM = 1 / 12;
const CHIP = { plank: '#bld .chip[data-id^="lab_plank_l_"]', block: '#bld .chip[data-id^="lab_block_"]' };
const HIDE = '#bld .loads,#bld .share,#bld [data-a=menu],#bld .menu{display:none!important}#bld .tools{display:none!important}';
let held = null;   // pågående dra-og-slipp: { sel, u, v, f0, nf, sx, sy, tx, ty }

// tidslinje (bilde-indekser, 120 bilder)
const T = { plank1: 4, blocks: 10, blockN: 5, blockLen: 2, try1: 33, sim1End: 61, reset: 62, plankA: 64, plankB: 67, tapeTool: 71, tapeA: 72, tapeB: 73, try2: 77 };

module.exports = {
  id: '06_bygging',
  async setup({ page, cine }) {
    await cine.seed(1);
    await cine.build.open(SITE);
    await page.addStyleTag({ content: HIDE });
    await cine.build.step(DT_EDIT);
    const click = async (sel) => { const r = await page.locator(sel).first().boundingBox(); await page.mouse.click(r.x + r.width / 2, r.y + r.height / 2); await cine.build.step(DT_EDIT); };
    for (let k = 0; k < 5; k++) await click('#bld .zoom button[data-z=in]');      // zoom ca. x7,6
    const sp = await page.evaluate(() => window.__game.bld.screenPos(0, 0.25));
    const dy = 372 - sp.y;                                                    // broen opp i bildet, over delebrettet
    await page.mouse.move(150, 250); await page.mouse.down(); await page.mouse.move(150, 250 + dy, { steps: 5 }); await page.mouse.up(); await cine.build.step(DT_EDIT);
    held = null;
  },
  async frame({ page, cine, shot }, i, n) {
    const mouse = page.mouse;
    const pos = (u, v) => page.evaluate(([u, v]) => window.__game.bld.screenPos(u, v), [u, v]);
    const box = async (sel) => { const r = await page.locator(sel).first().boundingBox(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; };
    // dra en del fra delebrettet til (u,v) over nf bilder, startbilde f0
    const drag = async (sel, u, v, f0, nf) => {
      if (i < f0 || i >= f0 + nf) return;
      const k = i - f0;
      if (k === 0) { const a = await box(sel), b = await pos(u, v); held = { sx: a.x, sy: a.y, tx: b.x, ty: b.y }; await mouse.move(a.x, a.y); await mouse.down(); return; }
      const t = Math.min(1, k / (nf - 1)), e = t * t * (3 - 2 * t);
      await mouse.move(held.sx + (held.tx - held.sx) * e, held.sy + (held.ty - held.sy) * e);
      if (k === nf - 1) await mouse.up();
    };
    let dt = DT_EDIT;
    await drag(CHIP.plank, 0, 0.25, T.plank1, 6);
    for (let b = 0; b < T.blockN; b++) await drag(CHIP.block, 0, 1.1 + 1.5 * b, T.blocks + b * T.blockLen, T.blockLen);
    if (i === T.try1) await cine.build.start();
    if (i > T.try1 && i < T.sim1End) dt = DT_SIM;
    if (i === T.sim1End - 1) await cine.build.stop();
    if (i === T.reset) { const r = await box('#bld button[data-a=reset]'); await mouse.click(r.x, r.y); }
    // del 2: to planker + tape
    await drag(CHIP.plank, 0, 0.25, T.plankA, 3);
    await drag(CHIP.plank, 0, 0.75, T.plankB, 3);
    if (i === T.tapeTool) { await page.addStyleTag({ content: '#bld .tools{display:flex!important}' }); const r = await box('#bld .tools button[data-t=tape]'); await mouse.click(r.x, r.y); await page.addStyleTag({ content: '#bld .tools{display:none!important}' }); }
    if (i === T.tapeA) { const p = await pos(-2, 0.2); await mouse.click(p.x, p.y); }
    if (i === T.tapeB) { const p = await pos(-2, 0.8); await mouse.click(p.x, p.y); }
    if (i === T.try2) await cine.build.start();
    if (i > T.try2) dt = 0.28;
    await cine.build.step(dt);
    if (process.env.CLIP_DEBUG && i % 6 === 0) console.log(i, JSON.stringify(await page.evaluate(() => { const b = window.__game.bld; return { r: b.result && { s: b.result.state, why: b.result.reason, t: +b.result.t.toFixed(2) }, p: b.state().builds[0] && b.state().builds[0].placed }; })));
  },
};
