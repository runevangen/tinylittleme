// 10_leggetid_c_tablett: nærbilde: én tablett i hånda (høyrearmen bøyd opp mot brystet), glasset med vann ved siden av. Kameraet følger hånda og går sakte nærmere.
const L = require('./_leggetid.cjs');
let ids = null;
const H = { x: 2.2, y: 0, z: -12, yaw: 2.45 };
module.exports = {
  id: '10_leggetid_c_tablett',
  ticksPerFrame: 5,
  async setup(ctx) { ids = await L.build(ctx, { hero: H }); await L.forceArm(ctx.page, { aR: -1.2, eR: -0.5 }); await ctx.cine.step(30, 1 / 60); },
  async frame(ctx, i, n) {
    const t = n > 1 ? i / (n - 1) : 0, up = L.sm(L.cl(i / 16)), e = L.sm(t);
    await ctx.cine.setHero(H);
    await L.forceArm(ctx.page, { aR: L.mix(-1.4, -1.6, up), eR: -0.5, zR: 0 });
    await ctx.cine.render(); await ctx.cine.render();      // armens pose settes ved tegning: tegn først, les så hånda
    const hp = await L.handPos(ctx.page);
    await ctx.cine.prop.set(ids.pill, { x: hp.px, y: hp.py, z: hp.pz, rx: 0.5, rz: 0.2 });
    if (process.env.CLIP_DEBUG) console.log('hand', JSON.stringify(hp), 'pill', ids.pill);
    const d = L.mix(7.0, 4.2, e);
    const f = [Math.sin(H.yaw), Math.cos(H.yaw)], r = [Math.cos(H.yaw), -Math.sin(H.yaw)];   // figurens blikkretning og høyre side i verden
    const cam = L.envCam() || { x: hp.px + f[0] * d * 0.25 - r[0] * d, y: hp.py + 0.5, z: hp.pz + f[1] * d * 0.25 - r[1] * d, tx: hp.px, ty: hp.py - 0.1, tz: hp.pz, fov: 34 };
    await L.night(ctx.page, 1); await ctx.cine.setCam(cam);
  },
};
