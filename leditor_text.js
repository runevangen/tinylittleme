// R152: tekster for «Lag brett fra bilder» (norsk og engelsk). Bare knapper (ingen taster). Ren data, ingen DOM.
const TX = {
  nb: {
    btn: 'LAG BRETT FRA BILDER', btnSub: 'Ta 2–4 bilder av et rom eller et sted ute, og få et brett', title: 'Lag brett fra bilder',
    setting: 'Lag brett fra bilder (testere): VELG BRETT får knappen LAG BRETT FRA BILDER, som lager et spillbart brett av 2–4 bilder av et sted. Krever tester-kode',
    guideH: 'Slik tar du bildene',
    guide: ['Minst 2 bilder, helst 3–4 (maks 4).', 'Stå i to motstående hjørner og ta bilde mot motsatt hjørne, så mye som mulig av stedet.', 'Ett bilde fra gulv- eller bakkehøyde, og legg gjerne et A4-ark på gulvet i ett av bildene (da vet spillet målene).', 'Innendørs eller utendørs (terrasse, hjørne av hagen, liten lekeplass) går fint.', 'Ikke ta med personer, ansikter eller dyr.'],
    consentH: 'Før første bilde', consent: 'Bildene sendes til en tolkningstjeneste (Claude) som lager brettet, og slettes med en gang etterpå. Ingen bilder lagres, hverken hos oss eller på tjenesten. Personer og ansikter blir ikke med i brettet. Brettet er bare tall og former.', consentBtn: 'JEG FORSTÅR, FORTSETT',
    take: 'TA BILDE', pick: 'VELG FRA BILDER', next: 'NESTE', back: 'TILBAKE', remove: 'FJERN', cancel: 'AVBRYT',
    count: (n) => `${n} av 2–4 bilder`, needMore: 'Ta minst 2 bilder.', tooMany: 'Maks 4 bilder.', badImage: 'Bildet kunne ikke leses. Prøv et annet.', scaling: 'Gjør bildet klart …',
    qH: 'Fire raske spørsmål',
    qGoal: 'Hva er målet?', goal: { top: 'Nå toppen', out: 'Ut av rommet', treasure: 'Hente skatten' },
    qDiff: 'Hvor vanskelig?', diff: { easy: 'Lett', medium: 'Medium', hard: 'Vanskelig' },
    qTheme: 'Stemning og tema', theme: { '': 'Ingen', jungel: 'Jungel', rom: 'Verdensrom', slott: 'Slott', piratskip: 'Piratskip', godteri: 'Godteri', vinter: 'Vinter' },
    qFoes: 'Fiender og farer', foes: { on: 'På', off: 'Av' },
    make: 'LAG BRETT',
    working: ['Sender bildene …', 'Tolker bildene …', 'Lager brettet …'], elapsed: (s) => `${s} sekunder`, workingNote: 'Det tar ofte 20–60 sekunder. Bildene slettes med en gang.',
    resultH: 'Forslaget er klart', things: (n) => `${n} ting funnet`, nameLabel: 'Navn på brettet',
    v: { ok: 'Sjekk: brettet kan vinnes.', hjelp: (n) => `Sjekk: kan vinnes, med ${n} hjelpeobjekt${n === 1 ? '' : 'er'} lagt inn (maks 5).`, novei: 'Sjekk: fant ingen vei til målet. Trykk JUSTER og flytt eller slett noe, eller prøv med flere bilder.', mange: (n) => `Sjekk: trenger ${n} hjelpeobjekter, mer enn 5. Trykk JUSTER og rydd litt.`, bad: 'Sjekk: brettet ble ikke riktig. Trykk JUSTER eller prøv igjen.' },
    play: 'SPILL', share: 'DEL', adjust: 'JUSTER', check: 'SJEKK', save: 'LAGRE I MINE BRETT', mine: 'MINE BRETT', again: 'NYTT FORSØK',
    saved: 'Lagret i MINE BRETT.', shared: (c) => `Delt. Koden er ${c}`, sharing: 'Deler …', copied: 'Koden er kopiert', copyFail: 'Kunne ikke kopiere. Skriv koden av.',
    adjH: 'Juster brettet', adjIntro: 'Trykk en ting på kartet. Flytt den med pilene, eller trykk SLETT. Grønn ring er start, gull er mål.',
    adjNone: 'Ingenting valgt. Trykk en ting på kartet.', adjSel: (l) => `Valgt: ${l}`, del: 'SLETT', undo: 'ANGRE', done: 'FERDIG', noGoalDel: 'Tingen med målet kan ikke slettes.', adjFail: 'Det ble ikke riktig. Endringen er angret.',
    e: { kode: 'Koden ble ikke godtatt. Sjekk tester-koden i ⚙ → Test.', kode_mangler: 'Legg inn tester-koden i ⚙ → Test først.', bilder_mangler: 'Ta minst 2 bilder.', av: 'Lag brett fra bilder er slått av akkurat nå. Prøv igjen senere.', tak: 'Månedens tak for bilde-tolkning er nådd. Det åpner igjen neste måned.', kvote: 'Du har brukt opp dine tolkninger denne måneden.', bilder: 'Bildene kunne ikke brukes. Ta 2–4 bilder og prøv igjen.', for_stor: 'Bildene er for store. Prøv igjen.', tolkning: 'Tolkningen ga ikke et brett. Prøv igjen, gjerne med et bilde til.', nett: 'Ingen kontakt med tjenesten. Sjekk nettet og prøv igjen.', metode: 'Ugyldig kall.', feil: 'Noe gikk galt hos tjenesten. Prøv igjen senere.', avbrutt: 'Avbrutt.', maal: 'Fant ikke noe sted for målet. Prøv igjen, gjerne med et bilde til.', scene: 'Forslaget kunne ikke brukes. Prøv igjen.', form: 'Forslaget ble ikke et riktig brett. Prøv igjen.', stor: 'Brettet ble for stort. Prøv med færre ting.', fullt: 'Du har mange brett. Slett et i MINE BRETT først.', nettdel: 'Ingen nett. Prøv å dele igjen om litt.' },
  },
  en: {
    btn: 'MAKE A LEVEL FROM PHOTOS', btnSub: 'Take 2–4 photos of a room or an outdoor spot and get a level', title: 'Make a level from photos',
    setting: 'Make a level from photos (testers): the level picker gets a MAKE A LEVEL FROM PHOTOS button that turns 2–4 photos of a place into a playable level. Needs a tester code',
    guideH: 'How to take the photos',
    guide: ['At least 2 photos, ideally 3–4 (max 4).', 'Stand in two opposite corners and shoot toward the other corner, showing as much of the place as you can.', 'One photo from floor or ground height, and put an A4 sheet on the floor in one photo (then the game knows the sizes).', 'Indoors or outdoors (patio, a corner of the garden, a small playground) both work.', 'Keep people, faces and animals out of the photos.'],
    consentH: 'Before the first photo', consent: 'The photos are sent to an interpretation service (Claude) that makes the level, and are deleted right after. No photos are stored, neither by us nor by the service. People and faces do not end up in the level. The level is only numbers and shapes.', consentBtn: 'I UNDERSTAND, CONTINUE',
    take: 'TAKE PHOTO', pick: 'CHOOSE FROM PHOTOS', next: 'NEXT', back: 'BACK', remove: 'REMOVE', cancel: 'CANCEL',
    count: (n) => `${n} of 2–4 photos`, needMore: 'Take at least 2 photos.', tooMany: 'Max 4 photos.', badImage: 'The photo could not be read. Try another.', scaling: 'Getting the photo ready …',
    qH: 'Four quick questions',
    qGoal: 'What is the goal?', goal: { top: 'Reach the top', out: 'Get out of the room', treasure: 'Fetch the treasure' },
    qDiff: 'How hard?', diff: { easy: 'Easy', medium: 'Medium', hard: 'Hard' },
    qTheme: 'Mood and theme', theme: { '': 'None', jungel: 'Jungle', rom: 'Space', slott: 'Castle', piratskip: 'Pirate ship', godteri: 'Candy', vinter: 'Winter' },
    qFoes: 'Enemies and hazards', foes: { on: 'On', off: 'Off' },
    make: 'MAKE LEVEL',
    working: ['Sending the photos …', 'Reading the photos …', 'Making the level …'], elapsed: (s) => `${s} seconds`, workingNote: 'This often takes 20–60 seconds. The photos are deleted right away.',
    resultH: 'The suggestion is ready', things: (n) => `${n} things found`, nameLabel: 'Name of the level',
    v: { ok: 'Check: the level can be won.', hjelp: (n) => `Check: can be won, with ${n} helper object${n === 1 ? '' : 's'} added (max 5).`, novei: 'Check: found no way to the goal. Tap ADJUST and move or delete something, or try with more photos.', mange: (n) => `Check: needs ${n} helper objects, more than 5. Tap ADJUST and tidy up.`, bad: 'Check: the level did not come out right. Tap ADJUST or try again.' },
    play: 'PLAY', share: 'SHARE', adjust: 'ADJUST', check: 'CHECK', save: 'SAVE TO MY LEVELS', mine: 'MY LEVELS', again: 'TRY AGAIN',
    saved: 'Saved to MY LEVELS.', shared: (c) => `Shared. The code is ${c}`, sharing: 'Sharing …', copied: 'Code copied', copyFail: 'Could not copy. Write the code down.',
    adjH: 'Adjust the level', adjIntro: 'Tap a thing on the map. Move it with the arrows, or tap DELETE. The green ring is the start, gold is the goal.',
    adjNone: 'Nothing selected. Tap a thing on the map.', adjSel: (l) => `Selected: ${l}`, del: 'DELETE', undo: 'UNDO', done: 'DONE', noGoalDel: 'The thing holding the goal cannot be deleted.', adjFail: 'That did not work out. The change was undone.',
    e: { kode: 'The code was not accepted. Check the tester code in ⚙ → Test.', kode_mangler: 'Enter the tester code in ⚙ → Test first.', bilder_mangler: 'Take at least 2 photos.', av: 'Make a level from photos is switched off right now. Try again later.', tak: 'This month’s limit for photo interpretation is reached. It opens again next month.', kvote: 'You have used up your interpretations this month.', bilder: 'The photos could not be used. Take 2–4 photos and try again.', for_stor: 'The photos are too big. Try again.', tolkning: 'The interpretation did not give a level. Try again, maybe with one more photo.', nett: 'No contact with the service. Check the network and try again.', metode: 'Invalid call.', feil: 'Something went wrong at the service. Try again later.', avbrutt: 'Cancelled.', maal: 'Could not find a place for the goal. Try again, maybe with one more photo.', scene: 'The suggestion could not be used. Try again.', form: 'The suggestion did not become a proper level. Try again.', stor: 'The level became too big. Try with fewer things.', fullt: 'You have many levels. Delete one in MY LEVELS first.', nettdel: 'No network. Try sharing again in a moment.' },
  },
};
export const ltx = (lang, key, ...a) => { const v = (TX[lang] || TX.nb)[key] ?? TX.nb[key]; return typeof v === 'function' ? v(...a) : v; };
export const lerr = (lang, reason) => { const e = (TX[lang] || TX.nb).e; return e[reason] || e.feil; };
export const lverdict = (lang, key, n) => { const v = (TX[lang] || TX.nb).v[key] ?? TX.nb.v[key]; return typeof v === 'function' ? v(n) : v; };
export const lsub = (lang, group, key) => ((TX[lang] || TX.nb)[group] || {})[key] ?? (TX.nb[group] || {})[key] ?? key;
export const LEDITOR_TEXT = TX;
