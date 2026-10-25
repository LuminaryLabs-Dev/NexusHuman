# NexusHuman

A browser-based human-terrain laboratory prototype for Nexus Engine research.

**Status: procedural visualization prototype, not an MS-Human-700 integration.** Current movement is a kinematic controller; the user interface deliberately labels this distinction. The benchmarks measure browser frame load, not muscle dynamics or MuJoCo simulation.

## Run

`python3 -m http.server 8000` from the repository root, then open http://localhost:8000. No network or install required.

## Controls

WASD move, Shift faster movement, drag orbit camera, R reset, P pause, 1–3 visualization presets. Use the right panel to adjust movement/environment proxies, spawn 1–100 preview agents, and collect a 30-second JSON benchmark.

## Deployment

A static site is available directly in the root: `index.html`, `style.css`, and `src/`. Configure GitHub Pages → Deploy from a branch → `main` → `/(root)`.

## Real muscle physics: remaining work

1. Import and pin full MS-Human-700 MJCF and dependent mesh assets with their attribution/license.
2. Bundle and initialize a reproducibly verified MuJoCo WASM runtime.
3. Validate dynamics, model loading, contacts and terrain geometry.
4. Port or train verified locomotion and balance controllers. Anatomical model assets **alone** cannot walk in response to keyboard controls.
5. Retarget physical state to a renderable skeletal human and profile actual actuator and solver costs.

See [scope and acceptance](docs/ACCEPTANCE.md). No unsupported muscle physics claims are made.

Upstream: https://github.com/LNSGroup/MS-Human-700 and https://github.com/LNSGroup/msgym