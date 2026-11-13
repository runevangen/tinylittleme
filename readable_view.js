// R14: tegning av verdensmarkører (pil mot neste mål, grep, hylle, glatt) som holder seg unna knapper og HUD.
// Logikken (trygg sone, kantplassering) ligger i readable.js; her er DOM og three. Kobles inn fra main.js med createMarkerView().
import * as THREE from 'three';
import { inflate, inAny, edgePoint, placeMarker, ungrippableAhead, shelfIds, figureRect, pickArrowDistance } from './readable.js';

// alt som ligger over spillbildet og ikke skal skjule en markør (bare det som faktisk vises)
const BLOCKERS = ['btnJump', 'btnGrab', 'btnCarry', 'btnCenter', 'btnMap', 'minimap', 'ovhint', 'stick', 'hud', 'topband', 'compass', 'bar', 'hint', 'infocard', 'qbtn', 'stam', 'soundPill'];

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
  // figuren selv: markører og pil skal aldri ligge oppå hovedpersonen
  function heroRect() { return figureRect(toScreen(player.x, player.y + P.h, player.z), toScreen(player.x, player.y, player.z)); }
  // flytt et verdenspunkt (langs samme dybde) ut av knapper, HUD og figur; null hvis det må flyttes for langt eller er bak kameraet
  function nudge(x, y, z, maxShift = 140, margin = 34, pad = 24) {
    _v.set(x, y, z).project(camera); if (_v.z > 1) return null;
    const px = (_v.x * 0.5 + 0.5) * vw(), py = (-_v.y * 0.5 + 0.5) * vh(), hr = heroRect(), rs = safeRects().concat(hr ? [hr] : []).map((q) => inflate(q, pad));   // pad: halve markørstørrelsen, så hele markøren (ikke bare midtpunktet) er fri
    const r = placeMarker(px, py, vw(), vh(), rs, margin);
    if (!r.safe || Math.hypot(r.x - px, r.y - py) > maxShift) return null;
    if (!r.moved) return { x, y, z };
    _v.set(r.x / vw() * 2 - 1, -(r.y / vh() * 2 - 1), _v.z).unproject(camera); return { x: _v.x, y: _v.y, z: _v.z };
  }

  // ---- pil i kanten: tegnes i stedet for gulvpila når den ville havnet bak en knapp eller utenfor skjermen ----
  const edge = document.createElement('div'); edge.id = 'wmark';
  edge.innerHTML = '<svg viewBox="-14 -14 28 28"><path d="M0 -11 L8.5 9 L0 4.5 L-8.5 9 Z" fill="#ffa940" stroke="#10151f" stroke-width="3.2" stroke-linejoin="round" paint-order="stroke"/><path d="M0 -11 L8.5 9 L0 4.5 L-8.5 9 Z" fill="#ffa940" stroke="#fff" stroke-width="1.1" stroke-linejoin="round"/></svg>';
  document.body.appendChild(edge);
  let edgeMode = false, edgeLogged = false;
  // placeAt(d): flytter gulvpila til avstand d foran figuren og gir posisjonen; ang: kompassvinkel (0 = rett frem), brukes når målet er bak kameraet
  // Gulvpila prøves på lenger avstand til den er fri for knapper og figur. Returnerer true når den kantstilte pila vises (da skal gulvpila skjules).
  function arrowFrame(placeAt, ang, wanted) {
    if (!wanted || !isOn()) { edge.style.display = 'none'; edgeMode = false; return false; }
    const hr = heroRect(), rs = safeRects().concat(hr ? [hr] : []), margin = 14;
    const probe = rs.map((r) => inflate(r, edgeMode ? 40 : 26));               // hysterese: tilbake til gulvpila først når den er tydelig fri
    const d = pickArrowDistance((k) => { const p = placeAt(k); return toScreen(p.x, p.y, p.z); }, [1.4, 2.2, 3.0, 3.8], vw(), vh(), probe, margin);
    if (d !== null) { placeAt(d); edge.style.display = 'none'; edgeMode = false; return false; }
    const target = placeAt(1.4), s = toScreen(target.x, target.y, target.z);
    let px, py, dirAng = ang, onHero = false;
    if (s) { px = s.x; py = s.y; onHero = !!hr && inAny(s.x, s.y, [hr]); } else { const e = edgePoint(ang, vw(), vh(), margin); px = e.x; py = e.y; }
    if (onHero) {                                                                // dekket av figuren: legg pila like utenfor figuren, i retningen mot målet
      const cx = (hr.x0 + hr.x1) / 2, cy = (hr.y0 + hr.y1) / 2, dx = Math.sin(ang), dy = -Math.cos(ang);
      const k = Math.min(Math.abs(dx) > 1e-9 ? (hr.x1 - hr.x0) / 2 / Math.abs(dx) : Infinity, Math.abs(dy) > 1e-9 ? (hr.y1 - hr.y0) / 2 / Math.abs(dy) : Infinity) + 30;
      px = cx + dx * k; py = cy + dy * k;
    }
    const r = placeMarker(px, py, vw(), vh(), rs.map((q) => inflate(q, 24)), margin + 12);   // pila er ca. 44 px: ekstra luft til knappene og figuren
    if (r.ang !== null && s && !onHero) dirAng = r.ang;
    edgeMode = true; edge.style.display = 'block';
    edge.style.left = `${r.x}px`; edge.style.top = `${r.y}px`; edge.firstElementChild.style.transform = `rotate(${dirAng}rad)`;
    if (!edgeLogged) { edgeLogged = true; logEv('markør', onHero ? 'pil flyttet bort fra figuren' : 'pil kantstilt'); }
    return true;
  }

  // ---- sprites ----
  const upTex = spriteTex((g, n) => {                                  // grep: stor oransje ▲ med hvit glorie og mørk kant, så den stikker ut mot rutemønster og tekstur
    const tri = () => { g.beginPath(); g.moveTo(n / 2, 10); g.lineTo(n - 12, n - 22); g.lineTo(n / 2, n - 44); g.lineTo(12, n - 22); g.closePath(); };
    g.lineJoin = 'round'; g.shadowColor = 'rgba(255,255,255,.95)'; g.shadowBlur = 16; tri(); g.fillStyle = '#fff'; g.fill(); g.shadowBlur = 0;
    tri(); g.strokeStyle = '#10151f'; g.lineWidth = 16; g.stroke(); g.fillStyle = '#ff9a1f'; g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 5; g.stroke();
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(n / 2, 34); g.lineTo(n / 2 + 11, n - 52); g.lineTo(n / 2 - 11, n - 52); g.closePath(); g.fill();
  }, 128);
  const mkSprite = (map, sz) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthTest: true, depthWrite: false, opacity: 0, sizeAttenuation: false, fog: false })); sp.userData.px = sz; sp.renderOrder = 18; sp.visible = false; scene.add(sp); return sp; };
  // sprite med sizeAttenuation=false: høyde i piksler = scale * P11 * vh / 2, så størrelsen holdes lik i stående og liggende
  const sizeSprite = (sp, bump = 1) => { const sc = (sp.userData.px * bump * 2) / (camera.projectionMatrix.elements[5] * vh()); sp.scale.set(sc, sc, 1); };
  const gripPx = () => Math.max(44, Math.min(58, Math.min(vw(), vh()) * 0.14));

  // grep: ▲ som svever foran hver grep-flate når du er i nærheten (flyttes ut av knapper og figur i stedet for å skjules)
  const grips = LEVEL.boxes.filter((b) => b.grip && !b.dyn && !b.parent).map((b) => ({ b, sp: mkSprite(upTex, 48), c: [(b.min[0] + b.max[0]) / 2, b.max[1] + 0.55, (b.min[2] + b.max[2]) / 2] }));

  // hylle: teal kant på toppflaten av flater på ruta (ikke grep, ikke dekor)
  const shelves = [];
  { const ids = new Set(shelfIds(LEVEL.route, LEVEL.boxes));
    for (const b of LEVEL.boxes) {
      if (!ids.has(b.id)) continue;
      const pts = [[b.min[0], b.max[1] + 0.03, b.min[2]], [b.max[0], b.max[1] + 0.03, b.min[2]], [b.max[0], b.max[1] + 0.03, b.max[2]], [b.min[0], b.max[1] + 0.03, b.max[2]]].map((p) => new THREE.Vector3(...p));
      const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x5fe3c0, transparent: true, opacity: 0.55, depthWrite: false }));
      line.renderOrder = 4; line.visible = false; scene.add(line); shelves.push(line);
    } }

  // glatt: iskald glans med brede, lyse diagonale striper som glir sakte, pluss lyseblå kant. Ser helt annerledes ut enn oransje grep og teal hylle, uten tekst
  const slicks = [], slickCenter = { value: new THREE.Vector3() };
  { const tex = spriteTex((g, n) => {
      g.clearRect(0, 0, n, n); g.fillStyle = 'rgba(120,200,255,.28)'; g.fillRect(0, 0, n, n);
      g.fillStyle = 'rgba(255,255,255,.92)';
      for (const o of [-n, 0, n]) { g.beginPath(); g.moveTo(o + n * 0.1, n); g.lineTo(o + n * 0.34, n); g.lineTo(o + n * 0.9, 0); g.lineTo(o + n * 0.66, 0); g.closePath(); g.fill(); }
      g.fillStyle = 'rgba(210,245,255,.75)'; g.beginPath(); g.moveTo(n * 0.5, n); g.lineTo(n * 0.62, n); g.lineTo(n * 1.1, 0); g.lineTo(n * 0.98, 0); g.closePath(); g.fill();
    }, 128);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    for (const b of LEVEL.boxes) {
      if (!b.slick || b.dyn) continue;
      const sx = b.max[0] - b.min[0], sz = b.max[2] - b.min[2], t = tex.clone(); t.needsUpdate = true; t.repeat.set(Math.max(1, sx / 3), Math.max(1, sz / 3));
      const big = sx * sz > 16;                                                // stort glatt gulv (hele rommet): bare en glans rundt figuren, ikke striper over alt
      const mat = new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, fog: false });
      if (big) {
        mat.onBeforeCompile = (sh) => {
          sh.uniforms.uC = slickCenter;
          sh.vertexShader = 'varying vec3 vWp;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvWp = (modelMatrix * vec4(position, 1.0)).xyz;');
          sh.fragmentShader = 'varying vec3 vWp;\nuniform vec3 uC;\n' + sh.fragmentShader.replace('#include <opaque_fragment>', 'diffuseColor.a *= 0.55 * (1.0 - smoothstep(1.3, 3.2, distance(vWp.xz, uC.xz)));\n#include <opaque_fragment>');
        };
      }
      const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz), mat);
      m.rotation.x = -Math.PI / 2; m.position.set((b.min[0] + b.max[0]) / 2, b.max[1] + 0.02, (b.min[2] + b.max[2]) / 2); m.renderOrder = 2; m.visible = false; scene.add(m);
      const y = b.max[1] + 0.03, pts = [[b.min[0], y, b.min[2]], [b.max[0], y, b.min[2]], [b.max[0], y, b.max[2]], [b.min[0], y, b.max[2]]].map((q) => new THREE.Vector3(...q));
      const edgeLine = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xbfeaff, transparent: true, opacity: 0.95, depthWrite: false })); edgeLine.renderOrder = 3; edgeLine.visible = false; scene.add(edgeLine);
      edgeLine.userData.big = big; slicks.push(Object.assign(m, { userData: { tex: t, edgeLine, big } }));
    } }

  // ✕: DOM-element (alltid øverst) lagt på skjermpunktet for flaten du hopper mot, flyttet ut av figuren og knappene
  const crossEl = document.createElement('div'); crossEl.id = 'wcross';
  crossEl.innerHTML = '<svg viewBox="-24 -24 48 48"><circle r="21" fill="#10151f" fill-opacity=".92" stroke="#ff5a4d" stroke-width="3.5"/><path d="M-9 -9 L9 9 M9 -9 L-9 9" stroke="#fff" stroke-width="9" stroke-linecap="round"/><path d="M-9 -9 L9 9 M9 -9 L-9 9" stroke="#ff4034" stroke-width="5.5" stroke-linecap="round"/></svg>';
  document.body.appendChild(crossEl);
  let crossT = 0, crossLogged = false;
  const reachK = { HW: P.w / 2, H: P.h, reach: 0, range: 0.5 };

  // kalles hver bildeoppdatering
  function update(now, dt) {
    const on = isOn() && isPlay();
    for (const l of shelves) l.visible = on;
    slickCenter.value.set(player.x, player.y, player.z);
    for (const m of slicks) { m.visible = on; m.material.opacity = on ? 0.95 : 0; m.userData.edgeLine.visible = on && !m.userData.big; m.userData.tex.offset.x = (now / 4000) % 1; }
    const bob = Math.sin(now / 300) * 0.08;
    for (const g of grips) {
      const d = Math.hypot(player.x - g.c[0], player.z - g.c[2], (player.y - g.c[1]) * 0.5), want = on && d < 24 ? Math.min(1, (24 - d) / 6) : 0;
      let tgt = 0;
      if (want > 0) {
        const dx = player.x - g.c[0], dz = player.z - g.c[2], dl = Math.hypot(dx, dz) || 1, off = 0.45 + Math.min(g.b.max[0] - g.b.min[0], g.b.max[2] - g.b.min[2]) / 2;   // foran flaten (mot deg), i høyde med figuren
        const wx = g.c[0] + dx / dl * off, wy = Math.max(g.b.min[1] + 0.5, Math.min(g.b.max[1] + 0.5, player.y + 1.7)) + bob, wz = g.c[2] + dz / dl * off;
        const q = nudge(wx, wy, wz, 160, gripPx() * 0.7, gripPx() * 0.5);
        if (q) { g.sp.position.set(q.x, q.y, q.z); tgt = want; }
      }
      g.sp.material.opacity += (tgt - g.sp.material.opacity) * 0.25; g.sp.visible = g.sp.material.opacity > 0.03;
      g.sp.userData.px = gripPx(); sizeSprite(g.sp, 1 + 0.06 * Math.sin(now / 260));
    }
    // ✕ på flaten foran deg når du hopper mot noe som ikke kan gripes
    reachK.reach = (P.ledgeAbove || 0) + (P.reachAbove || 0);
    const u = on ? ungrippableAhead(player, LEVEL.boxes, reachK) : null;
    if (u) { crossT = Math.min(1, crossT + dt * 6);
      const q = nudge(u.x + u.nx * 0.08, u.y + reachK.H * 0.6, u.z + u.nz * 0.08, 400, 36, 28);
      if (q) { const sc = toScreen(q.x, q.y, q.z); if (sc) { crossEl.style.left = `${sc.x}px`; crossEl.style.top = `${sc.y}px`; } else crossT = 0; } else crossT = 0;
      if (!crossLogged && crossT > 0) { crossLogged = true; logEv('markør', `ugripbar flate ${u.box.id || ''}`); } }
    else crossT = Math.max(0, crossT - dt * 3);
    crossEl.style.opacity = String(Math.min(1, crossT * 1.2)); crossEl.style.display = crossT > 0.03 ? 'block' : 'none';
  }

  return { update, arrowFrame, covered, safeRects, toScreen, heroRect, edge, cross: crossEl, debug: () => ({ slicks: slicks.map((m) => [m.visible, m.material.opacity, m.position.y]), grips: grips.map((g) => [g.sp.visible, g.sp.material.opacity]), shelves: shelves.length, cross: [crossEl.style.display, crossT] }) };
}
