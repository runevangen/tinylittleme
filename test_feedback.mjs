// node test_feedback.mjs: «Send til Claude» (rad, grenser, feilsvar). Ingen ekte nettkall.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildPayload, sendFeedback, validCode, LIMITS, FEEDBACK, REASON_TEXT } from './feedback_send.js';

assert.ok(validCode('tlm-7c3e8e5d') && validCode(' tlm-7c3e8e5d '), 'gyldig kode (trimmes)');
for (const bad of ['', 'abc', 'x'.repeat(25), 'tlm 123456', 'æøå12345', null]) assert.ok(!validCode(bad), 'ugyldig kode: ' + bad);

assert.equal(buildPayload({ code: 'nei', body: 'x' }).error, 'kode');
assert.equal(buildPayload({ code: 'tlm-7c3e8e5d' }).error, 'tom', 'må ha tekst eller rapport');
const ok = buildPayload({ code: 'tlm-7c3e8e5d', version: '1.27', level: 'Bad', kind: 'rar', body: '  hei  ', report: 'R', ua: 'iPhone' }).row;
assert.equal(ok.kind, 'rapport', 'ukjent type blir rapport'); assert.equal(ok.body, 'hei');
const big = buildPayload({ code: 'tlm-7c3e8e5d', version: 'v'.repeat(99), level: 'l'.repeat(99), body: 'b'.repeat(9999), report: 'r'.repeat(99999), ua: 'u'.repeat(999) }).row;
assert.equal(big.version.length, LIMITS.version); assert.equal(big.level.length, LIMITS.level); assert.equal(big.body.length, LIMITS.body);
assert.equal(big.report.length, LIMITS.report); assert.equal(big.ua.length, LIMITS.ua);

// sending: riktig adresse, headere og kropp
let seen;
const mk = (status, text = '') => async (url, init) => { seen = { url, init }; return { ok: status < 300, status, text: async () => text }; };
assert.deepEqual(await sendFeedback(ok, { fetchFn: mk(201) }), { ok: true });
assert.equal(seen.url, `${FEEDBACK.url}/rest/v1/tlm_feedback`); assert.equal(seen.init.method, 'POST');
assert.equal(seen.init.headers.apikey, FEEDBACK.key); assert.equal(seen.init.headers.Prefer, 'return=minimal');
assert.equal(JSON.parse(seen.init.body).tester_code, 'tlm-7c3e8e5d');
assert.equal((await sendFeedback(ok, { fetchFn: mk(403) })).reason, 'kode');
assert.equal((await sendFeedback(ok, { fetchFn: mk(401) })).reason, 'kode');
assert.equal((await sendFeedback(ok, { fetchFn: mk(400, '{"message":"for mange meldinger, prøv igjen senere"}') })).reason, 'grense');
assert.equal((await sendFeedback(ok, { fetchFn: mk(500) })).reason, 'feil');
assert.equal((await sendFeedback(ok, { fetchFn: async () => { throw new Error('offline'); } })).reason, 'nett');
for (const k of ['kode', 'grense', 'nett', 'feil', 'tom']) assert.ok(REASON_TEXT[k], 'tekst for ' + k);
assert.ok(!/taster|\bTrykk [A-Z]\b/.test(Object.values(REASON_TEXT).join(' ')), 'tekst nevner knapper, ikke taster');

// modulen er med i index.html, og nøkkelen er en anon-nøkkel (ikke service_role)
assert.ok(/'feedback_send'/.test(fs.readFileSync('index.html', 'utf8')), 'feedback_send ligger i files i index.html');
const role = JSON.parse(Buffer.from(FEEDBACK.key.split('.')[1], 'base64url').toString()).role;
assert.equal(role, 'anon', 'nøkkelen i spillet må være anon, aldri service_role');
console.log('feedback: ok');
