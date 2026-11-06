// node test_camera.mjs: kamerafølging og landingsfart
import assert from 'node:assert/strict';
import { followYaw, impactSpeed, landingClass, angleDiff } from './camera_util.js';
const dt = 1 / 60;
assert.equal(followYaw(0, 0, -4, 4, dt), 0, 'rett frem: ingen endring');
let y = 0; for (let i = 0; i < 120; i++) y = followYaw(y, 4, 0, 4, dt);                  // går til høyre (+x) mens kameraet ser mot -z
assert.ok(y < -0.5 && y > -1.1, `kameraet svinger mot gangretningen, men rolig (2 s: yaw ${y.toFixed(2)})`);
for (let i = 0; i < 900; i++) y = followYaw(y, 4, 0, 4, dt);
assert.ok(y < -1.45 && y > -1.6, `og ender bak figuren uten overskyting (yaw ${y.toFixed(2)})`);
let rate = 0; { let a = 0; for (let i = 0; i < 60; i++) { const n = followYaw(a, 4, 0, 4, dt); rate = Math.max(rate, Math.abs(n - a) / dt); a = n; } }
assert.ok(rate <= 0.81, `aldri raskere enn 0,8 rad/s (${rate.toFixed(2)})`);
assert.equal(followYaw(0, 0, 4, 4, dt), 0, 'går mot kameraet: stiller seg ikke om');
assert.equal(followYaw(0.3, 0.1, 0, 4, dt), 0.3, 'står (nesten) i ro: ingen endring');
assert.ok(Math.abs(angleDiff(3, -3)) < 0.3, 'vinkelforskjell tar korteste vei');
assert.ok(Math.abs(impactSpeed(0, 8, -22) - Math.sqrt(2 * 22 * 8)) < 1e-9);
assert.equal(landingClass(10, 18, 27), 'ok'); assert.equal(landingClass(20, 18, 27), 'hard'); assert.equal(landingClass(30, 18, 27), 'knock'); assert.equal(landingClass(99, Infinity, Infinity), 'ok');
console.log('kamera-tester grønne');
