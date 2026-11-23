// node test_buildreq.mjs: R138, påkrevd bygg i Nivå 2 · Barnerommet (buildreq_logic.js, scenes/barnerom.scene.json, tools/scene2level.mjs `required`).
// Bevis: brettet er laget av scenen; gapet over lekebøtta er for langt å hoppe; uten bygg stopper ruta ved gapet; med planken fra delebrettet (bærer ball og bil) går ruta til målet;
// ingen annen vei over (verktøyets rutegraf må legge en bro akkurat der); valget av gir dagens brett; Nivå 5 er uendret; tekster, valg, loggfører og dokumentasjon er på plass.
// Ekte FPS/følelse på telefon er ikke målt her (miljøet har ingen GPU): testes på iPhone.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { walkRoute } from './tools/walk_route.mjs';
import * as BW from './build_world.js';
import * as BP from './build_phys.js';
import { REQ, requiredOf, needsBuild, applyRequired, safeResume, reqCardShould, createTryCounter, solvedLine } from './buildreq_logic.js';
import { checkGoals, GOAL } from './goals.js';
import { makeT, DICT_KEYS } from './i18n.js';

const rd = (f) => fs.readFileSync(f, 'utf8'), lv = (id) => JSON.parse(rd(`levels/${id}.level.json`)), clone = (o) => JSON.parse(JSON.stringify(o));
const L = lv('barnerom'), site = L.build.sites[0];

