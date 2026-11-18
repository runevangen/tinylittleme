// R72: rutenett-bygging, visning og berøring (DOM + canvas 2D). Logikken ligger i grid_logic.js; byggeskjermen (build.js) kobler inn med createGridUI().
// Alt går med trykk: trykk et punkt = knute, trykk en knute og så et punkt (eller en annen knute) = stav i valgt materiale, dra en knute = flytt, FJERN = slett valgt knute/stav.
// Målene er skjermbaserte (minst ca. 44 px: nærmeste rutenettpunkt innen en halv rute treffes), så en finger treffer også når brettet er zoomet ut (R70).
import { GRID_MATS, GRID_MAT, rodPrice } from './build_materials.js';
import { guideCss } from './grid_guide_view.js';   // R75
import { shouldTipMode, showHelpBtn, shouldRestoreMode, getMode, setModeMem, KEY_TIP } from './grid_guide_logic.js';
import { applyExample, hasExample } from './grid_example.js';   // R73
import { gridAnchors, isGrid, setMode, isDeckRod, gridStep, siteHasGrid, latticePoints, nearestPoint, nodeOf, rodOf, nodeAt, rodLen, hitNode, hitRod, gAddNode, gAddRod, gAddRodTo, gRemoveNode, gRemoveRod, gMoveNode, canMoveTo, maxLenOf } from './grid_logic.js';

export const GRID_PX = 44;   // minste avstand (px) mellom rutenettpunkter i standardvisningen
export const gridCss = () => `
#bld .share button.bmode{display:none;white-space:normal;line-height:1.1;font-size:11px;max-width:120px}
#bld.hasgrid .share button.bmode{display:block}
#bld.sim .share button.bmode{display:none}
#bld.gridmode .bt.bot button[data-a="del"]{flex:0 1 240px}
#bld .gtools{position:absolute;left:0;right:0;bottom:calc(max(8px,env(safe-area-inset-bottom)) + 56px);display:none;gap:6px;justify-content:center;padding:0 8px;pointer-events:none}
#bld.gridmode .gtools{display:flex}
#bld.gridmode.sim .gtools{display:none}
#bld .gsim{position:absolute;left:0;right:0;bottom:calc(max(8px,env(safe-area-inset-bottom)) + 56px);display:none;gap:6px;justify-content:center;padding:0 8px;pointer-events:none}
#bld.gridmode.sim .gsim{display:flex}
#bld .gsim button{height:50px;flex:1 1 0;max-width:130px;font-size:15px}
#bld .gsim button.on{background:#7a4a14;border-color:#fff}
#bld .gsim button[disabled]{opacity:.35}
#bld .gtools button.ex{border-color:#3df0b0;color:#c9ffe8;flex:1.2 1 0;max-width:130px}
#bld:not(.gridex) .gtools button.ex{display:none}
#bld .gtools button{height:50px;flex:1 1 0;max-width:110px;font-size:14px}
#bld .gtools button.on{background:#7a4a14;border-color:#fff}
#bld .gtools button{box-shadow:inset 0 -7px 0 var(--mc,#c98a45)}
#bld.gridmode .tray,#bld.gridmode .tools,#bld.gridmode button[data-a="rotl"],#bld.gridmode button[data-a="rotr"],#bld.gridmode button[data-a="snap"]{display:none}
#bld.gridmode:not(.sim) .share,#bld.gridmode:not(.sim) .loads{bottom:calc(max(8px,env(safe-area-inset-bottom)) + 56px + 56px)}
#bld.gridmode.hasloads:not(.sim) .share{bottom:calc(max(8px,env(safe-area-inset-bottom)) + 56px + 56px + 48px)}
${guideCss()}
@media (orientation:landscape) and (max-height:520px){#bld .gtools{bottom:calc(max(8px,env(safe-area-inset-bottom)) + 48px)}#bld .gtools button{height:40px}#bld.gridmode:not(.sim) .share,#bld.gridmode:not(.sim) .loads{bottom:calc(max(8px,env(safe-area-inset-bottom)) + 48px + 44px)}#bld.gridmode.hasloads:not(.sim) .share{bottom:calc(max(8px,env(safe-area-inset-bottom)) + 48px + 44px + 44px)}}
`;
export const gridMarkup = () => `<div class="gtools"><button data-g="wood"></button><button data-g="steel"></button><button data-g="rope"></button><button data-g="example" class="ex"></button></div><div class="gsim"><button data-gs="slow"></button><button data-gs="pause"></button></div>`;

