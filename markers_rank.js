// R66: markørbudsjett og rangering. Ren logikk (ingen DOM/three, testes i test_markrank.mjs); tegningen står i readable_view.js / guide_view.js, koblingen i main.js.
// Tre nivåer: (a) mål: én retningsangivelse om gangen, (b) neste grep: høyst 2, (c) info (ⓘ): bare nær, ulest og når ingen annen markør konkurrerer.
// Budsjettet følger hjelp-nivået (Ingen = 0, Normal = 3, Mye = 6) og teller målmarkøren med.
export const MARK = {
  budgetNone: 0, budgetNormal: 3, budgetMuch: 6,
  maxGrip: 2,          // høyst så mange grep-markører samtidig
  merge: 90,           // px: to markører nærmere enn dette slås sammen (den med høyest rang beholdes)
  gripRange: 24,       // brettenheter: lenger unna enn dette vises ingen grep-markør
  cone: 0.95,          // rad: halvvinkel på kjeglen foran figuren (ca. 55 grader)
  infoNear: 13,        // brettenheter: ⓘ vises bare nærmere enn dette
  wearN: 6,            // etter så mange grep på samme flate dempes markøren til en tynn kontur
  stallMs: 30000,      // uten framdrift så lenge: dempede markører vises tydelig igjen
  farAlpha: 0.45,      // gjennomsiktighet langt unna (1 = full)
  farScale: 0.7,       // størrelse langt unna (1 = full)
  thinAlpha: 0.5,      // ekstra demping av en tynn kontur
};

export const budgetFor = (help, o = {}) => (help === 'none' ? (o.none ?? MARK.budgetNone) : help === 'much' ? (o.much ?? MARK.budgetMuch) : (o.normal ?? MARK.budgetNormal));

const clamp01 = (v) => Math.max(0, Math.min(1, v));
// vinkel (rad, 0..π) mellom figurens blikk (fx, fz) og retningen til markøren (dx, dz)
export function angOff(fx, fz, dx, dz) {
  const fl = Math.hypot(fx, fz), dl = Math.hypot(dx, dz);
  if (fl < 1e-9 || dl < 1e-9) return 0;
  return Math.acos(Math.max(-1, Math.min(1, (fx * dx + fz * dz) / (fl * dl))));
}

// Poeng (0..~4): nærhet + retning (kjegle foran figuren) + på ruta + ikke brukt ofte før + prioritet. c: { dist, ang, route, used, prio }
export function score(c, o = {}) {
  const range = o.range ?? MARK.gripRange, cone = o.cone ?? MARK.cone, wear = o.wearN ?? MARK.wearN;
  const near = 1 - clamp01((c.dist ?? 0) / range);
  const dir = (c.ang ?? 0) <= cone ? 1 - 0.4 * ((c.ang ?? 0) / cone) : Math.max(0, 0.45 - 0.2 * (((c.ang ?? 0) - cone) / (Math.PI - cone)));
  const route = c.route ? 1 : 0;
  const fresh = 1 / (1 + (c.used ?? 0) / Math.max(1, wear));
  return near * 1.4 + dir * 1.0 + route * 0.9 + fresh * 0.5 + (c.prio ?? 0) * 0.6;
}

