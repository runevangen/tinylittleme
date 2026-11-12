// node test_combo.mjs: R41, kombinasjonsmotoren (combos.js) med ekte fysikk, og stavhopp-animasjonen (vault_anim.js).
// Egenskap -> regel -> resultat; svamp + vann, håndkle + håndkle, tung ting + papirhaug; både med og uten kombinasjonen; nullstilling; brettet.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { P, newPlayer, initBodies, step, applyPreset, resetBodies, toolHint, box } from './physics.js';
import { COMBO, KIND_PROPS, RULES, RULE_IDS, propsOf, matchRule, findCombo } from './combos.js';
import { vaultPose, vaultPhase, isVaulting } from './vault_anim.js';
import { KINDS } from './kinds.js';
import { LINES } from './voice.js';
import { DICT_KEYS, NAMES } from './i18n.js';

applyPreset('mario');
const DT = 1 / 60, floor = { type: 'wood', id: 'gulv', min: [-40, -2, -40], max: [40, 0, 40] };
const idle = { mx: 0, mz: 0, jumpPressed: false, jumpHeld: false, grabPressed: false, grabHeld: false };
const mov = (id, kind, x, z, s, o = {}) => ({ id, kind, material: 'fabric', color: 0xcccccc, min: [x - s[0] / 2, o.y || 0, z - s[2] / 2], max: [x + s[0] / 2, (o.y || 0) + s[1], z + s[2] / 2], weight: 'light', ...o.extra });
const world = (movables, boxes = []) => { const L = { boxes: [floor, ...boxes], ropes: [], hazards: [], movables }; initBodies(L); return L; };
const run = (L, p, n, f = () => idle) => { for (let i = 0; i < n; i++) step(p, { ...idle, ...f(i) }, DT, L); };
const tap = (L, p) => { step(p, { ...idle, carryHeld: true, carryPressed: true }, DT, L); for (let i = 0; i < 3; i++) step(p, { ...idle, carryHeld: true }, DT, L); step(p, { ...idle, carryHeld: false }, DT, L); };
const walk = (L, p, x, z, n = 600) => { for (let i = 0; i < n; i++) { const dx = x - p.x, dz = z - p.z; if (Math.hypot(dx, dz) < 0.12) break; const l = Math.hypot(dx, dz); step(p, { ...idle, mx: dx / l, mz: dz / l, walk: Math.hypot(dx, dz) < 1 }, DT, L); } run(L, p, 25); };
const events = (L) => { const e = L.events || []; L.events = []; return e; };
const take = (L, p, id) => { const b = L.bodies.find((x) => x.id === id); p.fx = Math.sign((b.min[0] + b.max[0]) / 2 - p.x) || 0; p.fz = p.fx ? 0 : Math.sign((b.min[2] + b.max[2]) / 2 - p.z); tap(L, p); assert.equal(p.carry?.id, id, `tok ${id}`); return b; };

// ---- 1. tabellen: egenskap -> regel ----
{
  assert.ok(propsOf({ kind: 'sponge' }).has('absorbent') && propsOf({ kind: 'water_bowl' }).has('water') && propsOf({ kind: 'towel' }).has('knottable'));
  assert.ok(!propsOf({ kind: 'sponge', wet: true }).has('absorbent') && propsOf({ kind: 'sponge', wet: true }).has('heavy'), 'våt svamp: tung, suger ikke mer');
  assert.ok(propsOf({ kind: 'paper_pile', compress: true }).has('compressible') && !propsOf({ kind: 'paper_pile', compress: true, pressed: true }).has('compressible'));
  assert.ok(!propsOf({ kind: 'paper_pile' }).has('compressible'), 'uten flagg kan haugen ikke presses (den myke landingshaugen er uendret)');
  assert.equal(matchRule({ kind: 'sponge' }, { kind: 'water_bowl' }).id, 'sponge_water');
  assert.equal(matchRule({ kind: 'towel' }, { kind: 'towel' }).id, 'towel_towel');
  assert.equal(matchRule({ kind: 'sponge', wet: true }, { kind: 'paper_pile', compress: true }).id, 'pile_press');
  assert.equal(matchRule({ kind: 'towel' }, { kind: 'water_bowl' }), null, 'håndkle + vann er ingen regel');
  assert.equal(matchRule({ kind: 'sponge' }, { kind: 'paper_pile', compress: true }), null, 'tørr svamp er ikke tung nok');
  assert.ok(RULES.length >= 3 && RULES.every((r) => r.a && r.b && r.does && r.btn));
  for (const k of Object.keys(KIND_PROPS)) assert.ok(KINDS[k], `kinds.js kjenner ${k}`);
  for (const r of RULES) { assert.ok(DICT_KEYS.nb.includes('btn.' + r.btn) && DICT_KEYS.en.includes('btn.' + r.btn), `knapp ${r.btn} på begge språk`); assert.ok(DICT_KEYS.nb.includes('hint.' + r.btn === 'hint.soak' ? 'hint.soak' : 'hint.' + r.btn)); }
  for (const k of ['soak', 'knot', 'press']) assert.ok(LINES[k]?.say.length, `lydtekst/replikk ${k}`);
  assert.ok(NAMES.water_bowl);
}

