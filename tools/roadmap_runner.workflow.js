export const meta = {
  name: 'roadmap-runner',
  description: 'Veikart-runner: bygg punkter (args.items) parallelt i worktrees, kritiker, integrasjon til main ett om gangen',
  phases: [{ title: 'Rydd' }, { title: 'Bygg' }, { title: 'Kritiker' }, { title: 'Integrer' }],
}
// Veikart-runner (tinylittleme). Start med Workflow({ scriptPath: 'tools/roadmap_runner.workflow.js', args: { items: [{ id: 'R39', deps: [] }] } }).
// Se docs/TILBAKEMELDING.md («Løpende behandling») og CLAUDE.md. Hver id må finnes som «### [ ] <id> · …» i docs/ROADMAP.md.
const ROUNDS = 6, PER_ROUND = 12, MAX_TRIES = 2
const REPO = '/home/user/tinylittleme'
// args.items = [{ id: 'R39', deps: [] }, …] i prioritert rekkefølge (tester-saker først). Maks 5 per kjøring anbefales.
const ITEMS = (Array.isArray(args?.items) ? args.items : []).map((i) => ({ id: String(i.id), deps: Array.isArray(i.deps) ? i.deps.map(String) : [] }))
if (!ITEMS.length) throw new Error('args.items mangler')
const BUILD = { type: 'object', properties: { ok: { type: 'boolean' }, summary: { type: 'string' } }, required: ['ok', 'summary'] }
const VERDICT = { type: 'object', properties: { approve: { type: 'boolean' }, issues: { type: 'array', items: { type: 'string' } } }, required: ['approve', 'issues'] }
const MERGE = { type: 'object', properties: { merged: { type: 'boolean' }, version: { type: 'string' }, note: { type: 'string' } }, required: ['merged', 'note'] }
const NOGPU = 'Miljøet har ingen GPU (swiftshader ~1 fps): krev IKKE målt FPS eller flimmer i bevegelse; godta statiske tegnekall-/trekantbudsjett som bevis, og at ekte FPS/følelse er merket «testes på iPhone» i CHANGELOG/ROADMAP. Underkjenn kun for reelle feil mot «Ferdig når» som kan verifiseres her.'

phase('Rydd')
await agent(`I ${REPO}: kjør \`git worktree prune\`, fjern gamle worktrees under /tmp/wt og gamle branches road/* som ikke er merget. Primærsjekken skal være ren; \`git fetch origin main\` og sørg for at HEAD inneholder origin/main. Svar kort.`, { phase: 'Rydd', effort: 'low' })

const done = new Set(), tries = {}
let chain = Promise.resolve()
const enqueue = fn => { const p = chain.then(fn); chain = p.catch(() => {}); return p }

for (let round = 1; round <= ROUNDS; round++) {
  const picks = ITEMS.filter(i => !done.has(i.id) && (tries[i.id] || 0) < MAX_TRIES && i.deps.every(d => done.has(d))).slice(0, PER_ROUND)
  if (!picks.length) { log('Ingen flere kjørbare punkter.'); break }
  log(`Runde ${round}: ${picks.map(p => p.id).join(', ')}`)
  picks.forEach(p => tries[p.id] = (tries[p.id] || 0) + 1)
  const results = await pipeline(picks,
    async it => {
      const wt = `/tmp/wt/${it.id}`, br = `road/${it.id}`
      return await agent(`Bygg veikartpunkt ${it.id} i ${REPO}/docs/ROADMAP.md (les seksjonen, «Regler for alle punkter» og CLAUDE.md). Lag eget worktree fra gjeldende HEAD i ${REPO}: \`git worktree add ${wt} -b ${br}\` (fjern først hvis det finnes) og jobb KUN der. Modulært, mobil først, SETTINGS + logEv, ny modul i files i index.html, tester, walk_route for endrede nivåer, npm test grønn, Playwright iPhone 14 og se på skjermbildet. ${NOGPU} IKKE øk versjon, ikke rør CHANGELOG/ROADMAP, ikke push. Commit på ${br}. Mislykkes det: ok=false med årsak.`, { label: `bygg ${it.id}`, phase: 'Bygg', schema: BUILD })
    },
    async (b, it) => {
      if (!b || !b.ok) return { it, ok: false, why: b ? b.summary : 'byggeagent feilet' }
      const wt = `/tmp/wt/${it.id}`
      let v = null
      for (let k = 0; k < 2; k++) {
        v = await agent(`Du er en streng kritiker. Gjennomgå ${it.id} i worktree ${wt} (branch road/${it.id}) mot «Ferdig når» i ${REPO}/docs/ROADMAP.md. Kjør npm test, walk_route for endrede nivåer, og Playwright iPhone 14 med skjermbilde du ser på. Sjekk: ingen konsollfeil, tekst nevner knapper ikke taster, SETTINGS/logEv/files i index.html, tester for ny logikk, ingen regresjon. ${NOGPU} Versjon/CHANGELOG/ROADMAP settes av integrasjonen, ikke krev dem. Ikke endre filer.`, { label: `kritiker ${it.id}`, phase: 'Kritiker', schema: VERDICT })
        if (v && v.approve) break
        if (k === 0 && v) await agent(`Rett disse funnene i worktree ${wt} (branch road/${it.id}) for ${it.id}, kjør npm test, commit: ${JSON.stringify(v.issues)}`, { label: `rett ${it.id}`, phase: 'Bygg', schema: BUILD })
      }
      if (!v || !v.approve) return { it, ok: false, why: v ? v.issues.join('; ') : 'kritiker feilet' }
      return await enqueue(async () => {
        const m = await agent(`Integrer road/${it.id} i primærsjekken ${REPO} (branch claude/intelligent-curie-4w2bti). Først \`git fetch origin main\` og slå sammen origin/main (en annen økt pusher også til main). Så \`git merge road/${it.id}\`, løs konflikter (behold begge sider). Sett VERSION i version.js til høyeste versjon på main + 0.01 (ikke gjenbruk et nummer), legg linje øverst i CHANGELOG.md, flytt ${it.id} til «Ferdige punkter» med versjon i docs/ROADMAP.md ([x]). npm test må være grønn (ellers abort og merged=false). Commit med attribusjonslinjene fra system-reminder, så \`git push origin HEAD:main\` (hent og slå sammen på nytt hvis avvist) og \`git push -u origin claude/intelligent-curie-4w2bti\`. Fjern worktree ${wt} og branch road/${it.id}.`, { label: `integrer ${it.id}`, phase: 'Integrer', schema: MERGE })
        return { it, ok: !!(m && m.merged), why: m ? m.note : 'integrasjon feilet', version: m && m.version }
      })
    })
  for (const r of results.filter(Boolean)) {
    if (r.ok) { done.add(r.it.id); log(`✓ ${r.it.id} ${r.version || ''}`) } else log(`✗ ${r.it.id}: ${r.why}`)
  }
}
return { ferdig: [...done], gjenstår: ITEMS.map(i => i.id).filter(i => !done.has(i)) }
