// R122: fagverk-hjelp i byggeskjermen (DOM + canvas 2D): TREKANT, DIAGONAL og «?». Logikken ligger i grid_truss_help.js.
// Delt kode for Hyllebroen/Kjøkkenbroen og Byggeskolen (Bygglab) og for den gamle rutenett-skjermen (R101): build.js kobler den til og kaller frame()/draw()/tapAt() for alle rutenett-steder.
// Bruk: velg to knuter (trykk den ene, så den andre) eller en stav, og trykk TREKANT: forslag vises som spøkelser (trykk et annet forslag for å bytte, trykk det valgte eller TREKANT for å legge det til).
// En firkant uten diagonal får en rolig «gir etter»-prikk og knappen DIAGONAL. Hjelpen gjør aldri noe av seg selv, følger valgt materiale, og er bak ⚙-valget `buildtruss2` (auto: ikke på Ekspert).
import { GRID_MAT } from './build_materials.js';
import { nodeOf, gridStep } from './grid_logic.js';
import { TH, baseOf, trianglesFor, addTriangle, findQuads, diagonalFor, addDiagonal, quadCenter, trussShow, sigOf } from './grid_truss_help.js';

const SAFE_B = 'max(8px,env(safe-area-inset-bottom))';
export const trhCss = () => `
#bld .gtr{position:absolute;left:0;right:0;top:0;display:none;gap:8px;justify-content:center;align-items:center;padding:0 8px;pointer-events:none;z-index:3;font-family:system-ui}
#bld .gtr.show{display:flex}
#bld .gtr button{flex:0 0 auto;pointer-events:auto;height:44px;min-width:48px;border-radius:22px;padding:0 14px;font:800 14px system-ui;border:2px solid #3df0b0;background:#12302ae6;color:#d8fff0;box-shadow:0 2px 8px #0007}
#bld .gtr button.dg{border-color:#ffa940;background:#3a2a10e6;color:#ffe0b0}
#bld .gtr button.q{flex:0 0 44px;width:44px;padding:0;border-color:#6ab8ff;background:#121a2ce6;color:#cfe8ff;font-size:18px}
#bld .gtr button[hidden]{display:none}
#bld.sim .gtr,#bld.bxopen .gtr{display:none}
`;
export const trhMarkup = () => `<div class="gtr"><button data-th="tri" class="tr" hidden></button><button data-th="diag" class="dg" hidden></button><button data-th="help" class="q" aria-label="?">?</button></div>`;

const COMMA = (x) => String(+Number(x).toFixed(2)).replace('.', ',');

