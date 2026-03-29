import { strict as assert } from "node:assert";
import test from "node:test";

import minimalProject from "./fixtures/minimal-project.json" with { type: "json" };
import invalidProject from "./fixtures/system-routes-invalid.json" with { type: "json" };
import { PROJECT_SCHEMA_VERSION, validateProjectModel } from "../src/index.js";

test("validateProjectModel accepts canonical minimal project", () => {
  const result = validateProjectModel(minimalProject);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("validateProjectModel rejects system.routes in canonical schema", () => {
  const result = validateProjectModel(invalidProject);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "system.routes.forbidden"));
});

test("validateProjectModel enforces canonical schema version", () => {
  const mutated = {
    ...minimalProject,
    schema_version: "0.3.0"
  };
  const result = validateProjectModel(mutated);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.path === "$.schema_version"));
  assert.equal(PROJECT_SCHEMA_VERSION, "0.4.0");
});

test("validateProjectModel accepts canonical native implementation seam", () => {
  const mutated = structuredClone(minimalProject) as any;
  mutated.definitions.object_types.relay_controller.implementation.native = {
    native_kind: "std.timed_relay.v1",
    target_kinds: ["esp32.shipcontroller.v1"],
    config_template: "shipcontroller.timed_relay.v1"
  };

  const result = validateProjectModel(mutated);
  assert.equal(result.ok, true);
});

test("validateProjectModel accepts capability hardening facets and rich param metadata", () => {
  const mutated = structuredClone(minimalProject) as any;
  mutated.definitions.object_types.relay_controller.interface.params.pulse_time_ms = {
    id: "pulse_time_ms",
    title: "Pulse Time",
    value_type: "duration",
    default: 250,
    unit: "ms",
    min: 10,
    max: 5000,
    step: 10,
    group: "timing",
    ui_hint: "duration_ms",
    description: "Relay pulse duration.",
    access_role: "engineer",
    live_edit_policy: "stopped_only",
    persist_policy: "recipe",
    recipe_scope: "instance",
    danger_level: "medium"
  };
  mutated.definitions.object_types.relay_controller.facets = {
    frontends: {
      requirements: {
        source: {
          id: "source",
          kind: "pulse_input",
          mode: "hall_pulse",
          source_ports: ["trigger"],
          binding_kind: "digital_in",
          channel_kind: "signal",
          value_type: "bool",
          required: true
        }
      }
    },
    operations: {
      operations: {
        reset_totalizer: {
          id: "reset_totalizer",
          kind: "reset_totalizer",
          title: "Reset Totalizer",
          ui_hint: "danger",
          safe_when: ["stopped"],
          confirmation_policy: "required",
          progress_signals: ["state_out"],
          result_fields: ["done"]
        }
      }
    },
    monitoring: {
      monitors: {
        source_timeout: {
          id: "source_timeout",
          kind: "timeout",
          source_ports: ["trigger"],
          severity: "warning",
          status_port_id: "state_out"
        }
      }
    },
    debug: {
      trace_groups: {
        basic: {
          title: "Basic",
          signals: ["state_out"],
          sample_hint_ms: 250,
          chart_hint: "line"
        }
      }
    },
    persistence: {
      slots: {
        totalizer: {
          id: "totalizer",
          slot_kind: "counter",
          owner_param_id: "pulse_time_ms",
          nv_slot_hint: "nv.totalizer",
          flush_policy: "on_change"
        }
      }
    },
    templates: {
      presets: {
        hall_sensor: {
          id: "hall_sensor",
          title: "Hall Sensor"
        }
      }
    }
  };

  const result = validateProjectModel(mutated);
  assert.equal(result.ok, true);
});
