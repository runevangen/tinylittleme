// Tekster som kan byttes mellom norsk (nb) og engelsk (en). Bare det som hører til knappene og tingene er med så langt;
// resten av spillet er norsk. Legg nye tekster her (begge språk), ikke rett i main.js.
export const LANGS = [['nb', 'Norsk'], ['en', 'English']];

const DICT = {
  nb: {
    'btn.take': 'TA', 'btn.drop': 'SLIPP', 'btn.place': 'SETT PÅ', 'btn.throw': 'KAST', 'btn.smear': 'SMØR', 'btn.unroll': 'RULL UT', 'btn.thread': 'TRÆ',
    'btn.tieTop': 'FEST OPPE', 'btn.tieEnd': 'FEST NEDE', 'btn.jump': 'HOPP', 'btn.grab': 'GREP',
    'hint.turn': 'Se mot {name} for å ta den ({look})', 'hint.look.touch': 'sveip', 'hint.look.pc': 'musa eller piltastene',
    'hint.take': 'ta {name}', 'hint.place': 'sett på {name}', 'hint.drop': 'slipp', 'hint.holdThrow': 'hold inne: kast', 'hint.dragThrow': 'hold inne og dra ned: sikt og kast',
    'hint.releaseThrow': 'Slipp {btn}: KAST', 'hint.smear': 'smør gel på veggen', 'hint.unroll': 'rull ut et bånd over kanten',
    'hint.needGel': 'Gå helt inntil en vegg, så smører {btn} gel', 'hint.needRoll': 'Gå helt ut til en kant, så ruller {btn} ut et bånd',
    'hint.thread': 'træ nålen med tråden', 'hint.needThread': 'Finn en trådsnelle å træ nålen med', 'hint.needNeedle': 'Finn en nål å træ tråden i',
    'hint.tieTop': 'fest tråden her (høyt oppe)', 'hint.tieEnd': 'Gå dit tråden skal ende (lavere), så fester {btn} den', 'hint.zipRide': '{btn}: heng deg i tråden og skli ned',
    'manual.title': 'Bruksanvisning', 'manual.item': 'Ting her', 'manual.show': 'Bruksanvisning', 'manual.near': 'Ting nær deg',
    'manual.goal': 'Mål: kom deg opp til flasken (motgiften). Pilen og kompasset viser neste hinder.',
    'manual.move.touch': 'Stikken (nede til venstre): gå. Halvveis ut = gå forsiktig. Sveip hvor som helst ellers: se deg rundt.',
    'manual.move.pc': 'WASD: gå (C = forsiktig). Klikk i bildet og bruk musa for å se deg rundt (Esc slipper).',
    'manual.jump': '{jump}: hopp. Hold inne for høyere hopp.',
    'manual.grab': '{grab}: grip kanten, tauet eller en klatreflate (oransje kant). Helt øverst hiver du deg over.',
    'manual.take': '{take}: ta og slipp ting. Knappen skifter navn når tingen kan brukes (SMØR, RULL UT, TRÆ …). Hold inne og dra ned for å sikte og kaste mot hårkorset.',
    'manual.cam': '{center}: sentrer kameraet (også dobbelttrykk). Trykk på kompasset for å snu mot neste hinder.',
    'manual.menu': '⚙: innstillinger, brett og testrapport. Lagre og Tilbake setter og henter lagringspunkt, Ting ↺ setter tingene tilbake. Fremgangen lagres automatisk.',
    'compass.goal': 'MÅL', 'compass.next': 'NESTE: {name}',
    'toast.threaded': 'Nålen er trædd. Gå til et høyt sted ved en kant og trykk {tieTop}.',
    'toast.tiedTop': 'Tråden er festet her. Gå dit den skal ende (lavere) og trykk {tieEnd}.',
    'toast.zipMade': 'Taubane! Gå tilbake til øvre ende og trykk {grab} for å henge deg i den.',
    'toast.needSpool': 'Gå bort til en trådsnelle og trykk {thread} for å træ nålen.', 'toast.needNeedle': 'Gå bort til en nål og trykk {thread} for å træ den.',
    'toast.zipFlat': 'For flatt: tråden må ende minst 8 cm lavere enn der den starter.', 'toast.zipFar': 'For langt: tråden rekker høyst ca. 1,2 m.',
    'toast.zipBlocked': 'Noe er i veien for tråden.', 'toast.zipStand': 'Stå på bakken og trykk {tieTop} for å feste tråden.',
    'toast.needGel': 'Gå helt inntil en vegg og trykk {smear}. {drop} legger fra seg.', 'toast.needRoll': 'Gå helt ut til en kant og trykk {unroll}. {drop} legger fra seg.',
  },
  en: {
    'btn.take': 'TAKE', 'btn.drop': 'DROP', 'btn.place': 'PLACE', 'btn.throw': 'THROW', 'btn.smear': 'SMEAR', 'btn.unroll': 'UNROLL', 'btn.thread': 'THREAD',
    'btn.tieTop': 'TIE UP', 'btn.tieEnd': 'TIE DOWN', 'btn.jump': 'JUMP', 'btn.grab': 'GRAB',
    'hint.turn': 'Look at {name} to pick it up ({look})', 'hint.look.touch': 'swipe', 'hint.look.pc': 'mouse or arrow keys',
    'hint.take': 'take {name}', 'hint.place': 'put on {name}', 'hint.drop': 'drop', 'hint.holdThrow': 'hold: throw', 'hint.dragThrow': 'hold and drag down to aim and throw',
    'hint.releaseThrow': 'Release {btn}: THROW', 'hint.smear': 'smear gel on the wall', 'hint.unroll': 'unroll a strip over the edge',
    'hint.needGel': 'Walk right up to a wall, then {btn} smears gel', 'hint.needRoll': 'Walk to an edge, then {btn} unrolls a strip',
    'hint.thread': 'thread the needle', 'hint.needThread': 'Find a spool of thread to thread the needle', 'hint.needNeedle': 'Find a needle to thread',
    'hint.tieTop': 'tie the thread here (up high)', 'hint.tieEnd': 'Walk to where the line should end (lower), then {btn} ties it', 'hint.zipRide': '{btn}: hang on the line and slide down',
    'manual.title': 'How to play', 'manual.item': 'This item', 'manual.show': 'How to play', 'manual.near': 'Item near you',
    'manual.goal': 'Goal: climb up to the bottle (the antidote). The arrow and compass show the next obstacle.',
    'manual.move.touch': 'Stick (bottom left): walk. Half-way = walk carefully. Swipe anywhere else: look around.',
    'manual.move.pc': 'WASD: walk (C = carefully). Click the picture and use the mouse to look around (Esc releases).',
    'manual.jump': '{jump}: jump. Hold for a higher jump.',
    'manual.grab': '{grab}: grab a ledge, rope or climbing surface (orange edge). At the very top you pull yourself over.',
    'manual.take': '{take}: pick up and put down things. The button changes name when the item can be used (SMEAR, UNROLL, THREAD …). Hold and drag down to aim and throw at the crosshair.',
    'manual.cam': '{center}: center the camera (double-tap too). Tap the compass to turn toward the next obstacle.',
    'manual.menu': '⚙: settings, level and test report. Save and Back set and recall a save point, Things ↺ puts things back. Progress is saved automatically.',
    'compass.goal': 'GOAL', 'compass.next': 'NEXT: {name}',
    'toast.threaded': 'The needle is threaded. Go to a high spot at an edge and press {tieTop}.',
    'toast.tiedTop': 'The thread is tied here. Go where it should end (lower) and press {tieEnd}.',
    'toast.zipMade': 'Zip line! Go back to the top end and press {grab} to hang on it.',
    'toast.needSpool': 'Walk to a spool of thread and press {thread} to thread the needle.', 'toast.needNeedle': 'Walk to a needle and press {thread} to thread it.',
    'toast.zipFlat': 'Too flat: the line must end at least 8 cm lower than where it starts.', 'toast.zipFar': 'Too far: the line reaches about 1.2 m at most.',
    'toast.zipBlocked': 'Something is in the way of the line.', 'toast.zipStand': 'Stand on the ground and press {tieTop} to tie the thread.',
    'toast.needGel': 'Walk right up to a wall and press {smear}. {drop} puts it down.', 'toast.needRoll': 'Walk to an edge and press {unroll}. {drop} puts it down.',
  },
};

