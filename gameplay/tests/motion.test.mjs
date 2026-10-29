import test from 'node:test';
import assert from 'node:assert/strict';
import { GameplayMotion, jointAngle, anatomicalFacingYaw, cameraFollowOffset } from '../motion.mjs';
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

test('W/S are forward and backward; A/D are left and right, not swapped', () => {
  const directions = [
    ['W', {forward: true}, 'y', 1],
    ['S', {backward: true}, 'y', -1],
    ['A', {left: true}, 'x', -1],
    ['D', {right: true}, 'x', 1]
  ];
  for (const [key, input, axis, sign] of directions) {
    const movement = new GameplayMotion();
    for (let i = 0; i < 120; i++) movement.step(1/120, input);
    assert.ok(movement.position[axis] * sign > 1, `${key}: incorrect direction on ${axis}`);
    const perpendicular = axis === 'x' ? 'y' : 'x';
    assert.ok(Math.abs(movement.position[perpendicular]) < 1e-9, `${key}: unexpected sideways motion`);
  }
});

test('anatomical +X facing agrees with movement forward over different headings', () => {
  // MJCF anatomical forward is the character's local +X vector.
  // Root rotation must map it to controller world forward [sin(h), cos(h)].
  for (const heading of [0, Math.PI/4, Math.PI/2, Math.PI, -Math.PI/2]) {
    const yaw = anatomicalFacingYaw(heading);
    assert.ok(Math.abs(Math.cos(yaw) - Math.sin(heading)) < 1e-12, 'forward X mismatch');
    assert.ok(Math.abs(Math.sin(yaw) - Math.cos(heading)) < 1e-12, 'forward Y mismatch');
  }
});

test('camera follows behind forward movement at every turning angle', () => {
  for (const heading of [0, Math.PI/4, Math.PI/2, Math.PI, -Math.PI/2, Math.PI*1.75]) {
    const forward = { x: Math.sin(heading), y: Math.cos(heading) };
    const right = { x: Math.cos(heading), y: -Math.sin(heading) };
    const back = cameraFollowOffset(heading, 0, 4);
    const cameraToTarget = { x: -back.x / 4, y: -back.y / 4 };
    assert.ok(Math.abs(cameraToTarget.x - forward.x) < 1e-12, 'W must go into screen X');
    assert.ok(Math.abs(cameraToTarget.y - forward.y) < 1e-12, 'W must go into screen Y');
    const cameraRight = { x: cameraToTarget.y, y: -cameraToTarget.x };
    assert.ok(Math.abs(cameraRight.x - right.x) < 1e-12, 'D must be screen right X');
    assert.ok(Math.abs(cameraRight.y - right.y) < 1e-12, 'D must be screen right Y');
    assert.ok(Math.abs(Math.hypot(back.x, back.y) - 4) < 1e-12);
  }
  assert.throws(() => cameraFollowOffset(0, 0, 0), RangeError);
});

test('turning accelerates and decelerates without snapping', () => {
  const m = new GameplayMotion();
  m.step(1/120,{turnLeft:true});
  const first = m.turnVelocity;
  assert.ok(first>0 && first<2.5);
  for(let i=0;i<90;i++)m.step(1/120,{turnLeft:true});
  assert.ok(m.turnVelocity>first);
  const before=m.heading;
  m.step(1/120);
  assert.ok(m.turnVelocity>0 && m.turnVelocity<2.5);
  for(let i=0;i<120;i++)m.step(1/120);
  assert.ok(m.turnVelocity<.01);
  assert.ok(m.heading>before);
});
test('turning in place advances weight-transfer stepping phase',()=>{
  const m=new GameplayMotion();
  for(let i=0;i<150;i++)m.step(1/120,{turnRight:true});
  assert.ok(m.phase>.5,'turn in place must create steps');
  assert.ok(Math.abs(m.heading)>.5,'turn must rotate');
  assert.ok(m.position.x===0 && m.position.y===0,'turn in place does not translate');
});
