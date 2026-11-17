// R80: «Rettelser»-menyen (fixes_view.js). Ren logikk uten DOM og nett, testes i node (test_fixes.mjs).
// Svarene fra Claude (tlm_my_inbox) har brett (level), sted (spot {x,y,z}) og avkryssing (check: 'ok' | 'fail' | null).
import { compareVersions } from './version_check_logic.js';

export const stateOf = (r) => (r && r.check === 'ok' ? 'ok' : r && r.check === 'fail' ? 'fail' : 'ikke');
export const stateText = (st) => (st === 'ok' ? '✓ VIRKER' : st === 'fail' ? '✗ VIRKER IKKE' : 'IKKE SJEKKET');
export const QUICK_NOTES = ['Samme feil som før', 'Noe annet er galt', 'Finner ikke stedet'];

// Nyeste først (tid, så id som tie-break). Endrer ikke listen som sendes inn.
export function sortFixes(list) {
  const t = (r) => { const n = Date.parse(r.at); return Number.isFinite(n) ? n : 0; };
  return [...(list || [])].sort((a, b) => t(b) - t(a) || String(b.id).localeCompare(String(a.id)));
}
export const uncheckedCount = (list) => (list || []).filter((r) => stateOf(r) === 'ikke').length;
export const buttonLabel = (n) => (n > 0 ? `RETTELSER · ${n}` : 'RETTELSER');
// Knappen vises bare for dem som har en gyldig tester-kode.
export const menuVisible = (code, validCode) => !!code && !!validCode(code);

// Kjører spillet rettelsen? 'ok' = ja (samme eller nyere), 'eldre' = nei (tilby OPPDATER), 'ukjent' = versjonen mangler.
export function versionStatus(running, fixVersion) {
  const c = compareVersions(String(fixVersion ?? '').replace(/^v/, ''), running);
  return c === null ? 'ukjent' : c <= 0 ? 'ok' : 'eldre';
}
export const versionLine = (running, fixVersion) => {
  const st = versionStatus(running, fixVersion), v = String(fixVersion ?? '').replace(/^v/, '');
  return st === 'ukjent' ? `Du kjører v${running}` : st === 'ok' ? `Rettet i v${v} · du kjører v${running}` : `Rettet i v${v} · du kjører v${running}: OPPDATER først`;
};

export function levelLabel(levels, id) {
  const l = (levels || []).find((x) => x.id === id);
  return l ? (l.short || l.label || l.id) : id ? String(id) : '';
}

export const validSpot = (s) => (s && [s.x, s.y, s.z].every((v) => typeof v === 'number' && Number.isFinite(v)) ? { x: s.x, y: s.y, z: s.z } : null);

// ---------- trygg plassering ved stedet ----------
const PH = 1.0, PHW = 0.3;   // figurens høyde og halvbredde (som i physics.js)
const hitsBox = (b, x0, x1, y0, y1, z0, z1) => b.min[0] < x1 && b.max[0] > x0 && b.min[1] < y1 && b.max[1] > y0 && b.min[2] < z1 && b.max[2] > z0;
function groundAt(boxes, x, z, refY) {   // høyeste flate under (x,z) som ikke ligger over stedet
  let top = null;
  for (const b of boxes) {
    if (b.carried || b.type === 'wall' || b.round) continue;
    if (x < b.min[0] || x > b.max[0] || z < b.min[2] || z > b.max[2]) continue;
    if (b.max[1] > refY + 0.6) continue;
    if (top === null || b.max[1] > top) top = b.max[1];
  }
  return top;
}
// Velger et stående punkt på bakken et par enheter fra stedet, og kameraretning (yaw) mot stedet.
// Ingen fusk: bare en vanlig plassering på fast grunn, fri for boks og fare. Gir null om ingenting passer.
export function safePlacement(spot, level, { dists = [2.5, 3.2, 1.8, 4.2, 5.5], steps = 16 } = {}) {
  const sp = validSpot(spot); if (!sp || !level) return null;
  const boxes = level.boxes || [], hz = level.hazards || [], deathY = level.deathY ?? -1e9;
  const startAng = level.start ? Math.atan2(level.start[2] - sp.z, level.start[0] - sp.x) : 0;   // helst fra siden spilleren kommer fra
  for (const d of dists) {
    for (let i = 0; i < steps; i++) {
      const a = startAng + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * (Math.PI * 2 / steps);
      const x = sp.x + Math.cos(a) * d, z = sp.z + Math.sin(a) * d;
      const top = groundAt(boxes, x, z, sp.y);
      if (top === null || Math.abs(top - sp.y) > 0.6 || top < deathY + 1) continue;
      if ([[PHW, PHW], [PHW, -PHW], [-PHW, PHW], [-PHW, -PHW]].some(([cx, cz]) => { const g = groundAt(boxes, x + cx, z + cz, sp.y); return g === null || Math.abs(g - top) > 0.05; })) continue;   // helt på flata, ikke på kanten
      const y0 = top + 0.02, y1 = top + PH + 0.1;
      if (boxes.some((b) => !b.carried && hitsBox(b, x - PHW, x + PHW, y0, y1, z - PHW, z + PHW))) continue;
      if (hz.some((h) => hitsBox(h, x - PHW - 0.5, x + PHW + 0.5, top - 1, y1, z - PHW - 0.5, z + PHW + 0.5))) continue;
      return { x, y: top, z, yaw: Math.atan2(-(sp.x - x), -(sp.z - z)), dist: d };
    }
  }
  return null;
}

// ---------- lenke til brett og sted ----------
// «GÅ DIT»: adressen til spillet med brettet og stedet. Samme side; gammel ?fresh/&go/&start byttes ut.
export function goUrl(href, fix) {
  let u; try { u = new URL(href); } catch { return href; }
  u.searchParams.delete('fresh'); u.searchParams.delete('go'); u.searchParams.delete('start');
  u.searchParams.set('level', fix.level);
  const sp = validSpot(fix.spot);
  if (sp) u.searchParams.set('go', [sp.x, sp.y, sp.z].map((v) => Math.round(v * 100) / 100).join(','));
  return u.pathname + u.search + u.hash;
}
export function parseGo(search) {
  const g = new URLSearchParams(search || '').get('go'); if (!g) return null;
  const p = g.split(',').map(Number); return p.length === 3 ? validSpot({ x: p[0], y: p[1], z: p[2] }) : null;
}
// Lokal oppdatering etter avkryssing (før serveren har svart).
export const withCheck = (list, id, res, note = '') => (list || []).map((r) => (r.id === id ? { ...r, check: res, note: res === 'fail' ? String(note || '').slice(0, 200) : '' } : r));
