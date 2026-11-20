// R97: visning for første fem minutter (DOM, ingen three). Logikken ligger i firstrun_logic.js.
//  - hint: en liten animasjon over den ekte knappen (stikke, HOPP, TA, GREP), én om gangen, med to-tre ord
//  - fremdrift: rolig prikkrad (med n/N unntatt på Ekspert) under HUD-linja når delmålpanelet ikke vises
const CSS = `#frhint{position:fixed;z-index:6;pointer-events:none;display:none}
#frhint.show{display:block}
#frhint .ring{position:absolute;border:3px solid #ffd23f;border-radius:50%;box-shadow:0 0 0 0 #ffd23f99;animation:frpulse 1.1s ease-out infinite}
#frhint .lbl{position:absolute;white-space:nowrap;font:700 13px system-ui;color:#1d2433;background:#ffd23f;border-radius:999px;padding:4px 11px;box-shadow:0 2px 6px #0005}
#frhint .dot{position:absolute;width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 0 8px #0008;animation:frdrag 1.5s ease-in-out infinite}
@keyframes frpulse{0%{box-shadow:0 0 0 0 #ffd23f99;transform:scale(.94)}70%{box-shadow:0 0 0 14px #ffd23f00;transform:scale(1.04)}100%{box-shadow:0 0 0 0 #ffd23f00;transform:scale(.94)}}
@keyframes frdrag{0%,100%{transform:translate(0,0);opacity:.2}20%{opacity:1}60%{transform:translate(0,-34px);opacity:1}80%{opacity:0}}
#frprog{position:fixed;left:max(10px,env(safe-area-inset-left));top:46px;z-index:4;display:none;align-items:center;gap:5px;font:700 12px system-ui;color:#fff;background:#121a2cb0;border-radius:999px;padding:4px 10px;pointer-events:none}
#frprog.show{display:flex}
#frprog i{width:9px;height:9px;border-radius:50%;background:#ffffff40;display:inline-block;transition:background .3s,transform .3s}
#frprog i.on{background:#ffd23f;transform:scale(1.15)}
#frprog.pop{animation:frpop .8s ease-out}
@keyframes frpop{0%{transform:scale(1)}30%{transform:scale(1.18)}100%{transform:scale(1)}}
#start .mrow2{display:flex;flex-direction:column;gap:8px;width:100%}
#start .mbtn.big{font-size:22px;padding:18px 22px;letter-spacing:.06em}
#start .mmore{background:none!important;border:0!important;color:#ffffffa0!important;font:600 13px system-ui!important;padding:8px!important;box-shadow:none!important;text-decoration:underline}
#start .mfold{display:none;flex-direction:column;gap:8px;width:100%;opacity:.8}
#start .mfold.open{display:flex}
body.nohints #frhint{display:none!important}`;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const TARGET = { stick: 'stick', jump: 'btnJump', take: 'btnCarry', grab: 'btnGrab' };

// ctx: { $, hudEl }. Retur { showHint(id, text), hideHint(), hintId(), progress(info, extra), pop() }.
export function createFirstRunView({ $, hudEl }) {
  if (!document.getElementById('frcss')) { const s = document.createElement('style'); s.id = 'frcss'; s.textContent = CSS; document.head.appendChild(s); }
  const hint = document.createElement('div'); hint.id = 'frhint'; document.body.appendChild(hint);
  const prog = document.createElement('div'); prog.id = 'frprog'; document.body.appendChild(prog);
  let cur = null, progKey = '', topKey = '';
  const place = () => {
    if (!cur) return;
    const el = document.getElementById(TARGET[cur.id]); if (!el) { hint.classList.remove('show'); return; }
    const r = el.getBoundingClientRect(); if (!r.width) { hint.classList.remove('show'); return; }
    const pad = cur.id === 'stick' ? 4 : 6, sz = Math.max(r.width, r.height) + pad * 2, cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const left = cx - sz / 2, top = cy - sz / 2, lblAbove = cur.id === 'stick' ? top - 34 : top - 36;
    const lx = Math.max(8, Math.min(innerWidth - 8, cx));
    hint.innerHTML = `<div class="ring" style="left:${left}px;top:${top}px;width:${sz}px;height:${sz}px"></div>${cur.id === 'stick' ? `<div class="dot" style="left:${cx - 11}px;top:${cy - 11}px"></div>` : ''}<div class="lbl" style="left:${lx}px;top:${Math.max(8, lblAbove)}px;transform:translateX(-50%)">${esc(cur.text)}</div>`;
    hint.classList.add('show');
  };
  return {
    showHint(id, text) { cur = { id, text }; place(); },
    hideHint() { cur = null; hint.classList.remove('show'); hint.innerHTML = ''; },
    hintId: () => cur?.id || null,
    refresh() { if (cur) place(); },          // kalles av og til (snu telefonen)
    // info: fra progressInfo(); show: om indikatoren skal vises (ikke når delmålpanelet vises)
    progress(info, show, label) {
      const on = !!show && !!info.show;
      if (!on) { prog.classList.remove('show'); return; }
      const k = `${info.dots.join('')}|${info.text}`;
      if (k !== progKey) { progKey = k; prog.innerHTML = info.dots.map((d) => `<i class="${d ? 'on' : ''}"></i>`).join('') + (info.text ? `<span>${esc(label ? `${label} ${info.text}` : info.text)}</span>` : ''); }
      prog.classList.add('show');
      if (hudEl && innerHeight > 500) { const t = Math.round(hudEl.offsetTop + hudEl.offsetHeight + 6) + 'px'; if (t !== topKey) { topKey = t; prog.style.top = t; } }
    },
    pop() { prog.classList.remove('pop'); void prog.offsetWidth; prog.classList.add('pop'); },
    el: { hint, prog },
  };
}
