// Deterministic simplified gameplay controller. Not an anatomical dynamics solver.
export class GameplayMotion {
  constructor(options = {}) {
    this.radius = options.radius ?? 0.26;
    this.gravity = options.gravity ?? 9.81;
    this.walkSpeed = options.walkSpeed ?? 1.8;
    this.runSpeed = options.runSpeed ?? 4.5;
    this.acceleration = options.acceleration ?? 12;
    this.friction = options.friction ?? 10;
    this.obstacles = options.obstacles ?? [];
    this.reset();
  }
  reset() {
    this.position = { x: 0, y: 0, z: 0 };
    this.velocity = { x: 0, y: 0, z: 0 };
    this.heading = 0;
    this.grounded = true;
    this.distance = 0;
    this.phase = 0;
    this.time = 0;
    this.contacts = 0;
  }
  step(dt, input = {}) {
    if (!Number.isFinite(dt) || dt <= 0 || dt > 0.1) throw new RangeError('Fixed step must be 0 < dt <= 0.1');
    const forward = (input.forward ? 1 : 0) - (input.backward ? 1 : 0);
    const strafe = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const mag = Math.hypot(forward, strafe) || 1;
    const speed = input.run ? this.runSpeed : this.walkSpeed;
    this.heading += ((input.turnLeft ? 1 : 0) - (input.turnRight ? 1 : 0)) * 2.5 * dt;
    const targetX = (Math.sin(this.heading) * forward + Math.cos(this.heading) * strafe) * speed / mag;
    const targetY = (Math.cos(this.heading) * forward - Math.sin(this.heading) * strafe) * speed / mag;
    const responsiveness = 1 - Math.exp(-(forward || strafe ? this.acceleration : this.friction) * dt);
    this.velocity.x += (targetX - this.velocity.x) * responsiveness;
    this.velocity.y += (targetY - this.velocity.y) * responsiveness;
    if (this.grounded && input.jump) { this.velocity.z = 4.2; this.grounded = false; }
    this.velocity.z -= this.gravity * dt;
    const oldX = this.position.x, oldY = this.position.y;
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    for (const obstacle of this.obstacles) {
      const dx = this.position.x - obstacle.x, dy = this.position.y - obstacle.y;
      const minDist = this.radius + obstacle.radius;
      const dist = Math.hypot(dx, dy);
      if (dist < minDist && this.position.z < (obstacle.height ?? 2)) {
        const invDist = 1 / (dist || 1);
        const nx = dist ? dx * invDist : 1, ny = dist ? dy * invDist : 0;
        this.position.x = obstacle.x + nx * minDist;
        this.position.y = obstacle.y + ny * minDist;
        const dot = this.velocity.x * nx + this.velocity.y * ny;
        if (dot < 0) { this.velocity.x -= dot * nx; this.velocity.y -= dot * ny; }
        this.contacts++;
      }
    }
    this.position.z += this.velocity.z * dt;
    if (this.position.z <= 0) {
      if (this.velocity.z < 0 && !this.grounded) this.contacts++;
      this.position.z = 0;
      this.velocity.z = 0;
      this.grounded = true;
    } else this.grounded = false;
    const moved = Math.hypot(this.position.x - oldX, this.position.y - oldY);
    this.distance += moved;
    if (this.grounded) this.phase += moved * 4.8;
    this.time += dt;
    return this.snapshot();
  }
  snapshot() {
    return {position: {...this.position}, velocity: {...this.velocity}, heading: this.heading, grounded: this.grounded, distance: this.distance, phase: this.phase, time: this.time, contacts: this.contacts, speed: Math.hypot(this.velocity.x, this.velocity.y)};
  }
}
export function jointAngle(name, phase, speed, grounded) {
  const side = /(?:_l|_L)(?:$|_)/.test(name) ? Math.PI : 0;
  const swing = Math.sin(phase + side);
  const moving = Math.min(1, speed / 2.8) * (grounded ? 1 : 0.25);
  if (/hip_flexion/.test(name)) return swing * .52 * moving;
  if (/knee_angle_[rl]$/.test(name)) return Math.max(0, -swing) * .75 * moving;
  if (/ankle_angle|ankle_dorsi/.test(name)) return -swing * .21 * moving;
  if (/shoulder_elv|elv_angle/.test(name)) return -swing * .26 * moving;
  if (/elbow_flex|elbow_angle/.test(name)) return (.12 + Math.max(0, swing) * .23) * moving;
  if (/lumbar_extension|spine_flex/.test(name)) return .035 * moving;
  return 0;
}
