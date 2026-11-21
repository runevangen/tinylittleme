// R111: låste byggesteder i det nye skallet (DOM). Et sted som er låst (forrige sted ikke bestått) viser samme skall som de åpne: topplinje (← ◀ «Fagverk · 4/8» ▶ ⋯),
// stedet forhåndsvist og dempet bak, et rolig kort med 🔒 og «Bestå Vippe (3/8) først for å åpne Fagverk», og én stor knapp nederst: GÅ TIL VIPPE.
// Ingen bygging, ingen PRØV, ingen delebrett eller materialvalg mens stedet er låst: alt det gamle skjules med CSS og berøring stoppes av dekket.
// Når stedet åpnes (forrige bestått), byttes kortet ut av det vanlige skallet uten omstart (ctx.onUnlock). Logikken ligger i buildlock_logic.js. Ingen taster nevnes.
import { BL, lockCard, goLog, topOf, unlocked } from './buildlock_logic.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const SAFE_T = 'max(8px,env(safe-area-inset-top))', SAFE_B = 'max(8px,env(safe-area-inset-bottom))';

export const blkCss = () => `
#bld .blkx{display:none;font-family:system-ui}
#bld.blkon .blkx{display:block}
#bld.blkon .bt.top,#bld.blkon .bt.bot,#bld.blkon .zoom,#bld.blkon .tools,#bld.blkon .tray,#bld.blkon .gtools,#bld.blkon .gsim,#bld.blkon .gg,#bld.blkon .lab,#bld.blkon .loads,#bld.blkon .share,#bld.blkon .hint,#bld.blkon .bux,#bld.blkon .cbx,#bld.blkon .cxrail,#bld.blkon .bxsheet,#bld.blkon .cxsheet,#bld.blkon .bnres,#bld.blkon .bnnext,#bld.blkon .cxsel,#bld.blkon .gguide,#bld.blkon .bxrail{display:none!important}
#bld .blkx .blkscrim{position:absolute;inset:0;background:rgba(8,12,24,.62);pointer-events:auto;z-index:1}
#bld .blkx button{pointer-events:auto;font-family:system-ui}
#bld .blkx .blktop{position:absolute;left:0;right:0;top:${SAFE_T};height:48px;display:flex;gap:8px;padding:0 8px;padding-right:max(52px,calc(env(safe-area-inset-right) + 52px));align-items:stretch;z-index:3}
#bld .blkx .blkb{flex:0 0 52px;height:48px;border-radius:14px;border:2px solid #6ab8ff;background:#121a2ce6;color:#cfe8ff;font:800 24px/1 system-ui;padding:0;min-width:48px}
#bld .blkx .blkb.nav{flex:0 0 48px;width:48px;font-size:20px;border-color:#ffa940;color:#ffd9a0}
#bld .blkx .blkb.nav[hidden]{display:none}
#bld .blkx .blkname{flex:1 1 0;min-width:0;display:flex;flex-direction:column;justify-content:center;align-items:center;border-radius:14px;background:#0b1020cc;border:2px solid #ffa940;color:#fff0d8;padding:0 6px;text-align:center;line-height:1.1;pointer-events:none}
#bld .blkx .blkname b{font:800 13px system-ui;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#bld .blkx .blkname i{font:700 12px system-ui;font-style:normal;color:#ffd9a0}
#bld .blkx .blkcard{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(440px,calc(100% - 32px));box-sizing:border-box;padding:14px 16px;border-radius:18px;background:#0b1020;border:2px solid #ffa940;color:#fff0d8;text-align:center;z-index:2;display:flex;flex-direction:column;gap:6px;align-items:center}
#bld .blkx .blkic{font-size:30px;line-height:1}
#bld .blkx .blkt{font:800 16px/1.25 system-ui}
#bld .blkx .blkh{font:700 12.5px/1.25 system-ui;color:#ffd9a0}
#bld .blkx .blkgo{position:absolute;left:0;right:0;bottom:${SAFE_B};display:flex;justify-content:center;padding:0 10px;z-index:3;pointer-events:none}
#bld .blkx .blkgo button{pointer-events:auto;flex:0 1 440px;min-height:56px;border-radius:28px;border:3px solid #3df0b0;background:#2a7f62;color:#fff;font:800 18px/1.1 system-ui;padding:0 12px}
#bld .blkx .blkgo button[disabled]{opacity:.4}
#bld .blkx .blksheet{position:absolute;inset:0;z-index:5;display:none;align-items:center;justify-content:center;background:#0009}
#bld.blkopen .blkx .blksheet{display:flex}
#bld .blkx .blksheet .card{width:min(420px,calc(100% - 24px));max-height:calc(100% - 16px);overflow:auto;background:#17203a;border:2px solid #6ab8ff;border-radius:18px;padding:12px;display:flex;flex-direction:column;gap:8px;color:#fff;box-sizing:border-box}
#bld .blkx .blksheet button{min-height:${BL.touch + 4}px;border-radius:14px;border:2px solid #6ab8ff;background:#121a2ce6;color:#cfe8ff;font:800 14px/1.1 system-ui;padding:0 8px}
#bld .blkx .blksheet button.p{border-color:#3df0b0;background:#1f7a52;color:#fff}
#bld .blkx .blksheet button[hidden]{display:none}
@media (orientation:landscape) and (max-height:520px){#bld .blkx .blkcard{padding:8px 12px;gap:3px}#bld .blkx .blkic{font-size:22px}#bld .blkx .blkt{font-size:14px}#bld .blkx .blkh{display:none}#bld .blkx .blkgo button{min-height:52px;font-size:16px}}
`;
export const blkMarkup = () => '<div class="blkx"><div class="blkscrim"></div><div class="blktop"><button type="button" class="blkb" data-bl="back">←</button><button type="button" class="blkb nav" data-bl="prev" hidden>◀</button><div class="blkname"><b></b><i></i></div><button type="button" class="blkb nav" data-bl="next">▶</button><button type="button" class="blkb" data-bl="more">⋯</button></div><div class="blkcard" role="group"><div class="blkic">🔒</div><div class="blkt"></div><div class="blkh"></div></div><div class="blkgo"><button type="button" data-bl="go"></button></div><div class="blksheet"><div class="card"><button type="button" class="p" data-bl="go2"></button><button type="button" data-bl="prev2"></button><button type="button" data-bl="menu"></button><button type="button" data-bl="close"></button></div></div></div>';

