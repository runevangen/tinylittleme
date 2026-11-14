// R53: toppbåndet (DOM). Logikken ligger i topband_logic.js. Ett rolig bånd øverst: melding (etter prioritet) · versjon · ★ · ℹ · ⚑.
// Trykk på båndet åpner et panel (delmål, brett og versjon, siste svar, send-status, tellere) som lukkes etter ca. 6 s eller ved trykk utenfor.
import { createQueue, push, clear, compose, statusParts, bandKey, panelModel, shouldClose, bandHeight, AUTO_CLOSE_MS } from './topband_logic.js';

const CSS = `#topband{position:fixed;left:max(8px,env(safe-area-inset-left));right:max(8px,env(safe-area-inset-right));top:max(6px,env(safe-area-inset-top));z-index:5;display:none;font:600 12px/16px system-ui;color:#fff;-webkit-font-smoothing:antialiased;text-rendering:geometricPrecision;-webkit-tap-highlight-color:transparent;touch-action:manipulation;--tbh:32px}
body.tb #topband{display:block}
body.tb.ovview #topband{visibility:hidden}
#topband .tbm{display:flex;align-items:center;gap:6px;min-height:var(--tbh);box-sizing:border-box;padding:0 4px 0 9px;background:#121a2ce6;border:1px solid #ffffff2a;border-radius:16px;cursor:pointer}
#topband.big .tbm{border-radius:18px}
#topband .tba{flex:none;width:20px;height:20px;display:none}#topband.next .tba{display:block}#topband .tba svg{width:20px;height:20px;transition:transform .08s linear}
#topband .tbt{flex:1;min-width:0;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;padding:3px 0;overflow-wrap:anywhere}   /* R56: heltalls linjehøyde (16 px) og jevn padding, så teksten havner på hele piksler (ingen halv-piksel-sentrering = skarp tekst); ingen gjennomsiktighet, transform eller filter på tekst */
#topband .tbk{flex:none;display:none;white-space:nowrap;color:#ffd23f;font-weight:700}#topband.next .tbk.on{display:block}   /* kort tekst = én linje (32 px); lange mål og hint bryter til to, viktige hint til tre */
#topband.big .tbt{-webkit-line-clamp:3}
#topband.dim .tbt{color:#ffffff9e}#topband.next .tbt{color:#ffd9a0}#topband.hint .tbt{color:#eef2fa}
#topband.danger .tbm{background:#b3261eee;border-color:#fff}#topband.reply .tbm{background:#2f6b45ee;border-color:#5ad17a}
#topband .tbw{flex:none;color:#8fe3ff;font-weight:700;display:none;white-space:nowrap}#topband .tbw.on{display:block}
#topband .tbs{flex:none;color:#ffd23f;font-weight:700;display:none}#topband .tbs.on{display:block}
#topband .tbv{flex:none;font:600 11px ui-monospace,monospace;color:#cfd8ea}
#topband .tbb{flex:none;position:relative;width:32px;height:var(--tbh);min-height:30px;margin:0;padding:0;border:0;border-radius:50%;background:transparent;color:#ffd9a0;font:700 16px system-ui;display:flex;align-items:center;justify-content:center}
#topband #tbi{font:800 17px/1 Georgia,serif;font-style:italic}
#topband .tbb.off{display:none}
#topband #tbq.hasreply{color:#7dff9f;animation:qpulse 1.6s ease-in-out infinite}
#topband .tbn{position:absolute;top:1px;right:0;min-width:15px;height:15px;padding:0 3px;box-sizing:border-box;border-radius:8px;background:#e8504a;color:#fff;font:700 10px system-ui;display:none;align-items:center;justify-content:center}
#topband .tbp{display:none;margin-top:5px;background:#121a2cf4;border:2px solid #ffa940;border-radius:14px;padding:9px 12px;max-height:min(56vh,360px);overflow:auto;-webkit-overflow-scrolling:touch;font:500 13px/1.4 system-ui}
#topband.open .tbp{display:block}
#topband .tbp .ph{font:700 13px ui-monospace,monospace;color:#ffd9a0;margin-bottom:6px}
#topband .tbp ul{list-style:none;margin:4px 0;padding:0}#topband .tbp li{padding:2px 0;display:flex;gap:7px}#topband .tbp li.done{opacity:.6;text-decoration:line-through}#topband .tbp li.act{color:#ffd23f}#topband .tbp li i{font-style:normal;flex:none;width:14px;text-align:center}
#topband .tbp .pr{margin-top:6px;background:#ffffff18;border-radius:8px;padding:5px 8px}#topband .tbp .pr.rep{background:#2f6b45;border:1px solid #5ad17a}
#topband .tbp .qs1{color:#cfe8d6;font:600 12px system-ui}
#topband .tbp button{margin-top:7px;border:0;border-radius:9px;padding:9px 12px;background:#ffffff26;color:#ffd9a0;font:700 13px system-ui}
@media (orientation:landscape) and (max-height:520px){#topband{right:max(122px,calc(env(safe-area-inset-right) + 114px))}#topband .tbp{max-height:calc(100vh - 70px)}}   /* liggende: knappekolonnen (TA, HOPP, GREP) ligger helt til høyre og starter høyt, så båndet stopper foran den */
body.tb #hud,body.tb #goals,body.tb #compass,body.tb #introhint,body.tb #qbtn,body.tb #help{display:none!important}
body.tb #infotab{display:none}
body.tb #infocard:not(.show){visibility:hidden}
body.tb #infocard{top:calc(max(6px,env(safe-area-inset-top)) + var(--tbh,32px) + 8px)}
body.tb #qpop{top:calc(max(6px,env(safe-area-inset-top)) + var(--tbh,32px) + 8px)}`;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ARROW = '<svg viewBox="-12 -12 24 24"><path d="M0 -10 L7 7 L0 3 L-7 7 Z" fill="#ffa940" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/></svg>';

