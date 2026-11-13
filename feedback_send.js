// «Send til Claude»: sender tilbakemeldinger direkte fra spillet til tabellen tlm_feedback i Supabase.
// Ren logikk (ingen DOM) så den kan testes i node. Nøkkelen er den offentlige anon-nøkkelen: den kan KUN sette inn nye rader
// (RLS), og bare med en gyldig tester-kode; den kan ikke lese noe. Se docs/TILBAKEMELDING.md.
export const FEEDBACK = {
  url: 'https://pthpjpxfbfvgoqkqxotj.supabase.co',
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0aHBqcHhmYmZ2Z29xa3F4b3RqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ0NTY3ODksImV4cCI6MjExMDAzMjc4OX0.rNd7qbcafvq6H9sJSr4NnvbVhnix0GaozGXV5MzbTNc',
  table: 'tlm_feedback',
};
export const LIMITS = { version: 20, level: 40, body: 4000, report: 60000, ua: 300 };
export const KINDS = ['feil', 'ide', 'vurdering', 'rapport'];
export const CODE_RE = /^[a-z0-9_-]{4,24}$/;   // små bokstaver (koden gjøres om til små bokstaver), 4–24 tegn

export const cleanCode = (s) => String(s ?? '').trim().toLowerCase();   // «Rune», «rune » og «RUNE» er samme kode
export const validCode = (s) => CODE_RE.test(cleanCode(s));

const cut = (v, n) => String(v ?? '').slice(0, n);

// Bygger raden som sendes. Kutter til grensene databasen har, og krever minst tekst eller rapport.
export function buildPayload({ code, version, level, kind = 'rapport', body = '', report = '', ua = '' }) {
  const p = {
    tester_code: cleanCode(code),
    version: cut(version, LIMITS.version),
    level: cut(level, LIMITS.level),
    kind: KINDS.includes(kind) ? kind : 'rapport',
    body: cut(String(body).trim(), LIMITS.body),
    report: cut(report, LIMITS.report),
    ua: cut(ua, LIMITS.ua),
  };
  if (!validCode(p.tester_code)) return { error: 'kode' };
  if (!p.body && !p.report) return { error: 'tom' };
  return { row: p };
}

// Sender raden. fetchFn kan byttes ut i tester. Svar: { ok } eller { ok:false, reason: 'nett' | 'kode' | 'grense' | 'feil' }.
export async function sendFeedback(row, { fetchFn = globalThis.fetch, cfg = FEEDBACK, timeoutMs = 10000 } = {}) {
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctl ? setTimeout(() => ctl.abort(), timeoutMs) : null;
  try {
    const res = await fetchFn(`${cfg.url}/rest/v1/${cfg.table}`, {
      method: 'POST',
      headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(row),
      signal: ctl?.signal,
    });
    if (res.ok) return { ok: true };
    let txt = ''; try { txt = await res.text(); } catch { /* ingen tekst */ }
    if (res.status === 401 || res.status === 403) return { ok: false, reason: 'kode', status: res.status };
    if (/for mange meldinger/i.test(txt)) return { ok: false, reason: 'grense', status: res.status };
    return { ok: false, reason: 'feil', status: res.status };
  } catch {
    return { ok: false, reason: 'nett', status: 0 };
  } finally { if (timer) clearTimeout(timer); }
}

export const REASON_TEXT = {
  kode: 'Koden ble ikke godtatt. Sjekk tester-koden i ⚙ → Test.',
  grense: 'Du har sendt mange meldinger nå. Prøv igjen om en stund.',
  nett: 'Ingen nett akkurat nå. Tilbakemeldingen ligger klar; prøv igjen når du er på nett.',
  feil: 'Kunne ikke sende. Prøv igjen, eller bruk «Kopier tilbakemeldinger».',
  tom: 'Det er ingenting å sende ennå. Skriv noe eller marker en feil først.',
};

// ---------- svar fra Claude + tellere (R36) ----------
// Innboksen hentes med en sikker funksjon i Supabase (tlm_my_inbox) som bare gir tall og svartekster til den som har koden.
export async function rpc(name, args, { fetchFn = globalThis.fetch, cfg = FEEDBACK, timeoutMs = 8000 } = {}) {
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctl ? setTimeout(() => ctl.abort(), timeoutMs) : null;
  try {
    const res = await fetchFn(`${cfg.url}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args), signal: ctl?.signal,
    });
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, data: await res.json() };
  } catch { return { ok: false, status: 0 }; } finally { if (timer) clearTimeout(timer); }
}

const num = (v) => (Number.isFinite(+v) && +v >= 0 ? Math.floor(+v) : 0);
// Gjør svaret fra serveren trygt å vise (kutter lengde, tvinger tall og tekst)
export function parseInbox(d) {
  if (!d || d.ok !== true) return null;
  const m = d.me || {}, a = d.all || {};
  return {
    me: { sent: num(m.sent), fixed: num(m.fixed), working: num(m.working) },
    all: { sent: num(a.sent), fixed: num(a.fixed), testers: num(a.testers) },
    replies: (Array.isArray(d.replies) ? d.replies : []).slice(0, 20).map((r) => ({
      id: String(r.id || ''), version: String(r.version || '').slice(0, 20), message: String(r.message || '').slice(0, 300), read: !!r.read, at: String(r.at || ''),
    })).filter((r) => r.id && r.message),
  };
}
export async function fetchInbox(code, opts) {
  const r = await rpc('tlm_my_inbox', { c: cleanCode(code) }, opts);
  if (!r.ok) return null;
  return parseInbox(r.data);
}
export async function markRead(code, ids, opts) {
  if (!ids?.length) return 0;
  const r = await rpc('tlm_mark_read', { c: cleanCode(code), ids }, opts);
  return r.ok ? num(r.data) : 0;
}
export const unreadReplies = (inbox) => (inbox?.replies || []).filter((r) => !r.read);

// Telleren som vises i ⚑-boksen: motiverer ved å vise at meldingene fører til noe. Ingen navn, bare tall.
export function statsLines(inbox) {
  if (!inbox) return [];
  const { me, all } = inbox, out = [];
  if (me.sent > 0) {
    const parts = [`Du har meldt ${me.sent}`, `${me.fixed} rettet`];
    if (me.working > 0) parts.push(`${me.working} under arbeid`);
    out.push(parts.join(' · '));
  } else out.push('Du har ikke meldt noe ennå. Trykk ⚑ → skriv → Send til Claude.');
  if (all.sent > 0 && all.testers > 1) out.push(`Sammen har dere meldt ${all.sent}, og ${all.fixed} er rettet`);
  return out;
}
