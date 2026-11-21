// R123: node test_grid25d.mjs: DOBBEL BRO (2,5D): ren logikk (grid_25d.js), to-lags fysikk og sidekraft (build_phys.js createSim2), kostnad, lagring og ANGRE, 3D-modell og kollisjonsflater, Byggeskole «Bred bro»
// og det valgfrie målet i Kjøkkenbroen, og byggeskjermen mot en DOM-stubb. Ekte FPS og følelse: testes på iPhone.
import fs from 'node:fs';
import { register } from 'node:module';
import assert from 'node:assert/strict';
register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s,c,n){ if(s==='three') return {url:${JSON.stringify(new URL('./lib/three.module.min.js', import.meta.url).href)},shortCircuit:true}; return n(s,c); }`));
const BL = await import('./build_logic.js'), G = await import('./grid_logic.js'), BP = await import('./build_phys.js'), X = await import('./grid_25d.js'), BB = await import('./build_budget.js'), GS = await import('./grid_stage.js'), BW = await import('./build_world.js'), I18 = await import('./i18n.js');
const lab = JSON.parse(fs.readFileSync(new URL('./levels/bygglab.level.json', import.meta.url), 'utf8')), kj = JSON.parse(fs.readFileSync(new URL('./levels/kjokkenbro.level.json', import.meta.url), 'utf8'));
const sites = lab.build.sites, site = (k) => sites.find((s) => s.lab.key === k);
const mk = (k) => { const B = BL.createBuild(JSON.parse(JSON.stringify(site(k))), {}, []); B.gridDeck = false; G.setMode(B, 'grid'); return B; };
// en rett rad av fire tre-staver mellom ankrene (tre knuter midt på)
const row = (k, mat = 'wood') => { const B = mk(k), ch = ['a1']; for (const u of [-1.75, 0, 1.75]) ch.push(G.gAddNode(B, u, 0).node.id); ch.push('a2'); for (let i = 0; i < 4; i++) assert.ok(G.gAddRod(B, ch[i], ch[i + 1], mat).ok); return B; };
const def2 = (B) => ({ ...G.simDefAuto(B).def, layers: X.layersOf(B) });
const stageOf = (k) => GS.stageOf(site(k));

// ---------- 1) valg, ANGRE, lagring ----------
{
  const B = mk('bred'); assert.deepEqual(X.canDouble(B), { ok: false, why: 'few' }, 'ingen staver: kan ikke velge');
  assert.equal(X.gSetDouble(B, 'bred', 'rett').ok, false); assert.equal(X.hasDouble(B), false);
  const c = BL.createBuild(JSON.parse(JSON.stringify(site('bred'))), {}, []); assert.deepEqual(X.canDouble(c), { ok: false, why: 'mode' }, 'klassisk modus: ingen dobbel bro');
  const R = row('bred'); assert.deepEqual(X.canDouble(R), { ok: true });
  assert.equal(X.extraOf(R).cost, 0, 'uten valg: ingen ekstra kostnad'); assert.equal(X.layersOf(R), null);
  const h0 = R.history.length; assert.ok(X.gSetDouble(R, 'middels', 'x').ok); assert.equal(R.history.length, h0 + 1, 'ett steg i historikken'); assert.deepEqual(R.rg.dbl, { w: 'middels', brace: 'x' });
  assert.equal(X.gSetDouble(R, 'middels', 'x').same, true); assert.equal(R.history.length, h0 + 1, 'samme valg: ingen nytt steg');
  assert.equal(X.gSetDouble(R, 'kjempe', 'x').ok, false); assert.equal(X.gSetDouble(R, 'smal', 'diagonal').ok, false);
  // ANGRE tar bort det i ett steg, og bygget er som før
  assert.ok(G.gUndo(R)); assert.equal(X.hasDouble(R), false); assert.equal(R.rg.rods.length, 4, 'stavene er uendret');
  X.gSetDouble(R, 'bred', 'rett'); const snap = G.gridSnapshot(R.rg); assert.deepEqual(snap.dbl, { w: 'bred', brace: 'rett' }, 'lagres');
  const back = G.gridFromSnapshot(R.site, JSON.parse(JSON.stringify(snap))); assert.deepEqual(back.dbl, { w: 'bred', brace: 'rett' }, 'leses tilbake');
  assert.equal(G.gridFromSnapshot(R.site, { ...snap, dbl: { w: 'x', brace: 'rett' } }).dbl, undefined, 'ugyldig dobbel bro i lagring kastes');
  assert.equal(G.gridFromSnapshot(R.site, { nodes: [], rods: [] }).dbl, undefined, 'gamle lagringer virker uendret');
  assert.ok(G.gReset(R)); assert.equal(X.hasDouble(R), false, 'NULLSTILL fjerner også dobbel bro');
  assert.ok(X.gClearDouble(R) === false);
  const R2 = row('bred'); X.gSetDouble(R2, 'smal', 'rett'); assert.ok(X.gClearDouble(R2)); assert.ok(G.gUndo(R2)); assert.deepEqual(R2.rg.dbl, { w: 'smal', brace: 'rett' }, 'ANGRE på FJERN bringer den tilbake');
}

// ---------- 2) tverrstag og kostnad ----------
{
  const R = row('bred'); X.gSetDouble(R, 'bred', 'rett'); const br = X.braceList(R);
  assert.equal(br.length, 3, 'rett: ett tverrstag per knute du la'); assert.ok(br.every((b) => !b.diag && b.a.id === b.b.id && b.a.z === 0 && b.b.z === 1 && Math.abs(b.len - 6) < 1e-9), 'rett og like lange (bred = 6 enheter)');
  assert.deepEqual(X.braceList(R), br, 'deterministisk rekkefølge');
  X.gSetDouble(R, 'smal', 'x'); const bx = X.braceList(R); assert.equal(bx.length, 3 + 2 * 4, 'X-form: rett + to diagonaler per fag (4 fag)'); assert.equal(bx.filter((b) => b.diag).length, 8); assert.ok(bx.every((b) => b.len >= 4 - 1e-9));
  assert.ok(X.spacingOf({ w: 'smal' }) < X.spacingOf({ w: 'middels' }) && X.spacingOf({ w: 'middels' }) < X.spacingOf({ w: 'bred' }), 'bredden vokser'); assert.equal(X.spacingOf({ w: 'smal' }), X.BU);
  const base = BB.starsFor(R.site, R.placed, R.links), ex = X.extraOf(R), tot = BB.starsFor(R.site, R.placed, R.links, ex);
  assert.ok(ex.cost > 0 && ex.parts === 4 + bx.length, 'planet bak og tverrstagene koster og teller som deler'); assert.equal(tot.cost, base.cost + ex.cost); assert.equal(tot.parts, base.parts + ex.parts);
  assert.ok(tot.stars <= base.stars, 'dobbel bro gir aldri flere stjerner enn samme bygg uten');
  const pc = X.previewCost(R, 'bred', 'rett'); assert.equal(pc.nBraces, 3); assert.ok(pc.planes === 4 && pc.braces === 9, JSON.stringify(pc)); assert.ok(X.previewCost(R, 'smal', 'x').braces > X.previewCost(R, 'smal', 'rett').braces, 'X-form koster mer');
  assert.equal(BB.starsFor(R.site, R.placed, R.links).cost, base.cost, 'uten 4. argument er alt som før'); assert.equal(BB.buildCost(R.placed, R.links, { cost: NaN, parts: -1 }).cost, BB.buildCost(R.placed, R.links).cost - 0 + 0 || 0 || BB.buildCost(R.placed, R.links).cost);
}

// ---------- 3) fysikk: deterministisk, sidekraft, bevist stabil og rask ----------
{
  const R = row('bred'); const single = BP.runSim(G.simDef(R), { load: 'ball' });
  // uten dobbel bro og uten vind er createSim2 nøyaktig createSim
  assert.deepEqual(BP.runSim2(G.simDef(R), { load: 'ball' }), { ...single, braceBreaks: [] }, 'uten layers og vind: samme resultat som runSim'); assert.equal(BP.runSim2(G.simDef(R), { load: 'ball' }).result, 'won');
  const sim0 = BP.createSim2(G.simDef(R), { load: 'ball' }); assert.ok(!sim0.side, 'ingen sidemodell uten vind og dobbel bro');
  // vind: et enkelt plan tåler under SIDE.plane og velter over
  assert.equal(BP.runSim2(G.simDef(R), { load: 'ball', wind: 0.9 }).result, 'won', 'svak vind: enkel bro står');
  const w1 = BP.runSim2(G.simDef(R), { load: 'ball', wind: 1.6 }); assert.equal(w1.result, 'lost'); assert.equal(w1.reason, 'wind', 'sterk vind velter en enkel bro');
  // to plan
  const out = {}; for (const [w, b] of [['smal', 'rett'], ['middels', 'rett'], ['bred', 'rett'], ['smal', 'x'], ['bred', 'x']]) { X.gSetDouble(R, w, b); out[w + b] = BP.runSim2(def2(R), { load: 'ball', wind: 1.6 }); }
  assert.equal(out.smalrett.result, 'lost'); assert.equal(out.smalrett.reason, 'wind'); assert.equal(out.smalrett.braceBreaks.length, 3, 'smale, rette tverrstag ryker (alle tre)');
  assert.equal(out.middelsrett.result, 'lost', 'middels og rett er ikke nok med tre tverrstag');
  assert.equal(out.bredrett.result, 'won', 'bred og rett står'); assert.equal(out.bredrett.braceBreaks.length, 0);
  assert.equal(out.smalx.result, 'won', 'X-form holder selv smal'); assert.equal(out.bredx.result, 'won');
  // sterkere vind enn to plan tåler velter alt
  X.gSetDouble(R, 'bred', 'x'); const hard = BP.runSim2(def2(R), { load: 'ball', wind: 2.5 }); assert.equal(hard.result, 'lost'); assert.equal(hard.reason, 'wind', 'over 2 × SIDE.plane velter selv en bred X-bro');
  // en dobbel bro er ikke svakere enn enkel uten vind: lasten kommer over som før, og tiden er lik
  const noWind = BP.runSim2(def2(R), { load: 'ball' }); assert.equal(noWind.result, 'won'); assert.equal(noWind.t, single.t, 'to plan uten vind: samme tid som ett plan (planene er like)');
  // deterministisk
  assert.equal(JSON.stringify(BP.runSim2(def2(R), { load: 'ball', wind: 1.6 })), JSON.stringify(BP.runSim2(def2(R), { load: 'ball', wind: 1.6 })), 'samme bygg og vind gir samme resultat');
  assert.equal(JSON.stringify(BP.runSim2(def2(R), { load: 'car', massK: 2, wind: 1.2 })), JSON.stringify(BP.runSim2(def2(R), { load: 'car', massK: 2, wind: 1.2 })));
  // vinden vokser jevnt fra SETTLE, og stagene ryker ett for ett (progressivt), de svakeste først
  assert.equal(BP.windAt(1.6, 0), 0); assert.equal(BP.windAt(1.6, BP.SETTLE), 0); assert.ok(BP.windAt(1.6, BP.SETTLE + 1) > 0 && BP.windAt(1.6, BP.SETTLE + 1) < 1.6); assert.equal(BP.windAt(1.6, 99), 1.6); assert.equal(BP.windAt(0, 5), 0);
  // tidsmåling: to-lags prøve (med vind) tar ikke mer enn 2 × et enkelt plan (planene er like, så én simulering gjelder begge)
  const time = (f, n = 3) => { let best = Infinity; for (let i = 0; i < n; i++) { const t0 = performance.now(); f(); best = Math.min(best, performance.now() - t0); } return best; };
  X.gSetDouble(R, 'bred', 'rett'); const t1 = time(() => BP.runSim(G.simDef(R), { load: 'ball' })), t2 = time(() => BP.runSim2(def2(R), { load: 'ball', wind: 1.6 })); assert.ok(t2 <= 2 * t1 + 5, `to plan ${t2.toFixed(0)} ms mot ett plan ${t1.toFixed(0)} ms (≤ 2×)`);
  console.log(`  tid: ett plan ${t1.toFixed(0)} ms, to plan ${t2.toFixed(0)} ms`);
  // pose: to baner og sidekraft-tall til visningen
  const sim = BP.createSim2(def2(R), { load: 'ball', wind: 1.6 }); for (let i = 0; i < 200; i++) sim.step(); const p = sim.pose(); assert.equal(p.lanes, 2); assert.equal(p.side.braces.length, 3); assert.ok(p.side.W > 0 && p.side.f >= 0 && Number.isFinite(p.figure.u));
}

// ---------- 4) 3D-modell, forhåndsvisning og kollisjonsflater ----------
{
  const R = row('bred'); assert.equal(X.model3d(R), null); X.gSetDouble(R, 'middels', 'x'); const m = X.model3d(R);
  assert.equal(m.pts.length, 2 * R.rg.nodes.filter((n) => R.rg.rods.some((r) => r.a === n.id || r.b === n.id)).length, 'hver knute finnes i begge plan'); assert.ok(m.pts.every((p) => Math.abs(Math.abs(p.z) - X.spacingOf(R.rg.dbl) / 2) < 1e-9));
  assert.equal(m.edges.filter((e) => e.kind === 'brace').length, 3); assert.equal(m.edges.filter((e) => e.kind === 'diag').length, 8); assert.equal(m.edges.filter((e) => e.kind === 'rod' || e.kind === 'road').length, 8, 'stavene to ganger');
  for (const [yaw, pitch] of [[0, 0], [-0.7, 0.45], [2, 1], [-3, -0.2]]) { const pr = X.project(m, yaw, pitch, 300, 190).pts; assert.equal(pr.length, m.pts.length); assert.ok(pr.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && p.d > 0 && p.x > -300 && p.x < 600 && p.y > -300 && p.y < 500), `projeksjon ${yaw},${pitch}`); }
  const a = X.project(m, 0, 0, 300, 190).pts, b = X.project(m, 1, 0, 300, 190).pts; assert.notDeepEqual(a, b, 'å dra snur bildet');
  // kollisjonsflater: to tynne plan, tette, og dekk mellom dem langs veien
  const placed = BW.buildSolids ? R.placed : []; const road = G.roadRodIds(R), sp = X.spacingOf(R.rg.dbl); const sol = X.buildSolids25(R.site, placed.map((p) => ({ ...p })), road || new Set(), sp);
  assert.ok(sol.length > 0 && sol.every((s) => s.min.every(Number.isFinite) && s.max.every(Number.isFinite) && s.max[0] > s.min[0] && s.max[1] > s.min[1] && s.max[2] - s.min[2] > 0.05), 'alle flater har tykkelse (ingen hårfine skiver)');
  const zs = (id) => sol.filter((s) => s.id.endsWith(id)); assert.ok(zs('_f').length && zs('_b').length, 'foran og bak');
  for (const s of zs('_f')) assert.ok(Math.abs((s.min[2] + s.max[2]) / 2 - (R.site.z - sp / 2)) < 1e-9); for (const s of zs('_b')) assert.ok(Math.abs((s.min[2] + s.max[2]) / 2 - (R.site.z + sp / 2)) < 1e-9);
  const roadIds = [...(road || [])]; assert.ok(roadIds.length > 0 && zs('_d').length > 0, 'dekk mellom planene langs veien'); for (const s of zs('_d')) { assert.ok(s.min[2] >= R.site.z - sp / 2 + X.PLANE_T / 2 - 1e-9 && s.max[2] <= R.site.z + sp / 2 - X.PLANE_T / 2 + 1e-9); }
  const lines = X.braceLines({ x: 10, y: 2, z: 5 }, R); assert.equal(lines.length, 11); assert.ok(lines.every((l) => Math.abs(l.a.z - 5) === sp / 2 && Math.abs(l.b.z - 5) === sp / 2 && Number.isFinite(l.a.x) && Number.isFinite(l.b.y))); assert.deepEqual(X.braceLines({ x: 0, y: 0, z: 0 }, mk('bred')), []);
  assert.equal(X.planesOf([{ id: 'a' }], 6).length, 2);
}

// ---------- 5) Byggeskole «Bred bro» ----------
{
  const st = stageOf('bred'); assert.ok(st && st.wind === 1.6 && st.budget === 20, 'oppdraget har sidevind'); assert.equal(X.windOf(st), 1.6); assert.equal(X.windOf({ wind: 99 }), X.WIND_MAX); assert.equal(X.windOf({}), 0); assert.equal(X.windOf(null), 0);
  assert.equal(GS.stageScaled(site('bred'), {}).wind, 1.6, 'vinden følger med når oppdraget skaleres'); assert.equal(sites.filter((s) => GS.stageOf(s)?.wind).length, 1, 'bare ett sted har vind');
  assert.equal(site('bred').lab.n, 9); assert.ok(GS.stageLocked(sites, new Set(), 'lab9') && !GS.stageLocked(sites, new Set(['lab8']), 'lab9'), 'låst til Materialer er bestått');
  const wins = (B, wind = X.windFor(B, st)) => BP.runSim2(def2(B), { load: 'ball', massK: st.massK, wind }).result === 'won';
  // en enkel bro feiler (vinden), også den beste enkle
  const S = row('bred', 'steel'); assert.equal(X.windFor(S, st), 1.6); assert.equal(BP.runSim2(G.simDef(S), { load: 'ball', massK: 1, wind: X.windFor(S, st) }).result, 'lost', 'enkel bro velter, selv av stål');
  // en dobbel bro består innenfor budsjettet og får stjerner
  const R = row('bred'); X.gSetDouble(R, 'bred', 'rett'); assert.ok(wins(R), 'dobbel bro: bred og rett består');
  const j = GS.judge(R.site, GS.stageScaled(site('bred'), {}), R.placed, R.links, { loadsDone: true, extra: X.extraOf(R) }); assert.ok(j.passed && !j.over && j.cost <= 20, `innenfor budsjettet (${j.cost} av ${j.budget})`); assert.equal(j.stars, 3, 'kjent løsning gir tre stjerner');
  // for smal og rett feiler; X-form smal er for dyr
  const N = row('bred'); X.gSetDouble(N, 'smal', 'rett'); assert.ok(!wins(N), 'smal og rett feiler');
  const Xs = row('bred'); X.gSetDouble(Xs, 'smal', 'x'); const jx = GS.judge(Xs.site, GS.stageScaled(site('bred'), {}), Xs.placed, Xs.links, { loadsDone: wins(Xs), extra: X.extraOf(Xs) }); assert.ok(wins(Xs) && jx.over, 'X-form smal står, men er over budsjettet');
  // uten extra regnes ikke planet bak med (dobbel bro ville vært gratis): kostnaden er høyere med
  assert.ok(j.cost > GS.judge(R.site, GS.stageScaled(site('bred'), {}), R.placed, R.links, { loadsDone: true }).cost);
  // dobbel bro gjør ikke de andre oppdragene lettere: ingen av dem har vind, og lasten er den samme (planene simuleres likt)
  for (const s of sites) { if (s.lab.key === 'bred') continue; const sg = GS.stageOf(s); assert.equal(X.windFor(row(s.lab.key === 'bro' ? 'bro' : 'bro'), sg), 0, `${s.lab.key}: ingen vind`); }
  const B = row('bro'); const before = BP.runSim(G.simDef(B), { load: 'ball' }).result; X.gSetDouble(B, 'bred', 'x'); assert.equal(BP.runSim2(def2(B), { load: 'ball' }).result, before, 'bro: dobbel bro endrer ikke utfallet uten vind'); assert.ok(BB.starsFor(B.site, B.placed, B.links, X.extraOf(B)).cost > BB.starsFor(B.site, B.placed, B.links).cost, 'men den koster mer');
  const weak = mk('materialer'); for (const [a, b] of [['a1', 'a2']]) void [a, b]; // en for svak bro blir ikke sterk av å dobles (planene er like svake)
  const WK = row('tau', 'rope'); const wkSingle = BP.runSim(G.simDef(WK), { load: 'car', massK: 3 }).result; X.gSetDouble(WK, 'bred', 'x'); assert.equal(BP.runSim2(def2(WK), { load: 'car', massK: 3 }).result, wkSingle, 'svak bro forblir svak'); void weak;
}

// ---------- 6) valgfritt mål i Kjøkkenbroen ----------
{
  assert.ok(X.wideOf('kjokken1') && X.wideOf('kjokken1').wind > 0); assert.equal(X.wideOf('bro1'), null); assert.equal(X.wideFlag('kjokken1'), 'bred_kjokken1');
  const g = kj.goals.find((q) => q.flag === 'bred_kjokken1'); assert.ok(g && g.type === 'flag' && !g.gate && !g.req && g.label && g.en, 'valgfritt delmål i kjokkenbro (hindrer aldri at du kommer i mål)');
  const ks = kj.build.sites.find((s) => s.id === 'kjokken1'); const PL = await import('./grid_play.js'); const probe = JSON.parse(JSON.stringify(ks)); PL.ensurePlayGrid([probe]); assert.ok(probe.grid, 'Kjøkkenbroen har rutenett');
  const B = BL.createBuild(probe, {}, []); B.gridDeck = true; G.setMode(B, 'grid'); const an = G.gridAnchors(probe), st = G.gridStep(probe), ch = [B.rg.nodes[0].id]; void an; void st;
  assert.equal(X.windFor(B, null), 0, 'enkelt bro: ingen vind (kjent oppførsel er uendret)');
  const ids = B.rg.nodes.filter((n) => n.deck || n.fixed).sort((a, b) => a.u - b.u).map((n) => n.id); for (let i = 0; i + 1 < ids.length; i++) void ids[i];
  const up = G.gAddNode(B, (an[0].u + an[1].u) / 2, st); assert.ok(up.ok); const mid = B.rg.nodes.filter((n) => n.deck)[1] || B.rg.nodes.find((n) => n.deck);
  assert.ok(G.gAddRod(B, mid.id, up.node.id, 'wood').ok && G.gAddRod(B, B.rg.nodes.find((n) => n.deck && n.u > mid.u).id, up.node.id, 'wood').ok, 'to staver oppå dekket'); assert.ok(X.canDouble(B).ok); void ch;
  X.gSetDouble(B, 'bred', 'x'); assert.equal(X.windFor(B, null), X.wideOf('kjokken1').wind, 'dobbel bro i kjøkkenbroen får sidevind (valgfritt mål)'); X.gClearDouble(B); assert.equal(X.windFor(B, null), 0, 'uten dobbel bro: som før');
}

// ---------- 7) tekster ----------
{
  let lang = 'nb'; const { T } = I18.makeT(() => lang), keys = I18.DICT_KEYS.nb.filter((k) => k.startsWith('d25.')); assert.ok(keys.length >= 20);
  for (const l of ['nb', 'en']) { lang = l; for (const k of keys) { const t = T(k, { n: 3, cost: 9, name: 'X' }); assert.ok(t && t !== k && !/\{\w+\}/.test(t), `${l}:${k}`); assert.ok(!/\b(tast|Tast|keyboard)\b/.test(t), 'ingen taster: ' + k); } }
  lang = 'nb'; assert.ok(/DOBBEL BRO/.test(T('d25.btn')) && /⋯/.test(T('d25.lostWind')), 'tekstene nevner knappene (⋯ → DOBBEL BRO)');
}

// ---------- 8) byggeskjermen mot en DOM-stubb ----------
{
  const mkEl = () => { const el = { style: { setProperty() {} }, dataset: {}, children: [], _l: {}, _html: '', classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, toggle(c, f) { (f === undefined ? !this._s.has(c) : f) ? this._s.add(c) : this._s.delete(c); }, contains(c) { return this._s.has(c); } },
    appendChild(c) { this.children.push(c); return c; }, addEventListener(t, f) { (this._l[t] ||= []).push(f); }, removeEventListener() {}, setPointerCapture() {}, releasePointerCapture() {}, setAttribute() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 390, height: 844, right: 390, bottom: 844 }), closest: () => null, remove() {},
    getContext: () => new Proxy({}, { get: (t, k) => (k in t ? t[k] : k === 'measureText' ? () => ({ width: 80 }) : () => ({ addColorStop() {} })), set: (t, k, v) => ((t[k] = v), true) }),
    querySelector: () => mkEl(), querySelectorAll: () => [], set innerHTML(v) { this._html = v; }, get innerHTML() { return this._html; }, width: 0, height: 0 }; return el; };
  const body = mkEl(); globalThis.document = { body, createElement: mkEl, head: mkEl(), getElementById: () => null, querySelector: () => mkEl() };
  globalThis.window = globalThis; globalThis.innerWidth = 390; globalThis.innerHeight = 844; globalThis.devicePixelRatio = 2; globalThis.addEventListener = () => {}; globalThis.removeEventListener = () => {}; globalThis.requestAnimationFrame = () => 0; globalThis.cancelAnimationFrame = () => {};
  const { createBuildMode } = await import('./build.js');
  const mem = new Map(), store = { get: (k, d) => (mem.has(k) ? mem.get(k) : d), set: (k, v) => mem.set(k, v) };
  const mkSite = () => { const s = JSON.parse(JSON.stringify(site('bred'))); s.id = 'bred'; s.x = 0; s.y = 2; s.z = 0; return s; };
  const L = { boxes: [], build: { sites: [mkSite()], parts: [] } }, player = { x: 0, y: 2, z: 0, onGround: true, state: 'ground' }, log = [];
  const cfg = { on: true, lock: false, massK: 1, budgetK: 1 }; let dbl = true;
  const mkB = () => createBuildMode({ getDouble: () => dbl, scene: { add() {}, remove() {} }, LEVEL: JSON.parse(JSON.stringify(L)), player: { ...player }, $: () => mkEl(), T: (k, v) => k + (v ? JSON.stringify(v) : ''), logEv: (t, d) => log.push([t, d]), toast: (m) => log.push(['toast', m]), TOUCH: true, buzz() {}, audio: {}, isPlay: () => true, isMenu: () => false, isBoss: () => false, isWon: () => false, isOv: () => false, getSnap: () => true, setSnap() {}, allParts: () => true, onChange() {}, store, levelId: 'gtest', getStage: () => cfg });
  const bm = mkB(); bm.update(0.016, true);
  assert.ok(bm.open('bred', { force: true })); assert.ok(bm.grid.toggle() && bm.grid.on); assert.equal(bm.stage.now.wind, 1.6, 'oppdraget i byggeskjermen har vind');
  assert.ok(bm.stage.lines().some((x) => /d25\.windGoal/.test(x.t)), 'kortet sier at bare en dobbel bro står imot vinden');
  assert.equal(bm.d25.open(), false, 'uten staver: dialogen åpnes ikke'); assert.ok(log.some(([t, m]) => t === 'toast' && /d25\.few/.test(m)), 'forklaring');
  const tapAt = (u, v) => { const p = bm.screenPos(u, v); bm.grid.tap(p.x, p.y); };
  const an = bm.grid.info().nodes.filter((n) => n.fixed).sort((p, q) => p.u - q.u), st = G.gridStep(site('bred'));
  const pts = [an[0].u, an[0].u + st, an[0].u + 2 * st, an[0].u + 3 * st, an[1].u]; tapAt(pts[0], 0); for (let i = 1; i < 5; i++) tapAt(pts[i], 0);
  assert.equal(bm.grid.info().rods.length, 4, 'fire staver');
  assert.ok(bm.d25.open() && bm.d25.isOpen(), 'dialogen åpnes'); assert.ok(log.some(([t, d]) => t === 'bygg' && /^dobbel bro: dialog åpnet/.test(d)));
  assert.ok(bm.d25.pick('bred', 'rett') && bm.d25.apply(), 'BRUK'); assert.ok(!bm.d25.isOpen(), 'lukkes etter BRUK'); assert.ok(log.some(([t, d]) => t === 'bygg' && /^dobbel bro bred: bred, rett, 3 tverrstag/.test(d)), 'valget logges');
  assert.ok(bm.cost.cost > 4, 'kostnaden teller planet bak og tverrstagene: ' + bm.cost.cost); assert.equal(bm.double, true);
  assert.ok(bm.startTry() && bm.running, 'PRØV starter to-lags prøven'); assert.ok(log.some(([t, d]) => t === 'bygg' && /^dobbel bro prøve bred: to plan \(bred, rett\), 3 tverrstag, vind 1.6/.test(d)), 'prøven logges med plan og vind');
  bm.stopTry(); dbl = false; assert.ok(bm.startTry()); assert.ok(!log.slice(-3).some(([t, d]) => /dobbel bro prøve/.test(d)), 'valget av: ett plan og ingen vind'); bm.stopTry(); assert.equal(bm.cost.cost, 4, 'valget av: kostnaden er uten planet bak');
}
console.log("test_grid25d ok");
