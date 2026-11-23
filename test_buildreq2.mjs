// node test_buildreq2.mjs: R140, påkrevd bygg i Nivå 5 (fagverk: trekanter) og Nivå 6 (materialer: stål). Bygger på R138 (buildreq_logic.js, test_buildreq.mjs).
// Bevis: brettene er laget av grunnscenene (make_variants → scene2level); gapene er for lange å hoppe (40 og 60 cm); uten bygg stopper ruta ved gapet, med referansebygget (rutenett) går den til målet;
// bare trekanter holder i Nivå 5 (en rett rad, en firkant og en enkelt planke gir etter), bare stål holder i Nivå 6 (tre gir etter, en rett rad gir etter); ingen annen vei (rutegrafen og hårgelé-trappa);
// valget buildrequired av gir dagens brett (smal hylle, lite kjøleskap, genveien tilbake); lagret figur bortenfor gapet settes trygt; kort, tekster, trekanthjelp og dokumentasjon.
// Ekte FPS/følelse på telefon er ikke målt her (miljøet har ingen GPU): testes på iPhone.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { walkRoute, walkRouteAny, walkShortcut, gridBuiltRoute, builtContext } from './tools/walk_route.mjs';
import * as BL from './build_logic.js';
import * as G from './grid_logic.js';
import * as GP from './grid_play.js';
import * as BP from './build_phys.js';
import { rowSpecOf, allIn, trussSpec } from './round2_logic.js';
import { REQ, REQ_CARDS, requiredOf, needsBuild, applyRequired, safeResume, reqCardShould, cardKeyOf, cardKindOf } from './buildreq_logic.js';
import { trussOn, trussShow } from './grid_truss_help.js';
import { checkGoals, GOAL } from './goals.js';
import { shortcutsOf } from './shortcut.js';
import { makeT, DICT_KEYS } from './i18n.js';

const rd = (f) => fs.readFileSync(f, 'utf8'), lv = (id) => JSON.parse(rd(`levels/${id}.level.json`)), clone = (o) => JSON.parse(JSON.stringify(o));
const L5 = lv('barnerom2'), L6 = lv('kjokken2'), S5 = L5.build.sites[0], S6 = L6.build.sites[0];

