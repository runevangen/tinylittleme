// 01_bad_oversikt (shotlist.json): langsom kamerabane over badet, figuren står stille som målestokk.
const sl = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '..', 'shotlist.json'), 'utf8')).klipp.find((k) => k.id === '01_bad_oversikt');
const [A, B] = sl.kamera.bane, F0 = sl.kamera.fov_fra, F1 = sl.kamera.fov_til;
const pose = (p, fov) => ({ x: p.pos[0], y: p.pos[1], z: p.pos[2], tx: p.mot[0], ty: p.mot[1], tz: p.mot[2], fov });
module.exports = {
  id: '01_bad_oversikt',
  async setup({ cine }) { await cine.seed(1); await cine.setHero(sl.startpose); },
  async frame({ cine }, i, n) {
    const t = n > 1 ? i / (n - 1) : 0;
    await cine.setCam(await cine.lerpCam(pose(A, F0), pose(B, F1), t, 'smooth'));
  },
};
