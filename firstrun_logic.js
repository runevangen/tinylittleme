// R97: første fem minutter (F1). Ren logikk (ingen DOM/three, testes i node: test_firstrun.mjs); visning i firstrun_view.js, hekter i main.js.
// Fire ting: (1) hovedmenyen første gang (én START), (2) kontroll-hint ett om gangen som forsvinner når knappen brukes,
// (3) fremdrift og «Bra!» ved delmål, (4) blindgater: stillstand, feil vei og TA på feil sted gir hjelp (R64) innen FR.helpMs.
export const FR = {
  level: 1,            // Badet: første møte gjelder bare nivå 1
  helpMs: 10000,       // stille så lenge: spilleren får hjelp (ikke over 12 s)
  idleMs: 8000,        // stille så lenge telles som «sto stille» i rapporten
  stillDist: 0.25,     // så lite bevegelse (brettenheter) innen vinduet regnes som stille
  wrongWayMs: 9000,    // lenger enn dette unna målet uten å nærme seg = feil vei
  wrongWayGain: 3.0,   // avstanden til målet har økt så mye (enheter) over vinduet
  wrongTaMax: 3,       // så mange TA-trykk uten noe å ta ...
  wrongTaMs: 8000,     // ... innenfor så mange ms gir hjelp
  helpGapMs: 20000,    // minst så lenge mellom to hjelpetilfeller
  hintMs: 6500,        // hvor lenge ett hint står
  hintGapMs: 2500,     // pause mellom to hint
  stickAfter: 2.0,     // sekunder spilletid uten stikke før stikke-hintet
  jumpAfter: 5,        // sekunder spilletid før HOPP-hintet kan komme
  maxShow: { beginner: 3, medium: 2, expert: 0 },   // hvor mange ganger hvert hint vises før det gir seg
};
export const HINTS = ['stick', 'jump', 'take', 'grab'];

// Er første-møte-hjelpen på? Bare i nivå 1, når valget er på og ikke på Ekspert (der finnes ingen hint).
export const firstRunActive = ({ on, n, diff }) => !!on && n === FR.level && diff !== 'expert';
// Har spilleren klart noe? (tlm.cleared: { <brett>: poeng })
export const isFirstRun = (cleared) => !cleared || typeof cleared !== 'object' || Object.keys(cleared).length === 0;

// ---------- hovedmenyen ----------
// has: lagring finnes. firstRun: ingenting klart ennå. Retur: hva menyen skal vise.
//   primary: 'start' | 'continue' (den ene store knappen), collapse: resten ligger under «mer», keep: hvilke rader som beholdes (dempet).
export function menuPlan({ has, firstRun, on = true }) {
  const primary = has ? 'continue' : 'start';
  if (!on || !firstRun) return { primary, collapse: false, keep: ['school', 'chg', 'fix'], moreOpen: true };
  return { primary, collapse: true, keep: ['school', 'chg', 'fix'], moreOpen: false };
}

// ---------- kontroll-hint ----------
// Tilstanden lagres i `tlm.fr.hints` ({ used: {jump:1,...}, shown: {jump:2,...} }) så et hint ikke kommer tilbake for den som kan knappen.
export function createHints(saved = null) {
  const s = { used: {}, shown: {}, active: null, t0: 0, lastEnd: -1e9 };
  if (saved && typeof saved === 'object') {
    for (const k of HINTS) { if (saved.used?.[k]) s.used[k] = 1; if (Number.isFinite(saved.shown?.[k])) s.shown[k] = saved.shown[k]; }
  }
  return s;
}
export const hintsSave = (s) => ({ used: { ...s.used }, shown: { ...s.shown } });
// Spilleren brukte stikka/en knapp: hintet for den er ferdig (og vises aldri mer).
export function noteUse(s, id) { if (!HINTS.includes(id)) return false; const first = !s.used[id]; s.used[id] = 1; return first; }
// Hvilket hint skal vises nå? ctx: { diff, play, t (spilletid i s), near: { take, grab, jump } }. Retur: { show: id|null, hide: id|null, why }.
export function stepHints(s, now, ctx) {
  const max = FR.maxShow[ctx.diff] ?? 0;
  if (!ctx.play || max <= 0) { const h = s.active; if (h) { s.active = null; s.lastEnd = now; } return { show: null, hide: h, why: 'av' }; }
  if (s.active) {
    const id = s.active;
    if (s.used[id]) { s.active = null; s.lastEnd = now; return { show: null, hide: id, why: 'brukt' }; }
    if (now - s.t0 >= FR.hintMs) { s.active = null; s.lastEnd = now; return { show: null, hide: id, why: 'tid' }; }
    return { show: null, hide: null, why: '' };
  }
  if (now - s.lastEnd < FR.hintGapMs) return { show: null, hide: null, why: '' };
  const want = {
    stick: !s.used.stick && ctx.t >= FR.stickAfter,
    jump: s.used.stick && !s.used.jump && ctx.t >= FR.jumpAfter && !!ctx.near?.jump,
    take: !s.used.take && !!ctx.near?.take,
    grab: !s.used.grab && !!ctx.near?.grab,
  };
  for (const id of HINTS) {
    if (!want[id] || (s.shown[id] || 0) >= max) continue;
    if (id !== 'stick' && !s.used.stick && ctx.t < 30) continue;      // først stikka
    s.active = id; s.t0 = now; s.shown[id] = (s.shown[id] || 0) + 1;
    return { show: id, hide: null, why: 'ny' };
  }
  return { show: null, hide: null, why: '' };
}

