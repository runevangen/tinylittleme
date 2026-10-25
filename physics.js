// tinylittleme – bevegelsesfysikk.
// Ren JS uten DOM/three, slik at den kan testes i Node og porteres (Unity/Godot) senere.
// Verden: akse-justerte bokser. x/z er gulvplanet, y er opp. Enhet ≈ «spillerhøyde» (1.0).

// Felles bevegelsesvekt: klassisk og spenning er «umiddelbare» (som før); prince har treghet, oppbygging og tidsbruk.
const SNAPPY = { gaitMode: false, jumpBoost: 1, accel: 60, decel: 60, turnDecel: 60, jumpWindup: 0, mantleTime: 0, landMin: 10, landK: 0, landMax: 0.5, landSlow: 0.3, walkFactor: 0.4, hardLand: Infinity, knockV: Infinity };

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
    label: 'Prince', speed: 2.8, accel: 7, decel: 12, turnDecel: 10, gravity: -22, jump: 12.2, airJump: 0, airJumps: 0, airAccel: 8,
    gaitMode: true, jumpBoost: 2.0, turnRate: 8, stepMin: 0.25, cadence0: 1.8, cadenceK: 0.6, creep: 0.45,
    autoGrab: false, reachTime: 0.45, reachCooldown: 0.6, ledgeAbove: 0.3, reachAbove: 0.75,
    ropeReach: 2.0, wallKick: 7, wallUp: 11, slide: -3.5, swingPush: 14, ropeJump: 10,
    jumpWindup: 0.1, mantleTime: 0.8, landMin: 10, landK: 0.022, landMax: 0.5, landSlow: 0.3, walkFactor: 0.4,
    hardLand: 18, knockV: 27,     // landingsfart (enheter/s): hard landing (bedøvet) og så hard at du må tilbake til lagringspunktet
  },
};

export const P = {
  w: 0.6,
  h: 1.0,
  accel: 60,
  slickAccel: 5,     // fart-endring på glatt underlag (fliser): du sklir
  maxFall: -30,
  cutVy: 4,          // slipper du hopp-knappen tidlig kappes farten til dette
  coyote: 0.14,      // tid du fortsatt kan hoppe etter å ha gått av en kant (s)
  jumpBuffer: 0.12,  // hopp trykket litt for tidlig huskes så lenge (s); under hurk/landing huskes det til hurken er over
  reachSnap: 0.45,   // REKK UT griper en grep-flate eller kant som er så langt unna (enheter), ikke bare det du allerede berører
  wallLock: 0.2,     // kort tid uten styring etter veggsprang
  ledgeBelow: 0.5,   // hvor langt under hendene kanten kan ligge
  // Variabler under overstyres av en forhåndsinnstilling (se PRESETS):
  speed: 7, airAccel: 28, gravity: -32, jump: 12.5, airJump: 11.5, airJumps: 1,
  decel: 60, turnDecel: 60,   // bremsing uten input / ved retningsskifte (lavt = tregt og vektig)
  jumpWindup: 0,     // forberedelse før et hopp tar av (s)
  mantleTime: 0,     // hvor lenge det tar å hive seg opp på en kant (s). 0 = øyeblikkelig
  landMin: 10, landK: 0, landMax: 0.5, landSlow: 0.3,   // landing etter fall: tid i hurk
  walkFactor: 0.4,   // fartsfaktor når du går forsiktig (C)
  turnRate: 8,       // hvor fort figuren snur kroppen (rad/s)
  // gange med skritt (gaitMode): bevegelsen styres av skrittene, ikke omvendt
  gaitMode: false,   // true: du går i blikkretningen, snur kroppen først, og stopper ved skrittgrensen
  stepMin: 0.25,     // korteste skrittlengde
  cadence0: 1.8, cadenceK: 0.6,   // skritt per sekund = cadence0 + cadenceK * fart
  jumpBoost: 1,      // løpehopp: fart i lufta = bakkefart × dette
  creep: 0.55,       // laveste fart mens et påbegynt skritt fullføres
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
  placeReach: 1.3,   // hvor langt foran deg du kan sette fra deg noe
  placeUp: 0.7,      // høyeste flate (over hodet) du kan sette noe på
  placeDown: 1.6,    // laveste flate under føttene du kan sette noe på
  carrySpeed: 0.8,   // fartsfaktor når du bærer
  hardLand: Infinity, knockV: Infinity,   // se PRESETS (bare Prince har harde landinger)
  stunTime: 1.1,     // hvor lenge du er bedøvet etter en hard landing (s)
  softFactor: 0.35,  // myke flater (svamp, matte, håndkle, papirhaug) tar denne andelen av landingsfarten
  throwMin: 0.32,    // hold TA kortere enn dette = slipp/sett på/bruk; lenger = kast (et avslappet trykk på mobil varer ofte 0,2 s)
  throwFull: 0.7,    // ytterligere holdetid til full kraft (s)
  throwV0: 3.5, throwV1: 9.5, throwUp0: 3, throwUp1: 7.5,   // kastefart fremover og opp (svak … full)
  vaultH: 7, vaultMin: 0.55,   // stavhopp: høyde over bakken ved full fart for en stav på 1,5 enheter, og laveste fartsandel for å stavhoppe
  zipMax: 24, zipMinDrop: 1.5, zipReach: 1.4, zipV0: 1.5, zipAcc: 5, zipVmax: 9,   // taubane: lengste tråd, minste høydeforskjell, rekkevidde til øvre ende, start-/topp-fart (enheter/s)
  stamina: 10, staminaRegen: 2.5, exhaustT: 0.45, exhaustSlide: 3,   // klatring: sekunder du orker å henge på en flate, og hvor fort det kommer tilbake på bakken (s/s)
  climbUp: 1.6, climbDown: 2.6, climbSide: 1.3,   // fart opp, ned og sidelengs på en grep-flate
  gelH: 6, gelW: 1.6, gelDry: 20, gelWetDrain: 1.2, gelSlide: 0.5,   // hårgelé: felt (høyde, bredde), tørketid (s), ekstra stamina-forbruk og sakte skli mens det er vått
  stripMax: 14, stripW: 0.5, stripTear: 7,   // dopapirbånd: lengste fall, bredde, og hvor lenge det tåler et tak (s) før det revner
  throwFriction: 6,  // en kastet ting bremses på bakken
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
    airT: 0, landT: 9, landImpact: 0, pushT: 0, hadIn: false,   // til animasjon: tid i lufta, tid siden landing, dytting, input-hysterese
    gait: 0, stepLen: 0.4,         // skrittfase (rad, π per skritt) og gjeldende skrittlengde
    carry: null, crushed: null, charge: 0, carryLatch: false,   // kast: hold-tid, og «ventet til F ble sluppet etter at noe ble tatt»
    hardLands: 0, knockout: false, vaulting: false, jumpSp: 0, toolWarn: 0,
    zip: null,
    stam: P.stamina, exhaust: 0, climb: null, climbPh: 0, climbMove: 0,        // klatring: stamina, flaten du henger på, og armtak-fase til animasjon
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
  L.bodies = []; L.events = []; L.made = []; L.zips = [];
  for (const m of L.movables || []) {
    const b = {
      id: m.id, kind: m.kind, pole: m.pole || 0, tool: m.tool || '', tool0: m.tool || '', thread: m.tool === 'spool', soft: !!m.soft, vx: 0, vz: 0, grounded: false, type: m.material || 'plastic', material: m.material, color: m.color,
      min: [...m.min], max: [...m.max], dyn: true, weight: m.weight || 'medium', breakable: !!m.breakable,
      vy: 0, alive: true, carried: false, home: { min: [...m.min], max: [...m.max] },
    };
    b.pushFactor = P.push[b.weight] ?? 0.5;
    L.bodies.push(b); L.boxes.push(b);
  }
}

