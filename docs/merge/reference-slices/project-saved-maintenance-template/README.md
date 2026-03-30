## Purpose

`Project Saved Maintenance Template` is the canonical Wave 5 example of a
saved configured object using the same `ObjectTemplate` contract.

Its only difference from a library template is `origin = "project_saved"`.

## Scope

Included in `PR-17A`:

- `ObjectTemplate` as a first-class authoring entity
- `project_saved` origin on the same contract
- additive `template_ref` on normal object instances

Still intentionally excluded:

- separate runtime kind
- target adapter payload
- UI saved-object browser/editor

## Frozen baseline

Accepted by `PR-17D`:

- saved configured object uses the same authoring-only template contract
- `template_ref` remains authoring-only
- resolved `RuntimePack` is template-neutral
- resolved target artifact is template-neutral
- explicit and template-based instances are equivalent when effective values match

## Files in this slice

- `project-saved-maintenance-template.object-template.json` - canonical saved-template contract
- `project-saved-maintenance-template.project.minimal.json` - minimal project using the saved template
