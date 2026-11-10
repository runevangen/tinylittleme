// Leker i barneskala (R2): ren logikk (uten three.js) for bokstavkloss, Lego-kloss og leketøysbil, så den kan testes.
// Tegningen ligger i props.js (kind: letterblock, legoblock, toycar). Alle tre fyller hele boksen sin, så kollisjonen stemmer med utseendet.

export const PASTELS = ['#f4a6a6', '#a9d6f5', '#f9e08f', '#b5e3b0', '#d3b8f0', '#f7c6a0'];

// Bokstaven på en kloss: siste tegn etter «_» eller «-» i id-en (bokstav_a → A, kloss_ø → Ø). Uten gyldig bokstav: ut fra id-en, ellers «A».
export function letterOf(id = '') {
  const m = /[_-]([A-Za-zÆØÅæøå])$/.exec(String(id));
  if (m) return m[1].toUpperCase();
  let h = 0; for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return 'ABCDEFGHIJKLMNOPRSTUVY'[h % 22];
}
// Stablede bokstavklosser (høyere enn bred): hvert lag får neste bokstav i alfabetet (A, B, C …).
export function letterStack(id, sx, sy, sz) {
  const n = Math.max(1, Math.round(sy / Math.max(sx, sz))), base = letterOf(id), out = [];
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÆØÅ'; let i0 = Math.max(0, A.indexOf(base));
  for (let i = 0; i < n; i++) out.push(A[(i0 + i) % A.length]);
  return out;
}

// Knotter på en Lego-kloss: 1 knott per ~8 enheter-lengde i hver retning (min 1), jevnt fordelt. Returnerer sentrum for hver knott (relativt til toppens midte).
export const STUD_PITCH = 1.6;                       // 1,6 enheter = 8 cm: en 2x2-kloss er 16 cm bred (kloss i barneskala, 1 enhet = 5 cm)
export function studLayout(sx, sz, pitch = STUD_PITCH) {
  const nx = Math.max(1, Math.round(sx / pitch)), nz = Math.max(1, Math.round(sz / pitch)), out = [];
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) out.push([(i - (nx - 1) / 2) * (sx / nx), (j - (nz - 1) / 2) * (sz / nz)]);
  return out;
}
// Knottene ligger innenfor boksen (klossen er sy − STUD_H høy, knottene fyller resten): toppen av boksen er toppen av knottene, så kollisjonen stemmer.
export const STUD_H = 0.12;
// Hjulstørrelse på leketøysbilen: hjulene skal ligge innenfor boksen (ikke stikke under gulvet eller over taket).
export function carWheel(sx, sy, sz) { const r = Math.min(sy * 0.26, sx * 0.14, sz * 0.3); return { r, y: -sy / 2 + r, xs: [-sx * 0.3, sx * 0.3], zEdge: sz / 2 }; }

// y for bokstaven oppå en stablet bokstavkloss (n lag, total høyde sy): rett over øverste lags overside (laget starter i -sy/2 + i*h og er h*0.985 høyt)
export function letterTopY(sy, n) { const h = sy / n; return -sy / 2 + (n - 1) * h + h * 0.985 + 0.012; }
