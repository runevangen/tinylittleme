// R58 Klatring som ser levende ut: ren logikk (ingen THREE, ingen DOM, ingen fysikk) for fire poser oppå de som finnes i main.js poseHero:
//  1) heng: kroppen henger med vekt fra hendene (skuldrene trekkes opp, svaier sakte), og hendene tar nytt tak av og til
//  2) grep: fingrene lukkes rundt kanten når han tar tak (åpne under rekk, tett med lite klem på slutten)
//  3) opptrekk: bena skyver mot veggen/flaten mens kroppen heises (mantle og klatring)
//  4) avspark: ved hopp ut av heng/klatring skyver bena fra veggen, så trekkes de opp
// Alt er deltaer som legges på T (hoftevinkel h, kneb k, arm a, albue e, ...), skalert med `strength` (SETTINGS). Ingen kollisjon, grep-logikk eller ruter røres.
export const CF = {
  catchDur: 0.55,     // s: hvor lenge «tar tak»-støtet varer (samme som hero.catchT i main.js)
  kickDur: 0.38,      // s: avspark ved hopp ut av heng/klatring
  regripPeriod: 3.1,  // s mellom hvert nytt tak med en hånd (heng)
  regripDur: 0.55,    // s: et nytt tak
  maxStrength: 1.5,
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };

// Hvilken fase er figuren i? 'catch' (tar tak), 'hang', 'climb', 'pull' (mantle), 'kick' (avspark), ellers ''.
export function climbPhase({ state = '', catchT = 0, kickT = 0, mantleU = -1 } = {}) {
  if (state === 'mantle' && mantleU >= 0) return 'pull';
  if ((state === 'hang' || state === 'climb') && catchT > 0.35) return 'catch';
  if (state === 'hang') return 'hang';
  if (state === 'climb') return 'climb';
  if (state === 'air' && kickT > 0) return 'kick';
  return '';
}

// Nytt tak med én hånd: 0..1..0 (en pulsform) med egen fase per hånd, så hendene aldri slipper samtidig.
export function regrip(sec, offset = 0, period = CF.regripPeriod, dur = CF.regripDur) {
  const x = (((sec + offset) % period) + period) % period;
  return x < dur ? Math.sin((x / dur) * Math.PI) : 0;
}

// Fingrene: 0.05 åpne ... 1.2 knyttet rundt kanten. catchT går 1 -> 0 etter at han tar tak.
// Først åpne (rekker), så lukkes de, med en liten ekstra klem (overshoot) før de slapper til hvilegrep.
export function gripFingers(catchT, rest = 1.2) {
  const u = clamp(1 - catchT, 0, 1), close = smooth(u / 0.4);
  const squeeze = 0.22 * Math.sin(clamp((u - 0.2) / 0.5, 0, 1) * Math.PI);
  return clamp(0.05 + (rest - 0.05) * close + squeeze, 0.05, 1.5);
}

// Vektfordeling i heng: 0 = lett (hviler), 1 = full spenning (trett, mye fart). Skuldrene trekkes opp mot hendene og armene strekkes.
export function hangWeight(sec, tired = 0, speed = 0) {
  const t = clamp(tired, 0, 1), m = clamp(speed / 1.5, 0, 1);
  const breathe = Math.sin(sec * 1.7), sw = Math.sin(sec * 0.9 + 0.6);
  return {
    drop: -0.035 - 0.03 * t + 0.008 * breathe,   // kroppen henger litt lavere når han er trett
    sway: 0.018 * sw * (1 - 0.5 * m),             // sidesvaiing (kroppens x)
    roll: 0.05 * sw * (1 - 0.5 * m),
    shoulders: 0.12 + 0.2 * t,                     // hvor mye armene strekkes (mindre albuebøy) og skuldrene trekkes opp
    L: regrip(sec, 0), R: regrip(sec, CF.regripPeriod / 2),
  };
}

// Benvinkler når han støtter fot mot veggen: hofte (h) og kne (k) for en fot som skyver `push` (0 = støtter lett, 1 = full utstrekning).
export function footPush(push) {
  const p = clamp(push, 0, 1);
  return { h: -0.75 + 0.55 * p, k: 1.55 - 1.2 * p };      // bøyd kne mot veggen -> strakt ut
}

// Opptrekk (mantle): u 0..1. Bena skyver vekselvis mot flaten mens kroppen heises; mot slutten svinger det ene beinet opp over kanten.
export function pullLegs(u) {
  const x = clamp(u, 0, 1), a = Math.sin(x * Math.PI), push = smooth(x / 0.7);
  const L = footPush(push), R = footPush(smooth((x - 0.15) / 0.6));
  const over = smooth((x - 0.6) / 0.4);
  return {
    hL: L.h, kL: L.k * (1 - over) + 0.9 * over, hR: R.h * (1 - over) - 0.2 * over, kR: R.k * (1 - over) + 0.4 * over,
    lean: 0.06 * a, chest: 0.05 * a, push,
  };
}

