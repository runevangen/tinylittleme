// R123: dialogen DOBBEL BRO (⋯ → DOBBEL BRO) med en liten 3D-forhåndsvisning (2D-lerret med enkel perspektiv; dra for å snu), valg av bredde og tverrstag, kostnad og BRUK / FJERN.
// Fungerer likt i Hyllebroen, de andre broene og Byggeskolen (delt kode, R101). Selve logikken står i grid_25d.js; dialogen skriver bare til DOM når noe er endret.
import { gSetDouble, gClearDouble, canDouble, previewCost, model3d, project, hasDouble, dblOf } from './grid_25d.js';
import { DBL_WIDTHS, DBL_BRACES } from './grid_logic.js';

export const D25_CSS = `
#bld .d25{position:absolute;inset:0;z-index:6;display:none;align-items:center;justify-content:center;background:#000a;touch-action:none}
#bld .d25.open{display:flex}
#bld .d25 .card{width:min(440px,96%);max-height:96%;overflow:auto;display:flex;flex-direction:column;gap:8px;background:#17203a;border:2px solid #6ab8ff;border-radius:16px;padding:10px 12px;color:#cfe8ff;font:600 14px system-ui}
#bld .d25 h3{margin:0;font:800 17px system-ui}
#bld .d25 p{margin:0;font:600 13px/1.3 system-ui;color:#9fb0d8}
#bld .d25 canvas{position:static;inset:auto;flex:0 0 auto;width:100%;height:190px;border-radius:12px;background:#0b1224;touch-action:none;display:block}
#bld .d25 .row{display:flex;gap:6px;align-items:center}
#bld .d25 .row b{flex:0 0 74px;font:800 12px system-ui;color:#9fb0d8;text-transform:uppercase}
#bld .d25 .row button,#bld .d25 .acts button{flex:1 1 0;min-width:0;padding:0 2px;min-height:48px;border-radius:12px;border:2px solid #6ab8ff;background:#121a2ce6;color:#cfe8ff;font:800 13px system-ui;pointer-events:auto}
#bld .d25 .row button.on{background:#1f7a52;border-color:#3df0b0;color:#fff}
#bld .d25 .acts{display:flex;gap:6px}
#bld .d25 .acts .use{background:#1f7a52;border-color:#3df0b0;color:#fff}
#bld .d25 .cost{font:700 13px system-ui;color:#ffe9a8}
@media (orientation:landscape) and (max-height:480px){#bld .d25 canvas{height:96px}#bld .d25 .card{padding:6px 10px;gap:5px}#bld .d25 p{display:none}}
`;
export const d25Markup = () => `<div class="d25"><div class="card"><h3></h3><p class="intro"></p><canvas></canvas><div class="row w"><b></b>${DBL_WIDTHS.map((w) => `<button data-d="w:${w}"></button>`).join('')}</div><div class="row b"><b></b>${DBL_BRACES.map((x) => `<button data-d="b:${x}"></button>`).join('')}</div><div class="cost"></div><div class="acts"><button data-d="use" class="use"></button><button data-d="remove"></button><button data-d="close"></button></div></div></div>`;

