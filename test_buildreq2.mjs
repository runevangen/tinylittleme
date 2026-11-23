// node test_buildreq2.mjs: R139, påkrevd bygg i Nivå 3 · Kjøkkenet (trapp av klosser, `kjokk1`) og Nivå 4 · Badet (vippe, `bad1`). Bygger på buildreq_logic.js (R138).
// Bevis: brettene er laget av scenene; uten bygg finnes ingen vei (rutegrafen og walk_route); med det ferdige bygget går ruta og boten; referansebygget består PRØV og uten bygg faller lasten;
// valget av gir dagens brett (lett scene = `required.easyPatch`); Nivå 5 og 6 er uendret; lagret figur settes trygt; kort, tekster, logg og dokumentasjon er på plass.
// Ekte FPS/følelse på telefon er ikke målt her (miljøet har ingen GPU): testes på iPhone.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { walkRoute, walkRouteAny, builtBase } from './tools/walk_route.mjs';
import * as BP from './build_phys.js';
import { requiredOf, needsBuild, applyRequired, applyEasy, safeResume, reqCardShould, cardKeyOf, REQ } from './buildreq_logic.js';
import { applyEasyPatch, scenePatch, levelEasy } from './tools/scene_patch.mjs';
import { checkGoals, GOAL } from './goals.js';
import { makeT, DICT_KEYS } from './i18n.js';
import { reqText } from './byggeskole_view.js';
import { CHANGES } from './changes_data.js';

const rd = (f) => fs.readFileSync(f, 'utf8'), lv = (id) => JSON.parse(rd(`levels/${id}.level.json`)), sc = (id) => JSON.parse(rd(`scenes/${id}.scene.json`)), clone = (o) => JSON.parse(JSON.stringify(o));
const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'req2-'));
const toLevel = (scene) => { const i = path.join(tmpdir, 's.scene.json'), o = path.join(tmpdir, 'l.level.json'); fs.writeFileSync(i, JSON.stringify(scene)); execFileSync('node', ['tools/scene2level.mjs', i, o], { stdio: 'pipe' }); return JSON.parse(rd(o)); };
const SETS = ['boxes', 'hints', 'decor', 'holds', 'movables', 'collectibles', 'hazards', 'ants'];
const norm = (L) => { const x = clone(L); delete x.rev; delete x.required; if (x.report) delete x.report.hard_solvable_by_graph; for (const k of SETS) if (Array.isArray(x[k])) x[k].sort((a, b) => (JSON.stringify(a) < JSON.stringify(b) ? -1 : 1)); return x; };
const CASES = [
  { id: 'kjokken', site: 'kjokk1', gone: [], added: [], goalOn: 'skap', kind: 'trapp' },
  { id: 'bad2', site: 'bad1', gone: ['hylle', 'handkle_ny_2'], added: ['hylle_ost'], goalOn: 'hylle_ost', kind: 'vippe' },
];

