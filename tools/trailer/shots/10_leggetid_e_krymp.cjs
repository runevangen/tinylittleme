// 10_leggetid_e_krymp: krympingen. Figurens skala går fra 24 til 1 (cine.heroScale) mens kameraet glir fra speilvinkelen til gulvnivå-posen som 01_bad_oversikt starter på; kveldslyset blir til dagslys,
// speil og skapinnhold tones ut, og figuren flyttes (mens den er liten) til startstedet i 01. De siste bildene er identiske med første bilde i 01 (match-cut).
const L = require('./_leggetid.cjs');
const sl = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '..', 'shotlist.json'), 'utf8')).klipp.find((k) => k.id === '01_bad_oversikt');
const A = sl.kamera.bane[0], F0 = sl.kamera.fov_fra, SP = sl.startpose;
const P0 = { x: -4.2, y: 27.2, z: -6.5, tx: -1.2, ty: 27, tz: -22, fov: 36 };                    // der 10_leggetid_d_speil slutter
const P1 = { x: A.pos[0], y: A.pos[1], z: A.pos[2], tx: A.mot[0], ty: A.mot[1], tz: A.mot[2], fov: F0 };
const H0 = { x: -1, z: -12 };
let ids = null;
module.exports = {
  id: '10_leggetid_e_krymp',
  ticksPerFrame: 5,
  async setup(ctx) { ids = await L.build(ctx); await ctx.cine.step(30, 1 / 60); },
  async frame(ctx, i, n) {
    const { cine, page } = ctx;
    const e = L.sm(L.cl((i - 8) / 52)), s = Math.pow(L.HS, 1 - e), ce = L.sm(L.cl((i - 6) / 62)), he = L.sm(L.cl((i - 24) / 40));
    const h = { x: L.mix(H0.x, SP.x, he), y: 0, z: L.mix(H0.z, SP.z, he), yaw: Math.PI };
    await cine.setHero(h); await cine.heroScale(s);
    const cam = L.envCam() || await cine.lerpCam(P0, P1, ce, 'linear');
    const day = L.sm(L.cl((i - 40) / 28));
    await L.night(page, 1 - day);
    if (i >= 50) await L.fadeProps(ctx, ids, 1 - L.cl((i - 50) / 14));
    await cine.setCam(cam);
    if (i < 56) await L.reflect(ctx, ids, cam, 0, h, s); else await cine.prop.set(ids.refl, { sx: 0, sy: 0, sz: -0.001 });
    if (i === n - 1) await cine.prop.clear();
  },
};
