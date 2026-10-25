# MuJoCo integration contract (in progress)
The existing root index.html is a **procedural preview**, not MuJoCo physics. It remains available pending a fully tested replacement.
## Backend
- Install and pin a browser-compatible MuJoCo WASM distribution; supply its factory to MuJoCoBackend.
- MuJoCo Emscripten APIs vary across releases. Check FS, MjModel, MjData and stepping signatures with the pinned release.
- ModelLoader fetches a complete same-origin asset manifest into MEMFS under /working. All XML, meshes and textures must be included.
- MuJoCo data is authoritative for joint poses, actuator activation, forces and contacts. Do not animate these directly to mimic physics.
- LocomotionController deliberately throws when a validated muscle policy has not been installed. No walking claims without a demonstrably functional policy.
## Remaining validation gates
1. Import upstream locomotion, full-body and manipulation MJCF plus all transitive assets.
2. Lock the upstream revision, SHA-256 of assets, original license/notice and source links.
3. Install WASM runtime and test each model against the actual module API.
4. Create worker integration and measure simulation stability, stepping rates and per-character memory.
5. Implement/render real body transforms with terrain geometry registered as collision bodies in MuJoCo.
6. Validate muscle-force locomotion, UI parameters, benchmark JSON/CSV, mobile load and headless-browser tests.
7. Switch root GitHub Pages build only after acceptance passes.
