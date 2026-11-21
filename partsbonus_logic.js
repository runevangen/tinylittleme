// R120: delene er der fra start; å samle dem i rommet er en valgfri bonus. Ren logikk (ingen DOM/three, kan testes i node).
// build.js bruker dette i open() (delebrettet), stageNow() (bonusbudsjett) og når en del plukkes (delmålet «Finn tre rare deler»).
export const PB = {
  maxBonus: 3,          // størst bonus på budsjettet (+1 per funnet del)
  need: 3,              // antall funnede deler som gir delmålet
  goalId: 'deler',      // id på det valgfrie flagg-delmålet
  minParts: 3,          // brett med færre deler får ikke delmålet
};

// Hvilke deler som ligger i delebrettet første gang stedet åpnes. På: alle (de funnede først, så resten i brettets rekkefølge). Av: bare de funnede.
export function trayIds(parts, on) {
  const list = Array.isArray(parts) ? parts : [];
  const got = list.filter((q) => q?.got).map((q) => q.id);
  if (!on) return got;
  return [...got, ...list.filter((q) => q && !q.got).map((q) => q.id)];
}
export const foundCount = (parts) => (Array.isArray(parts) ? parts : []).filter((q) => q?.got).length;
// bonusbudsjett: +1 per funnet del, opptil PB.maxBonus; 0 når valget er av (da er delene et krav som før)
export const bonusBudget = (found, on) => (on ? Math.max(0, Math.min(PB.maxBonus, Math.floor(+found || 0))) : 0);
export const withBonus = (stage, found, on) => (stage ? { ...stage, budget: stage.budget + bonusBudget(found, on) } : stage);
// delmålet «Finn tre rare deler»: valgfritt flagg-delmål, bare i brett med nok deler (ikke Bygglab)
export const needFor = (total) => Math.min(PB.need, Math.max(0, total | 0));
export const goalReached = (found, total) => total >= PB.minParts && found >= needFor(total);
export function partsGoal(L) {
  const total = (L?.build?.parts || []).length;
  if (total < PB.minParts || !(L?.build?.sites || []).length) return null;
  const n = needFor(total);
  return { id: PB.goalId, type: 'flag', flag: PB.goalId, label: `Finn ${n === 3 ? 'tre' : n} rare deler (bonus, valgfritt)`, en: `Find ${n} odd parts (bonus, optional)` };
}
// legger delmålet til etter initGoals; idempotent. Returnerer true når det ble lagt til.
export function addPartsGoal(L) {
  const g = partsGoal(L); if (!g || !Array.isArray(L.goalList)) return false;
  if (L.goalList.some((x) => x.id === g.id)) return false;
  L.goalList.push({ ...g, done: false }); return true;
}
// delene som skal ut av delebrettet når valget er av (ikke funnet, ikke plassert)
export function dropIds(parts, placedIds) {
  const placed = new Set(placedIds || []);
  return (Array.isArray(parts) ? parts : []).filter((q) => q && !q.got && !placed.has(q.id)).map((q) => q.id);
}
export const logLine = (on, found, total) => `deler fra start ${on ? 'på' : 'av'}: ${found}/${total} funnet som bonus`;
