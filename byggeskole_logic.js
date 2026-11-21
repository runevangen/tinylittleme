// R95: Byggeskolen (Bygglab) i menyen: valgfri, men anbefalt. Ren logikk (ingen DOM, ingen three.js, testes i node: test_byggeskole.mjs).
// Beslutning (docs/PRIORITERT_BACKLOGG.md 0c): ingen tvang eller sperre foran byggebrettene. Her ligger: fremdriften n av 10 (bestått-lista fra rutenett-oppdragene, `tlm.gstage`),
// merkelappen på menyknappen (ANBEFALT til ett sted er bestått, så ✓ n/8), når det lille «Ny til bygging?»-kortet skal vises (én gang per enhet, aldri på Ekspert), og lagringen (`tlm.skole`).
export const SCHOOL = {
  levelId: 'bygglab',                      // teknisk id er uendret
  total: 10,                                // antall steder (test_byggeskole.mjs sjekker mot brettet)
  key: 'tlm.skole',                        // { opened, card: ''|'tried'|'skipped', done }
  from: 'tlm.skole.from',                  // brettet spilleren kom fra (så skolen ikke blir «sist spilte brett»)
  cardLevels: ['bro', 'trapp', 'vippe', 'kjokkenbro', 'leke', 'stue'],   // vanlige byggebrett der kortet kan vises
  hat: 'hardhat',                          // belønning når alle er klare (rewards.js)
};
export const schoolSiteIds = (total = SCHOOL.total) => Array.from({ length: total }, (_, i) => `lab${i + 1}`);

// ---------- fremdrift ----------
// passed: Set/array med bestått-id-er (passRead i grid_stage.js). Ukjente id-er telles ikke.
export function schoolProgress(passed, total = SCHOOL.total) {
  const ids = new Set(schoolSiteIds(total)), got = new Set([...(passed || [])].filter((x) => ids.has(x))), n = got.size;
  return { n, total, started: n >= 1, done: n >= total };
}
// merkelappen på menyknappen: ANBEFALT til spilleren har bestått minst ett sted, så «✓ n/10»
export function schoolBadge(prog) { return prog.started ? { kind: prog.done ? 'done' : 'progress', n: prog.n, total: prog.total } : { kind: 'recommended', n: 0, total: prog.total }; }

// ---------- lagring (tåler ødelagt data, aldri kast) ----------
export function schoolRead(st) {
  let o = null; try { o = st.get(SCHOOL.key, null); } catch { /* ingen lagring */ }
  const ok = o && typeof o === 'object' && !Array.isArray(o);
  return { opened: !!(ok && o.opened), card: ok && (o.card === 'tried' || o.card === 'skipped') ? o.card : '', done: !!(ok && o.done) };
}
export function schoolMark(st, patch) {
  try { const cur = schoolRead(st), next = { ...cur, ...patch }; st.set(SCHOOL.key, next); return next; } catch { return { ...schoolRead(st), ...patch }; }
}

// ---------- når kortet «Ny til bygging?» vises ----------
// Første gang byggeskjermen åpnes i et vanlig byggebrett, uten at Byggeskolen er åpnet, bare én gang, aldri på Ekspert, aldri i kinomodus, og bare hvis valget er på.
export function schoolCardShould({ level, difficulty, on = true, cinema = false, state, prog }) {
  if (!on || cinema || !state || difficulty === 'expert') return false;
  if (!SCHOOL.cardLevels.includes(level)) return false;
  return !state.opened && !state.card && !(prog && prog.started);
}
// «Byggeskolen er klar»: alle ti bestått, vises én gang
export const schoolDoneShould = ({ prog, state }) => !!prog && prog.done && !!state && !state.done;
// byggeskjermen er åpnet i skolen selv: da regnes skolen som åpnet (kortet vises aldri etterpå)
export const schoolOpenedNow = (level) => level === SCHOOL.levelId;
// adressen som åpner skolen direkte i byggeskjermen (labstart åpner den). skole=1: «sist spilte brett» endres ikke.
export const schoolUrl = (pathname = '') => `${pathname}?level=${SCHOOL.levelId}&skole=1`;
