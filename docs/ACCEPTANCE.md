# NexusHuman V1 acceptance — NOT PASSED (public demo published)

## October 29, 2026 publication milestone

- **Published:** `https://luminarylabs.dev/demo/nexushuman/` embeds `https://luminarylabs-dev.github.io/NexusHuman/physics/`.
- **Physics viewer:** `physics/index.html` passes the hosted `assets/models/ms-human-700/scene.xml` URL to the official MuJoCo Live browser application. This is a remotely hosted viewer, not an in-repository MuJoCo WASM build.
- **Anatomical assets:** 251 official MS-Human-700 files, a pinned upstream source revision, license and SHA-256 manifest were added to `assets/models/ms-human-700/`. The asset-install workflow passed.
- **Floor:** the selected upstream MJCF scene includes a collision-enabled ground plane; the Canvas renderer also received a separate camera clipping repair.
- **Public experience decision:** NexusHuman root opens `/physics/`. The previous procedural Canvas application lives at `/benchmark/` for future independent benchmarking work and is not a public demo fallback. A standalone benchmark repository/application has **not** yet been created.
- **Deployment:** GitHub Pages workflows succeeded for `LuminaryLabs-Dev/NexusHuman` at `0f67fd59` and `LuminaryLabs-Dev/Website` at `afe6f877`.
- **Observed user result:** user reported the physics view works. No independent automated live model/physics run was completed in this session.

## Remaining release acceptance gates

1. Demonstrate reproducible model loading and all expected actuators from a pinned MuJoCo runtime, with measured muscle forces and joint/contact telemetry.
2. Verify correct anatomical geometry and transforms in multiple browsers and at mobile viewport sizes, including model load failures and asset integrity.
3. Validate MuJoCo Kit interfaces and their connection to a browser-owned simulation state (the public MuJoCo Live page does not use the experimental Kit).
4. Implement and validate usable individual or grouped muscle controls in the public application.
5. Establish measured, reproducible standing, balance, walking and turning; running requires a separate controller acceptance test.
6. Benchmark actual WASM simulation speed, FPS, memory and recovery using real MS-Human-700 model states. Canvas benchmark metrics do not count as biomechanics metrics.
7. Test the end-to-end nested website viewer, direct-viewer behavior, and deployment after updates.

**Status:** the public demo is deployed, but full V1 acceptance is still **NOT PASSED**. Successful Pages deployment and a user-reported working viewer are not substitutes for biomechanical validation.

## October 27, 2026 — Previous implementation milestone

- Added `kits/mujoco-kit/src/MuscleDrive.ts` and exported it from the experimental Kit.
- The Kit validates `model.nu` actuator commands (including a potential 700-actuator model) and passes them to the backend when one is initialized.
- Added mock-backed tests for full and reduced actuator counts, invalid commands, reset and command slew limiting at `tests/muscle-drive.test.mjs`.
- Those tests were not executed against an actual MuJoCo browser runtime in the reported milestone. These interfaces alone do not establish a fully working physical simulation.
- MuJoCo remains the authority for human physics; any future `cannon-es` integration must not duplicate the articulated human's contacts.
