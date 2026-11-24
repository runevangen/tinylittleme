// node test_leditor.mjs (R152): «Lag brett fra bilder» i spillet (leditor_logic.js, leditor_text.js, scene2level_core.js). Ingen nett: tjenesten byttes ut med stub.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { LE, REASONS } from './leveleditor_logic.js';
import { LED, photoCountOk, fitDim, splitDataUrl, imageFits, lowerQuality, toleUrl, buildBody, callTolk, STEPS, stepNow, setStep, moveThings, moveThingTo, deleteThings, thingInfo, lastRoom, setLastRoom, saveRoomScene, loadRoomScene, meanLuma, gammaFor, gammaLut, brightenData, sceneToRoom, goalCandidates, summarizeScene, interpretation, canPlay, checkVerdict, thingsOf, thingAt, moveThing, deleteThing, undoStack, saveRoom, defaultName, ledLog, ledAvailable } from './leditor_logic.js';
import { sceneToLevel } from './scene2level_core.js';
import { listRooms, loadRoom, validateRoom, ROOMS, removeRoom } from './rooms_logic.js';
import { LEDITOR_TEXT, ltx, lerr, lverdict } from './leditor_text.js';
import { handleTolk } from './leveleditor_logic.js';
import { validateScene } from './tools/validate_scene.mjs';
import { promptText } from './tools/make_prompt.mjs';

const bad = JSON.parse(fs.readFileSync('scenes/bad.scene.json', 'utf8'));
const mem = () => { const m = {}; return { get: (k, d) => (k in m && m[k] !== null ? m[k] : d), set: (k, v) => { m[k] = v === undefined ? null : JSON.parse(JSON.stringify(v)); }, m }; };
const img = () => ({ media_type: 'image/jpeg', data: 'A'.repeat(400) });

// bilder
assert.ok(!photoCountOk(1) && photoCountOk(2) && photoCountOk(4) && !photoCountOk(5));
assert.deepEqual(fitDim(4032, 3024), { w: 1280, h: 960, scaled: true }); assert.deepEqual(fitDim(800, 600), { w: 800, h: 600, scaled: false }); assert.deepEqual(fitDim(3024, 4032), { w: 960, h: 1280, scaled: true });
assert.deepEqual(splitDataUrl('data:image/jpeg;base64,QUJD'), { media_type: 'image/jpeg', data: 'QUJD' }); assert.equal(splitDataUrl('data:text/html;base64,QUJD'), null); assert.equal(splitDataUrl('x'), null);
assert.ok(imageFits({ data: 'A'.repeat(LE.maxImageB64) }) && !imageFits({ data: 'A'.repeat(LE.maxImageB64 + 1) }) && !imageFits(null));
assert.equal(lowerQuality(0.8), 0.65); assert.equal(lowerQuality(0.5), null);

