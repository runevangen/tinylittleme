// R61: veps som flyr (ren logikk, ingen tegning, testes i node: test_wasp.mjs). Brukt av ants.js (type 'wasp').
//   { id, type: 'wasp', a, b, alt?, speed?, alert? }  a og b er endepunktene på banen (y = flaten under), alt = flyhøyde over flata (enheter, standard 3,4).
// Faser: 'patrol' (flyr langs banen, ufarlig) -> 'warn' (ser deg: senker seg, summer og lyser, WARN s, ufarlig; sikter ved slutten) ->
//        'dive' (stuper rett mot der du sto da den siktet, FARLIG) -> 'rest' (landet på tomt gulv: svimmel og ufarlig) eller 'stun' (stupte inn i noe: lenge svimmel, ufarlig) -> 'rise' -> 'return' -> 'patrol'.
// Slik slipper du den: skjul deg under en ting (den ser deg ikke, og stuper den likevel treffer den undersiden), stikk til siden mens den sikter (den stuper dit du sto),
// eller hopp på den (HOPP) når den stuper eller ligger svimmel. Varselet varer alltid minst 0,5 s, uansett vanskelighet.
export const WASP = {
  rad: 0.55, hgt: 0.7,                  // kollisjonsradius og høyde (som en maur, men i lufta)
  alt: 3.4, warnAlt: 2.0,               // flyhøyde i patrulje og når den varsler (siger ned så varselet synes)
  speed: 2.6, alert: 8, alertDy: 5,     // patruljefart, hvor langt unna den ser deg (vannrett) og høydeforskjell
  warn: 0.9, dive: 10, rest: 1.3, stun: 3.2, rise: 0.6, home: 4,   // varsel (s), stupfart, svimmel etter landing (s), svimmel etter krasj (s), stiger (s), fart hjem til banen
  hide: 16, hideEdge: 1, respawn: 25, bob: 0.18,   // hvor høyt over hodet et tak kan være og likevel skjule deg, og hvor langt inn under kanten du må stå; tid knust (s); svev (enheter)
};
// Vanskelighet: faktor på varseltid og stupfart, og rekkevidde. Aldri under 0,5 s varsel.
export const LEVELS = { easy: { warn: 1.5, dive: 0.8, alert: 0.8 }, normal: { warn: 1, dive: 1, alert: 1 }, hard: { warn: 0.75, dive: 1.2, alert: 1.2 } };
export const TUNE = { on: true, level: 'normal' };
export const MIN_WARN = 0.5;
const lv = () => LEVELS[TUNE.level] || LEVELS.normal;
export const warnTime = () => Math.max(MIN_WARN, WASP.warn * lv().warn);
export const isWasp = (t) => t.type === 'wasp';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const solidBoxes = (L) => (L?.boxes || []).filter((b) => b.type !== 'floor' && b.type !== 'wall' && !b.carried && b.alive !== false);
const at = (type, t) => ({ type, kind: 'wasp', id: t.id, x: t.x, y: t.y, z: t.z });

// Høyden til oversiden under (x, z), sett fra høyden y (0 = gulvet).
export function surfaceBelow(L, x, z, y) {
  let top = 0;
  for (const b of solidBoxes(L)) if (x > b.min[0] && x < b.max[0] && z > b.min[2] && z < b.max[2] && b.max[1] <= y + 0.05) top = Math.max(top, b.max[1]);
  return top;
}
// Er punktet inni noe fast (vepsen er en liten kule)?
export function blockedAt(L, x, y, z, r = 0.35) {
  for (const b of solidBoxes(L)) if (x + r > b.min[0] && x - r < b.max[0] && z + r > b.min[2] && z - r < b.max[2] && y + r > b.min[1] && y - r < b.max[1]) return b;
  return null;
}
// Er spilleren skjult for oppe-fra: noe fast rett over hodet (bunnen over hodet, ikke høyere enn WASP.hide)?
export function isHidden(L, p) {
  for (const b of solidBoxes(L)) {
    if (p.x > b.min[0] + WASP.hideEdge && p.x < b.max[0] - WASP.hideEdge && p.z > b.min[2] + WASP.hideEdge && p.z < b.max[2] - WASP.hideEdge && b.min[1] >= p.y + 0.9 && b.min[1] < p.y + WASP.hide) return true;
  }
  return false;
}

export function initWasp(t) {
  t.alt = Number.isFinite(t.alt) ? t.alt : WASP.alt; t.mode = 'patrol'; t.mt = 0; t.danger = false; t.alerted = false; t.shake = 0; t.crouchK = 0; t.speedNow = 0; t.hover = 0;
  t.s = 0.5; t.dir = 1; t.wait = 0; t.groundY = t.a[1];
  placeWasp(t);
}
function patrolPos(t, s) { return [t.a[0] + (t.b[0] - t.a[0]) * s, t.a[1] + (t.b[1] - t.a[1]) * s + t.alt, t.a[2] + (t.b[2] - t.a[2]) * s]; }
function placeWasp(t) { const [x, y, z] = patrolPos(t, t.s); t.x = x; t.y = y; t.z = z; }

