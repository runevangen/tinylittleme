// 10_leggetid_e_krymp: krympingen. Figuren står stille på S (samme x/z og samme retning som i klipp a-d); bare skalaen går fra 24 til 1 (cine.heroScale, forankret i fotpunktet).
// Kameraet kretser/dollyer rundt figurens bryst (kamerastedet er bryst + retning * avstand; retningen glir fra speilvinkelen til sluttvinkelen, avstanden går ned med samme eksponentielle kurve som skalaen,
// så figuren skrumper jevnt på skjermen) og blikket går fra speilet til figuren. Kveldslyset blir til dagslys, speil og skapinnhold tones ut. Siste bilde = første bilde i 01_bad_oversikt (match-cut, END_CAM).
const L = require('./_leggetid.cjs');
const P0 = { x: -8, y: 26.5, z: 8, tx: -3.2, ty: 24.5, tz: -20, fov: 34 };                    // der 10_leggetid_d_speil slutter
const E = L.END_CAM, S = L.S, CH = 0.55;                                                         // brysthøyde = CH * skala
const chest = (s) => ({ x: S.x, y: CH * s, z: S.z });
const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };
const c0 = chest(L.HS), c1 = chest(1);
const o0 = [P0.x - c0.x, P0.y - c0.y, P0.z - c0.z], o1 = [E.x - c1.x, E.y - c1.y, E.z - c1.z];
const d0 = Math.hypot(...o0), d1 = Math.hypot(...o1), u0 = norm(o0), u1 = norm(o1);
const tn = (fov) => 2 * Math.tan(fov * Math.PI / 360);                                          // synlig høyde = avstand * tn(fov)
const f0 = L.HS / (d0 * tn(P0.fov)), f1 = 1 / (d1 * tn(E.fov));                                  // figurens andel av bildehøyden (i skalaenheter) først og sist
let ids = null;
module.exports = {
  id: '10_leggetid_e_krymp',
  ticksPerFrame: 5,
  async setup(ctx) { ids = await L.build(ctx); await ctx.cine.step(30, 1 / 60); },
  async frame(ctx, i, n) {
    const { cine, page } = ctx;
    const e = L.sm(L.cl((i - 8) / 52)), s = Math.pow(L.HS, 1 - e), ce = L.sm(L.cl((i - 6) / 62)), w = L.sm(L.cl(ce / 0.22));
    const h = { x: S.x, y: 0, z: S.z, yaw: Math.PI };
    await cine.setHero(h); await cine.heroScale(s);
    const c = chest(s), u = norm([L.mix(u0[0], u1[0], ce), L.mix(u0[1], u1[1], ce), L.mix(u0[2], u1[2], ce)]), fov = L.mix(P0.fov, E.fov, ce), f = Math.exp(L.mix(Math.log(f0), Math.log(f1), ce)), d = s / (f * tn(fov));   // avstanden følger av ønsket skjermandel f (jevn eksponentiell nedgang)
    const cam = L.envCam() || { x: c.x + u[0] * d, y: c.y + u[1] * d, z: c.z + u[2] * d,
      tx: L.mix(P0.tx, c.x, w), ty: L.mix(P0.ty, c.y + 0.1 * s, w), tz: L.mix(P0.tz, c.z, w), fov };
    const day = L.sm(L.cl((i - 40) / 28));
    await L.night(page, 1 - day);
    if (i >= 50) await L.fadeProps(ctx, ids, 1 - L.cl((i - 50) / 14));
    await cine.setCam(cam);
    if (i < 56) await L.reflect(ctx, ids, cam, 0, h, s); else await cine.prop.set(ids.refl, { sx: 0, sy: 0, sz: -0.001 });
    if (i === n - 1) await cine.prop.clear();
  },
};
