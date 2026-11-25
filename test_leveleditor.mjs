// node test_leveleditor.mjs (R151): tjenesten for bildetolkning, med stub i stedet for Claude (ingen nett, ingen nøkkel).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { LE, REASONS, validateRequest, normAnswers, buildClaudeRequest, parseClaudeResponse, costOf, scrubScene, handleTolk, userText, normalizeScene, normOpts, buildAnalysisRequest, buildCritiqueRequest, textOf, priceOf, PRICES, normMeasures, parseMeasure, fitToMeasures, startTolk, pollTolk, handleJobRequest, JOB } from './leveleditor_logic.js';
import { validateScene } from './tools/validate_scene.mjs';
import { promptText } from './tools/make_prompt.mjs';
import { checkScene } from './tools/scene_pipeline.mjs';
import { sharedFiles } from './tools/sync_edge.mjs';
import { KINDS } from './kinds.js';

const bad = JSON.parse(fs.readFileSync('scenes/bad.scene.json', 'utf8'));
const img = () => ({ media_type: 'image/jpeg', data: 'A'.repeat(400) });
const req = (o = {}) => ({ code: 'Rune', images: [img(), img()], answers: { goal: 'out', difficulty: 'easy', theme: 'jungel', foes: false }, ...o });
const schema = JSON.parse(fs.readFileSync('docs/scene.schema.json', 'utf8'));
const stubClaude = (scene = bad) => async () => ({ content: [{ type: 'tool_use', name: 'lever_scene', input: scene }], usage: { input_tokens: 5000, output_tokens: 3000 } });
const mkDeps = (over = {}) => {
  const log = { reserve: [], finish: [], claude: 0 };
  return { log, system: promptText(), schema, validate: validateScene, check: () => ({ ran: false }),
    reserve: async (c, n) => { log.reserve.push([c, n]); return { ok: true, id: 'u1', left_month: 199, left_code: 14 }; },
    finish: async (f) => { log.finish.push(f); },
    callClaude: async (b) => { log.claude++; log.body = b; return stubClaude()(b); }, ...over };
};

// utendørs ting og instruks
for (const k of ['stone', 'grass', 'bench', 'stairs', 'hedge', 'table', 'playground', 'gravel', 'water', 'curb']) assert.ok(KINDS[k], `kinds.js mangler ${k}`);
const P = promptText();
assert.match(P, /2–4 vanlige mobilbilder/); assert.match(P, /utendørs/i); assert.match(P, /Personer, ansikter/);
// forespørsel
assert.equal(validateRequest(req()).ok, true);
assert.equal(validateRequest(req()).code, 'rune');
assert.equal(validateRequest(req({ images: [img()] })).reason, 'bilder');
assert.equal(validateRequest(req({ images: [img(), img(), img(), img(), img()] })).reason, 'bilder');
assert.equal(validateRequest(req({ code: 'x' })).reason, 'kode');
assert.equal(validateRequest(req({ images: [img(), { media_type: 'image/gif', data: 'A'.repeat(400) }] })).reason, 'bilder');
assert.equal(validateRequest(req({ images: [img(), { media_type: 'image/png', data: 'A'.repeat(LE.maxImageB64 + 1) }] })).reason, 'for_stor');
assert.deepEqual(normAnswers({ goal: 'x', difficulty: 'hard', theme: '<b>hei</b>\n`x`' }), { goal: 'top', difficulty: 'hard', theme: 'b hei /b x', foes: true, outdoor: false, measures: null });
// Claude-kallet: bilder + strukturert utdata, ingen $schema i input_schema
const cb = buildClaudeRequest({ system: P, images: validateRequest(req()).images, answers: req().answers, schema });
assert.equal(cb.messages[0].content.filter((c) => c.type === 'image').length, 2);
assert.deepEqual(cb.tool_choice, { type: 'tool', name: 'lever_scene' }); assert.equal(cb.tools[0].input_schema.$schema, undefined); assert.equal(cb.tools[0].input_schema.type, 'object');
assert.match(userText({ foes: false }, 2), /Ingen fiender/);
assert.equal(parseClaudeResponse({ content: [{ type: 'text', text: 'hei' }] }).reason, 'tolkning');
assert.equal(costOf({ in: 5000, out: 3000 }), 0.06);
// personvern: personer og dyr fjernes
{ const s = JSON.parse(JSON.stringify(bad)); s.objects.push({ ...s.objects[0], id: 'person_1', kind: 'person' }, { ...s.objects[0], id: 'katt', kind: 'cat' });
  const r = scrubScene(s); assert.equal(r.removed, 2); assert.ok(!r.scene.objects.some((o) => /person|katt/.test(o.id))); }
