// R75: veiledning for rutenett-bygging. Ren logikk (ingen DOM; testes i node: test_gridguide.mjs).
// «Så slik»-guiden vises én gang første gang rutenett-modus brukes, kan hoppes over og åpnes igjen (?-knappen i byggeskjermen og ⚙ → Spill).
// Hint som peker på MODUS-knappen vises på steder med rutenett til modusen er brukt. Valgt modus huskes (tlm.gridmode).
// Guide og hint er hjelp: de følger vanskelighetsprofilen (gridHint i difficulty.js, R69) og er av på Ekspert. Alt med knapper, ingen taster.
export const KEY_SEEN = 'tlm.gridguide', KEY_MODE = 'tlm.gridmode', KEY_TIP = 'tlm.gridmodetip';
export const STEPS = ['point', 'point2', 'mat', 'try'];   // tekstnøkler: gguide.s.<steg>

export const isSeen = (st) => !!st.get(KEY_SEEN, 0);
export const markSeen = (st) => st.set(KEY_SEEN, 1);
export const resetSeen = (st) => st.set(KEY_SEEN, 0);
// Skal guiden komme av seg selv? on = ⚙-valget, hint = vanskelighetsprofilen (gridHint), seen = allerede sett.
export const shouldAutoShow = ({ on, hint, seen }) => !!on && !!hint && !seen;
// Skal ?-knappen finnes? Bare når rutenett er mulig her og hjelp er på (ikke Ekspert).
export const showHelpBtn = ({ enabled, hint }) => !!enabled && !!hint;
// MODUS-hint: på et sted med rutenett, i klassisk modus, før modusen er brukt, med hjelp på og stedet ikke låst.
export const shouldTipMode = ({ enabled, inGrid, hint, tipped, locked }) => !!enabled && !inGrid && !!hint && !tipped && !locked;

export const getMode = (st) => (st.get(KEY_MODE, 'classic') === 'grid' ? 'grid' : 'classic');
export const setModeMem = (st, m) => st.set(KEY_MODE, m === 'grid' ? 'grid' : 'classic');
// Ved inngang til et sted: bytt til rutenett automatisk bare når spilleren sist valgte rutenett, stedet tillater det, er åpent, og klassisk bygg er tomt.
export const shouldRestoreMode = ({ mem, enabled, inGrid, locked, placed }) => mem === 'grid' && !!enabled && !inGrid && !locked && !placed;
