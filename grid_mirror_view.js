// R121: speiling og kopi i den forenklede byggeskjermen (DOM + canvas). Logikken ligger i grid_mirror.js; buildux_view.js kobler inn.
// ⋯ → SPEIL BYGGET (SPEIL OG LEGG TIL / SNU). Valgt knute eller stav → liten KOPIER-knapp ved siden av ✕: kopien vises som spøkelse (grønn = kan settes, rød = ulovlig),
// ett dra flytter den (hele rutesteg), SETT INN eller et trykk på kopien setter den, ✕ avbryter. ANGRE (↶) tar bort hele speilingen/kopien i ett steg.
import { GRID_MAT } from './build_materials.js';
import { nearestPoint, gridStep, nodeOf, maxLenOf } from './grid_logic.js';
import { gMirror, gCopy, copyPlan, selectField, startOffset, gridCost } from './grid_mirror.js';

export const mirrorCss = () => `
#bld .bux .bxcopy,#bld .bux .bxcopyx{position:absolute;display:none;z-index:4;pointer-events:auto;box-shadow:0 3px 10px #0008}
#bld .bux .bxcopy{height:44px;padding:0 14px;border-radius:22px;border:3px solid #fff;background:#2a6fa8;color:#fff;font:800 14px system-ui;transform:translate(-50%,-50%);white-space:nowrap}
#bld .bux .bxcopy.put{background:#2a7f62;border-color:#3df0b0}
#bld .bux .bxcopy.bad{background:#6a3a3a;border-color:#ff9a8a}
#bld .bux .bxcopyx{width:44px;height:44px;border-radius:50%;border:3px solid #fff;background:#d6422f;color:#fff;font:800 20px/1 system-ui;padding:0;transform:translate(-50%,-50%)}
#bld .bux .bxcopy.show,#bld .bux .bxcopyx.show{display:block}
#bld.sim .bux .bxcopy,#bld.sim .bux .bxcopyx{display:none}
#bld .bxsheet .bxsec.bxmir{display:none}
#bld .bxsheet .bxsec.bxmir.show{display:flex}
`;
export const mirrorBubbleMarkup = () => '<button data-bx="copy" class="bxcopy"></button><button data-bx="copyx" class="bxcopyx">✕</button>';
export const mirrorSheetMarkup = () => '<div class="bxsec bxmir"><small></small><div class="bxgrid"><button data-bx="mirrorAdd"></button><button data-bx="mirrorFlip"></button></div></div>';

const r3 = (x) => Math.round(x * 1000) / 1000;
const COMMA = (x) => String(+Number(x).toFixed(2)).replace('.', ',');

