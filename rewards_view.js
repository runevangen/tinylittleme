// R16: tilbehør på figuren (three) og lekerom-skapet (DOM). Logikken ligger i rewards.js. main.js har bare tynne hekter.
import * as THREE from 'three';
import { ACCESSORIES, SLOTS, accById, getUnlocks, getEquipped, getBest, toggleEquip, rt } from './rewards.js';
import { heroSVG, fmtTime } from './story.js';

const DEF_COLORS = { scarf: 0x1f9a94, pack: 0x66713a };

function buildHat(id) {
  const g = new THREE.Group(), mats = [];
  const mat = (c, r = 0.5, extra = {}) => { const m = new THREE.MeshStandardMaterial({ color: c, roughness: r, ...extra }); mats.push(m); return m; };
  const add = (geo, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
  if (id === 'propeller') {
    const cap = mat(0xe8504a, 0.7), blue = mat(0x3f7fd8, 0.6), yel = mat(0xf0c030, 0.5);
    add(new THREE.SphereGeometry(0.05, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), cap, 0, 0, 0);
    add(new THREE.CylinderGeometry(0.004, 0.004, 0.035, 6), yel, 0, 0.05, 0);
    const spin = new THREE.Group(); spin.position.y = 0.07; g.add(spin);
    for (const r of [0, Math.PI / 2]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.003, 0.022), r ? blue : yel); b.rotation.y = r; b.castShadow = true; spin.add(b); }
    g.userData.spin = spin;
  } else if (id === 'crown') {
    const gold = mat(0xf2c230, 0.28, { metalness: 0.85 }), gem = mat(0xd8304a, 0.2);
    add(new THREE.CylinderGeometry(0.058, 0.052, 0.04, 16, 1, true), gold, 0, 0.016, 0).material.side = THREE.DoubleSide;
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; add(new THREE.ConeGeometry(0.014, 0.04, 6), gold, Math.sin(a) * 0.056, 0.055, Math.cos(a) * 0.056); add(new THREE.SphereGeometry(0.008, 8, 6), gem, Math.sin(a) * 0.056, 0.081, Math.cos(a) * 0.056); }
    add(new THREE.TorusGeometry(0.055, 0.005, 6, 20), gold, 0, -0.002, 0).rotation.x = Math.PI / 2;
  } else if (id === 'party') {
    const red = mat(0xe8504a, 0.7), white = mat(0xfaf2e0, 0.8), blue = mat(0x3f7fd8, 0.6);
    add(new THREE.ConeGeometry(0.052, 0.14, 16), red, 0, 0.055, 0);
    add(new THREE.TorusGeometry(0.036, 0.006, 6, 18), white, 0, 0.032, 0).rotation.x = Math.PI / 2;
    add(new THREE.TorusGeometry(0.022, 0.006, 6, 18), blue, 0, 0.074, 0).rotation.x = Math.PI / 2;
    add(new THREE.SphereGeometry(0.016, 10, 8), white, 0, 0.13, 0);
  } else if (id === 'cowboy') {
    const felt = mat(0x9a6a3a, 0.9), band = mat(0x4a2f1c, 0.8), star = mat(0xf2c230, 0.3, { metalness: 0.8 });
    add(new THREE.CylinderGeometry(0.13, 0.13, 0.006, 24), felt, 0, 0.0, 0.01);
    add(new THREE.CylinderGeometry(0.05, 0.062, 0.066, 18), felt, 0, 0.035, 0);
    add(new THREE.CylinderGeometry(0.0635, 0.0635, 0.014, 18), band, 0, 0.014, 0);
    add(new THREE.SphereGeometry(0.009, 6, 5), star, 0, 0.014, 0.064);
  }
  g.userData.mats = mats;
  return g;
}

function dispose(o) { o.traverse((c) => { c.geometry?.dispose?.(); }); for (const m of o.userData?.mats || []) m.dispose(); }

// Setter valgt tilbehør på figuren. equipped = { hat, scarf, pack } (id eller null). Trygg å kalle flere ganger.
export function applyAccessories(hero, equipped = {}) {
  if (!hero?.headS || !hero.M) return;
  if (hero.accHat) { hero.accHat.removeFromParent(); dispose(hero.accHat); hero.accHat = null; }
  const hat = accById(equipped.hat);
  if (hat && hat.slot === 'hat') {
    const g = buildHat(hat.id); g.position.y = 0.097; g.rotation.x = -0.2; hero.headS.add(g); hero.accHat = g; hero.accId = hat.id;
  } else hero.accId = null;
  for (const slot of ['scarf', 'pack']) { const a = accById(equipped[slot]); hero.M[slot].color.setHex(a && a.slot === slot && a.color ? a.color : DEF_COLORS[slot]); }
}
export function updateAccessories(hero, dt) { const s = hero?.accHat?.userData.spin; if (s) s.rotation.y += dt * 14; }

