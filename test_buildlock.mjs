// node test_buildlock.mjs: R111, låste byggesteder får det nye skallet: ren logikk (buildlock_logic.js), DOM mot en stubb (buildlock_view.js), filer, tekster og hekter.
// Ekte berøring og bilder av alle åtte Byggeskole-steder og Trapp (iPhone 14, stående og liggende): node tools/live_buildlock.cjs <utmappe> (Playwright).
import fs from 'node:fs';
import assert from 'node:assert/strict';
const L = await import('./buildlock_logic.js'), V = await import('./buildlock_view.js');

// ---------- når vises låseskallet (sted × låst × modus × valg) ----------
const S = L.lockShown;
assert.equal(S({ wanted: true, stageLocked: true }), true, 'rutenett-sted, låst av forrige sted');
assert.equal(S({ wanted: true, playLocked: true }), true, 'rutenett-sted, låst av Hyllebroen');
assert.equal(S({ wanted: true }), false, 'ikke låst: vanlig skall');
assert.equal(S({ wanted: false, stageLocked: true }), false, 'klassisk sted har allerede det nye skallet (klassisk modus er aldri låst)');
assert.equal(S({ wanted: true, stageLocked: true, gridOn: true }), false, 'står i rutenett-modus: åpent');
assert.equal(S({ on: false, wanted: true, stageLocked: true }), false, 'Byggeskjerm av: alt uendret (gammel skjerm)');
assert.equal(S({ wanted: true, stageLocked: true, sim: true }), false);
assert.equal(S(), false); assert.equal(L.lockPhase({ wanted: true, stageLocked: true }), 'lock'); assert.equal(L.lockPhase({ wanted: true }), 'open');
assert.equal(L.unlocked('lock', 'open'), true); assert.equal(L.unlocked('open', 'open'), false); assert.equal(L.unlocked('open', 'lock'), false);

// ---------- hvilke knapper vises ----------
{ const c = L.lockControls({ hasSeries: true, hasPrev: true }); assert.deepEqual(c.shown, ['back', 'prev', 'next', 'more', 'go']);
  for (const k of ['mode', 'reset', 'undo', 'try', 'tray', 'mats', 'tools', 'share', 'code', 'figur', 'snap', 'rot', 'del']) { assert.ok(c.hidden.includes(k), k + ' skjult'); assert.ok(!c.shown.includes(k)); }
  assert.deepEqual(L.lockControls({ hasSeries: true, hasPrev: false }).shown, ['back', 'next', 'more', 'go']); assert.deepEqual(L.lockControls({}).shown, ['back', 'more', 'go'], 'enkeltsted (Kjøkkenbroen): ingen ◀ ▶'); }
assert.deepEqual(L.topOf({ series: null }), { prev: null, next: null });
{ const t = L.topOf({ series: { idx: 3, next: { id: 'lab5' } }, prevName: 'Vippe', nextName: 'Tau' }); assert.deepEqual(t, { prev: { name: 'Vippe' }, next: { name: 'Tau', locked: true } }); }
assert.equal(L.topOf({ series: { idx: 0, next: { id: 'b' } } }).prev, null);

// ---------- kortet ----------
{ const c = L.lockCard({ kind: 'stage', cur: { name: 'Fagverk', n: 4, of: 8 }, miss: { name: 'Vippe', n: 3, of: 8, id: 'lab3' }, siteId: 'lab4' });
  assert.equal(c.lineKey, 'blk.line'); assert.deepEqual(c.params, { name: 'Vippe', n: 3, of: 8, place: 'Fagverk' }); assert.deepEqual(c.go, { kind: 'site', id: 'lab3' }); assert.equal(c.goName, 'VIPPE'); assert.equal(c.canGo, true);
  assert.equal(c.log, 'låst sted vist: lab4, mangler Vippe'); assert.equal(L.goLog(c), 'låst sted: GÅ TIL Vippe'); }
{ const c = L.lockCard({ kind: 'play', cur: { name: 'Kjøkken' }, miss: { name: 'Hyllebroen', level: 'bro' } }); assert.equal(c.lineKey, 'blk.linePlay'); assert.deepEqual(c.go, { kind: 'level', id: 'bro' }); assert.equal(c.goName, 'HYLLEBROEN'); assert.equal(c.canGo, true); }
{ const c = L.lockCard({ kind: 'stage', cur: { name: 'X' }, miss: { name: 'Y', id: 'a' } }); assert.equal(c.lineKey, 'blk.lineNoN', 'uten nummer: ingen «(0/0)»'); }
{ const c = L.lockCard(null); assert.equal(c.canGo, false, 'ingen mål: knappen er av'); }