// Klatring: den foten som er på den siden armen trekker skyver mot flaten (ph = climbPh*2 sin, m = fart 0..1).
export function climbPush(s1, m) {
  const mm = clamp(m, 0, 1), pL = smooth((s1 + 1) / 2), pR = smooth((1 - s1) / 2);
  return { L: mm * pL, R: mm * pR, heave: mm * Math.abs(s1) };   // heave: kroppen heises litt på hvert skyv
}

// Avspark: kt går 1 -> 0 etter hopp ut. Først skyver bena strakt fra veggen (første tredjedel), så trekkes knærne opp.
export function kickOff(kt) {
  const u = clamp(1 - kt, 0, 1), ext = smooth(u / 0.3), tuck = smooth((u - 0.3) / 0.7);
  return {
    hL: -0.2 - 0.55 * tuck + 0.25 * ext * (1 - tuck), hR: -0.1 - 0.4 * tuck + 0.2 * ext * (1 - tuck),
    kL: 0.2 + 0.9 * tuck - 0.2 * ext * (1 - tuck), kR: 0.2 + 0.7 * tuck - 0.2 * ext * (1 - tuck),
    aL: -2.4 * (1 - 0.5 * tuck), aR: -2.4 * (1 - 0.5 * tuck), lean: -0.18 * (1 - tuck), chest: -0.1 * (1 - tuck), ext,
  };
}

// Samlet: deltaer som legges på T. o: { state, sec, catchT, kickT, mantleU, tired, speed, s1, climbMove, strength }
// Returnerer { phase, d: {nøkkel: delta}, fgL, fgR (null = urørt), bob }. strength 0 = ingen endring.
export function climbFeel(o = {}) {
  const st = clamp(o.strength ?? 1, 0, CF.maxStrength);
  const phase = climbPhase(o), d = {}, out = { phase, d, fgL: null, fgR: null, bob: 0 };
  if (!phase || st <= 0) return out;
  const add = (k, v) => { d[k] = (d[k] || 0) + v * st; };
  if (phase === 'catch' || phase === 'hang') {
    const w = hangWeight(o.sec || 0, o.tired, o.speed);
    out.bob += w.drop * st;
    add('sway', w.sway); add('roll', w.roll);
    add('eL', 0.15 * w.shoulders); add('eR', 0.15 * w.shoulders);          // armene nesten strake: vekten henger i hendene
    add('aL', -0.06 * w.shoulders - 0.1 * w.L); add('aR', -0.06 * w.shoulders - 0.1 * w.R);   // hånden som tar nytt tak løftes litt
    add('hp', -0.05 * w.shoulders);
    out.fgL = 1.2 - 0.35 * w.L; out.fgR = 1.2 - 0.35 * w.R;                  // fingrene løsner et øyeblikk, så tar de tak igjen
    if (phase === 'hang') { add('hL', -0.05 * w.L); add('hR', -0.05 * w.R); }
  }
  if (phase === 'catch') { const f = gripFingers(o.catchT || 0); out.fgL = f; out.fgR = f; }
  if (phase === 'climb') {
    const p = climbPush(o.s1 || 0, clamp((o.climbMove || 0) / 0.8, 0, 1));
    const L = footPush(p.L), R = footPush(p.R), base = footPush(0.15);
    // fra hviletilstand (støtter lett) mot full utstrekning: delta i forhold til støtte
    add('hL', (L.h - base.h) * p.L * 0.6); add('hR', (R.h - base.h) * p.R * 0.6);
    add('kL', (L.k - base.k) * p.L * 0.6); add('kR', (R.k - base.k) * p.R * 0.6);
    out.bob += 0.02 * p.heave * st;
    out.fgL = 1.25; out.fgR = 1.25;
  }
  if (phase === 'pull') {
    const q = pullLegs(o.mantleU);
    add('hL', 0.35 * (q.hL + 0.6)); add('hR', 0.35 * (q.hR + 0.6)); add('kL', 0.3 * (q.kL - 1)); add('kR', 0.3 * (q.kR - 1));
    add('lean', q.lean); add('chest', q.chest); out.bob += 0.03 * q.push * st;
    out.fgL = 1.35; out.fgR = 1.35;
  }
  if (phase === 'kick') {
    const k = kickOff(o.kickT);
    add('hL', k.hL); add('hR', k.hR); add('kL', k.kL); add('kR', k.kR); add('aL', 0.5 * k.aL + 1.0); add('aR', 0.5 * k.aR + 1.0);
    add('lean', k.lean); add('chest', k.chest); out.fgL = 0.4; out.fgR = 0.4;
  }
  return out;
}
