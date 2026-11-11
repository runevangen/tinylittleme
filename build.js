// R24: byggeskjermen (DOM + three). Logikken ligger i build_logic.js. Verden fryses og dimmes; et sideriss (2D) tar over,
// og du styrer med direkte berøring: dra deler ut av brettet, de snapper, to fingre vrir/zoomer, store knapper nederst.
// Kobles inn fra main.js med createBuildMode(). Ingen fysikk ennå (PRØV kommer i R25).
import * as THREE from 'three';
import {
  PART_TYPES, partType, createBuild, inTray, addPart, place, rotate, remove, undo, reset, topHit, raise, corners, serialize, restore,
  twistRot, fitView, clampScale, toScreen, toWorld, canEnterBuild, nearestSite, initParts, partTypes, gotPartIds, stepParts, restoreParts, snapPoint, siteAnchors, ROT_STEP,
} from './build_logic.js';

const css = `
#bld{position:fixed;inset:0;z-index:7;display:none;background:linear-gradient(#26324bfa,#141a2cff);touch-action:none;user-select:none;-webkit-user-select:none;color:#fff;font:600 14px system-ui}
body.building #bld{display:block}
body.building #panel{z-index:10}
#bld canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:none}
#bld .bt{position:absolute;left:0;right:0;display:flex;flex-wrap:nowrap;gap:6px;justify-content:center;padding:0 8px;pointer-events:none}
#bld .bt.top{top:max(8px,env(safe-area-inset-top))}
#bld .bt.bot{bottom:max(8px,env(safe-area-inset-bottom))}
#bld button{pointer-events:auto;flex:1 1 0;min-width:0;height:48px;padding:0 4px;border-radius:14px;border:2px solid #ffa940;background:#121a2ce6;color:#ffd9a0;font:700 14px system-ui;white-space:nowrap;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
#bld button:active{background:#2a3350}
#bld button.go{background:#2a7f62;border-color:#3df0b0;color:#fff}
#bld button.on{background:#7a4a14}
#bld button[disabled]{opacity:.4}
#bld .tray{position:absolute;left:0;right:0;bottom:calc(max(8px,env(safe-area-inset-bottom)) + 56px);height:70px;display:flex;gap:10px;align-items:center;justify-content:center;padding:6px 10px;background:#0b1020aa;border-top:2px solid #ffa94066;border-bottom:2px solid #ffa94066;overflow-x:auto;touch-action:pan-x}
#bld .chip{flex:0 0 auto;height:54px;min-width:70px;border:2px solid #fff6;border-radius:10px;background:#1d2433;display:flex;align-items:center;justify-content:center;touch-action:none;position:relative}
#bld .chip i{display:block;border-radius:3px;border:2px solid #0006}
#bld .chip.used{opacity:.3}
#bld .hint{position:absolute;left:0;right:0;top:calc(max(8px,env(safe-area-inset-top)) + 58px);text-align:center;color:#ffd9a0;font:600 13px system-ui;pointer-events:none;padding:0 12px;text-shadow:0 1px 3px #000}
#btnBuild{position:fixed;left:50%;transform:translateX(-50%);top:calc(max(8px,env(safe-area-inset-top)) + 64px);z-index:4;height:50px;padding:0 22px;border-radius:25px;border:2px solid #3df0b0;background:#2a7f62dd;color:#fff;font:800 16px system-ui;display:none;touch-action:manipulation}
@media (orientation:landscape) and (max-height:520px){#btnBuild{top:max(56px,calc(env(safe-area-inset-top) + 48px))}#bld .tray{height:54px;bottom:calc(max(8px,env(safe-area-inset-bottom)) + 48px)}#bld .chip{height:40px}#bld button{height:40px}}
`;

