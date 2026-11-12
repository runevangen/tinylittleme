// node test_feedback.mjs: «Send til Claude» (rad, grenser, feilsvar). Ingen ekte nettkall.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildPayload, sendFeedback, validCode, LIMITS, FEEDBACK, REASON_TEXT } from './feedback_send.js';

assert.ok(validCode('tlm-7c3e8e5d') && validCode(' tlm-7c3e8e5d '), 'gyldig kode (trimmes)');
assert.ok(validCode('Rune') && validCode('ANKI') && validCode(' Anki '), 'korte navn og store bokstaver er ok');
assert.equal(buildPayload({ code: 'Rune', body: 'x' }).row.tester_code, 'rune', 'koden sendes med små bokstaver');
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

// ---------- R36: innboks og tellere ----------
import { parseInbox, fetchInbox, markRead, unreadReplies, statsLines } from './feedback_send.js';
assert.equal(parseInbox(null), null); assert.equal(parseInbox({ ok: false }), null, 'ugyldig kode gir ingen innboks');
const inb = parseInbox({ ok: true, me: { sent: 4, fixed: 2, working: 1 }, all: { sent: 14, fixed: 9, testers: 3 },
  replies: [{ id: 'a', version: '1.30', message: 'Rettet i v1.30', read: false, at: 'x' }, { id: 'b', message: 'x'.repeat(999), read: true }, { id: '', message: 'uten id' }, { id: 'c', message: '' }] });
assert.equal(inb.replies.length, 2, 'svar uten id eller tekst filtreres bort'); assert.equal(inb.replies[1].message.length, 300);
assert.equal(unreadReplies(inb).length, 1);
assert.deepEqual(statsLines(inb), ['Du har meldt 4 · 2 rettet · 1 under arbeid', 'Sammen har dere meldt 14, og 9 er rettet']);
assert.ok(statsLines(parseInbox({ ok: true, me: {}, all: {}, replies: [] }))[0].includes('ikke meldt noe ennå'));
assert.equal(statsLines(parseInbox({ ok: true, me: { sent: 1, fixed: 0 }, all: { sent: 1, fixed: 0, testers: 1 } })).length, 1, 'felles teller skjules når bare én tester');
assert.equal(parseInbox({ ok: true, me: { sent: -5, fixed: 'x' }, all: {}, replies: [] }).me.sent, 0, 'tall saneres');
// kall mot funksjonene: riktig adresse og kode i små bokstaver
let call; const okFetch = (data) => async (url, init) => { call = { url, body: JSON.parse(init.body) }; return { ok: true, status: 200, json: async () => data }; };
const got = await fetchInbox(' Rune ', { fetchFn: okFetch({ ok: true, me: { sent: 1 }, all: {}, replies: [] }) });
assert.equal(call.url, `${FEEDBACK.url}/rest/v1/rpc/tlm_my_inbox`); assert.equal(call.body.c, 'rune'); assert.equal(got.me.sent, 1);
assert.equal(await fetchInbox('rune', { fetchFn: async () => { throw new Error('offline'); } }), null, 'uten nett: ingen innboks, ingen feil');
assert.equal(await fetchInbox('rune', { fetchFn: async () => ({ ok: false, status: 500 }) }), null);
assert.equal(await markRead('rune', [], { fetchFn: okFetch(1) }), 0, 'ingen ids: ingen kall');
assert.equal(await markRead('Rune', ['a'], { fetchFn: okFetch(1) }), 1); assert.deepEqual(call.body, { c: 'rune', ids: ['a'] });
console.log('feedback inbox: ok');
