// R125: runde 2 av Klossetrappa og Vippa («Runde 2» i brettvalget, valget `buildround2` i ⚙ → Spill). Ren logikk uten DOM, testes i node (test_round2.mjs).
// Runde 2-brettene er egne brett (`trapp2`, `vippe2`, laget av tools/make_round2.mjs); dagens brett er uendret. Valget slår bare av at de vises i brettlisten.
export const ROUND2 = { trapp2: { base: 'trapp', site: 'trapp2a', thing: 'tårn og ramper' }, vippe2: { base: 'vippe', site: 'vippe2a', thing: 'vippe på skrå' } };
export const isRound2 = (id) => Object.prototype.hasOwnProperty.call(ROUND2, id);
export const round2Ids = () => Object.keys(ROUND2);
// brettene som vises i ⚙ → Spill → Brett og i «neste brett»-knappen: runde 2-brettene bare når valget er på
export const visibleLevels = (levels, on) => (on ? levels : levels.filter((l) => !isRound2(l.id)));
// delt ut i to grupper for velgeren: vanlige og «Runde 2»
export const splitLevels = (levels, on) => ({ main: levels.filter((l) => !isRound2(l.id)), round2: on ? levels.filter((l) => isRound2(l.id)) : [] });
