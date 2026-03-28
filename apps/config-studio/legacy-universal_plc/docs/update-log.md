# Update Log

This file is the persistent progress journal for `universal_plc`.

Rule:

- every meaningful repo update must append a new entry here
- entries should be concise but explicit enough that work is not lost
- this log complements the roadmap and standards docs

## 2026-03-24

### Scope

Initial platform foundation, structure and standards bootstrap.

### Done

- created the base PlatformIO project structure for `universal_plc`
- replaced the template app entrypoint with a runtime-driven `main.cpp`
- reorganized source layout into platform layers:
  - `src/core/model`
  - `src/core/runtime`
  - `src/core/compiler`
  - `src/core/hal`
  - `src/core/debug`
  - `src/core/storage`
  - `src/library/groups`
  - `src/library/controllers`
  - `src/library/safety`
  - `src/packages/boiler`
  - `src/packages/pump_station`
  - `src/packages/tank_level`
  - `src/packages/fuel_transfer`
- added bootstrap core code for:
  - meta model types
  - signal registry
  - alarm engine
  - state engine
  - flow engine
  - compiler scaffold
  - HAL scaffold
  - explain scaffold
  - project store scaffold
  - runtime bootstrap
- added first official native controller scaffolds:
  - `PermissiveGroup`
  - `TripGroup`
  - `AlarmObject`
  - `PumpPairController`
  - `SequenceController`
- added package bootstrap files for:
  - boiler
  - pump station
  - tank level
  - fuel transfer
- added standards documentation:
  - architecture v1
  - native controller catalog v1
  - interface standard v1
  - project schema v1
- added `projects/demo_boiler/project.json` as the first reference project schema
- updated `platformio.ini` with serial monitor speed and filesystem setup
- verified firmware build with `pio run`

### Why It Matters

This establishes the project as a real multi-layer automation platform instead of a flat demo scaffold, and gives us a stable place to grow compiler, runtime, editor and package logic without losing architectural boundaries.

### Next Step

Implement the first real schema-to-runtime path:

- load/represent project objects and signals from the project model
- compile them into runtime tables
- connect the first native controllers to real runtime evaluation

## 2026-03-24 - Web Setup Foundation

### Scope

Initial schema-driven web setup surface for project-level configuration.

### Done

- added persistent project settings storage in:
  - `src/core/storage/project_settings_store.h`
  - `src/core/storage/project_settings_store.cpp`
- added web server bootstrap and API in:
  - `src/web/server.h`
  - `src/web/server.cpp`
- connected web server lifecycle into `src/main.cpp`
- started ESP32 setup access point from stored settings
- added HTTP endpoints:
  - `GET /api/settings`
  - `POST /api/settings`
  - `GET /api/system`
- replaced placeholder web page with a real setup UI in:
  - `data/index.html`
  - `data/app.css`
  - `data/app.js`
- made the settings page schema-driven on the frontend, with neutral sections:
  - project identity
  - runtime defaults
  - access surface
- added runtime status display so the setup page can see controller health without becoming a full debug console
- added a UI method rule to the roadmap: global configuration UI must stay schema-first and domain-neutral

### Why It Matters

This gives the platform a real configuration surface early, which reduces the risk of repeating the previous project pattern where the web UI grew from hardcoded local decisions and later became a structural constraint.

### Next Step

Extend the setup surface toward project schema awareness:

- add hardware and binding sections
- connect settings page fields to canonical project schema concepts
- start separating core setup pages from future package wizards

## 2026-03-24 - Config-First UI Pivot

### Scope

Shift the web layer from controller-backed setup toward local project JSON authoring.

### Done

- reworked the web page into a `Config Studio` focused on canonical `project.json`
- removed the frontend dependency on controller API for the normal editing workflow
- made the UI work as a local draft editor with:
  - browser local storage
  - JSON export
  - JSON import
  - reset to reference project
- kept the raw JSON preview permanently visible while editing
- expanded the editor surface to cover schema-first sections:
  - project meta
  - project settings
  - hardware registry
  - system model registries
  - runtime defaults
  - views
- updated the roadmap to explicitly state that the current priority is `config-first`, with interpreter/runtime following a stabilized configuration model

### Why It Matters

This prevents us from baking firmware and runtime assumptions into the UI too early. The editor can now be used as a real tool for pressure-testing the project schema before we commit to interpreter and runtime behavior.

### Next Step

Grow the config studio into a stronger schema workbench:

- add schema validation feedback
- add object and link helpers on top of raw JSON editing
- decide which parts should stay raw and which deserve first-class structured editors

## 2026-03-24 - UI-First Workspace Pass

### Scope

Turn the config studio from a large schema form into a real workspace with first-class editors for core project entities.

### Done

- rebuilt the config page around top-level workspace tabs:
  - `Project`
  - `System`
  - `Hardware`
  - `Views`
- changed the main interaction model from one long form to an editor workspace with:
  - tab navigation
  - registry summaries
  - list/detail editing patterns
  - persistent live JSON preview
- implemented first-class editors for system registries:
  - `objects`
  - `signals`
  - `links`
  - `alarms`
- implemented first-class editors for:
  - hardware `modules`
  - project `views`
- kept raw JSON as a side panel instead of the primary editing surface
- updated the roadmap so UI-first workspace structure is explicitly part of the method during this phase

### Why It Matters

This is closer to the real product direction. We can now evaluate whether the configuration language is understandable through actual editor workflows, instead of only testing whether a JSON schema is technically writable.

### Next Step

Add productivity and clarity on top of the workspace:

- validation feedback per entity
- quick-create helpers for common object types
- better link authoring flow between existing objects and ports
- decide which JSON-heavy sections should be replaced by dedicated sub-editors

## 2026-03-24 - Dark Workspace Adaptation

### Scope

Adapt the current config studio toward the dark visual language and product shell of the preferred prototypes.

### Done

- rebuilt the page shell into a dark three-panel workspace:
  - topbar
  - left sidebar
  - center workspace
  - right inspector
- restyled the UI to match the darker editor language from the reference mockups
- kept the current `config-first` model editing logic inside the new shell instead of replacing it with boiler-hardcoded demo runtime
- added:
  - breadcrumbs
  - project tree
  - status chips
  - contextual inspector
  - persistent live JSON in the inspector
- preserved workspace tabs and first-class registry editors for:
  - project
  - system
  - hardware
  - views

### Why It Matters

This gets us closer to the visual product direction you actually like, without throwing away the schema-first editor work or collapsing back into a boiler-specific demo shell.

### Next Step

Start borrowing higher-value interaction patterns from the prototypes into this shell:

- object creation helpers
- visual link authoring flow
- state/flow subviews for selected objects
- richer inspector semantics tied to selected entity type

## 2026-03-24 - Interaction Patterns Pass

### Scope

Bring prototype-inspired editing interactions into the dark workspace shell.

### Done

- added object quick-create flow based on reusable native-controller templates
- added first link authoring flow as a typed composer:
  - source object
  - source port
  - target object
  - target port
  - link kind
  - semantic
- added object subviews for selected objects:
  - `Flow`
  - `State`
  - `JSON`
- connected these interactions into the existing `System` workspace instead of making them a separate demo page
- improved shell context updates so breadcrumbs, status chips, project tree and inspector react to edits

### Why It Matters

This is the first step from CRUD-style registry editing toward a real visual automation editor workflow. We now have the beginnings of authoring patterns that can later grow into proper graph editing, state authoring and package composition.

### Next Step

Strengthen these interactions into real editor primitives:

- inline validation during object and link creation
- port-aware link compatibility checks
- richer flow/state visualizations from internal model data
- action-oriented creation flows for signals and alarms, not only objects

## 2026-03-24 - Local Browser Preview Fix

### Scope

Make the config studio open correctly directly from the desktop browser via `file://`.

### Done

- changed asset paths in `data/index.html` from absolute web-root paths to relative paths:
  - `./app.css`
  - `./app.js`

### Why It Matters

When the page is opened directly from disk on a PC, absolute paths like `/app.js` and `/app.css` resolve incorrectly and can make it look like the page was not updated. Relative paths allow the same page to work both from local disk preview and from the embedded web root.

### Next Step

Keep local browser preview usable during the config-first phase, so UI iteration does not depend on uploading assets to the controller.

## 2026-03-24 - Editor Cohesion Pass

### Scope

Tighten the new interaction patterns so the shell behaves more like a real editor workspace and less like disconnected panels.

### Done

- added explicit registry focus tracking across the workspace, so inspector and breadcrumbs follow the active registry instead of guessing from the first non-empty selection
- made the project tree actionable:
  - clicking entries now changes workspace tab and focused registry
- strengthened object subviews with starter actions:
  - `Seed Flow`
  - `Seed State`
- improved object subview context with port counts and internal model type
- improved link authoring feedback with readiness hints based on current source/target port choices
- made object and link creation flows move focus into the relevant registry after creation
- refined tree item styling so the dark shell still feels like an editor when used directly in the browser

### Why It Matters

These changes make the workspace feel intentional and navigable. The shell now has a clearer sense of selection, focus and next action, which is important if we want to validate the configuration language through editor workflows before committing it to interpreter and runtime.

### Next Step

Push the editor one layer deeper:

- add inline validation for ids and required references
- add port compatibility checks during link authoring
- add first-class signal and alarm creation helpers similar to object templates

## 2026-03-24 - Navigation Simplification Pass

### Scope

Remove duplicated workspace mode navigation from the sidebar.

### Done

- removed the left-side `Modes` block from the dark shell
- kept topbar workspace tabs as the single visible place for mode switching

### Why It Matters

The sidebar no longer repeats navigation that already exists at the top of the workspace. This reduces visual noise and makes the shell easier to read.

### Next Step

Continue simplifying the shell where repeated controls do not add meaning, while keeping object and system authoring actions easy to reach.

## 2026-03-24 - Visual Component Editor v1

### Scope

Turn the selected object area into the first real visual component editor instead of a simple subview preview.

### Done

- replaced the old object subview block with a `Component Editor`
- added component-level modes:
  - `Interface`
  - `Flow`
  - `State`
  - `JSON`
- added a component editor shell with:
  - left palette
  - center canvas
  - local component inspector
- added visual authoring for interface ports:
  - add input port
  - add output port
  - click-to-select port cards
- added visual authoring for flow:
  - add input, logic, timer and output nodes
  - starter flow seeding
  - clickable node cards on the canvas
- added visual authoring for state machines:
  - add state
  - add transition
  - starter state-machine seeding
  - clickable state and transition elements
- synchronized component selection state so the local inspector follows the selected port, node, state or transition
- improved internal model handling so `model_type` stays coherent when flow and state structures are introduced

### Why It Matters

This is the first real move from registry CRUD toward component design. We can now test whether native-controller objects feel natural when edited as components, which is exactly the pressure we need before locking down compiler and runtime behavior.

### Next Step

Deepen the component editor into a more trustworthy design tool:

- allow direct editing of selected port/node/state properties in the local component inspector
- add visual connection authoring inside the flow canvas
- add transition guards and actions as first-class state editor elements

## 2026-03-24 - Local Draft Resilience Pass

### Scope

Prevent local browser startup failures when older or malformed draft data exists in `localStorage`.

### Done

- hardened project normalization so registry collections are forced back into array form
- normalized object interface and internal model structures during project load/render
- added a guarded `renderApp()` fallback so the page shows a readable render error panel instead of failing silently

### Why It Matters

During this phase we are evolving the editor and schema quickly. Old local draft data should not make the whole page feel broken when opened directly from disk in the browser.

### Next Step

Keep strengthening editor resilience while adding real component authoring:

- local editable component inspector
- flow connection authoring
- state transition guard/action editing

## 2026-03-24 - Cache Reset Control

### Scope

Add a direct UI control for clearing local browser draft data.

### Done

- added a `Clear Cache` button to the top action bar
- wired it to remove the saved local draft from `localStorage`
- after clearing, the studio now restores the reference project and resets local editor state

### Why It Matters

During rapid UI and schema iteration, stale local browser data can make the page look broken or out of date. A visible reset control removes the need to use browser devtools for routine recovery.

### Next Step

Keep improving local-browser iteration ergonomics while making the component editor deeper and safer.

## 2026-03-24 - Editable Component Inspector

### Scope

Make the local inspector inside the component editor actually editable.

### Done

- added editable local inspector forms for selected component elements:
  - input ports
  - output ports
  - flow nodes
  - states
  - transitions
- kept a short selection summary at the top of the local inspector and added editable fields below it
- made inspector id fields selection-aware so editing an element id does not immediately lose local selection
- added editable fallback fields for the component itself when no inner element is selected
- added styling for the inspector editor block so the forms feel like part of the component editor

### Why It Matters

This turns the component editor from a visual preview into a real authoring surface. We can now shape the object boundary and internal model directly where the user is looking, which is much closer to the product direction we want.

### Next Step

Keep deepening the component editor:

- add direct editing for flow edges
- add state transition guards/actions as richer controls
- add inline validation for ids and broken references inside the local inspector

## 2026-03-24 - Focused Object Editor Layout

### Scope

Fix the workspace hierarchy so object editing gets a real focused layout instead of being squeezed inside a generic registry detail pane.

### Done

- changed `System` to render one active registry at a time instead of stacking all registries in one long workspace
- made `System / Objects` open in a focused object-editor layout with:
  - left object browser
  - central object editor stage
  - quick-create area in the browser column
- moved selected object editing out of the generic `renderRegistryEditor("objects")` flow
- made focused object editing hide the outer global inspector so the component editor gets the main screen width
- kept `signals`, `links` and `alarms` as focused registry views, with `links` still showing the composer before the registry

### Why It Matters

This fixes the biggest structural issue in the page: the component editor is now treated as the primary workspace when editing an object, instead of being nested inside CRUD scaffolding that fights for the same space.

### Next Step

Use the new focused layout to improve editing quality:

- add direct editing for flow edges
- add transition guards/actions as richer controls
- tighten visual hierarchy in the object browser and top editor strip

## 2026-03-24 - Port-Based Flow Editor v1

### Scope

Replace the fake card-style flow preview with a real port-based graph interaction model.

### Done

- normalized flow nodes to carry explicit `ports.inputs` and `ports.outputs`
- normalized flow edges to explicit graph form:
  - `from_node`
  - `from_port`
  - `to_node`
  - `to_port`
- removed implicit auto-linking when creating flow nodes
- updated starter flow seeding to use explicit port-to-port edges
- replaced the old flow card rendering with a graph board that shows:
  - node headers
  - visible input ports
  - visible output ports
  - SVG edge overlay
- implemented click-to-connect flow authoring:
  - click output port to start a connection
  - click input port to complete and save the edge
- made node positions editable by dragging the node header
- made node positions and created edges persist back into the flow model and local draft
- added local inspector support for:
  - flow ports
  - flow edges

### Why It Matters

This moves the flow editor toward an interaction model that engineers can actually understand. Connections are no longer implied by card order or proximity; they are explicit contracts between visible ports, which is the right foundation for a PLC-style visual logic editor.

### Next Step

Keep refining the real graph editor instead of falling back to card metaphors:

- add direct editing and deletion for flow edges
- add temporary wire preview while connecting ports
- add compatibility checks between port types before accepting a connection

## 2026-03-24 - Canonical Editor Workflow

### Scope

Fix the editor direction by documenting how a project should actually be assembled from zero.

### Done

- added:
  - [editor-workflow-v1.md](/c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/docs/standards/editor-workflow-v1.md)
- defined the canonical assembly path:
  - project setup
  - hardware inventory
  - system objects
  - object interfaces
  - component authoring
  - system wiring
  - signals and alarms
  - hardware bindings
  - validation
  - simulation/runtime
- explicitly separated three connection classes:
  - internal `Flow Edges`
  - system `Links`
  - hardware `Bindings`
- defined the required editor surfaces:
  - `Project Setup`
  - `System Builder`
  - `Component Editor`
  - `System Wiring`
  - `Hardware Binding`
  - `Validation`
  - `Simulation / Trace`
- updated the roadmap so future UI refactors are judged against this workflow instead of local layout convenience

### Why It Matters

The UI was starting to drift between browsing, component editing and global inspection. This workflow gives us an objective way to decide what each screen is for and what kind of connection it is allowed to edit.

### Next Step

Refactor the current UI toward this structure:

- stabilize `System Builder`
- give `Component Editor` mode-specific layouts
- split out a dedicated `System Wiring` surface

## 2026-03-24 - System Builder Refactor Pass

### Scope

Start aligning the live UI with the canonical editor workflow instead of keeping `System` as a blended workspace.

### Done

- made sidebar `Library Focus` actionable:
  - `Objects`
  - `Signals`
  - `Links`
  - `Alarms`
- added a real `System Builder` mode bar in the workspace so `System` now edits one focused surface at a time
- kept `Objects` as the focused object editor surface
- split `Signals` into a dedicated signals workspace instead of stacking it below unrelated registries
- split `Links` into a dedicated `System Wiring` surface with:
  - wiring composer
  - port inventory
  - explicit system-link list
- split `Alarms` into a dedicated alarms workspace
- added mode-specific layout classes for `Component Editor`:
  - `Interface`
  - `Flow`
  - `State`
  - `JSON`

### Why It Matters

This is the first real move from a blended editor shell toward the workflow we documented. `System` is now becoming a set of honest work surfaces instead of one page trying to do browsing, component editing and system wiring at the same time.

### Next Step

Use this new structure to improve editing quality inside each surface:

- simplify and widen `Interface` mode
- refine `System Wiring` beyond the current registry/composer hybrid
- continue turning `State` into its own proper editor geometry

