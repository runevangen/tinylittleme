// node test_byggeskole.mjs: Byggeskolen i menyen (R95). Ren logikk (anbefalingsmerke, n/8, når kortet vises og ikke, lagring), DOM-test av menyknappen og kortene (stubb),
// stedene (ett oppgavetekst hver, antall stemmer med brettet), byggehjelmen, tekster nb/en, valget i SETTINGS, filene i index.html, ingen three.js.
import { register } from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs';
register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s,c,n){ if(s==='three') return {url:${JSON.stringify(new URL('./lib/three.module.min.js', import.meta.url).href)},shortCircuit:true}; return n(s,c); }`));
const SL = await import('./byggeskole_logic.js'), SV = await import('./byggeskole_view.js'), GS = await import('./grid_stage.js'), RW = await import('./rewards.js'), { DICT_KEYS, makeT } = await import('./i18n.js');
const mem = () => { const m = new Map(); return { get: (k, d) => (m.has(k) ? m.get(k) : d), set: (k, v) => m.set(k, v), m }; };
const L = JSON.parse(fs.readFileSync('levels/bygglab.level.json', 'utf8')), sites = (L.build?.sites || L.buildSites).filter((s) => s.lab).sort((a, b) => a.lab.n - b.lab.n);

// 1) fremdrift og merkelapp
assert.equal(SL.SCHOOL.total, sites.length, 'antall steder stemmer med brettet (9)'); assert.deepEqual(SL.schoolSiteIds(), sites.map((s) => s.id), 'stedene lab1..lab9');
assert.deepEqual(SL.schoolProgress(new Set()), { n: 0, total: 9, started: false, done: false });
assert.deepEqual(SL.schoolProgress(['lab1', 'lab1', 'finnesikke', 7]), { n: 1, total: 9, started: true, done: false }, 'ukjente og doble telles ikke');
assert.equal(SL.schoolProgress(SL.schoolSiteIds()).done, true);
assert.equal(SL.schoolBadge(SL.schoolProgress([])).kind, 'recommended'); assert.deepEqual(SL.schoolBadge(SL.schoolProgress(['lab1', 'lab2', 'lab3'])), { kind: 'progress', n: 3, total: 9 }); assert.equal(SL.schoolBadge(SL.schoolProgress(SL.schoolSiteIds())).kind, 'done');
{ const st = mem(); GS.passRecord(st, 'bygglab', 'lab1'); GS.passRecord(st, 'bygglab', 'lab2'); assert.equal(SL.schoolProgress(GS.passRead(st, 'bygglab')).n, 2, 'leser bestått-lista fra rutenett-oppdragene'); }

// 2) lagring tåler rot, kaster aldri
{ const st = mem(); assert.deepEqual(SL.schoolRead(st), { opened: false, card: '', done: false });
  SL.schoolMark(st, { opened: true }); SL.schoolMark(st, { card: 'tried' }); assert.deepEqual(SL.schoolRead(st), { opened: true, card: 'tried', done: false });
  st.set(SL.SCHOOL.key, 'rot'); assert.deepEqual(SL.schoolRead(st), { opened: false, card: '', done: false }); st.set(SL.SCHOOL.key, { opened: 1, card: 'x', done: 'ja' }); assert.deepEqual(SL.schoolRead(st), { opened: true, card: '', done: true });
  const bad = { get() { throw new Error('ingen lagring'); }, set() { throw new Error('ingen lagring'); } }; assert.doesNotThrow(() => SL.schoolRead(bad)); assert.doesNotThrow(() => SL.schoolMark(bad, { opened: true })); }

// 3) når kortet vises
{ const st0 = { opened: false, card: '', done: false }, prog0 = SL.schoolProgress([]), q = (o = {}) => SL.schoolCardShould({ level: 'bro', difficulty: 'beginner', on: true, cinema: false, state: st0, prog: prog0, ...o });
  assert.ok(q(), 'første gang i Hyllebroen'); for (const lv of ['bro', 'trapp', 'vippe', 'kjokkenbro', 'leke', 'stue']) assert.ok(q({ level: lv }), lv);
  assert.ok(!q({ level: 'bad' }) && !q({ level: 'kjokken' }) && !q({ level: 'bygglab' }) && !q({ level: 'verksted' }), 'bare vanlige byggebrett');
  assert.ok(q({ difficulty: 'medium' }) && !q({ difficulty: 'expert' }), 'Ekspert får ikke kortet');
  assert.ok(!q({ on: false }) && !q({ cinema: true }), 'valget av og kinomodus');
  assert.ok(!q({ state: { ...st0, opened: true } }), 'ikke etter at skolen er åpnet'); assert.ok(!q({ state: { ...st0, card: 'skipped' } }) && !q({ state: { ...st0, card: 'tried' } }), 'bare én gang');
  assert.ok(!q({ prog: SL.schoolProgress(['lab1']) }), 'ikke når et sted er bestått'); assert.ok(!q({ state: null }));
  assert.ok(SL.schoolDoneShould({ prog: SL.schoolProgress(SL.schoolSiteIds()), state: st0 }) && !SL.schoolDoneShould({ prog: SL.schoolProgress(SL.schoolSiteIds()), state: { ...st0, done: true } }) && !SL.schoolDoneShould({ prog: SL.schoolProgress(['lab1']), state: st0 }), '«klar» én gang');
  assert.equal(SL.schoolUrl('/spill/'), '/spill/?level=bygglab&skole=1'); }

// 4) DOM: menyknapp og kort (stubb)
{
  const els = []; const mk = () => { const o = { _q: {}, style: {}, children: [], className: '', _html: '', setAttribute() {}, remove() { o.gone = true; }, appendChild(c) { o.children.push(c); return c; }, querySelector(sel) { const m = /data-sk="(\w+)"/.exec(sel); return m && o._html.includes(`data-sk="${m[1]}"`) ? (o._q[m[1]] ||= {}) : null; }, set innerHTML(v) { o._html = v; }, get innerHTML() { return o._html; } }; els.push(o); return o; };
  globalThis.document = { createElement: mk, head: mk(), body: mk() };
  const { T } = makeT(() => 'nb'), { T: TE } = makeT(() => 'en');
  const h0 = SV.schoolMenuHtml(T, SL.schoolProgress([])); assert.ok(h0.includes('id="mSchool"') && h0.includes('BYGGESKOLE') && h0.includes('ANBEFALT') && h0.includes('0 av 9'), h0);
  const h1 = SV.schoolMenuHtml(T, SL.schoolProgress(['lab1', 'lab2'])); assert.ok(h1.includes('✓ 2/9') && !h1.includes('ANBEFALT'), h1);
  assert.ok(SV.schoolMenuHtml(TE, SL.schoolProgress([])).includes('RECOMMENDED'), 'engelsk');
  const v = SV.createSchoolView({ T, logEv() {} }); let tried = 0, skipped = 0;
  const c = v.showCard({ onTry: () => tried++, onSkip: () => skipped++ }); assert.ok(v.open && c.innerHTML.includes('Ny til bygging?') && c.innerHTML.includes('PRØV SKOLEN') && c.innerHTML.includes('HOPP OVER'), 'kortet har tekst og begge knapper');
  c._q.skip.onclick({}); assert.equal(skipped, 1); assert.ok(!v.open && c.gone, 'HOPP OVER lukker kortet');
  const c2 = v.showCard({ onTry: () => tried++, onSkip: () => skipped++ }); c2._q.try.onclick(); assert.equal(tried, 1); assert.ok(!v.open);
  let ok = 0; const c3 = v.showDone({ onOk: () => ok++ }); assert.ok(c3.innerHTML.includes('Byggeskolen er klar')); c3._q.ok.onclick(); assert.equal(ok, 1);
  v.showCard({}); v.hide(); assert.ok(!v.open, 'hide lukker');
  assert.ok(!/\b(trykk|tast)\w*\s+(enter|space|mellomrom|e\b)/i.test(c.innerHTML + h0), 'ingen tastaturtekst');
  assert.ok(SV.schoolCss().includes('min-height:48px'), 'store knapper');
}

// 5) stedene: én oppgavetekst hver, nb og en, nevner knappene
{
  const { T } = makeT(() => 'nb'), { T: TE } = makeT(() => 'en');
  for (const s of sites) for (const [t, tt] of [[T, 'nb'], [TE, 'en']]) { const k = `lab.task.${s.lab.key}`, x = t(k, { n: s.lab.cap || 0 }); assert.notEqual(x, k, `${s.lab.key}: oppgavetekst ${tt}`); assert.ok(x.length > 30 && x.length < 220, `${s.lab.key}: kort (${x.length})`); assert.ok(/PRØV|TAPE|LEDD|TAU|GUMMI|TRY|HINGE|ROPE|BAND|klosser|blocks|stjerner|stars/.test(x), `${s.lab.key}: nevner knapp eller mål`); }
  const nivaer = fs.readFileSync('docs/NIVAER.md', 'utf8'); assert.ok(/Byggeskole/.test(nivaer), 'docs/NIVAER.md har Byggeskole-seksjon'); for (const s of sites) assert.ok(nivaer.includes(`\`${s.lab.key}\``), `NIVAER.md forklarer ${s.lab.key}`);
}

