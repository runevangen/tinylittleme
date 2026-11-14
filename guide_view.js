// R64: visning for veiledningen (guide_logic.js): kantmerke i skjermkanten (trykkbart = «Vis meg»), dempet ring på målet gjennom hindre, ring ved avhoppskanten og glød rundt neste flate på ruta.
// Lett: tre enkle mesh-er med MeshBasicMaterial (samme shader som gulvpila), ett DOM-element. Ingenting tegnes når veiledningen ikke trengs.
import * as THREE from 'three';

const CSS = `#guideEdge{position:fixed;left:0;top:0;z-index:4;display:none;transform:translate(-50%,-50%);pointer-events:auto;touch-action:manipulation;-webkit-tap-highlight-color:transparent;font:800 11px/1 system-ui;color:#fff;text-align:center;user-select:none}
#guideEdge .ge-a{width:42px;height:42px;margin:0 auto;filter:drop-shadow(0 1px 3px #000a)}
#guideEdge .ge-a svg{width:42px;height:42px}
#guideEdge .ge-t{margin-top:-2px;padding:3px 7px;border-radius:9px;background:#121a2ce6;border:1px solid #ffd23f;color:#ffd23f;white-space:nowrap}
body.ovview #guideEdge{display:none!important}`;
const ARROW = '<svg viewBox="-12 -12 24 24"><path d="M0 -10 L8 8 L0 3.5 L-8 8 Z" fill="#ffa940" stroke="#10151f" stroke-width="2.6" stroke-linejoin="round"/><path d="M0 -10 L8 8 L0 3.5 L-8 8 Z" fill="#ffa940" stroke="#fff" stroke-width="1.1" stroke-linejoin="round"/></svg>';

const ringMat = (color, opacity) => { const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthTest: false, depthWrite: false, side: THREE.DoubleSide }); m.userData.noDetail = true; return m; };

export function createGuideView({ scene, T, onShow, logEv }) {
  if (!document.getElementById('guidecss')) { const s = document.createElement('style'); s.id = 'guidecss'; s.textContent = CSS; document.head.appendChild(s); }
  const edge = document.createElement('div'); edge.id = 'guideEdge';
  edge.innerHTML = `<div class="ge-a">${ARROW}</div><div class="ge-t"></div>`;
  document.body.appendChild(edge);
  const eArr = edge.querySelector('.ge-a'), eTxt = edge.querySelector('.ge-t');
  edge.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); onShow?.(); });

  const ringGeo = new THREE.RingGeometry(0.42, 0.62, 28);
  const mk = (color, op) => { const m = new THREE.Mesh(ringGeo, ringMat(color, op)); m.rotation.x = -Math.PI / 2; m.renderOrder = 30; m.visible = false; scene.add(m); return m; };
  const ghost = mk(0xffd23f, 0.5), ledge = mk(0x6ee7ff, 0.7);

  // glød rundt en flate: ramme av fire striper (8 trekanter), oppdateres når flata byttes
  const frame = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, side: THREE.DoubleSide }));
  frame.material.userData.noDetail = true; frame.renderOrder = 9; frame.visible = false; scene.add(frame);
  let frameId = null;
  function setFrame(w) {
    const id = w ? `${w.id}|${w.x0}|${w.z0}|${w.top}` : null;
    if (id === frameId) return; frameId = id;
    if (!w) { frame.visible = false; return; }
    const t = Math.min(0.45, Math.max(0.22, Math.min(w.x1 - w.x0, w.z1 - w.z0) * 0.08)), y = w.top + 0.04;
    const ox0 = w.x0, ox1 = w.x1, oz0 = w.z0, oz1 = w.z1, ix0 = ox0 + t, ix1 = ox1 - t, iz0 = oz0 + t, iz1 = oz1 - t;
    const P = [[ox0, oz0], [ox1, oz0], [ox1, oz1], [ox0, oz1], [ix0, iz0], [ix1, iz0], [ix1, iz1], [ix0, iz1]];
    const pos = new Float32Array(P.length * 3); P.forEach(([x, z], i) => { pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z; });
    frame.geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    frame.geometry.setIndex([0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7]);
    frame.geometry.computeBoundingSphere(); frame.visible = true;
  }

  let edgeOn = false, lastEdgeTxt = '', logged = {};
  return {
    edge, ghost, ledge, frame,
    // s: { ghost: {x,y,z}|null, ledge: {x,y,z}|null, mark: {x,y,rot}|null, markText: string, route: flate|null, routeOn: bool }
    update(s, now) {
      const pulse = 0.5 + 0.5 * Math.sin(now / 260);
      if (s.ghost) { ghost.visible = true; ghost.position.set(s.ghost.x, s.ghost.y + 0.05, s.ghost.z); const k = 1 + 0.12 * pulse; ghost.scale.set(k, k, 1); ghost.material.opacity = 0.35 + 0.2 * pulse; } else ghost.visible = false;
      if (s.ledge) { ledge.visible = true; ledge.position.set(s.ledge.x, s.ledge.y + 0.06, s.ledge.z); const k = 1.1 + 0.2 * pulse; ledge.scale.set(k, k, 1); } else ledge.visible = false;
      if (s.routeOn && s.route) { setFrame(s.route); frame.visible = true; frame.material.opacity = 0.25 + 0.4 * pulse; } else { frame.visible = false; if (!s.route) setFrame(null); }
      if (s.mark) {
        if (!edgeOn) { edgeOn = true; edge.style.display = 'block'; }
        edge.style.left = `${s.mark.x.toFixed(0)}px`; edge.style.top = `${s.mark.y.toFixed(0)}px`; eArr.style.transform = `rotate(${s.mark.rot}rad)`;
        if (s.markText !== lastEdgeTxt) { lastEdgeTxt = s.markText; eTxt.textContent = s.markText; eTxt.style.display = s.markText ? '' : 'none'; }
      } else if (edgeOn) { edgeOn = false; edge.style.display = 'none'; }
    },
    once(k, detail) { if (!logged[k]) { logged[k] = 1; logEv?.('veiledning', detail); } },
    resetLog() { logged = {}; },
    state: () => ({ ghost: ghost.visible, ledge: ledge.visible, frame: frame.visible, edge: edgeOn, edgeText: lastEdgeTxt, frameOpacity: frame.material.opacity }),
    dispose() { edge.remove(); scene.remove(ghost, ledge, frame); },
  };
}
