// R146: tekstene i RETTELSER- og NYTT-visningen (fixes_view.js) på norsk og engelsk. Ren data og små funksjoner, ingen DOM.
const TX = {
  nb: {
    ok: '✓ VIRKER', fail: '✗ VIRKER IKKE', ikke: 'IKKE SJEKKET', sjekke: 'Å SJEKKE', sjekket: 'SJEKKET',
    quick: ['Samme feil som før', 'Noe annet er galt', 'Finner ikke stedet'],
    go: 'GÅ DIT', upd: 'OPPDATER', updating: 'Oppdaterer …', updFail: 'Fikk ikke oppdatert akkurat nå. Prøv igjen senere.', noNet: 'Ingen nett akkurat nå. Prøv igjen om litt.',
    how: 'Slik tester du:', wrote: 'Du skrev:', notePh: 'Hva er galt? (valgfritt)', send: 'SEND ✗ FUNGERER IKKE', yes: '✓ FUNGERER', no: '✗ FUNGERER IKKE', back: 'TILBAKE',
    hideOld: 'SKJUL ELDRE', showAll: (n) => `VIS ALLE (${n} eldre)`, running: (v) => `Du kjører v${v}`, runLine: (w, v, r) => `${w} i v${v} · du kjører v${r}`, runOld: ' · OPPDATER først',
    newTitle: 'Nytt', newIntro: (n) => (n ? `${n} nye ting å prøve. Trykk GÅ DIT, prøv det, og si om det fungerer.` : 'Ingenting nytt å sjekke akkurat nå.'), newEmptyA: 'Ingenting nytt å sjekke her.', newEmptyB: 'Ingenting sjekket å vise.', newWord: 'Kom',
    btnNew: 'NYTT', fixTitle: 'Rettelser', fixIntro: (n) => (n ? `${n} å sjekke. Trykk GÅ DIT, prøv stedet, og si om det virker.` : 'Ingen rettelser å sjekke akkurat nå.'), fixEmptyA: 'Ingenting å sjekke her.', fixEmptyB: 'Ingen sjekkede rettelser å vise.',
  },
  en: {
    ok: '✓ WORKS', fail: '✗ DOES NOT WORK', ikke: 'NOT CHECKED', sjekke: 'TO CHECK', sjekket: 'CHECKED',
    quick: ['Same problem as before', 'Something else is wrong', 'Cannot find the spot'],
    go: 'GO THERE', upd: 'UPDATE', updating: 'Updating …', updFail: 'Could not update right now. Try again later.', noNet: 'No connection right now. Try again in a moment.',
    how: 'How to test:', wrote: 'You wrote:', notePh: 'What is wrong? (optional)', send: 'SEND ✗ DOES NOT WORK', yes: '✓ WORKS', no: '✗ DOES NOT WORK', back: 'BACK',
    hideOld: 'HIDE OLDER', showAll: (n) => `SHOW ALL (${n} older)`, running: (v) => `You are running v${v}`, runLine: (w, v, r) => `${w} in v${v} · you are running v${r}`, runOld: ': UPDATE first',
    newTitle: 'New', newIntro: (n) => (n ? `${n} new things to try. Tap GO THERE, try it, and say whether it works.` : 'Nothing new to check right now.'), newEmptyA: 'Nothing new to check here.', newEmptyB: 'Nothing checked to show.', newWord: 'Came',
    btnNew: 'NEW', fixTitle: 'Fixes', fixIntro: (n) => (n ? `${n} to check. Tap GO THERE, try the spot, and say whether it works.` : 'No fixes to check right now.'), fixEmptyA: 'Nothing to check here.', fixEmptyB: 'No checked fixes to show.',
  },
};
export const fx = (lang) => TX[lang === 'en' ? 'en' : 'nb'];
// Ordet foran versjonen (Rettet/Kom) på valgt språk
const WORDS = { Rettet: 'Fixed', Kom: 'Came' };
export function versionLineL(lang, status, running, fixVersion, word) {
  const X = fx(lang), v = String(fixVersion ?? '').replace(/^v/, ''), w = lang === 'en' ? (WORDS[word] || word) : word;
  return status === 'ukjent' ? X.running(running) : X.runLine(w, v, running) + (status === 'eldre' ? X.runOld : '');
}
