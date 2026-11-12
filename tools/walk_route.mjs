// Går ruta i et brett med den ekte fysikken (Mario-stil med hjelpemidlene på), slik en øvet spiller ville gjort:
// gå mot neste flate, hopp når den ligger høyere eller over et gap, hold GREP mot klatreflater og hiv deg opp fra kanten.
// Bruk: node tools/walk_route.mjs levels/bad.level.json [--verbose]
// Finner den frem, er ruta gjennomførbar. Finner den ikke frem, er det enten for vanskelig eller verktøyet er for dumt: se hvor det stopper.
import fs from 'node:fs';
import { P, newPlayer, step, applyPreset, initBodies, inHazard } from '../physics.js';
import { shortcutsOf, shortcutRoute, gateRoute, toolBoxes } from '../shortcut.js';

export function walkRoute(levelPath, { verbose = false, preset = 'mario', level = null, route = null, extraBoxes = [] } = {}) {   // R26: level/route/extraBoxes = gå en annen rute i et brett med et bygg (se test_buildworld.mjs)
  applyPreset(preset); Object.assign(P, { edgeGuard: true, autoJump: true, airSteady: true, magnet: true, holdGrab: true });
  const L = level ? JSON.parse(JSON.stringify(level)) : JSON.parse(fs.readFileSync(levelPath, 'utf8')); initBodies(L); for (const b of extraBoxes) L.boxes.push(JSON.parse(JSON.stringify(b)));
  const R = route || L.route || []; if (R.length < 2) return { ok: false, why: 'brettet har ingen rute' };
  const p = newPlayer(...L.start), idle = { mx: 0, mz: 0, jumpPressed: false, jumpHeld: false, grabPressed: false, grabHeld: false };
  let t = 0, fail = null; const log = [];
  const tick = (inp) => { step(p, { ...idle, ...inp }, 1 / 60, L); t++; if (inHazard(L, p)) fail = `fare: ${inHazard(L, p).id}`; else if (p.knockout) fail = 'for hardt fall'; else if (p.y < L.deathY) fail = 'falt ut'; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const near = (n, m = 0.35) => [clamp(p.x, Math.min(n.x0 + m, (n.x0 + n.x1) / 2), Math.max(n.x1 - m, (n.x0 + n.x1) / 2)), clamp(p.z, Math.min(n.z0 + m, (n.z0 + n.z1) / 2), Math.max(n.z1 - m, (n.z0 + n.z1) / 2))];
  const on = (n) => p.onGround && Math.abs(p.y - n.top) < 0.06 && p.x > n.x0 - 0.32 && p.x < n.x1 + 0.32 && p.z > n.z0 - 0.32 && p.z < n.z1 + 0.32;
  for (let i = 0; i < 20; i++) tick({});
  for (let i = 1; i < R.length && !fail; i++) {
    const B = R[i], t0 = t; let jumpT = -99, tries = 0, lastPos = [p.x, p.z], lastT = t, detour = 0, side = 1, stuckN = 0;
    if (B.grip) {                                              // klatreflate: gå inntil, hold GREP, klatre til toppen av neste flate
      const C = R[i + 1]; i++;
      for (let k = 0; k < 600 && p.onGround && p.stam < P.stamina - 0.1 && !fail; k++) tick({});       // hvil til kreftene er fulle før du klatrer (som en spiller ville gjort)
      // gå til den åpne siden av klatreflaten (den som vender bort fra flaten du skal opp på), om nødvendig rundt enden av den
      { const thinX = B.x1 - B.x0 < B.z1 - B.z0, gc = [(B.x0 + B.x1) / 2, (B.z0 + B.z1) / 2], cc = [(C.x0 + C.x1) / 2, (C.z0 + C.z1) / 2];
        const sgn = (thinX ? gc[0] - cc[0] : gc[1] - cc[1]) >= 0 ? 1 : -1, half = (thinX ? B.x1 - B.x0 : B.z1 - B.z0) / 2;
        const side = (q) => ((thinX ? q[0] - gc[0] : q[1] - gc[1]) * sgn);
        const mk = (off, along) => (thinX ? [gc[0] + sgn * off, along] : [along, gc[1] + sgn * off]);
        const walkTo = (w, n = 360) => { for (let k = 0; k < n && !fail && Math.hypot(w[0] - p.x, w[1] - p.z) > 0.25 && p.onGround; k++) { const dx = w[0] - p.x, dz = w[1] - p.z, d = Math.hypot(dx, dz); tick({ mx: dx / d * 0.7, mz: dz / d * 0.7 }); } };
        if (B.id !== C.id && p.onGround && Math.abs(p.y - C.top) > 0.06 && side([p.x, p.z]) < half + 0.25) {       // (en kurv du klatrer rett opp på har ingen «riktig» side)
          const lo = thinX ? B.z0 : B.x0, hi = thinX ? B.z1 : B.x1, me = thinX ? p.z : p.x, end = Math.abs(me - lo) < Math.abs(me - hi) ? lo - 0.75 : hi + 0.75;
          walkTo(mk(-(half + 0.7), end)); walkTo(mk(half + 0.7, end)); walkTo(mk(half + 0.7, thinX ? gc[1] : gc[0]));
        } }
      while (!fail && !on(C) && t - t0 < 60 * 40) {
        const [tx, tz] = near(B, 0.2), dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz) || 1;
        if (p.state === 'hang') tick({ jumpPressed: t % 20 === 0 });
        else if (p.state === 'mantle') tick({});
        else if (p.state === 'climb') { const c = p.climb; tick({ mx: -c.nx, mz: -c.nz }); }
        else if (p.onGround && Math.abs(p.y - C.top) < 0.06) { const [cx, cz] = near(C), ex = cx - p.x, ez = cz - p.z, e = Math.hypot(ex, ez) || 1; tick({ mx: ex / e, mz: ez / e }); }
        else tick({ mx: dx / d, mz: dz / d, grabPressed: t % 30 === 0, grabHeld: true });
      }
      if (!on(C) && !fail) fail = `kom ikke opp klatreflaten ${B.id} til ${C.id} (y=${p.y.toFixed(1)}, ${p.state}, krefter ${p.stam.toFixed(1)})`;
      log.push(`${(t / 60).toFixed(1)}s  klatret ${B.id} → ${C.id} (krefter igjen ${p.stam.toFixed(1)})`);
      continue;
    }
    // gå først til det stedet på flaten du står på som ligger nærmest neste flate, og gå/hopp over derfra (ikke på skrå utfor kanten)
    const A = R[i - 1], cl = (v, a, b) => (a > b ? (a + b) / 2 : clamp(v, a, b)), m = 0.35;
    const b0 = [clamp((A.x0 + A.x1) / 2, B.x0, B.x1), clamp((A.z0 + A.z1) / 2, B.z0, B.z1)];
    let a1 = [cl(b0[0], A.x0 + m, A.x1 - m), cl(b0[1], A.z0 + m, A.z1 - m)];
    if (B.top > A.top + 0.3 && a1[0] > B.x0 - 0.3 && a1[0] < B.x1 + 0.3 && a1[1] > B.z0 - 0.3 && a1[1] < B.z1 + 0.3) {      // neste flate henger over denne (skuffetrapp): still deg på den delen som stikker frem, ikke under
      const inA = ([x, z]) => x >= A.x0 + m - 1e-6 && x <= A.x1 - m + 1e-6 && z >= A.z0 + m - 1e-6 && z <= A.z1 - m + 1e-6;
      const c = [[B.x0 - 0.45, a1[1]], [B.x1 + 0.45, a1[1]], [a1[0], B.z0 - 0.45], [a1[0], B.z1 + 0.45]].filter(inA).sort((u, v) => Math.hypot(u[0] - a1[0], u[1] - a1[1]) - Math.hypot(v[0] - a1[0], v[1] - a1[1]))[0];
      if (c) a1 = c;
    }
    let staged = A.id === 'gulv' || B.id === 'gulv';
    const last = i === R.length - 1, there = () => on(B) || (last && p.onGround && Math.hypot(p.x - L.goal[0], p.z - L.goal[2]) < 2 && Math.abs(p.y - L.goal[1]) < 2.5);   // ved målet gjelder spillets egen regel
    while (!fail && !there() && t - t0 < 60 * 30) {
      if (!staged && (Math.hypot(a1[0] - p.x, a1[1] - p.z) < 0.25 || !(p.onGround && Math.abs(p.y - A.top) < 0.06) || Math.max(B.x0 - p.x, p.x - B.x1, B.z0 - p.z, p.z - B.z1) < 0.45)) staged = true;   // fremme ved kanten, falt av, eller står allerede inntil neste flate
      const inB = p.x > B.x0 && p.x < B.x1 && p.z > B.z0 && p.z < B.z1, [tx, tz] = staged ? (inB && p.onGround && Math.abs(p.y - B.top) > 0.06 && Math.abs(p.y - B.top) < 0.8 ? [(B.x0 + B.x1) / 2, (B.z0 + B.z1) / 2] : near(B)) : a1, dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz) || 1, rise = B.top - p.y;   // R26: står du på noe som stikker inn over flata (enden av en planke), gå mot midten av flata
      if (p.state === 'hang') { tick({ jumpPressed: t % 20 === 0 }); continue; }
      const spd = staged ? 1 : Math.min(1, 0.45 + d * 0.4);       // rolig mot kanten, full fart over
      if (p.state === 'mantle') { tick({}); continue; }
      let jump = false;
      if (staged && p.onGround && p.recover <= 0 && t - jumpT > 50) {
        const edge = Math.max(0, Math.max(B.x0 - p.x, p.x - B.x1), Math.max(B.z0 - p.z, p.z - B.z1));     // avstand til nærmeste kant av neste flate
        if (rise > 0.45 && edge < 0.9 + 0.25 * tries) jump = true;                                        // høyere flate: hopp når du er inntil
        const gapAB = Math.hypot(Math.max(0, Math.max(A.x0, B.x0) - Math.min(A.x1, B.x1)), Math.max(0, Math.max(A.z0, B.z0) - Math.min(A.z1, B.z1)));
        const offA = Math.max(A.x0 - p.x, p.x - A.x1, A.z0 - p.z, p.z - A.z1);                            // > -0.3: tærne er ved kanten av flaten du står på
        if (rise <= 0.45 && gapAB > 0.7 && Math.abs(p.y - A.top) < 0.06 && offA > -0.32 && edge > 0.3) jump = true;   // gap til en flate som ikke er høyere: sats fra kanten
        if (p.onGround && p.y < R[i - 1].top - 0.5 && rise > 0.45 && edge >= 0.9 && t - t0 > 60 * 12) fail = `falt ned før ${B.id}`;
      }
      if (jump) { jumpT = t; tries++; }
      if (t - lastT >= 50) {                                    // står du fast bak noe (en kran, en flaske): gå rundt, annenhver side og litt lenger for hver gang
        const edgeB = Math.max(0, Math.max(B.x0 - p.x, p.x - B.x1), Math.max(B.z0 - p.z, p.z - B.z1));
        if (p.onGround && (rise <= 0.45 || edgeB > 1.3) && Math.hypot(p.x - lastPos[0], p.z - lastPos[1]) < 0.25 && d > 0.3) { stuckN++; side = -side; detour = 25 + 12 * stuckN; }   // ikke når du står inntil en høyere flate: da skal du hoppe, ikke gå til siden
        lastPos = [p.x, p.z]; lastT = t;
      }
      if (detour > 0) { detour--; tick({ mx: (-dz / d * side * 0.9 - dx / d * 0.25) * 0.7, mz: (dx / d * side * 0.9 - dz / d * 0.25) * 0.7 }); continue; }
      tick({ mx: dx / d * spd, mz: dz / d * spd, jumpPressed: jump, jumpHeld: t - jumpT < 40, grabHeld: !p.onGround });
    }
    if (!there() && !fail) fail = `nådde ikke ${B.id} fra ${R[i - 1].id} (står på y=${p.y.toFixed(1)} ved ${p.x.toFixed(1)}, ${p.z.toFixed(1)}; ${p.state})`;
    log.push(`${(t / 60).toFixed(1)}s  ${R[i - 1].id} → ${B.id}${fail ? '  FEIL: ' + fail : ''}`);
  }
  const g = L.goal, won = !fail && Math.hypot(p.x - g[0], p.z - g[2]) < 2 && Math.abs(p.y - g[1]) < 2.5;
  if (!fail && !won) {                                         // gå det siste stykket bort til målet på samme flate
    for (let k = 0; k < 600 && Math.hypot(p.x - g[0], p.z - g[2]) >= 1.5; k++) { const dx = g[0] - p.x, dz = g[2] - p.z, d = Math.hypot(dx, dz) || 1; tick({ mx: dx / d * 0.6, mz: dz / d * 0.6 }); if (fail) break; }
  }
  const ok = !fail && Math.hypot(p.x - g[0], p.z - g[2]) < 2 && Math.abs(p.y - g[1]) < 2.5;
  if (verbose) for (const l of log) console.log('  ' + l);
  return { ok, why: fail || (ok ? '' : `sto ikke ved målet (avstand ${Math.hypot(p.x - g[0], p.z - g[2]).toFixed(1)}, høyde ${p.y.toFixed(1)} mot ${g[1]})`), secs: +(t / 60).toFixed(1), steps: R.length - 1 };
}

