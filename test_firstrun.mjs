// node test_firstrun.mjs: R97 første fem minutter: hint-rekkefølge og -forsvinning per vanskelighet, fremdrift, blindgater, meny, tekster, at modulen er med i index.html.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { FR, HINTS, firstRunActive, isFirstRun, menuPlan, createHints, hintsSave, noteUse, stepHints, progressInfo, braText, createBlind, stepBlind, noteWrongTa, ft, TEXT_KEYS } from './firstrun_logic.js';

// ---- aktiv bare i nivå 1, på og ikke Ekspert
assert.ok(firstRunActive({ on: true, n: 1, diff: 'medium' }) && firstRunActive({ on: true, n: 1, diff: 'beginner' }));
assert.ok(!firstRunActive({ on: true, n: 1, diff: 'expert' }) && !firstRunActive({ on: false, n: 1, diff: 'medium' }) && !firstRunActive({ on: true, n: 2, diff: 'medium' }));
assert.ok(isFirstRun({}) && isFirstRun(null) && !isFirstRun({ bad: 12 }));

// ---- menyen: én stor knapp, resten under «mer» til første mål er nådd
assert.deepEqual([menuPlan({ has: false, firstRun: true }).primary, menuPlan({ has: false, firstRun: true }).collapse], ['start', true]);
assert.deepEqual([menuPlan({ has: true, firstRun: true }).primary, menuPlan({ has: true, firstRun: true }).collapse], ['continue', true]);
assert.equal(menuPlan({ has: true, firstRun: false }).collapse, false, 'etter første mål: vanlig meny');
assert.equal(menuPlan({ has: false, firstRun: true, on: false }).collapse, false, 'valget av: gammel meny');
assert.ok(menuPlan({ has: false, firstRun: true }).keep.includes('fix') && menuPlan({ has: false, firstRun: true }).keep.includes('chg'), 'NYTT og RETTELSER beholdes (BYGGESKOLE ligger i VELG BRETT, R133)');

