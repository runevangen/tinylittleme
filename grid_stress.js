// R73: belastning per stav i rutenett-bygging: farge, linjebredde, «største belastning» (ren logikk: ingen DOM, kjøres i node).
//  - belastning = kraften langs staven mot styrken (trykk mot det laveste av knekking og knusing, strekk mot strekkgrensen). 1 = brudd.
//  - farge: grønn -> gul -> oransje -> rød. Fargene har ulik lyshet (rød er mørkest), og strekk tegnes tynnere enn trykk,
//    så det kan leses også uten å se forskjell på rødt og grønt. Kraftige verdier får i tillegg en strek (tegnes i build.js).
//  - små laster ville ellers bli bare grønne: visningen bruker rot-kurve (ratio^GAMMA, standard 0,5; admin). Prosenttallene i teksten er alltid de ekte.
//  - toppverdier per stav følges under prøven (`createPeaks`) og vises etterpå: det som brakk først, ellers det som var nærmest brudd.
export const GAMMA = 0.5;
export const STOPS = [[0, [86, 196, 100]], [0.4, [255, 226, 60]], [0.68, [244, 130, 28]], [1, [150, 16, 30]]];   // grønn, gul, oransje, mørk rød (lyshet synker fra gul og ned)
export const BANDS = [['gronn', 0.4], ['gul', 0.68], ['oransje', 0.88], ['rod', Infinity]];
export const DANGER = 0.88;     // fra hit tegnes stavene med varselstrek (og pulserer)
export const TENSION_W = 0.72, COMPRESSION_W = 1.12;   // linjebredde mot normal: strekk tynnere, trykk tykkere

export const clamp01 = (x) => (Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0);
export const shown = (ratio, gamma = GAMMA) => Math.pow(clamp01(ratio), gamma > 0 ? gamma : GAMMA);
// farge ved visningsverdi s (0..1): lineær mellom stoppene
export function colorAt(s) {
  const k = clamp01(s);
  for (let i = 1; i < STOPS.length; i++) {
    if (k <= STOPS[i][0] + 1e-9) { const [s0, a] = STOPS[i - 1], [s1, b] = STOPS[i], f = (k - s0) / (s1 - s0 || 1); return a.map((v, j) => Math.round(v + (b[j] - v) * f)); }
  }
  return STOPS[STOPS.length - 1][1].slice();
}
export const stressRGB = (ratio, gamma) => colorAt(shown(ratio, gamma));
export const stressCss = (ratio, gamma) => `rgb(${stressRGB(ratio, gamma).join(',')})`;
export const colorCss = (s) => `rgb(${colorAt(s).join(',')})`;       // fra visningsverdi (til forklaringen)
export const luma = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
export const bandOf = (ratio, gamma) => { const s = shown(ratio, gamma); return BANDS.find((b) => s < b[1])[0]; };
export const isDanger = (ratio, gamma) => shown(ratio, gamma) >= DANGER;
export const widthK = (kind) => (kind === 'strekk' ? TENSION_W : COMPRESSION_W);

// belastning og type for én stav ut av sim.axial()-linjen { nc, nt, pcr, tcap, ccap, broken, mode }
export function rodLoad(a) {
  const cap = Math.min(a.pcr, a.ccap), rc = cap > 0 && Number.isFinite(cap) ? Math.max(0, a.nc) / cap : 0, rt = a.tcap > 0 && Number.isFinite(a.tcap) ? Math.max(0, a.nt) / a.tcap : 0;
  if (a.broken) return { r: 1, kind: a.mode === 'tear' ? 'strekk' : 'trykk', broken: true };
  return rt > rc ? { r: rt, kind: 'strekk', broken: false } : { r: rc, kind: 'trykk', broken: false };
}
// id -> { r, kind, broken } for alle staver nå
export function loadsNow(axial) { const m = new Map(); for (const a of axial || []) m.set(a.id, rodLoad(a)); return m; }

// topp per stav under en prøve
export function createPeaks() {
  const peaks = new Map(); let n = 0;
  return {
    feed(axial, t = 0) {
      n++;
      for (const a of axial || []) {
        const x = rodLoad(a), cur = peaks.get(a.id);
        if (!cur) peaks.set(a.id, { r: x.r, kind: x.kind, t, broken: x.broken });
        else { if (x.r > cur.r + 1e-9) { cur.r = x.r; cur.kind = x.kind; cur.t = t; } if (x.broken) cur.broken = true; }
      }
    },
    get peaks() { return peaks; }, get steps() { return n; },
  };
}
// «største belastning»: { first: stav som brakk først | null, top: stav med høyest topp, list: alle, sortert }.
// breaks = [{ id, t }] fra prøven (rekkefølge og tid). Uten brudd er `top` det som var nærmest brudd.
export function peakSummary(peaks, breaks = []) {
  const list = [...peaks.entries()].map(([id, p]) => ({ id, ...p })).sort((a, b) => b.r - a.r || (a.id < b.id ? -1 : 1));
  const fb = breaks.slice().sort((a, b) => (a.t ?? 0) - (b.t ?? 0))[0] || null;
  const first = fb ? { id: fb.id, t: fb.t, ...(peaks.get(fb.id) ? { kind: peaks.get(fb.id).kind, r: peaks.get(fb.id).r } : {}) } : null;
  return { first, top: list[0] || null, list };
}
export const pct = (r) => Math.round(clamp01(r) * 100);
