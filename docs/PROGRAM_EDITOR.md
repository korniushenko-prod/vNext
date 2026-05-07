# Program Editor

Stage 21 adds the first custom step-by-step Program Editor for existing Sequence programs.

Purpose:
- load an existing program from `SequenceService`
- inspect current runtime status in read-only form
- edit metadata, states, transitions, conditions and actions with forms
- preview and validate a draft before save
- save back only through safe inactive-only admin mutations

This editor is different from Stage 20:
- Stage 20 creates new programs from validated skeletons
- Stage 21 edits an already registered program state-by-state
- Stage 21 is form-based, not graph-based

Safety rules in this stage:
- `program_id` is immutable after creation
- active programs load normally but are read-only for save and delete
- save and delete are inactive-only
- disable is denied while a program is active
- enable and disable are explicit admin actions, separate from save
- preview always runs before save and returns structured issues

Editor scope:
- program metadata
- start and reset condition summaries
- state add, clone, remove and reorder
- transition add, remove and reorder
- entry, active and exit action editing
- runtime status panel with transition candidate checklist

Structured validation issues include:
- `path`
- `code`
- `severity`
- `message`

Stage 21 still postpones:
- output matrix UI
- graph editor
- full template engine
- HTTP routing
- MQTT
- auth and roles
- simulation sandbox

Related files:
- `firmware/components/sequence/include/sequence/program_editor_types.hpp`
- `firmware/components/sequence/include/sequence/program_editor_result.hpp`
- `firmware/components/api/include/api/program_editor_api_types.hpp`
- `firmware/components/api/include/api/program_editor_api_service.hpp`
- `firmware/components/api/include/api/web_program_editor_adapter.hpp`
- `webui/program-editor/index.html`