export function resetBodies(L, p) {
  if (p?.carry) { p.carry = null; }
  for (const m of L.made || []) { const i = L.boxes.indexOf(m); if (i >= 0) L.boxes.splice(i, 1); }
  L.made = []; L.zips = [];
  for (const b of L.bodies || []) {
    b.tool = b.tool0; b.threaded = false; b.zipA = null;
    b.min = [...b.home.min]; b.max = [...b.home.max]; b.vy = 0; b.vx = b.vz = 0; b.carried = false;
    if (!b.alive) { b.alive = true; L.boxes.push(b); }
  }
}

// En ting som forsvant (hull, vann) settes tilbake på plassen sin, gratis. Returnerer false hvis du står der (prøv igjen senere).
export function returnBody(L, id, p) {
  const b = (L.bodies || []).find((x) => x.id === id); if (!b) return true;
  if (b.alive) return true;
  b.min = [...b.home.min]; b.max = [...b.home.max]; b.vy = 0; b.vx = b.vz = 0; b.carried = false;
  if (p && overlaps(b, p.x, p.y, p.z)) return false;
  if (blockedBodyAt(b, L)) return false;
  b.alive = true; L.boxes.push(b); return true;
}
const blockedBodyAt = (b, L) => { for (const c of L.boxes) if (c !== b && !c.carried && boxOverlap(b, c)) return true; return false; };

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
  if (depth > 0) { pushBody(b, axis, Math.sign(d) * depth * b.pushFactor, L); p.pushT = 0.15; }
}

function stepBodies(L, p, dt) {
  for (const b of L.bodies) {
    if (!b.alive || b.carried) continue;
    for (const [axis, key] of [[0, 'vx'], [2, 'vz']]) {                 // kastet: flyr videre til noe stopper den
      if (!b[key]) continue;
      const want = b[key] * dt, got = pushBody(b, axis, want, L);
      if (Math.abs(got) < Math.abs(want) - 1e-6) b[key] = 0;
    }
    if (b.grounded && (b.vx || b.vz)) {                                  // friksjon mot underlaget
      const k = Math.exp(-P.throwFriction * dt); b.vx *= k; b.vz *= k;
      if (Math.hypot(b.vx, b.vz) < 0.05) b.vx = b.vz = 0;
    }
    b.grounded = false;
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
        b.grounded = true;
        b.min[1] = c.max[1]; b.max[1] = c.max[1] + h;
        if (b.breakable && impact * (c.soft ? P.softFactor : 1) > P.breakSpeed) { removeBody(L, b, 'broke'); break; }
        b.vy = 0;
      } else { b.max[1] = c.min[1]; b.min[1] = c.min[1] - h; b.vy = 0; }
    }
    if (!b.alive) continue;
    for (const hz of L.hazards || []) if (boxOverlap(b, hz)) { removeBody(L, b, 'lost'); break; }
    if (!b.alive) continue;
    if (b.vy < -P.crushSpeed && overlaps(b, p.x, p.y, p.z)) p.crushed = b.id;
  }
}

// «Sett på»: finn en flate foran deg (bord, hylle, kasse, en annen ting) der det du bærer kan stå trygt. Returnerer {c, min, max} eller null.
export function findPlaceSpot(p, L) {
  const b = p.carry; if (!b) return null;
  const sx = b.max[0] - b.min[0], sy = b.max[1] - b.min[1], sz = b.max[2] - b.min[2];
  const r = HW + Math.max(sx, sz) / 2 + 0.06, wantX = p.x + p.fx * r, wantZ = p.z + p.fz * r;
  const reach = HW + P.placeReach + Math.max(sx, sz) / 2;
  let best = null, bs = Infinity;
  for (const c of L.boxes) {
    if (c === b || c.carried || c.type === 'wall') continue;
    const top = c.max[1];
    if (top > p.y + H + P.placeUp || top < p.y - P.placeDown) continue;
    const cl = (v, lo, hi) => (hi < lo ? (lo + hi) / 2 : Math.max(lo, Math.min(hi, v)));
    const cx = cl(wantX, c.min[0] + sx / 2, c.max[0] - sx / 2), cz = cl(wantZ, c.min[2] + sz / 2, c.max[2] - sz / 2);
    if (Math.hypot(cx - p.x, cz - p.z) > reach) continue;
    const ox = Math.min(cx + sx / 2, c.max[0]) - Math.max(cx - sx / 2, c.min[0]), oz = Math.min(cz + sz / 2, c.max[2]) - Math.max(cz - sz / 2, c.min[2]);
    if (ox * oz / (sx * sz) < 0.6) continue;                                   // for lite å stå på
    const min = [cx - sx / 2, top, cz - sz / 2], max = [cx + sx / 2, top + sy, cz + sz / 2];
    const probe = { min: [min[0], min[1] + 0.02, min[2]], max };
    let clear = true;
    for (const o of L.boxes) if (o !== b && o !== c && !o.carried && o.type !== 'floor' && boxOverlap(probe, o)) { clear = false; break; }
    if (!clear) continue;
    const disp = Math.hypot(cx - wantX, cz - wantZ);
    if (disp > P.placeReach) continue;                                         // langt unna der du holder tingen
    const score = disp + 0.04 * Math.abs(top - (p.y + 0.35)) - (top > p.y + 0.2 ? 10 : 0);   // en høyere flate foran deg går foran gulvet
    if (score < bs) { bs = score; best = { c, min, max }; }
  }
  return best;
}

