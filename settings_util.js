// Rene hjelpefunksjoner for innstillinger og testrapport (ingen DOM, så de kan testes i node).
// Selve innstillingslista (SETTINGS) bor i main.js, siden hver innstilling henger i variabler der.

// defs: [{id, label, def, get}] → liste over det som er endret fra standard
export function changedSettings(defs) {
  const out = [];
  for (const d of defs) {
    const v = d.get();
    if (!sameValue(v, d.def)) out.push({ id: d.id, label: d.label, value: v, def: d.def });
  }
  return out;
}
const sameValue = (a, b) => (typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) < 1e-6 : a === b);

// Eksport/import av innstillinger som tekst (kan limes inn i en melding og tilbake)
export const SETTINGS_TAG = 'tinylittleme-innstillinger';
export function exportSettings(defs, extra = {}) {
  const values = {};
  for (const d of defs) values[d.id] = d.get();
  return JSON.stringify({ tag: SETTINGS_TAG, ...extra, values });
}
// Returnerer {values} eller {error}. Ukjente nøkler og verdier av feil type hoppes over (rapporteres som `skipped`).
export function parseSettings(text, defs) {
  let o;
  try { o = JSON.parse(String(text).trim().replace(/^[^{]*/, '').replace(/[^}]*$/, '')); } catch { return { error: 'Ikke gyldig tekst' }; }
  if (!o || o.tag !== SETTINGS_TAG || typeof o.values !== 'object') return { error: 'Ikke innstillinger fra tinylittleme' };
  const values = {}, skipped = [];
  for (const [k, v] of Object.entries(o.values)) {
    const d = defs.find((x) => x.id === k);
    if (!d) { skipped.push(k); continue; }
    if (d.type === 'bool' && typeof v === 'boolean') values[k] = v;
    else if (d.type === 'range' && typeof v === 'number' && Number.isFinite(v)) values[k] = Math.min(d.max, Math.max(d.min, v));
    else if (d.type === 'select' && d.options.some(([val]) => val === v)) values[k] = v;
    else skipped.push(k);
  }
  return { values, skipped };
}

const fmt = (v) => (typeof v === 'number' ? String(+v.toFixed(3)) : typeof v === 'boolean' ? (v ? 'på' : 'av') : String(v));

// Testrapport som kan limes inn i en melding. info: se main.js (buildReportInfo).
export function formatReport(info) {
  const L = [];
  L.push(`tinylittleme testrapport · v${info.version} · ${info.level}`);
  L.push(`${info.when} · ${info.device}`);
  L.push(`Skjerm ${info.screen} · ${info.platform || (info.touch ? 'touch' : 'tastatur/mus')} · ${info.fps}`);
  L.push(`Hoppvalg: ${info.preset} · tid ${info.clock} s · poeng ${info.points}`);
  L.push(`Figuren: (${info.pos.join(', ')}) · ${info.state}${info.target ? ` · neste: ${info.target}` : ''}`);
  L.push(`Lagret ${info.stats.saves} · tilbake ${info.stats.respawns} · knust ${info.stats.broken} · nullstilt ${info.stats.resets} · hard landing ${info.stats.hard}${info.stats.flew ? ' · FLYMODUS BRUKT' : ''}`);
  L.push('');
  if (info.changed.length) {
    L.push(`Innstillinger endret fra standard (${info.changed.length}):`);
    for (const c of info.changed) L.push(`- ${c.label}: ${fmt(c.value)} (standard ${fmt(c.def)})`);
  } else L.push('Innstillinger: alle på standard');
  L.push('');
  if (info.marks.length) {
    L.push('Markert av testeren:');
    for (const m of info.marks) L.push(`- [${m.c} s] (${m.pos.join(', ')}) ${m.detail || '(ingen tekst)'}`);
    L.push('');
  }
  L.push(`Siste hendelser (${info.events.length}):`);
  for (const e of info.events) L.push(`${String(e.c).padStart(6)} s  ${e.type}${e.detail ? ' ' + e.detail : ''}  (${e.pos.join(', ')}) ${e.st}`);
  return L.join('\n');
}
