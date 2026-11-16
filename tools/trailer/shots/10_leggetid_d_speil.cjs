// 10_leggetid_d_speil: kameraet står ved speilet; figuren står stille, men speilbildet blunker (for sent, etter en pause). Speilbildet er en speilvendt kopi av figuren (cine.prop hero, blink).
const L = require('./_leggetid.cjs');
let ids = null;
const BLINK = [26, 27, 28, 29];       // bilder der speilbildet har øynene lukket (bilde 26 = 2,2 s)
module.exports = {
  id: '10_leggetid_d_speil',
  ticksPerFrame: 5,
  async setup(ctx) { ids = await L.build(ctx); await ctx.cine.step(30, 1 / 60); },
  async frame(ctx, i, n) {
    const t = n > 1 ? i / (n - 1) : 0, e = L.sm(t);
    const blink = BLINK.includes(i) ? (i === 26 || i === 29 ? 0.6 : 1) : 0;
    const cam = L.envCam() || { x: L.mix(-6.5, -4.2, e), y: L.mix(27.5, 27.2, e), z: L.mix(-4, -6.5, e), tx: -1.2, ty: L.mix(26, 27, e), tz: -22, fov: L.mix(46, 36, e) };
    await L.night(ctx.page, 1); await ctx.cine.setCam(cam); await L.reflect(ctx, ids, cam, blink);
  },
};
