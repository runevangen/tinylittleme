// R68: bane per tikk fra den ekte boten, til kinomodus (cine.runRoute i cinema_view.js).
// Bruk: node tools/cine_route.mjs levels/<brett>.level.json [veg=ruta] [--mode streng|løs] [--every 1] [--out fil.json]
// Veg er id fra boten: ruta, genvei:<id>, hard:<id>, bygg:<id>. Utdata: { level, plan, mode, ok, every, ticks, trace: [[t,x,y,z,state,fx,fz], …] }
import fs from 'node:fs';
import { plansOf, runPlan } from './bot.mjs';

export function routeTrace(levelPath, planId = 'ruta', { mode = 'streng', every = 1 } = {}) {   // every = tikk mellom hver rad (1 = hvert tikk, 1/60 s)
  const L = JSON.parse(fs.readFileSync(levelPath, 'utf8')), plan = plansOf(L).find((p) => p.id === planId);
  if (!plan) throw new Error(`ukjent veg ${planId} i ${levelPath}: ${plansOf(L).map((p) => p.id).join(', ')}`);
  const r = runPlan(L, levelPath, plan, mode, { traceEvery: Math.max(1, Math.floor(every)) });
  return { level: L.id || levelPath, plan: planId, mode, ok: r.ok, why: r.why, every: Math.max(1, Math.floor(every)), ticks: r.trace.length, trace: r.trace };
}
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const a = process.argv.slice(2), opt = (k, d) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : d; };
  const pos = a.filter((x, i) => !x.startsWith('--') && !['--mode', '--every', '--out'].includes(a[i - 1]));
  if (!pos[0]) { console.error('bruk: node tools/cine_route.mjs levels/<brett>.level.json [veg] [--mode streng|løs] [--every n] [--out fil]'); process.exit(1); }
  const r = routeTrace(pos[0], pos[1] || 'ruta', { mode: opt('--mode', 'streng'), every: +opt('--every', 1) });
  const txt = JSON.stringify(r); if (opt('--out')) fs.writeFileSync(opt('--out'), txt); else console.log(txt);
  console.error(`${r.ok ? 'OK' : 'FEIL'} ${r.plan} (${r.mode}): ${r.ticks} rader${r.why ? ' · ' + r.why : ''}`); process.exit(r.ok ? 0 : 2);
}
