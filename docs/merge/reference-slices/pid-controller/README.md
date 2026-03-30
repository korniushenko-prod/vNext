# PIDController reference slice v1

## Purpose

`PIDController` is the third canonical vertical family after `TimedRelay` and `PulseFlowmeter`.

It is intentionally the first **control object** in the library roadmap.
That makes it the right boundary between:

- infrastructure already hardened;
- sensor/process objects already proven;
- control-loop semantics that must now be expressed without leaking UI, boiler logic, or autotune complexity into the core.

## Slice scope

`PIDController v1` was closed in controlled phases:

- `PR-14A` - contract
- `PR-14B` - materializer support
- `PR-14C` - ESP32 target support
- `PR-14D` - end-to-end reference slice
- `PR-14E` - additive autotune operation contract

Included in the completed slice:

- public ports;
- rich parameter metadata;
- native seam;
- frontend requirements;
- operations;
- trace groups;
- monitors;
- persistence slots;
- deterministic materialization;
- deterministic ShipController artifact emission;
- golden runtime and artifact snapshots;
- additive autotune operation metadata for future execution slices.

Still intentionally excluded:

- autotune execution;
- autotune apply/commit runtime behavior;
- boiler-specific logic;
- UI canonicalization;
- vendor-specific tuning behavior.

## Public ports

Inputs:

- `pv`
- `sp`
- `enable_cmd`
- `mode_cmd`
- `manual_mv`

Outputs:

- `mv_out`
- `loop_ok`
- `in_auto`
- `saturated`

## Parameter set

`PIDController v1` carries only the disciplined base loop parameters:

- `kp`
- `ti`
- `td`
- `sample_time_ms`
- `output_min`
- `output_max`
- `direction`
- `pv_filter_tau_ms`
- `deadband`

No cascade, split-range, feed-forward, or vendor tuning extensions are allowed in v1.

## Operations

The base operations are:

- `reset_integral`
- `hold`
- `release`

`PR-14E` adds a separate `autotune` operation contract.

The autotune contract is declarative only in this phase:

- confirmation-required execution;
- guarded availability through `safe_when`;
- signal-based progress via `loop_ok`, `in_auto`, and `saturated`;
- result fields for non-applied recommendations: `recommended_kp`, `recommended_ti`, `recommended_td`, and `summary`.

Execution, commit/revert behavior, and target-side autotune runtime remain intentionally out of scope.

The offline target artifact now preserves PID operations as metadata-only entries
even after the frozen Wave 8 execution baseline.
That includes stable ids for `hold`, `release`, `reset_integral`, and additive
autotune metadata without any execution hooks or runnable status for
`pid_autotune`.
This behavior is additive-only beyond bugfixes and remains in force until Wave
9 opens PID autotune execution explicitly.

Wave 9 closes the specialized PID autotune execution slice as a separate
reference path. The base `pid-controller.project.minimal.json` stays frozen as
the generic PID baseline, while the dedicated autotune slice lives in:

- `pid-controller-autotune.project.json`
- `pid-controller-autotune.runtime-pack.snapshot.json`
- `pid-controller-autotune.readback.snapshot.json`
- `pid-controller-autotune.shipcontroller.artifact.snapshot.json`

That Wave 9 slice proves the full path from authoring model through
materialization, ESP32 compatibility, deterministic artifact emission, and the
config-studio service surface for runnable autotune, progress payload,
recommendation availability, and apply/reject lifecycle.

Wave 9 is now frozen for this family. The generic PID baseline and the
dedicated autotune slice are both canonical, but only the autotune slice opens
specialized runnable execution. The frozen Wave 8 reset baseline and the
generic operations spine remain unchanged underneath it.

## Monitoring and traces

Trace groups:

- `control_loop`
- `mode`

Monitors:

- `pv_stale`
- `output_saturated`
- `manual_override_active`

## Persistence and presets

Persistence slots currently cover tuning parameters:

- `kp`
- `ti`
- `td`

Initial presets:

- `fast_loop`
- `slow_process`
- `temperature_loop`

## Files in this slice

- `pid-controller.object-type.json` - canonical library object contract
- `pid-controller.project.minimal.json` - minimal project using the object
- `pid-controller.runtime-pack.snapshot.json` - materialized target-neutral runtime pack snapshot
- `pid-controller.shipcontroller.artifact.snapshot.json` - deterministic offline target artifact snapshot
- `pid-controller-autotune.project.json` - canonical Wave 9 project with runnable autotune metadata
- `pid-controller-autotune.runtime-pack.snapshot.json` - canonical Wave 9 runtime pack snapshot
- `pid-controller-autotune.readback.snapshot.json` - canonical Wave 9 readback snapshot with recommendation result
- `pid-controller-autotune.shipcontroller.artifact.snapshot.json` - canonical Wave 9 offline target artifact snapshot

## Decision

`PIDController v1` is the mandatory third end-to-end vertical slice.

The completed reference path is:

`ObjectType -> ProjectModel -> materializer-core -> RuntimePack -> esp32-target-adapter -> ShipController artifact`