// opts: { T, onInfo, onFlag, onNext, logEv }
export function createTopBand({ T, onInfo, onFlag, onNext, onOpen, logEv }) {
  if (!document.getElementById('tbcss')) { const s = document.createElement('style'); s.id = 'tbcss'; s.textContent = CSS; document.head.appendChild(s); }
  const el = document.createElement('div'); el.id = 'topband';
  el.innerHTML = `<div class="tbm"><span class="tba">${ARROW}</span><span class="tbt"></span><span class="tbk"></span><span class="tbw"></span><span class="tbs"></span><span class="tbv"></span><button class="tbb" id="tbi" aria-label="${esc(T('tb.info'))}">i</button><button class="tbb" id="tbq" aria-label="${esc(T('tb.flag'))}">⚑<span class="tbn"></span></button></div><div class="tbp"></div>`;
  document.body.appendChild(el);
  const q = createQueue(), main = el.querySelector('.tbm'), arr = el.querySelector('.tba svg'), txt = el.querySelector('.tbt'), hnt = el.querySelector('.tbk'), st = el.querySelector('.tbs'), wat = el.querySelector('.tbw'), ver = el.querySelector('.tbv');
  const bi = el.querySelector('#tbi'), bq = el.querySelector('#tbq'), bn = el.querySelector('.tbn'), panel = el.querySelector('.tbp');
  let on = false, open = false, lastTouch = 0, key = '', stKey = '', pKey = '', size = 'compact', last = null, ctxNow = null;
  const setOpen = (v, now = performance.now()) => {
    if (v === open) { if (v) lastTouch = now; return; }
    open = v; lastTouch = now; el.classList.toggle('open', open); pKey = '';
    logEv?.('bånd', open ? 'utvidet' : 'kort'); if (open) onOpen?.(); if (open && ctxNow) renderPanel(ctxNow);
  };
  main.addEventListener('pointerdown', (e) => { e.stopPropagation(); });
  main.addEventListener('click', (e) => { e.stopPropagation(); if (e.target.closest('.tbb')) return; setOpen(!open); });
  bi.addEventListener('click', (e) => { e.stopPropagation(); setOpen(false); onInfo?.(); });
  bq.addEventListener('click', (e) => { e.stopPropagation(); setOpen(false); onFlag?.(e); });
  panel.addEventListener('pointerdown', (e) => { e.stopPropagation(); lastTouch = performance.now(); });
  panel.addEventListener('click', (e) => { e.stopPropagation(); const b = e.target.closest('button'); if (b?.dataset.act === 'next') { setOpen(false); onNext?.(); } else if (b?.dataset.act === 'close') setOpen(false); });
  document.addEventListener('pointerdown', (e) => { if (open && !el.contains(e.target)) setOpen(false); });

  function renderPanel(ctx) {
    const rows = panelModel(ctx); const k = JSON.stringify(rows) + '|' + !!ctx.nextText; if (k === pKey) return; pKey = k;
    let h = '';
    for (const r of rows) {
      if (r.k === 'head') h += `<div class="ph">${esc(r.text)}</div>`;
      else if (r.k === 'goals') h += `<ul>${r.items.map((g) => `<li class="${g.done ? 'done' : g.active ? 'act' : ''}"><i>${g.done ? '✓' : g.active ? '▶' : '○'}</i><span>${esc(g.text)}</span></li>`).join('')}</ul>`;
      else if (r.k === 'next') h += `<div class="pr" style="white-space:pre-line">${esc(r.text)}</div><button data-act="next">${esc(T('tb.camgoal'))}</button>`;
      else if (r.k === 'send') h += `<div class="pr">${esc(r.text)}</div>`;
      else if (r.k === 'reply') h += `<div class="pr rep">✉ ${esc(r.text)}</div>`;
      else if (r.k === 'counts') h += r.items.map((l) => `<div class="qs1">${esc(l)}</div>`).join('');
    }
    panel.innerHTML = h;
  }

  return {
    el, q,
    setOn(v) { on = !!v; document.body.classList.toggle('tb', on); if (!on) { open = false; el.classList.remove('open'); } },
    isOn: () => on,
    isOpen: () => open,
    setSize(s) { size = s; el.style.setProperty('--tbh', `${bandHeight(s)}px`); document.documentElement.style.setProperty('--tbh', `${bandHeight(s)}px`); el.classList.toggle('normal', s === 'normal'); },
    push(id, prio, text, ttl = 4, kind = 'msg', now = performance.now()) { if (!on) return false; push(q, { id, prio, text, ttl, kind }, now); return true; },
    clear(id) { clear(q, id); },
    toggle(v) { setOpen(v === undefined ? !open : v); },
    current: () => last,
    // ctx: se compose/panelModel + { arrowAng, infoOn, flagOn, unread, badge }. Kalles hver ramme; DOM skrives bare ved endring.
    update(ctx, now = performance.now()) {
      if (!on) return;
      ctxNow = ctx;
      const c = compose(q, ctx, now);
      const k = bandKey(c);
      if (k !== key) {
        if (c.prio >= 3 || c.kind !== last?.kind) logEv?.('bånd', `${c.kind}: ${c.text}`.slice(0, 80));
        key = k; txt.textContent = c.text; hnt.textContent = c.hint || ''; hnt.classList.toggle('on', !!c.hint);
        el.className = `${el.className.includes('open') ? 'open ' : ''}${el.className.includes('normal') ? 'normal ' : ''}${c.kind} ${c.dim ? 'dim ' : ''}${c.prio >= 3 ? 'big' : ''}`.trim();
      }
      last = c;
      if (c.arrow !== null) arr.style.transform = `rotate(${c.arrow}rad)`;
      const sp = statusParts(ctx), sk = `${sp.ver}|${sp.star}|${sp.water || ''}`;
      if (sk !== stKey) { stKey = sk; ver.textContent = sp.ver; st.textContent = sp.star; st.classList.toggle('on', !!sp.star); wat.textContent = sp.water || ''; wat.classList.toggle('on', !!sp.water); }
      bi.classList.toggle('off', !ctx.infoOn); bq.classList.toggle('off', !ctx.flagOn);
      bq.classList.toggle('hasreply', !!ctx.unread); const bd = ctx.badge | 0; bn.textContent = bd; bn.style.display = bd ? 'flex' : 'none';
      if (open) { if (shouldClose(lastTouch, now, AUTO_CLOSE_MS)) setOpen(false, now); else renderPanel(ctx); }
    },
  };
}
