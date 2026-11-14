// R8: fortelling og målseremoni. Ren logikk (tekstnøkler, tid, resultat) + små DOM-hjelpere; main.js har bare tynne hekter.
// Tekstene ligger i i18n.js (story.*, win.*). Alt bruker knappenavn, ikke taster.
export const STORY_LEVELS = 8;
export const storyKey = (n) => (n >= 1 && n <= STORY_LEVELS ? `story.${n}` : null);
export const fmtTime = (s) => { s = Math.max(0, Math.round(s)); const m = Math.floor(s / 60); return m ? `${m}:${String(s % 60).padStart(2, '0')}` : `${s} s`; };
// Fortellingen vises ved friskt nivåstart (ikke ved gjenopptatt fremgang) og bare for de åtte nivåene.
export const shouldShowIntro = ({ n, enabled, resumed, seen }) => !!enabled && !resumed && !seen && !!storyKey(n);
// 1 stjerne for å komme i mål, 2 for minst halvparten av smulene, 3 for alle (uten smuler i brettet: 2).
export const starCount = ({ crumbs, total }) => (!total ? 2 : crumbs >= total ? 3 : crumbs * 2 >= total ? 2 : 1);
export const starsHTML = (n) => `<div class="wstars">${[1, 2, 3].map((i) => `<span class="${i <= n ? 'on' : ''}" style="animation-delay:${0.15 * i}s">★</span>`).join('')}</div>`;
// Figuren (lille deg) som liten SVG, til fortellerkort og avslutning. pose: 'hi' (vinker) eller 'cheer' (jubler).
export const heroSVG = (pose = 'hi') => `<svg class="shero ${pose}" viewBox="0 0 80 96" aria-hidden="true"><ellipse cx="40" cy="92" rx="22" ry="4" fill="#0004"/><path d="M26 54 L12 ${pose === 'cheer' ? 30 : 62}" stroke="#f2c29b" stroke-width="7" stroke-linecap="round"/><path d="M54 54 L68 ${pose === 'cheer' ? 30 : 44}" stroke="#f2c29b" stroke-width="7" stroke-linecap="round"/><rect x="27" y="48" width="26" height="30" rx="9" fill="#d9692a"/><rect x="27" y="48" width="26" height="6" rx="3" fill="#1f9a94"/><rect x="29" y="74" width="9" height="16" rx="4" fill="#35475a"/><rect x="42" y="74" width="9" height="16" rx="4" fill="#35475a"/><circle cx="40" cy="30" r="20" fill="#f2c29b"/><path d="M19 27 Q20 5 40 6 Q60 5 61 27 Q50 20 40 21 Q30 20 19 27Z" fill="#f0b530"/><path d="M19 27 Q30 20 40 21 Q50 20 61 27" stroke="#c98f1c" stroke-width="2" fill="none"/><circle cx="40" cy="12" r="3.5" fill="#fff6c8"/><circle cx="33" cy="32" r="3" fill="#222"/><circle cx="47" cy="32" r="3" fill="#222"/><path d="M32 41 Q40 49 48 41" stroke="#222" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>`;
// Samlet resultat for hele spillet: runs = { nivå-id: {t, ants, crumbs, total} }.
export function totals(runs) {
  const r = Object.values(runs || {}); const sum = (k) => r.reduce((a, x) => a + (x[k] || 0), 0);
  return { levels: r.length, time: sum('t'), ants: sum('ants'), crumbs: sum('crumbs'), total: sum('total') };
}
export const endHTML = (t, T) => `<div class="wgrid"><div class="wrow"><span>⏱ ${T('win.time')}</span><b>${fmtTime(t.time)}</b></div><div class="wrow"><span>🐜 ${T('win.ants')}</span><b>${t.ants}</b></div>${t.total ? `<div class="wrow"><span>★ ${T('win.crumbs')}</span><b>${t.crumbs}/${t.total}</b></div>` : ''}</div>`;
// Alt målskjermen trenger, uten DOM: sluttnivå, tid, maur knust, smuler, poeng, ny rekord.
export function finishData({ n, nextExists, clock, stats, crumbs, crumbTotal, points, prevBest, flew }) {
  const total = crumbTotal || 0, all = total > 0 && crumbs >= total;
  return { n, last: !!n && !nextExists, time: fmtTime(clock), squashed: stats.squashed || 0, crumbs, total, all, points, record: !flew && prevBest > 0 && points > prevBest, flew: !!flew, stars: starCount({ crumbs, total }) };
}
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
export function winHTML(d, T) {
  const row = (ico, label, val) => `<div class="wrow"><span>${ico} ${esc(label)}</span><b>${esc(val)}</b></div>`;
  return starsHTML(d.stars) + `<div class="wgrid">${row('⏱', T('win.time'), d.time)}${row('🐜', T('win.ants'), d.squashed)}${d.total ? row('★', T('win.crumbs'), `${d.crumbs}/${d.total}${d.all ? ' ★' : ''}`) : ''}</div>`
    + `<div class="wpts">${T('win.points')}: ${d.points}${d.record ? `<small>${T('win.record')}</small>` : ''}</div>` + (d.flew ? `<i>${T('win.flew')}</i>` : '');
}
// Overlegg (#story) med fortelling: ett trykk hvor som helst (eller på knappen) hopper videre.
export function showCard(el, { title, text, btn, skip, onDone, art = '', extra = '' }) {
  el.innerHTML = `<div class="scard">${art}<h2>${esc(title)}</h2><p>${esc(text)}</p>${extra}<button class="sgo">${esc(btn)}</button>${skip ? `<small>${esc(skip)}</small>` : ''}</div>`;
  el.classList.remove('hide'); let done = false;
  const end = (e) => { if (e) { e.stopPropagation(); e.preventDefault?.(); } if (done) return; done = true; el.classList.add('hide'); el.onclick = null; onDone?.(); };
  el.onclick = end; el.querySelector('.sgo').onclick = end;
  return end;
}

// R22: start-lesbarhet som data. Per nivå: hint-bobla (i18n-nøkkel med {jump} {take} {grab}), valgfri `first` (id i ruta) for første delmål, og sveipets tider (sek).
// Uten `first` brukes første flate i ruta som ligger høyere enn start. Alle tekster nevner knappene, ikke taster.
export const INTRO_SWEEP = { hold: 1.1, travel: 2.3 };
export const INTRO = {
  1: { hint: 'intro.hint.1' }, 2: { hint: 'intro.hint.2' }, 3: { hint: 'intro.hint.3' },
  4: { hint: 'intro.hint.4' }, 5: { hint: 'intro.hint.5' }, 6: { hint: 'intro.hint.6' }, 7: { hint: 'intro.hint.7' }, 8: { hint: 'intro.hint.8' },
};
export const introKey = (n) => (INTRO[n] ? INTRO[n].hint : null);
