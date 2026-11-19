// R92: forenklet byggeskjerm for rutenett (PROTOTYPE bak ⚙-valget `buildux`). DOM + canvas; logikken ligger i buildux_logic.js og rutenett-koden i grid_logic.js / grid_view.js.
// Skjermen: topplinje (← · stedsnavn med n/N og stjerner · ⋯), byggeområdet (ca. 70 % av høyden), og nederst budsjettlinje, tre runde materialvalg, ↶ og én stor PRØV (STOPP under prøven, med SLOW og PAUSE).
// Alt annet ligger i ⋯-arket (last, KODE/LIM INN/BESTE, ◀ ▶ og NULLSTILL i Bygglab, tilpass, rutenett av/på). De gamle knappene flyttes ikke eller endres: de skjules med CSS mens skjermen er på.
// Bygging: trykk et tomt punkt = knute; dra fra en knute = stav med spøkelsesstav (snapper, viser lengde og pris, grønn/rød); dra en VALGT knute = flytt; trykk stav/knute = ✕-boble som sletter.
import { BUX, resolveTarget, ghostOf, deletable, bubbleAnchor, pickAt, dragMeaning, budgetOf, COMMA, matInfo, strengthBars, createTimer, timerOpen, timerRod, timerTry, timerWin, shouldShowHand, handAt, handPath, buxSite } from './buildux_logic.js';
import { nearestPoint, nodeOf, nodeAt, gAddNode, gAddRod, gAddRodTo, gridStep, maxLenOf, rodOf, rodLen } from './grid_logic.js';
import { starText } from './build_budget.js';
import { isDoubleTap } from './build_zoom.js';
import { GRID_MAT, rodPrice } from './build_materials.js';

