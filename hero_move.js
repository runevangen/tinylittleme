// Figurens bevegelse (R40): ren logikk uten three.js, så den kan testes.
//  - createTurnSteps: snu på stedet med små skritt (diskrete skritt, annenhver fot) når stikka snur raskt mens han står
//  - canStepOver / effectiveStepUp / createStepOver: tråkke over små hindre (pose/fot-IK; selve trinnet gjør physics.js stepOver)
//  - gripPose: poser for heng (hender som tar tak, tråkker sidelengs), veggglid og sving (vekt og holdning følger fart)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (x) => x * x * (3 - 2 * x);

export const MOVE = {
  turnThr: 1.6,       // rad/s: så fort må han snu for at skrittene starter
  turnStopThr: 0.8,   // under dette starter ingen nye skritt
  turnDur: 0.24,      // s per skritt
  turnLift: 0.055,    // fotløft (rigenheter)
  turnSpread: 0.2,    // fotens sidesving (hoftens z-rotasjon, rad)
  turnTwist: 0.07,    // overkroppen vrir seg mot skrittet
  standSpeed: 0.35,   // over dette regnes han ikke som stående
  stepMin: 0.02,      // trinn lavere enn dette er gulvujevnhet
  stepOverMax: 0.15,  // høyeste hinder han tråkker over uten hopp (enheter), uavhengig av hjelpenivå
  stepDur: 0.26,      // s: føttene løftes over hinderet
};

// ---- snu på stedet ----
export function createTurnSteps(cfg = MOVE) {
  const s = { t: 0, active: false, foot: 1, dir: 0, steps: 0 };
  const out = { active: false, stepped: false, foot: 0, dir: 0, liftL: 0, liftR: 0, spreadL: 0, spreadR: 0, twist: 0, steps: 0 };
  return {
    out, state: s,
    update(dt, { yawRate = 0, standing = false, on = true } = {}) {
      out.stepped = false;
      const ar = Math.abs(yawRate);
      if (!on || !standing) { s.active = false; s.t = 0; }
      else if (!s.active && ar >= cfg.turnThr) { s.active = true; s.t = 0; s.foot = 1 - s.foot; s.dir = Math.sign(yawRate); s.steps++; out.stepped = true; }
      if (s.active) { s.t += dt; if (s.t >= cfg.turnDur) { s.t = 0; s.active = ar >= cfg.turnStopThr && standing && on; if (s.active) { s.foot = 1 - s.foot; s.dir = Math.sign(yawRate) || s.dir; s.steps++; out.stepped = true; } } }
      const u = s.active ? clamp(s.t / cfg.turnDur, 0, 1) : 0, a = Math.sin(u * Math.PI);
      const L = s.active && s.foot === 0, R = s.active && s.foot === 1;
      out.active = s.active; out.foot = s.foot; out.dir = s.active ? s.dir : 0; out.steps = s.steps;
      out.liftL = L ? cfg.turnLift * a : 0; out.liftR = R ? cfg.turnLift * a : 0;
      out.spreadL = L ? s.dir * cfg.turnSpread * a : 0; out.spreadR = R ? s.dir * cfg.turnSpread * a : 0;
      out.twist = s.active ? -s.dir * cfg.turnTwist * a : 0;
      return out;
    },
  };
}

// ---- tråkke over små hindre ----
// Kan et trinn på dy (enheter) tas uten hopp? Samme grense som physics.js stepOver (dy over 0.02 og høyst grensen).
export const canStepOver = (dy, limit = MOVE.stepOverMax) => Number.isFinite(dy) && limit > 0 && dy > MOVE.stepMin && dy <= limit;
// physics.js sin P.stepUp: hjelpenivået (preset/«mye hjelp») og den lille tråkkegrensen; 0 på «ingen hjelp»
export const effectiveStepUp = (helpStepUp, small, helpOn = true) => (helpOn ? Math.max(helpStepUp || 0, small || 0) : (helpStepUp || 0));

