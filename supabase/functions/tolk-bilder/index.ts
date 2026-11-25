// «tolk-bilder» (R151, R164, R179): tar 2–4 nedskalerte bilder fra en tester, kaller Claude og svarer med en scene.
// Asynkron: POST starter en jobb ({ ok, job }) og gjør tolkningen i bakgrunnen (EdgeRuntime.waitUntil); telefonen spør etter jobben.
// Hemmeligheten tinylittleme_Claude_API_KEY finnes bare her på serveren. Bilder lagres aldri. Kvote og av-bryter ligger i databasen.
// Modell og modus kan settes i tlm_le_settings (nøklene «model» og «mode»). Logikken ligger i _shared/leveleditor_logic.js.
// Utlegging (i dag gjort via Supabase-verktøyet): filene ligger flatt ved siden av index.ts, og kinds/validate/generated er korte kopier.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { handleJobRequest, LE, JOB, REASONS } from '../_shared/leveleditor_logic.js';
import { validateScene } from '../_shared/validate_scene.js';
import { PROMPT, SCHEMA } from '../_shared/generated.js';

// R183: ingen stram tidsgrense: tjenesten gir seg ikke selv; jobber regnes som døde først etter 12 min
LE.budgetMs = 540000; JOB.staleMs = 12 * 60 * 1000;

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

function findKey(): string {
  const env = Deno.env.toObject();
  const exact = env['tinylittleme_Claude_API_KEY'];
  if (exact && exact.trim()) return exact.trim();
  for (const [n, v] of Object.entries(env)) if (n.trim().toLowerCase() === 'tinylittleme_claude_api_key' && v && v.trim()) return v.trim();
  return '';
}

const RAW = 'https://raw.githubusercontent.com/runevangen/tinylittleme/main/';
let spec: { at: number; prompt: string; schema: unknown; src: string } = { at: 0, prompt: PROMPT, schema: SCHEMA, src: 'innebygd' };
async function loadSpec() {
  if (spec.src === 'repo' && Date.now() - spec.at < 5 * 60 * 1000) return spec;
  try {
    const [p, s] = await Promise.all([fetch(RAW + 'docs/VISJON_PROMPT.md'), fetch(RAW + 'docs/scene.schema.json')]);
    if (p.ok && s.ok) {
      const prompt = await p.text(), schema = await s.json();
      if (prompt.length > 4000 && prompt.length < 60000 && prompt.includes('lever_scene') === false && schema && (schema as { properties?: unknown }).properties) spec = { at: Date.now(), prompt, schema, src: 'repo' };
    }
  } catch (_e) { /* beholder reserven */ }
  return spec;
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (req.method !== 'POST') return json(405, { ok: false, reason: 'metode', message: REASONS.metode.text });
    const len = Number(req.headers.get('content-length') || 0);
    if (len > LE.maxBodyBytes) return json(413, { ok: false, reason: 'for_stor', message: REASONS.for_stor.text });
    let body: unknown;
    try { body = await req.json(); } catch { return json(400, { ok: false, reason: 'bilder', message: REASONS.bilder.text }); }
    const key = findKey();
    if (!key) { console.error('mangler API-nøkkel'); return json(500, { ok: false, reason: 'feil', message: REASONS.feil.text, detail: 'secret' }); }
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
    const isStart = !!body && typeof body === 'object' && (body as { job?: unknown }).job === undefined;
    let model = LE.model, mode = LE.mode, sp = spec;
    if (isStart) {
      const m = await db.from('tlm_le_settings').select('key, value').in('key', ['model', 'mode']);
      for (const row of ((m.data || []) as { key: string; value: unknown }[])) {
        if (row.key === 'model' && typeof row.value === 'string' && /^[a-z0-9._-]{3,60}$/i.test(row.value)) model = row.value;
        if (row.key === 'mode' && typeof row.value === 'string' && (LE.modes as string[]).includes(row.value)) mode = row.value;
      }
      sp = await loadSpec();
      console.log('tolkning: modell', model, '· modus', mode, '· instruks', sp.src, sp.prompt.length, 'tegn');
    }
    const jobs = {
      createJob: async (code: string) => {
        await db.from('tlm_le_jobs').delete().lt('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());
        const r = await db.from('tlm_le_jobs').insert({ tester_code: code }).select('id').single();
        return r.data ? (r.data as { id: string }).id : null;
      },
      finishJob: async (id: string, result: unknown) => { await db.from('tlm_le_jobs').update({ status: 'ferdig', result }).eq('id', id); },
      getJob: async (id: string, code: string) => {
        const r = await db.from('tlm_le_jobs').select('status, result, created_at').eq('id', id).eq('tester_code', code).maybeSingle();
        if (!r.data) return null;
        const d = r.data as { status: string; result: unknown; created_at: string };
        return { status: d.status, result: d.result, age_ms: Date.now() - new Date(d.created_at).getTime() };
      },
      waitUntil: (p: Promise<unknown>) => {
        const er = (globalThis as unknown as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } }).EdgeRuntime;
        if (er && er.waitUntil) er.waitUntil(p); else p.catch(() => {});
      },
      tolk: {
        system: sp.prompt, schema: sp.schema, model, mode,
        reserve: (code: string, photos: number) => db.rpc('tlm_le_reserve', { p_code: code, p_photos: photos }),
        finish: (f: Record<string, unknown>) => db.rpc('tlm_le_finish', { p_id: f.id, p_ok: f.ok, p_cost: f.cost, p_ms: f.ms, p_warnings: f.warnings, p_bot: f.bot, p_reason: f.reason }),
        callClaude: async (reqBody: unknown) => {
          const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify(reqBody) });
          if (!r.ok) { const t = await r.text(); console.error('claude', r.status, t.slice(0, 300)); throw new Error('claude ' + r.status + ' ' + t.slice(0, 200)); }
          return await r.json();
        },
        validate: validateScene,
        check: () => ({ ran: false, why: 'edge' }),
      },
    };
    const out = await handleJobRequest(body as never, jobs as never);
    return json(out.status, out.body);
  } catch (e) {
    const m = String((e as Error)?.message || e).slice(0, 300);
    console.error('uventet feil', m);
    return json(500, { ok: false, reason: 'feil', message: REASONS.feil.text, detail: m });
  }
});
