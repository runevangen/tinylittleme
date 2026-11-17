// 06c_over (shotlist.json): verdensbilde etter byggeskjermen. Samme bro som i 06_bygging (Bygglab, sted lab4 «Fagverk», rutenett, 9 staver i tre) bygges med trykk i setup og prøves med Robot til prøven er vunnet:
// spillets egen R26-mekanikk (build_world.js) setter da det ferdige bygget inn i verden som faste kollisjonsflater. Byggeskjermen lukkes, og den ekte figuren går over broen til målflagget (styrt med
// stikka som på mobil: touch.y, ingen setHero under gangen). Kameraet følger figuren i sideriss (litt ovenfra). Ingen egne animasjoner.
const SITE = 'lab4';
const DT_EDIT = 0.02, DT_SIM = 0.12;
const HIDE = '#bld .loads,#bld .share,#bld [data-a=menu],#bld .menu{display:none!important}';
const ST = 1.25, X = [-2.5, -1.25, 0, 1.25, 2.5];
const TAPS = [[X[0], 0], [X[1], ST], [X[2], ST], [X[3], ST], [X[4], 0], [X[4], 0], [X[1], 0], [X[1], ST], [X[2], 0], [X[2], ST], [X[2], ST], [X[3], 0], [X[3], ST], [X[2], 0]];
const sm = (t) => t * t * (3 - 2 * t);
const START = { x: -14.8, y: 3, z: 0, yaw: Math.PI / 2 };
module.exports = {
  id: '06c_over',
  async setup({ page, cine }) {
    await cine.seed(1);
    await cine.set('gridstage', false);
    await cine.set('labstart', false);
    await cine.build.open(SITE);
    await cine.build.step(DT_EDIT);
    const click = async (sel) => { const r = await page.locator(sel).first().boundingBox(); await page.mouse.click(r.x + r.width / 2, r.y + r.height / 2); await cine.build.step(DT_EDIT); };
    await click('#bld [data-a=mode]');
    await page.addStyleTag({ content: HIDE });
    for (let k = 0; k < 2; k++) await click('#bld .zoom button[data-z=in]');
    const pos = (u, v) => page.evaluate(([u, v]) => window.__game.bld.screenPos(u, v), [u, v]);
    const sp = await pos(0, 0), dy = 300 - sp.y;
    await page.mouse.move(480, 200); await page.mouse.down(); await page.mouse.move(480, 200 + dy, { steps: 5 }); await page.mouse.up(); await cine.build.step(DT_EDIT);
    for (const [u, v] of TAPS) { const p = await pos(u, v); await page.mouse.click(p.x, p.y); await cine.build.step(DT_EDIT); }
    { const p = await pos(X[2], 0); await page.mouse.click(p.x, p.y); await cine.build.step(DT_EDIT); }
    await page.addStyleTag({ content: '#bld .loads{display:flex!important}' });
    for (const b of await page.locator('#bld .loads button').all()) if ((await b.textContent()).includes('Robot')) { const r = await b.boundingBox(); await page.mouse.click(r.x + r.width / 2, r.y + r.height / 2); }
    await page.addStyleTag({ content: HIDE });
    { const r = await page.locator('#bld [data-a=try]').first().boundingBox(); await page.mouse.click(r.x + r.width / 2, r.y + r.height / 2); }
    let st = null;
    for (let k = 0; k < 400; k++) { st = await cine.build.step(DT_SIM); const s = await page.evaluate(() => window.__game.bld.result && window.__game.bld.result.state); if (s !== 'run') { st = s; break; } }
    console.log('prøve:', st, JSON.stringify(await page.evaluate(() => ({ r: window.__game.bld.result && window.__game.bld.result.state, inWorld: window.__game.bld.inWorld('lab4'), n: window.__game.bld.worldCount('lab4'), solved: window.__game.bld.isSolved('lab4') }))));
    await page.evaluate(() => window.__game.bld.close('kino'));
    await cine.setHero(START);
  },
  async frame({ cine, page }, i, n) {
    const t = n > 1 ? i / (n - 1) : 0;
    await page.evaluate(() => { const g = window.__game; g.cam.yaw = Math.PI / 2 + Math.PI; g.touch.x = 0; g.touch.y = 1; });
    const hx = await page.evaluate(() => window.__game.player.x);   // kameraet følger figuren (sideriss, litt ovenfra), flagget kommer inn i bildet mot slutten
    const k = sm(Math.min(1, t * 1.2)), cx = hx - 0.5 + 2 * k;
    await cine.setCam({ x: cx, y: 5.8 - 0.1 * k, z: 6.6 + 2 * k, tx: cx + 1.6 + 1.6 * k, ty: 3.4 + 1.3 * k, tz: 0, fov: 55 });
    if (process.env.CLIP_DEBUG && i % 4 === 0) console.log(i, JSON.stringify(await page.evaluate(() => { const g = window.__game; return { x: +g.player.x.toFixed(2), y: +g.player.y.toFixed(2), z: +g.player.z.toFixed(2) }; })));
  },
};
