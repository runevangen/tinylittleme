// node test_buildnext.mjs: R107, «Neste sted» tydelig i byggeren: ren logikk (buildnext_logic.js), DOM mot en stubb (buildnext_view.js), filer, ⚙-valg, tekster og hekter.
// Ekte berøring og bilder (iPhone 14, stående og liggende): node tools/live_buildnext.cjs <utmappe> (Playwright).
import fs from 'node:fs';
import assert from 'node:assert/strict';
const L = await import('./buildnext_logic.js'), V = await import('./buildnext_view.js');

// ---------- rekka av steder ----------
const sites = Array.from({ length: 8 }, (_, i) => ({ id: `lab${i + 1}` }));
{ const s = L.seriesOf(sites, 'lab1'); assert.equal(s.n, 1); assert.equal(s.of, 8); assert.equal(s.next.id, 'lab2'); assert.equal(s.nextN, 2); assert.equal(s.last, false);
  const e = L.seriesOf(sites, 'lab8'); assert.equal(e.next, null); assert.equal(e.last, true); assert.equal(e.nextN, 0, 'ingen rundt-runde');
  assert.equal(L.seriesOf([{ id: 'a' }], 'a'), null, 'ett sted = ingen rekke'); assert.equal(L.seriesOf(sites, 'finnesikke'), null); assert.equal(L.seriesOf(null, 'a'), null); }

// ---------- faser ----------
assert.equal(L.phaseOf({ sim: false }), 'bygger'); assert.equal(L.phaseOf({ sim: true, done: false }), 'prøver');
assert.equal(L.phaseOf({ sim: true, done: true }), 'resultat'); assert.equal(L.phaseOf({ sim: true, done: true, replaying: true }), 'replay');

// ---------- topplinjen: ▶ (åpen), 🔒 (låst), skjult (siste sted / vanlig brett) ----------
const s1 = L.seriesOf(sites, 'lab1'), s8 = L.seriesOf(sites, 'lab8');
assert.deepEqual(L.topNext({ series: s1, nextLocked: false }), { state: 'open' }); assert.deepEqual(L.topNext({ series: s1, nextLocked: true }), { state: 'locked' });
assert.equal(L.topNext({ series: s8, nextLocked: false }), null); assert.equal(L.topNext({ series: null }), null);

// ---------- resultatkortet i alle tilstander ----------
const base = { phase: 'resultat', won: true, solved: true, over: false, loadMore: false, series: s1, nextLocked: false, allDone: false };
const B = (o) => L.buttonsOf({ ...base, ...o });
assert.deepEqual(B({ phase: 'bygger' }).card, [], 'bygger: ingen kort'); assert.deepEqual(B({ phase: 'prøver' }).card, [], 'prøver: ingen kort'); assert.deepEqual(B({ phase: 'replay' }).card, []);
assert.deepEqual(B({}).card, ['next', 'again'], 'bestått, ikke siste: NESTE STED + PRØV IGJEN'); assert.equal(B({}).kind, 'passed'); assert.equal(B({}).top, 'open');
assert.deepEqual(B({ won: false }).card, ['again'], 'ikke bestått: bare PRØV IGJEN'); assert.equal(B({ won: false }).kind, 'failed');
assert.deepEqual(B({ over: true }).card, ['again']); assert.equal(B({ over: true }).kind, 'over');
assert.deepEqual(B({ solved: false }).card, ['again']); assert.equal(B({ solved: false }).kind, 'more');
assert.deepEqual(B({ series: s8, allDone: true }).card, ['finish', 'again'], 'siste sted: FERDIG'); assert.equal(L.cardOf({ ...base, series: s8, allDone: true }).final, true); assert.equal(L.cardOf({ ...base, series: s8, allDone: false }).final, false);
assert.equal(B({ series: s8 }).top, null, 'siste sted: ingen ▶ i topplinjen');
assert.deepEqual(B({ series: null }).card, ['back', 'again'], 'vanlig brett: TILBAKE TIL SPILLET som primær'); assert.equal(B({ series: null }).top, null);
assert.deepEqual(B({ nextLocked: true }).card, ['finish', 'again'], 'låst neste (bør ikke skje etter bestått): ingen NESTE STED'); assert.equal(B({ nextLocked: true }).top, 'locked');
assert.equal(L.cardOf(null), null);
for (const c of [{ kind: 'passed' }, { kind: 'passed', final: true }, { kind: 'over' }, { kind: 'more' }, { kind: 'failed' }]) assert.ok(L.titleKey(c).startsWith('bn.'));
assert.equal(L.primaryKey('next'), 'bn.next'); assert.equal(L.primaryKey('again'), 'bn.again');
// neste stjerne
assert.equal(L.starLine(3, { cost: 9, parts: 3 }), null); assert.equal(L.starLine(2, null), null); assert.deepEqual(L.starLine(2, { cost: 120, parts: 14 }), { cost: 120, parts: 14 }); assert.equal(L.starLine(1, { cost: NaN }), null);
{ const u = L.createUse(); u.hit(); u.hit(); assert.equal(u.n, 2); assert.equal(u.take(), 2); assert.equal(u.take(), 0); }

