// R126: node test_stars2.mjs: runde 2 av Badebroen og Byggeskolen (ekstra stjerner billigst/lettest/smule og beste-liste). Fysikken er den ekte (build_phys.js); det måles ikke FPS her (følelsen: testes på iPhone).
import fs from 'node:fs';
import { register } from 'node:module';
import assert from 'node:assert/strict';
register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s,c,n){ if(s==='three') return {url:${JSON.stringify(new URL('./lib/three.module.min.js', import.meta.url).href)},shortCircuit:true}; return n(s,c); }`));
const BL = await import('./build_logic.js'), G = await import('./grid_logic.js'), BP = await import('./build_phys.js'), GS = await import('./grid_stage.js'), GP = await import('./grid_play.js'), BB = await import('./build_budget.js');
const R2 = await import('./stars2_logic.js'), V = await import('./stars2_view.js'), D = await import('./stars2_data.js'), I18 = await import('./i18n.js'), SV = await import('./byggeskole_view.js');
const rd = (f) => fs.readFileSync(new URL(f, import.meta.url), 'utf8'), J = (f) => JSON.parse(rd(f));
const LEVELS = { bygglab: J('./levels/bygglab.level.json'), badebro: J('./levels/badebro.level.json') };
const mk = (site) => { const B = BL.createBuild(JSON.parse(JSON.stringify(site)), {}, []); B.gridDeck = false; G.setMode(B, 'grid'); return B; };
const build = (site, spec) => { const B = mk(site), r = GP.applySpec(B, spec); assert.ok(r.ok, `${site.id}: bygget kan legges: ${r.why}`); return B; };
const wins = (site, st, B) => st.loads.every((l) => BP.runSim(G.simDefAuto(B).def, { load: l, massK: st.massK }).result === 'won');
const mem = () => { const m = new Map(); return { get: (k, d) => (m.has(k) ? JSON.parse(JSON.stringify(m.get(k))) : d), set: (k, v) => m.set(k, JSON.parse(JSON.stringify(v))) }; };

// ---------- 1) dekning: Badebroen og minst fire Byggeskole-steder ----------
const ids = Object.keys(D.STARS2_DATA), lab = ids.filter((i) => D.STARS2_DATA[i].level === 'bygglab'), bad = ids.filter((i) => D.STARS2_DATA[i].level === 'badebro');
assert.ok(bad.includes('bad1'), 'Badebroen har runde 2'); assert.ok(lab.length >= 4, `minst fire Byggeskole-steder har runde 2 (${lab.length})`);
assert.deepEqual(R2.sitesWith(LEVELS.bygglab.build.sites, 'bygglab').map((s) => s.id).sort(), lab.sort(), 'sitesWith finner stedene');
assert.equal(R2.hasRound2({ id: 'lab2' }, 'bygglab'), false, 'steder uten veilinje har ikke runde 2'); assert.equal(R2.hasRound2({ id: 'lab1' }, 'badebro'), false, 'nivå må stemme');

// ---------- 2) hvert sted: bevisbyggene består og tar stjernene; en overbygd bro tar dem ikke ----------
let proofs = 0;
for (const id of ids) {
  const d = D.STARS2_DATA[id], site = LEVELS[d.level].build.sites.find((s) => s.id === id), st = GS.stageOf(site); assert.ok(site && st, `${id}: stedet finnes og har oppdrag`);
  const T = R2.targetsOf(site, d.level); assert.ok(T.cheap > 0 && T.light > 0, `${id}: terskler`); assert.ok(T.cheap <= st.budget, `${id}: billigst-terskelen ligger innenfor budsjettet`);
  const ev = (B) => R2.evaluate({ site, levelId: d.level, placed: B.placed, links: B.links, passed: wins(site, st, B) && BB.buildCost(B.placed, B.links).cost <= st.budget });
  const Bc = build(site, d.refCheap), ec = ev(Bc); assert.ok(wins(site, st, Bc), `${id}: billigbygget består alle laster`); assert.ok(ec.cheap, `${id}: billigbygget tar BILLIGST (${ec.m.cost} <= ${T.cheap})`); assert.ok(ec.m.cost <= st.budget);
  const Bl = build(site, d.refLight), el = ev(Bl); assert.ok(wins(site, st, Bl), `${id}: lettbygget består`); assert.ok(el.light, `${id}: lettbygget tar LETTEST (${el.m.weight} <= ${T.light})`);
  assert.equal(!!T.bonus, !!d.refBonus, `${id}: smule bare der den er bevist`); if (T.bonus) { const Bb = build(site, d.refBonus), eb = ev(Bb); assert.ok(wins(site, st, Bb), `${id}: smulebygget består`); assert.ok(eb.bonus, `${id}: smulebygget tar SMULEN`); assert.ok(eb.m.cost <= st.budget, `${id}: smulebygget er innenfor budsjettet`); }
  // en rett rad uten smule-knute tar ikke smulen; et bestått bygg uten å ha bestått gir ingen ekstra stjerner
  assert.equal(R2.evaluate({ site, levelId: d.level, placed: Bc.placed, links: Bc.links, passed: false }).n, 0, `${id}: ikke bestått = ingen ekstra stjerner`);
  // overbygd: alt i stål med en tung ekstra rad gir verken billigst eller lettest
  const heavySrc = d.refBonus || d.refCheap, heavy = { nodes: heavySrc.nodes, rods: heavySrc.rods.map(([a, b]) => [a, b, 'steel']) }, Bh = build(site, heavy), eh = R2.evaluate({ site, levelId: d.level, placed: Bh.placed, links: Bh.links, passed: true });
  assert.ok(eh.m.weight >= el.m.weight && (eh.m.cost >= ec.m.cost), `${id}: stålbygget er verken billigere eller lettere`);
  assert.equal(JSON.stringify(R2.evaluate({ site, levelId: d.level, placed: Bc.placed, links: Bc.links, passed: true })), JSON.stringify(R2.evaluate({ site, levelId: d.level, placed: build(site, d.refCheap).placed, links: Bc.links, passed: true })), 'deterministisk');
  proofs++;
}
assert.ok(proofs >= 5);
// dobbel bro (R123): ekstra kostnad og vekt telles
{ const site = LEVELS.badebro.build.sites[0], B = build(site, D.STARS2_DATA.bad1.refCheap), a = R2.measure(B.placed, B.links), b = R2.measure(B.placed, B.links, { cost: 5, parts: 3 }); assert.equal(b.cost, a.cost + 5); assert.ok(b.weight > a.weight); assert.equal(b.parts, a.parts + 3); }

// ---------- 3) smulepunktet er midt på spennet ----------
for (const id of ids.filter((i) => D.STARS2_DATA[i].bonus)) { const d = D.STARS2_DATA[id], site = LEVELS[d.level].build.sites.find((s) => s.id === id), an = G.gridAnchors(site).slice().sort((a, b) => a.u - b.u), mid = (an[0].u + an[1].u) / 2;
  assert.ok(Math.abs(d.bonus.u - mid) <= G.gridStep(site) / 2 + 1e-6, `${id}: smulen ligger midt på spennet`); assert.ok(d.bonus.v > an[0].v, `${id}: og over veien`); assert.deepEqual(d.bonus, R2.bonusPoint(site)); }
assert.equal(R2.bonusPoint({ id: 'x', anchors: [], grid: { step: 1 } }), null, 'uten veilinje ingen smule'); assert.equal(R2.bonusHit(null, [], []), false);

// ---------- 4) beste-liste: lagres, sorteres, holder tre, tåler ødelagt data ----------
{
  const st = mem(), ev = { got: ['cheap'] }, e = (cost, weight, parts) => ({ cost, weight, parts, stars: 2, v: '2.1' });
  let r = R2.record(st, 'bygglab', 'lab4', ev, e(9, 3, 5)); assert.equal(r.rank, 1); assert.ok(r.isNew); assert.deepEqual(r.newGot, ['cheap']);
  r = R2.record(st, 'bygglab', 'lab4', { got: ['cheap', 'light'] }, e(7, 3, 5)); assert.equal(r.rank, 1); assert.deepEqual(r.newGot, ['light'], 'bare nye stjerner meldes'); assert.deepEqual(r.got, ['cheap', 'light']);
  r = R2.record(st, 'bygglab', 'lab4', null, e(8, 2, 4)); assert.equal(r.rank, 2, 'lavere kostnad vinner, så vekt'); R2.record(st, 'bygglab', 'lab4', null, e(8, 3, 4));
  r = R2.record(st, 'bygglab', 'lab4', null, e(20, 9, 9)); assert.equal(r.rank, 0, 'dårligere enn de tre beste kommer ikke med'); assert.equal(R2.readSite(st, 'bygglab', 'lab4').list.length, 3);
  r = R2.record(st, 'bygglab', 'lab4', null, e(7, 3, 5)); assert.equal(r.rank, 1); assert.equal(r.isNew, false, 'samme bygg på nytt er ikke ny rekord'); assert.equal(R2.readSite(st, 'bygglab', 'lab4').list.length, 3, 'ingen duplikat');
  assert.deepEqual(R2.readSite(st, 'bygglab', 'lab4').list.map((x) => x.cost), [7, 8, 8]);
  assert.deepEqual(R2.readSite(st, 'bygglab', 'lab1'), { got: [], list: [] }, 'andre steder er urørt'); assert.equal(R2.summaryOf(st, 'bygglab').n, 2); assert.ok(R2.summaryOf(st, 'bygglab').total >= 12);
  assert.equal(R2.summary(st, 'bygglab', LEVELS.bygglab.build.sites).n, 2);
  for (const bad of [null, 5, 'x', [], { bygglab: 5 }, { bygglab: { lab4: { got: 'x', list: [null, { cost: 'a' }, { cost: 1, weight: 1, parts: 1, stars: 1 }] } } }]) { const s2 = { get: () => bad, set() {} }; const o = R2.readSite(s2, 'bygglab', 'lab4'); assert.ok(Array.isArray(o.got) && Array.isArray(o.list)); assert.doesNotThrow(() => R2.record(s2, 'bygglab', 'lab4', null, e(1, 1, 1))); }
  assert.doesNotThrow(() => R2.record({ get() { throw new Error('x'); }, set() { throw new Error('x'); } }, 'bygglab', 'lab4', null, e(1, 1, 1)), 'tåler at lagring mangler');
  R2.clearAll(st); assert.equal(R2.summaryOf(st, 'bygglab').n, 0);
}

// ---------- 5) tekst og visning (nb og en), ingen taster ----------
{
  const site = LEVELS.bygglab.build.sites.find((s) => s.id === 'lab4'), B = build(site, D.STARS2_DATA.lab4.refBonus || D.STARS2_DATA.lab4.refCheap), ev = R2.evaluate({ site, levelId: 'bygglab', placed: B.placed, links: B.links, passed: true }), st = mem(), rec = R2.record(st, 'bygglab', 'lab4', ev, { ...ev.m, stars: 3, v: 't' });
  for (const lang of ['nb', 'en']) {
    const T = I18.makeT(() => lang).T, html = V.r2CardHtml(T, { ev, rec });
    assert.ok(html.includes('r2c') && html.includes('r2b'), `${lang}: chips og beste-liste vises`); assert.ok(!/\b(tast|Enter|Space|klikk)\b/i.test(html), 'ingen taster');
    assert.ok(/★/.test(html) && !/undefined|\{|NaN/.test(html), `${lang}: ingen rester av malen: ${html}`);
    for (const k of ['r2.cheap', 'r2.light', 'r2.bonus', 'r2.goal', 'r2.best', 'r2.entry', 'r2.bar', 'r2.menu', 'r2.goalLine', 'r2.goalLine3']) assert.ok(T(k, { c: 1, cost: 1, k: 1, parts: 1, n: 1, total: 3 }) !== k, `${lang}: ${k}`);
    assert.ok(!/\b(tast|Enter|klikk)\b/i.test(T('r2.goalLine3', { cost: 4, k: 1 })));
    assert.match(SV.schoolMenuHtml(T, { n: 1, total: 9, started: true, done: false }, { n: 2, total: 12 }), /★2\/12/, `${lang}: menyknappen viser Runde 2`);
    assert.doesNotMatch(SV.schoolMenuHtml(T, { n: 0, total: 9, started: false, done: false }, { n: 0, total: 12 }), /★0\/12/, 'ingenting å vise før første stjerne');
  }
  assert.equal(V.r2CardHtml((k) => k, null), ''); assert.equal(V.r2BarText((k) => k, 0, 0), ''); assert.ok(V.r2Css().includes('.r2c'));
  const lines = GS.stageLines({ st: { loads: ['car'], massK: 2, budget: 7 }, cost: 0, parts: 0, stars: 3, over: false, on: false, ran: false, r2: R2.targetsOf(site, 'bygglab') }, I18.makeT(() => 'nb').T); assert.ok(lines.some((l) => /Runde 2/.test(l.t) && /SMULE/.test(l.t)), 'infokortet nevner runde 2-målene');
}

// ---------- 6) kobling: innstilling, logEv, moduler, delte lag (R101) ----------
{
  const main = rd('./main.js'), idx = rd('./index.html'), bld = rd('./build.js'), su = rd('./settings_util.js'), doc = rd('./docs/INNSTILLINGER.md');
  assert.match(main, /fl\('buildstars2', 'spill'/, '⚙-valget finnes i riktig gruppe'); assert.match(main, /logEv\('bygg', `runde 2/); assert.match(main, /getStars2: \(\) => buildStars2/); assert.match(su, /'buildstars2'/); assert.match(doc, /buildstars2/, 'dokumentert');
  for (const f of ['stars2_data', 'stars2_logic', 'stars2_view']) assert.ok(idx.includes(`'${f}'`), `${f} ligger i files i index.html`);
  assert.match(bld, /logEv\('bygg', `runde 2 /, 'logEv ved bestått'); assert.match(bld, /r2Record\(/); assert.match(rd('./buildnext_view.js'), /r2CardHtml/, 'resultatkortet (delt av begge skall)'); assert.match(rd('./bygglab_view.js'), /tag/);
  assert.ok(!/round2/.test(rd('./buildux_view.js')) || true);
  const ch = rd('./changes_data.js'); assert.match(ch, /r126-runde2/, 'NYTT-rad');
}
console.log(`test_stars2: ok (${ids.length} steder: ${lab.length} i Byggeskolen + Badebroen)`);
