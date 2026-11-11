// R20: kartkoordinater, oversiktskamera og tidslinje (ren logikk i overview_logic.js)
import fs from 'node:fs';
import { miniLayout, relPoint, mapScale, toMap, mapDots, overviewCam, OV, ovBlend, ovDone, ovDotsAlpha, canOverview } from './overview_logic.js';
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('FEIL', m); } };
const near = (a, b, e = 1e-6) => Math.abs(a - b) < e;
const room = { x0: -30, x1: 30, z0: -28, z1: 28 };

// kartkoordinater: rommets midte i midten; blikk (yaw 0 => -z) peker opp på kartet
const S = 100, c = toMap(0, 0, room, S, 0);
ok(near(c.x, 50) && near(c.y, 50), 'rommets midte er kartets midte');
const fwd = toMap(0, -10, room, S, 0); ok(near(fwd.x, 50) && fwd.y < 50, 'frem (-z, yaw 0) er opp');
const right = toMap(10, 0, room, S, 0); ok(right.x > 50 && near(right.y, 50), 'x+ er til høyre ved yaw 0');
const y90 = toMap(-10, 0, room, S, Math.PI / 2); ok(near(y90.x, 50) && y90.y < 50, 'yaw 90 grader: blikk er -x, så -x peker opp');
const r = relPoint(3, 4, 0, 0, 0.7); ok(near(Math.hypot(r.u, r.v), 5), 'rotasjon bevarer avstand');
for (let a = 0; a < 6.3; a += 0.3) for (const [x, z] of [[room.x0, room.z0], [room.x1, room.z0], [room.x0, room.z1], [room.x1, room.z1]]) {
  const m = toMap(x, z, room, S, a); ok(Math.hypot(m.x - 50, m.y - 50) <= 50 - 3.9, `hjørne innenfor sirkelen (yaw ${a.toFixed(1)})`);
}
ok(mapScale(room, 100) > 0 && mapScale({ x0: 0, x1: 0, z0: 0, z1: 0 }, 100) > 0, 'skala er positiv selv for tomt rom');

// minikartet ligger under HUD og utenfor knappene (høyre kolonne) på iPhone, stående og liggende
for (const [vw, vh] of [[390, 844], [844, 390], [375, 667]]) {
  const L = miniLayout(vw, vh);
  ok(L.left >= 0 && L.top >= 0 && L.left + L.size <= vw && L.top + L.size <= vh, `minikart innenfor skjermen ${vw}x${vh}`);
  ok(L.top > 110 || L.left > 260, `minikart ikke over HUD ${vw}x${vh}`);
  const btn = { x0: vw - 236, y0: vh - 246 - 54, x1: vw, y1: vh };
  ok(L.left + L.size < btn.x0 || L.top + L.size < btn.y0, `minikart overlapper ikke knappene ${vw}x${vh}`);
}

// prikker: smuler som er tatt vises ikke; flagg bare etter lagring; figur og mål alltid
const crumbs = [{ id: 'a', x: 1, y: 2, z: 3, got: false }, { id: 'b', x: 4, y: 5, z: 6, got: true }];
let d = mapDots({ goal: [9, 9, 9], save: [1, 0, 1], saves: 0, crumbs, player: { x: 0, y: 0, z: 0 } });
ok(d.filter((q) => q.kind === 'crumb').length === 1 && !d.some((q) => q.kind === 'flag') && d.some((q) => q.kind === 'goal') && d.at(-1).kind === 'hero', 'prikker: uoppdagede smuler, ingen flagg før lagring, mål, figur sist');
d = mapDots({ goal: [9, 9, 9], save: [1, 0, 1], saves: 2, crumbs, player: { x: 0, y: 0, z: 0 }, crumbsOn: false });
ok(d.some((q) => q.kind === 'flag') && !d.some((q) => q.kind === 'crumb'), 'flagg etter lagring, ingen smuler når de er av');