// hele kjeden med stub: scene tilbake, kostnad og tid logget, ingen bilder i loggen
{ const d = mkDeps(), body = req(), out = await handleTolk(body, d);
  assert.equal(out.status, 200); assert.equal(out.body.ok, true); assert.deepEqual(validateScene(out.body.scene).errors, []);
  assert.equal(d.log.reserve[0][0], 'rune'); assert.equal(d.log.reserve[0][1], 2); assert.equal(d.log.claude, 1);
  assert.equal(d.log.finish[0].ok, true); assert.equal(d.log.finish[0].cost, 0.06); assert.equal(d.log.finish[0].bot, 'ikke_kjort');
  assert.ok(!JSON.stringify(d.log.finish).includes('AAAA'), 'logg skal ikke ha bilder'); assert.equal(body.images, null, 'bildene slippes etter kallet');
  assert.ok(!JSON.stringify(out.body).includes('AAAA')); }
// kvote, tak, av, ugyldig kode: Claude kalles ikke
for (const [reason, status] of [['kvote', 429], ['tak', 429], ['av', 503], ['kode', 403]]) {
  const d = mkDeps({ reserve: async () => ({ ok: false, reason }) }), out = await handleTolk(req(), d);
  assert.equal(out.status, status); assert.equal(out.body.reason, reason); assert.equal(d.log.claude, 0); assert.ok(out.body.message);
}
{ const d = mkDeps(), out = await handleTolk(req({ images: [img()] }), d); assert.equal(out.status, 400); assert.equal(d.log.reserve.length, 0, 'ugyldig kall bruker ikke kvote'); }
// feil hos Claude / ugyldig scene frigir kvoten (status feil) og gir tydelig melding
{ const d = mkDeps({ callClaude: async () => { throw new Error('x'); } }), out = await handleTolk(req(), d);
  assert.equal(out.body.reason, 'nett'); assert.equal(d.log.finish[0].ok, false); }
{ const d = mkDeps({ callClaude: stubClaude({ ...bad, units: 'm' }) }), out = await handleTolk(req(), d);
  assert.equal(out.body.reason, 'tolkning'); assert.ok(out.body.errors.length); assert.equal(d.log.finish[0].ok, false); }
// kopiene i supabase/functions/_shared er à jour og edge-funksjonen bruker ikke annet enn dem
for (const [n, t] of Object.entries(sharedFiles())) assert.equal(fs.readFileSync(`supabase/functions/_shared/${n}`, 'utf8'), t, `${n}: kjør node tools/sync_edge.mjs`);
const edge = fs.readFileSync('supabase/functions/tolk-bilder/index.ts', 'utf8');
assert.ok(edge.includes('tinylittleme_Claude_API_KEY') && !/sk-ant-/.test(edge + fs.readFileSync('leveleditor_logic.js', 'utf8')), 'nøkkelen leses bare fra miljøet');
for (const f of fs.readdirSync('.').filter((n) => /\.(js|html)$/.test(n))) assert.ok(!fs.readFileSync(f, 'utf8').includes('tinylittleme_Claude_API_KEY'), `${f}: nøkkelnavnet skal ikke ligge i spillkoden`);
// migrasjonen: RLS på, ingen tilgang for anon, tak/kvote/av-bryter
const sql = fs.readFileSync(fs.readdirSync('supabase/migrations').filter((n) => n.includes('leveleditor')).map((n) => 'supabase/migrations/' + n)[0], 'utf8');
for (const re of [/tlm_le_settings enable row level security/, /tlm_le_usage enable row level security/, /revoke all on public\.tlm_le_settings, public\.tlm_le_usage from anon, authenticated/, /'monthly_cap', '200'/, /'enabled', 'true'/, /grant execute .* to service_role/, /references public\.tlm_testers/, /advisory_xact_lock/])
  assert.match(sql, re);
