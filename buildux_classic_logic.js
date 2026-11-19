// R96: byggeskjermens nye skall for KLASSISKE steder (Trapp, Vippe, lekerom, stue, verksted og Bygglab-stedene uten rutenett), bak samme ⚙-valg som broene (`buildux`).
// Ren logikk (ingen DOM, ingen three.js, kjøres i node: test_buildux_classic.mjs). Mekanikken (deler, festing, fysikk, koder, brett) røres ikke: bare skallet rundt.
// Her ligger: hvilke steder som får skallet, layout (stående/liggende), hvilke handlinger som er faste / i ⋯ / nær valgt del, instruksjon for festing,
// spøkelseslinjen (gjenbruker addLink-sjekkene fra build_logic.js), plassering av verktøylinjen ved valgt del, hånd-hjelpen første gang og målingen (logg).
import { addLink, linkEnds, topHit, LINK_KINDS } from './build_logic.js';
import { LAND, orientOf, orientName, landMetrics, createOrientStats, statsAct, statsTurn, statsTry, statsWin } from './buildux_land_logic.js';
import { shouldShowHand } from './buildux_logic.js';

export const CBX = {
  tools: [ { id: 'tape', icon: '🩹' }, { id: 'hinge', icon: '🔗' }, { id: 'rope', icon: '🪢' }, { id: 'band', icon: '➰' } ],   // festeverktøyene (build_logic LINK_KINDS) med ikon; etiketten er build.tool.*
  touch: 48,                // minste trykkflate (px)
  topPort: 58,              // stående: topplinjen tar så mye av byggeområdet (px)
  stackPort: 200,           // stående: bunnstabelen (kostnad 20, delebrett 60, verktøy 52, PRØV 56 og mellomrom) uten sikker kant
  trayH: 60, toolH: 52, goH: 56, costH: 20, gap: 4,
  trayLand: 64,             // liggende: delebrettet som en rad langs nedre kant mellom panelene
  barW: 3 * 48 + 2 * 6, barH: 48,   // verktøylinjen ved valgt del: ↺ ↻ ✕
  handKey: 'tlm.cbxhand', handSecs: 3.4,
  ghostPad: 0.35,
};

// skal dette stedet ha det nye skallet? Valget er på, stedet er aktivt, det er IKKE et bro-sted (det har R92-skjermen) og byggingen står ikke i rutenett-modus
export const classicSite = ({ on, site, gridOn = false, buxOn = false, buxWanted = false } = {}) => !!on && !!site && !gridOn && !buxOn && !buxWanted;

// ---------- layout ----------
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
// stående: topplinje øverst, så byggeområdet (ca. 60–67 % av høyden), nederst kostnadslinje, delebrett, verktøyrad (4 festeverktøy + ↶) og PRØV.
// liggende: samme sidepaneler som R93 (venstre ← ⋯ ↶; høyre de fire festeverktøyene som en kolonne og PRØV nederst), delebrettet som en rad langs nedre kant, budsjettplate øverst.
export function classicMetrics({ w, h, insetL = 0, insetR = 0, insetT = 0, insetB = 0 } = {}) {
  const sb = Math.max(8, Math.max(0, insetB));
  if (orientOf(w, h) === 'land') {
    const m = landMetrics({ w, h, insetL, insetR, insetT, insetB }), top = m.topPx, bot = CBX.trayLand + 6 + sb;
    const mt = Math.max(LAND.flagReserve, Math.max(0, insetT) + LAND.flagReserve - 8), room = h - mt - (60 + 12 + sb), step = clamp(Math.floor(room / 4), CBX.touch, 66);
    return { orient: 'land', pw: m.pw, left: m.left, right: m.right, topPx: top, botPx: bot, toolTop: mt, toolStep: step, btn: Math.max(CBX.touch, Math.min(56, m.pw - 12)), tryW: m.pw - 8,
      area: { x0: m.left, x1: w - m.right, w: Math.max(0, w - m.left - m.right), y0: 0, y1: h, h }, areaFrac: Math.max(0, h - top - bot) / h, trayBottom: sb };
  }
  const top = Math.max(CBX.topPort, Math.max(0, insetT) + 54), bot = CBX.stackPort + sb;
  return { orient: 'port', pw: 0, left: 0, right: 0, topPx: top, botPx: bot, area: { x0: 0, x1: w, w, y0: 0, y1: h, h }, areaFrac: Math.max(0, h - top - bot) / h, trayBottom: sb + 2 * CBX.gap + CBX.goH + CBX.toolH };
}
export const touchOk = (m) => m.orient !== 'land' || (m.btn >= CBX.touch && m.tryW >= CBX.touch && m.toolStep >= CBX.touch);

