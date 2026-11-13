// node test_topband.mjs: toppbåndet (R53): prioritet, ttl, avbrytelse, ingen dobbeltmeldinger, status, panel, lukking, og at alle gamle funksjoner finnes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PRIO, createQueue, push, clear, active, compose, statusParts, panelModel, shouldClose, bandHeight, bandKey, MAX_QUEUE, AUTO_CLOSE_MS } from './topband_logic.js';
import { makeT, DICT_KEYS } from './i18n.js';

const ctx = { version: '1.57', levelLabel: 'Nivå 3 · Kjøkken', nextText: 'NESTE: HYLLA · 4,2 m · ▲ HOPP', nextAng: 0.5, goalHead: 'Åpne snarveien (3/4)', goalDone: 3, goalTotal: 4, crumbs: { n: 6, total: 10 } };

// hvile → delmål → NESTE
{
  const q = createQueue();
  assert.equal(compose(q, { ...ctx, nextText: null, goalHead: '' }, 0).kind, 'rest');
  assert.ok(compose(q, { ...ctx, nextText: null, goalHead: '' }, 0).dim, 'hvile er dempet');
  assert.equal(compose(q, { ...ctx, nextText: null }, 0).kind, 'goal');
  const c = compose(q, ctx, 0); assert.equal(c.kind, 'next'); assert.equal(c.arrow, 0.5); assert.ok(c.text.includes('NESTE'));
}
// prioritet og avbrytelse; lavere kommer tilbake
{
  const q = createQueue();
  push(q, { id: 'tip', prio: PRIO.hint, text: 'Trykk TA', ttl: 10 }, 0);
  assert.equal(compose(q, ctx, 100).text, 'Trykk TA', 'hint slår NESTE');
  push(q, { id: 'rep', prio: PRIO.reply, text: '✉ Svar', ttl: 3 }, 1000);
  assert.equal(compose(q, ctx, 1500).text, '✉ Svar', 'svar avbryter hint');
  push(q, { id: 'boss', prio: PRIO.danger, text: '⚠ SJEF', ttl: 1 }, 1600);
  assert.equal(compose(q, ctx, 1700).kind, 'msg'); assert.equal(compose(q, ctx, 1700).text, '⚠ SJEF', 'fare slår alt');
  push(q, { id: 'tip2', prio: PRIO.hint, text: 'Ny hint', ttl: 10 }, 1800);
  assert.equal(compose(q, ctx, 1900).text, '⚠ SJEF', 'lavere prioritet avbryter ikke');
  assert.equal(compose(q, ctx, 2700).text, '✉ Svar', 'fare utløpt (ttl): tilbake til svaret');
  assert.equal(compose(q, ctx, 4500).text, 'Ny hint', 'svaret utløpt: nyeste hint');
  assert.equal(compose(q, ctx, 12000).kind, 'next', 'alt utløpt: tilbake til NESTE');
}
// lik prioritet: nyeste vinner; samme id erstatter; samme tekst slås sammen; ttl 0 står til clear
{
  const q = createQueue();
  push(q, { id: 'a', prio: PRIO.hint, text: 'A', ttl: 5 }, 0); push(q, { id: 'b', prio: PRIO.hint, text: 'B', ttl: 5 }, 10);
  assert.equal(active(q, 20).text, 'B');
  push(q, { id: 'a', prio: PRIO.hint, text: 'A2', ttl: 5 }, 30); assert.equal(q.items.filter((m) => m.id === 'a').length, 1, 'samme id: én melding'); assert.equal(active(q, 40).text, 'A2');
  push(q, { id: 'c', prio: PRIO.hint, text: 'A2', ttl: 5 }, 50); assert.equal(q.items.filter((m) => m.text === 'A2').length, 1, 'ingen dobbeltmelding');
  push(q, { id: 'send', prio: PRIO.reply, text: 'Sender …', ttl: 0 }, 60);
  assert.equal(active(q, 1e9).text, 'Sender …', 'ttl 0 = sticky'); assert.ok(clear(q, 'send')); assert.ok(!clear(q, 'send')); assert.equal(active(q, 1e9), null);
}
// fornyelse av samme melding forlenger ttl (boss-varsel hver ramme) uten å vokse
{
  const q = createQueue(); for (let t = 0; t < 100; t++) push(q, { id: 'boss', prio: PRIO.danger, text: '⚠', ttl: 0.6 }, t * 16);
  assert.equal(q.items.length, 1); assert.ok(active(q, 1700));  assert.equal(active(q, 1600 + 700), null);
}
// køen er begrenset, og de høyeste prioritetene overlever
{
  const q = createQueue(); push(q, { id: 'x', prio: PRIO.danger, text: 'D', ttl: 100 }, 0);
  for (let i = 0; i < 30; i++) push(q, { id: 'h' + i, prio: PRIO.hint, text: 'H' + i, ttl: 100 }, i + 1);
  assert.ok(q.items.length <= MAX_QUEUE); assert.equal(active(q, 50).text, 'D');
}
// ugyldig input
{ const q = createQueue(); assert.equal(push(q, { id: '', prio: 3, text: 'x' }, 0), null); assert.equal(push(q, { id: 'a', prio: 0, text: 'x' }, 0), null); assert.equal(push(q, { id: 'a', prio: 3, text: '' }, 0), null); assert.equal(q.items.length, 0); }
// status: versjon alltid med; ★ fra delmål, ellers smuler, ellers tom
assert.deepEqual(statusParts(ctx), { ver: 'v1.57', star: '★ 3/4' });
assert.equal(statusParts({ ...ctx, goalTotal: 0 }).star, '★ 6/10'); assert.equal(statusParts({ version: '1.57' }).star, ''); assert.equal(statusParts({ version: '1.57' }).ver, 'v1.57');
// panel: alt det gamle (versjon og brett, delmålliste, NESTE, send, svar, tellere)
{
  const rows = panelModel({ ...ctx, goals: [{ text: 'a', done: true }, { text: 'b', active: true }], send: 'Sendt!', reply: 'v1.5: Rettet', counts: ['12 spillere'] });
  assert.deepEqual(rows.map((r) => r.k), ['head', 'goals', 'next', 'send', 'reply', 'counts']); assert.ok(rows[0].text.includes('v1.57') && rows[0].text.includes('Kjøkken'));
  assert.deepEqual(panelModel({ version: '1', levelLabel: 'x' }).map((r) => r.k), ['head']);
}
// lukking etter ca. 6 s, størrelser, nøkkel
assert.ok(!shouldClose(0, AUTO_CLOSE_MS - 1) && shouldClose(0, AUTO_CLOSE_MS) && AUTO_CLOSE_MS >= 5000 && AUTO_CLOSE_MS <= 7000);
assert.equal(bandHeight('compact'), 32); assert.ok(bandHeight('normal') > 32); assert.equal(bandHeight('x'), 32);
assert.notEqual(bandKey({ kind: 'a', id: 'i', text: 't' }), bandKey({ kind: 'a', id: 'i', text: 'u' }));

