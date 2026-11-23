// R145: målflagget i byggeskjermen (build_flag_logic.js): størrelse etter zoom, alltid innenfor skjermen, festet til kanten med pil, og alle byggesteder (vippe1, Bygglab) gir et flagg som kan sees.
import assert from 'node:assert';
import fs from 'node:fs';
import { flagPlan, poleHeight, clothPoints, FLAGV, FLAG_STROKES } from './build_flag_logic.js';
import { siteGoal } from './build_phys.js';
import { fitView, toScreen } from './build_logic.js';
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const W = 390, H = 664;
// størrelse etter zoom, med grenser
ok(poleHeight(6) === FLAGV.poleMin && poleHeight(500) === FLAGV.poleMax && poleHeight(NaN) >= FLAGV.poleMin, 'stanghøyde begrenset');
// i skjermen: ingen festing, plasseringen er målpunktet
let p = flagPlan({ x: 200, y: 400 }, W, H, 25); ok(!p.pinned && p.x === 200 && p.y === 400 && p.side === 0, 'fritt flagg står på målet');
// utenfor høyre/venstre kant: festet, hele stoffet og pila innenfor skjermen
p = flagPlan({ x: 395, y: 400 }, W, H, 25); ok(p.pinned && p.side === 1 && p.x + p.len + FLAGV.arrowRoom <= W - FLAGV.margin + 1e-6, 'høyre: festet innenfor');
p = flagPlan({ x: -5, y: 400 }, W, H, 25); ok(p.pinned && p.side === -1 && p.x - FLAGV.arrowRoom >= FLAGV.margin - 1e-6, 'venstre: festet innenfor');
// loddrett: stanga kommer aldri under toppraden eller delebrettet
p = flagPlan({ x: 200, y: 10 }, W, H, 25); ok(p.vside === -1 && p.y - p.h >= FLAGV.topSafe - 1e-6, 'topp');
p = flagPlan({ x: 200, y: 900 }, W, H, 25); ok(p.vside === 1 && p.y <= H - FLAGV.botSafe + 1e-6, 'bunn');
// 2,5D-forskyvning legges på målpunktet
p = flagPlan({ x: 200, y: 400 }, W, H, 25, { x: 3, y: -7 }); ok(p.x === 203 && p.y === 393, 'forskyvning');
// stoffet: n+1 punkter, bølge begrenset, fast ved stanga
const c = clothPoints(flagPlan({ x: 200, y: 400 }, W, H, 25), 1.3); ok(c.top.length === 5 && c.top[0].x === 0 && Math.abs(c.top[0].y) < 1e-9 && c.top.every((q, i) => Math.abs(q.y) < 8 + i), 'stoff');
ok(FLAG_STROKES <= 12, 'tegnebudsjett');
// alle byggesteder med mål: flagget havner innenfor skjermen på mobilbredde (stående og smal), i 2D, og står ikke lenger bare på målpunktet som kan ligge utenfor
let sites = 0;
for (const f of fs.readdirSync('levels').filter((x) => x.endsWith('.level.json'))) {
  const L = JSON.parse(fs.readFileSync('levels/' + f, 'utf8'));
  for (const s of (L.build?.sites || L.buildSites || [])) {
    sites++;
    for (const [w, h] of [[390, 664], [360, 640], [844, 390]]) {
      const view = fitView(s, w, h), gl = siteGoal(s), gp = toScreen(view, w, h, gl.u, gl.v), q = flagPlan(gp, w, h, view.scale);
      ok(q.x >= 0 && q.x + q.len <= w && q.y - q.h >= 0 && q.y <= h, `${f}:${s.id} ${w}x${h}: flagget innenfor skjermen`);
    }
  }
}
console.log('byggesteder', sites); ok(sites >= 3, 'fant byggesteder');
// modulen er med i index.html og build.js bruker den (ikke den gamle faste tegningen)
const idx = fs.readFileSync('index.html', 'utf8'), b = fs.readFileSync('build.js', 'utf8');
ok(idx.includes("'build_flag_logic'") && idx.includes("'build_flag_view'"), 'moduler i files');
ok(b.includes('drawGoalFlag(') && !b.includes("g2.lineTo(gp.x + 22, gp.y - 31)"), 'build.js tegner via drawGoalFlag');
console.log(`ok test_buildflag: ${n} sjekker, ${sites} byggesteder`);
