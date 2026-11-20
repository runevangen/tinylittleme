// R97: «ny spiller»-måling. Åpner spillet i en ekte nettleser (Playwright, iPhone 14, tom lagring), trykker START på menyen og går fra start til mål i Badet
// KUN ved å trykke knappene spilleren ser (START, fortellerkortet, HOPP, GREP, TA via ekte berøringshendelser) og styre stikka etter ruta som veiledningen (R64) viser
// (LEVEL.route: neste flate, klatreflate, mål). Ingen snarveier: ingen teleportering, ingen interne hendelser. Spillklokka kjøres for hånd (g.tick), siden uten GPU går bildet i ca. 1 fps;
// tidene i rapporten er derfor SPILLETID, ikke veggklokke.
//   node tools/first_run.cjs [utmappe] [--mode=normal|tafatt|begge] [--diff=beginner|medium|expert]    Exit 1 ved feil.  Krever playwright (NODE_PATH=$(npm root -g)).
// Modus «tafatt»: en spiller som står stille i 20 s, trykker TA på feil sted og går feil vei: skal få hjelp (R64-veiledning) innen 12 s uten å bli sint.
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2), opt = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('='))), out = args.find((a) => !a.startsWith('--')) || path.join(root, 'tools', 'first_run_out');
fs.mkdirSync(out, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.wav': 'audio/wav', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => {
  const f = path.join(root, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
  const p = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
  if (!p.startsWith(root) || !fs.existsSync(p)) { r.writeHead(404); r.end('mangler'); return; }
  r.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(p).pipe(r);
});