const SAFE_T = 'max(8px,env(safe-area-inset-top))', SAFE_B = 'max(8px,env(safe-area-inset-bottom))';
export const BUX_TOP = 62, BUX_BOT = 188, BUX_TOP_LAND = 54, BUX_BOT_LAND = 84;   // px som topp- og bunnfeltet tar av byggeområdet (build.js: TOPPX/BOTPX)
export const buxCss = () => `
#bld .bux,#bld .bxsheet{display:none}
#bld.bux .bux{display:block}
#bld.bux .bt.top,#bld.bux .zoom,#bld.bux .tools,#bld.bux .tray,#bld.bux .bt.bot,#bld.bux .gtools,#bld.bux .gsim,#bld.bux:not(.bxopen) .lab,#bld.bux:not(.bxopen) .loads,#bld.bux:not(.bxopen) .share,#bld.bux .gg{display:none!important}
#bld.bux .hint{top:calc(${SAFE_T} + 56px);font-size:12.5px;line-height:1.25;color:#ffe9a8;z-index:2}
#bld .bux .bxtop{position:absolute;left:0;right:0;top:${SAFE_T};height:48px;display:flex;gap:8px;padding:0 8px;padding-right:max(52px,calc(env(safe-area-inset-right) + 52px));align-items:stretch;pointer-events:none;z-index:3}
#bld .bux button{pointer-events:auto;font-family:system-ui}
#bld .bux .bxback,#bld .bux .bxmore{flex:0 0 52px;height:48px;border-radius:14px;border:2px solid #6ab8ff;background:#121a2ce6;color:#cfe8ff;font:800 24px/1 system-ui;padding:0}
#bld .bux .bxname{flex:1 1 0;min-width:0;display:flex;flex-direction:column;justify-content:center;align-items:center;border-radius:14px;background:#0b1020cc;border:2px solid #3df0b0;color:#e8fff6;padding:0 6px;text-align:center;line-height:1.1}
#bld .bux .bxname b{font:800 13px system-ui;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#bld .bux .bxname i{font:700 13px system-ui;font-style:normal;color:#ffd23f;letter-spacing:1px}
#bld .bux .bxbot{position:absolute;left:0;right:0;bottom:${SAFE_B};padding:0 10px;display:flex;flex-direction:column;gap:6px;pointer-events:none;z-index:3}
#bld .bux .bxcost{height:22px;display:flex;align-items:center;gap:8px;color:#ffe9a8;font:800 13px system-ui;justify-content:center;pointer-events:none}
#bld .bux .bxbar{flex:0 1 120px;height:8px;border-radius:4px;background:#0b1020;border:1px solid #ffffff55;overflow:hidden}
#bld .bux .bxbar i{display:block;height:100%;width:0;background:#3df0b0}
#bld .bux .bxbar.over i{background:#ff6a5a}
#bld .bux .bxcost.over{color:#ff9a8a}
#bld .bux .bxrow{display:flex;gap:10px;align-items:flex-start;justify-content:center}
#bld.sim .bux .bxrow.mats{display:none}
#bld .bux .bxmat{flex:0 0 auto;width:84px;display:flex;flex-direction:column;align-items:center;gap:2px;pointer-events:none}
#bld .bux .bxmat button{flex:0 0 auto;width:60px;height:60px;min-width:60px;border-radius:50%;padding:0;border:3px solid #ffffff55;background:#121a2ce6;font:800 11px/1.05 system-ui;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0;box-shadow:inset 0 -6px 0 var(--mc,#c98a45)}
#bld .bux .bxmat button span{font-size:20px;line-height:1}
#bld .bux .bxmat button.on{border-color:#ffd23f;background:#2b3552;box-shadow:inset 0 -6px 0 var(--mc,#c98a45),0 0 0 3px #ffd23f66}
#bld .bux .bxmat em{font:700 10.5px/1.1 system-ui;font-style:normal;color:#ffd9a0;text-align:center;white-space:nowrap}
#bld .bux .bxundo{flex:0 0 56px;width:56px;height:56px;min-width:56px;margin-top:2px;border-radius:50%;padding:0;border:2px solid #ffa940;background:#121a2ce6;color:#ffd9a0;font:800 26px/1 system-ui}
#bld .bux .bxundo[disabled]{opacity:.35}
#bld .bux .bxgo{display:flex;gap:8px;align-items:stretch}
#bld .bux .bxgo button{height:56px;border-radius:28px;font:800 18px system-ui;border:3px solid #3df0b0;background:#2a7f62;color:#fff;flex:1 1 0;min-width:0;padding:0 6px}
#bld .bux .bxgo button.bxsp{flex:0 0 28%;background:#121a2ce6;border:2px solid #ffa940;color:#ffd9a0;font-size:14px;display:none}
#bld .bux .bxgo button.bxsp.on{background:#7a4a14;border-color:#fff}
#bld .bux .bxgo button.bxsp[disabled]{opacity:.35}
#bld.sim .bux .bxgo button.bxsp{display:block}
#bld.sim .bux .bxgo button.try{background:#8a3a2a;border-color:#ff9a8a}
#bld .bux .bxdel{position:absolute;display:none;width:52px;height:52px;border-radius:50%;border:3px solid #fff;background:#d6422f;color:#fff;font:800 24px/1 system-ui;padding:0;margin:-26px 0 0 -26px;z-index:4;box-shadow:0 3px 10px #0008;pointer-events:auto}
#bld .bux .bxdel.show{display:block}
#bld.sim .bux .bxdel{display:none}
#bld .bxsheet{position:absolute;inset:0;z-index:4;align-items:flex-end;justify-content:center;background:#0009}
#bld.bux.bxopen .bxsheet{display:flex}
#bld .bxsheet .card>*{flex:0 0 auto}
#bld .bxsheet .card{width:min(460px,100%);max-height:86%;overflow:auto;background:#17203a;border:2px solid #6ab8ff;border-radius:18px 18px 0 0;padding:12px 12px calc(${SAFE_B} + 8px);display:flex;flex-direction:column;gap:10px;color:#fff}
#bld .bxsheet h3{margin:0;font:800 16px system-ui;color:#cfe8ff}
#bld .bxsheet .bxsec{display:flex;flex-direction:column;gap:6px}
#bld .bxsheet .bxsec small{font:700 11px system-ui;color:#9fb0d8;text-transform:uppercase;letter-spacing:.5px}
#bld .bxsheet .bxgrid{display:flex;flex-wrap:wrap;gap:8px}
#bld .bxsheet .bxgrid button,#bld .bxsheet .loads button,#bld .bxsheet .share button,#bld .bxsheet .lab button{height:52px;min-width:48px;flex:1 1 40%;max-width:none;font:800 14px system-ui;border-radius:14px;white-space:normal;line-height:1.1}
#bld .bxsheet .loads,#bld .bxsheet .share,#bld .bxsheet .lab{position:static;display:flex;flex-wrap:wrap;gap:8px;padding:0;pointer-events:auto}
#bld .bxsheet .lab .nm{flex:1 1 100%;order:-1;min-height:44px}
#bld .bxsheet .lab button[data-lb="prev"],#bld .bxsheet .lab button[data-lb="next"]{flex:1 1 40%;font-size:22px}
#bld .bxsheet .share button.bmode,#bld .bxsheet .share button.bguide{display:none!important}
#bld .bxsheet .loads:empty{display:none}
#bld .bxsheet .bxclose{height:54px;border-radius:14px;border:2px solid #3df0b0;background:#1f7a52;color:#fff;font:800 16px system-ui}
#bld .bxsheet .bxgrid button{border:2px solid #6ab8ff;background:#121a2ce6;color:#cfe8ff;pointer-events:auto}
@media (orientation:landscape) and (max-height:520px){
#bld .bux .bxtop{height:42px}
#bld .bux .bxback,#bld .bux .bxmore{height:42px;flex-basis:48px}
#bld.bux .hint{top:calc(${SAFE_T} + 46px);font-size:11.5px}
#bld .bux .bxbot{left:auto;right:0;width:min(62%,520px);bottom:${SAFE_B};gap:4px}
#bld .bux .bxrow{gap:6px}
#bld .bux .bxmat{width:64px}#bld .bux .bxmat button{width:48px;height:48px;min-width:48px}#bld .bux .bxmat button span{font-size:16px}#bld .bux .bxmat em{display:none}
#bld .bux .bxundo{width:48px;height:48px;flex-basis:48px;min-width:48px}
#bld .bux .bxgo button{height:48px;font-size:16px}
#bld .bxsheet .card{max-height:96%}
}
`;
export const buxMarkup = () => `<div class="bux"><div class="bxtop"><button data-bx="back" class="bxback"></button><div class="bxname"><b></b><i></i></div><button data-bx="more" class="bxmore">⋯</button></div><button data-bx="del" class="bxdel">✕</button><div class="bxbot"><div class="bxcost"><span class="bxct"></span><span class="bxbar"><i></i></span></div><div class="bxrow mats">${BUX.mats.map((m) => `<div class="bxmat"><button data-bx="${m.id}"><span>${m.icon}</span><b></b></button><em></em></div>`).join('')}<button data-bx="undo" class="bxundo" aria-label="↶">↶</button></div><div class="bxgo"><button data-bx="slow" class="bxsp"></button><button data-bx="pause" class="bxsp"></button><button data-bx="try" class="try"></button></div></div></div><div class="bxsheet"><div class="card"><h3 class="bxst"></h3><div class="bxsec bxloads"><small></small></div><div class="bxsec bxshare"><small></small></div><div class="bxsec bxlab"><small></small></div><div class="bxsec"><div class="bxgrid"><button data-bx="fit"></button><button data-bx="dots"></button><button data-bx="reset" class="bxreset"></button><button data-bx="menu"></button></div></div><button data-bx="close" class="bxclose"></button></div></div>`;

