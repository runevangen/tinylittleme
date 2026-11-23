// R151: «tolk-bilder». Tar 2–4 nedskalerte bilder fra en tester, kaller Claude (bildeforståelse, strukturert utdata) og svarer med en scene.
// Hemmeligheten tinylittleme_Claude_API_KEY finnes bare her på serveren. Bilder lagres aldri. Kvote, månedstak og av-bryter ligger i
// databasen (tlm_le_reserve). Logikken ligger i _shared/leveleditor_logic.js (testet i test_leveleditor.mjs med stub).
// Deploy: supabase functions deploy tolk-bilder   (verify_jwt kan stå på: spillet sender anon-nøkkelen som Authorization)
import { createClient } from 'npm:@supabase/supabase-js@2';
import { handleTolk, LE, REASONS } from '../_shared/leveleditor_logic.js';
import { validateScene } from '../_shared/validate_scene.js';
import { PROMPT, SCHEMA } from '../_shared/generated.js';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return json(405, { ok: false, reason: 'metode', message: REASONS.metode.text });
  const len = Number(req.headers.get('content-length') || 0);
  if (len > LE.maxBodyBytes) return json(413, { ok: false, reason: 'for_stor', message: REASONS.for_stor.text });
  let body: unknown;
  try { body = await req.json(); } catch { return json(400, { ok: false, reason: 'bilder', message: REASONS.bilder.text }); }
  const key = Deno.env.get('tinylittleme_Claude_API_KEY');
  if (!key) return json(500, { ok: false, reason: 'feil', message: REASONS.feil.text });
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const out = await handleTolk(body as never, {
    system: PROMPT, schema: SCHEMA,
    reserve: (code: string, photos: number) => db.rpc('tlm_le_reserve', { p_code: code, p_photos: photos }),
    finish: (f: Record<string, unknown>) => db.rpc('tlm_le_finish', { p_id: f.id, p_ok: f.ok, p_cost: f.cost, p_ms: f.ms, p_warnings: f.warnings, p_bot: f.bot, p_reason: f.reason }),
    callClaude: async (reqBody: unknown) => {
      const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify(reqBody) });
      if (!r.ok) throw new Error('claude ' + r.status);
      return await r.json();
    },
    validate: validateScene,
    // scene2level og boten (fysikk) kjører i node (tools/scene_pipeline.mjs), ikke i edge-kjøringen: svaret merkes ran:false
    check: () => ({ ran: false, why: 'edge' }),
  } as never);
  return json(out.status, out.body);
});
