// tinylittleme – bevegelsesfysikk.
// Ren JS uten DOM/three, slik at den kan testes i Node og porteres (Unity/Godot) senere.
// Verden: akse-justerte bokser. x/z er gulvplanet, y er opp. Enhet ≈ «spillerhøyde» (1.0).

// Felles bevegelsesvekt: klassisk og spenning er «umiddelbare» (som før); prince har treghet, oppbygging og tidsbruk.
const SNAPPY = { accel: 60, decel: 60, turnDecel: 60, jumpWindup: 0, mantleTime: 0, landMin: 10, landK: 0, landMax: 0.5, landSlow: 0.3, walkFactor: 0.4 };

export const PRESETS = {
  // Slik det var først: raskt, to hopp, kanten grips av seg selv.
  klassisk: {
    ...SNAPPY, label: 'Klassisk', speed: 7, gravity: -32, jump: 12.5, airJump: 11.5, airJumps: 1, airAccel: 28,
    autoGrab: true, reachTime: 0.35, reachCooldown: 0.3, ledgeAbove: 0.4, reachAbove: 0,
    ropeReach: 1.4, wallKick: 8.5, wallUp: 11.5, slide: -4, swingPush: 22, ropeJump: 11,
  },
  // Tyngre hopp, ingen dobbelthopp: du må gripe aktivt (REKK UT) mot kant eller tau.
  spenning: {
    ...SNAPPY, label: 'Spenning', speed: 6.5, gravity: -22, jump: 12.2, airJump: 0, airJumps: 0, airAccel: 10,
    autoGrab: false, reachTime: 0.4, reachCooldown: 0.6, ledgeAbove: 0.3, reachAbove: 0.7,
    ropeReach: 2.0, wallKick: 7, wallUp: 11, slide: -3.5, swingPush: 16, ropeJump: 10,
  },
  // Prince of Persia-følelse: du bygger opp fart, snur ikke på stedet, hopp har forberedelse,
  // landing etter høyt fall tar tid, og å hive seg opp på en kant er en bevegelse som tar tid.
  prince: {
    label: 'Prince', speed: 5.6, accel: 12, decel: 18, turnDecel: 15, gravity: -22, jump: 12.2, airJump: 0, airJumps: 0, airAccel: 8,
    autoGrab: false, reachTime: 0.45, reachCooldown: 0.6, ledgeAbove: 0.3, reachAbove: 0.75,
    ropeReach: 2.0, wallKick: 7, wallUp: 11, slide: -3.5, swingPush: 14, ropeJump: 10,
    jumpWindup: 0.1, mantleTime: 0.8, landMin: 10, landK: 0.022, landMax: 0.5, landSlow: 0.3, walkFactor: 0.4,
  },
};

export const P = {
  w: 0.6,
  h: 1.0,
  accel: 60,
  slickAccel: 5,     // fart-endring på glatt underlag (fliser): du sklir
  maxFall: -30,
  cutVy: 4,          // slipper du hopp-knappen tidlig kappes farten til dette
  coyote: 0.1,
  jumpBuffer: 0.12,
  wallLock: 0.2,     // kort tid uten styring etter veggsprang
  ledgeBelow: 0.5,   // hvor langt under hendene kanten kan ligge
  // Variabler under overstyres av en forhåndsinnstilling (se PRESETS):
  speed: 7, airAccel: 28, gravity: -32, jump: 12.5, airJump: 11.5, airJumps: 1,
  decel: 60, turnDecel: 60,   // bremsing uten input / ved retningsskifte (lavt = tregt og vektig)
  jumpWindup: 0,     // forberedelse før et hopp tar av (s)
  mantleTime: 0,     // hvor lenge det tar å hive seg opp på en kant (s). 0 = øyeblikkelig
  landMin: 10, landK: 0, landMax: 0.5, landSlow: 0.3,   // landing etter fall: tid i hurk
  walkFactor: 0.4,   // fartsfaktor når du går forsiktig (C)
  turnRate: 8,       // hvor fort figuren snur kroppen (rad/s), brukes i tegningen
  autoGrab: true,    // false: kant/tau grips bare mens du «rekker ut» (GRIP)
  reachTime: 0.35,   // hvor lenge en utrekning varer
  reachCooldown: 0.3,// pause før du kan rekke ut igjen
  reachAbove: 0,     // ekstra rekkevidde over hodet mens du rekker ut
  ledgeAbove: 0.4, slide: -4, wallKick: 8.5, wallUp: 11.5,
  ropeReach: 1.4, swingPush: 22, ropeJump: 11,
  // bevegelige ting
  push: { light: 1, medium: 0.55, heavy: 0.3 },   // hvor mye av farten din som overføres når du dytter
  breakSpeed: 12,    // fallfart (enheter/s) over dette knuser skjøre ting
  crushSpeed: 3,     // ting som faller raskere enn dette skader deg
  carryReach: 1.4,   // hvor nær du må stå for å ta tak
  carryMax: 3.4,     // største mål på noe du kan bære (spilleren er 1 høy)
  carrySpeed: 0.8,   // fartsfaktor når du bærer
  supportMin: 0.45,  // minste andel av fotavtrykket som må hvile på noe, ellers glir tingen av
};

