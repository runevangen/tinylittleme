// R32: boten. Går alle veiene i et brett med den ekte fysikken og gir en dom per vei:
//   ruta         den vanlige (harde) ruta, med klatring (GREP) og hopp
//   genvei:<id>  verktøy-genvei (R29): uten verktøyet kommer du ikke opp, med verktøyet går ruta og er raskere
//   bygg:<id>    byggesnarvei (R30): referansebygget (PRØV i 2D-fysikk), bygget settes inn som faste flater, ruta via bygget går
// To nivåer av «menneskelige evner»:
//   streng  uten sikte-hjelp (kantvakt, luftstøtte, magnet), uten veggsprang: bare det en spiller klarer med stikke + HOPP + GREP
//   løs     alle hjelpemidler på (slik spillet står som standard), veggsprang tillatt av fysikken
// Veggsprang (avgjort i R32): botens ruter bruker det aldri, og streng modus slår det av. Spillere kan bruke det, men et brett skal
// aldri kreve det, så det regnes ikke som bevis for at et brett er gjennomførbart.
// Dommer: BESTÅR_STRENG · BESTÅR_LØS (går bare med hjelpemidler) · TIL_GJENNOMGANG (løs feiler på lang rute: kan være botens feil, en
// menneske må se på det) · FEIL (løs feiler på kort rute).
// Bruk: node tools/bot.mjs levels/<navn>.level.json [--verbose] [--svg ut.svg] [--json]   (avslutter 0 = ok, 2 = feil, 3 = til gjennomgang)
import fs from 'node:fs';
import { walkRoute } from './walk_route.mjs';
import { shortcutsOf, shortcutRoute, gateRoute, toolBoxes } from '../shortcut.js';
import * as BW from '../build_world.js';
import * as BP from '../build_phys.js';

export const MODES = {
  streng: { helpers: false, only: ['autoJump', 'holdGrab'], wallJump: false },     // autoJump/holdGrab = knappene HOPP og GREP holdt riktig
  løs: { helpers: true, wallJump: true },
};
export const LONG = { steps: 10, len: 120 };                                       // fra og med dette er en rute «lang» (steg eller gåavstand i cm): feil sendes til gjennomgang (tiden brukes ikke: en rute som feiler bruker alltid tidsfristen)
export const routeLen = (R, start) => { let q = start, t = 0; for (const n of (R || []).slice(1)) { const c = [(n.x0 + n.x1) / 2, (n.z0 + n.z1) / 2]; t += Math.hypot(c[0] - q[0], c[1] - q[1]); q = c; } return Math.round(t); };
export const isLong = (r) => r.steps >= LONG.steps || (r.len || 0) >= LONG.len;

// Én vei i ett nivå av evner. Returnerer { id, kind, ok, why, secs, steps, trace, nodes }.
function runPlan(L, levelPath, plan, mode) {
  const trace = [], base = { ...MODES[mode], trace, level: L };
  let r;
  if (plan.kind === 'ruta') r = walkRoute(levelPath, { ...base });
  else if (plan.kind === 'genvei') {
    const gate = gateRoute(L, plan.sc), tb = toolBoxes(L, plan.sc);
    if (!gate || !plan.route || !tb.boxes.length) r = { ok: false, why: tb.why || 'finner ikke trinnene eller flata genveien ender på', secs: 0, steps: (plan.route || []).length - 1 };
    else {
      const noTool = walkRoute(levelPath, { ...MODES[mode], level: L, route: gate });
      r = walkRoute(levelPath, { ...base, route: plan.route, extraBoxes: tb.boxes });
      if (r.ok && noTool.ok) r = { ...r, ok: false, why: 'første trinn kan nås uten verktøyet (for lavt)' };
    }
  } else r = walkRoute(null, { ...base, route: plan.route, extraBoxes: plan.solids });
  return { id: plan.id, kind: plan.kind, mode, len: routeLen(plan.route || L.route, [L.start[0], L.start[2]]), ok: r.ok, why: r.why || '', secs: r.secs, steps: r.steps, trace, nodes: (plan.route || L.route || []).map((n) => n.id) };
}

// Alle veiene i et brett (ruta, genveier, byggesnarveier). `extra` = hvilke rutetyper som er med.
export function plansOf(L) {
  const plans = [{ id: 'ruta', kind: 'ruta', route: L.route }];
  for (const sc of shortcutsOf(L)) plans.push({ id: `genvei:${sc.id}`, kind: 'genvei', sc, route: shortcutRoute(L, sc) });
  for (const site of L.build?.sites || []) {
    if (!site.ref?.placed?.length || !site.ref.route) continue;
    const route = BW.refRoute(L, site), sim = BP.runSim({ site, placed: site.ref.placed, links: site.ref.links });
    plans.push({ id: `bygg:${site.id}`, kind: 'bygg', route, site, solids: sim.result === 'won' ? BW.buildSolids(site, BP.settledPlaced({ site, placed: site.ref.placed, links: site.ref.links })) : [], simFail: sim.result === 'won' ? '' : `referansebygget består ikke PRØV (${sim.reason})` });
  }
  return plans;
}

// Dom for én vei ut fra de to nivåene.
export function verdictOf(strict, loose) {
  if (strict.ok) return 'BESTÅR_STRENG';
  if (loose.ok) return 'BESTÅR_LØS';
  return isLong(loose) ? 'TIL_GJENNOMGANG' : 'FEIL';
}

