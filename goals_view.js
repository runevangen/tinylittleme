// R23: delmål-panelet (DOM). Logikken ligger i goals.js. Kompakt: ett aktivt delmål; trykk (berøring) for hele lista.
// Plassert rett under HUD-linja (stående) eller ved siden av den (liggende), så det aldri dekker stikke, knapper eller pil.
import { activeGoal, goalDone, goalTotal, goalLine, goalLabel, isRequired, lockingGoals } from './goals.js';

const CSS = `#goals{position:fixed;left:max(10px,env(safe-area-inset-left));top:46px;z-index:4;max-width:min(78vw,300px);display:none;font:600 13px/1.3 system-ui;color:#fff;background:#121a2cee;border:2px solid #ffd23f;border-radius:14px;padding:5px 10px;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:transform .25s}
#goals.show{display:block}
#goals .gl{display:flex;gap:7px;align-items:baseline}#goals .gs{color:#ffd23f;flex:none}#goals small{color:#ffd9a0;font-weight:700;font-size:11px;display:block}
#goals ul{list-style:none;margin:6px 0 2px;padding:0;display:none}#goals.open ul{display:block}
#goals li{padding:3px 0;display:flex;gap:7px;align-items:baseline}#goals li.done{opacity:.6;text-decoration:line-through}#goals li.act{color:#ffd23f}
#goals li i{font-style:normal;flex:none;width:14px;text-align:center}#goals li em{font-style:normal;font-size:10px;opacity:.75;margin-left:4px;text-decoration:none;display:inline-block}
#goals .hint{display:none;font-size:10px;opacity:.7;margin-top:2px}#goals.open .hint{display:block}
#goals.cheer{animation:goalpop .9s ease-out}
@keyframes goalpop{0%{transform:scale(1)}25%{transform:scale(1.14);background:#ffd23fee;color:#1d2433}100%{transform:scale(1)}}
@media (max-height:500px){#goals{left:max(230px,calc(env(safe-area-inset-left) + 220px));top:max(10px,env(safe-area-inset-top))}}
body.bossfight #goals,body.ovview #goals{display:none!important}`;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ctx: { $, T, getLang, L, hudEl }. Returnerer { update(state), cheer(), toggle(), setOn(v) }.
export function createGoalView({ $, T, getLang, L, hudEl, onToggle }) {
  if (!document.getElementById('goalcss')) { const s = document.createElement('style'); s.id = 'goalcss'; s.textContent = CSS; document.head.appendChild(s); }
  let el = document.getElementById('goals');
  if (!el) { el = document.createElement('div'); el.id = 'goals'; document.body.appendChild(el); }
  let on = true, open = false, key = '', topKey = '';
  let closeT = 0;
  el.addEventListener('pointerdown', (e) => {
    e.stopPropagation(); open = !open; el.classList.toggle('open', open); key = ''; onToggle?.(open);
    clearTimeout(closeT); if (open) closeT = setTimeout(() => { open = false; el.classList.remove('open'); key = ''; }, 6000);     // lista lukker seg selv, så den ikke blir stående over bildet
  });
  const view = {
    el,
    setOn(v) { on = !!v; if (!on) el.classList.remove('show'); },
    isOpen: () => open,
    cheer() { el.classList.remove('cheer'); void el.offsetWidth; el.classList.add('cheer'); },
    // state: { crumbs, stomps, show } (show = bare i spill, ikke i meny/mål); kalles hver ramme, DOM-en endres bare når teksten endres
    update(state, now) {
      const total = goalTotal(L), show = on && state.show && total > 0;
      el.classList.toggle('show', show); if (!show) return;
      const lang = getLang(), act = activeGoal(L), done = goalDone(L), lock = lockingGoals(L);
      const k = `${lang}|${done}|${act?.id}|${state.crumbs}|${state.stomps}|${open}|${lock.length}`;
      if (k !== key) {
        key = k;
        const head = act ? goalLine(L, act, lang, state) : T('goal.all');
        const list = (L.goalList || []).map((g) => `<li class="${g.done ? 'done' : g === act ? 'act' : ''}"><i>${g.done ? '✓' : g === act ? '▶' : '○'}</i><span>${esc(goalLine(L, g, lang, state))}${isRequired(g) ? '' : `<em>${esc(T('goal.opt'))}</em>`}${g.gate && !g.done ? `<em>${esc(T('goal.gate'))}</em>` : ''}</span></li>`).join('');
        el.innerHTML = `<div class="gl"><span class="gs">★ ${done}/${total}</span><span>${esc(head)}</span></div><ul>${list}</ul><div class="hint">${esc(T('goal.hint'))}</div>`;
      }
      // rett under HUD-linja (HUD-en kan vokse når den utvides)
      if (hudEl && innerHeight > 500) { const t = Math.round(hudEl.offsetTop + hudEl.offsetHeight + 6); const tk = String(t); if (tk !== topKey) { topKey = tk; el.style.top = `${t}px`; } }
      else if (topKey) { topKey = ''; el.style.top = ''; }
    },
  };
  return view;
}
export { goalLabel };
