// R39 Finpuss av Prince: ren logikk (ingen THREE, ingen DOM) for fire små bevegelsesforbedringer.
//  1) kant-shimmy: hengende i en kant går figuren sidelengs med stikka
//  2) rulle ved landing: hard (ikke farlig) landing med stikka i fart rulles i stedet for å bedøve
//  3) forsiktig gange: lett stikke gir sakte gange (og kanthjelpen stopper ved kanten)
//  4) tyngre tau-sving: lengre periode, mer treghet og fart i utsvinget
// physics.js leser FIN og slår funksjonene på med flaggene P.shimmy, P.rollOn, P.carefulOn og P.ropeHeavy (av som standard i ren fysikk;
// spillet slår dem på etter innstillingene i ⚙, se main.js). Verdiene kan finjusteres i ⚙ (admin).
export const FIN = {
  shimmySpeed: 1.1,   // fart sidelengs i kanten (enheter/s) ved fullt stikkeutslag
  shimmyDead: 0.3,    // stikkeutslag sidelengs under dette gir ingen shimmy
  shimmyMargin: 0.2,  // hvor nær kanthjørnet du kan gå (enheter)
  rollDur: 0.55,      // hvor lenge rullen varer (s)
  rollSafe: 0.9,      // uskadd-tid etter rulle (s): ingen ny hard landing / knockout
  rollMinSpeed: 0.45, // minste fart (andel av toppfart) for å rulle i stedet for å bli bedøvet
  rollMinStick: 0.5,  // minste stikkeutslag for å rulle
  rollKeep: 0.8,      // andel av landingsfarten som holdes oppe gjennom rullen (den dør ut mot slutten)
  carefulMul: 0.7,    // fartsfaktor ved lett stikke (under kanthjelpens «forsiktig»-grense)
  carefulBand: 0.25,  // overgang opp til grensen, så farten ikke hopper
  ropeG: 0.8,         // tyngdekraft på tauet (lavere = lengre periode)
  ropePush: 1.2,      // mer fart i utsvinget fra stikka
  ropeDamp: 0.04,     // luftmotstand per sekund (lavere = svinger lenger)
  ropeLag: 0.22,      // treghet: tidskonstant (s) før stikka virker fullt på tauet
};

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

// ---- 1) kant-shimmy ----
// Fortegnet sidefart (enheter/s) langs kanten: `side` er stikkeutslaget langs kanten (-1..1). Under dødsonen: 0.
export function shimmyVel(side, cfg = FIN) {
  const a = Math.abs(side);
  if (a < cfg.shimmyDead) return 0;
  return Math.sign(side) * cfg.shimmySpeed * clamp((a - cfg.shimmyDead) / (1 - cfg.shimmyDead) * 0.6 + 0.4, 0, 1);
}
// Flytt hengepunktet `dist` langs kanten (tangent t = (-nz, nx)), begrenset til kanthjørnene på boksen `b` (med margin).
// Returnerer nye { x, z, tx, tz, moved } eller null hvis ingen bevegelse. h = { nx, nz, tx, tz }, pos = { x, z }.
export function shimmyMove(h, b, pos, dist, cfg = FIN) {
  if (!dist || !b) return null;
  const tx = -h.nz, tz = h.nx, m = cfg.shimmyMargin;
  const lo = tx ? b.min[0] : b.min[2], hi = tx ? b.max[0] : b.max[2];
  const mm = hi - lo < 2 * m ? (hi - lo) / 2 : m;
  const cur = tx ? pos.x : pos.z, to = clamp(cur + (tx ? tx : tz) * dist, lo + mm, hi - mm);
  if (Math.abs(to - cur) < 1e-6) return null;
  const nx = pos.x + (tx ? to - cur : 0), nz = pos.z + (tx ? 0 : to - cur);
  return { x: nx, z: nz, tx: h.tx + (nx - pos.x), tz: h.tz + (nz - pos.z), moved: Math.abs(to - cur) };
}

// ---- 2) rulle ved landing ----
// Skal en hard (ikke farlig) landing bli en rulle i stedet for bedøvelse? Krever fart og tydelig stikke.
export function rollWanted(eff, hardLand, knockV, speed, topSpeed, stick, cfg = FIN) {
  if (!(eff >= hardLand) || eff >= knockV) return false;                       // bare hard landing; farlig gir fortsatt tilbake til lagring
  return speed >= cfg.rollMinSpeed * topSpeed && stick >= cfg.rollMinStick;
}
// Fremdrift (0..1) i rullen, til animasjonen (0 = ny, 1 = ferdig).
export const rollProgress = (rollT, cfg = FIN) => (rollT > 0 ? clamp(1 - rollT / cfg.rollDur, 0, 1) : 0);

// ---- 3) forsiktig gange ----
// Fartsfaktor for lett stikke: carefulMul under (grense - bånd), jevnt opp til 1 ved grensen.
export function carefulFactor(stick, guardMax, cfg = FIN) {
  if (!(stick > 0)) return 1;
  return cfg.carefulMul + (1 - cfg.carefulMul) * smooth((stick - (guardMax - cfg.carefulBand)) / cfg.carefulBand);
}

// ---- 4) tyngre tau ----
// Parametre til tau-sving: av = som før (gMul 1, pushMul 1, damp 0.1, lag 0).
export function swingParams(heavy, cfg = FIN) {
  return heavy ? { gMul: cfg.ropeG, pushMul: cfg.ropePush, damp: cfg.ropeDamp, lag: cfg.ropeLag } : { gMul: 1, pushMul: 1, damp: 0.1, lag: 0 };
}
// Glatt stikkeinput (treghet): flytter `cur` mot `tgt` med tidskonstant lag (lag 0 = rett gjennom).
export const lagToward = (cur, tgt, dt, lag) => (lag > 0 ? cur + (tgt - cur) * (1 - Math.exp(-dt / lag)) : tgt);
// Pendelperiode (s) for lengde R og tyngde g (positiv): 2π√(R/g).
export const swingPeriod = (R, g) => 2 * Math.PI * Math.sqrt(R / Math.abs(g));