// ---- hint: ett om gangen, i rekkefølge, forsvinner når knappen brukes, aldri på Ekspert
const run = (diff, script, secs = 60) => {   // script: (t) => { use?: id, near? }  ; tid i s, steg 0,2 s
  const h = createHints(), shown = [], hidden = []; let now = 0, active = 0;
  for (let t = 0; t <= secs; t += 0.2) {
    now = t * 1000; const sc = script(t, h) || {};
    if (sc.use) noteUse(h, sc.use);
    const r = stepHints(h, now, { diff, play: true, t, near: sc.near || {} });
    if (r.show) { shown.push([t, r.show]); active++; assert.ok(active === 1, 'bare ett hint om gangen'); }
    if (r.hide) { hidden.push([t, r.hide, r.why]); active--; }
  }
  return { h, shown, hidden };
};
{
  const r = run('medium', (t) => (t > 3 ? { use: undefined } : {}), 8);
  assert.deepEqual(r.shown.map((s) => s[1]), ['stick'], 'stikke-hintet kommer først (etter 2 s uten bevegelse)');
  assert.ok(r.shown[0][0] >= FR.stickAfter);
  assert.deepEqual(r.hidden.map((s) => s[2]), ['tid'].slice(0, r.hidden.length), 'uten bruk forsvinner det av seg selv');
}
{ // spilleren går med en gang: stikke-hintet kommer aldri; HOPP kommer når det er noe å hoppe på; brukt: forsvinner og kommer ikke igjen
  let used = false;
  const r = run('medium', (t, h) => { const o = {}; if (t > 0.5) o.use = 'stick'; if (t > 6) o.near = { jump: true }; if (h.active === 'jump' && t > 9 && !used) { used = true; o.use = 'jump'; } return o; }, 40);
  assert.deepEqual(r.shown.map((s) => s[1]), ['jump']);
  assert.ok(r.hidden.some((x) => x[1] === 'jump' && x[2] === 'brukt'), 'forsvinner når HOPP brukes');
  assert.ok(r.h.used.jump && r.h.used.stick);
}
{ // den som allerede bruker alle knappene får ingen hint
  const r = run('beginner', (t) => ({ use: ['stick', 'jump', 'take', 'grab'][Math.floor(t) % 4], near: { jump: true, take: true, grab: true } }), 30);
  assert.ok(r.shown.length <= 1, 'bare første sekunders hint før de er brukt');
}
{ // Ekspert: ingen hint, aldri
  const r = run('expert', () => ({ near: { jump: true, take: true, grab: true } }), 60);
  assert.equal(r.shown.length, 0);
}
{ // rekkefølge: stikke, så HOPP, TA, GREP når de trengs; hvert hint maks maxShow ganger
  const r = run('beginner', (t, h) => ({ use: t > 8 ? 'stick' : undefined, near: { jump: true, take: t > 14, grab: t > 24 } }), 200);
  const order = r.shown.map((s) => s[1]);
  assert.equal(order[0], 'stick');
  for (const id of HINTS) assert.ok(order.filter((x) => x === id).length <= FR.maxShow.beginner, `${id} maks ${FR.maxShow.beginner} ganger`);
  assert.ok(order.indexOf('jump') < order.indexOf('take') && order.indexOf('take') < order.indexOf('grab'));
}
{ // lagring rundt
  const h = createHints(); noteUse(h, 'jump'); h.shown.take = 2; const h2 = createHints(hintsSave(h));
  assert.ok(h2.used.jump && h2.shown.take === 2); assert.deepEqual(createHints({ used: { bogus: 1 }, shown: { jump: 'x' } }).used, {});
  assert.equal(noteUse(h, 'nope'), false);
}
{ // aldri to hint tett: pause
  const h = createHints(); stepHints(h, 3000, { diff: 'medium', play: true, t: 3, near: {} });
  const a = h.active; assert.equal(a, 'stick'); noteUse(h, 'stick');
  assert.equal(stepHints(h, 3200, { diff: 'medium', play: true, t: 3.2, near: { take: true } }).hide, 'stick');
  assert.equal(stepHints(h, 3400, { diff: 'medium', play: true, t: 3.4, near: { take: true } }).show, null, 'pause mellom hint');
  assert.equal(stepHints(h, 3200 + FR.hintGapMs + 100, { diff: 'medium', play: true, t: 7, near: { take: true } }).show, 'take');
}

// ---- fremdrift og Bra!
assert.deepEqual(progressInfo({ done: 1, total: 3, diff: 'medium' }), { dots: [true, false, false], text: '1/3', show: true });
assert.equal(progressInfo({ done: 2, total: 3, diff: 'expert' }).text, '', 'ingen tall på Ekspert');
assert.deepEqual(progressInfo({ done: 2, total: 3, diff: 'expert' }).dots, [true, true, false]);
assert.equal(progressInfo({ done: 5, total: 3, diff: 'beginner' }).text, '3/3', 'aldri over N');
assert.equal(progressInfo({ done: 0, total: 0, diff: 'medium' }).show, false);
assert.deepEqual(braText({ n: 1, total: 3, last: false }), { key: 'fr.good', params: { n: 1, total: 3 } });
assert.equal(braText({ n: 3, total: 3, last: true }), null, 'siste delmål har eget jubel');

