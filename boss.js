// Sjef-maur (R9): stor sjef i siste rom (nivå 6). Ren logikk (ingen tegning, testes i node); modellen ligger i boss_model.js, helsebaren i boss_ui.js.
// Brettet har valgfritt `boss`: { id, a: [x, y, z], b: [x, y, z], hp? }   a og b er endepunktene på patruljen, y er flaten.
// Faser (tilstander):  'patrol' (går fram og tilbake, ser deg) → 'windup' (reiser seg og varsler: retningen låses litt før støtet) → 'charge' (løper rett fram)
//   → treffer den vegg/kasse: 'stunned' (svimmel, lav: HOPP på ryggen = skade) → 'hit' (rister, ufarlig litt) → patrol igjen, raskere. Bommer den to ganger, blir den sliten og slumper uansett.
// Fair på mobil: lang og tydelig varsling, retningen låses (bare stikke sidelengs), du kan alltid rygge unna, og når den er svimmel er den ufarlig å røre.
// Sjefen hindrer aldri ruta (ingen kollisjonsboks), så fysikk-boten og rutekartet ignorerer den, akkurat som maurene.
import { freeAt } from './physics.js';

export const BOSS = {
  hp: 3, rad: 2.2, hgt: 2.4, stunHgt: 1.2,
  alert: 15, alertDy: 2.2,                          // hvor langt unna den ser deg (og høydeforskjell)
  patrol: [2.2, 2.9, 3.6],                          // gangfart per fase (1–3)
  windup: [1.1, 0.9, 0.75],                         // varseltid før støtet (s)
  lock: 0.65,                                       // andel av varseltida den følger deg; så låses retningen
  charge: [9, 10.5, 12], ramp: 0.35, maxCharge: 17, // støtfart, opptrapping (s), lengste støt før den gir opp
  stun: [4.8, 4.2, 3.7], tired: 1.1, cool: 1.4,     // svimmel-tid, pust etter bom, ro mellom angrep
  hitTime: 1.5, bounce: 12.5, clang: 8,             // «au»-tid etter skade; sprett når du knuser den / lander på den uten at den er svimmel
  knock: 11, knockUp: 7, lockPlayer: 0.35,          // støt mot deg: fart bort, opp og tid uten styring
  dying: 2.2, prizeArm: 1.2, prizeR: 1.5,           // dødsanimasjon (s), tid før premien kan tas, plukke-radius
  prizeLift: 0.5,
};
const HW = 0.3, H = 1.0;                            // spillerboksen
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export const bossPhase = (b) => (b && b.hp > 0 ? clamp(b.maxHp - b.hp + 1, 1, 3) : 3);

export function initBoss(L) {
  const s = L.boss;
  if (!s) { L.bossS = null; return; }
  const b = { id: s.id || 'sjef', a: [...s.a], b: [...s.b], maxHp: s.hp || BOSS.hp };
  L.bossS = b; resetBoss(L);
}
export function resetBoss(L) {
  const b = L.bossS; if (!b) return;
  Object.assign(b, { hp: b.maxHp, mode: 'patrol', mt: 0, x: b.a[0], y: b.a[1], z: b.a[2], fx: 1, fz: 0, leg: 1, wait: 0, cool: 2, travel: 0, misses: 0, dirx: 1, dirz: 0, wind: 0, hitK: 0, stunK: 0, speedNow: 0, squash: 0, alive: true, gone: false, prize: null, alerted: false, phase: 0, anim: 0 });
  L.antInvuln = 0;
}

// blokkert bevegelse? Sjekker tre punkter foran sjefen mot alle bokser som ikke bare er et lavt teppe
const probe = (L, b, dx, dz) => {
  const r = BOSS.rad, px = -dz, pz = dx, y = b.y + 0.6;
  for (const [f, s] of [[1, 0], [0.85, 0.7], [0.85, -0.7]]) if (!freeAt(L, b.x + dx * r * f + px * r * s, y, b.z + dz * r * f + pz * r * s)) return false;
  return true;
};
const inRoom = (L, x, z) => { const R = L.room; return !R || (x > R.x0 + BOSS.rad && x < R.x1 - BOSS.rad && z > R.z0 + BOSS.rad && z < R.z1 - BOSS.rad); };
const face = (b, dx, dz) => { const l = Math.hypot(dx, dz); if (l > 0.05) { b.fx = dx / l; b.fz = dz / l; } };

