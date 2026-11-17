// 01_bad_oversikt (shotlist.json): etter krympingen (10_leggetid_e_krymp): første bilde = siste bilde der (figuren i skala 1 på S, gulvnivå-kameraet END_CAM). Så løfter kameraet seg og glir
// ut over badet (mot trappa av esker og vaskekurven) mens figuren blir stående på S som målestokk. Banen er ferdig rundt bilde 46 (trailerutsnittet er 3,2-4 s), siste bildene holder.
const L = require('./_leggetid.cjs');
const A = L.END_CAM;
const B = { x: -21, y: 9, z: -6, tx: -2, ty: 4, tz: -4, fov: 58 };
module.exports = {
  id: '01_bad_oversikt',
  async setup({ cine }) { await cine.seed(1); await cine.setHero({ x: L.S.x, y: 0, z: L.S.z, yaw: Math.PI }); await cine.step(417, 1 / 60); },   // samme spilltid som ved siste bilde i krympingen (2 + 30 + 78 x 5 tikk), så mauren står likt
  async frame({ cine }, i, n) {
    const t = L.sm(L.cl((i - 2) / 44));
    await cine.setCam(await cine.lerpCam(A, B, t, 'linear'));
  },
};