// ---- blindgater: tafatt spiller får hjelp innen 12 s
{
  const s = createBlind(), ev = []; let first = null;
  for (let t = 0; t <= 20000; t += 200) for (const e of stepBlind(s, t, { x: 5, y: 1, z: 5, dist: 12 })) { ev.push([t, e]); if (e.kind === 'help' && first === null) first = t; }
  assert.ok(first !== null && first <= 12000, `hjelp innen 12 s (fikk ${first})`);
  assert.equal(ev.find((e) => e[1].kind === 'help')[1].why, 'still');
  assert.ok(ev.some((e) => e[1].kind === 'still8' && e[0] <= FR.idleMs + 400), 'stillstand over 8 s telles først');
  assert.ok(ev.filter((e) => e[1].kind === 'help').length <= 1, 'ikke hjelp på hjelp: pause');
}
{ // går man hele tiden, kommer det ingen hjelp
  const s = createBlind(); let n = 0; for (let t = 0; t <= 60000; t += 200) n += stepBlind(s, t, { x: t / 500, y: 1, z: 0, dist: 100 - t / 1000 }).length; assert.equal(n, 0);
}
{ // feil vei: går unna målet i 9 s
  const s = createBlind(); let got = null; for (let t = 0; t <= 14000 && !got; t += 200) { const e = stepBlind(s, t, { x: t / 400, y: 1, z: 0, dist: 5 + t / 1000 * 1.2 }).find((x) => x.kind === 'help'); if (e) got = [t, e]; }
  assert.ok(got && got[1].why === 'wrongway' && got[0] <= 12000, 'feil vei gir hjelp');
}
{ // nytt mål midt i vinduet gir ikke feil-vei-hjelp (avstanden hopper)
  const s = createBlind(); let n = 0; for (let t = 0; t <= 30000; t += 200) n += stepBlind(s, t, { x: t / 400, y: 1, z: 0, dist: t < 12000 ? 3 : 40, key: t < 12000 ? 'a' : 'b' }).filter((e) => e.kind === 'help').length; assert.equal(n, 0);
}
{ // TA på feil sted tre ganger
  const s = createBlind(); assert.equal(noteWrongTa(s, 1000), null); assert.equal(noteWrongTa(s, 2000), null); assert.equal(noteWrongTa(s, 3000)?.why, 'wrongta');
  assert.equal(noteWrongTa(s, 4000), null, 'pause etter hjelp');
  const s2 = createBlind(); noteWrongTa(s2, 0); noteWrongTa(s2, 1000); assert.equal(noteWrongTa(s2, 20000), null, 'for spredt');
}
{ // av (act false): ingenting
  const s = createBlind(); let n = 0; for (let t = 0; t <= 30000; t += 200) n += stepBlind(s, t, { x: 0, y: 0, z: 0, dist: 3 }, { act: false }).length; assert.equal(n, 0);
}
assert.ok(FR.helpMs < 12000, 'standard hjelpegrense under 12 s');

// ---- tekster: begge språk, nevner knappene (variabler), ingen taster
assert.deepEqual(TEXT_KEYS.nb.sort(), TEXT_KEYS.en.sort());
for (const l of ['nb', 'en']) {
  for (const k of TEXT_KEYS[l]) assert.notEqual(ft(l, k, { jump: 'HOPP', take: 'TA', grab: 'GREP', n: 1, total: 3, name: 'x', text: '1/3' }), k);
  for (const id of ['jump', 'take', 'grab']) assert.ok(new RegExp(`\\{${id}\\}`).test(ft(l, 'fr.hint.' + id)), `${l}: ${id}-hintet nevner knappen`);
  for (const k of TEXT_KEYS[l]) assert.ok(!/\b(mellomrom|space|shift|tast)\b/i.test(ft(l, k)), 'ingen taster hardkodet');
}
assert.equal(ft('nb', 'fr.start'), 'START'); assert.equal(ft('nb', 'fr.backMenu'), 'TILBAKE TIL MENY');

// ---- hekter: modulene er i index.html, valget i SETTINGS
const idx = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8'), main = fs.readFileSync(new URL('./main.js', import.meta.url), 'utf8');
for (const f of ['firstrun_logic', 'firstrun_view']) assert.ok(idx.includes(`'${f}'`), `${f} mangler i files i index.html`);
assert.ok(/fl\('firstrun', 'spill'/.test(main) && /rg\('frhelpms', 'admin'/.test(main), 'SETTINGS har valgene');
assert.ok(/logEv\('forstekjoring'/.test(main), 'hendelser logges som forstekjoring');
console.log('firstrun: ok');