// Kastefart for en ladning k (0..1): fremover i blikkretningen (litt av egen fart med), og opp.
export function throwVelocity(p, k) {
  const sp = P.throwV0 + (P.throwV1 - P.throwV0) * k;
  return { vx: p.fx * sp + p.vx * 0.5, vy: P.throwUp0 + (P.throwUp1 - P.throwUp0) * k, vz: p.fz * sp + p.vz * 0.5 };
}
export function throwCarry(p, L, k) {
  const b = p.carry; if (!b) return;
  const v = throwVelocity(p, k);
  b.carried = false; p.carry = null;
  b.vx = v.vx; b.vy = v.vy; b.vz = v.vz;
}

// F: ta tak i en ting. Når du bærer: kort trykk = slipp/sett på, hold = lad opp kast og slipp for å kaste.
function carryControl(p, inp, dt, L) {
  if (!L.bodies?.length) return;
  if (inp.carryHeld === undefined) { if (inp.carryPressed) tryCarry(p, L); return; }       // enkel tolkning (tester/bot): trykk = ta/slipp
  if (!p.carry) {
    p.charge = 0;
    if (inp.carryPressed && tryCarry(p, L) === 'pick') p.carryLatch = true;
    return;
  }
  if (p.carryLatch) { if (!inp.carryHeld) p.carryLatch = false; return; }
  if (inp.carryHeld) {
    if (inp.aim) { p.fx = inp.aim.dx; p.fz = inp.aim.dz; p.charge = P.throwMin + Math.max(0.02, inp.aim.k) * P.throwFull; p.aiming = true; return; }   // dra-og-slipp: retning og kraft fra fingeren
    if (p.aiming) { p.aiming = false; p.charge = 0; }
    p.charge += dt; return;
  }
  p.aiming = false;
  const c = p.charge; p.charge = 0;
  if (c <= 0) return;
  if (c < P.throwMin) {
    const r = useTool(p, L);
    if (r === true) return;
    if (typeof r === 'string' && r.startsWith('zip-')) { (L.events ||= []).push({ type: 'toolhint', tool: 'zip', why: r }); return; }   // tråden kan ikke festes her: forklar, behold nålen
    if (p.carry?.tool && r === false && p.toolWarn <= 0) { p.toolWarn = 2; L.events.push({ type: 'toolhint', tool: p.carry.tool }); return; }   // ikke på riktig sted: forklar først, neste trykk slipper
    dropCarry(p, L);
  } else throwCarry(p, L, Math.min(1, (c - P.throwMin) / P.throwFull));
}

// Hva trykk på TA gjør nå for et verktøy du bærer (til hint-linjen): 'gel' | 'roll' (kan brukes her), 'again' (allerede brukt her: neste trykk slipper), 'need-gel' | 'need-roll' (ikke på riktig sted), eller null (ikke et verktøy)
export function toolHint(p, L) {
  const c = p.carry; if (!c?.tool) return null;
  const made = L.made || [];
  if (!p.onGround) return 'need-' + c.tool;
  if (c.tool === 'gel') { const f = faceAhead(p, L, HW + 0.9); if (!f) return 'need-gel'; return made.some((m) => m.owner === c.id && m.parent === f.b) ? 'again' : 'gel'; }
  if (c.tool === 'roll') {
    const gb = p.groundBox; if (!gb) return 'need-roll';
    if (made.some((m) => m.owner === c.id && m.parent === gb)) return 'again';
    const ax = Math.abs(p.fx) >= Math.abs(p.fz) ? 0 : 2, sgn = Math.sign(ax === 0 ? p.fx : p.fz) || 1;
    return (((sgn > 0 ? gb.max[ax] : gb.min[ax]) - (ax === 0 ? p.x : p.z)) * sgn <= HW + 0.7) ? 'roll' : 'need-roll';
  }
  if (c.tool === 'needle') return findNear(p, L, (b) => b.thread) ? 'thread' : 'need-thread';
  if (c.tool === 'spool') return findNear(p, L, (b) => b.tool === 'needle') ? 'thread' : 'need-needle';
  if (c.tool === 'zip') return c.zipA ? 'zip-b' : 'zip-a';
  return null;
}