// ---- 2. svamp + vann: våt, tung og myk (med og uten) ----
{
  const bowl = box('ceramic', 6, 10, 0, 1.6, -2, 2, { id: 'skal', kind: 'water_bowl' });
  const L = world([mov('sv', 'sponge', 0, 0, [2.4, 0.8, 2.4], { extra: { soft: true } })], [bowl]);
  const p = newPlayer(-2, 0, 0); run(L, p, 20);
  const sv = take(L, p, 'sv'), h0 = sv.max[1] - sv.min[1];
  assert.equal(toolHint(p, L), null, 'ingen vann i nærheten: TA slipper bare');
  walk(L, p, 3.5, 0); assert.equal(findCombo(p, L), null, 'for langt fra skåla');
  walk(L, p, 5, 0); assert.equal(toolHint(p, L), 'wet', 'ved skåla: SUG');
  COMBO.on = false; assert.equal(toolHint(p, L), null, 'av i innstillingene: ingen kombinasjon'); COMBO.on = true;
  tap(L, p); const ev = events(L); assert.ok(ev.some((e) => e.type === 'combo' && e.does === 'wet'), 'hendelse combo/wet');
  assert.ok(sv.wet && sv.weight === 'heavy' && sv.softK === COMBO.wetSoft && sv.max[1] - sv.min[1] > h0 * 1.3, 'våt: tung, myk og svullet');
  assert.ok(p.carry === sv, 'svampen holdes fortsatt');
  assert.equal(toolHint(p, L), null, 'våt svamp suger ikke mer');
  // bærefarten er lavere med våt svamp
  const dry = newPlayer(0, 0, 20); const sp = (pl) => { run(L, pl, 60, () => ({ mx: -1 })); return Math.hypot(pl.vx, pl.vz); };
  const vWet = sp(p); p.carry = null; sv.carried = false; const L2 = world([mov('sv', 'sponge', 0, 0, [2.4, 0.8, 2.4], { extra: { soft: true } })], [bowl]); const q = newPlayer(-2, 0, 0); run(L2, q, 20); take(L2, q, 'sv'); const vDry = sp.call(null, q) ;
  assert.ok(vWet < vDry - 0.05, `våt svamp er tyngre å bære (${vWet.toFixed(2)} < ${vDry.toFixed(2)})`);
}
// landing: våt svamp tar imot mer enn tørr, og begge mer enn gulv
{
  const landOn = (wet) => {
    const L = world([mov('sv', 'sponge', 0, 0, [4, 1.2, 4], { extra: { soft: true } })]); const sv = L.bodies[0]; if (wet) { sv.wet = true; sv.softK = COMBO.wetSoft; }
    const p = newPlayer(0, 14, 0); run(L, p, 200); return { imp: p.landImpact, on: p.groundBox === sv };
  };
  const d = landOn(false), w = landOn(true), fl = (() => { const L = world([]); const p = newPlayer(0, 14, 0); run(L, p, 200); return p.landImpact; })();
  assert.ok(d.on && w.on, 'landet på svampen');
  assert.ok(w.imp < d.imp * 0.6 && d.imp < fl, `våt ${w.imp.toFixed(1)} < tørr ${d.imp.toFixed(1)} < gulv ${fl.toFixed(1)}`);
  const L = world([mov('sv', 'sponge', 0, 0, [2.4, 0.8, 2.4], { extra: { soft: true } })]); const sv = L.bodies[0]; sv.wet = true; sv.weight = 'heavy'; sv.softK = 0.1; sv.max[1] += 0.4;
  resetBodies(L, null); assert.ok(!sv.wet && sv.softK === undefined && sv.weight === 'light' && Math.abs(sv.max[1] - sv.min[1] - 0.8) < 1e-9, 'nullstilling gjør svampen tørr igjen');
}

