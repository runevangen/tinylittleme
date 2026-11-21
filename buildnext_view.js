// R107: «Neste sted» tydelig i byggeren, visning (DOM). To ting, felles for den nye byggeskjermen i begge skall (buildux_view.js: broer og Byggeskolen, buildux_classic_view.js: Trapp m.fl.):
//  1) resultatkortet etter en prøve: «Bestått ★★☆», stor primærknapp (NESTE STED ▶ med navn og nummer, eller TILBAKE TIL SPILLET / FERDIG) og en mindre PRØV IGJEN. Kortet erstatter PRØV-raden mens resultatet vises.
//  2) en ▶-knapp med navnet på neste sted i topplinjen (🔒 når det er låst; trykk viser hvorfor).
// Stående: kortet ligger nederst over PRØV-raden. Liggende: kortet står i høyre panel der PRØV står. Logikken ligger i buildnext_logic.js. Ingen taster nevnes.
import { r2Css, r2CardHtml, r2Sig } from './stars2_view.js';   // R126
import { BN, cardOf, titleKey, primaryKey, starLine, createUse } from './buildnext_logic.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const SAFE_B = 'max(8px,env(safe-area-inset-bottom))';

export const bnCss = () => r2Css() + `
#bld .bnres,#bld .bnnext{display:none;font-family:system-ui}
#bld.bnshow .bnres{display:flex}
#bld.bnser .bnnext{display:flex}
#bld.bnshow.bux .bux .bxgo,#bld.bnshow.cbx .cbx .cxgo{display:none!important}
#bld .bnres{position:absolute;left:10px;right:10px;bottom:${SAFE_B};z-index:5;box-sizing:border-box;padding:8px 10px 10px;border-radius:18px;background:#0b1020;border:2px solid #3df0b0;color:#e8fff6;flex-direction:column;gap:5px;text-align:center;pointer-events:auto;box-shadow:0 -4px 18px #0007}
#bld .bnres.bad{border-color:#ff9a8a}
#bld .bnres .bnt{font:800 17px/1.2 system-ui}
#bld .bnres .bnt .bnst{color:#ffd23f;letter-spacing:2px;white-space:nowrap}
#bld .bnres .bnh{font:700 12.5px/1.25 system-ui;color:#ffd9a0}
#bld .bnres button{pointer-events:auto;font-family:system-ui;margin:0}
#bld .bnres .bnp{min-height:${BN.touch + 6}px;border-radius:16px;border:3px solid #3df0b0;background:#2a7f62;color:#fff;font:800 18px/1.1 system-ui;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4px 8px}
#bld .bnres .bnp small{font:700 12.5px/1.2 system-ui;color:#d8fff0;max-width:100%}
#bld .bnres.bad .bnp{border-color:#ffa940;background:#7a4a14}
#bld .bnres .bnq{min-height:${BN.touch}px;border-radius:14px;border:2px solid #ffa940;background:#121a2ce6;color:#ffd9a0;font:800 14px/1.1 system-ui;padding:0 8px}
#bld .bnnext{flex:0 0 auto;min-width:56px;max-width:96px;height:48px;box-sizing:border-box;flex-direction:column;align-items:center;justify-content:center;gap:0;padding:0 4px;border-radius:14px;border:2px solid #3df0b0;background:#0f3b2c;color:#e8fff6;line-height:1;pointer-events:auto}
#bld .bnnext .bna{font:800 20px/1 system-ui}
#bld .bnnext small{font:800 10px/1.1 system-ui;max-width:88px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#bld .bnnext.lock{border-color:#ffa940;background:#2b2415;color:#ffd9a0}
#bld .bnnext.lock .bna{font-size:17px}
#bld.sim .bnnext{opacity:.6}
#bld.bux.bxland .bnnext,#bld.cbx.cxland .bnnext{position:absolute;z-index:3;margin:0;flex:none;max-width:none;padding:0}
#bld.bux.bxland .bnnext{left:calc(env(safe-area-inset-left) + (var(--pw,80px) - var(--bxb,52px))/2);top:calc(max(8px,env(safe-area-inset-top)) + var(--bxb,52px) + 8px);width:var(--bxb,52px);height:var(--bxb,52px);min-width:var(--bxb,52px)}
#bld.cbx.cxland .bnnext{left:calc(env(safe-area-inset-left) + (var(--cxpw,80px) - var(--cxb,52px))/2);top:calc(max(8px,env(safe-area-inset-top)) + var(--cxb,52px) + 8px);width:var(--cxb,52px);height:var(--cxb,52px);min-width:var(--cxb,52px)}
#bld.bux.bxland .bnnext small,#bld.cbx.cxland .bnnext small{max-width:var(--bxb,52px);font-size:9px}
/* liggende: kortet står i høyre panel der PRØV står */
#bld.bux.bxland .bnres,#bld.cbx.cxland .bnres{left:auto;right:calc(env(safe-area-inset-right) + 4px);padding:6px 4px;gap:4px;border-radius:14px}
#bld.bux.bxland .bnres{width:calc(var(--pw,80px) - 8px);bottom:max(8px,env(safe-area-inset-bottom))}
#bld.cbx.cxland .bnres{width:calc(var(--cxpw,80px) - 8px);bottom:var(--cxs,8px)}
#bld.bux.bxland .bnres .bnt,#bld.cbx.cxland .bnres .bnt{font-size:12px}
#bld.bux.bxland .bnres .bnh,#bld.cbx.cxland .bnres .bnh{display:none}
#bld.bux.bxland .bnres .bnp,#bld.cbx.cxland .bnres .bnp{font-size:12px;min-height:62px;padding:3px 2px;border-radius:12px;border-width:2px}
#bld.bux.bxland .bnres .bnp small,#bld.cbx.cxland .bnres .bnp small{font-size:10px}
#bld.bux.bxland .bnres .bnq,#bld.cbx.cxland .bnres .bnq{font-size:9.5px;padding:0 1px;border-radius:12px;min-width:0;overflow:hidden}
#bld.bux.bxland .bnres .bnp,#bld.cbx.cxland .bnres .bnp{min-width:0;overflow:hidden;font-size:11px}
#bld.bux.bxland .bnres .bnp span,#bld.cbx.cxland .bnres .bnp span{max-width:100%;white-space:normal;text-align:center;overflow-wrap:anywhere}
`;
export const bnMarkup = () => '<div class="bnres" role="group"></div>';

