// R137: 2,5D-visning i byggeskjermen: fast, lett skråkamera. Ren logikk (ingen DOM, kjøres i node: test_view25.mjs).
// Spilleren tegner og trykker i 2D som før; dataene (u, v) endres aldri. Bare avbildningen til skjermen er en homografi (pitch ned + litt skjev side + mild perspektivforkortning),
// og den er eksakt inverterbar, så hvert rutenettpunkt rundturs-projiseres til samme punkt (alle treff, snapping, lupe og hint bruker toWorld fra build_logic.js).
// Tegnehjelpene (dybde, skygge) står i build_view25_view.js.
export const TILT = { pitch: 18 * Math.PI / 180, shear: 0.07, dist: 1500 };   // pitch ned, sidehelling (tan), kameraavstand i px (mild perspektivforkortning)
let on = false;
export const setTilt25 = (v) => { on = !!v; };
export const tilt25 = () => on;
const C = Math.cos(TILT.pitch), S = Math.sin(TILT.pitch);

// (p, q) = px fra sentrum (q oppover) i flat visning -> px fra sentrum (y oppover) i skråvisning
export function proj25(p, q, t = TILT) {
  const c = Math.cos(t.pitch), s = Math.sin(t.pitch), wd = 1 + (q * s) / t.dist;
  return { x: (p + t.shear * q * c) / wd, y: (q * c) / wd };
}
// eksakt invers
export function unproj25(x, y, t = TILT) {
  const c = Math.cos(t.pitch), s = Math.sin(t.pitch), q = y / (c - (y * s) / t.dist), wd = 1 + (q * s) / t.dist, p = x * wd - t.shear * y * wd;
  return { p, q };
}
// avstanden et punkt flyttes på skjermen når det ligger «bak» planet med dybden z (px): opp og litt til siden (siden av stavene vises)
export const depthVec = (z) => ({ x: z * TILT.shear * 1.6, y: -z * (0.35 + S) });   // skjerm-y nedover
// dybden (px) for en stav med gitt synlig tykkelse (px): tynne staver får minst litt, tykke begrenses
export const rodDepth = (w) => Math.max(5, Math.min(13, w * 0.9));
export const SLAB_DEPTH = 11;                                   // veidekket er en synlig tykk plate
export const shadeHex = (hex, k) => {                            // k < 1 mørkere, k > 1 lysere (bare #rrggbb)
  const m = /^#([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return hex;
  const n = parseInt(m[1], 16), f = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
  return '#' + [f((n >> 16) & 255), f((n >> 8) & 255), f(n & 255)].map((v) => v.toString(16).padStart(2, '0')).join('');
};
// statisk tegnebudsjett per stav (strøk): skygge 1 + dybde 3 (+ 1 for kabel/lister) mot 3 i dag; brukes i test og dokumentasjon
export const EXTRA_STROKES_PER_ROD = 4;