## 2026-03-24 - Object Inspector Move

### Scope

Free more width for the active object editor by moving object metadata out of the top stage header.

### Done

- removed the wide top `Focused Object Editor` form block from the object stage
- moved object identity and metadata fields into a narrow side inspector inside the focused object editor shell
- left the main canvas area to the actual component editor instead of object-level CRUD fields

### Why It Matters

The object editor should spend its best width on interface, flow and state authoring. Object metadata is still important, but it should not dominate the top of the stage or compress the main editing surface.

### Next Step

Continue reducing non-essential chrome inside the object stage while widening the real editing canvas.

## 2026-03-24 - Blank Project Template

### Scope

Remove boiler-specific bias from the editor reset template so the project can be built from zero.

### Done

- replaced the default in-browser project template with a blank project
- removed boiler-specific defaults from the reset/cache-clear path:
  - project id/name
  - system id/name
  - boiler view
  - pre-seeded permissive object
  - boiler tags
  - pre-seeded hardware module
- kept only neutral platform-level defaults such as tick, timezone and empty registries

### Why It Matters

The editor should let the user walk the full assembly path intentionally. A prefilled boiler demo hides too much of the actual workflow and makes it harder to judge whether the system is understandable from zero.

### Next Step

Use the blank template to refine the true creation flow:

- first project setup
- first hardware module
- first object
- first component wiring

## 2026-03-24 - Project Start Screen

### Scope

Turn the `Project` tab into a real entry surface for starting or opening work instead of a long form wall.

### Done

- replaced the old `Project Workspace` top section with `Project Start`
- added explicit start actions:
  - `New Blank Project`
  - `Create From Template`
  - `Open Project JSON`
  - `Continue Current Draft`
- implemented template cloning semantics instead of “opening a template as a project”
- added starter project templates:
  - `Boiler Reference`
  - `Pump Station Starter`
- added a compact `Current Draft` summary block
- reorganized project editing into smaller sections:
  - `Project Start`
  - `Project Identity`
  - `Runtime Defaults`
- reduced the visual dominance of the old oversized project forms

### Why It Matters

This gives the user a proper first step in the product. It also makes template usage conceptually cleaner: templates now produce new project drafts instead of behaving like mutable source projects.

### Next Step

Use the new start screen to keep tightening first-run flow:

- add a dedicated guided first-step path for blank projects
- keep shrinking oversized field blocks
- later turn template creation into a more explicit template gallery

## 2026-03-24 - Project Start Compression

### Scope

Make the project start screen more laconic and tool-like.

### Done

- shortened the main `Project Start` copy
- compressed start actions into a compact row:
  - `New Blank`
  - `Open JSON`
  - `Continue Draft`
- reduced padding and text weight in start action cards
- reduced template card height and copy density
- kept the same functionality while making the screen feel less like oversized marketing tiles

### Why It Matters

This screen should act like a control surface, not a landing page. Smaller, denser actions help the user start work faster and leave more room for actual project content.

### Next Step

Continue compressing non-essential chrome and move toward a more tool-like first-run flow.

## 2026-03-24 - Project Start Recomposition

### Scope

Reorganize the `Project` tab so the start actions, identity fields and templates read in a clearer order.

### Done

- moved `Project Identity` into the top row to the right of `Project Start`
- moved `Create From Template` out of the top split and into its own block below
- kept `Runtime Defaults` below the main start/setup area

### Why It Matters

This makes the page read more naturally:

- start or resume on the left
- define identity on the right
- choose a template below when needed

The entry flow is now less visually tangled.

### Next Step

Continue tightening the `Project` tab until it feels like a compact control surface rather than a stacked set of large cards.

## 2026-03-24 - Project Modes Split

### Scope

Separate project entry actions from project settings so the `Project` tab stops trying to do both at once.

### Done

- split the `Project` tab into two explicit modes:
  - `Start`
  - `Settings`
- kept `Project Start` and a light `Project Identity` panel in the `Start` mode
- moved broader project/runtime settings into the `Settings` mode
- added a compact `Project Mode` switcher at the top of the tab

### Why It Matters

This is closer to how strong editor UX usually behaves: entry actions and configuration editing are different tasks and should not fight for the same screen at the same time.

### Next Step

Continue simplifying `Start` and make `Settings` feel more like a compact inspector than a long form.

## 2026-03-24 - Project Start Flow And Local Project Registry

### Scope

Replace the oversized `Project` admin-style page with a compact creation flow that supports more than one local project without turning the product into a file manager.

### Done

- removed the `Project Mode` split and dropped the extra `Settings` surface
- reduced `Project` to a compact start flow:
  - `New Project`
  - `Open JSON`
  - `Continue`
- changed blank and template creation into explicit create flows with:
  - `Project Name`
  - optional `Description`
- made `Project ID` and system identity generate automatically instead of asking the user to type them
- moved local browser storage from a single draft to a small project registry with:
  - `currentProjectId`
  - multiple local project records
  - `Recent Projects` when there is more than one project
- changed project creation so it automatically saves and moves into `System / Objects`
- compressed the visual density of the `Project` screen so it behaves more like a tool surface than a landing page

### Why It Matters

This is closer to the real user task:

- name the project
- optionally add a short description
- start building the system

It also keeps the door open for multiple local projects without forcing a heavy project-management UI too early.

### Next Step

Refine the `System / Objects` first-run experience so a newly created blank project immediately suggests the first useful object creation actions.

## 2026-03-24 - Quiet Project Headers

### Scope

Remove the heavy sticky header treatment from the `Project` start panels so the page reads like a tool surface instead of a stack of editor cards.

### Done

- added a `panel-quiet` variant for `Project Start`
- applied it to:
  - `Project Start`
  - `Current Project`
  - `Create From Template`
  - `Recent Projects`
- removed the sticky divider feel from those panels while keeping the normal panel header behavior elsewhere

### Why It Matters

The old header divider was useful in long editor panels, but it looked like accidental chrome above the compact start actions. The quieter variant keeps the hierarchy without inserting a heavy line between heading and action strip.

### Next Step

Do a final usability pass on the `Project` page, then move the main focus to blank-project onboarding in `System / Objects`.

## 2026-03-24 - File Save Flow In Topbar

### Scope

Move project saving out of the `Project` page and into a global file flow so projects can be opened and saved from anywhere in the editor.

### Done

- replaced the old topbar actions with:
  - `Open`
  - `Save`
  - `Save As`
  - `Clear Recovery`
  - `Reset Project`
- added a file status indicator in the topbar showing:
  - saved state
  - unsaved changes
  - current JSON filename
- added direct file save/open support when the browser exposes the File System Access API
- kept JSON download/import as a fallback for browsers that do not support direct file writing
- kept `localStorage` as a recovery layer instead of the main project destination
- left project creation and editing available from any workspace while making file save reachable globally

### Why It Matters

The project should not depend on visiting the `Project` page just to save work. The main persistence path is now a real JSON file workflow, while browser recovery stays as backup instead of acting like the source of truth.

### Next Step

Make the blank-project path in `System / Objects` immediately suggest the first useful object templates after project creation.

## 2026-03-25 - System Objects Cleanup

### Scope

Remove low-level native-block shortcuts from the system object layer and make object deletion explicit in focused object editing.

### Done

- removed the `Quick Create` block from `System / Objects`
- kept the system object browser focused on top-level objects instead of internal native controllers
- changed the empty `Objects` state to explain the right workflow:
  - create subsystem objects first
  - build their internals later in the component editor
- added a clear `Delete Object` action to the `Object Inspector`
- renamed the browser action from `Add Empty` to `Add Object`

### Why It Matters

The system layer should describe plant decomposition, not tempt the user to start with low-level blocks too early. Native blocks still belong inside component design, but they should not dominate the first system-level screen.

### Next Step

Add guided starter suggestions for a blank boiler project, but keep them at the subsystem level rather than exposing native blocks directly on the system canvas.

## 2026-03-25 - Object Identity Simplification

### Scope

Make object identity feel natural during early system design by treating the user-facing name as primary and the technical id as a derived value.

### Done

- changed new manual system objects to start as `PackageObject` instead of low-level controller types
- made object ids generate automatically from object names
- derived object category from object type instead of making the user manage both fields manually
- simplified `Object Inspector` so it now focuses on:
  - `Object Name`
  - generated `Object ID`
  - readonly `Type`
  - readonly `Category`
- simplified the default component-level inspector so it no longer asks for object id/type/category editing as the first step
- made field edits persist to the recovery draft automatically, so file status and local recovery stay in sync with normal editing

### Why It Matters

This keeps the editor aligned with the real mental model:

- the engineer names the subsystem
- the platform generates a stable technical id
- the model classification stays visible but secondary

That is closer to a usable system-design workflow and avoids forcing implementation details too early.

### Next Step

Continue guiding the user through subsystem-first boiler assembly, now that object identity is less technical and easier to trust.

## 2026-03-25 - Local Object Creation Flow

### Scope

Keep object creation physically close to the `Add Object` action so the eye does not have to jump across the whole screen during the first naming step.

### Done

- replaced immediate empty-object creation with a local create composer in the object browser
- made the first object-creation step ask only for `Object Name`
- kept generated object id as a derived result instead of exposing technical fields during the create step
- reused the same local create flow from both:
  - the object browser header
  - the empty `System Objects` state

### Why It Matters

The user should not click `Add Object` and then hunt for the next required action in a distant inspector. This keeps the creation step close to the trigger, which is a much better editor pattern for rapid system decomposition.

### Next Step

Continue the boiler project path directly from `System / Objects`, now that creating the first subsystem object is visually local and easier to trust.

## 2026-03-25 - Object List Contrast Pass

### Scope

Improve contrast and selection readability in the object/system lists so newly created subsystem objects read clearly at a glance.

### Done

- added explicit text color to library, tree and registry items
- improved registry meta text contrast
- gave active registry items a slightly richer selected background instead of relying only on border highlight

### Why It Matters

These lists are now the main navigation surface for system decomposition. If names and ids do not read cleanly, the user spends attention fighting the UI instead of shaping the system model.

### Next Step

Continue the boiler project path by defining the first minimal object interfaces for the four subsystem objects.

## 2026-03-25 - Standard Signal Type And Data Type Selectors

### Scope

Make port and signal typing easier to understand by replacing free-text type entry with standard role/type selectors plus a `Custom` escape hatch.

### Done

- added standard selector lists for:
  - `signal_type`
  - `data_type`
- enabled `Custom` fallback when the standard list does not fit
- applied the new selectors to:
  - system signal editing
  - input port editing
  - output port editing
  - internal flow port editing
- added field hints explaining:
  - signal role in the system
  - value type carried by the port or signal

### Why It Matters

This keeps the platform grounded in standard interface contracts without trapping the user in a rigid schema too early. It also makes it much clearer what should be chosen during interface authoring: first the role, then the value type.

### Next Step

Continue the boiler walkthrough using the new standard selectors while we watch for places where the interface still feels too indirect.

## 2026-03-25 - Local Port Quick Edit In Interface

### Scope

Reduce interface-editing friction by moving the most common port actions directly onto each port card instead of forcing the user to scroll to the component inspector.

### Done

- added `Edit` and `Delete` actions to each input/output port card
- made the selected port open a short inline quick editor directly in the same port column
- kept the quick editor focused on the fields most often needed during interface authoring:
  - `Port Name`
  - `Signal Type`
  - `Data Type`
  - `Description`
- kept the component inspector as a secondary surface instead of the only way to adjust a port

### Why It Matters

Large objects can have many ports. When every small change requires hunting through a distant inspector, interface authoring becomes slower and harder to trust. Local quick edit keeps the action, the port and the result in one place.

### Next Step

Continue the boiler walkthrough and keep testing whether the `Interface` surface now feels direct enough for real subsystem contract authoring.

## 2026-03-25 - Quick Port Settings Became Explicit

### Scope

Make port quick settings behave like a temporary local tool instead of a permanently open second layer in the interface editor.

### Done

- separated `quick settings open` from plain port selection
- changed the local port actions from text buttons to compact gear and trash icons
- made the gear button toggle quick settings open and closed on the same port card
- kept a normal click on the port card for selection only
- made quick settings close when:
  - the gear is toggled off
  - another object is opened
  - the editor view changes away from the current interface surface
- added a local close action inside the inline quick settings block

### Why It Matters

This keeps interface authoring tighter and easier to scan. Engineers can still select a port for context, but quick settings only appear when explicitly requested and stay visually attached to the port they belong to.

### Next Step

Continue the boiler walkthrough in `feedwater_system` and keep simplifying any place where the screen still makes the user hunt for the next action.

## 2026-03-25 - Interface View Width Rebalanced

### Scope

Fix the `Interface` surface so input/output columns stay readable on medium widths instead of collapsing because the side panes consume too much room.

### Done

- narrowed the fixed side columns used by the interface editor
- made the interface mini-inspector drop below the main working area earlier on narrower screens
- aligned the input/output lanes to the top instead of letting empty states feel visually sunken
- gave empty port states a stable minimum height so the `Outputs` column stays readable

### Why It Matters

The interface editor is a contract-authoring surface. If the geometry collapses too early, users start fighting layout instead of defining ports. This change keeps the two interface columns more stable and makes the center of the screen behave more like the primary workspace.

### Next Step

Keep walking the boiler project through subsystem interfaces and keep tightening any screen where side panels still steal too much weight from the main authoring area.

## 2026-03-25 - Signals Became The Main System Wiring Surface

### Scope

Shift system-level authoring from raw point-to-point links toward named system signals with one producer and one or more consumers.

### Done

- extended system signals with explicit `targets[]`
- made `System / Signals` the main routing workspace:
  - choose a producer object and output port
  - create a named system signal
  - attach one or more compatible consumer inputs
- added producer inventory so routes can be started directly from object outputs
- added signal routing details with removable consumer targets
- kept signal details editable without forcing the user back into raw JSON
- changed `System / Links` into a read-only `Link Mirror`
- made derived links regenerate automatically from system signals so the route map stays explicit and synchronized

### Why It Matters

This matches the mental model of control-system engineering better than raw link pairs. The engineer now sees the actual named channels in the system, who produces them, and where they fan out. It also gives us a much stronger foundation for visualization, explain/debug, and later compiler work.

### Next Step

Use the new signal routing surface to wire the first boiler routes:
- `steam_pressure_control.demand.fire`
- `feedwater_system.status.level_ok`
- `feedwater_system.status.feedwater_ready`
- `feedwater_system.trip.low_low_water`
- `fuel_system.status.fuel_ready`
- `fuel_system.trip.fuel_fault`

## 2026-03-25 - Local Browser Cache Busting For UI Assets

### Scope

Make sure the local `index.html` opened directly in a browser picks up the latest `app.js` and `app.css` instead of showing an older cached UI after major editor changes.

### Done

- added version query strings to local `app.css` and `app.js` references in `data/index.html`
- clarified the distinction between browser recovery data and cached static files

### Why It Matters

The current workflow depends on opening the editor directly from disk during UI architecture work. If the browser keeps serving stale assets, it becomes hard to trust whether the design actually changed. Cache-busting keeps local review aligned with the real source files.

### Next Step

Continue using the signal-routing workflow and keep removing any ambiguity between what is cached browser state and what is actual project source.

## 2026-03-25 - Object Cards Got Local Quick Actions

### Scope

Bring top-level system objects closer to the same direct editing pattern already used for ports.

### Done

- added gear and trash actions directly on each object card in `System / Objects`
- made the gear open a local inline object quick editor right below the same card
- kept the quick object editor focused on nearby essentials:
  - `Object Name`
  - generated `Object ID`
  - read-only `Type`
  - read-only `Category`
- added direct delete from the object card without forcing a trip through the far inspector

### Why It Matters

Objects are the first layer of system decomposition. If even simple rename/delete actions require hunting through another panel, the whole editor starts to feel heavier than the model it is trying to express. Local object actions keep the hierarchy legible and the interaction cost low.

### Next Step

Continue the boiler project through `System / Signals`, where object outputs become named system routes and are connected to one or more consumer inputs.

## 2026-03-25 - Signals Navigation Made Explicit

### Scope

Reduce ambiguity about where the new system routing flow lives in the UI.

### Done

- renamed the left navigation item from `Signals` to `Signals & Routing`
- renamed the left navigation item from `Links` to `Link Mirror`
- updated the helper text so the intended flow is visible even before opening the screen

### Why It Matters

The routing architecture moved from raw links to named system signals, so the UI needs to make that shift obvious. If the old labels stay in place, the user keeps looking in the wrong surface and the new model feels invisible.

### Next Step

Walk the first real boiler route through `System / Signals & Routing` and confirm the producer -> signal -> consumer interaction feels natural.

## 2026-03-25 - Fixed Signals Routing Render Crash

### Scope

Remove the runtime error that prevented the editor from rendering after the new signal-routing surface was introduced.

### Done

- fixed a missing local helper inside `renderSignalsWorkspace()`
- kept the crash panel improvements so future render failures show a more useful local message
- preserved the new `Signals & Routing` architecture instead of backing it out

### Why It Matters

This was a real UI architecture bug, not a data issue. The signal-routing flow is the right direction for the platform, so the correct fix was to repair the rendering path instead of reverting the interaction model.

### Next Step

Re-open the editor and verify that `System / Signals & Routing` renders correctly, then create the first route from `steam_pressure_control.demand.fire` to `boiler_supervisor.demand.fire`.

## 2026-03-25 - Source Output Flow Clarified In Signal Composer

### Scope