// ---- boten (kjører i siden). Samme måte å gå på som tools/walk_route.mjs, men mot det ekte spillet: stikka settes (touch.x/y) og knappene trykkes av verten via berøringshendelser.
const BOT = `(() => {
  const g = window.__game, L = g.LEVEL, p = g.player, P = g.P, R = L.route, goal = L.goal, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const near = (n, m = 0.35) => [clamp(p.x, Math.min(n.x0 + m, (n.x0 + n.x1) / 2), Math.max(n.x1 - m, (n.x0 + n.x1) / 2)), clamp(p.z, Math.min(n.z0 + m, (n.z0 + n.z1) / 2), Math.max(n.z1 - m, (n.z0 + n.z1) / 2))];
  const on = (n) => p.onGround && Math.abs(p.y - n.top) < (n.tol || 0.06) && p.x > n.x0 - 0.32 && p.x < n.x1 + 0.32 && p.z > n.z0 - 0.32 && p.z < n.z1 + 0.32;
  const S = { t: 0, i: 1, leg: null, fail: null, log: [], react: 90 };
  const winShown = () => !document.getElementById('win').classList.contains('hide');
  let want = { jump: false, grab: false };
  const stick = (dx, dz, mag = 1) => { const d = Math.hypot(dx, dz) || 1, ux = dx / d, uz = dz / d, sy = Math.sin(g.cam.yaw), cy = Math.cos(g.cam.yaw); g.touch.x = (ux * cy - uz * sy) * mag; g.touch.y = (-ux * sy - uz * cy) * mag; };
  const idle = () => { g.touch.x = g.touch.y = 0; want = { jump: false, grab: false }; };
  const goTo = (tx, tz, mag = 1) => { stick(tx - p.x, tz - p.z, mag); };
  function newLeg(i) {
    const B = R[i], leg = { i, t0: S.t, kind: B.grip ? 'climb' : 'walk', jumpT: -99, tries: 0, lastPos: [p.x, p.z], lastT: S.t, detour: 0, side: 1, stuckN: 0, phase: 'rest', wps: [], restN: 0 };
    if (B.grip) {
      const C = R[i + 1], thinX = B.x1 - B.x0 < B.z1 - B.z0, gc = [(B.x0 + B.x1) / 2, (B.z0 + B.z1) / 2], cc = [(C.x0 + C.x1) / 2, (C.z0 + C.z1) / 2];
      const sgn = (thinX ? gc[0] - cc[0] : gc[1] - cc[1]) >= 0 ? 1 : -1, half = (thinX ? B.x1 - B.x0 : B.z1 - B.z0) / 2;
      const side = (q) => ((thinX ? q[0] - gc[0] : q[1] - gc[1]) * sgn), mk = (off, along) => (thinX ? [gc[0] + sgn * off, along] : [along, gc[1] + sgn * off]);
      if (B.id !== C.id && Math.abs(p.y - C.top) > 0.06 && side([p.x, p.z]) < half + 0.25) {
        const lo = thinX ? B.z0 : B.x0, hi = thinX ? B.z1 : B.x1, me = thinX ? p.z : p.x, end = Math.abs(me - lo) < Math.abs(me - hi) ? lo - 0.75 : hi + 0.75;
        leg.wps = [mk(-(half + 0.7), end), mk(half + 0.7, end), mk(half + 0.7, thinX ? gc[1] : gc[0])];
      }
    } else {
      const A = R[i - 1], cl = (v, a, b) => (a > b ? (a + b) / 2 : clamp(v, a, b)), m = 0.35;
      const b0 = [clamp((A.x0 + A.x1) / 2, B.x0, B.x1), clamp((A.z0 + A.z1) / 2, B.z0, B.z1)];
      let a1 = [cl(b0[0], A.x0 + m, A.x1 - m), cl(b0[1], A.z0 + m, A.z1 - m)];
      if (B.top > A.top + 0.3 && a1[0] > B.x0 - 0.3 && a1[0] < B.x1 + 0.3 && a1[1] > B.z0 - 0.3 && a1[1] < B.z1 + 0.3) {
        const inA = ([x, z]) => x >= A.x0 + m - 1e-6 && x <= A.x1 - m + 1e-6 && z >= A.z0 + m - 1e-6 && z <= A.z1 - m + 1e-6;
        const c = [[B.x0 - 0.45, a1[1]], [B.x1 + 0.45, a1[1]], [a1[0], B.z0 - 0.45], [a1[0], B.z1 + 0.45]].filter(inA).sort((u, v) => Math.hypot(u[0] - a1[0], u[1] - a1[1]) - Math.hypot(v[0] - a1[0], v[1] - a1[1]))[0];
        if (c) a1 = c;
      }
      leg.a1 = a1; leg.staged = A.id === 'gulv' || B.id === 'gulv'; leg.legMax = 60 * Math.max(30, 15 + 0.35 * Math.hypot(p.x - (B.x0 + B.x1) / 2, p.z - (B.z0 + B.z1) / 2));
    }
    return leg;
  }
  // én tikk med beslutning (kalles rett før g.tick(1, 1/60))
  function decide() {
    if (S.t < S.react) { idle(); return; }                                       // en ny spiller bruker et øyeblikk på å se seg om
    if (S.i >= R.length) { goTo(goal[0], goal[2], 0.8); want = { jump: false, grab: false }; return; }
    const i = S.i, B = R[i];
    if (!S.leg || S.leg.i !== i) S.leg = newLeg(i);
    const lg = S.leg, t = S.t;
    if (lg.kind === 'climb') {
      const C = R[i + 1];
      if (lg.phase === 'rest') { idle(); if (!p.onGround || p.stam >= P.stamina - 0.1 || ++lg.restN > 600) lg.phase = 'wps'; return; }
      if (lg.phase === 'wps') {
        const w = lg.wps[0]; if (!w || !p.onGround) { lg.phase = 'main'; lg.t0 = t; return; }
        if (Math.hypot(w[0] - p.x, w[1] - p.z) <= 0.25) { lg.wps.shift(); return; } goTo(w[0], w[1], 0.7); return;
      }
      if (on(C)) { S.log.push([+(t / 60).toFixed(1), 'klatret ' + B.id + ' til ' + C.id]); S.i = i + 2; S.leg = null; idle(); return; }
      if (t - lg.t0 > 60 * 40) { S.fail = 'kom ikke opp klatreflaten ' + B.id; return; }
      const [tx, tz] = near(B, 0.2);
      if (p.state === 'hang') { g.touch.x = g.touch.y = 0; want = { jump: t % 20 < 4, grab: true }; }
      else if (p.state === 'mantle') idle();
      else if (p.state === 'climb') { const c = p.climb; goTo(p.x - c.nx, p.z - c.nz); want = { jump: false, grab: true }; }
      else if (p.onGround && Math.abs(p.y - C.top) < 0.06) { const [cx, cz] = near(C); goTo(cx, cz); want = { jump: false, grab: false }; }
      else { goTo(tx, tz); want = { jump: false, grab: true }; }
      return;
    }
    const A = R[i - 1], last = i === R.length - 1;
    const there = on(B) || (last && p.onGround && Math.hypot(p.x - goal[0], p.z - goal[2]) < 2 && Math.abs(p.y - goal[1]) < 2.5);
    if (there) { S.log.push([+(t / 60).toFixed(1), A.id + ' til ' + B.id]); S.i = i + 1; S.leg = null; return; }
    if (t - lg.t0 >= lg.legMax) { S.fail = 'nådde ikke ' + B.id + ' fra ' + A.id + ' (y=' + p.y.toFixed(1) + ' ved ' + p.x.toFixed(1) + ',' + p.z.toFixed(1) + ' ' + p.state + ')'; return; }
    if (!lg.staged && (Math.hypot(lg.a1[0] - p.x, lg.a1[1] - p.z) < 0.25 || !(p.onGround && Math.abs(p.y - A.top) < 0.06) || Math.max(B.x0 - p.x, p.x - B.x1, B.z0 - p.z, p.z - B.z1) < 0.45)) lg.staged = true;
    const inB = p.x > B.x0 && p.x < B.x1 && p.z > B.z0 && p.z < B.z1;
    const [tx, tz] = lg.staged ? (inB && p.onGround && Math.abs(p.y - B.top) > 0.06 && (Math.abs(p.y - B.top) < 0.8 || (p.y > B.top && lg.staged && t - lg.t0 > 90)) ? [(B.x0 + B.x1) / 2, (B.z0 + B.z1) / 2] : near(B)) : lg.a1;
    const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz) || 1, rise = B.hop && B.top - p.y > 0.015 ? Math.max(0.5, B.top - p.y) : B.top - p.y;
    if (p.state === 'hang') { idle(); want = { jump: t % 20 < 4, grab: false }; return; }
    if (p.state === 'mantle') { idle(); return; }
    let jump = false;
    if (lg.staged && p.onGround && p.recover <= 0 && t - lg.jumpT > 50) {
      const edge = Math.max(0, Math.max(B.x0 - p.x, p.x - B.x1), Math.max(B.z0 - p.z, p.z - B.z1));
      if (rise > 0.45 && edge < 0.9 + 0.25 * lg.tries) jump = true;
      const gapAB = Math.hypot(Math.max(0, Math.max(A.x0, B.x0) - Math.min(A.x1, B.x1)), Math.max(0, Math.max(A.z0, B.z0) - Math.min(A.z1, B.z1)));
      const offA = Math.max(A.x0 - p.x, p.x - A.x1, A.z0 - p.z, p.z - A.z1);
      if (rise <= 0.45 && gapAB > 0.7 && Math.abs(p.y - A.top) < 0.06 && offA > -0.32 && edge > 0.3) jump = true;
    }
    if (!jump && lg.staged && p.onGround && p.recover <= 0 && B.top < p.y - 0.5 && t - lg.lastT >= 49 && t - lg.jumpT > 50 && Math.hypot(p.x - lg.lastPos[0], p.z - lg.lastPos[1]) < 0.25) jump = true;
    if (jump) { lg.jumpT = t; lg.tries++; }
    if (t - lg.lastT >= 50) {
      const edgeB = Math.max(0, Math.max(B.x0 - p.x, p.x - B.x1), Math.max(B.z0 - p.z, p.z - B.z1));
      if (p.onGround && (rise <= 0.45 || edgeB > 1.3) && Math.hypot(p.x - lg.lastPos[0], p.z - lg.lastPos[1]) < 0.25 && d > 0.3) { lg.stuckN++; lg.side = -lg.side; lg.detour = 25 + 12 * lg.stuckN; }
      lg.lastPos = [p.x, p.z]; lg.lastT = t;
    }
    if (lg.detour > 0) { lg.detour--; const ddx = (-dz / d * lg.side * 0.9 - dx / d * 0.25), ddz = (dx / d * lg.side * 0.9 - dz / d * 0.25); stick(ddx, ddz, 0.7); want = { jump: false, grab: false }; return; }
    goTo(tx, tz); want = { jump: t - lg.jumpT < 40, grab: !p.onGround };
  }
  return {
    S,
    // kjør opptil n tikk; stopper (uten å tikke) når knappene verten har trykt avviker fra det boten vil ha: verten trykker/slipper og kaller på nytt
    run(n, pressed) {
      let k = 0;
      for (; k < n && !S.fail; k++) {
        if (winShown()) return { won: true, t: S.t, i: S.i };
        decide(); if (S.fail) break;
        if (want.jump !== !!pressed.jump || want.grab !== !!pressed.grab) return { want, t: S.t, i: S.i, goals: g.LEVEL.goalList.filter((q) => q.done).length };
        g.tick(1, 1 / 60); S.t++;
      }
      return { want, t: S.t, i: S.i, fail: S.fail, goals: g.LEVEL.goalList.filter((q) => q.done).length, won: winShown() };
    },
    idleTicks(n) { idle(); g.tick(n, 1 / 60); S.t += n; },
  };
})()`;

