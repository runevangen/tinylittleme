// R128: BYTT TIL STÅL i byggeskjermen (DOM + canvas 2D). Logikken ligger i grid_swap.js; build.js kobler inn (frame/draw/onResult/onTry/reset) for ALLE rutenett-steder:
// Hyllebroen, Kjøkkenbroen, Byggeskolen (Bygglab) og den gamle rutenett-skjermen (R101: delt kode).
// Etter en feilet prøve pulserer staven som tok mest. Velg en stav av tre eller tau: en knapp ved staven viser BYTT TIL STÅL og prisen; ett trykk bytter (ANGRE tar det tilbake).
// Bak ⚙-valget `buildswapsteel` (Spill). Gjør aldri noe av seg selv.
import { nodeOf, rodOf } from './grid_logic.js';
import { swapPlan, gSwap, hintOf, hintValid, swappable } from './grid_swap.js';
import { pct } from './grid_stress.js';

export const swCss = () => `
#bld .gsw{position:absolute;display:none;z-index:4;pointer-events:auto;height:44px;padding:0 16px;border-radius:22px;border:3px solid #fff;background:#2a6fa8;color:#fff;font:800 14px system-ui;transform:translate(-50%,-50%);white-space:nowrap;box-shadow:0 3px 10px #0008}
#bld .gsw.show{display:block}
#bld .gsw.hot{background:#b5651d;border-color:#ffd23f}
#bld .gsw.bad{background:#6a3a3a;border-color:#ff9a8a}
#bld.sim .gsw,#bld.bxopen .gsw{display:none}
`;
export const swMarkup = () => '<button data-sw="swap" class="gsw"></button>';

const COMMA = (x) => String(+Number(x).toFixed(2)).replace('.', ',');

