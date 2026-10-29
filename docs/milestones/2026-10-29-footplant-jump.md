# Milestone: Contact-aware foot planting and natural jump cycle

**Date:** October 29, 2026  
**Repository:** `LuminaryLabs-Dev/NexusHuman`  
**Branch:** `main`  
**Status:** Implemented; model and headless browser validation passed  
**Validation evidence:** https://github.com/LuminaryLabs-Dev/NexusHuman/actions/runs/40972095835  
**Related milestone:** [Anatomical turning](2026-10-29-anatomical-turning.md)

## Intent
Extend the custom gameplay application (not MuJoCo) so the real MS-Human-700 skeletal rig appears more human during walking, direction changes and jumping. Preserve the fully hosted anatomical assets and existing physics/benchmark routes.

## Implemented
- `gameplay/motion.mjs`: buffered press-initiated jump with a 0.14-second crouch, upward takeoff, gravity-based flight, detected ground impact and a 0.30-second landing phase. Holding Jump cannot repeatedly fire new impulses.
- `gameplay/animation.mjs`: blended crouch, launch extension, airborne leg spread and tuck, bent knees, ankle/toe extension, arm reaching and landing compression/recovery. Clips are authored per joint and clamped to the MJCF range.
- `gameplay/foot-ik.mjs`: per-foot stance target locking in world space, release on swing/flight, reacquisition on landing, and bounded iterative IK on the existing hip, knee and ankle joints. Extreme target drift replants within a reachable limit.
- `gameplay/app.mjs`: integrates the jump stages and foot IK into the original 3D anatomical rig; exposes read-only diagnostic snapshots.
- `gameplay/index.html`: exposes jump phase and planted-foot count. Browser modules use cache-busted URLs.
- Regression and browser tests: anatomy load, WASD, turn, jump, actual knee/hip joint quaternion motion, foot target acquisition and stance-error bounds.

## Validation evidence
A passing GitHub Actions browser run reported:
- 28 deterministic tests passed, 0 failed.
- Both MS-Human-700 leg IK chains initialized; full anatomical browser rendering worked.
- A sampled airborne pose had 0.518 m of simulated height, nonzero spread and tucked-knee pose; both stance feet were released during flight.
- Both feet replanted at landing, with foot-pivot target errors of approximately 0.031 m each (test acceptance below 0.15 m).
- No browser page errors occurred in the acceptance run.
- Desktop, mobile and airborne screenshots were generated as CI artifacts.

## What this does NOT establish
This is an **authored kinematic gameplay animation**, not real 700-muscle actuation or validated medical biomechanics. The foot solver anchors calcn/foot body pivots rather than calculating measured sole contact pressure. Jump pose is not retargeted from clinical or motion-capture ground truth. Foot sliding is reduced, not proven eliminated. Headless Chromium software rendering remains far below commercial real-time frame-rate targets and is not a substitute for real-device performance testing.

## Follow-up work
1. Ground-normal-aware ankle/heel/toe contact anchors with two-stage heel-to-toe roll and stable planted foot reconstruction.
2. High-quality motion-reference clips and gait/turn/jump matching; review front, side, and rear views frame by frame.
3. Skin/soft-tissue deformation beyond the current bone mesh and translucent capsule proxy presentation.
4. Frustum/LOD/draw-call optimization plus benchmarks on desktop and mobile GPUs.
5. Reproducible regression visual comparisons for turns, jump anticipation, apex and recovery.

**Scope boundary:** The Luminary Labs website demo and hosted MuJoCo physics route are not replaced by this gameplay milestone.
