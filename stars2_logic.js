// R126: runde 2 av Badebroen og Byggeskolen: ekstra stjerner («bygg billigst», «bygg lettest»), valgfri smule midt på spennet og beste-liste per sted.
// Ren logikk (ingen DOM, ingen three.js, kjøres i node: test_stars2.mjs). Delt av alle rutenett-steder med oppdrag (R101: Badebroen og Bygglab-stedene bruker samme kode).
// Bak ⚙-valget `buildstars2`. Terskler og bevisbygg per sted står i `stars2_data.js` (generert av tools/make_stars2.mjs med den ekte fysikken).
//  - BILLIGST: bestått bygg med kostnad ≤ terskelen (den billigste vi har funnet som består alle lastene)
//  - LETTEST:  bestått bygg med vekt ≤ terskelen (staver: lengde × masse per enhet; tau og tre er lettere enn stål)
//  - SMULE:    bestått bygg med en knute midt på spennet over veien, festet i bygget (stav som henger sammen med et anker): en omvei som krever en ekstra knute og staver dit
//  - BESTE:    de tre beste bestått-byggene per sted (lavest kostnad, så vekt, så deler), lagret i `tlm.best2`
import { parseRod, GRID_MAT } from './build_materials.js';
import { buildCost } from './build_budget.js';
import { exampleSpec } from './grid_example.js';
import { STARS2_DATA } from './stars2_data.js';

export const STARS2 = { key: 'tlm.best2', top: 3, bonusR: 0.06, extraW: 0.6, kinds: ['cheap', 'light', 'bonus'] };

// ---------- mål ----------
export const rodWeight = (type) => { const r = parseRod(type); return r ? r.len * (GRID_MAT[r.mat]?.m ?? 0) : 0; };
// extra: { cost, parts } fra dobbel bro (grid_25d.extraOf): tverrstag og kopi veier som stål per kostnad (grov, men samme hver gang)
export function measure(placed, links, extra) {
  const c = buildCost(placed, links, extra), w = (placed || []).reduce((s, p) => s + rodWeight(p.type), 0) + (Number.isFinite(extra?.cost) ? extra.cost * STARS2.extraW : 0);
  return { cost: c.cost, parts: c.parts, weight: +w.toFixed(3) };
}
export const weightText = (w) => String(+(+w || 0).toFixed(1)).replace('.', ',');

// ---------- steder ----------
const dataOf = (site, levelId) => { const d = STARS2_DATA[site?.id]; return d && (!levelId || d.level === levelId) ? d : null; };
export const hasRound2 = (site, levelId) => !!dataOf(site, levelId);
// den knuten midt på spennet som en bygd bro kan «samle» smulen på: den øverste knuten i eksempelbroen nærmest midten (ligger alltid på rutenettet). null uten veilinje.
export function bonusPoint(site) {
  const sp = exampleSpec(site); if (!sp || !sp.nodes.length) return null;
  const mid = (sp.cols[0].u + sp.cols[sp.N].u) / 2; let best = null;
  for (const [, u, v] of sp.nodes) if (!best || Math.abs(u - mid) < Math.abs(best.u - mid) - 1e-9) best = { u, v };
  return best;
}
export const targetsOf = (site, levelId) => { const d = dataOf(site, levelId); return d ? { cheap: d.cheap, light: d.light, bonus: d.bonus || null } : null; };
// endepunktene til stavene (fra B.placed i rutenett: midtpunkt + rot + lengde)
export function endpoints(placed) {
  const out = []; for (const p of placed || []) { const r = parseRod(p.type); if (!r) continue; const dx = Math.cos(p.rot || 0) * r.len / 2, dy = Math.sin(p.rot || 0) * r.len / 2; out.push([p.u - dx, p.v - dy], [p.u + dx, p.v + dy]); }
  return out;
}
// staver som henger sammen med et anker (via ledd): en stav som bare flyter i lufta teller ikke
export function connectedRods(placed, links) {
  const ids = new Set((placed || []).map((p) => p.id)), adj = new Map(), seen = new Set(), q = [];
  for (const l of links || []) { if (l.b == null || l.g) { if (ids.has(l.a) && !seen.has(l.a)) { seen.add(l.a); q.push(l.a); } } else if (ids.has(l.a) && ids.has(l.b)) { (adj.get(l.a) || adj.set(l.a, []).get(l.a)).push(l.b); (adj.get(l.b) || adj.set(l.b, []).get(l.b)).push(l.a); } }
  while (q.length) { const x = q.pop(); for (const y of adj.get(x) || []) if (!seen.has(y)) { seen.add(y); q.push(y); } }
  return seen;
}
export function bonusHit(bonus, placed, links) {
  if (!bonus) return false; const con = connectedRods(placed, links);
  return endpoints((placed || []).filter((p) => con.has(p.id))).some(([u, v]) => Math.hypot(u - bonus.u, v - bonus.v) <= STARS2.bonusR);
}

