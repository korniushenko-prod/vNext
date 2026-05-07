# Program Builder Wizard

## Purpose

Stage 20 adds the first transport-neutral Program Builder Wizard.

This stage does not add a full template engine and does not add a custom state editor.
It only creates safe skeleton programs that operators can review before later editing stages.

The builder helps users:
- choose a supported skeleton kind
- enter program metadata
- bind semantic slots to existing runtime signals, actuators, timers and alarms
- enter required parameters
- preview generated states and transitions
- validate the draft before create
- register the generated program into `SequenceService`

## What Stage 20 Includes

- typed `ProgramBuilderDraft`
- typed `ProgramBuilderCatalog`
- typed `ProgramBuilderPreview`
- `ProgramSkeletonBuilder`
- `ProgramBuilderApiService`
- `WebProgramBuilderAdapter`
- static `webui/program-builder/*` page shell
- host-side tests for builder, API and adapter behavior

## What Stage 20 Does Not Include

- custom state editor
- output matrix editor
- full template engine
- generic config CRUD
- HTTP server routing
- MQTT
- auth or roles
- persistence or import/export

## Supported Skeleton Kinds

- `custom_blank`
- `pump_basic`
- `compressor_basic`
- `burner_supervisory_skeleton`
- `incinerator_supervisory_skeleton`
- `dosing_basic`

These skeletons are intentionally narrow.
They define a first state path, required slot names and required parameters, but they do not try to solve every future process variation.

## Catalog Model

The builder catalog is assembled from runtime services:

- `SignalRegistry` supplies available signals
- `ActuatorManager` supplies available actuator targets
- `TimerService` supplies available timers
- `AlarmService` supplies available alarms
- `SequenceService` supplies existing program ids

Bindings are always semantic.
The builder never maps directly to GPIO.

## Validation Model

Stage 20 validates drafts before preview and before create.

Structured validation issues include:
- `path`
- `code`
- `severity`
- `message`

Current builder validation covers:
- unsupported skeleton kind
- empty program id or name
- duplicate program id
- missing required bindings
- missing required parameters
- wrong signal type
- wrong actuator kind or role
- invalid numeric parameter ranges
- unsafe enable requests

## Preview Before Create

Preview is the main safety checkpoint in this stage.

Preview returns:
- draft summary
- validation issues
- generated state list
- generated transition summary
- stop, trip and lockout branch summary
- review warnings
- disabled-after-create note

If the draft is invalid, preview still returns a structured response with issues.
The generated program may be absent until blocking problems are fixed.

## Safe Creation Rules

Stage 20 creation is intentionally conservative:

- created programs are always `disabled`
- created programs do not auto-start
- create is denied when required bindings or parameters are missing
- burner and incinerator skeletons validate hazardous slots but do not auto-energize hazardous outputs
- placeholder transitions remain in the generated scaffold until later editing stages

Even if `enabled_after_create` is requested in the draft, Stage 20 ignores that request and still creates the program disabled for review.

## Relationship To Later Stages

- Stage 20: wizard plus safe skeleton generator
- Stage 21: custom step editor
- Stage 22: output matrix UI
- Stage 23: fuller template support

Stage 20 is therefore the scaffold-creation layer, not the final process authoring workflow.

In practical terms:
- Stage 20 creates one disabled skeleton `SequenceProgram`
- Stage 23 creates a disabled-by-default runtime bundle that may span `SequenceService`, `LogicService`, `AlarmService` and `PIDService`

The Program Builder remains the safer single-program starting point.
The Template Engine is the curated multi-artifact layer above it.