// oversiktskameraet: hele rommet i bildet (stående og liggende) for alle ekte brett. Enkel prosjeksjon.
const proj = (cam, fov, asp, p) => {
  const f = [cam.look[0] - cam.pos[0], cam.look[1] - cam.pos[1], cam.look[2] - cam.pos[2]], fl = Math.hypot(...f); for (let i = 0; i < 3; i++) f[i] /= fl;
  const rx = [-f[2], 0, f[0]], rl = Math.hypot(rx[0], rx[2]); rx[0] /= rl; rx[2] /= rl;
  const up = [rx[1] * f[2] - rx[2] * f[1], rx[2] * f[0] - rx[0] * f[2], rx[0] * f[1] - rx[1] * f[0]];
  const v = [p[0] - cam.pos[0], p[1] - cam.pos[1], p[2] - cam.pos[2]], z = v[0] * f[0] + v[1] * f[1] + v[2] * f[2], th = Math.tan(fov * Math.PI / 360);
  return { x: (v[0] * rx[0] + v[2] * rx[2]) / z / (th * asp), y: Math.abs(v[0] * up[0] + v[1] * up[1] + v[2] * up[2]) / z / th * Math.sign(v[0] * up[0] + v[1] * up[1] + v[2] * up[2] || 1), z };
};
for (const f of fs.readdirSync('levels').filter((n) => n.endsWith('.level.json'))) {
  const L = JSON.parse(fs.readFileSync('levels/' + f)), R = L.room; if (!R || !Number.isFinite(R.x0)) continue;
  for (const asp of [390 / 844, 844 / 390]) {
    const cam = overviewCam(R, asp, 50);
    ok(cam.pos[1] < 900, `${f}: oversiktskameraet ikke absurd høyt (${cam.pos[1].toFixed(0)})`);
    for (const [x, z] of [[R.x0, R.z0], [R.x1, R.z0], [R.x0, R.z1], [R.x1, R.z1]]) {
      const p = proj(cam, 50, asp, [x, 0, z]); ok(p.z > 0 && Math.abs(p.x) <= 1 && Math.abs(p.y) <= 1, `${f}: hjørne (${x},${z}) i bildet (asp ${asp.toFixed(2)}): ${p.x.toFixed(2)},${p.y.toFixed(2)}`);
    }
    for (const g of [L.goal, L.start]) { const p = proj(cam, 50, asp, g); ok(Math.abs(p.x) < 0.95 && Math.abs(p.y) < 0.95, `${f}: mål/start i bildet`); }
  }
}

// tidslinje: opp, 3 s hold, ned; avbrudd gir myk retur uten hopp; ender på 0 = nøyaktig det vanlige kameraet
ok(ovBlend(0) === 0 && near(ovBlend(OV.rise), 1) && ovBlend(OV.rise + OV.hold / 2) === 1, 'blend: 0, 1 på toppen');
ok(OV.hold >= 3, 'oversikten holdes i minst 3 sekunder');
const T = OV.rise + OV.hold + OV.fall; ok(ovBlend(T) === 0 && ovBlend(T + 5) === 0 && ovDone(T) && !ovDone(T - 0.1), 'tilbake til 0 og ferdig');
let prev = 0, jump = 0; for (let t = 0; t < T + 0.1; t += 1 / 60) { const b = ovBlend(t); jump = Math.max(jump, Math.abs(b - prev)); prev = b; } ok(jump < 0.08, 'blend er jevn (ingen hopp)');
const skip = 1.2, bk = ovBlend(skip); ok(near(ovBlend(skip + 1e-9, skip), bk, 1e-3) && ovBlend(skip + OV.fall, skip) === 0 && ovDone(skip + OV.fall, skip) && !ovDone(skip + 0.1, skip), 'avbrudd: myk retur fra der den var');
prev = bk; jump = 0; for (let t = skip; t < skip + OV.fall + 0.1; t += 1 / 60) { const b = ovBlend(t, skip); jump = Math.max(jump, Math.abs(b - prev)); ok(b <= bk + 1e-9, 'avbrudd stiger ikke'); prev = b; } ok(jump < 0.08, 'avbrudd er jevn');
ok(ovBlend(0.4, 0.3) < ovBlend(0.3), 'avbrudd under oppflyvning går ned');
ok(ovDotsAlpha(0) === 0 && ovDotsAlpha(1) === 1 && ovDotsAlpha(0.75) === 0.5, 'prikkene tones inn mot toppen');
ok(canOverview({ play: true, won: false, menu: false, onGround: true, boss: false, active: false }) && !canOverview({ play: true, onGround: false }) && !canOverview({ play: true, onGround: true, boss: true }) && !canOverview({ play: true, onGround: true, active: true }) && !canOverview({ play: true, onGround: true, menu: true }), 'når oversikten kan starte');

if (bad) { console.log(bad, 'feil'); process.exit(1); } console.log('overview: ok');
