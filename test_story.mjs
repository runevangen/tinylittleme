// node test_story.mjs: fortelling og målseremoni (R8): tekster finnes for alle nivåer i begge språk, og logikken stemmer.
import assert from 'node:assert/strict';
import { makeT } from './i18n.js';
import { storyKey, fmtTime, shouldShowIntro, finishData, winHTML, STORY_LEVELS } from './story.js';

assert.equal(fmtTime(7.4), '7 s'); assert.equal(fmtTime(75), '1:15'); assert.equal(fmtTime(-3), '0 s');
assert.equal(storyKey(0), null); assert.equal(storyKey(7), null); assert.equal(storyKey(3), 'story.3');
assert.ok(shouldShowIntro({ n: 1, enabled: true, resumed: false }));
assert.ok(!shouldShowIntro({ n: 1, enabled: false, resumed: false }) && !shouldShowIntro({ n: 1, enabled: true, resumed: true }) && !shouldShowIntro({ n: undefined, enabled: true, resumed: false }));

let lang = 'nb'; const { T } = makeT(() => lang);
for (const l of ['nb', 'en']) {
  lang = l;
  for (let n = 1; n <= STORY_LEVELS; n++) {
    for (const k of [`story.title.${n}`, storyKey(n)]) assert.notEqual(T(k), k, `${l}:${k} mangler`);
    assert.ok(T(storyKey(n)).length < 140, 'kort tekst, ikke vegger');
    assert.ok(!/\b(trykk|tast)\s+(på\s+)?(mellomrom|space|E|F)\b/i.test(T(storyKey(n))), 'bruker knappenavn, ikke taster');
  }
  for (const k of ['story.go', 'story.skip', 'story.endTitle', 'story.end', 'story.endBtn', 'win.time', 'win.ants', 'win.crumbs', 'win.points', 'win.record', 'win.next', 'win.ending', 'win.again', 'win.all', 'win.top']) assert.notEqual(T(k), k, `${l}:${k}`);
}
const d = finishData({ n: 6, nextExists: false, clock: 83, stats: { squashed: 3 }, crumbs: 4, crumbTotal: 4, points: 900, prevBest: 800, flew: false });
assert.deepEqual([d.last, d.time, d.squashed, d.all, d.record], [true, '1:23', 3, true, true]);
assert.ok(!finishData({ n: 2, nextExists: true, clock: 5, stats: {}, crumbs: 0, crumbTotal: 0, points: 10, prevBest: 50 }).record);
assert.ok(!finishData({ n: 2, nextExists: true, clock: 5, stats: {}, crumbs: 0, crumbTotal: 0, points: 10, prevBest: 0, flew: true }).record, 'flymodus gir ingen rekord');
lang = 'nb'; const h = winHTML(d, T); assert.ok(h.includes('1:23') && h.includes('4/4 ★') && h.includes('900') && h.includes('Ny rekord!'));
assert.ok(!winHTML({ ...d, total: 0, record: false }, T).includes('Smuler'));
assert.equal(shouldShowIntro({ n: 1, enabled: true, resumed: false, seen: true }), false);
assert.equal(shouldShowIntro({ n: 1, enabled: true, resumed: false, seen: false }), true);
console.log('fortelling-tester grønne');
