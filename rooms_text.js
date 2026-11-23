// R153: tekster for MINE BRETT (norsk og engelsk). Bare knapper (ingen taster). Ren data, ingen DOM.
const TX = {
  nb: {
    btn: 'MINE BRETT', btnSub: 'Dine egne brett og brett fra en kode', title: 'Mine brett', intro: 'Brett du har laget eller hentet. Trykk SPILL for å spille. DEL gir en kode du kan sende til en annen tester.',
    empty: 'Ingen brett ennå. Lim inn en kode under «SPILL FRA KODE», eller lag et brett fra bilder.',
    play: 'SPILL', share: 'DEL', del: 'SLETT', report: 'MELD', back: 'TILBAKE', fromCode: 'SPILL FRA KODE', codePh: 'RM-XXXXXXXX', fetch: 'HENT BRETT', codeLabel: 'Lim inn koden du fikk',
    shared: (c) => `Delt. Koden er ${c}`, codeOf: (c) => `Kode: ${c}`, mineTag: 'laget av meg', otherTag: 'fra kode',
    sharing: 'Deler …', fetching: 'Henter …', copied: 'Koden er kopiert', copyFail: 'Kunne ikke kopiere. Skriv koden av.',
    confirmDel: 'Slette brettet? Trykk SLETT en gang til.', deleted: 'Brettet er slettet', deletedBoth: 'Brettet er slettet, også fra delingen',
    reported: 'Takk. Brettet er meldt.', got: (n) => `Hentet «${n}». Trykk SPILL.`,
    e: { kode: 'Koden ble ikke godtatt. Sjekk tester-koden i ⚙ → Test.', nett: 'Ingen nett akkurat nå. Prøv igjen om litt.', grense: 'Du har delt mange brett nå. Prøv igjen senere.', 'finnes ikke': 'Fant ingen brett med den koden. Sjekk at den er riktig skrevet.', kodeformat: 'Koden ser feil ut. Den ser slik ut: RM-ABCD2345.', fullt: 'Du har mange brett. Slett et brett først.', stor: 'Brettet er for stort til å deles.', form: 'Brettet ser ikke riktig ut.', feil: 'Noe gikk galt. Prøv igjen.' },
    setting: 'Mine brett (testere): VELG BRETT får knappen MINE BRETT, der du spiller brett fra en kode og deler egne brett med en kode. Krever tester-kode',
  },
  en: {
    btn: 'MY LEVELS', btnSub: 'Your own levels and levels from a code', title: 'My levels', intro: 'Levels you made or fetched. Tap PLAY to play. SHARE gives a code you can send to another tester.',
    empty: 'No levels yet. Paste a code under «PLAY FROM CODE», or make a level from photos.',
    play: 'PLAY', share: 'SHARE', del: 'DELETE', report: 'REPORT', back: 'BACK', fromCode: 'PLAY FROM CODE', codePh: 'RM-XXXXXXXX', fetch: 'GET LEVEL', codeLabel: 'Paste the code you got',
    shared: (c) => `Shared. The code is ${c}`, codeOf: (c) => `Code: ${c}`, mineTag: 'made by me', otherTag: 'from a code',
    sharing: 'Sharing …', fetching: 'Fetching …', copied: 'Code copied', copyFail: 'Could not copy. Write the code down.',
    confirmDel: 'Delete the level? Tap DELETE once more.', deleted: 'Level deleted', deletedBoth: 'Level deleted, also from sharing',
    reported: 'Thanks. The level was reported.', got: (n) => `Got «${n}». Tap PLAY.`,
    e: { kode: 'The code was not accepted. Check the tester code in ⚙ → Test.', nett: 'No network right now. Try again in a moment.', grense: 'You have shared many levels. Try again later.', 'finnes ikke': 'No level with that code. Check that it is spelled right.', kodeformat: 'The code looks wrong. It looks like this: RM-ABCD2345.', fullt: 'You have many levels. Delete one first.', stor: 'The level is too big to share.', form: 'The level does not look right.', feil: 'Something went wrong. Try again.' },
    setting: 'My levels (testers): the level picker gets a MY LEVELS button where you play a level from a code and share your own with a code. Needs a tester code',
  },
};
export const rtx = (lang, key, ...a) => { const v = (TX[lang] || TX.nb)[key] ?? TX.nb[key]; return typeof v === 'function' ? v(...a) : v; };
export const rerr = (lang, reason) => { const e = (TX[lang] || TX.nb).e; return e[reason] || e.feil; };
export const ROOMS_TEXT = TX;