assert.ok(!/create policy/i.test(sql) && !/bytea|image|data text/i.test(sql), 'ingen policyer og ingen bildelagring');
// hele rørledningen med eksempelscenen (stub-svaret): scene → brett → bot finner en vei (kan ta noen sekunder)
{ const c = checkScene(bad); assert.equal(c.ran, true); assert.equal(c.solvable, true, `bot: ${c.bot} ${c.why || ''}`); assert.ok(c.helperCount <= 5);
  const d = mkDeps({ check: async (s) => { const r = checkScene(s); return { ran: true, solvable: r.solvable, helpers: r.helperCount, bot: r.bot }; } }), out = await handleTolk(req(), d);
  assert.equal(out.body.check.solvable, true); assert.equal(d.log.finish[0].bot, 'vei'); }
// R164: svar raskt, hent resultatet etterpå (jobb-id, bakgrunnsarbeid, spørring)
{ const jobs = new Map(); let bg = []; const U = '11111111-2222-4333-8444-555555555555';
  const jd = (over = {}) => { const d = mkDeps(); return { tolk: d, createJob: async (c) => { jobs.set(U, { code: c, status: 'kjorer', result: null, born: Date.now() }); return U; },
    finishJob: async (id, r) => { Object.assign(jobs.get(id), { status: 'ferdig', result: r }); },
    getJob: async (id, c) => { const j = jobs.get(id); return j && j.code === c ? { status: j.status, result: j.result, age_ms: Date.now() - j.born } : null; },
    waitUntil: (p) => { bg.push(p); }, ...over, d }; };
  const dd = jd(), start = await handleJobRequest(req(), dd);
  assert.equal(start.status, 202); assert.equal(start.body.ok, true); assert.equal(start.body.job, U, 'svarer straks med jobb-id');
  const mid = await handleJobRequest({ code: 'rune', job: U }, dd); assert.deepEqual(mid.body, { ok: true, pending: true }); assert.equal(mid.status, 200, 'mens jobben går: venter');
  await Promise.all(bg); const done = await handleJobRequest({ code: 'rune', job: U }, dd);
  assert.equal(done.body.ok, true); assert.ok(done.body.scene.objects.length > 50, 'ferdig: scenen hentes etterpå'); assert.ok(!JSON.stringify(jobs.get(U)).includes('AAAA'), 'ingen bilder i jobbraden');
  assert.equal((await handleJobRequest({ code: 'annen', job: U }, dd)).body.reason, 'finnes_ikke', 'en annen kode får ikke hente jobben');
  assert.equal((await handleJobRequest({ code: 'rune', job: 'ikke-en-uuid' }, dd)).body.reason, 'finnes_ikke');
  assert.equal((await handleJobRequest({ code: 'x', job: U }, dd)).body.reason, 'kode');
  assert.equal((await handleJobRequest(req({ images: [img()] }), jd())).body.reason, 'bilder', 'ugyldig start avvises straks, uten jobb');
  // kvote hos tjenesten kommer som ferdig-med-feil når du spør
  jobs.clear(); bg = []; const dq = jd(); dq.tolk.reserve = async () => ({ ok: false, reason: 'kvote' }); await handleJobRequest(req(), dq); await Promise.all(bg);
  const q = await handleJobRequest({ code: 'rune', job: U }, dq); assert.equal(q.body.ok, false); assert.equal(q.body.reason, 'kvote');
  // jobb som aldri ble ferdig (tjenesten døde): feil, ikke evig venting
  jobs.clear(); bg = []; const ds = jd({ waitUntil: () => {} }); await handleJobRequest(req(), ds); jobs.get(U).born -= JOB.staleMs + 1000;
  assert.equal((await handleJobRequest({ code: 'rune', job: U }, ds)).body.reason, 'feil');
  // krasj i selve tolkningen gir feil i jobben
  jobs.clear(); bg = []; const dk = jd(); dk.tolk.callClaude = async () => { throw new Error('x'); }; dk.tolk.reserve = async () => ({ ok: true, id: 'u9' }); await handleJobRequest(req(), dk); await Promise.all(bg);
  assert.equal((await handleJobRequest({ code: 'rune', job: U }, dk)).body.ok, false); }
