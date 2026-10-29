# NexusHuman Gameplay Laboratory

A separate experimental **custom gameplay simulator** using the original MS-Human-700 anatomical model, **without MuJoCo**. This is intentionally not a validated 700-muscle biomechanical simulator.

## Architecture

- `index.html` is a browser UI and WebGL rendering shell; uses Three.js solely as a graphics library, not a physics solver.
- `app.mjs` imports the **full MS-Human-700 primary model**, recursively resolves MJCF `<include>` files, builds an articulated body hierarchy from original `<body>` / `<joint>` nodes, and loads each referenced STL/OBJ bone mesh plus the model-defined translucent capsule skin proxies from `../assets/models/ms-human-700/`. Original bone names, positions and quaternions are retained. It counts actuator definitions without claiming to solve them.
- `motion.mjs` is a self-built fixed-step gameplay controller: movement acceleration, walk/run speeds, jump, gravity, ground contact, obstacle collision, and pose animation. Joint animation is authored from gait phases and does **not** calculate muscle/tendon forces.
- `animation.mjs` adds layered anatomical gait: smoothed stride transitions, turn-in-place stepping, pelvis weight shift, active lumbar/thoracic twist, head stabilization, lateral lean, hip rotation, knee flexion, ankle movement and opposing arm motion. It drives the real loaded joint objects with conservative authored angles clamped to each joint's MJCF limits.
- `foot-ik.mjs` maintains per-foot stance anchors and performs bounded iterative inverse-kinematics adjustments on the original MJCF hip, knee and ankle joints. Feet release during swing and jumping; both reacquire stance targets on landing. Joint ranges remain enforced.
- Jumping now uses distinct anticipation, takeoff, flight, impact compression and recovery states. `animation.mjs` drives hip flexion, knee tuck, outward leg spread, ankle/toe extension, arm reach and pelvis compression. These are authored visual poses, not muscle-force outputs.
- The app is separate from `/physics/` (MuJoCo Live demo) and `/benchmark/` (Canvas benchmark). No existing routes are replaced.
- `vendor/three.module.min.js` and `vendor/LICENSE` are local copies of the MIT-licensed renderer already used by Luminary Labs Website. There is no external module CDN dependency.

## Run

From the NexusHuman repository root:

```bash
python3 -m http.server 8000
```

Open http://localhost:8000/gameplay/. A browser must have access to the repository assets and local renderer.

## Validation

```bash
node --test gameplay/tests/motion.test.mjs gameplay/tests/animation.test.mjs gameplay/tests/foot-ik.test.mjs
node --check gameplay/animation.mjs
node --check gameplay/foot-ik.mjs
node --check gameplay/app.mjs
```

A full browser test should verify complete XML/mesh loading, expected actuator count, limb articulation, ground positioning, keyboard interaction, performance, and display on desktop/mobile. These tests cannot be assumed to pass from syntax or unit tests alone.

## Limitations and next work

This is a **gameplay character**, not 700-muscle force simulation. For medically/biomechanically accurate actuation use the existing MuJoCo route. Next steps include more sophisticated inverse kinematics, dynamic body-body collision, retargeted animation controls, contact-driven foot planting, and camera/culling optimization.

## October 29, 2026 — Anatomical turning milestone

- **Implemented and validated:** smooth angular acceleration/deceleration; pelvis/hip counterrotation; lateral weight transfer; active lumbar (`L5_S1`) and lower thoracic (`T12_L1`) twist; neck stabilization; turn-in-place stepping; swing/stance leg and arm coordination.
- **Actual MS-Human-700 limitation:** The selected `Body_Torso_Simple.xml` enables two spine articulation levels and the cervical head/neck group. Other vertebral meshes are present but not individually articulated in this MJCF variant. This feature does not claim fully independent spine control or muscle-driven physics.
- **Automated evidence:** GitHub Actions checks 19 deterministic movement and animation cases, the complete anatomical mesh load, and the actual rotating quaternions of the pelvis, lumbar, thoracic, neck and hip joints during a browser-controlled turn. Headless Chromium captured desktop, mobile and turn screenshots.
- **Performance limitation:** The headless software graphics renderer measured approximately 5 FPS under full model load. This is **not production-ready game performance**, and real-device GPU results remain unmeasured.

### Further fidelity work required for high-end games

1. Improve the initial stance-foot CCD IK into calibrated, contact-measured multi-surface foot placement, with slope adaptation, heel/toe roll and artist-reviewed knee pole vectors.
2. Curated motion capture / authored animation clips with pose matching, turn starts/stops, run cycles and stop/recovery transitions.
3. More detailed skeletal/skin deformation with artist-reviewed anatomical retargeting and independent upper-body animation layers.
4. Adaptive mesh LOD, occlusion/frustum culling, animation update budgets and benchmarks on representative desktop/mobile GPUs.
5. Reproducible visual tests covering side/front/rear views, 90°/180° turns, strafing, reversing, obstacle interaction and camera changes.

These remain outstanding; the delivered upgrade is a validated **procedural anatomical-turning foundation**, not a finished high-fidelity character-animation system.

## October 29, 2026 — Foot contact and jump upgrade

- Introduced a 0.14-second crouch before jump impulse, airborne leg tuck and spread, arm extension, and a 0.30-second landing/recovery stage. Holding Space cannot trigger repeated jumps on landing.
- Added grounded foot stance targets and a bounded multi-joint IK adjustment on MS-Human-700 hip/knee/ankle joints. Stance foot positions remain anchored within a reach limit and unlock for swing/flight. Jumping and landing no longer reuse the walking gait while airborne.
- Added tests for stance/swing/landing foot targets, jump trajectory phases, input debouncing, pose spread, knee bending and landing recovery, plus browser-level rig telemetry and screenshots.
- **Limitations:** IK operates on kinematic foot body pivots and the original selected anatomical rig. It is not yet contact-force or terrain-normal-aware; there is no physically solved muscle actuation, motion-capture clip matching, skin deformation or production-quality performance claim. GPU optimization and reference-motion visual review remain necessary.

