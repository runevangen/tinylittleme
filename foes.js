// Flere slag fiender (R6): ren logikk for edderkopp-vakt og bærer-maur, brukt av ants.js (ingen tegning, testes i node).
//   type 'spider'  : { id, type: 'spider', a: hjem, b: hjem }  står på stedet; når du er nær duker den (varsel), hopper mot deg (aldri lenger enn `leash` fra hjemmet), hviler og går hjem. Kan knuses fra oven, også midt i hoppet.
//   type 'carrier' : { id, type: 'carrier', a, b, speed? }       patruljerer som en maur, men tregere og bærer en smule. Knuses den, slipper den smula (t.drop) og du plukker den ved å gå inn i den.
// Modellene ligger i props.js (buildSpider, buildCarrier).
export const SPIDER = {
  rad: 0.7, hgt: 0.7,                                    // kollisjonsradius og høyde
  alert: 5.5, alertDy: 1.4,                              // hvor langt unna den ser deg (og høydeforskjell)
  crouch: 0.55,                                          // dukker og varsler før hoppet (s): tid til å rygge eller hoppe på den
  leash: 4.0, leapTime: 0.55, leapH: 1.6,                // lengste hopp fra hjemmet, flytid og høyde
  rest: 1.2, walk: 2.2,                                  // hvile etter hoppet, fart hjem
  respawn: 25,
};
export const CARRIER = { speed: 1.1, chase: 1.8, rad: 0.62, hgt: 0.8, pickup: 1.0, arm: 0.8 };   // bærer-maur: sakte; smula gir bonuspoeng

export const isSpider = (t) => t.type === 'spider';

// Hjem for edderkoppen = a. Oppretter tilstand på en maur-oppføring.
export function initSpider(t) {
  t.mode = 'idle'; t.mt = 0; t.hx = t.a[0]; t.hz = t.a[2]; t.x = t.hx; t.z = t.hz; t.y = t.a[1]; t.sx = t.x; t.sz = t.z; t.tx = t.x; t.tz = t.z; t.crouchK = 0;
}

// Ett tidssteg for edderkoppen (bare bevegelse). Returnerer hendelser [{ type: 'alert' | 'leap' | 'land', id, x, y, z }].
export function stepSpider(t, p, dt, active) {
  const ev = [], base = t.a[1], at = (type) => ({ type, kind: 'spider', id: t.id, x: t.x, y: t.y, z: t.z });
  const dx = p.x - t.x, dz = p.z - t.z, d = Math.hypot(dx, dz), dy = p.y - base;
  const sees = active && d < SPIDER.alert && Math.abs(dy) < SPIDER.alertDy;
  const face = () => { if (d > 0.05) { t.fx = dx / d; t.fz = dz / d; } };
  t.mt += dt; t.speedNow = 0;
  if (t.mode === 'idle') {
    t.crouchK = Math.max(0, t.crouchK - dt * 4);
    if (sees) { t.mode = 'crouch'; t.mt = 0; face(); ev.push(at('alert')); }
  } else if (t.mode === 'crouch') {
    t.crouchK = Math.min(1, t.mt / SPIDER.crouch); face();
    if (!sees && t.mt < SPIDER.crouch * 0.5) { t.mode = 'idle'; t.mt = 0; }        // du rygget unna: avblåst
    else if (t.mt >= SPIDER.crouch) {                                              // hopp mot der du står nå, men aldri utenfor flata rundt hjemmet
      const hx = p.x - t.hx, hz = p.z - t.hz, hl = Math.hypot(hx, hz) || 1, r = Math.min(hl, SPIDER.leash);
      t.sx = t.x; t.sz = t.z; t.tx = t.hx + hx / hl * r; t.tz = t.hz + hz / hl * r; t.mode = 'leap'; t.mt = 0; ev.push(at('leap'));
    }
  } else if (t.mode === 'leap') {
    const u = Math.min(1, t.mt / SPIDER.leapTime);
    t.x = t.sx + (t.tx - t.sx) * u; t.z = t.sz + (t.tz - t.sz) * u; t.y = base + 4 * SPIDER.leapH * u * (1 - u); t.crouchK = 0;
    const lx = t.tx - t.sx, lz = t.tz - t.sz, l = Math.hypot(lx, lz);
    if (l > 0.05) { t.fx = lx / l; t.fz = lz / l; }
    if (u >= 1) { t.y = base; t.mode = 'rest'; t.mt = 0; ev.push(at('land')); }
  } else if (t.mode === 'rest') {
    if (t.mt >= SPIDER.rest) { t.mode = 'return'; t.mt = 0; }
  } else if (t.mode === 'return') {
    const hx = t.hx - t.x, hz = t.hz - t.z, hl = Math.hypot(hx, hz);
    if (hl < 0.1) { t.x = t.hx; t.z = t.hz; t.mode = 'idle'; t.mt = 0; }
    else { const s = Math.min(hl, SPIDER.walk * dt); t.x += hx / hl * s; t.z += hz / hl * s; t.fx = hx / hl; t.fz = hz / hl; t.speedNow = SPIDER.walk; }
  }
  t.alerted = t.mode === 'crouch' || t.mode === 'leap';
  return ev;
}
