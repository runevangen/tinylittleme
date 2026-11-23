// Figurens stemme: korte replikker som sies (nettleserens talesyntese) og vises i en snakkeboble.
// All logikk om hva som sies, når og hvor ofte ligger her (uten DOM), så den kan testes i Node.
export const LINES = {
  thrown:     { say: ['Wææh!', 'Hjelp, en klovn!', 'Oi oi oi!'], en: ['Wahh!', 'Help, a clown!', 'Oh oh oh!'], gap: 5, p: 1 },
  hardland:   { say: ['Au!', 'Uff!', 'Oi, det svei!'], en: ['Ow!', 'Ouch!', 'Oh, that hurt!'], gap: 6, p: 1 },
  roll:       { say: ['Og rull!', 'Hoppla, rulle!', 'Der satt den.'], en: ['And roll!', 'Whoops, roll!', 'There it is.'], gap: 8, p: 0.8 },
  knockout:   { say: ['Aj aj aj!', 'Det var for langt ned!'], en: ['Ow ow ow!', 'That was too far down!'], gap: 6, p: 1, prio: true },
  fall:       { say: ['Hjelp!', 'Neeei!', 'Uææ!'], en: ['Help!', 'Noooo!', 'Waaah!'], gap: 10, p: 0.9 },
  softland:   { say: ['Myk landing!', 'Puh, det gikk bra.'], en: ['Soft landing!', 'Phew, that went well.'], gap: 12, p: 0.8 },
  vault:      { say: ['Stavhopp!', 'Hoppla!'], en: ['Pole vault!', 'Whoops!'], gap: 15, p: 0.7 },
  top:        { say: ['Så ja!', 'Puh!', 'Oppe!'], en: ['Yes!', 'Phew!', 'Made it up!'], gap: 14, p: 0.7 },
  tired:      { say: ['Armene mine!', 'Orker ikke mer.', 'Jeg mister taket!'], en: ['My arms!', 'Cannot go on.', 'I am losing my grip!'], gap: 12, p: 1 },
  gel:        { say: ['Klissete!', 'Fiks. Nå må det tørke.'], en: ['Sticky!', 'Nice. Now it has to dry.'], gap: 15, p: 0.9 },
  unroll:     { say: ['Der ruller båndet ut.', 'Dopapirbånd!'], en: ['There the strip rolls out.', 'Toilet paper strip!'], gap: 15, p: 0.9 },
  thread:     { say: ['Nå er den trædd.', 'Nål og tråd!'], en: ['Now it is threaded.', 'Needle and thread!'], gap: 15, p: 0.9 },
  soak:       { say: ['Svampen drikker.', 'Nå er den tung.', 'Full av vann!'], en: ['The sponge is drinking.', 'Now it is heavy.', 'Full of water!'], gap: 15, p: 0.9 },
  knot:       { say: ['En knute, og en til.', 'Håndkletau!'], en: ['A knot, and another.', 'Towel rope!'], gap: 15, p: 0.9 },
  press:      { say: ['Flat som en pannekake.', 'Nå er den lavere.'], en: ['Flat as a pancake.', 'Now it is lower.'], gap: 15, p: 0.9 },
  zip:        { say: ['Taubane!', 'Det blir en fin tur.'], en: ['Zip line!', 'This will be a nice ride.'], gap: 15, p: 0.9 },
  zipping:    { say: ['Wiiii!', 'Hurra!', 'Hold meg fast!'], en: ['Wheee!', 'Hooray!', 'Hold me tight!'], gap: 12, p: 0.9 },
  wink:       { say: ['Hei du!', 'Ja, det er meg.', 'Hehe.'], en: ['Hey you!', 'Yes, it is me.', 'Hehe.'], gap: 40, p: 0.6 },
  tore:       { say: ['Å nei!', 'Det holdt ikke!'], en: ['Oh no!', 'It did not hold!'], gap: 8, p: 1 },
  pickup:     { say: ['Den tar jeg.', 'Praktisk.', 'Den kan komme godt med.'], en: ['I will take that.', 'Handy.', 'That could come in useful.'], gap: 25, p: 0.45 },
  drop:       { say: ['Sånn.'], en: ['There.'], gap: 40, p: 0.3 },
  throw:      { say: ['Ta den!', 'Hei!'], en: ['Catch!', 'Hey!'], gap: 30, p: 0.5 },
  checkpoint: { say: ['Sjekkpunkt!', 'Her tar jeg en pause.', 'Lagret.'], en: ['Checkpoint!', 'I will take a break here.', 'Saved.'], gap: 10, p: 0.85 },
  goal:       { say: ['Motgiften! Endelig!'], en: ['The antidote! Finally!'], gap: 5, p: 1, prio: true },
  idle:       { say: ['Hm, hvor er utgangen?', 'Dette rommet er stort.', 'Jeg er veldig liten.'], en: ['Hm, where is the exit?', 'This room is big.', 'I am very small.'], gap: 40, p: 1 },
  yawn:       { say: ['Uaaah.'], en: ['Yaaawn.'], gap: 40, p: 1 },
  flush:      { say: ['Neeei! Ikke doen!'], en: ['Nooo! Not the toilet!'], gap: 5, p: 1, prio: true },
  pit:        { say: ['Plask!'], en: ['Splash!'], gap: 5, p: 1, prio: true },
  reset:      { say: ['Rydder opp.'], en: ['Tidying up.'], gap: 30, p: 0.6 },
};

// speak(text) / show(text, sekunder) / now() / rnd() injiseres. Globalt minstemellomrom (s) mellom replikker, unntatt prioriterte.
export function createVoice({ speak = () => {}, show = () => {}, now = () => Date.now() / 1000, rnd = Math.random, globalGap = 3, enabled = () => true, lang = () => 'nb' } = {}) {
  const last = {}; let lastAny = -1e9;
  function say(key, force = false) {
    const L = LINES[key]; if (!L || !enabled()) return null;
    const t = now();
    if (!force) {
      if (t - (last[key] ?? -1e9) < L.gap) return null;
      if (!L.prio && t - lastAny < globalGap) return null;
      if (rnd() > L.p) { last[key] = t - L.gap * 0.5; return null; }          // hoppet over: prøv igjen om en stund
    }
    const arr = (lang() === 'en' && L.en) || L.say, text = arr[Math.floor(rnd() * arr.length) % arr.length];   // R146: engelsk replikk når språket er English
    last[key] = t; lastAny = t;
    const secs = Math.max(1.5, text.length * 0.075 + 0.8);
    speak(text); show(text, secs);
    return { key, text, secs };
  }
  return { say, last };
}
