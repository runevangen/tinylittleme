// R68: kinomodus, API mot spillmotoren (window.__game.cine). Se cinema_logic.js og docs/TESTING.md («Kinomodus»).
// Alt er av som standard. Med ?cinema=1 skjules all UI, lyd og lagring er av, tilfeldighet har fast frø, og et skript styrer kamera, figur og tid.
// Tid står stille mellom kallene: bare cine.step(n, dt) går framover (samme update() som testene), og bare cine.render() tegner et bilde.
import { resetPlayer } from './physics.js';
import { CINE_CSS, FRAME_DT, normPose, lerpPose, poseLook, normFollow, FOLLOW_DEFAULT, followPose, normHero, heroYaw, normProp, traceAt, traceLen, fnv1a } from './cinema_logic.js';

export function createCinema({ state, rng, camera, canvas, cam, player, update, render, bld, settings, logEv, onFollow, snapCam, isPlay, levelId, version, THREE, scene, hero, onHeroScale }) {
  const on = !!state.on;
  let free = null, follow = null, t = 0, pending = 0, live = !state.hold, tr = null, trI = 0, shots = 0;
  const need = (what) => { if (!on) throw new Error(`kinomodus er av: åpne siden med ?cinema=1 (${what})`); };
  if (on) {
    document.body.classList.add('cinema');
    const st = document.createElement('style'); st.id = 'cinecss'; st.textContent = CINE_CSS; document.head.appendChild(st);
    logEv('kino', `på (frø ${state.seed}${state.hold ? ', frosset' : ''})`);
  }
  const hold = () => { if (live) { live = false; logEv('kino', 'skript styrer tid og bilde'); } };
  const applyCam = () => {          // kalles fra render() rett før tegning: fritt kamera overstyrer følgekameraet, per bilde
    if (!on || !free) return;
    camera.position.set(free.x, free.y, free.z); camera.lookAt(free.tx, free.ty, free.tz);
    if (Math.abs(camera.fov - free.fov) > 1e-6) { camera.fov = free.fov; camera.updateProjectionMatrix(); }
  };
  let lastNow = null;
  const frame = (now) => {          // fra rAF-løkka i main.js: så lenge skriptet ikke har tatt over (live), går spillet vanlig med ekte tid
    if (!live) return;
    const dt = lastNow === null ? 0 : Math.max(0, Math.min(0.05, (now - lastNow) / 1000)); lastNow = now;
    if (dt > 0 && isPlay() && !bld.active) update(dt);
    t += dt; render(now, dt);
  };
  const chunked = (dt, fn) => { let left = dt; while (left > 1e-9) { const d = Math.min(left, 1 / 30); fn(d); left -= d; } };   // byggeprøven tåler maks 6 delsteg per kall (1/60 s hver)

  // ---- props (enkle former i scenen) og figurens størrelse ----
  const props = new Map(); let propN = 0, heroS = 1;
  const eyePaths = () => (hero && hero.face ? hero.face.eyes.map((e) => { const path = []; for (let o = e; o && o !== hero.root; o = o.parent) path.unshift(o.parent.children.indexOf(o)); return path; }) : []);
  const labelTex = (spec) => { const c = document.createElement('canvas'); c.width = 512; c.height = Math.max(64, Math.round(512 * spec.sy / spec.sx)); const g = c.getContext('2d');
    g.fillStyle = '#' + spec.tbg.toString(16).padStart(6, '0'); g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#' + spec.tfg.toString(16).padStart(6, '0');
    const lines = spec.text.split('\n'), fs = Math.min(c.height / (lines.length * 1.25), c.height * 0.5);
    g.font = `bold ${Math.round(fs)}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    lines.forEach((ln, i) => g.fillText(ln, c.width / 2, c.height * (i + 0.5) / lines.length, c.width * 0.94));
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const build = (s) => {
    if (s.shape === 'light') { const l = new THREE.PointLight(s.color, s.intensity, s.dist, 1); l.userData.cineProp = true; return { obj: l, kind: 'light' }; }
    if (s.shape === 'hero') { const paths = eyePaths(), g = new THREE.Group(), c = hero.root.clone(true); c.position.set(0, 0, 0); c.scale.set(1, 1, 1); g.add(c); const eyes = paths.map((pa) => pa.reduce((o, i) => o && o.children[i], c)).filter(Boolean); return { obj: g, kind: 'hero', inner: c, eyes, eyeY: eyes.map((e) => e.scale.y) }; }
    const geo = s.shape === 'cyl' ? new THREE.CylinderGeometry(0.5, 0.5, 1, 20) : s.shape === 'sphere' ? new THREE.SphereGeometry(0.5, 20, 14) : s.shape === 'plane' ? new THREE.PlaneGeometry(1, 1) : new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial({ color: s.color, roughness: 0.6, metalness: 0.05 }); const m = new THREE.Mesh(geo, mat); m.castShadow = s.shape !== 'plane'; m.receiveShadow = true; return { obj: m, kind: 'mesh' };
  };
  const applyProp = (e, s) => {
    const o = e.obj; o.position.set(s.x, s.y, s.z); if (e.kind === 'hero') o.rotation.set(0, 0, 0); else o.rotation.set(s.rx, s.ry, s.rz);
    if (e.kind === 'light') { o.color.setHex(s.color); o.intensity = s.intensity; o.distance = s.dist; return; }
    if (e.kind === 'hero') { o.scale.set(s.sx, s.sy, s.sz); e.inner.rotation.y = s.ry; e.eyes.forEach((ey, i) => { ey.scale.y = e.eyeY[i] * (1 - 0.93 * s.blink); }); return; }
    o.scale.set(s.sx, s.sy, s.shape === 'plane' ? 1 : s.sz);
    const m = o.material; m.color.setHex(s.color); m.emissive.setHex(s.emissive); m.transparent = s.opacity < 1; m.opacity = s.opacity;
    if (s.shape === 'plane' && s.text) { if (e.text !== s.text) { if (m.map) m.map.dispose(); m.map = labelTex(s); m.color.setHex(0xffffff); m.needsUpdate = true; e.text = s.text; } } else if (m.map) { m.map.dispose(); m.map = null; m.needsUpdate = true; e.text = ''; }
  };
  const prop = {
    add(spec) { need('prop.add'); hold(); if (!THREE) throw new Error('prop: ingen three'); const s = normProp(spec); if (!s) throw new Error('prop.add: ugyldig (shape box|cyl|sphere|plane|light|hero, tall for x,y,z,sx,sy,sz)'); const e = build(s); e.spec = s; applyProp(e, s); scene.add(e.obj); const id = ++propN; props.set(id, e); logEv('kino', `prop ${id} ${s.shape}`); return id; },
    set(id, patch) { need('prop.set'); const e = props.get(id); if (!e) throw new Error(`prop.set: ukjent prop ${id}`); const s = normProp(patch, e.spec); if (!s) throw new Error('prop.set: ugyldig verdi'); e.spec = s; applyProp(e, s); return { ...s }; },
    remove(id) { need('prop.remove'); const e = props.get(id); if (!e) return false; scene.remove(e.obj); props.delete(id); return true; },
    clear() { need('prop.clear'); for (const id of [...props.keys()]) prop.remove(id); return true; },
    get count() { return props.size; },
  };

  const api = {
    get isOn() { return on; }, get live() { return live; }, get t() { return t; }, get ticks() { return Math.round(t / FRAME_DT); },
    on() { if (on) return true; const u = new URL(location.href); u.searchParams.set('cinema', '1'); if (!u.searchParams.has('level')) u.searchParams.set('level', levelId()); location.href = u.toString(); return false; },   // laster siden på nytt i kinomodus (frøet må settes før noe annet kjører)
    off() { const u = new URL(location.href); for (const k of ['cinema', 'cine_hold', 'cine_seed', 'cine_opt']) u.searchParams.delete(k); location.href = u.toString(); },
    // ---- tid og bilde ----
    frame, hold, resume() { need('resume'); live = true; lastNow = null; },
    seed(n = state.seed) { need('seed'); rng.reseed(n); return n; },
    step(n = 1, dt = FRAME_DT) {        // n spilltikk med fast tidssteg (update() som i tester). Ingen tegning: bruk render() etterpå.
      need('step'); hold(); n = Math.max(0, Math.floor(n)); if (!(dt > 0 && dt <= 0.1)) throw new Error('step: dt må være mellom 0 og 0,1 s');
      for (let i = 0; i < n; i++) { update(dt); chunked(dt, (d) => bld.update(d, isPlay())); }   // byggeskjermen (prøven, plukking av deler) går med samme tid
      t += n * dt; pending += n * dt; return { t, ticks: api.ticks };
    },
    render(dt) { need('render'); hold(); const d = dt === undefined ? pending : dt; pending = 0; render(t * 1000, d); return t; },   // ett bilde; kameraet jevnes ut med tiden siden forrige bilde
    shot(type = 'image/png') { need('shot'); api.render(); shots++; return canvas.toDataURL(type); },                           // bildet som data-URL (tegnet i samme oppgave, så bufferen er gyldig)
    hash(type) { const u = api.shot(type); return fnv1a(u.slice(u.indexOf(',') + 1)); },
    // ---- kamera ----
    setCam(p) { need('setCam'); hold(); const q = normPose(p, free); if (!q) throw new Error('setCam: trenger x,y,z,tx,ty,tz (og fov 5–140) og ulike punkter'); free = q; follow = null; return { ...q }; },
    followCam(o = {}) {
      need('followCam'); hold(); const f = normFollow(o, follow || FOLLOW_DEFAULT); if (!f) throw new Error('followCam: ugyldige verdier (dist 0,5–200, pitch under 1,5)');
      follow = f; free = null; cam.yaw = f.yaw; cam.pitch = f.pitch; cam.dist = f.dist; cam.cur = f.dist; onFollow(f.height - 0.62); snapCam(); return { ...f };
    },
    releaseCam() { need('releaseCam'); free = null; follow = null; onFollow(0); if (camera.fov !== undefined) logEv('kino', 'kamera frigitt'); return true; },
    lerpCam: (a, b, k, e) => lerpPose(a, b, k, e),
    get cam() { return free ? { ...free } : null; },
    get look() { return free ? poseLook(free) : null; },
    applyCam,
    // ---- props og figurens skala ----
    prop,
    heroScale(k) { need('heroScale'); hold(); if (!(typeof k === 'number' && k > 0 && k <= 200)) throw new Error('heroScale: tall mellom 0 og 200'); heroS = k; onHeroScale(k); return k; },   // figuren tegnes k ganger større (fysikken er uendret); 1 = vanlig
    get heroS() { return heroS; },
    // ---- figur ----
    setHero(h) {
      need('setHero'); hold(); const o = normHero(h); if (!o) throw new Error('setHero: trenger x, y, z (og yaw)');
      resetPlayer(player, o.x, o.y, o.z); if (o.fx !== undefined) { player.fx = o.fx; player.fz = o.fz; }
      snapCam(); return { x: player.x, y: player.y, z: player.z, yaw: heroYaw(player) };
    },
    get hero() { return { x: player.x, y: player.y, z: player.z, yaw: heroYaw(player), state: player.state, onGround: player.onGround }; },
    // ---- bane fra den ekte boten (tools/cine_route.mjs lager en rad per tikk) ----
    runRoute(trace) {          // tabell [[t,x,y,z,state,fx,fz], …] (eller en URL som gir den); returnerer en spiller som setter figuren tikk for tikk uten tastetrykk
      need('runRoute'); hold();
      const load = (a) => { if (!Array.isArray(a) || !a.length) throw new Error('runRoute: tom bane'); tr = a; trI = 0; logEv('kino', `bane ${a.length} tikk`); return route; };
      const route = {
        get length() { return traceLen(tr); }, get i() { return trI; }, get done() { return trI >= traceLen(tr) - 1; },
        at: (i) => traceAt(tr, i),
        seek(i) { const p = traceAt(tr, i); if (!p) return null; trI = Math.max(0, Math.min(traceLen(tr) - 1, Math.floor(i))); api.setHero({ x: p.x, y: p.y, z: p.z, yaw: p.yaw }); player.state = p.state || player.state; return p; },
        advance(n = 1) { return route.seek(trI + n); },     // n tikk videre langs banen (setter figuren; kall render() etterpå)
      };
      if (typeof trace === 'string') return fetch(trace).then((r) => { if (!r.ok) throw new Error(`runRoute: ${r.status}`); return r.json(); }).then(load);
      return load(trace);
    },
    // ---- valg som gjelder bare denne økten (lagres aldri) ----
    set(id, v) { need('set'); const d = settings().find((x) => x.id === id); if (!d) throw new Error(`set: ukjent valg ${id}`); d.set(v); logEv('kino', `valg ${id} = ${v}`); return d.get ? d.get() : v; },
    // ---- byggeskjermen ----
    build: {
      sites: () => bld.siteIds,
      open(siteId) { need('build.open'); hold(); return bld.open(siteId, { force: true }); },
      step(dt = FRAME_DT) { need('build.step'); hold(); if (!(dt > 0)) throw new Error('build.step: dt må være over 0'); chunked(dt, (d) => bld.update(d, false)); return bld.result; },   // stegger byggeprøven og tegner skjermen på nytt
      place: (siteId) => { need('build.place'); hold(); return bld.placeRef(siteId); },   // referansebygget fra brettfila (tape, ledd, planker) settes inn på stedet
      start: () => bld.startTry(), stop: () => bld.stopTry(), close: () => { bld.close('kino'); return !bld.active; },
      import: (txt) => bld.importText(txt), export: () => bld.exportText(),
      get active() { return bld.active; }, get result() { return bld.result; }, get running() { return bld.running; },
    },
    state: () => ({ on, live, t, ticks: api.ticks, seed: state.seed, free: free ? { ...free } : null, follow: follow ? { ...follow } : null, level: levelId(), version, shots, route: tr ? { length: tr.length, i: trI } : null }),
  };
  return api;
}
