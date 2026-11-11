// Maur (v0.77): levende fiender som patruljerer en strek på en flate. Hopp på ryggen = knus (du spretter opp); rør dem ellers = støt tilbake og litt poengtap.
// Ren logikk (ingen tegning, kan testes i node); selve maur-modellen ligger i props.js (buildAnt). Maurene hører til brettet (`ants` i level.json):
//   { id, a: [x, y, z], b: [x, y, z], speed? }   a og b er endepunktene på patruljen, y er flaten de går på.
// Typer (R6, se foes.js): type 'ant' (standard), 'spider' (edderkopp-vakt: står vakt og hopper) og 'carrier' (bærer-maur: sakte, slipper en smule når den knuses).
// De hindrer aldri ruta (de kan knuses), så fysikk-boten og rutekartet ignorerer dem.
import { SPIDER, CARRIER, isSpider, initSpider, stepSpider } from './foes.js';
import { ROLLER, DANGLER, isCreature, isDangler, initCreature, stepCreature } from './creatures.js';   // R19: pillbug (roller) og tråd-edderkopp (dangler)
export const ANT = {
  len: 1.7, rad: 0.62, hgt: 0.8,                        // kroppslengde, kollisjonsradius (horisontalt) og høyde, i enheter (1 enhet = 5 cm)
  speed: 2.0, chase: 3.6, alert: 7, alertDy: 1.4,       // vanlig fart, fart når den har sett deg, hvor langt unna den ser deg (og høydeforskjell)
  pause: 0.7,                                           // hvile i endepunktene (s)
  knock: 7.5, knockUp: 6.5, invuln: 1.3, lock: 0.3,     // støt tilbake: fart bort, fart opp, ufarlig tid etterpå, tid uten styring
  bounce: 10.5,                                         // sprett når du knuser en maur
  respawn: 25,                                          // hvor lenge en knust maur er borte (s)
};
const HW = 0.3, H = 1.0;                                // spillerboksen (som P.w / 2 og P.h i physics.js)

export function initAnts(L) {
  L.antList = (L.ants || []).map((s) => {
    const len = Math.hypot(s.b[0] - s.a[0], s.b[2] - s.a[2]) || 1;
    const type = ['spider', 'carrier', 'roller', 'dangler'].includes(s.type) ? s.type : 'ant';
    const spec = type === 'spider' ? SPIDER : type === 'carrier' ? CARRIER : type === 'roller' ? ROLLER : type === 'dangler' ? DANGLER : ANT;
    return { id: s.id, type, rad: spec.rad, hgt: spec.hgt, carry: type === 'carrier', drop: null, a: [...s.a], b: [...s.b], len, speed: s.speed || (type === 'carrier' ? CARRIER.speed : ANT.speed), s: 0.5, dir: 1, wait: 0, x: 0, y: s.a[1], z: 0, fx: 1, fz: 0, alive: true, dead: 0, squash: 0, alerted: false, phase: Math.random() * 6 };
  });
  for (const t of L.antList) { placeAnt(t); if (isSpider(t)) initSpider(t); if (isCreature(t)) initCreature(t); }
  L.antInvuln = 0;
}
function placeAnt(t) {
  t.x = t.a[0] + (t.b[0] - t.a[0]) * t.s; t.z = t.a[2] + (t.b[2] - t.a[2]) * t.s; t.y = t.a[1] + (t.b[1] - t.a[1]) * t.s;
}
export function resetAnts(L) {
  for (const t of L.antList || []) { t.alive = true; t.dead = 0; t.squash = 0; t.s = 0.5; t.dir = 1; t.wait = 0; t.alerted = false; t.carry = t.type === 'carrier'; t.crumbUsed = false; t.drop = null; placeAnt(t); if (isSpider(t)) initSpider(t); if (isCreature(t)) initCreature(t); }
  L.antInvuln = 0;
}

