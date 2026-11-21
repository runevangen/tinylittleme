// R125: runde 2 av Klossetrappa og Vippa (trapp2, vippe2). Scenene er à jour med tools/make_round2.mjs, brettene kan vinnes, første forsøk med enkleste bygg feiler,
// den harde veien finnes og ruta via bygget går, dagens brett er uendret, og valget buildround2 styrer brettlisten.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { makeRound2, sceneText } from './tools/make_round2.mjs';
import { walkRoute } from './tools/walk_route.mjs';
import * as BW from './build_world.js';
import * as BP from './build_phys.js';
import { ROUND2, isRound2, round2Ids, visibleLevels, splitLevels } from './round2_logic.js';

const lv = (id) => JSON.parse(fs.readFileSync(`levels/${id}.level.json`, 'utf8'));
const won = (site, placed) => BP.runSim({ site, placed: BP.settledPlaced({ site, placed, links: [] }), links: [] });
const T = Math.PI / 12;

// 1) scenene er à jour med verktøyet, og brettene finnes
{
  const gen = makeRound2();
  for (const id of round2Ids()) { assert.equal(fs.readFileSync(`scenes/${id}.scene.json`, 'utf8'), sceneText(gen[id]), `${id}: scenen er à jour (kjør node tools/make_round2.mjs)`); assert.ok(fs.existsSync(`levels/${id}.level.json`), `${id}: brettet finnes (scene2level)`); }
  assert.deepEqual(round2Ids(), ['trapp2', 'vippe2']);
}
// 2) logikk: brettlisten
{
  const L = [{ id: 'bro' }, { id: 'trapp' }, { id: 'trapp2' }, { id: 'vippe2' }];
  assert.deepEqual(visibleLevels(L, true).map((l) => l.id), ['bro', 'trapp', 'trapp2', 'vippe2']); assert.deepEqual(visibleLevels(L, false).map((l) => l.id), ['bro', 'trapp']);
  assert.deepEqual(splitLevels(L, true).round2.map((l) => l.id), ['trapp2', 'vippe2']); assert.equal(splitLevels(L, false).round2.length, 0); assert.equal(splitLevels(L, false).main.length, 2);
  assert.ok(isRound2('trapp2') && !isRound2('trapp') && !isRound2('toString'));
}
// 3) hekter i spillet: brettliste, valg og modul i index.html
{
  const main = fs.readFileSync('main.js', 'utf8'), idx = fs.readFileSync('index.html', 'utf8');
  for (const id of round2Ids()) assert.ok(main.includes(`{ id: '${id}'`), `${id} står i LEVELS`);
  assert.ok(/fl\('buildround2', 'spill'/.test(main) && main.includes("store.get('tlm.buildround2', true)"), 'valget buildround2 (⚙ → Spill, standard på)');
  assert.ok(/logEv\('bygg', `runde 2/.test(main), 'runde 2 logges');
  assert.ok(idx.includes("'round2_logic'"), 'round2_logic i files i index.html');
  for (const id of round2Ids()) assert.ok(!/\btaste|\bpil/i.test(JSON.stringify(lv(id).hints || [])), `${id}: lappene nevner knapper, ikke taster`);
}
// 4) dagens brett er uendret: runde 1 har fortsatt lav hylle og lav vippehylle
{
  const t = lv('trapp').build.sites[0], v = lv('vippe').build.sites[0];
  assert.equal(t.deck[1].top, 6, 'trapp: hylla er fortsatt 6 enheter'); assert.equal(v.deck[1].top, 2, 'vippe: hylla er fortsatt 2 enheter over');
  assert.equal(BP.runSim({ site: t, placed: BP.settledPlaced({ site: t, placed: t.ref.placed, links: [] }), links: [] }).result, 'won', 'trapp: runde 1-trappa består fortsatt');
}
// 5) trapp2: høyere bygging
{
  const L = lv('trapp2'), site = L.build.sites[0];
  assert.equal(site.id, ROUND2.trapp2.site); assert.ok(site.deck[1].top >= 8 && site.deck[1].top <= 10, 'hylla er 8–10 enheter høy (runde 1: 6)'); assert.ok(site.h >= site.deck[1].top + 4, 'stedet er høyt nok til tårnet');
  const ref = won(site, site.ref.placed); assert.equal(ref.result, 'won', `referansebygget (tårn + to ramper) består (${ref.reason})`); assert.equal(ref.breaks.length, 0);
  assert.equal(site.ref.placed.length, 5);
  assert.equal(BP.runSim({ site, placed: [], links: [] }).result, 'lost', 'uten bygg består ikke prøven');
  const blocks = (n, u = -3) => Array.from({ length: n }, (_, i) => ({ id: `b${i}`, type: 'block', u, v: 0.75 + 1.5 * i, rot: 0 }));
  assert.equal(won(site, blocks(3)).result, 'lost', 'bare tårnet (enkleste bygg) feiler');
  const r1 = lv('trapp').build.sites[0].ref.placed.map((p) => ({ ...p, u: p.u - 2 })); assert.equal(won(site, r1).result, 'lost', 'runde 1-trappa (seks klosser) når ikke den høye hylla');
  assert.equal(won(site, [...blocks(3), { id: 'p1', type: 'plank_l', u: -7, v: 2.3, rot: 30 * Math.PI / 180 }]).result, 'lost', 'tårn og én rampe (uten rampe opp på hylla) feiler');
  const need = {}; for (const p of site.ref.placed) need[p.type] = (need[p.type] || 0) + 1; for (const [t, n] of Object.entries(need)) assert.ok(L.build.parts.filter((q) => q.type === t).length >= n, `nok deler av typen ${t} å finne i rommet`);
  const gl = (L.goals || []).find((g) => g.type === 'flag'); assert.ok(gl && gl.flag === site.id && !gl.gate && !gl.req, 'bygging er valgfritt og koblet til stedet');
  const alt = walkRoute('levels/trapp2.level.json'); assert.ok(alt.ok, `den harde veien går: ${alt.why}`);
  const route = BW.refRoute(L, site), sp = BP.settledPlaced({ site, placed: site.ref.placed, links: [] }); assert.ok(route, 'ruta via bygget finnes');
  const built = walkRoute(null, { level: L, route, extraBoxes: BW.buildSolids(site, sp) }); assert.ok(built.ok, `ruta via det ferdige bygget går: ${built.why}`);
  assert.ok(!walkRoute(null, { level: L, route }).ok, 'uten bygget går ikke snarveien');
  const bad = walkRoute(null, { level: L, extraBoxes: BW.worstSolids(site) }); assert.ok(bad.ok, `verst tenkelige bygg stenger ikke den harde veien: ${bad.why}`);
}
// 6) vippe2: balanse
{
  const L = lv('vippe2'), site = L.build.sites[0], base = lv('vippe').build.sites[0];
  assert.equal(site.id, ROUND2.vippe2.site); const top = site.deck[1].top; assert.ok(top >= 4 && top > base.deck[1].top, 'hylla på den andre siden er høyere enn i runde 1');
  const seesaw = (deg) => [{ id: 'v1', type: 'seesaw', u: site.anchors[0].u, v: site.anchors[0].v, rot: deg * Math.PI / 180 }];
  const res = {}; for (const d of [0, 15, 30, 45, 60]) res[d] = won(site, seesaw(d)).result;
  assert.deepEqual(res, { 0: 'lost', 15: 'lost', 30: 'won', 45: 'won', 60: 'lost' }, 'bare 30 og 45 grader holder; rett vippe (enkleste bygg) og for bratt feiler');
  assert.equal(won(site, site.ref.placed).result, 'won', 'referansebygget (vippe på 30 grader) består');
  assert.equal(BP.runSim({ site, placed: [], links: [] }).result, 'lost', 'uten bygg består ikke prøven');
  const gl = (L.goals || []).find((g) => g.type === 'flag'); assert.ok(gl && gl.flag === site.id && !gl.gate && !gl.req, 'bygging er valgfritt og koblet til stedet');
  const alt = walkRoute('levels/vippe2.level.json'); assert.ok(alt.ok, `den harde veien går: ${alt.why}`);
  const route = BW.refRoute(L, site), sp = BP.settledPlaced({ site, placed: site.ref.placed, links: [] });
  const built = walkRoute(null, { level: L, route, extraBoxes: BW.buildSolids(site, sp) }); assert.ok(built.ok, `ruta via det ferdige bygget går: ${built.why}`);
  assert.ok(!walkRoute(null, { level: L, route }).ok, 'uten bygget går ikke snarveien');
  const bad = walkRoute(null, { level: L, extraBoxes: BW.worstSolids(site) }); assert.ok(bad.ok, `verst tenkelige bygg stenger ikke den harde veien: ${bad.why}`);
}
void T;
console.log('runde 2-tester grønne (R125)');