// ---------- DOM mot stubb ----------
function el(tag = 'div') {
  const e = { tag, dataset: {}, attrs: {}, _cls: new Set(), _l: {}, style: {}, textContent: '', hidden: false, disabled: false,
    classList: { toggle: (c, on) => { (on ? e._cls.add(c) : e._cls.delete(c)); }, add: (c) => e._cls.add(c), remove: (...c) => c.forEach((x) => e._cls.delete(x)), contains: (c) => e._cls.has(c) },
    setAttribute: (k, v) => { e.attrs[k] = v; }, addEventListener: (t, f) => { (e._l[t] ||= []).push(f); }, closest: (s) => (s === '[data-bl]' && e.dataset.bl ? e : null) };
  return e;
}
const map = {}; const sel = ['.blkname b', '.blkname i', '.blkname', '.blkt', '.blkh', '[data-bl="go"]', '[data-bl="prev"]', '[data-bl="next"]', '[data-bl="back"]', '[data-bl="more"]', '[data-bl="go2"]', '[data-bl="prev2"]', '[data-bl="menu"]', '[data-bl="close"]', '.blksheet'];
for (const s of sel) { map[s] = el(); const m = s.match(/data-bl="(\w+)"/); if (m) map[s].dataset.bl = m[1]; }
const box = el(); const root = el();
root.querySelector = (s) => (s === '.blkx' ? box : map[s.replace(/^\.blkx /, '')] ?? null);
const T = (k, a = {}) => k + (Object.keys(a).length ? '(' + Object.values(a).join(',') + ')' : '');
let state = null; const calls = [], logs = [], toasts = [];
const lock = V.createBuildLock({ root, T, logEv: (t, d) => logs.push([t, d]), toast: (m) => toasts.push(m), state: () => state, back: () => calls.push('back'), menu: () => calls.push('menu'), prev: () => calls.push('prev'), go: (c) => calls.push(['go', c.go.kind, c.go.id]), onUnlock: () => calls.push('unlock') });
const st = (o = {}) => ({ siteId: 'lab4', kind: 'stage', cur: { name: 'Fagverk', n: 4, of: 8 }, miss: { name: 'Vippe', n: 3, of: 8, id: 'lab3' }, series: { idx: 3, next: { id: 'lab5' } }, prevName: 'Vippe', nextName: 'Tau', ...o });
assert.equal(lock.frame(), false, 'uten tilstand: åpent'); assert.ok(!root._cls.has('blkon'));
state = st(); assert.equal(lock.frame(), true); assert.ok(root._cls.has('blkon'), 'klassen settes'); assert.equal(map['.blkt'].textContent, 'blk.line(Vippe,3,8,Fagverk)'); assert.equal(map['[data-bl="go"]'].textContent, 'blk.go(VIPPE)');
assert.equal(map['.blkname b'].textContent, 'Fagverk'); assert.equal(map['.blkname i'].textContent, '4/8 🔒'); assert.equal(map['[data-bl="prev"]'].hidden, false); assert.equal(map['[data-bl="next"]'].hidden, false);
assert.deepEqual(logs, [['bygg', 'låst sted vist: lab4, mangler Vippe']], 'logges én gang'); lock.frame(); lock.frame(); assert.equal(logs.length, 1, 'ikke per bilde');
// berøring stoppes
for (const ev of ['pointerdown', 'pointermove', 'touchstart', 'wheel']) assert.ok(box._l[ev]?.length, ev + ' stoppes av dekket');
const click = (k, t) => { const target = t || map[`[data-bl="${k}"]`]; for (const f of box._l.click) f({ target, stopPropagation() {} }); };
click('go'); assert.deepEqual(calls.pop(), ['go', 'site', 'lab3']); assert.deepEqual(logs.at(-1), ['bygg', 'låst sted: GÅ TIL Vippe']);
click('next'); assert.equal(toasts.at(-1), 'blk.nextLocked(Vippe)', '▶ forklarer låsen'); click('prev'); assert.equal(calls.pop(), 'prev'); click('back'); assert.equal(calls.pop(), 'back');
click('more'); assert.ok(root._cls.has('blkopen')); click('menu'); assert.equal(calls.pop(), 'menu'); assert.ok(!root._cls.has('blkopen')); click('more'); click('go2'); assert.deepEqual(calls.pop(), ['go', 'site', 'lab3']);
// annet sted: ny logg og nytt kort; Kjøkkenbroen (nivå)
state = st({ siteId: 'kjokken1', kind: 'play', cur: { name: 'Kjøkken', n: 0, of: 0 }, miss: { name: 'Hyllebroen', level: 'bro' }, series: null }); lock.frame();
assert.equal(map['.blkt'].textContent, 'blk.linePlay(Hyllebroen,0,0,Kjøkken)'); assert.equal(map['[data-bl="prev"]'].hidden, true); assert.equal(map['[data-bl="next"]'].hidden, true); assert.equal(logs.at(-1)[1], 'låst sted vist: kjokken1, mangler Hyllebroen');
click('go'); assert.deepEqual(calls.pop(), ['go', 'level', 'bro']);
// låsen forsvinner uten omstart
calls.length = 0; state = null; assert.equal(lock.frame(), false); assert.ok(!root._cls.has('blkon') && !root._cls.has('blkopen')); assert.deepEqual(calls, ['unlock']); assert.equal(logs.at(-1)[1], 'låst sted åpnet uten omstart');
lock.frame(); assert.deepEqual(calls, ['unlock'], 'bare én gang'); state = st(); lock.frame(); assert.ok(root._cls.has('blkon'), 'låses igjen ved nytt sted');
lock.reset(); assert.ok(!root._cls.has('blkon'));