export function applyPreset(name) {
  const { label, ...vals } = PRESETS[name];
  Object.assign(P, vals);
}

const HW = P.w / 2;
const H = P.h;
const EPS = 1e-4;
const SUBSTEP = 1 / 120;

export function box(type, x0, x1, y0, y1, z0, z1, extra = {}) {
  return { type, min: [x0, y0, z0], max: [x1, y1, z1], ...extra };
}

export function newPlayer(x, y, z) {
  return {
    x, y, z, vx: 0, vy: 0, vz: 0,
    fx: 0, fz: 1,                 // blikkretning
    state: 'air',                 // ground | air | hang | mantle | swing
    onGround: false, groundBox: null,
    jumps: 0, jumping: false,
    coyote: 0, buffer: 0, cd: 0, lock: 0,
    reach: 0, reachCd: 0,         // «rekker ut»-vindu og pause
    wallT: 0, wallN: null, sliding: false,
    hang: null, rope: null, swing: null, mantle: null,
    windup: 0, recover: 0, skid: false,
    carry: null, crushed: null,
    t: 0,
  };
}

export function resetPlayer(p, x, y, z) {
  if (p.carry) p.carry.carried = false;
  Object.assign(p, newPlayer(x, y, z));
}

// Liten toleranse: å stå akkurat inntil en kant skal ikke telle som overlapp (flyttallsavvik ga «hopp opp på toppen»).
const TOL = 1e-5;
function overlaps(b, x, y, z) {
  return x - HW < b.max[0] - TOL && x + HW > b.min[0] + TOL &&
         y < b.max[1] - TOL && y + H > b.min[1] + TOL &&
         z - HW < b.max[2] - TOL && z + HW > b.min[2] + TOL;
}


// ---- Bevegelige ting -----------------------------------------------------
// Brettets `movables` blir til legemer i L.boxes (så spilleren kolliderer med dem som med alt annet).
// Legemer er akse-justerte bokser med tyngdekraft. De flyttes bare av at spilleren dytter eller bærer dem.
const boxOverlap = (a, b) =>
  a.min[0] < b.max[0] - TOL && a.max[0] > b.min[0] + TOL && a.min[1] < b.max[1] - TOL && a.max[1] > b.min[1] + TOL && a.min[2] < b.max[2] - TOL && a.max[2] > b.min[2] + TOL;

export function initBodies(L) {
  L.bodies = []; L.events = [];
  for (const m of L.movables || []) {
    const b = {
      id: m.id, type: m.material || 'plastic', material: m.material, color: m.color,
      min: [...m.min], max: [...m.max], dyn: true, weight: m.weight || 'medium', breakable: !!m.breakable,
      vy: 0, alive: true, carried: false, home: { min: [...m.min], max: [...m.max] },
    };
    b.pushFactor = P.push[b.weight] ?? 0.5;
    L.bodies.push(b); L.boxes.push(b);
  }
}

