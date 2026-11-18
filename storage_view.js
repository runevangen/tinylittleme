// R86: visning (DOM) for lagring: bekreftelse før noe slettes («Nytt spill», «Nullstill alt»). Logikken står i storage_logic.js.
// Bruker startskjermens #start og knappestiler (.mbtn), store trykkflater for mobil.
import { sv } from './storage_logic.js';

const CSS = `#start .svbox{box-sizing:border-box;width:min(420px,90vw);text-align:left;font:500 15px/1.45 system-ui;color:#e6ecfa;background:#ffffff14;border-radius:14px;padding:12px 16px;margin:4px 0 8px}
#start .svbox b{display:block;font:800 13px system-ui;letter-spacing:.04em;text-transform:uppercase;color:#ffd9a0;margin-bottom:4px}
#start .svbox ul{margin:0;padding-left:20px}#start .svbox.keep b{color:#9fe0c8}`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function createStorageView({ $, lang, logEv }) {
  const L = () => lang();
  if (!document.getElementById('svcss')) { const s = document.createElement('style'); s.id = 'svcss'; s.textContent = CSS; document.head.appendChild(s); }
  // Viser hva som slettes og beholdes, med AVBRYT først (vanskeligst å bomme på). kind: 'new' | 'all'.
  function confirmWipe({ kind, plan, onOk, onCancel, host = $('start') }) {
    const el = host, T = (k, v) => sv(L(), k, v);
    el.classList.remove('dfl');
    const lose = [];
    if (kind === 'all') {
      if (plan.boards) lose.push(T('sv.boards', { n: plan.boards }));
      if (plan.cleared) lose.push(T('sv.cleared', { n: plan.cleared }));
      if (plan.badges) lose.push(T('sv.allBadges', { n: plan.badges }));
      if (plan.settings) lose.push(T('sv.allSettings', { n: plan.settings }));
    } else {
      if (plan.boards) lose.push(T('sv.boards', { n: plan.boards }));
      if (plan.runs) lose.push(T('sv.runs', { n: plan.runs }));
    }
    const keep = kind === 'all' ? T('sv.allKeep') : T('sv.keepList');
    el.innerHTML = `<h1>${esc(T(kind === 'all' ? 'sv.allTitle' : 'sv.newTitle'))}</h1>`
      + (lose.length ? `<div class="svbox"><b>${esc(T(kind === 'all' ? 'sv.allLose' : 'sv.newLose'))}</b><ul>${lose.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : `<p class="tag">${esc(T('sv.nothing'))}</p>`)
      + `<div class="svbox keep"><b>${esc(T('sv.keep'))}</b>${esc(keep)}</div>`
      + `<button class="mbtn" id="svCancel">${esc(T('sv.cancel'))}</button><button class="mbtn warn" id="svOk">${esc(T(kind === 'all' ? 'sv.allOk' : 'sv.newOk'))}</button>`;
    el.classList.remove('hide');
    logEv('lagring', `bekreftelse vist (${kind}): ${plan.boards} brett, ${plan.runs} tider`);
    $('svCancel').onclick = () => { logEv('lagring', `avbrutt (${kind})`); onCancel?.(); };
    $('svOk').onclick = () => { logEv('lagring', `bekreftet (${kind})`); onOk?.(); };
  }
  return { confirmWipe };
}
