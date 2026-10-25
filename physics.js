// tinylittleme – bevegelsesfysikk.
// Ren JS uten DOM/three, slik at den kan testes i Node og porteres (Unity/Godot) senere.
// Verden: akse-justerte bokser. x/z er gulvplanet, y er opp. Enhet ≈ «spillerhøyde» (1.0).

export const P = {
  w: 0.6,
  h: 1.0,
  speed: 7,
  accel: 60,
  airAccel: 28,
  gravity: -32,
  maxFall: -30,
  jump: 12.5,        // enkelthopp ≈ 2.4 enheter
  airJump: 11.5,     // dobbelthopp
  cutVy: 4,          // slipper du hopp-knappen tidlig kappes farten til dette
  coyote: 0.1,
  jumpBuffer: 0.12,
  slide: -4,         // maks falltempo langs vegg
  wallKick: 8.5,
  wallUp: 11.5,
  wallLock: 0.2,     // kort tid uten styring etter veggsprang
  ledgeBelow: 0.5,   // hvor langt under hendene kanten kan ligge
  ledgeAbove: 0.4,   // ... og over
  ropeReach: 1.4,
  swingPush: 22,
  ropeJump: 11,
};

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
    state: 'air',                 // ground | air | hang | swing
    onGround: false, groundBox: null,
    jumps: 0, jumping: false,
    coyote: 0, buffer: 0, grabBuf: 0, cd: 0, lock: 0,
    wallT: 0, wallN: null, sliding: false,
    hang: null, rope: null, swing: null,
    t: 0,
  };
}

export function resetPlayer(p, x, y, z) {
  Object.assign(p, newPlayer(x, y, z));
}

function overlaps(b, x, y, z) {
  return x - HW < b.max[0] && x + HW > b.min[0] &&
         y < b.max[1] && y + H > b.min[1] &&
         z - HW < b.max[2] && z + HW > b.min[2];
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
  if (inp.jumpPressed) p.buffer = P.jumpBuffer;
  if (inp.grabPressed) p.grabBuf = 0.15;
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
  p.buffer -= dt; p.grabBuf -= dt; p.coyote -= dt; p.wallT -= dt;

  let wx = inp.mx, wz = inp.mz;
  const wl = Math.hypot(wx, wz);
  if (wl > 1) { wx /= wl; wz /= wl; }

  if (p.state === 'hang') return hangStep(p, wx, wz);
  if (p.state === 'swing') return swingStep(p, inp, wx, wz, dt);

  if (wl > 0.1 && p.lock <= 0) { p.fx = wx / wl; p.fz = wz / wl; }

  if (p.lock <= 0) {
    const a = (p.onGround ? P.accel : P.airAccel) * dt;
    p.vx = approach(p.vx, wx * P.speed, a);
    p.vz = approach(p.vz, wz * P.speed, a);
  }

  p.vy = Math.max(P.maxFall, p.vy + P.gravity * dt);
  const pushWall = p.wallT > 0 && p.wallN && (wx * p.wallN.nx + wz * p.wallN.nz) < -0.3;
  p.sliding = !p.onGround && !!pushWall && p.vy < P.slide;
  if (p.sliding) p.vy = P.slide;

  if (p.onGround) { p.coyote = P.coyote; p.jumps = 1; }

  if (p.buffer > 0) {
    if (p.coyote > 0) {
      p.vy = P.jump; p.coyote = 0; p.buffer = 0; p.onGround = false; p.jumping = true;
    } else if (pushWall && p.vy <= 0) {   // veggsprang: faller + styrer inn mot veggen
      p.vx = p.wallN.nx * P.wallKick; p.vz = p.wallN.nz * P.wallKick;
      p.vy = P.wallUp; p.lock = P.wallLock; p.jumps = 1;
      p.fx = p.wallN.nx; p.fz = p.wallN.nz;
      p.wallT = 0; p.buffer = 0; p.jumping = true;
    } else if (p.jumps > 0) {
      p.jumps--; p.vy = P.airJump; p.buffer = 0; p.jumping = true;
    }
  }
  if (p.jumping && !inp.jumpHeld && p.vy > P.cutVy) { p.vy = P.cutVy; p.jumping = false; }
  if (p.vy <= 0) p.jumping = false;

  if (p.grabBuf > 0 && p.cd <= 0 && !p.onGround && tryRope(p, L)) return;

  p.onGround = false; p.groundBox = null;
  const hx = moveX(p, p.vx * dt, L);
  const hz = moveZ(p, p.vz * dt, L);
  moveY(p, p.vy * dt, L);
  const hit = hx || hz;
  if (hit) { p.wallN = { nx: hit.nx, nz: hit.nz }; p.wallT = 0.12; }

  if (p.onGround) p.state = 'ground';
  else {
    p.state = 'air';
    if (hit && p.vy <= 2 && p.cd <= 0 && (wx * hit.nx + wz * hit.nz) < -0.3) tryLedge(p, hit, L);
  }
}

function moveX(p, d, L) {
  if (!d) return null;
  p.x += d;
  let hit = null;
  for (const b of L.boxes) {
    if (!overlaps(b, p.x, p.y, p.z)) continue;
    p.x = d > 0 ? b.min[0] - HW : b.max[0] + HW;
    p.vx = 0;
    hit = { box: b, nx: d > 0 ? -1 : 1, nz: 0 };
  }
  return hit;
}

function moveZ(p, d, L) {
  if (!d) return null;
  p.z += d;
  let hit = null;
  for (const b of L.boxes) {
    if (!overlaps(b, p.x, p.y, p.z)) continue;
    p.z = d > 0 ? b.min[2] - HW : b.max[2] + HW;
    p.vz = 0;
    hit = { box: b, nx: 0, nz: d > 0 ? -1 : 1 };
  }
  return hit;
}

function moveY(p, d, L) {
  p.y += d;
  for (const b of L.boxes) {
    if (!overlaps(b, p.x, p.y, p.z)) continue;
    if (d < 0) { p.y = b.max[1]; p.onGround = true; p.groundBox = b; }
    else p.y = b.min[1] - H;
    p.vy = 0;
  }
}

// ---- Kantgrep ----------------------------------------------------------
function tryLedge(p, hit, L) {
  const b = hit.box;
  const top = b.max[1];
  const dh = top - (p.y + H);
  if (dh > P.ledgeAbove || dh < -P.ledgeBelow) return false;
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
  if (p.buffer > 0) {            // hiv deg opp
    p.x = h.tx; p.z = h.tz; p.y = h.top;
    p.vx = p.vy = p.vz = 0;
    p.state = 'air'; p.hang = null; p.buffer = 0; p.cd = 0.15; p.onGround = false;
    return;
  }
  if (wx * h.nx + wz * h.nz > 0.5) {   // styr bort fra veggen: slipp
    p.state = 'air'; p.hang = null; p.cd = 0.35;
    p.vx = h.nx * 2; p.vz = h.nz * 2; p.jumps = 1;
  }
}

// ---- Tau / sving -------------------------------------------------------
function tryRope(p, L) {
  const hy = p.y + H * 0.85;
  for (const r of L.ropes || []) {
    const d = Math.hypot(p.x - r.x, p.z - r.z);
    if (d < P.ropeReach && hy < r.y - 1.2 && hy > r.y - r.len) {
      const R = Math.max(1.5, Math.hypot(p.x - r.x, hy - r.y, p.z - r.z));
      p.state = 'swing'; p.rope = r; p.swing = { R };
      p.grabBuf = 0; p.jumping = false;
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
    p.cd = 0.3; p.jumps = 1; p.buffer = 0;
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
