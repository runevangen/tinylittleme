// R19: to nye skapninger utover maur, edderkopp-vakt og bærer (ren logikk, ingen tegning, testes i node).
//   type 'roller'  : { id, type: 'roller', a, b }   pillbug. Går sakte langs streken (ufarlig). Ser den deg, rister den og ruller seg sammen (VARSEL `curl` s, oransje),
//                    så ruller den som en kule langs streken mot deg (FARLIG bare nå), og blir svimmel og ufarlig (`rest`) før den ruller opp igjen. Hopp på den (HOPP) for å knuse den når som helst.
//   type 'dangler' : { id, type: 'dangler', a }     edderkopp i tråd fra taket over a. Gir i takt: oppe (trygg), rister og varsler (`warn` s, rød), stuper (`plunge`), henger lavt (`hold`, FARLIG), og trekkes opp. Gå forbi mens den er oppe; hopp på den når den henger lavt for å knuse den.
// Fienden er bare farlig når `t.danger` er sann; ellers kan du gå rett gjennom/over den (ants.js bruker `t.danger !== false`).
export const ROLLER = {
  rad: 0.6, hgt: 0.7, walk: 1.0, alert: 6.5, alertDy: 1.4,
  curl: 0.8,                                       // varsel før den ruller (s): lengre enn 0,5 s
  roll: 7.5, rest: 1.8, respawn: 25,               // rullefart, hvile (svimmel) etter rullen, tid knust
};
export const DANGLER = {
  rad: 0.6, hgt: 0.8, alert: 8, up: 5.5,             // alert: den begynner å gi når du er nærmere enn dette; up: høyde over flata når den er oppe (over hodet)
  wait: 1.6, warn: 0.9, plunge: 0.25, hold: 1.0, rise: 0.8, low: 0.2,   // oppe-tid, varsel (s), stup, hengende lav (farlig), trekkes opp; low: høyde over flata når den henger
  respawn: 20,
};
export const TUNE = { warn: 1 };                    // admin: varseltid-faktor (aldri under 0,7: varselet skal alltid vare minst 0,5 s)
export const warnTime = (base) => base * Math.max(0.7, TUNE.warn);
export const isRoller = (t) => t.type === 'roller';
export const isDangler = (t) => t.type === 'dangler';
export const isCreature = (t) => isRoller(t) || isDangler(t);

export function initCreature(t) {
  t.mode = isRoller(t) ? 'walk' : 'up'; t.mt = 0; t.danger = false; t.crouchK = 0; t.rollDir = 1; t.alerted = false; t.speedNow = 0; t.shake = 0;
  if (isDangler(t)) { t.hx = t.a[0]; t.hz = t.a[2]; t.x = t.hx; t.z = t.hz; t.base = t.a[1]; t.y = t.base + DANGLER.up; }
}
const at = (type, t) => ({ type, kind: t.type, id: t.id, x: t.x, y: t.y, z: t.z });
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const place = (t) => { t.x = t.a[0] + (t.b[0] - t.a[0]) * t.s; t.z = t.a[2] + (t.b[2] - t.a[2]) * t.s; t.y = t.a[1] + (t.b[1] - t.a[1]) * t.s; };

