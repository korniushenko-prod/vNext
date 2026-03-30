## Purpose

`Run Hours Template` is the canonical Wave 5 example of a reusable configured
preset for a monitoring object.

It keeps `RunHoursCounter` as the effective runtime type while moving service
defaults into a first-class authoring template.

## Scope

Included in `PR-17A`:

- template contract
- additive `template_ref`
- saved parameter defaults, tags, and safe preset metadata

Still intentionally excluded:

- materializer merge logic
- target/runtime changes
- UI template flows

## Frozen baseline

Accepted by `PR-17D`:

- template remains authoring-only
- `template_ref` remains authoring-only
- resolved `RuntimePack` is template-neutral
- resolved target artifact is template-neutral
- explicit and template-based instances are equivalent when effective values match

## Files in this slice

- `run-hours-template.object-template.json` - canonical template contract
- `run-hours-template.project.minimal.json` - minimal project using the template
