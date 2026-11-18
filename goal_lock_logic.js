// R89: beskjeden når spilleren står ved et låst mål. Ren logikk (testes i node, test_goals.mjs).
// En regel som stopper deg trenger alltid en kort beskjed: også uten hjelpetekster (Ekspert) står det «Målet er låst.»
// Med kontekst-hint på står i tillegg navnet på det som mangler. Ingen tvungen veiledning utover dette.
import { lockingGoals, goalLabel } from './goals.js';

// T = oversettelsesfunksjonen, hints = DIF.contextHints. Returnerer null når målet ikke er låst.
export function lockMessage(L, { hints, lang, T }) {
  const lock = lockingGoals(L); if (!lock.length) return null;
  return hints ? T('goal.locked', { name: goalLabel(lock[0], lang) }) : T('goal.lockedShort');
}
// Teksten til logEv('mål låst', …): id-ene til delmålene som mangler.
export const lockLogText = (L) => lockingGoals(L).map((q) => q.id).join(',');