// ---- Verktøy du bærer: hårgelé (smør et klistrete grep-felt på veggen) og dopapirrull (rull ut et bånd over en kant) ----
function faceAhead(p, L, reach) {                              // nærmeste loddrette flate rett foran deg
  const ax = Math.abs(p.fx) >= Math.abs(p.fz) ? 0 : 2, sgn = Math.sign(ax === 0 ? p.fx : p.fz) || 1;
  const yy = p.y + 0.5; let best = null;
  for (const b of L.boxes) {
    if (b.carried || b === p.carry || b.type === 'floor' || b.dyn || b.owner) continue;
    if (yy < b.min[1] || yy > b.max[1]) continue;
    const o = 2 - ax;                                            // tvers
    if ((ax === 0 ? p.z : p.x) < b.min[o] - 0.1 || (ax === 0 ? p.z : p.x) > b.max[o] + 0.1) continue;
    const plane = sgn > 0 ? b.min[ax] : b.max[ax], d = (plane - (ax === 0 ? p.x : p.z)) * sgn;
    if (d < -0.05 || d > reach) continue;
    if (!best || d < best.d) best = { b, ax, sgn, plane, d };
  }
  return best;
}
function makeBox(L, spec) { L.made.push(spec); L.boxes.push(spec); return spec; }
function useTool(p, L) {
  const c = p.carry; if (!c?.tool || !p.onGround) return false;
  L.made = L.made || [];
  if (c.tool === 'gel') {
    const f = faceAhead(p, L, HW + 0.9); if (!f) return false;
    if (L.made.some((m) => m.owner === c.id && m.parent === f.b)) return 'again';    // allerede smurt her: neste trykk slipper flasken
    for (const m of L.made) if (m.owner === c.id) { const i = L.boxes.indexOf(m); if (i >= 0) L.boxes.splice(i, 1); }
    L.made = L.made.filter((m) => m.owner !== c.id);              // ett felt per flaske: nytt smør flytter det
    const o = 2 - f.ax, t = 0.12, y0 = p.y + 0.3, y1 = Math.min(y0 + P.gelH, f.b.max[1] + 0.3), cen = o === 0 ? p.x : p.z;
    const lo = [0, y0, 0], hi = [0, y1, 0];
    lo[o] = cen - P.gelW / 2; hi[o] = cen + P.gelW / 2;
    if (f.sgn > 0) { lo[f.ax] = f.plane - t; hi[f.ax] = f.plane; } else { lo[f.ax] = f.plane; hi[f.ax] = f.plane + t; }   // tynn plate foran flaten, mot deg
    const key = f.ax === 0 ? 'x' : 'z';
    if (f.sgn > 0) p[key] = Math.min(p[key], f.plane - t - HW); else p[key] = Math.max(p[key], f.plane + t + HW);   // plata skal ikke havne inni deg
    makeBox(L, { type: 'gel', kind: 'gel', id: `gel_${c.id}`, owner: c.id, material: 'gel', color: 0x8fd8ee, min: lo, max: hi, grip: true, gripDrain: P.gelWetDrain, gripSlide: P.gelSlide, wet: true, wetT: P.gelDry, parent: f.b });
    L.events.push({ type: 'use', tool: 'gel' });
    return true;
  }
  if (c.tool === 'roll') {                                       // rull ut et bånd som henger ned over kanten foran deg
    const gb = p.groundBox; if (!gb) return false;
    if (L.made.some((m) => m.owner === c.id && m.parent === gb)) return 'again';     // bandet henger allerede herfra: neste trykk slipper rullen
    const ax = Math.abs(p.fx) >= Math.abs(p.fz) ? 0 : 2, sgn = Math.sign(ax === 0 ? p.fx : p.fz) || 1, o = 2 - ax;
    const plane = sgn > 0 ? gb.max[ax] : gb.min[ax];
    if ((plane - (ax === 0 ? p.x : p.z)) * sgn > HW + 0.7) return false;     // ikke ved kanten
    const cen = o === 0 ? p.x : p.z, top = gb.max[1];
    const sx = ax === 0 ? plane + sgn * 0.06 : cen, sz = ax === 2 ? plane + sgn * 0.06 : cen;     // der bandet henger
    let floorY = -Infinity;                                       // hva bandet henger ned til
    for (const b of L.boxes) {
      if (b === gb || b.carried || b.type === 'wall' || b.dyn || b.owner) continue;
      if (sx < b.min[0] || sx > b.max[0] || sz < b.min[2] || sz > b.max[2]) continue;
      if (b.max[1] < top - 0.5 && b.max[1] > floorY) floorY = b.max[1];
    }
    if (floorY === -Infinity) floorY = 0;
    const y0 = Math.max(floorY, top - P.stripMax); if (top - y0 < 2) return false;
    for (const m of L.made) if (m.owner === c.id) { const i = L.boxes.indexOf(m); if (i >= 0) L.boxes.splice(i, 1); }
    L.made = L.made.filter((m) => m.owner !== c.id);
    const t = 0.12, lo = [0, y0, 0], hi = [0, top, 0];
    lo[o] = cen - P.stripW / 2; hi[o] = cen + P.stripW / 2;
    if (sgn > 0) { lo[ax] = plane; hi[ax] = plane + t; } else { lo[ax] = plane - t; hi[ax] = plane; }
    makeBox(L, { type: 'paper', kind: 'paper_strip', id: `bånd_${c.id}`, owner: c.id, material: 'paper', color: 0xfbfaf6, min: lo, max: hi, grip: true, gripDrain: -0.8, tear: P.stripTear, parent: gb });
    L.events.push({ type: 'use', tool: 'roll' });
    return true;
  }
  if (c.tool === 'needle') {                                     // nål + trådsnelle: træ nålen, snella er brukt opp
    const sp = findNear(p, L, (b) => b.thread); if (!sp) return false;
    removeBody(L, sp, 'used'); c.tool = 'zip'; c.threaded = true; c.zipA = null;
    L.events.push({ type: 'use', tool: 'thread' });
    return true;
  }
  if (c.tool === 'spool') {                                      // trådsnella i hånden, nålen på bakken: samme resultat, du ender med den trædde nålen i hånden
    const nd = findNear(p, L, (b) => b.tool === 'needle'); if (!nd) return false;
    removeBody(L, c, 'used'); p.carry = null;
    nd.tool = 'zip'; nd.threaded = true; nd.zipA = null; nd.carried = true; nd.vy = 0; p.carry = nd;
    L.events.push({ type: 'use', tool: 'thread' });
    return true;
  }
  if (c.tool === 'zip') return useZip(p, L, c);
  return false;
}

// Nærmeste ting (som ikke bæres) innen rekkevidde, uavhengig av retning.
function findNear(p, L, pred) {
  let best = null, bd = Infinity;
  for (const b of L.bodies || []) {
    if (!b.alive || b.carried || !pred(b)) continue;
    const dx = Math.max(b.min[0] - p.x, 0, p.x - b.max[0]), dz = Math.max(b.min[2] - p.z, 0, p.z - b.max[2]), d = Math.hypot(dx, dz);
    if (d > P.carryReach + 0.4 || b.max[1] < p.y - 0.3 || b.min[1] > p.y + H + 0.3) continue;
    if (d < bd) { bd = d; best = b; }
  }
  return best;
}