Remove ambiguity in the `Create System Signal` flow when the user chooses a source object but sees an empty output selector.

### Done

- made the composer auto-select the first available output when a source object is chosen
- changed the composer hint so it explicitly says when the chosen object has no outputs yet

### Why It Matters

The routing screen should guide the user through the next valid action instead of presenting a blank selector with no explanation. This keeps the authoring flow obvious and reduces the feeling that the editor is broken when the real issue is an incomplete object interface.

### Next Step

Create the first real route in `Signals & Routing` and confirm that the source object -> output -> signal flow now feels self-explanatory.

## 2026-03-25 - Route-First Signal Authoring

### Scope

Shift the system wiring UX from `pick source output first` to `create a named route between objects`, while still preserving explicit ports in the underlying model.

### Done

- changed the main signal authoring surface from `Create System Signal` to `Create Route`
- reduced the primary inputs to:
  - `Source Object`
  - `Signal Name`
  - `Target Object`
- added route resolution logic that:
  - reuses an existing source output if it matches the signal name
  - reuses an existing target input if it matches the signal name
  - proposes creating missing ports when needed
  - asks for explicit port selection only when multiple matching ports exist
- kept the signal model explicit underneath:
  - ports still belong to objects
  - signals still belong to the system
  - derived links still mirror the route map

### Why It Matters

This matches the way engineers actually think about control routes: not as detached ports first, but as named system exchanges that connect subsystems. The UI now starts from that mental model while still preserving a rigorous explicit contract underneath.

### Next Step

Use the new route-first flow to create the first boiler system routes and watch whether the editor now feels natural without hiding important structure.

## 2026-03-25 - Removed Redundant System Builder Panel

### Scope

Remove the extra `System Builder` panel that duplicated the same navigation already present in the left sidebar.

### Done

- stopped rendering the `System Builder` panel in the main workspace
- kept system surface switching only in the left navigation where it already belongs

### Why It Matters

The duplicated mode switch created two competing navigation layers for the same system surfaces. Removing it makes the screen quieter, gives more room back to the actual editors, and keeps the center of the UI focused on work instead of repeated navigation.

### Next Step

Continue through `Signals & Routing` and verify that the cleaner workspace makes the route-first flow easier to read.

## 2026-03-25 - Unified Signal Binding Blocks Around Route-First Wiring

### Scope

Refine `Signals & Routing` so the signal name leads the flow, source/target bindings use the same UI pattern, and existing ports are auto-resolved before the user is forced into manual mapping.

### Done

- moved the route composer around a clearer structure:
  - `Signal Name`
  - `Source Object / Source Binding`
  - `Target Object / Target Binding`
- kept each binding block explicit with:
  - object selector
  - binding mode selector (`Use Existing` / `Create New`)
  - port selector
  - port name field
- added preferred existing-port auto-selection when the user changes:
  - signal name
  - source object
  - target object
  - binding mode back to `Use Existing`
- brought the selected-signal `Add Consumer` flow onto the same binding model instead of using the old special-case target picker
- added dedicated styling for binding blocks so source/target routing reads as grouped engineering bindings instead of loose form fields

### Why It Matters

This keeps the UI aligned with the architectural model we agreed on: signals are system routes, but ports still remain explicit object contracts. The editor now starts from the route the engineer wants to create, while still making source and target bindings visible and editable when needed.

### Next Step

Walk the first real boiler routes through `Signals & Routing` and confirm whether signal-first system assembly now feels more natural than raw link authoring.

## 2026-03-25 - Reframed Route Composer Around Signal Name, Source, And Multiple Targets

### Scope

Refactor `Signals & Routing` away from a generic form layout and toward a more engineering-oriented route authoring flow.

### Done

- removed the large summary block from the top of `Signals & Routing`
- moved `Create Route` to a tighter structure:
  - `Signal Name`
  - `Signal Type / Data Type`
  - `Source Object / Source Binding`
  - `Target Objects / Target Bindings`
- changed source and target binding UX from a separate binding-mode dropdown to:
  - existing-port select
  - adjacent `+` toggle for `Create New`
  - inline field for the new port name only when create mode is active
- added support for multiple target bindings during route creation
- auto-sync route type from an existing source output when one is selected
- replaced the old right-side `Signal Details` panel with a `Selected Route` monitor that shows:
  - producer object/port
  - signal name and type
  - attached target bindings
- improved the right inspector for selected signals so route metadata now reads correctly there instead of being buried in a separate center panel

### Why It Matters

This is closer to how control engineers think: first define the named system signal, then make it clear what object produces it and which objects consume it. The UI now treats the signal as the route backbone rather than as just another registry record with scattered detail fields.

### Next Step

Exercise the first real boiler routes in this new composer and check whether the target-adding flow feels natural enough or whether the route monitor should become a more explicit line-based canvas.

## 2026-03-25 - Fixed Signals Workspace Render Crash

### Scope

Repair the `UI render error` introduced while reshaping the signal route composer.

### Done

- restored the local `buildPortPicker(...)` helper inside `renderSignalsWorkspace()`
- kept the new route-first layout intact:
  - signal name first
  - signal type/data type
  - source binding
  - multiple target bindings

### Why It Matters

The screen was crashing because one of the new route-binding helpers was referenced before being defined in the right rendering scope. This fix keeps the new UX direction while bringing the page back to a renderable state.

### Next Step

Reload the local HTML and validate the new route composer live before making further layout refinements.

## 2026-03-25 - Emergency UI Recovery Build Hardened

### Scope

Stabilize the emergency recovery build after the previous `app.js` corruption so old browser recovery drafts can no longer crash the restored editor.

### Done

- verified that `data/app.js` was restored and non-empty again
- hardened root model normalization in the recovery build:
  - re-create missing `project/meta/settings/hardware/system/views`
  - re-create missing `objects/signals/alarms/links` arrays
  - restore missing project and system names/ids
- made the render crash panel also surface the actual error in inspector notes
- bumped the asset version in `data/index.html` so browsers reload the fresh `app.js/app.css`

### Why It Matters

After the large editor file corruption, old recovery data could still break the rebuilt UI because the recovery app expected a cleaner JSON shape than the browser still had. The editor is now much more defensive and should reopen even with messy legacy drafts.

### Next Step

Reload the local HTML and confirm the recovery build opens again. Once stable, rebuild the richer `Signals & Routing` UX on top of this smaller dependable base.

## 2026-03-25 - Restored Object Quick Actions And Route-First Signals

### Scope

Bring back the most important editor behaviors from the log history on top of the smaller stable recovery build.

### Done

- restored local quick actions on object cards in `System / Objects`:
  - gear quick edit
  - trash delete
  - inline compact object editor under the same card
- kept object identity simple:
  - editable `Object Name`
  - auto-derived read-only `Object ID`
  - `type/category` shown as context instead of heavy form fields
- restored a working route-first `Signals & Routing` composer:
  - `Signal Name`
  - `Type`
  - `Data Type`
  - `Source Binding`
  - multiple `Target Bindings`
- restored `Use Existing` versus `Create New` port behavior through the inline binding model:
  - existing port dropdown
  - `+` toggle for creating a new port
  - inline new-port name field
- restored actual route creation logic:
  - create missing source/target ports when requested
  - create or extend a named system signal
  - regenerate the derived link mirror from signals
- improved inspector behavior for selected signals so route details are visible again on the right

### Why It Matters

This brings back the two interaction layers that mattered most before the crash:
system objects can be managed quickly in-place, and system assembly can again happen through named signals rather than raw link rows. That restores the architecture we agreed on without reintroducing the old unstable oversized file.

### Next Step

Reload the local HTML and verify two things live:
1. object cards now show local gear/trash quick actions
2. `System / Signals & Routing` shows the restored route composer and can create the first boiler route cleanly

## 2026-03-25 - Restored Compact Project Start Surface

### Scope

Bring the `Project` tab back to the compact start-screen model captured in the log history instead of leaving it as a temporary minimal recovery form.

### Done

- restored the `Project` page as a top split:
  - `Project Start` on the left
  - `Current Project` on the right
- kept the start actions compact and tool-like:
  - `New Project`
  - `Open JSON`
  - `Continue`
- changed `New Project` from an immediate hard reset into a small inline creation flow with:
  - `Project Name`
  - optional `Description`
- restored the intended automatic identity generation:
  - `Project ID`
  - `System Name`
  - `System ID`
- kept the project summary compact instead of bringing back a large metadata form
- preserved the earlier product direction that saving belongs in the topbar rather than inside the project page

### Why It Matters

This gets the project entry flow back to the UI we had converged on before the crash: a compact control surface for starting and resuming work, not an admin-style page full of technical fields.

### Next Step

Reload the local HTML and confirm the `Project` tab again feels like a clear starting point before continuing deeper into system assembly.

## 2026-03-25 - Restored Richer Objects And Interface Surface

### Scope

Bring `System / Objects` back closer to the interaction model we had already refined before the crash instead of leaving it as a plain list-plus-form recovery layout.

### Done

- restored object-level editing around a focused object header:
  - `Object Name` field in the main object workspace
  - local gear and trash actions attached to the same header area
  - hidden technical details (`Object ID`, `Type`, `Category`) only behind the gear toggle
- kept object list quick actions and inline object quick edit in the left browser
- restored `Interface` as a more intentional surface instead of two generic form columns:
  - left palette with separate `Add Input Port` and `Add Output Port` actions
  - central `Inputs` and `Outputs` lanes
  - port cards with gear/trash actions
  - quick port settings only when the gear is opened
  - local `Close` action inside quick settings
- restored the earlier temporary-tool behavior for port quick settings:
  - they are no longer always open
  - they stay attached to the port they belong to
  - switching view clears the open quick editor

### Why It Matters

This restores the direct engineering feel we had already reached: objects are edited in place, ports are managed from a dedicated interface surface, and quick adjustments stay physically close to the thing being changed instead of turning the editor back into a heavy inspector-driven form.

### Next Step

Reload the local HTML and verify that `System / Objects` again feels close to the pre-crash editor, then continue testing the first boiler interfaces and routes on top of this restored surface.

## 2026-03-25 - Tightened Objects Quick-Edit Logic

### Scope

Align the restored `Objects` surface more closely with the interaction rules we had already agreed on during the live UI review.

### Done

- changed object creation to ask for:
  - required `Object Name`
  - optional `Description`
- removed the duplicate object quick editor from the left object list
- kept exactly one active quick editor path for object-level details in the focused object workspace
- moved object card actions onto the same card head pattern used by interface port cards
- made object card secondary text prefer `Description` and fall back to technical `ID`
- adjusted port quick settings layout to a clearer three-step structure:
  - row 1: `Port Name`
  - row 2: `Signal Type` + `Data Type`
  - row 3: optional `Description`
- ensured opening a port quick editor closes object quick settings, and vice versa
- stopped action-button click bubbling on object cards so gear/trash no longer fight the card selection click

### Why It Matters

This removes the feeling that the screen is opening multiple competing editors at once. The workspace now behaves more like a proper engineering editor: one focused quick editor, nearby actions, and a cleaner hierarchy between object identity and interface authoring.

### Next Step

Reload the local HTML and validate the `Objects` flow live again before we continue refining the next surface.

## 2026-03-25 - Fixed Object Creation Regression

### Scope

Repair the `Add Object` flow after the optional object description field was introduced.

### Done

- added missing `objectCreateDescription` state initialization
- kept object creation aligned with the agreed UX:
  - required `Object Name`
  - optional `Description`
- confirmed the create flow now resets both local fields after object creation

### Why It Matters

The object-creation flow is the first step of real system assembly. A regression there blocks the whole workflow, so this fix restores the main path immediately.

### Next Step

Continue the canonical workflow in `System / Objects`:
create top-level subsystem objects first, then define their interfaces, then move into `Signals & Routing`.

## 2026-03-25 - Fixed Duplicate Quick Settings On New Ports

### Scope

Repair the interface-editor bug where adding multiple fresh ports could leave more than one quick settings block effectively active at once.

### Done

- added unique default naming for newly created input/output ports
- stopped new ports from reusing the same generated `id`
- kept the one-editor-at-a-time model intact by making each new port selection uniquely addressable

### Why It Matters

This bug made the interface editor feel unreliable even though the intended interaction model was already correct. Unique port identities are required both for clean UI behavior and for a sane configuration model.

### Next Step

Continue improving `Signals & Routing` layout and move the right inspector toward a true selection-driven editor.

## 2026-03-25 - Inspector Became Selection-Driven

### Scope

Turn the right inspector from a passive summary into an editor that follows the currently selected entity.

### Done

- added explicit selection state for:
  - object
  - port
  - signal
- made object selection drive a real object editor in the right inspector
- made port selection drive a real port editor in the right inspector
- made signal selection drive a real signal editor in the right inspector
- kept selection normalized so stale ids from deletes or renames do not break the inspector
- added active visual highlighting for:
  - selected port cards
  - selected signal cards

### Why It Matters

This matches the editor behavior we discussed: the right side should respond to what the engineer is actually working on, not just mirror static context. It also reduces the need to hunt for fields in multiple disconnected places.

### Next Step

Reshape `Signals & Routing` into the tighter two-row engineering layout:
- top signal metadata
- left source binding
- right target bindings
- editable route monitor on the right

## 2026-03-25 - Signals Layout Tightened And Center Noise Reduced

### Scope

Bring the center workspace closer to the engineering layout we agreed on and remove redundant chrome from the focused object surface.

### Done

- removed the extra `Focused Object Editor` title panel from the center object workspace
- kept the actual object workspace content without the redundant center heading
- reshaped `Signals & Routing` into a clearer two-level structure:
  - top metadata row:
    - `Signal Name`
    - `Description`
    - `Type`
    - `Data Type`
  - lower binding row:
    - `Source Binding`
    - `Target Bindings`
- kept `Signal Monitor` on the right while using the now-selection-driven inspector as the editable route editor
- added basic `data_type` validation when creating a route:
  - source output must match the route data type
  - target inputs must match the route data type

### Why It Matters

This makes the screen read more like an engineering tool and less like a stack of generic forms. The center now focuses on authoring, while the right side becomes the contextual editor for the selected signal.

### Next Step

Reload the local HTML and validate the new route composer and inspector together before the next round of UI tightening.

## 2026-03-25 - Signal Metadata Fields Aligned Horizontally

### Scope

Make the top signal metadata area read as one compact horizontal authoring row instead of two stacked vertical mini-forms.

### Done

- changed the `Signal Name` and `Description` block to use the same horizontal field grid pattern already used by `Type` and `Data Type`
- kept the signal metadata split into two balanced halves while making each half read left-to-right

### Why It Matters

The route composer should feel like a control surface, not a form stack. Horizontal grouping makes the signal metadata quicker to scan and closer to the engineering intent of one route definition row.

### Next Step

Keep tightening the signal-routing surface until the whole create-route flow reads as one coherent authoring strip.

## 2026-03-25 - Binding Create Mode Unclamped

### Scope

Fix the cramped `Source/Target Binding` layout when the user switches a binding into `Create New` mode.

### Done

- moved `New Port Name` out of the narrow select row and onto its own full-width line inside the binding block
- kept the existing-port picker and the `+` mode toggle on the compact top row

### Why It Matters

Creating a new binding port should expand cleanly, not collapse the layout or clip the field text. This makes the route-binding mode easier to read and much closer to the engineering interaction we want.

### Next Step

Continue tightening the route composer and turn the right-side signal monitor into a richer editable route surface.

## 2026-03-25 - Source And Target Bindings Visually Unified

### Scope

Reduce layout sprawl in `Signals & Routing` and make the source side use the same grouping pattern as the target side.

### Done

- wrapped `Source Binding` in the same outer group structure used by `Target Bindings`
- changed the source block to read as a grouped producer binding instead of a lone mismatched card
- adjusted `Signals & Routing` column proportions so the left authoring surface gets more room and the right monitor stops competing too aggressively
- tightened binding-grid alignment so both source and target sections anchor to the top the same way

### Why It Matters

Source and target routing should feel like parallel halves of the same interaction model. When one side reads as a different widget family, the route composer feels unstable and harder to scan.

### Next Step

Reload the local HTML and validate whether the signal-routing surface now reads as a coherent left authoring pane plus right route monitor before we keep tightening the editor.

## 2026-03-25 - Binding Blocks Stopped Vertical Stretching

### Scope

Fix the distorted binding layout where labels and controls inside `Source Binding` could separate vertically and make the whole block look broken.

### Done

- forced binding groups and binding blocks to align to the top instead of stretching with neighboring content
- forced fields inside binding blocks to align their internal content to the top
- reduced the visual mismatch by renaming the inner source card from `Producer` to `Source`

### Why It Matters

The issue was not just width; the grid items were stretching vertically and pulling labels away from their controls. This pass makes the binding blocks behave like compact engineering forms again.

### Next Step

Reload the local HTML and check whether `Source Binding` now sits cleanly next to `Target Bindings` before we keep refining the route monitor.

## 2026-03-25 - Source And Target Now Share One Binding Pattern

### Scope

Remove the remaining structural mismatch between the source side and the target side in `Signals & Routing`.

### Done

- introduced one shared binding-group pattern for both sides
- rebuilt `Source Binding` through the same grouped structure already used by `Target Bindings`
- kept both sides as:
  - group header
  - inner binding cards
- left `Add Target` only on the target side while keeping the rest of the visual hierarchy parallel

### Why It Matters

The previous version still looked different because the source side and target side were not actually built from the same structural pattern. Now they are, which is the right foundation before any further spacing or monitor refinements.

