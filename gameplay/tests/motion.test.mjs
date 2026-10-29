import test from 'node:test';
import assert from 'node:assert/strict';
import { GameplayMotion, jointAngle } from '../motion.mjs';
test('resting character remains on a stable floor', () => {
  const m = new GameplayMotion();
  for (let i = 0; i < 1000; i++) m.step(1 / 120);
  assert.equal(m.position.z, 0); assert.equal(m.velocity.z, 0); assert.equal(m.grounded, true); assert.equal(m.contacts, 0);
});
test('forward movement and running work with deterministic fixed steps', () => {
  const a = new GameplayMotion(), b = new GameplayMotion();
  for (let i = 0; i < 360; i++) { a.step(1 / 120, {forward:true}); b.step(1 / 120, {forward:true, run:true}); }
  assert.ok(a.position.y > 4); assert.ok(b.position.y > a.position.y * 1.8); assert.equal(a.position.x, 0);
});
test('jump rises and settles back onto the floor', () => {
  const m = new GameplayMotion(); m.step(1 / 120, {jump:true});
  assert.ok(m.position.z > 0); assert.equal(m.grounded, false);
  for (let i = 0; i < 240; i++) m.step(1 / 120);
  assert.equal(m.position.z, 0); assert.equal(m.grounded, true);
});
test('obstacle radius prevents wall penetration', () => {
  const m = new GameplayMotion({obstacles: [{x:0, y:1.2, radius:.5, height:2}]});
  for (let i = 0; i < 200; i++) m.step(1 / 120, {forward:true});
  assert.ok(Math.hypot(m.position.x, m.position.y - 1.2) >= .76 - 1e-9);
  assert.ok(m.contacts > 0);
});
test('joint drive has alternate phases and zero output at rest', () => {
  assert.equal(jointAngle('hip_flexion_r',1,0,true),0);
  assert.ok(Math.abs(jointAngle('hip_flexion_r',1,3,true) + jointAngle('hip_flexion_l',1,3,true)) < 1e-8);
  assert.ok(jointAngle('knee_angle_r',Math.PI*1.5,3,true)>0);
});
test('invalid delta rejected', () => {
  assert.throws(() => new GameplayMotion().step(0), RangeError);
  assert.throws(() => new GameplayMotion().step(1), RangeError);
});