const WATCH = `(() => {
  window.__texts = new Set(); window.__textLog = [];
  const ids = ['toast', 'introhint', 'frhint', 'story', 'help', 'topband'];
  const grab = () => { for (const id of ids) { const el = document.getElementById(id); if (!el) continue; const vis = !el.classList.contains('hide') && (el.classList.contains('show') || id === 'story' || id === 'topband' || id === 'frhint'); const tx = (el.innerText || '').replace(/\\s+/g, ' ').trim(); if (vis && tx && !window.__texts.has(id + '|' + tx)) { window.__texts.add(id + '|' + tx); window.__textLog.push([id, tx]); } } };
  const arm = () => new MutationObserver(grab).observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class'] });
  if (document.documentElement) arm(); else document.addEventListener('DOMContentLoaded', arm); setInterval(grab, 300);
})()`;

async function newPlayer(b, port, errs, diff) {
  const ctx = await b.newContext({ ...devices['iPhone 14'] }); ctx.setDefaultTimeout(150000);
  const pg = await ctx.newPage();
  pg.on('pageerror', (e) => errs.push('pageerror: ' + e.message.slice(0, 200))); pg.on('console', (m) => m.type() === 'error' && errs.push('console: ' + m.text().slice(0, 200)));
  await pg.addInitScript(WATCH);
  await pg.goto(`http://localhost:${port}/`);
  await pg.waitForFunction(() => window.__game && window.__game.LEVEL && document.getElementById('start') && !document.getElementById('start').classList.contains('hide'), null, { timeout: 120000 });
  return { ctx, pg, cdp: await ctx.newCDPSession(pg) };
}
const center = async (pg, sel) => { const r = await pg.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2, w: b.width, h: b.height, vis: !!(e.offsetWidth || e.offsetHeight) }; }, sel); return r; };