// Ett tidssteg. p = spilleren, active = spilleren kan angripes, L = brettet (for skjul og krasj). Returnerer hendelser [{ type: 'alert' | 'dive' | 'land' | 'crash' | 'calm', kind: 'wasp', id, x, y, z }].
export function stepWasp(t, p, dt, active, L) {
  const ev = [], ax = t.b[0] - t.a[0], az = t.b[2] - t.a[2], len = t.len || Math.hypot(ax, az) || 1;
  const base = t.a[1], dx = p.x - t.x, dz = p.z - t.z, d = Math.hypot(dx, dz);
  const reach = WASP.alert * lv().alert * (Number.isFinite(t.alertMul) ? t.alertMul : 1);
  const sees = active && d < reach && Math.abs(p.y - base) < WASP.alertDy && !isHidden(L, p);
  t.mt += dt; t.speedNow = 0; t.danger = false; t.shake = 0; t.hover = Math.sin((t.phase || 0) * 0.5) * WASP.bob;
  const face = (x, z) => { const l = Math.hypot(x, z); if (l > 0.05) { t.fx = x / l; t.fz = z / l; } };
  if (t.mode === 'patrol') {
    if (sees) { t.mode = 'warn'; t.mt = 0; face(dx, dz); ev.push(at('alert', t)); }
    else if (t.wait > 0) t.wait -= dt;
    else {
      t.s += t.dir * (t.speed || WASP.speed) * dt / len;
      if (t.s >= 1) { t.s = 1; t.dir = -1; t.wait = 0.5; } else if (t.s <= 0) { t.s = 0; t.dir = 1; t.wait = 0.5; }
      t.speedNow = t.speed || WASP.speed; face(t.dir * ax, t.dir * az);
    }
    if (t.mode === 'patrol') placeWasp(t);
  } else if (t.mode === 'warn') {                                                  // varsel: siger ned, rister, summer. Ufarlig.
    const w = warnTime(), k = clamp(t.mt / w, 0, 1); t.shake = 1; t.crouchK = k; face(dx, dz);
    t.y += ((base + WASP.warnAlt) - t.y) * Math.min(1, dt * 6);
    if (!sees && t.mt < w * 0.5) { t.mode = 'return'; t.mt = 0; t.crouchK = 0; ev.push(at('calm', t)); }          // du rygget unna eller gjemte deg: avblåst
    else if (t.mt >= w) {                                                          // sikter der du står NÅ (stikk til siden for å bomme)
      const ty = surfaceBelow(L, p.x, p.z, p.y + 0.3);
      t.sx = t.x; t.sy = t.y; t.sz = t.z; t.tx = p.x; t.ty = Math.max(ty, p.y); t.tz = p.z;
      t.dist = Math.hypot(t.tx - t.sx, t.ty - t.sy, t.tz - t.sz) || 1; t.mode = 'dive'; t.mt = 0; t.crouchK = 0; ev.push(at('dive', t));
    }
  } else if (t.mode === 'dive') {
    t.danger = true; const v = WASP.dive * lv().dive, u = clamp(t.mt * v / t.dist, 0, 1);
    const nx = t.sx + (t.tx - t.sx) * u, ny = t.sy + (t.ty - t.sy) * u, nz = t.sz + (t.tz - t.sz) * u;
    const hit = blockedAt(L, nx, ny + WASP.hgt * 0.5, nz, 0.3);
    face(t.tx - t.sx, t.tz - t.sz); t.speedNow = v;
    if (hit && u < 1) {                                                            // stupte inn i noe: svimmel ved foten av det
      t.mode = 'stun'; t.mt = 0; t.danger = false; t.y = Math.max(surfaceBelow(L, t.x, t.z, t.y), base); ev.push(at('crash', t));
    } else {
      t.x = nx; t.y = ny; t.z = nz;
      if (u >= 1) { t.mode = 'rest'; t.mt = 0; t.danger = false; ev.push(at('land', t)); }
    }
  } else if (t.mode === 'rest' || t.mode === 'stun') {                             // svimmel og ufarlig. Fall ned til flata under om den henger i lufta.
    const gy = surfaceBelow(L, t.x, t.z, t.y + 0.1); t.y = Math.max(gy, t.y - 14 * dt); t.crouchK = 1;
    if (t.mt >= (t.mode === 'stun' ? WASP.stun : WASP.rest)) { t.mode = 'rise'; t.mt = 0; t.y0 = t.y; }
  } else if (t.mode === 'rise') {                                                  // opp til flyhøyde igjen
    const u = clamp(t.mt / WASP.rise, 0, 1); t.crouchK = 1 - u; t.y = t.y0 + ((Math.max(t.y0, base + t.alt)) - t.y0) * u;
    if (u >= 1) { t.mode = 'return'; t.mt = 0; t.crouchK = 0; }
  } else if (t.mode === 'return') {                                                // glir tilbake til nærmeste punkt på banen (ser den deg igjen, varsler den på nytt)
    if (sees) { t.mode = 'warn'; t.mt = 0; face(dx, dz); ev.push(at('alert', t)); }
    else {
    const sp = clamp(((t.x - t.a[0]) * ax + (t.z - t.a[2]) * az) / (len * len), 0, 1), [gx, gy, gz] = patrolPos(t, sp);
    const rx = gx - t.x, ry = gy - t.y, rz = gz - t.z, rl = Math.hypot(rx, ry, rz);
    if (rl < 0.15) { t.s = sp; t.mode = 'patrol'; t.mt = 0; t.wait = 0; placeWasp(t); }
    else { const m = Math.min(rl, WASP.home * dt); t.x += rx / rl * m; t.y += ry / rl * m; t.z += rz / rl * m; face(rx, rz); t.speedNow = WASP.home; }
    }
  }
  t.alerted = t.mode === 'warn' || t.mode === 'dive';
  return ev;
}