// ---------- DOM mot stubb ----------
const html = fs.readFileSync('index.html', 'utf8'), main = fs.readFileSync('main.js', 'utf8'), bld = fs.readFileSync('build.js', 'utf8'), i18 = fs.readFileSync('i18n.js', 'utf8'), docs = fs.readFileSync('docs/INNSTILLINGER.md', 'utf8');
function el(tag = 'div') {
  const e = { tag, children: [], dataset: {}, attrs: {}, _cls: new Set(), _l: {}, innerHTML: '', className: '', style: {}, parentNode: null,
    classList: { toggle: (c, on) => { (on ? e._cls.add(c) : e._cls.delete(c)); }, add: (c) => e._cls.add(c), remove: (...c) => c.forEach((x) => e._cls.delete(x)), contains: (c) => e._cls.has(c) },
    setAttribute: (k, v) => { e.attrs[k] = v; }, addEventListener: (t, f) => { (e._l[t] ||= []).push(f); },
    appendChild: (c) => { e.children.push(c); c.parentNode = e; }, insertBefore: (c, ref) => { const i = e.children.indexOf(ref); e.children.splice(i < 0 ? e.children.length : i, 0, c); c.parentNode = e; },
    querySelector: (s) => e._q?.(s) ?? null, querySelectorAll: (s) => e._qa?.(s) ?? [] };
  return e;
}
globalThis.document = { createElement: (t) => el(t) };
const root = el(), res = el(), top1 = el(), top2 = el(), more1 = el(), more2 = el();
top1.querySelector = (s) => (s.includes('bxmore') ? more1 : null); top2.querySelector = (s) => (s.includes('bxmore') ? more2 : null);
top1.children.push(more1); top2.children.push(more2);
root.querySelector = (s) => (s === '.bnres' ? res : null); root.querySelectorAll = (s) => (s === '.bxtop,.cxtop' ? [top1, top2] : []);
const T = (k, a = {}) => k + (Object.keys(a).length ? '(' + Object.values(a).join(',') + ')' : '');
let state = null; const calls = [], logs = [];
const bn = V.createBuildNext({ root, T, logEv: (t, d) => logs.push([t, d]), toast: (m) => calls.push(['toast', m]), state: () => state, goNext: (h) => { calls.push(['next', h]); return true; }, again: () => calls.push(['again']), back: () => calls.push(['back']) });
assert.equal(top1.children[0].className, 'bnnext', 'topp-knappen settes inn før ⋯'); assert.equal(top1.children[1], more1); assert.equal(top2.children[0].className, 'bnnext');
const mk = (o) => ({ skin: 'on', series: s1, nextLocked: false, topState: 'open', nextName: 'Trapp', curName: 'Bro', prevName: '', phase: 'bygger', stars: 0, ...o });
state = mk({}); bn.frame(); assert.ok(root._cls.has('bnser') && !root._cls.has('bnshow')); assert.match(top1.children[0].innerHTML, /▶/); assert.match(top1.children[0].innerHTML, /Trapp/); assert.match(top1.children[0].attrs['aria-label'], /bn\.topAria/);
state = mk({ topState: 'locked' }); bn.frame(); assert.match(top1.children[0].innerHTML, /🔒/); assert.ok(top1.children[0].classList.contains('lock') || top1.children[0]._cls.has('lock'));
state = mk({ series: s8, topState: null, nextName: '' }); bn.frame(); assert.ok(!root._cls.has('bnser'), 'siste sted: ingen topp-knapp');
state = mk({ skin: null }); bn.frame(); assert.ok(!root._cls.has('bnser') && !root._cls.has('bnshow'), 'gammel skjerm: ingenting');
state = null; bn.frame(); assert.ok(!root._cls.has('bnshow'));
state = mk({ phase: 'resultat', won: true, solved: true, over: false, stars: 2, nextStar: { cost: 120, parts: 14 } }); bn.frame();
assert.ok(root._cls.has('bnshow')); assert.match(res.innerHTML, /data-bn="next"/); assert.match(res.innerHTML, /bn\.nextSub\(Trapp,2,8\)/); assert.match(res.innerHTML, /★★☆/); assert.match(res.innerHTML, /bn\.starHint/); assert.match(res.innerHTML, /data-bn="again"/);
assert.ok(logs.some((l) => /resultatkort passed med NESTE STED/.test(l[1])));
state = mk({ phase: 'resultat', won: true, solved: true, stars: 3, nextStar: null }); bn.frame(); assert.ok(!/bn\.starHint/.test(res.innerHTML), 'tre stjerner: ingen stjernelinje');
state = mk({ phase: 'resultat', won: false }); bn.frame(); assert.match(res.className, /bad/); assert.ok(!/data-bn="next"/.test(res.innerHTML)); assert.match(res.innerHTML, /data-bn="again"/);
state = mk({ phase: 'resultat', won: true, solved: true, series: null, topState: null, stars: 1 }); bn.frame(); assert.match(res.innerHTML, /data-bn="back"/); assert.match(res.innerHTML, /bn\.back/);
state = mk({ phase: 'resultat', won: true, solved: true, series: s8, topState: null, allDone: true, stars: 3 }); bn.frame(); assert.match(res.innerHTML, /data-bn="finish"/); assert.match(res.innerHTML, /bn\.allDone/);
state = mk({ phase: 'prøver' }); bn.frame(); assert.ok(!root._cls.has('bnshow'), 'kortet skjules når en ny prøve starter');
// klikk
const click = (k) => { const ev = { target: { closest: () => ({ dataset: { bn: k } }) }, stopPropagation() {}, preventDefault() {} }; root._l.click.at(-1)(ev); };
calls.length = 0; logs.length = 0; state = mk({ phase: 'resultat', won: true, solved: true });
click('next'); assert.deepEqual(calls[0], ['next', 'resultatknapp']); assert.ok(logs.some((l) => l[0] === 'bygglab' && l[1] === 'neste sted via resultatknapp'));
click('again'); assert.deepEqual(calls[1], ['again']); assert.ok(logs.some((l) => l[0] === 'bygg' && l[1] === 'prøv igjen via resultatknapp'));
click('back'); assert.deepEqual(calls[2], ['back']); assert.equal(bn.takeUsed(), 3, 'teller i prøve-linjen'); assert.equal(bn.takeUsed(), 0);
calls.length = 0; state = mk({ topState: 'open' }); click('top'); assert.deepEqual(calls[0], ['next', 'topplinje']);
calls.length = 0; state = mk({ topState: 'locked' }); click('top'); assert.equal(calls[0][0], 'toast'); assert.match(calls[0][1], /bn\.lockedMsg\(Bro,Trapp\)/); assert.ok(!calls.some((c) => c[0] === 'next'), 'låst: går ikke videre');
bn.reset(); assert.ok(!root._cls.has('bnshow') && !root._cls.has('bnser'));