// kandidater: { id, tier: 'goal'|'grip'|'info', dist, ang, route, used, prio, sx, sy (skjermpiksler, valgfritt), read (info: lest) }
// ctx: { merge, maxGrip, infoNear, gripRange, cone, wearN }; budget: heltall (0 = ingen verdensmarkører)
// Returnerer { picked: [kandidater i rangert rekkefølge], primary: id|null, dropped: [{ id, why }] }
export function selectMarkers(cands, ctx = {}, budget = MARK.budgetNormal) {
  const out = { picked: [], primary: null, dropped: [] };
  const drop = (c, why) => out.dropped.push({ id: c.id, why });
  if (!(budget > 0)) { for (const c of cands) drop(c, 'budsjett 0'); return out; }
  const merge = ctx.merge ?? MARK.merge, maxGrip = ctx.maxGrip ?? MARK.maxGrip, infoNear = ctx.infoNear ?? MARK.infoNear;
  const so = { range: ctx.gripRange, cone: ctx.cone, wearN: ctx.wearN };
  const tiers = { goal: [], grip: [], info: [] };
  for (const c of cands) (tiers[c.tier] || tiers.grip).push({ ...c, rank: score(c, so) });
  const byRank = (a, b) => b.rank - a.rank || (a.dist ?? 0) - (b.dist ?? 0) || String(a.id).localeCompare(String(b.id));
  for (const k of Object.keys(tiers)) tiers[k].sort(byRank);
  const clash = (c) => c.sx !== undefined && c.sy !== undefined && out.picked.some((p) => p.sx !== undefined && Math.hypot(p.sx - c.sx, p.sy - c.sy) < merge);
  const take = (c) => { out.picked.push(c); };
  // (a) mål: høyst ett (den høyeste prioriteten, så nærmeste)
  const goals = tiers.goal.sort((a, b) => (b.prio ?? 0) - (a.prio ?? 0) || (a.dist ?? 0) - (b.dist ?? 0));
  if (goals.length) { take(goals[0]); for (const c of goals.slice(1)) drop(c, 'bare ett mål'); }
  // (b) neste grep: høyst maxGrip, innenfor budsjettet, ikke oppå en høyere rangert markør på skjermen
  let ng = 0;
  for (const c of tiers.grip) {
    if ((c.dist ?? 0) > (ctx.gripRange ?? MARK.gripRange)) { drop(c, 'for langt'); continue; }
    if (ng >= maxGrip) { drop(c, 'grep-tak'); continue; }
    if (out.picked.length >= budget) { drop(c, 'budsjett'); continue; }
    if (clash(c)) { drop(c, 'slått sammen'); continue; }
    take(c); ng++;
  }
  // (c) info: bare nær, ulest, når ingen grep-markør konkurrerer, og bare én
  let infoTaken = false;
  for (const c of tiers.info) {
    if (c.read) { drop(c, 'lest'); continue; }
    if ((c.dist ?? 0) > infoNear) { drop(c, 'ikke nær'); continue; }
    if (ng > 0 || infoTaken) { drop(c, 'konkurranse'); continue; }
    if (out.picked.length >= budget) { drop(c, 'budsjett'); continue; }
    if (clash(c)) { drop(c, 'slått sammen'); continue; }
    take(c); infoTaken = true;
  }
  // (a) har først og fremst rang: primary er den første (mål, ellers beste grep, ellers info)
  out.primary = out.picked.length ? out.picked[0].id : null;
  return out;
}

// Demping etter avstand og erfaring. Returnerer { scale, alpha, thin }.
// c: { dist, used }, o: { range, wearN, stalledMs, much (hjelp-nivå Mye) }
export function markerStyle(c, o = {}) {
  const range = o.range ?? MARK.gripRange, k = clamp01((c.dist ?? 0) / range);
  let scale = 1 - (1 - MARK.farScale) * k, alpha = 1 - (1 - MARK.farAlpha) * k;
  const worn = (c.used ?? 0) >= (o.wearN ?? MARK.wearN) && (o.wearN ?? MARK.wearN) > 0;
  const revive = !!o.much || (o.stalledMs ?? 0) >= (o.stallMs ?? MARK.stallMs);
  const thin = worn && !revive;
  if (thin) { scale *= 0.85; alpha *= MARK.thinAlpha; }
  return { scale, alpha, thin };
}

// Retningsangivelse til målet: ring på selve målet når det er i bildet, ellers én pil (kantmerke eller gulvpil), og båndets chevron bare når pila ikke er i bildet.
// inFrame: målet er synlig på skjermen. help: 'none'|'normal'|'much'.
export function goalDirection({ inFrame, help, show }) {
  if (!show) return { ring: false, arrow: false, chevron: false };
  if (help === 'none') return { ring: false, arrow: false, chevron: true };              // Ingen: ingen verdensmarkører, bare båndet
  if (inFrame) return { ring: true, arrow: false, chevron: true };
  return { ring: false, arrow: true, chevron: false };                                    // pila i bildet ELLER chevron i båndet, aldri begge
}

// Slå sammen markører på skjermen: behold den med høyest rang når to ligger nærmere enn minPx. list: [{ id, rank, sx, sy }]
export function mergeByScreen(list, minPx = MARK.merge) {
  const kept = [], gone = [];
  for (const c of [...list].sort((a, b) => b.rank - a.rank)) {
    if (kept.some((k) => Math.hypot(k.sx - c.sx, k.sy - c.sy) < minPx)) gone.push(c); else kept.push(c);
  }
  return { kept, gone };
}

// Teller grep per flate (for «brukt ofte»). Rent objekt: { [id]: antall }
export function noteGrab(use, id) { if (!id) return 0; use[id] = (use[id] || 0) + 1; return use[id]; }

// Kort tekst til loggen: hvilke markører som vises nå.
export const planKey = (sel) => sel.picked.map((c) => `${c.tier}:${c.id}`).join(',');
