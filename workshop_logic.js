// R63: Verkstedet (nivå 9). Ren logikk uten tegning, testes i node (test_verksted.mjs).
//  - glatte flater (oljeflekk, oljet verktøykasse): hvilke boksene er, når figuren begynner/slutter å gli, og hvor langt den sklir (for logg, hint og test)
//  - vektgåten: kan platene balanseres med tingene som ligger i brettet? (dekker alle fordelinger; brukes av testen og som sjekk når brettet bygges)
//  - nivårekkefølgen: «neste nivå» er nivået med lavest n over dette, så et hull i nummereringen (R62 kommer før eller etter) ikke stopper spillet; siste nivå gir avslutningen
// Tegningen av glatte flater (glansstriper, rød ✕) ligger i readable_view.js og virker på alle bokser med `slick`.
import { GATE, massOf } from './plates_logic.js';

export const SLICK = {
  slideMin: 0.8,        // enheter/s: under denne farten regnes figuren som stille (ikke «glir»)
  hintAfter: 0.35,      // sekunder på glatt flate før hintet kan vises (så et lite steg over kanten ikke utløser det)
  logCool: 3,           // sekunder mellom hver glir-linje i testrapporten
};

export const isVerksted = (L) => L?.audio?.theme === 'verksted';
export const slickBoxes = (L) => (L?.boxes || []).filter((b) => b.slick && b.type !== 'wall' && !b.dyn);
export const slickPatches = (L) => slickBoxes(L).filter((b) => b.type !== 'floor').map((b) => ({ id: b.id, x0: b.min[0], x1: b.max[0], z0: b.min[2], z1: b.max[2], top: b.max[1], onFloor: b.max[1] < 0.6 }));
export const slickUnder = (p) => (p && p.onGround && p.groundBox && p.groundBox.slick ? p.groundBox : null);

// Følger figuren over glatte flater. update() gir hendelser { type: 'glir' | 'grep', id, speed } når figuren begynner å gli på en glatt flate og når den står på fast grunn igjen.
export function createSlickTracker() {
  const T = { id: null, t: 0, sliding: false, cool: 0, total: 0 };
  T.update = (p, dt) => {
    const ev = [], g = slickUnder(p), sp = p ? Math.hypot(p.vx || 0, p.vz || 0) : 0;
    T.cool = Math.max(0, T.cool - dt);
    if (g) {
      T.id = g.id; T.t += dt;
      if (!T.sliding && T.t >= SLICK.hintAfter && sp > SLICK.slideMin && T.cool <= 0) { T.sliding = true; T.cool = SLICK.logCool; T.total++; ev.push({ type: 'glir', id: g.id, speed: +sp.toFixed(1) }); }
    } else if (T.id && p?.onGround) { if (T.sliding) ev.push({ type: 'grep', id: T.id, speed: +sp.toFixed(1) }); T.id = null; T.t = 0; T.sliding = false; }
    // i lufta (hopp av kanten) beholdes tilstanden: «fast grunn igjen» meldes når figuren lander på noe som ikke er glatt
    return ev;
  };
  T.reset = () => { T.id = null; T.t = 0; T.sliding = false; T.cool = 0; };
  return T;
}

// Vektgåten: kan alle platene (med sine terskler) dekkes samtidig av de løse tingene? Prøver alle fordelinger (få ting). Figuren (GATE.hero) tas ikke med: den må stå en annen plass.
export function weightBalance(L) {
  const plates = (L?.gates?.plates || []).filter((q) => q.need > GATE.hero), py = plates.length ? plates[0].y : 0;
  const items = (L?.movables || []).filter((m) => m.weight === 'light' && Math.abs(m.min[1] - py) < 0.6).map((m) => massOf({ dyn: true, weight: m.weight }));   // bare tingene som ligger på samme flate som platene (dekket nede på gulvet kommer ikke opp på benken)
  const needs = plates.map((q) => q.need * GATE.needScale), total = items.reduce((a, b) => a + b, 0), sum = needs.reduce((a, b) => a + b, 0);
  let solvable = false, wrong = 0, count = 0;
  const loads = needs.map(() => 0);
  const rec = (i) => {
    if (i === items.length) { count++; if (loads.every((v, k) => v >= needs[k])) solvable = true; else wrong++; return; }
    for (let k = 0; k < needs.length; k++) { loads[k] += items[i]; rec(i + 1); loads[k] -= items[i]; }
  };
  if (items.length <= 9) rec(0); else solvable = total >= sum;
  return { plates: needs, items, total, need: sum, slack: total - sum, solvable, tight: solvable && total - sum < Math.min(...items, Infinity), wrong };
}

// Nivårekkefølge. levels: [{ id, n? }]. Nivåer uten n (bygg, prøverom) er ikke med.
export const levelNumbers = (levels) => levels.filter((l) => Number.isFinite(l.n)).map((l) => l.n).sort((a, b) => a - b);
export const nextLevelOf = (levels, n) => (Number.isFinite(n) ? levels.filter((l) => Number.isFinite(l.n) && l.n > n).sort((a, b) => a.n - b.n)[0] || null : null);
export const lastLevelN = (levels) => Math.max(0, ...levelNumbers(levels));
export const isLastLevel = (levels, n) => Number.isFinite(n) && n > 0 && !nextLevelOf(levels, n);
