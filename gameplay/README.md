# NexusHuman Gameplay Laboratory

A separate experimental **custom gameplay simulator** using the original MS-Human-700 anatomical model, **without MuJoCo**. This is intentionally not a validated 700-muscle biomechanical simulator.

## Architecture

- `index.html` is a browser UI and WebGL rendering shell; uses Three.js solely as a graphics library, not a physics solver.
- `app.mjs` imports the **full MS-Human-700 primary model**, recursively resolves MJCF `<include>` files, builds an articulated body hierarchy from original `<body>` / `<joint>` nodes, and loads each referenced STL/OBJ bone mesh plus the model-defined translucent capsule skin proxies from `../assets/models/ms-human-700/`. Original bone names, positions and quaternions are retained. It counts actuator definitions without claiming to solve them.
- `motion.mjs` is a self-built fixed-step gameplay controller: movement acceleration, walk/run speeds, jump, gravity, ground contact, obstacle collision, and pose animation. Joint animation is authored from gait phases and does **not** calculate muscle/tendon forces.
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
node --test gameplay/tests/motion.test.mjs
node --check gameplay/app.mjs
```

A full browser test should verify complete XML/mesh loading, expected actuator count, limb articulation, ground positioning, keyboard interaction, performance, and display on desktop/mobile. These tests cannot be assumed to pass from syntax or unit tests alone.

## Limitations and next work

This is a **gameplay character**, not 700-muscle force simulation. For medically/biomechanically accurate actuation use the existing MuJoCo route. Next steps include more sophisticated inverse kinematics, dynamic body-body collision, retargeted animation controls, contact-driven foot planting, and camera/culling optimization.
