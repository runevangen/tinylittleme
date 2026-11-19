// R93: liggende utgave av den forenklede byggeskjermen (R92). Ren logikk (ingen DOM, ingen three.js, kjøres i node: test_buildux_land.mjs).
// Her ligger: format (stående/liggende) fra bredde og høyde, mål på sidepanelene og sikre kanter, hvilke knapper som vises når,
// materiallåser (R47: smuler/budsjett), veiledningslinjer og «forslag til neste trekant», banneret i stående format og målingen som sammenligner formatene.
// Visningen (buildux_land_view.js) og buildux_view.js kobler det til skjermen. Klassisk modus og dagens skjerm røres ikke.
import { nearestPoint, nodeAt, nodeOf, rodCheck, gridStep, maxLenOf, MIN_LEN } from './grid_logic.js';

export const LAND = {
  panelMin: 72, panelMax: 88, panelFrac: 0.11,   // sidepanelets bredde (px): 11 % av bredden, innenfor 72–88
  touch: 48,                                      // minste trykkflate (px)
  matBtn: 52,                                     // materialknapp (ikon) i høyre panel
  topPx: 54, botPx: 14,                           // plass (px) budsjettplaten tar øverst, og kanten nederst, av byggeområdet i liggende format
  plateH: 40,                                     // budsjettplatens høyde
  flagReserve: 52,                                // øverst i høyre panel er ⚑ (34 px + kant): materialene starter under
  tipMs: 450, tipShowMs: 2600,                    // langt trykk (ms) viser tips; tipset står så lenge
  labelsSecs: 9,                                  // første gang: etikettene (TRE, STÅL, TAU) står så mange sekunder
  labelsKey: 'tlm.buxlandlabels',
  bannerSecs: 7,                                  // banneret «Snu telefonen» står så lenge hvis det ikke avvises
};

// ---------- format ----------
export const orientOf = (w, h) => (w > h ? 'land' : 'port');
export const orientName = (o) => (o === 'land' ? 'liggende' : 'stående');

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
// mål på layouten i liggende format. insets = sikre kanter (px) fra env(safe-area-inset-*): hakket/Dynamic Island ligger til venstre eller høyre i liggende
export function landMetrics({ w, h, insetL = 0, insetR = 0, insetT = 0, insetB = 0 } = {}) {
  const pw = Math.round(clamp(w * LAND.panelFrac, LAND.panelMin, LAND.panelMax));   // panelets nyttige bredde
  const left = pw + Math.max(0, insetL), right = pw + Math.max(0, insetR);         // panelet vokser med sikker kant: knappene havner aldri under hakket
  const btn = Math.max(LAND.touch, Math.min(56, pw - 12));
  const top = Math.max(LAND.topPx, Math.max(0, insetT) + LAND.plateH + 14), bot = Math.max(LAND.botPx, Math.max(0, insetB) + 6);
  return {
    orient: 'land', pw, left, right, btn, topPx: top, botPx: bot,
    area: { x0: left, x1: w - right, w: Math.max(0, w - left - right), y0: 0, y1: h, h },   // byggeområdet i midten (px), over hele høyden
    leftX: Math.max(0, insetL) + Math.round((pw - btn) / 2), rightX: Math.max(0, insetR) + Math.round((pw - btn) / 2),   // x for knappene inne i panelene
    tryW: pw - 8, fullHeight: h,
  };
}
// stående: panelene finnes ikke, R92-oppsettet gjelder
export const portMetrics = ({ w, h } = {}) => ({ orient: 'port', pw: 0, left: 0, right: 0, area: { x0: 0, x1: w, w, y0: 0, y1: h, h } });
export const metricsOf = (o) => (orientOf(o.w, o.h) === 'land' ? landMetrics(o) : portMetrics(o));
// midtpunktet (px fra midten av skjermen) som byggeområdet skal sentreres på, så broen ikke havner bak et panel
export const centerShift = (m) => (m.orient === 'land' ? (m.left - m.right) / 2 : 0);
// alle trykkflater i panelene holder minst 48 × 48 px
export const touchOk = (m) => m.orient !== 'land' || (m.btn >= LAND.touch && m.tryW >= LAND.touch && m.pw >= LAND.panelMin);