const COMMA = (x) => String(+x.toFixed(2)).replace('.', ',');
export const colRow = (site, p) => { const a = gridAnchors(site), st = gridStep(site); return { c: Math.round((p.u - (a[0]?.u ?? 0)) / st), r: Math.round(p.v / st) }; };

export function createGridUI(ctx) {
  const { root, T, toast, logEv, buzz, audio, onChange } = ctx;   // ctx.store, ctx.guide (R75)
  let mat = 'wood', selNode = null, selRod = null, gd = null, cursor = null, tHint = 0, dots = true;

  const B = () => ctx.getB(), site = () => ctx.site();
  const enabledHere = () => !!site() && siteHasGrid(site()) && ctx.getOn();
  const on = () => !!site() && enabledHere() && isGrid(B());
  const G = () => B().rg;
  const clearSel = () => { selNode = null; selRod = null; };
  const scale = () => ctx.view().scale;
  const logPt = (n) => { const q = colRow(site(), n); return `(${q.c}, ${q.r})`; };

  function sync() {   // knapper og klasser etter modus
    const s = site(); root.classList.toggle('hasgrid', !!s && enabledHere()); root.classList.toggle('gridmode', on());
    root.classList.toggle('gridex', on() && !!ctx.getHint() && hasExample(s) && !ctx.stageOn?.());   // R73: «SÅ SLIK» er en hjelp: borte på Ekspert og på steder uten kjøredekk
    const eb = root.querySelector('[data-g="example"]'); if (eb) eb.textContent = T('grid.example');
    simSync(speed, simDone);
    root.classList.toggle('gguidebtn', showHelpBtn({ enabled: enabledHere(), hint: !!ctx.getHint() }));   // R75: ?-knapp og MODUS-hint følger hjelpenivået
    root.classList.toggle('gmodetip', tipOn());
    const gb = root.querySelector('[data-a="gguide"]'); if (gb) gb.textContent = T('gguide.btn');
    if (s && B()) B().gridMaxLen = ctx.getMaxLen();
    const mb = root.querySelector('[data-a="mode"]'); if (mb) mb.textContent = !on() && enabledHere() && ctx.locked?.() ? T('grid.modeLocked') : T('grid.modeBtn', { m: T(on() ? 'grid.mode.grid' : 'grid.mode.classic') });
    for (const m of GRID_MATS) { const b = root.querySelector(`[data-g="${m}"]`); if (!b) continue; b.textContent = T('grid.mat.' + m); b.style?.setProperty?.('--mc', GRID_MAT[m].color); b.classList.toggle('on', mat === m); b.setAttribute?.('aria-pressed', mat === m ? 'true' : 'false'); }
  }
  const tipOn = () => !!site() && ctx.store && shouldTipMode({ enabled: enabledHere(), inGrid: on(), hint: !!ctx.getHint() && ctx.getGuideOn?.() !== false, tipped: !!ctx.store.get(KEY_TIP, 0), locked: !!ctx.locked?.() });
  function toggleMode(why = 'knapp') {
    if (!site() || !enabledHere() || ctx.isSim()) return false;
    B().gridDeck = !!ctx.getDeck?.();   // R73: kjøredekk mellom ankrene (nytt bygg i rutenett-modus)
    const to = on() ? 'classic' : 'grid';
    if (to === 'grid' && ctx.locked?.()) { toast(ctx.lockText()); logEv('bygg', `rutenett låst ${site().id}: bestå forrige sted først`); buzz?.(12); return false; }   // R74: neste sted åpnes når forrige er bestått
    if (!setMode(B(), to)) return false;
    clearSel(); gd = null; cursor = null;
    if (ctx.store) { setModeMem(ctx.store, to); if (to === 'grid') ctx.store.set(KEY_TIP, 1); }   // R75: valget huskes, og MODUS-hintet har gjort nytten sin
    ctx.trayRender(); sync(); logEv('bygg', `modus ${to === 'grid' ? 'rutenett' : 'klassisk'} (${why}) ${site().id}`); onChange?.();
    if (to === 'grid') ctx.guide?.auto();   // R75: «Så slik» første gang
    return true;
  }
  // R75: ved inngang til et sted: rutenett igjen hvis det var sist valgt (og klassisk bygg er tomt, stedet er åpent)
  function restoreMode() {
    if (!site() || !ctx.store || !shouldRestoreMode({ mem: getMode(ctx.store), enabled: enabledHere(), inGrid: on(), locked: !!ctx.locked?.(), placed: B().placed.length > 0 })) return false;
    return toggleMode('husket');
  }
  const modeTip = () => (tipOn() ? T('gguide.modeTip') : '');
  // R73: SÅ SLIK: legger et ferdig fagverk på stedet (kan angres)
  function example() {
    if (!on() || ctx.isSim()) return false;
    const r = applyExample(B()); if (!r.ok) { toast(T('grid.example.none')); return false; }
    clearSel(); gd = null; logEv('bygg', `eksempelbro lagt inn: ${r.rods} staver (${site().id})`); toast(T('grid.example.done')); buzz?.(10); ctx.trayRender(); onChange?.(); return true;
  }
  // R73: SLOW og PAUSE under prøven (bare tempoet i visningen; fysikken er uberørt)
  let speed = 'play', simDone = false;
  function simSync(sp = speed, done = simDone) {
    speed = sp; simDone = done;
    for (const k of ['slow', 'pause']) { const b = root.querySelector(`[data-gs="${k}"]`); if (!b) continue; const act = speed === k; b.textContent = k === 'pause' ? T(act ? 'grid.resume' : 'grid.pause') : T('grid.slow'); b.classList.toggle('on', act); b.disabled = !!done; b.setAttribute?.('aria-pressed', act ? 'true' : 'false'); }
  }
  function setSpeed(k) {
    if (simDone) return speed; const to = k === 'play' ? 'play' : speed === k ? 'play' : k;
    if (to !== speed) { simSync(to, simDone); logEv('bygg', `tempo ${to === 'play' ? 'vanlig' : to === 'slow' ? 'sakte' : 'pause'}`); }
    return speed;
  }
  function setMat(m) { if (m === 'example') { example(); return; } if (!GRID_MATS.includes(m)) return; mat = m; sync(); logEv('bygg', `materiale ${m}`); }
  const fail = (r) => toast(T('grid.err.' + (r.why || 'same'), { n: COMMA(maxLenOf(B())) }));

  // ---- trykk ----
  function pickNode(x, y) { const w = ctx.toWorld(x, y); return hitNode(G(), w.u, w.v, scale()); }
  function down(e, x, y) {
    cursor = null; const n = pickNode(x, y), w = ctx.toWorld(x, y);
    const p = nearestPoint(site(), w.u, w.v); if (p) cursor = { u: p.u, v: p.v, down: true, t0: ctx.now() };
    if (n) { gd = { id: n.id, pid: e.pointerId, x0: x, y0: y, x, y, moved: false }; try { root.setPointerCapture(e.pointerId); } catch { /* ok */ } return true; }
    ctx.startPan(e, x, y); return false;
  }
  function move(e) {
    if (!gd || e.pointerId !== gd.pid) return false;
    const r = ctx.loc(e); gd.x = r.x; gd.y = r.y; if (Math.hypot(r.x - gd.x0, r.y - gd.y0) > 10) gd.moved = true;
    if (gd.moved) { const w = ctx.toWorld(r.x, r.y), p = nearestPoint(site(), w.u, w.v); if (p) cursor = { u: p.u, v: p.v, down: true, t0: ctx.now() }; }
    return true;
  }
  function up(e) {
    if (!gd || e.pointerId !== gd.pid) return false;
    const d = gd; gd = null; if (cursor) cursor.down = false;
    if (!d.moved) { tapNode(d.id); return true; }
    const w = ctx.toWorld(d.x, d.y), n = nodeOf(G(), d.id); if (!n) return true;
    if (n.fixed) { toast(T('grid.anchorFixed')); return true; } if (n.deck) { toast(T('grid.deckFixed')); return true; }
    const r = gMoveNode(B(), d.id, w.u, w.v);
    if (r.ok && r.moved) { logEv('bygg', `knute ${d.id} flyttet til ${logPt(r.node)}`); buzz?.(8); audio?.bhop?.(); selNode = d.id; selRod = null; ctx.trayRender(); onChange?.(); }
    else if (!r.ok) { fail(r); buzz?.(12); }
    return true;
  }
  function release() { if (cursor) cursor.down = false; }
  function tapNode(id) {
    const n = nodeOf(G(), id); if (!n) return;
    if (!selNode || !nodeOf(G(), selNode)) { selNode = id; selRod = null; buzz?.(5); return; }
    if (selNode === id) { selNode = null; return; }
    const r = gAddRod(B(), selNode, id, mat);
    if (r.ok) { added(r); selNode = id; } else { fail(r); if (r.why === 'dup') selNode = id; }
  }
  function added(r) {
    logEv('bygg', `stav ${r.rod.id} ${r.rod.mat} lengde ${COMMA(r.len)} kost ${r.cost}${r.newNode ? ' (ny knute ' + logPt(r.node) + ')' : ''}`);
    buzz?.(10); audio?.bhop?.(); selRod = null; ctx.trayRender(); onChange?.();
  }
  // trykk på et sted uten knute (build.js kaller denne når fingeren slippes uten å ha panorert)
  function tapPoint(x, y) {
    const w = ctx.toWorld(x, y), sc = scale(), near = nearestPoint(site(), w.u, w.v, Math.max(0.62 * gridStep(site()), 28 / sc)), pxTo = (p) => Math.hypot(p.u - w.u, p.v - w.v) * sc;
    const rod = hitRod(G(), w.u, w.v, sc, 14);
    if (rod && (!near || pxTo(near) > 18)) { selRod = rod.id; selNode = null; buzz?.(5); return; }
    if (!near) { clearSel(); return; }
    const ex = nodeAt(G(), near.u, near.v);
    if (ex) { tapNode(ex.id); return; }
    if (selNode && nodeOf(G(), selNode)) {
      const r = gAddRodTo(B(), selNode, near.u, near.v, mat);
      if (r.ok) { added(r); selNode = r.node ? r.node.id : selNode; } else fail(r);
      return;
    }
    const r = gAddNode(B(), near.u, near.v);
    if (r.ok) { selNode = r.node.id; selRod = null; logEv('bygg', `knute ${r.node.id} ${logPt(r.node)}`); buzz?.(8); ctx.trayRender(); onChange?.(); } else fail(r);
  }
  function del() {
    if (selRod && rodOf(G(), selRod)) { const id = selRod; if (isDeckRod(rodOf(G(), id))) { toast(T('grid.deckFixed')); return false; } gRemoveRod(B(), id); selRod = null; logEv('bygg', `fjernet stav ${id}`); ctx.trayRender(); onChange?.(); return true; }
    if (selNode) { const n = nodeOf(G(), selNode); if (n?.fixed) { toast(T('grid.anchorFixed')); return false; } if (n?.deck) { toast(T('grid.deckFixed')); return false; } if (n && gRemoveNode(B(), selNode)) { logEv('bygg', `fjernet knute ${selNode}`); selNode = null; ctx.trayRender(); onChange?.(); return true; } }
    toast(T('grid.delNone')); return false;
  }

  // ---- tegning ----
  const posOf = (n) => {
    if (gd && gd.id === n.id && gd.moved) { const w = ctx.toWorld(gd.x, gd.y), p = canMoveTo(B(), n.id, w.u, w.v); return p ? { u: p.u, v: p.v, ok: true } : { u: w.u, v: w.v, ok: false }; }
    return { u: n.u, v: n.v, ok: true };
  };
  function draw(sx, tNow, g2) {
    const S = site(), Gd = G(), sc = scale();
    // rutenettpunkter (små prikker)
    g2.fillStyle = 'rgba(255,255,255,.28)'; g2.beginPath();
    if (dots) for (const p of latticePoints(S)) { const q = sx(p.u, p.v); g2.moveTo(q.x + 2.5, q.y); g2.arc(q.x, q.y, 2.5, 0, 7); }
    g2.fill();
    // staver
    const p2 = new Map(Gd.nodes.map((n) => [n.id, posOf(n)]));
    for (const r of Gd.rods) {
      const a = p2.get(r.a), b = p2.get(r.b); if (!a || !b) continue; const m = GRID_MAT[r.mat], pa = sx(a.u, a.v), pb = sx(b.u, b.v), w = Math.max(r.mat === 'rope' ? 3 : 5, m.h * sc), isSel = selRod === r.id;
      g2.lineCap = 'round';
      g2.strokeStyle = isSel ? '#ffffff' : '#1a1208'; g2.lineWidth = w + (isSel ? 6 : 4); g2.beginPath(); g2.moveTo(pa.x, pa.y); g2.lineTo(pb.x, pb.y); g2.stroke();
      g2.strokeStyle = m.color; g2.lineWidth = w; g2.beginPath(); g2.moveTo(pa.x, pa.y); g2.lineTo(pb.x, pb.y); g2.stroke();
      if (r.mat === 'steel') { g2.strokeStyle = 'rgba(255,255,255,.55)'; g2.lineWidth = Math.max(1.5, w * 0.25); g2.beginPath(); g2.moveTo(pa.x, pa.y - w * 0.18); g2.lineTo(pb.x, pb.y - w * 0.18); g2.stroke(); }
      if (r.mat === 'rope') { g2.setLineDash([4, 4]); g2.strokeStyle = '#6b4a1a'; g2.lineWidth = Math.max(1.5, w * 0.5); g2.beginPath(); g2.moveTo(pa.x, pa.y); g2.lineTo(pb.x, pb.y); g2.stroke(); g2.setLineDash([]); }
    }
    // knuter
    for (const n of Gd.nodes) {
      const p = p2.get(n.id), q = sx(p.u, p.v), isSel = selNode === n.id, rr = n.fixed ? 8 : 7;
      if (isSel) { g2.beginPath(); g2.arc(q.x, q.y, 13 + 2 * Math.sin(tNow * 6), 0, 7); g2.strokeStyle = '#ffd23f'; g2.lineWidth = 3; g2.stroke(); }
      g2.beginPath(); g2.arc(q.x, q.y, rr, 0, 7); g2.fillStyle = !p.ok ? '#ff6a5a' : n.fixed ? '#3df0b0' : n.deck ? '#cfd8ff' : '#ffffff'; g2.fill(); g2.strokeStyle = '#0b1020'; g2.lineWidth = 2; g2.stroke();
    }
    // mål for flytting: det punktet knuten lander på
    if (gd && gd.moved) { const n = nodeOf(Gd, gd.id), w = ctx.toWorld(gd.x, gd.y), p = n && canMoveTo(B(), gd.id, w.u, w.v); if (p) { const q = sx(p.u, p.v); g2.beginPath(); g2.arc(q.x, q.y, 11, 0, 7); g2.strokeStyle = '#3df0b0'; g2.lineWidth = 3; g2.stroke(); } }
    // opplysning om valgt stav
    if (selRod) { const r = rodOf(Gd, selRod); if (r) { const a = nodeOf(Gd, r.a), b = nodeOf(Gd, r.b), q = sx((a.u + b.u) / 2, (a.v + b.v) / 2); tag(g2, T('grid.rodInfo', { mat: T('grid.mat.' + r.mat), len: COMMA(rodLen(Gd, r)), cost: rodPrice(r.mat, rodLen(Gd, r)) }), q.x, q.y - 22); } }
    // koordinater ved berøring (hjørnet nede til venstre) og ved punktet
    if (cursor && (cursor.down || ctx.now() - cursor.t0 < 1.6)) {
      const q = sx(cursor.u, cursor.v), c = colRow(S, cursor); g2.beginPath(); g2.arc(q.x, q.y, 11, 0, 7); g2.strokeStyle = '#ffffffcc'; g2.lineWidth = 2; g2.stroke();
      let t = T('grid.coord', { c: c.c, r: c.r });
      if (selNode && nodeOf(Gd, selNode) && !nodeAt(Gd, cursor.u, cursor.v)) { const a = nodeOf(Gd, selNode), L = Math.hypot(a.u - cursor.u, a.v - cursor.v); t += ' · ' + T('grid.rodInfo', { mat: T('grid.mat.' + mat), len: COMMA(L), cost: rodPrice(mat, L) }); }
      tag(g2, t, 12 + 4, ctx.botY() - 18, 'left');
    }
  }
  function tag(g2, text, x, y, align = 'center') {
    g2.font = '800 12px system-ui'; g2.textAlign = align; const w = g2.measureText(text).width + 12, x0 = align === 'left' ? x - 6 : x - w / 2;
    g2.fillStyle = 'rgba(14,20,36,.88)'; g2.beginPath(); g2.roundRect ? g2.roundRect(x0, y - 13, w, 20, 7) : g2.rect(x0, y - 13, w, 20); g2.fill(); g2.fillStyle = '#ffe9a8'; g2.fillText(text, x, y + 2); g2.textAlign = 'start';
  }
  // teksten øverst: hjelp for nybegynner (R69) og ellers kort beskjed
  function hint() {
    if (!on()) return '';
    if (selRod) return T('grid.hint.rod');
    if (selNode) return T('grid.hint.sel', { mat: T('grid.mat.' + mat) });
    return ctx.getHint() ? T('grid.hint.start') : T('grid.hint.short');
  }
  function reset() { clearSel(); gd = null; cursor = null; }
  const cancel = () => { gd = null; };
  const select = (nodeId = null, rodId = null) => { selNode = nodeId; selRod = rodId; };   // R92: den forenklede byggeskjermen styrer markeringen selv
  const setDots = (v) => { dots = !!v; };
  const tap = (x, y) => { const n = pickNode(x, y); if (n) tapNode(n.id); else tapPoint(x, y); };   // samme veivalg som en ekte berøring (til tester)
  return {
    on, enabledHere, down, move, up, release, tapPoint, del, draw, hint, sync, setMat, toggleMode, restoreMode, modeTip, example, simSync, setSpeed, get speed() { return speed; }, reset, clearSel, cancel, select, setDots, get dots() { return dots; }, get moving() { return !!gd && gd.moved; },
    get mat() { return mat; }, get selNode() { return selNode; }, get selRod() { return selRod; },
    tapNode: (id) => tapNode(id), pickNode, tap,
  };
}
