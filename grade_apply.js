// Setter lysene fra grade.js i scenen (trenger three, derfor egen fil så grade.js kan testes i node).
import * as THREE from 'three';
import { gradeParams } from './grade.js';

export function applyGrade({ renderer, scene, sun, canvas, look, mode = 'film', low = false, filterOn = true }) {
  const p = gradeParams(look, mode, low, filterOn);
  renderer.toneMappingExposure = p.exposure;
  scene.environmentIntensity = p.env;
  sun.intensity = p.sun; sun.color.setHex(p.sunColor);
  const hemi = new THREE.HemisphereLight(p.hemiSky, p.hemiGround, p.hemi);
  const fill = new THREE.DirectionalLight(0x9cbcff, p.fill), rim = new THREE.DirectionalLight(0xffe2b0, p.rim);
  fill.castShadow = rim.castShadow = false;
  scene.add(hemi, fill, rim, fill.target, rim.target);
  if (canvas) canvas.style.filter = p.filter;
  return {
    mode, params: p,
    setLow(on) { fill.visible = rim.visible = !on; },     // R15 Lav profil: ingen ekstra retningslys (færre lys i hver piksel)
    setFilter(on) { if (canvas) canvas.style.filter = on && !low && mode === 'film' ? gradeParams(look, mode, low, true).filter : ''; },
    // fyll og kantlys følger figuren; kantlyset ligger alltid bakfra sett fra kameraet
    follow(target, camera) {
      if (!p.fill && !p.rim) return;
      const dx = target.x - camera.position.x, dz = target.z - camera.position.z, L = Math.hypot(dx, dz) || 1, fx = dx / L, fz = dz / L;
      rim.position.set(target.x + fx * 5, target.y + 13, target.z + fz * 5); rim.target.position.set(target.x, target.y, target.z);
      fill.position.set(target.x - fx * 6 - fz * 6, target.y + 9, target.z - fz * 6 + fx * 6); fill.target.position.set(target.x, target.y, target.z);
    },
  };
}
