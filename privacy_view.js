// R87: PERSONVERN-siden (full skjerm, store trykkflater) og linja «Sendes til utvikleren» før første sending. Teksten kommer fra i18n.js (priv.*).
import { PRIV_SECTIONS } from './privacy_logic.js';

const CSS = `#privacy{position:fixed;inset:0;z-index:30;background:#101a2c;color:#eef2fa;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:max(14px,env(safe-area-inset-top)) 16px max(18px,env(safe-area-inset-bottom));box-sizing:border-box}
  #privacy.hide{display:none}
  #privacy .pvw{max-width:420px;margin:0 auto;display:flex;flex-direction:column;gap:10px}
  #privacy h2{margin:6px 0 0;font:800 clamp(24px,7vw,32px)/1.1 Georgia,serif;font-style:italic;color:#ffd9a0}
  #privacy .pvi{font:600 15px/1.4 system-ui;color:#cfe8d6}
  #privacy .pvs{background:#ffffff18;border-radius:14px;padding:12px 14px}
  #privacy .pvs h3{margin:0 0 4px;font:800 15px system-ui;color:#ffd23f}
  #privacy .pvs p{margin:0;font:500 15px/1.45 system-ui}
  #privacy .pvb{min-height:52px;border:0;border-radius:14px;background:var(--accent,#ffa940);color:#1d2433;font:800 16px system-ui;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
  #privacy .pvb:active{transform:scale(.97)}
  .privnote{display:block;color:#cfd7e6;font:600 12px/1.35 system-ui;margin-top:4px}
  .privnote button{background:none;border:0;padding:6px 0;color:#7cc4ff;font:800 12px system-ui;text-decoration:underline;min-height:32px}`;
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function createPrivacy({ T, logEv, doc = document, stats = null }) {
  const st = doc.createElement('style'); st.textContent = CSS; doc.head.appendChild(st);
  const el = doc.createElement('div'); el.id = 'privacy'; el.className = 'hide'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Personvern'); doc.body.appendChild(el);
  const render = () => {
    el.innerHTML = `<div class="pvw"><button class="pvb" data-close="1">${esc(T('priv.back'))}</button><h2>${esc(T('priv.title'))}</h2><div class="pvi">${esc(T('priv.intro'))}</div>`
      + PRIV_SECTIONS.map((id) => `<div class="pvs" data-sec="${id}"><h3>${esc(T(`priv.${id}.h`))}</h3><p>${esc(T(`priv.${id}`))}</p></div>`).join('')
      + (stats ? `<button class="pvb" data-stats="1" aria-pressed="${stats.get()}">${esc(T(stats.get() ? 'priv.stats.on' : 'priv.stats.off'))}</button>` : '')
      + `<button class="pvb" data-close="1">${esc(T('priv.back'))}</button></div>`;
  };
  el.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); else if (stats && e.target.closest('[data-stats]')) { stats.set(!stats.get()); render(); } });
  function open(from) { render(); el.classList.remove('hide'); el.scrollTop = 0; logEv('personvern', `åpnet fra ${from || '?'}`); }
  function close() { el.classList.add('hide'); }
  // Linja under SEND-knappene: «Sendes til utvikleren …» + PERSONVERN-lenke. Returnerer elementet (skjules/vises av kalleren).
  function note(parent, from) {
    const n = doc.createElement('span'); n.className = 'privnote';
    n.innerHTML = `${esc(T('priv.note'))} <button type="button" data-priv="1">${esc(T('priv.link'))}</button>`;
    n.querySelector('button').addEventListener('click', (e) => { e.stopPropagation(); open(from); });
    parent.appendChild(n); return n;
  }
  const sync = () => { if (!el.classList.contains('hide')) render(); };
  return { open, close, note, sync, el, isOpen: () => !el.classList.contains('hide') };
}