// 1) brettene er laget av grunnscenene (ingen håndredigering), og rev er økt
{
  const before = [rd('scenes/barnerom2.scene.json'), rd('scenes/kjokken2.scene.json')]; execFileSync('node', ['tools/make_variants.mjs'], { stdio: 'pipe' });
  assert.equal(rd('scenes/barnerom2.scene.json'), before[0], 'barnerom2: scenen er utdatert, kjør node tools/make_variants.mjs'); assert.equal(rd('scenes/kjokken2.scene.json'), before[1], 'kjokken2: scenen er utdatert');
  for (const [id, L] of [['barnerom2', L5], ['kjokken2', L6]]) {
    const tmp = fs.mkdtempSync('/tmp/req2-') + '/b.level.json'; execFileSync('node', ['tools/scene2level.mjs', `scenes/${id}.scene.json`, tmp], { stdio: 'pipe' });
    assert.deepEqual(JSON.parse(rd(tmp)), L, `levels/${id}.level.json er utdatert: kjør node tools/scene2level.mjs scenes/${id}.scene.json levels/${id}.level.json`);
    assert.ok(L.rev >= 2, `${id}: rev økt`); assert.equal(L.report.helpers.length, 0, `${id}: ingen hjelpebro fra verktøyet`); assert.equal(requiredOf(L).site, L.build.sites[0].id);
  }
  assert.equal(S5.id, 'barn2'); assert.equal(S6.id, 'kjk6'); assert.equal(S5.need, 'truss'); assert.equal(S6.need, 'material');
}
// 2) gapene: 40 cm (8 enheter, Nivå 5) og 60 cm (12 enheter, Nivå 6), flate (like høye) og for lange å hoppe
{
  const node = (L, id) => L.route.find((r) => r.id === id);
  const a = node(L5, 'nattbok'), b = node(L5, 'hylle_a'); assert.ok(Math.abs((b.x0 - a.x1) - 8) < 0.01, `nivå 5: gapet er 40 cm (${b.x0 - a.x1})`); assert.equal(a.top, b.top, 'nivå 5: flatt gap');
  const c = node(L6, 'hylle_over_vask'), d = node(L6, 'kjoleskap'); assert.ok(Math.abs((c.x0 - d.x1) - 12) < 0.01, `nivå 6: gapet er 60 cm (${c.x0 - d.x1})`); assert.equal(c.top, d.top, 'nivå 6: flatt gap');
  assert.ok(Math.abs(c.top - 39.6) < 1e-9, 'kjøleskapet er 198 cm');
  // stedene ligger mellom flatene og er like brede som gapene (ankre i hver ende)
  assert.deepEqual(S5.anchors.map((q) => q.u), [-4, 4]); assert.deepEqual(S6.anchors.map((q) => q.u), [-6, 6]);
  assert.equal(S6.walkDir, -1, 'nivå 6: figuren går mot venstre i rommet'); assert.ok(!S5.walkDir); assert.ok(S5.start.u < S5.goal.u && S6.start.u < S6.goal.u, 'prøven går fra venstre mot høyre (fysikken regner bare den veien)');
  // verdens lasteflate: nivå 5 har hele nattbok-flata som landing, og første hopp i nivå 6 (overskap til hylla) er som før
  assert.ok(node(L5, 'nattbok') && node(L5, 'hylle_a').x1 > node(L5, 'hylle_a').x0 + 5, 'nivå 5: bred landing');
}
// 3) uten bygg stopper ruta ved gapet; med referansebygget (rutenett, bevist med alle lastene) går den til målet; bare byggets flater gir veien
for (const [id, L, S] of [['barnerom2', L5, S5], ['kjokken2', L6, S6]]) {
  const none = walkRoute(`levels/${id}.level.json`); assert.ok(!none.ok, `${id}: uten bygg stopper ruta ved gapet`);
  const w = walkRouteAny(`levels/${id}.level.json`); assert.ok(w.ok && w.built && w.grid, `${id}: ruta over det ferdige bygget går: ${w.why}`); assert.ok(w.secs < 120, `${id}: rimelig tid (${w.secs} s)`);
  const g = gridBuiltRoute(L, S); assert.ok(g.route && g.route.some((n) => n.id.startsWith('@rutenett')), `${id}: ruta via bygget`); assert.equal(g.why, '');
  const ctx = builtContext(L); assert.ok(ctx && ctx.route && ctx.solids.length > 5, `${id}: byggekontekst`);
  assert.ok(!walkRoute(null, { level: L, extraBoxes: [] }).ok, `${id}: et tomt bygg lager ingen annen vei`);
  assert.equal(builtContext(applyRequired(clone(L), false) && (() => { const E = clone(L); applyRequired(E, false); return E; })()), null, `${id}: lettet brett har ingen byggekontekst`);
  assert.ok(L.build.parts.length >= 4 && L.build.parts.every((q) => Number.isFinite(q.x) && Number.isFinite(q.z)), `${id}: delene ligger klare`);
}
// 4) fysikken: hva som holder (målt med den ekte fysikken, byggeskjermens rutenett og oppdragets laster)
{
  const mk = (S) => { const B = BL.createBuild(clone(S), {}, []); B.gridDeck = false; G.setMode(B, 'grid'); return B; };
  const run = (S, spec, load, k) => { const B = mk(S), r = GP.applySpec(B, spec); assert.ok(r.ok, `bygget kan legges: ${r.why}`); return BP.runSim(G.simDefAuto(B).def, { load, massK: k }).result; };
  const passAll = (S, spec, k) => S.grid.stage.loads.every((l) => run(S, spec, l, k) === 'won');
  const st5 = S5.grid.stage, st6 = S6.grid.stage;
  // Nivå 5: trekanter. Referansen og det billige fagverket holder (med margin), en rett rad og en firkant gir etter, tre alene i et fagverk holder ikke
  assert.deepEqual(st5.loads, ['ball', 'figure', 'robot', 'car']); assert.equal(st5.massK, 28);
  assert.ok(passAll(S5, S5.ref.grid, st5.massK) && passAll(S5, S5.ref.best, st5.massK), 'nivå 5: fagverket holder');
  assert.ok(passAll(S5, S5.ref.grid, st5.massK * 1.25), 'nivå 5: med margin');
  for (const mat of ['wood', 'steel', 'rope']) assert.ok(!passAll(S5, rowSpecOf(4, mat), st5.massK), `nivå 5: en rett rad i ${mat} gir etter`);
  assert.ok(!passAll(S5, allIn(S5.ref.grid, 'wood'), st5.massK), 'nivå 5: fagverk i bare tre holder ikke');
  assert.equal(BP.runSim(G.simDefAuto(mk(S5)).def, { load: 'figure', massK: st5.massK }).result, 'lost', 'nivå 5: uten bygg faller figuren');
  { const quad = { nodes: S5.ref.grid.nodes, rods: S5.ref.grid.rods.filter((r, i) => i < 11) };   // firkant uten diagonal (to diagonaler tatt bort)
    assert.ok(!passAll(S5, quad, st5.massK), 'nivå 5: en firkant uten diagonal gir etter'); }
  // Nivå 6: materialer. Fagverk i stål holder (referansen og det billige), tre gir etter, en rett rad gir etter
  assert.deepEqual(st6.loads, ['car', 'robot', 'figure']); assert.equal(st6.massK, 18);
  assert.ok(passAll(S6, S6.ref.grid, st6.massK) && passAll(S6, S6.ref.best, st6.massK), 'nivå 6: fagverk i stål holder');
  assert.ok(!passAll(S6, allIn(S6.ref.grid, 'wood'), st6.massK), 'nivå 6: samme fagverk i tre gir etter');
  assert.ok(!passAll(S6, trussSpec(6, { b: 'wood', t: 'steel', v: 'steel', d: 'steel' }), st6.massK), 'nivå 6: tre i veien gir etter');
  for (const mat of ['wood', 'steel', 'rope']) assert.ok(!passAll(S6, rowSpecOf(6, mat), st6.massK), `nivå 6: en rett rad i ${mat} gir etter`);
  assert.equal(BP.runSim(G.simDefAuto(mk(S6)).def, { load: 'figure', massK: st6.massK }).result, 'lost', 'nivå 6: uten bygg faller figuren');
  // stjerner: referansen 2, det billige 3 (terskler fra stedet)
  for (const S of [S5, S6]) { const B1 = mk(S); GP.applySpec(B1, S.ref.best); const r = G.simDefAuto(B1); assert.ok(r.def.placed.length >= 1, 'billig bygg legges'); assert.ok(S.grid.stars.three.cost < S.grid.stars.two.cost); }
}
// 5) ingen annen vei: rutegrafen (hoppbudsjett som Spenning) når ikke målet uten bygg, og med den lette plasseringen finnes veien (kontroll); hårgelé-trappa i Nivå 5 er tatt ut
{
  for (const [id, key] of [['barnerom2', 'hylle_a'], ['kjokken2', 'kjoleskap']]) {
    const sc = JSON.parse(rd(`scenes/${id}.scene.json`)), easy = clone(sc), req = sc.required;
    delete sc.required; delete sc.build; sc.goals = sc.goals.filter((g) => g.type !== 'flag'); sc.validate = false;
    const dir = fs.mkdtempSync('/tmp/req2-'), inp = dir + '/s.scene.json', out = dir + '/s.level.json'; fs.writeFileSync(inp, JSON.stringify(sc));
    execFileSync('node', ['tools/scene2level.mjs', inp, out], { stdio: 'pipe' }); assert.equal(JSON.parse(rd(out)).report.solvable_by_graph, false, `${id}: uten bygg finnes ingen vei til målet`);
    for (const [oid, eb] of Object.entries(req.ease)) easy.objects.find((o) => o.id === oid).box = eb;
    if (req.easeGoal) Object.assign(easy.goal, { x: req.easeGoal[0], y: req.easeGoal[1], z: req.easeGoal[2] });
    delete easy.required; delete easy.build; easy.goals = easy.goals.filter((g) => g.type !== 'flag'); easy.validate = false; fs.writeFileSync(inp, JSON.stringify(easy));
    execFileSync('node', ['tools/scene2level.mjs', inp, out], { stdio: 'pipe' }); assert.equal(JSON.parse(rd(out)).report.solvable_by_graph, true, `${id}: kontroll: med den lette plasseringen finnes veien (${key})`);
  }
  assert.deepEqual(shortcutsOf(L5), [], 'nivå 5: hårgelé-trappa går forbi gapet og er tatt ut når bygging er påkrevd'); assert.ok(!L5.boxes.some((b) => /^gele_barn/.test(b.id)) && !L5.movables.some((m) => m.id === 'hargele_barn'));
  assert.equal(shortcutsOf(L6).length, 1, 'nivå 6: hårgelé-trappa til benken er uendret (den går ikke forbi gapet)');
  const w6 = walkShortcut('levels/kjokken2.level.json', shortcutsOf(L6)[0]); assert.ok(w6.ok, `nivå 6: trappa med hårgelé går, og fortsetter over bygget: ${w6.why}`);
}
// 6) valget av: dagens brett (smal hylle, lite kjøleskap), genveien tilbake i Nivå 5, ruta går uten bygg; på = uendret; idempotent
{
  for (const [id, L] of [['barnerom2', L5], ['kjokken2', L6]]) {
    const A = clone(L); assert.equal(applyRequired(A, true), 'hard'); assert.deepEqual(A, L, `${id}: på = uendret`); assert.ok(needsBuild(A, true) && !needsBuild(A, false));
    const E = clone(L); assert.equal(applyRequired(E, false), 'easy'); const E2 = clone(E); assert.equal(applyRequired(E2, false), 'easy'); assert.deepEqual(E2, E, `${id}: idempotent`); assert.ok(!needsBuild(E, true));
    const w = walkRoute(null, { level: E }); assert.ok(w.ok, `${id}: uten påkrevd bygg går ruta uten å bygge: ${w.why}`);
  }
  const E5 = clone(L5); applyRequired(E5, false);
  const ha = E5.boxes.find((b) => b.id === 'hylle_a'); assert.ok(Math.abs(ha.min[1] - 16) < 1e-9 && Math.abs(ha.max[1] - 16.6) < 1e-9, 'nivå 5: den smale hylla er tilbake');
  assert.equal(shortcutsOf(E5).length, 1, 'nivå 5: hårgelé-trappa er tilbake'); assert.ok(E5.boxes.some((b) => b.id === 'gele_barn_trinn_1' && b.shortcut) && E5.movables.some((m) => m.id === 'hargele_barn'));
  assert.ok(/balanser bortover/.test(E5.hints.find((h) => h.id === 'nattbord').text), 'nivå 5: gammel lapp tilbake');
  const w5 = walkShortcut('levels/barnerom2.level.json', shortcutsOf(E5)[0], { level: E5 }); assert.ok(w5.ok, w5.why);
  const E6 = clone(L6); applyRequired(E6, false); const fr = E6.boxes.find((b) => b.id === 'kjoleskap'); assert.ok(Math.abs(fr.min[0] - -30) < 1e-9 && Math.abs(fr.max[1] - 38) < 1e-9, 'nivå 6: kjøleskapet står der det sto');
  assert.deepEqual(E6.goal, [-20.8, 38, -21.2], 'nivå 6: målet som før'); assert.ok(/to hopp|hopper du til den lille hylla/.test(E6.hints.find((h) => h.id === 'kjoleskap').text));
  const hd = E6.decor.find((d) => d.id === 'kjoleskap_handtak') || E6.boxes.find((d) => d.id === 'kjoleskap_handtak'); assert.ok(hd, 'håndtaket finnes');
  assert.ok(Math.abs(L6.goal[0] - (-26.8)) < 0.5 || L6.goal[1] > 39, 'nivå 6 (påkrevd): målet ligger på det flyttede kjøleskapet');
}
// 7) delmål: bygge-flagg koblet til stedet, maks fire delmål, ingen taster
for (const [id, L, S] of [['barnerom2', L5, S5], ['kjokken2', L6, S6]]) {
  assert.deepEqual(checkGoals(L, { levelId: id }), [], `${id}: delmålene er gyldige`); assert.ok(L.goals.length >= GOAL.minPerLevel && L.goals.length <= GOAL.maxPerLevel);
  const g = L.goals.find((q) => q.type === 'flag'); assert.ok(g && g.flag === S.id, `${id}: bygge-delmålet er koblet til byggestedet`); assert.ok(!/\b(tast|mellomrom|space)\b/i.test(g.label + g.en)); assert.ok(L.goals.some((q) => q.gate), `${id}: låsende delmål er med`);
}
// 8) lagring: figur bortenfor gapet uten bygd bro settes trygt ved gapet (Nivå 5 mot høyre, Nivå 6 mot venstre); ellers urørt
{
  const n5 = L5.route.find((r) => r.id === 'nattbok'), sk = L5.route.find((r) => r.id === 'skrivebord');
  const beyond5 = [(sk.x0 + sk.x1) / 2, sk.top, (sk.z0 + sk.z1) / 2], sr5 = safeResume(L5, beyond5, [], true);
  assert.ok(sr5 && sr5[0] > n5.x0 && sr5[0] < n5.x1 + 0.01 && sr5[1] === S5.y, `nivå 5: satt ved gapet: ${sr5}`); assert.equal(safeResume(L5, beyond5, [S5.id], true), null); assert.equal(safeResume(L5, beyond5, [], false), null);
  assert.equal(safeResume(L5, [n5.x0 + 1, n5.top, -20], [], true), null, 'nivå 5: på nattboka: urørt'); assert.equal(safeResume(L5, [-5, 0, -20], [], true), null, 'på gulvet: urørt');
  const sh = L6.route.find((r) => r.id === 'hylle_over_vask'), fr = L6.route.find((r) => r.id === 'kjoleskap');
  const beyond6 = [(fr.x0 + fr.x1) / 2, fr.top, (fr.z0 + fr.z1) / 2], sr6 = safeResume(L6, beyond6, [], true);
  assert.ok(sr6 && sr6[0] > S6.x && sr6[0] < sh.x1 + 0.01 && sr6[1] === S6.y, `nivå 6: satt på hylla ved gapet: ${sr6}`); assert.equal(safeResume(L6, beyond6, [S6.id], true), null); assert.equal(safeResume(L6, beyond6, [], false), null);
  const ov = L6.route.find((r) => r.id === 'overskap'); assert.equal(safeResume(L6, [(ov.x0 + ov.x1) / 2, ov.top, -27], [], true), null, 'nivå 6: på overskapet: urørt'); assert.equal(safeResume(L6, [(sh.x0 + sh.x1) / 2, sh.top, -27], [], true), null, 'nivå 6: på hylla: urørt');
}
// 9) kort per brett (egen tekst og egen «sett»-nøkkel), tekster på norsk og engelsk med knappene (ikke taster)
{
  assert.deepEqual(REQ.cardLevels, ['barnerom', 'barnerom2', 'kjokken2']); assert.equal(cardKeyOf('barnerom'), REQ.cardKey, 'nivå 2 beholder sin nøkkel');
  assert.equal(new Set(REQ.cardLevels.map(cardKeyOf)).size, 3, 'tre ulike nøkler'); assert.deepEqual(REQ.cardLevels.map(cardKindOf), ['req', 'req.truss', 'req.mat']);
  for (const id of ['barnerom2', 'kjokken2']) { const L = id === 'barnerom2' ? L5 : L6; assert.ok(reqCardShould({ L, level: id, on: true })); assert.ok(!reqCardShould({ L, level: id, on: true, seen: true }) && !reqCardShould({ L, level: id, on: false }) && !reqCardShould({ L, level: id, cinema: true })); }
  assert.ok(!reqCardShould({ L: lv('bad2'), level: 'bad2', on: true }), 'brett uten påkrevd bygg: ingen kort');
  let lang = 'nb'; const { T } = makeT(() => lang);
  for (const l of ['nb', 'en']) { lang = l; for (const k of ['req.card.text.truss', 'req.card.text.mat']) { const s = T(k); assert.notEqual(s, k, `${l}:${k}`); assert.ok(!/\{\w+\}/.test(s) && !/\b(mellomrom|space|tast|shift|keyboard)\b/i.test(s), `${l}:${k}`); assert.ok(s.split(/[.!?]\s/).length <= 3, 'kort tekst'); } }
  lang = 'nb'; assert.ok(/BYGG/.test(T('req.card.text.truss')) && /TREKANT/.test(T('req.card.text.truss')) && /PRØV/.test(T('req.card.text.truss')), 'nivå 5-kortet nevner BYGG, TREKANT og PRØV');
  assert.ok(/BYGG/.test(T('req.card.text.mat')) && /STÅL/.test(T('req.card.text.mat')) && /PRØV/.test(T('req.card.text.mat')), 'nivå 6-kortet nevner BYGG, STÅL og PRØV');
  assert.deepEqual(DICT_KEYS.nb.filter((k) => /^req\./.test(k)).sort(), DICT_KEYS.en.filter((k) => /^req\./.test(k)).sort());
  for (const L of [L5, L6]) for (const h of L.hints.filter((q) => /^Bygg en bro/.test(q.text))) assert.ok(/BYGG/.test(h.text) && /PRØV/.test(h.text) && !/\b(tast|mellomrom|space)\b/i.test(h.text), 'lappen nevner knappene');
  assert.ok(/TREKANT/.test(L5.hints.find((h) => h.id === 'nattbord').text) && /STÅL/.test(L6.hints.find((h) => h.id === 'kjoleskap').text));
  const view = rd('byggeskole_view.js'); assert.ok(/kind === 'req.truss'/.test(view) && /kind === 'req.mat'/.test(view) && /showReq: \(\{ onHow, onOk, kind/.test(view));
}
// 10) trekanthjelpen (R122) er synlig første gang i Nivå 5 (også på Ekspert, når spilleren ikke har skrudd den av), og «Av» respekteres
{
  assert.ok(trussOn({ mode: 'auto', expert: false }) && !trussOn({ mode: 'auto', expert: true }), 'uendret: auto er av på Ekspert uten krav');
  assert.ok(trussOn({ mode: 'auto', expert: true, need: true }), 'påkrevd fagverk: på også på Ekspert'); assert.ok(!trussOn({ mode: 'off', expert: false, need: true }), 'av respekteres');
  assert.ok(trussShow({ on: trussOn({ mode: 'auto', expert: false, need: true }), grid: true, sim: false, hidden: false }), 'TREKANT og DIAGONAL vises første gang (ikke skjult i ⋯)');
  const b = rd('build.js'); assert.ok(/need = !!\(lsite\(\)\?\.need === 'truss' && LEVEL\.required\?\.site === lsite\(\)\?\.id\)/.test(b) && /trussOn\(\{ \.\.\.getTruss2\(\), need \}\)/.test(b), 'build.js gir need til trussOn');
  assert.ok(/nudge = !!cfg\(\)\.need/.test(rd('grid_truss_view.js')), '«?» vises fra første stund når stedet krever trekanter');
}
// 11) hekter, valg, dokumentasjon og NYTT-rad
{
  const main = rd('main.js'), docs = rd('docs/INNSTILLINGER.md'), niv = rd('docs/NIVAER.md'), ch = rd('changes_data.js');
  assert.ok(/cardKeyOf\(levelId\)/.test(main) && /cardKindOf\(levelId\)/.test(main) && /kind: cardKindOf/.test(main), 'kort per brett i main.js'); assert.ok(/Nivå 5/.test(main.match(/fl\('buildrequired'[^\n]*/)[0]), 'valget nevner Nivå 5 og 6');
  assert.ok(docs.includes('buildrequired') && /R140/.test(docs), 'dokumentert i docs/INNSTILLINGER.md'); assert.ok(/R140/.test(niv) && /barn2/.test(niv) && /kjk6/.test(niv), 'dokumentert i docs/NIVAER.md');
  assert.ok(/r140-bygg/.test(ch), 'NYTT-rad (changes_data.js)');
}
console.log('påkrevd-bygg-tester R140 grønne');