// Visningsnavn per kind (ting i brettet). Ukjent kind: kallerens reserve (id).
export const NAMES = {
  needle: ['Nål', 'Needle'], spool: ['Trådsnelle', 'Spool of thread'], gel_bottle: ['Hårgelé', 'Hair gel'], gel: ['Gelé', 'Gel'], roll: ['Dopapirrull', 'Toilet roll'],
  paper_strip: ['Papirbånd', 'Paper strip'], paper_pile: ['Dopapirhaug', 'Paper pile'], qtip: ['Ørepinne', 'Cotton swab'], sponge: ['Svamp', 'Sponge'],
  towel: ['Håndkle', 'Towel'], towel_hang: ['Håndkle', 'Towel'], towel_hang_: ['Håndkle', 'Towel'], cup: ['Tannglass', 'Tooth glass'], toothbrush: ['Tannbørste', 'Toothbrush'],
  tube: ['Tannkrem', 'Toothpaste'], bottle: ['Flaske', 'Bottle'], shaver: ['Barbermaskin', 'Shaver'], basket: ['Vaskekurv', 'Laundry basket'], bag: ['Toalettveske', 'Toiletry bag'],
  mat: ['Dørmatte', 'Door mat'], book: ['Bok', 'Book'], vanity: ['Servantskap', 'Vanity'], vanity_top: ['Servant', 'Sink top'], tub: ['Badekar', 'Bathtub'],
  toilet_tank: ['Do (kasse)', 'Toilet tank'], toilet_bowl: ['Do (skål)', 'Toilet bowl'], toilet_lid: ['Do (lokk)', 'Toilet lid'], knob: ['Knott', 'Knob'], faucet: ['Kran', 'Faucet'],
  shelf: ['Hylle', 'Shelf'], chest: ['Kasse', 'Box'], pole: ['Stav', 'Pole'], caddy: ['Dusjkurv', 'Shower caddy'], sill: ['Vinduskarm', 'Window sill'], mirror: ['Speil', 'Mirror'],
};

export function makeT(getLang) {
  const T = (key, vars = {}) => {
    const s = DICT[getLang()]?.[key] ?? DICT.nb[key] ?? key;
    return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`));
  };
  const name = (kind, fallback) => { const n = NAMES[kind]; return n ? n[getLang() === 'en' ? 1 : 0] : fallback; };
  return { T, name };
}
export const DICT_KEYS = { nb: Object.keys(DICT.nb), en: Object.keys(DICT.en) };
