// R69: vanskelighetsnivå (Nybegynner, Medium, Ekspert). Ren logikk (ingen DOM/three, testes i node: test_difficulty.mjs).
// Vanskelighet endrer BARE hjelpen (piler, kompass, hint, markører, kart). Fiender, fall, straff, brett og fysikk er like på alle nivåer;
// styreassistentene (kanthjelp, sikte-hjelp, autogrep) og vanlige tilbakemeldinger (skade, jubel, lyd) er ikke hjelp og er uendret.
// Tabellen PROFILE har én rad per hjelpeelement og én kolonne per nivå: justér her, ikke ute i main.js. main.js leser bare diffProfile(nivå).
// Lagring: tlm.difficulty (valgt nivå), tlm.progress.<brett>[.rN][.<nivå>] (fremgang per brett og nivå; Nybegynner bruker den gamle nøkkelen),
// tlm.badges = { <brett>: { beginner: 1, medium: 1, expert: 1 } } (merke per brett og nivå: bronse, sølv, gull).

import { tl, DICT_KEYS } from './i18n.js';
export const DIFFS = ['beginner', 'medium', 'expert'];
export const DEFAULT_DIFF = 'medium';   // R84: nye spillere starter på Medium
export const LEGACY_KEY_DIFF = 'beginner';   // R84: Nybegynner bruker den gamle fremgangsnøkkelen (uavhengig av standardvalget)
export const BADGE_GLYPH = { beginner: '🥉', medium: '🥈', expert: '🥇' };
export const BADGE_NAME = { beginner: 'bronse', medium: 'sølv', expert: 'gull' };

// Kolonner: [Nybegynner, Medium, Ekspert]. Boolske rader: true = hjelpen er med. Tallrader og valgrader er forklart på raden.
const ROWS = {
  markerBudget:  [6, 2, 0],                          // verdensmarkører samtidig (mål + grep + ⓘ); den vanlige Hjelp-nivå-grensen (⚙) kan bare senke den
  infoMarks:     [true, false, false],               // ⓘ-merker på ting (Medium: bare neste grep)
  worldArrow:    [true, true, false],                // mål-pil i bildet (gulv), kantpil, ring og kantmerke fra veiledningen
  compass:       [true, true, false],                // kompass-bobla
  nextLine:      ['full', 'plain', 'none'],          // NESTE-linja i båndet: full (pil, avstand og handling), plain (bare navn og avstand), none
  guideText:     [true, false, false],               // handlingssetning i båndet når målet er skjult («Klatre …»)
  showMe:        [true, true, false],                // «Vis meg» (kamera dreier mot målet)
  routeGlow:     [true, false, false],               // neste flate lyser etter stillstand
  introSweep:    [true, true, false],                // kort kamerasveip fra målet til figuren ved nivåstart
  introMark:     [true, false, false],               // pil over første delmål ved nivåstart
  introHint:     [true, false, false],               // hint-boble ved nivåstart (R22)
  helpCards:     ['always', 'first', 'off'],         // ℹ-kort: always = også ved hver ting, first = bare første gang du kommer nær, off = ingen kort og ingen ℹ
  contextHints:  [true, true, false],                // kontekst-hint som dukker opp (verktøy, glatt, veps, kamera …)
  failTips:      [3, 5, 0],                          // «Tips: prøv …» etter så mange fall på samme sted (0 = aldri)
  landingMarker: [true, true, false],                // landingsmarkør (ring) i fall (R28)
  waterWarn:     [true, true, false],                // vannvarsel og vannstand (R65)
  minimap:       [true, true, false],                // minikart og oversikt-knapp
  questLine:     [true, true, false],                // R98: oppdragslinje («ikon + neste mål») under toppbåndet (⚙ → Spill → Oppdragslinje kan overstyre; Ekspert får den ved trykk på ⋯ eller mål-ikonet)
  subgoalText:   [true, true, false],                // delmåltekst i toppbåndet og delmål-panelet
  gridHint:      [true, true, false],                // R72: rutenett-bygging: lang hjelpetekst («trykk to punkter for en stav»); ellers kort tekst
  hintBubbles:   [true, true, false],                // løse hint-bobler (tastaturhjelpen H, «trykk for å gå videre»)
};
export const HELP_KEYS = Object.keys(ROWS);
export const PROFILE = Object.fromEntries(DIFFS.map((d, i) => [d, Object.fromEntries(HELP_KEYS.map((k) => [k, ROWS[k][i]]))]));