export function createDoubleView({ root, T, logEv, toast, buzz, getB, site, isSim, onChange }) {
  const q = (s) => root.querySelector(s), el = q('.d25');
  if (!el) return { open() { return false; }, close() {}, isOpen: () => false, pick() { return false; }, apply() { return false; }, remove() { return false; }, draw() {}, sync() {} };
  const cv = el.querySelector('canvas'), g = cv.getContext?.('2d'), cache = new Map();
  let sel = { w: 'middels', brace: 'x' }, yaw = -0.7, pitch = 0.45, drag = null, frameReq = 0;
  const set = (node, key, val, f) => { let m = cache.get(node); if (!m) cache.set(node, m = new Map()); if (m.get(key) !== val) { m.set(key, val); f(val); } };
  const isOpen = () => el.classList.contains('open');
  const label = () => {
    const B = getB(); if (!B) return;
    set(el.querySelector('h3'), 't', T('d25.title'), (v) => { el.querySelector('h3').textContent = v; }); set(el.querySelector('.intro'), 't', T('d25.intro'), (v) => { el.querySelector('.intro').textContent = v; });
    set(el.querySelector('.row.w b'), 't', T('d25.width'), (v) => { el.querySelector('.row.w b').textContent = v; }); set(el.querySelector('.row.b b'), 't', T('d25.brace'), (v) => { el.querySelector('.row.b b').textContent = v; });
    for (const w of DBL_WIDTHS) { const b = el.querySelector(`[data-d="w:${w}"]`), c = previewCost(B, w, sel.brace); const t = `${T('d25.w.' + w)} +${c.planes + c.braces}`; set(b, 't', t, (v) => { b.textContent = v; }); set(b, 'on', sel.w === w, (v) => { b.classList.toggle('on', v); b.setAttribute('aria-pressed', v ? 'true' : 'false'); }); }
    for (const x of DBL_BRACES) { const b = el.querySelector(`[data-d="b:${x}"]`), c = previewCost(B, sel.w, x); const t = `${T('d25.b.' + x)} +${c.planes + c.braces}`; set(b, 't', t, (v) => { b.textContent = v; }); set(b, 'on', sel.brace === x, (v) => { b.classList.toggle('on', v); b.setAttribute('aria-pressed', v ? 'true' : 'false'); }); }
    const c = previewCost(B, sel.w, sel.brace); set(el.querySelector('.cost'), 't', T('d25.cost', { n: c.nBraces, cost: c.planes + c.braces }), (v) => { el.querySelector('.cost').textContent = v; });
    const use = el.querySelector('[data-d="use"]'), rm = el.querySelector('[data-d="remove"]'), cl = el.querySelector('[data-d="close"]');
    set(use, 't', T('d25.use'), (v) => { use.textContent = v; }); set(rm, 't', T('d25.remove'), (v) => { rm.textContent = v; }); set(cl, 't', T('d25.close'), (v) => { cl.textContent = v; });
    set(rm, 'vis', hasDouble(B), (v) => { rm.style.display = v ? '' : 'none'; });
  };
  function paint() {
    frameReq = 0; if (!isOpen() || !g) return; const B = getB(); if (!B) return;
    const r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1), w = Math.max(60, Math.round(r.width)), h = Math.max(60, Math.round(r.height));
    if (cv.width !== w * dpr || cv.height !== h * dpr) { cv.width = w * dpr; cv.height = h * dpr; }
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    const tmp = { ...B, rg: { ...B.rg, dbl: { ...sel } } }, m = model3d(tmp, tmp.rg.dbl); if (!m) return;
    const P = project(m, yaw, pitch, w, h).pts;
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.fillStyle = 'rgba(120,130,150,.35)'; for (const d of m.deck) { g.beginPath(); d.forEach((i, k) => (k ? g.lineTo(P[i].x, P[i].y) : g.moveTo(P[i].x, P[i].y))); g.closePath(); g.fill(); }
    const order = m.edges.map((e, i) => ({ e, i, d: (P[e.a].d + P[e.b].d) / 2 })).sort((a, b) => b.d - a.d);   // lengst bak først
    for (const { e } of order) {
      const a = P[e.a], b = P[e.b]; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y);
      if (e.kind === 'brace' || e.kind === 'diag') { g.strokeStyle = e.kind === 'diag' ? '#ffb86a' : '#ffd23f'; g.lineWidth = 2; g.stroke(); }
      else { g.strokeStyle = '#1a1208'; g.lineWidth = 7; g.stroke(); g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.strokeStyle = e.kind === 'road' ? '#e9eef7' : e.mat === 'steel' ? '#8fa3b8' : e.mat === 'rope' ? '#d8b46a' : '#c98a45'; g.lineWidth = 4.5; g.stroke(); }
    }
    g.fillStyle = '#ffffff'; for (const p of P) { g.beginPath(); g.arc(p.x, p.y, 3, 0, 7); g.fill(); }
  }
  const redraw = () => { if (!frameReq && isOpen()) frameReq = requestAnimationFrame(paint); };
  function open() {
    const B = getB(); if (!B || isSim()) { toast?.(T('d25.sim')); return false; }
    const c = canDouble(B); if (!c.ok) { toast?.(T(c.why === 'few' ? 'd25.few' : 'd25.mode')); return false; }
    const cur = dblOf(B); sel = cur ? { w: cur.w, brace: cur.brace } : { w: 'middels', brace: 'x' };
    el.classList.add('open'); label(); redraw(); logEv('bygg', `dobbel bro: dialog åpnet (${B.site.id})`); return true;
  }
  function close() { if (isOpen()) el.classList.remove('open'); }
  for (const ev of ['pointerdown', 'pointermove', 'pointerup', 'touchstart', 'touchmove', 'wheel']) el.addEventListener(ev, (e) => e.stopPropagation());
  cv.addEventListener('pointerdown', (e) => { drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; try { cv.setPointerCapture(e.pointerId); } catch { /* ok */ } });
  cv.addEventListener('pointermove', (e) => { if (!drag || e.pointerId !== drag.id) return; yaw += (e.clientX - drag.x) * 0.012; pitch = Math.max(-0.2, Math.min(1.2, pitch + (e.clientY - drag.y) * 0.01)); drag.x = e.clientX; drag.y = e.clientY; redraw(); });
  const end = (e) => { if (drag && e.pointerId === drag.id) { try { cv.releasePointerCapture(e.pointerId); } catch { /* ok */ } drag = null; } };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end); cv.addEventListener('lostpointercapture', () => { drag = null; });
  function apply() {
    const B = getB(); if (!B) return false; const r = gSetDouble(B, sel.w, sel.brace); if (!r.ok) { toast?.(T(r.why === 'few' ? 'd25.few' : 'd25.mode')); return false; }
    const c = previewCost(B, sel.w, sel.brace); if (!r.same) { logEv('bygg', `dobbel bro ${B.site.id}: ${sel.w}, ${sel.brace}, ${c.nBraces} tverrstag, +${c.planes + c.braces}`); buzz?.(12); onChange?.(); }
    toast?.(T('d25.on', { name: `${T('d25.w.' + sel.w)}, ${T('d25.b.' + sel.brace)}`, n: c.nBraces })); close(); return true;
  }
  function remove() { const B = getB(); if (B && gClearDouble(B)) { logEv('bygg', `dobbel bro fjernet ${B.site.id}`); toast?.(T('d25.off')); onChange?.(); } close(); return true; }
  function pick(w, b) { if (!DBL_WIDTHS.includes(w) || !DBL_BRACES.includes(b)) return false; sel = { w, brace: b }; label(); redraw(); return true; }
  el.addEventListener('click', (e) => {
    const b = e.target.closest?.('button'), k = b?.dataset?.d; if (!k) { if (e.target === el) close(); return; } e.stopPropagation();
    const B = getB(); if (!B) return;
    if (k.startsWith('w:')) { sel.w = k.slice(2); label(); redraw(); }
    else if (k.startsWith('b:')) { sel.brace = k.slice(2); label(); redraw(); }
    else if (k === 'use') apply();
    else if (k === 'remove') remove();
    else if (k === 'close') close();
  });
  return { open, close, isOpen, pick, apply, remove, sync: () => { if (isOpen() && (isSim() || !getB())) close(); }, draw: redraw };
}
