// node test_markrank.mjs: R66, markørbudsjett og rangering (markers_rank.js)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { MARK, budgetFor, angOff, score, selectMarkers, markerStyle, goalDirection, mergeByScreen, noteGrab } from './markers_rank.js';

// ---- budsjett etter hjelp-nivå ----
assert.equal(budgetFor('none'), 0); assert.equal(budgetFor('normal'), 3); assert.equal(budgetFor('much'), 6);
assert.equal(budgetFor('normal', { normal: 2 }), 2);

// ---- rangering: nærhet, kjegle, rute, brukt ----
const g = (id, o = {}) => ({ id, tier: 'grip', dist: 10, ang: 0, route: false, used: 0, prio: 0, ...o });
assert.ok(score(g('n', { dist: 3 })) > score(g('f', { dist: 18 })), 'nærmere gir høyere poeng');
assert.ok(score(g('a', { ang: 0.2 })) > score(g('b', { ang: 2.5 })), 'foran figuren (kjegle) gir høyere poeng enn bak');
assert.ok(score(g('r', { route: true })) > score(g('x')), 'på ruta gir høyere poeng');
assert.ok(score(g('fresh')) > score(g('worn', { used: 12 })), 'brukt ofte gir lavere poeng');
assert.ok(score(g('p', { prio: 1 })) > score(g('q')), 'prioritet teller');
assert.ok(Math.abs(angOff(1, 0, 1, 0)) < 1e-9 && Math.abs(angOff(1, 0, -1, 0) - Math.PI) < 1e-9 && Math.abs(angOff(1, 0, 0, 1) - Math.PI / 2) < 1e-9, 'angOff');
{ const sel = selectMarkers([g('a', { dist: 20 }), g('b', { dist: 2 }), g('c', { dist: 8, route: true })], {}, 6);
  assert.deepEqual(sel.picked.map((c) => c.id), ['c', 'b'], 'høyst 2 grep, beste først (rute + nærhet)'); assert.equal(sel.primary, 'c');
  assert.ok(sel.dropped.some((d) => d.id === 'a' && d.why === 'grep-tak')); }
{ const sel = selectMarkers([g('behind', { dist: 3, ang: 3 }), g('front', { dist: 6, ang: 0.1 })], {}, 1); assert.equal(sel.picked[0].id, 'front', 'kjegle: den foran slår den bak selv om den bak er nærmere'); }
{ const sel = selectMarkers([g('used', { dist: 5, used: 15 }), g('new', { dist: 6 })], {}, 1); assert.equal(sel.picked[0].id, 'new', 'ikke brukt ofte før'); }
// ---- nivåer: ett mål, budsjett teller målet, info bare nær/ulest/uten konkurranse ----
{ const goal = (id, o = {}) => ({ id, tier: 'goal', dist: 30, prio: 1, ...o });
  const sel = selectMarkers([goal('g1'), goal('g2', { prio: 0.5 }), g('a'), g('b', { dist: 12 }), g('c', { dist: 14 })], {}, 3);
  assert.equal(sel.picked.filter((c) => c.tier === 'goal').length, 1, 'ett mål om gangen'); assert.equal(sel.picked.length, 3, 'mål + 2 grep = budsjett 3'); assert.equal(sel.picked[0].tier, 'goal');
  const s2 = selectMarkers([goal('g1'), g('a'), g('b'), g('c')], {}, 2); assert.equal(s2.picked.length, 2, 'målet spiser av budsjettet'); }
{ const info = (id, o = {}) => ({ id, tier: 'info', dist: 5, read: false, ...o });
  assert.equal(selectMarkers([info(1)], {}, 3).picked.length, 1, 'ⓘ nær og ulest vises');
  assert.equal(selectMarkers([info(1, { read: true })], {}, 3).picked.length, 0, 'lest: ingen ⓘ');
  assert.equal(selectMarkers([info(1, { dist: 40 })], {}, 3).picked.length, 0, 'langt unna: ingen ⓘ');
  assert.equal(selectMarkers([info(1), g('a')], {}, 3).picked.map((c) => c.tier).join(), 'grip', 'grep konkurrerer: ingen ⓘ');
  assert.equal(selectMarkers([info(1), info(2)], {}, 3).picked.length, 1, 'bare én ⓘ'); }
