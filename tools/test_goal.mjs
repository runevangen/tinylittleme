// node tools/test_goal.mjs: kjører målet i selve spillet (Playwright, iPhone 14). Krever server på PORT (standard 8310) og playwright.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire('/opt/node-tools/node_modules/');
let pw; try { pw = require('playwright'); } catch { console.log('test_goal: playwright mangler, hoppet over'); process.exit(0); }
const { chromium, devices } = pw;
const port = process.env.PORT || 8310;
const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['iPhone 14'] }); const p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto(`http://localhost:${port}/?start=0`); await p.waitForFunction(() => window.__game, null, { timeout: 20000 });
await p.evaluate(() => { const s = document.getElementById('story'); s.querySelectorAll('button').forEach((x) => x.click()); s.click(); }); await p.waitForTimeout(600);
await p.evaluate(() => { const g = window.__game; g.player.x = g.LEVEL.goal[0]; g.player.y = g.LEVEL.goal[1]; g.player.z = g.LEVEL.goal[2]; g.tick(3); });
await p.waitForTimeout(500);
const r = await p.evaluate(() => ({ hero: document.getElementById('winHero').innerHTML.length, conf: document.getElementById('winConfetti').children.length, shown: !document.getElementById('win').classList.contains('hide') }));
await p.screenshot({ path: process.env.SHOT || 'goal.png', timeout: 120000 });
await b.close();
assert.deepEqual(errs, [], 'ingen pageerror ved mål');
assert.ok(r.shown && r.hero > 0 && r.conf > 0, JSON.stringify(r));
console.log('test_goal ok');
