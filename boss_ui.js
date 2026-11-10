// Sjef-maur (R9): helsebar øverst i bildet (tre hjerter + navn). Egen DOM, ingen avhengighet til main.js. Vises når sjefen er nær eller i kamp.
export function createBossBar(parent = document.body, jump = 'HOPP') {   // jump: knappenavn (HOPP på mobil, Mellomrom på tastatur)
  const el = document.createElement('div');
  el.id = 'bossbar';
  el.style.cssText = 'position:fixed;left:50%;top:calc(env(safe-area-inset-top) + 240px);transform:translateX(-50%);z-index:5;pointer-events:none;display:none;text-align:center;font:700 12px system-ui;color:#fff;text-shadow:0 1px 3px #000;transition:opacity .3s;opacity:0';
  el.innerHTML = '<div class="bn" style="letter-spacing:.12em;margin-bottom:3px">SJEF-MAUR</div><div class="bh" style="display:flex;gap:5px;justify-content:center;padding:4px 10px;background:#0009;border-radius:999px"></div><div class="bs" style="margin-top:3px;font-weight:600;font-size:11px;opacity:.9"></div>';
  parent.appendChild(el);
  const hearts = el.querySelector('.bh'), status = el.querySelector('.bs');
  let shown = '', max = 0;
  const STATUS = { windup: 'Den varsler! Gå til siden', charge: 'Den stormer!', stunned: `Svimmel! ${jump} på ryggen`, hit: 'Au!', tired: 'Sliten…', patrol: '', dead: 'Slått!' };
  return {
    el,
    // b: sjef-tilstanden (L.bossS); near: om den skal vises
    update(b, near) {
      const show = !!b && !b.gone && near;
      if (!show) { if (el.style.opacity !== '0') { el.style.opacity = '0'; setTimeout(() => { if (el.style.opacity === '0') el.style.display = 'none'; }, 320); } return; }
      el.style.display = 'block'; el.style.opacity = '1';
      if (b.maxHp !== max) { max = b.maxHp; shown = ''; }
      const key = b.hp + ':' + b.mode;
      if (key === shown) return; shown = key;
      let h = ''; for (let i = 0; i < max; i++) h += `<span style="font-size:20px;line-height:1;filter:${i < b.hp ? 'none' : 'grayscale(1) opacity(.45)'}">${i < b.hp ? '❤️' : '❤️'}</span>`;
      hearts.innerHTML = h; status.textContent = STATUS[b.mode] || '';
    },
  };
}
