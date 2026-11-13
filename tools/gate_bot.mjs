// R60: boten løser gåter med trykkplate, dør og bryter med den ekte fysikken (som walk_route, men med gåtene på).
// Den bærer lette ting (TA) til plater som er for tunge for figuren alene, står på plater figuren er tung nok til, slår brytere (TA),
// og går gjennom hver dør/bro som åpner seg. Gåtene tas i rekkefølge fra start (dører sortert langs veien).
// Bruk: node tools/gate_bot.mjs levels/gaate.level.json [--verbose]    (avslutter 0 = alle gåter løst, 2 = feil)
import fs from 'node:fs';
import { P, newPlayer, step, applyPreset, initBodies, drainEvents } from '../physics.js';
import { initGates, stepGates, toggleSwitch, nearSwitch, doorById, doorOpen, plateLoad, plateNeed, GATE, gatesBudget } from '../plates_logic.js';

export function solveGates(levelPath, { level = null, verbose = false } = {}) {
  applyPreset('mario'); Object.assign(P, { edgeGuard: true, autoJump: true, airSteady: true, magnet: true, holdGrab: true, shimmy: true, rollOn: true, carefulOn: true });
  const L = level ? JSON.parse(JSON.stringify(level)) : JSON.parse(fs.readFileSync(levelPath, 'utf8'));
  initBodies(L); initGates(L);
  const p = newPlayer(...L.start), idle = { mx: 0, mz: 0, jumpPressed: false, jumpHeld: false, grabPressed: false, grabHeld: false }, out = { ok: true, log: [], events: [], solved: [], L, p };
  const say = (m) => { out.log.push(`${(t / 60).toFixed(1)}s ${m}`); if (verbose) console.log(out.log.at(-1)); };
  let t = 0;
  const tick = (inp = {}) => { step(p, { ...idle, ...inp }, 1 / 60, L); drainEvents(L); for (const ev of stepGates(L, 1 / 60, p, true)) out.events.push(ev); t++; };
  const fail = (why) => { out.ok = false; out.why = why; say('FEIL: ' + why); return out; };
  // gå mot (x, z); hopp når vi står fast mot noe som ligger høyere. Stopper når vi er nær nok.
  function walkTo(x, z, tol = 0.35, max = 60 * 30) {
    let still = 0, lx = p.x, lz = p.z;
    for (let k = 0; k < max; k++) {
      const dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz); if (d < tol) return true;
      const moved = Math.hypot(p.x - lx, p.z - lz); lx = p.x; lz = p.z; still = moved < 0.004 ? still + 1 : 0;
      tick({ mx: dx / d * 0.8, mz: dz / d * 0.8, jumpPressed: still > 6 && p.onGround && k % 3 === 0, jumpHeld: still > 6 });
    }
    return false;
  }
  const settle = (n = 30) => { for (let i = 0; i < n; i++) tick(); };
  const lights = () => L.bodies.filter((b) => b.alive && b.weight === 'light');
  const centre = (b) => [(b.min[0] + b.max[0]) / 2, (b.min[2] + b.max[2]) / 2];
  const used = new Set();
  // bær en lett ting til midten av en plate og sett den fra deg
  function carryTo(pl) {
    const cx = (pl.x0 + pl.x1) / 2, cz = (pl.z0 + pl.z1) / 2;
    const reach = (b) => L.gateS.doors.every((d) => d.kind === 'bridge' || d.t >= 0.999 || (centre(b)[0] - (d.min[0] + d.max[0]) / 2) * (p.x - (d.min[0] + d.max[0]) / 2) > 0);   // på samme side av alle lukkede dører som figuren
    const free = lights().filter((b) => !used.has(b.id) && reach(b)).sort((a, b) => Math.hypot(centre(a)[0] - cx, centre(a)[1] - cz) - Math.hypot(centre(b)[0] - cx, centre(b)[1] - cz));
    const b = free[0]; if (!b) return `ingen løs ting igjen til ${pl.id}`;
    const [bx, bz] = centre(b);
    // stå på sida av tingen som vender bort fra platen og gå mot den (så peker figuren mot tingen)
    const ux = bx - cx, uz = bz - cz, ul = Math.hypot(ux, uz) || 1;
    { const px = -uz / ul, pz = ux / ul, sgn = (p.x - bx) * px + (p.z - bz) * pz >= 0 ? 1 : -1;      // gå i en bue rundt tingen (ikke gjennom den)
      walkTo(bx + sgn * px * 3 + ux / ul * 1.6, bz + sgn * pz * 3 + uz / ul * 1.6, 0.4); }
    if (!walkTo(bx + ux / ul * 1.6, bz + uz / ul * 1.6, 0.3)) return `kom ikke bort til ${b.id}`;
    for (let i = 0; i < 90 && !p.carry; i++) {                                    // gå mot tingen til den er innen rekkevidde, og trykk TA
      const dx = bx - p.x, dz = bz - p.z, d = Math.hypot(dx, dz) || 1, gap = Math.hypot(Math.max(b.min[0] - p.x, 0, p.x - b.max[0]), Math.max(b.min[2] - p.z, 0, p.z - b.max[2]));
      tick({ mx: dx / d * (gap < 0.9 ? 0.05 : 0.5), mz: dz / d * (gap < 0.9 ? 0.05 : 0.5), carryPressed: gap < 0.9 && i % 4 === 0 });
    }
    if (p.carry !== b) return `fikk ikke tak i ${b.id}`;
    used.add(b.id); say(`tok ${b.id}`);
    if (!walkTo(cx - ux / ul * 0.3, cz - uz / ul * 0.3, 0.45)) return `kom ikke til ${pl.id} med ${b.id}`;
    for (let i = 0; i < 30; i++) tick({ mx: -ux / ul * 0.05, mz: -uz / ul * 0.05, carryPressed: i === 5 });      // sett den fra deg (TA igjen)
    settle(40);
    if (p.carry) return `slapp ikke ${b.id}`;
    walkTo(p.x, p.z + (p.z > 0 ? -4 : 4), 0.4, 200);                                      // gå rundt tingen i stedet for å dytte den av platen
    return null;
  }
  const doors = [...L.gateS.doors].sort((a, b) => a.min[0] - b.min[0]);
  for (const d of doors) {
    if (d.optional) continue;
    for (const id of d.needs) {
      const pl = L.gateS.plates.find((q) => q.id === id), sw = L.gateS.switches.find((q) => q.id === id);
      if (pl) {
        if (plateLoad(L, pl, null) >= plateNeed(pl)) continue;
        if (GATE.hero >= plateNeed(pl)) { if (!walkTo((pl.x0 + pl.x1) / 2, (pl.z0 + pl.z1) / 2, 0.3)) return fail(`kom ikke til ${pl.id}`); settle(10); }
        else { const e = carryTo(pl); if (e) return fail(e); }
        if (!pl.on) return fail(`${pl.id} trykkes ikke ned (last ${pl.load}, trenger ${plateNeed(pl)})`);
        say(`plate ${pl.id} trykket (last ${pl.load})`);
      } else if (sw) {
        if (!walkTo(sw.x - 0.9, sw.z, 0.4)) return fail(`kom ikke til ${sw.id} (står på ${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}, ${p.state})`);
        settle(5); if (!nearSwitch(L, p)) return fail(`${sw.id} er ikke innen rekkevidde`);
        toggleSwitch(L, sw.id); say(`slo ${sw.id}`);
      }
    }
    settle(Math.ceil(GATE.dur * 60) + 20);
    if (!doorOpen(d)) return fail(`${d.id} åpnet seg ikke`);
    say(`${d.id} er åpen`); out.solved.push(d.id);
    // gå gjennom: for en dør til andre siden, for en bro til midten av flata på den andre enden
    const thinZ = d.max[2] - d.min[2] < d.max[0] - d.min[0] && d.kind !== 'bridge';                  // døra står på tvers av z (nisja), ellers på tvers av x
    const target = d.kind === 'bridge' ? [d.max[0] + 1.5, (d.min[2] + d.max[2]) / 2] : thinZ ? [(d.min[0] + d.max[0]) / 2, d.max[2] + 1.5] : [d.max[0] + 1.5, p.z];
    if (!walkTo(target[0], target[1], 0.5)) return fail(`kom ikke gjennom ${d.id} (står på ${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}, ${p.state}, grunn: ${p.groundBox?.id})`);
    say(`gikk gjennom ${d.id}`);
  }
  out.gate = L.goal; out.budget = gatesBudget(L); return out;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const f = process.argv[2]; if (!f) { console.error('bruk: gate_bot.mjs <level.json> [--verbose]'); process.exit(1); }
  const r = solveGates(f, { verbose: process.argv.includes('--verbose') });
  console.log(r.ok ? `${f}: alle gåter løst (${r.solved.join(', ')})` : `${f}: FEIL ${r.why}`);
  process.exit(r.ok ? 0 : 2);
}