// ---------- fremdrift ----------
// Rolig indikator: n/N (Nybegynner og Medium) eller bare prikker uten tall (Ekspert).
export function progressInfo({ done, total, diff }) {
  const n = Math.max(0, Math.min(total || 0, done || 0));
  const dots = Array.from({ length: total || 0 }, (_, i) => i < n);
  return { dots, text: diff === 'expert' || !total ? '' : `${n}/${total}`, show: total > 0 };
}
// «Bra!»-hilsen ved delmål (ev: { n, total, last }). Siste delmål får «Alle delmål klare» via eksisterende jubel.
export const braText = (ev) => (ev && !ev.last && ev.n > 0 ? { key: 'fr.good', params: { n: ev.n, total: ev.total } } : null);

// ---------- blindgater ----------
// Hjelp når spilleren står stille, går feil vei eller trykker TA uten noe å ta. Hendelsene logges i main.js som forstekjoring.
export function createBlind() {
  return { still0: null, stillLogged: false, stillN: 0, pos: null, key: null, win: [], ta: [], lastHelp: -1e9, helpN: 0, wrongWayN: 0, wrongTaN: 0 };
}
// Kalles hver ramme i spill. now i ms. sample: { x, y, z, dist (til målet), key (id på målet) }. Retur: liste av { kind, ms?, d? } å logge/handle på.
//   kind: 'still8' (sto stille over idleMs, telt én gang per stopp), 'help' med why: 'still' | 'wrongway' | 'wrongta'.
export function stepBlind(s, now, sample, { act = true } = {}) {
  const out = [];
  if (!act) { s.still0 = null; s.stillLogged = false; s.pos = null; s.win.length = 0; return out; }
  if (sample.key !== undefined && sample.key !== s.key) { s.key = sample.key; s.win.length = 0; }   // nytt mål: avstanden hopper, så feil-vei-vinduet starter på nytt
  const moved = !s.pos || Math.hypot(sample.x - s.pos.x, sample.z - s.pos.z) > FR.stillDist || Math.abs(sample.y - s.pos.y) > 0.3;
  if (moved) { s.pos = { x: sample.x, y: sample.y, z: sample.z }; s.still0 = now; s.stillLogged = false; }
  const still = now - (s.still0 ?? now);
  if (still >= FR.idleMs && !s.stillLogged) { s.stillLogged = true; s.stillN++; out.push({ kind: 'still8', ms: still }); }
  const gap = now - s.lastHelp >= FR.helpGapMs;
  if (still >= FR.helpMs && gap) { s.lastHelp = now; s.helpN++; s.still0 = now; s.stillLogged = false; out.push({ kind: 'help', why: 'still', ms: still }); return out; }
  if (Number.isFinite(sample.dist)) {                                // feil vei: dro lenger fra målet over vinduet
    s.win.push([now, sample.dist]); while (s.win.length && now - s.win[0][0] > FR.wrongWayMs) s.win.shift();
    if (s.win.length > 1 && now - s.win[0][0] >= FR.wrongWayMs * 0.9) {
      const gain = sample.dist - Math.min(...s.win.map((w) => w[1]));
      if (gain >= FR.wrongWayGain && gap) { s.lastHelp = now; s.helpN++; s.wrongWayN++; s.win.length = 0; out.push({ kind: 'help', why: 'wrongway', d: gain }); }
    }
  }
  return out;
}
// TA trykket uten noe å ta: tell. Retur { kind: 'help', why: 'wrongta' } når grensa nås.
export function noteWrongTa(s, now) {
  s.ta.push(now); while (s.ta.length && now - s.ta[0] > FR.wrongTaMs) s.ta.shift();
  if (s.ta.length >= FR.wrongTaMax && now - s.lastHelp >= FR.helpGapMs) { s.lastHelp = now; s.helpN++; s.wrongTaN++; s.ta.length = 0; return { kind: 'help', why: 'wrongta' }; }
  return null;
}

// ---------- tekster (nb/en) ----------
const TXT = {
  nb: {
    'fr.start': 'START', 'fr.continue': 'FORTSETT', 'fr.more': 'mer', 'fr.less': 'mindre',
    'fr.good': 'Bra! Delmål {n} av {total}',
    'fr.hint.stick': 'Dra stikka for å gå', 'fr.hint.jump': 'Trykk {jump} for å hoppe', 'fr.hint.take': 'Trykk {take} for å ta', 'fr.hint.grab': 'Hold {grab} for å klatre',
    'fr.help': 'Prøv: {name}. Pilen viser veien.', 'fr.helpShort': 'Her er veien',
    'fr.backMenu': 'TILBAKE TIL MENY', 'fr.prog': 'Delmål {text}',
  },
  en: {
    'fr.start': 'START', 'fr.continue': 'CONTINUE', 'fr.more': 'more', 'fr.less': 'less',
    'fr.good': 'Nice! Goal {n} of {total}',
    'fr.hint.stick': 'Drag the stick to walk', 'fr.hint.jump': 'Tap {jump} to jump', 'fr.hint.take': 'Tap {take} to pick up', 'fr.hint.grab': 'Hold {grab} to climb',
    'fr.help': 'Try: {name}. The arrow shows the way.', 'fr.helpShort': 'This way',
    'fr.backMenu': 'BACK TO MENU', 'fr.prog': 'Goals {text}',
  },
};
export const ft = (lang, key, vars = {}) => (TXT[lang]?.[key] ?? TXT.nb[key] ?? key).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
export const TEXT_KEYS = { nb: Object.keys(TXT.nb), en: Object.keys(TXT.en) };
