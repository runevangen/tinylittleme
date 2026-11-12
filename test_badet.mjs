// node test_badet.mjs: R42 «Motgiften høyere opp i badet». Nivå 1 og 4: motgiften på toppen (medisinskap / øverste hylle), klatrevei fra knaggrekka,
// en hard vei uten klatring (eskene), delmål, og stigende vann (variant.js: floodCfg/floodLevel/floodStep) som kan slås på og avgjøres (rømme eller drukne).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { walkRoute } from './tools/walk_route.mjs';
import { botSolve } from './tools/bot.mjs';
import { checkGoals } from './goals.js';
import { FLOOD, FLOOD_MODES, floodCfg, floodLevel, floodPhase, floodStep, checkVariant } from './variant.js';

const lv = (id) => JSON.parse(fs.readFileSync(`levels/${id}.level.json`, 'utf8')), sc = (id) => JSON.parse(fs.readFileSync(`scenes/${id}.scene.json`, 'utf8'));

// 1) begge bad-nivåene: motgiften høyt oppe, klatrevei fra knaggrekka, og en hard vei uten klatring
for (const id of ['bad', 'bad2']) {
  const L = lv(id), ids = L.route.map((n) => n.id), at = ids.indexOf('knaggrekke');
  assert.ok(L.goal[1] >= 38, `${id}: motgiften ligger minst 190 cm opp (${L.goal[1] * 5} cm)`);
  assert.ok(at > 0 && L.route.slice(0, at).some((n) => n.grip), `${id}: ruta klatrer opp til knaggrekka`);
  assert.ok(L.route.slice(at).some((n) => n.grip), `${id}: fra knaggrekka klatres det videre mot motgiften`);
  assert.ok(L.goals.some((g) => g.type === 'reach' && g.on === 'knaggrekke' || g.type === 'reach' && g.on === 'ny_hylle'), `${id}: delmål for veien opp`);
  assert.deepEqual(checkGoals(L, { levelId: id }), [], `${id}: delmålene er gyldige`);
  const alt = (L.alts || [])[0]; assert.ok(alt, `${id}: har en hard vei`);
  assert.ok(alt.route.every((n) => !n.grip), `${id}: den harde veien bruker ingen klatreflate`);
  assert.ok(alt.route.length > L.route.length, `${id}: den harde veien har flere steg (flere hopp) enn klatreruta`);
  assert.ok(alt.label && alt.en && !/\b(trykk|tast)\b/i.test(alt.label + alt.en), `${id}: tekst uten taster`);
  for (const mode of [{}, { helpers: false, only: ['autoJump', 'holdGrab'], wallJump: false }]) {
    const r = walkRoute(null, { level: L, ...mode }); assert.ok(r.ok, `${id}: klatreruta går: ${r.why}`);
    const h = walkRoute(null, { level: L, route: alt.route, ...mode }); assert.ok(h.ok, `${id}: den harde veien går (uten klatring): ${h.why}`);
  }
  const bot = botSolve(`levels/${id}.level.json`); assert.equal(bot.verdict, 'BESTÅR_STRENG', `${id}: boten`); assert.ok(bot.plans.some((p) => p.kind === 'hard' && p.verdict === 'BESTÅR_STRENG'), `${id}: boten går den harde veien`);
  // scenen og brettet er à jour
  assert.equal(sc(id).alts.length, L.alts.length);
}
// nivå 1: målet står på medisinskapet; nivå 4: på den øverste hylla (og den harde veien går via medisinskapet)
assert.equal(lv('bad').route.at(-1).id, 'medisinskap'); assert.equal(lv('bad2').route.at(-1).id, 'hylle');
assert.deepEqual(lv('bad2').alts[0].route.slice(-2).map((n) => n.id), ['medisinskap', 'hylle']);
// nivå 1 og 4 har ulike ruter
assert.notDeepEqual(lv('bad').route.map((n) => n.id), lv('bad2').route.map((n) => n.id));
// uten klatring i veien: å fjerne eskene (alt-trinnene) rører ikke klatreruta
{ const L = lv('bad'), gone = new Set(L.alts[0].route.slice(1, -1).map((n) => n.id)); L.boxes = L.boxes.filter((b) => !gone.has(b.id)); assert.ok(walkRoute(null, { level: L }).ok, 'klatreruta trenger ikke eskene'); }
// hindringer: uten eskene kan ikke den harde veien gås
{ const L = lv('bad'), gone = new Set(L.alts[0].route.slice(2, 4).map((n) => n.id)); L.boxes = L.boxes.filter((b) => !gone.has(b.id)); assert.ok(!walkRoute(null, { level: L, route: L.alts[0].route }).ok, 'hull i trappa stopper den harde veien'); }