export function botSolve(levelPath, { level = null } = {}) {
  const L = level || JSON.parse(fs.readFileSync(levelPath, 'utf8')), out = { level: L.name || levelPath, plans: [] };
  if ((L.route || []).length < 2) return { ...out, verdict: 'FEIL', why: 'brettet har ingen rute' };
  for (const plan of plansOf(L)) {
    const res = {};
    for (const mode of ['streng', 'løs']) res[mode] = plan.simFail ? { id: plan.id, kind: plan.kind, mode, ok: false, why: plan.simFail, secs: 0, steps: (plan.route || []).length - 1, len: 0, trace: [], nodes: [] } : runPlan(L, levelPath, plan, mode);
    out.plans.push({ id: plan.id, kind: plan.kind, streng: res.streng, løs: res.løs, verdict: verdictOf(res.streng, res.løs) });
  }
  const rank = { FEIL: 3, TIL_GJENNOMGANG: 2, BESTÅR_LØS: 1, BESTÅR_STRENG: 0 };
  out.verdict = out.plans.reduce((w, p) => (rank[p.verdict] > rank[w] ? p.verdict : w), 'BESTÅR_STRENG');
  out.review = out.plans.filter((p) => p.verdict === 'TIL_GJENNOMGANG' || p.verdict === 'FEIL').map((p) => ({ id: p.id, verdict: p.verdict, why: p.løs.why || p.streng.why, secs: p.løs.secs, steps: p.løs.steps, len: p.løs.len }));
  return out;
}

// Rutevisning som tekst: ett trinn per linje med høyde og type (klatring/hopp/gang).
export function routeText(L, plan) {
  const R = plan.nodes.map((id) => L.boxes.find((b) => b.id === id)).filter(Boolean), lines = []; let prevTop = 0;
  for (const b of R) { const top = b.max[1], d = top - prevTop; lines.push(`  ${String(lines.length).padStart(2)} ${b.id.padEnd(20)} høyde ${top.toFixed(1).padStart(6)}  ${lines.length === 0 ? 'start' : d > 2.8 ? 'klatre/hopp opp ' + d.toFixed(1) : d < -0.5 ? 'ned ' + (-d).toFixed(1) : 'gå/hopp'}`); prevTop = top; }
  return lines.join('\n');
}

// Rutevisning som SVG: sideriss (x mot høyde) med boksene grå og botens spor som linje. Kan åpnes i nettleser.
export function routeSvg(L, plan) {
  const W = 900, H = 360, room = L.room || { x0: -70, x1: 70, height: 44 }, sx = (W - 20) / (room.x1 - room.x0), sy = Math.min(sx, (H - 30) / Math.max(40, ...L.boxes.map((b) => b.max[1]).filter((y) => y < 400)));
  const X = (x) => 10 + (x - room.x0) * sx, Y = (y) => H - 10 - y * sy;
  const boxes = L.boxes.filter((b) => b.type !== 'wall' && b.max[1] - b.min[1] < 400).map((b) => `<rect x="${X(b.min[0]).toFixed(1)}" y="${Y(b.max[1]).toFixed(1)}" width="${((b.max[0] - b.min[0]) * sx).toFixed(1)}" height="${Math.max(1, (b.max[1] - Math.max(0, b.min[1])) * sy).toFixed(1)}" fill="#bbb" stroke="#666" stroke-width=".5"><title>${b.id}</title></rect>`).join('');
  const pts = plan.trace.map((t) => `${X(t[1]).toFixed(1)},${Y(t[2] + 1).toFixed(1)}`).join(' ');
  const g = L.goal;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#fff"/>${boxes}<polyline points="${pts}" fill="none" stroke="${plan.ok ? '#d33' : '#e90'}" stroke-width="2"/><circle cx="${X(g[0]).toFixed(1)}" cy="${Y(g[1] + 1).toFixed(1)}" r="5" fill="#2a2"/><text x="12" y="16" font-size="12" font-family="sans-serif">${plan.id} (${plan.mode}${plan.ok ? '' : ', FEILET: ' + plan.why.replace(/[<>&]/g, '')})</text></svg>`;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const file = process.argv[2]; if (!file) { console.error('bruk: bot.mjs <level.json> [--verbose] [--svg ut.svg] [--json]'); process.exit(1); }
  const verbose = process.argv.includes('--verbose'), si = process.argv.indexOf('--svg'), L = JSON.parse(fs.readFileSync(file, 'utf8')), r = botSolve(file, { level: L });
  if (process.argv.includes('--json')) { console.log(JSON.stringify(r, (k, v) => (k === 'trace' ? undefined : v), 1)); process.exit({ FEIL: 2, TIL_GJENNOMGANG: 3 }[r.verdict] || 0); }
  console.log(`${r.level}: ${r.verdict}${r.why ? ' (' + r.why + ')' : ''}`);
  for (const p of r.plans) {
    const f = (m) => (p[m].ok ? `${m} ok ${p[m].secs} s` : `${m} FEIL: ${p[m].why}`);
    console.log(`  ${p.id.padEnd(22)} ${p.verdict.padEnd(16)} ${f('streng')}; ${f('løs')}`);
    if (verbose) console.log(routeText(L, p.streng.ok ? p.streng : p.løs));
  }
  if (si > 0 && process.argv[si + 1]) {
    const want = r.plans[0], pick = want.streng.trace.length ? want.streng : want.løs;
    fs.writeFileSync(process.argv[si + 1], routeSvg(L, pick)); console.log(`rutevisning: ${process.argv[si + 1]}`);
  }
  if (r.review?.length) { console.log('TIL MENNESKELIG GJENNOMGANG:'); for (const q of r.review) console.log(`  - ${q.id}: ${q.why} (${q.steps} steg, ${q.len} enheter)`); }
  process.exit({ FEIL: 2, TIL_GJENNOMGANG: 3 }[r.verdict] || 0);
}