// startskjermen: telle det spilleren ser, trykke START
async function menuPhase(pg, res, tag) {
  res.menu = await pg.evaluate(() => {
    const vis = [...document.querySelectorAll('#start button')].filter((b) => b.offsetWidth && b.offsetHeight && getComputedStyle(b).visibility !== 'hidden');
    return { buttons: vis.map((b) => b.innerText.replace(/\s+/g, ' ').trim()), startVisible: !!document.getElementById('mStart')?.offsetWidth, contVisible: !!document.getElementById('mCont')?.offsetWidth, moreVisible: !!document.getElementById('mMore')?.offsetWidth, tag: document.querySelector('#start .tag')?.innerText };
  });
  await pg.screenshot({ path: `${out}/${tag}_1_meny.png`, timeout: 150000 });
  const c = await center(pg, '#mStart'); if (!c || !c.vis) throw new Error('START-knappen er ikke synlig på hovedmenyen');
  await pg.touchscreen.tap(c.x, c.y);
}
// fortellerkortet og sveipet: trykk på det som står på skjermen
async function introPhase(pg, res, tag) {
  await pg.waitForSelector('#story:not(.hide) .sgo', { timeout: 60000 }); await pg.screenshot({ path: `${out}/${tag}_2_fortelling.png`, timeout: 150000 });
  const c = await center(pg, '#story .sgo'); await pg.touchscreen.tap(c.x, c.y);
  await pg.waitForFunction(() => !document.getElementById('story') || document.getElementById('story').classList.contains('hide'), null, { timeout: 30000 });
  // sveipet (kort kamerasveip fra målet): trykk for å hoppe over når det vises, ellers vent til det er ferdig
  const sw = await pg.waitForFunction(() => { const e = document.getElementById('introsw'); return !!e && !e.classList.contains('hide'); }, null, { timeout: 15000 }).then(() => true, () => false);
  if (sw) { await pg.touchscreen.tap(200, 400); }
  await pg.waitForFunction(() => { const e = document.getElementById('introsw'); return !e || e.classList.contains('hide'); }, null, { timeout: 60000 });
  await pg.evaluate(() => { window.__paused = true; });   // fra nå kjører klokka for hånd (g.tick)
  await pg.waitForTimeout(1200); await pg.screenshot({ path: `${out}/${tag}_3_start.png`, timeout: 150000 });
}

