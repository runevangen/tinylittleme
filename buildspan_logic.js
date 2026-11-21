// R118: FRA og TIL ved byggestedet. Ren logikk (ingen DOM/three, testes i node: test_buildspan.mjs). Tegningen står i buildspan_view.js, koblingen i build.js.
// Spennet er der byggingen starter (FRA, grønn, venstre) og slutter (TIL, gul, høyre), regnet fra det som allerede ligger i brettdataene:
// kantene på underlaget (deck) rundt gapet, ellers rutenett-ankrene, ellers en fast bredde foran målet. Ingen byggesteder, ankre eller mål endres.
export const SPAN = {
  showR: 22,          // markørene vises innenfor så langt fra stedets midte (mer enn BYGG-knappens rekkevidde, så de er synlige når du kommer)
  minGap: 2,          // minste vannrette spenn (enheter à 5 cm) før vi regner det som et gap; ellers (trapp) brukes ankre eller fast bredde
  fallbackGap: 6.25,  // fast bredde foran målet når stedet ikke har noe gap (trapp)
  unitM: 0.05,        // én enhet = 5 cm
  colFrom: '#3df0b0', colTo: '#ffd23f',   // samme farger som byggeskjermen (grønne ankerprikker, gult målflagg)
};
export const KEY_SEEN = 'tlm.byggfromto';

export function spanOf(site) {
  const hw = (site.w || 20) / 2, dk = Array.isArray(site.deck) && site.deck.length ? site.deck : [{ u0: -hw - 6, u1: -hw }, { u0: hw, u1: hw + 6 }];
  const a = dk[0], b = dk[dk.length - 1];
  let from = { u: a.u1, v: a.top || 0 }, to = { u: b.u0, v: b.top || 0 }, src = 'deck';
  if (to.u - from.u < SPAN.minGap) {
    const g = site.grid?.anchors, an = g && g.length >= 2 ? g : null;
    if (an) { const s = [...an].sort((p, q) => p.u - q.u); from = { u: s[0].u, v: s[0].v || 0 }; to = { u: s[s.length - 1].u, v: s[s.length - 1].v || 0 }; src = 'grid'; }
    else { from = { u: to.u - SPAN.fallbackGap, v: a.top || 0 }; src = 'fixed'; }
  }
  const gap = Math.max(0, to.u - from.u) * SPAN.unitM, rise = (to.v - from.v) * SPAN.unitM;
  return { from, to, gap, rise, src, w: { from: { x: site.x + from.u, y: site.y + from.v, z: site.z }, to: { x: site.x + to.u, y: site.y + to.v, z: site.z } } };
}

// Avstand (vannrett) fra figuren til stedets midte.
export const spanDist = (site, p) => Math.hypot(site.x - p.x, site.z - p.z);
export const spanInRange = (site, p, r = SPAN.showR) => spanDist(site, p) <= r + (site.w || 20) / 2 && p.y > site.y - 4 && p.y < site.y + (site.h || 12) + 8;
// Nærmeste sted innenfor rekkevidde (flere steder i Bygglab: det nærmeste vinner).
export function spanSite(sites, p, r = SPAN.showR) {
  let best = null, bd = Infinity;
  for (const s of sites || []) if (spanInRange(s, p, r)) { const d = spanDist(s, p); if (d < bd) { bd = d; best = s; } }
  return best;
}

// Skal markørene stå i verdenen? on: valget (⚙), buildOpen: byggeskjermen er åpen, expert/help: vanskelighet og hjelpenivå.
// Skjult på Ekspert uten hjelp (hjelp «Ingen»).
export function spanHidden({ expert = false, help = 'normal' } = {}) { return expert && help === 'none'; }
export function spanVisible({ on = true, buildOpen = false, playing = true, expert = false, help = 'normal', inRange = false } = {}) {
  return !!on && !buildOpen && !!playing && !!inRange && !spanHidden({ expert, help });
}
// Veiledningstekst første gang per sted (bort på Ekspert).
export function spanGuideShould({ on = true, expert = false, seen = [], id }) { return !!on && !expert && !!id && !seen.includes(id); }

// Tall til tekst: «35 cm» eller «1,2 m».
export function fmtLen(m) {
  const cm = Math.round(Math.abs(m) * 100);
  return cm < 100 ? `${cm} cm` : `${(cm / 100).toFixed(1).replace('.', ',')} m`;
}
// Delene av «gap …, … høyere»: { gap, dir: 'up'|'down'|'level', dv } (strenger er ferdig formatert; T står i i18n).
export function spanParts(sp) {
  const dv = Math.round(Math.abs(sp.rise) * 100);
  return { gap: fmtLen(sp.gap), dir: dv < 1 ? 'level' : sp.rise > 0 ? 'up' : 'down', dv: fmtLen(sp.rise) };
}
export function spanLine(sp, T) {
  const p = spanParts(sp);
  return T(p.dir === 'level' ? 'span.gapLevel' : p.dir === 'up' ? 'span.gapUp' : 'span.gapDown', { g: p.gap, z: p.dv });
}

// Lengde langs stiplet bue (verdensenheter) og høyde på buen: litt opp i midten så den ligger over underlaget.
export const arcPoints = (a, b, n = 16, lift = 0.18) => {
  const pts = [], dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, len = Math.hypot(dx, dy, dz), h = Math.max(1.2, len * lift);
  for (let i = 0; i <= n; i++) { const t = i / n; pts.push({ x: a.x + dx * t, y: a.y + dy * t + Math.sin(Math.PI * t) * h + 0.6, z: a.z + dz * t }); }
  return pts;
};

// Minikart: to prikker (FRA, TIL) og en linje for stedet; brukes av overview.js.
export function spanMapDots(sites) {
  const out = [];
  for (const s of sites || []) { const sp = spanOf(s); out.push({ id: s.id, from: { x: sp.w.from.x, z: sp.w.from.z }, to: { x: sp.w.to.x, z: sp.w.to.z } }); }
  return out;
}
// Veilederpilen mot FRA-siden når figuren er utenfor rekkevidde (R64): null når den er nær nok, ellers punktet i verden.
export function spanArrowTarget(site, p, r = SPAN.showR) {
  if (!site) return null;
  if (spanInRange(site, p, r)) return null;
  const w = spanOf(site).w.from; return { x: w.x, y: w.y, z: w.z };
}
