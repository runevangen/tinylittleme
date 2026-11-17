// R80: «Rettelser»-menyen på startskjermen. Lista over svar fra Claude med brett og sted, «GÅ DIT» og avkryssing (✓ FUNGERER / ✗ FUNGERER IKKE).
// Logikken (sortering, tellere, tilstand, versjon, plassering) ligger i fixes_logic.js og testes i node. Nettet (hent og avkryssing) kommer inn som funksjoner.
import { sortFixes, stateOf, stateText, uncheckedCount, versionStatus, versionLine, levelLabel, withCheck, QUICK_NOTES, TABS, tabOf, tabCounts, defaultTab, tabLabel, tabView, showAllLabel } from './fixes_logic.js';

const CSS = `#start.fxl{justify-content:flex-start;overflow-y:auto;-webkit-overflow-scrolling:touch;padding-top:max(26px,env(safe-area-inset-top));padding-bottom:max(18px,env(safe-area-inset-bottom))}
  body.flagscr #start.fxl{padding-top:max(50px,calc(env(safe-area-inset-top) + 44px))}
  #start .fxh{margin:4px 0 2px;font:800 clamp(26px,7vw,38px)/1.1 Georgia,serif;font-style:italic;color:#ffd9a0}
  #start .fxc{width:min(360px,90vw);box-sizing:border-box;padding:12px;border-radius:16px;background:#ffffff1c;text-align:left;display:flex;flex-direction:column;gap:8px}
  #start .fxc.ok{background:#1f4a36cc;box-shadow:inset 0 0 0 2px #9fe0c8}#start .fxc.fail{background:#5a2a24cc;box-shadow:inset 0 0 0 2px #ff9a8a}
  #start .fxm{font:700 15px/1.35 system-ui;color:#fff}
  #start .fxs{font:600 12px/1.3 system-ui;color:#c9d4ea}
  #start .fxt{display:inline-block;align-self:flex-start;padding:3px 9px;border-radius:999px;font:800 11px system-ui;background:#ffffff30;color:#fff}
  #start .fxc.ok .fxt{background:#9fe0c8;color:#10261f}#start .fxc.fail .fxt{background:#ff9a8a;color:#3a0f0a}
  #start .fxr{display:flex;gap:8px}#start .fxr>button{flex:1}
  #start .fxb{min-height:48px;padding:10px 8px;border:0;border-radius:14px;font:800 14px system-ui;background:#ffffff30;color:#fff;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
  #start .fxb.go{background:var(--accent);color:var(--ink)}#start .fxb.yes{background:#9fe0c8;color:#10261f}#start .fxb.no{background:#ff9a8a;color:#3a0f0a}
  #start .fxb.on{outline:3px solid #fff}#start .fxb:disabled{opacity:.45}#start .fxb:active{transform:scale(.97)}
  #start .fxn{display:flex;flex-direction:column;gap:6px}
  #start .fxn input{width:100%;box-sizing:border-box;padding:12px;border-radius:12px;border:2px solid #ffffff55;background:#0006;color:#fff;font:600 16px system-ui}
  #start .fxq{display:flex;flex-wrap:wrap;gap:6px}#start .fxq button{padding:8px 10px;border:0;border-radius:999px;background:#ffffff26;color:#fff;font:700 12px system-ui;min-height:36px}
  #start .fxtabs{display:flex;gap:8px;width:min(360px,90vw)}#start .fxtabs>button{flex:1;min-height:48px;border:0;border-radius:14px;background:#ffffff26;color:#fff;font:800 13px system-ui;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
  #start .fxtabs>button.on{background:var(--accent);color:var(--ink)}
  #start .fxe{font:600 12px system-ui;color:#ffd23f}`;
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ctx: { list (rader fra tlm_my_inbox), version, levels, logEv, refresh(): Promise<list|null>, check(id,res,note): Promise<boolean>,
//        goTo(fix), update(): Promise, onBack(), onChange(list) }
export function showFixes(el, ctx, doc = document) {
  if (!doc.getElementById('fixcss')) { const s = doc.createElement('style'); s.id = 'fixcss'; s.textContent = CSS; doc.head.appendChild(s); }
  let list = ctx.list || [], open = null, busy = null, err = '', tab = defaultTab(list), all = { sjekke: false, sjekket: false };   // open: id på rettelsen der «virker ikke»-boksen står åpen
  ctx.logEv?.('rettelser', `åpnet (${list.length} stk, ${uncheckedCount(list)} ikke sjekket)`);
  const card = (r) => {
    const st = stateOf(r), vs = versionStatus(ctx.version, r.version), here = levelLabel(ctx.levels, r.level);
    const go = vs === 'eldre'
      ? `<button class="fxb go" data-upd="${esc(r.id)}">OPPDATER</button>`
      : r.level ? `<button class="fxb go" data-go="${esc(r.id)}">GÅ DIT</button>` : '';
    const noteBox = open === r.id ? `<div class="fxn"><div class="fxq">${QUICK_NOTES.map((q) => `<button type="button" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div><input type="text" maxlength="200" placeholder="Hva er galt? (valgfritt)" data-note autocomplete="off"><button class="fxb no" data-send="${esc(r.id)}">SEND ✗ FUNGERER IKKE</button></div>` : '';
    return `<div class="fxc ${st}" data-fx="${esc(r.id)}"><span class="fxt">${stateText(st)}</span>
      <div class="fxm">${esc(r.message)}</div>
      <div class="fxs">${here ? esc(here) + ' · ' : ''}${esc(versionLine(ctx.version, r.version))}${st === 'fail' && r.note ? '<br>Du skrev: ' + esc(r.note) : ''}</div>
      <div class="fxr">${go}</div>
      <div class="fxr"><button class="fxb yes${st === 'ok' ? ' on' : ''}" data-ok="${esc(r.id)}" ${busy ? 'disabled' : ''}>✓ FUNGERER</button><button class="fxb no${st === 'fail' || open === r.id ? ' on' : ''}" data-no="${esc(r.id)}" ${busy ? 'disabled' : ''}>✗ FUNGERER IKKE</button></div>${noteBox}</div>`;
  };
  const draw = () => {
    const n = uncheckedCount(list), cnt = tabCounts(list), { shown, hidden } = tabView(list, tab, all[tab], ctx.now?.() ?? Date.now());
    el.classList.add('fxl');
    el.innerHTML = `<h1 class="fxh">Rettelser</h1><p class="tag">${n ? `${n} å sjekke. Trykk GÅ DIT, prøv stedet, og si om det virker.` : 'Ingen rettelser å sjekke akkurat nå.'}</p>
      <button class="mbtn sec" id="fxBack">TILBAKE</button>
      <div class="fxtabs">${TABS.map((t) => `<button type="button" data-tab="${t}" class="${t === tab ? 'on' : ''}">${tabLabel(t, cnt[t])}</button>`).join('')}</div>${err ? `<div class="fxe">${esc(err)}</div>` : ''}${shown.length ? shown.map(card).join('') : `<p class="tag">${tab === 'sjekke' ? 'Ingenting å sjekke her.' : 'Ingen sjekkede rettelser å vise.'}</p>`}${hidden > 0 || all[tab] ? `<button class="mbtn sec" id="fxAll">${showAllLabel(all[tab], hidden)}</button>` : ''}${shown.length > 3 ? '<button class="mbtn sec" id="fxBack2">TILBAKE</button>' : ''}`;
    for (const b of el.querySelectorAll('[data-tab]')) b.onclick = () => { if (tab === b.dataset.tab) return; tab = b.dataset.tab; open = null; ctx.logEv?.('rettelser', `fane ${tab}`); draw(); };
    const ab = el.querySelector('#fxAll'); if (ab) ab.onclick = () => { all[tab] = !all[tab]; ctx.logEv?.('rettelser', `${all[tab] ? 'vis alle' : 'skjul eldre'} ${tab} (${hidden})`); draw(); };
    for (const b of el.querySelectorAll('#fxBack,#fxBack2')) b.onclick = () => { el.classList.remove('fxl'); ctx.onBack?.(); };
    const find = (id) => list.find((r) => r.id === id);
    for (const b of el.querySelectorAll('[data-go]')) b.onclick = () => { const r = find(b.dataset.go); if (r) { ctx.logEv?.('rettelser', `gå dit ${r.level}${r.spot ? ' ' + JSON.stringify(r.spot) : ''}`); el.classList.remove('fxl'); ctx.goTo(r); } };
    for (const b of el.querySelectorAll('[data-upd]')) b.onclick = async () => { b.disabled = true; b.textContent = 'Oppdaterer …'; ctx.logEv?.('rettelser', 'oppdater først'); try { await ctx.update(); } catch { /* stille */ } if (b.isConnected) { b.disabled = false; b.textContent = 'OPPDATER'; err = 'Fikk ikke oppdatert akkurat nå. Prøv igjen senere.'; draw(); } };
    for (const b of el.querySelectorAll('[data-ok]')) b.onclick = () => submit(b.dataset.ok, 'ok', '');
    for (const b of el.querySelectorAll('[data-no]')) b.onclick = () => { open = open === b.dataset.no ? null : b.dataset.no; draw(); };
    for (const b of el.querySelectorAll('[data-q]')) b.onclick = () => { const i = b.closest('.fxn').querySelector('[data-note]'); i.value = b.dataset.q; i.focus(); };
    for (const b of el.querySelectorAll('[data-send]')) b.onclick = () => submit(b.dataset.send, 'fail', b.closest('.fxn').querySelector('[data-note]').value);
  };
  async function submit(id, res, note) {
    if (busy) return; busy = id; err = '';
    const before = list, r0 = before.find((r) => r.id === id);
    list = withCheck(list, id, res, note, ctx.now?.() ?? Date.now()); open = null; draw();
    let ok = false; try { ok = await ctx.check(id, res, note); } catch { ok = false; }
    busy = null;
    if (!ok) { list = before.map((r) => (r.id === id ? r0 : r)); err = 'Ingen nett akkurat nå. Prøv igjen om litt.'; }
    else ctx.onChange?.(list);
    ctx.logEv?.('rettelser', `avkryssing ${res}${ok ? '' : ' (ikke sendt)'}`);
    if (el.classList.contains('fxl')) draw();
  }
  draw();
  ctx.refresh?.().then((fresh) => { if (fresh && el.classList.contains('fxl') && !busy && open === null) { list = fresh; ctx.onChange?.(list); draw(); } }).catch(() => {});   // hent i bakgrunnen; stille ved feil
  return { state: () => ({ list, open, busy, err }) };
}