export function resetBodies(L, p) {
  if (p?.carry) { p.carry = null; }
  for (const b of L.bodies || []) {
    b.min = [...b.home.min]; b.max = [...b.home.max]; b.vy = 0; b.carried = false;
    if (!b.alive) { b.alive = true; L.boxes.push(b); }
  }
}

export function drainEvents(L) { const e = L.events || []; L.events = []; return e; }

function removeBody(L, b, type) {
  b.alive = false; b.carried = false;
  const i = L.boxes.indexOf(b); if (i >= 0) L.boxes.splice(i, 1);
  L.events.push({ type, id: b.id, pos: [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2], material: b.material });
}

const blockedBody = (b, L) => { for (const c of L.boxes) if (c !== b && !c.carried && boxOverlap(b, c)) return true; return false; };

function pushBody(b, axis, delta, L) {
  const sign = Math.sign(delta); let remaining = Math.abs(delta), moved = 0;
  while (remaining > 1e-6) {
    const st = Math.min(0.03, remaining);
    b.min[axis] += sign * st; b.max[axis] += sign * st;
    if (blockedBody(b, L)) { b.min[axis] -= sign * st; b.max[axis] -= sign * st; break; }
    moved += st; remaining -= st;
  }
  return moved * sign;
}

// Spilleren går inn i et legeme: det flyttes en brøkdel (etter vekt), og spilleren bremses tilsvarende.
function pushForPlayer(p, b, d, axis, L) {
  const vo = Math.min(p.y + H, b.max[1]) - Math.max(p.y, b.min[1]);
  if (vo < 0.2) return;                                     // bare så vidt oppå: behandles som fast
  const depth = axis === 0 ? (d > 0 ? p.x + HW - b.min[0] : b.max[0] - (p.x - HW)) : (d > 0 ? p.z + HW - b.min[2] : b.max[2] - (p.z - HW));
  if (depth > 0) pushBody(b, axis, Math.sign(d) * depth * b.pushFactor, L);
}

function stepBodies(L, p, dt) {
  for (const b of L.bodies) {
    if (!b.alive || b.carried) continue;
    b.vy = Math.max(P.maxFall, b.vy + P.gravity * dt);
    const dy = b.vy * dt, h = b.max[1] - b.min[1];
    b.min[1] += dy; b.max[1] += dy;
    for (const c of L.boxes) {
      if (c === b || c.carried || !boxOverlap(b, c)) continue;
      if (dy < 0) {
        // for lite understøttet (tyngdepunktet utenfor kanten): gli av i stedet for å bli liggende
        const ox = Math.min(b.max[0], c.max[0]) - Math.max(b.min[0], c.min[0]);
        const oz = Math.min(b.max[2], c.max[2]) - Math.max(b.min[2], c.min[2]);
        const frac = (ox * oz) / ((b.max[0] - b.min[0]) * (b.max[2] - b.min[2]));
        if (frac < P.supportMin) {
          if (ox < oz) { if ((b.min[0] + b.max[0]) / 2 > (c.min[0] + c.max[0]) / 2) { const w = b.max[0] - b.min[0]; b.min[0] = c.max[0]; b.max[0] = c.max[0] + w; } else { const w = b.max[0] - b.min[0]; b.max[0] = c.min[0]; b.min[0] = c.min[0] - w; } }
          else { if ((b.min[2] + b.max[2]) / 2 > (c.min[2] + c.max[2]) / 2) { const w = b.max[2] - b.min[2]; b.min[2] = c.max[2]; b.max[2] = c.max[2] + w; } else { const w = b.max[2] - b.min[2]; b.max[2] = c.min[2]; b.min[2] = c.min[2] - w; } }
          continue;
        }
        const impact = -b.vy;
        b.min[1] = c.max[1]; b.max[1] = c.max[1] + h;
        if (b.breakable && impact > P.breakSpeed) { removeBody(L, b, 'broke'); break; }
        b.vy = 0;
      } else { b.max[1] = c.min[1]; b.min[1] = c.min[1] - h; b.vy = 0; }
    }
    if (!b.alive) continue;
    for (const hz of L.hazards || []) if (boxOverlap(b, hz)) { removeBody(L, b, 'lost'); break; }
    if (!b.alive) continue;
    if (b.vy < -P.crushSpeed && overlaps(b, p.x, p.y, p.z)) p.crushed = b.id;
  }
}

