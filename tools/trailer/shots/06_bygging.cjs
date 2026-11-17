// 06_bygging (shotlist.json): byggeskjermen i Bygglab, sted lab4 «Fagverk», MODUS Rutenett (grid_logic.js / grid_view.js, v2.08+). Alt er ekte byggeskjerm og fysikk, styrt med trykk (musa) som på mobil.
// Del 1 (bilde 8-36): en bro av trekanter bygges med trykk: trykk et punkt/knute og så neste (kjede: hver stav starter der forrige slapp), 14 trykk, 9 staver i tre (Pratt-fagverk over kjøredekket).
// Del 2 (bilde 40-119): last Robot valgt, PRØV: roboten går over; stavene skifter farge etter belastning (grønn -> gul, spillets egen belastningsfarge, v2.10) mens fagverket tåler lasten.
// Byggeskjermen er et 2D-sidebilde, ikke 3D-scenen: vi zoomer med spillets egen + (2 trykk) og panorerer; skjuler bare delings-/menyknappene (ingen egen animasjon).
const SITE = 'lab4';
const DT_EDIT = 0.02, DT_SIM = 0.12;
const HIDE = '#bld .loads,#bld .share,#bld [data-a=menu],#bld .menu{display:none!important}';
const ST = 1.25, X = [-2.5, -1.25, 0, 1.25, 2.5];
// trykkrekkefølge (u, v): kjede d0 -> t1 -> t2 -> t3 -> d4, (velg bort), d1 -> t1 -> d2 -> t2, (velg bort), d3 -> t3 -> d2; d = dekkpunkt (v 0), t = toppunkt (v 1 rad opp)
const TAPS = [[X[0], 0], [X[1], ST], [X[2], ST], [X[3], ST], [X[4], 0], [X[4], 0], [X[1], 0], [X[1], ST], [X[2], 0], [X[2], ST], [X[2], ST], [X[3], 0], [X[3], ST], [X[2], 0]];
const T = { zoom: 15, tap0: 20, perTap: 2, deselect: 50, robot: 54, try: 60 };   // bilde 0-14: tomt sted i oversikt (flagget til høyre i bildet, «Bygg en bro til flagget»); så zoom inn og bygg
module.exports = {
  id: '06_bygging',
  ticksPerFrame: 1,   // byggeprøven går bilde for bilde: 1 tikk (1/60 s) pluss dt fra klippet
  async setup({ page, cine }) {
    await cine.seed(1);
    await cine.set('gridstage', false);   // fri rutenett-bygging (uten oppdragskrav og låsing), som da klippet ble laget
    await cine.build.open(SITE);
    await cine.build.step(DT_EDIT);
    const click = async (sel) => { const r = await page.locator(sel).first().boundingBox(); await page.mouse.click(r.x + r.width / 2, r.y + r.height / 2); await cine.build.step(DT_EDIT); };
    await click('#bld [data-a=mode]');                                          // MODUS: Rutenett (knappen er skjult etterpå)
    await page.addStyleTag({ content: HIDE });
    await click('#bld .zoom button[data-z=in]');                               // ett trykk (x1,5): hele stedet med flagget synlig
  },
  async frame({ page, cine }, i, n) {
    const pos = (u, v) => page.evaluate(([u, v]) => window.__game.bld.screenPos(u, v), [u, v]);
    const box = async (sel) => { const r = await page.locator(sel).first().boundingBox(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; };
    let dt = DT_EDIT;
    if (i === T.zoom) {                                                          // zoom inn til byggehøyde (ett trykk til, x2,3) og dekket ned mot nedre halvdel
      for (let z = 0; z < 1; z++) { const r = await box('#bld .zoom button[data-z=in]'); await page.mouse.click(r.x, r.y); await cine.build.step(DT_EDIT); }
      const sp = await pos(0, 0), dy = 300 - sp.y;
      await page.mouse.move(480, 200); await page.mouse.down(); await page.mouse.move(480, 200 + dy, { steps: 5 }); await page.mouse.up(); await cine.build.step(DT_EDIT);
    }
    const k = i - T.tap0;
    if (k >= 0 && k % T.perTap === 0 && k / T.perTap < TAPS.length) { const [u, v] = TAPS[k / T.perTap], p = await pos(u, v); await page.mouse.click(p.x, p.y); }
    if (i === T.deselect) { const p = await pos(X[2], 0); await page.mouse.click(p.x, p.y); }   // selve valget av siste knute oppheves
    if (i === T.robot) {                                                         // velg lasten Robot (lastknappene vises bare mens vi trykker)
      await page.addStyleTag({ content: '#bld .loads{display:flex!important}' });
      for (const b of await page.locator('#bld .loads button').all()) if ((await b.textContent()).includes('Robot')) { const r = await b.boundingBox(); await page.mouse.click(r.x + r.width / 2, r.y + r.height / 2); }
      await page.addStyleTag({ content: HIDE });
    }
    if (i === T.try) { const r = await box('#bld [data-a=try]'); await page.mouse.click(r.x, r.y); }
    if (i > T.try) dt = DT_SIM;
    await cine.build.step(dt);
    if (process.env.CLIP_DEBUG && i % 6 === 0) console.log(i, JSON.stringify(await page.evaluate(() => { const b = window.__game.bld; return { r: b.result && { s: b.result.state, why: b.result.reason, t: +b.result.t.toFixed(2) }, p: b.state().builds[0] && b.state().builds[0].placed }; })));
  },
};
