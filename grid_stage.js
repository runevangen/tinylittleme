// R74: rutenett-brett med mål, budsjett og tung last (Poly Bridge / Bridge Constructor). Ren logikk (ingen DOM, ingen three.js, kjøres i node: test_gridstage.mjs).
// Hvert Bygglab-sted har i rutenett-modus et «oppdrag» (`site.grid.stage`, data fra tools/make_bygglab.mjs):
//   loads   hvilke laster som alle må over (ball, bil, robot, figur; ukjente forkastes)
//   massK   hvor mye tyngre lasten er enn vanlig (1 = som i klassisk modus); gjelder bare rutenett-prøven
//   budget  mest du får bruke (kostnad: build_budget.js, stav = pris per lengde)
// Stjerner (billigere = flere) kommer fra `site.grid.stars` (build_budget.starsFor). Bestått = alle lastene over OG kostnaden innenfor budsjettet.
// Bestått sted åpner neste (bare for rutenett-bygging; klassisk modus er uendret). Hva som er bestått lagres i `tlm.gstage` = { brett: [sted-id] } (store.get/set som rewards.js).
// Fysikken er uendret (build_phys.js), bare lasten kan veie massK ganger så mye (opts.massK), så samme bygg og last gir samme resultat hver gang.
import { isLoad, DEFAULT_LOAD } from './build_loads.js';
import { starsFor, starText } from './build_budget.js';

export const STAGE = { massMax: 40, budgetMax: 200, key: 'tlm.gstage' };

const uniq = (a) => [...new Set(a)];
// oppdraget for et sted (ugyldig eller manglende data gir null; ukjente laster forkastes; uten gyldig last brukes testfiguren)
export function stageOf(site) {
  const s = site?.grid?.stage; if (!s || typeof s !== 'object') return null;
  const loads = uniq((Array.isArray(s.loads) ? s.loads : []).filter(isLoad)), massK = Number.isFinite(s.massK) ? Math.min(STAGE.massMax, Math.max(0.1, s.massK)) : 1;
  const budget = Number.isFinite(s.budget) && s.budget > 0 ? Math.min(STAGE.budgetMax, s.budget) : null; if (budget === null) return null;
  const wind = Number.isFinite(s.wind) && s.wind > 0 ? Math.min(3, s.wind) : 0;   // R123: sidekraft (vind) i prøven: bare to-lags bygg (dobbel bro) tåler den
  const mats = Array.isArray(site.grid.mats) ? site.grid.mats.filter((m) => typeof m === 'string') : [];   // R127: stedet snevrer inn materialene (Hengebro: tre og kabel)
  return { loads: loads.length ? loads : [DEFAULT_LOAD], massK, budget, key: site.lab?.key || site.id, ...(wind ? { wind } : {}), ...(mats.length ? { mats } : {}) };
}
export const hasStage = (site) => !!stageOf(site);
// innstillingene (admin) justerer: massK og budsjett gjøres om med en faktor, avrundet
export function stageScaled(site, { massK = 1, budgetK = 1 } = {}) {
  const s = stageOf(site); if (!s) return null;
  const mk = Number.isFinite(massK) && massK > 0 ? massK : 1, bk = Number.isFinite(budgetK) && budgetK > 0 ? budgetK : 1;
  return { ...s, massK: Math.min(STAGE.massMax, +(s.massK * mk).toFixed(2)), budget: Math.max(1, Math.round(s.budget * bk)) };
}
// stedet slik lastkravene ser det (build_loads.js: requiredLoads/offered/afterWin leser `site.loads`)
export const stageSite = (site, st) => (st ? { ...site, loads: st.loads } : site);

// ---------- vurdering etter prøve ----------
// res: { cost, parts, stars } fra starsFor. Over budsjett = holdt, men for dyrt (teller ikke som bestått).
export const overBudget = (st, cost) => !!st && cost > st.budget;
export function judge(site, st, placed, links, { loadsDone = false, extra } = {}) {
  const r = starsFor(site, placed, links, extra), over = overBudget(st, r.cost);
  return { ...r, budget: st ? st.budget : null, over, passed: !!st && loadsDone && !over };
}
// hva som mangler for neste stjerne, som tekst-nøkkel + tall (null ved tre stjerner)
export const nextStarOf = (r) => (r.next ? { stars: r.next.stars, cost: r.next.cost, parts: r.next.parts } : null);

// ---------- rekkefølge og låsing ----------
export const stagesOf = (sites) => (sites || []).filter(hasStage).sort((a, b) => (a.lab?.n || 0) - (b.lab?.n || 0));
export const stageIndex = (sites, id) => stagesOf(sites).findIndex((s) => s.id === id);
// forrige oppdrag (null for det første)
export const stagePrev = (sites, id) => { const l = stagesOf(sites), i = l.findIndex((s) => s.id === id); return i > 0 ? l[i - 1] : null; };
export const stageNext = (sites, id) => { const l = stagesOf(sites), i = l.findIndex((s) => s.id === id); return i >= 0 && i < l.length - 1 ? l[i + 1] : null; };
// låst = det finnes et forrige oppdrag som ikke er bestått. lockOn = false: alt åpent.
export function stageLocked(sites, passed, id, lockOn = true) {
  if (!lockOn) return false; const p = stagePrev(sites, id); return !!p && !(passed && passed.has(p.id));
}

