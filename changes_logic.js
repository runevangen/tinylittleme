// R83: «NYTT»-menyen (data i changes_data.js, visning i fixes_view.js som også brukes av Rettelser). Ren logikk uten DOM og nett, testes i node (test_changes.mjs).
// En rad ligner en rettelse: { id, version, message (= title), how, level, spot, at, check: 'ok'|'fail'|null, note, checked_at }, så sortering, faner og skjuling fra fixes_logic.js virker uten endring.
export const LOCAL_KEY = 'tlm.changechecks';
export const buttonLabel = (n) => (n > 0 ? `NYTT · ${n}` : 'NYTT');

const cleanCheck = (c) => (c && (c.check === 'ok' || c.check === 'fail') ? { check: c.check, note: c.check === 'fail' ? String(c.note || '').slice(0, 200) : '', checked_at: c.checked_at ? String(c.checked_at) : null } : null);
const ms = (t) => { const n = Date.parse(t); return Number.isFinite(n) ? n : 0; };

// Serverens svar fra tlm_my_change_checks → { id: {check, note, checked_at} } (tom ved ugyldig svar)
export function parseChangeChecks(d) {
  const out = {};
  if (!d || d.ok !== true || !Array.isArray(d.checks)) return out;
  for (const c of d.checks.slice(0, 200)) { const id = String(c?.id || ''), v = cleanCheck(c); if (id && v) out[id] = v; }
  return out;
}
// Lokale avkryssinger fra localStorage-teksten (aldri feil)
export function parseLocal(text) {
  let o; try { o = JSON.parse(text || '{}'); } catch { return {}; }
  const out = {}; if (!o || typeof o !== 'object') return out;
  for (const [id, c] of Object.entries(o)) { const v = cleanCheck(c); if (v) out[id] = v; }
  return out;
}
// Sammenslåing: den nyeste avkryssingen (checked_at) vinner; er de like, vinner serveren.
export function mergeChecks(server, local) {
  const out = { ...(server || {}) };
  for (const [id, c] of Object.entries(local || {})) { const s = out[id]; if (!s || ms(c.checked_at) > ms(s.checked_at)) out[id] = c; }
  return out;
}
// Lokale avkryssinger serveren ikke har (eller har en annen verdi for): disse sendes når tester-kode finnes.
export function pendingChecks(server, local) {
  const out = [];
  for (const [id, c] of Object.entries(local || {})) { const s = (server || {})[id]; if (!s || (s.check !== c.check && ms(c.checked_at) > ms(s.checked_at))) out.push({ id, ...c }); }
  return out;
}
// Radene til menyen: CHANGES (nyeste først i data) + avkryssinger.
export function buildRows(changes, checks) {
  return (changes || []).map((c, i) => {
    const k = (checks || {})[c.id];
    return { id: c.id, version: c.version, message: c.title, how: c.how, level: c.level || '', spot: c.spot || null, at: new Date(Date.parse(`${c.date}T12:00:00Z`) - i * 1000).toISOString(),   // like datoer holder rekkefølgen fra dataene
       check: k ? k.check : null, note: k ? k.note : '', checked_at: k ? k.checked_at : null };
  });
}
// Fra rader (etter avkryssing i visningen) tilbake til avkryssinger
export function checksFromRows(rows) {
  const out = {}; for (const r of rows || []) { const v = cleanCheck(r); if (v) out[r.id] = v; } return out;
}

// ---------- gyldighet av dataene (brukes i test) ----------
export function validateChanges(changes, { levelIds = [], changelog = '', now = Date.now() } = {}) {
  const errs = [], seen = new Set(); let prev = null;
  if (!Array.isArray(changes) || !changes.length) return ['CHANGES er tom'];
  for (const c of changes) {
    const w = `«${c?.id}»`;
    if (!c.id || typeof c.id !== 'string' || c.id.length > 40 || !/^[a-z0-9-]+$/.test(c.id)) errs.push(`${w}: id må være ≤ 40 tegn (a–z, 0–9, -)`);
    if (seen.has(c.id)) errs.push(`${w}: id er brukt to ganger`); seen.add(c.id);
    if (!/^\d+\.\d+$/.test(String(c.version))) errs.push(`${w}: version må være på formen 2.36`);
    else if (changelog && !new RegExp(`\\*\\*${String(c.version).replace('.', '\\.')}\\*\\*`).test(changelog)) errs.push(`${w}: versjon ${c.version} står ikke i CHANGELOG.md`);
    const t = /^\d{4}-\d{2}-\d{2}$/.test(String(c.date)) ? Date.parse(c.date + 'T00:00:00Z') : NaN;
    if (!Number.isFinite(t) || new Date(t).toISOString().slice(0, 10) !== c.date) errs.push(`${w}: ugyldig dato`);
    else { if (prev !== null && t > prev) errs.push(`${w}: ikke nyeste først`); prev = t; if (t > now + 86400000) errs.push(`${w}: datoen er i fremtiden`); }
    if (!String(c.title || '').trim()) errs.push(`${w}: title er tom`);
    if (!String(c.how || '').trim()) errs.push(`${w}: how er tom`);
    if (c.level && !levelIds.includes(c.level)) errs.push(`${w}: ukjent brett «${c.level}»`);
    if (c.spot !== null && c.spot !== undefined && !(c.spot && [c.spot.x, c.spot.y, c.spot.z].every((v) => typeof v === 'number' && Number.isFinite(v)))) errs.push(`${w}: ugyldig spot`);
    if (c.spot && !c.level) errs.push(`${w}: spot uten brett`);
  }
  return errs;
}
