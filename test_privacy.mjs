// node test_privacy.mjs: R87 personvern. Tekst (nb og en), rapportfelt, enhetsstreng, hekter i main.js/index.html.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { makeT } from './i18n.js';
import { PRIV_SECTIONS, ALLOWED_REPORT_FIELDS, FORBIDDEN_RE, unknownFields, shortDevice, noteWanted, NOTE_KEY } from './privacy_logic.js';
import { createPrivacy } from './privacy_view.js';
import { buildPayload } from './feedback_send.js';
import { formatReport } from './settings_util.js';
const main = fs.readFileSync('main.js', 'utf8'), idx = fs.readFileSync('index.html', 'utf8');

// tekst: alle seksjoner finnes og er korte, på begge språk, uten juridisk tungt språk og uten taster
for (const lang of ['nb', 'en']) {
  const { T } = makeT(() => lang);
  for (const k of ['priv.title', 'priv.back', 'priv.btn', 'priv.intro', 'priv.note', 'priv.link']) assert.ok(T(k) !== k && T(k).length > 2, `${lang} ${k}`);
  let total = 0;
  for (const id of PRIV_SECTIONS) { const h = T(`priv.${id}.h`), b = T(`priv.${id}`); assert.ok(h !== `priv.${id}.h` && b !== `priv.${id}`, `${lang} ${id}`); assert.ok(b.length < 420, `kort ${id}`); total += b.length; }
  assert.ok(total < 1900, 'hele siden er kort');
  assert.ok(!/\b(GDPR|samtykke|juridisk)\b/i.test(PRIV_SECTIONS.map((i) => T(`priv.${i}`)).join(' ')), 'ikke juridisk');
}
const nb = makeT(() => 'nb').T;
const all = PRIV_SECTIONS.map((i) => nb(`priv.${i}`)).join(' ');
for (const w of ['SEND', 'tester-kode', 'enhetstype', 'innstillingene', 'e-post', 'sletting', 'Rune']) assert.ok(all.includes(w), `teksten nevner ${w}`);
assert.match(nb('priv.note'), /Sendes til utvikleren\. Ikke skriv navn eller andre personopplysninger\./);

// rapport: bare tillatte felt. Feltene hentes fra buildReportInfo() i main.js.
const src = main.slice(main.indexOf('function buildReportInfo'), main.indexOf('const reportText'));
const body = src.slice(src.indexOf('return {') + 8);
const keys = []; let depth = 0, cur = '';
for (const ch of body) { if ('{[('.includes(ch)) depth++; if ('}])'.includes(ch)) { if (depth === 0) break; depth--; } if (depth === 0 && ch === ',') { keys.push(cur); cur = ''; } else cur += ch; }
keys.push(cur);
const found = keys.map((k) => k.trim().match(/^(\w+)\s*:/)).filter(Boolean).map((m) => m[1]);
assert.ok(found.length >= 20, 'fant feltene: ' + found.join(','));
const extra = found.filter((k) => !ALLOWED_REPORT_FIELDS.includes(k));
assert.deepEqual(extra, [], 'rapporten har felt som ikke er tillatt/omtalt: ' + extra);
assert.ok(!FORBIDDEN_RE.test(found.join(' ')), 'ingen forbudte feltnavn');
assert.deepEqual(unknownFields({ version: 1, email: 'x' }), ['email']);
assert.ok(!/userAgent\.replace|userAgent\s*[,)]\s*\}/.test(src) && src.includes('shortDevice(navigator.userAgent)'), 'device er kuttet');
assert.ok(/ua: shortDevice\(navigator\.userAgent\)/.test(main), 'sendt ua er kuttet');
assert.ok(!/ua: navigator\.userAgent/.test(main));

// enhetsstreng
const iph = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
const adr = 'Mozilla/5.0 (Linux; Android 14; SM-S918B Build/UP1A) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';
const win = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0';
assert.equal(shortDevice(iph), 'iPhone · iOS 17.4 · Safari');
assert.equal(shortDevice(adr), 'Android 14 · Chrome'); assert.ok(!shortDevice(adr).includes('SM-'));
assert.equal(shortDevice(win), 'Windows · Edge');
assert.equal(shortDevice(''), 'ukjent enhet'); assert.equal(shortDevice(null), 'ukjent enhet');
for (const u of [iph, adr, win]) assert.ok(shortDevice(u).length < 40 && !/Mozilla|AppleWebKit|Build/.test(shortDevice(u)));
const row = buildPayload({ code: 'rune', body: 'x', ua: shortDevice(iph) }).row; assert.equal(row.ua, 'iPhone · iOS 17.4 · Safari');
// rapporten viser enheten kuttet
assert.ok(formatReport({ version: '1', level: 'l', when: 'n', device: shortDevice(iph), screen: 's', fps: 'f', preset: 'p', clock: 1, points: 0, pos: [0, 0, 0], state: 's', stats: { saves: 0, respawns: 0, broken: 0, resets: 0, hard: 0 }, changed: [], marks: [], events: [] }).includes('iPhone · iOS 17.4 · Safari'));