// kall: stub for tjenesten (ekte handleTolk med stub-Claude), så vi beviser hele veien bilder → svar → brett
const stubService = async (url, init) => {
  const body = JSON.parse(init.body);
  const deps = { system: promptText(), schema: JSON.parse(fs.readFileSync('docs/scene.schema.json', 'utf8')), validate: validateScene, check: () => ({ ran: false }),
    reserve: async () => ({ ok: true, id: 'u1', left_month: 150, left_code: 9 }), finish: async () => {},
    callClaude: async () => ({ content: [{ type: 'tool_use', name: 'lever_scene', input: bad }], usage: { input_tokens: 4000, output_tokens: 2500 } }) };
  const out = await handleTolk(body, deps);
  return { ok: out.status === 200, status: out.status, json: async () => out.body };
};
assert.equal(toleUrl({ url: 'https://x.supabase.co' }), 'https://x.supabase.co/functions/v1/tolk-bilder');
const b = buildBody(' Rune ', [img(), img()], { goal: 'out', difficulty: 'zzz', theme: 'jungel', foes: false });
assert.equal(b.code, 'rune'); assert.equal(b.answers.difficulty, 'medium'); assert.equal(b.answers.goal, 'out'); assert.equal(b.images.length, 2);
let seenReq = null;
const ok = await callTolk({ code: 'Rune', images: [img(), img()], answers: { goal: 'top' } }, { fetchFn: async (u, i) => { seenReq = { u, i }; return stubService(u, i); } });
assert.equal(ok.ok, true); assert.ok(ok.scene.objects.length > 50); assert.ok(ok.usage.cost_usd > 0); assert.equal(ok.left.code, 9);
assert.match(seenReq.u, /\/functions\/v1\/tolk-bilder$/); assert.ok(seenReq.i.headers.apikey && /^Bearer /.test(seenReq.i.headers.Authorization));
assert.equal((await callTolk({ code: 'x', images: [img(), img()] }, { fetchFn: stubService })).reason, 'kode_mangler');
assert.equal((await callTolk({ code: 'Rune', images: [img()] }, { fetchFn: stubService })).reason, 'bilder_mangler');
assert.equal((await callTolk({ code: 'Rune', images: [img(), img()] }, { fetchFn: async () => { throw new Error('offline'); } })).reason, 'nett');
for (const r of ['av', 'tak', 'kvote', 'kode']) assert.equal((await callTolk({ code: 'Rune', images: [img(), img()] }, { fetchFn: async () => ({ ok: false, status: REASONS[r].status, json: async () => ({ ok: false, reason: r }) }) })).reason, r);
assert.equal((await callTolk({ code: 'Rune', images: [img(), img()] }, { fetchFn: async () => ({ ok: false, status: 403, json: async () => { throw new Error('x'); } }) })).reason, 'kode');
{ const u = await callTolk({ code: 'Rune', images: [img(), img()] }, { fetchFn: async () => ({ ok: true, status: 200, json: async () => { throw new Error('avbrutt'); } }) });
  assert.equal(u.ok, false); assert.equal(u.reason, 'nett', 'svar 200 som ikke kan leses = nettfeil'); assert.equal(u.unreadable, true); assert.equal(u.status, 200); assert.ok(u.ms >= 0);
  assert.equal((await callTolk({ code: 'Rune', images: [img(), img()] }, { fetchFn: async () => ({ ok: false, status: 500, json: async () => { throw new Error('x'); } }) })).unreadable, false, 'feilsvar uten json er ikke «kunne ikke leses»'); }
assert.equal((await callTolk({ code: 'Rune', images: [img(), img()] }, { fetchFn: async () => ({ ok: true, status: 200, json: async () => ({ ok: true }) }) })).reason, 'feil');   // svar uten scene er ikke lov

// scene → brett (omregningen i telefonen = verktøyet i node)
const room = sceneToRoom(ok.scene, 'Badet mitt');
assert.equal(room.ok, true); assert.equal(room.solvable, true); assert.equal(room.tooMany, false); assert.ok(canPlay(room)); assert.equal(checkVerdict(room), room.helperCount ? 'hjelp' : 'ok');
assert.equal(room.level.name, 'Badet mitt'); assert.equal(validateRoom(room.level).ok, true); assert.ok(JSON.stringify(room.level).length < 150000);
const core = sceneToLevel(bad); const cli = JSON.parse(fs.readFileSync('levels/bad.level.json', 'utf8'));
assert.deepEqual(JSON.parse(JSON.stringify(core.level.boxes)), cli.boxes, 'scene2level_core gir de samme boksene som levels/bad.level.json'); assert.deepEqual(core.level.start, cli.start); assert.deepEqual(core.level.goal, cli.goal);
{ const noGoal = { ...bad, goal: { ...bad.goal, y: 9999 } };
  assert.equal(sceneToRoom(noGoal, undefined, { auto: false }).reason, 'maal', 'uten auto-mål gir et umulig mål feilen maal');
  const fixed = sceneToRoom(noGoal); assert.equal(fixed.ok, true, 'auto-mål: spillet velger selv et sted for målet'); assert.ok(fixed.autoGoal && fixed.scene && fixed.scene.goal.on === fixed.autoGoal);
  assert.ok(fixed.scene.goal.y < 9999 && sceneToRoom(fixed.scene).ok, 'det nye målet gir et gyldig brett'); assert.equal(fixed.solvable, true, 'auto-målet velges så brettet kan vinnes når det går');
  const flat = { ...bad, objects: bad.objects.map((o) => ({ ...o, box: [o.box[0], o.box[1], 0, 1, o.box[4], o.box[5]] })), hazards: [], gates: undefined, goals: undefined, goal: { ...bad.goal, y: 9999 } };
  const pedestal = sceneToRoom(flat); assert.equal(pedestal.ok, true, 'ingen flate å stå på: spillet setter inn en sokkel og legger målet der'); assert.ok(pedestal.scene.objects.some((o) => o.id === pedestal.autoGoal) || pedestal.autoGoal, 'målet er satt'); assert.ok(pedestal.scene.goal.on); }
