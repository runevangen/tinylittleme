// R22: mål-lesbarhet i start. Ren logikk (testes i node): første delmål, kamerasveip fra målet tilbake til figuren, og når hint/markør skal bort.
// Tegning og DOM står i intro_view.js; main.js har bare tynne hekter.
import { INTRO, INTRO_SWEEP } from './story.js';

const smooth = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

// Første delmål: flata (ikke grep/via) i ruta som ligger minst 0,5 høyere enn start, eller den som nivåets data peker ut (INTRO[n].first = id).
export function firstTarget(route, start, n, intro = INTRO) {
  if (!route?.length) return null;
  const id = intro[n]?.first, y0 = start?.[1] ?? 0;
  const w = id ? route.find((r) => r.id === id) : route.find((r) => !r.grip && !r.via && r.top > y0 + 0.5);
  if (!w) return null;
  return { id: w.id, label: w.label, en: w.en, x: (w.x0 + w.x1) / 2, y: w.top, z: (w.z0 + w.z1) / 2, box: { x0: w.x0, x1: w.x1, z0: w.z0, z1: w.z1, top: w.top } };
}
// Står figuren på (eller like ved) første delmål? Da er markøren og hintet ferdige.
export function reachedFirst(t, p) {
  if (!t) return true;
  const b = t.box; return p.x >= b.x0 - 0.3 && p.x <= b.x1 + 0.3 && p.z >= b.z0 - 0.3 && p.z <= b.z1 + 0.3 && Math.abs(p.y - b.top) < 1.2;
}
// Sveipet: først et blikk på målet (hold), så glir kameraet tilbake til figuren (travel). skip() avslutter med én gang; update() gir aldri uendelig tid.
export function createSweep(opt = {}) {
  const hold = opt.hold ?? INTRO_SWEEP.hold, travel = opt.travel ?? INTRO_SWEEP.travel, total = hold + travel;
  const s = { t: 0, done: false, skipped: false };
  return {
    s, total,
    skip() { if (!s.done) { s.done = true; s.skipped = true; } },
    // u: 0 under hold, 0..1 under reisen; e: glatt 0..1 (0 = ved målet, 1 = tilbake på vanlig kamera); active: sveipet styrer kameraet
    update(dt) {
      if (s.done) return { active: false, u: 1, e: 1, done: true };
      s.t += Math.max(0, Math.min(0.1, dt));
      if (s.t >= total) { s.done = true; return { active: false, u: 1, e: 1, done: true }; }
      const u = Math.max(0, (s.t - hold) / travel);
      return { active: true, u, e: smooth(u), done: false };
    },
  };
}
// Kameraet under sveipet: fra målet (glPos) mot vanlig kamera (nPos). Returnerer posisjon og blikkpunkt, begge klemt inni rommet.
export function sweepPose({ e, goal, hero, yaw, pitch, dist, nPos, nLook, room }) {
  const focus = [lerp(goal[0], hero[0], e), lerp(goal[1], hero[1], e), lerp(goal[2], hero[2], e)];
  const d = lerp(dist, 0, e), cp = Math.cos(pitch);
  let pos = [focus[0] + Math.sin(yaw) * cp * d, focus[1] + Math.sin(pitch) * d, focus[2] + Math.cos(yaw) * cp * d];
  if (room && Number.isFinite(room.x0)) pos = [Math.max(room.x0 + 0.4, Math.min(room.x1 - 0.4, pos[0])), Math.min((room.height || 1e9) - 0.4, Math.max(0.3, pos[1])), Math.max(room.z0 + 0.4, Math.min(room.z1 - 0.4, pos[2]))];
  // mot slutten går kameraet over i det vanlige (nPos/nLook), så overgangen til spillet er sømløs
  const w = e * e;
  return { pos: pos.map((v, i) => lerp(v, nPos[i], w)), look: focus.map((v, i) => lerp(v, nLook[i], w)) };
}
