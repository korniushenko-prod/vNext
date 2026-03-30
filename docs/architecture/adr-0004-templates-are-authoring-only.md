# ADR-0004 Templates Are Authoring-Only

Accepted. Wave 5 templates are a reusable authoring convenience layer only.

## Decision

- `ObjectTemplate` exists only in the authoring model.
- `ObjectInstance.template_ref` exists only in the authoring model.
- `ObjectInstance.type_ref` remains the required effective type even when
  `template_ref` is present.
- `template.base_type_ref` must match the instance `type_ref`.
- `materializer-core` resolves template defaults into an ordinary effective
  instance and does not introduce a template-specific runtime kind.
- `RuntimePack` stays template-neutral.
- target artifacts stay template-neutral.
- an explicit instance and a template-based instance with the same effective
  values are equivalent and must produce the same `RuntimePack` and the same
  target artifact.

## Freeze Rule

- Wave 5 is frozen as additive-only.
- bugfix-only changes are allowed beyond this point.
- no template-specific runtime fields are allowed.
- no template-specific target sections are allowed.

## Consequence

Templates remain an authoring-layer convenience for reusable configured presets
and saved configured objects. Runtime spines, target execution, and future
operation lifecycles must treat resolved instances exactly the same regardless of
whether their effective values came from explicit params or from a template.
