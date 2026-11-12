// R18: små stemmer i rommet. Ren logikk (ingen three.js) for leker som lever og reagerer: tennisball som piper og ruller videre,
// leketøysbil som tuter, vippehest som gynger, wind-up-robot som går noen skritt og stopper, og sprettboks (jack-in-the-box).
// Alt bygger på de vanlige flyttbare tingene (`movables` → `L.bodies`): ingen ny kollisjonsmodell. Utløses med det spilleren allerede kan:
// dytte (stikka), lande på (HOPP) og ta/slippe (TA). Tegning og animasjon ligger i toys_view.js, lyden i audio.js.

export const TOY_KINDS = ['tennisball', 'rockinghorse', 'windup', 'jackbox', 'toycar'];
export const ROUND_KINDS = ['ball', 'tennisball'];            // kuleformede: ekte kulekollisjon i fysikken
export const TOY = {
  rollK: 0.85,        // hvor mye av dyttet som blir til rulling videre (0 = ingen)
  rollMin: 1.2,       // enheter/s: roligere dytt gjør ingenting
  rollMax: 6,         // tak på rullefarten
  squeakCool: 0.6,    // sekunder mellom hver pip / tut
  honkCool: 1.3,
  rockT: 1.8,         // vippehesten gynger så lenge
  popT: 1.3,          // sprettboksen står oppe så lenge
  windT: 2.6,         // wind-up-roboten går så lenge (sekunder)
  windSpeed: 2.0,     // enheter/s
  tickEvery: 0.26,    // sekunder mellom hver «tikk» når den går
  stuckT: 0.5,        // står den fast så lenge, stopper den
};
// Hvilken lyd og lydtekst hver handling har (audio.js har lydene; lydteksten vises i main.js når «Lydtekst» er på)
export const TOY_SOUND = { squeak: 'squeak', honk: 'honk', rock: 'creak', pop: 'boing', wind: 'tick', tick: 'tick', go: 'tick', stop: 'tick' };
export const TOY_CUE = { squeak: 'pip!', honk: 'tut tut', rock: 'knirk knirk', pop: 'boing!', wind: 'tikk tikk (trekkes opp)', go: 'tikk tikk tikk', stop: 'klikk' };

export const isToy = (b) => !!b && TOY_KINDS.includes(b.kind);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ctr = (b) => [(b.min[0] + b.max[0]) / 2, (b.min[2] + b.max[2]) / 2];

// Tilstand for alle leker i brettet. `S.on` skrur hele greia av og på (innstilling).
export function createToyLife(L) {
  const S = { on: true, toys: new Map(), prevGround: null, prevOnGround: true, prevVy: 0, count: 0 };
  for (const b of L.bodies || []) if (isToy(b)) {
    const [x, z] = ctr(b);
    S.toys.set(b.id, { b, kind: b.kind, x, z, wasCarried: false, cool: 0, rock: 0, ph: 0, pop: 0, wind: 0, tickT: 0, stuck: 0, dir: [0, 1], rx: 0, rz: 0, speed: 0, vy: 0 });
  }
  return S;
}
export function resetToys(S) {
  for (const t of S.toys.values()) { const [x, z] = ctr(t.b); Object.assign(t, { x, z, wasCarried: false, cool: 0, rock: 0, ph: 0, pop: 0, wind: 0, tickT: 0, stuck: 0, speed: 0 }); }
  S.prevGround = null; S.prevOnGround = true; S.prevVy = 0;
}

const hasCooled = (t, c) => { if (t.cool > 0) return false; t.cool = c; return true; };

