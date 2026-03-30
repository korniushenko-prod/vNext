## Purpose

`Timed Relay Template` is the canonical Wave 5 example of a reusable configured
preset layered over a library `ObjectType`.

It proves the authoring shape only:

- template is a first-class entity in `definitions.templates`
- instance keeps normal effective `type_ref`
- `template_ref` is additive provenance, not a runtime entity

## Scope

Included in `PR-17A`:

- `ObjectTemplate` contract
- `template_ref` on `ObjectInstance`
- template defaults for params, tags, and additive facet metadata

Still intentionally excluded:

- materializer template resolution
- runtime pack changes
- target artifact changes
- UI template browsing/editing

## Frozen baseline

Accepted by `PR-17D`:

- template remains authoring-only
- `template_ref` remains authoring-only
- resolved `RuntimePack` is template-neutral
- resolved target artifact is template-neutral
- explicit and template-based instances are equivalent when effective values match

## Files in this slice

- `timed-relay-template.object-template.json` - canonical template contract
- `timed-relay-template.project.minimal.json` - minimal project using the template