export const normDiff = (v) => (DIFFS.includes(v) ? v : DEFAULT_DIFF);
export const diffIndex = (d) => DIFFS.indexOf(normDiff(d));
export const diffProfile = (d) => PROFILE[normDiff(d)];
// Hvilke hjelpeelementer er helt av (for rapport og test): navn på alle bolske rader som er false, valgrader med 'off'/'none', tall 0.
export const offElements = (d) => HELP_KEYS.filter((k) => { const v = diffProfile(d)[k]; return v === false || v === 0 || v === 'off' || v === 'none'; });

// Markørbudsjettet: vanskelighetens tak, men aldri over det Hjelp-nivå (⚙) gir. «Ingen» hjelp = 0.
export function markerBudget(d, help, caps = {}) {
  const tab = diffProfile(d).markerBudget;
  if (help === 'none') return 0;
  const cap = help === 'much' ? (caps.much ?? 6) : (caps.normal ?? 3);
  return Math.max(0, Math.min(tab, cap));
}

// ---------- lagringsnøkler ----------
export const progressKey = (levelId, rev, d) => `tlm.progress.${levelId}${rev ? '.r' + rev : ''}${normDiff(d) === LEGACY_KEY_DIFF ? '' : '.' + normDiff(d)}`;

// ---------- merker ----------
export const getBadges = (st) => { const b = st.get('tlm.badges', {}); return b && typeof b === 'object' && !Array.isArray(b) ? b : {}; };
export function awardBadge(st, levelId, d) {
  if (!levelId) return { isNew: false };
  const all = getBadges(st), cur = { ...(all[levelId] || {}) }, k = normDiff(d), isNew = !cur[k];
  cur[k] = 1; all[levelId] = cur; st.set('tlm.badges', all); return { isNew, best: bestBadge(st, levelId) };
}
// Det høyeste nivået klart på et brett (eller null).
export function bestBadge(st, levelId) { const b = getBadges(st)[levelId] || {}; let best = null; for (const d of DIFFS) if (b[d]) best = d; return best; }
export const hasBadge = (st, levelId, d) => !!getBadges(st)[levelId]?.[normDiff(d)];
// Rad med merkene på et brett: «🥉🥈» (bare de som er tatt).
export const badgeRow = (st, levelId) => DIFFS.filter((d) => hasBadge(st, levelId, d)).map((d) => BADGE_GLYPH[d]).join('');
// Telling til rewards: { beginner, medium, expert, total }
export function badgeTotals(st, levelIds) {
  const t = { beginner: 0, medium: 0, expert: 0, total: 0 }, all = getBadges(st);
  for (const id of levelIds || Object.keys(all)) for (const d of DIFFS) if (all[id]?.[d]) { t[d]++; t.total++; }
  return t;
}

// ---------- opplåsing og valg av brett ----------
// Nummererte brett i rekkefølge; brett n er åpent når det er første, når forrige er klart, eller når det selv er klart/har merke.
export function unlockedLevels(levels, cleared, badges = {}) {
  const lv = levels.filter((l) => l.n).sort((a, b) => a.n - b.n), out = [];
  lv.forEach((l, i) => { const done = (id) => !!(cleared && cleared[id]) || !!(badges && badges[id] && Object.keys(badges[id]).length); if (i === 0 || done(lv[i - 1].id) || done(l.id)) out.push(l); });
  return out;
}
// Vanskeligheter du kan velge når du spiller et brett på nytt: samme eller vanskeligere enn det du har klart høyest (ellers alle fra Nybegynner).
export function allowedDiffs(st, levelId) { const b = bestBadge(st, levelId); return DIFFS.slice(b ? diffIndex(b) : 0); }

// ---------- «Egendefinert» ----------
// Hjelpevalg i ⚙ som vanskelighetsnivået regner med. Står noe annerledes enn standard, er hjelpen «Egendefinert».
export const HELP_SETTINGS = { 'tlm.helplevel': 'normal', 'tlm.goalarrow': true, 'tlm.compassmode': 'both', 'tlm.guide': true, 'tlm.introsweep': true, 'tlm.intromark': true, 'tlm.introhint': true, 'tlm.failhint': true, 'tlm.markers': true, 'tlm.floodwarn': true, 'tlm.tband': true };
export function isCustomHelp(st) { return Object.entries(HELP_SETTINGS).some(([k, def]) => { const v = st.get(k, def); return v !== def; }); }

// ---------- tekster (nb/en) ----------
// R148: tekstene ligger i i18n.js (nb og en).
export const dt = (lang, key, vars = {}) => tl(lang, key, vars);
export const TEXT_KEYS = { nb: DICT_KEYS.nb.filter((k) => k.startsWith('df.')), en: DICT_KEYS.en.filter((k) => k.startsWith('df.')) };
