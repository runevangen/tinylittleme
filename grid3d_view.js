// R130: 3D-laben, visning (DOM + 2D-lerret). Tegner det grid3d_ctl.js frame() gir og sender trykk/dra/klyp dit. Store knapper (minst 46 px), ingen taster.
//  - dra med én finger: roter. Klyp: zoom. To fingre: flytt. Trykk: velg/legg (BYGG) eller fjern (SLETT).
//  - hurtigvisninger FORAN, SIDE, TOPP, 3D; LAG ◀ ▶ med glidebryter; BYGG/SLETT; TRE/STÅL/TAU; ANGRE, NULLSTILL, SÅ SLIK, PRØV; under prøven PAUSE, SLOW og STOPP.
import { createLab3d, passedOf, MAT_COLOR } from './grid3d_ctl.js';
import { VIEW_IDS, camRotate, camZoom, camPan } from './grid3d_cam.js';
import { MAX_NODES } from './grid3d_logic.js';
import { starText } from './build_budget.js';
import { stressCss } from './grid_stress.js';
import { MISSIONS, mkey, MISSION_LEVEL, passedIds, missionOf } from './grid3d_missions.js';   // R131: oppdrag
import { stageLocked, stageNext, passRecord, passRead } from './grid_stage.js';

export const LAB3D_CSS = `
#lab3d{position:fixed;inset:0;z-index:7;display:none;flex-direction:column;background:linear-gradient(#263249,#141a2c);color:#fff;font:600 14px system-ui;touch-action:none;user-select:none;-webkit-user-select:none;padding:calc(max(8px,env(safe-area-inset-top)) + 40px) 8px max(8px,env(safe-area-inset-bottom)) 8px;gap:6px;box-sizing:border-box}
body.lab3d #lab3d{display:flex}
body.lab3d #panel{z-index:10}
#lab3d .top{display:flex;gap:6px;align-items:center}
#lab3d .top .ttl{flex:1 1 0;min-width:0;font:800 16px system-ui;line-height:1.15}
#lab3d .top .cost{font:800 13px system-ui;color:#ffe9a8;white-space:nowrap}
#lab3d .msg{min-height:36px;padding:6px 10px;border-radius:12px;background:#0b1020cc;border:2px solid #3a4a73;font:600 13px/1.25 system-ui;color:#dbe7ff;box-sizing:border-box}
#lab3d .msg.ok{border-color:#3df0b0;color:#e8fff6}#lab3d .msg.bad{border-color:#ff8a7a;color:#ffe3de}#lab3d .msg.tip{border-color:#ffd23f;color:#fff3c4}
#lab3d .main{flex:1 1 0;min-height:0;display:flex;flex-direction:column;gap:6px}
#lab3d canvas{position:static;inset:auto;z-index:auto;flex:1 1 0;min-height:120px;width:100%;border-radius:14px;background:#0b1224;touch-action:none;display:block}
#lab3d .ctl{display:flex;flex-direction:column;gap:6px;flex:0 0 auto;min-width:0}
#lab3d .row{flex-wrap:wrap}
#lab3d .row button{flex:1 1 56px}
#lab3d .row{display:flex;gap:6px;align-items:stretch}
#lab3d button{flex:1 1 0;min-width:0;min-height:46px;padding:0 4px;border-radius:12px;border:2px solid #6ab8ff;background:#121a2ce6;color:#cfe8ff;font:800 13px system-ui;pointer-events:auto}
#lab3d button.on{background:#1f7a52;border-color:#3df0b0;color:#fff}
#lab3d button.go{background:#1f7a52;border-color:#3df0b0;color:#fff;flex:1.6 1 0}
#lab3d button.hint{border-color:#ffd23f;color:#fff3c4}
#lab3d button[disabled]{opacity:.45}
#lab3d .lay{display:flex;gap:6px;align-items:center}
#lab3d .lay button{flex:0 0 52px}
#lab3d .lay .lt{flex:0 0 auto;min-width:92px;text-align:center;font:800 13px system-ui;color:#cfe8ff}
#lab3d .lay input{flex:1 1 0;min-width:0;height:46px;accent-color:#3df0b0}
#lab3d .mat button{border-color:#8a96b8}
#lab3d .lay.mis .mt{flex:1 1 0;min-width:0;text-align:center;font:800 13px/1.15 system-ui;color:#ffe9a8}
#lab3d .lay.mis button{border-color:#ffd23f}
@media (orientation:landscape) and (max-height:520px){
  #lab3d{padding-top:calc(max(6px,env(safe-area-inset-top)) + 4px);gap:4px}
  #lab3d .main{flex-direction:row}
  #lab3d .ctl{flex:0 0 46%;max-width:46%;overflow:auto;gap:4px}
  #lab3d .lay input{min-width:40px}
  #lab3d .lay .lt{min-width:60px;font-size:12px}
  #lab3d canvas{min-width:0}
  #lab3d button{min-height:40px}
  #lab3d .msg{min-height:30px;padding:4px 8px;font-size:12px}
}
`;
export const lab3dMarkup = () => `<div id="lab3d" role="dialog" aria-modal="true"><div class="top"><button data-l="back" style="flex:0 0 auto;padding:0 12px"></button><div class="ttl"></div><div class="cost"></div></div><div class="msg"></div><div class="main"><canvas></canvas><div class="ctl">
<div class="lay mis"><button data-l="mprev" aria-label="◀">◀</button><div class="mt"></div><button data-l="mnext" aria-label="▶">▶</button></div>
<div class="row views">${VIEW_IDS.map((v) => `<button data-l="view:${v}"></button>`).join('')}</div>
<div class="lay"><button data-l="lprev" aria-label="◀">◀</button><div class="lt"></div><input type="range" min="0" max="2" step="1" value="1" data-l="lslide" aria-label="LAG"><button data-l="lnext" aria-label="▶">▶</button></div>
<div class="row mat"><button data-l="tool:build"></button><button data-l="tool:erase"></button><button data-l="mat:wood"></button><button data-l="mat:steel"></button><button data-l="mat:rope"></button></div>
<div class="row act"><button data-l="undo"></button><button data-l="reset"></button><button data-l="guide" class="hint"></button><button data-l="try" class="go"></button></div>
<div class="row sim" style="display:none"><button data-l="pause"></button><button data-l="slow"></button><button data-l="stop"></button></div>
</div></div></div>`;

