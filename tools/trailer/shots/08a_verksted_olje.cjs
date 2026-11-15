// 08a_verksted_olje (shotlist.json): figuren løper inn på oljeflekken olje_1 og sklir; stikka legges til siden, men bremsene virker nesten ikke (slickAccel 5), så han fortsetter videre i en bue.
// Ekte spillfysikk (touch.x/touch.y), 8 tikk per bilde (1,6 s spilltid på 12 bilder). Målt: oljekanten x = -56, full fart 4,2 enh/s.
// Kamera: lavt, fritt (cam.yaw 0, fra +z-siden), følger figuren med litt forsprang og dolly inn med ease; glansstripene på oljen skal synes.
const sm = (t) => t * t * (3 - 2 * t);
const mix = (a, b, t) => a + (b - a) * t;
let look = null, camPos = null;
module.exports = {
  id: '08a_verksted_olje',
  ticksPerFrame: 8,
  async setup({ cine, page }) {
    await cine.seed(1);
    await cine.setHero({ x: -59.5, y: 0, z: 4, yaw: 1.5708 });
    await page.evaluate(() => { window.__game.cam.yaw = 0; });
    await cine.step(30, 1 / 60);   // lander og får fart før bilde 1
    look = null; camPos = null;
  },
  async frame({ cine, page }, i, n) {
    const t = n > 1 ? i / (n - 1) : 0, e = sm(t);
    const p = await cine.get('hero');
    // bilde 0-3: rett fram (+x) mot oljen; så stikka mot -z (bort fra kamera), men han sklir videre mot +x
    const tx = i < 5 ? 1 : 0.15, ty = i < 5 ? 0 : 1;
    await page.evaluate(([x, y]) => { const g = window.__game; g.cam.yaw = 0; g.touch.x = x; g.touch.y = y; }, [tx, ty]);
    const want = { x: p.x + mix(1.6, 1.4, e), y: 0.7, z: p.z };
    look = look ? { x: mix(look.x, want.x, 0.4), y: want.y, z: mix(look.z, want.z, 0.4) } : want;
    const wp = { x: p.x + mix(-1.2, 0.3, e), y: mix(1.1, 0.9, e), z: p.z + mix(5.8, 4.8, e) };
    camPos = camPos ? { x: mix(camPos.x, wp.x, 0.4), y: wp.y, z: mix(camPos.z, wp.z, 0.4) } : wp;
    await cine.setCam({ x: camPos.x, y: camPos.y, z: camPos.z, tx: look.x, ty: look.y, tz: look.z, fov: mix(54, 50, e) });
  },
};