// Ett tidssteg: maurene går, og møter spilleren. Returnerer hendelser [{ type: 'stomp' | 'hurt' | 'alert', id, x, y, z }].
export function stepAnts(L, p, dt, active = true) {
  const ev = [];
  L.antInvuln = Math.max(0, (L.antInvuln || 0) - dt);
  for (const t of L.antList || []) {
    if (L.noCreatures && isCreature(t)) continue;                  // R19: skapningene er slått av i ⚙
    t.phase += dt * 9;
    if (t.drop && t.drop.arm > 0) t.drop.arm -= dt;
    if (t.drop && !t.drop.taken && active && !(t.drop.arm > 0) && Math.hypot(p.x - t.drop.x, p.z - t.drop.z) < CARRIER.pickup && Math.abs(p.y - t.drop.y) < 1.6) { t.drop.taken = true; ev.push({ type: 'crumb', id: t.id, x: t.drop.x, y: t.drop.y, z: t.drop.z }); }
    if (!t.alive) { t.squash = Math.min(1, t.squash + dt * 6); t.dead -= dt; if (t.dead <= 0 && !(isDangler(t) ? nearBase(t, p, 2.5) : near(t, p, 2.5))) { t.alive = true; t.squash = 0; t.alerted = false; t.carry = t.type === 'carrier' && !t.crumbUsed; if (isSpider(t)) initSpider(t); if (isCreature(t)) initCreature(t); } continue; }
    const dx = p.x - t.x, dz = p.z - t.z, d = Math.hypot(dx, dz), dy = p.y - t.y;
    const sees = active && d < ANT.alert && Math.abs(dy) < ANT.alertDy;
    if (!isSpider(t) && !isCreature(t) && sees && !t.alerted) ev.push({ type: 'alert', kind: t.type, id: t.id, x: t.x, y: t.y, z: t.z });
    if (!isSpider(t) && !isCreature(t)) t.alerted = sees;
    // mål langs streken: mot spilleren når den har sett deg, ellers mellom endepunktene
    const ax = t.b[0] - t.a[0], az = t.b[2] - t.a[2];
    let v = t.speed;
    if (isSpider(t)) { for (const e of stepSpider(t, p, dt, active)) ev.push(e); v = -1; }
    else if (isCreature(t)) { for (const e of stepCreature(t, p, dt, active)) ev.push(e); v = -1; }
    else if (sees) {
      const sp = clamp(((p.x - t.a[0]) * ax + (p.z - t.a[2]) * az) / (t.len * t.len), 0, 1);
      t.dir = sp >= t.s ? 1 : -1; v = Math.abs(sp - t.s) * t.len < 0.3 ? 0 : t.type === 'carrier' ? CARRIER.chase : ANT.chase; t.wait = 0;
    } else if (t.wait > 0) { t.wait -= dt; v = 0; }
    if (v > 0) {
      t.s += t.dir * v * dt / t.len;
      if (t.s >= 1) { t.s = 1; t.dir = -1; t.wait = ANT.pause; } else if (t.s <= 0) { t.s = 0; t.dir = 1; t.wait = ANT.pause; }
      t.fx = t.dir * ax / t.len; t.fz = t.dir * az / t.len;
    }
    if (!isSpider(t) && !isCreature(t)) { placeAnt(t); t.speedNow = v; }
    if (!active || p.state === 'hang' || p.state === 'climb' || p.state === 'mantle' || p.state === 'zip' || p.state === 'swing') continue;   // hengende og klatrende er utenfor rekkevidde
    // møte spilleren
    const rr = t.rad + HW * 0.8;
    if (d < rr && p.y < t.y + t.hgt && p.y + H > t.y) {
      if (p.vy < -1.5 && p.y > t.y + t.hgt * 0.12) {            // landet på ryggen: knus, og sprett
        t.alive = false; t.dead = isSpider(t) ? SPIDER.respawn : isCreature(t) ? spec(t).respawn : ANT.respawn; t.squash = 0; p.vy = ANT.bounce; p.onGround = false; p.state = 'air'; p.jumping = true; p.jumps = Math.max(p.jumps || 0, 1);
        ev.push({ type: 'stomp', kind: t.type, id: t.id, x: t.x, y: t.y + t.hgt, z: t.z });
        if (t.carry) { t.carry = false; t.crumbUsed = true; t.drop = { x: t.x, y: t.y, z: t.z, taken: false, arm: CARRIER.arm }; ev.push({ type: 'drop', id: t.id, x: t.x, y: t.y, z: t.z }); }
      } else if (L.antInvuln <= 0 && t.danger !== false) {          // roller/dangler er bare farlige etter varselet (t.danger)                               // ellers: støt tilbake
        const l = d > 0.05 ? d : 1, ux = d > 0.05 ? dx / l : -(p.fx || 1), uz = d > 0.05 ? dz / l : -(p.fz || 0);
        p.vx = ux * ANT.knock; p.vz = uz * ANT.knock; p.vy = ANT.knockUp; p.onGround = false; p.state = 'air'; p.jumping = false; p.lock = Math.max(p.lock || 0, ANT.lock);
        L.antInvuln = ANT.invuln;
        ev.push({ type: 'hurt', kind: t.type, id: t.id, x: p.x, y: p.y + 0.5, z: p.z });
      }
    }
  }
  return ev;
}
const spec = (t) => (isDangler(t) ? DANGLER : ROLLER);
const nearBase = (t, p, r) => Math.hypot(p.x - t.hx, p.z - t.hz) < r && Math.abs(p.y - t.base) < 2;   // dangler: t.y står på takhøyde etter knusing, så sjekk mot fotpunktet under tråden
const near = (t, p, r) => Math.hypot(p.x - t.x, p.z - t.z) < r && Math.abs(p.y - t.y) < 2;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