assert.equal(sceneToRoom({}).ok, false);
// R162: målforslag, oppsummering til feillogg og VIS TOLKNING
{ const cands = goalCandidates(bad, 4); assert.ok(cands.length >= 2, 'minst to målforslag'); assert.equal(new Set(cands.map((c) => c.id)).size, cands.length, 'ulike flater');
  for (const c of cands) { assert.equal(c.scene.goal.on, c.id); assert.equal(sceneToRoom(c.scene, undefined, { auto: false }).ok, true, 'hvert forslag gir et gyldig brett'); }
  const sm = summarizeScene(bad); assert.ok(/ting/.test(sm) && /mål/.test(sm) && sm.length < 1000 && !/data:|base64/.test(sm), 'oppsummeringen er kort og uten bilder');
  const I = interpretation(bad, sceneToRoom(bad)); assert.ok(I.things.length > 5 && I.things.every((t) => Number.isFinite(t.h) && typeof t.label === 'string')); assert.ok(I.things[0].h >= I.things[I.things.length - 1].h, 'høyeste først');
  const broken = sceneToRoom({ ...bad, objects: bad.objects.slice(0, 1), goal: { ...bad.goal, y: 9999 } }, undefined, { auto: false }); assert.equal(broken.ok, false); assert.ok(typeof broken.detail === 'string');
  const failAfter = sceneToRoom({ ...bad, goal: { ...bad.goal, y: 9999 } }); assert.equal(failAfter.ok, true); }
// R163: lysning av mørke bilder
{ const px = (v, n = 400) => { const d = new Uint8ClampedArray(n * 4); for (let i = 0; i < n; i++) { d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255; } return d; };
  assert.ok(Math.abs(meanLuma(px(100)) - 100) < 0.5, 'snitt av en jevn flate'); assert.equal(gammaFor(150), 1, 'lyst nok: ikke rør'); assert.equal(gammaFor(3), 1, 'nesten svart: ikke rør (ingenting å hente)');
  assert.ok(gammaFor(60) < 1 && gammaFor(60) >= LED.brightGammaMin, 'mørkt: lysere'); assert.ok(gammaFor(30) === LED.brightGammaMin, 'veldig mørkt: aldri under grensen'); assert.ok(gammaFor(40) <= gammaFor(80), 'mørkere gir sterkere lysning');
  const lut = gammaLut(0.6); assert.equal(lut[0], 0); assert.equal(lut[255], 255); assert.ok(lut[60] > 60, 'midtonene lysnes');
  const dark = px(50), r = brightenData(dark); assert.ok(r.gamma < 1 && r.after > r.mean && r.after <= 140, 'mørkt bilde lysnes mot målet'); assert.equal(dark[3], 255, 'alfa urørt');
  const bright = px(160), r2 = brightenData(bright); assert.equal(r2.gamma, 1); assert.equal(bright[0], 160, 'lyst bilde endres ikke'); }
