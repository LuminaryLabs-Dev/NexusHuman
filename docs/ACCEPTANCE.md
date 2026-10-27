# NexusHuman V1 — Release gate: FAILED (partial implementation)

Existing static procedural preview intentionally retained. Experimental MuJoCo Kit skeleton moved under kits/mujoco-kit. Contract files and diagnostics are not full physics implementations.

## Not validated
- Bundled MuJoCo WASM runtime and browser execution.
- Pinned MS-Human-700 assets and transitive dependencies for all three models.
- Nexus Kit registration against active contracts.
- Muscle-driven standing, walking and turning.
- Nexus terrain and MuJoCo contacts, anatomical visualization, measured physics benchmarks.
- Automated browser tests and live GitHub Pages acceptance.

No procedural motion or synthetic counts constitute biomechanical validation. The root page stays unchanged until full V1 acceptance passes.

## October 27, 2026 — Muscle actuator command layer
- Added `kits/mujoco-kit/src/MuscleDrive.ts` and exported it from the Kit.
- Accepts and validates all `model.nu` actuator commands (including the 700-actuator primary variant) and passes them into MuJoCo through the existing backend.
- Added mock-backed tests for 700, 100 and 81 actuator counts, invalid commands, reset and slew limiting at `tests/muscle-drive.test.mjs`.
- These tests have **not been executed in a locally checked-out repository** in this session; they do not establish integration with actual MuJoCo.
- The runtime, full model assets, locomotion policy, anatomical mesh renderer and live acceptance remain missing or unvalidated.
- Do not run cannon-es as a second solver for the same articulated human. MuJoCo owns muscle physics and body contacts; optional cannon-es scene props require an explicit, one-way coupling protocol and separate tests.

**Release gate remains FAILED.**
