// R134: visning av logoen: stil for hovedmenyen og styring av lasteskjermen (#splash i index.html). Lasteskjermen blokkerer aldri:
// den har pointer-events:none, en CSS-animasjon lukker den uansett (selv om denne modulen aldri laster), og den fjernes hvis bildet ikke laster.
import { LOGO, menuLogoHtml, splashCloseDelay } from './logo_logic.js';

export function createLogo({ doc = document, win = window, logEv = () => {}, getOn = () => true, version = '', now = () => Date.now() } = {}) {
  const st = { shown: false, t0: now(), closed: false, timer: null };
  const style = doc.createElement('style');
  style.textContent = `#start h1.logoh1{margin:0;line-height:0;text-shadow:none}
  #start .logoimg{display:block;height:clamp(64px,19vh,150px);width:auto;max-width:min(320px,82vw);object-fit:contain;filter:drop-shadow(0 3px 10px #0007)}
  @media (orientation:landscape) and (max-height:520px){#start .logoimg{height:clamp(48px,17vh,84px)}}`;
  doc.head.appendChild(style);
  const splash = () => doc.getElementById('splash');
  function closeSplash(why, silent) {
    if (st.closed) return; st.closed = true; if (st.timer) { win.clearTimeout(st.timer); st.timer = null; }
    const el = splash(); if (el) { el.classList.add('out'); win.setTimeout(() => { el.remove(); }, LOGO.fadeMs + 50); }
    if (!silent) logEv('logo', 'lasteskjerm lukket: ' + why);   // ikke ved oppstart: logEv bruker clock, som ikke finnes ennå
  }
  function schedule() {
    if (st.closed) return; if (st.timer) win.clearTimeout(st.timer);
    const d = splashCloseDelay({ elapsed: now() - st.t0, menuShown: st.shown });
    st.timer = win.setTimeout(() => closeSplash(st.shown ? 'menyen vises' : 'tidsfrist'), d);
  }
  // kalles fra showStart: setter logoen inn i menyen (eller vanlig tekst når valget er av) og lukker lasteskjermen
  function menu(startEl) {
    const on = !!getOn(); const h = startEl && startEl.querySelector('h1'); if (!h) return;
    const wrap = doc.createElement('div'); wrap.innerHTML = menuLogoHtml({ on, v: version });
    const n = wrap.firstElementChild; h.replaceWith(n);
    const img = n.querySelector('img'); if (img) img.addEventListener('error', () => { const t = doc.createElement('h1'); t.textContent = 'tinylittleme'; n.replaceWith(t); logEv('logo', 'menylogo lastet ikke: tekst brukes'); });
    if (!st.closed) { st.shown = true; schedule(); }
  }
  const sp = splash();
  if (sp) { const im = sp.querySelector('img'); if (im) im.addEventListener('error', () => closeSplash('bildet lastet ikke', true)); if (!getOn()) closeSplash('valget er av', true); else schedule(); }
  return { menu, closeSplash, st };
}