// ---------- lagring ----------
export function passRead(st, levelId) {
  const all = st.get(STAGE.key, {}), a = all && typeof all === 'object' && !Array.isArray(all) ? all[levelId] : null;
  return new Set(Array.isArray(a) ? a.filter((x) => typeof x === 'string' && x.length < 40) : []);
}
// legger til et bestått sted; returnerer { first } (false når det allerede lå der)
export function passRecord(st, levelId, siteId) {
  if (!levelId || typeof siteId !== 'string') return { first: false };
  const cur = passRead(st, levelId); if (cur.has(siteId)) return { first: false };
  const all = st.get(STAGE.key, {}), root = all && typeof all === 'object' && !Array.isArray(all) ? all : {}; cur.add(siteId); root[levelId] = [...cur]; st.set(STAGE.key, root); return { first: true };
}
export function passClear(st, levelId) { const all = st.get(STAGE.key, {}); if (all && typeof all === 'object' && !Array.isArray(all) && all[levelId]) { delete all[levelId]; st.set(STAGE.key, all); return true; } return false; }

// ---------- tekst: linjene i infokortet ----------
// s: { st (oppdraget), cost, parts, stars, next, over, passed, ran (har prøven gått ferdig), won (siste prøve vant), loadsLeft (laster som mangler), peak (tekst om staven som brakk først / nærmest brudd), on (noe er bygget) }
// T = tekstfunksjon. Returnerer [{ t, c, b }] (farge, fet), tomme linjer er ikke med.
export function stageLines(s, T) {
  if (!s || !s.st) return [];
  const loads = s.st.loads.map((i) => T('build.load.' + i)).join(' + '), heavy = s.st.massK > 1.001 ? T('gstage.heavy', { k: String(+s.st.massK.toFixed(1)).replace('.', ',') }) : '';
  const out = [{ t: T('gstage.goal', { loads, heavy, budget: s.st.budget }), c: '#9fe3ff', b: true }];
  if (s.r2 && !(s.ran && s.passed)) out.push({ t: T(s.r2.bonus ? 'r2.goalLine3' : 'r2.goalLine', { cost: s.r2.cheap, k: String(+s.r2.light.toFixed(1)).replace('.', ',') }), c: '#ffe9a8' });   // R126: runde 2-mål (billigst, lettest, smule)
  if (s.st.wind) out.push({ t: T('d25.windGoal'), c: '#ffe9a8', b: true });   // R123
  if (s.ran && s.passed) out.push({ t: T('gstage.passed', { stars: starText(s.stars), cost: s.cost, budget: s.st.budget }), c: '#7dffb0', b: true });
  else if (s.ran && s.won && s.over) out.push({ t: T('gstage.over', { cost: s.cost, budget: s.st.budget }), c: '#ff9a8a', b: true });
  else if (s.ran && s.won) out.push({ t: T('gstage.moreLoads', { list: (s.loadsLeft || []).map((i) => T('build.load.' + i)).join(', ') }), c: '#ffe9a8', b: true });
  else if (s.ran) out.push({ t: T('gstage.failed'), c: '#ff9a8a', b: true });
  const left = s.st.budget - s.cost;
  if (s.on) { if (!(s.ran && s.passed)) out.push({ t: T('gstage.cost', { stars: starText(s.over ? 0 : s.stars), cost: s.cost, budget: s.st.budget, parts: s.parts }), c: s.over ? '#ff9a8a' : '#ffe9a8', b: !s.ran }); }
  else out.push({ t: s.st.mats ? T('gstage.emptyMats', { budget: s.st.budget, list: s.st.mats.map((m) => T('grid.mat.' + m).toLowerCase()).join(' ' + T('gstage.and') + ' ') }) : T('gstage.empty', { budget: s.st.budget }), c: '#ffd9a0' });
  if (s.on && !s.ran) out.push({ t: s.over ? T('gstage.overNow', { n: -left }) : s.next ? T('gstage.nextStar', { n: s.next.cost }) : T('gstage.threeStars'), c: s.over ? '#ff9a8a' : '#ffd9a0' });
  if (s.tip && !(s.ran && s.passed)) out.push({ t: T('gstage.squareTip'), c: '#ffd9a0', b: true });   // R119: firkant uten diagonal
  if (!s.ran && s.done) out.push({ t: T('gstage.done'), c: '#7dffb0', b: true });
  if (s.ran && s.peak && !s.passed) out.push({ t: s.peak, c: '#ffd9a0' });
  return out;
}
export const stageLockText = (sites, id, T) => { const p = stagePrev(sites, id); return T('gstage.locked', { n: p?.lab?.n || 0, name: p ? T('lab.name.' + (p.lab?.key || p.id)) : '' }); };