// linja før første sending
const mem = new Map(); const st = { get: (k, d) => (mem.has(k) ? mem.get(k) : d), set: (k, v) => mem.set(k, v) };
assert.ok(noteWanted(st)); assert.ok(!noteWanted(st, false)); st.set(NOTE_KEY, true); assert.ok(!noteWanted(st));

// DOM (minimal falsk document)
const mkEl = () => { const set = new Set(); const e = { children: [], _h: {}, style: {}, attrs: {}, classList: { add: (c) => set.add(c), remove: (c) => set.delete(c), contains: (c) => set.has(c) }, set className(v) { set.clear(); v.split(' ').filter(Boolean).forEach((c) => set.add(c)); }, setAttribute(k, v) { this.attrs[k] = v; }, appendChild(c) { this.children.push(c); return c; }, addEventListener(t, f) { this._h[t] = f; }, querySelector() { return this._btn || null; }, scrollTop: 0 }; return e; };
const doc = { head: mkEl(), body: mkEl(), createElement: () => { const e = mkEl(); e._btn = mkEl(); return e; } };
const logs = []; const pv = createPrivacy({ T: nb, logEv: (t, d) => logs.push([t, d]), doc });
assert.ok(!pv.isOpen()); pv.open('⚙'); assert.ok(pv.isOpen());
for (const id of PRIV_SECTIONS) assert.ok(pv.el.innerHTML.includes(`data-sec="${id}"`));
assert.ok(pv.el.innerHTML.includes('data-close'), 'TILBAKE-knapp');
assert.deepEqual(logs[0], ['personvern', 'åpnet fra ⚙']);
pv.el._h.click({ target: { closest: (s) => (s === '[data-close]' ? {} : null) } }); assert.ok(!pv.isOpen());
const host = mkEl(); const n = pv.note(host, '⚑'); assert.ok(n.innerHTML.includes('Sendes til utvikleren') && n.innerHTML.includes('PERSONVERN')); assert.equal(host.children.length, 1);

// hekter
assert.ok(idx.includes("'privacy_logic', 'privacy_view'"), 'modulene står i files i index.html');
assert.ok(main.includes('id="bPriv"') && main.includes("priv.open('⚙')"), 'PERSONVERN i ⚙');
assert.ok(main.includes("addPrivNote($('qprivhost'), '⚑')"), 'lenke i ⚑');
assert.ok(main.includes("fl('privnote', 'admin'"), 'innstilling');
assert.ok(main.includes("logEv('personvern'") || fs.readFileSync('privacy_view.js', 'utf8').includes("logEv('personvern'"));
assert.ok(fs.readFileSync('docs/TILBAKEMELDING.md', 'utf8').includes('Slette en testers data'), 'slettrutine i docs');
// R88: teksten om anonym statistikk stemmer med koden (tillatte hendelser og felt)
{
  const { EVENTS, ALLOWED_DATA_FIELDS } = await import('./stats_logic.js');
  const stx = fs.readFileSync('docs/STATISTIKK.md', 'utf8');
  for (const lang of ['nb', 'en']) { const { T } = makeT(() => lang); assert.ok(T('priv.stats.on') !== 'priv.stats.on' && T('priv.stats.off') !== 'priv.stats.off', `${lang} knapper`); assert.ok(!FORBIDDEN_RE.test(T('priv.stats')), `${lang} ingen forbudte ord i statistikktekst`); }
  const t = nb('priv.stats');
  for (const w of ['tilfeldig id', 'versjon', 'skjermstørrelse', 'tid', 'poeng', 'tilbake', 'byggeforsøk', 'bilder per sekund', 'feilmeldinger', 'IP', 'Slå av']) assert.ok(t.includes(w), `statistikktekst nevner ${w}`);
  assert.ok(!/tester-kode og/.test(t) || /uten tester-kode/.test(t), 'ikke koblet til tester-kode');
  for (const n of Object.keys(EVENTS)) assert.ok(stx.includes('`' + n + '`'), `docs nevner ${n}`);
  for (const f of ALLOWED_DATA_FIELDS) assert.ok(stx.includes('`' + f + '`'), `docs nevner feltet ${f}`);
  assert.ok(!ALLOWED_DATA_FIELDS.some((f) => FORBIDDEN_RE.test(f) || /^(pos|x|y|z|kode|code|tekst|navn)$/.test(f)), 'ingen personfelt');
  assert.ok(main.includes('createStatsNet') && idx.includes("'stats_logic', 'stats_net'"), 'hekter');
}
console.log('personvern-tester grønne');