// R168: romtall, selvretting og modellbytte
{ assert.deepEqual(normMeasures({ w: '3,5', d: '4.2', h: '240' }), { w: 350, d: 420, h: 240 }); assert.equal(normMeasures({ w: 'abc' }), null); assert.equal(normMeasures(null), null);
  assert.equal(parseMeasure('50', 100, 1500), null, 'for lite'); assert.equal(parseMeasure('99999', 100, 1500), null, 'for stort'); assert.equal(parseMeasure('4', 100, 1500), 400, 'små tall regnes som meter');
  assert.deepEqual(normAnswers({ measures: { w: '3.5' } }).measures, { w: 350, d: null, h: null });
  assert.ok(/bredde 350 cm/.test(userText({ measures: { w: 350, d: null, h: 250 } }, 3)) && /takhøyde 250 cm/.test(userText({ measures: { w: 350, h: 250 } }, 3)), 'romtall står i spørsmålet til modellen');
  assert.ok(!/Spilleren har målt/.test(userText({}, 3)), 'ingen romtall: ingen målelinje');
  // skalering: rommet får de oppgitte målene, og tingene følger med
  const sc = JSON.parse(JSON.stringify(bad)), W = sc.room.width, D = sc.room.depth, o0 = sc.objects[0].box.slice();
  const f = fitToMeasures(sc, { w: W * 2, d: D, h: null }); assert.equal(f.room.width, W * 2); assert.equal(f.room.depth, D); assert.equal(f.objects[0].box[1], Math.round(o0[1] * 2 * 10) / 10); assert.equal(f.objects[0].box[4], o0[4], 'dybden uendret');
  assert.equal(fitToMeasures(sc, { w: W, d: D, h: null }), sc, 'ingen endring når målene stemmer'); assert.equal(sc.room.width, W, 'originalen røres ikke');
  assert.equal(validateScene(f).errors.length, validateScene(sc).errors.length, 'skalert scene er like gyldig');
  // handleTolk bruker romtallene på det modellen svarer
  const dm = mkDeps(); const out = await handleTolk(req({ answers: { measures: { w: W + 100 } } }), dm); assert.equal(out.body.ok, true); assert.equal(out.body.scene.room.width, W + 100, 'romtallet er fasit');
  // modell: standard fra LE, kan overstyres, og fallback hvis den nye modellen avvises
  assert.equal(dm.log.body.model, LE.model); const d2 = mkDeps({ model: 'claude-test-1' }); await handleTolk(req(), d2); assert.equal(d2.log.body.model, 'claude-test-1');
  const seen = []; const d3 = mkDeps({ callClaude: async (b) => { seen.push(b.model); if (b.model === LE.model) throw new Error('claude 404 model not found'); return stubClaude()(b); } });
  const o3 = await handleTolk(req(), d3); assert.equal(o3.body.ok, true); assert.deepEqual(seen, [LE.model, LE.fallbackModel], 'avvist modell: prøver fallback én gang'); assert.equal(o3.body.usage.model, LE.fallbackModel);
  // selvretting: første svar har en feil (ugyldig farge), andre svar er rettet; feilene sendes tilbake, kostnaden teller begge
  const broken = JSON.parse(JSON.stringify(bad)); broken.objects[0].color = 'rød'; let n = 0, second = null;
  const d4 = mkDeps({ callClaude: async (b) => { n++; if (n === 1) return { content: [{ type: 'tool_use', id: 'tu1', name: 'lever_scene', input: broken }], usage: { input_tokens: 5000, output_tokens: 3000 } }; second = b; return stubClaude()(b); } });
  const o4 = await handleTolk(req(), d4); assert.equal(o4.body.ok, true, 'selvretting gir en gyldig scene'); assert.equal(n, 2); assert.equal(o4.body.usage.repaired, 1);
  const last = second.messages[second.messages.length - 1]; assert.equal(last.role, 'user'); assert.equal(last.content[0].type, 'tool_result'); assert.equal(last.content[0].tool_use_id, 'tu1'); assert.ok(/color må være/.test(last.content[0].content), 'feilen står i svaret til modellen');
  assert.ok(o4.body.usage.cost_usd > costOf({ in: 5000, out: 3000 }), 'begge kallene teller i kostnaden');
  // ...men bare ett nytt forsøk: er den fortsatt ugyldig, gis feil (ikke evig løkke)
  let m = 0; const d5 = mkDeps({ callClaude: async () => { m++; return { content: [{ type: 'tool_use', id: 'x', name: 'lever_scene', input: broken }], usage: { input_tokens: 10, output_tokens: 10 } }; } });
  const o5 = await handleTolk(req(), d5); assert.equal(o5.body.ok, false); assert.equal(m, 2, 'maks ett nytt forsøk'); assert.equal(d5.log.finish[0].ok, false); }
