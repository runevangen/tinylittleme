// node test_leditor.mjs (R152): «Lag brett fra bilder» i spillet (leditor_logic.js, leditor_text.js, scene2level_core.js). Ingen nett: tjenesten byttes ut med stub.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { LE, REASONS } from './leveleditor_logic.js';
import { LED, photoCountOk, fitDim, splitDataUrl, imageFits, lowerQuality, toleUrl, buildBody, callTolk, sceneToRoom, canPlay, checkVerdict, thingsOf, thingAt, moveThing, deleteThing, undoStack, saveRoom, defaultName, ledLog, ledAvailable } from './leditor_logic.js';
import { sceneToLevel } from './scene2level_core.js';
import { listRooms, loadRoom, validateRoom } from './rooms_logic.js';
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
  assert.equal(sceneToRoom({ ...noGoal, objects: [] }).ok, false, 'ingen flater å velge: fortsatt feil'); }
assert.equal(sceneToRoom({}).ok, false);
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