export function createBuildMode({ scene, LEVEL, player, $, T, logEv, toast, isPlay, isMenu, isBoss, isWon, isOv, getSnap, setSnap, allParts, audio, buzz, onChange, TOUCH }) {
  initParts(LEVEL);
  const sites = LEVEL.buildSites, parts = LEVEL.buildParts;
  const enabled = sites.length > 0;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const types = partTypes(LEVEL);
  const B0 = (site) => createBuild(site, types, []);
  const builds = new Map();                  // stedets id -> byggetilstand
  const getB = (site) => { let b = builds.get(site.id); if (!b) { b = B0(site); builds.set(site.id, b); } return b; };
  const TOPPX = () => (innerHeight <= 520 ? 100 : 130), BOTPX = () => (innerHeight <= 520 ? 110 : 160);
  let active = null, view = null, sel = null, drag = null, W = 0, H = 0, hint = '';
  const ptrs = new Map(); let gest = null;

  // ---- verden: deler som ligger og lyser, og byggestedet som en gylden ramme ----
  const partMeshes = parts.map((q) => {
    const t = partType(q.type), g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.BoxGeometry(t.w * 0.6, Math.max(0.35, t.h * 0.9), 0.9), new THREE.MeshStandardMaterial({ color: t.color, roughness: 0.6, emissive: t.color, emissiveIntensity: 0.18 }));
    g.add(m); g.position.set(q.x, q.y, q.z); scene.add(g); return { q, g };
  });
  const siteMeshes = sites.map((s) => {
    const g = new THREE.Group(), mat = new THREE.LineBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.85 });
    const box = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(s.w, s.h, 1.2)), mat); box.position.y = s.h / 2; g.add(box);
    g.position.set(s.x, s.y, s.z); scene.add(g); return { s, g, mat };
  });

  // ---- DOM ----
  const root = document.createElement('div'); root.id = 'bld';
  root.innerHTML = `<canvas></canvas><div class="bt top"><button data-a="back"></button><button data-a="undo"></button><button data-a="reset"></button><button data-a="try" class="go"></button></div>
  <div class="hint"></div><div class="tray"></div><div class="bt bot"><button data-a="rotl">↺</button><button data-a="rotr">↻</button><button data-a="fit">⤢</button><button data-a="snap"></button><button data-a="del"></button></div>`;
  document.body.appendChild(root);
  const cv = root.querySelector('canvas'), g2 = cv.getContext('2d'), tray = root.querySelector('.tray'), hintEl = root.querySelector('.hint');
  const btn = (a) => root.querySelector(`[data-a="${a}"]`);
  const enterBtn = document.createElement('button'); enterBtn.id = 'btnBuild'; document.body.appendChild(enterBtn);
  const dpr = () => Math.min(2, window.devicePixelRatio || 1);
  function labels() {
    btn('back').textContent = T('build.back'); btn('undo').textContent = T('build.undo'); btn('reset').textContent = T('build.reset'); btn('try').textContent = T('build.try');
    btn('snap').textContent = T(getSnap() ? 'build.snapOn' : 'build.snapOff'); btn('snap').classList.toggle('on', getSnap()); btn('del').textContent = T('build.del');
    enterBtn.textContent = TOUCH ? T('build.enter') : T('build.enterKey');
  }
  function size() { W = innerWidth; H = innerHeight; const d = dpr(); if (cv.width !== Math.round(W * d)) { cv.width = Math.round(W * d); cv.height = Math.round(H * d); } }

  function trayRender() {
    const B = active && getB(active); tray.innerHTML = '';
    if (!B) return;
    const have = B.have;
    if (!have.length) { const e = document.createElement('div'); e.textContent = T('build.noParts'); e.style.cssText = 'color:#ffd9a0;font-size:13px;padding:0 8px;text-align:center'; tray.appendChild(e); return; }
    for (const id of have) {
      const t = partType(B.types[id]), used = B.placed.some((p) => p.id === id);
      const c = document.createElement('div'); c.className = 'chip' + (used ? ' used' : ''); c.dataset.id = id; c.title = T('build.p.' + B.types[id]);
      const i = document.createElement('i'); const k = 6; i.style.cssText = `width:${Math.min(66, t.w * k)}px;height:${Math.max(8, t.h * k)}px;background:${t.color}`; c.appendChild(i);
      c.addEventListener('pointerdown', (e) => { if (!used) startDrag(e, id, true); else { toast(T('build.usedHint')); } });
      tray.appendChild(c);
    }
  }

  // ---- tegning ----
  function draw() {
    if (!active) return; size(); const d = dpr(), B = getB(active), S = active;
    g2.setTransform(d, 0, 0, d, 0, 0); g2.clearRect(0, 0, W, H);
    const sx = (u, v) => toScreen(view, W, H, u, v);
    // rutenett
    g2.lineWidth = 1; g2.strokeStyle = 'rgba(255,255,255,.07)';
    const a = sx(-S.w / 2, S.h), b = sx(S.w / 2, 0);
    for (let u = -S.w / 2; u <= S.w / 2 + 1e-6; u += 1) { const p = sx(u, 0), q = sx(u, S.h); g2.beginPath(); g2.moveTo(p.x, p.y); g2.lineTo(q.x, q.y); g2.stroke(); }
    for (let v = 0; v <= S.h + 1e-6; v += 1) { const p = sx(-S.w / 2, v), q = sx(S.w / 2, v); g2.beginPath(); g2.moveTo(p.x, p.y); g2.lineTo(q.x, q.y); g2.stroke(); }
    g2.strokeStyle = '#ffd23f'; g2.lineWidth = 2; g2.setLineDash([8, 6]); g2.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y); g2.setLineDash([]);
    // underlaget: stedets to sider (hyller/kanter) som klosser under v = 0
    g2.fillStyle = '#6b5d4a';
    const hw = S.w / 2, deck = (S.deck || [{ u0: -hw - 6, u1: -hw }, { u0: hw, u1: hw + 6 }]);
    for (const dk of deck) { const p = sx(dk.u0, 0), q = sx(dk.u1, -5); g2.fillRect(Math.min(p.x, q.x), p.y, Math.abs(q.x - p.x), Math.abs(q.y - p.y)); }
    // festepunkter
    for (const an of siteAnchors(S)) { const p = sx(an.u, an.v); g2.beginPath(); g2.arc(p.x, p.y, 7, 0, 7); g2.fillStyle = '#3df0b0'; g2.fill(); g2.strokeStyle = '#0b1020'; g2.lineWidth = 2; g2.stroke(); }
    // deler
    const all = B.placed.filter((p) => !(drag && drag.id === p.id)).concat(drag && drag.part ? [drag.part] : []);
    for (const p of all) {
      const t = partType(p.type), pts = corners(p).map((c) => sx(c.u, c.v));
      g2.beginPath(); pts.forEach((q, i) => (i ? g2.lineTo(q.x, q.y) : g2.moveTo(q.x, q.y))); g2.closePath();
      g2.globalAlpha = p === (drag && drag.part) ? 0.8 : 1; g2.fillStyle = t.color; g2.fill(); g2.lineWidth = sel === p.id ? 4 : 2; g2.strokeStyle = sel === p.id ? '#fff' : '#2a1d10'; g2.stroke(); g2.globalAlpha = 1;
      if (p.anchored) { const c = sx(p.u, p.v); g2.beginPath(); g2.arc(c.x, c.y, 4, 0, 7); g2.fillStyle = '#3df0b0'; g2.fill(); }
    }
    // snapforhåndsvisning
    if (drag && drag.part && getSnap()) { const s = snapPoint(S, drag.part.u, drag.part.v, { snap: true }), p = sx(s.u, s.v); g2.beginPath(); g2.arc(p.x, p.y, s.anchored ? 12 : 4, 0, 7); g2.strokeStyle = s.anchored ? '#3df0b0' : '#ffffff99'; g2.lineWidth = 2; g2.stroke(); }
    // dra-til-brettet-sone
    if (drag && drag.part) { const r = tray.getBoundingClientRect(); if (drag.y > r.top) { g2.fillStyle = 'rgba(255,80,80,.18)'; g2.fillRect(0, r.top, W, r.height); } }
    const left = inTray(B).length;
    hintEl.textContent = hint || (B.placed.length ? T('build.hintPlaced') : left ? T('build.hintEmpty') : B.have.length ? T('build.allUsed') : '');
    btn('del').disabled = !sel; btn('rotl').disabled = btn('rotr').disabled = !sel; btn('undo').disabled = !B.history.length; btn('reset').disabled = !B.placed.length;
  }

  // ---- dra og trykk ----
  const loc = (e) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  function startDrag(e, id, fromTray) {
    e.preventDefault(); e.stopPropagation(); const B = getB(active); const { x, y } = loc(e);
    const w = toWorld(view, W, H, x, y), ex = B.placed.find((p) => p.id === id);
    drag = { id, fromTray, pid: e.pointerId, x, y, part: { id, type: B.types[id], u: w.u, v: w.v, rot: ex?.rot || 0 }, ox: ex ? ex.u - w.u : 0, oy: ex ? ex.v - w.v : 0 };
    sel = id; if (ex) { raise(B, id); }
    try { root.setPointerCapture(e.pointerId); } catch { /* ok */ }
  }
  cv.addEventListener('pointerdown', (e) => {
    if (!active) return; e.preventDefault(); const { x, y } = loc(e), B = getB(active); ptrs.set(e.pointerId, { x, y });
    if (ptrs.size === 2) { drag = drag && drag.fromTray ? drag : null; startGesture(); return; }
    const w = toWorld(view, W, H, x, y), hit = topHit(B, w.u, w.v);
    if (hit) { const before = hit.rot; startDrag(e, hit.id, false); drag.before = { u: hit.u, v: hit.v, rot: before }; }
    else { sel = null; gest = { kind: 'pan', x, y, cu: view.cu, cv: view.cv }; try { cv.setPointerCapture(e.pointerId); } catch { /* ok */ } }
  });
  function startGesture() {
    const [p, q] = [...ptrs.values()], B = getB(active);
    gest = { kind: 'two', d: Math.hypot(q.x - p.x, q.y - p.y) || 1, a: Math.atan2(q.y - p.y, q.x - p.x), sc: view.scale, mx: (p.x + q.x) / 2, my: (p.y + q.y) / 2, cu: view.cu, cv: view.cv, rot: sel ? B.placed.find((z) => z.id === sel)?.rot : null, twisted: false };
    if (gest.rot != null) { /* vri: hent historikk bare én gang når vrien faktisk starter */ }
  }
  addEventListener('pointermove', (e) => {
    if (!active) return;
    if (ptrs.has(e.pointerId)) { const r = loc(e); ptrs.set(e.pointerId, r); }
    if (ptrs.size >= 2 && gest?.kind === 'two') {
      const [p, q] = [...ptrs.values()], B = getB(active), d = Math.hypot(q.x - p.x, q.y - p.y) || 1, a = Math.atan2(q.y - p.y, q.x - p.x);
      view.scale = clampScale(gest.sc * d / gest.d);
      const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2; view.cu = gest.cu - (mx - gest.mx) / view.scale; view.cv = gest.cv + (my - gest.my) / view.scale;
      const part = sel && B.placed.find((z) => z.id === sel);
      if (part && gest.rot != null) { const da = a - gest.a; if (Math.abs(da) > 0.12 || gest.twisted) { if (!gest.twisted) { gest.twisted = true; gest.hist = true; } part.rot = twistRot(gest.rot, gest.a, a); } }
      return;
    }
    if (drag && e.pointerId === drag.pid) {
      const r = loc(e), w = toWorld(view, W, H, r.x, r.y); drag.x = r.x; drag.y = r.y; drag.part.u = w.u + drag.ox; drag.part.v = w.v + drag.oy;
    } else if (gest?.kind === 'pan' && ptrs.has(e.pointerId) && ptrs.size === 1) {
      const r = loc(e); view.cu = gest.cu - (r.x - gest.x) / view.scale; view.cv = gest.cv + (r.y - gest.y) / view.scale;
    }
  });
  function up(e) {
    if (!active) return; ptrs.delete(e.pointerId);
    if (gest?.kind === 'two' && ptrs.size < 2) {
      if (gest.twisted) { const B = getB(active), p = B.placed.find((z) => z.id === sel); if (p) { const r = p.rot; p.rot = gest.rot; place(B, p.id, p.u, p.v, r); logEv('bygg', `vri ${p.id}`); onChange?.(); } }
      gest = null;
    }
    if (drag && e.pointerId === drag.pid) {
      const B = getB(active), tr = tray.getBoundingClientRect(), over = drag.y > tr.top - root.getBoundingClientRect().top;
      const ex = B.placed.find((p) => p.id === drag.id);
      if (over) { if (ex) { remove(B, drag.id); logEv('bygg', `tilbake i brettet ${drag.id}`); onChange?.(); } sel = null; }
      else {
        const moved = ex ? Math.hypot(drag.part.u - drag.before.u, drag.part.v - drag.before.v) > 0.05 : true;
        if (moved) { const p = place(B, drag.id, drag.part.u, drag.part.v, drag.part.rot); logEv('bygg', `${drag.fromTray ? 'plasser' : 'flytt'} ${drag.id} ${p.anchored ? 'festet' : 'rutenett'}`); buzz?.(8); onChange?.(); }
      }
      drag = null; trayRender();
    }
    if (ptrs.size === 0 && gest?.kind === 'pan') gest = null;
  }
  addEventListener('pointerup', up); addEventListener('pointercancel', up);
  cv.addEventListener('wheel', (e) => { if (!active) return; e.preventDefault(); view.scale = clampScale(view.scale * (e.deltaY < 0 ? 1.12 : 1 / 1.12)); }, { passive: false });

  // ---- knapper ----
  const act = {
    back: () => close('tilbake'),
    undo: () => { const B = getB(active); if (undo(B)) { logEv('bygg', 'angre'); sel = null; trayRender(); onChange?.(); } },
    reset: () => { const B = getB(active); if (reset(B)) { logEv('bygg', 'nullstill'); sel = null; trayRender(); onChange?.(); } },
    try: () => { logEv('bygg', 'prøv (ikke klart ennå)'); toast(T('build.tryLater')); },
    rotl: () => rot(-ROT_STEP), rotr: () => rot(ROT_STEP),
    fit: () => { view = fitView(active, W, H, 24, TOPPX(), BOTPX()); },
    snap: () => { setSnap(!getSnap()); const B = getB(active); B.snap = getSnap(); labels(); logEv('bygg', `snapping ${getSnap() ? 'på' : 'av'}`); },
    del: () => { const B = getB(active); if (sel && remove(B, sel)) { logEv('bygg', `tilbake i brettet ${sel}`); sel = null; trayRender(); onChange?.(); } },
  };
  function rot(d) { const B = getB(active); if (sel && rotate(B, sel, d)) { logEv('bygg', `roter ${sel}`); onChange?.(); } }
  root.addEventListener('click', (e) => { const a = e.target.closest?.('button')?.dataset.a; if (a && act[a]) act[a](); });
  enterBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); open(); });
  addEventListener('keydown', (e) => {
    if (active) {
      if (e.code === 'Escape' || e.code === 'KeyB') { e.preventDefault(); close('tast'); }
      else if (e.code === 'KeyZ') act.undo(); else if (e.code === 'KeyQ') rot(-ROT_STEP); else if (e.code === 'KeyR' || e.code === 'KeyE') rot(ROT_STEP); else if (e.code === 'Delete' || e.code === 'Backspace') act.del();
      e.stopImmediatePropagation(); return;
    }
    if (e.code === 'KeyB' && !e.repeat && !e.ctrlKey && !e.metaKey) open();
  }, true);

  // ---- inn og ut ----
  let near = null;
  function open() {
    if (!enabled || active) return false;
    const s = near || nearestSite(sites, player);
    if (!s || !canEnterBuild({ play: isPlay(), won: isWon(), menu: isMenu(), boss: isBoss(), ov: isOv(), onGround: player.onGround || player.state === 'ground' })) return false;
    active = s; const B = getB(s); B.snap = getSnap();
    for (const q of parts) if (q.got) addPart(B, q.id);
    if (allParts()) for (const q of parts) addPart(B, q.id);
    sel = null; drag = null; gest = null; ptrs.clear(); size(); view = fitView(s, W, H, 24, TOPPX(), BOTPX()); hint = '';
    document.body.classList.add('building'); labels(); trayRender();
    logEv('bygg', `inn ${s.id}: ${B.have.length} deler, ${B.placed.length} plassert`);
    return true;
  }
  function close(why) {
    if (!active) return; const B = getB(active);
    logEv('bygg', `ut (${why}): ${B.placed.length}/${B.have.length} plassert`);
    active = null; drag = null; gest = null; ptrs.clear(); document.body.classList.remove('building'); onChange?.();
  }

  // ---- hver ramme ----
  let tNow = 0;
  function update(dt, playing) {
    tNow += dt;
    near = enabled && playing && !active ? nearestSite(sites, player) : null;
    const show = !!near && canEnterBuild({ play: isPlay(), won: isWon(), menu: isMenu(), boss: isBoss(), ov: isOv(), onGround: player.onGround || player.state === 'ground' });
    enterBtn.style.display = show ? 'block' : 'none';
    if (show && enterBtn.dataset.l !== T('build.enter')) labels();
    for (const { q, g } of partMeshes) { g.visible = !q.got; if (!q.got) { g.position.y = q.y + Math.sin(q.phase * 2) * 0.12; g.rotation.y = q.phase * 0.8; } }
    for (const { s, mat } of siteMeshes) mat.opacity = 0.5 + 0.35 * Math.sin(tNow * 2 + s.x);
    if (playing && !active) for (const ev of stepParts(LEVEL, player, dt, true)) {
      logEv('bygg', `plukket ${ev.id} ${ev.n}/${ev.total}`); audio?.crumb?.(ev.n, ev.total); buzz?.(15);
      toast(T('build.got', { name: T('build.p.' + ev.kind), n: ev.n, total: ev.total })); for (const b of builds.values()) addPart(b, ev.id); onChange?.();
    }
    if (active) draw();
  }

  return {
    get active() { return !!active; }, enabled, update, open, close, labels,
    save: () => (enabled ? { got: gotPartIds(LEVEL), sites: Object.fromEntries([...builds].map(([k, b]) => [k, serialize(b)])) } : undefined),
    load(data) {
      if (!enabled || !data) return; restoreParts(LEVEL, data.got);
      for (const s of sites) { const d = data.sites?.[s.id]; if (!d) continue; const b = getB(s); restore(b, { have: d.have, placed: d.placed }); for (const id of data.got || []) addPart(b, id); }
    },
    resetAll() { for (const q of parts) q.got = false; builds.clear(); },
    state: () => ({ active: active?.id || null, builds: [...builds].map(([k, b]) => ({ id: k, have: b.have.length, placed: b.placed.length })) }),
  };
}