// ---------- filer, CSS, tekster og hekter ----------
const html = fs.readFileSync('index.html', 'utf8'), main = fs.readFileSync('main.js', 'utf8'), bld = fs.readFileSync('build.js', 'utf8'), i18 = fs.readFileSync('i18n.js', 'utf8'), ch = fs.readFileSync('changes_data.js', 'utf8');
for (const m of ['buildlock_logic', 'buildlock_view']) assert.ok(html.includes(`'${m}'`), `${m} mangler i files`);
const css = V.blkCss(); for (const c of ['.bt.top', '.bt.bot', '.tray', '.share', '.lab', '.loads', '.zoom', '.tools', '.hint', '.bux', '.cbx']) assert.ok(css.includes(`#bld.blkon ${c}`), `gamle ${c} skjules`);
assert.ok(/blkon[^}]*display:none!important/.test(css));
for (const k of ['blk.title', 'blk.line', 'blk.lineNoN', 'blk.linePlay', 'blk.hint', 'blk.go', 'blk.prev', 'blk.nextAria', 'blk.nextLocked', 'blk.firstName']) assert.equal((i18.match(new RegExp(`'${k.replace('.', '\\.')}':`, 'g')) || []).length, 2, `${k} på norsk og engelsk`);
for (const w of ['TAB', 'tast', 'Enter', 'Space']) assert.ok(!new RegExp(`'blk\\.[a-zA-Z]+': '[^']*${w}`).test(i18.replace(/\n/g, ' ')) , 'ingen taster nevnt: ' + w);
assert.match(bld, /createBuildLock\(/); assert.match(bld, /blk\.frame\(\)/); assert.match(bld, /if \(blk\.on\(\)\) return false/, 'ingen PRØV mens låst'); assert.match(bld, /onGoLevel/); assert.match(main, /onGoLevel: \(id\) => goLevel\(id\)/);
assert.ok(ch.includes("id: 'r111-"), 'NYTT-rad (R83)');
console.log('test_buildlock ok');
