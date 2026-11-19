// R93: liggende utgave av den forenklede byggeskjermen (R92). CSS + ekstra markup + en liten kontroller som følger formatet (stående/liggende).
// Liggende: byggeområdet i midten over hele høyden; venstre panel (← tilbake, ⋯ meny, ↶ angre); høyre panel (TRE, STÅL, TAU som ikoner med pris og styrke, store ▶ PRØV nederst,
// SLOW/PAUSE rett over bare under prøven); budsjettplate øverst i midten; stedsnavn som liten etikett under. Stående: R92-oppsettet som før, pluss et avvisbart banner «Snu telefonen».
// Alle de gamle knappene i R92-markupen gjenbrukes (CSS flytter dem), så bygging, lås og ark virker likt i begge formater. Logikken ligger i buildux_land_logic.js.
import { LAND, orientOf, orientName, landMetrics, portMetrics, centerShift, matLocks, lockText, pickMat, shouldShowLabels, shouldSuggest, shouldShowBanner, guideLines, nextTriangle, createOrientStats, statsAct, statsTurn, statsTry, statsWin, winText } from './buildux_land_logic.js';

export const landCss = () => `
#bld .bxrail,#bld .bxplate,#bld .bxtip,#bld .bxbanner,#bld .bxprobe,#bld .bux .bxmat button .bxlock{display:none}
#bld .bux .bxmat button .bxlock{position:absolute;right:-2px;top:-2px;font-size:15px;line-height:1;text-decoration:none}
#bld .bux .bxmat button{position:relative}
#bld .bxprobe{display:block;position:absolute;left:0;top:0;width:0;height:0;visibility:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);pointer-events:none}
#bld.bux .bxbanner.show{display:flex;position:absolute;left:8px;right:8px;top:calc(max(8px,env(safe-area-inset-top)) + 56px);z-index:3;align-items:center;gap:4px;padding:0 0 0 12px;min-height:48px;border-radius:14px;background:#2b3552f2;border:2px solid #ffd23f;color:#fff;font:700 13.5px/1.2 system-ui;pointer-events:auto}
#bld .bxbanner span{flex:1 1 auto}
#bld .bxbanner button{flex:0 0 48px;width:48px;height:48px;border:0;background:none;color:#ffd23f;font:800 20px/1 system-ui;padding:0}
#bld.bux.bxland .bux{display:contents}
#bld.bux.bxland .bxbanner{display:none!important}
#bld.bux.bxland{--bxl:calc(var(--pw,80px) + env(safe-area-inset-left));--bxr:calc(var(--pw,80px) + env(safe-area-inset-right));--bxb:52px}
#bld.bux.bxland .bux .bxtop,#bld.bux.bxland .bux .bxbot,#bld.bux.bxland .bux .bxrow,#bld.bux.bxland .bux .bxgo{display:contents}
#bld.bux.bxland .bxrail{display:block;position:absolute;top:0;bottom:0;z-index:2;background:linear-gradient(#111a2ef2,#0b1020f2);pointer-events:auto}
#bld.bux.bxland .bxrail.l{left:0;width:var(--bxl);border-right:2px solid #6ab8ff66}
#bld.bux.bxland .bxrail.r{right:0;width:var(--bxr);border-left:2px solid #6ab8ff66}
/* venstre panel */
#bld.bux.bxland .bux .bxback,#bld.bux.bxland .bux .bxmore,#bld.bux.bxland .bux .bxundo{position:absolute;z-index:3;left:calc(env(safe-area-inset-left) + (var(--pw,80px) - var(--bxb))/2);width:var(--bxb);height:var(--bxb);min-width:var(--bxb);flex:none;margin:0;border-radius:14px;font-size:26px}
#bld.bux.bxland .bux .bxback{top:max(8px,env(safe-area-inset-top))}
#bld.bux.bxland .bux .bxmore{top:50%;margin-top:calc(var(--bxb) / -2);font-size:24px}
#bld.bux.bxland .bux .bxundo{bottom:max(8px,env(safe-area-inset-bottom));top:auto;border-radius:14px}
/* høyre panel: materialer */
#bld.bux.bxland .bux .bxmat{position:absolute;z-index:3;right:calc(env(safe-area-inset-right) + (var(--pw,80px) - 64px)/2);width:64px;gap:1px}
#bld.bux.bxland .bux .bxmat:nth-of-type(1){top:calc(var(--bxmt,52px))}
#bld.bux.bxland .bux .bxmat:nth-of-type(2){top:calc(var(--bxmt,52px) + var(--bxs,72px))}
#bld.bux.bxland .bux .bxmat:nth-of-type(3){top:calc(var(--bxmt,52px) + 2 * var(--bxs,72px))}
#bld.bux.bxland .bux .bxmat button{width:var(--bxb);height:var(--bxb);min-width:var(--bxb);border-radius:14px;box-shadow:inset 0 -5px 0 var(--mc,#c98a45)}
#bld.bux.bxland .bux .bxmat button.on{box-shadow:inset 0 -5px 0 var(--mc,#c98a45),0 0 0 3px #ffd23f99,0 0 14px 2px #ffd23f88}
#bld.bux.bxland .bux .bxmat button span{font-size:24px}
#bld.bux.bxland .bux .bxmat button b{display:none;font:800 10px/1 system-ui}
#bld.bux.bxland.bxlabels .bux .bxmat button b{display:block}
#bld.bux.bxland.bxlabels .bux .bxmat button span{font-size:19px}
#bld.bux.bxland .bux .bxmat em{display:block;font:700 11px/1.1 system-ui;color:#ffd9a0;white-space:nowrap}
#bld.bux.bxland .bux .bxmat button.locked{opacity:.4;filter:grayscale(.8);border-color:#ffffff33;box-shadow:none}
#bld.bux.bxland .bux .bxmat button.locked .bxlock{display:block}
#bld.bux.bxland.sim .bux .bxmat{display:none}
/* høyre panel: PRØV / STOPP, SLOW, PAUSE */
#bld.bux.bxland .bux .bxgo button{position:absolute;z-index:3;right:calc(env(safe-area-inset-right) + 4px);width:calc(var(--pw,80px) - 8px);flex:none;margin:0;padding:0;border-radius:14px;line-height:1.05}
#bld.bux.bxland .bux .bxgo .try{bottom:max(8px,env(safe-area-inset-bottom));height:60px;font:800 13px/1.05 system-ui;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;border-radius:16px}
#bld.bux.bxland .bux .bxgo .try .bxi{font-size:22px;line-height:1}
#bld.bux.bxland .bux .bxgo .bxsp{display:none;height:48px;font:800 12px/1.05 system-ui}
#bld.bux.bxland.sim .bux .bxgo .bxsp{display:block}
#bld.bux.bxland .bux .bxgo [data-bx="pause"]{bottom:calc(max(8px,env(safe-area-inset-bottom)) + 66px)}
#bld.bux.bxland .bux .bxgo [data-bx="slow"]{bottom:calc(max(8px,env(safe-area-inset-bottom)) + 66px + 54px)}
/* budsjettplate øverst i midten, stedsnavn som liten etikett under */
#bld.bux.bxland .bux .bxcost{display:none}
#bld.bux.bxland .bxplate{display:flex;position:absolute;z-index:3;top:max(6px,env(safe-area-inset-top));left:var(--bxl);right:var(--bxr);margin:0 auto;width:max-content;max-width:calc(100% - var(--bxl) - var(--bxr) - 16px);height:${LAND.plateH}px;align-items:center;gap:8px;padding:0 12px;border-radius:12px;background:#0b1020e6;border:2px solid #3df0b0;color:#ffe9a8;font:800 13px system-ui;pointer-events:none;white-space:nowrap}
#bld.bux.bxland .bxplate.over{border-color:#ff6a5a;color:#ff9a8a}
#bld.bux.bxland .bxplate .bxps{color:#ffd23f;letter-spacing:1px}
#bld.bux.bxland .bxplate .bxpbar{flex:0 0 64px;height:7px;border-radius:4px;background:#1b2440;border:1px solid #ffffff55;overflow:hidden}
#bld.bux.bxland .bxplate .bxpbar i{display:block;height:100%;width:0;background:#3df0b0}
#bld.bux.bxland .bxplate.over .bxpbar i{background:#ff6a5a}
#bld.bux.bxland .bux .bxname{position:absolute;z-index:3;top:calc(max(6px,env(safe-area-inset-top)) + ${LAND.plateH + 4}px);left:var(--bxl);right:var(--bxr);margin:0 auto;width:max-content;max-width:calc(100% - var(--bxl) - var(--bxr) - 16px);flex:none;background:none;border:0;padding:0;height:auto;pointer-events:none}
#bld.bux.bxland .bux .bxname b{font:700 11.5px system-ui;color:#cfe8ff;text-shadow:0 1px 3px #000}
#bld.bux.bxland .bux .bxname i{display:none}
#bld.bux.bxland .hint{left:var(--bxl);right:var(--bxr);top:calc(max(6px,env(safe-area-inset-top)) + ${LAND.plateH + 24}px);font-size:12px;padding:0 8px}
/* tips ved langt trykk */
#bld.bux .bxtip.show{display:block;position:absolute;z-index:5;max-width:200px;padding:6px 10px;border-radius:10px;background:#0b1020f5;border:2px solid #ffd23f;color:#fff;font:700 12.5px/1.2 system-ui;pointer-events:none;transform:translateY(-50%)}
/* arket: sentrert i byggeområdet */
#bld.bux.bxland .bxsheet{align-items:center}
#bld.bux.bxland .bxsheet .card{border-radius:18px;width:min(520px,calc(100% - var(--bxl) - var(--bxr)));max-height:calc(100% - 12px);padding-bottom:10px}
#bld.bux.bxland .bxsheet .card{gap:8px;padding-top:8px}
#bld.bux.bxland .bxsheet .bxclose{position:sticky;bottom:0;min-height:48px;box-shadow:0 -8px 8px #17203a}
#bld .bxsheet [data-bx="sugg"]{display:none}
#bld.bux.bxland.bxsugg .bxsheet [data-bx="sugg"]{display:block}
@media (orientation:landscape) and (max-height:340px){
#bld.bux.bxland{--bxb:48px}
#bld.bux.bxland .bux .bxmat{width:60px}
#bld.bux.bxland .bux .bxmat em{font-size:10.5px}
}
`;
export const landMarkup = () => '<div class="bxrail l"></div><div class="bxrail r"></div><div class="bxplate"><span class="bxpc"></span><span class="bxps"></span><span class="bxpbar"><i></i></span></div><div class="bxtip"></div><div class="bxbanner"><span></span><button data-bx="banner" type="button">✕</button></div><div class="bxprobe"></div>';