export function dropCarry(p, L) {
  const b = p.carry; if (!b) return;
  b.carried = false; p.carry = null; b.vy = 0;
  for (let i = 0; i < 40 && blockedBody(b, L); i++) { b.min[1] += 0.2; b.max[1] += 0.2; }
}

// Nærmeste lette gjenstand foran deg som kan tas (eller null).
export function findCarryTarget(p, L) {
  let best = null, bd = Infinity;
  for (const b of L.bodies || []) {
    if (!b.alive || b.weight !== 'light') continue;
    if (Math.max(b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]) > P.carryMax) continue;   // for stort å bære
    const dx = Math.max(b.min[0] - p.x, 0, p.x - b.max[0]), dz = Math.max(b.min[2] - p.z, 0, p.z - b.max[2]);
    const d = Math.hypot(dx, dz);
    if (d > P.carryReach || b.max[1] < p.y - 0.3 || b.min[1] > p.y + H + 0.3) continue;
    const cx = (b.min[0] + b.max[0]) / 2 - p.x, cz = (b.min[2] + b.max[2]) / 2 - p.z, l = Math.hypot(cx, cz) || 1;
    if (d > 0.15 && (cx * p.fx + cz * p.fz) / l < 0.2) continue;      // må være foran deg
    if (d < bd) { bd = d; best = b; }
  }
  return best;
}

// Ta tak i / slipp en lett gjenstand foran deg. Returnerer 'pick', 'drop' eller null.
export function tryCarry(p, L) {
  if (p.carry) { dropCarry(p, L); return 'drop'; }
  const best = findCarryTarget(p, L);
  if (!best) return null;
  p.carry = best; best.carried = true; best.vy = 0;
  return 'pick';
}

function updateCarried(p, L) {
  const b = p.carry; if (!b) return;
  const sx = b.max[0] - b.min[0], sy = b.max[1] - b.min[1], sz = b.max[2] - b.min[2];
  const r = HW + Math.max(sx, sz) / 2 + 0.06, cx = p.x + p.fx * r, cz = p.z + p.fz * r, y0 = p.y + 0.35;
  const oldMin = b.min, oldMax = b.max;
  b.min = [cx - sx / 2, y0, cz - sz / 2]; b.max = [cx + sx / 2, y0 + sy, cz + sz / 2];
  if (blockedBody(b, L)) { b.min = oldMin; b.max = oldMax; }
  if (Math.hypot((b.min[0] + b.max[0]) / 2 - p.x, (b.min[2] + b.max[2]) / 2 - p.z) > 3) dropCarry(p, L);
}

// Fare-volum (vann, do-skål, kar): AABB som spilleren ikke skal berøre. Returnerer faren eller null.
export function inHazard(L, p) {
  for (const h of L.hazards || []) if (overlaps(h, p.x, p.y, p.z)) return h;
  return null;
}

export function freeAt(L, x, y, z) {
  for (const b of L.boxes) if (overlaps(b, x, y, z)) return false;
  return true;
}

function approach(v, target, d) {
  if (v < target) return Math.min(v + d, target);
  return Math.max(v - d, target);
}

// inp: { mx, mz (-1..1, verdensretning), jumpPressed, jumpHeld, grabPressed, grabHeld }
export function step(p, inp, dt, L) {
  if (inp.carryPressed && L.bodies?.length) tryCarry(p, L);
  if (inp.jumpPressed) p.buffer = P.jumpBuffer;
  if (inp.grabPressed && p.reachCd <= 0) { p.reach = P.reachTime; p.reachCd = P.reachTime + P.reachCooldown; }
  let left = dt;
  while (left > 1e-6) {
    const h = Math.min(left, SUBSTEP);
    sub(p, inp, h, L);
    left -= h;
  }
}