// Ett bilde. Returnerer hendelser { type: 'toy', id, kind, act, amp } der act er squeak | honk | rock | pop | wind | tick | go | stop.
export function stepToys(S, L, p, dt) {
  const ev = [];
  if (!S.on || !(dt > 0)) { S.prevGround = p.groundBox || null; S.prevOnGround = !!p.onGround; S.prevVy = p.vy || 0; return ev; }
  const landed = !S.prevOnGround && p.onGround && p.groundBox;
  const impact = clamp(-S.prevVy / 14, 0.25, 1);
  for (const t of S.toys.values()) {
    const b = t.b, [x, z] = ctr(b), out = (act, amp = 1) => ev.push({ type: 'toy', id: b.id, kind: t.kind, act, amp });
    t.cool = Math.max(0, t.cool - dt);
    t.rock = Math.max(0, t.rock - dt); t.pop = Math.max(0, t.pop - dt);
    if (t.rock > 0) t.ph += dt * 9;
    if (!b.alive) { t.x = x; t.z = z; t.wasCarried = false; t.wind = 0; continue; }
    // plukket opp (TA) / sluppet
    if (b.carried && !t.wasCarried) {
      t.wind = 0;
      if (t.kind === 'jackbox') { t.pop = TOY.popT; out('pop'); }
      else if (t.kind === 'toycar') { if (hasCooled(t, TOY.honkCool)) out('honk'); }
      else if (t.kind === 'tennisball') { if (hasCooled(t, TOY.squeakCool)) out('squeak'); }
      else if (t.kind === 'windup') out('wind');
      else if (t.kind === 'rockinghorse') { t.rock = TOY.rockT * 0.5; out('rock', 0.5); }
    }
    if (!b.carried && t.wasCarried && t.kind === 'windup') {          // sluppet: går i den retningen du så
      const fx = p.fx || 0, fz = p.fz || 0, l = Math.hypot(fx, fz); t.dir = l > 1e-6 ? [fx / l, fz / l] : [0, 1];
      t.wind = TOY.windT; t.tickT = 0; t.stuck = 0; out('go');
    }
    t.wasCarried = !!b.carried;
    if (b.carried) { t.x = x; t.z = z; continue; }
    // landet på toppen (HOPP)
    if (landed && p.groundBox === b) {
      if (t.kind === 'rockinghorse') { t.rock = TOY.rockT; t.ph = 0; out('rock', impact); }
      else if (t.kind === 'jackbox') { t.pop = TOY.popT; out('pop', impact); ev[ev.length - 1].onTop = true; }
      else if (t.kind === 'toycar' && hasCooled(t, TOY.honkCool)) out('honk', impact);
    }
    // dyttet: målt flytting siden forrige bilde
    const dx = x - t.x, dz = z - t.z, sp = Math.hypot(dx, dz) / dt; t.x = x; t.z = z; t.speed = sp;
    const r = (b.max[0] - b.min[0]) / 2; if (t.kind === 'tennisball' && r > 0) { t.rx += dz / r; t.rz -= dx / r; }
    const own = Math.hypot(b.vx || 0, b.vz || 0);
    if (t.kind === 'windup') {
      if (t.wind > 0) {
        t.wind -= dt; t.tickT -= dt;
        b.vx = t.dir[0] * TOY.windSpeed; b.vz = t.dir[1] * TOY.windSpeed;
        if (t.tickT <= 0) { t.tickT = TOY.tickEvery; out('tick'); }
        t.stuck = sp < 0.3 ? t.stuck + dt : 0;
        if (t.wind <= 0 || t.stuck > TOY.stuckT) { t.wind = 0; b.vx = b.vz = 0; out('stop'); }
      }
      continue;
    }
    if (sp > TOY.rollMin && (t.kind === 'tennisball' || t.kind === 'toycar')) {
      if (sp > own * 1.05 + 0.2 && TOY.rollK > 0) { const k = Math.min(1, TOY.rollMax / sp) * TOY.rollK; b.vx = dx / dt * k; b.vz = dz / dt * k; }   // rull videre
      if (t.kind === 'tennisball' && hasCooled(t, TOY.squeakCool)) out('squeak', clamp(sp / 4, 0.4, 1));
      else if (t.kind === 'toycar' && hasCooled(t, TOY.honkCool)) out('honk', clamp(sp / 4, 0.4, 1));
    }
    if (t.kind === 'rockinghorse' && sp > 0.8 && t.rock < TOY.rockT * 0.4 && hasCooled(t, 0.8)) { t.rock = TOY.rockT * 0.6; out('rock', 0.5); }
    if (t.kind === 'tennisball') { if (b.grounded && t.vy < -6 && hasCooled(t, TOY.squeakCool)) out('squeak', 0.6); t.vy = b.vy || 0; }      // spretter etter fall: pip
  }
  S.prevGround = p.groundBox || null; S.prevOnGround = !!p.onGround; S.prevVy = p.vy || 0;
  return ev;
}