// knappene: ekte berøringshendelser (CDP) i midten av knappen
function pressor(cdp, pg) {
  const down = new Map(); let nextId = 1; const pts = () => [...down.values()].map((v) => ({ x: v.x, y: v.y, id: v.id }));
  return {
    async sync(want) {
      for (const [name, sel] of [['jump', '#btnJump'], ['grab', '#btnGrab'], ['take', '#btnCarry']]) {
        const w = !!want[name], has = down.has(name);
        if (w && !has) { const c = await center(pg, sel); down.set(name, { x: c.x, y: c.y, id: nextId++ }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts() }); }
        else if (!w && has) { down.delete(name); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: pts() }); }
      }
    },
    pressed: () => Object.fromEntries([...down.keys()].map((k) => [k, true])),
  };
}

async function runNormal(b, port, errs, diff) {
  const res = { mode: 'normal', diff, shots: [], goalTimes: [] }, { ctx, pg, cdp } = await newPlayer(b, port, errs, diff);
  if (diff && diff !== 'medium') await pg.evaluate((d) => { localStorage.setItem('tlm.difficulty', d); }, diff);
  await menuPhase(pg, res, 'normal'); await introPhase(pg, res, 'normal');
  await pg.evaluate(`window.__bot = ${BOT}`);
  const pr = pressor(cdp, pg); let last = { goals: 0 }, safety = 0, doneGoals = 0, wall0 = Date.now();
  res.diffUsed = await pg.evaluate(() => window.__game.diff.get());
  while (safety++ < 20000) {
    const r = await pg.evaluate(([n, pressed]) => window.__bot.run(n, pressed), [240, pr.pressed()]);
    if (r.want) await pr.sync(r.want);
    if (r.goals > doneGoals) { doneGoals = r.goals; res.goalTimes.push({ n: doneGoals, t: +(r.t / 60).toFixed(1) }); await pg.screenshot({ path: `${out}/normal_4_delmaal${doneGoals}.png`, timeout: 150000 }); res.shots.push(`normal_4_delmaal${doneGoals}.png`); }
    last = r; if (r.won || r.fail) break;
    if (r.t > 60 * 420) { res.fail = 'over 7 minutter spilletid'; break; }
  }
  await pr.sync({});
  res.fail = res.fail || last.fail || ''; res.won = !!last.won; res.gameSecs = +((last.t || 0) / 60).toFixed(1); res.wallSecs = Math.round((Date.now() - wall0) / 1000);
  if (res.won) {
    await pg.waitForTimeout(1500); await pg.screenshot({ path: `${out}/normal_5_mal.png`, timeout: 150000 });
    res.win = await pg.evaluate(() => ({ title: document.getElementById('winTitle').innerText, next: document.getElementById('nextLevel').innerText, nextVisible: document.getElementById('nextLevel').style.display !== 'none', menu: document.getElementById('winMenu').innerText, stats: document.getElementById('winStats').innerText.replace(/\s+/g, ' ').slice(0, 200), stars: (document.getElementById('winStats').innerText.match(/★/g) || []).length }));
  }
  res.fr = await pg.evaluate(() => ({ log: window.__game.fr.log, stat: window.__game.fr.stat }));
  res.texts = await pg.evaluate(() => window.__textLog.slice());
  res.evs = await pg.evaluate(() => window.__game.evLog.filter((e) => ['forstekjoring', 'veiledning', 'intro'].includes(e.type)).map((e) => `${e.c}s ${e.type}: ${e.detail}`).slice(-30));
  await ctx.close(); return res;
}