// R29: verktøy-genveier. Bevis at (1) første trinn ikke kan nås uten verktøyet, (2) målet nås via genveien med verktøyet (gelfeltet lages av den ekte fysikken),
// og (3) den vanlige ruta uten verktøy også når målet, og er lengre (secs) enn genveien.
export function walkShortcut(levelPath, sc, { level = null } = {}) {
  const L = level || JSON.parse(fs.readFileSync(levelPath, 'utf8')), out = { id: sc.id, ok: false, why: '' };
  const gate = gateRoute(L, sc), route = shortcutRoute(L, sc); if (!gate || !route) return { ...out, why: 'finner ikke trinnene eller flata genveien ender på' };
  const plain = walkRoute(levelPath, { level: L }), noTool = walkRoute(levelPath, { level: L, route: gate }), tb = toolBoxes(L, sc);
  if (!tb.boxes.length) return { ...out, why: tb.why };
  const withTool = walkRoute(levelPath, { level: L, route, extraBoxes: tb.boxes });
  Object.assign(out, { plain, noTool, withTool, gel: tb.boxes.length });
  if (!plain.ok) out.why = `den vanlige ruta går ikke: ${plain.why}`;
  else if (noTool.ok) out.why = 'første trinn kan nås uten verktøyet (for lavt)';
  else if (!withTool.ok) out.why = `med verktøyet: ${withTool.why}`;
  else if (!(withTool.secs < plain.secs)) out.why = `genveien (${withTool.secs} s) er ikke raskere enn den vanlige ruta (${plain.secs} s)`;
  else out.ok = true;
  return out;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const file = process.argv[2]; if (!file) { console.error('bruk: walk_route.mjs <level.json> [--verbose]'); process.exit(1); }
  const r = walkRoute(file, { verbose: process.argv.includes('--verbose') });
  console.log(r.ok ? `RUTA GÅR: ${r.steps} steg på ${r.secs} s` : `RUTA GÅR IKKE: ${r.why}`);
  let bad = !r.ok;
  for (const sc of shortcutsOf(JSON.parse(fs.readFileSync(file, 'utf8')))) {
    const w = walkShortcut(file, sc);
    console.log(w.ok ? `GENVEI ${sc.id}: uten verktøy kommer du ikke opp på første trinn; med ${sc.tool} går ruta på ${w.withTool.secs} s; den vanlige veien tar ${w.plain.secs} s` : `GENVEI ${sc.id} FEILER: ${w.why}`);
    if (!w.ok) bad = true;
  }
  process.exit(bad ? 2 : 0);
}