// ---- 3. håndkle + håndkle: knyttet tau, lengre enn dopapirbånd, revner ikke; og uten: ingen nedstigning ----
{
  const tower = box('wood', 10, 22, 0, 18, -6, 6, { id: 'tarn' });
  const L = world([mov('k1', 'towel', 14, 0, [2.8, 0.8, 2], { y: 18 }), mov('k2', 'towel', 18, 0, [2.8, 0.8, 2], { y: 18 }), mov('rull', 'roll', 14, -3, [2, 2, 2], { y: 18, extra: { material: 'paper', tool: 'roll' } })], [tower]);
  const p = newPlayer(12, 18, 0); run(L, p, 30); assert.ok(p.onGround && p.groundBox === tower);
  const k1 = take(L, p, 'k1'); walk(L, p, 16, 0);
  assert.equal(toolHint(p, L), 'knot', 'ved det andre håndkleet: KNYT');
  tap(L, p); assert.ok(events(L).some((e) => e.does === 'knot'));
  assert.ok(k1.knotted && k1.tool === 'roll' && !L.bodies.find((b) => b.id === 'k2').alive, 'ett knyttet tau, det andre er brukt opp');
  assert.equal(toolHint(p, L), 'need-roll', 'midt på flata: gå til kanten (HENG TAU)');
  // gå til sørkanten (z = 6) og heng tauet
  walk(L, p, 16, 5.3); p.fx = 0; p.fz = 1; run(L, p, 5);
  assert.equal(toolHint(p, L), 'roll', 'ved kanten kan tauet henges');
  tap(L, p); const made = L.made.find((m) => m.owner === 'k1'); assert.ok(made, 'laget et tau');
  assert.ok(made.grip && made.kind === 'towel_hang' && made.tear === undefined, 'grep-flate av stoff som ikke revner');
  assert.ok(made.max[1] - made.min[1] > P.stripMax + 1 && made.min[1] <= 0.01, `lengre enn dopapirbånd (${(made.max[1] - made.min[1]).toFixed(1)} > ${P.stripMax}) og helt ned til gulvet`);
  // sammenligning: dopapirrull gir et kortere bånd som revner
  const L2 = world([mov('rull', 'roll', 14, 0, [2, 2, 2], { y: 18, extra: { material: 'paper', tool: 'roll' } })], [tower]); const q = newPlayer(12, 18, 0); run(L2, q, 30); take(L2, q, 'rull'); walk(L2, q, 14, 5.3); q.fx = 0; q.fz = 1; run(L2, q, 5); tap(L2, q);
  const m2 = L2.made[0]; assert.ok(m2 && m2.tear > 0 && m2.max[1] - m2.min[1] <= P.stripMax + 1e-9, 'dopapirbånd: kortere og revner');
  // klatre ned i tauet med ekte fysikk (GREP + stikka mot kanten, så ned)
  p.carry = null; k1.carried = false; run(L, p, 10);
  p.fx = 0; p.fz = 1; let state = '';
  for (let i = 0; i < 60 * 14 && p.y > 0.5; i++) { step(p, { ...idle, mz: i < 30 ? 1 : 0, grabHeld: true, grabPressed: i % 30 === 0, mx: 0 }, DT, L); state = p.state; if (state === 'climb' && i > 40) break; }
  assert.ok(p.state === 'climb' || p.y < 2, `festet seg i tauet (${p.state}, y=${p.y.toFixed(1)})`);
  // nullstilling
  resetBodies(L, p); assert.equal(L.made.length, 0); assert.ok(L.bodies.every((b) => b.alive && !b.knotted && b.tool === (b.id === 'rull' ? 'roll' : '')), 'nullstilt: begge håndklær tilbake, uknyttet');
}
// uten det andre håndkleet: ingenting skjer
{
  const L = world([mov('k1', 'towel', 0, 0, [2.8, 0.8, 2])]); const p = newPlayer(-2, 0, 0); run(L, p, 20); take(L, p, 'k1');
  assert.equal(findCombo(p, L), null); tap(L, p); assert.ok(!events(L).some((e) => e.type === 'combo'));
  // et håndkle som henger fast (fast boks) kan ikke knyttes bort
  const fixed = box('fabric', 4, 6, 0, 2, -1, 1, { id: 'fast', kind: 'towel' }); const L3 = world([mov('k1', 'towel', 0, 0, [2.8, 0.8, 2])], [fixed]); const p3 = newPlayer(-2, 0, 0); run(L3, p3, 20); take(L3, p3, 'k1'); walk(L3, p3, 3, 0);
  assert.equal(findCombo(p3, L3), null, 'fast håndkle kan ikke knyttes');
}