// tafatt: står stille 20 s, trykker TA på feil sted, går feil vei. Hjelp (R64) skal komme innen 12 s etter at stillheten begynte, og aldri som et skjell ut.
async function runTafatt(b, port, errs) {
  const res = { mode: 'tafatt' }, { ctx, pg, cdp } = await newPlayer(b, port, errs);
  await menuPhase(pg, res, 'tafatt'); await introPhase(pg, res, 'tafatt');
  await pg.evaluate(`window.__bot = ${BOT}`);
  const pr = pressor(cdp, pg);
  const frHelps = () => pg.evaluate(() => window.__game.fr.log.filter((e) => /blindgate/.test(e.detail)).map((e) => ({ ...e })));
  const stat = () => pg.evaluate(() => ({ t: window.__game.fr.stat.t, glow: !!window.__game.guide.v.state().route, hintsShown: window.__game.fr.stat.hintN }));
  const t0 = (await stat()).t;
  // 1) står stille 20 s (spilletid), 1 s om gangen
  let helpAt = null, shotHelp = false;
  for (let s = 0; s < 20; s++) {
    await pg.evaluate(() => window.__bot.idleTicks(60));
    const h = await frHelps(); if (h.length && helpAt === null) { helpAt = +(h[0].t - t0).toFixed(1); res.helpWhy = h[0].detail; await pg.waitForTimeout(400); await pg.screenshot({ path: `${out}/tafatt_4_hjelp.png`, timeout: 150000 }); shotHelp = true; }
  }
  res.stillHelpSecs = helpAt;
  // 2) TA på feil sted tre ganger (ekte trykk)
  const before = (await frHelps()).length;
  await pg.evaluate(() => { const bl = window.__game.fr.blind; bl.lastHelp = -1e9; bl.pos = null; bl.still0 = null; });   // slik at ny hjelp kan telles separat fra stillstanden
  for (let k = 0; k < 3; k++) { await pr.sync({ take: true }); await pg.evaluate(() => window.__bot.idleTicks(3)); await pr.sync({}); await pg.evaluate(() => window.__bot.idleTicks(30)); }
  const afterTa = await frHelps(); res.wrongTaHelp = afterTa.length > before && /wrongta/.test(afterTa[afterTa.length - 1].detail);
  // 3) går feil vei (bort fra målet) i 12 s
  const b2 = (await frHelps()).length;
  await pg.evaluate(() => { const g = window.__game; g.fr.blind.lastHelp = -1e9; g.fr.blind.still0 = null; });
  let wrongAt = null; const w0 = (await stat()).t;
  for (let s = 0; s < 14 && wrongAt === null; s++) {
    await pg.evaluate(() => { const g = window.__game, p = g.player, R = g.LEVEL.route, tg = R[1], dx = p.x - (tg.x0 + tg.x1) / 2, dz = p.z - (tg.z0 + tg.z1) / 2, d = Math.hypot(dx, dz) || 1, sy = Math.sin(g.cam.yaw), cy = Math.cos(g.cam.yaw); g.touch.x = (dx / d * cy - dz / d * sy); g.touch.y = (-dx / d * sy - dz / d * cy); g.tick(60, 1 / 60); });
    const h = await frHelps(); if (h.length > b2) wrongAt = +(h[h.length - 1].t - w0).toFixed(1);
  }
  await pg.evaluate(() => { window.__game.touch.x = window.__game.touch.y = 0; });
  res.wrongWayHelpSecs = wrongAt;
  res.helps = await frHelps();
  res.guideEvs = await pg.evaluate(() => window.__game.evLog.filter((e) => e.type === 'veiledning').map((e) => `${e.c}s ${e.detail}`));
  res.texts = await pg.evaluate(() => window.__textLog.slice());
  res.fr = await pg.evaluate(() => ({ stat: window.__game.fr.stat, log: window.__game.fr.log }));
  await ctx.close(); return res;
}

