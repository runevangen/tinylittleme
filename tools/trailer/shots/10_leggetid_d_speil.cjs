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
    const cam = L.envCam() || { x: L.mix(-10, -8, e), y: 26.5, z: L.mix(11, 8, e), tx: -3.2, ty: L.mix(23, 24.5, e), tz: -20, fov: L.mix(40, 34, e) };
    await L.night(ctx.page, 1); await ctx.cine.setCam(cam); await L.reflect(ctx, ids, cam, blink);
  },
};
