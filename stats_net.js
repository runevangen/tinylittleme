// R88: nettsending av den anonyme statistikken (tynn visningsmodul). Samler ikke noe selv: tar køen fra createStats() og sender den i én gruppe
// (REST tåler arrays) til tlm_events med anon-nøkkelen. Feil og manglende nett er stille, og ingenting blokkerer spillet.
import { FEEDBACK } from './feedback_send.js';
import { STATS } from './stats_logic.js';

export function createStatsNet({ stats, logEv = () => {}, cfg = FEEDBACK, fetchFn = globalThis.fetch?.bind(globalThis), beacon = globalThis.navigator?.sendBeacon?.bind(globalThis.navigator), win = globalThis, doc = globalThis.document, setIv = globalThis.setInterval, flushMs = STATS.flushMs } = {}) {
  let busy = false, sentTotal = 0;
  const url = `${cfg.url}/rest/v1/${STATS.table}`;
  async function flush(why = 'tid', { unloading = false } = {}) {
    if (!stats.active() || busy) return 0;
    const rows = stats.drain(); if (!rows.length) return 0;
    const body = JSON.stringify(rows);
    try {
      if (fetchFn) {
        busy = !unloading;
        const res = await fetchFn(url, { method: 'POST', keepalive: true, headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body });
        if (!res.ok) { if (res.status >= 500 || res.status === 429) stats.restore(rows); return 0; }   // avvist av serveren (f.eks. grense): ikke prøv de samme på nytt
      } else if (beacon) {
        if (!beacon(`${url}?apikey=${cfg.key}`, new Blob([body], { type: 'application/json' }))) { stats.restore(rows); return 0; }
      } else { stats.restore(rows); return 0; }
      sentTotal += rows.length; logEv('statistikk', `sendt ${rows.length} hendelser (${why})`); return rows.length;
    } catch {
      if (!unloading && beacon) { try { if (beacon(`${url}?apikey=${cfg.key}`, new Blob([body], { type: 'application/json' }))) { sentTotal += rows.length; logEv('statistikk', `sendt ${rows.length} hendelser (${why}, beacon)`); return rows.length; } } catch { /* stille */ } }
      if (!unloading) stats.restore(rows);
      return 0;
    } finally { busy = false; }
  }
  const onHide = () => { if (doc?.hidden) flush('skjult', { unloading: true }); };
  doc?.addEventListener?.('visibilitychange', onHide);
  win.addEventListener?.('pagehide', () => flush('lukket', { unloading: true }));
  const timer = setIv ? setIv(() => { flush('60 s'); }, flushMs) : null;
  return { flush, stop() { if (timer) clearInterval(timer); }, get sent() { return sentTotal; }, url };
}