// R164: jobb-flyten i telefonen: start → spør til ferdig, nettfeil underveis, gjenoppta uten nye bilder
{ const U = '11111111-2222-4333-8444-555555555555', imgs = [img(), img()], calls = [];
  const mk = (script) => async (u, i) => { const b = JSON.parse(i.body); calls.push(b.job ? 'poll' : 'start'); return script(b); };
  const R = (status, body) => ({ ok: status < 300, status, json: async () => body });
  let n = 0; const seen = [];
  const a = await callTolk({ code: 'Rune', images: imgs }, { pollMs: 1, onJob: (id) => seen.push(id), fetchFn: mk((b) => b.job ? (++n < 3 ? R(200, { ok: true, pending: true }) : R(200, { ok: true, scene: bad, usage: { cost_usd: 0.07, ms: 40000 } })) : R(202, { ok: true, job: U })) });
  assert.equal(a.ok, true); assert.equal(a.scene.objects.length, bad.objects.length); assert.deepEqual(seen, [U]); assert.deepEqual(calls.slice(0, 2), ['start', 'poll'], 'først start, så spørring');
  // nettet faller ut under spørringen: spør videre, ingen tapt svar
  calls.length = 0; n = 0; const b2 = await callTolk({ code: 'Rune', images: imgs }, { pollMs: 1, fetchFn: mk((b) => { if (!b.job) return R(202, { ok: true, job: U }); n++; if (n <= 2) throw new Error('offline'); return R(200, { ok: true, scene: bad }); }) });
  assert.equal(b2.ok, true, 'nettfeil under spørringen taper ikke svaret'); assert.equal(calls.filter((c) => c === 'poll').length, 3);
  // tidsavbrudd: gir job så den kan hentes igjen; gjenoppta sender ikke bildene
  const t = await callTolk({ code: 'Rune', images: imgs }, { pollMs: 1, timeoutMs: 30, fetchFn: mk((b) => b.job ? R(200, { ok: true, pending: true }) : R(202, { ok: true, job: U })) });
  assert.equal(t.ok, false); assert.equal(t.reason, 'nett'); assert.equal(t.job, U);
  calls.length = 0; let sentImages = false; const r = await callTolk({ code: 'Rune', images: [] }, { job: t.job, pollMs: 1, fetchFn: async (u, i) => { const b = JSON.parse(i.body); if (b.images) sentImages = true; calls.push(b.job ? 'poll' : 'start'); return R(200, { ok: true, scene: bad }); } });
  assert.equal(r.ok, true); assert.equal(sentImages, false, 'gjenopptak sender ikke bildene på nytt'); assert.deepEqual(calls, ['poll']);
  // ferdig med feil, og ukjent jobb
  const f = await callTolk({ code: 'Rune', images: imgs }, { pollMs: 1, fetchFn: mk((b) => b.job ? R(200, { ok: false, reason: 'kvote' }) : R(202, { ok: true, job: U })) }); assert.equal(f.reason, 'kvote'); assert.equal(f.job, '');
  const g = await callTolk({ code: 'Rune', images: imgs }, { job: U, pollMs: 1, fetchFn: mk(() => R(404, { ok: false, reason: 'finnes_ikke' })) }); assert.equal(g.reason, 'finnes_ikke'); assert.equal(g.job, '');
  // avbrutt av spilleren mens vi venter
  const ac = new AbortController(); setTimeout(() => ac.abort(), 20); const av = await callTolk({ code: 'Rune', images: imgs }, { pollMs: 5, signal: ac.signal, fetchFn: mk((b) => b.job ? R(200, { ok: true, pending: true }) : R(202, { ok: true, job: U })) }); assert.equal(av.reason, 'avbrutt'); assert.equal(av.job, U); }
// R165: auto-målet velger et møbel, ikke dør, liste eller småting
{ const W = bad.room.width, D = bad.room.depth, extra = [
    { id: 'test_dor', kind: 'door', material: 'wood', color: '#ffffff', box: [W - 100, W - 20, 0, 200, D - 100, D - 20] },
    { id: 'test_taklist', kind: 'taklist', material: 'wood', color: '#c9a36b', box: [0, W, 220, 232, 0, 10] },
    { id: 'test_benk', kind: 'chest', material: 'wood', color: '#c9a36b', box: [20, 120, 0, 60, D - 90, D - 20] }];
  const sc = { ...bad, objects: [...bad.objects, ...extra], goal: { ...bad.goal, y: 9999 } }; delete sc.goal.on;
  const r = sceneToRoom(sc); assert.equal(r.ok, true); assert.ok(!['test_dor', 'test_taklist'].includes(r.autoGoal), `auto-målet er ikke en dør eller liste (${r.autoGoal})`);
  for (const c of goalCandidates(sc, 4)) assert.ok(!['test_dor', 'test_taklist'].includes(c.id), 'målforslag er ikke dør eller liste'); }