export function createSwapUI(ctx) {
  const { root, T, toast, logEv, buzz, audio, grid } = ctx;
  const q = (s) => root.querySelector(s);
  const B = () => ctx.getB(), G = () => B()?.rg, site = () => ctx.site();
  let sxFn = null, hint = null, btnSig = '', usedSinceTry = 0;
  const stats = { shown: 0, swaps: 0, won: 0, lost: 0 };
  const cfg = () => (ctx.getCfg ? ctx.getCfg() : { on: true });
  const el = () => q('.gsw');
  const active = () => !!el() && !!site() && !!G() && !!cfg().on && grid.on() && !ctx.isSim() && !root.classList.contains('bxopen');
  const left = () => { const b = ctx.getBudget ? ctx.getBudget() : null; return b && Number.isFinite(b.budget) ? b.budget - b.cost : null; };
  const hintNow = () => { if (hint && !hintValid(B(), hint)) { hint = null; btnSig = ''; } return hint; };

  // ---- bytte ----
  function swap(id = grid.selRod) {
    if (!active() || !id) return false;
    const r = gSwap(B(), id, left());
    if (!r.ok) {
      toast(T('sw.err.' + (['budget', 'deck', 'already'].includes(r.why) ? r.why : 'none'), { n: COMMA(r.need ?? 0) })); buzz?.(12);
      logEv('bygg', `bytt til stål avvist: ${r.why}${r.why === 'budget' ? ` (mangler ${COMMA(r.need)})` : ''}`); return false;
    }
    stats.swaps++; usedSinceTry++; if (hint && hint.id === id) hint = null;
    logEv('bygg', `bytt til stål: stav ${id} ${r.from} → ${r.to}, lengde ${COMMA(r.len)}, +${COMMA(r.delta)} i pris`);
    toast(T('sw.done', { n: COMMA(r.delta) })); buzz?.(14); audio?.brod?.('steel'); audio?.bknot?.();
    btnSig = ''; ctx.trayRender?.(); ctx.onChange?.(); return true;
  }
  el()?.addEventListener('click', (e) => { e.stopPropagation(); swap(); });
  el()?.addEventListener('pointerdown', (e) => e.stopPropagation());   // knappen starter ikke panorering på brettet

  // ---- knappen ved valgt stav (flyttes bare når posisjon eller tekst er endret) ----
  function place() {
    const b = el(); if (!b) return;
    const hide = () => { if (btnSig !== 'off') { btnSig = 'off'; b.classList.remove('show'); } };
    const id = grid.selRod; if (!active() || !id || !sxFn) { hide(); return; }
    const g = G(), r = rodOf(g, id); if (!r || !swappable(r)) { hide(); return; }
    const a = nodeOf(g, r.a), c = nodeOf(g, r.b); if (!a || !c) { hide(); return; }
    const p = swapPlan(B(), id, left()), pl = swapPlan(B(), id, null), m = sxFn((a.u + c.u) / 2, (a.v + c.v) / 2), W = ctx.width();
    const x = Math.min(Math.max(m.x, 96), W - 96), y = Math.max(ctx.topY() + 40, Math.min(ctx.botY() - 82, m.y + 44));
    const hot = !!hintNow() && hint.id === id, txt = T('sw.btn', { n: COMMA(pl.delta ?? 0) }), cls = 'gsw show' + (p.ok ? (hot ? ' hot' : '') : ' bad');
    const sig = `${Math.round(x)}|${Math.round(y)}|${txt}|${cls}`; if (sig === btnSig) return; btnSig = sig;
    b.style.left = x + 'px'; b.style.top = y + 'px'; b.className = cls; b.textContent = txt; b.setAttribute?.('aria-label', T('sw.aria'));
  }
  const frame = () => { if (!active()) { const b = el(); if (b && btnSig !== 'off') { btnSig = 'off'; b.classList.remove('show'); } return; } place(); };

  // ---- tegning: den svakeste staven pulserer ----
  function tag(g2, text, x, y, color) {
    g2.font = '800 12px system-ui'; g2.textAlign = 'center'; const w = g2.measureText(text).width + 14;
    g2.fillStyle = 'rgba(14,20,36,.92)'; g2.beginPath(); g2.roundRect ? g2.roundRect(x - w / 2, y - 13, w, 22, 8) : g2.rect(x - w / 2, y - 13, w, 22); g2.fill();
    g2.strokeStyle = color; g2.lineWidth = 2; g2.stroke(); g2.fillStyle = '#fff'; g2.fillText(text, x, y + 3); g2.textAlign = 'start';
  }
  function draw(sx, tNow, g2) {
    sxFn = sx; if (!active()) return; const h = hintNow(); if (!h) return;
    const g = G(), r = rodOf(g, h.id), a = r && nodeOf(g, r.a), b = r && nodeOf(g, r.b); if (!a || !b) return;
    const pa = sx(a.u, a.v), pb = sx(b.u, b.v), mx = (pa.x + pb.x) / 2, my = (pa.y + pb.y) / 2, k = 0.5 + 0.5 * Math.sin(tNow * 5);
    g2.save(); g2.lineCap = 'round'; g2.globalAlpha = 0.35 + 0.35 * k; g2.strokeStyle = '#ffd23f'; g2.lineWidth = 12 + 5 * k; g2.beginPath(); g2.moveTo(pa.x, pa.y); g2.lineTo(pb.x, pb.y); g2.stroke(); g2.globalAlpha = 1;
    g2.beginPath(); g2.arc(mx, my, 15 + 3 * k, 0, 7); g2.strokeStyle = '#ffd23f'; g2.lineWidth = 3; g2.stroke(); g2.restore();
    if (grid.selRod !== h.id) tag(g2, T(h.broken ? 'sw.hint.broke' : 'sw.hint.top', { n: pct(h.r) }), Math.min(Math.max(90, mx), ctx.width() - 90), Math.max(ctx.topY() + 16, my - 30), '#ffd23f');
  }

  // ---- prøven ----
  // ferdig prøve: summary = { first }, peaks = liste fra createPeaks. Feilet prøve gir et hint; en klart prøve fjerner det.
  function onResult(won, peaks = null, first = null) {
    if (usedSinceTry) { stats[won ? 'won' : 'lost']++; logEv('bygg', `byttet til stål i bygget: prøven ${won ? 'klarte det' : 'feilet'}`); usedSinceTry = 0; }
    if (won) { hint = null; btnSig = ''; return null; }
    hint = hintOf(B(), peaks, first); btnSig = '';
    if (hint) { stats.shown++; logEv('bygg', `belastningshint: stav ${hint.id} ${pct(hint.r)} % ${hint.kind}${hint.broken ? ' (brakk)' : ''} (${site()?.id})`); }
    return hint;
  }
  const onTry = () => { hint = null; btnSig = ''; };
  const reset = () => { hint = null; btnSig = ''; usedSinceTry = 0; };
  return { frame, draw, swap, onResult, onTry, reset, active, get hint() { return hintNow(); }, get stats() { return stats; }, get btn() { return el(); } };
}
