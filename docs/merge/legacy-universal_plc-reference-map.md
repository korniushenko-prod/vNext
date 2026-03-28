# legacy-universal_plc Reference Map

Date: 2026-03-28
Status: accepted
Role: reference base
Canonical repo: `vNext`
Reference source: `apps/config-studio/legacy-universal_plc`

## Purpose

`legacy-universal_plc` remains inside `vNext` as a deliberate reference base.
It is not treated as dead archive material and not treated as a second source of truth.

The canonical product direction lives in:
- `apps/config-studio`
- `packages/*`
- `targets/*`
- `docs/architecture`
- `docs/delivery`

The legacy base remains available to preserve strong solutions that should not be forgotten during migration.

## Hard Rule

Use `legacy-universal_plc` as:
- design reference
- interaction reference
- routing/visualization reference
- migration source

Do not use it as:
- active source of truth for new architecture
- place for new feature development
- competing project model
- hidden runtime/editor dependency

## Why It Must Stay

The legacy base contains practical solutions that are still valuable:
- visual readability of routed signals
- routing heuristics and trunk/branch readability ideas
- signal-centric authoring ergonomics on system scope
- inspector behavior and workflow patterns
- object/interface editing patterns
- evolution path that led to `Definitions / Composition`

Deleting or ignoring it would risk losing proven UI and routing decisions.

## Reference Areas To Preserve

### 1. Signal visualization and routing readability

Preserve as reference:
- signal color separation
- outline around routes for contrast on dark canvas
- short port tails
- spacing/detangling between nearby routes
- trunk/branch readability patterns
- overall visual clarity of orthogonal signal routing

Why valuable:
- this is one of the strongest proven parts of the old editor
- it directly affects usability and comprehension

Current status in vNext:
- partially present in `apps/config-studio`
- not yet re-canonized on top of new shared contracts

### 2. System-level signal authoring UX

Preserve as reference:
- first-class signal semantics
- signal selection lifecycle
- signal deletion by net, not by edge
- signal inspector behavior
- fan-out mental model: `1 source -> N targets`

Why valuable:
- this is already a strong authoring model and should not be weakened by edge-only abstractions

Current status in vNext:
- concept preserved in `project-schema`
- UI still needs future re-canonicalization

### 3. Object and interface editing ergonomics

Preserve as reference:
- interface editing flow
- port editing patterns
- inspector layout and selection-driven editing
- object card readability

Why valuable:
- proven ergonomic behavior is easier to preserve than to rediscover later

Current status in vNext:
- partially carried into `apps/config-studio`
- still not fully modularized against shared contracts

### 4. Definition Studio evolution patterns

Preserve as reference:
- `Definitions` navigation ideas
- `Composition` surface interaction patterns
- parent boundary behavior
- route drafting ideas
- diagnostics placement on authoring surfaces

Why valuable:
- these are the closest working prototypes for the future canonical editor

Current status in vNext:
- architecture fixed in docs
- implementation still transitional

## Migration Policy

Migration from legacy happens only by explicit extraction into canonical vNext layers.

Allowed targets:
- `apps/config-studio`
- `packages/*`
- `targets/*`
- `docs/*`

Forbidden pattern:
- importing legacy code directly as a hidden dependency of canonical packages

Preferred pattern:
1. identify a proven legacy behavior
2. document why it matters
3. map it to a canonical target layer
4. re-implement or extract it intentionally
5. test it against the new contracts

## What Is Already Canonized

Already moved into canonical vNext form:
- top-level architecture and repo structure
- ADR/spec baseline for Definition Studio + Composition v1
- shared contract packages
- materializer-core baseline
- config-studio shell baseline

## What Remains Reference-Only For Now

Still primarily reference-only:
- mature signal visualization details
- routing presentation polish
- some editor interaction patterns
- legacy data/model handling shortcuts
- transitional UI logic in legacy app.js

## Review Checklist Before Reusing Legacy Logic

Before moving any legacy logic into canonical vNext, verify:
- does it belong to authoring UI, shared schema, materializer, or target layer?
- does it preserve the accepted scope model?
- does it depend on old inline contracts?
- can it be re-expressed through shared packages?
- does it improve clarity, not just preserve old behavior?

## Canonical Statement

`legacy-universal_plc` stays in the repository as a protected reference base.
Its strongest solutions, especially signal visualization and routing readability, must remain visible and reusable during migration.
New implementation work, however, continues only in canonical `vNext` layers.