// R166: en tolkning fra bilder har ikke `rev`; den skal likevel bli et gyldig brett (slik oppsto «Forslaget ble ikke et riktig brett»)
{ const ai = JSON.parse(JSON.stringify({ name: 'Stuen', units: 'cm', room: { width: 400, depth: 350, height: 240, floor: { material: 'plastic', color: '#d8c8b0' }, walls: { material: 'plaster', color: '#a8b8d0' }, ceiling: { material: 'plaster', color: '#f0f0f0' } },
    start: { x: 350, z: 10 }, goal: { x: 30, y: 180, z: 170, on: 'shelf_tall' },
    objects: [{ id: 'sofa', kind: 'sofa', material: 'fabric', color: '#334455', box: [180, 400, 0, 45, 180, 330] }, { id: 'skrivebord', kind: 'table', material: 'wood', color: '#d2b48c', box: [20, 120, 0, 75, 20, 70] }, { id: 'shelf_tall', kind: 'shelf', material: 'wood', color: '#c9a36b', box: [10, 50, 0, 180, 150, 190] }] }));
  assert.ok(!('rev' in ai), 'tolkningen har ikke rev'); const r = sceneToRoom(ai); assert.equal(r.ok, true, `tolkning uten rev gir et brett (${r.reason} ${r.detail || ''})`); assert.equal(r.level.rev, 1);
  const bad2 = sceneToRoom({ ...ai, goal: { ...ai.goal, y: 9999 } }); assert.equal(bad2.ok, true, 'auto-mål virker også uten rev'); }
// R167: editoren tilgjengelig igjen etter spilling: tolkningen lagres lokalt med brettet (aldri bilder), siste brett og JUSTER
{ const st = mem(), sc = JSON.parse(JSON.stringify(bad)), room = sceneToRoom(sc, 'Stuen');
  const sv = saveRoom(st, { name: 'Stuen', level: room.level }); assert.equal(sv.ok, true);
  assert.equal(saveRoomScene(st, sv.id, sc), true, 'tolkningen lagres'); assert.equal(loadRoomScene(st, sv.id).objects.length, sc.objects.length);
  assert.equal(lastRoom(st), null, 'ingen siste brett før det er satt'); setLastRoom(st, sv.id); assert.deepEqual(lastRoom(st), { id: sv.id, name: 'Stuen' });
  assert.ok(!JSON.stringify(st.m[ROOMS.dataKey(sv.id)]).includes('"objects"'), 'selve brettet (det som deles) har ikke tolkningen');
  assert.equal(saveRoomScene(st, 'ikke-id', sc), false); assert.equal(saveRoomScene(st, sv.id, { room: {}, objects: 'x' }), false);
  assert.equal(saveRoomScene(st, sv.id, { ...sc, huge: 'x'.repeat(ROOMS.sceneMaxBytes) }), false, 'for stor tolkning lagres ikke');
  assert.equal(removeRoom(st, sv.id), true); assert.equal(loadRoomScene(st, sv.id), null, 'slettet brett fjerner også tolkningen'); assert.equal(lastRoom(st), null, 'slettet brett er ikke lenger siste'); }