export function createMirrorUI(ctx) {
  const { root, T, toast, logEv, buzz, audio, grid } = ctx;
  const q = (s) => root.querySelector(s);
  let paste = null, planKey = '', planVal = null, lblSig = '', bubSig = '', selKey = '', selVal = null;
  const B = () => ctx.getB(), site = () => ctx.site(), G = () => B().rg;
  const enabled = () => ctx.getOn() !== false;
  const avail = () => enabled() && grid.on() && !ctx.isSim();
  const sel = () => {   // feltet som kopieres: følger valgt knute/stav (bufret mens ingenting endres)
    if (!avail()) return null; const g = G(), k = `${grid.selNode}|${grid.selRod}|${g.rods.length}|${g.nodes.length}`;
    if (k !== selKey) { selKey = k; selVal = (grid.selNode || grid.selRod) ? selectField(g, grid.selNode, grid.selRod) : null; } return selVal;
  };
  const budget = () => ctx.budget();
  const plan = () => {
    if (!paste) return null; const g = G(), k = `${paste.du},${paste.dv},${g.rods.length},${g.nodes.length},${paste.sel.rods.join()}`;
    if (k !== planKey) { planKey = k; planVal = copyPlan(B(), paste.sel, paste.du, paste.dv, budget()); } return planVal;
  };
  const pasting = () => !!paste && avail();

  // ---- SPEIL ----
  function mirror(mode) {
    if (!avail()) return false; const m = mode === 'flip' ? 'flip' : 'add', r = gMirror(B(), m, budget());
    if (!r.ok) { toast(T('mir.err.' + r.why, { n: COMMA(maxLenOf(B())) })); logEv('bygg', `speil avvist (${m === 'flip' ? 'snu' : 'legg til'}): ${r.why}`); buzz?.(12); return false; }
    paste = null; grid.select(null, null); logEv('bygg', `speil ${m === 'flip' ? 'snu' : 'legg til'}: ${r.rods} staver, ${r.nodes} nye knuter, kost ${r.cost}`);
    toast(T(m === 'flip' ? 'mir.done.flip' : 'mir.done.add', { n: r.rods })); buzz?.(14); audio?.bknot?.(); ctx.act?.(); ctx.trayRender?.(); ctx.onChange?.(); return true;
  }

  // ---- KOPIER ----
  function copyStart() {
    const s = sel(); if (!avail() || !s) { toast(T('mir.cerr.none')); return false; }
    const o = startOffset(B(), s, budget()); paste = { sel: s, du: o.du, dv: o.dv, drag: null }; planKey = '';
    logEv('bygg', `kopi startet: ${s.rods.length} staver valgt`); buzz?.(8); return true;
  }
  function cancel(why = 'avbrutt') { if (!paste) return false; paste = null; planKey = ''; bubSig = ''; logEv('bygg', `kopi ${why}`); return true; }
  function commit() {
    if (!paste) return false; const r = gCopy(B(), paste.sel, paste.du, paste.dv, budget());
    if (!r.ok) { toast(T('mir.cerr.' + r.why)); logEv('bygg', `kopi avvist: ${r.why}`); buzz?.(12); return false; }
    paste = null; planKey = ''; bubSig = ''; grid.select(null, null);
    logEv('bygg', `kopi: ${r.rods} staver, ${r.nodes} nye knuter, kost ${r.cost}`); toast(T('mir.copyDone', { n: r.rods })); buzz?.(14); audio?.bknot?.(); ctx.act?.(); ctx.trayRender?.(); ctx.onChange?.(); return true;
  }
  const refNode = () => nodeOf(G(), paste.sel.nodes[0]);
  // berøring mens kopien vises: ett dra flytter den, et trykk på den (eller SETT INN) setter den, et trykk ellers flytter den dit
  function down(e, x, y) {
    if (!pasting()) return false; const w = ctx.toWorld(x, y); paste.drag = { pid: e.pointerId, x0: x, y0: y, w0: w, du0: paste.du, dv0: paste.dv, moved: false };
    try { root.setPointerCapture(e.pointerId); } catch { /* ok */ } return true;
  }
  function move(e) {
    const d = paste?.drag; if (!d || e.pointerId !== d.pid) return false;
    const r = ctx.loc(e); if (Math.hypot(r.x - d.x0, r.y - d.y0) > 10) d.moved = true;
    if (d.moved) { const w = ctx.toWorld(r.x, r.y), st = gridStep(site()); paste.du = r3(d.du0 + Math.round((w.u - d.w0.u) / st) * st); paste.dv = r3(d.dv0 + Math.round((w.v - d.w0.v) / st) * st); }
    return true;
  }
  function up(e) {
    const d = paste?.drag; if (!d || e.pointerId !== d.pid) return false; paste.drag = null;
    if (!d.moved) tap(d.x0, d.y0); return true;
  }
  function tap(x, y) {
    if (!paste) return; const w = ctx.toWorld(x, y), sc = ctx.scale(), p = plan();
    if (p && p.shape.nodes.some((n) => Math.hypot(n.u - w.u, n.v - w.v) * sc < 38)) { commit(); return; }
    const np = nearestPoint(site(), w.u, w.v), rn = refNode(); if (np && rn) { paste.du = r3(np.u - rn.u); paste.dv = r3(np.v - rn.v); buzz?.(5); }
  }
  const cancelDrag = () => { if (paste) paste.drag = null; };

  // ---- tegning ----
  function tag(g2, text, x, y, color) {
    g2.font = '800 13px system-ui'; g2.textAlign = 'center'; const w = g2.measureText(text).width + 14;
    g2.fillStyle = 'rgba(14,20,36,.92)'; g2.beginPath(); g2.roundRect ? g2.roundRect(x - w / 2, y - 14, w, 24, 8) : g2.rect(x - w / 2, y - 14, w, 24); g2.fill();
    g2.strokeStyle = color; g2.lineWidth = 2; g2.stroke(); g2.fillStyle = '#fff'; g2.fillText(text, x, y + 3); g2.textAlign = 'start';
  }
  function draw(sx, tNow, g2) {
    if (!avail()) return; const sc = ctx.scale();
    if (paste) {
      const p = plan(); if (!p) return; const ok = p.ok, col = ok ? '#3df0b0' : '#ff6a5a'; g2.save(); g2.lineCap = 'round'; g2.globalAlpha = ok ? 0.8 : 0.55;
      for (const r of p.shape.rods) { const a = sx(r.a.u, r.a.v), b = sx(r.b.u, r.b.v), m = GRID_MAT[r.mat], w = Math.max(5, m.h * sc);
        g2.strokeStyle = col; g2.lineWidth = w + 5; g2.beginPath(); g2.moveTo(a.x, a.y); g2.lineTo(b.x, b.y); g2.stroke();
        g2.strokeStyle = ok ? m.color : '#8a3a2a'; g2.lineWidth = w; g2.beginPath(); g2.moveTo(a.x, a.y); g2.lineTo(b.x, b.y); g2.stroke(); }
      g2.globalAlpha = 1; for (const n of p.shape.nodes) { const c = sx(n.u, n.v); g2.beginPath(); g2.arc(c.x, c.y, 8, 0, 7); g2.fillStyle = col; g2.fill(); g2.strokeStyle = '#0b1020'; g2.lineWidth = 2; g2.stroke(); }
      g2.restore();
      const pts = p.shape.nodes.map((n) => sx(n.u, n.v)), cx = pts.reduce((s, z) => s + z.x, 0) / (pts.length || 1), top = Math.min(...pts.map((z) => z.y));
      const delta = ok ? p.cost - gridCost(B(), G()) : 0;
      tag(g2, ok ? T('mir.ghost', { n: p.rods, cost: COMMA(delta) }) : T('mir.cerr.' + p.why), Math.min(Math.max(100, cx), ctx.width() - 100), Math.max(ctx.topY() + 18, top - 54), col);
      return;
    }
    const s = sel(); if (!s) return;   // det som kopieres: gul stiplet kant
    g2.save(); g2.setLineDash([6, 5]); g2.strokeStyle = '#ffd23f'; g2.lineWidth = 3; g2.lineCap = 'round'; g2.beginPath();
    for (const id of s.rods) { const r = G().rods.find((z) => z.id === id), a = r && nodeOf(G(), r.a), b = r && nodeOf(G(), r.b); if (!a || !b) continue; const pa = sx(a.u, a.v), pb = sx(b.u, b.v); g2.moveTo(pa.x, pa.y); g2.lineTo(pb.x, pb.y); }
    g2.stroke(); g2.restore();
  }
  // knappene ved valgt del / kopien (flyttes bare når posisjonen er endret)
  function place(sx) {
    const cb = q('.bxcopy'), xb = q('.bxcopyx'); if (!cb || !xb) return;
    const hide = () => { if (bubSig !== 'off') { bubSig = 'off'; cb.classList.remove('show'); xb.classList.remove('show'); } };
    if (!avail() || root.classList.contains('bxopen')) { hide(); return; }
    const W = ctx.width(); let x, y, txt, cls;
    if (paste) {
      const p = plan(), pts = p ? p.shape.nodes.map((n) => sx(n.u, n.v)) : []; if (!pts.length) { hide(); return; }
      x = pts.reduce((s, z) => s + z.x, 0) / pts.length; y = Math.min(...pts.map((z) => z.y)) - 28; txt = T('mir.put'); cls = p && p.ok ? 'put' : 'bad';
      const px = Math.min(Math.max(x - 26, 70), W - 100), py = Math.max(ctx.topY() + 62, y), sig = `p${Math.round(px)}${Math.round(py)}${txt}${cls}`;
      if (sig !== bubSig) { bubSig = sig; cb.style.left = px + 'px'; cb.style.top = py + 'px'; cb.className = 'bxcopy show ' + cls; cb.textContent = txt; xb.style.left = (px + 74) + 'px'; xb.style.top = py + 'px'; xb.className = 'bxcopyx show'; }
      return;
    }
    const s = sel(); if (!s) { hide(); return; }
    const n = grid.selNode && nodeOf(G(), grid.selNode), r = grid.selRod && G().rods.find((z) => z.id === grid.selRod);
    const a = n || (r && nodeOf(G(), r.a)), b = n || (r && nodeOf(G(), r.b)); if (!a || !b) { hide(); return; }
    const c = sx((a.u + b.u) / 2, (a.v + b.v) / 2); x = Math.min(Math.max(c.x + 82, 60), W - 54); y = Math.max(ctx.topY() + 36, c.y - (r ? 66 : 44)); txt = T('mir.copy');
    const sig = `s${Math.round(x)}${Math.round(y)}${txt}`;
    if (sig !== bubSig) { bubSig = sig; cb.style.left = x + 'px'; cb.style.top = y + 'px'; cb.className = 'bxcopy show'; cb.textContent = txt; xb.className = 'bxcopyx'; }
  }
  // tekster og synlighet i ⋯-arket
  function sync() {
    const sec = q('.bxmir'); if (!sec) return; const sig = `${ctx.lang?.()}|${avail()}`; if (sig === lblSig) return; lblSig = sig;
    sec.classList.toggle('show', avail()); sec.querySelector('small').textContent = T('mir.sec');
    q('[data-bx="mirrorAdd"]').textContent = T('mir.add'); q('[data-bx="mirrorFlip"]').textContent = T('mir.flip'); q('.bxcopyx')?.setAttribute('aria-label', T('mir.cancel'));
  }
  const invalidate = () => { lblSig = ''; bubSig = ''; };
  const hint = () => (pasting() ? T('mir.hint') : '');
  return { avail, mirror, copyStart, cancel, commit, down, move, up, tap, cancelDrag, draw, place, sync, invalidate, hint, pasting, get state() { return paste; }, sel, plan };
}
