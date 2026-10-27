import test from 'node:test';
import assert from 'node:assert/strict';
import { MuscleDrive } from '../kits/mujoco-kit/src/MuscleDrive.ts';

function mockBackend(nu = 700) {
  const ctrl = new Float64Array(nu);
  let time = 0;
  const backend = {
    ready: true,
    model: { nu, opt: { timestep: 0.01 } },
    setControls(values) { assert.equal(values.length, nu); ctrl.set(values); },
    step(count) { assert.equal(count, 1); time += 0.01; return this.snapshot(); },
    snapshot() {
      return { time, act: Array.from(ctrl), forces: Array.from(ctrl, v => v * 10), contacts: 2 };
    },
  };
  return { backend, ctrl };
}

test('full 700-actuator command drives the physical backend without truncation', () => {
  const { backend, ctrl } = mockBackend();
  const drive = new MuscleDrive(backend);
  const commands = Array.from({ length: 700 }, (_, i) => i / 699);
  drive.setExcitations(commands);
  drive.step();
  assert.equal(drive.actuatorCount, 700);
  assert.equal(ctrl[0], 0);
  assert.equal(ctrl[699], 1);
  assert.equal(ctrl[350], commands[350]);
  assert.equal(drive.readActuation().contacts, 2);
  assert.equal(drive.readActuation().forces.length, 700);
});

test('rejects invalid actuation before changing any command', () => {
  const { backend, ctrl } = mockBackend(81);
  const drive = new MuscleDrive(backend);
  assert.throws(() => drive.setExcitations(Array(80).fill(0)));
  assert.throws(() => drive.setExcitations([...Array(80).fill(0), NaN]));
  assert.throws(() => drive.setExcitation(81, 0.5));
  assert.throws(() => drive.setExcitation(0, 1.1));
  drive.step();
  assert.ok(ctrl.every(value => value === 0));
});

test('command slew rate is bounded and reset clears input', () => {
  const { backend, ctrl } = mockBackend(100);
  const drive = new MuscleDrive(backend);
  drive.setExcitation(2, 1);
  drive.step(2);
  assert.ok(Math.abs(ctrl[2] - 0.02) < 1e-12);
  drive.resetCommands();
  assert.equal(ctrl[2], 0);
});

test('rejects an unloaded or changed MuJoCo model', () => {
  assert.throws(() => new MuscleDrive({ ready: false, model: null }));
  const { backend } = mockBackend(100);
  const drive = new MuscleDrive(backend);
  backend.model.nu = 700;
  assert.throws(() => drive.step());
});
