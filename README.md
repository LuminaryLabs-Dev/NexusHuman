# NexusHuman

An experimental, browser-accessible human biomechanics research demo using the official MuJoCo Live WebAssembly viewer and the MS-Human-700 anatomical model.

## Public experiences

- **Main biomechanics demo:** [NexusHuman physics](https://luminarylabs-dev.github.io/NexusHuman/physics/) (also the default NexusHuman GitHub Pages route).
- **Custom gameplay laboratory:** [NexusHuman gameplay](https://luminarylabs-dev.github.io/NexusHuman/gameplay/) is a separate custom 120 Hz character-controller app using the original MS-Human-700 anatomical bone STL/OBJ meshes, articulated MJCF body hierarchy, and authored gait motion, without MuJoCo. It does not solve 700-muscle forces. Details: [Gameplay README](gameplay/README.md).
- **Luminary Labs showcase:** [NexusHuman on luminarylabs.dev](https://luminarylabs.dev/demo/nexushuman/). The Website repository embeds the physics route.
- **Canvas benchmark (separate purpose):** `/benchmark/` preserves the original procedural human/terrain renderer, its motion proxies, 1–100 preview agents, and browser frame benchmark. It is **not** a fallback or selectable mode for the public biomechanics demo. Moving it into a distinct benchmarking application is a future step, not a completed repository separation.

## Model assets and runtime

- Official model files are included under `assets/models/ms-human-700/` with original license and a `model-manifest.json` listing files, SHA-256 hashes and the pinned upstream commit.
- Model sources: [MuJoCo Menagerie MS-Human-700](https://github.com/google-deepmind/mujoco_menagerie/tree/main/ms_human_700), installed through `scripts/install-ms-human-700.py`.
- `physics/index.html` hands its hosted `scene.xml` URL to `https://live.mujoco.org/`. The upstream scene contains the ground collision plane. **The physics viewer is a third-party hosted WebAssembly app, not a bundled in-repository MuJoCo runtime.**
- `kits/mujoco-kit/` contains experimental TypeScript adapter and muscle-command interfaces; they are not connected to the public MuJoCo Live page.

## Running locally

From this repository's root, serve the files over HTTP:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/gameplay/` for custom gameplay, `http://localhost:8000/physics/` for MuJoCo Live physics, or `http://localhost:8000/benchmark/` for the Canvas benchmark. The physics view needs network access to MuJoCo Live and the browser must be able to fetch the model URL; a local-only URL cannot be fetched by remote services unless the viewer runs the fetch in the user's browser with compatible CORS support. The public hosted model path is intended for public use.

## Current validation and limitations

The user reported the real physics view working, and the GitHub Pages deployments for both repositories succeeded on October 29, 2026. This does **not** establish measured muscle actuation, a trained locomotion controller, or comprehensive browser and biomechanical acceptance. The integration must still be tested for model loading, full actuator enumeration, physical contact responses, reproducibility, and performance across browsers.

See [V1 acceptance](docs/ACCEPTANCE.md) and [MuJoCo integration](docs/MUJOCO-INTEGRATION.md).

## October 29, 2026 architecture decision

The public NexusHuman experience is MuJoCo physics only. The previous Canvas procedural preview remains separate at `/benchmark/` for future benchmarking work and must not be linked as a fallback in the public demo. No independent benchmark app or repository has yet been published.

## October 29, 2026 custom gameplay milestone

- A separate `/gameplay/` application was added without replacing the public MuJoCo or Canvas routes.
- The custom controller implements fixed-step walk/run, turns, jumps, simplified ground and obstacle contacts. The Three.js renderer consumes **original installed MS-Human-700 bone geometry** and body/joint hierarchy; the 700 actuator entries are enumerated but not force-simulated.
- A reproducible [GitHub Actions browser validation](.github/workflows/gameplay-validation.yml) covers anatomical loading, WebGL, original meshes, mouse/keyboard experience, plus desktop/mobile screenshots. The accepted test run reported **132 rendered bone mesh objects, 72 articulated joints, 700 actuator definitions**, and positive WASD travel.
- Headless Chromium software graphics measured approximately **5 FPS** in the test runner; this is a performance limitation and not representative of a physical GPU benchmark. Better graphics budgeting and real-device performance testing remain outstanding.
- The new gameplay route is **not yet** the default root or Luminary Labs website embedded demo, which continue to use the MuJoCo integration until a deliberate production switchover.