function sub(p, inp, dt, L) {
  p.t += dt;
  p.cd = Math.max(0, p.cd - dt);
  p.lock = Math.max(0, p.lock - dt);
  p.buffer -= dt; p.coyote -= dt; p.wallT -= dt;
  p.reach = Math.max(0, p.reach - dt); p.reachCd = Math.max(0, p.reachCd - dt);
  p.recover = Math.max(0, p.recover - dt);

  let wx = inp.mx, wz = inp.mz;
  const wl = Math.hypot(wx, wz);
  if (wl > 1) { wx /= wl; wz /= wl; }

  if (L.bodies?.length) stepBodies(L, p, dt);

  if (p.state === 'mantle') return mantleStep(p, dt);
  if (p.state === 'hang') return hangStep(p, wx, wz);
  if (p.state === 'swing') return swingStep(p, inp, wx, wz, dt);

  const speed0 = Math.hypot(p.vx, p.vz);
  const rev = wl > 0.1 && speed0 > 0.1 && (p.vx * wx + p.vz * wz) / (speed0 * Math.hypot(wx, wz)) < -0.5;   // du styrer mot bevegelsen
  p.skid = p.onGround && rev && speed0 > 2;
  // blikkretningen følger inputen først når du faktisk er på vei den veien (ikke mens du sklir motsatt)
  if (wl > 0.1 && p.lock <= 0 && (!rev || speed0 < 1.5)) { p.fx = wx / wl; p.fz = wz / wl; }

  if (p.lock <= 0) {
    let a;
    if (!p.onGround) a = P.airAccel;
    else if (p.groundBox?.slick) a = P.slickAccel;
    else if (wl < 0.1) a = P.decel;
    else a = rev ? P.turnDecel : P.accel;
    const sp = P.speed * (p.carry ? P.carrySpeed : 1) * (inp.walk ? P.walkFactor : 1) * (p.recover > 0 ? P.landSlow : 1) * (p.windup > 0 ? 0.6 : 1);
    const tx = wx * sp, tz = wz * sp, dx = tx - p.vx, dz = tz - p.vz, dl = Math.hypot(dx, dz), m = a * dt;
    if (dl <= m) { p.vx = tx; p.vz = tz; } else { p.vx += dx / dl * m; p.vz += dz / dl * m; }   // som vektor: gir buer, ikke akse-hopp
  }

  p.vy = Math.max(P.maxFall, p.vy + P.gravity * dt);
  const pushWall = p.wallT > 0 && p.wallN && (wx * p.wallN.nx + wz * p.wallN.nz) < -0.3;
  p.sliding = !p.onGround && !!pushWall && p.vy < P.slide;
  if (p.sliding) p.vy = P.slide;

  if (p.onGround) { p.coyote = P.coyote; p.jumps = P.airJumps; }

  if (p.windup > 0) {                                      // forberedelse (hurk) før avsparket
    p.windup -= dt;
    if (p.windup <= 0) { p.windup = 0; p.vy = P.jump; p.jumping = true; p.onGround = false; }
  }
  if (p.buffer > 0) {
    if (p.coyote > 0) {
      if (p.recover > 0 || p.windup > 0) { /* i hurk: ikke hopp ennå (hoppet blir stående i bufferen) */ }
      else if (P.jumpWindup > 0) { p.windup = P.jumpWindup; p.coyote = 0; p.buffer = 0; }
      else { p.vy = P.jump; p.coyote = 0; p.buffer = 0; p.onGround = false; p.jumping = true; }
    } else if (pushWall && p.vy <= 0) {   // veggsprang: faller + styrer inn mot veggen
      p.vx = p.wallN.nx * P.wallKick; p.vz = p.wallN.nz * P.wallKick;
      p.vy = P.wallUp; p.lock = P.wallLock; p.jumps = P.airJumps;
      p.fx = p.wallN.nx; p.fz = p.wallN.nz;
      p.wallT = 0; p.buffer = 0; p.jumping = true;
    } else if (p.jumps > 0) {
      p.jumps--; p.vy = P.airJump; p.buffer = 0; p.jumping = true;
    }
  }
  if (p.jumping && !inp.jumpHeld && p.vy > P.cutVy) { p.vy = P.cutVy; p.jumping = false; }
  if (p.vy <= 0) p.jumping = false;

  if (p.reach > 0 && p.cd <= 0 && !p.onGround && tryRope(p, L)) return;

  const wasGrounded = p.onGround, vyBefore = p.vy;
  p.onGround = false; p.groundBox = null;
  const hx = moveX(p, p.vx * dt, L);
  const hz = moveZ(p, p.vz * dt, L);
  moveY(p, p.vy * dt, L);
  const hit = hx || hz;
  if (hit) { p.wallN = { nx: hit.nx, nz: hit.nz }; p.wallT = 0.12; }

  if (!wasGrounded && p.onGround && P.landK > 0 && vyBefore < -P.landMin) p.recover = Math.min(P.landMax, (-vyBefore - P.landMin) * P.landK);

  updateCarried(p, L);

  if (p.onGround) p.state = 'ground';
  else {
    p.state = 'air';
    if (hit && p.vy <= 2 && p.cd <= 0 && (P.autoGrab || p.reach > 0) && (wx * hit.nx + wz * hit.nz) < -0.3) tryLedge(p, hit, L);
  }
}

