// R20: kart og kompass. Minikart (liten sirkel øverst til venstre) og en trykk-for-oversikt-knapp som flyr kameraet opp over rommet
// og viser mål, lagringsflagg og uoppdagede smuler som prikker i 3 sekunder, og så flyr tilbake til samme kameravinkel.
// Logikken (kartkoordinater, tidslinje) ligger i overview_logic.js og testes i node; her er DOM og three. Kobles inn fra main.js med createOverview().
import * as THREE from 'three';
import { inflate, inAny, placeMarker } from './readable.js';
import { miniLayout, toMap, mapScale, mapDots, overviewCam, ovBlend, ovDone, ovDotsAlpha, canOverview, OV } from './overview_logic.js';

const COL = { crumb: '#ffd23f', flag: '#4aa3ff', goal: '#3df0b0', hero: '#ffffff' };

export function createOverview({ scene, camera, LEVEL, player, mv, $, getYaw, getSave, getSaves, crumbsOn, miniOn, isPlay, isMenu, isBoss, isWon, logEv, toast }) {
  const room = LEVEL.room, dpr = () => Math.min(2, window.devicePixelRatio || 1);
  const _q = new THREE.Quaternion(), _m = new THREE.Matrix4(), _up = new THREE.Vector3(0, 1, 0), _p = new THREE.Vector3(), _l = new THREE.Vector3();
  const finite = !!room && [room.x0, room.x1, room.z0, room.z1].every(Number.isFinite);
  const boxes = (LEVEL.boxes || []).filter((b) => b.type !== 'floor' && b.type !== 'wall' && b.min && b.max && !b.dyn && !b.carried);

  // ---- minikart ----
  const mini = document.createElement('canvas'); mini.id = 'minimap'; mini.setAttribute('aria-label', 'Minikart: trykk for oversikt'); mini.style.display = 'none';
  const mg = mini.getContext('2d'); let miniSize = 0, miniAt = 0, miniShown = false;
  function layoutMini() {
    const L = miniLayout(innerWidth, innerHeight), d = dpr();
    mini.style.left = `${L.left}px`; mini.style.top = `${L.top}px`; mini.style.width = mini.style.height = `${L.size}px`;
    if (miniSize !== L.size * d) { mini.width = mini.height = Math.round(L.size * d); miniSize = L.size * d; }
    return L;
  }
  function drawMini() {
    const L = layoutMini(), d = dpr(), S = L.size, yaw = getYaw();
    mg.setTransform(d, 0, 0, d, 0, 0); mg.clearRect(0, 0, S, S);
    mg.save(); mg.beginPath(); mg.arc(S / 2, S / 2, S / 2 - 1, 0, Math.PI * 2); mg.fillStyle = 'rgba(18,26,44,.72)'; mg.fill(); mg.clip();
    // rommet og store flater (sett ovenfra, rotert så blikkretningen peker opp)
    const poly = (x0, z0, x1, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(([x, z]) => toMap(x, z, room, S, yaw));
    const path = (pts) => { mg.beginPath(); pts.forEach((p, i) => (i ? mg.lineTo(p.x, p.y) : mg.moveTo(p.x, p.y))); mg.closePath(); };
    path(poly(room.x0, room.z0, room.x1, room.z1)); mg.fillStyle = 'rgba(255,255,255,.10)'; mg.fill(); mg.strokeStyle = 'rgba(255,255,255,.55)'; mg.lineWidth = 1.2; mg.stroke();
    mg.fillStyle = 'rgba(255,200,120,.22)';
    for (const b of boxes) { if ((b.max[0] - b.min[0]) * (b.max[2] - b.min[2]) < 6) continue; path(poly(b.min[0], b.min[2], b.max[0], b.max[2])); mg.fill(); }
    for (const p of mapDots({ goal: LEVEL.goal, save: getSave(), saves: getSaves(), crumbs: LEVEL.crumbList || [], player, crumbsOn: crumbsOn() })) {
      const m = toMap(p.x, p.z, room, S, yaw);
      if (p.kind === 'hero') {                                       // figuren: hvit trekant som peker dit kameraet ser (opp)
        mg.fillStyle = COL.hero; mg.strokeStyle = '#10151f'; mg.lineWidth = 1.5; mg.beginPath(); mg.moveTo(m.x, m.y - 5.5); mg.lineTo(m.x + 4, m.y + 4); mg.lineTo(m.x, m.y + 2); mg.lineTo(m.x - 4, m.y + 4); mg.closePath(); mg.stroke(); mg.fill();
      } else {
        const r = p.kind === 'crumb' ? 2.2 : 4;
        mg.beginPath(); mg.arc(m.x, m.y, r, 0, Math.PI * 2); mg.fillStyle = COL[p.kind]; mg.fill(); mg.lineWidth = 1.2; mg.strokeStyle = '#10151f'; mg.stroke();
      }
    }
    mg.restore();
  }

  // ---- oversikt: kamera opp, prikker over, kamera ned ----
  const dots = document.createElement('canvas'); dots.id = 'ovdots'; dots.style.display = 'none'; const dg = dots.getContext('2d');
  const stick = document.getElementById('stick'); (stick?.parentNode || document.body).insertBefore(dots, stick || null);   // bak knappene i tegnerekkefølgen: TA/HOPP/GREP ligger alltid over
  const far0 = camera.far;
  const setFar = (f) => { if (camera.far !== f) { camera.far = f; camera.updateProjectionMatrix(); } };
  const restoreFog = () => { if (scene.fog && savedFog) { scene.fog.near = savedFog[0]; scene.fog.far = savedFog[1]; } };
  let pin = false;   // bare til testing (skjermbilde): hold oversikten oppe
  let savedFog = null, skipAt = null, tNow = 0, k = 0, active = false, startMs = 0;
  function start(why = 'knapp') {
    if (!finite || active) return false;
    if (!canOverview({ play: isPlay(), won: isWon(), menu: isMenu(), onGround: player.onGround || player.state === 'ground', boss: isBoss(), active })) { if (isPlay() && !isMenu()) toast?.('Oversikt: stå på bakken først'); return false; }
    active = true; tNow = 0; skipAt = null; k = 0; startMs = performance.now(); savedFog = scene.fog ? [scene.fog.near, scene.fog.far] : null;
    const dots0 = mapDots({ goal: LEVEL.goal, save: getSave(), saves: getSaves(), crumbs: LEVEL.crumbList || [], player, crumbsOn: crumbsOn() });
    const gd = Math.hypot(LEVEL.goal[0] - player.x, LEVEL.goal[2] - player.z);
    logEv('oversikt', `start (${why}): mål ${(gd * 0.05).toFixed(1)} m unna, ${dots0.filter((d) => d.kind === 'crumb').length} uoppdagede smuler, flagg ${getSaves() > 0 ? 'ja' : 'nei'}`);
    return true;
  }
  function skip() { if (active && skipAt === null && tNow > 0.35) { skipAt = tNow; logEv('oversikt', 'hoppet over med trykk'); } }
  addEventListener('pointerdown', (e) => { if (active && e.target !== btn) skip(); }, true);
  addEventListener('keydown', () => skip(), true);

  const btn = $('btnMap');
  if (btn) btn.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); if (active) skip(); else start('knapp'); });
  mini.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); if (active) skip(); else start('minikart'); });
  document.body.appendChild(mini);

  function layoutDots() {
    const w = innerWidth, h = innerHeight, d = dpr();
    if (dots.width !== Math.round(w * d) || dots.height !== Math.round(h * d)) { dots.width = Math.round(w * d); dots.height = Math.round(h * d); dots.style.width = `${w}px`; dots.style.height = `${h}px`; }
    return d;
  }
  // prikkene tegnes over verden men aldri over knapper eller HUD: bak en knapp flyttes de ut (mål og flagg) eller droppes (smuler)
  function drawDots(alpha) {
    const d = layoutDots(), w = innerWidth, h = innerHeight;
    dg.setTransform(d, 0, 0, d, 0, 0); dg.clearRect(0, 0, w, h);
    if (alpha <= 0.01) return;
    const rects = mv.safeRects(performance.now(), true), pad = rects.map((r) => inflate(r, 12));
    dg.globalAlpha = alpha; dg.font = '700 12px system-ui'; dg.textAlign = 'center';
    for (const p of mapDots({ goal: LEVEL.goal, save: getSave(), saves: getSaves(), crumbs: LEVEL.crumbList || [], player, crumbsOn: crumbsOn() })) {
      const s = mv.toScreen(p.x, p.y + (p.kind === 'crumb' ? 0 : 1.5), p.z); if (!s) continue;
      let x = s.x, y = s.y;
      if (inAny(x, y, pad)) {
        if (p.kind === 'crumb') continue;
        const r = placeMarker(x, y, w, h, pad, 24); if (!r.safe) continue; x = r.x; y = r.y;
      }
      const label = { goal: 'MÅL', flag: 'FLAGG', hero: 'DU' }[p.kind], r = p.kind === 'crumb' ? 5 : p.kind === 'hero' ? 8 : 10;
      dg.beginPath(); dg.arc(x, y, r + 2, 0, Math.PI * 2); dg.fillStyle = '#10151f'; dg.fill();
      dg.beginPath(); dg.arc(x, y, r, 0, Math.PI * 2); dg.fillStyle = COL[p.kind]; dg.fill();
      if (label) { dg.lineWidth = 3.5; dg.strokeStyle = '#fff'; dg.strokeText(label, x, y - r - 7); dg.fillStyle = '#10151f'; dg.fillText(label, x, y - r - 7); }
    }
    dg.globalAlpha = 1;
  }

  return {
    get active() { return active; },
    get k() { return k; },
    start, skip, set pin(v) { pin = !!v; if (!pin) startMs = performance.now() - tNow * 1000; },
    // Frame-steg: tid frem, minikart og prikker. Kalles hvert bilde fra render().
    update(dt, now) {
      if (active) {
        tNow = pin ? Math.min((now - startMs) / 1000, OV.rise + 1) : (now - startMs) / 1000; k = ovBlend(tNow, skipAt);   // ekte tid (ikke spilltid): 3 sekunder er 3 sekunder også på en treg telefon
        if (ovDone(tNow, skipAt)) { active = false; k = 0; restoreFog(); document.body.classList.remove('ovview'); logEv('oversikt', `slutt etter ${((performance.now() - startMs) / 1000).toFixed(1)} s`); }
      } else k = 0;
      const showMini = finite && miniOn() && isPlay() && !isMenu() && !isBoss() && !active;
      if (showMini !== miniShown) { miniShown = showMini; mini.style.display = showMini ? 'block' : 'none'; if (showMini) miniAt = 0; }
      if (showMini && now - miniAt > 100) { miniAt = now; drawMini(); }
      const a = active ? ovDotsAlpha(k) : 0;
      if (active) { dots.style.display = 'block'; drawDots(a); } else if (dots.style.display !== 'none') { drawDots(0); dots.style.display = 'none'; }
      document.body.classList.toggle('ovview', active && k > 0.02);
    },
    // Etter at kameraet er satt som vanlig: bland mot oversiktskameraet. k = 0 gir nøyaktig det vanlige kameraet (samme vinkel tilbake).
    applyCamera() {
      if (!active || k <= 0) { setFar(far0); return; }
      if (scene.fog) { scene.fog.near = 1e5; scene.fog.far = 2e5; }       // tåken skjuler ellers rommet på 100+ enheters avstand (fargene styres fortsatt av stemningen)
      const oc = overviewCam(room, camera.aspect, camera.fov); setFar(Math.max(far0, oc.height * 1.6));   // store rom i stående format krever lang sikt
      _p.set(...oc.pos); _l.set(...oc.look);
      _m.lookAt(_p, _l, _up); _q.setFromRotationMatrix(_m);
      camera.position.lerp(_p, k); camera.quaternion.slerp(_q, k);
    },
    mini,
  };
}
