# Machine-First Goal And Version Roadmap v1

## Final Goal

The platform goal is:

`one engineering model for constructing industrial machines from reusable
hierarchical behavior blocks, with first-class diagnostics, and later with
simulation/training on the same model`

This means the product is not just a PLC and not just a preset controller.

It is a machine-first engineering platform.

## Canonical Model

The kernel knows only:

- signals
- primitives
- neutral behavior units
- machine compositions
- templates
- diagnostics

The kernel does not privilege domain entities like:

- pump
- valve
- fan
- separator
- burner

Those are library templates or user-created machine compositions on top of the
neutral kernel.

## Terminology

Use these terms as canonical:

- `machine composition` for real engineering systems
- `template` for reusable authoring structures
- `diagnostic item` for structured fault meaning and troubleshooting metadata
- `execution context` for `real`, `simulation`, or `training`

Reserve `scenario` for bounded contexts such as:

- training scenario
- simulation scenario
- commissioning/service walkthrough

## Diagnostics Rule

Diagnostics are first-class and rule-based.

They may contain:

- trigger
- meaning
- probable causes
- check zones
- related signals
- troubleshooting steps
- snapshot template
- operator message
- engineer message
- primary/secondary relationship

They are configurable and must not be hard-coded forever by the developer.

## Shared Model Rule

There is one project model.

That model must eventually support multiple execution contexts:

- `real`
- `simulation`
- `training`

Simulation and training are separate products or runtimes on the same model,
not separate logic formats.

## Version Roadmap

### v0.1 — Core PLC Foundation

Goal:

- prove the deterministic signal/block execution core

Scope:

- signal registry
- primitive blocks
- deterministic tick engine
- minimal port/link model
- minimal machine composition support
- basic alarms
- proof-of-concept machine slices

Expected outcome:

- a working mini PLC core that can run simple composed logic repeatedly and
  deterministically

### v0.2 — Engineering Platform

Goal:

- turn the core into a real machine constructor

Scope:

- state machine engine
- composite blocks v2
- nested compositions
- reusable machine sections
- machine orchestration
- diagnostics v2

Expected outcome:

- the platform can build real stateful engineering machines such as separator,
  pump station, fuel branch, and simple boiler auxiliary logic

### v0.3 — Industrial Logic Expansion

Goal:

- deepen machine logic and diagnostics

Scope:

- advanced sequence/timing engine
- richer machine branching
- rule-based root cause hints
- alarm correlation
- template library/versioning
- routing/transformation layer v2

Expected outcome:

- the platform behaves more like a small industrial engineering system than a
  simple PLC runtime

### v0.4 — Engineering Workbench

Goal:

- provide a professional engineering authoring and debugging workbench

Scope:

- visual programming editor
- nested graph navigation
- signal tracing
- state debugger
- live execution inspection

Expected outcome:

- an engineer can assemble, inspect, and debug complex machine logic as a
  structured software system

### v0.5 — Simulation / Digital Twin

Goal:

- introduce a separate simulation/training product on the same model

Scope:

- simulation engine
- signal profiles
- equipment/environment approximations
- fault injection
- training scenarios
- assessment hooks

Expected outcome:

- the same engineering model can be used for training and troubleshooting
  exercises without rewriting the machine logic

### v0.6 — Platform Ecosystem

Goal:

- open the ecosystem layer around the common model

Scope:

- template marketplace
- plugin system
- optional remote monitoring / fleet features

Expected outcome:

- the platform becomes an extensible engineering ecosystem rather than a single
  embedded product

## Rebased Next Steps After The Historical Wave Roadmap

Frozen Waves 5 through 18 remain valid implementation history.

After the active physical bench track closes, the next planning baseline should
be rebased around the machine-first roadmap above.

The next recommended planning sequence is:

1. Formalize `v0.1.1` technical specification with:
   - signal typing cleanup
   - port-aware link model
   - machine composition terminology
   - rule-based diagnostics attachment points
   - future-ready simulation hooks
2. Define the first proof-of-concept engine slices:
   - `PumpSystem`
   - `SeparatorMiniSequence`
3. Define `v0.2` state machine engine requirements as the first mandatory jump
   beyond the minimal core
4. Reinterpret historical package work as implementation evidence for reusable
   machine sections, not as the final product language

## Historical Roadmap Boundary

The old wave/package roadmap remains:

- valid as frozen delivery history
- valid as implementation proof
- not sufficient as the clearest final product statement going forward

From this point onward, high-level planning should use the machine-first
roadmap as the primary language.