// ctx: root, T, logEv, toast, state() -> null | { siteId, kind, cur: {name,n,of}, miss: {name,n,of,id,level}, series, prevName, nextName },
//      go(card) -> bool, prev(), back(), menu(), onUnlock()
export function createBuildLock(ctx) {
  const { root, T, logEv, toast } = ctx;
  const q = (s) => root.querySelector(`.blkx ${s}`);
  let phase = 'open', sig = '', shownKey = '', cur = null, card = null;
  const on = () => phase === 'lock';
  function render(s) {
    cur = s; card = lockCard({ kind: s.kind, cur: s.cur, miss: s.miss, siteId: s.siteId });
    const top = topOf({ series: s.series, prevName: s.prevName, nextName: s.nextName });
    const line = T(card.lineKey, card.params), go = T(card.goLabelKey, { name: card.goName });
    const sg = [line, go, s.cur.name, s.cur.n, s.cur.of, !!top.prev, !!top.next, card.canGo, T('blk.title')].join('|'); if (sg === sig) return; sig = sg;
    q('.blkname b').textContent = s.cur.name; q('.blkname i').textContent = (s.cur.n ? `${s.cur.n}/${s.cur.of} ` : '') + '🔒'; q('.blkname').setAttribute('aria-label', s.cur.n ? T('bux.site', { name: s.cur.name, n: s.cur.n, of: s.cur.of }) : s.cur.name);
    q('.blkt').textContent = line; q('.blkh').textContent = T('blk.hint');
    const gb = q('[data-bl="go"]'); gb.textContent = go; gb.disabled = !card.canGo; gb.setAttribute('aria-label', go);
    const pv = q('[data-bl="prev"]'); pv.hidden = !top.prev; pv.setAttribute('aria-label', top.prev ? T('blk.prev', { name: top.prev.name }) : '◀');
    const nx = q('[data-bl="next"]'); nx.hidden = !top.next; nx.setAttribute('aria-label', T('blk.nextAria')); q('[data-bl="back"]').setAttribute('aria-label', T('build.back')); q('[data-bl="more"]').setAttribute('aria-label', T('bux.more'));
    const g2 = q('[data-bl="go2"]'); g2.textContent = go; g2.disabled = !card.canGo;
    const p2 = q('[data-bl="prev2"]'); p2.hidden = !top.prev; p2.textContent = top.prev ? T('blk.prev', { name: top.prev.name }) : '';
    q('[data-bl="menu"]').textContent = T('build.menu'); q('[data-bl="close"]').textContent = T('bux.close');
  }
  // kalles hver tegning fra build.js
  function frame() {
    const s = ctx.state(), now = s ? 'lock' : 'open', was = phase;
    if (now !== was) { phase = now; root.classList.toggle('blkon', now === 'lock'); if (now === 'open') { root.classList.remove('blkopen'); sig = ''; shownKey = ''; cur = null; card = null; } }
    if (s) { render(s); const key = `${s.siteId}|${s.miss.id || s.miss.level || ''}`; if (key !== shownKey) { shownKey = key; logEv('bygg', card.log); } }
    if (unlocked(was, now)) { logEv('bygg', 'låst sted åpnet uten omstart'); ctx.onUnlock?.(); }
    return now === 'lock';
  }
  const sheet = (open) => { root.classList.toggle('blkopen', !!open && on()); };
  const actions = {
    back: () => ctx.back(), more: () => sheet(!root.classList.contains('blkopen')), close: () => sheet(false), menu: () => { sheet(false); ctx.menu(); },
    go: () => { if (!card || !card.canGo) return; logEv('bygg', goLog(card)); sheet(false); ctx.go(card); }, prev: () => { sheet(false); ctx.prev(); },
    next: () => { if (cur) toast(T('blk.nextLocked', { name: cur.miss.name })); },
  };
  actions.go2 = actions.go; actions.prev2 = actions.prev;
  const box = root.querySelector('.blkx');
  if (box) {
    for (const ev of ['pointerdown', 'pointermove', 'pointerup', 'touchstart', 'touchmove', 'wheel']) box.addEventListener(ev, (e) => e.stopPropagation());   // ingen berøring slipper gjennom til byggeflaten
    box.addEventListener('click', (e) => { const b = e.target.closest?.('[data-bl]'), k = b && b.dataset.bl; if (!k) { if (e.target === q('.blksheet')) sheet(false); return; } if (b.disabled || !Object.hasOwn(actions, k)) return; e.stopPropagation(); actions[k](); });
  }
  const reset = () => { phase = 'open'; sig = ''; shownKey = ''; cur = null; card = null; root.classList.remove('blkon', 'blkopen'); };
  return { frame, on, reset, sheet, get card() { return card; }, get phase() { return phase; } };
}
