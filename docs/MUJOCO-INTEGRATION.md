# MuJoCo integration and ownership

## Current public architecture — October 29, 2026

The public NexusHuman root redirects to `/physics/`. `physics/index.html` builds a URL for the upstream `assets/models/ms-human-700/scene.xml` and opens that scene in the **official hosted MuJoCo Live WebAssembly viewer** (`https://live.mujoco.org/`). The Luminary Labs website embeds the physics route at `/demo/nexushuman/`.

This is a live browser viewer integration, **not** a local MuJoCo WASM runtime shipped in this repository. It does not wire the repository's `MuscleDrive` or custom controller classes into MuJoCo Live, and the website does not have its own model telemetry/control surface yet.

## Model and ground ownership

- The official MS-Human-700 dataset and dependent assets are located at `assets/models/ms-human-700/`, with the original license, a source revision and a SHA-256 manifest.
- `scripts/install-ms-human-700.py` and the installation workflow install the official directory without substituting proxy meshes.
- The scene XML defines a physical MuJoCo ground plane named `floor`. The procedural Canvas benchmark has its own rendered floor and different, nonphysical movement proxies; the two environments must not be confused.
- Physics body contacts, joints, tendons and muscle dynamics belong to **MuJoCo**, not to an independent `cannon-es` solver.

## Architecture decision: separate the Canvas benchmark

- `/physics/` is the primary NexusHuman experience. The old `index.html` Canvas preview was moved to `/benchmark/index.html`; it has no fallback link from the public demo.
- The Canvas version is reserved for a later standalone benchmarking application. It currently remains a route in NexusHuman, **not yet a separate deployed repository or packaged application**.
- Do not describe Canvas FPS, strength proxies, or procedural WASD animation as measurements of the 700-muscle physical model.

## Additional work required for native integration

1. Pin and bundle a compatible `@mujoco/mujoco` WebAssembly runtime if the application needs independent in-page model control rather than relying on MuJoCo Live.
2. Load the full model and variants from the manifest into runtime MEMFS, validate XML includes, meshes and texture paths, then assert the real actuator counts.
3. Verify Emscripten API contracts for `MjModel`, `MjData`, `mj_step`, `mj_forward`, reset and cleanup. Match the experimental Kit to the actual pinned bindings.
4. Wire excitation and telemetry to the real actuator and physical state arrays; preserve MuJoCo as the authoritative simulation source.
5. Add anatomy rendering and a simulation controller with observed physical state, fixed-step timing, load/error recovery and validated contacts.
6. Add or train standing and locomotion policies; the anatomical assets do not supply a verified walking controller.
7. Run model load, full browser, mobile, performance, force/contact and walking tests before describing V1 as accepted.

## Evidence and release state

- GitHub Pages workflows for NexusHuman and Website completed successfully on October 29, 2026.
- The user reported that the MuJoCo viewer worked. Independent end-to-end tests for model stepping, muscle activation, physical accuracy and locomotion were **not** completed.
- See `docs/ACCEPTANCE.md` for the outstanding release gates.