// ---- Taubane: den trædde nålen. Første TA fester tråden der du står, andre TA et lavere sted. Så henger du deg i øvre ende (GREP) og sklir ned. ----
function useZip(p, L, c) {
  const here = [p.x + p.fx * 0.35, p.y + H + 0.2, p.z + p.fz * 0.35];
  if (!c.zipA) { c.zipA = here; L.events.push({ type: 'use', tool: 'zipA' }); return true; }
  const a = c.zipA;
  if (Math.hypot(here[0] - a[0], here[2] - a[2]) < 1.2 && Math.abs(here[1] - a[1]) < 0.5) { c.zipA = null; return 'again'; }   // samme sted igjen: angre og legg fra deg nålen
  const [hi, lo] = a[1] >= here[1] ? [a, here] : [here, a];
  const len = Math.hypot(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]);
  if (hi[1] - lo[1] < P.zipMinDrop) return 'zip-flat';
  if (len > P.zipMax) return 'zip-far';
  for (let t = 1.6 / len; t < 1 - 0.9 / len; t += 0.4 / len) {      // plass til en hengende figur langs hele tråden
    const x = hi[0] + (lo[0] - hi[0]) * t, y = hi[1] + (lo[1] - hi[1]) * t, z = hi[2] + (lo[2] - hi[2]) * t;
    for (const b of L.boxes) if (b !== c && !b.carried && b.type !== 'wall' && overlaps(b, x, y - H, z) && (b.type !== 'floor' || y - H < 0)) return 'zip-blocked';
  }
  L.zips = (L.zips || []).filter((z) => z.owner !== c.id);
  L.zips.push({ id: `tråd_${c.id}`, owner: c.id, a: hi, b: lo, len });
  c.zipA = null;
  L.events.push({ type: 'use', tool: 'zip' });
  dropCarry(p, L);
  return true;
}

// GREP ved øvre ende av en tråd: heng deg i den.
export function zipNear(p, L) {
  if (p.carry || p.state === 'zip') return null;
  for (const z of L.zips || []) if (Math.hypot(p.x - z.a[0], p.z - z.a[2]) <= P.zipReach && Math.abs(p.y + H - z.a[1]) <= 1.4) return z;
  return null;
}
function tryZip(p, L) {
  const z = zipNear(p, L); if (!z || p.cd > 0) return false;
  p.state = 'zip'; p.zip = { z, s: 0, v: P.zipV0 };
  p.x = z.a[0]; p.z = z.a[2]; p.y = z.a[1] - H; p.vx = p.vy = p.vz = 0; p.onGround = false; p.climb = null; p.hang = null; p.rope = null; p.groundBox = null; p.jumping = false;
  const h = Math.hypot(z.b[0] - z.a[0], z.b[2] - z.a[2]) || 1; p.fx = (z.b[0] - z.a[0]) / h; p.fz = (z.b[2] - z.a[2]) / h;
  return true;
}
function zipStep(p, inp, dt, L) {
  const k = p.zip, z = k.z, dx = (z.b[0] - z.a[0]) / z.len, dy = (z.b[1] - z.a[1]) / z.len, dz = (z.b[2] - z.a[2]) / z.len;
  k.v = Math.min(P.zipVmax, k.v + P.zipAcc * dt); k.s = Math.min(z.len, k.s + k.v * dt);
  p.x = z.a[0] + dx * k.s; p.z = z.a[2] + dz * k.s; p.y = z.a[1] + dy * k.s - H;
  p.vx = dx * k.v; p.vz = dz * k.v; p.vy = dy * k.v;
  if (!(L.zips || []).includes(z)) { p.state = 'air'; p.zip = null; p.cd = 0.3; return; }
  if (k.s >= z.len || inp.jumpPressed) {                              // ende på tråden, eller du slipper deg selv
    const early = k.s < z.len;
    p.state = 'air'; p.zip = null; p.cd = 0.3; p.jumps = Math.min(1, P.airJumps); p.buffer = 0; p.onGround = false;
    p.vx = dx * k.v * (early ? 0.8 : 0.45); p.vz = dz * k.v * (early ? 0.8 : 0.45); p.vy = early ? P.jump * 0.5 : -1;
  }
}

