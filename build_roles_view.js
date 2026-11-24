// R157: roller i byggeren, visning (DOM + canvas 2D). Logikken ligger i build_roles.js (klassisk) og grid_logic.js (rutenett).
// Én knapp, GULV / BJELKE, følger det som er valgt (stav eller del) i ALLE byggeskjermene (ny og gammel, rutenett og klassisk, stående og liggende),
// så broene og Byggeskolen får det samme uten egen kode (R101). Tegnehjelperne her brukes av build.js (klassiske deler) og grid_view.js (staver).
import { ROLE_FLOOR, ROLE_BEAM } from './build_roles.js';

export const ROLE_BTN_W = 176, ROLE_BTN_H = 46;
export const roleCss = () => `
#bld .rolebtn{position:absolute;display:none;z-index:6;width:${ROLE_BTN_W}px;height:${ROLE_BTN_H}px;flex:0 0 auto;padding:0;margin:0;border-radius:23px;border:3px solid #fff;background:#182033;box-shadow:0 3px 10px #0008;pointer-events:auto;overflow:hidden;font:800 13px system-ui;color:#fff;white-space:nowrap}
#bld .rolebtn.show{display:flex;align-items:stretch}
#bld.sim .rolebtn{display:none}
#bld .rolebtn span{flex:1 1 0;display:flex;align-items:center;justify-content:center;gap:4px;opacity:.5}
#bld .rolebtn span.on{opacity:1;background:#2a7f62;color:#fff}
#bld .rolebtn span.rb.on{background:#5b4a36}
#bld .rolebtn i{display:inline-block;width:16px;height:9px;border-radius:2px;background:#d9a35f;border-top:3px solid #fff7d6;box-sizing:border-box}
#bld .rolebtn span.rb i{height:5px;border-top:0;background:#8a6a44;transform:rotate(-35deg)}
`;
export const roleMarkup = () => `<button class="rolebtn" data-a="role" type="button"><span class="rf"><i></i><b></b></span><span class="rb"><i></i><b></b></span></button>`;

// hvor knappen skal stå: på en fast plass øverst i byggeområdet (rett under hjelpelinja), så den aldri dekker ✕, KOPIER, BYTT TIL STÅL eller TREKANT ved det valgte.
// Nye skjermer: midtstilt i det frie området (mellom skinnene i liggende). Gamle skjermer: til venstre (zoom-knappene står til høyre).
export function roleDock({ W, top, bottom, insetL = 0, insetR = 0, center = true, w = ROLE_BTN_W, h = ROLE_BTN_H }) {
  const lo = insetL + 8, hi = Math.max(lo, W - insetR - w - 8), left = center ? Math.min(hi, Math.max(lo, (insetL + W - insetR) / 2 - w / 2)) : lo;
  return { left, top: Math.max(0, Math.min(top + 8, bottom - h - 6)) };
}

export function createRoleUI({ root, T }) {
  const el = root.querySelector('.rolebtn'); let sig = '';
  // sel: null (skjul) eller { role }; area: { W, top, bottom, insetL, insetR, center }
  function frame(sel, area) {
    if (!el) return; if (!sel) { if (sig !== '') { sig = ''; el.classList.remove('show'); } return; }
    const p = roleDock(area), s = `${sel.role}|${Math.round(p.left)}|${Math.round(p.top)}|${T('role.gulv')}`; if (s === sig) return; sig = s;
    el.classList.add('show'); el.style.left = p.left + 'px'; el.style.top = p.top + 'px';
    const f = el.querySelector('.rf'), b = el.querySelector('.rb'); f.classList.toggle('on', sel.role === ROLE_FLOOR); b.classList.toggle('on', sel.role === ROLE_BEAM);
    f.querySelector('b').textContent = T('role.gulv'); b.querySelector('b').textContent = T('role.bjelke'); el.dataset.role = sel.role;
    el.setAttribute('aria-label', T('role.aria', { now: T('role.' + sel.role), to: T('role.' + (sel.role === ROLE_FLOOR ? ROLE_BEAM : ROLE_FLOOR)) })); el.setAttribute('aria-pressed', sel.role === ROLE_FLOOR ? 'true' : 'false');
  }
  return { frame, get shown() { return sig !== ''; }, get el() { return el; }, get role() { return sig ? el.dataset.role : null; } };
}

