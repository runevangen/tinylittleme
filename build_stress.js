// R45: lesbar svikt i byggeskjermen (ren logikk: ingen DOM, kjøres i node).
//  - belastning 0..1 per del og ledd (fysikken regner den ut i `pose()`; her gjøres den om til farge og vises som tall)
//  - farge: blå (slapp) -> gul (belastet) -> rød (nær brudd)
//  - «hvorfor brakk det»: peker på første ledd/planke som røk, og gir et forslag (tekstnøkkel i i18n.js)
//  - brudd-pause: kort stopp og slow-motion på selve bruddet (bare tempoet i visningen, fysikken er uberørt)
export const COLD = [74, 144, 226], WARM = [255, 210, 63], HOT = [255, 59, 48];   // blå, gul, rød
export const BREAK_HOLD = 0.18, BREAK_SLOW = 0.9, BREAK_SLOW_K = 0.25;           // sekunder pause, sekunder sakte, tempo i sakte film

export const load01 = (s) => (Number.isFinite(s) ? Math.min(1, Math.max(0, s)) : 0);

// belastning -> [r,g,b] (heltall 0..255). 0 = blå, 0.5 = gul, 1 = rød; jevn overgang, monoton i «varme»
export function stressRGB(s) {
  const k = load01(s), a = k < 0.5 ? COLD : WARM, b = k < 0.5 ? WARM : HOT, f = k < 0.5 ? k * 2 : (k - 0.5) * 2;
  return a.map((v, i) => Math.round(v + (b[i] - v) * f));
}
export const stressCss = (s) => `rgb(${stressRGB(s).join(',')})`;
export const stressBand = (s) => { const k = load01(s); return k < 0.35 ? 'slapp' : k < 0.75 ? 'belastet' : 'brudd'; };
// blandet med delens egen farge (hex) så materialet fortsatt kjennes igjen; w = hvor mye av spenningsfargen (0..1)
export function tint(hex, s, w = 0.8) {
  const n = parseInt(String(hex).replace('#', ''), 16) || 0, base = [n >> 16, (n >> 8) & 255, n & 255], c = stressRGB(s);
  return `rgb(${base.map((v, i) => Math.round(v * (1 - w) + c[i] * w)).join(',')})`;
}

// belastning per del (id -> 0..1) og per ledd (id -> 0..1) ut av en `pose()`.
// Planker bærer sin egen nedbøyning. Stive deler (kloss, vekt) viser belastningen i leddene de henger i (tape, ledd, tau).
export function loadMap(pose) {
  const parts = new Map(), links = new Map();
  for (const l of pose.links || []) links.set(l.id, l.broken ? 0 : load01(l.stress));
  for (const p of pose.parts || []) parts.set(p.id, load01(p.stress));
  return { parts, links };
}

// «hvorfor brakk det»: breaks = [{ kind: 'plank'|'tape'|'hinge'|'rope', id, t, u, v }] i den rekkefølgen de røk.
// Gir { key, kind, id, u, v, t } for det som røk først (det svakeste leddet: det andre ofte brakk av), eller null uten brudd.
export function whyBroke(breaks) {
  if (!breaks || !breaks.length) return null;
  const b = breaks.slice().sort((x, y) => (x.t ?? 0) - (y.t ?? 0))[0], kind = b.kind || 'plank';
  return { key: `build.why.${kind}`, kind, id: b.id, u: b.u, v: b.v, t: b.t };
}
export const WHY_KEYS = ['build.why.plank', 'build.why.tape', 'build.why.hinge', 'build.why.rope'];

// tempo i visningen etter et brudd: 0 under pausen, så sakte film, så normalt. since = sekunder siden bruddet (null/negativ = ingen brudd)
export function breakTempo(since, on = true) {
  if (!on || since === null || since === undefined || since < 0) return 1;
  if (since < BREAK_HOLD) return 0;
  if (since < BREAK_HOLD + BREAK_SLOW) return BREAK_SLOW_K;
  return 1;
}
// ring rundt bruddet: radius (px) og gjennomsiktighet 0..1 ved alder (s); null når den er ferdig
export function ringAt(age, maxR = 46) {
  if (age < 0 || age > 1.2) return null;
  const f = age / 1.2; return { r: 8 + (maxR - 8) * (1 - (1 - f) * (1 - f)), a: 1 - f };
}
// slår sammen brudd fra runSim ({breaks, linkBreaks}) til listen whyBroke vil ha
export const mergeBreaks = (r) => [...(r.breaks || []).map((b) => ({ kind: 'plank', id: b.id, t: b.t, u: b.u, v: b.v })), ...(r.linkBreaks || []).map((b) => ({ kind: b.kind, id: b.id, t: b.t, u: b.u, v: b.v }))];