// 2) stigende vann: rene funksjoner
assert.equal(floodCfg('av'), null); assert.equal(floodCfg('finnes_ikke'), null);
assert.deepEqual(FLOOD_MODES, ['av', 'rolig', 'vanlig', 'rask']);
const V = lv('bad2').variant; assert.deepEqual(checkVariant(V), []); assert.equal(V.twist.flood.max, 14, 'flomhøyde i enheter (70 cm)');
for (const m of ['rolig', 'vanlig', 'rask']) {
  const c = floodCfg(m, V.twist); assert.ok(c.rate > 0 && c.delay > 0 && c.max === 14);
  assert.equal(floodLevel(0, c), 0); assert.equal(floodLevel(c.delay - 1, c), 0); assert.ok(floodLevel(c.delay + 5, c) > 0);
  assert.equal(floodLevel(1e6, c), 14, 'stopper på toppen');
  let prev = -1; for (let t = 0; t < 400; t += 5) { const l = floodLevel(t, c); assert.ok(l >= prev); prev = l; }
  assert.equal(floodPhase(1, c), 'tørr'); assert.equal(floodPhase(c.delay + 1, c), 'stiger'); assert.equal(floodPhase(1e6, c), 'full');
  // står du stille på gulvet, drukner du: fristen etter at vannet er over hodet
  let t = 0, under = 0, drown = null; for (; t < 300 && drown === null; t += 0.1) { const s = floodStep(under, 0.1, 0, 0, floodLevel(t, c), c); under = s.under; if (s.drowned) drown = t; }
  const expect = c.delay + c.depth / c.rate + c.grace; assert.ok(Math.abs(drown - expect) < 0.4, `${m}: druknet etter ${drown} s (ventet ${expect.toFixed(1)})`);
  // står du høyt nok (over vannet + hodehøyde), drukner du aldri
  assert.ok(!floodStep(0, 1, 16, 0, 14, c).warn && !floodStep(0, 100, 16, 0, 14, c).drowned);
  // å komme opp av vannet gir fristen tilbake
  assert.ok(floodStep(2, 1, 20, 0, 14, c).under < 2);
}
assert.ok(floodCfg('rask', V.twist, 2).rate > floodCfg('rask', V.twist).rate, 'admin-faktor');
assert.ok(FLOOD.rask.rate > FLOOD.vanlig.rate && FLOOD.vanlig.rate > FLOOD.rolig.rate && FLOOD.rask.delay < FLOOD.rolig.delay, 'rolig < vanlig < rask');

// 3) rømme eller tape: både klatreruta og den harde veien klarer seg i alle tre farter (boten er raskere enn en nybegynner, men den er også bevis på at tiden holder)
for (const m of ['rolig', 'vanlig', 'rask']) {
  const c = floodCfg(m, V.twist), L = lv('bad2');
  for (const [name, route] of [['klatreruta', null], ['den harde veien', L.alts[0].route]]) {
    const trace = [], r = walkRoute(null, { level: L, ...(route ? { route } : {}), trace }); assert.ok(r.ok, `${m}/${name}: går`);
    let under = 0; for (const [t, , y] of trace) { const s = floodStep(under, 0.1, y, 0, floodLevel(t, c), c); under = s.under; assert.ok(!s.drowned, `${m}/${name}: boten druknet ved ${t} s (y=${y})`); }
  }
  // tape: en som blir stående på gulvet drukner før han rekker klatreruta langt (stått 60 s)
  let under = 0, lost = false; for (let t = 0; t < 120; t += 0.1) { const s = floodStep(under, 0.1, 0, 0, floodLevel(t, c), c); under = s.under; if (s.drowned) lost = true; }
  assert.ok(lost, `${m}: den som ikke klatrer taper`);
}

// 4) koblet til spillet: innstilling, tekster med knapper, logg, tvilling-brettet uten flom
{
  const main = fs.readFileSync('main.js', 'utf8'), vv = fs.readFileSync('variant_view.js', 'utf8'), i18n = fs.readFileSync('i18n.js', 'utf8');
  assert.ok(/sl\('flood', 'spill'/.test(main) && /rg\('floodrate', 'admin'/.test(main), 'valg i ⚙ (Spill) og finjustering i admin');
  assert.ok(/logEv\('flood'/.test(vv) && /logEv\('flood'/.test(main), 'logEv for flom');
  for (const k of ['flood.up', 'flood.deep', 'flood.drown']) assert.ok(new RegExp(`'${k}': '[^']*\\{(grab|jump)\\}`).test(i18n), `${k}: nevner knappene (nb)`);
  assert.ok(!/\b(trykk|tast)\s+(på\s+)?(mellomrom|space|E|F)\b/i.test(i18n.match(/'flood\.[^\n]+/g).join(' ')), 'ingen taster');
}
for (const id of ['bad', 'barnerom2', 'kjokken2']) assert.ok(!(lv(id).variant?.twist?.flood), `${id}: bare nivå 4 har stigende vann`);
console.log('badet (R42): ok');
