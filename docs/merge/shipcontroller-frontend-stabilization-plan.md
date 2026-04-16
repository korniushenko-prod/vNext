# ShipController Frontend Stabilization Plan

## Why this plan exists

`targets/shipcontroller-esp32` has reached a point where the main source of instability is no longer the runtime backend or board manager path, but the frontend contract itself.

Observed failure pattern:

- one missing shared helper in `app-core.js` breaks several tabs at once
- `app-init.js` assumes globals exist even when `app-core.js` failed earlier
- feature files depend on implicit global ordering instead of explicit contracts
- cache/version drift can keep an old broken asset alive even after a fix
- heavy startup loads make diagnosis harder and amplify failure chains

This plan exists to stabilize the frontend without losing the current working bench path.

## Target outcome

We want a frontend where:

- one broken feature module cannot break the whole controller UI
- stable commissioning surfaces keep working even if advanced surfaces are broken
- helper dependencies are explicit and verifiable
- asset versioning and cache policy are predictable
- startup is smaller, faster, and easier to diagnose

## Hard rules

These are the rules we keep through the refactor:

1. Do not break the current bench path:
   - overview
   - network
   - hardware
   - channels
   - signals
   - template assignment

2. Do not reintroduce full `loadAll()` after every action.

3. Do not add new hidden global dependencies between feature files.

4. Do not let one failing feature surface kill the whole bootstrap.

5. Keep API endpoints stable while frontend structure changes.

## Root causes to address

### 1. Hidden global dependency graph

Current state:

- `app-init.js` and feature files rely on globals exported by `app-core.js`
- failures in `app-core.js` prevent later exports
- downstream files then fail with misleading secondary `ReferenceError`s

Needed change:

- define one explicit core contract
- register only named exports from core
- feature files consume only that contract

### 2. Fragile script-order coupling

Current state:

- feature files assume previous files already loaded specific helpers
- some files shadow or redefine behavior from others

Needed change:

- reduce cross-file coupling
- move shared behavior into one canonical core layer
- avoid duplicate `render*`, `save*`, `helper*` definitions across features

### 3. Heavy startup bootstrap

Current state:

- startup touches many surfaces too early
- template/editor/module failures can pollute normal commissioning startup

Needed change:

- keep startup minimal
- load advanced surfaces only when their tabs are entered

### 4. Cache/version ambiguity

Current state:

- assets have versioned URLs now, but version bumps were manual and easy to miss
- browser can still serve mixed bundles if version discipline is weak

Needed change:

- one source of truth for asset version
- deterministic cache policy

## Refactor phases

## Current progress snapshot

- `Phase 1` started:
  - `editor` and `modules` removed from required shell path
  - stable commissioning bootstrap no longer depends on those experimental surfaces
- `Phase 2` started partially:
  - `app-core.js` is now the canonical home for shared helpers
  - shell verifies required core exports immediately after loading `app-core.js`
  - goal is to fail with one direct bootstrap error instead of a cascade of secondary `ReferenceError`s

## Phase 1. Freeze and isolate the stable commissioning core

### Goal

Make the basic controller UI reliable even if advanced engineering features are still under repair.

### Scope

Stable surfaces:

- overview
- network
- hardware
- templates assignment
- channels
- signals
- diagnostics/request trace

Experimental surfaces:

- blocks
- editor
- modules
- advanced diagnostics authoring
- advanced sequence authoring

### Deliverables

- explicit list of stable tabs
- explicit list of experimental tabs
- stable tabs can bootstrap without loading experimental modules

### Exit criteria

- stable tabs load with no dependency on `app-editor.js`, `app-modules.js`, or advanced block tooling
- runtime commissioning can proceed even if experimental surfaces are broken

## Phase 2. Establish a strict core contract

### Goal

Move all shared helpers and shared UI state to one canonical place.

### Scope

Create one core contract that owns:

- shared state
- DOM helpers
- JSON/fetch helpers
- formatting helpers
- shared navigation helpers
- modal helpers
- request trace helpers
- unit helpers

### Required exports

At minimum:

- `$`
- `state`
- `getJson`
- `safeGetJson`
- `pretty`
- `escapeHtml`
- `normalizeCapabilities`
- `setPrimaryTabValue`
- `setActiveTab`
- `applyUiMode`
- `updateSignalUnitsVisibility`
- `recordRequestTrace`

