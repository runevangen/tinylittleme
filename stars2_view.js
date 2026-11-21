// R126: runde 2, visning (DOM-fri tekst-HTML, kjøres også i node). Delt av resultatkortet (buildnext_view.js) og Byggeskolens stedsrad (bygglab_view.js), så Badebroen og Bygglab-stedene ser likt ut (R101).
// Viser tre små merker (BILLIGST, LETTEST, SMULE; ★ når tatt, ☆ med målet når ikke) og beste-lista (de tre beste byggene). Ingen taster nevnes. Logikken står i stars2_logic.js.
import { chips, weightText } from './stars2_logic.js';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export const r2Css = () => `
#bld .bnres .r2{display:flex;flex-direction:column;gap:3px;align-items:center}
#bld .bnres .r2c{display:flex;gap:4px;flex-wrap:wrap;justify-content:center}
#bld .bnres .r2c span{padding:2px 7px;border-radius:10px;border:1.5px solid #6a7a96;background:#121a2c;color:#b9c6e0;font:800 11.5px/1.2 system-ui;white-space:nowrap}
#bld .bnres .r2c span.ok{border-color:#ffd23f;background:#3a3010;color:#ffe9a8}
#bld .bnres .r2c span.new{box-shadow:0 0 0 2px #ffd23f88}
#bld .bnres .r2b{font:700 11.5px/1.3 system-ui;color:#cfe8ff;text-align:center}
#bld .bnres .r2b i{font-style:normal;color:#ffd23f}
#bld.bux.bxland .bnres .r2b,#bld.cbx.cxland .bnres .r2b{display:none}
#bld.bux.bxland .bnres .r2c span,#bld.cbx.cxland .bnres .r2c span{font-size:9px;padding:1px 4px}
`;
export const chipLabel = (T, c) => (c.ok ? '★ ' : '☆ ') + T('r2.' + c.k) + (c.ok ? '' : c.target != null ? ' ' + T('r2.goal', { c: c.k === 'cheap' ? c.target : weightText(c.target) }) : '');
export const bestLine = (T, e, i, mine) => `<i>${i + 1}.</i> ${esc(T('r2.entry', { cost: e.cost, k: weightText(e.weight), parts: e.parts }))}${mine ? ' ◀' : ''}`;
// r2: { ev, rec } fra build.js (ev = stars2_logic.evaluate, rec = stars2_logic.record). Tom tekst når det ikke er noe å vise.
export function r2CardHtml(T, r2) {
  if (!r2 || !r2.ev) return '';
  const cs = chips(r2.ev, (r2.rec && r2.rec.got) || []), fresh = new Set((r2.rec && r2.rec.newGot) || []);
  const head = cs.map((c) => `<span class="${c.ok ? 'ok' : ''}${fresh.has(c.k) ? ' new' : ''}">${esc(chipLabel(T, c))}</span>`).join('');
  const list = (r2.rec && r2.rec.list) || [], rank = (r2.rec && r2.rec.rank) || 0;
  const best = list.length ? `<div class="r2b"><b>${esc(T('r2.best'))}</b> ` + list.map((e, i) => bestLine(T, e, i, rank === i + 1)).join(' &nbsp; ') + '</div>' : '';
  return `<div class="r2"><div class="r2c">${head}</div>${best}</div>`;
}
// sammendrag til stedsraden: «★ 2/3» (tom når stedet ikke har runde 2)
export const r2BarText = (T, n, total) => (total ? T('r2.bar', { n, total }) : '');
export const r2Sig = (r2) => (r2 && r2.ev ? [r2.ev.n, r2.rec && r2.rec.rank, (r2.rec && r2.rec.list || []).map((e) => e.cost + ':' + e.weight).join(',')].join('/') : '');