let bannerShown = false;   // én gang per økt (ikke lagret): modulenivå = så lenge siden er åpen

export function createLand(ctx) {
  const { root, T, logEv } = ctx;
  const q = (s) => { try { return root.querySelector(s); } catch { return null; } };
  const wall = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
  const stats = createOrientStats(orientOf(innerWidth, innerHeight), wall());
  let hold = false, cur = null, lastO = null, sig = '', insets = { t: 0, r: 0, b: 0, l: 0 }, bannerAt = 0, bannerOn = false, bannerDismissed = false, labelsT0 = null, labelsDone = false, skipped = false, tipT = null, tipHide = 0, tipAt = 0, sugg = null, suggSig = '';
  const store = ctx.store, get = (k, d) => { try { return store ? store.get(k, d) : d; } catch { return d; } }, set = (k, v) => { try { store?.set(k, v); } catch { /* ok */ } };
  try { skipped = !!get('tlm.buxlandsugg', 0); } catch { /* ok */ }
  const help = () => (ctx.getHelp ? ctx.getHelp() : { labels: true, suggest: false });
  const readInsets = () => {
    try { const p = q('.bxprobe'); if (!p || typeof getComputedStyle !== 'function') return; const c = getComputedStyle(p), n = (v) => Math.max(0, parseFloat(v) || 0); insets = { t: n(c.paddingTop), r: n(c.paddingRight), b: n(c.paddingBottom), l: n(c.paddingLeft) }; } catch { /* ok */ }
  };
  const metrics = () => { const o = { w: innerWidth, h: innerHeight, insetL: insets.l, insetR: insets.r, insetT: insets.t, insetB: insets.b }; return orientOf(o.w, o.h) === 'land' ? landMetrics(o) : portMetrics(o); };

  // kalles hver tegning fra buildux_view.layout(): want = skjermen er på
  function sync(want) {
    const o = orientOf(innerWidth, innerHeight), land = !!want && o === 'land';
    if (!want) { cur = null; lastO = null; root.classList.remove('bxland', 'bxlabels', 'bxsugg'); bannerOn = false; q('.bxbanner')?.classList?.remove('show'); return false; }
    if (lastO === null) { stats.orient = o; lastO = o; readInsets(); }
    if (o !== lastO) {   // snudd: byggingen ligger i byggeskjermen (ikke i formatet), så ingenting mistes; bare layout og tilpasning
      readInsets(); const t = statsTurn(stats, o); lastO = o; cur = null; sig = '';
      if (t) logEv('byggux', `snudd til ${orientName(o)} (${ctx.rodCount?.() ?? '?'} staver beholdt), ${t.acts} byggehandlinger så langt`);
      ctx.cancelDrag?.(); ctx.fit?.();
    }
    root.classList.toggle('bxland', land);
    const m = metrics(), s = `${m.orient}|${m.pw}|${m.left}|${m.right}|${insets.t}|${insets.b}`;
    if (s !== sig) {
      sig = s; cur = m;
      try {
        const st = root.style; st.setProperty('--pw', (m.pw || 80) + 'px'); const mt = Math.max(LAND.flagReserve, insets.t + LAND.flagReserve - 8), h = innerHeight, room = h - mt - (60 + 12 + Math.max(8, insets.b)), step = Math.max(62, Math.min(76, Math.floor(room / 3)));
        st.setProperty('--bxmt', mt + 'px'); st.setProperty('--bxs', step + 'px');
      } catch { /* ok */ }
      if (land) logEv('byggux', `liggende layout ${innerWidth}×${innerHeight}: panel ${m.pw} px, byggeområde ${m.area.w} px bredt over hele høyden`);
    }
    // banner (stående): én gang per økt, kan avvises
    const wantB = shouldShowBanner({ orient: o, on: want, shown: bannerShown && !bannerOn, dismissed: bannerDismissed });
    if (wantB && !bannerOn) { bannerOn = true; bannerShown = true; bannerAt = wall(); const bn = q('.bxbanner'); if (bn) { bn.querySelector('span').textContent = T('buxl.banner'); bn.querySelector('button')?.setAttribute?.('aria-label', T('buxl.bannerClose')); } logEv('byggux', 'banner «Snu telefonen» vist'); }
    if (bannerOn && (o === 'land' || bannerDismissed || (!hold && wall() - bannerAt > LAND.bannerSecs))) { bannerOn = false; if (o === 'land') bannerDismissed = true; }
    q('.bxbanner')?.classList?.toggle('show', bannerOn && o === 'port');
    // etiketter første gang (Nybegynner/Medium)
    if (land && !labelsDone) {
      const seen = !!get(LAND.labelsKey, 0);
      if (shouldShowLabels({ labels: help().labels, seen, land })) { if (labelsT0 == null) { labelsT0 = wall(); logEv('byggux', 'etikettforklaring vist (første gang liggende)'); } if (wall() - labelsT0 > LAND.labelsSecs) { labelsDone = true; set(LAND.labelsKey, 1); } }
      else labelsDone = seen || !help().labels ? true : labelsDone;
    }
    root.classList.toggle('bxlabels', land && labelsT0 != null && !labelsDone);
    root.classList.toggle('bxsugg', land && !!help().suggest);
    if (tipT == null && tipHide && wall() > tipHide) hideTip();
    return land;
  }
  const isLand = () => orientOf(innerWidth, innerHeight) === 'land';

  // ---- materiallåser ----
  const locks = () => matLocks({ site: ctx.site(), crumbs: ctx.getCrumbs?.() || 0, budget: ctx.budgetNow?.() ?? Infinity });
  function applyLocks() {
    const L = locks();
    for (const m of ['wood', 'steel', 'rope']) {
      const b = q(`[data-bx="${m}"]`); if (!b) continue; const lk = !!L[m];
      b.classList.toggle('locked', lk); b.setAttribute?.('aria-disabled', lk ? 'true' : 'false'); if (lk) b.setAttribute?.('data-lock', L[m].reason); else b.removeAttribute?.('data-lock');
    }
    return L;
  }
  // trykk på et materiale: låst = kort forklaring i stedet for valg
  function tryMat(id) {
    const L = locks(); if (!L[id]) return true;
    const t = lockText(L[id]); ctx.toast?.(T(t.key, t.vars)); ctx.buzz?.(12); logEv('byggux', `materiale ${id} låst (${L[id].reason})`); return false;
  }
  const fixMat = () => { const L = locks(), want = ctx.getMat(), m = pickMat(want, L); if (m !== want) ctx.setMat(m); };

  // ---- tips ved langt trykk ----
  function showTip(btn) {
    const tip = q('.bxtip'); if (!tip || !btn) return; const txt = btn.getAttribute('aria-label') || ''; if (!txt) return;
    tip.textContent = txt; tip.classList.add('show');
    const r = btn.getBoundingClientRect(), left = r.left < innerWidth / 2; tip.style.top = (r.top + r.height / 2) + 'px';
    if (left) { tip.style.left = (r.right + 8) + 'px'; tip.style.right = 'auto'; } else { tip.style.right = (innerWidth - r.left + 8) + 'px'; tip.style.left = 'auto'; }
    tipAt = wall(); tipHide = wall() + LAND.tipShowMs / 1000; logEv('byggux', `tips (langt trykk): ${txt}`);
  }
  function hideTip() { tipHide = 0; q('.bxtip')?.classList?.remove('show'); }
  const tipJustShown = () => tipAt && wall() - tipAt < 0.9;
  function bindTips() {
    let list = []; try { list = root.querySelectorAll('.bux button[data-bx]'); } catch { return; }
    for (const b of list) {
      const start = () => { clearTimeout(tipT); tipT = setTimeout(() => { tipT = null; if (isLand()) showTip(b); }, LAND.tipMs); }, stop = () => { if (tipT) { clearTimeout(tipT); tipT = null; } };
      b.addEventListener('pointerdown', start); b.addEventListener('pointerup', stop); b.addEventListener('pointercancel', stop); b.addEventListener('pointerleave', stop);
    }
  }

  // ---- veiledning på byggeområdet: ankerlinjer, flagg, forslag til neste trekant ----
  const suggOn = () => shouldSuggest({ suggest: help().suggest, guideOn: ctx.getGuideOn?.(), hint: ctx.getHint?.(), sim: ctx.isSim(), skipped });
  function draw(sx, tNow, g2) {
    if (!isLand()) return;
    const B = ctx.getB(), gl = B?.rg && guideLines(ctx.site(), B.rg); if (!gl) return;
    const sc = ctx.view().scale;
    g2.save(); g2.lineCap = 'round'; g2.setLineDash([7, 7]); g2.lineWidth = 2; g2.strokeStyle = 'rgba(190,225,255,.55)';
    const d0 = sx(gl.deck.u0, gl.deck.v), d1 = sx(gl.deck.u1, gl.deck.v); g2.beginPath(); g2.moveTo(d0.x, d0.y); g2.lineTo(d1.x, d1.y); g2.stroke();
    for (const c of gl.cliffs) { const a = sx(c.u, c.v0), b = sx(c.u, c.v1); g2.beginPath(); g2.moveTo(a.x, a.y); g2.lineTo(a.x, Math.max(a.y, b.y)); g2.stroke(); }
    g2.setLineDash([]);
    flag(g2, sx(gl.start.u, gl.start.v), '#3df0b0', false, sc); flag(g2, sx(gl.goal.u, gl.goal.v), '#ffd23f', true, sc);
    if (suggOn()) {
      const key = `${B.rg.rods.length}|${B.rg.nodes.length}`;
      if (key !== suggSig) { suggSig = key; sugg = nextTriangle(ctx.site(), B); }
      if (sugg) {
        const a = sx(sugg.a.u, sugg.a.v), b = sx(sugg.b.u, sugg.b.v), c = sx(sugg.c.u, sugg.c.v);
        g2.setLineDash([5, 8]); g2.lineDashOffset = -tNow * 10; g2.lineWidth = 3; g2.strokeStyle = 'rgba(255,210,63,.6)'; g2.beginPath(); g2.moveTo(a.x, a.y); g2.lineTo(c.x, c.y); g2.lineTo(b.x, b.y); g2.stroke(); g2.setLineDash([]);
        g2.beginPath(); g2.arc(c.x, c.y, 9, 0, 7); g2.strokeStyle = 'rgba(255,210,63,.85)'; g2.lineWidth = 2; g2.stroke();
      }
    } else sugg = null;
    g2.restore();
  }
  function flag(g2, p, col, goal, sc) {   // egne flagg (stolpe + vimpel; i mål med rutemønster)
    const h = Math.max(30, Math.min(46, sc * 1.1)), x = p.x, y = p.y - 6;
    g2.save(); g2.strokeStyle = '#e8eef8'; g2.lineWidth = 3; g2.beginPath(); g2.moveTo(x, y); g2.lineTo(x, y - h); g2.stroke();
    if (!goal) { g2.fillStyle = col; g2.beginPath(); g2.moveTo(x, y - h); g2.lineTo(x + 20, y - h + 8); g2.lineTo(x, y - h + 16); g2.closePath(); g2.fill(); }
    else { const s = 7; for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) { g2.fillStyle = (r + c) % 2 ? '#10162a' : '#fff'; g2.fillRect(x + c * s, y - h + r * s, s, s); } g2.strokeStyle = col; g2.lineWidth = 1.5; g2.strokeRect(x, y - h, 3 * s, 2 * s); }
    g2.restore();
  }
  const toggleSugg = () => { skipped = !skipped; set('tlm.buxlandsugg', skipped ? 1 : 0); sugg = null; suggSig = ''; logEv('byggux', `forslag til neste trekant ${skipped ? 'hoppet over' : 'på'}`); };
  const dismissBanner = () => { bannerDismissed = true; bannerOn = false; q('.bxbanner')?.classList?.remove('show'); logEv('byggux', 'banner avvist'); };

  // ---- tekster for land-elementene (plate, prøve-knapp) ----
  function plate(info, over) {
    const p = q('.bxplate'); if (!p) return;
    q('.bxpc').textContent = info.budgetShown ? T('bux.cost', { c: info.cost, budget: info.budget }) : T('bux.costPlain', { c: info.cost });
    q('.bxps').textContent = info.starsText; q('.bxpbar i').style.width = Math.round(100 * info.ratio) + '%'; p.classList.toggle('over', !!over);
  }
  const insetsNow = () => { if (!cur || cur.orient !== 'land') return { l: 0, r: 0 }; return { l: cur.left, r: cur.right }; };
  const topPx = () => (isLand() ? (cur && cur.orient === 'land' ? cur.topPx : landMetrics({ w: innerWidth, h: innerHeight, insetT: insets.t, insetB: insets.b }).topPx) : null);
  const botPx = () => (isLand() ? (cur && cur.orient === 'land' ? cur.botPx : LAND.botPx) : null);

  return {
    sync, isLand, metrics, draw, plate, applyLocks, tryMat, fixMat, bindTips, tipJustShown, hideTip, toggleSugg, dismissBanner, insets: insetsNow, topPx, botPx,
    act: () => statsAct(stats), tryNo: () => statsTry(stats), win: () => { const w = statsWin(stats, wall()); if (w.first) logEv('byggux', winText(w)); return w; },
    get stats() { return stats; }, get cur() { return cur; }, get bannerOn() { return bannerOn; }, get skipped() { return skipped; }, get labelsOn() { return labelsT0 != null && !labelsDone; }, get sugg() { return sugg; },
    set hold(v) { hold = !!v; },   // test: banneret står til det avvises
    resetBanner: () => { bannerShown = false; bannerDismissed = false; },
  };
}
export { centerShift };