// ---------- hvilke knapper vises når ----------
// venstre panel, ovenfra: ← tilbake, ⋯ meny, ↶ angre. høyre panel: materialene (bare mens du bygger), PRØV/STOPP, og SLOW + PAUSE rett over bare under prøven.
export function landButtons({ sim = false } = {}) {
  return sim
    ? { left: ['back', 'more'], right: ['slow', 'pause', 'try'], undo: false, mats: false }
    : { left: ['back', 'more', 'undo'], right: ['wood', 'steel', 'rope', 'try'], undo: true, mats: true };
}
export const landTryLabel = (sim) => (sim ? { icon: '■', key: 'build.stop' } : { icon: '▶', key: 'build.try' });
// ⚑/⚙ dekkes ikke: høyre panel lar de øverste LAND.flagReserve px stå fri for ⚑ (materialene starter under), og ⚙ ligger skjult under byggeskjermen
export const matsTop = (m, insetT = 0) => Math.max(LAND.flagReserve, Math.max(0, insetT) + LAND.flagReserve - 8);

// ---------- materiallåser (R47: smuler/budsjett) ----------
// stedet kan si at et materiale er låst til en terskel: site.lockMats = { steel: { crumbs: 5 }, rope: { budget: 8 } } (ingen steder har det i dag: alle tre er åpne).
// → { [mat]: { reason: 'crumbs'|'budget', need } } bare for de som er låst nå
export function matLocks({ site, crumbs = 0, budget = Infinity } = {}) {
  const out = {}, L = site && site.lockMats;
  if (!L || typeof L !== 'object') return out;
  for (const [m, c] of Object.entries(L)) {
    if (!c || typeof c !== 'object') continue;
    if (Number.isFinite(c.crumbs) && crumbs < c.crumbs) out[m] = { reason: 'crumbs', need: c.crumbs, have: crumbs };
    else if (Number.isFinite(c.budget) && budget < c.budget) out[m] = { reason: 'budget', need: c.budget, have: budget };
  }
  return out;
}
export const lockText = (lock) => (lock ? (lock.reason === 'crumbs' ? { key: 'buxl.lock.crumbs', vars: { n: lock.need, have: lock.have } } : { key: 'buxl.lock.budget', vars: { n: lock.need } }) : null);
// materialet som skal være valgt: det ønskede hvis det ikke er låst, ellers første åpne
export const pickMat = (want, locks, order = ['wood', 'steel', 'rope']) => (!locks[want] ? want : order.find((m) => !locks[m]) || want);

// ---------- ikoner, etiketter, tips ----------
// første gang vises etikettene (Nybegynner/Medium), aldri på Ekspert; viser seg bare én gang per enhet
export const shouldShowLabels = ({ labels, seen, land }) => !!land && !!labels && !seen;
// forslag til neste trekant: bare Nybegynner (ikke Ekspert), og bare hvis hjelpen er på
export const shouldSuggest = ({ suggest, guideOn = true, hint = true, sim = false, skipped = false }) => !!suggest && guideOn !== false && !!hint && !sim && !skipped;
// banner i stående format: «Snu telefonen for mer plass». Én gang per økt, lagres ikke permanent.
export const shouldShowBanner = ({ orient, on, shown, dismissed }) => orient === 'port' && !!on && !shown && !dismissed;