// ---------- CSS: trykkflater, skall, liggende, ingen taster ----------
{ const css = V.bnCss(), mk2 = V.bnMarkup();
  assert.match(css, /\.bnp\{min-height:54px/); assert.match(css, /\.bnq\{min-height:48px/); assert.match(css, /\.bnnext\{[^}]*height:48px/);
  assert.match(css, /#bld\.bnshow\.bux \.bux \.bxgo,#bld\.bnshow\.cbx \.cbx \.cxgo\{display:none!important\}/, 'resultatkortet erstatter PRØV-raden');
  assert.match(css, /#bld\.bux\.bxland \.bnres/); assert.match(css, /#bld\.cbx\.cxland \.bnres/); assert.match(css, /#bld\.bux\.bxland \.bnnext/); assert.match(css, /#bld\.cbx\.cxland \.bnnext/);
  assert.match(mk2, /class="bnres"`?|class="bnres"/); }
// tekster finnes på begge språk og nevner ikke taster
for (const k of ['bn.next', 'bn.nextSub', 'bn.again', 'bn.back', 'bn.finish', 'bn.passed', 'bn.failed', 'bn.over', 'bn.more', 'bn.allDone', 'bn.starHint', 'bn.topAria', 'bn.topLocked', 'bn.lockedMsg']) assert.equal(i18.split(`'${k}'`).length - 1, 2, `${k} på begge språk`);
assert.ok(!/\b(tast|taster|tastatur|Enter|mellomrom)\b/i.test(i18.match(/'bn\.next'.*\n/)[0]), 'ingen taster');
// filer, valg, hekter
for (const m of ['buildnext_logic', 'buildnext_view']) assert.ok(html.includes(`'${m}'`), `${m} mangler i files`);
assert.match(main, /fl\('buildnext', 'spill'/); assert.ok(main.includes('getBuildNext: () => buildNext'));
assert.ok(bld.includes('createBuildNext(') && bld.includes('bnMarkup()') && bld.includes('bnCss()') && bld.includes('bn.frame()') && bld.includes('siteGoTo(') && bld.includes('bn.takeUsed()'), 'build.js hekter');
assert.ok(docs.includes('buildnext'), 'docs/INNSTILLINGER.md');
console.log('test_buildnext ok');