function moveX(p, d, L) {
  if (!d) return null;
  p.x += d;
  let hit = null;
  for (const b of L.boxes) {
    if (b === p.carry || !overlaps(b, p.x, p.y, p.z)) continue;
    if (b.dyn) pushForPlayer(p, b, d, 0, L);
    p.x = d > 0 ? b.min[0] - HW : b.max[0] + HW;
    if (!b.dyn) p.vx = 0;                      // mot ting som kan dyttes beholder du farten
    hit = { box: b, nx: d > 0 ? -1 : 1, nz: 0 };
  }
  return hit;
}

function moveZ(p, d, L) {
  if (!d) return null;
  p.z += d;
  let hit = null;
  for (const b of L.boxes) {
    if (b === p.carry || !overlaps(b, p.x, p.y, p.z)) continue;
    if (b.dyn) pushForPlayer(p, b, d, 2, L);
    p.z = d > 0 ? b.min[2] - HW : b.max[2] + HW;
    if (!b.dyn) p.vz = 0;
    hit = { box: b, nx: 0, nz: d > 0 ? -1 : 1 };
  }
  return hit;
}

function moveY(p, d, L) {
  p.y += d;
  for (const b of L.boxes) {
    if (b === p.carry || !overlaps(b, p.x, p.y, p.z)) continue;
    if (d < 0) { p.y = b.max[1]; p.onGround = true; p.groundBox = b; }
    else p.y = b.min[1] - H;
    p.vy = 0;
  }
}

// ---- Kantgrep ----------------------------------------------------------
function tryLedge(p, hit, L) {
  if (p.carry) return false;
  const b = hit.box;
  const top = b.max[1];
  const dh = top - (p.y + H);
  if (dh > P.ledgeAbove + (p.reach > 0 ? P.reachAbove : 0) || dh < -P.ledgeBelow) return false;
  const tx = p.x - hit.nx * (HW + 0.35);
  const tz = p.z - hit.nz * (HW + 0.35);
  if (!freeAt(L, tx, top + 0.02, tz)) return false;
  p.state = 'hang';
  p.hang = { nx: hit.nx, nz: hit.nz, top, tx, tz };
  p.y = top - H;
  if (hit.nx) p.x = hit.nx > 0 ? b.max[0] + HW : b.min[0] - HW;
  if (hit.nz) p.z = hit.nz > 0 ? b.max[2] + HW : b.min[2] - HW;
  p.fx = -hit.nx; p.fz = -hit.nz;
  p.vx = p.vy = p.vz = 0;
  p.jumping = false;
  return true;
}

