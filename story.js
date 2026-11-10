// R8: fortelling og målseremoni. Ren logikk (tekstnøkler, tid, resultat) + små DOM-hjelpere; main.js har bare tynne hekter.
// Tekstene ligger i i18n.js (story.*, win.*). Alt bruker knappenavn, ikke taster.
export const STORY_LEVELS = 6;
export const storyKey = (n) => (n >= 1 && n <= STORY_LEVELS ? `story.${n}` : null);
export const fmtTime = (s) => { s = Math.max(0, Math.round(s)); const m = Math.floor(s / 60); return m ? `${m}:${String(s % 60).padStart(2, '0')}` : `${s} s`; };
// Fortellingen vises ved friskt nivåstart (ikke ved gjenopptatt fremgang) og bare for de seks nivåene.
export const shouldShowIntro = ({ n, enabled, resumed }) => !!enabled && !resumed && !!storyKey(n);
// Alt målskjermen trenger, uten DOM: sluttnivå, tid, maur knust, smuler, poeng, ny rekord.
export function finishData({ n, nextExists, clock, stats, crumbs, crumbTotal, points, prevBest, flew }) {
  const total = crumbTotal || 0, all = total > 0 && crumbs >= total;
  return { n, last: !!n && !nextExists, time: fmtTime(clock), squashed: stats.squashed || 0, crumbs, total, all, points, record: !flew && points > (prevBest || 0), flew: !!flew };
}
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
export function winHTML(d, T) {
  const row = (ico, label, val) => `<div class="wrow"><span>${ico} ${esc(label)}</span><b>${esc(val)}</b></div>`;
  return `<div class="wgrid">${row('⏱', T('win.time'), d.time)}${row('🐜', T('win.ants'), d.squashed)}${d.total ? row('★', T('win.crumbs'), `${d.crumbs}/${d.total}${d.all ? ' ★' : ''}`) : ''}</div>`
    + `<div class="wpts">${T('win.points')}: ${d.points}${d.record ? `<small>${T('win.record')}</small>` : ''}</div>` + (d.flew ? `<i>${T('win.flew')}</i>` : '');
}
// Overlegg (#story) med fortelling: ett trykk hvor som helst (eller på knappen) hopper videre.
export function showCard(el, { title, text, btn, skip, onDone }) {
  el.innerHTML = `<div class="scard"><h2>${esc(title)}</h2><p>${esc(text)}</p><button class="sgo">${esc(btn)}</button>${skip ? `<small>${esc(skip)}</small>` : ''}</div>`;
  el.classList.remove('hide'); let done = false;
  const end = (e) => { if (e) { e.stopPropagation(); e.preventDefault?.(); } if (done) return; done = true; el.classList.add('hide'); el.onclick = null; onDone?.(); };
  el.onclick = end; el.querySelector('.sgo').onclick = end;
  return end;
}
