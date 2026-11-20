// R107: «Neste sted» tydelig i byggeren. Ren logikk (ingen DOM, ingen three.js, kjøres i node: test_buildnext.mjs).
// Her ligger: hvilket sted som er neste i rekka (Byggeskolen har åtte; vanlige brett har ett), hva topplinjens ▶-knapp viser (åpen eller 🔒),
// og hvilke knapper resultatkortet viser etter en prøve (bestått, ikke bestått, holdt men for dyrt, flere laster, siste sted, vanlig brett).
// Visningen (buildnext_view.js) og build.js kobler det til skjermen. Samme kode for Hyllebroen, Byggeskolen og de klassiske stedene (R101).

export const BN = { touch: 48 };   // minste trykkflate (px)

// rekka av steder: sites i rekkefølge (Bygglab: lab.n). null når brettet bare har ett sted. next = null på siste sted (ingen rundt-runde).
export function seriesOf(sites, id) {
  const list = Array.isArray(sites) ? sites : [], i = list.findIndex((s) => s && s.id === id);
  if (list.length < 2 || i < 0) return null;
  const next = i < list.length - 1 ? list[i + 1] : null;
  return { idx: i, n: i + 1, of: list.length, next, nextN: next ? i + 2 : 0, last: !next };
}

// fasen i byggeren: bygger / prøver / resultat (ferdig prøve) / replay
export const phaseOf = ({ sim, done, replaying }) => (!sim ? 'bygger' : replaying ? 'replay' : done ? 'resultat' : 'prøver');

// topplinjens ▶-knapp: null (skjult) når det ikke finnes et neste sted; ellers åpen eller låst
export function topNext({ series, nextLocked }) {
  if (!series || !series.next) return null;
  return { state: nextLocked ? 'locked' : 'open' };
}

// resultatkortet etter en ferdig prøve. s: { phase, won, solved (alle laster over), over (over budsjett), loadMore, series, nextLocked, allDone }
// Returnerer null når kortet ikke skal vises, ellers { kind, primary, secondary, final }:
//   kind: 'passed' | 'over' | 'more' | 'failed'; primary/secondary: 'next' | 'finish' | 'back' | 'again' | null
export function cardOf(s) {
  if (!s || s.phase !== 'resultat') return null;
  const kind = !s.won ? 'failed' : s.over ? 'over' : s.solved ? 'passed' : 'more';
  if (kind !== 'passed') return { kind, primary: 'again', secondary: null, final: false };
  const ser = s.series;
  if (!ser) return { kind, primary: 'back', secondary: 'again', final: false };                          // vanlig brett: TILBAKE TIL SPILLET
  if (ser.next && !s.nextLocked) return { kind, primary: 'next', secondary: 'again', final: false };    // NESTE STED ▶
  return { kind, primary: 'finish', secondary: 'again', final: !ser.next && !!s.allDone };               // siste sted (eller neste er låst): FERDIG
}

// hvilke knapper som vises i en gitt tilstand (til testen): { card: [...], top: 'open'|'locked'|null }
export function buttonsOf(s) {
  const c = cardOf(s), t = topNext({ series: s.series, nextLocked: s.nextLocked });
  return { card: c ? [c.primary, c.secondary].filter(Boolean) : [], top: t ? t.state : null, kind: c ? c.kind : null };
}

// tekstnøkkel for tittelen på kortet
export const titleKey = (c) => (c.kind === 'passed' ? (c.final ? 'bn.allDone' : 'bn.passed') : c.kind === 'over' ? 'bn.over' : c.kind === 'more' ? 'bn.more' : 'bn.failed');
export const primaryKey = (p) => ({ next: 'bn.next', finish: 'bn.finish', back: 'bn.back', again: 'bn.again' }[p] || 'bn.back');

// én linje om hva som mangler til neste stjerne (null ved tre stjerner eller når ingenting er kjent)
export function starLine(stars, next) {
  if (!next || !(stars < 3) || !Number.isFinite(next.cost)) return null;
  return { cost: next.cost, parts: Number.isFinite(next.parts) ? next.parts : null };
}

// telleren for «bruk av resultatknappene» siden forrige prøve (prøve-linjen i loggen)
export function createUse() { let n = 0; return { hit: () => { n++; }, take: () => { const k = n; n = 0; return k; }, get n() { return n; } }; }
