// R22: tegning og DOM for nivåstarten: «første delmål»-markør i verden (hoppende pil over flata), hint-bobla og trykk-for-å-hoppe-over-laget under kamerasveipet.
// Logikken (første delmål, sveip, når det er nådd) står i intro.js; tekster i i18n.js, data i story.js.
import * as THREE from 'three';

export function createIntroView({ scene, $, T, low = false }) {
  const arrow = new THREE.Group(); arrow.visible = false; arrow.userData.noDetail = true;
  const mk = (geo, color) => { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.92, depthWrite: false })); m.userData.noDetail = true; m.renderOrder = 5; return m; };
  const cone = mk(new THREE.ConeGeometry(0.34, 0.7, low ? 8 : 16), 0xffd23f); cone.rotation.x = Math.PI; cone.position.y = 0.55;
  const stem = mk(new THREE.CylinderGeometry(0.1, 0.1, 0.5, low ? 6 : 10), 0xffd23f); stem.position.y = 1.15;
  const ring = mk(new THREE.RingGeometry(0.5, 0.68, low ? 16 : 32), 0xfff1b0); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04;
  arrow.add(cone, stem, ring); scene.add(arrow);
  let target = null;
  const hint = $('introhint'), sw = $('introsw');
  return {
    setTarget(t) { target = t; if (t) arrow.position.set(t.x, t.y, t.z); },
    markerOn(on) { arrow.visible = !!(on && target); },
    update(now) {
      if (!arrow.visible) return;
      const k = 0.5 + 0.5 * Math.sin(now * 0.004); arrow.position.y = target.y + 0.15 + k * 0.22; ring.scale.setScalar(1 + 0.25 * k); ring.material.opacity = 0.9 - 0.5 * k;
    },
    showHint(label, text) {
      hint.innerHTML = `${label ? `<small>${label}</small>` : ''}<span></span>`; hint.lastChild.textContent = text; hint.classList.remove('hide'); requestAnimationFrame(() => hint.classList.add('show'));
    },
    hideHint() { hint.classList.remove('show'); setTimeout(() => { if (!hint.classList.contains('show')) hint.classList.add('hide'); }, 400); },
    // laget som tar imot ett trykk hvor som helst og hopper over sveipet
    showSweep(onSkip) {
      sw.innerHTML = `<b>${T('intro.skip')}</b>`; sw.classList.remove('hide');
      sw.onpointerdown = (e) => { e.preventDefault(); e.stopPropagation(); onSkip(); };
    },
    hideSweep() { sw.classList.add('hide'); sw.onpointerdown = null; },
  };
}
