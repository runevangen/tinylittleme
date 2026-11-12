// R24: byggeskjermen (DOM + three). Logikken ligger i build_logic.js. Verden fryses og dimmes; et sideriss (2D) tar over,
// og du styrer med direkte berøring: dra deler ut av brettet, de snapper, to fingre vrir/zoomer, store knapper nederst.
// Kobles inn fra main.js med createBuildMode(). R25: tape/ledd/tau-verktøy og PRØV (fysikk i build_phys.js, tegnet her).
import * as THREE from 'three';
import {
  PART_TYPES, partType, createBuild, inTray, addPart, place, rotate, remove, undo, reset, topHit, raise, corners, serialize, restore,
  addLink, removeLink, topLink, linkEnds, LINK_KINDS, twistRot, fitView, clampScale, toScreen, toWorld, canEnterBuild, nearestSite, initParts, partTypes, gotPartIds, stepParts, restoreParts, snapPoint, siteAnchors, ROT_STEP,
} from './build_logic.js';
import { ZOOM_STEP, gridForScale, anchorRadius, zoomAbout, zoomStep, freeCenter, isDoubleTap, dblTapView, zoomLabel } from './build_zoom.js';   // R44
import { createSim, DT, siteBoxes, siteGoal, siteStart, FIG_R, settledPlaced } from './build_phys.js';
import { applyBuilt, clearBuilt, liftOut, builtCount, fulcrum } from './build_world.js';   // R26: bygget flyttes ut i verdenen

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
#bld .zoom{position:absolute;right:8px;top:calc(max(8px,env(safe-area-inset-top)) + 96px);display:flex;gap:6px;pointer-events:none}
#bld .zoom button{flex:0 0 auto;width:56px;height:42px;padding:0;font:800 24px system-ui;line-height:1}
#bld.sim .zoom{opacity:.4}
#bld button.go{background:#2a7f62;border-color:#3df0b0;color:#fff}
#bld button.on{background:#7a4a14}
#bld button[disabled]{opacity:.4}
#bld .tray{position:absolute;left:0;right:0;bottom:calc(max(8px,env(safe-area-inset-bottom)) + 56px);height:70px;display:flex;gap:10px;align-items:center;padding:6px 10px;background:#0b1020aa;border-top:2px solid #ffa94066;border-bottom:2px solid #ffa94066;overflow-x:auto;touch-action:pan-x}
#bld .chip{flex:0 0 auto;height:54px;min-width:70px;border:2px solid #fff6;border-radius:10px;background:#1d2433;display:flex;align-items:center;justify-content:center;touch-action:none;position:relative}
#bld .chip i{display:block;border-radius:3px;border:2px solid #0006}
#bld .chip.used{opacity:.3}
#bld .hint{position:absolute;left:0;right:0;top:calc(max(8px,env(safe-area-inset-top)) + 58px);text-align:center;color:#ffd9a0;font:600 13px system-ui;pointer-events:none;padding:0 12px;text-shadow:0 1px 3px #000}
#bld .tools{position:absolute;left:0;right:0;bottom:calc(max(8px,env(safe-area-inset-bottom)) + 56px + 92px);display:flex;gap:6px;justify-content:center;padding:0 8px;pointer-events:none}
#bld .tools button{height:42px;flex:0 1 96px;font-size:13px}
#bld .tools button.on{background:#7a4a14;border-color:#fff}
#bld .tray>:first-child{margin-left:auto}#bld .tray>:last-child{margin-right:auto}   /* R26: midtstilt, men venstre kant kan rulles til når det er mange deler */
#bld.sim .tray,#bld.sim .tools{display:none}
#bld.sim button[data-a="undo"],#bld.sim button[data-a="reset"],#bld.sim button[data-a="rotl"],#bld.sim button[data-a="rotr"],#bld.sim button[data-a="snap"],#bld.sim button[data-a="del"]{opacity:.25;pointer-events:none}
#btnBuild{position:fixed;right:12px;top:calc(max(8px,env(safe-area-inset-top)) + 112px);z-index:4;height:50px;padding:0 22px;border-radius:25px;border:2px solid #3df0b0;background:#2a7f62dd;color:#fff;font:800 16px system-ui;display:none;touch-action:manipulation}
@media (orientation:landscape) and (max-height:520px){#bld .zoom{flex-direction:column;top:max(56px,calc(env(safe-area-inset-top) + 48px));gap:4px}#bld .zoom button{height:34px;width:48px;font-size:20px}#btnBuild{top:max(56px,calc(env(safe-area-inset-top) + 48px))}#bld .tray{height:54px;bottom:calc(max(8px,env(safe-area-inset-bottom)) + 48px)}#bld .tools{bottom:calc(max(8px,env(safe-area-inset-bottom)) + 48px + 76px)}#bld .tools button{height:34px}#bld .chip{height:40px}#bld button{height:40px}}
`;

export function createBuildMode({ scene, LEVEL, player, $, T, logEv, toast, isPlay, isMenu, isBoss, isWon, isOv, getSnap, setSnap, allParts, audio, buzz, onChange, TOUCH, getSlow = () => false, getStrength = () => 1, onSolved = () => {}, getWorld = () => true, getSeeHint = () => true, getDbl = () => true, getFine = () => true }) {
  initParts(LEVEL);
  const sites = LEVEL.buildSites, parts = LEVEL.buildParts;
  const enabled = sites.length > 0;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const types = partTypes(LEVEL);
  const B0 = (site) => createBuild(site, types, []);
  const builds = new Map();                  // stedets id -> byggetilstand
  const getB = (site) => { let b = builds.get(site.id); if (!b) { b = B0(site); builds.set(site.id, b); } return b; };
  const TOPPX = () => (innerHeight <= 520 ? 100 : 130), BOTPX = () => (innerHeight <= 520 ? 110 : 160);
  let active = null, view = null, sel = null, selLink = null, tool = null, linkFrom = null, drag = null, W = 0, H = 0, hint = '';
  let lastTap = null, zoomMsg = '', zoomMsgT = 0;   // R44: dobbelttrykk og zoom-melding
  let sim = null, simAcc = 0, simMarks = [], simDone = false, simT0 = 0, confetti = [];   // R25: PRØV
  const solved = new Set(); let seeShown = false;
  const committed = new Map();               // R26: stedets id -> bygget (som tekst) som står i verdenen akkurat nå
  const worldPlaced = new Map();             // stedets id -> delene slik de ligger etter at de har satt seg
  const worldMeshes = new Map();             // stedets id -> three-gruppe med de ferdige delene
  const sigOf = (B) => JSON.stringify(serialize(B).placed);
  function showWorld(site) {                 // tegn bygget i verdenen (nedbøyning er bare faket: delene står i designposen)
    hideWorld(site.id); const g = new THREE.Group(), hd = (site.d ?? 4);
    for (const p of worldPlaced.get(site.id) || []) {
      const t = partType(p.type), m = new THREE.Mesh(new THREE.BoxGeometry(t.w, t.h, hd), new THREE.MeshStandardMaterial({ color: t.color, roughness: 0.65, metalness: p.type === 'weight' ? 0.5 : 0 }));
      m.position.set(site.x + p.u, site.y + p.v, site.z); m.rotation.z = p.rot || 0; g.add(m);
      if (t.pivot) { const f = fulcrum(site, p); if (f) { const fm = new THREE.Mesh(new THREE.BoxGeometry(f.max[0] - f.min[0], f.max[1] - f.min[1], f.max[2] - f.min[2]), new THREE.MeshStandardMaterial({ color: f.color, roughness: 0.7 })); fm.position.set((f.min[0] + f.max[0]) / 2, (f.min[1] + f.max[1]) / 2, (f.min[2] + f.max[2]) / 2); g.add(fm); } }
    }
    scene.add(g); worldMeshes.set(site.id, g);
  }
  function hideWorld(id) { const g = worldMeshes.get(id); if (g) { scene.remove(g); g.traverse?.((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); }); worldMeshes.delete(id); } }
  function commitWorld(site, why) {          // R26: flytt bygget ut i verdenen som solid
    if (!getWorld() || !LEVEL.boxes) return 0; const B = getB(site);
    const wp = settledPlaced({ site, placed: B.placed.map((p) => ({ id: p.id, type: p.type, u: p.u, v: p.v, rot: p.rot })), links: B.links }, { strength: getStrength() }); worldPlaced.set(site.id, wp);   // delene der de ender opp (klosser har falt på plass)
    const n = applyBuilt(LEVEL, site, wp);
    committed.set(site.id, sigOf(B)); if (liftOut(LEVEL, player, site.id)) logEv('bygg', 'figuren løftet ut av bygget'); showWorld(site);
    logEv('bygg', `bygget står i verdenen (${why}): ${site.id}, ${B.placed.length} deler, ${n} flater`); return n;
  }
  function uncommitWorld(site, why) { if (!committed.has(site.id)) return; clearBuilt(LEVEL, site.id); hideWorld(site.id); committed.delete(site.id); worldPlaced.delete(site.id); logEv('bygg', `bygget fjernet fra verden (${why}): ${site.id}`); }
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
  <div class="hint"></div><div class="zoom"><button data-z="in" aria-label="+">+</button><button data-z="out" aria-label="−">−</button><button data-z="fit" aria-label="⤢">⤢</button></div><div class="tools"><button data-t="tape"></button><button data-t="hinge"></button><button data-t="rope"></button></div><div class="tray"></div><div class="bt bot"><button data-a="rotl">↺</button><button data-a="rotr">↻</button><button data-a="snap"></button><button data-a="del"></button></div>`;
  document.body.appendChild(root);
  const cv = root.querySelector('canvas'), g2 = cv.getContext('2d'), tray = root.querySelector('.tray'), hintEl = root.querySelector('.hint');
  const btn = (a) => root.querySelector(`[data-a="${a}"]`);
  const enterBtn = document.createElement('button'); enterBtn.id = 'btnBuild'; document.body.appendChild(enterBtn);
  const dpr = () => Math.min(2, window.devicePixelRatio || 1);
  function labels() {
    btn('back').textContent = T('build.back'); btn('undo').textContent = T('build.undo'); btn('reset').textContent = T('build.reset'); btn('try').textContent = T('build.try');
    btn('snap').textContent = T(getSnap() ? 'build.snapOn' : 'build.snapOff'); btn('snap').classList.toggle('on', getSnap()); btn('del').textContent = T('build.del');
    for (const k of LINK_KINDS) { const b = root.querySelector(`[data-t="${k}"]`); b.textContent = T('build.tool.' + k); b.classList.toggle('on', tool === k); }
    if (sim) btn('try').textContent = T('build.stop');
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

  // ---- R44: zoom ----
  const fitNow = () => fitView(active, W, H, 24, TOPPX(), BOTPX());
  const curGrid = () => gridForScale(view.scale, getFine());
  const syncSnap = (B) => { B.grid = curGrid(); B.snapR = anchorRadius(view.scale); };   // plassering er alltid et tall i enheter: samme verdi uansett zoom, bare rutenettets trinn følger zoomen
  const zoomTarget = () => { const B = getB(active), id = drag?.id || sel, p = id && (drag && drag.id === id ? drag.part : B.placed.find((z) => z.id === id)); return p ? { u: p.u, v: p.v } : null; };
  function setView(nv, why, x, y) {
    const old = view.scale; view = nv;
    if (drag) { const r = toWorld(view, W, H, drag.x, drag.y); drag.part.u = r.u + drag.ox; drag.part.v = r.v + drag.oy; }   // del i hånden følger fingeren mens det zoomes
    const f = zoomLabel(view, fitNow()), g = curGrid(); zoomMsg = T('build.zoomInfo', { z: f, g: String(g).replace('.', ',') }); zoomMsgT = tNow + 1.8;
    if (Math.abs(view.scale - old) > 1e-6) logEv('bygg', `zoom ${why} ${f}, rutenett ${g}`);
  }
  const zoomAct = {
    in: () => setView(zoomStep(view, W, H, +1, zoomTarget()), '+'),
    out: () => setView(zoomStep(view, W, H, -1, zoomTarget()), '−'),
    fit: () => setView(fitNow(), 'tilpass'),
  };
  root.querySelector('.zoom').addEventListener('pointerdown', (e) => {   // pointerdown (ikke click): virker også mens en annen finger holder en del
    const z = e.target.closest?.('button')?.dataset.z; if (!z || !active || sim) return; e.preventDefault(); e.stopPropagation(); zoomAct[z](); buzz?.(5);
  });

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
    const gs = curGrid();
    if (gs < 0.5 && getSnap()) {   // R44: finere rutenett ved høy zoom (én sti, ett strøk)
      g2.strokeStyle = 'rgba(255,255,255,.05)'; g2.beginPath();
      const u0 = Math.max(-S.w / 2, toWorld(view, W, H, 0, 0).u), u1 = Math.min(S.w / 2, toWorld(view, W, H, W, 0).u), vT = Math.min(S.h, toWorld(view, W, H, 0, 0).v), vB = Math.max(0, toWorld(view, W, H, 0, H).v);
      for (let u = Math.ceil(u0 / gs) * gs; u <= u1 + 1e-6; u += gs) { const p = sx(u, 0), q = sx(u, S.h); g2.moveTo(p.x, p.y); g2.lineTo(q.x, q.y); }
      for (let v = Math.ceil(vB / gs) * gs; v <= vT + 1e-6; v += gs) { const p = sx(-S.w / 2, v), q = sx(S.w / 2, v); g2.moveTo(p.x, p.y); g2.lineTo(q.x, q.y); }
      g2.stroke();
    }
    g2.strokeStyle = '#ffd23f'; g2.lineWidth = 2; g2.setLineDash([8, 6]); g2.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y); g2.setLineDash([]);
    // underlaget: stedets to sider (hyller/kanter) som klosser under v = 0
    g2.fillStyle = '#6b5d4a';
    for (const bx of siteBoxes(S)) { const p = sx(bx.x0, bx.y1), q = sx(bx.x1, bx.y0); g2.fillRect(Math.min(p.x, q.x), Math.min(p.y, q.y), Math.abs(q.x - p.x), Math.abs(q.y - p.y)); }
    const gl = siteGoal(S), gp = sx(gl.u, gl.v); g2.fillStyle = '#ffd23f'; g2.fillRect(gp.x - 1.5, gp.y - 38, 3, 38); g2.beginPath(); g2.moveTo(gp.x + 1.5, gp.y - 38); g2.lineTo(gp.x + 22, gp.y - 31); g2.lineTo(gp.x + 1.5, gp.y - 24); g2.fill();   // målflagg
    // festepunkter
    for (const an of siteAnchors(S)) { const p = sx(an.u, an.v); g2.beginPath(); g2.arc(p.x, p.y, 7, 0, 7); g2.fillStyle = '#3df0b0'; g2.fill(); g2.strokeStyle = '#0b1020'; g2.lineWidth = 2; g2.stroke(); }
    if (sim) { drawSim(S, sx); return; }
    // deler
    const all = B.placed.filter((p) => !(drag && drag.id === p.id)).concat(drag && drag.part ? [drag.part] : []);
    for (const p of all) {
      const t = partType(p.type), pts = corners(p).map((c) => sx(c.u, c.v));
      g2.beginPath(); pts.forEach((q, i) => (i ? g2.lineTo(q.x, q.y) : g2.moveTo(q.x, q.y))); g2.closePath();
      g2.globalAlpha = p === (drag && drag.part) ? 0.8 : 1; g2.fillStyle = t.color; g2.fill(); g2.lineWidth = sel === p.id || linkFrom === p.id ? 4 : 2; g2.strokeStyle = sel === p.id || linkFrom === p.id ? '#fff' : '#2a1d10'; g2.stroke(); g2.globalAlpha = 1;
      if (t.pivot) drawPivot(p, sx);
      if (p.anchored) { const c = sx(p.u, p.v); g2.beginPath(); g2.arc(c.x, c.y, 4, 0, 7); g2.fillStyle = '#3df0b0'; g2.fill(); }
    }
    drawLinks(B, sx);
    // snapforhåndsvisning
    if (drag && drag.part && getSnap()) { const s = snapPoint(S, drag.part.u, drag.part.v, { snap: true, grid: curGrid(), snapR: anchorRadius(view.scale) }), p = sx(s.u, s.v); g2.beginPath(); g2.arc(p.x, p.y, s.anchored ? 12 : 4, 0, 7); g2.strokeStyle = s.anchored ? '#3df0b0' : '#ffffff99'; g2.lineWidth = 2; g2.stroke(); }
    // dra-til-brettet-sone
    if (drag && drag.part) { const r = tray.getBoundingClientRect(); if (drag.y > r.top) { g2.fillStyle = 'rgba(255,80,80,.18)'; g2.fillRect(0, r.top, W, r.height); } }
    const left = inTray(B).length;
    hintEl.textContent = (zoomMsg && tNow < zoomMsgT ? zoomMsg : '') || hint || (linkFrom ? T('build.hint.link2') : tool ? T('build.hint.link1') : B.placed.length ? T('build.hintPlaced') : left ? T('build.hintEmpty') : B.have.length ? T('build.allUsed') : '');
    btn('del').disabled = !sel && !selLink; btn('rotl').disabled = btn('rotr').disabled = !sel; btn('undo').disabled = !B.history.length; btn('reset').disabled = !B.placed.length;
  }

  const LINK_COL = { tape: '#f3e36b', hinge: '#ffffff', rope: '#c79a5a' };
  function drawPivot(c, sx) {            // R30: støtta under dreiepunktet til en vippe (trekant) og selve dreiepunktet
    const q = sx(c.u, c.v), h = Math.max(14, view.scale * 1.6), w = Math.max(9, view.scale * 0.7);
    g2.beginPath(); g2.moveTo(q.x, q.y); g2.lineTo(q.x - w, q.y + h); g2.lineTo(q.x + w, q.y + h); g2.closePath(); g2.fillStyle = '#2d6f67'; g2.fill(); g2.lineWidth = 2; g2.strokeStyle = '#0d2f2b'; g2.stroke();
    g2.beginPath(); g2.arc(q.x, q.y, 5, 0, 7); g2.fillStyle = '#fff'; g2.fill(); g2.strokeStyle = '#0d2f2b'; g2.stroke();
  }
  function drawLinks(B, sx) {
    for (const l of B.links) {
      const e = linkEnds(B, l); if (!e) continue; const a = sx(e[0].u, e[0].v), b = sx(e[1].u, e[1].v), isSel = selLink === l.id;
      g2.lineCap = 'round'; g2.strokeStyle = isSel ? '#fff' : '#1a1208'; g2.lineWidth = (l.kind === 'tape' ? 9 : l.kind === 'rope' ? 6 : 3) + (isSel ? 4 : 2);
      if (l.kind !== 'hinge') { g2.beginPath(); g2.moveTo(a.x, a.y); if (l.kind === 'rope') g2.quadraticCurveTo((a.x + b.x) / 2, (a.y + b.y) / 2 + 10, b.x, b.y); else g2.lineTo(b.x, b.y); g2.stroke(); }
      g2.strokeStyle = LINK_COL[l.kind]; g2.lineWidth = l.kind === 'tape' ? 6 : l.kind === 'rope' ? 3 : 2;
      if (l.kind === 'tape') g2.setLineDash([5, 4]);
      if (l.kind !== 'hinge') { g2.beginPath(); g2.moveTo(a.x, a.y); if (l.kind === 'rope') g2.quadraticCurveTo((a.x + b.x) / 2, (a.y + b.y) / 2 + 10, b.x, b.y); else g2.lineTo(b.x, b.y); g2.stroke(); }
      g2.setLineDash([]);
      for (const q of l.kind === 'hinge' ? [a] : [a, b]) { g2.beginPath(); g2.arc(q.x, q.y, l.kind === 'hinge' ? 7 : 4, 0, 7); g2.fillStyle = l.kind === 'hinge' ? '#444' : LINK_COL[l.kind]; g2.fill(); g2.strokeStyle = l.kind === 'hinge' ? '#fff' : '#1a1208'; g2.lineWidth = 2; g2.stroke(); }
      if (!l.b && l.kind !== 'rope') { g2.fillStyle = '#6b5d4a'; g2.fillRect(b.x - 8, b.y + 2, 16, 4); }
    }
  }
  const mixCol = (hex, k) => { const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; return `rgb(${Math.round(r + (230 - r) * k)},${Math.round(g * (1 - k * 0.8))},${Math.round(b * (1 - k * 0.8))})`; };
  function drawSim(S, sx) {
    const pose = sim.pose(), sc = view.scale;
    for (const p of pose.parts) {
      const t = partType(p.type);
      if (t.pivot) { const m = p.pts[(p.pts.length - 1) / 2]; drawPivot({ u: m.u, v: m.v }, sx); }
      if (p.kind === 'chain') {
        for (const seg of p.segs) {
          if (!seg.length) continue; const pts = seg.map((q) => sx(q.u, q.v));
          for (const [w, col] of [[t.h * sc + 4, '#2a1d10'], [t.h * sc, mixCol(t.color, Math.min(1, Math.max(0, (p.stress - 0.35) / 0.65)))]]) {
            g2.lineCap = 'round'; g2.lineJoin = 'round'; g2.lineWidth = w; g2.strokeStyle = col; g2.beginPath(); pts.forEach((q, i) => (i ? g2.lineTo(q.x, q.y) : g2.moveTo(q.x, q.y))); if (pts.length === 1) g2.lineTo(pts[0].x + 0.1, pts[0].y); g2.stroke();
          }
        }
      } else {
        const pts = corners(p).map((c) => sx(c.u, c.v)); g2.beginPath(); pts.forEach((q, i) => (i ? g2.lineTo(q.x, q.y) : g2.moveTo(q.x, q.y))); g2.closePath(); g2.fillStyle = t.color; g2.fill(); g2.lineWidth = 2; g2.strokeStyle = '#2a1d10'; g2.stroke();
        if (p.type === 'weight') { const c = sx(p.u, p.v); g2.fillStyle = '#fff'; g2.font = `700 ${Math.max(9, sc * 0.5)}px system-ui`; g2.textAlign = 'center'; g2.fillText('kg', c.x, c.y + sc * 0.18); }
      }
    }
    for (const l of pose.links) {
      if (l.broken) continue; const a = sx(l.a.u, l.a.v), b = sx(l.b.u, l.b.v);
      g2.lineCap = 'round'; g2.strokeStyle = l.stress > 0.6 ? '#ff6a5a' : LINK_COL[l.kind]; g2.lineWidth = l.kind === 'tape' ? 5 : l.kind === 'rope' ? 3 : 2;
      if (l.kind !== 'hinge') { g2.beginPath(); g2.moveTo(a.x, a.y); g2.lineTo(b.x, b.y); g2.stroke(); }
      g2.beginPath(); g2.arc(a.x, a.y, l.kind === 'hinge' ? 6 : 3.5, 0, 7); g2.fillStyle = l.kind === 'hinge' ? '#444' : LINK_COL[l.kind]; g2.fill(); g2.strokeStyle = '#fff'; g2.lineWidth = 1.5; g2.stroke();
    }
    // testfiguren: en rund fyr som ser fremover
    const f = pose.figure, c = sx(f.u, f.v), r = f.r * sc;
    g2.beginPath(); g2.arc(c.x, c.y, r, 0, 7); g2.fillStyle = '#ffd23f'; g2.fill(); g2.lineWidth = 2.5; g2.strokeStyle = '#3b2b00'; g2.stroke();
    g2.fillStyle = '#3b2b00'; for (const ex of [0.25, 0.62]) { g2.beginPath(); g2.arc(c.x + (ex - 0.1) * r, c.y - r * 0.2, Math.max(1.5, r * 0.12), 0, 7); g2.fill(); }
    // brudd: rødt kryss der noe røk
    for (const m of simMarks) { const q = sx(m.u, m.v), k = 9 + 3 * Math.sin(tNow * 8); g2.strokeStyle = '#ff3b30'; g2.lineWidth = 4; g2.lineCap = 'round'; g2.beginPath(); g2.moveTo(q.x - k, q.y - k); g2.lineTo(q.x + k, q.y + k); g2.moveTo(q.x + k, q.y - k); g2.lineTo(q.x - k, q.y + k); g2.stroke(); }
    for (const q of confetti) { const p = sx(q.u, q.v); g2.fillStyle = q.c; g2.fillRect(p.x, p.y, 5, 8); }
    const st = sim.state;
    hintEl.textContent = !simDone ? T('build.hintRun') : st.state === 'won' ? T('build.won') : (simMarks.length ? T('build.lostBreak') : st.reason === 'fell' ? T('build.lostFell') : T('build.lostStuck'));
    btn('try').textContent = T('build.stop'); btn('del').disabled = true; btn('rotl').disabled = btn('rotr').disabled = true; btn('undo').disabled = btn('reset').disabled = true;
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
    if (sim) { ptrs.delete(e.pointerId); return; }
    const cur = { t: e.timeStamp || performance.now(), x, y };
    if (getDbl() && !tool && !drag && isDoubleTap(lastTap, cur)) { lastTap = null; ptrs.delete(e.pointerId); setView(dblTapView(view, fitNow(), W, H, x, y), 'dobbelttrykk'); return; }   // R44
    if (tool) { ptrs.delete(e.pointerId); linkTap(B, hit, w); return; }
    const lk = !hit && topLink(B, w.u, w.v);
    if (lk) { selLink = lk.id; sel = null; ptrs.delete(e.pointerId); return; }
    selLink = null;
    if (hit) { const before = hit.rot; startDrag(e, hit.id, false); drag.before = { u: hit.u, v: hit.v, rot: before }; }
    else { sel = null; gest = { kind: 'pan', x, y, cu: view.cu, cv: view.cv, t: cur.t, moved: false }; try { cv.setPointerCapture(e.pointerId); } catch { /* ok */ } }
  });
  function linkTap(B, hit, w) {
    if (!linkFrom) { if (hit) { linkFrom = hit.id; sel = null; selLink = null; buzz?.(6); } return; }
    if (hit && hit.id === linkFrom) { linkFrom = null; return; }
    const r = addLink(B, tool, linkFrom, hit ? hit.id : null, { u: w.u, v: w.v });
    if (r.ok) { logEv('bygg', `${tool} ${linkFrom} ${hit ? hit.id : 'underlag'}`); audio?.bhop?.(); buzz?.(10); selLink = r.link.id; onChange?.(); }
    else toast(T(r.why === 'dup' ? 'build.link.dup' : 'build.link.far'));
    linkFrom = null;
  }
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
      const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;   // R44: klyp zoomer mot midten mellom fingrene, og følger fingrene sideveis
      const nv = zoomAbout({ scale: gest.sc, cu: gest.cu, cv: gest.cv, oy: view.oy }, W, H, gest.mx, gest.my, gest.sc * d / gest.d);
      view.scale = nv.scale; view.cu = nv.cu - (mx - gest.mx) / nv.scale; view.cv = nv.cv + (my - gest.my) / nv.scale;
      const part = sel && B.placed.find((z) => z.id === sel);
      if (part && gest.rot != null) { const da = a - gest.a; if (Math.abs(da) > 0.12 || gest.twisted) { if (!gest.twisted) { gest.twisted = true; gest.hist = true; } part.rot = twistRot(gest.rot, gest.a, a); } }
      return;
    }
    if (drag && e.pointerId === drag.pid) {
      const r = loc(e), w = toWorld(view, W, H, r.x, r.y); drag.x = r.x; drag.y = r.y; drag.part.u = w.u + drag.ox; drag.part.v = w.v + drag.oy;
    } else if (gest?.kind === 'pan' && ptrs.has(e.pointerId) && ptrs.size === 1) {
      const r = loc(e); if (Math.hypot(r.x - gest.x, r.y - gest.y) > 8) gest.moved = true; view.cu = gest.cu - (r.x - gest.x) / view.scale; view.cv = gest.cv + (r.y - gest.y) / view.scale;
    }
  });
  function up(e) {
    if (!active) return; ptrs.delete(e.pointerId); syncSnap(getB(active));
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
        if (ex && !moved && getDbl()) lastTap = { t: e.timeStamp || performance.now(), x: drag.x, y: drag.y };   // R44: trykk på en del teller som første trykk i et dobbelttrykk
        if (moved) { const p = place(B, drag.id, drag.part.u, drag.part.v, drag.part.rot); logEv('bygg', `${drag.fromTray ? 'plasser' : 'flytt'} ${drag.id} (${p.type}) ${p.anchored ? 'festet' : 'rutenett'}`); buzz?.(8); if (drag.fromTray && partType(p.type).pivot && getSeeHint() && !seeShown) { seeShown = true; toast(T('build.seesawHint')); } onChange?.(); }
      }
      drag = null; trayRender();
    }
    if (ptrs.size === 0 && gest?.kind === 'pan') { if (!gest.moved && getDbl()) lastTap = { t: e.timeStamp || performance.now(), x: gest.x, y: gest.y }; gest = null; }
  }
  addEventListener('pointerup', up); addEventListener('pointercancel', up);
  cv.addEventListener('wheel', (e) => { if (!active) return; e.preventDefault(); const r = loc(e); view = zoomAbout(view, W, H, r.x, r.y, view.scale * (e.deltaY < 0 ? 1.12 : 1 / 1.12)); }, { passive: false });

  // ---- knapper ----
  const act = {
    back: () => { if (sim) stopSim('tilbake'); else close('tilbake'); },
    undo: () => { const B = getB(active); if (undo(B)) { logEv('bygg', 'angre'); sel = null; trayRender(); onChange?.(); } },
    reset: () => { const B = getB(active); if (reset(B)) { logEv('bygg', 'nullstill'); sel = null; trayRender(); onChange?.(); } },
    try: () => (sim ? stopSim('stopp') : startSim()),
    rotl: () => rot(ROT_STEP), rotr: () => rot(-ROT_STEP),   // R30: ↺ dreier mot klokka (positiv vinkel i sideriss med v oppover), ↻ med klokka
    snap: () => { setSnap(!getSnap()); const B = getB(active); B.snap = getSnap(); labels(); logEv('bygg', `snapping ${getSnap() ? 'på' : 'av'}`); },
    del: () => { const B = getB(active); if (selLink && removeLink(B, selLink)) { logEv('bygg', `fjernet ${selLink}`); selLink = null; onChange?.(); } else if (sel && remove(B, sel)) { logEv('bygg', `tilbake i brettet ${sel}`); sel = null; trayRender(); onChange?.(); } },
  };
  function rot(d) { const B = getB(active); if (sel && rotate(B, sel, d)) { logEv('bygg', `roter ${sel}`); onChange?.(); } }
  root.addEventListener('click', (e) => { const t = e.target.closest?.('button')?.dataset.t; if (t) { tool = tool === t ? null : t; linkFrom = null; labels(); return; } const a = e.target.closest?.('button')?.dataset.a; if (a && act[a]) act[a](); });
  enterBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); open(); });
  addEventListener('keydown', (e) => {
    if (active) {
      if (e.code === 'Escape' || e.code === 'KeyB') { e.preventDefault(); close('tast'); }
      else if (e.code === 'Equal' || e.code === 'NumpadAdd') zoomAct.in(); else if (e.code === 'Minus' || e.code === 'NumpadSubtract') zoomAct.out(); else if (e.code === 'Digit0' || e.code === 'Numpad0') zoomAct.fit(); else if (e.code === 'KeyZ') act.undo(); else if (e.code === 'KeyQ') rot(-ROT_STEP); else if (e.code === 'KeyR' || e.code === 'KeyE') rot(ROT_STEP); else if (e.code === 'Delete' || e.code === 'Backspace') act.del();
      e.stopImmediatePropagation(); return;
    }
    if (e.code === 'KeyB' && !e.repeat && !e.ctrlKey && !e.metaKey) open();
  }, true);

  // ---- PRØV (R25) ----
  function startSim() {
    const B = getB(active); if (!B.placed.length) { toast(T('build.tryEmpty')); return false; }
    sim = createSim({ site: active, placed: B.placed.map((p) => ({ id: p.id, type: p.type, u: p.u, v: p.v, rot: p.rot })), links: B.links }, { strength: getStrength() });
    simAcc = 0; simMarks = []; simDone = false; simT0 = tNow; confetti = []; sel = null; selLink = null; linkFrom = null; drag = null; gest = null; ptrs.clear();
    root.classList.add('sim'); labels(); logEv('bygg', `prøv ${active.id}: ${B.placed.length} deler, ${B.links.length} koblinger`); return true;
  }
  function stopSim(why) {
    if (!sim) return; logEv('bygg', `stopp prøve (${why}) etter ${sim.t.toFixed(1)} s`); sim = null; simMarks = []; simDone = false; confetti = []; root.classList.remove('sim'); labels(); trayRender();
  }
  function stepSim(dt) {
    if (!sim || simDone) return; simAcc += dt * (getSlow() ? 0.35 : 1);
    for (let n = 0; simAcc >= DT && n < 6 && !simDone; n++) {
      simAcc -= DT; sim.step();
      for (const e of sim.drain()) {
        if (e.type === 'break') { simMarks.push({ u: e.u, v: e.v }); logEv('bygg', `brakk ${e.id} ved ${e.t.toFixed(1)} s`); audio?.bbreak?.(); buzz?.(25); }
        else if (e.type === 'linkbreak') { simMarks.push({ u: e.u, v: e.v }); logEv('bygg', `${e.kind} røk ${e.id} ved ${e.t.toFixed(1)} s`); audio?.bbreak?.(); buzz?.(25); }
        else if (e.type === 'creak') audio?.bcreak?.(e.stress);
        else if (e.type === 'hop') audio?.bhop?.();
        else if (e.type === 'splash') audio?.bsplash?.();
        else if (e.type === 'win') { audio?.win?.(); buzz?.([30, 40, 30]); solved.add(active.id); commitWorld(active, 'prøve klarte det'); onSolved(active.id); for (let i = 0; i < 46; i++) confetti.push({ u: e.u + (i % 9 - 4) * 0.3, v: e.v + 1 + (i % 5) * 0.2, vx: ((i * 37) % 13 - 6) * 0.4, vy: 5 + (i * 17) % 7, c: ['#ffd23f', '#3df0b0', '#ff6a5a', '#6ab8ff'][i % 4] }); }
      }
      if (sim.state.state !== 'run') { simDone = true; logEv('bygg', `prøve ${sim.state.state === 'won' ? 'klarte det' : 'feilet: ' + sim.state.reason} etter ${sim.t.toFixed(1)} s${simMarks.length ? `, ${simMarks.length} brudd` : ''}`); toast(T(sim.state.state === 'won' ? 'build.won' : simMarks.length ? 'build.lostBreak' : sim.state.reason === 'fell' ? 'build.lostFell' : 'build.lostStuck')); onChange?.(); }
    }
    for (const q of confetti) { q.u += q.vx * dt; q.v += q.vy * dt; q.vy -= 14 * dt; }
    confetti = confetti.filter((q) => q.v > -8);
  }

  // ---- inn og ut ----
  let near = null;
  function open() {
    if (!enabled || active) return false;
    const s = near || nearestSite(sites, player);
    if (!s || !canEnterBuild({ play: isPlay(), won: isWon(), menu: isMenu(), boss: isBoss(), ov: isOv(), onGround: player.onGround || player.state === 'ground' })) return false;
    active = s; const B = getB(s); B.snap = getSnap();
    for (const q of parts) if (q.got) addPart(B, q.id);
    if (allParts()) for (const q of parts) addPart(B, q.id);
    sim = null; simDone = false; root.classList.remove('sim'); tool = null; linkFrom = null; selLink = null;
    sel = null; drag = null; gest = null; ptrs.clear(); lastTap = null; zoomMsg = ''; size(); view = fitView(s, W, H, 24, TOPPX(), BOTPX()); hint = '';
    document.body.classList.add('building'); labels(); trayRender();
    logEv('bygg', `inn ${s.id}: ${B.have.length} deler, ${B.placed.length} plassert`);
    return true;
  }
  function close(why) {
    if (!active) return; const B = getB(active);
    logEv('bygg', `ut (${why}): ${B.placed.length}/${B.have.length} plassert`);
    if (committed.has(active.id) && committed.get(active.id) !== sigOf(B)) { uncommitWorld(active, 'endret uten ny prøve'); solved.delete(active.id); }   // R26: et endret bygg må prøves på nytt før det står i verden
    sim = null; root.classList.remove('sim'); tool = null; linkFrom = null;
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
    if (active) { stepSim(dt); draw(); }
  }

  return {
    get active() { return !!active; }, enabled, update, open, close, labels,
    save: () => (enabled ? { got: gotPartIds(LEVEL), solved: [...solved], sites: Object.fromEntries([...builds].map(([k, b]) => [k, serialize(b)])) } : undefined),
    load(data) {
      if (!enabled || !data) return; restoreParts(LEVEL, data.got); solved.clear(); for (const id of Array.isArray(data.solved) ? data.solved : []) solved.add(id);
      for (const s of sites) { const d = data.sites?.[s.id]; if (!d) continue; const b = getB(s); restore(b, { have: d.have, placed: d.placed, links: d.links }); for (const id of data.got || []) addPart(b, id); }
      for (const s of sites) if (solved.has(s.id) && getB(s).placed.length) commitWorld(s, 'fortsett');   // R26: bygget gjenopprettes i verdenen
    },
    resetAll() { for (const s of sites) uncommitWorld(s, 'start på nytt'); for (const q of parts) q.got = false; builds.clear(); solved.clear(); sim = null; },
    screenPos: (u, v) => (active && view ? toScreen(view, W, H, u, v) : null),   // til tester på mobil (Playwright)
    isSolved: (id) => solved.has(id), inWorld: (id) => committed.has(id), worldCount: (id) => builtCount(LEVEL, id), get running() { return !!sim && !simDone; }, get result() { return sim ? { state: sim.state.state, reason: sim.state.reason, t: sim.t, marks: simMarks.length } : null; },
    startTry: () => !!active && startSim(), stopTry: () => stopSim('kode'),
    state: () => ({ active: active?.id || null, builds: [...builds].map(([k, b]) => ({ id: k, have: b.have.length, placed: b.placed.length })) }),
  };
}