// R172: lettere å flytte i JUSTER: flere ting, tall, stegstørrelse
{ const th = thingsOf(bad), a = th.find((t) => t.key !== 'o:' + bad.goal.on && t.rect.x1 - t.rect.x0 < 80), b = th.find((t) => t !== a && t.key !== 'o:' + bad.goal.on && t.rect.x1 - t.rect.x0 < 80);
  const info = thingInfo(bad, a.key); assert.equal(info.x, Math.round(a.rect.x0)); assert.equal(info.w, Math.round(a.rect.x1 - a.rect.x0)); assert.equal(thingInfo(bad, 'finnes-ikke'), null);
  // flere ting flyttes like mye og beholder avstanden
  const ia = thingInfo(bad, a.key), ib = thingInfo(bad, b.key), m = moveThings(bad, [a.key, b.key], 4, 0);
  if (m) { const ja = thingInfo(m, a.key), jb = thingInfo(m, b.key); assert.equal(ja.x - ia.x, jb.x - ib.x, 'begge flyttes like mye'); assert.equal(ja.z, ia.z); }
  // grensene gjelder alle: flyttingen stoppes når den første når veggen
  const far = moveThings(bad, [a.key, b.key], 100000, 0); if (far) { const ja = thingInfo(far, a.key), jb = thingInfo(far, b.key); assert.equal(ja.x - ia.x, jb.x - ib.x, 'avstanden holdes ved veggen'); assert.ok(ja.x + ja.w <= bad.room.width + 1 && jb.x + jb.w <= bad.room.width + 1, 'inne i rommet'); }
  assert.equal(moveThings(bad, [], 5, 5), null); assert.equal(moveThings(bad, ['x'], 5, 5), null); assert.equal(bad.objects.length > 0 && thingInfo(bad, a.key).x, ia.x, 'originalen røres ikke');
  // flytt til tall
  const to = moveThingTo(bad, a.key, ia.x + 12, ia.z); if (to) assert.equal(thingInfo(to, a.key).x, ia.x + 12, 'flyttet til oppgitt X'); assert.equal(moveThingTo(bad, a.key, 'abc', 5), null); assert.equal(moveThingTo(bad, a.key, ia.x, ia.z), null, 'ingen endring: null');
  // slett flere; målets ting kan ikke slettes
  const del = deleteThings(bad, [a.key, b.key]); assert.ok(del && !thingsOf(del).some((t) => t.key === a.key || t.key === b.key), 'begge slettet'); assert.equal(deleteThings(bad, [a.key, 'o:' + bad.goal.on]), null, 'målet kan ikke slettes: ingenting skjer'); assert.equal(deleteThings(bad, []), null);
  // stegstørrelse huskes, ugyldig ignoreres
  const st2 = mem(); assert.equal(stepNow(st2), LED.step); setStep(st2, 25); assert.equal(stepNow(st2), 25); setStep(st2, 7); assert.equal(stepNow(st2), 25, 'ugyldig steg ignoreres'); assert.deepEqual(STEPS, [5, 10, 25, 50]); }
assert.equal(checkVerdict({ ok: true, solvable: false }), 'novei'); assert.equal(checkVerdict({ ok: true, solvable: true, tooMany: true }), 'mange'); assert.equal(checkVerdict({ ok: false }), 'bad');
assert.equal(defaultName(bad), 'Bad'); assert.equal(defaultName({ name: 'fuck' }), 'Mitt brett'); assert.equal(defaultName(null), 'Mitt brett');

// juster: flytt, slett, angre
const th = thingsOf(bad); assert.ok(th.length > 50 && th.every((t) => t.ids.length && t.rect.x1 >= t.rect.x0));
assert.equal(th.find((t) => t.key === 'g:do').ids.length, 6, 'do-delene flyttes og slettes sammen');
const at = thingAt(th, (th[0].rect.x0 + th[0].rect.x1) / 2, (th[0].rect.z0 + th[0].rect.z1) / 2); assert.ok(at); assert.equal(thingAt(th, -50, -50), null);
const key = th.find((t) => t.key === 'o:vaskekurv').key, before = th.find((t) => t.key === key).rect.x0;
const mv = moveThing(bad, key, LED.step, 0); assert.equal(thingsOf(mv).find((t) => t.key === key).rect.x0, before + LED.step); assert.equal(thingsOf(bad).find((t) => t.key === key).rect.x0, before, 'originalen er urørt');
assert.equal(moveThing(bad, key, -99999, 0).objects.find((o) => o.id === 'vaskekurv').box[0] >= 0, true, 'holdes inne i rommet');
assert.equal(moveThing(bad, 'o:finnesikke', 10, 0), null);
assert.equal(deleteThing(bad, 'o:' + bad.goal.on), null, 'tingen med målet kan ikke slettes');
const gone = deleteThing(bad, key); assert.ok(!gone.objects.some((o) => o.id === 'vaskekurv')); assert.equal(sceneToRoom(gone).ok, true);
const goalMove = moveThing(bad, 'o:' + bad.goal.on, 0, 10); assert.equal(goalMove.goal.z, bad.goal.z + 10); assert.equal(sceneToRoom(goalMove).ok, true, 'målet følger tingen');
assert.equal(sceneToRoom(moveThing(bad, 'o:' + bad.goal.on, 10, 0), undefined, { auto: false }).ok, false, 'en flytting som ødelegger brettet gir ok:false (visningen angrer den)');
const u = undoStack(2); u.push(1); u.push(2); u.push(3); assert.equal(u.size, 2); assert.equal(u.pop(), 3); assert.equal(u.pop(), 2); assert.equal(u.pop(), null);
// mange rettinger på rad: hver gir et gyldig brett eller blir angret (aldri et ødelagt brett)
{ let s = bad; for (let i = 0; i < 12; i++) { const t = thingsOf(s)[(i * 7) % thingsOf(s).length]; const n = i % 3 === 2 ? deleteThing(s, t.key) : moveThing(s, t.key, 10 * ((i % 2) * 2 - 1), 10); if (!n) continue; const r = sceneToRoom(n); if (r.ok) s = n; } assert.ok(sceneToRoom(s).ok); }

