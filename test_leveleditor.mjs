// node test_leveleditor.mjs (R151): tjenesten for bildetolkning, med stub i stedet for Claude (ingen nett, ingen nøkkel).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { LE, REASONS, validateRequest, normAnswers, buildClaudeRequest, parseClaudeResponse, costOf, scrubScene, handleTolk, userText, startTolk, pollTolk, handleJobRequest, JOB } from './leveleditor_logic.js';
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
assert.deepEqual(normAnswers({ goal: 'x', difficulty: 'hard', theme: '<b>hei</b>\n`x`' }), { goal: 'top', difficulty: 'hard', theme: 'b hei /b x', foes: true, outdoor: false });
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
console.log('leveleditor-tjenesten ok');