// ---------- lekerom-skapet (startskjermen) ----------
const ICON = { propeller: '🚁', redscarf: '🧣', bluepack: '🎒', crown: '👑', party: '🎉', cowboy: '🤠' };
// Figuren i SVG med tilbehøret tegnet oppå (forhåndsvisning i skapet).
export function previewSVG(equipped = {}) {
  let extra = '';
  const hat = equipped.hat;
  if (hat === 'propeller') extra += '<path d="M24 14 Q40 -2 56 14Z" fill="#e8504a"/><rect x="39" y="2" width="2" height="8" fill="#f0c030"/><rect x="26" y="1" width="28" height="3" rx="1.5" fill="#3f7fd8"/>';
  else if (hat === 'crown') extra += '<path d="M24 14 L24 -2 L32 6 L40 -4 L48 6 L56 -2 L56 14Z" fill="#f2c230" stroke="#c98f1c" stroke-width="1.5"/><circle cx="40" cy="8" r="2.4" fill="#d8304a"/>';
  else if (hat === 'party') extra += '<path d="M28 14 L40 -14 L52 14Z" fill="#e8504a"/><path d="M30 8 L50 8" stroke="#fff" stroke-width="3"/><circle cx="40" cy="-14" r="3.5" fill="#fff"/>';
  else if (hat === 'cowboy') extra += '<ellipse cx="40" cy="12" rx="30" ry="5" fill="#9a6a3a"/><path d="M28 11 Q28 -6 40 -4 Q52 -6 52 11Z" fill="#9a6a3a"/><rect x="28" y="7" width="24" height="4" fill="#4a2f1c"/>';
  if (equipped.scarf) { const c = '#' + accById(equipped.scarf).color.toString(16).padStart(6, '0'); extra += `<rect x="26" y="47" width="28" height="7" rx="3.5" fill="${c}"/><rect x="48" y="50" width="6" height="16" rx="2" fill="${c}"/>`; }
  if (equipped.pack) { const c = '#' + accById(equipped.pack).color.toString(16).padStart(6, '0'); extra = `<rect x="52" y="52" width="14" height="22" rx="5" fill="${c}"/>` + extra; }
  return heroSVG('hi').replace('viewBox="0 0 80 96"', 'viewBox="0 -18 80 114"').replace('</svg>', `${extra}</svg>`);
}

const CSS = `#start .closet{width:min(420px,92vw);display:flex;flex-direction:column;gap:10px;align-items:center;max-height:94vh;padding:8px 0 16px;overflow:auto;-webkit-overflow-scrolling:touch}
#start .closet .prev{width:72px;height:86px;flex:none}#start .closet h2{margin:0;font:800 26px Georgia,serif;font-style:italic;color:#ffd9a0}
#start .closet .tag{margin:0}#start .cgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;width:100%}
#start .acc{border:2px solid #ffffff30;border-radius:14px;background:#ffffff18;color:#fff;padding:6px 4px;font:600 12px system-ui;text-align:center;min-height:74px}
#start .acc b{display:block;font-size:26px;line-height:1.1}#start .acc small{display:block;font-size:10px;opacity:.75;margin-top:2px}
#start .acc.on{border-color:#ffd23f;background:#ffd23f33}#start .acc.lock{opacity:.45}#start .acc.lock b{filter:grayscale(1)}
#start .acc:active{transform:scale(.96)}
#start .recs{width:100%;font:600 12px system-ui;color:#dfe6f5;display:grid;grid-template-columns:auto 1fr;gap:3px 10px;text-align:left}#start .recs span:nth-child(odd){opacity:.75}`;

// Viser skapet i #start-elementet. ctx: { st, lang, all, levels:[{id,n,short}], onChange(equipped), onBack() }. Alt med trykk.
export function showCloset(el, ctx) {
  if (!document.getElementById('rwcss')) { const s = document.createElement('style'); s.id = 'rwcss'; s.textContent = CSS; document.head.appendChild(s); }
  const { st, lang, all, levels } = ctx, L = (k, v) => rt(lang, k, v);
  const draw = () => {
    const unl = new Set(all ? ACCESSORIES.map((a) => a.id) : getUnlocks(st)), eq = getEquipped(st, all), best = getBest(st);
    const cards = ACCESSORIES.map((a) => { const open = unl.has(a.id), on = eq[a.slot] === a.id;
      return `<button class="acc ${open ? '' : 'lock'} ${on ? 'on' : ''}" data-acc="${a.id}" ${open ? '' : 'aria-disabled="true"'}><b>${open ? ICON[a.id] : '🔒'}</b>${L('acc.' + a.id)}<small>${open ? (on ? L('rw.on') : L('rw.slot.' + a.slot)) : L('rw.locked', { n: a.n })}</small></button>`; }).join('');
    const recs = levels.filter((l) => l.n).map((l) => { const b = best[l.id]; return `<span>${l.short}</span><span>${b ? L('rw.best', { crumbs: b.crumbs, total: b.total, time: b.t ? fmtTime(b.t) : '-' }) : L('rw.none')}</span>`; }).join('');
    el.innerHTML = `<div class="closet"><h2>${L('rw.title')}</h2><p class="tag">${L('rw.sub')}</p>${previewSVG(eq).replace('<svg ', '<svg class="prev" ')}
      <small style="opacity:.75">${L('rw.count', { n: unl.size, total: ACCESSORIES.length })}</small><div class="cgrid">${cards}</div>
      <div class="recs">${recs}</div><button class="mbtn" id="cBack">${L('rw.back')}</button></div>`;
    el.querySelectorAll('[data-acc]').forEach((b) => { b.onclick = () => { const r = toggleEquip(st, b.dataset.acc, all); if (r) { ctx.onChange?.(r); draw(); } }; });
    el.querySelector('#cBack').onclick = () => ctx.onBack?.();
  };
  draw();
}
export { SLOTS };
