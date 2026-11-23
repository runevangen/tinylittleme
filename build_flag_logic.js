// R145: målflagget i byggeskjermen: ren logikk (testes i node: test_buildflag.mjs). Tegningen står i build_flag_view.js.
// Feilen i v2.143: flagget ble tegnet med fast størrelse rett på målpunktet, uten kant (gult på gult mot den stiplede rammen), uten plass til stoffet ved skjermkanten,
// og det forsvant helt utenfor skjermen på smale sider (Bygglab: målet ved u=8 ligger utenfor skjermen på mobil). Nå: størrelse etter zoom, festet innenfor skjermen, alltid synlig.
export const FLAGV = {
  poleMin: 34, poleMax: 56, poleK: 1.5,   // stanghøyde i px = poleK · px per enhet, begrenset
  cloth: 0.62,                            // stoffets lengde i stanghøyder
  margin: 8, arrowRoom: 14,                             // minste avstand fra skjermkanten (px)
  topSafe: 76,                            // øverst ligger toppraden og hint-teksten: stanga får aldri toppen høyere enn dette
  botSafe: 150,                           // nederst ligger delebrettet: foten ligger aldri lavere enn H minus dette
  depthTop: 7,                            // 2,5D: foten står midt på veiplatas toppflate (halve dybden 14 px)
};
export const FLAG_STROKES = 9;            // statisk tegnebudsjett per bilde: skygge 1, fot 1, stang 2, stoff 3, knott 2 (ingen nye shadere, bare Canvas 2D)
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const poleHeight = (scale) => clamp((Number.isFinite(scale) ? scale : 25) * FLAGV.poleK, FLAGV.poleMin, FLAGV.poleMax);

// gp = målpunktet på skjermen (px), scale = px per enhet, W/H = skjermen; off = forskyvning av foten i 2,5D (px, fra depthVec)
// Gir stangas fot (x, y), høyde h og om flagget er festet til en kant (side: -1 venstre, 1 høyre, 0 fri).
export function flagPlan(gp, W, H, scale, off = { x: 0, y: 0 }, T = FLAGV) {
  const h = poleHeight(scale), len = h * T.cloth, m = T.margin;
  const bx = gp.x + (off.x || 0), by = gp.y + (off.y || 0);
  const r = T.arrowRoom, minX = m + r, maxX = Math.max(minX, W - m - len - r);
  const x = clamp(bx, minX, maxX), side = bx < minX - 0.5 ? -1 : bx > maxX + 0.5 ? 1 : 0;
  const yMin = T.topSafe + h, yMax = Math.max(yMin, H - T.botSafe);
  const y = clamp(by, yMin, yMax), vside = by < yMin - 0.5 ? -1 : by > yMax + 0.5 ? 1 : 0;
  return { x, y, h, len, side, vside, pinned: side !== 0 || vside !== 0, moved: Math.hypot(x - bx, y - by) };
}
// stoffets hjørner (px, relativt til stangtoppen): n+1 punkter langs øvre og nedre kant, med bølge som blir sterkere mot den frie enden
export function clothPoints(plan, t, n = 4) {
  const hh = plan.h * 0.38, top = [], bot = [];
  for (let i = 0; i <= n; i++) {
    const k = i / n, amp = 2.2 * k, ph = t * 3.1 - k * 4.2, dy = Math.sin(ph) * amp, dx = k * plan.len;
    top.push({ x: dx, y: dy + k * hh * 0.18 }); bot.push({ x: dx, y: hh * (1 - 0.36 * k) + dy });
  }
  return { top, bot };
}
