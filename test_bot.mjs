// node test_bot.mjs: R32, boten som klatrer og bruker verktøy. Streng/løs validering (tools/bot.mjs): alle seks nivåene og Kontroll
// går i begge nivåene (ruta, verktøy-genveiene fra R29 og byggesnarveiene fra R30); en ødelagt rute gir FEIL (kort) eller TIL_GJENNOMGANG (lang);
// veggsprang er slått av i streng modus; rutevisningen (tekst og SVG) lages.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { P } from './physics.js';
import { MODES, LONG, isLong, verdictOf, plansOf, botSolve, routeText, routeSvg } from './tools/bot.mjs';
import { walkRoute } from './tools/walk_route.mjs';

const path = (id) => `levels/${id}.level.json`, lv = (id) => JSON.parse(fs.readFileSync(path(id), 'utf8'));
const ok = (len = 50, steps = 3) => ({ ok: true, len, steps, why: '' }), bad = (len = 50, steps = 3) => ({ ok: false, len, steps, why: 'x' });

// 1) dommene
assert.equal(verdictOf(ok(), ok()), 'BESTÅR_STRENG');
assert.equal(verdictOf(bad(), ok()), 'BESTÅR_LØS', 'går bare med hjelpemidler');
assert.equal(verdictOf(bad(), bad(50, 4)), 'FEIL', 'kort rute som feiler er feil');
assert.equal(verdictOf(bad(), bad(50, LONG.steps)), 'TIL_GJENNOMGANG', 'lang rute (mange steg) sendes til gjennomgang');
assert.equal(verdictOf(bad(), bad(LONG.len, 4)), 'TIL_GJENNOMGANG', 'lang rute (lang avstand) sendes til gjennomgang');
assert.ok(isLong({ steps: 12, len: 1 }) && isLong({ steps: 1, len: 200 }) && !isLong({ steps: 9, len: 119 }));

// 2) nivåene: Kontroll + alle seks, og de fire byggebrettene. Alt består i streng modus (uten sikte-hjelp og uten veggsprang).
const ids = ['kontroll', 'gaate', 'bad', 'barnerom', 'kjokken', 'bad2', 'barnerom2', 'kjokken2', 'bro', 'trapp', 'vippe', 'kjokkenbro', 'leke', 'stue', 'verksted'];
const kinds = new Set();
for (const id of ids) {
  const r = botSolve(path(id));
  assert.equal(r.verdict, 'BESTÅR_STRENG', `${id}: ${JSON.stringify(r.review || r.why)}`);
  assert.equal(r.review.length, 0);
  for (const p of r.plans) { kinds.add(p.kind); assert.ok(p.streng.ok && p.løs.ok, `${id}/${p.id}`); assert.ok(p.streng.trace.length > 10, 'sporet er tatt opp'); }
}
assert.deepEqual([...kinds].sort(), ['bygg', 'genvei', 'hard', 'ruta'], 'boten går ruta, verktøy-genveier, byggesnarveier og harde veier uten klatring (R42)');
assert.deepEqual(botSolve(path('bad2')).plans.map((p) => p.id), ['ruta', 'genvei:gele_bad', 'hard:trapp_bad']);
assert.deepEqual(botSolve(path('bro')).plans.map((p) => p.id), ['ruta', 'bygg:bro1']);
assert.ok(lv('kontroll').route.length >= 6, 'Kontroll har en ekte rute (trinn og plattformer), ikke bare gulv → mål');

// 3) en ødelagt rute: fjern en flate. Kort rute = FEIL, lang rute = TIL_GJENNOMGANG (og står i review)
const broken = (id, k) => { const L = lv(id), gone = L.route[k].id; L.boxes = L.boxes.filter((b) => b.id !== gone); L.route = L.route.map((n) => n); return L; };
{ const L = broken('bro', 2), r = botSolve(path('bro'), { level: L }); assert.equal(r.plans[0].verdict, 'FEIL', 'kort rute som ikke går er FEIL'); assert.equal(r.verdict, 'FEIL'); }
{ const L = broken('barnerom2', 6), r = botSolve(path('barnerom2'), { level: L }); assert.equal(r.plans[0].verdict, 'TIL_GJENNOMGANG', JSON.stringify(r.plans[0].løs)); assert.equal(r.verdict, 'TIL_GJENNOMGANG');
  assert.equal(r.review[0].id, 'ruta'); assert.ok(r.review[0].why.length > 5 && r.review[0].steps >= LONG.steps, 'gjennomgangslista sier hvorfor og hvor lang ruta er'); }
{ const L = lv('bad'); L.route = [L.route[0]]; assert.equal(botSolve(path('bad'), { level: L }).verdict, 'FEIL', 'uten rute'); }

// 4) streng og løs er ulike innstillinger; veggsprang er av i streng modus
assert.equal(MODES.streng.wallJump, false); assert.equal(MODES.løs.wallJump, true); assert.equal(MODES.streng.helpers, false);
walkRoute(path('bad'), { ...MODES.streng }); assert.equal(P.wallKick, 0); assert.equal(P.wallUp, 0); assert.equal(P.edgeGuard, false); assert.equal(P.magnet, false); assert.equal(P.airSteady, false);
assert.equal(P.autoJump, true); assert.equal(P.holdGrab, true, 'HOPP og GREP holdt riktig regnes som menneskelig');
walkRoute(path('bad'), { ...MODES.løs }); assert.ok(P.wallKick > 0 && P.edgeGuard && P.magnet && P.airSteady, 'løs modus: alle hjelpemidler og veggsprang på');
// uten sikte-hjelp og uten veggsprang er beviset det samme som før for ruta: ingen rute i spillet krever veggsprang
for (const id of ids.filter((x) => x !== 'kontroll')) { const a = walkRoute(path(id), { wallJump: true }), b = walkRoute(path(id), { wallJump: false }); assert.ok(a.ok && b.ok, `${id}: ruta krever ikke veggsprang`); }

// 5) rutevisning
{ const L = lv('barnerom2'), r = botSolve(path('barnerom2'), { level: L }), p = r.plans[0].streng, t = routeText(L, p), svg = routeSvg(L, p);
  assert.ok(t.split('\n').length === p.nodes.length && /klatre\/hopp opp/.test(t) && /start/.test(t), 'rutetekst: ett trinn per linje');
  assert.ok(svg.startsWith('<svg') && svg.includes('<polyline') && svg.includes('ruta (streng)'), 'SVG med spor'); }
// 6) alle brett med rute som verktøyet kjenner til er dekket (nye brett med rute må legges i lista over)
const tested = new Set(ids); for (const f of fs.readdirSync('levels')) { const id = f.replace('.level.json', ''); const L = lv(id); if ((L.route || []).length >= 2) assert.ok(tested.has(id) || id === 'klatring', `${id}: legg brettet i test_bot.mjs`); }
assert.ok(plansOf(lv('klatring')).length >= 1);
console.log('bot ok');