assert.equal(selectMarkers([g('a'), { id: 'goal', tier: 'goal', dist: 5, prio: 1 }], {}, 0).picked.length, 0, 'Ingen = ingen verdensmarkører');
// ---- sammenslåing på skjermen ----
{ const sel = selectMarkers([g('a', { sx: 100, sy: 100, dist: 3 }), g('b', { sx: 150, sy: 120, dist: 8 }), g('c', { sx: 300, sy: 500, dist: 9 })], {}, 6);
  assert.deepEqual(sel.picked.map((c) => c.id), ['a', 'c'], 'markører nærmere enn 90 px slås sammen, høyest rang beholdes'); assert.ok(sel.dropped.some((d) => d.id === 'b' && d.why === 'slått sammen')); }
{ const m = mergeByScreen([{ id: 1, rank: 1, sx: 0, sy: 0 }, { id: 2, rank: 3, sx: 40, sy: 0 }, { id: 3, rank: 2, sx: 200, sy: 0 }]); assert.deepEqual(m.kept.map((c) => c.id), [2, 3]); assert.equal(m.gone[0].id, 1); }
{ const sel = selectMarkers([{ id: 'goal', tier: 'goal', dist: 9, prio: 1, sx: 200, sy: 300 }, g('a', { sx: 230, sy: 330 })], {}, 3); assert.deepEqual(sel.picked.map((c) => c.id), ['goal'], 'grep oppå målringen slås sammen bort'); }
// ---- demping ----
{ const near = markerStyle({ dist: 2, used: 0 }), far = markerStyle({ dist: 22, used: 0 });
  assert.ok(far.scale < near.scale && far.alpha < near.alpha, 'mindre og mer gjennomsiktig langt unna');
  const worn = markerStyle({ dist: 5, used: 10 }); assert.ok(worn.thin && worn.alpha < markerStyle({ dist: 5, used: 0 }).alpha, 'brukt mange ganger: tynn kontur');
  assert.ok(!markerStyle({ dist: 5, used: 10 }, { stalledMs: 31000 }).thin, 'etter 30 s uten framdrift: tydelig igjen');
  assert.ok(!markerStyle({ dist: 5, used: 10 }, { much: true }).thin, 'Mye hjelp: tydelig'); }
const use = {}; noteGrab(use, 'a'); noteGrab(use, 'a'); assert.equal(use.a, 2);
// ---- én retningsangivelse ----
assert.deepEqual(goalDirection({ inFrame: true, help: 'normal', show: true }), { ring: true, arrow: false, chevron: true }, 'i bildet: ring på målet, ingen pil');
assert.deepEqual(goalDirection({ inFrame: false, help: 'normal', show: true }), { ring: false, arrow: true, chevron: false }, 'utenfor bildet: pil, ikke chevron');
assert.deepEqual(goalDirection({ inFrame: false, help: 'none', show: true }), { ring: false, arrow: false, chevron: true }, 'Ingen: bare båndet');
for (const inF of [true, false]) for (const h of ['none', 'normal', 'much']) { const d = goalDirection({ inFrame: inF, help: h, show: true }); assert.ok(!(d.arrow && d.chevron), 'aldri pil og chevron samtidig'); assert.ok(d.arrow || d.chevron, 'alltid minst én retning'); }

