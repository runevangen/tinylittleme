// R28 Fallgrenser varslet: ren logikk (ingen THREE, ingen DOM) for landingsklasser, markør, fallvind og synsfelt-økning.
// Leser bare fallhøyde/fart; fysikken i physics.js er uendret. Hekter i main.js (updateBlob, kamera, lyd, cueFrame).
export const CLASSES = ['soft', 'hard', 'danger'];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

// Landingsfart (enheter/s) etter å ha falt h med fart vy; myke flater tar av for fallet (softFactor).
export const impactAt = (vy, h, g, soft = false, softFactor = 1) =>
  Math.sqrt(Math.max(0, vy * vy + 2 * Math.abs(g) * Math.max(0, h))) * (soft ? softFactor : 1);

// Tre klasser: myk (tåler det), hard (bedøvet), farlig (tilbake til lagringspunkt). Uendelige terskler (Klassisk/Snappy) gir alltid myk.
export const classify = (v, hardV, dangerV) => (v >= dangerV ? 'danger' : v >= hardV ? 'hard' : 'soft');

// Utseende på landingsmarkøren: farge, størrelse (pulserer raskere jo farligere) og dekning.
export const MARK = { soft: { color: 0xffffff, op: 0.55, amp: 0.05, rate: 110 }, hard: { color: 0xffa940, op: 0.95, amp: 0.18, rate: 110 }, danger: { color: 0xff4b3e, op: 0.95, amp: 0.22, rate: 70 } };
export function markerStyle(cls, nowMs) {
  const m = MARK[cls] || MARK.soft;
  return { color: m.color, opacity: m.op, scale: 0.55 + m.amp * Math.sin(nowMs / m.rate) };
}

// Hvor langt mot hard landing du er (0..1) i et fall med fart `speed`: styrer vind og synsfelt. Starter først ved `from`.
export function fallShare(speed, hardV, from = 6) {
  const top = Number.isFinite(hardV) && hardV > from ? hardV : 24;
  return smooth((speed - from) / (top - from));
}
// Fallvind: lydstyrke-faktor på vanlig fallvind (1 = som før). mul = innstilling (0 = ingen ekstra).
export const windBoost = (speed, hardV, mul = 1) => 1 + 1.2 * mul * fallShare(speed, hardV);
// Synsfelt-økning (grader) mot fallterskelen; maxDeg fra innstilling.
export const fovTarget = (speed, hardV, maxDeg = 6) => maxDeg * fallShare(speed, hardV);
// Glatt tilnærming mot mål (raskere opp enn ned, så det glir tilbake etter landing).
export const approach = (cur, tgt, dt, up = 3, down = 5) => cur + (tgt - cur) * (1 - Math.exp(-(tgt > cur ? up : down) * dt));

// Hva som skjer ved landing: lyd, lydtekst (til hørselshemmede), figurreaksjon og vibrasjon. Bare fall over minste fart teller.
export const REACT = {
  soft: { sound: 'soft', cue: 'myk landing', mood: null, moodT: 0, buzz: 0 },
  hard: { sound: 'hard', cue: 'hard landing', mood: 'hurt', moodT: 1.3, buzz: 45 },
  danger: { sound: 'danger', cue: 'farlig landing', mood: 'hurt', moodT: 2, buzz: 90 },
};
export function landingEvent(preVy, impact, hardV, dangerV, minV = 9) {
  if (!(preVy < -3) || -preVy < minV) return null;
  const cls = classify(impact, hardV, dangerV);
  return { cls, v: +impact.toFixed(1), ...REACT[cls] };
}
