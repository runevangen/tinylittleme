// R14: tegning av verdensmarkører (pil mot neste mål, grep, hylle, glatt) som holder seg unna knapper og HUD.
// Logikken (trygg sone, kantplassering) ligger i markers.js; her er DOM og three. Kobles inn fra main.js med createMarkerView().
import * as THREE from 'three';
import { inflate, inAny, edgePoint, placeMarker, ungrippableAhead, shelfIds } from './markers.js';

// alt som ligger over spillbildet og ikke skal skjule en markør (bare det som faktisk vises)
const BLOCKERS = ['btnJump', 'btnGrab', 'btnCarry', 'btnCenter', 'stick', 'hud', 'compass', 'bar', 'hint', 'infocard', 'qbtn', 'stam', 'soundPill'];

function spriteTex(draw, size = 96) {
  const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function createMarkerView({ scene, camera, LEVEL, player, P, $, isPlay, isOn, logEv }) {
  const vw = () => innerWidth, vh = () => innerHeight;
  const _v = new THREE.Vector3();

  // ---- trygge soner: målt fra de ekte knappene (virker i stående, liggende og med egen knappestørrelse) ----
  let rects = [], rectsAt = -1e9;
  function safeRects(now = performance.now(), force = false) {
    if (!force && now - rectsAt < 250) return rects;
    rectsAt = now; rects = [];
    for (const id of BLOCKERS) {
      const el = document.getElementById(id); if (!el) continue;
      const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
      rects.push(inflate({ x0: r.left, y0: r.top, x1: r.right, y1: r.bottom }, 6));
    }
    return rects;
  }
  addEventListener('resize', () => { rectsAt = -1e9; });

  // skjermposisjon for et punkt i verden (null bak kameraet)
  function toScreen(x, y, z) {
    _v.set(x, y, z).project(camera);
    if (_v.z > 1) return null;
    return { x: (_v.x * 0.5 + 0.5) * vw(), y: (-_v.y * 0.5 + 0.5) * vh() };
  }
  const covered = (x, y, z) => { const s = toScreen(x, y, z); return !!s && inAny(s.x, s.y, safeRects()); };

  // ---- pil i kanten: tegnes i stedet for gulvpila når den ville havnet bak en knapp eller utenfor skjermen ----
  const edge = document.createElement('div'); edge.id = 'wmark';
  edge.innerHTML = '<svg viewBox="-14 -14 28 28"><path d="M0 -11 L8.5 9 L0 4.5 L-8.5 9 Z" fill="#ffa940" stroke="#10151f" stroke-width="3.2" stroke-linejoin="round" paint-order="stroke"/><path d="M0 -11 L8.5 9 L0 4.5 L-8.5 9 Z" fill="#ffa940" stroke="#fff" stroke-width="1.1" stroke-linejoin="round"/></svg>';
  document.body.appendChild(edge);
  let edgeMode = false, edgeLogged = false;
  // target: stedet pila peker mot i verden; ang: kompassvinkel (0 = rett frem), brukes når målet er bak kameraet
  // Returnerer true når den kantstilte pila vises (da skal gulvpila skjules).
  function arrowFrame(target, ang, wanted) {
    if (!wanted || !isOn()) { edge.style.display = 'none'; edgeMode = false; return false; }
    const rs = safeRects(), s = toScreen(target.x, target.y, target.z);
    const margin = 14;
    let ok = false, px, py, dirAng = ang;
    if (s) {
      // hysterese: tilbake til gulvpila først når den er tydelig fri for knappene
      const probe = edgeMode ? rs.map((r) => inflate(r, 14)) : rs;
      ok = s.x > margin && s.x < vw() - margin && s.y > margin && s.y < vh() - margin && !inAny(s.x, s.y, probe);
      px = s.x; py = s.y;
    } else { const e = edgePoint(ang, vw(), vh(), margin); px = e.x; py = e.y; }
    if (ok) { edge.style.display = 'none'; edgeMode = false; return false; }
    const r = placeMarker(px, py, vw(), vh(), rs.map((q) => inflate(q, 18)), margin + 12);   // pila er ca. 44 px: ekstra luft til knappene
    if (r.ang !== null && s) dirAng = r.ang;
    edgeMode = true; edge.style.display = 'block';
    edge.style.left = `${r.x}px`; edge.style.top = `${r.y}px`; edge.firstElementChild.style.transform = `rotate(${dirAng}rad)`;
    if (!edgeLogged) { edgeLogged = true; logEv('markør', 'pil kantstilt'); }
    return true;
  }

  // ---- sprites ----
  const upTex = spriteTex((g, n) => {                                  // grep: oransje ▲ med mørk kant
    g.lineJoin = 'round'; g.beginPath(); g.moveTo(n / 2, 8); g.lineTo(n - 10, n - 18); g.lineTo(n / 2, n - 36); g.lineTo(10, n - 18); g.closePath();
    g.strokeStyle = '#10151f'; g.lineWidth = 12; g.stroke(); g.fillStyle = '#ffa940'; g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 3; g.stroke();
  });
  const crossTex = spriteTex((g, n) => {                                // glatt/ugripbart: rød ✕ i mørk sirkel
    g.fillStyle = 'rgba(16,21,31,.92)'; g.beginPath(); g.arc(n / 2, n / 2, n / 2 - 4, 0, 7); g.fill();
    g.strokeStyle = '#ff5a4d'; g.lineWidth = 7; g.stroke();
    g.lineCap = 'round'; g.lineWidth = 11; g.beginPath(); g.moveTo(30, 30); g.lineTo(n - 30, n - 30); g.moveTo(n - 30, 30); g.lineTo(30, n - 30); g.stroke();
  });
  const mkSprite = (map, s) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthTest: true, depthWrite: false, opacity: 0, sizeAttenuation: false, fog: false })); sp.scale.set(s, s, 1); sp.renderOrder = 18; sp.visible = false; scene.add(sp); return sp; };

  // grep: ▲ som svever over hver grep-flate når du er i nærheten
  const grips = LEVEL.boxes.filter((b) => b.grip && !b.dyn && !b.parent).map((b) => ({ b, sp: mkSprite(upTex, 0.04), c: [(b.min[0] + b.max[0]) / 2, b.max[1] + 0.55, (b.min[2] + b.max[2]) / 2] }));

  // hylle: teal kant på toppflaten av flater på ruta (ikke grep, ikke dekor)
  const shelves = [];
  { const ids = new Set(shelfIds(LEVEL.route, LEVEL.boxes));
    for (const b of LEVEL.boxes) {
      if (!ids.has(b.id)) continue;
      const pts = [[b.min[0], b.max[1] + 0.03, b.min[2]], [b.max[0], b.max[1] + 0.03, b.min[2]], [b.max[0], b.max[1] + 0.03, b.max[2]], [b.min[0], b.max[1] + 0.03, b.max[2]]].map((p) => new THREE.Vector3(...p));
      const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x5fe3c0, transparent: true, opacity: 0.55, depthWrite: false }));
      line.renderOrder = 4; line.visible = false; scene.add(line); shelves.push(line);
    } }

  // glatt: kjølige diagonale glans-striper over glatte flater (fliser), så de skiller seg fra grep uten tekst
  const slicks = [];
  { const tex = spriteTex((g, n) => {
      g.clearRect(0, 0, n, n); g.fillStyle = 'rgba(190,235,255,.55)';
      for (const o of [-n, 0, n]) { g.beginPath(); g.moveTo(o + n * 0.15, n); g.lineTo(o + n * 0.3, n); g.lineTo(o + n * 0.85, 0); g.lineTo(o + n * 0.7, 0); g.closePath(); g.fill(); }
      g.fillStyle = 'rgba(190,235,255,.3)'; g.beginPath(); g.moveTo(n * 0.55, n); g.lineTo(n * 0.62, n); g.lineTo(n * 1.02, 0); g.lineTo(n * 0.95, 0); g.closePath(); g.fill();
    }, 128);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    for (const b of LEVEL.boxes) {
      if (!b.slick || b.dyn) continue;
      const sx = b.max[0] - b.min[0], sz = b.max[2] - b.min[2], t = tex.clone(); t.needsUpdate = true; t.repeat.set(Math.max(1, sx / 5), Math.max(1, sz / 5));
      const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, fog: false }));
      m.rotation.x = -Math.PI / 2; m.position.set((b.min[0] + b.max[0]) / 2, b.max[1] + 0.012, (b.min[2] + b.max[2]) / 2); m.renderOrder = 2; m.visible = false; scene.add(m); slicks.push(m);
    } }

  const cross = mkSprite(crossTex, 0.05); let crossT = 0, crossLogged = false;
  const reachK = { HW: P.w / 2, H: P.h, reach: 0, range: 0.5 };

  // kalles hver bildeoppdatering
  function update(now, dt) {
    const on = isOn() && isPlay();
    for (const l of shelves) l.visible = on;
    for (const m of slicks) { m.visible = on; m.material.opacity = on ? 0.22 : 0; }
    const rs = safeRects(now), bob = Math.sin(now / 300) * 0.08;
    for (const g of grips) {
      const d = Math.hypot(player.x - g.c[0], player.z - g.c[2], (player.y - g.c[1]) * 0.5), want = on && d < 16 ? Math.min(1, (16 - d) / 5) : 0;
      const hidden = want > 0 && (() => { const s = toScreen(g.c[0], g.c[1], g.c[2]); return !s || inAny(s.x, s.y, rs); })();
      g.sp.material.opacity += ((hidden ? 0 : want * 0.95) - g.sp.material.opacity) * 0.2; g.sp.visible = g.sp.material.opacity > 0.03;
      g.sp.position.set(g.c[0], g.c[1] + bob, g.c[2]);
    }
    // ✕ på flaten foran deg når du hopper mot noe som ikke kan gripes
    reachK.reach = (P.ledgeAbove || 0) + (P.reachAbove || 0);
    const u = on ? ungrippableAhead(player, LEVEL.boxes, reachK) : null;
    if (u) { crossT = Math.min(1, crossT + dt * 6); cross.position.set(u.x + u.nx * 0.08, u.y, u.z + u.nz * 0.08); if (!crossLogged) { crossLogged = true; logEv('markør', `ugripbar flate ${u.box.id || ''}`); } }
    else crossT = Math.max(0, crossT - dt * 3);
    cross.material.opacity = crossT * 0.95; cross.visible = crossT > 0.03 && !covered(cross.position.x, cross.position.y, cross.position.z);
  }

  return { update, arrowFrame, covered, safeRects, toScreen, edge };
}
