// R95: Byggeskolen i menyen, visning (DOM). Menyknappen BYGGESKOLE med merkelapp, det lille kortet «Ny til bygging? Prøv BYGGESKOLE først» (PRØV SKOLEN / HOPP OVER)
// og kortet «Byggeskolen er klar». Store knapper (minst 48 px), ingen taster. Logikken står i byggeskole_logic.js.
import { schoolBadge } from './byggeskole_logic.js';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export const schoolCss = () => `
#start .sktag{display:inline-block;margin-left:8px;padding:2px 8px;border-radius:10px;background:#3df0b0;color:#06281d;font:800 11px system-ui;letter-spacing:.5px;vertical-align:middle}
#start .sktag.p{background:#ffd36a;color:#3a2a00}
.skcard{position:fixed;left:50%;bottom:calc(max(14px,env(safe-area-inset-bottom)) + 8px);transform:translateX(-50%);z-index:60;width:min(92vw,380px);box-sizing:border-box;padding:12px 14px;border-radius:16px;background:#0b1020f2;border:2px solid #3df0b0;color:#e8fff6;font:600 14px/1.3 system-ui;text-align:center;box-shadow:0 6px 24px #0008}
.skcard b{display:block;font:800 16px system-ui;margin-bottom:4px}
.skcard .skb{display:flex;gap:8px;margin-top:10px}
.skcard button{flex:1 1 0;min-height:48px;border-radius:12px;border:2px solid #6ab8ff;background:#121a2c;color:#cfe8ff;font:800 14px system-ui}
.skcard button[data-sk="try"],.skcard button[data-sk="ok"]{border-color:#3df0b0;background:#0f3b2c;color:#e8fff6}
`;
// pure: teksten på menyknappen (T = tekstfunksjon; prog = { n, total, started, done })
export function schoolMenuHtml(T, prog) {
  const b = schoolBadge(prog), tag = b.kind === 'recommended' ? `<span class="sktag">${esc(T('school.rec'))}</span>` : `<span class="sktag p">✓ ${b.n}/${b.total}</span>`;
  return `<button class="mbtn sec" id="mSchool">🏗 ${esc(T('school.btn'))}${tag}<small>${esc(T('school.sub', { n: prog.n, total: prog.total }))}</small></button>`;
}
export const schoolCardHtml = (T, kind) => kind === 'done'
  ? `<b>${esc(T('school.done.title'))}</b>${esc(T('school.done.text'))}<div class="skb"><button data-sk="ok">${esc(T('school.done.ok'))}</button></div>`
  : `<b>${esc(T('school.card.title'))}</b>${esc(T('school.card.text'))}<div class="skb"><button data-sk="try">${esc(T('school.card.try'))}</button><button data-sk="skip">${esc(T('school.card.skip'))}</button></div>`;

export function createSchoolView({ T, logEv } = {}) {
  let el = null, styled = false;
  const style = () => { if (styled) return; styled = true; try { const st = document.createElement('style'); st.textContent = schoolCss(); document.head.appendChild(st); } catch { /* uten DOM */ } };
  style();   // menyknappens merkelapp trenger stilen før noe kort vises
  const hide = () => { if (el) { el.remove?.(); el = null; } };
  function mount(kind, handlers) {
    hide();
    style();
    el = document.createElement('div'); el.className = 'skcard'; el.setAttribute?.('role', 'dialog'); el.innerHTML = schoolCardHtml(T, kind);
    for (const [k, fn] of Object.entries(handlers)) { const b = el.querySelector(`[data-sk="${k}"]`); if (b) b.onclick = (e) => { e?.stopPropagation?.(); hide(); fn(); }; }
    document.body.appendChild(el); return el;
  }
  return {
    // T: tekstfunksjon (følger språket)
    showCard: ({ onTry, onSkip }) => mount('card', { try: onTry, skip: onSkip }),
    showDone: ({ onOk }) => mount('done', { ok: onOk }),
    hide, get open() { return !!el; },
  };
}