export function dropCarry(p, L) {
  const b = p.carry; if (!b) return;
  if (b.tool) {                                                   // verktøy settes ned bak eller ved siden av deg, ikke mellom deg og det du jobber mot
    const sx = b.max[0] - b.min[0], sy = b.max[1] - b.min[1], sz = b.max[2] - b.min[2], r = HW + Math.max(sx, sz) / 2 + 0.1;
    for (const [dx, dz] of [[-p.fx, -p.fz], [-p.fz, p.fx], [p.fz, -p.fx]]) {
      const cx = p.x + dx * r, cz = p.z + dz * r, lo = [cx - sx / 2, p.y + 0.02, cz - sz / 2], hi = [cx + sx / 2, p.y + 0.02 + sy, cz + sz / 2];
      if (!L.boxes.some((o) => o !== b && !o.carried && boxOverlap({ min: lo, max: hi }, o))) { b.carried = false; p.carry = null; b.vy = 0; b.min = lo; b.max = hi; return; }
    }
  }
  const spot = findPlaceSpot(p, L);
  b.carried = false; p.carry = null; b.vy = 0;
  if (spot) { b.min = spot.min; b.max = spot.max; return; }
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
  let sx = b.max[0] - b.min[0], sy = b.max[1] - b.min[1], sz = b.max[2] - b.min[2];
  if (b.pole) { const along = Math.abs(p.fx) >= Math.abs(p.fz); const L = Math.max(sx, sz), t = Math.min(sx, sz); sx = along ? L : t; sz = along ? t : L; }   // staven peker fremover
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

const wrapAngle = (a) => ((a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;

// Skrittlengde ved en gitt fart: tilsvarer en naturlig frekvens (skritt/s vokser med farten).
export function stepLength(speed) {
  return Math.max(P.stepMin, speed / (P.cadence0 + P.cadenceK * speed));
}

// Avsparkfart: vanlig hopp, eller stavhopp når du løper med en stav (farten gjøres om til høyde).
function launchVy(p) {
  const b = p.carry, sp = Math.max(Math.hypot(p.vx, p.vz), p.jumpSp || 0);   // farten du hadde før forberedelsen (hurken bremser)
  p.jumpSp = 0; p.vaulting = false;
  if (b?.pole && sp >= P.vaultMin * P.speed) {
    const hv = P.vaultH * (b.pole / 1.5) * (0.45 + 0.55 * Math.min(1, sp / P.speed));
    const vy = Math.sqrt(2 * -P.gravity * hv);
    if (vy > P.jump) { p.vaulting = true; return vy; }
  }
  return P.jump;
}

function boostJump(p) {                                       // løpehopp går lengre enn stående hopp
  const sp = Math.hypot(p.vx, p.vz);
  if (P.jumpBoost > 1 && sp > 0.5) { p.vx *= P.jumpBoost; p.vz *= P.jumpBoost; }
}

// Nærmeste grep-flate eller kant foran deg innenfor rekkevidde (til REKK UT-snapping og til «hånden rekker ut»-animasjonen).
export function findReachTarget(p, L, extra = 0) {
  if (p.carry) return null;
  const ax = Math.abs(p.fx) >= Math.abs(p.fz) ? 0 : 2, sgn = Math.sign(ax === 0 ? p.fx : p.fz) || 1, o = 2 - ax;
  const pa = ax === 0 ? p.x : p.z, po = ax === 0 ? p.z : p.x;
  let best = null;
  for (const b of L.boxes) {
    if (b.carried || b === p.carry || b.dyn || b.type === 'floor') continue;
    if (po < b.min[o] - 0.05 || po > b.max[o] + 0.05) continue;
    const gap = ((sgn > 0 ? b.min[ax] : b.max[ax]) - pa) * sgn - HW;
    if (gap < 0.02 || gap > P.reachSnap + extra) continue;           // allerede inntil (da finnes vanlig treff), eller for langt unna
    let kind = null;
    if (b.grip && p.y + H >= b.min[1] && p.y <= b.max[1]) kind = 'grip';
    else { const dh = b.max[1] - (p.y + H); if (!p.onGround && dh <= P.ledgeAbove + P.reachAbove && dh >= -P.ledgeBelow && b.min[1] <= p.y + H) kind = 'ledge'; }
    if (kind && (!best || gap < best.gap - 1e-6 || (Math.abs(gap - best.gap) < 1e-6 && kind === 'grip'))) best = { b, kind, gap, ax, sgn };
  }
  return best;
}
function reachSnap(p, L) {
  const t = findReachTarget(p, L); if (!t) return null;
  const old = ax0(p, t.ax);
  if (t.ax === 0) p.x += t.sgn * t.gap; else p.z += t.sgn * t.gap;
  for (const o of L.boxes) if (o !== t.b && o !== p.carry && !o.carried && overlaps(o, p.x, p.y, p.z)) { if (t.ax === 0) p.x = old; else p.z = old; return null; }   // noe står i veien
  return { box: t.b, nx: t.ax === 0 ? -t.sgn : 0, nz: t.ax === 2 ? -t.sgn : 0, snapped: true };
}
const ax0 = (p, ax) => (ax === 0 ? p.x : p.z);

function approach(v, target, d) {
  if (v < target) return Math.min(v + d, target);
  return Math.max(v - d, target);
}

// inp: { mx, mz (-1..1, verdensretning), jumpPressed, jumpHeld, grabPressed, grabHeld }
export function step(p, inp, dt, L) {
  carryControl(p, inp, dt, L);
  if (inp.jumpPressed) p.buffer = Math.max(P.jumpBuffer, p.recover > 0 ? p.recover + 0.06 : 0);
  if (inp.grabPressed && p.reachCd <= 0) { p.reach = P.reachTime; p.reachCd = P.reachTime + P.reachCooldown; }
  if (dt <= 1e-6) return;
  const n = Math.max(1, Math.ceil(dt / SUBSTEP - 1e-6)), h = dt / n;      // like lange delsteg (en kort rest på <1 ms ga ikke nok fall til å oppdage gulvet → flimmer mellom «står» og «luft»)
  for (let i = 0; i < n; i++) sub(p, inp, h, L);
}

function sub(p, inp, dt, L) {
  p.t += dt;
  p.cd = Math.max(0, p.cd - dt);
  p.lock = Math.max(0, p.lock - dt);
  p.buffer -= dt; p.coyote -= dt; p.wallT -= dt;
  p.reach = Math.max(0, p.reach - dt); p.reachCd = Math.max(0, p.reachCd - dt);
  p.recover = Math.max(0, p.recover - dt); p.toolWarn = Math.max(0, p.toolWarn - dt);
  p.landT += dt; p.pushT = Math.max(0, p.pushT - dt); p.airT = p.onGround ? 0 : p.airT + dt;

  let wx = inp.mx, wz = inp.mz;
  const wl = Math.hypot(wx, wz);
  if (wl > 1) { wx /= wl; wz /= wl; }

  if (L.bodies?.length) stepBodies(L, p, dt);
  for (const m of L.made || []) if (m.wet) { m.wetT -= dt; if (m.wetT <= 0) { m.wet = false; m.gripDrain = 0.15; m.gripSlide = 0; } }   // gelen tørker til et fast grep

  if (p.state !== 'climb') p.stam = Math.min(P.stamina, p.stam + (p.onGround ? P.staminaRegen * dt : 0));
  if (p.state === 'climb') return climbStep(p, inp, wx, wz, dt, L);
  if (p.state === 'mantle') return mantleStep(p, dt);
  if (p.state === 'hang') return hangStep(p, wx, wz);
  if (p.state === 'swing') return swingStep(p, inp, wx, wz, dt);
  if (p.state === 'zip') return zipStep(p, inp, dt, L);
  if (inp.grabPressed && L.zips?.length && tryZip(p, L)) return;

  let handled = false;
  if (P.gaitMode && p.onGround && !p.groundBox?.slick && p.lock <= 0) {
    // Gange med skritt: fart bare langs blikkretningen, kroppen snur gradvis, skrittet fullføres før du stopper.
    handled = true;
    const hasIn = wl > (p.hadIn ? 0.12 : 0.3);               // hysterese: en tommel som hviler på stikken skal ikke gi mikroskritt
    p.hadIn = hasIn;
    let s = p.vx * p.fx + p.vz * p.fz;                           // fart langs blikkretningen
    let target = 0, diff = 0;
    if (hasIn) {
      const fa = Math.atan2(p.fx, p.fz);
      diff = wrapAngle(Math.atan2(wx, wz) - fa);
      const rate = P.turnRate * (1 - 0.55 * Math.min(1, Math.abs(s) / P.speed)) * (Math.abs(diff) > 1.6 && s > 1.2 ? 0.15 : 1);   // snu 180° i fart: bremse først, så snu
      const fa2 = fa + Math.max(-rate * dt, Math.min(rate * dt, diff));
      p.fx = Math.sin(fa2); p.fz = Math.cos(fa2);
      const aligned = Math.abs(diff) < 0.9 || Math.abs(s) > 1.2;   // snu først hvis du står stille og input er langt fra blikket
      const speedCap = P.speed * (p.carry ? P.carrySpeed : 1) * (inp.walk ? P.walkFactor : 1) * (p.recover > 0 ? P.landSlow : 1) * (p.windup > 0 ? 0.6 : 1);
      target = aligned ? speedCap * Math.min(1, wl) * Math.max(0, Math.cos(diff)) : 0;
    }
    p.skid = hasIn && s > 1.8 && Math.abs(diff) > 1.8;
    let a = !hasIn ? P.decel : target < s ? (Math.abs(diff) > 1.6 ? P.turnDecel : P.decel) : P.accel;
    if (target < 0.05 && s > 0 && s < 2.6) {                     // stopp bare ved skrittgrensen: fullfør skrittet
      const rem = (Math.PI - (p.gait % Math.PI)) % Math.PI;       // rad til neste grense
      if (rem < 0.04 || rem > Math.PI - 0.04) { s = 0; p.gait = Math.round(p.gait / Math.PI) * Math.PI; }
      else { target = Math.max(P.creep, Math.min(s, Math.sqrt(2 * P.decel * (rem / Math.PI) * p.stepLen))); a = P.decel * 3; }
    }
    if (s !== 0 || target > 0) s += Math.max(-a * dt, Math.min(a * dt, target - s));
    p.vx = p.fx * s; p.vz = p.fz * s;
  }
  if (!handled) {
  const speed0 = Math.hypot(p.vx, p.vz);
    const rev = wl > 0.1 && speed0 > 0.1 && (p.vx * wx + p.vz * wz) / (speed0 * Math.hypot(wx, wz)) < -0.5;   // du styrer mot bevegelsen
    p.skid = p.onGround && rev && speed0 > 2;
    // blikkretningen følger inputen først når du faktisk er på vei den veien (ikke mens du sklir motsatt)
    if (P.gaitMode && !p.onGround) { if (speed0 > 0.5) { p.fx = p.vx / speed0; p.fz = p.vz / speed0; } }   // i lufta: blikk = fartsretning
    else if (wl > 0.1 && p.lock <= 0 && (!rev || speed0 < 1.5)) { p.fx = wx / wl; p.fz = wz / wl; }
  
    if (p.lock <= 0) {
      let a;
      if (!p.onGround) a = P.airAccel;
      else if (p.groundBox?.slick) a = P.slickAccel;
      else if (wl < 0.1) a = P.decel;
      else a = rev ? P.turnDecel : P.accel;
      let sp = P.speed * (p.carry ? P.carrySpeed : 1) * (inp.walk ? P.walkFactor : 1) * (p.recover > 0 ? P.landSlow : 1) * (p.windup > 0 ? 0.6 : 1);
      if (P.gaitMode && !p.onGround) sp = Math.max(P.speed * P.jumpBoost, speed0);   // løpehopp: behold farten i lufta
      const tx = wx * sp, tz = wz * sp, dx = tx - p.vx, dz = tz - p.vz, dl = Math.hypot(dx, dz), m = a * dt;
      if (dl <= m) { p.vx = tx; p.vz = tz; } else { p.vx += dx / dl * m; p.vz += dz / dl * m; }   // som vektor: gir buer, ikke akse-hopp
    }
  }

  p.vy = Math.max(P.maxFall, p.vy + P.gravity * dt);
  const pushWall = p.wallT > 0 && p.wallN && (wx * p.wallN.nx + wz * p.wallN.nz) < -0.3;
  p.sliding = !p.onGround && !!pushWall && p.vy < P.slide;
  if (p.sliding) p.vy = P.slide;

  if (p.onGround) { p.coyote = P.coyote; p.jumps = P.airJumps; }

  if (p.windup > 0) {                                      // forberedelse (hurk) før avsparket
    p.windup -= dt;
    if (p.windup <= 0) { p.windup = 0; p.vy = launchVy(p); p.jumping = true; p.onGround = false; boostJump(p); }
  }
  if (p.buffer > 0) {
    if (p.coyote > 0) {
      if (p.recover > 0 || p.windup > 0) { /* i hurk: ikke hopp ennå (hoppet blir stående i bufferen) */ }
      else if (P.jumpWindup > 0) { p.windup = P.jumpWindup; p.jumpSp = Math.hypot(p.vx, p.vz); p.coyote = 0; p.buffer = 0; }
      else { p.vy = launchVy(p); p.coyote = 0; p.buffer = 0; p.onGround = false; p.jumping = true; boostJump(p); }
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

  const wasGrounded = p.onGround, vyBefore = p.vy, px0 = p.x, pz0 = p.z;
  p.onGround = false; p.groundBox = null;
  const hx = moveX(p, p.vx * dt, L);
  const hz = moveZ(p, p.vz * dt, L);
  moveY(p, p.vy * dt, L);
  const hit = hx || hz;
  if (hit) { p.wallN = { nx: hit.nx, nz: hit.nz }; p.wallT = 0.12; }

  if (P.gaitMode && p.onGround) {                              // fasen følger tilbakelagt distanse, så foten kan stå fast i gulvet
    const spd = Math.hypot(p.vx, p.vz);
    p.stepLen = stepLength(spd);
    p.gait = (p.gait + Math.PI * Math.hypot(p.x - px0, p.z - pz0) / p.stepLen) % (Math.PI * 2);
    if (spd < 0.01 && wl < 0.1) p.gait = Math.round(p.gait / Math.PI) * Math.PI % (Math.PI * 2);
  }
  if (!wasGrounded && p.onGround && vyBefore < -3) {
    const eff = -vyBefore * (p.groundBox?.soft ? P.softFactor : 1);          // myke flater tar av for fallet
    p.landImpact = eff; p.landT = 0; p.vaulting = false;
    if (P.landK > 0 && eff > P.landMin) p.recover = Math.min(P.landMax, (eff - P.landMin) * P.landK);
    if (eff >= P.knockV) p.knockout = true;                                   // for hardt: tilbake til lagringspunktet
    else if (eff >= P.hardLand) { p.recover = Math.max(p.recover, P.stunTime); p.hardLands++; }   // bedøvet en stund
  }

  updateCarried(p, L);

  const hit2 = hit || (p.reach > 0 && p.cd <= 0 && p.state !== 'climb' ? reachSnap(p, L) : null);                 // REKK UT griper det som er innenfor rekkevidde
  if (hit2?.box.grip && p.reach > 0 && p.state !== 'climb' && (hit2.snapped || (wx * hit2.nx + wz * hit2.nz) < -0.3) && tryClimb(p, hit2)) { /* festet seg på en grep-flate */ }
  else if (p.onGround) p.state = 'ground';
  else {
    p.state = 'air';
    if (hit2 && p.vy <= 2 && p.cd <= 0 && (P.autoGrab || p.reach > 0) && (hit2.snapped || (wx * hit2.nx + wz * hit2.nz) < -0.3)) tryLedge(p, hit2, L);
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
  if (d < 0 && !p.onGround) {                                  // gulvet rett under føttene (innenfor 0,3 mm) teller som kontakt, uansett hvor kort delsteget er
    for (const b of L.boxes) {
      if (b === p.carry || !overlaps(b, p.x, p.y - 3e-4, p.z)) continue;
      p.y = b.max[1]; p.onGround = true; p.groundBox = b; p.vy = 0;
    }
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

// ---- Klatring på grep-flater (håndkle, knotter, kabel …) --------------------------
function tryClimb(p, hit) {
  const b = hit.box;
  if (p.carry || p.stam < 0.3) return false;
  p.state = 'climb'; p.climb = { box: b, nx: hit.nx, nz: hit.nz };
  p.vx = p.vy = p.vz = 0; p.jumping = false; p.reach = 0; p.onGround = false;
  p.fx = -hit.nx; p.fz = -hit.nz;
  if (hit.nx) p.x = hit.nx > 0 ? b.max[0] + HW : b.min[0] - HW;
  if (hit.nz) p.z = hit.nz > 0 ? b.max[2] + HW : b.min[2] - HW;
  return true;
}
function leaveClimb(p, vx, vz, vy, cd) {
  p.state = 'air'; p.climb = null; p.exhaust = 0; p.vx = vx; p.vz = vz; p.vy = vy; p.cd = cd; p.onGround = false;
}
function climbStep(p, inp, wx, wz, dt, L) {
  if (p.exhaust > 0) {                                               // tom for krefter: du glir ned langs flaten en kort stund, så slipper du
    const c = p.climb; p.exhaust -= dt; p.climbMove = 0;
    p.onGround = false; moveY(p, -P.exhaustSlide * dt, L);
    if (p.onGround) { p.state = 'ground'; p.climb = null; p.vy = 0; p.exhaust = 0; return; }
    if (p.exhaust <= 0) { p.exhaust = 0; return leaveClimb(p, c.nx * 1.2, c.nz * 1.2, 0, 0.6); }
    return;
  }
  const c = p.climb, b = c.box, clampN = (v, a, z) => Math.max(a, Math.min(z, v));
  if (!b || L.boxes.indexOf(b) < 0) return leaveClimb(p, 0, 0, 0, 0.2);
  const into = -(wx * c.nx + wz * c.nz);                          // mot flaten = opp, bort = ned
  const tx = -c.nz, tz = c.nx, side = wx * tx + wz * tz;           // langs flaten
  if (p.buffer > 0) {                                              // hopp: spark deg løs fra flaten
    p.buffer = 0; p.jumps = Math.min(1, P.airJumps); p.jumping = true; p.lock = P.wallLock;
    return leaveClimb(p, c.nx * P.wallKick * 0.7, c.nz * P.wallKick * 0.7, P.wallUp * 0.9, 0.3);
  }
  const vy = into > 0.25 ? P.climbUp * Math.min(1, into) : into < -0.25 ? -P.climbDown * Math.min(1, -into) : 0;
  const vs = Math.abs(side) > 0.25 ? P.climbSide * Math.min(1, side * 1.0) : 0;
  if (b.tear !== undefined) {                                        // papirbånd: tåler et tak en stund, så revner det
    b.tear -= dt;
    if (b.tear <= 0) { const i = L.boxes.indexOf(b); if (i >= 0) L.boxes.splice(i, 1); L.made = (L.made || []).filter((m) => m !== b); L.events.push({ type: 'tore', id: b.id }); return leaveClimb(p, c.nx * 0.8, c.nz * 0.8, 0, 0.5); }
  }
  p.stam -= dt * Math.max(0.1, 1 + (vy > 0 ? 0.5 : 0) + (vs ? 0.3 : 0) + (b.gripDrain || 0));
  if (p.stam <= 0) { p.stam = 0; p.exhaust = P.exhaustT; (L.events ||= []).push({ type: 'exhausted' }); return climbStep(p, inp, wx, wz, dt, L); }   // armene gir etter: kontrollert skli før du slipper
  if (vs) {
    const ox = p.x, oz = p.z;
    p.x += tx * vs * dt; p.z += tz * vs * dt;
    if (c.nx) { p.z = clampN(p.z, b.min[2] + 0.15, b.max[2] - 0.15); p.x = c.nx > 0 ? b.max[0] + HW : b.min[0] - HW; }
    else { p.x = clampN(p.x, b.min[0] + 0.15, b.max[0] - 0.15); p.z = c.nz > 0 ? b.max[2] + HW : b.min[2] - HW; }
    for (const o of L.boxes) if (o !== b && o !== p.carry && overlaps(o, p.x, p.y, p.z)) { p.x = ox; p.z = oz; break; }
  }
  if (!vy && b.gripSlide) { p.onGround = false; moveY(p, -b.gripSlide * dt, L); if (p.onGround) { p.state = 'ground'; p.climb = null; p.vy = 0; return; } }   // vått gel: du sklir sakte
  p.climbMove = Math.hypot(vy, vs); p.climbPh += p.climbMove * dt * 2.6;
  if (vy) {
    p.onGround = false; moveY(p, vy * dt, L);
    if (p.onGround) { p.state = 'ground'; p.climb = null; p.vy = 0; return; }       // ned til bakken
  }
  if (p.y + H < b.min[1] + 0.2) return leaveClimb(p, c.nx * 0.5, c.nz * 0.5, 0, 0.3);   // under nederste grep
  if (into > 0.25 && p.y + H >= b.max[1] - 0.05) {                                    // helt opp: hiv deg over kanten
    if (tryLedge(p, { box: b.parent || (b.onto && L.boxes.find((x) => x.id === b.onto)) || b, nx: c.nx, nz: c.nz }, L)) { p.climb = null; return; }   // gel/bånd: kanten er veggen bak
    p.y = Math.min(p.y, b.max[1] - H);
  }
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
