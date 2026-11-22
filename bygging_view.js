// R133: BYGGING-gruppen i VELG BRETT, visning (DOM). Overskrift + kort (HTML-strenger fra main.js) og et lite engangsvarsel som kan lukkes.
import { schoolCss } from './byggeskole_view.js';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// pure: gruppen nederst i VELG BRETT. items: [{ html }] (ferdig tegnede knapper). Tom liste gir tom streng.
export const buildingGroupHtml = (title, items) => items.length ? `<div class="bgrp" id="dfBygging"><h2>${esc(title)}</h2>${items.map((i) => i.html).join('')}</div>` : '';
export const buildingCss = () => `
#start .bgrp{width:min(320px,86vw);margin-top:10px;padding-top:6px;border-top:2px solid #ffffff33;display:flex;flex-direction:column;gap:10px;align-items:center}
#start .bgrp h2{margin:0;font:800 13px system-ui;letter-spacing:1.5px;color:#ffd36a}
`;
export function createBuildingView({ T, logEv } = {}) {
  let el = null, styled = false;
  const style = () => { if (styled) return; styled = true; try { const st = document.createElement('style'); st.textContent = schoolCss() + buildingCss(); document.head.appendChild(st); } catch { /* uten DOM */ } };
  const hide = () => { if (el) { el.remove?.(); el = null; } };
  return {
    style,
    showMoved: ({ onOk }) => {
      hide(); style();
      el = document.createElement('div'); el.className = 'skcard'; el.id = 'bgMoved'; el.setAttribute?.('role', 'dialog');
      el.innerHTML = `<b>${esc(T('bygging.moved.title'))}</b>${esc(T('bygging.moved.text'))}<div class="skb"><button data-sk="ok">${esc(T('bygging.moved.ok'))}</button></div>`;
      const b = el.querySelector('[data-sk="ok"]'); if (b) b.onclick = (e) => { e?.stopPropagation?.(); hide(); onOk?.(); };
      document.body.appendChild(el); return el;
    },
    hide, get open() { return !!el; },
  };
}
