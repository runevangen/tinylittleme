// Sjef-maur (R9): helsebar øverst i bildet (tre hjerter + navn). Egen DOM, ingen avhengighet til main.js. Vises når sjefen er nær eller i kamp.
export function createBossBar(parent = document.body, jump = 'HOPP') {   // jump: knappenavn (HOPP på mobil, Mellomrom på tastatur)
  const el = document.createElement('div');
  el.id = 'bossbar';
  el.style.cssText = 'position:fixed;left:max(10px,env(safe-area-inset-left));top:calc(max(10px,env(safe-area-inset-top)) + 36px);z-index:5;pointer-events:none;display:none;text-align:left;font:700 12px system-ui;color:#fff;text-shadow:0 1px 3px #000;transition:opacity .3s;opacity:0';
  el.innerHTML = '<div class="bn" style="letter-spacing:.12em;margin-bottom:2px;font-size:11px">SJEF-MAUR</div><div class="bh" style="display:flex;gap:5px;justify-content:flex-start;padding:2px 8px;background:#0009;border-radius:999px"></div><div class="bs" style="margin-top:2px;font-weight:600;font-size:11px;opacity:.9"></div>';
  parent.appendChild(el);
  const ban = document.createElement('div');                       // stor midtstilt varselstripe (mobil: lesbar på et blunk)
  ban.id = 'bossbanner';
  ban.style.cssText = 'position:fixed;left:50%;top:34%;transform:translateX(-50%);z-index:6;pointer-events:none;display:none;max-width:92vw;box-sizing:border-box;text-align:center;font:800 22px/1.15 system-ui;color:#fff;padding:9px 18px;border-radius:14px;border:3px solid #fff;text-shadow:0 2px 3px #000a;box-shadow:0 4px 18px #0008';
  parent.appendChild(ban);
  const hearts = el.querySelector('.bh'), status = el.querySelector('.bs');
  let shown = '', max = 0;
  const STATUS = { windup: 'Den varsler! Stikk til siden', charge: 'Den stormer!', stunned: `Svimmel! ${jump} på ryggen`, hit: 'Au!', tired: 'Sliten…', patrol: '', dead: 'Slått!' };
  const BANNER = { windup: ['⚠ STIKK TIL SIDEN!', '#d32c1e'], charge: ['⚠ STIKK TIL SIDEN!', '#d32c1e'], stunned: [`SVIMMEL! ${jump} nå!`, '#1f9a4a'], tired: ['Sliten… den prøver igjen', '#c98a12'] };
  let bannerKey = '';
  return {
    el,
    // b: sjef-tilstanden (L.bossS); near: om den skal vises
    update(b, near) {
      const show = !!b && !b.gone && near;
      const bn = show && BANNER[b.mode];
      if (bn) { if (bannerKey !== b.mode) { bannerKey = b.mode; ban.textContent = bn[0]; ban.style.background = bn[1]; } ban.style.display = 'block'; ban.style.opacity = b.mode === 'windup' || b.mode === 'charge' ? (0.8 + 0.2 * Math.sin(b.anim * 14)).toFixed(2) : '1'; }
      else { ban.style.display = 'none'; bannerKey = ''; }
      if (!show) { if (el.style.opacity !== '0') { el.style.opacity = '0'; setTimeout(() => { if (el.style.opacity === '0') el.style.display = 'none'; }, 320); } return; }
      el.style.display = 'block'; el.style.opacity = '1';
      if (b.maxHp !== max) { max = b.maxHp; shown = ''; }
      const key = b.hp + ':' + b.mode;
      if (key === shown) return; shown = key;
      let h = ''; for (let i = 0; i < max; i++) h += `<span style="font-size:15px;line-height:1;filter:${i < b.hp ? 'none' : 'grayscale(1) opacity(.45)'}">${i < b.hp ? '❤️' : '❤️'}</span>`;
      hearts.innerHTML = h; status.textContent = STATUS[b.mode] || '';
    },
  };
}