// ---------- tegning (canvas 2D) ----------
export const BEAM_DARK = 0.42, BEAM_NARROW = 0.62;   // bjelke: så mye mørkere, og så smal i forhold til full bredde
export function darken(hex, k = BEAM_DARK) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex)); if (!m) return hex; const n = parseInt(m[1], 16), f = (v) => Math.round(v * (1 - k));
  return '#' + [f(n >> 16 & 255), f(n >> 8 & 255), f(n & 255)].map((v) => v.toString(16).padStart(2, '0')).join('');
}
export const darkenInt = (n, k = BEAM_DARK) => parseInt(darken('#' + (n >>> 0).toString(16).padStart(6, '0'), k).slice(1), 16);
// en firkant (fire skjermpunkt i rekkefølge) gjort smalere på tvers av den lange retningen
export function narrowQuad(pts, k = BEAM_NARROW) {
  const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y), longFirst = d(pts[0], pts[1]) >= d(pts[1], pts[2]), mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }), lerp = (c, p) => ({ x: c.x + (p.x - c.x) * k, y: c.y + (p.y - c.y) * k });
  if (longFirst) { const m0 = mid(pts[0], pts[3]), m1 = mid(pts[1], pts[2]); return [lerp(m0, pts[0]), lerp(m1, pts[1]), lerp(m1, pts[2]), lerp(m0, pts[3])]; }
  const m0 = mid(pts[0], pts[1]), m1 = mid(pts[3], pts[2]); return [lerp(m0, pts[0]), lerp(m0, pts[1]), lerp(m1, pts[2]), lerp(m1, pts[3])];
}
// oversiden av en firkant: den av de lange kantene som ligger høyest på skjermen (der føttene står)
export function topEdge(pts) {
  const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y), es = [0, 1, 2, 3].map((i) => ({ a: pts[i], b: pts[(i + 1) % 4] })), mx = Math.max(...es.map((e) => d(e.a, e.b)));
  return es.filter((e) => d(e.a, e.b) >= mx * 0.6).sort((p, q) => (p.a.y + p.b.y) - (q.a.y + q.b.y))[0];
}
// lys kant på oversiden av en gulvdel
export function drawFloorEdge(g2, pts, w = 3) {
  const e = topEdge(pts); if (!e) return; g2.save(); g2.lineCap = 'round'; g2.strokeStyle = '#fff7d6'; g2.lineWidth = w; g2.beginPath(); g2.moveTo(e.a.x, e.a.y); g2.lineTo(e.b.x, e.b.y); g2.stroke(); g2.restore();
}
// hull i gulvet (før prøven): rød stiplet strek med merke
export function drawGap(g2, a, b, text) {
  g2.save(); g2.lineCap = 'round'; g2.setLineDash([3, 7]); g2.strokeStyle = '#ff6a5a'; g2.lineWidth = 4; g2.beginPath(); g2.moveTo(a.x, a.y); g2.lineTo(b.x, b.y); g2.stroke(); g2.setLineDash([]);
  for (const p of [a, b]) { g2.beginPath(); g2.moveTo(p.x, p.y - 8); g2.lineTo(p.x, p.y + 8); g2.stroke(); }
  if (text) { const x = (a.x + b.x) / 2, y = (a.y + b.y) / 2 - 26; g2.font = '800 12px system-ui'; g2.textAlign = 'center'; const w = g2.measureText(text).width + 12; g2.fillStyle = 'rgba(60,14,10,.9)'; g2.beginPath(); if (g2.roundRect) g2.roundRect(x - w / 2, y - 13, w, 20, 7); else g2.rect(x - w / 2, y - 13, w, 20); g2.fill(); g2.fillStyle = '#ffd9d2'; g2.fillText('⚠ ' + text, x, y + 2); g2.textAlign = 'start'; }
  g2.restore();
}
