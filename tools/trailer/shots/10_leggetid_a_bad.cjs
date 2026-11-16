// 10_leggetid_a_bad: «Tirsdag. 21.47.» Badet om kvelden, figuren (full skala) foran speilet, sett skrått bakfra; speilbildet står i speilet. Kameraet glir sakte inn mot speilet.
const L = require('./_leggetid.cjs');
let ids = null;
module.exports = {
  id: '10_leggetid_a_bad',
  ticksPerFrame: 5,
  async setup(ctx) { ids = await L.build(ctx); await ctx.cine.step(30, 1 / 60); },
  async frame(ctx, i, n) {
    const t = n > 1 ? i / (n - 1) : 0, e = L.sm(t);
    const cam = L.envCam() || { x: L.mix(-11.5, -8.5, e), y: 27, z: L.mix(15, 12, e), tx: -3, ty: L.mix(21.5, 23, e), tz: -20, fov: L.mix(44, 40, e) };
    await L.night(ctx.page); await ctx.cine.setCam(cam); await L.reflect(ctx, ids, cam);
  },
};
