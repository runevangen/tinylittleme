// Figurens stemme: korte replikker som sies (nettleserens talesyntese) og vises i en snakkeboble.
// All logikk om hva som sies, når og hvor ofte ligger her (uten DOM), så den kan testes i Node.
export const LINES = {
  hardland:   { say: ['Au!', 'Uff!', 'Oi, det svei!'], gap: 6, p: 1 },
  knockout:   { say: ['Aj aj aj!', 'Det var for langt ned!'], gap: 6, p: 1, prio: true },
  fall:       { say: ['Hjelp!', 'Neeei!', 'Uææ!'], gap: 10, p: 0.9 },
  softland:   { say: ['Myk landing!', 'Puh, det gikk bra.'], gap: 12, p: 0.8 },
  vault:      { say: ['Stavhopp!', 'Hoppla!'], gap: 15, p: 0.7 },
  top:        { say: ['Så ja!', 'Puh!', 'Oppe!'], gap: 14, p: 0.7 },
  tired:      { say: ['Armene mine!', 'Orker ikke mer.', 'Jeg mister taket!'], gap: 12, p: 1 },
  gel:        { say: ['Klissete!', 'Fiks. Nå må det tørke.'], gap: 15, p: 0.9 },
  roll:       { say: ['Der ruller båndet ut.', 'Dopapir-tau!'], gap: 15, p: 0.9 },
  tore:       { say: ['Å nei!', 'Det holdt ikke!'], gap: 8, p: 1 },
  pickup:     { say: ['Den tar jeg.', 'Praktisk.', 'Den kan komme godt med.'], gap: 25, p: 0.45 },
  drop:       { say: ['Sånn.'], gap: 40, p: 0.3 },
  throw:      { say: ['Ta den!', 'Hei!'], gap: 30, p: 0.5 },
  checkpoint: { say: ['Sjekkpunkt!', 'Her tar jeg en pause.', 'Lagret.'], gap: 10, p: 0.85 },
  goal:       { say: ['Motgiften! Endelig!'], gap: 5, p: 1, prio: true },
  idle:       { say: ['Hm, hvor er utgangen?', 'Dette rommet er stort.', 'Jeg er veldig liten.'], gap: 40, p: 1 },
  yawn:       { say: ['Uaaah.'], gap: 40, p: 1 },
  flush:      { say: ['Neeei! Ikke doen!'], gap: 5, p: 1, prio: true },
  pit:        { say: ['Plask!'], gap: 5, p: 1, prio: true },
  reset:      { say: ['Rydder opp.'], gap: 30, p: 0.6 },
};

// speak(text) / show(text, sekunder) / now() / rnd() injiseres. Globalt minstemellomrom (s) mellom replikker, unntatt prioriterte.
export function createVoice({ speak = () => {}, show = () => {}, now = () => Date.now() / 1000, rnd = Math.random, globalGap = 3, enabled = () => true } = {}) {
  const last = {}; let lastAny = -1e9;
  function say(key, force = false) {
    const L = LINES[key]; if (!L || !enabled()) return null;
    const t = now();
    if (!force) {
      if (t - (last[key] ?? -1e9) < L.gap) return null;
      if (!L.prio && t - lastAny < globalGap) return null;
      if (rnd() > L.p) { last[key] = t - L.gap * 0.5; return null; }          // hoppet over: prøv igjen om en stund
    }
    const text = L.say[Math.floor(rnd() * L.say.length) % L.say.length];
    last[key] = t; lastAny = t;
    const secs = Math.max(1.5, text.length * 0.075 + 0.8);
    speak(text); show(text, secs);
    return { key, text, secs };
  }
  return { say, last };
}
