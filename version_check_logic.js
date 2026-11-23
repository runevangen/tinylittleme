// R77: versjonsjekk i spillet (version_check_logic.js). Ren logikk uten DOM og nett, testes i node (test_vercheck.mjs).
// Selve hentingen, kortet og oppdateringen bor i version_check_view.js.

import { tl } from './i18n.js';
export const DEFAULT_INTERVAL_MIN = 5;
export const MIN_INTERVAL_MIN = 1;
export const MAX_INTERVAL_MIN = 60;

// «export const VERSION = '2.23';» (eller bare «2.23») til { major, minor, text } eller null
export function parseVersion(src) {
  const s = String(src ?? '');
  const m = s.match(/VERSION\s*=\s*['"](\d+)\.(\d+)['"]/) || s.trim().match(/^v?(\d+)\.(\d+)$/);
  if (!m) return null;
  const major = +m[1], minor = +m[2];
  return { major, minor, text: `${major}.${minor}` };
}
// Tallvis sammenligning: -1 / 0 / 1 (2.9 < 2.10). Ugyldig versjon gir null.
export function compareVersions(a, b) {
  const x = typeof a === 'string' ? parseVersion(a) : a, y = typeof b === 'string' ? parseVersion(b) : b;
  if (!x || !y) return null;
  return x.major !== y.major ? (x.major < y.major ? -1 : 1) : x.minor !== y.minor ? (x.minor < y.minor ? -1 : 1) : 0;
}
// Ny versjon bare når den som ligger ute er HØYERE enn den som kjører.
export const isNewer = (running, remote) => compareVersions(running, remote) === -1;

// Intervall i minutter til millisekunder, begrenset til 1–60 (ugyldig gir standard).
export function intervalMs(min) {
  const n = Number.isFinite(+min) && +min > 0 ? +min : DEFAULT_INTERVAL_MIN;
  return Math.round(Math.min(MAX_INTERVAL_MIN, Math.max(MIN_INTERVAL_MIN, n)) * 60000);
}
// Tid for neste automatiske sjekk? (ikke oftere enn intervallet; force = på forespørsel fra menyen)
export function dueNow({ now, last, interval, force = false }) {
  if (force) return true;
  if (!Number.isFinite(last) || last <= 0) return true;
  return now - last >= interval;
}
// Rolig tilstand: kortet vises først når spilleren ikke er midt i noe som ikke tåler pause.
// screen: id fra flag_logic (spill, meny, start, brettvalg, bygg, oversikt, mal, intro, historie, innstillinger). «meny» er ⋯-menyen i spillet.
export function calmNow({ screen, boss = false, cinema = false, testing = false }) {
  if (cinema || boss || testing) return false;
  if (screen === 'bygg' || screen === 'oversikt' || screen === 'intro') return false;
  if (screen === 'spill') return false;   // midt i spillet vises ingenting (toppbåndet og knappene trenger plassen); kortet venter til meny, mål eller start
  return true;                                       // menyer, startskjerm, brettvalg, rett etter mål, historie, innstillinger
}
// Teksten på kortet og i menyen.
// R148: tekstene ligger i i18n.js (nb/en); lang er valgfri (standard norsk).
export const cardText = (v, lang = 'nb') => tl(lang, 'vc.card', { v });
export const menuLine = (running, state, lang = 'nb') => tl(lang, 'vc.menu', { v: running, state: tl(lang, state === 'checking' ? 'vc.checking' : 'vc.checkNow') });
export const upToDateText = (lang = 'nb') => tl(lang, 'vc.upToDate');

// Tilstandsmaskin uten tid og nett. Kall check(fetchText, opts) som returnerer { status: 'ny'|'nyeste'|'feil', remote }.
// Alle feil (nett, 404, uleselig svar) gir 'feil' og kaster aldri.
export async function runCheck(running, fetchText) {
  let txt;
  try { txt = await fetchText(); } catch { return { status: 'feil', remote: null }; }
  const v = parseVersion(txt);
  if (!v) return { status: 'feil', remote: null };
  return { status: isNewer(running, v) ? 'ny' : 'nyeste', remote: v.text };
}
// Adresse til siden som lastes på nytt: samme side, men med ny spørringsstreng så ingen mellomlagret kopi brukes.
export function reloadUrl(href, version, nowMs = Date.now()) {
  let u; try { u = new URL(href); } catch { return href; }
  u.searchParams.set('v', String(version));
  u.searchParams.set('u', String(nowMs));
  return u.toString();
}