// 1) brettet er laget av scenen (ingen håndredigering)
{
  const tmp = fs.mkdtempSync('/tmp/req-') + '/b.level.json'; execFileSync('node', ['tools/scene2level.mjs', 'scenes/barnerom.scene.json', tmp], { stdio: 'pipe' });
  assert.deepEqual(JSON.parse(rd(tmp)), L, 'levels/barnerom.level.json er utdatert: kjør node tools/scene2level.mjs scenes/barnerom.scene.json levels/barnerom.level.json');
  assert.ok(L.rev >= 2, 'rev økt: gammel fremgang (figuren bortenfor gapet) følger ikke med');
  assert.equal(L.report.helpers.length, 0, 'ingen hjelpebro fra verktøyet');
}
// 2) gapet er for langt å hoppe (35 cm = 7 enheter), og det lette gapet (valget av) er 25 cm
{
  const gap = (a, b) => Math.max(0, b.x0 - a.x1), nat = L.route.find((r) => r.id === 'nattbord'), kra = L.route.find((r) => r.id === 'krakk');
  assert.ok(Math.abs(gap(nat, kra) - 7) < 0.01, `gapet er 35 cm (${gap(nat, kra)} enheter)`); assert.equal(nat.top, kra.top, 'flatt gap: nattbord og krakk like høye');
  const r = requiredOf(L); assert.equal(r.site, REQ.site); assert.equal(r.site, site.id); const e = r.ease.find((q) => q.id === 'krakk');
  assert.ok(Math.abs((e.route.x0 - nat.x1) - 5) < 0.01, 'lett gap = 25 cm');
}
// 3) uten bygg stopper ruta ved gapet; med bygget (ref, én planke fra delebrettet) går den til målet
{
  const none = walkRoute('levels/barnerom.level.json'); assert.ok(!none.ok && /krakk/.test(none.why), `uten bygg stopper ruta ved gapet: ${none.why}`);
  const route = BW.refRoute(L, site); assert.ok(route, 'ruta via bygget finnes'); assert.ok(route.some((n) => n.id === '@bro'));
  const placed = BP.settledPlaced({ site, placed: site.ref.placed, links: site.ref.links });
  const built = walkRoute(null, { level: L, route, extraBoxes: BW.buildSolids(site, placed) }); assert.ok(built.ok, `ruta via det ferdige bygget går: ${built.why}`);
  assert.ok(built.secs < 90, `rimelig tid (${built.secs} s)`);
  // planken bærer ball og bil, uten bygg består ikke prøven
  assert.deepEqual(site.loads, ['ball', 'car']);
  for (const load of site.loads) { const s = BP.runSim({ site, placed: site.ref.placed, links: site.ref.links }, { load }); assert.equal(s.result, 'won', `planken bærer ${load} (${s.reason})`); assert.equal(s.breaks.length, 0); assert.equal(BP.runSim({ site, placed: [], links: [] }, { load }).result, 'lost', `uten bygg: ${load} faller`); }
  // et dårlig bygg (hele stedet solid) lager ingen annen vei: ruta uten broen går fortsatt ikke
  assert.ok(!walkRoute(null, { level: L, extraBoxes: [] }).ok);
  // delene ligger klare: en lang planke finnes (R120), og nok deler for ref-bygget
  assert.ok(L.build.parts.some((q) => q.type === 'plank_l'), 'planken ligger klar fra start');
  assert.ok(L.build.parts.length >= 6 && L.build.parts.every((q) => Number.isFinite(q.x) && Number.isFinite(q.z)));
}
// 4) ingen rest-vei: rutegrafen (samme hoppbudsjett som Spenning) på brettet uten den lette flyttingen når ikke målet. Med hjelp: bare en bro/trapp lagt inn av verktøyet kommer over, ellers finnes ingen vei
{
  const sc = JSON.parse(rd('scenes/barnerom.scene.json')); delete sc.required; delete sc.build; sc.goals = sc.goals.filter((g) => g.type !== 'flag'); sc.validate = false;
  const dir = fs.mkdtempSync('/tmp/req-'), inp = dir + '/s.scene.json', out = dir + '/s.level.json'; fs.writeFileSync(inp, JSON.stringify(sc));
  execFileSync('node', ['tools/scene2level.mjs', inp, out], { stdio: 'pipe' });
  const T = JSON.parse(rd(out)); assert.equal(T.report.solvable_by_graph, false, 'uten bygg finnes ingen vei til målet (ingen rest-vei)');
  const sc2 = JSON.parse(rd('scenes/barnerom.scene.json')); const e = sc2.required.ease.krakk; sc2.objects.find((o) => o.id === 'krakk').box = e; delete sc2.required; delete sc2.build; sc2.goals = sc2.goals.filter((g) => g.type !== 'flag'); sc2.validate = false; fs.writeFileSync(inp, JSON.stringify(sc2));
  execFileSync('node', ['tools/scene2level.mjs', inp, out], { stdio: 'pipe' }); assert.equal(JSON.parse(rd(out)).report.solvable_by_graph, true, 'kontroll: med krakken på gamle plass (25 cm) finnes veien');
}
// 5) valget av: dagens brett (lett gap, gammel tekst, krakkens gamle plass), ruta går uten bygg; idempotent; på = uendret
{
  const A = clone(L); assert.equal(applyRequired(A, true), 'hard'); assert.deepEqual(A, L, 'på: brettet er uendret'); assert.ok(needsBuild(A, true) && !needsBuild(A, false));
  const B = clone(L); assert.equal(applyRequired(B, false), 'easy'); assert.equal(applyRequired(B, false), 'easy'); assert.ok(!needsBuild(B, true), 'lettet brett krever ikke bygg');
  const bx = B.boxes.find((b) => b.id === 'krakk'); assert.ok(Math.abs(bx.min[0] - 2.4) < 1e-9 && Math.abs(bx.max[0] - 10) < 1e-9, 'krakken står der den sto før');
  assert.ok(/Hopp over lekebøtta/.test(B.hints.find((h) => h.id === 'nattbord').text), 'gammel tekst tilbake');
  const w = walkRoute(null, { level: B }); assert.ok(w.ok, `uten påkrevd bygg går ruta uten å bygge: ${w.why}`);
  assert.equal(applyRequired({ boxes: [] }, false), null, 'brett uten påkrevd bygg: ingen endring');
  for (const id of ['bad', 'barnerom2', 'kjokken2', 'leke', 'stue', 'verksted', 'bro']) assert.equal(requiredOf(lv(id)), null, `${id}: ingen påkrevd bygg`);   // R139: Nivå 3 og 4 har det nå (test_buildreq2.mjs)
}
// 6) Nivå 5 (barnerom2) er uendret: ingen bygg, ingen krakk, samme scene som før (make_variants gir de samme filene)
{
  const before = rd('scenes/barnerom2.scene.json'); execFileSync('node', ['tools/make_variants.mjs'], { stdio: 'pipe' }); assert.equal(rd('scenes/barnerom2.scene.json'), before, 'barnerom2: scenen er utdatert, kjør node tools/make_variants.mjs');
  const L5 = lv('barnerom2'); assert.ok(!L5.build && !L5.required && !L5.boxes.some((b) => b.id === 'krakk'), 'nivå 5 har verken bygg eller krakk');
  const w = walkRoute('levels/barnerom2.level.json'); assert.ok(w.ok, w.why);
}
// 7) delmål (bygg-flagget), maks fire delmål
{
  assert.deepEqual(checkGoals(L, { levelId: 'barnerom' }), []); assert.ok(L.goals.length >= GOAL.minPerLevel && L.goals.length <= GOAL.maxPerLevel);
  const g = L.goals.find((q) => q.type === 'flag'); assert.ok(g && g.flag === site.id, 'bygg-delmålet er koblet til byggestedet'); assert.ok(!/\b(tast|mellomrom|space)\b/i.test(g.label + g.en));
  assert.ok(L.goals.some((q) => q.gate), 'delmålet som låser målet er med');
}
// 8) lagring: figuren bortenfor gapet uten bygd bro settes trygt ved gapet; ellers urørt
{
  const nat = L.route.find((r) => r.id === 'nattbord'), sk = L.route.find((r) => r.id === 'skrivebord');
  const beyond = [(sk.x0 + sk.x1) / 2, sk.top, (sk.z0 + sk.z1) / 2], sr = safeResume(L, beyond, [], true);
  assert.ok(sr && sr[0] > nat.x0 && sr[0] < nat.x1 && sr[1] === site.y, `satt på nattbordet: ${sr}`);
  assert.equal(safeResume(L, beyond, [site.id], true), null, 'bygget er bestått: står der du var'); assert.equal(safeResume(L, beyond, new Set([site.id]), true), null);
  assert.equal(safeResume(L, beyond, [], false), null, 'valget av: urørt');
  assert.equal(safeResume(L, [-5, 0, -20], [], true), null, 'på gulvet: urørt'); assert.equal(safeResume(L, [nat.x0 + 1, nat.top, -20], [], true), null, 'på nattbordet: urørt'); assert.equal(safeResume(lv('bad'), beyond, [], true), null);
}
// 9) kort, forsøkstelling og logg
{
  assert.ok(reqCardShould({ L, level: 'barnerom', on: true })); assert.ok(!reqCardShould({ L, level: 'barnerom', on: true, seen: true }) && !reqCardShould({ L, level: 'barnerom', on: false }) && !reqCardShould({ L, level: 'barnerom', cinema: true }) && !reqCardShould({ L, level: 'bro' }) && !reqCardShould({ L: lv('bro'), level: 'barnerom' }));
  const c = createTryCounter(); assert.equal(c.count('barn1'), 0); c.tried('barn1'); c.tried('barn1'); c.tried('x'); assert.equal(c.solved('barn1'), 2); assert.equal(c.solved('barn1'), 1, 'minst ett forsøk'); assert.equal(solvedLine(3), 'påkrevd bygg: bestått etter 3 forsøk');
}
// 10) tekster (norsk og engelsk, knapper og ikke taster), kort-visning, valg, hekter og dokumentasjon
{
  let lang = 'nb'; const { T } = makeT(() => lang);
  for (const l of ['nb', 'en']) { lang = l; for (const k of ['req.card.title', 'req.card.text', 'req.card.how', 'req.card.ok']) { const s = T(k); assert.notEqual(s, k, `${l}:${k}`); assert.ok(!/\{\w+\}/.test(s) && !/\b(mellomrom|space|tast|shift|keyboard)\b/i.test(s), `${l}:${k}`); } }
  lang = 'nb'; assert.ok(/BYGG/.test(T('req.card.text')) && /PRØV/.test(T('req.card.text')), 'kortet nevner knappene'); assert.ok(T('req.card.text').split(/[.!?]\s/).length <= 3, 'kort tekst');
  assert.deepEqual(DICT_KEYS.nb.filter((k) => /^req\./.test(k)).sort(), DICT_KEYS.en.filter((k) => /^req\./.test(k)).sort());
  const view = rd('byggeskole_view.js'); assert.ok(/kind === 'req'/.test(view) && /showReq/.test(view));
  const main = rd('main.js'), idx = rd('index.html'), docs = rd('docs/INNSTILLINGER.md');
  assert.ok(/fl\('buildrequired', 'admin'/.test(main), 'valget ligger i ⚙ → Admin'); assert.ok(/store\.get\('tlm\.buildrequired', true\)/.test(main), 'standard på');
  assert.ok(/applyRequired\(LEVEL, buildRequiredOn\)/.test(main) && /safeResume\(LEVEL/.test(main) && /solvedLine\(/.test(main) && /reqCardShould\(/.test(main), 'hekter i main.js');
  assert.ok(/logEv\('bygg', needsBuild/.test(main), 'logEv påkrevd bygg'); assert.ok(idx.includes("'buildreq_logic'"), 'modulen er i files i index.html');
  assert.ok(docs.includes('buildrequired'), 'dokumentert i docs/INNSTILLINGER.md');
}
console.log('påkrevd-bygg-tester grønne');