export function createStepOver(cfg = MOVE) {
  const s = { t: 0, dy: 0, on: false, foot: 1, count: 0 };
  const out = { active: false, foot: 0, lift: 0, knee: 0, lean: 0, started: false };
  return {
    out, state: s,
    trigger(dy, limit = cfg.stepOverMax) {
      if (!canStepOver(dy, limit)) return false;
      s.on = true; s.t = 0; s.dy = Math.min(dy, limit); s.foot = 1 - s.foot; s.count++; out.started = true; return true;
    },
    update(dt) {
      const started = out.started; out.started = false;
      if (!s.on) { Object.assign(out, { active: false, lift: 0, knee: 0, lean: 0 }); return out; }
      s.t += dt; const u = clamp(s.t / cfg.stepDur, 0, 1);
      if (u >= 1) { s.on = false; Object.assign(out, { active: false, lift: 0, knee: 0, lean: 0 }); return out; }
      const a = Math.sin(u * Math.PI);
      out.active = true; out.foot = s.foot; out.started = started;
      out.lift = (s.dy + 0.035) * a;       // foten går litt over kanten
      out.knee = 0.5 * a; out.lean = 0.06 * a;
      return out;
    },
  };
}

// ---- heng, veggglid og sving: poser (verdier som legges oppå T i poseHero) ----
// kind: 'hang' | 'slide' | 'swing'. o: { sec, speed (fart langs kanten/svingen), signed (fart fremover, for sving), tired (0..1), vy }
export function gripPose(kind, o = {}) {
  const { sec = 0, speed = 0, signed = 0, tired = 0, vy = 0 } = o;
  const m = clamp(speed / 1.5, 0, 1);
  if (kind === 'hang') {
    // tråkker sidelengs i kanten: hendene tar tak én og én; trett: albuene bøyes, bena sparker etter fotfeste
    const ph = sec * 5.5, a = Math.max(0, Math.sin(ph)), b = Math.max(0, -Math.sin(ph)), k = clamp(signed / 2, -1, 1);
    return {
      aL: -3.05 + 0.32 * m * a, aR: -3.05 + 0.32 * m * b,
      eL: -0.12 - 0.55 * tired - 0.3 * m * b, eR: -0.12 - 0.55 * tired - 0.3 * m * a,
      zL: 0.12 + 0.1 * m * a, zR: -0.12 - 0.1 * m * b,
      kL: 0.3 + 0.35 * tired + 0.3 * m, kR: 0.15 + 0.35 * tired + 0.3 * m + 0.3 * tired * Math.sin(sec * 9),
      roll: -0.12 * k, twist: 0.08 * k * m, chest: -0.05 - 0.1 * tired, hp: -0.2 - 0.15 * tired,
      fgL: 1.3, fgR: 1.3,
    };
  }
  if (kind === 'slide') {
    // veggglid: begge armene opp mot veggen, hendene skraper vekselvis, knærne bøyd mot veggen, hodet ser opp
    const sc = Math.sin(sec * 16), f = clamp(-vy / 6, 0, 1);
    return {
      aL: -2.75 + 0.14 * sc, aR: -2.75 - 0.14 * sc, eL: -0.2 - 0.25 * f, eR: -0.2 - 0.25 * f, zL: 0.22, zR: -0.22,
      hL: -0.35, hR: -0.15, kL: 0.7 + 0.2 * f, kR: 0.95 + 0.2 * f, lean: 0.12 + 0.08 * f, chest: 0.08, hp: -0.3,
      twist: 0.05 * sc * f, roll: 0.02 * sc, fgL: 0.9, fgR: 0.9,
    };
  }
  // sving: bena slenger fremover når han svinger fremover og bakover ved retur, kroppen lener med farten, armene strammes i ytterpunktet
  const k = clamp(signed * 0.1, -0.8, 0.8);
  return {
    hL: -0.9 * k - 0.1, hR: -0.7 * k, kL: 0.3 + 0.5 * Math.abs(k), kR: 0.45 + 0.6 * Math.abs(k),
    eL: -0.1 - 0.3 * Math.abs(k), eR: -0.1 - 0.3 * Math.abs(k), lean: -0.3 * k, chest: -0.1 * k - 0.04 * Math.abs(k), hp: -0.15 - 0.1 * Math.abs(k),
    roll: -0.06 * k, fgL: 1.3, fgR: 1.3,
  };
}
export { smooth };