// ctx: root, T, logEv, toast, state() -> se build.js (skin, series, nextLocked, nextName, nextTitle, prevName, curName, phase, won, solved, over, loadMore, stars, nextStar, allDone),
//      goNext(how), again(), back()
export function createBuildNext(ctx) {
  const { root, T, logEv } = ctx;
  const res = root.querySelector('.bnres'), use = createUse();
  let sig = '', cardNow = null;
  const tops = [];
  for (const top of root.querySelectorAll('.bxtop,.cxtop')) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'bnnext'; b.dataset.bn = 'top';
    const more = top.querySelector('.bxmore,.cxmore'); if (more) top.insertBefore(b, more); else top.appendChild(b);
    b.addEventListener('pointerdown', (e) => e.stopPropagation()); tops.push(b);
  }
  res?.addEventListener('pointerdown', (e) => e.stopPropagation());

  function paintTop(s, tn) {
    for (const b of tops) {
      b.classList.toggle('lock', tn.state === 'locked');
      b.innerHTML = `<span class="bna">${tn.state === 'locked' ? '🔒' : '▶'}</span><small>${esc(s.nextName)}</small>`;
      b.setAttribute('aria-label', T(tn.state === 'locked' ? 'bn.topLocked' : 'bn.topAria', { name: s.nextName }));
    }
  }
  function paintCard(s, c) {
    const stars = '★'.repeat(s.stars || 0) + '☆'.repeat(3 - (s.stars || 0)), sl = c.kind === 'passed' ? starLine(s.stars, s.nextStar) : null;
    const t = esc(T(titleKey(c))), stTag = c.kind === 'passed' ? ` <span class="bnst">${stars}</span>` : '';
    const sub = c.primary === 'next' ? `<small>${esc(T('bn.nextSub', { name: s.nextName, n: s.series.nextN, of: s.series.of }))}</small>` : '';
    const label = c.primary === 'next' ? T('bn.next') : T(primaryKey(c.primary));
    res.className = `bnres${c.kind === 'passed' ? '' : ' bad'}`;
    res.innerHTML = `<div class="bnt">${t}${stTag}</div>${c.kind === 'passed' ? r2CardHtml(T, s.round2) : ''}${sl ? `<div class="bnh">${esc(T('bn.starHint', { cost: sl.cost, parts: sl.parts ?? '' }))}</div>` : ''}`
      + `<button type="button" class="bnp" data-bn="${c.primary}"><span>${esc(label)}</span>${sub}</button>`
      + (c.secondary ? `<button type="button" class="bnq" data-bn="${c.secondary}">${esc(T('bn.again'))}</button>` : '');
  }

  // hver tegning: oppdaterer bare når noe er endret
  function frame() {
    const s = ctx.state(), skin = s && s.skin, tn = skin ? (s.topState ? { state: s.topState } : null) : null, c = skin ? cardOf(s) : null;
    const sg = [skin, tn && tn.state, s && s.nextName, s && s.series && s.series.n, c && c.kind, c && c.primary, c && c.secondary, c && c.final, s && s.stars, s && s.nextStar && s.nextStar.cost, s && s.loadMore, T('bn.again'), r2Sig(s && s.round2)].join('|');
    if (sg === sig) return; sig = sg;
    root.classList.toggle('bnser', !!tn); root.classList.toggle('bnshow', !!c);
    if (tn) paintTop(s, tn);
    if (c && res) { paintCard(s, c); if (!cardNow || cardNow.kind !== c.kind) logEv('bygg', `resultatkort ${c.kind}${c.primary === 'next' ? ' med NESTE STED' : ''}`); }
    cardNow = c;
  }
  function click(e) {
    const b = e.target.closest?.('[data-bn]'), k = b?.dataset?.bn; if (!k) return;
    e.stopPropagation(); e.preventDefault?.();
    const s = ctx.state(); if (!s) return;
    if (k === 'top') {
      if (s.topState === 'locked') { ctx.toast(T('bn.lockedMsg', { name: s.curName, next: s.nextName })); logEv('bygglab', 'neste sted låst (topplinje)'); return; }
      if (s.topState === 'open' && ctx.goNext('topplinje')) logEv('bygglab', 'neste sted via topplinje'); return;
    }
    use.hit();
    if (k === 'next') { if (ctx.goNext('resultatknapp')) logEv('bygglab', 'neste sted via resultatknapp'); return; }
    if (k === 'again') { ctx.again(); logEv('bygg', 'prøv igjen via resultatknapp'); return; }
    if (k === 'back' || k === 'finish') { logEv('bygg', 'tilbake til spillet via resultatknapp'); ctx.back(); }
  }
  root.addEventListener('click', click, true);
  const reset = () => { sig = ''; cardNow = null; root.classList.remove('bnshow', 'bnser'); };
  return { frame, reset, takeUsed: use.take, get card() { return cardNow; }, get topEls() { return tops; }, resEl: res, click };
}
