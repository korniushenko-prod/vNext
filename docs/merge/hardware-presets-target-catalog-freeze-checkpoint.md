# Hardware Presets / Target Catalog Freeze Checkpoint

## Status

Frozen

## Canonical Rule

Hardware catalog and target presets are an authoring-only bounded track.

They do not create:

- new runtime kinds
- new target transport layers
- runtime Wi-Fi/display source-of-truth sections
- a generic live board-management workspace

## Frozen Baseline

The accepted baseline is:

- authoring-model hardware catalog and manifest contracts in `project-schema`
- target-neutral `hardware_resolution` output in `materializer-core`
- deterministic `hardware` artifact summaries in `esp32-target-adapter`
- bounded `config-studio` hardware surfaces:
  - read-only hardware preset overview
  - editable hardware manifest editor

Canonical preset lane stays exactly:

- `lilygo_t3_v1_6_1_oled_lora_builtin_led`
- `esp32_c3_super_mini_minimal`

## Boundary

- hardware catalog stays in the authoring model
- presets stay convenience layers over target selection and resource defaults
- materializer output stays target-neutral until target adapter emission
- `config-studio` stays authoring-only and conflict-first for hardware editing

## Non-Goals

- no live bench probing
- no target transport orchestration
- no broad target-config editor
- no new hardware presets beyond the frozen canonical pair in this track

## Result

Hardware preset / target catalog support is now frozen as a bounded,
authoring-only track. Repo active-track truth remains unchanged: real physical
bench execution still belongs to `PR-35A`.
