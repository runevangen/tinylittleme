// R106: hjørneglass i byggeskjermen, visning (DOM + canvas 2D). Logikken ligger i build_loupe_logic.js; build.js kaller frame() sist i hver tegning.
// Glasset er et lite rundt canvas som kopierer et utsnitt av byggecanvaset (drawImage) og tegner kryss, snappunkt og én tekstlinje. Det tar aldri berøring (pointer-events:none).
import { LOUPE, normZoom, glassSize, sourceRect, toGlass, chooseSide, placeGlass, createVisibility } from './build_loupe_logic.js';

export const loupeCss = () => `
#bld .bloupe{position:absolute;left:0;top:0;display:none;pointer-events:none;z-index:6;user-select:none;-webkit-user-select:none}
#bld .bloupe canvas{display:block;border-radius:50%;border:3px solid #fff;box-sizing:border-box;box-shadow:0 3px 14px #000a,0 0 0 2px #0b1020;background:#0b1020;pointer-events:none}
#bld .bloupe .blt{position:absolute;top:100%;margin-top:3px;max-width:min(230px,calc(100vw - 16px));width:max-content;box-sizing:border-box;padding:0 8px;height:18px;border-radius:9px;background:rgba(14,20,36,.9);color:#ffe9a8;font:800 11px/18px system-ui;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none}
#bld .bloupe.r .blt{right:0}
#bld .bloupe.l .blt{left:0}
#bld.sim .bloupe{display:none!important}
`;
export const loupeMarkup = () => '<div class="bloupe" aria-hidden="true"><canvas></canvas><div class="blt"></div></div>';

let firstLogged = false;   // «glass vist» logges første gang per økt

// ctx: root, cv (byggecanvaset), T, logEv, getOn(), getZoom(), dpr()
export function createLoupe(ctx) {
  const { root, cv, logEv } = ctx;
  const el = root.querySelector('.bloupe'), gc = el.querySelector('canvas'), tx = el.querySelector('.blt'), g = gc.getContext('2d');
  const vis = createVisibility(), R = {}, P = { pl: null };
  let shown = 0, side = null, open = false, lastText = null, cls = '', sizeNow = 0, lastX = -1, lastY = -1;
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

  function hide() { if (open) { el.style.display = 'none'; open = false; } }
  function place(L, size, nowMs, fx) {
    const cur = P.pl; side = chooseSide(side, fx, L.W, nowMs, cur);
    let sig = 0; for (let i = 0; i < L.avoid.length; i++) { const a = L.avoid[i]; sig += a.x + a.y * 3 + a.w * 7 + a.h * 11; }
    const sd = side.side === 'right' ? 1 : 0;
    if (!P.pl || P.sd !== sd || P.W !== L.W || P.H !== L.H || P.size !== size || P.top !== L.top || P.bottom !== L.bottom || P.l !== L.insetL || P.r !== L.insetR || P.sig !== sig) {
      P.sd = sd; P.W = L.W; P.H = L.H; P.size = size; P.top = L.top; P.bottom = L.bottom; P.l = L.insetL; P.r = L.insetR; P.sig = sig;
      P.pl = placeGlass({ side: side.side, W: L.W, H: L.H, size, top: L.top, bottom: L.bottom, insetL: L.insetL, insetR: L.insetR, avoid: L.avoid });
    }
    return P.pl;
  }

  // info: { placing, x, y, tx, ty, ok, text } (fingerpunkt og snappunkt i canvas-px); L: { W, H, top, bottom, insetL, insetR, avoid, sim }
  function frame(info, L) {
    const t = now(), on = !!ctx.getOn() && !L.sim, wasVis = vis.visible;
    const v = vis.update(t, on && info.placing && info.fingers === 1, on);
    if (!v) { hide(); if (wasVis) { side = null; P.pl = null; } return false; }
    const d = Math.min(2, ctx.dpr() || 1), size = glassSize(L.W, L.H), z = normZoom(ctx.getZoom());
    if (!wasVis) { shown++; if (!firstLogged) { firstLogged = true; try { logEv('bygg', `glass vist (${z}×, ${size} px, ${L.W > L.H ? 'liggende' : 'stående'}, ${info.kind || 'finger'})`); } catch { /* ok */ } } }
    const pl = place(L, size, t, info.x);
    if (!open || size !== sizeNow) { sizeNow = size; gc.style.width = gc.style.height = el.style.width = el.style.height = size + 'px'; const px = Math.round(size * d); if (gc.width !== px) { gc.width = px; gc.height = px; } }
    if (!open || pl.x !== lastX || pl.y !== lastY) { lastX = pl.x; lastY = pl.y; el.style.left = pl.x + 'px'; el.style.top = pl.y + 'px'; }
    const c2 = pl.side === 'right' ? 'bloupe r' : 'bloupe l'; if (c2 !== cls) { cls = c2; el.className = c2; }
    if (!open) { el.style.display = 'block'; open = true; }
    const r = sourceRect(info.x, info.y, size, z, L.W, L.H, R), S = gc.width;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, S, S);
    try { g.drawImage(cv, r.sx * d, r.sy * d, r.sw * d, r.sh * d, 0, 0, S, S); } catch { /* canvas ikke klart */ }
    g.setTransform(S / size, 0, 0, S / size, 0, 0);
    if (info.tx != null) { const q = toGlass(r, info.tx, info.ty); if (q) { g.beginPath(); g.arc(q.fx * size, q.fy * size, 11, 0, 7); g.lineWidth = 4.5; g.strokeStyle = '#0b1020aa'; g.stroke(); g.lineWidth = 2.5; g.strokeStyle = info.ok === false ? '#ff6a5a' : '#3df0b0'; g.stroke(); } }
    const cx = r.fx * size, cy = r.fy * size, gap = 4, arm = 11;   // tynt kryss på fingerpunktet
    g.beginPath(); g.moveTo(cx - arm, cy); g.lineTo(cx - gap, cy); g.moveTo(cx + gap, cy); g.lineTo(cx + arm, cy); g.moveTo(cx, cy - arm); g.lineTo(cx, cy - gap); g.moveTo(cx, cy + gap); g.lineTo(cx, cy + arm);
    g.lineWidth = 3; g.strokeStyle = 'rgba(11,16,32,.55)'; g.stroke(); g.lineWidth = 1; g.strokeStyle = '#fff'; g.stroke();
    const text = info.text || ''; if (text !== lastText) { lastText = text; tx.textContent = text; tx.style.display = text ? 'block' : 'none'; }
    return true;
  }
  const takeShown = () => { const n = shown; shown = 0; return n; };   // antall visninger siden forrige prøve (til prøve-linja)
  const reset = () => { vis.reset(); hide(); side = null; P.pl = null; };
  return { frame, reset, takeShown, get shown() { return shown; }, get visible() { return open; }, el };
}