// R170: kuttet svar (stop_reason max_tokens) gir ett nytt, KORT kall i stedet for selvretting; fortsatt kuttet gir feil med diagnose (uten innhold)
{ const cut = { content: [{ type: 'tool_use', id: 'c1', name: 'lever_scene', input: { name: 'delvis' } }], stop_reason: 'max_tokens', usage: { input_tokens: 5000, output_tokens: 16000 } };
  let n = 0, last = null; const d6 = mkDeps({ callClaude: async (b) => { n++; last = b; if (n === 1) return cut; return { ...(await stubClaude()(b)), stop_reason: 'tool_use' }; } });
  const o6 = await handleTolk(req(), d6); assert.equal(o6.body.ok, true, 'kort nytt forsøk gir en scene'); assert.equal(n, 2); assert.equal(o6.body.usage.truncated, 1); assert.equal(o6.body.usage.repaired, 0, 'ikke selvretting av en kuttet scene');
  assert.ok(/KORT scene/.test(last.messages[0].content.find((c) => c.type === 'text').text), 'det andre kallet ber om en kort scene'); assert.ok(o6.body.usage.cost_usd > costOf({ in: 5000, out: 16000 }), 'begge kallene teller');
  let m = 0; const d7 = mkDeps({ callClaude: async () => { m++; return cut; } }); const o7 = await handleTolk(req(), d7);
  assert.equal(o7.body.ok, false); assert.equal(m, 2, 'maks ett kort nytt forsøk'); assert.equal(o7.body.diag.stop, 'max_tokens'); assert.equal(o7.body.diag.truncated, 1); assert.ok(!JSON.stringify(o7.body).includes('delvis'), 'diagnosen har ikke innhold fra bildene'); }
// R178: scene uten units/room (eller pakket inn) normaliseres i stedet for å avvises; en komplett scene endres ikke
{ const objs = bad.objects.slice(0, 12);
  const naked = { objects: objs, start: bad.start, goal: bad.goal };   // ingen units, room, name
  const n1 = normalizeScene(naked); assert.equal(n1.units, 'cm'); assert.ok(n1.room.width > 0 && n1.room.depth > 0 && n1.room.height >= 240, 'rommet regnes ut fra tingene'); assert.ok(n1.room.floor.material && n1.room.walls.material && n1.room.ceiling.material, 'standard flater');
  assert.equal(validateScene(normalizeScene({ ...bad, units: undefined, room: undefined })).errors.length, 0, 'uten units og room blir scenen gyldig'); assert.equal(naked.units, undefined, 'originalen røres ikke');
  const wrapped = normalizeScene({ scene: JSON.parse(JSON.stringify(bad)) }); assert.equal(wrapped.units, 'cm'); assert.ok(Array.isArray(wrapped.objects) && wrapped.objects.length === bad.objects.length, 'innpakket scene pakkes ut');
  assert.deepEqual(normalizeScene(bad), JSON.parse(JSON.stringify(bad)), 'en komplett scene endres ikke');
  const noStart = normalizeScene({ ...bad, start: undefined, goal: { x: -5000, y: 0, z: 0 } }); assert.ok(noStart.start.x >= 0 && noStart.start.x <= noStart.room.width, 'start settes inn i rommet'); assert.ok(noStart.goal.x >= 0 && noStart.goal.x <= noStart.room.width, 'mål utenfor rommet settes på en ting');
  assert.equal(normalizeScene({ foo: 1 }).foo, 1, 'uten objects: la kontrollen avvise'); assert.equal(normalizeScene(null).objects, undefined);
  // hele tjenesten: modellen svarer uten units/room, og brettet blir likevel laget (uten selvretting)
  let calls = 0; const d8 = mkDeps({ callClaude: async () => { calls++; return { content: [{ type: 'tool_use', id: 'n', name: 'lever_scene', input: { name: 'x', objects: bad.objects, start: bad.start, goal: bad.goal } }], stop_reason: 'tool_use', usage: { input_tokens: 5000, output_tokens: 3000 } }; } });
  const o8 = await handleTolk(req(), d8); assert.equal(o8.body.ok, true, 'normalisert scene gir et brett'); assert.equal(calls, 1, 'ingen ekstra kall nødvendig'); assert.equal(o8.body.scene.units, 'cm');
  // diagnosen ved en scene som ikke lar seg redde: nøkkelnavn og antall ting, aldri innhold
  const d9 = mkDeps({ callClaude: async () => ({ content: [{ type: 'tool_use', id: 'n', name: 'lever_scene', input: { rom: { b: 1 }, ting: [{ x: 1 }] } }], stop_reason: 'tool_use', usage: { input_tokens: 10, output_tokens: 10 } }) });
  const o9 = await handleTolk(req(), d9); assert.equal(o9.body.ok, false); assert.deepEqual(o9.body.diag.keys, ['rom', 'ting']); assert.equal(o9.body.diag.objects, -1); }