function hangStep(p, wx, wz) {
  const h = p.hang;
  if (p.buffer > 0 && P.mantleTime > 0) {                  // hiv deg opp: tar tid, du er sårbar underveis
    p.mantle = { t: 0, dur: P.mantleTime, fx: p.x, fy: p.y, fz: p.z, tx: h.tx, ty: h.top, tz: h.tz };
    p.state = 'mantle'; p.hang = null; p.buffer = 0;
    return;
  }
  if (p.buffer > 0) {            // hiv deg opp (øyeblikkelig)
    p.x = h.tx; p.z = h.tz; p.y = h.top;
    p.vx = p.vy = p.vz = 0;
    p.state = 'air'; p.hang = null; p.buffer = 0; p.cd = 0.15; p.onGround = false;
    return;
  }
  if (wx * h.nx + wz * h.nz > 0.5) {   // styr bort fra veggen: slipp
    p.state = 'air'; p.hang = null; p.cd = 0.35;
    p.vx = h.nx * 2; p.vz = h.nz * 2; p.jumps = Math.min(1, P.airJumps);
  }
}

function mantleStep(p, dt) {
  const m = p.mantle; m.t += dt;
  const u = Math.min(1, m.t / m.dur), ease = (x) => x * x * (3 - 2 * x);
  const up = ease(Math.min(1, u / 0.6)), fwd = ease(Math.max(0, (u - 0.6) / 0.4));   // først opp, så inn over kanten
  p.y = m.fy + (m.ty - m.fy) * up;
  p.x = m.fx + (m.tx - m.fx) * fwd; p.z = m.fz + (m.tz - m.fz) * fwd;
  p.vx = p.vy = p.vz = 0;
  if (u >= 1) { p.state = 'air'; p.mantle = null; p.cd = 0.15; p.onGround = false; }
}

// ---- Tau / sving -------------------------------------------------------
function tryRope(p, L) {
  if (p.carry) return false;
  const hy = p.y + H * 0.85;
  for (const r of L.ropes || []) {
    const d = Math.hypot(p.x - r.x, p.z - r.z);
    if (d < P.ropeReach && hy < r.y - 1.2 && hy > r.y - r.len) {
      const R = Math.max(1.5, Math.hypot(p.x - r.x, hy - r.y, p.z - r.z));
      p.state = 'swing'; p.rope = r; p.swing = { R };
      p.reach = 0; p.jumping = false;
      return true;
    }
  }
  return false;
}

function swingStep(p, inp, wx, wz, dt) {
  const r = p.rope, R = p.swing.R;
  if (p.buffer > 0 || !inp.grabHeld) {
    const jumped = p.buffer > 0;
    if (jumped) p.vy += P.ropeJump * 0.6;
    p.state = 'air'; p.rope = null; p.swing = null;
    p.cd = 0.3; p.jumps = Math.min(1, P.airJumps); p.buffer = 0;
    return;
  }
  p.vy += P.gravity * dt;
  p.vx += wx * P.swingPush * dt;
  p.vz += wz * P.swingPush * dt;
  let hx = p.x + p.vx * dt, hy = p.y + H * 0.85 + p.vy * dt, hz = p.z + p.vz * dt;
  let dx = hx - r.x, dy = hy - r.y, dz = hz - r.z;
  const len = Math.hypot(dx, dy, dz);
  if (len > R) {
    const k = R / len;
    dx *= k; dy *= k; dz *= k;
    hx = r.x + dx; hy = r.y + dy; hz = r.z + dz;
    const nx = dx / R, ny = dy / R, nz = dz / R;
    const vr = p.vx * nx + p.vy * ny + p.vz * nz;
    if (vr > 0) { p.vx -= nx * vr; p.vy -= ny * vr; p.vz -= nz * vr; }
  }
  const damp = 1 - 0.1 * dt;
  p.vx *= damp; p.vy *= damp; p.vz *= damp;
  p.x = hx; p.y = hy - H * 0.85; p.z = hz;
  const sp = Math.hypot(p.vx, p.vz);
  if (sp > 0.5) { p.fx = p.vx / sp; p.fz = p.vz / sp; }
}