// ---------- veiledning: ankerlinjer, flagg ----------
// stiplede linjer langs ankerpunktene (klippekant: loddrett ned fra hvert anker; dekkhøyde: vannrett mellom dem) og start-/målflagg ved ankrene
export function guideLines(site, G) {
  const an = (G?.nodes || []).filter((n) => n.fixed); if (an.length < 2) return null;
  const s = an.slice().sort((a, b) => a.u - b.u), a = s[0], b = s[s.length - 1], v = a.v;
  return {
    deck: { u0: a.u, u1: b.u, v },                                                    // dekkhøyde
    cliffs: [{ u: a.u, v0: a.v, v1: 0 }, { u: b.u, v0: b.v, v1: 0 }],                // klippekantene
    start: { u: a.u, v: a.v }, goal: { u: b.u, v: b.v },                              // start- og målflagg
  };
}
// «forslag til neste trekant»: lukker den nyeste staven til en trekant. → { a, b, c: {u, v}, ids: [a, b] } eller null. Utgangspunkt uten staver: første stav fra startankeret.
export function nextTriangle(site, B) {
  const G = B?.rg; if (!G) return null;
  const maxLen = maxLenOf(B), st = gridStep(site), user = G.rods.filter((r) => !r.deck);
  const ok = (aId, bId) => { const c = rodCheck(G, aId, bId, maxLen); return !!c.ok; };
  const apexOk = (a, b, p) => {   // staver a-p og b-p er lovlige (p kan være ny knute)
    const ex = nodeAt(G, p.u, p.v), id = ex ? ex.id : '_t';
    if (!ex) G.nodes.push({ id, u: p.u, v: p.v });
    try { return ok(a.id, id) && ok(b.id, id); } finally { if (!ex) G.nodes.pop(); }
  };
  for (let i = user.length - 1; i >= 0; i--) {
    const r = user[i], a = nodeOf(G, r.a), b = nodeOf(G, r.b); if (!a || !b) continue;
    const dx = b.u - a.u, dy = b.v - a.v, L = Math.hypot(dx, dy); if (L < MIN_LEN) continue;
    for (const sgn of [1, -1]) {   // over staven først (v oppover), så under
      const nx = -dy / L * sgn, ny = dx / L * sgn; if (ny < 0 && sgn === 1) continue;
      const mx = (a.u + b.u) / 2 + nx * L * 0.8, my = (a.v + b.v) / 2 + ny * L * 0.8, p = nearestPoint(site, mx, my, Math.max(0.62 * st, 0.4));
      if (!p || p.v < 0) continue;
      if (Math.hypot(p.u - a.u, p.v - a.v) < MIN_LEN || Math.hypot(p.u - b.u, p.v - b.v) < MIN_LEN) continue;
      if (G.rods.some((q) => ((q.a === r.a || q.b === r.a) && nodeAt(G, p.u, p.v) && (q.a === nodeAt(G, p.u, p.v).id || q.b === nodeAt(G, p.u, p.v).id)))) continue;   // a-p finnes fra før
      if (apexOk(a, b, p)) return { a: { u: a.u, v: a.v }, b: { u: b.u, v: b.v }, c: { u: p.u, v: p.v }, ids: [a.id, b.id] };
    }
  }
  return null;
}

// ---------- logg og mål: sammenligne stående og liggende ----------
// teller byggehandlinger og tid til første bro per format; byggingen mistes ikke ved snuing (tilstanden ligger i byggeskjermen, ikke i formatet)
export function createOrientStats(orient = 'port', t = 0) { return { orient, t0: t, acts: { port: 0, land: 0 }, turns: 0, firstBridge: null, tries: 0 }; }
export function statsAct(S) { S.acts[S.orient]++; return S.acts.port + S.acts.land; }
export function statsTurn(S, orient) { if (S.orient === orient) return null; const from = S.orient; S.orient = orient; S.turns++; return { from, to: orient, turns: S.turns, acts: S.acts.port + S.acts.land }; }
export function statsTry(S) { S.tries++; return S.tries; }
export function statsWin(S, t) {
  if (S.firstBridge != null) return { first: false };
  S.firstBridge = t - S.t0;
  return { first: true, secs: S.firstBridge, orient: S.orient, acts: S.acts.port + S.acts.land, actsPort: S.acts.port, actsLand: S.acts.land, turns: S.turns, tries: S.tries };
}
export const winText = (w) => `første bro (${orientName(w.orient)}) etter ${w.secs.toFixed(0)} s, ${w.acts} byggehandlinger (stående ${w.actsPort}, liggende ${w.actsLand}), snudd ${w.turns} ganger, ${w.tries} prøver`;
