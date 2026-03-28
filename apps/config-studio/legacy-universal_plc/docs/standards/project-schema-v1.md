# Project Schema v1

Canonical root shape:

```json
{
  "schema_version": "1.0",
  "project": {
    "meta": {},
    "settings": {},
    "hardware": {},
    "system": {},
    "runtime_defaults": {},
    "views": []
  }
}
```

Rules:

- ids are unique inside each registry
- references use ids, never display names
- every object has `config`, `internal_model`, `runtime_defaults` and `bindings`
- views live in `project.views`

This repository keeps a concrete reference file in `projects/demo_boiler/project.json`.
