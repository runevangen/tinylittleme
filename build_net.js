// R50: beste bygg på nett (Supabase). Ren klientlogikk uten DOM, fetch kan byttes ut i tester (som feedback_send.js).
// Bruker de ferdige funksjonene tlm_submit_bridge og tlm_best_bridges med anon-nøkkelen og tester-koden (tlm.tcode). Alt er anonymt: svaret har rangering, deler, kostnad, stjerner,
// kode og is_me, aldri navn eller tester-koder. Uten tester-kode eller uten nett skjer ingenting (null tilbake), og byggeskjermen virker som før.
import { rpc, validCode, cleanCode } from './feedback_send.js';
import { CODE_MAX, CODE_PREFIX } from './build_logic.js';

export const TOP_N = 10;
export const bridgeLevel = (levelId, siteId) => `${levelId || 'x'}:${siteId || 'x'}`.slice(0, 40);   // stedets nøkkel i tabellen (databasen kutter ved 40 tegn)
// kan vi bruke nettet nå? av/på-valget, gyldig tester-kode og nett (navigator.onLine kan mangle i tester)
export const netReady = ({ enabled, code, online = (typeof navigator !== 'undefined' ? navigator.onLine : true) }) => !!enabled && validCode(code) && online !== false;

const nn = (v, hi = 1e6) => (Number.isFinite(+v) && +v >= 0 ? Math.min(hi, Math.floor(+v)) : 0);
export function parseSubmit(d) { return d && d.ok === true ? { rank: nn(d.rank), cost: nn(d.cost), parts: nn(d.parts) } : null; }
export function parseBest(d) {
  if (!d || d.ok !== true || !Array.isArray(d.bridges)) return null;
  return d.bridges.slice(0, TOP_N).map((b) => ({
    rank: nn(b.rank), parts: nn(b.parts), cost: nn(b.cost), stars: Math.min(3, nn(b.stars)), code: String(b.code || ''), me: b.is_me === true,
  })).filter((b) => b.rank > 0 && b.code.length <= CODE_MAX && b.code.startsWith(CODE_PREFIX));
}
// Sender et vellykket bygg. { code, level, version, parts, cost, stars, bcode } -> { rank, cost, parts } (din beste), eller null (ingen kode, ingen nett, avvist)
export async function submitBridge(a, opts) {
  if (!validCode(a.code) || typeof a.bcode !== 'string' || !a.bcode.startsWith(CODE_PREFIX) || a.bcode.length > CODE_MAX) return null;
  const r = await rpc('tlm_submit_bridge', { c: cleanCode(a.code), lvl: String(a.level).slice(0, 40), ver: String(a.version || '').slice(0, 20), n_parts: nn(a.parts, 999), n_cost: nn(a.cost, 99999), n_stars: Math.min(3, nn(a.stars)), bcode: a.bcode }, opts);
  return r.ok ? parseSubmit(r.data) : null;
}
// Topp 10 anonymt for et sted: [{ rank, parts, cost, stars, code, me }] eller null
export async function bestBridges(code, level, opts) {
  if (!validCode(code)) return null;
  const r = await rpc('tlm_best_bridges', { c: cleanCode(code), lvl: String(level).slice(0, 40) }, opts);
  return r.ok ? parseBest(r.data) : null;
}
// «Du er nr 2 av 4»: «av» bare når listen er kortere enn topp 10 (da er alle med); ellers «topp 10». null om du ikke er med.
export function standing(list) {
  const me = (list || []).find((b) => b.me); if (!me) return null;
  return { rank: me.rank, of: list.length < TOP_N ? list.length : null };
}
