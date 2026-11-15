// R67: Bygglab, visning i byggeskjermen (DOM). Én rad under de øverste knappene: ◀ (forrige sted) · «Sted 3/8: Fagverk» · ▶ · NULLSTILL STED · NULLSTILL ALLE.
// Store knapper (minst 44 px), ingen tastatur. Oppgaveteksten for stedet vises som hint-tekst (build.js). Logikken står i bygglab_logic.js.
export const LAB_TOP = 52;   // px som raden tar av høyden over tegningen (build.js legger det til TOPPX)

export const labCss = () => `
#bld .lab{position:absolute;left:0;right:0;top:calc(max(8px,env(safe-area-inset-top)) + 54px);display:none;gap:5px;padding:0 8px;pointer-events:none;align-items:stretch}
#bld.lab .lab{display:flex}
#bld.lab .hint{top:calc(max(8px,env(safe-area-inset-top)) + 100px);font-size:12px;line-height:1.25}
#bld.lab .zoom{top:calc(max(8px,env(safe-area-inset-top)) + 158px)}
#bld .lab button{pointer-events:auto;flex:0 0 auto;height:44px;min-width:44px;padding:0 6px;border-radius:12px;border:2px solid #6ab8ff;background:#121a2ce6;color:#cfe8ff;font:800 18px system-ui;white-space:normal;line-height:1.05}
#bld .lab button[data-lb="site"],#bld .lab button[data-lb="all"]{font:700 10px system-ui;width:72px;padding:0 1px;border-color:#ffa940;color:#ffd9a0}
#bld .lab .nm{flex:1 1 0;min-width:0;display:flex;align-items:center;justify-content:center;text-align:center;border-radius:12px;background:#0b1020cc;border:2px solid #3df0b0;color:#e8fff6;font:800 13px system-ui;padding:0 4px;line-height:1.1}
#bld.sim .lab button{opacity:.55}
@media (orientation:landscape) and (max-height:520px){#bld .lab button{height:38px}#bld.lab .hint{top:calc(max(8px,env(safe-area-inset-top)) + 94px)}#bld.lab .zoom{top:calc(max(8px,env(safe-area-inset-top)) + 130px)}}
`;
export const labMarkup = () => '<div class="lab"><button data-lb="prev" aria-label="◀">◀</button><div class="nm"></div><button data-lb="next" aria-label="▶">▶</button><button data-lb="site"></button><button data-lb="all"></button></div>';

// tekstene på raden: info = { n, of, key }, nm = stedets navn (språk), flag = nådd?
export function labSync(root, T, info, nm, reached) {
  const q = (k) => root.querySelector(`[data-lb="${k}"]`), el = root.querySelector('.lab .nm');
  if (el) el.textContent = `${reached ? '🚩 ' : ''}${T('lab.bar', { n: info.n, of: info.of, name: nm })}`;
  const s = q('site'), a = q('all'), p = q('prev'), n = q('next');
  if (s) s.textContent = T('lab.resetSite'); if (a) a.textContent = T('lab.resetAll');
  if (p) p.setAttribute?.('aria-label', T('lab.prev')); if (n) n.setAttribute?.('aria-label', T('lab.next'));
}
