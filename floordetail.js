// Gulvdetaljer (R13): tegner småtingene fra floordetail_logic.js (blyantstumper, viskelær, perler, smulehauger, flekker, skitt i fugene).
// Bare utseende, ingen kollisjon. Delte materialer, så main.js kan slå meshene sammen til få tegnekall (mergeStatic).
import * as THREE from 'three';
import { pickDetails, detailCount, hashStr } from './floordetail_logic.js';

const cv = (w) => { const c = document.createElement('canvas'); c.width = c.height = w; return c; };

export function makeFloorDetail({ scene, LEVEL, floorY, quality = 'high', density = 1, name = 'x' }) {
  const group = new THREE.Group(); group.name = 'floordetail'; scene.add(group);
  const n = detailCount(LEVEL.room, quality, density);
  if (!n) return { group, count: 0, spots: [], update(on) { group.visible = on; } };
  const spots = pickDetails(LEVEL, floorY, hashStr(name + ':fd'), { count: n, ring: 6 });
  // mykt flekk-bilde (radial, litt ujevn kant), delt av alle flekker
  const blob = (() => { const c = cv(64), g = c.getContext('2d'), rg = g.createRadialGradient(32, 32, 2, 32, 32, 30); rg.addColorStop(0, 'rgba(255,255,255,.95)'); rg.addColorStop(0.6, 'rgba(255,255,255,.55)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  // få materialer = få tegnekall (main.js slår meshes med samme materiale sammen); ti materialer til sammen for hele gulvet
  const std = (col, rough = 0.6) => new THREE.MeshStandardMaterial({ color: col, roughness: rough });
  const decal = (col, op) => new THREE.MeshBasicMaterial({ map: blob, color: col, transparent: true, opacity: op, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const M = { stain: decal(0x5a4128, 0.3), grout: decal(0x2f2418, 0.5), crumb: std(0xd2a05a, 0.85), bead: [std(0xe0443a, 0.35), std(0x3a7bd5, 0.35)], pencil: [std(0xf2c230, 0.5), std(0xd9453a, 0.5)], wood: std(0xe3c08b, 0.7), lead: std(0x2a2a2e), eraser: std(0xf0a0b0, 0.9) };
  const G = {
    crumb: new THREE.DodecahedronGeometry(0.12, 0), bead: new THREE.SphereGeometry(0.26, 10, 8), flat: new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
    body: new THREE.CylinderGeometry(0.16, 0.16, 1, 6).rotateZ(Math.PI / 2), tip: new THREE.ConeGeometry(0.16, 0.34, 6).rotateZ(-Math.PI / 2), lead: new THREE.ConeGeometry(0.05, 0.12, 6).rotateZ(-Math.PI / 2),
    eraser: new THREE.BoxGeometry(0.75, 0.26, 0.42),
  };
  const put = (geo, mat, x, y, z, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = false; m.receiveShadow = true; m.userData.noDetail = true; group.add(m); return m; };
  const pick = (a, v) => a[Math.floor(v * a.length) % a.length];
  for (const s of spots) {
    const cs = Math.cos(s.rot), sn = Math.sin(s.rot), y = s.y, k = s.ring ? 2.4 : 1;   // ring-tingene (foran start) er større, så de leses tydelig på mobil
    if (s.kind === 'stain') { const w = 1.2 + s.s * 2.2, m = put(G.flat, M.stain, s.x, y + 0.02, s.z, w, 1, w * (0.6 + s.a * 0.5)); m.rotation.y = s.rot; m.renderOrder = 1; }
    else if (s.kind === 'grout') { const m = put(G.flat, M.grout, s.x, y + 0.025, s.z, s.len, 1, 0.16 + s.a * 0.1); m.rotation.y = s.rot; m.renderOrder = 1; }
    else if (s.kind === 'crumbs') { const nk = 4 + Math.floor(s.a * 4); for (let i = 0; i < nk; i++) { const a = i * 2.4 + s.h * 6, d = (0.08 + (i % 3) * 0.14 * s.s) * k; const m = put(G.crumb, M.crumb, s.x + Math.cos(a) * d, y + 0.04 * k, s.z + Math.sin(a) * d, (0.7 + (i % 2) * 0.6) * k, 0.55 * k, 0.9 * k); m.rotation.y = a; } }
    else if (s.kind === 'bead') { put(G.bead, pick(M.bead, s.c), s.x, y + 0.2 * s.s * k, s.z, s.s * k, s.s * 0.9 * k, s.s * k); }
    else if (s.kind === 'pencil') {                                                  // blyantstumper: skaft, spiss med blyant
      const L = (1.2 + s.a * 0.7) * k, yy = y + 0.16 * k, rot = (m) => { m.rotation.y = s.rot; return m; };
      rot(put(G.body, pick(M.pencil, s.c), s.x, yy, s.z, L, k, k));
      rot(put(G.tip, M.wood, s.x + cs * (L / 2 + 0.17 * k), yy, s.z - sn * (L / 2 + 0.17 * k), k, k, k));
      rot(put(G.lead, M.lead, s.x + cs * (L / 2 + 0.38 * k), yy, s.z - sn * (L / 2 + 0.38 * k), k, k, k));
    }
    else if (s.kind === 'eraser') { const m = put(G.eraser, M.eraser, s.x, y + 0.15 * k, s.z, s.s * k, k, s.s * k); m.rotation.y = s.rot; }
  }
  return { group, count: spots.length, spots, update(on) { group.visible = on; } };
}
