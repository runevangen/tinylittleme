// Utseende (v0.62): prosedyre-teksturer med relieff (normal-kart) og ruhet, bøker med perm og sider,
// kontaktskygger der ting står på noe, støv i lufta og himmel i vinduet. Bare utseende: ingen kollisjon her.
import * as THREE from 'three';

export function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const cv = (w, h = w) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

export function makeLook({ aniso = 4, low = false } = {}) {
  const tex = (c, srgb = true, rep = true) => {
    const t = new THREE.CanvasTexture(c);
    if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = aniso; return t;
  };
  // høydekart (lyst = høyt) → normal-kart. Kantene går rundt, så teksturen kan gjentas.
  const normalFrom = (c, strength = 2) => {
    const w = c.width, h = c.height, src = c.getContext('2d').getImageData(0, 0, w, h).data;
    const out = cv(w, h), g = out.getContext('2d'), img = g.createImageData(w, h), d = img.data;
    const H = (x, y) => src[(((y + h) % h) * w + ((x + w) % w)) * 4];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = (H(x + 1, y) - H(x - 1, y)) / 255 * strength, dy = (H(x, y + 1) - H(x, y - 1)) / 255 * strength, l = 1 / Math.hypot(dx, dy, 1), i = (y * w + x) * 4;
      d[i] = (-dx * l * 0.5 + 0.5) * 255; d[i + 1] = (dy * l * 0.5 + 0.5) * 255; d[i + 2] = (l * 0.5 + 0.5) * 255; d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0); return tex(out, false);
  };
  const heightFn = (S, fn, strength) => {                      // høyde gitt som funksjon (0..1) per piksel
    const c = cv(S), g = c.getContext('2d'), img = g.createImageData(S, S), d = img.data;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const v = Math.max(0, Math.min(1, fn(x, y))) * 255, i = (y * S + x) * 4; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
    g.putImageData(img, 0, 0); return normalFrom(c, strength);
  };
  // samme strek på flere lerret (farge, høyde, ruhet) med hver sin stil
  const stroke = (layers, pts, w) => { for (const [g, style, k = 1] of layers) { g.strokeStyle = style; g.lineWidth = w * k; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); } };
  const grainLine = (r, S, y, wob = 2.2) => { const pts = []; let yy = y; for (let x = -8; x <= S + 8; x += 14) { yy += (r() - 0.5) * wob + Math.sin(x * 0.02 + y) * 0.4; pts.push([x, yy]); } return pts; };

  // ---------- tregulv: planker med egen tone, årringer, kvister, riper og fuger (med relieff og ruhet) ----------
  const floor = (() => {
    const S = low ? 512 : 1024, k = S / 1024, c = cv(S), h = cv(S), ro = cv(S), g = c.getContext('2d'), gh = h.getContext('2d'), gr = ro.getContext('2d');
    const r = rng(21), n = 6, ph = S / n;
    gh.fillStyle = '#9a9a9a'; gh.fillRect(0, 0, S, S); gr.fillStyle = '#6c6c6c'; gr.fillRect(0, 0, S, S);
    for (let i = 0; i < n; i++) {
      const y0 = i * ph, t = 0.84 + r() * 0.16, warm = (r() - 0.5) * 14, joint = r() * S;
      for (const [half, x0, x1] of [[0, joint - S, joint], [1, joint, joint + S]]) {        // to bord per rad (skjøt), litt ulik tone
        const tt = t * (half ? 1 : 0.94 + r() * 0.1);
        g.save(); gh.save(); for (const q of [g, gh]) { q.beginPath(); q.rect(Math.max(0, x0), y0, Math.min(S, x1) - Math.max(0, x0), ph); q.clip(); }
        g.fillStyle = `rgb(${Math.round((203 + warm) * tt)},${Math.round(160 * tt)},${Math.round((112 - warm) * tt)})`; g.fillRect(0, y0, S, ph);
        for (let b = 0; b < 5; b++) { const by = y0 + r() * ph, bw = 8 + r() * 30; const lg = g.createLinearGradient(0, by - bw, 0, by + bw); lg.addColorStop(0, 'rgba(120,80,40,0)'); lg.addColorStop(0.5, `rgba(120,80,40,${0.04 + r() * 0.07})`); lg.addColorStop(1, 'rgba(120,80,40,0)'); g.fillStyle = lg; g.fillRect(0, by - bw, S, bw * 2); }
        for (let l = 0; l < 46; l++) { const a = 0.05 + r() * 0.16; stroke([[g, `rgba(105,66,32,${a})`], [gh, `rgba(0,0,0,${a * 0.5})`]], grainLine(r, S, y0 + r() * ph), (0.6 + r() * 1.7) * k); }
        if (r() < 0.75) {                                                                    // «katedral»-årringer
          const cx = Math.max(0, x0) + r() * S * 0.8, cy = y0 + ph * (0.3 + r() * 0.4), len = (140 + r() * 260) * k;
          for (let e = 1; e < 7; e++) { g.strokeStyle = `rgba(110,68,30,${0.1 + r() * 0.1})`; g.lineWidth = (1 + r()) * k; g.beginPath(); g.ellipse(cx, cy, len * e / 6, ph * 0.07 * e, 0, 0, 7); g.stroke(); }
        }
        if (r() < 0.45) {                                                                    // kvist
          const kx = Math.max(0, x0) + r() * S * 0.9, ky = y0 + ph * (0.25 + r() * 0.5), kr = (7 + r() * 9) * k;
          const rg = g.createRadialGradient(kx, ky, 1, kx, ky, kr * 1.6); rg.addColorStop(0, 'rgba(60,34,14,.85)'); rg.addColorStop(0.55, 'rgba(92,56,26,.5)'); rg.addColorStop(1, 'rgba(92,56,26,0)');
          g.fillStyle = rg; g.beginPath(); g.ellipse(kx, ky, kr * 2.2, kr * 1.2, 0, 0, 7); g.fill();
          for (let e = 1; e < 4; e++) { g.strokeStyle = 'rgba(70,40,18,.35)'; g.lineWidth = k; g.beginPath(); g.ellipse(kx, ky, kr * (1.2 + e * 0.9), kr * (0.7 + e * 0.45), 0, 0, 7); g.stroke(); }
          gh.fillStyle = 'rgba(0,0,0,.25)'; gh.beginPath(); gh.ellipse(kx, ky, kr, kr * 0.7, 0, 0, 7); gh.fill();
        }
        for (let p = 0; p < 260; p++) { const px = r() * S, py = y0 + r() * ph, pl = (5 + r() * 22) * k; g.fillStyle = `rgba(88,54,24,${0.08 + r() * 0.12})`; g.fillRect(px, py, pl, k); }   // porer
        g.restore(); gh.restore();
      }
      // fuger: lang skjøt mellom radene og kort skjøt mellom bordene (mørk stripe, senket og ru)
      const gap = (x, y, w, hh) => {
        g.fillStyle = 'rgba(52,30,12,.8)'; g.fillRect(x, y, w, hh); g.fillStyle = 'rgba(255,240,215,.16)'; if (w > hh) g.fillRect(x, y + hh, w, 1.5 * k); else g.fillRect(x + w, y, 1.5 * k, hh);
        const b = 5 * k; gh.fillStyle = 'rgba(0,0,0,.28)'; gh.fillRect(x - (w > hh ? 0 : b), y - (w > hh ? b : 0), w + (w > hh ? 0 : 2 * b), hh + (w > hh ? 2 * b : 0)); gh.fillStyle = '#000'; gh.fillRect(x, y, w, hh);
        gr.fillStyle = '#e8e8e8'; gr.fillRect(x, y, w, hh);
      };
      gap(0, y0, S, 3 * k); gap(joint, y0, 3 * k, ph);
    }
    for (let s = 0; s < 150; s++) {                                                          // bruksspor: fine riper på kryss og tvers (matter lakken)
      const x = r() * S, y = r() * S, a = r() * Math.PI, l = (20 + r() * 110) * k, pts = [[x, y], [x + Math.cos(a) * l, y + Math.sin(a) * l]];
      stroke([[g, `rgba(255,246,226,${0.05 + r() * 0.07})`], [gr, `rgba(255,255,255,${0.2 + r() * 0.3})`], [gh, 'rgba(0,0,0,.1)']], pts, k);
    }
    for (let s = 0; s < 28; s++) { const x = r() * S, y = r() * S, rr = (30 + r() * 90) * k, rg = gr.createRadialGradient(x, y, 1, x, y, rr); rg.addColorStop(0, `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},.16)`); rg.addColorStop(1, 'rgba(128,128,128,0)'); gr.fillStyle = rg; gr.fillRect(x - rr, y - rr, rr * 2, rr * 2); }   // slitt og blankt om hverandre
    return { map: tex(c), normalMap: low ? null : normalFrom(h, 2.6), roughnessMap: tex(ro, false) };
  })();

  // ---------- malt vegg: svak sjattering og «appelsinhud» fra malerullen ----------
  const blobs = (S, seed, n, r0, r1, a) => { const c = cv(S), g = c.getContext('2d'), r = rng(seed); g.fillStyle = '#808080'; g.fillRect(0, 0, S, S);
    for (let i = 0; i < n; i++) { const x = r() * S, y = r() * S, rr = r0 + r() * (r1 - r0), col = r() < 0.5 ? '255,255,255' : '0,0,0';
      for (const [ox, oy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) { if (x + ox + rr < 0 || x + ox - rr > S || y + oy + rr < 0 || y + oy - rr > S) continue; const rg = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rr); rg.addColorStop(0, `rgba(${col},${a})`); rg.addColorStop(1, `rgba(${col},0)`); g.fillStyle = rg; g.fillRect(x + ox - rr, y + oy - rr, rr * 2, rr * 2); } }
    return c; };
  const plaster = (() => {
    const S = 256, c = cv(S), g = c.getContext('2d'), r = rng(3); g.fillStyle = '#f3eee4'; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(120,100,80,${r() * 0.05})`; g.fillRect(r() * S, r() * S, 2, 2); }
    for (let i = 0; i < 14; i++) { const x = r() * S, y = r() * S, rr = 30 + r() * 60, rg = g.createRadialGradient(x, y, 0, x, y, rr); rg.addColorStop(0, `rgba(${r() < 0.5 ? '255,250,240' : '150,130,105'},.07)`); rg.addColorStop(1, 'rgba(128,128,128,0)'); g.fillStyle = rg; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
    return { map: tex(c), normalMap: low ? null : normalFrom(blobs(S, 5, 2600, 2, 6, 0.5), 0.7) };
  })();

  // ---------- flis: senket fuge med avrundet kant, litt ujevn glasur ----------
  const tile = (() => {
    const S = 256, c = cv(S), g = c.getContext('2d'), h = cv(S), gh = h.getContext('2d'), ro = cv(S), gr = ro.getContext('2d'), r = rng(11);
    g.fillStyle = '#c9c8c0'; g.fillRect(0, 0, S, S);
    const lg = g.createLinearGradient(0, 0, S, S); lg.addColorStop(0, '#fbfbf8'); lg.addColorStop(1, '#eeece5'); g.fillStyle = lg; g.fillRect(5, 5, S - 10, S - 10);
    for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(110,105,95,${r() * 0.12})`; g.fillRect(r() < 0.5 ? r() * 5 : S - r() * 5, r() * S, 1.5, 1.5); g.fillRect(r() * S, r() < 0.5 ? r() * 5 : S - r() * 5, 1.5, 1.5); }   // skitt i fugen
    gh.fillStyle = '#000'; gh.fillRect(0, 0, S, S);
    for (let b = 0; b < 8; b++) { const v = Math.round(255 * Math.sin((b + 1) / 8 * Math.PI / 2)); gh.fillStyle = `rgb(${v},${v},${v})`; gh.fillRect(4 + b, 4 + b, S - 8 - 2 * b, S - 8 - 2 * b); }
    gr.fillStyle = '#f0f0f0'; gr.fillRect(0, 0, S, S); gr.fillStyle = '#262626'; gr.fillRect(6, 6, S - 12, S - 12);
    return { map: tex(c), normalMap: low ? null : normalFrom(h, 1.6), roughnessMap: tex(ro, false) };
  })();

  // ---------- møbeltre ----------
  const wood = (() => {
    const S = 512, c = cv(S), g = c.getContext('2d'), h = cv(S), gh = h.getContext('2d'), r = rng(7);
    g.fillStyle = '#ebe5dc'; g.fillRect(0, 0, S, S); gh.fillStyle = '#909090'; gh.fillRect(0, 0, S, S);
    for (let l = 0; l < 300; l++) { const a = 0.04 + r() * 0.14; stroke([[g, `rgba(90,60,30,${a})`], [gh, `rgba(0,0,0,${a * 0.6})`]], grainLine(r, S, r() * S), 0.6 + r() * 1.8); }
    for (let k = 0; k < 3; k++) { const x = r() * S, y = r() * S, rg = g.createRadialGradient(x, y, 1, x, y, 20); rg.addColorStop(0, 'rgba(80,50,25,.45)'); rg.addColorStop(1, 'rgba(80,50,25,0)'); g.fillStyle = rg; g.beginPath(); g.ellipse(x, y, 32, 12, 0, 0, 7); g.fill(); }
    return { map: tex(c), normalMap: low ? null : normalFrom(h, 1.4) };
  })();

  const pages = (() => { const S = 128, c = cv(S), g = c.getContext('2d'), r = rng(9); g.fillStyle = '#efe6cf'; g.fillRect(0, 0, S, S);
    for (let y = 0; y < S; y += 2) { g.fillStyle = `rgba(120,100,70,${0.08 + r() * 0.16})`; g.fillRect(0, y, S, 1); }
    return tex(c); })();

  // ---------- stoff og lær (relieff): vev = tråder som går over og under hverandre ----------
  const weave = low ? null : heightFn(64, (x, y) => { const p = 8, a = Math.abs(Math.sin(Math.PI * x / p)), b = Math.abs(Math.sin(Math.PI * y / p)), over = (Math.floor(x / p) + Math.floor(y / p)) % 2; return over ? 0.35 + 0.6 * a * (0.6 + 0.4 * b) : 0.35 + 0.6 * b * (0.6 + 0.4 * a); }, 2.2);
  const twill = low ? null : heightFn(64, (x, y) => 0.5 + 0.4 * Math.sin((x + y) * Math.PI / 4) * (0.7 + 0.3 * Math.sin((x - y) * Math.PI / 16)), 1.8);      // dongeri: skrå ribber
  const knit = low ? null : heightFn(64, (x, y) => { const u = (x % 16) / 16, v = ((y + (Math.floor(x / 16) % 2) * 0) % 16) / 16; return 0.25 + 0.7 * Math.abs(Math.sin(Math.PI * u)) * (0.55 + 0.45 * Math.sin(Math.PI * 2 * (v + Math.abs(u - 0.5)))); }, 2.6);   // strikk: V-masker
  const leather = low ? null : normalFrom(blobs(128, 17, 900, 3, 9, 0.55), 1.5);
  const rep = (t, x, y = x) => { if (!t) return null; const c = t.clone(); c.repeat.set(x, y); c.needsUpdate = true; return c; };

  // ---------- bok: permer med tittel, avrundet rygg og sideblokk ----------
  const TITLES = ['EVENTYR', 'REISEN', 'ATLAS', 'TROLL', 'NORDLYS', 'SKATTEN', 'DYRENE', 'HAVET'];
  function coverTex(color, seed, spine) {
    const W = spine ? 64 : 256, H = spine ? 256 : 320, c = cv(W, H), g = c.getContext('2d'), r = rng(seed * 977 + 13), col = new THREE.Color(color), css = `#${col.getHexString()}`;
    g.fillStyle = css; g.fillRect(0, 0, W, H);
    for (let i = 0; i < (spine ? 500 : 2600); i++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},${r() * 0.07})`; g.fillRect(r() * W, r() * H, 2, 2); }      // lerret
    const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.28)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);   // slitte, mørkere kanter
    const gold = 'rgba(232,200,120,.92)', title = TITLES[seed % TITLES.length];
    g.strokeStyle = gold; g.fillStyle = gold; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (spine) {
      for (const y of [22, 30, H - 30, H - 22]) g.fillRect(4, y, W - 8, 3);
      g.save(); g.translate(W / 2, H / 2); g.rotate(Math.PI / 2); g.font = '700 26px Georgia, serif'; g.fillText(title, 0, 2, H - 90); g.restore();
    } else {
      g.lineWidth = 4; g.strokeRect(18, 18, W - 36, H - 36); g.lineWidth = 1.5; g.strokeRect(27, 27, W - 54, H - 54);
      g.font = '700 34px Georgia, serif'; g.fillText(title, W / 2, H * 0.32, W - 70);
      g.fillRect(W / 2 - 46, H * 0.42, 92, 2.5);
      g.save(); g.translate(W / 2, H * 0.62); g.rotate(Math.PI / 4); g.lineWidth = 3; g.strokeRect(-22, -22, 44, 44); g.strokeRect(-11, -11, 22, 22); g.restore();   // ornament
      g.font = '15px Georgia, serif'; g.fillText('· tinylittleme ·', W / 2, H * 0.86);
    }
    return tex(c, true, false);
  }
  function buildBook(sx, sy, sz, color, seed = 1) {
    const dims = [sx, sy, sz], t = dims.indexOf(Math.min(sx, sy, sz));
    const [W, T, Ln] = t === 1 ? [sx, sy, sz] : t === 0 ? [sz, sx, sy] : [sx, sz, sy];
    const g = new THREE.Group(), std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.86, normalMap: rep(weave, W * 3.5, Ln * 3.5), normalScale: new THREE.Vector2(0.45, 0.45), ...o });
    const cloth = std({ color }), cover = std({ map: coverTex(color, seed, false) }), spineM = std({ map: coverTex(color, seed, true), normalMap: rep(weave, T * 3.5, Ln * 3.5) });
    const bt = Math.max(0.05, Math.min(0.14, T * 0.08)), sd = Math.min(T * 0.3, 0.28), ins = Math.min(0.14, W * 0.05);
    const add = (m, sh = true) => { m.castShadow = sh; m.receiveShadow = true; g.add(m); return m; };
    for (const s of [1, -1]) { const bd = add(new THREE.Mesh(new THREE.BoxGeometry(W - sd * 0.5, bt, Ln), [cloth, cloth, s > 0 ? cover : cloth, s < 0 ? cover : cloth, cloth, cloth])); bd.position.set(sd * 0.25, s * (T / 2 - bt / 2), 0); }
    const sp = add(new THREE.Mesh(new THREE.CylinderGeometry(T / 2, T / 2, Ln, 14, 1, false, Math.PI, Math.PI), spineM)); sp.rotation.x = Math.PI / 2; sp.scale.set(sd / (T / 2), 1, 1); sp.position.x = -W / 2 + sd;
    const pm = pages.clone(); pm.repeat.set(1, Math.max(1, T * 1.6)); pm.needsUpdate = true;
    const pg = add(new THREE.Mesh(new THREE.BoxGeometry(W - sd - ins, T - 2 * bt, Ln - 2 * ins), new THREE.MeshStandardMaterial({ map: pm, roughness: 0.95 })), false); pg.position.x = (sd - ins) / 2;
    const band = add(new THREE.Mesh(new THREE.BoxGeometry(0.06, T - 2 * bt + 0.01, Ln - 2 * ins + 0.03), new THREE.MeshStandardMaterial({ color: 0xb8322a, roughness: 0.8 })), false); band.position.x = -W / 2 + sd + 0.03;   // kapitélbånd
    if (t !== 1) g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(...(t === 0
      ? [new THREE.Vector3(0, 0, -1), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 1, 0)]
      : [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0)])));
    return g;
  }

  // ---------- kontaktskygge: myk mørk kant der en ting står på noe (9-delt flate med fast kantbredde) ----------
  const aoTex = (() => { const S = 96, c = cv(S), g = c.getContext('2d'), img = g.createImageData(S, S), d = img.data, f = (v) => { const e = Math.min(1, Math.min(v, S - 1 - v) / (S / 3)); return e * e * (3 - 2 * e); };
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const i = (y * S + x) * 4; d[i + 3] = 255 * f(x) * f(y); }
    g.putImageData(img, 0, 0); return new THREE.CanvasTexture(c); })();
  const aoMat = new THREE.MeshBasicMaterial({ map: aoTex, color: 0x1a120a, transparent: true, opacity: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  function contactShadow(sx, sz, m = 0.8) {
    const geo = new THREE.PlaneGeometry(1, 1, 3, 3), p = geo.attributes.position;
    const xs = [-sx / 2 - m, -sx / 2 + Math.min(m, sx * 0.3), sx / 2 - Math.min(m, sx * 0.3), sx / 2 + m], zs = [sz / 2 + m, sz / 2 - Math.min(m, sz * 0.3), -sz / 2 + Math.min(m, sz * 0.3), -sz / 2 - m];
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) p.setXYZ(j * 4 + i, xs[i], zs[j], 0);
    const mesh = new THREE.Mesh(geo, aoMat); mesh.rotation.x = -Math.PI / 2; mesh.renderOrder = 1; return mesh;
  }
  // mørkere inn mot veggen (gulv og vegg møtes): en stripe med toning
  const gradTex = (() => { const c = cv(4, 64), g = c.getContext('2d'), lg = g.createLinearGradient(0, 0, 0, 64); lg.addColorStop(0, 'rgba(0,0,0,1)'); lg.addColorStop(0.35, 'rgba(0,0,0,.45)'); lg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = lg; g.fillRect(0, 0, 4, 64); return new THREE.CanvasTexture(c); })();
  function edgeShade(len, w, opacity = 0.34) { const m = new THREE.Mesh(new THREE.PlaneGeometry(len, w), new THREE.MeshBasicMaterial({ map: gradTex, color: 0x20160c, transparent: true, opacity, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })); m.renderOrder = 1; return m; }

  // ---------- støv i lufta: små lyse korn som driver rolig rundt kameraet (gir luft og målestokk) ----------
  function makeDust(n = 140, R = 9) {
    const r = rng(77), pos = new Float32Array(n * 3), seed = new Float32Array(n * 3);
    for (let i = 0; i < n * 3; i++) { pos[i] = (r() - 0.5) * 2 * R; seed[i] = r() * 6.283; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const dot = cv(32), g = dot.getContext('2d'), rg = g.createRadialGradient(16, 16, 0, 16, 16, 16); rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.4, 'rgba(255,255,255,.35)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.fillRect(0, 0, 32, 32);
    const points = new THREE.Points(geo, new THREE.PointsMaterial({ map: new THREE.CanvasTexture(dot), color: 0xfff2d8, size: 0.07, transparent: true, opacity: 0.55, depthWrite: false, sizeAttenuation: true }));
    points.frustumCulled = false;
    const base = pos.slice(), wrap = (v) => ((v + R) % (2 * R) + 2 * R) % (2 * R) - R;
    return { points, update(sec, cx, cy, cz) {                                              // kornene «bor» i verden, men pakkes rundt kameraet så det alltid er noen nær
      const a = geo.attributes.position;
      for (let i = 0; i < n; i++) { const j = i * 3;
        a.array[j] = cx + wrap(base[j] + Math.sin(sec * 0.11 + seed[j]) * 0.9 + sec * 0.05 - cx);
        a.array[j + 1] = cy + wrap(base[j + 1] + Math.sin(sec * 0.13 + seed[j + 1]) * 0.5 - sec * 0.03 - cy) * 0.6;
        a.array[j + 2] = cz + wrap(base[j + 2] + Math.cos(sec * 0.09 + seed[j + 2]) * 0.9 - cz); }
      a.needsUpdate = true; } };
  }

  // ---------- vindu: himmel, sky og litt grønt utenfor (ikke bare en lys flate) ----------
  function skyTex() {
    const W = 256, H = 320, c = cv(W, H), g = c.getContext('2d'), r = rng(31), lg = g.createLinearGradient(0, 0, 0, H);
    lg.addColorStop(0, '#bfe0ff'); lg.addColorStop(0.55, '#eaf5ff'); lg.addColorStop(0.75, '#fff6dc'); lg.addColorStop(1, '#fdeec6'); g.fillStyle = lg; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 9; i++) { const x = r() * W, y = 30 + r() * H * 0.45, rr = 26 + r() * 46, rg = g.createRadialGradient(x, y, 2, x, y, rr); rg.addColorStop(0, 'rgba(255,255,255,.9)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.beginPath(); g.ellipse(x, y, rr * 1.6, rr * 0.7, 0, 0, 7); g.fill(); }
    for (let i = 0; i < 26; i++) { const x = r() * W, y = H - r() * 70, rr = 18 + r() * 34, rg = g.createRadialGradient(x, y, 2, x, y, rr); rg.addColorStop(0, `rgba(${140 + r() * 40},${190 + r() * 30},${120 + r() * 30},.85)`); rg.addColorStop(1, 'rgba(170,205,140,0)'); g.fillStyle = rg; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
    return tex(c, true, false);
  }

  return { floor, plaster, tile, wood, pages, weave, twill, knit, leather, rep, buildBook, contactShadow, edgeShade, makeDust, skyTex };
}