### Next Step

Reload the local HTML and validate the new source/target symmetry. If the screen still feels too wide or noisy after that, simplify the whole route composer into an even tighter compact binding strip.

## 2026-03-25 - Removed Redundant Inner Binding Titles

### Scope

Make the source and target sides visibly symmetrical instead of keeping extra inner card titles that made the screen look unchanged.

### Done

- removed the inner `SOURCE` title from the source card
- hid the inner target card title when there is only one target
- kept inner target titles only when multiple targets actually exist

### Why It Matters

The previous pass improved structure but did not change the visual read enough. Removing the redundant inner titles finally makes both sides look like matching binding cards under matching section headers.

### Next Step

Reload the local HTML and verify the visual change. If the composer still feels too loose after that, collapse the binding cards into an even tighter compact routing strip.

## 2026-03-25 - Target Add Action Demoted Visually

### Scope

Reduce the visual weight of the `Add Target` helper inside `Target Bindings`.

### Done

- changed `Add Target` from a full button treatment to a quieter inline text action
- kept the behavior the same while making it read as a secondary helper instead of a competing primary control

### Why It Matters

The section header should name the routing area, not fight with a button-like control. This makes the target section calmer and helps the actual route fields stay visually primary.

### Next Step

Reload the local HTML and continue tightening the signal-routing composer based on what still visually dominates too much.

## 2026-03-25 - Target Add Action Switched To Inline Plus

### Scope

Bring the `Add Target` helper closer to the icon-style visual language already used elsewhere in the editor.

### Done

- replaced the plain inline text helper with a quiet bold blue `+ Add Target` action
- kept it secondary by avoiding button chrome and boxed control styling

### Why It Matters

This reads more like a native editor affordance and less like a link or extra form button. It stays discoverable without competing with the main route authoring fields.

### Next Step

Reload the local HTML and keep tightening the signal-routing composer based on what still visually dominates too much.

## 2026-03-25 - Text Field Typing Stopped Re-Rendering Per Character

### Scope

Fix the editing bug where typing into object, port or signal name fields could behave like one-character-at-a-time input because the whole UI re-rendered on every keystroke.

### Done

- removed immediate full `render()` calls from the main text name editors in:
  - current project rename
  - selected object inspector editor
  - selected port inspector editor
  - selected signal inspector editor
- kept the underlying model updates and dirty-state tracking active while allowing the input caret to remain stable

### Why It Matters

Text entry must feel native and reliable. Re-rendering the whole workspace on every character breaks focus, selection and trust in the editor.

### Next Step

Reload the local HTML and confirm object, port and signal names now type normally before we continue with further UI tightening.

## 2026-03-25 - Signal Inspector Learned Route Bindings

### Scope

Turn the right-side signal inspector into a true signal editor instead of leaving it as metadata-only.

### Done

- kept editable signal identity fields in the inspector:
  - `Signal Name`
  - `Description`
  - `Type`
  - `Data Type`
- added editable `Source Binding` in the inspector:
  - source object
  - source output
- added editable `Target Bindings` in the inspector:
  - add target
  - remove target
  - retarget object
  - retarget input

### Why It Matters

The signal editor was incomplete without its bindings. A system signal is not just metadata; it is a route backbone. This makes the right inspector actually useful for real signal maintenance.

### Next Step

Reload the local HTML and validate the signal inspector live. After that, decide whether the center `Signal Monitor` should stay as a list or evolve into a richer editable route surface.

## 2026-03-25 - Signal Inspector Targets Stopped Cloning The First Port

### Scope

Fix the signal-inspector behavior where adding another target binding could immediately resolve to the same input as the first target, and allow creating missing ports directly from the binding editor.

### Done

- changed target auto-resolution in the signal inspector to prefer an unused input on the same object instead of blindly reusing the first matching port
- added inline `+` creation to inspector bindings so users can create:
  - a new source output
  - a new target input
  directly from the selected signal editor

### Why It Matters

Signals should support real fan-out editing. If every new target just clones the first binding, the route editor becomes misleading. Creating missing ports directly from the binding editor also matches the intended workflow for growing interfaces from real system routes.

### Next Step

Reload the local HTML and validate that:
- adding a second target no longer silently duplicates the first target input
- new inputs/outputs can be created directly from signal bindings

## 2026-03-25 - Stabilize Signal Object Selectors

### Goal

Fix the UI bug where changing `Source Object` or `Target Object` in signal routing looked broken or immediately snapped back.

### Done

- added a small queued render helper in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
- moved signal-binding rerenders off the immediate `select` event path for:
  - route composer source object/output
  - route composer target object/input
  - signal inspector source object/output
  - signal inspector target object/input

### Why It Matters

The local file-based UI was rebuilding the whole screen too early while the browser was still committing the current `<select>` change. Deferring that rerender should make `Source Object` and `Target Object` behave like normal editable fields instead of feeling locked.

### Next Step

Reload the local HTML and verify that both:
- `Source Object`
- `Target Object`
can now be changed reliably in the route composer and in the signal inspector.

## 2026-03-25 - Make Object Selection Follow Real Selection State

### Goal

Fix the `System / Objects` bug where only the first object card appeared to stay selected.

### Done

- changed object-card active state in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js) to follow the current object selection instead of relying only on `objectIndex`
- changed object-card click handling to set both:
  - `objectIndex`
  - `selection.kind = "object"`
- changed the right-side object workspace to open the actually selected object first, then fall back to `objectIndex`

### Why It Matters

`Objects` is now aligned with the same selection-driven model we already use for ports and signals. The active card and the focused editor should always point at the same object.

### Next Step

Reload the local HTML and confirm that clicking any object card:
- highlights that specific card
- opens that same object on the right

## 2026-03-25 - Keep Signal Bindings Stable When Ports Are Renamed

### Goal

Fix the bug where renaming a port inside `System / Objects` broke an already connected route.

### Done

- added `renamePortBindings(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
- when an output port is renamed, matching signal sources are updated
- when an input port is renamed, matching signal targets are updated
- synchronized signal-composer selected port ids too, so in-progress routing does not point at stale port ids after a rename

### Why It Matters

Renaming a port is a contract-editing action, not a destructive disconnect. Existing routes should follow the renamed port unless the user explicitly rebinds them.

### Next Step

Reload the local HTML and verify that renaming:
- a source output keeps the signal source binding intact
- a target input keeps the target binding intact

## 2026-03-25 - Remove Inspector Context Noise

### Goal

Make the right inspector more focused by removing the always-visible `Context` block.

### Done

- removed the `Context` population from [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)

### Why It Matters

The inspector should spend its width on editing the selected entity, not repeating global workspace metadata the user already knows from navigation and breadcrumbs.

### Next Step

Keep reviewing the inspector for more low-value sections and move toward a cleaner selection-first editing surface.

## 2026-03-25 - Tighten Port Quick Settings Layout

### Goal

Make port quick settings readable inside the narrow interface columns.

### Done

- tightened local spacing for `.port-inline-editor` in [app.css](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.css)
- reduced quick-settings label size and prevented label wrapping
- reduced input/select padding inside quick settings
- added `min-width: 0` safeguards so fields can shrink cleanly instead of clipping awkwardly

### Why It Matters

The port quick editor is meant to be a fast inline tool. If labels wrap and controls clip, the form becomes harder to read than the main inspector.

### Next Step

Reload the local HTML and confirm that `Port Name`, `Signal Type`, `Data Type`, and `Description` read cleanly inside the quick settings panel.

## 2026-03-25 - Let Interface View Use Available Width

### Goal

Stop `Interface View` from wasting horizontal space and make port quick settings adapt to the available width.

### Done

- removed the unused third column from `.component-editor-interface .component-layout` in [app.css](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.css)
- made quick-settings field grids responsive with `repeat(auto-fit, minmax(140px, 1fr))`

### Why It Matters

The issue was not only field styling. The interface editor itself was reserving empty space, which squeezed the port columns and made quick settings look broken. Now the center pane should expand properly, and quick settings should stay on one line when width allows and stack only when space gets tight.

### Next Step

Reload the local HTML and verify that:
- `Interface View` expands into the freed space
- `Signal Type` and `Data Type` sit on one row when there is room
- the same form stacks naturally only on narrower widths

## 2026-03-25 - Add Routing Map To Signals Workspace

### Goal

Let users track object-to-object bindings in the same place where routes are created.

### Done

- moved `Signal Monitor` under the route composer on the left in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
- added a right-side `Routing Map` panel in the same workspace
- the map now shows:
  - source object and output
  - selected system signal
  - target objects and target inputs
  - involved objects with their exposed input/output ports
- highlighted bound ports in the routing map with supporting styles in [app.css](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.css)

### Why It Matters

`Signals & Routing` is now closer to one coherent engineering surface:
- left side for authoring and selection
- right side for visual confirmation of routes and participating object ports

### Next Step

Reload the local HTML and verify that selecting a signal in `Signal Monitor` updates the right-side routing map to show the correct objects, ports, and bindings.

## 2026-03-25 - Make Routing Map Graphical

### Goal

Turn the right-side routing map into a more graphical route view instead of a mostly textual summary.

### Done

- replaced the old route-summary stack in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js) with a lane-based route graph
- the routing map now renders:
  - source object card
  - system signal card
  - one or more target object cards
  - connector bars between them
- added dedicated route-graph styles in [app.css](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.css)

### Why It Matters

This makes `Signals & Routing` read more like an engineering route surface and less like another nested form. The selected signal now has a visual source-to-consumer path that is easier to scan.

### Next Step

Reload the local HTML and confirm that the right-side `Routing Map` now shows the selected route as graphical cards and connectors rather than only textual blocks.

## 2026-03-25 - Turn Routing Map Into Port-Based Route Board

### Goal

Bring the right-side route visualization closer to an actual engineering connection view: objects with left/right ports, visible wires, and selection from the route itself.

### Done

- replaced the previous graphical summary in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js) with a real `routing-board`
- source object now renders as a node card with:
  - inputs on the left
  - outputs on the right
- target objects render as node cards with:
  - inputs on the left
  - outputs on the right
- selected signal renders as a central signal card
- existing bindings now render as SVG wires
- clicking a wire selects the owning signal and opens it in the inspector
- pressing the selected source output enters a lightweight connect mode that highlights compatible target inputs
- clicking a highlighted input creates a new target binding for the selected signal
- added dedicated board, node, port-dot, and wire styles in [app.css](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.css)

### Why It Matters

This moves `Signals & Routing` toward the interaction model we want long-term:
- objects are visible as connection surfaces
- ports are first-class
- bindings are visible as lines
- editing can start from the route itself, not only from forms

### Next Step

Reload the local HTML and verify that:
- the right-side map now shows object cards with left/right ports
- existing bindings draw as wires
- pressing the selected source output highlights compatible inputs
- clicking a wire selects the signal in the inspector

## 2026-03-25 - Add Drag Preview And Orthogonal Route Wires

### Goal

Make route editing feel closer to an engineering connection editor by adding live drag feedback and replacing curved wires with orthogonal paths.

### Done

- added `routeConnect` preview coordinates and a lightweight `routePreviewUpdater` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
- replaced curved SVG connection paths with `orthogonalPath(...)` so wires use straight segments and 90-degree turns with a minimal bend count
- added live preview wire while dragging from the selected source output
- added global mouse tracking for the preview wire
- added global mouseup cancellation when drag ends outside a compatible target
- changed target binding interaction to `mouseup` so a dragged connection can be completed on a compatible input
- styled preview wires and compatibility hover states in [app.css](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.css)

### Why It Matters

This is much closer to the interaction model we want:
- wires now read like routed control links instead of decorative curves
- drag intent is visible before committing a new binding
- connection editing is starting to move from form-only interaction into the route map itself

### Next Step

Reload the local HTML and verify that:
- existing wires use 90-degree routing
- dragging from the selected source output shows a live preview wire
- releasing on a compatible input creates a new target binding
- releasing elsewhere cancels the drag cleanly

## 2026-03-25 - Remove Signal Name From Routing Preview Card

### Goal

Reduce visual noise in the routing preview and keep signal identity details in the inspector instead of duplicating them in the center of the map.

### Done

- removed the signal name text from the central routing signal card in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
- kept only route-level summary information there:
  - signal type
  - data type
  - target count

### Why It Matters

The routing map should read as a schematic surface. Signal naming and detailed properties are better handled by `Signal Monitor` and the right inspector, especially because clicking a wire already selects the signal for editing.

### Next Step

Reload the local HTML and confirm that the signal card in `Routing Map` is quieter, while clicking a wire still brings the selected signal details into the inspector.

## 2026-03-25 - Render All System Routes On The Routing Map

### Goal

Stop showing only one isolated route preview and make the routing map reflect the full system topology.

### Done

- changed the right-side `Routing Map` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js) to render all current signal bindings, not just the selected signal
- the board now shows:
  - all objects with outputs in the left column
  - all objects with inputs in the right column
  - all existing signal wires between them
- clicking any wire still selects its owning signal and opens it in the inspector
- the currently selected signal is now highlighted on top of the full routing map
- kept drag-connect behavior for the selected signal source output
- updated [app.css](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.css) so:
  - the board uses a two-column whole-system layout
  - selected wires stand out
  - already-routed ports get a lighter bound-state hint

### Why It Matters

This is much closer to how engineers read a control system: one map, many routes, one selected route highlighted for editing. It avoids flipping the whole visualization every time a different signal is selected.

### Next Step

Reload the local HTML and verify that:
- all current signal bindings are visible at once
- clicking a wire highlights that route and selects its signal
- drag-connecting still works for the selected signal without hiding the rest of the map

## 2026-03-25 - Move Signals UI To Graph-First Canvas Mode

### Goal

Make `Signals & Routing` primarily a graphical routing surface instead of a form-first split layout.

### Done

- refactored [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js) so `renderSignals()` now uses:
  - a small top toolbar
  - a large routing canvas
  - overlay panels for `Add Route` and `Signal Monitor`
- added reusable helpers:
  - `populateComposerFromConnection(...)`
  - `commitSignalComposer()`
  - `buildSignalComposerOverlay(...)`
  - `buildSignalMonitorOverlay(...)`
  - `buildRoutingBoard(...)`
- changed graph interaction so dragging from any output to a compatible input opens a prefilled route draft instead of forcing all edits through static side forms
- switched the routing map to single object cards with both:
  - inputs on the left
  - outputs on the right
- expanded the map surface into a large scrollable canvas area to better support many objects and routes
- added canvas/overlay styling in [app.css](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.css)

### Why It Matters

This aligns much better with the intended mental model:
- objects are the main visual units
- signals are created from connections between object ports
- forms support the graph, instead of replacing it

### Next Step

Reload the local HTML and verify that:
- `Add Route` and `Signal Monitor` now appear as overlays
- most of the screen is used by the routing canvas
- dragging from an output to an input opens a prefilled route draft
- all existing routes remain visible on the canvas

## 2026-03-25 - Move Routing Ports To The Outside Of Object Cards

### Goal

Make the routing canvas read more like an electrical/control diagram: wires should touch object boundaries from the outside, and object cards should stay compact.

### Done

- updated [app.css](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.css) so routing object cards:
  - use tighter padding and spacing
  - stay compact instead of stretching wide
  - keep overflow visible for external port markers
- moved input/output port dots visually outside the card edges using negative margins
- reduced object title and secondary text sizes so port names get more visual priority

### Why It Matters

This makes connections read as routes entering and leaving the object boundary, instead of feeling embedded inside the object body. It also keeps the object card itself focused on readable port names rather than panel mass.

### Next Step

Reload the local HTML and confirm that:
- wires now visually connect from outside the object cards
- object cards feel smaller and denser
- input/output names stay readable without the card becoming oversized

## 2026-03-25 - Start Routing Scene And Router Foundation

### Goal

Move the routing canvas from a simple visual board to the first real layout scene with stored object positions, auto layout, draggable objects, and orthogonal routing based on object bounds.

### Done

- extended object normalization in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js) so each object now carries persistent routing-scene data:
  - `ui.routing.x`
  - `ui.routing.y`
  - `ui.routing.w`
  - `ui.routing.h`
  - `ui.routing.manual`
- added routing-scene helpers:
  - `updateRoutingObjectSize(...)`
  - `buildSignalAdjacency()`
  - `computeRoutingLayers()`
  - `autoLayoutRoutingScene()`
  - `portAnchor(...)`
  - `routeEdgePath(...)`
- changed the routing board from a fake two-column stack to an absolute-positioned scene
- added first auto-layout pass:
  - source-heavier / root objects start further left
  - downstream objects move right by layer
  - rows are spaced vertically inside each layer
- added object dragging on the routing canvas with rerendered routes
- updated route drawing to use scene anchors and orthogonal routing paths with fixed left/right stubs
- started track spacing by assigning separate offsets to routes instead of drawing every edge through the same center path
- updated [app.css](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.css) for:
  - absolute object cards
  - larger infinite-feeling routing scene
  - draggable object headers

### Why It Matters

This is the first real step toward the routing behavior we discussed:
- cards now live in scene coordinates
- wires are routed from object boundaries instead of from DOM columns
- dragging an object immediately becomes meaningful because the router recalculates around the new placement

### Next Step

Reload the local HTML and verify that:
- objects now live on a real scene instead of left/right columns
- routes still draw orthogonally after auto layout
- dragging an object reroutes its connections
- object positions remain stable because they are now stored in the project model

## 2026-03-25 - Stabilize Inspector Start Path

### Goal

Remove the already-deprecated inspector context block and make the startup path tolerant to that DOM change so the local HTML opens cleanly.

### Done

- removed the `Context` section from [index.html](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/index.html)
- bumped the asset version query strings in [index.html](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/index.html) so the browser picks up the current `app.js` and `app.css`
- added a small `clearNode(...)` helper in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
- made `renderInspector()` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js) tolerant to `inspector-context` being absent

### Why It Matters

This removes one more source of mismatch between the HTML shell and the recovery build script. It also matches the direction we already agreed on: the inspector should focus on the selected entity, not repeat global context.

### Next Step

Reopen the local [index.html](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/index.html) and confirm that:
- the page opens without the old inspector context block
- the browser loads the fresh assets after the version bump
- we can continue refining the routing scene from a clean baseline

## 2026-03-25 - Stop Routing Scene Freeze On Cycles

### Goal

Prevent the routing canvas from freezing the browser when the system graph contains cycles such as `1 -> 2` and `2 -> 1`.

### Done

- identified the root cause in `computeRoutingLayers()` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js):
  the previous longest-path style layer update kept increasing layers forever on cyclic routes
- added `buildRoutingComponents(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js) using strongly connected components
- updated `computeRoutingLayers()` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js) so layout now runs on the condensed component graph instead of endlessly re-enqueuing objects inside a cycle