// ---------- vurdering ----------
// passed: oppdraget er bestått (alle laster over, innenfor budsjett). Uten bestått gir ingen ekstra stjerner.
// Returnerer null når stedet ikke har runde 2; ellers { cheap, light, bonus, n (0-3), m (mål), got: ['cheap', ...], targets }
export function evaluate({ site, levelId, placed, links, extra, passed }) {
  const T = targetsOf(site, levelId); if (!T) return null;
  const m = measure(placed, links, extra), ok = !!passed;
  const cheap = ok && m.cost <= T.cheap, light = ok && m.weight <= T.light + 1e-6, bonus = ok && !!T.bonus && bonusHit(T.bonus, placed, links);
  const got = STARS2.kinds.filter((k) => ({ cheap, light, bonus }[k]));
  return { cheap, light, bonus, n: got.length, got, m, targets: T };
}

// ---------- lagring og beste-liste ----------
// tlm.best2 = { brett: { sted: { got: ['cheap', ...], list: [{ cost, weight, parts, stars, v }] } } }
const cleanEntry = (e) => (e && Number.isFinite(e.cost) && Number.isFinite(e.weight) && Number.isFinite(e.parts) ? { cost: e.cost, weight: +e.weight, parts: e.parts, stars: Math.max(0, Math.min(6, e.stars | 0)), v: String(e.v || '').slice(0, 12) } : null);
export const better = (a, b) => a.cost < b.cost || (a.cost === b.cost && (a.weight < b.weight || (a.weight === b.weight && a.parts < b.parts)));
function readAll(st) { let all = null; try { all = st.get(STARS2.key, {}); } catch { /* ingen lagring */ } return all && typeof all === 'object' && !Array.isArray(all) ? all : {}; }
export function readSite(st, levelId, siteId) {
  const lv = readAll(st)[levelId], s = lv && typeof lv === 'object' ? lv[siteId] : null;
  const got = s && Array.isArray(s.got) ? STARS2.kinds.filter((k) => s.got.includes(k)) : [], list = (s && Array.isArray(s.list) ? s.list : []).map(cleanEntry).filter(Boolean).sort((a, b) => (better(a, b) ? -1 : better(b, a) ? 1 : 0)).slice(0, STARS2.top);
  return { got, list };
}
// legger et bestått bygg i lista og husker hvilke ekstra stjerner som er tatt. ev = resultatet av evaluate(); entry = { cost, weight, parts, stars, v }.
// Returnerer { rank (1-based plass i lista, 0 = kom ikke med), isNew (ny plass 1), newGot (nye ekstra stjerner), got }
export function record(st, levelId, siteId, ev, entry) {
  const cur = readSite(st, levelId, siteId), e = cleanEntry(entry); let rank = 0, isNew = false;
  const got = [...new Set([...cur.got, ...(ev ? ev.got : [])])], newGot = got.filter((k) => !cur.got.includes(k));
  let list = cur.list;
  if (e && !list.some((x) => x.cost === e.cost && x.weight === e.weight && x.parts === e.parts)) { list = [...list, e].sort((a, b) => (better(a, b) ? -1 : better(b, a) ? 1 : 0)).slice(0, STARS2.top); }
  if (e) { const i = list.findIndex((x) => x.cost === e.cost && x.weight === e.weight && x.parts === e.parts); rank = i >= 0 ? i + 1 : 0; isNew = rank === 1 && !cur.list.some((x) => x.cost === e.cost && x.weight === e.weight && x.parts === e.parts); }
  try { const all = readAll(st), lv = all[levelId] && typeof all[levelId] === 'object' ? all[levelId] : {}; lv[siteId] = { got, list }; all[levelId] = lv; st.set(STARS2.key, all); } catch { /* ingen lagring */ }
  return { rank, isNew, newGot, got, list };
}
export const clearAll = (st) => { try { st.set(STARS2.key, {}); } catch { /* ingen lagring */ } };
// antall ekstra stjerner tatt / mulige i et brett (sites: brettets steder; bare steder med runde 2 teller)
export function summary(st, levelId, sites) {
  let n = 0, total = 0; for (const s of sites || []) { const T = targetsOf(s, levelId); if (!T) continue; total += T.bonus ? 3 : 2; n += readSite(st, levelId, s.id).got.length; }
  return { n, total };
}
// som summary, men uten stedene: bare tallene fra stars2_data.js og lagringen (menyen kjenner ikke brettet)
export function summaryOf(st, levelId) {
  let n = 0, total = 0; for (const [id, d] of Object.entries(STARS2_DATA)) { if (d.level !== levelId) continue; total += d.bonus ? 3 : 2; n += readSite(st, levelId, id).got.length; }
  return { n, total };
}
// hvor mange steder har runde 2 (til kravet «minst fire»)
export const sitesWith = (sites, levelId) => (sites || []).filter((s) => hasRound2(s, levelId));

// ---------- tekst: chips og beste-liste ----------
// ev: evaluate(); got: tidligere tatt (readSite().got). Returnerer [{ k, ok, now, label }] i fast rekkefølge (bonus bare der stedet har en smule)
export function chips(ev, got = []) {
  if (!ev) return [];
  return STARS2.kinds.filter((k) => k !== 'bonus' || ev.targets.bonus).map((k) => ({ k, ok: !!ev[k], had: got.includes(k), target: k === 'cheap' ? ev.targets.cheap : k === 'light' ? ev.targets.light : null }));
}
