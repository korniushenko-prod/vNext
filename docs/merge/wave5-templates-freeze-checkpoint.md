# Wave 5 Templates Freeze Checkpoint

Status: frozen
Date: 2026-03-29

Wave 5 is accepted as a first-class authoring layer for reusable configured
presets and saved configured objects.

## Canonical Rules

- `ObjectTemplate` is an authoring-only convenience layer.
- `template_ref` lives only in the authoring model.
- `type_ref` remains the required effective type.
- `materializer-core` resolves template defaults into an ordinary effective
  instance.
- `RuntimePack` is template-neutral.
- target artifacts are template-neutral.
- templates do not define a new execution kind.

## Invariance Canon

If two instances have the same effective values, then:

- explicit instance == template-based instance
- `RuntimePack` must be the same
- target artifact must be the same

This invariance is part of the Wave 5 baseline and is not optional behavior.

## Freeze Boundary

Frozen after `PR-17D`:

- `ObjectTemplate`
- additive `template_ref`
- materializer-side template resolution
- runtime-pack invariance baseline
- target-artifact invariance baseline

After freeze:

- template changes are additive-only
- bugfix-only changes are allowed
- no template-specific runtime fields
- no template-specific target sections
- no UI/browser/editor scope is opened by this freeze

## Canonical Evidence

Wave 5 baseline is supported by:

- reference slices under `docs/merge/reference-slices/*template*`
- materializer invariance coverage in `packages/materializer-core/tests`
- end-to-end invariance coverage in `targets/esp32-target-adapter/tests`

## Next Allowed Step

Only Wave 6 opens after this checkpoint:

- `PR-18A` - operation runtime contracts
- `PR-18B` - materializer operation metadata alignment
- `PR-18C` - esp32 target adapter runtime spine support
- `PR-18D` - end-to-end operation slices
- `PR-18E` - freeze Wave 6