// Ett tidssteg. Returnerer hendelser:
//  { type: 'alert' | 'charge' | 'bump' | 'tired' | 'hit' | 'phase' | 'defeat' | 'prize' | 'clang' | 'hurt', ... }
export function stepBoss(L, p, dt, active = true) {
  const b = L.bossS, ev = [];
  if (!b || b.gone) return ev;
  const at = (type, extra = {}) => ev.push({ type, id: b.id, x: b.x, y: b.y, z: b.z, hp: b.hp, ...extra });
  b.mt += dt; b.anim += dt; b.speedNow = 0; b.cool = Math.max(0, b.cool - dt);
  L.antInvuln = Math.max(0, (L.antInvuln || 0) - dt);
  const ph = bossPhase(b), dx = p.x - b.x, dz = p.z - b.z, d = Math.hypot(dx, dz), dy = p.y - b.y;
  const sees = active && d < BOSS.alert && Math.abs(dy) < BOSS.alertDy;
  b.alerted = b.mode === 'windup' || b.mode === 'charge';

  if (b.mode === 'dead') {
    b.squash = Math.min(1, b.mt / BOSS.dying);
    if (b.prize && !b.prize.taken) {
      if (b.prize.arm > 0) b.prize.arm -= dt;
      else if (active && Math.hypot(p.x - b.prize.x, p.z - b.prize.z) < BOSS.prizeR && Math.abs(p.y - b.prize.y) < 2) { b.prize.taken = true; at('prize', { x: b.prize.x, y: b.prize.y, z: b.prize.z }); }
    }
    if (b.mt >= BOSS.dying) b.gone = true;
    return ev;
  }

  if (b.mode === 'patrol') {
    b.stunK = Math.max(0, b.stunK - dt * 3);
    const to = b.leg ? b.b : b.a, flip = () => { b.leg = 1 - b.leg; b.wait = 0.6; };
    let tx = to[0], tz = to[2], v = BOSS.patrol[ph - 1];
    if (b.wait > 0) { b.wait -= dt; v = 0; }
    else if (sees) { tx = p.x; tz = p.z; v *= 1.25; if (d < BOSS.rad + 1) v = 0; }             // ser deg: går mot deg og venter på å angripe
    const ex = tx - b.x, ez = tz - b.z, el = Math.hypot(ex, ez);
    if (!sees && el < 0.4 && b.wait <= 0) { flip(); v = 0; }
    if (v > 0 && el > 0.05) {
      const ux = ex / el, uz = ez / el; face(b, ux, uz);
      if (probe(L, b, ux, uz) && inRoom(L, b.x + ux * v * dt, b.z + uz * v * dt)) { b.x += ux * v * dt; b.z += uz * v * dt; b.speedNow = v; }
      else if (!sees) flip();
    }
    if (sees && b.cool <= 0 && d < BOSS.alert - 1) { b.mode = 'windup'; b.mt = 0; b.wind = 0; face(b, dx, dz); at('alert'); }
  } else if (b.mode === 'windup') {
    const T = BOSS.windup[ph - 1], u = clamp(b.mt / T, 0, 1); b.wind = u;
    if (u < BOSS.lock) face(b, dx, dz);                                                          // følger deg først, så låses retningen
    if (b.mt >= T) { b.dirx = b.fx; b.dirz = b.fz; b.mode = 'charge'; b.mt = 0; b.travel = 0; at('charge'); }
  } else if (b.mode === 'charge') {
    b.wind = 0;
    const v = BOSS.charge[ph - 1] * clamp(0.35 + b.mt / BOSS.ramp, 0, 1), s = v * dt;
    b.fx = b.dirx; b.fz = b.dirz;
    if (!probe(L, b, b.dirx, b.dirz) || !inRoom(L, b.x + b.dirx * s, b.z + b.dirz * s)) {        // treffer vegg/kasse: svimmel
      b.mode = 'stunned'; b.mt = 0; b.misses = 0; at('bump', { x: b.x + b.dirx * BOSS.rad, z: b.z + b.dirz * BOSS.rad, fast: v > 6 });
    } else {
      b.x += b.dirx * s; b.z += b.dirz * s; b.travel += s; b.speedNow = v;
      if (b.travel >= BOSS.maxCharge) {                                                          // bommet: pust, og slumper etter to bom
        b.misses++;
        if (b.misses >= 2) { b.mode = 'stunned'; b.mt = 0; b.misses = 0; at('tired', { worn: true }); }
        else { b.mode = 'tired'; b.mt = 0; at('tired'); }
      }
    }
  } else if (b.mode === 'tired') {
    if (b.mt >= BOSS.tired) { b.mode = 'patrol'; b.mt = 0; b.cool = BOSS.cool; }
  } else if (b.mode === 'stunned') {
    b.stunK = Math.min(1, b.mt / 0.25);
    if (b.mt >= BOSS.stun[ph - 1]) { b.mode = 'patrol'; b.mt = 0; b.cool = BOSS.cool; }
  } else if (b.mode === 'hit') {
    if (b.mt >= BOSS.hitTime) { b.mode = 'patrol'; b.mt = 0; b.cool = BOSS.cool + 0.4; }
  }

  // møte spilleren (ikke når hun henger/klatrer)
  if (!active || ['hang', 'climb', 'mantle', 'zip', 'swing'].includes(p.state) || b.mode === 'hit') return ev;
  const hgt = b.mode === 'stunned' ? BOSS.stunHgt : BOSS.hgt, rr = BOSS.rad * (b.mode === 'stunned' ? 0.95 : 0.85) + HW * 0.8;
  if (d < rr && p.y < b.y + hgt && p.y + H > b.y) {
    const falling = p.vy < -1 && p.y > b.y + hgt * 0.45;
    if (b.mode === 'stunned' && falling) {                                                       // hoppet på ryggen mens den er svimmel: skade
      b.hp--; p.vy = BOSS.bounce; p.onGround = false; p.state = 'air'; p.jumping = true; p.jumps = Math.max(p.jumps || 0, 1);
      if (b.hp <= 0) {
        b.mode = 'dead'; b.mt = 0; b.alive = false; b.prize = { x: b.x, y: b.y + BOSS.prizeLift, z: b.z, taken: false, arm: BOSS.prizeArm };
        at('hit', { x: b.x, y: b.y + hgt, z: b.z }); at('defeat');
      } else { b.mode = 'hit'; b.mt = 0; b.hitK = 1; at('hit', { x: b.x, y: b.y + hgt, z: b.z }); at('phase', { phase: bossPhase(b) }); }
    } else if (b.mode === 'stunned') {
      // svimmel og ufarlig: du kan gå forbi
    } else if (falling) {                                                                         // pansret rygg: du spretter av
      p.vy = BOSS.clang; p.onGround = false; p.state = 'air'; p.jumping = true; at('clang', { x: p.x, y: p.y, z: p.z });
    } else if (L.antInvuln <= 0) {                                                                // ellers: støt tilbake
      const l = d > 0.05 ? d : 1, ux = d > 0.05 ? dx / l : -(p.fx || 1), uz = d > 0.05 ? dz / l : -(p.fz || 0);
      p.vx = ux * BOSS.knock; p.vz = uz * BOSS.knock; p.vy = BOSS.knockUp; p.onGround = false; p.state = 'air'; p.jumping = false; p.lock = Math.max(p.lock || 0, BOSS.lockPlayer);
      L.antInvuln = 1.4; at('hurt', { x: p.x, y: p.y + 0.5, z: p.z });
    }
  }
  return ev;
}
