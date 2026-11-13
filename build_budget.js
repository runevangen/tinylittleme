// R47: kostnad, stjerner og smulebudsjett for bygg. Ren logikk (ingen DOM, ingen three.js, kjøres i node).
//  - hver del og hver kobling har en kostnad (tabellene under); et vellykket bygg får 1-3 stjerner etter total kostnad og antall deler
//  - terskler per byggested står som data i scenen (`stars` på stedet), ellers brukes DEFAULT_STARS
//  - smuler «kjøper» ekstra deler: BONUS låser opp en ekstradel ved et antall smuler (tatt i brettet, eller beste noensinne i brettet)
// Lagring (beste stjerner og opplåste ekstradeler) ligger i rewards.js (tlm.bstars, tlm.bbonus).
export const PART_COST = {
  plank_s: 1, plank_l: 2, plank_t: 3, block: 1, weight: 4, seesaw: 3,          // tre er billig, tunge ting er dyre
  pencil: 1, ruler: 1, lego: 2, book: 4, sponge: 2,                 // leker (R46)
};
export const LINK_COST = { tape: 0, hinge: 1, rope: 1, band: 1 };
export const DEFAULT_COST = 2;                                       // ukjent del (skal ikke skje; testen passer på at alle deler har pris)
export const DEFAULT_STARS = { three: { cost: 4, parts: 3 }, two: { cost: 8, parts: 6 } };
// ekstradeler som smuler åpner. id-ene er egne (aldri lik en del i verdenen).
export const BONUS = [
  { id: 'bx1', at: 3, type: 'plank_s' },
  { id: 'bx2', at: 6, type: 'block' },
  { id: 'bx3', at: 9, type: 'plank_l' },
];
export const BONUS_IDS = BONUS.map((b) => b.id);
export const bonusTypes = () => Object.fromEntries(BONUS.map((b) => [b.id, b.type]));
export const isBonusId = (id) => BONUS_IDS.includes(id);

export const partCost = (type) => PART_COST[type] ?? DEFAULT_COST;
export const linkCost = (kind) => LINK_COST[kind] ?? 1;

// placed: [{ type }] (plasserte deler), links: [{ kind }]. Kun det som ligger på brettet teller.
export function buildCost(placed, links) {
  const ps = placed || [], ls = links || [];
  return { parts: ps.length, cost: ps.reduce((s, p) => s + partCost(p.type), 0) + ls.reduce((s, l) => s + linkCost(l.kind), 0) };
}
const num = (x) => (Number.isFinite(x) && x >= 0 ? x : null);
// terskler for et sted: { three: { cost, parts }, two: { cost, parts } }. Ugyldig eller manglende data faller tilbake på standard.
export function starThresholds(site) {
  const s = site?.stars, D = DEFAULT_STARS, one = (k) => {
    const c = num(s?.[k]?.cost), p = num(s?.[k]?.parts);
    return { cost: c ?? D[k].cost, parts: p ?? D[k].parts };
  };
  const three = one('three'), two = one('two');
  return { three, two: { cost: Math.max(two.cost, three.cost), parts: Math.max(two.parts, three.parts) } };   // to stjerner er aldri strengere enn tre
}
// stjerner (1-3) for et vellykket bygg + hva som skal til for neste stjerne (null ved tre)
export function starsFor(site, placed, links) {
  const { cost, parts } = buildCost(placed, links), T = starThresholds(site);
  const stars = cost <= T.three.cost && parts <= T.three.parts ? 3 : cost <= T.two.cost && parts <= T.two.parts ? 2 : 1;
  const next = stars === 3 ? null : stars === 2 ? { stars: 3, ...T.three } : { stars: 2, ...T.two };
  return { cost, parts, stars, next };
}
export const starText = (n) => { const k = Math.max(0, Math.min(3, Math.round(n) || 0)); return '★'.repeat(k) + '☆'.repeat(3 - k); };
// er a bedre enn b? (flere stjerner, så lavere kostnad, så færre deler)
export const betterBuild = (a, b) => !b || a.stars > b.stars || (a.stars === b.stars && (a.cost < b.cost || (a.cost === b.cost && a.parts < b.parts)));

// ---------- smulebudsjett ----------
// step: multiplikator på terskelen (admin; 1 = standard). Returnerer de ekstradelene som er åpne ved dette antallet smuler.
export const bonusAt = (b, step = 1) => Math.max(1, Math.round(b.at * (step > 0 ? step : 1)));
export const unlockedBonus = (crumbs, step = 1) => BONUS.filter((b) => (crumbs || 0) >= bonusAt(b, step));
export const nextBonus = (crumbs, step = 1) => BONUS.find((b) => (crumbs || 0) < bonusAt(b, step)) || null;