for (const C of CASES) {
  const L = lv(C.id), scene = sc(C.id), site = L.build.sites[0];
  // 1) brettet er laget av scenen, og det lette brettet er dagens brett (valget av)
  assert.deepEqual(toLevel(scene), L, `levels/${C.id}.level.json er utdatert: kjør node tools/scene2level.mjs scenes/${C.id}.scene.json levels/${C.id}.level.json`);
  assert.ok(L.rev >= 2, `${C.id}: rev økt (gammel fremgang følger ikke med)`);
  const req = requiredOf(L); assert.equal(req.site, C.site); assert.equal(site.id, C.site); assert.ok(needsBuild(L, true) && !needsBuild(L, false));
  const easyScene = applyEasyPatch(scene, scene.required.easyPatch), E = toLevel(easyScene);
  const B = clone(L); assert.equal(applyRequired(B, false), 'easy'); assert.equal(applyRequired(B, false), 'easy', 'idempotent'); assert.ok(!needsBuild(B, true));
  assert.deepEqual(norm(B), norm(E), `${C.id}: valget av gir det lette brettet (scenen uten de vanskelige endringene)`);
  assert.ok(!B.build, `${C.id}: det lette brettet har ingen byggested (som før)`);
  assert.equal(applyRequired(clone(L), true), 'hard'); const A = clone(L); applyRequired(A, true); assert.deepEqual(A, L, 'på: uendret');
  assert.deepEqual(applyEasy(clone(L), { goals: null }).goals, undefined, 'null fjerner nøkkelen');
  // lett brett er løsbart uten bygg (som dagens brett); det vanskelige er det ikke (ingen rest-vei, grafen i scene2level)
  assert.equal(L.report.solvable_by_graph, true); assert.equal(L.report.hard_solvable_by_graph, false, `${C.id}: rutegrafen finner ingen vei uten bygg`);
  const we = walkRouteAny(null, { level: B }); assert.ok(we.ok && !we.built, `${C.id}: lett brett går uten bygg: ${we.why}`);
  // 2) uten bygg stopper ruta, med det ferdige bygget går den til målet (ingen annen vei)
  const none = walkRoute(null, { level: L }); assert.ok(!none.ok, `${C.id}: uten bygg stopper ruta (${none.why})`);
  const bb = builtBase(L); assert.ok(bb && bb.route && bb.solids.length, 'referansebygget og ruta over det finnes');
  const built = walkRouteAny(null, { level: L }); assert.ok(built.ok && built.built, `${C.id}: ruta via det ferdige bygget går: ${built.why}`); assert.ok(built.secs < 120, `rimelig tid (${built.secs} s)`);
  const hs = walkRouteAny(null, { level: L, helpers: false, only: ['autoJump', 'holdGrab'], wallJump: false }); assert.ok(hs.ok, `${C.id}: også i streng modus: ${hs.why}`);
  // 3) referansebygget består PRØV (figuren og lastene), uten bygg faller lasten, og delene ligger klare fra start
  for (const load of ['figure', ...(site.loads || [])]) {
    const s = BP.runSim({ site, placed: site.ref.placed, links: site.ref.links || [] }, { load }); assert.equal(s.result, 'won', `${C.id}: referansebygget bærer ${load} (${s.reason})`); assert.equal(s.breaks.length, 0);
    assert.equal(BP.runSim({ site, placed: [], links: [] }, { load }).result, 'lost', `${C.id}: uten bygg: ${load} kommer ikke over`);
  }
  assert.ok(L.build.parts.length >= 4 && L.build.parts.every((q) => Number.isFinite(q.x) && Number.isFinite(q.z) && Number.isFinite(q.y)), 'delene ligger klare');
  for (const q of site.ref.placed) assert.ok(L.build.parts.some((p) => p.type === q.type), `delen ${q.type} finnes i delebrettet`);
  // 4) endringene er bare de ventede (ting borte, nye ting) og delmålene er gyldige
  for (const id of C.gone) assert.ok(!L.boxes.some((b) => b.id === id) && B.boxes.some((b) => b.id === id), `${C.id}: ${id} er borte i det vanskelige og tilbake i det lette`);
  for (const id of C.added) assert.ok(L.boxes.some((b) => b.id === id), `${C.id}: ${id} finnes`);
  assert.deepEqual(checkGoals(L, { levelId: C.id }), []); assert.ok(L.goals.length >= GOAL.minPerLevel && L.goals.length <= GOAL.maxPerLevel);
  const g = L.goals.find((q) => q.type === 'flag'); assert.ok(g && g.flag === site.id, 'bygg-delmålet er koblet til byggestedet'); assert.ok(!/\b(tast|mellomrom|space)\b/i.test(g.label + g.en)); assert.ok(L.goals.some((q) => q.gate), 'en delmål åpner målet');
  assert.ok(!B.goals.some((q) => q.type === 'flag'), 'det lette brettet har sine gamle delmål');
  assert.ok(L.hints.some((h) => /BYGG/.test(h.text)) && !/\b(tast|mellomrom)\b/i.test(L.hints.map((h) => h.text).join(' ')), 'hint nevner BYGG-knappen');
  // 5) lagret figur: står den bortenfor gapet uten bygd bro, settes den trygt ved byggestedet; ellers urørt
  const beyond = C.id === 'kjokken' ? [L.goal[0], L.goal[1], L.goal[2]] : [L.goal[0], L.goal[1], L.goal[2]], sr = safeResume(L, beyond, [], true);
  assert.ok(sr && Math.abs(sr[0] - site.x) < 12 && sr[1] === site.y && Math.abs(sr[2] - site.z) < 3, `${C.id}: satt ved byggestedet: ${sr}`);
  assert.equal(safeResume(L, beyond, [site.id], true), null, 'bygget er bestått'); assert.equal(safeResume(L, beyond, [], false), null, 'valget av'); assert.equal(safeResume(L, [0, 0, 0], [], true), null, 'på gulvet: urørt');
  assert.equal(safeResume(L, [site.x - 5, site.y, site.z], [], true), null, 'ved byggestedet (før gapet): urørt');
  // 6) kort
  assert.ok(REQ.cardLevels.includes(C.id) && reqCardShould({ L, level: C.id, on: true }) && !reqCardShould({ L, level: C.id, on: true, seen: true }) && !reqCardShould({ L, level: C.id, on: false }) && !reqCardShould({ L: B, level: C.id, on: true }));
  assert.notEqual(cardKeyOf(C.id), cardKeyOf('barnerom')); assert.equal(cardKeyOf('barnerom'), 'tlm.reqcard');
  // 7) NYTT-rad
  assert.ok(CHANGES.some((c) => c.level === C.id && /^r139-/.test(c.id) && /BYGG/.test(c.how) && /PRØV/.test(c.how)), `${C.id}: NYTT-rad`);
}
// Nivå 3: trapp av klosser, krydderhylla 30 cm (6 enheter) over mikroen og håndkleet er ikke lenger et grep; Nivå 4: vippe mellom ny hylle og dusjhylla (32,5 cm, 10 cm opp), ingen øverste hylle
{
  const L = lv('kjokken'), s = L.build.sites[0], mikro = L.boxes.find((b) => b.id === 'mikro'), hylle = L.boxes.find((b) => b.id === 'krydderhylle'), towel = L.boxes.find((b) => b.id === 'kjokkenhandkle');
  assert.ok(Math.abs((hylle.max[1] - mikro.max[1]) - 6) < 0.01 && Math.abs(s.y - mikro.max[1]) < 1e-6, 'trinnet er 6 enheter, byggestedet står på mikroen'); assert.ok(!towel.grip, 'håndkleet er ikke et grep');
  assert.ok(s.ref.placed.length >= 6 && s.ref.placed.every((p) => p.type === 'block'), 'seks klosser'); assert.ok(L.build.parts.filter((p) => p.type === 'block').length >= 6);
  const E = clone(L); applyRequired(E, false); assert.ok(E.boxes.find((b) => b.id === 'kjokkenhandkle').grip && Math.abs(E.boxes.find((b) => b.id === 'mikro').max[1] - 23.6) < 1e-9, 'lett: håndkleet er et grep og mikroen 23,6');
  const L4 = lv('bad2'), s4 = L4.build.sites[0], ny = L4.boxes.find((b) => b.id === 'ny_hylle'), ost = L4.boxes.find((b) => b.id === 'hylle_ost');
  assert.ok(Math.abs((ost.min[0] - ny.max[0]) - 6.5) < 0.01, 'gapet er 32,5 cm (6,5 enheter)'); assert.ok(Math.abs((ost.max[1] - ny.max[1]) - 2) < 0.01, 'dusjhylla er 10 cm høyere');
  assert.ok(s4.ref.placed.some((p) => p.type === 'seesaw') && s4.drop > 0 && Math.abs(s4.y - ny.max[1]) < 1e-6, 'vippe, støtte ned til gulvet, stedet står på ny hylle');
  assert.deepEqual(L4.boxes.filter((b) => /^skillevegg/.test(b.id)).map((b) => b.id).sort(), ['skillevegg', 'skillevegg_over', 'skillevegg_sor', 'skillevegg_under'], 'panelveggen har en åpning ved hylla');
  assert.ok(!L4.alts && !L4.boxes.some((b) => b.id === 'hylle'), 'ingen øverste hylle og ingen hard vei når bygget er påkrevd');
  assert.ok(L4.shortcuts.length === 1, 'hårgelé-genveien (verktøy-gåten) er beholdt');
}
// 8) Nivå 5 og 6 (og 1) er uendret: make_variants gir de samme filene (Nivå 6 lages av den lette Nivå 3-scenen); ingen andre brett har påkrevd bygg enn Nivå 2–4
{
  const names = ['bad2', 'barnerom2', 'kjokken2'], before = names.map((n) => rd(`scenes/${n}.scene.json`));
  execFileSync('node', ['tools/make_variants.mjs'], { stdio: 'pipe' }); names.forEach((n, i) => assert.equal(rd(`scenes/${n}.scene.json`), before[i], `${n}: scenen er utdatert, kjør node tools/make_variants.mjs`));
  for (const n of ['kjokken2', 'barnerom2']) { const L = lv(n); assert.ok(!L.build && !L.required, `${n}: ingen bygg`); assert.deepEqual(toLevel(sc(n)), L, `${n}: brettet er laget av scenen`); const w = walkRoute(`levels/${n}.level.json`); assert.ok(w.ok, w.why); }
  for (const id of ['bad', 'bad2x', 'barnerom2', 'kjokken2', 'leke', 'stue', 'verksted', 'bro']) if (fs.existsSync(`levels/${id}.level.json`)) assert.equal(requiredOf(lv(id)), null, `${id}: ingen påkrevd bygg`);
  const ps = scenePatch(sc('bad2'), applyEasyPatch(sc('bad2'), sc('bad2').required.easyPatch)); assert.ok(ps.objects, 'scenePatch gir en patch tilbake');
  assert.deepEqual(levelEasy(lv('bad2'), lv('bad2')), {}, 'ingen forskjell mellom like brett'); assert.ok(Object.keys(lv('bad2').required.easy).includes('boxes') && Object.keys(lv('kjokken').required.easy).includes('goals'));
}
// 9) tekster (norsk og engelsk, knapper og ikke taster) per brett, kort-visning, valg og dokumentasjon
{
  let lang = 'nb'; const { T } = makeT(() => lang);
  for (const l of ['nb', 'en']) { lang = l; for (const id of ['kjokken', 'bad2']) { const k = `req.card.text.${id}`; const s = T(k); assert.notEqual(s, k, `${l}:${k}`); assert.ok(!/\{\w+\}/.test(s) && !/\b(mellomrom|space|tast|shift|keyboard)\b/i.test(s), `${l}:${k}`); assert.equal(reqText(T, id), s);
    assert.ok((l === 'nb' ? /BYGG/ : /BUILD/).test(s) && (l === 'nb' ? /PRØV/ : /TRY/).test(s), `${l}:${k} nevner knappene`); assert.ok(s.split(/[.!?]\s/).length <= 3, 'kort tekst'); } }
  lang = 'nb'; assert.equal(reqText(T, 'barnerom'), T('req.card.text'), 'Nivå 2 bruker reserveteksten'); assert.equal(reqText(T, ''), T('req.card.text'));
  assert.deepEqual(DICT_KEYS.nb.filter((k) => /^req\./.test(k)).sort(), DICT_KEYS.en.filter((k) => /^req\./.test(k)).sort());
  const main = rd('main.js'), docs = rd('docs/INNSTILLINGER.md'), nivaer = rd('docs/NIVAER.md');
  assert.ok(/cardKeyOf\(levelId\)/.test(main) && /showReq\(\{ level: levelId/.test(main), 'kortet er per brett'); assert.ok(/Nivå 3.*Nivå 4|Nivå 3 \(trapp/.test(main.match(/fl\('buildrequired'[^\n]+/)[0]), 'valget nevner Nivå 3 og 4');
  assert.ok(docs.includes('R139') && docs.includes('easyPatch'), 'dokumentert i docs/INNSTILLINGER.md'); assert.ok(nivaer.includes('R139'), 'dokumentert i docs/NIVAER.md');
}
fs.rmSync(tmpdir, { recursive: true, force: true });
console.log('påkrevd-bygg-tester (R139) grønne');