export function createBuildUx(ctx) {
  const { root, T, toast, logEv, buzz, audio, grid } = ctx;
  const q = (s) => root.querySelector(s);
  const timer = createTimer(); let timerSite = null;
  let st = null, ghost = null, tgt = null, lastTap = null, hand = null, handSeen = false, lastSig = '', opened = false, armed = null;   // armed: knuten som kan flyttes (valgt ved å trykke på en eksisterende knute)
  const wall = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
  const site = () => ctx.site(), B = () => ctx.getB(), G = () => B()?.rg, scale = () => ctx.view().scale;
  const wanted = () => !!ctx.getOn() && !!site() && buxSite({ levelId: ctx.levelId, site: site() });
  const on = () => wanted() && grid.on();
  const moved = new Map();
  const mat = () => grid.mat;
  const handDone = () => { try { return !!ctx.store?.get(BUX.handKey, 0); } catch { return false; } };

  // ---- ark med de sjeldne tingene: de gamle beholderne (last, deling, Bygglab-rad) flyttes dit mens skjermen er på ----
  const homes = new Map();
  const slots = { loads: '.bxloads', share: '.bxshare', lab: '.bxlab' };
  function attach() {
    for (const [cls, slot] of Object.entries(slots)) {
      const el = root.querySelector(`:scope > .${cls}`), box = q(slot); if (!el || !box) continue;
      homes.set(cls, { el, next: el.nextSibling }); box.appendChild(el);
    }
  }
  function detach() {
    for (const [cls, h] of homes) { const el = h.el; if (el.parentNode !== root) { const ref = h.next && h.next.parentNode === root ? h.next : null; if (root.insertBefore) root.insertBefore(el, ref); else root.appendChild(el); } homes.delete(cls); }
  }
  let attached = false;
  function layout() {
    const want = on(); root.classList.toggle('bux', want);
    if (want && !attached) { attach(); attached = true; } else if (!want && attached) { detach(); attached = false; root.classList.remove('bxopen'); }
    if (want && !opened) { opened = true; timerOpen(timer, wall()); timerSite = site()?.id; logEv('byggux', `skjerm på ${site()?.id}`); }
    if (!want) opened = false;
    if (want && !handSeen && !handDone() && !hand && !ctx.isSim()) maybeHand();
    return want;
  }

  // ---- tekster og knapper (bare når noe er endret) ----
  function labelsNow(info) {
    const sig = [info.sim, info.done, info.speed, info.cost, info.budget, info.stars, info.on, mat(), info.canUndo, info.name, info.nOf, ctx.lang?.()].join('|');
    if (sig === lastSig) return; lastSig = sig;
    q('.bxback').setAttribute('aria-label', T('build.back')); q('.bxback').textContent = '←'; q('.bxmore').setAttribute('aria-label', T('bux.more'));
    const nm = q('.bxname b'), stars = q('.bxname i'); nm.textContent = info.nOf ? T('bux.site', { name: info.name, n: info.nOf.n, of: info.nOf.of }) : info.name; stars.textContent = starText(info.on ? info.stars : info.best || 0);
    const ct = q('.bxct'); ct.textContent = info.budgetShown ? T('bux.cost', { c: info.cost, budget: info.budget }) : T('bux.costPlain', { c: info.cost }); q('.bxcost').classList.toggle('over', !!info.over); q('.bxbar').classList.toggle('over', !!info.over); q('.bxbar i').style.width = Math.round(100 * info.ratio) + '%';
    for (const m of BUX.mats) {
      const b = q(`[data-bx="${m.id}"]`), mi = matInfo(m.id), em = b.parentNode.querySelector('em');
      b.querySelector('b').textContent = T('grid.mat.' + m.id); b.style.setProperty('--mc', mi.color); b.classList.toggle('on', mat() === m.id); b.setAttribute('aria-pressed', mat() === m.id ? 'true' : 'false'); b.setAttribute('aria-label', T('grid.mat.' + m.id));
      em.textContent = `${COMMA(mi.price)} ${T('bux.perUnit')} ${strengthBars(mi.strength)}`;
    }
    q('.bxundo').disabled = !info.canUndo; q('.bxundo').setAttribute('aria-label', T('build.undo'));
    q('.bxgo .try').textContent = info.sim ? '■ ' + T('build.stop') : '▶ ' + T('build.try');
    for (const k of ['slow', 'pause']) { const b = q(`.bxgo [data-bx="${k}"]`); b.textContent = k === 'pause' ? T(info.speed === 'pause' ? 'grid.resume' : 'grid.pause') : T('grid.slow'); b.classList.toggle('on', info.speed === k); b.disabled = !!info.done; b.setAttribute('aria-pressed', info.speed === k ? 'true' : 'false'); }
    q('.bxst').textContent = T('bux.sheet');
    q('.bxloads small').textContent = T('bux.sec.load'); q('.bxshare small').textContent = T('bux.sec.share'); q('.bxlab small').textContent = T('bux.sec.lab');
    q('[data-bx="fit"]').textContent = '⤢ ' + T('bux.fit'); q('[data-bx="dots"]').textContent = T(grid.dots ? 'bux.dotsOn' : 'bux.dotsOff'); q('.bxreset').textContent = T('build.reset'); q('[data-bx="menu"]').textContent = T('build.menu'); q('[data-bx="close"]').textContent = T('bux.close');
    q('.bxreset').style.display = info.lab ? 'none' : '';
    q('.bxdel').setAttribute('aria-label', T('bux.del'));
    q('.bxloads').style.display = root.querySelector('.bxloads .loads')?.children.length ? '' : 'none'; q('.bxlab').style.display = info.lab ? '' : 'none';
  }
  const invalidate = () => { lastSig = ''; };

  // ---- spøkelsesstav og håndanimasjon ----
  function maybeHand() {
    const p = handPath(site(), G()); if (!p) return;
    if (!shouldShowHand({ seen: handDone(), hint: ctx.getHint(), guideOn: ctx.getGuideOn?.(), wanted: true })) return;
    hand = { p, t0: null }; logEv('byggux', 'hånd-animasjon vist');
  }
  function endHand(how) {
    if (!hand) return; hand = null; handSeen = true; try { ctx.store?.set(BUX.handKey, 1); } catch { /* ok */ }
    logEv('byggux', `hånd-animasjon ${how}`);
  }
  const tag = (g2, text, x, y, color) => {
    g2.font = '800 13px system-ui'; g2.textAlign = 'center'; const w = g2.measureText(text).width + 14;
    g2.fillStyle = 'rgba(14,20,36,.92)'; g2.beginPath(); g2.roundRect ? g2.roundRect(x - w / 2, y - 14, w, 24, 8) : g2.rect(x - w / 2, y - 14, w, 24); g2.fill();
    g2.strokeStyle = color; g2.lineWidth = 2; g2.stroke(); g2.fillStyle = '#fff'; g2.fillText(text, x, y + 3); g2.textAlign = 'start';
  };
  function ghostText(g) {
    if (!g.ok && g.why && g.why !== 'out') return T('grid.err.' + g.why, { n: COMMA(maxLenOf(B())) });
    return T('grid.rodInfo', { mat: T('grid.mat.' + g.mat), len: COMMA(g.len), cost: g.cost });
  }
  function draw(sx, tNow, g2) {
    if (!on()) return;
    updateBubble(sx);
    if (ghost && ghost.show) {
      const pa = sx(ghost.a.u, ghost.a.v), pb = sx(ghost.b.u, ghost.b.v), m = GRID_MAT[ghost.mat], w = Math.max(5, m.h * scale()), ok = ghost.ok, col = ok ? '#3df0b0' : '#ff6a5a';
      g2.save(); g2.lineCap = 'round'; g2.globalAlpha = ok ? 0.85 : 0.5;
      g2.strokeStyle = col; g2.lineWidth = w + 5; g2.beginPath(); g2.moveTo(pa.x, pa.y); g2.lineTo(pb.x, pb.y); g2.stroke();
      g2.strokeStyle = ok ? m.color : '#8a3a2a'; g2.lineWidth = w; g2.beginPath(); g2.moveTo(pa.x, pa.y); g2.lineTo(pb.x, pb.y); g2.stroke(); g2.restore();
      g2.beginPath(); g2.arc(pb.x, pb.y, 13, 0, 7); g2.strokeStyle = col; g2.lineWidth = 3; g2.stroke();
      tag(g2, ghostText(ghost), Math.min(Math.max(90, (pa.x + pb.x) / 2), ctx.width() - 90), Math.max(ctx.topY() + 18, Math.min(pa.y, pb.y) - 26), col);
    }
    if (hand) {
      if (hand.t0 == null) hand.t0 = tNow; const a = sx(hand.p.a.u, hand.p.a.v), b = sx(hand.p.b.u, hand.p.b.v), h = handAt(tNow - hand.t0, a, b);
      g2.save(); g2.lineCap = 'round'; g2.strokeStyle = 'rgba(61,240,176,.7)'; g2.lineWidth = 6; g2.setLineDash([2, 10]); g2.beginPath(); g2.moveTo(a.x, a.y); g2.lineTo(h.x, h.y); g2.stroke(); g2.setLineDash([]);
      g2.beginPath(); g2.arc(a.x, a.y, 16 + 3 * Math.sin(tNow * 8), 0, 7); g2.strokeStyle = '#ffd23f'; g2.lineWidth = 3; g2.stroke();
      g2.font = '34px system-ui'; g2.textAlign = 'center'; g2.fillText('👆', h.x, h.y + 38); g2.restore();
      if (h.done) endHand('ferdig');
    }
  }
  const bubbleEl = () => q('.bxdel');
  let bubbleSig = '';
  function updateBubble(sx) {
    const el = bubbleEl(); if (!el) return; const d = ctx.isSim() || root.classList.contains('bxopen') ? null : deletable(G(), grid.selNode, grid.selRod), a = d && bubbleAnchor(G(), d);
    if (!a) { el.classList.remove('show'); bubbleSig = ''; return; }
    const p = sx(a.u, a.v), x = Math.min(Math.max(p.x, 34), ctx.width() - 34), y = Math.max(ctx.topY() + 36, p.y - (d.kind === 'rod' ? 66 : 44)), sig = `${d.kind}${d.id}${Math.round(x)}${Math.round(y)}`;
    el.classList.add('show'); if (sig !== bubbleSig) { bubbleSig = sig; el.style.left = x + 'px'; el.style.top = y + 'px'; }
  }
  function doDelete() {
    const d = deletable(G(), grid.selNode, grid.selRod); if (!d) return false;
    const n = d.kind === 'node' ? G().rods.filter((r) => r.a === d.id || r.b === d.id).length : 0;
    const ok = grid.del(); if (ok) { armed = null; logEv('byggux', `slett ${d.kind === 'node' ? 'knute' : 'stav'} ${d.id}${n ? ` (${n} staver fulgte med)` : ''}`); buzz?.(12); bubbleEl().classList.remove('show'); bubbleSig = ''; }
    return ok;
  }

  // ---- berøring ----
  const W = (x, y) => ctx.toWorld(x, y);
  function down(e, x, y) {
    endHand('avbrutt av berøring'); const w = W(x, y), p = pickAt(G(), w.u, w.v, scale());
    if (p.kind === 'node') {
      const n = p.node;
      if (dragMeaning(n, armed && armed === grid.selNode ? armed : null) === 'move') { const was = { u: n.u, v: n.v }; st = { kind: 'move', id: n.id, pid: e.pointerId, was }; grid.down(e, x, y); return true; }
      st = { kind: 'node', id: n.id, pid: e.pointerId, x0: x, y0: y, x, y, moved: false }; ghost = null; tgt = null;
      try { root.setPointerCapture(e.pointerId); } catch { /* ok */ }
      return true;
    }
    ctx.startPan(e, x, y); return false;   // stav eller tomt: panorering, og et trykk (uten å dra) kommer som tap()
  }
  function move(e) {
    if (!st || e.pointerId !== st.pid) return false;
    if (st.kind === 'move') return grid.move(e);
    const r = ctx.loc(e); st.x = r.x; st.y = r.y;
    if (!st.moved && Math.hypot(r.x - st.x0, r.y - st.y0) > BUX.dragPx) { st.moved = true; armed = null; grid.select(st.id, null); }
    if (st.moved) { const w = W(r.x, r.y); tgt = resolveTarget(site(), G(), w.u, w.v, scale(), st.id); ghost = ghostOf(B(), st.id, tgt, mat()); }
    return true;
  }
  function up(e) {
    if (!st || e.pointerId !== st.pid) return false;
    const s = st; st = null;
    if (s.kind === 'move') {
      const n = nodeOf(G(), s.id); const had = s.was; grid.up(e);
      const n2 = nodeOf(G(), s.id); if (n && n2 && (Math.abs(n2.u - had.u) > 1e-6 || Math.abs(n2.v - had.v) > 1e-6)) logEv('byggux', `flytt knute ${s.id}`);
      return true;
    }
    const g = ghost, t = tgt; ghost = null; tgt = null;
    if (!s.moved) {
      const w = W(s.x0, s.y0), p = pickAt(G(), w.u, w.v, scale(), { nodePx: BUX.tapPx });   // kort stav: midt på staven er den, ikke knuten, som er trykket
      if (p.kind === 'rod') { armed = null; grid.select(null, p.rod.id); buzz?.(5); logEv('byggux', `valgte stav ${p.rod.id}`); return true; }
      grid.select(s.id, null); armed = s.id; buzz?.(5); return true;   // trykk på en eksisterende knute: valgt, og kan nå flyttes
    }   // trykk på en eksisterende knute: valgt, og kan nå flyttes
    if (g && g.show && g.ok) { commit(s.id, t); return true; }
    if (g && g.show) { toast(T('grid.err.' + (g.why || 'same'), { n: COMMA(maxLenOf(B())) })); buzz?.(12); }
    logEv('byggux', `spøkelsesstav avbrutt (${g && g.show ? g.why : 'ingen mål'})`); grid.select(null, null);
    return true;
  }
  function cancel() {
    if (st && st.kind === 'node' && st.moved) logEv('byggux', 'spøkelsesstav avbrutt (to fingre)');
    if (st && st.kind === 'move') grid.cancel(); st = null; ghost = null; tgt = null;
  }
  function commit(fromId, t) {
    const b = B(), m = mat(), r = t.kind === 'node' ? gAddRod(b, fromId, t.node.id, m) : gAddRodTo(b, fromId, t.u, t.v, m);
    if (!r.ok) { toast(T('grid.err.' + (r.why || 'same'), { n: COMMA(maxLenOf(b)) })); buzz?.(12); return false; }
    buzz?.(14); audio?.bhop?.(); logEv('byggux', `stav ${m} lengde ${COMMA(r.len)} kost ${r.cost}${r.newNode ? ', ny knute' : ''}`);
    const f = timerRod(timer, wall()); if (f.first) logEv('byggux', `første stav etter ${f.secs.toFixed(1)} s`);
    armed = null; grid.select(null, null); ctx.trayRender?.(); ctx.onChange?.(); return true;   // ingenting valgt: neste dra fra sluttknuten fortsetter kjeden
  }
  // trykk på tomt eller en stav (build.js kaller denne når fingeren slippes uten å ha panorert)
  function tap(x, y, ts = performance.now()) {
    const w = W(x, y), p = pickAt(G(), w.u, w.v, scale(), { nodePx: BUX.tapPx });
    if (p.kind === 'rod') { armed = null; grid.select(null, p.rod.id); buzz?.(5); lastTap = null; logEv('byggux', `valgte stav ${p.rod.id}`); return; }
    if (p.kind === 'node') { grid.select(p.node.id, null); armed = p.node.id; return; }
    const cur = { t: ts, x, y };
    if (ctx.getDbl?.() !== false && isDoubleTap(lastTap, cur)) {   // dobbelttrykk på tomt = tilpass (og angre knuten det første trykket la)
      const added = lastTap.added; lastTap = null; if (added && ctx.undo) ctx.undo(true); ctx.fit(); logEv('byggux', 'tilpass (dobbelttrykk)'); return;
    }
    const sc = scale(), near = nearestPoint(site(), w.u, w.v, Math.max(0.62 * gridStep(site()), 30 / sc));
    if (!near) { armed = null; grid.select(null, null); lastTap = { ...cur, added: false }; return; }
    const ex = nodeAt(G(), near.u, near.v); if (ex) { grid.select(ex.id, null); armed = ex.id; lastTap = { ...cur, added: false }; return; }
    const r = gAddNode(B(), near.u, near.v);
    if (!r.ok) { toast(T('grid.err.' + (r.why || 'out'), { n: COMMA(maxLenOf(B())) })); lastTap = null; return; }
    buzz?.(10); audio?.bhop?.(); armed = null; grid.select(r.node.id, null); logEv('byggux', `knute ${r.node.id}`); lastTap = { ...cur, added: true }; ctx.trayRender?.(); ctx.onChange?.();
  }

  // ---- knapper ----
  function sheet(open) { root.classList.toggle('bxopen', !!open && on()); invalidate(); if (open) logEv('byggux', 'meny åpnet'); }
  const act = {
    back: () => ctx.act.back(), more: () => sheet(!root.classList.contains('bxopen')), close: () => sheet(false),
    undo: () => ctx.act.undo(), try: () => ctx.act.try(), menu: () => { sheet(false); ctx.act.menu(); }, reset: () => { sheet(false); ctx.act.reset(); },
    fit: () => { ctx.fit(); sheet(false); }, dots: () => { grid.setDots(!grid.dots); invalidate(); logEv('byggux', `rutenett ${grid.dots ? 'på' : 'av'}`); },
    slow: () => ctx.speed('slow'), pause: () => ctx.speed('pause'), del: () => { doDelete(); },
    wood: () => grid.setMat('wood'), steel: () => grid.setMat('steel'), rope: () => grid.setMat('rope'),
  };
  root.addEventListener('click', (e) => {
    const b = e.target.closest?.('[data-bx]'), k = b?.dataset?.bx; if (!k || !Object.hasOwn(act, k)) return; e.stopPropagation(); act[k](); invalidate();
  }, true);
  const sh = q('.bxsheet');
  if (sh) {
    for (const ev of ['pointerdown', 'pointermove', 'touchstart', 'touchmove', 'wheel']) sh.addEventListener(ev, (e) => e.stopPropagation());
    sh.addEventListener('click', (e) => {
      if (e.target === sh) { sheet(false); return; }
      const b = e.target.closest?.('button'); if (b && (b.dataset.s === 'copy' || b.dataset.s === 'paste' || b.dataset.s === 'best' || b.dataset.s === 'replay' || b.dataset.lb === 'site' || b.dataset.lb === 'all')) setTimeout(() => sheet(false), 0);
    });
  }
  for (const el of root.querySelectorAll('.bux button')) el.addEventListener('pointerdown', (e) => e.stopPropagation());   // knappene skal ikke starte panorering/berøring på brettet

  // ---- tilstand fra build.js hver tegning ----
  function frame() {
    if (!layout()) return;
    const b = B(), info = ctx.info(), bd = budgetOf({ site: site(), cost: info.cost, stageBudget: info.stageBudget });
    labelsNow({ ...info, ...bd, budgetShown: true, canUndo: !!b.history.length, speed: grid.speed });
  }
  function hint() {
    if (!on() || ctx.isSim()) return '';
    if (st && st.moved) return '';
    if (grid.selRod) return T('bux.hint.rod'); if (grid.selNode && deletable(G(), grid.selNode, null)) return armed === grid.selNode ? T('bux.hint.node') : T('bux.hint.new');
    if (!G().rods.some((r) => !r.deck) && ctx.getHint()) return T('bux.hint.start');
    return '';
  }
  // PRØV og resultat: tid til første bro (logg)
  function onTry() { if (!on()) return; const n = timerTry(timer); logEv('byggux', `prøv nr. ${n}`); }
  function onResult(won, secs) {
    if (!on() && !opened) return; if (!won) { logEv('byggux', 'prøve feilet'); return; }
    const w = timerWin(timer, wall()); if (w.first) logEv('byggux', `første bro klarte det etter ${w.secs.toFixed(0)} s (${w.tries} prøver, ${w.rods} staver)`); else logEv('byggux', 'prøve klarte det');
  }
  const reset = () => { armed = null; st = null; ghost = null; tgt = null; lastTap = null; sheet(false); bubbleSig = ''; invalidate(); };
  return {
    on, wanted, layout, frame, draw, down, move, up, cancel, tap, hint, onTry, onResult, reset, invalidate, sheet,
    get ghost() { return ghost; }, get dragging() { return !!st; }, get handOn() { return !!hand; }, get timer() { return timer; }, get timerSite() { return timerSite; }, skipHand: () => endHand('hoppet over'), showHand: maybeHand, bubbleEl,
  };
}