// ---------- hvilke handlinger er hvor ----------
// fixed = faste knapper på skjermen, sheet = i ⋯-arket, near = små handlinger ved valgt del. Mens PRØV går: bare ←, ⋯, SLOW, PAUSE og STOPP.
export const SHEET_KEYS = ['loads', 'share', 'lab', 'snap', 'rotl', 'rotr', 'fit', 'reset', 'menu'];   // last, KODE/LIM INN/BESTE (+ SE IGJEN), Bygglab-raden, SNAP, rotér, tilpass, NULLSTILL
export function classicControls({ sim = false, selKind = null } = {}) {
  const fixed = sim ? ['back', 'more', 'slow', 'pause', 'try'] : ['back', 'more', ...CBX.tools.map((t) => t.id), 'undo', 'try'];
  const near = sim ? [] : selKind === 'part' ? ['rotl', 'rotr', 'del'] : selKind === 'link' ? ['del'] : [];
  return { fixed, sheet: [...SHEET_KEYS], near, tray: !sim };
}
export const whereIs = (key, o) => { const c = classicControls(o); return c.fixed.includes(key) ? 'fixed' : c.near.includes(key) ? 'near' : c.sheet.includes(key) ? 'sheet' : null; };
// hva skjermen har av faste kontroller mens du bygger (uten ⚑ og delebrettet): målet er å ha færre enn dagens ca. 25
export const fixedCount = (o) => classicControls(o).fixed.length;
export const tryLabel = (sim) => (sim ? { icon: '■', key: 'build.stop' } : { icon: '▶', key: 'build.try' });

// ---------- valgt del: ramme og lita verktøylinje ----------
// hva er valgt? 'part' (del), 'link' (feste) eller null
export const selKindOf = ({ sel = null, selLink = null, sim = false, dragging = false } = {}) => (sim || dragging ? null : sel ? 'part' : selLink ? 'link' : null);
// plasserer verktøylinjen (w × h px) ved siden av valgt del: over delen om det er plass, ellers under. pts = delens hjørner i skjermpunkter; area = byggeområdet i px.
export function barPlace({ pts, w = CBX.barW, h = CBX.barH, area, margin = 8 }) {
  if (!pts || !pts.length || !area) return null;
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y), minY = Math.min(...ys), maxY = Math.max(...ys), cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const x0 = area.x0 + margin + w / 2, x1 = area.x1 - margin - w / 2, x = x1 >= x0 ? clamp(cx, x0, x1) : (area.x0 + area.x1) / 2;
  let y = minY - margin - h, below = false;                        // y = øverste kant
  if (y < area.y0 + margin) { y = maxY + margin; below = true; }
  y = clamp(y, area.y0 + margin, Math.max(area.y0 + margin, area.y1 - margin - h));
  return { x, y, left: x - w / 2, w, h, below };
}
// treffer et skjermpunkt verktøylinjen?
export const barHit = (bar, x, y) => !!bar && x >= bar.left && x <= bar.left + bar.w && y >= bar.y && y <= bar.y + bar.h;

