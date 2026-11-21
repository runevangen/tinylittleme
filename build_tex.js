// R117: teksturer og geometri for bygde deler i verdenen (three.js). Prosedyre-teksturer på canvas, én tekstur og ett materiale per familie (og farge), ikke per del.
// Logikken (familie, flisestørrelse, tone, knotter) står i build_tex_logic.js. Ingen normalkart: trekornet og børstingen er malt inn, det holder på mobil og koster ingen ekstra tekstur.
import { rng, hashStr } from './atmos_logic.js';
import { texKind, hasKnobs, TILE, SURF, faceRepeats, toneFor, uvOffset, knobGrid, KNOB_R, KNOB_H } from './build_tex_logic.js';

// tegneoppskrifter: [bredde, høyde i piksler, funksjon(ctx, w, h, r)]. Nøytrale, lyse bilder: delens farge ganges inn av materialet.
const DRAW = {
  wood: [512, 64, (g, w, h, r) => {
    g.fillStyle = '#f3e9d9'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 46; i++) {   // årer: bølgete linjer med et helt antall perioder, så flisen går rundt
      const y0 = r() * h, amp = 0.8 + r() * 2.4, cyc = 1 + Math.floor(r() * 3), ph = r() * 6.28, a = 0.06 + r() * 0.17; g.lineWidth = 0.6 + r() * 1.3; g.strokeStyle = `rgba(88,54,24,${a})`;
      for (const off of [-h, 0, h]) { g.beginPath(); for (let x = 0; x <= w; x += 8) { const y = y0 + off + Math.sin(x / w * 6.2832 * cyc + ph) * amp; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
    }
    for (let k = 0; k < 2; k++) {   // kvister
      const cx = 70 + r() * (w - 140), cy = 14 + r() * (h - 28), rx = 9 + r() * 7, ry = 4 + r() * 3;
      for (let q = 5; q >= 1; q--) { g.strokeStyle = `rgba(70,40,18,${0.14 + (5 - q) * 0.06})`; g.lineWidth = 1; g.beginPath(); g.ellipse(cx, cy, rx * q / 3, ry * q / 3, 0, 0, 6.2832); g.stroke(); }
      g.fillStyle = 'rgba(70,40,18,.35)'; g.beginPath(); g.ellipse(cx, cy, 3, 1.6, 0, 0, 6.2832); g.fill();
    }
  }],
  steel: [256, 32, (g, w, h, r) => {
    g.fillStyle = '#d9dde2'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 160; i++) { const y = r() * h, l = 30 + r() * 120, x = r() * w, v = r() < 0.5 ? 255 : 120; g.strokeStyle = `rgba(${v},${v},${v + 6},${0.1 + r() * 0.16})`; g.lineWidth = 0.5 + r() * 0.7; for (const dx of [-w, 0]) { g.beginPath(); g.moveTo(x + dx, y); g.lineTo(x + dx + l, y); g.stroke(); } }
    g.fillStyle = 'rgba(255,255,255,.95)'; g.fillRect(0, 0, w, 2); g.fillRect(0, h - 2, w, 2);   // lys kant øverst og nederst
    g.fillStyle = 'rgba(60,70,85,.28)'; g.fillRect(0, 2, w, 2); g.fillRect(0, h - 4, w, 2);
  }],
  rope: [128, 32, (g, w, h) => {
    g.fillStyle = '#e8d9b5'; g.fillRect(0, 0, w, h);
    for (let i = -2; i < 12; i++) {   // flettet: skrå tråder med skygge, helt antall per flis
      const x = i * (w / 8); g.strokeStyle = 'rgba(90,62,24,.55)'; g.lineWidth = 3.2; g.beginPath(); g.moveTo(x, h); g.lineTo(x + h * 0.9, 0); g.stroke();
      g.strokeStyle = 'rgba(255,245,215,.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 4, h); g.lineTo(x + 4 + h * 0.9, 0); g.stroke();
    }
    g.fillStyle = 'rgba(60,40,15,.3)'; g.fillRect(0, 0, w, 2); g.fillRect(0, h - 2, w, 2);
  }],
  plastic: [64, 64, (g, w, h, r) => {
    g.fillStyle = '#f4f4f4'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 160; i++) { const v = r() < 0.5 ? 0 : 255; g.fillStyle = `rgba(${v},${v},${v},${0.03 + r() * 0.05})`; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); }
  }],
  pencil: [128, 32, (g, w, h) => {
    g.fillStyle = '#fbfbfb'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? 'rgba(0,0,0,.09)' : 'rgba(255,255,255,.4)'; g.fillRect(0, i * h / 6, w, h / 6); }   // seks flater langs blyanten
    g.fillStyle = 'rgba(0,0,0,.25)'; for (let i = 1; i < 6; i++) g.fillRect(0, i * h / 6 - 0.5, w, 1);
  }],
  ruler: [256, 32, (g, w, h) => {
    g.fillStyle = '#f7f3e2'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(40,40,40,.75)';
    for (let i = 0; i < 10; i++) { const x = i * w / 10 + 1, big = i % 5 === 0; g.fillRect(x, 0, 1.5, big ? h * 0.5 : h * 0.3); }   // tidel-merker: ti per flis (0,25 enheter)
    g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(0, h - 3, w, 3);
  }],
  cloth: [64, 64, (g, w, h) => {
    g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < w; i += 4) { g.fillStyle = 'rgba(0,0,0,.07)'; g.fillRect(i, 0, 1.5, h); g.fillRect(0, i, w, 1.5); }   // vevd bokbind
  }],
  sponge: [64, 64, (g, w, h, r) => {
    g.fillStyle = '#fdf6d2'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 46; i++) { const x = r() * w, y = r() * h, s = 1.5 + r() * 3.2; for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) { g.fillStyle = 'rgba(120,90,10,.34)'; g.beginPath(); g.ellipse(x + dx, y + dy, s, s * 0.8, 0, 0, 6.2832); g.fill(); g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.ellipse(x + dx - 0.6, y + dy - 0.6, s * 0.5, s * 0.4, 0, 0, 6.2832); g.fill(); } }
  }],
};

