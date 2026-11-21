// R112: all prøvetilstand i byggeren på ett sted. Ren logikk (ingen DOM, ingen three.js, kjøres i node: test_buildrun.mjs).
// Spøkelset og resten fra forrige prøve skal aldri bli hengende: build.js kaller resetRunState(why) fra alle veier (stopp, ny prøve, replay,
// ◀ ▶ til annet sted, inn/ut, nullstill, referansebygg), og denne modulen sier hva «rent» betyr og om noe lå igjen.

// (winRes, siste vellykkede bygg, er «sist kjente resultat» og beholdes; nullstilles bare ved «start på nytt»)
// verdiene til felt som hører til én prøve (sim, opptak, spøkelse, merker, resultat). Nye felter legges til her så testen fanger dem.
export const blankRun = () => ({
  sim: null, simAcc: 0, simMarks: [], simDone: false, simBreaks: [], simWhy: null, simHelp: null, confetti: [], breakAt: -9,
  loadMore: null, winSolved: false, winOver: false, replaying: false, recorder: null, ghostRec: null, gPeaks: null, gSum: null, gSpeed: 'play',
});
export const RUN_KEYS = Object.keys(blankRun());

// navnene på felt som ikke er rene (tomme lister, null, false, 'play')
export function dirtyKeys(s) {
  const b = blankRun(), out = [];
  for (const k of RUN_KEYS) { const v = s ? s[k] : undefined, d = b[k]; if (Array.isArray(d) ? !(Array.isArray(v) && v.length === 0) : v !== d) out.push(k); }
  return out;
}

// «henger igjen»: noe er ikke rent selv om ingen prøve kjører (sim er null), eller sim er null men resultat/opptak ligger igjen
export const staleKeys = (s) => (s && s.sim ? [] : dirtyKeys(s));

// spøkelset (forrige prøve) tegnes bare mens en NY prøve kjører (ikke etter at den er ferdig, ikke i replay) og når ⚙-valget er på
export const ghostVisible = ({ ghostRec, replaying, simDone, sim, on }) => !!(on && ghostRec && sim && !replaying && !simDone);

// DOM-hjelp (test og bilder): elementer som er synlige men halvt utfadet (opacity mellom 0 og 1, ikke display:none / hidden) etter en overgang
export function fadedLeft(items) {
  return (items || []).filter((e) => e && e.display !== 'none' && e.visibility !== 'hidden' && e.opacity > 0.02 && e.opacity < 0.98).map((e) => e.k || e.id || '?');
}
