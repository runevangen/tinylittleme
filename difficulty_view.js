// R69: visning for vanskelighet (DOM): valg av nivå, «Velg brett», merkene. Logikken står i difficulty.js. Bruker startskjermens #start og knappestiler (.mbtn).
import { DIFFS, BADGE_GLYPH, dt, badgeRow, unlockedLevels, allowedDiffs, hasBadge, getBadges } from './difficulty.js';

const CSS = `#start.dfl{justify-content:flex-start;overflow-y:auto;-webkit-overflow-scrolling:touch;padding-top:max(26px,env(safe-area-inset-top));padding-bottom:max(18px,env(safe-area-inset-bottom))}
#start .mbtn.df{text-align:left}#start .mbtn.df b{display:block;font:800 19px system-ui}#start .mbtn.df small{opacity:.85}
#start .mbtn.cur{outline:3px solid #ffd23f}
#start .dfnote{max-width:min(420px,88vw);font:500 13px/1.4 system-ui;color:#c4cee3;margin:2px 0 6px;text-align:center}
#start .lvrow{display:flex;justify-content:space-between;align-items:center;gap:10px;text-align:left}#start .lvrow span:last-child{flex:none;font-size:20px;letter-spacing:2px}
#start .lvrow small{display:block}
#winbadge{margin:6px 0;font:700 17px/1.3 system-ui;color:#ffd9a0}
#quitmenu{margin-top:4px}`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function createDifficultyView({ $, lang, logEv }) {
  const L = () => lang();
  if (!document.getElementById('dfcss')) { const s = document.createElement('style'); s.id = 'dfcss'; s.textContent = CSS; document.head.appendChild(s); }
  const root = () => $('start');
  const clearList = () => root().classList.remove('dfl');

  // Velg vanskelighet. allowed: hvilke som kan velges (resten vises ikke). onPick(diff).
  function pickDifficulty({ title, sub, allowed = DIFFS, current, onPick, onBack }) {
    const el = root(); clearList();
    el.innerHTML = `<h1>${esc(title || dt(L(), 'df.title'))}</h1><p class="tag">${esc(sub || dt(L(), 'df.note'))}</p>`
      + allowed.map((d) => `<button class="mbtn df ${d === current ? 'cur' : ''}" data-d="${d}"><b>${BADGE_GLYPH[d]} ${esc(dt(L(), 'df.' + d))}</b><small>${esc(dt(L(), `df.${d}.d`))}</small></button>`).join('')
      + `<button class="mbtn sec" id="dfBack">${esc(dt(L(), 'df.back'))}</button>`;
    el.querySelectorAll('button[data-d]').forEach((b) => { b.onclick = () => onPick(b.dataset.d); });
    $('dfBack').onclick = () => onBack?.();
  }

  // «Velg brett»: opplåste brett med ✓ og merker. Trykk på et brett: velg vanskelighet (samme eller vanskeligere), så onPlay(levelId, diff).
  function pickLevel({ levels, st, cleared, current, onPlay, onBack, building = null }) {
    const el = root(), open = unlockedLevels(levels, cleared, getBadges(st));
    el.classList.add('dfl');
    el.innerHTML = `<h1>${esc(dt(L(), 'df.pick'))}</h1><p class="tag">${esc(dt(L(), open.length ? 'df.pickSub' : 'df.pickNone'))}</p>`
      + open.map((l) => `<button class="mbtn sec lvrow" data-l="${l.id}"><span>${esc(l.label)}${cleared && cleared[l.id] ? ' ✓' : ''}<small>${esc(dt(L(), 'df.fresh'))}</small></span><span>${badgeRow(st, l.id)}</span></button>`).join('')
      + (building ? building.html : '')   // R133: gruppen BYGGING nederst (BYGGESKOLE og 3D-LAB), tegnet av bygging_view.js
      + `<button class="mbtn sec" id="dfBack">${esc(dt(L(), 'df.back'))}</button>`;
    if (building) for (const [id, fn] of Object.entries(building.on || {})) { const b = $(id); if (b) b.onclick = fn; }
    el.querySelectorAll('button[data-l]').forEach((b) => {
      b.onclick = () => {
        const id = b.dataset.l, lv = levels.find((x) => x.id === id);
        pickDifficulty({ title: lv?.short || id, sub: dt(L(), 'df.pickSub'), allowed: allowedDiffs(st, id), current, onPick: (d) => onPlay(id, d), onBack: () => pickLevel({ levels, st, cleared, current, onPlay, onBack, building }) });
      };
    });
    $('dfBack').onclick = () => onBack?.();
    logEv?.('vanskelighet', `velg brett: ${open.length} åpne`);
  }

  // Merker på målskjermen: «Nytt merke» og forslag om neste vanskelighet.
  function winBadgeHtml({ levelId, diff, isNew, st }) {
    const next = DIFFS[DIFFS.indexOf(diff) + 1];
    return `<div id="winbadge">${isNew ? esc(dt(L(), 'df.newBadge', { glyph: BADGE_GLYPH[diff], name: dt(L(), 'df.badge.' + diff) })) : `${BADGE_GLYPH[diff]} ${esc(dt(L(), 'df.badge.' + diff))}`} <span style="letter-spacing:3px">${badgeRow(st, levelId)}</span>${next && !hasBadge(st, levelId, next) ? `<br><small style="font-weight:600;opacity:.85">${esc(dt(L(), 'df.harder', { name: dt(L(), 'df.' + next) }))}</small>` : ''}</div>`;
  }
  return { pickDifficulty, pickLevel, winBadgeHtml };
}
