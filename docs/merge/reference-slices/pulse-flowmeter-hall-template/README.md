## Purpose

`Pulse Flowmeter Hall Template` is the canonical Wave 5 example of a reusable
configured preset for the hall-pulse flowmeter baseline.

It keeps the library object public and stable while moving configured defaults
into a first-class authoring template.

## Scope

Included in `PR-17A`:

- first-class `ObjectTemplate`
- additive `template_ref`
- saved defaults for params, tags, and safe facet metadata

Still intentionally excluded:

- materializer resolution
- runtime or target adapter changes
- UI template tooling

## Frozen baseline

Accepted by `PR-17D`:

- template remains authoring-only
- `template_ref` remains authoring-only
- resolved `RuntimePack` is template-neutral
- resolved target artifact is template-neutral
- explicit and template-based instances are equivalent when effective values match

## Files in this slice

- `pulse-flowmeter-hall-template.object-template.json` - canonical template contract
- `pulse-flowmeter-hall-template.project.minimal.json` - minimal project using the template
