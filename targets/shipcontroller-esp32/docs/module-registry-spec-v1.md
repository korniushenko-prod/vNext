# Module Registry Spec v1

## Purpose

This document defines the registry model required for a module-first UI.

The goal is to prevent the future module layer from degrading into:

- scattered hardcoded `if/else`
- one-off boiler-only screens
- template logic hidden in random UI files

The registry model should make modules and templates:

- discoverable
- inspectable
- seedable
- extensible

without changing the current runtime source of truth.

This registry should now also be interpreted through:

- `docs/universal-control-pattern-library-v1.md`
- `docs/russian-pattern-template-registry-v1.md`

Meaning:

- templates should be derived from universal control patterns
- not primarily from one mechanism such as a boiler
- and they should be mapped into consistent Russian-first user-facing help text

## Scope

This registry model is for:

- UI authoring
- template seeding
- inspector behavior
- connection semantics
- future mechanism builders

It is not yet a second runtime format.

The current engine still remains:

- `resources`
- `channels`
- `signals`
- `blocks`
- `alarms`
- `sequences`

The registry must also support instantiation into those real engine objects.

## Required Registries

The module-first layer should use at least these registries.

### 1. Module Family Registry

Defines the universal family.

Examples:

- `operator_io`
- `measured_value`
- `onoff_control`
- `pid_control`
- `actuator`
- `protocol_interface`
- `sequence`
- `alarm_policy`
- `composite`

### 2. Module Template Registry

Defines reusable templates inside each family.

Examples:

- `temperature_value`
- `pressure_value`
- `level_value`
- `fuel_temp_pid`
- `feed_pump_level_control`
- `fan_contactor`
- `three_way_valve`
- `boiler_coordinator`

### 3. Module Field Registry

Defines reusable field metadata.

Examples:

- `input_signal`
- `feedback_signal`
- `command_target`
- `authority_mode`
- `backend_mode`
- `pv_signal`
- `sp_value`
- `mv_target`
- `timeout_ms`
- `threshold_low`
- `threshold_high`
- `output_profile`
- `engineering_scale`
- `pulses_per_revolution`
- `pulses_per_unit`

### 4. Module Capability Registry

Defines command/output capability types.

Examples:

- `discrete_onoff`
- `reversible_open_close`
- `analog_setpoint`
- `protocol_setpoint`
- `protocol_position`
- `stepper_position`
- `servo_position`

### 5. Authority / Backend Registry

Defines authority and backend choices.

Examples:

- `internal_primary`
- `external_primary`
- `external_follow`
- `shadow`
- `fallback_takeover`

### 6. Module Interface Registry

Defines the normalized outputs a template publishes.

Examples:

- `ready`
- `running`
- `busy`
- `done`
- `fault`
- `alarm`
- `value`
- `position`
- `in_range`
- `quality`
- `mode`
- `status_text`

## Module Family Registry Shape

Each family entry should define:

- `id`
- `label`
- `summary`
- `icon_key`
- `default_inspector_sections`
- `default_runtime_facets`
- `allowed_templates`

## Module Template Registry Shape

Each template entry should define:

- `id`
- `family`
- `label`
- `summary`
- `pilot_tags`
- `profiles`
- `default_fields`
- `visible_sections`
- `required_bindings`
- `published_outputs`
- `display_facets`
- `service_facets`
- `default_alarms`
- `default_sequences`
- `default_helpers`
- `capability_constraints`
- `backend_options`
- `advanced_paths`
- `instantiation_plan`
- `generated_object_rules`
- `autofill_rules`
- `validation_rules`
- `wizard_steps`

## Field Registry Shape

Each field entry should define:

- `id`
- `label`
- `summary`
- `value_type`
- `binding_kind`
- `unit`
- `default`
- `validation_rule`
- `ui_widget`
- `advanced_only`

Binding kinds should include:

- `signal_ref`
- `channel_ref`
- `resource_ref`
- `module_output_ref`
- `command_target_ref`
- `duration_ms`
- `threshold`
- `enum`
- `number`
- `bool`
- `text`

## Instantiation Metadata

The registry should define how a module becomes real engine objects.

At minimum a template should be able to describe:

- which `channels` may be created
- which `signals` must be created
- which `blocks` must be created
- whether it owns a `sequence`
- which outputs are published outward
- which generated outputs are exposed to:
  - `Display`
  - `Service`
- which generated objects remain internal
- which generation decision each object follows:
  - `always_create`
  - `create_if_missing`
  - `suggest_create`
  - `never_autocreate`
- which fields are:
  - auto-filled
  - required from the user
  - optional advanced overrides

The instantiation metadata should also be able to describe:

- signal seed rules:
  - create new normalized signal
  - bind to existing signal
  - suggest a default signal id/label
- block seed rules:
  - helper type
  - internal/public role
  - default mode/profile
- sequence seed rules:
  - whether an owned sequence is needed
  - which default states/transitions are created
- display/service facet rules:
  - which generated values/statuses should be easy to place on screens
- regeneration rules:
  - safe to overwrite on re-apply
  - safe to preserve as user-edited
- ownership metadata:
  - `generated_by_module`
  - `generated_role`
  - `template_origin`

The future module setup wizard should read this metadata directly.

Reference:

- `docs/module-instantiation-and-setup-wizard-v1.md`

## Capability Rules

Capability metadata should drive:

- which actuator templates are offered
- which fields appear
- which feedbacks are expected
- which service information is shown

## Module Connections

The registry should also define what kinds of links are allowed between modules.

Connection types:

- `module_output -> module_input`
- `module_output -> alarm_policy_input`
- `module_output -> sequence_condition`
- `module_output -> display_source`
- `module_output -> command_target`

The UI should prefer typed links instead of generic unlabeled wires.

## Wizard And Validation Metadata

The registry should drive the module setup wizard directly.

Each template/profile should be able to declare:

- purpose/help step text
- backend/capability step requirements
- binding step requirements
- parameter step requirements
- generated-object preview entries
- validation rules
- default labels/IDs/units
- user-facing warnings and common mistakes

Validation metadata should at minimum cover:

- missing required bindings
- invalid parameter ranges
- duplicate generated IDs
- output publish collisions
- unsupported backend/capability combinations
- impossible source-mode/profile combinations

This is required so module creation becomes:

- guided
- repeatable
- inspectable
- not a hardcoded UI branch per template

## Boiler Pilot Priority Templates

The first template set should include at minimum:

- `operator_station_basic`
- `temperature_value`
- `pressure_value`
- `level_value`
- `conductivity_value`
- `fuel_temp_pid`
- `feed_pump_level_control`
- `fan_contactor`
- `burner_enable`
- `three_way_valve_status`
- `damper_positioner`
- `boiler_alarm_policy`
- `boiler_coordinator_sequence`

## Delivery Rule

The module-first UI should not start implementation before these registries are at least defined at spec level.

Otherwise:

- module cards will become special-cased
- boiler pilot logic will become hardcoded
- visual editing will drift away from the common model