export function stepRoller(t, p, dt, active) {
  const ev = [], ax = t.b[0] - t.a[0], az = t.b[2] - t.a[2], L2 = t.len * t.len;
  const dx = p.x - t.x, dz = p.z - t.z, d = Math.hypot(dx, dz), dy = p.y - t.y;
  const sees = active && d < ROLLER.alert && Math.abs(dy) < ROLLER.alertDy;
  t.mt += dt; t.speedNow = 0; t.danger = false;
  if (t.mode === 'walk') {
    t.crouchK = Math.max(0, t.crouchK - dt * 3);
    if (sees) { t.mode = 'curl'; t.mt = 0; ev.push(at('alert', t)); }
    else if (t.wait > 0) t.wait -= dt;
    else {
      t.s += t.dir * ROLLER.walk * dt / t.len;
      if (t.s >= 1) { t.s = 1; t.dir = -1; t.wait = 0.7; } else if (t.s <= 0) { t.s = 0; t.dir = 1; t.wait = 0.7; }
      t.speedNow = ROLLER.walk;
    }
  } else if (t.mode === 'curl') {                                                  // varsel: rister og rulles sammen
    const curl = warnTime(ROLLER.curl); t.crouchK = Math.min(1, t.mt / curl);
    if (!sees && t.mt < curl * 0.5) { t.mode = 'walk'; t.mt = 0; }          // du rygget unna: avblåst
    else if (t.mt >= curl) {
      const sp = clamp(((p.x - t.a[0]) * ax + (p.z - t.a[2]) * az) / L2, 0, 1);
      t.rollDir = sp >= t.s ? 1 : -1; t.dir = t.rollDir; t.mode = 'roll'; t.mt = 0; t.danger = true; ev.push(at('roll', t));
    }
  } else if (t.mode === 'roll') {
    t.crouchK = 1; t.danger = true; t.speedNow = ROLLER.roll;
    t.s += t.rollDir * ROLLER.roll * dt / t.len;
    if (t.s >= 1 || t.s <= 0) { t.s = clamp(t.s, 0, 1); t.mode = 'rest'; t.mt = 0; t.danger = false; ev.push(at('stop', t)); }
  } else if (t.mode === 'rest') {                                                  // svimmel og ufarlig
    t.crouchK = 1;
    if (t.mt >= ROLLER.rest) { t.mode = 'walk'; t.mt = 0; t.dir = -t.rollDir; t.wait = 0.4; }
  }
  if (t.len > 1e-6) { const d0 = t.mode === 'roll' ? t.rollDir : t.dir; t.fx = d0 * ax / t.len; t.fz = d0 * az / t.len; }
  place(t);
  t.alerted = t.mode === 'curl' || t.mode === 'roll';
  return ev;
}

export function stepDangler(t, p, dt, active) {
  const ev = [], D = DANGLER, hi = t.base + D.up, lo = t.base + D.low;
  const near = active && Math.hypot(p.x - t.hx, p.z - t.hz) < D.alert && Math.abs(p.y - t.base) < 4;
  t.mt += dt; t.danger = false; t.shake = 0; t.speedNow = 0;
  if (t.mode === 'up') {
    t.y = hi;
    if (!near) t.mt = Math.min(t.mt, D.wait * 0.5);                                 // gir ikke når du er langt unna
    else if (t.mt >= D.wait) { t.mode = 'warn'; t.mt = 0; t.shake = 1; ev.push(at('alert', t)); }
  } else if (t.mode === 'warn') {                                                  // varsel: tråden rister, den siger litt
    const w = warnTime(D.warn); t.shake = 1; t.y = hi - Math.min(1, t.mt / w) * 3.0;
    if (t.mt >= w) { t.mode = 'plunge'; t.mt = 0; t.y0 = t.y; ev.push(at('plunge', t)); }
  } else if (t.mode === 'plunge') {
    const u = Math.min(1, t.mt / D.plunge); t.y = t.y0 + (lo - t.y0) * u; t.danger = true;
    if (u >= 1) { t.mode = 'hold'; t.mt = 0; }
  } else if (t.mode === 'hold') {
    t.y = lo; t.danger = true;
    if (t.mt >= D.hold) { t.mode = 'rise'; t.mt = 0; }
  } else if (t.mode === 'rise') {
    const u = Math.min(1, t.mt / D.rise); t.y = lo + (hi - lo) * u;
    if (u >= 1) { t.mode = 'up'; t.mt = 0; }
  }
  t.alerted = t.mode === 'warn';
  return ev;
}
export function stepCreature(t, p, dt, active) { return isRoller(t) ? stepRoller(t, p, dt, active) : stepDangler(t, p, dt, active); }