// ---- 30 steder per nivå: budsjettet overskrides aldri og markører overlapper ikke på skjermen ----
const W = 390, H = 844, FOV = 52 * Math.PI / 180;
function project(p, cam) {                                                              // enkel perspektiv (stående iPhone), kamera bak figuren
  const dx = p[0] - cam.x, dy = p[1] - cam.y, dz = p[2] - cam.z, sy = Math.sin(cam.yaw), cy = Math.cos(cam.yaw);
  const lat = dx * cy - dz * sy, fwd = -dx * sy - dz * cy; if (fwd < 0.2) return null;
  const f = (H / 2) / Math.tan(FOV / 2), ndcY = dy * Math.cos(cam.pitch) - fwd * Math.sin(cam.pitch);
  const dep = fwd * Math.cos(cam.pitch) + dy * Math.sin(cam.pitch); if (dep < 0.2) return null;
  return { x: W / 2 + lat / dep * f, y: H / 2 - ndcY / dep * f };
}
let rnd = 12345; const rand = () => (rnd = (rnd * 16807) % 2147483647) / 2147483647;
const files = fs.readdirSync('levels').filter((f) => f.endsWith('.level.json')); assert.ok(files.length >= 6, 'nivåfiler funnet');
let spots = 0, maxByHelp = { none: 0, normal: 0, much: 0 }, maxGrip = 0;
for (const f of files) {
  const L = JSON.parse(fs.readFileSync('levels/' + f, 'utf8')), R = (L.route || []).filter((w) => !w.via), gripsB = (L.boxes || []).filter((b) => b.grip && !b.dyn && !b.parent);
  if (R.length < 2) continue;
  const routeIds = new Set(R.map((w) => w.id));
  for (let i = 0; i < 30; i++) {
    const w = R[i % R.length], nx = R[(i + 1) % R.length];
    const px = w.x0 + rand() * (w.x1 - w.x0), pz = w.z0 + rand() * (w.z1 - w.z0), py = w.top, yaw = Math.atan2(-(nx.x0 - px), -(nx.z0 - pz));
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw), cam = { x: px + Math.sin(yaw) * 6, y: py + 4, z: pz + Math.cos(yaw) * 6, yaw, pitch: 0.26 };
    const cands = [];
    gripsB.forEach((b, k) => {
      const c = [(b.min[0] + b.max[0]) / 2, b.max[1] + 0.55, (b.min[2] + b.max[2]) / 2], d = Math.hypot(px - c[0], pz - c[2], (py - c[1]) * 0.5); if (d >= MARK.gripRange) return;
      const s = project([c[0], Math.max(b.min[1] + 0.5, Math.min(b.max[1] + 0.5, py + 1.7)), c[2]], cam);
      cands.push({ id: b.id ?? 'g' + k, tier: 'grip', dist: d, ang: angOff(fx, fz, c[0] - px, c[2] - pz), route: routeIds.has(b.id), used: 0, prio: 0, sx: s?.x, sy: s?.y });
    });
    const gt = project([nx.x0, nx.top, nx.z0], cam); cands.push({ id: 'goal', tier: 'goal', dist: Math.hypot(nx.x0 - px, nx.z0 - pz), prio: 1, sx: gt && gt.x > 0 && gt.x < W && gt.y > 0 && gt.y < H ? gt.x : undefined, sy: gt?.y });
    for (const h of ['none', 'normal', 'much']) {
      const sel = selectMarkers(cands, {}, budgetFor(h)), b = budgetFor(h);
      assert.ok(sel.picked.length <= b, `${f} sted ${i} ${h}: ${sel.picked.length} > ${b}`);
      assert.ok(sel.picked.filter((c) => c.tier === 'grip').length <= MARK.maxGrip, `${f}: høyst 2 grep`);
      assert.ok(sel.picked.filter((c) => c.tier === 'goal').length <= 1, `${f}: ett mål`);
      const on = sel.picked.filter((c) => c.sx !== undefined);
      for (let a = 0; a < on.length; a++) for (let c = a + 1; c < on.length; c++) assert.ok(Math.hypot(on[a].sx - on[c].sx, on[a].sy - on[c].sy) >= MARK.merge, `${f} sted ${i} ${h}: to markører overlapper på skjermen`);
      maxByHelp[h] = Math.max(maxByHelp[h], sel.picked.length); maxGrip = Math.max(maxGrip, sel.picked.filter((c) => c.tier === 'grip').length);
    }
    spots++;
  }
}
assert.equal(maxByHelp.none, 0); assert.ok(maxByHelp.normal <= 3 && maxByHelp.much <= 6);
// ---- koblinger: modulen er med i index.html, innstillingene finnes ----
const idx = fs.readFileSync('index.html', 'utf8'); assert.ok(/'markers_rank'/.test(idx), 'markers_rank i files');
const main = fs.readFileSync('main.js', 'utf8'); for (const id of ['markrank', 'markbudn', 'markbudm', 'markmerge', 'markinfo', 'markwear', 'markstall', 'markcalm']) assert.ok(main.includes(`'${id}'`), `SETTINGS har ${id}`);
assert.ok(main.includes("logEv('markør', `rangert"), 'logEv ved bytte');
console.log(`markrank: ok (${spots} steder, maks Normal ${maxByHelp.normal}, Mye ${maxByHelp.much}, grep ${maxGrip})`);
