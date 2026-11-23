// R139: påkrevd bygg i Nivå 3 og 4. Scenen (`scenes/*.scene.json`) har den VANSKELIGE plasseringen (bygget må til). `required.easyPatch` er det som skal til for å få tilbake
// den lette scenen som nivået var før (valget buildrequired = av). Brukes av tools/scene2level.mjs (lager `required.easy` i brettet) og tools/make_variants.mjs (Nivå 6 lages av
// den lette Nivå 3-scenen, så Nivå 6 er uendret). Format: { objects: { set: { <id>: { <felt>: verdi | null (fjern) } }, del: [id], add: [objekt] }, top: { <nøkkel>: verdi | null } }.
import { EASY_SETS } from '../buildreq_logic.js';
const clone = (o) => JSON.parse(JSON.stringify(o));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function applyEasyPatch(scene, patch) {
  const s = clone(scene), p = patch || {}, ob = p.objects || {};
  for (const [id, set] of Object.entries(ob.set || {})) {
    const o = s.objects.find((q) => q.id === id); if (!o) throw new Error(`easyPatch: fant ikke ${id}`);
    for (const [k, v] of Object.entries(set)) { if (v === null) delete o[k]; else o[k] = clone(v); }
  }
  for (const id of ob.del || []) { const i = s.objects.findIndex((q) => q.id === id); if (i < 0) throw new Error(`easyPatch: del: fant ikke ${id}`); s.objects.splice(i, 1); }
  for (const o of ob.add || []) s.objects.push(clone(o));
  for (const [k, v] of Object.entries(p.top || {})) { if (v === null) delete s[k]; else s[k] = clone(v); }
  delete s.required;
  return s;
}

// motsatt vei: patchen som gjør `hard` om til `easy` (for generatoren i make_variants.mjs)
export function scenePatch(hard, easy) {
  const set = {}, del = [], add = [], top = {};
  const hid = new Map(hard.objects.map((o) => [o.id, o])), eid = new Map(easy.objects.map((o) => [o.id, o]));
  for (const [id, h] of hid) {
    const e = eid.get(id); if (!e) { del.push(id); continue; }
    if (same(h, e)) continue;
    const d = {}; for (const k of new Set([...Object.keys(h), ...Object.keys(e)])) if (!same(h[k], e[k])) d[k] = e[k] === undefined ? null : e[k];
    set[id] = d;
  }
  for (const [id, e] of eid) if (!hid.has(id)) add.push(e);
  for (const k of new Set([...Object.keys(hard), ...Object.keys(easy)])) {
    if (['objects', 'required', 'name', 'rev'].includes(k)) continue;
    if (!same(hard[k], easy[k])) top[k] = easy[k] === undefined ? null : easy[k];
  }
  return { objects: { ...(Object.keys(set).length ? { set } : {}), ...(del.length ? { del } : {}), ...(add.length ? { add } : {}) }, ...(Object.keys(top).length ? { top } : {}) };
}

// brettet: `required.easy` = det som skiller det lette brettet fra det vanskelige. Lister av ting (boksene, hintene …) som sett (fjernet/lagt til), alt annet erstattes (null = fjernes).
export function levelEasy(hardL, easyL) {
  const out = {};
  for (const k of new Set([...Object.keys(hardL), ...Object.keys(easyL)])) {
    if (['required', 'name', 'rev', 'report'].includes(k)) continue;
    const h = hardL[k], e = easyL[k];
    if (same(h, e)) continue;
    if (EASY_SETS.includes(k) && Array.isArray(h) && Array.isArray(e)) {
      const hs = h.map((x) => JSON.stringify(x)), es = e.map((x) => JSON.stringify(x)), pool = [...es], del = [];
      for (const x of hs) { const i = pool.indexOf(x); if (i >= 0) pool.splice(i, 1); else del.push(JSON.parse(x)); }
      const pool2 = [...hs], add = [];
      for (const x of es) { const i = pool2.indexOf(x); if (i >= 0) pool2.splice(i, 1); else add.push(JSON.parse(x)); }
      out[k] = { del, add };
    } else out[k] = e === undefined ? null : e;
  }
  return out;
}