export function createLab3dView({ T, logEv = () => {}, toast, buzz, getSlow, getPick, onPass, onClose, onOpen, store = null, storeKey = 'tlm.lab3d', site, sites = null, getWind, getLock = () => true, doc = typeof document !== 'undefined' ? document : null } = {}) {
  const list = sites && sites.length ? sites : [site]; let cur = list[0];   // R131: oppdragene (ett sted = som i R130)
  const multi = list.length > 1, skey = () => (multi ? mkey(cur.id) : storeKey);
  let el = null, cv = null, g = null, ctl = null, raf = 0, dirty = true, last = 0, msg = { k: 'intro' }, closeCbs = [];
  const cache = new Map(), q = (k) => el?.querySelector(`[data-l="${k}"]`);
  const put = (node, key, val, f) => { if (!node) return; let m = cache.get(node); if (!m) cache.set(node, m = new Map()); if (m.get(key) !== val) { m.set(key, val); f(val); } };
  const text = (node, v) => put(node, 't', v, (x) => { node.textContent = x; });
  const isOpen = () => !!el && doc.body.classList.contains('lab3d');

  function mount() {
    if (el || !doc) return;
    const st = doc.createElement('style'); st.textContent = LAB3D_CSS; doc.head.appendChild(st);
    const w = doc.createElement('div'); w.innerHTML = lab3dMarkup(); el = w.firstElementChild || w.children?.[0] || w; doc.body.appendChild(el);
    cv = el.querySelector('canvas'); g = cv.getContext?.('2d');
    for (const ev of ['pointerdown', 'pointermove', 'pointerup', 'touchstart', 'touchmove', 'wheel']) el.addEventListener(ev, (e) => e.stopPropagation());
    el.addEventListener('click', onClick); const sl = q('lslide'); sl?.addEventListener('input', () => { const vals = layerVals(); const v = vals[+sl.value]; if (v != null && ctl.setLayer(v)) { dirty = true; sync(); } });
    gestures();
  }
  const layerVals = () => ctl.lattice().map((p) => p[ctl.axis()]).filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b);
  function fresh() {
    ctl = createLab3d({ site: cur, logEv, getSlow, getPick, getWind }); msg = { k: 'intro' };
    let code = null; try { code = store?.get(skey(), null)?.code; } catch { /* ingen lagring */ }
    if (code) { const r = ctl.load(code); if (r.ok) { msg = { k: 'restored' }; ctl.runAll(); ctl.back(); } }
    return ctl;
  }
  const introKey = () => cur.msgs?.intro || 'intro';
  const say = (k, p, tone) => { msg = { k, p: p || {}, tone: tone || '' }; };

  // ---------- gester ----------
  function gestures() {
    const ptrs = new Map(); let tapOk = false, t0 = 0, lastD = 0, lastM = null;
    const pt = (e) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height }; };
    cv.addEventListener('pointerdown', (e) => {
      const p = pt(e); ptrs.set(e.pointerId, { ...p, sx: p.x, sy: p.y }); try { cv.setPointerCapture(e.pointerId); } catch { /* ok */ }
      if (ptrs.size === 1) { tapOk = true; t0 = Date.now(); } else { tapOk = false; const [a, b] = [...ptrs.values()]; lastD = Math.hypot(a.x - b.x, a.y - b.y); lastM = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
    });
    cv.addEventListener('pointermove', (e) => {
      const o = ptrs.get(e.pointerId); if (!o) return; const p = pt(e);
      if (ptrs.size === 1) {
        if (tapOk && Math.hypot(p.x - o.sx, p.y - o.sy) > 9) tapOk = false;
        if (!tapOk) { ctl.rotate(p.x - o.x, p.y - o.y); dirty = true; }
        o.x = p.x; o.y = p.y;
      } else if (ptrs.size >= 2) {
        o.x = p.x; o.y = p.y; const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y), m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        if (lastD > 0) ctl.zoom(d / lastD); ctl.pan(m.x - lastM.x, m.y - lastM.y, p.w, p.h); lastD = d; lastM = m; dirty = true;
      }
    });
    const up = (e) => {
      const o = ptrs.get(e.pointerId); if (!o) return; ptrs.delete(e.pointerId);
      if (tapOk && ptrs.size === 0 && Date.now() - t0 < 700) doTap(o.x, o.y, o.w, o.h);
      tapOk = false; if (ptrs.size === 1) { const r = [...ptrs.values()][0]; r.sx = r.x; r.sy = r.y; }
    };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', (e) => { e.preventDefault?.(); ctl.zoom(e.deltaY < 0 ? 1.12 : 1 / 1.12); dirty = true; }, { passive: false });
  }
  function doTap(x, y, w, h) {
    const r = ctl.tap(x, y, w, h); dirty = true;
    switch (r.kind) {
      case 'sel': say('sel'); break; case 'unsel': say('build'); break;
      case 'node': say('node'); buzz?.(8); break; case 'nodefail': say('why.' + r.why, { max: MAX_NODES }, 'bad'); break;
      case 'rod': say('rod', { mat: T('grid.mat.' + ctl.mat).toLowerCase() }, 'ok'); buzz?.(10); break;
      case 'node+rod': say('rod', { mat: T('grid.mat.' + ctl.mat).toLowerCase() }, 'ok'); buzz?.(10); break;
      case 'rodfail': case 'node-rodfail': say('why.' + r.why, { max: ctl.maxLen() }, 'bad'); break;
      case 'erased-node': case 'erased-rod': say('erased', {}, 'ok'); buzz?.(10); break;
      case 'fixed': say('fixed', {}, 'bad'); break; default: break;
    }
    sync();
  }
  // kamera
  function wire() { ctl.rotate = (dx, dy) => camRotate(ctl.cam, dx, dy); ctl.zoom = (f) => camZoom(ctl.cam, f); ctl.pan = (dx, dy, w, h) => camPan(ctl.cam, dx, dy, w, h); }

  // ---------- knapper ----------
  function onClick(e) {
    const b = e.target.closest?.('button'), k = b?.dataset?.l; if (!k) return; e.stopPropagation(); act(k);
  }
  function act(k) {
    if (k === 'back') return close('knapp');
    if (k === 'mprev' || k === 'mnext') return step(k === 'mnext' ? 1 : -1);
    if (k.startsWith('view:')) { ctl.setView(k.slice(5)); say(ctl.guideOn ? 'build' : 'build'); }
    else if (k === 'lprev') ctl.stepLayer(-1); else if (k === 'lnext') ctl.stepLayer(1);
    else if (k.startsWith('tool:')) { ctl.setTool(k.slice(5)); say(k === 'tool:erase' ? 'eraseTip' : 'build'); }
    else if (k.startsWith('mat:')) { ctl.setMat(k.slice(4)); ctl.setTool('build'); }
    else if (k === 'undo') { if (ctl.undo()) say('undone'); }
    else if (k === 'reset') { if (ctl.reset()) { say('cleared'); hideWorld(); saveNow(); } }
    else if (k === 'guide') { const gd = ctl.guideGo(); say(gd && gd.done ? 'guideDone' : 'guide'); }
    else if (k === 'try') tryIt();
    else if (k === 'pause') ctl.togglePause(); else if (k === 'slow') ctl.toggleSlow();
    else if (k === 'stop') { ctl.back(); say('build'); }
    dirty = true; sync();
  }
  // R131: bytt oppdrag (◀ ▶). Låste oppdrag åpnes ved å bestå det forrige (grid_stage.js; ⚙ kan skru låsen av).
  const passed = () => passedIds(store, passRead);
  const lockedNow = (id) => multi && stageLocked(list, passed(), id, !!getLock());
  function pick(id) {
    const to = list.find((m) => m.id === id); if (!to || to === cur) return false;
    if (lockedNow(id)) { const pv = list[list.indexOf(to) - 1]; say('locked', { n: list.indexOf(to), name: T(pv.name) }, 'bad'); logEv('bygg3d', `oppdrag låst: ${id}`); return false; }
    if (ctl.state === 'run') ctl.back(); saveNow(); hideWorld(); cur = to; fresh(); wire(); try { store?.set('tlm.lab3d.cur', cur.id); } catch { /* ok */ }
    logEv('bygg3d', `oppdrag valgt: ${cur.id}`); say(introKey()); dirty = true; if (!raf && isOpen()) raf = requestAnimationFrame(loop); return true;
  }
  function step(d) { const i = list.indexOf(cur) + d; if (i < 0 || i >= list.length) return false; return pick(list[i].id); }
  function tryIt() {
    if (ctl.state === 'done') { ctl.back(); say('build'); return; }
    const r = ctl.start(); if (!r.ok) { say(r.why === 'empty' ? 'empty' : r.why === 'nogoal' ? (cur.msgs?.nogoal || 'build') : 'build', {}, 'bad'); return; }
    say('running'); if (!raf) loop();
  }
  function finished() {
    const l = ctl.last, st = ctl.status();
    if (l.passed) {
      const first = multi ? passRecord(store, MISSION_LEVEL, cur.id).first : false, nx = multi ? stageNext(list, cur.id) : null, p = { stars: starText(l.stars), cost: l.cost, budget: l.budget };
      if (multi) logEv('bygg3d', `oppdrag bestått: ${cur.id}, ${l.stars} stjerner, kostnad ${l.cost}/${l.budget}${first ? ' (første gang)' : ''}`);
      if (first && nx) say('wonNext', { ...p, next: T(nx.name) }, 'ok'); else say('won', p, 'ok');
      buzz?.(30); saveNow(); onPass?.(ctl, l);
    }
    else if (l.won && l.over) say('over', { cost: l.cost, budget: l.budget }, 'bad');
    else {
      const flat = (() => { const zs = new Set(ctl.B.rg.nodes.filter((n) => !n.fixed && !n.deck).map((n) => n.z)); return zs.size <= 1; })();
      const nm = l.top ? T('lab3d.rodNo', { id: l.top.id }) : '';
      const mm = cur.msgs || {}, own = l.breaks ? mm.brk : mm.fall;
      say(own || (l.breaks ? (flat ? 'brokeFlat' : 'broke') : (flat ? 'fellFlat' : 'fell')), { rod: nm }, 'bad');
    }
    void st;
  }
  function saveNow() { try { store?.set(skey(), { code: ctl.save(), stars: ctl.status().stars, passed: passedOf(ctl) }); } catch { /* ok */ } }
  let worldCtl = null; const hideWorld = () => worldCtl?.hide?.();
  const setWorld = (w) => { worldCtl = w; };

  // ---------- tekster og tilstand ----------
  const AX = { z: 'lab3d.ax.z', x: 'lab3d.ax.x', y: 'lab3d.ax.y' };
  function sync() {
    if (!el || !ctl) return; const st = ctl.status(), run = ctl.state === 'run', done = ctl.state === 'done', li = ctl.layerInfo();
    text(el.querySelector('.ttl'), multi ? T('lab3d.title') + ' · ' + T(cur.name) : T('lab3d.title'));
    { const row = el.querySelector('.lay.mis'); put(row, 'vis', multi, (x) => { row.style.display = x ? 'flex' : 'none'; }); if (multi) { const i = list.indexOf(cur); text(el.querySelector('.mt'), T('lab3d.mis.of', { i: i + 1, n: list.length, name: T(cur.name) })); for (const k of ['mprev', 'mnext']) { const b = q(k); put(b, 'dis', run, (x) => { if (b) b.disabled = x; }); } } }
    text(q('back'), T('lab3d.back'));
    text(el.querySelector('.cost'), T('lab3d.cost', { cost: st.cost, budget: st.budget ?? '–', stars: starText(st.stars) }));
    el.querySelector('.cost').style.color = st.over ? '#ff9a8a' : '#ffe9a8';
    for (const v of VIEW_IDS) { const b = q('view:' + v); text(b, T('lab3d.v.' + v)); put(b, 'on', ctl.cam.view === v, (x) => b.classList.toggle('on', x)); }
    text(el.querySelector('.lt'), T('lab3d.layer', { i: li.i, n: li.n, ax: T(AX[li.axis]), v: li.value }));
    const sl = q('lslide'); if (sl) { const vals = layerVals(); put(sl, 'max', vals.length - 1, (x) => { sl.max = String(x); }); put(sl, 'v', vals.findIndex((v) => Math.abs(v - li.value) < 1e-3), (x) => { sl.value = String(x); }); }
    for (const t of ['build', 'erase']) { const b = q('tool:' + t); text(b, T('lab3d.tool.' + t)); put(b, 'on', ctl.tool === t, (x) => b.classList.toggle('on', x)); }
    for (const m of ['wood', 'steel', 'rope']) { const b = q('mat:' + m); text(b, T('grid.mat.' + m)); put(b, 'on', ctl.mat === m && ctl.tool === 'build', (x) => b.classList.toggle('on', x)); if (b) b.style.borderColor = MAT_COLOR[m]; }
    text(q('undo'), T('build.undo')); text(q('reset'), T('build.reset')); text(q('guide'), T('lab3d.guide')); text(q('try'), done ? T('lab3d.again') : T('build.try'));
    for (const k of ['view:foran', 'view:side', 'view:topp', 'view:3d', 'lprev', 'lnext', 'tool:build', 'tool:erase', 'mat:wood', 'mat:steel', 'mat:rope', 'undo', 'reset', 'guide']) { const b = q(k); put(b, 'dis', run, (x) => { if (b) b.disabled = x; }); }
    const sim = el.querySelector('.row.sim'), act2 = el.querySelector('.row.act');
    put(sim, 'vis', run, (x) => { sim.style.display = x ? 'flex' : 'none'; }); put(act2, 'vis', !run, (x) => { act2.style.display = x ? 'flex' : 'none'; });
    text(q('pause'), ctl.paused ? T('lab3d.resume') : T('lab3d.pause')); text(q('slow'), T('lab3d.slow')); put(q('slow'), 'on', ctl.slow, (x) => q('slow').classList.toggle('on', x)); text(q('stop'), T('lab3d.stop'));
    const m = el.querySelector('.msg'); let k = msg.k, p = msg.p || {}, tone = msg.tone || '';
    if (k === 'intro' || (k === 'build' && !st.rods)) { k = ctl.tool === 'erase' ? 'eraseTip' : ctl.guideOn ? 'guide' : introKey(); }
    if (k === 'guide') { const gd = ctl.guideNext(); if (gd && gd.t) { text(m, T(gd.t) + ' ' + T('lab3d.gprog', ctl.guideProgress())); put(m, 'c', 'tip', (x) => { m.className = 'msg ' + x; }); return; } if (gd && gd.done) k = 'guideDone'; }
    text(m, T('lab3d.m.' + k, p)); put(m, 'c', tone, (x) => { m.className = 'msg ' + x; });
  }

  // ---------- tegning ----------
  function paint(dt) {
    if (!g || !ctl) return; const r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1), w = Math.max(80, Math.round(r.width)), h = Math.max(80, Math.round(r.height));
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    const f = ctl.frame(w, h); g.lineCap = 'round'; g.lineJoin = 'round';
    const poly = (pts, fill, stroke, lw = 1) => { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); } };
    if (f.ground) poly(f.ground, 'rgba(90,160,90,.16)', 'rgba(120,200,120,.35)');
    g.strokeStyle = 'rgba(160,180,220,.22)'; g.lineWidth = 1; for (const [a, b] of f.box) { g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); }
    poly(f.quad, 'rgba(90,170,255,.13)', 'rgba(110,190,255,.7)', 1.5);   // laget som et lyst plan
    g.fillStyle = 'rgba(190,225,255,.85)'; for (const d of f.dots) { g.beginPath(); g.arc(d.x, d.y, Math.max(2, d.s * 0.07), 0, 7); g.fill(); }
    for (const rd of f.rods) {
      g.globalAlpha = rd.inLayer || ctl.state !== 'build' ? 1 : 0.32; const lw = Math.max(2.5, Math.min(11, (rd.deck ? 0.42 : rd.mat === 'rope' ? 0.2 : rd.mat === 'steel' ? 0.3 : 0.38) * rd.s));
      g.beginPath(); g.moveTo(rd.a.x, rd.a.y); g.lineTo(rd.b.x, rd.b.y); g.strokeStyle = '#10151f'; g.lineWidth = lw + 3; g.stroke();
      g.beginPath(); g.moveTo(rd.a.x, rd.a.y); g.lineTo(rd.b.x, rd.b.y); g.strokeStyle = rd.color; g.lineWidth = lw; if (rd.rope) g.setLineDash([lw * 1.6, lw]); g.stroke(); g.setLineDash([]);
      if (rd.guide) { g.beginPath(); g.moveTo(rd.a.x, rd.a.y); g.lineTo(rd.b.x, rd.b.y); g.strokeStyle = '#ffd23f'; g.lineWidth = 3; g.setLineDash([8, 6]); g.stroke(); g.setLineDash([]); }
      if (rd.broken) { const mx = (rd.a.x + rd.b.x) / 2, my = (rd.a.y + rd.b.y) / 2; g.fillStyle = '#ff4b3a'; g.font = '800 16px system-ui'; g.textAlign = 'center'; g.fillText('✕', mx, my + 5); }
      g.globalAlpha = 1;
    }
    for (const n of f.nodes) {
      g.globalAlpha = n.inLayer || ctl.state !== 'build' ? 1 : 0.4; const rr = Math.max(4, Math.min(11, n.s * (n.fixed ? 0.3 : 0.24)));
      g.beginPath(); g.arc(n.x, n.y, rr, 0, 7); g.fillStyle = n.fixed ? '#ffb86a' : n.deck ? '#e9eef7' : '#ffffff'; g.fill(); g.lineWidth = 2; g.strokeStyle = n.sel ? '#3df0b0' : '#10151f'; g.stroke();
      if (n.sel || n.guide) { g.beginPath(); g.arc(n.x, n.y, rr + 5, 0, 7); g.strokeStyle = n.sel ? '#3df0b0' : '#ffd23f'; g.lineWidth = 3; g.stroke(); }
      g.globalAlpha = 1;
    }
    if (f.guideNode) { const pulse = 1 + 0.25 * Math.sin(performance.now() / 180); g.beginPath(); g.arc(f.guideNode.x, f.guideNode.y, 13 * pulse, 0, 7); g.strokeStyle = '#ffd23f'; g.lineWidth = 3; g.stroke(); if (!f.guideNode.inLayer) { g.fillStyle = '#ffd23f'; g.font = '700 11px system-ui'; g.textAlign = 'center'; g.fillText('↕ ' + T('lab3d.otherLayer'), f.guideNode.x, f.guideNode.y - 18); } }
    if (f.mass) {   // R131: lasten (vekt) på toppen eller hengt i tau, og målpunktet
      const ms = f.mass, sz = Math.max(14, ms.s * 0.9), cx = ms.x, cy = ms.up ? ms.y - sz * 0.55 : ms.y + sz * 0.2;
      g.globalAlpha = ms.placed ? 1 : 0.45;
      if (ms.rope) { g.beginPath(); g.moveTo(ms.rope[0].x, ms.rope[0].y); g.lineTo(ms.rope[1].x, ms.rope[1].y); g.strokeStyle = '#d8b46a'; g.lineWidth = 3; g.setLineDash([6, 4]); g.stroke(); g.setLineDash([]); }
      g.fillStyle = '#6b7488'; g.strokeStyle = '#10151f'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx - sz * 0.6, cy + sz * 0.5); g.lineTo(cx - sz * 0.38, cy - sz * 0.5); g.lineTo(cx + sz * 0.38, cy - sz * 0.5); g.lineTo(cx + sz * 0.6, cy + sz * 0.5); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#fff'; g.font = '800 ' + Math.max(10, Math.round(sz * 0.42)) + 'px system-ui'; g.textAlign = 'center'; g.fillText(String(ms.m), cx, cy + sz * 0.22); g.globalAlpha = 1;
    }
    if (f.goal) { const pulse = f.goal.placed ? 1 : 1 + 0.2 * Math.sin(performance.now() / 200), rr = 15 * pulse; g.beginPath(); g.arc(f.goal.x, f.goal.y, rr, 0, 7); g.strokeStyle = f.goal.placed ? '#3df0b0' : '#ffd23f'; g.lineWidth = 3; g.setLineDash(f.goal.placed ? [] : [6, 4]); g.stroke(); g.setLineDash([]); if (!f.goal.placed) { g.fillStyle = '#ffd23f'; g.font = '800 12px system-ui'; g.textAlign = 'center'; g.fillText(T('lab3d.goal') + (f.goal.inLayer ? '' : ' ↕'), f.goal.x, f.goal.y - rr - 4); } }
    if (f.load) { g.beginPath(); g.arc(f.load.x, f.load.y, Math.max(7, f.load.s * 0.4), 0, 7); g.fillStyle = '#ff5a5a'; g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); }
    if (ctl.state === 'done' || ctl.state === 'run') drawLegend(w, h);
    void dt;
  }
  function drawLegend(w, h) {
    const x = 8, y = h - 14, wd = Math.min(120, w * 0.4); const gr = g.createLinearGradient(x, 0, x + wd, 0); for (let i = 0; i <= 4; i++) gr.addColorStop(i / 4, stressCss(i / 4)); g.fillStyle = gr; g.fillRect(x, y, wd, 7);
    g.fillStyle = '#cfe8ff'; g.font = '700 10px system-ui'; g.textAlign = 'left'; g.fillText(T('lab3d.legendLo'), x, y - 3); g.textAlign = 'right'; g.fillText(T('lab3d.legendHi'), x + wd, y - 3);
  }
  function loop() {
    raf = 0; if (!isOpen()) return; const now = performance.now(), dt = last ? (now - last) / 1000 : 0; last = now;
    if (ctl.state === 'run') { if (ctl.advance(dt)) finished(); dirty = true; }
    if (dirty) { dirty = false; paint(dt); sync(); }
    if (ctl.state === 'run' || dirty) raf = requestAnimationFrame(loop);
  }
  const redraw = () => { dirty = true; if (!raf && isOpen()) raf = requestAnimationFrame(loop); };

  // ---------- åpne og lukke ----------
  function open(startId = null) {
    if (!doc) return false; mount();
    if (!ctl) {   // R131: sist valgte oppdrag (eller det som ble bedt om i lenken), hvis det er åpent
      if (multi) { let id = startId; if (!id) { try { id = store?.get('tlm.lab3d.cur', null); } catch { /* ok */ } } const m = list.find((q2) => q2.id === id); if (m && !lockedNow(m.id)) cur = m; }
      fresh(); wire();
    } else if (startId && startId !== cur.id) pick(startId);
    doc.body.classList.add('lab3d'); say(ctl.guideOn ? 'guide' : introKey()); last = 0; dirty = true; sync(); onOpen?.(ctl); logEv('bygg3d', 'laben åpnet'); redraw(); requestAnimationFrame?.(() => { paint(0); sync(); }); return true;
  }
  function close(from = '') { if (!isOpen()) return false; if (ctl.state === 'run') ctl.back(); doc.body.classList.remove('lab3d'); logEv('bygg3d', `laben lukket ${from}`); for (const f of closeCbs) f(); onClose?.(ctl); return true; }
  const onCloseCb = (f) => closeCbs.push(f);
  const api = { open, close, pick, step, get site() { return cur; }, sites: list, locked: lockedNow, isOpen, get active() { return isOpen(); }, get ctl() { return ctl; }, act, tap: (x, y) => { const r = cv.getBoundingClientRect(); doTap(x, y, r.width, r.height); }, redraw, sync, finished, setWorld, onCloseCb, tryIt, say, saveNow, paintNow: () => { paint(0); sync(); } };
  return api;
}