export function createTrussHelp(ctx) {
  const { root, T, toast, logEv, buzz, audio, grid } = ctx;
  const q = (s) => root.querySelector(s);
  const B = () => ctx.getB(), G = () => B()?.rg, site = () => ctx.site(), mat = () => grid.mat;
  const get = (k, d) => { try { return ctx.store ? ctx.store.get(k, d) : d; } catch { return d; } };
  const set = (k, v) => { try { ctx.store?.set(k, v); } catch { /* ok */ } };
  let sxFn = null, prev = null, lastSel = null, idx = 0, qIdx = 0, cache = { sig: '', base: null, tri: { list: [], why: 'base' }, quads: [], diag: [] }, lastShowSig = '', rowSig = '', usedSinceTry = [], hidden = !!get(TH.key, 0);
  const stats = { shown: 0, tri: 0, diag: 0, won: 0, lost: 0 };
  const hasEls = () => !!q('.gtr');

  const cfg = () => (ctx.getCfg ? ctx.getCfg() : { on: true });
  const active = () => hasEls() && !!site() && !!G() && trussShow({ on: !!cfg().on, grid: grid.on(), sim: ctx.isSim(), hidden: hidden || root.classList.contains('bxopen') });
  const left = () => { const b = ctx.getBudget ? ctx.getBudget() : null; return b && Number.isFinite(b.budget) ? b.budget - b.cost : null; };
  const opt = () => ({ budgetLeft: left() });

  // ---- utregning (bare når bygget, valget eller materialet er endret) ----
  function recompute() {
    const g = G(), sel = grid.selNode;
    if (sel !== lastSel) { if (sel && lastSel && g && nodeOf(g, lastSel) && nodeOf(g, sel)) prev = lastSel; else if (!sel && !grid.selRod) prev = null; lastSel = sel; }
    if (prev && (!g || !nodeOf(g, prev))) prev = null;
    const base = baseOf(g, { selNode: sel, selRod: grid.selRod, prev }), sig = [sigOf(g), base ? base.a + '>' + base.b : '', mat(), left() == null ? '' : Math.round(left() * 100)].join('|');
    if (sig === cache.sig) return cache;
    const tri = base ? trianglesFor(B(), base.a, base.b, mat(), opt()) : { list: [], why: 'base' }, quads = findQuads(g, gridStep(site()));
    if (cache.base?.a !== base?.a || cache.base?.b !== base?.b) idx = 0; idx = Math.min(idx, Math.max(0, tri.list.length - 1));
    const keep = cache.quads[qIdx]?.key; qIdx = Math.max(0, quads.findIndex((x) => x.key === keep));
    cache = { sig, base, tri, quads, diag: quads.map((x) => diagonalFor(B(), x, mat(), opt())) };
    const shown = `${site()?.id}|${base ? tri.list.length + ':' + tri.why : ''}|${quads.length}`;
    if (shown !== lastShowSig) {
      lastShowSig = shown;
      if (base) { stats.shown++; logEv('bygg', `trekantforslag vist: ${tri.list.length ? tri.list.length + ' forslag' : 'ingen (' + tri.why + ')'} (${site()?.id})`); }
      if (quads.length) { stats.shown++; logEv('bygg', `diagonalforslag vist: ${quads.length} firkant${quads.length > 1 ? 'er' : ''} uten diagonal (${site()?.id})`); }
    }
    return cache;
  }

  // ---- knapper ----
  function row() {
    const el = q('.gtr'); if (!el) return;
    if (!active()) { el.classList.remove('show'); rowSig = ''; return; }
    const c = recompute(), cq = c.quads[qIdx], cd = cq ? c.diag[qIdx] : null, ins = ctx.insets ? ctx.insets() : { l: 0, r: 0 };
    const tb = q('[data-th="tri"]'), db = q('[data-th="diag"]'), nudge = !!cfg().need && !c.base && !cq && G().rods.length === 0, show = !!c.base || !!cq || nudge;   // R140: steder som krever trekanter viser «?» (forklaringen) fra første stund, før noe er valgt
    const sig = [show, !!c.base, c.tri.list.length, !!cq, !!(cd && cd.diag), mat(), Math.round(ctx.botY()), Math.round(ins.l || 0), Math.round(ins.r || 0), ctx.lang?.()].join('|');
    if (sig === rowSig) return; rowSig = sig;
    el.classList.toggle('show', show);
    el.style.top = Math.max(0, Math.round(ctx.botY() - 54)) + 'px'; el.style.paddingLeft = Math.round(8 + (ins.l || 0)) + 'px'; el.style.paddingRight = Math.round(8 + (ins.r || 0)) + 'px';
    tb.hidden = !c.base; tb.textContent = T('trh.tri'); tb.setAttribute?.('aria-label', T('trh.tri.aria'));
    db.hidden = !cq; db.textContent = T('trh.diag'); db.setAttribute?.('aria-label', T('trh.diag.aria')); db.disabled = false;
    q('[data-th="help"]').setAttribute?.('aria-label', T('trh.help.aria'));
  }

  // ---- handlinger ----
  const whyText = (why, extra = {}) => T('trh.none.' + (['geom', 'budget', 'full', 'base', 'illegal'].includes(why) ? why : 'geom'), extra);
  function useTri() {
    if (!active()) return false; const c = recompute();
    if (!c.base) { toast(whyText('base')); return false; }
    const cand = c.tri.list[idx]; if (!cand) { toast(whyText(c.tri.why)); buzz?.(12); logEv('bygg', `trekantforslag: ingen lovlig trekant (${c.tri.why})`); return false; }
    const base = c.base, r = addTriangle(B(), base.a, base.b, cand, mat(), opt());
    if (!r.ok) { toast(whyText(r.why)); buzz?.(12); return false; }
    stats.tri++; usedSinceTry.push('tri'); buzz?.(14); audio?.brod?.(mat()); audio?.bknot?.();
    logEv('bygg', `trekantforslag brukt: ${r.rods.length} staver ${mat()}${r.newNode ? ' og ny knute' : ''}, kost ${r.cost}, forslag ${idx + 1} av ${c.tri.list.length}`);
    prev = base.b; lastSel = r.node; grid.select(r.node, null);   // neste TREKANT bygger videre fra den nye staven
    cache.sig = ''; rowSig = ''; ctx.trayRender?.(); ctx.onChange?.(); return true;
  }
  function useDiag() {
    if (!active()) return false; const c = recompute(), qd = c.quads[qIdx];
    if (!qd) return false;
    const r = addDiagonal(B(), qd, mat(), opt());
    if (!r.ok) { toast(whyText(r.why)); buzz?.(12); logEv('bygg', `diagonalforslag: ingen lovlig diagonal (${r.why})`); return false; }
    stats.diag++; usedSinceTry.push('diag'); buzz?.(14); audio?.brod?.(mat());
    logEv('bygg', `diagonalforslag brukt: stav ${r.rod} ${mat()} lengde ${COMMA(r.len)} kost ${r.cost}`);
    grid.select(null, r.rod); cache.sig = ''; rowSig = ''; ctx.trayRender?.(); ctx.onChange?.(); return true;
  }
  function help() { toast(T('trh.help')); logEv('bygg', 'trekant- og diagonalhjelp: ? trykket'); return true; }
  function toggleHidden() { hidden = !hidden; shSig = ''; set(TH.key, hidden ? 1 : 0); rowSig = ''; logEv('bygg', `trekanthjelp ${hidden ? 'skjult' : 'vist'} (⋯)`); return hidden; }

  root.addEventListener('click', (e) => {
    const b = e.target.closest?.('[data-th]'), k = b?.dataset?.th; if (!k) return; e.stopPropagation();
    if (k === 'tri') useTri(); else if (k === 'diag') useDiag(); else if (k === 'help') help(); else if (k === 'toggle') { toggleHidden(); shSig = ''; sheetBtn(); }
  }, true);
  for (const el of root.querySelectorAll('.gtr button')) el.addEventListener('pointerdown', (e) => e.stopPropagation());   // knappene starter ikke panorering på brettet

  // ---- trykk på spøkelser og prikker (build.js kaller før berøringen går videre) ----
  const HIT = 26;
  function tapAt(x, y) {
    if (!active() || !sxFn) return false; const c = recompute(), sx = sxFn;
    for (let i = 0; i < c.tri.list.length; i++) {
      const p = sx(c.tri.list[i].u, c.tri.list[i].v); if (Math.hypot(p.x - x, p.y - y) <= HIT) {
        if (i === idx) { useTri(); } else { idx = i; buzz?.(6); logEv('bygg', `trekantforslag: byttet til forslag ${i + 1}`); }
        return true;
      }
    }
    for (let i = 0; i < c.quads.length; i++) {
      const m = quadCenter(G(), c.quads[i]); if (!m) continue; const p = sx(m.u, m.v);
      if (Math.hypot(p.x - x, p.y - y) <= HIT) { if (i === qIdx) useDiag(); else { qIdx = i; buzz?.(6); rowSig = ''; } return true; }
    }
    return false;
  }

  // ---- tegning ----
  function tag(g2, text, x, y, color) {
    g2.font = '800 12px system-ui'; g2.textAlign = 'center'; const w = g2.measureText(text).width + 14;
    g2.fillStyle = 'rgba(14,20,36,.92)'; g2.beginPath(); g2.roundRect ? g2.roundRect(x - w / 2, y - 13, w, 22, 8) : g2.rect(x - w / 2, y - 13, w, 22); g2.fill();
    g2.strokeStyle = color; g2.lineWidth = 2; g2.stroke(); g2.fillStyle = '#fff'; g2.fillText(text, x, y + 3); g2.textAlign = 'start';
  }
  function draw(sx, tNow, g2) {
    sxFn = sx;   // tapAt() bruker visningen fra siste tegning
    if (!active()) return; const c = recompute(), g = G(), m = GRID_MAT[mat()];
    if (c.base && c.tri.list.length) {
      const a = nodeOf(g, c.base.a), b = nodeOf(g, c.base.b); if (a && b) {
        const pa = sx(a.u, a.v), pb = sx(b.u, b.v);
        c.tri.list.forEach((cd, i) => {
          const pc = sx(cd.u, cd.v), cur = i === idx;
          g2.save(); g2.lineCap = 'round';
          if (cur) {
            g2.globalAlpha = 0.6; g2.strokeStyle = '#3df0b0'; g2.lineWidth = Math.max(5, m.h * ctx.view().scale) + 5; g2.beginPath(); g2.moveTo(pa.x, pa.y); g2.lineTo(pc.x, pc.y); g2.lineTo(pb.x, pb.y); g2.stroke();
            g2.strokeStyle = m.color; g2.lineWidth = Math.max(5, m.h * ctx.view().scale); g2.beginPath(); g2.moveTo(pa.x, pa.y); g2.lineTo(pc.x, pc.y); g2.lineTo(pb.x, pb.y); g2.stroke();
          }
          g2.restore();
          g2.save(); g2.beginPath(); g2.arc(pc.x, pc.y, cur ? 13 + 1.5 * Math.sin(tNow * 6) : 11, 0, 7); g2.strokeStyle = cur ? '#3df0b0' : '#9fe8cf'; g2.lineWidth = cur ? 3 : 2; if (!cur) g2.setLineDash([4, 4]); g2.stroke(); g2.restore();
          if (cur) tag(g2, T('trh.ghost', { cost: cd.cost, n: c.tri.list.length > 1 ? `${i + 1}/${c.tri.list.length}` : '' }).trim(), Math.min(Math.max(70, pc.x), ctx.width() - 70), Math.max(ctx.topY() + 16, pc.y - 26), '#3df0b0');
        });
      }
    }
    c.quads.forEach((qd, i) => {
      const mc = quadCenter(g, qd); if (!mc) return; const p = sx(mc.u, mc.v), cur = i === qIdx, r = (cur ? 9 : 6) + 1.5 * Math.sin(tNow * 2.4 + i);
      g2.save(); g2.beginPath(); g2.arc(p.x, p.y, r, 0, 7); g2.fillStyle = 'rgba(255,169,64,.85)'; g2.fill(); g2.strokeStyle = '#3a2a10'; g2.lineWidth = 2; g2.stroke();
      if (cur) {
        const d = c.diag[i]?.diag; if (d) { const a = nodeOf(g, d.a), b = nodeOf(g, d.b); if (a && b) { const pa = sx(a.u, a.v), pb = sx(b.u, b.v); g2.setLineDash([5, 6]); g2.strokeStyle = 'rgba(255,169,64,.85)'; g2.lineWidth = 3; g2.beginPath(); g2.moveTo(pa.x, pa.y); g2.lineTo(pb.x, pb.y); g2.stroke(); g2.setLineDash([]); } }
        g2.restore(); tag(g2, T('trh.quad'), Math.min(Math.max(120, p.x), ctx.width() - 120), Math.max(ctx.topY() + 16, p.y - 28), '#ffa940'); return;
      }
      g2.restore();
    });
  }
  // ⋯-arket: knappen som skjuler/viser hjelpen (bare når hjelpen er på i innstillingene)
  let shSig = '';
  function sheetBtn() {
    const b = q('[data-th="toggle"]'); if (!b) return; const ok = !!cfg().on && !!site() && grid.on(), sig = `${ok}|${hidden}|${ctx.lang?.()}`; if (sig === shSig) return; shSig = sig;
    root.classList.toggle('gtrok', ok); b.textContent = T(hidden ? 'trh.sheet.off' : 'trh.sheet.on'); b.setAttribute?.('aria-pressed', hidden ? 'false' : 'true');
  }
  function frame() { sheetBtn(); row(); }
  // prøven er ferdig: har et forslag vært brukt siden sist, og klarte bygget det?
  function onResult(won) {
    if (!usedSinceTry.length) return; const k = [...new Set(usedSinceTry)].join('+'); usedSinceTry = [];
    if (won) stats.won++; else stats.lost++;
    logEv('bygg', `forslag brukt i bygget (${k}): prøven ${won ? 'klarte det' : 'feilet'}`);
  }
  function reset() { prev = null; lastSel = null; idx = 0; qIdx = 0; cache.sig = ''; rowSig = ''; lastShowSig = ''; usedSinceTry = []; }
  return {
    frame, draw, tapAt, useTri, useDiag, help, toggleHidden, onResult, reset, active, recompute,
    get hidden() { return hidden; }, get budgetNow() { return ctx.getBudget ? ctx.getBudget() : null; }, get stats() { return stats; }, get idx() { return idx; }, get qIdx() { return qIdx; }, setIdx: (i) => { idx = i; }, get cache() { return cache; },
  };
}