// R179–R181: modellvalg per kall, analyse først, kritikkrunde
{ assert.deepEqual(normOpts({ model: 'claude-opus-5-5', mode: 'tenk' }), { model: 'claude-opus-5-5', mode: 'tenk' }); assert.deepEqual(normOpts({ model: 'gpt-5', mode: 'x' }), { model: '', mode: '' }, 'ukjente verdier ignoreres'); assert.deepEqual(normOpts(null), { model: '', mode: '' });
  assert.equal(priceOf('claude-sonnet-5-5').outPerM, 15); assert.ok(priceOf('claude-opus-5-5').outPerM >= 15 && priceOf('ukjent').outPerM === LE.price.outPerM, 'pris per modell, ukjent gir standard'); for (const m of LE.models) assert.ok(PRICES[m], `${m} har pris`);
  const seenReq = []; const analysisText = 'Analyse: rommet er ca. 400 x 350 cm. '.repeat(20);
  const mk = (over = {}) => mkDeps({ callClaude: async (b) => { seenReq.push(b); if (!b.tools) return { content: [{ type: 'text', text: analysisText }], stop_reason: 'end_turn', usage: { input_tokens: 5000, output_tokens: 1200 } }; return { ...(await stubClaude()(b)), stop_reason: 'tool_use' }; }, ...over });
  // direkte: ett kall
  seenReq.length = 0; const od = await handleTolk(req(), mk()); assert.equal(od.body.ok, true); assert.equal(seenReq.length, 1); assert.deepEqual(od.body.usage.stages, ['scene']); assert.equal(od.body.usage.mode, 'direkte');
  // tenk: analyse først, så scene med analysen i spørsmålet
  seenReq.length = 0; const ot = await handleTolk(req({ opts: { mode: 'tenk' } }), mk()); assert.equal(ot.body.ok, true); assert.equal(seenReq.length, 2); assert.ok(!seenReq[0].tools, 'analysen har ingen verktøy'); assert.ok(seenReq[1].tools && seenReq[1].tool_choice, 'scenen er et tvunget verktøykall');
  assert.ok(/<analyse>/.test(seenReq[1].messages[0].content.find((c) => c.type === 'text').text), 'scenen får analysen'); assert.deepEqual(ot.body.usage.stages, ['analyse', 'scene']);
  assert.ok(seenReq[0].messages[0].content.filter((c) => c.type === 'image').length === 2, 'analysen får bildene');
  // modus fra databasen (deps.mode), testerens valg vinner
  seenReq.length = 0; await handleTolk(req(), mk({ mode: 'tenk' })); assert.equal(seenReq.length, 2, 'deps.mode brukes'); seenReq.length = 0; await handleTolk(req({ opts: { mode: 'direkte' } }), mk({ mode: 'tenk_kritikk' })); assert.equal(seenReq.length, 1, 'testerens valg vinner');
  // tenk_kritikk: tre kall; kritikken får scenen, og den rettede scenen brukes
  seenReq.length = 0; let k = 0; const better = JSON.parse(JSON.stringify(bad)); better.name = 'Rettet';
  const dk = mk({ callClaude: async (b) => { seenReq.push(b); if (!b.tools) return { content: [{ type: 'text', text: analysisText }], usage: { input_tokens: 5000, output_tokens: 1200 } }; k++; return { content: [{ type: 'tool_use', id: 't' + k, name: 'lever_scene', input: k === 1 ? bad : better }], stop_reason: 'tool_use', usage: { input_tokens: 5000, output_tokens: 3000 } }; } });
  const ok3 = await handleTolk(req({ opts: { mode: 'tenk_kritikk' } }), dk); assert.equal(ok3.body.ok, true); assert.equal(seenReq.length, 3); assert.deepEqual(ok3.body.usage.stages, ['analyse', 'scene', 'kritikk']); assert.equal(ok3.body.scene.name, 'Rettet', 'den rettede scenen brukes');
  const ctext = seenReq[2].messages[0].content.find((c) => c.type === 'text').text; assert.ok(/<scene>/.test(ctext) && /RETTET/.test(ctext) && !/\"note\"/.test(ctext), 'kritikken får scenen (uten notater) og ber om retting');
  assert.ok(ok3.body.usage.cost_usd > costOf({ in: 15000, out: 7000 }) * 0.9, 'alle tre kallene teller i kostnaden');
  // kritikken er trygg: ugyldig eller for mager scene, feil eller manglende tid beholder scenen fra trinn 2
  const critique = async (second, over = {}) => { let n = 0; const d = mk({ ...over, callClaude: async (b) => { if (!b.tools) return { content: [{ type: 'text', text: analysisText }], usage: { input_tokens: 10, output_tokens: 10 } }; n++; if (n === 2 && second === 'throw') throw new Error('claude 500'); return { content: [{ type: 'tool_use', id: 'x' + n, name: 'lever_scene', input: n === 1 ? bad : second }], stop_reason: 'tool_use', usage: { input_tokens: 10, output_tokens: 10 } }; } }); return handleTolk(req({ opts: { mode: 'tenk_kritikk' } }), d); };
  const invalid = JSON.parse(JSON.stringify(bad)); invalid.objects[0].color = 'rød'; let r1 = await critique(invalid); assert.equal(r1.body.ok, true); assert.deepEqual(r1.body.usage.stages, ['analyse', 'scene'], 'ugyldig kritikk forkastes');
  const thin = JSON.parse(JSON.stringify(bad)); thin.objects = thin.objects.slice(0, 5); let r2 = await critique(thin); assert.deepEqual(r2.body.usage.stages, ['analyse', 'scene'], 'for mager scene forkastes'); assert.equal(r2.body.scene.objects.length, bad.objects.length);
  let r3 = await critique('throw'); assert.equal(r3.body.ok, true, 'feil i kritikken stopper ikke brettet'); assert.deepEqual(r3.body.usage.stages, ['analyse', 'scene']);
  let clock = 0; let r4 = await critique(better, { now: () => (clock += 200000) }); assert.deepEqual(r4.body.usage.stages, ['analyse', 'scene'], 'ingen tid igjen: kritikken hoppes over');
  // feil i analysen: scenen lages likevel
  const df = mk({ callClaude: async (b) => { if (!b.tools) throw new Error('claude 500'); return { ...(await stubClaude()(b)), stop_reason: 'tool_use' }; } }); const rf = await handleTolk(req({ opts: { mode: 'tenk' } }), df); assert.equal(rf.body.ok, true); assert.deepEqual(rf.body.usage.stages, ['scene']);
  // valgt modell brukes og vises, per-modell pris i kostnaden
  seenReq.length = 0; const om = await handleTolk(req({ opts: { model: 'claude-opus-5-5' } }), mk()); assert.equal(seenReq[0].model, 'claude-opus-5-5'); assert.equal(om.body.usage.model, 'claude-opus-5-5');
  const sonn = (await handleTolk(req(), mk())).body.usage.cost_usd; assert.ok(om.body.usage.cost_usd > sonn, 'Opus koster mer enn Sonnet for samme tokens');
  assert.ok(buildAnalysisRequest({ system: 's', images: [img()], answers: {}, model: 'm' }).max_tokens === LE.analysisTokens && textOf({ content: [{ type: 'text', text: ' hei ' }, { type: 'tool_use' }] }) === 'hei'); }
console.log('leveleditor-tjenesten ok');
