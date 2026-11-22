// R132: spøkelsesbro i verden (logikk i buildghostw_logic.js). Ett stiplet, gjennomsiktig, rolig pulserende omriss av det som skal bygges mellom FRA og TIL,
// tegnet i samme farger som FRA/TIL (grønn til gul). Lavt tegnebudsjett: per sted to mesh (én flatemesh og én linjemesh, delt materiale), ingen skygge, ingen fysikk;
// bare stedet nærmest figuren er synlig.
import * as THREE from 'three';
import { GHOST, ghostBuffers } from './buildghostw_logic.js';

const nd = (o) => { o.userData.noDetail = true; o.castShadow = false; o.receiveShadow = false; o.frustumCulled = false; return o; };

export function createGhostWorldView({ scene, sites, getOn = () => true }) {
  const lineMat = new THREE.LineDashedMaterial({ vertexColors: true, dashSize: GHOST.dash, gapSize: GHOST.gap, transparent: true, opacity: GHOST.lineOp[1], depthWrite: false, fog: false });
  const fillMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: GHOST.fillOp[0], depthWrite: false, side: THREE.DoubleSide, fog: false });
  const items = sites.map((s) => {
    const b = ghostBuffers(s), g = new THREE.Group(); g.visible = false; g.name = 'ghostWorld:' + s.id;
    const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(b.tri, 3)); fg.setAttribute('color', new THREE.Float32BufferAttribute(b.triCol, 3));
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(b.line, 3)); lg.setAttribute('color', new THREE.Float32BufferAttribute(b.lineCol, 3));
    const fill = nd(new THREE.Mesh(fg, fillMat)), line = nd(new THREE.LineSegments(lg, lineMat)); line.computeLineDistances(); fill.renderOrder = 6; line.renderOrder = 7;
    g.add(fill, line); scene.add(g); return { s, g, b };
  });
  let shown = null, t = 0;
  // Kalles hver ramme med id på stedet som skal vises (eller null). Retur: id som vises.
  function update(dt, id) {
    t += dt; const want = getOn() ? id : null;
    for (const it of items) { const on = it.s.id === want; if (it.g.visible !== on) it.g.visible = on; }
    if (want) { const k = 0.5 + 0.5 * Math.sin(t * 2.2); fillMat.opacity = GHOST.fillOp[0] + (GHOST.fillOp[1] - GHOST.fillOp[0]) * k; lineMat.opacity = GHOST.lineOp[0] + (GHOST.lineOp[1] - GHOST.lineOp[0]) * k; }
    shown = want; return want;
  }
  function stats() {
    let draw = 0, shadow = 0, tris = 0; const it = items.find((q) => q.s.id === shown);
    if (it) { it.g.traverse((o) => { if (o.isMesh || o.isLine) { draw++; if (o.castShadow || o.receiveShadow) shadow++; } }); tris = it.b.tris; }
    return { shown, draw, shadow, tris, sites: items.length, kind: it ? it.b.kind : null };
  }
  // Omrisset projisert til skjermen (-1..1): { x0, x1, y0, y1, inFront } eller null. Brukes i live-testen for å bevise at omrisset faktisk er i kamerabildet.
  function screenBox(camera) {
    const it = items.find((q) => q.s.id === shown); if (!it) return null;
    const v = new THREE.Vector3(); let x0 = 9, x1 = -9, y0 = 9, y1 = -9, front = 0, n = 0;
    for (let i = 0; i < it.b.line.length; i += 3) { v.set(it.b.line[i], it.b.line[i + 1], it.b.line[i + 2]).project(camera); n++; if (v.z > 1) continue; front++; x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); }
    return { x0, x1, y0, y1, inFront: front / Math.max(1, n) };
  }
  return { update, stats, screenBox, get shown() { return shown; }, groups: items.map((q) => q.g), dispose() { for (const it of items) scene.remove(it.g); } };
}