// ---------- festing: instruksjon og spøkelseslinje ----------
// 'none' (ingen verktøy valgt), 'pick1' («Trykk første del»), 'pick2» («Trykk neste del eller underlaget»)
export const toolStep = ({ tool = null, linkFrom = null } = {}) => (!tool || !LINK_KINDS.includes(tool) ? 'none' : linkFrom ? 'pick2' : 'pick1');
export const stepKey = (s) => (s === 'pick1' ? 'cbx.step1' : s === 'pick2' ? 'cbx.step2' : null);
// spøkelseslinjen fra første del mot fingeren (ptr = fingerens posisjon i brettets enheter). Bruker addLink på en kopi, så sjekkene er de samme som ved ekte festing.
// → { show, ok, why, kind, a, b, toGround, cancel }  der why er en av addLink sine ('far','dup','part','kind') eller 'none'
export function linkGhost(B, kind, fromId, ptr, pad = CBX.ghostPad) {
  const a = B && B.placed.find((p) => p.id === fromId);
  if (!a || !ptr || !LINK_KINDS.includes(kind)) return { show: false, ok: false, why: 'none' };
  const aC = { u: a.u, v: a.v }, tgt = topHit(B, ptr.u, ptr.v, pad);
  if (tgt && tgt.id === fromId) return { show: false, ok: false, why: 'same', cancel: true, kind, a: aC };   // samme del: avbryter
  const tmp = { ...B, links: B.links.map((l) => ({ ...l })), history: [], rg: undefined };
  const r = addLink(tmp, kind, fromId, tgt ? tgt.id : null, { u: ptr.u, v: ptr.v });
  if (r.ok) { const e = linkEnds(tmp, r.link); return { show: true, ok: true, why: '', kind, a: e[0], b: e[1], toGround: !tgt, toId: tgt ? tgt.id : null }; }
  return { show: true, ok: false, why: r.why, kind, a: aC, b: tgt ? { u: tgt.u, v: tgt.v } : { u: ptr.u, v: ptr.v }, toGround: !tgt, toId: tgt ? tgt.id : null };
}
export const ghostKey = (g) => (g && g.show ? (g.ok ? 'cbx.ghostOk' : g.why === 'far' ? 'cbx.far' : g.why === 'dup' ? 'cbx.dup' : 'cbx.bad') : null);

// ---------- hånd-hjelp første gang ----------
// vises én gang per enhet, når to deler ligger på brettet og ingenting er festet; følger hjelpenivået (bort på Ekspert) og veiledningen
export function handPair(B) {
  if (!B || B.links.length || B.placed.length < 2) return null;
  const [p, q] = B.placed; return { a: { u: p.u, v: p.v }, b: { u: q.u, v: q.v } };
}
export const shouldShowCHand = ({ seen, hint, guideOn = true, B = null, sim = false }) => !sim && shouldShowHand({ seen, hint, guideOn, wanted: !!handPair(B) });
// posisjon og trykk-tilstand til hånden: trykk første del, flytt, trykk neste del. phase: 0 = første del, 1 = på vei, 2 = neste del
export function tapHandAt(t, a, b, secs = CBX.handSecs) {
  const k = clamp(t / secs, 0, 1), m = k < 0.4 ? 0 : k > 0.6 ? 1 : (k - 0.4) / 0.2, e = m * m * (3 - 2 * m);
  return { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e, k, phase: k < 0.4 ? 0 : k > 0.6 ? 2 : 1, down: (k >= 0.12 && k <= 0.3) || (k >= 0.72 && k <= 0.9), done: k >= 1 };
}

// ---------- logg og mål ----------
// byggehandlinger og tid til første mål (bro/trapp/vippe) per format. Byggingen mistes ikke ved snuing (tilstanden ligger i byggeskjermen, ikke i formatet).
export const createCStats = (orient = 'port', t = 0) => ({ ...createOrientStats(orient, t), won: null });
export { statsAct, statsTurn, statsTry, statsWin, orientOf, orientName };
export function goalWord(site) { const id = String(site?.id || ''); return /trapp/.test(id) ? 'trapp' : /vippe/.test(id) ? 'vippe' : /bro/.test(id) ? 'bro' : 'mål'; }
export const actLine = (what, orient, n) => `modus klassisk: ${what} (${orientName(orient)}, handling ${n})`;
export const winLine = (w, site) => `modus klassisk: første ${goalWord(site)} (${orientName(w.orient)}) etter ${w.secs.toFixed(0)} s, ${w.acts} byggehandlinger (stående ${w.actsPort}, liggende ${w.actsLand}), snudd ${w.turns} ganger, ${w.tries} prøver`;
export const turnLine = (t, n) => `modus klassisk: snudd til ${orientName(t.to)} (${n} deler beholdt), ${t.acts} byggehandlinger så langt`;
