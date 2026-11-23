// R118: FRA og TIL i verdenen ved byggestedet (logikk i buildspan_logic.js). To lysende, lett pulserende markører (ring på underlaget + stolpe + skilt som vender mot kameraet)
// og en stiplet bue mellom dem. Lavt tegnebudsjett: delte geometrier, materialer og to små teksturer (én per markørtype), ingen skygge, bare stedet nærmest figuren er synlig.
import * as THREE from 'three';
import { SPAN, spanOf, spanSite, spanVisible, arcPoints } from './buildspan_logic.js';

const nd = (o) => { o.userData.noDetail = true; o.castShadow = false; o.receiveShadow = false; return o; };   // ingen skygge og ingen kornfilter (look.detailize)
function signTex(text, col) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 112; const g = c.getContext('2d');
  g.fillStyle = 'rgba(12,18,32,.88)'; g.strokeStyle = col; g.lineWidth = 8;
  const r = 22; g.beginPath(); g.moveTo(r + 4, 4); g.lineTo(252 - r, 4); g.quadraticCurveTo(252, 4, 252, 4 + r); g.lineTo(252, 108 - r); g.quadraticCurveTo(252, 108, 252 - r, 108); g.lineTo(4 + r, 108); g.quadraticCurveTo(4, 108, 4, 108 - r); g.lineTo(4, 4 + r); g.quadraticCurveTo(4, 4, 4 + r, 4); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = col; g.font = '800 62px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 128, 60);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function createSpanView({ scene, sites, T, getOn = () => true }) {
  const ringGeo = new THREE.RingGeometry(1.1, 1.8, 40), poleGeo = new THREE.CylinderGeometry(0.13, 0.13, 3.6, 6), flagGeo = new THREE.BufferGeometry();
  flagGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 3.6, 0, 1.6, 3.1, 0, 0, 2.6, 0], 3));
  const cols = { from: new THREE.Color(SPAN.colFrom), to: new THREE.Color(SPAN.colTo) };
  const mk = (kind) => ({
    ring: new THREE.MeshBasicMaterial({ color: cols[kind], transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide, fog: false }),
    pole: new THREE.MeshBasicMaterial({ color: cols[kind], fog: false }),
    sign: new THREE.SpriteMaterial({ map: signTex(T('span.' + kind), SPAN['col' + (kind === 'from' ? 'From' : 'To')]), transparent: true, depthWrite: false, fog: false }),
  });
  const M = { from: mk('from'), to: mk('to') };
  const lineMat = new THREE.LineDashedMaterial({ vertexColors: true, dashSize: 0.9, gapSize: 0.7, transparent: true, opacity: 0.95, fog: false });
  const flagMat = new THREE.MeshBasicMaterial({ color: cols.to, side: THREE.DoubleSide, fog: false });

  const items = sites.map((s) => {
    const sp = spanOf(s), g = new THREE.Group(); g.visible = false; g.name = 'spanMarkers:' + s.id;
    const mark = (kind, w) => {
      const m = M[kind], ring = nd(new THREE.Mesh(ringGeo, m.ring)); ring.rotation.x = -Math.PI / 2; ring.position.set(w.x, w.y + 0.08, w.z);
      const pole = nd(new THREE.Mesh(poleGeo, m.pole)); pole.position.set(w.x, w.y + 1.8, w.z);
      const sign = nd(new THREE.Sprite(m.sign)); sign.position.set(w.x, w.y + 4.6, w.z); sign.scale.set(3.2, 1.4, 1); sign.renderOrder = 8;
      g.add(ring, pole, sign);
      if (kind === 'to') { const fl = nd(new THREE.Mesh(flagGeo, flagMat)); fl.position.set(w.x, w.y, w.z); g.add(fl); }
      return ring;
    };
    const r1 = mark('from', sp.w.from), r2 = mark('to', sp.w.to);
    const pts = arcPoints(sp.w.from, sp.w.to), geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts.flatMap((p) => [p.x, p.y, p.z]), 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(pts.flatMap((_, i) => { const t = i / (pts.length - 1); return [cols.from.r + (cols.to.r - cols.from.r) * t, cols.from.g + (cols.to.g - cols.from.g) * t, cols.from.b + (cols.to.b - cols.from.b) * t]; }), 3));
    const line = nd(new THREE.Line(geo, lineMat)); line.computeLineDistances(); if (SPAN.arc) g.add(line);
    scene.add(g); return { s, sp, g, r1, r2 };
  });

  let shown = null, t = 0;
  // Kalles hver ramme. Retur: id på stedet som vises (eller null) så kalleren kan logge og lage veiledning.
  function update(dt, { player, playing, buildOpen, expert, help, camera }) {
    t += dt;
    const near = spanSite(sites, player), vis = near && spanVisible({ on: getOn(), buildOpen, playing, expert, help, inRange: true });
    const id = vis ? near.id : null;
    for (const it of items) { const on = it.s.id === id; if (it.g.visible !== on) it.g.visible = on; }
    if (id) {
      const it = items.find((q) => q.s.id === id), k = 1 + 0.12 * Math.sin(t * 3), o = 0.62 + 0.28 * Math.sin(t * 3);
      it.r1.scale.setScalar(k); it.r2.scale.setScalar(k); M.from.ring.opacity = o; M.to.ring.opacity = o; lineMat.dashSize = 0.9; void camera;
    }
    shown = id; return id;
  }
  // For test og rapport: hva som tegnes nå (ingen skygge, tegnekall = synlige mesh/sprite/linje).
  function stats() {
    let draw = 0, shadow = 0; const it = items.find((q) => q.s.id === shown);
    if (it) it.g.traverse((o) => { if (o.isMesh || o.isSprite || o.isLine) { draw++; if (o.castShadow || o.receiveShadow) shadow++; } });
    return { shown, draw, shadow, sites: items.length };
  }
  return { update, stats, get shown() { return shown; }, groups: items.map((q) => q.g), dispose() { for (const it of items) scene.remove(it.g); } };
}
