// 10_leggetid_a_bad: «Tirsdag. 21.47.» Badet om kvelden, figuren (full skala) foran speilet, sett skrått bakfra; speilbildet står i speilet. Kameraet glir sakte inn mot speilet.
const L = require('./_leggetid.cjs');
let ids = null;
module.exports = {
  id: '10_leggetid_a_bad',
  ticksPerFrame: 5,
  async setup(ctx) { ids = await L.build(ctx); await ctx.cine.step(30, 1 / 60); },
  async frame(ctx, i, n) {
    const t = n > 1 ? i / (n - 1) : 0, e = L.sm(t);
    const cam = L.envCam() || { x: L.mix(10, 7, e), y: L.mix(30, 29, e), z: L.mix(3, -1, e), tx: L.mix(-1, -1.5, e), ty: L.mix(26.5, 27.5, e), tz: -20, fov: 50 };
    await L.night(ctx.page); await ctx.cine.setCam(cam); await L.reflect(ctx, ids, cam);
  },
};