(async () => {
  await new Promise((ok) => srv.listen(0, ok)); const port = srv.address().port;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const errs = [], mode = opt.mode || 'begge', report = { version: null, errs };
  try {
    if (mode !== 'tafatt') report.normal = await runNormal(b, port, errs, opt.diff || 'medium');
    if (mode !== 'normal') report.tafatt = await runTafatt(b, port, errs);
  } catch (e) { report.crash = String(e.stack || e).slice(0, 600); }
  await b.close(); srv.close();
  const N = report.normal, T = report.tafatt, bad = [];
  if (report.crash) bad.push('krasj: ' + report.crash);
  if (errs.length) bad.push(`${errs.length} konsollfeil: ${errs.slice(0, 2).join(' | ')}`);
  if (N) {
    if (!N.won) bad.push('kom ikke i mål: ' + (N.fail || '?'));
    if (N.gameSecs > 300) bad.push(`brukte ${N.gameSecs} s spilletid (kravet er under 300 s)`);
    if (!N.menu?.startVisible && !N.menu?.contVisible) bad.push('menyen har ingen synlig START');
    if (N.menu && N.menu.buttons.length > 3) bad.push(`menyen viser ${N.menu.buttons.length} knapper første gang (${N.menu.buttons.join(' / ')})`);
  }
  if (T) {
    if (T.stillHelpSecs === null || T.stillHelpSecs === undefined || T.stillHelpSecs > 12) bad.push(`stillstand: hjelp kom ${T.stillHelpSecs} s (kravet er innen 12 s)`);
    if (!T.wrongTaHelp) bad.push('TA på feil sted ga ikke hjelp');
    if (T.wrongWayHelpSecs === null || T.wrongWayHelpSecs === undefined || T.wrongWayHelpSecs > 12) bad.push(`feil vei: hjelp kom ${T.wrongWayHelpSecs} s`);
  }
  report.ok = bad.length === 0; report.bad = bad;
  fs.writeFileSync(path.join(out, 'rapport.json'), JSON.stringify(report, null, 1));
  console.log(JSON.stringify(report, null, 1)); process.exit(report.ok ? 0 : 1);
})();