// ---- 4. papirhaug presses av en tung ting: lavere trinn, med og uten ----
{
  const pile = box('paper', 8, 14, 0, 6, -3, 3, { id: 'haug', kind: 'paper_pile', soft: true, compress: true });
  const hylle = box('wood', 15, 25, 0, 8.6, -4, 4, { id: 'hylle' });
  const mk = () => { const L = world([mov('sv', 'sponge', 0, 0, [2.4, 0.8, 2.4], { extra: { soft: true } })], [pile, hylle]); return L; };
  // uten: haugen er for høy å hoppe opp på
  const hopOn = (L, p, id) => { for (let i = 0; i < 300; i++) { step(p, { ...idle, mx: 1, jumpPressed: i % 30 === 0 && p.onGround, jumpHeld: true }, DT, L); if (p.onGround && p.groundBox?.id === id) return true; } return false; };
  const L0 = mk(); const p0 = newPlayer(4, 0, 0); p0.fx = 1; p0.fz = 0; run(L0, p0, 20); assert.ok(!hopOn(L0, p0, 'haug'), 'uten kombinasjon: haugen på 6 er for høy');
  // med: våt svamp, press, hopp opp, og videre til hylla
  const L = mk(); const p = newPlayer(-2, 0, 0); run(L, p, 20); const sv = take(L, p, 'sv'); sv.wet = true; sv.weight = 'heavy'; sv.softK = COMBO.wetSoft; run(L, p, 5);
  assert.equal(toolHint(p, L), null, 'for langt fra haugen'); walk(L, p, 7, 0); assert.equal(toolHint(p, L), 'press');
  const dry = mk(); const pd = newPlayer(-2, 0, 0); run(dry, pd, 20); take(dry, pd, 'sv'); walk(dry, pd, 7, 0); assert.equal(toolHint(pd, dry), null, 'tørr svamp er ikke tung nok');
  tap(L, p); assert.ok(events(L).some((e) => e.does === 'press'), 'hendelse combo/press');
  assert.ok(pile.pressed && Math.abs(pile.max[1] - COMBO.pressTo * 6) < 1e-9, `haugen er halvert (${pile.max[1]})`);
  assert.equal(p.carry, null, 'den tunge tingen er lagt fra seg');
  const pl = newPlayer(4, 0, 0); pl.fx = 1; pl.fz = 0; run(L, pl, 20);
  assert.ok(hopOn(L, pl, 'haug'), 'presset haug: hopper opp på den');
  // en haug som allerede er presset presses ikke igjen
  assert.equal(matchRule({ weight: 'heavy' }, pile), null);
  resetBodies(L, pl); assert.ok(!pile.pressed && pile.max[1] === 6, 'nullstilling: haugen er like høy igjen');
}

