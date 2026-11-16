// R75: «Så slik»-guide for rutenett-bygging (DOM). Logikken ligger i grid_guide_logic.js; byggeskjermen (build.js) lager den og grid_view.js kaller den.
// Kort over brettet med fire trinn, to store knapper (FORSTÅTT, HOPP OVER). Stopper berøring så brettet under ikke rører seg.
import { STEPS, isSeen, markSeen, shouldAutoShow } from './grid_guide_logic.js';

export const guideCss = () => `
#bld .share button.bguide{display:none;font-weight:800}
#bld.gguidebtn .share button.bguide{display:block}
#bld.sim .share button.bguide{display:none}
#bld.gmodetip .share button.bmode{animation:gtip 1.1s ease-in-out infinite;border-color:#ffd23f;color:#fff3c4}
@keyframes gtip{0%,100%{box-shadow:0 0 0 0 rgba(255,210,63,.0)}50%{box-shadow:0 0 0 6px rgba(255,210,63,.55)}}
#bld .gg{position:absolute;inset:0;z-index:30;display:none;align-items:center;justify-content:center;background:rgba(8,12,24,.72);padding:12px;touch-action:none}
#bld.gg-open .gg{display:flex}
#bld .gg .card{width:min(420px,100%);max-height:100%;overflow:auto;background:#17203a;border:2px solid #ffd23f;border-radius:16px;padding:14px 16px;color:#fff;font:600 15px/1.35 system-ui;box-shadow:0 10px 30px #000a}
#bld .gg h3{margin:0 0 8px;font:800 18px system-ui;color:#ffe9a8}
#bld .gg ol{margin:0 0 10px;padding:0;list-style:none;counter-reset:g}
#bld .gg li{counter-increment:g;display:flex;gap:10px;align-items:flex-start;margin:7px 0}
#bld .gg li::before{content:counter(g);flex:none;width:26px;height:26px;border-radius:50%;background:#ffd23f;color:#1a1208;font:800 15px/26px system-ui;text-align:center}
#bld .gg svg{display:block;margin:4px auto 8px;width:100%;max-width:240px;height:auto}
#bld .gg .foot{font:500 12px/1.3 system-ui;color:#b9c4e6;margin:0 0 10px}
#bld .gg .row{display:flex;gap:8px}
#bld .gg .row button{flex:1 1 0;height:50px;font-size:15px;font-weight:800}
#bld .gg .row button.ok{background:#1f7a52;border-color:#3df0b0;color:#fff}
`;
export const guideMarkup = () => '<div class="gg" role="dialog" aria-modal="true"><div class="card"></div></div>';

// to prikker, et trykk på hver, og staven mellom dem (viser trinn 1 og 2)
const SVG = '<svg viewBox="0 0 240 70" aria-hidden="true"><g fill="rgba(255,255,255,.35)"><circle cx="30" cy="50" r="3"/><circle cx="85" cy="50" r="3"/><circle cx="140" cy="50" r="3"/><circle cx="195" cy="50" r="3"/><circle cx="30" cy="15" r="3"/><circle cx="85" cy="15" r="3"/><circle cx="140" cy="15" r="3"/><circle cx="195" cy="15" r="3"/></g><line x1="85" y1="50" x2="195" y2="50" stroke="#1a1208" stroke-width="12" stroke-linecap="round"/><line x1="85" y1="50" x2="195" y2="50" stroke="#c98a45" stroke-width="8" stroke-linecap="round"/><circle cx="85" cy="50" r="8" fill="#fff" stroke="#0b1020" stroke-width="2"/><circle cx="195" cy="50" r="8" fill="#fff" stroke="#0b1020" stroke-width="2"/><circle cx="85" cy="50" r="17" fill="none" stroke="#ffd23f" stroke-width="3"/><circle cx="195" cy="50" r="17" fill="none" stroke="#3df0b0" stroke-width="3"/><text x="85" y="12" fill="#ffd23f" font-size="13" font-weight="800" text-anchor="middle">1</text><text x="195" y="12" fill="#3df0b0" font-size="13" font-weight="800" text-anchor="middle">2</text></svg>';

export function createGridGuide(ctx) {
  const { root, T, store, logEv } = ctx;
  const card = () => root.querySelector('.gg .card');
  let open = false;
  const isOpen = () => open;
  function render() {
    const c = card(); if (!c) return;
    c.innerHTML = `<h3>${T('gguide.title')}</h3>${SVG}<ol>${STEPS.map((s) => `<li>${T('gguide.s.' + s)}</li>`).join('')}</ol>${ctx.getHint?.() ? `<p class="foot">${T('gguide.again')}</p>` : ''}<div class="row"><button data-gg="ok" class="ok">${T('gguide.ok')}</button><button data-gg="skip">${T('gguide.skip')}</button></div>`;
  }
  function show(why = 'knapp') {
    if (open) return false; render(); open = true; root.classList.add('gg-open'); logEv?.('bygg', `rutenett-guide vist (${why})`); return true;
  }
  function hide(how) {
    if (!open) return false; open = false; root.classList.remove('gg-open'); markSeen(store); logEv?.('bygg', `rutenett-guide ${how === 'skip' ? 'hoppet over' : 'lest'}`); ctx.onClose?.(); return true;
  }
  // kalles når rutenett-modus tas i bruk: viser guiden bare første gang (og bare med hjelp på)
  function auto(why = 'første gang') { return shouldAutoShow({ on: ctx.getOn?.(), hint: ctx.getHint?.(), seen: isSeen(store) }) ? show(why) : false; }
  const gg = root.querySelector('.gg');
  if (gg) {
    for (const ev of ['pointerdown', 'pointermove', 'pointerup', 'touchstart', 'touchmove', 'wheel']) gg.addEventListener(ev, (e) => e.stopPropagation());
    gg.addEventListener('click', (e) => { const b = e.target.closest?.('button'); if (b?.dataset.gg) { e.stopPropagation(); hide(b.dataset.gg); } else e.stopPropagation(); });
  }
  const reset = () => { open = false; root.classList.remove('gg-open'); };   // stille lukking (nytt sted): ingen «sett»-merking
  return { show, hide, auto, isOpen, render, reset };
}
