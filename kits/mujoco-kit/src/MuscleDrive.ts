import type { MuJoCoBackend, Snapshot } from './MuJoCoBackend';

/**
 * Drives real MuJoCo actuator controls. This is not a locomotion policy:
 * a trained or explicitly authored controller must supply muscle excitations.
 */
export class MuscleDrive {
  private readonly backend: MuJoCoBackend;
  private readonly excitation: Float64Array;
  private readonly previous: Float64Array;

  constructor(backend: MuJoCoBackend) {
    if (!backend.ready || !backend.model) throw new Error('Load a MuJoCo model before creating MuscleDrive');
    this.backend = backend;
    this.excitation = new Float64Array(backend.model.nu);
    this.previous = new Float64Array(backend.model.nu);
  }

  get actuatorCount(): number { return this.excitation.length; }

  /** Full-vector excitation, one normalized command per model actuator. */
  setExcitations(values: ArrayLike<number>): void {
    if (values.length !== this.excitation.length) throw new RangeError('Excitation count must match model.nu');
    for (let i = 0; i < values.length; i++) {
      const value = values[i];
      if (!Number.isFinite(value) || value < 0 || value > 1) throw new RangeError('Invalid excitation at index ' + i);
    }
    for (let i = 0; i < values.length; i++) this.excitation[i] = values[i];
  }

  /** Update one anatomical actuator by model index. */
  setExcitation(index: number, value: number): void {
    if (!Number.isInteger(index) || index < 0 || index >= this.excitation.length) throw new RangeError('Invalid actuator index');
    if (!Number.isFinite(value) || value < 0 || value > 1) throw new RangeError('Excitation must be in [0,1]');
    this.excitation[index] = value;
  }

  /**
   * Bounded command slew rate models controller bandwidth, not actual
   * muscle activation dynamics (those belong to the MJCF/MuJoCo solver).
   */
  step(commandRatePerSecond = Infinity): Snapshot {
    const model = this.backend.model;
    if (!this.backend.ready || !model || model.nu !== this.excitation.length) throw new Error('MuJoCo model changed');
    if (Number.isNaN(commandRatePerSecond) || commandRatePerSecond <= 0) throw new RangeError('Invalid command slew rate');
    const maxDelta = commandRatePerSecond * model.opt.timestep;
    for (let i = 0; i < this.previous.length; i++) {
      const delta = this.excitation[i] - this.previous[i];
      this.previous[i] += Math.max(-maxDelta, Math.min(maxDelta, delta));
    }
    this.backend.setControls(this.previous);
    return this.backend.step(1);
  }

  resetCommands(): void {
    this.excitation.fill(0);
    this.previous.fill(0);
    this.backend.setControls(this.previous);
  }

  /** Telemetry obtained from MuJoCo, not synthesized. */
  readActuation(): { commands: number[]; activationState: number[]; forces: number[]; contacts: number } {
    const snapshot = this.backend.snapshot();
    return {
      commands: Array.from(this.previous),
      activationState: snapshot.act,
      forces: snapshot.forces,
      contacts: snapshot.contacts,
    };
  }
}
