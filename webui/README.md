# Web UI

Stage 11 adds the first real embedded page:
- `webui/dashboard/index.html`
- `webui/dashboard/dashboard.css`
- `webui/dashboard/dashboard.js`

Stage 13 adds the first narrow editor page:
- `webui/rules/index.html`
- `webui/rules/rules.css`
- `webui/rules/rules.js`

Stage 15 adds the first narrow flow runtime page:
- `webui/flow/index.html`
- `webui/flow/flow.css`
- `webui/flow/flow.js`

Stage 20 adds the first narrow program creation wizard shell:
- `webui/program-builder/index.html`
- `webui/program-builder/builder.css`
- `webui/program-builder/builder.js`

Stage 21 adds the first custom program step editor shell:
- `webui/program-editor/index.html`
- `webui/program-editor/editor.css`
- `webui/program-editor/editor.js`

Stage 22 adds the first read-only program output matrix shell:
- `webui/program-matrix/index.html`
- `webui/program-matrix/matrix.css`
- `webui/program-matrix/matrix.js`

Current scope is intentionally narrow:
- one Program Dashboard page
- one Rules editor page
- one Flow runtime page
- one Program Builder wizard shell
- one Program Step editor shell
- one Program Output Matrix page
- mechanics-first status presentation
- polling refresh model
- command buttons for Start, Normal Stop, Trip, Reset and Refresh
- form-based create/edit/delete/enable/disable for rules
- batch runtime controls for flowmeters
- preview-before-create scaffold generation UX for programs

Current on-device binding is narrower than the total static shell set:
- `/` serves the dashboard
- `/flow` serves the flow page
- `/rules` serves the read-only hardware rules page
- program builder, program editor, program matrix and templates remain transport-neutral/static shells only

Still postponed:
- broader on-device routing beyond dashboard, flow and read-only rules
- SPA framework
- graph editors and broad multi-step wizards
- PID page
- auth
- MQTT UI

See [docs/WEB_DASHBOARD.md](../docs/WEB_DASHBOARD.md).
See [docs/RULES_UI.md](../docs/RULES_UI.md).
See [docs/FLOW_UI.md](../docs/FLOW_UI.md).
See [docs/PROGRAM_BUILDER.md](../docs/PROGRAM_BUILDER.md).
See [docs/PROGRAM_EDITOR.md](../docs/PROGRAM_EDITOR.md).
See [docs/PROGRAM_MATRIX.md](../docs/PROGRAM_MATRIX.md).
