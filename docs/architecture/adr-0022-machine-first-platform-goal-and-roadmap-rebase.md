# ADR-0022: Machine-First Platform Goal And Roadmap Rebase

## Status

Accepted

## Context

The repository already contains a large frozen implementation history:

- Waves 5 through 18
- a frozen pilot package track
- a frozen verification/sign-off/controlled-rollout repo bundle
- a bounded hardware preset / target catalog track

That work proved important architectural baselines, but it does not fully
capture the final product goal in the clearest language.

The intended product is not:

- just another PLC
- a set of device firmwares
- a fixed catalog of engineering devices in the kernel
- a SCADA-first system

The intended product is a machine-first engineering platform.

## Decision

The platform goal is rebased as follows:

`Universal PLC Platform = machine-first engineering platform for constructing,
diagnosing, and later simulating industrial machines from reusable hierarchical
behavior blocks on one shared project model`

This implies the following canonical rules.

### 1. Kernel neutrality

The kernel must not privilege domain entities such as:

- pump
- valve
- fan
- burner
- separator

The kernel knows only:

- signals
- primitives
- neutral behavior units
- machine compositions
- diagnostics
- templates

### 2. Canonical terminology

The primary engineering term is `machine composition`.

`scenario` is reserved for bounded execution/training/simulation contexts such
as:

- training scenario
- simulation scenario
- commissioning walkthrough

### 3. Diagnostics model

Diagnostics are first-class and rule-based.

This means:

- alarms are structured engineering objects, not just log strings
- causes, check zones, related signals, troubleshooting steps, and snapshots are
  part of the authored model
- diagnostics remain configurable by the template author and by the user
- probabilistic / weighted / ML-like reasoning is not part of the canonical
  baseline

### 4. Shared model, multiple execution contexts

There is one canonical project model.

That model must eventually support:

- real controller runtime
- simulation runtime
- training runtime

Simulation and training are separate products or execution contexts on the same
model, not separate logic formats.

### 5. Historical wave interpretation

Frozen Waves 5 through 18 remain valid implementation history and baseline
proof. They are not discarded.

However, forward roadmap language is rebased from package-first wording toward
machine-first wording.

## Consequences

- future planning should describe the system as a machine construction platform
  rather than as a package-centric PLC extension
- state machines, machine compositions, diagnostics, and future
  simulation/training readiness become central framing elements
- historical wave docs remain valid frozen records, but not the clearest
  high-level statement of end-goal language