// Alt som three trenger går inn: THREE (modul), make(w,h) lager et canvas (nettleser: document, test: attrapp). low = halv oppløsning (Enkel grafikk / Lav profil).
export function createBuildTex(THREE, { make, low = false, aniso = 4 } = {}) {
  const texs = new Map(), mats = new Map(), geos = new Set();
  function texture(kind) {
    let t = texs.get(kind); if (t) return t;
    const [w0, h0, fn] = DRAW[kind], k = low ? 0.5 : 1, w = Math.max(16, Math.round(w0 * k)), h = Math.max(16, Math.round(h0 * k)), c = make(w0, h0);
    fn(c.getContext('2d'), w0, h0, rng(hashStr('tex:' + kind)));
    t = new THREE.CanvasTexture(low ? shrink(c, w, h) : c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso;
    t.userData = { bytes: w * h * 4 * 1.33 }; texs.set(kind, t); return t;
  }
  function shrink(c, w, h) { const o = make(w, h); o.getContext('2d').drawImage(c, 0, 0, w, h); return o; }
  // ett materiale per familie og farge (delene i samme familie og farge deler det). Tonevariasjon per del ligger i hjørnefargene (vertexColors), ikke i materialet.
  function material(type, color) {
    const kind = texKind(type), key = kind + ':' + color; let m = mats.get(key); if (m) return m;
    const s = SURF[kind]; m = new THREE.MeshStandardMaterial({ map: texture(kind), color, roughness: s.rough, metalness: type === 'weight' ? 0.25 : s.metal, vertexColors: true });
    m.userData.buildTex = kind; mats.set(key, m); return m;
  }
  // boks med UV i verdensenheter (flis per familie, forskjøvet per del), tone som hjørnefarge, og knotter (flettet inn i samme geometri) på klosser
  function geometry(type, w, h, d, id) {
    const kind = texKind(type), g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv, reps = faceRepeats(kind, w, h, d), off = uvOffset(id);
    for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const j = f * 4 + i; uv.setXY(j, uv.getX(j) * reps[f].u + off.u, uv.getY(j) * reps[f].v + off.v); }
    let out = g;
    if (hasKnobs(type)) out = withKnobs(g, w, h, d, kind, off);
    const n = out.attributes.position.count, tone = toneFor(id), col = new Float32Array(n * 3).fill(tone); out.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geos.add(out); return out;
  }
  function withKnobs(box, w, h, d, kind, off) {
    const parts = [box], [tu, tv] = TILE[kind];
    for (const k of knobGrid(w, d)) {
      const c = new THREE.CylinderGeometry(KNOB_R, KNOB_R, KNOB_H, 8, 1); c.translate(k.x, h / 2 + KNOB_H / 2, k.z);
      const uv = c.attributes.uv; for (let j = 0; j < uv.count; j++) uv.setXY(j, (w / 2 + k.x) / tu + uv.getX(j) * 0.3 + off.u, (d / 2 + k.z) / tv + uv.getY(j) * 0.3 + off.v);
      parts.push(c);
    }
    const names = ['position', 'normal', 'uv'], n = parts.reduce((a, p) => a + p.attributes.position.count, 0), idxN = parts.reduce((a, p) => a + p.index.count, 0);
    const out = new THREE.BufferGeometry(), idx = new Uint32Array(idxN); let base = 0, ip = 0;
    for (const nm of names) { const sz = box.attributes[nm].itemSize, arr = new Float32Array(n * sz); let o = 0; for (const p of parts) { arr.set(p.attributes[nm].array, o); o += p.attributes[nm].array.length; } out.setAttribute(nm, new THREE.BufferAttribute(arr, sz)); }
    for (const p of parts) { for (let i = 0; i < p.index.count; i++) idx[ip++] = p.index.array[i] + base; base += p.attributes.position.count; p.dispose?.(); }
    out.setIndex(new THREE.BufferAttribute(idx, 1)); return out;
  }
  // tall til rapport og test: antall materialer/teksturer og teksturminne (byte)
  const stats = () => ({ textures: texs.size, materials: mats.size, bytes: [...texs.values()].reduce((a, t) => a + (t.userData?.bytes || 0), 0) });
  const dispose = () => { for (const t of texs.values()) t.dispose?.(); for (const m of mats.values()) m.dispose?.(); texs.clear(); mats.clear(); };
  return { texture, material, geometry, stats, dispose, isShared: (m) => !!m?.userData?.buildTex };
}
