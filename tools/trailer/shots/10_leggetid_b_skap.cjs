// 10_leggetid_b_skap: figuren snur seg mot speilskapet og rekker ut hånda; mellom tannkrem og plaster står en liten flaske med lappen «IKKE ta denne.». Kameraet går fra skuldervinkel inn mot lappen.
const L = require('./_leggetid.cjs');
let ids = null;
const H = { x: 2.2, y: 0, z: -12 };
module.exports = {
  id: '10_leggetid_b_skap',
  ticksPerFrame: 5,
  async setup(ctx) { ids = await L.build(ctx); await L.forceArm(ctx.page, { aR: -0.2, eR: -0.1 }); await ctx.cine.step(30, 1 / 60); },
  async frame(ctx, i, n) {
    const t = n > 1 ? i / (n - 1) : 0, turn = L.sm(L.cl(i / 18)), reach = L.sm(L.cl((i - 14) / 14)), e = L.sm(L.cl((i - 10) / 44));
    const yaw = L.mix(Math.PI, 2.45, turn);
    await ctx.cine.setHero({ x: H.x, y: 0, z: H.z, yaw });
    await L.forceArm(ctx.page, { aR: L.mix(-0.2, -1.55, reach), eR: L.mix(-0.1, -0.5, reach) });
    const cam = L.envCam() || { x: L.mix(-11, 3.2, e), y: L.mix(27, 29.6, e), z: L.mix(-5, -10.5, e), tx: L.mix(0, 7.2, e), ty: L.mix(25, 29.3, e), tz: -21, fov: L.mix(50, 30, e) };
    await L.night(ctx.page, 1); await ctx.cine.setCam(cam); await L.reflect(ctx, ids, cam, 0, { x: H.x, y: 0, z: H.z, yaw });
  },
};