// 6) byggehjelmen
{
  assert.equal(RW.ACCESSORIES.filter((a) => a.school).length, 1); assert.equal(RW.accForLevel(0), null); assert.equal(RW.accForLevel(undefined), null);
  const st = mem(); const a = RW.unlockSchool(st); assert.equal(a.id, 'hardhat'); assert.deepEqual(RW.getUnlocks(st), ['hardhat']); assert.equal(RW.getEquipped(st).hat, 'hardhat', 'tas på'); assert.equal(RW.unlockSchool(st), null, 'bare første gang');
  for (const l of ['nb', 'en']) { assert.notEqual(RW.rt(l, 'acc.hardhat'), 'acc.hardhat'); assert.notEqual(RW.rt(l, 'rw.lockedSchool'), 'rw.lockedSchool'); }
}

// 7) nøkler, valg, filer, hekter
{
  const nb = new Set(DICT_KEYS.nb), en = new Set(DICT_KEYS.en); for (const k of ['school.btn', 'school.rec', 'school.sub', 'school.label', 'school.card.title', 'school.card.text', 'school.card.try', 'school.card.skip', 'school.done.title', 'school.done.text', 'school.done.ok']) assert.ok(nb.has(k) && en.has(k), `i18n ${k}`);
  const main = fs.readFileSync('main.js', 'utf8'), html = fs.readFileSync('index.html', 'utf8'), list = (html.match(/const files = \[([^\]]+)\]/) || [])[1] || '';
  for (const f of ['byggeskole_logic', 'byggeskole_view']) assert.ok(list.includes(`'${f}'`), `index.html: ${f}`);
  assert.match(main, /fl\('schoolcard', 'spill'/, 'valg i SETTINGS (Spill)'); assert.match(main, /id: 'bygglab', label: 'Byggeskole/, 'etikett «Byggeskole», id bygglab');
  assert.match(main, /schoolMenuHtml\(T, schoolProg\(\)(, r2Summary\(\))?\)/, 'knappen i showStart'); assert.ok(/CINE\.on \? '' : schoolMenuHtml/.test(main), 'ikke i kinomodus');
  for (const k of ["logEv('byggeskole', `åpnet fra", "første-møte-kort vist", "første-møte-kort: hoppet over", "første-møte-kort: prøv skolen", "sted bestått"]) assert.ok(main.includes(k), `logEv: ${k}`);
  assert.ok(fs.readFileSync('docs/INNSTILLINGER.md', 'utf8').includes('tlm.schoolcard'), 'dokumentert i INNSTILLINGER.md');
  for (const f of ['byggeskole_logic.js', 'byggeskole_view.js']) assert.ok(!/from 'three'|THREE\./.test(fs.readFileSync(f, 'utf8')), `${f} uten three`);
}
console.log('test_byggeskole: ok');
