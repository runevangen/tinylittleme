// R111: låste byggesteder får det nye skallet (topplinje + kort + GÅ TIL), ikke den gamle skjermen. Ren logikk (ingen DOM, ingen three.js, kjøres i node: test_buildlock.mjs).
// Gjelder alle steder som har rutenett-skallet (buildux: Hyllebroen, Kjøkkenbroen, Bygglab «bro» og «fagverk») men ennå ikke står i rutenett-modus fordi stedet er låst
// (`gridstage`: forrige sted må bestås først; `gridplaylock`: Hyllebroen må bestås først). Klassiske steder har allerede det nye skallet (klassisk modus er aldri låst).
// Hva som låses og hvordan det åpnes røres ikke her: bare hva som VISES mens stedet er låst.

export const BL = { touch: 48 };

// skal låseskallet vises? wanted = stedet har det nye rutenett-skallet, gridOn = stedet står i rutenett-modus (da er det åpent)
export const lockShown = ({ on = true, wanted = false, gridOn = false, stageLocked = false, playLocked = false, sim = false } = {}) =>
  !!on && !!wanted && !gridOn && !sim && (!!stageLocked || !!playLocked);

// hvilken tilstand skjermen har: 'lock' (kort + GÅ TIL), ellers 'open' (vanlig skall)
export const lockPhase = (o) => (lockShown(o) ? 'lock' : 'open');

// kontrollene som er synlige i hver tilstand (testen krever at ingen gamle knapper finnes i 'lock')
export const lockControls = ({ hasSeries = false, hasPrev = false } = {}) => ({
  shown: ['back', ...(hasSeries && hasPrev ? ['prev'] : []), ...(hasSeries ? ['next'] : []), 'more', 'go'],
  hidden: ['mode', 'reset', 'undo', 'try', 'tray', 'mats', 'tools', 'share', 'code', 'figur', 'snap', 'rot', 'del', 'zoom'],
});

const up = (s) => String(s || '').toLocaleUpperCase('nb');
// stedet som mangler: 'stage' (forrige sted i serien) eller 'play' (første byggested i et annet brett)
// o: { kind, cur: { name, n, of }, miss: { name, n, of, id, level } }
export function lockCard(o) {
  const kind = o && o.kind === 'play' ? 'play' : 'stage', cur = (o && o.cur) || {}, miss = (o && o.miss) || {};
  const hasN = Number.isFinite(miss.n) && Number.isFinite(miss.of) && miss.n > 0;
  const lineKey = kind === 'play' ? 'blk.linePlay' : hasN ? 'blk.line' : 'blk.lineNoN';
  const params = { name: miss.name || '', n: miss.n || 0, of: miss.of || 0, place: cur.name || '' };
  const go = kind === 'play' ? { kind: 'level', id: miss.level || '' } : { kind: 'site', id: miss.id || '' };
  return { kind, lineKey, params, goLabelKey: 'blk.go', goName: up(miss.name), go, canGo: !!go.id, log: `låst sted vist: ${o && o.siteId ? o.siteId : cur.id || ''}, mangler ${miss.name || '?'}` };
}
export const goLog = (card) => `låst sted: GÅ TIL ${card && card.params ? card.params.name : ''}`;

// topplinjen: ◀ forrige (hvis det finnes), ▶ neste (alltid låst her: stedet selv er låst, så neste er det også)
export function topOf({ series = null, prevName = '', nextName = '' } = {}) {
  if (!series) return { prev: null, next: null };
  return { prev: series.idx > 0 ? { name: prevName } : null, next: series.next ? { name: nextName, locked: true } : null };
}

// har stedet gått fra låst til åpent (forrige bestått, innstilling slått av)? Da skal det vanlige skallet tilbake uten omstart.
export const unlocked = (was, now) => was === 'lock' && now === 'open';
