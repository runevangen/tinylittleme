// R98: visning for oppdragslinjen og peilingen (goalway_logic.js). Oppdragslinje og kant-ikon er DOM; lysgløden er ett ring-mesh (56 trekanter, MeshBasicMaterial som guide_view).
// Ingenting tegnes når det ikke trengs. Linja ligger rett under toppbåndet (aldri over stikke eller knapper).
import * as THREE from 'three';

const CSS = `#questLine{position:fixed;left:max(8px,env(safe-area-inset-left));top:calc(max(6px,env(safe-area-inset-top)) + var(--tbh,32px) + 6px);z-index:4;display:none;max-width:min(calc(100vw - 16px),360px);box-sizing:border-box;align-items:center;gap:7px;padding:4px 11px 4px 8px;border-radius:15px;background:#121a2ce0;border:1px solid #ffd23f99;color:#fff;font:700 13px/17px system-ui;cursor:pointer;-webkit-tap-highlight-color:transparent;user-select:none;touch-action:manipulation}
#questLine.show{display:flex}#questLine .qi{flex:none;font-size:16px;line-height:1}#questLine .qt{min-width:0;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow-wrap:anywhere}
#questLine.tapped{border-color:#ffd23f;box-shadow:0 0 0 2px #ffd23f55}
@media (orientation:landscape) and (max-height:520px){#questLine{max-width:min(46vw,360px)}}
body.ovview #questLine,body.bossfight #questLine{display:none!important}
#wayPeek{position:fixed;left:0;top:0;z-index:4;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;display:none;align-items:center;justify-content:center;font-size:24px;line-height:1;background:#121a2ce6;border:2px solid #ffd23f;box-shadow:0 0 14px #ffd23f99;opacity:.92;pointer-events:auto;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
#wayPeek.show{display:flex;animation:waypop .3s ease-out}
@keyframes waypop{0%{transform:scale(.5);opacity:0}100%{transform:scale(1);opacity:.92}}
body.ovview #wayPeek{display:none!important}`;

export function createGoalWayView({ scene, T, onTap, logEv }) {
  if (!document.getElementById('goalwaycss')) { const s = document.createElement('style'); s.id = 'goalwaycss'; s.textContent = CSS; document.head.appendChild(s); }
  const ql = document.createElement('div'); ql.id = 'questLine'; ql.setAttribute('role', 'status'); ql.innerHTML = '<span class="qi"></span><span class="qt"></span>';
  const pk = document.createElement('div'); pk.id = 'wayPeek';
  document.body.append(ql, pk);
  const qi = ql.querySelector('.qi'), qt = ql.querySelector('.qt');
  ql.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); onTap?.('linje'); });
  pk.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); onTap?.('ikon'); });

  const ring = new THREE.Mesh(new THREE.RingGeometry(0.62, 1.0, 28), (() => { const m = new THREE.MeshBasicMaterial({ color: 0xffe27a, transparent: true, opacity: 0, depthTest: false, depthWrite: false, side: THREE.DoubleSide }); m.userData.noDetail = true; return m; })());
  ring.rotation.x = -Math.PI / 2; ring.renderOrder = 31; ring.visible = false; scene.add(ring);

  let qKey = '', qShown = false, pkShown = false, pkIcon = '', tappedUntil = 0;
  return {
    ql, pk, ring,
    // model: { icon, text, key } | null; show: bool; tapped: nylig trykket (uthevet ramme)
    setQuest(model, show, tapped = false) {
      const on = !!(show && model && model.text);
      if (on) {
        if (model.key !== qKey) { qKey = model.key; qi.textContent = model.icon; qt.textContent = model.text; }
        if (!qShown) { qShown = true; ql.classList.add('show'); }
        ql.classList.toggle('tapped', tapped);
      } else if (qShown) { qShown = false; ql.classList.remove('show'); }
    },
    // mark: { x, y } | null; icon: mål-ikonet. Glir inn ved kanten.
    setPeek(mark, icon) {
      if (mark) {
        if (icon !== pkIcon) { pkIcon = icon; pk.textContent = icon; }
        pk.style.left = `${mark.x.toFixed(0)}px`; pk.style.top = `${mark.y.toFixed(0)}px`;
        if (!pkShown) { pkShown = true; pk.classList.add('show'); }
      } else if (pkShown) { pkShown = false; pk.classList.remove('show'); }
    },
    // glød rundt målet: t: {x,y,z} | null, k: 0..1 puls
    setGlow(t, now, k = 1) {
      if (!t) { ring.visible = false; return; }
      ring.visible = true; ring.position.set(t.x, t.y + 0.07, t.z);
      const s = 1.2 + 0.35 * Math.sin(now / 240); ring.scale.set(s, s, 1); ring.material.opacity = k * (0.8 + 0.2 * Math.sin(now / 240));
    },
    state: () => ({ quest: qShown, questText: qt.textContent, questIcon: qi.textContent, peek: pkShown, glow: ring.visible, glowOpacity: ring.material.opacity, tris: ring.geometry.index ? ring.geometry.index.count / 3 : ring.geometry.attributes.position.count / 3 }),
    dispose() { ql.remove(); pk.remove(); scene.remove(ring); },
  };
}