### Deliverables

- one explicit export block in `app-core.js`
- one startup self-check for required core exports

### Exit criteria

- no feature file fails because a shared helper was silently missing
- if core boot is incomplete, UI shows one direct bootstrap error instead of a cascade

## Phase 3. Split bootstrap from features

### Goal

Separate shell startup from feature initialization.

### Scope

Introduce a small bootstrap layer:

- load fragments
- load core
- verify required core exports
- register feature modules
- initialize only stable surfaces

### Deliverables

- `app-shell.js` handles asset loading only
- a dedicated bootstrap layer decides which feature modules to initialize

### Exit criteria

- shell loading problems are distinguishable from feature init problems
- core bootstrap errors and feature init errors are logged separately

## Phase 4. Move to feature-local modules with explicit init/render/refresh

### Goal

Each surface becomes autonomous.

### Structure

Target structure:

- `app-core.js`
- `app-bootstrap.js`
- `features/templates.js`
- `features/hardware.js`
- `features/channels.js`
- `features/signals.js`
- `features/display.js`
- `features/alarms.js`
- `features/sequences.js`
- `features/comms.js`
- `features/inspector.js`

Each feature should expose:

- `init()`
- `render()`
- `refresh()`

### Rules

- feature files may use core exports
- feature files may not rely on helpers defined only inside another feature file
- feature files may not redefine shared core helpers

### Exit criteria

- templates can break without breaking channels
- display can break without breaking network
- blocks/editor can break without breaking commissioning surfaces

## Phase 5. Lazy-load advanced surfaces

### Goal

Stop loading everything at startup.

### Strategy

Startup loads only:

- runtime
- boards/chip
- hardware
- channels/status
- signals if required for stable surfaces

Advanced tabs load on demand:

- blocks
- editor
- modules
- advanced sequence surfaces
- advanced diagnostics authoring

### Exit criteria

- first meaningful paint is faster
- startup trace becomes shorter and easier to read
- advanced tab failures do not block normal controller use

## Phase 6. Make asset versioning deterministic

### Goal

Ensure fixes always reach the browser when intended, and never reload unnecessarily when version has not changed.

### Rules

- `index.html` remains revalidated
- versioned assets are immutable
- one source of truth defines the asset version

### Deliverables

- one canonical asset version source
- shell and HTML both use that source
- static file cache policy documented and stable

### Exit criteria

- no more mixed old/new bundles after a real version bump
- ordinary refreshes stop re-downloading unchanged assets

## Phase 7. Add frontend diagnostics as a first-class tool

### Goal

Make frontend failures explainable.

### Scope

Keep and improve:

- request trace
- render trace
- bootstrap error trace
- feature init trace

### Desired outputs

Examples:

- `missing core helper: pretty`
- `feature init failed: templates`
- `refresh failed: /template-library -> 500`
- `render failed: channels`

### Exit criteria

- when UI fails, we can identify the failing layer without guessing

## Immediate next implementation order

This is the practical order to execute:

1. Finish current frontend recovery until stable surfaces are consistently alive.
2. Define the stable/experimental split in code.
3. Add core self-check and required export list.
4. Introduce explicit feature registration.
5. Move templates first to a self-contained feature module.
6. Move channels and signals next.
7. Move hardware and network next.
8. Only after that continue with blocks/editor/modules.

## First module migration order

When we start the real reorganization, migrate in this order:

1. templates
2. channels
3. signals
4. hardware
5. network/settings
6. display
7. alarms
8. sequences
9. comms
10. inspector
11. blocks
12. editor
13. modules

This order keeps commissioning surfaces ahead of experimental tooling.

## Safety checklist during the refactor

Before each migration step:

- stable tabs still open
- request trace still works
- template assignment still works
- channel creation still works
- signal table still renders
- network panel still renders current connection state

After each migration step:

- bump asset version
- upload updated `LittleFS`
- verify one stable flow on real hardware

## Notes for future context recovery

If this plan is reopened later, remember:

- the real backend hardware/template path was mostly healthy
- the main instability came from frontend orchestration and hidden globals
- the first objective is not new UX, but frontend reliability
- do not let experimental surfaces block the commissioning path