// i18n nb/en og mobil først: ingen taster nevnt
const { T } = makeT(() => 'nb'), TE = makeT(() => 'en').T;
for (const k of ['tb.info', 'tb.flag', 'tb.camgoal', 'tb.sending', 'tb.sent', 'tb.boss.dodge', 'tb.boss.stun']) { assert.ok(DICT_KEYS.nb.includes(k) && DICT_KEYS.en.includes(k), k); }
assert.ok(T('tb.boss.stun', { jump: 'HOPP' }).includes('HOPP') && TE('tb.boss.stun', { jump: 'JUMP' }).includes('JUMP'));

// alle gamle funksjoner finnes i båndet/koblingen
const html = fs.readFileSync('index.html', 'utf8'), main = fs.readFileSync('main.js', 'utf8'), view = fs.readFileSync('topband_view.js', 'utf8');
for (const f of ['topband_logic', 'topband_view']) assert.ok(html.includes(`'${f}'`), `${f} i files`);
assert.ok(view.includes('id="tbi"') && view.includes('id="tbq"'), 'ℹ og ⚑ inni båndet');
assert.ok(/onInfo: \(\) => \{[^}]*infoTab\.click\(\)/.test(main) && /onFlag: \(\) => \{[^}]*\$\('qbtn'\)\.click\(\)/.test(main), 'ℹ åpner bruksanvisningen, ⚑ åpner vurderingsboksen som før');
assert.ok(/onNext: \(\) => camToGoal\(\)/.test(main), 'kamera mot målet fra båndet');
for (const id of ['tband', 'tbsize']) assert.ok(main.includes(`'${id}', 'hjelp'`), `innstilling ${id}`);
assert.ok(main.includes("logEv('bånd'") && view.includes("logEv?.('bånd'"), 'logEv bånd');
assert.ok(main.includes('PRIO.danger') && main.includes('PRIO.reply') && main.includes('PRIO.hint'), 'fare, svar og hint går via båndet');
for (const sel of ['body.tb #hud', 'body.tb #goals', 'body.tb #compass', 'body.tb #introhint', 'body.tb #qbtn']) assert.ok(view.includes(sel), `gammelt element skjules: ${sel}`);
assert.ok(view.includes('env(safe-area-inset-top)'), 'trygt område');
assert.ok(fs.readFileSync('settings_util.js', 'utf8').includes("'tband', 'tbsize'"), 'i oppsettet');
console.log('test_topband ok');