### Why It Matters

Cycles are normal in control systems. The canvas cannot assume a pure left-to-right DAG. By collapsing cyclic groups before assigning layers, the scene stays stable and the browser should stop locking up when routes feed back into earlier objects.

### Next Step

Reopen the routing canvas and retry the same sequence:
- `1 -> 2`
- `1 -> 2,3`
- `2 -> 1,3`

If the page stays alive, the next router pass should focus on obstacle-aware orthogonal paths and cleaner parallel track spacing.

## 2026-03-25 - Start Corridor-Based Router V2

### Goal

Move the routing scene away from naive center-lane orthogonal wires and toward object-avoiding corridor routing that keeps lines outside cards.

### Done

- added `buildRoutingSceneContext(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  to compute inflated layer bounds and top-scene routing space
- updated `routeEdgePath(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  to support two routing modes:
  - adjacent forward layers route through the inter-layer corridor
  - same-layer, backward, and longer-span routes route through an external top corridor above the scene
- updated `buildRoutingBoard(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so wire generation now passes scene/layer context into the router instead of using a simple center median
- changed route track keys to be connection-specific, which is a better base for later parallel-lane spacing
- bumped local asset versions in [index.html](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/index.html) so the browser reloads the new router code

### Why It Matters

This is the first meaningful step toward the routing behavior we discussed:
- lines should leave outputs outside the object boundary
- lines should approach inputs from outside the target boundary
- reverse and cyclic routes should go around the scene instead of slicing across the object field

It is still not a final obstacle router, but it replaces the obviously wrong “single median lane” behavior with corridor-aware routing.

### Next Step

Reload the local HTML and verify that:
- reverse routes no longer cut through the object area
- adjacent forward routes use the gap between layers
- longer routes travel above the scene instead of through cards

## 2026-03-25 - Add Trunk And Branch Routing

### Goal

Start separating shared signal trunks from per-target branches, and keep routing outside object bodies instead of treating every target as a fully independent line.

### Done

- added `pathFromPoints(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js) to build route segments from explicit orthogonal points
- added `buildSignalRouteSegments(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so one signal now produces:
  - a shared source trunk
  - a vertical/horizontal shared corridor segment
  - per-target branch segments
- switched `buildRoutingBoard(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  from target-by-target path drawing to signal-level trunk/branch segment drawing
- extended `buildRoutingSceneContext(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js) to keep object bounds for later obstacle-aware passes
- bumped asset versions in [index.html](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/index.html) so the browser reloads the new routing behavior

### Why It Matters

This gets the map closer to engineering readability:
- one output feeding multiple targets now behaves like one route with a shared trunk
- branches split only near targets instead of every connection pretending to be unrelated
- the next router pass can build on real object bounds and corridor tracks instead of replacing the whole drawing model again

### Next Step

Reload the local HTML and verify that:
- fan-out routes now show a shared trunk before branching
- reverse routes still stay outside the object field
- multiple nearby signals use more orderly parallel corridors instead of collapsing into unrelated center lines

## 2026-03-26 - Add Layer Branches To Corridor Routing

### Goal

Move the router one step closer to real obstacle-aware wiring by sharing routes per target layer instead of treating every target as a totally separate descent from the top corridor.

### Done

- extended `buildRoutingSceneContext(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js) to keep a stable sorted `layerOrder`
- updated `buildSignalRouteSegments(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js) so non-adjacent and reverse routes now:
  - share one top trunk
  - split into one corridor branch per target layer
  - only then branch into individual target inputs
- this keeps fan-out geometry more tree-like and reduces repeated parallel descents for every single target
- bumped asset versions in [index.html](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/index.html) so the browser reloads the new router code

### Why It Matters

This is a better match for engineering readability:
- routes that go to multiple objects in the same layer now behave like one routed branch, not a stack of unrelated drops
- the scene is starting to distinguish between a trunk, a layer corridor, and the final short branch into a port
- this is the right structural base for the next pass where corridor lanes will also avoid nearby object bounds more aggressively

### Next Step

Reload the local HTML and verify that:
- top-corridor routes now split once per target layer instead of once per target
- multi-target fan-out looks more like a shared route tree
- reverse routes still stay outside object bodies

## 2026-03-26 - Split Signal Routing Into Forward And Return Families

### Goal

Stop mixed fan-out signals from sharing one awkward route family when some targets are downstream and others are feedback/return targets.

### Done

- added `buildGroupedLayerBranches(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  to reuse the same grouping logic for corridor branches by target layer
- added `buildForwardGroupSegments(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  for routes heading to later layers
- added `buildReturnGroupSegments(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  for feedback / same-layer / backward routes using a dedicated bottom return corridor
- updated `buildSignalRouteSegments(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so one signal now splits targets into:
  - forward family
  - return family
  and routes each family through a different corridor strategy
- bumped asset versions in [index.html](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/index.html) so the browser reloads the new router logic

### Why It Matters

This is much closer to what an engineer expects to read:
- downstream consumers should use a forward route family
- feedback consumers should use a return route family
- one mixed signal should not drag every target into the same awkward top corridor just because one of them is backward

### Next Step

Reload the local HTML and verify that:
- mixed signals with both downstream and return targets now split into clearer route families
- feedback routes prefer the bottom return corridor
- downstream routes keep using forward layer corridors

## 2026-03-26 - Prefer Shorter Local Corridors Around Route Families

### Goal

Make routing look less arbitrary by choosing a shorter local corridor around the actual family of involved objects instead of always forcing a global top or bottom detour.

### Done

- added `buildRouteFamilyBounds(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  to compute a local envelope around the source object plus the target family
- added `chooseFamilyLaneY(...)` in [app.js](c:/Users\Administrator\Documents\PlatformIO\Projects\universal_plc\data\app.js)
  to compare top and bottom local corridors and pick the shorter one based on approximate Manhattan cost
- updated `buildForwardGroupSegments(...)` and `buildReturnGroupSegments(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so both route families now:
  - use local family bounds instead of the whole scene
  - choose the shorter upper or lower corridor
  - keep separate source and layer track reservations per chosen corridor family
- bumped asset versions in [index.html](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/index.html) so the browser reloads the new routing behavior

### Why It Matters

This pushes the map closer to an engineer-readable shortest-path route:
- fewer giant detours around the whole canvas
- cleaner routing around dense local groups
- less visual noise when only a small part of the system is involved in a signal family

### Next Step

Reload the local HTML and verify that:
- routes now choose a shorter local top/bottom corridor around the involved objects
- dense groups are outlined more tightly instead of dragging huge scene-wide loops
- fan-out still keeps a shared trunk before branching

## 2026-03-26 - Use Free Horizontal Windows Between Objects

### Goal

Improve the route shape from a UI readability standpoint by using the nearest free horizontal window between object groups instead of forcing every family through a crude global top/bottom detour.

### Done

- replaced `chooseFamilyLaneY(...)` with `chooseFamilyLane(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so the router now considers:
  - a top external lane
  - a bottom external lane
  - any sufficiently large horizontal gaps between occupied object bounds
- updated `buildForwardGroupSegments(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so non-adjacent forward routes now prefer the shortest free local lane, not just a generic upper/lower corridor
- simplified `buildReturnGroupSegments(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so return families now use:
  - one chosen free lane
  - one shared left return corridor
  - one vertical branch spine with short branch-ins to targets
- bumped asset versions in [index.html](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/index.html) so the browser reloads the corrected route-family logic

### Why It Matters

This is a better UI-engineering compromise:
- routes can now use real free windows between object stacks
- dense groups should produce shorter and more legible paths
- return routes should stop making oversized scenic loops when a tighter left-side return corridor is available

### Next Step

Reload the local HTML and verify that:
- routes use visible gaps between object groups when possible
- return routes hug a tighter left-side corridor
- fewer wires make giant top/bottom loops around the whole local cluster

## 2026-03-26 - Reserve Lanes Against Neighboring Object Bounds

### Goal

Make the router behave more like a UI diagram engine by choosing lanes against the actual nearby object field, not just against the bounds of the current signal family.

### Done

- added `laneOffset(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so reserved lanes now spread more predictably:
  - top lanes stack upward
  - bottom lanes stack downward
  - gap lanes alternate around the center
- updated `chooseFamilyLane(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so it now builds candidate lanes from:
  - top and bottom around the local occupied envelope
  - free horizontal gaps between *all neighboring object bounds* in the active X range
  instead of only looking at the objects directly involved in the signal family
- switched lane reservation keys to global lane identities such as:
  - `lane:top:*`
  - `lane:bottom:*`
  - `lane:gap:*`
  so multiple nearby routes are more likely to reserve and offset within the same real corridor
- bumped asset versions in [index.html](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/index.html) so the browser reloads the new lane reservation logic

### Why It Matters

This is a more UI-architectural routing choice:
- a route should react to the real nearby object field, not just to its own endpoints
- free windows between dense groups should become preferred lanes
- parallel routes in the same corridor should fan out more predictably instead of visually collapsing into each other

### Next Step

Reload the local HTML and verify that:
- routes now prefer free windows between neighboring object groups
- repeated paths in the same corridor offset more cleanly
- dense layouts produce fewer obviously wrong “through the middle” lane choices

## 2026-03-26 - Prefer Internal Free Windows Over Scenic Outer Loops

### Goal

Bias the router toward the most readable local path by preferring free internal gaps between object groups before falling back to external top/bottom scenic detours.

### Done

- updated `chooseFamilyLane(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so:
  - top and bottom outer lanes now carry a much higher penalty
  - gap lanes remain the preferred option when they exist
  - an outer lane is only chosen when it is materially better, instead of being nearly tied with an internal window
- bumped asset versions in [index.html](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/index.html) so the browser reloads the new lane-choice behavior

### Why It Matters

This is a UI-readability decision, not just a geometry tweak:
- engineers usually expect a route to use a visible local window between objects if one exists
- huge top/bottom loops should be fallback behavior, not the default answer
- the map should look like it is trying to stay close to the working cluster instead of orbiting the whole scene

### Next Step

Reload the local HTML and verify that:
- mixed routes now prefer the free middle window between object groups
- oversized top scenic loops happen less often
- return families stay tighter to the local cluster

## 2026-03-26 - Make Internal Gap Lanes The Strong Default

### Goal

Push the router closer to what a UI engineer would expect to read: if there is a usable internal window between object groups, the route should strongly prefer it over a scenic top or bottom loop.

### Done

- updated `chooseFamilyLane(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js) so:
  - outer top/bottom lanes now carry a much stronger penalty
  - gap lanes receive an extra bonus when they sit inside the active Y-range of the source/targets
  - outer lanes only win when they are materially better, instead of barely better
- bumped asset versions in [index.html](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/index.html) so the browser reloads the stronger gap preference logic

### Why It Matters

This is a readability-first routing decision:
- a route should try to pass through the visible middle window if that keeps the path shorter and clearer
- large outer loops should be the fallback, not the default answer
- this reduces the “why did it go all the way around the scene?” effect in mixed layouts

### Next Step

Reload the local HTML and verify that:
- routes now pick the middle free window more aggressively
- top scenic loops are further reduced
- mixed route families stay closer to the local cluster

## 2026-03-26 - Add Routing Spec v1

### Goal

Stop evolving the routing canvas only by local heuristics and screenshots. Fix one explicit routing contract for the editor first.

### Done

- added [routing-spec-v1.md](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/docs/standards/routing-spec-v1.md)
- documented the routing rules we want the UI to obey:
  - orthogonal only
  - strong port side constraints
  - objects as obstacles
  - corridor-based routing
  - shared trunk for fan-out
  - layered reading direction
  - shortest readable path
  - predictable parallel offsets
  - incremental reroute
  - gloss pass
- documented the required router passes:
  - scene layout
  - clearance map
  - corridor discovery
  - family routing
  - track reservation
  - gloss

### Why It Matters

We now have one stable definition of correct routing for the project. Future code changes can be judged against an explicit UI-routing standard instead of ad-hoc visual guesses.

### Next Step

Use [routing-spec-v1.md](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/docs/standards/routing-spec-v1.md) as the reference while continuing router improvements from live screenshots.

## 2026-03-26 - Prefer Bottom Corridor For Return Routes

### Goal

Make feedback-style routes read more like engineering diagrams by defaulting them under the main left-to-right flow instead of letting them float upward as often as downward.

### Done

- updated `chooseFamilyLane(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js) to accept a preferred outer corridor direction
- wired `buildForwardGroupSegments(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js) to prefer upper outer fallback
- wired `buildReturnGroupSegments(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js) to prefer lower outer fallback
- bumped asset versions in [index.html](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/index.html) so the browser reloads the updated route-family preference

### Why It Matters

This is a readability convention, not just a path tweak:
- forward flow usually reads cleanest across or above the main chain
- feedback and return routes usually read cleanest below the chain
- mixed route families stop feeling arbitrary when the fallback direction is stable

### Next Step

Reload the local HTML and verify that:
- return routes now prefer the lower corridor when no better internal gap exists
- forward routes do not get pulled downward unnecessarily
- mixed route families read more like block-diagram feedback

## 2026-03-26 - Fix Missing Source-Side Corridor In Return Routing

### Goal

Correct the deeper routing flaw behind the latest screenshots: return families were choosing a reasonable lane Y, but they were not reserving a proper source-side X corridor before dropping into the return loop.

### Done

- updated `buildReturnGroupSegments(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so return routes now:
  - leave the output through the normal right-side stub
  - continue to a dedicated right-side source corridor outside the route family bounds
  - only then descend into the chosen return lane
  - then travel across to the left return corridor and branch to targets
- bumped asset versions in [index.html](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/index.html) so the browser reloads the corrected return-family geometry

### Why It Matters

This was the real flaw in the previous logic:
- the router chose a lane but still dropped vertically too early
- that made feedback routes cut through the local working field near the source
- the result felt arbitrary even when the chosen lane itself was reasonable

With a proper source-side corridor, return families should behave more like real block-diagram feedback loops.

### Next Step

Reload the local HTML and verify that:
- feedback loops now leave the source to the right before descending
- the central object field is less polluted by immediate vertical drops
- mixed forward/return routes look more deliberate

## 2026-03-26 - Replace Family Heuristics With Corridor Graph Router Core

### Goal

Stop patching the old forward/return heuristic router and replace the core path generation with a cleaner corridor-graph based pathfinder.

### Done

- extended [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js) with a new routing-core toolkit:
  - `pointInsideObstacle(...)`
  - `horizontalClear(...)`
  - `verticalClear(...)`
  - `buildCorridorCandidates(...)`
  - `buildCorridorGraph(...)`
  - `shortestCorridorPath(...)`
  - `segmentKey(...)`
  - `addPathSegments(...)`
- updated `buildRoutingSceneContext(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js) to expose `sceneLeft` and `sceneRight`
- replaced `buildSignalRouteSegments(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so signal routing now works like this:
  - build source and target stubs outside object bounds
  - find a path through a corridor graph using obstacle-aware horizontal/vertical edges
  - add all unique path segments to the signal route
  - shared trunk emerges automatically by deduplicating common segments across targets
- kept the scene, dragging, selection, and signal model intact while replacing only the router core
- bumped asset versions in [index.html](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/index.html) so the browser reloads the new router implementation

### Why It Matters

This is the right architectural reset:
- the router is no longer split into fragile forward/return families with competing lane heuristics
- shortest readable path is now grounded in a corridor graph instead of stacked penalties
- shared trunks are now a consequence of shared geometry, not a hand-authored special case

### Next Step

Reload the local HTML and verify that:
- previously broken left-side and feedback paths now appear again
- routes choose obstacle-safe corridors instead of scenic heuristic loops
- shared signal trunks still emerge when multiple targets reuse the same path sections

## 2026-03-26 - Remove Diagonal Fallbacks From Corridor Router

### Goal

Fix the first clear bug in the new corridor router: when the graph failed to connect source and target, the fallback degraded to a direct line, which produced diagonal segments and broke the routing spec immediately.

### Done

- added `fallbackOrthogonalPath(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  to provide a guaranteed Manhattan fallback using:
  - horizontal corridor candidates
  - vertical corridor candidates
  - only a simple orthogonal last-resort path if no cleaner candidate exists
- updated `shortestCorridorPath(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so missing graph nodes or disconnected graph states no longer return a diagonal direct segment
- bumped asset versions in [index.html](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/index.html) so the browser reloads the corrected fallback behavior

### Why It Matters

This restores the most basic routing promise in the spec:
- no diagonal edges
- orthogonal only, even in degraded cases

It also makes the next screenshots much easier to interpret, because we can debug corridor quality without first fighting obviously illegal line geometry.

### Next Step

Reload the local HTML and verify that:
- diagonal segments are gone
- fallback paths stay orthogonal
- the remaining routing problems are about corridor quality, not broken geometry

## 2026-03-26 - Add Local Corridor Candidates Between Active Endpoints

### Goal

Improve corridor selection for individual routes so the pathfinder sees useful local windows between the current source and target instead of falling back too quickly to large outer detours.

### Done

- updated `buildCorridorCandidates(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  to add more local candidate lines:
  - midpoint `x` and `y` between source and target stubs
  - local horizontal windows between nearby obstacle bands in the active vertical range
  - local vertical windows between nearby obstacle columns in the active horizontal range
- kept the older global scene candidates, but the graph now has a denser local corridor vocabulary for short readable paths
- bumped asset versions in [index.html](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/index.html) so the browser reloads the denser candidate graph

### Why It Matters

This should reduce one of the main remaining UI failures:
- a route should not dive into a huge outer loop if there is a valid local middle passage between the current endpoints

The new graph is still orthogonal and obstacle-aware, but it now sees more human-like intermediate options.

### Next Step

Reload the local HTML and verify that:
- the route to the lower-left target uses a tighter local passage when one exists
- fewer one-to-one routes choose a full-scene outer detour
- shared trunks still remain possible when multiple routes reuse the same local corridor

## 2026-03-26 - Preserve Side-Bus Routing For Vertical Stacks

### Goal

Keep the good nuance from the earlier screenshots: when objects form a clear vertical stack, the router should still be able to prefer a clean side-bus corridor instead of forcing every route through internal local windows.

### Done

- added `buildPathPreference(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  to detect a local vertical-stack style overlap region around the active source/target path
- updated `buildCorridorGraph(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so vertical edges running near the preferred side-bus corridor receive a lower cost
- updated [routing-spec-v1.md](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/docs/standards/routing-spec-v1.md)
  with a `Column Stack Exception` rule describing when a side-bus is more readable than an internal gap
- bumped asset versions in [index.html](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/index.html) so the browser reloads the updated path preference logic

### Why It Matters

This keeps us from over-correcting the router.

We want:
- local internal windows when they improve readability

But we also want:
- a clean side bus when the object arrangement clearly reads as a vertical column

That nuance is part of a real diagram routing standard, not an inconsistency.

### Next Step

Reload the local HTML and verify that:
- column-like layouts still prefer a readable side bus
- non-column layouts still prefer short local corridors
- the router is now closer to balancing both patterns instead of overfitting to one

## 2026-03-26 - Make Port Stubs Safe Against Other Obstacles

### Goal

Fix the deeper cause behind routes appearing to pass through unrelated objects: a port stub could be outside its own object, but still sit inside another object's obstacle bounds.

### Done

- added `obstacleListExcluding(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
- added `buildSafeStub(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so a port now extends outward until:
  - the horizontal exit segment is clear
  - the stub endpoint is outside every other obstacle bound
- updated `buildSignalRouteSegments(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so both:
  - source output stubs
  - target input stubs
  are now safe stubs before corridor graph routing begins
- bumped asset versions in [index.html](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/index.html) so the browser reloads the safe-stub logic

### Why It Matters

This is a routing-spec level correction:
- a route must not be considered valid just because it exits its own object correctly
- the very first and last visible segments must also respect all other obstacle bounds on the scene

Without this, even a good corridor graph can still look wrong because it starts from an already invalid launch point.

### Next Step

Reload the local HTML and verify that:
- lines no longer appear to pass through unrelated objects near source or target ports
- the remaining issues are true corridor-choice problems, not bad stub geometry

## 2026-03-26 - Auto-Fit Routing Board To Real Route Bounds

### Goal

Fix the scene issue where the router could generate a valid path but the canvas would not grow to include it, making lines appear to run off-screen.

### Done

- added `computeRoutingContentBounds(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  to calculate the real content envelope from:
  - object card bounds
  - route segment points
- updated `addPathSegments(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so route segments now keep both:
  - `points`
  - `d`
- updated `buildRoutingBoard(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so it now:
  - builds route paths before draw
  - computes route-aware content bounds
  - expands the routing board to fit those bounds
  - then renders SVG paths from the stored route objects
- bumped asset versions in [index.html](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/index.html) so the browser reloads the scene sizing fix

### Why It Matters

The router can only be judged fairly if the scene actually shows the full route.

Without this fix:
- a correct path could look broken because it left the visible board
- screenshots would mix geometry bugs with scene-sizing bugs

### Next Step

Reload the local HTML and verify that:
- routes stay inside the visible expanded board
- long side or return corridors are no longer clipped
- the next screenshots reflect actual routing quality instead of board cropping

## 2026-03-26 - Align Visual Card Height With Routing Obstacles

### Goal

Fix the mismatch between the visible object card and the obstacle geometry used by the router. Routes cannot be trusted while the UI card and the obstacle bounds describe different heights.

### Done

- updated `updateRoutingObjectSize(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  to use a more realistic routing height for object cards
- updated `buildRoutingBoard(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so each routing card now gets an explicit `height` from `ui.routing.h`
- this brings:
  - layout spacing
  - obstacle bounds
  - visible card size
  closer to one consistent geometry model
- bumped asset versions in [index.html](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/index.html) so the browser reloads the geometry fix

### Why It Matters

This was a deep geometry bug:
- the router could be correct against model bounds
- but still look wrong on screen because the rendered card was taller than the routed obstacle

After this fix, when a line appears to go through a card, it is much more likely to be a real router issue instead of a model/render mismatch.

### Next Step

Reload the local HTML and verify that:
- visible card height now matches routed obstacle space much better
- routes no longer appear to pass through cards due only to height mismatch
- the next screenshots isolate true corridor-choice bugs

## 2026-03-26 - Normalize Routing Board Coordinates

### Goal

Fix the mismatch between route/object scene coordinates and the local coordinate system of the visible routing board. The board was already resizing to fit route bounds, but cards and wires were still rendered in raw scene space, which could push visible lines beyond the board viewport.

### Done

- updated `buildRoutingBoard(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  to compute a board-local scene offset from `contentBounds`
- translated routing cards into board-local coordinates before rendering
- translated route path points into board-local coordinates before drawing SVG wires
- translated preview-wire source anchors the same way
- updated route dragging to convert mouse movement back into scene-space by subtracting the active board offset
- bumped asset versions in [index.html](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/index.html) so the browser reloads the normalized board geometry

### Why It Matters

This was a foundational scene bug:
- the board size was based on normalized bounds
- but the content inside it was still drawn in unnormalized coordinates

That meant routes could still look clipped or drift off-screen even when the board itself had enough space.

### Next Step

Reload the local HTML and verify that:
- long routes stay inside the expanded visible board
- cards and wires move together inside one consistent coordinate system
- the next routing screenshots reflect corridor quality rather than board clipping

## 2026-03-26 - Align Routing To Real DOM Anchors

### Goal

Fix the next layer of routing mismatch after board normalization:
- wires were still anchored to formula-based port coordinates instead of real rendered port dots
- the canvas was still visually over-expanded by CSS minimum sizes

### Done

- added rendered routing metrics in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so wires can use:
  - real card bounds from the DOM
  - real source and target anchor points from rendered port dots
- updated `buildSignalRouteSegments(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so the router can use rendered anchors when available
- updated `buildRoutingBoard(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  to redraw final routes from rendered metrics instead of only from estimated scene geometry
- reduced forced routing canvas expansion in [app.css](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.css)
  by removing oversized fixed minimums from:
  - `.routing-map-panel`
  - `.routing-board`
- bumped asset versions in [index.html](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/index.html)
  so the browser reloads the updated routing geometry

### Why It Matters

This addresses the core visual symptoms that remained after board normalization:
- ports and wires can now align to what is actually rendered on screen
- the board should stay much more compact for small scenes
- routing errors can now be judged against real object geometry, not approximate anchor math

### Next Step

Reload the local HTML and verify that:
- route endpoints are visually centered on port dots again
- small scenes stay compact instead of stretching to the edges
- remaining route-over-object problems are true corridor bugs, not anchor or canvas-size drift

## 2026-03-26 - Switch Routing Geometry To Render-Measure-Route

### Goal

Stop mixing guessed card geometry with real rendered geometry. The router should not trust estimated object sizes once the DOM already knows the actual card size and port-dot positions.

### Done

- removed explicit `width` and `height` assignment from routing object cards in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so cards can render to their natural DOM size
- added `syncMeasuredRoutingObjectSizes(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  to measure rendered cards and persist real width/height into routing state
- updated `updateRoutingObjectSize(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so measured dimensions override estimates once available
- updated `buildRoutingBoard(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  to:
  - render cards first
  - measure them on the next frame
  - rerender once if geometry changed
  - then route using measured bounds and measured port anchors
- bumped asset versions in [index.html](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/index.html)
  so the browser reloads the new render-measure-route flow

### Why It Matters

This removes the worst geometry contradiction in the routing canvas:
- objects now render at their real visual size
- router obstacles can converge to the same size the user sees
- route endpoints can align to actual port dots instead of guessed row math

### Next Step

Reload the local HTML and verify that:
- route endpoints visually sit on the rendered port dots
- objects no longer force oversized routing bounds after they have been measured
- remaining route issues are now genuinely about corridor choice, not fake geometry

## 2026-03-26 - Stop Wires Showing Through Routing Cards

### Goal

Remove a misleading visual artifact in the routing canvas: wires rendered behind cards could still be seen through the semi-transparent card background, making valid behind-card paths look like obstacle violations.

### Done

- updated routing card styling in [app.css](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.css)
  so routing node/signal cards now use an opaque background
- raised routing cards above the wire layer with an explicit `z-index`
- bumped asset versions in [index.html](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/index.html)
  so the browser reloads the card masking fix

### Why It Matters

This does not replace real obstacle routing rules, but it removes a false negative during review:
- if a wire is merely behind a card, it should not visually read as crossing the object
- after this fix, visible wires through a card are much more likely to reflect a real routing problem

### Next Step

Reload the local HTML and verify that:
- behind-card routes are no longer visible through object bodies
- the next screenshots isolate true obstacle/corridor problems

## 2026-03-26 - Add Explicit Routing Channels And Lane Reservation v1

### Goal

Move the router one step closer to the schematic routing spec by adding:
- explicit channel candidates instead of only raw heuristic coordinates
- first-pass lane reservation so later routes do not randomly reuse the same corridor centerline

### Done

- implemented `Trunk Dominance v1` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
- added helpers in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js):
  - `coreSegmentsFromPath(...)`
  - `segmentLength(...)`
  - `dominantTrunkSegmentsFromPath(...)`
  - `projectPointToSegment(...)`
  - `trunkDominanceBonus(...)`
- updated `buildSignalRouteSegments(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so:
  - primary trunk scoring now includes a dominance bonus for paths that form a clearer backbone
  - branch attach candidates now prefer projections onto the dominant trunk before general tree geometry
- bumped asset versions in [index.html](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/index.html)
  so the browser reloads the new trunk-dominance behavior

### Why It Matters

This is the first explicit visual hierarchy rule for the router:
- signals should read as `backbone first, branches second`
- branches should prefer joining the main trunk, not arbitrary existing branches
- user-driven object layout remains primary; the router adapts around it

### Next Step

Reload the local HTML and verify:
- whether the main trunk now reads more clearly in manual layouts
- whether remaining issues are now mostly final gloss polish

### Done

- added `layout assist v1` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  by upgrading `autoLayoutRoutingScene(...)`
- auto layout now:
  - keeps layered left-to-right placement
  - orders objects inside each layer by neighbor barycenter instead of only by local weight
  - performs two forward/backward passes so connected objects settle closer vertically
- this should reduce unnecessarily long stems and make routed trees easier to read before the router even starts
- bumped asset versions in [index.html](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/index.html)
  so the browser reloads the new layout behavior

### Why It Matters

The router was still cleaning up a weak scene layout.
This pass improves the scene itself, so trunk/branch routing starts from a more readable object arrangement.

### Next Step

Reload the local HTML and verify:
- whether connected objects now align more naturally by layer
- whether the remaining defects are mostly pure routing polish rather than layout

### Done

- upgraded glossing to `Gloss Pass v2` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
- `glossSignalSegments(...)` now:
  - computes endpoint degree for each signal segment graph
  - snaps only interior vertical stems to nearby shared `x` positions
  - snaps only interior horizontal stems to nearby shared `y` positions
  - keeps leaf/port-adjacent endpoints untouched so port alignment stays correct
  - merges almost-contiguous collinear segments more aggressively
- bumped asset versions in [index.html](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/index.html)
  so the browser reloads the improved gloss pass

### Why It Matters

This is branch/stem polishing rather than topology change:
- shared trunks should read straighter
- nearby interior stems should align better
- port hits should remain stable because leaf endpoints are not snapped

### Next Step

Reload the local HTML and verify:
- whether internal stems now look more intentional
- whether the next remaining issue is mostly global layout assistance rather than routing polish

### Done

- upgraded signal routing to `Signal Tree Builder v2` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
- added `distanceToTreePoints(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
- updated `buildSignalRouteSegments(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so the primary trunk is now chosen from several candidate targets by a combined score:
  - direct trunk path cost
  - estimated attachment cost for the remaining targets
- this replaces the earlier behavior where the first trunk was effectively just the cheapest first target path
- bumped asset versions in [index.html](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/index.html)
  so the browser reloads the new tree-builder behavior

### Why It Matters

This should improve signal topology before any extra glossing:
- trunk choice is now more global
- fan-out should form from a more useful backbone
- long redundant parallel stems should reduce in mixed multi-target cases

### Next Step

Reload the local HTML and verify:
- whether the chosen trunk now feels more natural in multi-target signals
- whether the next remaining issue is mostly gloss/branch polishing

### Done

- implemented `channel occupancy v2` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
- added:
  - `signalFamilyId(...)`
  - `getChannelOccupancyPenalty(...)`
- updated `reservePathTracks(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so tracks now remember not only signals, but also route families
- updated `buildCorridorGraph(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so edge cost now includes:
  - exact occupied track penalty
  - nearby lane occupancy penalty
  - softer distinction between same-family and cross-family reuse
- bumped asset versions in [index.html](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/index.html)
  so the browser reloads the new occupancy behavior

### Why It Matters

This is the next step after basic bundling:
- one heavily used vertical spine should stop attracting every route family
- nearby families can still align, but overcrowded channels should become less attractive
- the router should start using adjacent lanes more intentionally

### Next Step

Reload the local HTML and verify:
- whether different signals stop collapsing into the same central channel
- whether the next visible defect is now mostly branch placement or global layout

### Done

- stabilized `bundle preference v1` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  after the first pass made corridor edge costs too aggressive
- reduced bundle adjustments in `getBundlePreferenceAdjustment(...)`
  so bundling stays a soft preference instead of dominating pathfinding
- clamped corridor edge costs in `buildCorridorGraph(...)`
  to keep all graph edges safely positive and avoid unstable shortest-path behavior
- bumped asset versions in [index.html](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/index.html)
  so the browser reloads the stabilized bundling behavior

### Why It Matters

The previous bundle heuristic could distort the graph too much.
This keeps bundling useful but prevents route solving from becoming unstable.

### Next Step

Reload the local HTML and verify that:
- the editor is stable again
- bundling is subtler and no longer breaks route solving

### Done

- added `bundle preference v1` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  through `getBundlePreferenceAdjustment(...)`
- updated `buildCorridorGraph(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so horizontal and vertical edges now consider:
  - exact occupied track penalty
  - nearby bundle affinity for adjacent lanes
- this keeps exact occupied tracks from being blindly reused while making neighboring lane slots more attractive for parallel signal families
- bumped asset versions in [index.html](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/index.html)
  so the browser reloads the new bundling behavior

### Why It Matters

This is the first cross-signal bundling step:
- nearby routes can start forming cleaner harness-like groups
- signals no longer need to choose between total overlap and random separation
- parallel routing should become more intentional

### Next Step

Reload the local HTML and verify:
- whether close parallel signals now prefer neighboring lanes
- whether the next remaining issue is mostly global channel occupancy or branch-placement polish

### Done

- added `Gloss Pass v1` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  via `glossSignalSegments(...)`
- the gloss pass now merges collinear overlapping segments of the same signal into longer routed pieces
- updated `buildRoutingBoard(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so both pre-measure and rendered route drawing run through the signal gloss pass before display
- bumped asset versions in [index.html](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/index.html)
  so the browser reloads the new glossed signal rendering

### Why It Matters

This is a safe first gloss pass:
- it does not change obstacle rules
- it does not change port binding semantics
- it removes fragmented same-line pieces so trunks and branches read more like deliberate routes

### Next Step

Reload the local HTML and verify:
- whether same-signal trunks now read as longer cleaner lines
- whether the next remaining defect is mostly bundle preference across nearby different signals

### Done

- added `Attach-To-Segment v1` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so new branches can connect to projected points on existing trunk segments, not only to existing tree vertices
- added helpers in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js):
  - `pathCorePoints(...)`
  - `appendCoreSegments(...)`
  - `attachCandidatesForTarget(...)`
- updated `buildSignalRouteSegments(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  to maintain explicit tree segments and build branch attach candidates from both:
  - existing tree vertices
  - projections onto existing trunk/branch segments
- bumped asset versions in [index.html](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/index.html)
  so the browser reloads the new attach-to-segment behavior

### Why It Matters

This should make branch points less arbitrary:
- branches can attach where the trunk actually passes nearby
- the signal tree should look less like a chain of forced vertex hops
- fan-out should start reading more like a routed net

### Next Step

Reload the local HTML and check:
- whether branch joins now happen closer to natural trunk intersections
- whether the remaining ugliness is mostly branch placement polish and glossing

### Done

- added `shared trunk + branch semantics v1` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so a signal is no longer routed purely target-by-target
- added helper functions in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js):
  - `uniquePointList(...)`
  - `orthogonalPathCost(...)`
  - `shortestCorridorPathToAny(...)`
- updated `buildCorridorCandidates(...)` and `buildCorridorGraph(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  to accept extra tree points when solving branches against an existing trunk
- updated `buildSignalRouteSegments(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so it now:
  - picks one primary target path as the initial trunk
  - grows a tree of reusable points from that trunk
  - routes remaining targets to the existing tree instead of always back to source
- bumped asset versions in [index.html](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/index.html)
  so the browser reloads the new signal-tree behavior

### Why It Matters

This is the first pass where a signal behaves more like a routed net than a set of unrelated wires:
- repeated fan-out should start sharing more geometry
- later targets can attach to an existing trunk
- the map should read more like one signal network and less like independent shortest paths

### Next Step

Reload the local HTML and verify:
- whether repeated fan-out now produces a clearer shared trunk
- whether remaining ugly cases are mostly about branch placement and glossing rather than total lack of tree behavior

### Done

- hardened the router obstacle rule in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  by adding:
  - `orthogonalSegmentIntersectsObstacle(...)`
  - `segmentHitsObstacles(...)`
  - `validateOrthogonalPath(...)`
- updated `horizontalClear(...)` and `verticalClear(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  to use strict per-segment obstacle checks instead of softer overlap heuristics
- tightened `fallbackOrthogonalPath(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so fallback routes are validated against inflated obstacle bounds before being accepted
- updated `buildSignalRouteSegments(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  to validate the final full path against all non-endpoint obstacles and retry with a stricter fallback path if needed
- bumped asset versions in [index.html](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/index.html)
  so the browser reloads the stricter obstacle behavior

### Why It Matters

This makes object avoidance behave more like a hard routing constraint instead of a soft preference:
- orthogonal segments now have to stay clear of inflated bounds
- fallback paths cannot silently cut through obstacles
- final assembled wire paths get one more obstacle validation pass before rendering

### Next Step

Reload the local HTML and verify these two things first:
- wires no longer pass through foreign object rectangles even in fallback cases
- any remaining ugly routes are now genuine corridor/lane issues, not obstacle-rule leaks

### Done

- upgraded `buildCorridorCandidates(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  to build channel metadata for:
  - local gap channels
  - inter-group channels
  - clearance-edge channels
  - outer fallback channels
- added lane variants around wide gaps so channels can expose multiple nearby slots instead of one centerline only
- added first-pass track reservation helpers in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js):
  - `getReservedTrackPenalty(...)`
  - `reservePathTracks(...)`
- updated `buildCorridorGraph(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so edge cost now takes into account:
  - channel priority
  - outer-corridor penalty
  - previously reserved horizontal and vertical tracks
- added `shortestCorridorPathForSignal(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so signal routes can reserve lanes while they are being solved
- updated `buildSignalRouteSegments(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  to route through the signal-aware corridor solver
- bumped asset versions in [index.html](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/index.html)
  so the browser reloads the new channel/lane behavior

### Why It Matters

This is the first real step away from a plain obstacle pathfinder toward a schematic router:
- routes now have a notion of preferred channels
- wide gaps can host parallel lanes
- existing tracks start influencing later route choices

This is still `v1`, not final lane management, but it should already reduce the most random corridor reuse.

### Next Step

Reload the local HTML and verify that:
- routes prefer clean gap channels over arbitrary free space
- nearby parallel routes separate more predictably
- the next screenshots expose true missing pieces such as trunk/branch semantics or glossing

## 2026-03-26 - Flow-dominant trunk and downstream branch preference

### Done

- replaced the old `dominantTrunkSegmentsFromPath(...)` longest-segment heuristic in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  with a flow-aware version that:
  - prefers horizontal downstream backbone segments
  - only falls back to side-bus dominance for real column-stack layouts
- added `computeColumnStackProfile(...)` and tightened `buildPathPreference(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so vertical side corridors are no longer preferred for every overlapping group
- upgraded `attachCandidatesForTarget(...)` and `shortestCorridorPathToAny(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  to carry attach-point priorities, which lets branch routing prefer downstream trunk projections over arbitrary nearby geometry
- fixed a hidden router bug in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js):
  primary and branch candidate evaluation no longer reserves tracks for paths that were never chosen
- updated `buildSignalRouteSegments(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so:
  - primary trunk scoring includes flow penalty for backward-looking trunks
  - side-bus remains an exception, not the default
  - track reservation only happens after the chosen path is committed
- bumped asset versions in [index.html](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/index.html)
  so the browser reloads the new routing behavior

### Why It Matters

This shifts the router one step away from "longest geometry wins" and closer to "flow semantics choose the backbone":
- the trunk should read like the main downstream route
- branches should join the trunk, not just the nearest convenient spine
- side-bus should appear only for real stacked columns

### Next Step

Reload the local HTML and verify that:
- the main trunk reads more like a downstream backbone
- branches stop snapping to the wrong vertical spine
- side-bus appears only when the objects really form a vertical stack

## 2026-03-26 - Remove dangerous gloss snapping and harden exact track separation

### Done

- removed the `glossSignalSegments(...)` stem snapping behavior in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  that used to move interior vertical and horizontal segments onto shared `x/y` values after routing
- kept only the safe part of glossing in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js):
  - merge contiguous collinear segments
  - do not rewrite already valid route geometry
- increased exact occupied-track penalty in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so a different signal is far less likely to reuse the same `vx:/hy:` line unless there is no reasonable alternative
- bumped asset versions in [index.html](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/index.html)
  so browsers reload the safer routing build

### Why It Matters

This removes the most likely source of two visible defects:
- valid routes being shifted into object clearance during gloss
- different signal families collapsing onto the same vertical spine after routing

### Next Step

Reload the local HTML and verify that:
- lines no longer pass through object bodies after gloss
- exact overlapping vertical stems are reduced
- any remaining bad route is now coming from the solver itself, not from post-processing

## 2026-03-26 - Hard exact-track blocking and wider route clearance

### Done

- introduced shared `ROUTE_CLEARANCE` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  and raised obstacle validation from the previous narrow margin to a stronger routing clearance
- updated all route validation and fallback checks in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so base solve and fallback solve now use the same stricter clearance rule
- added `isExactTrackBlocked(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  and wired it into `buildCorridorGraph(...)`
  so exact `vx:/hy:` reuse by a different signal now blocks that track instead of merely making it expensive
- kept lane/bundle behavior for nearby channels, but removed the ability for unrelated signals to sit on the exact same vertical or horizontal spine
- bumped asset versions in [index.html](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/index.html)
  so browsers reload the stricter routing build

### Why It Matters

This addresses two recurring classes of autorouter failure:
- lines that remain technically legal but still read as going behind object cards
- different signals collapsing onto the same exact vertical or horizontal track

### Next Step

Reload the local HTML and verify that:
- coincident vertical lines are forced into neighboring lanes instead of the same exact spine
- routes keep a visibly safer distance from object cards
- remaining issues, if any, come from corridor selection rather than post-processing or exact-track reuse

## 2026-03-26 - Obstacle shadow penalty for readable distance to objects

### Done

- added `ROUTE_SHADOW` and `orthogonalSegmentShadowPenalty(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so route costs now include a strong penalty for segments that run too close to object cards even when they do not strictly intersect the forbidden obstacle zone
- updated `buildCorridorGraph(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so both horizontal and vertical corridor edges include this shadow penalty on top of:
  - exact-track blocking
  - reserved track penalty
  - channel occupancy
  - bundle preference
- kept hard obstacle blocking and exact `vx:/hy:` blocking from the previous pass
- bumped asset versions in [index.html](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/index.html)
  so browsers reload the new distance-aware routing build

### Why It Matters

This aligns the router better with how mature orthogonal routers are described:
- obstacle avoidance alone is not enough
- routes also need minimum distance to nodes/obstacles
- otherwise they remain technically legal but visually read as running behind objects

### Next Step

Reload the local HTML and verify that:
- routes stop hugging object sides so tightly
- the remaining bad cases are true corridor-choice issues rather than simple “too close to the card” behavior

## 2026-03-26 - Band-based corridor blocking

### Done

- added `ROUTE_BAND_HALF`, `orthogonalBandIntersectsObstacle(...)`, and `bandHitsObstacles(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
- changed `horizontalClear(...)` and `verticalClear(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so corridor validation now checks the whole routing band area instead of only the centerline
- kept the existing hard obstacle checks and shadow penalties on top of this wider band model
- bumped asset versions in [index.html](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/index.html)
  so browsers reload the band-aware build

### Why It Matters

This moves the router closer to how mature autorouters reason about a route:
- not as an infinitely thin line
- but as a track with width plus clearance

That should reduce routes that still looked as if they were passing behind object cards even when the mathematical centerline stayed outside the obstacle.

### Next Step

Reload the local HTML and verify that:
- corridors that visually run behind objects are now rejected earlier
- remaining bad cases are true topology/corridor-choice issues rather than centerline-only leakage

## 2026-03-26 - Endpoint obstacles with port portals

### Done

- added `validateOrthogonalPathWithPortals(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so final route validation can keep endpoint objects in the obstacle set while still allowing the short port-entry and port-exit segments
- changed `buildSignalRouteSegments(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so source and target objects are no longer removed from route validation wholesale
- primary routes now validate with:
  - one allowed leading portal segment
  - one allowed trailing portal segment
- branch routes now validate with:
  - one allowed leading portal segment at the branch target
  - no blanket exemption for the rest of the target object area
- bumped asset versions in [index.html](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/index.html)
  so browsers reload the portal-aware validation build

### Why It Matters

This matches a common mature-router pattern more closely:
- endpoints still count as obstacles
- only the immediate port portal is exempt
- the rest of the node body is not treated as free routing space

### Next Step

Reload the local HTML and verify that:
- routes stop being legitimized by running through source/target object area
- remaining issues are true corridor-choice or tree-topology defects, not endpoint-obstacle leakage

## 2026-03-26 - Local stub channels and width-aware gap admission

### Done

- changed `buildCorridorCandidates(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so source/target stub rows and columns are now marked as local-scope channels instead of plain global channels
- extended channel metadata in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  to preserve:
  - scope
  - local anchor coordinates
- added `edgeAllowedByChannelScope(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  and wired it into `buildCorridorGraph(...)`
  so local stub channels are only usable near their port reach instead of across the whole board
- introduced width-aware gap admission using `MIN_CHANNEL_GAP` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so local-gap and inter-group channels are only created if the opening is wide enough for:
  - route band width
  - shadow distance
  - safety margin
- bumped asset versions in [index.html](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/index.html)
  so browsers reload the structurally updated corridor model

### Why It Matters

This addresses one of the most important architectural defects in the previous router:
- endpoint stub rows/columns were being promoted to global highways
- narrow visual gaps were still treated as valid routing channels

The new model is closer to mature autorouter behavior:
- port corridors stay local
- only sufficiently wide openings become reusable channels

### Next Step

Reload the local HTML and verify that:
- port-row/port-column channels no longer span the full scene
- routes stop using object-adjacent rows as global trunks
- remaining issues are due to tree topology, not global stub leakage

## 2026-03-26 - Strict local-scope containment for stub and tree channels

### Done

- tightened `edgeAllowedByChannelScope(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so local channels are now valid only when the whole segment stays inside the local reach window
  instead of merely overlapping it
- changed `buildCorridorCandidates(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so `tree` channels created from attach/reference points are also local-scope channels instead of global rows/columns
- kept previous local scoping for source/target stub channels
- bumped asset versions in [index.html](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/index.html)
  so browsers reload the stricter local-channel build

### Why It Matters

This fixes a specific structural bug:
- local port rows/columns were still able to act like scene-wide highways
- long segments only needed to touch the local reach window to become legal

Now a local channel must actually stay local.

### Next Step

Reload the local HTML and verify that:
- target/source rows no longer stretch into long global trunks
- remaining issues, if any, come from the global `xs × ys` graph itself rather than local-scope leakage

## 2026-03-26 - Scope-aware corridor node creation

### Done

- added `pointAllowedByChannelScope(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so local channels now restrict not only edge segments but also the node intersections that can exist on them
- updated `buildCorridorGraph(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so a node at `(x, y)` is created only if:
  - the `x` channel is valid at that `y`
  - the `y` channel is valid at that `x`
- bumped asset versions in [index.html](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/index.html)
  so browsers reload the stricter corridor-node build

### Why It Matters

This closes a subtle but important loophole in the old graph:
- even when a channel was local-scope, the full `xs × ys` lattice could still create too many legal junctions on it
- the solver could then stitch a long route from many short locally-legal hops

Now local channels are restricted at the node level as well.

### Next Step

Reload the local HTML and verify that:
- local rows/columns stop acting like stitched-together global highways
- remaining issues are due to the remaining global lattice, not hidden local junction leakage

## 2026-03-26 19:02

### Context

Routes still looked like they were traveling "behind" objects because edge and gap channels were being treated as scene-wide highways once they entered the corridor graph.

### What Changed

- updated `registerChannel(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  to preserve local channel ranges instead of collapsing everything into one implicit global scope
- updated `edgeAllowedByChannelScope(...)` and `pointAllowedByChannelScope(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so scoped channels can be validated by explicit ranges, not only by anchor reach
- updated `buildCorridorCandidates(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so:
  - object-edge channels are local to the object's own span
  - local-gap channels are local to the active routing window
  - inter-group channels are local to the adjacent group window
- bumped asset versions in [index.html](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/index.html)
  so browsers reload the narrower corridor-scoping model

### Why It Matters

This removes one of the core graph bugs:
- a corridor located near an object edge should not automatically become a full-scene highway
- a gap channel should only exist inside the real gap it came from

The solver now gets a corridor graph that is closer to real routing bands instead of a loose lattice with globally valid edge rows and columns.

### Next Step

Reload the local HTML and verify that:
- object-edge routes stop reappearing as scene-wide vertical or horizontal highways
- remaining bad paths are due to the remaining global lattice structure, not over-broad channel scope

## 2026-03-26 19:30

### Context

Live route review showed another deeper issue:
- unsafe stubs could still land too close to inflated keep-out
- invalid routes could survive validation and still be rendered
- gloss could re-merge safe local segments into one unsafe segment through object keep-out

### What Changed

- updated `buildSafeStub(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so the initial stub distance now starts beyond the inflated keep-out instead of using a fixed short 28px hop
- updated `buildSignalRouteSegments(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so:
  - primary paths must pass portal-aware validation or they are dropped
  - fallback paths are only accepted if they also validate
  - invalid branches are no longer rendered as advisory leftovers
- updated `glossSignalSegments(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so merged vertical/horizontal segments are only emitted if the merged segment still passes keep-out validation
- updated routing-board call sites in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  to pass `sceneContext` into gloss validation
- bumped asset versions in [index.html](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/index.html)

### Why It Matters

This closes the "validate but still draw" loophole:
- routes that fail keep-out should now disappear instead of silently rendering through forbidden objects
- gloss should no longer stretch a safe local port entry into a long unsafe segment across an object band

### Next Step

Reload the local HTML and verify that:
- routes no longer survive as rendered geometry after failing validation
- remaining overlap issues are true solver decisions, not stale invalid paths or unsafe gloss merges

## 2026-03-26 19:40

### Context

After the stricter validation pass, routes stopped cheating through forbidden geometry, but stacked object columns still pushed the solver into oversized outer loops because there was no valid local side corridor for the whole stack.

### What Changed

- updated `buildCorridorCandidates(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  to add a scoped `stack-bus` channel on both sides of dense vertical object columns
- the new `stack-bus` channel:
  - only appears for real column-like stacks
  - is local to the vertical span of that stack
  - gives the solver a nearby side corridor without reopening a global highway across the whole scene
- bumped asset versions in [index.html](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/index.html)

### Why It Matters

This matches a common schematic-routing pattern:
- for stacked components, the readable route is often a nearby side-bus along the stack
- without that channel, the solver tends to escape to a distant outer corridor

### Next Step

Reload the local HTML and verify that:
- stacked three-node cases prefer a close side-bus instead of a large scenic outer loop
- remaining bad paths are about branch/trunk choices, not missing local stack corridors

## 2026-03-26 19:48

### Context

Live screenshots showed that even after adding scoped stack-bus channels, some local rows and columns still behaved like scene-wide highways. The remaining suspicion was channel merging itself: a global candidate and a local candidate sharing the same rounded coordinate were collapsing into one global route line.

### What Changed

- updated `registerChannel(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so local scoped metadata now dominates over global metadata at the same rounded coordinate
- if a channel coordinate has any `localAnchors` or `localRanges`, it is no longer treated as globally valid

### Why It Matters

This removes another hidden lattice leak:
- a stub row or stack-bus column should not accidentally become a full-scene highway just because another global candidate landed on the same `x/y`

### Next Step

Reload the local HTML and verify that:
- local row/column channels stay local even when they share coordinates with global candidates
- remaining scenic loops are due to route selection, not hidden channel promotion

## 2026-03-26 20:03

### Context

After tightening scoped channels, the remaining bad cases were no longer fake highways but route-selection failures: the solver could still pick oversized outer loops because there was no second-pass reroute or local node-side bias.

### What Changed

- added `nodeSideCrossingPenalty(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  to discourage channels that run too close to source/target side rows and columns
- raised outer-corridor edge cost in `buildCorridorGraph(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
- added `solveCorridorPath(...)`, `simplifyOrthogonalPath(...)`, `pathOuterExposure(...)`, `pathBendCount(...)`, and `pathNeedsReroute(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
- updated `shortestCorridorPathForSignal(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so a route that overuses outer corridors gets a reroute attempt with outer channels excluded
- bumped asset versions in [index.html](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/index.html)

### Why It Matters

This is the first real reroute/minimization layer from the review:
- the solver gets a second chance when the first path is legal but visually poor
- local path readability starts to matter more than simply escaping to the outermost legal corridor

### Next Step

Reload the local HTML and verify that:
- large scenic loops reduce in favor of nearer local corridors
- remaining issues are concentrated in branch/trunk choices rather than plain outer-corridor overuse

## 2026-03-26 20:15

### Context

The remaining screenshots showed that local windows were still effectively being stitched together by coordinate. Different scoped corridor fragments sharing one rounded `x` or `y` were behaving like one long row or column.

### What Changed

- added `mergeNumericRanges(...)` and `buildChannelInstances(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
- updated `buildCorridorGraph(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so graph nodes are now built from channel instances with their own finite ranges, not from a plain `xs × ys` coordinate lattice
- horizontal adjacency is now grouped by concrete `y`-channel instance
- vertical adjacency is now grouped by concrete `x`-channel instance
- added `nodeIdsAtPoint(...)` and updated shortest-path lookups so start and destination nodes resolve against the new instance-based graph
- bumped asset versions in [index.html](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/index.html)

### Why It Matters

This is the first real cut away from the old full coordinate lattice:
- two different local windows at the same `y` no longer automatically become one horizontal highway
- two different local windows at the same `x` no longer automatically become one vertical spine

### Next Step

Reload the local HTML and verify that:
- disjoint local windows stop stitching themselves into one long route band
- remaining bad routes are now true route-choice issues, not hidden coordinate-merging in the graph

## 2026-03-26 20:22

### Context

After moving to channel instances, the remaining bad cases were no longer hidden graph leaks. The solver was still choosing outer corridors too early, even when a legitimate local route existed.

### What Changed

- updated `shortestCorridorPathForSignal(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so routing now prefers:
  1. local corridors with `excludeOuter: true`
  2. full graph with outer corridors only as a fallback
- when both a local and a global solution exist, the solver now compares them with a score that heavily values:
  - lower outer exposure
  - fewer bends
  - shorter overall path
- bumped asset versions in [index.html](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/index.html)

### Why It Matters

This aligns the router more closely with how readable schematic routing is expected to behave:
- first try to stay near the working area
- only escape to outer loops when local routing really cannot solve the case

### Next Step

Reload the local HTML and verify that:
- local routes win over scenic outer loops whenever they are valid
- remaining defects are branch/trunk choice issues, not premature outer-corridor selection

## 2026-03-26 20:31

### Context

After local-first routing, the remaining ugly cases were no longer caused by hidden highway channels. The tree itself was still being seeded from the wrong primary target, which made every later branch attach to a poor backbone.

### What Changed

- added `estimateTreeAttachmentCost(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  to estimate how well the rest of the signal targets can attach to a candidate primary trunk
- updated `buildSignalRouteSegments(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so primary target selection now penalizes:
  - outer exposure
  - excessive bends
  - poor downstream attachment for remaining targets
  - branch points that fall behind the source in non-column-stack layouts
- bumped asset versions in [index.html](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/index.html)

### Why It Matters

This moves the router closer to a true net/tree mindset:
- the first target no longer wins simply because its own path is cheap
- the chosen trunk should better reflect the whole signal tree that has to be built after it

### Next Step

Reload the local HTML and verify that:
- the chosen trunk better reflects the full fan-out shape of the signal
- remaining defects are now mostly local branch placement rather than a globally bad backbone

## 2026-03-26 20:40

### Context

The latest review still showed different signals riding almost the same horizontal and vertical lanes. Occupancy penalties helped, but they were still soft preferences rather than a hard spacing rule.

### What Changed

- added `isNearbyTrackBlocked(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
- updated `buildCorridorGraph(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so different signals cannot reuse a horizontal or vertical track within a minimum spacing band
- this turns part of channel ownership from a soft cost model into a real hard constraint
- bumped asset versions in [index.html](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/index.html)

### Why It Matters

This closes one of the remaining review gaps:
- routes should not stack onto nearly the same lane just because the cost function still finds it acceptable

### Next Step

Reload the local HTML and verify that:
- different signals keep visible spacing instead of collapsing onto nearly the same horizontal or vertical band
- remaining issues are due to higher-level tree choices, not missing lane separation

## 2026-03-26 20:49

### Context

After hard nearby-track blocking, routes no longer sat on the same exact or near-exact line, but different signals could still choose almost the same global topology, and branch attachments could still favor the wrong side of the tree.

### What Changed

- added `corridorRegionKey(...)` and `getCorridorRegionPenalty(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
- updated `reservePathTracks(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  to reserve not only exact `vx/hy` tracks but also broader corridor regions
- updated `buildCorridorGraph(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  to price occupied corridor regions more aggressively
- updated `attachCandidatesForTarget(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so branch attachment now prefers a more natural downstream side near the target instead of equally favoring all geometrically legal points
- bumped asset versions in [index.html](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/index.html)

### Why It Matters

This closes more of the remaining review gap:
- two different signals should not casually reuse the same broad corridor just because they are on slightly different exact tracks
- a branch should prefer attaching from the visually natural side of the tree, not just any legal point

### Next Step

Reload the local HTML and verify that:
- routes start choosing meaningfully different corridor regions instead of only different exact lines
- branch entries become more local and less backtracking

## 2026-03-26 20:58

### Context

The latest review still showed different signals choosing almost the same overall route shape even after exact-track and corridor-region separation. The remaining issue was higher-level route-family overlap.

### What Changed

- added `routeEnvelope(...)` and `routeFamilySeparationPenalty(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
- updated `reservePathTracks(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  to reserve a route-family envelope for each committed signal path
- updated `buildSignalRouteSegments(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so primary trunk selection now penalizes candidates that choose almost the same broad global shape as already-routed signals
- bumped asset versions in [index.html](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/index.html)

### Why It Matters

This is a stronger interpretation of the review requirement:
- different signals should not merely avoid the same exact line
- they should also avoid collapsing into the same broad route family when a distinct topology is available

### Next Step

Reload the local HTML and verify that:
- different signals stop choosing nearly identical global envelopes
- remaining issues are truly due to unavoidable layout geometry, not missing route-family separation

## 2026-03-26 21:06

### Context

The previous route-family separation work was wired too late in the pipeline. For single-target signals, the path had already been chosen inside `shortestCorridorPathForSignal(...)`, so adding the penalty only in tree assembly barely changed the visible route.

### What Changed

- updated `shortestCorridorPathForSignal(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  so candidate path comparison now directly includes:
  - `routeFamilySeparationPenalty(...)`
  - outer exposure
  - bend count
  - a small local-route preference
  - fallback penalty
- the chosen route is now selected from scored local/full/fallback candidates, not just from a local-vs-global exposure check
- bumped asset versions in [index.html](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/index.html)

### Why It Matters

This moves route-family separation to the place where route shape is actually chosen:
- especially for single-target signals, the solver can now genuinely prefer a different global path family instead of keeping the same shape and only paying a penalty later

### Next Step

Reload the local HTML and verify that:
- different signals begin selecting different overall path families when equivalent options exist
- remaining overlap is due to genuine lack of layout alternatives, not late-stage scoring

## 2026-03-26 21:18

### Context

The review kept pointing to the same structural issue: even after narrowing the graph, routing quality was still dominated by the old lattice-based shortest-path solver. That meant the core path shape was still being found by the wrong model.

### What Changed

- added `pathAllowedByChannelScopes(...)`, `pathBlockedByTrackRules(...)`, `pathTrackPenalty(...)`, and `solveDirectOrthogonalPath(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
- updated `shortestCorridorPathForSignal(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  to use the new direct orthogonal candidate solver instead of the old lattice shortest-path core
- updated `shortestCorridorPathToAny(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  to evaluate direct candidate routes to each attach point rather than searching the old graph
- the router now chooses among explicit orthogonal candidates:
  - local-first
  - full corridor set
  - fallback only as a last resort
- bumped asset versions in [index.html](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/index.html)

### Why It Matters

This is the biggest architectural shift in the router so far:
- the route shape is no longer primarily determined by a generalized lattice graph
- it is now determined by direct orthogonal corridor candidates that can be scored for readability, spacing, and route-family separation

### Next Step

Reload the local HTML and verify that:
- single-target routes stop inheriting the old graph solver's scenic path shapes
- branch attachment now reflects the new direct candidate model rather than the old lattice search

## 2026-03-26 21:32

### Context

Even after improving the local solver, the rendered map could still look wrong because the board was routing signals greedily in array order. Earlier signals claimed the best corridors and later signals only adapted around them.

### What Changed

- updated `buildRoutingBoard(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  to use `routeSignalsForScene(...)` for both:
  - content-bounds estimation
  - final rendered route generation
- the routing board now benefits from the batch-routing + reroute pass instead of still using a greedy one-by-one signal iteration
- bumped asset versions in [index.html](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/index.html)

### Why It Matters

This fixes a hidden top-level issue:
- better routing logic in the solver cannot visibly help if the board still renders signals with an old greedy ordering pass

### Next Step

Reload the local HTML and verify that:
- the board reflects the batch-routed result instead of greedy array-order routing
- remaining issues are due to solver choices, not the rendering pipeline bypassing the newer router

## 2026-03-26 23:05

### Context

The accumulated router patches in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
had become harder to reason about than the cleaner `routing_rewrite` baseline. The rewrite already proved more stable and readable in live screenshots, so this was the right point to stop layering fixes on the old core.

### What Changed

- replaced [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  with the validated router core from
  `c:\Users\Administrator\Downloads\routing_rewrite\routing_rewrite\app.js`
- kept the existing workspace shell and identical [app.css](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.css)
- saved the previous router as
  [app.pre_migration_backup_20260326.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.pre_migration_backup_20260326.js)
- bumped asset versions in [index.html](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/index.html)

### Why It Matters

This changes the migration strategy from:
- keep patching a layered, conflicting router

to:
- continue from a simpler obstacle-aware orthogonal router that already has:
  - stable signal order
  - explicit port endpoints
  - a single lane graph
  - tree-based multi-target routing
  - safer glossing

### Next Step

Reload the local HTML and verify that:
- routing behavior now matches the cleaner `routing_rewrite` baseline
- remaining issues are genuine gaps in the new core, not regressions from the old accumulated patch stack

## 2026-03-26 23:48

### Context

Before pushing deeper into router logic again, the routing map needed a few basic readability and control fixes:
- different signals should not look identical
- routes need a visible outline against cards and grid
- short port tails are easier to scan
- deleting signals should be explicit

### What Changed

- added per-signal route colors in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
  using evenly distributed hues across the current signal set
- added underlay outlines for route wires in [app.css](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.css)
  so the colored stroke remains readable against cards and background
- shortened routing tails by reducing:
  - `exitGap` from `18` to `10`
  - preview `stub` from `28` to `14`
- added explicit signal deletion from:
  - the right inspector for a selected signal
  - `Signal Monitor` rows
- added signal color accents to `Signal Monitor`
- bumped asset versions in [index.html](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/index.html)

### Why It Matters

These changes make the routing map easier to read before the next router pass:
- color now helps distinguish signal families immediately
- outlines prevent the wire color from disappearing against card surfaces
- shorter tails reduce visual noise around ports
- deleting unused signals no longer requires guessing where that action lives

### Next Step

Reload the local HTML and verify that:
- each signal now keeps a distinct color
- wire outlines remain readable over cards
- the shortened tails still feel natural
- signal deletion works from both inspector and monitor

## 2026-03-26 23:57

### Context

Even with better routing colors and outlines, different signals could still visually collapse onto the same vertical or horizontal run. The next practical fix was to add a visible spacing pass for coincident tracks.

### What Changed

- added `detangleRenderedRoutePaths(...)` in [app.js](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/app.js)
- overlapping long vertical and horizontal segments from different rendered routes now receive small orthogonal offsets
- the detangle step runs after route generation and glossing, right before SVG drawing in the routing board
- bumped asset versions in [index.html](c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/data/index.html)

### Why It Matters

This does not replace the solver, but it immediately improves readability:
- different signals no longer sit on exactly the same centerline
- competing routes get a visible gap
- the map reads more like separate signal families and less like one merged trace

### Next Step

Reload the local HTML and verify that:
- coincident routes now separate visually
- the offset remains readable near ports and branch points

- 2026-03-26 19:27 routing render polish: preserved endpoint segments during detangle, drew all outlines below colored wires, and reduced outline weight to avoid corner break artifacts.

- 2026-03-26 19:45 documentation: added project review against roadmap/workflow and added a practical autorouting implementation guide to preserve the routing rewrite decisions and next-step rules.

## 2026-03-26 - Definition Studio vNext Freeze

### Scope

Freeze the accepted editor/model architecture for `ObjectType + ObjectInstance + Definition Studio + Composition v1`.

### Done

- updated ADR 0007 into the accepted detailed baseline for:
  - `ObjectType`
  - `ObjectInstance`
  - `Definition Scope`
  - `Composition v1`
  - `semantic build / elaboration`
- added the companion implementation document:
  - `docs/specs/definition-studio-composition-v1-breakdown.md`
- aligned the roadmap with the new editor/model vNext
- fixed the project direction around:
  - `Definitions`
  - `System / Instances`
  - `Instance Overview`
  - `Definition Studio`
  - `Composition` as the first internal authoring surface

### Why It Matters

This closes the architecture debate around internal authoring and gives the repo a canonical source of truth for the next milestone. From this point, implementation can move in slices without reopening the model boundary on every UI decision.

### Next Step

Start `Definition Shell + Composition v1` in this order:

- model foundation: `ObjectType`, `ObjectInstance`, `type_ref`, compatibility adapter
- `Definitions` section and `Definition Studio` shell
- `Instance Overview`
- `AssemblySurface` extraction and `Composition` adapter
- diagnostics and semantic build `v1`

- 2026-03-26 21:10 implementation: started `Definition Shell + Composition v1` with Slice 1 model foundation in `data/app.js`; introduced vNext root schema `0.4.0`, canonical `ObjectType/ObjectInstance`-oriented project model, legacy-to-vNext compatibility coercion, working compatibility projection for the current editor, and canonical save/export through the new root model while keeping the existing system canvas alive.
- 2026-03-26 21:40 implementation: completed the direct-model migration for Slice 1 foundation by removing the duplicated `working project` mirror from `data/app.js`; the editor now keeps canonical `0.4.0` project data in `state.model` and uses only a narrow transient editor VM for system objects/signals/links rendering, with `system.signals` kept as the top-level authoring source of truth and `system.routes` regenerated as a derived layer.
- 2026-03-26 22:05 implementation: delivered Slice 2 of `Definition Shell + Composition v1` in `data/app.js`; added `Definitions` as a first-class top-level section, introduced `Definition Studio` shell, grouped `ObjectType`s by origin (`project/generated/imported`), implemented working `Interface` authoring for ports and params, and exposed `Composition/State/Flow/Diagnostics` as explicit studio surfaces with shell guidance.
- 2026-03-26 22:35 implementation: completed Slice 3 `Instance Overview`; double click on a system instance now opens an overview overlay with effective interface, parameter override summary, signal participation, hardware/views placeholders, and actions for `Open Type`, `Locate on System Canvas`, and `Reveal Routes`, plus dedicated overlay styling and asset version bump to `20260327-0019`.
- 2026-03-27 00:10 implementation: delivered the first working pass of Slice 4 `Composition v1`; `Definition Studio / Composition` now supports adding child instances, storing child layout separately under `layouts.definitions`, authoring local parent↔child and child↔child routes, editing child param bindings (`literal` / `parent_param`), selecting parent boundary ports and routes, and showing live composition diagnostics in the dedicated `Diagnostics` surface. Asset version bumped to `20260327-0020`.
- 2026-03-27 00:40 implementation: improved `Composition v1` interaction ergonomics; child nodes can now be repositioned directly on the composition canvas, parent boundary and child inspector actions can seed the route draft, the route draft is shown explicitly before commit, and composition layout editing is no longer limited to numeric `X/Y` fields. Asset version bumped to `20260327-0021`.
- 2026-03-27 01:00 implementation: added `click-to-connect` primitives for `Composition v1`; parent boundary ports and child canvas ports now expose explicit source/target handles, clicking compatible endpoints seeds or completes the route draft automatically, and child cards on the canvas now show real local port handles instead of only summary counts. Asset version bumped to `20260327-0022`.
- 2026-03-27 01:20 implementation: introduced `semantic build / elaboration v1` as a first resolved snapshot layer in `data/app.js`; the editor now computes normalized definition/system reports after `normalize()`, `Diagnostics` consumes the semantic build report instead of ad-hoc raw checks, and `Instance Overview` now reflects resolved interface status from the build layer. Asset version bumped to `20260327-0023`.

