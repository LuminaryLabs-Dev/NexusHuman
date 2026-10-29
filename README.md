# NexusHuman

An experimental, browser-accessible human biomechanics research demo using the official MuJoCo Live WebAssembly viewer and the MS-Human-700 anatomical model.

## Public experiences

- **Main biomechanics demo:** [NexusHuman physics](https://luminarylabs-dev.github.io/NexusHuman/physics/) (also the default NexusHuman GitHub Pages route).
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

Open `http://localhost:8000/physics/` for the physics launch page or `http://localhost:8000/benchmark/` for the Canvas benchmark. The physics view needs network access to MuJoCo Live and the browser must be able to fetch the model URL; a local-only URL cannot be fetched by remote services unless the viewer runs the fetch in the user's browser with compatible CORS support. The public hosted model path is intended for public use.

## Current validation and limitations

The user reported the real physics view working, and the GitHub Pages deployments for both repositories succeeded on October 29, 2026. This does **not** establish measured muscle actuation, a trained locomotion controller, or comprehensive browser and biomechanical acceptance. The integration must still be tested for model loading, full actuator enumeration, physical contact responses, reproducibility, and performance across browsers.

See [V1 acceptance](docs/ACCEPTANCE.md) and [MuJoCo integration](docs/MUJOCO-INTEGRATION.md).

## October 29, 2026 architecture decision

The public NexusHuman experience is MuJoCo physics only. The previous Canvas procedural preview remains separate at `/benchmark/` for future benchmarking work and must not be linked as a fallback in the public demo. No independent benchmark app or repository has yet been published.