// lagring i MINE BRETT (R153): nytt, så oppdatert
const st = mem(), s1 = saveRoom(st, { name: 'Badet mitt', level: room.level, rnd: () => 0.3 }); assert.equal(s1.ok, true);
assert.equal(listRooms(st).length, 1); assert.equal(listRooms(st)[0].name, 'Badet mitt'); assert.ok(loadRoom(st, s1.id));
const s2 = saveRoom(st, { id: s1.id, name: 'Badet 2', level: sceneToRoom(gone).level }); assert.equal(s2.again, true); assert.equal(listRooms(st).length, 1); assert.equal(loadRoom(st, s1.id).name, 'Badet 2');
assert.equal(saveRoom(st, { name: 'x', level: { boxes: [] } }).ok, false);
// ingen bilder i lagringen
assert.ok(!JSON.stringify(st.m).includes('AAAA'));

// logg og tilgang
const lg = ledLog({ what: 'lagret', cost: 0.0456, ms: 31200, edits: 3, bot: 'vei' }); assert.match(lg, /kostnad 0\.0456 USD, tid 31200 ms, rettinger 3, boten fant en vei/); assert.doesNotMatch(lg, /rune/i);
assert.ok(ledAvailable({ on: true, code: 'rune' }) && !ledAvailable({ on: false, code: 'rune' }) && !ledAvailable({ on: true, code: '' }) && !ledAvailable({ on: true, code: 'rune', cinema: true }));

// tekster: nb og en har samme nøkler, alle tjenestefeil har tekst, ingen taster nevnes
const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' && !Array.isArray(v) ? flat(v, p + k + '.') : [p + k]));
assert.deepEqual(flat(LEDITOR_TEXT.en).sort(), flat(LEDITOR_TEXT.nb).sort(), 'nb og en har samme nøkler');
for (const r of [...Object.keys(REASONS), 'kode_mangler', 'bilder_mangler', 'avbrutt', 'maal', 'scene', 'form', 'stor', 'fullt']) for (const l of ['nb', 'en']) assert.ok(lerr(l, r) && lerr(l, r) !== lerr(l, 'zzz_ukjent') || r === 'feil', `${l} ${r}`);
for (const l of ['nb', 'en']) { const all = JSON.stringify(LEDITOR_TEXT[l]); assert.doesNotMatch(all, /\b(trykk|press) (på )?(mellomrom|space|enter|[wasd])\b/i); assert.ok(lverdict(l, 'hjelp', 2) && lverdict(l, 'novei')); }
assert.match(ltx('nb', 'consent'), /slettes/); assert.match(ltx('nb', 'consent'), /Ingen bilder lagres/); assert.equal(ltx('nb', 'working').length, 3);

// innhekting: moduler i files, valg i SETTINGS (test), hekter i main.js, logEv
const idx = fs.readFileSync('index.html', 'utf8'), mainJs = fs.readFileSync('main.js', 'utf8');
for (const f of ['scene2level_core', 'leditor_logic', 'leditor_text', 'leditor_view']) assert.ok(idx.includes(`'${f}'`), `${f} i files i index.html`);
assert.match(mainJs, /fl\('ledon', 'test'/); assert.match(mainJs, /mLed: \(\) =>/); assert.match(mainJs, /ledAvailable/);
const view = fs.readFileSync('leditor_view.js', 'utf8'); assert.match(view, /logEv\?\.\('leveleditor'/); assert.match(view, /capture="environment"/); assert.match(view, /S\.photos\.length = 0/);
assert.doesNotMatch(view, /localStorage\.setItem\([^)]*(data|url)/, 'bilder lagres aldri');
console.log('test_leditor: ok');