// ---- 5. brettet: kombinasjonene finnes i prøverommet, og er ikke nødvendige (ruta er uendret) ----
{
  const LV = JSON.parse(fs.readFileSync('levels/klatring.level.json', 'utf8'));
  const kinds = (arr) => arr.map((b) => b.kind);
  assert.ok(kinds(LV.boxes).includes('water_bowl'), 'vannskål i brettet'); assert.ok(LV.boxes.some((b) => b.kind === 'paper_pile' && b.compress), 'presbar papirhaug');
  assert.ok(LV.movables.filter((b) => b.kind === 'towel').length >= 2, 'to løse håndklær'); assert.ok(LV.movables.some((b) => b.kind === 'sponge'), 'svamp');
  assert.ok(LV.route.length >= 2 && !LV.route.some((r) => /haug|vannskal|handkle_k/.test(r.id)), 'ruta går ikke via kombinasjonene (alternativ vei)');
  // hele kjeden i brettet med ekte fysikk: svamp -> skål -> SUG -> haug -> PRESS
  const L = JSON.parse(JSON.stringify(LV)); L.ropes = L.ropes || []; initBodies(L);
  const sv = L.bodies.find((b) => b.id === 'svamp'), bowl = L.boxes.find((b) => b.id === 'vannskal'), pile = L.boxes.find((b) => b.id === 'papirhaug_hoy');
  const cx = (b) => (b.min[0] + b.max[0]) / 2, cz = (b) => (b.min[2] + b.max[2]) / 2;
  const p = newPlayer(cx(sv) + 2, 0, cz(sv)); run(L, p, 30); take(L, p, 'svamp');
  walk(L, p, cx(bowl), cz(sv)); walk(L, p, cx(bowl), bowl.min[2] - 0.9); assert.equal(toolHint(p, L), 'wet', 'ved vannskåla i brettet: SUG'); tap(L, p);
  assert.ok(sv.wet, 'svampen ble våt i brettet');
  // (figuren flyttes fritt til haugen: ruta dit er ikke det som testes)
  p.x = pile.max[0] + 0.8; p.z = cz(pile); p.fx = 1; p.fz = 0; run(L, p, 20); assert.equal(toolHint(p, L), 'press', 'ved haugen i brettet: PRESS'); tap(L, p);
  assert.ok(pile.pressed && pile.max[1] - pile.min[1] < 3.2, 'haugen i brettet er presset til et trinn som kan hoppes opp på');
  const hylle = L.boxes.find((b) => b.id === 'hylle'); assert.ok(hylle.max[1] - pile.max[1] < 3.3, 'fra haugen er det et hopp opp til hylla');
}

// ---- 6. stavhopp-animasjon ----
{
  assert.deepEqual(['plant', 'swing', 'top', 'release'], [1, 0.4, -0.1, -0.8].map(vaultPhase));
  const p = { vaulting: true, onGround: false, state: 'air', carry: { pole: 1.5 }, vy: 11, vaultV0: 11 };
  assert.ok(isVaulting(p) && !isVaulting(p, false) && !isVaulting({ ...p, onGround: true }) && !isVaulting({ ...p, carry: null }) && !isVaulting({ ...p, vaulting: false }));
  const seq = [11, 7, 3, 0.5, -2, -8].map((vy) => vaultPose({ ...p, vy }));
  for (const s of seq) { for (const [k, v] of Object.entries(s.T)) assert.ok(Number.isFinite(v), `${k} er et tall`); assert.ok(Number.isFinite(s.poleTilt)); }
  assert.ok(seq[0].poleTilt < -0.9 && seq[3].poleTilt > -0.3 && seq[5].poleTilt > 0.3, 'staven: skrått ned i start, opp mot slutten');
  assert.ok(seq[2].T.hL < -0.8 && seq[2].T.kL > 1, 'midt i svingen: bena svinger opp og frem'); assert.ok(seq[5].T.zL > 0.5, 'slipp: armene ut til siden');
  assert.ok(seq[2].T.hL !== seq[0].T.hL && seq[3].T.lean !== seq[0].T.lean, 'posen endrer seg gjennom hoppet');
  // fysikken husker avsparkfarten når den gjør stavhopp
  const pole = mov('stav', 'qtip', 0, 0, [3, 0.14, 0.14], { extra: { pole: 1.5 } }); const L = world([pole]); const q = newPlayer(-2, 0, 0); q.fx = 1; q.fz = 0; run(L, q, 20); take(L, q, 'stav'); walk(L, q, -12, 0);
  let vault = false; run(L, q, 120, (i) => { if (q.vaulting) vault = true; return { mx: 1, jumpPressed: i > 70 && i % 15 === 0 && q.onGround, jumpHeld: true }; });
  assert.ok(vault && q.vaultV0 > P.jump, `stavhopp registrert (vaultV0 ${q.vaultV0})`);
}
// ---- 7. filene er med i index.html ----
{ const html = fs.readFileSync('index.html', 'utf8'); for (const f of ['combos', 'vault_anim']) assert.ok(html.includes(`'${f}'`), `${f} ligger i files i index.html`); }
assert.deepEqual(RULE_IDS.sort(), ['pile_press', 'sponge_water', 'towel_towel']);
console.log('kombinasjons-tester grønne');
